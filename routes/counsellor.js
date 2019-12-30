var express = require('express');
var router = express.Router();
var passport = require('./auth.js');
var mongoose = require('mongoose');
var bCrypt = require('bcrypt-nodejs');
var flash = require('connect-flash');
var multer = require('multer');
var request = require('request');
var moment = require('moment');
var fs = require('fs');
var url = require('url');
var path = require('path');
var constants = require('./constants');
var utils = require('./utils');

// import the models
var usa = mongoose.model('usa');
var canada = mongoose.model('canada');
var france = mongoose.model('france');
var italy = mongoose.model('italy');
var uk = mongoose.model('uk');
var spain = mongoose.model('spain');
var dubai = mongoose.model('dubai');
var singapore = mongoose.model('singapore');
var malaysia = mongoose.model('malaysia');
var netherlands = mongoose.model('netherlands');
var switzerland = mongoose.model('switzerland');
var germany = mongoose.model('germany');
var ireland = mongoose.model('ireland');
var aus = mongoose.model('aus');
var nz = mongoose.model('nz');
var counsellors = mongoose.model('counsellors');
var trainers = mongoose.model('trainers');
var users = mongoose.model('users');
var tasks = mongoose.model('tasks');
var associates = mongoose.model('associates');
var chats = mongoose.model('chats');
var notifications = mongoose.model('notifications');
var fees = mongoose.model('fees');

var website = 'dashboard.confluenceedu.com/'
var zip = (a,b) => a.map((x,i) => [x,b[i]]);
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
})

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
        fileSize: 4096 * 4096
    }
});


var upload = uploads.fields([{name: 'attach'}]);

router.get('/reports', counsellorValidate, function (req, res, next) {
    var currDate = Date.now();
    var currMonth = new Date().getMonth();
    console.log("currMonth", currMonth, typeof(currMonth))
    tasks.find({
        counsellor: req.user,
        followupDate: {$lt: currDate},
        status: "Open"
    }).sort('-followupDate').limit(5).populate('user counsellors').exec(function (err, missedTasks) {
        console.log("missedTasks:", missedTasks)

        tasks.find({
            counsellor: req.user,
            followupDate: {$gte: currDate},
            status: "Open"
        }).sort('followupDate').limit(5).populate('user counsellors').exec(function (err, upcomingTasks) {
            console.log("upcomingTasks:", upcomingTasks)
            tasks.aggregate([
                {$addFields: {month: {$month: "$followupDate"}}},
                {$match: {month: currMonth + 1, counsellor: mongoose.Types.ObjectId(req.user)}},
                {$group: {_id: "$status", count: {$sum: 1}}}
            ], function (err, taskSummary) {
                console.log(err, taskSummary, req.user);
                users.aggregate([
                    {$addFields: {month: {$month: "$createDate"}}},
                    {$match: {month: currMonth + 1, assignedCounsellor: mongoose.Types.ObjectId(req.user)}},
                    {$count: "leadCount"}
                ], function (err, leadCount) {
                    console.log("leadCount: ", leadCount)
                    users.aggregate([
                        {$match: {"createDate": {$exists: true}}},
                        {$unwind: "$payment"},
                        {$addFields: {month: {$month: "$createDate"}}},
                        {
                            $match: {
                                month: currMonth + 1,
                                assignedCounsellor: mongoose.Types.ObjectId(req.user)
                            }
                        },
                        {$group: {_id: "$payment._isComplete", count: {$sum: 1}, revenue: {$sum: "$payment.amount"}}}
                    ], function (err, paymentSummary) {
                        if (err) {
                            console.log("Error is: ", err);
                        }
                        else {
                            console.log("paymentSummary:", paymentSummary);


                            res.render('counsellor/reports', {
                                'missedTasks': missedTasks,
                                'upcomingTasks': upcomingTasks,
                                'taskSummary': taskSummary,
                                'paymentSummary': paymentSummary,
                                'leadCount': leadCount,
                                'error': req.flash('error')
                            });
                        }
                    });
                });
            });

        });

    });
});
router.get('/bulkMessageAssociate',counsellorValidate,function(req,res,next){
  res.render('counsellor/bulkMessageAssociate',{success: req.flash('success'), error: req.flash('error')})
})
router.post('/bulkMessageAssociate', counsellorValidate, function (req, res, next) {
    upload(req, res, function (err) {
        var userId = req.params.id;
        var file = false;
        if (err) {
            console.log(err.message);
            req.flash('error', err.message.toString());
            res.redirect('/counsellor/discussionAssociates/' + userId);
        }
        else if (fileFilter == true) {
            fileFilter = false;
            req.flash('error', 'Error Uploading Document. Invalid File-Type.');
            res.redirect('/counsellor/discussionAssociates/' + userId);
        } else if (fileUpload == true && req.files.attach == null) {
            fileUpload = false;
            req.flash('error', 'Error Uploading Document. Max File-Size Exceeded.');
            res.redirect('/counsellor/discussionAssociates/' + userId);
        } else if (req.body.message == '' && req.files.attach == null) {
            req.flash('error', 'Please Enter a Message.');
            res.redirect('/counsellor/discussionAssociates/' + userId);
        } else {
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
            associates.update({assignedCounsellor:req.session.user._id}, {
                    $push: {
                        "discussion": {
                            text: message,
                            timestamp: Date.now(),
                            _counsellor: true,
                            counsellor: req.user,
                            _file: file,
                            file: name,
                            orignalfile: originalname
                        }
                    }
                },
                {
                    safe: true,
                    upsert: true,
                    new: true,
                    multi:true
                }, function (err) {
                    if (err) {
                        console.log(err);
                        req.flash('error', "Database Error, Contact Admin");
                    }
                    else{
                      associates.find({assignedCounsellor:req.session.user._id},{_id:0,email:1}).exec(function(err,associate){
                        var emailList = associate.map(function (obj){ return obj.email })
                        var associateMailOptions = {
                            from: 'study@confluenceoverseas.com', // sender address
                            to:'study@confluenceoverseas.com',
                            bcc: emailList, // list of receivers
                            subject: 'New Discussion Message', // Subject line
                            text: '<h2>New Discussion Message</h2>Hello '  +
                            '<br>You have a new message from your Counsellor ' +'.<br>Message Preview : '+ message+'<br> Please login to you account and check the message'+
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu ',
                            html: '<h2>New Discussion Message</h2>Hello ' +
                            '<br>You have a new message from your Counsellor '+req.session.user.first_name +'.<br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu '
                        };
                        utils.sendMail(associateMailOptions);
                      })

                    }
                });
            req.flash('error','Sent Messages to all of your associates');
            res.redirect('/counsellor/bulkMessageAssociate');
        }
    });
});

router.get('/allpayments',counsellorValidate,function(req,res,next){
  users.find({assignedCounsellor:req.session.user._id},{payment:1,first_name:1,last_name:1}).populate('payment.feeType').exec(function(err,userData){
    res.render('counsellor/feesboard',{
      'userData':userData
    })
  })
})
router.get('/userreminders',counsellorValidate,function(req,res,next){

  if(req.query.searchtype=="Never Logged in Students"){
    var query = {"lastLogin":"Never","associate":{"$exists":false}};
    if(req.query.assignedCounsellor)
      query.assignedCounsellor=req.query.assignedCounsellor
    users.find(query,{'_id':1,'email':1,'associate':1,'first_name':1,'last_name':1,'phone':1}).populate('associate').exec(function(err,userData){
      counsellors.find({},{'first_name':1,'last_name':1}).exec(function(err ,counsellorList){
        res.render('counsellor/userreminders',{
          'userData':userData,
          'counsellorList':counsellorList,
          'query':req.query
      })

      })
    })
  }
  else if(req.query.searchtype=="Never Logged in Associates"){
    var query ={"lastLogin":"Never"}
    if(req.query.assignedCounsellor)
      query.assignedCounsellor=req.query.assignedCounsellor
    associates.find(query,{'_id':1,'email':1,'first_name':1,'last_name':1,'mobile':1,'institution':1}).exec(function(err,userData){
      counsellors.find({},{'first_name':1,'last_name':1}).exec(function(err ,counsellorList){
        res.render('counsellor/userreminders',{
          'userData':userData,
          'counsellorList':counsellorList,
          'query':req.query
      })

      })
    })
  }
  else{
    var query = {'$or':[{'dob':{'$exists':false}},{'gender':{'$exists':false}},{'guardian':{'$exists':false}},{'address':{'$exists':false}},{'workExp':{'$exists':false}},{'tenth':{'$exists':false}},{'twelfth':{'$exists':false}},{'grad':{'$exists':false}},{'scores':{'$exists':false}}]}
    if(req.query.assignedCounsellor)
      query.assignedCounsellor=req.query.assignedCounsellor
    users.find(query,{'_id':1,'email':1,'associate':1,'first_name':1,'last_name':1,'phone':1}).populate('associate').exec(function(err,userData){
      counsellors.find({},{'first_name':1,'last_name':1}).exec(function(err ,counsellorList){
        res.render('counsellor/userreminders',{
          'userData':userData,
          'counsellorList':counsellorList,
          'query':req.query
      })

      })
    })
  }

})
router.get('/taskboard', counsellorValidate, function (req, res, next) {

    counsellors.findOne({_id: req.user}, function (err, userData) {

        console.log('userData is:', userData);
        console.log('request user is:', req.user);
        if (req.query.fromDate && req.query.toDate) {
          query = {
              counsellor: req.user,
              followupDate: {$lte: req.query.toDate},
              followupDate: {$gte: req.query.fromDate}
          };
          if(req.query.followupDetails && req.query.followupDetails!="All")
            query.followupDetails = req.query.followupDetails;
          console.log(query)
            tasks.find(query).populate('user counsellors').exec(function (err, allTasks) {
                console.log(allTasks);
                res.render('counsellor/taskboard', {
                    'userData': userData,
                    'allTasks': allTasks,
                    'error': req.flash('error')
                });
            });
        } else {
            var currDate = Date.now();
            console.log(currDate);
            tasks.find({
                counsellor: req.user,
                followupDate: {$lte: currDate}
            }).populate('user counsellors').exec(function (err, allTasks) {
                console.log(allTasks);
                res.render('counsellor/taskboard', {
                    'userData': userData,
                    'allTasks': allTasks,
                    'error': req.flash('error')
                });
            });
        }
    });
});
router.get('/taskcount', counsellorValidate, function (req, res, next) {

    counsellors.findOne({_id: req.user}, function (err, userData) {

        if(req.query.status=="All"|| !req.query.status){
          var currDate = Date.now();
          console.log(currDate);
          tasks.aggregate([{"$match":{counsellor:mongoose.Types.ObjectId(req.user)}},{"$group":{_id:"$followupDetails",count:{$sum:1}}}]).exec(function(err,taskCountData){
            console.log("TASKCOUNTDATA",taskCountData);
            res.render('counsellor/taskcount',{
              'userData': userData,
              'taskCountData':taskCountData,
              'error':req.flash('error')
            })
          })
        }
        else{
          var currDate = Date.now();
          console.log(currDate);
          tasks.aggregate([{"$match":{counsellor:mongoose.Types.ObjectId(req.user),status:req.query.status}},{"$group":{_id:"$followupDetails",count:{$sum:1}}}]).exec(function(err,taskCountData){
            console.log("TASKCOUNTDATA",taskCountData);
            res.render('counsellor/taskcount',{
              'userData': userData,
              'taskCountData':taskCountData,
              'error':req.flash('error')
            })
          })
        }

    });
});
router.get('/leadcount', counsellorValidate, function (req, res, next) {

    counsellors.findOne({_id: req.user}, function (err, userData) {

        console.log('userData is:', userData);
        console.log('request user is:', req.user);
            var currDate = Date.now();
            console.log(currDate);
            users.aggregate([{"$match":{assignedCounsellor:mongoose.Types.ObjectId(req.user)}},{"$group":{_id:"$lead.Source",count:{$sum:1}}}]).exec(function(err,leadCountData){
              console.log("LEADCOUNTDATA",leadCountData);
              res.render('counsellor/leadcount',{
                'userData': userData,
                'leadCountData':leadCountData,
                'error':req.flash('error')
              })
            })
    });
});
router.get('/fees/:id', counsellorValidate, function (req, res, next) {
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/fees/' + req.params.id);
        }
        else {
            console.log(result);
            fees.find({user: req.params.id}, function (err, feesData) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                    res.redirect('/counsellor/fees/' + req.params.id);
                } else {
                    res.render('counsellor/fees', {
                        fees: feesData, 'userData': result, 'error': req.flash('error'),
                        'success': req.flash('success')
                    });
                }
            });
        }
    })
});

router.post('/addFees/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var fee = new fees({
        user: userId,
        feeName: req.body.fee_name,
        feeAmount: req.body.fee_amount
    });
    console.log(fee);
    fees.find({user: userId, feeName: req.body.fee_name}, function (err, result) {
        if (err) {

        } else if (result.length === 0) {
            fee.save(function (err, response) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                    res.redirect('/counsellor/fees/' + req.params.id);
                }
                else {
                    res.redirect('/counsellor/fees/' + req.params.id);
                }
            });
        } else {
            req.flash('error', 'Fee already exists');
            res.redirect('/counsellor/fees/' + req.params.id);
        }
    });

});

