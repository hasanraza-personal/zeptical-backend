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
            projectId: {
                type: String,
            },
            name: {
                type: String,
            },
            description: {
                type: String,
            },
            projectLink: {
                type: String,
            },
            githubLink: {
                type: String,
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
            workDuration: {
                type: String,
            },
            stipends: {
                type: String,
            },
            workDescription: {
                type: String,
            },
            certificate: {
                type: String,
            },
        }
    ],
    achievement: [
        {
            competitionName: {
                type: String,
            },
            competitionLevel: {
                type: String,
            },
            competitionDescription: {
                type: String,
            },
            competitionCertificate: {
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