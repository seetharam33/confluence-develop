var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var counsellorSchema = new Schema({
	first_name:{ 
		type: String, 
		required: true 
	},
	last_name:{ 
		type: String, 
	},
	email:{ 
		type: String, 
		required: true,
		unique: true  
	},
	password:{ 
		type: String, 
		required: true,
	},
	phone:{ 
		type: Number, 
	},
	_email:{
		type:Boolean,
		required:true,
		default:false
	},
	_approved:{
		type:Boolean,
		required:true,
		default:false
	},
	_admin:{
		type:Boolean,
		required:true,
		default:false
	},
	resetPasswordToken : {
		type : String
	},
	resetPasswordExpires : {
		type : Date
	}	
});
module.exports = mongoose.model('counsellors', counsellorSchema);
