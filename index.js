const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport')
const methodOverride = require('method-override');
const app = express();
const db = require('./config/database')
console.log(db.mongoURI);

//Mongoose connection
mongoose.connect(db.mongoURI,{useNewUrlParser :true})
.then(()=> console.log("DB connected"))
.catch(err => console.log(err));


//Handlebars middleware works
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// method override middleware for PUT and DELETE
app.use(methodOverride('_method'));

//express session middleware
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
 }));

app.use(passport.initialize());
app.use(passport.session());

//connect flash middleware 
app.use(flash());


//Global variables
app.use(function(req,res,next){
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	res.locals.user = req.user || null;
	next();
});

const ideas = require('./routes/ideas');
const users = require('./routes/users');
const web3 = require('./routes/web3');


//passport config
require('./config/passport')(passport);
//Index Route
app.get('/', (req,res)=>{
	const title = 'Welcome';
	res.render('index',{
		title: title
	});
});

//to show about page
app.get('/about', (req,res)=>{
	res.render('about');
});

//use ideas Routes
app.use('/ideas',ideas);
//use users Routes
app.use('/users',users);
//web 3 routes for testing
app.use('/web3',web3);
//auth routes 
app.use('/auth',users);

const port = process.env.PORT || 5000;
app.listen(port, () =>{
	console.log(`server started at port ${port}`);
})