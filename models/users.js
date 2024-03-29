const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//create schema

const UserSchema = new Schema({
	user_id:{
		type: String
	},
	name:{
		type: String
		// required: true
	},
	email:{
		type: String,
		required: true
	},
	password:{
		type: String,
		required: true
	},
	pvtEncryptedKey:{
		type: String
	},
	role:{
		type:String,
		required: true
	},
	date:{
		type: Date,
		default: Date.now
	}
});

mongoose.model('users',UserSchema);