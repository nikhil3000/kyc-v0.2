const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const eccrypto = require('eccrypto');
const QRCode = require('qrcode');
const route = express.Router();
const {ensureAuthenticated} = require('../helper/auth');


//Load model
require('../models/ideas');
const Idea = mongoose.model('ideas');
require('../models/keys');
const Keys = mongoose.model('sampleKeys');

//Add idea
route.get('/add',ensureAuthenticated,(req,res) =>{
	res.render('ideas/add')
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

	// if(errors.length > 0)
	// {
	// 	res.render('ideas/add',{
	// 		errors:errors,
	// 		name: req.body.name,
	// 		address: req.body.address,
	// 		addressProof: req.body.addressProof,
	// 		identityProof: req.body.identityProof
	// 	});
	// } 
	// else
	// {
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
	// }
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

module.exports = route;