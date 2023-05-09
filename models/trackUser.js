const mongoose = require('mongoose');

const trackUserSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
    },
    currentMoment: {
        type: String,
    }
});

module.exports = mongoose.model('trackUser', trackUserSchema);