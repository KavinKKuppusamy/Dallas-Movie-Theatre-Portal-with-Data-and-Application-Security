var express = require('express');
var session = require('express-session');
var router = express.Router();

//crypto for credit card
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
var key = 'password';

var speakeasy = require('speakeasy');
var QRCode = require('qrcode');


var monk = require('monk');
var db = monk('localhost:27017/movie-theater');
const { check, validationResult} = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var BCRYPT_SALT_ROUNDS = 12;
var ObjectId = require('mongodb').ObjectID;
const multer = require('multer');
const multerConfig = {
    
storage: multer.diskStorage({ //Setup where the user's file will go
 destination: function(req, file, next){
   next(null, './public/images');
   },   
    
    //Then give the file a unique name
    filename: function(req, file, next){
        console.log(file);
        const ext = file.mimetype.split('/')[1];
        next(null, file.originalname);
      }
    }),   
    
    //A means of ensuring only images are uploaded. 
    fileFilter: function(req, file, next){
          if(!file){
            next();
          }
        const image = file.mimetype.startsWith('image/');
        if(image){
          console.log('photo uploaded');
          next(null, true);
        }else{
          console.log("file not supported");
          
          //TODO:  A better message response to user on failure.
          return next();
        }
    }
  };
//const app = express();
//app.use(session({secret: 'catdog',saveUninitialized: true,resave: true}));





/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.get('/login', function(req,res,next){
	res.render('login');
});

router.get('/register',function(req,res,next){
	res.render('register');
});

router.get('/user',function(req,res,next){
	var collection = db.get('users');
	collection.count({$or:[{username: req.query.username},{email:req.query.email}]}, function(err, result){
		if (err) throw err;
		console.log(result);
	  	res.json(result);
	});
	
});

router.get('/invaliduser',function(req,res,next){
	res.render('failurelogin');
})

router.get('/successlogin',function(req,res,next){
	var sess = req.session;
	if(sess.username){
	var cartCollection = db.get('user-cart');
	console.log(sess.userid);
	cartCollection.findOne({user_id: new ObjectId(sess.userid)},function(err,result){
		console.log(result);
		if(err) throw err;
		req.session.cartCount = Object.keys(result.cart).length;
		res.render('successlogin',{type : sess.type,user: sess.username,firstname:sess.firstname, cartCount :req.session.cartCount});
		// res.end();
	});
	
} else{
	res.render('failurelogin');
}

});

router.get('/financialview',function(req,res,next){
	var sess = req.session;
	if(sess.username){
	var cartCollection = db.get('user-cart');
	console.log(sess.userid);
	cartCollection.findOne({user_id: new ObjectId(sess.userid)},function(err,result){
		// console.log(result);
		if(err) throw err;
		req.session.cartCount = Object.keys(result.cart).length;
		res.render('financialview',{group : sess.group, role : sess.role,type : sess.type,user: sess.username,firstname:sess.firstname, cartCount :req.session.cartCount});
		// res.end();
	});
	
} else{
	res.render('failurelogin');
}

});

// get financial report
router.get('/financial/report',function(req,res,next){

	var sess = req.session;
	if(sess.username && sess.group == 'financial'){
		var responseJson = {};
		var userCollection = db.get('users');
		var bookings = db.get('bookings');
		userCollection.find({},function(err,result){
			// result = JSON.parse(JSON.stringify(result))
			// res.send(result);
			for(var i=0;i<result.length;i++){
				var acutalRes = result[i];
				var cardNum = acutalRes.cardNum;
				var user_id = acutalRes._id;

				if(cardNum){

				var decipher = crypto.createDecipher(algorithm, key);
				var decrypted = decipher.update(cardNum, 'hex', 'utf8') + decipher.final('utf8');
				var masked = decrypted.replace(/\d(?=\d{4})/g, "*");
				result[i].cardNum = masked;
				}
				// var totalTrans = 0;
				// acutalRes.t = totalTrans;
				
				
			}
			responseJson = JSON.parse(JSON.stringify(result))
			res.send(responseJson);
		})

		

	}else{
		res.redirect('/invaliduser');
	}

});

