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
    var deg2rad = require('deg2rad');
    var stripe = require('stripe')('');
    var format = require('format-number');
    var myFormat = format({ integerSeparator: ',' });
    var urlrequest = require('request');
    var EventEmitter = require('events').EventEmitter;
    var events = new EventEmitter();
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }


    function jwtSign(payload) {
        var token = jwt.sign(payload, CONFIG.SECRET_KEY);
        return token;
    }



    controller.login = function (req, res) {
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

        var status = '0';
        var message = '';
        var data = {};
        data.email = req.body.email;
        data.password = req.body.password;
        data.token = req.body.deviceToken;
        data.gcm = req.body.gcm_id;

        var validPassword = function (password, passwordb) {
            return bcrypt.compareSync(password, passwordb);
        };

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err) {
                res.send({
                    "status": '0',
                    "errors": 'Please check the email and try again'
                });
            } else {
                db.GetDocument('restaurant', { email: data.email, 'status': { $ne: 0 } }, {}, {}, function (err, docs) {
                    if (err || !docs[0]) {
                        res.send({
                            "status": '0',
                            "errors": 'Please check the email and try again'
                        });
                    } else {
                        if (docs[0].status == 2) {
                            res.send({
                                "status": '0',
                                "errors": 'Your restaurant is inactive kindly contact admin for further details'
                            });
                        }
                        else {
                            if (validPassword(req.body.password, docs[0].password)) {
                                if (docs[0].status == 1) {
                                    db.UpdateDocument('restaurant', { email: data.email, 'status': { $eq: 1 } }, { 'activity.last_login': new Date() }, {}, function (err, response) {
                                        if (err || response.nModified == 0) {
                                            res.send({
                                                "status": '0',
                                                "errors": 'Please check the email and try again'
                                            });
                                        } else {
                                            if (data.token) {
                                                db.UpdateDocument('restaurant', { email: data.email, 'status': { $eq: 1 } }, { 'device_info.device_type': 'ios', 'device_info.gcm': '', 'device_info.device_token': data.token, 'activity.last_login': new Date() }, {}, function (err, response) {
                                                    if (err || response.nModified == 0) {
                                                        res.send({
                                                            "status": 0,
                                                            "errors": 'Please check the email and try again'
                                                        });
                                                    } else {
                                                        if (docs[0].avatar) {
                                                            user_image = settings.settings.site_url + docs[0].avatar;
                                                        } else {
                                                            user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                        }
                                                        res.send({
                                                            status: '1',
                                                            res_name: docs[0].restaurantname,
                                                            res_address: docs[0].address.fulladres,
                                                            res_image: user_image,
                                                            res_id: docs[0]._id,
                                                            owner_name: docs[0].username,
                                                            email: docs[0].email,
                                                            rest_status: docs[0].status,
                                                            availability: docs[0].availability,
                                                            message: "You are Logged In successfully",
                                                            currency_code: settings.settings.currency_code,
                                                            currency_symbol: settings.settings.currency_symbol,
                                                            country_code: docs[0].phone.code,
                                                            phone_number: docs[0].phone.number
                                                        })
                                                    }
                                                });
                                            } else {
                                                db.UpdateDocument('restaurant', { email: data.email, 'status': { $eq: 1 } }, { 'device_info.device_type': 'android', 'device_info.gcm': data.gcm, 'device_info.device_token': '', 'activity.last_login': new Date() }, {}, function (err, response) {
                                                    if (err || response.nModified == 0) {
                                                        res.send({
                                                            "status": 0,
                                                            "errors": 'Please check the email and try again'
                                                        });
                                                    } else {
                                                        var user_image = '';
                                                        if (docs[0].avatar) {
                                                            user_image = settings.settings.site_url + docs[0].avatar;

                                                        } else {
                                                            user_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                                        }
                                                        res.send({
                                                            status: '1',
                                                            res_name: docs[0].restaurantname,
                                                            res_address: docs[0].address.fulladres,
                                                            res_image: user_image,
                                                            res_id: docs[0]._id,
                                                            owner_name: docs[0].username,
                                                            email: docs[0].email,
                                                            rest_status: docs[0].status,
                                                            availability: docs[0].availability,
                                                            message: "You are Logged In successfully",
                                                            currency_code: settings.settings.currency_code,
                                                            currency_symbol: settings.settings.currency_symbol,
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
                                            "status": '0',
                                            "errors": 'Your account is currently unavailable'
                                        });
                                    } else {
                                        res.send({
                                            "status": '0',
                                            "errors": 'Your account need to be verified by admin'
                                        });
                                    }
                                }
                            } else {
                                res.send({
                                    "status": '0',
                                    "errors": 'Password is invalid'
                                });
                            }
                        }
                    }
                });
            }
        });
    };

    controller.avilabilityEdit = function (req, res) {
        var errors = [];
        req.checkBody('res_id', 'res_id is required').notEmpty();
        req.checkBody('value', 'value is required').notEmpty();

        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        db.UpdateDocument('restaurant', { _id: req.body.res_id, 'status': { $ne: 0 } }, { 'availability': req.body.value }, {}, function (err, docdata) {
            if (err) {
                res.send({
                    "status": '0',
                    "errors": 'Please check the data and try again'
                });
            } else {
                res.send({
                    "status": '1',
                    "response": 'Availability updated successfully'
                });
            }
        });
    }


    controller.dashData = function (req, res) {

        var errors = [];
        req.checkBody('res_id', 'res_id is required').notEmpty();
        req.checkBody('from', 'Enter valid from date').optional(); //yyyy-mm-dd hh:mm:ss
        req.checkBody('to', 'Enter valid to date').optional();

        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        req.sanitizeBody('res_id').trim();
        req.sanitizeBody('from').trim();
        req.sanitizeBody('to').trim();

        var data = {};
        data.res_id = req.body.res_id;
        data.from = req.body.from + ' 00:00:00';
        data.to = req.body.to + ' 23:59:59';

        var new_order = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), status: { $eq: 1 } };
        var total_query = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), status: { $ne: 0 } };
        if (req.body.from && req.body.to) {
            total_query = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) }, status: { $ne: 0 } };
        }
        var acc_query = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), status: { $in: [3, 4, 5, 6, 7] } };
        if (req.body.from && req.body.to) {
            acc_query = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), status: { $in: [3, 4, 5, 6, 7] }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
        }

        var earning_query = { 'restaurant_id': data.res_id, status: { $in: [7] } };
        if (req.body.from && req.body.to) {
            earning_query = { 'restaurant_id': data.res_id, status: { $in: [7] }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
        }

        var denied_query = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), status: { $in: [2, 9, 10] } };
        if (req.body.from && req.body.to) {
            denied_query = { 'restaurant_id': new mongoose.Types.ObjectId(data.res_id), status: { $in: [2, 9, 10] }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
        }
        var menu_query = { 'shop': new mongoose.Types.ObjectId(data.res_id), status: { $eq: 1 } };
        db.GetOneDocument('restaurant', { _id: data.res_id, 'status': { $ne: 0 } }, {}, {}, function (err, docs) {
            if (err || !docs) {
                res.send({
                    "status": '0',
                    "errors": 'Invalid restaurant details'
                });
            } else {
                db.GetCount('orders', new_order, function (err, newtotal) {
                    db.GetCount('orders', total_query, function (err, total) {
                        db.GetCount('orders', acc_query, function (err, accept) {
                            db.GetCount('orders', denied_query, function (err, denied) {
                                db.GetCount('food', menu_query, function (err, menu) {
                                    db.GetDocument('orders', earning_query, {}, {}, function (err, rest_docs) {
                                        if (err) {
                                            res.send({
                                                "status": '0',
                                                "errors": 'Invalid restaurant details'
                                            });
                                        } else {
                                            db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
                                                if (err) {
                                                    res.send({
                                                        "status": '0',
                                                        "errors": 'Invalid restaurant details'
                                                    });
                                                } else {
                                                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                                        if (err) {
                                                            res.send({ "status": "0", "errors": "Error in App info..!" });
                                                        } else {
                                                            var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
                                                            var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, restaurant_id: new mongoose.Types.ObjectId(data.res_id) };
                                                            var condition = [
                                                                { "$match": filter_query },
                                                                {
                                                                    $project: {
                                                                        billings: "$billings"
                                                                    }
                                                                }
                                                            ];
                                                            db.GetAggregation('orders', condition, function (err, docdata) {
                                                                if (err) {
                                                                    res.send({
                                                                        "status": '0',
                                                                        "errors": 'Invalid restaurant details'
                                                                    });
                                                                } else {
                                                                    var total_billings = 0;
                                                                    for (i in docdata) {
                                                                        total_billings += docdata[i].billings.amount.restaurant_commission;
                                                                    }

                                                                    var total_earnin = 0;
                                                                    for (i in rest_docs) {
                                                                        total_earnin += rest_docs[i].billings.amount.restaurant_commission || 0;
                                                                    }

                                                                    var datas_tosend = {};
                                                                    datas_tosend.currency_code = settings.settings.currency_code;
                                                                    datas_tosend.currency_symbol = settings.settings.currency_symbol;
                                                                    datas_tosend.new_order = newtotal || 0;
                                                                    datas_tosend.total_order = total || 0;
                                                                    datas_tosend.accept_order = accept || 0;
                                                                    datas_tosend.denied_order = denied || 0;
                                                                    datas_tosend.total_earning = (total_earnin).toFixed(2);
                                                                    datas_tosend.total_billing = total_billings || 0;
                                                                    datas_tosend.menu = menu || 0;
                                                                    res.send({
                                                                        "status": '1',
                                                                        "response": datas_tosend
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            }
        });
    }

    controller.newOrders = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('order_type', 'order_type is required').notEmpty();
        req.checkBody('orderby', 'orderby is required').optional();
        req.checkBody('from', 'from is required').optional(); //yyyy-mm-dd hh:mm:ss
        req.checkBody('to', 'to is required').optional(); //yyyy-mm-dd hh:mm:ss

        var data = {};
        data.status = '0';

        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data);
            return;
        }

        var request = {};
        request.rest_id = req.body.rest_id;
        if (parseInt(req.body.order_type) == 1) { //new order
            request.type = [1, 3, 4, 5];
        } else if (parseInt(req.body.order_type) == 6) { //Out for delivery
            request.type = 6;
        }
        else if (parseInt(req.body.order_type) == 2) { //cancelled orders
            request.type = 2;
        }
        request.page = parseInt(req.body.page) || 1;
        request.perPage = parseInt(req.body.perPage) || 2000;
        request.orderby = parseInt(req.body.orderby) || -1;
        request.from = req.body.from + ' 00:00:00';
        request.to = req.body.to + ' 23:59:59';
        request.sortby = 'createdAt'

        var sorting = {};
        sorting[request.sortby] = request.orderby;

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err) {
                data.errors = 'Error in settings';
                res.send(data);
            }
            else {
                db.GetOneDocument('restaurant', { '_id': request.rest_id }, {}, {}, function (err, respo) {
                    if (err || !respo) {
                        data.errors = 'Invalid Restaurant, Please check your data';
                        res.send(data);
                    } else {
                        var countquery = { 'restaurant_id': new mongoose.Types.ObjectId(request.rest_id), 'status': { "$eq": 1 } };
                        db.GetCount('orders', countquery, function (err, neworderscount) {
                            if (parseInt(req.body.order_type) != 1) {
                                query = { 'restaurant_id': new mongoose.Types.ObjectId(request.rest_id), 'status': request.type };
                            } else {
                                query = { 'restaurant_id': new mongoose.Types.ObjectId(request.rest_id), 'status': { "$in": request.type } };
                            }
                            if (req.body.from && req.body.to) {
                                if (parseInt(req.body.order_type) != 1) {
                                    query = {
                                        'restaurant_id': new mongoose.Types.ObjectId(request.rest_id), 'status': request.type, "createdAt": { '$gte': new Date(request.from), '$lte': new Date(request.to) }
                                    };
                                } else {
                                    query = {
                                        'restaurant_id': new mongoose.Types.ObjectId(request.rest_id), 'status': { "$in": request.type }, "createdAt": { '$gte': new Date(request.from), '$lte': new Date(request.to) }
                                    };
                                }
                            }
                            data.status = '1';
                            data.response = {};
                            data.response.order_list = [];
                            db.GetCount('orders', query, function (err, count) {
                                if (err || count == 0) {
                                    res.send(data);
                                } else {
                                    db.GetAggregation('orders', [
                                        { $match: query },
                                        { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "user" } },
                                        { "$sort": sorting },
                                        { $unwind: "$user" }
                                    ], function (err, order) {
                                        if (err || order.length == 0) {
                                            res.send(data);
                                        } else {
                                            data.neworders_count = neworderscount || 0;
                                            for (var i = 0; i < order.length; i++) {
                                                var job = {};
                                                if (order[i].user) {
                                                    if (order[i].user.username) {
                                                        job.user_name = order[i].user.username;
                                                    } else {
                                                        job.user_name = "Unknown";
                                                    }
                                                }
                                                job.food_count = order[i].foods.length || 0;
                                                job.order_id = order[i].order_id;
                                                //job.status = order[i].status;
                                                switch (order[i].status) {
                                                    case 1:
                                                        job.status = 'New Order';
                                                        break;
                                                    case 2:
                                                        job.status = 'Cancelled Order';
                                                        break;
                                                    case 3:
                                                        job.status = 'Accepted Order';
                                                        break;
                                                    case 4:
                                                        job.status = 'Accepted Order';
                                                        break;
                                                    case 5:
                                                        job.status = 'Driver Accepted';
                                                        break;
                                                }

                                                job.price = order[i].billings.amount.grand_total;
                                                if (order[i].order_history.order_time) {
                                                    job.order_time = timezone.tz(order[i].order_history.order_time, settings.settings.time_zone).format(settings.settings.date_format + ',' + settings.settings.time_format);
                                                }
                                                else {
                                                    job.order_time = '';
                                                }

                                                data.response.order_list.push(job);
                                            }
                                            res.send(data);
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
    }

    controller.expandOrders = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('order_id', 'order_id is required').notEmpty();

        var data = {};
        data.status = '0';
        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data);
            return;
        }

        var request = {};
        request.rest_id = req.body.rest_id;
        request.order_id = req.body.order_id;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            var options = {};
            options.populate = 'restaurant_id';
            var foodQuery = [
                { "$match": { 'order_id': request.order_id, 'restaurant_id': new mongoose.Types.ObjectId(request.rest_id) } },
                { "$project": { foods: 1, } },
            ];
            db.GetOneDocument('orders', { 'order_id': request.order_id, restaurant_id: request.rest_id }, {}, options, function (err, respo) {
                if (err || !respo) {
                    data.errors = 'Invalid order, Please check your data';
                    res.send(data);
                } else {
                    db.GetAggregation('orders', foodQuery, function (err, docdata) {
                        db.GetOneDocument('city', { 'status': { $ne: 0 }, 'cityname': respo.restaurant_id.main_city }, {}, {}, function (err, citydocdata) {
                            if (err || !citydocdata) {
                                res.send({
                                    "status": "0", "errors": "Error in admin commission"
                                });
                            } else {

                                var response = {};
                                response.status = '1';
                                response.order_id = respo.order_id;
                                response.order_status = respo.status;
                                response.tax_percent = respo.restaurant_id.tax;
                                response.tax_amt = (respo.billings.amount.service_tax).toFixed(2);
                                response.offer_type = '';
                                response.offer_percent = '';
                                if (respo.rest_offer) {
                                    if (respo.rest_offer.offer_type) {
                                        response.offer_type = respo.rest_offer.offer_type || '';
                                        response.offer_percent = respo.rest_offer.offer_amount;
                                    }
                                }
                                response.sub_total = (respo.billings.amount.total).toFixed(2);
                                response.offer_amt = (respo.billings.amount.offer_discount).toFixed(2) || 0;
                                response.coupon_amt = (respo.billings.amount.coupon_discount).toFixed(2) || 0;
                                if (typeof respo.refer_offer_price != 'undefined' && respo.refer_offer_price) {
                                    response.refer_coupon = (respo.refer_offer_price).toFixed(2) || 0;
                                }
                                response.food_offer_amt = (respo.billings.amount.food_offer_price).toFixed(2) || 0;
                                response.package_amt = (respo.billings.amount.package_charge).toFixed(2) || 0;
                                response.night_fee = (respo.billings.amount.night_fee).toFixed(2) || 0;
                                response.surge_fee = (respo.billings.amount.surge_fee).toFixed(2) || 0;
                                response.delivery_amount = (respo.billings.amount.delivery_amount).toFixed(2) || 0;
                                response.paid = (respo.billings.amount.grand_total).toFixed(2) || 0;
                                response.sitecomision_percent = citydocdata.admin_commission;
                                if (respo.com_type == 'unique') {
                                    response.sitecomision_percent = respo.unique_commission.admin_commission;
                                }
                                var sub_grand = (parseFloat(respo.billings.amount.total) - (parseFloat(respo.billings.amount.offer_discount) + parseFloat(respo.billings.amount.food_offer_price)));
                                var sitecomision_amt = ((parseFloat(response.sitecomision_percent) / 100) * sub_grand).toFixed(2);
                                response.sitecomision_amt = (parseFloat(sitecomision_amt)).toFixed(2);
                                var sub_earning = respo.billings.amount.total - response.sitecomision_amt;
                                response.yourearning_amt = (parseFloat(respo.billings.amount.total) + parseFloat(response.tax_amt) + parseFloat(response.package_amt)) - (parseFloat(response.food_offer_amt) + parseFloat(response.offer_amt) + parseFloat(sitecomision_amt));

                                var admin_time = settings.settings.time_out * 60;
                                var order_time = new Date(respo.createdAt);
                                if (respo.schedule_type == 1) {
                                    var order_time = new Date(respo.created_time);
                                }
                                var current_time = new Date();
                                var current_times = (current_time.getHours() * 60 * 60) + (current_time.getMinutes() * 60) + current_time.getSeconds();
                                var order_times = (order_time.getHours() * 60 * 60) + (order_time.getMinutes() * 60) + order_time.getSeconds();
                                var bal_time = current_times - order_times;
                                var available_seconds = admin_time - bal_time;
                                var mins = parseInt(available_seconds / 60);
                                if (mins >= 0 && bal_time >= 0) {
                                    if (mins < 10) {
                                        mins = '0' + mins;
                                    }
                                } else {
                                    mins = '00';
                                }
                                var seconds = parseInt(available_seconds % 60);
                                if (seconds >= 0 && bal_time >= 0) {
                                    if (seconds < 10) {
                                        seconds = '0' + seconds;
                                    }
                                } else {
                                    seconds = '00'
                                }
                                var need = mins + ':' + seconds;
                                if (respo.status == 1) {
                                    response.available_seconds = need;
                                } else {
                                    response.available_seconds = '00:00';
                                }
                                for (var i = 0; i < docdata[0].foods.length; i++) {
                                    if (docdata[0].foods[i].offer_price) {
                                        docdata[0].foods[i].offer_price = parseFloat(docdata[0].foods[i].offer_price).toFixed(2);
                                    }
                                    docdata[0].foods[i].price = parseFloat(docdata[0].foods[i].price).toFixed(2);
                                    if (docdata[0].foods[i].addons && docdata[0].foods[i].addons.length > 0) {
                                        for (var j = 0; j < docdata[0].foods[i].addons.length; j++) {
                                            if (typeof docdata[0].foods[i].addons[j].price != "undefined") {
                                                docdata[0].foods[i].addons[j].price = parseFloat(docdata[0].foods[i].addons[j].price).toFixed(2);
                                            } else {
                                                docdata[0].foods[i].addons.splice(j, 1);
                                            }
                                        }
                                    }
                                }

                                response.foods = docdata[0].foods;
                                res.send(response);
                            }
                        });
                    });
                }
            });
        });
    }

    controller.acceptOrders = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('order_id', 'orderId is required').notEmpty();
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
        request.order_id = req.body.order_id;
        request.rest_id = req.body.rest_id;
        db.GetOneDocument('orders', { 'order_id': request.order_id }, {}, {}, function (err, orders) {
            if (err || !orders) {
                res.send({ "status": "0", "errors": 'Invalid orders, Please check your data' });
            } else {
                if (orders.status == 9) {
                    res.send({ "status": "0", "errors": 'Order is already canceled by user' });
                } else if (orders.status == 0) { res.status(400).send({ message: 'Your time is exceeded to accept this order' }); }
                else if (orders.status == 10) { res.send({ "status": "0", 'errors': 'Order is already canceled by admin' }); }
                else if (orders.status == 2) { res.send({ "status": "0", 'errors': 'Order is already canceled by you' }); }
                else if (orders.status == 1) {
                    db.GetOneDocument('restaurant', { _id: request.rest_id }, {}, {}, function (err, restaurant) {
                        if (err || !restaurant) {
                            res.send({ "status": "0", 'errors': 'Invalid restaurant, Please check your data' });
                        } else {
                            if (restaurant.status == 1 && restaurant.availability == 1) {
                                db.GetOneDocument('users', { _id: orders.user_id }, {}, {}, function (userErr, userRespo) {
                                    if (userErr || !userRespo) {
                                        res.send({ "status": "0", 'errors': 'Invalid User, Please check your data' });
                                    } else {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            if (err) {
                                                res.send({ "status": "0", 'errors': 'Error in settings' });
                                            } else {
                                                var lon = restaurant.location.lng;
                                                var lat = restaurant.location.lat;
                                                db.GetOneDocument('transaction', { "_id": orders.transaction_id }, {}, {}, function (err, transactionDetails) {
                                                    if (err || !transactionDetails) {
                                                        res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
                                                    } else {
                                                        var temp_radius = settings.settings.radius || 20;
                                                        var radius = parseInt(temp_radius);
                                                        var current_time = Date.now();
                                                        var thirty_sec_section = 45 * 1000;
                                                        var before_thirty_sec = current_time - thirty_sec_section;
                                                        var filter_query = { "status": 1, "currentStatus": 1, "currentJob": 0, "logout": 0, "last_update_time": { $gte: before_thirty_sec } };
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
                                                                    username: 1,
                                                                    document: "$$ROOT"
                                                                }
                                                            },
                                                            {
                                                                $group: { "_id": null, "documentData": { $push: "$document" } }
                                                            }
                                                        ];
                                                        db.GetAggregation('drivers', citycondition, function (err, docdata) {
                                                            if (err || docdata.length == 0 || !docdata || !docdata[0].documentData || docdata[0].documentData.length < 0 || typeof docdata[0].documentData == 'undefined') {
                                                                filter_query['currentJob'] = 1;
                                                                db.GetAggregation('drivers', citycondition, function (err, docdata1) {
                                                                    if (err || docdata1.length == 0 || !docdata1 || !docdata1[0].documentData || docdata1[0].documentData.length < 0 || typeof docdata1[0].documentData == 'undefined') {
                                                                        res.send({ "status": "0", 'errors': 'sorry no drivers available in your location' });
                                                                    } else {
                                                                        db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 3, 'order_history.restaurant_accepted': new Date() }, {}, function (err, updateData) {
                                                                            if (err || updateData.nModified == 0) {
                                                                                res.send({ "status": "0", 'errors': 'Error in accept order' });
                                                                            } else {
                                                                                if (typeof docdata1[0].documentData != 'undefined') {
                                                                                    var android_user = userRespo._id;
                                                                                    var user_loc = orders.location;
                                                                                    var message = CONFIG.NOTIFICATION.RESTAURANT_ACCEPTED;
                                                                                    var response_time = 250;
                                                                                    var rest_name = restaurant.restaurantname;
                                                                                    var rest_loc = restaurant.location;
                                                                                    var amount = orders.billings.amount.grand_total;
                                                                                    var food_count = orders.foods.length || 1;
                                                                                    var options = [request.order_id, android_user, rest_name, amount, user_loc, rest_loc, food_count];
                                                                                    for (var i = 1; i == 1; i++) {
                                                                                        push.sendPushnotification(android_user, message, 'order_accepted', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                    }
                                                                                    io.of('/chat').in(orders._id).emit('OrderUpdated', { orderId: orders._id });
                                                                                    var noti_data = {};
                                                                                    noti_data.rest_id = orders.restaurant_id;
                                                                                    noti_data.order_id = orders.order_id;
                                                                                    noti_data.user_id = orders.user_id;
                                                                                    noti_data._id = orders._id;
                                                                                    noti_data.user_name = '';
                                                                                    noti_data.order_type = 'restaurant_accept_order';
                                                                                    io.of('/chat').in(orders.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                    io.of('/chat').in(orders.user_id).emit('usernotify', noti_data);
                                                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                                                    var mail_data1 = {};
                                                                                    mail_data1.user_id = userRespo._id;
                                                                                    mail_data1.order_id = orders._id;
                                                                                    events.emit('restaurant_accept_order', mail_data1, function (err, result) { });
                                                                                    var mail_data2 = {};
                                                                                    mail_data2.user_id = userRespo._id;
                                                                                    mail_data2.order_id = orders._id;
                                                                                    events.emit('restaurant_accepts_toadmin', mail_data2, function (err, result) { });
                                                                                    var mailDatas3 = {};
                                                                                    mailDatas3.template = 'user_accept_order';
                                                                                    mailDatas3.to = userRespo.email;
                                                                                    mailDatas3.html = [];
                                                                                    mailDatas3.html.push({ name: 'name', value: userRespo.username || "" });
                                                                                    mailcontent.sendmail(mailDatas3, function (err, response) { });
                                                                                    res.send({ "status": "1", 'response': 'Sucessfully Accepted and send request for ' + ' ' + docdata1[0].documentData.length + ' drivers' });
                                                                                } else {
                                                                                    res.send({ "status": "0", 'errors': 'sorry no drivers available in your location' });
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                })
                                                            } else {
                                                                db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 3, 'order_history.restaurant_accepted': new Date() }, {}, function (err, updateData) {
                                                                    if (err || updateData.nModified == 0) {
                                                                        res.send({ "status": "0", 'errors': 'Error in accept order' });
                                                                    } else {
                                                                        if (typeof docdata[0].documentData != 'undefined') {
                                                                            var android_user = userRespo._id;
                                                                            var user_loc = orders.location;
                                                                            var message = CONFIG.NOTIFICATION.RESTAURANT_ACCEPTED;
                                                                            var response_time = 250;
                                                                            var rest_name = restaurant.restaurantname;
                                                                            var rest_loc = restaurant.location;
                                                                            var amount = orders.billings.amount.grand_total;
                                                                            var food_count = orders.foods.length || 1;
                                                                            var options = [request.order_id, android_user, rest_name, amount, user_loc, rest_loc, food_count];
                                                                            for (var i = 1; i == 1; i++) {
                                                                                push.sendPushnotification(android_user, message, 'order_accepted', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                            }
                                                                            for (var i = 0; i < docdata[0].documentData.length; i++) {
                                                                                var android_driver = docdata[0].documentData[i]._id;
                                                                                var message = CONFIG.NOTIFICATION.REQUEST_FOR_DRIVER;
                                                                                var response_time = 250;
                                                                                var gcm = '';
                                                                                if (docdata[0].documentData[i].device_info) {
                                                                                    if (docdata[0].documentData[i].device_info.gcm) {
                                                                                        if (docdata[0].documentData[i].device_info.gcm.length > 0) {
                                                                                            gcm = docdata[0].documentData[i].device_info.gcm;
                                                                                        }
                                                                                    }
                                                                                }
                                                                                var device_token = '';
                                                                                if (docdata[0].documentData[i].device_info) {
                                                                                    if (docdata[0].documentData[i].device_info.device_token) {
                                                                                        if (docdata[0].documentData[i].device_info.device_token.length > 0) {
                                                                                            device_token = docdata[0].documentData[i].device_info.device_token;
                                                                                        }
                                                                                    }
                                                                                }
                                                                                var options = [request.order_id, android_driver, gcm, device_token];
                                                                                push.sendPushnotification(android_driver, message, 'order_request', 'ANDROID', options, 'DRIVER', function (err, response, body) { });
                                                                            }
                                                                            io.of('/chat').in(orders._id).emit('OrderUpdated', { orderId: orders._id });
                                                                            var noti_data = {};
                                                                            noti_data.rest_id = orders.restaurant_id;
                                                                            noti_data.order_id = orders.order_id;
                                                                            noti_data.user_id = orders.user_id;
                                                                            noti_data._id = orders._id;
                                                                            noti_data.user_name = '';
                                                                            noti_data.order_type = 'restaurant_accept_order';
                                                                            io.of('/chat').in(orders.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                            io.of('/chat').in(orders.user_id).emit('usernotify', noti_data);
                                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                                            var mail_data1 = {};
                                                                            mail_data1.user_id = userRespo._id;
                                                                            mail_data1.order_id = orders._id;
                                                                            events.emit('restaurant_accept_order', mail_data1, function (err, result) { });
                                                                            var mail_data2 = {};
                                                                            mail_data2.user_id = userRespo._id;
                                                                            mail_data2.order_id = orders._id;
                                                                            events.emit('restaurant_accepts_toadmin', mail_data2, function (err, result) { });
                                                                            var mailDatas3 = {};
                                                                            mailDatas3.template = 'user_accept_order';
                                                                            mailDatas3.to = userRespo.email;
                                                                            mailDatas3.html = [];
                                                                            mailDatas3.html.push({ name: 'name', value: userRespo.username || "" });
                                                                            mailcontent.sendmail(mailDatas3, function (err, response) { });
                                                                            res.send({ "status": "1", 'response': 'Sucessfully Accepted and send request for ' + ' ' + docdata[0].documentData.length + ' drivers' });
                                                                        } else {
                                                                            res.send({ "status": "0", 'errors': 'sorry no drivers available in your location' });
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                })
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.send({ "status": "0", "errors": 'Your restaurant is offline, Kindly try after sometimes' });
                            }
                        }
                    });
                } else {
                    res.send({ "status": "0", "errors": 'Invalid orders, Please check your data' });
                }
            }
        });
    }
    events.on('restaurant_accept_order', function (req, done) {

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
                                        foodDetails += '<tr class="repeat-item"><td align="center"><center><table border="0" align="center" width="100%" cellpadding="0" cellspacing="0"><tbody><tr bgcolor="#fff"><td>&nbsp;</td></tr><tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 0px 16px 17px;text-align:left;font-size:0;border-bottom: 1px solid #ddd;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].name + '</td></tr></table></div><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].quantity + '</td></tr></table></div><div class="column" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + PriceText + '</td></tr></table></div></td></tr></table></td></tr></tbody></table></center></td></tr>'
                                    }
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        item_total = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Item Total</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        offer_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Offers Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        var coupon_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Coupon Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        var delivery_amount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Delivery Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        var surge_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Surge Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        var package_charge = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Package Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        var night_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Night Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        var service_tax = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var mailData = {};
                                    mailData.template = 'restaurant_accept_order';
                                    mailData.to = orderDetails.restaurantDetails.email;
                                    mailData.html = [];
                                    mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                    mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                    mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                    mailData.html.push({ name: 'name', value: orderDetails.restaurantDetails.restaurantname || "" });
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

    events.on('restaurant_accepts_toadmin', function (req, done) {

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
                                        foodDetails += '<tr class="repeat-item"><td align="center"><center><table border="0" align="center" width="100%" cellpadding="0" cellspacing="0"><tbody><tr bgcolor="#fff"><td>&nbsp;</td></tr><tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 0px 16px 17px;text-align:left;font-size:0;border-bottom: 1px solid #ddd;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].name + '</td></tr></table></div><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + orderDetails.foods[i].quantity + '</td></tr></table></div><div class="column" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + PriceText + '</td></tr></table></div></td></tr></table></td></tr></tbody></table></center></td></tr>'
                                    }
                                    var item_total = '';
                                    if (orderDetails.item_total != '') {
                                        item_total = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Item Total</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.item_total + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var offer_discount = '';
                                    if (orderDetails.billings.amount.offer_discount > 0) {
                                        offer_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Offers Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.offer_discount + '</td></tr></table></div></td></tr></table></td></tr>'
                                    }
                                    var coupon_discount = '';
                                    if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                        var coupon_discount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Coupon Discount</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (orderDetails.billings.amount.delivery_amount > 0) {
                                        var delivery_amount = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Delivery Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.delivery_amount + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var surge_fee = '';
                                    if (orderDetails.billings.amount.surge_fee > 0) {
                                        var surge_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Surge Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var package_charge = '';
                                    if (orderDetails.billings.amount.package_charge > 0) {
                                        var package_charge = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Package Charges</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var night_fee = '';
                                    if (orderDetails.billings.amount.night_fee > 0) {
                                        var night_fee = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Night Fare</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }
                                    var service_tax = '';
                                    if (orderDetails.billings.amount.service_tax > 0) {
                                        var service_tax = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:190px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Tax</td></tr></table></div><div class="column width-50" style="width:100%;max-width:150px;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.service_tax + '</td></tr></table></div></td></tr></table></td></tr>';
                                    }

                                    db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                        var mailData = {};
                                        mailData.template = 'restaurant_accepts_toadmin';
                                        mailData.to = admin.email;
                                        mailData.html = [];
                                        mailData.html.push({ name: 'admin', value: admin.username || "" });
                                        mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                        mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                        mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                        mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
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

    controller.rejectOrders = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('order_id', 'order_id is required').notEmpty();
        req.checkBody('reason', 'reason is required').notEmpty();

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
        request.order_id = req.body.order_id;
        request.rest_id = req.body.rest_id;
        request.reason = req.body.reason;
        db.GetOneDocument('orders', { order_id: req.body.order_id }, {}, {}, function (err, ordersDetails) {
            if (err || !ordersDetails) {
                res.send({ "status": "0", 'errors': "Invalid order" });
            } else {
                db.GetOneDocument('restaurant', { _id: ordersDetails.restaurant_id }, {}, {}, function (err, restaurant) {
                    if (err || !restaurant) {
                        res.send({ "status": "0", 'errors': "Invalid restaurant, Please check your data" });
                    } else {
                        db.GetOneDocument('users', { _id: ordersDetails.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                            if (err || !user) {
                                res.send({ "status": "0", 'errors': "Invalid user, Please check your data" });
                            } else {
                                if (restaurant.status == 1 && restaurant.availability == 1) {
                                    if (ordersDetails.status == 9) { res.send({ "status": "0", 'errors': "Order is already canceled by user" }); }
                                    else if (ordersDetails.status == 10) { res.send({ "status": "0", 'errors': "Order is already canceled by admin" }); }
                                    else if (ordersDetails.status == 0) { res.status(400).send({ message: "Your time is exceeded to accept this order" }); }
                                    else if (ordersDetails.status == 2) { res.send({ "status": "0", 'errors': "You have already Denied this order" }); }
                                    else if (ordersDetails.status == 1) {
                                        db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
                                            if (err || !transactionDetails) {
                                                res.send({ "status": "0", 'errors': "Error in reject order" });
                                            } else {
                                                if (transactionDetails.type == 'stripe') {
                                                    db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
                                                        if (err || !paymentgateway) {
                                                            res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
                                                        } else {
                                                            stripe.setApiKey(paymentgateway.settings.secret_key);
                                                            var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
                                                            if (charge_index != -1) {
                                                                var charge_id = transactionDetails.transactions[charge_index].gateway_response.id
                                                                stripe.refunds.create({
                                                                    charge: charge_id,
                                                                }, function (err, refund) {
                                                                    if (err) {
                                                                        res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                    } else {
                                                                        db.UpdateDocument('orders', { 'order_id': req.body.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': request.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                                            if (err || docdata.nModified == 0) {
                                                                                res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                            } else {
                                                                                var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
                                                                                db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
                                                                                    if (err || responses.nModified == 0) {
                                                                                        res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                                    } else {
                                                                                        var android_user = ordersDetails.user_id;
                                                                                        var message = CONFIG.NOTIFICATION.RESTAURANT_REJECTED;
                                                                                        var response_time = CONFIG.respond_timeout;
                                                                                        var options = [request.order_id, android_user, response_time];
                                                                                        for (var i = 1; i == 1; i++) {
                                                                                            push.sendPushnotification(android_user, message, 'order_rejected', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                        }
                                                                                        var noti_data = {};
                                                                                        noti_data.rest_id = ordersDetails.restaurant_id;
                                                                                        noti_data.order_id = ordersDetails.order_id;
                                                                                        noti_data.user_id = ordersDetails.user_id;
                                                                                        noti_data._id = ordersDetails._id;
                                                                                        noti_data.user_name = '';
                                                                                        noti_data.order_type = 'order_rejected';
                                                                                        io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                        io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                                                        io.of('/chat').emit('adminnotify', noti_data);
                                                                                        io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                                                                        mailData = {};
                                                                                        mailData.template = 'restaurant_reject_order';
                                                                                        mailData.to = restaurant.email;
                                                                                        mailData.html = [];
                                                                                        mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                                                        mailcontent.sendmail(mailData, function (err, response) { });
                                                                                        mailData1 = {};
                                                                                        mailData1.template = 'user_reject_order';
                                                                                        mailData1.to = user.email;
                                                                                        mailData1.html = [];
                                                                                        mailData1.html.push({ name: 'name', value: user.username || "" });
                                                                                        mailcontent.sendmail(mailData1, function (err, response) { });
                                                                                        res.send({ "status": "1", 'response': "Order cancelled successfully" });
                                                                                    }
                                                                                })
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            } else {
                                                                res.send({ "status": "0", 'errors': "Error in reject order" });
                                                            }
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'paypal') {
                                                    db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
                                                        if (err || !paymentgateway) {
                                                            res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
                                                        } else {
                                                            var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.intent }).indexOf('authorize');
                                                            if (charge_index != -1) {
                                                                if (typeof transactionDetails.transactions[charge_index].gateway_response.transactions != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization != 'undefined') {
                                                                    var authorization_id = transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization.id;
                                                                    var api = require('paypal-rest-sdk');
                                                                    api.authorization.void(authorization_id, function (error, refund) {
                                                                        if (error) {
                                                                            res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
                                                                        } else {
                                                                            db.UpdateDocument('orders', { 'order_id': req.body.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': request.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                                                if (err || docdata.nModified == 0) {
                                                                                    res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                                } else {
                                                                                    var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
                                                                                    db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
                                                                                        if (err || responses.nModified == 0) {
                                                                                            res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                                        } else {
                                                                                            var android_user = ordersDetails.user_id;
                                                                                            var message = CONFIG.NOTIFICATION.RESTAURANT_REJECTED;
                                                                                            var response_time = CONFIG.respond_timeout;
                                                                                            var options = [request.order_id, android_user, response_time];
                                                                                            for (var i = 1; i == 1; i++) {
                                                                                                push.sendPushnotification(android_user, message, 'order_rejected', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                            }
                                                                                            var noti_data = {};
                                                                                            noti_data.rest_id = ordersDetails.restaurant_id;
                                                                                            noti_data.order_id = ordersDetails.order_id;
                                                                                            noti_data.user_id = ordersDetails.user_id;
                                                                                            noti_data._id = ordersDetails._id;
                                                                                            noti_data.user_name = '';
                                                                                            noti_data.order_type = 'order_rejected';
                                                                                            io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                            io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                                                            io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                                                                            mailData = {};
                                                                                            mailData.template = 'restaurant_reject_order';
                                                                                            mailData.to = restaurant.email;
                                                                                            mailData.html = [];
                                                                                            mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                                                            mailcontent.sendmail(mailData, function (err, response) { });
                                                                                            mailData1 = {};
                                                                                            mailData1.template = 'user_reject_order';
                                                                                            mailData1.to = user.email;
                                                                                            mailData1.html = [];
                                                                                            mailData1.html.push({ name: 'name', value: user.username || "" });
                                                                                            mailcontent.sendmail(mailData1, function (err, response) { });
                                                                                            res.send({ "status": "1", 'response': "Order cancelled successfully" });
                                                                                        }
                                                                                    })
                                                                                }
                                                                            })
                                                                        }
                                                                    })
                                                                }
                                                            } else {
                                                                res.send({ "status": "0", 'errors': "Error in reject order" });
                                                            }
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'nopayment' || transactionDetails.type == 'COD') {
                                                    db.UpdateDocument('orders', { 'order_id': req.body.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': request.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                        if (err || docdata.nModified == 0) {
                                                            res.send({ "status": "0", 'errors': "Error in reject order" });
                                                        } else {
                                                            var android_user = ordersDetails.user_id;
                                                            var message = CONFIG.NOTIFICATION.RESTAURANT_REJECTED;
                                                            var response_time = CONFIG.respond_timeout;
                                                            var options = [request.order_id, android_user, response_time];
                                                            for (var i = 1; i == 1; i++) {
                                                                push.sendPushnotification(android_user, message, 'order_rejected', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                            }
                                                            var noti_data = {};
                                                            noti_data.rest_id = ordersDetails.restaurant_id;
                                                            noti_data.order_id = ordersDetails.order_id;
                                                            noti_data.user_id = ordersDetails.user_id;
                                                            noti_data._id = ordersDetails._id;
                                                            noti_data.user_name = '';
                                                            noti_data.order_type = 'order_rejected';
                                                            io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                            io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                            io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });

                                                            mailData = {};
                                                            mailData.template = 'restaurant_reject_order';
                                                            mailData.to = restaurant.email;
                                                            mailData.html = [];
                                                            mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                            mailcontent.sendmail(mailData, function (err, response) { });
                                                            mailData1 = {};
                                                            mailData1.template = 'user_reject_order';
                                                            mailData1.to = user.email;
                                                            mailData1.html = [];
                                                            mailData1.html.push({ name: 'name', value: user.username || "" });
                                                            mailcontent.sendmail(mailData1, function (err, response) { });

                                                            if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
                                                                var refer_offer = ordersDetails.refer_offer;
                                                                db.UpdateDocument('users', { '_id': ordersDetails.user_id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
                                                            }
                                                            res.send({ "status": "1", 'response': "Order cancelled successfully" });
                                                        }
                                                    })
                                                } else if (transactionDetails.type == 'cashfree') {
                                                    db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'cashfree' }, {}, {}, function (err, paymentgateway) {
                                                        if (err || !paymentgateway) {
                                                            res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
                                                        } else {
                                                            let url = '';
                                                            if (paymentgateway.settings.mode == "live") {
                                                                url = "https://api.cashfree.com/api/v1/order/refund";
                                                            } else {
                                                                url = "https://test.cashfree.com/api/v1/order/refund";
                                                            }
                                                            var options = {
                                                                'method': 'POST',
                                                                'url': url,
                                                                'headers': {
                                                                    'Content-Type': 'application/x-www-form-urlencoded'
                                                                },
                                                                form: {
                                                                    'appId': paymentgateway.settings.app_key,
                                                                    'secretKey': paymentgateway.settings.secret_key,
                                                                    'referenceId': transactionDetails.transactions[0].gateway_response.referenceId,
                                                                    'refundAmount': transactionDetails.amount,
                                                                    'refundNote': request.reason
                                                                }
                                                            };
                                                            urlrequest(options, async (error, response) => {
                                                                let respo = JSON.parse(response.body) // { message: 'Refund has been initiated.', refundId: 5659, status: 'OK' }
                                                                if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR") {
                                                                    res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
                                                                } else {
                                                                    db.UpdateDocument('orders', { 'order_id': req.body.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': request.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                                        if (err || docdata.nModified == 0) {
                                                                            res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                        } else {
                                                                            var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response_refund: respo } } };
                                                                            db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
                                                                                if (err || responses.nModified == 0) {
                                                                                    res.send({ "status": "0", 'errors': "Error in reject order" });
                                                                                } else {
                                                                                    var android_user = ordersDetails.user_id;
                                                                                    var message = CONFIG.NOTIFICATION.RESTAURANT_REJECTED;
                                                                                    var response_time = CONFIG.respond_timeout;
                                                                                    var options = [request.order_id, android_user, response_time];
                                                                                    for (var i = 1; i == 1; i++) {
                                                                                        push.sendPushnotification(android_user, message, 'order_rejected', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                    }
                                                                                    var noti_data = {};
                                                                                    noti_data.rest_id = ordersDetails.restaurant_id;
                                                                                    noti_data.order_id = ordersDetails.order_id;
                                                                                    noti_data.user_id = ordersDetails.user_id;
                                                                                    noti_data._id = ordersDetails._id;
                                                                                    noti_data.user_name = '';
                                                                                    noti_data.order_type = 'order_rejected';
                                                                                    io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                    io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                                                    io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                                                                    mailData = {};
                                                                                    mailData.template = 'restaurant_reject_order';
                                                                                    mailData.to = restaurant.email;
                                                                                    mailData.html = [];
                                                                                    mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                                                    mailcontent.sendmail(mailData, function (err, response) { });
                                                                                    mailData1 = {};
                                                                                    mailData1.template = 'user_reject_order';
                                                                                    mailData1.to = user.email;
                                                                                    mailData1.html = [];
                                                                                    mailData1.html.push({ name: 'name', value: user.username || "" });
                                                                                    mailcontent.sendmail(mailData1, function (err, response) { });
                                                                                    res.send({ "status": "1", 'response': "Order cancelled successfully" });
                                                                                }
                                                                            })
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    })
                                                } else {
                                                    res.send({ "status": "0", 'errors': "Error in reject order" });
                                                }
                                            }
                                        })
                                    } else {
                                        res.send({ "status": "0", 'errors': "Invalid order" });
                                    }
                                } else {
                                    res.send({ "status": "0", "errors": "Your restaurant is offline, Kindly try after sometimes" });
                                }
                            }
                        })
                    }
                })
            }
        })
    }

    controller.logOut = function (req, res) {
        req.checkBody('rest_id', 'rest_id is Required').notEmpty();
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
        db.GetDocument('restaurant', { '_id': req.body.rest_id }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (req.body.type == 'android') {
                    db.UpdateDocument('restaurant', { '_id': req.body.rest_id }, { 'device_info.gcm': '', 'device_info.device_type': '', 'device_info.android_notification_mode': 'gcm', 'activity.last_logout': new Date() }, {}, function (err, response) {
                        if (err || response.nModified == 0) {
                            data.status = '0';
                            data.errors = 'sorry you didnt logout successfully';
                            res.send(data);
                        }
                        else {
                            data.status = '1';
                            data.message = 'logout done successfully';
                            res.send(data);
                        }
                    });
                } else {
                    db.UpdateDocument('restaurant', { '_id': req.body.rest_id }, { 'device_info.device_token': '', 'device_info.device_type': '', 'device_info.android_notification_mode': 'apns', 'activity.last_logout': new Date() }, {}, function (err, responseuser) {
                        if (err || responseuser.nModified == 0) {
                            data.status = '0';
                            data.errors = 'sorry you didnt logout successfully';
                            res.send(data);
                        }
                        else {
                            data.status = '1';
                            data.message = 'logout done successfully';
                            res.send(data);
                        }
                    });
                }
            }
        });
    }


    controller.changePassword = function (req, res) {
        var data = {};
        data.status = 0;

        req.checkBody('rest_id', 'user_id is Required').notEmpty();
        req.checkBody('current_pass', 'current_pass  is Required').notEmpty();
        req.checkBody('new_pass', 'new_pass  is Required').optional();

        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }

        req.sanitizeBody('rest_id').trim();
        req.sanitizeBody('current_pass').trim();
        req.sanitizeBody('new_pass').trim();

        var request = {};
        request.user_id = req.body.rest_id;
        request.current_pass = req.body.current_pass;
        request.new_pass = req.body.new_pass;

        var validPassword = function (password, passwordb) {
            return bcrypt.compareSync(password, passwordb);
        };

        db.GetOneDocument('restaurant', { '_id': request.user_id, status: { $ne: 0 } }, {}, {}, function (err, user) {
            if (err) {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!" });
            } else {
                if (!user.password) { res.send({ status: "0", "errors": "Sorry social user can't change password..!" }); }
                else {
                    if (validPassword(request.current_pass, user.password)) {
                        var pass = bcrypt.hashSync(request.new_pass, bcrypt.genSaltSync(8), null);
                        db.UpdateDocument('restaurant', { '_id': request.user_id }, { 'password': pass }, {}, function (err, result) {
                            if (err || result.nModified == 0) {
                                res.send({ status: "0", "errors": "Unable to save your data" });
                            } else {
                                res.send({ status: "1", "message": "Password changed successfully..!" });
                            }
                        });
                    }
                    else {
                        res.send({ status: "0", "errors": "Old password is incorrect..!" });
                    }
                }
            }
        });
    };

    controller.businesInfo = function (req, res) {
        var data = {};
        data.status = 0;
        req.checkBody('rest_id', 'rest_id is Required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        req.sanitizeBody('rest_id').trim();
        var request = {};
        request.user_id = req.body.rest_id;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ status: "0", "errors": "Configure your settings" });
            } else {
                db.GetOneDocument('restaurant', { '_id': request.user_id, status: { $ne: 0 } }, {}, {}, function (err, rest) {
                    if (err) {
                        res.send({ status: "0", "errors": "Restaurant id is wrong..!" });
                    } else {
                        var datas = {};
                        datas.status = '1';
                        datas.restaurant_name = rest.restaurantname;
                        datas.address = rest.address;
                        datas.fptime = rest.efp_time;

                        datas.week_days = {};
                        datas.week_end = {};
                        var server_offset = (new Date).getTimezoneOffset();
                        datas.server_offset = server_offset;
                        datas.client_offset = client_offset;
                        // var diff_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                        if (typeof rest != 'undefined') {
                            /* if (rest.working_hours && typeof rest.working_hours != 'undefined' && rest.working_hours.length > 0) {
                                rest.working_hours.forEach(function (element) {
                                    if (typeof element.slots != "undefined" && element.slots.length > 0) {
                                        for (var i = 0; i < element.slots.length; i++) {
                                            element.slots[i].start_time = new Date(new Date(element.slots[i].start_time).getTime() + diff_offset);
                                            element.slots[i].end_time = new Date(new Date(element.slots[i].end_time).getTime() + diff_offset);
                                        }

                                    }
                                })
                            } */
                            datas.working_hours = rest.working_hours;
                        }
                        res.send(datas);
                    }
                });
            }
        })
    }

    controller.updateBusinesInfo = function (req, res) {
        var data = {};
        data.status = 0;
        req.checkBody('rest_id', 'rest_id is Required').notEmpty();
        req.checkBody('wd_from_time', 'wd_from_time is Required').optional();
        req.checkBody('wd_end_time', 'wd_end_time is Required').optional();
        req.checkBody('we_from_time', 'we_from_time is Required').optional();
        req.checkBody('we_end_time', 'we_end_time is Required').optional();
        req.checkBody('efpt', 'efpt is Required').optional();
        req.checkBody('working_hours', 'working hours is Required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }
        req.sanitizeBody('rest_id').trim();
        req.sanitizeBody('wd_from_time').trim();
        req.sanitizeBody('wd_end_time').trim();
        req.sanitizeBody('we_from_time').trim();
        req.sanitizeBody('we_end_time').trim();
        req.sanitizeBody('efpt').trim();
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = client_offset
        }
        var request = {};
        request.user_id = req.body.rest_id;
        request.efp_time = req.body.efpt;
        /* request.wd_from_time = req.body.wd_from_time + ':00';
        request.wd_end_time = req.body.wd_end_time + ':00';
        request.we_from_time = req.body.we_from_time + ':00';
        request.we_end_time = req.body.we_end_time + ':00'; */
        request.wd_from_time = req.body.wd_from_time;
        request.wd_end_time = req.body.wd_end_time;
        request.we_from_time = req.body.we_from_time;
        request.we_end_time = req.body.we_end_time;
        if (req.body.working_hours && req.body.working_hours.length == 7) {
            request.working_hours = req.body.working_hours;
        } else {
            data.response = 'Invalid Business Hours';
            res.send(data); return;
        }

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                data.errors = 'Configure your settings';
                res.send(data);
            } else {
                db.GetOneDocument('restaurant', { '_id': request.user_id }, { time_setting: 1 }, {}, function (err, getresult) {
                    var date = timezone.tz(new Date(), settings.settings.time_zone).format("YYYY/MM/DD");
                    var update = {};
                    if (request.efp_time) {
                        update.efp_time = request.efp_time;
                    }
                    /*  if (req.body.wd_from_time && req.body.wd_end_time) {
                         update.time_setting = {};
                         update.time_setting.week_days = {};
                         update.time_setting.week_days.start_time = date + ' ' + request.wd_from_time;
                         update.time_setting.week_days.end_time = date + ' ' + request.wd_end_time;
                     }
     
                     if (req.body.wd_from_time && !req.body.wd_end_time) {
                         update.time_setting = {};
                         update.time_setting.week_days = {};
                         update.time_setting.week_days.start_time = date + ' ' + request.wd_from_time;
                         update.time_setting.week_days.end_time = getresult.time_setting.week_days.end_time;
                     }
     
                     if (!req.body.wd_from_time && req.body.wd_end_time) {
                         update.time_setting = {};
                         update.time_setting.week_days = {};
                         update.time_setting.week_days.start_time = getresult.time_setting.week_days.start_time;
                         update.time_setting.week_days.end_time = date + ' ' + request.wd_end_time;
                     }
     
                     if (req.body.we_from_time && req.body.we_end_time) {
                         update.time_setting.week_end = {};
                         update.time_setting.week_end.start_time = date + ' ' + request.we_from_time;
                         update.time_setting.week_end.end_time = date + ' ' + request.we_end_time;
                     }
     
                     if (req.body.we_from_time && !req.body.we_end_time) {
                         update.time_setting.week_end = {};
                         update.time_setting.week_end.start_time = date + request.we_from_time;
                         update.time_setting.week_end.end_time = getresult.time_setting.week_end.end_time;
                     }
     
                     if (!req.body.we_from_time && req.body.we_end_time) {
                         update.time_setting.week_end = {};
                         update.time_setting.week_end.start_time = getresult.time_setting.week_end.start_time;
                         update.time_setting.week_end.end_time = date + ' ' + request.we_end_time;
                     } */
                    if (req.body.wd_from_time && req.body.wd_end_time) {
                        update.time_setting = {};
                        update.time_setting.week_days = {};
                        update.time_setting.week_days.start_time = request.wd_from_time;
                        update.time_setting.week_days.end_time = request.wd_end_time;
                    }

                    if (req.body.wd_from_time && !req.body.wd_end_time) {
                        update.time_setting = {};
                        update.time_setting.week_days = {};
                        update.time_setting.week_days.start_time = request.wd_from_time;
                        update.time_setting.week_days.end_time = getresult.time_setting.week_days.end_time;
                    }

                    if (!req.body.wd_from_time && req.body.wd_end_time) {
                        update.time_setting = {};
                        update.time_setting.week_days = {};
                        update.time_setting.week_days.start_time = getresult.time_setting.week_days.start_time;
                        update.time_setting.week_days.end_time = request.wd_end_time;
                    }

                    if (req.body.we_from_time && req.body.we_end_time) {
                        update.time_setting.week_end = {};
                        update.time_setting.week_end.start_time = request.we_from_time;
                        update.time_setting.week_end.end_time = request.we_end_time;
                    }

                    if (req.body.we_from_time && !req.body.we_end_time) {
                        update.time_setting.week_end = {};
                        update.time_setting.week_end.start_time = request.we_from_time;
                        update.time_setting.week_end.end_time = getresult.time_setting.week_end.end_time;
                    }

                    if (!req.body.we_from_time && req.body.we_end_time) {
                        update.time_setting.week_end = {};
                        update.time_setting.week_end.start_time = getresult.time_setting.week_end.start_time;
                        update.time_setting.week_end.end_time = request.we_end_time;
                    }
                    update.working_hours = request.working_hours;
                    db.UpdateDocument('restaurant', { '_id': request.user_id }, update, {}, function (err, result) {
                        if (err || result.nModified == 0) {
                            res.send({ status: "0", "errors": "Unable to save your data" });
                        } else {
                            res.send({ status: "1", "message": "Updated successfully..!" });
                        }
                    });
                });
            }
        });
    }

    controller.getCategory = function (req, res) {
        var data = {};
        data.status = 0;
        req.checkBody('rest_id', 'rest_id is Required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            data.response = errors[0].msg;
            res.send(data); return;
        }
        req.sanitizeBody('rest_id').trim();
        var request = {};
        request.rest_id = req.body.rest_id;

        db.GetOneDocument('restaurant', { '_id': request.rest_id, status: { $ne: 0 } }, {}, {}, function (err, rest) {
            if (err) {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!" });
            } else {

                var matc_query = {
                    status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(request.rest_id)
                }
                var filter_query = {
                    'categoriesdata.status': { $eq: 1 }, 'categoriesdata.restaurant': new mongoose.Types.ObjectId(request.rest_id)
                }

                var pipeline = [
                    { $match: matc_query },
                    { "$project": { name: 1, price: 1, avatar: 1, visibility: 1, categories: 1, description: 1 } },
                    { $unwind: "$categories" },
                    { "$lookup": { from: "categories", localField: "categories.category", foreignField: "_id", as: "categoriesdata" } },
                    { $unwind: "$categoriesdata" },
                    { $match: filter_query },
                    {
                        "$group": {
                            "_id": "$categories.category",
                            "sub_category": { "$push": { food_name: "$name", food_id: "$_id", visibility: "$visibility" } },
                            "cat_name": { "$first": "$categoriesdata.name" },
                        }
                    },

                    { $sort: { "createdAt": -1 } }
                ];
                db.GetAggregation('food', pipeline, function (err, docdata) {
                    if (err) { res.send(err) }
                    else {
                        var respo = {};
                        respo.status = '1';
                        respo.main_category = docdata;
                        res.send(respo)
                    }
                });
            }
        });
    }

    controller.getMenuCount = function (req, res) {
        var request = {};
        request.rest_id = req.body.rest_id;
        if (typeof req.body.rest_id != 'undefined') {
            if (isObjectId(req.body.rest_id)) {
                request.rest_id = new mongoose.Types.ObjectId(req.body.rest_id);
            } else {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!", count: 0 });
                return;
            }
        } else {
            res.send({ status: "0", "errors": "Restaurant id is wrong..!", count: 0 });
            return;
        }
        var matc_query = {
            status: { $eq: 1 }, '_id': new mongoose.Types.ObjectId(request.rest_id)
        }
        var Restaurantcondition = [
            { $match: matc_query },
            {
                $lookup: {
                    from: "categories",
                    let: {
                        restaurantId: "$_id",
                    },
                    pipeline: [
                        { $match: { "$expr": { "$eq": ["$restaurant", "$$restaurantId"] }, status: { $eq: 1 }, mainparent: { $eq: "yes" } }, },
                        {
                            $lookup: {
                                from: "categories",
                                let: {
                                    parentId: "$_id",
                                    restaurantId: "$$restaurantId",
                                },
                                pipeline: [
                                    { $match: { "$expr": { "$eq": ["$restaurant", "$$restaurantId"], "$eq": ["$parent", "$$parentId"] }, status: { $eq: 1 } } },
                                    {
                                        $project: {
                                            category: "$_id",
                                            _id: false
                                        }
                                    }
                                ],
                                as: "subCategories"
                            }
                        },
                        {
                            $project: {
                                category: { $concatArrays: [[{ category: "$_id" }], "$subCategories"] },
                                restaurantId: "$$restaurantId",
                                name: "$name",
                            }
                        },
                        {
                            $lookup: {
                                from: "food",
                                let: {
                                    category: "$category",
                                    restaurantId: "$restaurantId",
                                },
                                pipeline: [
                                    { $match: { "$expr": { "$eq": ["$shop", "$$restaurantId"] }, status: { $eq: 1 }, $or: [{ "$expr": { "$eq": [{ "$cond": [{ $and: [{ $setIsSubset: ["$categories", "$$category"] }] }, 1, 0] }, 1] } }, { "$expr": { "$eq": [{ "$cond": [{ $and: [{ $setEquals: ["$categories", "$$category",] }] }, 1, 0] }, 1] } }] } },
                                    { "$count": "count" }
                                ],
                                as: "foodDetails"
                            }
                        },
                        { $unwind: { path: "$foodDetails", preserveNullAndEmptyArrays: true } },
                        { $match: { "$expr": { "$gt": ["$foodDetails.count", 0] } } },
                        {
                            $project: {
                                count: "$foodDetails.count"
                            }
                        }
                    ],
                    as: "categoryfoodCount"
                }
            },
            { $unwind: { path: "$categoryfoodCount", preserveNullAndEmptyArrays: true } },
            {
                $group:
                {
                    _id: null,
                    count: { $sum: "$categoryfoodCount.count" }
                }
            }
        ];
        db.GetAggregation('restaurant', Restaurantcondition, function (err, docdata) {
            if (err || !docdata) {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!", count: 0 });
            } else {
                if (typeof docdata != 'undefined' && docdata.length > 0 && typeof docdata[0].count != 'undefined') {
                    res.send({ status: "1", "errors": "", count: docdata[0].count });
                } else {
                    res.send({ status: "1", "errors": "", count: docdata });
                }
            }
        })
    }
    controller.getMenu = function (req, res) {
        var request = {};
        request.rest_id = req.body.rest_id;

        var matc_query = {
            status: { $eq: 1 }, '_id': new mongoose.Types.ObjectId(request.rest_id)
        }
        var Restaurantcondition = [
            { $match: matc_query },
            {
                $project: {
                    restaurantList: {
                        username: "$username", _id: "$_id", restaurantname: "$restaurantname", slug: "$slug", time_setting: "$time_setting", avg_ratings: "$avg_ratings", food_img: "$food_img", offer: "$offer", about: "$about", logo: "$logo", avatar: "$avatar", distance: "$distance", main_cuisine: "$main_cuisine", efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] }, location: "$location", latitude: "$location.lat", longitude: "$location.lng", avail: "$avail", avg_delivery: "$avg_delivery", deliverd: "$deliverd", cancelled: "$cancelled", categories: "$categories", availability: "$availability", phone: "$phone", address: "$address", time_setting: "$time_setting"
                    }
                }
            },
            { $lookup: { from: 'categories', localField: "restaurantList._id", foreignField: "restaurant", as: "restaurantList.restaurantCategories" } },
            { $lookup: { from: 'food', localField: "restaurantList._id", foreignField: "shop", as: "restaurantList.foodDetails" } },
            {
                $project: {
                    restaurantList: {
                        username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, time_setting: 1,
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
                                cond: { $and: [{ $eq: ["$$food.status", 1] }] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    restaurantList: {
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
                                    avatar: "$$food.avatar",
                                    categories: "$$food.categories"
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
                db.GetOneDocument('categories', { 'name': 'Recommended', 'restaurant': request.rest_id }, {}, {}, function (err, categoriesdata) {
                    var catid = '';
                    if (categoriesdata) {
                        catid = categoriesdata._id;
                    }
                    db.GetDocument('food', { $or: [{ 'shop': request.rest_id, 'categories.category': catid, 'status': { $eq: 1 } }, { 'shop': request.rest_id, 'recommended': 1, 'status': { $eq: 1 } }] }, { categories: 1, avatar: 1, name: 1, price: 1, visibility: 1, addons: 1, base_pack: 1, description: 1, avatar: 1 }, {}, function (err, docdatas) {
                        /* if (err) {
                             res.send(err);
                         } else {*/

                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            var recom = {};
                            var respo = {};
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
                                    if (docdatas[i].base_pack.length > 0 || docdatas[i].addons > 0) {
                                        recom.foodDetails.push({
                                            'name': docdatas[i].name, 'avatar': settings.settings.site_url + docdatas[i].avatar, 'description': docdatas[i].description, '_id': docdatas[i]._id, 'price': docdatas[i].price, 'visibility': docdatas[i].visibility, 'categories': docdatas[i].categories, 'more': 1
                                        })
                                    } else {
                                        recom.foodDetails.push({
                                            'name': docdatas[i].name, 'avatar': settings.settings.site_url + docdatas[i].avatar, 'description': docdatas[i].description, '_id': docdatas[i]._id, 'price': docdatas[i].price, 'visibility': docdatas[i].visibility, 'categories': docdatas[i].categories, 'more': 0
                                        })
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
                            }


                            respo.status = '1';
                            respo.list = {};
                            respo.list.mainCategories = my_array;
                            res.send(respo);
                        });
                        //}
                    });
                });
            }
        })
    }

    controller.getbasepack = function (req, res) {
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

    controller.foodVisibility = function (req, res) {
        req.checkBody('food_id', 'food_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        db.GetOneDocument('food', { '_id': req.body.food_id, 'status': { $ne: 0 } }, {}, {}, function (err, parentdocdata) {
            if (err || !parentdocdata) {
                res.send({
                    "status": "0",
                    "errors": "Sorry no food founds..!"
                });
            } else {
                var visibile = 1;
                if (parentdocdata.visibility == 1) { visibile = 0; }
                db.UpdateDocument('food', { '_id': req.body.food_id, 'status': { $eq: 1 } }, { 'visibility': visibile }, {}, function (err, docdata) {
                    if (err || docdata.nModified == 0) {
                        res.send({
                            "status": "0",
                            "errors": "Sorry no food founds..!"
                        });
                    } else {
                        res.send({
                            "status": "1",
                            "response": "Updated successfully..!"
                        });
                    }
                });
            }
        });
    }

    controller.basepackVisibility = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('base_pack_id', 'base_pack_id is required').notEmpty();
        req.checkBody('sub_pack_id', 'sub_pack_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        var request = {};
        request.base_pack_id = req.body.base_pack_id;
        request.sub_pack_id = req.body.sub_pack_id;
        request.rest_id = req.body.rest_id;

        var condition = { 'shop': request.rest_id, "base_pack": { "$elemMatch": { '_id': request.base_pack_id, "sub_pack": { "$elemMatch": { "_id": request.sub_pack_id } } } } };
        db.GetOneDocument('food', condition, { base_pack: 1 }, {}, function (err, parentdocdata) {
            if (err) {
                res.send({
                    "status": "0",
                    "errors": "Sorry no food founds..!"
                });
            } else {
                var visibile = 0;
                if (parentdocdata.base_pack.length > 0) {
                    var base_pack_index = parentdocdata.base_pack.map(function (e) { return e._id.toString(); }).indexOf(request.base_pack_id.toString());
                    if (base_pack_index != -1) {
                        var sub_pack_index = parentdocdata.base_pack[base_pack_index].sub_pack.map(function (e) { return e._id.toString(); }).indexOf(request.sub_pack_id.toString());
                        if (sub_pack_index != -1) {
                            if (typeof parentdocdata.base_pack[base_pack_index].sub_pack[sub_pack_index].visibility != 'undefined') {
                                var visibility = parentdocdata.base_pack[base_pack_index].sub_pack[sub_pack_index].visibility;
                                var updateData = {};
                                visibile = 0
                                if (visibility == 0) {
                                    visibile = 1;
                                }
                                updateData['base_pack.$.sub_pack.' + sub_pack_index + '.visibility'] = visibile;
                                db.UpdateDocument('food', condition, updateData, { multi: true }, function (err, docdata) {
                                    if (err) {
                                        res.send({
                                            "status": "0",
                                            "errors": "Sorry no food founds..!"
                                        });
                                    } else {
                                        res.send({
                                            "status": "1",
                                            "response": "Updated successfully..!"
                                        });
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    controller.addonsVisibility = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        req.checkBody('addons_id', 'addons_id is required').notEmpty();
        var data = {};
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        db.GetOneDocument('food', { 'shop': req.body.rest_id, 'addons._id': req.body.addons_id, 'status': { $eq: 1 } }, { addons: 1 }, {}, function (err, parentdocdata) {
            if (err || !parentdocdata) {
                res.send({
                    "status": "0",
                    "errors": "Sorry no food founds..!"
                });
            } else {
                var visibile = 1;
                if (parentdocdata.addons) {
                    for (var i = 0; i < parentdocdata.addons.length; i++) {
                        if (parentdocdata.addons[i]._id == req.body.addons_id) {
                            if (parentdocdata.addons[i].visibility == 1) { visibile = 0; }
                        }
                    }
                }
                db.UpdateDocument('food', { '_id': parentdocdata._id, 'addons._id': req.body.addons_id }, { "addons.$.visibility": visibile }, {}, function (err, docdata) {
                    if (err || docdata.nModified == 0) {
                        res.send({
                            "status": "0",
                            "errors": "Sorry no food founds..!"
                        });
                    } else {
                        res.send({
                            "status": "1",
                            "response": "Updated successfully..!"
                        });
                    }
                });
            }
        });
    }

    controller.RestmailCheck = function (req, res) {
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
        db.GetDocument('restaurant', { email: request.email, 'status': { $eq: 1 } }, {}, {}, function (err, docs) {
            if (err || !docs[0] || docs[0].length == 0) {
                res.send({
                    "status": 0,
                    "errors": 'Email-ID is not matched with given mobile number'
                });
            } else {
                var otp = library.randomString(8, '#A');
                db.UpdateDocument('restaurant', { 'email': request.email }, { 'otp': otp }, {}, function (err, response) {
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
                                    mode = settings.settings.twilio.mode;
                                    if (settings.settings.twilio.mode == 'development') {
                                        otp_string = otp;
                                    }
                                }
                                data.otp = otp_string;
                                data.mode = mode;
                                data.status = '1';
                                data.message = 'OTP has been sent to your registered mail';
                                res.send(data)
                            }
                        })
                    }
                });
            }
        });
    };


    controller.RestforgotPassword = function (req, res) {
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

        db.GetDocument('restaurant', { email: request.email, 'otp': request.otp }, {}, {}, function (err, docs) {
            if (err || !docs[0] || docs[0].length == 0) {
                res.send({
                    "status": 0,
                    "errors": 'OTP does not match'
                });
            } else {
                db.UpdateDocument('restaurant', { email: request.email }, { 'password': request.password }, {}, function (err, response) {
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

    controller.getBillings = function (req, res) {
        req.checkBody('rest_id', 'rest_id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        var request = {};
        request.rest_id = req.body.rest_id;
        db.GetOneDocument('restaurant', { _id: request.rest_id, status: { $eq: 1 } }, {}, {}, function (err, docs) {
            if (err || !docs) {
                res.send({
                    "status": 0,
                    "errors": 'Restaurant id does not match..!'
                });
            } else {
                var filter_query = { 'orderDetails.status': { $eq: 7 } };
                var billing_history_condition = [
                    { "$match": { restaurant_id: new mongoose.Types.ObjectId(request.rest_id) } },
                    { $lookup: { from: 'billing', localField: "billing_id", foreignField: "_id", as: "billings" } },
                    { $unwind: "$billings" },
                    { $unwind: "$order_lists" },
                    { $lookup: { from: 'orders', localField: "order_lists", foreignField: "order_id", as: "orderDetails" } },
                    { $unwind: "$orderDetails" },
                    { "$match": filter_query },
                    {
                        "$group": {
                            "_id": "$billings._id",
                            "from": { "$first": "$billings.start_date" },
                            "to": { "$first": "$billings.end_date" },
                            "paid_status": { "$first": "$paid_status" },
                            "order_amount": { "$sum": "$orderDetails.billings.amount.restaurant_commission" },
                            "count": { $sum: 1 },
                            "createdAt": { "$first": "$createdAt" }
                        }
                    },
                    { $sort: { "createdAt": -1 } }
                ]
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err || !settings) {
                        res.send({ status: '0', errors: 'Configure your app settings' });
                    } else {
                        db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
                            if (err || !billingsettings) {
                                res.send({ status: '0', errors: 'Configure your app settings' });
                            } else {
                                if (typeof billingsettings.settings.last_billed_time != 'undefined') {
                                    var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
                                } else {
                                    var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
                                }
                                var last_billed_date = moment(billingsettings.settings.last_billed_date).format("MMM DD");
                                var today_billed_date = timezone.tz(new Date(), settings.settings.time_zone).format("DD");
                                db.GetAggregation('restaurant_earnings', billing_history_condition, function (err, docdata) {
                                    if (err) {
                                        res.send({
                                            "status": 0,
                                            "errors": 'Restaurant id does not match..!'
                                        });
                                    }
                                    else {

                                        var current_billing_condition = [

                                            { "$match": { 'created_time': { $gte: last_billed_time }, restaurant_id: new mongoose.Types.ObjectId(request.rest_id), status: { $eq: 7 } } }, {
                                                "$group": {
                                                    "_id": "_id",
                                                    "order_amount": { "$sum": "$billings.amount.restaurant_commission" },
                                                    "count": { $sum: 1 },
                                                    "site_comison": { "$sum": "$billings.amount.admin_commission" },
                                                }
                                            },
                                        ]
                                        db.GetAggregation('orders', current_billing_condition, function (err, currentdocdata) {
                                            if (err) {
                                                res.send({
                                                    "status": 0,
                                                    "errors": 'Restaurant id does not match..!'
                                                });
                                            } else {
                                                respo = {};
                                                respo.status = '1';
                                                respo.current_billing = {};
                                                respo.current_billing.date = last_billed_date + ' to ' + today_billed_date;
                                                respo.current_billing.total_order = 0;
                                                respo.current_billing.total_earning = 0;
                                                respo.current_billing.site_comision = 0;
                                                if (currentdocdata[0]) {
                                                    if (currentdocdata[0].count) {
                                                        respo.current_billing.total_order = currentdocdata[0].count || 0;
                                                    }
                                                    if (currentdocdata[0].order_amount) {
                                                        respo.current_billing.total_earning = (currentdocdata[0].order_amount).toFixed(2) || 0;
                                                    }
                                                    if (currentdocdata[0].site_comison) {
                                                        respo.current_billing.site_comision = (currentdocdata[0].site_comison).toFixed(2) || 0;
                                                    }
                                                }
                                                respo.current_billing.status = 'Pending';
                                                var history = [];
                                                for (i in docdata) {
                                                    history.push({
                                                        'date': moment(docdata[i].from).format("MMM DD") + ' - ' + moment(docdata[i].to).format("DD"),
                                                        'count': docdata[i].count,
                                                        'earnings': (docdata[i].order_amount).toFixed(2),
                                                        'status': docdata[i].paid_status
                                                    })
                                                }

                                                respo.billing_history = history;
                                                res.send(respo)
                                            }
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

    controller.getcancelReason = function (req, res) {
        var query = {};
        query = { 'type': 'restaurant', 'status': 1 }
        db.GetDocument('cancellation', query, { reason: 1 }, {}, function (err, data) {
            if (err || !data) {
                res.send({
                    "status": 0,
                    "errors": 'No reason founds..!'
                });
            } else {
                var respo = {};
                respo.status = '1';
                respo.list = data;
                res.send(respo);
            }
        });
    }

    controller.trackOrder = function (req, res) {
        req.checkBody('order_id', 'order_id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        var options = {};
        options.populate = 'restaurant_id driver_id user_id';
        db.GetOneDocument('orders', { order_id: req.body.order_id }, {}, options, function (err, data) {

            if (err || !data) {
                res.send({
                    "status": 0,
                    "errors": 'No orders founds..!'
                });
            } else {
                var respo = {};
                respo.status = '1';
                respo.orderId = data._id;
                respo.user_location = data.delivery_address.loc;
                respo.user_phone = data.user_id.phone;
                respo.rest_location = data.restaurant_id.location;
                respo.driver_location = '';
                respo.driver_phone = '';
                respo.tracking = '';
                if (data.driver_id) {
                    if (data.driver_id.location) {
                        respo.driver_location = data.driver_id.location;
                    }
                    if (data.driver_id.phone) {
                        respo.driver_phone = data.driver_id.phone;
                    }
                }
                if (data.status == 5) {
                    respo.tracking = 'restaurant';
                }
                else if (data.status == 6) {
                    respo.tracking = 'user';
                }
                res.send(respo);
            }
        });
    }


    return controller;
}
