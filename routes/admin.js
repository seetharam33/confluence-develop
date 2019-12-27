var express = require('express');
var router = express.Router();
var passport = require('./auth.js');
var mongoose = require('mongoose');
var bCrypt = require('bcrypt-nodejs');
var flash = require('connect-flash');
var multer = require('multer');
var fs = require('fs');
var async = require('async');
var crypto = require('crypto');
var moment = require('moment');
var smtpTransport = require('nodemailer-smtp-transport');

// import the models
var admins = mongoose.model('admins');
var counsellors = mongoose.model('counsellors');
var trainers = mongoose.model('trainers');
var users = mongoose.model('users');
var associates = mongoose.model('associates');
var tasks = mongoose.model('tasks');
var constants = require('./constants');
var utils = require('./utils');
var website = 'http://dashboard.confluenceedu.com/'


router.get('/', function (req, res, next) {
    res.render('admin/login', {
        error: req.flash('error'),
        reg_error: req.flash('registrationError'),
        reg_success: req.flash('registrationSuccess')
    });
});

router.post('/login', function (req, res, next) {
    var types = req.body.types;
    var types = 'counsellor';
   
    
    if (types == 'counsellor') {
        console.log(types);
        counsellors.find({}, function (err, user) {
            if (err) {
                console.log("internal database error");
                req.flash('error', "Database Error");
                res.redirect('/admin');
            } else if (user.length > 0) {
                passport.authenticate('counsellorlogin', function (err, user, info) {
                    if (err) {
                        req.flash('error', "Database Error");
                        res.redirect('/admin');
                    } else if (!user) {
                        console.log('coming');
                        req.flash('error', info.message);
                        res.redirect('/admin');
                    } else {
                        req.logIn(user, function (err) {
                            if (err) {
                                req.flash('error', "Database Error");
                                res.redirect('/admin');
                            }
                            else {
                                res.redirect('/counsellor/reports');
                            }
                        });
                    }
                })(req, res, next);
            } else {
                var newAdmin = new counsellors({
                    first_name: 'admin',
                    email: req.body.username,
                    _email: true,
                    _approved: true,
                    _admin: true,
                    password: createHash(req.body.password)
                });
                newAdmin.save(function (err, user) {
                    if (err) {
                        console.log(err);
                        req.flash('error', "Some internal error occoured, Please contact admin");
                        res.redirect('/admin');
                    } else {
                        req.flash('error', "Admin Created. Please Login.");
                        res.redirect('/admin/reports');
                    }
                });
            }
        });
    }
    else if (types == 'trainer') {
        passport.authenticate('trainerlogin', function (err, user, info) {
            if (err) {
                console.log(err);
                req.flash('error', "Database Error");
                res.redirect('/admin');
            }
            else if (!user) {
                req.flash('error', info.message);
                res.redirect('/admin');
            }
            else {
                req.logIn(user, function (err) {
                    if (err) {
                        req.flash('error', "Database Error");
                        res.redirect('/admin');
                    } else {
                        res.redirect('/trainer/users');
                    }
                });
            }
        })(req, res, next);
    }
    else {
        req.flash('error', "Select Trainer/Counsellor");
        res.redirect('/admin');
    }
});

router.get('/forgot', function (req, res, next) {
    res.render('admin/forgot', {success: req.flash('success'), error: req.flash('error')});
});

