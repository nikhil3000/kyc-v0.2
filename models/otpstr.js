const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//create schema

const OtpSchema = new Schema({
	id:{
		type: String,
		required: true
	},
	otp:{
		type: String,
		required: true	
	}
});

mongoose.model('otp',OtpSchema);