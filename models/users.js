var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userSchema = new Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    altEmail: {
        type: String,
        unique: false,
    },
    studentId:{
      type: String
    },
    lead: {
        Status: String,
        Source: String
    },
    payment: [{
        amount: Number,
        status: {
            type: String,
            default: "Pending"
        },
        details: String,
        _active: {
            type: Boolean,
            default: true
        },
        deadline: Date,
        paymentDate: Date,
        _isComplete: {
            type: Boolean,
            default: false
        },
        feeType: {
            type: Schema.Types.ObjectId,
            ref: 'fees',
            required: true
        }
    }],
    requests: {
        country: String,
        course: String,
        appFee: Number,
        uniFee: Number,
        status: String
    },
    applyingCountry: {
        type: String,
        default: ""
    },
    ausShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'aus'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    canadaShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'canada'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    germanyShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'germany'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    irelandShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'ireland'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    nzShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'nz'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    ukShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'uk'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    spainShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'spain'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    dubaiShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'dubai'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    malaysiaShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'malaysia'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    singaporeShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'singapore'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    netherlandsShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'netherlands'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    switzerlandShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'switzerland'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    usaShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'usa'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    franceShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'france'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    italyShortlists: [{
        university: {
            type: Schema.Types.ObjectId,
            ref: 'italy'
        },
        status: {
            type: String,
            default: "Shortlisted"
        },
        intake: {
            type: String,
            default: ""
        },
        year: {
            type: String,
            default: ""
        }
    }],
    leadStatus: [{
        status: String,
        time: String
    }],
    discussion: [{
        counsellor: {
            type: Schema.Types.ObjectId,
            ref: 'counsellors',
        },
        associate: {
            type: Schema.Types.ObjectId,
            ref: 'associates',
        },
        timestamp: String,
        text: String,
        _counsellor: {
            type: Boolean,
            default: false,
        },
        _associate: {
            type: Boolean,
            default: false,
        },
        _file: {
            type: Boolean,
            default: false
        },
        file: {
            type: String
        },
        orignalfile: {
            type: String
        }
    }],
    assdiscussion: [{
        associate: {
            type: Schema.Types.ObjectId,
            ref: 'associates',
        },
        timestamp: String,
        text: String,
        _associate: {
            type: Boolean,
            default: false,
        },
        _file: {
            type: Boolean,
            default: false
        },
        file: {
            type: String
        },
        orignalfile: {
            type: String
        }
    }],
    assignedCounsellor: {
        type: Schema.Types.ObjectId,
        ref: 'counsellors'
    },
    counsellorHistory: [{
        counsellor: {
            type: Schema.Types.ObjectId,
            ref: 'counsellors'
        },
        time: String
    }]
    ,
    associate: {
        type: Schema.Types.ObjectId,
        ref: 'associates'
    },
    lastLogin: {
        type: String,
        unique: false,
        default: "Never"
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        mobile: Number,
        isd: Number,
        std: Number,
        landline: Number
    },
    dob: Date,
    address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        country: String,
        pin: String
    },
    fb: String,
    twitter: String,
    linkedIn: String,
    blog: String,
    skype: String,
    maritial: String,
    gender: String,
    profile: {
        name: String,
        original_name: String
    },
    summary: String,
    resume: {
        name: String,
        original_name: String
    },
    tenth: {
        school_name: String,
        city: String,
        state: String,
        board: String,
        marks: String,
        year: String,
        medium: String,
        backlogs: String,
        contact1Name: String,
        contact1Designation: String,
        contact1Number: Number,
        contact1Email: String,
        contact2Name: String,
        contact2Designation: String,
        contact2Number: Number,
        contact2Email: String,
        contact3Name: String,
        contact3Designation: String,
        contact3Number: Number,
        contact3Email: String
    },
    twelfth: {
        school_name: String,
        city: String,
        state: String,
        board: String,
        marks: String,
        year: String,
        medium: String,
        specialization: String,
        mode: String,
        backlogs: String,
        contact1Name: String,
        contact1Designation: String,
        contact1Number: Number,
        contact1Email: String,
        contact2Name: String,
        contact2Designation: String,
        contact2Number: Number,
        contact2Email: String,
        contact3Name: String,
        contact3Designation: String,
        contact3Number: Number,
        contact3Email: String
    },
    grad: {
        school_name: String,
        city: String,
        state: String,
        board: String,
        marks: String,
        year: String,
        medium: String,
        specialization: String,
        mode: String,
        backlogs: String,
        contact1Name: String,
        contact1Designation: String,
        contact1Number: Number,
        contact1Email: String,
        contact2Name: String,
        contact2Designation: String,
        contact2Number: Number,
        contact2Email: String,
        contact3Name: String,
        contact3Designation: String,
        contact3Number: Number,
        contact3Email: String
    },
    postgrad: {
        school_name: String,
        city: String,
        state: String,
        board: String,
        marks: String,
        year: String,
        medium: String,
        specialization: String,
        mode: String,
        backlogs: String,
        contact1Name: String,
        contact1Designation: String,
        contact1Number: Number,
        contact1Email: String,
        contact2Name: String,
        contact2Designation: String,
        contact2Number: Number,
        contact2Email: String,
        contact3Name: String,
        contact3Designation: String,
        contact3Number: Number,
        contact3Email: String
    },
    scores: {
        gre: Number,
        gmat: Number,
        sat: Number,
        ielts: Number,
        toefl: Number,
        pte: Number,
    },
    _email: {
        type: Boolean,
        required: true,
        default: false
    },
    _approved: {
        type: Boolean,
        required: true,
        default: false
    },
    _admitted: {
        type: Boolean,
        default: false
    },
    _login: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    workExp: {
        latestEmp: String,
        designation: String,
        exp: String,
        coreFunction: String
    },
    guardian: {
        name: String,
        occupation: String,
        number: Number,
        relation: String
    },
    referral_code: {
        type: String
    },
    referredBy: {
        referral_code: String,
        user: {
            type: String
        }
    },
    description: {
        type: String,
        default: ""
    },
    createDate: {
        type: Date,
        default: Date.now()
    }
});
module.exports = mongoose.model('users', userSchema);
