const express = require('express');
const Web3 = require('web3');

const router = express.Router();


router.get('/',(req,res)=>{

	res.render('ideas/web3',{
		choice:'addCustomer',
		id: 'abc',
		signature: 'def',
		pkUser: 'efg'
	});
})




module.exports = router; 