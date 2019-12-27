var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var swig = require('swig');
var fs = require('fs');
var flash = require('connect-flash');
var expressSession = require('express-session');
var passport = require('passport');
var mongoose = require('mongoose');
var moment = require('moment');
var crypto =  require('crypto');
var async = require('async');


var MongoStore = require('connect-mongo')(expressSession);

mongoose.connect('mongodb://localhost/confluence',{ useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
fs.readdirSync(__dirname + '/models').forEach(function(filename) {
  if (~filename.indexOf('.js')) require(__dirname + '/models/' + filename)
});

var routes = require('./routes/index');
var users = require('./routes/users');
var admin = require('./routes/admin');
var counsellor = require('./routes/counsellor');
var associates = require('./routes/hub');
//var trainer = require('./routes/trainer');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');

app.locals.moment = moment;
app.locals.checkIfExists = function (arr, value, property) {
    var retVal = false;
    arr.forEach(function (obj) {
        if (obj[property].toString() === value) {
            retVal = true
        }
    });
    return retVal;
};

app.locals.getObjectFromArray = function (arr, value, property) {
    var retVal = {};
    arr.forEach(function (obj) {
        if (obj[property].toString() === value) {
            retVal = obj
        }
    });
    return retVal;
};

swig.setDefaults({ locals: { now : function () { return new Date(); } }});

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/users',express.static(path.join(__dirname, 'public')));
app.use('/admin',express.static(path.join(__dirname, 'public')));
app.use('/admin/forgot',express.static(path.join(__dirname, 'public')));
app.use('/admin/reset',express.static(path.join(__dirname, 'public')));
app.use('/admin/reports',express.static(path.join(__dirname, 'public')));
app.use('/admin/counsellor/remove',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/remove',express.static(path.join(__dirname, 'public')));
app.use('/hub',express.static(path.join(__dirname, 'public')));
app.use('/counsellor',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/settings',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/userDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/status',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/actionuser/',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/bulkMessageAssociate',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/AusDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/CanadaDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/GermanyDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/IrelandDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/ItalyDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/NzDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/UkDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/SpainDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/DubaiDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/MalaysiaDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/SingaporeDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/NetherlandsDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/SwitzerlandDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/UsaDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicateusa',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicateuk',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatespain',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatedubai',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatemalaysia',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatesingapore',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatenetherlands',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicateswitzerland',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatefrance',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicategermany',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicateireland',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicateitaly',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatenz',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicateaus',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/duplicatecanada',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/payment',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/request',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/reminder',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist',express.static(path.join(__dirname, 'public')));
app.use('/hub/registerAssociate',express.static(path.join(__dirname, 'public')));
app.use('/hub/associateDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/viewAssociates',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/usa',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/usa',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/france',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/italy',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/nz',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/uk',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/spain',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/dubai',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/malaysia',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/singapore',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/netherlands',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/switzerland',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/canada',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/germany',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/ireland',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlisted/aus',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/aus',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/canada',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/france',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/italy',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/germany',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/ireland',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/nz',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/uk',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/spain',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/dubai',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/malaysia',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/singapore',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/netherlands',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/shortlist/switzerland',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/educationDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/referredUsers',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/associateDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/FranceDetails',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/discussion',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/discussionAssociates',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/viewShortlist',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/notifications',express.static(path.join(__dirname, 'public')));
app.use('/counsellor/fees',express.static(path.join(__dirname, 'public')));
app.use('/hub/register',express.static(path.join(__dirname, 'public')));
app.use('/hub/home',express.static(path.join(__dirname, 'public')));
app.use('/hub/userAdd',express.static(path.join(__dirname, 'public')));
app.use('/hub/users',express.static(path.join(__dirname, 'public')));
app.use('/hub/reminder',express.static(path.join(__dirname, 'public')));
app.use('/hub/userDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/educationDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/AusDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/CanadaDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/GermanyDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/IrelandDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/NzDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/UkDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/SpainDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/DubaiDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/MalaysiaDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/SingaporeDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/NetherlandsDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/SwitzerlandDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/UsaDetails',express.static(path.join(__dirname, 'public')));
app.use('/hub/discussion',express.static(path.join(__dirname, 'public')));
app.use('/hub/shortlist',express.static(path.join(__dirname, 'public')));
app.use('/hub/payment',express.static(path.join(__dirname, 'public')));
app.use('/hub/userdiscussion',express.static(path.join(__dirname, 'public')));
app.use('/hub/settings',express.static(path.join(__dirname, 'public')));
app.use('/hub/reset',express.static(path.join(__dirname, 'public')));
app.use('/users/payment',express.static(path.join(__dirname, 'public')));
app.use('/users/request',express.static(path.join(__dirname, 'public')));
app.use('/users/shortlist',express.static(path.join(__dirname, 'public')));
app.use('/users/settings',express.static(path.join(__dirname, 'public')));
app.use('/users/discussion',express.static(path.join(__dirname, 'public')));
app.use('/users/forgot',express.static(path.join(__dirname, 'public')));
app.use('/users/reset',express.static(path.join(__dirname, 'public')));
app.use('/users/personalEdit',express.static(path.join(__dirname, 'public')));
app.use('/users/referral',express.static(path.join(__dirname, 'public')));
app.use('/users/shortlist/:country/:id',express.static(path.join(__dirname, 'public')));
app.use('/users/notifications',express.static(path.join(__dirname, 'public')));


//app.use('/trainer',express.static(path.join(__dirname, 'public')));
app.use(flash());
var sessionOptions = {
    secret: "hY797S2APCzSkjhgndhgfrFbsngMSd7dy",
    resave : true,
    saveUninitialized : false,
    maxAge: new Date(Date.now() + 3600),
    store: new MongoStore({
        url:"mongodb://localhost/confluence",
        //other advanced options
    })
};

//Initialisation
app.use(expressSession(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);
app.use('/users', users);
app.use('/admin',admin);
app.use('/counsellor', counsellor);
app.use('/hub', associates);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
