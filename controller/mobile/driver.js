//"use strict";

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
    var otp = require('otplib');
    otp.options = { crypto };
    var Jimp = require("jimp");
    var moment = require("moment");
    var CONFIG = require('../../config/config');
    var push = require('../../model/pushNotification.js')(io);
    var mailcontent = require('../../model/mailcontent.js');
    var timezone = require('moment-timezone');
    var stripe = require('stripe')('');
    var paypal = require('paypal-rest-sdk');
    var each = require('sync-each');
    var EventEmitter = require('events').EventEmitter;
    var events = new EventEmitter();
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }

    controller.OtpSubmitVerify = function (req, res) {
        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        req.checkBody('country_code', 'country_code is required').notEmpty();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm id is required').optional();
        req.checkBody('loginId', 'login Id is required').optional();

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
        newdata.loginId = Date.now();
        if (typeof req.body.loginId != 'undefined') {
            newdata.loginId = req.body.loginId;
        }

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
            if (err) {
                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
            } else {
                db.GetOneDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, driverData) {
                    if (err) {
                        res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                    } else {
                        if (driverData && typeof driverData._id != 'undefined') {
                            if (driverData.status == 1 || driverData.status == 3) {
                                var updateData = {};
                                if (newdata.token) {
                                    updateData = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': newdata.token, 'activity.last_login': new Date(), 'loginId': newdata.loginId, 'logout': 0 };
                                } else {
                                    updateData = { 'device_info.device_type': 'android', 'device_info.gcm': newdata.gcm, 'device_info.device_token': '', 'activity.last_login': new Date(), 'loginId': newdata.loginId, 'logout': 0 };
                                }
                                db.UpdateDocument('drivers', { "phone.number": newdata.phone_number, "phone.code": newdata.country_code }, updateData, {}, function (err, response) {
                                    if (err || response.nModified == 0) {
                                        res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                                    } else {
                                        var data = { driver_Data: {} };
                                        data.driver_Data.driver_image = driverData.driver_image;
                                        data.driver_Data.driver_id = driverData._id;
                                        data.driver_Data.driver_name = driverData.username;
                                        data.driver_Data.email = driverData.email;
                                        data.driver_Data.message = "You are Logged In successfully";
                                        data.driver_Data.currency_code = generalSettings.settings.code;
                                        data.driver_Data.currency_symbol = generalSettings.settings.currency_symbol;
                                        data.driver_Data.referal_code = driverData.unique_code || "";
                                        data.driver_Data.refered_code = '';
                                        data.driver_Data.location_name = driverData.address.city || "";
                                        data.driver_Data.country_code = driverData.phone.code;
                                        data.driver_Data.phone_number = driverData.phone.number;
                                        data.driver_Data.driver_status = driverData.status;
                                        data.driver_Data.loginId = newdata.loginId;
                                        res.send({
                                            "status": 1,
                                            "message": "Login successfully",
                                            "data": data
                                        });
                                    }
                                })
                            } else if (driverData.status == 0) {
                                res.send({ "status": 0, "errors": 'Your account is currently unavailable' });
                            } else {
                                res.send({ "status": 0, "errors": 'Your account is inactive... Please contact administrator for further details' });
                            }
                        } else {
                            var data = { driver_Data: {} };
                            data.driver_Data = {};
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
    
    controller.jobStatus = function (req, res) {
        req.checkBody('driver_id', 'driver_id is required').notEmpty();
        req.checkBody('job', 'job is required').optional();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        var data = {};
        data.driver_id = req.body.driver_id;
        data.job = req.body.job || 0;
        db.UpdateDocument('drivers', { '_id': data.driver_id }, { 'currentJob': data.job }, {}, function (err, responseuser) {
            db.GetOneDocument('drivers', { "_id": data.driver_id }, {}, {}, function (err, userdocs) {
                if (err || !userdocs) {
                    res.send({ "status": "0", "errors": "Invalid user id..!!" });
                } else {
                    res.send({
                        status: '1',
                        user_name: userdocs.username,
                        curentjob: userdocs.currentJob,
                        curentstatus: userdocs.currentStatus,
                        location: userdocs.location

                    })
                }
            });
        });
    }


    controller.getCity = (req, res) => {
        var data = {};
        var cities = [];
        db.GetDocument('city', { 'status': { $eq: 1 } }, { "cityname": 1 }, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send({
                    "status": "0",
                    "errors": "No cities found"
                });
            } else {
                db.GetDocument('vehicles', { 'status': { $eq: 1 } }, { "vehicle_name": 1 }, {}, function (err, vehidata) {
                    if (err || !docdata) {
                        res.send({
                            "status": "0",
                            "errors": "No cities found"
                        });
                    } else {
                        for (i in docdata) {
                            if (docdata[i]) {
                                //if (docdata[i].driver_fare) {
                                cities.push(docdata[i])
                            }
                        }
                        data.status = '1';
                        data.response = {};
                        data.response.cityList = cities;
                        data.response.vehicleList = vehidata;
                        res.send(data);

                    }
                });
            }
        });
    };

    controller.SignUp = (req, res) => {
        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('first_name', 'first_name is required').notEmpty();
        // req.checkBody('last_name', 'last_name is required').notEmpty();
        req.checkBody('email', 'email is required').isEmail();
        req.checkBody('password', 'password is required').optional();
        req.checkBody('country_code', 'country_code  is required').notEmpty();
        req.checkBody('city', 'city  is required').notEmpty();
        req.checkBody('lat', 'lat  is required').notEmpty();
        req.checkBody('long', 'long  is required').notEmpty();
        req.checkBody('vehicle_type', 'vehicle_type  is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('Profile_pic', 'Profile_pic is required').optional();
        req.checkBody('gcm_id', 'gcm_id id is required').optional();

        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        req.sanitizeBody('first_name').trim();
        // req.sanitizeBody('last_name').trim();
        req.sanitizeBody('email').trim();
        req.sanitizeBody('password').trim();
        req.sanitizeBody('city').trim();
        req.sanitizeBody('vehicle_type').trim();
        req.sanitizeBody('lat').trim();
        req.sanitizeBody('long').trim();
        req.sanitizeBody('country_code').trim();
        req.sanitizeBody('phone_number').trim();
        req.sanitizeBody('deviceToken').trim();
        req.sanitizeBody('Profile_pic').trim();
        req.sanitizeBody('gcm_id').trim();

        var request = {};
        data.email = req.body.email;
        data.password = req.body.password;
        data.username = req.body.first_name || "";
        // data.last_name = req.body.last_name || "";
        data.country_code = req.body.country_code;
        data.city = req.body.city;
        data.lat = req.body.lat;
        data.long = req.body.long;
        data.currentJob = 0;
        data.currentStatus = 0;
        data.logout = 0;
        data.vehicle_type = req.body.vehicle_type;
        data.loginId = Date.now();
        if (typeof req.body.loginId != 'undefined') {
            data.loginId = req.body.loginId;
        }
        data.phone_number = req.body.phone_number;
        //data.unique_code = req.body.referal_code;
        data.deviceToken = req.body.deviceToken;
        data.gcm_id = req.body.gcm_id;
        data.role = 'user';
        data.status = '3';
        data.avatar = "";
        if (req.files && typeof req.files != "undefined" && req.files != "undefined" && req.files != "" && req.files != null) {
            data.img_name = encodeURI(req.files[0].filename);
            data.img_path = 'uploads/images/users';
            data.avatar = data.img_path + '/' + data.img_name;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {
                db.GetDocument('drivers', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
                    if (err) {
                        res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
                    }
                    else {
                        if (phonedocs.length != 0) {
                            res.send({ "status": "2", "message": "mobile number exist" });
                        }
                        else {
                            var newdata = { phone: {} };
                            newdata.username = data.username;
                            // newdata.last_name = data.last_name;
                            newdata.main_city = data.city;
                            newdata.category = data.vehicle_type;
                            newdata.unique_code = library.randomString(8, '#A');
                            newdata.role = 'driver';
                            newdata.email = data.email;
                            if (req.body.password) {
                                newdata.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
                            }
                            newdata.status = 3;
                            newdata.location = {};
                            newdata.currentJob = 0;
                            newdata.phone.code = data.country_code;
                            newdata.loginId = data.loginId;
                            newdata.avatar = data.avatar;
                            newdata.phone.number = data.phone_number;
                            newdata.location.lng = parseFloat(data.long);
                            newdata.location.lat = parseFloat(data.lat);
                            newdata.currentStatus = 0;
                            db.InsertDocument('drivers', newdata, function (err, response) {
                                if (err) {
                                    res.send({ "status": "0", "errors": "Sorry Email Exist..!" });
                                }
                                else {
                                    if (data.deviceToken) {
                                        var driver_image = '';
                                        if (response.avatar) {
                                            var imagedriver = response.avatar.split('./');
                                            if (imagedriver[0] == '') {
                                                driver_image = settings.settings.site_url + imagedriver[1];
                                            } else {
                                                driver_image = settings.settings.site_url + response.avatar;
                                            }
                                        } else {
                                            driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                        }
                                        db.UpdateDocument('drivers', { '_id': response._id }, { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }, {}, function (err, responseuser) {
                                            if (err || responseuser.nModified == 0) {
                                                res.send({ "status": 0, "errors": "Sorry error in signup..!" });
                                            }
                                            else {
                                                res.send({
                                                    "status": '1',
                                                    "message": 'Successfully registered',
                                                    "driver_id": response._id,
                                                    "user_name": response.username,
                                                    "email": response.email,
                                                    "driver_image": driver_image,
                                                    "loginId": response.loginId,
                                                    "country_code": response.phone.code,
                                                    "phone_number": response.phone.number
                                                });

                                                db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                    mailData1 = {};
                                                    mailData1.template = 'driver_signupto_admin';
                                                    mailData1.to = admin.email;
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
                                                mailData.to = response.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'name', value: response.username || "" });
                                                mailcontent.sendmail(mailData, function (err, response) {
                                                });
                                            }
                                        })
                                    }
                                    else {
                                        var driver_image = '';
                                        if (response.avatar) {
                                            var imagedriver = response.avatar.split('./');
                                            if (imagedriver[0] == '') {
                                                driver_image = settings.settings.site_url + imagedriver[1];
                                            } else {
                                                driver_image = settings.settings.site_url + response.avatar;
                                            }
                                        } else {
                                            driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                        }
                                        db.UpdateDocument('drivers', { '_id': response._id }, { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm_id, 'activity.last_login': new Date(), 'loginId': data.loginId }, {}, function (err, responseuser) {
                                            if (err || responseuser.nModified == 0) {
                                                res.send({ "status": 0, "errors": "Sorry error in signup..!" });
                                            }
                                            else {
                                                res.send({
                                                    "status": '1',
                                                    "message": 'Successfully registered',
                                                    "driver_id": response._id,
                                                    "user_name": response.username,
                                                    "email": response.email,
                                                    "driver_image": driver_image,
                                                    "loginId": response.loginId,
                                                    "country_code": response.phone.code,
                                                    "phone_number": response.phone.number
                                                });
                                                db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                    mailData1 = {};
                                                    mailData1.template = 'driver_signupto_admin';
                                                    mailData1.to = admin.email;
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
                                                mailData.to = response.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'name', value: response.username || "" });
                                                mailcontent.sendmail(mailData, function (err, response) {
                                                });
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    }
                })
            }
        })
    };

    controller.Login = (req, res) => {
        var errors = [];

        req.checkBody('email', 'email is required').notEmpty();
        req.checkBody('password', 'password is required').notEmpty();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm_id is required').optional();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        data.email = req.body.email.toString().toLowerCase();
        data.password = req.body.password;
        data.token = req.body.deviceToken;
        data.gcm = req.body.gcm_id;
        data.loginId = Date.now();
        if (typeof req.body.loginId != 'undefined') {
            data.loginId = req.body.loginId;
        }
        var validPassword = function (password, passwordb) {
            return bcrypt.compareSync(password, passwordb);
        };
        db.GetDocument('drivers', {
            "email": data.email.toString()
        }, {}, {}, function (err, docs) {
            if (err || !docs || docs.length == 0) {
                res.send({
                    "status": "0",
                    "errors": "Please check the email-ID..!!",
                    "error_flag": 1
                });
            } else {


                db.GetOneDocument('settings', {
                    'alias': 'sms'
                }, {}, {}, function (err, smssettings) {
                    if (err) {
                        res.send({
                            "status": "0",
                            "errors": "Something Went Wrong..!!", "error_flag": 0
                        });
                    } else {

                        db.GetOneDocument('settings', {
                            'alias': 'general'
                        }, {}, {}, function (err, settings) {
                            if (err) {
                                res.send({
                                    "status": 0,
                                    "errors": 'Please check the email and try again', "error_flag": 0
                                });
                            } else {
                                if (!docs[0].password || docs[0].password.length == 0) {
                                    res.send({
                                        "status": 0,
                                        "errors": 'Please try again with your social login', "error_flag": 2
                                    });
                                } else {
                                    if (validPassword(data.password, docs[0].password)) {
                                        if (docs[0].device_info.gcm != '' || docs[0].device_info.device_token != '') {
                                            var android_driver = docs[0]._id;
                                            var message = CONFIG.NOTIFICATION.ADMIN_CANCELLED_ORDER;
                                            var response_time = 250;
                                            var options = [android_driver];
                                            /*  push.sendPushnotification(android_driver, message, 'force_logout', 'ANDROID', options, 'DRIVER', function (err, response, body) { }); */
                                            db.UpdateDocument('drivers', { '_id': docs[0]._id }, { 'device_info.gcm': '', 'device_info.device_token': '', 'loginId': data.loginId }, {}, (err, updatedd) => {
                                            })
                                        }
                                        if (docs[0].status == 1 || docs[0].status == 3) {
                                            db.UpdateDocument('drivers', {
                                                "email": data.email.toString()
                                            }, {
                                                'activity.last_login': new Date()
                                            }, {}, function (err, response) {
                                                if (err || response.nModified == 0) {
                                                    res.send({
                                                        "status": 0,
                                                        "errors": 'Please check the email and try again', "error_flag": 0
                                                    });
                                                } else {
                                                    if (data.token) {
                                                        db.UpdateDocument('drivers', {
                                                            "email": data.email.toString()
                                                        }, {
                                                            'device_info.device_type': 'ios',
                                                            'device_info.gcm': '',
                                                            'device_info.device_token': data.token,
                                                            'logout': 0,
                                                            'activity.last_login': new Date(),
                                                            'loginId': data.loginId
                                                        }, {}, function (err, response) {
                                                            if (err || response.nModified == 0) {
                                                                res.send({
                                                                    "status": 0,
                                                                    "errors": 'Please check the phone number and try again', "error_flag": 0
                                                                });
                                                            } else {
                                                                var driver_image = '';
                                                                if (docs[0].avatar) {
                                                                    var imagedriver = docs[0].avatar.split('./');
                                                                    if (imagedriver[0] == '') {
                                                                        driver_image = settings.settings.site_url + imagedriver[1];
                                                                    } else {
                                                                        driver_image = settings.settings.site_url + docs[0].avatar;
                                                                    }
                                                                } else {
                                                                    driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                }

                                                                res.send({
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
                                                                    driver_status: docs[0].status,
                                                                    loginId: data.loginId

                                                                })

                                                            }
                                                        });
                                                    } else {
                                                        db.UpdateDocument('drivers', {
                                                            "email": data.email.toString()
                                                        }, {
                                                            'device_info.device_type': 'android',
                                                            'device_info.gcm': data.gcm,
                                                            'device_info.device_token': '',
                                                            'loginId': data.loginId,
                                                            'logout': 0, 'activity.last_login': new Date()
                                                        }, {}, function (err, response) {
                                                            if (err || response.nModified == 0) {
                                                                res.send({
                                                                    "status": 0,
                                                                    "errors": 'Please check the phone number and try again', "error_flag": 0
                                                                });
                                                            } else {
                                                                var driver_image = '';
                                                                if (docs[0].avatar) {
                                                                    var imagedriver = docs[0].avatar.split('./');
                                                                    if (imagedriver[0] == '') {
                                                                        driver_image = settings.settings.site_url + imagedriver[1];
                                                                    } else {
                                                                        driver_image = settings.settings.site_url + docs[0].avatar;
                                                                    }
                                                                } else {
                                                                    driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                }

                                                                res.send({
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
                                                                    country_code: docs[0].phone.code,
                                                                    phone_number: docs[0].phone.number
                                                                })

                                                            }
                                                        });
                                                    }
                                                }
                                            });
                                        } else {
                                            if (docs[0].status == 0) {
                                                res.send({
                                                    "status": 0,
                                                    "errors": 'Your account is currently unavailable', "error_flag": 0
                                                });
                                            } else if (docs[0].status == 3) {
                                                res.send({
                                                    "status": 0,
                                                    "errors": 'Your account need to be verified by admin', "error_flag": 0
                                                });
                                            }
                                            else if (docs[0].status == 2) {
                                                res.send({
                                                    "status": 0,
                                                    "errors": 'Your account is inactive, Contact admin', "error_flag": 0
                                                });
                                            }
                                        }
                                    } else {
                                        res.send({
                                            "status": 0,
                                            "errors": 'Password is invalid', "error_flag": 2
                                        });
                                    }
                                }
                            }
                        });
                    }
                });
            }
        });
    };

    controller.otpGenerate = (req, res) => {
        var errors = [];

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
        var data = {};
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;
        db.GetDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
            } else {

                db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
                    if (err) {
                        res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
                    }
                    else {
                        if (phonedocs.length != 0) {
                            res.send({ "status": "2", "message": "Mobile Number already exist" });
                        }
                        else if (phonedocs.length == 0) {
                            var secret = otp.generateSecret();
                            var otp_string = otp.generate(secret);
                            var pass_code = otp_string.slice(0, 4);
                            var to = req.body.country_code + req.body.phone_number;
                            var message = 'Your one time pass code is ' + pass_code;
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
                        else {
                            res.send({ "status": "2", "message": "Mobile Number already exist" });
                        }
                    }
                })
            }
        })
    }

    controller.forgotPassword = (req, res) => {
        var errors = [];
        req.checkBody('email', 'email is required').isEmail();
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

        db.GetDocument('drivers', { email: request.email, 'status': { $eq: 1 } }, {}, {}, function (err, docs) {
            if (err || !docs[0] || docs[0].length == 0) {
                res.send({
                    "status": 0,
                    "errors": 'Email does not match with registered mail'
                });
            } else {
                var otp = library.randomString(8, '#A');
                db.UpdateDocument('drivers', { 'email': request.email }, { 'otp': otp }, {}, function (err, response) {
                    if (err || response.nModified == 0) {
                        res.send({
                            "status": 0,
                            "errors": 'Email does not match with registered mail'
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
                                    mode = settings.settings.twilio.mode;
                                    if (settings.settings.twilio.mode == 'development') {
                                        otp_string = otp;
                                    }
                                }
                                data.otp = otp_string;
                                data.mode = mode;
                                data.status = '1';
                                data.message = 'OTP has been sent to your registered email-ID';
                                res.send(data)
                            }
                        });
                    }
                });
            }
        });
    }

    controller.changePassword = (req, res) => {
        var errors = [];
        req.checkBody('email', 'email is required').isEmail();
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
        db.GetDocument('drivers', { email: request.email, 'otp': request.otp }, {}, {}, function (err, docs) {
            if (err || !docs[0] || docs[0].length == 0) {
                res.send({
                    "status": 0,
                    "errors": 'OTP does not match '
                });
            } else {
                db.UpdateDocument('drivers', { email: request.email }, { 'password': request.password }, {}, function (err, response) {
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

    controller.profile = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
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
        request.driver_id = req.body.driver_id;

        db.GetDocument('drivers', { _id: new mongoose.Types.ObjectId(request.driver_id) }, { username: 1, last_name: 1, email: 1, main_city: 1, category: 1, avatar: 1, img_name: 1, img_path: 1 }, {}, function (err, docs) {


            if (err || !docs[0] || docs[0].length == 0) {
                res.send({
                    "status": 0,
                    "errors": 'Profile cannot be found'
                });
            }
            else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {

                    if (docs[0].avatar) {
                        var imagedriver = docs[0].avatar.split('./');
                        if (imagedriver[0] == '') {
                            docs[0].avatar = settings.settings.site_url + imagedriver[1];
                        } else {
                            docs[0].avatar = settings.settings.site_url + docs[0].avatar;
                        }
                    } else {
                        docs[0].avatar = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                    }
                    data.status = '1';
                    data.response = {};
                    data.response.driverDetails = '';
                    data.response.driverDetails = docs;
                    var async = require('async')
                    async.series([function (cb) {
                        db.GetDocument('city', { 'status': { $eq: 1 } }, { "cityname": 1 }, {}, function (err, docdata) {
                            if (err || !docdata) {
                                data.response.cities = '';
                                cb(null);
                            } else {

                                data.response.cities = docdata;
                                cb(null);
                            }
                        })

                    },
                    function (cb) {
                        db.GetDocument('vehicles', { 'status': { $eq: 1 } }, { "vehicle_name": 1 }, {}, function (err, vehidata) {
                            if (err || !vehidata) {
                                data.response.vehicle_list = '';
                                cb(null)
                            }
                            else {
                                data.response.vehicle_list = vehidata;
                                cb(null);
                            }
                        })
                    }], function () {
                        res.send(data);
                    })
                })
            }
        })
    }

    controller.docsUpload = (req, res) => {
        var driver_documents = [];
        var temp = {};
        for (i in req.files) {

            temp.doc_name = req.files[i].fieldname;
            temp.image = req.files[i].destination + req.files[i].filename;
            temp.expiry_date = new Date();
            driver_documents.push(temp);

        }
        db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id), driver_documents: { $elemMatch: { doc_name: req.files[0].fieldname } } }, { $set: { "driver_documents.$.doc_name": req.files[0].fieldname, "driver_documents.$.image": temp.image, "driver_documents.$.expiry_date": temp.expiry_date } }, {}, (err, uploaded) => {
            if (uploaded.nModified == 1) {
                res.send({ status: 1, response: 'Uploaded successfully' })
            }
            else {
                db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id) }, { $addToSet: { driver_documents: temp } }, {}, (err, inserted) => {
                    if (inserted) {
                        res.send({ status: 1, response: 'Inserted successfully' })
                    }
                    else {
                        res.send({ status: 0, response: "unable to upload" });
                    }
                })

            }
        })
    }

    controller.driverDocs = (req, res) => {
        var errors = [];

        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        data.response = {};

        var request = {};
        request.driver_id = req.body.driver_id;


        db.GetDocument('drivers', {
            _id: new mongoose.Types.ObjectId(request.driver_id)
        }, {
            _id: 1,
            driver_documents: 1
        }, {}, function (err, docs) {

            if (err) {
                res.send({
                    "status": 0,
                    "errors": 'Driver Id is not valid'
                });
            } else {

                /* db.GetDocument('documents', {
                     doc_for: 'driver', 'status': { $eq: 1 }
                 }, {}, {}, function (err, documents) {*/
                var categoryQuery = [
                    { "$match": { status: { $eq: 1 }, 'doc_for': 'driver' } },
                    { $sort: { "createdAt": 1 } },
                ];
                db.GetAggregation('documents', categoryQuery, function (err, documents) {
                    if (err || !documents) {
                        data.response.documentLists = [];
                        res.send(data);
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {

                            var func = (name) => {
                                var found = 0;
                                for (i in docs[0].driver_documents) {
                                    if (name == docs[0].driver_documents[i].doc_name) {
                                        found = 1;
                                        break;
                                    }
                                }
                                return found;
                            }
                            var docarr = [];
                            if (docs.length > 0) {
                                for (i in documents) {

                                    if (docs[0].driver_documents[i]) {
                                        if (func(documents[i].doc_name)) {

                                            if (docs[0].driver_documents[i].image) {
                                                docs[0].driver_documents[i].image = docs[0].driver_documents[i].image.slice(2);
                                            }
                                            //docs[0].driver_documents[i].image_name = docs[0].driver_documents[i].image.toString().split('/others/')[1];
                                            docs[0].driver_documents[i].image = settings.settings.site_url + docs[0].driver_documents[i].image;
                                            var temp = {};
                                            temp.doc_name = docs[0].driver_documents[i].doc_name;
                                            temp.image = docs[0].driver_documents[i].image;
                                            temp._id = docs[0].driver_documents[i]._id;
                                            temp.expiry_date = docs[0].driver_documents[i].expiry_date;
                                            temp.image_name = docs[0].driver_documents[i].image.toString().split('/others/')[1];
                                            if (!temp.image_name) {
                                                temp.image_name = '';
                                            }
                                        }
                                        else {
                                            var temp = {};
                                            temp.doc_name = '';
                                            if (documents[i]) {
                                                if (documents[i].doc_name) {
                                                    temp.doc_name = documents[i].doc_name;
                                                }
                                            }

                                            temp.image = '';
                                            temp._id = '';
                                            if (docs[0]) {
                                                if (docs[0].driver_documents[i]) {
                                                    temp._id = docs[0].driver_documents[i]._id;
                                                }
                                            }
                                            temp.expiry_date = '';
                                            if (docs[0].driver_documents[i]) {
                                                if (docs[0].driver_documents[i].expiry_date) {
                                                    temp.expiry_date = docs[0].driver_documents[i].expiry_date;
                                                }
                                            }
                                            temp.image_name = ''
                                            if (!temp.image_name) {
                                                temp.image_name = '';
                                            }
                                        }
                                    }
                                    else {
                                        var temp = {};
                                        temp.doc_name = documents[i].doc_name;
                                        temp.image = '';
                                        temp._id = '';
                                        temp.expiry_date = '';
                                        temp.image_name = '';
                                    }
                                    docarr.push(temp);
                                }
                            }
                            var docLists = [];
                            if (documents.length > 0) {
                                for (i in documents) {
                                    var temp = {};
                                    temp._id = documents[i]._id;
                                    temp.updatedAt = documents[i].updatedAt;
                                    temp.createdAt = documents[i].createdAt;
                                    temp.doc_for = documents[i].doc_for;
                                    temp.doc_name = documents[i].doc_name;
                                    temp.expiry_date = documents[i].expiry_date;
                                    temp.has_require = documents[i].has_require;
                                    temp.has_expire = documents[i].has_expire;
                                    temp.status = documents[i].status;
                                    temp.image_name = '';
                                    temp.image = '';
                                    for (j in docarr) {
                                        if (documents[i]) {
                                            if (documents[i].doc_name == docarr[j].doc_name) {
                                                temp.image_name = docarr[j].image_name;
                                                temp.image = docarr[j].image;

                                            }
                                        }
                                    }
                                    docLists.push(temp)

                                }
                            }

                            data.response.documentLists = docLists;
                            data.response.driverDocuments = docarr;
                            res.send(data);
                        })
                    }
                });

            }
        });

    }

    controller.deliveries = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
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

        request.driver_id = req.body.driver_id;
        var aggregation_data = [
            {
                $sort: {
                    createdAt: -1
                }
            },
            { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id) } },
            { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
            { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    'RestaurantDetails': {
                        _id: '$RestaurantDetails._id',
                        restaurant_name: '$RestaurantDetails.restaurantname',
                        address: '$RestaurantDetails.address'
                    }, 'orderDetails': {
                        _id: '$_id',
                        createdAt: '$createdAt',
                        status: '$status',
                        order_id: '$order_id',
                        delivery_address: '$delivery_address',
                        foods: '$foods',
                        'total_qty': {
                            $sum: {
                                "$map": {
                                    "input": "$foods", "as": "food", "in":
                                    {
                                        "$cond": [{
                                            $and: [{ $ne: [{ "$ifNull": ["$$food.quantity", ''] }, ''] },
                                            { $gte: ["$$food.quantity", 0] }]
                                        },
                                            "$$food.quantity", 0]
                                    }
                                }
                            }
                        },
                        billings: '$billings',
                    },
                }
            }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, total_qty: 1 } }
        ];

        db.GetAggregation('orders', aggregation_data, function (err, docdata) {
            if (err) {

                res.send(err)
            }
            else {

                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    var Details = [];
                    if (docdata.length > 0) {
                        data.Details = [];
                        var total_qty = 0;
                        for (i in docdata) {
                            var temp = {};
                            temp.restaurant_address = '';
                            if (typeof docdata[i].RestaurantDetails.address != 'undefined' && typeof docdata[i].RestaurantDetails.address.fulladres != 'undefined') {
                                temp.restaurant_address = docdata[i].RestaurantDetails.address.fulladres;
                            }

                            temp.restaurant_name = docdata[i].RestaurantDetails.restaurant_name;
                            temp.delivery_address = docdata[i].orderDetails.delivery_address.fulladres;
                            temp.order_id = docdata[i].orderDetails.order_id;
                            temp.order_placed_on = moment(new Date(docdata[i].orderDetails.createdAt)).format('DD/MM/YY');
                            //temp.order_placed_on = timezone.tz(docdata[i].orderDetails.createdAt).format(settings.settings.date_format);
                            if (typeof docdata[i].orderDetails.total_qty != 'undefined') {
                                total_qty = total_qty + docdata[i].orderDetails.total_qty;
                            }


                            temp.food_list = docdata[i].orderDetails.foods;
                            if (typeof docdata[i].orderDetails.billings != 'undefined') {
                                temp.total = docdata[i].orderDetails.billings.amount.total;
                            }
                            else {
                                temp.total = 0
                            }
                            temp.total = parseFloat(temp.total).toFixed(2);
                            data.Details.push(temp);
                        }


                    }
                    else {
                        data.Details = [];
                    }
                    res.send({ total_qty: total_qty, Details: data.Details });
                });
            }
        })
    }

    controller.resetPassword = (req, res) => {

        var errors = [];
        req.checkBody('driver_id', 'driver_id is required').notEmpty();
        req.checkBody('oldpassword', 'Old password is required').notEmpty();
        req.checkBody('password', 'Password is required').notEmpty();
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
        request.driver_id = req.body.driver_id;
        var validPassword = function (password, passwordb) {
            return bcrypt.compareSync(password, passwordb);
        };

        request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
        request.oldpassword = req.body.oldpassword;

        db.GetDocument('drivers', { _id: new mongoose.Types.ObjectId(request.driver_id) }, { username: 1, last_name: 1, email: 1, main_city: 1, category: 1, password: 1 }, {}, function (err, docs) {
            if (!err && docs) {

                if (validPassword(request.oldpassword, docs[0].password)) {

                    db.UpdateDocument('drivers', { _id: new mongoose.Types.ObjectId(request.driver_id) }, { 'password': request.password }, {}, function (err, response) {
                        if (err || response.nModified == 0) {
                            res.send({
                                "status": 0,
                                "errors": 'Something went wrong!.....'
                            });
                        } else {
                            res.send({
                                "status": 1,
                                "message": 'Password has been changed successfully'
                            });
                        }
                    });

                }
                else {
                    res.send({
                        "status": 0,
                        "errors": 'Your old password does not match with existing one!.....'
                    });
                }
            }
            else {
                res.send({
                    "status": 0,
                    "message": 'You are not authorized'
                });
            }
        });
    };

    controller.editProfile = (req, res) => {


        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('first_name', 'first_name is required').notEmpty();
        // req.checkBody('last_name', 'last_name is required').notEmpty();
        req.checkBody('driver_id', 'driver_id is required').notEmpty();
        req.checkBody('email', 'email is required').isEmail();


        req.checkBody('city', 'city  is required').notEmpty();
        req.checkBody('vehicle_type', 'vehicle_type  is required').notEmpty();



        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        req.sanitizeBody('first_name').trim();
        req.sanitizeBody('last_name').trim();
        req.sanitizeBody('driver_id').trim();
        req.sanitizeBody('email').trim();

        req.sanitizeBody('city').trim();
        req.sanitizeBody('vehicle_type').trim();




        var request = {};
        data.email = req.body.email;

        data.username = req.body.first_name || "";
        data.last_name = req.body.last_name || "";
        data.driver_id = req.body.driver_id;

        data.city = req.body.city;
        data.vehicle_type = req.body.vehicle_type;

        //data.unique_code = req.body.referal_code;

        data.role = 'driver';
        data.status = '1';



        var newdata = {};
        newdata.username = data.username;
        // newdata.last_name = data.last_name;
        newdata.main_city = data.city;
        newdata.category = data.vehicle_type;


        newdata.role = 'driver';
        newdata.email = data.email;




        db.GetDocument('drivers', { email: newdata.email }, {}, {}, function (err, docs) {
            if (docs.length == 0) {



                db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(data.driver_id) }, newdata, function (err, response) {
                    if (err) {

                        res.send({ "status": "0", "errors": "Sorry Email Exists..!" });
                    }
                    else {

                        res.send({
                            "status": '1',
                            "message": 'Successfully edited',
                            "driver_id": response._id,
                            "user_name": response.username,
                            "email": response.email,
                        });
                    }
                })
            }
            else {
                if (docs[0]._id == data.driver_id) {

                    db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(data.driver_id) }, newdata, function (err, response) {
                        res.send({
                            "status": '1',
                            "message": 'Successfully edited',
                            "driver_id": response._id,
                            "user_name": response.username,
                            "email": response.email,
                        });
                    })
                }
                else {
                    res.send({ "status": '0', "message": 'Email id already exits' });
                }

            }
        })

    };

    controller.profilePic = (req, res) => {
        var updatadata = {};
        if (req.files) {
            //updatadata.avatar = attachment.get_attachment('uploads/images/users', req.files.avatar[0].filename);

            updatadata.img_name = encodeURI(req.files.avatar[0].filename);
            updatadata.img_path = 'uploads/images/users';
            updatadata.avatar = updatadata.img_path + '/' + updatadata.img_name;
            Jimp.read(req.files.avatar[0].path).then(function (lenna) {
                lenna.resize(100, 100)            // resize
                    .quality(60)                 // set JPEG quality
                    .write('./uploads/images/users/thumb/' + req.files.avatar[0].filename); // save
            }).catch(function (err) {

            });
            db.UpdateDocument('drivers', { _id: req.body.driver_id }, updatadata, {}, function (err, docdata) {
                var data = {};
                if (err) {

                    data.success = 0;
                    data.message = err;
                    res.send(data);
                } else {
                    data.success = 1;
                    data.message = 'Profile picture updated'
                    data.avatar = CONFIG.DIRECTORY_USERS + updatadata.img_name;
                    res.send(data);
                }
            });

        }
        else {

            res.send('no file')
        }
    }

    controller.getEarnings = (req, res) => {
        var moment = require('moment');
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
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
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
            request.driver_id = req.body.driver_id;
            var aggregation_data = [
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id) } },
                { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        'RestaurantDetails': {
                            _id: '$RestaurantDetails._id',
                            restaurant_name: '$RestaurantDetails.restaurantname',
                            address: '$RestaurantDetails.address'
                        }, 'orderDetails': {
                            _id: '$_id',
                            createdAt: '$createdAt',
                            status: '$status',
                            order_id: '$order_id',
                            delivery_address: '$delivery_address',
                            foods: '$foods',
                            billings: '$billings',
                            mileages_travelled: '$mileages_travelled',
                            driver_fare: '$driver_fare'

                        }
                    }
                }, { $project: { "orderDetails": 1, "RestaurantDetails": 1 } }, { $project: { document: "$$ROOT" } },
                {
                    $group: { "_id": null, "totalEarnings": { "$sum": { "$cond": [{ $ne: [{ "$ifNull": ["$document.orderDetails.billings.amount.driver_commission", ''] }, ''] }, "$document.orderDetails.billings.amount.driver_commission", 0] } }, "documentData": { $push: "$document" } }
                }
            ];

            db.GetAggregation('orders', aggregation_data, function (err, docdata) {
                if (err) {

                    res.send(err)
                }
                else {


                    var data = {};
                    if (docdata.length > 0) {

                        data.Details = {};
                        data.Details.EarningDetails = [];
                        data.Details.TotalDetails = [];
                        var deliveryCount = 0;




                        for (i in docdata[0].documentData) {
                            var temp = {};
                            temp.restaurant_address = '';
                            if (typeof docdata[0].documentData[i].RestaurantDetails.address != 'undefined') {
                                temp.restaurant_address = docdata[0].documentData[i].RestaurantDetails.address.fulladres;
                            }

                            temp.restaurant_name = docdata[0].documentData[i].RestaurantDetails.restaurant_name;
                            temp.delivery_address = docdata[0].documentData[i].orderDetails.delivery_address.fulladres;
                            temp.order_id = docdata[0].documentData[i].orderDetails.order_id;
                            temp.order_placed_on = moment(new Date(docdata[0].documentData[i].orderDetails.createdAt)).format('DD/MM/YY');
                            temp.food_list = docdata[0].documentData[i].orderDetails.foods;
                            if (docdata[0].documentData[i].orderDetails.driver_fare) {
                                if (docdata[0].documentData[i].orderDetails.driver_fare.format == 'km') {
                                    if (settings.settings.delivery_charge) {
                                        if (settings.settings.delivery_charge.format == 'ml') {
                                            docdata[0].documentData[i].orderDetails.mileages_travelled = parseFloat(docdata[0].documentData[i].orderDetails.mileages_travelled) * 0.62137;
                                        }
                                    }

                                }
                                if (docdata[0].documentData[i].orderDetails.driver_fare.format == 'ml') {
                                    if (settings.settings.delivery_charge) {
                                        if (settings.settings.delivery_charge.format == 'km') {
                                            docdata[0].documentData[i].orderDetails.mileages_travelled = parseFloat(docdata[0].documentData[i].orderDetails.mileages_travelled) / 0.62137;
                                        }
                                    }

                                }
                            }
                            docdata[0].documentData[i].orderDetails.mileages_travelled = parseFloat(docdata[0].documentData[i].orderDetails.mileages_travelled).toFixed(2)
                            temp.mileage = docdata[0].documentData[i].orderDetails.mileages_travelled

                            // = docdata[0].documentData[i].orderDetails.mileages_travelled;

                            if (typeof docdata[0].documentData[i].orderDetails.billings != 'undefined') {
                                temp.total = docdata[0].documentData[i].orderDetails.billings.amount.total;
                                temp.driver_commission = (parseFloat(docdata[0].documentData[i].orderDetails.billings.amount.driver_commission)).toFixed(2);
                            }
                            else {
                                temp.total = 0;
                                temp.driver_commission = 0;
                                temp.driver_commission = parseFloat(temp.driver_commission).toFixed(2)
                            }

                            deliveryCount = deliveryCount + 1;
                            temp.total = parseFloat(temp.total).toFixed(2)
                            data.Details.EarningDetails.push(temp);
                        }
                        data.Details.TotalDetails.push({ DeliveryCount: deliveryCount, TotalEarning: docdata[0].totalEarnings });
                    }
                    else {
                        data.Details = {};
                        data.Details.EarningDetails = [];
                        data.Details.TotalDetails = [];
                    }

                    res.send(data);
                }
            })
        })
    }

    controller.newOrder = (req, res) => {
        try {
            req.checkBody('driver_id', 'Driver ID is required').notEmpty();
            req.checkBody('lat', 'Latitude is required').notEmpty();
            req.checkBody('long', 'Longitude is required').notEmpty();
            req.checkBody('order_id', 'Order ID is required').notEmpty();
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

            request.driver_id = req.body.driver_id;
            request.order_id = req.body.order_id;
            request.lat = req.body.lat;
            request.long = req.body.lang;
            var aggregation_data = [
                { $match: { status: { $eq: 3 }, "order_id": request.order_id } },
                //{ $match : { "order_id": request.order_id}},
                { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
                { $unwind: { path: "$UserDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        'RestaurantDetails': {
                            _id: '$RestaurantDetails._id',
                            restaurant_name: '$RestaurantDetails.restaurantname',
                            address: '$RestaurantDetails.address',
                            main_city: '$RestaurantDetails.main_city'
                        }, 'orderDetails': {
                            _id: '$_id',
                            createdAt: '$createdAt',
                            status: '$status',
                            order_id: '$order_id',
                            delivery_address: '$delivery_address',
                            foods: '$foods',
                            billings: '$billings',
                            notify: '$notify',
                            booking_type: '$booking_type',
                            schedule_time: '$schedule_time',
                            schedule_type: '$schedule_type',
                            location: '$location'

                        }, 'UserDetails': {
                            _id: '$UserDetails._id',
                            address: '$UserDetails.address',
                            location: '$UserDetails.location',
                            username: '$UserDetails.username',
                            user_image: '$UserDetails.avatar'
                        }
                    }
                }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
            ];

            db.GetAggregation('orders', aggregation_data, function (err, docdata) {
                if (err || docdata.length == 0) {

                    res.send({
                        'status': 0,
                        'Message': 'Sorry...That order has been accepted by another driver'
                    });
                } else {

                    var user = {};

                    user._id = docdata[0].UserDetails._id;
                    user.username = docdata[0].UserDetails.username;
                    if (docdata[0].UserDetails.location != null && typeof docdata[0].UserDetails.location != 'undefined') {

                        user.lat = (typeof (docdata[0].UserDetails.location.lat) == 'undefined') ? 0.00 : docdata[0].UserDetails.location.lat;
                        user.long = (typeof (docdata[0].UserDetails.location.lng) == 'undefined') ? 0.00 : docdata[0].UserDetails.location.lng;
                    }
                    else {
                        user.lat = 0.00;
                        user.long = 0.00;
                    }
                    if (docdata[0].UserDetails.address != null && typeof docdata[0].UserDetails.address != 'undefined') {
                        user.address = (typeof (docdata[0].UserDetails.address.fulladres) == 'undefined') ? '' : docdata[0].UserDetails.address.fulladres;
                    }
                    else {
                        user.address = '';
                    }
                    if (typeof docdata[0].orderDetails != "undefined" && typeof docdata[0].orderDetails.delivery_address != "undefined") {
                        if (!docdata[0].orderDetails.delivery_address.landmark) {
                            docdata[0].orderDetails.delivery_address.landmark = "";
                        }
                    }
                    db.GetDocument('city', { 'cityname': { $eq: docdata[0].RestaurantDetails.main_city } }, {}, {}, function (err, docs) {
                        if (err) {
                            res.send(err);
                        } else {
                            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
                                var driverToRest = 0.00;
                                var restToUser = 0.00;
                                async.series([function (cb) {
                                    var R = 6371;
                                    var Lat = (req.body.lat - docdata[0].RestaurantDetails.address.lat) * (Math.PI / 180);
                                    var Long = (req.body.long - docdata[0].RestaurantDetails.address.lng) * (Math.PI / 180);
                                    var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(docdata[0].RestaurantDetails.address.lat * (Math.PI / 180)) * Math.cos(req.body.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                    var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                    var d = R * c;
                                    driverToRest = d;
                                    cb(null);
                                }, function (cb) {
                                    var R = 6371;
                                    var Lat = (docdata[0].RestaurantDetails.address.lat - docdata[0].orderDetails.location.lat) * (Math.PI / 180);
                                    var Long = (docdata[0].RestaurantDetails.address.lng - docdata[0].orderDetails.location.lng) * (Math.PI / 180);
                                    var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(docdata[0].orderDetails.location.lat * (Math.PI / 180)) * Math.cos(docdata[0].RestaurantDetails.address.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                    var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                    var d = R * c;
                                    restToUser = d;
                                    cb(null)
                                }], function (err, result) {
                                    var totalEarnings = 0, totalkms = 0;
                                    if (docs[0].driver_fare.format == 'km') {
                                        restToUser = restToUser;
                                        driverToRest = driverToRest;
                                    } else {
                                        restToUser = restToUser / 1.609344;
                                        driverToRest = driverToRest / 1.609344;
                                    }
                                    totalEarnings = parseInt(totalEarnings) + parseInt(docs[0].driver_fare.baseprice);
                                    totalkms = parseFloat(driverToRest) + parseFloat(restToUser);
                                    totalkms = parseFloat(totalkms);
                                    totalEarnings = parseFloat(totalEarnings) + parseFloat((totalkms * docs[0].driver_fare.extra_price));
                                    totalEarnings = parseFloat(totalEarnings);
                                    docdata[0].expectedEarnings = parseInt(docs[0].driver_fare.baseprice);
                                    docdata[0].travel_format = docs[0].driver_fare.format;
                                    docdata[0].mileages_travelled = totalkms;
                                    docdata[0].pickup_distance = driverToRest;
                                    docdata[0].deliver_distance = restToUser;
                                    if (typeof settings.settings.drivertime_out != 'undefined') {
                                        docdata[0].driver_timeout = parseInt(settings.settings.drivertime_out) * 60;
                                        docdata[0].driver_timeout = parseInt(docdata[0].driver_timeout)
                                    } else {
                                        docdata[0].driver_timeout = 120;
                                    }
                                    if (docdata[0].UserDetails.user_image) {
                                        var userImage = docdata[0].UserDetails.user_image.split("./");
                                        if (userImage[1]) {
                                            user.user_image = settings.settings.site_url + userImage[1];
                                        } else {
                                            user.user_image = settings.settings.site_url + userImage[0];
                                        }
                                    } else {
                                        user.user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                    }
                                    if (typeof settings.settings.currency_symbol != 'undefined') {
                                        docdata[0].currency_symbol = settings.settings.currency_symbol;
                                    } else {
                                        docdata[0].currency_symbol = '$';
                                    }
                                    docdata[0].UserDetails = user;
                                    res.send({ 'status': 1, 'data': docdata[0] })
                                })
                            })
                        }
                    })
                }
            })
        } catch (e) {
            console.log(e)
        }
    }

    controller.Assigndriverorder = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('order_id', 'Order ID is required').notEmpty();
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
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        db.GetOneDocument('orders', { 'order_id': request.order_id }, {}, {}, (err, orders) => {
            if (err || !orders) {
                res.send({ 'status': 0, 'message': 'Order Not Found...' });
            } else {
                db.GetOneDocument('city', { _id: orders.city_id }, { _id: 1, address: 1, location: 1, cityname: 1 }, {}, (err, restaurant) => {
                    if (err || !restaurant) {
                        res.send({ 'status': 0, 'message': " Please check your data" });
                    } else {
                        db.GetOneDocument('users', { _id: orders.user_id }, { _id: 1, username: 1 }, {}, function (userErr, userRespo) {
                            if (userErr) {
                                res.send({ 'status': 0, 'message': "Error in settings" });
                            } else {
                                db.GetOneDocument('transaction', { _id: orders.transaction_id }, {}, {}, function (transErr, transactionDetails) {
                                    if (transErr) {
                                        res.send({ 'status': 0, 'message': "Error in settings" });
                                    } else {
                                        var comb = {};
                                        comb.restaurant = restaurant;
                                        comb.orders = orders;
                                        comb.mode = transactionDetails.mode;
                                        comb.users = {};
                                        comb.users.username = userRespo.username;
                                        res.send({ 'status': 1, 'data': comb });
                                    }
                                })
                            }
                        })
                    }
                })
            }
        });
    }

    controller.driverAccepts = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('order_id', 'Order ID is required').notEmpty();
        req.checkBody('earning', 'Earning is required').notEmpty();
        req.checkBody('mileages', 'Mileage is required').notEmpty();
        req.checkBody('pickup_distance', 'pickup_distance is required').notEmpty();
        req.checkBody('deliver_distance', 'deliver_distance is required').notEmpty();

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
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        request.earning = req.body.earning;
        request.mileages = req.body.mileages;

        if (typeof (req.body.pickup_distance) != 'undefined') {
            request.pickup_distance = req.body.pickup_distance;
        }
        else {
            request.pickup_distance = 0;
        }
        if (typeof (req.body.deliver_distance) != 'undefined') {
            request.deliver_distance = req.body.deliver_distance;
        }
        else {
            request.deliver_distance = 0;
        }

        db.GetOneDocument('orders', { 'order_id': request.order_id, status: { '$eq': 3 } }, {}, {}, (err, orders) => {
            //db.GetOneDocument('orders', { 'order_id': request.order_id }, {_id:1,restaurant_id:1,user_id:1,foods:1}, {}, function (err, orders) {
            if (err || !orders) {
                res.send({ 'status': 0, 'message': 'The order has been picked by some other driver' });
            }
            else {
                db.GetOneDocument('restaurant', { _id: orders.restaurant_id }, { _id: 1, address: 1, location: 1, phone: 1, restaurantname: 1, location: 1, main_city: 1 }, {}, (err, restaurant) => {
                    if (err || !restaurant) {
                        res.send({ 'status': 0, 'message': " Please check your data" });
                    } else {
                        db.GetOneDocument('users', { _id: orders.user_id }, { _id: 1, username: 1 }, {}, function (userErr, userRespo) {

                            if (userErr) {
                                res.send({ 'status': 0, 'message': "Error in settings" });
                            }
                            else {
                                db.GetOneDocument('city', { 'status': { $eq: 1 }, 'cityname': restaurant.main_city }, {}, {}, function (err, citydocdata) {
                                    if (err || !citydocdata) {
                                        res.send({
                                            "status": "0", "errors": "Error in admin commission"
                                        });
                                    } else {
                                        var nit_comm = 0;
                                        var extra_comm = 0;
                                        var night_fare_commision = 0;
                                        var extra_fare_commision = 0;
                                        var driver_fare = {};
                                        if (typeof citydocdata != 'undefined' && typeof citydocdata.driver_fare != 'undefined') {
                                            driver_fare = citydocdata.driver_fare;
                                        }
                                        if (orders.billings.amount.night_fee > 0) {
                                            if (typeof citydocdata.night_fare_settings.driver_share != 'undefined') {
                                                night_fare_commision = citydocdata.night_fare_settings.driver_share;
                                            }
                                            nit_comm = parseFloat(citydocdata.night_fare_settings.driver_share) / 100 * parseFloat(orders.billings.amount.night_fee) || 0;
                                            nit_comm = parseFloat(nit_comm).toFixed(2)
                                        }

                                        if (orders.billings.amount.surge_fee > 0) {
                                            if (typeof citydocdata.extra_fare_settings.driver_share != 'undefined') {
                                                extra_fare_commision = citydocdata.extra_fare_settings.driver_share;
                                            }

                                            extra_comm = parseFloat(citydocdata.extra_fare_settings.driver_share) / 100 * parseFloat(orders.billings.amount.surge_fee) || 0;
                                            extra_comm = parseFloat(extra_comm).toFixed(2)
                                        }

                                        var driver_comm = parseFloat(nit_comm) + parseFloat(extra_comm);
                                        drivver_comm = parseFloat(driver_comm).toFixed(2)
                                        db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 5, 'driver_id': request.driver_id, 'billings.amount.driver_commission': driver_comm, 'night_fare_commision': night_fare_commision, 'extra_fare_commision': extra_fare_commision, 'mileages_travelled': request.mileages, 'order_history.driver_accepted': new Date(), 'pickup_distance': request.pickup_distance, driver_fare: driver_fare, 'deliver_distance': request.deliver_distance }, {}, function (err, docdata) {
                                            if (err) {
                                                res.send({ 'status': 0, message: 'Cannot update' });
                                            }
                                            else {
                                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                                    db.GetOneDocument('drivers', { _id: request.driver_id }, { _id: 1, username: 1, avatar: 1, phone: 1, email: 1 }, {}, function (driverErr, driverRespo) {
                                                        if (driverErr) {
                                                            res.send({ 'status': 0, 'message': 'Driver cannot be found' });
                                                        }
                                                        else {
                                                            db.GetCount('orders', { driver_id: mongoose.Types.ObjectId(request.driver_id), status: { $in: [5, 6] } }, (err, count) => {
                                                                let jobcount = count || 1;
                                                                db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.driver_id) }, { 'currentJob': jobcount }, {}, (err, upd) => {
                                                                    var imgurl = '';
                                                                    if (driverRespo.avatar) {
                                                                        var imagedriver = driverRespo.avatar.split('./');
                                                                        if (imagedriver[0] == '') {
                                                                            imgurl = settings.settings.site_url + imagedriver[1];
                                                                        } else {
                                                                            imgurl = settings.settings.site_url + driverRespo.avatar;
                                                                        }
                                                                    } else {
                                                                        imgurl = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                                    }

                                                                    var comb = {};
                                                                    comb.restaurant = restaurant;
                                                                    comb.orders = orders;
                                                                    comb.users = {};
                                                                    comb.users.username = userRespo.username;

                                                                    var android_driver = restaurant._id;
                                                                    var message = CONFIG.NOTIFICATION.DRIVER_ACCEPTED;
                                                                    var response_time = 250;
                                                                    var options = [request.order_id, android_driver];
                                                                    push.sendPushnotification(android_driver, message, 'driver_accepted', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                    var android_driver1 = userRespo._id;
                                                                    var message1 = CONFIG.NOTIFICATION.DRIVER_ACCEPTED_FOR_USER;
                                                                    var response_time1 = 250;

                                                                    var food_count = orders.foods.length;

                                                                    var options1 = [request.order_id, android_driver1,
                                                                    restaurant.restaurantname, food_count, orders.billings.amount.grand_total, orders.location, restaurant.location, driverRespo.username, driverRespo.phone, imgurl];
                                                                    push.sendPushnotification(android_driver1, message1, 'driver_accepted', 'ANDROID', options1, 'USER', function (err, response, body) { });
                                                                    io.of('/chat').in(orders._id).emit('OrderUpdated', { orderId: orders._id });
                                                                    var noti_data = {};
                                                                    noti_data.rest_id = restaurant._id;
                                                                    noti_data.order_id = request.order_id;
                                                                    noti_data.user_id = orders.user_id;
                                                                    noti_data._id = orders._id;
                                                                    noti_data.user_name = driverRespo.username;
                                                                    noti_data.order_type = 'driver_accept';
                                                                    io.of('/chat').in(restaurant._id).emit('restnotify', { restauranId: noti_data });
                                                                    io.of('/chat').in(orders.user_id).emit('usernotify', noti_data);
                                                                    io.of('/chat').emit('adminnotify', noti_data);


                                                                    mailData = {};
                                                                    mailData.template = 'driver_accept_order';
                                                                    mailData.to = userRespo.email;
                                                                    mailData.html = [];
                                                                    mailData.html.push({ name: 'name', value: userRespo.username || "" });
                                                                    mailcontent.sendmail(mailData, function (err, response) { });

                                                                    /* mailData = {};
                                                                     mailData.template = 'order_accepts_todriver';
                                                                     mailData.to = driverRespo.email;
                                                                     mailData.html = [];
                                                                     mailData.html.push({ name: 'name', value: driverRespo.username || "" });
                                                                     mailcontent.sendmail(mailData, function (err, response) { });*/

                                                                    var mail_data = {};
                                                                    mail_data.user_id = userRespo._id;
                                                                    mail_data.driver_id = driverRespo._id;
                                                                    mail_data.order_id = orders._id;
                                                                    events.emit('order_accepts_todriver', mail_data, function (err, result) { });

                                                                    var mail_data = {};
                                                                    mail_data.user_id = userRespo._id;
                                                                    mail_data.driver_id = driverRespo._id;
                                                                    mail_data.order_id = orders._id;
                                                                    events.emit('driver_accepts_toadmin', mail_data, function (err, result) { });
                                                                    res.send({ 'status': 1, 'data': comb });

                                                                })
                                                            })
                                                        }
                                                    })
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
        });
    }


    events.on('driver_accepts_toadmin', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var driverId;
        if (typeof req.driver_id != 'undefined' && req.driver_id != '') {
            if (isObjectId(req.driver_id)) {
                driverId = new mongoose.Types.ObjectId(req.driver_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                // console.log('Error in mail14..!')
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            // console.log('Error in mail15..!')
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
                //  console.log('Error in mail16..!')
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                        // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
                        //  console.log('Error in mail16..!')
                    } else {
                        var filter_query = { "user_id": userId, _id: orderId };
                        var condition = [
                            { $match: filter_query },
                            { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                            { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
                            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    orderDetails: {
                                        createdAt: "$createdAt",
                                        status: "$status",
                                        mode: "$transactionDetails.type",
                                        order_history: "$order_history",
                                        _id: "$_id",
                                        transaction_id: "$transaction_id",
                                        user_id: "$user_id",
                                        restaurant_id: "$restaurant_id",
                                        coupon_code: "$coupon_code",
                                        delivery_address: "$delivery_address",
                                        order_id: "$order_id",
                                        restaurantDetails: {
                                            restaurantname: "$restaurantDetails.restaurantname",
                                            username: "$restaurantDetails.username",
                                            email: "$restaurantDetails.email",
                                            address: "$restaurantDetails.address",
                                        },
                                        userDetails: {
                                            "name": "$userDetails.username",
                                            "status": "$userDetails.status",
                                            "phone": "$userDetails.phone",
                                            "address": "$userDetails.address",
                                            "location": "$userDetails.location",
                                            "email": "$userDetails.email",
                                            "avatar": "$userDetails.avatar",
                                            "_id": "$userDetails._id",
                                        },
                                        location: "$location",
                                        foods: {
                                            "$map": {
                                                "input": "$foods",
                                                "as": "el",
                                                "in": {
                                                    'name': '$$el.name',
                                                    'id': '$$el.id',
                                                    'description': '$$el.description',
                                                    'offer': '$$el.offer',
                                                    'price': '$$el.price',
                                                    'slug': '$$el.slug',
                                                    'status': '$$el.status',
                                                    'quantity': '$$el.quantity',
                                                    'offer_price': '$$el.offer_price',
                                                    'instruction': '$$el.instruction',
                                                    'addons': '$$el.addons',
                                                    'base_pack': '$$el.base_pack',
                                                    "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                                }
                                            }
                                        },
                                        seen_status: "$seen_status",
                                        billings: "$billings",
                                        order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            //console.log('err, docdata', err, docdata)
                            if (err || !docdata) {
                                res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                            } else {
                                if (docdata.length > 0) {
                                    var orderDetails = [];
                                    var format = require('format-number');
                                    var myFormat = format({ integerSeparator: ',' });
                                    var pug = {};
                                    if (typeof docdata[0].orderDetails != 'undefined') {
                                        orderDetails = docdata[0].orderDetails;
                                        for (var i = 0; i < orderDetails.foods.length; i++) {
                                            orderDetails.foods[i].total = myFormat(orderDetails.foods[i].total.toFixed(2), { integerSeparator: ',' });
                                            if (orderDetails.foods[i].offer_price > 0) {
                                                var offer_discount = orderDetails.foods[i].total - orderDetails.foods[i].offer_price;
                                                orderDetails.foods[i].sub_total = myFormat(offer_discount.toFixed(2), { integerSeparator: ',' })
                                            } else {
                                                orderDetails.foods[i].sub_total = orderDetails.foods[i].total;
                                            }
                                        }
                                        if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined') {
                                            orderDetails.item_total = (orderDetails.billings.amount.total - orderDetails.billings.amount.food_offer_price).toFixed(2);
                                            orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
                                            orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.night_fee = myFormat(orderDetails.billings.amount.night_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.service_tax = myFormat(orderDetails.billings.amount.service_tax.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.grand_total = myFormat(orderDetails.billings.amount.grand_total.toFixed(2), { integerSeparator: ',' })
                                        }
                                        orderDetails.createDate = timezone.tz(orderDetails.createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.food_delivered != 'undefined') {
                                            orderDetails.order_history.food_delivered = timezone.tz(orderDetails.order_history.food_delivered, settings.settings.time_zone).format(settings.settings.date_format);
                                        }
                                    }
                                    pug.orderDetails = orderDetails;
                                    pug.logo = settings.settings.logo;
                                    pug.siteurl = settings.settings.site_url;
                                    pug.site_title = settings.settings.site_title;
                                    pug.currency_symbol = settings.settings.currency_symbol;
                                    pug.currency_code = settings.settings.currency_code;
                                    pug.userDetails = userDetails;
                                    var street = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                        street = orderDetails.delivery_address.street
                                    }
                                    var delivery_address_fulladres = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                        delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                    }
                                    var delivery_address_landmark = '---';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                        delivery_address_landmark = orderDetails.delivery_address.landmark
                                    }
                                    var foodDetails = '';
                                    for (var i = 0; i < orderDetails.foods.length; i++) {
                                        var PriceText = '';
                                        if (orderDetails.foods[i].offer_price > 0) {
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
                                                + settings.settings.currency_symbol + ' ' +
                                                orderDetails.foods[i].total + '</span><span>100</span>'
                                        } else {
                                            PriceText = '<span>' + settings.settings.currency_symbol + ' ' + orderDetails.foods[i].sub_total + '</span>'
                                        }
                                        foodDetails += '<tr class="repeat-item"><td align="center"><center><table border="0" align="center" width="100%" cellpadding="0" cellspacing="0"><tbody><tr bgcolor="#fff"><td>&nbsp;</td></tr><tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 0px 16px 17px;text-align:left;font-size:0;border-bottom: 1px solid #ddd;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].name + '</td></tr></table></div><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].quantity + '</td></tr></table></div><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + PriceText + '</td></tr></table></div></td></tr></table></td></tr></tbody></table></center></td></tr>'
                                    }
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        item_total = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Item Total</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        offer_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Offers Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        var coupon_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Coupon Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        var delivery_amount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Delivery Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        var surge_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Surge Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        var package_charge = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Package Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        var night_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Night Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        var service_tax = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var earning = '';
                                    if (orderDetails.billings.amount.restaurant_commission > 0) {
                                        var earning = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.billings.amount.restaurant_commission + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }

                                    db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                        db.GetOneDocument('drivers', { _id: driverId }, {}, {}, function (err, driverDetails) {

                                            var mailData = {};
                                            mailData.template = 'driver_accepts_toadmin';
                                            mailData.to = admin.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'admin', value: admin.username || "" });
                                            mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                            mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                            mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                            mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
                                            mailData.html.push({ name: 'DriverName', value: driverDetails.username || "" });
                                            mailData.html.push({ name: 'Driverphone', value: driverDetails.phone.code + '-' + driverDetails.phone.number || "" });
                                            mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                            mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                            mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                            mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                            mailData.html.push({ name: 'item_total', value: item_total || "" });
                                            mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                            mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                            mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                            mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                            mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                            mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                            mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                            mailData.html.push({ name: 'earning', value: earning || "" });
                                            mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });


                                            mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                            mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                            mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                            mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                            mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
                                            mailcontent.sendmail(mailData, function (err, response) {
                                                //console.log('err, response', err, response)
                                                done(null, { status: 1, response: response });
                                            });
                                        });
                                    });

                                } else {
                                    // console.log('Error in mail..!')
                                    res.send({ "status": 0, "errors": 'Error in mail..!' });
                                }
                            }
                        })
                    }
                })
            }
        })
    });

    events.on('order_delivered_toadmin', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var driverId;
        if (typeof req.driver_id != 'undefined' && req.driver_id != '') {
            if (isObjectId(req.driver_id)) {
                driverId = new mongoose.Types.ObjectId(req.driver_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                // console.log('Error in mail14..!')
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            // console.log('Error in mail15..!')
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
                //  console.log('Error in mail16..!')
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                        // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
                        //  console.log('Error in mail16..!')
                    } else {
                        var filter_query = { "user_id": userId, _id: orderId };
                        var condition = [
                            { $match: filter_query },
                            { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                            { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
                            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    orderDetails: {
                                        createdAt: "$createdAt",
                                        status: "$status",
                                        mode: "$transactionDetails.type",
                                        order_history: "$order_history",
                                        _id: "$_id",
                                        transaction_id: "$transaction_id",
                                        user_id: "$user_id",
                                        restaurant_id: "$restaurant_id",
                                        coupon_code: "$coupon_code",
                                        delivery_address: "$delivery_address",
                                        order_id: "$order_id",
                                        restaurantDetails: {
                                            restaurantname: "$restaurantDetails.restaurantname",
                                            username: "$restaurantDetails.username",
                                            email: "$restaurantDetails.email",
                                            address: "$restaurantDetails.address",
                                        },
                                        userDetails: {
                                            "name": "$userDetails.username",
                                            "status": "$userDetails.status",
                                            "phone": "$userDetails.phone",
                                            "address": "$userDetails.address",
                                            "location": "$userDetails.location",
                                            "email": "$userDetails.email",
                                            "avatar": "$userDetails.avatar",
                                            "_id": "$userDetails._id",
                                        },
                                        location: "$location",
                                        foods: {
                                            "$map": {
                                                "input": "$foods",
                                                "as": "el",
                                                "in": {
                                                    'name': '$$el.name',
                                                    'id': '$$el.id',
                                                    'description': '$$el.description',
                                                    'offer': '$$el.offer',
                                                    'price': '$$el.price',
                                                    'slug': '$$el.slug',
                                                    'status': '$$el.status',
                                                    'quantity': '$$el.quantity',
                                                    'offer_price': '$$el.offer_price',
                                                    'instruction': '$$el.instruction',
                                                    'addons': '$$el.addons',
                                                    'base_pack': '$$el.base_pack',
                                                    "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                                }
                                            }
                                        },
                                        seen_status: "$seen_status",
                                        billings: "$billings",
                                        order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            //console.log('err, docdata', err, docdata)
                            if (err || !docdata) {
                                res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                            } else {
                                if (docdata.length > 0) {
                                    var orderDetails = [];
                                    var format = require('format-number');
                                    var myFormat = format({ integerSeparator: ',' });
                                    var pug = {};
                                    if (typeof docdata[0].orderDetails != 'undefined') {
                                        orderDetails = docdata[0].orderDetails;
                                        for (var i = 0; i < orderDetails.foods.length; i++) {
                                            orderDetails.foods[i].total = myFormat(orderDetails.foods[i].total.toFixed(2), { integerSeparator: ',' });
                                            if (orderDetails.foods[i].offer_price > 0) {
                                                var offer_discount = orderDetails.foods[i].total - orderDetails.foods[i].offer_price;
                                                orderDetails.foods[i].sub_total = myFormat(offer_discount.toFixed(2), { integerSeparator: ',' })
                                            } else {
                                                orderDetails.foods[i].sub_total = orderDetails.foods[i].total;
                                            }
                                        }
                                        if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined') {
                                            orderDetails.item_total = (orderDetails.billings.amount.total - orderDetails.billings.amount.food_offer_price).toFixed(2);
                                            orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
                                            orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                           // orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
                                            //orderDetails.billings.amount.night_fee = myFormat(orderDetails.billings.amount.night_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.service_tax = myFormat(orderDetails.billings.amount.service_tax.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.grand_total = myFormat(orderDetails.billings.amount.grand_total.toFixed(2), { integerSeparator: ',' })
                                        }
                                        orderDetails.createDate = timezone.tz(orderDetails.createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.food_delivered != 'undefined') {
                                            orderDetails.order_history.food_delivered = timezone.tz(orderDetails.order_history.food_delivered, settings.settings.time_zone).format(settings.settings.date_format);
                                        }
                                    }
                                    pug.orderDetails = orderDetails;
                                    pug.logo = settings.settings.logo;
                                    pug.siteurl = settings.settings.site_url;
                                    pug.site_title = settings.settings.site_title;
                                    pug.currency_symbol = settings.settings.currency_symbol;
                                    pug.currency_code = settings.settings.currency_code;
                                    pug.userDetails = userDetails;
                                    var street = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                        street = orderDetails.delivery_address.street
                                    }
                                    var delivery_address_fulladres = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                        delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                    }
                                    var delivery_address_landmark = '---';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                        delivery_address_landmark = orderDetails.delivery_address.landmark
                                    }
                                    var foodDetails = '';
                                    for (var i = 0; i < orderDetails.foods.length; i++) {
                                        var PriceText = '';
                                        if (orderDetails.foods[i].offer_price > 0) {
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
                                                + settings.settings.currency_symbol + ' ' +
                                                orderDetails.foods[i].total + '</span><span>100</span>'
                                        } else {
                                            PriceText = '<span>' + settings.settings.currency_symbol + ' ' + orderDetails.foods[i].sub_total + '</span>'
                                        }
                                        foodDetails += '<tr class="repeat-item"><td align="center"><center><table border="0" align="center" width="100%" cellpadding="0" cellspacing="0"><tbody><tr bgcolor="#fff"><td>&nbsp;</td></tr><tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 0px 16px 17px;text-align:left;font-size:0;border-bottom: 1px solid #ddd;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].name + '</td></tr></table></div><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].quantity + '</td></tr></table></div><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + PriceText + '</td></tr></table></div></td></tr></table></td></tr></tbody></table></center></td></tr>'
                                    }
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        item_total = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Item Total</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        offer_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Offers Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        var coupon_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Coupon Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        var delivery_amount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Delivery Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        var surge_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Surge Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        var package_charge = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Package Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        var night_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Night Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        var service_tax = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var earning = '';
                                    if (orderDetails.billings.amount.restaurant_commission > 0) {
                                        var earning = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.billings.amount.restaurant_commission + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }

                                    db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                        db.GetOneDocument('drivers', { _id: driverId }, {}, {}, function (err, driverDetails) {

                                            var mailData = {};
                                            mailData.template = 'order_delivered_toadmin';
                                            mailData.to = admin.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'admin', value: admin.username || "" });
                                            mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                            mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                            mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                            mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
                                            mailData.html.push({ name: 'DriverName', value: driverDetails.username || "" });
                                            mailData.html.push({ name: 'Driverphone', value: driverDetails.phone.code + '-' + driverDetails.phone.number || "" });
                                            mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                            mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                            mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                            mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                            mailData.html.push({ name: 'item_total', value: item_total || "" });
                                            mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                            mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                            mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                            mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                            mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                            mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                            mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                            mailData.html.push({ name: 'earning', value: earning || "" });
                                            mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });


                                            mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                            mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                            mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                            mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                            mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
                                            mailcontent.sendmail(mailData, function (err, response) {
                                                //console.log('err, response', err, response)
                                                done(null, { status: 1, response: response });
                                            });
                                        });
                                    });

                                } else {
                                    // console.log('Error in mail..!')
                                    res.send({ "status": 0, "errors": 'Error in mail..!' });
                                }
                            }
                        })
                    }
                })
            }
        })
    });


    events.on('order_accepts_todriver', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var driverId;
        if (typeof req.driver_id != 'undefined' && req.driver_id != '') {
            if (isObjectId(req.driver_id)) {
                driverId = new mongoose.Types.ObjectId(req.driver_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                // console.log('Error in mail14..!')
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            // console.log('Error in mail15..!')
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
                //  console.log('Error in mail16..!')
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                        // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
                        //  console.log('Error in mail16..!')
                    } else {
                        var filter_query = { "user_id": userId, _id: orderId };
                        var condition = [
                            { $match: filter_query },
                            { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                            { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
                            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    orderDetails: {
                                        createdAt: "$createdAt",
                                        status: "$status",
                                        mode: "$transactionDetails.type",
                                        order_history: "$order_history",
                                        _id: "$_id",
                                        transaction_id: "$transaction_id",
                                        user_id: "$user_id",
                                        restaurant_id: "$restaurant_id",
                                        coupon_code: "$coupon_code",
                                        delivery_address: "$delivery_address",
                                        order_id: "$order_id",
                                        restaurantDetails: {
                                            restaurantname: "$restaurantDetails.restaurantname",
                                            username: "$restaurantDetails.username",
                                            email: "$restaurantDetails.email",
                                            address: "$restaurantDetails.address",
                                        },
                                        userDetails: {
                                            "name": "$userDetails.username",
                                            "status": "$userDetails.status",
                                            "phone": "$userDetails.phone",
                                            "address": "$userDetails.address",
                                            "location": "$userDetails.location",
                                            "email": "$userDetails.email",
                                            "avatar": "$userDetails.avatar",
                                            "_id": "$userDetails._id",
                                        },
                                        location: "$location",
                                        foods: {
                                            "$map": {
                                                "input": "$foods",
                                                "as": "el",
                                                "in": {
                                                    'name': '$$el.name',
                                                    'id': '$$el.id',
                                                    'description': '$$el.description',
                                                    'offer': '$$el.offer',
                                                    'price': '$$el.price',
                                                    'slug': '$$el.slug',
                                                    'status': '$$el.status',
                                                    'quantity': '$$el.quantity',
                                                    'offer_price': '$$el.offer_price',
                                                    'instruction': '$$el.instruction',
                                                    'addons': '$$el.addons',
                                                    'base_pack': '$$el.base_pack',
                                                    "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                                }
                                            }
                                        },
                                        seen_status: "$seen_status",
                                        billings: "$billings",
                                        order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            //console.log('err, docdata', err, docdata)
                            if (err || !docdata) {
                                res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                            } else {
                                if (docdata.length > 0) {
                                    var orderDetails = [];
                                    var format = require('format-number');
                                    var myFormat = format({ integerSeparator: ',' });
                                    var pug = {};
                                    if (typeof docdata[0].orderDetails != 'undefined') {
                                        orderDetails = docdata[0].orderDetails;
                                        for (var i = 0; i < orderDetails.foods.length; i++) {
                                            orderDetails.foods[i].total = myFormat(orderDetails.foods[i].total.toFixed(2), { integerSeparator: ',' });
                                            if (orderDetails.foods[i].offer_price > 0) {
                                                var offer_discount = orderDetails.foods[i].total - orderDetails.foods[i].offer_price;
                                                orderDetails.foods[i].sub_total = myFormat(offer_discount.toFixed(2), { integerSeparator: ',' })
                                            } else {
                                                orderDetails.foods[i].sub_total = orderDetails.foods[i].total;
                                            }
                                        }
                                        if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined') {
                                            orderDetails.item_total = (orderDetails.billings.amount.total - orderDetails.billings.amount.food_offer_price).toFixed(2);
                                            orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
                                            orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.night_fee = myFormat(orderDetails.billings.amount.night_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.service_tax = myFormat(orderDetails.billings.amount.service_tax.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.grand_total = myFormat(orderDetails.billings.amount.grand_total.toFixed(2), { integerSeparator: ',' })
                                        }
                                        orderDetails.createDate = timezone.tz(orderDetails.createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.food_delivered != 'undefined') {
                                            orderDetails.order_history.food_delivered = timezone.tz(orderDetails.order_history.food_delivered, settings.settings.time_zone).format(settings.settings.date_format);
                                        }
                                    }
                                    pug.orderDetails = orderDetails;
                                    pug.logo = settings.settings.logo;
                                    pug.siteurl = settings.settings.site_url;
                                    pug.site_title = settings.settings.site_title;
                                    pug.currency_symbol = settings.settings.currency_symbol;
                                    pug.currency_code = settings.settings.currency_code;
                                    pug.userDetails = userDetails;
                                    var street = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                        street = orderDetails.delivery_address.street
                                    }
                                    var delivery_address_fulladres = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                        delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                    }
                                    var delivery_address_landmark = '---';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                        delivery_address_landmark = orderDetails.delivery_address.landmark
                                    }
                                    var foodDetails = '';
                                    for (var i = 0; i < orderDetails.foods.length; i++) {
                                        var PriceText = '';
                                        if (orderDetails.foods[i].offer_price > 0) {
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
                                                + settings.settings.currency_symbol + ' ' +
                                                orderDetails.foods[i].total + '</span><span>100</span>'
                                        } else {
                                            PriceText = '<span>' + settings.settings.currency_symbol + ' ' + orderDetails.foods[i].sub_total + '</span>'
                                        }
                                        foodDetails += '<tr class="repeat-item"><td align="center"><center><table border="0" align="center" width="100%" cellpadding="0" cellspacing="0"><tbody><tr bgcolor="#fff"><td>&nbsp;</td></tr><tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 0px 16px 17px;text-align:left;font-size:0;border-bottom: 1px solid #ddd;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].name + '</td></tr></table></div><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].quantity + '</td></tr></table></div><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + PriceText + '</td></tr></table></div></td></tr></table></td></tr></tbody></table></center></td></tr>'
                                    }
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        item_total = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Item Total</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        offer_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Offers Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        var coupon_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Coupon Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        var delivery_amount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Delivery Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        var surge_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Surge Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        var package_charge = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Package Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        var night_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Night Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        var service_tax = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var earning = '';
                                    if (orderDetails.billings.amount.restaurant_commission > 0) {
                                        var earning = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.billings.amount.restaurant_commission + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }

                                    db.GetOneDocument('drivers', { _id: driverId }, {}, {}, function (err, driverDetails) {
                                        var mailData = {};
                                        mailData.template = 'order_accepts_todriver';
                                        mailData.to = driverDetails.email;
                                        mailData.html = [];
                                        mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                        mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                        mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                        mailData.html.push({ name: 'DriverName', value: driverDetails.username || "" });
                                        mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                        mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                        mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                        mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                        mailData.html.push({ name: 'item_total', value: item_total || "" });
                                        mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                        mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                        mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                        mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                        mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                        mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                        mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                        mailData.html.push({ name: 'earning', value: earning || "" });
                                        mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });


                                        mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                        mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                        mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                        mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                        mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
                                        /* mailcontent.sendmail(mailData, function (err, response) {
                                            done(null, { status: 1, response: response });
                                        }); */
                                    });

                                } else {
                                    // console.log('Error in mail..!')
                                    res.send({ "status": 0, "errors": 'Error in mail..!' });
                                }
                            }
                        })
                    }
                })
            }
        })
    });

    controller.driverPicked = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('order_id', 'Order ID is required').notEmpty();
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
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        db.GetOneDocument('orders', { 'order_id': request.order_id, status: { '$eq': 5 }, 'driver_id': new mongoose.Types.ObjectId(request.driver_id) }, {}, {}, function (err, ordersDetails) {
            if (err || !ordersDetails) {
                res.send({
                    'status': 0,
                    'message': 'Sorry...This order is already picked up'
                })
            }
            else {
                //console.log(ordersDetails)
                if (typeof ordersDetails.deliver_coords != 'undefined' && ordersDetails.deliver_coords.length > 0) {
                    var driver_cordinates = ordersDetails.deliver_coords.slice(-1)[0];
                }
                db.GetOneDocument('users', { _id: ordersDetails.user_id }, { _id: 1, address: 1, phone: 1 }, {}, function (userErr, userRespo) {
                    if (err || !userRespo) {
                        res.send({
                            'status': 0,
                            message: 'Invalid credentials'
                        });
                    }
                    else {
                        db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 6, 'order_history.driver_pickedup': new Date() }, {}, function (err, docdata) {
                            if (err) {
                                res.send({
                                    'status': 0,
                                    message: 'error in picking up an offer'
                                });
                            }
                            else {
                                var aggregate_data = [];
                                aggregate_data.push(
                                    { $match: { status: { $eq: 6 }, "order_id": request.order_id } },
                                    { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                                    { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                                    { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
                                    {
                                        $project: {
                                            'RestaurantDetails': {
                                                _id: '$RestaurantDetails._id',
                                                restaurant_name: '$RestaurantDetails.restaurantname',
                                                location: '$location'

                                            }, 'orderDetails': {
                                                _id: '$_id',
                                                order_id: '$order_id',
                                                confirmed: '$confirmed',
                                                user_id: '$user_id',
                                                delivery_address: '$delivery_address',
                                                foods: '$foods',
                                                billings: '$billings',
                                                location: '$location'
                                            }, 'UserDetails': {
                                                _id: '$UserDetails._id',

                                                username: '$UserDetails.username',
                                                phone: '$UserDetails.phone'
                                            }
                                        }
                                    }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
                                )

                                db.GetAggregation('orders', aggregate_data, function (err, orders) {
                                    if (err) {
                                        res.send({ 'status': 0, 'message': 'Cannot update' });
                                    }
                                    else {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            db.GetOneDocument('drivers', { _id: request.driver_id }, { _id: 1, username: 1, avatar: 1, phone: 1 }, {}, function (driverErr, driverRespo) {
                                                if (driverErr) {
                                                    res.send({ 'status': 0, 'message': 'Driver cannot be found' });
                                                }
                                                else {
                                                    var imgurl = '';
                                                    if (driverRespo.avatar) {
                                                        var imagedriver = driverRespo.avatar.split('./');
                                                        if (imagedriver[0] == '') {
                                                            imgurl = settings.settings.site_url + imagedriver[1];
                                                        } else {
                                                            imgurl = settings.settings.site_url + driverRespo.avatar;
                                                        }
                                                    } else {
                                                        imgurl = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                    }
                                                    var driver_loc = orders[0].RestaurantDetails.location;
                                                    if (driver_cordinates) {
                                                        driver_loc = driver_cordinates;
                                                    }

                                                    var android_driver1 = userRespo._id;
                                                    var message1 = CONFIG.NOTIFICATION.DRIVER_PICKEDUP;
                                                    var response_time1 = 250;

                                                    var foodcounts = 0;
                                                    for (var j = 0; j < orders[0].orderDetails.foods.length; j++) {
                                                        foodcounts = foodcounts + orders[0].orderDetails.foods[j].quantity || 0;
                                                    }

                                                    var food_count = foodcounts;
                                                    var tracking_id = ordersDetails._id;

                                                    var options1 = [request.order_id, android_driver1,
                                                    orders[0].RestaurantDetails.restaurant_name, food_count, orders[0].orderDetails.billings.amount.grand_total, orders[0].orderDetails.location, driver_loc, driverRespo.username, driverRespo.phone, imgurl, tracking_id];
                                                    push.sendPushnotification(android_driver1, message1, 'driver_pickedup', 'ANDROID', options1, 'USER', function (err, response, body) { });


                                                    var android_restaurant = orders[0].RestaurantDetails._id;
                                                    var message = CONFIG.NOTIFICATION.DRIVER_PICKEDUP;
                                                    var response_time = CONFIG.respond_timeout;
                                                    var action = 'driver_pickedup';
                                                    var options = [orders[0].orderDetails.order_id, android_restaurant, response_time, action];
                                                    for (var i = 1; i == 1; i++) {
                                                        push.sendPushnotification(android_restaurant, message, 'driver_pickedup', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                    }
                                                    var data = {};
                                                    data.restaurant_id = orders[0].RestaurantDetails._id;
                                                    data.username = orders[0].UserDetails[0].username[0];
                                                    data.userPhone = orders[0].UserDetails[0].phone;
                                                    data.restaurant_name = orders[0].RestaurantDetails.restaurant_name;
                                                    data.order_id = orders[0].orderDetails.order_id;
                                                    data.confirmed = orders[0].orderDetails.confirmed;
                                                    data.order_address = orders[0].orderDetails.delivery_address;
                                                    data.food_details = orders[0].orderDetails.foods;
                                                    io.of('/chat').in(orders[0].orderDetails._id).emit('OrderUpdated', { orderId: orders[0].orderDetails._id, status: 5 });
                                                    var noti_data = {};
                                                    noti_data.rest_id = orders[0].RestaurantDetails._id;
                                                    noti_data.order_id = orders[0].orderDetails.order_id;
                                                    noti_data.user_id = orders[0].orderDetails.user_id;
                                                    noti_data._id = orders[0].orderDetails._id;
                                                    noti_data.user_name = driverRespo.username;
                                                    noti_data.order_type = 'driver_picked';
                                                    io.of('/chat').in(data.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                    io.of('/chat').in(orders[0].orderDetails.user_id).emit('usernotify', noti_data);
                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                    mailData = {};
                                                    mailData.template = 'driver_picked_order';
                                                    mailData.to = userRespo.email;
                                                    mailData.html = [];
                                                    mailData.html.push({ name: 'name', value: userRespo.username || "" });
                                                    mailcontent.sendmail(mailData, function (err, response) { });
                                                    res.send({ 'status': 1, message: 'driver picked', details: data });
                                                }
                                            })
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

    controller.calcDistance = (history) => {

        var arr = history.split(',');
        var totDist = [];
        for (i in arr) {
            if (arr[i] != '') {
                var ar = arr[i].toString().split(';');
                totDist.push({ lat: ar[0], long: ar[1] });
            }
        }

        var R = 6371;
        var totalDistance = 0;
        if (totDist.length > 1) {
            var count = 0;

            for (var i = 0; i < totDist.length; i++) {
                if ((totDist[i].lat == 0.0 || totDist[i + 1].lat == 0.0) || (totDist[i].long == 0.0 || totDist[i + 1].long == 0.0)) {
                    if (i + 1 == totDist.length - 1) {
                        break;
                    }
                    continue;
                }
                else {
                    var Lat = (totDist[i].lat - totDist[i + 1].lat) * (Math.PI / 180);
                    var Long = (totDist[i].long - totDist[i + 1].long) * (Math.PI / 180);
                    var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(totDist[i + 1].lat * (Math.PI / 180)) * Math.cos(totDist[i].lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                    var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                    var d = R * c;

                    totalDistance = parseFloat(totalDistance) + parseFloat(d)
                    count = count + 1;
                    if (i + 1 == totDist.length - 1) {
                        break;
                    }
                }
            }
        }
        return { lats: totDist, distance: totalDistance }
    }

    function getDeliveryAddress(req) {
        var neADAta = {};
        db.GetOneDocument('settings', { "alias": "social_networks" }, {}, {}, (err, settings) => {
            if (err || !settings) {
                return neADAta;
            } else {
                var apiKey = settings.settings.map_api.web_key;
                var NodeGeocoder = require('node-geocoder');
                var options = {
                    provider: 'google',
                    httpAdapter: 'https',
                    apiKey: apiKey,
                    formatter: null
                };
                var geocoder = NodeGeocoder(options);
                neADAta.address = {};
                geocoder.reverse({
                    lat: req.body.lat,
                    lon: req.body.lng
                }, function (err, locat) {
                    if (typeof locat != 'undefined' && locat.length > 0) {
                        if (locat[0].formattedAddress)
                            neADAta.address.address = locat[0].formattedAddress;
                        else
                            neADAta.address.address = '';
                        if (locat[0].zipcode)
                            neADAta.address.zipcode = locat[0].zipcode;
                        else
                            neADAta.address.zipcode = '';
                        if (locat[0].administrativeLevels.level1long)
                            neADAta.address.state = locat[0].administrativeLevels.level1long;
                        else
                            neADAta.address.state = '';
                        if (locat[0].country)
                            neADAta.address.country = locat[0].country;
                        else
                            neADAta.address.country = '';
                        if (locat[0].city)
                            neADAta.address.city = locat[0].city;
                        else
                            neADAta.address.city = ''
                        if (locat[0].extra.neighborhood)
                            neADAta.address.line1 = locat[0].extra.neighborhood;
                        else
                            neADAta.address.line1 = '';

                        return neADAta;
                    } else {
                        var geocode = {
                            'latitude': req.body.lat,
                            'longitude': req.body.lng
                        };
                        GoogleAPI.geocode(geocode, function (response) {
                            if (typeof response != 'undefined' && response.length > 0 && response[0].address_components) {
                                response[0].address_components.forEach(function (item) {
                                    switch (item.types[0]) {
                                        case "postal_code":
                                            neADAta.address.zipcode = item.long_name;
                                            break;
                                        case "country":
                                            neADAta.address.country = item.long_name;
                                            break;
                                        case "administrative_area_level_1":
                                            neADAta.address.state = item.long_name;
                                            break;
                                        case "locality":
                                            neADAta.address.line1 = item.long_name;
                                            break;
                                        case "administrative_area_level_2":
                                            neADAta.address.city = item.long_name;
                                            break;
                                    }
                                })
                                return neADAta;
                            }
                        })
                    }
                })
            }
        })
    }

    controller.orderDelivered = function (req, res) {
        req.checkBody('driver_id', 'driver id is required').notEmpty();
        req.checkBody('order_id', 'orderId is Required').notEmpty();
        req.checkBody('lat', 'lat is required').notEmpty();
        req.checkBody('lng', 'long is required').notEmpty();
        req.checkBody('distance', 'Distance is required').notEmpty();
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
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        request.distance = req.body.distance;

        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
        request.diff_offset = diff_offset;

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err) {
                res.send({ "status": 0, "errors": ' Error in settings' });
            } else {
                db.GetOneDocument('orders', { 'order_id': request.order_id, status: { '$eq': 6 }, 'driver_id': new mongoose.Types.ObjectId(request.driver_id) }, {}, {}, function (err, orders) {
                    if (err || !orders) {
                        res.send({ 'status': 0, 'message': ' Sorry...This order could have been delivered already' });
                    } else {
                        var neADAta = getDeliveryAddress(req);
                        var travel_history = [];
                        if (typeof orders.deliver_coords != 'undefined' && orders.deliver_coords.length > 0) {
                            travel_history.concat(orders.deliver_coords)
                        }
                        if (typeof orders.pickup_coords != 'undefined' && orders.pickup_coords.length > 0) {
                            travel_history.concat(orders.pickup_coords);
                        }
						/* if(travel_history.length > 0){
							var obj = controller.calcDistance(travel_history);
							var travelled_distance = parseFloat(obj.distance);
							request.distance = travelled_distance.toFixed(2);
						} */
                        db.GetOneDocument('city', { _id: orders.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                            if (err || !rest) {
                                res.send({ "status": 0, "errors": ' Error in city..!' });
                            } else {
                                db.GetOneDocument('drivers', { _id: request.driver_id, status: { $eq: 1 } }, {}, {}, function (err, driverrespo) {
                                    if (err || !driverrespo) {
                                        res.send({ "status": 0, "errors": ' Error in driver..!' });
                                    } else {
                                        db.GetOneDocument('transaction', { "_id": orders.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
                                            if (err || !transactionDetails) {
                                                res.send({ "status": 0, "errors": ' Invalid Error, Please check your data' });
                                            } else {
                                                if (transactionDetails.type == 'stripe') {
                                                    db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
                                                        if (err || !paymentgateway) {
                                                            res.send({ "status": "0", "errors": ' Invalid payment method, Please contact the website administrator..!' });
                                                        } else {
                                                            stripe.setApiKey(paymentgateway.settings.secret_key);
                                                            var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
                                                            if (charge_index != -1) {
                                                                var charge_id = transactionDetails.transactions[charge_index].gateway_response.id
                                                                stripe.charges.retrieve(charge_id, function (err, retrieve) {
                                                                    if (err) {
                                                                        var updateData = { 'paid': 0 };
                                                                        db.UpdateDocument('orders', { 'order_id': request.order_id }, updateData, {}, function (err, docdata) {
                                                                        })
                                                                    } else {
                                                                        var updatedoc = { 'mode': 'retrieve', $push: { 'transactions': { gateway_response: retrieve } } };
                                                                        db.UpdateDocument('transaction', { '_id': orders.transaction_id }, updatedoc, {}, function (err, response) {
                                                                        })
                                                                    }
                                                                });
                                                                var updateData = { 'status': 7, 'order_history.food_delivered': new Date(), 'delivery_address.address': neADAta };
                                                                db.UpdateDocument('orders', { 'order_id': request.order_id }, updateData, {}, function (err, docdata) {
                                                                    if (err) {
                                                                        res.send({ 'status': 0, 'message': ' Error in updating' });
                                                                    } else {
                                                                        events.emit('order_update_status', req, request, orders, function (err, result) {
                                                                            if (err && err != null) {
                                                                                res.send(err);
                                                                            } else {
                                                                                result.grand_total = orders.billings.amount.grand_total;
                                                                                result.payment_mode = transactionDetails.type;
                                                                                res.send(result);
                                                                            }
                                                                        });
                                                                    }
                                                                })
                                                            } else {
                                                                res.send({ "status": "0", "errors": ' Invalid payment method, Please contact the website administrator..!' });
                                                            }
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'paypal') {
                                                    db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
                                                        if (err || !paymentgateway) {
                                                            res.send({ "status": "0", "errors": ' Invalid payment method, Please contact the website administrator..!' });
                                                        } else {
                                                            var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.intent }).indexOf('authorize');
                                                            if (charge_index != -1) {
                                                                if (typeof transactionDetails.transactions[charge_index].gateway_response.transactions != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization != 'undefined') {
                                                                    var authorization_id = transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization.id;
                                                                    var capture_details = {
                                                                        "amount": {
                                                                            "currency": "USD",
                                                                            "total": parseFloat(orders.billings.amount.grand_total)
                                                                        },
                                                                        "is_final_capture": true
                                                                    };
                                                                    paypal.authorization.capture(authorization_id, capture_details, function (error, capture) {
                                                                        if (error) {
                                                                            res.send({ "status": "0", "errors": 'Something went wrong.Please try again' });
                                                                        } else {
                                                                            var updatedoc = { 'mode': 'capture', $push: { 'transactions': { gateway_response: capture } } };
                                                                            db.UpdateDocument('transaction', { '_id': orders.transaction_id }, updatedoc, {}, function (err, response) {
                                                                            })
                                                                        }
                                                                    });
                                                                    var updateData = { 'status': 7, 'order_history.food_delivered': new Date(), 'delivery_address.address': neADAta };
                                                                    db.UpdateDocument('orders', { 'order_id': request.order_id }, updateData, {}, function (err, docdata) {
                                                                        if (err) {
                                                                            res.send({ 'status': 0, 'message': ' Error in updating' });
                                                                        } else {
                                                                            events.emit('order_update_status', req, request, orders, function (err, result) {
                                                                                if (err && err != null) {
                                                                                    res.send(err);
                                                                                } else {
                                                                                    result.grand_total = orders.billings.amount.grand_total;
                                                                                    result.payment_mode = transactionDetails.type;
                                                                                    res.send(result);
                                                                                }
                                                                            });
                                                                        }
                                                                    })
                                                                } else {
                                                                    res.send({ "status": "0", "errors": ' Invalid payment method, Please contact the website administrator..!' });
                                                                }
                                                            } else {
                                                                res.send({ "status": "0", "errors": ' Invalid payment method, Please contact the website administrator..!' });
                                                            }
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'nopayment') {
                                                    var updateData = { 'status': 7, 'order_history.food_delivered': new Date(), 'delivery_address.address': neADAta };
                                                    db.UpdateDocument('orders', { 'order_id': request.order_id }, updateData, {}, function (err, docdata) {
                                                        if (err) {
                                                            res.send({ 'status': 0, 'message': ' Error in updating' });
                                                        } else {
                                                            events.emit('order_update_status', req, request, orders, function (err, result) {
                                                                if (err && err != null) {
                                                                    res.send(err);
                                                                } else {
                                                                    result.grand_total = orders.billings.amount.grand_total;
                                                                    result.payment_mode = transactionDetails.type;
                                                                    res.send(result);
                                                                }
                                                            });
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'COD') {
                                                    var updateData = { 'status': 7, 'order_history.food_delivered': new Date(), 'delivery_address.address': neADAta };
                                                    db.UpdateDocument('orders', { 'order_id': request.order_id }, updateData, {}, function (err, docdata) {
                                                        if (err) {
                                                            res.send({ 'status': 0, 'message': ' Error in updating' });
                                                        } else {
                                                            events.emit('order_update_status', req, request, orders, function (err, result) {
                                                                if (err && err != null) {
                                                                    res.send(err);
                                                                } else {
                                                                    db.GetOneDocument('orders', { 'order_id': request.order_id, status: { '$eq': 7 }, 'driver_id': new mongoose.Types.ObjectId(request.driver_id) }, {}, {}, function (err, orderDetails) {
                                                                        if (err || !orderDetails) {
                                                                            res.send({ 'status': 0, 'message': ' Error in order..!' });
                                                                        } else {
                                                                            var baseprice = 0
                                                                            if (typeof orderDetails.driver_fare != 'undefined' && typeof orderDetails.driver_fare.baseprice != 'undefined') {
                                                                                baseprice = orderDetails.driver_fare.baseprice;
                                                                            }
                                                                            var travelled_amount = 0;
                                                                            if (typeof orderDetails.mileages_travelled != 'undefined' && orderDetails.mileages_travelled > 0 && typeof orderDetails.driver_fare != 'undefined' && typeof orderDetails.driver_fare.format != 'undefined') {
                                                                                var minimum_distance = 0;
                                                                                if (typeof orderDetails.driver_fare.minimum_distance != 'undefined') {
                                                                                    minimum_distance = orderDetails.driver_fare.minimum_distance;
                                                                                }
                                                                                var extra_price = 0;
                                                                                if (typeof orderDetails.driver_fare.extra_price != 'undefined') {
                                                                                    extra_price = orderDetails.driver_fare.extra_price;
                                                                                }
                                                                                if (orderDetails.driver_fare.format == 'mile') {
                                                                                    var calculated_travel_distance = (orderDetails.mileages_travelled / 1.609344) - minimum_distance;
                                                                                    travelled_amount = calculated_travel_distance * extra_price;
                                                                                } else {
                                                                                    var calculated_travel_distance = orderDetails.mileages_travelled - minimum_distance;
                                                                                    travelled_amount = calculated_travel_distance * extra_price;
                                                                                }
                                                                            }
                                                                            var surge_fee_amount = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.surge_fee != 'undefined' && orderDetails.billings.amount.surge_fee > 0) {
                                                                                var extra_fare_commision = 0;
                                                                                if (typeof orderDetails.extra_fare_commision != 'undefined') {
                                                                                    extra_fare_commision = orderDetails.extra_fare_commision;
                                                                                }
                                                                                surge_fee_amount = orderDetails.billings.amount.surge_fee * (extra_fare_commision / 100);
                                                                            }
                                                                            var night_fee_amount = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.night_fee != 'undefined' && orderDetails.billings.amount.night_fee > 0) {
                                                                                var night_fare_commision = 0;
                                                                                if (typeof orderDetails.night_fare_commision != 'undefined') {
                                                                                    night_fare_commision = orderDetails.night_fare_commision;
                                                                                }
                                                                                night_fee_amount = orderDetails.billings.amount.night_fee * (night_fare_commision / 100);
                                                                            }
                                                                            var customar_paid_amount = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.total != 'undefined' && orderDetails.billings.amount.total > 0) {
                                                                                customar_paid_amount = orderDetails.billings.amount.total;
                                                                            }
                                                                            var service_tax = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.service_tax != 'undefined' && orderDetails.billings.amount.service_tax > 0) {
                                                                                service_tax = orderDetails.billings.amount.service_tax;
                                                                            }
                                                                            var package_charge = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.package_charge != 'undefined' && orderDetails.billings.amount.package_charge > 0) {
                                                                                package_charge = orderDetails.billings.amount.package_charge;
                                                                            }
                                                                            var offer_discount = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.offer_discount != 'undefined' && orderDetails.billings.amount.offer_discount > 0) {
                                                                                offer_discount = orderDetails.billings.amount.offer_discount;
                                                                            }
                                                                            var food_offer_price = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.food_offer_price != 'undefined' && orderDetails.billings.amount.food_offer_price > 0) {
                                                                                food_offer_price = orderDetails.billings.amount.food_offer_price;
                                                                            }
                                                                            var applied_admin_com = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.applied_admin_com != 'undefined' && orderDetails.billings.amount.applied_admin_com > 0) {
                                                                                applied_admin_com = orderDetails.billings.amount.applied_admin_com;
                                                                            }

                                                                            var grand_total = 0;
                                                                            if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined' && typeof orderDetails.billings.amount.grand_total != 'undefined' && orderDetails.billings.amount.grand_total > 0) {
                                                                                grand_total = orderDetails.billings.amount.grand_total;
                                                                            }

                                                                            var applied_admin_percentage = 0;
                                                                            if (applied_admin_com > 0) {
                                                                                applied_admin_percentage = applied_admin_com / 100;
                                                                            }
                                                                            var site_commission = (customar_paid_amount - (offer_discount + food_offer_price)) * applied_admin_percentage;
                                                                            var restaurant_commission = (customar_paid_amount + package_charge) - (offer_discount + food_offer_price + site_commission);
                                                                            var driverCommision = baseprice + travelled_amount + surge_fee_amount + night_fee_amount;

																			/* if(typeof settings.settings.bir_tax != 'undefined'){
																				var bir_tax_amount = (( driverCommision * settings.settings.bir_tax)/100);
																				driverCommision = driverCommision - bir_tax_amount;
																			}else{
																				var bir_tax_amount = 0;
																			} */

                                                                            // var admin_commission = grand_total - (restaurant_commission + driverCommision);
                                                                            var admin_commission = grand_total - driverCommision;
                                                                            var wallet_payment_details = {};
                                                                            wallet_payment_details.admin_amount = admin_commission;
                                                                            if (admin_commission > 0) {
                                                                                db.GetOneDocument('drivers', { _id: request.driver_id, status: { $eq: 1 } }, {}, {}, function (err, driverrespo) {
                                                                                    if (err || !driverrespo) {
                                                                                        res.send({ "status": 0, "errors": ' Error in driver..!' });
                                                                                    } else {
                                                                                        var update_wallet_available_amount = 0;
                                                                                        if (typeof driverrespo.wallet_settings != 'undefined' && typeof driverrespo.wallet_settings.available != 'undefined') {
                                                                                            update_wallet_available_amount = driverrespo.wallet_settings.available - admin_commission;
                                                                                        }
                                                                                        var update_wallet_used_amount = 0;
                                                                                        if (typeof driverrespo.wallet_settings != 'undefined' && typeof driverrespo.wallet_settings.used != 'undefined') {
                                                                                            update_wallet_used_amount = driverrespo.wallet_settings.used + admin_commission;
                                                                                        }
                                                                                        var pending_wallet_amount = 0;
                                                                                        if (update_wallet_available_amount < 0) {
                                                                                            var pending_wallet_amount = admin_commission - driverrespo.wallet_settings.available;
                                                                                            var data = { amount: pending_wallet_amount, order_id: orderDetails._id, timestamp: Date.now() };
                                                                                            var updateData = { $push: { 'wallet_pending_payment': data } };
                                                                                            db.UpdateDocument('drivers', { '_id': driverrespo._id }, updateData, {}, function (err, docdata) {
                                                                                            })
                                                                                            update_wallet_available_amount = 0;
                                                                                        }
                                                                                        wallet_payment_details.driver_pending_amount = pending_wallet_amount;
                                                                                        var updateData = { 'wallet_settings.available': update_wallet_available_amount, 'wallet_settings.used': update_wallet_used_amount };
                                                                                        db.UpdateDocument('drivers', { '_id': driverrespo._id }, updateData, {}, function (err, docdata) {
                                                                                        })
                                                                                        // var updateData = { 'wallet_payment_details': wallet_payment_details, 'billings.amount.bir_tax_amount' : bir_tax_amount};
                                                                                        var updateData = { 'wallet_payment_details': wallet_payment_details };
                                                                                        db.UpdateDocument('orders', { '_id': orderDetails._id }, updateData, {}, function (err, docdata) {
                                                                                        })
                                                                                        var recordId = new mongoose.Types.ObjectId();
                                                                                        var from = driverrespo._id;
                                                                                        var activity = orderDetails._id;
                                                                                        var type = 'driver_order_delivery';
                                                                                        var amount = admin_commission;
                                                                                        var InsertData = { _id: recordId, from: from, activity: activity, type: type, amount: amount, reason: '', orderId: orderDetails._id, available_amount: update_wallet_available_amount };
                                                                                        db.InsertDocument('driver_wallet', InsertData, function (err, document) {
                                                                                        });
                                                                                        result.grand_total = orders.billings.amount.grand_total;
                                                                                        result.payment_mode = transactionDetails.type;
                                                                                        res.send(result);
                                                                                    }
                                                                                })
                                                                            } else {
                                                                                wallet_payment_details.admin_pending_amount = -(admin_commission);
                                                                                // var updateData = { 'wallet_payment_details': wallet_payment_details, 'billings.amount.bir_tax_amount' : bir_tax_amount};
                                                                                var updateData = { 'wallet_payment_details': wallet_payment_details };
                                                                                db.UpdateDocument('orders', { '_id': orderDetails._id }, updateData, {}, function (err, docdata) {
                                                                                });
                                                                                result.grand_total = orders.billings.amount.grand_total;
                                                                                result.payment_mode = transactionDetails.type;
                                                                                res.send(result);
                                                                            }
                                                                        }
                                                                    })
                                                                }
                                                            });
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'cashfree') {
                                                    db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'cashfree' }, {}, {}, function (err, paymentgateway) {
                                                        if (err || !paymentgateway) {
                                                            res.send({ "status": "0", "errors": ' Invalid payment method, Please contact the website administrator..!' });
                                                        } else {
                                                            var updateData = { 'status': 7, 'order_history.food_delivered': new Date(), 'delivery_address.address': neADAta };
                                                            db.UpdateDocument('orders', { 'order_id': request.order_id }, updateData, {}, function (err, docdata) {
                                                                if (err) {
                                                                    res.send({ 'status': 0, 'message': ' Error in updating' });
                                                                } else {
                                                                    events.emit('order_update_status', req, request, orders, function (err, result) {
                                                                        if (err && err != null) {
                                                                            res.send(err);
                                                                        } else {
                                                                            result.grand_total = orders.billings.amount.grand_total;
                                                                            result.payment_mode = transactionDetails.type;
                                                                            res.send(result);
                                                                        }
                                                                    });
                                                                }
                                                            })
                                                        }
                                                    })
                                                } else {
                                                    res.send({ "status": 0, "errors": library.getlanguage(req, 'ADA.back-end.INVALID_ERR_CHECK_DATA', ' Invalid Error, Please check your data') });
                                                }
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


    events.on('order_update_status', function (req, request, orders, done) {
        var aggregation_data = [
            { $match: { status: { $eq: 7 }, "order_id": request.order_id } },
            { $lookup: { from: "city", localField: "city_id", foreignField: "_id", as: "RestaurantDetails" } },
            { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
            {
                $project: {
                    'RestaurantDetails': {
                        _id: '$RestaurantDetails._id',
                        //restaurant_name: '$RestaurantDetails.restaurantname',
                        address: '$RestaurantDetails.address',
                        main_city: '$RestaurantDetails.cityname',
                        //sub_city: '$RestaurantDetails.sub_city'
                    }, 'orderDetails': {
                        _id: '$_id',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt',
                        status: '$status',
                        order_id: '$order_id',
                        delivery_address: '$delivery_address',
                        foods: '$foods',
                        billings: '$billings',
                        mileages_travelled: '$mileages_travelled'

                    }, 'UserDetails': {
                        _id: '$UserDetails._id',
                        address: '$UserDetails.address',
                        location: '$UserDetails.location',
                        username: '$UserDetails.username'
                    }
                }
            }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
        ];
        db.GetAggregation('orders', aggregation_data, function (err, docdata) {
            if (err || !docdata) {
                done({ 'status': 0, 'message': 'error in getting data' }, null)
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err) {
                        res.send({ "status": 0, "errors": 'Error in settings' });
                    } else {
                        db.GetDocument('city', { 'cityname': { $eq: docdata[0].RestaurantDetails.main_city } }, {}, {}, function (err, docs) {
                            if (err) {
                                done({ 'status': 0, 'error': err }, null)
                            } else {
                                // db.GetOneDocument('restaurant', { _id: orders.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                                //     if (err || !rest) {
                                //         done({ "status": 0, "errors": ' Error in restaurant..!' }, null)
                                //     } else {
                                        // db.GetOneDocument('rcategory', { _id: rest.rcategory, status: { $eq: 1 } }, {}, {}, function (err, rcat) {
                                        //     if (err || !rcat) {
                                        //         done({ "status": 0, "errors": ' Error in catagory..!' }, null)
                                        //     } else {
                                                db.GetOneDocument('drivers', { _id: request.driver_id, status: { $eq: 1 } }, {}, {}, function (err, driverrespo) {
                                                    if (err || !driverrespo) {
                                                        done({ "status": 0, "errors": ' Error in driver..!' }, null)
                                                    } else {
                                                        let lat = 0;
                                                        let lon = 0;
                                                        if (docdata[0].RestaurantDetails && docdata[0].RestaurantDetails.location) {
                                                            lat = docdata[0].RestaurantDetails.location.lat;
                                                            lon = docdata[0].RestaurantDetails.location.lng;
                                                        }
                                                        let dlat = 0;
                                                        let dlon = 0;
                                                        if (docdata[0].orderDetails && docdata[0].orderDetails.delivery_address && docdata[0].orderDetails.delivery_address.loc) {
                                                            dlat = docdata[0].orderDetails.delivery_address.loc.lat;
                                                            dlon = docdata[0].orderDetails.delivery_address.loc.lng;
                                                        }
                                                        db.GetOneDocument('settings', { "alias": "social_networks" }, {}, {}, (err, socialsettings) => {
                                                            
                                                            if (err || !socialsettings) {
                                                                done({ "status": 0, "errors": ' Error in social settings..!' }, null)
                                                            } else {
                                                                var apiKey = socialsettings.settings.map_api.web_key;
                                                                var distance = require('google-distance-matrix');
                                                                distance.key(apiKey);
                                                                distance.units('imperial');
                                                                let from = [lat.toString() + ',' + lon.toString()];
                                                                let to = [dlat.toString() + ',' + dlon.toString()];
                                                                distance.matrix(from, to, function (err, distances) {
                                                                    if (distances.rows[0].elements[0].status == 'OK') {
                                                                        request.distance = distances.rows[0].elements[0].distance.value / 1000;
                                                                    }
                                                                    //var resttotal = rest.deliverd + 1;
                                                                    var drivtotal = driverrespo.deliverd + 1;
                                                                    //db.UpdateDocument('restaurant', { '_id': orders.restaurant_id }, { 'deliverd': resttotal }, {}, (err, restdeli) => { });
                                                                    db.UpdateDocument('drivers', { '_id': req.body.driver_id }, { 'deliverd': drivtotal }, {}, (err, drideli) => { });
                                                                    var com_type = 'common';
                                                                    var admin_com = 0;
                                                                    if (com_type == 'common') {
                                                                        admin_com = docs[0].admin_commission
                                                                    } else {
                                                                        admin_com = rest.unique_commission.admin_commission;
                                                                    }
                                                                    if (typeof admin_com == 'undefined' || admin_com == null) {
                                                                        admin_com = 0;
                                                                    }
                                                                    var main_city = docdata[0].RestaurantDetails.main_city;
                                                                    //var sub_city = docdata[0].RestaurantDetails.sub_city;
                                                                    var rest_com = 0;
                                                                    var add_com = 0;
                                                                    var rest_temp = (orders.billings.amount.total - (orders.billings.amount.offer_discount + orders.billings.amount.food_offer_price)).toFixed(2);
                                                                    var rest_temp1 = ((parseFloat(admin_com) / 100) * rest_temp);//admin comision
                                                                    add_com = (rest_temp1).toFixed(2);
                                                                    rest_com = (rest_temp - rest_temp1 + orders.billings.amount.service_tax + orders.billings.amount.package_charge).toFixed(2);
                                                                    var applied_admin_com = admin_com;
                                                                    var tax_grand = orders.billings.amount.grand_total - orders.billings.amount.service_tax;
                                                                    var admin = (((parseFloat(admin_com) / 100) * parseFloat(tax_grand)) + parseFloat(orders.billings.amount.night_fee) + parseFloat(orders.billings.amount.surge_fee) + parseFloat(orders.billings.amount.delivery_amount)).toFixed(2) || 0;
                                                                    var admin_commission_with_driver = parseFloat(admin).toFixed(2);
                                                                    var admin_commission = (parseFloat(admin_commission_with_driver) - parseFloat(orders.billings.amount.driver_commission)).toFixed(2);
                                                                    var driver_commission = 0;
                                                                    driver_commission = driver_commission + parseFloat(orders.billings.amount.driver_commission) + parseFloat(docs[0].driver_fare.baseprice);
                                                                    var claculted_distance = request.distance;
                                                                    var minimum_distance = 0;
                                                                    if (typeof docs[0].driver_fare.minimum_distance != 'undefined') {
                                                                        minimum_distance = docs[0].driver_fare.minimum_distance;
                                                                        if (docs[0].driver_fare.format != 'km') {
                                                                            claculted_distance = ((request.distance / 1.609344) - parseInt(docs[0].driver_fare.minimum_distance)); //convert to miles
                                                                        } else {
                                                                            claculted_distance = request.distance - parseInt(docs[0].driver_fare.minimum_distance);
                                                                        }
                                                                        if (claculted_distance < 0) {
                                                                            claculted_distance = 0;
                                                                        }
                                                                    }
                                                                    var surge_fee = orders.billings.amount.surge_fee;
                                                                    if (surge_fee > 0) {
                                                                        surge_fee = (surge_fee * (docs[0].extra_fare_settings.driver_share / 100));
                                                                    }
                                                                    var night_fee = orders.billings.amount.night_fee;
                                                                    if (night_fee > 0) {
                                                                        night_fee = (night_fee * (docs[0].night_fare_settings.driver_share / 100));
                                                                    }
                                                                    driver_commission = parseFloat(driver_commission) + parseFloat((claculted_distance * docs[0].driver_fare.extra_price));
                                                                    driver_commission = parseFloat(driver_commission);
																	/* if(typeof settings.settings.bir_tax != 'undefined'){
																		var bir_tax_amount = parseFloat(driver_commission * ( parseFloat(settings.settings.bir_tax/100) ));
																		driver_commission_res = parseFloat(driver_commission - bir_tax_amount);
																	}else{
																		var bir_tax_amount = 0;
																	} */
                                                                    var total_commission = (parseFloat(orders.billings.amount.grand_total) - parseFloat(admin_commission_with_driver)).toFixed(2) || 0;
                                                                    var restaurant_comm = (parseFloat(total_commission) + parseFloat(orders.billings.amount.package_charge)).toFixed(2) || 0;
                                                                    var total_offer = (parseFloat(orders.billings.amount.food_offer_price || 0) + parseFloat(orders.billings.amount.offer_discount || 0));
                                                                    var restaurant_commission = (parseFloat(restaurant_comm) - parseFloat(total_offer)).toFixed(2) || 0;
                                                                    let driver_fare = {};
                                                                    driver_fare.baseprice = docs[0].driver_fare.baseprice;
                                                                    driver_fare.format = docs[0].driver_fare.format;
                                                                    db.UpdateDocument('orders', { 'order_id': request.order_id }, {
 
                                                                        'main_city': main_city,
                                                                        'mileages_travelled': request.distance,
                                                                        'minimum_distance': request.distance
                                                                    }, {}, function (err, updated) {
                                                                        console.log(err)
                                                                        if (err) {
                                                                            done({ 'status': 0, 'message': library.getlanguage(req, 'ADA.back-end.ERR_UPDATING', ' Error in updating') }, null)
                                                                        }
                                                                        else {
                                                                            db.GetCount('orders', { driver_id: mongoose.Types.ObjectId(req.body.driver_id), status: { $in: [5, 6] } }, (err, count) => {
                                                                                let jobcount = count || 0;
                                                                                db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id) }, { 'currentJob': jobcount }, {}, (err, upd) => {
                                                                                    var driverToRest = 0.00;
                                                                                    var restToUser = 0.00;
                                                                                    var totalEarnings = 0, totalkms = 0;
                                                                                    totalEarnings = parseFloat(totalEarnings) + parseFloat(docs[0].driver_fare.baseprice);
                                                                                    totalkms = request.distance || 0;
                                                                                    totalkms = parseFloat(totalkms);
                                                                                    totalEarnings = parseFloat(totalEarnings) + parseFloat((totalkms * docs[0].driver_fare.extra_price));
                                                                                    totalEarnings = parseFloat(totalEarnings);
                                                                                    docdata[0].expectedEarnings = driver_commission;
                                                                                    var data = {};
                                                                                    data.base_fare = docs[0].driver_fare.baseprice;
                                                                                    data.minimum_distance = docs[0].driver_fare.minimum_distance;
                                                                                    data.total_kms = totalkms > docs[0].driver_fare.minimum_distance ? totalkms - docs[0].driver_fare.minimum_distance : totalkms;
                                                                                    data.total_kms = data.total_kms > 0 ? parseFloat(data.total_kms) : 0;
                                                                                    data.mileage_travelled = data.total_kms > 0 ? (data.total_kms * docs[0].driver_fare.extra_price) : 0;
                                                                                    data.mileage_travelled = parseFloat(data.mileage_travelled).toFixed(2)
                                                                                    data.total_kms = parseFloat(data.total_kms).toFixed(2);
                                                                                    data.price_per_km = docs[0].driver_fare.extra_price;
                                                                                    data.estimated_amount = driver_commission;
                                                                                    var date = ((new Date()).getTime()) + request.diff_offset;
                                                                                    data.date = moment(new Date(date)).format(settings.settings.date_format) + ' ' + moment(new Date(date)).format(settings.settings.time_format);
                                                                                    data.customar_paid_amount = orders.billings.amount.grand_total;
                                                                                    data.surge_fee = surge_fee;
                                                                                    data.night_fee = night_fee;
                                                                                    /* data.bir_tax_amount = bir_tax_amount;
                                                                                    data.bir_tax_percent = settings.settings.bir_tax; */
                                                                                    io.of('/chat').in(orders._id).emit('OrderUpdated', { orderId: orders._id });
                                                                                    // let rewardcall = async () => {
                                                                                    //     let reward = await library.rewardUpdate(docdata);
                                                                                    //     if (reward.status == 1 && reward.reached == 1) {
                                                                                    //         let options = [request.order_id, orders.user_id];
                                                                                    //         let message = 'You have reached your milestone';
                                                                                    //         push.sendPushnotification(orders.user_id, message, 'reached_milestone', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                    //         io.of('/chat').emit('r2e_user_milestone', { userId: orders.user_id, message: message });
                                                                                    //     }
                                                                                    // }

                                                                                    // if (rcat.is_reward && rcat.is_reward == '1') {
                                                                                    //     rewardcall();
                                                                                    // }
                                                                                    done(null, { 'status': 1, message: 'Delivered successfully', data: data })
                                                                                    var options = [request.order_id, orders.user_id];
                                                                                    var message = CONFIG.NOTIFICATION.FOOD_DELIVERED;
                                                                                    push.sendPushnotification(orders.user_id, message, 'driver_deliverd', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                    var android_restaurant = orders.city_id;
                                                                                    var message = CONFIG.NOTIFICATION.FOOD_DELIVERED;
                                                                                    var response_time = CONFIG.respond_timeout;
                                                                                    var action = 'driver_deliverd';
                                                                                    var options = [orders.order_id, android_restaurant, response_time, action];
                                                                                    // for (var i = 1; i == 1; i++) {
                                                                                    //     push.sendPushnotification(android_restaurant, message, 'driver_deliverd', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                    // }
                                                                                    var noti_data = {};
                                                                                    noti_data.rest_id = orders.city_id;
                                                                                    noti_data.order_id = request.order_id;
                                                                                    noti_data.user_id = orders.user_id;
                                                                                    noti_data._id = orders._id;
                                                                                    noti_data.user_name = driverrespo.username;
                                                                                    noti_data.order_type = 'driver_delivery';
                                                                                    //io.of('/chat').in(orders.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                    io.of('/chat').in(orders.user_id).emit('usernotify', noti_data);
                                                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                                                    var mail_datauser = {};
                                                                                    mail_datauser.user_id = orders.user_id;
                                                                                    mail_datauser.order_id = orders._id;
                                                                                    events.emit('user_order_delivered', mail_datauser, function (err, result) { });
                                                                                    // var mail_data = {};
                                                                                    // mail_data.user_id = orders.user_id;
                                                                                    // mail_data.order_id = orders._id;
                                                                                    // mail_data.driverId = req.body.driver_id;
                                                                                    // events.emit('restaurant_order_delivered', mail_data, function (err, result) { });
                                                                                    db.GetOneDocument('drivers', { _id: req.body.driver_id }, {}, {}, function (err, driverRespo) {
                                                                                        var mail_data1 = {};
                                                                                        mail_data1.user_id = orders.user_id;
                                                                                        mail_data1.driver_id = driverRespo._id;
                                                                                        mail_data1.order_id = orders._id;
                                                                                        events.emit('order_delivered_toadmin', mail_data1, function (err, result) { });
                                                                                        var mail_data = {};
                                                                                        mail_data.user_id = orders.user_id;
                                                                                        mail_data.driver_id = driverRespo._id;
                                                                                        mail_data.order_id = orders._id;
                                                                                        events.emit('order_delivered_todriver', mail_data, function (err, result) { });

                                                                                    })
                                                                                })
                                                                            })
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        })
                                                    }
                                                });
                                        //     }
                                        // });
                                //     }
                                // });
                            }
                        })
                    }
                })
            }
        })
    })

    events.on('order_delivered_todriver', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var driverId;
        if (typeof req.driver_id != 'undefined' && req.driver_id != '') {
            if (isObjectId(req.driver_id)) {
                driverId = new mongoose.Types.ObjectId(req.driver_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                // console.log('Error in mail14..!')
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            // console.log('Error in mail15..!')
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
                //  console.log('Error in mail16..!')
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, code: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                        // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
                        //  console.log('Error in mail16..!')
                    } else {
                        var filter_query = { "user_id": userId, _id: orderId };
                        var condition = [
                            { $match: filter_query },
                            { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                            { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
                            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'city', localField: 'city_id', foreignField: '_id', as: 'restaurantDetails' } },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    orderDetails: {
                                        createdAt: "$createdAt",
                                        status: "$status",
                                        mode: "$transactionDetails.type",
                                        order_history: "$order_history",
                                        _id: "$_id",
                                        transaction_id: "$transaction_id",
                                        user_id: "$user_id",
                                        city_id: "$city_id",
                                        coupon_code: "$coupon_code",
                                        delivery_address: "$delivery_address",
                                        order_id: "$order_id",
                                        // restaurantDetails: {
                                        //     restaurantname: "$restaurantDetails.restaurantname",
                                        //     username: "$restaurantDetails.username",
                                        //     email: "$restaurantDetails.email",
                                        //     address: "$restaurantDetails.address",
                                        // },
                                        userDetails: {
                                            "name": "$userDetails.username",
                                            "status": "$userDetails.status",
                                            "phone": "$userDetails.phone",
                                            "address": "$userDetails.address",
                                            "location": "$userDetails.location",
                                            "email": "$userDetails.email",
                                            "avatar": "$userDetails.avatar",
                                            "_id": "$userDetails._id",
                                        },
                                        location: "$location",
                                        foods: {
                                            "$map": {
                                                "input": "$foods",
                                                "as": "el",
                                                "in": {
                                                    'name': '$$el.name',
                                                    'id': '$$el.id',
                                                    'description': '$$el.description',
                                                    'offer': '$$el.offer',
                                                    'price': '$$el.price',
                                                    'slug': '$$el.slug',
                                                    'status': '$$el.status',
                                                    'quantity': '$$el.quantity',
                                                    'offer_price': '$$el.offer_price',
                                                    'instruction': '$$el.instruction',
                                                    'addons': '$$el.addons',
                                                    'base_pack': '$$el.base_pack',
                                                    "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                                }
                                            }
                                        },
                                        seen_status: "$seen_status",
                                        billings: "$billings",
                                        order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            //console.log('err, docdata', err, docdata)
                            if (err || !docdata) {
                                res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                            } else {
                                if (docdata.length > 0) {
                                    var orderDetails = [];
                                    var format = require('format-number');
                                    var myFormat = format({ integerSeparator: ',' });
                                    var pug = {};
                                    if (typeof docdata[0].orderDetails != 'undefined') {
                                        orderDetails = docdata[0].orderDetails;
                                        for (var i = 0; i < orderDetails.foods.length; i++) {
                                            orderDetails.foods[i].total = myFormat(orderDetails.foods[i].total.toFixed(2), { integerSeparator: ',' });
                                            if (orderDetails.foods[i].offer_price > 0) {
                                                var offer_discount = orderDetails.foods[i].total - orderDetails.foods[i].offer_price;
                                                orderDetails.foods[i].sub_total = myFormat(offer_discount.toFixed(2), { integerSeparator: ',' })
                                            } else {
                                                orderDetails.foods[i].sub_total = orderDetails.foods[i].total;
                                            }
                                        }
                                        if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined') {
                                            orderDetails.item_total = (orderDetails.billings.amount.total - orderDetails.billings.amount.food_offer_price).toFixed(2);
                                            orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
                                            orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                            // orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
                                            // orderDetails.billings.amount.night_fee = myFormat(orderDetails.billings.amount.night_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.service_tax = myFormat(orderDetails.billings.amount.service_tax.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.grand_total = myFormat(orderDetails.billings.amount.grand_total.toFixed(2), { integerSeparator: ',' })
                                        }
                                        orderDetails.createDate = timezone.tz(orderDetails.createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.food_delivered != 'undefined') {
                                            orderDetails.order_history.food_delivered = timezone.tz(orderDetails.order_history.food_delivered, settings.settings.time_zone).format(settings.settings.date_format);
                                        }
                                    }
                                    pug.orderDetails = orderDetails;
                                    pug.logo = settings.settings.logo;
                                    pug.siteurl = settings.settings.site_url;
                                    pug.site_title = settings.settings.site_title;
                                    pug.currency_symbol = settings.settings.currency_symbol;
                                    pug.currency_code = settings.settings.currency_code;
                                    pug.userDetails = userDetails;
                                    var street = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                        street = orderDetails.delivery_address.street
                                    }
                                    var delivery_address_fulladres = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                        delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                    }
                                    var delivery_address_landmark = '---';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                        delivery_address_landmark = orderDetails.delivery_address.landmark
                                    }
                                    var city;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.city != 'undefined' && orderDetails.delivery_address.city != '') {
                                        city = orderDetails.delivery_address.city
                                    }
                                    var country;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.country != 'undefined' && orderDetails.delivery_address.country != '') {
                                        country = orderDetails.delivery_address.country;
                                    }
                                    var zipcode;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.zipcode != 'undefined' && orderDetails.delivery_address.zipcode != '') {
                                        zipcode = orderDetails.delivery_address.zipcode;
                                    }
                                    var state;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.state != 'undefined' && orderDetails.delivery_address.state != '') {
                                        state = orderDetails.delivery_address.state;
                                    }
                                    var address = '';
                                    if (street != '') {
                                        address += street + ', ';
                                    }
                                    if (delivery_address_fulladres != '') {
                                        address += delivery_address_fulladres;
                                    }
                                    var mobile_no = '';
                                    if (typeof userDetails.phone != 'undefined' && typeof userDetails.code != 'undefined') {
                                        mobile_no = userDetails.code + userDetails.phone;
                                    }
                                    var email = '';
                                    if (typeof userDetails.email != 'undefined') {
                                        email = userDetails.email;
                                    }
                                    var billingDetails = '<div style="border: 1px solid #000; width: 265px;height: 140px; overflow: auto; float: left;margin-bottom:20px;"><p style="color: #000; background-color: #ccc; margin-bottom: 0px; padding-top: 0px; margin-top: 0px; font-family: open sans,arial,helvetica,sans-serif; font-size: 13px; text-transform: uppercase;">BILLING DETAILS</p><table border="0"><tbody>';
                                    if (typeof country != 'undefined' && country != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">COUNTRY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + country + '</td></tr>'
                                    }
                                    if (typeof state != 'undefined' && state != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">PROVINCE</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + state + '</td></tr>'
                                    }
                                    if (typeof city != 'undefined' && city != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">CITY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + city + '</td></tr>'
                                    }
                                    if (typeof address != 'undefined' && address != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ADDRESS</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + address + '</td></tr>'
                                    }
                                    if (typeof delivery_address_landmark != 'undefined' && delivery_address_landmark != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">LANDMARK</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + delivery_address_landmark + '</td></tr>'
                                    }
                                    if (typeof zipcode != 'undefined' && zipcode != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ZIP CODE:</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + zipcode + '</td></tr>'
                                    }
                                    if (typeof mobile_no != 'undefined' && mobile_no != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">Mobile</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + mobile_no + '</td></tr>'
                                    }
                                    if (typeof email != 'undefined' && email != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">EMAIL</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: blue; text-decoration: underline; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left"><a href="' + email + '">' + email + '</a></td></tr>'
                                    }
                                    billingDetails += '</tbody></table></div>';
                                    var deliveryDetails = '<div style="border: 1px solid #000;  width: 100%; float: left;"><p style="color: #000; background-color: #ccc; margin-bottom: 0px; padding-top: 0px; margin-top: 0px; font-family: open sans,arial,helvetica,sans-serif; font-size: 13px; text-transform: uppercase;">DELIVERY DETAILS</p><table border="0"><tbody>';
                                    if (typeof country != 'undefined' && country != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">COUNTRY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + country + '</td></tr>'
                                    }
                                    if (typeof state != 'undefined' && state != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">PROVINCE</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + state + '</td></tr>'
                                    }
                                    if (typeof city != 'undefined' && city != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">CITY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + city + '</td></tr>'
                                    }
                                    if (typeof address != 'undefined' && address != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ADDRESS</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + address + '</td></tr>'
                                    }
                                    if (typeof delivery_address_landmark != 'undefined' && delivery_address_landmark != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">LANDMARK</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + delivery_address_landmark + '</td></tr>'
                                    }
                                    if (typeof zipcode != 'undefined' && zipcode != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ZIP CODE:</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + zipcode + '</td></tr>'
                                    }
                                    if (typeof mobile_no != 'undefined' && mobile_no != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">Mobile</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + mobile_no + '</td></tr>'
                                    }
                                    if (typeof email != 'undefined' && email != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">EMAIL</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: blue; text-decoration: underline; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left"><a href="' + email + '">' + email + '</a></td></tr>'
                                    }
                                    deliveryDetails += '</tbody></table></div>';
                                    var foodDetails = '<table border="0" width="100%"><tbody><tr style="background-color: #e15500;" width="100%"><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px; text-transform: uppercase;" align="center">ITEM NAME</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">PRICE</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px; text-transform: uppercase;" align="center">QTY</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">COST</td></tr>';
                                    for (var i = 0; i < orderDetails.foods.length; i++) {
                                        var PriceText = '';
                                        var cost = 0.0;
                                        var costText = '';
                                        if (orderDetails.foods[i].offer_price > 0) {
                                            var remaing_price = (parseFloat(orderDetails.foods[i].total) - parseFloat(orderDetails.foods[i].offer_price)).toFixed(2);
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
                                                + settings.settings.currency_symbol + ' ' +
                                                orderDetails.foods[i].total + '</span><span>' + remaing_price + '</span>';
                                            cost = (parseFloat(orderDetails.foods[i].quantity * remaing_price)).toFixed(2)
                                            costText = settings.settings.currency_symbol + ' ' + cost;
                                        } else {
                                            PriceText = '<span>' + settings.settings.currency_symbol + ' ' + orderDetails.foods[i].sub_total + '</span>';
                                            cost = (parseFloat(orderDetails.foods[i].quantity * orderDetails.foods[i].sub_total)).toFixed(2);
                                            costText = settings.settings.currency_symbol + ' ' + cost;
                                        }
                                        foodDetails += '<tr width="100%"><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px;" align="center">' + orderDetails.foods[i].name + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px;" align="center">' + PriceText + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px;" align="center">' + orderDetails.foods[i].quantity + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px;" align="center">' + costText + '</td></tr>';
                                    }
                                    foodDetails += '</tbody></table>';
                                    var payment_details = '<table border="0" width="100%"><tbody>';
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Item Total</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + ' </td></tr>';
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Offers Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; text-align:center;padding-left:33px;line-height: 26px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr>';
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Coupon Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Delivery Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Surge Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Package Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr> ';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Night Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Tax</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr>';
                                    }
                                    var refer_offer_price = '';
                                    if (orderDetails.refer_offer_price && orderDetails.refer_offer_price != null && orderDetails.refer_offer_price != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Referral Offer</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.refer_offer_price + '</td></tr>'
                                    }
                                    payment_details += '</tbody></table>';
                                    var earning = '';
                                    if (orderDetails.billings.amount.restaurant_commission > 0) {
                                        var earning = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.billings.amount.restaurant_commission + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    db.GetOneDocument('drivers', { _id: driverId }, {}, {}, function (err, driverDetails) {
                                        var mailData = {};
                                        mailData.template = 'order_delivered_todriver';
                                        mailData.to = driverDetails.email;
                                        mailData.html = [];
                                        mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                        mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                        mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                        mailData.html.push({ name: 'DriverName', value: driverDetails.username || "" });
                                        //mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
                                        mailData.html.push({ name: 'mode', value: orderDetails.mode || "" });
                                        mailData.html.push({ name: 'delivery_address_country', value: country || "" });
                                        mailData.html.push({ name: 'delivery_address_zipcode', value: zipcode || "" });
                                        mailData.html.push({ name: 'delivery_address_state', value: state || "" });
                                        mailData.html.push({ name: 'delivery_address_city', value: city || "" });
                                        mailData.html.push({ name: 'billingDetails', value: billingDetails || "" });
                                        mailData.html.push({ name: 'deliveryDetails', value: deliveryDetails || "" });
                                        mailData.html.push({ name: 'payment_details', value: payment_details || "" });
                                        mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                        mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                        mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                        mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                        mailData.html.push({ name: 'item_total', value: item_total || "" });
                                        mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                        mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                        mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                        mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                        mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                        mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                        mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                        mailData.html.push({ name: 'earning', value: earning || "" });
                                        mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });


                                        mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                        mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                        mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                        mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                        mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
                                        mailcontent.sendmail(mailData, function (err, response) {
                                            //console.log('err, response', err, response)
                                            done(null, { status: 1, response: response });
                                        });
                                    });

                                } else {
                                    // console.log('Error in mail..!')
                                    res.send({ "status": 0, "errors": 'Error in mail..!' });
                                }
                            }
                        })
                    }
                })
            }
        })
    });
    events.on('restaurant_order_delivered', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                // console.log('Error in mail12..!')
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            // console.log('Error in mail13..!')
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                // console.log('Error in mail14..!')
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            // console.log('Error in mail15..!')
            return;
        }

        var driverId;
        if (typeof req.driverId != 'undefined' && req.driverId != '') {
            if (isObjectId(req.driverId)) {
                driverId = new mongoose.Types.ObjectId(req.driverId);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                // console.log('Error in mail14..!')
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            // console.log('Error in mail15..!')
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
                //  console.log('Error in mail16..!')
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, code: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                        // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
                        //  console.log('Error in mail16..!')
                    } else {
                        var filter_query = { "user_id": userId, _id: orderId };
                        var condition = [
                            { $match: filter_query },
                            { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                            { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
                            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    orderDetails: {
                                        createdAt: "$createdAt",
                                        status: "$status",
                                        mode: "$transactionDetails.type",
                                        order_history: "$order_history",
                                        _id: "$_id",
                                        transaction_id: "$transaction_id",
                                        user_id: "$user_id",
                                        restaurant_id: "$restaurant_id",
                                        coupon_code: "$coupon_code",
                                        delivery_address: "$delivery_address",
                                        order_id: "$order_id",
                                        restaurantDetails: {
                                            restaurantname: "$restaurantDetails.restaurantname",
                                            username: "$restaurantDetails.username",
                                            email: "$restaurantDetails.email",
                                            address: "$restaurantDetails.address",
                                        },
                                        userDetails: {
                                            "name": "$userDetails.username",
                                            "status": "$userDetails.status",
                                            "phone": "$userDetails.phone",
                                            "address": "$userDetails.address",
                                            "location": "$userDetails.location",
                                            "email": "$userDetails.email",
                                            "avatar": "$userDetails.avatar",
                                            "_id": "$userDetails._id",
                                        },
                                        location: "$location",
                                        foods: {
                                            "$map": {
                                                "input": "$foods",
                                                "as": "el",
                                                "in": {
                                                    'name': '$$el.name',
                                                    'id': '$$el.id',
                                                    'description': '$$el.description',
                                                    'offer': '$$el.offer',
                                                    'price': '$$el.price',
                                                    'slug': '$$el.slug',
                                                    'status': '$$el.status',
                                                    'quantity': '$$el.quantity',
                                                    'offer_price': '$$el.offer_price',
                                                    'instruction': '$$el.instruction',
                                                    'addons': '$$el.addons',
                                                    'base_pack': '$$el.base_pack',
                                                    "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                                }
                                            }
                                        },
                                        seen_status: "$seen_status",
                                        billings: "$billings",
                                        order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            //console.log('err, docdata', err, docdata)
                            if (err || !docdata) {
                                res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                            } else {
                                if (docdata.length > 0) {
                                    var orderDetails = [];
                                    var format = require('format-number');
                                    var myFormat = format({ integerSeparator: ',' });
                                    var pug = {};
                                    if (typeof docdata[0].orderDetails != 'undefined') {
                                        orderDetails = docdata[0].orderDetails;
                                        for (var i = 0; i < orderDetails.foods.length; i++) {
                                            orderDetails.foods[i].total = myFormat(orderDetails.foods[i].total.toFixed(2), { integerSeparator: ',' });
                                            if (orderDetails.foods[i].offer_price > 0) {
                                                var offer_discount = orderDetails.foods[i].total - orderDetails.foods[i].offer_price;
                                                orderDetails.foods[i].sub_total = myFormat(offer_discount.toFixed(2), { integerSeparator: ',' })
                                            } else {
                                                orderDetails.foods[i].sub_total = orderDetails.foods[i].total;
                                            }
                                        }
                                        if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined') {
                                            orderDetails.item_total = (orderDetails.billings.amount.total - orderDetails.billings.amount.food_offer_price).toFixed(2);
                                            orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
                                            orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.night_fee = myFormat(orderDetails.billings.amount.night_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.service_tax = myFormat(orderDetails.billings.amount.service_tax.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.grand_total = myFormat(orderDetails.billings.amount.grand_total.toFixed(2), { integerSeparator: ',' })
                                        }
                                        orderDetails.createDate = timezone.tz(orderDetails.createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.food_delivered != 'undefined') {
                                            orderDetails.order_history.food_delivered = timezone.tz(orderDetails.order_history.food_delivered, settings.settings.time_zone).format(settings.settings.date_format);
                                        }
                                    }
                                    pug.orderDetails = orderDetails;
                                    pug.logo = settings.settings.logo;
                                    pug.siteurl = settings.settings.site_url;
                                    pug.site_title = settings.settings.site_title;
                                    pug.currency_symbol = settings.settings.currency_symbol;
                                    pug.currency_code = settings.settings.currency_code;
                                    pug.userDetails = userDetails;
                                    var street = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                        street = orderDetails.delivery_address.street
                                    }
                                    var delivery_address_fulladres = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                        delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                    }
                                    var delivery_address_landmark = '---';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                        delivery_address_landmark = orderDetails.delivery_address.landmark
                                    }
                                    var city;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.city != 'undefined' && orderDetails.delivery_address.city != '') {
                                        city = orderDetails.delivery_address.city
                                    }
                                    var country;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.country != 'undefined' && orderDetails.delivery_address.country != '') {
                                        country = orderDetails.delivery_address.country;
                                    }
                                    var zipcode;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.zipcode != 'undefined' && orderDetails.delivery_address.zipcode != '') {
                                        zipcode = orderDetails.delivery_address.zipcode;
                                    }
                                    var state;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.state != 'undefined' && orderDetails.delivery_address.state != '') {
                                        state = orderDetails.delivery_address.state;
                                    }
                                    var address = '';
                                    if (street != '') {
                                        address += street + ', ';
                                    }
                                    if (delivery_address_fulladres != '') {
                                        address += delivery_address_fulladres;
                                    }
                                    var mobile_no = '';
                                    if (typeof userDetails.phone != 'undefined' && typeof userDetails.code != 'undefined') {
                                        mobile_no = userDetails.code + userDetails.phone;
                                    }
                                    var email = '';
                                    if (typeof userDetails.email != 'undefined') {
                                        email = userDetails.email;
                                    }
                                    var billingDetails = '<div style="border: 1px solid #000; width: 265px;height: 140px; overflow: auto; float: left;margin-bottom:20px;"><p style="color: #000; background-color: #ccc; margin-bottom: 0px; padding-top: 0px; margin-top: 0px; font-family: open sans,arial,helvetica,sans-serif; font-size: 13px; text-transform: uppercase;">BILLING DETAILS</p><table border="0"><tbody>';
                                    if (typeof country != 'undefined' && country != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">COUNTRY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + country + '</td></tr>'
                                    }
                                    if (typeof state != 'undefined' && state != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">PROVINCE</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + state + '</td></tr>'
                                    }
                                    if (typeof city != 'undefined' && city != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">CITY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + city + '</td></tr>'
                                    }
                                    if (typeof address != 'undefined' && address != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ADDRESS</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + address + '</td></tr>'
                                    }
                                    if (typeof delivery_address_landmark != 'undefined' && delivery_address_landmark != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">LANDMARK</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + delivery_address_landmark + '</td></tr>'
                                    }
                                    if (typeof zipcode != 'undefined' && zipcode != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ZIP CODE:</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + zipcode + '</td></tr>'
                                    }
                                    if (typeof mobile_no != 'undefined' && mobile_no != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">Mobile</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + mobile_no + '</td></tr>'
                                    }
                                    if (typeof email != 'undefined' && email != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">EMAIL</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: blue; text-decoration: underline; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left"><a href="' + email + '">' + email + '</a></td></tr>'
                                    }
                                    billingDetails += '</tbody></table></div>';
                                    var deliveryDetails = '<div style="border: 1px solid #000;  width: 100%; float: left;"><p style="color: #000; background-color: #ccc; margin-bottom: 0px; padding-top: 0px; margin-top: 0px; font-family: open sans,arial,helvetica,sans-serif; font-size: 13px; text-transform: uppercase;">DELIVERY DETAILS</p><table border="0"><tbody>';
                                    if (typeof country != 'undefined' && country != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">COUNTRY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + country + '</td></tr>'
                                    }
                                    if (typeof state != 'undefined' && state != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">PROVINCE</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + state + '</td></tr>'
                                    }
                                    if (typeof city != 'undefined' && city != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">CITY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + city + '</td></tr>'
                                    }
                                    if (typeof address != 'undefined' && address != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ADDRESS</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + address + '</td></tr>'
                                    }
                                    if (typeof delivery_address_landmark != 'undefined' && delivery_address_landmark != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">LANDMARK</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + delivery_address_landmark + '</td></tr>'
                                    }
                                    if (typeof zipcode != 'undefined' && zipcode != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ZIP CODE:</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + zipcode + '</td></tr>'
                                    }
                                    if (typeof mobile_no != 'undefined' && mobile_no != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">Mobile</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + mobile_no + '</td></tr>'
                                    }
                                    if (typeof email != 'undefined' && email != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">EMAIL</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: blue; text-decoration: underline; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left"><a href="' + email + '">' + email + '</a></td></tr>'
                                    }
                                    deliveryDetails += '</tbody></table></div>';
                                    var foodDetails = '<table border="0" width="100%"><tbody><tr style="background-color: #e15500;" width="100%"><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px; text-transform: uppercase;" align="center">ITEM NAME</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">PRICE</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px; text-transform: uppercase;" align="center">QTY</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">COST</td></tr>';
                                    for (var i = 0; i < orderDetails.foods.length; i++) {
                                        var PriceText = '';
                                        var cost = 0.0;
                                        var costText = '';
                                        if (orderDetails.foods[i].offer_price > 0) {
                                            var remaing_price = (parseFloat(orderDetails.foods[i].total) - parseFloat(orderDetails.foods[i].offer_price)).toFixed(2);
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
                                                + settings.settings.currency_symbol + ' ' +
                                                orderDetails.foods[i].total + '</span><span>' + remaing_price + '</span>';
                                            cost = (parseFloat(orderDetails.foods[i].quantity * remaing_price)).toFixed(2)
                                            costText = settings.settings.currency_symbol + ' ' + cost;
                                        } else {
                                            PriceText = '<span>' + settings.settings.currency_symbol + ' ' + orderDetails.foods[i].sub_total + '</span>';
                                            cost = (parseFloat(orderDetails.foods[i].quantity * orderDetails.foods[i].sub_total)).toFixed(2);
                                            costText = settings.settings.currency_symbol + ' ' + cost;
                                        }
                                        foodDetails += '<tr width="100%"><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px;" align="center">' + orderDetails.foods[i].name + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px;" align="center">' + PriceText + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px;" align="center">' + orderDetails.foods[i].quantity + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px;" align="center">' + costText + '</td></tr>';
                                    }
                                    foodDetails += '</tbody></table>';
                                    var payment_details = '<table border="0" width="100%"><tbody>';
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Item Total</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + ' </td></tr>';
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Offers Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; text-align:center;padding-left:33px;line-height: 26px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr>';
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Coupon Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Delivery Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Surge Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Package Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr> ';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Night Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Tax</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr>';
                                    }
                                    var refer_offer_price = '';
                                    if (orderDetails.refer_offer_price && orderDetails.refer_offer_price != null && orderDetails.refer_offer_price != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Referral Offer</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.refer_offer_price + '</td></tr>'
                                    }
                                    payment_details += '</tbody></table>';
                                    var earning = '';
                                    if (orderDetails.billings.amount.restaurant_commission > 0) {
                                        var earning = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.billings.amount.restaurant_commission + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    db.GetOneDocument('drivers', { _id: driverId }, {}, {}, function (err, driverDetails) {
                                        var mailData = {};
                                        mailData.template = 'restaurant_order_delivered';
                                        mailData.to = orderDetails.restaurantDetails.email;
                                        mailData.html = [];
                                        mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                        mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                        mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                        mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.username || "" });
                                        mailData.html.push({ name: 'DriverName', value: driverDetails.username || "" });
                                        mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                        mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                        mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                        mailData.html.push({ name: 'mode', value: orderDetails.mode || "" });
                                        mailData.html.push({ name: 'delivery_address_country', value: country || "" });
                                        mailData.html.push({ name: 'delivery_address_zipcode', value: zipcode || "" });
                                        mailData.html.push({ name: 'delivery_address_state', value: state || "" });
                                        mailData.html.push({ name: 'delivery_address_city', value: city || "" });
                                        mailData.html.push({ name: 'billingDetails', value: billingDetails || "" });
                                        mailData.html.push({ name: 'deliveryDetails', value: deliveryDetails || "" });
                                        mailData.html.push({ name: 'payment_details', value: payment_details || "" });
                                        mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                        mailData.html.push({ name: 'item_total', value: item_total || "" });
                                        mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                        mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                        mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                        mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                        mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                        mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                        mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                        mailData.html.push({ name: 'earning', value: earning || "" });
                                        mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });


                                        mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                        mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                        mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                        mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                        mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
                                        mailcontent.sendmail(mailData, function (err, response) {
                                            //console.log('err, response', err, response)
                                            done(null, { status: 1, response: response });
                                        });
                                    });

                                } else {
                                    // console.log('Error in mail..!')
                                    res.send({ "status": 0, "errors": 'Error in mail..!' });
                                }
                            }
                        })
                    }
                })
            }
        })
    });
    events.on('user_order_delivered', function (req, done) {
        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                return;
            }
        } else {
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                return;
            }
        } else {
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, code: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                    } else {
                        var filter_query = { "user_id": userId, _id: orderId };
                        var condition = [
                            { $match: filter_query },
                            { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                            { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
                            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                            { '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
                            { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    orderDetails: {
                                        createdAt: "$createdAt",
                                        status: "$status",
                                        mode: "$transactionDetails.type",
                                        order_history: "$order_history",
                                        _id: "$_id",
                                        transaction_id: "$transaction_id",
                                        user_id: "$user_id",
                                        restaurant_id: "$restaurant_id",
                                        coupon_code: "$coupon_code",
                                        delivery_address: "$delivery_address",
                                        order_id: "$order_id",
                                        // restaurantDetails: {
                                        //     restaurantname: "$restaurantDetails.restaurantname",
                                        //     username: "$restaurantDetails.username",
                                        //     email: "$restaurantDetails.email",
                                        //     address: "$restaurantDetails.address",
                                        // },
                                        userDetails: {
                                            "name": "$userDetails.username",
                                            "status": "$userDetails.status",
                                            "phone": "$userDetails.phone",
                                            "address": "$userDetails.address",
                                            "location": "$userDetails.location",
                                            "email": "$userDetails.email",
                                            "avatar": "$userDetails.avatar",
                                            "_id": "$userDetails._id",
                                        },
                                        location: "$location",
                                        foods: {
                                            "$map": {
                                                "input": "$foods",
                                                "as": "el",
                                                "in": {
                                                    'name': '$$el.name',
                                                    'id': '$$el.id',
                                                    'description': '$$el.description',
                                                    'offer': '$$el.offer',
                                                    'price': '$$el.price',
                                                    'slug': '$$el.slug',
                                                    'status': '$$el.status',
                                                    'quantity': '$$el.quantity',
                                                    'offer_price': '$$el.offer_price',
                                                    'instruction': '$$el.instruction',
                                                    'addons': '$$el.addons',
                                                    'base_pack': '$$el.base_pack',
                                                    "total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
                                                }
                                            }
                                        },
                                        seen_status: "$seen_status",
                                        billings: "$billings",
                                        order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            if (err || !docdata) {
                                // res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                            } else {
                                if (docdata.length > 0) {
                                    var orderDetails = {};
                                    var format = require('format-number');
                                    var myFormat = format({ integerSeparator: ',' });
                                    var pug = {};
                                    if (typeof docdata[0].orderDetails != 'undefined') {
                                        orderDetails = docdata[0].orderDetails;
                                        for (var i = 0; i < orderDetails.foods.length; i++) {
                                            orderDetails.foods[i].total = myFormat(orderDetails.foods[i].total.toFixed(2), { integerSeparator: ',' });
                                            if (orderDetails.foods[i].offer_price > 0) {
                                                var offer_discount = orderDetails.foods[i].total - orderDetails.foods[i].offer_price;
                                                orderDetails.foods[i].sub_total = myFormat(offer_discount.toFixed(2), { integerSeparator: ',' })
                                            } else {
                                                orderDetails.foods[i].sub_total = orderDetails.foods[i].total;
                                            }
                                        }
                                        if (typeof orderDetails.billings != 'undefined' && typeof orderDetails.billings.amount != 'undefined') {
                                            orderDetails.item_total = (orderDetails.billings.amount.total - orderDetails.billings.amount.food_offer_price).toFixed(2);
                                            orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
                                            orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                            // orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
                                            // orderDetails.billings.amount.night_fee = myFormat(orderDetails.billings.amount.night_fee.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.service_tax = myFormat(orderDetails.billings.amount.service_tax.toFixed(2), { integerSeparator: ',' })
                                            orderDetails.billings.amount.grand_total = myFormat(orderDetails.billings.amount.grand_total.toFixed(2), { integerSeparator: ',' })
                                        }
                                        orderDetails.createDate = timezone.tz(orderDetails.createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.food_delivered != 'undefined') {
                                            orderDetails.order_history.food_delivered = timezone.tz(orderDetails.order_history.food_delivered, settings.settings.time_zone).format(settings.settings.date_format);
                                        }
                                    }
                                    pug.orderDetails = orderDetails;
                                    pug.logo = settings.settings.logo;
                                    pug.siteurl = settings.settings.site_url;
                                    pug.site_title = settings.settings.site_title;
                                    pug.currency_symbol = settings.settings.currency_symbol;
                                    pug.currency_code = settings.settings.currency_code;
                                    pug.userDetails = userDetails;
                                    var street = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                        street = orderDetails.delivery_address.street
                                    }
                                    var delivery_address_fulladres = '';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                        delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                    }
                                    var delivery_address_landmark = '---';
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                        delivery_address_landmark = orderDetails.delivery_address.landmark
                                    }
                                    var city;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.city != 'undefined' && orderDetails.delivery_address.city != '') {
                                        city = orderDetails.delivery_address.city
                                    }
                                    var country;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.country != 'undefined' && orderDetails.delivery_address.country != '') {
                                        country = orderDetails.delivery_address.country;
                                    }
                                    var zipcode;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.zipcode != 'undefined' && orderDetails.delivery_address.zipcode != '') {
                                        zipcode = orderDetails.delivery_address.zipcode;
                                    }
                                    var state;
                                    if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.state != 'undefined' && orderDetails.delivery_address.state != '') {
                                        state = orderDetails.delivery_address.state;
                                    }
                                    var address = '';
                                    if (street != '') {
                                        address += street + ', ';
                                    }
                                    if (delivery_address_fulladres != '') {
                                        address += delivery_address_fulladres;
                                    }
                                    var mobile_no = '';
                                    if (typeof userDetails.phone != 'undefined' && typeof userDetails.code != 'undefined') {
                                        mobile_no = userDetails.code + userDetails.phone;
                                    }
                                    var email = '';
                                    if (typeof userDetails.email != 'undefined') {
                                        email = userDetails.email;
                                    }
                                    var billingDetails = '<div style="border: 1px solid #000; width: 265px;height: 140px; overflow: auto; float: left;margin-bottom:20px;"><p style="color: #000; background-color: #ccc; margin-bottom: 0px; padding-top: 0px; margin-top: 0px; font-family: open sans,arial,helvetica,sans-serif; font-size: 13px; text-transform: uppercase;">BILLING DETAILS</p><table border="0"><tbody>';
                                    if (typeof country != 'undefined' && country != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">COUNTRY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + country + '</td></tr>'
                                    }
                                    if (typeof state != 'undefined' && state != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">PROVINCE</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + state + '</td></tr>'
                                    }
                                    if (typeof city != 'undefined' && city != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">CITY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + city + '</td></tr>'
                                    }
                                    if (typeof address != 'undefined' && address != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ADDRESS</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + address + '</td></tr>'
                                    }
                                    if (typeof delivery_address_landmark != 'undefined' && delivery_address_landmark != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">LANDMARK</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + delivery_address_landmark + '</td></tr>'
                                    }
                                    if (typeof zipcode != 'undefined' && zipcode != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ZIP CODE:</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + zipcode + '</td></tr>'
                                    }
                                    if (typeof mobile_no != 'undefined' && mobile_no != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">Mobile</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + mobile_no + '</td></tr>'
                                    }
                                    if (typeof email != 'undefined' && email != '') {
                                        billingDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">EMAIL</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: blue; text-decoration: underline; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left"><a href="' + email + '">' + email + '</a></td></tr>'
                                    }
                                    billingDetails += '</tbody></table></div>';
                                    var deliveryDetails = '<div style="border: 1px solid #000;  width: 100%; float: left;"><p style="color: #000; background-color: #ccc; margin-bottom: 0px; padding-top: 0px; margin-top: 0px; font-family: open sans,arial,helvetica,sans-serif; font-size: 13px; text-transform: uppercase;">DELIVERY DETAILS</p><table border="0"><tbody>';
                                    if (typeof country != 'undefined' && country != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">COUNTRY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + country + '</td></tr>'
                                    }
                                    if (typeof state != 'undefined' && state != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">PROVINCE</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + state + '</td></tr>'
                                    }
                                    if (typeof city != 'undefined' && city != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">CITY</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + city + '</td></tr>'
                                    }
                                    if (typeof address != 'undefined' && address != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ADDRESS</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + address + '</td></tr>'
                                    }
                                    if (typeof delivery_address_landmark != 'undefined' && delivery_address_landmark != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">LANDMARK</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + delivery_address_landmark + '</td></tr>'
                                    }
                                    if (typeof zipcode != 'undefined' && zipcode != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">ZIP CODE:</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + zipcode + '</td></tr>'
                                    }
                                    if (typeof mobile_no != 'undefined' && mobile_no != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">Mobile</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">' + mobile_no + '</td></tr>'
                                    }
                                    if (typeof email != 'undefined' && email != '') {
                                        deliveryDetails += '<tr><td style="padding: 0px; font-size: 9px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left">EMAIL</td><td width="20%">:</td><td style="padding: 0px; font-size: 9px; color: blue; text-decoration: underline; font-family: open sans,arial,helvetica,sans-serif; line-height: 15px; text-transform: uppercase;" width="50%" align="left"><a href="' + email + '">' + email + '</a></td></tr>'
                                    }
                                    deliveryDetails += '</tbody></table></div>';
                                    var foodDetails = '<table border="0" width="100%"><tbody><tr style="background-color: #e15500;" width="100%"><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px; text-transform: uppercase;" align="center">ITEM NAME</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">PRICE</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px; text-transform: uppercase;" align="center">QTY</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">COST</td></tr>';
                                    for (var i = 0; i < orderDetails.foods.length; i++) {
                                        var PriceText = '';
                                        var cost = 0.0;
                                        var costText = '';
                                        if (orderDetails.foods[i].offer_price > 0) {
                                            var remaing_price = (parseFloat(orderDetails.foods[i].total) - parseFloat(orderDetails.foods[i].offer_price)).toFixed(2);
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
                                                + settings.settings.currency_symbol + ' ' +
                                                orderDetails.foods[i].total + '</span><span>' + remaing_price + '</span>';
                                            cost = (parseFloat(orderDetails.foods[i].quantity * remaing_price)).toFixed(2)
                                            costText = settings.settings.currency_symbol + ' ' + cost;
                                        } else {
                                            PriceText = '<span>' + settings.settings.currency_symbol + ' ' + orderDetails.foods[i].sub_total + '</span>';
                                            cost = (parseFloat(orderDetails.foods[i].quantity * orderDetails.foods[i].sub_total)).toFixed(2);
                                            costText = settings.settings.currency_symbol + ' ' + cost;
                                        }
                                        foodDetails += '<tr width="100%"><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px;" align="center">' + orderDetails.foods[i].name + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px;" align="center">' + PriceText + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px;" align="center">' + orderDetails.foods[i].quantity + '</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px;" align="center">' + costText + '</td></tr>';
                                    }
                                    foodDetails += '</tbody></table>';
                                    var payment_details = '<table border="0" width="100%"><tbody>';
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Item Total</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + ' </td></tr>';
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Offers Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; text-align:center;padding-left:33px;line-height: 26px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr>';
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Coupon Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Delivery Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Surge Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Package Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr> ';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Night Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Tax</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr>';
                                    }
                                    var refer_offer_price = '';
                                    if (orderDetails.refer_offer_price && orderDetails.refer_offer_price != null && orderDetails.refer_offer_price != '') {
                                        payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Referral Offer</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.refer_offer_price + '</td></tr>'
                                    }
                                    payment_details += '</tbody></table>';
                                    var earning = '';
                                    if (orderDetails.billings.amount.restaurant_commission > 0) {
                                        var earning = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.billings.amount.restaurant_commission + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var request = require('request');
                                    var findRemoveSync = require('find-remove');
                                    var site_url = settings.settings.site_url;
                                    var site_title = settings.settings.site_title;
                                    var filename = site_title + '-order-' + Date.now() + '.pdf';
                                    request(site_url + 'site/users/userorderSummary?userId=' + userId + '&orderId=' + orderId, function (error, response, body) {
                                        if (error && error != null) {
                                        } else {
                                            if (response.statusCode == 200) {
                                                try {
                                                    var body = JSON.parse(body);
                                                } catch (e) {

                                                }
                                                if (typeof body == 'string') {
                                                    var pdf = require('html-pdf');
                                                    var options = { format: 'Letter' };
                                                    pdf.create(body, options).toFile('./uploads/invoice/' + filename, function (err, resp) {
                                                        if (err) {
                                                            // res.send({ 'status': 0, 'message': 'Something went to wrong'});
                                                        } else {
                                                            var mailData = {};
                                                            mailData.template = 'user_order_delivered';
                                                            mailData.to = orderDetails.userDetails.email;
                                                            mailData.html = [];
                                                            mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                                            mailData.html.push({ name: 'mode', value: orderDetails.mode || "" });
                                                            mailData.html.push({ name: 'delivery_address_country', value: country || "" });
                                                            mailData.html.push({ name: 'delivery_address_zipcode', value: zipcode || "" });
                                                            mailData.html.push({ name: 'delivery_address_state', value: state || "" });
                                                            mailData.html.push({ name: 'delivery_address_city', value: city || "" });
                                                            mailData.html.push({ name: 'billingDetails', value: billingDetails || "" });
                                                            mailData.html.push({ name: 'deliveryDetails', value: deliveryDetails || "" });
                                                            mailData.html.push({ name: 'payment_details', value: payment_details || "" });
                                                            mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                                            mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                                            //mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.username || "" });
                                                            mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                                            mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                                            mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                                            mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                                            mailData.html.push({ name: 'item_total', value: item_total || "" });
                                                            mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                                            mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                                            mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                                            mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                                            mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                                            mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                                            mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                                            mailData.html.push({ name: 'earning', value: earning || "" });
                                                            mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });

                                                            mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                                            mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                                            mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                                            mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                                            mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
                                                            mailData.html.push({ name: 'order_summary', value: site_url + './uploads/invoice/' + filename || "" });
                                                            mailcontent.sendmail(mailData, function (err, response) {
                                                                done(null, { status: 1, response: response });
                                                            });
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    });





                                } else {
                                    // console.log('Error in mail..!')
                                    // res.send({ "status": 0, "errors": 'Error in mail..!' });
                                }
                            }
                        })
                    }
                })
            }
        })
    });

    controller.rejectOrder = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('order_id', 'Order ID is required').notEmpty();
        let errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        let data = {};
        let request = {};
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        db.GetOneDocument('orders', { 'order_id': request.order_id, status: { '$in': [3, 5] } }, {}, {}, (err, ordersDetails) => {
            if (!err) {
                if (ordersDetails && ordersDetails._id != 'undefined') {
                    db.GetOneDocument('orders', { 'order_id': request.order_id, 'cancel_drivers': { $elemMatch: { 'id': request.driver_id } } }, {}, {}, function (err, doccc) {
                        if (!err && doccc) {
                            res.send({ 'status': 0, 'message': 'you have already rejected this order' });
                        }
                        else {
                            let date = new Date();
                            let temp = {};
                            temp.id = request.driver_id;
                            temp.cancelledAt = date;
                            db.UpdateDocument('orders', { 'order_id': request.order_id }, { $addToSet: { cancel_drivers: temp } }, {}, (err, updatedd) => {
                                if (err) {
                                    res.send({ 'status': 0, 'message': 'cannot update' });
                                } else {
                                    io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                    var noti_data = {};
                                    noti_data.rest_id = ordersDetails.restaurant_id;
                                    noti_data.order_id = ordersDetails.order_id;
                                    noti_data.user_id = ordersDetails.user_id;
                                    noti_data._id = ordersDetails._id;
                                    noti_data.user_name = '';
                                    noti_data.order_type = 'order_rejected';
                                    //io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                    io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                    io.of('/chat').emit('adminnotify', noti_data);
                                    res.send({ 'status': 1, 'message': 'updated successfully' })
                                    db.GetOneDocument('drivers', { _id: request.driver_id }, {}, {}, function (userErr, driverRespo) {
                                        db.GetOneDocument('city', { _id: new mongoose.Types.ObjectId(ordersDetails.city_id) }, { _id: 1, cityname: 1 }, {}, (err, restaurant) => {
                                            mailData = {};
                                            mailData.template = 'order_rejected_todriver';
                                            mailData.to = driverRespo.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'name', value: driverRespo.username || "" });
                                            mailData.html.push({ name: 'order_id', value: request.order_id || "" });
                                            mailData.html.push({ name: 'rest_name', value: restaurant.cityname || "" });
                                            mailcontent.sendmail(mailData, function (err, response) { });
                                        })
                                    })
                                }
                            })
                        }
                    })
                } else {
                    res.send({ 'status': 0, 'errors': 'error in fetching data' });
                }
            } else {
                res.send({ 'status': 0, 'errors': 'error in fetching data' });
            }
        })
    }
    controller.confirmOrder = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('order_id', 'Order ID is required').notEmpty();
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
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        db.GetOneDocument('orders', { 'order_id': request.order_id, 'driver_id': request.driver_id, status: { '$eq': 5 } }, {}, {}, (err, docs) => {
            if (err || !docs) {
                res.send({ 'status': 0, 'errors': 'Invalid credentials' });
            }
            else {
                db.GetOneDocument('transaction', { '_id': docs.transaction_id }, {}, {}, (err, txn) => {
                    if (err || !txn) {
                        res.send({ 'status': 0, 'errors': 'Invalid transaction credentials' });
                    }
                    else {
                        db.GetOneDocument('city', { _id: new mongoose.Types.ObjectId(docs.city_id) }, { _id: 1 }, {}, (err, restaurant) => {
                            if (err) {
                                res.send({ 'status': 0, 'errors': 'error in fetching data' });
                            }
                            else {
                                db.GetDocument('users', { '_id': new mongoose.Types.ObjectId(docs.user_id) }, { _id: 1, username: 1 }, {}, (err, user) => {
                                    if (err) {
                                        res.send({ 'status': 0, 'errors': 'error in fetching data' });
                                    }
                                    else {
                                        var food = [];
                                        docs.foods.forEach(i => {
                                            food.push({ name: i.name, quantity: i.quantity, units: i.units, net_quantity: i.net_quantity});
                                        })
                                        var data = {};
                                        //data.restaurantname = restaurant.restaurantname;
                                        data.foods = food;
                                        data.username = user.username;
                                        data.order_id = docs.order_id;
                                        data.confirmed = docs.confirmed;

                                        data.grand_total = docs.billings.amount.grand_total;
                                        data.payment_mode = txn.type;
                                        res.send({ 'status': 1, message: 'data fetched successfully', data: data });
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    }
    controller.confirmOrderupdate = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('order_id', 'Order ID is required').notEmpty();
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
        request.order_id = req.body.order_id;
        request.driver_id = req.body.driver_id;
        db.GetOneDocument('orders', { 'order_id': request.order_id, 'driver_id': request.driver_id, status: { '$eq': 5 } }, {}, {}, (err, docs) => {
            if (err || !docs) {
                res.send({ 'status': 0, 'errors': 'Invalid credentials' });
            }
            else {
                db.UpdateDocument('orders', { 'order_id': request.order_id }, { confirmed: 1 }, {}, (err, update) => {
                    if (err || update.nModified == 0) {
                        res.send({ 'status': 0, message: 'Error in confirming order' });
                    } else {
                        res.send({ 'status': 1, message: 'data fetched successfully' });
                    }
                });
            }
        })
    }

    controller.logout = (req, res) => {

        req.checkBody('driver_id', 'driver_id is Required').notEmpty();
        req.checkBody('type', 'Type is required').notEmpty();
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
        if (req.body.type == 'android') { query = { 'android_notification_mode': '', 'device_info.gcm': '', 'avail': 0, 'currentStatus': 0, 'device_info.device_type': '', 'logout': 1 }; }
        else { query = { 'ios_notification_mode': '', 'device_info.device_token': '', 'avail': 0, 'device_info.device_type': '', 'currentStatus': 0, 'logout': 1 }; }

        db.GetDocument('drivers', { '_id': req.body.driver_id }, {}, {}, (err, docdata) => {
            if (err || !docdata || docdata.length == 0) {
                data.status = '0';
                data.errors = 'Invalid phone number..!';
                res.send(data);
            } else {
                db.UpdateDocument('drivers', { '_id': req.body.driver_id }, query, {}, (err, response) => {
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

    controller.food_list = (req, res) => {
        req.checkBody('order_id', 'order_id is Required').notEmpty();
        var data = {};

        var errors = req.validationErrors();
        if (errors) {
            data.status = 0;
            data.response = errors;
            res.send(data);
            return;
        }

        db.GetOneDocument('orders', { 'order_id': req.body.order_id }, { foods: 1, delivery_address: 1, city_id: 1 }, {}, (err, docs) => {
            if (err) {
                data.status = 0;
                data.response = err;
                res.send()
            }
            else {
                db.GetOneDocument('city', { '_id': new mongoose.Types.ObjectId(docs.city_id) }, { address: 1 }, {}, (err, docs1) => {
                    data.status = 1;
                    data.response = {};

                    data.response.dropoff_address = docs.delivery_address.fulladres;
                    data.response.pickup_address = docs1.address;
                    data.response.food_list = [];
                    // for (i in docs.foods) {
                    for (var i = 0; i < docs.foods.length; i++) {
                        data.response.food_list.push({ name: docs.foods[i].name, quantity: docs.foods[i].quantity,units: docs.foods[i].units,net_quantity: docs.foods[i].net_quantity});
                    }
                    res.send(data);
                })
            }
        })
    }
    controller.billings = (req, res) => {
        var errors = [];
        var moment = require('moment');
        var dateFormat = require('dateformat');
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
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

        request.driver_id = req.body.driver_id;

        var date = new Date();

        date = date.setDate(date.getDate() - 1);
        // console.log(date)
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {


            db.GetDocument('orders', { 'driver_id': new mongoose.Types.ObjectId(request.driver_id), 'status': { '$eq': 7 }, 'order_history.food_delivered': { '$gte': date } }, { order_id: 1, billings: 1, mileages_travelled: 1, driver_fare: 1 }, {}, (err, docs) => {
                db.GetOneDocument('settings', { 'alias': 'billing_cycle' }, {}, {}, (err, settings) => {
                    var datArray = [];
                    if (typeof settings.settings != "undefined" && typeof settings.settings.last_billed_date != 'undefined') {

                        var sdate = moment(new Date(settings.settings.last_billed_date));
                        var today = moment(new Date());


                        if (today.diff(sdate) > 1) {
                            sdate = sdate.add(1, 'days');
                            if (today.diff(sdate) > 0) {
                                var dateIterate = () => {
                                    if (today.diff(sdate) > 0) {
                                        var ndate = moment(new Date(sdate)).format("DD/MM/YYYY");
                                        datArray.push(ndate);
                                        sdate = sdate.add(1, 'days');
                                        dateIterate();
                                    }
                                }
                                dateIterate();
                            }

                        }


                    }
                    today = moment(new Date(today)).format("DD/MM/YYYY");


                    datArray.push(today);

                    if (err) {
                        res.send({ status: 0, response: err });
                    }
                    else {
                        var data = {};
                        if (docs.length > 0) {
                            data.earnings = [];
                            var total = 0;
                            for (i in docs) {
                                if (docs[i].driver_fare) {
                                    if (docs[i].driver_fare.format == 'km') {
                                        if (settings.settings.delivery_charge) {
                                            if (settings.settings.delivery_charge.format == 'ml') {
                                                docs[i].mileages_travelled = docs[i].mileages_travelled * 0.62137;
                                            }
                                        }

                                    }
                                    if (docs[i].driver_fare.format == 'ml') {
                                        if (settings.settings.delivery_charge) {
                                            if (settings.settings.delivery_charge.format == 'km') {
                                                docs[i].mileages_travelled = docs[i].mileages_travelled / 0.62137;
                                            }
                                        }
                                    }
                                }
                                docs[i].mileages_travelled = parseFloat(docs[i].mileages_travelled).toFixed(2)
                                //docs[i].mileages_travelled
                                data.earnings.push({ order_id: docs[i].order_id, order_amount: parseFloat(docs[i].billings.amount.total).toFixed(2), mileages_travelled: docs[i].mileages_travelled, you_earned: docs[i].billings.amount.driver_commission });
                                total = parseFloat(total) + parseFloat(docs[i].billings.amount.driver_commission)
                                total = parseFloat(total).toFixed(2);
                            }
                        }
                        else {
                            data.earnings = docs;
                        }
                        data.total_amount = total;
                        data.total_amount = parseFloat(data.total_amount).toFixed(2)
                        data.todaydate = ''

                        data.todaydate = '';
                        data.todaydate = data.todaydate + new Date().getDate() + '/';
                        data.todaydate = data.todaydate + new Date().getMonth() + '/';
                        data.todaydate = data.todaydate + new Date().getFullYear();
                        data.dateArray = datArray;

                        res.send({ status: 1, response: data });
                    }
                })
            })
        })
    }
    controller.accounts = (req, res) => {
        var errors = [];

        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
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

        request.driver_id = req.body.driver_id;
        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.driver_id) }, { account_details: 1, username: 1 }, {}, (err, docs) => {
            if (err) {
                res.send({ status: 0, data: err });
            }
            else {
                var data = {};

                data.account_name = docs.account_details.account_name;
                data.account_address = docs.account_details.account_address;
                data.account_number = docs.account_details.account_number;
                data.routing_number = docs.account_details.routing_number;
                data.bank_name = docs.account_details.bank_name;
                data.swift_code = docs.account_details.swift_code;
                data.branch_name = docs.account_details.branch_name;
                data.branch_address = docs.account_details.branch_address;

                res.send({ status: 1, data: data });
            }
        })
    }
    controller.editAccount = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver id is required').notEmpty();
        req.checkBody('account_name', 'Account name is required').notEmpty();
        req.checkBody('account_address', 'Account address is required').notEmpty();
        req.checkBody('account_number', 'Account number is required').notEmpty();
        req.checkBody('routing_number', 'Routing number is required').notEmpty();
        req.checkBody('bank_name', 'Bank name is required').notEmpty();
        req.checkBody('swift_code', 'Swift code is required').notEmpty();
        req.checkBody('branch_name', 'Branch Name is required').notEmpty();
        req.checkBody('branch_address', 'Branch address is required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({ 'status': 0, response: errors });
        }
        var data = {};
        var request = {};
        request.account_name = req.body.account_name;
        request.account_address = req.body.account_address;
        request.account_number = req.body.account_number;
        request.routing_number = req.body.routing_number;
        request.bank_name = req.body.bank_name;
        request.swift_code = req.body.swift_code;
        request.branch_name = req.body.branch_name;
        request.branch_address = req.body.branch_address;
        //request.user_name = req.body.user_name;
        db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id) }, { 'account_details': request }, {}, (err, updated) => {
            if (err) {
                res.send({ 'status': 0, response: err });
            }
            else {
                res.send({ 'status': 1, response: 'Updated successfully' });
            }
        })
    }

    controller.driverStat = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver id is required').notEmpty();
        req.checkBody('driverStat', 'Driver status is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({ 'status': 0, response: errors });
        }
        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id) }, {}, {}, (err, driverjob) => {
            if (err || !driverjob) {
                res.send({ 'status': 0, 'message': 'Driver not found' });
            } else {
                if (driverjob.status == 3) {
                    res.send({ status: 0, response: 'Your account need to be verified by admin' });
                } else if (driverjob.status == 2) {
                    res.send({ status: 0, response: 'Your account is inactive, Contact admin' });
                } else if (driverjob.status == 0) {
                    res.send({ status: 0, response: 'Your account is currently unavailable' });
                } else {
                    db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id) }, { 'currentStatus': req.body.driverStat, 'currentStatus': req.body.driverStat }, {}, (err, updated) => {
                        if (err) {
                            res.send({ status: 0, response: err });
                        }
                        else {
                            res.send({ status: 1, response: 'Updated successfully' });
                        }
                    })
                }
            }
        })
    }


    controller.currentJob = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver id is required').notEmpty();
        errors = req.validationErrors();
        var data = {};
        var request = {};
        request.driver_id = req.body.driver_id;
        if (errors) {
            res.send({ 'status': 0, response: errors });
        }
        else {
            db.GetOneDocument('drivers', { '_id': request.driver_id }, {}, {}, (err, driverjob) => {
                if (err || !driverjob) {
                    res.send({ 'status': 0, 'message': 'Driver not found' });
                } else {
                    db.GetOneDocument('city', { 'cityname': { $eq: driverjob.main_city } }, {}, {}, (err, cityDetais) => {
                        if (err || !cityDetais) {
                            res.send({ 'status': 0, 'message': 'City not found' });
                        } else {
                            
                            var driverjobs = 0;
                            if (driverjob) {
                                if (driverjob.currentJob) {
                                    driverjobs = driverjob.currentJob;
                                }
                            }

                            var aggregate_data = [];
                            aggregate_data.push(
                                { $match: { $and: [{ 'status': { '$gte': 5 } }, { 'status': { '$lt': 7 } }, { 'driver_id': new mongoose.Types.ObjectId(request.driver_id) }] } },
                                { $lookup: { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driverDetails" } },
                                { $unwind: { path: "$driverDetails", preserveNullAndEmptyArrays: true } },
                                {
                                    $project: {
                                        'orderDetails': {
                                            _id: '$_id',
                                            order_id: '$order_id',
                                            delivery_address: '$delivery_address',
                                            foods: '$foods',
                                            billings: '$billings',
                                            location: '$location'
                                        },
                                        'driverDetails': {
                                            _id: '$driverDetails._id',
                                            status: '$driverDetails.status',
                                            currentStatus: '$driverDetails.currentStatus'
                                        }
                                    }
                                }, { $project: { "orderDetails": 1, "driverDetails": 1 } }
                            );
                            db.GetAggregation('orders', aggregate_data, (err, orders) => {
                                if (err) {
                                    res.send({ 'status': 0, 'message': 'Cannot update' });
                                }
                                else {
                                    var driverStat = 0;
                                    if (orders.length > 0) {
                                        if (typeof orders[0].driverDetails.currentStatus == 'undefined') {
                                            driverStat = 1;
                                        }
                                        else {
                                            if (orders[0].driverDetails.currentStatus == 1) {
                                                driverStat = 1;
                                            }
                                            else {
                                                driverStat = 0;
                                            }
                                        }

                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
                                            var currency_symbol = (typeof (settings.settings.currency_symbol) == 'undefined') ? '$' : settings.settings.currency_symbol;
                                            var distanceUnit = 'ml';
                                            if (((typeof (cityDetais.driver_fare) == 'undefined') || (typeof (cityDetais.driver_fare) != 'undefined' && typeof (cityDetais.driver_fare.format) == 'undefined'))) {
                                                distanceUnit = 'km';
                                            } else {
                                                if (cityDetais.driver_fare.format == 'km') {
                                                    distanceUnit = 'km';
                                                }
                                            }
                                            //var distanceUnit = ((typeof (cityDetais.driver_fare) == 'undefined' ) || (typeof (cityDetais.driver_fare) != 'undefined' && typeof (cityDetais.driver_fare.format) == 'undefined')) ? 'km' : cityDetais.driver_fare.format;
                                            res.send({ status: 1, currentJob: driverjobs, driverStatus: driverStat, currency_symbol: currency_symbol, distanceUnit: distanceUnit });
                                        })
                                    }
                                    else {
                                        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.driver_id) }, { _id: 1, currentStatus: 1 }, {}, (err, driverss) => {
                                            if (err || !driverss) {
                                                res.send({ status: 1, currentJob: 0, driverStatus: 0 });
                                            }
                                            else {
                                                if (typeof driverss.currentStatus == 'undefined') {
                                                    driverStat = 1;
                                                }
                                                else {
                                                    if (driverss.currentStatus == 1) {
                                                        driverStat = 1;
                                                    }
                                                    else {
                                                        driverStat = 0;
                                                    }
                                                }

                                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
                                                    var currency_symbol = (typeof (settings.settings.currency_symbol) == 'undefined') ? '$' : settings.settings.currency_symbol;
                                                    //var distanceUnit = ((typeof (cityDetais.driver_fare) == 'undefined' ) || (typeof (cityDetais.driver_fare) != 'undefined' && typeof (cityDetais.driver_fare.format) == 'undefined')) ? 'km' : cityDetais.driver_fare.format;
                                                    var distanceUnit = 'ml';
                                                    if (((typeof (cityDetais.driver_fare) == 'undefined') || (typeof (cityDetais.driver_fare) != 'undefined' && typeof (cityDetais.driver_fare.format) == 'undefined'))) {
                                                        distanceUnit = 'km';
                                                    } else {
                                                        if (cityDetais.driver_fare.format == 'km') {
                                                            distanceUnit = 'km';
                                                        }
                                                    }
                                                    res.send({ status: 1, currentJob: driverjobs, driverStatus: driverStat, currency_symbol: currency_symbol, distanceUnit: distanceUnit });

                                                })
                                            }

                                        })
                                    }
                                }
                            })
                        }
                    })
                }
            })
        }
    }
    controller.continueJob = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver id is required').notEmpty();
        req.checkBody('order_id', 'order id is required').notEmpty();
        errors = req.validationErrors();
        var data = {};
        var request = {};
        if (errors) {
            res.send({ 'status': 0, response: errors });
        }
        else {
            request.driver_id = req.body.driver_id;
            var aggregate_data = [];
            aggregate_data.push(
                { $match: { $and: [{ 'status': { '$gte': 5 } }, { 'status': { '$lt': 7 } }, { 'driver_id': new mongoose.Types.ObjectId(request.driver_id) }, { 'order_id': { $eq: req.body.order_id } }] } },
                { $lookup: { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driverDetails" } },
                { $unwind: { path: "$driverDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        'orderDetails': {
                            _id: '$_id',
                            order_id: '$order_id',
                            status: '$status',
                            delivery_address: '$delivery_address',
                            city_id: '$city_id',
                            foods: '$foods',
                            billings: '$billings',
                            location: '$location'
                        },
                        'driverDetails': {
                            _id: '$driverDetails._id',
                            status: '$driverDetails.status',
                            currentStatus: '$driverDetails.currentStatus'
                        }
                    }
                }, { $project: { "orderDetails": 1, "driverDetails": 1 } }
            );
            db.GetAggregation('orders', aggregate_data, (err, orders) => {
                if (err) {
                    res.send({ status: 0, response: err });
                }
                else {
                    var response = {};
                    var func = (x, cb) => {
                        db.GetOneDocument('orders', { 'order_id': x.orderDetails.order_id }, {}, {}, (err, ord) => {
                            if (!err) {
                                // db.GetOneDocument('restaurant', { _id: ord.restaurant_id }, { _id: 1, address: 1, location: 1, phone: 1, restaurantname: 1, location: 1 }, {}, (err, restaurant) => {
                                //     if (!err) {
                                        db.GetOneDocument('users', { _id: ord.user_id }, { _id: 1, username: 1, phone: 1 }, {}, (userErr, userRespo) => {
                                            if (!userErr) {
                                                if (x.orderDetails.status == 5) {
                                                    response.jobStatus = 'Driver Accepted';
                                                    response.orders = ord;
                                                    response.confirmed = ord.confirmed;
                                                   // response.restaurant = restaurant;
                                                    //response.restaurant_name = restaurant.restaurantname;
                                                    response.order_id = ord.order_id;
                                                    response.order_address = ord.delivery_address;
                                                    response.food_details = ord.foods;
                                                    response.users = {};
                                                    response.users.username = userRespo.username;
                                                    if (userRespo.username) {
                                                        response.username = userRespo.username;
                                                    }
                                                    //response.username = userRespo.username;
                                                    response.userPhone = userRespo.phone;
                                                    //response.restaurant_id = restaurant._id;
                                                    cb(null);
                                                }
                                                else {
                                                    response.jobStatus = 'Driver pickedup';
                                                    response.orders = ord;
                                                    //response.restaurant = restaurant;
                                                    response.username = userRespo.username;
                                                    //response.restaurant_name = restaurant.restaurantname;
                                                    response.order_id = ord.order_id;
                                                    response.confirmed = ord.confirmed;
                                                    response.order_address = ord.delivery_address;
                                                    response.food_details = ord.foods;
                                                    response.users = {};
                                                    response.users.username = userRespo.username;
                                                    response.userPhone = userRespo.phone;
                                                    //response.restaurant_id = restaurant._id;
                                                    cb(null);
                                                }
                                            }
                                        })
                                //     }
                                // })
                            }
                        })
                    }

                    async.eachSeries(orders, func, (err, ress) => {
                        res.send({ status: 1, response: response });
                    })

                }
            })
        }
    }




    controller.getByCycle = (req, res) => {
        var moment = require('moment');
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('billing_id', 'Billing Id is required').notEmpty();
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

        request.driver_id = req.body.driver_id;
        request.billing_id = req.body.billing_id;
        db.GetOneDocument('driver_earnings', { 'billing_id': new mongoose.Types.ObjectId(req.body.billing_id), 'driver_id': new mongoose.Types.ObjectId(req.body.driver_id) }, {}, {}, (err, earnings) => {
            if (err || !earnings) {
                res.send({ status: 0, message: 'No data found' });
            }
            else {
                var aggregation_data = [
                    {
                        $sort: {
                            createdAt: -1
                        }
                    },
                    { $match: { $and: [{ status: { $eq: 7 } }, { "driver_id": new mongoose.Types.ObjectId(request.driver_id) }, { 'order_id': { $in: earnings.order_lists } }] } },
                    { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                    { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            'RestaurantDetails': {
                                _id: '$RestaurantDetails._id',
                                restaurant_name: '$RestaurantDetails.restaurantname',
                                address: '$RestaurantDetails.address'
                            }, 'orderDetails': {
                                _id: '$_id',
                                createdAt: '$createdAt',
                                status: '$status',
                                order_id: '$order_id',
                                delivery_address: '$delivery_address',
                                foods: '$foods',
                                billings: '$billings',
                                mileages_travelled: '$mileages_travelled'

                            }
                        }
                    }, { $project: { "orderDetails": 1, "RestaurantDetails": 1 } }
                ];

                db.GetAggregation('orders', aggregation_data, function (err, docdata) {
                    if (err) {

                        res.send(err)
                    }
                    else {
                        var data = {};
                        if (docdata.length > 0) {
                            data.Details = {};
                            data.Details.EarningDetails = [];
                            data.Details.TotalDetails = [];
                            var deliveryCount = 0;
                            var totalEarn = 0;
                            for (i in docdata) {
                                var temp = {};
                                temp.restaurant_address = '';
                                if (typeof docdata[i].RestaurantDetails.address.fulladres != 'undefined') {
                                    temp.restaurant_address = docdata[i].RestaurantDetails.address.fulladres;
                                }
                                temp.restaurant_name = docdata[i].RestaurantDetails.restaurant_name;
                                temp.delivery_address = docdata[i].orderDetails.delivery_address.fulladres;
                                temp.order_id = docdata[i].orderDetails.order_id;
                                temp.order_placed_on = moment(new Date(docdata[i].orderDetails.createdAt)).format('DD/MM/YY');
                                temp.food_list = docdata[i].orderDetails.foods;
                                temp.mileage = parseInt(docdata[i].orderDetails.mileages_travelled);

                                if (typeof docdata[i].orderDetails.billings != 'undefined') {
                                    temp.total = docdata[i].orderDetails.billings.amount.total;
                                    temp.driver_commission = docdata[i].orderDetails.billings.amount.driver_commission;
                                    totalEarn = totalEarn + temp.driver_commission
                                }
                                else {
                                    temp.total = 0;
                                    temp.driver_commission = 0;
                                    totalEarn = totalEarn + temp.driver_commission;

                                }

                                deliveryCount = deliveryCount + 1;
                                data.Details.EarningDetails.push(temp);
                            }
                            data.Details.TotalDetails.push({ DeliveryCount: deliveryCount, TotalEarning: totalEarn });
                        }
                        else {
                            data.Details = {};
                            data.Details.EarningDetails = [];
                            data.Details.TotalDetails = [];
                        }

                        res.send(data);
                    }
                })
            }
        })
    }
    controller.getCycles = (req, res) => {          ///    WILL FETCH BILLING CYCLES
        var moment = require('moment');
        db.GetOneDocument('settings', { 'alias': 'billing_cycle' }, {}, {}, (err, settings) => {   // CHECKING LAST BILLED DATE
            if (!err && settings != null) {
                var cycle_list = [];
                db.GetDocument('billing', {}, {}, {}, (err, cycles) => {
                    //   FETCHING ALL BILLING CYCLES
                    if (!err || cycles.length > 0) {
                        for (i in cycles) {
                            var start_date = moment(new Date(cycles[i].start_date)).format("DD/MM/YYYY");
                            var end_date = moment(new Date(cycles[i].end_date)).format("DD/MM/YYYY");

                            var str = start_date + ' - ' + end_date;
                            cycle_list.push({ id: cycles[i]._id, cycle: str });
                        }

                        var date = new Date(settings.settings.last_billed_date);
                        date = date.setDate(date.getDate() + 1);


                        date = moment(new Date(date)).format("DD/MM/YYYY");
                        var str = date + ' - till now';                 // CURRENT BILL CYCLE
                        cycle_list.unshift({ id: null, cycle: str });
                        res.send({ status: 1, cycle_list: cycle_list });
                    }
                    else {

                        res.send({ status: 0, cycle_list: [] });
                    }
                })
            }
            else {
                res.send({ status: 0, cycle_list: [] });
            }
        })
    }
    controller.docValidate = (req, res) => {
        req.checkBody('driver_id', 'Driver Id is Required').notEmpty();
        var data = {};
        data.status = '0';
        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data);
            return;
        }
        var data = {};
        var request = {};
        request.id = req.body.driver_id;
        db.GetDocument('documents', { 'doc_for': 'driver', 'has_require': 1, status: { $eq: 1 } }, {}, {}, (err, docs) => {
            if (!err) {
                db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.id) }, { driver_documents: 1 }, {}, (err, driver_docs) => {
                    if (!err) {
                        //if (typeof driver_docs != 'undefined' && typeof driver_docs.driver_documents != 'undefined' && driver_docs.driver_documents.length < docs.length) {
                        var doclen = docs.length;
                        if (typeof driver_docs != 'undefined' && driver_docs != null) {
                            for (i in docs) {
                                for (j in driver_docs.driver_documents) {
                                    if (docs[i].doc_name == driver_docs.driver_documents[j].doc_name) {
                                        if (driver_docs.driver_documents[j].image != '') {
                                            doclen = doclen - 1;
                                        }
                                    }
                                }
                            }
                            if (doclen > 0) {
                                res.send({ status: 0, response: 'Mandatory documents to be  uploaded yet' })
                            }
                            else {
                                res.send({ status: 1, response: 'Documents uploaded successfully' })
                            }

                        }
                        else {
                            res.send({ status: 0, response: 'Mandatory documents to be  uploaded yet' })
                        }
                    }
                })
            }
        })
    }

    controller.billingForADay = (req, res) => {
        var errors = [];

        var moment = require('moment');
        var dateFormat = require('dateformat');
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('date', 'Date is required').notEmpty();
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

        request.driver_id = req.body.driver_id;
        request.date = req.body.date;
        var arr = request.date.toString().replace('/', '-').replace('/', '-');
        var sdate = moment(arr, 'MM-DD-YYYY');

        var next_date = request.date.split('/');
        var date = next_date[0];
        var month = next_date[1];
        var year = next_date[2];
        var arr1 = year + '-' + month + '-' + date + 'T23:59:59Z';
        var next_date = arr.split('-');
        var date = next_date[0];
        var month = next_date[1];
        var year = next_date[2];
        var arr = year + '-' + month + '-' + date + 'T00:00:00Z';
        //var ndate = moment(arr1,'MM-DD-YYYY');

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
            db.GetDocument('orders', { 'driver_id': new mongoose.Types.ObjectId(request.driver_id), 'status': { '$eq': 7 }, 'order_history.food_delivered': { '$gte': new Date(arr), '$lte': new Date(arr1) } }, { order_id: 1, billings: 1, mileages_travelled: 1, driver_fare: 1 }, {}, (err, docs) => {
                if (err) {
                    res.send({ status: 0, response: err });
                }
                else {
                    var data = {};
                    if (docs.length > 0) {
                        data.earnings = [];
                        var total = 0;
                        for (i in docs) {
                            if (docs[i].driver_fare) {
                                if (docs[i].driver_fare.format == 'km') {
                                    if (settings.settings.delivery_charge) {
                                        if (settings.settings.delivery_charge.format == 'ml') {
                                            docs[i].mileages_travelled = docs[i].mileages_travelled * 0.62137;
                                        }
                                    }
                                }
                                if (docs[i].driver_fare.format == 'ml') {
                                    if (settings.settings.delivery_charge) {
                                        if (settings.settings.delivery_charge.format == 'km') {
                                            docs[i].mileages_travelled = docs[i].mileages_travelled / 0.62137;
                                        }
                                    }
                                }
                            }
                            docs[i].mileages_travelled = parseFloat(docs[i].mileages_travelled).toFixed(2)
                            data.earnings.push({ order_id: docs[i].order_id, order_amount: docs[i].billings.amount.total, mileages_travelled: docs[i].mileages_travelled, you_earned: docs[i].billings.amount.driver_commission });
                            total = parseFloat(total) + parseFloat(docs[i].billings.amount.driver_commission)
                            total = parseFloat(total).toFixed(2);
                        }
                    }
                    else {
                        data.earnings = docs;
                    }
                    data.total_amount = total;
                    data.todaydate = arr;
                    res.send({ status: 1, response: data });
                }
            })
        })
    }
    controller.driverCurrentLocation = function (req, res) {
        req.checkBody('driver_id', library.getlanguage(req, 'ADA.back-end.DRIVER_ID_REQUIRED', 'driver id is required')).notEmpty();
        req.checkBody('lat', library.getlanguage(req, 'ADA.back-end.LAT_REQUIRED', 'lat is required')).notEmpty();
        req.checkBody('long', library.getlanguage(req, 'ADA.back-end.LONG_REQUIRED', 'long is required')).notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        if (req.body.driver_id) {
            var driverId = req.body.driver_id;
        }
        if (req.body.lat) {
            var lat = req.body.lat;
        }
        if (req.body.long) {
            var lon = req.body.long;
        }
        var radius = 20;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ status: 0, message: 'Configure your app settings' });
            } else {
                var temp_radius = settings.settings.radius || 20;
                var radius = parseInt(temp_radius);
                db.GetOneDocument('drivers', { status: { $eq: 1 } }, {}, {}, function (err, drivers) {
                    if (err || !drivers || (drivers && typeof drivers._id == 'undefined')) {
                        res.send({ status: 0, message: 'Driver not found.' });
                    } else {
                        var updateDetails = { "$pull": { 'driver_location': { id: { $in: [driverId] } } } };
                        var condition = { "driver_location": { $elemMatch: { "id": driverId } } };
                        db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) { });
                        var geocode = { 'latitude': lat, 'longitude': lon };
                        GoogleAPI.geocode(geocode, function (response) {
                            if (response[0]) {
                                if (response[0].formatted_address) {
                                    var addres = response[0].formatted_address;
                                } else {
                                    addres = '';
                                }
                            }
                            else {
                                addres = '';
                            }
                            var location = {};
                            location.lng = lon;
                            location.lat = lat;
                            var updateDetails = { location: location, 'address.fulladres': addres, last_update_time: Date.now() };
                            var condition = { "_id": driverId };
                            db.UpdateDocument('drivers', condition, updateDetails, { multi: true }, function (err, driversUpdate) {
                                res.send({ status: 1, message: 'update successfully' });
                            });
                        });
                    }
                });
            }
        })
    };
    controller.billingCycle = (req, res) => {
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
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
        request.driver_id = req.body.driver_id;
        db.GetOneDocument('settings', { 'alias': 'billing_cycle' }, {}, {}, (err, settings) => {
            var date = '';
            if (err || !settings) {
                res.send({ status: "0", errors: 'Error in DB' });
            }
            else {
                if (typeof settings.settings.last_billed_time != 'undefined') {
                    date = parseInt(settings.settings.last_billed_time);
                } else {
                    date = new Date(settings.settings.last_billed_date).getTime();
                }
            }

            var aggregation_data1 = [
                { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id), "created_time": { "$gte": date } } },
                { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
                {
                    $project: {
                        'RestaurantDetails': {
                            _id: '$RestaurantDetails._id',
                            restaurant_name: '$RestaurantDetails.restaurantname',
                            address: '$RestaurantDetails.address',
                            location: '$RestaurantDetails.location'
                        }, 'orderDetails': {
                            _id: '$_id',
                            createdAt: '$createdAt',
                            status: '$status',
                            order_id: '$order_id',
                            delivery_address: '$delivery_address',
                            foods: '$foods',
                            billings: '$billings',
                            mileages_travelled: '$mileages_travelled'

                        }, 'UserDetails': {
                            _id: '$UserDetails._id',
                            address: '$UserDetails.address',
                            location: '$UserDetails.location',
                            username: '$UserDetails.username'
                        }


                    }
                }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
            ];
            var data = {};
            db.GetAggregation('orders', aggregation_data1, (err, hist) => {
                var current_bill = 0;
                var current_total = hist.length;
                var current_status = 'Pending';
                var curr_date1 = new Date(settings.settings.last_billed_date);
                curr_date1 = curr_date1.setDate(new Date(curr_date1.getDate()));
                curr_date1 = new Date(curr_date1)
                var curr_date2 = new Date();
                var current_date = '';
                var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                current_date = month[curr_date1.getMonth()] + ' ' + curr_date1.getDate() + ' to ' + month[curr_date2.getMonth()] + ' ' + curr_date2.getDate();
                if (hist.length > 0) {
                    for (i in hist) {
                        var bir_amount = 0;
                        if (typeof hist[i].orderDetails.billings.amount.bir_tax_amount != 'undefined') {
                            bir_amount = hist[i].orderDetails.billings.amount.bir_tax_amount;
                        }

                        current_bill = parseFloat(current_bill) + parseFloat(hist[i].orderDetails.billings.amount.driver_commission - bir_amount);
                    }
                }
                db.GetDocument('billing', {}, {}, {}, (err, billings) => {
                    var history = [];
                    if (!err || billings.length > 0) {
                        var asyncFunc = (x, cb) => {
                            db.GetOneDocument('driver_earnings', { 'billing_id': new mongoose.Types.ObjectId(x._id), 'driver_id': new mongoose.Types.ObjectId(req.body.driver_id) }, {}, {}, (err, earning) => {
                                if (earning) {
                                    if (earning.order_lists.length > 0) {
                                        db.GetDocument('orders', { 'order_id': { $in: earning.order_lists } }, {}, {}, (err, orders) => {
                                            var temp = {};
                                            var sdate = new Date(x.start_date);
                                            var edate = new Date(x.end_date);
                                            temp.cycle = sdate.getDate() + ' - ' + edate.getDate();
                                            temp.orders = orders.length;
                                            var total = 0;
                                            for (i in orders) {
                                                total = total + orders[i].billings.amount.driver_commission;
                                            }
                                            temp.earning = total;
                                            temp.earning = parseFloat(temp.earning).toFixed(2);
                                            if (earning.paid_status == 0) {
                                                temp.status = 'Pending';
                                            }
                                            else {
                                                temp.status = 'Paid';
                                            }
                                            history.push(temp);
                                            cb(null)
                                        })
                                    } else {
                                        cb(null)
                                    }
                                }
                                else {
                                    /*  var temp = {};
                                     var sdate = new Date(x.start_date);
                                     var edate = new Date(x.end_date);
                                     temp.cycle = sdate.getDate() + ' - ' + edate.getDate();
                                     temp.orders = 0;
                                     var total = 0;
 
                                     temp.earning = total;
                                     temp.earning = parseFloat(temp.earning).toFixed(2)
                                     temp.status = '-'
                                     history.push(temp);
                                     cb(null) */
                                    cb(null)
                                }
                            })
                        }
                        async.eachSeries(billings, asyncFunc, (err, ress) => {
                            data.total_order = current_total;
                            data.total_earning = current_bill;
                            data.status = current_status;
                            data.date = current_date;
                            data.history = [];
                            data.history = history;
                            res.send({ status: 1, data: data });
                        })
                    }
                })
            })
        })

    }
    //social login
    controller.socialLogin = function (req, res) {
        var errors = [];
        req.checkBody('social_type', 'social_type is Required').notEmpty();
        req.checkBody('social_id', 'social_id is Required').notEmpty();
        req.checkBody('email', 'email is required').optional();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm id is required').optional();

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
        data.loginId = Date.now();
        if (typeof req.body.loginId != 'undefined') {
            data.loginId = req.body.loginId;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": 'Configure your settings' });
            } else {
                if (data.email) {
                    db.GetOneDocument('drivers', { "email": data.email }, {}, {}, function (err, emailcheck) {
                        if (err) {
                            res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
                        } else {
                            if (emailcheck) {
                                if (emailcheck.password) { res.send({ status: '3', message: 'This mail already taken while normal signup..!' }); }
                                else if (!emailcheck.password || emailcheck.social_login.facebook_id == data.social_id || emailcheck.social_login.google_id == data.social_id) {
                                    if (data.social_type == 'google') {
                                        var query = { 'social_login.google_id': req.body.social_id };
                                    }
                                    else if (data.social_type == 'facebook') {
                                        query = { 'social_login.facebook_id': req.body.social_id }
                                    }
                                    db.GetOneDocument('drivers', query, {}, {}, function (err, driver) {
                                        if (err || !driver) { res.send({ "status": "2", "message": 'No drivers found' }); }
                                        else {
                                            if (driver.device_info.gcm != '' || driver.device_info.device_token != '') {
                                                db.UpdateDocument('drivers', { '_id': driver._id }, { 'device_info.gcm': '', 'device_info.device_token': '', 'loginId': data.loginId }, {}, (err, updatedd) => {
                                                })
                                            }
                                            if (driver.status == 1 || driver.status == 3) {
                                                db.UpdateDocument('drivers', { "_id": driver._id }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                                    if (err || response.nModified == 0) {
                                                        res.send({
                                                            "status": 0,
                                                            "errors": 'Please check the email and try again', "error_flag": 0
                                                        });
                                                    } else {

                                                        var deviceInfo = {};
                                                        deviceInfo = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'loginId': data.loginId };
                                                        if (data.gcm) {
                                                            deviceInfo = { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm, 'loginId': data.loginId };
                                                        }
                                                        db.UpdateDocument('drivers', { "_id": driver._id }, deviceInfo, {}, function (err, response) {
                                                            var driver_image = '';
                                                            if (driver.avatar) {
                                                                var imagedriver = driver.avatar.split('./');
                                                                if (imagedriver[0] == '') {
                                                                    driver_image = settings.settings.site_url + imagedriver[1];
                                                                } else {
                                                                    driver_image = settings.settings.site_url + driver.avatar;
                                                                }
                                                            } else {
                                                                driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                            }

                                                            res.send({
                                                                status: '1',
                                                                driver_image: driver_image,
                                                                driver_id: driver._id,
                                                                driver_name: driver.username,
                                                                email: driver.email,
                                                                message: 'You are Logged In successfully',
                                                                currency_code: settings.settings.currency_code,
                                                                currency_symbol: settings.settings.currency_symbol,
                                                                referal_code: driver.unique_code || "",
                                                                refered_code: '',
                                                                location_name: driver.address.city || "",
                                                                country_code: driver.phone.code,
                                                                phone_number: driver.phone.number,
                                                                driver_status: driver.status,
                                                                loginId: data.loginId
                                                            })
                                                        })
                                                    }
                                                });
                                            } else {
                                                if (driver.status == 0) {
                                                    res.send({
                                                        "status": 0,
                                                        "errors": 'Your account is currently unavailable', "error_flag": 0
                                                    });
                                                } else if (driver.status == 3) {
                                                    res.send({
                                                        "status": 0,
                                                        "errors": 'Your account need to be verified by admin', "error_flag": 0
                                                    });
                                                }
                                                else if (driver.status == 2) {
                                                    res.send({
                                                        "status": 0,
                                                        "errors": 'Your account is inactive, Contact admin', "error_flag": 0
                                                    });
                                                }
                                            }
                                        }
                                    });
                                }
                            }
                            else {
                                res.send({ status: '2', message: 'No users found' });
                            }
                        }
                    });
                }
                else {
                    if (data.social_type == 'google') {
                        var query = { 'social_login.google_id': req.body.social_id };
                    }
                    else if (data.social_type == 'facebook') {
                        query = { 'social_login.facebook_id': req.body.social_id }
                    }
                    db.GetOneDocument('drivers', query, {}, {}, function (err, driver) {
                        if (err || !driver) { res.send({ "status": "2", "message": 'No drivers found' }); }
                        else {
                            if (driver.device_info.gcm != '' || driver.device_info.device_token != '') {
                                db.UpdateDocument('drivers', { '_id': docs[0]._id }, { 'device_info.gcm': '', 'device_info.device_token': '', 'loginId': data.loginId }, {}, (err, updatedd) => {
                                })
                            }
                            if (driver.status == 1 || driver.status == 3) {
                                db.UpdateDocument('drivers', { "_id": driver._id }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                    if (err || response.nModified == 0) {
                                        res.send({
                                            "status": 0,
                                            "errors": 'Please check the email and try again', "error_flag": 0
                                        });
                                    } else {

                                        var deviceInfo = {};
                                        deviceInfo = { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'loginId': data.loginId };
                                        if (data.gcm) {
                                            deviceInfo = { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm, 'loginId': data.loginId };
                                        }
                                        db.UpdateDocument('drivers', { "_id": driver._id }, deviceInfo, {}, function (err, response) {
                                            var driver_image = '';
                                            if (driver.avatar) {
                                                var imagedriver = driver.avatar.split('./');
                                                if (imagedriver[0] == '') {
                                                    driver_image = settings.settings.site_url + imagedriver[1];
                                                } else {
                                                    driver_image = settings.settings.site_url + driver.avatar;
                                                }
                                            } else {
                                                driver_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }
                                            res.send({
                                                status: '1',
                                                driver_image: driver_image,
                                                driver_id: driver._id,
                                                driver_name: driver.username,
                                                email: driver.email,
                                                message: 'You are Logged In successfully',
                                                currency_code: settings.settings.currency_code,
                                                currency_symbol: settings.settings.currency_symbol,
                                                referal_code: driver.unique_code || "",
                                                refered_code: '',
                                                location_name: driver.address.city || "",
                                                country_code: driver.phone.code,
                                                phone_number: driver.phone.number,
                                                driver_status: driver.status,
                                                loginId: data.loginId
                                            })
                                        })
                                    }
                                });
                            } else {
                                if (driver.status == 0) {
                                    res.send({
                                        "status": 0,
                                        "errors": 'Your account is currently unavailable', "error_flag": 0
                                    });
                                } else if (driver.status == 3) {
                                    res.send({
                                        "status": 0,
                                        "errors": 'Your account need to be verified by admin', "error_flag": 0
                                    });
                                }
                                else if (driver.status == 2) {
                                    res.send({
                                        "status": 0,
                                        "errors": 'Your account is inactive, Contact admin', "error_flag": 0
                                    });
                                }
                            }
                        }
                    });
                }
            }
        });
    }
    //social login
    //social signup
    controller.socialSignUp = function (req, res) {
        var errors = [];
        req.checkBody('social_type', 'social_type is Required').notEmpty();
        req.checkBody('social_id', 'social_id is Required').notEmpty();

        req.checkBody('first_name', 'first name is required').notEmpty();
        // req.checkBody('last_name', 'last name is required').optional();
        req.checkBody('email', 'email is required').isEmail();

        req.checkBody('city', 'city is required').notEmpty();
        req.checkBody('lat', 'lat is required').notEmpty();
        req.checkBody('long', 'long is required').notEmpty();
        req.checkBody('vehicle_type', 'vehicle_type is required').notEmpty();
        req.checkBody('country_code', 'country_code is required').notEmpty();
        req.checkBody('phone_number', 'phone_number is required').notEmpty();
        req.checkBody('deviceToken', 'deviceToken is required').optional();
        req.checkBody('gcm_id', 'gcm id is required').optional();


        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        req.sanitizeBody('social_type').trim();
        req.sanitizeBody('social_id').trim();
        req.sanitizeBody('first_name').trim();
        req.sanitizeBody('last_name').trim();
        req.sanitizeBody('email').trim();
        //req.sanitizeBody('password').trim();
        req.sanitizeBody('city').trim();
        req.sanitizeBody('lat').trim();
        req.sanitizeBody('vehicle_type').trim();
        req.sanitizeBody('long').trim();
        req.sanitizeBody('country_code').trim();
        req.sanitizeBody('phone_number').trim();
        req.sanitizeBody('deviceToken').trim();
        req.sanitizeBody('gcm_id').trim();

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
        // data.last_name = req.body.last_name;
        data.email = req.body.email;
        // data.password = req.body.password;
        data.token = req.body.deviceToken;
        data.gcm = req.body.gcm_id;
        // data.prof_pic = req.body.prof_pic;
        data.phone.code = req.body.country_code;
        data.phone.number = req.body.phone_number;
        data.unique_code = library.randomString(8, '#A');
        data.city = req.body.city;
        data.lat = req.body.lat;
        data.long = req.body.long;
        data.vehicle_type = req.body.vehicle_type;
        data.loginId = Date.now();
        if (typeof req.body.loginId != 'undefined') {
            data.loginId = req.body.loginId;
        }
        db.GetDocument('drivers', { "phone.number": data.phone.number, "phone.code": data.phone.code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
            } else {
                if (phonedocs.length != 0) {
                    res.send({ "status": "0", "errors": 'mobile number exist' });
                } else {
                    var newdata = { phone: {} };
                    newdata.username = data.username;
                    // newdata.last_name = data.last_name;
                    newdata.main_city = data.city;
                    newdata.category = data.vehicle_type;
                    newdata.unique_code = library.randomString(8, '#A');
                    newdata.role = 'driver';
                    newdata.email = data.email;
                    //newdata.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
                    newdata.status = 3;
                    newdata.location = {};
                    newdata.currentJob = 0;
                    newdata.social_login = data.social_login;
                    newdata.phone.code = req.body.country_code;
                    newdata.loginId = data.loginId;
                    newdata.phone.number = req.body.phone_number;
                    newdata.location.lng = parseFloat(data.long);
                    newdata.location.lat = parseFloat(data.lat);
                    newdata.currentStatus = 0;

                    db.InsertDocument('drivers', newdata, function (err, response) {
                        if (err || response.nModified == 0) {
                            res.send({ "status": "0", "errors": 'Sorry Email Exist..!' });
                        } else {
                            var updateData = { 'device_info.device_type': 'ios', 'device_info.device_token': data.deviceToken, 'activity.last_login': new Date() }
                            if (data.gcm) {
                                updateData = { 'device_info.device_type': 'android', 'device_info.device_token': '', 'device_info.gcm': data.gcm, 'activity.last_login': new Date() };
                            }
                            db.UpdateDocument('drivers', { '_id': response._id }, updateData, {}, function (err, responseuser) {
                                if (err || responseuser.nModified == 0) {
                                    res.send({ "status": 0, "errors": 'Sorry error in signup..!' });
                                } else {
                                    res.send({
                                        "status": '1',
                                        "message": 'Successfully registered',
                                        "driver_id": response._id,
                                        "user_name": response.username,
                                        "email": response.email,
                                        "country_code": response.phone.code,
                                        "phone_number": response.phone.number
                                    });
                                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                        db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                            mailData1 = {};
                                            mailData1.template = 'driver_signupto_admin';
                                            mailData1.to = admin.email;
                                            mailData1.html = [];
                                            mailData1.html.push({ name: 'admin', value: admin.username || "" });
                                            mailData1.html.push({ name: 'city', value: response.main_city || "" });
                                            mailData1.html.push({ name: 'vehicle', value: response.category || "" });
                                            mailData1.html.push({ name: 'name', value: response.username || "" });
                                            mailcontent.sendmail(mailData1, function (err, response) {
                                            });
                                        });
                                    });
                                    mailData = {};
                                    mailData.template = 'driver_signupto_driver';
                                    mailData.to = response.email;
                                    mailData.html = [];
                                    mailData.html.push({ name: 'name', value: response.username || "" });
                                    mailcontent.sendmail(mailData, function (err, response) {
                                    });
                                }
                            })

                        }
                    });
                }
            }
        });
    };

    //social  signup
    //social check
    controller.socialCheck = function (req, res) { // not using
        var errors = [];
        req.checkBody('email', 'email is required').notEmpty();
        req.checkBody('social_id', 'social_id is Required').notEmpty();
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
        db.GetOneDocument('drivers', { "email": data.email }, {}, {}, function (err, emailcheck) {
            if (err) {
                res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
            } else {
                if (emailcheck) {
                    if (emailcheck.password) { res.send({ status: '1', message: 'This mail already taken while normal signup..!' }); } else if (!emailcheck.password || emailcheck.social_login.facebook_id == data.social_id || emailcheck.social_login.google_id == data.social_id) { res.send({ status: '2', message: "This mail already taken while social signup..!" }); }
                } else { res.send({ status: '3', message: 'No users found' }); }
            }
        });
    }
    //social check
    //Signup otp

    controller.socialSignUpOtp = function (req, res) {
        var errors = [];
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

        var status = '0';
        var message = '';
        var data = {};
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;

        db.GetDocument('drivers', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
            } else {
                if (phonedocs.length != 0) { res.send({ "status": "0", "errors": 'mobile number exist' }); } else {
                    db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                        if (err) {
                            res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
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
                                    //console.log(err, response)
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
    //Signup otp
    //forgotOtp
    controller.forgotOtp = function (req, res) {
        var errors = [];
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

        var status = '0';
        var message = '';
        var data = {};
        data.country_code = req.body.country_code;
        data.phone_number = req.body.phone_number;

        db.GetDocument('drivers', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
            if (err) {
                res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
            } else {
                if (phonedocs.length == 0) { res.send({ "status": "0", "errors": 'Mobile number does not match with registered Mobile number' }); } else {
                    db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, settings) {
                        if (err) {
                            res.send({ "status": "0", "errors": 'Something Went Wrong..!!' });
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
                                } else {
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

    controller.getSettings = function (req, res) {
        var driverId;
        if (typeof req.body.driverId != 'undefined' && req.body.driverId != '') {
            if (isObjectId(req.body.driverId)) {
                driverId = new mongoose.Types.ObjectId(req.body.driverId);
            } else {
                res.send({ status: 0, message: library.getlanguage(req, 'ADA.back-end.INVALID_DRIVERID', 'Invalid driverId') });
                return;
            }
        } else {
            res.send({ status: 0, message: library.getlanguage(req, 'ADA.back-end.INVALID_DRIVERID', 'Invalid driverId') });
            return;
        }
        db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1 }, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ status: 0, message: library.getlanguage(req, 'ADA.back-end.UNABLE_FETCH_DATA', 'unable to fetch data'), driverDetails: {} });
            } else {
                var wallet_admin_settings = { minimum_recharge: 0, minimum_request: 0, minimum_amount: 0, maximum_amount: 0 };
                var settings = settings.settings;
                if (typeof settings.wallet != 'undefined' && typeof settings.wallet.amount != 'undefined') {
                    if (typeof settings.wallet.amount.minimum_recharge != 'undefined') {
                        wallet_admin_settings.minimum_recharge = settings.wallet.amount.minimum_recharge;
                    }
                    if (typeof settings.wallet.amount.minimum_request != 'undefined') {
                        wallet_admin_settings.minimum_request = settings.wallet.amount.minimum_request;
                    }
                    if (typeof settings.wallet.amount.minimum_amount != 'undefined') {
                        wallet_admin_settings.minimum_amount = settings.wallet.amount.minimum_amount;
                    }
                    if (typeof settings.wallet.amount.maximum_amount != 'undefined') {
                        wallet_admin_settings.maximum_amount = settings.wallet.amount.maximum_amount;
                    }
                }
                db.GetOneDocument('drivers', { _id: driverId }, { _id: 1, 'username': 1, 'email': 1, 'phone': 1, 'wallet_settings': 1, 'avatar': 1 }, {}, function (err, docdata) {
                    if (err || !docdata) {
                        res.send({ status: 0, message: library.getlanguage(req, 'ADA.back-end.UNABLE_FETCH_DATA', 'unable to fetch data'), driverDetails: {} });
                    } else {
                        var wallet_settings = { life_time: 0, available: 0, used: 0 };
                        if (typeof docdata._id != 'undefined') {
                            if (typeof docdata.wallet_settings != 'undefined') {
                                if (typeof docdata.wallet_settings.life_time != 'undefined') {
                                    wallet_settings.life_time = docdata.wallet_settings.life_time;
                                }
                                if (typeof docdata.wallet_settings.available != 'undefined') {
                                    wallet_settings.available = docdata.wallet_settings.available;
                                }
                                if (typeof docdata.wallet_settings.used != 'undefined') {
                                    wallet_settings.used = docdata.wallet_settings.used;
                                }
                            }
                            var driverDetails = { wallet_settings: wallet_settings, wallet_admin_settings: wallet_admin_settings };
                            res.send({ status: 1, message: '', driverDetails: driverDetails });
                        } else {
                            res.send({ status: 0, message: library.getlanguage(req, 'ADA.back-end.UNABLE_FETCH_DATA', 'unable to fetch data'), driverDetails: {} });
                        }
                    }
                });
            }
        });
    }

    controller.OfflineEarnings = (req, res) => {
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var driver_com = 0;
        var last_commission = 0;
        var totalOrders = 0;
        var request = {};
        request.driver_id = req.body.driver_id;
        var date = new Date();
        date = date.setDate(date.getDate() - 1);
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, generalSettings) => {
            if (err) {
                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
            } else {
                db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.driver_id) }, {}, {}, (err, driverData) => {
                    if (err) {
                        res.send({ "status": 0, "message": 'Invalid driver' });
                    } else {
                        db.GetDocument('orders', { 'driver_id': new mongoose.Types.ObjectId(request.driver_id), 'status': { '$eq': 7 }, 'order_history.food_delivered': { '$gte': date } }, { order_id: 1, billings: 1, driver_fare: 1 }, {}, (err, docs) => {
                            if (err) {
                                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                            } else {
                                if (docs && docs.length > 0 && typeof docs != 'undefined') {
                                    totalOrders = docs.length;
                                    for (var i = 0; i < docs.length; i++) {
                                        driver_com = driver_com + docs[i].billings.amount.driver_commission;
                                        last_commission = docs[i].billings.amount.driver_commission;
                                    }
                                }
                                var driver_image = '';
                                if (driverData.avatar) {
                                    var imagedriver = driverData.avatar.split('./');
                                    if (imagedriver[0] == '') {
                                        driver_image = generalSettings.settings.site_url + imagedriver[1];
                                    } else {
                                        driver_image = generalSettings.settings.site_url + driverData.avatar;
                                    }
                                } else {
                                    driver_image = generalSettings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                }
                                var data = {};
                                data.avatar = driver_image;
                                data.driver_name = driverData.username;
                                data.address = driverData.address;
                                data.driver_ratings = driverData.avg_ratings;
                                data.totalOrders = totalOrders;
                                data.total_earning = driver_com;
                                data.last_earning = last_commission;
                                res.send({ "status": 1, "message": "", "data": data })
                            }
                        })
                    }
                })
            }
        })
    }

    controller.orderlist = (req, res) => {
        req.checkBody('driver_id', 'driver_id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "message": errors[0].msg });
            return;
        }
        var orderList = [];
        db.GetDocument('orders', { "driver_id": new mongoose.Types.ObjectId(req.body.driver_id), status: { '$in': [5, 6] } }, {}, {}, function (err, orderDocs) {
            if (err || !orderDocs) {
                res.send({ "status": "0", "message": "Invalid driver id..!!" });
            } else {
                db.GetOneDocument('drivers', { "_id": new mongoose.Types.ObjectId(req.body.driver_id) }, {}, {}, function (err, driverdocs) {
                    if (err || !driverdocs) {
                        res.send({ "status": "0", "message": "Invalid driver id..!!" });
                    } else {
                        each(orderDocs, (orders, next) => {
                            db.GetOneDocument('users', { "_id": new mongoose.Types.ObjectId(orders.user_id) }, {}, {}, function (err, userDocs) {
                                if (err || !userDocs) {
                                    next()
                                } else {
                                    db.GetOneDocument('city', { "_id": new mongoose.Types.ObjectId(orders.city_id) }, {}, {}, function (err, restDocs) {
                                        if (err || !restDocs) {
                                            next()
                                        } else {
                                            var ordersdetails = {};
                                            ordersdetails.lat = restDocs.location.lat;
                                            ordersdetails.lon = restDocs.location.lng;
                                            ordersdetails.orderTime = Date.now(orders.createdAt);
                                            ordersdetails._id = orders._id;
                                            ordersdetails.order_id = orders.order_id;
                                            ordersdetails.city_id = restDocs._id;
                                            ordersdetails.food_amount = orders.billings.amount.grand_total;
                                            ordersdetails.order_status_string = orders.status == 5 ? 'Accept' : 'Pickedup';
                                            ordersdetails.order_status = orders.status;
                                            ordersdetails.status = 1;
                                            //ordersdetails.restaurant_name = restDocs.restaurantname;
                                            ordersdetails.delivery_address = orders.delivery_address.fulladres;
                                            ordersdetails.user_name = userDocs.username;
                                            //ordersdetails.restaurant_address = restDocs.address.fulladres;
                                            ordersdetails.mileage = 0;
                                            ordersdetails.schedule_date = orders.schedule_date;
                                            ordersdetails.schedule_time_slot = orders.schedule_time_slot;
                                            ordersdetails.delivery_time = orders.delivery_time ? orders.delivery_time : '';
                                            orderList.push(ordersdetails)
                                            next();
                                        }
                                    })
                                }
                            })
                        }, (err, eachData) => {
                            var data = {}
                            data.status = '1';
                            data.response = {};
                            data.response.count = orderList.length;
                            data.response.orderList = orderList;
                            data.response.location = driverdocs.location;
                            res.send({ "status": "1", "message": "", 'data': data });
                        })
                    }
                })
            }
        })
    }


    return controller;
}