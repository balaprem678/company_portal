var LocalStrategy = require('passport-local').Strategy;
 var mcapi = require("mailchimp-api");
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var CONFIG = require('../config/config'); //configuration variables
var User = require('../controller/mongodbController.js').users;
var jwt = require('jsonwebtoken');
var db = require('../model/mongodbConnection.js');
var My_model = require('../model/My_model.js');
var mail = require('../model/mail.js');
var socialdata = require('../model/social_network.js');
var mongoose = require('mongoose');


module.exports = function (passport) {
    var socialdatas;
         db.GetOneDocument('settings', {}, {'social_networks':1}, {}, function (err, res) {
            socialdatas = res;
        passport.use(new GoogleStrategy({
            clientID: res.social_networks.google_api.client_id,
            clientSecret: res.social_networks.google_api.secret_key,
            callbackURL: res.social_networks.google_api.callback
             //clientID: CONFIG.SOCIAL_NETWORKS.googleAuth.clientID,
             //clientSecret: CONFIG.SOCIAL_NETWORKS.googleAuth.clientSecret,
             //callbackURL: CONFIG.SOCIAL_NETWORKS.googleAuth.callbackURL

        },function (token, refreshToken, profile, done) {
                var authHeader = generateToken();
                function generateToken() {
                    var token = jwt.sign({
                        id: profile.username + ':' + profile.email
                    }, 'token_with_username_and_password', {
                            expiresIn: 12000
                        });
                    return token;
                }

                // make the code asynchronous
                // User.findOne won't fire until we have all our data back from Google
                process.nextTick(function () {
                    // try to find the user based on their google id

                    User.findOne({ $or: [{ 'google.id': profile.id }, { 'email': profile.emails[0].value }] }, function (err, user) {
                        if (err)
                            return done(err);
                        if (user) {
                            if (user.status == 0) {
                                user.status = 1;
                                user.save(function (err) {
                                    if (err){
                                  
                                        return done(null, false,  err );
                                       
                                    }else{
                                     return done(null, { "user": user, "header": authHeader });

                                    }
                                        
                                        
                                });
                            } else {
                                return done(null, { "user": user, "header": authHeader }); // user found, return that user
                            }
                        } else {
                            // if the user isnt in our database, create a new user
                            var googleUser = new User();

                            // set all of the relevant information
                            googleUser.google.id = profile.id;
                            googleUser.google.token = token;
                            googleUser.google.name = profile.displayName;
                            googleUser.role = 'user';
                            googleUser.google.email = profile.emails[0].value; // pull the first email
                            googleUser.avatar = profile.photos[0].value;
                            googleUser.type = 'socialnetwork';
                            googleUser.username = profile.displayName;
                            googleUser.email = profile.emails[0].value;
                            googleUser.token_verification = authHeader;
                            googleUser.status = 1;

                            // save the user
                            googleUser.save(function (err) {
                                if (err) {
                                    return done(null, false, err );
                                } else {
                                    return done(null, { "user": googleUser, "header": authHeader });
                                }

                            });
                        }
                    });
                });
            }));


         });



    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    // used to deserialize the user
    passport.deserializeUser(function (user, done) {
        done(null, {
            id: user.id,
            Name: "naveen",
            Email: "naveen@casperon.in"
        });
    });

    passport.use('local-login', new LocalStrategy(
        {
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {

            var authHeader = generateToken();

            function generateToken() {
                var token = jwt.sign({
                    id: username + ':' + password
                }, 'fsdfsasdasdd', {
                        expiresIn: 1200
                    });
                return token;
            }

            User.findOne({ $or: [{ username: username, status: 1, role: 'admin' }, { username: username, status: 1, role: 'subadmin' }, { email: username, status: 1 }] }, function (err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, { message: 'unauthorised user.' });
                }
                if (!user.validPassword(password)) {
                    return done(null, false, { message: 'The username or password you have entered is invalid.' });
                }

                req.session.passport.header = authHeader;
                return done(null, user);
            });
        }));

    passport.use('site-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {

            var authHeader = generateToken();

            function generateToken() {
                var token = jwt.sign({
                    id: username + ':' + password
                }, 'fsdfsasdasdd', {
                        expiresIn: 1200
                    });
                return token;
            }

            User.findOne({ $or: [{ username: username, status: 1 }, { email: username, status: 1 }] }, function (err, user) {

                if (err) {
                    return done(err);
                }
                if (!user) {
                    return done(null, false, { message: 'unauthorised user.' });
                }
                if (!user.validPassword(password)) {
                    return done(null, false, { message: 'The username or password you have entered is invalid.' });
                }
                req.session.passport.header = authHeader;
                return done(null, user);
            });
        }));

    passport.use('site-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'pwd',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, pwd, done) {

            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {
                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({ username: req.body.user_name, email: email }, function (err, user) {
                    // if there are any errors, return the error
                    if (err) {
                        return done(err);
                    }

                    // check to see if theres already a user with that email
                    if (user) {
                        if(user.status == 0){
                            var authHeader = generateToken();
                            function generateToken() {
                                var token = jwt.sign({
                                    id: req.body.user_name + ':' + req.body.pwd
                                }, 'token_with_username_and_password', {
                                    expiresIn: 12000
                                });
                                return token;
                            }

                            user.username = req.body.user_name;
                            user.email = req.body.email;
                            user.name = { 'first_name': req.body.user_name };

                            user.password = user.generateHash(req.body.pwd);
                            user.role = req.body.role;
                            user.status = 1;
                            user.token_verification = authHeader;

                            db.UpdateDocument("users",{ '_id':user.id },user,function(err,result){
                                if (err) {
                                    return done(null, false, req.flash('Error', 'That email or username is already taken.'));
                                }
                                req.session.passport.header = authHeader;
                                db.GetOneDocument('users', { '_id': user.id  }, {}, {}, function (err, UserDetails) {
                                    db.getDocument('settings', {}, { general: 1, site_title: 1, site_contact_email: 1 }, function (err, docdata1) {
                                        if (err || !docdata1) { res.send({ "status": "0", "message": "No User Found for this Email" }); }
                                        else {
                                            var mailData = {};
                                            mailData.template = 'Registration Mail';
                                            mailData.to = UserDetails.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'cfmurl', value: docdata1[0].general.site_url+'confirmationRegister/'+user._id+'/'+ UserDetails.token_verification});
                                            mailData.html.push({ name: 'name', value: UserDetails.username});
                                            My_model.common_email_send(mailData, function (err, response) { });
                                        }
                                    });
                                });
                                return done(null, user);
                            });

                        }else{
                            return done(null, false, req.flash('Error', 'That email or username is already taken.'));
                        }
                    }
                    else {

                        var authHeader = generateToken();
                        function generateToken() {
                            var token = jwt.sign({
                                id: req.body.user_name + ':' + req.body.pwd
                            }, 'token_with_username_and_password', {
                                    expiresIn: 12000
                                });
                            return token;
                        }
                        // if there is no user with that email
                        // create the user
                        var newUser = new User();

                        // set the user's local credentials
                        newUser.username = req.body.user_name;
                        newUser.email = req.body.email;
                        newUser.name = { 'first_name': req.body.user_name };

                        newUser.password = newUser.generateHash(req.body.pwd);
                        newUser.role = req.body.role;
                        newUser.status = 1;
                        newUser.location = req.body.location;
                        newUser.activity = { 'created': req.body.today, 'modified': req.body.today, 'last_login_date': req.body.today, 'last_logout_date': req.body.today };
                        newUser.verification_code = [];
                        var datas = {email:My_model.randomString(10,'#')};
                        newUser.verification_code.push(datas);
                        newUser.token_verification = authHeader;

                        // save the user
                        newUser.save(function (err,respo) {
                            if (err) {
                                return done(null, false, req.flash('Error', 'That email or username is already taken.'));
                            }
                             req.session.passport.header = authHeader;
                             db.GetOneDocument('users', { '_id': respo._id }, {}, {}, function (err, UserDetails) {
                               db.getDocument('settings', {}, { general: 1, site_title: 1, site_contact_email: 1 }, function (err, docdata1) {
                                 if (err || !docdata1) { res.send({ "status": "0", "message": "No User Found for this Email" }); }
                                 else {
                                     var mailData = {};
                                     mailData.template = 'Registration Mail';
                                     mailData.to = UserDetails.email;
                                     mailData.html = [];
                                     mailData.html.push({ name: 'cfmurl', value: docdata1[0].general.site_url+'confirmationRegister/'+respo._id+'/'+ UserDetails.token_verification});
                                                    mailData.html.push({ name: 'name', value: UserDetails.username});
                                     My_model.common_email_send(mailData, function (err, response) { });
                                   }
                                 });
                                 });
                              return done(null, newUser);
                        });
						//mailchimp
						   var listid="e0032efa49";
                          var emailId=req.body.email;
                          mc = new mcapi.Mailchimp('91233d6faffa1a946a15e99bb19cac1d-us14');
                          mc.lists.subscribe({id: listid, email: {'email': req.body.email} }, function(data) {
                                 
						});
						
                    }

                });

            });

        }));
