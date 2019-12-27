var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var univ = new Schema({
	university :{
		type : String,
		default : "",
		required : false
	},
	provision :{
		type : String,
		default : "",
		required : false
  },
	usp:String,
  coursetype :{
    type:String,
  },
  city:String,
  course:String,
  programLink:String,
  department:String,
  deadlines:{
    fall:String,
    spring:String
  },
  intake:String,
  applicationFee:Number,
  initialFee:Number,
  portfolio:String,
  tutionFee:Number,
  scholarship:{
    amount :Number,
    link:String
  },
  ielts:Number,
  toefl:Number
});
module.exports = mongoose.model('france', univ);
