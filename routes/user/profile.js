const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userModel = require('../../models/user/User');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Authenticate = require('../../middleware/Authenticate');
const formidable = require('formidable');
const sharp = require('sharp');
const userProfileModel = require('../../models/user/UserProfile');
const UserProfile = require('../../models/user/UserProfile');

let APP_URL = ''
if (process.env.APP_ENV === 'production') {
    APP_URL = process.env.PRODUCTION_URL
} else {
    APP_URL = process.env.DEVELOPMENT_URL
}

const userPhotoUploadPath = path.join(__dirname, '../../public/images/profile_photo/user');
const projectPhotoUploadPath = path.join(__dirname, '../../public/images/project_photo');
const internshipCertificateUploadPath = path.join(__dirname, '../../public/images/internship_certificate');
const achievementCertificateUploadPath = path.join(__dirname, '../../public/images/achievement_certificate');

// Route 1: Get user details for redux using: POST '/api/user/profile/getuser'
router.get('/getuser', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userModel.findById(new mongoose.Types.ObjectId(req.user)).select('_id userFullname username userPhoto')

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 2: Get user details to display on profile page using: POST '/api/user/profile/getuser/:username'
router.get('/getuser/:username', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userModel.findOne({ username: req.params.username }).select('_id userFullname username userPhoto');

        if (!user) {
            return res.status(401).json({ success, msg: 'No user found' });
        }

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 3: Get user details for edit profile page using: POST '/api/user/profile/getuserdetails'
router.get('/getuserdetails', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userModel.findById(new mongoose.Types.ObjectId(req.user)).select('-_id userFullname username userEmail userPhoto userGender');

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 4: Get user profile details to display on profile page using: POST '/api/user/profile/getuserprofile/:username'
router.get('/getuserprofile/:username', Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    if (!req.params.username) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        result = await userModel.findOne({ username: req.params.username }).select('_id');

        if (!result) {
            return res.status(401).json({ success, msg: 'No user found' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(result._id) });

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 5: Update user basic details using: POST '/api/user/profile/updateprofile'
router.post('/updateprofile', Authenticate, async (req, res) => {
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

// Route 6: Update user location using: POST '/api/user/profile/updatelocation'
router.post('/updatelocation', [
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

// Route 7: Update user education using: POST '/api/user/profile/updateeducation'
router.post('/updateeducation', [
    body('sscBoard', "Please provide your SSC board name correctly").trim().escape(),
    body('sscSchoolName', 'Please provide your SSC school name correctly').trim().escape(),
    body('hscBoard', "Please provide your HSC board name correctly").trim().escape(),
    body('hscCollegeName', 'Please provide your HSC college name correctly').trim().escape(),
    body('diplomaStream', "Please provide your Diploma stream correctly").trim().escape(),
    body('diplomaCollegeName', 'Please provide your Diploma college name correctly').trim().escape(),
    body('degreeStream', "Please provide your Degree stream correctly").trim().escape(),
    body('degreeCollegeName', 'Please provide your Degree college name correctly').trim().escape(),
], Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    const {
        sscBoard,
        sscSchoolName,
        hscBoard,
        hscCollegeName,
        diplomaStream,
        diplomaCollegeName,
        degreeStream,
        degreeCollegeName
    } = req.body;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // SSC 
    if ((sscBoard.length == 0 && sscSchoolName.length != 0) || (sscBoard.length != 0 && sscSchoolName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your SSC school name and board name" });
    }

    // HSC 
    if ((hscBoard.length == 0 && hscCollegeName.length != 0) || (hscBoard.length != 0 && hscCollegeName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your HSC college name and board name" });
    }

    // Diploma 
    if ((diplomaStream.length == 0 && diplomaCollegeName.length != 0) || (diplomaStream.length != 0 && diplomaCollegeName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your Diploma college name and stream name" });
    }

    // Degree 
    if ((degreeStream.length == 0 && degreeCollegeName.length != 0) || (degreeStream.length != 0 && degreeCollegeName.length == 0)) {
        return res.status(400).json({ success, msg: "Please provide your Degree college name and stream name" });
    }

    // Update user location
    try {
        result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
            {
                $set:
                {
                    education: {
                        sscBoard,
                        sscSchoolName,
                        hscBoard,
                        hscCollegeName,
                        diplomaStream,
                        diplomaCollegeName,
                        degreeStream,
                        degreeCollegeName,
                    }
                }
            }, { new: true }).select('education');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while updating the education details. Please try again', err: error.message });
    }

    success = true
    res.json({ success, result, msg: "Your education detials has been saved" });
});

// Route 8: Update user skill using: POST '/api/user/profile/updateskill';
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

// Route 9: Update user project details using: POST '/api/user/profile/updateproject'
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
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
        }

        if (user) {
            for (let key in user.project) {
                if (user.project[key].id == fields.projectId) {
                    oldProjectPhoto = user.project[key].photo
                }
            }
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

// Route 10: Delete user project using: POST '/api/user/profile/deleteproject'
router.post('/deleteproject', Authenticate, async (req, res) => {
    let success = false;
    let oldProjectPhoto = null;

    if (req.body.projectId.length == 0) {
        return res.status(400).json({ success, msg: 'Project id is not present' });
    }

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) });

        // Fetch project photo
        for (let key in user.project) {
            if (user.project[key].id == req.body.projectId) {
                oldProjectPhoto = user.project[key].photo
            }
        }

        // Delete photo from folder
        deletePreviousPhoto(oldProjectPhoto, projectPhotoUploadPath);
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while fetching project details. Please try again', err: error.message });
    }

    try {
        let result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
            $pull: {
                project: {
                    _id: new mongoose.Types.ObjectId(req.body.projectId)
                }

            }
        }, { new: true }).select('project');

        success = true;
        res.json({ success, result, msg: 'Your project has been deleted' });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while deleting the project. Please try again', err: error.message });
    }
});

// Route 11: Update user internship details using: POST '/api/user/profile/updateinternship'
router.post('/updateinternship', Authenticate, async (req, res) => {
    let success = false;
    let newInternshipCertificate = null;
    let oldInternshipCertificate = null;
    let user = null;
    let returnVal = null;

    let form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (fields.companyName.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide the company name in which you did internship' });
        }
        if (fields.duration.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide your internship duration' });
        }

        if (fields.stipends.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Does this intenship provides stipends?' });
        }

        if (fields.description.trim().length == 0) {
            return res.status(401).json({ success, msg: 'In a few words describe about the work that you did in internship' });
        }

        if (fields.internshipId.trim().length == 0 && !files.certificate) {
            return res.status(401).json({ success, msg: 'Please provide your internship certificate' });
        }

        // Get user profile from DB
        try {
            user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
        }

        if (user) {
            for (let key in user.internship) {
                if (user.internship[key].id == fields.internshipId) {
                    oldInternshipCertificate = user.internship[key].certificate
                }
            }
        }

        // Upload certificate in folder
        if (files.certificate) {
            // Verify certificate size and type
            returnVal = verifyPhoto(files.certificate)
            if (returnVal.isError) {
                return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg });
            }

            // Uploading first certificate in folder
            if (fields.internshipId.length == 0) {
                // Upload new certificate in folder
                returnVal = uploadPhoto(files.certificate, internshipCertificateUploadPath);
                if (returnVal.isError) {
                    return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
                }
                newInternshipCertificate = `${APP_URL}/images/internship_certificate/${returnVal.newPhoto}`;
            } else {
                // User is updating certificate

                // Delete certificate from folder
                deletePreviousPhoto(oldInternshipCertificate, internshipCertificateUploadPath);

                // Upload new certificate
                returnVal = uploadPhoto(files.certificate, internshipCertificateUploadPath);
                if (returnVal.isError) {
                    return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
                }
                newInternshipCertificate = `${APP_URL}/images/internship_certificate/${returnVal.newPhoto}`;
            }
        }

        // User is uploading fist internship
        if (fields.internshipId.length == 0) {
            try {
                // Appending internship in db
                result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
                    {
                        $push: {
                            internship: [
                                {
                                    companyName: fields.companyName,
                                    duration: fields.duration,
                                    stipends: fields.stipends,
                                    description: fields.description,
                                    certificate: newInternshipCertificate
                                }
                            ]
                        }
                    }, { new: true }).select('internship');
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while updating the education details. Please try again', err: error.message });
            }
        } else {
            // User is updaing existing internship
            let internshipcertificate = null;
            if (files.certificate) {
                internshipcertificate = newInternshipCertificate;
            } else {
                internshipcertificate = oldInternshipCertificate;
            }

            result = await userProfileModel.findOneAndUpdate({ 'internship._id': new mongoose.Types.ObjectId(fields.internshipId) }, {
                $set: {
                    'internship.$.companyName': fields.companyName,
                    'internship.$.duration': fields.duration,
                    'internship.$.stipends': fields.stipends,
                    'internship.$.description': fields.description,
                    'internship.$.certificate': internshipcertificate
                }
            }, { new: true }).select('internship');
        }

        success = true;
        res.json({ success, result, msg: 'Your internship has been updated' });
    });
});

