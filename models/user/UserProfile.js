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
        qualification: {
            type: String
        },
        ssc: {
            schoolName: {
                type: String
            },
            marks: {
                type: String
            }
        },
        hsc: {
            stream: {
                type: String
            },
            collegeName: {
                type: String
            },
            marks: {
                type: String
            }
        },
        diploma: {
            stream: {
                type: String
            },
            collegeName: {
                type: String
            },
            marks: {
                type: String
            }
        },
        degree: {
            stream: {
                type: String
            },
            collegeName: {
                type: String
            },
            marks: {
                type: String
            }
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
    internship: [
        {
            companyName: {
                type: String,
            },
            duration: {
                type: String,
            },
            type: {
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
    collaborator: {
        isApplied: {
            type: Boolean,
            default: false
        },
        paymentPreference: {
            type: String,
        },
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('userprofile', UserProfileSchema);