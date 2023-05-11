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

const userPhotoUploadPath = path.join(__dirname, '../../public/images/profile_photo/user');
const projectPhotoUploadPath = path.join(__dirname, '../../public/images/project_photo');

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

// Route 2: Update user basic details using: POST '/api/user/profile/updatebasicdetails'
router.post('/updatebasicdetails', Authenticate, async (req, res) => {
    let success = false;
    let user = null;
    let returnVal = null;

    let form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (fields.userFullname.trim().length < 4) {
            return res.status(401).json({ success, msg: 'Name should be atleast 3 characters long' });
        }

        if (fields.username.trim().length < 4) {
            return res.status(401).json({ success, msg: 'Username should be atleast 3 characters long' });
        }

        if (fields.userGender.trim().length === 0) {
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
            // Verify photo szie and type
            returnVal = verifyPhoto(files.userPhoto);
            if (returnVal.isError) {
                return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg });
            }

            // Fetch previous profile photo and delete it from folder
            try {
                let user = await userModel.findById(new mongoose.Types.ObjectId(req.user)).select('-_id userPhoto');

                // Delete photo from folder
                deletePreviousPhoto(user.userPhoto, userPhotoUploadPath);
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while deleting the previous photo. Please try again', err: error.message });
            }

            // Upload new profile photo in folder
            returnVal = uploadPhoto(files.userPhoto, userPhotoUploadPath);
            if (returnVal.isError) {
                return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
            }
            newProfilePhoto = `${APP_URL}/images/profile_photo/user/${returnVal.newPhoto}`;

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
    let success = false;
    let result = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

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
    let result = null;

    const { ssc, hsc, diploma, degree } = req.body;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
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

    success = true
    res.json({ success, data: req.body, msg: 'Your skills has been saved' });
})

// Route 6: Update user details using: POST '/api/user/profile/updateproject'
router.post('/updateproject', Authenticate, async (req, res) => {
    let success = false;
    let newProjectPhoto = null;
    let oldProjectPhoto = null;
    let user = null;
    let returnVal = null;

    let form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (fields.name.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide your project name' });
        }
        if (fields.description.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide your project description' });
        }

        if (fields.projectLink.trim().length == 0 && fields.githubLink.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide your project link or github link' });
        }

        if (fields.projectId.trim().length == 0 && !files.photo) {
            return res.status(401).json({ success, msg: 'Please provide your project photo' });
        }

        // Check if user profile exist or not
        try {
            user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) });
        } catch (error) {
            return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
        }

        // Upload project photo and save
        if (files.photo) {
            // Verify photo size and type
            returnVal = verifyPhoto(files.photo)
            if (returnVal.isError) {
                return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg });
            }

            // Uploading first project
            if (fields.projectId.length == 0) {
                // Upload new project photo in folder
                returnVal = uploadPhoto(files.photo, projectPhotoUploadPath);
                if (returnVal.isError) {
                    return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
                }
                newProjectPhoto = `${APP_URL}/images/project_photo/${returnVal.newPhoto}`;
            } else {
                // User is updating project photo
                for (let key in user.project) {
                    if (user.project[key].id == fields.projectId) {
                        oldProjectPhoto = user.project[key].photo
                    }
                }

                // Delete photo from folder
                deletePreviousPhoto(oldProjectPhoto, projectPhotoUploadPath);

                // Upload new project photo
                returnVal = uploadPhoto(files.photo, projectPhotoUploadPath);
                if (returnVal.isError) {
                    return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
                }
                newProjectPhoto = `${APP_URL}/images/project_photo/${returnVal.newPhoto}`;
            }
        }

        // User is uploading fist project
        if (fields.projectId.length == 0) {
            try {
                // Saving first project in db
                if (user.project.length == 0) {
                    result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
                        {
                            $set: {
                                project: [
                                    {
                                        name: fields.name,
                                        description: fields.description,
                                        projectLink: fields.projectLink,
                                        githubLink: fields.githubLink,
                                        photo: newProjectPhoto
                                    }
                                ]
                            }
                        }, { new: true }).select('project');
                } else {
                    // Appending project in db
                    result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
                        {
                            $push: {
                                project: [
                                    {
                                        name: fields.name,
                                        description: fields.description,
                                        projectLink: fields.projectLink,
                                        githubLink: fields.githubLink,
                                        photo: newProjectPhoto
                                    }
                                ]
                            }
                        }, { new: true }).select('project');
                }
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while updating the education details. Please try again', err: error.message });
            }
            result = result.project;
        } else {
            // User is updaing existing project
            let projectPhoto = null;
            if (files.photo) {
                projectPhoto = newProjectPhoto;
            } else {
                projectPhoto = oldProjectPhoto;
            }

            result = await userProfileModel.findOneAndUpdate({ 'project._id': new mongoose.Types.ObjectId(fields.projectId) }, {
                $set: {
                    'project.$.name': fields.name,
                    'project.$.description': fields.description,
                    'project.$.projectLink': fields.projectLink,
                    'project.$.githubLink': fields.githubLink,
                    'project.$.photo': projectPhoto
                }
            }, { new: true }).select('project');
        }

        success = true;
        res.json({ success, result, msg: 'Your project has been updated' });
    });
});


// Verify photo size and type
const verifyPhoto = (photo) => {
    let isError = false;
    let imgTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (imgTypes.indexOf(photo.mimetype) === -1) {
        isError = true;
        return { isError, statusCode: 500, msg: "Only jpeg, jpg and png format are allowed" }
    }

    if (photo.size > 15728640) {
        isError = true;
        return { isError, statusCode: 500, msg: "Please upload the photo below 15MB" }
    }
    return { isError }
};

// Delete previous photo from folder
const deletePreviousPhoto = (photo, uploadPath) => {
    let oldPhoto = photo.split('/').pop()

    let photoPath = path.join(uploadPath, oldPhoto);

    if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath)
    }
};

// Upload new photo in folder
const uploadPhoto = (photo, uploadPath) => {
    let isError = false;

    try {
        let newPhoto = photo.newFilename + '.jpeg';

        sharp(photo.filepath).jpeg({
            quality: 70
        }).withMetadata().toFile(path.join(uploadPath, newPhoto), (error, info) => {
            if (error) {
                isError = true;
                return { isError, statusCode: 500, msg: "Something went wrong during compression. Please try again", err: error.message }
            }
        });
        return { isError, newPhoto };
    } catch (error) {
        isError = true;
        return { isError, statusCode: 500, msg: "Something went wrong while uploading the photo in folder. Please try again", err: error.message }
    }
};

module.exports = router;