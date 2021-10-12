const mongoose = require('mongoose');
const Claim = require('./claim')
const Schema = mongoose.Schema;

const opts = { toJSON: { virtuals: true } };

const ThreadSchema = new Schema({
    subject: String,
    answerText: String,
    answerDate: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    correctClaim: {
        type: Schema.Types.ObjectId,
        ref: 'Claim'
    },
    claims: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Claim'
        }
    ]
}, opts);

ThreadSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Claim.deleteMany({
            _id: {
                $in: doc.claims
            }
        });
    }
});

module.exports = mongoose.model('Thread', ThreadSchema);