const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userModel = require('../../models/user/User');
const path = require('path');
const userMaleAvatars = require('../../avatar/user/maleAvatar');
const userFemaleAvatars = require('../../avatar/user/femaleAvatar');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Authenticate = require('../../middleware/Authenticate');
const formidable = require('formidable');
const sharp = require('sharp');
const userProfileModel = require('../../models/user/UserProfile');

let APP_URL = ''
if (process.env.APP_ENV === 'production') {
    APP_URL = process.env.PRODUCTION_URL
} else {
    APP_URL = process.env.DEVELOPMENT_URL
}

const uploadPath = path.join(__dirname, '../../public/images/profile_photo/user');
const projectUploadPath = path.join(__dirname, '../public/images/project-photo');

// Route 1: Get user details using: POST '/api/user/profile/getuser'
router.get('/getuser', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userModel.findById(new mongoose.Types.ObjectId(req.user)).select('-_id userFullname username userPhoto')

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 2: Update user details using: POST '/api/user/profile/updatebasicdetails'
router.post('/updatebasicdetails', Authenticate, async (req, res) => {
    let success = false;
    let newProfilePhoto = null;
    let user = null;

    let form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (fields.userFullname.length < 4) {
            return res.status(401).json({ success, msg: 'Name should be atleast 3 characters long' });
        }

        if (fields.username.length < 4) {
            return res.status(401).json({ success, msg: 'Username should be atleast 3 characters long' });
        }

        if (fields.userGender.length === 0) {
            return res.status(401).json({ success, msg: 'Please provide your gender' });
        }

        // Check availability of username
        try {
            let user = await userModel.findOne({ username: fields.username });
            if (user) {
                if (user.id !== req.user) {
                    return res.status(400).json({ success, msg: 'Sorry a user with same username already exist' });
                }
            }
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
        }


        if (files.userPhoto) {
            let imgTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            // Return -1 of index of array in string not found in array
            if (imgTypes.indexOf(files.userPhoto.mimetype) === -1) {
                return res.status(400).json({ success, msg: 'Only jpeg, jpg and png format are allowed' });
            }

            if (files.userPhoto.size > 5242880) {
                return res.status(400).json({ success, msg: 'Please upload the photo below 5MB' });
            }

            // Fetch previous founder photo and delete it from folder
            try {
                let user = await userModel.findById(new mongoose.Types.ObjectId(req.user)).select('-_id userPhoto')
                let oldUserPhoto = user.userPhoto.split('/').pop()

                let profilePhotoPath = path.join(uploadPath, oldUserPhoto);

                if (fs.existsSync(profilePhotoPath)) {
                    fs.unlinkSync(profilePhotoPath)
                }
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while deleting the previous photo. Please try again', err: error.message });
            }

            // Upload profile photo in folder
            try {
                // newProfilePhoto = new Date().getTime() + '.jpeg';
                newProfilePhoto = files.userPhoto.newFilename + '.jpeg';

                sharp(files.userPhoto.filepath).jpeg({
                    quality: 70
                }).withMetadata().toFile(path.join(uploadPath, newProfilePhoto), (error, info) => {
                    if (error) {
                        return res.status(400).json({ success, msg: 'Something went wrong during compression. Please try again', err: error.message });
                    }
                });
                newProfilePhoto = `${APP_URL}/images/profile_photo/user/${newProfilePhoto}`;
            } catch (error) {
                return res.status(400).json({ success, msg: 'Something went wrong while saving the photo in folder. Please try again', err: error.message });
            }

            // Update userphoto
            try {
                await userModel.findByIdAndUpdate(new mongoose.Types.ObjectId(req.user), { $set: { userPhoto: newProfilePhoto } });
            } catch (error) {
                return res.status(400).json({ success, msg: 'Something went wrong while upading the photo. Please try again', err: error.message });
            }
        }

        // Update user details
        try {
            user = await userModel.findByIdAndUpdate(new mongoose.Types.ObjectId(req.user),
                {
                    $set:
                        { username: fields.username, userFullname: fields.userFullname, userGender: fields.userGender }
                }, { new: true }).select('-_id userFullname username userPhoto');
        } catch (error) {
            return res.status(400).json({ success, msg: 'Something went wrong while updating the user details. Please try again', err: error.message });
        }

        success = true;
        res.json({ success, user, msg: 'Your profile has been updated' });
    });
});

// Route 3: Update user location using: POST '/api/user/profile/updatelocation'
router.post('/updateloction', [
    body('userCity', "Please provide your city name").trim().not().isEmpty().escape(),
    body('userState', 'Please provide your state name').trim().not().isEmpty().escape(),
], Authenticate, async (req, res) => {
    console.log(req.body);
    let success = false;
    let user = null;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    try {
        user = await userProfileModel.exists({ userId: new mongoose.Types.ObjectId(req.user) });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    if (!user) {
        // Save user location
        try {
            result = await userProfileModel.create({
                userId: req.user,
                location: {
                    userCity: req.body.userCity,
                    userState: req.body.userState
                }
            });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong while saving the location. Please try again', err: error.message });
        }
        result = result.location;
    } else {
        // Update user location
        try {
            result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
                {
                    $set:
                    {
                        location: {
                            userCity: req.body.userCity,
                            userState: req.body.userState
                        }
                    }
                }, { new: true }).select('location');
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong while updating the location. Please try again', err: error.message });
        }
    }

    success = true
    res.json({ success, result, msg: "Your location has been saved" });
});

