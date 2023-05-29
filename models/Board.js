const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('board', BoardSchema);