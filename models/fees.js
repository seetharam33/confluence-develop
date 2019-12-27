var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var adminSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
		required: true
    },
	feeName:{
		type: String, 
		required: true
	},
	feeAmount:{
		type: Number, 
		required: true
	},
	paidAmount: {
        type: Number,
        required: false,
        default: 0
    }
});
module.exports = mongoose.model('fees', adminSchema);