router.get('/reports/:time', adminValidate, function (req, res, next) {
    var currDate = Date.now();
    var currMonth = new Date().getMonth();
    var currYear = new Date().getFullYear();
    var timeFrame = req.params.time;

    if (timeFrame === "w") {
        tasks.aggregate([
            {$addFields: {month: {$month: "$followupDate"}}},
            {$match: {month: currMonth + 1}},
            {$group: {_id: {counsellor: "$counsellor", status: "$status"}, taskCount: {$sum: 1}}}
        ]).exec(function (err, taskSummary) {

            users.aggregate([
                {$addFields: {month: {$month: "$createDate"}}},
                {$match: {month: currMonth + 1}},
                {$count: "leadCount"}
            ]).exec(function (err, LeadCount) {

                console.log(err, taskSummary);
                res.render('counsellor/adminReports', {
                    'taskSummary': taskSummary,
                    dataTime: "Week",
                    'error': req.flash('error')
                });

            });

        });
    } else if (timeFrame === "m") {
        tasks.aggregate([
            {$addFields: {month: {$month: "$followupDate"}}},
            {$match: {month: currMonth + 1}},
            {$group: {_id: {counsellor: "$counsellor", status: "$status"}, taskCount: {$sum: 1}}}
        ]).exec(function (err, taskSummary) {

            users.aggregate([
                {$addFields: {month: {$month: "$createDate"}}},
                {$match: {month: currMonth + 1}},
                {$count: "leadCount"}
            ]).exec(function (err, LeadCount) {

                console.log(err, taskSummary);
                res.render('counsellor/adminReports', {
                    'taskSummary': taskSummary,
                    dataTime: "Month",
                    'error': req.flash('error')
                });

            });

        });

    } else if (timeFrame === "y") {
        tasks.aggregate([
            {$addFields: {year: {$year: "$followupDate"}}},
            {$match: {year: currYear }},
            {$group: {_id: {counsellor: "$counsellor", status: "$status"}, taskCount: {$sum: 1}}}
        ]).exec(function (err, taskSummary) {

            users.aggregate([
                {$addFields: {month: {$month: "$createDate"}}},
                {$match: {year: currYear }},
                {$count: "leadCount"}
            ]).exec(function (err, LeadCount) {

                console.log(err, taskSummary);
                res.render('counsellor/adminReports', {
                    'taskSummary': taskSummary,
                    dataTime: "Month",
                    'error': req.flash('error')
                });

            });

        });

    } else {
        res.render('counsellor/adminReports', {
            'error': req.flash('error')
        });
    }
    /*tasks.aggregate([
        {$addFields: {month: {$month: "$followupDate"}}},
        {$match: {month: currMonth + 1}},
        {$group: {_id: "$status", count: {$sum: 1}}}
    ], function (err, taskSummary) {
        users.aggregate([
            {$addFields: {month: {$month: "$createDate"}}},
            {$match: {month: currMonth + 1}},
            {$count: "leadCount"}
        ], function (err, leadCount) {
            users.aggregate([
                {$unwind: "$payment"},
                {$addFields: {month: {$month: "$createDate"}}},
                {
                    $match: {
                        month: currMonth + 1
                    }
                },
                {$group: {_id: "$payment._isComplete", count: {$sum: 1}, revenue: {$sum: "$payment.amount"}}}
            ], function (err, paymentSummary) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log(paymentSummary);
                    res.render('counsellor/adminReports', {
                        'paymentSummary': paymentSummary,
                        'leadCount': leadCount,
                        'taskSummary': taskSummary,
                        'error': req.flash('error')
                    });
                }
            });

        });
        {$group: {_id: "$_id.status", count: {$sum: 1}}}

    });*/


});

router.post('/forgot', function (req, res, next) {
    var email = req.body.email;
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            counsellors.findOne({email: req.body.email}, function (err, user) {
                if (!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/admin/forgot');
                }

                user.resetPasswordToken = token;
                var seconds = 7200;
                user.resetPasswordExpires = moment().add(seconds, 'seconds'); // 1 hour

                user.save(function (err) {
                    done(err, token, user);
                });
            });
        },
        function (token, user, done) {
            var mailOptions = {
                from: 'study@confluenceoverseas.com', // sender address
                to: email, // list of receivers
                subject: 'Welcome to ConfluenceEdu', // Subject line
                text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' +
                '<br> You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://dashboard.confluenceedu.com/admin/reset/' + token + '\n\n',
                html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                '<br>Please click on the following link, or paste this into your browser to complete the process:\n\n' + 'http://dashboard.confluenceedu.com/admin/reset/' + token + '\n\n' +
                '<br> Regards, ' +
                '<br> Confluence Edu ' // html body
            };
            utils.sendMail(mailOptions);
            console.log("SENT MAIL TO",email);
            req.flash('error',"Email has been sent to "+email)//NOT AN ERROR JUST A SHORTCUT TO DISPLLAY MESSAGE
            res.redirect('/admin/forgot');
        }
    ], function (err) {
        console.log(err);
        if (err) return next(err);
        res.redirect('/admin/forgot');
    });
});

