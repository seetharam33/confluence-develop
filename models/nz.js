var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var univ = new Schema({
	university :{
		type : String,
		default : "",
		required : false
	},
	itp :{
		type : String,
		default : "",
		required : false
	},
	itpname :{
		type : String,
		default : "",
		required : false
	},
	island :{
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
	annualFee:{
		type : String,
		default : "",
		retoefl : false
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
	ptename:{
		type: String,
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
	programLink:{
		type:String,
		default : ""
	}
});

module.exports = mongoose.model('nz', univ);
