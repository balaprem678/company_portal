"use strict";

var path = require('path');
var jwt = require('jsonwebtoken');
var CONFIG = require('../config/config');
var db = require('../controller/adaptor/mongodb.js');
const axios = require('axios');
const { check, body, validationResult, sanitizeBody } = require('express-validator');

var apikey = "";
function isAdminAuth(req, res, next) {
    try {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.send('wrong');
        }
    } catch (ex) {
        console.log("Login authenticate error", ex);
    }
}

function isSiteAuth(req, res, next) {
    try {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.send('wrong');
        }
    } catch (ex) {
        console.log("Login authenticate error", ex);
    }
}

function validationLoginUser(req, res, next) {
    return next();
}

module.exports = function (app, passport, io) {

    try {
        app.get('/getIP', (req, res) => {
            console.log("khkeshiwe")
            axios.get("http://ipinfo.io/json", { json: true }).then((response) => {
                console.log(response.code)
                return res.json(response.data);
            })
        });
        require('./auth.js')(passport, io);
        app.get('/admin', function (req, res) {
            var settings = {};
            db.GetOneDocument('settings', { "alias": "social_networks" }, {}, {}, (err, socialsettings) => {
                settings.googleMapAPI = socialsettings.settings.map_api && socialsettings.settings.map_api.web_key || '';
                res.render('admin/layout', settings);
            })
        });
        // app.post('/admin', passport.authenticate('adminLogin', {
        //     successRedirect: '/admin-success',
        //     failureRedirect: '/admin-logouts',
        //     failureFlash: true
        // }));

        app.post('/admin', [check('username').notEmpty().withMessage("Username should not be empty"),
        check('password').notEmpty().withMessage("Password should not be empty")
        ],
            (req, res, next) => {
                // Check validation.
                const errors = validationResult(req).array();
                console.log(errors[0], "errors of error");
                if (errors && errors.length > 0) {
                    // errors.array().forEach(err => req.flash('error', err.msg));
                    return res.send({ status: false, message: errors[0].msg });
                }
                next();
            }, function (req, res, next) {
                passport.authenticate('adminLogin', function (err, user, info) {
                    if (err || !user) {
                        res.send({ message: info });
                    } else {
                        res.send({ message: info, data: user });
                    }
                })(req, res, next)
            });


        app.post('/site', passport.authenticate('local-site-login', {
            successRedirect: '/site-success',
            failureRedirect: '/site-failure',
            failureFlash: true

        }));
        // app.post('/site-user-login', passport.authenticate('local-site-user-login', {
        //     successRedirect: '/site-user-success',
        //     failureRedirect: '/site-failure',
        //     failureFlash: true

        // }));
        // app.post('/site-user-login-otp', passport.authenticate('local-site-user-login-otp', {
        //     successRedirect: '/site-user-success',
        //     failureRedirect: '/site-failure',
        //     failureFlash: true
        // }));

        // user login updated
        // req.checkBody('country_code', 'country_code is required').notEmpty();
        // req.checkBody('phone_number', 'phone_number is required').notEmpty()
        app.post('/site-user-login', [check('phone_number').notEmpty().withMessage("Phone number should not be empty")],
            (req, res, next) => {
                // Check validation.
                const errors = validationResult(req).array();
                console.log(errors, "errors of error");
                if (errors && errors.length > 0) {
                    // errors.array().forEach(err => req.flash('error', err.msg));
                    return res.send({ status: false, message: errors[0].msg });
                }
                next();
            }, function (req, res, next) {
                passport.authenticate('local-site-user-login', function (err, user, info) {
                    console.log("sssssssssssssssssssaaaaaaaaaaaasssssssssssss", user, err);

                    if (err) {

                        res.send({ message: info, error: true });
                    } else {
                        if (!user) {

                            res.send({
                                message: info, error: true,
                                mobileMessage: info.message
                            });
                        } else {
                            res.send({ message: info.message, data: user, error: false });
                        }

                    }
                })(req, res, next)
            });


        app.post('/site-user-login-otp', function (req, res, next) {
            passport.authenticate('local-site-user-login-otp', function (err, user, info) {
                if (err || !user) {
                    res.send({ message: info });
                } else {
                    res.send({ message: info, data: user });
                }
            })(req, res, next)
        });


        app.get('/admin-logouts', function (req, res) {
            res.cookie('username', 'wrong');
            res.send({ status: 0, message: req.session.flash.error });
        });

        app.get('/admin-success', isAdminAuth, function (req, res) {
            res.cookie('username', req.session.passport.header);
            res.send({ status: 1, data: { user: req.session.passport.user.username, _id: req.session.passport.user._id, token: req.session.passport.header, role: req.session.passport.user.role }, message: "Successfully Loged In." });
        });

        app.get('/driver-success', isSiteAuth, function (req, res) {
            global.name = req.session.passport.user.driver_id;
            //console.log(req.session.passport.user)
            res.cookie('username', req.session.passport.header || req.session.passport.user.token);
            res.send({ user: req.session.passport.user.driver_name, email: req.session.passport.user.email, user_id: req.session.passport.user.driver_id, token: req.session.passport.header, user_type: req.session.passport.user.role, status: req.session.passport.user.status, avatar: req.session.passport.user.driver_image });
        })
        app.get('/site-success', isSiteAuth, function (req, res) {

            global.name = req.session.passport.user._id;
            res.cookie('username', req.session.passport.header || req.session.passport.user.token);
            res.send({ user: req.session.passport.user.username, email: req.session.passport.user.email, user_id: req.session.passport.user._id, token: req.session.passport.header, user_type: req.session.passport.user.role, status: req.session.passport.user.status });
        });
        app.get('/site-driver-register', isSiteAuth, function (req, res) {
            global.name = req.session.passport.user._id;
            res.send({ user: req.session.passport.user.username, email: req.session.passport.user.email, user_id: req.session.passport.user._id, token: req.session.passport.header, user_type: req.session.passport.user.role, status: req.session.passport.user.status });
        })
        app.post('/driver', passport.authenticate('local-driver-login', {
            successRedirect: '/driver-success',
            failureRedirect: '/driver-failure',
            failureFlash: true

        }));
        app.post('/driver-login-otp', passport.authenticate('local-driver-login-otp', {
            successRedirect: '/driver-success',
            failureRedirect: '/driver-failure',
            failureFlash: true

        }));
        app.get('/site-user-success', isSiteAuth, function (req, res) {
            global.name = req.session.passport.user.user_id;
            res.cookie('username', req.session.passport.header || req.session.passport.user.token);
            res.send({ user: req.session.passport.user.user_name, email: req.session.passport.user.email, user_id: req.session.passport.user.user_id, token: req.session.passport.header, user_type: req.session.passport.user.role, status: req.session.passport.user.status, 'user_image': req.session.passport.user.user_image, 'country_code': req.session.passport.user.country_code, 'phone_number': req.session.passport.user.phone_number, referal_code: req.session.passport.user.referal_code, currency_code: req.session.passport.user.currency_code, currency_symbol: req.session.passport.user.currency_symbol, otp_status: req.session.passport.user.otp_status, unique_code: req.session.passport.user.unique_code, err: 0, message: "" });
        });

        app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));
        app.get('/auth/facebook/callback',
            passport.authenticate('facebook', {
                successRedirect: '/auth/success',
                failureRedirect: '/auth/failure',
                failureFlash: true
            }));


        app.get('/auth/success', function (req, res) {
            global.name = req.session.passport.user.user.user_id;
            res.cookie('username', req.session.passport.header || req.session.passport.user.user.header);
            res.render('after_auth', { user_name: req.session.passport.user.user.user_name, email: req.session.passport.user.user.email, user_id: req.session.passport.user.user.user_id, token: req.session.passport.header, user_type: req.session.passport.user.user.role, status: req.session.passport.user.user.status, unique_code: req.session.passport.user.user.unique_code, 'user_image': req.session.passport.user.user.user_image, 'country_code': req.session.passport.user.user.country_code, 'phone_number': req.session.passport.user.user.phone_number, referal_code: req.session.passport.user.user.referal_code, currency_code: req.session.passport.user.user.currency_code, currency_symbol: req.session.passport.user.user.currency_symbol, new_login: req.session.passport.user.user.new_login, social_login: req.session.passport.user.user.social_login, social_id: req.session.passport.user.user.social_id, last_name: req.session.passport.user.user.last_name, err: 0 });
        });
        app.get('/auth/failure', function (req, res) {
            var error = '';
            if (typeof req.session.flash != 'undefined' && typeof req.session.flash.error != 'undefined') {
                error = req.session.flash.error;
            }
            delete req.session.flash.error;
            res.render('auth_fail', { err: error });
        });
        app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
        app.get('/auth/google/callback',
            passport.authenticate('google', {
                successRedirect: '/auth/success',
                failureRedirect: '/auth/failure',
                failureFlash: true
            }));


        app.get('/site-failure', function (req, res) {
            var error = req.session.flash.error[0];
            req.session.destroy(function (err) {
                res.send(JSON.stringify(error));
            });
        });
        app.get('/site-rest-register-failure', function (req, res) {
            var error = req.session.flash.error[0];
            req.session.destroy(function (err) {
                res.send({ status: 0, message: error });
            });
        });
        app.get('/site-driver-register-failure', function (req, res) {
            var error = req.session.flash.error[0];
            req.session.destroy(function (err) {
                res.send({ status: 0, message: error });
            });
        });
        app.get('/driver-failure', function (req, res) {
            var error = req.session.flash.error[0];
            req.session.destroy(function (err) {
                res.send(JSON.stringify(error));
            });
        });

        // site logout updated 
        app.post('/site-logout', async function (req, res) {
            var roles = req.body.currentUser.user_type;
            var userid = req.body.currentUser.user_id;
            var model = (roles == 'user')
            if (roles == 'user') {
                model = 'users'
            } else if (roles == 'restaurant') {
                model = 'restaurant'
            }
            else if (roles == 'driver') {
                model = 'drivers'
            }
            const response = await db.UpdateDocument(model, { '_id': userid }, { 'activity.last_logout': new Date() }, {})
            if (response.status) {
                req.session.destroy(function (err) {
                    res.send('success');
                });
            } else {
                console.log(response.message);
                res.send(response.message);

            }
            // db.UpdateDocument(model, { '_id': userid }, { 'activity.last_logout': new Date() }, {}, function (err, response) {
            //     req.session.destroy(function (err) {
            //         res.send('success');
            //     });
            // });
        });

        app.post('/site-driver-logout', function (req, res) {
            var roles = req.body.currentUser.user_type;
            var userid = req.body.currentUser.user_id;
            var model = 'drivers'
            db.UpdateDocument(model, { '_id': userid }, { 'activity.last_logout': new Date() }, {}, function (err, response) {
                req.session.destroy(function (err) {
                    res.send('success');
                });
            });
        })


        app.get('/admin-logout', function (req, res) {
            req.session.destroy(function (err, respo) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.send({
                        retStatus: "Success",
                        redirectTo: '/admin',
                        msg: 'Just go there please'
                    });
                }
            });
        });


        app.post('/siteregister', validationLoginUser, passport.authenticate('site-register', {
            successRedirect: '/site-success',
            failureRedirect: '/site-rest-register-failure',
            failureFlash: true
        }));

        // app.post('/siteuserregister', validationLoginUser, passport.authenticate('site-user-register', {
        //     successRedirect: '/site-user-success',
        //     failureRedirect: '/site-failure',
        //     failureFlash: true
        // }));
        app.post('/siteuserregister', [check('first_name').notEmpty().withMessage("First name should be required"), check('last_name').notEmpty().withMessage("Last name should be required"), check('email').isEmail().withMessage("Email should be valid"), check('phone').notEmpty().withMessage("Country code and phone number should be required")],
            (req, res, next) => {
                // Check validation.
                const errors = validationResult(req).array();
                console.log(errors[0]);
                if (errors && errors.length > 0) {
                    // errors.array().forEach(err => req.flash('error', err.msg));
                    return res.send({ status: false, message: errors[0].msg });
                }
                next();
            }, function (req, res, next) {
                passport.authenticate('site-user-register', function (err, user, info) {

                    if (err || !user) {
                        res.send({ message: info, error: true });
                    } else {
                        res.send({ message: info.message, error: false, data: user });
                    }
                })(req, res, next)
            });

        app.post('/siteuserregisterotp', validationLoginUser, passport.authenticate('site-user-register-otp', {
            successRedirect: '/site-user-success',
            failureRedirect: '/site-failure',
            failureFlash: true
        }));
        app.post('/siteuserregisterotp', validationLoginUser, function (req, res, next) {
            passport.authenticate('site-user-register-otp', function (err, user, info) {
                if (err || !user) {
                    res.send({ message: info });
                } else {
                    res.send({ message: info, data: user });
                }
            })(req, res, next)
        });

        app.post('/driverRegister', validationLoginUser, passport.authenticate('driver-register', {
            successRedirect: '/site-driver-register',
            failureRedirect: '/site-driver-register-failure',
            failureFlash: true
        }));
        if (CONFIG.MOBILE_API) {
            var mobile = require('../routes/mobile.js')(app, io);
        }

        var site = require('../routes/site.js')(app, io);
        var admin = require('../routes/admin.js')(app, io);
        // app.get('/*', function (req, res) {
        //     var current_url = require('url').parse(req.url);
        //     db.GetDocument('settings', { "alias": { "$in": ["general", "seo", "social_networks", "widgets"] } }, {}, {}, function (err, docdata) {
        //         if (err) {
        //             res.sendFile(path.join(__dirname, '../app/site/modules/common/views/siteundermaintenance.html'));
        //         } else {
        //             if (typeof docdata[0].settings != 'undefined' && typeof docdata[0].settings.site_publish != 'undefined' && docdata[0].settings.site_publish == '0') {
        //                 res.sendFile(path.join(__dirname, '../app/site/modules/common/views/siteundermaintenance.html'));
        //             } else {
        //                 var current_url = require('url').parse(req.url);
        //                 var segmant = current_url.pathname.split('/');
        //                 var segmant2 = '';
        //                 if (typeof segmant != 'undefined' && segmant.length > 1) {
        //                     segmant2 = segmant[1];
        //                 }
        //                 var segmant3 = '';
        //                 if (typeof segmant != 'undefined' && segmant.length > 2) {
        //                     segmant3 = segmant[2];
        //                 }
        //                 if (segmant2 == 'page' && segmant3 != '') {
        //                     console.log("map", docdata[2].settings.map_api)
        //                     db.GetOneDocument('pages', { slug: segmant3, status: 1 }, {}, {}, function (err, pagedetails) {
        //                         if (pagedetails && typeof pagedetails != 'undefined' && typeof pagedetails._id != 'undefined') {
        //                             var settings = {};

        //                             var seo_title = docdata[1].settings.seo_title;
        //                             if (typeof pagedetails.seo != 'undefined' && typeof pagedetails.seo.title != 'undefined' && pagedetails.seo.title != '') {
        //                                 seo_title = pagedetails.seo.title;
        //                             }
        //                             var meta_description = docdata[1].settings.meta_description;
        //                             if (typeof pagedetails.seo != 'undefined' && typeof pagedetails.seo.description != 'undefined' && pagedetails.seo.description != '') {
        //                                 meta_description = pagedetails.seo.description;
        //                             }
        //                             settings.title = docdata[1].settings.seo_title;
        //                             settings.description = docdata[1].settings.meta_description;
        //                             settings.image = docdata[0].settings.site_url + docdata[1].settings.og_image;
        //                             settings.siteUrl = docdata[0].settings.site_url;
        //                             settings.footer_logo = docdata[0].settings.footer_logo;
        //                             settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
        //                             settings.googleMapAPI = docdata[2].settings.map_api && docdata[2].settings.map_api.web_key || '';
        //                             settings.widgets = docdata[3].settings;
        //                             res.render('site/layout', settings);
        //                         } else {
        //                             var settings = {};
        //                             settings.title = docdata[1].settings.seo_title;
        //                             settings.description = docdata[1].settings.meta_description;
        //                             settings.image = docdata[0].settings.site_url + docdata[1].settings.og_image;
        //                             settings.siteUrl = docdata[0].settings.site_url;
        //                             settings.footer_logo = docdata[0].settings.footer_logo;
        //                             settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
        //                             settings.googleMapAPI = docdata[2].settings.map_api && docdata[2].settings.map_api.web_key || '';
        //                             settings.widgets = docdata[3].settings;
        //                             res.render('site/layout', settings);
        //                         }
        //                     })
        //                 } else {
        //                     var settings = {};
        //                     settings.title = docdata[1].settings.seo_title;
        //                     settings.description = docdata[1].settings.meta_description;
        //                     settings.image = docdata[0].settings.site_url + docdata[1].settings.og_image;
        //                     settings.siteUrl = docdata[0].settings.site_url;
        //                     settings.footer_logo = docdata[0].settings.footer_logo;
        //                     settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
        //                     settings.googleMapAPI = docdata[2].settings.map_api && docdata[2].settings.map_api.web_key || '';
        //                     settings.widgets = docdata[3].settings;
        //                     res.render('site/layout', settings);
        //                 }

        //             }
        //         }
        //     });
        // });
    } catch (e) {
        console.log('Error in Router', e);
    }
};