router.get('/users', counsellorValidate, function (req, res, next) {
        var query = {};
        if (req.query.applyingCountry)
            query.applyingCountry = req.query.applyingCountry;
        if (req.query.university)
            query.university = req.query.university;
        if (req.query.studentId)
            query.studentId = req.query.studentId
        if (req.query.counsellor)
            query.assignedCounsellor = req.query.counsellor;
        if (req.query.associate)
            query.associate = req.query.associate;
        if (req.query.firstname)
            query.first_name = req.query.firstname;
        if (req.query.lastname)
            query.last_name = req.query.lastname;
        if (req.query.leadSource)
            query["lead.Source"] = req.query.leadSource;
        if (req.query.email)
            query.email = req.query.email;
        if (req.query.phone)
            query["phone.mobile"] = req.query.phone;
        if (req.query.location)
            query["address.city"] = req.query.location;
        if (req.query.intake) {
            query['$or'] = [
                {usaShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {ukShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {spainShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {dubaiShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {malaysiaShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {singaporeShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {netherlandsShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {switzerlandShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {irelandShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {nzShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {germanyShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {italyShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {franceShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {canadaShortlists: {$elemMatch: {"intake": req.query.intake}}},
                {ausShortlists: {$elemMatch: {"intake": req.query.intake}}}
            ]
        }
        if (req.query.year) {
          console.log("YEAR",typeof req.query.year)
            query['$or'] = [
                {usaShortlists: {$elemMatch: {"year": req.query.year}}},
                {ukShortlists: {$elemMatch: {"year": req.query.year}}},
                {spainShortlists: {$elemMatch: {"year": req.query.year}}},
                {dubaiShortlists: {$elemMatch: {"year": req.query.year}}},
                {malaysiaShortlists: {$elemMatch: {"year": req.query.year}}},
                {singaporeShortlists: {$elemMatch: {"year": req.query.year}}},
                {netherlandsShortlists: {$elemMatch: {"year": req.query.year}}},
                {switzerlandShortlists: {$elemMatch: {"year": req.query.year}}},
                {irelandShortlists: {$elemMatch: {"year": req.query.year}}},
                {nzShortlists: {$elemMatch: {"year": req.query.year}}},
                {germanyShortlists: {$elemMatch: {"year": req.query.year}}},
                {italyShortlists: {$elemMatch: {"year": req.query.year}}},
                {franceShortlists: {$elemMatch: {"year": req.query.year}}},
                {canadaShortlists: {$elemMatch: {"year": req.query.year}}},
                {ausShortlists: {$elemMatch: {"year": req.query.year}}}
            ]
        }

        console.log(req.query);
        if (Object.keys(req.query).length === 0) {
            query.assignedCounsellor = req.session.user._id
        }

        console.log("query is: ", query);

        users.find(query,{first_name:1,last_name:1,email:1,phone:1,_login:1,_email:1,lead:1,studentId:1,assignedCounsellor:1,associate:1,referredBy:1}).populate('assignedCounsellor associate users').exec(function (err, user) {
            counsellors.find(function (err, counsellorsList) {
                associates.find().sort({institution:1}).exec(function (err,associateList){
                  res.render('counsellor/counsellorHome', {
                      'userData': user,
                      'counsellorList': counsellorsList,
                      'associateList':associateList,
                      'users': req.session.user,
                      'error': req.flash('error')
                  });
                })
            });
        });
    }
);

router.get('/settings/:id', counsellorValidate, function (req, res, next) {
    res.render('counsellor/settings', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/settings/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    console.log(req.params.id);
    console.log("req.user");
    var change = true;
    counsellors.findOne({'_id': req.params.id}, function (err, counsellor) {
        console.log(counsellor);
        if (req.body.newpassword.localeCompare(req.body.newconfirm_password) != 0) {
            console.log("Passwords do not match. Please Check again.");
            change = false;
            req.flash('error', 'Passwords do not match. Please Check again.');
            res.redirect('/counsellor/settings/' + userId);
        }
        else if (!isValidPassword(counsellor, req.body.password)) {
            change = false;
            console.log('Invalid Password');
            req.flash('error', 'Incorrect Password. Please Check again.');
            res.redirect('/counsellor/settings/' + userId);
        }
        console.log(change);
        if (change) {
            counsellors.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        password: createHash(req.body.newpassword)
                    }
                },
                function (err, user) {
                    if (err) {
                        console.log(err);
                        res.redirect('/counsellor/settings/' + userId);
                    }
                    else {
                        console.log(user);
                        req.flash('success', 'Password changed Successfully');
                        res.redirect('/counsellor/settings/' + userId);
                    }
                }
            );
        }
    });
});

router.get('/counsellordiscussion', counsellorValidate, function (req, res, next) {
    var userId = req.user;
    chats.find({}).populate('counsellor').exec(function (err, result) {
        if (err) {
            console.log(err);
            req.flash('error', " Internal database error has occured");
            res.redirect('/counsellor/counsellordiscussion');
        }
        else {
            console.log(result);
            res.render('counsellor/counsellordiscussion', {
                'userData': result,
                'result': result,
                'userId': userId,
                'error': req.flash('error'),
                'id': req.user
            });
        }
    });
});

router.post('/counsellordiscussion', counsellorValidate, function (req, res, next) {
    upload(req, res, function (err) {
        var userId = req.session.user._id;
        var file = false;
        if (err) {
            console.log(err.message);
            req.flash('error', err.message.toString());
            res.redirect('/counsellor/counsellordiscussion');
        }
        else if (fileFilter == true) {
            fileFilter = false;
            req.flash('error', 'Error Uploading Document. Invalid File-Type.');
            res.redirect('/counsellor/counsellordiscussion');
        } else if (fileUpload == true && req.files.attach == null) {
            fileUpload = false;
            req.flash('error', 'Error Uploading Document. Max File-Size Exceeded.');
            res.redirect('/counsellor/counsellordiscussion');
        } else if (req.body.message == '' && req.files.attach == null) {
            req.flash('error', 'Please Enter a Message.');
            res.redirect('/counsellor/counsellordiscussion');
        } else {
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
            var chat = new chats({
                text: message,
                timestamp: Date.now(),
                counsellor: req.session.user._id,
                _file: file,
                file: name,
                orignalfile: originalname
            });
            chat.save(function (err, user) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                    res.redirect('/counsellor/counsellordiscussion');
                }
                else {
                    res.redirect('/counsellor/counsellordiscussion');
                }
            });
        }
    });
});


router.get('/notifications', counsellorValidate, function (req, res, next) {
    notifications.find({}).populate('counsellor').exec(function (err, result) {
        if (err) {
            console.log(err);
            req.flash('error', " Internal database error has occured");
            res.redirect('/counsellor/notifications');
        }
        else {
            console.log(result);
            res.render('counsellor/userNotifications', {
                'userData': result,
                'result': result,
                'error': req.flash('error'),
                'id': req.user
            });
        }
    });
});

router.post('/notifications', counsellorValidate, function (req, res, next) {
    upload(req, res, function (err) {
        var userId = req.session.user._id;
        var file = false;
        if (err) {
            console.log(err.message);
            req.flash('error', err.message.toString());
            res.redirect('/counsellor/notifications');
        }
        else if (fileFilter == true) {
            fileFilter = false;
            req.flash('error', 'Error Uploading Document. Invalid File-Type.');
            res.redirect('/counsellor/notifications');
        } else if (fileUpload == true && req.files.attach == null) {
            fileUpload = false;
            req.flash('error', 'Error Uploading Document. Max File-Size Exceeded.');
            res.redirect('/counsellor/notifications');
        } else if (req.body.message == '' && req.files.attach == null) {
            req.flash('error', 'Please Enter a Message.');
            res.redirect('/counsellor/notifications');
        } else {
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
            var notification = new notifications({
                text: message,
                timestamp: Date.now(),
                counsellor: req.session.user._id,
                _file: file,
                file: name,
                orignalfile: originalname
            });
            notification.save(function (err, user) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                    res.redirect('/counsellor/notifications');
                }
                else {
                    res.redirect('/counsellor/notifications');
                }
            });
        }
    });
});


router.get('/addUsa', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addUniv', {success: req.flash('success'), error: req.flash('error')});
});

router.get('/userAdd', counsellorValidate, function (req, res, next) {
    counsellors.find({}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            res.render('counsellor/addUser', {
                'counsellorData': result,
                success: req.flash('success'),
                error: req.flash('error')
            });
        }
        else {
            res.render('counsellor/addUser', {
                'counsellorData': result,
                success: req.flash('success'),
                error: req.flash('error')
            });
        }
    });
});

router.get('/discussion/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    users.findOne({_id: userId}).populate('discussion.counsellor').populate('discussion.counsellor').exec(function (err, result) {
        if (err) {
            console.log(err);
            req.flash('error', " Internal database error has occured");
            res.redirect('/counsellor/discussion/' + userId);
        }
        else {
            res.render('counsellor/discussion', {'userData': result, 'error': req.flash('error'), 'id': req.user});
        }
    });
});


router.get('/actionuser/:var/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var status = req.params.var;
    var name;
    if (req.params.var == "0") {
        users.findById({_id: userId}, function (err, user) {
            name = user.first_name + " " + user.last_name;
            console.log(name);
            user.remove();
            req.flash('error', 'User ' + name + ' has been Successfully Deleted.');
            res.redirect('/counsellor/users');
        });
    }
    else {
        var message;
        if (req.params.var == '1') {
            status = false;
            message = "disabled";
            console.log(status);
        }
        else if (req.params.var == '2') {
            status = true;
            message = "Enabled";
            users.findById({_id: userId}, function (err, user) {
                var mailOptions = {
                    from: 'study@confluenceoverseas.com', // sender address
                    to: user.email, // list of receivers
                    subject: 'Welcome to ConfluenceEdu', // Subject line
                    text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + user.first_name +
                    '<br>Your login for ConfluenceEdu has been enabled. You can login or set your password using the forgot password option. ',
                    html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + user.first_name +
                    '<br>Your login for ConfluenceEdu has been enabled. You can login or set your password using the forgot password option.' +
                    '<br>Regards<br> ConfluenceEdu '
                };
                if(!user.associate){
                  utils.sendMail(mailOptions);

                }
            });

            console.log(status);
        }
        users.findByIdAndUpdate({_id: userId}, {
            $set: {
                _login: status
            }
        }, function (err, user) {
            req.flash('error', 'Login for User ' + name + ' has been ' + message + '.');
            res.redirect('/counsellor/users');
        });
    }
});

router.get('/actionunivAus/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    aus.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewAus');
    });
});

router.get('/actionunivCanada/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    canada.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewCanada');
    });
});

router.get('/actionunivFrance/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    france.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewFrance');
    });
});

router.get('/actionunivItaly/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    italy.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewItaly');
    });
});
router.get('/actionunivGermany/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    germany.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewGermany');
    });
});
router.get('/actionunivIreland/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    ireland.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewIreland');
    });
});
router.get('/actionunivNz/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    nz.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewNz');
    });
});
router.get('/actionunivUk/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    uk.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewUk');
    });
});
router.get('/actionunivSpain/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    spain.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewSpain');
    });
});
router.get('/actionunivDubai/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    dubai.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewDubai');
    });
});
router.get('/actionunivSingapore/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    singapore.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewSingapore');
    });
});
router.get('/actionunivNetherlands/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    netherlands.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewNetherlands');
    });
});
router.get('/actionunivSwitzerland/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    switzerland.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewSwitzerland');
    });
});
router.get('/actionunivUsa/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    usa.findById({_id: userId}, function (err, user) {
        name = user.university;
        console.log(name);
        user.remove();
        req.flash('error', 'University ' + name + ' has been Successfully Deleted.');
        res.redirect('/counsellor/viewUsa');
    });
});

