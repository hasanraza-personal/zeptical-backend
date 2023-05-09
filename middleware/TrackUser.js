const mongoose = require('mongoose');
const trackUser = require('../models/trackUser');

const TrackUser = async (req, res, next) => {
    let current = new Date();
    let time = current.toLocaleTimeString();
    let date = current.toLocaleDateString();

    try {
        await trackUser.create({
            ipAddress: req.ip,
            currentMoment: `${date} - ${time}`,
        });
    } catch (error) {
        return res.status(500).json({ msg: 'Something went wrong. Please try again', err: error.message });
    }
    next();
}

module.exports = TrackUser;