var express = require('express');
var router = express.Router();
var passport = require('./auth.js');
var mongoose = require('mongoose');
var bCrypt = require('bcrypt-nodejs');
var flash = require('connect-flash');
var multer = require('multer');
var fs = require('fs');
var request = require('request');
var path = require('path');
var moment = require('moment');
var multer = require('multer');
var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');
var shortid = require('shortid');
var constants = require('./constants')
var utils = require('./utils')
//models
var users = mongoose.model('users');
var usa = mongoose.model('usa');
var canada = mongoose.model('canada');
var france = mongoose.model('france');
var italy = mongoose.model('italy');
var uk = mongoose.model('uk');
var spain = mongoose.model('spain');
var dubai = mongoose.model('dubai');
var malaysia = mongoose.model('malaysia');
var singapore = mongoose.model('singapore');
var netherlands = mongoose.model('netherlands');
var switzerland = mongoose.model('switzerland');
var germany = mongoose.model('germany');
var ireland = mongoose.model('ireland');
var aus = mongoose.model('aus');
var nz = mongoose.model('nz');
var admins = mongoose.model('admins');
var counsellors = mongoose.model('counsellors');

var notifications = mongoose.model('notifications');

var website = 'http://dashboard.confluenceedu.com'
// create reusable transporter object using SMTP transport
var zip = (a,b) => a.map((x,i) => [x,b[i]]);
var transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
        user: 'confluenceindia',
        pass: 'mlnkoushik@123'
    }
});

var fileUpload = false;
var fileFilter = false;
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname == 'attach') {
            cb(null, 'public/files')
        }
    },
    filename: function (req, file, cb) {
        cb(null, req.user + Date.now() + path.extname(file.originalname))
    }
});

//Function to genrate referral_code
var generate = function (i, item) {
    users.findByIdAndUpdate(item._id, {$set: {referral_code: 'CONF' + shortid.generate().replace('_', '').substr(0, 1).toUpperCase() + i}}, {new: true}, function (err, user) {
        if (!err) console.log(i, user.referral_code);
        if (err) {
            users.findByIdAndUpdate(item._id, {$set: {referral_code: shortid.generate().replace('_', '').substr(0, 5).toUpperCase()}}, {new: true}, function (err, user) {
                if (!err) console.log(i, user.referral_code);
                if (err) {
                    users.findByIdAndUpdate(item._id, {$set: {referral_code: shortid.generate().replace('_', '').substr(0, 5).toUpperCase()}}, {new: true}, function (err, user) {
                        if (!err) console.log(i, user.referral_code);
                        if (err) {
                            console.log("FML");
                        }
                    });
                }
            });
        }
    });
}

//Code to genrate Referral Code for the existing users
// users.find({},function(err, list) {
//   console.log(list.length);
//   for(var i=0;i<list.length;i++){
//     generate(i,list[i]);
//   }
// });


var fileFilter = function (req, file, cb) {
    fileUpload = true;
    console.log(file);
    if (true) {
        cb(null, true);
    } else {
        fileFilter = true;
        cb(null, false);
    }

}

var uploads = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 4096*4096
    }
});

var upload = uploads.fields([{name: 'attach'}]);

router.get('/', function (req, res, next) {
    res.render('users/index', {
        error: req.flash('error'),
        reg_error: req.flash('registrationError'),
        reg_success: req.flash('registrationSuccess')
    });
});

router.get('/register', function (req, res, next) {
    res.render('users/register', {
        error: req.flash('error'),
        reg_error: req.flash('registrationError'),
        reg_success: req.flash('registrationSuccess')
    });
});

