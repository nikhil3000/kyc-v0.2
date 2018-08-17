const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const route = express.Router();
const {ensureAuthenticated} = require('../helper/auth.js');
//Load db model
require('../models/users');
require('../models/emailtoid');
const User = mongoose.model('users');
const e_id = mongoose.model('emailtoid');
//User Login Route
route.get('/login',(req,res)=>{
	res.render('users/login');
});
//User Register Route
route.get('/register',(req,res)=>{
	res.render('users/register');
});
//Login from POST
route.post('/login',(req,res,next)=>{
	passport.authenticate('local',{
		successRedirect: '/ideas',
		failureRedirect: '/users/login',
		failureFlash: true
	})(req,res,next);
});

route.get('/google',passport.authenticate('google',{scope: ['profile','email']}));

route.get('/google/callback', 
	passport.authenticate('google', { failureRedirect: '/users/login' }),
	(req, res)=> {
    // Successful authentication, redirect home.
    res.redirect('/ideas');
});

//Register from post
route.post('/register',(req,res)=> {
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
		e_id.findOne({email:req.body.email})
		.then(user => 
		{
			if(user)
			{
				req.flash('error_msg','Email already registered');
				res.redirect('/users/register');
			}
			else
			{
				const eid = new e_id(
				{	
					email: req.body.email

				});
				var id;

				eid.save()
				.then(newEid=>{
					const newUser = new User(
					{
						user_id: newEid._id,
						name: req.body.name,
						email: req.body.email,
						password: req.body.password,
						role: req.body.accountType
					});

					bcrypt.genSalt(10,(err,salt)=>{
						bcrypt.hash(newUser.password,salt,(err,hash)=>{
							if(err) throw err;
							newUser.password = hash; 
							newUser.save()
							.then(user => {
								console.log(user);
								req.flash('success_msg','You are now registered and can log in');
								res.redirect('/users/login');
							})
							.catch(err=> {
								console.log(err);
								return;
							})
						});
					});
				})
				.catch(err=>{
					console.log(err);
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
	res.render('/users/updatePassword');
})

route.post('/updatePassword',ensureAuthenticated,(req,res)=>{
	if(req.body.oldPassword != req.body.user.password)
	{
	req.flash('error_msg','Incorrect Password');
	res.redirect('/users/updatePassword');
	}
	else if(req.body.newPassword != req.body.newPassword2 )
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
		 User.findOneandUpdate({
		 	user_id:req.user.id
		 },newUser,{upsert:true})
		 .then(user=>{
		 	console.log(user);
		 });
		 
		 // User.findOne({
		 // 	user_id:req.user.id
		 // })
		 // .then(user=>{
		 // 	const newUser = {
		 // 		user_id:req.user.id,
		 // 		name: req.user.name,
		 // 		email:req.user.email
		 // 	}
		 // })
	}
})
module.exports = route;
