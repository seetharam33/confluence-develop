var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var univ = new Schema({
	university :{
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
	visaFee:{
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
	bachelor :{
		type : String,
		default : "",
		required : false
	},
	msc:{
		type : String,
		default: "",
		required: false
	},
	mba:{
		type : String,
		default:"",
		required:false
	},
	languages:{
		type : String,
		default:"",
		required:false
	},
	prepMaster:{
		type: String,
		default:"",
		required:false
	},
	prepBachelor:{
		type : String,
		default:"",
		required:false
	},
	programLink:{
		type:String,
		default:"",
	},
	applicationFee:{
		type:String,
		default:""
	},
	wIntake:{
		type:Number,
		default:""
	},
	ielts:{
		type:Number
	},
	gre:{
		type:Number
	},
	toefl:{
		type:Number
	},
	gmat:{
		type:Number
	},
	gate:{
		type:Number
	}
});
module.exports = mongoose.model('germany', univ);
