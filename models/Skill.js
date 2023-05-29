const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('skill', SkillSchema);