router.get('/analyticsview',function(req,res,next){
	var sess = req.session;
	if(sess.username){
	var cartCollection = db.get('user-cart');
	console.log(sess.userid);
	cartCollection.findOne({user_id: new ObjectId(sess.userid)},function(err,result){
		// console.log(result);
		if(err) throw err;
		req.session.cartCount = Object.keys(result.cart).length;
		res.render('analyticsview',{group : sess.group, role : sess.role,type : sess.type,user: sess.username,firstname:sess.firstname, cartCount :req.session.cartCount});
		// res.end();
	});
	
} else{
	res.render('failurelogin');
}

});



router.post('/login',function(req,res,next){
	var sess = req.session;
	//console.log(sess);
	var collection = db.get('users');
	var username = req.body.username;
	var password = req.body.password;
	var userToken = req.body.token;
	collection.findOne({username:username},function(err,user){
		if(err) throw err;
		if(user == null){
			res.send(500,'showAlert');
			res.end();
		} else if(bcrypt.compareSync(password,user.password)){
			// console.log("came here");
			sess.username = username;
			sess.email = user.email;
			sess.firstname = user.firstname;
			sess.userid = user._id;
			sess.type = user.type;

			var secretkey = user.secretkey;
            var verified = speakeasy.totp.verify({
                                  secret: secretkey,
                                  encoding: 'base32',
                                  token: userToken
                                });
			// res.render('successlogin',{msg :'Yaaahoooo'});
			// res.redirect('/successlogin');
			// res.end();
			var group = user.group;
			var role = user.role;
			var responseJson = {};

			if(!verified){
				res.send(500,'showAlert');
                res.end();
			} else {
			// console.log(group);
			if(typeof group == 'undefined' || group == null){
				res.send(200,'success');
			}else {
				sess.group = group;
				sess.role = role;
			// console.log("came here");
			// call financial view
			// res.send(200,'success');
			// res.send('302','redirect');
			// res.render('financialview',{type: req.session.type,cartCount : req.session.cartCount,userid : req.session.userid, user: req.session.username,firstname:req.session.firstname});
				responseJson['group'] = group;
				responseJson['role'] = role;
				res.send(responseJson);
		}
	}

			
		}else{
			res.send(500,'showAlert');
			res.end();
		}
	});
	
});

router.get('/logout',(req,res) => {
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        res.redirect('/');
    });

});

router.post('/register',function(req,res,next){
    var collection = db.get('users');
    var cartCollection = db.get('user-cart');
    var enterpriseTeamCollection = db.get('enterprise-team')
    var password = req.body.password;
    var responseJson = {}
    // const salt = bcrypt.genSalt(10);
    // const password = bcrypt.hash(req.body.password,salt);
    bcrypt.hash(password,BCRYPT_SALT_ROUNDS).
    then(function(hashedPassword){

 

 

        enterpriseTeamCollection.findOne({email:req.body.email},function(err,userdetails){
            if (err) throw err;
            userTeamDetails = userdetails
            console.log("check",userdetails);
            var secret = speakeasy.generateSecret({length: 20});
            if(userdetails){
                collection.insert({
                username: req.body.username,
                password: hashedPassword,
                email: req.body.email,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                group: userdetails.group,
                role: userdetails.role,
                secretkey: secret.base32,
                type: 'A'

 

                },function(err,user){
                    if(err) throw err;
                    var cart = [];
                    cartCollection.insert({
                        user_id : user._id,
                        cart : cart,
                        lastUpdated : new Date((new Date()).toISOString())
                    },function(err,cart){
                        if(err) throw err;
                        // res.redirect('login');
                    });
                    //image_Var = sec.generate(image)

 

                    QRCode.toDataURL(secret.otpauth_url, function(err, image_data) {
                      //console.log(image_data); // A data URI for the QR code image
                      responseJson['image_data'] = image_data;
                      res.send(responseJson);
                      //res.render('showqrcode.ejs',{image_data:image_data})
                    });
                    //res.redirect('qrview', sec.DATAtoUTL)
                    //res.redirect('login');
                    
                });
            }
            else{

 

                collection.insert({
                username: req.body.username,
                password: hashedPassword,
                email: req.body.email,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                group: null,
                role: null,
                secretkey: secret.base32,
                type: 'N'

 

                },function(err,user){
                    if(err) throw err;
                    var cart = [];
                    cartCollection.insert({
                        user_id : user._id,
                        cart : cart,
                        lastUpdated : new Date((new Date()).toISOString())
                    },function(err,cart){
                        if(err) throw err;
                        // res.redirect('login');
                    });

 

                    QRCode.toDataURL(secret.otpauth_url, function(err, image_data) {
                      //console.log(image_data); // A data URI for the QR code image
                      responseJson['image_data'] = image_data;
                      res.send(responseJson);
                      //res.render('showqrcode.ejs',{image_data:image_data})
                    });

 

                    //image_Var = sec.generate(image)
                    //res.redirect('qrview', sec.DATAtoUTL)
                    //res.redirect('login');
                });
            }
        });


    }).catch(function(error){
        console.log("Error saving user: ");
        console.log(error);
        next();
    });
    
});