router.get('/reset/:token', function (req, res) {
    counsellors.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: moment()}
    }, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/admin/forgot');
        }
        res.render('admin/reset', {user: req.user, 'userData': user});
    });
});

router.post('/reset/:token', function (req, res) {
    console.log(req.params.token);
    counsellors.findOne({resetPasswordToken: req.params.token}, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/admin/forgot');
        }
        else {

            user.password = createHash(req.body.password);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save(function (err) {
                console.log(err);
            });
            var mailOptions = {
                to: user.email,
                from: 'study@confluenceoverseas.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n',
                html: 'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            utils.sendMail(mailOptions);
            req.flash('error',"Password has been changed")//NOT AN ERROR JUST A SHORTCUT TO DISPLLAY Message
            res.redirect('/admin')
        }
        console.log(err);
    });
});

router.get('/users', adminValidate, function (req, res, next) {
    users.find(function (err, users) {
        if (err) {
            console.log(err);
        } else {
            res.render('admin/users', {'userData': users, 'user': req.session.user});
        }
    });
});
router.get('/trainers', adminValidate, function (req, res, next) {
    trainers.find(function (err, users) {
        res.render('admin/adminTrainer', {'userData': users, 'user': req.session.user});
    });
});
router.get('/counsellors', adminValidate, function (req, res, next) {
    counsellors.find(function (err, users) {
        res.render('admin/adminCounsellor', {'userData': users, 'user': req.session.user});
    });
});
router.get('/trainers/remove/:id', adminValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    trainers.findById(userId, function (err, user) {
        name = user.first_name + " " + user.last_name;
        user.remove();
        req.flash('error', 'User ' + name + ' has been Successfully Deleted.');
        res.redirect('/admin/counsellors');
    });
});
router.get('/trainers/admin/:id', function (req, res, next) {
    trainers.update({_id: req.params.id}, {
        $set: {
            _admin: true
        }
    }, function (err) {
        if (err) {
            console.log(err);
            req.flash('error', 'Invalid User. Please try Again');
            res.redirect('/');
        }
    });
    var name;
    trainers.findById(req.params.id, function (err, user) {
        name = user.first_name + " " + user.last_name;
        console.log(name);
        req.flash('success', 'User ' + name + ' has been granted Admin Previleges');
        res.redirect('/admin/counsellors');
    });
});
router.get('/trainers/revoke/:id', function (req, res, next) {
    trainers.update({_id: req.params.id}, {
        $set: {
            _admin: false
        }
    }, function (err) {
        if (err) {
            console.log(err);
            req.flash('error', 'Invalid User. Please try Again');
            res.redirect('/');
        }
    });
    var name;
    trainers.findById(req.params.id, function (err, user) {
        name = user.first_name + " " + user.last_name;
        console.log(name);
        req.flash('error', 'User ' + name + '\'s Admin rights have been Revoked.');
        res.redirect('/admin/counsellors');
    });
});

router.get('/counsellor/remove/:id', adminValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    counsellors.find({}, function (err, userData) {
        console.log(userData);
        res.render('admin/remove', {'userData': userData, "id": userId});
    });
});

router.post('/counsellor/remove/:id', adminValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    console.log(userId);
    associates.update({'assignedCounsellor': userId}, {
        $set: {
            assignedCounsellor: req.body.newCounsellor
        }
    }, {
        multi: true
    }, function (err, userData) {
        console.log(userData);
        console.log(err)
    });
    users.update({'assignedCounsellor': userId}, {
        $set: {
            assignedCounsellor: req.body.newCounsellor
        }
    }, {
        multi: true
    }, function (err, userData) {
        console.log(userData);
        console.log(err)
    });
    counsellors.findById(userId, function (err, user) {
        if (err) {
            console.log(err);
        }
        else {
            var name = user.first_name + user.last_name;
            console.log(name);
            user.remove();
            console.log("Success");
        }

    });
    req.flash("success", "Counsellor removed");
    res.redirect('/admin/counsellors');
});

