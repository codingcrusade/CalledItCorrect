
const ExpressError = require('./utils/ExpressError');
const Thread = require('./models/thread');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'you must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

module.exports.isLoggedInModified = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = "/threads/" + req.params.id;
        req.flash('error', 'you must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const thread = await Thread.findById(id);
    if (!thread.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/profile`);
    }
    next();
}