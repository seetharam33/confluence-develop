var request = require('request');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');

var transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
        user: 'confluenceindia',
        pass: 'mlnkoushik@123'
    }
});


exports.sendSMS = function(mobileNumber, messageString) {
    var url = 'https://api.textlocal.in/send/?apiKey=MVVnwY9b7zo-sI0jiKD51Qd9WdLsTSbbwxCqHU4ecL&numbers=' + mobileNumber + '&message='+ messageString +'&sender=CEDUSA';
    request({url: url}, function (error, response, body) {
        console.log("discussion: ", url);
        console.log(error, response.body);
    });
};

exports.sendMail = function(mailOptions) {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Mail sent: ' + info);
        }
    });
};