router.get('/settings/:id', userValidate, function (req, res, next) {
    res.render('users/settings', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/settings/:id', userValidate, function (req, res, next) {
    var userId = req.params.id;
    console.log(req.params.id);
    console.log("req.user");
    var change = true;
    users.findOne({'_id': req.params.id}, function (err, user) {
        console.log(user);
        if (req.body.newpassword.localeCompare(req.body.newconfirm_password) != 0) {
            console.log("Passwords do not match. Please Check again.");
            change = false;
            req.flash('error', 'Passwords do not match. Please Check again.');
            res.redirect('/users/settings/' + userId);
        }
        else if (!isValidPassword(user, req.body.password)) {
            change = false;
            console.log('Invalid Password');
            req.flash('error', 'Incorrect Password. Please Check again.');
            res.redirect('/users/settings/' + userId);
        }
        console.log(change);
        if (change) {
            users.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        password: createHash(req.body.newpassword)
                    }
                },
                function (err, user) {
                    if (err) {
                        console.log(err);
                        res.redirect('/users/settings/' + userId);
                    }
                    else {
                        console.log(user);
                        req.flash('success', 'Password changed Successfully');
                        res.redirect('/users/settings/' + userId);
                    }
                }
            );

        }
    });
});


router.get('/discussion', userValidate, function (req, res, next) {
    users.findOne({_id: req.user}).populate('discussion.counsellor').exec(function (err, result) {
        if (err) {
            console.log(err);
            req.flash('error', "Some internal database error has occured");
            res.redirect('/users/home');
        }
        else {
            console.log(result);
            //res.send(result);
            res.render('users/discussion', {'userData': result, 'error': req.flash('error')});
        }
    });
});

router.get('/notifications', userValidate, function (req, res, next) {
    notifications.find({}).populate('counsellor').exec(function (err, result) {
        if (err) {
            console.log(err);
            req.flash('error', " Internal database error has occured");
            res.redirect('/users/notifications');
        }
        else {
            console.log(result);
            res.render('users/userNotifications', {
                'userData': result,
                'result': result,
                'error': req.flash('error'),
                'id': req.user
            });
        }
    });
});

router.get('/request/:id', userValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", "Some Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/users/request/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('users/request', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/request/:id', userValidate, function (req, res, next) {
    users.findByIdAndUpdate(req.params.id, {
        $set: {
            requests: {
                country: req.body.country,
                course: req.body.course,
                appFee: req.body.appFee,
                uniFee: req.body.uniFee
            }
        }
    }, function (err, user) {
        console.log(user);
        if (err) {
            req.flash('error', "Some database error occured, Please contact admin");
            console.log(err);
            res.redirect('/users/request/' + req.params.id);
        }
        else {
            req.session.user = user;
            req.flash('success', " Shortlisting Requested Successfully");
            res.redirect('/users/request/' + req.params.id);
        }
    });
});

