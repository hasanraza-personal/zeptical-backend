const express = require('express');
const router = express.Router();
const userModel = require('../../models/user/User');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Authenticate = require('../../middleware/Authenticate');
const formidable = require('formidable');
const sharp = require('sharp');
const userProfileModel = require('../../models/user/UserProfile');

// Route 2: Save project photo using: POST '/api/user/extras/saveprojectphoto';
router.post('/saveprojectphoto', Authenticate, async (req, res) => {
    let success = false;
    let projectPhoto = null;
    let newProjectPhoto = null;
    let exist = false;
    let result = null;

    let form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (!files.projectPhoto) {
            return res.status(400).json({ success, msg: 'Please provide your project photo' });
        }

        let imgTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        // Return -1 of index of array in string not found in array
        if (imgTypes.indexOf(files.projectPhoto.mimetype) === -1) {
            return res.status(400).json({ success, msg: 'Only jpeg, jpg and png format are allowed' });
        }

        if (files.projectPhoto.size > 15728640) {
            return res.status(400).json({ success, msg: 'Please upload the project photo below 15MB' });
        }

        if (fields.projectId.length == 0) {
            return res.status(400).json({ success, msg: 'Photo id not found. Please refresh the page and try again.' });
        }

        // Check if user profile exist or not
        try {
            user = await userProfileModel.exists({ userId: new mongoose.Types.ObjectId(req.user) });
        } catch (error) {
            return res.status(400).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
        }
        console.log('user: ', user);

        if (!user) {
            console.log("Inside if");
            try {
                result = await userProfileModel.create({
                    userId: req.user,
                    project: [
                        {
                            projectId: fields.projectId,
                            photo: "SomeData"
                        }
                    ]
                });
                console.log('result: ', result);
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while saving the project photo. Please try again', err: error.message });
            }
        } else {
            console.log("Inside else");
            // Fetch previous project
            try {
                result = await userProfileModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('-_id project')
            } catch (error) {
                return res.status(500).json({ success, msg: 'Something went wrong while fetching project. Please try again', err: error.message });
            }

            if (result.project.length == 0) {
                try {
                    result = await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
                        $set: {
                            project: [
                                {
                                    projectId: fields.projectId,
                                    photo: "Photo"
                                }
                            ]
                        }
                    });
                } catch (error) {
                    return res.status(500).json({ success, msg: 'Something went wrong while saving the project photo. Please try again', err: error.message });
                }
            } else {
                for (let key in result.project) {
                    if (result.project[key].projectId === fields.projectId) {
                        console.log("Project already exist");

                        // Person.update({ 'items.id': 2 }, {
                        //     '$set': {
                        //         'items.$.name': 'updated item2',
                        //         'items.$.value': 'two updated'
                        //     }
                        // }, function (err) { })

                        try {
                            await userProfileModel.findOneAndUpdate({ $and: [{ userId: new mongoose.Types.ObjectId(req.user) }, { 'project.projectId': fields.projectId }] }, {
                                $set: {
                                    'project.$.photo': "Some new data"
                                }
                            });
                        } catch (error) {
                            return res.status(500).json({ success, msg: 'Something went wrong while updating the skill. Please try again', err: error.message });
                        }

                    } else {
                        try {
                            await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
                                $push: {
                                    project: [
                                        {
                                            projectId: fields.projectId,
                                            photo: "Photo"
                                        }
                                    ]
                                }
                            });
                        } catch (error) {
                            return res.status(500).json({ success, msg: 'Something went wrong while updating the skill. Please try again', err: error.message });
                        }
                    }
                }

                // console.log("Else part");
                // console.log('result.project: ', result.project);
                let Id = result.project.projectId;
                // console.log('Id: ', Id);
                // try {
                //     await userProfileModel.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(req.user) }, {
                //         $set: {
                //             skill: req.body.skill
                //         }
                //     });
                // } catch (error) {
                //     return res.status(500).json({ success, msg: 'Something went wrong while updating the skill. Please try again', err: error.message });
                // }
            }
        }

        success = true;
        res.json({ result, photo: files.projectPhoto, photoId: fields.photoId, projectPhoto });
        // res.json({ success, projectPhoto: newProjectPhoto, msg: 'Your project photo has been saved' });
    })
})

module.exports = router;