// Route 4: Update user education using: POST '/api/user/profile/updateeducation'
router.post('/updateeducation', [
    body('ssc.board', "Please provide your SSC board name correctly").trim().escape(),
    body('ssc.schoolName', 'Please provide your SSC school name correctly').trim().escape(),
    body('hsc.board', "Please provide your HSC board name correctly").trim().escape(),
    body('hsc.collegeName', 'Please provide your HSC college name correctly').trim().escape(),
    body('diploma.stream', "Please provide your Diploma stream correctly").trim().escape(),
    body('diploma.collegeName', 'Please provide your Diploma college name correctly').trim().escape(),
    body('degree.stream', "Please provide your Degree stream correctly").trim().escape(),
    body('degree.collegeName', 'Please provide your Degree college name correctly').trim().escape(),
], Authenticate, async (req, res) => {
    let success = false;
    let user = null;
    let result = null;

    const { ssc, hsc, diploma, degree } = req.body;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check if user profile exist or not
    try {
        user = await userProfileModel.exists({ userId: new mongoose.Types.ObjectId(req.user) });
        console.log('user: ', user);
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // SSC 
    if ((ssc.board.length == 0 && ssc.schoolName.length != 0) || (ssc.board.length != 0 && ssc.schoolName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your SSC school name and board name" });
    }

    // HSC 
    if ((hsc.board.length == 0 && hsc.collegeName.length != 0) || (hsc.board.length != 0 && hsc.collegeName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your HSC college name and board name" });
    }

    // Diploma 
    if ((diploma.stream.length == 0 && diploma.collegeName.length != 0) || (diploma.stream.length != 0 && diploma.collegeName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your Diploma college name and stream name" });
    }

    // Degree 
    if ((degree.stream.length == 0 && degree.collegeName.length != 0) || (degree.stream.length != 0 && degree.collegeName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your Degree college name and stream name" });
    }

    if (!user) {
        // Save user location
        try {
            result = await userProfileModel.create({
                userId: req.user,
                education: {
                    ssc,
                    hsc,
                    diploma,
                    degree
                }
            });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong while saving the education details. Please try again', err: error.message });
        }
        result = result.education;
    } else {
        // Update user location
        try {
            result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
                {
                    $set:
                    {
                        education: {
                            ssc,
                            hsc,
                            diploma,
                            degree
                        }
                    }
                }, { new: true }).select('education');
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong while updating the education details. Please try again', err: error.message });
        }
    }

    success = true
    res.json({ success, result, msg: "Your education detials has been saved" });
});

// Route 5: Update user skill using: POST '/api/user/profile/updateskill';
router.post('/updateskill', [
    body('skill', 'Please provide your skill').isArray({ min: 1 }).custom((val) => {
        for (let i = 0; i < val.length; i++) {
            if (val[i].trim() === '') {
                val[i] = val[i].replace(/[&\/\\#^+()$~%.'":*?<>{}!@]/g, '');
                return Promise.reject('Please provide your skill');
            }
        }
        return true;
    }),
], Authenticate, async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(500).json({ success, msg: errors.errors[0].msg });
    }

    // Check if user profile exist or not
    try {
        user = await userProfileModel.exists({ userId: new mongoose.Types.ObjectId(req.user) });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    if (!user) {
        try {
            result = await userProfileModel.create({
                userId: req.user,
                skill: req.body.skill
            });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong while saving the skill. Please try again', err: error.message });
        }
        result = result.skill;
    } else {
        // update collaborator skill
        try {
            await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
                $set: {
                    skill: req.body.skill
                }
            });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong while updating the skill. Please try again', err: error.message });
        }
    }

    success = true
    res.json({ success, data: req.body, msg: 'Your skills has been saved' });
})

// Route 6: Update user project using: POST '/api/user/profile/updateproject';
router.post('/updateproject', [
    body('project', 'Please provide your project').isArray({ min: 1, max: 5 }).custom((val) => {
        val.forEach((project) => {
            if (project.name.trim().length === 0) {
                return Promise.reject('Please provide your project name');
            }
            if (project.description.trim().length === 0) {
                return Promise.reject('Please provide your project description');
            }
            if (project.projectLink.trim().length === 0) {
                return Promise.reject('Please provide your project link');
            }
            if (project.githubLink.trim().length === 0) {
                return Promise.reject('Please provide your project github link');
            }
            if (project.photo.trim().length === 0) {
                return Promise.reject('Please provide your project photo');
            }
        });
        return true;
    }),
], Authenticate, async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    const { project } = req.body

    if (project.photo) {
        // Delete photo from folder
        let oldProjectPhoto = photo.split('/').pop()
        let projectPhotoPath = path.join(projectPhotoUploadPath, oldProjectPhoto);

        if (fs.existsSync(projectPhotoPath)) {
            fs.unlinkSync(projectPhotoPath)
        }
    }

    // update project details
    try {
        await collaboratorModal.findOneAndUpdate({ userid: mongoose.Types.ObjectId(req.user) }, {
            $set: {
                project
            }
        });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true
    res.json({ success, data: req.body, msg: 'Your project details has been updated' });
})

module.exports = router;