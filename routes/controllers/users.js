const User = require('../../models/user');
const Thread = require('../../models/thread');
var ObjectId = require('mongoose').Types.ObjectId; 

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
};

module.exports.register = async (req, res, next) => {
    try {
        const { username, password } = req.body;  //add {email} if desired
        const user = new User({ username });//add {email} if desired
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to CalledIt!');
            const redirectUrl = req.session.returnTo || 'profile';
            delete req.session.returnTo;
            res.redirect(redirectUrl);
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
};

module.exports.renderLogin = (req, res) => {
    res.render('users/login');
};

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || 'profile';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res) => {
    req.logout();
    req.flash('success', "Logged out!");
    res.redirect('/');
};

module.exports.renderProfile = async (req, res, next) => {
    const thisUser = await User.find(ObjectId(`${req.user._id}`)).populate({
        path: 'participatingThreads'
    });
    const participatingThreads = thisUser[0].participatingThreads;
    res.render('users/profile', {participatingThreads});
};