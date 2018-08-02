const express = require('express');
const Web3 = require('web3');

const router = express.Router();


router.get('/',(req,res)=>{
	if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider);
  res.send('if');
} else {
  // set the provider you want from Web3.providers
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  res.send('else');

}

})




module.exports = router; 