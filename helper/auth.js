module.exports = {
	ensureOfficial : function(req,res,next)
	{
		if(req.isAuthenticated() && req.user.role == 'official'){
			return next();			
		}
		else
			req.flash('error_msg','Not Authorised');
		res.redirect('/users/login');
	},

	ensureAdmin : function(req,res,next)
	{
		if(req.isAuthenticated() && req.user.role == 'admin'){			
			return next();
		}
		else
		req.flash('error_msg','Not Authorised');
		res.redirect('/users/login');
	},
	ensureAuthenticated : function(req,res,next)
	{
		if(req.isAuthenticated())
		{
			return next();
		}
		else
		req.flash('error_msg','Not Authorised');
		res.redirect('/users/login');
	} 



}