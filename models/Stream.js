const mongoose = require('mongoose');

const StreamSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('stream', StreamSchema);