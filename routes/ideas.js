const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const eccrypto = require('eccrypto');
const QRCode = require('qrcode');

// const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const Web3 = require('web3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const ImageDataURI = require('image-data-uri');
var generatePassword = require('password-generator');
var obpar = '';


const route = express.Router();
const { ensureOfficial, ensureAuthenticated } = require('../helper/auth');

// var transporter = nodemailer.createTransport(
// 	'smtps://'+process.env.NODEMAILERUSER+':'+process.env.NODEMAILERPASSWORD +'@smtp.gmail.com');

web3 = new Web3(new Web3.providers.HttpProvider(process.env.RINKEBY));
var kycContract = web3.eth.contract([{ "constant": true, "inputs": [{ "name": "_id", "type": "string" }], "name": "viewKey", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_id", "type": "string" }, { "name": "_signature", "type": "string" }, { "name": "_pkuser", "type": "string" }], "name": "addCustomer", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [], "name": "kill", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "_id", "type": "string" }], "name": "viewSignature", "outputs": [{ "name": "", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "name": "", "type": "uint256" }], "name": "customer", "outputs": [{ "name": "signature", "type": "string" }, { "name": "pkuser", "type": "string" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_id", "type": "string" }, { "name": "_signature", "type": "string" }], "name": "updateData", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "name": "id", "type": "string" }, { "indexed": false, "name": "index", "type": "uint256" }], "name": "custId", "type": "event" }]);
kyc = kycContract.at("0xe88cae0766cf16ca91a1b8a12fb271cb27ee7874");

//Load model
require('../models/ideas');
const Idea = mongoose.model('ideas');
require('../models/keys');
const Keys = mongoose.model('sampleKeys');
require('../models/otpstr');
const Otp = mongoose.model('otp');
require('../models/users');
const user = mongoose.model('users');
require('../models/kycverified');
const kycVerified = mongoose.model('KycVerified');

//Edit Idea Form routed when edit button is clicked from list of ideas page
route.get('/edit/:id', ensureOfficial, (req, res) => {
	Idea.findOne({
		_id: req.params.id
	})
		.then(idea => {
			if (idea.user != req.user.id) {
				req.flash('error_msg', 'Not Authorised');
				res.redirect('/ideas');
			}
			else {
				res.render('ideas/edit', {
					idea: idea
				});
			}


		});
});

//to display the list of all ideas  
route.get('/', ensureOfficial, (req, res) => {
	Idea.find({ user: req.user.id })
		.sort({ date: 'desc' })
		.then(ideas => {
			res.render('ideas/index', {
				ideas: ideas
			});
		});
});

route.put('/:id', ensureOfficial, (req, res) => {
	Idea.findOne({
		_id: req.params.id
	})
		.then(idea => {
			idea.title = req.body.title;
			idea.details = req.body.details;

			idea.save()
				.then(idea => {
					req.flash('success_msg', 'Video idea updated');
					res.redirect('/ideas');
				})
		})
});

route.delete('/:id', ensureOfficial, (req, res) => {
	Idea.remove({
		_id: req.params.id
	})
		.then(() => {
			req.flash('success_msg', 'Video idea removed');
			res.redirect('/ideas');
		})
		.catch((err) => {
			console.log(err)
		});
});

//Add idea
route.get('/add', ensureOfficial, (req, res) => {
	res.render('ideas/add')
});

//Send Email  
//send id of receiver + text to be sent
route.post('/sendEmail', ensureOfficial, (req, res) => {
	var result = email(req.body);
	console.log(result);
	res.send(result);

});


