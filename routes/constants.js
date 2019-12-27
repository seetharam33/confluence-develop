var compile = require("string-template/compile");

exports.msgOnboardingTemplate = compile("Hello {0} {1} Your login details for ConfluenceEdu.com are Username: {2} Password: {3}");

exports.msgAssociateOnboardingTemplate = compile("Hello {0} You have been registered on ConfluenceEdu.com with Username: {1}. Please check your mail for further proceedings.");

exports.msgDiscussionFromCounsellor = compile("Hello {0} {1}, You have a new message from Counsellor {2} .. Please login to check your messages. Regards,ConfluenceEdu");

exports.msgDiscussionFromStudent = compile("Hello {0} {1}, You have a new message from Student {2} {3}. Please login to check your messages. Regards,ConfluenceEdu");

exports.DiscCounsToAssc = compile("Hello Associate {0} {1}, You have a new message from Counsellor {2} .. Please login to check your messages. Regards,ConfluenceEdu");

exports.statusStudentMsg = compile("Hello {0}, Your status has been changed to {1}, Regards,ConfluenceEdu");

exports.statusAssociateMsg = compile("Hello Associate {0}, Your Student {1} status has been changed to {2}, Regards,ConfluenceEdu")

exports.feeMsg = compile("Hello {0}, Your fee payment of INR {1} towards {2} is due on {3} ,Regards,ConfluenceEdu")

exports.studShortlist = compile("Hello {0}, Your Counsellor has shortlisted the following university {1}")
