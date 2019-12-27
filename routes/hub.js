var express = require('express');
var router = express.Router();
var passport = require('./auth.js');
var mongoose = require('mongoose');
var bCrypt = require('bcrypt-nodejs');
var flash = require('connect-flash');
var multer = require('multer');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var multer = require('multer');
var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');
var sesTransport = require('nodemailer-ses-transport');
var utils = require('./utils');
//models
var users = mongoose.model('users');
var counsellors = mongoose.model('counsellors');
var associates = mongoose.model('associates');
var usa = mongoose.model('usa');
var canada = mongoose.model('canada');
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
//storage parameters
var fileUpload = false;
var fileFilter = false;
var website = 'http://dashboard.confluenceedu.com/'
// create reusable transporter object using SMTP transport
var zip = (a,b) => a.map((x,i) => [x,b[i]]);
var transporter = nodemailer.createTransport(sesTransport({
        accessKeyId: 'AKIAISGRDRTVAFAESMXA',
        secretAccessKey: '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',
        rateLimit: 5
}));

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
   if (file.fieldname == 'attach') {
      cb(null, 'public/files')
    }
  },
  filename: function (req, file, cb) {
    cb(null, req.user  + Date.now() + path.extname(file.originalname))
  }
})

var fileFilter = function(req,file,cb){
	fileUpload = true;
	console.log(file);
	if (true) {
		cb(null,true);
	} else {
		fileFilter = true;
		cb(null,false);
	}

}

var uploads = multer({
	storage:storage,
	fileFilter:fileFilter,
	limits:{
		fileSize: 4096*4096
	}
});


var upload = uploads.fields([{ name: 'attach' }]);

router.get('/', function(req, res, next) {
	res.render('hub/index',{'error':req.flash('error')});
});

router.get('/registerAssociate/:id', function(req, res,next){
	//console.log(req.params.id+" Id ");
	res.render('hub/register',{'id':req.params.id,'error': req.flash('error')});
});

router.post('/registerAssociate/:id', function(req, res, next) {
  //console.log(req.body);
  // POST Request
  var confirm_password = req.body.confirm_password;
  var password = req.body.password;
  var email = req.body.email;
  if(password.localeCompare(confirm_password)!=0){
  	res.redirect('/hub/registerAssociate/');
  	console.log("password");
  }
  else{
  	console.log(email);
  	associates.findOne({'email':email},function(err, user) {
  		if(user){
  			if(user.logapproved){
  				associates.findOneAndUpdate({'email':email},{
	  					$set : {
				    		first_name : req.body.first_name,
				    		last_name : req.body.last_name,
				    		mobile : req.body.mobile,
				    		designation : req.body.designation,
				    		password : createHash(req.body.password)
				    	}
			    	},
			    	function(err,user){
			    		if(err){
			    			console.log(err);
			    			req.flash('Database Error','Please Contact admin to report this error.');
			    		}
			    		else {
			    			console.log("approved");
			    			res.render(	'hub',{'success' : req.flash('success')});
			    		}
			    	}

  				)
		    }
		    else {
		    	req.flash('error','Register/Login Disabled for this user.Contact admin for support.');
  				res.redirect('/hub');
		    }

  		}
  		else{
  			req.flash('error','Incorrect Password. Please Check again.');
  			res.redirect('/hub');
		}
	});
  }
});

router.get('/settings/:id',associateValidate, function(req, res, next){
	res.render('hub/settings',{success:req.flash('success'), error:req.flash('error')});
});



