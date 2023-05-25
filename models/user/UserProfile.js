const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    location: {
        userCity: {
            type: String,
        },
        userState: {
            type: String,
        },
    },
    education: {
        ssc: {
            board: {
                type: String,
            },
            schoolName: {
                type: String,
            },
        },
        hsc: {
            board: {
                type: String,
            },
            collegeName: {
                type: String,
            },
        },
        diploma: {
            stream: {
                type: String,
            },
            collegeName: {
                type: String,
            },
        },
        degree: {
            stream: {
                type: String,
            },
            collegeName: {
                type: String,
            },
        }
    },
    skill: [],
    project: [
        {
            name: {
                type: String,
            },
            description: {
                type: String,
            },
            projectLink: {
                type: String,
                set: (value) => value.toLowerCase()
            },
            githubLink: {
                type: String,
                set: (value) => value.toLowerCase()
            },
            photo: {
                type: String,
            },
        }
    ],
    internship: [
        {
            companyName: {
                type: String,
            },
            duration: {
                type: String,
            },
            stipends: {
                type: String,
            },
            description: {
                type: String,
            },
            certificate: {
                type: String,
            },
        }
    ],
    achievement: [
        {
            name: {
                type: String,
            },
            level: {
                type: String,
            },
            description: {
                type: String,
            },
            certificate: {
                type: String,
            },
        }
    ],
    collaborator: {
        isApplied: {
            type: Boolean,
            default: false
        },
        paymentPreference: {
            type: String,
        },
        photoVerification: {
            type: String,
        },
        idVerification: {
            type: String,
        },
        isVerified: {
            type: Boolean,
            default: false
        },
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('userprofile', UserProfileSchema);