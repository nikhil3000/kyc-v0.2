const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//create schema

const KycVerifiedSchema = new Schema({
	user_id:{
		type: String,
		required: true
	},
	name:{
		type: String,
		required: true	
	},
	address:{
		type: String,
		required: true
	},
	idProof:{
		type: String,
		required: true	
	},
	addressProof:{
		type: String,
		required: true
	},
	date:{
		type: Date,
		default: Date.now
	}
});

mongoose.model('KycVerified',KycVerifiedSchema);