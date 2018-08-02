if(process.env.NODE_ENV === 'production'){
	module.exports = {
		mongoURI: 'mongodb://nikhil1:abc123@ds245901.mlab.com:45901/vidjot-mlab'
	}
}
else
{	module.exports = {
		mongoURI : 'mongodb://localhost:27017/vidjot'
	}

}