router.get('/user/booking',function(req,res,next){
	if(req.session.userid){
		var bookingCollection = db.get('bookings');
		var user_id = req.session.userid;
		bookingCollection.find({user_id: user_id},function(err,bookings){
			if(err) throw err;
			console.log(bookings);
			res.render('showbookings',{cartCount : req.session.cartCount,firstname:req.session.firstname,bookings:bookings});
		})

	}else{
		res.redirect('/invaliduser');
	}
});

router.get('/movies/search',function(req,res,next){
	var sess = req.session;
	if(sess.username){
	var collection = db.get('movies');
	var title = req.query.title;
	var genre = req.query.genre;
	var currentDate = new Date();
	// var movies;
	// console.log(dateRestriction);

	var pageSize = 8;
	var page = req.query.page;
	if(genre == "" && title == ""){
		collection.find({status: "A",availableUntil:{$gte : new Date(currentDate.toISOString())}}, function(err, movies){
		if (err) throw err;
		// console.log(movies);

		const pageCount = Math.ceil(movies.length / pageSize);
		if (page > pageCount) {
    		page = pageCount;
  		}
  		res.json({
    		"page": page,
    		"pageCount": pageCount,
    		"movies": movies.slice(page * 8 - 8, page * 8)
  		});

	  	// res.json(movies);
	});
	} else if(genre == "" || title == ""){
		if(genre == ""){
			collection.find({status: "A",title:{$regex : title},availableUntil:{$gte : new Date(currentDate.toISOString())}}, function(err, movies){
			if (err) throw err;
			const pageCount = Math.ceil(movies.length / pageSize);
		if (page > pageCount) {
    		page = pageCount;
  		}
  		res.json({
    		"page": page,
    		"pageCount": pageCount,
    		"movies": movies.slice(page * 8 - 8, page * 8)
  		});
	  		// res.json(movies);
	});
		}else{
			collection.find({status: "A",genre:genre,availableUntil:{$gte : new Date(currentDate.toISOString())}}, function(err, movies){
			if (err) throw err;
			const pageCount = Math.ceil(movies.length / pageSize);
		if (page > pageCount) {
    		page = pageCount;
  		}
  		res.json({
    		"page": page,
    		"pageCount": pageCount,
    		"movies": movies.slice(page * 8 - 8, page * 8)
  		});
	  		// res.json(movies);
	});

		}
	}else{

		collection.find({title:{$regex : title},availableUntil:{$gte : new Date(currentDate.toISOString())}  , genre:genre}, function(err, movies){
		if (err) throw err;
		const pageCount = Math.ceil(movies.length / pageSize);
		if (page > pageCount) {
    		page = pageCount;
  		}
  		res.json({
    		"page": page,
    		"pageCount": pageCount,
    		"movies": movies.slice(page * 8 - 8, page * 8)
  		});
	  	// res.json(movies);
	});

	}
} else{
		res.render('failurelogin');
}
});