passport.use('reopen-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'code',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, code, done) {

            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {
                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({email: email }, function (err, user) {
                    // if there are any errors, return the error
                    if (err) {                       
                            return done(null, false, req.flash('Error', "you haven't registered before"));
                    } else

                    // check to see if theres already a user with that email
                    if (user) {
                        if(user.status == 0){
                            var authHeader = generateToken();
                            function generateToken() {
                                var token = jwt.sign({
                                    id: user.username + ':' + user.password
                                }, 'token_with_username_and_password', {
                                    expiresIn: 12000
                                });
                                return token;
                            }

                            
                            user.email = req.body.email;                           
                            
                            user.status = 1;
                            user.token_verification = authHeader;

                            db.UpdateDocument("users",{ '_id':user.id },user,function(err,result){
                                if (err) {
                                    return done(null, false, req.flash('Error', 'That email or username is already taken.'));
                                }
                                req.session.passport.header = authHeader;
                                db.GetOneDocument('users', { '_id': user.id  }, {}, {}, function (err, UserDetails) {
                                    db.getDocument('settings', {}, { general: 1, site_title: 1, site_contact_email: 1 }, function (err, docdata1) {
                                        if (err || !docdata1) { res.send({ "status": "0", "message": "No User Found for this Email" }); }
                                        else {
                                            var mailData = {};
                                            mailData.template = 'Registration Mail';
                                            mailData.to = UserDetails.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'cfmurl', value: docdata1[0].general.site_url+'confirmationRegister/'+user._id+'/'+ UserDetails.token_verification});
                                            mailData.html.push({ name: 'name', value: UserDetails.username});
                                            My_model.common_email_send(mailData, function (err, response) { });
                                        }
                                    });
                                });
                                return done(null, user);
                            });

                        }else if(user.status == 1){
                            return done(null, false, req.flash('Error', 'your account is already in active state'));
                        }else{
                            return done(null, false, req.flash('Error', 'your account is already in active state---->>'));
                        }
                    }  else {
                       return done(null, false, req.flash('Error', "you haven't registered before"));
                    }

                });

            });

        }));


    passport.use('confirmation-register', new LocalStrategy({
        usernameField: 'userId',
        passwordField: 'code',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, userId, code, done) {
            process.nextTick(function () {
                User.findOne({ _id: userId }, function (err, user) {

                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false, req.flash('Error', 'Invalid confirmation link.'));
                    }
                    else {

                        var authHeader = generateToken();
                        function generateToken() {
                            var token = jwt.sign({
                                id: user.user_name + ':' + user.pwd
                            }, 'token_with_username_and_password', {
                                    expiresIn: 12000
                                });
                            return token;
                        }

                        var verification_code = '';
                        /*if (typeof user.verification_code != 'undefined' && user.verification_code.length > 0 && typeof user.verification_code[0].email != 'undefined') {
                            verification_code = user.verification_code[0].email;
                        }*/

                        if (user.token_verification && typeof user.token_verification != 'undefined') {
                            verification_code = user.user;
                        }

                        if (verification_code != '' && verification_code == req.params.code) {
                            var updateData = { 'verification_code': [], 'token_verification':'' };
                            updateData.is_verified = 'Yes';
                            db.UpdateDocument('users', { _id: new mongoose.Types.ObjectId(user._id) }, updateData, function (err, response) {
                                if (err || response.nModified == 0) {
                                    return done(null, false, req.flash('Error', 'Please try again.'));
                                } else {
                                    req.session.passport.header = authHeader;
                                    return done(null, user);
                                }
                            });
                        } else {
                            return done(null, false, req.flash('Error', 'Invalid confirmation link.'));
                        }
                    }
                });
            });
        }));

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) {
            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({ username: req.body.name, email: email }, function (err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);
                    // check to see if theres already a user with that emai l
                    if (user) {

                        if (user.status == 0) {
                            user.status = 1;
                            user.save(function (err) {
                                if (err)
                                    return done(null, false, req.flash('signup', 'That email is already taken.' + err));
                                return done(null, user);
                            });
                        } else {
                            return done(null, false, req.flash('signup', 'That email is already taken.'));
                        }

                    }
                    else {

                        // if there is no user with that email
                        // create the user
                        var newUser = new User();

                        // set the user's local credentials
                        newUser.username = req.body.name;
                        newUser.email = email;
                        newUser.password = newUser.generateHash(password);
                        newUser.type = 'login';
                        newUser.status = 1;

                        // save the user
                        newUser.save(function (err) {
                            if (err)
                                return done(null, false, req.flash('signup', 'That email is already taken.' + err));
                            return done(null, newUser);
                        });
                    }

                });

            });

        }));

    passport.use(new FacebookStrategy({
        // pull in our app id and secret from our schema.js file
        clientID: CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID,
        clientSecret: CONFIG.SOCIAL_NETWORKS.facebookAuth.clientSecret,
        callbackURL: CONFIG.SOCIAL_NETWORKS.facebookAuth.callbackURL,
        profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified']
    },

        // facebook will send back the token and profile
        function (req, token, refreshToken, profile, done) {
		
		
            // asynchronous
            process.nextTick(function () {
                // find the user in the database based on their facebook id
                User.findOne({ $or: [{ 'facebook.id': profile.id }, { 'email': profile.emails[0].value }] }, function (err, user) {
                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database
					
                    if (err) {
                        return done(err);
                    }
                    var authHeader = generateToken();
                    function generateToken() {
                        var token = jwt.sign({
                            id: profile.username + ':' + profile.email
                        }, 'token_with_username_and_password', {
                                expiresIn: 12000
                            });
                        return token;
                    }


                    // if the user is found, then log them in
                    if (user) {

                        if (user.status == 0) {

                            user.status = 1;


                            user.save(function (err) {
                                if (err) {
                                    return done(null, false, { error: err });
                                } else {
                                    return done(null, { "user": user, "header": authHeader });
                                }
                            });
                        } else {
                            // req.session.passport.header = authHeader;
                            return done(null, { "user": user, "header": authHeader }); // user found, return that user
							
                        }


                    } else {
                        // if there is no user found with that facebook id, create them
                        var newUser = new User();

                        // set all of the facebook information in our user model
                        newUser.facebook.id = profile.id; // set the users facebook id
                        newUser.facebook.token = token; // we will save the token that facebook provides to the user
                        newUser.facebook.profile = profile.profileUrl;
                        newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                        newUser.facebook.email = profile.emails[0].value; // look at the passport user profile to see how names are returned
                        newUser.username = profile.name.givenName + ' ' + profile.name.familyName;
                        newUser.email = profile.emails[0].value;
                        newUser.role = 'user';
                        newUser.type = 'socialnetwork';
                        newUser.status = 1;

                        // facebook can return multiple emails so we'll take the first

                        // save our user to the database
                        newUser.save(function (err) {
						
                            if (err) {
                                return done(null, false, { error: err });
                            }
                            else {
                                return done(null, { "user": newUser, "header": authHeader });
                            }

                            // if successful, return the new user

                        });
                    }

                });
            });

        }));

    passport.use(new TwitterStrategy({

        consumerKey: CONFIG.SOCIAL_NETWORKS.twitterAuth.consumerKey,
        consumerSecret: CONFIG.SOCIAL_NETWORKS.twitterAuth.consumerSecret,
        callbackURL: CONFIG.SOCIAL_NETWORKS.twitterAuth.callbackURL

    },
        function (token, tokenSecret, profile, done) {

            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Twitter
            process.nextTick(function () {

                User.findOne({ 'twitter.id': profile.id }, function (err, user) {

                    // if there is an error, stop everything and return that
                    // ie an error connecting to the database
                    if (err)
                        return done(err);

                    // if the user is found then log them in
                    if (user) {
                        if (user.status == 0) {
                            user.status = 1;
                            user.save(function (err) {
                                if (err)
                                    return done(null, false, { error: err });
                                return done(null, user);
                            });
                        } else {
                            return done(null, user); // user found, return that user
                        }
                    } else {
                        // if there is no user, create them
                        var newUser = new User();

                        // set all of the user data that we need
                        newUser.twitter.id = profile.id;
                        newUser.twitter.token = token;
                        newUser.twitter.name = profile.username;
                        newUser.twitter.displayName = profile.displayName;
                        newUser.username = profile.username;
                        newUser.email = profile.displayName || null;
                        newUser.type = 'socialnetwork';
                        newUser.status = 1;

                        // save our user into the database
                        newUser.save(function (err) {
                            if (err)
                                return done(null, false, { error: err });
                            return done(null, newUser);
                        });
                    }
                });

            });

        }));
};
