const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const skillModel = require('../../models/Skill');
const boardModel = require('../../models/Board');
const schoolModel = require('../../models/School');
const collegeModel = require('../../models/College');
const streamModel = require('../../models/Stream');
const cityModel = require('../../models/City');
const stateModel = require('../../models/State');
const Authenticate = require('../../middleware/Authenticate');

// Route 1: Add skill using: POST '/api/extras/addskill';
router.post('/addskill', Authenticate, [
    body('skill', "Skill cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 20 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the skill exists
    try {
        let result = await skillModel.exists({ value: req.body.skill.trim().toLowerCase() }).select('skill');

        if (result) {
            return res.status(200).json({ success, msg: 'Skill already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save skill to database
    try {
        await skillModel.create({
            value: req.body.skill,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "Skill successfully saved" });
});

// Route 2: Get skill using: GET '/api/extras/getskill';
router.get('/getskill', Authenticate, async (req, res) => {
    let success = false

    // Check whether the skill exists
    try {
        let result = await skillModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 3: Add skill using: POST '/api/extras/addboard';
router.post('/addboard', Authenticate, [
    body('board', "Board cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 100 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the board exists
    try {
        let result = await boardModel.exists({ value: req.body.board.trim().toLowerCase() }).select('board');

        if (result) {
            return res.status(200).json({ success, msg: 'Board already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save board to database
    try {
        await boardModel.create({
            value: req.body.board,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "Board successfully saved" });
});

// Route 4: Get board using: GET '/api/extras/getboard';
router.get('/getboard', Authenticate, async (req, res) => {
    let success = false

    // Check whether the skill exists
    try {
        let result = await boardModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 5: Add school using: POST '/api/extras/addschool';
router.post('/addschool', Authenticate, [
    body('school', "School cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 100 })
], async (req, res) => {
    let success = false
    // If there are errors, return bad request and the errors
    console.log(req.body);
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the school exists
    try {
        let result = await schoolModel.exists({ value: req.body.school.trim().toLowerCase() }).select('school');

        if (result) {
            return res.status(200).json({ success, msg: 'School already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save school to database
    try {
        await schoolModel.create({
            value: req.body.school,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "School successfully saved" });
});

// Route 6: Get school using: GET '/api/extras/getschool';
router.get('/getschool', Authenticate, async (req, res) => {
    let success = false

    // Check whether the skill exists
    try {
        let result = await schoolModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 7: Add college using: POST '/api/extras/addcollege';
router.post('/addcollege', Authenticate, [
    body('college', "College cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 100 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the college exists
    try {
        let result = await collegeModel.exists({ value: req.body.college.trim().toLowerCase() }).select('college');

        if (result) {
            return res.status(200).json({ success, msg: 'College already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save college to database
    try {
        await collegeModel.create({
            value: req.body.college,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "College successfully saved" });
});

// Route 8: Get college using: GET '/api/extras/getcollege';
router.get('/getcollege', Authenticate, async (req, res) => {
    let success = false

    // Check whether the skill exists
    try {
        let result = await collegeModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 7: Add stream using: POST '/api/extras/addstream';
router.post('/addstream', Authenticate, [
    body('stream', "Stream cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 50 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the stream exists
    try {
        let result = await streamModel.exists({ value: req.body.stream.trim().toLowerCase() }).select('stream');

        if (result) {
            return res.status(200).json({ success, msg: 'Stream already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save stream to database
    try {
        await streamModel.create({
            value: req.body.stream,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "Stream successfully saved" });
});

// Route 8: Get stream using: GET '/api/extras/getstream';
router.get('/getstream', Authenticate, async (req, res) => {
    let success = false

    // Check whether the stream exists
    try {
        let result = await streamModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 9: Add city using: POST '/api/extras/addity';
router.post('/addcity', Authenticate, [
    body('city', "City cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 20 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the city exists
    try {
        let result = await cityModel.exists({ value: req.body.city.trim().toLowerCase() }).select('city');

        if (result) {
            return res.status(200).json({ success, msg: 'City already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save city to database
    try {
        await cityModel.create({
            value: req.body.city,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "City successfully saved" });
});

// Route 10: Get city using: GET '/api/extras/getcity';
router.get('/getcity', Authenticate, async (req, res) => {
    let success = false

    // Check whether the stream exists
    try {
        let result = await cityModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 11: Add state using: POST '/api/extras/addstate';
router.post('/addstate', Authenticate, [
    body('state', "State cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 20 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the state exists
    try {
        let result = await stateModel.exists({ value: req.body.state.trim().toLowerCase() }).select('state');

        if (result) {
            return res.status(200).json({ success, msg: 'State already exists' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Save state to database
    try {
        await stateModel.create({
            value: req.body.state,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, msg: "State successfully saved" });
});

// Route 12: Get state using: GET '/api/extras/getstate';
router.get('/getstate', Authenticate, async (req, res) => {
    let success = false

    // Check whether the stream exists
    try {
        let result = await stateModel.find().select('value').sort({ 'value': 1 });

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

module.exports = router;