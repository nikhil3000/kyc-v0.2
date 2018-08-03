const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const eccrypto = require('eccrypto');
const QRCode = require('qrcode');
var nodemailer = require('nodemailer');
const route = express.Router();
const {ensureAuthenticated} = require('../helper/auth');

var transporter1 = nodemailer.createTransport({
	service:'gmail',

	auth:
	{
		user:'automated.nikhilyadav3000@gmail.com',
		passs: 'nodemailerPassword'
	}
});

var transporter = nodemailer.createTransport(
	'smtps://automated.nikhilyadav3000%40gmail.com:nodemailerPassword@smtp.gmail.com');


//Load model
require('../models/ideas');
const Idea = mongoose.model('ideas');
require('../models/keys');
const Keys = mongoose.model('sampleKeys');
require('../models/otpstr');
const Otp = mongoose.model('otp');

//Add idea
route.get('/add',ensureAuthenticated,(req,res) =>{
	res.render('ideas/add')
});
route.get('/qr',(req,res) =>{
	res.render('ideas/qr')
});

//Edit Idea Form routed when edit button is clicked from list of ideas page
route.get('/edit/:id',ensureAuthenticated,(req,res) =>{
	Idea.findOne({
		_id:req.params.id
	})
	.then(idea => {
		if(idea.user != req.user.id){
			req.flash('error_msg','Not Authorised');
			res.redirect('/ideas');
		}
		else
		{
			res.render('ideas/edit',{
				idea:idea
			});	
		}
		

	});
});

//to display the list of all ideas  
route.get('/',ensureAuthenticated,(req,res)=>{
	Idea.find({user:req.user.id})
	.sort({date:'desc'})
	.then(ideas =>{
		res.render('ideas/index',{
			ideas:ideas
		});
	});
});

route.put('/:id',ensureAuthenticated,(req,res)=>{
	Idea.findOne({
		_id: req.params.id
	})
	.then(idea => {
		idea.title = req.body.title;
		idea.details = req.body.details;

		idea.save()
		.then(idea => {
			req.flash('success_msg','Video idea updated');
			res.redirect('/ideas');
		})
	})
});	

route.delete('/:id',ensureAuthenticated,(req,res)=>{
	Idea.remove({
		_id: req.params.id
	})
	.then(()=>{
		req.flash('success_msg','Video idea removed');
		res.redirect('/ideas');
	})
	.catch((err)=>{
		console.log(err)
	});
});


// Process Form to add data to db when submit button is clicked in add idea page
route.post('/sign',(req,res)=>{
	let errors = [];

	if(!req.body.name)
	{
		errors.push({text:'Please enter a Name'});
	}
	if(!req.body.address)
	{
		errors.push({text:'Please enter an address'});
	}
	if(!req.body.addressProof)
	{
		errors.push({text:'Please enter an Address proof'});
	}
	if(!req.body.identityProof)
	{
		errors.push({text:'Please enter an Identity proof'});
	}
	if(!req.body.key)
	{
		errors.push({text:'Please enter your key to sign the data'});
	}

	if(errors.length > 0)
	{
		res.render('ideas/add',{
			errors:errors,
			name: req.body.name,
			address: req.body.address,
			addressProof: req.body.addressProof,
			identityProof: req.body.identityProof
		});
	} 
	else
	{
		//sign data
		const data = req.body.name + '&' + req.body.address + '&' + req.body.addressProof + '&' + req.body.identityProof;
		var msg = crypto.createHash("sha256").update(data).digest();
		var buff = Buffer.from(req.body.key,'hex');
		eccrypto.sign(buff, msg).then(function(sig) {
			console.log("Signature in DER format:", sig.toString('hex'));
		});

		//encrypt data + public key of verifier + user id
		pubKeyBuff = str2buff(req.body.pubKey);
		eccrypto.encrypt(pubKeyBuff,Buffer(data))
		.then(function(encrypted){
			
			var encpStr = encrypted.iv.toString('hex')+'&'+encrypted.ephemPublicKey.toString('hex')+'&'+encrypted.ciphertext.toString('hex')+'&'+encrypted.mac.toString('hex');
			
			var privateKeyBuff = str2buff(req.body.key);
			var publicKey = eccrypto.getPublic(privateKeyBuff);
			var pubKeyStr = publicKey.toString('hex');
			var id = crypto.createHash("sha256").update(data+Date.now()).digest();
			var idStr = id.toString('hex');
			var QRdata = encpStr + '&' + pubKeyStr + '&' + idStr;
			console.log(QRdata);
			QRCode.toDataURL(QRdata, function (err, url) {
				res.send('<img src="' + url + '" />')
			})
		})
		.catch(function(err){
			console.log('encryption failed');
			console.log(err);
		})


		// eccrypto.sign(privateKey,msg)
		// .then(function(sig){
		// 	console.log(sig);
		// 	var str = sig.toString('hex');
		// 	console.log(str);
		// 	var a= [];
		// 	for (var i = 0, len = str.length; i < len; i+=2) {
		// 		a.push(str.substr(i,2));
		// 		}
		// 	console.log(a);

		// 	for (var i=0;i<a.length;i++)
		// 		a[i] = parseInt(a[i], 16);
		// 	const buff = Buffer.from(a);
		// 	console.log(buff);
		// })
		
		// generate qr code with encrypted data




		//create and image for qr code and generate a pdf with it



		//send email
		// res.send('hello');
	}
});

