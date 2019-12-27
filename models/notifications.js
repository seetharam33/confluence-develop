var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var notificationSchema = new Schema({
	counsellor:{ 
		type: Schema.Types.ObjectId,
		ref: 'counsellors',
	},
	timestamp:String,
	text:String,
	_file :{
		type : Boolean,
		default :false
	},
	file : {
		type: String
	},
	orignalfile : {
		type : String
	}
});
module.exports = mongoose.model('notifications', notificationSchema);
