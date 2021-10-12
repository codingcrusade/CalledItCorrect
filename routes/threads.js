const express = require('express');
const router = express.Router();
const threads = require('./controllers/threads');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isLoggedInModified, isAuthor } = require('../middleware');

router.route('/new')
    .get(isLoggedIn, threads.renderNew)
    .post(isLoggedIn, catchAsync(threads.submitNew));

router.route('/:id')
    .get(catchAsync(threads.showClaims))
    .post(isLoggedInModified, catchAsync(threads.addNewClaim));

router.route('/:id/votes/:voteClaimID')
    .post(isLoggedInModified, catchAsync(threads.updateVoteCountsOnClaim));

    router.route('/:id/correctGuess/')
    .post(isLoggedInModified, isAuthor, catchAsync(threads.markCorrectGuess));

module.exports = router;