router.get('/movies/movieshows',function(req,res,next){
	if(req.session.username){
		// console.log("here");
	var collection = db.get('movie-shows');
	var movie_id = req.query.movieid;
	var timing = req.query.timing;
	collection.findOne({movie_id:movie_id,showTiming:timing},function(err,show){
		if(err) throw err;
		res.json(show);
	});
}else{
	res.redirect('/invaliduser');
}
});

router.get('/movies/shows',function(req,res,next){

	if(req.session.username){

		var collection = db.get('movie-shows');
		var show_id = req.query.showid;
		collection.findOne({_id:show_id},function(err,show){
			if(err) throw err;
			res.json(show);
		})
	}else{
		res.redirect('/invaliduser');
	}

});

router.get('/movies/bookshows/:id',function(req,res,next){
	if(req.session.username){
		var collection = db.get('movies');
		collection.findOne({_id:req.params.id},function(err,movie){
			if(err) throw err;
			res.render('bookshows',{type: req.session.type,cartCount : req.session.cartCount,userid : req.session.userid,movie : movie, user: req.session.username,firstname:req.session.firstname});
		});
}else{
	res.redirect('/invaliduser');
}
})



router.get('/movies/:id',function(req,res,next){

	var collection = db.get('movies');
	collection.find({_id : req.params.id}, function(err,movie){
		if(err) throw err;
		res.json(movie);
	})
});

router.get('/user/cart',function(req,res,next){
	if(req.session.userid){
		var collection = db.get('user-cart');
		var user_id = req.session.userid;
		collection.findOne({user_id : new ObjectId(user_id)},function(err,cart){
			if(err) throw err;
			res.render('showcart',{userid : req.session.userid,cartCount : req.session.cartCount,firstname:req.session.firstname,cart : cart});
		});
	}else{
		res.redirect('/invaliduser');
	}
});

router.get('/user/cart/display',function(req,res,next){
	if(req.session.userid){

		var showCollection = db.get('movie-shows');
		var movieCollection = db.get('movies');
		var responseJson = {};
		var movie_id;
		var show_id = req.query.showid;
		// console.log(show_id);
		showCollection.findOne({_id : new ObjectId(show_id)},function(err,show){
			if(err) throw err;
			responseJson["showTiming"] = show.showTiming;
			responseJson["price"] = show.price;
			movie_id = show.movie_id;

			movieCollection.findOne({_id : new ObjectId(movie_id)},function(err,movie){

				if(err) throw err;
				responseJson["title"] = movie.title;
				responseJson["image"] = movie.image;
				// console.log(JSON.stringify(responseJson));
				res.json(responseJson);
				// console.log(responseJson);

			});

			


		});

	}else{
		res.redirect('/invaliduser');
	}

});
router.post('/user/cart',function(req,res,next){
	if(req.session.userid){
	var collection = db.get('user-cart');
	var user_id = req.session.userid;
	var qty = req.body.qty;
	var show_id = req.body.showid;
	var show_date = req.body.showdate;
	var cartCount = req.session.cartCount;
	var cartDoc = {"show_id" : show_id , "qty" : qty , "show_date" : show_date };
	collection.update({user_id : new ObjectId(user_id)},{"$push" : {"cart":cartDoc } }, function(err,cart) {
		if(err) throw err;
		req.session.cartCount  = req.session.cartCount + 1;
		res.json(cart);
	});

}else{
	res.redirect('/invaliduser');
}

});

router.get('/user/:id',function(req,res,next){
	if(req.session.userid){

		var user_id = req.params.id;
		var collection = db.get('users');

		collection.findOne({_id : new ObjectId(user_id)},function(err,user){
			// console.log(user.cardNum);
			// var cardNum = user.cardNum;
			var cardNum = user.cardNum;
			if(cardNum){
				var decipher = crypto.createDecipher(algorithm, key);
				var decrypted = decipher.update(cardNum, 'hex', 'utf8') + decipher.final('utf8');
				user.cardNum = decrypted;
			}
			// var decryptCard = decrypt(cardNum);
			// user.cardNum = decryptCard;
			res.json(user);

		});

	}else{
		res.redirect('/invaliduser');
	}
});