// Route 12: Delete user internship using: POST '/api/user/profile/deleteinternship'
router.post('/deleteinternship', Authenticate, async (req, res) => {
    let success = false;
    let oldInternshipCertificate = null;

    if (req.body.internshipId.length == 0) {
        return res.status(400).json({ success, msg: 'Internship id is not present' });
    }

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) });

        // Fetch project photo
        for (let key in user.internship) {
            if (user.internship[key].id == req.body.internshipId) {
                oldInternshipCertificate = user.internship[key].certificate
            }
        }

        // Delete photo from folder
        deletePreviousPhoto(oldInternshipCertificate, internshipCertificateUploadPath);
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while fetching internship details. Please try again', err: error.message });
    }

    try {
        let result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
            $pull: {
                internship: {
                    _id: new mongoose.Types.ObjectId(req.body.internshipId)
                }

            }
        }, { new: true }).select('internship');

        success = true;
        res.json({ success, result, msg: 'Your internship has been deleted' });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while deleting the internship. Please try again', err: error.message });
    }
});

// Route 13: Update user achievement details using: POST '/api/user/profile/updateachievement'
router.post('/updateachievement', Authenticate, async (req, res) => {
    let success = false;
    let newAchievementCertificate = null;
    let oldAchievementCertificate = null;
    let user = null;
    let returnVal = null;

    let form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
        if (fields.name.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide the competition name in which you have participated' });
        }
        if (fields.level.trim().length == 0) {
            return res.status(401).json({ success, msg: 'Please provide your competition level' });
        }

        if (fields.description.trim().length == 0) {
            return res.status(401).json({ success, msg: 'In a few words describe about competition' });
        }

        if (fields.achievementId.trim().length == 0 && !files.certificate) {
            return res.status(401).json({ success, msg: 'Pleasse provide your competition certificate' });
        }

        // Get user profile from DB
        try {
            user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
        }

        if (user) {
            for (let key in user.achievement) {
                if (user.achievement[key].id == fields.achievementId) {
                    oldAchievementCertificate = user.achievement[key].certificate
                }
            }
        }

        // Upload certificate in folder
        if (files.certificate) {
            // Verify certificate size and type
            returnVal = verifyPhoto(files.certificate)
            if (returnVal.isError) {
                return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg });
            }

            // Uploading first certificate in folder
            if (fields.achievementId.length == 0) {
                // Upload new certificate in folder
                returnVal = uploadPhoto(files.certificate, achievementCertificateUploadPath);
                if (returnVal.isError) {
                    return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
                }
                newAchievementCertificate = `${APP_URL}/images/achievement_certificate/${returnVal.newPhoto}`;
            } else {
                // User is updating certificate

                // Delete certificate from folder
                deletePreviousPhoto(oldAchievementCertificate, achievementCertificateUploadPath);

                // Upload new certificate
                returnVal = uploadPhoto(files.certificate, achievementCertificateUploadPath);
                if (returnVal.isError) {
                    return res.status(returnVal.statusCode).json({ success, msg: returnVal.msg, err: returnVal.err });
                }
                newAchievementCertificate = `${APP_URL}/images/achievement_certificate/${returnVal.newPhoto}`;
            }
        }

        // User is uploading fist achievement
        if (fields.achievementId.length == 0) {
            try {
                // Appending achievement in db
                result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) },
                    {
                        $push: {
                            achievement: [
                                {
                                    name: fields.name,
                                    level: fields.level,
                                    description: fields.description,
                                    certificate: newAchievementCertificate
                                }
                            ]
                        }
                    }, { new: true }).select('achievement');
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while updating the education details. Please try again', err: error.message });
            }
        } else {
            // User is updaing existing achievement
            let achievementCertificate = null;
            if (files.certificate) {
                achievementCertificate = newAchievementCertificate;
            } else {
                achievementCertificate = oldAchievementCertificate;
            }

            result = await userProfileModel.findOneAndUpdate({ 'achievement._id': new mongoose.Types.ObjectId(fields.achievementId) }, {
                $set: {
                    'achievement.$.name': fields.name,
                    'achievement.$.level': fields.level,
                    'achievement.$.description': fields.description,
                    'achievement.$.certificate': achievementCertificate
                }
            }, { new: true }).select('achievement');
        }

        success = true;
        res.json({ success, result, msg: 'Your achievement has been updated' });
    });
});

