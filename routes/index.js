var express = require('express');
var router = express.Router();
var passport = require('./auth.js');
var mongoose = require('mongoose');
var bCrypt = require('bcrypt-nodejs');
var flash = require('connect-flash');

var users = mongoose.model('users');

/* GET home page. */
router.get('/', function(req, res, next) {
  	res.redirect('/users');
});

router.post('/userslogin', passport.authenticate('userlogin', {
    successRedirect: '/users/personalEdit',
    failureRedirect: '/users',
    failureFlash:true
}));

router.post('/hublogin', passport.authenticate('associateslogin', {
    successRedirect: '/hub/personalEdit',
    failureRedirect: '/hub',
    failureFlash:true
}));

router.get('/adminlogout', function(req, res) {
	req.logout();
  	req.session.destroy()
	res.redirect('/admin');
});

router.get('/hublogout', function(req, res) {
	req.logout();
  	req.session.destroy()
	res.redirect('/hub');
});

router.get('/logout', function(req, res) {
	req.logout();
  	req.session.destroy()
	res.redirect('/');
});

var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

function userValidate(req,res,next){
	//console.log(req.user);
	users.findById(req.user,function(err, user) {
		if(user!=null){
			req.session.user = user;
			next();
		}
		else {
      		res.redirect('/');
		}
	});
}

module.exports = router;
