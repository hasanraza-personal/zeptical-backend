const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const skillModel = require('../../models/Skill');
const schoolModel = require('../../models/School');
const collegeModel = require('../../models/College');
const streamModel = require('../../models/Stream');
const cityModel = require('../../models/City');
const stateModel = require('../../models/State');
const topicInformationModel = require('../../models/topicInformation');
const Authenticate = require('../../middleware/Authenticate');
const { Configuration, OpenAIApi } = require("openai");

const openAI = new OpenAIApi(new Configuration({
    apiKey: process.env.OpenAPI_Key
}));

// Route 1: Add skill using: POST '/api/extras/addskill';
router.post('/addskill', Authenticate, [
    body('skill', "Skill cannot be blank").trim().not().isEmpty().isLength({ min: 1 }).isLength({ max: 20 })
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the skill exists
    try {
        const hasSpecialCharacters = /[^\w\s]/.test(req.body.skill);
        let skillName = "";
        if (!hasSpecialCharacters) {
            skillName = new RegExp(req.body.skill.trim().toLowerCase(), 'i');
        } else {
            skillName = req.body.skill.trim();
        }

        let result = await skillModel.exists({ value: skillName }).select('skill');

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

// Route 5: Add school using: POST '/api/extras/addschool';
router.post('/addschool', Authenticate, [
    body('school', "School cannot be blank").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 100 })
], async (req, res) => {
    let success = false
    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the school exists
    try {
        let schoolName = new RegExp(req.body.school.trim().toLowerCase(), 'i');
        let result = await schoolModel.exists({ value: schoolName });

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
        let collegeName = new RegExp(req.body.college.trim().toLowerCase(), 'i');
        let result = await collegeModel.exists({ value: collegeName });

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
        let streamName = new RegExp(req.body.stream.trim().toLowerCase(), 'i');
        let result = await streamModel.exists({ value: streamName });

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
        let cityName = new RegExp(req.body.city.trim().toLowerCase(), 'i');
        let result = await cityModel.exists({ value: cityName });

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
        let stateName = new RegExp(req.body.state.trim().toLowerCase(), 'i');
        let result = await stateModel.exists({ value: stateName });

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

// Route 13: Get information about the particular topic using: POST '/api/extras/getinformation';
router.post('/getinformation', Authenticate, [
    body('topicName', "Please provide the topic name").trim().not().isEmpty().escape().isLength({ min: 1 }).isLength({ max: 50 })
], async (req, res) => {
    let success = false;
    let completion = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    let topicName = req.body.topicName;
    topicName = topicName.toLowerCase().trim();

    // Check whether the topin name exists
    try {
        let result = await topicInformationModel.findOne({ topicName }).select('-_id topicName topicDesc');

        if (result) {
            success = true;
            return res.status(200).json({ success, source: "internal", result, msg: 'Information is available' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }


    try {
        completion = await openAI.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `What is ${req.body.topicName}` }]
        });
        success = true;
    } catch (error) {
        if (error.response) {
            // console.log("status error", error.response.status);
            // console.log("data error", error.response.data);
            success = false;
            return res.status(500).json({ success, msg: 'Some error has been occured, while getting information. Please try another topic' });
        } else {
            // console.log("message error", error.message);
            return res.status(500).json({ success, msg: 'Some error has been occured, while getting information. Please refresh the page and try again' });
        }
    }

    // Save topic information to database
    try {
        await topicInformationModel.create({
            topicName,
            topicDesc: completion.data.choices[0].message.content,
        });

        let result = {
            topicName: req.body.topicName,
            topicDesc: completion.data.choices[0].message.content
        }

        success = true
        return res.status(200).json({ success, source: "external", result, msg: 'Information fetched' });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }
});

// Route 13: Rephrase sentence using: POST '/api/extras/rephrasesentence';
router.post('/rephrasesentence', Authenticate, [
    body('sentence', "Please provide your sentence between 200 and 1000 characters").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 1000 })
], async (req, res) => {
    let success = false;
    let completion = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    try {
        completion = await openAI.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: `${req.body.sentence}. Rephrase this sentence!` }]
        });
        success = true;
    } catch (error) {
        if (error.response) {
            // console.log("status error", error.response.status);
            // console.log("data error", error.response.data);
            success = false;
            return res.status(500).json({ success, msg: 'Some error has been occured, while getting information. Please try another topic' });
        } else {
            // console.log("message error", error.message);
            return res.status(500).json({ success, msg: 'Some error has been occured, while getting information. Please refresh the page and try again' });
        }
    }

    success = true
    return res.status(200).json({ success, result: completion.data.choices[0].message.content, msg: 'Information fetched' });
});

module.exports = router;