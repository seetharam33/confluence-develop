var mongoose = require('mongoose');
var Schema =mongoose.Schema;
var associatesSchema = new Schema({
	first_name : {
		type : String,
		default:""
	},
	last_name : {
		type : String,
		default:""
	},
	password:{
		type: String,
		default:""
	},
	institution : {
		type : String,
		default : "",
		required : false
	},
	pointContact : {
		type : String,
		default : "",
		required : false
	},
	address:{
		line1:String,
		line2:String,
		city:String,
		state:String,
		country:String,
		pin:String
	},
	designation : {
		type : String,
		default : "",
		required : false
	},
	gender : {
		type:String,
		default:"",
	},
	dob : {
		type:Date,
		default:""
	},
	mobile : {
		type : Number,
		default : "",
		required : false
	},
	email : {
		type : String,
		default : "",
		required : false
	},
	lastLogin:{
		type:String,
		default:"Never"
	},
	altEmail:{
		type: String,
		unique : false,
		default : ""
	},
	assignedCounsellor: {
			type: Schema.Types.ObjectId,
			ref: 'counsellors'
	},
	_email : {
		type : Boolean,
		default : "false",
	},
	maritial:String,
	institution : {
		type : String,
		default : "",
		required : false
	},
	followupDate: {
		type:String,
		unique: false,
		default : ""
	},
	followupDetails: {
		type:String,
		unique: false,
		default : ""
	},
	description : {
		type : String,
		default : "",
		required : false
	},
	logapproved : {
		type : Boolean,
		default :false
	},
	usersadded: [{
			type: Schema.Types.ObjectId,
			ref: 'users'
	}],
	discussion:[{
		counsellor:{
			type: Schema.Types.ObjectId,
			ref: 'counsellors',
		},
		timestamp:String,
		text:String,
		_counsellor:{
			type:Boolean,
			default:false,
		},
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
	}],
	resetPasswordToken : {
		type : String
	},
	resetPasswordExpires : {
		type : Date
	}
})

module.exports = mongoose.model('associates', associatesSchema);
