var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var univ = new Schema({
	university :{
		type : String,
		default : "",
		required : false
	},
	type : {
		type : String,
		default : "",
		required : false
	},
	spp : {
		type : String,
		default : "",
		required : false
	},
	sppProgram :{
		type : String,
		default : "",
		required : false
	},
	program : {
		type : String,
		default : "",
		required :false
	},
	province :{
		type : String,
		default : "",
		required : false
	},
	city :{
		type : String,
		default : "",
		required : false
	},
	sppusp :{
		type : String,
		default : "",
		required : false
	},
	usp :{
		type : String,
		default : "",
		required : false
	},
	department :{
		type : String,
		default : "",
		required : false
	},
	departmentDeadline :{
		type : String,
		required : false
	},
	sppCollegeName:{
		type:String,
		default:""
	},
	programLink:{
		type:String,
		default:""
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
		fall :String,
		spring:String,
		summer:String
	},
	appFee:{
		type:String,
		default:"",
		require:false
	},
	annualFee:{
		type : String,
		default : "",
		required : false
	},
	scholarship :{
			amount:{
				type:String,
				default:"",
				required:false
			},
			url:{
				type: String,
				default:"",
				required:false
			}
	},
	scholarshipDeadline :{
		type : String,
		default : "",
		required : false
	},
	SFRatio :{
		type : Number,
		default:"",
		required:false
	},
	acceptanceRate :{
		type : String,
		default : "",
		required : false
	},
	gre :{
		type : Number,
		default : "",
		required : false
	},
	gmat :{
		type : Number,
		default : "",
		required : false
	},
	sat:{
		type: Number,
		default:"",
		required : false
	},
	satSub :{
		type : Number,
		default : "",
		required : false
	},
	act : {
		type : Number,
		default : "",
		required : false
	},
	ielts:{
		type : String,
		default: "",
		required: false
	},
	toefl:{
		type : Number,
		default:"",
		required:false
	},
	backlogs:{
		type : Number,
		default:"",
		required:false
	},
	percentInBachelor:{
		type: String,
		default:"",
		required:false
	},
	workExp :{
		type : String,
		default:"",
		required:false
	}
});
module.exports = mongoose.model('canada', univ);
