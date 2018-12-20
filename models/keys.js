const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//create schema

const KeySchema = new Schema({
	pubKey:{
		type: String,
		required: true
	},
	privateKey:{
		type: String,
		required: true	
	}
});

mongoose.model('sampleKeys',KeySchema);