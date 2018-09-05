id = process.env.MLABUSER;
pwd = process.env.MLABPWD;

if(process.env.NODE_ENV === 'production'){
	module.exports = {
		mongoURI: 'mongodb://' +id+':'+pwd+'@ds245901.mlab.com:45901/vidjot-mlab'
	}
}
else
{	module.exports = {
		mongoURI : 'mongodb://localhost:27017/vidjot'
	}

}