// Process Form to add data to db when submit button is clicked in add idea page
route.post('/sign', ensureOfficial, (req, res) => {


	user.findOne({ email: req.body.email })
		.then(existing_user => {
			if (existing_user) {
				req.flash('error_msg', 'Email is already in use');
				res.render('ideas/add', {
					errors: 'Email is already in use',
					name: req.body.name,
					email: req.body.email,
					address: req.body.address,
					addressProof: req.body.addressProof,
					identityProof: req.body.identityProof
				});
			}
			else {
				//sign data
				const data = req.body.name + '&' + req.body.address + '&' + req.body.addressProof + '&' + req.body.identityProof;
				var msg = crypto.createHash("sha256").update(data).digest();
				//var buff = Buffer.from(req.body.key,'hex');
				var id = crypto.createHash("sha256").update(data + Date.now()).digest();
				//generate QR code using 
				//encrypt data + public key of verifier + user id
				var pass = generatePassword();
				//generate key pair for user encryption
				var pvtKeyBuff = crypto.randomBytes(32);
				var pubKeyBuff = eccrypto.getPublic(pvtKeyBuff);
				//create user account

				const newCust = {
					user_id: id.toString('hex'),
					name: req.body.name,
					email: req.body.email,
					role: 'cust'
				};

				bcrypt.genSalt(10, (err, salt) => {
					bcrypt.hash(pass, salt, (err, hashedPassword) => {
						if (err) throw err;
						//encrypting newly generated user's private key with password
						const cipher = crypto.createCipher('aes192', hashedPassword);
						let encryptedKey = cipher.update(pvtKeyBuff.toString('hex'), 'hex', 'hex');
						encryptedKey += cipher.final('hex');

						newCust.password = hashedPassword;
						newCust.pvtEncryptedKey = encryptedKey;
						new user(newCust)
							.save()
							.then(user => {
								console.log(user);
							})
							.catch(err => {
								console.log(err);
								return;
							})
					});
				});

				eccrypto.encrypt(pubKeyBuff, Buffer(data))
					.then(function (encrypted) {

						var encpStr = encrypted.iv.toString('hex') + '&' + encrypted.ephemPublicKey.toString('hex') + '&' + encrypted.ciphertext.toString('hex') + '&' + encrypted.mac.toString('hex');
						//var privateKeyBuffsign = str2buff(req.body.key);
						//decrypring private key to generate public key of sign

						const decipher = crypto.createDecipher('aes192', req.user.password);
						let decrypted = decipher.update(req.user.pvtEncryptedKey, 'hex', 'utf-8');
						decrypted += decipher.final('utf-8');
						console.log('decrypted');
						console.log(decrypted);
						var privateKeyBuffsign = Buffer.from(decrypted, 'hex');
						console.log(privateKeyBuffsign);

						var publicKeysign = eccrypto.getPublic(privateKeyBuffsign);
						var pubKeyStr = publicKeysign.toString('hex');
						var idStr = id.toString('hex');
						var QRdata = encpStr + '&' + pubKeyStr + '&' + idStr;
						console.log(QRdata);
						QRCode.toDataURL(QRdata, function (err, url) {
							eccrypto.sign(privateKeyBuffsign, msg)
								.then(function (sig) {
									console.log("Signature in DER format:", sig.toString('hex'));
									var mailText = 'Your details have been verified. Please use these credentials to login to your account # User Id: ' + req.body.email + '# Password: ' + pass + '##Please change your password ASAP. ## PFA your QR code ## Cheers! ' ;
									res.render('ideas/dispQR', {
										url: url,
										id: idStr,
										signature: sig.toString('hex'),
										pkUser: pubKeyBuff.toString('hex'),
										text: mailText
									})
								});
						})
					})
					.catch(function (err) {
						console.log('encryption failed');
						console.log(err);
					})
			}
		});
});

route.get('/qr', ensureOfficial, (req, res) => {
	res.render('ideas/qr');
});
//get qr from form as string and seperate data values
route.post('/generateotp', ensureOfficial, (req, res) => {
	console.log('generateotp');
	var arr = delimit(req.body.qr);
	var otpstr = { iv: str2buff(arr[0]), ephemPublicKey: str2buff(arr[1]), ciphertext: str2buff(arr[2]), mac: str2buff(arr[3]) };
	var randstr = crypto.randomBytes(4);
	var randstr = randstr.toString('hex');
	const newOtp = {
		id: arr[5],
		otp: randstr
	};
	new Otp(newOtp)
		.save()
		.then(otp => {
			console.log('random otp string saved with user id in db');
		})
		.catch(err => {
			console.log(err);
		})
	//pkuser will be available from blockchain
	// var pkuser='049cda8845e03d4e9b43f014dff653350621d75b9669357f67abb2a70973d0e6e0ac456553c4beb7e5c0e97da48d4a5cdedbd4d5218cc4eae918fc7a3e0b473526';
	kyc.viewKey(arr[5], (err, result) => {
		if (err) {
			console.log(err);
		}
		else {
			console.log('result');
			console.log(result);

			var pkuserbuff = str2buff(result);
			console.log('rand str');
			console.log(randstr.toString());
			eccrypto.encrypt(pkuserbuff, randstr).then(function (encrypted) {
				console.log('encrypted otp');
				console.log(encrypted);
				var encpStr = encrypted.iv.toString('hex') + '&' + encrypted.ephemPublicKey.toString('hex') + '&' + encrypted.ciphertext.toString('hex') + '&' + encrypted.mac.toString('hex');
				console.log('encpStr' + encpStr);
				var message = "Your One Time Password in encrypted format for KYC verifivation is: # "+encpStr;
				obpar = { id: arr[5], text: message };
				email(obpar);
				res.send('end');
			})
				.catch(err => {
					console.log(err);
				})
		}
	});
});
route.get('/decryptOtp', ensureAuthenticated, (req, res) => {
	res.render('ideas/decrypt');
})

