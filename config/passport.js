const GoogleStrategy = require('passport-google-oauth20').Strategy;
const keys = require('./keys');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//Load user model
const User = mongoose.model('users');
const e_id = mongoose.model('emailtoid');

module.exports = function(passport)
{
	passport.use(new LocalStrategy({usernameField:'email'},(email,password,done)=>{
		e_id.findOne({
			email:email
		}).then(eid => {
			if(!eid){
				return done(null,false, {message:'No user found'});
			}
			else
			{
				User.findOne({
					user_id: eid._id 
				})
				.then(user=>{
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
			}

			
		})
	}));

	passport.use(
		new GoogleStrategy({
			clientID:keys.googleClientID,
			clientSecret: keys.googleClientSecret,
			callbackURL: '/auth/google/callback',
			proxy: true
		},(accessToken,refreshToken,profile,done)=>{
			console.log(accessToken);
			console.log(profile);
			
			// const image = profile.photos[0].value.substring(0,profile.photos[0].value.indexOf('?'));

			const newUser = {
				user_id: profile.id,
				name: profile.name.givenName,
				email: profile.emails[0].value
			}

			User.findOne({
				user_id: profile.id
			}).then(user =>{
				if (user) {
					done(null,user);
				}
				else{
					new User(newUser)
					.save()
					.then(user => done(null,user));
				}
			})
		})
		);

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

}