router.post('/user/cart/:id',function(req,res,next){
	if(req.session.userid){

		var show_id = req.params.id;
		var user_id = req.session.userid;
		var qtyToBeUpdated = req.body.qty;
		var collection = db.get('user-cart');
		collection.update({user_id : new ObjectId(user_id),'cart.show_id':show_id },

		{
			$set :{
				'cart.$.qty':qtyToBeUpdated
			}
		},function(err,cart){
			if(err) throw err;
			res.json(cart);
		}

			);

	}else{
		res.redirect('/invaliduser');
	}
});

router.delete('/user/cart',function(req,res,next){
	// console.log("came here");
	if(req.session.userid){
	var user_id = req.session.userid;
	var show_id_to_delete_from_cart = req.body.showid;
	var collection = db.get('user-cart');
	collection.update({user_id: new ObjectId(user_id)},
		{$pull:{"cart":{show_id:show_id_to_delete_from_cart}}},
		function(err,cart){
			if(err) throw err;
			var response = { message : "Cart updated",state   : true };
			req.session.cartCount = req.session.cartCount - 1;
      		res.json(response);
			// res.send(200,"Cart updated");
		});
}else{
	res.redirect('/invaliduser');
}

});


router.post('/user/booking',function(req,res,next){
	if(req.session.userid){
		var user_id = req.session.userid;
		var cartCollection = db.get('user-cart');
		var bookingCollection = db.get('bookings');
		var showCollection = db.get('movie-shows');
		var cart = cartCollection.findOne({user_id : new ObjectId(user_id)});
		cart.then(function(c){
			// console.log(res);
			c.cart.forEach(e =>{
				// console.log(e);
				var s = showCollection.findOne({_id:e.show_id});
				s.then(function(sh){
					// console.log(sh);

					var b = bookingCollection.insert({
						user_id : user_id,
						show_id : sh._id,
						qty : e.qty,
						show_date : e.show_date,
						total_price : e.qty * sh.price,
						booking_date : new Date()
					});

					b.then(function(book){
						// console.log(book);
						// console.log(c._id);
						var ccollection = cartCollection.update({_id:c._id},{$set:{cart:[]}});

						ccollection.then(function(ucoll){
							// console.log(ucoll);
							showCollection.update({_id:sh._id},{$set:{totalAvailableSeats : sh.totalAvailableSeats - e.qty}},function(err,f){
								if(err) throw error;
								res.end();
							})
						})
					});

				})
			});
		})
	}else{
		res.redirect('/invaliduser');
	}
});



router.get('/admin/addMovie',function(req,res,next){
	if(req.session.username && req.session.type == 'A'){
		res.render('addMovie',{firstname:req.session.firstname,cartCount:req.session.cartCount});
	}else{
		res.redirect('/invaliduser');
	}
})

router.post('/movies',multer(multerConfig).single('image'),function(req,res,next){
	var title = req.body.title;
	var genre = req.body.genre;
	var length = req.body.length;
	var timing = req.body.showTimings;
	var availableUntil = req.body.availableUntil;
	var synopsis = req.body.synopsis;
	var image_name = req.file.originalname;
	var status = "A";
	
	var showTime = timing.split(",").map(function(item) {
  			return item.trim();
		});
	// console.log(JSON.stringify(showTime));
	let obj = {};
	for(var i=1;i<=showTime.length;i++){
		obj[i] = showTime[i-1];
	}
	// console.log(obj);
	
	var movieCollection = db.get('movies');
	movieCollection.insert({
		title:title,
		genre:genre,
		length:length,
		synopsys:synopsis,
		image:image_name,
		availableUntil: new Date(new Date(availableUntil).toISOString()),
		showTimings : obj,
		status:status
	},function(err,movie){
		if (err) throw err;
		res.redirect('/successlogin');

	})
	// res.send("ok");

});

