const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('college', CollegeSchema);