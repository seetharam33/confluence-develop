var passport = require('passport'),
    LocalStrategy   = require('passport-local').Strategy;
var mongoose = require('mongoose');
var users = mongoose.model('users');
var bCrypt = require('bcrypt-nodejs');
var flash = require('connect-flash');
var counsellors = mongoose.model('counsellors');
var admins = mongoose.model('admins');
var associates = mongoose.model('associates');
var trainers = mongoose.model('trainers');
var moment = require('moment');
var utils = require('./utils');

// User
passport.serializeUser(function(user, done) {
        console.log('serializing user..');
        done(null, user._id);
});

passport.deserializeUser(function(obj, done) {
  //console.log("deserializing " + obj);
  done(null, obj);
});

passport.use('userlogin',new LocalStrategy(
    function(username, password, done) {
        users.findOneAndUpdate({ 'email' :  username },{
                 $set : {
                        lastLogin : moment().format('MMMM Do YYYY, h:mm:ss a')
                    }
                },
            ).populate('assignedCounsellor').exec(function(err, user) {
                if(user.lastLogin=="Never"){
                  var mailOptions = {
                      from: 'study@confluenceoverseas.com', // sender address
                      to: user.assignedCounsellor.email, // list of receivers
                      subject: 'first time login of user', // Subject line
                      text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + user.first_name +
                      '<br>Your login for ConfluenceEdu has been enabled. You can login or set your password using the forgot password option. ',
                      html: '<h2>First time login</h2>Hello' +
                      '<br>User '+user.first_name+' '+user.last_name+'('+user.email+') Has logged in for the first time.  ' +
                      '<br>Regards<br> ConfluenceEdu '
                  };
                  utils.sendMail(mailOptions);
                }
                console.log(moment().toDate().getTime());
                if (err)
                    return done(err);
                if (!user){
                    return done(null, false, { message: 'Incorrect Username/Password. Please try again.' });
                }
                if (!isValidPassword(user, password)){
                    return done(null, false, { message: 'Incorrect Password. Please try again.' });
                }
                if(!user._email){
                    return done(null, false, { message: 'Please Verify your email to Login.' });
                }
                if(!user._login){
                    return done(null, false, { message: 'Login Disabled for this user.Contact Admin for support.' });
                }
                return done(null, user);
            })

    })
);
passport.use('trainerlogin',new LocalStrategy(
    function(username, password, done) {
        console.log(username+"username");
        trainers.findOne({ 'email' :  username },
            function(err, user) {
                //console.log(username);
                if (err)
                    return done(err);
                if (!user){
                    //console.log('Username '+username+' does not Exist. Pleasr try again.');
                    return done(null, false, { message: 'Incorrect Username/Password. Please try again.' });
                }
                if (!isValidPassword(user, password)){
                    //console.log('Invalid Password');
                    return done(null, false, { message: 'Incorrect Password. Please try again.' });
                }
                if(!user._email){
                    return done(null, false, { message: 'Please Verify your email to Login.' });
                }
                return done(null, user);
            }
        );

    })
);
passport.use('counsellorlogin',new LocalStrategy(
    function(username, password, done) {
        console.log(username+"username");
        counsellors.findOne({ 'email' :  username },
            function(err, user) {
                //console.log(username);
                if (err)
                    return done(err);
                if (!user){
                    //console.log('Username '+username+' does not Exist. Pleasr try again.');
                    return done(null, false, { message: 'Incorrect Username/Password. Please try again.' });
                }
                if (!isValidPassword(user, password)){
                    //console.log('Invalid Password');
                    return done(null, false, { message: 'Incorrect Password. Please try again.' });
                }
                if(!user._email){
                    return done(null, false, { message: 'Please Verify your email to Login.' });
                }
                return done(null, user);
            }
        );

    })
);
passport.use('adminlogin',new LocalStrategy(
    function(username, password, done) {
        console.log(username,password);
        admins.findOne({ 'email' : username },
            function(err, user) {
                console.log(user);
                if (err)
                    return done(err);
                if (!user){
                    console.log('Username '+username+' does not Exist. Pleasr try again.');
                    return done(null, false, { message: 'Incorrect Username/Password. Please try again.' });
                }
                if (!isValidPassword(user, password)){
                    console.log('Invalid Password');
                    return done(null, false, { message: 'Incorrect Password. Please try again.' });
                }
                if(!user._email){
                    return done(null, false, { message: 'Please Verify your email to Login.' });
                }
                return done(null, user);
            }
        );

    })
);

passport.use('associateslogin',new LocalStrategy(
    function(username, password, done) {
        associates.findOneAndUpdate({ 'email' :  username },{
                 $set : {
                        lastLogin : moment().format('MMMM Do YYYY, h:mm:ss a')
                    }
                },
            ).populate('assignedCounsellor').exec(function(err, user) {
              if(user.lastLogin=="Never"){
                var mailOptions = {
                    from: 'study@confluenceoverseas.com', // sender address
                    to: user.assignedCounsellor.email, // list of receivers
                    subject: 'first time login of associate', // Subject line
                    text: '<h2>Welcome to ConfluenceEdu</h2>Hello ' + user.first_name +
                    '<br>Your login for ConfluenceEdu has been enabled. You can login or set your password using the forgot password option. ',
                    html: '<h2>First time login</h2>Hello ' +
                    '<br>Associate of '+user.institution+' : '+user.first_name+' '+user.last_name+'('+user.email+') Has logged in for the first time.  ' +
                    '<br>Regards<br> ConfluenceEdu '
                };
                utils.sendMail(mailOptions);
              }
                if (err)
                    return done(err);
                if (!user){
                    //console.log('Username '+username+' does not Exist. Pleasr try again.');
                    return done(null, false, { message: 'Incorrect Username/Password. Please try again.' });
                }
                if(!user.logapproved){
                    return done(null, false, { message: 'Login Disabled for this user.Contact Admin for support.' });
                }
                if (!isValidPassword(user, password)){
                    //console.log('Invalid Password');
                    return done(null, false, { message: 'Incorrect Password. Please try again.' });
                }
                return done(null, user);
            })

    })
);

var isValidPassword = function(user, password){
	return bCrypt.compareSync(password, user.password);
}

module.exports = passport;