router.get('/shortlist/:id', userValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}).populate('usaShortlists.university ausShortlists.university canadaShortlists.university germanyShortlists.university irelandShortlists.university nzShortlists.university ukShortlists.university spainShortlists.university dubaiShortlists.university malaysiaShortlists.university singaporeShortlists.university netherlandsShortlists.university switzerlandShortlists.university').exec(function (err, result) {
        if (err) {
            req.flash("error", "Some Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/users/shortlist/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('users/shortlist', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
});

router.get('/declineshortlist/:country/:id/:univid', userValidate, function (req, res, next) {
    backURL = req.header('Referer');
    console.log("University ID: ", req.params.univid);
    var userId = req.params.id;
    var country = req.params.country;
    var listName = country + "Shortlists.university";
    var queryObj = {_id: userId};
    queryObj[listName] = req.params.univid;

    var setObj = {};
    setObj[country + "Shortlists.$.status"] = "Declined";

    users.update(queryObj,
        {
            $set: setObj
        }, function (err, userData) {
            res.redirect(backURL);
            console.log(userData.usaShortlists);
        }
    );
});
router.get('/undodecline/:country/:id/:univid', userValidate, function (req, res, next) {
    backURL = req.header('Referer');
    console.log("University ID: ", req.params.univid);
    var userId = req.params.id;
    var country = req.params.country;
    var listName = country + "Shortlists.university";
    var queryObj = {_id: userId};
    queryObj[listName] = req.params.univid;

    var setObj = {};
    setObj[country + "Shortlists.$.status"] = "Shortlisted";

    users.update(queryObj,
        {
            $set: setObj
        }, function (err, userData) {
            res.redirect(backURL);
            console.log(userData.usaShortlists);
        }
    );
});

router.get('/payment/:id', userValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", "Some Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/users/payment/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('users/payment', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.get('/shortlist/:country/:id', userValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    if (req.params.country == "usa") {
        usa.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/usa', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "aus") {
        aus.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/aus', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "canada") {
        canada.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/canada', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "germany") {
        germany.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/germany', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "ireland") {
        ireland.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/ireland', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "nz") {
        nz.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/nz', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "uk") {
        uk.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/uk', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "spain") {
        spain.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/spain', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "dubai") {
        dubai.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/dubai', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "malaysia") {
        malaysia.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/malaysia', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "singapore") {
        singapore.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/singapore', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "netherlands") {
        netherlands.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/netherlands', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "switzerland") {
        switzerland.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/switzerland', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "france") {
        france.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/france', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
    else if (req.params.country == "italy") {
        italy.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", "Some Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/users/shortlist/' + req.user._id.toString());
            }
            else {
                console.log(result);
                res.render('users/italy', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    }
})

router.post('/discussion', userValidate, function (req, res, next) {
    upload(req, res, function (err) {
        var file = false;
        if (err) {
          console.log("THIS IS THE ERRORRR------------------")
            console.log(err.message);
            req.flash('error', err.message.toString());
            res.redirect('/users/discussion');
        }
        else if (fileFilter == true) {
            fileFilter = false;
            req.flash('error', 'Error Uploading Document. Invalid File-Type.');
            res.redirect('/users/discussion/');
        } else if (fileUpload == true && req.files.attach == null) {
            fileUpload = false;
            req.flash('error', 'Error Uploading Document. Max File-Size Exceeded.');
            res.redirect('/users/discussion/');
        }
        else if (req.body.message == '' && req.files.attach == null) {
            req.flash('error', 'Please Enter a Message.');
            res.redirect('/users/discussion/');
        }
        else {
            //console.log(req.body);

            console.log(req.files);
            var message = req.body.message;
            var originalname, name;
            if (req.files.attach != null) {
                file = true;
                name = req.files.attach.map(({ filename }) => filename);
                originalname = req.files.attach.map(({ originalname }) => originalname);

            } else {
                originalname = null;
                name = null;
            }
            users.update({_id: req.user}, {
                    $push: {
                        "discussion": {
                            text: message,
                            timestamp: Date.now(),
                            _file: file,
                            file: name,
                            orignalfile: originalname
                        }
                    }
                },
                {
                    safe: true,
                    upsert: true,
                    new: true
                }, function (err) {
                    if (err) {
                        console.log(err);
                        req.flash('error', "Some Database Error, Contact Admin");
                    } else {
                        users.findOne({_id: req.user}).populate('assignedCounsellor').exec(function (err, user) {

                            var discussionMsg = constants.msgDiscussionFromStudent(user.assignedCounsellor.first_name, user.assignedCounsellor.last_name, user.first_name, user.last_name);
                            utils.sendSMS(user.assignedCounsellor.phone, encodeURI(discussionMsg));
                            // var url = 'http://api.smscountry.com/SMSCwebservice_bulk.aspx?user=svsreddy&passwd=newyear@123&mobilenumber=' + user.assignedCounsellor.phone + '&message=Hello%20' + user.assignedCounsellor.first_name + ' ' + user.assignedCounsellor.last_name + ',%20You%20have%20a%20new%20message%20from%20' + user.first_name + ' ' + user.last_name + '.Please%20login%20to%20the%20dashboard%20to%20reply.&sid=CEDUSA&mtype=N&DR=Y';
                            // request({url: url}, function (error, response, body) {
                            //     console.log("discussion: ", url);
                            //     console.log(error, response.body);
                            // });
                            var counsellorMailOptions = {
                                from: 'study@confluenceoverseas.com', // sender address
                                to: user.assignedCounsellor.email, // list of receivers
                                subject: 'New Discussion Message', // Subject line
                                text: '<h2>New Discussion Message</h2>Hello ' + user.assignedCounsellor.first_name +
                                '<br>You have a new message from your student.<br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                                '<br> Thanks And Regards ' +
                                '<br> Confluence Edu ',
                                html: '<h2>New Discussion Message</h2>Hello ' + user.assignedCounsellor.first_name +
                                '<br>You have a new message from your student.<br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                                '<br> Thanks And Regards ' +
                                '<br> Confluence Edu '
                            };
                            utils.sendMail(counsellorMailOptions);
                        });
                    }
                });
            res.redirect('/users/discussion');
        }
    });
});

router.post('/register', function (req, res, next) {
    console.log(req.body);
    // POST Request
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var confirm_password = req.body.confirm_password;
    var password = req.body.password;
    var email = req.body.email;
    var referredBy = req.body.refer;
    var id;
    if (!referredBy)
        referredBy = "None";
    else {
        users.findOne({"referral_code": referredBy}, function (err, data) {
            id = data._id;
        });
    }
    var count;
    console.log("id", id);
    users.count(function (err, count) {
        co = count;
        var referral_code = 'CONF' + shortid.generate().replace('_', '').substr(0, 2).toUpperCase() + count;
        if (password.localeCompare(confirm_password) != 0) {
            req.flash('registrationError', 'Passwords do not match. Please Check again.');
            res.redirect('register');
        }
        else {
            users.findOne({'email': email}, function (err, user) {
                if (user != null) {
                    req.flash('registrationError', 'E-mail already registered. Please Register using a different E-mail or use Forgot Password for password recovery.');
                    res.redirect('register');
                }
                else {
                    if (!referredBy)
                        referredBy = "None";
                    else {
                        counsellors.findOne({'email':'vs@confluenceedu.com'},function (err, counsellor) {
                            if (err) {
                                console.log(err);
                                eq.flash('registrationError', 'E-mail already registered. Please Register using a different E-mail or use Forgot Password for password recovery.');
                                res.redirect('register');
                            } else {
                                var phone = req.body.phone;
                                // Database Entry
                                var user = new users({
                                    first_name: first_name,
                                    last_name: last_name,
                                    email: email,
                                    password: createHash(password),
                                    phone: {
                                        mobile: phone
                                    },
                                    referral_code: referral_code,
                                    referredBy: {
                                        referral_code: referredBy,
                                        user: id
                                    },
                                    assignedCounsellor: counsellor._id
                                });
                                user.save(function (err, user) {
                                    if (err) {
                                        console.log(err);
                                        req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                                        res.redirect('register');
                                    }
                                    else {
                                        req.flash('success', 'User has been added');
                                        var mailOptions = {
                                            from: 'study@confluenceoverseas.com', // sender address
                                            to: email, // list of receivers
                                            subject: 'Welcome to ConfluenceEdu', // Subject line
                                            text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + first_name +
                                            '<br>Thank You for signing up for ConfluenceEdu. You can login after verifying your email by clicking ' +
                                            '<a href="' + website + '/users/confirm/' + user._id + '">here</a>.<br>' + 'You can also paste the link below in your browser to confirm.<br>' +
                                            '<a href="' + website + '/users/confirm/' + user._id + '">' + website + '/users/confirm/' + user._id + '</a><br><br>Regards,<br>Webmaster<br>ConfluenceEdu', // plaintext body
                                            html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + first_name +
                                            '<br>Thank You for signing up for ConfluenceEdu. You can login after verifying your email by clicking ' +
                                            '<a href="' + website + '/users/confirm/' + user._id + '">here</a>.<br>' + 'You can also paste the link below in your browser to confirm.<br>' +
                                            '<a href="' + website + '/users/confirm/' + user._id + '">' + website + '/users/confirm/' + user._id + '</a><br><br>Regards,<br>Webmaster<br>ConfluenceEdu' // html body
                                        };
                                        var adminMailOptions = {
                                            from: 'study@confluenceoverseas.com', // sender address
                                            to: 'vs@confluenceedu.com', // list of receivers
                                            subject: 'New user Registration.', // Subject line
                                            text: 'Hello Admin,<br>' +
                                            'New User ' + first_name + ' ' + last_name +
                                            ' Has registered with the Email ' + email + '.',// plaintext body
                                            html: 'Hello Admin,<br>' + 'New User ' + first_name + ' ' +
                                            last_name + ' Has registered with the Email ' + email + '.' // html body
                                        };

                                        // send mail with defined transport object
                                        transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log('Message sent: ' + info);
                                            }
                                        });
                                        transporter.sendMail(adminMailOptions, function (error, info) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log('Message sent: ' + info);
                                            }
                                        });
                                        res.redirect('register');
                                    }
                                });
                            }
                        });

                    }
                }
            });

        }
    });
});