router.post('/discussion/:id', counsellorValidate, function (req, res, next) {
    upload(req, res, function (err) {
        var userId = req.params.id;
        var file = false;
        if (err) {
            console.log(err.message);
            req.flash('error', err.message.toString());
            res.redirect('/counsellor/discussion/' + userId);
        }
        else if (fileFilter == true) {
            fileFilter = false;
            req.flash('error', 'Error Uploading Document. Invalid File-Type.');
            res.redirect('/counsellor/discussion/' + userId);
        } else if (fileUpload == true && req.files.attach == null) {
            fileUpload = false;
            req.flash('error', 'Error Uploading Document. Max File-Size Exceeded.');
            res.redirect('/counsellor/discussion/' + userId);
        } else if (req.body.message == '' && req.files.attach == null) {
            req.flash('error', 'Please Enter a Message.');
            res.redirect('/counsellor/discussion/' + userId);
        } else {
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
            users.findOneAndUpdate({_id: userId}, {
                    $push: {
                        "discussion": {
                            text: message,
                            timestamp: Date.now(),
                            _counsellor: true,
                            counsellor: req.session.user._id,
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
                }, function (err, user) {
                    if (err) {
                        console.log(err);
                        req.flash('error', "Database Error, Contact Admin");
                    } else {
                        console.log(user);
                        var mailOptions = {
                            from: 'study@confluenceoverseas.com', // sender address
                            to: user.email, // list of receivers
                            subject: 'New Discussion Message', // Subject line
                            text: '<h2>New Discussion Message</h2>Hello ' + user.first_name +
                            '<br>You have a new message from your counsellor.<br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu ',
                            html: '<h2>New Discussion Message</h2>Hello ' + user.first_name +
                            '<br>You have a new message from your counsellor.<br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu '
                        };
                        if(!user.associate){
                          utils.sendMail(mailOptions);
                          var discussionMsg = constants.msgDiscussionFromCounsellor(user.first_name, user.last_name, req.session.user.first_name, req.session.user.last_name);
                          utils.sendSMS(user.phone.mobile, encodeURI(discussionMsg));
                        }
                        else{
                          associates.findById(user.associate,function(err,associate){
                            var mailOptions = {
                                from: 'study@confluenceoverseas.com', // sender address
                                to: associate.email, // list of receivers
                                subject: 'New Discussion Message', // Subject line
                                text: '<h2>New Discussion Message</h2>Hello Associate' + associate.first_name+
                                '<br>You have a new message from your counsellor, Regarding '+user.first_name+' '+user.last_name+' <br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                                '<br> Thanks And Regards ' +
                                '<br> Confluence Edu ',
                                html: '<h2>New Discussion Message</h2>Hello Associate ' + associate.first_name+
                                '<br>You have a new message from your counsellor,  Regarding '+user.first_name+' '+user.last_name+' <br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                                '<br> Thanks And Regards ' +
                                '<br> Confluence Edu '
                            };
                            utils.sendMail(mailOptions)
                          })


                        }
                    }
                });
            res.redirect('/counsellor/discussion/' + userId);
        }
    });
});


router.get('/discussionAssociates/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    associates.findOne({_id: userId}).populate('discussion.counsellor').exec(function (err, result) {
        if (err) {
            console.log(err);
            req.flash('error', "Internal Database Error.");
            res.redirect('/counsellor/assdiscussion/' + userId);
        }
        else {
            console.log(result);
            res.render('counsellor/assdiscussion', {'userData': result, 'error': req.flash('error'), 'id': req.user});
        }
    });
});

router.post('/discussionAssociates/:id', counsellorValidate, function (req, res, next) {
    upload(req, res, function (err) {
        var userId = req.params.id;
        var file = false;
        if (err) {
            console.log(err.message);
            req.flash('error', err.message.toString());
            res.redirect('/counsellor/discussionAssociates/' + userId);
        }
        else if (fileFilter == true) {
            fileFilter = false;
            req.flash('error', 'Error Uploading Document. Invalid File-Type.');
            res.redirect('/counsellor/discussionAssociates/' + userId);
        } else if (fileUpload == true && req.files.attach == null) {
            fileUpload = false;
            req.flash('error', 'Error Uploading Document. Max File-Size Exceeded.');
            res.redirect('/counsellor/discussionAssociates/' + userId);
        } else if (req.body.message == '' && req.files.attach == null) {
            req.flash('error', 'Please Enter a Message.');
            res.redirect('/counsellor/discussionAssociates/' + userId);
        } else {
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
            associates.update({_id: userId}, {
                    $push: {
                        "discussion": {
                            text: message,
                            timestamp: Date.now(),
                            _counsellor: true,
                            counsellor: req.user,
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
                        req.flash('error', "Database Error, Contact Admin");
                    }
                    else{
                      associates.findById(userId).populate('assignedCounsellor').exec(function(err,associate){
                        var associateMailOptions = {
                            from: 'study@confluenceoverseas.com', // sender address
                            to: associate.email, // list of receivers
                            subject: 'New Discussion Message', // Subject line
                            text: '<h2>New Discussion Message</h2>Hello ' + associate.first_name +
                            '<br>You have a new message from your Counsellor '+ associate.assignedCounsellor.first_name +'.<br>Message Preview : '+ message+'<br> Please login to you account and check the message'+
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu ',
                            html: '<h2>New Discussion Message</h2>Hello ' + associate.first_name +
                            '<br>You have a new message from your Counsellor '+associate.assignedCounsellor.first_name +'.<br>Message Preview : '+ message+'<br> Please login to your account and check the message'+
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu '
                        };
                        utils.sendMail(associateMailOptions);
                        var discussionMsg = constants.DiscCounsToAssc(associate.first_name,associate.last_name,associate.assignedCounsellor.first_name,associate.assignedCounsellor.last_name);
                        utils.sendSMS(associate.mobile,encodeURI(discussionMsg));
                      })

                    }
                });
            res.redirect('/counsellor/discussionAssociates/' + userId);
        }
    });
});

router.get('/status/:id', counsellorValidate, function (req, res, next) {
    users.findOne({_id: req.params.id}).populate('assignedCounsellor').exec(function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occurred, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/userStatus/' + req.params.id);
        }
        else {
            counsellors.find(function (err, counsellorsList) {
                tasks.find({user: req.params.id}, function (err, taskList) {
                    res.render('counsellor/userStatus', {
                        'userData': result,
                        'counsellorList': counsellorsList,
                        'taskList': taskList,
                        'error': req.flash('error'),
                        'success': req.flash('success')
                    });
                    console.log(counsellorsList);
                });

            });
            console.log(result);
        }
    });
});

router.post('/leadStatus/:id', counsellorValidate, function (req, res, next) {
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err)
            res.send("Error encountered. Contact Admin if the problem persists.");
        else {
            res.send(result);
        }
    })
});

router.post('/assignedCounsellors/:id', counsellorValidate, function (req, res, next) {
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err)
            res.send("Error encountered. Contact Admin if the problem persists.");
        else {
            res.send(result);
        }
    })
});


router.post('/status/:id', counsellorValidate, function (req, res, next) {
    var counsellor;
    var newcounsellor;
    users.findByIdAndUpdate(req.params.id, {
        $set: {
            assignedCounsellor: req.body.assignedCounsellor,
            lead:{
              Status:req.body.leadStatus,
              Source:req.session.user.first_name
            }
        },
        $push: {
            leadStatus: {
                status: req.body.leadStatus,
                time: moment().format('MMMM Do YYYY, h:mm:ss a')
            }
        }
    }).populate('associate').exec(function (err, user) {
        console.log(user);
        newcounsellor = req.body.assignedCounsellor;
        counsellor = user.assignedCounsellor;
        if (counsellor != newcounsellor) {
            users.findByIdAndUpdate(req.params.id, {
                $push: {
                    counsellorHistory: {
                        counsellor: req.body.assignedCounsellor,
                        time: moment().format('MMMM Do YYYY, h:mm:ss a')
                    }
                }
            }, function (err, oldUser) {
                console.log(err);
                console.log(oldUser);
            });
            tasks.update({
                user: req.params.id
            }, {
                $set: {
                    counsellor: newcounsellor
                }
            }, {multi: true}, function (err, tasks) {
                console.log(err);
                console.log(tasks);
            });
            counsellors.findById(newcounsellor,function(err,updatedCounsellor){
              var mailOptions = {
                  from: 'study@confluenceoverseas.com', // sender address
                  to: user.email, // list of receivers
                  subject: 'Counsellor Changed', // Subject line
                  text: '<h2>Counsellor Changed</h2>Hello ' + user.first_name +
                  '<br>Counsellor for user' + user.first_name + ' ' + user.last_name + ' has been changed' + '.' +
                  '<br> Thanks And Regards ' +
                  '<br> Confluence Edu ',
                  html: '<h2>Counsellor Changed</h2>Hello ' + user.first_name + ' ' + user.last_name +
                  '<br>Thank You for choosing ConfluenceEdu. Counsellor for user ' + user.first_name + ' ' + user.last_name + ' has been changed to ' + ' ' +updatedCounsellor.first_name+" Email: "+updatedCounsellor.email +
                  '<br> Regards, ' +
                  '<br> Thanks And Regards ' +
                  '<br> Confluence Edu '
              };
              var adminMailOptions = {
                  from: 'study@confluenceoverseas.com', // sender address
                  to: 'vs@confluenceedu.com', // list of receivers
                  subject: 'Counsellor Change for user.', // Subject line
                  text: 'Hello Admin,<br>' +
                  'User ' + user.first_name + ' ' + user.last_name +
                  '<br>Counsellor for user' + user.first_name + ' ' + user.last_name + ' has been changed to ' + ' '+updatedCounsellor.first_name,// plaintext body
                  html: 'Hello Admin,<br>' + 'Counsellor for User ' + user.first_name + ' ' +
                  user.last_name + ' Has been changed  to  ' +updatedCounsellor.first_name+
                  '<br> Regards, ' +
                  '<br> Confluence Edu '
              };
              var associateMailOptions = {
                  from: 'study@confluenceoverseas.com', // sender address
                  to: user.associate.email, // list of receivers
                  subject: 'Counsellor Change for user.', // Subject line
                  text: 'Hello Associate,<br>' +
                  'User ' + user.first_name + ' ' + user.last_name +
                  '<br>Counsellor for user' + user.first_name + ' ' + user.last_name + ' has been changed to ' + ' ',// plaintext body
                  html: 'Hello Associate '+user.associate.first_name + ',<br>Counsellor for User ' + user.first_name + ' ' +
                  user.last_name + ' Has been changed to ' +updatedCounsellor.first_name+" Email: "+updatedCounsellor.email+
                  '<br> Regards, ' +
                  '<br> Confluence Edu '
              };
              if(!user.associate){
                utils.sendMail(mailOptions);
              }
              utils.sendMail(adminMailOptions);
              utils.sendMail(associateMailOptions);
            });

        }
        else{
          var mailOptions = {
              from: 'study@confluenceoverseas.com', // sender address
              to: user.email, // list of receivers
              subject: 'Change of status', // Subject line
              text: '<h2>Change of Status</h2>Hello ' + user.first_name +
              '<br>Status of user' + user.first_name + ' ' + user.last_name + ' has been changed' + '.' +
              '<br> Thanks And Regards ' +
              '<br> Confluence Edu ',
              html: '<h2>Change of Status</h2>Hello ' + user.first_name + ' ' + user.last_name +
              '<br>Thank You for choosing ConfluenceEdu. Status of user ' + user.first_name + ' ' + user.last_name + ' has been changed to <b>' +req.body.leadStatus + '</b>.' +
              '<br> Regards, ' +
              '<br> Thanks And Regards ' +
              '<br> Confluence Edu '
          };
          if(user.associate){
            var associateMailOptions = {
                from: 'study@confluenceoverseas.com', // sender address
                to: user.associate.email, // list of receivers
                subject: 'Change of status', // Subject line
                text: '<h2>Change of Status</h2>Hello ' + user.first_name +
                '<br>Status of user' + user.first_name + ' ' + user.last_name + ' has been changed' + '.' +
                '<br> Thanks And Regards ' +
                '<br> Confluence Edu ',
                html: '<h2>Change of Status</h2>Hello ' + 'Associate '  + user.associate.first_name +
                '<br>Thank You for choosing ConfluenceEdu. Status of user ' + user.first_name + ' ' + user.last_name + ' has been changed to <b>' +req.body.leadStatus + '</b>.' +
                '<br> Regards, ' +
                '<br> Thanks And Regards ' +
                '<br> Confluence Edu '
            };
            var statusAssociateMsg = constants.statusAssociateMsg(user.associate.first_name,user.first_name,req.body.leadStatus)
            utils.sendSMS(user.associate.mobile,encodeURI(statusAssociateMsg))
          }

          utils.sendMail(associateMailOptions);
          if(!user.associate){
            utils.sendMail(mailOptions);
            var statusStudentMsg = constants.statusStudentMsg(user.first_name,req.body.leadStatus);
            utils.sendSMS(user.phone.mobile,encodeURI(statusStudentMsg))
          }


        }
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/status/' + req.params.id);
        }
        else {
            req.flash('success', "Updated Successfully");
            res.redirect('/counsellor/status/' + req.params.id);
        }
    })
});

router.post('/createtask/:id', counsellorValidate, function (req, res, next) {
    var task = new tasks({
        followupDate: req.body.followupDate,
        followupDetails: req.body.followupDetails,
        description: req.body.description,
        user: req.params.id,
        counsellor: req.user
    });
    task.save(function (err, task) {
        if (err) {
            console.log(err);
            req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
            res.redirect('/counsellor/status/' + req.params.id);
        }
        else {
            res.redirect('/counsellor/status/' + req.params.id);
        }
    });
});

router.get('/actiontask/:id/:taskId/:var', counsellorValidate, function (req, res, next) {
    var status = "Open";
    if (req.params.var === "1") {
        status = "Cancelled"
    } else if (req.params.var === "2") {
        status = "Completed"
    }

    tasks.findByIdAndUpdate(req.params.taskId, {
        $set: {
            actionDate: Date.now(),
            status: status
        }
    }, function (err, task) {
        console.log(task);
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/taskboard');
        }
        else {
            req.flash('success', "Task Created Successfully");
            res.redirect('/counsellor/taskboard');
        }

    });
});

