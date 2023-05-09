const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String
    },
    userEmail: {
        type: String,
        required: true
    },
    userPassword: {
        type: String,
    },
    username: {
        type: String,
    },
    userFullname: {
        type: String,
        required: true
    },
    userGender: {
        type: String,
    },
    userPhoto: {
        type: String,
    },
    userType: [],
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('user', UserSchema);