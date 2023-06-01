const mongoose = require('mongoose');

const TopicInformation = new mongoose.Schema({
    topicName: {
        type: String,
        required: true,
    },
    topicDesc: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('topininformation', TopicInformation);