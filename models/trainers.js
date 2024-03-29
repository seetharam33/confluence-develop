var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var trainerSchema = new Schema({
	first_name:{ 
		type: String, 
		required: true 
	},
	last_name:{ 
		type: String, 
		required: true 
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
		required: true
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
});
module.exports = mongoose.model('trainers', trainerSchema);