//get qr from form as string and seperate data values
route.post('/generateotp',(req,res)=>{
	var arr = delimit(req.body.qr);
	var otpstr= {iv: str2buff(arr[0]), ephemPublicKey:str2buff(arr[1]), ciphertext:str2buff(arr[2]), mac:str2buff(arr[3])};
	var randstr=crypto.randomBytes(4);
	console.log(randstr);
			const newOtp ={
			user: arr[5],
			randstr: randstr
			//details: req.body.details,
			
		}
		new Otp(newOtp)
		.save()
		.then(otp => {
			//req.flash('success_msg','Video idea added');f
			//es.redirect('./ideas');
			console.log('random otp string saved with user id in db');
		})
	//pkuser will be available from blockchain
	var pkuser='049cda8845e03d4e9b43f014dff653350621d75b9669357f67abb2a70973d0e6e0ac456553c4beb7e5c0e97da48d4a5cdedbd4d5218cc4eae918fc7a3e0b473526';
	var pkuserbuff=str2buff(pkuser);
	eccrypto.encrypt(pkuserbuff, randstr).then(function(encrypted) {
		console.log("otp message encypted");
		console.log(encrypted);
		var encpStr = encrypted.iv.toString('hex')+'&'+encrypted.ephemPublicKey.toString('hex')+'&'+encrypted.ciphertext.toString('hex')+'&'+encrypted.mac.toString('hex');
		console.log(encpStr);
		
		var mailOptions ={
			from: 'automated.nikhilyadav3000@gmail.com',
			to: 'nikhilyadav3000@gmail.com',
			subject : 'Sending email using nodejs',
			text: encpStr
		};
		
		transporter.sendMail(mailOptions,function(err,info){
			if(err)
				console.log(err);
			console.log(info);

		});

	})
	.catch(err=>{
		console.log(err);
	})
});

route.get('/decryptData',(req,res)=>
{
	res.render('ideas/decrypt');
})

route.post('/decryptOtp',(req,res)=>{
	var key = req.body.key;
	var arr = delimit(req.body.encpData);
	var encpOTP = {iv: str2buff(arr[0]), ephemPublicKey:str2buff(arr[1]), ciphertext:str2buff(arr[2]), mac:str2buff(arr[3])};
	key = str2buff(key);
	eccrypto.decrypt(key,encpOTP).then(plaintext=>{
		console.log('plain text');
		console.log(plaintext);
	});
})

route.get('/checkOTP',(req,res)=>{
	res.render('ideas/otp');
});

route.post('/checkOTP',(req,res)=>{
	Otp.findOne({id:req.body.id})
	.then(otp=>{
		if(otp.otp == req.body.otp)
			res.send('otp verified');
		else
		{
			req.flash('error_msg','Incorrect OTP');
			res.redirect('/ideas/checkOTP')
		}
	})

	})


function generateSomeKeys()
{
	
	for(var i=0;i<10;i++)
	{
		var privateKey = crypto.randomBytes(32);
		var publicKey = eccrypto.getPublic(privateKey);
		
		const newKeys ={
			privateKey: privateKey.toString('hex'),
			pubKey: publicKey.toString('hex')
		}
		new Keys(newKeys)
		.save()
		.then(idea => {
		})
	}
}

function str2buff(str)
{
	var a= [];
	for (var i = 0, len = str.length; i < len; i+=2) {
		a.push(str.substr(i,2));
	}
	for (var i=0;i<a.length;i++)
		a[i] = parseInt(a[i], 16);
	const pubKeyBuff = Buffer.from(a);
		// console.log('pubKeyBuff');
		// console.log(pubKeyBuff);
		return pubKeyBuff;	
}

function delimit(str)
{
	str=str+'&';
	var word="";
	var count=0;
	var arr = [];
	for(var i=0;i<str.length;i++)
	{
		c=str.charAt(i);
		if(c!='&')
		{
			word+=c;
		}
		if(c=='&')
		{
			arr.push(word);
			count++;
		}
	}
	return arr;
}

module.exports = route;