route.post('/decryptOtp', ensureAuthenticated, (req, res) => {
	var arr = delimit(req.body.encpData);
	var encpOTP = { iv: str2buff(arr[0]), ephemPublicKey: str2buff(arr[1]), ciphertext: str2buff(arr[2]), mac: str2buff(arr[3]) };
	// key1 = str2buff(key);
	// console.log(key1);
	//decipher private key using password

	const decipher = crypto.createDecipher('aes192', req.user.password);
	let decryptedKey = decipher.update(req.user.pvtEncryptedKey, 'hex', 'hex');
	decryptedKey += decipher.final('hex');
	console.log('decryptedKey');
	console.log(decryptedKey);

	var privateKeyBuffuser = Buffer.from(decryptedKey, 'hex');

	console.log('private key');
	console.log(privateKeyBuffuser.toString('hex'));
	console.log('otp');
	console.log(encpOTP);


	eccrypto.decrypt(privateKeyBuffuser, encpOTP).then(decryptedOTP => {
		console.log(decryptedOTP.toString());

		var arr = delimit(req.body.qr);
		var userData = { iv: str2buff(arr[0]), ephemPublicKey: str2buff(arr[1]), ciphertext: str2buff(arr[2]), mac: str2buff(arr[3]) };
		var pubKeyVerifier = str2buff(arr[4]);
		var userid = arr[5];
		eccrypto.decrypt(privateKeyBuffuser, userData).then(decryptedData => {
			// res.render('ideas/otp',{otp:decryptedOTP.toString()});
			Otp.findOne({ id: userid })
				.then(otpObj => {
					if (otpObj.otp == decryptedOTP) {
						// res.send('otp verified');
						Otp.remove({ id: userid });

						kyc.viewSignature(userid, (err, result) => {
							if (err) {
								console.log(err);
								window.alert('unable to get signature');
								res.send
							}
							else {
								console.log(result);
								sig = str2buff(result);
								var msg = crypto.createHash("sha256").update(decryptedData).digest();
								eccrypto.verify(pubKeyVerifier, msg, sig).then(function () {
									console.log("Signature is OK");

									var data = delimit(decryptedData);

									var verifiedObj = new kycVerified(
										{
											user_id: userid,
											name: data[0],
											address: data[1],
											idProof: data[3],
											addressProof: data[2]
										});
									verifiedObj.save();
									res.send('signature verified successfully. KYC done. Thank you');
								}).catch(function (err) {
									console.log("Signature is BAD");
									console.log(err);
									res.send('failure')
								});
							}
						});
					}
					else {
						req.flash('error_msg', 'Incorrect OTP');
						res.redirect('/ideas/decryptOtp');
					}
				})
		})

	}).catch(err => {
		console.log(err);
	});
})

route.post('/checkOTP', (req, res) => {
	console.log(req.body.id);
	console.log(req.body.otp);
	Otp.findOne({ id: req.body.id })
		.then(otp => {
			console.log(otp);
			if (otp.otp == req.body.otp) {
				res.send('otp verified');
				Otp.remove({ id: req.body.id });
			}
			else {
				req.flash('error_msg', 'Incorrect OTP');
				res.redirect('/ideas/decryptOtp');
			}
		})

})


function generateSomeKeys() {

	for (var i = 0; i < 10; i++) {
		var privateKey = crypto.randomBytes(32);
		var publicKey = eccrypto.getPublic(privateKey);

		const newKeys = {
			privateKey: privateKey.toString('hex'),
			pubKey: publicKey.toString('hex')
		}
		new Keys(newKeys)
			.save()
			.then(idea => {
			})
	}
}

function str2buff(str) {
	var a = [];
	for (var i = 0, len = str.length; i < len; i += 2) {
		a.push(str.substr(i, 2));
	}
	for (var i = 0; i < a.length; i++)
		a[i] = parseInt(a[i], 16);
	const pubKeyBuff = Buffer.from(a);
	// console.log('pubKeyBuff');
	// console.log(pubKeyBuff);
	return pubKeyBuff;
}

function email(obpar) {
	console.log('sendEmail');
	user.findOne({ user_id: obpar.id })
		.then(user => {

			var res = obpar.text.replace(/#/g, '\n');
			// console.log(res);
			var mailOptions = {
				from: 'automated.nikhilyadav3000@gmail.com',
				to: user.email,
				subject: 'KYC Registration',
				text: res
			};

			if (obpar.attachments) {

				// obpar.attachments = JSON.toString(obpar.attachments);
				// var imageURI = obpar.attachments;
				// var image = ImageDataURI.decode(imageURI);
				let dataURI = obpar.attachments;
				// console.log(dataURI);
				base64 = dataURI.replace(/^data:image\/png;base64,/, "");
				var n = base64.indexOf("&");
				base64 = base64.slice(0,n);
				if( base64.length%4==1)
				base64+="===";
				else if (base64.length%4==2)
				base64+="==";
				else if (base64.length%4==3)
				base64+="=";				
				
				// console.log(base64);
				mailOptions.attachments = [
					{
						filename: 'qrcode.jpeg',
						content:base64,//dataURI.substring(22),
						type:'image/jpeg'
					}
				];
			}
	
			sgMail.send(mailOptions, function (err, info) {
				if (err) {
					console.log(err.response.body);
					return 'err';
				}
				else {
					// console.log(info);
					return 'success';
				}
			});
		})
}

function delimit(str) {
	str = str + '&';
	var word = "";
	var count = 0;
	var arr = [];
	for (var i = 0; i < str.length; i++) {
		c = str.charAt(i);
		if (c != '&') {
			word += c;
		}
		if (c == '&') {
			arr.push(word);
			count++;
			word = "";
		}
	}
	return arr;
}

module.exports = route;