router.get('/payment/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/payment/' + req.params.id);
        }
        else {
            console.log(result);
            fees.find({user: req.params.id}, function (err, fees) {
                if (err) {
                    req.flash("error", " Internal Error Has Occured, Please contact admin");
                    console.log(err);
                    res.redirect('/counsellor/payment/' + req.params.id);
                } else {
                    users.find({_id:req.params.id}, function (err, paymentData) {
                        res.render('counsellor/payment', {
                            fees: fees, 'paymentData': paymentData, 'userData': result, 'error': req.flash('error'),
                            'success': req.flash('success')
                        });
                    })
                }
            })

        }
    })
})

router.post('/payment/:id', counsellorValidate, function (req, res, next) {
    console.log(req.params.id);
    fees.findByIdAndUpdate(req.body.feeType, {
        $inc: {paidAmount: req.body.paymentAmount}
    }, function (err, fees) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log("printing from here" + err);
            res.redirect('/counsellor/payment/' + req.params.id);
        } else {
            users.findByIdAndUpdate(req.params.id, {
                    $push: {
                        payment: {
                            active: true,
                            amount: req.body.paymentAmount,
                            details: req.body.paymentDescription,
                            deadline: req.body.paymentDeadline,
                            feeType: req.body.feeType,
                        }
                    }
                },
                {
                    safe: true,
                    upsert: true,
                    new: true
                },
                function (err, user) {
                    console.log(user);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.redirect('/counsellor/payment/' + req.params.id);
                    }
                    else {
                      var mailOptions = {
                            to: user.email,
                            from: 'study@confluenceoverseas.com',
                            subject: 'Fee payment',
                            text: 'Hello,\n\n' +
                            'Fee payment of INR '+req.body.paymentAmount +' Towards '+req.body.paymentDescription + ' is due on ' +req.body.paymentDeadline+'.',
                            html:'Hello,\n\n' +
                            'Fee payment of INR '+req.body.paymentAmount +' Towards '+req.body.paymentDescription + ' is due on ' +req.body.paymentDeadline+'.'
                        };
                        if(!user.associate){
                          utils.sendMail(mailOptions);
                          var feeMsg= constants.feeMsg(user.first_name,req.body.paymentAmount,req.body.paymentDescription,req.body.paymentDeadline)
                          utils.sendSMS(user.phone.mobile,encodeURI(feeMsg))
                        }
                        req.session.user = user;
                        req.flash('success', "Profile Updated Successfully");
                        res.redirect('/counsellor/payment/' + req.params.id);
                    }
                });
        }
    });

});