router.post('/settings/:id',associateValidate, function(req,res,next){
	var userId = req.params.id;
	console.log(req.params.id);
	console.log("req.user");
	var change=true;
  	associates.findOne({'_id':req.params.id},function(err,associate){
  		console.log(associate);
  	if(req.body.newpassword.localeCompare(req.body.newconfirm_password)!=0){
		  	console.log("Passwords do not match. Please Check again.");
		  	change=false;
		  	req.flash('error','Passwords do not match. Please Check again.');
  			res.redirect('/hub/settings/'+userId);
  		}
  	else if (!isValidPassword(associate, req.body.password)){
            change=false;
            console.log('Invalid Password');
            req.flash('error','Incorrect Password. Please Check again.');
		  	res.redirect('/hub/settings/'+userId);
    	}
    	console.log(change);
	  	if(change)
			{
				associates.findByIdAndUpdate(
		        userId,
			    {
			    	$set : {
			    		password : createHash(req.body.newpassword)
			    	}
		    	},
		    	function(err,user)
		    	{
		    		if(err)
		    		{
		    			console.log(err);
		    			res.redirect('/hub/settings/'+userId);
		    		}
		  			else {
		  				console.log(user);
		  				req.flash('success','Password changed Successfully');
						res.redirect('/hub/settings/'+userId);
		  			}
		    	}
		    );

		}
  	});
});