router.get('/confirm/:id', function (req, res, next) {
    users.update({_id: req.params.id}, {
        $set: {
            _email: true
        }
    }, function (err) {
        if (err) {
            console.log(err);
            req.flash('error', 'Invalid User. Please try Again');
            res.redirect('/');
        }
    });
    req.flash('error', 'Email Id Comfirmed. Please Login to Continue.');
    res.redirect('/');
});


router.get('/personalEdit', userValidate, function (req, res, next) {
    res.render('users/editProfile', {
        success: req.flash('error'),
        success: req.flash('success'),
        userData: req.session.user
    });
});

router.post('/personalEdit', userValidate, function (req, res, next) {
    users.findByIdAndUpdate(req.user, {
        $set: {
            phone: {
                landline: req.body.landline,
                isd: req.body.isd,
                std: req.body.std,
                mobile: req.session.user.phone.mobile
            },
            altEmail: req.body.altEmail,
            dob: req.body.dob,
            gender: req.body.gender,
            maritial: req.body.maritial,
            fb: req.body.fb,
            twitter: req.body.twitter,
            linkedIn: req.body.linkedIn,
            skype: req.body.skype,
            blog: req.body.blog,
            address: {
                line1: req.body.line1,
                line2: req.body.line2,
                city: req.body.city,
                state: req.body.state,
                country: req.body.country,
                pin: req.body.pincode
            },
            workExp: {
                latestEmp: req.body.latestEmp,
                designation: req.body.designation,
                exp: req.body.exp,
                coreFunction: req.body.coreFunction
            },
            guardian: {
                name: req.body.guardianName,
                occupation: req.body.occupation,
                number: req.body.guardianNumber,
                relation: req.body.relation
            }
        }
    }, function (err, user) {
        console.log(user);
        if (err) {
            req.flash('error', "Some database error occured, Please contact admin");
            console.log(err);
            res.redirect('/users/personalEdit');
        }
        else {
            req.session.user = user;
            req.flash('success', "Profile Updated Successfully");
            res.redirect('/users/personalEdit');
        }
    });
});

