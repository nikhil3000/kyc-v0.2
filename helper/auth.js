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

	ensureCust : function(req,res,next)
	{
		if(req.isAuthenticated() && req.user.role == 'cust'){			
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