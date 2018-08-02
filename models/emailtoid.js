const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IdeaSchema = new Schema({
	email: {
		type: String
	}
})


mongoose.model('emailtoid',IdeaSchema);