router.get('/educationEdit', userValidate, function (req, res, next) {
    res.render('users/editEdu', {
        success: req.flash('error'),
        success: req.flash('success'),
        userData: req.session.user
    });
});

router.post('/educationEdit', userValidate, function (req, res, next) {
    console.log(req.session.user);
    users.update({email: req.session.user.email}, {
        $set: {
            tenth: {
                year: req.body.yearTenth,
                school_name: req.body.schoolTenth,
                city: req.body.cityTenth,
                state: req.body.stateTenth,
                board: req.body.boardTenth,
                medium: req.body.medTenth,
                marks: req.body.marksTenth,
            },
            twelfth: {
                year: req.body.yeartwelfth,
                school_name: req.body.schooltwelfth,
                city: req.body.citytwelfth,
                state: req.body.statetwelfth,
                board: req.body.boardtwelfth,
                medium: req.body.medtwelfth,
                marks: req.body.markstwelfth,
                specialization: req.body.specializationtwelfth,
                mode: req.body.modetwelfth
            },
            grad: {
                year: req.body.yearGrad,
                school_name: req.body.schoolGrad,
                city: req.body.cityGrad,
                state: req.body.stateGrad,
                board: req.body.boardGrad,
                medium: req.body.medGrad,
                marks: req.body.marksGrad,
                specialization: req.body.specializationGrad,
                mode: req.body.modeGrad,
                backlogs: req.body.backlogsGrad
            },
            postgrad: {
                year: req.body.yearPostgrad,
                school_name: req.body.schoolPostgrad,
                city: req.body.cityPostgrad,
                state: req.body.statePostgrad,
                board: req.body.boardPostgrad,
                medium: req.body.medPostgrad,
                marks: req.body.marksPostgrad,
                specialization: req.body.specializationPostgrad,
                mode: req.body.modePostgrad,
                backlogs: req.body.backlogsPG
            },
            scores: {
                gre: req.body.gre,
                gmat: req.body.gmat,
                sat: req.body.sat,
                ielts: req.body.ielts,
                toefl: req.body.toefl,
                pte: req.body.pte
            }
        }
    }, function (err) {
        if (err) {
            console.log(err);
            req.flash('error', 'Some Error Occured, Please Contact Admin');
            res.redirect('/users/educationEdit');
        } else {
            req.flash('success', 'Details Updates Successfully');
            users.findOne({email: req.session.user.email}, function (err, user) {
                if (err) {
                    req.flas('error', "Some error occured, Please contact Admin");
                    res.redirect('/users/educationEdit');
                }
                else {
                    req.session.user = user;
                    res.redirect('/users/educationEdit');
                }
            });
        }
    });
});