router.get('/admin/addshow/:id',function(req,res,next){
	console.log("came here");
	if(req.session.username && req.session.type == 'A'){
		var movie_id = req.params.id;
		var movieCollection = db.get('movies');
		movieCollection.findOne({_id:movie_id},function(err,movie){

			if(err) throw err;
			res.render('addshow',{type : req.session.type,firstname:req.session.firstname,cartCount:req.session.cartCount,movie:movie});
		});
		
	}else{
		res.redirect('/invaliduser')
	}
});

router.post('/movies/shows',function(req,res,next){

	// console.log(req.session);

	if(req.session.username && req.session.type == 'A'){

		var movie_id = req.body.movie_id;
		var timing = req.body.showTiming;
		var capacity = req.body.capacity;
		var screen = req.body.screen;
		var price = req.body.price;

		var showCollection = db.get('movie-shows');
		showCollection.insert({

			movie_id : movie_id,
			showTiming : timing,
			capacity : capacity,
			totalAvailableSeats : capacity,
			screenNo : screen,
			price: price

		},function(err,show){
			if(err) throw err;
			res.json(show);
		});


	}else{
		res.redirect('/invaliduser');
	}
});

router.get('/admin/updatemovie/:id',function(req,res,next){
	if(req.session.username && req.session.type == 'A'){

		var movie_id = req.params.id;
		var movieCollection = db.get('movies');
		movieCollection.findOne({_id:movie_id},function(err,movie){
			if(err) throw err;
			res.render('updatemovie',{type : req.session.type,firstname:req.session.firstname,cartCount:req.session.cartCount,movie:movie});
		})


	}else{
		res.redirect('/invaliduser');
	}
})

router.post('/user/card',function(req,res,next){

	if(req.session.username){



		var userCollection = db.get("users");
		var user_id = req.body.id;
		var cardType = req.body.cardType;
		var cardNum = req.body.cardNum;
		var cipher = crypto.createCipher(algorithm, key);  
		var encrypted = cipher.update(cardNum, 'utf8', 'hex') + cipher.final('hex');
		
		

		
			userCollection.update({_id:user_id},

				{
			$set :{
				'cardNum':encrypted,
				'cardType' : cardType
			}
		},{upsert:true}

				,function(err,user){
			if(err) throw err;
			res.send(200,'success');
		})

	}else{

		res.redirect('/invaliduser');
	}

});

router.post('/admin/updatemovie/:id',multer(multerConfig).single('image'),function(req,res,next){
	if(req.session.username && req.session.type == 'A'){

		var movie_id = req.params.id;
		var objForUpdate = {};
		if (req.body.title) objForUpdate.title = req.body.title;
		if (req.body.genre) objForUpdate.genre = req.body.genre;
		if (req.body.length) objForUpdate.length = req.body.length;
		if (req.body.availableUntil) objForUpdate.availableUntil = new Date(new Date(req.body.availableUntil).toISOString());
		if (req.body.synopsis) objForUpdate.synopsys = req.body.synopsis;
		if(req.file) objForUpdate.image = req.file.originalname;
		var movieCollection = db.get('movies');
		objForUpdate = { $set: objForUpdate };
		movieCollection.update({_id:movie_id},objForUpdate,function(err,movie){
			if(err) throw err;
			res.redirect("/movies/bookshows/"+movie_id);
		})

	}else{
		res.redirect('/invaliduser');
	}
});

router.post('/admin/deletemovie/:id',function(req,res,next){
	if(req.session.username && req.session.type == 'A'){

		var movie_id = req.params.id;
		//soft delete
		var movieCollection = db.get('movies');
		movieCollection.update({_id:movie_id},{
			$set:{
				status : "N"
			}
		},function(err,movie){
			if(err) throw err;
			res.json(movie);
		})

	}else{
		res.redirect('/invaliduser');
	}
})





module.exports = router;
