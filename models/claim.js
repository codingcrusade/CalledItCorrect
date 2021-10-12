const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const claimSchema = new Schema({
    text: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    supporters: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ]
});

module.exports = mongoose.model('Claim', claimSchema);