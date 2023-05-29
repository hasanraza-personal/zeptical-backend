const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('school', SchoolSchema);