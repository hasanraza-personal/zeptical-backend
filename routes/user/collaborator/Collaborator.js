const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Authenticate = require('../../../middleware/Authenticate');
const userProfileModel = require('../../../models/user/UserProfile');

// Route 1: Register user as collaborator using: POST '/api/user/collaborator/createcollaborator'
router.post('/createcollaborator', [
    body('paymentPreference', "Please select your payment preference").trim().not().isEmpty().escape(),
], Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Update user as collaborator
    try {
        result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
            {
                $set:
                {
                    'collaborator.isApplied': true,
                    'collaborator.paymentPreference': req.body.paymentPreference
                }
            }, { new: true }).select('collaborator');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while registering you as a collaborator. Please try again', err: error.message });
    }

    success = true
    res.json({ success, result, msg: "Your profile has been successfully registered as collaborator" });
});

// Route 2: Update payment preference of collaborator using: POST '/api/user/collaborator/updatepaymentpreference'
router.post('/updatepaymentpreference', [
    body('paymentPreference', "Please select your payment preference").trim().not().isEmpty().escape(),
], Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Update payment preference of collaborator
    try {
        result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
            {
                $set:
                {
                    'collaborator.paymentPreference': req.body.paymentPreference
                }
            }, { new: true }).select('collaborator');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while registering you as a collaborator. Please try again', err: error.message });
    }

    success = true
    res.json({ success, result, msg: "Your payment preference has been updated" });
});

// Route 3: Update payment preference of collaborator using: POST '/api/user/collaborator/updatepitchstatus'
router.post('/updatepitchstatus', [
    body('pitchStatus', "Please select your payment preference").trim().not().isEmpty().escape(),
], Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Update payment preference of collaborator
    try {
        result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
            {
                $set:
                {
                    'collaborator.pitchStatus': req.body.pitchStatus,
                }
            }, { new: true }).select('collaborator');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while registering you as a collaborator. Please try again', err: error.message });
    }

    success = true
    res.json({ success, result, msg: "Your pitch status has been updated" });
});

// Route 4: Update payment preference of collaborator using: POST '/api/user/collaborator/deletecollaborator'
router.post('/deletecollaborator', Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Update payment preference of collaborator
    try {
        result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
            {
                $set:
                {
                    'collaborator.isApplied': false,
                    'collaborator.pitchStatus': true,
                    'collaborator.isBlocked': false,
                    'collaborator.paymentPreference': ""
                }
            }, { new: true }).select('collaborator');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while registering you as a collaborator. Please try again', err: error.message });
    }

    success = true
    res.json({ success, result, msg: "Your collaborator profile has been deleted" });
});

// Route 5: Get collaborator details using: POST '/api/user/collaborator/getcollaborator'
router.get('/getcollaborator', Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Get collaborator collaborator
    try {
        result = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('collaborator');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while getting the collaborator details. Please try again', err: error.message });
    }

    success = true
    res.json({ success, result });
});

module.exports = router;