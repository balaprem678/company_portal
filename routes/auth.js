var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var CONFIG = require('../config/config'); //configuration variables
var User = require('../model/mongodb.js').users;
var Tasker = require('../model/mongodb.js').tasker;
var jwt = require('jsonwebtoken');
var async = require("async");
var mailcontent = require('../model/mailcontent.js');
var bcrypt = require('bcrypt');
//var flash = require('connect-flash');
var twilio = require('../model/twilio.js');
var db = require('../controller/adaptor/mongodb.js');
var mongoose = require("mongoose");
var library = require('../model/library.js');
var turf = require('turf');
// for express validator
const { check, body, validationResult, sanitizeBody } = require('express-validator');



function jwtSign(payload) {
    var token = jwt.sign(payload, CONFIG.SECRET_KEY);
    return token;
}

module.exports = async function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (user, done) {
        done(null, { id: user.id });
    });

    passport.use('adminLogin', new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        // admin login updated
        async function (req, username, password, done) {
            var authHeader = jwtSign({ username: username });
            var validPassword = async function (password, passwordb) {
                let res = await bcrypt.compare(password, passwordb);
                return res;
            };
            const user = await db.GetOneDocument('admins', { 'username': username, 'role': { $in: ['admin', 'subadmin'] }, 'status': 1 }, {}, {})
            if (user.status === false) {
                // return done(null, false, { message: `Please check you user name, You entered : ${req.body.username}` });
                return done(null, false, { message: `Invalid username` });

            } else {
                if (!await validPassword(req.body.password, user.doc.password)) {
                    return done(null, false, { message: 'Invalid password' });
                    // return done(null, false, { message: 'You are not authorized to sign in. Verify that you are using valid credentials' });
                } else {
                    if (typeof req.session.passport == 'undefined') {
                        req.session.passport = {};
                    }
                    req.session.passport.header = authHeader;
                    var data = { activity: {} };
                    data.activity.last_login = Date();
                    const update = await db.UpdateDocument('admins', { _id: user._id }, data, {})
                    if (update.status === false) {
                        return done(null, false, { message: err });
                    } else {
                        return done(null, user);
                    }
                }
            }
            // db.GetOneDocument('admins', { 'username': username, 'role': { $in: ['admin', 'subadmin'] }, 'status': 1 }, {}, {}, function (err, user) {
            //     if (err) {
            //         return done(err);
            //     } else {
            //         console.log('user=>', password)
            //         if (!user || !user.validPassword(password)) {
            //             return done(null, false, { message: 'You are not authorized to sign in. Verify that you are using valid credentials' });
            //         } else {
            //             if (typeof req.session.passport == 'undefined') {
            //                 req.session.passport = {};
            //             }
            //             req.session.passport.header = authHeader;
            //             var data = { activity: {} };
            //             data.activity.last_login = Date();
            //             db.UpdateDocument('admins', { _id: user._id }, data, {}, function (err, docdata) {
            //                 if (err) {
            //                     return done(null, false, { message: err });
            //                 } else {
            //                     return done(null, user);
            //                 }
            //             });
            //         }
            //     }
            // });
        }));


    passport.use('local-site-login', new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, email, password, done) {
            console.log("siteeeeeeeeeeee");
            
            process.nextTick(function () {
                var authHeader = jwtSign({ email: email });

                db.GetOneDocument('restaurant', { 'email': email, 'status': { $in: [1, 3, 2] } }, {}, {}, function (err, user) {
                    if (err) {
                        return done(err);
                    } else {
                        if (user) {
                            if (user.status == 2) { return done(null, false, { message: 'Your restaurant is inactive kindly contact admin for further details' }); }
                            else {
                                if (user.password) {
                                    var validPassword = function (password, passwordb) {
                                        return bcrypt.compareSync(password, passwordb);
                                    };
                                    if (!validPassword(password, user.password)) {
                                        return done(null, false, { message: 'Incorrect password' });
                                    } else {
                                        if (typeof req.session.passport == 'undefined') {
                                            req.session.passport = {};
                                        }
                                        req.session.passport.header = authHeader;
                                        var data = { activity: {} };
                                        data.activity.last_login = Date();
                                        db.UpdateDocument('restaurant', { _id: user._id }, data, {}, function (err, docdata) {
                                            if (err) {
                                                return done(err);
                                            } else {
                                                return done(null, user, { message: 'Login Success' });
                                            }
                                        });
                                    }
                                } else {
                                    return done(null, false, { message: 'Invalid Login, Please try again' });
                                }
                            }
                        } else {
                            return done(null, false, { message: 'Invalid Login, Please try again' });
                        }
                    }
                })
            });
        }));


    passport.use('local-site-user-login', new LocalStrategy(
        {
            usernameField: 'phone_number',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, phone_number,password, done) {
            console.log("sssssssssssssssssssss");
            
            console.log(phone_number,"phoneeeeeeeeee");
            
            process.nextTick(async function () {
                var errors = [];
                // req.checkBody('country_code', 'country_code is required').notEmpty();
                // if (typeof req.body.social_login == 'undefined') {
                //     req.checkBody('username', 'username is required').notEmpty();
                //     req.checkBody('password', 'password is required').notEmpty();
                // }
                // errors = req.validationErrors();
                // if (errors) {
                //     console.log("============")
                //     return done(null, false, { message: errors[0].msg });
                // }
                // var validPassword = async function (password, passwordb) {
                //     let res = await bcrypt.compare(password, passwordb);
                //     return res;
                // };
                if (req.body.social_id) {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        if (err) {
                            return done(null, false, { message: "Something Went Wrong..!!" });
                        } else {
                            db.GetOneDocument('users', { $or: [{ 'social_login.google_id': req.body.social_id }, { 'email': username }], 'status': { $ne: 0 } }, {}, {}, function (err, userdocs) {
                                if (err) {
                                    return done(null, false, { message: "Something Went Wrong..!!" });
                                } else {
                                    if (userdocs) {
                                        if (userdocs.status == 1) {
                                            db.UpdateDocument('users', { $or: [/*{ 'username': username }, { 'email': username }*/  { 'phone.number': phone_number } ], 'status': { $eq: 1 } }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                                if (err || response.nModified == 0) {
                                                    return done(null, false, { message: 'Please check the phone number and try again' });
                                                } else {
                                                    var user_image = '';
                                                    if (userdocs.avatar) {
                                                        user_image = settings.settings.site_url + userdocs.avatar;

                                                    } else {
                                                        user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                    }
                                                    var authHeader = jwtSign({ email: userdocs.email });
                                                    if (typeof req.session.passport == 'undefined') {
                                                        req.session.passport = {};
                                                    }
                                                    req.session.passport.header = authHeader;
                                                    return done(null, {
                                                        status: '1',
                                                        user_image: user_image,
                                                        avatar:1,
                                                        user_id: userdocs._id,
                                                        role: userdocs.role,
                                                        user_name: userdocs.username,
                                                        unique_code: userdocs.unique_code,
                                                        email: userdocs.email,
                                                        message: "You are Logged In successfully",
                                                        country_code: userdocs.country_code,
                                                        phone_number: userdocs.phone_number,
                                                        token: authHeader,
                                                    }, { message: 'Login Success' });
                                                }
                                            });
                                        } else {
                                            if (userdocs.status == 0) {
                                                return done(null, false, { message: 'Your account is currently unavailable' });
                                            } else {
                                                return done(null, false, { message: 'Your account is inactive...Please contact administrator for further details' });
                                            }
                                        }
                                    } else {
                                        return done(null, false, { status: true });
                                    }
                                }
                            })
                        }
                    })
                } else {
                    const userdocs = await db.GetOneDocument('users', { $and: [/*{ 'username': username }, { 'email': username }*/  { 'phone.number': phone_number } ], 'status': { $ne: 0 } }, {}, {})

                    console.log("userdocs at line 230*******************************", userdocs)


                    if (userdocs.status === false) {
                        return done(null, false, { message: `Phone number is invalid` });
                    }
                    if (userdocs.status === false) {
                        return done(null, false, { message: "Something Went Wrong..!!" });
                    } else {
                        if (userdocs.doc && typeof userdocs.doc._id != 'undefined') {

                            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
                            if (!settings || settings == null) {
                                return done(null, false, { message: "Something Went Wrong..!!" });
                            } else {
                                // if (req.body.password) {
                                    // if (!userdocs.doc.password || userdocs.doc.password.length == 0) {
                                    //     return done(null, false, { message: 'Please try again with your social login' });
                                    // } else {
                                        // if (await validPassword(req.body.password, userdocs.doc.password)) {
                                            if (userdocs.doc.status == 1) {
                                                const response = await db.UpdateDocument('users', { $or: [/*{ 'username': username }, { 'email': username }*/  { 'phone.number': phone_number } ], 'status': { $eq: 1 } }, { 'activity.last_login': new Date() }, {})
                                                if (response.status === false) {
                                                    return done(null, false, { message: 'Please check the phone number and try again' });

                                                } else {
                                                    var user_image = '';
                                                    // console.log("userdocs.avataruserdocs.avataruserdocs.avataruserdocs.avataruserdocs.avatar")

                                                    // console.log(userdocs.avatar)


                                                    // console.log("userdocs.avataruserdocs.avataruserdocs.avataruserdocs.avataruserdocs.avatar")
                                                    if (userdocs && userdocs.doc && userdocs.doc.avatar) {

                                                        user_image = settings.doc.settings.site_url + userdocs.doc.avatar;
                                                    } else {
                                                        user_image = settings.doc.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                    }
                                                    var authHeader = jwtSign({ email: userdocs.doc.email });
                                                    if (typeof req.session.passport == 'undefined') {
                                                        req.session.passport = {};
                                                    }
                                                    req.session.passport.header = authHeader;
                                                    return done(null, {
                                                        status: '1',
                                                        user_image: user_image,
                                                        user_id: userdocs.doc._id,
                                                        role: userdocs.doc.role,
                                                        user_name: userdocs.doc.username,
                                                        unique_code: userdocs.doc.unique_code,
                                                        email: userdocs.doc.email,
                                                        avatar:userdocs.doc.avatar,
                                                        message: "You are Logged In successfully",
                                                        country_code: userdocs.doc.country_code,
                                                        phone_number: userdocs.doc.phone_number,
                                                        token: authHeader,
                                                        user_type: userdocs.doc.user_type,
                                                        first_name: userdocs.doc.first_name,
                                                        last_name: userdocs.doc.last_name,
                                                        phone: userdocs.doc.phone,
                                                        gender: userdocs.doc.gender
                                                    }, { message: 'Login Success' });
                                                }
                                            } else {
                                                if (userdocs.doc.status == 0) {
                                                    return done(null, false, { message: 'Your account is currently unavailable' });
                                                } else {
                                                    return done(null, false, { message: 'Your account is inactive...Please contact administrator for further details' });
                                                }
                                            }
                                        // } else {
                                        //     return done(null, false, { message: 'Password is invalid' });

                                        // }
                                    // }
                                // }
                            }
                        }
                        else {
                            return done(null, false, { message: "Sorry, your phone number is not registered with us." });
                        }
                    }
                    // db.GetOneDocument('users', { $or: [{ 'username': username }, { 'email': username } /*, { 'phone.number': username } */], 'status': { $ne: 0 } }, {}, {}, function (err, userdocs) {
                    //     if (err) {
                    //         return done(null, false, { message: "Something Went Wrong..!!" });
                    //     } else {
                    //         if (userdocs && typeof userdocs._id != 'undefined') {
                    //             db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    //                 if (err) {
                    //                     return done(null, false, { message: "Something Went Wrong..!!" });
                    //                 } else {
                    //                     if (req.body.password) {
                    //                         if (!userdocs.password || userdocs.password.length == 0) {
                    //                             return done(null, false, { message: 'Please try again with your social login' });
                    //                         } else {
                    //                             if (validPassword(req.body.password, userdocs.password)) {
                    //                                 if (userdocs.status == 1) {
                    //                                     db.UpdateDocument('users', { $or: [{ 'username': username }, { 'email': username } /*, { 'phone.number': username } */], 'status': { $eq: 1 } }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                    //                                         if (err || response.nModified == 0) {
                    //                                             return done(null, false, { message: 'Please check the phone number and try again' });
                    //                                         } else {
                    //                                             var user_image = '';
                    //                                             if (userdocs.avatar) {
                    //                                                 user_image = settings.settings.site_url + userdocs.avatar;

                    //                                             } else {
                    //                                                 user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    //                                             }
                    //                                             var authHeader = jwtSign({ email: userdocs.email });
                    //                                             if (typeof req.session.passport == 'undefined') {
                    //                                                 req.session.passport = {};
                    //                                             }
                    //                                             req.session.passport.header = authHeader;
                    //                                             return done(null, {
                    //                                                 status: '1',
                    //                                                 user_image: user_image,
                    //                                                 user_id: userdocs._id,
                    //                                                 role: userdocs.role,
                    //                                                 user_name: userdocs.username,
                    //                                                 unique_code: userdocs.unique_code,
                    //                                                 email: userdocs.email,
                    //                                                 message: "You are Logged In successfully",
                    //                                                 country_code: userdocs.country_code,
                    //                                                 phone_number: userdocs.phone_number,
                    //                                             }, { message: 'Login Success' });
                    //                                         }
                    //                                     });
                    //                                 } else {
                    //                                     if (userdocs.status == 0) {
                    //                                         return done(null, false, { message: 'Your account is currently unavailable' });
                    //                                     } else {
                    //                                         return done(null, false, { message: 'Your account is inactive...Please contact administrator for further details' });
                    //                                     }
                    //                                 }
                    //                             } else {
                    //                                 return done(null, false, { message: 'Please check the password and try again' });
                    //                             }
                    //                         }

                    //                     }
                    //                 }
                    //             })
                    //         } else {
                    //             return done(null, false, { message: "Sorry, your email or username is not registered with us." });
                    //         }
                    //     }
                    // })
                }
            });
        }));

    passport.use('local-site-user-login-otp', new LocalStrategy(
        {
            usernameField: 'phone_number',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, phone_number, password, done) {
            process.nextTick(function () {
                var errors = [];
                req.checkBody('country_code', 'country_code is required').notEmpty();
                req.checkBody('phone_number', 'phone_number is required').notEmpty();
                req.checkBody('password', 'password is required').notEmpty();
                errors = req.validationErrors();
                if (errors) {
                    return done(null, false, { message: errors[0].msg });
                }
                var validPassword = function (password, passwordb) {
                    return bcrypt.compareSync(password, passwordb);
                };
                db.GetOneDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, userdocs) {




                    if (err) {
                        return done(null, false, { message: "Something Went Wrong..!!" });
                    } else {
                        if (userdocs && typeof userdocs._id != 'undefined') {
                            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                if (err) {
                                    return done(null, false, { message: "Something Went Wrong..!!" });
                                } else {
                                    if (req.body.password) {
                                        if (!userdocs.verify_otp || userdocs.verify_otp.length == 0) {
                                            return done(null, false, { message: 'Please try again with your social login' });
                                        } else {
                                            if (req.body.password == userdocs.verify_otp) {
                                                if (userdocs.status == 1) {
                                                    db.UpdateDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code, 'status': { $eq: 1 } }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                                        if (err || response.nModified == 0) {
                                                            return done(null, false, { message: 'Please check the phone number and try again' });
                                                        } else {
                                                            var user_image = '';
                                                            if (userdocs.avatar) {
                                                                user_image = settings.settings.site_url + userdocs.avatar;

                                                            } else {
                                                                user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                            }
                                                            var authHeader = jwtSign({ email: userdocs.email });
                                                            if (typeof req.session.passport == 'undefined') {
                                                                req.session.passport = {};
                                                            };
                                                            req.session.passport.header = authHeader;
                                                            return done(null, {
                                                                status: '1',
                                                                user_image: user_image,
                                                                user_id: userdocs._id,
                                                                role: userdocs.role,
                                                                user_name: userdocs.username,
                                                                unique_code: userdocs.unique_code,
                                                                email: userdocs.email,
                                                                message: "You are Logged In successfully",
                                                                country_code: userdocs.country_code,
                                                                phone_number: userdocs.phone_number,
                                                                token: authHeader,
                                                            }, { message: 'Login Success' });
                                                        }
                                                    });
                                                } else {
                                                    if (userdocs.status == 0) {
                                                        return done(null, false, { message: 'Your account is currently unavailable' });
                                                    } else {
                                                        return done(null, false, { message: 'Your account is inactive...Please contact administrator for further details' });
                                                    }
                                                }
                                            } else {
                                                return done(null, false, { message: 'Password is invalid' });
                                            }
                                        }

                                    }
                                }
                            })
                        } else {
                            return done(null, false, { message: "Sorry, your mobile number is not registered with us." });
                        }
                    }
                })
            });
        }));

    /*passport.use('site-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'pwd',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, pwd, done, res) {
            process.nextTick(function () {
                db.GetOneDocument('restaurant', { $or: [{ restaurantname: req.body.resname }, { email: req.body.email }] }, {}, {}, function (err, user) {
                    if (err) {
                        return done(err);
                    } else {
                        if (user) {
                            return done('Email Id Or Restaurantname already exists', false, null);
                        } else {


                             var data = {
                                 activity: {}
                             };
 
                             data.location = {};
                             data.location.lng = req.body.address.lng;
                             data.location.lat = req.body.address.lat;
                             var area_array = [[data.location.lng, data.location.lat]]
 
                             var city_doc = '';
                             db.GetOneDocument('city', { 'cityname': req.body.main_city }, {}, {}, function (err, docdata) {
                                 if (docdata.area_management) {
                                     for (var i = 0; i < docdata.area_management.length; i++) {
                                         if (docdata.area_management[i].area_name == req.body.sub_city) {
                                             city_doc = docdata.area_management[i];
                                         }
                                     }
 
                                     var parentCoordinates = city_doc.area_poly.coordinates[0];
                                     var childCoordinates = area_array;
 
                                     var parentPolygon = turf.polygon([parentCoordinates]);
                                     var inside = true;
                                     childCoordinates.forEach(function (coordinates) {
                                         point = turf.point(coordinates);
                                         if (!turf.inside(point, parentPolygon)) {
                                             inside = false;
                                         }
                                     });
 
                                     data.main_city = req.body.main_city;
                                     data.sub_city = req.body.sub_city;
 
                                     data.main_cuisine = req.body.main_cuisine;
                                     data.sub_cuisine = req.body.sub_cuisine;
 
                                     if (inside == true) {
 
                                         var token = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
                                         var len = 6;
                                         var code = '';
                                         for (var i = 0; i < len; i++) {
                                             var rnum = Math.floor(Math.random() * token.length);
                                             code += token.substring(rnum, rnum + 1);
                                         }
 
 
                                         var authHeader = jwtSign({ restaurantname: req.body.resname });
                                         data.unique_code = code;
                                         data.restaurantname = req.body.resname;
                                         data.username = req.body.username;
                                         data.time_zone = req.body.timezone;
 
 
                                         data.role = 'restaurant';
                                         data.phone = req.body.phone;
                                         data.email = req.body.email;
                                         data.address = req.body.address;
                                         data.status = 3;
                                         if (req.body.cpwd) {
                                             data.password = bcrypt.hashSync(req.body.cpwd, bcrypt.genSaltSync(8), null);
                                         }
 
                                         data.activity.created = new Date();
                                         db.InsertDocument('restaurant', data, function (err, result) {
                                             if (err) {
                                                 res.send(err);
                                             } else {
                                                 req.session.passport.header = authHeader;
                                                 return done(null, result);
                                             }
                                         });
                                     }
                                     else {
                                         return done('Your Restaurant Location being out of' + '  ' + city_doc.area_name, false, null);
                                     }
                                 }
                                 else {
                                     return done("No areas found in" + '  ' + docdata.cityname, false, null);
                                 }
                             });
                        }
                    }
                });
            });
        }));
*/

    passport.use('site-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'pwd',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, pwd, done, res) {
            process.nextTick(function () {
                // db.GetOneDocument('restaurant', { $or: [{ restaurantname: req.body.resname }] }, {}, {}, function (err, user) {
                db.GetOneDocument('restaurant', { $or: [{ email: req.body.email }] }, {}, {}, function (emailerr, emailcheck) {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        db.GetOneDocument('restaurant', { 'phone.code': req.body.phone.code, 'phone.number': req.body.phone.number }, {}, {}, function (phoneerr, phonecheck) {
                            if (emailerr || phoneerr) {
                                return done(err);
                            } else {
                                if (emailcheck) {
                                    return done(null, false, { message: 'Email Id already exists' })
                                }
                                else if (phonecheck) {
                                    return done(null, false, { message: 'Mobile number already exists' })
                                }
                                else {
                                    var data = {
                                        activity: {}
                                    };
                                    data.rcategory = req.body.rcategory;
                                    data.fssaino = req.body.fssaino;
                                    data.location = {};
                                    data.location.lng = req.body.address.lng;
                                    data.location.lat = req.body.address.lat;
                                    var area_array = [[data.location.lng, data.location.lat]]
                                    var city_doc = '';
                                    db.GetOneDocument('city', { 'cityname': req.body.main_city }, {}, {}, function (err, docdata) {
                                        if (docdata.area_management) {
                                            for (var i = 0; i < docdata.area_management.length; i++) {
                                                if (docdata.area_management[i].area_name == req.body.sub_city) {
                                                    city_doc = docdata.area_management[i];
                                                }
                                            }

                                            var parentCoordinates = city_doc.area_poly.coordinates[0];
                                            var childCoordinates = area_array;

                                            var parentPolygon = turf.polygon([parentCoordinates]);
                                            var inside = true;
                                            childCoordinates.forEach(function (coordinates) {
                                                point = turf.point(coordinates);
                                                if (!turf.inside(point, parentPolygon)) {
                                                    inside = false;
                                                }
                                            });

                                            data.main_city = req.body.main_city;
                                            data.sub_city = req.body.sub_city;

                                            data.main_cuisine = req.body.main_cuisine;
                                            data.sub_cuisine = req.body.sub_cuisine;

                                            if (inside == true) {
                                                var token = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
                                                var len = 6;
                                                var code = '';
                                                for (var i = 0; i < len; i++) {
                                                    var rnum = Math.floor(Math.random() * token.length);
                                                    code += token.substring(rnum, rnum + 1);
                                                }


                                                var authHeader = jwtSign({ restaurantname: req.body.resname });
                                                data.unique_code = code;
                                                data.restaurantname = req.body.resname;
                                                data.username = req.body.username;
                                                data.time_zone = req.body.timezone;


                                                data.role = 'restaurant';
                                                data.avatar = '';
                                                data.phone = req.body.phone;
                                                data.email = (req.body.email).toLowerCase();
                                                data.address = req.body.address;
                                                data.status = 3;
                                                if (req.body.parent_rests) { data.parent_rests = req.body.parent_rests; }
                                                if (req.body.main_cuisine) {
                                                    var arr = []
                                                    for (var i = 0; i < req.body.main_cuisine.length; i++) {
                                                        arr.push({ 'name': req.body.main_cuisine[i].name, '_id': req.body.main_cuisine[i]._id })
                                                    }
                                                    data.main_cuisine = arr;
                                                }

                                                if (req.body.cpwd) {
                                                    data.password = bcrypt.hashSync(req.body.cpwd, bcrypt.genSaltSync(8), null);
                                                }

                                                data.activity.created = new Date();
                                                /*db.InsertDocument('restaurant', data, function (err, result) {
                                                    if (err) {
                                                        return done("Email Id already exists", false, null);
                                                    } else {
                                                        req.session.passport.header = authHeader;
                                                        return done(null, result);
                                                    }
                                                });*/
                                                var tax = 0;
                                                db.GetOneDocument('tax', { 'country.name': data.address.country }, {}, {}, function (err, taxrespo) {
                                                    if (err) { return done(err); }
                                                    else {
                                                        if (taxrespo) {
                                                            tax = taxrespo.amount || 0;
                                                            data.tax_id = taxrespo._id;
                                                            if (taxrespo.tax_type == 'state') {
                                                                db.GetOneDocument('tax', { 'country.name': data.address.country, state_name: data.address.state }, {}, {}, function (err, taxres) {
                                                                    if (err) { return done(err); }
                                                                    else {
                                                                        if (taxres) { tax = taxres.amount || 0; data.tax_id = taxres._id; }
                                                                        data.tax = tax;
                                                                        db.InsertDocument('restaurant', data, function (err, result) {
                                                                            if (err) {
                                                                                return done(null, false, { message: 'Email Id already exists' })
                                                                            } else {
                                                                                /* var rec_data = {};
                                                                                rec_data.restaurant = result._id;
                                                                                rec_data.name = 'Recommended';
                                                                                rec_data.status = 1;
                                                                                rec_data.mainparent = 'yes';
                                                                                db.InsertDocument('categories', rec_data, function (rec_err, rec_response) {

                                                                                }); */
                                                                                mailData = {};
                                                                                mailData.template = 'restaurant_signup';
                                                                                mailData.to = req.body.email;
                                                                                mailData.html = [];
                                                                                mailData.html.push({ name: 'name', value: result.username || "" });
                                                                                mailcontent.sendmail(mailData, function (err, response) {
                                                                                    //console.log('err, response', err, response)
                                                                                });

                                                                                db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                                                    mailData1 = {};
                                                                                    mailData1.template = 'restaurant_signupto_admin';
                                                                                    mailData1.to = settings.settings.email_address;
                                                                                    mailData1.html = [];
                                                                                    mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                                                    mailData1.html.push({ name: 'address', value: result.address.fulladres || "" });
                                                                                    mailData1.html.push({ name: 'name', value: result.restaurantname || "" });
                                                                                    mailcontent.sendmail(mailData1, function (err, response) {
                                                                                        //console.log('err, response', err, response)
                                                                                    });
                                                                                });
                                                                                if (typeof req.session.passport == 'undefined') {
                                                                                    req.session.passport = {};
                                                                                }
                                                                                req.session.passport.header = authHeader;
                                                                                return done(null, result);

                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                data.tax = tax;
                                                                db.InsertDocument('restaurant', data, function (err, result) {
                                                                    if (err) {
                                                                        return done(null, false, { message: 'Email Id already exists' })
                                                                    } else {
                                                                        /* var rec_data = {};
                                                                        rec_data.restaurant = result._id;
                                                                        rec_data.name = 'Recommended';
                                                                        rec_data.status = 1;
                                                                        rec_data.mainparent = 'yes';
                                                                        db.InsertDocument('categories', rec_data, function (rec_err, rec_response) {

                                                                        }); */
                                                                        mailData = {};
                                                                        mailData.template = 'restaurant_signup';
                                                                        mailData.to = req.body.email;
                                                                        mailData.html = [];
                                                                        mailData.html.push({ name: 'name', value: result.restaurantname || "" });
                                                                        mailcontent.sendmail(mailData, function (err, response) {
                                                                            //console.log('err, response', err, response)
                                                                        });

                                                                        mailData1 = {};
                                                                        mailData1.template = 'restaurant_signupto_admin';
                                                                        mailData1.to = settings.settings.email_address;
                                                                        mailData1.html = [];
                                                                        mailData1.html.push({ name: 'name', value: result.restaurantname || "" });
                                                                        mailcontent.sendmail(mailData1, function (err, response) {
                                                                            //console.log('err, response', err, response)
                                                                        });
                                                                        if (typeof req.session.passport == 'undefined') {
                                                                            req.session.passport = {};
                                                                        }
                                                                        req.session.passport.header = authHeader;
                                                                        return done(null, result);

                                                                    }
                                                                });
                                                            }
                                                        } else {
                                                            data.tax = tax;
                                                            db.InsertDocument('restaurant', data, function (err, result) {
                                                                if (err) {
                                                                    return done(null, false, { message: 'Email Id already exists' })
                                                                } else {
                                                                    /* var rec_data = {};
                                                                    rec_data.restaurant = result._id;
                                                                    rec_data.name = 'Recommended';
                                                                    rec_data.status = 1;
                                                                    rec_data.mainparent = 'yes';
                                                                    db.InsertDocument('categories', rec_data, function (rec_err, rec_response) {

                                                                    }); */
                                                                    mailData = {};
                                                                    mailData.template = 'restaurant_signup';
                                                                    mailData.to = req.body.email;
                                                                    mailData.html = [];
                                                                    mailData.html.push({ name: 'name', value: result.restaurantname || "" });
                                                                    mailcontent.sendmail(mailData, function (err, response) {
                                                                        //console.log('err, response', err, response)
                                                                    });

                                                                    mailData1 = {};
                                                                    mailData1.template = 'restaurant_signupto_admin';
                                                                    mailData1.to = settings.settings.email_address;
                                                                    mailData1.html = [];
                                                                    mailData1.html.push({ name: 'name', value: result.restaurantname || "" });
                                                                    mailcontent.sendmail(mailData1, function (err, response) {
                                                                        //console.log('err, response', err, response)
                                                                    });
                                                                    if (typeof req.session.passport == 'undefined') {
                                                                        req.session.passport = {};
                                                                    }
                                                                    req.session.passport.header = authHeader;
                                                                    return done(null, result);

                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                            else {
                                                return done(null, false, { message: 'Your Restaurant Location being out of ' + city_doc.area_name })
                                            }
                                        }
                                        else {
                                            return done(null, false, { message: "No areas found in" + docdata.cityname })
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
                // });
            });
        }));

    //fucntion for creating the 
    async function userName(username) {

        const name = await db.GetDocument('users', { "username": { $regex: username.toLowerCase() } }, {}, {})
        if (name.status) {
            const userCount = name.doc.length
            return username
        } else {
            return username
        }

    }


    // user site register updated
    passport.use('site-user-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'first_name',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, first_name, done, res) {
            process.nextTick(async function () {

                var data = {};
                data.status = '0';
                var message = '';
                var request = {};
                if (req.body.referral_code) {
                    data.referral_code = req.body.referral_code;
                }
                data.email = req.body.email;
                // data.password = req.body.password;
                data.username = req.body.username;
                data.first_name = req.body.first_name || "";
                data.last_name = req.body.last_name || "";
                data.country_code = req.body.phone.code || '';
                data.phone_number = req.body.phone.number || '';
                data.otp = req.body.otp || null;
                // data.gender = req.body.gender || '';
                data.role = 'user';
                data.status = '1';
                var authHeader = jwtSign({ email: req.body.email });
                // if (req.body.password) {
                //     data.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
                // };
                console.log("++++++++++++++++++++++++++++++++++++++++++++*******")
                console.log(req.body.username)
                if(req.body.username){
                    let data=await db.GetOneDocument('users',{'username' : req.body.username},{}, {} )
                    console.log(data)
                    if(data.status){
                        return  done(null, false, { message: 'Firstname or Lastname are already exists!' });
                    }
                    // db.GetOneDocument('users',{'username' : req.body.username},{}, {}, function (err, settings) {
                    //     console.log("suryaaaaaaaaaaaa",settings);
                        
                    //     if(settings){
                    //         return done(null, false, { message: 'Firstname or Lastname are already exists!' });
                    //     }
                    // })
                }
                if (req.body.social_id) {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        if (err || !settings) {
                            return done(null, false, 'Configure your website settings');
                        } else {
                            db.GetOneDocument('users', { $or: [{ 'social_login.google_id': req.body.social_id }, { 'email': req.body.email }] }, {}, {}, function (err, user) {

                                if (err) {
                                    return done(err);
                                } else {
                                    if (user) {
                                        if (user.status == 0) {
                                            return done(null, false, { message: 'Your account is currently unavailable' });
                                        } else if (user.status == 2) {
                                            return done(null, false, { message: 'Your account is inactive...Please contact administrator for further details' });
                                        } else {
                                            return done(null, {
                                                "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                "user_id": user._id,
                                                "user_name": user.username,
                                                "status": user.status,
                                                "role": user.role,
                                                "email": user.email,
                                                // "country_code": user.phone.code,
                                                // "phone_number": user.phone.number,
                                                "unique_code": user.unique_code,
                                                "refered_code": '',
                                                "message": "You are Logged In successfully",
                                                "currency_code": settings.settings.currency_code,
                                                "currency_symbol": settings.settings.currency_symbol,
                                                token: authHeader,
                                            }, { message: "You are Logged In successfully" });
                                        }
                                    } else {
                                        console.log("token:authHeader,", authHeader)
                                        var newdata = { phone: {} };
                                        newdata.username = data.username;
                                        newdata.last_name = data.last_name;
                                        newdata.first_name = data.first_name;
                                        newdata.unique_code = library.randomString(8, '#A');
                                        newdata.role = 'user';
                                        newdata.user_type = req.body.social_login;
                                        newdata.email = data.email;
                                        // newdata.gender = data.gender;
                                        newdata.refer_activity = [];
                                        if (req.body.social_login == 'facebook' && typeof req.body.social_id != 'undefined') {
                                            newdata.social_login = {}
                                            newdata.social_login.facebook_id = req.body.social_id;
                                        }
                                        if (req.body.social_login == 'google' && typeof req.body.social_id != 'undefined') {
                                            newdata.social_login = {}
                                            newdata.social_login.google_id = req.body.social_id;
                                        } 
                                        newdata.status = 1;
                                        // newdata.phone.code = data.country_code;
                                        // newdata.phone.number = data.phone_number;
                                        newdata.verification = {};
                                        var authHeader = jwtSign({ email: data.email });
                                        const newUser = db.InsertDocument('users', newdata)
                                        if (!newUser) {
                                            return done(null, false, 'email-ID / Phone number already exists');
                                        } else {
                                            if (typeof req.session.passport == 'undefined') {
                                                req.session.passport = {};
                                            }

                                            db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                mailData = {};
                                                mailData.template = 'user_signupto_user';
                                                mailData.to = newdata.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'name', value: newdata.username || "" });
                                                mailcontent.sendmail(mailData, function (err, response) {
                                                });
                                            });
                                            req.session.passport.header = authHeader;
                                            return done(null, {
                                                "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                "user_id": response._id,
                                                "user_name": response.username,
                                                "status": response.status,
                                                "role": response.role,
                                                "email": response.email,
                                                // "country_code": response.phone.code,
                                                // "phone_number": response.phone.number,
                                                "unique_code": response.unique_code,
                                                "refered_code": '',
                                                "message": "Registered Successfully",
                                                "currency_code": settings.settings.currency_code,
                                                "currency_symbol": settings.settings.currency_symbol,
                                                "token": authHeader,
                                            }, { message: "Registered Successfully" });
                                        }

                                    }
                                }
                            })
                        }
                    })
                } else {
                    let condition = {};
                    if (req.body.email || (req.body.phone && req.body.phone.number && req.body.phone.code)) {
                        condition["$or"] = [];

                        if (req.body.email) {
                            condition["$or"].push({ email: req.body.email });
                        }

                        if (req.body.phone && req.body.phone.number && req.body.phone.code) {
                            condition["$or"].push({
                                $and: [
                                    { "phone.code": req.body.phone.code },
                                    { "phone.number": req.body.phone.number }
                                ]
                            });
                        }
                    }

                    let result = await db.GetOneDocument('users', condition, {}, {});
                    if (result.status) {
                        if (req.body.email === result.doc.email) {
                            return done(null, false, 'Email already exists');
                        }
                        if (result.doc.phone.number) {
                            if (req.body.phone.number === result.doc.phone.number) {
                                return done(null, false, 'Phone Number already exists');
                            }
                        }
                    }
                    let setting
                    await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}).then((res) => {
                        setting = res;
                    }).catch((err) => {
                        return done(null, false, err);
                    })
                    if (!setting) {
                        return done(null, false, 'Configure your website settings');
                    } else {
                        const settings = db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {})
                        if (!settings) {
                            return done(null, false, 'Something Went Wrong..!',);
                        }
                        var newdata = { phone: {} };
                        console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
                        console.log(data.first_name,data.last_name)
                        newdata.username = data.first_name.toLowerCase() + data.last_name.toLowerCase();
                        console.log(newdata.username)
                        newdata.last_name = data.last_name;
                        newdata.first_name = data.first_name;
                        newdata.unique_code = library.randomString(8, '#A');
                        newdata.role = 'user';
                        newdata.user_type = 'normal';
                        newdata.email = data.email;
                        newdata.gender = data.gender;
                        newdata.refer_activity = [];
                        if (typeof req.body.social_login == 'undefined') {
                            // newdata.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
                        } else {
                            if (req.body.social_login == 'facebook' && typeof req.body.social_id != 'undefined') {
                                newdata.social_login = {}
                                newdata.social_login.facebook_id = req.body.social_id;
                            }
                            if (req.body.social_login == 'google' && typeof req.body.social_id != 'undefined') {
                                newdata.social_login = {}
                                newdata.social_login.google_id = req.body.social_id;
                            }
                        }
                        if (data.referral_code) {
                            newdata.referral_code = data.referral_code;
                            if (coupon && coupon != null && coupon != undefined && coupon.status && coupon.status == 1 && coupon.expires > new Date()) {
                                var initoffer = {};
                                initoffer.discount_amount = coupon.discount_amount;
                                initoffer.cart_amount = coupon.cart_amount;
                                initoffer.expire_date = Date.now() + (setting.settings.rov_period * 24 * 60 * 60 * 1000);
                                if (setting.settings.coupon_process == "onorder") {
                                    newdata.initprocess = setting.settings.coupon_process;
                                }
                                newdata.refer_activity.push(initoffer);
                                newdata.initoffer = {};
                                newdata.initoffer.discount_amount = coupon.discount_amount;
                                newdata.initoffer.cart_amount = coupon.cart_amount;
                            }
                        }
                        newdata.status = 1;
                        newdata.phone.code = data.country_code;
                        newdata.phone.number = data.phone_number;
                        newdata.verification = {};
                       
                        let new_User
                        var authHeader = jwtSign({ email: data.email });
                        try {
                            const newUser = await db.InsertDocument('users', newdata)
                            const admin = await db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {})
                            mailData = {};
                            mailData.template = 'user_signupto_user';
                            mailData.to = newdata.email;
                            mailData.html = [];
                            mailData.html.push({ name: 'name', value: newdata.username || "" });
                            mailcontent.sendmail(mailData, function (err, response) {
                            });
                            if (typeof req.session.passport == 'undefined') {
                                req.session.passport = {};
                            }
                            req.session.passport.header = authHeader;
                            if (setting.doc.settings.coupon_process == 'instant' && coupon && coupon != null && coupon != undefined && coupon.expires > new Date() && req.body.referral_code) {
                                var coupondata = {};
                                coupondata.discount_amount = coupon.discount_amount;
                                coupondata.cart_amount = coupon.cart_amount;
                                coupondata.expire_date = Date.now() + (setting.doc.settings.rov_period * 24 * 60 * 60 * 1000);
                                db.UpdateDocument('users', { 'unique_code': req.body.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                            }
                            if (req.body.referral_code && coupon && coupon != null) {
                                db.UpdateDocument('refer_coupon', { '_id': coupon._id }, { $inc: { refer_count: 1 } }, {}, function (err, referrer) { });
                            }
                            return done(null, {
                                "user_image": setting.doc.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                "user_id": newUser._id,
                                "user_name": newUser.username,
                                "status": newUser.status,
                                "role": newUser.role,
                                "email": newUser.email,
                                "country_code": newUser.phone.code,
                                "phone_number": newUser.phone.number,
                                "unique_code": newUser.unique_code,
                                "refered_code": '',
                                "message": "Registered Successfully",
                                "currency_code": setting.doc.settings.currency_code,
                                "currency_symbol": setting.doc.settings.currency_symbol,
                                "token": authHeader,
                            }, { message: "Registered Successfully" });
                        } catch (err) {
                            return done(null, false, err);
                        }


                    }
                }
            });
        }));

    passport.use('site-user-register-otp', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'phone_number',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, phone_number, done, res) {
            process.nextTick(function () {
                var data = {};
                data.status = '0';
                var message = '';
                req.checkBody('first_name', 'first_name is required').notEmpty();
                req.checkBody('last_name', 'last_name is required').optional();
                req.checkBody('email', 'email is required').isEmail();
                req.checkBody('country_code', 'country_code  is required').notEmpty();
                req.checkBody('phone_number', 'phone_number is required').notEmpty();
                req.checkBody('otp', 'otp is required').notEmpty();
                var errors = req.validationErrors();
                if (errors) {
                    return done(errors[0].msg, false, null);
                }
                req.sanitizeBody('first_name').trim();
                req.sanitizeBody('last_name').trim();
                req.sanitizeBody('email').trim();
                req.sanitizeBody('country_code').trim();
                req.sanitizeBody('phone_number').trim();
                req.sanitizeBody('otp').trim();
                req.sanitizeBody('referral_code').trim();
                req.sanitizeBody('deviceToken').trim();
                req.sanitizeBody('gcm_id').trim();
                var request = {};
                if (req.body.referral_code) {
                    data.referral_code = req.body.referral_code;
                }

                data.email = req.body.email;
                data.username = req.body.first_name || "";
                data.last_name = req.body.last_name || "";
                data.country_code = req.body.country_code;
                data.phone_number = req.body.phone_number;
                data.otp = req.body.otp;
                data.role = 'user';
                data.status = '1';
                db.GetOneDocument('users', { "phone.code": req.body.country_code, "phone.number": req.body.phone_number }, {}, {}, function (err, user) {
                    if (err) {
                        return done(err);
                    } else {
                        if (user) {
                            return done('Phone Number already exists', false, null);
                        } else {
                            db.GetOneDocument('users', { email: req.body.email.toLowerCase() }, {}, {}, function (err, user) {
                                if (err) {
                                    return done(err);
                                } else {
                                    if (user) {
                                        return done('Email Id already exists', false, null);
                                    } else {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            if (err || !settings) {
                                                return done('Configure your website settings', false, null);
                                            } else {
                                                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                                                    if (err || !social_settings) {
                                                        return done('Configure your website settings', false, null);
                                                    } else {
                                                        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
                                                            if (err) {
                                                                return done('Something Went Wrong..!', false, null);
                                                            } else {
                                                                db.GetOneDocument('refer_coupon', { 'status': 1 }, {}, {}, function (err, coupon) {
                                                                    if (err) {
                                                                        return done('Something Went Wrong..!', false, null);
                                                                    } else {

                                                                        var newdata = { phone: {} };
                                                                        newdata.username = data.username;
                                                                        newdata.last_name = data.last_name;
                                                                        newdata.unique_code = library.randomString(8, '#A');
                                                                        newdata.role = 'user';
                                                                        newdata.user_type = 'normal';
                                                                        newdata.email = data.email;

                                                                        newdata.refer_activity = [];
                                                                        if (req.body.social_login == 'facebook' && typeof req.body.social_id != 'undefined') {
                                                                            newdata.social_login = {}
                                                                            newdata.social_login.facebook_id = req.body.social_id;
                                                                        }
                                                                        if (req.body.social_login == 'google' && typeof req.body.social_id != 'undefined') {
                                                                            newdata.social_login = {}
                                                                            newdata.social_login.google_id = req.body.social_id;
                                                                        }
                                                                        if (data.referral_code) {
                                                                            newdata.referral_code = data.referral_code;
                                                                            if (coupon && coupon != null && coupon != undefined && coupon.status && coupon.status == 1 && coupon.expires > new Date()) {
                                                                                var initoffer = {};
                                                                                initoffer.discount_amount = coupon.discount_amount;
                                                                                initoffer.cart_amount = coupon.cart_amount;
                                                                                /* var expires = new Date();
                                                                                expires = expires.getTime();
                                                                                expires = expires + ( settings.settings.rov_period * 24*60*60*1000 ); */
                                                                                initoffer.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                                                                if (settings.settings.coupon_process == "onorder") {
                                                                                    newdata.initprocess = settings.settings.coupon_process;
                                                                                }
                                                                                newdata.refer_activity.push(initoffer);
                                                                                newdata.initoffer = {};
                                                                                newdata.initoffer.discount_amount = coupon.discount_amount;
                                                                                newdata.initoffer.cart_amount = coupon.cart_amount;
                                                                            }
                                                                        }
                                                                        newdata.status = 1;
                                                                        newdata.phone.code = data.country_code;
                                                                        newdata.phone.number = data.phone_number;
                                                                        newdata.verification = {};
                                                                        newdata.verification.otp = data.otp;
                                                                        newdata.verification.otp_verified = 1;
                                                                        var authHeader = jwtSign({ email: data.email });
                                                                        db.InsertDocument('users', newdata, function (err, response) {

                                                                            if (err || response.nModified == 0) {
                                                                                return done('email-ID / Phone number already exists', false, null);
                                                                            } else {
                                                                                newdata.logo = settings.settings.site_url + settings.settings.logo;
                                                                                newdata.site_url = settings.settings.site_url;
                                                                                newdata.play_store = settings.settings.site_url + social_settings.settings.mobileapp[0].landingimg;
                                                                                newdata.android_link = social_settings.settings.mobileapp[0].url[0].url;
                                                                                newdata.app_store = settings.settings.site_url + social_settings.settings.mobileapp[1].landingimg;
                                                                                newdata.ios_link = social_settings.settings.mobileapp[1].url[0].url;
                                                                                newdata.facebook_url = social_settings.settings.link[0].url;
                                                                                newdata.facebook_img = settings.settings.site_url + social_settings.settings.link[0].img;
                                                                                newdata.twitter_img = settings.settings.site_url + social_settings.settings.link[1].img;
                                                                                newdata.twitter_url = social_settings.settings.link[1].url;
                                                                                newdata.linkedin_url = social_settings.settings.link[2].url;
                                                                                newdata.linkedin_img = settings.settings.site_url + social_settings.settings.link[2].img;
                                                                                newdata.pinterest_url = social_settings.settings.link[3].url;
                                                                                newdata.pinterest_img = settings.settings.site_url + social_settings.settings.link[3].img;

                                                                                db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                                                    // mailData1 = {};
                                                                                    // mailData1.template = 'user_signupto_admin';
                                                                                    // mailData1.to = settings.settings.email_address;
                                                                                    // mailData1.html = [];
                                                                                    // mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                                                    // mailData1.html.push({ name: 'name', value: response.username || "" });
                                                                                    // mailcontent.sendmail(mailData1, function (err, response) {
                                                                                    //     //console.log('err, response', err, response)
                                                                                    // });
                                                                                    mailData = {};
                                                                                    mailData.template = 'user_signupto_user';
                                                                                    mailData.to = newdata.email;
                                                                                    mailData.html = [];
                                                                                    mailData.html.push({ name: 'name', value: newdata.username || "" });
                                                                                    mailData.html.push({ name: 'logo', value: newdata.logo || "" });
                                                                                    mailData.html.push({ name: 'site_url', value: newdata.site_url || "" });
                                                                                    mailData.html.push({ name: 'play_store', value: newdata.play_store || "" });
                                                                                    mailData.html.push({ name: 'android_link', value: newdata.android_link || "" });
                                                                                    mailData.html.push({ name: 'app_store', value: newdata.app_store || "" });
                                                                                    mailData.html.push({ name: 'ios_link', value: newdata.ios_link || "" });
                                                                                    mailData.html.push({ name: 'facebook_url', value: newdata.facebook_url || "" });
                                                                                    mailData.html.push({ name: 'facebook_img', value: newdata.facebook_img || "" });
                                                                                    mailData.html.push({ name: 'twitter_url', value: newdata.twitter_url || "" });
                                                                                    mailData.html.push({ name: 'twitter_img', value: newdata.twitter_img || "" });
                                                                                    mailData.html.push({ name: 'linkedin_url', value: newdata.linkedin_url || "" });
                                                                                    mailData.html.push({ name: 'linkedin_img', value: newdata.linkedin_img || "" });
                                                                                    mailData.html.push({ name: 'pinterest_url', value: newdata.pinterest_url || "" });
                                                                                    mailData.html.push({ name: 'pinterest_img', value: newdata.pinterest_img || "" });
                                                                                    mailcontent.sendmail(mailData, function (err, response) {
                                                                                        //console.log('err, response', err, response)
                                                                                    });
                                                                                });
                                                                                if (typeof req.session.passport == 'undefined') {
                                                                                    req.session.passport = {};
                                                                                }
                                                                                req.session.passport.header = authHeader;
                                                                                if (settings.settings.coupon_process == 'instant' && coupon && coupon != null && coupon != undefined && coupon.expires > new Date() && req.body.referral_code) {
                                                                                    var coupondata = {};
                                                                                    coupondata.discount_amount = coupon.discount_amount;
                                                                                    coupondata.cart_amount = coupon.cart_amount;
                                                                                    coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                                                                    db.UpdateDocument('users', { 'unique_code': req.body.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                                                                }
                                                                                if (req.body.referral_code && coupon && coupon != null) {
                                                                                    db.UpdateDocument('refer_coupon', { '_id': coupon._id }, { $inc: { refer_count: 1 } }, {}, function (err, referrer) { });
                                                                                }

                                                                                return done(null, {
                                                                                    "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                                                    "user_id": response._id,
                                                                                    "user_name": response.username,
                                                                                    "status": response.status,
                                                                                    "role": response.role,
                                                                                    "email": response.email,
                                                                                    "country_code": response.phone.code,
                                                                                    "phone_number": response.phone.number,
                                                                                    "unique_code": response.unique_code,
                                                                                    "refered_code": '',
                                                                                    "currency_code": settings.settings.currency_code,
                                                                                    "currency_symbol": settings.settings.currency_symbol,
                                                                                });
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    }
                                                })
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    }
                });
            });
        }));

    var socialdatas;

    var socialNet = await db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {})
    if (socialNet && socialNet.status) {

    } else {

    }

    db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (settings) {

        var settings = settings.doc
        passport.use(new GoogleStrategy({
            clientID: settings.settings.google_api.client_id,
            clientSecret: settings.settings.google_api.secret_key,
            callbackURL: settings.settings.google_api.callback
        }, function (token, refreshToken, profile, done) {
            // make the code asynchronous
            // User.findOne won't fire until we have all our data back from Google
            process.nextTick(function () {
                // try to find the user based on their google id
                var authHeader = jwtSign({ email: profile.emails[0].value });
                User.findOne({ $or: [{ 'social_login.google_id': profile.id }, { 'email': profile.emails[0].value }] }, function (err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        if (user.status == 0) {
                            return done(null, false, { message: 'unauthorised user.' });
                        } else {
                            var user_image = '';
                            if (user.avatar) {
                                user_image = settings.settings.site_url + user.avatar;

                            } else {
                                user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }

                            return done(null, {
                                "user": {
                                    user_image: user_image,
                                    user_id: user._id,
                                    status: user.status,
                                    role: user.role,
                                    user_name: user.username,
                                    email: user.email,
                                    unique_code: user.unique_code,
                                    message: "You are Logged In successfully",
                                    country_code: user.phone.code,
                                    phone_number: user.phone.number,
                                    'new_login': 0,
                                }, "header": authHeader
                            }, { message: 'Login Success' });
                        }
                    } else {
                        var googleuserName = profile.displayName;
                        var username = googleuserName.replace(/\s+/g, '').toLowerCase();
                        var email = profile.emails[0].value;
                        return done(null, {
                            "user": {
                                "user_image": profile.photos[0].value,
                                "user_name": username,
                                "email": email,
                                "last_name": username,
                                "social_login": 'google',
                                "social_id": profile.id,
                                "new_login": 1,
                            }, "header": authHeader
                        });
                    }
                });
            });
        }));
        passport.use(new FacebookStrategy({
            clientID: settings.settings.facebook_api.application_id,
            clientSecret: settings.settings.facebook_api.application_secret,
            callbackURL: settings.settings.facebook_api.callback,
            profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified', 'photos']
        }, function (req, token, refreshToken, profile, done) {
            process.nextTick(function () {
                User.findOne({ $or: [{ 'social_login.facebook_id': profile.id }, { 'email': profile.emails[0].value }] }, function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    var authHeader = jwtSign({ email: profile.emails[0].value });
                    if (user) {
                        if (user.status == 0) {
                            return done(null, false, { message: 'unauthorised user.' });
                        } else {
                            var user_image = '';
                            if (user.avatar) {
                                user_image = settings.settings.site_url + user.avatar;

                            } else {
                                user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }

                            return done(null, {
                                "user": {
                                    user_image: user_image,
                                    user_id: user._id,
                                    status: user.status,
                                    role: user.role,
                                    user_name: user.username,
                                    email: user.email,
                                    unique_code: user.unique_code,
                                    message: "You are Logged In successfully",
                                    country_code: user.phone.code,
                                    phone_number: user.phone.number,
                                    'new_login': 0,
                                }, "header": authHeader
                            }, { message: 'Login Success' });
                        }
                    } else {
                        var facebookuserName = profile.name.givenName + ' ' + profile.name.familyName;
                        var username = facebookuserName.replace(/\s+/g, '').toLowerCase();
                        var email = profile.emails[0].value;
                        var last_name = profile.name.familyName;
                        return done(null, {
                            "user": {
                                "user_image": profile.photos[0].value,
                                "user_name": username,
                                "email": email,
                                "last_name": last_name,
                                "social_login": 'facebook',
                                "social_id": profile.id,
                                "new_login": 1,
                            }, "header": authHeader
                        });
                    }
                });
            });
        }));
    });

    passport.use('driver-register', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'pwd',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    }, function (req, email, pwd, done, res) {
        process.nextTick(function () {
            var data = {};
            var message = '';
            req.checkBody('first_name', 'first_name is required').notEmpty();
            req.checkBody('email', 'email is required').isEmail();
            req.checkBody('city', 'city is required').notEmpty();
            req.checkBody('vehicle_type', 'Vehicle type is required').notEmpty();
            req.checkBody('phone', 'phone number is required').notEmpty();
            req.checkBody('pwd', 'password is required').optional();
            var errors = req.validationErrors();
            if (errors) {
                return done(errors[0].msg, false, null);
            }
            req.sanitizeBody('pwd').trim();
            req.sanitizeBody('first_name').trim();
            req.sanitizeBody('email').trim();
            // req.sanitizeBody('phone').trim();
            req.sanitizeBody('city').trim();
            req.sanitizeBody('vehicle_type').trim();
            var request = {};
            data.phone = {};
            data.phone.code = req.body.phone.code;
            data.phone.number = req.body.phone.number;
            data.email = req.body.email;
            data.username = req.body.first_name || "";
            data.city = req.body.city;
            data.vehicle_type = req.body.vehicle_type;
            data.password = req.body.pwd;
            data.currentStatus = 0;
            data.currentJob = 0;
            data.role = 'driver';
            data.status = '1';
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err || !settings) {
                    return done('Configure your website settings', false, null);
                } else {
                    db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                        if (err || !social_settings) {
                            return done('Configure your website settings', false, null);
                        } else {
                            db.GetDocument('drivers', { "phone.number": data.phone.number }, {}, {}, function (err, phonedocs) {
                                if (err) {
                                    return done(null, false, { message: "Something Went Wrong..!!" });
                                } else {
                                    if (phonedocs.length != 0) {
                                        return done(null, false, { message: "email-ID / Phone number already exists..!" });
                                    } else {
                                        var newdata = { phone: {} };
                                        newdata.username = data.username;
                                        newdata.main_city = data.city;
                                        newdata.category = data.vehicle_type;
                                        newdata.password = bcrypt.hashSync(data.password, bcrypt.genSaltSync(8), null);
                                        newdata.unique_code = library.randomString(8, '#A');
                                        newdata.role = 'driver';
                                        newdata.email = data.email;
                                        newdata.currentJob = data.currentJob;
                                        newdata.currentStatus = data.currentStatus;

                                        newdata.status = 3;
                                        newdata.phone.code = data.phone.code;
                                        newdata.phone.number = data.phone.number;
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            db.InsertDocument('drivers', newdata, function (err, response) {
                                                if (err) {
                                                    return done(null, false, { message: "email-ID / Phone number already exists..!" });
                                                }
                                                else {

                                                    newdata.logo = settings.settings.site_url + settings.settings.logo;
                                                    newdata.site_url = settings.settings.site_url;
                                                    newdata.play_store = settings.settings.site_url + social_settings.settings.mobileapp[0].landingimg;
                                                    newdata.android_link = social_settings.settings.mobileapp[0].url[1].url;
                                                    newdata.app_store = settings.settings.site_url + social_settings.settings.mobileapp[1].landingimg;
                                                    newdata.ios_link = social_settings.settings.mobileapp[1].url[1].url;
                                                    newdata.facebook_url = social_settings.settings.link[0].url;
                                                    newdata.facebook_img = settings.settings.site_url + social_settings.settings.link[0].img;
                                                    newdata.twitter_img = settings.settings.site_url + social_settings.settings.link[1].img;
                                                    newdata.twitter_url = social_settings.settings.link[1].url;
                                                    newdata.linkedin_url = social_settings.settings.link[2].url;
                                                    newdata.linkedin_img = settings.settings.site_url + social_settings.settings.link[2].img;
                                                    newdata.pinterest_url = social_settings.settings.link[3].url;
                                                    newdata.pinterest_img = settings.settings.site_url + social_settings.settings.link[3].img;

                                                    db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                        mailData1 = {};
                                                        mailData1.template = 'driver_signupto_admin';
                                                        mailData1.to = settings.settings.email_address;
                                                        mailData1.html = [];
                                                        mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                        mailData1.html.push({ name: 'city', value: response.main_city || "" });
                                                        mailData1.html.push({ name: 'vehicle', value: response.category || "" });
                                                        mailData1.html.push({ name: 'name', value: response.username || "" });
                                                        mailcontent.sendmail(mailData1, function (err, response) {
                                                        });
                                                    });

                                                    mailData = {};
                                                    mailData.template = 'driver_signupto_driver';
                                                    mailData.to = newdata.email;
                                                    mailData.html = [];
                                                    mailData.html.push({ name: 'name', value: newdata.username || "" });
                                                    mailData.html.push({ name: 'logo', value: newdata.logo || "" });
                                                    mailData.html.push({ name: 'site_url', value: newdata.site_url || "" });
                                                    mailData.html.push({ name: 'play_store', value: newdata.play_store || "" });
                                                    mailData.html.push({ name: 'android_link', value: newdata.android_link || "" });
                                                    mailData.html.push({ name: 'app_store', value: newdata.app_store || "" });
                                                    mailData.html.push({ name: 'ios_link', value: newdata.ios_link || "" });
                                                    mailData.html.push({ name: 'facebook_url', value: newdata.facebook_url || "" });
                                                    mailData.html.push({ name: 'facebook_img', value: newdata.facebook_img || "" });
                                                    mailData.html.push({ name: 'twitter_url', value: newdata.twitter_url || "" });
                                                    mailData.html.push({ name: 'twitter_img', value: newdata.twitter_img || "" });
                                                    mailData.html.push({ name: 'linkedin_url', value: newdata.linkedin_url || "" });
                                                    mailData.html.push({ name: 'linkedin_img', value: newdata.linkedin_img || "" });
                                                    mailData.html.push({ name: 'pinterest_url', value: newdata.pinterest_url || "" });
                                                    mailData.html.push({ name: 'pinterest_img', value: newdata.pinterest_img || "" });
                                                    mailcontent.sendmail(mailData, function (err, response) {
                                                    });
                                                    return done(null, {
                                                        "status": '1',
                                                        "message": 'Successfully registered',
                                                        "driver_id": response._id,
                                                        "user_name": response.username,
                                                        "email": response.email,
                                                        "phone_number": response.phone.number
                                                    }, { message: "Successfully registered" });
                                                }
                                            })
                                        })

                                    }
                                }
                            })
                        }
                    })
                }
            })
        })
    }));

    passport.use('local-driver-login', new LocalStrategy(
        {
            usernameField: 'phone_number',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, phone_number, password, done) {
            process.nextTick(function () {
                var authHeader = jwtSign({ phone_number: phone_number });

                var errors = [];
                req.checkBody('country_code', 'country_code is required').notEmpty();
                req.checkBody('phone_number', 'phone_number is required').notEmpty();
                req.checkBody('password', 'password is required').notEmpty();

                errors = req.validationErrors();
                if (errors) {
                    return done(errors[0].msg, false, null);
                    return;
                }

                /* var data = {};
     
                data.email = req.body.email;
                data.password = req.body.password;
                data.gcm = req.body.gcm_id; */

                var validPassword = function (password, passwordb) {
                    return bcrypt.compareSync(password, passwordb);
                };

                db.GetDocument('drivers', { "email": req.body.email }, {}, {}, function (err, phonedocs) {
                    if (err) {

                        return done("Something Went Wrong..!!", false, null);
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
                            if (err) {

                                return done("Something Went Wrong..!!", false, null);
                            } else {

                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err) {

                                        return done("Please check the email and try again..!!", false, null);
                                    } else {
                                        db.GetDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code, 'status': { $in: [0, 1, 2, 3] } }, {}, {}, function (err, docs) {
                                            if (err || !docs[0]) {
                                                return done("Please check the phone number and try again..!!", false, null);
                                            } else {
                                                if (docs[0].status == 0) {
                                                    return done(null, false, { message: 'Your account has been deleted..Please contact administrator for further details' });
                                                }
                                                else if (docs[0].status == 2) {
                                                    return done(null, false, { message: 'Your account is inactive...Please contact administrator for further details' });
                                                }
                                                /*  else if (docs[0].status == 3) {
                                                     return done(null, false, { message: 'Your account needs to be verified by admin...Please contact administrator for further details' });
                                                 } */
                                                else {


                                                    if (!docs[0].password || docs[0].password.length == 0) {

                                                        return done("Please try again with your social login..!!", false, null);
                                                    } else {

                                                        if (validPassword(req.body.password, docs[0].password)) {
                                                            if (docs[0].status == 1 || docs[0].status == 3) {
                                                                db.UpdateDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                                                    if (err || response.nModified == 0) {

                                                                        return done("Please check the phone number and try again..!!", false, null);
                                                                    } else {

                                                                        db.UpdateDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, { 'activity.last_login': new Date() }, {}, function (err, response) {

                                                                            if (err || response.nModified == 0) {
                                                                                return done("Please check the phone number and try again..!!", false, null);
                                                                            } else {
                                                                                var driver_image = '';

                                                                                if (docs[0].avatar) {
                                                                                    driver_image = settings.settings.site_url + docs[0].avatar;
                                                                                } else {
                                                                                    driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                                }
                                                                                if (typeof req.session.passport == 'undefined') {
                                                                                    req.session.passport = {};
                                                                                }
                                                                                req.session.passport.header = authHeader;
                                                                                return done(null, {
                                                                                    status: '1',
                                                                                    driver_image: driver_image,
                                                                                    driver_id: docs[0]._id,
                                                                                    driver_name: docs[0].username,
                                                                                    email: docs[0].email,
                                                                                    message: "You are Logged In successfully",
                                                                                    currency_code: settings.settings.currency_code,
                                                                                    currency_symbol: settings.settings.currency_symbol,
                                                                                    referal_code: docs[0].unique_code || "",
                                                                                    refered_code: '',
                                                                                    location_name: docs[0].address.city || "",
                                                                                    country_code: docs[0].phone.code,
                                                                                    phone_number: docs[0].phone.number,

                                                                                })

                                                                            }
                                                                        });

                                                                    }
                                                                });
                                                            } else {
                                                                if (docs[0].status == 0) {

                                                                    return done("Your account is currently unavailable..!!", false, null);
                                                                } else {

                                                                    return done("Your account need to be verified by admin..!!", false, null);
                                                                }
                                                            }
                                                        } else {

                                                            return done("Password is invalid", false, null);
                                                        }
                                                    }
                                                }
                                            }
                                        });

                                    }
                                });
                            }
                        });
                    }
                });
            });
        }));

    passport.use('local-driver-login-otp', new LocalStrategy(
        {
            usernameField: 'phone_number',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, phone_number, password, done) {
            process.nextTick(function () {
                var errors = [];
                req.checkBody('country_code', 'country_code is required').notEmpty();
                req.checkBody('phone_number', 'phone_number is required').notEmpty();
                req.checkBody('password', 'password is required').notEmpty();
                errors = req.validationErrors();
                if (errors) {
                    return done(null, false, { message: errors[0].msg });
                }
                var validPassword = function (password, passwordb) {
                    return bcrypt.compareSync(password, passwordb);
                };
                db.GetOneDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, driverdocs) {
                    if (err) {
                        return done(null, false, { message: "Something Went Wrong..!!" });
                    } else {
                        if (driverdocs && typeof driverdocs._id != 'undefined') {
                            if (driverdocs.status == 1) {
                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err) {
                                        return done(null, false, { message: "Something Went Wrong..!!" });
                                    } else {
                                        if (req.body.password) {
                                            if (!driverdocs.verify_otp || driverdocs.verify_otp.length == 0) {
                                                return done(null, false, { message: 'Please try again with your social login' });
                                            } else {
                                                if (req.body.password == driverdocs.verify_otp) {
                                                    db.UpdateDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                                        if (err || response.nModified == 0) {
                                                            return done(null, false, { message: 'Please check the phone number and try again' });
                                                        } else {
                                                            var driver_image = '';
                                                            if (driverdocs.avatar) {
                                                                driver_image = settings.settings.site_url + driverdocs.avatar;

                                                            } else {
                                                                driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                            }
                                                            var authHeader = jwtSign({ email: driverdocs.email });
                                                            if (typeof req.session.passport == 'undefined') {
                                                                req.session.passport = {};
                                                            }
                                                            req.session.passport.header = authHeader;
                                                            return done(null, {
                                                                status: '1',
                                                                driver_image: driver_image,
                                                                driver_id: driverdocs._id,
                                                                driver_name: driverdocs.username,
                                                                email: driverdocs.email,
                                                                message: "You are Logged In successfully",
                                                                currency_code: settings.settings.currency_code,
                                                                currency_symbol: settings.settings.currency_symbol,
                                                                referal_code: driverdocs.unique_code || "",
                                                                refered_code: '',
                                                                location_name: driverdocs.address.city || "",
                                                                country_code: driverdocs.phone.code,
                                                                phone_number: driverdocs.phone.number,

                                                            }, { message: 'Login Success' });
                                                        }
                                                    });
                                                } else {
                                                    return done(null, false, { message: 'Password is invalid' });
                                                }
                                            }
                                        }
                                    }
                                })
                            } else {
                                if (driverdocs.status == 0) {
                                    return done(null, false, { message: 'Your account is currently unavailable' });
                                } else {
                                    return done(null, false, { message: 'Your account is inactive... Please contact administrator for further details' });
                                }
                            }
                        } else {
                            return done(null, false, { message: "Sorry, your mobile number is not registered with us." });
                        }
                    }
                })
            });
        }));

};