router.get('/paymentStatus/:status/:id/:paymentId', counsellorValidate, function (req, res, next) {
    var status = "";
    if (req.params.status === "cash") {
        status = "Paid in Cash"
    } else if (req.params.status === "online") {
        status = "Paid Online"
    }

    console.log(req.params.id);
    users.update({
            _id: req.params.id,
            "payment._id": req.params.paymentId
        },
        {
            $set: {
                "payment.$.status": status,
                "payment.$.paymentDate": Date.now(),
                "payment.$._isComplete": true
            }
        },
        function (err, user) {
            console.log(user);
            if (err) {
                req.flash('error', "Database error occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/payment/' + req.params.id);
            }
            else {
                req.session.user = user;
                req.flash('success', "Payment Mode Updated Successfully");
                res.redirect('/counsellor/payment/' + req.params.id);
            }
        });
});

router.get('/shortlist/:country/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}).populate('usaShortlist.university').exec(function (err, userData) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/shortlist/' + req.params.id);
        }
        else {
            if (req.params.country == "usa") {
                usa.find({}, function (err, univData) {
                    res.render('counsellor/shortlistusa', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                    console.log(univData);
                })
            }
            else if (req.params.country == "canada") {
                canada.find({}, function (err, univData) {
                    res.render('counsellor/shortlistcanada', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "france") {
                france.find({}, function (err, univData) {
                    res.render('counsellor/shortlistfrance', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "italy") {
                italy.find({}, function (err, univData) {
                    res.render('counsellor/shortlistitaly', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "aus") {
                aus.find({}, function (err, univData) {
                    res.render('counsellor/shortlistaus', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "germany") {
                germany.find({}, function (err, univData) {
                    res.render('counsellor/shortlistgermany', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "ireland") {
                ireland.find({}, function (err, univData) {
                    res.render('counsellor/shortlistireland', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "nz") {
                nz.find({}, function (err, univData) {
                    res.render('counsellor/shortlistnz', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "uk") {
                uk.find({}, function (err, univData) {
                    res.render('counsellor/shortlistuk', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "spain") {
                spain.find({}, function (err, univData) {
                    res.render('counsellor/shortlistspain', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "dubai") {
                dubai.find({}, function (err, univData) {
                    res.render('counsellor/shortlistdubai', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "singapore") {
                singapore.find({}, function (err, univData) {
                    res.render('counsellor/shortlistsingapore', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "malaysia") {
                malaysia.find({}, function (err, univData) {
                    res.render('counsellor/shortlistmalaysia', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "netherlands") {
                netherlands.find({}, function (err, univData) {
                    res.render('counsellor/shortlistnetherlands', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
            else if (req.params.country == "switzerland") {
                switzerland.find({}, function (err, univData) {
                    res.render('counsellor/shortlistswitzerland', {
                        'userData': userData,
                        'univData': univData,
                        'error': req.flash('error')
                    });
                })
            }
        }
    })
})

router.get('/shortlisted/:country/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    var query = {};
    console.log(req.query);
    if (req.query.spp)
        query.sppProgram = req.query.spp;
    if (req.query.university)
        query.university = req.query.university;
    if (req.query.department)
        query.department = req.query.department;
    if (req.query.state)
        query.state = req.query.state;
    if (req.query.region)
        query.region = req.query.region;
    if (req.query.coursename)
        query.coursename = req.query.coursename;
    if (req.query.gre)
        query.gre = req.query.gre;
    if (req.query.gmat)
        query.gmat = req.query.gmat;
    if (req.query.toefl)
        query.toefl = req.query.toefl;
    if (req.query.sat)
        query.sat = req.query.sat;
    if (req.query.pte)
        query.pte = req.query.pte;
    if (req.query.ielts)
        query.ielts = req.query.ielts;
    if (req.query.appdeadline)
        query.deadline = req.query.appdeadline;
    if (req.query.coursetype)
        query.type = req.query.coursetype;
    if (req.query.annualFee)
        query.annualFee = req.query.annualFee;
    users.findOne({_id: req.params.id}, function (err, userData) {
        if (req.params.country == "usa") {
            usa.find({}, function (err, univData) {
                usa.find(query, function (err, shortData) {
                    console.log(query);
                    //console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistusa', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistusa', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "nz") {
            nz.find({}, function (err, univData) {
                nz.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistnz', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistnz', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "uk") {
            uk.find({}, function (err, univData) {
                uk.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistuk', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistuk', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }
        if (req.params.country == "spain") {
            spain.find({}, function (err, univData) {
                spain.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistspain', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistspain', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }
        if (req.params.country == "dubai") {
            dubai.find({}, function (err, univData) {
                dubai.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistdubai', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistdubai', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }
        if (req.params.country == "singapore") {
            singapore.find({}, function (err, univData) {
                singapore.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistsingapore', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistsingapore', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }
        if (req.params.country == "malaysia") {
            malaysia.find({}, function (err, univData) {
                malaysia.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistmalaysia', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistmalaysia', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }
        if (req.params.country == "netherlands") {
            netherlands.find({}, function (err, univData) {
                netherlands.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistnetherlands', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistnetherlands', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }
        if (req.params.country == "switzerland") {
            switzerland.find({}, function (err, univData) {
                switzerland.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistswitzerland', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistswitzerland', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "ireland") {
            ireland.find({}, function (err, univData) {
                ireland.find(query, function (err, shortData) {
                    console.log(query);
                    //console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistireland', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistireland', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "germany") {
            germany.find({}, function (err, univData) {
                germany.find(query, function (err, shortData) {
                    console.log(query);
                    //console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistgermany', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistgermany', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "canada") {
            canada.find({}, function (err, univData) {
                canada.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistcanada', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistcanada', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "france") {
            france.find({}, function (err, univData) {
                france.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistfrance', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistfrance', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "italy") {
            italy.find({}, function (err, univData) {
                italy.find(query, function (err, shortData) {
                    console.log(query);
                    console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistitaly', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {
                        res.render('counsellor/shortlistitaly', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        });
                    }
                });
            });
        }

        if (req.params.country == "aus") {
            aus.find({}, function (err, univData) {
                aus.find(query, function (err, shortData) {
                    console.log(query);
                    //console.log(shortData);
                    if (err) {
                        req.flash('error', "Database error occured, Please contact admin");
                        console.log(err);
                        res.render('counsellor/shortlistaus', {
                            'userData': userData,
                            'univData': univData,
                            'error': req.flash('error')
                        });
                    }
                    else {

                        res.render('counsellor/shortlistaus', {
                            'userData': userData,
                            'univData': univData,
                            'shortData': shortData,
                            'error': req.flash('error')
                        })
                    }
                });
            });
        }
    })
})


// router.get('/addshortlistusa/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 usaShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from USA', // Subject line
//                     text: '<h2>Status Change</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
// });

router.get('/reselectshortlist/:country/:id/:univid', counsellorValidate, function (req, res, next) {
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
            console.log(userData[country + "Shortlists"]);
        }
    );
});


router.post('/addshortlist/:country/:id/:univid', counsellorValidate, function (req, res, next) {
    backURL = req.header('Referer');
    console.log("University ID: ", req.params.univid);
    var userId = req.params.id;
    var country = req.params.country;
    var semester = req.body.semester;
    var year = req.body.year;
    var setObj = {};
    setObj[country + "Shortlists"] = {
        university: req.params.univid,
        intake: semester,
        year: year
    };
    mongoose.model(country).findById(req.params.univid, function (err, universityData) {
        if (err) {
            console.log(err);
            req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
            res.redirect(backURL);
        } else {
            users.findByIdAndUpdate(
                userId,
                {
                    $addToSet: setObj
                }, {'new': true}).populate('associate').exec(function (err, userData) {
                    if (err) {
                        console.log(err);
                        req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                        res.redirect(backURL);
                    }
                    else {
                        var mailOptions = {
                            from: 'study@confluenceoverseas.com', // sender address
                            to: userData.email, // list of receivers
                            subject: 'University Shortlisted from ' + country, // Subject line
                            text: '<h2>University Shortlisted</h2>Hello ' + userData.first_name +
                            '<br>Your counsellor has shortlisted the following university for you:' +
                            '<br> University Name :' + universityData.university + '<br>' + 'City :' + universityData.city +
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu ',
                            html: '<h2>University Shortlisted</h2>Hello ' + userData.first_name +
                            '<br>Your counsellor has shortlisted the following university for you:' +
                            '<br> University Name :' + universityData.university + '<br>' + 'City :' + universityData.city +
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu '
                        };
                        if(userData.associate){
                          var associateMailOptions = {
                              from: 'study@confluenceoverseas.com', // sender address
                              to: userData.associate.email, // list of receivers
                              subject: 'University Shortlisted from ' + country, // Subject line
                              text: '<h2>University Shortlisted</h2>Hello Associate' + userData.associate.first_name +
                              '<br>Your student '+ userData.first_name+' '+userData.last_name +'\'s counsellor has shortlisted the following university:' +
                              '<br> University Name :' + universityData.university + '<br>' + 'City :' + universityData.city +
                              '<br> Thanks And Regards ' +
                              '<br> Confluence Edu ',
                              html: '<h2>University Shortlisted</h2>Hello Associate' + userData.associate.first_name +
                              '<br>Your student '+ userData.first_name+' '+userData.last_name +'\'s counsellor has shortlisted the following university:' +
                              '<br> University Name :' + universityData.university + '<br>' + 'City :' + universityData.city +
                              '<br> Thanks And Regards ' +
                              '<br> Confluence Edu '
                          };
                        }
                        // send mail with defined transport object
                        utils.sendMail(associateMailOptions);
                        if(!userData.associate){
                          utils.sendMail(mailOptions);
                          var studShortlist = constants.studShortlist(userData.first_name,universityData.university)
                          utils.sendSMS(userData.phone.mobile,encodeURI(studShortlist));
                        }
                        res.redirect(backURL);
                        console.log(userData[country + "Shortlists"]);
                    }
                });
        }

    });
});

router.get('/removeshortlist/:country/:id/:univid', counsellorValidate, function (req, res, next) {
    backURL = req.header('Referer');
    console.log("University ID: ", req.params.univid);
    var userId = req.params.id;
    var country = req.params.country;

    var pullObj = {};
    pullObj[country + "Shortlists"] = {
        university: req.params.univid
    };
    users.findByIdAndUpdate(
        userId,
        {
            $pull: pullObj
        }, function (err, userData) {
            console.log(userData[country + "Shortlists"]);
        }
    );
    res.redirect(backURL);
});

router.get('/admitted/:country/:status/:id/:univid', counsellorValidate, function (req, res, next) {
    backURL = req.header('Referer');
    console.log("University ID: ", req.params.univid);
    var userId = req.params.id;
    var country = req.params.country;
    var countries = {
      "usa":usa,
      "uk":uk,
      "spain":spain,
      "dubai":dubai,
      "malaysia":malaysia,
      "singapore":singapore,
      "netherlands":netherlands,
      "switzerland":switzerland,
      "france":france,
      "germany":germany,
      "ireland":ireland,
      "italy":italy,
      "nz":nz,
      "aus":aus,
      "canada":canada
    }
    var status = req.params.status;
    var listName = country + "Shortlists.university";
    var queryObj = {_id: userId};
    queryObj[listName] = req.params.univid;
    var setObj = {};
    var admittedObj = {};
    var mailSubject = "";
    if (status === "0") {
        // cancelled admission
        setObj[country + "Shortlists.$.status"] = "Shortlisted";
        admittedObj["_admitted"] = false;
        mailSubject = 'Cancelled admission to university in '+"  " + country;
        var messagebody = 'your application to the following university has been cancelled <br>'
    } else if (status === "1") {
        // admitted
        setObj[country + "Shortlists.$.status"] = "Admitted";
        admittedObj["_admitted"] = true;
        mailSubject = 'Admitted to university in '+"   " + country;
        var messagebody = 'Congratulations for getting into '
    }
    countries[country].findById(req.params.univid, function (err, universityData) {
        if (err) {
            console.log(err);
            req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
            res.redirect(backURL);
        } else {
            users.findByIdAndUpdate(
                userId,
                {
                    $set: admittedObj
                },{'new':true}, function (err, userData) {
                    if (err) {
                        console.log(err);
                        req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                        res.redirect(backURL);
                    }
                    else {
                        users.findOneAndUpdate(queryObj,
                            {
                                $set: setObj
                            }).populate('associate').exec( function (err, userData) {
                                if (err) {
                                    console.log(err);
                                    req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                                    res.redirect(backURL);
                                }
                                else {
                                    var mailOptions = {
                                        from: 'study@confluenceoverseas.com', // sender address
                                        to: userData.email, // list of receivers
                                        subject: mailSubject, // Subject line
                                        text: '<h2>Admitted to University</h2>Hello ' + userData.first_name +
                                        '<br>Thank You for choosing ConfluenceEdu.' +
                                        '<br> Congratulations on getting into ' + universityData.university +
                                        '<br> Thanks And Regards ' +
                                        '<br> Confluence Edu ',
                                        html: '<h2> '+mailSubject+' </h2>Hello ' + userData.first_name +
                                        '<br>Thank You for choosing ConfluenceEdu.<br>' +
                                        messagebody + universityData.university +
                                        '<br> Thanks And Regards ' +
                                        '<br> Confluence Edu ',
                                    };
                                    if(userData.associate){
                                      var associateMailOptions = {
                                          from: 'study@confluenceoverseas.com', // sender address
                                          to: userData.associate.email, // list of receivers
                                          subject: mailSubject, // Subject line
                                          text: '<h2>Admitted to University</h2>Hello Associate,<br>' + userData.first_name +' '+userData.last_name+ ' Has been admitted '+
                                          '<br> Congratulations on getting into ' + universityData.university +
                                          '<br> Thanks And Regards ' +
                                          '<br> Confluence Edu ',
                                          html: '<h2>Admitted to University</h2>Hello Associate,<br>Regarding: ' + userData.first_name +' '+userData.last_name+
                                          '<br>'+messagebody + universityData.university +
                                          '<br> Thanks And Regards ' +
                                          '<br> Confluence Edu '                                      };
                                      utils.sendMail(associateMailOptions)
                                    }
                                    else{
                                      utils.sendMail(mailOptions);

                                    }
                                    // send mail with defined transport object

                                    res.redirect(backURL);
                                    console.log(userData[country + "Shortlists"]);
                                }
                            });
                    }
                }
            );
        }
    });

});


// router.get('/addshortlistitaly/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 italyShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from Italy', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
// });

// router.get('/removeshortlistitaly/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 italyShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.italyShortlists);
//         }
//     );
//     res.redirect(backURL);
// });

router.get('/viewShortlist/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}).populate('usaShortlists.university franceShortlists.university italyShortlists.university ausShortlists.university canadaShortlists.university germanyShortlists.university irelandShortlists.university nzShortlists.university ukShortlists.university spainShortlists.university dubaiShortlists.university malaysiaShortlists.university singaporeShortlists.university netherlandsShortlists.university switzerlandShortlists.university').exec(function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('counsellor/viewShortlist/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewShortlist', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
});

// router.get('/removeshortlistusa/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 usaShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.usaShortlists);
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/addshortlistcanada/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 canadaShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from Canada', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/removeshortlistcanada/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 canadaShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.canadaShortlists);
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/addshortlistaus/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 ausShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from AUS', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.ausShortlists);
//             }
//         }
//     );
// });

// router.get('/removeshortlistaus/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 ausShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.ausShortlists);
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/addshortlistgermany/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     console.log("yes");
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 germanyShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from Germany', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/removeshortlistgermany/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     console.log("yes");
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 germanyShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.germanyShortlists);
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/addshortlistireland/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 irelandShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from Ireland', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/removeshortlistireland/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 irelandShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.irelandShortlists.indexOf(req.params.univid));
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/addshortlistnz/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 nzShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from NZ', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
//     res.redirect(backURL);
// });


// router.get('/removeshortlistnz/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 nzShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.nzShortlists);
//         }
//     );
//     res.redirect(backURL);
// });


// router.get('/addshortlistuk/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $addToSet: {
//                 ukShortlists: {university: req.params.univid},
//             }
//         }, {'new': true}, function (err, userData) {
//             if (err) {
//                 console.log(err);
//                 req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
//                 res.redirect(backURL);
//             }
//             else {
//                 var mailOptions = {
//                     from: 'fly@confluenceedu.com', // sender address
//                     to: userData.email, // list of receivers
//                     subject: 'University Shortlisted from UK', // Subject line
//                     text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu ',
//                     html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + userData.first_name +
//                     '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
//                     '<br> Email :' + userData.email + '<br>' + 'Password :' + userData.password +
//                     '<br> You can login on ' + website +
//                     '<br> Thanks And Regards ' +
//                     '<br> Confluence Edu '
//                 };
//                 // send mail with defined transport object
//                 transporter.sendMail(mailOptions, function (error, info) {
//                     if (error) {
//                         console.log(error);
//                     } else {
//                         console.log('Message sent: ' + info);
//                     }
//                 });
//                 res.redirect(backURL);
//                 console.log(userData.usaShortlists);
//             }
//         }
//     );
//     res.redirect(backURL);
// });

// router.get('/removeshortlistuk/:id/:univid', counsellorValidate, function (req, res, next) {
//     backURL = req.header('Referer');
//     console.log("University ID: ", req.params.univid);
//     var userId = req.params.id;
//     users.findByIdAndUpdate(
//         userId,
//         {
//             $pull: {
//                 ukShortlists: {university: req.params.univid},
//             }
//         }, function (err, userData) {
//             console.log(userData.ukShortlists.indexOf(req.params.univid));
//         }
//     );
//     res.redirect(backURL);
// });

router.post('/request/:id', counsellorValidate, function (req, res, next) {
    users.findByIdAndUpdate(req.params.id, {}, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/request' + req.params.id);
        }
        else {
            req.flash('success', "Status Updated");
            res.redirect('/counsellor/request/' + req.params.id);
        }
    });
});

router.get('/reminder', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");

    users.find({assignedCounsellor: req.user}, function (err, userData) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/reminder');
        }
        else {
            console.log(userData);
            associates.find({assignedCounsellor: req.user}, function (err, associateData) {
                if (err) {
                    req.flash("error", " Internal Error Has Occured, Please contact admin");
                    console.log(err);
                    res.redirect('/counsellor/reminder');
                }
                else {
                    console.log(userData);
                    res.render('counsellor/reminder', {
                        'userData': userData, 'associateData': associateData, 'error': req.flash('error'),
                        'success': req.flash('success')
                    });
                }
            });
        }
    })
})

router.get('/request/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/request/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/request', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/request/:id', counsellorValidate, function (req, res, next) {
    users.findByIdAndUpdate(req.params.id, {
        $set: {
            requests: {
                status: req.body.status
            }
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/request' + req.params.id);
        }
        else {
            req.flash('success', "Status Updated");
            res.redirect('/counsellor/request/' + req.params.id);
        }
    });
});


router.get('/viewAssociates', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    var query = {}
    if(req.query.assignedCounsellor)
      query.assignedCounsellor = req.query.assignedCounsellor
    associates.find(query).populate('assignedCounsellor').exec(function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/viewAssociates/' + result.id);
        }
        else {
            console.log(result);
            counsellors.find({},{first_name:1,last_name:1}).exec(function(err,counsellorList){
              res.render('counsellor/viewAssociates', {
                  'userData': result, 'error': req.flash('error'),
                  'success': req.flash('success'),
                  'counsellorList':counsellorList,
                  'query':req.query
              });
            })

        }
    });
});

router.get('/remove/:id', counsellorValidate, function (req, res, next) {
    var userId = req.params.id;
    var name;
    associates.find({}, function (err, userData) {
        res.render('counsellor/remove', {'userData': userData, "id": userId});
    });
});

router.get('/associatelog/:val/:id', counsellorValidate, function (req, res, next) {
    backURL = req.header('Referer');
    var userId = req.params.id;
    var status = false;
    if (req.params.val < "2") {
        if (req.params.val == "1") {
            status = true;
        }
        else if (req.params.val == "0")
            status = false;
        associates.findByIdAndUpdate(
            userId,
            {
                $set: {
                    logapproved: status,
                }
            }, function (err, userData) {
                console.log(userData);
            });
    }
    else if (req.params.val == "2") {
        var newAssociate = req.body.newAssociate;
        associates.findById(userId, function (err, user) {
            console.log(user);
            associates.findByIdAndUpdate(newAssociate, {
                $push: {
                    usersadded: {
                        $each: user.usersadded
                    }
                }
            }, function (err, userData) {
                console.log(err)
            });
        })
        associates.findById(userId, function (err, user) {
            console.log(user, "i am here");
            var name = user.first_name + " " + user.last_name;
            user.remove();
            req.flash('success', "User" + name + "has been removed.");
        });
    }
    res.redirect('/counsellor/viewAssociates');
});

router.get('/associateDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    associates.findOne({_id: req.params.id}).populate('assignedCounsellor').exec(function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/associateDetails/' + req.params.id);
        }
        else {
            counsellors.find(function (err, counsellorsList) {
                res.render('counsellor/associateDetails', {
                    'userData': result, 'counsellorList': counsellorsList, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
                console.log(counsellorsList);
            })
            console.log(result);
        }
    });
});
router.post('/associateDetails/:id', counsellorValidate, function (req, res, next) {
    associates.findByIdAndUpdate(req.params.id, {
        $set: {
            assignedCounsellor: req.body.assignedCounsellor,
            followupDate: req.body.followupDate,
            followupDetails: req.body.followupDetails,
            institution: req.body.institution,
            pointContact: req.body.pointContact,
            mobile: req.body.mobile,
            designation: req.body.designation,
            dob: req.body.dob,
            description: req.body.description,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            address: {
                city: req.body.city,
                state: req.body.state,
                country: req.body.country,
            }
        }
    }, function (err, user) {
        console.log(user);
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/associateDetails/' + req.params.id);
        }
        else {
            console.log(mongoose.Types.ObjectId(req.params.id),req.params.id,mongoose.Types.ObjectId(req.body.assignedCounsellor),req.body.assignedCounsellor)
            users.update({associate:req.params.id},{$set:{assignedCounsellor:req.body.assignedCounsellor}},{multi:true},function(err,result){
              if(err){
                  req.flash('error',"DB ERROR CONTACT ADMIN");
                  console.log(err);
                  res.redirect('/counsellor/associateDetails/' + req.params.id);
              }
              req.flash('success', "Updated Successfully");
              res.redirect('/counsellor/associateDetails/' + req.params.id);

            });

        }
    });
});
router.get('/userDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/userDetails/' + req.params.id);
        }
        else {
            //console.log(result);
            res.render('counsellor/viewUser', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/userDetails/:id', counsellorValidate, function (req, res, next) {
    console.log("============================================================================================================");
    console.log(req.body);
    users.findByIdAndUpdate(req.params.id, {
        $set: {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone: {
                mobile: req.body.mobile,
                landline: req.body.landline,
                isd: req.body.isd,
                std: req.body.std
            },
            email: req.body.email,
            studentId:req.body.studentId,
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
            },
            lead: {
                Source: req.body.leadSource
            },
            description: req.body.description,
            applyingCountry: req.body.applyingCountry,
            tenth: {
                marks: req.body.tenthpercent
            },
            twelfth: {
                marks: req.body.interpercent
            },
            grad: {
                marks: req.body.gradpercent,
                backlogs: req.body.gradbacklogs
            },
            postgrad: {
                marks: req.body.pgpercent,
                backlogs: req.body.pgbacklogs
            },
            scores: {
                gre: req.body.gre,
                gmat: req.body.gmat,
                ielts: req.body.ielts,
                pte: req.body.pte,
                toefl: req.body.toefl,
                sat: req.body.sat
            }, 
        }
    }, function (err, user) {
        console.log(user);
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/userDetails/' + req.params.id);
        }
        else {
            req.session.user = user;
            req.flash('success', "Profile Updated Successfully");
            res.redirect('/counsellor/userDetails/' + req.params.id);
        }
    });
});


router.post('/userAdd', counsellorValidate, function (req, res, next) {
    var first_name = req.body.first_name;
    var last_name = req.body.last_name;
    var confirm_password = req.body.confirm_password;
    var password = req.body.password;
    var email = req.body.email;
    var counsellor = req.body.counsellor;
    var leadSource = req.body.leadSource;
    if (password.localeCompare(confirm_password) != 0) {
        req.flash('error', 'Passwords do not match. Please Check again.');
        res.redirect('/counsellor/userAdd');
    }
    else {
        users.findOne({'email': email}, function (err, user) {
            if (user != null) {
                req.flash('error', 'E-mail already registered. Please Register using a different E-mail or use Forgot Password for password recovery.');
                res.redirect('/counsellor/userAdd');
            }
            else {
                var phone = req.body.phone;
                // Database Entry
                var user = new users({
                    first_name: first_name,
                    last_name: last_name,
                    email: email,
                    _email: true,
                    assignedCounsellor: counsellor,
                    password: createHash(password),
                    phone: {
                        mobile: phone
                    },
                    lead: {
                        Source: leadSource
                    }
                });
                user.save(function (err, user) {
                    if (err) {
                        console.log(err);
                        req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                        res.redirect('/counsellor/userAdd');
                    }
                    else {
                        req.flash('success', 'User Successfully Added');
                        var mailOptions = {
                            from: 'study@confluenceoverseas.com', // sender address
                            to: email, // list of receivers
                            subject: 'Welcome to ConfluenceEdu', // Subject line
                            text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + first_name +
                            '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
                            '<br> Email :' + req.body.email + '<br>' + 'Password :' + req.body.password +
                            '<br> You can login on' + website +
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu ',
                            html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + first_name +
                            '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
                            '<br> Email :' + req.body.email + '<br>' + 'Password :' + req.body.password +
                            '<br> You can login on ' + website +
                            '<br> Thanks And Regards ' +
                            '<br> Confluence Edu '
                        };
                        var adminMailOptions = {
                            from: 'study@confluenceoverseas.com', // sender address
                            to: 'vs@confluenceedu.com', // list of receivers
                            subject: 'New user Registration.', // Subject line
                            text: 'Hello Admin,<br>' +
                            'New User ' + first_name + ' ' + last_name +
                            ' Has registered with the Email ' + email + '.',// plaintext body
                            html: 'Hello Admin,<br>' + 'New User ' + first_name + ' ' +
                            last_name + ' Has has been added by Counsellor ' + req.session.user.first_name + ' ' + req.session.user.last_name + '.' +
                            '<br> Regards, ' +
                            '<br> Confluence Edu ' // html body
                        };
                        var onboradingMessage = constants.msgOnboardingTemplate(user.first_name, user.last_name, user.email, req.body.password);
                        utils.sendSMS(user.phone.mobile, encodeURI(onboradingMessage));
                        // send mail with defined transport object
                        utils.sendMail(mailOptions);
                        utils.sendMail(adminMailOptions);
                        res.redirect('/counsellor/userAdd');
                    }
                });
            }
        });

    }
});

router.get('/addAssociates', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    counsellors.find({}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            res.render('counsellor/addAssociates', {'error': req.flash('error')});
        }
        else {
            res.render('counsellor/addAssociates', {
                'counsellorData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    });
})


router.post('/addAssociates', counsellorValidate, function (req, res, next) {
    associates.findOne({'email': req.body.email}, function (err, associate) {
        console.log(associate);
        if (associate != null) {
            req.flash('error', 'E-mail already registered. Please Register using a different E-mail or use ForgotWF Password for password recovery.');
            res.redirect('/counsellor/addAssociates');
        }
        else {
            var lstate = true;
            if (!req.body.loginState)
                lstate = false;
            var associate = new associates({
                institution: req.body.institution,
                pointContact: req.body.pointContact,
                mobile: req.body.mobile,
                designation: req.body.designation,
                email: req.body.email,
                assignedCounsellor: req.body.counsellor,
                logapproved: true,
                _email: true
            });
            associate.save(function (err, associate) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Database Error. Please Try again or Contact Admin if it persists.');
                    res.redirect('/counsellor/addAssociates');
                }
                else {
                    counsellors.findById(req.body.counsellor).exec(function(err,counsellorData){
                      console.log(req.body.counsellor)
                      req.flash('success', 'Associate Successfully Added');
                      if (true) {
                          var mailOptions = {
                              from: 'study@confluenceoverseas.com', // sender address
                              to: req.body.email, // list of receivers
                              subject: 'Welcome to ConfluenceEdu', // Subject line
                              text: '<h2>Welcome to ConfluenceEdu</h2>Hello, You can now register as an Associate ' +
                              '<br>You can register on ' + website + 'hub/registerAssociate/' + req.body.email + 'You can also paste the link below in your browser to confirm.<br>' +
                              '<br> with Email : ' + req.body.email +
                              '<br> Thanks And Regards ' +
                              '<br> Confluence Edu ',
                              html: '<h2>Welcome to ConfluenceEdu</h2>Hello , you can now register as an Associate ' +
                              '<br>You can register <a href="' + website + 'hub/registerAssociate/' + req.body.email + '">here.</a>' +
                              '<br> You can also copy the link below to register.<br>' + website + 'hub/registerAssociate/' + req.body.email +
                              '<br> Email :' + req.body.email +
                              '<br> You can login on ' + website + 'hub' +
                              '<br> Thanks And Regards ' +
                              '<br> Confluence Edu '
                          };
                          var adminMailOptions = {
                              from: 'study@confluenceoverseas.com', // sender address
                              to: 'vs@confluenceedu.com', // list of receivers
                              subject: 'New Associate Registration Allowed.', // Subject line
                              text: 'Hello Admin,<br>' +
                              'New Associate has been allowed to register with email ' + req.body.email +
                              '<br>Regards,' +
                              '<br>ConfluenceEdu',// plaintext body
                              html: 'Hello Admin,<br>' +
                              'New Associate '+req.body.institution +' added by:'+counsellorData.first_name +'  '+counsellorData.last_name +' has been allowed to register with email ' + req.body.email +
                              '<br>Regards,' +
                              '<br>ConfluenceEdu', // html body
                          };
                          // send mail with defined transport object
                          utils.sendMail(mailOptions);
                          utils.sendMail(adminMailOptions);
                          var onboardingMsg = constants.msgAssociateOnboardingTemplate(req.body.pointContact, associate.email);
                          utils.sendSMS(req.body.mobile, encodeURI(onboardingMsg));
                      }
                      res.redirect('/counsellor/addAssociates');
                    })
                }
            });
        }
    });

});

router.get('/referredUsers/:id',counsellorValidate,function(req,res,next){
  users.findById(req.params.id).exec(function(err,userData){
    users.find({"referredBy.user":req.params.id},{first_name:1,last_name:1,email:1,phone:1}).exec(function(err,referredUsers){
      res.render('counsellor/referredUsers',{
        'referredUsers':referredUsers,
        'userData':userData
      })
    })
  })
})

router.get('/educationDetails/:id', counsellorValidate, function (req, res, next) {
    users.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/educationDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewEducation', {
                'userData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    });
});


router.post('/educationDetails/:id', counsellorValidate, function (req, res, next) {
    users.update({_id: req.params.id}, {
        $set: {
            tenth: {
                year: req.body.yearTenth,
                school_name: req.body.schoolTenth,
                city: req.body.cityTenth,
                state: req.body.stateTenth,
                board: req.body.boardTenth,
                medium: req.body.medTenth,
                marks: req.body.marksTenth,
                contact1Name: req.body.tenthContact1Name,
                contact1Designation:req.body.tenthContact1Designation,
                contact1Number: req.body.tenthContact1Number,
                contact1Email: req.body.tenthContact1Email,
                contact2Name: req.body.tenthContact2Name,
                contact2Designation:req.body.tenthContact2Designation,
                contact2Number: req.body.tenthContact2Number,
                contact2Email: req.body.tenthContact2Email,
                contact3Name: req.body.tenthContact3Name,
                contact3Designation:req.body.tenthContact3Designation,
                contact3Number: req.body.tenthContact3Number,
                contact3Email: req.body.tenthContact3Email
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
                mode: req.body.modetwelfth,
                contact1Name: req.body.twelfthContact1Name,
                contact1Designation:req.body.twelfthContact1Designation,
                contact1Number: req.body.twelfthContact1Number,
                contact1Email: req.body.twelfthContact1Email,
                contact2Name: req.body.twelfthContact2Name,
                contact2Designation:req.body.twelfthContact2Designation,
                contact2Number: req.body.twelfthContact2Number,
                contact2Email: req.body.twelfthContact2Email,
                contact3Name: req.body.twelfthContact3Name,
                contact3Designation:req.body.twelfthContact3Designation,
                contact3Number: req.body.twelfthContact3Number,
                contact3Email: req.body.twelfthContact3Email
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
                backlogs: req.body.backlogsGrad,
                contact1Name: req.body.gradContact1Name,
                contact1Designation:req.body.gradContact1Designation,
                contact1Number: req.body.gradContact1Number,
                contact1Email: req.body.gradContact1Email,
                contact2Name: req.body.gradContact2Name,
                contact2Designation:req.body.gradContact2Designation,
                contact2Number: req.body.gradContact2Number,
                contact2Email: req.body.gradContact2Email,
                contact3Name: req.body.gradContact3Name,
                contact3Designation:req.body.gradContact3Designation,
                contact3Number: req.body.gradContact3Number,
                contact3Email: req.body.gradContact3Email
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
                backlogs: req.body.backlogsPG,
                contact1Name: req.body.postgradContact1Name,
                contact1Designation:req.body.postgradContact1Designation,
                contact1Number: req.body.postgradContact1Number,
                contact1Email: req.body.postgradContact1Email,
                contact2Name: req.body.postgradContact2Name,
                contact2Designation:req.body.postgradContact2Designation,
                contact2Number: req.body.postgradContact2Number,
                contact2Email: req.body.postgradContact2Email,
                contact3Name: req.body.postgradContact3Name,
                contact3Designation:req.body.postgradContact3Designation,
                contact3Number: req.body.postgradContact3Number,
                contact3Email: req.body.postgradContact3Email
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
            req.flash('error', ' Error Occured, Please Contact Admin');
            res.redirect('/counsellor/educationDetails/' + req.params.id);
        } else {
            req.flash('success', 'Details Updates Successfully');
            users.findOne({_id: req.params.id}, function (err, user) {
                if (err) {
                    req.flas('error', " error occured, Please contact Admin");
                    res.redirect('/counsellor/educationDetails/' + req.params.id);
                }
                else {
                    req.session.user = user;
                    res.redirect('/counsellor/educationDetails/' + req.params.id);
                }
            });
        }
    });
});

router.post('/addUsa', counsellorValidate, function (req, res, next) {
    var univ = new usa({
        university: req.body.university,
        type: req.body.type,
        category: req.body.category,
        course: req.body.coursetype,
        city: req.body.city,
        state: req.body.state,
        usp: req.body.usp,
        campus: req.body.campus,
        department: req.body.dept,
        departmentDeadline: req.body.deptDeadline,
        coursename: req.body.course,
        intake: req.body.intake,
        deadline: req.body.deadline,
        appFee: req.body.appFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.applicationlink,
        },
        deadline: {
            round1: req.body.round1,
            round2: req.body.round2,
            round3: req.body.round3,
            round4: req.body.round4
        },
        applicationdeadline: {
            fallround1: req.body.fallround1,
            fallround2: req.body.fallround2,
            springround1: req.body.springround1,
            springround2: req.body.springround2,
            summerround1: req.body.summerround1
        },
        fundingdeadline: {
            fallround1: req.body.fallRound1,
            springround1: req.body.springRound1,
            summerround1: req.body.summerRound1
        },
        programLink: req.body.programLink,
        scholarshipDeadline: req.body.scholarshipDeadline,
        SFRatio: req.body.SFRatio,
        acceptanceRate: req.body.acceptanceRate,
        gre: req.body.gre,
        gmat: req.body.gmat,
        sat: req.body.sat,
        satSub: req.body.satSub,
        act: req.body.act,
        ielts: req.body.ielts,
        toefl: req.body.toefl,
        percentInBachelor: req.body.percentInBachelor,
        backlogs: req.body.backlogs,
        workExp: req.body.workExp
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addUsa');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicateusa/'+response._id);
        }
    });
});

router.get('/addFrance', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addFrance', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/addFrance', counsellorValidate, function (req, res, next) {
    var univ = new france({
        university: req.body.university,
        coursetype: req.body.coursetype,
        usp: req.body.usp,
        city: req.body.city,
        provision: req.body.provision,
        course: req.body.course,
        department: req.body.department,
        programLink: req.body.programLink,
        intake: req.body.intake,
        deadlines: {
            fall: req.body.fall,
            spring: req.body.spring
        },
        applicationFee: req.body.applicationFee,
        tutionFee: req.body.tutionFee,
        initialFee: req.body.initialFee,
        scholarship: {
            amount: req.body.amount,
            link: req.body.url
        },
        portfolio: req.body.portfolio,
        ielts: req.body.ielts,
        toefl: req.body.toefl
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            console.log(err);
            res.redirect('/counsellor/addFrance');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatefrance/'+response._id);
        }
    });
});

router.get('/addItaly', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addItaly', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/addItaly', counsellorValidate, function (req, res, next) {
    var univ = new italy({
        university: req.body.university,
        coursetype: req.body.coursetype,
        usp: req.body.usp,
        city: req.body.city,
        provision: req.body.provision,
        course: req.body.course,
        department: req.body.department,
        programLink: req.body.programLink,
        intake: req.body.intake,
        deadlines: {
            fall: req.body.fall,
            spring: req.body.spring
        },
        applicationFee: req.body.applicationFee,
        tutionFee: req.body.tutionFee,
        initialFee: req.body.initialFee,
        scholarship: {
            amount: req.body.amount,
            link: req.body.url
        },
        portfolio: req.body.portfolio,
        ielts: req.body.ielts,
        toefl: req.body.toefl
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            console.log(err);
            res.redirect('/counsellor/addItaly');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicateitaly/'+response._id);
        }
    });
});

router.get('/addCanada', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addCanada', {success: req.flash('success'), error: req.flash('error')});
});


router.post('/addCanada', counsellorValidate, function (req, res, next) {
    console.log(req.body.fall)
    var univ = new canada({
        university: req.body.university,
        type: req.body.coursetype,
        spp: req.body.spp,
        sppusp: req.body.sppusp,
        sppProgram: req.body.sppProgram,
        program: req.body.program,
        city: req.body.city,
        province: req.body.province,
        usp: req.body.usp,
        campus: req.body.campus,
        department: req.body.dept,
        departmentDeadline: req.body.deptDeadline,
        sppCollegeName: req.body.sppCollegeName,
        programLink: req.body.programLink,
        intake: req.body.intake,
        deadline: {
            fall: req.body.fall,
            spring: req.body.spring,
            summer: req.body.summer
        },
        appFee: req.body.appFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link,
        },
        scholarshipDeadline: req.body.scholarshipDeadline,
        SFRatio: req.body.SFRatio,
        acceptanceRate: req.body.acceptanceRate,
        gre: req.body.gre,
        gmat: req.body.gmat,
        sat: req.body.sat,
        satSub: req.body.satSub,
        act: req.body.act,
        ielts: req.body.ielts,
        toefl: req.body.toefl,
        percentInBachelor: req.body.percentInBachelor,
        backlogs: req.body.backlogs,
        workExp: req.body.workExp
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            console.log(err);
            res.redirect('/counsellor/addCanada');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatecanada/'+response._id);
        }
    });
});


router.get('/addGermany', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addGermany', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/addGermany', counsellorValidate, function (req, res, next) {
    var univ = new germany({
        university: req.body.university,
        city: req.body.city,
        state: req.body.state,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        visaFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link,
        },
        msc: req.body.msc,
        mba: req.body.mba,
        languages: req.body.languages,
        bachelor: req.body.bachelors,
        prepMaster: req.body.prepMaster,
        prepBachelor: req.body.prepBachelor,
        gre: req.body.gre,
        gmat: req.body.gmat,
        toefl: req.body.toefl,
        ielts: req.body.ielts,
        gate: req.body.gate,
        wIntake: req.body.wIntake,
        programLink: req.body.programLink,
        applicationFee: req.body.applicationFee
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addGermany');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicategermany/'+response._id);
        }
    });
});
router.get('/addUK', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addUK', {success: req.flash('success'), error: req.flash('error')});
});
router.get('/addSpain', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addSpain', {success: req.flash('success'), error: req.flash('error')});
});
router.get('/addDubai', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addDubai', {success: req.flash('success'), error: req.flash('error')});
});
router.get('/addSingapore', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addSingapore', {success: req.flash('success'), error: req.flash('error')});
});
router.get('/addMalaysia', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addMalaysia', {success: req.flash('success'), error: req.flash('error')});
});
router.get('/addNetherlands', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addNetherlands', {success: req.flash('success'), error: req.flash('error')});
});
router.get('/addSwitzerland', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addSwitzerland', {success: req.flash('success'), error: req.flash('error')});
});
router.post('/addUK', counsellorValidate, function (req, res, next) {
    var univ = new uk({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addUK');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicateuk/'+response._id);
        }
    });
});
router.post('/addSpain', counsellorValidate, function (req, res, next) {
    var univ = new spain({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addSpain');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatespain/'+response._id);
        }
    });
});
router.post('/addDubai', counsellorValidate, function (req, res, next) {
    var univ = new dubai({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addDubai');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatedubai/'+response._id);
        }
    });
});
router.post('/addMalaysia', counsellorValidate, function (req, res, next) {
    var univ = new malaysia({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addMalaysia');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatemalaysia/'+response._id);
        }
    });
});
router.post('/addSingapore', counsellorValidate, function (req, res, next) {
    var univ = new singapore({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addSingapore');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatesingapore/'+response._id);
        }
    });
});
router.post('/addNetherlands', counsellorValidate, function (req, res, next) {
    var univ = new netherlands({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addNetherlands');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatenetherlands/'+response._id);
        }
    });
});
router.post('/addSwitzerland', counsellorValidate, function (req, res, next) {
    var univ = new switzerland({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        programLink: req.body.programLink,
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        applicationFee: req.body.applicationFee,
        ielts:req.body.ielts,
        toefl:req.body.toefl,
        pte:req.body.pte

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addSwitzerland');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicateswitzerland/'+response._id);
        }
    });
});
router.get('/addIreland', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addIreland', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/addIreland', counsellorValidate, function (req, res, next) {
    var univ = new ireland({
        university: req.body.university,
        city: req.body.city,
        region: req.body.region,
        usp: req.body.usp,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        casFee: req.body.visaFee,
        annualFee: req.body.annualFee,
        scholarship: {
            amount: req.body.scholarshipAmt,
            url: req.body.link
        },
        type: req.body.type,
        fDeadline: req.body.fDeadline,
        programLink: req.body.programLink,
        applicationFee: req.body.applicationFee

    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addIreland');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicateireland/'+response._id);
        }
    });
});

router.get('/addaus', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addaus', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/addaus', counsellorValidate, function (req, res, next) {
    var univ = new aus({
        university: req.body.university,
        backlogs: req.body.backlogs,
        city: req.body.city,
        state: req.body.state,
        percentage: req.body.percentage,
        region: req.body.region,
        usp: req.body.usp,
        tafe: req.body.tafe,
        coursetype: req.body.coursetype,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        ielts: req.body.ielts,
        applicationFee: req.body.appFee,
        semFee: req.body.semFee,
        toefl: req.body.toefl,
        pte: req.body.pte,
        oshc: req.body.oshc,
        institution: req.body.institution,
        annualFee: req.body.annualFee,
        programLink: req.body.programLink
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addaus');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicateaus/'+response._id);
        }
    });
});


router.get('/addnz', counsellorValidate, function (req, res, next) {
    res.render('counsellor/addnz', {success: req.flash('success'), error: req.flash('error')});
});

router.post('/addnz', counsellorValidate, function (req, res, next) {
    var univ = new nz({
        university: req.body.university,
        city: req.body.city,
        island: req.body.island,
        coursename: req.body.course,
        department: req.body.dept,
        intake: req.body.intake,
        deadline: req.body.deadline,
        applicationFee: req.body.appFee,
        annualFee: req.body.annualFee,
        semFee: req.body.semFee,
        toefl: req.body.toefl,
        ielts: req.body.ielts,
        pte: req.body.pte,
        ptename: req.body.ptename,
        itpname: req.body.itpname,
        itp: req.body.itp,
        type: req.body.coursetype,
        programLink: req.body.programLink
    });
    univ.save(function (err, response) {
        if (err) {
            req.flash('error', "Database error occured, Please Contact Admin");
            res.redirect('/counsellor/addnz');
        }
        else {
            req.flash('success', "Univeristy has been added");
            res.redirect('/counsellor/duplicatenz/'+response._id);
        }
    });
});

router.get('/viewUsa', counsellorValidate, function (req, res, next) {
    usa.find({}, function (err, usaData) {
        res.render('counsellor/viewUsa', {'univData': usaData});
    });
});
router.get('/duplicateusa/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    usa.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/univDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/duplicateusa', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})
router.get('/duplicateuk/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        uk.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicateuk', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatespain/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        spain.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatespain', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatedubai/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        dubai.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatedubai', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatemalaysia/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        malaysia.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatemalaysia', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatesingapore/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        singapore.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatesingapore', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatenetherlands/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        netherlands.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatenetherlands', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicateswitzerland/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        switzerland.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicateswitzerland', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatefrance/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        france.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatefrance', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicategermany/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        germany.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicategermany', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicateireland/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        ireland.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicateireland', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicateitaly/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        italy.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicateitaly', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatenz/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        nz.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatenz', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicateaus/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        aus.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicateaus', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })
router.get('/duplicatecanada/:id', counsellorValidate, function (req, res, next) {
        //console.log(req.params.id+" Id ");
        canada.findOne({_id: req.params.id}, function (err, result) {
            if (err) {
                req.flash("error", " Internal Error Has Occured, Please contact admin");
                console.log(err);
                res.redirect('/counsellor/univDetails/' + req.params.id);
            }
            else {
                console.log(result);
                res.render('counsellor/duplicatecanada', {
                    'univData': result, 'error': req.flash('error'),
                    'success': req.flash('success')
                });
            }
        })
    })

router.get('/UsaDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    usa.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/univDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewUsaUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/UsaDetails/:id', counsellorValidate, function (req, res, next) {
    usa.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            type: req.body.type,
            category: req.body.category,
            course: req.body.coursetype,
            city: req.body.city,
            state: req.body.state,
            usp: req.body.usp,
            campus: req.body.campus,
            department: req.body.dept,
            departmentDeadline: req.body.deptDeadline,
            coursename: req.body.course,
            intake: req.body.intake,
            deadline: req.body.deadline,
            appFee: req.body.appFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link1,
            },
            programLink: req.body.programLink,
            scholarshipDeadline: req.body.scholarshipDeadline,
            SFRatio: req.body.SFRatio,
            acceptanceRate: req.body.acceptanceRate,
            gre: req.body.gre,
            gmat: req.body.gmat,
            sat: req.body.sat,
            satSub: req.body.satSub,
            act: req.body.act,
            ielts: req.body.ielts,
            toefl: req.body.toefl,
            percentInBachelor: req.body.percentInBachelor,
            backlogs: req.body.backlogs,
            workExp: req.body.workExp,
            deadline: {
                round1: req.body.round1,
                round2: req.body.round2,
                round3: req.body.round3,
                round4: req.body.round4
            },
            applicationdeadline: {
                fallround1: req.body.fallround1,
                fallround2: req.body.fallround2,
                springround1: req.body.springround1,
                springround2: req.body.springround2,
                summerround1: req.body.summerround1
            },
            fundingdeadline: {
                fallround1: req.body.fallRound1,
                springround1: req.body.springRound1,
                summerround1: req.body.summerRound1
            }
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            console.log(req.body.round1);
            res.redirect('/counsellor/UsaDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/UsaDetails/' + req.params.id);
        }
    });
});

router.get('/viewFrance', counsellorValidate, function (req, res, next) {
    france.find({}, function (err, usaData) {
        res.render('counsellor/viewFrance', {'univData': usaData});
    });
});

router.get('/FranceDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    france.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/univDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewFranceUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
});


router.post('/FranceDetails/:id', counsellorValidate, function (req, res, next) {
    france.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            coursetype: req.body.coursetype,
            usp: req.body.usp,
            city: req.body.city,
            provision: req.body.provision,
            course: req.body.course,
            department: req.body.department,
            programLink: req.body.programLink,
            intake: req.body.intake,
            deadlines: {
                fall: req.body.fall,
                spring: req.body.spring
            },
            applicationFee: req.body.applicationFee,
            tutionFee: req.body.tutionFee,
            initialFee: req.body.initialFee,
            scholarship: {
                amount: req.body.amount,
                link: req.body.url,
            },
            portfolio: req.body.portfolio,
            ielts: req.body.ielts,
            toefl: req.body.toefl
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/FranceDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/FranceDetails/' + req.params.id);
        }
    });
});


router.get('/viewItaly', counsellorValidate, function (req, res, next) {
    italy.find({}, function (err, usaData) {
        res.render('counsellor/viewItaly', {'univData': usaData});
    });
});

router.get('/ItalyDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    italy.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/univDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewItalyUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
});


