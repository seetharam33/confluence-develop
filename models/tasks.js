var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tasksSchema = new Schema({
    followupDate: {
        type: Date,
        default: Date.now
    },
    followupDetails: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    actionDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: "Open"
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    counsellor: {
        type: Schema.Types.ObjectId,
        ref: 'counsellors'
    }
});
module.exports = mongoose.model('tasks', tasksSchema);