router.get('/forgot', function (req, res, next) {
    res.render('users/forgot', {success: req.flash('success'), error: req.flash('error')});
});

router.get('/referral/:id', userValidate, function (req, res, next) {
    users.findById(req.params.id, function (err, data) {
      users.find({"referredBy.user":req.params.id},{first_name:1,last_name:1,email:1,phone:1}).exec(function(err,referredUsers){
        res.render('users/referral', {userData: data,'referredUsers':referredUsers});
      })

    })
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
            users.findOne({email: req.body.email}, function (err, user) {
                if (!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/users/forgot');
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
                subject: 'Password Reset', // Subject line
                text: '<h2>Password Reset</h2>Hello ' +
                '<br> You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://dashboard.confluenceedu.com/users/reset/' + token + '\n\n',
                html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                '<br>Please click on the following link, or paste this into your browser to complete the process:\n\n' + 'http://dashboard.confluenceedu.com/users/reset/' + token + '\n\n' +
                '<br> Regards, ' +
                '<br> Confluence Edu ' // html body
            };
            utils.sendMail(mailOptions);
                req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(null, 'done');

        }
    ], function (err) {
        console.log(err);
        if (err) return next(err);
        res.redirect('/users/forgot');
    });
});

router.get('/reset/:token', function (req, res) {
    users.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: moment()}}, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/users/forgot');
        }
        res.render('users/reset', {user: req.user, 'userData': user});
    });
});


router.post('/reset/:token', function (req, res) {
    console.log(req.params.token);
    users.findOne({resetPasswordToken: req.params.token}, function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/users/forgot');
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
            transporter.sendMail(mailOptions, function (err) {
                req.flash('success', 'Success! Your password has been changed.');
            });
            res.render('users', {user: req.user});
        }
        console.log(err);
    });
});

var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

function userValidate(req, res, next) {
    users.findById(req.user, function (err, user) {
        if (user != null) {
            req.session.user = user;
            res.locals.currentuser = user;
            next();
        }
        else {
            res.redirect("/users");
        }
    });
}

var isValidPassword = function (user, password) {
    return bCrypt.compareSync(password, user.password);
}
module.exports = router;