router.get('/counsellor/admin/:id', function (req, res, next) {
    counsellors.update({_id: req.params.id}, {
        $set: {
            _admin: true
        }
    }, function (err) {
        if (err) {
            console.log(err);
            req.flash('error', 'Invalid User. Please try Again');
            res.redirect('/');
        }
    });
    var name;
    counsellors.findById(req.params.id, function (err, user) {
        name = user.first_name + " " + user.last_name;
        console.log(name);
        req.flash('success', 'User ' + name + ' has been granted Admin Previleges');
        res.redirect('/admin/counsellors');
    });
});
router.get('/counsellor/revoke/:id', function (req, res, next) {
    counsellors.update({_id: req.params.id}, {
        $set: {
            _admin: false
        }
    }, function (err) {
        if (err) {
            console.log(err);
            req.flash('error', 'Invalid User. Please try Again');
            res.redirect('/');
        }
    });
    var name;
    counsellors.findById(req.params.id, function (err, user) {
        name = user.first_name + " " + user.last_name;
        console.log(name);
        req.flash('error', 'User ' + name + '\'s Admin rights have been Revoked.');
        res.redirect('/admin/counsellors');
    });
});

router.get('/create', adminValidate, function (req, res, next) {
    res.render('admin/create', {error: req.flash('error'), success: req.flash('success')});
});

router.post('/create', adminValidate, function (req, res, next) {
    var type = req.body.types;
    var email = req.body.email;
    if (type == 'counsellor') {
        counsellors.findOne({email: email}, function (err, user) {
            if (err) {
                req.flash('error', 'There was a Database Error');
                res.redirect('/admin/create');
            }
            else if (user) {
                req.flash('error', 'User already exists');
                console.log("Already exists case");
                res.redirect('/admin/create');
            }
            else {
                if (req.body.password == req.body.confirm_password) {
                    var newUser = new counsellors({
                        first_name: req.body.first_name,
                        last_name: req.body.last_name,
                        phone: req.body.phone,
                        email: email,
                        _email: true,  // user created by admin won't have to verify his email.
                        password: createHash(req.body.password)
                    });
                    newUser.save(function (err, result) {
                        if (err) {
                            console.log(err);
                            req.flash('error', "Some database error occoured");
                            res.redirect('/admin/create')
                        }
                        else {
                            req.flash('success', "User created succcessfully");
                            console.log("user created case");
                            res.redirect('/admin/create');
                        }
                    });
                }
                else {
                    req.flash('error', "Passwords don't match");
                    res.redirect('/admin/create');
                }

            }
        });
    }
    else if (type == 'trainer') {
        trainers.findOne({email: email}, function (err, user) {
            if (err) {
                req.flash('error', 'There was a Database Error');
                res.redirect('/admin/create');
            }
            else if (user) {
                req.flash('error', 'User already exists');
                res.redirect('/admin/create');
            }
            else {
                if (req.body.password == req.body.confirm_password) {
                    var newUser = new trainers({
                        first_name: req.body.first_name,
                        last_name: req.body.last_name,
                        phone: req.body.phone,
                        email: email,
                        _email: true,    // user created by admin won't need to verify his email.
                        password: createHash(req.body.password)
                    });
                    newUser.save(function (err, result) {
                        if (err) {
                            console.log(err);
                            req.flash('error', "Some database error occoured");
                            res.redirect('/admin/create')
                        }
                        else {
                            req.flash('success', "User created succcessfully");
                            console.log("user created case");
                            res.redirect('/admin/create');
                        }
                    });
                }
                else {
                    req.flash('error', "Passwords don't match");
                    res.redirect('/admin/create');
                }
            }
        });
    }
});

/* GET users listing. */
var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

function adminValidate(req, res, next) {
    console.log(req.user);
    counsellors.findById(req.user, function (err, user) {
        if (user != null && user._admin) {
            req.session.user = user;
            res.locals.counsellor = user;
            next();
        } else {
            res.redirect('/admin');
        }
    });
}

module.exports = router;
