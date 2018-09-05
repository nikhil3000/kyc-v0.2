// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const keys = require('./keys');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//Load user model
const User = mongoose.model('users');
// const e_id = mongoose.model('emailtoid');

module.exports = function(passport)
{
	passport.use(new LocalStrategy({usernameField:'email'},(email,password,done)=>{
		
			User.findOne({
					email:email 
				})
				.then(user=>{
					console.log(user);
					//Match Password
					bcrypt.compare(password,user.password,(err,isMatch)=>{
						if(err) throw err;
						if(isMatch){
							return done(null,user);
						}
						else
						{
							return done(null,false,{message:'Password is incorrect'});
						}
					})			
				})
			
	
	}));

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

}