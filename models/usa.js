var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//IMPORTANT: Renamed ACT as PTE ONLY in frontend for Convinence it is still stored as ACT in Database
//IMPORTANT Renamed Scholarhsip amt to Application link ONLY in frontend for convinience stored as scholarship amount in Database
var univ = new Schema({
	university :{
		type : String,
		default : "",
		required : false
	},
	type :{
		type : String,
		default : "",
		required : false
	},
	category :{
		type : String,
		default : "",
		required : false
	},
	course :{
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
	campus :{
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
	deadline :{
			round1 :{
				type:String,
				default : ""
			},
			round2 :{
				type:String,
				default : ""
			},
			round3 :{
				type:String,
				default : ""
			},
			round4 :{
				type:String,
				default : ""
			}
	},
	fundingdeadline :{
			fallround1 :{
				type:String,
				default : ""
			},
			springround1 :{
				type:String,
				default : ""
			},
			summerround1 : {
				type:String,
				default:""
			}
	},
	applicationdeadline :{
			fallround1 :{
				type:String,
				default : ""
			},
			fallround2 :{
				type:String,
				default : ""
			},
			springround1 :{
				type:String,
				default : ""
			},
			springround2 :{
				type:String,
				default : ""
			},
			summerround1 : {
				type:String,
				default:""
			}
	},
	appFee:{
		type: String,
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
		type : Number,
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
	},
	programLink:{
		type:String
	}
});
module.exports = mongoose.model('usa', univ);