router.post('/ItalyDetails/:id', counsellorValidate, function (req, res, next) {
    italy.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            coursetype: req.body.coursetype,
            usp: req.body.usp,
            city: req.body.city,
            provision: req.body.provision,
            course: req.body.course,
            department: req.body.department,
            programLink: req.body.programLink,
            intake: req.body.intake,
            deadlines: {
                fall: req.body.fall,
                spring: req.body.spring
            },
            applicationFee: req.body.applicationFee,
            tutionFee: req.body.tutionFee,
            initialFee: req.body.initialFee,
            scholarship: {
                amount: req.body.amount,
                link: req.body.url,
            },
            portfolio: req.body.portfolio,
            ielts: req.body.ielts,
            toefl: req.body.toefl
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/ItalyDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/ItalyDetails/' + req.params.id);
        }
    });
});

router.get('/viewCanada', counsellorValidate, function (req, res, next) {
    canada.find({}, function (err, usaData) {
        res.render('counsellor/viewCanada', {'univData': usaData});
    });
});

router.get('/CanadaDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    canada.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/univDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewCanadaUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
});

router.post('/CanadaDetails/:id', counsellorValidate, function (req, res, next) {
    canada.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            type: req.body.coursetype,
            spp: req.body.spp,
            sppusp: req.body.sppusp,
            sppProgram: req.body.sppProgram,
            program: req.body.program,
            city: req.body.city,
            province: req.body.province,
            usp: req.body.usp,
            campus: req.body.campus,
            department: req.body.dept,
            departmentDeadline: req.body.deptDeadline,
            programLink: req.body.programLink,
            sppCollegeName: req.body.sppCollegeName,
            intake: req.body.intake,
            deadline: {
                fall: req.body.fall,
                spring: req.body.spring,
                summer: req.body.summer
            },
            appFee: req.body.appFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link,
            },
            scholarshipDeadline: req.body.scholarshipDeadline,
            SFRatio: req.body.SFRatio,
            acceptanceRate: req.body.acceptanceRate,
            gre: req.body.gre,
            gmat: req.body.gmat,
            sat: req.body.sat,
            satSub: req.body.satSub,
            act: req.body.act,
            ielts: req.body.ielts,
            toefl: req.body.toefl,
            percentInBachelor: req.body.percentInBachelor,
            backlogs: req.body.backlogs,
            workExp: req.body.workExp
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/CanadaDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/CanadaDetails/' + req.params.id);
        }
    });
});

