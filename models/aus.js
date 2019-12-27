var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var univ = new Schema({
	university :{
		type : String,
		default : "",
		required : false
	},
	percentage : {
		type : String,
		default : ""
	},
	institution :{
		type : String,
		default : "",
		required : false
	},
	usp :{
		type : String,
		default : "",
		required : false
	},
	state :{
		type : String,
		default : "",
		required : false
	},
	city :{
		type : String,
		default : "",
		required : false
	},
	type:{
		type : String,
		default : "",
		required : false
	},
	tafe :{
		type : String,
		default : "",
		required : false
	},
	department :{
		type : String,
		default : "",
		required : false
	},
	coursename :{
		type : String,
		default : "",
		required : false
	},
	intake :{
		type : String,
		default : "",
		required : false
	},
	deadline:{
		type : String,
		required : false
	},
	applicationFee:{
		type:String,
		default:"",
	},
	coursetype : {
		type : String,
		default: ""
	},
	annualFee:{
		type : String,
		default : "",
		retoefl : false
	},
	semFee:{
		type : String,
		default : "",
		required : false
	},
	ielts:{
		type : Number,
		default : "",
		required : false
	},
	toefl:{
		type : String,
		default : "",
		required : false
	},
	pte:{
		type : String,
		default : "",
		required : false
	},
	oshc:{
		type : String,
		default : "",
		required : false
	},
	backlogs : {
		type : Number,
		default : ""
	},
	percentage : {
		type : String,
		default : ""
	},
	programLink:{
		type:String
	}
});

module.exports = mongoose.model('aus', univ);
