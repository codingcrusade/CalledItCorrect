const Thread = require('../../models/thread');
const Claim = require('../../models/claim');
const User = require('../../models/user');
var ObjectId = require('mongoose').Types.ObjectId;
const ExpressError = require('../../utils/ExpressError');


module.exports.renderNew = (req, res) => {
    res.render('threads/new');
};

module.exports.submitNew = async (req, res, next) => {
    //create base thread
    const newThreadData = {
        subject: req.body.thread.subject,
        answerText: req.body.thread.answerText,
        answerDate: req.body.thread.answerDate,
    };
    var thread = new Thread(newThreadData);
    thread.author = req.user._id;
    await thread.save();

    //add first claim
    const newClaimData = {
        text: req.body.thread.claim
    };
    var claim = new Claim(newClaimData);
    claim.author = req.user._id;
    thread.claims.push(claim);
    await claim.save();
    await thread.save();

    //show it
    updateVote(req, res, next, thread, claim._id);
};

const showActiveThread = async (req, res, next, thread) => {
    //use this when users can still vote, and add new claims
    res.render('threads/show', { thread });
};

const showPartiallyCompletedThread = async (req, res, next, thread) => {
    //use this when normal users can no longer interact with the thread, but the thread owner can still choose a 'correct' answer
    res.render('threads/showExpiredChoice', { thread });
    //res.render('threads/show', { thread });
};

const showCompletedThread = async (req, res, next, thread) => {
    //use this when no users can interact with the thread, including the thread owner
    res.render('threads/showExpired', { thread });
};

module.exports.showClaims = async (req, res, next) => {

    try {
        var thread = await Thread.findById(req.params.id).populate({
            path: 'claims',
            populate: {
                path: 'author'
            }
        }).populate('author');
        if (!thread) {
            req.flash('error', 'Cannot find that thread!');
            return res.redirect('/users/profile');
        }
        if(thread.correctClaim) {
            thread = await Thread.findById(req.params.id).populate({
                path: 'claims',
                populate: {
                    path: 'author supporters'
                }
            }).populate({
                path: 'correctClaim',
                populate: {
                    path: 'author supporters'
                }
            });
        }

        //check if this thread has expired
        const currentDate = new Date();
        const threadExpirationDate = new Date(thread.answerDate);
        if (currentDate < threadExpirationDate) {
            //not expired
            showActiveThread(req, res, next, thread);
        }
        else {
            //expired

            //check if this thread is owned by the current user, and if so, check if the owner has already chosen a 'correct' answer
            if(thread.author.equals(req.user._id) && !thread.correctClaim){
                //thread owner
                showPartiallyCompletedThread(req, res, next, thread);
            }
            else{
                //not thread owner
                showCompletedThread(req, res, next, thread);
            }
        }
    }catch{
        req.flash('error', 'Cannot find that thread!');
        next(new ExpressError('Page Not Found', 404));
    }
};

const updateVote = async (req, res, next, thread, voteClaimID) => {
    //1. find all the claims in the current thread
    var allClaims = thread.claims;

    //2. of those claims, find all those that have the current user as a supporter
    for(var i = 0; i < allClaims.length; i++) {
        for(var j = 0; j < allClaims[i].supporters.length; j++) {
            if(allClaims[i].supporters[j]._id.equals(req.user._id)) {

    //3. for those, remove the current user as a supporter
                var claimToUpdate = await Claim.findById(allClaims[i]._id).populate({
                    path: 'supporters'
                });
                claimToUpdate.supporters.splice(j, 1);
                await claimToUpdate.save();
                thread = await Thread.findById(req.params.id).populate({
                    path: 'claims',
                    populate: {
                        path: 'supporters'
                    }
                });
                allClaims = thread.claims;
                j--;
            }
        }
    }

    //add the current user's vote to the claim they just voted on
    var addVote = await Claim.findById(voteClaimID);
    addVote.supporters.push(req.user._id);
    await addVote.save();

    //addd this thread to the current user's list of threads they are participating in
    const thisUser = await User.find(ObjectId(`${req.user._id}`));
    var shouldAdd = true;
    for(var i = 0; i < thisUser[0].participatingThreads.length; i++) {
        if(thisUser[0].participatingThreads[i].equals(ObjectId(thread._id))){
            shouldAdd = false;
        }
    }
    if(shouldAdd){
        thisUser[0].participatingThreads.push(thread);
        thisUser[0].save();
    }

    //reload show page with updated information
    res.redirect(`/threads/${thread._id}`);
};

module.exports.addNewClaim = async (req, res, next) => {
    const thread = await Thread.findById(req.params.id).populate({
        path: 'claims',
        populate: {
            path: 'supporters'
        }
    });
    if (!thread) {
        req.flash('error', 'Cannot find that thread!');
        return res.redirect('/users/profile');
    }
    const newClaimData = {
        text: req.body.newClaim
    };
    var claim = new Claim(newClaimData);
    claim.author = req.user._id;
    thread.claims.push(claim);
    await claim.save();
    await thread.save();
    updateVote(req, res, next, thread, claim._id);
};

module.exports.updateVoteCountsOnClaim = async (req, res, next) => {
    var thread = await Thread.findById(req.params.id).populate({
        path: 'claims',
        populate: {
            path: 'supporters'
        }
    });
    updateVote(req, res, next, thread, req.params.voteClaimID);
};

module.exports.markCorrectGuess = async (req, res, next) => {
    try {
        var thread = await Thread.findById(req.params.id).populate({
            path: 'claims',
            populate: {
                path: 'supporters'
            }
        });
        if (!thread) {
            req.flash('error', 'Cannot find that thread!');
            return res.redirect('/users/profile');
        }
        
        if(req.body.options === "allWrong") {
            //all the claims were wrong!
            const newClaimData = {
                text: "All of these are wrong!"
            };
            thread.correctClaim = new Claim(newClaimData);
            thread.correctClaim.author = ObjectId(thread.author._id);
            await thread.save();
        }
        else {
            //one of the claims was chosen to be correct!
            var claim = await Claim.findById(req.body.options).populate({
                path: 'supporters'
            });
            

            //give all supporters of the 'correct claim' a point
            for(var i = 0; i < claim.supporters.length; i++) {
                if(claim.supporters[i].timesCalledIt) {
                    claim.supporters[i].timesCalledIt++;
                } else {
                    claim.supporters[i].timesCalledIt = 1;
                }
                await claim.supporters[i].save();
            }
            thread.correctClaim = ObjectId(claim._id);

            //remove the 'correct claim' from the thread's list of claims (since we're moving it to it's own list)
            for(var i = 0; i < thread.claims.length; i++) {
                if(thread.claims[i].equals(ObjectId(claim._id))) {
                    thread.claims.splice(i, 1);
                    await thread.save();
                    break;
                }
            }
            

        }

        thread = await Thread.findById(req.params.id).populate({
            path: 'claims',
            populate: {
                path: 'supporters'
            }
        });

        res.redirect(`/threads/${thread._id}`);

    } catch{
        req.flash('error', 'Cannot find that thread!');
        next(new ExpressError('Page Not Found', 404));
    }
};