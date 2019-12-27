var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var adminSchema = new Schema({
	first_name:{ 
		type: String, 
		required: false 
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
		required: false
	},
	_email:{
		type:Boolean,
		required:true,
		default:false
	}
});
module.exports = mongoose.model('admins', adminSchema);
