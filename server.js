const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const cors = require('cors');
// const TrackUser = require('./middleware/TrackUser');

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:3000',
    'https://zeptical.com',
    // 'https://www.googleapis.com'
]
const corsOptions = {
    origin: "*"
    // origin: (origin, callback) => {
    //     if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
    //         callback(null, true)
    //     } else {
    //         callback(new Error('Not allowed by CORS'))
    //     }
    // }
};
app.use(cors(corsOptions));

let mongoURI = null;
if (process.env.APP_ENV === 'production') {
    mongoURI = process.env.PRODUCTION_DB;
} else {
    mongoURI = process.env.DEVELOPMENT_DB;
}
mongoose.connect(mongoURI);

app.use(express.json());
app.use(express.static(__dirname + '/public'));

// app.use(TrackUser);

app.get("/name", function (req, res) {
    res.send("Completed");
});

// Available routes
app.use('/api/user/auth', require('./routes/user/auth'));
app.use('/api/user/profile', require('./routes/user/profile'));

app.listen(PORT, () => {
    console.log(`Listening to PORT at ${PORT}`);
});