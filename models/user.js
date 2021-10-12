const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    participatingThreads: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Thread'
        }
    ],
    timesCalledIt: Number
});
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);