// Route 14: Delete user achievement using: POST '/api/user/profile/deleteachievement'
router.post('/deleteachievement', Authenticate, async (req, res) => {
    let success = false;
    let oldAchievementCertificate = null;

    if (req.body.achievementId.length == 0) {
        return res.status(400).json({ success, msg: 'Achievement id is not present' });
    }

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) });

        // Fetch project photo
        for (let key in user.achievement) {
            if (user.achievement[key].id == req.body.achievementId) {
                oldAchievementCertificate = user.achievement[key].certificate
            }
        }

        // Delete photo from folder
        deletePreviousPhoto(oldAchievementCertificate, achievementCertificateUploadPath);
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while fetching achievement details. Please try again', err: error.message });
    }

    try {
        let result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
            $pull: {
                achievement: {
                    _id: new mongoose.Types.ObjectId(req.body.achievementId)
                }

            }
        }, { new: true }).select('achievement');

        success = true;
        res.json({ success, result, msg: 'Your achievement has been deleted' });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong while deleting the achievement. Please try again', err: error.message });
    }
});

// Route 15: Get user location using: GET '/api/user/profile/getuserlocation'
router.get('/getuserlocation', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('location')

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 16: Get user education using: GET '/api/user/profile/getusereducation'
router.get('/getusereducation', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('education')

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 16: Get user skill using: GET '/api/user/profile/getuserskill'
router.get('/getuserskill', Authenticate, async (req, res) => {
    let success = false;

    try {
        let user = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('skill')

        success = true
        res.json({ success, user });
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 17: Get user project using: GET '/api/user/profile/:username/getproject'
router.get('/:username/getproject', async (req, res) => {
    let success = false;
    let user = null;

    if (!req.params.username) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        user = await userModel.findOne({ username: req.params.username }).select('_id');

        if (!user) {
            return res.status(401).json({ success, msg: 'No user found' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    try {
        let result = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(user._id) }).select('-_id project');

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 18: Get user project using: GET '/api/user/profile/getproject/:projectId'
router.get('/getproject/:projectId', Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    if (!req.params.projectId) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        result = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('project');

        if (!result) {
            return res.status(401).json({ success, msg: 'Something went wrong. Please logout and try again' });
        }

        result = result.project.filter(element => element.id == req.params.projectId);

        success = true
        res.json({ result, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 19: Get user achievement using: GET '/api/user/profile/:username/getachievement'
router.get('/:username/getachievement', async (req, res) => {
    let success = false;
    let user = null;

    if (!req.params.username) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        user = await userModel.findOne({ username: req.params.username }).select('_id');

        if (!user) {
            return res.status(401).json({ success, msg: 'No user found' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    try {
        let result = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(user._id) }).select('-_id achievement');

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 20: Get user achievement using: GET '/api/user/profile/getachievement/:achievementId'
router.get('/getachievement/:achievementId', Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    if (!req.params.achievementId) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        result = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('achievement');

        if (!result) {
            return res.status(401).json({ success, msg: 'Something went wrong. Please logout and try again' });
        }

        result = result.achievement.filter(element => element.id == req.params.achievementId);

        success = true
        res.json({ result, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 21: Get user internship using: GET '/api/user/profile/:username/getinternship'
router.get('/:username/getinternship', async (req, res) => {
    let success = false;
    let user = null;

    if (!req.params.username) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        user = await userModel.findOne({ username: req.params.username }).select('_id');

        if (!user) {
            return res.status(401).json({ success, msg: 'No user found' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    try {
        let result = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(user._id) }).select('-_id internship');

        success = true
        res.json({ success, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
});

// Route 22: Get user internship using: GET '/api/user/profile/getinternship/:internshipId'
router.get('/getinternship/:internshipId', Authenticate, async (req, res) => {
    let success = false;
    let result = null;

    if (!req.params.internshipId) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please logout and try again.' });
    }

    try {
        result = await UserProfile.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('internship');

        if (!result) {
            return res.status(401).json({ success, msg: 'Something went wrong. Please logout and try again' });
        }

        result = result.internship.filter(element => element.id == req.params.internshipId);

        success = true
        res.json({ result, result });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }
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
}

// Delete previous photo from folder
const deletePreviousPhoto = (photoLink, uploadPath) => {
    let oldPhoto = photoLink.split('/').pop()

    let photoPath = path.join(uploadPath, oldPhoto);

    if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath)
    }
}

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
}

module.exports = router;