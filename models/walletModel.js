const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    balance: {
        type: Number,
        default: 0
    },
    userid: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transaction: [{
        amount: {
            type: Number,
            required: true
        },
        reason: {
            type: String,
        },
        transactionType: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Wallet", walletSchema);
