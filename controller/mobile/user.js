//"use strict";

const e = require('connect-flash');
const { category } = require('../../model/mongodb.js');
const { body, validationResult } = require('express-validator');
module.exports = function (io) {
    var bcrypt = require('bcrypt-nodejs');
    var async = require("async");
    var GoogleAPI = require('../../model/googleapis.js');
    var mongoose = require("mongoose");
    var db = require('../adaptor/mongodb.js');
    var twilio = require('../../model/twilio.js');
    var library = require('../../model/library.js');
    var crypto = require('crypto');
    var controller = {};
    // var otp = require('otplib/lib/authenticator');
    var otp = require('otplib');
    otp.options = { crypto };
    var fs = require("fs");
    var attachment = require('../../model/attachments.js');
    var middlewares = require('../../model/middlewares.js');
    var Jimp = require("jimp");
    var path = require('path');
    var moment = require("moment");
    var CONFIG = require('../../config/config');
    var push = require('../../model/pushNotification.js')(io);
    var mailcontent = require('../../model/mailcontent.js');
    var timezone = require('moment-timezone');
    var htmlToText = require('html-to-text');
    var jwt = require('jsonwebtoken');
    var each = require('sync-each');
    var deg2rad = require('deg2rad');
    var distance = require('google-distance-matrix');

    function jwtSign(payload) {
        var token = jwt.sign(payload, CONFIG.SECRET_KEY);
        return token;
    }
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }
    var geoTz = require('geo-tz'),
        tz = require('moment-timezone');
    // controller.loginVerifyPhone = function (req, res) {
    //     console.log("req.body");
    //     console.log(req.body);
        
    //     req.checkBody('phone_number', 'phone_number is required').notEmpty();
    //     req.checkBody('country_code', 'country_code is required').notEmpty();
    //     var errors = req.validationErrors();
    //     if (errors) {
    //         res.send({ "status": "0", "errors": errors[0].msg });
    //         return;
    //     }
    //     var otp = Math.floor(1000 + Math.random() * 9000);
    //     db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
    //         if (err) {
    //             res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
    //         } else {
    //             db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smsSettings) {
    //                 if (err) {
    //                     res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
    //                 } else {
    //                     var data = {};
    //                     data.mode = 0;
    //                     data.otp = otp;
    //                     var to = `${req.body.country_code}${req.body.phone_number}`;
    //                     var message = otp + ' is your ' + generalSettings.settings.site_title + ' OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
    //                     if (smsSettings.settings.twilio.mode == "production") {
    //                         data.mode = 1;
    //                         twilio.createMessage(to, '', message, function (err, response) { });
    //                     }
    //                     res.send({
    //                         "status": 1,
    //                         "message": "We've sent an OTP to the mobile number " + req.body.phone_number + ". Please enter it below to complete verification.",
    //                         "data": data
    //                     });
    //                 }
    //             })
    //         }
    //     })
    // };


    controller.loginVerifyPhone = [
        // Validation and sanitization middleware
        body('phone_number')
            .notEmpty().withMessage('phone_number is required')
            .isMobilePhone().withMessage('Invalid phone number'),
        body('country_code')
            .notEmpty().withMessage('country_code is required')
            .isNumeric().withMessage('Invalid country code'),
    
        // Your controller logic
        function (req, res) {
            console.log("req.body");
            console.log(req.body);
    
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.send({ "status": "0", "errors": errors.array()[0].msg });
            }
    
            var otp = Math.floor(1000 + Math.random() * 9000);

            console.log(otp,"otpotpotp");
            
    
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
                console.log("dddddddddddd");
                
                if (err) {
                    return res.send({ "status": 0, "message": 'Something went wrong. Please try again...' });
                }
    
                db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smsSettings) {
                    if (err) {
                        return res.send({ "status": 0, "message": 'Something went wrong. Please try again...' });
                    }
    console.log("ddddddddddddddddd");
    
                    var data = {};
                    data.mode = 0;
                    data.otp = otp;
    
                    var to = `${req.body.country_code}${req.body.phone_number}`;
                    var message = `${otp} is your ${generalSettings.settings.site_title} OTP. OTP is confidential. For security reasons, DO NOT share this OTP with anyone.`;
    
                    if (smsSettings.settings.twilio.mode == "production") {
                        data.mode = 1;
                        twilio.createMessage(to, '', message, function (err, response) { });
                    }
    
                    return res.send({
                        "status": 1,
                        "message": `We've sent an OTP to the mobile number ${req.body.phone_number}. Please enter it below to complete verification.`,
                        "data": data
                    });
                });
            });
        }
    ];
    controller.SubmitOtpVerify = function (req, res) {

        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        req.checkBody('country_code', 'country_code is required').notEmpty();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm id is required').optional();
        req.checkBody('lat', 'lat is required').optional();
        req.checkBody('lon', 'lon is required').optional();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        var newdata = {};
        newdata.phone_number = req.body.phone_number;
        newdata.country_code = req.body.country_code;
        newdata.token = req.body.deviceToken;
        newdata.gcm = req.body.gcm_id;
        newdata.lat = req.body.lat || 13.0573773;
        newdata.lon = req.body.lon || 80.2532674;

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
            if (err) {
                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
            } else {
                db.GetOneDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, userData) {
                    if (err) {
                        res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                    } else {
                        if (userData && typeof userData._id != 'undefined') {
                            if (userData.status == 1) {
                                var location = {};
                                location.lng = newdata.lon;
                                location.lat = newdata.lat;
                                var updateData = {};
                                if (newdata.token) {
                                    updateData = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': newdata.token, 'activity.last_login': new Date(), 'location': location };
                                } else {
                                    updateData = { 'device_info.device_type': 'android', 'device_info.gcm': newdata.gcm, 'device_info.device_token': '', 'activity.last_login': new Date(), 'location': location };
                                }
                                db.UpdateDocument('users', { "phone.number": newdata.phone_number, "phone.code": newdata.country_code, 'status': { $eq: 1 } }, updateData, {}, function (err, response) {
                                    if (err || response.nModified == 0) {
                                        res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                                    } else {
                                        var data = { user_Data: {} };
                                        data.user_Data.user_image = userData.avatar;
                                        data.user_Data.user_id = userData._id;
                                        data.user_Data.user_name = userData.username;
                                        data.user_Data.last_name = userData.last_name;
                                        data.user_Data.email = userData.email,
                                            data.user_Data.message = 'You are Logged In successfully',
                                            data.user_Data.currency_code = generalSettings.settings.currency_code,
                                            data.user_Data.currency_symbol = generalSettings.settings.currency_symbol,
                                            data.user_Data.referal_code = userData.unique_code || "",
                                            data.user_Data.refered_code = '',
                                            data.user_Data.location_name = userData.address.city || "",
                                            data.user_Data.country_code = userData.phone.code,
                                            data.user_Data.phone_number = userData.phone.number,
                                            data.user_Data.wallet_amount = 0;
                                        res.send({
                                            "status": 1,
                                            "message": "Login successfully",
                                            "data": data
                                        });
                                    }
                                })
                            } else {
                                res.send({ "status": 0, "message": 'Your account is inactive. please contact admin to active....' });
                            }
                        } else {
                            var data = { user_Data: {} };
                            data.user_Data = {};
                            res.send({
                                "status": 2,
                                "message": "",
                                "data": data
                            });
                        }
                    }
                })
            }
        })
    };

    controller.get_Profile = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        var data = {};
        data.user_id = req.body.user_id;
        db.GetOneDocument('users', { "_id": data.user_id, status: { $eq: 1 } }, {}, {}, function (err, userdocs) {
            if (err || !userdocs) {
                res.send({ "status": "0", "errors": "Invalid user id..!!" });
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    var user_image = '';
                    var img_status = 0;
                    if (userdocs.avatar) {
                        user_image = settings.settings.site_url + userdocs.avatar;
                        img_status = 1
                    } else {
                        user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    }
                    res.send({
                        status: '1',
                        user_image: user_image,
                        img_status: img_status,
                        user_id: userdocs._id,
                        user_name: userdocs.username,
                        last_name: userdocs.last_name,
                        email: userdocs.email,
                        currency_code: settings.settings.currency_code,
                        currency_symbol: settings.settings.currency_symbol,
                        referal_code: userdocs.unique_code || "",
                        refered_code: '',
                        location_name: userdocs.address.city || "",
                        country_code: userdocs.phone.code,
                        phone_number: userdocs.phone.number,
                        wallet_amount: ''
                    })
                })
            }
        });
    }

    controller.UserLogin = function (req, res) {
        var errors = [];
        // For Register
        if (req.body.isemail == 'yes') {
            req.checkBody('email', 'email is required').notEmpty();
            // req.checkBody('password', library.getlanguage(req, 'AUA.back-end.PWD_REQUIRED', 'Password is required')).optional();
        } else {
            req.checkBody('phone_number', 'phone_number is required').notEmpty();
            req.checkBody('country_code', 'country_code is required').notEmpty();
            //req.checkBody('password', library.getlanguage(req, 'AUA.back-end.PWD_REQUIRED', 'Password is required')).optional();
        }
        // For Login

        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm id is required').optional();
        req.checkBody('lat', 'lat is required').optional();
        req.checkBody('lon', 'long is required').optional();
        req.checkBody('address', 'Address is required').optional();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;
        data.email = req.body.email;
        data.password = req.body.password;
        data.token = req.body.deviceToken;
        data.gcm = req.body.gcm_id;
        data.lat = req.body.lat || 13.0573773;
        data.lon = req.body.lon || 80.2532674;
        data.address = '4/25, GMM St, Thousand Lights West, Thousand Lights, Chennai, Tamil Nadu 600006, India';
        if (typeof req.body.address != 'undefined' && req.body.address != '' && req.body.address != 'null' && req.body.address != null) {
            data.address = req.body.address;
        }
        var validPassword = function (password, passwordb) {
            return bcrypt.compareSync(password, passwordb);
        };


        db.GetDocument('users', { $or: [{ "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, { "email": req.body.email }] }, {}, {}, function (err, phonedocs) {

            if (err) {
                res.send({ "status": "0", "errors": 'Something went wrong.Please try again' });
            } else {
                db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
                    if (err) {
                        res.send({ "status": "0", "errors": 'Something went wrong.Please try again' });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err) {
                                res.send({
                                    "status": 0,
                                    "errors": 'Something went wrong.Please try again'
                                });
                            } else {
                                if (req.body.password) {
                                    db.GetDocument('users', { $or: [{ "phone.number": data.phone_number, "phone.code": data.country_code }, { "email": req.body.email }] }, {}, {}, function (err, docs) {
                                        if (err || !docs[0]) {
                                            res.send({
                                                "status": 0,
                                                "errors": 'Please check the phone number and try again'
                                            });
                                        } else {
                                            if (!docs[0].password || docs[0].password.length == 0) {
                                                res.send({
                                                    "status": 0,
                                                    "errors": 'Please try again with your social login'
                                                });
                                            } else {
                                                if (validPassword(data.password, docs[0].password)) {
                                                    if (docs[0].status == 1) {
                                                        var location = {};
                                                        location.lng = data.lon;
                                                        location.lat = data.lat;
                                                        //db.UpdateDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, { 'activity.last_login': new Date(), "location": location }, {}, function(err, response) {
                                                        db.UpdateDocument('users', { $or: [{ "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, { "email": req.body.email }] }, { 'activity.last_login': new Date(), "location": location }, {}, function (err, response) {
                                                            // db.UpdateDocument('users',{[$or: { "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } },{"email": req.body.email}]}, { 'activity.last_login': new Date(), "location": location }, {}, function(err, response) {
                                                            if (err || response.nModified == 0) {
                                                                res.send({
                                                                    "status": 0,
                                                                    "errors": 'Please check the phone number and try again'
                                                                });
                                                            } else {
                                                                if (data.token) {
                                                                    //  db.UpdateDocument('users',{[$or: { "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } },{"email": req.body.email}]}, { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'activity.last_login': new Date() }, {}, function(err, response) {
                                                                    db.UpdateDocument('users', { $or: [{ "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, { "email": req.body.email }] }, { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'activity.last_login': new Date() }, {}, function (err, response) {
                                                                        //db.UpdateDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'activity.last_login': new Date() }, {}, function(err, response) {
                                                                        if (err || response.nModified == 0) {
                                                                            res.send({
                                                                                "status": 0,
                                                                                "errors": 'Please check the phone number and try again'
                                                                            });
                                                                        } else {
                                                                            var user_image = '';
                                                                            if (docs[0].avatar) {
                                                                                user_image = settings.settings.site_url + docs[0].avatar;
                                                                            } else {
                                                                                user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                            }
                                                                            var wallet_amount;
                                                                            db.GetDocument('walletReacharge', { "user_id": docs[0]._id }, {}, {}, function (usererr, walletdata) {
                                                                                var wallet_amount = 0;
                                                                                if (walletdata[0]) {
                                                                                    wallet_amount = walletdata[0].total || 0;
                                                                                }
                                                                                res.send({
                                                                                    status: '1',
                                                                                    user_image: user_image,
                                                                                    user_id: docs[0]._id,
                                                                                    user_name: docs[0].username,
                                                                                    last_name: docs[0].last_name,
                                                                                    email: docs[0].email,
                                                                                    message: 'You are Logged In successfully',
                                                                                    currency_code: settings.settings.currency_code,
                                                                                    currency_symbol: settings.settings.currency_symbol,
                                                                                    referal_code: docs[0].unique_code || "",
                                                                                    refered_code: '',
                                                                                    location_name: docs[0].address.city || "",
                                                                                    country_code: docs[0].phone.code,
                                                                                    phone_number: docs[0].phone.number,
                                                                                    wallet_amount: wallet_amount
                                                                                })
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    // db.UpdateDocument('users', {[$or:{ "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } },{"email": req.body.email}]}, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm, 'device_info.device_token': '', 'activity.last_login': new Date() }, {}, function(err, response) {
                                                                    db.UpdateDocument('users', { $or: [{ "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, { "email": req.body.email }] }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm, 'device_info.device_token': '', 'activity.last_login': new Date() }, {}, function (err, response) {

                                                                        if (err || response.nModified == 0) {
                                                                            res.send({
                                                                                "status": 0,
                                                                                "errors": 'Please check the phone number and try again'
                                                                            });
                                                                        } else {
                                                                            var user_image = '';
                                                                            if (docs[0].avatar) {
                                                                                user_image = settings.settings.site_url + docs[0].avatar;
                                                                            } else {
                                                                                user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                            }
                                                                            var wallet_amount;
                                                                            db.GetDocument('walletReacharge', { "user_id": docs[0]._id }, {}, {}, function (usererr, walletdata) {
                                                                                var wallet_amount = 0;
                                                                                if (walletdata[0]) {
                                                                                    wallet_amount = walletdata[0].total || 0;
                                                                                }
                                                                                res.send({
                                                                                    status: '1',
                                                                                    user_image: user_image,
                                                                                    last_name: docs[0].last_name,
                                                                                    user_id: docs[0]._id,
                                                                                    user_name: docs[0].username,
                                                                                    email: docs[0].email,
                                                                                    message: 'You are Logged In successfully',
                                                                                    currency_code: settings.settings.currency_code,
                                                                                    currency_symbol: settings.settings.currency_symbol,
                                                                                    referal_code: docs[0].unique_code || "",
                                                                                    refered_code: '',
                                                                                    country_code: docs[0].phone.code,
                                                                                    phone_number: docs[0].phone.number,
                                                                                    wallet_amount: wallet_amount
                                                                                })
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    } else {
                                                        if (docs[0].status == 0) {
                                                            res.send({
                                                                "status": 0,
                                                                "errors": 'Your account is currently unavailable'
                                                            });
                                                        } else if (docs[0].status == 2) {
                                                            res.send({
                                                                "status": 0,
                                                                "errors": 'Your account inactivated by admin.!'
                                                            });
                                                        } else {
                                                            res.send({
                                                                "status": 0,
                                                                "errors": 'Your account need to be verified by admin'
                                                            });
                                                        }
                                                    }
                                                } else {
                                                    res.send({
                                                        "status": 0,
                                                        "errors": 'Password is invalid'
                                                    });
                                                }
                                            }
                                        }
                                    });
                                } else {
                                    if (phonedocs.length != 0) { res.send({ "status": "2", "message": 'mobile number exist' }); } else if (phonedocs.length == 0) {
                                        if (req.body.isemail == 'yes') {
                                            res.send({
                                                message: "This email is not registered",
                                                status: '4',
                                            });
                                        } else {
                                            var secret = otp.generateSecret();
                                            var otp_string = otp.generate(secret);
                                            var pass_code = otp_string.slice(0, 4);
                                            var to = req.body.country_code + req.body.phone_number;
                                            var message = pass_code + ' is your ' + settings.settings.site_title + ' OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
                                            var otp_status = "development";
                                            if (smssettings.settings.twilio.mode == 'production') {
                                                otp_status = "production";
                                                twilio.createMessage(to, '', message, function (err, response) { });
                                            }
                                            res.send({
                                                message: "Success",
                                                country_code: req.body.country_code,
                                                phone_number: req.body.phone_number,
                                                otp_status: otp_status,
                                                otp: pass_code,
                                                status: '1'
                                            });
                                        }
                                    } else {
                                        res.send({ "status": "2", "message": 'mobile number exist' });
                                    }
                                }
                            }
                        })
                    }
                });
            }
        });
    };

    controller.SignUp = function (req, res) {

        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('first_name', 'first_name is required').notEmpty();
        req.checkBody('last_name', 'last_name is required').optional();
        req.checkBody('email', 'email is required').isEmail();
        req.checkBody('password', 'password is required').optional();
        req.checkBody('country_code', 'country_code  is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        req.checkBody('referal_code', 'referal_code is required').optional();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm_id id is required').optional();


        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        req.sanitizeBody('first_name').trim();
        req.sanitizeBody('last_name').trim();
        req.sanitizeBody('email').trim();
        req.sanitizeBody('country_code').trim();
        req.sanitizeBody('phone_number').trim();
        req.sanitizeBody('referal_code').trim();
        req.sanitizeBody('deviceToken').trim();
        req.sanitizeBody('gcm_id').trim();

        var request = {};
        data.email = req.body.email;
        data.username = req.body.first_name || "";
        data.last_name = req.body.last_name || "";
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;
        //data.unique_code = req.body.referal_code;
        data.deviceToken = req.body.deviceToken;
        data.gcm_id = req.body.gcm_id;
        data.role = 'user';
        data.status = '1';

        db.GetDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {
                if (phonedocs.length != 0) { res.send({ "status": "2", "errors": "mobile number exist" }); }
                else {
                    db.GetDocument('users', { "email": req.body.email }, {}, {}, function (err, emaildocs) {
                        if (err) {
                            res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
                        } else {
                            if (emaildocs.length != 0) { res.send({ "status": "2", "errors": "Email already exist" }); }
                            else {
                                async.waterfall([
                                    function (callback) {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            if (err || !settings) {
                                                res.send({ "status": "0", "errors": "Configure your website settings" });
                                            } else {
                                                callback(err, settings);
                                            }
                                        });
                                    },
                                    function (settings, callback) {
                                        db.GetOneDocument('refer_coupon', { 'status': 1 }, {}, {}, function (err, coupon) {
                                            if (err) {
                                                res.send({ "status": "0", "errors": "Something went wrong....!" });
                                            } else {
                                                callback(err, settings, coupon);
                                            }
                                        });
                                    },
                                    function (settings, coupon, callback) {
                                        var newdata = { phone: {} };
                                        newdata.username = data.username;
                                        newdata.last_name = data.last_name;
                                        newdata.unique_code = library.randomString(8, '#A');
                                        newdata.role = 'user';
                                        newdata.user_type = 'normal';
                                        newdata.email = data.email;
                                        newdata.status = 1;
                                        newdata.phone.code = data.country_code;
                                        newdata.phone.number = data.phone_number;
                                        newdata.refer_activity = [];
                                        if (req.body.referral_code) {
                                            db.GetOneDocument('users', { 'unique_code': req.body.referral_code }, {}, {}, function (err, referuser) {
                                                if (err) {
                                                    res.send({ "status": "0", "errors": "Sorry Invalid Referal Code..!" });
                                                } else {
                                                    if (referuser && referuser._id) {
                                                        newdata.referral_code = req.body.referral_code;
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

                                                        db.InsertDocument('users', newdata, function (err, response) {
                                                            if (err) {
                                                                res.send({ "status": "0", "errors": "Sorry Email Exists..!" });
                                                            } else {
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
                                                                if (data.deviceToken) {
                                                                    db.UpdateDocument('users', { '_id': response._id }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                                                        if (err || responseuser.nModified == 0) {
                                                                            res.send({ "status": 0, "errors": "Sorry error in signup..!" });
                                                                        } else {
                                                                            res.send({
                                                                                "status": '1',
                                                                                "message": 'Successfully registered',
                                                                                "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                                                "user_id": response._id,
                                                                                "user_name": response.username,
                                                                                "last_name": response.last_name,
                                                                                "email": response.email,
                                                                                "country_code": response.phone.code,
                                                                                "phone_number": response.phone.number,
                                                                                "referal_code": response.unique_code,
                                                                                "refered_code": '',
                                                                                "currency_code": settings.settings.currency_code,
                                                                                "currency_symbol": settings.settings.currency_symbol,
                                                                                "wallet_amount": 0,
                                                                            });

                                                                            db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                                                mailData1 = {};
                                                                                mailData1.template = 'user_signupto_admin';
                                                                                mailData1.to = admin.email;
                                                                                mailData1.html = [];
                                                                                mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                                                mailData1.html.push({ name: 'name', value: response.username || "" });
                                                                                mailcontent.sendmail(mailData1, function (err, response) {
                                                                                });
                                                                            });

                                                                            mailData = {};
                                                                            mailData.template = 'user_signupto_user';
                                                                            mailData.to = response.email;
                                                                            mailData.html = [];
                                                                            mailData.html.push({ name: 'name', value: response.username || "" });
                                                                            mailcontent.sendmail(mailData, function (err, response) {
                                                                            });
                                                                        }
                                                                    });
                                                                } else if (data.gcm_id) {
                                                                    db.UpdateDocument('users', { '_id': response._id }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                                                        if (err || responseuser.nModified == 0) {
                                                                            res.send({ "status": 0, "errors": "Sorry error in signup..!" });
                                                                        } else {
                                                                            res.send({
                                                                                "status": '1',
                                                                                "message": 'Successfully registered',
                                                                                "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                                                "user_id": response._id,
                                                                                "user_name": response.username,
                                                                                "last_name": response.last_name,
                                                                                "email": response.email,
                                                                                "country_code": response.phone.code,
                                                                                "phone_number": response.phone.number,
                                                                                "referal_code": response.unique_code,
                                                                                "refered_code": '',
                                                                                "currency_code": settings.settings.currency_code,
                                                                                "currency_symbol": settings.settings.currency_symbol,
                                                                                "wallet_amount": 0
                                                                            });
                                                                            db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                                                mailData1 = {};
                                                                                mailData1.template = 'user_signupto_admin';
                                                                                mailData1.to = admin.email;
                                                                                mailData1.html = [];
                                                                                mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                                                mailData1.html.push({ name: 'name', value: response.username || "" });
                                                                                mailcontent.sendmail(mailData1, function (err, response) {
                                                                                });
                                                                            });
                                                                            mailData = {};
                                                                            mailData.template = 'user_signupto_user';
                                                                            mailData.to = response.email;
                                                                            mailData.html = [];
                                                                            mailData.html.push({ name: 'name', value: response.username || "" });
                                                                            mailcontent.sendmail(mailData, function (err, response) {
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    } else {
                                                        res.send({ "status": "0", "errors": "Sorry Invalid Referal Code..!" });
                                                    }
                                                }
                                            });
                                        } else {
                                            db.InsertDocument('users', newdata, function (err, response) {
                                                if (err) {
                                                    res.send({ "status": "0", "errors": "Sorry Email Exists..!" });
                                                } else {
                                                    if (data.deviceToken) {
                                                        db.UpdateDocument('users', { '_id': response._id }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                                            if (err || responseuser.nModified == 0) {
                                                                res.send({ "status": 0, "errors": "Sorry error in signup..!" });
                                                            } else {
                                                                res.send({
                                                                    "status": '1',
                                                                    "message": 'Successfully registered',
                                                                    "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                                    "user_id": response._id,
                                                                    "user_name": response.username,
                                                                    "last_name": response.last_name,
                                                                    "email": response.email,
                                                                    "country_code": response.phone.code,
                                                                    "phone_number": response.phone.number,
                                                                    "referal_code": response.unique_code,
                                                                    "refered_code": '',
                                                                    "currency_code": settings.settings.currency_code,
                                                                    "currency_symbol": settings.settings.currency_symbol,
                                                                    "wallet_amount": 0,
                                                                });

                                                                db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                                    mailData1 = {};
                                                                    mailData1.template = 'user_signupto_admin';
                                                                    mailData1.to = admin.email;
                                                                    mailData1.html = [];
                                                                    mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                                    mailData1.html.push({ name: 'name', value: response.username || "" });
                                                                    mailcontent.sendmail(mailData1, function (err, response) {
                                                                    });
                                                                });

                                                                mailData = {};
                                                                mailData.template = 'user_signupto_user';
                                                                mailData.to = response.email;
                                                                mailData.html = [];
                                                                mailData.html.push({ name: 'name', value: response.username || "" });
                                                                mailcontent.sendmail(mailData, function (err, response) {
                                                                });
                                                            }
                                                        });
                                                    } else if (data.gcm_id) {
                                                        db.UpdateDocument('users', { '_id': response._id }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                                            if (err || responseuser.nModified == 0) {
                                                                res.send({ "status": 0, "errors": "Sorry error in signup..!" });
                                                            } else {
                                                                res.send({
                                                                    "status": '1',
                                                                    "message": 'Successfully registered',
                                                                    "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                                    "user_id": response._id,
                                                                    "user_name": response.username,
                                                                    "last_name": response.last_name,
                                                                    "email": response.email,
                                                                    "country_code": response.phone.code,
                                                                    "phone_number": response.phone.number,
                                                                    "referal_code": response.unique_code,
                                                                    "refered_code": '',
                                                                    "currency_code": settings.settings.currency_code,
                                                                    "currency_symbol": settings.settings.currency_symbol,
                                                                    "wallet_amount": 0
                                                                });
                                                                db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                                    mailData1 = {};
                                                                    mailData1.template = 'user_signupto_admin';
                                                                    mailData1.to = admin.email;
                                                                    mailData1.html = [];
                                                                    mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                                                    mailData1.html.push({ name: 'name', value: response.username || "" });
                                                                    mailcontent.sendmail(mailData1, function (err, response) {
                                                                    });
                                                                });
                                                                mailData = {};
                                                                mailData.template = 'user_signupto_user';
                                                                mailData.to = response.email;
                                                                mailData.html = [];
                                                                mailData.html.push({ name: 'name', value: response.username || "" });
                                                                mailcontent.sendmail(mailData, function (err, response) {
                                                                });
                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                        }
                                    },
                                    /* function (settings, coupon, referalCheck, callback) {
                                        var newdata = { phone: {} };
                                        newdata.username = data.username;
                                        newdata.unique_code = library.randomString(8, '#A');
                                        newdata.role = 'user';
                                        newdata.user_type = 'normal';
                                        newdata.email = data.email;
                                        newdata.status = 1;
                                        newdata.phone.code = data.country_code;
                                        newdata.phone.number = data.phone_number;
                                        db.InsertDocument('users', newdata, function (err, response) {
                                            if (err || response.nModified == 0) {
                                                res.send({ "status": "0", "errors": "Sorry Email Exists..!" });
                                            } else {
                                                callback(err, settings, coupon, referalCheck, response);
                                            }
                                        });
                                    },
                                    function (settings, coupon, referalCheck, response, callback) {
                                        var welcomeamt = {
                                            'user_id': response._id,
                                            "total": settings.settings.referral.amount.referral,
                                            'type': 'wallet',
                                            "transactions": [{
                                                'type': 'CREDIT',
                                                'credit_type': 'welcome',
                                                'ref_id': referalCheck[0]._id,
                                                'trans_amount': settings.settings.referral.amount.referral,
                                                'avail_amount': settings.settings.referral.amount.referral,
                                                'trans_date': Date.now(),
                                                'trans_id': ''
                                            }]
                                        };

                                        db.InsertDocument('walletReacharge', welcomeamt, function (walletReachargeErr, walletReachargeRepo) {
                                            if (walletReachargeErr || walletReachargeRepo.nModified == 0) { res.send({ "status": "0", "errors": "Error in given data" }); } else {
                                                callback(walletReachargeErr, settings, coupon, referalCheck, response, walletReachargeRepo);
                                            }
                                        });
                                    },
                                    function (settings, coupon, referalCheck, response, walletReachargeRepo, callback) {
                                        var walletdata = { wallet_id: walletReachargeRepo._id };
                                        db.UpdateDocument('users', { _id: new mongoose.Types.ObjectId(response._id) }, { $set: walletdata }, { multi: true }, function (usersErr, usersRespo) {
                                            if (usersErr) { res.send({ "status": "0", "errors": "Error in given data" }); } else { callback(usersErr, settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo); }
                                        });
                                    },
                                    function (settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, callback) {
                                        db.GetOneDocument('users', { '_id': response._id }, {}, {}, function (err, usermailrefer) {
                                            if (err || !usermailrefer) { res.send({ "status": "0", "errors": "Error in given data" }); } else { callback(err, settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer); }
                                        });
                                    },
                                    function (settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, callback) {
                                        db.GetOneDocument('walletReacharge', { 'user_id': referalCheck[0]._id }, {}, {}, function (refErr, refRespo) {
                                            if (refErr) { res.send({ "status": "0", "errors": "Error in given data" }); } else { callback(refErr, settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo); }
                                        });
                                    },
                                    function (settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, callback) {
                                        if (refRespo) {
                                            var walletArr = {
                                                'type': 'CREDIT',
                                                'credit_type': 'Referel',
                                                'trans_amount': settings.settings.referral.amount.referrer,
                                                'avail_amount': settings.settings.referral.amount.referrer,
                                                'trans_date': Date.now(),
                                                'trans_id': ''
                                            };
                                            db.UpdateDocument('walletReacharge', { 'user_id': referalCheck[0]._id }, { $push: { transactions: walletArr }, $set: { "total": parseInt(refRespo.total) + parseInt(settings.settings.referral.amount.referrer) } }, {}, function (refupErr, refupRespo) {
                                                if (refupErr || refupRespo.nModified == 0) { res.send({ "status": "0", "errors": "Error in given data" }); } else { callback(refupErr, settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, refupRespo); }
                                            });
                                        } else {
                                            var welcomeamt = {
                                                'user_id': referalCheck[0]._id,
                                                "total": settings.settings.referral.amount.referrer,
                                                'type': 'wallet',
                                                "transactions": [{
                                                    'type': 'CREDIT',
                                                    'credit_type': 'Referel',
                                                    'trans_amount': settings.settings.referral.amount.referrer,
                                                    'avail_amount': settings.settings.referral.amount.referrer,
                                                    'trans_date': Date.now(),
                                                    'trans_id': ''
                                                }]
                                            };
                                            db.InsertDocument('walletReacharge', welcomeamt, function (refupErr, refupRespo) {
                                                if (refupErr || refupRespo.nModified == 0) { res.send({ "status": "0", "errors": "Error in given data" }); } else { callback(refupErr, settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, refupRespo); }
                                            });
                                        }
                                    } */
                                ], function (usersErr, settings, coupon, referalCheck, response, walletReachargeRepo, usersRespo, usermailrefer, refRespo, refupRespo) {
                                    /* if (data.deviceToken) {
                                        db.UpdateDocument('users', { '_id': response._id }, { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                            if (err || responseuser.nModified == 0) {
                                                res.send({ "status": 0, "errors": 'Please check the phone number and try again' });
                                            } else {
                                                res.send({
                                                    "status": '1',
                                                    "message": 'Successfully registered',
                                                    "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                    "user_id": response._id,
                                                    "user_name": response.username,
                                                    "last_name": response.last_name,
                                                    "email": response.email,
                                                    "country_code": response.phone.code,
                                                    "phone_number": response.phone.number,
                                                    "referel_code": response.unique_code,
                                                    "refered_code": data.unique_code,
                                                    "currency_code": settings.settings.currency_code,
                                                    "currency_symbol": settings.settings.currency_symbol,
                                                    "wallet_amount": (walletReachargeRepo.total || 0).toString()
                                                });
                                                mailData = {};
                                                mailData.template = 'user_signupto_user';
                                                mailData.to = response.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'name', value: response.username || "" });
                                                mailcontent.sendmail(mailData, function (err, response) {
                                                });
                                            }
                                        });
                                    } else if (data.gcm_id) {
                                        db.UpdateDocument('users', { '_id': response._id }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                            if (err || responseuser.nModified == 0) {
                                                res.send({ "status": 0, "errors": 'Please check the phone number and try again' });
                                            } else {
                                                res.send({
                                                    "status": '1',
                                                    "message": 'Successfully registered',
                                                    "user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
                                                    "user_id": response._id,
                                                    "user_name": response.username,
                                                    "last_name": response.last_name,
                                                    "email": response.email,
                                                    "country_code": response.phone.code,
                                                    "phone_number": response.phone.number,
                                                    "referel_code": response.unique_code,
                                                    "refered_code": data.unique_code,
                                                    "currency_code": settings.settings.currency_code,
                                                    "currency_symbol": settings.settings.currency_symbol,
                                                    "wallet_amount": (walletReachargeRepo.total || 0).toString()
                                                });
                                                mailData = {};
                                                mailData.template = 'user_signupto_user';
                                                mailData.to = response.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'name', value: response.username || "" });
                                                mailcontent.sendmail(mailData, function (err, response) {
                                                });
                                            }
                                        });
                                    } */
                                });
                            }
                        }
                    });
                }
            }
        });
    }


    controller.socialLogin = function (req, res) {
        var errors = [];
        req.checkBody('social_type', 'social_type is Required').notEmpty();
        req.checkBody('social_id', 'social_id is Required').notEmpty();
        req.checkBody('email', 'email  is required').optional();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm_id id is required').optional();
        req.checkBody('prof_pic', 'prof_pic id is required').optional();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var status = '0';
        var message = '';
        var data = {};

        data.social_type = req.body.social_type;
        data.social_id = req.body.social_id;
        data.prof_pic = req.body.prof_pic;
        data.token = req.body.deviceToken;
        data.gcm = req.body.gcm_id;
        data.email = req.body.email;

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your  settings..!" });
            } else {
                if (data.email) {
                    db.GetOneDocument('users', { "email": data.email }, {}, {}, function (err, emailcheck) {
                        if (err) {
                            res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
                        } else {
                            if (emailcheck) {
                                if (emailcheck.password) { res.send({ status: '3', message: "This mail already taken while normal signup..!" }); }
                                else if (!emailcheck.password || emailcheck.social_login.facebook_id == data.social_id || emailcheck.social_login.google_id == data.social_id) {
                                    if (data.social_type == 'google') {
                                        var query = { 'social_login.google_id': req.body.social_id, status: { $eq: 1 } };
                                    }
                                    else if (data.social_type == 'facebook') {
                                        query = { 'social_login.facebook_id': req.body.social_id, status: { $eq: 1 } }
                                    }
                                    db.GetDocument('users', query, {}, {}, function (err, user) {
                                        if (err || !user) { res.send({ "status": "2", "message": "No users found..!" }); }
                                        else {
                                            if (user.length > 0 && user[0].password == undefined && !user[0].password) {
                                                var deviceInfo = {};
                                                deviceInfo = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token };
                                                if (data.gcm) {
                                                    deviceInfo = { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm };
                                                }
                                                db.UpdateDocument('users', query, deviceInfo, {}, function (err, response) {
                                                    if (err || response.nModified == 0) {
                                                        res.send({
                                                            "status": 0,
                                                            "errors": 'Please check the inputs and try again..!'
                                                        });
                                                    } else {
                                                        res.send({
                                                            "status": '1',
                                                            "message": 'You are Logged In successfully',
                                                            "user_image": '',
                                                            "user_id": user[0]._id,
                                                            "user_name": user[0].username,
                                                            "last_name": user[0].last_name,
                                                            "email": user[0].email,
                                                            "country_code": user[0].phone.code,
                                                            "phone_number": user[0].phone.number,
                                                            "referel_code": user[0].unique_code,
                                                            "refered_code": '',
                                                            "currency_code": settings.settings.currency_code,
                                                            "currency_symbol": settings.settings.currency_symbol,
                                                            "wallet_amount": 0
                                                        });
                                                    }
                                                });
                                            }
                                            else {
                                                res.send({ "status": "2", "message": "No users found..!" });
                                            }
                                        }
                                    });
                                }
                            }
                            else { res.send({ status: '2', message: "No users found..!" }); }
                        }
                    });
                }
                else {


                    if (data.social_type == 'google') {
                        var query = { 'social_login.google_id': req.body.social_id, status: { $eq: 1 } };
                    }
                    else if (data.social_type == 'facebook') {
                        query = { 'social_login.facebook_id': req.body.social_id, status: { $eq: 1 } }
                    }
                    db.GetDocument('users', query, {}, {}, function (err, user) {
                        if (err || !user) { res.send({ "status": "2", "message": "No users found..!" }); }
                        else {
                            if (user.length > 0 && user[0].password == undefined && !user[0].password) {
                                var deviceInfo = {};
                                deviceInfo = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token };
                                if (data.gcm) {
                                    deviceInfo = { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm };
                                }
                                db.UpdateDocument('users', query, deviceInfo, {}, function (err, response) {
                                    if (err || response.nModified == 0) {
                                        res.send({ "status": 0, "errors": 'Please check the inputs and try again..!' });
                                    } else {
                                        res.send({
                                            "status": '1',
                                            "message": 'You are Logged In successfully',
                                            "user_image": '',
                                            "user_id": user[0]._id,
                                            "user_name": user[0].username,
                                            "last_name": user[0].last_name,
                                            "email": user[0].email,
                                            "country_code": user[0].phone.code,
                                            "phone_number": user[0].phone.number,
                                            "referel_code": user[0].unique_code,
                                            "refered_code": '',
                                            "currency_code": settings.settings.currency_code,
                                            "currency_symbol": settings.settings.currency_symbol,
                                            "wallet_amount": 0
                                        });
                                    }
                                });
                            }
                            else {
                                res.send({ "status": "2", "message": "No users found..!" });
                            }
                        }
                    });
                }
            }
        });
    }


    controller.socialCheck = function (req, res) {  // not using
        var errors = [];
        req.checkBody('email', 'email  is required').notEmpty();
        req.checkBody('social_id', 'social_id  is required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var status = '0';
        var message = '';
        var data = {};
        data.email = req.body.email;
        data.social_id = req.body.social_id;

        db.GetOneDocument('users', { "email": data.email }, {}, {}, function (err, emailcheck) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {
                if (emailcheck) {
                    if (emailcheck.password) { res.send({ status: '1', message: "This mail already taken while normal signup..!" }); }
                    else if (!emailcheck.password || emailcheck.social_login.facebook_id == data.social_id || emailcheck.social_login.google_id == data.social_id) { res.send({ status: '2', message: "This mail already taken while social signup..!" }); }
                }
                else { res.send({ status: '3', message: "No users found..!" }); }
            }
        });
    }


    controller.socialSignUpOtp = function (req, res) {
        var errors = [];
        req.checkBody('country_code', 'country_code  is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var status = '0';
        var message = '';
        var data = {};
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;

        db.GetDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {
                if (phonedocs.length != 0) { res.send({ "status": "0", "errors": "Mobile number exist" }); }
                else {
                    db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                        if (err) {
                            res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
                        } else {
                            var secret = otp.generateSecret();
                            var otp_string = otp.generate(secret);
                            var pass_code = otp_string.slice(0, 4);
                            var to = data.country_code + data.phone_number;
                            var message = 'Your one time pass code is ' + pass_code;
                            var otp_status = "development";
                            if (settings.settings.twilio.mode == 'production') {
                                otp_status = "production";
                                twilio.createMessage(to, '', message, function (err, response) {
                                });
                            }
                            res.send({
                                status: '1',
                                message: "Success",
                                country_code: data.country_code,
                                phone_number: data.phone_number,
                                otp_status: otp_status,
                                otp: pass_code
                            });
                        }
                    });
                }
            }
        });
    }


    controller.forgotOtp = function (req, res) {
        var errors = [];
        req.checkBody('country_code', 'country_code  is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var status = '0';
        var message = '';
        var data = {};
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;

        db.GetDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {
                if (phonedocs.length == 0) { res.send({ "status": "0", "errors": "Mobile number does not match with registered Mobile number" }); }
                else {
                    db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                        if (err) {
                            res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
                        } else {
                            var secret = otp.generateSecret();
                            var otp_string = otp.generate(secret);
                            var pass_code = otp_string.slice(0, 4);
                            db.UpdateDocument('users', { '_id': phonedocs[0]._id }, { 'otp': pass_code }, {}, function (err, response) {
                                if (err || response.nModified == 0) {
                                    res.send({
                                        "status": 0,
                                        "errors": 'Mobile number does not match with registered Mobile number'
                                    });
                                }
                                else {
                                    var to = data.country_code + data.phone_number;
                                    var message = 'Your one time pass code is ' + pass_code;
                                    var otp_status = "development";
                                    if (settings.settings.twilio.mode == 'production') {
                                        otp_status = "production";
                                        twilio.createMessage(to, '', message, function (err, response) {
                                        });
                                    }
                                    res.send({
                                        status: '1',
                                        message: "Success",
                                        country_code: data.country_code,
                                        phone_number: data.phone_number,
                                        otp_status: otp_status,
                                        otp: pass_code
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
    }
    controller.mobileforgotPassword = function (req, res) {
        var errors = [];
        req.checkBody('country_code', 'country_code  is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();

        req.checkBody('otp', 'otp is required').notEmpty();
        req.checkBody('password', 'email is required').notEmpty();
        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};

        var request = {};
        request.email = req.body.email;
        request.otp = req.body.otp;
        request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);

        db.GetDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code, 'otp': request.otp }, {}, {}, function (err, docs) {
            if (err || !docs[0] || docs[0].length == 0) {
                res.send({
                    "status": 0,
                    "errors": 'OTP does not match'
                });
            } else {
                db.UpdateDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, { 'password': request.password }, {}, function (err, response) {
                    if (err || response.nModified == 0) {
                        res.send({
                            "status": 0,
                            "errors": 'OTP does not match'
                        });
                    } else {
                        res.send({
                            "status": 1,
                            "message": 'Password has been changed successfully'
                        });
                    }
                });
            }
        });
    }

    controller.socialSignUp = function (req, res) {

        var errors = [];
        req.checkBody('social_type', 'social_type is Required').notEmpty();
        req.checkBody('social_id', 'social_id is Required').notEmpty();

        req.checkBody('first_name', 'first_name is required').notEmpty();
        req.checkBody('last_name', 'last_name is required').optional();
        req.checkBody('email', 'email is required').isEmail();
        req.checkBody('country_code', 'country_code  is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm_id id is required').optional();
        req.checkBody('prof_pic', 'prof_pic id is required').optional();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var status = '0';
        var message = '';
        var data = {};
        data.social_login = {};
        data.phone = {};
        if (req.body.social_type == 'google') {
            data.social_login.google_id = req.body.social_id;
        }
        if (req.body.social_type == 'facebook') {
            data.social_login.facebook_id = req.body.social_id;
        }
        data.status = '1';
        data.role = 'user';
        data.user_type = 'social';
        data.username = req.body.first_name;
        data.last_name = req.body.last_name;
        data.email = req.body.email;
        data.token = req.body.deviceToken;
        data.gcm = req.body.gcm_id;
        data.prof_pic = req.body.prof_pic;
        data.phone.code = req.body.country_code;
        data.phone.number = req.body.phone_number;
        data.unique_code = library.randomString(8, '#A');
        data.refer_activity = [];

        db.GetDocument('users', { "phone.number": data.phone.number, "phone.code": data.phone.code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {
                if (phonedocs.length != 0) { res.send({ "status": "0", "errors": "Mobile number exist" }); }
                else {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        if (err || !settings) {
                            res.send({ "status": "0", "errors": "Configure your website settings" });
                        } else {
                            db.GetOneDocument('refer_coupon', { 'status': 1 }, {}, {}, function (err, coupon) {
                                if (err) {
                                    return done('Something Went Wrong..!', false, null);
                                } else {
                                    if (req.body.referral_code) {
                                        data.referral_code = req.body.referral_code;
                                        if (coupon && coupon != null && coupon != undefined && coupon.status && coupon.status == 1 && coupon.expires > new Date()) {
                                            var initoffer = {};
                                            initoffer.discount_amount = coupon.discount_amount;
                                            initoffer.cart_amount = coupon.cart_amount;
                                            /* var expires = new Date();
                                            expires = expires.getTime();
                                            expires = expires + ( settings.settings.rov_period * 24*60*60*1000 ); */
                                            initoffer.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                            if (settings.settings.coupon_process == "onorder") {
                                                data.initprocess = settings.settings.coupon_process;
                                            }
                                            data.refer_activity.push(initoffer);
                                            data.initoffer = {};
                                            data.initoffer.discount_amount = coupon.discount_amount;
                                            data.initoffer.cart_amount = coupon.cart_amount;
                                        }
                                    }
                                    db.InsertDocument('users', data, function (err, response) {
                                        if (err) {
                                            res.send({ "status": "0", "errors": "Sorry Email Exists..!" });
                                        } else {
                                            var deviceInfo = {};
                                            deviceInfo = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'activity.last_login': new Date() };

                                            if (data.gcm) {
                                                deviceInfo = { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm, 'activity.last_login': new Date() };
                                            }

                                            db.UpdateDocument('users', { '_id': response._id }, deviceInfo, {}, function (err, respo) {
                                                if (err || response.nModified == 0) {
                                                    res.send({
                                                        "status": 0,
                                                        "errors": 'Please check the inputs and try again'
                                                    });
                                                } else {
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
                                                    res.send({
                                                        "status": '1',
                                                        "message": 'You are registered successfully',
                                                        "user_image": '',
                                                        "user_id": response._id,
                                                        "user_name": response.username,
                                                        "last_name": response.last_name,
                                                        "email": response.email,
                                                        "country_code": response.phone.code,
                                                        "phone_number": response.phone.number,
                                                        "referel_code": response.unique_code,
                                                        "refered_code": '',
                                                        "currency_code": settings.settings.currency_code,
                                                        "currency_symbol": settings.settings.currency_symbol,
                                                        "wallet_amount": 0
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
    };

    controller.termsandConditions = function (req, res) {
        var data = {};
        data.status = 0;
        var query = { 'slug': 'terms-and-conditions' }
        if (req.query.type == 'privacy') {
            query = { 'slug': 'privacy-page' }
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your website settings" });
            } else {
                db.GetOneDocument('pages', query, {}, {}, function (err, terms) {
                    if (err || !terms) {
                        res.send({
                            "status": 0,
                            "errors": 'Invalid Error, Please check your data'
                        });
                    }
                    else {
                        var pug = {};
                        pug.termsandcondition = terms.description;
                        pug.logo = settings.settings.logo;
                        pug.siteurl = settings.settings.site_url;
                        res.render('mobile/termsandcondition', pug);
                    }
                });
            }
        });
    };

    controller.UsermailCheck = async (req, res) => {
        // var errors = [];

        // if (req.body.code && req.body.number) {
        //     req.checkBody('number', 'number is required').notEmpty();
        //     req.checkBody('code', 'code is required').notEmpty();
        // } else {
        //     req.checkBody('email', 'email is required').isEmail();
        // }

        // errors = req.validationErrors();

        // if (errors) {
        //     res.send({
        //         "status": "0",
        //         "errors": errors[0].msg
        //     });
        //     return;
        // }
        var data = {};
        var request = {};
        request.email = req.body.email;
        request.code = req.body.code;
        request.number = req.body.number;

        if (request.code && request.number) {
            db.GetDocument('users', { 'phone.code': request.code, 'phone.number': request.number, 'status': { $eq: 1 } }, {}, {}, function (err, userdocs) {
                if (err || !userdocs[0] || userdocs[0].length == 0) {
                    res.send({
                        "status": 0,
                        "errors": 'Mobile number does not match with registered mobile number'
                    });
                } else {
                    if (userdocs[0].email == request.email) {
                        db.GetDocument('users', { email: request.email, 'status': { $eq: 1 } }, {}, {}, function (err, docs) {
                            if (err || !docs[0] || docs[0].length == 0) {
                                res.send({
                                    "status": 0,
                                    "errors": 'Email-ID is not matched with given mobile number'
                                });
                            } else {
                                var otp = library.randomString(4, '#A');
                                db.UpdateDocument('users', { 'email': request.email }, { 'otp': otp }, {}, function (err, response) {
                                    if (err || response.nModified == 0) {
                                        res.send({
                                            "status": 0,
                                            "errors": 'Email-ID is not matched with given mobile number'
                                        });
                                    }
                                    else {
                                        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                                            if (err || !settings) {
                                                res.send({ "status": "0", "errors": "Configure your app settings" });
                                            } else {
                                                var mailData = {};
                                                mailData.template = 'Forgotpassword';
                                                mailData.to = docs[0].email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'name', value: docs[0].username || "" });
                                                mailData.html.push({ name: 'otp', value: otp || "" });
                                                mailcontent.sendmail(mailData, function (err, response) { });
                                                var mode = '';
                                                var otp_string = '';
                                                if (typeof settings.settings != 'undefined' && typeof settings.settings.twilio != 'undefined' && typeof settings.settings.twilio.mode != 'undefined') {
                                                    mode = settings.settings.twilio.mode
                                                    if (settings.settings.twilio.mode == 'development') {
                                                        otp_string = otp;
                                                    }
                                                }
                                                data.status = '1';
                                                data.otp = otp_string;
                                                data.mode = mode;
                                                data.message = 'OTP has been sent to your registered mail';
                                                res.send(data)
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        res.send({
                            "status": 0,
                            "errors": 'Email-ID is not matched with given mobile number'
                        });
                    }

                }
            });
        } else {
            try {
                let userMailFound = await db.GetDocument('users', { email: request.email, 'status': { $eq: 1 } }, {}, {})

                console.log("userMailFounduserMailFounduserMailFounduserMailFounduserMailFounduserMailFound")
                console.log(userMailFound)
                console.log("userMailFounduserMailFounduserMailFounduserMailFounduserMailFounduserMailFound")

                if (!userMailFound) {
                    res.send({
                        "status": 0,
                        "message": 'Something Went wrong',
                        "data": [],
                        error: true
                    })
                } else {
                    if (userMailFound && userMailFound.doc && userMailFound.doc.length > 0) {
                        var otp = library.randomString(4, '#A');
                        let otpUpdate = await db.UpdateDocument('users', { 'email': request.email }, { 'otp': otp, 'otp_time': new Date() }, {})
                        // console.log("otpsettings", otpUpdate.doc.modifiedCount)
                        const otp_time = 60;
                        if (!otpUpdate) {
                            res.send({
                                "status": 0,
                                "message": 'Something Went wrong',
                                "data": [],
                                otp_time,
                                error: true
                            })
                        } else {
                            if (otpUpdate && otpUpdate.doc && otpUpdate.doc.modifiedCount > 0) {
                                let otpsettings = await db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {})
                                if (!otpsettings) {
                                    res.send({
                                        "status": 0,
                                        "message": "Configure your app settings",
                                        "error": true
                                    });
                                } else {
                                    if (otpsettings && otpsettings.status == false) {
                                        res.send({
                                            "status": "0", "message": " SMS Template Not Found",
                                            "error": true,
                                            "data": []
                                        });
                                    } else {
                                        var mailData = {};
                                        mailData.template = 'forgot_password';
                                        mailData.to = userMailFound.doc[0].email;
                                        mailData.html = [];
                                        mailData.html.push({ name: 'name', value: userMailFound.doc[0].username || "" });
                                        mailData.html.push({ name: 'otp', value: otp || "" });
                                        mailcontent.sendmail(mailData, function (err, response) { });
                                        var mode = '';
                                        var otp_string = '';


                                        if (typeof otpsettings.doc != 'undefined' && otpsettings.doc.settings != undefined && typeof otpsettings.doc.settings.twilio != 'undefined' && typeof otpsettings.doc.settings.twilio.mode != 'undefined') {
                                            mode = otpsettings.doc.settings.twilio.mode
                                            if (otpsettings.doc.settings.twilio.mode == 'development') {
                                                otp_string = otp;
                                            }
                                        }
                                        data.status = 1;
                                        data.otp = otp_string;
                                        data.mode = mode;
                                        data.error = false,
                                            data.otp_time = otp_time,
                                            data.message = 'OTP has been sent to your registered mail';
                                        res.send(data)
                                    }
                                }

                            } else {
                                res.send({
                                    "status": 0,
                                    "message": 'Something Went wrong',
                                    "data": [],
                                    error: true
                                })
                            }
                        }


                        return;


                        // function (err, response) {
                        //         if (err || response.nModified == 0) {
                        //             res.send({
                        //                 "status": 0,
                        //                 "errors": 'Email-ID is not matched with given mobile number'
                        //             });
                        //         }
                        //         else {

                        //     });

                    } else {
                        res.send({
                            "status": 0,
                            "message": 'Email-ID is not Found',
                            "error": true,
                            "data": []
                        })
                    }
                }


            } catch (e) {
                console.log("error at usermailcheck api at user.js", e)
            }

            return;
            // function (err, docs) {
            //     if (err || !docs[0] || docs[0].length == 0) {
            //         res.send({
            //             "status": 0,
            //             "errors": 'Email-ID is not matched with given mobile number'
            //         });
            //     } else {
            //         var otp = library.randomString(8, '#A');
            //         db.UpdateDocument('users', { 'email': request.email }, { 'otp': otp }, {}, function (err, response) {
            //             if (err || response.nModified == 0) {
            //                 res.send({
            //                     "status": 0,
            //                     "errors": 'Email-ID is not matched with given mobile number'
            //                 });
            //             }
            //             else {
            //                 db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
            //                     if (err || !settings) {
            //                         res.send({ "status": "0", "errors": "Configure your app settings" });
            //                     } else {
            //                         var mailData = {};
            //                         mailData.template = 'Forgotpassword';
            //                         mailData.to = docs[0].email;
            //                         mailData.html = [];
            //                         mailData.html.push({ name: 'name', value: docs[0].username || "" });
            //                         mailData.html.push({ name: 'otp', value: otp || "" });
            //                         mailcontent.sendmail(mailData, function (err, response) { });
            //                         var mode = '';
            //                         var otp_string = '';
            //                         if (typeof settings.settings != 'undefined' && typeof settings.settings.twilio != 'undefined' && typeof settings.settings.twilio.mode != 'undefined') {
            //                             mode = settings.settings.twilio.mode
            //                             if (settings.settings.twilio.mode == 'development') {
            //                                 otp_string = otp;
            //                             }
            //                         }
            //                         data.status = '1';
            //                         data.otp = otp_string;
            //                         data.mode = mode;
            //                         data.message = 'OTP has been sent to your registered mail';
            //                         res.send(data)
            //                     }
            //                 });
            //             }
            //         });
            //     }
            // });
        }
    };


    controller.UserforgotPassword = async (req, res) => {
        // var errors = [];
        // req.checkBody('email', 'email is required').isEmail();
        // req.checkBody('otp', 'otp is required').notEmpty();
        // req.checkBody('password', 'email is required').notEmpty();
        // errors = req.validationErrors();

        // if (errors) {
        //     res.send({
        //         "status": "0",
        //         "errors": errors[0].msg  
        //     });
        //     return;
        // }
        var data = {};

        var request = {};
        request.email = req.body.email;
        request.otp = req.body.otp;
        request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);

        try {
            let verifyOtp = await db.GetDocument('users', { email: request.email, 'otp': request.otp }, {}, {})

            if (!verifyOtp) {
                res.send({
                    "status": 0,
                    "message": 'Something Went Wrong',
                    "error": true
                });
            } else {
                if (verifyOtp.status == false) {
                    res.send({
                        "status": 0,
                        "message": 'You have entered wrong OTP',
                        "error": true
                    });
                } else {

                    var currenttime = new Date().getTime()

                    var otp_time = new Date(verifyOtp.doc[0].otp_time).getTime()

                    // console.log("otp_timeotp_timeotp_timeotp_timeotp_timeotp_timeotp_timeotp_time")

                    // console.log(otp_time, currenttime)

                    // console.log(currenttime - otp_time)

                    const minutes = Math.floor((currenttime - otp_time) / (1000 * 60));


                    // console.log(minutes)
                    // console.log("otp_timeotp_timeotp_timeotp_timeotp_timeotp_timeotp_timeotp_time")

                    if (minutes > 5) {
                        res.send({
                            "status": 0,
                            "message": 'OTP expires .Request new OTP',
                            "error": true
                        });
                    } else {
                        let updatePassword = await db.UpdateDocument('users', { email: request.email }, { 'password': request.password })
                        console.log(updatePassword)
                        if (!updatePassword) {
                            res.send({
                                "status": 0,
                                "message": 'Something went wrong',
                                "error": true
                            });
                        } else {
                            if (updatePassword && updatePassword.doc.modifiedCount > 0) {
                                res.send({
                                    "status": 0,
                                    "message": 'Your new password has been updated successfully',
                                    "error": false
                                });
                            } else {
                                res.send({
                                    "status": 0,
                                    "message": 'Something went wrong',
                                    "error": true
                                });
                            }
                        }
                    }


                }
            }
        } catch (e) {
            console.log("error at UserforgotPassword in users.js ", e)
        }




        // db.GetDocument('users', { email: request.email, 'otp': request.otp }, {}, {}, function (err, docs) {
        //     if (err || !docs[0] || docs[0].length == 0) {
        //         res.send({
        //             "status": 0,
        //             "errors": 'OTP does not match'
        //         });
        //     } else {
        //         db.UpdateDocument('users', { email: request.email }, { 'password': request.password }, {}, function (err, response) {
        //             if (err || response.nModified == 0) {
        //                 res.send({
        //                     "status": 0,
        //                     "errors": 'OTP does not match'
        //                 });
        //             } else {
        //                 res.send({
        //                     "status": 1,
        //                     "message": 'Password has been changed successfully'
        //                 });
        //             }
        //         });
        //     }
        // });
    }

    controller.cusineList = function (req, res) {
        var errors = [];
        req.checkBody('latitude', 'latitude is required').notEmpty();
        req.checkBody('longitude', 'longitude is required').notEmpty();
        req.checkBody('rcat', 'category is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var data = {};
        data.lon = req.body.longitude;
        data.lat = req.body.latitude;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                db.GetOneDocument('rcategory', { '_id': { $eq: mongoose.Types.ObjectId(req.body.rcat) } }, {}, {}, (err, catdata) => {
                    if (err || !catdata) {
                        res.send({ "status": "0", "errors": "invalid category" });
                    } else {
                        if (catdata && catdata.is_cuisine != 1) {
                            var cusinelis = {};
                            cusinelis.status = '1';
                            cusinelis.fileterList = [];
                            res.send(cusinelis)
                        } else {
                            var site_url = settings.settings.site_url;
                            var defaultImage = CONFIG.CUSINE_DEFAULT_IMAGE;
                            var temp_radius = settings.settings.radius || 20;
                            var radius = parseInt(temp_radius);
                            var filter_query = { "status": 1, food_count: { $gte: 1 } };
                            if (req.body.rcat && isObjectId(req.body.rcat)) {
                                filter_query.rcategory = { $eq: mongoose.Types.ObjectId(req.body.rcat) };
                            }
                            var condition = [
                                {
                                    "$geoNear": {
                                        near: {
                                            type: "Point",
                                            coordinates: [parseFloat(data.lon), parseFloat(data.lat)]
                                        },
                                        distanceField: "distance",
                                        includeLocs: "location",
                                        query: filter_query,
                                        distanceMultiplier: 0.001,
                                        spherical: true
                                    }
                                },
                                {
                                    "$redact": {
                                        "$cond": {
                                            "if": { "$lte": ["$distance", radius] },
                                            "then": "$$KEEP",
                                            "else": "$$PRUNE"
                                        }
                                    }
                                },
                                { "$unwind": { path: "$main_cuisine", preserveNullAndEmptyArrays: true } },
                                { '$lookup': { from: 'cuisine', localField: 'main_cuisine._id', foreignField: '_id', as: 'cuisine' } },
                                { "$unwind": { path: "$cuisine", preserveNullAndEmptyArrays: true } },
                                {
                                    "$project": {
                                        _id: "$main_cuisine._id",
                                        name: "$main_cuisine.name",
                                        image: { $concat: [{ $literal: site_url }, { "$cond": [{ $eq: [{ "$ifNull": ["$cuisine.image", ''] }, ''] }, { $literal: defaultImage }, "$cuisine.image"] }] }
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$_id",
                                        name: { $first: "$name" },
                                        image: { $first: "$image" },
                                        rest_count: { $sum: 1 }
                                    }
                                }
                            ];
                            db.GetAggregation('restaurant', condition, function (err, docdata) {
                                if (err || docdata.length == 0 || !docdata) {
                                    res.send({ "status": "0", "errors": "sorry no cuisines available in your location" });
                                } else {
                                    var cusinelis = {};
                                    cusinelis.status = '1';
                                    cusinelis.fileterList = docdata;
                                    res.send(cusinelis)
                                }
                            });
                        }
                    }
                })
            }
        });

        /* db.GetDocument('cuisine', { status: { $eq: 1 } }, { name: 1 }, {}, function (err, resRespo) {
            if (err || !resRespo || resRespo.length == 0) {
                res.send({ "status": "0", "errors": "No outlets available in your location" });
            } else {
                var cusinelis = {};
                cusinelis.status = '1';
                cusinelis.fileterList = resRespo
                res.send(cusinelis)
            }
        }); */
    }

    controller.get_PayList = async (req, res) => {

        var payment_gateway_data = {}
        var payment_gateways = await db.GetDocument('paymentgateway', { status: { $eq: 1 } }, {}, {})




        try {
            if (!payment_gateway_data) {
                payment_gateway_data.message = "Something Went Wrong"
                payment_gateway_data.status = 0
                payment_gateway_data.error = true

                res.send(payment_gateway_data)

            } else {
                payment_gateway_data.message = "Success"
                payment_gateway_data.status = 1
                payment_gateway_data.error = false
                payment_gateway_data.data = payment_gateways.doc
                res.send(payment_gateway_data)
            }
        } catch (e) {
            console.log("Error at get_PayList api ", e)
        }



        // function (err, paymentgateway) {
        //     if (err || !paymentgateway) {
        //         res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
        //     } else {
        //         var list = [];
        //         var data = {};
        //         data.status = '1';
        //         data.list = [];
        //         for (i in paymentgateway) {
        //             data.list.push({ 'gateway': paymentgateway[i].gateway_name, 'gateway_status': paymentgateway[i].status })
        //         }
        //         res.send(data)
        //     }
        // });
    }
    controller.featureproducts = async (req, res) => {


        try {
            var data = {};
            var condition = {};
            if (typeof req.body.search == 'undefined' || typeof req.body.search == null) {
                // data.status = 0;
                // data.message = 'search is requird';
                // return res.send(data);
                condition =
                {
                    // $match: { 
                    status: { $eq: 1 }
                    // } 
                }
            } else {
                var searchs = req.body.search;

                condition['$and'] = []
                condition['$and'].push(
                    // {
                    // $match: 
                    { status: { $eq: 1 }, name: { $regex: searchs + '.*', $options: 'si' } }
                    // }
                )

            }
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            if (settings.status === false) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                var query = [
                    { $match: condition },
                    // { 'status': { $eq: 1 } }
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: "scategory",
                            let: {
                                scategory: "$scategory",
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { "$eq": ["$_id", "$$scategory"] },
                                                { "$eq": ["$status", 1] },
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "subcategory"
                        }
                    },
                    { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            name: 1,
                            slug: 1,
                            avatar: 1,
                            rcategory: 1,
                            scat_id: "$subcategory._id",
                            itmcat: 1,
                            status: 1,
                            size: 1,
                            hover_image: 1,
                            base_price: 1,
                            sale_price: 1,
                            offer_status: 1,
                            quantity: { $ifNull: ["$quantity", 0] },
                            offer_amount: 1,
                            size_status: 1,
                            quantity_size: 1,
                            rating: 1,
                            total_rating_users: 1,
                            price_details: {
                                $map: {
                                    input: '$price_details',
                                    as: 'priceDetail',
                                    in: {
                                        $mergeObjects: [
                                            '$$priceDetail',
                                            {

                                                discount_percentage: {
                                                    $cond: {
                                                        if: { $lt: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, 0] },
                                                        then: 0,
                                                        else: {
                                                            $round: {

                                                                $multiply: [

                                                                    { $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
                                                                    100
                                                                ]
                                                            }
                                                        }

                                                    }

                                                }

                                            }
                                        ]
                                    }


                                }
                            },
                            notZero: {
                                $filter: {
                                    input: "$quantity_size",
                                    as: "item",
                                    cond: {
                                        $and: [
                                            {
                                                $eq: ["$$item.status", 1]
                                            },
                                            {
                                                $ne: ['$$item.quantity', 0]
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            slug: 1,
                            avatar: 1,
                            rcategory: 1,
                            scat_id: "$subcategory._id",
                            itmcat: 1,
                            status: 1,
                            size: 1,
                            hover_image: 1,
                            base_price: 1,
                            sale_price: 1,
                            offer_status: 1,
                            quantity: 1,
                            offer_amount: 1,
                            size_status: 1,
                            quantity_size: 1,
                            notZero: 1,
                            rating: 1,
                            total_rating_users: 1,
                            price_details: 1,
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            slug: 1,
                            avatar: 1,
                            rcategory: 1,
                            scat_id: "$subcategory._id",
                            itmcat: 1,
                            status: 1,
                            size: 1,
                            hover_image: 1,
                            base_price: 1,
                            sale_price: 1,
                            offer_status: 1,
                            quantity: 1,
                            offer_amount: 1,
                            size_status: 1,
                            quantity_size: 1,
                            notZero: 1,
                            rating: 1,
                            total_rating_users: 1,
                            filterSize: { $ifNull: ['$notZero', []] },
                            price_details: 1
                        }
                    },
                    // {$sample: {size: 8}}
                    { $limit: 8 },
                ];
                if (req.body.user_id) {
                    if (!mongoose.isValidObjectId(req.body.user_id)) {
                        return res.send({ status: 0, message: "Invalid user_id! Please check and try again" });
                    }
                    query.push(
                        {
                            $lookup: {
                                from: "favourite",
                                let: { product_id: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.user_id)] },
                                                    { $eq: ["$product_id", "$$product_id"] },
                                                    { $eq: ["$status", 1] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: "favourite"
                            }
                        }
                    )
                } else {
                    query.push(
                        { $addFields: { favourite: { $literal: [] } } }
                    )
                };
                query.push(
                    {
                        $project: {
                            name: 1,
                            slug: 1,
                            avatar: 1,
                            rcat_id: "$rcategory",
                            scat_id: "$scat_id",
                            itmcat: 1,
                            status: 1,
                            size: 1,
                            hover_image: 1,
                            base_price: 1,
                            sale_price: 1,
                            offer_status: 1,
                            quantity: 1,
                            filterSize: 1,
                            rating: 1,
                            total_rating_users: 1,
                            offer_amount: { $ifNull: ['$offer_amount', 0] },
                            size_status: 1,
                            quantity_size: {
                                $filter: {
                                    input: "$quantity_size",
                                    as: "item",
                                    cond: {
                                        $eq: ["$$item.status", 1]
                                    }
                                }
                            },
                            price_details: {
                                $map: {
                                    input: '$price_details',
                                    as: 'priceDetail',
                                    in: {
                                        $mergeObjects: [
                                            '$$priceDetail',
                                            {

                                                discount_percentage: {
                                                    $cond: {
                                                        if: { $lt: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, 0] },
                                                        then: 0,
                                                        else: {
                                                            $round: {

                                                                $multiply: [

                                                                    { $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
                                                                    100
                                                                ]
                                                            }
                                                        }

                                                    }

                                                }

                                            }
                                        ]
                                    }


                                }
                            },


                            favourite_add: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                            in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
                            no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },

                            discount_percentage: {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                            100
                                        ]
                                    }
                                ]

                            },



                        }
                    },
                )




                const productlist = await db.GetAggregation('food', query)




                if (productlist && productlist.length > 0) {
                    productlist.forEach(prduct => {
                        prduct.favourite = 0;
                        if (prduct.avatar && prduct.avatar != undefined) {
                            prduct.avatar = settings.doc.settings.site_url + prduct.avatar.slice(2);
                        }
                        if (prduct.hover_image && prduct.hover_image != undefined) {
                            prduct.hover_image = settings.doc.settings.site_url + prduct.hover_image.slice(2);
                        }
                        prduct.currency = settings.doc.settings.currency_symbol;

                        if (prduct.offer_status == 1) {
                            prduct.offer_base = JSON.parse(JSON.stringify(prduct.base_price));
                            var offer_price = parseFloat(parseFloat((prduct.base_price * prduct.offer_amount) / 100).toFixed(2));
                            var sub_price = prduct.base_price - offer_price;
                            prduct.offer_sale = sub_price > 0 ? sub_price : 0
                        }



                        if (prduct.size_status == 1 && (prduct.price_details && prduct.price_details.length > 0)) {
                            for (let i = 0; i < prduct.price_details.length; i++) {
                                if (prduct.price_details[i].quantity > 0) {
                                    prduct.price_details[i].variance_ = 1


                                } else {
                                    prduct.price_details[i].availability = 0
                                }
                            }
                            prduct.variance_quantity = prduct.price_details.reduce((accumulator, currentValue) => {
                                return accumulator + currentValue.quantity;
                            }, 0)
                        }

                        if (prduct.size_status == 2) {
                            if (prduct.quantity > 0) {

                                prduct.availability = 1
                            } else {
                                prduct.availability = 0
                            }
                        }



                    });
                    data.status = true;
                    data.message = 'success';
                    data.productList = productlist;
                    res.send(data);
                    console.log("-----------data---------at status 1-------", data)
                } else {
                    data.status = 0;
                    data.message = 'success';
                    data.productList = [];
                    // console.log("-----------data----------------", data)
                    res.send(data);
                }
            }
        } catch (e) {
            console.log("Error at featureproducts apis ", e)

            data.status = 0
            data.message = "Something Went Wrong"
            res.send(data)
        }

        // }
        // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        // 	if (err || !settings) {
        // 		res.send({ "status": "0", "errors": "Configure your app settings" });
        // 	} else {
        // 		var query = [
        // 			{ $match: { 'status': { $eq: 1 } } },
        // 			{ $sort: { createdAt: -1 } },
        // 			{
        // 				$lookup: {
        // 					from: "scategory",
        // 					let: {
        // 						scategory: "$scategory",
        // 					},
        // 					pipeline: [
        // 						{
        // 							$match: {
        // 								$expr: {
        // 									$and: [
        // 										{ "$eq": ["$_id", "$$scategory"] },
        // 										{ "$eq": ["$status", 1] },
        // 									]
        // 								}
        // 							}
        // 						}
        // 					],
        // 					as: "subcategory"
        // 				}
        // 			},
        // 			{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
        // 			{
        // 				$project: {
        // 					name: 1,
        // 					slug: 1,
        // 					avatar: 1,
        // 					rcategory: 1,
        // 					scat_id: "$subcategory._id",
        // 					itmcat: 1,
        // 					status: 1,
        // 					size: 1,
        // 					hover_image: 1,
        // 					base_price: 1,
        // 					sale_price: 1,
        // 					offer_status: 1,
        // 					quantity: { $ifNull: ["$quantity", 0] },
        // 					offer_amount: 1,
        // 					size_status: 1,
        // 					quantity_size: 1,
        // 					notZero: {
        // 						$filter: {
        // 							input: "$quantity_size",
        // 							as: "item",
        // 							cond: {
        // 								$and: [
        // 									{
        // 										$eq: ["$$item.status", 1]
        // 									},
        // 									{
        // 										$ne: ['$$item.quantity', 0]
        // 									}
        // 								]
        // 							}
        // 						}
        // 					}
        // 				}
        // 			},
        // 			{
        // 				$project: {
        // 					name: 1,
        // 					slug: 1,
        // 					avatar: 1,
        // 					rcategory: 1,
        // 					scat_id: "$subcategory._id",
        // 					itmcat: 1,
        // 					status: 1,
        // 					size: 1,
        // 					hover_image: 1,
        // 					base_price: 1,
        // 					sale_price: 1,
        // 					offer_status: 1,
        // 					quantity: 1,
        // 					offer_amount: 1,
        // 					size_status: 1,
        // 					quantity_size: 1,
        // 					notZero: 1,
        // 				}
        // 			},
        // 			{
        // 				$project: {
        // 					name: 1,
        // 					slug: 1,
        // 					avatar: 1,
        // 					rcategory: 1,
        // 					scat_id: "$subcategory._id",
        // 					itmcat: 1,
        // 					status: 1,
        // 					size: 1,
        // 					hover_image: 1,
        // 					base_price: 1,
        // 					sale_price: 1,
        // 					offer_status: 1,
        // 					quantity: 1,
        // 					offer_amount: 1,
        // 					size_status: 1,
        // 					quantity_size: 1,
        // 					notZero: 1,
        // 					filterSize: { $ifNull: ['$notZero', []] }
        // 				}
        // 			},
        // 			{
        // 				$project: {
        // 					name: 1,
        // 					slug: 1,
        // 					avatar: 1,
        // 					rcat_id: "$rcategory",
        // 					scat_id: "$scat_id",
        // 					itmcat: 1,
        // 					status: 1,
        // 					size: 1,
        // 					hover_image: 1,
        // 					base_price: 1,
        // 					sale_price: 1,
        // 					offer_status: 1,
        // 					quantity: 1,
        // 					filterSize: 1,
        // 					offer_amount: { $ifNull: ['$offer_amount', 0] },
        // 					size_status: 1,
        // 					quantity_size: {
        // 						$filter: {
        // 							input: "$quantity_size",
        // 							as: "item",
        // 							cond: {
        // 								$eq: ["$$item.status", 1]
        // 							}
        // 						}
        // 					},
        // 					in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
        // 					no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
        // 				}
        // 			},
        // 			// {$sample: {size: 8}}
        // 			{ $limit: 8 }
        // 		];
        // 		db.GetAggregation('food', query, (err, productlist) => {
        // 			console.log("err", err)
        // 			if (productlist && productlist.length > 0) {
        // 				productlist.forEach(prduct => {
        // 					prduct.favourite = 0;
        // 					if (prduct.avatar && prduct.avatar != undefined) {
        // 						prduct.avatar = settings.settings.site_url + prduct.avatar.slice(2);
        // 					}
        // 					if (prduct.hover_image && prduct.hover_image != undefined) {
        // 						prduct.hover_image = settings.settings.site_url + prduct.hover_image.slice(2);
        // 					}
        // 					prduct.currency = settings.settings.currency_symbol;

        // 					if (prduct.offer_status == 1) {
        // 						prduct.offer_base = JSON.parse(JSON.stringify(prduct.base_price));
        // 						var offer_price = parseFloat(parseFloat((prduct.base_price * prduct.offer_amount) / 100).toFixed(2));
        // 						var sub_price = prduct.base_price - offer_price;
        // 						prduct.offer_sale = sub_price > 0 ? sub_price : 0
        // 					}

        // 				});
        // 				data.status = 1;
        // 				data.message = 'success';
        // 				data.productList = productlist;
        // 				res.send(data);
        // 			} else {
        // 				data.status = 0;
        // 				data.message = 'success';
        // 				data.productList = [];
        // 				res.send(data);
        // 			}
        // 		});
        // 	}
        // });
    }
    controller.foodMenu = function (req, res) {
        var errors = [];
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('user_id', 'user_id is required').optional();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        data.rest_id = req.body.rest_id;
        data.user_id = req.body.user_id;
        var categoryQuerys = [
            { "$match": { status: { $eq: 1 }, has_child: 'no', 'restaurant': new mongoose.Types.ObjectId(data.rest_id), 'mainparent': 'yes' } },
            {
                $lookup: {
                    from: "food",
                    let: {
                        restaurantId: "$restaurant",
                        categoryId: "$_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { "$eq": ["$shop", "$$restaurantId"] },
                                        { "$eq": ["$status", 1] },
                                        { "$ne": [{ $indexOfArray: ['$categories', { category: "$$categoryId" }] }, -1] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 },
                        { $count: 'count' }
                    ],
                    as: "foodDetails"
                }
            },
            { $unwind: { path: "$foodDetails", preserveNullAndEmptyArrays: true } },
            { $match: { "foodDetails.count": { $gte: 1 } } },
            { "$project": { name: 1, has_child: 1, foodDetails: 1, sort_name: { $toLower: "$name" } } },
            { $sort: { "sort_name": 1 } },
        ];
        var categoryQuery = [
            { "$match": { has_child: 'yes', status: { $eq: 1 }, 'restaurant': new mongoose.Types.ObjectId(data.rest_id), 'mainparent': 'yes' } },
            {
                $lookup: {
                    from: "categories",
                    let: {
                        parentCategoryId: "$_id",
                        restaurantId: "$restaurant",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { "$eq": ["$parent", "$$parentCategoryId"] },
                                        { "$eq": ["$status", 1] },
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "food",
                                let: {
                                    restaurantId: "$$restaurantId",
                                    categoryId: "$_id",
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { "$eq": ["$shop", "$$restaurantId"] },
                                                    { "$eq": ["$status", 1] },
                                                    { "$ne": [{ $indexOfArray: ['$categories', { category: "$$categoryId" }] }, -1] }
                                                ]
                                            }
                                        }
                                    },
                                    { $limit: 1 },
                                    { $count: 'count' }
                                ],
                                as: "foodDetails"
                            }
                        },
                        { $unwind: { path: "$foodDetails", preserveNullAndEmptyArrays: true } },
                        { $match: { "foodDetails.count": { $gte: 1 } } },
                        { "$project": { count: '$foodDetails.count' } },
                    ],
                    as: "subCategoryDetails"
                }
            },
            { "$project": { name: 1, has_child: 1, sort_name: { $toLower: "$name" }, count: { $reduce: { input: "$subCategoryDetails", initialValue: { sum: 0 }, in: { sum: { $add: ["$$value.sum", "$$this.count"] } } } } } },
            { $match: { "count.sum": { $gte: 1 } } },
            { $sort: { "sort_name": 1 } },
        ];
        if (data.user_id) {
            db.GetAggregation('categories', categoryQuerys, function (err, docdatas) {
                var food_arr = [];
                if (typeof docdatas != 'undefined' && docdatas.length > 0) {
                    for (var i in docdatas) {
                        food_arr.push({ '_id': docdatas[i]._id, 'name': docdatas[i].name, 'has_child': docdatas[i].has_child })
                    }
                }
                db.GetAggregation('categories', categoryQuery, function (err, docdata) {
                    if (err) {
                        res.send({ "status": "0", "errors": "Sorry no food to available..!" });
                    }
                    else {
                        var test = food_arr;
                        if (typeof docdata != 'undefined' && docdata.length > 0) {
                            test = food_arr.concat(docdata);
                        }
                        db.GetOneDocument('restaurant', { _id: data.rest_id, status: { $eq: 1 } }, { offer: 1, package_charge: 1 }, {}, function (err, resRespo) {
                            if (err || !resRespo) {
                                res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                            } else {
                                db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 }, favourite: { $elemMatch: { id: data.rest_id } } }, {}, {}, function (err, userRespo) {
                                    if (err) {
                                        res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                                    } else {
                                        var favourite = 0;
                                        if (userRespo) {
                                            if (userRespo.favourite) {
                                                favourite = 1;
                                            }
                                        }
                                        var response = {}
                                        if (typeof resRespo.offer != 'undefined') {
                                            response.offer_type = '';
                                            if (typeof resRespo.offer.offer_type != 'undefined') {
                                                response.offer_type = resRespo.offer.offer_type;
                                            }
                                            response.target_amount = 0;
                                            if (typeof resRespo.offer.target_amount != 'undefined') {
                                                response.target_amount = (resRespo.offer.target_amount).toFixed(2);
                                            }
                                            response.offer_amount = 0;
                                            if (typeof resRespo.offer.target_amount != 'undefined') {
                                                response.offer_amount = (resRespo.offer.offer_amount).toFixed(2);
                                            }
                                            response.max_off = 0;
                                            if (typeof resRespo.offer.max_off != 'undefined') {
                                                response.max_off = (resRespo.offer.max_off).toFixed(2);
                                            }
                                            response.offer_status = '';
                                            if (typeof resRespo.offer.offer_status != 'undefined') {
                                                response.offer_status = resRespo.offer.offer_status;
                                            }
                                        }


                                        /*var resp = {}
                                         resp.package_status = resRespo.package_charge.package_status;
                                         resp.package_amount = (resRespo.package_charge.package_amount).toFixed(2);
                                       */

                                        var resp = {}
                                        resp.package_status = false;
                                        resp.package_amount = '';
                                        if (resRespo.package_charge) {
                                            if (resRespo.package_charge.package_status) {
                                                resp.package_status = resRespo.package_charge.package_status;
                                            }
                                            if (resRespo.package_charge.package_amount) {
                                                resp.package_amount = (resRespo.package_charge.package_amount).toFixed(2);
                                            }
                                        }

                                        var respo = {};
                                        respo.status = '1';
                                        respo.favourite = favourite;
                                        respo.offer = response;
                                        respo.package_charge = resp;
                                        respo.menu = test;
                                        res.send(respo)
                                    }
                                });
                            }
                        });
                    }
                });
            });
        }
        else {
            /*  var categoryQuerys = [
                 { "$match": { status: { $ne: 0 }, has_child: 'no', 'restaurant': new mongoose.Types.ObjectId(data.rest_id), 'mainparent': 'yes' } },
                 { "$unwind": { path: "$categories", preserveNullAndEmptyArrays: true } },
                 { '$lookup': { from: 'food', localField: '_id', foreignField: 'categories.category', as: 'foodDetails' } },
                 { "$project": { name: 1, has_child: 1, foodDetails: 1 } },
                 { $sort: { "createdAt": -1 } },
             ]; */
            db.GetAggregation('categories', categoryQuerys, function (err, docdatas) {
                var food_arr = [];
                if (typeof docdatas != 'undefined' && docdatas.length > 0) {
                    for (var i in docdatas) {
                        food_arr.push({ '_id': docdatas[i]._id, 'name': docdatas[i].name, 'has_child': docdatas[i].has_child })
                    }
                }
                db.GetAggregation('categories', categoryQuery, function (err, docdata) {
                    if (err || !docdata || docdata.length == 0) {
                        res.send({ "status": "0", "errors": "Sorry no food to available..!" });
                    }
                    else {
                        var test = food_arr;
                        if (typeof docdata != 'undefined' && docdata.length > 0) {
                            test = food_arr.concat(docdata);
                        }
                        db.GetOneDocument('restaurant', { _id: data.rest_id, status: { $eq: 1 } }, { offer: 1, package_charge: 1 }, {}, function (err, resRespo) {
                            if (err || !resRespo) {
                                res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                            } else {
                                var favourite = 0;
                                /* var response = {}
                                response.offer_type = resRespo.offer.offer_type;
                                response.target_amount = (resRespo.offer.target_amount).toFixed(2);
                                response.offer_amount = (resRespo.offer.offer_amount).toFixed(2);
                                response.max_off = (resRespo.offer.max_off).toFixed(2);
                                response.offer_status = resRespo.offer.offer_status; */
                                var response = {}
                                if (typeof resRespo.offer != 'undefined') {
                                    response.offer_type = '';
                                    if (typeof resRespo.offer.offer_type != 'undefined') {
                                        response.offer_type = resRespo.offer.offer_type;
                                    }
                                    response.target_amount = 0;
                                    if (typeof resRespo.offer.target_amount != 'undefined') {
                                        response.target_amount = (resRespo.offer.target_amount).toFixed(2);
                                    }
                                    response.offer_amount = 0;
                                    if (typeof resRespo.offer.target_amount != 'undefined') {
                                        response.offer_amount = (resRespo.offer.offer_amount).toFixed(2);
                                    }
                                    response.max_off = 0;
                                    if (typeof resRespo.offer.max_off != 'undefined') {
                                        response.max_off = (resRespo.offer.max_off).toFixed(2);
                                    }
                                    response.offer_status = '';
                                    if (typeof resRespo.offer.offer_status != 'undefined') {
                                        response.offer_status = resRespo.offer.offer_status;
                                    }
                                }
                                var resp = {}
                                resp.package_status = false;
                                resp.package_amount = '';
                                if (resRespo.package_charge) {
                                    if (resRespo.package_charge.package_status) {
                                        resp.package_status = resRespo.package_charge.package_status;
                                    }
                                    if (resRespo.package_charge.package_amount) {
                                        resp.package_amount = (resRespo.package_charge.package_amount).toFixed(2);
                                    }
                                }
                                var respo = {};
                                respo.status = '1';
                                respo.favourite = favourite;
                                respo.offer = response;
                                respo.package_charge = resp;
                                respo.menu = test;
                                res.send(respo)
                            }
                        });
                    }
                });
            });
        }
    }


    /* controller.foodMenu = function (req, res) {
         var errors = [];
         req.checkBody('rest_id', 'rest_id is required').notEmpty();
         errors = req.validationErrors();
     
         if (errors) {
             res.send({
                 "status": "0",
                 "errors": errors[0].msg
             });
             return;
         }
     
         var data = {};
         data.rest_id = req.body.rest_id;
     
         var categoryQuery = [
             { "$match": { status: { $ne: 0 }, 'restaurant': new mongoose.Types.ObjectId(data.rest_id), 'mainparent': 'yes' } },
             { "$lookup": { from: "categories", localField: "_id", foreignField: "parent", as: "submenu" } },
             { "$project": { name: 1, parent: 1, has_child: 1, submenu: 1 } },
     
         ];
     
         db.GetAggregation('categories', categoryQuery, function (err, docdata) {
             if (err || !docdata || docdata.length == 0) {
                 res.send({ "status": "0", "errors": "Sorry no food to available..!" });
             }
             else {
                 db.GetOneDocument('restaurant', { _id: data.rest_id, status: { $eq: 1 } }, { offer: 1 }, {}, function (err, resRespo) {
                     if (err || !resRespo) {
                         res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                     } else {
                         var response = {}
                        
                         response.offer_type = resRespo.offer.offer_type;
                         response.target_amount = resRespo.offer.target_amount;
                         response.offer_amount = resRespo.offer.offer_amount;
     
     
     
                         for (var i = 0; i < docdata.length; i++) {
                             delete docdata[i].has_child;
                             for (var j = 0; j < docdata[i].submenu.length; j++) {
                                 docdata[i].submenu[j]._id = docdata[i].submenu[j]._id;
                                 docdata[i].submenu[j].name = docdata[i].submenu[j].name;
                                 delete docdata[i].submenu[j].restaurant;
                                 delete docdata[i].submenu[j].updatedAt;
                                 delete docdata[i].submenu[j].createdAt;
                                 delete docdata[i].submenu[j].parent;
                                 delete docdata[i].submenu[j].status;
                                 delete docdata[i].submenu[j].mainparent;
                                 delete docdata[i].submenu[j].description;
                                 delete docdata[i].submenu[j].has_child;
                             }
                         }
                         var respo = {};
                         respo.status = '1';
                         respo.offer = response;
                         respo.menu = docdata;
                         res.send(respo)
                     }
                 });
             }
         });
     }
    */

    controller.foodSubMenu = function (req, res) {
        var errors = [];
        req.checkBody('menu_id', 'menu_id is required').notEmpty();
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var data = {};
        data.cat_id = req.body.menu_id;
        data.rest_id = req.body.rest_id;

        var categoryQuery = [
            { "$match": { status: { $ne: 0 }, 'restaurant': new mongoose.Types.ObjectId(data.rest_id), 'parent': new mongoose.Types.ObjectId(data.cat_id) } },
            { "$project": { name: 1 } }
        ];

        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
            if (err || docdata.length == 0 || !docdata) {
                res.send({ "status": "0", "errors": "Sorry no food available..!" });
            }
            else {
                var respo = {};
                respo.status = '1';
                respo.menu = docdata;
                res.send(respo)
            }
        });
    }

    /*controller.getFood = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('cat_id', 'cat_id is required').notEmpty();
     
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                var conditon = {
                    'status': { $eq: 1 },
                    'shop': new mongoose.Types.ObjectId(req.body.rest_id),
                    "categories": { $elemMatch: { category: new mongoose.Types.ObjectId(req.body.cat_id) } },
                };
                var categoryQuery = [
                    { "$match": conditon },
                    {
                        $group: {
                            _id: "null",
                            category: {
                                $push: {
                                    food_id: "$_id",
                                    food_name: "$name",
                                    price: "$price",
                                    visibility: "$visibility",
                                    offer: { $cond: { if: { $eq: ["$offer.status", 1] }, then: { $literal: "yes" }, else: { $literal: "no" } } },
                                    offer_percent: "$offer.amount",
                                    description: "$description",
                                    image: "$avatar",
                                    addons: "$addons",
                                    more: "$base_pack",
                                    food_time: "$food_time",
                                }
                            }
                        }
                    }
                ];
                db.GetAggregation('food', categoryQuery, function (catErr, catRespo) {
                    if (catErr || catRespo.length == '0' || !catRespo) {
                        res.send({
                            "status": "0",
                            "errors": "Sorry no foods available in this menu..!"
                        });
                    } else {
                        //This block is for more  button whether the food has addons or basepack checking
                        for (var i = 0; i < catRespo[0].category.length; i++) {
                            if (catRespo[0].category[i].more.length != 0 || catRespo[0].category[i].addons != 0) {
                                catRespo[0].category[i].more = 1
                            }
                            else {
                                catRespo[0].category[i].more = 0;
                            }
     
                            var img = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            if (catRespo[0].category[i].image) { img = catRespo[0].category[i].image.slice(2); }
                            catRespo[0].category[i].image = settings.settings.site_url + img;
                        }
                        //This block is for checking whether food time for publishing to user if food has time settings
                        var curent_date = timezone.tz(new Date(), settings.settings.time_zone).format(settings.settings.time_format);
                        var current_time = moment(curent_date, ["h:mm A"]).format("HH:mm");
                        for (var i = 0; i < catRespo[0].category.length; i++) {
                            if (catRespo[0].category[i].food_time.status == 1) {
                                var dynamic_date = timezone.tz(catRespo[0].category[i].food_time.pick_time, settings.settings.time_zone).format(settings.settings.time_format);
                                var dynamic_time = moment(dynamic_date, ["h:mm A"]).format("HH:mm");
                                if (current_time >= dynamic_time && catRespo[0].category[i].visibility == 1) {
                                    catRespo[0].category[i].visibility = 1;
                                }
                                else {
                                    catRespo[0].category[i].visibility = 0;
                                }
                            }
     
                            delete catRespo[0].category[i].addons
                            delete catRespo[0].category[i].food_time
                        }
                        res.send({
                            "status": "1",
                            "food": catRespo[0].category
                        });
                    }
                });
            }
        });
    };*/

    controller.getFood = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('cat_id', 'cat_id is required').notEmpty();
        req.checkBody('type', 'menu_type is required').optional();//recomended
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                var conditon = {
                    'status': { $eq: 1 },
                    'shop': new mongoose.Types.ObjectId(req.body.rest_id),
                    "categories": { $elemMatch: { category: new mongoose.Types.ObjectId(req.body.cat_id) } },
                };
                if (req.body.type == 'recomended') {
                    conditon = {
                        $or: [{
                            'status': { $eq: 1 },
                            'shop': new mongoose.Types.ObjectId(req.body.rest_id),
                            "categories": { $elemMatch: { category: new mongoose.Types.ObjectId(req.body.cat_id) } }
                        },
                        {
                            'status': { $eq: 1 },
                            'shop': new mongoose.Types.ObjectId(req.body.rest_id),
                            'recommended': { $eq: 1 },
                            "categories": { $not: { $elemMatch: { category: new mongoose.Types.ObjectId(req.body.cat_id) } } }
                        }]
                    };
                }

                if (parseInt(req.body.veg) == 1) {
                    conditon.itmcat = { $eq: 1 };
                }

                var categoryQuery = [
                    { "$match": conditon },
                    {
                        $group: {
                            _id: "null",
                            category: {
                                $push: {
                                    food_id: "$_id",
                                    food_name: "$name",
                                    price: "$price",
                                    visibility: "$visibility",
                                    offer: { $cond: { if: { $eq: ["$offer.status", 1] }, then: { $literal: "yes" }, else: { $literal: "no" } } },
                                    offer_percent: "$offer.amount",
                                    description: "$description",
                                    image: "$avatar",
                                    addons: "$addons",
                                    more: "$base_pack",
                                    food_time: "$food_time",
                                }
                            }
                        }
                    },
                    { $limit: 6 }
                ];
                db.GetAggregation('food', categoryQuery, function (catErr, catRespo) {
                    if (catErr || catRespo.length == '0' || !catRespo) {
                        res.send({
                            "status": "0",
                            "errors": "Sorry no foods available in this menu..!"
                        });
                    } else {
                        //This block is for more  button whether the food has addons or basepack checking
                        for (var i = 0; i < catRespo[0].category.length; i++) {
                            var stoploop = false;
                            catRespo[0].category[i].more = 0;
                            if (catRespo[0].category[i] && ((typeof catRespo[0].category[i].base_pack != 'undefined' && catRespo[0].category[i].base_pack.length != 0) || (typeof catRespo[0].category[i].addons != 'undefined' && catRespo[0].category[i].addons.length != 0))) {
                                if (catRespo[0].category[i].more.length != 0) {
                                    if ((typeof catRespo[0].category[i].base_pack != 'undefined' && catRespo[0].category[i].base_pack.length != 0)) {
                                        for (var b = 0; b < catRespo[0].category[i].base_pack.length; b++) {
                                            if (catRespo[0].category[i].base_pack[b].sub_pack.length > 0) {
                                                for (var s = 0; s < catRespo[0].category[i].base_pack[b].sub_pack.length; s++) {
                                                    if (catRespo[0].category[i].base_pack[b].sub_pack[s].visibility == 1) {
                                                        stoploop = true;
                                                        catRespo[0].category[i].more = 1;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (stoploop) {
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (typeof catRespo[0].category[i].addons != 'undefined' && catRespo[0].category[i].addons.length != 0 && stoploop == false) {
                                    for (var a = 0; a < catRespo[0].category[i].addons.length; a++) {
                                        if (catRespo[0].category[i].addons[a].visibility == 1) {
                                            stoploop = true;
                                            catRespo[0].category[i].more = 1;
                                            break;
                                        }
                                    }
                                }
                            }
                            else {
                                catRespo[0].category[i].more = 0;
                            }
                            var offer_percent = '';
                            if (catRespo[0].category[i].offer_percent) { offer_percent = catRespo[0].category[i].offer_percent; }
                            catRespo[0].category[i].offer_percent = offer_percent;

                            var img = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            if (catRespo[0].category[i].image) { img = catRespo[0].category[i].image.slice(2); }
                            catRespo[0].category[i].image = settings.settings.site_url + img;
                        }
                        //This block is for checking whether food time for publishing to user if food has time settings
                        var curent_date = timezone.tz(new Date(), settings.settings.time_zone).format(settings.settings.time_format);
                        var current_time = moment(curent_date, ["h:mm A"]).format("HH:mm");
                        for (var i = 0; i < catRespo[0].category.length; i++) {
                            var food_availability = catRespo[0].category[i].visibility;
                            if (typeof catRespo[0].category[i].food_time != 'undefined' && typeof catRespo[0].category[i].food_time.status != 'undefined' && catRespo[0].category[i].food_time.status == 1) {
                                var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                var currentTime = moment(time_now, "HH:mm a");
                                currentTime.toString();

                                from_date = timezone.tz(catRespo[0].category[i].food_time.from_time, settings.settings.time_zone).format(settings.settings.time_format);
                                to_date = timezone.tz(catRespo[0].category[i].food_time.to_time, settings.settings.time_zone).format(settings.settings.time_format);

                                var startTime = moment(from_date, "HH:mm a");
                                startTime.toString();

                                var endTime = moment(to_date, "HH:mm a");
                                endTime.toString();

                                if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && catRespo[0].category[i].visibility == 1) {
                                    catRespo[0].category[i].visibility = 1;
                                }
                                else {
                                    catRespo[0].category[i].visibility = 0;
                                }

                                if (typeof catRespo[0].category[i].food_time.from_time != 'undefined') {
                                    catRespo[0].category[i].food_time.from_time = new Date(new Date(catRespo[0].category[i].food_time.from_time).getTime() + diff_offset);
                                }
                                if (typeof catRespo[0].category[i].food_time.to_time != 'undefined') {
                                    catRespo[0].category[i].food_time.to_time = new Date(new Date(catRespo[0].category[i].food_time.to_time).getTime() + diff_offset);
                                }
                            }
                            delete catRespo[0].category[i].addons
                            catRespo[0].category[i].food_availability = food_availability;
                        }
                        res.send({
                            "status": "1",
                            "food": catRespo[0].category
                        });
                    }
                });
            }
        });
    };
    controller.restavailability = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        db.GetOneDocument('restaurant', { '_id': req.body.rest_id }, {}, {}, function (catErr, restRespo) {
            if (catErr || !restRespo) {
                res.send({
                    "status": "0",
                    "errors": "Sorry no restaurant found..!"
                });
            } else {
                if (restRespo.status == 1) {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        if (err || !settings) {
                            res.send({ "status": "0", "errors": "Configure your app settings" });
                        } else {
                            var week_days_checkin = 1;
                            var d = new Date();
                            var n = d.getDay();
                            if (n == 6 || n == 0) { week_days_checkin = 0; } //its week end
                            var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                            var currentTime = moment(time_now, "HH:mm a");
                            currentTime.toString();
                            var visibility = 0;
                            if (typeof restRespo.time_setting != 'undefined' && typeof restRespo.time_setting.week_days != 'undefined' && typeof restRespo.time_setting.week_days.start_time != 'undefined') {
                                var start_date = timezone.tz(restRespo.time_setting.week_days.start_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            if (typeof restRespo.time_setting != 'undefined' && typeof restRespo.time_setting.week_days != 'undefined' && typeof restRespo.time_setting.week_days.end_time != 'undefined') {
                                var end_date = timezone.tz(restRespo.time_setting.week_days.end_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            if (week_days_checkin == 0) {
                                if (typeof restRespo.time_setting != 'undefined' && typeof restRespo.time_setting.week_end != 'undefined' && typeof restRespo.time_setting.week_end.start_time != 'undefined') {
                                    start_date = timezone.tz(restRespo.time_setting.week_end.start_time, settings.settings.time_zone).format(settings.settings.time_format);
                                }
                                if (typeof restRespo.time_setting != 'undefined' && typeof restRespo.time_setting.week_end != 'undefined' && typeof restRespo.time_setting.week_end.end_time != 'undefined') {
                                    end_date = timezone.tz(restRespo.time_setting.week_end.end_time, settings.settings.time_zone).format(settings.settings.time_format);
                                }
                            }
                            if (typeof start_date != 'undefined' && typeof end_date != 'undefined') {
                                var startTime = moment(start_date, "HH:mm a");
                                startTime.toString();

                                var endTime = moment(end_date, "HH:mm a");
                                endTime.toString();
                                if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && restRespo.availability == 1 && restRespo.status == 1) {
                                    visibility = 1;
                                }
                            }
                            var server_offset = (new Date).getTimezoneOffset();
                            let day = (new Date).getDay();
                            let tzname = geoTz(parseFloat(restRespo.location.lat), parseFloat(restRespo.location.lng))[0];
                            let offset = tz.tz(tzname).utcOffset();
                            day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                            var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                            var week_days_checkin = 1;
                            var d = new Date();
                            var n = d.getDay();
                            if (n == 6 || n == 0) { week_days_checkin = 0; }
                            data.week_days_checkin = week_days_checkin;
                            if (typeof restRespo.time_setting != 'undefined') {
                                if (typeof restRespo.time_setting.week_days != 'undefined') {
                                    if (typeof restRespo.time_setting.week_days.start_time != 'undefined') {
                                        restRespo.time_setting.week_days.start_time = new Date(new Date(restRespo.time_setting.week_days.start_time).getTime() + diff_offset);
                                    }
                                    if (typeof restRespo.time_setting.week_days.end_time != 'undefined') {
                                        restRespo.time_setting.week_days.end_time = new Date(new Date(restRespo.time_setting.week_days.end_time).getTime() + diff_offset);
                                    }
                                    if (typeof restRespo.time_setting.week_end.start_time != 'undefined') {
                                        restRespo.time_setting.week_end.start_time = new Date(new Date(restRespo.time_setting.week_end.start_time).getTime() + diff_offset);
                                    }
                                    if (typeof restRespo.time_setting.week_end.end_time != 'undefined') {
                                        restRespo.time_setting.week_end.end_time = new Date(new Date(restRespo.time_setting.week_end.end_time).getTime() + diff_offset);
                                    }
                                }
                            }

                            //business hour per day
                            var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                            var currentBtime = new Date();
                            var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                            var open_till = new Date(new Date().getTime() + diff_b_offset);
                            var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                            var currentDay = day_array[day];
                            var working_hours_availability = 0;
                            if (typeof restRespo.working_hours != 'undefined' && restRespo.working_hours.length > 0) {
                                var index_pos = restRespo.working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                if (index_pos != -1) {
                                    var working_hours = restRespo.working_hours[index_pos];
                                    if (working_hours.selected == 1) {
                                        var match_index = working_hours.slots.findIndex(item => {
                                            var start_time = new Date(item.start_time);
                                            var end_time = new Date(item.end_time);
                                            var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                            var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                            if (start_time_seconds > end_time_seconds) {
                                                return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                            } else {
                                                return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                            }
                                        })
                                        if (match_index != -1 || working_hours.wholeday == 1) {
                                            if (working_hours.wholeday == 1) {
                                                var d = new Date();
                                                d.setHours(23);
                                                d.setMinutes(59);
                                                open_till = new Date(new Date(d).getTime() + diff_b_offset);
                                            } else {
                                                open_till = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                            }
                                            working_hours_availability = 1;
                                        } else {
                                            working_hours_availability = 0;
                                        }
                                    } else {
                                        working_hours_availability = 0;
                                    }
                                } else {
                                    working_hours_availability = 0;
                                }
                            }
                            //business hour per day end
                            data.week_days_checkin = week_days_checkin;
                            data.working_time_setting = restRespo.time_setting;
                            data.working_availability = restRespo.availability;
                            data.status = '1';
                            data.availability = visibility;
                            data.working_hours_availability = working_hours_availability;
                            data.open_till = open_till;
                            res.send(data);
                        }
                    });
                } else {
                    res.send({
                        "status": "0",
                        "errors": "Currently Restaurant not available."
                    });
                }
            }
        });
    }

    controller.getAddons = function (req, res) {
        req.checkBody('food_id', 'food_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                db.GetOneDocument('food', { '_id': req.body.food_id, 'status': { $eq: 1 } }, { 'addons': 1, 'base_pack': 1 }, {}, function (catErr, catRespo) {
                    if (catErr || !catRespo) {
                        res.send({
                            "status": "0",
                            "errors": "Sorry no extra courses found..!"
                        });
                    } else {
                        data.status = 1;
                        data.addons = catRespo.addons;
                        data.base_pack = catRespo.base_pack;
                        res.send(data);
                    }
                });
            }
        });
    }


    controller.saveOrderAddress = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('type', 'type is required').notEmpty();
        req.checkBody('address', 'address is required').notEmpty();
        req.checkBody('door_no', 'door_no is required').notEmpty();
        // req.checkBody('landmark', 'landmark is required').optional();
        req.checkBody('lng', 'lng is required').notEmpty();
        req.checkBody('lat', 'lat is required').notEmpty();

        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        var order_address = {
            'user_id': req.body.user_id,
            'line1': req.body.address,
            'street': req.body.door_no,
            'landmark': req.body.landmark,
            'status': 1,
            'choose_location': req.body.type
        };
        order_address.loc = {};
        order_address.loc.lng = req.body.lng;
        order_address.loc.lat = req.body.lat;
        db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
            if (err || !response) {
                res.send({
                    "status": "0", "errors": "User not found..!"
                });
            } else {
                db.GetDocument('order_address', { 'user_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, respo) {
                    if (err) {
                        res.send({ "status": "0", "errors": "User not found..!" });
                    } else {
                        if (respo.length > 5) {
                            res.send({ "status": "0", "errors": "User can add only six address..!" });
                        }
                        else {
                            db.InsertDocument('order_address', order_address, function (err, orderdata) {
                                if (err || orderdata.nModified == 0) {
                                    res.send({ "status": 0, "errors": "Error in delivery location update..!" });
                                } else {
                                    res.send({
                                        "status": "1", "response": "Delivery location updated Successfully."
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });
    }


    controller.editOrderAddress = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('address_id', 'address_id is required').notEmpty();
        req.checkBody('type', 'type is required').notEmpty();
        req.checkBody('address', 'address is required').notEmpty();
        req.checkBody('door_no', 'door_no is required').notEmpty();
        // req.checkBody('landmark', 'landmark is required').optional();
        req.checkBody('lng', 'lng is required').notEmpty();
        req.checkBody('lat', 'lat is required').notEmpty();

        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        data.user_id = req.body.user_id;
        data.address_id = req.body.address_id;

        var order_address = {
            'user_id': req.body.user_id,
            'line1': req.body.address,
            'street': req.body.door_no,
            'landmark': req.body.landmark,
            'status': 1,
            'choose_location': req.body.type
        };

        order_address.loc = {};
        order_address.loc.lng = req.body.lng;
        order_address.loc.lat = req.body.lat;
        db.UpdateDocument('order_address', { user_id: data.user_id, '_id': data.address_id }, order_address, {}, function (err, docdata) {
            if (err || docdata.nModified == 0) {
                res.send({
                    "status": "0",
                    "errors": "Error in order address edit..!"
                });
            } else {
                res.send({
                    "status": "1",
                    "response": "Order address updated successfully."
                });
            }
        });
    };

    controller.getOrderAddress = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
            if (err || !response) {
                res.send({
                    "status": "0", "errors": "User not found..!"
                });
            } else {
                db.GetDocument('order_address', { 'user_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
                    if (err || response.length == 0) {
                        res.send({
                            "status": "0",
                            "errors": "No delivery address found..!"
                        });
                    } else {
                        var doc = [];
                        for (var i = 0; i < response.length; i++) {
                            doc.push({
                                '_id': response[i]._id || '',
                                'line1': response[i].line1 || '',
                                'street': response[i].street || '',
                                'landmark': response[i].landmark || '',
                                'type': response[i].choose_location || '',
                                'lat': response[i].loc.lat || '',
                                'lng': response[i].loc.lng || '',
                            })
                        }
                        res.send({
                            "status": "1",
                            "address": doc
                        });
                    }
                });
            }
        });
    }

    controller.editOrderAddress = function (req, res) {

        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('address_id', 'address_id is required').notEmpty();
        req.checkBody('type', 'type is required').notEmpty();
        req.checkBody('address', 'address is required').notEmpty();
        req.checkBody('door_no', 'door_no is required').notEmpty();
        req.checkBody('landmark', 'landmark is required').optional();
        req.checkBody('lng', 'lng is required').notEmpty();
        req.checkBody('lat', 'lat is required').notEmpty();

        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        data.user_id = req.body.user_id;
        data.address_id = req.body.address_id;

        var order_address = {
            'user_id': req.body.user_id,
            'line1': req.body.address,
            'street': req.body.door_no,
            'landmark': req.body.landmark,
            'status': 1,
            'choose_location': req.body.type
        };

        order_address.loc = {};
        order_address.loc.lng = req.body.lng;
        order_address.loc.lat = req.body.lat;

        db.UpdateDocument('order_address', { user_id: data.user_id, '_id': data.address_id }, order_address, {}, function (err, docdata) {
            if (err || docdata.nModified == 0) {
                res.send({
                    "status": "0",
                    "errors": "Error in order address edit..!"
                });
            } else {
                res.send({
                    "status": "1",
                    "response": "Order address updated successfully."
                });
            }
        });
    };


    controller.deleteOrderAddress = function (req, res) {

        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('address_id', 'address_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        data.user_id = req.body.user_id;
        data.address_id = req.body.address_id;

        db.DeleteDocument('order_address', { 'user_id': data.user_id, '_id': data.address_id }, function (err, respo) {
            if (err || respo.nModified == 0) {
                res.send({
                    "status": "0",
                    "errors": "Error in order address delete..!"
                });
            } else {
                res.send({
                    "status": "1",
                    "response": "Order address deleted successfully."
                });
            }
        });
    };
    // controller.updateProfile = function (req, res) {

    //     req.checkBody('user_id', 'user_id is required').notEmpty();
    //     req.checkBody('first_name', 'first_name is required').optional();
    //     req.checkBody('last_name', 'last_name is required').optional();
    //     req.checkBody('email', 'email is required').optional();

    //     var data = {};
    //     var errors = req.validationErrors();
    //     if (errors) {
    //         res.send({ "status": "0", "errors": errors[0].msg });
    //         return;
    //     }

    //     var request = {};
    //     request.user_id = req.body.user_id;

    //     var update = {};
    //     if (req.body.email) { update.email = req.body.email; }
    //     if (req.body.first_name) { update.username = req.body.first_name };
    //     if (req.body.last_name) { update.last_name = req.body.last_name };

    //     db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
    //         if (err) {
    //             res.send({ status: "0", "errors": "Unable to save your data" });
    //         } else {
    //             db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, IsVaid) {
    //                 if (err) {
    //                     res.send({ status: "0", "errors": "Unable to save your data" });
    //                 } else {

    //                     db.UpdateDocument('users', { '_id': request.user_id }, update, {}, function (err, result) {
    //                         if (err || result.nModified == 0) {
    //                             res.send({ status: "0", "errors": "Email id already exists" });
    //                         } else {
    //                             db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, userdoc) {
    //                                 if (err) {
    //                                     res.send({ status: "0", "errors": "Unable to save your data" });
    //                                 } else {
    //                                     var img = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
    //                                     if (userdoc.avatar) { img = userdoc.avatar.slice(2); }
    //                                     res.send({
    //                                         status: "1",
    //                                         message: "Profile updated successfully...",
    //                                         user_name: userdoc.username,
    //                                         email: userdoc.email,
    //                                         last_name: userdoc.last_name,
    //                                         user_image: settings.settings.site_url + img
    //                                     });
    //                                 }
    //                             });
    //                         }
    //                     });
    //                     //  }
    //                 }
    //             });
    //         }
    //     });
    // };

    controller.updateProfile = function (req, res) {
        if (req.body.phonenumber == 'yes') {
            req.checkBody('country_code', 'country_code is required').notEmpty();
            req.checkBody('phone_number', 'phone_number is required').notEmpty();
            req.checkBody('user_id', 'user id is required').notEmpty();
            req.checkBody('first_name', 'first name is required').optional();
            req.checkBody('last_name', 'last name is required').optional();
            req.checkBody('email', 'Email is required').notEmpty();
        } else {
            req.checkBody('user_id', 'user id is required').notEmpty();
            req.checkBody('first_name', 'first name is required').optional();
            req.checkBody('last_name', 'last name is required').optional();
            req.checkBody('email', 'Email is required').notEmpty();
        }

        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        var request = {};
        request.user_id = req.body.user_id;
        /*  request.country_code = req.body.country_code;
         request.phone_number = req.body.phone_number; */
        data.email = req.body.email;
        data.country_code = req.body.country_code;
        request.phone_number = req.body.phone_number;
        var update = {};
        if (req.body.email) {
            update.email = req.body.email;
        }
        if (req.body.first_name) {
            update.username = req.body.first_name
            request.username = req.body.first_name
        };
        if (req.body.last_name) {
            update.last_name = req.body.last_name;
            request.last_name = req.body.last_name;
        };
        if (req.body.phonenumber == 'yes') {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalsettings) {
                if (err) {
                    res.send({ status: "0", "errors": "Unable to save your data" });
                } else {
                    db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, IsVaid) {
                        if (err || !IsVaid) {
                            res.send({ status: "0", "errors": "Unable to save your data" });
                        } else {
                            db.GetOneDocument('users', { '_id': { $ne: request.user_id }, "email": req.body.email }, {}, {}, function (err, emailCheck) {
                                if (err) {
                                    res.send({ status: "0", "errors": 'Something went wrong..' });
                                } else {
                                    if (emailCheck && emailCheck._id) {
                                        res.send({ status: "0", "errors": 'Email already exists....' });
                                    } else {
                                        db.GetOneDocument('users', { '_id': { $ne: request.user_id }, "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, phoneCheck) {
                                            if (err) {
                                                res.send({ status: "0", "errors": 'Something went wrong..' });
                                            } else {
                                                if (phoneCheck && phoneCheck._id) {
                                                    res.send({ status: "0", "errors": 'Phone Number  already exists' });
                                                } else {
                                                    db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                                                        if (err) {
                                                            res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
                                                        } else {
                                                            var secret = otp.generateSecret();
                                                            var otp_string = otp.generate(secret);
                                                            var pass_code = otp_string.slice(0, 4);
                                                            var to = data.country_code + data.phone_number;
                                                            var message = pass_code + ' is your ' + generalsettings.settings.site_title + ' OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
                                                            var otp_status = "development";
                                                            if (settings.settings.twilio.mode == 'production') {
                                                                otp_status = "production";
                                                                twilio.createMessage(to, '', message, function (err, response) {
                                                                });
                                                            }
                                                            request.otp = pass_code;
                                                            db.UpdateDocument('users', { '_id': request.user_id }, request, {}, function (err, userdoc) {
                                                                if (err) {
                                                                    res.send({ status: "0", "errors": "Unable to save your data" });
                                                                } else {
                                                                    var img = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                    if (userdoc.avatar) { img = userdoc.avatar.slice(2); }
                                                                    res.send({
                                                                        status: "2",
                                                                        message: 'Profile updated successfully',
                                                                        user_name: userdoc.username,
                                                                        email: userdoc.email,
                                                                        last_name: userdoc.last_name,
                                                                        user_image: settings.settings.site_url + img,
                                                                        otp_status: otp_status,
                                                                        otp: pass_code
                                                                    })

                                                                }
                                                            })
                                                        }
                                                    })//update
                                                }
                                            }
                                        })
                                    }

                                }
                            })
                        }
                    })
                }
            })
        } else {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err) {
                    res.send({ status: "0", "errors": "Unable to save your data" });
                } else {
                    db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, IsVaid) {
                        if (err) {
                            res.send({ status: "0", "errors": "Unable to save your data" });
                        } else {
                            db.GetOneDocument('users', { '_id': { $ne: request.user_id }, "email": req.body.email }, {}, {}, function (err, emailCheck) {
                                if (err) {
                                    res.send({ status: "0", "errors": 'Something went wrong..' });
                                } else {
                                    if (emailCheck && emailCheck._id) {
                                        res.send({ status: "0", "errors": 'Email already exists....' });
                                    } else {
                                        db.UpdateDocument('users', { '_id': request.user_id }, update, {}, function (err, result) {
                                            if (err || result.nModified == 0) {
                                                res.send({ status: "0", "errors": 'Email Id already exists' });
                                            } else {
                                                db.GetOneDocument('users', { '_id': request.user_id }, {}, {}, function (err, userdoc) {
                                                    if (err) {
                                                        res.send({ status: "0", "errors": "Unable to save your data" });
                                                    } else {
                                                        var img = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                        if (userdoc.avatar) { img = userdoc.avatar.slice(2); }
                                                        res.send({
                                                            status: "1",
                                                            message: 'Profile updated successfully',
                                                            user_name: userdoc.username,
                                                            email: userdoc.email,
                                                            last_name: userdoc.last_name,
                                                            user_image: settings.settings.site_url + img
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            })
                            //  }
                        }
                    });
                }
            });
        }

    };

    controller.updtnumSendOtp = function (req, res) {
        req.checkBody('user_id', library.getlanguage(req, 'AUA.back-end.USER_ID_REQUIRED', 'user id is required')).notEmpty();
        req.checkBody('country_code', library.getlanguage(req, 'AUA.back-end.COUNTRY_CODE_REQUIRED', 'country_code is required')).notEmpty();
        req.checkBody('phone_number', library.getlanguage(req, 'AUA.back-end.PN_REQUIRED', 'phone_number is required')).notEmpty();

        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        var request = {};
        request.user_id = req.body.user_id;

        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;

        var secret = otp.generateSecret();
        var otp_string = otp.generate(secret);
        var pass_code = otp_string.slice(0, 4);
        var to = data.country_code + data.phone_number;
        request.otp = pass_code;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalsettings) {
            if (err) {
                res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
            } else {
                db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                    if (err) {
                        res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
                    } else {
                        var message = pass_code + ' is your ' + generalsettings.settings.site_title + ' OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
                        var otp_status = "development";
                        if (settings.settings.twilio.mode == 'production') {
                            otp_status = "production";
                            twilio.createMessage(to, '', message, function (err, response) {
                                //console.log(err, response)
                            });
                        }
                        db.UpdateDocument('users', { '_id': request.user_id }, request, {}, function (err, userdoc) {
                            if (err) {
                                res.send({ status: "0", "errors": library.getlanguage(req, "AUA.back-end.UNABLE_SAVE_DATA", "Unable to save your data") });

                            } else {
                                var img = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                if (userdoc.avatar) { img = userdoc.avatar.slice(2); }
                                res.send({
                                    status: "1",
                                    message: library.getlanguage(req, 'AUA.back-end.ONE_TIME_PAS_CODE', 'Your one time pass code is '),
                                    otp_status: otp_status,
                                    otp: pass_code
                                })
                            }
                        })
                    }
                })
            }
        })
    }

    controller.changePassword = async (req, res) => {
        var data = {};
        data.status = 0;

        // req.checkBody('user_id', 'user_id is Required').notEmpty();
        // req.checkBody('current_pass', 'current_pass  is Required').notEmpty();
        // req.checkBody('new_pass', 'new_pass  is Required').optional();

        // var errors = req.validationErrors();
        // if (errors) {
        //     data.response = errors[0].msg;
        //     res.send(data); return;
        // }

        // req.sanitizeBody('user_id').trim();
        // req.sanitizeBody('current_pass').trim();
        // req.sanitizeBody('new_pass').trim();

        var request = {};
        request.user_id = req.body.user_id;
        request.current_pass = req.body.current_pass;
        request.new_pass = req.body.new_pass;

        var validPassword = function (password, passwordb) {
            return bcrypt.compareSync(password, passwordb);
        };



        let user = await db.GetOneDocument('users', { '_id': request.user_id, status: { $ne: 0 } }, {}, {})


        if (!user) {
            res.send({
                status: "0",
                "message": "User id is wrong..!",
                "error": true

            });
        } else {
            if (user.status == false) {
                res.send({
                    status: "0",
                    "message": "User not found",
                    "error": true

                });
            } else {
                if (validPassword(request.current_pass, user.doc.password)) {
                    var pass = bcrypt.hashSync(request.new_pass, bcrypt.genSaltSync(8), null);
                    let updatePassword = await db.UpdateDocument('users', { '_id': request.user_id }, { 'password': pass }, {})
                    console.log(updatePassword)
                    if (!updatePassword) {
                        res.send({
                            status: "0",
                            "message": "Something Went Wrong",
                            "error": true

                        });
                    } else {
                        if (updatePassword && updatePassword.doc && updatePassword.doc.modifiedCount > 0) {
                            res.send({
                                status: "0",
                                "message": "Your Password has updated Sucessfully",
                                "error": false

                            });
                        } else {
                            res.send({
                                status: "0",
                                "message": "Unable to save your data",
                                "error": true

                            });
                        }
                    }
                    // function (err, result) {
                    //     if (err || result.nModified == 0) {
                    //         res.send({ status: "0", "errors": "Unable to save your data" });
                    //     } else {
                    //         res.send({ status: "1", "message": "Password changed successfully..!" });
                    //     }
                    // });
                }
                else {
                    res.send({ status: "0", "errors": "Current password is wrong..!" });
                }

            }
        }
    }


    // db.GetOneDocument('users', { '_id': request.user_id, status: { $ne: 0 } }, {}, {}, function (err, user) {
    //     if (err) {
    //         res.send({ status: "0", "errors": "User id is wrong..!" });
    //     } else {
    //         if (!user.password) { res.send({ status: "0", "errors": "Sorry social user can't change password..!" }); }
    //         else {
    //             if (validPassword(request.current_pass, user.password)) {
    //                 var pass = bcrypt.hashSync(request.new_pass, bcrypt.genSaltSync(8), null);
    //                 db.UpdateDocument('users', { '_id': request.user_id }, { 'password': pass }, {}, function (err, result) {
    //                     if (err || result.nModified == 0) {
    //                         res.send({ status: "0", "errors": "Unable to save your data" });
    //                     } else {
    //                         res.send({ status: "1", "message": "Password changed successfully..!" });
    //                     }
    //                 });
    //             }
    //             else {
    //                 res.send({ status: "0", "errors": "Current password is wrong..!" });
    //             }
    //         }
    //     }
    // });
    // };

    controller.addFavourite = function (req, res) {
        var data = {};
        data.status = 0;
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('rest_id', 'rest_id  is Required').notEmpty();


        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }

        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('rest_id').trim();
        var user_id = req.body.user_id;
        var rest_id = req.body.rest_id;

        db.GetOneDocument('users', { '_id': user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
            if (err || !user) {
                res.send({ status: "0", "errors": "User id is wrong..!" });
            } else {
                db.GetOneDocument('users', { '_id': user_id, status: { $ne: 0 }, "favourite": { $elemMatch: { "id": rest_id } } }, {}, {}, function (err, favdoc) {
                    if (err) {
                        res.send({ status: "0", "errors": "Error in Favourite..!" });
                    } else {
                        if (favdoc) {
                            var condition = { '_id': user_id, status: { $ne: 0 } };
                            var updateDetails = { "$pull": { 'favourite': { id: { $in: [rest_id] } } } };
                            db.UpdateDocument('users', condition, updateDetails, {}, function (err, docdata) {
                                if (err || docdata.nModified == 0) {
                                    res.send({ status: "0", "errors": "Error in Favourite..!" });
                                }
                                else {
                                    res.send({ status: "1", "message": "Favourite updated successfully..!" });
                                }
                            });
                        }
                        else {
                            var data = { id: rest_id, timestamp: Date.now() }
                            var condition = { '_id': user_id, status: { $ne: 0 } };
                            var updateDetails = { "$push": { 'favourite': data } };
                            db.UpdateDocument('users', condition, updateDetails, {}, function (err, docdata) {
                                if (err || docdata.nModified == 0) {
                                    res.send({ status: "0", "errors": "Error in Favourite.!" });
                                } else {
                                    res.send({ status: "1", "message": "Favourite updated successfully..!" });
                                }
                            });
                        }
                    }
                });
            }
        });
    };

    controller.getFavourite = function (req, res) {

        var data = {};
        data.status = 0;
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('latitude', 'latitude is Required').notEmpty(); //to calculate delivery time
        req.checkBody('longitude', 'longitude is Required').notEmpty();
        req.checkBody('rcat', 'category is Required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }
        req.sanitizeBody('user_id').trim();

        var request = {};
        request.user_id = req.body.user_id;
        request.latitude = req.body.latitude;
        request.longitude = req.body.longitude;
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var jstz = require('jstimezonedetect');
        var client_timezone = jstz.determine().name();
        if (typeof req.body.client_timezone != 'undefined') {
            client_timezone = parseInt(req.body.client_timezone);
        }
        var final_distance = [];
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                var filter_query = { 'restaurantdoc.status': { $eq: 1 } };
                if (req.body.rcat && isObjectId(req.body.rcat)) {
                    filter_query['restaurantdoc.rcategory'] = { $eq: mongoose.Types.ObjectId(req.body.rcat) };
                }
                var pipeline = [
                    { $match: { status: { $ne: 0 }, '_id': new mongoose.Types.ObjectId(request.user_id) } },
                    { $unwind: "$favourite" },
                    { $unwind: { path: "$favourite", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "restaurant", localField: "favourite.id", foreignField: "_id", as: "restaurantdoc" } },
                    { $project: { 'restaurantdoc': 1 } },
                    { $unwind: { path: "$restaurantdoc", preserveNullAndEmptyArrays: true } },
                    { "$match": filter_query },
                    {
                        $group: {
                            _id: "null",
                            "restaurantList": {
                                $push: {
                                    rest_id: "$restaurantdoc._id",
                                    time_setting: "$restaurantdoc.time_setting",
                                    working_hours: "$restaurantdoc.working_hours",
                                    about: "$restaurantdoc.about",
                                    availability: "$restaurantdoc.availability",
                                    rest_name: "$restaurantdoc.restaurantname",
                                    efp_time: "$restaurantdoc.efp_time",
                                    ratings: "$restaurantdoc.avg_ratings",
                                    image: "$restaurantdoc.food_img",
                                    cusine: "$restaurantdoc.main_cuisine",
                                    user_distance: "$restaurantdoc.efp_time",
                                    latitude: "$restaurantdoc.location.lat",
                                    longitude: "$restaurantdoc.location.lng",
                                    address: "$restaurantdoc.address.fulladres",
                                    offer: "$restaurantdoc.offer",
                                    offer_type: "$restaurantdoc.offer_type",
                                    target_amount: "$restaurantdoc.target_amount",
                                    offer_amount: "$restaurantdoc.offer_amount",
                                    max_off: "$restaurantdoc.max_off",
                                    offer_status: "$restaurantdoc.offer_status",
                                }
                            }
                        }
                    }
                ];
                db.GetAggregation('users', pipeline, function (err, users) {
                    if (err || !users[0]) {
                        res.send({ status: "0", "errors": "No Favourite available..!" });
                    }
                    else {
                        for (var i = 0; i < users[0].restaurantList.length; i++) {
                            var lat1 = request.latitude;
                            var lat2 = users[0].restaurantList[i].latitude;
                            var lon1 = request.longitude;
                            var lon2 = users[0].restaurantList[i].longitude;
                            var earthRadius = 6371; // Radius of the earth in km
                            var dLat = deg2rad(lat2 - lat1);  // deg2rad below
                            var dLon = deg2rad(lon2 - lon1);
                            var a =
                                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2)
                                ;
                            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            var d = earthRadius * c;//km
                            var miles = d / 1.609344;//miles
                            users[0].restaurantList[i].user_distance = d;

                            var img = settings.settings.site_url + CONFIG.RESTAURANT_DEFAULT_IMAGE;
                            if (users[0].restaurantList[i].image) { img = settings.settings.site_url + users[0].restaurantList[i].image.slice(2); }
                            users[0].restaurantList[i].image = img;
                        }

                        var temp_radius = settings.settings.radius || 20;
                        var radius = parseInt(temp_radius);

                        //calculating avg distabce between near by drivers and restaurant to calculate estimated delivery time
                        each(users[0].restaurantList, function (item, next) {
                            var drivercondition = [
                                {
                                    "$geoNear": {
                                        near: {
                                            type: "Point",
                                            coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)]
                                        },
                                        distanceField: "distance",
                                        includeLocs: "location",
                                        distanceMultiplier: 0.001,
                                        spherical: true
                                    }
                                },
                                {
                                    "$redact": {
                                        "$cond": {
                                            "if": { "$lte": ["$distance", radius] },
                                            "then": "$$KEEP",
                                            "else": "$$PRUNE"
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        username: 1,
                                        document: "$$ROOT"
                                    }
                                },
                                {
                                    $group: {
                                        _id: "null",
                                        "driverList": {
                                            $push: {
                                                rest_name: "$document.username",
                                                distance: "$document.distance"
                                            }
                                        }
                                    }
                                }
                            ];
                            db.GetAggregation('drivers', drivercondition, function (err, driversdoc) {
                                if (err) {
                                    callback(err);
                                } else {
                                    //calculating sum and avg distance for each rest from diff drivers who near by each rest
                                    var distan = 0;
                                    if (driversdoc[0]) {
                                        for (var i = 0; i < driversdoc[0].driverList.length; i++) {
                                            distan = distan + driversdoc[0].driverList[i].distance;
                                        }
                                        var avg = distan / driversdoc[0].driverList.length;
                                    }
                                    var result = {
                                        driver_avg_dist: avg || 0, rest_id: item.rest_id
                                    }
                                    next(err, result);
                                }
                            });
                        }, function (err, loops) {
                            if (err) { res.send({ "status": "0", "errors": "no outlets available in your location" }); }
                            else {

                                var week_days_checkin = 1;
                                var d = new Date();
                                var n = d.getDay();
                                if (n == 6 || n == 0) { week_days_checkin = 0; } //its week end
                                var server_offset = (new Date).getTimezoneOffset();
                                var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);


                                //merging the avg driver distance with restaurant deatails   

                                //business hour per day
                                var currentBtime = new Date();
                                var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                                var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                // var day = new Date().getDay();
                                var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                //business hour per day end

                                for (var i = 0; i < users[0].restaurantList.length; i++) {
                                    if (users[0].restaurantList[i].time_setting) {
                                        users[0].restaurantList[i].time_setting.week_days.start_time = new Date(new Date(users[0].restaurantList[i].time_setting.week_days.start_time).getTime() + diff_offset);
                                        users[0].restaurantList[i].time_setting.week_days.end_time = new Date(new Date(users[0].restaurantList[i].time_setting.week_days.end_time).getTime() + diff_offset);
                                        users[0].restaurantList[i].time_setting.week_end.start_time = new Date(new Date(users[0].restaurantList[i].time_setting.week_end.start_time).getTime() + diff_offset);
                                        users[0].restaurantList[i].time_setting.week_end.end_time = new Date(new Date(users[0].restaurantList[i].time_setting.week_end.end_time).getTime() + diff_offset);

                                    }
                                }
                                for (var i = 0; i < loops.length; i++) {
                                    for (var j = 0; j < users[0].restaurantList.length; j++) {
                                        //--------------
                                        var visibility = 0;
                                        var week_time = 0;
                                        if (users[0].restaurantList[j].time_setting) {
                                            if (week_days_checkin == 1) { week_time = timezone.tz(users[0].restaurantList[j].time_setting.week_days.end_time, settings.settings.time_zone).format(settings.settings.time_format); }
                                            else { week_time = timezone.tz(users[0].restaurantList[j].time_setting.week_end.end_time, settings.settings.time_zone).format(settings.settings.time_format); }
                                            var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                            var currentTime = moment(time_now, "HH:mm a");
                                            currentTime.toString();

                                            var start_date = timezone.tz(users[0].restaurantList[j].time_setting.week_days.start_time, settings.settings.time_zone).format(settings.settings.time_format);
                                            var end_date = timezone.tz(users[0].restaurantList[j].time_setting.week_days.end_time, settings.settings.time_zone).format(settings.settings.time_format);

                                            if (week_days_checkin == 0) {
                                                start_date = timezone.tz(users[0].restaurantList[j].time_setting.week_end.start_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                end_date = timezone.tz(users[0].restaurantList[j].time_setting.week_end.end_time, settings.settings.time_zone).format(settings.settings.time_format);
                                            }

                                            var startTime = moment(start_date, "HH:mm a");
                                            startTime.toString();

                                            var endTime = moment(end_date, "HH:mm a");
                                            endTime.toString();



                                            if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && users[0].restaurantList[j].availability == 1) {
                                                visibility = 1;
                                            }
                                        }

                                        //business hour per day
                                        let day = (new Date).getDay();
                                        let tzname = geoTz(parseFloat(users[0].restaurantList[j].latitude), parseFloat(users[0].restaurantList[j].longitude))[0];
                                        let offset = tz.tz(tzname).utcOffset();
                                        day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                                        var currentDay = day_array[day];
                                        var working_hours_availability = 0;
                                        var open_till = new Date(new Date().getTime() + diff_b_offset);
                                        if (typeof users[0].restaurantList[j].working_hours != 'undefined' && users[0].restaurantList[j].working_hours.length > 0) {
                                            var index_pos = users[0].restaurantList[j].working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                            if (index_pos != -1) {
                                                var working_hours = users[0].restaurantList[j].working_hours[index_pos];
                                                if (working_hours.selected == 1) {
                                                    var match_index = working_hours.slots.findIndex(item => {
                                                        var start_time = new Date(item.start_time);
                                                        var end_time = new Date(item.end_time);
                                                        var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                        var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                        if (start_time_seconds > end_time_seconds) {
                                                            return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                                        } else {
                                                            return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                                        }
                                                    })
                                                    if (match_index != -1 || working_hours.wholeday == 1) {
                                                        if (working_hours.wholeday == 1) {
                                                            var d = new Date();
                                                            d.setHours(23);
                                                            d.setMinutes(59);
                                                            open_till = new Date(new Date(d).getTime() + diff_b_offset);
                                                        } else {
                                                            open_till = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                                        }
                                                        working_hours_availability = 1;
                                                    } else {
                                                        working_hours_availability = 0;
                                                    }
                                                } else {
                                                    working_hours_availability = 0;
                                                }
                                            } else {
                                                working_hours_availability = 0;
                                            }
                                        }
                                        //business hour per day end

                                        //--------------
                                        if (loops[i].rest_id == users[0].restaurantList[j].rest_id) {
                                            final_distance.push({
                                                'rest_id': users[0].restaurantList[j].rest_id,
                                                'visibility': visibility,
                                                'time_setting': week_time || 0,
                                                'efp_time': users[0].restaurantList[j].efp_time || 0,
                                                'rest_name': users[0].restaurantList[j].rest_name,
                                                'ratings': users[0].restaurantList[j].ratings,
                                                'about': users[0].restaurantList[j].about,
                                                'diff_offset': diff_offset,
                                                'address': users[0].restaurantList[j].address,
                                                'image': users[0].restaurantList[j].image,
                                                'cusine': users[0].restaurantList[j].cusine,
                                                'user_distance': users[0].restaurantList[j].user_distance,
                                                'driver_distance': loops[i].driver_avg_dist,
                                                'week_days_checkin': week_days_checkin,
                                                'working_time_setting': users[0].restaurantList[j].time_setting,
                                                'availability': users[0].restaurantList[j].availability,
                                                'offer_type': users[0].restaurantList[j].offer.offer_type,
                                                'target_amount': users[0].restaurantList[j].offer.target_amount,
                                                'offer_amount': users[0].restaurantList[j].offer.offer_amount,
                                                'max_off': users[0].restaurantList[j].offer.max_off,
                                                'offer_status': users[0].restaurantList[j].offer.offer_status,
                                                'working_hours_availability': working_hours_availability,
                                                'open_till': open_till
                                            })
                                        }
                                    }
                                }

                                //calculating time

                                var speed = 45; //km/hr //+ parseInt( settings.settings.eta_time) + parseInt(final_distance[0].efp_time)
                                var end_final_distance = [];
                                for (var i = 0; i < final_distance.length; i++) {
                                    end_final_distance.push({
                                        'rest_id': final_distance[i].rest_id,
                                        'rest_name': final_distance[i].rest_name,
                                        'ratings': final_distance[i].ratings,
                                        'address': final_distance[i].address,
                                        'about': final_distance[i].about,
                                        'visibility': final_distance[i].visibility,
                                        'time_setting': final_distance[i].time_setting,
                                        'image': final_distance[i].image,
                                        'cusine': final_distance[i].cusine,
                                        'week_days_checkin': final_distance[i].week_days_checkin,
                                        'working_time_setting': final_distance[i].working_time_setting,
                                        'availability': final_distance[i].availability,
                                        'time': parseInt(settings.settings.eta_time || 0) + parseInt(final_distance[i].efp_time)
                                            + '-' + (parseInt(settings.settings.eta_time || 0) + parseInt(final_distance[i].efp_time) + 10) + ' mins',
                                        'delivery_time': parseInt(settings.settings.eta_time || 0) + parseInt(final_distance[i].efp_time) + ' mins',
                                        'offer_type': final_distance[i].offer_type,
                                        'target_amount': final_distance[i].target_amount,
                                        'offer_amount': final_distance[i].offer_amount,
                                        'max_off': final_distance[i].max_off,
                                        'offer_status': final_distance[i].offer_status,
                                        'working_hours_availability': final_distance[i].working_hours_availability,
                                        'open_till': final_distance[i].open_till
                                    })
                                }

                                /* var restaurantList = {};
                                 restaurantList.status = '1';
                                 restaurantList.rest_list = end_final_distance;
                                 res.send(restaurantList)*/

                                var restaurantLists = {};
                                restaurantLists.server_offset = server_offset;
                                restaurantLists.diff_offset = diff_offset;
                                restaurantLists.client_offset = client_offset;
                                restaurantLists.status = '1';
                                end_final_distance.sort(function (a, b) { return b.working_hours_availability - a.working_hours_availability; });
                                restaurantLists.rest_list = end_final_distance;
                                res.send(restaurantLists)
                            }
                        });
                        //calculating avg distabce between near by drivers and restaurant ends
                    }
                });
            }
        });
    }


    controller.restaurantList = function (req, res) {
        var errors = [];
        req.checkBody('latitude', 'latitude is Required').notEmpty();
        req.checkBody('longitude', 'longitude is Required').notEmpty();
        req.checkBody('cuisine', 'longitude is Required').optional();
        req.checkBody('rcat', 'category is Required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        data.latitude = req.body.latitude;
        data.longitude = req.body.longitude;
        data.cuisine = req.body.cuisine;
        data.restSort = req.body.restSort;
        var sort = { 'document.efp_time': 1 };
        if (data.restSort == 'RATING' || data.restSort == 'DEL_TIME' || data.restSort == 'RELEVANCE') {
            if (data.restSort == 'RATING') {
                sort = { 'document.avg_ratings': -1 };
            }
            if (data.restSort == 'DEL_TIME') {
                sort = { 'document.eta': 1 };
            }
            if (data.restSort == 'RELEVANCE') {
                sort = { 'document.createdAt': 1 };
            }
        }
        var limit = 10;
        if (req.body.limit) {
            var tmp = parseInt(req.body.limit);
            if (tmp != NaN && tmp > 0) {
                limit = tmp;
            }
        }
        var skip = 0;
        if (typeof req.body.pageId != 'undefined') {
            if (req.body.pageId) {
                var tmp = parseInt(req.body.pageId);
                if (tmp != NaN && tmp > 0) {
                    skip = (tmp * limit) - limit;
                }
            }
        }
        var lon = data.longitude;
        var lat = data.latitude;
        var user_id;
        if (typeof req.body.user_id != 'undefined' && req.body.user_id != '') {
            user_id = req.body.user_id;
        }
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var jstz = require('jstimezonedetect');
        var client_timezone = jstz.determine().name();
        if (typeof req.body.client_timezone != 'undefined') {
            client_timezone = parseInt(req.body.client_timezone);
        }
        var isWeekend = new Date().getDay() % 6 == 0;
        var current_time = Date.now();
        var three_min_section = 3 * 60 * 1000;
        var before_three_min = current_time - three_min_section;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                db.GetOneDocument('rcategory', { '_id': mongoose.Types.ObjectId(req.body.rcat), 'status': 1 }, {}, {}, function (err, resCat) {
                    if (err || !resCat) {
                        res.send({ "status": "0", "errors": "Error in catagory" });
                    } else {
                        var temp_radius = settings.settings.radius || 20;
                        var radius = parseInt(temp_radius);
                        var filter_query = { "status": 1, food_count: { $gte: 1 } };
                        if (data.cuisine) {
                            filter_query.main_cuisine = { $elemMatch: { name: { $in: data.cuisine } } };
                        }
                        if (req.body.rcat && isObjectId(req.body.rcat)) {
                            filter_query.rcategory = { $eq: mongoose.Types.ObjectId(req.body.rcat) };
                        }
                        var eta_time = 0;
                        if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
                            eta_time = parseInt(settings.settings.eta_time)
                        }
                        db.GetOneDocument('users', { '_id': user_id, status: { $eq: 1 } }, { favourite: 1 }, {}, function (err, user) {
                            if (err) {
                                res.send({ "status": "0", "errors": "Configure your app settings" });
                            } else {
                                var favourite = [];
                                if (typeof user_id != 'undefined' && user && typeof user.favourite != 'undefined') {
                                    for (var i = 0; i < user.favourite.length; i++) {
                                        var data = { id: user.favourite[i].id, timestamp: user.favourite[i].id };
                                        favourite.push(data);
                                    }
                                }
                                var citycondition = [
                                    {
                                        "$geoNear": {
                                            near: {
                                                type: "Point",
                                                coordinates: [parseFloat(lon), parseFloat(lat)]
                                            },
                                            distanceField: "distance",
                                            includeLocs: "location",
                                            query: filter_query,
                                            distanceMultiplier: 0.001,
                                            spherical: true
                                        }
                                    },
                                    {
                                        "$redact": {
                                            "$cond": {
                                                "if": { "$lte": ["$distance", radius] },
                                                "then": "$$KEEP",
                                                "else": "$$PRUNE"
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            document: {
                                                username: "$username",
                                                food_count: "$food_count",
                                                _id: "$_id",
                                                availability: "$availability",
                                                restaurantname: "$restaurantname",
                                                time_setting: "$time_setting",
                                                slug: "$slug",
                                                about: "$about",
                                                working_hours: "$working_hours",
                                                avg_ratings: "$avg_ratings",
                                                eta_time_settings: { $literal: eta_time },
                                                favourite: { $literal: favourite },
                                                avatar: "$food_img",
                                                distance: "$distance",
                                                main_cuisine: "$main_cuisine",
                                                isFeature: "$feature",
                                                offer: "$offer",
                                                efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] },
                                                location: "$location",
                                                address: "$address.fulladres",
                                                latitude: "$location.lat",
                                                longitude: "$location.lng",
                                                offer_type: "$offer.offer_type",
                                                target_amount: "$offer.target_amount",
                                                offer_amount: "$offer.offer_amount",
                                                max_off: "$offer.max_off",
                                                offer_status: "$offer.offer_status",
                                                driver_location: {
                                                    $filter: {
                                                        input: "$driver_location",
                                                        as: "driver_location",
                                                        cond: { $and: [{ $gte: ["$$driver_location.timestamp", before_three_min] }] }
                                                    }
                                                },
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            document: {
                                                username: "$document.username",
                                                _id: "$document._id",
                                                favourite: { "$map": { "input": "$document.favourite", "as": "el", "in": "$$el.id" } },
                                                restaurantname: "$document.restaurantname",
                                                slug: "$document.slug",
                                                about: "$document.about",
                                                time_setting: "$document.time_setting",
                                                working_hours: "$document.working_hours",
                                                availability: "$document.availability",
                                                avg_ratings: "$document.avg_ratings",
                                                isFeature: "$document.isFeature",
                                                avatar: "$document.avatar",
                                                distance: "$document.distance",
                                                main_cuisine: "$document.main_cuisine",
                                                offer: "$document.offer",
                                                efp_time: "$document.efp_time",
                                                location: "$document.location",
                                                latitude: "$document.location.lat",
                                                address: "$document.address",
                                                longitude: "$document.location.lng",
                                                driver_location: "$document.driver_location",
                                                offer_type: "$document.offer_type",
                                                target_amount: "$document.target_amount",
                                                offer_amount: "$document.offer_amount",
                                                max_off: "$document.max_off",
                                                offer_status: "$document.offer_status",
                                                // eta: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$document.driver_location", ''] }, ''] }, { $gt: [{ $size: "$document.driver_location" }, 0] }] }, { $sum: [eta_time, "$document.efp_time", { $divide: [{ $sum: { "$map": { "input": "$document.driver_location", "as": "el", "in": "$$el.time" } } }, { $size: "$document.driver_location" }] }] }, { $sum: [eta_time, "$document.efp_time"] }] },
                                                eta: { $sum: [eta_time, "$document.efp_time"] }
                                            }
                                        }
                                    },
                                    {
                                        $sort: sort
                                    },
                                    {
                                        $project: {
                                            document: {
                                                username: "$document.username",
                                                _id: "$document._id",
                                                is_favourite: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ['$document.favourite', ''] }, ''] }, { $gte: [{ "$size": '$document.favourite' }, 1] }, { $or: [{ $gte: [{ "$size": { "$setIntersection": ['$document.favourite', ['$document._id']] } }, 1] }, { "$setEquals": ['$document.favourite', ['$document._id']] }] }] }, 1, 0] },
                                                restaurantname: "$document.restaurantname",
                                                availability: "$document.availability",
                                                slug: "$document.slug",
                                                about: "$document.about",
                                                time_setting: "$document.time_setting",
                                                working_hours: "$document.working_hours",
                                                avg_ratings: "$document.avg_ratings",
                                                isFeature: "$document.isFeature",
                                                avatar: "$document.avatar",
                                                distance: "$document.distance",
                                                main_cuisine: "$document.main_cuisine",
                                                offer: "$document.offer",
                                                efp_time: "$document.efp_time",
                                                location: "$document.location",
                                                address: "$document.address",
                                                latitude: "$document.location.lat",
                                                longitude: "$document.location.lng",
                                                offer_type: "$document.offer_type",
                                                target_amount: "$document.target_amount",
                                                offer_amount: "$document.offer_amount",
                                                max_off: "$document.max_off",
                                                offer_status: "$document.offer_status",
                                                eta: "$document.eta",
                                            }
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: "null",
                                            "restaurantList": {
                                                $push: "$document"
                                            }
                                        }
                                    }
                                ];
                                db.GetAggregation('restaurant', citycondition, function (err, docdata) {
                                    if (err || !docdata) {
                                        res.send({ "status": "0", "errors": "No outlets available in your location" });
                                    } else {
                                        var server_offset = (new Date).getTimezoneOffset();
                                        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                        let day = (new Date).getDay();
                                        let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
                                        let offset = tz.tz(tzname).utcOffset();
                                        day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                                        if (docdata.length > 0) {
                                            var restaurantList = [];
                                            if (typeof docdata[0].restaurantList != 'undefined' && docdata[0].restaurantList.length) {
                                                restaurantList = docdata[0].restaurantList;
                                                var img = settings.settings.site_url + CONFIG.RESTAURANT_DEFAULT_IMAGE;
                                                var week_days_checkin = 1;
                                                var d = new Date();
                                                var n = d.getDay();
                                                if (n == 6 || n == 0) { week_days_checkin = 0; } //its week end
                                                var final_distance = [];

                                                //business hour per day
                                                var currentBtime = new Date();
                                                var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                                                var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                // var day = new Date().getDay();
                                                var currentDay = day_array[day];
                                                var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                                //business hour per day end

                                                for (var j = 0; j < restaurantList.length; j++) {
                                                    if (restaurantList[j].avatar) { img = settings.settings.site_url + restaurantList[j].avatar.slice(2); }
                                                    //business hour per day
                                                    var working_hours_availability = 0;
                                                    var open_till = new Date(new Date().getTime() + diff_b_offset);
                                                    if (typeof restaurantList[j].working_hours != 'undefined' && restaurantList[j].working_hours.length > 0) {
                                                        var index_pos = restaurantList[j].working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                                        if (index_pos != -1) {
                                                            var working_hours = restaurantList[j].working_hours[index_pos];
                                                            if (working_hours.selected == 1) {
                                                                var match_index = working_hours.slots.findIndex(item => {
                                                                    var start_time = new Date(item.start_time);
                                                                    var end_time = new Date(item.end_time);
                                                                    var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                                    var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                                    if (start_time_seconds > end_time_seconds) {
                                                                        return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                                                    } else {
                                                                        return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                                                    }
                                                                })
                                                                if (match_index != -1 || working_hours.wholeday == 1) {
                                                                    if (working_hours.wholeday == 1) {
                                                                        var d = new Date();
                                                                        d.setHours(23);
                                                                        d.setMinutes(59);
                                                                        open_till = new Date(new Date(d).getTime() + diff_b_offset);
                                                                    } else {
                                                                        open_till = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                                                    }
                                                                    working_hours_availability = 1;
                                                                } else {
                                                                    working_hours_availability = 0;
                                                                }
                                                            } else {
                                                                working_hours_availability = 0;
                                                            }
                                                        } else {
                                                            working_hours_availability = 0;
                                                        }
                                                    }
                                                    //business hour per day end

                                                    final_distance.push({
                                                        'rest_id': restaurantList[j]._id,
                                                        'week_days_checkin': week_days_checkin,
                                                        'address': restaurantList[j].address || '',
                                                        'is_favourite': restaurantList[j].is_favourite,
                                                        'working_time_setting': restaurantList[j].time_setting,
                                                        'about': restaurantList[j].about,
                                                        'availability': restaurantList[j].availability,
                                                        'time_setting': 0,
                                                        'visibility': 0,
                                                        'working_hours_availability': working_hours_availability,
                                                        'open_till': open_till,
                                                        'rest_name': restaurantList[j].restaurantname,
                                                        'ratings': restaurantList[j].avg_ratings,
                                                        'isFeature': restaurantList[j].isFeature,
                                                        'image': img,
                                                        'diff_offset': diff_offset,
                                                        'client_offset': client_offset,
                                                        'server_offset': server_offset,
                                                        'cusine': restaurantList[j].main_cuisine || '',
                                                        'time': parseInt(restaurantList[j].eta) + '-' + parseInt(parseInt(restaurantList[j].eta) + 10) + ' mins' || '',
                                                        'delivery_time': parseInt(restaurantList[j].eta) + ' mins' || '',
                                                        'offer_type': restaurantList[j].offer_type,
                                                        'target_amount': restaurantList[j].target_amount,
                                                        'offer_amount': restaurantList[j].offer_amount,
                                                        'max_off': restaurantList[j].max_off,
                                                        'offer_status': restaurantList[j].offer_status,
                                                    })
                                                }
                                                var restaurantLists = {};
                                                restaurantLists.status = '1';
                                                restaurantLists.isCatCusine = '0';
                                                if (resCat.is_cuisine == '1') {
                                                    restaurantLists.isCatCusine = '1';
                                                }
                                                var arr1 = [];
                                                var arr2 = [];
                                                for (var i = 0; i < final_distance.length; i++) {
                                                    if (final_distance[i].working_hours_availability == 1) {
                                                        arr1.push(final_distance[i]);
                                                    }
                                                    if (final_distance[i].working_hours_availability == 0) {
                                                        arr2.push(final_distance[i]);
                                                    }
                                                }
                                                var finalResult = arr1.concat(arr2);
                                                restaurantLists.rest_list = finalResult;
                                                res.send(restaurantLists)
                                            }
                                        } else {
                                            res.send({ "status": "0", "errors": "No outlets available in your location" });
                                        }
                                    }
                                })
                            }
                        });
                    }
                })
            }
        })
    }

    controller.checkOrderdist = function (req, res) {

        var distance = require('google-distance-matrix');
        var origins = ['13.0827,80.2707'];
        var destinations = ['13.0827,80.2707', '11.0168,76.9558'];

        distance.key('AIzaSyBxAXYgz2w6pdPhmk1Cc0dCL0YaidNfpQE');
        distance.units('imperial');

        distance.matrix(origins, destinations, function (err, distances) {
            if (err) {
            }
            if (!distances) {
            }
            if (distances.status == 'OK') {
                for (var i = 0; i < origins.length; i++) {
                    for (var j = 0; j < destinations.length; j++) {
                        var origin = distances.origin_addresses[i];
                        var destination = distances.destination_addresses[j];
                        if (distances.rows[0].elements[j].status == 'OK') {
                            var distance = distances.rows[i].elements[j].distance.text;
                            var time = distances.rows[i].elements[j].duration.text;
                        } else {
                        }
                    }
                }
            }
        });
    }
    controller.appInfo = function (req, res) {
        var data = {};
        data.status = 0;
        var restaurantId;
        var type = '';
        var mapApi = '';
        if (typeof req.body.type != 'undefined' && req.body.type != '') {
            if (typeof req.body.restaurantId != 'undefined' && req.body.restaurantId != '') {
                if (isObjectId(req.body.restaurantId)) {
                    restaurantId = new mongoose.Types.ObjectId(req.body.restaurantId);
                } else {
                    res.send({ "status": "0", "errors": "Invalid restaurantId" });
                    return;
                }
            } else {
                res.send({ "status": "0", "errors": "Invalid restaurantId" });
                return;
            }
            if (req.body.type == 'restaurant') {
                type = req.body.type;
            } else {
                res.send({ "status": "0", "errors": "Invalid type" });
                return;
            }
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err) {
                res.send({ "status": "0", "errors": "Error in App info..!" });
            } else {
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialSettings) {
                    if (err || !socialSettings) {
                        res.send({ "status": "0", "errors": "Error in App info..!" });
                    } else {
                        if (typeof req.body.app_type != 'undefined' && req.body.app_type != '' && req.body.app_type == 'android') {
                            mapApi = socialSettings.settings.map_api.ad_user;
                        } else {
                            mapApi = socialSettings.settings.map_api.ios_user;
                        }
                        if (type == 'restaurant') {
                            db.GetOneDocument('restaurant', { '_id': restaurantId }, {}, {}, function (err, restaurant) {
                                if (err || !restaurant) {
                                    res.send({ "status": "0", "errors": "No restaurant record found.." });
                                } else {
                                    if (restaurant.avatar) {
                                        user_image = settings.settings.site_url + restaurant.avatar;
                                    } else {
                                        user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                    }
                                    var restaurantDetails = {
                                        res_name: restaurant.restaurantname,
                                        res_address: restaurant.address.fulladres,
                                        res_image: user_image,
                                        res_id: restaurant._id,
                                        owner_name: restaurant.username,
                                        email: restaurant.email,
                                        rest_status: restaurant.status,
                                        availability: restaurant.availability,
                                        currency_code: settings.settings.currency_code,
                                        currency_symbol: settings.settings.currency_symbol,
                                        country_code: restaurant.phone.code,
                                        phone_number: restaurant.phone.number
                                    }
                                    res.send({
                                        'status': 1,
                                        'restaurantDetails': restaurantDetails,
                                        'currency_code': settings.settings.currency_code,
                                        'currency_symbol': settings.settings.currency_symbol,
                                        'site_title': settings.settings.site_title,
                                        'site_url': settings.settings.site_url,
                                        'email_address': settings.settings.email_address,
                                        'time_zone': settings.settings.time_zone,
                                        'logo': settings.settings.site_url + settings.settings.logo,
                                        'favicon': settings.settings.site_url + settings.settings.favicon,
                                        'google_api': mapApi,
                                        'SECRET_KEY': CONFIG.SECRET_KEY,
                                        'GCM_KEY': CONFIG.GCM_KEY
                                    });
                                }
                            })
                        } else {
                            res.send({
                                'status': 1,
                                'currency_code': settings.settings.currency_code,
                                'currency_symbol': settings.settings.currency_symbol,
                                'site_title': settings.settings.site_title,
                                'site_url': settings.settings.site_url,
                                'email_address': settings.settings.email_address,
                                'time_zone': settings.settings.time_zone,
                                'logo': settings.settings.site_url + settings.settings.logo,
                                'favicon': settings.settings.site_url + settings.settings.favicon,
                                'google_api': mapApi,
                                'SECRET_KEY': CONFIG.SECRET_KEY,
                                'GCM_KEY': CONFIG.GCM_KEY
                            });
                        }
                    }
                })
            }
        });
    };

    controller.logout = function (req, res) {
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        //req.checkBody('phone_no', 'phone_no is Required').notEmpty();
        req.checkBody('type', 'type is Required').notEmpty();
        var data = {};
        data.status = '0';
        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data);
            return;
        }
        var data = {};
        var query = {};
        if (req.body.type == 'android') { query = { 'device_info.gcm': '', 'device_info.device_type': '' }; }
        else { query = { 'device_info.device_token': '', 'device_info.device_type': '' }; }
        db.GetDocument('users', { _id: req.body.user_id }, {}, {}, function (err, docdata) {
            if (err || !docdata || docdata.length == 0) {
                data.status = '0';
                data.errors = 'Invalid user id..!';
                res.send(data);
            } else {
                db.UpdateDocument('users', { _id: req.body.user_id }, query, {}, function (err, response) {
                    if (err || response.nModified == 0) {
                        data.status = '0';
                        data.errors = 'Error in logout..!';
                        res.send(data);
                    }
                    else {
                        data.status = '1';
                        data.message = 'logout done sucessfully';
                        res.send(data);
                    }
                });
            }
        });
    };

    controller.notificationMode = function (req, res) {
        var data = {};
        data.status = '0';
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('user_type', 'user_type is required').notEmpty();//users/drivers/restaurant
        req.checkBody('mode', 'mode is required').notEmpty();//apns/gcm/socket
        req.checkBody('type', 'type is required').notEmpty();//android/ios


        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }

        req.sanitizeBody('user').trim();
        req.sanitizeBody('user_type').trim();
        req.sanitizeBody('mode').trim();
        req.sanitizeBody('type').trim();

        var request = {};
        request.user_id = req.body.user_id;
        request.user_type = req.body.user_type;
        request.mode = req.body.mode;
        request.type = req.body.type;

        var collection = request.user_type;

        var update_query = {};
        if (request.type == 'android') {
            update_query = { 'device_info.ios_notification_mode': '', 'device_info.android_notification_mode': request.mode }
        }
        else if (request.type == 'ios') {
            update_query = { 'device_info.android_notification_mode': '', 'device_info.ios_notification_mode': request.mode }
        }

        db.GetOneDocument(collection, { '_id': request.user_id }, {}, {}, function (err, user) {
            if (err || !user) {
                res.send({ "status": "0", "errors": 'Invalid user..!' });
            } else {
                db.UpdateDocument(collection, { '_id': request.user_id }, update_query, {}, function (err, response) {
                    if (err || response.nModified == 0) {
                        res.send({ "status": "0", "errors": 'Error in notification mode update..!' });
                    } else {
                        res.send({ "status": "1", "message": "Notification mode updated.." });
                    }
                });
            }
        });
    };

    controller.searchRestaurant = function (req, res) {

        req.checkBody('latitude', 'latitude is required').notEmpty();
        req.checkBody('longitude', 'longitude is required').notEmpty();
        //req.checkBody('key_word', 'keyword is required').notEmpty();
        req.checkBody('user_id', 'userid is required').optional();
        req.checkBody('rcat', 'category is Required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var jstz = require('jstimezonedetect');
        var client_timezone = jstz.determine().name();
        if (typeof req.body.client_timezone != 'undefined') {
            client_timezone = parseInt(req.body.client_timezone);
        }
        var data = {};
        data.latitude = req.body.latitude;
        data.longitude = req.body.longitude;
        data.query = req.body.key_word;
        var user_id = req.body.user_id;
        var query = data.query;
        var lon = data.longitude;
        var lat = data.latitude;

        var isWeekend = new Date().getDay() % 6 == 0;
        var current_time = Date.now();
        var three_min_section = 3 * 60 * 1000;
        var before_three_min = current_time - three_min_section;

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                db.GetOneDocument('users', { '_id': user_id, status: { $eq: 1 } }, { favourite: 1 }, {}, function (err, user) {
                    if (err) {
                        res.send({ "status": "0", "errors": "Configure your app settings" });
                    } else {
                        var favourite = [];
                        if (typeof user_id != 'undefined' && user && typeof user.favourite != 'undefined') {
                            for (var i = 0; i < user.favourite.length; i++) {
                                var data = { id: user.favourite[i].id, timestamp: user.favourite[i].id };
                                favourite.push(data);
                            }
                        }

                        var eta_time = 0;
                        if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
                            eta_time = parseInt(settings.settings.eta_time)
                        }

                        var temp_radius = settings.settings.radius || 20;
                        var radius = parseInt(temp_radius);

                        var skip = 0;
                        var limit = 100;

                        var condition = { status: { $eq: 1 } };
                        if (query != '' && query != '0' && typeof query != 'undefined') {
                            condition['name'] = { $regex: query + '.*', $options: 'si' };
                        }
                        var aggregationdata = [
                            { $match: condition },
                            {
                                $project: {
                                    shop: "$shop"
                                }
                            }];
                        data = { $group: { _id: null, ShopIds: { $push: "$shop" } } };
                        aggregationdata.push(data);
                        db.GetAggregation('food', aggregationdata, function (err, foodDetails) {
                            //var condition = { status: { $eq: 1 }, availability: { $eq: 1 } };
                            var condition = { status: { $eq: 1 }, food_count: { $gte: 1 } };
                            if (req.body.cusine) {
                                condition.main_cuisine = { '$elemMatch': { 'name': req.body.cusine } };
                            }
                            if (req.body.rcat && isObjectId(req.body.rcat)) {
                                condition.rcategory = { $eq: mongoose.Types.ObjectId(req.body.rcat) };
                            }
                            //var condition = { status: { $eq: 1 }, food_count: { $gte: 1 } };
                            var ShopIds = [];
                            if (foodDetails && foodDetails.length > 0 && typeof foodDetails[0].ShopIds != 'undefined' && foodDetails[0].ShopIds.length > 0) {
                                ShopIds = foodDetails[0].ShopIds;
                            }
                            condition["$or"] = [];
                            if (ShopIds.length) {
                                var data = { "_id": { $in: ShopIds } };
                                condition["$or"].push(data)
                            }
                            if (query != '' && query != '0' && typeof query != 'undefined') {
                                var data = { "restaurantname": { $regex: query + '.*', $options: 'si' } };
                                condition["$or"].push(data)
                            }
                            if (query != '' && query != '0' && typeof query != 'undefined') {
                                var data = { "main_cuisine": { $regex: query + '.*', $options: 'si' } };
                                condition["$or"].push(data)
                            }

                            if (condition["$or"].length == 0) {
                                delete condition["$or"];
                            }


                            var sorting = { restaurantname: 1 };
                            var aggregationdata = [
                                {
                                    "$geoNear": {
                                        near: {
                                            type: "Point",
                                            coordinates: [parseFloat(lon), parseFloat(lat)]
                                        },
                                        distanceField: "distance",
                                        includeLocs: "location",
                                        query: condition,
                                        distanceMultiplier: 0.001,
                                        spherical: true
                                    }
                                },
                                {
                                    "$redact": {
                                        "$cond": {
                                            "if": { "$lte": ["$distance", radius] },
                                            "then": "$$KEEP",
                                            "else": "$$PRUNE"
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        document: {
                                            username: "$username",
                                            food_count: "$food_count",
                                            _id: "$_id",
                                            availability: "$availability",
                                            restaurantname: "$restaurantname",
                                            slug: "$slug",
                                            about: "$about",
                                            time_setting: "$time_setting",
                                            working_hours: "$working_hours",
                                            avg_ratings: "$avg_ratings",
                                            eta_time_settings: { $literal: eta_time },
                                            favourite: { $literal: favourite },
                                            avatar: "$food_img",
                                            distance: "$distance",
                                            main_cuisine: "$main_cuisine",
                                            offer: "$offer",
                                            efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] },
                                            location: "$location",
                                            address: "$address.fulladres",
                                            latitude: "$location.lat",
                                            longitude: "$location.lng",
                                            offer_type: "$offer.offer_type",
                                            target_amount: "$offer.target_amount",
                                            offer_amount: "$offer.offer_amount",
                                            max_off: "$offer.max_off",
                                            offer_status: "$offer.offer_status",
                                            driver_location: {
                                                $filter: {
                                                    input: "$driver_location",
                                                    as: "driver_location",
                                                    cond: { $and: [{ $gte: ["$$driver_location.timestamp", before_three_min] }] }
                                                }
                                            },
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        document: {
                                            username: "$document.username",
                                            _id: "$document._id",
                                            favourite: { "$map": { "input": "$document.favourite", "as": "el", "in": "$$el.id" } },
                                            restaurantname: "$document.restaurantname",
                                            slug: "$document.slug",
                                            about: "$document.about",
                                            time_setting: "$document.time_setting",
                                            working_hours: "$document.working_hours",
                                            availability: "$document.availability",
                                            avg_ratings: "$document.avg_ratings",
                                            avatar: "$document.avatar",
                                            distance: "$document.distance",
                                            main_cuisine: "$document.main_cuisine",
                                            offer: "$document.offer",
                                            efp_time: "$document.efp_time",
                                            location: "$document.location",
                                            latitude: "$document.location.lat",
                                            address: "$document.address",
                                            longitude: "$document.location.lng",
                                            driver_location: "$document.driver_location",
                                            driver_location: "$document.driver_location",
                                            offer_type: "$document.offer_type",
                                            target_amount: "$document.target_amount",
                                            offer_amount: "$document.offer_amount",
                                            max_off: "$document.max_off",
                                            offer_status: "$document.offer_status",
                                            //eta: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$document.driver_location", ''] }, ''] }, { $gt: [{ $size: "$document.driver_location" }, 0] }] }, { $sum: [eta_time, "$document.efp_time", { $divide: [{ $sum: { "$map": { "input": "$document.driver_location", "as": "el", "in": "$$el.time" } } }, { $size: "$document.driver_location" }] }] }, { $sum: [eta_time, "$document.efp_time"] }] },
                                            eta: {
                                                $sum: [eta_time, "$document.efp_time"]
                                            },
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        document: {
                                            username: "$document.username",
                                            _id: "$document._id",
                                            is_favourite: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ['$document.favourite', ''] }, ''] }, { $gte: [{ "$size": '$document.favourite' }, 1] }, { $or: [{ $gte: [{ "$size": { "$setIntersection": ['$document.favourite', ['$document._id']] } }, 1] }, { "$setEquals": ['$document.favourite', ['$document._id']] }] }] }, 1, 0] },
                                            restaurantname: "$document.restaurantname",
                                            availability: "$document.availability",
                                            slug: "$document.slug",
                                            about: "$document.about",
                                            time_setting: "$document.time_setting",
                                            working_hours: "$document.working_hours",
                                            avg_ratings: "$document.avg_ratings",
                                            avatar: "$document.avatar",
                                            distance: "$document.distance",
                                            main_cuisine: "$document.main_cuisine",
                                            offer: "$document.offer",
                                            efp_time: "$document.efp_time",
                                            location: "$document.location",
                                            address: "$document.address",
                                            latitude: "$document.location.lat",
                                            longitude: "$document.location.lng",
                                            eta: "$document.eta",
                                            offer_type: "$document.offer_type",
                                            target_amount: "$document.target_amount",
                                            offer_amount: "$document.offer_amount",
                                            max_off: "$document.max_off",
                                            offer_status: "$document.offer_status",
                                        }
                                    }
                                },
                            ];

                            data = { $group: { _id: null, count: { $sum: 1 }, document: { $push: "$document" } } };
                            aggregationdata.push(data);
                            aggregationdata.push({ $unwind: { path: "$document", preserveNullAndEmptyArrays: true } });
                            if (limit != '0' && limit != 'undefined' && limit != '' && !isNaN(limit)) {
                                var data = { '$skip': skip };
                                aggregationdata.push(data);
                                var data = { '$limit': limit };
                                aggregationdata.push(data);
                            }
                            data = { $group: { _id: null, count: { $first: "$count" }, document: { $push: "$document" } } };
                            aggregationdata.push(data);
                            db.GetAggregation('restaurant', aggregationdata, function (err, docdata) {
                                if (docdata[0]) {
                                    if (docdata[0].document.length > 0) {
                                        var restaurantList = [];
                                        var server_offset = (new Date).getTimezoneOffset();
                                        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                        let day = (new Date).getDay();
                                        let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
                                        let offset = tz.tz(tzname).utcOffset();
                                        day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                                        if (typeof docdata[0].document != 'undefined' && docdata[0].document.length) {
                                            var distance = require('google-distance-matrix');
                                            distance.key('AIzaSyBxAXYgz2w6pdPhmk1Cc0dCL0YaidNfpQE');
                                            distance.units('imperial');
                                            var origins = [lat.toString() + ',' + lon.toString()];
                                            var destinations = [];
                                            for (var i = 0; i < docdata[0].document.length; i++) {
                                                var latlong = docdata[0].document[i].location.lat.toString() + ',' + docdata[0].document[i].location.lng.toString();
                                                destinations.push(latlong)
                                                if (docdata[0].document[i].time_setting) {
                                                    docdata[0].document[i].time_setting.week_days.start_time = new Date(new Date(docdata[0].document[i].time_setting.week_days.start_time).getTime() + diff_offset);
                                                    docdata[0].document[i].time_setting.week_days.end_time = new Date(new Date(docdata[0].document[i].time_setting.week_days.end_time).getTime() + diff_offset);
                                                    docdata[0].document[i].time_setting.week_end.start_time = new Date(new Date(docdata[0].document[i].time_setting.week_end.start_time).getTime() + diff_offset);
                                                    docdata[0].document[i].time_setting.week_end.end_time = new Date(new Date(docdata[0].document[i].time_setting.week_end.end_time).getTime() + diff_offset);
                                                }
                                            }
                                            if (destinations.length > 0) {
                                                distance.matrix(origins, destinations, function (err, distances) {
                                                    if (distances.status == 'OK') {
                                                        for (var i = 0; i < origins.length; i++) {
                                                            for (var j = 0; j < destinations.length; j++) {
                                                                var origin = distances.origin_addresses[i];
                                                                var destination = distances.destination_addresses[j];
                                                                if (distances.rows[0].elements[j].status == 'OK') {
                                                                    var distance = distances.rows[i].elements[j].distance.text;
                                                                    var time_mins = parseInt(parseInt(distances.rows[i].elements[j].duration.value) / 60);
                                                                    if (time_mins == 0) {
                                                                        time_mins = 1;
                                                                    }
                                                                    docdata[0].document[j].eta = docdata[0].document[j].eta + time_mins;
                                                                    var restaurant_id = docdata[0].document[j]._id;
                                                                    var current_time = Date.now();
                                                                    var three_min_section = 3 * 60 * 1000;
                                                                    var before_three_min = current_time - three_min_section;
                                                                    var updateDetails = { "$pull": { 'driver_location': { timestamp: { $lte: before_three_min } } } };
                                                                    var condition = { "_id": restaurant_id };
                                                                    db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
                                                                    });
                                                                } else {
                                                                    //no use
                                                                }
                                                            }
                                                        }
                                                    }
                                                });
                                            }

                                            //business hour per day
                                            var currentBtime = new Date();
                                            var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                                            var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                            // var day = new Date().getDay();
                                            var currentDay = day_array[day];
                                            var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                            //business hour per day end

                                            restaurantList = docdata[0].document;
                                            var img = settings.settings.site_url + CONFIG.RESTAURANT_DEFAULT_IMAGE;
                                            var week_days_checkin = 1;
                                            var d = new Date();
                                            var n = d.getDay();
                                            if (n == 6 || n == 0) { week_days_checkin = 0; } //its week end

                                            var final_distance = [];
                                            for (var j = 0; j < restaurantList.length; j++) {
                                                if (restaurantList[j].avatar) { img = settings.settings.site_url + restaurantList[j].avatar.slice(2); }
                                                //-----------------------------------------
                                                if (restaurantList[j].time_setting) {
                                                    var week_time;
                                                    if (week_days_checkin == 1) {
                                                        week_time = moment.tz(restaurantList[j].time_setting.week_days.end_time, client_timezone).valueOf();
                                                    } else {
                                                        week_time = moment.tz(restaurantList[j].time_setting.week_end.end_time, client_timezone).valueOf();
                                                    }
                                                    week_time = moment(new Date(week_time)).format(settings.settings.time_format);
                                                    var currentTime = moment.tz(new Date(), client_timezone).valueOf();
                                                    var currentTimes = new Date(currentTime);
                                                    var current_seconds = (currentTimes.getHours() * 60 * 60) + (currentTimes.getMinutes() * 60) + currentTimes.getSeconds();
                                                    var start_time = moment.tz(restaurantList[j].time_setting.week_days.start_time, client_timezone).valueOf();
                                                    var end_time = moment.tz(restaurantList[j].time_setting.week_days.end_time, client_timezone).valueOf();
                                                    if (week_days_checkin == 0) {
                                                        start_time = moment.tz(restaurantList[j].time_setting.week_end.start_time, client_timezone).valueOf();
                                                        end_time = moment.tz(restaurantList[j].time_setting.week_end.end_time, client_timezone).valueOf();
                                                    }
                                                    var start_time = new Date(start_time);
                                                    var end_time = new Date(end_time);
                                                    var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                    var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                    var visibility = 0;
                                                    if (start_time_seconds < current_seconds && end_time_seconds > current_seconds && restaurantList[j].availability == 1) {
                                                        visibility = 1;
                                                    }
                                                }
                                                var offer = {};
                                                if (restaurantList[j].offer) {
                                                    if (restaurantList[j].offer.offer_status == 'true' || restaurantList[j].offer.offer_status == true || restaurantList[j].offer.offer_status == 1 || restaurantList[j].offer.offer_status == '1') {
                                                        offer = restaurantList[j].offer;
                                                    }
                                                }

                                                //business hour per day
                                                var working_hours_availability = 0;
                                                var open_till = new Date(new Date().getTime() + diff_b_offset);
                                                if (typeof restaurantList[j].working_hours != 'undefined' && restaurantList[j].working_hours.length > 0) {
                                                    var index_pos = restaurantList[j].working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                                    if (index_pos != -1) {
                                                        var working_hours = restaurantList[j].working_hours[index_pos];
                                                        if (working_hours.selected == 1) {
                                                            var match_index = working_hours.slots.findIndex(item => {
                                                                var start_time = new Date(item.start_time);
                                                                var end_time = new Date(item.end_time);
                                                                var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                                var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                                if (start_time_seconds > end_time_seconds) {
                                                                    return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                                                } else {
                                                                    return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                                                }
                                                            })
                                                            if (match_index != -1 || working_hours.wholeday == 1) {
                                                                if (working_hours.wholeday == 1) {
                                                                    var d = new Date();
                                                                    d.setHours(23);
                                                                    d.setMinutes(59);
                                                                    open_till = new Date(new Date(d).getTime() + diff_b_offset);
                                                                } else {
                                                                    open_till = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                                                }
                                                                working_hours_availability = 1;
                                                            } else {
                                                                working_hours_availability = 0;
                                                            }
                                                        } else {
                                                            working_hours_availability = 0;
                                                        }
                                                    } else {
                                                        working_hours_availability = 0;
                                                    }
                                                }
                                                //business hour per day end


                                                //-----------------------------------------
                                                final_distance.push({
                                                    'rest_id': restaurantList[j]._id,
                                                    // 'offer': offer,
                                                    'address': restaurantList[j].address || '',
                                                    'is_favourite': restaurantList[j].is_favourite,
                                                    'time_setting': week_time || 0,
                                                    'visibility': visibility || 0,
                                                    'rest_name': restaurantList[j].restaurantname,
                                                    'week_days_checkin': week_days_checkin,
                                                    'working_time_setting': restaurantList[j].time_setting,
                                                    'about': restaurantList[j].about || '',
                                                    'availability': restaurantList[j].availability,
                                                    'ratings': restaurantList[j].avg_ratings,
                                                    'image': img,
                                                    'cusine': restaurantList[j].main_cuisine || '',
                                                    'time': parseInt(restaurantList[j].eta) + '-' + parseInt(parseInt(restaurantList[j].eta) + 10) + ' mins' || '',
                                                    'delivery_time': parseInt(restaurantList[j].eta) + ' mins' || '',
                                                    'offer_type': restaurantList[j].offer.offer_type,
                                                    'target_amount': restaurantList[j].offer.target_amount,
                                                    'offer_amount': restaurantList[j].offer.offer_amount,
                                                    'max_off': restaurantList[j].offer.max_off,
                                                    'offer_status': restaurantList[j].offer.offer_status,
                                                    'working_hours_availability': working_hours_availability,
                                                    'open_till': open_till
                                                })
                                            }
                                            var restaurantLists = {};
                                            restaurantLists.status = '1';
                                            restaurantLists.rest_list = final_distance;
                                            res.send(restaurantLists)
                                        }
                                        else {
                                            res.send({ "status": "0", "errors": "no outlets available in your location" });
                                        }
                                    } else {
                                        res.send({ "status": "0", "errors": "no outlets available in your location" });
                                    }
                                } else {
                                    res.send({ "status": "0", "errors": "no outlets available in your location" });
                                }
                            });
                        })
                    }
                });
            }
        });
    }


    controller.profilePic = async (req, res) => {

        // req.checkBody('user_id', 'user_id is Required').notEmpty();
        // errors = req.validationErrors();
        // if (errors) {
        //     res.send({
        //         "status": "0",
        //         "errors": errors[0].msg
        //     });
        //     return;
        // }
        try {
            var data = {};

            var user_id = req.body.userId
            var updatadata = {};
            let settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})

            let siteUrl = settings.doc.settings.site_url
            if (req.files) {
                updatadata.img_name = encodeURI(req.files.avatar[0].filename);
                updatadata.img_path = 'uploads/images/users';
                updatadata.avatar = updatadata.img_path + '/' + updatadata.img_name;
                Jimp.read(req.files.avatar[0].path).then(function (lenna) {
                    lenna.resize(100, 100)            // resize
                        .quality(60)                 // set JPEG quality
                        .write('./uploads/images/users/thumb/' + req.files.avatar[0].filename); // save
                }).catch(function (err) {

                });



                // return
                if (!settings) {
                    data.message = "Configure your settings"
                    data.error = true
                    data.status = 0
                    res.send(data)

                } else {
                    if (settings && settings.status == false) {
                        data.message = "Configure your settings"
                        data.error = true
                        data.status = 0
                        res.send(data)
                    } else {
                        let profileImage = await db.UpdateDocument('users', { _id: user_id }, updatadata, {})

                        if (!profileImage) {
                            data.message = "Something Went Wrong"
                            data.error = true
                            data.status = 0
                            res.send(data)
                        } else {
                            if (profileImage && profileImage.status == true && profileImage.doc && profileImage.doc.modifiedCount > 0) {
                                data.message = "Profile Updated Successfully"
                                data.error = false
                                data.status = 1
                                data.image = siteUrl + updatadata.avatar
                                res.send(data)
                            } else {
                                data.message = "Something Went Wrong"
                                data.error = true
                                data.status = 0
                                res.send(data)
                            }
                        }
                    }
                }
            } else {
                res.send({ "status": "0", "error": true, "Message": "No files" });
            }
            // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            //     if (err) {
            //         res.send({ "status": 0, "errors": 'Error in settings' });
            //     }
            //     else {
            //         db.UpdateDocument('users', { _id: user_id }, updatadata, {}, function (err, docdata) {
            //             var data = {};
            //             if (err) {
            //                 res.send({ "status": "0", "errors": "Error in profile pic updation" });
            //             } else {
            //                 data.status = '1';
            //                 data.message = 'Profile picture updated'
            //                 data.avatar = settings.settings.site_url + updatadata.avatar;
            //                 res.send(data);

            //             }
            //         });
            //     }
            // });
        }

        catch (e) {
            console.log(e)
        }
    }



    controller.cancellationreson = function (req, res) {
        var query = {};
        query = { 'type': 'user', 'status': 1 }
        db.GetDocument('cancellation', query, { reason: 1 }, {},
            function (err, datas) {
                if (err || !datas) {
                    res.send({ "status": "0", "errors": "No reason found" });
                } else {
                    var data = {};
                    data.status = '1';
                    data.response = datas;

                    res.send(data);
                }
            });
    }

    controller.get_Unrating = function (req, res) {

        var status = '0';
        var response = '';
        var errors = [];

        req.checkBody('user_id', 'user_id is Required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        req.sanitizeBody('user_id').trim();
        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                var condition = [
                    { $match: { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), rating_done: { $ne: 1 }, 'status': { '$in': [7] } } },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driver" } },
                    { $unwind: "$restaurant" },
                    { $unwind: "$driver" },
                    { $project: { _id: 1, order_id: 1, restaurant: 1, driver: 1 } },
                    { $sort: { "createdAt": 1 } },
                ];

                db.GetAggregation('orders', condition, function (err, docdata) {
                    if (err) {
                        res.send({
                            "status": "0",
                            "errors": "Invalid order, Please check your data"
                        });
                    } else {
                        var response = {};
                        response.status = '1';
                        var pending_ratings = [];
                        for (i in docdata) {
                            pending_ratings.push(
                                {
                                    'order_id': docdata[i].order_id,
                                    'rest_name': docdata[i].restaurant.restaurantname || '',
                                    'driver_name': docdata[i].driver.username || ''
                                }
                            )
                        }
                        response.pending_ratings = pending_ratings;
                        res.send(response)
                    }
                });
            }
        });
    }

    controller.submit_Rating = function (req, res) {

        var status = '0';
        var response = '';
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('order_id', 'order_id is Required').notEmpty();
        req.checkBody('ratings_driver', 'ratings_driver is Required').notEmpty();
        req.checkBody('ratings_restaurant', 'ratings_restaurant is Required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('order_id').trim();
        req.sanitizeBody('ratings_driver').trim();
        req.sanitizeBody('ratings_restaurant').trim();

        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                db.GetOneDocument('orders', { 'order_id': req.body.order_id, 'status': 7 }, {}, {}, function (err, orders) {
                    if (err || !orders) {
                        res.send({
                            "status": "0",
                            "errors": "Invalid order, Please check your data"
                        });
                    } else {
                        if (req.body.ratings_restaurant) {
                            var rest_data = {};
                            rest_data.user = req.body.user_id.trim();
                            rest_data.restaurant = orders.restaurant_id;
                            rest_data.order = orders._id;
                            rest_data.rating = req.body.ratings_restaurant || 0;
                            rest_data.rating_to = 'restaurant';
                            rest_data.status = 1;
                            db.InsertDocument('ratings', rest_data, function (err, restresponse) {
                                if (err || !restresponse) {
                                    res.send({
                                        "status": "0",
                                        "errors": "Something went Wrong"
                                    });
                                } else {
                                    db.GetDocument('ratings', { 'restaurant': orders.restaurant_id, 'status': 1 }, {}, {}, function (err, restdata) {
                                        var rest_total = 0;
                                        var rest_avg = 1;
                                        for (var i = 0; i < restdata.length; i++) {
                                            rest_total += restdata[i].rating;
                                        }
                                        if (rest_total > 0) {
                                            rest_avg = (rest_total / restdata.length).toFixed(2);
                                        }
                                        db.UpdateDocument('restaurant', { '_id': orders.restaurant_id }, { $set: { 'avg_ratings': rest_avg } }, { multi: true }, function (err, restRespo) { });
                                    });
                                }
                            });
                        }
                        if (req.body.ratings_driver) {
                            var driversdata = {};
                            driversdata.user = req.body.user_id.trim();
                            driversdata.driver = orders.driver_id;
                            driversdata.order = orders._id;
                            driversdata.rating = req.body.ratings_driver || 0;
                            driversdata.rating_to = 'driver';
                            driversdata.status = 1;
                            db.InsertDocument('ratings', driversdata, function (err, driverresponse) {
                                if (err || !driverresponse) {
                                    res.send({
                                        "status": "0",
                                        "errors": "Something went Wrong"
                                    });
                                } else {
                                    db.GetDocument('ratings', { 'driver': orders.driver_id, 'status': 1 }, {}, {}, function (err, driverdata) {
                                        var driver_total = 0;
                                        var deriver_avg = 1;
                                        for (var j = 0; j < driverdata.length; j++) {
                                            driver_total += driverdata[j].rating;
                                        }
                                        if (driver_total > 0) {
                                            deriver_avg = (driver_total / driverdata.length).toFixed(2);
                                        }
                                        db.UpdateDocument('drivers', { '_id': orders.driver_id }, { $set: { 'avg_ratings': deriver_avg } }, { multi: true }, function (drivererr, driverRespo) { });
                                    });
                                }
                            });

                        }
                        if (err || !orders || userErr || !userRespo) {
                            res.send({
                                "status": "0",
                                "errors": "Error in submit_Rating"
                            });
                        } else {
                            db.UpdateDocument('orders', { 'order_id': req.body.order_id, 'status': 7 }, { 'rating_done': 1 }, {}, function (err, orderRespo) {
                                if (err || !orderRespo) {
                                    res.send({
                                        "status": "0",
                                        "errors": "Something went Wrong"
                                    });
                                } else {
                                    res.send({
                                        "status": "1",
                                        "response": library.getlanguage(req, 'AUA.back-end.YOUR_RAT_SUBMIT_SUCCESS', 'Your ratings submitted successfully')
                                    });
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    controller.getFeaturedRestaurantList = function (req, res) {
        var errors = [];
        req.checkBody('latitude', 'latitude is Required').notEmpty();
        req.checkBody('longitude', 'longitude is Required').notEmpty();
        req.checkBody('rcat', 'category is Required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        data.latitude = req.body.latitude;
        data.longitude = req.body.longitude;
        var lon = data.longitude;
        var lat = data.latitude;
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var isWeekend = new Date().getDay() % 6 == 0;
        var current_time = Date.now();
        var three_min_section = 3 * 60 * 1000;
        var before_three_min = current_time - three_min_section;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                var site_url = settings.settings.site_url;
                var temp_radius = settings.settings.radius || 20;
                var radius = parseInt(temp_radius);

                var filter_query = { 'feature': { $eq: 1 }, 'availability': { $eq: 1 }, 'status': { $eq: 1 } };
                if (data.cuisine) {
                    filter_query.main_cuisine = { $elemMatch: { name: { $in: data.cuisine } } };
                }
                var eta_time = 0;
                if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
                    eta_time = parseInt(settings.settings.eta_time)
                }
                if (req.body.rcat && isObjectId(req.body.rcat)) {
                    filter_query.rcategory = { $eq: mongoose.Types.ObjectId(req.body.rcat) };
                }
                var citycondition = [
                    {
                        "$geoNear": {
                            near: {
                                type: "Point",
                                coordinates: [parseFloat(lon), parseFloat(lat)]
                            },
                            distanceField: "distance",
                            includeLocs: "location",
                            query: filter_query,
                            distanceMultiplier: 0.001,
                            spherical: true
                        }
                    },
                    {
                        "$redact": {
                            "$cond": {
                                "if": { "$lte": ["$distance", radius] },
                                "then": "$$KEEP",
                                "else": "$$PRUNE"
                            }
                        }
                    },
                    {
                        $project: {
                            document: {
                                '_id': "$_id",
                                restaurantname: "$restaurantname",
                                main_city: "$main_city",
                                sub_city: "$sub_city",
                                availability: "$availability",
                                logo: "$logo",
                                rest_image: "$food_img",
                                feature: "$feature",
                                feature_img: "$feature_img",
                                avatar: "$food_img",
                                offer: "$offer",
                                location: "$location",
                                time_setting: "$time_setting",
                                working_hours: "$working_hours",
                                address: "$address",
                                avg_ratings: "$avg_ratings",
                                main_cuisine: "$main_cuisine",
                                eta_time_settings: { $literal: eta_time },
                                offer_type: "$offer.offer_type",
                                target_amount: "$offer.target_amount",
                                offer_amount: "$offer.offer_amount",
                                max_off: "$offer.max_off",
                                offer_status: "$offer.offer_status",
                                efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] },
                            }
                        }
                    },
                    {
                        $project: {
                            document: {
                                '_id': "$_id",
                                restaurantname: "$document.restaurantname",
                                main_city: "$document.main_city",
                                sub_city: "$document.sub_city",
                                availability: "$document.availability",
                                logo: "$document.logo",
                                rest_image: "$document.rest_image",
                                feature: "$document.feature",
                                feature_img: "$document.feature_img",
                                avatar: "$document.avatar",
                                offer: "$document.offer",
                                location: "$document.location",
                                time_setting: "$document.time_setting",
                                working_hours: "$document.working_hours",
                                address: "$document.address",
                                avg_ratings: "$document.avg_ratings",
                                main_cuisine: "$document.main_cuisine",
                                efp_time: "$document.efp_time",
                                offer_type: "$document.offer_type",
                                target_amount: "$document.target_amount",
                                offer_amount: "$document.offer_amount",
                                max_off: "$document.max_off",
                                offer_status: "$document.offer_status",
                                //eta: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$document.driver_location", ''] }, ''] }, { $gt: [{ $size: "$document.driver_location" }, 0] }] }, { $sum: [eta_time, "$document.efp_time", { $divide: [{ $sum: { "$map": { "input": "$document.driver_location", "as": "el", "in": "$$el.time" } } }, { $size: "$document.driver_location" }] }] }, { $sum: [eta_time, "$document.efp_time", 40] }] },
                                eta: {
                                    $sum: [eta_time, "$document.efp_time"]
                                },
                            }
                        }
                    },
                    {
                        $project: {
                            document: {
                                '_id': "$document._id",
                                restaurantname: "$document.restaurantname",
                                main_city: "$document.main_city",
                                sub_city: "$document.sub_city",
                                availability: "$document.availability",
                                logo: "$document.logo",
                                rest_image: "$document.rest_image",
                                feature: "$document.feature",
                                feature_img: "$document.feature_img",
                                avatar: "$document.avatar",
                                offer: "$document.offer",
                                location: "$document.location",
                                time_setting: "$document.time_setting",
                                working_hours: "$document.working_hours",
                                address: "$document.address",
                                avg_ratings: "$document.avg_ratings",
                                main_cuisine: "$document.main_cuisine",
                                efp_time: "$document.efp_time",
                                eta: "$document.eta",
                                offer_type: "$document.offer_type",
                                target_amount: "$document.target_amount",
                                offer_amount: "$document.offer_amount",
                                max_off: "$document.max_off",
                                offer_status: "$document.offer_status",
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "null",
                            "restaurantList": {
                                $push: "$document"
                            }
                        }
                    }
                ];
                db.GetAggregation('restaurant', citycondition, function (err, docdata) {
                    if (err || !docdata) {
                        res.send({ "status": "0", "errors": "No outlets available in your location" });
                    } else {
                        var server_offset = (new Date).getTimezoneOffset();
                        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                        let day = (new Date).getDay();
                        let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
                        let offset = tz.tz(tzname).utcOffset();
                        day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                        if (docdata.length > 0) {
                            var restaurantList = [];
                            if (typeof docdata[0].restaurantList != 'undefined' && docdata[0].restaurantList.length) {
                                var distance = require('google-distance-matrix');
                                distance.key('AIzaSyBxAXYgz2w6pdPhmk1Cc0dCL0YaidNfpQE');
                                distance.units('imperial');
                                var origins = [lat.toString() + ',' + lon.toString()];
                                var destinations = [];
                                for (var i = 0; i < docdata[0].restaurantList.length; i++) {
                                    var latlong = docdata[0].restaurantList[i].location.lat.toString() + ',' + docdata[0].restaurantList[i].location.lng.toString();
                                    destinations.push(latlong)
                                    if (typeof docdata[0].restaurantList[i].time_setting != 'undefined') {
                                        if (typeof docdata[0].restaurantList[i].time_setting.week_days != 'undefined') {
                                            docdata[0].restaurantList[i].time_setting.week_days.start_time = new Date(new Date(docdata[0].restaurantList[i].time_setting.week_days.start_time).getTime() + diff_offset);
                                            docdata[0].restaurantList[i].time_setting.week_days.end_time = new Date(new Date(docdata[0].restaurantList[i].time_setting.week_days.end_time).getTime() + diff_offset);
                                        }
                                        if (typeof docdata[0].restaurantList[i].time_setting.week_end != 'undefined') {
                                            docdata[0].restaurantList[i].time_setting.week_end.start_time = new Date(new Date(docdata[0].restaurantList[i].time_setting.week_end.start_time).getTime() + diff_offset);
                                            docdata[0].restaurantList[i].time_setting.week_end.end_time = new Date(new Date(docdata[0].restaurantList[i].time_setting.week_end.end_time).getTime() + diff_offset);
                                        }
                                    }
                                }
                                if (destinations.length > 0) {
                                    distance.matrix(origins, destinations, function (err, distances) {
                                        if (distances.status == 'OK') {
                                            for (var i = 0; i < origins.length; i++) {
                                                for (var j = 0; j < destinations.length; j++) {
                                                    var origin = distances.origin_addresses[i];
                                                    var destination = distances.destination_addresses[j];
                                                    if (distances.rows[0].elements[j].status == 'OK') {
                                                        var distance = distances.rows[i].elements[j].distance.text;
                                                        var time_mins = parseInt(parseInt(distances.rows[i].elements[j].duration.value) / 60);
                                                        if (time_mins == 0) {
                                                            time_mins = 1;
                                                        }
                                                        docdata[0].restaurantList[j].eta = docdata[0].restaurantList[j].eta + time_mins;
                                                        var restaurant_id = docdata[0].restaurantList[j]._id;
                                                        var current_time = Date.now();
                                                        var three_min_section = 3 * 60 * 1000;
                                                        var before_three_min = current_time - three_min_section;
                                                        var updateDetails = { "$pull": { 'driver_location': { timestamp: { $lte: before_three_min } } } };
                                                        var condition = { "_id": restaurant_id };
                                                        db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
                                                        });
                                                    } else {
                                                        //no use
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }

                                //business hour per day
                                var currentBtime = new Date();
                                var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                                var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                // var day = new Date().getDay();
                                var currentDay = day_array[day];
                                var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                //business hour per day end

                                restaurantList = docdata[0].restaurantList;
                                var img = settings.settings.site_url + CONFIG.RESTAURANT_DEFAULT_IMAGE;
                                var week_days_checkin = 1;
                                var d = new Date();
                                var n = d.getDay();
                                if (n == 6 || n == 0) { week_days_checkin = 0; } //its week end
                                var final_distance = [];
                                for (var j = 0; j < restaurantList.length; j++) {
                                    if (restaurantList[j].avatar) { img = settings.settings.site_url + restaurantList[j].avatar.slice(2); }
                                    if (restaurantList[j].rest_image) { rest_image = settings.settings.site_url + restaurantList[j].rest_image.slice(2); }

                                    //business hour per day
                                    var working_hours_availability = 0;
                                    var open_till = new Date(new Date().getTime() + diff_b_offset);
                                    if (typeof restaurantList[j].working_hours != 'undefined' && restaurantList[j].working_hours.length > 0) {
                                        var index_pos = restaurantList[j].working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                        if (index_pos != -1) {
                                            var working_hours = restaurantList[j].working_hours[index_pos];
                                            if (working_hours.selected == 1) {
                                                var match_index = working_hours.slots.findIndex(item => {
                                                    var start_time = new Date(item.start_time);
                                                    var end_time = new Date(item.end_time);
                                                    var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                    var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                    if (start_time_seconds > end_time_seconds) {
                                                        return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                                    } else {
                                                        return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                                    }
                                                })
                                                if (match_index != -1 || working_hours.wholeday == 1) {
                                                    if (working_hours.wholeday == 1) {
                                                        var d = new Date();
                                                        d.setHours(23);
                                                        d.setMinutes(59);
                                                        open_till = new Date(new Date(d).getTime() + diff_b_offset);
                                                    } else {
                                                        open_till = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                                    }
                                                    working_hours_availability = 1;
                                                } else {
                                                    working_hours_availability = 0;
                                                }
                                            } else {
                                                working_hours_availability = 0;
                                            }
                                        } else {
                                            working_hours_availability = 0;
                                        }
                                    }
                                    //business hour per day end


                                    final_distance.push({
                                        'rest_id': restaurantList[j]._id,
                                        'restaurantname': restaurantList[j].restaurantname,
                                        'main_city': restaurantList[j].main_city,
                                        'sub_city': restaurantList[j].sub_city,
                                        'availability': restaurantList[j].availability,
                                        'logo': restaurantList[j].logo,
                                        'feature': restaurantList[j].feature,
                                        'feature_img': restaurantList[j].feature_img,
                                        'offer_type': restaurantList[j].offer.offer_type,
                                        'offer_status': restaurantList[j].offer.offer_status,
                                        'offer_amount': restaurantList[j].offer.offer_amount,
                                        'target_amount': restaurantList[j].offer.target_amount,
                                        'max_off': restaurantList[j].offer.max_off,
                                        'time_setting': restaurantList[j].time_setting,
                                        'address': restaurantList[j].address.fulladres,
                                        'avg_ratings': restaurantList[j].avg_ratings,
                                        'cusine': restaurantList[j].main_cuisine,
                                        'time': parseInt(restaurantList[j].eta) + '-' + parseInt(parseInt(restaurantList[j].eta) + 10) + ' mins' || '',
                                        'delivery_time': parseInt(restaurantList[j].eta) + ' mins' || '',
                                        'week_days_checkin': week_days_checkin,
                                        'working_hours_availability': working_hours_availability,
                                        'open_till': open_till,
                                        'rest_image': rest_image,
                                        'image': img
                                    })
                                }
                                //res.send(final_distance)
                                var restaurantLists = {};
                                restaurantLists.status = '1';
                                final_distance.sort(function (a, b) { return b.working_hours_availability - a.working_hours_availability; });
                                restaurantLists.rest_list = final_distance;
                                res.send(restaurantLists)
                            }
                        } else {
                            res.send({ "status": "0", "errors": "No outlets available in your location" });
                        }
                    }
                })
            }
        })
    }

    /* controller.getMenu = function (req, res) {
        var request = {};
        request.rest_id = req.body.rest_id;
        var matc_query = {
            status: { $eq: 1 }, '_id': new mongoose.Types.ObjectId(request.rest_id)
        }
        var foodcond = { $and: [{ $eq: ["$$food.status", 1] }] };
        if (req.body.veg && parseInt(req.body.veg) == 1) {
            foodcond = { $and: [{ $eq: ["$$food.status", 1] }, { $eq: ["$$food.itmcat", 1] }] };
        }
        var Restaurantcondition = [
            { $match: matc_query },
            {
                $project: {
                    restaurantList: {
                        username: "$username", _id: "$_id", restaurantname: "$restaurantname", slug: "$slug", time_setting: "$time_setting", avg_ratings: "$avg_ratings", food_img: "$food_img", offer: "$offer", about: "$about", logo: "$logo", avatar: "$avatar", distance: "$distance", main_cuisine: "$main_cuisine", efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] }, location: "$location", latitude: "$location.lat", longitude: "$location.lng", avail: "$avail", avg_delivery: "$avg_delivery", deliverd: "$deliverd", cancelled: "$cancelled", categories: "$categories", availability: "$availability", phone: "$phone", address: "$address", time_setting: "$time_setting", package_charge: "$package_charge", fssaino: "$fssaino", rcategory: "$rcategory",
                    }
                }
            },
            { $lookup: { from: 'categories', localField: "restaurantList._id", foreignField: "restaurant", as: "restaurantList.restaurantCategories" } },
            { $lookup: { from: 'food', localField: "restaurantList._id", foreignField: "shop", as: "restaurantList.foodDetails" } },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        restaurantCategories: {
                            $filter: {
                                input: "$restaurantList.restaurantCategories",
                                as: "categories",
                                cond: { $and: [{ $eq: ["$$categories.status", 1] }] }
                            }
                        },
                        mainCategories: {
                            $filter: {
                                input: "$restaurantList.restaurantCategories",
                                as: "categories",
                                cond: { $and: [{ $eq: ["$$categories.status", 1] }, { $eq: ["$$categories.mainparent", 'yes'] }] }
                            }
                        },
                        foodDetails: {
                            $filter: {
                                input: "$restaurantList.foodDetails",
                                as: "food",
                                cond: foodcond
                            }
                        },
                    },
     
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        foodDetails: {
                            "$map": {
                                "input": "$restaurantList.foodDetails",
                                "as": "food",
                                "in": {
                                    name: "$$food.name",
                                    description: "$$food.description",
                                    more: { "$cond": [{ $or: [{ $ne: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$food.base_pack", ''] }, ''] }, { $gte: [{ "$size": "$$food.base_pack" }, 1] }] }, { "$size": "$$food.base_pack" }, 0] }, 0] }, { $ne: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$food.addons", ''] }, ''] }, { $gte: [{ "$size": "$$food.addons" }, 1] }] }, { "$size": "$$food.addons" }, 0] }, 0] }] }, 1, 0] },
                                    slug: "$$food.slug",
                                    _id: "$$food._id",
                                    price: "$$food.price",
                                    visibility: "$$food.visibility",
                                    food_availability: "$$food.visibility",
                                    avatar: { $cond: [{ $ne: [{ $ifNull: ["$$food.avatar", ""] }, ""] }, "$$food.avatar", ""] },
                                    categories: "$$food.categories",
                                    food_time: "$$food.food_time",
                                    offer: { $cond: { if: { $eq: ["$$food.offer.status", 1] }, then: { $literal: "yes" }, else: { $literal: "no" } } },
                                    offer_percent: "$$food.offer.amount",
                                    itmcat: "$$food.itmcat"
                                }
                            }
                        },
                        mainCategories: {
                            "$map": {
                                "input": "$restaurantList.mainCategories",
                                "as": "el",
                                "in": {
                                    restaurant: "$$el.restaurant",
                                    name: "$$el.name",
                                    _id: "$$el._id",
                                    subCategories: {
                                        $filter: {
                                            input: "$restaurantList.restaurantCategories",
                                            as: "categories",
                                            cond: { $and: [{ $eq: ["$$categories.parent", "$$el._id"] }] }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        mainCategories: {
                            "$map": {
                                "input": "$restaurantList.mainCategories",
                                "as": "el",
                                "in": {
                                    restaurant: "$$el.restaurant",
                                    name: "$$el.name",
                                    _id: "$$el._id",
                                    subCategories: {
                                        "$map": {
                                            "input": "$$el.subCategories",
                                            "as": "sub",
                                            "in": {
                                                name: "$$sub.name",
                                                _id: "$$sub._id",
                                                foodDetails: {
                                                    $filter: {
                                                        input: "$restaurantList.foodDetails",
                                                        as: "food",
                                                        cond: {
                                                            $and: [
                                                                { $gte: [{ "$size": "$$food.categories" }, 1] },
                                                                { $or: [{ $gte: [{ "$size": { "$setIntersection": ["$$food.categories", [{ 'category': "$$sub._id" }]] } }, 1] }, { "$setEquals": ["$$food.categories", [{ 'category': "$$sub._id" }]] }] }
                                                            ]
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    subCategoriesLength: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.subCategories", ''] }, ''] }, { $gte: [{ "$size": "$$el.subCategories" }, 1] }] }, { "$size": "$$el.subCategories" }, 0] },
                                    foodDetails: {
                                        "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.subCategories", ''] }, ''] }, { $gte: [{ "$size": "$$el.subCategories" }, 0] }] }, {
                                            $filter: {
                                                input: "$restaurantList.foodDetails",
                                                as: "food",
                                                cond: {
                                                    $and: [
                                                        { $gte: [{ "$size": "$$food.categories" }, 1] },
                                                        { $or: [{ $gte: [{ "$size": { "$setIntersection": ["$$food.categories", [{ 'category': "$$el._id" }]] } }, 1] }, { "$setEquals": ["$$food.categories", [{ 'category': "$$el._id" }]] }] }
                                                    ]
                                                }
                                            }
                                        }, []]
                                    },
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        mainCategories: {
                            "$map": {
                                "input": "$restaurantList.mainCategories",
                                "as": "el",
                                "in": {
                                    restaurant: "$$el.restaurant",
                                    name: "$$el.name",
                                    _id: "$$el._id",
                                    subCategories: {
                                        $filter: {
                                            input: "$$el.subCategories",
                                            as: "sub",
                                            cond: { $and: [{ $gte: [{ "$size": "$$sub.foodDetails" }, 1] }] }
                                        }
                                    },
                                    subCategoriesLength: "$$el.subCategoriesLength",
                                    foodDetails: "$$el.foodDetails",
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        mainCategories: {
                            $filter: {
                                input: "$restaurantList.mainCategories",
                                as: "categories",
                                cond: { $or: [{ $gte: [{ "$size": "$$categories.foodDetails" }, 1] }, { $gte: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$categories.subCategoriesLength", ''] }, ''] }, { $gte: ["$$categories.subCategoriesLength", 1] }] }, { $sum: { "$map": { "input": "$$categories.subCategories", "as": "el", "in": { "$size": "$$el.foodDetails" } } } }, 0] }, 1] }] }
                            }
                        }
                    }
                }
            }
        ];
     
        db.GetAggregation('restaurant', Restaurantcondition, function (err, docdata) {
            if (err || !docdata) {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!" });
            } else {
                db.GetOneDocument('rcategory', { '_id': docdata[0].restaurantList.rcategory }, {}, {}, function (err, rcatDetails) {
                    db.GetOneDocument('categories', { 'name': 'Recommended', 'restaurant': request.rest_id }, {}, {}, function (err, categoriesdata) {
                        var catid = '';
                        if (categoriesdata) {
                            catid = categoriesdata._id;
                        }
                        var rfoodcond = { $or: [{ 'shop': request.rest_id, 'categories.category': catid, 'status': { $eq: 1 } }, { 'shop': request.rest_id, 'recommended': 1, 'status': { $eq: 1 } }] };
                        if (req.body.veg && parseInt(req.body.veg) == 1) {
                            rfoodcond = { $and: [{ $or: [{ 'shop': request.rest_id, 'categories.category': catid, 'status': { $eq: 1 } }, { 'shop': request.rest_id, 'recommended': 1, 'status': { $eq: 1 } }] }, { "itmcat": { $eq: 1 } }] };
                        }
                        db.GetDocument('food', rfoodcond, { categories: 1, avatar: 1, name: 1, price: 1, visibility: 1, addons: 1, base_pack: 1, description: 1, avatar: 1, offer: 1, food_time: 1, itmcat: 1 }, {}, function (err, docdatas) {
                            var user_id
                            if (req.body.user_id) {
                                user_id = req.body.user_id;
                            }
                            db.GetOneDocument('users', { _id: user_id, status: { $eq: 1 }, favourite: { $elemMatch: { id: req.body.rest_id } } }, {}, {}, function (err, userRespo) {
                                if (err) {
                                    res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                                } else {
                                    var favourite = 0;
                                    if (userRespo) {
                                        if (userRespo.favourite) {
                                            favourite = 1;
                                        }
                                    }
     
                                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                        var recom = {};
                                        var respo = {};
                                        respo.status = '1';
                                        respo.favourite = favourite;
                                        respo.rest_offer = docdata[0].restaurantList.offer;
                                        respo.rest_offer.offer_status = docdata[0].restaurantList.offer.offer_status;
                                        respo.rest_offer.offer_amount = docdata[0].restaurantList.offer.offer_amount.toFixed(2);
                                        respo.rest_offer.target_amount = docdata[0].restaurantList.offer.target_amount.toFixed(2);
                                        respo.rest_offer.max_off = docdata[0].restaurantList.offer.max_off.toFixed(2);
                                        respo.rest_package_charge = docdata[0].restaurantList.package_charge;
                                        respo.rest_package_charge.package_status = docdata[0].restaurantList.package_charge.package_status;
                                        respo.rest_package_charge.package_amount = docdata[0].restaurantList.package_charge.package_amount.toFixed(2);
                                        respo.recommended = {};
                                        if (typeof docdatas != 'undefined' && docdatas != null && docdatas != 'null' && docdatas.length > 0) {
                                            recom.restaurant = request.rest_id;
                                            recom.subCategories = [];
                                            recom.subCategoriesLength = 0;
                                            recom.name = 'Recommended';
                                            recom._id = catid;
                                            recom.restaurant = request.rest_id;
                                            recom.foodDetails = [];
                                            for (i in docdatas) {
                                                var food_availability = docdatas[i].visibility;
                                                docdatas[i].food_availability = food_availability;
                                                var client_offset = (new Date).getTimezoneOffset();
                                                if (typeof req.body.client_offset != 'undefined') {
                                                    client_offset = parseInt(req.body.client_offset);
                                                }
                                                var server_offset = (new Date).getTimezoneOffset();
                                                var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                                if (typeof docdatas[i].food_time != 'undefined' && typeof docdatas[i].food_time.status != 'undefined' && docdatas[i].food_time.status == 1) {
                                                    var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                                    var currentTime = moment(time_now, "HH:mm a");
                                                    currentTime.toString();
     
                                                    from_date = timezone.tz(docdatas[i].food_time.from_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                    to_date = timezone.tz(docdatas[i].food_time.to_time, settings.settings.time_zone).format(settings.settings.time_format);
     
                                                    var startTime = moment(from_date, "HH:mm a");
                                                    startTime.toString();
     
                                                    var endTime = moment(to_date, "HH:mm a");
                                                    endTime.toString();
     
                                                    if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && docdatas[i].visibility == 1) {
                                                        docdatas[i].visibility = 1;
                                                    }
                                                    else {
                                                        docdatas[i].visibility = 0;
                                                    }
     
                                                    if (typeof docdatas[i].food_time.from_time != 'undefined') {
                                                        docdatas[i].food_time.from_time = new Date(new Date(docdatas[i].food_time.from_time).getTime() + diff_offset);
                                                    }
                                                    if (typeof docdatas[i].food_time.to_time != 'undefined') {
                                                        docdatas[i].food_time.to_time = new Date(new Date(docdatas[i].food_time.to_time).getTime() + diff_offset);
                                                    }
                                                }
                                                var avatar = '';
                                                if (typeof docdatas[i].avatar != 'undefined') {
                                                    var avattar = docdatas[i].avatar.split('./');
                                                    if (avattar[0] == "") {
                                                        avatar = settings.settings.site_url + avattar[1];
                                                    } else {
                                                        avatar = settings.settings.site_url + avattar[0]
                                                    }
                                                }
                                                var food_details = { 'name': docdatas[i].name, 'avatar': avatar, 'description': docdatas[i].description, '_id': docdatas[i]._id, 'price': docdatas[i].price.toFixed(2), 'visibility': docdatas[i].visibility, 'categories': docdatas[i].categories, 'food_time': docdatas[i].food_time, 'offer_percent': docdatas[i].offer.amount.toFixed(2), 'food_availability': docdatas[i].food_availability, itmcat: docdatas[i].itmcat }
     
     
                                                if (docdatas[i].offer.status == 0) {
                                                    food_details.offer = 'No';
                                                } else if (docdatas[i].offer.status == 1) {
                                                    food_details.offer = 'Yes';
                                                }
     
                                                var stoploop = false;
                                                food_details.more = 0;
                                                if (docdatas[i].base_pack.length != 0 || docdatas[i].addons.length != 0) {
                                                    if (docdatas[i].base_pack.length != 0) {
                                                        for (var b = 0; b < docdatas[i].base_pack.length; b++) {
                                                            if (docdatas[i].base_pack[b].sub_pack.length > 0) {
                                                                for (var s = 0; s < docdatas[i].base_pack[b].sub_pack.length; s++) {
                                                                    if (docdatas[i].base_pack[b].sub_pack[s].visibility == 1) {
                                                                        stoploop = true;
                                                                        food_details.more = 1;
                                                                        recom.foodDetails.push(food_details)
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                            if (stoploop) {
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if (docdatas[i].addons.length != 0 && stoploop == false) {
                                                        for (var a = 0; a < docdatas[i].addons.length; a++) {
                                                            if (docdatas[i].addons[a].visibility == 1) {
                                                                stoploop = true;
                                                                food_details.more = 1;
                                                                recom.foodDetails.push(food_details)
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if (!stoploop) {
                                                        recom.foodDetails.push(food_details)
                                                    }
                                                }
                                                else {
                                                    food_details.more = 0;
                                                    recom.foodDetails.push(food_details)
                                                }
                                            }
                                            respo.recommended = recom;
                                        }
                                        // var my_array = '';
                                        if (docdata[0]) {
                                            if (docdata[0].restaurantList) {
                                                var my_array = docdata[0].restaurantList.mainCategories.filter(function (x) {
                                                    if (x.name != 'Recommended') { return (x) }
                                                });
                                            }
                                            var client_offset = (new Date).getTimezoneOffset();
                                            if (typeof req.body.client_offset != 'undefined') {
                                                client_offset = parseInt(req.body.client_offset);
                                            }
                                            var server_offset = (new Date).getTimezoneOffset();
                                            var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                            if (typeof docdata[0].restaurantList != 'undefined') {
                                                if (typeof docdata[0].restaurantList.mainCategories != 'undefined' && docdata[0].restaurantList.mainCategories.length > 0) {
                                                    for (var i = 0; i < docdata[0].restaurantList.mainCategories.length; i++) {
                                                        if (typeof docdata[0].restaurantList.mainCategories[i].subCategoriesLength != 'undefined') {
                                                            if (docdata[0].restaurantList.mainCategories[i].subCategoriesLength == 0) {
                                                                if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails != 'undefined' && docdata[0].restaurantList.mainCategories[i].foodDetails.length > 0) {
                                                                    for (var j = 0; j < docdata[0].restaurantList.mainCategories[i].foodDetails.length; j++) {
                                                                        if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status != null && docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status == 1) {
                                                                            if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time != 'undefined') {
                                                                                docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time).getTime() + diff_offset)
                                                                            }
                                                                            if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time != 'undefined') {
                                                                                docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time).getTime() + diff_offset)
                                                                            }
                                                                        } else {
                                                                            docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time = '';
                                                                            docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time = '';
                                                                        }
                                                                        if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar != 'undefined') {
                                                                            var avattar = docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar.split('./');
                                                                            if (avattar[0] == "") {
                                                                                docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar = settings.settings.site_url + avattar[1];
                                                                            } else {
                                                                                docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar = settings.settings.site_url + avattar[0]
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories.length > 0) {
                                                                    for (var j = 0; j < docdata[0].restaurantList.mainCategories[i].subCategories.length; j++) {
                                                                        if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails.length > 0) {
                                                                            for (var z = 0; z < docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails.length; z++) {
                                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status != null && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status == 1) {
                                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != null) {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time).getTime() + diff_offset)
                                                                                    } else {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = '';
                                                                                    }
                                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != null) {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time).getTime() + diff_offset)
                                                                                    } else {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = '';
                                                                                    }
                                                                                } else {
                                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != null) {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time).getTime() + diff_offset)
                                                                                    } else {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = '';
                                                                                    }
                                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != null) {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time).getTime() + diff_offset)
                                                                                    } else {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = '';
                                                                                    }
                                                                                }
                                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar != 'undefined') {
                                                                                    var avattar = docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar.split('./');
                                                                                    if (avattar[0] == "") {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar = settings.settings.site_url + avattar[1];
                                                                                    } else {
                                                                                        docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar = settings.settings.site_url + avattar[0]
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        respo.list = {};
                                        respo.list.mainCategories = my_array;
                                        respo.fssai = {};
                                        respo.fssai.view = rcatDetails.is_fssai || 2;
                                        respo.fssai.fssaino = docdata[0].restaurantList.fssaino || '';
                                        res.send(respo);
                                    });
                                }
                            });
                        });
                    });
                });
            }
        })
    } */

    controller.getMenu = function (req, res) {
        var request = {};
        request.rest_id = req.body.rest_id;
        var matc_query = {
            status: { $eq: 1 }, '_id': new mongoose.Types.ObjectId(request.rest_id)
        }
        var foodcond = { $and: [{ $eq: ["$$food.status", 1] }] };
        if (req.body.veg && parseInt(req.body.veg) == 1) {
            foodcond = { $and: [{ $eq: ["$$food.status", 1] }, { $eq: ["$$food.itmcat", 1] }] };
        }
        var Restaurantcondition = [
            { $match: matc_query },
            {
                $project: {
                    restaurantList: {
                        username: "$username", _id: "$_id", restaurantname: "$restaurantname", slug: "$slug", time_setting: "$time_setting", avg_ratings: "$avg_ratings", food_img: "$food_img", offer: "$offer", about: "$about", logo: "$logo", avatar: "$avatar", distance: "$distance", main_cuisine: "$main_cuisine", efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] }, location: "$location", latitude: "$location.lat", longitude: "$location.lng", avail: "$avail", avg_delivery: "$avg_delivery", deliverd: "$deliverd", cancelled: "$cancelled", categories: "$categories", availability: "$availability", phone: "$phone", address: "$address", time_setting: "$time_setting", package_charge: "$package_charge", fssaino: "$fssaino", rcategory: "$rcategory",
                    }
                }
            },
            { $lookup: { from: 'categories', localField: "restaurantList._id", foreignField: "restaurant", as: "restaurantList.restaurantCategories" } },
            { $lookup: { from: 'food', localField: "restaurantList._id", foreignField: "shop", as: "restaurantList.foodDetails" } },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        restaurantCategories: {
                            $filter: {
                                input: "$restaurantList.restaurantCategories",
                                as: "categories",
                                cond: { $and: [{ $eq: ["$$categories.status", 1] }] }
                            }
                        },
                        mainCategories: {
                            $filter: {
                                input: "$restaurantList.restaurantCategories",
                                as: "categories",
                                cond: { $and: [{ $eq: ["$$categories.status", 1] }, { $eq: ["$$categories.mainparent", 'yes'] }] }
                            }
                        },
                        foodDetails: {
                            $filter: {
                                input: "$restaurantList.foodDetails",
                                as: "food",
                                cond: foodcond
                            }
                        },
                    },

                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        foodDetails: {
                            "$map": {
                                "input": "$restaurantList.foodDetails",
                                "as": "food",
                                "in": {
                                    name: "$$food.name",
                                    description: "$$food.description",
                                    more: { "$cond": [{ $or: [{ $ne: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$food.base_pack", ''] }, ''] }, { $gte: [{ "$size": "$$food.base_pack" }, 1] }] }, { "$size": "$$food.base_pack" }, 0] }, 0] }, { $ne: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$food.addons", ''] }, ''] }, { $gte: [{ "$size": "$$food.addons" }, 1] }] }, { "$size": "$$food.addons" }, 0] }, 0] }] }, 1, 0] },
                                    slug: "$$food.slug",
                                    _id: "$$food._id",
                                    price: "$$food.price",
                                    visibility: "$$food.visibility",
                                    food_availability: "$$food.visibility",
                                    avatar: { $cond: [{ $ne: [{ $ifNull: ["$$food.avatar", ""] }, ""] }, "$$food.avatar", ""] },
                                    categories: "$$food.categories",
                                    food_time: "$$food.food_time",
                                    offer: { $cond: { if: { $eq: ["$$food.offer.status", 1] }, then: { $literal: "yes" }, else: { $literal: "no" } } },
                                    offer_percent: "$$food.offer.amount",
                                    itmcat: "$$food.itmcat"
                                }
                            }
                        },
                        mainCategories: {
                            "$map": {
                                "input": "$restaurantList.mainCategories",
                                "as": "el",
                                "in": {
                                    restaurant: "$$el.restaurant",
                                    name: "$$el.name",
                                    _id: "$$el._id",
                                    subCategories: {
                                        $filter: {
                                            input: "$restaurantList.restaurantCategories",
                                            as: "categories",
                                            cond: { $and: [{ $eq: ["$$categories.parent", "$$el._id"] }] }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        mainCategories: {
                            "$map": {
                                "input": "$restaurantList.mainCategories",
                                "as": "el",
                                "in": {
                                    restaurant: "$$el.restaurant",
                                    name: "$$el.name",
                                    _id: "$$el._id",
                                    subCategories: {
                                        "$map": {
                                            "input": "$$el.subCategories",
                                            "as": "sub",
                                            "in": {
                                                name: "$$sub.name",
                                                _id: "$$sub._id",
                                                foodDetails: {
                                                    $filter: {
                                                        input: "$restaurantList.foodDetails",
                                                        as: "food",
                                                        cond: {
                                                            $and: [
                                                                { $gte: [{ "$size": "$$food.categories" }, 1] },
                                                                { $or: [{ $gte: [{ "$size": { "$setIntersection": ["$$food.categories", [{ 'category': "$$sub._id" }]] } }, 1] }, { "$setEquals": ["$$food.categories", [{ 'category': "$$sub._id" }]] }] }
                                                            ]
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    subCategoriesLength: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.subCategories", ''] }, ''] }, { $gte: [{ "$size": "$$el.subCategories" }, 1] }] }, { "$size": "$$el.subCategories" }, 0] },
                                    foodDetails: {
                                        "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.subCategories", ''] }, ''] }, { $gte: [{ "$size": "$$el.subCategories" }, 0] }] }, {
                                            $filter: {
                                                input: "$restaurantList.foodDetails",
                                                as: "food",
                                                cond: {
                                                    $and: [
                                                        { $gte: [{ "$size": "$$food.categories" }, 1] },
                                                        { $or: [{ $gte: [{ "$size": { "$setIntersection": ["$$food.categories", [{ 'category': "$$el._id" }]] } }, 1] }, { "$setEquals": ["$$food.categories", [{ 'category': "$$el._id" }]] }] }
                                                    ]
                                                }
                                            }
                                        }, []]
                                    },
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        mainCategories: {
                            "$map": {
                                "input": "$restaurantList.mainCategories",
                                "as": "el",
                                "in": {
                                    restaurant: "$$el.restaurant",
                                    name: "$$el.name",
                                    _id: "$$el._id",
                                    subCategories: {
                                        $filter: {
                                            input: "$$el.subCategories",
                                            as: "sub",
                                            cond: { $and: [{ $gte: [{ "$size": "$$sub.foodDetails" }, 1] }] }
                                        }
                                    },
                                    subCategoriesLength: "$$el.subCategoriesLength",
                                    foodDetails: "$$el.foodDetails",
                                }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1, package_charge: 1, fssaino: 1, rcategory: 1,
                        mainCategories: {
                            $filter: {
                                input: "$restaurantList.mainCategories",
                                as: "categories",
                                cond: { $or: [{ $gte: [{ "$size": "$$categories.foodDetails" }, 1] }, { $gte: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$categories.subCategoriesLength", ''] }, ''] }, { $gte: ["$$categories.subCategoriesLength", 1] }] }, { $sum: { "$map": { "input": "$$categories.subCategories", "as": "el", "in": { "$size": "$$el.foodDetails" } } } }, 0] }, 1] }] }
                            }
                        }
                    }
                }
            }
        ];

        db.GetAggregation('restaurant', Restaurantcondition, function (err, docdata) {
            if (err || !docdata) {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!" });
            } else {
                db.GetOneDocument('rcategory', { '_id': docdata[0].restaurantList.rcategory }, {}, {}, function (err, rcatDetails) {
                    var rfoodcond = { 'shop': request.rest_id, 'isRecommeneded': 1, 'status': { $eq: 1 } };
                    if (req.body.veg && parseInt(req.body.veg) == 1) {
                        rfoodcond = { $and: [{ 'shop': request.rest_id, 'isRecommeneded': 1, 'status': { $eq: 1 } }, { "itmcat": { $eq: 1 } }] };
                    }
                    db.GetDocument('food', rfoodcond, { categories: 1, avatar: 1, name: 1, price: 1, visibility: 1, addons: 1, base_pack: 1, description: 1, avatar: 1, offer: 1, food_time: 1, itmcat: 1 }, {}, function (err, docdatas) {
                        var user_id
                        if (req.body.user_id) {
                            user_id = req.body.user_id;
                        }
                        db.GetOneDocument('users', { _id: user_id, status: { $eq: 1 }, favourite: { $elemMatch: { id: req.body.rest_id } } }, {}, {}, function (err, userRespo) {
                            if (err) {
                                res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                            } else {
                                var favourite = 0;
                                if (userRespo) {
                                    if (userRespo.favourite) {
                                        favourite = 1;
                                    }
                                }

                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    var recom = {};
                                    var respo = {};
                                    respo.status = '1';
                                    respo.favourite = favourite;
                                    respo.rest_offer = docdata[0].restaurantList.offer;
                                    respo.rest_offer.offer_status = docdata[0].restaurantList.offer.offer_status;
                                    respo.rest_offer.offer_amount = docdata[0].restaurantList.offer.offer_amount.toFixed(2);
                                    respo.rest_offer.target_amount = docdata[0].restaurantList.offer.target_amount.toFixed(2);
                                    respo.rest_offer.max_off = docdata[0].restaurantList.offer.max_off.toFixed(2);
                                    respo.rest_package_charge = docdata[0].restaurantList.package_charge;
                                    respo.rest_package_charge.package_status = docdata[0].restaurantList.package_charge.package_status;
                                    respo.rest_package_charge.package_amount = docdata[0].restaurantList.package_charge.package_amount.toFixed(2);
                                    respo.recommended = {};
                                    if (typeof docdatas != 'undefined' && docdatas != null && docdatas != 'null' && docdatas.length > 0) {
                                        recom.restaurant = request.rest_id;
                                        recom.subCategories = [];
                                        recom.subCategoriesLength = 0;
                                        recom.name = 'Recommended';
                                        recom.restaurant = request.rest_id;
                                        recom.foodDetails = [];
                                        recom._id = new mongoose.Types.ObjectId();
                                        for (i in docdatas) {
                                            var food_availability = docdatas[i].visibility;
                                            docdatas[i].food_availability = food_availability;
                                            var client_offset = (new Date).getTimezoneOffset();
                                            if (typeof req.body.client_offset != 'undefined') {
                                                client_offset = parseInt(req.body.client_offset);
                                            }
                                            var server_offset = (new Date).getTimezoneOffset();
                                            var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                            if (typeof docdatas[i].food_time != 'undefined' && typeof docdatas[i].food_time.status != 'undefined' && docdatas[i].food_time.status == 1) {
                                                var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                                var currentTime = moment(time_now, "HH:mm a");
                                                currentTime.toString();

                                                from_date = timezone.tz(docdatas[i].food_time.from_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                to_date = timezone.tz(docdatas[i].food_time.to_time, settings.settings.time_zone).format(settings.settings.time_format);

                                                var startTime = moment(from_date, "HH:mm a");
                                                startTime.toString();

                                                var endTime = moment(to_date, "HH:mm a");
                                                endTime.toString();

                                                if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && docdatas[i].visibility == 1) {
                                                    docdatas[i].visibility = 1;
                                                }
                                                else {
                                                    docdatas[i].visibility = 0;
                                                }

                                                if (typeof docdatas[i].food_time.from_time != 'undefined') {
                                                    docdatas[i].food_time.from_time = new Date(new Date(docdatas[i].food_time.from_time).getTime() + diff_offset);
                                                }
                                                if (typeof docdatas[i].food_time.to_time != 'undefined') {
                                                    docdatas[i].food_time.to_time = new Date(new Date(docdatas[i].food_time.to_time).getTime() + diff_offset);
                                                }
                                            }
                                            var avatar = '';
                                            if (typeof docdatas[i].avatar != 'undefined') {
                                                var avattar = docdatas[i].avatar.split('./');
                                                if (avattar[0] == "") {
                                                    avatar = settings.settings.site_url + avattar[1];
                                                } else {
                                                    avatar = settings.settings.site_url + avattar[0]
                                                }
                                            }
                                            var food_details = { 'name': docdatas[i].name, 'avatar': avatar, 'description': docdatas[i].description, '_id': docdatas[i]._id, 'price': docdatas[i].price.toFixed(2), 'visibility': docdatas[i].visibility, 'categories': docdatas[i].categories, 'food_time': docdatas[i].food_time, 'offer_percent': docdatas[i].offer.amount.toFixed(2), 'food_availability': docdatas[i].food_availability, itmcat: docdatas[i].itmcat }


                                            if (docdatas[i].offer.status == 0) {
                                                food_details.offer = 'No';
                                            } else if (docdatas[i].offer.status == 1) {
                                                food_details.offer = 'Yes';
                                            }
                                            var stoploop = false;
                                            food_details.more = 0;
                                            if (docdatas[i].base_pack.length != 0 || docdatas[i].addons.length != 0) {
                                                if (docdatas[i].base_pack.length != 0) {
                                                    for (var b = 0; b < docdatas[i].base_pack.length; b++) {
                                                        if (docdatas[i].base_pack[b].sub_pack.length > 0) {
                                                            for (var s = 0; s < docdatas[i].base_pack[b].sub_pack.length; s++) {
                                                                if (docdatas[i].base_pack[b].sub_pack[s].visibility == 1) {
                                                                    stoploop = true;
                                                                    food_details.more = 1;
                                                                    recom.foodDetails.push(food_details)
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                        if (stoploop) {
                                                            break;
                                                        }
                                                    }
                                                }
                                                if (docdatas[i].addons.length != 0 && stoploop == false) {
                                                    for (var a = 0; a < docdatas[i].addons.length; a++) {
                                                        if (docdatas[i].addons[a].visibility == 1) {
                                                            stoploop = true;
                                                            food_details.more = 1;
                                                            recom.foodDetails.push(food_details)
                                                            break;
                                                        }
                                                    }
                                                }
                                                if (!stoploop) {
                                                    recom.foodDetails.push(food_details)
                                                }
                                            }
                                            else {
                                                food_details.more = 0;
                                                recom.foodDetails.push(food_details)
                                            }
                                        }
                                        respo.recommended = recom;
                                    }
                                    // var my_array = '';
                                    if (docdata[0]) {
                                        if (docdata[0].restaurantList) {
                                            var my_array = docdata[0].restaurantList.mainCategories.filter(function (x) {
                                                if (x.name != 'Recommended') { return (x) }
                                            });
                                        }
                                        var client_offset = (new Date).getTimezoneOffset();
                                        if (typeof req.body.client_offset != 'undefined') {
                                            client_offset = parseInt(req.body.client_offset);
                                        }
                                        var server_offset = (new Date).getTimezoneOffset();
                                        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                        if (typeof docdata[0].restaurantList != 'undefined') {
                                            if (typeof docdata[0].restaurantList.mainCategories != 'undefined' && docdata[0].restaurantList.mainCategories.length > 0) {
                                                for (var i = 0; i < docdata[0].restaurantList.mainCategories.length; i++) {
                                                    if (typeof docdata[0].restaurantList.mainCategories[i].subCategoriesLength != 'undefined') {
                                                        if (docdata[0].restaurantList.mainCategories[i].subCategoriesLength == 0) {
                                                            if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails != 'undefined' && docdata[0].restaurantList.mainCategories[i].foodDetails.length > 0) {
                                                                for (var j = 0; j < docdata[0].restaurantList.mainCategories[i].foodDetails.length; j++) {
                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status != null && docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status == 1) {
                                                                        if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time != 'undefined') {
                                                                            docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time).getTime() + diff_offset)
                                                                        }
                                                                        if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time != 'undefined') {
                                                                            docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time).getTime() + diff_offset)
                                                                        }
                                                                    } else {
                                                                        docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time = '';
                                                                        docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time = '';
                                                                    }
                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar != 'undefined') {
                                                                        var avattar = docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar.split('./');
                                                                        if (avattar[0] == "") {
                                                                            docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar = settings.settings.site_url + avattar[1];
                                                                        } else {
                                                                            docdata[0].restaurantList.mainCategories[i].foodDetails[j].avatar = settings.settings.site_url + avattar[0]
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        } else {
                                                            if (typeof docdata[0].restaurantList.mainCategories[i].subCategories != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories.length > 0) {
                                                                for (var j = 0; j < docdata[0].restaurantList.mainCategories[i].subCategories.length; j++) {
                                                                    if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails.length > 0) {
                                                                        for (var z = 0; z < docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails.length; z++) {
                                                                            if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status != null && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status == 1) {
                                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != null) {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time).getTime() + diff_offset)
                                                                                } else {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = '';
                                                                                }
                                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != null) {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time).getTime() + diff_offset)
                                                                                } else {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = '';
                                                                                }
                                                                            } else {
                                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != null) {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time).getTime() + diff_offset)
                                                                                } else {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = '';
                                                                                }
                                                                                if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != null) {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time).getTime() + diff_offset)
                                                                                } else {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = '';
                                                                                }
                                                                            }
                                                                            if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar != 'undefined') {
                                                                                var avattar = docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar.split('./');
                                                                                if (avattar[0] == "") {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar = settings.settings.site_url + avattar[1];
                                                                                } else {
                                                                                    docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].avatar = settings.settings.site_url + avattar[0]
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    respo.list = {};
                                    respo.list.mainCategories = my_array;
                                    respo.fssai = {};
                                    respo.fssai.view = rcatDetails.is_fssai || 2;
                                    respo.fssai.fssaino = docdata[0].restaurantList.fssaino || '';
                                    res.send(respo);
                                });
                            }
                        });
                    });
                });
            }
        })
    }

    /* referral concept*/
    controller.referFriends = function (req, res) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Config your admin settings" })
            } else {
                db.GetOneDocument('users', { _id: req.body.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                    if (err) {
                        res.send({ "status": "0", "errors": "Please Login and try Again....!" });
                    } else {
                        var date = new Date();
                        db.GetOneDocument('refer_coupon', { status: { $eq: 1 }, expires: { $gte: date } }, {}, {}, function (err, coupon) {
                            if (err) {
                                res.send({ "status": "0", "errors": "Something Went Wrong..!'" });
                            } else {
                                var data = {};
                                data.offer_type = settings.settings.coupon_process;
                                if (user && user.unique_code) {
                                    data.referral_code = user.unique_code;
                                }
                                if (coupon && coupon.status && coupon.status == 1) {
                                    data.discount_amount = coupon.discount_amount;
                                    data.cart_amount = coupon.cart_amount;
                                    data.expires = coupon.expires;
                                } else {
                                    data.offer_type = "no_offer";
                                }
                                res.send(data);
                            }
                        });
                    }
                });
            }
        });
    }

    controller.offerList = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        db.GetDocument('users', { _id: req.body.user_id }, { refer_activity: 1 }, {}, function (err, usersOffer) {
            if (err || !usersOffer[0].refer_activity[0]) {
                res.send({
                    status: 0,
                    errors: "Currently no offers available"
                })
            } else {
                var status = '1';
                res.send({ status: status, "refer_activity": usersOffer[0].refer_activity })
            }
        })
    }

    controller.getUserCardDetails = function (req, res) {
        var userId;
        if (typeof req.body.userId != 'undefined' && req.body.userId != '') {
            if (isObjectId(req.body.userId)) {
                userId = new mongoose.Types.ObjectId(req.body.userId);
            } else {
                res.send({ "status": "0", "errors": 'Invalid userId' });
                return;
            }
        } else {
            res.send({ "status": "0", "errors": 'Invalid userId' });
            return;
        }
        var orderId;
        if (typeof req.body.orderId != 'undefined' && req.body.orderId != '') {
            orderId = req.body.orderId
        } else {
            res.send({ "status": "0", "errors": 'Invalid orderId' });
            return;
        }
        var restaurantId;
        if (typeof req.body.restaurantId != 'undefined' && req.body.restaurantId != '') {
            if (isObjectId(req.body.restaurantId)) {
                restaurantId = new mongoose.Types.ObjectId(req.body.restaurantId);
            } else {
                res.send({ "status": "0", "errors": 'Invalid restaurantId' });
                return;
            }
        } else {
            res.send({ "status": "0", "errors": 'Invalid restaurantId' });
            return;
        }
        req.checkBody('latitude', 'latitude is Required').notEmpty();
        req.checkBody('longitude', 'longitude is Required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var lat = req.body.latitude;
        var lon = req.body.longitude;
        // var lat  = 13.0827;
        // var lon  = 80.2707;
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = req.body.client_offset;
        }
        var jstz = require('jstimezonedetect');
        var client_timezone = jstz.determine().name();
        if (typeof req.body.client_timezone != 'undefined') {
            client_timezone = parseInt(req.body.client_timezone);
        }
        var collection = 'orders';
        var condition = { user_id: userId, restaurant_id: restaurantId, order_id: orderId };
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
        var date = Date.now() + diff_offset;
        var isodate = new Date(date);
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err) {
                res.send({ "status": "0", "errors": 'Error in settings..!' });
            } else {
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialSettings) {
                    if (err || !socialSettings) {
                        res.send({ "status": "0", "errors": 'Error in settings..!' });
                    } else {
                        var apiKey = socialSettings.settings.map_api.web_key;
                        var img = settings.settings.site_url + CONFIG.RESTAURANT_DEFAULT_IMAGE;
                        var eta_time = 0;
                        if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
                            eta_time = parseInt(settings.settings.eta_time)
                        }
                        var aggregationdata = [
                            { $match: condition },
                            {
                                $project: {
                                    cart_details: "$cart_details.cart_details",
                                    restaurant_id: "$restaurant_id",
                                    user_id: "$user_id",
                                }
                            },
                            {
                                $lookup: {
                                    from: "restaurant",
                                    let: {
                                        restaurantId: "$restaurant_id",
                                    },
                                    pipeline: [
                                        { $match: { "$expr": { "$eq": ["$_id", "$$restaurantId"] } } },
                                        { $limit: 1 },
                                    ],
                                    as: "restaurantDetails"
                                }
                            },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            { "$unwind": { path: "$cart_details", preserveNullAndEmptyArrays: true } },
                            {
                                $lookup: {
                                    from: "food",
                                    let: {
                                        foodId: "$cart_details.id",
                                    },
                                    pipeline: [
                                        { $match: { "$expr": { "$eq": ["$_id", "$$foodId"] } } },
                                        { $limit: 1 },
                                    ],
                                    as: "cart_details.foodDetails"
                                }
                            },
                            { "$unwind": { path: "$cart_details.foodDetails", preserveNullAndEmptyArrays: true } },
                            { $group: { _id: { _id: "$_id", user_id: "$user_id", restaurant_id: "$restaurant_id" }, restaurantDetails: { $first: "$restaurantDetails" }, discount_type: { $first: "$discount_type" }, coupon_code: { $first: "$coupon_code" }, coupon_discount: { $first: "$coupon_discount" }, cart_details: { $push: "$cart_details" } } },
                            { '$lookup': { from: 'city', localField: 'restaurantDetails.main_city', foreignField: 'cityname', as: 'cityDetails' } },
                            { "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    "user_id": "$_id.user_id",
                                    "restaurant_id": "$_id.restaurant_id",
                                    "_id": "$_id._id",
                                    "name": "$restaurantDetails.restaurantname",
                                    "rest_img": { "$cond": [{ $ne: [{ "$ifNull": ["$restaurantDetails.food_img", ''] }, ''] }, { $concat: [settings.settings.site_url, { $substr: ["$restaurantDetails.food_img", 2, -1] }] }, img] },
                                    "efp_time": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$restaurantDetails.efp_time", ''] }, ''] }, { $ne: ["$restaurantDetails.efp_time", ''] }, { $ne: ["$restaurantDetails.efp_time", 'null'] }, { $gte: ["$restaurantDetails.efp_time", 1] }] }, "$restaurantDetails.efp_time", 0] },
                                    "status": "$restaurantDetails.status",
                                    "avail": "$restaurantDetails.avail",
                                    "availability": "$restaurantDetails.availability",
                                    "location": "$restaurantDetails.location",
                                    "unique_code": "$restaurantDetails.unique_code",
                                    "time_setting": "$restaurantDetails.time_setting",
                                    "offer": "$restaurantDetails.offer",
                                    "avatar": "$restaurantDetails.avatar",
                                    "rest_address": "$restaurantDetails.address.fulladres",
                                    "tax": "$restaurantDetails.tax",
                                    "isodate": { $literal: isodate },
                                    "cart_details": {
                                        "$map": {
                                            "input": "$cart_details",
                                            "as": "el",
                                            "in": {
                                                'name': '$$el.foodDetails.name',
                                                'food_time': '$$el.foodDetails.food_time',
                                                more: { "$cond": [{ $or: [{ $ne: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.base_pack", ''] }, ''] }, { $gte: [{ "$size": "$$el.foodDetails.base_pack" }, 1] }] }, { "$size": "$$el.foodDetails.base_pack" }, 0] }, 0] }, { $ne: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.addons", ''] }, ''] }, { $gte: [{ "$size": "$$el.foodDetails.addons" }, 1] }] }, { "$size": "$$el.foodDetails.addons" }, 0] }, 0] }] }, 1, 0] },
                                                'id': '$$el.id',
                                                'cart_id': '$$el._id',
                                                'description': '$$el.foodDetails.description',
                                                'offer_details': '$$el.foodDetails.offer',
                                                'is_offer_available': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer.status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer.status", 1] }] }, 0, 1] },
                                                'offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer.status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer.status", 1] }] }, { $multiply: ['$$el.quantity', { $multiply: ['$$el.foodDetails.price', { $divide: ["$$el.foodDetails.offer.amount", 100] }] }] }, 0] },
                                                'price': '$$el.foodDetails.price',
                                                'slug': '$$el.foodDetails.slug',
                                                'status': '$$el.foodDetails.status',
                                                'visibility': '$$el.foodDetails.visibility',
                                                'food_availability': '$$el.foodDetails.visibility',
                                                offer: { $cond: { if: { $eq: ["$$el.foodDetails.offer.status", 1] }, then: { $literal: "yes" }, else: { $literal: "no" } } },
                                                offer_percent: "$$el.foodDetails.offer.amount",
                                                'quantity': '$$el.quantity',
                                                'instruction': '$$el.instruction',
                                                'food_addons': '$$el.foodDetails.addons',
                                                'food_base_pack': '$$el.foodDetails.base_pack',
                                                'addons': {
                                                    "$map": {
                                                        "input": "$$el.addons",
                                                        "as": "addons",
                                                        "in": {
                                                            '_id': "$$addons._id",
                                                            'addons_details': {
                                                                "$cond": [{
                                                                    $and: [{
                                                                        $ne: [{
                                                                            "$ifNull": [{
                                                                                "$arrayElemAt": [{
                                                                                    $filter: {
                                                                                        input: "$$el.foodDetails.addons",
                                                                                        as: "food_addons",
                                                                                        cond: { $and: [{ $eq: ["$$addons._id", "$$food_addons._id"] }] }
                                                                                    }
                                                                                }, 0]
                                                                            }, '']
                                                                        }, '']
                                                                    },]
                                                                }, {
                                                                    "$arrayElemAt": [{
                                                                        $filter: {
                                                                            input: "$$el.foodDetails.addons",
                                                                            as: "food_addons",
                                                                            cond: { $and: [{ $eq: ["$$addons._id", "$$food_addons._id"] }] }
                                                                        }
                                                                    }, 0]
                                                                }, {}]
                                                            }
                                                        }
                                                    }
                                                },
                                                'base_pack': {
                                                    "$map": {
                                                        "input": "$$el.base_pack",
                                                        "as": "base_pack",
                                                        "in": {
                                                            '_id': "$$base_pack._id",
                                                            'sub_pack': "$$base_pack.sub_pack",
                                                            'base_pack_details': {
                                                                "$cond": [{
                                                                    $and: [{
                                                                        $ne: [{
                                                                            "$ifNull": [{
                                                                                "$arrayElemAt": [{
                                                                                    $filter: {
                                                                                        input: "$$el.foodDetails.base_pack",
                                                                                        as: "food_base_pack",
                                                                                        cond: { $and: [{ $eq: ["$$base_pack._id", "$$food_base_pack._id"] }] }
                                                                                    }
                                                                                }, 0]
                                                                            }, '']
                                                                        }, '']
                                                                    },]
                                                                }, {
                                                                    "$arrayElemAt": [{
                                                                        $filter: {
                                                                            input: "$$el.foodDetails.base_pack",
                                                                            as: "food_base_pack",
                                                                            cond: { $and: [{ $eq: ["$$base_pack._id", "$$food_base_pack._id"] }] }
                                                                        }
                                                                    }, 0]
                                                                }, {}]
                                                            }
                                                        }
                                                    }
                                                },
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    "user_id": "$user_id",
                                    "restaurant_id": "$restaurant_id",
                                    "_id": "$_id",
                                    "name": "$name",
                                    "rest_img": "$rest_img",
                                    "rest_address": "$rest_address",
                                    "efp_time": "$efp_time",
                                    "status": "$status",
                                    "isodate": "$isodate",
                                    "avail": "$avail",
                                    "availability": "$availability",
                                    "package_charge": "$package_charge",
                                    "avatar": "$avatar",
                                    "tax": "$tax",
                                    "location": "$location",
                                    "time_setting": "$time_setting",
                                    "offer": "$offer",
                                    "coupon_discount": "$coupon_discount",
                                    "cart_details": {
                                        "$map": {
                                            "input": "$cart_details",
                                            "as": "el",
                                            "in": {
                                                'name': '$$el.name',
                                                'food_time': '$$el.food_time',
                                                'id': '$$el.id',
                                                'cart_id': '$$el.cart_id',
                                                'description': '$$el.description',
                                                'offer': '$$el.offer',
                                                'is_offer_available': '$$el.is_offer_available',
                                                'offer_price': '$$el.offer_price',
                                                'price': '$$el.price',
                                                'slug': '$$el.slug',
                                                'status': '$$el.status',
                                                'quantity': '$$el.quantity',
                                                'instruction': '$$el.instruction',
                                                'visibility': '$$el.visibility',
                                                'food_addons': '$$el.food_addons',
                                                'food_base_pack': '$$el.food_base_pack',
                                                'more': '$$el.more',
                                                'offer_percent': '$$el.offer_percent',
                                                'food_availability': '$$el.food_availability',
                                                'offer_details': '$$el.offer_details',
                                                'addons': {
                                                    "$map": {
                                                        "input": "$$el.addons",
                                                        "as": "addons",
                                                        "in": {
                                                            'quantity': '$$addons.quantity',
                                                            '_id': "$$addons._id",
                                                            'is_deleted': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details._id", ''] }, ''] }] }, 0, 1] },
                                                            'name': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details.name", ''] }, ''] }] }, "$$addons.addons_details.name", ''] },
                                                            'price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details.price", ''] }, ''] }] }, "$$addons.addons_details.price", 0] },
                                                            'visibility': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details.visibility", ''] }, ''] }] }, "$$addons.addons_details.visibility", 0] }
                                                        }
                                                    }
                                                },
                                                'base_pack': {
                                                    "$map": {
                                                        "input": "$$el.base_pack",
                                                        "as": "base_pack",
                                                        "in": {
                                                            '_id': "$$base_pack._id",
                                                            'is_deleted': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details._id", ''] }, ''] }] }, 0, 1] },
                                                            'name': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details.name", ''] }, ''] }] }, "$$base_pack.base_pack_details.name", ''] },
                                                            'description': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details.description", ''] }, ''] }] }, "$$base_pack.base_pack_details.description", ''] },
                                                            'type': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details.type", ''] }, ''] }] }, "$$base_pack.base_pack_details.type", ''] },
                                                            'sub_pack': {
                                                                "$map": {
                                                                    "input": "$$base_pack.sub_pack",
                                                                    "as": "sub_pack",
                                                                    "in": {
                                                                        '_id': "$$sub_pack._id",
                                                                        'sub_pack_details': {
                                                                            "$cond": [{
                                                                                $and: [{
                                                                                    $ne: [{
                                                                                        "$ifNull": [{
                                                                                            "$arrayElemAt": [{
                                                                                                $filter: {
                                                                                                    input: "$$base_pack.base_pack_details.sub_pack",
                                                                                                    as: "food_sub_pack",
                                                                                                    cond: { $and: [{ $eq: ["$$sub_pack._id", "$$food_sub_pack._id"] }] }
                                                                                                }
                                                                                            }, 0]
                                                                                        }, '']
                                                                                    }, '']
                                                                                },]
                                                                            }, {
                                                                                "$arrayElemAt": [{
                                                                                    $filter: {
                                                                                        input: "$$base_pack.base_pack_details.sub_pack",
                                                                                        as: "food_sub_pack",
                                                                                        cond: { $and: [{ $eq: ["$$sub_pack._id", "$$food_sub_pack._id"] }] }
                                                                                    }
                                                                                }, 0]
                                                                            }, {}]
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    "user_id": "$user_id",
                                    "restaurant_id": "$restaurant_id",
                                    "_id": "$_id",
                                    "name": "$name",
                                    "rest_img": "$rest_img",
                                    "rest_address": "$rest_address",
                                    "efp_time": "$efp_time",
                                    "eta": { $sum: [eta_time, "$efp_time"] },
                                    "status": "$status",
                                    "avail": "$avail",
                                    "time_setting": "$time_setting",
                                    "time": { $literal: 0 },
                                    "package_charge": "$package_charge",
                                    "isodate": "$isodate",
                                    "availability": "$availability",
                                    "location": "$location",
                                    "foods": {
                                        "$map": {
                                            "input": "$cart_details",
                                            "as": "el",
                                            "in": {
                                                'name': '$$el.name',
                                                'food_time': '$$el.food_time',
                                                'id': '$$el.id',
                                                'cart_id': '$$el.cart_id',
                                                'description': '$$el.description',
                                                'offer': '$$el.offer',
                                                'price': '$$el.price',
                                                'slug': '$$el.slug',
                                                'status': '$$el.status',
                                                'quantity': '$$el.quantity',
                                                'is_offer_available': '$$el.is_offer_available',
                                                'offer_price': '$$el.offer_price',
                                                'instruction': '$$el.instruction',
                                                'addons': '$$el.addons',
                                                'visibility': '$$el.visibility',
                                                'more': '$$el.more',
                                                'offer_percent': '$$el.offer_percent',
                                                'food_availability': '$$el.food_availability',
                                                'offer_details': '$$el.offer_details',
                                                /* 'food_base_pack': '$$el.food_base_pack',
                                                'food_addons': '$$el.food_addons', */
                                                'base_pack': {
                                                    "$map": {
                                                        "input": "$$el.base_pack",
                                                        "as": "base_pack",
                                                        "in": {
                                                            '_id': "$$base_pack._id",
                                                            'is_deleted': "$$base_pack.is_deleted",
                                                            'name': "$$base_pack.name",
                                                            'type': "$$base_pack.type",
                                                            'description': "$$base_pack.description",
                                                            'sub_pack': {
                                                                "$map": {
                                                                    "input": "$$base_pack.sub_pack",
                                                                    "as": "sub_pack",
                                                                    "in": {
                                                                        '_id': "$$sub_pack._id",
                                                                        'visibility': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$sub_pack.sub_pack_details.visibility", ''] }, ''] }] }, "$$sub_pack.sub_pack_details.visibility", 0] },
                                                                        'is_deleted': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$sub_pack.sub_pack_details._id", ''] }, ''] }] }, 0, 1] },
                                                                        'name': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$sub_pack.sub_pack_details.name", ''] }, ''] }] }, "$$sub_pack.sub_pack_details.name", ''] }
                                                                    }
                                                                }
                                                            },
                                                        }
                                                    }
                                                },
                                                "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                            }
                                        }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation(collection, aggregationdata, function (err, cartDetails) {
                            if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {
                                if (typeof cartDetails[0].foods != 'undefined') {
                                    for (var i = 0; i < cartDetails[0].foods.length; i++) {
                                        if (typeof cartDetails[0].foods[i].food_time != 'undefined' && typeof cartDetails[0].foods[i].food_time.status != 'undefined' && cartDetails[0].foods[i].food_time.status == 1) {
                                            if (typeof cartDetails[0].foods[i].food_time.from_time != 'undefined') {
                                                cartDetails[0].foods[i].food_time.from_time = new Date(new Date(cartDetails[0].foods[i].food_time.from_time).getTime() + diff_offset)
                                            }
                                            if (typeof cartDetails[0].foods[i].food_time.to_time != 'undefined') {
                                                cartDetails[0].foods[i].food_time.to_time = new Date(new Date(cartDetails[0].foods[i].food_time.to_time).getTime() + diff_offset)
                                            }
                                        }
                                    }
                                }
                                distance.key(apiKey);
                                distance.units('imperial');
                                var origins = [lat.toString() + ',' + lon.toString()];
                                var destinations = [];
                                var latlong = cartDetails[0].location.lat.toString() + ',' + cartDetails[0].location.lng.toString();
                                destinations.push(latlong)
                                var week_days_checkin = 1;
                                var d = new Date();
                                var n = d.getDay();
                                if (n == 6 || n == 0) { week_days_checkin = 0; }
                                if (typeof cartDetails[0].time_setting != 'undefined') {
                                    if (typeof cartDetails[0].time_setting.week_days != 'undefined') {
                                        if (typeof cartDetails[0].time_setting.week_days.start_time != 'undefined') {
                                            cartDetails[0].time_setting.week_days.start_time = new Date(new Date(cartDetails[0].time_setting.week_days.start_time).getTime() + diff_offset);
                                        }
                                        if (typeof cartDetails[0].time_setting.week_days.end_time != 'undefined') {
                                            cartDetails[0].time_setting.week_days.end_time = new Date(new Date(cartDetails[0].time_setting.week_days.end_time).getTime() + diff_offset);
                                            if (week_days_checkin == 1) {
                                                cartDetails[0].time = moment.tz(cartDetails[0].time_setting.week_days.end_time, client_timezone).valueOf();

                                                cartDetails[0].time = moment(new Date(cartDetails[0].time)).format("hh:mm a");
                                            }
                                        }
                                    }
                                    if (typeof cartDetails[0].time_setting.week_end != 'undefined') {
                                        if (typeof cartDetails[0].time_setting.week_end.start_time != 'undefined') {
                                            cartDetails[0].time_setting.week_end.start_time = new Date(new Date(cartDetails[0].time_setting.week_end.start_time).getTime() + diff_offset);
                                        }
                                        if (typeof cartDetails[0].time_setting.week_end.end_time != 'undefined') {
                                            cartDetails[0].time_setting.week_end.end_time = new Date(new Date(cartDetails[0].time_setting.week_end.end_time).getTime() + diff_offset);
                                            if (week_days_checkin == 0) {
                                                cartDetails[0].time = moment.tz(cartDetails[0].time_setting.week_end.end_time, client_timezone).valueOf();
                                                cartDetails[0].time = moment(new Date(cartDetails[0].time)).format("hh:mm a");
                                            }
                                        }
                                    }
                                }
                                let day = (new Date).getDay();
                                let tzname = geoTz(parseFloat(cartDetails[0].location.lat), parseFloat(cartDetails[0].location.lng))[0];
                                let offset = tz.tz(tzname).utcOffset();
                                day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                                var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                var currentBtime = new Date();
                                var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                                var open_till = new Date(new Date().getTime() + diff_b_offset);
                                var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                // var day = new Date().getDay();
                                var currentDay = day_array[day];
                                var working_hours_availability = 0;
                                cartDetails[0].time = new Date(new Date().getTime() + diff_b_offset);
                                if (typeof cartDetails[0].working_hours != 'undefined' && cartDetails[0].working_hours.length > 0) {
                                    var index_pos = cartDetails[0].working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                    if (index_pos != -1) {
                                        var working_hours = cartDetails[0].working_hours[index_pos];
                                        if (working_hours.selected == 1) {
                                            var match_index = working_hours.slots.findIndex(item => {
                                                var start_time = new Date(item.start_time);
                                                var end_time = new Date(item.end_time);
                                                var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                if (start_time_seconds > end_time_seconds) {
                                                    return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                                } else {
                                                    return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                                }
                                            })
                                            if (match_index != -1 || working_hours.wholeday == 1) {
                                                if (working_hours.wholeday == 1) {
                                                    var d = new Date();
                                                    d.setHours(23);
                                                    d.setMinutes(59);
                                                    cartDetails[0].time = new Date(new Date(d).getTime() + diff_b_offset);
                                                } else {
                                                    cartDetails[0].time = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                                }
                                                working_hours_availability = 1;
                                            } else {
                                                working_hours_availability = 0;
                                            }
                                        } else {
                                            working_hours_availability = 0;
                                        }
                                    } else {
                                        working_hours_availability = 0;
                                    }
                                }

                                if (typeof cartDetails[0].foods != 'undefined' && cartDetails[0].foods.length > 0) {
                                    for (var i = 0; i < cartDetails[0].foods.length; i++) {
                                        var stoploop = false;
                                        cartDetails[0].foods[i].more = 0;
                                        if (cartDetails[0].foods[i] && ((typeof cartDetails[0].foods[i].base_pack != 'undefined' && cartDetails[0].foods[i].base_pack.length != 0) || (typeof cartDetails[0].foods[i].addons != 'undefined' && cartDetails[0].foods[i].addons.length != 0))) {
                                            if (cartDetails[0].foods[i].more.length != 0) {
                                                if ((typeof cartDetails[0].foods[i].base_pack != 'undefined' && cartDetails[0].foods[i].base_pack.length != 0)) {
                                                    for (var b = 0; b < cartDetails[0].foods[i].base_pack.length; b++) {
                                                        if (cartDetails[0].foods[i].base_pack[b].sub_pack.length > 0) {
                                                            for (var s = 0; s < cartDetails[0].foods[i].base_pack[b].sub_pack.length; s++) {
                                                                if (cartDetails[0].foods[i].base_pack[b].sub_pack[s].visibility == 1) {
                                                                    stoploop = true;
                                                                    cartDetails[0].foods[i].more = 1;
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                        if (stoploop) {
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                            if (typeof cartDetails[0].foods[i].addons != 'undefined' && cartDetails[0].foods[i].addons.length != 0 && stoploop == false) {
                                                for (var a = 0; a < cartDetails[0].foods[i].addons.length; a++) {
                                                    if (cartDetails[0].foods[i].addons[a].visibility == 1) {
                                                        stoploop = true;
                                                        cartDetails[0].foods[i].more = 1;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        else {
                                            cartDetails[0].foods[i].more = 0;
                                        }
                                    }
                                }
                                res.send({ "status": "1", message: '', cartDetails: cartDetails[0] });
                            } else {
                                res.send({ "status": "1", message: '', cartDetails: {} });
                            }
                        })
                    }
                });
            }
        });
    }

    //update number otp
    controller.updateNumber = function (req, res) {
        var errors = [];
        req.checkBody('Userid', 'Userid is required').notEmpty();
        req.checkBody('otp', 'otp is required').notEmpty();
        req.checkBody('country_code', 'country_code is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        var data = {
            phone: {}
        };
        data.phone.code = req.body.country_code;
        data.phone.number = req.body.phone_number;
        db.GetOneDocument('users', { _id: req.body.Userid, status: { $eq: 1 } }, {}, {}, function (err, user) {
            if (err) {
                res.send({ "status": "0", "errors": "Please Login and try Again....!" });
            } else {
                if (user && user._id) {
                    if (user.otp == req.body.otp) {
                        db.UpdateDocument('users', { _id: req.body.Userid }, data, function (err, response) {
                            if (err) {
                                res.send({ "status": "0", "errors": 'Invalid user id..!!' });
                            } else {
                                res.send({
                                    status: '1',
                                    message: "Success"
                                });
                            }
                        })
                    } else {
                        res.send({ "status": "0", "errors": "Invalid Otp" });
                    }
                } else {
                    res.send({ "status": "0", "errors": "User Not found" });
                }
            }
        })
    }
    //update number otp
    controller.getBanners = (req, res) => {
        var data = {};
        db.GetCount('mobbanners', { 'status': { $eq: 1 } }, (err, count) => {
            if (err || count < 1) {
                data.status = 1;
                data.message = 'success';
                data.bannerlist = [];
                res.send(data);
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) {
                        res.send({ "status": "0", "errors": "Configure your app settings" });
                    } else {
                        var eachrun = 30;
                        var loop = Math.ceil(count / eachrun);
                        var loopcount = 1;
                        var banners = [];
                        async.whilst(
                            (cb) => {
                                cb(null, loopcount <= loop)
                            },
                            (callback) => {
                                var limit = eachrun;
                                var skip = ((eachrun * loopcount)) - eachrun;
                                var query = [
                                    { $match: { 'status': { $eq: 1 } } },
                                    { $sort: { img: 1, bannername: 1 } },
                                    { $skip: skip },
                                    { $limit: limit },
                                    {
                                        $project: {
                                            bannername: "$bannername",
                                            img: 1
                                        }
                                    }
                                ];
                                db.GetAggregation('mobbanners', query, (err, bannerlist) => {
                                    if (bannerlist && bannerlist.length > 0) {

                                        for (var i = 0; i < bannerlist.length; i++) {
                                            if (bannerlist[i].img != undefined) {
                                                image = settings.settings.site_url + bannerlist[i].img.slice(2);
                                                bannerlist[i].img = image;
                                            } else {
                                                bannerlist[i].img = "";
                                            }
                                        }
                                        banners = [...banners, ...bannerlist];
                                        loopcount++;
                                        callback(null, loopcount);
                                    } else {
                                        loopcount++;
                                        callback(null, loopcount);
                                    }
                                });
                            },
                            () => {
                                data.status = 1;
                                data.message = 'success';
                                data.bannerlist = banners;
                                res.send(data);
                            }
                        );
                    }
                });
            }
        });
    }

    controller.getRcat = (req, res) => {
        var data = {};
        db.GetCount('rcategory', { 'status': { $eq: 1 } }, (err, count) => {
            if (err || count < 1) {
                data.status = 1;
                data.message = 'success';
                data.list = [];
                res.send(data);
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) {
                        res.send({ "status": "0", "errors": "Configure your app settings" });
                    } else {
                        var bquery = [
                            { $match: { 'status': { $eq: 1 } } },
                            { $limit: 2 }
                        ];
                        db.GetAggregation('mobbanners', bquery, (err, banners) => {
                            if (err || !banners) {
                                data.banners = [];
                            } else {
                                if (banners && banners.length > 0) {
                                    for (var i = 0; i < banners.length; i++) {
                                        if (banners[i].img != undefined) {
                                            image = settings.settings.site_url + banners[i].img.slice(2);
                                            banners[i].img = image;
                                        } else {
                                            banners[i].img = "";
                                        }
                                    }
                                }
                                var eachrun = 30;
                                var loop = Math.ceil(count / eachrun);
                                var loopcount = 1;
                                var categories = [];
                                async.whilst(
                                    (cb) => {
                                        cb(null, loopcount <= loop)
                                    },
                                    (callback) => {
                                        var limit = eachrun;
                                        var skip = ((eachrun * loopcount)) - eachrun;
                                        var query = [
                                            { $match: { 'status': { $eq: 1 } } },
                                            { $sort: { img: 1, rcatname: 1 } },
                                            { $skip: skip },
                                            { $limit: limit },
                                            {
                                                $project: {
                                                    rcatname: "$rcatname",
                                                    img: 1
                                                }
                                            }
                                        ];
                                        db.GetAggregation('rcategory', query, (err, catlist) => {
                                            if (catlist && catlist.length > 0) {

                                                for (var i = 0; i < catlist.length; i++) {
                                                    if (catlist[i].img != undefined) {
                                                        image = settings.settings.site_url + catlist[i].img.slice(2);
                                                        catlist[i].img = image;
                                                    } else {
                                                        catlist[i].img = "";
                                                    }
                                                }
                                                categories = [...categories, ...catlist];
                                                loopcount++;
                                                callback(null, loopcount);
                                            } else {
                                                loopcount++;
                                                callback(null, loopcount);
                                            }
                                        });
                                    },
                                    () => {
                                        data.status = 1;
                                        data.message = 'success';
                                        data.banners = banners;
                                        data.list = categories;
                                        res.send(data);
                                    }
                                );
                            }
                        });
                    }
                });
            }
        });
    }

    controller.subcatlist = (req, res) => {
        var errors = [];
        req.checkBody('rcat', 'category id is Required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        //'_id': { $eq: mongoose.Types.ObjectId(req.body.rcat) }
        db.GetCount('rcategory', { $and: [{ '_id': mongoose.Types.ObjectId(req.body.rcat) }, { 'status': { $eq: 1 } }] }, (err, count) => {
            if (err || count < 1) {
                data.status = 1;
                data.message = 'success';
                data.subcatlist = [];
                res.send(data);
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) {
                        res.send({ "status": "0", "errors": "Configure your app settings" });
                    } else {
                        var eachrun = 30;
                        var loop = Math.ceil(count / eachrun);
                        var loopcount = 1;
                        var categories = [];
                        async.whilst(
                            (cb) => {
                                cb(null, loopcount <= loop)
                            },
                            (callback) => {
                                var limit = eachrun;
                                var skip = ((eachrun * loopcount)) - eachrun;
                                var query = [
                                    { $match: { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { 'status': { $eq: 1 } }] } },
                                    { $sort: { img: 1, scatname: 1 } },
                                    { $skip: skip },
                                    { $limit: limit },
                                    {
                                        $project: {
                                            scatname: "$scatname",
                                            img: 1
                                        }
                                    }
                                ];
                                db.GetAggregation('scategory', query, (err, scatlist) => {
                                    if (scatlist && scatlist.length > 0) {

                                        for (var i = 0; i < scatlist.length; i++) {
                                            if (scatlist[i].img != undefined) {
                                                image = settings.settings.site_url + scatlist[i].img.slice(2);
                                                scatlist[i].img = image;
                                            } else {
                                                scatlist[i].img = "";
                                            }
                                        }
                                        categories = [...categories, ...scatlist];
                                        loopcount++;
                                        callback(null, loopcount);
                                    } else {
                                        loopcount++;
                                        callback(null, loopcount);
                                    }
                                });
                            },
                            () => {
                                data.status = 1;
                                data.message = 'success';
                                data.subcatlist = categories;
                                res.send(data);
                            }
                        );
                    }
                });
            }
        });
    }

    controller.productlist = async function (req, res) {
        var query = {};
        // req.checkBody('rcat', 'category id is Required').notEmpty();
        // errors = req.validationErrors();
        // if (errors) {
        //     res.send({
        //         "status": "0",
        //         "errors": errors[0].msg
        //     });
        //     return;
        // }
        var favoriteDetails = [];
        if (req.body.user_id) {
            favoriteDetails = await db.GetDoc('favourite', { 'user_id': mongoose.Types.ObjectId(req.body.user_id) }, { product_id: 1 }, {});
        }

        query = { 'status': { $eq: 1 } };
        if (req.body.rcat) {
            query = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { 'status': { $eq: 1 } }] };
        }
        if (req.body.scat) {
            query = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { 'scategory': mongoose.Types.ObjectId(req.body.scat) }, { 'status': { $eq: 1 } }] };
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        if (req.body.rcat && req.body.isRecommeneded == 1) {
            query = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { 'isRecommeneded': { $eq: 1 } }, { 'status': { $eq: 1 } }] };
        }
        if (req.body.rcat && req.body.scat && req.body.isRecommeneded == 1) {
            query = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { 'scategory': mongoose.Types.ObjectId(req.body.scat) }, { 'isRecommeneded': { $eq: 1 } }, { 'status': { $eq: 1 } }] };
        }

        if (!req.body.rcat && req.body.isRecommeneded == 1) {
            query = { $and: [{ 'isRecommeneded': { $eq: 1 } }, { 'status': { $eq: 1 } }] };
        }

        if (req.body.brandid) {
            query = { $and: [{ 'brandname': mongoose.Types.ObjectId(req.body.brandid) }, { 'status': { $eq: 1 } }] };
        }

        if (req.body.cityid) {
            query['main_city'] = { $in: [req.body.cityid] }
        }

        var usersQuery = [{ "$match": query },
        { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
        { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
        { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
        { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: 1,
                avatar: 1,
                rcat_id: "$rcategory._id",
                scat_id: "$scategory._id",
                rcategory: { $toLower: '$rcategory.rcatname' },
                scategory: { $toLower: '$scategory.scatname' },
                brandname: { $toLower: '$brands.brandname' },
                isRecommeneded: 1,
                itmcat: 1,
                status: 1,
                price_details: 1,
                sort_name: { $toLower: '$name' },
                substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                "images": {
                    "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                }
            }
        },
        {
            $project: {
                name: 1,
                rcategory: 1,
                substat: 1,
                images: 1,
                status: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        if (req.body.rand) {
            usersQuery.push({ $sample: { size: parseInt(req.body.limit) } });
        }
        if (req.body.search) {
            //try {
            //condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.rcatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.scatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.brandname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.isRecommeneded": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.itmcat": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        }
        // else {
        //     sorting["documentData.createdAt"] = -1;
        //     usersQuery.push({ $sort: sorting });
        // }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(10) });
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        var data = {};
        try {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err || !settings) {
                    res.send({ "status": "0", "errors": "Configure your app settings" });
                } else {
                    db.GetAggregation('food', usersQuery, function (err, docdata) {
                        if (err || docdata.length <= 0) {
                            data.status = 1;
                            data.message = 'success';
                            data.count = [];
                            data.productlist = [];
                            res.send(data);
                        } else {

                            if (docdata[0].documentData && docdata[0].documentData.length > 0) {

                                for (var i = 0; i < docdata[0].documentData.length; i++) {
                                    docdata[0].documentData[i].favourite = 0;
                                    if (favoriteDetails && favoriteDetails.length > 0) {
                                        favoriteDetails.forEach(fav => {
                                            if (docdata[0].documentData[i]._id.toString() == fav.product_id.toString()) {
                                                docdata[0].documentData[i].favourite = 1;
                                            }
                                        });
                                    }
                                    if (docdata[0].documentData[i].avatar != undefined) {
                                        image = settings.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
                                        docdata[0].documentData[i].avatar = image;
                                    } else {
                                        docdata[0].documentData[i].avatar = "";
                                    }

                                    for (var j = 0; j < docdata[0].documentData[i].price_details.length; j++) {

                                        if (docdata[0].documentData[i].price_details[j].image != undefined) {
                                            image = settings.settings.site_url + docdata[0].documentData[i].price_details[j].image.slice(2);
                                            docdata[0].documentData[i].price_details[j].image = image;
                                        } else {
                                            docdata[0].documentData[i].price_details[j].image = "";
                                        }
                                    }

                                }
                                //categories = [...categories, ...scatlist];

                            }

                            data.status = 1;
                            data.message = 'success';
                            data.count = docdata[0].count;
                            data.productlist = docdata[0].documentData;
                            res.send(data);

                        }
                    });
                }
            });
        } catch (e) {
        }
    }

    controller.getUserCityid = (req, res) => {
        var errors = [];
        req.checkBody('lat', 'latitude is required').notEmpty();
        req.checkBody('lng', 'longitude is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        lng = req.body.lng;
        lat = req.body.lat;
        db.GetOneDocument('city', {
            "status": { $eq: 1 },
            "poly_test": {
                "$geoIntersects": {
                    $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }
                }
            }
        }, {}, {}, function (err, docdata) {
            let cityid = docdata && docdata._id ? docdata._id : new mongoose.Types.ObjectId();
            res.send({ "status": 1, cityid: cityid });
        })
    }

    // controller.getalltimeslots = function (req, res) {
    //     var data = {};
    //     db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
    //         if (err || !settings) {
    //             res.send({ "status": "0", "errors": "Configure your app settings" });
    //         } else {

    //             db.GetDocument('timeslots', {}, {}, {}, function (err, docdata) {
    //                 if (err) {
    //                     res.send(err);
    //                     data.status = 1;
    //                     data.message = 'error';
    //                     data.timeslots = [];
    //                     res.send(data);
    //                 } else {
    //                     var timedata = [];
    //                     for (var i = 0; i < docdata.length; i++) {

    //                         var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
    //                         var currentTime = moment(time_now, "HH:mm a");
    //                         currentTime.toString();

    //                         startTime = timezone.tz(docdata[i].time_start, settings.settings.time_zone).format(settings.settings.time_format);
    //                         endTime = timezone.tz(docdata[i].time_end, settings.settings.time_zone).format(settings.settings.time_format);
    //                         var start_Time = moment(startTime, "HH:mm a");
    //                         //start_Time.toString();
    //                         var end_Time = moment(endTime, "HH:mm a");
    //                         //end_Time.toString();

    //                         var timeslots = [];

    //                         while (start_Time <= end_Time) {
    //                             timeslots.push(new moment(start_Time).format('hh:mm a'));
    //                             start_Time.add(docdata[i].slottime, 'minutes');

    //                         }

    //                         var timeobj = {
    //                             '_id': docdata[i]._id,
    //                             'weekday': docdata[i].weekday,
    //                             'slottime': docdata[i].slottime,
    //                             'time_start': startTime,
    //                             'time_end': endTime,
    //                             'timeslots': timeslots,
    //                             'status': docdata[i].status
    //                         }

    //                         timedata.push(timeobj);

    //                     }
    //                     data.status = 1;
    //                     data.message = 'success';
    //                     data.timeslots = timedata;
    //                     res.send(data);
    //                 }
    //             });
    //         }
    //     });
    // }

    controller.getalltimeslots = async function (req, res) {
        var data = {};
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        if (settings.status == false) {
            res.send({ "status": "0", "errors": "Configure your app settings" });
        } else {
            const docdata = await db.GetDocument('timeslots', { status: { $eq: 1 } }, {}, {})


            if (docdata.status == false) {
                res.send(err);
                data.status = 1;
                data.error = true
                data.message = 'error';
                data.timeslots = [];
                res.send(data);
            } else {

                var timedata = [];
                for (var i = 0; i < docdata.doc.length; i++) {

                    var time_now = Date.now()
                    // .format(settings.doc.settings.time_format);




                    var currentTime = moment(time_now, "HH:mm a");
                    currentTime.toString();

                    let startTime = docdata.doc[i].time_start
                    // .format(settings.doc.settings.time_format);

                    let endTime = docdata.doc[i].time_end
                    // .format(settings.doc.settings.time_format);




                    if (endTime == '11:59 pm') {
                        endTime = '24:00 pm';
                    }
                    var start_Time = moment(startTime, "HH:mm a");
                    //start_Time.toString();
                    var end_Time = moment(endTime, "HH:mm a");
                    //end_Time.toString();
                    var timeslots = [];

                    while (start_Time <= end_Time) {
                        timeslots.push(new moment(start_Time).format('hh:mm a'));
                        start_Time.add(docdata.doc[i].slottime, 'minutes');
                    }

                    var timeobj = {
                        '_id': docdata.doc[i]._id,
                        'weekday': docdata.doc[i].weekday,
                        'slottime': docdata.doc[i].slottime,
                        'time_start': startTime,
                        'time_end': endTime,
                        'timeslots': timeslots,
                        'status': docdata.doc[i].status
                    }


                    timedata.push(timeobj);

                }
                data.error = false
                data.status = 1;
                data.message = 'success';
                data.timeslots = timedata;

                res.send(data);



            }

        }



    }




    controller.getallpayments = function (req, res) {
        var data = {};
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {

                db.GetDocument('paymentgateway', {}, {}, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                        data.status = 1;
                        data.message = 'error';
                        data.payments = [];
                        res.send(data);
                    } else {
                        var paymentdata = [];
                        for (var i = 0; i < docdata.length; i++) {

                            if (docdata[i].gateway_name == "COD") {
                                var gateway_name = "Cash on Delivery";

                            } else if (docdata[i].gateway_name == "Cashfree") {
                                var gateway_name = "Pay By Cards, UPI, Wallets, Net Banking";
                            }

                            var paymentobj = {
                                '_id': docdata[i]._id,
                                'alias': docdata[i].alias,
                                'gateway_name': gateway_name,
                                'status': docdata[i].status
                            }

                            paymentdata.push(paymentobj);

                        }
                        data.status = 1;
                        data.message = 'success';
                        data.payments = paymentdata;
                        res.send(data);
                    }
                });
            }
        });
    }

    controller.userclaimreward = (req, res) => {
        var errors = [];
        req.checkBody('user', 'User is required').notEmpty();
        req.checkBody('type', 'Type is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        if (isObjectId(req.body.user)) {
            var type = parseInt(req.body.type);
            if (type == 0 || type == 1) {
                if (type == 0) {
                    db.UpdateDocument('users', { _id: mongoose.Types.ObjectId(req.body.user) }, { mark_status: 0 }, {}, (err, update) => {
                        if (err || !update || update.nModified == 0) {
                            data = { status: 0, errors: 'Something went wrong, Try again' };
                            res.json(data);
                        } else {
                            data.status = 1;
                            data.message = 'Your Reward point holded for next milestone';
                            res.json(data);
                        }
                    })
                } else {
                    db.GetOneDocument('users', { _id: mongoose.Types.ObjectId(req.body.user) }, { reached_points: 1, mark_status: 1, current_points: 1, next_points: 1, start_time: 1 }, {}, (err, userDetails) => {
                        if (err || !userDetails || userDetails._id === undefined) {
                            data = { status: 0, errors: 'Something went wrong, Try again' };
                            res.json(data)
                        } else {
                            let insert_data = {};
                            insert_data.user_id = userDetails._id;
                            insert_data.time = Date.now();
                            insert_data.claimed = userDetails.current_points;
                            insert_data.reached = userDetails.reached_points;
                            insert_data.status = 1;
                            db.InsertDocument('rewards', insert_data, (err, insert) => {
                                if (err || !insert) {
                                    data = { status: 0, errors: 'Something went wrong, Try again' };
                                    res.json(data);
                                } else {
                                    db.UpdateDocument('users', { _id: userDetails._id }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {}, (err, update) => { });
                                    data.status = 1;
                                    data.message = 'Reward Updated Successfully';
                                    res.json(data);
                                }
                            })
                        }
                    })
                }
            } else {
                res.json(data);
            }
        } else {
            res.json(data);
        }
    }

    controller.getAllFeaturecategory = (req, res) => {
        var data = {};
        var qry = {};
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, { mrcategory: 1 }, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                //	console.log(req.body.cityid)
                // 	return false;
                var bquery = [
                    { $match: { 'status': { $eq: 1 } } },
                    { $skip: 2 }
                ]
                db.GetAggregation('mobbanners', bquery, (err, banners) => {
                    if (err || !banners) {
                        data.banners = [];
                    } else {
                        if (banners && banners.length > 0) {
                            for (var i = 0; i < banners.length; i++) {
                                if (banners[i].img != undefined) {
                                    image = settings.settings.site_url + banners[i].img.slice(2);
                                    banners[i].img = image;
                                } else {
                                    banners[i].img = "";
                                }
                            }
                        }

                        qry["$or"] = [];
                        if (settings.settings.mrcategory != undefined && settings.settings.rcategory != "") {
                            if (settings.settings.mrcategory.length > 0) {
                                for (var i = 0; i < settings.settings.mrcategory.length; i++) {
                                    qry["$or"].push({ $and: [{ '_id': mongoose.Types.ObjectId(settings.settings.mrcategory[i]) }, { 'status': { $eq: 1 } }] });
                                }
                            }
                        }
                        var eachrun = 10;
                        var plimit = 4;
                        var loop = Math.ceil(100 / eachrun);
                        var loopcount = 1;
                        var categories = [];
                        //{ $and: [{ 'feature': { $eq: 0 } }, { 'status': { $eq: 1 } }] }
                        async.whilst(
                            (cb) => {
                                cb(null, loopcount <= loop)
                            },
                            (callback) => {
                                var limit = eachrun;
                                var skip = ((eachrun * loopcount)) - eachrun;
                                var query = [
                                    { $match: qry },
                                    {
                                        $lookup: {
                                            from: 'food',
                                            let: {
                                                rcategory: "$_id",
                                            },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: {
                                                            $and: [
                                                                { "$eq": ["$rcategory", "$$rcategory"] },
                                                                { "$eq": ["$status", 1] },
                                                                { "$in": [req.body.cityid, "$main_city"] }
                                                            ]
                                                        }
                                                    }
                                                },
                                                {
                                                    $limit: 5
                                                }
                                            ], as: "foods"
                                        }
                                    },
                                    //{ "$unwind": { path: "$foods", preserveNullAndEmptyArrays: true } },

                                    //{ $lookup: { from: 'scategory', localField: "_id", foreignField: "rcategory", as: "subcategory" } },
                                    { $skip: skip },
                                    { $limit: limit },
                                    {
                                        $project: {
                                            rcatname: "$rcatname",
                                            img: 1,
                                            //subcategory: "$subcategory",
                                            products: "$foods"
                                        }
                                    }
                                ];
                                db.GetAggregation('rcategory', query, (err, catlist) => {
                                    if (catlist && catlist.length > 0) {

                                        for (var i = 0; i < catlist.length; i++) {
                                            if (catlist[i].img != undefined) {
                                                image = settings.settings.site_url + catlist[i].img.slice(2);
                                                catlist[i].img = image;
                                            } else {
                                                catlist[i].img = "";
                                            }

                                            if (catlist[i].products != "" && catlist[i].products != undefined) {

                                                for (var j = 0; j < catlist[i].products.length; j++) {

                                                    if (catlist[i].products[j].avatar != "" && catlist[i].products[j].avatar != undefined) {
                                                        image = settings.settings.site_url + catlist[i].products[j].avatar.slice(2);
                                                        catlist[i].products[j].avatar = image;
                                                    } else {
                                                        catlist[i].products[j].avatar = "";
                                                    }
                                                    for (var k = 0; k < catlist[i].products[j].price_details.length; k++) {

                                                        if (catlist[i].products[j].price_details[k].image != undefined) {
                                                            image = settings.settings.site_url + catlist[i].products[j].price_details[k].image.slice(2);
                                                            catlist[i].products[j].price_details[k].image = image;
                                                        } else {
                                                            catlist[i].products[j].price_details[k].image = "";
                                                        }
                                                    }
                                                }
                                            }

                                        }
                                        categories = [...categories, ...catlist];
                                        loopcount++;
                                        callback(null, loopcount);
                                    } else {
                                        loopcount++;
                                        callback(null, loopcount);
                                    }

                                });
                            },
                            () => {
                                data.status = 1;
                                data.message = 'success';
                                data.banners = banners;
                                data.catlist = categories;
                                res.send(data);
                            }
                        );
                    }
                });
            }
        })
    }



    controller.deliverycharge = (req, res) => {

        var data = {};
        var request = {};
        request.id = req.body.cityid;

        db.GetOneDocument('city', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, citydata) => {
            if (citydata) {
                //console.log(citydata)
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
                    if (err || !settings) {
                        res.send({ status: 0, err: 1, message: 'Configure your app settings' });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
                            if (err || !socialsettings) {
                                res.send({ status: 0, err: 1, message: 'Configure your app settings' });
                            } else {
                                var apiKey = socialsettings.settings.map_api.web_key;

                                var default_km = settings.settings.radius;
                                var lat1 = req.body.lat;
                                var lat2 = citydata.location.lat;
                                var lon1 = req.body.lng;
                                var lon2 = citydata.location.lng;

                                var radlat1 = Math.PI * lat1 / 180;
                                var radlat2 = Math.PI * lat2 / 180;
                                var theta = lon1 - lon2;
                                var radtheta = Math.PI * theta / 180;
                                var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
                                dist = Math.acos(dist);
                                dist = dist * 180 / Math.PI;
                                dist = dist * 60 * 1.1515;
                                var km = Math.ceil(dist * 1.609344);
                                var miles = Math.ceil(dist / 1.609344);
                                //console.log(km, default_km)
                                if (km > default_km) {
                                    res.send({ "status": "0", "errors": "This location is too far away from the city for " + settings.settings.site_title + " to deliver. Please pick a valid location.!" });
                                } else {
                                    var distance = require('google-distance-matrix');
                                    distance.key(apiKey);
                                    if (citydata.format == "mile") {
                                        distance.units('imperial');
                                    } else {
                                        distance.units('metric');
                                    }
                                    //distance.units('imperial');
                                    let from = [citydata.warehouse.lat.toString() + ',' + citydata.warehouse.lng.toString()];
                                    let to = [req.body.lat.toString() + ',' + req.body.lng.toString()];
                                    distance.matrix(from, to, function (err, distances) {
                                        //console.log(distances)
                                        if (distances.rows[0].elements[0].status == 'OK') {
                                            request.distance = distances.rows[0].elements[0].distance.value / 1000;
                                        }
                                        if (citydata.format == "mile") {
                                            request.distance = request.distance / 8 * 5;
                                        }

                                        totalkms = request.distance || 0;
                                        totalkms = parseFloat(totalkms);
                                        data.minimum_distance = citydata.minimum_distance;
                                        if (totalkms > citydata.minimum_distance) {
                                            data.total_kms = totalkms - citydata.minimum_distance;
                                            if (req.body.total_amount < citydata.delivery_charge.target_amount) {
                                                data.delivery_charge = parseFloat((data.total_kms * citydata.extra_price) + citydata.delivery_charge.default_amt).toFixed(2);

                                            } else {
                                                data.delivery_charge = parseFloat(data.total_kms * citydata.extra_price).toFixed(2);
                                            }
                                        } else {
                                            data.total_kms = totalkms;
                                            if (req.body.total_amount < citydata.delivery_charge.target_amount) {
                                                data.delivery_charge = citydata.delivery_charge.default_amt;
                                            } else {
                                                data.delivery_charge = 0.00;
                                            }
                                        }

                                        res.send({ status: 1, err: 0, message: 'Delivery charge Details..', data: data });

                                    })
                                }

                            }
                        });
                    }

                })
            }
            else {
                res.send({ status: 0, response: 'Error in Getting charge' })
            }
        })
    }

    controller.getBrands = (req, res) => {
        var data = {};
        db.GetCount('brands', { 'status': { $eq: 1 } }, (err, count) => {
            if (err || count < 1) {
                data.status = 1;
                data.message = 'success';
                data.bannerlist = [];
                res.send(data);
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) {
                        res.send({ "status": "0", "errors": "Configure your app settings" });
                    } else {
                        var eachrun = 30;
                        var loop = Math.ceil(count / eachrun);
                        var loopcount = 1;
                        var brands = [];
                        async.whilst(
                            (cb) => {
                                cb(null, loopcount <= loop)
                            },
                            (callback) => {
                                var limit = eachrun;
                                var skip = ((eachrun * loopcount)) - eachrun;
                                var query = [
                                    { $match: { 'status': { $eq: 1 } } },
                                    { $sort: { img: 1, bannername: 1 } },
                                    { $skip: skip },
                                    { $limit: limit },
                                    {
                                        $project: {
                                            brandname: "$brandname",
                                            img: 1
                                        }
                                    }
                                ];
                                db.GetAggregation('brands', query, (err, brandlist) => {
                                    if (brandlist && brandlist.length > 0) {

                                        for (var i = 0; i < brandlist.length; i++) {
                                            if (brandlist[i].img != undefined) {
                                                image = settings.settings.site_url + brandlist[i].img.slice(2);
                                                brandlist[i].img = image;
                                            } else {
                                                brandlist[i].img = "";
                                            }
                                        }
                                        brands = [...brands, ...brandlist];
                                        loopcount++;
                                        callback(null, loopcount);
                                    } else {
                                        loopcount++;
                                        callback(null, loopcount);
                                    }
                                });
                            },
                            () => {

                                data.status = 1;
                                data.message = 'success';
                                data.brandlist = brands;
                                res.send(data);
                            }
                        );
                    }
                });
            }
        });
    }

    controller.hotselling_products = (req, res) => {

        var query = { $and: [{ 'hotselling': { $gt: 0 } }, { 'status': { $eq: 1 } }] };
        var usersQuery = [{ "$match": query },
        { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
        { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
        { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
        { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: 1,
                avatar: 1,
                rcat_id: "$rcategory._id",
                scat_id: "$scategory._id",
                rcategory: { $toLower: '$rcategory.rcatname' },
                scategory: { $toLower: '$scategory.scatname' },
                brandname: { $toLower: '$brands.brandname' },
                isRecommeneded: 1,
                itmcat: 1,
                status: 1,
                price_details: 1,
                sort_name: { $toLower: '$name' },
                substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                "images": {
                    "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                }
            }
        },
        {
            $project: {
                name: 1,
                rcategory: 1,
                substat: 1,
                images: 1,
                status: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        var sorting = {};
        sorting["documentData.hotselling"] = -1;
        usersQuery.push({ $sort: sorting });


        usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(40) });
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

        var data = {};
        try {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err || !settings) {
                    res.send({ "status": "0", "errors": "Configure your app settings" });
                } else {
                    db.GetAggregation('food', usersQuery, function (err, docdata) {
                        if (err || docdata.length <= 0) {
                            if (err) {
                                data.status = 0;
                                data.message = 'Error';
                            } else {
                                data.status = 1;
                                data.message = 'success';
                            }

                            data.count = [];
                            data.hotselling = [];
                            res.send(data);
                        } else {

                            if (docdata[0].documentData && docdata[0].documentData.length > 0) {

                                for (var i = 0; i < docdata[0].documentData.length; i++) {
                                    if (docdata[0].documentData[i].avatar != undefined) {
                                        image = settings.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
                                        docdata[0].documentData[i].avatar = image;
                                    } else {
                                        docdata[0].documentData[i].avatar = "";
                                    }
                                    for (var j = 0; j < docdata[0].documentData[i].price_details.length; j++) {

                                        if (docdata[0].documentData[i].price_details[j].image != undefined) {
                                            image = settings.settings.site_url + docdata[0].documentData[i].price_details[j].image.slice(2);
                                            docdata[0].documentData[i].price_details[j].image = image;
                                        } else {
                                            docdata[0].documentData[i].price_details[j].image = "";
                                        }
                                    }

                                }

                            }

                            data.status = 1;
                            data.message = 'success';
                            data.count = docdata[0].count;
                            data.hotselling = docdata[0].documentData;
                            res.send(data);

                        }
                    });
                }
            });
        } catch (e) {
        }

    }




    controller.recentlyVisit = async (req, res) => {



        var id = [];
        // req.checkBody('user_id', 'user_id is required').notEmpty();
        // req.checkBody('type', 'type is required').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        // 	res.send({ status: 0, message: errors[0].msg });
        // 	return;
        // }
        var collection = 'recently_visit';
        if (req.body.type == 'temp_visit') {
            collection = 'recent_temp_visit'
        }
        // if(req.body.idDoc && req.body.idDoc.length > 0){
        // 	req.body.idDoc.forEach(e=>{
        // 		id.push(new mongoose.Types.ObjectId(e))
        // 	})
        // }
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        if (settings.status === false) {
            res.send({ "status": "0", "errors": "Configure your app settings" });
        } else {
            var query = [
                { "$match": { user_id: req.body.userId } },
                {
                    $lookup: {
                        from: 'food',
                        let: { product_id: "$product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$_id", "$$product_id"] },
                                            { $eq: ["$status", 1] },
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "product"
                    }
                },
                { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
                { $sort: { createdAt: 1 } },
                { $limit: 24 },
                {
                    $project: {
                        name: "$product.name",
                        slug: "$product.slug",
                        avatar: "$product.avatar",
                        size: "$product.size",
                        rcategory: "$product.rcategory",
                        scategory: "$product.scategory",
                        status: "$product.status",
                        offer_status: "$product.offer_status",
                        offer_amount: "$product.offer_amount",
                        price_details: "$product.price_details",
                        quantity: "$product.quantity",
                        sale_price: "$product.sale_price",
                        base_price: "$product.base_price",
                        hover_image: "$product.hover_image",
                        product_id: "$product._id",
                        size_status: "$product.size_status",
                        quantity_size: "$product.quantity_size",
                        rating: "$product.rating",
                        total_rating: "$product.total_rating",
                        total_rating_users: "$product.total_rating_users",
                    }
                },
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        avatar: 1,
                        size: 1,
                        rcategory: 1,
                        scategory: 1,
                        status: 1,
                        offer_status: 1,
                        offer_amount: 1,
                        price_details: 1,
                        quantity: { $ifNull: ["$quantity", 0] },
                        sale_price: 1,
                        base_price: 1,
                        hover_image: 1,
                        product_id: 1,
                        size_status: 1,
                        quantity_size: 1,
                        rating: 1,
                        total_rating: 1,
                        total_rating_users: 1,
                        notZero: {
                            $filter: {
                                input: "$quantity_size",
                                as: "item",
                                cond: {
                                    $and: [
                                        {
                                            $eq: ["$$item.status", 1]
                                        },
                                        {
                                            $ne: ['$$item.quantity', 0]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        avatar: 1,
                        size: 1,
                        rcategory: 1,
                        scategory: 1,
                        status: 1,
                        offer_status: 1,
                        offer_amount: 1,
                        price_details: 1,
                        quantity: 1,
                        sale_price: 1,
                        base_price: 1,
                        hover_image: 1,
                        product_id: 1,
                        size_status: 1,
                        rating: 1,
                        total_rating: 1,
                        total_rating_users: 1,
                        quantity_size: 1,
                        notZero: 1
                    }
                },
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        avatar: 1,
                        size: 1,
                        rcategory: 1,
                        scategory: 1,
                        status: 1,
                        offer_status: 1,
                        offer_amount: 1,
                        price_details: 1,
                        quantity: 1,
                        sale_price: 1,
                        base_price: 1,
                        hover_image: 1,
                        product_id: 1,
                        size_status: 1,
                        rating: 1,
                        total_rating: 1,
                        total_rating_users: 1,
                        quantity_size: 1,
                        discount_percentage: {
                            $round: [
                                {
                                    $multiply: [
                                        { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                        100
                                    ]
                                }
                            ]
                        },
                        filterSize: { $ifNull: ['$notZero', []] }
                    }
                },

            ];
            if (req.body.userId) {
                if (!mongoose.isValidObjectId(req.body.userId)) {
                    return res.send({ status: 0, message: "Invalid user_id!" });
                };
                query.push(
                    {
                        $lookup: {
                            from: "favourite",
                            let: { product_id: "$product_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$product_id", "$$product_id"] },
                                                { $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.userId)] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "favourite"
                        }
                    }
                )
            } else {
                query.push({
                    $addFields: { favourite: { $literal: [] } }
                });
            };
            query.push(
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        avatar: 1,
                        size: 1,
                        rcategory: 1,
                        scategory: 1,
                        status: 1,
                        offer_status: 1,
                        offer_amount: 1,
                        price_details: 1,
                        quantity: 1,
                        sale_price: 1,
                        base_price: 1,
                        hover_image: 1,
                        product_id: 1,
                        filterSize: 1,
                        size_status: 1,
                        rating: 1,
                        total_rating: 1,
                        total_rating_users: 1,
                        discount_percentage: {
                            $round: [
                                {
                                    $multiply: [
                                        { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                        100
                                    ]
                                }
                            ]
                        },
                        favourite_add: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                        quantity_size: {
                            $filter: {
                                input: "$quantity_size",
                                as: "item",
                                cond: {
                                    $eq: ["$$item.status", 1]
                                }
                            }
                        },
                        in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
                        no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
                    }
                },
            )
            const docdata = await db.GetAggregation(collection, query)



            if (!docdata) {
                return res.send({ status: 0, data: [], error: true })
            } else {
                for (var i = 0; i < docdata.length; i++) {
                    docdata[i].currency = settings.doc.settings.currency_symbol;
                    docdata[i].favourite = 0;
                    if (docdata[i].avatar != undefined) {
                        image = settings.doc.settings.site_url + docdata[i].avatar
                        docdata[i].avatar = image;
                    } else {
                        docdata[i].avatar = "";
                    }
                    if (docdata[i].hover_image != undefined) {
                        image = settings.doc.settings.site_url + docdata[i].hover_image
                        docdata[i].hover_image = image;
                    } else {
                        docdata[i].hover_image = "";
                    }
                    if (docdata[i].offer_status == 1) {
                        // docdata[i].base_price = JSON.parse(JSON.stringify(docdata[i].sale_price));
                        // var offer_price = parseInt((docdata[i].sale_price * docdata[i].offer_amount)/100)
                        // var sub_price = docdata[i].sale_price - offer_price;
                        // docdata[i].sale_price = sub_price>0?sub_price: 0;
                        docdata[i].offer_base = JSON.parse(JSON.stringify(docdata[i].base_price));
                        var offer_price = parseFloat(parseFloat((docdata[i].base_price * docdata[i].offer_amount) / 100).toFixed(2));
                        var sub_price = docdata[i].base_price - offer_price;
                        docdata[i].offer_sale = sub_price > 0 ? sub_price : 0
                    }
                }
                res.send({ status: 1, data: docdata, error: false })
            }
        }
        // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        // 	if (err || !settings) {
        // 		res.send({ "status": "0", "errors": "Configure your app settings" });
        // 	} else {
        // 		// var query = [
        // 		// 	{ "$match": { user_id: req.body.user_id } },
        // 		// 	{
        // 		// 		$lookup: {
        // 		// 			from: 'food',
        // 		// 			let: { product_id: "$product_id" },
        // 		// 			pipeline: [
        // 		// 				{
        // 		// 					$match: {
        // 		// 						$expr: {
        // 		// 							$and: [
        // 		// 								{ $eq: ["$_id", "$$product_id"] },
        // 		// 								{ $eq: ["$status", 1] },
        // 		// 							]
        // 		// 						}
        // 		// 					}
        // 		// 				}
        // 		// 			],
        // 		// 			as: "product"
        // 		// 		}
        // 		// 	},
        // 		// 	{ $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        // 		// 	{
        // 		// 		$project: {
        // 		// 			name: "$product.name",
        // 		// 			slug: "$product.slug",
        // 		// 			avatar: "$product.avatar",
        // 		// 			size: "$product.size",
        // 		// 			rcategory: "$product.rcategory",
        // 		// 			scategory: "$product.scategory",
        // 		// 			status: "$product.status",
        // 		// 			offer_status: "$product.offer_status",
        // 		// 			offer_amount: "$product.offer_amount",
        // 		// 			price_details: "$product.price_details",
        // 		// 			quantity: "$product.quantity",
        // 		// 			sale_price: "$product.sale_price",
        // 		// 			base_price: "$product.base_price",
        // 		// 			hover_image: "$product.hover_image",
        // 		// 			product_id: "$product._id",
        // 		// 			size_status: "$product.size_status",
        // 		// 			quantity_size: "$product.quantity_size",
        // 		// 		}
        // 		// 	},
        // 		// 	{
        // 		// 		$project: {
        // 		// 			name: 1,
        // 		// 			slug: 1,
        // 		// 			avatar: 1,
        // 		// 			size: 1,
        // 		// 			rcategory: 1,
        // 		// 			scategory: 1,
        // 		// 			status: 1,
        // 		// 			offer_status: 1,
        // 		// 			offer_amount: 1,
        // 		// 			price_details: 1,
        // 		// 			quantity: { $ifNull: ["$quantity", 0] },
        // 		// 			sale_price: 1,
        // 		// 			base_price: 1,
        // 		// 			hover_image: 1,
        // 		// 			product_id: 1,
        // 		// 			size_status: 1,
        // 		// 			quantity_size: 1,
        // 		// 			notZero: {
        // 		// 				$filter: {
        // 		// 					input: "$quantity_size",
        // 		// 					as: "item",
        // 		// 					cond: {
        // 		// 						$and: [
        // 		// 							{
        // 		// 								$eq: ["$$item.status", 1]
        // 		// 							},
        // 		// 							{
        // 		// 								$ne: ['$$item.quantity', 0]
        // 		// 							}
        // 		// 						]
        // 		// 					}
        // 		// 				}
        // 		// 			}
        // 		// 		}
        // 		// 	},
        // 		// 	{
        // 		// 		$project: {
        // 		// 			name: 1,
        // 		// 			slug: 1,
        // 		// 			avatar: 1,
        // 		// 			size: 1,
        // 		// 			rcategory: 1,
        // 		// 			scategory: 1,
        // 		// 			status: 1,
        // 		// 			offer_status: 1,
        // 		// 			offer_amount: 1,
        // 		// 			price_details: 1,
        // 		// 			quantity: 1,
        // 		// 			sale_price: 1,
        // 		// 			base_price: 1,
        // 		// 			hover_image: 1,
        // 		// 			product_id: 1,
        // 		// 			size_status: 1,
        // 		// 			quantity_size: 1,
        // 		// 			notZero: 1
        // 		// 		}
        // 		// 	},
        // 		// 	{
        // 		// 		$project: {
        // 		// 			name: 1,
        // 		// 			slug: 1,
        // 		// 			avatar: 1,
        // 		// 			size: 1,
        // 		// 			rcategory: 1,
        // 		// 			scategory: 1,
        // 		// 			status: 1,
        // 		// 			offer_status: 1,
        // 		// 			offer_amount: 1,
        // 		// 			price_details: 1,
        // 		// 			quantity: 1,
        // 		// 			sale_price: 1,
        // 		// 			base_price: 1,
        // 		// 			hover_image: 1,
        // 		// 			product_id: 1,
        // 		// 			size_status: 1,
        // 		// 			quantity_size: 1,
        // 		// 			filterSize: { $ifNull: ['$notZero', []] }
        // 		// 		}
        // 		// 	},
        // 		// 	{
        // 		// 		$project: {
        // 		// 			name: 1,
        // 		// 			slug: 1,
        // 		// 			avatar: 1,
        // 		// 			size: 1,
        // 		// 			rcategory: 1,
        // 		// 			scategory: 1,
        // 		// 			status: 1,
        // 		// 			offer_status: 1,
        // 		// 			offer_amount: 1,
        // 		// 			price_details: 1,
        // 		// 			quantity: 1,
        // 		// 			sale_price: 1,
        // 		// 			base_price: 1,
        // 		// 			hover_image: 1,
        // 		// 			product_id: 1,
        // 		// 			filterSize: 1,
        // 		// 			size_status: 1,
        // 		// 			quantity_size: {
        // 		// 				$filter: {
        // 		// 					input: "$quantity_size",
        // 		// 					as: "item",
        // 		// 					cond: {
        // 		// 						$eq: ["$$item.status", 1]
        // 		// 					}
        // 		// 				}
        // 		// 			},
        // 		// 			in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
        // 		// 			no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
        // 		// 		}
        // 		// 	},
        // 		// 	{ $limit: 24 },
        // 		// 	{ $sort: { createdAt: 1 } }
        // 		// ]
        // 		db.GetAggregation(collection, query, function (err, docdata) {
        // 			if (err || !docdata) {
        // 				return res.send({ status: 0, data: [] })
        // 			} else {
        // 				for (var i = 0; i < docdata.length; i++) {
        // 					docdata[i].currency = settings.settings.currency_symbol;
        // 					docdata[i].favourite = 0;
        // 					if (docdata[i].avatar != undefined) {
        // 						image = settings.settings.site_url + docdata[i].avatar.slice(2);
        // 						docdata[i].avatar = image;
        // 					} else {
        // 						docdata[i].avatar = "";
        // 					}
        // 					if (docdata[i].hover_image != undefined) {
        // 						image = settings.settings.site_url + docdata[i].hover_image.slice(2);
        // 						docdata[i].hover_image = image;
        // 					} else {
        // 						docdata[i].hover_image = "";
        // 					}
        // 					if (docdata[i].offer_status == 1) {
        // 						// docdata[i].base_price = JSON.parse(JSON.stringify(docdata[i].sale_price));
        // 						// var offer_price = parseInt((docdata[i].sale_price * docdata[i].offer_amount)/100)
        // 						// var sub_price = docdata[i].sale_price - offer_price;
        // 						// docdata[i].sale_price = sub_price>0?sub_price: 0;
        // 						docdata[i].offer_base = JSON.parse(JSON.stringify(docdata[i].base_price));
        // 						var offer_price = parseFloat(parseFloat((docdata[i].base_price * docdata[i].offer_amount) / 100).toFixed(2));
        // 						var sub_price = docdata[i].base_price - offer_price;
        // 						docdata[i].offer_sale = sub_price > 0 ? sub_price : 0
        // 					}
        // 				}
        // 				res.send({ status: 1, data: docdata })
        // 			}
        // 		})
        // 	}
        // })
        // if(id.length>0){
        // 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        // 		if (err || !settings) {
        // 			res.send({ "status": "0", "errors": "Configure your app settings" });
        // 		} else {
        // 			var query = [
        // 				{ "$match": {_id: {$in: id},status: 1}},
        // 				{ 
        // 					$project : {
        // 						name: 1,
        // 						slug: 1,
        // 						avatar: 1,
        // 						size: 1,
        // 						rcategory: 1,
        // 						scategory: 1,
        // 						status: 1,
        // 						offer_status: 1,
        // 						offer_amount: 1,
        // 						price_details: 1,
        // 						quantity: 1,
        // 						sale_price: 1,
        // 						base_price: 1,
        // 						hover_image: 1,
        // 					}
        // 				}

        // 			]
        // 			db.GetAggregation('food', query, function (err, docdata) {
        // 				if(err || !docdata){
        // 					return res.send({status: 0, data: []})
        // 				} else{
        // 					for (var i = 0; i < docdata.length; i++) {
        // 						docdata[i].currency = settings.settings.currency_symbol;
        // 						docdata[i].favourite = 0;
        // 						if (docdata[i].avatar != undefined) {
        // 							image = settings.settings.site_url + docdata[i].avatar.slice(2);
        // 							docdata[i].avatar = image;
        // 						} else {
        // 							docdata[i].avatar = "";
        // 						}
        // 						if (docdata[i].hover_image != undefined) {
        // 							image = settings.settings.site_url + docdata[i].hover_image.slice(2);
        // 							docdata[i].hover_image = image;
        // 						} else {
        // 							docdata[i].hover_image = "";
        // 						}
        // 						if(docdata[i].offer_status == 1){
        // 							docdata[i].base_price = JSON.parse(JSON.stringify(docdata[i].sale_price));
        // 							var offer_price = parseInt((docdata[i].sale_price * docdata[i].offer_amount)/100)
        // 							var sub_price = docdata[i].sale_price - offer_price;
        // 							docdata[i].sale_price = sub_price>0?sub_price: 0;
        // 						}
        // 					}
        // 					res.send({status: 1,data: docdata})
        // 				}
        // 			})
        // 		}
        // 	})
        // } else {
        // 	res.send({status: 0,data: []})
        // }
    }

    controller.recent_visit = async (req, res) => {
        // req.checkBody('user_id', 'user_id is required').notEmpty();
        // req.checkBody('product_id', 'product_id is required').notEmpty();
        // req.checkBody('type', 'product_id is required').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        // 	res.send({ status: 0, message: errors[0].msg });
        // 	return;
        // }
        var collection = 'recently_visit';
        if (req.body.type == 'temp_visit') {
            collection = 'recent_temp_visit'
        }
        const doc = await db.GetOneDocument(collection, { user_id: req.body.userId, product_id: req.body.productId }, {}, {})


        // if (doc.status === false) {
        // return res.send({ status: 0, message: "something gone wrong" })
        // } else {
        if (doc.doc != "Data Not found") {
            return res.send({ status: 1, message: "Already added", error: false })
        } else {
            const result = await db.InsertDocument(collection, { user_id: req.body.userId, product_id: new mongoose.Types.ObjectId(req.body.productId) })
            if (!result) {
                return res.send({ status: 0, error: true, message: err.message })
            } else {
                return res.send({
                    status: 1,
                    message: "Added Successfully",
                    error: false
                })
            }
        }
        // }
        // db.GetOneDocument(collection, { user_id: req.body.user_id, product_id: mongoose.Types.ObjectId(req.body.product_id) }, {}, {}, (error, doc) => {
        // 	if (error) {
        // 		return res.send({ status: 0, message: error.message })
        // 	} else {
        // 		if (doc) {
        // 			return res.send({ status: 1, message: "Already added" })
        // 		} else {
        // 			db.InsertDocument(collection, { user_id: req.body.user_id, product_id: mongoose.Types.ObjectId(req.body.product_id) }, (err, result) => {
        // 				if (err) {
        // 					return res.send({ status: 0, message: err.message })
        // 				} else {
        // 					return res.send({ status: 1, message: "Added Successfully" })
        // 				}
        // 			});
        // 		}
        // 	}
        // })
    }






    controller.rewardlist = (req, res) => {
        var errors = [];
        req.checkBody('user', 'User is required').notEmpty();
        req.checkBody('skip', 'skip is required').notEmpty();
        req.checkBody('limit', 'limit is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        let data = {};
        var limit = 10;
        if (req.body.limit && parseInt(req.body.limit) > 0) {
            limit = parseInt(req.body.limit);
        }
        var skip = 0;
        if (req.body.skip && parseInt(req.body.skip) > 0) {
            skip = parseInt(req.body.skip);
        }
        var filter_query = { "user_id": { $eq: mongoose.Types.ObjectId(req.body.user) } };
        var condition = [
            { $match: filter_query },
            {
                $facet: {
                    all: [
                        { "$count": "all" }
                    ],
                    documentData: [
                        { $sort: { 'time': -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                time: 1,
                                status: 1,
                                claimed: 1,
                                reached: 1
                            }
                        }
                    ]
                }
            }
        ];
        db.GetAggregation('rewards', condition, function (err, docdata) {
            data.response = {}
            if (err || !docdata || (docdata && docdata.length == 0)) {
                data.status = 1;
                data.response.total = 0;
                data.response.list = [];
                res.send(data);
            } else {
                var count = 0;
                count = docdata[0].all ? (docdata[0].all[0] ? docdata[0].all[0].all : 0) : 0;
                if (docdata[0].documentData && docdata[0].documentData.length > 0 && count) {
                    data.status = 1;
                    data.response.total = count;
                    data.response.list = docdata[0].documentData;
                    res.send(data);
                } else {
                    data.status = 1;
                    data.response.total = 0;
                    data.response.list = [];
                    res.send(data);
                }
            }
        })
    }

    controller.rewarddetails = (req, res) => {
        var errors = [];
        req.checkBody('user', 'User is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = { status: 0, errors: 'Something went wrong, Try again' };
        if (isObjectId(req.body.user)) {
            db.GetOneDocument('settings', { alias: 'rewards' }, {}, {}, (err, settings) => {
                if (err || !settings || settings.settings === undefined) {
                    res.json(data);
                } else {
                    db.GetOneDocument('users', { _id: req.body.user, status: { $eq: 1 } }, { email: 1, first_name: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1, reached_points: 1, mark_status: 1, current_points: 1, next_points: 1, start_time: 1 }, {}, function (err, userDetails) {
                        if (err || !userDetails) {
                            res.json(data);
                        } else {
                            if (settings.settings.days && settings.settings.days > 0 && userDetails.start_time > 0) {
                                userDetails.start_time = userDetails.start_time + (settings.settings.days * 86400000);
                                if (userDetails.start_time < Date.now()) {
                                    userDetails.start_time = 0;
                                    userDetails.reached_points = 0;
                                    userDetails.mark_status = 0;
                                    userDetails.current_points = 0;
                                    userDetails.next_points = 0;
                                    db.UpdateDocument('users', { _id: req.body.user }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {}, (err, update) => { });
                                }
                            }
                            if (userDetails && typeof userDetails != 'undefined') {
                                res.json({ status: 1, message: '', userDetails: userDetails });
                            } else {
                                res.json(data);
                            }
                        }
                    })
                }
            })
        } else {
            res.json(data);
        }
    }


    controller.productdetails = function (req, res) {
        req.checkBody('product_id', 'product id is Required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": 0,
                "errors": errors[0].msg
            });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": 0, "errors": "Configure your app settings" });
            } else {

                var condition = { '_id': new mongoose.Types.ObjectId(req.body.product_id) };
                var productQuery = [
                    { $match: condition },
                    { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                    { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
                    { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
                    { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            name: 1,
                            avatar: 1,
                            rcat_id: "$rcategory._id",
                            scat_id: "$scategory._id",
                            rcategory: { $toLower: '$rcategory.rcatname' },
                            scategory: { $toLower: '$scategory.scatname' },
                            brandname: { $toLower: '$brands.brandname' },
                            attributes: 1,
                            isRecommeneded: 1,
                            itmcat: 1,
                            status: 1,
                            color: 1,
                            base_price: 1,
                            sale_price: 1,
                            price_details: 1,
                            sort_name: { $toLower: '$name' },
                            substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                            "images": {
                                "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                            }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            substat: 1,
                            images: 1,
                            status: 1,
                            document: "$$ROOT"
                        }
                    }, {
                        $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                    }
                ];
                db.GetAggregation('food', productQuery, function (err, documentData) {
                    if (err) {
                        res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                    } else {
                        if (documentData.length > 0) {
                            var Productdata = documentData[0].documentData[0];
                            Productdata.variants = [];
                            if (Productdata) {
                                var image = settings.settings.site_url + Productdata.avatar.slice(2);
                                Productdata.avatar = image;
                                if (Productdata.price_details.length > 0) {
                                    Productdata.price_details.forEach(val => {
                                        if (val.image != undefined && val.image != '') {
                                            val.image = settings.settings.site_url + val.image.slice(2);
                                        }
                                        if (val.attributes && val.attributes.length > 0) {
                                            for (var i = 0; i < val.attributes.length; i++) {
                                                var variant = { values: [] };
                                                if (Productdata.variants && Productdata.variants.length > 0) {

                                                    var n = 0;
                                                    for (var j = 0; j < Productdata.variants.length; j++) {
                                                        if (Productdata.variants[j].parrent_id === val.attributes[i].parrent_id) {
                                                            var m = 0;
                                                            for (var k = 0; k < Productdata.variants[j].values.length; k++) {
                                                                if (Productdata.variants[j].values[k].chaild_id != val.attributes[i].chaild_id) {
                                                                    m++;
                                                                }
                                                            }
                                                            if (m === Productdata.variants[j].values.length) {
                                                                Productdata.variants[j].values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name });
                                                                //break;
                                                            }
                                                        } else {
                                                            n++;
                                                        }
                                                    }
                                                    if (n === Productdata.variants.length) {
                                                        variant.parrent_id = val.attributes[i].parrent_id;
                                                        variant.attri_name = val.attributes[i].attri_name;
                                                        variant.values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, });
                                                        Productdata.variants.push(variant);
                                                    }

                                                } else {
                                                    variant.parrent_id = val.attributes[i].parrent_id;
                                                    variant.attri_name = val.attributes[i].attri_name;
                                                    variant.values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, });
                                                    Productdata.variants.push(variant);
                                                    //break;
                                                }

                                            }
                                        }
                                    });
                                }
                                res.send({ "status": 1, "message": 'Successfull.', data: Productdata });

                            } else {
                                res.send({ "status": 0, "message": 'Sorry, product details not available.' });
                            }
                        } else {
                            res.send({ "status": 0, "message": 'Product data not found.' });
                        }
                    }
                });
            }
        })
    };

    controller.getProductsFromBanner = async (req, res) => {
        try {
            const { category_id, userId } = req.body;
            if (userId) {
                let query = [
                    {
                        $match: { rcategory: new mongoose.Types.ObjectId(category_id), status: 1 }
                    },
                    { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                    { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "favourite",
                            let: { product_id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$user_id", new mongoose.Types.ObjectId(userId)] },
                                                { $eq: ["$product_id", "$$product_id"] },
                                                { $eq: ["$status", 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "favourite"
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            image: "$avatar",
                            rcat_id: "$rcategory._id",
                            scat_id: "$scategory._id",
                            description: "$information",
                            category_id: "$rcategory._id",
                            category_name: { $toLower: '$rcategory.rcatname' },
                            scategory: { $toLower: '$scategory.scatname' },
                            brandname: { $toLower: '$brands.brandname' },
                            ratting: { $toLower: '$brands.brandname' },
                            tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
                            attributes: 1,
                            isRecommeneded: 1,
                            is_favourite: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                            itmcat: 1,
                            slug: 1,
                            product_details: 1,
                            visibility: "$status",
                            min_max_price: {
                                "min_price": "$base_price", "max_price": "$sale_price", "discount_percentage": {
                                    $multiply: [
                                        { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                        100
                                    ]
                                }
                            },
                            sale_discount: { $subtract: ['$base_price', '$sale_price'] },
                            status: 1,
                            color: 1,
                            base_price: 1,
                            sale_price: 1,
                            sale_price: 1,
                            variant: "$price_details",
                            price_details: 1,
                            quantity: 1,
                            offer_status: 1,
                            offer_amount: 1,
                            sort_name: { $toLower: '$name' },
                            substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                            images: 1,
                            size_status: 1,
                            rating: 1,
                            total_rating: 1,
                            total_rating_users: 1,
                        }
                    },
                ]
                const products = await db.GetAggregation('food', query)
                if (products.length > 0) {
                    return res.send({ error: false, data: products })
                }
                else {
                    return res.send({ error: true, data: [] })
                }
            } else {
                let query = [
                    {
                        $match: { rcategory: new mongoose.Types.ObjectId(category_id), status: 1 }
                    },
                    { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                    { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "favourite",
                            let: { product_id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$user_id", new mongoose.Types.ObjectId(userId)] },
                                                { $eq: ["$product_id", "$$product_id"] },
                                                { $eq: ["$status", 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "favourite"
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            image: "$avatar",
                            rcat_id: "$rcategory._id",
                            scat_id: "$scategory._id",
                            description: "$information",
                            category_id: "$rcategory._id",
                            category_name: { $toLower: '$rcategory.rcatname' },
                            scategory: { $toLower: '$scategory.scatname' },
                            brandname: { $toLower: '$brands.brandname' },
                            ratting: { $toLower: '$brands.brandname' },
                            tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
                            attributes: 1,
                            isRecommeneded: 1,
                            is_favourite: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                            itmcat: 1,
                            slug: 1,
                            product_details: 1,
                            visibility: "$status",
                            min_max_price: {
                                "min_price": "$base_price", "max_price": "$sale_price", "discount_percentage": {
                                    $multiply: [
                                        { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                        100
                                    ]
                                }
                            },
                            sale_discount: { $subtract: ['$base_price', '$sale_price'] },
                            status: 1,
                            color: 1,
                            base_price: 1,
                            sale_price: 1,
                            sale_price: 1,
                            variant: "$price_details",
                            price_details: 1,
                            quantity: 1,
                            offer_status: 1,
                            offer_amount: 1,
                            sort_name: { $toLower: '$name' },
                            substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                            images: 1,
                            size_status: 1,
                            rating: 1,
                            total_rating: 1,
                            total_rating_users: 1,
                        }
                    },
                ]
                const products = await db.GetAggregation('food', query)
                if (products.length > 0) {
                    return res.send({ error: false, data: products })
                } else {
                    return res.send({ error: true, data: [] });
                }
            }
        } catch (error) {
            console.log(error);
            return res.status(500).send({ error: true, message: 'There is something went wrong in this API' })
        }
    }

    controller.getSliderImages = async function (req, res) {
        var data = {};
        const count = await db.GetCount('webbanners', { 'status': { $eq: 1 } })
        if (count < 1) {
            data.status = 1;
            data.message = 'success';
            data.bannerlist = [];
            res.send(data);
        } else {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            const siteUrl = settings ? settings.doc.settings.site_url : '';
            console.log(siteUrl, 'this is site url');
            if (settings.status === false) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                var eachrun = 30;
                var loop = Math.ceil(count / eachrun);
                var loopcount = 1;
                var banners = [];
                const getBannerList = async () => {
                    try {
                        while (loopcount <= loop) {
                            const limit = eachrun;
                            const skip = (eachrun * loopcount) - eachrun;

                            const query = [
                                { $match: { 'status': { $eq: 1 } } },
                                { $sort: { img: 1, bannername: 1 } },
                                { $skip: skip },
                                { $limit: limit },
                                { "$lookup": { from: "rcategory", localField: "category", foreignField: "rcatname", as: "cat" } },
                                { $unwind: '$cat' },
                                {
                                    $project: {
                                        name: "$bannername",
                                        image: "$img",
                                        description: 1,
                                        status: 1,
                                        category_id: '$cat._id',
                                        category: 1
                                    }
                                }
                            ];

                            const bannerlist = await db.GetAggregation('webbanners', query);
                            if (bannerlist && bannerlist.length > 0) {
                                bannerlist.forEach(banner => {
                                    banner.children = [];
                                    banner.row_order = '';
                                    banner.parent_id = "";
                                    if (banner.image !== undefined) {
                                        banner.image = settings.doc.settings.site_url + banner.image.slice(2);
                                    } else {
                                        banner.image = "";
                                    }
                                });
                                banners = [...banners, ...bannerlist];
                            }

                            loopcount++;
                        }

                        const data = {
                            status: 1,
                            error: false,
                            message: 'success',
                            data: banners
                        };

                        res.send(data);

                    } catch (error) {
                        res.status(500).send('Internal Server Error');
                    }
                };
                getBannerList();

            }
        }
    }

    controller.getOfferImages = async function (req, res) {
        try {
            let data = {}
            data.error = false;
            data.slider_images = [
                {
                    id: "",
                    style: "",
                    offer_ids: "",
                    row_order: "",
                    date_added: "",
                    offerImages: []
                }
            ]
            res.send(data)
        } catch (err) {
            res.send(err)
        }
    }
    controller.getFaqs = async function (req, res) {
        try {
            let data = {}
            data.error = false;
            data.message = "FAQ(s) Retrieved Successfully";
            data.total = "";
            data.data = [
                {
                    id: "",
                    question: "",
                    answer: "",
                    status: 1
                }
            ]
            res.send(data);
        } catch (error) {
            res.send(error);
        }
    }

    controller.validatePromocode = async function (req, res) {
        try {
            const promo_code = req.body.promo_code;
            const user_id = req.body.user_id;
            const final_total = req.body.final_total;
            let data = {}
            data.error = false;
            data.message = '';
            data.data = {
                "final_total": ''
            }
            res.send(data)
        } catch (error) {
            res.send(error)
        }
    }

    controller.getPromoCode = async function (req, res) {
        const user_id = req.body.user_id;
        try {
            let data = {}
            data.error = false;
            data.message = "Promocodes retrived Successfully !";
            data.total = '';
            data.offset = 0;
            data.promo_codes = [
                {
                    "id": "",
                    "promo_code": "",
                    "message": "",
                    "start_date": "",
                    "end_date": "",
                    "discount": "",
                    "repeat_usage": "",
                    "min_order_amt": "",
                    "no_of_users": "",
                    "discount_type": "",
                    "max_discount_amt": "",
                    "image": "",
                    "no_of_repeat_usage": "",
                    "status": "",
                    "is_cashback": "",
                    "list_promocode": "",
                    "remaining_days": null,
                    "is_specific_users": "",
                    "users_id": ""
                }
            ]
            res.send(data)
        } catch (error) {
            res.send(error)
        }
    }
    controller.addProductFaqs = async function (req, res) {
        const question = req.body.question;
        const user_id = req.body.user_id;
        const product_id = req.body.product_id
        try {
            let data = {}
            data.error = false;
            data.message = "FAQS added Successfully"
            data.data = []
            res.send(data)
        } catch (error) {
            res.send(error)
        }
    }
    controller.validateRefferCode = async function (req, res) {
        const data = req.body.refferal_code
        try {
            let data = {};
            data.message = "Referral Code is available to be used";
            data.error = false;
            res.send(data)
        } catch (error) {
            res.send(error)
        }
    }

    controller.sendBankTransferProof = async function (req, res) {
        try {
            const order_id = req.body.order_id;
            let data = {};
            data.error = false;
            data.message = 'Bank Transfer Proof Added Successfully';
            data.data = null;
        } catch (error) {

        }
    }


    controller.getFlashSale = async (req, res) => {
        try {
            let data = {};
            data.error = false;
            data.message = "Flash sale retrieved successfully";
            data.total = '';
            data.data = [
                {
                    "_id": "",
                    "attributes": [],
                    "product_details": [
                        {
                            "title": "",
                            "content": ""
                        },

                    ],
                    "images": [

                    ],
                    "offer_status": 0,
                    "offer_amount": null,
                    "name": "",
                    "slug": "   ",
                    "base_price": 0,
                    "sale_price": 0,
                    "information": "",
                    "avatar": "",
                    "hover_image": "",
                    "price_details": [],
                    "size_status": 0,
                    "quantity": 0,
                    "filterSize": [],
                    "rcatname": "",
                    "scatname": "",
                    "quantity_size": null,
                    "sort_name": "",
                    "in_size": 0,
                    "no_size": 0,
                    "variants": [],
                    "multiImage": [
                        "http://localhost:2023/uploads/images/food/1687766295956.png",
                    ],
                    "currency": ""
                }
            ]
            res.send(data)
        } catch (error) {

        }
    }

    controller.updateFcm = async (req, res) => {
        try {
            const fcm_id = req.body.fcm_id;
            let data = {};
            data.error = false;
            data.message = "Updated Successfully";
            data.data = []
            res.send(data)
        } catch (error) {

        }
    }

    controller.getAllCategory = async (req, res) => {
        var responseData = {};
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        const siteUrl = settings ? settings.doc.settings.site_url : '';
        const limit = req.body.limit;
        if (settings.status === false) {
            res.send({ "status": 0, "errors": "Configure your app settings" });
        } else {
            if (req.body.id) {
                var mainCategory = await db.GetOneDocument('rcategory', { '_id': req.body.id }, {}, {})
                if (mainCategory.status == false) {
                    mainCategory = await db.GetOneDocument('scategory', { '_id': req.body.id }, {}, {})
                }
                console.log(mainCategory, 'this is main category');
                const datas = await db.GetDocument('scategory', { 'status': { $eq: 1 } }, {}, {})
                const data = datas.doc
                let responseResult = buildTree(data, mainCategory.doc._id.valueOf(), limit)
                console.log(JSON.stringify(responseResult, null, 2));
                function buildTree(data, parent, limit, currentLevel = 0) {
                    if (currentLevel > limit) {
                        return [];
                    }

                    let tree = [];
                    for (let item of data) {
                        if (item.rcategory == parent) {
                            let children = buildTree(data, item._id.valueOf(), limit, currentLevel + 1);
                            let newItem = {
                                _id: item._doc._id,
                                scatname: item._doc.scatname,
                                img: siteUrl + item._doc.img.slice(2), // Concatenate siteUrl with img
                                rcategory: item._doc.rcategory,
                                status: item._doc.status,
                                createdAt: item._doc.createdAt,
                                updatedAt: item._doc.updatedAt,
                                slug: item._doc.slug
                            };

                            if (children.length) {
                                newItem.children = children;
                            }

                            tree.push(newItem);
                        }
                    }
                    return tree;
                }
                let mainCategoryData = {
                    _id: mainCategory.doc._id,
                    scatname: mainCategory.doc.scatname,
                    img: mainCategory.doc.img,
                    rcategory: mainCategory.doc.rcategory,
                    status: mainCategory.doc.status,
                    createdAt: mainCategory.doc.createdAt,
                    updatedAt: mainCategory.doc.updatedAt,
                    slug: mainCategory.doc.slug
                };
                mainCategoryData.img = siteUrl + mainCategoryData.img.slice(2);
                mainCategoryData.children = responseResult;
                console.log(mainCategoryData, 'this is main category data');
                console.log(mainCategory);
                responseData.message = "Category retrieved successfully";
                responseData.error = false;
                responseData.data = mainCategoryData
                responseData.text = '';
                responseData.state = {};
                responseData.icon = '';
                responseData.level = 0;
                res.send(responseData);
            } else {
                const rcatdata = await db.GetDocument('rcategory', { 'status': { $eq: 1 } }, {}, {})
                const scatdata = await db.GetDocument('scategory', { 'status': { $eq: 1 } }, {}, {})
                if (rcatdata.false === false) {
                    responseData.status = 0;
                    responseData.message = 'error';
                    responseData.categoryList = [];
                    res.send(responseData);
                }
                function buildTree(data, parent, limit, currentLevel = 0) {
                    if (currentLevel > limit) {
                        return [];
                    }



                    let tree = [];
                    for (let item of data) {
                        if (item.rcategory == parent) {
                            let children = buildTree(scatdata.doc, item._id.valueOf(), limit, currentLevel + 1);
                            let newItem = {
                                _id: item._doc._id,
                                scatname: item._doc.scatname,
                                img: siteUrl + item._doc.img.slice(2),
                                rcategory: item._doc.rcategory,
                                status: item._doc.status,
                                createdAt: item._doc.createdAt,
                                updatedAt: item._doc.updatedAt,
                                slug: item._doc.slug,
                                category: rcatdata.rcatname

                            };

                            if (children.length) {
                                newItem.children = children;
                            }

                            tree.push(newItem);
                        }
                    }
                    return tree;
                }

                let responseResult = buildTree(rcatdata.doc, parent = null, limit);


                const rcatdataCount = await db.GetCount('rcategory', { 'status': { $eq: 1 } })
                const scatdataCount = await db.GetCount('scategory', { 'status': { $eq: 1 } })
                const featureRcategory = await db.GetDocument('rcategory', { 'status': { $eq: 1 }, 'feature': 2 }, {}, {})
                const featureScategory = await db.GetDocument('rcategory', { 'status': { $eq: 1 }, 'feature': 2 }, {}, {})
                const featureCategories = [...featureRcategory.doc, ...featureScategory.doc]
                let responseFeatureCategory = buildTree(featureCategories, parent = null)
                const total = rcatdataCount + scatdataCount
                responseData.total = total;
                responseData.error = false;
                responseData.data = responseResult;
                var Array = JSON.parse(JSON.stringify(rcatdata.doc))
                // Array.forEach(prduct => {
                // 	prduct.img = settings.doc.settings.site_url + prduct.img.slice(2);
                // })
                Array.forEach(product => {
                    product.img = siteUrl + product.img.slice(2);
                });
                responseData.status = 1;
                responseData.message = 'Category retrieved successfully';
                responseData.text = '';
                responseData.state = {};
                responseData.icon = '';
                responseData.level = '';
                responseData.feature_categories = responseFeatureCategory
                responseData.categoryList = Array;
                res.send(responseData);
            }
        }
    }
    controller.saveprofile = async (req, res) => {
        var update_profile_data = {
            'first_name': req.body.first_name,
            'last_name': req.body.last_name,
            'email': req.body.email,
            'phone': {
                'code': req.body.phone.code,
                'number': req.body.phone.number
            },
            'gender': req.body.gender
            // avatar: req.body.avatar,
        }
        var data = {}
        let update_id = req.body.user_id
        if (req.files) {

            console.log(req.files)
            // update_profile_data.img_name = encodeURI(req.files.avatar[0].filename);
            update_profile_data.img_path = 'uploads/images/users';
            update_profile_data.avatar = updatadata.img_path + '/' + updatadata.img_name;
            Jimp.read(req.files.avatar[0].path).then(function (lenna) {
                lenna.resize(100, 100)            // resize
                    .quality(60)                 // set JPEG quality
                    .write('./uploads/images/users/thumb/' + req.files.avatar[0].filename); // save
            }).catch(function (err) {

            });
        }

        if (update_id || update_id != null || update_id != undefined || update_id != '') {
            const phone_number = await db.GetOneDocument('users', { "phone.number": req.body.phone.number, "_id": { $ne: new mongoose.Types.ObjectId(req.body.user_id) } }, {}, {})
            const email = await db.GetOneDocument('users', { "email": req.body.email, "_id": { $ne: new mongoose.Types.ObjectId(req.body.user_id) } }, {}, {})


            if (phone_number && phone_number.status == true) {
                console.log(phone_number)
                data.status = false
                data.messagee = "Mobile Number  already exists"
                res.send(data)
            } else {
                if (email && email.status == true) {
                    data.status = false
                    data.messagee = "Email already exists"
                    res.send(data)
                } else {
                    const updated_profile_data = await db.UpdateDocument('users', { _id: req.body.user_id }, update_profile_data, {});

                    if (!updated_profile_data) {

                        data.status = false
                        data.messagee = "Some thing went wrong"
                        res.send(data)
                    } else {
                        if (updated_profile_data && updated_profile_data.doc && updated_profile_data.doc.modifiedCount > 0) {
                            data.status = true
                            data.messagee = "Your Profile Updated Successfully"
                            res.send(data)
                        } else {
                            data.status = false
                            data.messagee = "Some thing went wrong"
                            res.send(data)
                        }





                    }

                }
            }
        } else {
            data.status = false
            data.messagee = "Some thing went wrong"
            res.send(data)
        }








    }


	controller.productListAll = async (req, res) => {
		const { category, user_id, variant_filter, price_filter, rating_filter, sort_filter, mainCat, search } = req.body;
		
		console.log(req.body,"1111111111111111111111111111111111111111111111111111111111");
		try {
			let skip = req.body.skip ? parseInt(req.body.skip) : 0;
			let limit = req.body.limit ? parseInt(req.body.limit) : 20;
			let condition = { status: 1 };
			let sort = { createdAt: -1 };
			if (search) {
				condition["name"] = { $regex: search, $options: "i" }
				// condition["name"] = { $regex: search, $options: "i" }
			}
			if (category) {
				// let mainCat;
				// let subCat = [];
				// let category_list
				// category.map((x, i) => {
				// 	if (i === 0) {
				// 		mainCat = new mongoose.Types.ObjectId(x);
				// 	} else {
				// 		subCat.push(new mongoose.Types.ObjectId(x))
				// 	}
				// });
				// if (mainCat && subCat && Array.isArray(subCat) && subCat.length > 0) {
				// 	condition["$or"] = [
				// 		{
				// 			child_cat_array: { $in: [mainCat, ...subCat] }
				// 		},
				// 		{
				// 			rcategory: mainCat, child_cat_array: { $in: subCat }
				// 		}
				// 	];
				// } else if (mainCat) {
				// 	condition["$or"] = [
				// 		{
				// 			child_cat_array: { $all: [mainCat] }
				// 		},
				// 		{
				// 			rcategory: mainCat
				// 		}
				// 	];
				// }
				let cond_cat = [];
				let cat_list = Object.entries(category);
				for (let index = 0; index < cat_list.length; index++) {
					console.log(cat_list[index][1],"cat_list[index][1]cat_list[index][1]cat_list[index][1]cat_list[index][1]");
					if (cat_list[index][1] && Array.isArray(cat_list[index][1]) && cat_list[index][1].length > 0) {
						cond_cat.push(
							{
								child_cat_array: { $in: cat_list[index][1].map(x => new mongoose.Types.ObjectId(x))  }
								
							}
						)
					
					}
				}
				if (cond_cat && Array.isArray(cond_cat) && cond_cat.length > 0) {
					condition["$or"] = cond_cat;
				} else if (mainCat) {
					if (!mongoose.isValidObjectId(mainCat)) {
						return res.status(400).send({ status: false, message: "Inavid category id! Please check and try again" });
					}
					console.log(mainCat,"mainCatmainCatmainCatmainCat");
					condition["$or"] = [
						{ rcategory: new mongoose.Types.ObjectId(mainCat) },
						{ child_cat_array: new mongoose.Types.ObjectId(mainCat) }
					]
				};
			};
			if (variant_filter && Array.isArray(variant_filter) && variant_filter.length > 0) {
				condition.attributes = { $in: variant_filter.map(x => new mongoose.Types.ObjectId(x)) };
			};
			if (price_filter && Array.isArray(price_filter) && price_filter.length > 0) {
				let cond_price = [];
				price_filter.map(price => {
					let split_val = price.split(":");
					let min = parseInt(split_val[0]), max = parseInt(split_val[1]);
					cond_price.push(
						{
							sale_price: { $gte: min, $lte: max }
						}
					)
				});
				if (condition["$or"]) {
					condition["$and"] = [
						{
							$or: [...condition["$or"]]
						}, {
							$or: cond_price
						}
					];
					delete condition["$or"]
				} else {
					condition["$or"] = cond_price;
				}
			};
			if (rating_filter) {
				condition.rating = { $gte: parseInt(rating_filter) }
			};
			if (sort_filter) {
				switch (sort_filter) {
					case "latest":
						sort = { createdAt: -1 };
						break;
					case "lowtohigh":
						sort = { sale_price: 1 };
						break;
					case "hightolow":
						sort = { sale_price: -1 };
						break;
					case "ratlowtohigh":
						sort = { rating: -1 };
						break;
					case "rathightolow":
						sort = { rating: -1 };
						break;
					default:
						break;
				}
			}
			let favourite_list = []
			if (user_id) {
				if (!mongoose.isValidObjectId(user_id)) {
					return res.status(400).send({ status: 0, message: "Invalid user id! Please check and try again" });
				}
				let fav_list = await db.GetDocument("favourite", { user_id: new mongoose.Types.ObjectId(user_id), status: 1 }, { product_id: 1 }, {});
				favourite_list = fav_list.doc.map(x => x.product_id);
				console.log(favourite_list,'favourite_list');
			};
			let query = [
				{
					$match: condition
				}, {
					$sort: sort
				}, {
					$skip: skip
				}, {
					$limit: limit
				},
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						avatar: 1,
						rcat_id: "$rcategory",
						scat_id: "$scategory",
						rcategory: { $toLower: '$rcategory.rcatname' },
						scategory: { $toLower: '$scategory.scatname' },
						// brandname: { $toLower: '$brands.brandname' },
						isRecommeneded: 1,
						itmcat: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: { $ifNull: ["$quantity", 0] },
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						createdAt: 1,
						size_status: 1,
						quantity_size: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						sort_name: { $toLower: '$name' },
						substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
						"images": {
							"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
						},
						notZero: {
							$filter: {
								input: "$quantity_size",
								as: "item",
								cond: {
									$and: [
										{
											$eq: [
												"$$item.status",
												1
											]
										},
										{
											$ne: ['$$item.quantity', 0]
										}
									]
								}
							}
						},
						offer_base: "$base_price",
						offer_sale: {
							$divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
							]
						}
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						avatar: 1,
						rcat_id: 1,
						scat_id: 1,
						rcategory: 1,
						scategory: 1,
						// brandname: { $toLower: '$brands.brandname' },
						isRecommeneded: 1,
						itmcat: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						createdAt: 1,
						size_status: 1,
						quantity_size: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						sort_name: { $toLower: '$name' },
						substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
						"images": {
							"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
						},
						notZero: 1,
						offer_sale: { $subtract: ["$base_price", "$offer_sale"] },
						offer_base: 1
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						avatar: 1,
						rcat_id: 1,
						scat_id: 1,
						rcategory: 1,
						scategory: 1,
						// brandname: { $toLower: '$brands.brandname' },
						isRecommeneded: 1,
						itmcat: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						createdAt: 1,
						size_status: 1,
						quantity_size: 1,
						sort_name: 1,
						substat: 1,
						"images": 1,
						filterSize: { $ifNull: ['$notZero', []] },
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						offer_base: 1,
						offer_sale: 1,
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						avatar: 1,
						rcat_id: 1,
						scat_id: 1,
						rcategory: 1,
						scategory: 1,
						// brandname: 1,
						isRecommeneded: 1,
						itmcat: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						createdAt: 1,
						sort_name: 1,
						filterSize: 1,
						substat: 1,
						"images": 1,
						size_status: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						discount_percentage: {
							$round: [
								{
									$multiply: [
										{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
										100
									]
								}
							]
						},
						quantity_size: {
							$filter: {
								input: "$quantity_size",
								as: "item",
								cond: {
									$eq: ["$$item.status", 1]
								}
							}
						},
						in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
						no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
						offer_base: 1,
						offer_sale: 1,
						favourite: { $cond: { if: { $in: ["$_id", favourite_list] }, then: true, else: false } }
					}
				},
			];
			console.log("*********************************************************************************************")
			// console.log(JSON.stringify(query))

			let responseList = await  db.GetAggregation("food", query);

			console.log(responseList,"responseListresponseListresponseList");
			let responseCount = db.GetCount("food", condition);

			Promise.all([responseList, responseCount]).then(([list, count]) => {
				return res.status(200).send({ status: 1, message: "Product list found", response: { list: list, count: count } });
			}).catch(error => {
				return res.status(500).send({ status: 0, message: "Something went wrong! Please try again", error: error });
			})
		} catch (error) {
			return res.status(500).send({ status: 0, message: "Product not found", error: error });
		}
	};




    return controller;
}





