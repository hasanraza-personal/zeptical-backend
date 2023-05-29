const mongoose = require('mongoose');

const StateSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('state', StateSchema);