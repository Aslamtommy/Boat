const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    startDate: Date,
    endDate: Date,
    // Add any other fields as needed
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