router.get('/shortlist/:id',associateValidate, function(req,res,next){
	users.findOne({_id : req.params.id}).populate('usaShortlists.university ausShortlists.university canadaShortlists.university germanyShortlists.university irelandShortlists.university nzShortlists.university ukShortlists.university spainShortlists.university dubaiShortlists.university malaysiaShortlists.university singaporeShortlists.university netherlandsShortlists.university switzerlandShortlists.university').exec(function(err, result){
		if(err){
			console.log(err);
			req.flash('error',"Some internal database error has occured");
			res.redirect('/hub/shortlist');
		}
		else{
			console.log(result);
			res.render('hub/shortlist',{'userData': result,'id':req.user,'error': req.flash('error'),'success' : req.flash('success')});
		}
	});
});
router.get('/declineshortlist/:country/:id/:univid', associateValidate, function (req, res, next) {
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
router.get('/undodecline/:country/:id/:univid', associateValidate, function (req, res, next) {
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


router.get('/personalEdit',associateValidate, function(req,res,next){
	associates.findOne({ _id : req.user},function(err,result){
		if(err){
			console.log(err);
			req.flash('error',"Some internal database error has occured");
			res.redirect('/hub/personalEdit');
		}
		else{
			console.log(result);
			res.render('hub/personalEdit',{'userData': result,'id':req.user,'error': req.flash('error'),'success' : req.flash('success')});
		}
	});
});

router.post('/personalEdit',associateValidate,function(req,res,next){
	associates.findOneAndUpdate({ _id : req.user},{
		$set : {
			first_name 		: req.body.first_name,
			last_name 		: req.body.last_name,
			email 			: req.body.email,
			altEmail 		: req.body.altEmail,
			dob				: req.body.dob,
			maritial 		: req.body.maritial,
			gender 			: req.body.gender,
			address : {
				line1			: req.body.line1,
				line2			: req.body.line2,
				city			: req.body.city,
				state			: req.body.state,
				country			: req.body.country,
				pin				: req.body.pincode
			}
		}
	},
	function(err,result){
		if(err){
			console.log(err);
			req.flash('error',"Database error. If the problem persists contact Admin");
		}
		else
		{
			associates.findOne({_id : req.user},function(err,userData)
			{
			req.flash('success', "Profile Updated Successfully");
			res.render('hub/personalEdit',{'userData': userData,'success':req.flash('Successfully Updated'),'error': req.flash('error'),'id':req.user});
			})
		}
	}
	)
});

router.get('/userAdd', associateValidate, function(req, res,next){
	res.render('hub/addUser',{success : req.flash('success'), error : req.flash('error')});
});

router.post('/userAdd',associateValidate , function(req,res,next){
  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var confirm_password = req.body.confirm_password;
  var password = req.body.password;
  var email = req.body.email;
  if(password.localeCompare(confirm_password)!=0){
  	req.flash('error','Passwords do not match. Please Check again.');
  	res.redirect('/hub/userAdd');
  }
  else{
  	users.findOne({'email':email},function(err, user) {
  		if(user!=null){
  			req.flash('error','E-mail already registered. Please Register using a different E-mail or use Forgot Password for password recovery.');
  			res.redirect('/hub/userAdd');
  		}
  		else{
  		   counsellors.findById(req.session.user.assignedCounsellor.toString(),function (err,counsellor){
           if(err){
             req.flash('error','There has been an internal error please contact admin.');
             res.redirect('/hub/userAdd');
           }
           else{
             var phone = req.body.phone;
     		  // Database Entry
     		  var user = new users({
     		  	first_name:first_name,
     		  	last_name:last_name,
     		  	email:email,
     		  	_email : true,
     		  	password:createHash(password),
     		  	phone:{
     		  		mobile:phone
     		  	},
             associate: req.user,
             assignedCounsellor:counsellor._id,
     		  	_login : false
     		  });
     		  user.save(function(err, user) {
     		  	if (err){
     		  		console.log(err);
     		  		req.flash('error','Database Error. Please Try again or Contact Admin if it persists.');
     		  		res.redirect('/hub/userAdd');
     		  	}
     		  	else{
     		  		req.flash('success','User Successfully Added');
              var mailOptions = {
                  from: 'study@confluenceoverseas.com', // sender address
                  to: email, // list of receivers
                  subject: 'Welcome To ConfluenceEdu', // Subject line
                  text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + first_name +
                  '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
                  '<br> Email :' + req.body.email + '<br>' + 'Password :' + req.body.password +
                  '<br> You can login now' +
                  '<br> Thanks And Regards ' +
                  '<br> Confluence Edu ',
                  html: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + first_name +
                  '<br>Thank You for choosing ConfluenceEdu.We have created an account for you for the following' +
                  '<br> Email :' + req.body.email + '<br>' + 'Password :' + req.body.password +
                  '<br> You can login now ' +
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
                  last_name + ' Has has been added by Associate ' + req.session.user.first_name + ' ' + req.session.user.last_name + ','+' ' +req.session.user.institution +
                  '<br> Regards, ' +
                  '<br> Confluence Edu ' // html body
              };
              var counsMailOptions = {
                  from: 'study@confluenceoverseas.com', // sender address
                  to: counsellor.email, // list of receivers
                  subject: 'New user Registration.', // Subject line
                  text: 'Hello Counsellor,<br>' +
                  'New User ' + first_name + ' ' + last_name +
                  ' Has registered with the Email ' + email + '.',// plaintext body
                  html: 'Hello Counsellor,<br>' + 'New User ' + first_name + ' ' +
                  last_name + ' Has has been added by Associate ' + req.session.user.first_name + ' ' + req.session.user.last_name + ','+' ' +req.session.user.institution +
                  '<br> Regards, ' +
                  '<br> Confluence Edu ' // html body
              };
              //utils.sendMail(adminMailOptions);
              utils.sendMail(counsMailOptions);
     		  		associates.findByIdAndUpdate({_id:req.user},{
     			  			$push : {
     			  				usersadded : user.id
     			  			}
     			  		},
     			  		function(err)
     			  		{
     			  			if(err)
     			  				console.log(err);
     			  		}
     		  		);
     	  			res.redirect('/hub/userAdd');
     		  	}
     		  });
           }
         })
		}
	});

  }
});

router.get('/reminder',associateValidate, function(req, res,next){
	//console.log(req.params.id+" Id ");

	associates.find({}).populate('usersadded').exec(function(err, userData){
		if(err){
			req.flash("error","Some Internal Error Has Occured, Please contact admin");
			console.log(err);
			res.redirect('/hub/reminder');
		}
		else{
			console.log(userData);
			res.render('hub/reminder',{'userData' : userData,'error': req.flash('error'),
				'success' : req.flash('success')});
		}
	})
})

router.get('/users',associateValidate, function(req, res, next) {
	associates.findById({_id : req.user}).populate('usersadded').exec(function(err,user){
		res.render('hub/user',{'userData':user,'error' : req.flash('error')});
	});
});

router.get('/userDetails/:id',associateValidate, function(req, res,next){
	//console.log(req.params.id+" Id ");
	users.findOne({_id : req.params.id}, function(err, result){
		if(err){
			req.flash("error","Some Internal Error Has Occured, Please contact admin");
			console.log(err);
			res.redirect('/hub/userDetails/'+req.params.id);
		}
		else{
			console.log(result);
			res.render('hub/viewUser',{'userData' : result,'error': req.flash('error'),
				'success' : req.flash('success')});
		}
	})
})

router.post('/userDetails/:id', associateValidate, function(req,res,next){
	users.findByIdAndUpdate(req.params.id,{
    $set : {
        first_name : req.body.first_name,
        last_name : req.body.last_name,
        phone : {
          mobile : req.body.mobile,
          landline : req.body.landline,
          isd : req.body.isd,
          std : req.body.std
        },
        email : req.body.email,
        altEmail : req.body.altEmail,
        dob : req.body.dob,
        gender : req.body.gender,
        maritial : req.body.maritial,
        fb : req.body.fb,
        twitter : req.body.twitter,
        linkedIn : req.body.linkedIn,
        skype : req.body.skype,
        blog : req.body.blog,
        address : {
          line1 : req.body.line1,
          line2 : req.body.line2,
          city : req.body.city,
          state : req.body.state,
          country : req.body.country,
          pin : req.body.pincode
        },
        workExp: {
          latestEmp: req.body.latestEmp,
          designation:req.body.designation,
          exp:req.body.exp,
          coreFunction:req.body.coreFunction
        },
        guardian : {
          name : req.body.guardianName,
          occupation : req.body.occupation,
          number : req.body.guardianNumber,
          relation :  req.body.relation
        }
    }
	}, function(err, user){
			console.log(user);
			if(err){
				req.flash('error',"Some database error occured, Please contact admin");
				console.log(err);
				res.redirect('/hub/userDetails/'+req.params.id);
			}
			else{
				req.flash('success', "Profile Updated Successfully");
				res.redirect('/hub/userDetails/' + req.params.id);
			}
	});
});

router.get('/educationDetails/:id', associateValidate , function(req,res,next){
	users.findOne({_id : req.params.id}, function(err, result){
		if(err){
			req.flash("error","Some Internal Error Has Occured, Please contact admin");
			console.log(err);
			res.redirect('hub/educationDetails/'+req.params.id);
		}
		else{
			console.log(result);
			res.render('hub/viewEducation',{'userData' : result,'error': req.flash('error'),
				'success' : req.flash('success')});
		}
	});
});

router.get('/payment/:id',associateValidate, function(req, res,next){
	//console.log(req.params.id+" Id ");
	users.findOne({_id : req.params.id}, function(err, result){
		if(err){
			req.flash("error","Some Internal Error Has Occured, Please contact admin");
			console.log(err);
			res.redirect('/hub/payment/'+req.params.id);
		}
		else{
			console.log(result);
			res.render('hub/payment',{'userData' : result,'error': req.flash('error'),
				'success' : req.flash('success')});
		}
	})
})

router.post('/educationDetails/:id', associateValidate , function(req,res,next){
	users.update({_id : req.params.id},{
    $set:{
        tenth : {
        year		: req.body.yearTenth,
      school_name : req.body.schoolTenth,
      city		: req.body.cityTenth,
      state		: req.body.stateTenth,
      board		: req.body.boardTenth,
      medium		: req.body.medTenth,
      marks		: req.body.marksTenth,
    },
    twelfth : {
      year		: req.body.yeartwelfth,
      school_name : req.body.schooltwelfth,
      city		: req.body.citytwelfth,
      state		: req.body.statetwelfth,
      board		: req.body.boardtwelfth,
      medium		: req.body.medtwelfth,
      marks		: req.body.markstwelfth,
      specialization	: req.body.specializationtwelfth,
      mode 		: req.body.modetwelfth
    },
    grad : {
      year		: req.body.yearGrad,
      school_name : req.body.schoolGrad,
      city		: req.body.cityGrad,
      state		: req.body.stateGrad,
      board		: req.body.boardGrad,
      medium		: req.body.medGrad,
      marks		: req.body.marksGrad,
      specialization	: req.body.specializationGrad,
      mode 		: req.body.modeGrad,
      backlogs:req.body.backlogsGrad
    },
    postgrad : {
      year		: req.body.yearPostgrad,
      school_name : req.body.schoolPostgrad,
      city		: req.body.cityPostgrad,
      state		: req.body.statePostgrad,
      board		: req.body.boardPostgrad,
      medium		: req.body.medPostgrad,
      marks		: req.body.marksPostgrad,
      specialization	: req.body.specializationPostgrad,
      mode 		: req.body.modePostgrad,
      backlogs:req.body.backlogsPG
    },
    scores : {
      gre		: req.body.gre,
      gmat	: req.body.gmat,
      sat 	: req.body.sat,
      ielts	: req.body.ielts,
      toefl	: req.body.toefl,
      pte 	: req.body.pte
    }
    }
  	},function(err){
        if(err){
                console.log(err);
                req.flash('error','Some Error Occured, Please Contact Admin');
                res.redirect('/hub/educationDetails/'+req.params.id);
        }else{
        	req.flash('success','Details Updates Successfully');
			users.findOne({_id : req.params.id}, function(err, user){
				if(err){
					req.flas('error', "Some error occured, Please contact Admin");
					res.redirect('/hub/educationDetails/'+req.params.id);
				}
				else{
					req.session.user =  user;
					res.redirect('/hub/educationDetails/'+req.params.id);
				}
			});
        }
	});
});

router.get('/discussion',associateValidate, function(req,res,next){
	associates.findOne({ _id : req.user } ).populate('discussion.counsellor').exec(function(err,result){
		if(err){
			console.log(err);
			req.flash('error',"Some internal database error has occured");
			res.redirect('/hub/personalEdit');
		}
		else{
			console.log(result);
			//res.send(result);
			res.render('hub/discussion',{'userData': result,'error': req.flash('error')});
		}
	});
});

router.post('/discussion/:id',associateValidate,function(req, res, next) {
	upload(req, res, function (err) {
		var userId = req.params.id;
		var file = false;
		var message = req.body.message;
	    if (err) {
	      console.log(err.message);
	      console.log("here");
	      req.flash('error',err.message.toString());
	      res.redirect('/hub/discussion');
	    }
	    else if(fileFilter==true){
	    	fileFilter = false;
	    	req.flash('error','Error Uploading Document. Invalid File-Type.');
	      	res.redirect('/hub/discussion');
	    }else if(fileUpload==true && req.files.attach==null){
	    	fileUpload = false;
	    	req.flash('error','Error Uploading Document. Max File-Size Exceeded.');
	      	res.redirect('/hub/discussion');
	    }else if(req.body.message == '' && req.files.attach==null){
	    	req.flash('error','Please Enter a Message.');
	      	res.redirect('/hub/discussion');
	    }else {
			var message = req.body.message;
			var originalname,name;
			if (req.files.attach!=null) {
				file = true;
        name = req.files.attach.map(({ filename }) => filename);
        originalname = req.files.attach.map(({ originalname }) => originalname);

			} else {
				originalname=null;
				name=null;
			}
			console.log(file);
			associates.update({_id: userId},{
			  	$push: {
		        	"discussion": {
		        		text: message,
		        		timestamp: Date.now(),
		        		_file : file ,
		        		file : name,
		        		orignalfile : originalname
		        	}
	        	}
			},
		  	{
	        	safe: true,
	        	upsert: true,
	        	new : true
        	},function(err){
		        if(err){
		                console.log(err);
		                req.flash('error',"Database Error, Contact Admin");
		        }
            else{
              associates.findById(userId).populate('assignedCounsellor').exec(function(err,associate){
                var mailOptions = {
                    from: 'study@confluenceoverseas.com', // sender address
                    to: associate.assignedCounsellor.email, // list of receivers
                    subject: 'New Discussion Message', // Subject line
                    text: '<h2>New Discussion Message</h2>Hello ' + associate.assignedCounsellor.first_name +
                    '<br>You have a new message from your Associate '+associate.first_name +'.<br>Message Preview : '+ message+'<br> Please login to you account and check the message'+
                    '<br> Thanks And Regards ' +
                    '<br> Confluence Edu ',
                    html: '<h2>New Discussion Message</h2>Hello ' + associate.assignedCounsellor.first_name +
                    '<br>You have a new message from your Associate '+associate.first_name +'.<br>Message Preview : '+ message+'<br> Please login to you account and check the message'+
                    '<br> Thanks And Regards ' +
                    '<br> Confluence Edu '
                };
                utils.sendMail(mailOptions);
              })
            }
			});
			res.redirect('/hub/discussion');
		}
	});
});


router.get('/shortlist/:id',associateValidate, function(req, res,next){
	//console.log(req.params.id+" Id ");
	users.findOne({_id : req.params.id}).populate('usaShortlists ausShortlists canadaShortlists germanyShortlists irelandShortlists nzShortlists ukShortlists spainShortlists dubaiShortlists malaysiaShortlists singaporeShortlists netherlandsShortlists switzerlandShortlists').exec(function(err, result){
		if(err){
			req.flash("error","Some Internal Error Has Occured, Please contact admin");
			console.log(err);
			res.redirect('/users/shortlist/'+req.params.id);
		}
		else{
			console.log(result);
			res.render('hub/shortlist',{'userData' : result,'error': req.flash('error'),
				'success' : req.flash('success')});
		}
	})
})

router.get('/userdiscussion/:id',associateValidate, function(req,res,next){
	var userId = req.params.id;
	users.findOne({ _id : userId } ).populate('discussion.associate').populate('discussion.counsellor').exec(function(err,result){
		if(err){
			console.log(err);
			req.flash('error',"Some internal database error has occured");
			res.redirect('/hub/userdiscussion/'+userId);
		}
		else{
			console.log(result);
			res.render('hub/userdiscussion',{'userData': result,'error': req.flash('error'),'id':req.user});
		}
	});
});

router.post('/userdiscussion/:id',associateValidate,function(req, res, next) {
	upload(req, res, function (err) {
		var userId = req.params.id;
		var file = false;
	    if (err) {
	      console.log(err.message);
	      req.flash('error',err.message.toString());
	      res.redirect('/hub/userdiscussion/'+userId);
	    }
	    else if(fileFilter==true){
	    	fileFilter = false;
	    	req.flash('error','Error Uploading Document. Invalid File-Type.');
	      	res.redirect('/hub/userdiscussion/'+userId);
	    }else if(fileUpload==true && req.files.attach==null){
	    	fileUpload = false;
	    	req.flash('error','Error Uploading Document. Max File-Size Exceeded.');
	      	res.redirect('/hub/userdiscussion/'+userId);
	    }else if(req.body.message == '' && req.files.attach==null){
	    	req.flash('error','Please Enter a Message.');
	      	res.redirect('/hub/userdiscussion/'+userId);
	    }else {
			var message = req.body.message;
			var originalname,name;
			if (req.files.attach!=null) {
				file = true;
        name = req.files.attach.map(({ filename }) => filename);
        originalname = req.files.attach.map(({ originalname }) => originalname);

			} else {
				originalname=null;
				name=null;
			}
			users.update({_id: userId},{
			  	$push: {
		        	"discussion": {
		        		text: message,
		        		timestamp: Date.now(),
		        		_associate:true,
		        		associate:req.session.user._id,
		        		_file : file ,
		        		file : name,
		        		orignalfile : originalname
		        	}
	        	}
			},
		  	{
	        	safe: true,
	        	upsert: true,
	        	new : true
        	},function(err){
		        if(err){
		                console.log(err);
		                req.flash('error',"Database Error, Contact Admin");
		        }
			});
      users.findById(userId,function(err,user){
        associates.findById(req.session.user._id).populate('assignedCounsellor').exec(function(err,associate){
          var mailOptions = {
              from: 'study@confluenceoverseas.com', // sender address
              to: associate.assignedCounsellor.email, // list of receivers
              subject: 'New Discussion Message', // Subject line
              text: '<h2>New Discussion Message</h2>Hello ' + associate.assignedCounsellor.first_name +
              '<br>You have a new message from your Associate '+associate.first_name +'Regarding Student: '+user.first_name+' '+user.last_name+'.<br>Message Preview : '+ message+'<br> Please login to you account and check the message'+
              '<br> Thanks And Regards ' +
              '<br> Confluence Edu ',
              html: '<h2>New Discussion Message</h2>Hello ' + associate.assignedCounsellor.first_name +
              '<br>You have a new message from your Associate '+associate.first_name +' Regarding Student: '+user.first_name+' '+user.last_name+'.<br>Message Preview : '+ message+'<br> Please login to you account and check the message'+
              '<br> Thanks And Regards ' +
              '<br> Confluence Edu '
          };
          utils.sendMail(mailOptions);
        })
      })
			res.redirect('/hub/userdiscussion/'+userId);
		}
	});
});


router.get('/forgot', function(req, res, next){
	res.render('hub/forgot',{success:req.flash('success'), error:req.flash('error')});
});

router.post('/forgot', function(req, res, next) {
  var email = req.body.email;
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      associates.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/hub/forgot');
        }
        user.resetPasswordToken = token;
        var seconds = 7200;
        user.resetPasswordExpires = moment().add(seconds,'seconds'); // 2 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var mailOptions = {
      from: 'study@confluenceoverseas.com', // sender address
	    to: email, // list of receivers
	    subject: 'Password Reset', // Subject line
	    text: '<h2>Password Reset</h2>Hello '+
	    '<br> You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n'+
	    'Please click on the following link, or paste this into your browser to complete the process:\n\n'+
	    'http://dashboard.confluenceedu.com/hub/reset/' + token + '\n\n',
	    html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n'+
			'<br>Please click on the following link, or paste this into your browser to complete the process:\n\n'+'http://dashboard.confluenceedu.com/hub/reset/' + token + '\n\n'+
				    '<br> Regards, '+
				    '<br> Confluence Edu ' // html body
      };
      utils.sendMail(mailOptions);
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(null, 'done')

    }
  ], function(err) {
  	console.log(err);
    if (err) return next(err);
    res.redirect('/hub/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  associates.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: moment() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/hub/forgot');
    }
    res.render('hub/reset', { user: req.user,'userData':user });
  });
});

router.post('/reset/:token', function(req, res) {
	console.log(req.params.token);
  associates.findOne({ resetPasswordToken: req.params.token }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/hub/forgot');
    }
    else {

    	user.password = createHash(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.save(function(err) {
        console.log(err);
        });
        var mailOptions = {
        from: 'study@confluenceoverseas.com',
        to: user.email,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n',
          html : 'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      	};
      	utils.sendMail(mailOptions);
        req.flash('success', 'Success! Your password has been changed.');

     req.flash('message', 'Success! Your password has been changed.');
     res.redirect('/hub');
    }
    console.log(err);
  });
});

function associateValidate(req,res,next){
	associates.findById(req.user,function(err, user) {
		if(user!=null){
			req.session.user = user;
			res.locals.associate = user;
			next();
		}else{
			res.redirect('/hub');
		}
	});
}

var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

var isValidPassword = function(user, password){
	return bCrypt.compareSync(password, user.password);
}

module.exports = router;
