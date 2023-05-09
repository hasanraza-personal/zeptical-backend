const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userModel = require('../../models/user/User');
const otpModel = require('../../models/user/userOTPVerification');
const { MailtrapClient } = require("mailtrap");
const path = require('path');
const userMaleAvatars = require('../../avatar/user/maleAvatar');
const userFemaleAvatars = require('../../avatar/user/femaleAvatar');
const bcrypt = require('bcryptjs');
var CryptoJS = require("crypto-js");
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const mongoose = require('mongoose');
const Authenticate = require('../../middleware/Authenticate');

const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });

let APP_URL = ''
if (process.env.APP_ENV === 'production') {
    APP_URL = process.env.PRODUCTION_URL
} else {
    APP_URL = process.env.DEVELOPMENT_URL
}

const uploadPath = path.join(__dirname, '../../public/images/profile_photo/user');

// Route 1: Create user using: POST '/api/user/auth/createuser';
router.post('/createuser', [
    body('userFullname', "Name should be atleast 3 characters long").trim().not().isEmpty().escape().isLength({ min: 3 }).isLength({ max: 20 })
        .withMessage('Name must be less than 20 characters'),
    body('username', "Username should be atleast 5 characters long").trim().not().isEmpty().escape().toLowerCase().isLength({ min: 5 }).isLength({ max: 20 })
        .withMessage('Username must be less than 20 characters'),
    body('userEmail', "Please provide a valid email address").trim().not().isEmpty().escape().isEmail().toLowerCase(),
    body('userGender', "Please select your gender").trim().not().isEmpty().escape(),
    body('userPassword', 'Password must contain atleast 6 characters').not().isEmpty().isLength({ min: 6 }),
    body('confirmPassword', 'Confirm password cannot be blank').not().isEmpty().exists(),
], async (req, res) => {
    let success = false

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    let { userFullname, username, userEmail, userGender, userPassword, confirmPassword } = req.body;

    // Check password and confirm password
    if (userPassword !== confirmPassword) {
        return res.status(400).json({ success, msg: 'Password does not matched' });
    }

    // Check whether the user with this username exists already
    try {
        let user = await userModel.exists({ $and: [{ username }, { isVerified: true }] })

        if (user) {
            return res.status(400).json({ success, msg: 'Sorry a user with username already exist' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Check whether the user with this email exists already
    try {
        let user = await userModel.exists({ $and: [{ userEmail }, { isVerified: true }] })

        if (user) {
            return res.status(400).json({ success, msg: 'Sorry a user with this email already exist' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again.', err: error.message });
    }

    // Generate 4 digit OTP
    let OTP = Math.floor(1000 + Math.random() * 9000);

    // Send 4 digit OTP
    const sender = {
        name: 'Zeptical',
        email: 'no-reply@zeptical.com'
    }

    client.send({
        from: sender,
        to: [{ email: userEmail }],
        subject: `OTP Verification Code: ${OTP}`,
        html: `
            <!doctype html>
            <html>
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                </head>
                <body style="font-family: sans-serif;">
                    <div style="display: block; margin: auto; max-width: 600px;" class="main">
                        <img alt="Zeptical" src="https://i.postimg.cc/3Jcybtt2/logo-removebg-preview.png" style="height: 70px;">
                        <p>Here is the 4 digit OTP for your account</p>
                        <h1 style="font-size: 20px; font-weight: bold; margin-top: 20px">${OTP}</h1>
                        <p>This OTP is only valid for 10 minutes.</p>
                        <p>-by Zeptical</p>
                    </div>
                    <style>
                        .main { background-color: white; }
                    </style>
              </body>
            </html>
        `,
    }).then(console.log, console.error);

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(userPassword, salt);

    // Save user to database
    let newUser = null
    try {
        newUser = await userModel.create({
            userEmail,
            userPassword: secPass,
            username,
            userFullname,
            userGender,
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // Save OTP to database
    try {
        await otpModel.create({
            userId: newUser._id,
            otp: OTP
        });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // Save jsonwebtoken
    let data = {
        id: newUser.id
    }
    const authToken = jwt.sign(data, process.env.JWT_SECRET_KEY, { expiresIn: '600s' });

    success = true
    res.json({ success, userEmail, authToken, msg: "User successfully created" });
});

// Route 2: Verify user email using: POST "/api/user/auth/verifyemail"
router.post('/verifyemail', Authenticate, [
    body('otp', 'Please provide 4 digit OTP').trim().not().isEmpty().escape().isNumeric().isLength({ min: 4, max: 4 })
], async (req, res) => {
    let success = false;
    let user = null;
    let systemOTP = null;
    let newPhoto = new Date().getTime() + '.png';

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Verify OTP
    if (!req.user) {
        success = false;
        return res.json({ success, msg: "OTP expired" });
    }

    // Fetch OTP from database
    try {
        systemOTP = await otpModel.findOne({ userId: new mongoose.Types.ObjectId(req.user) }).select('-_id otp createdAt');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // Check system OTP is present or not
    if (!systemOTP) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again' });
    }

    // Generate date for comparison 
    let date = new Date(systemOTP.createdAt);
    date = new Date(date.getTime() + 10 * 60 * 1000)
    let currentDate = new Date();

    // Compare date
    if (date.toString() < currentDate.toString()) {
        // Delete OTP form database
        try {
            await otpModel.findOneAndDelete({ userId: new mongoose.Types.ObjectId(req.user) })
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
        }

        // Delete User from Database
        try {
            await userModel.findByIdAndDelete(new mongoose.Types.ObjectId(req.user))
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
        }
        return res.json({ success, msg: "OTP expired" });
    }

    // Compare OTP
    if (systemOTP.otp !== req.body.otp) {
        return res.status(400).json({ success, msg: 'OTP does not match' });
    }

    // Fetch user gender
    try {
        user = await userModel.findById(new mongoose.Types.ObjectId(req.user)).select('-_id userGender');
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // upload default user photo
    uploadDefaultUserPhto(user.userGender, newPhoto);

    // Update user
    try {
        user = await userModel.findByIdAndUpdate(new mongoose.Types.ObjectId(req.user),
            {
                $set:
                {
                    userPhoto: `${APP_URL}/images/profile_photo/user/${newPhoto}`,
                    isVerified: true
                }
            }, { new: true }).select('username userFullname userPhoto');
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // Delete OTP after updating user verified status
    try {
        await otpModel.findOneAndDelete({ userId: new mongoose.Types.ObjectId(req.user) })
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // Save jsonwebtoken
    let data = {
        id: req.user
    }
    const authToken = jwt.sign(data, process.env.JWT_SECRET_KEY);

    success = true
    res.json({ success, user, authToken, msg: "Account created successfully" });
});

// Route 3: Login user using: POST '/api/user/auth/login';
router.post('/login', [
    body('userEmail', "Please provide a valid email address").trim().not().isEmpty().escape().isEmail().toLowerCase(),
    body('userPassword', 'Password cannot be black').not().isEmpty().exists(),
], async (req, res) => {
    let success = false;
    let user = null;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check whether the user with this email exists or not
    try {
        user = await userModel.findOne({ $and: [{ userEmail: req.body.userEmail }, { userPassword: { $ne: null } }, { isVerified: true }] });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // If user does not exist
    if (!user) {
        return res.status(401).json({ success, msg: 'Email or password is incorrect' });
    }

    // Compare password
    let passwordCompare = await bcrypt.compare(req.body.userPassword, user.userPassword);
    if (!passwordCompare) {
        return res.status(401).json({ success, msg: 'Email or password is not correct' });
    }

    // Save jsonwebtoken
    let data = {
        id: user.id
    }
    const authToken = jwt.sign(data, process.env.JWT_SECRET_KEY);

    user = {
        userFullname: user.userFullname,
        username: user.username,
        userPhoto: user.userPhoto
    }

    success = true
    res.json({ success, user, authToken, msg: "Loggedin successfull" });
});

// Route 4: Login with Google using: POST '/api/user/auth/googlelogin';
router.post('/googlelogin', async (req, res) => {
    let success = false;
    let user = null;
    let userExist = true;

    // Check if user exists
    try {
        user = await userModel.findOne({ $and: [{ userEmail: req.body.email }, { isVerified: true }] });
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    if (!user) {
        try {
            userExist = false;
            let username = req.body.given_name.split(" ").join("").toLowerCase();
            // Generate 3 digit number
            let randomNumber = Math.floor(100 + Math.random() * 9000);

            user = await userModel.create({
                googleId: req.body.sub,
                userEmail: req.body.email,
                userFullname: req.body.name,
                username: username + randomNumber,
                userPhoto: 'https://postimg.cc/F1BGqkpJ',
                isVerified: true
            });
        } catch (error) {
            return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
        }
    }

    // Save jsonwebtoken
    let data = {
        id: user.id
    }
    const authToken = jwt.sign(data, process.env.JWT_SECRET_KEY);

    user = {
        userFullname: user.userFullname,
        username: user.username,
        userPhoto: user.userPhoto,
    }

    success = true
    res.json({ success, user, userExist, authToken, msg: "Google loggedin successfully" });
});

// Route 5: Update user gender and profile photo: POST '/api/user/auth/updateuser';
router.post('/updateuser', [
    body('username', "Please provide your username").trim().not().isEmpty().escape().toLowerCase(),
    body('userGender', "Please provide your gender").trim().not().isEmpty().escape().toLowerCase(),
], Authenticate, async (req, res) => {
    let success = false;
    let user = null;
    let newPhoto = new Date().getTime() + '.png';

    const { userGender, username } = req.body;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // upload default user photo
    uploadDefaultUserPhto(userGender, newPhoto);

    // Update user gender and photo
    try {
        user = await userModel.findByIdAndUpdate(new mongoose.Types.ObjectId(req.user),
            {
                $set:
                {
                    username,
                    userPhoto: `${APP_URL}/images/profile_photo/user/${newPhoto}`,
                    userGender
                }
            }, { new: true }).select('userPhoto userGender');
    } catch (error) {
        return res.status(400).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    user = {
        username,
        userPhoto: user.userPhoto
    }

    success = true
    res.json({ success, user, msg: "User profile has been updated successfully" });
});

// Route 6: Send recovery link using: POST "/api/user/auth/sendrecoverylink"
router.post('/sendrecoverylink', [
    body('userEmail', 'Enter a valid email').not().isEmpty().trim().escape().isEmail().toLowerCase(),
], async (req, res) => {
    let success = false;
    let { userEmail } = req.body;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    // Check if user exist or not
    try {
        let user = await userModel.findOne({ $and: [{ userEmail }, { isVerified: true }] });

        if (!user) {
            return res.status(401).json({ success, msg: 'Email does not exist' });
        }

        // If google login detected
        if (user.googleId) {
            return res.status(401).json({ success, msg: 'Social login detected' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    // Encrypting email of a user
    var cipherText = CryptoJS.AES.encrypt(userEmail, process.env.CRYPTO_JS_SECRET_KEY).toString();

    let minutesToAdd = 10;
    let currentDate = new Date();
    let futureDate = new Date(currentDate.getTime() + minutesToAdd * 60000);
    futureDate = futureDate.toString();

    // Encrypting futureDate
    var cipherTime = CryptoJS.AES.encrypt(futureDate, process.env.CRYPTO_JS_SECRET_KEY).toString();

    const sender = {
        name: 'Zeptical',
        email: 'no-reply@zeptical.com'
    }

    client.send({
        from: sender,
        to: [{ email: userEmail }],
        subject: `Reset Password`,
        html: `
            <!doctype html>
            <html>
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                </head>
                <body style="font-family: sans-serif;">
                    <div style="display: block; margin: auto; max-width: 600px;" class="main">
                        <img alt="Zeptical" src="https://i.postimg.cc/3Jcybtt2/logo-removebg-preview.png" style="height: 70px;">
                        <p>Please click the below link to reset your password</p>
                        <p>
                            <a href="http://localhost:3000/user/resetpassword/?qpvnfhdoeG3YDBybcbTljMdrshsynTWMZIRVDbs=${cipherText}&rthbsdFjkshJYFhjfsufjdcgyudsxch=${cipherTime}">Reset My Password</a>
                        </p>
                        <p>-by Zeptical</p>
                    </div>
                    <style>
                        .main { background-color: white; }
                    </style>
              </body>
            </html>
        `,
    }).then((error) => {
        // Don't know what to write
    }).catch((error) => {
        return res.status(500).json({ success, msg: 'Something went wrong while sending the email. Please try again', err: error });
    });

    success = true;
    res.json({ success, msg: 'A recovery link has been sent to your email' });
});

// Route 7: Reset password using: POST "api/user/auth/resetpassword"
router.post('/resetpassword', [
    body('userPassword', 'Password must contain 6 characters').not().isEmpty().isLength({ min: 6 }),
    body('confirmPassword', 'Confirm password cannot be blank').exists()
], async (req, res) => {
    let success = false;
    let { userPassword, confirmPassword } = req.body;

    // If there are errors, return bad request and the errors
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, msg: errors.errors[0].msg });
    }

    if (userPassword !== confirmPassword) {
        return res.status(400).json({ success, msg: 'Password and confirm password not matched' });
    }

    // Remove '+' instead of 'white space' in email url
    let email = req.body.urlEmail.split(' ').join('+');
    let time = req.body.urlTime.split(' ').join('+');

    let currentDate = new Date();
    currentDate = currentDate.toString();

    // Decrypt time from url param
    const bytes1 = CryptoJS.AES.decrypt(time, process.env.CRYPTO_JS_SECRET_KEY);
    const futureDate = bytes1.toString(CryptoJS.enc.Utf8);

    if (futureDate < currentDate) {
        return res.status(400).json({ success, msg: 'Link expired' });
    }

    // Decrypt email from url param
    const bytes = CryptoJS.AES.decrypt(email, process.env.CRYPTO_JS_SECRET_KEY);
    const userEmail = bytes.toString(CryptoJS.enc.Utf8);

    // Check whether the user with this email exists or not and fetch password
    try {
        let user = await userModel.findOne({ userEmail });
        if (!user) {
            return res.status(401).json({ success, msg: 'Sorry a user with this email does not exist' });
        }
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(userPassword, salt);

    // Update password in database
    try {
        await userModel.findOneAndUpdate({ userEmail }, { $set: { userPassword: secPass } })
    } catch (error) {
        return res.status(500).json({ success, msg: 'Something went wrong. Please try again', err: error.message });
    }

    success = true;
    res.json({ success, msg: 'Your password has been reset. Please login with your new password' });
});

// Upload user profile photo by system
const uploadDefaultUserPhto = (userGender, newPhoto) => {
    let photo = null;
    let savePath = path.join(uploadPath, newPhoto);

    // Generate random user avatar
    if (userGender === 'male') {
        photo = userMaleAvatars[Math.floor(Math.random() * userMaleAvatars.length)];
    } else {
        photo = userFemaleAvatars[Math.floor(Math.random() * userFemaleAvatars.length)];
    }
    let avatarPath = path.join(__dirname, `../../public/images/avatar/user/${userGender}/${photo}`);

    // Copy file from one folder to another
    fs.copyFile(avatarPath, savePath, (err) => {
        if (err) {
            success = false;
            return res.status(500).json({ success, msg: 'Something went wrong while copying. Please try again', err });
        }
    });
}

// Delete unverified user, OTP and photo(from folder)
const deleteUnverified = async () => {
    try {
        let users = await userModel.find({ isVerified: false }).select('userPhoto createdAt')

        for (let key in users) {
            let date = new Date(users[key].createdAt);
            date = new Date(date.getTime() + 10 * 60 * 1000)
            let currentDate = new Date();

            if (date.toString() < currentDate.toString()) {
                await otpModel.findOneAndDelete({ userId: users[key]._id })
                await userModel.findByIdAndDelete(users[key]._id)
            }
        }
    } catch (error) {
        console.log('error: ', error);
    }
}

// Run this jon in every 10 minute
cron.schedule('*/10 * * * *', () => {
    deleteUnverified();
});

module.exports = router;