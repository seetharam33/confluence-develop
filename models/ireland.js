var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var univ = new Schema({
	university :{
		type : String,
		default : "",
		required : false
	},
	region :{
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
	casFee:{
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
	programLink:{
		type:String
	},
	fDeadline:{
		type:String
	},
	type:{
		type:String
	},
	applicationFee:{
		type:String
	}
});
module.exports = mongoose.model('ireland', univ);
