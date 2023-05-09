const mongoose = require('mongoose');

const userOTPVerification = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    otp: {
        type: String,
        required: true
    }
},{
    timestamps: true
});

module.exports = mongoose.model('userotpverification', userOTPVerification);