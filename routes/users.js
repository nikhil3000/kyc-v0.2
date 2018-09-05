const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const crypto = require('crypto');
const route = express.Router();
const {ensureAuthenticated,ensureOfficial,ensureAdmin} = require('../helper/auth.js');
//Load db model
// require('../models/emailtoid');
require('../models/users');
const User = mongoose.model('users');
// const e_id = mongoose.model('emailtoid');
//User Login Route
route.get('/login',(req,res)=>{
	res.render('users/login');
});
//User Register Route
route.get('/register',ensureAdmin,(req,res)=>{
	res.render('users/register');
});
//Login from POST
route.post('/login',(req,res,next)=>{
	
	passport.authenticate('local',{
		successRedirect: '/users/redirect',
		failureRedirect: '/users/login',
		failureFlash: true
	})(req,res,next);
});

route.get('/redirect',ensureAuthenticated,(req,res)=>{
	if(req.user.role == 'cust')
		res.redirect('/ideas/decryptOtp');
	else if(req.user.role == 'official')
		res.redirect('/ideas/add');
	else
		res.redirect('/users/register');
})

//Register from post
route.post('/register',ensureAdmin,(req,res)=> {
	let errors = [];
	
	if(req.body.password != req.body.password2)
	{
		errors.push({text:'Passwords do not match'});
	}
	if(req.body.password.length < 4)
	{
		errors.push({text: 'Password must be atleast 4 characters long'});
	}
	if(errors.length >0)
	{
		res.render('users/register',{
			errors: errors,
			name: req.body.name,
			email: req.body.email
		});
	}
	else
	{
		
		User.findOne({email:req.body.email})
		.then(old_user => 
		{
			if(old_user)
			{
				req.flash('error_msg','Email already registered');
				res.redirect('/users/register');
			}
			else
			{
				const newUser = new User(
					{
						name: req.body.name,
						email: req.body.email,
						password: req.body.password,
						pvtEncryptedKey: '' ,						
						role: 'official'
					});

					bcrypt.genSalt(10,(err,salt)=>{
						bcrypt.hash(newUser.password,salt,(err,hash)=>{
							if(err) throw err; 
							var privateKeyBuff = crypto.randomBytes(32);
							const cipher = crypto.createCipher('aes192', hash);
							let encrypted = cipher.update(privateKeyBuff.toString('hex'), 'utf8', 'hex');
							encrypted += cipher.final('hex');
							console.log(encrypted);
							newUser.password = hash;
							newUser.pvtEncryptedKey = encrypted;
							newUser.save()
							.then(user => {
								console.log(user);
								req.flash('success_msg','Official Registration Successful. Create another account');
								res.redirect('/users/register');
							})
							.catch(err=> {
								console.log(err);
								return;
							})
						});
					});
			}		
		});
	}
});
//logout user
route.get('/logout',(req,res)=>{
	req.logout();
	req.flash('success_msg','You are logged out');
	res.redirect('/users/login');
})

route.get('/updatePassword',ensureAuthenticated,(req,res)=>{
	res.render('users/updatePassword');
})

route.post('/updatePassword',ensureAuthenticated,(req,res)=>{
	if(req.body.newPassword != req.body.newPassword2 )
	{
	req.flash('error_msg','Passwords do not match');
	res.redirect('/users/updatePassword');
	}
	else
	{
		const decipher = crypto.createDecipher('aes192',req.user.password);
		let decryptedKey = decipher.update(req.user.pvtEncryptedKey,'hex','utf-8');
		 decryptedKey += decipher.final('utf-8');
		 const cipher = crypto.createCipher('aes192',req.body.newPassword);
		 let encryptedPrivatekey = cipher.update(decryptedKey,'utf-8','hex');
		 encryptedPrivatekey += cipher.final('hex');

		 var newUser = {
		 	password: req.body.newPassword,
		 	pvtEncryptedKey:encryptedPrivatekey 
		 };
		 
		 User.findOne({
		 	user_id:req.user.user_id
		 })
		 .then(user=>{
		 		user.user_id=req.user.user_id;
		 		user.name= req.user.name;
		 		user.email=req.user.email;
		 		user.password= ' ';
				user.pvtEncryptedKey= encryptedPrivatekey;						
				user.role= req.user.role;


				bcrypt.genSalt(10,(err,salt)=>{
					bcrypt.hash(req.body.newPassword,salt,(err,hash)=>{
						if(err) throw err; 
						user.password = hash;
						user.save()
						.then(user=>{
						req.flash('success_msg','Password updated');
						res.redirect('/ideas');
						})		
					});
				});
				
		 })
	}
})
module.exports = route;