router.get('/viewGermany', counsellorValidate, function (req, res, next) {
    germany.find({}, function (err, germanyData) {
        res.render('counsellor/viewGermany', {'univData': germanyData});
    });
});

router.get('/GermanyDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    germany.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/GermanyDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewGermanyUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/GermanyDetails/:id', counsellorValidate, function (req, res, next) {
    germany.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            state: req.body.state,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            visaFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link,
            },
            msc: req.body.msc,
            mba: req.body.mba,
            languages: req.body.languages,
            bachelor: req.body.bachelors,
            prepMaster: req.body.prepMaster,
            prepBachelor: req.body.prepBachelor,
            gre: req.body.gre,
            gmat: req.body.gmat,
            toefl: req.body.toefl,
            ielts: req.body.ielts,
            gate: req.body.gate,
            wIntake: req.body.wIntake,
            programLink: req.body.programLink,
            applicationFee: req.body.applicationFee
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/GermanyDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/GermanyDetails/' + req.params.id);
        }
    });
});

router.get('/viewUk', function (req, res, next) {
    var givenpte=req.query.pte;
    var givenielts=req.query.ielts;
    var giventoefl=req.query.toefl;
    id=[];
         k=0;
        var b = {};
         l=0;
    uk.find({}, function (err, UkData) {
        for(i=0;i<UkData.length;i++)
        {
            var pte=Object.values(UkData[i]._doc)[11];
            var toefl=Object.values(UkData[i]._doc)[12];
            var ielts=Object.values(UkData[i]._doc)[13];
            if(givenielts>=ielts)
            {
                id[k]=Object.values(UkData[i]._id);
                b[k]=UkData[i];
                k=k+1; 
            }
            else if(giventoefl>=toefl)
            {
                id[k]=Object.values(UkData[i]._id);
                b[k]=UkData[i];
                k=k+1;
            }
            else if(givenpte>=pte)
            {
                id[k]=Object.values(UkData[i]._id);
                b[k]=UkData[i];
                k=k+1;
            }  
        }
        for(i=0;i<k-1;i++)
        {
            console.log(b[i]);

        }
        res.render('counsellor/viewUk', {'univData': b});
    });
    
});
router.get('/viewSpain', counsellorValidate, function (req, res, next) {
    spain.find({}, function (err, SpainData) {
        res.render('counsellor/viewSpain', {'univData': SpainData});
    });
});
router.get('/viewDubai', counsellorValidate, function (req, res, next) {
    dubai.find({}, function (err, DubaiData) {
        res.render('counsellor/viewDubai', {'univData': DubaiData});
    });
});
router.get('/viewMalaysia', counsellorValidate, function (req, res, next) {
    malaysia.find({}, function (err, MalayisaData) {
        res.render('counsellor/viewMalaysia', {'univData': MalayisaData});
    });
});
router.get('/viewSingapore', counsellorValidate, function (req, res, next) {
    singapore.find({}, function (err, SingaporeData) {
        res.render('counsellor/viewSingapore', {'univData': SingaporeData});
    });
});
router.get('/viewNetherlands', counsellorValidate, function (req, res, next) {
    netherlands.find({}, function (err, NetherlandsData) {
        res.render('counsellor/viewNetherlands', {'univData': NetherlandsData});
    });
});
router.get('/viewSwitzerland', counsellorValidate, function (req, res, next) {
    switzerland.find({}, function (err, SwitzerlandData) {
        res.render('counsellor/viewSwitzerland', {'univData': SwitzerlandData});
    });
});

router.get('/UkDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    uk.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/UkDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewUkUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/UkDetails/:id', counsellorValidate, function (req, res, next) {
    uk.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/UkDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/UkDetails/' + req.params.id);
        }
    });
});
router.get('/SpainDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    spain.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/SpainDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewSpainUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/SpainDetails/:id', counsellorValidate, function (req, res, next) {
    spain.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/SpainDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/SpainDetails/' + req.params.id);
        }
    });
});
router.get('/DubaiDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    dubai.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/DubaiDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewDubaiUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/DubaiDetails/:id', counsellorValidate, function (req, res, next) {
    dubai.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/DubaiDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/DubaiDetails/' + req.params.id);
        }
    });
});
router.get('/MalaysiaDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    malaysia.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/MalaysiaDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewMalaysiaUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/MalaysiaDetails/:id', counsellorValidate, function (req, res, next) {
    malaysia.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/MalaysiaDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/MalaysiaDetails/' + req.params.id);
        }
    });
});
router.get('/SingaporeDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    singapore.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/SingaporeDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewSingaporeUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/SingaporeDetails/:id', counsellorValidate, function (req, res, next) {
    singapore.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/SingaporeDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/SingaporeDetails/' + req.params.id);
        }
    });
});

router.get('/NetherlandsDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    netherlands.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/NetherlandsDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewNetherlandsUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/NetherlandsDetails/:id', counsellorValidate, function (req, res, next) {
    netherlands.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/NetherlandsDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/NetherlandsDetails/' + req.params.id);
        }
    });
});
router.get('/SwitzerlandDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    switzerland.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/SwitzerlandDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewSwitzerlandUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/SwitzerlandDetails/:id', counsellorValidate, function (req, res, next) {
    switzerland.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            programLink: req.body.programLink,
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.ielts,
            toefl:req.body.toefl,
            pte:req.body.pte
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/SwitzerlandDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/SwitzerlandDetails/' + req.params.id);
        }
    });
});

router.get('/viewIreland', counsellorValidate, function (req, res, next) {
    ireland.find({}, function (err, IrelandData) {
        res.render('counsellor/viewIreland', {'univData': IrelandData});
    });
});

router.get('/IrelandDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    ireland.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/IrelandDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewIrelandUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/IrelandDetails/:id', counsellorValidate, function (req, res, next) {
    ireland.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            casFee: req.body.visaFee,
            annualFee: req.body.annualFee,
            scholarship: {
                amount: req.body.scholarshipAmt,
                url: req.body.link
            },
            type: req.body.type,
            fDeadline: req.body.fDeadline,
            programLink: req.body.programLink,
            applicationFee: req.body.applicationFee
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/IrelandDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/IrelandDetails/' + req.params.id);
        }
    });
});

router.get('/viewAus', counsellorValidate, function (req, res, next) {
    aus.find({}, function (err, AusData) {
        res.render('counsellor/viewAus', {'univData': AusData});
    });
});

router.get('/AusDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    aus.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/AusDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewAusUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/AusDetails/:id', counsellorValidate, function (req, res, next) {
    aus.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            backlogs: req.body.backlogs,
            city: req.body.city,
            state: req.body.state,
            percentage: req.body.percentage,
            region: req.body.region,
            usp: req.body.usp,
            tafe: req.body.tafe,
            coursetype: req.body.coursetype,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            ielts: req.body.ielts,
            applicationFee: req.body.appFee,
            semFee: req.body.semFee,
            toefl: req.body.toefl,
            pte: req.body.pte,
            oshc: req.body.oshc,
            institution: req.body.institution,
            annualFee: req.body.annualFee,
            programLink: req.body.programLink
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/AusDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/AusDetails/' + req.params.id);
        }
    });
});

router.get('/viewNz', counsellorValidate, function (req, res, next) {
    nz.find({}, function (err, NzData) {
        res.render('counsellor/viewNz', {'univData': NzData});
    });
});


router.get('/NzDetails/:id', counsellorValidate, function (req, res, next) {
    //console.log(req.params.id+" Id ");
    nz.findOne({_id: req.params.id}, function (err, result) {
        if (err) {
            req.flash("error", " Internal Error Has Occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/NzDetails/' + req.params.id);
        }
        else {
            console.log(result);
            res.render('counsellor/viewNzUniv', {
                'univData': result, 'error': req.flash('error'),
                'success': req.flash('success')
            });
        }
    })
})

router.post('/NzDetails/:id', counsellorValidate, function (req, res, next) {
    nz.findByIdAndUpdate(req.params.id, {
        $set: {
            university: req.body.university,
            city: req.body.city,
            island: req.body.island,
            coursename: req.body.course,
            department: req.body.dept,
            intake: req.body.intake,
            deadline: req.body.deadline,
            applicationFee: req.body.appFee,
            annualFee: req.body.annualFee,
            semFee: req.body.semFee,
            toefl: req.body.toefl,
            ielts: req.body.ielts,
            pte: req.body.pte,
            itp: req.body.itp,
            type: req.body.coursetype,
            programLink: req.body.programLink
        }
    }, function (err) {
        if (err) {
            req.flash('error', "Database error occured, Please contact admin");
            console.log(err);
            res.redirect('/counsellor/NzDetails/' + req.params.id);
        }
        else {
            console.log(req.params.id);
            req.flash('success', "University Profile Updated Successfully");
            res.redirect('/counsellor/NzDetails/' + req.params.id);
        }
    });
});
router.post("/addUnivPython",function(req,res){
  counsellors.findOne({email:req.body.email},function(err,counsellor){
    console.log(req.body.email,req.body.password);
    if(isValidPassword(counsellor,req.body.password)){
      if(req.body.country=='uk'){
        var univ = new uk({
            university: req.body.UnivData[0],
            city: req.body.UnivData[1],
            region: req.body.region,
            usp: req.body.usp,
            coursename: req.body.UnivData[3],
            department: req.body.UnivData[2],
            intake: req.body.UnivData[6],
            deadline: req.body.deadline,
            casFee: req.body.UnivData[7],
            annualFee: req.body.UnivData[8],
            scholarship: {
                amount: req.body.UnivData[9],
                url: req.body.UnivData[10],
            },
            programLink: req.body.UnivData[4],
            type: req.body.UnivData[5],
            fDeadline: req.body.fDeadline,
            applicationFee: req.body.applicationFee,
            ielts:req.body.UnivData[11],
            toefl:req.body.UnivData[12],
            pte:req.body.UnivData[13],

        });
        univ.save(function (err, response) {
            if (err) {
                res.send('An Error has occured');
            }
            else {
                res.send('University added '+req.body.UnivData[0]+req.body.UnivData[5],);
            }
        });

      }
    }
    else{
      res.send("invalid credentials")
    }
  })
})

var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

function counsellorValidate(req, res, next) {
    counsellors.findById(req.user, function (err, user) {
        if (user != null) {
            req.session.user = user;
            res.locals.counsellor = user;
            next();
        } else {
            res.redirect('/admin');
        }
    });
}

var isValidPassword = function (user, password) {
    return bCrypt.compareSync(password, user.password);
};


module.exports = router;
