//"use strict";

module.exports = function (io) {
    var GoogleAPI = require('../../model/googleapis.js');
    var mongoose = require("mongoose");
    var db = require('../adaptor/mongodb.js');
    var library = require('../../model/library.js');
    let crypto = require('crypto');
    var controller = {};
    var CONFIG = require('../../config/config');
    var push = require('../../model/pushNotification.js')(io);
    var mailcontent = require('../../model/mailcontent.js');
    var timezone = require('moment-timezone');
    var jwt = require('jsonwebtoken');
    var stripe = require('stripe')('');
    // const cashfree = require('../../controller/mobile/payment-gateways/cashfree.js')
    var EventEmitter = require('events').EventEmitter;
    var events = new EventEmitter();
    var paypal = require('../../controller/mobile/payment-gateways/paypal.js');
    const razorpay = require('../../controller/mobile/payment-gateways/razorpay.js')
    const stripeconf = require("../../controller/site/payment-gateways/stripe.js")
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }
    var urlrequest = require('request');
    var getFullAddress = async function (data) {
        db.GetOneDocument('settings', { "alias": "social_networks" }, {}, {}, (err, settings) => {
            if (err || !settings) {
                return new Promise(function (resolve, reject) {
                    resolve({ err: 0, message: '', result: {} });
                })
            } else {
                var apiKey = settings.settings.map_api.web_key;
                if (typeof data != 'undefined' && typeof data.lat != 'undefined' && data.lat != '' && typeof data.lon != 'undefined' && data.lon != '') {
                    var lat = data.lat;
                    var lon = data.lon;
                    var NodeGeocoder = require('node-geocoder');
                    var options = {
                        provider: 'google',
                        httpAdapter: 'https', // Default
                        apiKey: apiKey, // for Mapquest, OpenCage, Google Premier
                        formatter: null         // 'gpx', 'string', ...
                    };
                    var geocoder = NodeGeocoder(options);
                    return geocoder.reverse({ lat: lat, lon: lon }).then(function (res) {
                        if (typeof res != 'undefined' && res.length > 0) {
                            var response = res[0];
                            if (typeof response != 'undefined' && typeof response.city == 'undefined') {
                                if (typeof response.administrativeLevels != 'undefined' && typeof response.administrativeLevels.level2long != 'undefined') {
                                    response.city = response.administrativeLevels.level2long;
                                }

                            }
                            if (typeof response != 'undefined' && typeof response.state == 'undefined') {
                                if (typeof response.administrativeLevels != 'undefined' && typeof response.administrativeLevels.level1long != 'undefined') {
                                    response.state = response.administrativeLevels.level1long;
                                }
                            }
                            var result = { err: 0, message: '', result: { address: response } };
                            return new Promise(function (resolve, reject) {
                                resolve(result);
                            })
                        } else {
                            var geocode = {
                                'latitude': lat,
                                'longitude': lon
                            };
                            var newdata = { address: {} };
                            return GoogleAPI.geocodePromise(geocode).then(function (response) {
                                if (typeof response != 'undefined' && response.length > 0 && response[0].address_components) {
                                    response[0].address_components.forEach(function (item) {
                                        switch (item.types[0]) {
                                            case "postal_code":
                                                newdata.address.zipcode = item.long_name;
                                                break;
                                            case "country":
                                                newdata.address.country = item.long_name;
                                                break;
                                            case "administrative_area_level_1":
                                                newdata.address.state = item.long_name;
                                                break;
                                            case "locality":
                                                newdata.address.line1 = item.long_name;
                                                break;
                                            case "administrative_area_level_2":
                                                newdata.address.city = item.long_name;
                                                break;
                                        }
                                    })
                                    return new Promise(function (resolve, reject) {
                                        resolve({ err: 0, message: '', result: newdata });
                                    })
                                } else {
                                    return new Promise(function (resolve, reject) {
                                        resolve({ err: 0, message: '', result: {} });
                                    })
                                }
                            }).catch(function (err) {
                                var result = { err: 0, message: '', result: {} };
                                return new Promise(function (resolve, reject) {
                                    resolve(result);
                                })
                            });
                        }
                    }).catch(function (err) {
                        var result = { err: 0, message: '', result: {} };
                        return new Promise(function (resolve, reject) {
                            resolve(result);
                        })
                    });
                } else {
                    return new Promise(function (resolve, reject) {
                        resolve({ err: 0, message: '', result: {} });
                    })
                }
            }
        })
    }
    function jwtSign(payload) {
        var token = jwt.sign(payload, CONFIG.SECRET_KEY);
        return token;
    }
    var orderTimeLibrary = require('../../model/ordertime.js')(io);
    controller.stripePayment = function (req, res) {
        var data = {};
        data.status = '0';
        var errors = [];

        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('rest_id', 'rest_id is Required').notEmpty();
        req.checkBody('amount', 'amount is Required').notEmpty();
        req.checkBody('card_type', 'card_type is Required').notEmpty();//new,old-already used to payment

        if (req.body.card_type == 'new') {
            req.checkBody('card_number', 'card_number is Required').notEmpty();
            req.checkBody('exp_month', 'exp_month  is Required').notEmpty();
            req.checkBody('exp_year', 'exp_year is Required').notEmpty();
            req.checkBody('cvc_number', 'cvc_number no is Required').notEmpty();
            req.checkBody('email', 'email is Required').isEmail();
            req.checkBody('save_card', 'save_card is Required').notEmpty();//yes-need to create customer id,  no-one time use
        }

        if (req.body.card_type == 'old') {
            req.checkBody('customer_id', 'customer_id is Required').notEmpty();
        }

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }

        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('rest_id').trim();
        req.sanitizeBody('card_number').trim();
        req.sanitizeBody('exp_month').trim();
        req.sanitizeBody('exp_year').trim();
        req.sanitizeBody('cvc_number').trim();
        req.sanitizeBody('email').trim();
        req.sanitizeBody('amount').trim();
        req.sanitizeBody('save_card').trim();
        req.sanitizeBody('card_type').trim();
        req.sanitizeBody('customer_id').trim();

        var request = {};
        request.user_id = req.body.user_id;
        request.rest_id = req.body.rest_id;
        request.amount = req.body.amount;
        request.email = req.body.email;
        request.save_card = req.body.save_card;
        request.card_type = req.body.card_type;
        request.customer_id = req.body.customer_id;

        var card = {};
        card.number = req.body.card_number;
        card.exp_month = req.body.exp_month;
        card.exp_year = req.body.exp_year;
        card.cvc = req.body.cvc_number;
        if (request.amount == 0 || 0 > request.amount) {
            var transaction_data = {};
            transaction_data.user = request.user_id;
            transaction_data.restaurant = request.rest_id;
            transaction_data.amount = request.amount;
            transaction_data.mode = 'charge';
            transaction_data.type = 'nopayment';
            db.InsertDocument('transaction', transaction_data, function (err, transdata) {
                if (err || transdata.nModified == 0) {
                    res.send({ "status": 0, "errors": 'Error in transaction' });
                } else {
                    res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                }
            });
        } else {
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                if (err) {
                    res.send({ "status": 0, "errors": 'Error in settings..!' });
                } else {
                    var site_title = '';
                    if (typeof settings.settings != 'undefined' && typeof settings.settings.site_title != 'undefined') {
                        site_title = settings.settings.site_title
                    }
                    var currency_code = 'usd';
                    if (typeof settings.settings != 'undefined' && typeof settings.settings.currency_code != 'undefined') {
                        currency_code = settings.settings.currency_code
                    }
                    req.body.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                    db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
                        if (err || !paymentgateway.settings.secret_key) {
                            res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
                        } else {
                            stripe.setApiKey(paymentgateway.settings.secret_key);
                            db.GetOneDocument('restaurant', { _id: request.rest_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                                if (err || !rest) {
                                    res.send({ "status": 0, "errors": 'Error in restaurant..!' });
                                }
                                else {
                                    db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                        if (err || !user) {
                                            res.send({ "status": 0, "errors": 'Error in user..!' });
                                        }
                                        else {
                                            if (request.card_type == 'new') {
                                                if (request.save_card == 'yes') {
                                                    stripe.tokens.create({ card: card }, function (err, token) {
                                                        if (err || !token) {
                                                            res.send({ "status": "0", "errors": "Invalid card details..!" });
                                                        }
                                                        else {
                                                            stripe.customers.create({
                                                                email: request.email,
                                                                source: token.id,
                                                            }).then(function (customer) {
                                                                if (!customer) {
                                                                    res.send({ "status": "0", "errors": "Invalid card details..!" });
                                                                }
                                                                else {
                                                                    var pay = parseInt(request.amount * 100);
                                                                    stripe.charges.create({
                                                                        amount: pay,
                                                                        currency: currency_code,
                                                                        customer: customer.id,
                                                                        'capture': false,
                                                                        description: site_title + ' ' + "Payment From User" + ' - ' + req.body.order_id,
                                                                    }, function (err, charges) {
                                                                        if (err) {
                                                                            res.send({ "status": "0", "errors": "Error in charge creation.!" });
                                                                        } else {
                                                                            var data = {};
                                                                            data.user = request.user_id;
                                                                            data.restaurant = request.rest_id;
                                                                            data.amount = request.amount;
                                                                            data.strip_customer_id = customer.id;
                                                                            data.type = 'stripe';
                                                                            data.mode = 'charge';
                                                                            var card_details = {};
                                                                            card_details.customer_id = customer.id;
                                                                            card_details.card_no = charges.source.last4;
                                                                            card_details.exp_month = charges.source.exp_month;
                                                                            card_details.exp_year = charges.source.exp_year;
                                                                            card_details.brand = charges.source.brand;
                                                                            db.UpdateDocument('users', { _id: request.user_id }, { "$push": { 'card_details': card_details } }, {}, function (err, secdata) {
                                                                                if (err || secdata.nModified == 0) {
                                                                                    res.send({ "status": "0", "errors": "Error in card update..!" });
                                                                                }
                                                                                else {
                                                                                    db.InsertDocument('transaction', data, function (err, transdata) {
                                                                                        if (err || transdata.nModified == 0) {
                                                                                            res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                                        } else {
                                                                                            var transactionsData = [{ 'gateway_response': charges }];
                                                                                            db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                                                if (err || transaction.nModified == 0) {
                                                                                                    res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                                                } else {
                                                                                                    res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id, order_id: req.body.order_id });
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            })
                                                        }
                                                    });
                                                }
                                                else {
                                                    stripe.tokens.create({ card: card }, function (err, token) {
                                                        if (err || !token) {
                                                            res.send({ "status": "0", "errors": "Invalid card details..!" });
                                                        }
                                                        else {
                                                            var pay = parseInt(request.amount * 100);
                                                            stripe.charges.create({
                                                                amount: pay,
                                                                currency: currency_code,
                                                                source: token.id,
                                                                'capture': false,
                                                                description: site_title + ' ' + "Payment From User" + ' - ' + req.body.order_id,
                                                            }, function (err, charges) {
                                                                if (err) {
                                                                    res.send({ "status": "0", "errors": "Invalid card details..!" });
                                                                } else {
                                                                    var data = {};
                                                                    data.user = request.user_id;
                                                                    data.restaurant = request.rest_id;
                                                                    data.amount = request.amount;
                                                                    data.type = 'stripe';
                                                                    data.mode = 'charge';
                                                                    db.InsertDocument('transaction', data, function (err, transdata) {
                                                                        if (err || transdata.nModified == 0) {
                                                                            res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                        } else {
                                                                            var transactionsData = [{ 'gateway_response': charges }];
                                                                            db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                                if (err || transaction.nModified == 0) {
                                                                                    res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                                } else {
                                                                                    res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id, order_id: req.body.order_id });
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            } else {
                                                var pay = parseInt(request.amount * 100);
                                                stripe.charges.create({
                                                    amount: pay,
                                                    currency: currency_code,
                                                    customer: request.customer_id,
                                                    'capture': false,
                                                    description: site_title + ' ' + "Payment From User" + ' - ' + req.body.order_id,
                                                    metadata: { 'cvc': card.cvc }
                                                }, function (err, charges) {
                                                    if (err) {
                                                        res.send({ "status": "0", "errors": "Error in charge creation.!" });
                                                    } else {
                                                        var data = {};
                                                        data.user = request.user_id;
                                                        data.restaurant = request.rest_id;
                                                        data.amount = request.amount;
                                                        data.type = 'stripe';
                                                        data.mode = 'charge';
                                                        db.InsertDocument('transaction', data, function (err, transdata) {
                                                            if (err || transdata.nModified == 0) {
                                                                res.send({ "status": 0, "errors": 'Error in transaction' });
                                                            } else {
                                                                var transactionsData = [{ 'gateway_response': charges }];
                                                                db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                    if (err || transaction.nModified == 0) {
                                                                        res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                    } else {
                                                                        res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id, order_id: req.body.order_id });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            })
        }
    }

    events.on('cancelOrderEmail', function (req, done) {
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
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                    if (err || !social_settings) {
                        res.send({ status: 0, message: 'Configure your website settings' });
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
                                        v
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
                                                    //orderDetails.billings.amount.surge_fee = myFormat(orderDetails.billings.amount.surge_fee.toFixed(2), { integerSeparator: ',' })
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
                                            var newdata = {};
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
                                            var mailData = {};
                                            mailData.template = 'user_cancel_touser';
                                            mailData.to = userDetails.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                            mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                            mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                            //mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
                                            mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                            mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                            mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                            mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                            mailData.html.push({ name: 'item_total', value: item_total || "" });
                                            mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                            mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                            mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                            // mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                            // mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                            mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                            mailData.html.push({ name: 'service_tax', value: service_tax || "" });
                                            mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });
                                            mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                            mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                            mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                            mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                            mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
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
            }
        })
    });
    events.on('neworderto_admin', function (req, done) {

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
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                    if (err || !social_settings) {
                        res.send({ status: 0, message: 'Configure your website settings' });
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

                                            db.GetOneDocument('admins', { 'role': { $in: ['admin'] }, 'status': 1 }, {}, {}, function (err, admin) {
                                                var newdata = {};
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
                                                var mailData = {};
                                                mailData.template = 'neworderto_admin';
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
            }
        })

    });

    events.on('restaurant_new_order', function (req, done) {
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
                                        //Best Seller concept.
                                        var each = require('sync-each');
                                        if (orderDetails && typeof orderDetails.foods != 'undefined' && orderDetails.foods.length > 0) {
                                            each(orderDetails.foods,
                                                function (getMessage, next) {
                                                    db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
                                                        if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
                                                            if (typeof foodDetails.today_sell != 'undefined' && typeof foodDetails.today_sell.count != 'undefined') {
                                                                var fromdate_todaysell = new Date(foodDetails.today_sell.from_date);
                                                                var fromDate = fromdate_todaysell.getDate() + '-' + (fromdate_todaysell.getMonth() + 1) + '-' + fromdate_todaysell.getFullYear();
                                                                var todaysell_Fromdate = new Date();
                                                                var todaydate = todaysell_Fromdate.getDate() + '-' + (todaysell_Fromdate.getMonth() + 1) + '-' + todaysell_Fromdate.getFullYear();
                                                                if (fromDate == todaydate) {
                                                                    var count = foodDetails.today_sell.count + 1;
                                                                    var up_dates = { 'today_sell.from_date': Date.now(), 'today_sell.to_date': Date.now(), 'today_sell.count': count };
                                                                    db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                                                                    })
                                                                } else {
                                                                    var up_dates = { 'today_sell.from_date': Date.now(), 'today_sell.to_date': Date.now(), 'today_sell.count': 1 };
                                                                    db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                                                                    })
                                                                }
                                                            } else {
                                                                var up_dates = { 'today_sell.from_date': Date.now(), 'today_sell.to_date': Date.now(), 'today_sell.count': 1 };
                                                                db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
                                                            }
                                                        }
                                                    })
                                                    process.nextTick(next);
                                                },
                                                function (err, transformedItems) { }
                                            );
                                        }
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
                                    var mailData = {};
                                    mailData.template = 'restaurant_new_order';
                                    mailData.to = orderDetails.restaurantDetails.email;
                                    mailData.html = [];
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

    events.on('OrderEmail', function (req, done) {
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
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                    if (err || !social_settings) {
                        res.send({ status: 0, message: 'Configure your website settings' });
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
                                                schedule_date: "$schedule_date",
                                                schedule_time_slot: "$schedule_time_slot",
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
                                                order_status: { "$cond": [{ $and: [{ $eq: ["$status", 15] }] }, "Scheduled", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Deliverd", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }] }
                                            }
                                        }
                                    }
                                ];
                                db.GetAggregation('orders', condition, async function (err, docdata) {
                                    if (err || !docdata) {
                                        res.send({ "status": 0, "errors": 'Error in mail.17.!' });
                                    } else {
                                        if (docdata.length > 0) {
                                            var lat;
                                            var lon
                                            var orderDetails = {};
                                            if (typeof docdata[0].orderDetails != 'undefined') {
                                                orderDetails = docdata[0].orderDetails;
                                            }
                                            if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.loc != 'undefined' && typeof orderDetails.delivery_address.loc.lat != 'undefined') {
                                                lat = orderDetails.delivery_address.loc.lat;
                                            }
                                            if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.loc != 'undefined' && typeof orderDetails.delivery_address.loc.lng != 'undefined') {
                                                lon = orderDetails.delivery_address.loc.lng;
                                            }
                                            var street = '';
                                            if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.street != 'undefined' && orderDetails.delivery_address.street != 'undefined') {
                                                street = orderDetails.delivery_address.street
                                            }
                                            var delivery_address_fulladres = '';
                                            if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.fulladres != 'undefined' && orderDetails.delivery_address.fulladres != 'undefined') {
                                                delivery_address_fulladres = orderDetails.delivery_address.fulladres
                                            }
                                            var address = '';
                                            if (street != '') {
                                                address += street + ', ';
                                            }
                                            if (delivery_address_fulladres != '') {
                                                address += delivery_address_fulladres;
                                            }
                                            var delivery_address_landmark = '---';
                                            if (typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.landmark != 'undefined' && orderDetails.delivery_address.landmark != 'undefined') {
                                                delivery_address_landmark = orderDetails.delivery_address.landmark
                                            }
                                            var mobile_no = '';
                                            if (typeof userDetails.phone != 'undefined' && typeof userDetails.code != 'undefined') {
                                                mobile_no = userDetails.code + userDetails.phone;
                                            }
                                            var email = '';
                                            if (typeof userDetails.email != 'undefined') {
                                                email = userDetails.email;
                                            }
                                            var delivery_lat_lon = { lat: lat, lon: lon };
                                            let response = await getFullAddress(delivery_lat_lon);
                                            if (response && typeof response.result != 'undefined') {
                                                var country;
                                                var zipcode;
                                                var state;
                                                var city;
                                                var updateData = { 'delivery_address.city': '', 'delivery_address.country': '', 'delivery_address.zipcode': '', 'delivery_address.state': '' };
                                                if (typeof response.result != 'undefined') {
                                                    if (typeof response.result.address != 'undefined' && typeof response.result.address.city != 'undefined') {
                                                        updateData['delivery_address.city'] = response.result.address.city;
                                                        city = response.result.address.city;
                                                    }
                                                    if (typeof response.result.address != 'undefined' && typeof response.result.address.country != 'undefined') {
                                                        updateData['delivery_address.country'] = response.result.address.country;
                                                        country = response.result.address.country;
                                                    }
                                                    if (typeof response.result.address != 'undefined' && typeof response.result.address.zipcode != 'undefined') {
                                                        updateData['delivery_address.zipcode'] = response.result.address.zipcode;
                                                        zipcode = response.result.address.zipcode;
                                                    }
                                                    if (typeof response.result.address != 'undefined' && typeof response.result.address.state != 'undefined') {
                                                        updateData['delivery_address.state'] = response.result.address.state;
                                                        state = response.result.address.state;
                                                    }
                                                }
                                                db.UpdateDocument('orders', { _id: orderId }, updateData, {}, function (err, secdata) {
                                                })
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
                                                            orderDetails.foods[i].sub_total = orderDetails.foods[i].total.replace(/\,/g, '');
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
                                                        cost = (parseFloat(orderDetails.foods[i].sub_total)).toFixed(2);
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
                                                var newdata = {};
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
                                                var mailData = {};
                                                mailData.template = 'Invoice';
                                                mailData.to = userDetails.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                                mailData.html.push({ name: 'mode', value: orderDetails.mode || "" });
                                                mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                                mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                                //mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
                                                mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                                mailData.html.push({ name: 'billingDetails', value: billingDetails || "" });
                                                mailData.html.push({ name: 'deliveryDetails', value: deliveryDetails || "" });
                                                mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                                mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                                mailData.html.push({ name: 'delivery_address_country', value: country || "" });
                                                mailData.html.push({ name: 'delivery_address_zipcode', value: zipcode || "" });
                                                mailData.html.push({ name: 'delivery_address_state', value: state || "" });
                                                mailData.html.push({ name: 'delivery_address_city', value: city || "" });
                                                mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                                mailData.html.push({ name: 'item_total', value: orderDetails.item_total || "" });
                                                mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                                mailData.html.push({ name: 'coupon_discount', value: orderDetails.billings.amount.coupon_discount || "" });
                                                mailData.html.push({ name: 'delivery_amount', value: orderDetails.billings.amount.delivery_amount || "" });
                                                mailData.html.push({ name: 'schedule_time_slot', value: orderDetails.schedule_time_slot || "" });
                                                mailData.html.push({ name: 'schedule_date', value: orderDetails.schedule_date || "" });
                                                // mailData.html.push({ name: 'package_charge', value: night_fee || "" });
                                                mailData.html.push({ name: 'service_tax', value: orderDetails.billings.amount.service_tax || "" });
                                                mailData.html.push({ name: 'payment_details', value: payment_details || "" });
                                                mailData.html.push({ name: 'grand_total', value: orderDetails.billings.amount.grand_total || "" });
                                                mailData.html.push({ name: 'refer_offer_price', value: refer_offer_price || "" });
                                                mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
                                                mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
                                                mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
                                                mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
                                                mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
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
                                                mailcontent.sendmail(mailData, function (err, response) { console.log(err, response) });
                                                done(null, { status: 1, response: response });
                                            }
                                        } else {
                                            res.send({ "status": 0, "errors": 'Error in mail..!' });
                                        }
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    });

    controller.paypalPayment = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('_id', 'cart_id is required').notEmpty();
        req.checkBody('food', 'food is required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id is required').notEmpty();
        req.checkBody('total', 'total is required').notEmpty();
        req.checkBody('grand_total', 'pay_total is required').notEmpty();
        req.checkBody('service_tax', 'service_tax is required').notEmpty();
        req.checkBody('offer_discount', 'offer_discount is required').optional();
        req.checkBody('coupon_code', 'coupon_code id is required').optional();
        req.checkBody('coupon_discount', 'coupon_discount id is required').optional();
        req.checkBody('food_offer_price', 'food_offer_price id is required').optional();
        req.checkBody('package_charge', 'package_charge id is required').optional();
        req.checkBody('delivery_amount', 'delivery_amount is required').optional();
        req.checkBody('night_fee', 'night_fare is required').optional();
        req.checkBody('surge_fee', 'surge_fare is required').optional();
        req.checkBody('delivery_address', 'delivery_address is required').notEmpty();
        req.checkBody('landmark', 'landmark is required').optional();
        req.checkBody('flat_no', 'flat_no is required').optional();
        req.checkBody('address_type', 'address_type is required').notEmpty();
        req.checkBody('longitude', 'longitude is required').notEmpty();
        req.checkBody('latitude', 'latitude is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            console.log('errors[0].msg', errors[0].msg)
            res.send({ "status": 0, "errors": errors[0].msg });
            return;
        }
        req.sanitizeBody('transaction_id').trim();
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('restaurant_id').trim();
        req.sanitizeBody('quantity').trim();
        req.sanitizeBody('individual_total').trim();
        req.sanitizeBody('total').trim();
        req.sanitizeBody('discount').trim();
        req.sanitizeBody('coupon_code').trim();
        req.sanitizeBody('delivery_amount').trim();
        req.sanitizeBody('surge_fee').trim();
        req.sanitizeBody('night_fee').trim();
        req.sanitizeBody('delivery_address').trim();
        req.sanitizeBody('address_type').trim();
        req.sanitizeBody('longitude').trim();
        req.sanitizeBody('latitude').trim();
        var data = {};
        data.cart_id = req.body._id;
        data.user_id = req.body.user_id;
        data.restaurant_id = req.body.restaurant_id;
        data.foods = req.body.food;
        data.coupon_code = req.body.coupon_code;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address;
        data.delivery_address.type = req.body.address_type;
        data.delivery_address.street = req.body.flat_no;
        data.delivery_address.landmark = req.body.landmark;
        data.delivery_address.loc = {};
        data.delivery_address.loc.lng = req.body.longitude;
        data.delivery_address.loc.lat = req.body.latitude;
        data.location = {};
        data.location.lng = req.body.longitude;
        data.location.lat = req.body.latitude;
        data.status = '1';
        data.schedule_type = req.body.schedule_type;
        var date = new Date();
        if (req.body.schedule_type == '1') {
            var schedule_time = req.body.schedule_time;
            var schedule_day = req.body.schedule_day;
            var hours = parseInt(schedule_time.slice(0, -6));
            var minutes = parseInt(schedule_time.slice(3, -3));
            var meridiem = schedule_time.slice(-2);
            if (meridiem == 'pm' && hours != 12) {
                console.log('hours', hours)
                hours = hours + 12;
                console.log('hours', hours)
            }
            date.setHours(hours);
            date.setMinutes(minutes);
            console.log('111', date);
            date = date.getTime();
            var date1 = date;
            if (req.body.eta) {
                date = date - (req.body.eta * 60 * 1000);
            }
            if (schedule_day == 'tomorrow') {
                date = date + (24 * 60 * 60 * 1000);
            }
            console.log('222', new Date(date));
            console.log('333', date, date1);
            data.schedule_time = date;
            data.status = '15';
        }



        db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
            if (err || !paymentgateway) {
                res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
            } else {
                db.GetOneDocument('restaurant', { _id: data.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                    if (err || !rest) {
                        res.send({ "status": 0, "errors": 'Error in restaurant..!' });
                    }
                    else {
                        data.rest_offer = rest.offer;
                        data.com_type = rest.com_type;
                        data.unique_commission = rest.unique_commission || '';
                        db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                            if (err || !user) {
                                res.send({ "status": 0, "errors": 'Error in user..!' });
                            } else {
                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err) {
                                        res.send({ "status": 0, "errors": 'Error in settings..!' });
                                    }
                                    else {
                                        db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
                                            if (err || !cart_details) {
                                                res.send({ "status": 0, "errors": 'Error in cart..!' });
                                            } else {
                                                if (cart_details && typeof cart_details._id != 'undefined') {
                                                    data.cart_details = cart_details;
                                                    var billings = {};
                                                    billings.amount = {};
                                                    billings.amount.total = req.body.total;
                                                    billings.amount.coupon_discount = req.body.coupon_discount || 0;
                                                    billings.amount.food_offer_price = req.body.food_offer_price || 0;
                                                    billings.amount.offer_discount = req.body.offer_discount || 0;
                                                    billings.amount.delivery_amount = req.body.delivery_amount || 0;
                                                    billings.amount.service_tax = req.body.service_tax || 0;
                                                    billings.amount.night_fee = req.body.night_fee || 0;
                                                    billings.amount.surge_fee = req.body.surge_fee || 0;
                                                    billings.amount.grand_total = req.body.grand_total || 0;
                                                    billings.amount.package_charge = req.body.package_charge || 0;
                                                    data.billings = billings;
                                                    var temp_payment = {
                                                        order: data,
                                                        created_time: Date.now()
                                                    }
                                                    db.InsertDocument('temp_payment', temp_payment, function (err, orderdata) {
                                                        if (err || orderdata.nModified == 0) {
                                                            res.send({ "status": 0, "errors": 'Error in order..!' });
                                                        } else {
                                                            data.payment_id = orderdata._id;
                                                            data.pay_total = req.body.grand_total || 0;
                                                            data.subtotal = req.body.total || 0;
                                                            data.currency_code = settings.settings.currency_code
                                                            data.site_title = settings.settings.site_title
                                                            paypal.create(req, res, data, function (result) {
                                                                var orderId = orderdata._id;
                                                                if (typeof result.response != 'undefined' && (result.response.name == 'VALIDATION_ERROR' || result.response.error)) {
                                                                    res.send({ "status": 0, "errors": '', result: result });
                                                                } else {
                                                                    res.send({ "status": 1, "errors": '', result: result });
                                                                }
                                                            });
                                                        }
                                                    })
                                                } else {
                                                    res.send({ "status": 0, "errors": 'Error in cart..!' });
                                                }

                                            }
                                        })
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    controller.paypalCancel = function (req, res) {
        var payment_id = req.query.payment_id;
        db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
            if (err || !tempPayment) {
            } else {
                db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
            }
        })
        res.redirect("/mobile/payment/failure");
    }
    controller.paypalExecute = function (req, res) {
        var details = {
            "payer_id": req.query.PayerID
        };
        var payment_id = req.query.payment_id;
        paypal.execute(req.query.paymentId, details, function (result) {
            if (result.transactions) {
                var data = { payment_gateway_response: {} };
                data.payment_gateway_response = result;
                if (typeof result.transactions != 'undefined' && result.transactions.length > 0 && typeof result.transactions[0].related_resources != 'undefined' && result.transactions[0].related_resources.length > 0 && typeof result.transactions[0].related_resources[0].authorization != 'undefined' && typeof result.transactions[0].related_resources[0].authorization.state != 'undefined' && result.transactions[0].related_resources[0].authorization.state == 'authorized') {
                    if (typeof payment_id != 'undefined' && payment_id != '') {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err) {
                                res.redirect("/mobile/payment/failure");
                            } else {
                                db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
                                    if (err || !tempPayment) {
                                        res.redirect("/mobile/payment/failure");
                                    } else {
                                        db.GetOneDocument('users', { _id: new mongoose.Types.ObjectId(tempPayment.order.user_id), status: { $eq: 1 } }, {}, {}, function (err, user) {
                                            if (err || !user) {
                                                res.redirect("/mobile/payment/failure");
                                            } else {
                                                var data = {};
                                                data.user = tempPayment.order.user_id;
                                                data.restaurant = tempPayment.order.restaurant_id;
                                                data.amount = tempPayment.order.billings.amount.grand_total;
                                                data.type = 'paypal';
                                                data.mode = 'charge';
                                                db.InsertDocument('transaction', data, function (err, transdata) {
                                                    if (err || transdata.nModified == 0) {
                                                        res.redirect("/mobile/payment/failure");
                                                    } else {
                                                        var transactionsData = [{ 'gateway_response': result }];
                                                        db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                            if (err || transaction.nModified == 0) {
                                                                res.redirect("/mobile/payment/failure");
                                                            } else {
                                                                var order_data = tempPayment.order;
                                                                order_data.transaction_id = transdata._id;
                                                                order_data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                                                                order_data.created_time = Date.now();
                                                                if (order_data.schedule_type == '1') {
                                                                    order_data.created_time = order_data.schedule_time;
                                                                }
                                                                //console.log(order_data)
                                                                db.InsertDocument('orders', order_data, function (err, orderdata) {
                                                                    //console.log('orderdata response',err, orderdata)
                                                                    if (err || orderdata.nModified == 0) {
                                                                        res.redirect("/mobile/payment/failure");
                                                                    } else {



                                                                        var updatedoc = { 'order_history.order_time': new Date() };
                                                                        db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                                                            if (err || response.nModified == 0) {
                                                                                res.redirect("/mobile/payment/failure");
                                                                            }
                                                                            else {
                                                                                var cart_id = tempPayment.order.cart_id;
                                                                                db.DeleteDocument('cart', { '_id': new mongoose.Types.ObjectId(cart_id) }, function (err, res) { });
                                                                                if (tempPayment.order.coupon_code && tempPayment.order.coupon_code != '') {
                                                                                    db.GetDocument('coupon', { status: { $ne: 0 }, code: tempPayment.order.coupon_code }, {}, {}, function (err, usagelimit) {
                                                                                        if (err || !usagelimit || usagelimit.length == 0) {
                                                                                            res.redirect("/mobile/payment/failure");
                                                                                        } else {
                                                                                            var usagelimits = usagelimit[0].usage.total_coupons;
                                                                                            var result = usagelimits - 1;
                                                                                            var use = parseInt(usagelimit[0].used) + parseInt(1);
                                                                                            if (result <= 0) {
                                                                                                result = 0;
                                                                                            }
                                                                                            db.UpdateDocument('coupon', { status: { $ne: 0 }, code: tempPayment.order.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                                                                                                if (err || result.nModified == 0) {
                                                                                                    res.redirect("/mobile/payment/failure");
                                                                                                }
                                                                                                else {
                                                                                                    if (orderdata.schedule_type == 0) {
                                                                                                        var android_restaurant = tempPayment.order.restaurant_id;
                                                                                                        var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                                                                        var response_time = CONFIG.respond_timeout;
                                                                                                        var action = 'order_request';
                                                                                                        var options = [orderdata.order_id, android_restaurant, response_time, action];
                                                                                                        for (var i = 1; i == 1; i++) {
                                                                                                            push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                                        }
                                                                                                        var noti_data = {};
                                                                                                        noti_data.rest_id = orderdata.restaurant_id;
                                                                                                        noti_data.order_id = orderdata.order_id;
                                                                                                        noti_data.user_id = orderdata.user_id;
                                                                                                        noti_data._id = orderdata._id;
                                                                                                        noti_data.user_name = user.username;
                                                                                                        noti_data.order_type = 'user';
                                                                                                        io.of('/chat').in(orderdata.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                                        io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                                                                                        io.of('/chat').emit('adminnotify', noti_data);
                                                                                                        var order_id = orderdata.order_id;
                                                                                                        orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                                                                                        var mail_data = {};
                                                                                                        mail_data.user_id = user._id;
                                                                                                        mail_data.order_id = orderdata._id;
                                                                                                        events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                                        var mail_data = {};
                                                                                                        mail_data.user_id = user._id;
                                                                                                        mail_data.order_id = orderdata._id;
                                                                                                        events.emit('neworderto_admin', mail_data, function (err, result) { });
                                                                                                    }
                                                                                                    var mail_data = {};
                                                                                                    mail_data.user_id = user._id;
                                                                                                    mail_data.order_id = orderdata._id;
                                                                                                    events.emit('OrderEmail', mail_data, function (err, result) { });
                                                                                                    db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
                                                                                                    res.redirect("/mobile/payment/success");
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                }
                                                                                else {
                                                                                    if (orderdata.schedule_type == 0) {
                                                                                        var android_restaurant = tempPayment.order.restaurant_id;
                                                                                        var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                                                        var response_time = CONFIG.respond_timeout;
                                                                                        var action = 'order_request';
                                                                                        var options = [orderdata.order_id, android_restaurant, response_time, action];
                                                                                        for (var i = 1; i == 1; i++) {
                                                                                            push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                        }
                                                                                        var noti_data = {};
                                                                                        noti_data.rest_id = orderdata.restaurant_id;;
                                                                                        noti_data.user_id = orderdata.user_id;;
                                                                                        noti_data._id = orderdata._id;;
                                                                                        noti_data.order_id = orderdata.order_id;
                                                                                        noti_data.user_name = user.username;
                                                                                        noti_data.order_type = 'user';
                                                                                        io.of('/chat').in(orderdata.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                        io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                                                                        io.of('/chat').emit('adminnotify', noti_data);
                                                                                        var order_id = orderdata.order_id;
                                                                                        orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                                                                        var mail_data = {};
                                                                                        mail_data.user_id = user._id;
                                                                                        mail_data.order_id = orderdata._id;
                                                                                        events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                        var mail_data = {};
                                                                                        mail_data.user_id = user._id;
                                                                                        mail_data.order_id = orderdata._id;
                                                                                        events.emit('neworderto_admin', mail_data, function (err, result) { });
                                                                                    }
                                                                                    var mail_data = {};
                                                                                    mail_data.user_id = user._id;
                                                                                    mail_data.order_id = orderdata._id;
                                                                                    events.emit('OrderEmail', mail_data, function (err, result) { });
                                                                                    db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
                                                                                    res.redirect("/mobile/payment/success");
                                                                                }
                                                                            }
                                                                        });
                                                                    }
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
                } else {
                    res.redirect("/mobile/payment/failure");
                }
            } else {
                res.redirect("/mobile/payment/failure");
            }
        });
    }
    controller.paymentFailure = function (req, res) {
        db.GetDocument('settings', { "alias": { "$in": ["general", "seo", "social_networks"] } }, {}, {}, function (err, docdata) {
            if (err) {
                res.render('mobile/payment-failure', {});
            } else {
                var settings = {};
                settings.title = docdata[1].settings.seo_title;
                settings.description = docdata[1].settings.meta_description;
                settings.image = docdata[0].settings.site_url + docdata[1].settings.og_image;
                settings.siteUrl = docdata[0].settings.site_url;
                settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
                settings.googleMapAPI = docdata[2].settings.map_api.web_key;
                res.render('mobile/payment-failure', settings);
            }
        });
    }

    controller.paymentSuccess = function (req, res) {
        db.GetDocument('settings', { "alias": { "$in": ["general", "seo", , "social_networks"] } }, {}, {}, function (err, docdata) {
            if (err) {
                res.render('mobile/payment-success', {});
            } else {
                var settings = {};
                settings.title = docdata[1].settings.seo_title;
                settings.description = docdata[1].settings.meta_description;
                settings.image = docdata[0].settings.site_url + docdata[1].settings.og_image;
                settings.siteUrl = docdata[0].settings.site_url;
                settings.fbappId = CONFIG.SOCIAL_NETWORKS.facebookAuth.clientID;
                settings.googleMapAPI = docdata[2].settings.map_api.web_key;
                res.render('mobile/payment-success', settings);
            }
        });
    }
    // controller.cancelOrder = function (req, res) {
    //     var data = {};
    //     data.status = '0';
    //     var errors = [];
    //     req.checkBody('user_id', 'user_id is Required').notEmpty();
    //     req.checkBody('order_id', 'order_id is Required').notEmpty();
    //     req.checkBody('cancellationreason', 'cancellationreason is Required').notEmpty();
    //     errors = req.validationErrors();
    //     if (errors) {
    //         res.send({
    //             "status": "0",
    //             "errors": errors[0].msg
    //         });
    //         return;
    //     }
    //     req.sanitizeBody('user_id').trim();
    //     req.sanitizeBody('orderId').trim();
    //     var request = {};
    //     request.user_id = req.body.user_id;
    //     // //  // console.log("=================", req.body.user_id, req.body.order_id)
    //     //  // // db.GetOneDocument('orders', { "user_id": req.body.user_id, order_id: req.body.order_id, status: 1 }, {}, {}, function (err, ordersDetails) {


    //     let orders = db.GetOneDocument('orders', { "user_id": req.body.user_id, order_id: req.body.order_id, $or: [{ status: 1 }, { status: 15 }] }, {}, {})


    //     // db.GetOneDocument('orders', { "user_id": req.body.user_id, order_id: req.body.order_id, $or: [{ status: 1 }, { status: 15 }] }, {}, {}, function (err, ordersDetails) {

    //     //     console.log("=================", ordersDetails)
    //     //     if (err || !ordersDetails) {
    //     //         res.send({ "status": 0, "errors": 'Cannot cancel the order' });
    //     //     } else {
    //     //         db.GetOneDocument('city', { _id: ordersDetails.city_id }, {}, {}, function (err, rest) {

    //     //             if (err || !rest) {
    //     //                 res.send({ "status": 0, "errors": 'Error in city..!' });
    //     //             }
    //     //             else {
    //     //                 db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {

    //     //                     if (err || !user) {
    //     //                         res.send({ "status": 0, "errors": 'Error in user..!' });
    //     //                     } else {
    //     //                         db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
    //     //                             if (err || !transactionDetails) {
    //     //                                 res.send({ "status": 0, "errors": 'Cannot cancel the order' });
    //     //                             } else {
    //     //                                 if (transactionDetails.type == 'stripe') {
    //     //                                     db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {

    //     //                                         if (err || !paymentgateway.settings.secret_key) {
    //     //                                             res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
    //     //                                         } else {
    //     //                                             stripe.setApiKey(paymentgateway.settings.secret_key);
    //     //                                             var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
    //     //                                             if (charge_index != -1) {
    //     //                                                 var charge_id = transactionDetails.transactions[charge_index].gateway_response.id
    //     //                                                 stripe.refunds.create({
    //     //                                                     charge: charge_id,
    //     //                                                 }, function (err, refund) {
    //     //                                                     if (err) {
    //     //                                                         res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                     } else {
    //     //                                                         var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
    //     //                                                         db.UpdateDocument('orders', { 'order_id': req.body.order_id }, updatedoc, {}, function (err, response) {
    //     //                                                             if (err || response.nModified == 0) {
    //     //                                                                 res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                             } else {
    //     //                                                                 var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
    //     //                                                                 db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
    //     //                                                                     if (err || responses.nModified == 0) {
    //     //                                                                         res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                                     } else {
    //     //                                                                         var android_restaurant = ordersDetails.city_id;
    //     //                                                                         var message = 'User cancelled your order';
    //     //                                                                         var response_time = CONFIG.respond_timeout;
    //     //                                                                         var action = 'admin_cancel';
    //     //                                                                         var options = [req.body.order_id, android_restaurant, response_time, action];
    //     //                                                                         // for (var i = 1; i == 1; i++) {
    //     //                                                                         //     push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //     //                                                                         // }
    //     //                                                                         res.send({ "status": "1", "message": "Order Canceled" });
    //     //                                                                         var mail_data = {};
    //     //                                                                         mail_data.user_id = user._id;
    //     //                                                                         mail_data.order_id = ordersDetails._id;
    //     //                                                                         events.emit('cancelOrderEmail', mail_data, function (err, result) { });
    //     //                                                                     }
    //     //                                                                 })
    //     //                                                             }
    //     //                                                         })
    //     //                                                     }
    //     //                                                 })
    //     //                                             } else {
    //     //                                                 res.send({ "status": 0, "errors": 'Cannot cancel the order' });
    //     //                                             }
    //     //                                         }
    //     //                                     });
    //     //                                 } else if (transactionDetails.type == 'paypal') {
    //     //                                     db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
    //     //                                         if (err || !paymentgateway.settings.secret_key) {
    //     //                                             res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
    //     //                                         } else {
    //     //                                             var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.intent }).indexOf('authorize');
    //     //                                             if (charge_index != -1) {
    //     //                                                 if (typeof transactionDetails.transactions[charge_index].gateway_response.transactions != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization != 'undefined') {
    //     //                                                     var authorization_id = transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization.id;
    //     //                                                     var api = require('paypal-rest-sdk');
    //     //                                                     api.authorization.void(authorization_id, function (error, refund) {
    //     //                                                         if (error) {
    //     //                                                             res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
    //     //                                                         } else {
    //     //                                                             var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
    //     //                                                             db.UpdateDocument('orders', { 'order_id': req.body.order_id }, updatedoc, {}, function (err, response) {
    //     //                                                                 if (err || response.nModified == 0) {
    //     //                                                                     res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                                 } else {
    //     //                                                                     var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
    //     //                                                                     db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
    //     //                                                                         if (err || responses.nModified == 0) {
    //     //                                                                             res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                                         } else {
    //     //                                                                             var android_restaurant = ordersDetails.city_id;
    //     //                                                                             var message = 'User cancelled your order';
    //     //                                                                             var response_time = CONFIG.respond_timeout;
    //     //                                                                             var action = 'admin_cancel';
    //     //                                                                             var options = [req.body.order_id, android_restaurant, response_time, action];
    //     //                                                                             // for (var i = 1; i == 1; i++) {
    //     //                                                                             //     push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //     //                                                                             // }
    //     //                                                                             res.send({ "status": "1", "message": "Order Canceled" });
    //     //                                                                             var mail_data = {};
    //     //                                                                             mail_data.user_id = user._id;
    //     //                                                                             mail_data.order_id = ordersDetails._id;
    //     //                                                                             events.emit('cancelOrderEmail', mail_data, function (err, result) { });
    //     //                                                                         }
    //     //                                                                     })
    //     //                                                                 }
    //     //                                                             })
    //     //                                                         }
    //     //                                                     })
    //     //                                                 }
    //     //                                             } else {
    //     //                                                 res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
    //     //                                             }
    //     //                                         }
    //     //                                     })
    //     //                                 } else if (transactionDetails.type == 'nopayment' || transactionDetails.type == 'COD') {
    //     //                                     var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
    //     //                                     db.UpdateDocument('orders', { 'order_id': req.body.order_id }, updatedoc, {}, function (err, response) {
    //     //                                         if (err || response.nModified == 0) {
    //     //                                             res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                         } else {
    //     //                                             if (transactionDetails.type == 'nopayment') {
    //     //                                                 var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: 'nopayment' } } };
    //     //                                             }

    //     //                                             if (transactionDetails.type == 'COD') {
    //     //                                                 var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: 'COD' } } };
    //     //                                             }

    //     //                                             db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
    //     //                                                 if (err || responses.nModified == 0) {
    //     //                                                     res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                 } else {
    //     //                                                     var android_restaurant = ordersDetails.restaurant_id;
    //     //                                                     var message = 'User cancelled your order';
    //     //                                                     var response_time = CONFIG.respond_timeout;
    //     //                                                     var action = 'admin_cancel';
    //     //                                                     var options = [req.body.order_id, android_restaurant, response_time, action];
    //     //                                                     if (ordersDetails.status == 1) {
    //     //                                                         for (var i = 1; i == 1; i++) {
    //     //                                                             push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //     //                                                         }
    //     //                                                     }

    //     //                                                     if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
    //     //                                                         var refer_offer = ordersDetails.refer_offer;
    //     //                                                         db.UpdateDocument('users', { '_id': ordersDetails.user_id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
    //     //                                                     }

    //     //                                                     res.send({ "status": "1", "message": "Order Canceled" });
    //     //                                                     var mail_data = {};
    //     //                                                     mail_data.user_id = user._id;
    //     //                                                     mail_data.order_id = ordersDetails._id;
    //     //                                                     events.emit('cancelOrderEmail', mail_data, function (err, result) { });
    //     //                                                 }
    //     //                                             })
    //     //                                         }
    //     //                                     })

    //     //                                 } else if (transactionDetails.type == 'cashfree') {
    //     //                                     db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'cashfree' }, {}, {}, function (err, paymentgateway) {
    //     //                                         if (err || !paymentgateway) {
    //     //                                             res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
    //     //                                         } else {
    //     //                                             let url = '';
    //     //                                             if (paymentgateway.settings.mode == "live") {
    //     //                                                 url = "https://api.cashfree.com/api/v1/order/refund";
    //     //                                             } else {
    //     //                                                 url = "https://test.cashfree.com/api/v1/order/refund";
    //     //                                             }
    //     //                                             var options = {
    //     //                                                 'method': 'POST',
    //     //                                                 'url': url,
    //     //                                                 'headers': {
    //     //                                                     'Content-Type': 'application/x-www-form-urlencoded'
    //     //                                                 },
    //     //                                                 form: {
    //     //                                                     'appId': paymentgateway.settings.app_key,
    //     //                                                     'secretKey': paymentgateway.settings.secret_key,
    //     //                                                     'referenceId': transactionDetails.transactions[0].gateway_response.referenceId,
    //     //                                                     'refundAmount': transactionDetails.amount,
    //     //                                                     'refundNote': req.body.cancellationreason
    //     //                                                 }
    //     //                                             };
    //     //                                             urlrequest(options, async (error, response) => {
    //     //                                                 let respo = JSON.parse(response.body) // { message: 'Refund has been initiated.', refundId: 5659, status: 'OK' }
    //     //                                                 if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR") {
    //     //                                                     res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
    //     //                                                 } else {
    //     //                                                     var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
    //     //                                                     db.UpdateDocument('orders', { 'order_id': req.body.order_id }, updatedoc, {}, function (err, response) {
    //     //                                                         if (err || response.nModified == 0) {
    //     //                                                             res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                         } else {
    //     //                                                             var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: respo } } };
    //     //                                                             db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
    //     //                                                                 if (err || responses.nModified == 0) {
    //     //                                                                     res.send({ "status": "0", "errors": "Error in refunds creation.!" });
    //     //                                                                 } else {
    //     //                                                                     var android_restaurant = ordersDetails.restaurant_id;
    //     //                                                                     var message = 'User cancelled your order';
    //     //                                                                     var response_time = CONFIG.respond_timeout;
    //     //                                                                     var action = 'admin_cancel';
    //     //                                                                     var options = [req.body.order_id, android_restaurant, response_time, action];
    //     //                                                                     for (var i = 1; i == 1; i++) {
    //     //                                                                         push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //     //                                                                     }
    //     //                                                                     res.send({ "status": "1", "message": "Order Canceled" });
    //     //                                                                     var mail_data = {};
    //     //                                                                     mail_data.user_id = user._id;
    //     //                                                                     mail_data.order_id = ordersDetails._id;
    //     //                                                                     events.emit('cancelOrderEmail', mail_data, function (err, result) { });
    //     //                                                                 }
    //     //                                                             })
    //     //                                                         }
    //     //                                                     })
    //     //                                                 }
    //     //                                             })
    //     //                                         }
    //     //                                     })
    //     //                                 }
    //     //                             }
    //     //                         })
    //     //                     }
    //     //                 })
    //     //             }
    //     //         })
    //     //     }
    //     // })
    // }
    controller.cancelOrder = async function (req, res) {
        try {
            console.log("is it currectly here or not");
            console.log(req.body, 'this is request body');
            let update_cancel_data = {
                status: 9,
                // order_history: {
                cancelledDate: new Date()
                // }
            }
            const docdata = await db.UpdateDocument('orders', { _id: { $in: new mongoose.Types.ObjectId(req.body.orderId) } }, { "status": 9, 'order_history.cancelledDate': new Date() }, { multi: true })
            if (docdata.status == false) {
                res.send({ status: 0, error: true, message: err.message });
            } else {
                res.send({ status: 1, error: false, message: 'Cancel Order Successfully' });
            }

        } catch (error) {

        }
    }


    controller.returnOrder = async function (req, res) {
        try {
            console.log(req.body, 'this is the request body000000000000000000000000000000000000000');
            // change food status,
            const date = new Date();
            const docdata = await db.UpdateDocument('orders', { _id: { $in: req.body.orderId }, "foods.id": req.body.product_id }, { $set: { "foods.$.status": 16, "foods.$.return_date": date, "foods.$.return_reason": req.body.reason } }, { multi: true, })
            // await db.UpdateDocument('orders', { _id: new mongoose.Types.ObjectId(req.body.id) }, { $set: { returnStatus: false } }, {});
            if (docdata.status == false) {
                res.send({ status: 0, message: err.message });
            } else {
                res.send({ status: 1, message: 'Order confirmed for the return' });
            }
        } catch (error) {
            res.send({ status: false, message: 'Something went wrong with the returns, Please try again latter' })
        }
    }






    controller.paypalRechargeCancel = function (req, res) {
        var payment_id = req.query.payment_id;
        db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
            if (err || !tempPayment) {
            } else {
                db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
            }
        })
        res.redirect("/mobile/payment/recharge/failure");
    }

    controller.paypalRechargeExecute = function (req, res) {
        console.log('paypalRechargeExecute')
        var details = {
            "payer_id": req.query.PayerID
        };
        var payment_id = req.query.payment_id;
        paypal.execute(req.query.paymentId, details, function (result) {
            if (result.transactions) {
                var data = { payment_gateway_response: {} };
                data.payment_gateway_response = result;
                if (typeof result.transactions != 'undefined' && result.transactions.length > 0 && typeof result.transactions[0].related_resources != 'undefined' && result.transactions[0].related_resources.length > 0 && typeof result.transactions[0].related_resources[0].authorization != 'undefined' && typeof result.transactions[0].related_resources[0].authorization.state != 'undefined' && result.transactions[0].related_resources[0].authorization.state == 'authorized') {
                    if (typeof payment_id != 'undefined' && payment_id != '') {
                        db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
                            if (err || !tempPayment) {
                                res.redirect("/mobile/payment/recharge/failure");
                            } else {
                                console.log('tempPayment', tempPayment)
                                var projection = { username: 1, avatar: 1, wallet_settings: 1, wallet_pending_payment: 1 };
                                var collection = 'drivers';
                                if (typeof tempPayment.order != 'undefined' && typeof tempPayment.order.driver_id != 'undefined') {
                                    var from = tempPayment.order.driver_id;
                                    var to = tempPayment.order.driver_id;
                                    db.GetOneDocument(collection, { _id: new mongoose.Types.ObjectId(from) }, projection, {}, function (err, currentUser) {
                                        if (err || !currentUser) {
                                            res.redirect("/mobile/payment/recharge/failure");
                                        } else {
                                            console.log('currentUser', currentUser)
                                            db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1 }, {}, function (err, settings) {
                                                if (err || !settings) {
                                                    res.redirect("/mobile/payment/recharge/failure");
                                                } else {
                                                    if (typeof currentUser != 'undefined' && typeof currentUser._id != 'undefined') {
                                                        var type = 'driver_recharge'
                                                        var tempData = tempPayment.order;
                                                        if ((type == 'driver_recharge') && typeof tempData != 'undefined' && typeof tempData.amount != 'undefined' && tempData.amount > 0) {
                                                            var wallet_amount = parseInt(tempData.amount);
                                                            var life_time_wallet_amount = parseInt(tempData.amount);
                                                            var used = parseInt(tempData.amount);
                                                            var update_amount = parseInt(tempData.amount);
                                                            if (typeof currentUser.wallet_settings != 'undefined' && typeof currentUser.wallet_settings.available != 'undefined') {
                                                                update_amount = currentUser.wallet_settings.available + update_amount;
                                                            }
                                                            if (typeof currentUser.wallet_settings != 'undefined' && typeof currentUser.wallet_settings.life_time != 'undefined') {
                                                                life_time_wallet_amount = currentUser.wallet_settings.life_time + life_time_wallet_amount;
                                                            }
                                                            if (typeof currentUser.wallet_settings != 'undefined' && typeof currentUser.wallet_settings.used != 'undefined') {
                                                                used = currentUser.wallet_settings.used + used;
                                                            }
                                                            var recordId = new mongoose.Types.ObjectId();
                                                            var activity = to;
                                                            var condition = { '_id': from };
                                                            var updateData = { 'wallet_settings.available': update_amount, 'wallet_settings.life_time': life_time_wallet_amount };
                                                            var InsertData = { _id: recordId, from: from, activity: activity, type: type, amount: wallet_amount, reason: tempData.note, payment_gateway_response: data.payment_gateway_response };
                                                            db.InsertDocument('driver_wallet', InsertData, function (err, document) {
                                                            });
                                                            db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
                                                            db.UpdateDocument(collection, condition, updateData, {}, function (err, response) {
                                                                db.GetOneDocument(collection, { _id: from }, projection, {}, function (err, currentUser) {
                                                                    if (err || !currentUser) {
                                                                    } else {
                                                                        if (typeof currentUser.wallet_pending_payment != 'undefined' && currentUser.wallet_pending_payment.length > 0) {
                                                                            for (var i = 0; i < currentUser.wallet_pending_payment; i++) {
                                                                                if (currentUser.wallet_pending_payment[i].amount > 0) {
                                                                                    var reduce_wallet_amount = currentUser.wallet_pending_payment[i].amount;
                                                                                    var used1 = currentUser.wallet_pending_payment[i].amount;
                                                                                    var update_amount1 = currentUser.wallet_pending_payment[i].amount;
                                                                                    if (currentUser.wallet_settings.available >= reduce_wallet_amount) {
                                                                                        update_amount1 = currentUser.wallet_settings.available - update_amount1;
                                                                                        if (typeof currentUser.wallet_settings != 'undefined' && typeof currentUser.wallet_settings.used != 'undefined') {
                                                                                            used1 = currentUser.wallet_settings.used + used1;
                                                                                        }
                                                                                        var updateData1 = { 'wallet_settings.available': update_amount1, 'wallet_settings.used': used1 };
                                                                                        var condition = { '_id': from };
                                                                                        db.UpdateDocument(collection, condition, updateData, {}, function (err, response) {
                                                                                        })
                                                                                        var recordId = new mongoose.Types.ObjectId();
                                                                                        var activity = currentUser.wallet_pending_payment[i].order_id;
                                                                                        var InsertData = { _id: recordId, from: from, activity: activity, type: 'driver_order_pending_amount', amount: reduce_wallet_amount, reason: '' };
                                                                                        db.InsertDocument('driver_wallet', InsertData, function (err, document) {
                                                                                        });
                                                                                        var updateData = { 'wallet_payment_details.driver_pending_amount': 0 };
                                                                                        db.UpdateDocument('orders', { '_id': activity }, updateData, {}, function (err, docdata) {
                                                                                        })
                                                                                        var condition = { '_id': from };
                                                                                        var update_data = { "$pull": { 'wallet_pending_payment': { _id: { $in: [currentUser.wallet_pending_payment[i]._id] } } } };
                                                                                        db.UpdateDocument(collection, condition, updateData, {}, function (err, docdata) {
                                                                                        })
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                })

                                                            });
                                                            console.log('updateData', updateData, InsertData)
                                                            res.redirect("/mobile/payment/recharge/success");
                                                        } else {
                                                            res.redirect("/mobile/payment/recharge/failure");
                                                        }
                                                    } else {
                                                        res.redirect("/mobile/payment/recharge/failure");
                                                    }
                                                }
                                            })
                                        }
                                    })
                                }
                            }
                        })
                    }
                } else {
                    res.redirect("/mobile/payment/recharge/failure");
                }
            } else {
                res.redirect("/mobile/payment/recharge/failure");
            }
        });
    }

    controller.paypalRecharge = function (req, res) {
        req.checkBody('driver_id', 'driver id is required').notEmpty();
        req.checkBody('amount', 'amount is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            console.log('errors[0].msg', errors[0].msg)
            res.send({ "status": 0, "errors": errors[0].msg });
            return;
        }
        req.sanitizeBody('driver_id').trim();
        req.sanitizeBody('amount').trim();
        var data = {};
        data.driver_id = req.body.driver_id;
        data.amount = req.body.amount;
        data.notes = req.body.note;
        data.status = '1';
        db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
            if (err || !paymentgateway) {
                res.send({ "status": "0", "errors": 'Invalid payment method, Please contact the website administrator..!' });
            } else {
                db.GetOneDocument('drivers', { _id: data.driver_id, status: { $eq: 1 } }, {}, {}, function (err, driver) {
                    if (err || !driver) {
                        res.send({ "status": 0, "errors": 'Error in driver..!' });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err) {
                                res.send({ "status": 0, "errors": 'Error in settings' });
                            }
                            else {
                                var temp_payment = {
                                    order: data,
                                    created_time: Date.now()
                                }
                                db.InsertDocument('temp_payment', temp_payment, function (err, orderdata) {
                                    if (err || orderdata.nModified == 0) {
                                        res.send({ "status": 0, "errors": 'Error in order..!' });
                                    } else {
                                        data.payment_id = orderdata._id;
                                        data.type = 'recharge';
                                        data.pay_total = req.body.amount || 0;
                                        data.currency_code = settings.settings.currency_code
                                        data.site_title = settings.settings.site_title
                                        paypal.createRecharge(req, res, data, function (result) {
                                            if (typeof result.response != 'undefined' && (result.response.name == 'VALIDATION_ERROR' || result.response.error)) {
                                                res.send({ "status": 0, "errors": '', result: result });
                                            } else {
                                                res.send({ "status": 1, "errors": '', result: result });
                                            }
                                        })
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }

    controller.retrive = function (req, res) {
        var data = {};
        data.status = '0';
        var errors = [];

        req.checkBody('user_id', 'user_id is Required').notEmpty();
        var request = {};
        request.user_id = req.body.user_id;
        db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
            if (err || !user) {
                res.send({ "status": 0, "errors": 'Error in user..!' });
            }
            else {
                var details = [];
                if (user.card_details) {
                    for (var i = user.card_details.length - 1; i >= 0; i--) {
                        details.push({
                            'customer_id': user.card_details[i].customer_id,
                            'card_no': user.card_details[i].card_no,
                            'exp_month': user.card_details[i].exp_month,
                            'exp_year': user.card_details[i].exp_year,
                            'brand': user.card_details[i].brand,
                        })
                    }
                }
                response = {};
                response.status = '1';
                response.card_details = details;
                res.send(response)
            }
        });
    }
    controller.CODPayment = async function (req, res) {
        // req.checkBody('user_id', 'user id is required').notEmpty();
        // req.checkBody('_id', 'cart id is required').notEmpty();
        // req.checkBody('cart_details', 'food is required').notEmpty();
        // req.checkBody('city_id', 'city_id id is required').notEmpty();
        // req.checkBody('total', 'total is required').notEmpty();
        // req.checkBody('pay_total', 'pay_total is required').notEmpty();
        // req.checkBody('service_tax', 'service tax is required').notEmpty();
        // req.checkBody('offer_price', 'offer discount is required').optional();
        // req.checkBody('coupon_price', 'coupon discount is required').optional();
        // req.checkBody('coupon_code', 'coupon code id is required').optional();
        // req.checkBody('coupon_discount', 'coupon discount id is required').optional();
        // req.checkBody('food_offer_price', 'food offer price id is required').optional();
        // req.checkBody('package_charge', 'package charge id is required').optional();
        // req.checkBody('delivery_charge', 'delivery charge is required').optional();
        // // req.checkBody('night_fare', 'night fare is required').optional();
        // // req.checkBody('surge_fare', 'sugar fare is required').optional();
        // req.checkBody('delivery_address.line1', 'delivery address is required').notEmpty();
        // req.checkBody('delivery_address.choose_location', 'address type is required').notEmpty();
        // req.checkBody('delivery_address.loc.lng', 'longitude is required').notEmpty();
        // req.checkBody('delivery_address.loc.lat', 'latitude is required').notEmpty();
        // req.checkBody('delivery_address.street', 'street is required').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     // console.log('errors[0].msg', errors[0].msg)
        //     res.send({ "status": 0, "errors": errors[0].msg });
        //     return;
        // }
        // req.sanitizeBody('transaction_id').trim();
        // req.sanitizeBody('user_id').trim();
        // req.sanitizeBody('city_id').trim();
        // req.sanitizeBody('quantity').trim();
        // req.sanitizeBody('individual_total').trim();
        // req.sanitizeBody('total').trim();
        // req.sanitizeBody('discount').trim();
        // req.sanitizeBody('coupon_code').trim();
        // req.sanitizeBody('delivery_charge').trim();
        // req.sanitizeBody('surge_fare').trim();
        // req.sanitizeBody('night_fare').trim();
        // req.sanitizeBody('address_type').trim();
        // req.sanitizeBody('longitude').trim();
        // req.sanitizeBody('latitude').trim();
        var data = {};
        data.transaction_id = req.body.transaction_id;
        data.cart_id = req.body._id;
        data.user_id = req.body.user_id;
        data.city_id = req.body.city_id;
        if (req.body.cart_details) {
            if (req.body.cart_details.length > 0) {
                var food = [];
                for (var i = 0; i < req.body.cart_details.length; i++) {
                    var products = req.body.cart_details[i];
                    const productChecks = await db.GetOneDocument('food', { _id: products.id }, {}, {})
                    const sku =  await db.GetOneDocument('food', { _id: products.id }, { price_details: 1 }, {});

                    if (sku.doc && sku.doc.price_details) {
                        // Find the matching SKU
                        const matchingItem = sku.doc.price_details.find(item => 
                            item.mprice === products.mprice && item.sprice === products.psprice
                        );
                        
                        if (matchingItem) {
                            console.log(matchingItem.sku,"sku...................................."); // Output: "INRPF240"
                        } else {
                            console.log("No matching SKU found.");
                        }
                    } else {
                        console.log("Product not found or no price details available.");
                    }
                
                    const currentDate = new Date();
                    const returnProductDayss = productChecks.doc.return_days;
                    const returnDates = new Date(currentDate);
                    returnDates.setDate(returnDates.getDate() + returnProductDayss);
                    // console.log(products,'this is are the products++++++++++++++++++++++');

                    // result = products.price_details.find(function (itm) {
                    //     return itm._id == products.varntid;
                    // });

                    // {
                    //     name: 'Water',
                    //     image: 'uploads/images/food/1701496909609.png',
                    //     id: '656ac84dd8fc6cdb915bc11d',
                    //     product_size: [],
                    //     cart_id: '657aadf31335e21e7940c045',
                    //     offer: 0,
                    //     offer_status: 0,
                    //     quantity_size: [],
                    //     size_status: 1,
                    //     in_size: 0,
                    //     no_size: 0,
                    //     is_offer_available: 0,
                    //     offer_price: 0,
                    //     price: 15,
                    //     offsale: 0,
                    //     offbase: 15,
                    //     mprice: 20,
                    //     slug: 'Water',
                    //     status: 1,
                    //     quantity: 7,
                    //     total: 105,
                    //     mtotal: 140,
                    //     variations: [ 'L' ]
                    //   } this is are the products++++++++++++++++++++++


                    if (products) {
                        var obj = {
                            id: products.id,
                            rcat_id: products.rcat_id,
                            scat_id: products.scat_id,
                            name: products.name,
                            price: products.price,
                            mprice: products.mprice,
                            psprice: products.psprice,
                            net_quantity: products.quantity,
                            // units: result.unit,
                            quantity: products.quantity,
                            slug: products.slug,
                            offer_price: products.total,
                            varntid: products.varntid,
                            variation: products.variations,
                            size_status: products.size_status,
                            image: products.image,
                            variations: products.variations,
                            return_days: returnDates,
                            size: products.size,
                            offer: products.offer,
                            sku:matchingItem.sku || ""
                        }

                        let rating = await db.GetDocument('ratings', { user: data.user_id, product_id: products.id }, {}, {})

                        let getFoodData = await db.GetDocument('food', { _id: products.id }, {}, {})

                        //   if(getFoodData && getFoodData.doc && getFoodData.doc.length > 0){
                        //     obj.return_days = getFoodData.doc[0].return_days
                        //     // obj.base_price = getFoodData.doc[0].base_price
                        //     // obj.sale_price = getFoodData.doc[0].sale_price
                        //     // obj.offer_amount = getFoodData.doc[0].offer_amount
                        //     // obj.offer_status = getFoodData.doc[0].offer_status
                        //     // obj.size_status = getFoodData.doc[0].size_status
                        //     // obj.price_details = getFoodData.doc[0].price_details

                        //   }






                        if (rating && rating.doc && rating.doc.length > 0) {

                            obj.rating_user = true
                            obj.rating_id = rating.doc[0].id
                            obj.rating = rating.doc[0].rating


                        }






                        food.push(obj);


                    }
                }
            }
        }
        // console.log(food, 'this is food +++++==============+++++++++============++++++++=======');
        data.foods = food;
        req.body.cart_details = food;
        data.coupon_code = req.body.coupon_code;
        data.schedule_date = req.body.schedule_date;
        data.schedule_time_slot = req.body.schedule_time_slot;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address.fulladres;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.loc = req.body.delivery_address.loc;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.city;
        data.delivery_address.name = req.body.delivery_address.name;
        data.delivery_address.number = req.body.delivery_address.phone.number;

        data.location = {};
        // data.location.lng = req.body.delivery_address.loc.lng ? req.body.delivery_address.loc.lng : '';  //if incase use lat lang enable this key and line 
        // data.location.lat = req.body.delivery_address.loc.lat ? req.body.delivery_address.loc.lat : '';
        data.status = '1';
        // db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
        //     if (err || !rest) {
        //         res.send({ "status": 0, "errors": 'Error in city..!' });
        //     } else {

        const user = await db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {})
        if (!user) {
            res.send({ "status": 0, "errors": 'Error in user..!' });
        } else {

            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            if (settings.status == false) {
                res.send({ "status": 0, "errors": 'Error in settings..!' });
            } else {
                const cart_details = await db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {})
                if (cart_details.status == false) {
                    if (req.body.buyNow) {
                        var transaction_data = {};
                        transaction_data.user = data.user_id;
                        transaction_data.city_id = data.city_id;
                        transaction_data.schedule_type = req.body.schedule_type;
                        transaction_data.amount = data.pay_total;
                        transaction_data.mode = 'charge';
                        transaction_data.type = 'COD';
                        const transdata = await db.InsertDocument('transaction', transaction_data)
                        // console.log(transaction_data, 'this is the transaction dataaaaa');
                        if (!transdata) {
                            res.send({ "status": 0, "errors": 'Error in transaction' });
                        } else {
                            req.body.transaction_id = transdata._id;
                            events.emit('OrderUpdate', req, function (err, result) {
                                if (err) {
                                    // res.send({ "status": 0, "errors": err });
                                } else {
                                    try {
                                        io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                                        res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });

                                        // events.emit('updateQuantity', req, function (err, result) { });
                                        try {
                                            events.emit('updateQuantity', req, res);

                                        } catch (e) {
                                            console.log("error at line 4132", e)
                                        }
                                    } catch (e) {
                                        console.log("error at line 5130 codPayment Api's event emitter ", e)
                                    }

                                }



                            });

                            // events.emit('updateQuantity', req, (err, res) => {
                            //     if (err) {
                            //         console.log("event comming error")
                            //     } else {
                            //         console.log("eventcomming perfectly")
                            //     }
                            // })
                        }
                    } else {
                        res.send({ "status": 0, "errors": 'Error in cart..! 1' });
                    }
                } else {
                    if (cart_details && typeof cart_details.doc._id != 'undefined') {


                        var transaction_data = {};
                        transaction_data.user = data.user_id;
                        transaction_data.city_id = data.city_id;
                        transaction_data.schedule_type = req.body.schedule_type;
                        transaction_data.amount = data.pay_total;
                        transaction_data.mode = 'charge';
                        if (req.body.pay_total == 0) {
                            transaction_data.type = 'coupon zero cost';
                        } else {
                            transaction_data.type = 'COD';
                        }
                        const transdata = await db.InsertDocument('transaction', transaction_data)
                        // console.log(transaction_data, 'this is the transaction dataaaaa');
                        if (!transdata) {
                            res.send({ "status": 0, "errors": 'Error in transaction' });
                        } else {
                            req.body.transaction_id = transdata._id;
                            console.log("I think this is here right now________----------------____________");
                            events.emit('OrderUpdate', req, function (err, result) {
                                if (err) {
                                    console.log(err)
                                    // res.send({ "status": 0, "errors": err });
                                } else {
                                    io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })

                                    res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });

                                    try {
                                        events.emit('updateQuantity', req, res);

                                    } catch (e) {
                                        console.log("error at line 5191", e)
                                    }


                                    // console.log()
                                    // cart_details.doc.cart_details.forEach(x => {
                                    //     console.log(x)
                                    // })






                                }
                            });



                        }
                        // db.InsertDocument('transaction', transaction_data, function (err, transdata) {
                        //     if (err || transdata.nModified == 0) {
                        //         res.send({ "status": 0, "errors": 'Error in transaction' });
                        //     } else {
                        //         req.body.transaction_id = transdata._id;
                        //         events.emit('OrderUpdate', req, function (err, result) {
                        //             if (err) {
                        //                 res.send({ "status": 0, "errors": err });
                        //             } else {
                        //                 io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                        //                 res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                        //             }
                        //         });
                        //     }
                        // });
                    } else {
                        res.send({ "status": 0, "errors": 'Error in cart..! 2' });
                    }
                }
                // db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
                //     if (err || !cart_details) {
                //         res.send({ "status": 0, "errors": 'Error in cart..!' });
                //     } else {
                //         if (cart_details && typeof cart_details._id != 'undefined') {
                //             var transaction_data = {};
                //             transaction_data.user = data.user_id;
                //             transaction_data.city_id = data.city_id;
                //             transaction_data.schedule_type = req.body.schedule_type;
                //             transaction_data.amount = data.pay_total;
                //             transaction_data.mode = 'charge';
                //             transaction_data.type = 'COD';
                //             db.InsertDocument('transaction', transaction_data, function (err, transdata) {
                //                 if (err || transdata.nModified == 0) {
                //                     res.send({ "status": 0, "errors": 'Error in transaction' });
                //                 } else {
                //                     req.body.transaction_id = transdata._id;
                //                     events.emit('OrderUpdate', req, function (err, result) {
                //                         if (err) {
                //                             res.send({ "status": 0, "errors": err });
                //                         } else {
                //                             io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                //                             res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                //                         }
                //                     });
                //                 }
                //             });
                //         } else {
                //             res.send({ "status": 0, "errors": 'Error in cart..!' });
                //         }
                //     }
                // })
            }
            // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            //     if (err) {
            //         res.send({ "status": 0, "errors": 'Error in settings..!' });
            //     } else {
            //         db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
            //             if (err || !cart_details) {
            //                 res.send({ "status": 0, "errors": 'Error in cart..!' });
            //             } else {
            //                 if (cart_details && typeof cart_details._id != 'undefined') {
            //                     var transaction_data = {};
            //                     transaction_data.user = data.user_id;
            //                     transaction_data.city_id = data.city_id;
            //                     transaction_data.schedule_type = req.body.schedule_type;
            //                     transaction_data.amount = data.pay_total;
            //                     transaction_data.mode = 'charge';
            //                     transaction_data.type = 'COD';
            //                     db.InsertDocument('transaction', transaction_data, function (err, transdata) {
            //                         if (err || transdata.nModified == 0) {
            //                             res.send({ "status": 0, "errors": 'Error in transaction' });
            //                         } else {
            //                             req.body.transaction_id = transdata._id;
            //                             events.emit('OrderUpdate', req, function (err, result) {
            //                                 if (err) {
            //                                     res.send({ "status": 0, "errors": err });
            //                                 } else {
            //                                     io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
            //                                     res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
            //                                 }
            //                             });
            //                         }
            //                     });
            //                 } else {
            //                     res.send({ "status": 0, "errors": 'Error in cart..!' });
            //                 }
            //             }
            //         })
            //     }
            // });
        }
        // db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
        //     if (err || !user) {
        //         res.send({ "status": 0, "errors": 'Error in user..!' });
        //     } else {
        //         db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        //             if (err) {
        //                 res.send({ "status": 0, "errors": 'Error in settings..!' });
        //             } else {
        //                 db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
        //                     if (err || !cart_details) {
        //                         res.send({ "status": 0, "errors": 'Error in cart..!' });
        //                     } else {
        //                         if (cart_details && typeof cart_details._id != 'undefined') {
        //                             var transaction_data = {};
        //                             transaction_data.user = data.user_id;
        //                             transaction_data.city_id = data.city_id;
        //                             transaction_data.schedule_type = req.body.schedule_type;
        //                             transaction_data.amount = data.pay_total;
        //                             transaction_data.mode = 'charge';
        //                             transaction_data.type = 'COD';
        //                             db.InsertDocument('transaction', transaction_data, function (err, transdata) {
        //                                 if (err || transdata.nModified == 0) {
        //                                     res.send({ "status": 0, "errors": 'Error in transaction' });
        //                                 } else {
        //                                     req.body.transaction_id = transdata._id;
        //                                     events.emit('OrderUpdate', req, function (err, result) {
        //                                         if (err) {
        //                                             res.send({ "status": 0, "errors": err });
        //                                         } else {
        //                                             io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
        //                                             res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
        //                                         }
        //                                     });
        //                                 }
        //                             });
        //                         } else {
        //                             res.send({ "status": 0, "errors": 'Error in cart..!' });
        //                         }
        //                     }
        //                 })
        //             }
        //         });
        //     }
        // });
        // }
        // });
    }
    controller.createtempOrdersNew = async (req, res) => {
        console.log("data you are looking for is printed here");
        console.log(req.body)
        var data = {};
        // req.checkBody('user_id', 'user_id is required').notEmpty();
        // req.checkBody('cart_details', 'cart_details is required').notEmpty();
        // req.checkBody('total', 'total is required').notEmpty();
        // req.checkBody('email', 'email is required').notEmpty();
        // req.checkBody('pay_total', 'pay_total is required').notEmpty();
        // req.checkBody('service_tax', 'service_tax is required').optional();
        // req.checkBody('food_offer_price', 'food_offer_price is required').optional();
        // req.checkBody('delivery_address.line1', 'delivery_address is required').notEmpty();
        // req.checkBody('delivery_address.choose_location', 'address_type is required').optional();
        // req.checkBody('delivery_address.loc.lng', 'longitude is required').optional();
        // req.checkBody('delivery_address.loc.lat', 'latitude is required').optional();
        // req.checkBody('delivery_address.street', 'street is required').optional();

        // var errors = req.validationErrors();
        // if (errors) {
        //     console.log("errors", errors)
        //     res.send({ "status": "0", "errors": errors[0].msg });
        //     return;
        // }
        console.log(req.body, 'whole request body=55555555555555555%%%%%%%%%%%%%%%%%%%%%%%%%%');
        console.log("delivery_address", req.body.delivery_address)

        // req.sanitizeBody('transaction_id').trim();
        // req.sanitizeBody('user_id').trim();
        // req.sanitizeBody('total').trim();
        // req.sanitizeBody('coupon_code').trim();
        // req.sanitizeBody('delivery_charge').trim();

        data.transaction_id = req.body.transaction_id;
        data.user_id = req.body.user_id;
        data.email = req.body.email;
        data.cityDetails = req.body.cityDetails;
        if (req.body.cart_details) {
            if (req.body.cart_details.length > 0) {
                var food = [];
                for (var i = 0; i < req.body.cart_details.length; i++) {
                    var products = req.body.cart_details[i];
                    const productChecks = await db.GetOneDocument('food', { _id: products.id }, {}, {})
                    const currentDate = new Date();
                    const returnProductDayss = productChecks.doc.return_days;
                    const returnDates = new Date(currentDate);
                    returnDates.setDate(returnDates.getDate() + returnProductDayss);
                    var obj = {
                        id: products.id,
                        rcat_id: products.rcat_id,
                        scat_id: products.scat_id,
                        name: products.name,
                        price: products.price,
                        mprice: products.mprice,
                        psprice: products.psprice,
                        net_quantity: products.quantity,
                        // units: result.unit,
                        quantity: products.quantity,
                        slug: products.slug,
                        offer_price: products.total,
                        varntid: products.varntid,
                        variation: products.variations,
                        size_status: products.size_status,
                        image: products.image,
                        variations: products.variations,
                        return_days: returnDates,
                        size: products.size,
                        offer: products.offer,
                    }

                    let getFoodData = await db.GetDocument('food', { _id: products.id }, {}, {})

                    // if(getFoodData && getFoodData.doc && getFoodData.doc.length > 0){
                    //   obj.return_days = getFoodData.doc[0].return_days
                    // }

                    food.push(obj);
                }
            }

        }
        data.foods = food;
        data.cart_id = req.body._id;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address.fulladres;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.street;
        data.delivery_address.city = req.body.delivery_address.city;
        data.delivery_address.zipcode = req.body.delivery_address.zipcode;
        data.delivery_address.name = req.body.delivery_address.name;
        data.schedule_date = req.body.schedule_date;
        data.schedule_time_slot = req.body.schedule_time_slot;
        data.delivery_address.phone = req.body.delivery_address.phone.code + req.body.delivery_address.phone.number;
        data.location = {};
        if (req.body.delivery_address && req.body.delivery_address.loc) {
            data.delivery_address.loc = req.body.delivery_address.loc;
            data.location.lng = req.body.delivery_address.loc.lng;
            data.location.lat = req.body.delivery_address.loc.lat;
        }
        data.status = 1;

        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        console.log(settings, "this is the setting data");
        if (settings.status === false) {
            return res.send({ status: 0, message: "Something went wrong please try again" });
        } else {

            const user = await db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {})
            // console.log(user,"this is the userdata");
            if (user.status === false) {
                return res.send({ status: 0, message: 'Error in user' });
            } else {
                if (data.type && data.type == 'bynow') {
                    console.log("going insdie this");
                    var billings = {};
                    billings.amount = {};
                    billings.amount.total = parseFloat(parseFloat(req.body.total).toFixed(2));
                    billings.amount.offer_discount = req.body.offer_price || 0;
                    billings.amount.food_offer_price = req.body.food_offer_price || 0;
                    billings.amount.grand_total = parseFloat(parseFloat(req.body.pay_total).toFixed(2)) || 0;
                    if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
                        data.order_id = settings.doc.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                    } else {
                        data.order_id = req.body.order_id;
                    }
                    data.created_time = Date.now();
                    data.cart_details = req.body.cart_details;
                    let collection = 'temporders';
                    if (billings.amount.grand_total <= 0) {
                        collection = 'orders';
                    }
                    var txn_data = {};
                    txn_data.user = data.user_id;
                    txn_data.amount = req.body.pay_total;
                    txn_data.type = 'mips';
                    if (billings.amount.grand_total <= 0) {
                        txn_data.type = 'nopayment';
                    }
                    txn_data.mode = 'charge';
                    const transdata = await db.InsertDocument('transaction', txn_data)
                    if (!transdata) {
                        return res.send({ status: 0, message: 'Error in transaction' });
                    } else {
                        var transactionsData = [{ 'gateway_response': {} }];
                        const transaction = await db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {})
                        if (transaction.status === false) {
                            return res.send({ status: 0, message: 'Error in transaction' });
                        } else {
                            data.transaction_id = transdata._id;
                            const orderdata = await db.InsertDocument(collection, data)
                            if (orderdata.nModified === 0) {
                                return res.send({ status: 0, message: 'Error in transaction' });
                            } else {
                                data.transaction_id = transdata._id;
                                const orderdata = await db.InsertDocument(collection, data)
                                if (orderdata.nModified == 0) {

                                } else {
                                    var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                                    const response = await db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {})
                                    if (response.nModified == 0) {
                                        return res.send({ status: 0, message: 'Error in order' });
                                    } else {
                                        if (billings.amount.grand_total <= 0) {
                                            await db.DeleteDocument('cart', { 'user_id': data.user_id })
                                            res.redirect("/payment-success");
                                        } else {
                                            console.log(orderdata, 'this is order data');
                                            // return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                                        }
                                    }
                                    // db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                    //     if (err || response.nModified == 0) {
                                    //         return res.send({ status: 0, message: 'Error in order' });
                                    //     } else{
                                    //         if (billings.amount.grand_total <= 0) {
                                    //             db.DeleteDocument('cart', { 'user_id': data.user_id}, function (err, res) { });
                                    //             res.redirect("/payment-success");
                                    //         } else{
                                    //             return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                                    //         }
                                    //     }
                                    // })
                                }
                                // db.InsertDocument(collection, data, function (err, orderdata) {
                                //     if (err || orderdata.nModified == 0) {
                                //         return res.send({ status: 0, message: 'Error in order' });
                                //     } else {
                                //         var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                                //         db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                //             if (err || response.nModified == 0) {
                                //                 return res.send({ status: 0, message: 'Error in order' });
                                //             } else{
                                //                 if (billings.amount.grand_total <= 0) {
                                //                     db.DeleteDocument('cart', { 'user_id': data.user_id}, function (err, res) { });
                                //                     res.redirect("/payment-success");
                                //                 } else{
                                //                     return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                                //                 }
                                //             }
                                //         })
                                //     }
                                // })
                            }
                        }
                    }

                    // db.InsertDocument('transaction', txn_data, function (err, transdata) {
                    //     if (err || transdata.nModified == 0) {
                    //         return res.send({ status: 0, message: 'Error in transaction' });
                    //     } else {
                    //         var transactionsData = [{ 'gateway_response': {} }];
                    //         db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                    //             if (err || transaction.nModified == 0) {
                    //                 return res.send({ status: 0, message: 'Error in transaction' });
                    //             } else {
                    //                 data.transaction_id = transdata._id;
                    //                 db.InsertDocument(collection, data, function (err, orderdata) {
                    //                     if (err || orderdata.nModified == 0) {
                    //                         return res.send({ status: 0, message: 'Error in order' });
                    //                     } else {
                    //                         var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                    //                         db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                    //                             if (err || response.nModified == 0) {
                    //                                 return res.send({ status: 0, message: 'Error in order' });
                    //                             } else{
                    //                                 if (billings.amount.grand_total <= 0) {
                    //                                     db.DeleteDocument('cart', { 'user_id': data.user_id}, function (err, res) { });
                    //                                     res.redirect("/payment-success");
                    //                                 } else{
                    //                                     return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                    //                                 }
                    //                             }
                    //                         })
                    //                     }
                    //                 })
                    //             }
                    //         })
                    //     }
                    // })
                } else {
                    const cart_details = await db.GetOneDocument('cart', { '_id': data.cart_id, 'user_id': data.user_id }, {}, {})
                    if (cart_details.status === false) {
                        return res.send({ status: 0, message: 'Error in cart..!' });
                    } else {
                        if (cart_details.doc && typeof cart_details.doc._id != 'undefined') {
                            var billings = {};
                            billings.amount = {};
                            billings.amount.total = parseFloat(parseFloat(req.body.total).toFixed(2));
                            billings.amount.offer_discount = req.body.offer_price || 0;
                            billings.amount.food_offer_price = req.body.food_offer_price || 0;
                            billings.amount.grand_total = parseFloat(parseFloat(req.body.pay_total).toFixed(2)) || 0;
                            if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
                                data.order_id = settings.doc.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                            } else {
                                data.order_id = req.body.order_id;
                            }
                            data.created_time = Date.now();
                            data.cart_details = cart_details;
                            let collection = 'temporders';
                            if (billings.amount.grand_total <= 0) {
                                collection = 'orders';
                            }
                            var txn_data = {};
                            txn_data.user = data.user_id;
                            txn_data.amount = req.body.pay_total;


                            // console.log("razorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpay")

                            //                         console.log(req.body.paymenttype)

                            //                          console.log("razorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpayrazorpay")
                            if (req.body.paymenttype == "Razorpay") {
                                txn_data.type = "razorpay"
                            } else if (req.body.paymenttype == "Stripe") {
                                txn_data.type = "stripe"
                            }
                            else {
                                txn_data.type = 'online';
                            }
                            if (billings.amount.grand_total <= 0) {
                                txn_data.type = 'nopayment';
                            }
                            txn_data.mode = 'charge';
                            const transdata = await db.InsertDocument('transaction', txn_data)
                            if (transdata.nModified == 0) {
                                return res.send({ status: 0, message: 'Error in transaction' });
                            } else {
                                var transactionsData = [{ 'gateway_response': {} }];
                                const transaction = await db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {})
                                if (transaction.doc.nModified == 0) {
                                    return res.send({ status: 0, message: 'Error in transaction' });
                                } else {
                                    data.transaction_id = transdata._id;
                                    const orderdata = await db.InsertDocument(collection, data)
                                    if (orderdata.nModified == 0) {
                                        return res.send({ status: 0, message: 'Error in order' });
                                    } else {
                                        var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                                        const response = await db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {})
                                        if (response.doc.nModified == 0) {
                                            return res.send({ status: 0, message: 'Error in order' });
                                        } else {
                                            if (billings.amount.grand_total <= 0) {
                                                await db.DeleteDocument('cart', { 'user_id': data.user_id })
                                                // db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                                                res.redirect("/payment-success");
                                            } else {

                                                // console.log(orderdata, 'this are order data++++++++++++++++++++++++++');
                                                if (req.body.paymenttype == "Razorpay") {
                                                    const amounttopay = req.body.pay_total
                                                    let razorpaydata = await razorpay.createOrder(orderdata, amounttopay)
                                                    let data = await db.GetOneDocument("paymentgateway", { status: { $ne: 0 }, alias: 'Razorpay' }, {}, {})
                                                    razorpaydata.secretkey = data.doc.settings.secret
                                                    razorpaydata.secretId = data.doc.settings.id
                                                    const response = await db.UpdateDocument(collection, { '_id': orderdata._id }, { razorpayorderid: razorpaydata.id }, {})
                                                    return res.send({ status: 1, message: "Razorpay order created", res: razorpaydata })

                                                } else if (req.body.paymenttype === "Stripe") {
                                                    res.send({ data: orderdata, status: 1, error: false, message: "stripe", orderid: orderdata.order_id })
                                                } else {

                                                    let cash = await cashfree.create(orderdata)
                                                    console.log(cash, 'cash this is cash');
                                                    return res.send({ status: 1, message: 'Order created', res: cash });
                                                }
                                            }
                                        }
                                        // db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                        //     if (err || response.nModified == 0) {
                                        //         return res.send({ status: 0, message: 'Error in order' });
                                        //     } else {
                                        //         if (billings.amount.grand_total <= 0) {
                                        //             db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                                        //             res.redirect("/payment-success");
                                        //         } else {
                                        //             return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                                        //         }
                                        //     }
                                        // })
                                    }
                                    // db.InsertDocument(collection, data, function (err, orderdata) {
                                    //     if (err || orderdata.nModified == 0) {
                                    //         return res.send({ status: 0, message: 'Error in order' });
                                    //     } else {
                                    //         var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                                    //         db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                    //             if (err || response.nModified == 0) {
                                    //                 return res.send({ status: 0, message: 'Error in order' });
                                    //             } else {
                                    //                 if (billings.amount.grand_total <= 0) {
                                    //                     db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                                    //                     res.redirect("/payment-success");
                                    //                 } else {
                                    //                     return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                                    //                 }
                                    //             }
                                    //         })
                                    //     }
                                    // })
                                }
                                // db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                //     if (err || transaction.nModified == 0) {
                                //         return res.send({ status: 0, message: 'Error in transaction' });
                                //     } else {
                                //         data.transaction_id = transdata._id;
                                //         db.InsertDocument(collection, data, function (err, orderdata) {
                                //             if (err || orderdata.nModified == 0) {
                                //                 return res.send({ status: 0, message: 'Error in order' });
                                //             } else {
                                //                 var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                                //                 db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                //                     if (err || response.nModified == 0) {
                                //                         return res.send({ status: 0, message: 'Error in order' });
                                //                     } else {
                                //                         if (billings.amount.grand_total <= 0) {
                                //                             db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                                //                             res.redirect("/payment-success");
                                //                         } else {
                                //                             return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                                //                         }
                                //                     }
                                //                 })
                                //             }
                                //         })
                                //     }
                                // })
                            }
                            // db.InsertDocument('transaction', txn_data, function (err, transdata) {
                            //     if (err || transdata.nModified == 0) {
                            //         return res.send({ status: 0, message: 'Error in transaction' });
                            //     } else {
                            //         var transactionsData = [{ 'gateway_response': {} }];
                            //         db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                            //             if (err || transaction.nModified == 0) {
                            //                 return res.send({ status: 0, message: 'Error in transaction' });
                            //             } else {
                            //                 data.transaction_id = transdata._id;
                            //                 db.InsertDocument(collection, data, function (err, orderdata) {
                            //                     if (err || orderdata.nModified == 0) {
                            //                         return res.send({ status: 0, message: 'Error in order' });
                            //                     } else {
                            //                         var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                            //                         db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                            //                             if (err || response.nModified == 0) {
                            //                                 return res.send({ status: 0, message: 'Error in order' });
                            //                             } else {
                            //                                 if (billings.amount.grand_total <= 0) {
                            //                                     db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                            //                                     res.redirect("/payment-success");
                            //                                 } else {
                            //                                     return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                            //                                 }
                            //                             }
                            //                         })
                            //                     }
                            //                 })
                            //             }
                            //         })
                            //     }
                            // })
                        } else {
                            return res.send({ status: 0, message: 'Error in user' });
                        }
                    }
                    // db.GetOneDocument('cart', { '_id': data.cart_id, 'user_id': data.user_id }, {}, {}, function (err, cart_details) {
                    //     if (err || !cart_details) {
                    //         return res.send({ status: 0, message: 'Error in cart..!' });
                    //     } else {
                    //         if (cart_details && typeof cart_details._id != 'undefined') {
                    //             var billings = {};
                    //             billings.amount = {};
                    //             billings.amount.total = parseFloat(parseFloat(req.body.total).toFixed(2));
                    //             billings.amount.offer_discount = req.body.offer_price || 0;
                    //             billings.amount.food_offer_price = req.body.food_offer_price || 0;
                    //             billings.amount.grand_total = parseFloat(parseFloat(req.body.pay_total).toFixed(2)) || 0;
                    //             if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
                    //                 data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                    //             } else {
                    //                 data.order_id = req.body.order_id;
                    //             }
                    //             data.created_time = Date.now();
                    //             data.cart_details = cart_details;
                    //             let collection = 'temporders';
                    //             if (billings.amount.grand_total <= 0) {
                    //                 collection = 'orders';
                    //             }
                    //             var txn_data = {};
                    //             txn_data.user = data.user_id;
                    //             txn_data.amount = req.body.pay_total;
                    //             txn_data.type = 'mips';
                    //             if (billings.amount.grand_total <= 0) {
                    //                 txn_data.type = 'nopayment';
                    //             }
                    //             txn_data.mode = 'charge';
                    //             db.InsertDocument('transaction', txn_data, function (err, transdata) {
                    //                 if (err || transdata.nModified == 0) {
                    //                     return res.send({ status: 0, message: 'Error in transaction' });
                    //                 } else {
                    //                     var transactionsData = [{ 'gateway_response': {} }];
                    //                     db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                    //                         if (err || transaction.nModified == 0) {
                    //                             return res.send({ status: 0, message: 'Error in transaction' });
                    //                         } else {
                    //                             data.transaction_id = transdata._id;
                    //                             db.InsertDocument(collection, data, function (err, orderdata) {
                    //                                 if (err || orderdata.nModified == 0) {
                    //                                     return res.send({ status: 0, message: 'Error in order' });
                    //                                 } else {
                    //                                     var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                    //                                     db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                    //                                         if (err || response.nModified == 0) {
                    //                                             return res.send({ status: 0, message: 'Error in order' });
                    //                                         } else {
                    //                                             if (billings.amount.grand_total <= 0) {
                    //                                                 db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                    //                                                 res.redirect("/payment-success");
                    //                                             } else {
                    //                                                 return res.send({ status: 1, message: 'temp order created', orderId: orderdata._id });
                    //                                             }
                    //                                         }
                    //                                     })
                    //                                 }
                    //                             })
                    //                         }
                    //                     })
                    //                 }
                    //             })
                    //         } else {
                    //             return res.send({ status: 0, message: 'Error in user' });
                    //         }
                    //     }
                    // })
                }
            }
        }





    }

    controller.checkPayment = async (req, res) => {
        try {
            // console.log(req.body, 'this is the body');
            if (req.body && req.body.data && req.body.data.paymenttype === "razorpay") {
                const orderid = req.body.data.razorpay_order_id
                let razoprpayorderfetch = await razorpay.fetchOder(orderid)

                if (razoprpayorderfetch.status === "paid") {
                    let data = await db.GetOneDocument("paymentgateway", { status: { $ne: 0 }, alias: 'Razorpay' }, {}, {})
                    let secret = data.doc.settings.secret
                    let hmac = crypto.Hmac("sha256", secret)
                    hmac.update(razoprpayorderfetch.id + "|" + req.body.data.razorpay_payment_id)
                    const generated_signature = hmac.digest('hex');
                    if (generated_signature === req.body.data.razorpay_signature) {
                        let temp_order = await db.GetOneDocument('temporders', { 'razorpayorderid': orderid }, {}, {});
                        console.log("orderinsert", orderid)
                        const clonetemporeder = JSON.parse(JSON.stringify(temp_order.doc))
                        clonetemporeder.razorpaypayment_id = req.body.data.razorpay_payment_id
                        delete clonetemporeder._id //razorpay payment id is added to the orders data for the particular order
                        let orderinsert = await db.InsertDocument('orders', clonetemporeder) //this is used to insert the data to the orders after verification of the razorapy signature
                        // console.log(orderinsert,"order has inseted success fully")

                        let removecart = await db.DeleteDocument('cart', { 'user_id': temp_order.doc.user_id })//this is used to remove data from the cart
                        let deletedtemporder = await db.DeleteDocument("temporders", { 'razorpayorderid': orderid }, {})//this is used to remove data form temporders that we created initally

                        console.log(deletedtemporder, "deletedtemporder")

                        io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                        res.status(200).send({ message: "oder placed successfully", status: 1, error: false, data: razoprpayorderfetch })//response is sentback to the front for after verifcation of the payment in razorpay
                    } else {
                        res.send({ message: "razorpay signature verification failed", status: 0, error: true, data: razoprpayorderfetch })
                    }


                } else {
                    res.send({ message: "razorpay payement is not done", status: 0, error: true, data: razoprpayorderfetch })
                }

            } else {

                const id = req.body.id
                let cash = await cashfree.fetchPayment(id)
                console.log(cash, 'cash this is cash');
                if (cash[0].payment_status == "SUCCESS") {

                    const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
                    if (settings.status == false) {
                        res.send({ "status": 0, "errors": 'Error in settings..!' });
                    } else {
                        // const cart_details = await db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {})
                        // if (cart_details.status == false) {
                        // if (req.body.buyNow) {
                        //     var transaction_data = {};
                        //     transaction_data.user = data.user_id;
                        //     transaction_data.city_id = data.city_id;
                        //     transaction_data.schedule_type = req.body.schedule_type;
                        //     transaction_data.amount = data.pay_total;
                        //     transaction_data.mode = 'charge';
                        //     transaction_data.type = 'COD';
                        //     const transdata = await db.InsertDocument('transaction', transaction_data)
                        //     console.log(transaction_data, 'this is the transaction dataaaaa');
                        //     if (!transdata) {
                        //         res.send({ "status": 0, "errors": 'Error in transaction' });
                        //     } else {
                        //         req.body.transaction_id = transdata._id;
                        //         events.emit('OrderUpdate', req, function (err, result) {
                        //             if (err) {
                        //                 // res.send({ "status": 0, "errors": err });
                        //             } else {
                        //                 io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                        //                 res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                        //             }
                        //         });
                        //     }
                        // } else {
                        //     res.send({ "status": 0, "errors": 'Error in cart..! 1' });
                        // }
                        // } else {

                        let temp_order = await db.GetOneDocument('temporders', { 'order_id': cash[0].order_id }, {}, {})
                        console.log(temp_order, 'this is temp order++++++++++++++++');
                        let orders = {}
                        orders.billings = temp_order.doc.billings
                        orders.order_history = temp_order.doc.order_history
                        orders.wallet_payment_details = temp_order.doc.wallet_payment_details;
                        orders.order_id = temp_order.doc.order_id
                        orders.user_id = temp_order.doc.user_id
                        orders.transaction_id = temp_order.doc.transaction_id;
                        orders.email = temp_order.doc.email;
                        orders.foods = temp_order.doc.foods;
                        orders.delivery_address = temp_order.doc.delivery_address;
                        orders.schedule_date = temp_order.doc.schedule_date;
                        orders.schedule_time_slot = temp_order.doc.schedule_time_slot;
                        orders.status = temp_order.doc.status;
                        orders.paid = temp_order.doc.paid;
                        orders.repay = temp_order.doc.repay;
                        orders.cart_details = temp_order.doc.cart_details;
                        orders.pickup_coords = temp_order.doc.pickup_coords;
                        orders.deliver_coords = temp_order.doc.deliver_coords;
                        orders.cancel_drivers = temp_order.doc.cancel_drivers;
                        console.log(orders, 'this is order--------------------------');

                        delete orders._id
                        console.log(orders, 'this is order++++++++++++++++++++++++++');
                        let order = await db.InsertDocument('orders', orders)
                        console.log(order, 'this is order***************************');
                        if (!order) {
                            console.log("error");
                        } else {


                            var updatedoc = { 'order_history.payment_time': new Date() };
                            const response = await db.UpdateDocument('orders', { 'order_id': cash[0].order_id }, updatedoc, {})
                            await db.DeleteDocument('cart', { 'user_id': temp_order.doc.user_id })
                            await db.DeleteDocument('temporders', { 'order_id': cash[0].order_id })
                            io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                            // res.send({ "status": 1, "message": 'Payment success.', "transaction_id": temp_order.doc.transdata_id });
                        }
                        // if (cart_details && typeof cart_details.doc._id != 'undefined') {
                        //     var transaction_data = {};
                        //     transaction_data.user = data.user_id;
                        //     transaction_data.city_id = data.city_id;
                        //     transaction_data.schedule_type = req.body.schedule_type;
                        //     transaction_data.amount = data.pay_total;
                        //     transaction_data.mode = 'charge';
                        //     transaction_data.type = 'COD';
                        //     const transdata = await db.InsertDocument('transaction', transaction_data)
                        //     console.log(transaction_data, 'this is the transaction dataaaaa');
                        //     if (!transdata) {
                        //         res.send({ "status": 0, "errors": 'Error in transaction' });
                        //     } else {
                        //         req.body.transaction_id = transdata._id;
                        //         events.emit('OrderUpdate', req, function (err, result) {
                        //             if (err) {
                        //             } else {
                        //                 io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                        //                 res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                        //             }
                        //         });
                        //     }
                        // } else {
                        //     res.send({ "status": 0, "errors": 'Error in cart..! 2' });
                        // }
                        // }
                        // db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
                        //     if (err || !cart_details) {
                        //         res.send({ "status": 0, "errors": 'Error in cart..!' });
                        //     } else {
                        //         if (cart_details && typeof cart_details._id != 'undefined') {
                        //             var transaction_data = {};
                        //             transaction_data.user = data.user_id;
                        //             transaction_data.city_id = data.city_id;
                        //             transaction_data.schedule_type = req.body.schedule_type;
                        //             transaction_data.amount = data.pay_total;
                        //             transaction_data.mode = 'charge';
                        //             transaction_data.type = 'COD';
                        //             db.InsertDocument('transaction', transaction_data, function (err, transdata) {
                        //                 if (err || transdata.nModified == 0) {
                        //                     res.send({ "status": 0, "errors": 'Error in transaction' });
                        //                 } else {
                        //                     req.body.transaction_id = transdata._id;
                        //                     events.emit('OrderUpdate', req, function (err, result) {
                        //                         if (err) {
                        //                             res.send({ "status": 0, "errors": err });
                        //                         } else {
                        //                             io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                        //                             res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                        //                         }
                        //                     });
                        //                 }
                        //             });
                        //         } else {
                        //             res.send({ "status": 0, "errors": 'Error in cart..!' });
                        //         }
                        //     }
                        // })
                    }
                }
                res.send({ status: true, error: false, data: cash })

            }

        } catch (error) {
            console.log(error);
        }
    }
    controller.getstripedata = async (req, res) => {
        try {
            let data = await db.GetOneDocument("paymentgateway", { alias: "Stripe" }, {}, {})
            res.send(data.doc)
        } catch (error) {
            res.status(500).send({ message: 'somthing went wrong', error: error })
        }
    }

    controller.stripepayment = async (req, res) => {
        try {
            let data = req.body
            // console.log(data);
            let result = await stripeconf.stripecustomercreate(data)
            let chargeid = result.id
            if (result.status == "succeeded") {
                console.log(data, 'datadatadata123');
                console.log(data.data, 'ssssdataa'
                );
                let temporder = await db.GetOneDocument("temporders", { order_id: data.data.orderid }, {}, {})
                let datacloned = JSON.parse(JSON.stringify(temporder.doc))
                datacloned.stripechargeid = chargeid
                delete datacloned._id
                let inserorder = await db.InsertDocument('orders', datacloned)//inset the order after the payment has become success
                let removetemporder = await db.DeleteDocument('temporders', { user_id: temporder.doc.user_id }) //this is used to romove the temporder we have created first  
                let removecart = await db.DeleteDocument('cart', { user_id: temporder.doc.user_id })  //this is used to clear the cart
                io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                res.status(200).send({ error: false, status: 0, message: "oreder has created succussfully" })
            }
        } catch (error) {
            console.log(res)
            res.status(500).send({ message: "payment has failed", error: true, status: 0 })
        }
    }

    controller.stripe_chargewebhook = async (req, res) => {
        try {
            if (req.body.data.object.status === "succeeded") {
                console.log("enter here");
                let data = await db.GetOneDocument("orders", { stripechargeid: req.body.data.object.id }, {}, {})
                let dateString = new Date(data.doc.createdAt).toISOString().slice(0, 10)
                var mailData = {};
                mailData.template = 'Order_Placed_Successfully';
                mailData.to = data.doc.email;
                mailData.html = [];
                mailData.html.push({ name: 'name', value: data.doc.delivery_address.name });
                mailData.html.push({ order_id: 'order_id', value: data.doc.order_id });
                mailData.html.push({ data: 'date', value: dateString })
                mailcontent.sendmail(mailData, function (err, response) { });
                console.log("mail has send")
            }
            res.status(200).send({ message: "webhook response has got" })
        } catch (error) {
            console.log(error)
            res.status(500).send({ message: "server side error", error: error })
        }
    }
    controller.striperefundwebhook = async (req, res) => {
        try {
            // console.log("stripe webhook call for charge");
            // console.log(req.body)
            const chargeid = req.body.data.object.id
            if (req.body && req.body.data && req.body.data.object.status === "succeeded") {
                let data = await db.GetOneDocument("orders", { stripechargeid: chargeid }, {}, {})
                let dateString = new Date(data.doc.createdAt).toISOString().slice(0, 10)
                var mailData = {};
                mailData.template = 'Refund payment';
                mailData.to = data.doc.email;
                mailData.html = [];
                mailData.html.push({ name: 'name', value: data.doc.delivery_address.name });
                mailData.html.push({ order_id: 'order_id', value: data.doc.order_id });
                mailData.html.push({ data: 'date', value: dateString })
                mailcontent.sendmail(mailData, function (err, response) { });
                console.log("mail has send")
                res.status(200).send({ message: "refund is successfull" })
            } else {
                console.log("webhook body is empty")
            }
        } catch (error) {
            // let data=await db.UpdateDocument("orders",{stripechargeid:chargeid},{$set:{status:17}},{})
            console.log(error)
            res.status(500).send({ message: "server side error", error: error })
        }
    }








    // controller.CODPayment = function (req, res) {
    //     req.checkBody('user_id', 'user id is required').notEmpty();
    //     //req.checkBody('_id', 'cart_id is required').notEmpty();
    //     req.checkBody('food', 'food is required').notEmpty();
    //     req.checkBody('city_id', 'city_id is required').notEmpty();
    //     req.checkBody('total', 'total is required').notEmpty();
    //     req.checkBody('grand_total', 'grand_total is required').notEmpty();
    //     req.checkBody('service_tax', 'service tax is required').notEmpty();
    //     req.checkBody('offer_discount', 'offer discount is required').optional();
    //     req.checkBody('coupon_code', 'coupon code id is required').optional();
    //     req.checkBody('coupon_discount', 'coupon discount id is required').optional();
    //     req.checkBody('food_offer_price', 'food offer price id is required').optional();
    //     req.checkBody('schedule_date', 'schedule_date is required').notEmpty();
    //     req.checkBody('schedule_time_slot', 'schedule_time_slot is required').notEmpty();
    //     //req.checkBody('package_charge', 'package charge id is required').optional();
    //     req.checkBody('delivery_amount', 'delivery_amount is required').optional();
    //     //req.checkBody('night_fee', 'night fare is required').optional();
    //     //req.checkBody('surge_fee', 'surge fare is required').optional();
    //     req.checkBody('delivery_address', 'delivery address is required').notEmpty();
    //     req.checkBody('landmark', 'landmark is required').optional();
    //     req.checkBody('flat_no', 'flat_no is required').optional();
    //     req.checkBody('address_type', 'address type is required').notEmpty();
    //     req.checkBody('longitude', 'longitude is required').notEmpty();
    //     req.checkBody('latitude', 'latitude is required').notEmpty();
    //     var errors = req.validationErrors();
    //     if (errors) {
    //         console.log('errors[0].msg', errors[0].msg)
    //         res.send({ "status": 0, "errors": errors[0].msg });
    //         return;
    //     }
    //     req.sanitizeBody('transaction_id').trim();
    //     req.sanitizeBody('user_id').trim();
    //     req.sanitizeBody('city_id').trim();
    //     req.sanitizeBody('quantity').trim();
    //     req.sanitizeBody('individual_total').trim();
    //     req.sanitizeBody('total').trim();
    //     req.sanitizeBody('discount').trim();
    //     req.sanitizeBody('coupon_code').trim();
    //     req.sanitizeBody('delivery_amount').trim();
    //     // req.sanitizeBody('surge_fare').trim();
    //     // req.sanitizeBody('night_fare').trim();
    //     req.sanitizeBody('address_type').trim();
    //     req.sanitizeBody('longitude').trim();
    //     req.sanitizeBody('latitude').trim();
    //     var client_offset = (new Date).getTimezoneOffset();
    //     if (typeof req.body.client_offset != 'undefined') {
    //         client_offset = parseInt(req.body.client_offset);
    //     }
    //     var server_offset = (new Date).getTimezoneOffset();
    //     var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
    //     var data = {};
    //     data.cart_id = req.body._id;
    //     data.user_id = req.body.user_id;
    //     data.city_id = req.body.city_id;
    //     data.foods = req.body.food;
    //     data.coupon_code = req.body.coupon_code;
    //     data.schedule_date = req.body.schedule_date;
    //     data.schedule_time_slot = req.body.schedule_time_slot;
    //     data.delivery_address = {};
    //     data.delivery_address.fulladres = req.body.delivery_address;
    //     data.delivery_address.type = req.body.address_type;
    //     data.delivery_address.street = req.body.flat_no;
    //     data.delivery_address.landmark = req.body.landmark;
    //     data.delivery_address.loc = {};
    //     data.delivery_address.loc.lat = req.body.latitude;
    //     data.delivery_address.loc.lng = req.body.longitude;
    //     data.location = {};
    //     data.location.lng = req.body.longitude;
    //     data.location.lat = req.body.latitude;
    //     data.status = '1';
    //     if (req.body.discount_amount) {
    //         data.refer_offer_price = parseInt(req.body.discount_amount);
    //         data.refer_offer = { expire_date: parseInt(req.body.expire_date), discount_amount: parseInt(req.body.discount_amount), cart_amount: parseInt(req.body.cart_amount) };
    //     }

    //     var date = new Date();
    //     data.schedule_type = req.body.schedule_type;
    //     if (req.body.schedule_type == '1') {
    //         var schedule_time = req.body.schedule_time;
    //         //var schedule_time = '03.30 PM';
    //         var schedule_day = req.body.schedule_day;
    //         var hours = parseInt(schedule_time.slice(0, -6));
    //         var minutes = parseInt(schedule_time.slice(3, -3));
    //         var meridiem = schedule_time.slice(-2);
    //         if ((meridiem == 'PM' || meridiem == 'pm' || meridiem == 'Pm') && hours != 12) {
    //             hours = hours + 12;
    //         }
    //         date.setHours(hours);
    //         date.setMinutes(minutes);
    //         date = new Date(date.getTime() - diff_offset);
    //         date = date.getTime();
    //         var date1 = date;
    //         if (schedule_day == 'tomorrow') {
    //             date = date + (24 * 60 * 60 * 1000);
    //         }
    //         data.schedule_time = date;
    //         data.show_schedule_time = new Date(date);
    //         data.status = '15';
    //     }

    //     db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
    //         if (err || !rest) {
    //             res.send({ "status": 0, "errors": 'Error in city..!' });
    //         }
    //         else {
    //             // if (rest.efp_time && req.body.schedule_type == '1') {
    //             //     data.schedule_time = data.schedule_time - (rest.efp_time * 60 * 1000);
    //             //     data.eta = rest.efp_time * 60 * 1000;
    //             // }
    //             // data.com_type = rest.com_type;
    //             // data.unique_commission = rest.unique_commission;
    //             db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
    //                 if (err || !user) {
    //                     res.send({ "status": 0, "errors": 'Error in user..!' });
    //                 } else {
    //                     db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
    //                         if (err) {
    //                             res.send({ "status": 0, "errors": 'Error in settings' });
    //                         }
    //                         else {
    //                             db.GetOneDocument('cart', { '_id': data.cart_id, 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
    //                                 if (err || !cart_details) {
    //                                     res.send({ "status": 0, "errors": 'Error in cart..!' });
    //                                 } else {
    //                                     if (cart_details && typeof cart_details._id != 'undefined') {
    //                                         var transaction_data = {};
    //                                         transaction_data.user = data.user_id;
    //                                         transaction_data.city_id = data.city_id;
    //                                         transaction_data.amount = data.grand_total;
    //                                         transaction_data.mode = 'charge';
    //                                         transaction_data.type = 'COD';
    //                                         db.InsertDocument('transaction', transaction_data, function (err, transdata) {
    //                                             if (err || transdata.nModified == 0) {
    //                                                 res.send({ "status": 0, "errors": 'Error in transaction' });
    //                                             } else {
    //                                                 data.transaction_id = transdata._id;
    //                                                 data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
    //                                                 data.created_time = Date.now();
    //                                                 if (data.schedule_type == '1') {
    //                                                     data.created_time = data.schedule_time;
    //                                                 }
    //                                                 data.cart_details = cart_details;
    //                                                 /* if(typeof req.body.food_offer_price !=undefined && req.body.food_offer_price > 0 ){
    //                                                     req.body.total = parseFloat(req.body.total) + parseFloat(req.body.food_offer_price)
    //                                                 } */
    //                                                 var billings = {};
    //                                                 billings.amount = {};
    //                                                 billings.amount.total = req.body.total;
    //                                                 billings.amount.coupon_discount = req.body.coupon_discount || 0;
    //                                                 billings.amount.food_offer_price = req.body.food_offer_price || 0;
    //                                                 billings.amount.offer_discount = req.body.offer_discount || 0;
    //                                                 billings.amount.delivery_amount = req.body.delivery_amount || 0;
    //                                                 billings.amount.service_tax = req.body.service_tax || 0;
    //                                                 // billings.amount.night_fee = req.body.night_fee || 0;
    //                                                 // billings.amount.surge_fee = req.body.surge_fee || 0;
    //                                                 billings.amount.grand_total = req.body.grand_total || 0;
    //                                                 billings.amount.package_charge = req.body.package_charge || 0;
    //                                                 data.billings = billings;
    //                                                 db.InsertDocument('orders', data, function (err, orderdata) {
    //                                                     if (err || orderdata.nModified == 0) {
    //                                                         res.send({ "status": 0, "errors": 'Error in order..!' });
    //                                                     } else {
    //                                                         //Hot Selling concept.
    //                                                         var each = require('sync-each');
    //                                                         if (orderdata && typeof orderdata.foods != 'undefined' && orderdata.foods.length > 0) {
    //                                                             each(orderdata.foods,
    //                                                                 function (getMessage, next) {
    //                                                                     db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
    //                                                                         if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {

    //                                                                             if (typeof foodDetails.hotselling != 'undefined') {
    //                                                                                 var count = foodDetails.hotselling + 1;
    //                                                                                 var up_dates = { 'hotselling': count };
    //                                                                                 db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
    //                                                                                 })

    //                                                                             } else {
    //                                                                                 var up_dates = { 'hotselling': 1 };
    //                                                                                 db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
    //                                                                             }
    //                                                                         }
    //                                                                     })
    //                                                                     process.nextTick(next);
    //                                                                 },
    //                                                                 function (err, transformedItems) { }
    //                                                             );
    //                                                         }
    //                                                         var updatedoc = { 'order_history.order_time': new Date() };
    //                                                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
    //                                                             if (err || response.nModified == 0) {
    //                                                                 res.send({ "status": 0, "errors": 'Error in order..!' });
    //                                                             } else {
    //                                                                 var cart_id = data.cart_id;
    //                                                                 db.DeleteDocument('cart', { '_id': new mongoose.Types.ObjectId(cart_id) }, function (err, res) { });
    //                                                                 if (orderdata.coupon_code && orderdata.coupon_code != '') {
    //                                                                     db.GetDocument('coupon', { status: { $ne: 0 }, code: orderdata.coupon_code }, {}, {}, function (err, usagelimit) {
    //                                                                         if (err || !usagelimit || usagelimit.length == 0) {
    //                                                                             res.send({ "status": 0, "errors": 'Sorry error in coupon..!' });
    //                                                                         } else {
    //                                                                             var usagelimits = usagelimit[0].usage.total_coupons;
    //                                                                             var result = usagelimits - 1;
    //                                                                             var use = parseInt(usagelimit[0].used) + parseInt(1);
    //                                                                             if (result <= 0) {
    //                                                                                 result = 0;
    //                                                                             }
    //                                                                             db.UpdateDocument('coupon', { status: { $ne: 0 }, code: orderdata.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
    //                                                                                 if (err || result.nModified == 0) {
    //                                                                                     res.send({ "status": 0, "errors": 'Sorry error in coupon..!' });
    //                                                                                 }
    //                                                                                 else {
    //                                                                                     if (orderdata.schedule_type == 0) {
    //                                                                                         var android_restaurant = orderdata.city_id;
    //                                                                                         var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
    //                                                                                         var response_time = CONFIG.respond_timeout;
    //                                                                                         var action = 'order_request';
    //                                                                                         var options = [orderdata.order_id, android_restaurant, response_time, action];
    //                                                                                         // for (var i = 1; i == 1; i++) {
    //                                                                                         //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //                                                                                         // }
    //                                                                                         var noti_data = {};
    //                                                                                         noti_data.rest_id = orderdata.restaurant_id;
    //                                                                                         noti_data.order_id = orderdata.order_id;
    //                                                                                         noti_data.user_id = orderdata.user_id;
    //                                                                                         noti_data._id = orderdata._id;
    //                                                                                         noti_data.user_name = user.username;
    //                                                                                         noti_data.order_type = 'user';
    //                                                                                         //io.of('/chat').in(orderdata.restaurant_id).emit('restnotify', { restauranId: noti_data });
    //                                                                                         io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
    //                                                                                         io.of('/chat').emit('adminnotify', noti_data);
    //                                                                                         // var order_id = orderdata.order_id;
    //                                                                                         // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
    //                                                                                         // var mail_data = {};
    //                                                                                         // mail_data.user_id = user._id;
    //                                                                                         // mail_data.order_id = orderdata._id;
    //                                                                                         // events.emit('restaurant_new_order', mail_data, function (err, result) { });
    //                                                                                         // var mail_data = {};
    //                                                                                         // mail_data.user_id = user._id;
    //                                                                                         // mail_data.order_id = orderdata._id;
    //                                                                                         // events.emit('neworderto_admin', mail_data, function (err, result) { });
    //                                                                                     }
    //                                                                                     // var mail_data = {};
    //                                                                                     // mail_data.user_id = user._id;
    //                                                                                     // mail_data.order_id = orderdata._id;
    //                                                                                     // events.emit('OrderEmail', mail_data, function (err, result) { });
    //                                                                                     if (req.body.expire_date && req.body.expire_date != null && req.body.expire_date != undefined) {
    //                                                                                         var expires = parseInt(req.body.expire_date);
    //                                                                                         db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { })
    //                                                                                         if (user.initprocess == 'onorder') {
    //                                                                                             var coupondata = {};
    //                                                                                             coupondata.discount_amount = user.initoffer.discount_amount;
    //                                                                                             coupondata.cart_amount = user.initoffer.cart_amount;
    //                                                                                             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
    //                                                                                             console.log('coupon_data', coupondata)
    //                                                                                             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { console.log('22222', err, referrer) });
    //                                                                                             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { console.log('33333333', err, referrer) });
    //                                                                                         }
    //                                                                                     } else if (user.initprocess == 'onorder') {
    //                                                                                         var coupondata = {};
    //                                                                                         coupondata.discount_amount = user.initoffer.discount_amount;
    //                                                                                         coupondata.cart_amount = user.initoffer.cart_amount;
    //                                                                                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
    //                                                                                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
    //                                                                                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
    //                                                                                     }
    //                                                                                     res.send({
    //                                                                                         "status": '1',
    //                                                                                         "response": 'Successfully your order registered',
    //                                                                                         "order_id": orderdata.order_id,
    //                                                                                         "res_loc": rest.location,
    //                                                                                         "user_loc": data.location,
    //                                                                                     });
    //                                                                                 }
    //                                                                             });
    //                                                                         }
    //                                                                     });
    //                                                                 }
    //                                                                 else {
    //                                                                     if (orderdata.schedule_type == 0) {
    //                                                                         var android_restaurant = orderdata.city_id;
    //                                                                         var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
    //                                                                         var response_time = CONFIG.respond_timeout;
    //                                                                         var action = 'order_request';
    //                                                                         var options = [orderdata.order_id, android_restaurant, response_time, action];
    //                                                                         // for (var i = 1; i == 1; i++) {
    //                                                                         //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //                                                                         // }
    //                                                                         var noti_data = {};
    //                                                                         noti_data.rest_id = orderdata.city_id;
    //                                                                         noti_data.order_id = orderdata.order_id;
    //                                                                         noti_data.user_id = orderdata.user_id;
    //                                                                         noti_data._id = orderdata._id;
    //                                                                         noti_data.user_name = user.username;
    //                                                                         noti_data.order_type = 'user';
    //                                                                         //io.of('/chat').in(orderdata.restaurant_id).emit('restnotify', { restauranId: noti_data });
    //                                                                         io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
    //                                                                         io.of('/chat').emit('adminnotify', noti_data);
    //                                                                         // var order_id = orderdata.order_id;
    //                                                                         // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
    //                                                                         // var mail_data = {};
    //                                                                         // mail_data.user_id = user._id;
    //                                                                         // mail_data.order_id = orderdata._id;
    //                                                                         // events.emit('restaurant_new_order', mail_data, function (err, result) { });
    //                                                                         // var mail_data = {};
    //                                                                         // mail_data.user_id = user._id;
    //                                                                         // mail_data.order_id = orderdata._id;
    //                                                                         // events.emit('neworderto_admin', mail_data, function (err, result) { });
    //                                                                     }
    //                                                                     // var mail_data = {};
    //                                                                     // mail_data.user_id = user._id;
    //                                                                     // mail_data.order_id = orderdata._id;
    //                                                                     // events.emit('OrderEmail', mail_data, function (err, result) { });
    //                                                                     if (req.body.expire_date && req.body.expire_date != null && req.body.expire_date != undefined) {
    //                                                                         var expires = parseInt(req.body.expire_date);
    //                                                                         db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { console.log('11111111', err, referrer) })
    //                                                                         console.log('user.initprocess', user.initprocess);
    //                                                                         if (user.initprocess == 'onorder') {
    //                                                                             // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
    //                                                                             var coupondata = {};
    //                                                                             coupondata.discount_amount = user.initoffer.discount_amount;
    //                                                                             coupondata.cart_amount = user.initoffer.cart_amount;
    //                                                                             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
    //                                                                             console.log('coupon_data', coupondata)
    //                                                                             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { console.log('22222', err, referrer) });
    //                                                                             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { console.log('33333333', err, referrer) });
    //                                                                         }
    //                                                                     } else if (user.initprocess == 'onorder') {
    //                                                                         var coupondata = {};
    //                                                                         coupondata.discount_amount = user.initoffer.discount_amount;
    //                                                                         coupondata.cart_amount = user.initoffer.cart_amount;
    //                                                                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
    //                                                                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
    //                                                                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
    //                                                                     }
    //                                                                     res.send({
    //                                                                         "status": '1',
    //                                                                         "response": 'Successfully your order registered',
    //                                                                         "order_id": orderdata.order_id,
    //                                                                         "res_loc": rest.location,
    //                                                                         "user_loc": data.location,
    //                                                                     });
    //                                                                 }
    //                                                             }
    //                                                         });
    //                                                     }
    //                                                 });
    //                                             }
    //                                         });
    //                                     } else {
    //                                         res.send({ "status": 0, "errors": 'Error in cart..!' });
    //                                     }
    //                                 }
    //                             })
    //                         }
    //                     });
    //                 }
    //             });
    //         }
    //     });
    // }

    // controller.createtempOrders = (req, res) => {
    //     var data = {};
    //     req.checkBody('user_id', 'user_id is required').notEmpty();
    //     req.checkBody('food', 'food is required').notEmpty();
    //     req.checkBody('city_id', 'city_id is required').notEmpty();
    //     req.checkBody('total', 'total is required').notEmpty();
    //     req.checkBody('grand_total', 'grand_total is required').notEmpty();
    //     req.checkBody('service_tax', 'service_tax is required').notEmpty();
    //     req.checkBody('schedule_date', 'schedule_date is required').notEmpty();
    //     req.checkBody('schedule_time_slot', 'schedule_time_slot is required').notEmpty();
    //     req.checkBody('offer_discount', 'offer_discount is required').optional();
    //     //req.checkBody('package_charge', 'package_charge is required').optional();
    //     req.checkBody('coupon_discount', 'coupon_discount is required').optional();
    //     req.checkBody('coupon_code', 'coupon_code id is required').optional();
    //     req.checkBody('delivery_amount', 'delivery_amount is required').optional();
    //     //req.checkBody('night_fee', 'night_fee is required').optional();
    //     //req.checkBody('surge_fee', 'surge_fee is required').optional();
    //     req.checkBody('food_offer_price', 'food_offer_price is required').optional();
    //     req.checkBody('landmark', 'landmark is required').optional();
    //     req.checkBody('flat_no', 'flat_no is required').optional();
    //     req.checkBody('delivery_address', 'delivery_address is required').notEmpty();
    //     req.checkBody('address_type', 'address_type is required').notEmpty();
    //     req.checkBody('longitude', 'longitude is required').notEmpty();
    //     req.checkBody('latitude', 'latitude is required').notEmpty();

    //     var errors = req.validationErrors();
    //     if (errors) {
    //         res.send({ "status": "0", "errors": errors[0].msg });
    //         return;
    //     }

    //     req.sanitizeBody('transaction_id').trim();
    //     req.sanitizeBody('user_id').trim();
    //     req.sanitizeBody('city_id').trim();
    //     req.sanitizeBody('total').trim();
    //     req.sanitizeBody('coupon_code').trim();
    //     req.sanitizeBody('delivery_amount').trim();
    //     // req.sanitizeBody('surge_fee').trim();
    //     // req.sanitizeBody('night_fee').trim();

    //     data.transaction_id = req.body.transaction_id;
    //     data.user_id = req.body.user_id;
    //     data.city_id = req.body.city_id;
    //     data.foods = req.body.food;
    //     data.cart_id = req.body._id;
    //     data.coupon_code = req.body.coupon_code;
    //     data.delivery_address = {};
    //     data.delivery_address.fulladres = req.body.delivery_address;
    //     data.delivery_address.type = req.body.address_type;
    //     data.delivery_address.street = req.body.flat_no;
    //     data.delivery_address.landmark = req.body.landmark;
    //     data.delivery_address.loc = {};
    //     data.delivery_address.loc.lat = req.body.latitude;
    //     data.delivery_address.loc.lng = req.body.longitude;
    //     data.location = {};
    //     data.location.lng = req.body.longitude;
    //     data.location.lat = req.body.latitude;
    //     data.schedule_date = req.body.schedule_date;
    //     data.schedule_time_slot = req.body.schedule_time_slot;

    //     data.schedule_type = 0;
    //     if (req.body.schedule_type && typeof req.body.schedule_type != 'undefined') {
    //         data.schedule_type = req.body.schedule_type;
    //     }
    //     var client_offset = (new Date).getTimezoneOffset();
    //     if (typeof req.body.client_offset != 'undefined') {
    //         client_offset = parseInt(req.body.client_offset);
    //     }
    //     var server_offset = (new Date).getTimezoneOffset();
    //     var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
    //     var date = new Date();
    //     if (req.body.schedule_type == 1) {
    //         var schedule_time = req.body.schedule_time;
    //         var schedule_day = req.body.schedule_day;
    //         var hours = parseInt(schedule_time.slice(0, -6));
    //         var minutes = parseInt(schedule_time.slice(3, -3));
    //         var meridiem = schedule_time.slice(-2);
    //         if (meridiem == 'pm' && hours != 12) {
    //             hours = hours + 12;
    //         }
    //         date.setHours(hours);
    //         date.setMinutes(minutes);
    //         date = new Date(date.getTime() - diff_offset);
    //         date = date.getTime();
    //         var date1 = date;
    //         if (schedule_day == 'tomorrow') {
    //             date = date + (24 * 60 * 60 * 1000);
    //         }
    //         data.schedule_time = date;
    //         data.show_schedule_time = new Date(date);
    //     }
    //     if (typeof req.body.schedule_type != 'undefined' && req.body.schedule_type == 1) {
    //         data.status = 15;
    //     } else {
    //         data.status = 1;
    //     }
    //     db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
    //         db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
    //             if (err || !rest) {
    //                 res.send({ "status": 0, "errors": 'Error in city' });
    //             }
    //             else {
    //                 // data.rest_offer = rest.offer;
    //                 // data.com_type = rest.com_type;
    //                 // data.main_city = rest.main_city;
    //                 // data.sub_city = rest.sub_city;
    //                 // data.unique_commission = rest.unique_commission || '';
    //                 db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
    //                     if (err || !user) {
    //                         res.send({ "status": 0, "errors": 'Error in user' });
    //                     }
    //                     else {
    //                         db.GetOneDocument('city', { 'status': { $ne: 0 }, 'cityname': rest.cityname }, {}, {}, function (err, docdata) {
    //                             if (err || !docdata) {
    //                                 res.send({
    //                                     "status": "0", "errors": "Error in admin commission"
    //                                 });
    //                             } else {
    //                                 db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
    //                                     if (err) {
    //                                         res.send({ "status": 0, "errors": 'Error in settings' });
    //                                     }
    //                                     else {
    //                                         db.GetOneDocument('cart', { '_id': data.cart_id, 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
    //                                             if (err || !cart_details) {
    //                                                 res.send({ "status": 0, "errors": 'Error in cart..!' });
    //                                             } else {
    //                                                 if (cart_details && typeof cart_details._id != 'undefined') {
    //                                                     var billings = {};
    //                                                     billings.amount = {};
    //                                                     billings.amount.total = req.body.total;
    //                                                     billings.amount.coupon_discount = req.body.coupon_discount || 0;
    //                                                     billings.amount.offer_discount = req.body.offer_discount || 0;
    //                                                     billings.amount.delivery_amount = req.body.delivery_amount || 0;
    //                                                     billings.amount.service_tax = req.body.service_tax || 0;
    //                                                     //billings.amount.night_fee = req.body.night_fee || 0;
    //                                                     //billings.amount.surge_fee = req.body.surge_fee || 0;
    //                                                     billings.amount.package_charge = req.body.package_charge || 0;
    //                                                     billings.amount.food_offer_price = req.body.food_offer_price || 0;
    //                                                     billings.amount.grand_total = req.body.grand_total || 0;
    //                                                     if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
    //                                                         data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
    //                                                     } else {
    //                                                         data.order_id = req.body.order_id;
    //                                                     }
    //                                                     data.created_time = Date.now();
    //                                                     if (data.schedule_type == 1) {
    //                                                         data.created_time = data.schedule_time;
    //                                                     }
    //                                                     data.cart_details = cart_details;
    //                                                     let collection = 'temporders';
    //                                                     if (billings.amount.grand_total <= 0) {
    //                                                         collection = 'orders';
    //                                                     }
    //                                                     var txn_data = {};
    //                                                     txn_data.user = data.user_id;
    //                                                     txn_data.city_id = data.city_id;
    //                                                     txn_data.amount = req.body.grand_total;
    //                                                     txn_data.schedule_type = req.body.schedule_type;
    //                                                     txn_data.type = 'cashfree';
    //                                                     txn_data.mode = 'charge';
    //                                                     db.InsertDocument('transaction', txn_data, function (err, transdata) {
    //                                                         if (err || transdata.nModified == 0) {
    //                                                             res.send({ "status": 0, "errors": 'Error in transaction' });
    //                                                         } else {
    //                                                             var transactionsData = [{ 'gateway_response': {} }];
    //                                                             db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
    //                                                                 if (err || transaction.nModified == 0) {
    //                                                                     res.send({ "status": 0, "errors": 'Error in transaction' });
    //                                                                 } else {
    //                                                                     data.transaction_id = transdata._id;
    //                                                                     db.InsertDocument(collection, data, function (err, orderdata) {
    //                                                                         if (err || orderdata.nModified == 0) {
    //                                                                             res.send({ "status": 0, "errors": 'Error in order' });
    //                                                                         } else {
    //                                                                             var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
    //                                                                             db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
    //                                                                                 if (err || response.nModified == 0) {
    //                                                                                     res.send({ "status": 0, "errors": 'Error in order' });
    //                                                                                 }
    //                                                                                 else {
    //                                                                                     if (billings.amount.grand_total <= 0) {
    //                                                                                         if (data.coupon_code) {
    //                                                                                             db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
    //                                                                                             db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
    //                                                                                                 if (err || !usagelimit || usagelimit.length == 0) {
    //                                                                                                     res.send({ "status": "0", "errors": "Sorry error in coupon..!" });
    //                                                                                                 } else {
    //                                                                                                     var usagelimits = usagelimit[0].usage.total_coupons;
    //                                                                                                     var result = usagelimits - 1;
    //                                                                                                     var use = parseInt(usagelimit[0].used) + parseInt(1);
    //                                                                                                     if (result <= 0) {
    //                                                                                                         result = 0;
    //                                                                                                     }
    //                                                                                                     db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
    //                                                                                                         if (err || result.nModified == 0) { res.send({ "status": "0", "errors": "Error in coupon updation..!" }); }
    //                                                                                                         else {
    //                                                                                                             var android_restaurant = req.body.city_id;
    //                                                                                                             var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
    //                                                                                                             var response_time = CONFIG.respond_timeout;
    //                                                                                                             var action = 'order_request';
    //                                                                                                             var options = [orderdata.order_id, android_restaurant, response_time, action];
    //                                                                                                             // for (var i = 1; i == 1; i++) {
    //                                                                                                             //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //                                                                                                             // }
    //                                                                                                             var noti_data = {};
    //                                                                                                             noti_data.rest_id = data.restaurant_id;
    //                                                                                                             noti_data.order_id = orderdata.order_id;
    //                                                                                                             noti_data.user_id = orderdata.user_id;
    //                                                                                                             noti_data._id = orderdata._id;
    //                                                                                                             noti_data.user_name = user.username;
    //                                                                                                             noti_data.schedule_type = data.schedule_type;
    //                                                                                                             noti_data.order_type = 'user';
    //                                                                                                             // io.of('/chat').in(data.restaurant_id).emit('restnotify', { restauranId: noti_data });
    //                                                                                                             io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
    //                                                                                                             io.of('/chat').emit('adminnotify', noti_data);
    //                                                                                                             // var mail_data = {};
    //                                                                                                             // mail_data.user_id = user._id;
    //                                                                                                             // mail_data.order_id = orderdata._id;
    //                                                                                                             // events.emit('OrderEmail', mail_data, function (err, result) { });
    //                                                                                                             // var order_id = orderdata.order_id;
    //                                                                                                             // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
    //                                                                                                             // var mail_data = {};
    //                                                                                                             // mail_data.user_id = user._id;
    //                                                                                                             // mail_data.order_id = orderdata._id;
    //                                                                                                             // events.emit('restaurant_new_order', mail_data, function (err, result) { });
    //                                                                                                             // var mail_data = {};
    //                                                                                                             // mail_data.user_id = user._id;
    //                                                                                                             // mail_data.order_id = orderdata._id;
    //                                                                                                             // events.emit('neworderto_admin', mail_data, function (err, result) { });
    //                                                                                                             res.redirect("/payment-success");
    //                                                                                                         }
    //                                                                                                     });
    //                                                                                                 }
    //                                                                                             });
    //                                                                                         }
    //                                                                                         else {
    //                                                                                             db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
    //                                                                                             var android_restaurant = req.body.city_id;
    //                                                                                             var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
    //                                                                                             var response_time = CONFIG.respond_timeout;
    //                                                                                             var action = 'order_request';
    //                                                                                             var options = [orderdata.order_id, android_restaurant, response_time, action];
    //                                                                                             // for (var i = 1; i == 1; i++) {
    //                                                                                             //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
    //                                                                                             // }
    //                                                                                             var noti_data = {};
    //                                                                                             noti_data.city_id = data.city_id;
    //                                                                                             noti_data.order_id = orderdata.order_id;
    //                                                                                             noti_data.user_id = orderdata.user_id;
    //                                                                                             noti_data._id = orderdata._id;
    //                                                                                             noti_data.user_name = user.username;
    //                                                                                             noti_data.schedule_type = data.schedule_type;
    //                                                                                             noti_data.order_type = 'user';
    //                                                                                             //io.of('/chat').in(data.restaurant_id).emit('restnotify', { restauranId: noti_data });
    //                                                                                             io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
    //                                                                                             io.of('/chat').emit('adminnotify', noti_data);
    //                                                                                             // var mail_data = {};
    //                                                                                             // mail_data.user_id = user._id;
    //                                                                                             // mail_data.order_id = orderdata._id;
    //                                                                                             // events.emit('OrderEmail', mail_data, function (err, result) { });
    //                                                                                             // var order_id = orderdata.order_id;
    //                                                                                             // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
    //                                                                                             // var mail_data = {};
    //                                                                                             // mail_data.user_id = user._id;
    //                                                                                             // mail_data.order_id = orderdata._id;
    //                                                                                             // events.emit('restaurant_new_order', mail_data, function (err, result) { });
    //                                                                                             // var mail_data = {};
    //                                                                                             // mail_data.user_id = user._id;
    //                                                                                             // mail_data.order_id = orderdata._id;
    //                                                                                             // events.emit('neworderto_admin', mail_data, function (err, result) { });
    //                                                                                             res.redirect("/payment-success");
    //                                                                                         }
    //                                                                                     } else {
    //                                                                                         res.send({ "status": 1, "response": 'temp order created', orderId: orderdata._id, order_id: orderdata.order_id, "res_loc": rest.location, "user_loc": data.location });
    //                                                                                     }
    //                                                                                 }
    //                                                                             });
    //                                                                         }
    //                                                                     });
    //                                                                 }
    //                                                             })
    //                                                         }
    //                                                     })
    //                                                 } else {
    //                                                     res.send({ "status": 0, "errors": 'Error in cart..!' });
    //                                                 }
    //                                             }
    //                                         })

    //                                     }
    //                                 });
    //                             }
    //                         });
    //                     }
    //                 });
    //             }
    //         });
    //     });
    // };

    controller.cashrequest = async (req, res) => {

        var data = {};
        data.status = '0';
        // req.checkBody('orderId', 'order id is required').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send({ "status": "0", "errors": errors[0].msg });
        //     return;
        // }

        let settings = await db.GetOneDocument('settings', { alias: 'general' }, {}, {})


        try {
            if (!settings) {
                data.message = "Configure Your Settings";
                data.status = 0;
                res.send(data)
            } else {
                let paymentgateway = await db.GetOneDocument('paymentgateway', { 'alias': 'cashfree', status: 1 }, {}, {})

                if (!paymentgateway) {
                    library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                    res.redirect("/payment-failure");
                } else {
                    let temporders = await db.GetOneDocument('temporders', { '_id': new mongoose.Types.ObjectId(req.body.orderId) }, {}, {})


                    if (!temporders || temporders.status == false) {
                        library.cleartemp({ id: new mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                        data.message = "Payment Failure";
                        data.payementError = true;
                        res.send(data)
                        // res.redirect("/payment-failure");
                    } else {
                        let users = await db.GetOneDocument('users', { '_id': new mongoose.Types.ObjectId(temporders.doc.user_id) }, {}, {})

                        if (!users || users.status == false) {
                            library.cleartemp({ id: new mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                            // res.redirect("/payment-failure");
                            data.message = "Payment Failure";
                            data.payementError = true;
                            res.send(data)
                        } else {
                            if (temporders.doc.billings === undefined || temporders.doc.billings.amount === undefined || temporders.doc.billings.amount.grand_total === undefined || temporders.doc.billings.amount.grand_total <= 0) {
                                library.cleartemp({ id: new mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                                res.redirect("/payment-failure");
                            } else {
                                let url = '';
                                if (paymentgateway.doc.settings.mode == "live") {
                                    url = "https://api.cashfree.com/api/v1/order/create";
                                } else {
                                    url = "https://test.cashfree.com/api/v1/order/create";
                                }
                                var options = {
                                    'method': 'POST',
                                    'url': url,
                                    'headers': {
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    },
                                    form: {
                                        "appId": paymentgateway.doc.settings.app_key,
                                        "secretKey": paymentgateway.doc.settings.secret_key,
                                        "orderId": req.body.orderId,
                                        "orderAmount": temporders.doc.billings.amount.grand_total,
                                        "orderCurrency": settings.doc.settings.currency_code,
                                        "orderNote": 'user order placement',
                                        'customerName': users.doc.username,
                                        "customerEmail": users.doc.email,
                                        "customerPhone": `${users.phone.code}${users.phone.number}`,
                                        "returnUrl": `${settings.settings.site_url}mobile/cashfree/response`
                                    }
                                };
                                urlrequest(options, async (error, response) => {
                                    let respo = JSON.parse(response.body) // {"message":"Refund has been initiated.","refundId":5651,"status":"OK"}
                                    if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR" || !respo.paymentLink) {
                                        library.cleartemp({ id: new mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                                        res.redirect("/payment-failure");
                                    } else {
                                        res.redirect(respo.paymentLink);
                                    }
                                });
                            }
                        }
                        // });
                    }
                    // });
                }
                // });
            }
            // }
            // }
            // }
            // }
        } catch (e) {

            console.log("error at cashrequest api  ", e)
        }
        //  (err, settings) => {
        //     if (err || !settings) {
        //         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //         res.redirect("/payment-failure");
        //     } else {
        //         db.GetOneDocument('paymentgateway', { 'alias': 'cashfree', status: 1 }, {}, {}, (err, gateWay) => {
        //             if (err || !gateWay) {
        //                 library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                 res.redirect("/payment-failure");
        //             } else {
        //                 db.GetOneDocument('temporders', { '_id': mongoose.Types.ObjectId(req.query.orderId) }, {}, {}, (err, order) => {
        //                     if (err || !order) {
        //                         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                         res.redirect("/payment-failure");
        //                     } else {
        //                         db.GetOneDocument('users', { '_id': order.user_id }, {}, {}, (err, user) => {
        //                             if (err || !user) {
        //                                 library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                                 res.redirect("/payment-failure");
        //                             } else {
        //                                 if (order.billings === undefined || order.billings.amount === undefined || order.billings.amount.grand_total === undefined || order.billings.amount.grand_total <= 0) {
        //                                     library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                                     res.redirect("/payment-failure");
        //                                 } else {
        //                                     let url = '';
        //                                     if (gateWay.settings.mode == "live") {
        //                                         url = "https://api.cashfree.com/api/v1/order/create";
        //                                     } else {
        //                                         url = "https://test.cashfree.com/api/v1/order/create";
        //                                     }
        //                                     var options = {
        //                                         'method': 'POST',
        //                                         'url': url,
        //                                         'headers': {
        //                                             'Content-Type': 'application/x-www-form-urlencoded'
        //                                         },
        //                                         form: {
        //                                             "appId": gateWay.settings.app_key,
        //                                             "secretKey": gateWay.settings.secret_key,
        //                                             "orderId": req.query.orderId,
        //                                             "orderAmount": order.billings.amount.grand_total,
        //                                             "orderCurrency": settings.settings.currency_code,
        //                                             "orderNote": 'user order placement',
        //                                             'customerName': user.username,
        //                                             "customerEmail": user.email,
        //                                             "customerPhone": `${user.phone.code}${user.phone.number}`,
        //                                             "returnUrl": `${settings.settings.site_url}mobile/cashfree/response`
        //                                         }
        //                                     };
        //                                     urlrequest(options, async (error, response) => {
        //                                         let respo = JSON.parse(response.body) // {"message":"Refund has been initiated.","refundId":5651,"status":"OK"}
        //                                         if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR" || !respo.paymentLink) {
        //                                             library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                                             res.redirect("/payment-failure");
        //                                         } else {
        //                                             res.redirect(respo.paymentLink);
        //                                         }
        //                                     });
        //                                 }
        //                             }
        //                         });
        //                     }
        //                 });
        //             }
        //         });
        //     }
        // });
    };

    controller.cashresponse = (req, res) => {
        if (req.body.txStatus == 'SUCCESS') {
            db.GetOneDocument('temporders', { _id: mongoose.Types.ObjectId(req.body.orderId) }, {}, {}, (err, orderData) => {
                if (err || !orderData) {
                    library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                    res.redirect("/payment-failure");
                } else {
                    let insert_data = {};
                    insert_data._id = orderData._id;
                    insert_data.billings = orderData.billings;
                    insert_data.order_history = { order_time: new Date() };
                    insert_data.location = orderData.location;
                    insert_data.created_time = Date.now();
                    if (orderData.schedule_type == 1) {
                        insert_data.created_time = orderData.location;
                    }
                    insert_data.transaction_id = orderData.transaction_id;
                    insert_data.user_id = orderData.user_id;
                    insert_data.city_id = orderData.city_id;
                    insert_data.foods = orderData.foods;
                    insert_data.schedule_date = orderData.schedule_date;
                    insert_data.schedule_time_slot = orderData.schedule_time_slot;
                    insert_data.coupon_code = orderData.coupon_code;
                    insert_data.delivery_address = orderData.delivery_address;
                    insert_data.schedule_type = orderData.schedule_type;
                    insert_data.status = orderData.status;
                    insert_data.rest_offer = orderData.rest_offer;
                    insert_data.com_type = orderData.com_type;
                    insert_data.main_city = orderData.main_city;
                    insert_data.sub_city = orderData.sub_city;
                    insert_data.unique_commission = orderData.unique_commission;
                    insert_data.order_id = orderData.order_id;
                    insert_data.cart_details = orderData.cart_details;
                    db.InsertDocument('orders', insert_data, (err, orderDetails) => {
                        if (err || !orderDetails) {
                            library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 1 });
                            res.redirect("/payment-failure");
                        } else {
                            //Hot Selling concept.
                            var each = require('sync-each');
                            if (orderDetails && typeof orderDetails.foods != 'undefined' && orderDetails.foods.length > 0) {
                                each(orderDetails.foods,
                                    function (getMessage, next) {
                                        db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
                                            if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {

                                                if (typeof foodDetails.hotselling != 'undefined') {
                                                    var count = foodDetails.hotselling + 1;
                                                    var up_dates = { 'hotselling': count };
                                                    db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                                                    })

                                                } else {
                                                    var up_dates = { 'hotselling': 1 };
                                                    db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
                                                }
                                            }
                                        })
                                        process.nextTick(next);
                                    },
                                    function (err, transformedItems) { }
                                );
                            }
                            db.UpdateDocument('transaction', { '_id': orderDetails.transaction_id }, { 'transactions': [{ 'gateway_response': req.body }] }, {}, function (err, response) { })
                            db.GetDocument('users', { _id: orderDetails.user_id }, {}, {}, function (err, user) {
                                if (err || !user) {
                                    library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 2 });
                                    res.redirect("/payment-success");
                                } else {
                                    if (orderDetails.coupon_code) {
                                        db.DeleteDocument('cart', { 'user_id': orderDetails.user_id, 'city_id': orderDetails.city_id }, function (err, res) { });
                                        db.GetDocument('coupon', { status: { $ne: 0 }, code: orderDetails.coupon_code }, {}, {}, function (err, usagelimit) {
                                            if (err || !usagelimit || usagelimit.length == 0) {
                                                library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 2 });
                                                res.redirect("/payment-success");
                                            } else {
                                                var usagelimits = usagelimit[0].usage.total_coupons;
                                                var result = usagelimits - 1;
                                                var use = parseInt(usagelimit[0].used) + parseInt(1);
                                                if (result <= 0) {
                                                    result = 0;
                                                }
                                                db.UpdateDocument('coupon', { status: { $ne: 0 }, code: orderDetails.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                                                    var android_restaurant = orderDetails.city_id;
                                                    var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                    var response_time = CONFIG.respond_timeout;
                                                    var action = 'order_request';
                                                    var options = [orderDetails.order_id, android_restaurant, response_time, action];
                                                    // for (var i = 1; i == 1; i++) {
                                                    //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                    // }
                                                    var noti_data = {};
                                                    noti_data.rest_id = orderDetails.city_id;
                                                    noti_data.order_id = orderDetails.order_id;
                                                    noti_data.user_id = orderDetails.user_id;
                                                    noti_data._id = orderDetails._id;
                                                    noti_data.user_name = user.username;
                                                    noti_data.schedule_type = orderDetails.schedule_type;
                                                    noti_data.order_type = 'user';
                                                    //io.of('/chat').in(orderDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                    io.of('/chat').in(orderDetails.user_id).emit('usernotify', noti_data);
                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                    var mail_data = {};
                                                    mail_data.user_id = orderDetails.user_id;
                                                    mail_data.order_id = orderDetails._id;
                                                    events.emit('OrderEmail', mail_data, function (err, result) { });
                                                    // var order_id = orderDetails.order_id;
                                                    // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                                    // var mail_data = {};
                                                    // mail_data.user_id = user._id;
                                                    // mail_data.order_id = orderDetails._id;
                                                    // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                    var mail_data = {};
                                                    mail_data.user_id = orderDetails.user_id;
                                                    mail_data.order_id = orderDetails._id;
                                                    events.emit('neworderto_admin', mail_data, function (err, result) { });
                                                    library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 2 });
                                                    res.redirect("/payment-success");
                                                });
                                            }
                                        });

                                    } else {
                                        db.DeleteDocument('cart', { 'user_id': orderDetails.user_id, 'restaurant_id': orderDetails.restaurant_id }, function (err, res) { });
                                        var android_restaurant = req.body.restaurant_id;
                                        var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                        var response_time = CONFIG.respond_timeout;
                                        var action = 'order_request';
                                        var options = [orderDetails.order_id, android_restaurant, response_time, action];
                                        for (var i = 1; i == 1; i++) {
                                            push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                        }
                                        var noti_data = {};
                                        noti_data.rest_id = orderDetails.city_id;
                                        noti_data.order_id = orderDetails.order_id;
                                        noti_data.user_id = orderDetails.user_id;
                                        noti_data._id = orderDetails._id;
                                        noti_data.user_name = user.username;
                                        noti_data.schedule_type = orderDetails.schedule_type;
                                        noti_data.order_type = 'user';
                                        /// io.of('/chat').in(orderDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                        io.of('/chat').in(orderDetails.user_id).emit('usernotify', noti_data);
                                        io.of('/chat').emit('adminnotify', noti_data);
                                        var mail_data = {};
                                        mail_data.user_id = orderDetails.user_id;
                                        mail_data.order_id = orderDetails._id;
                                        events.emit('OrderEmail', mail_data, function (err, result) { });
                                        // var order_id = orderDetails.order_id;
                                        // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                        // var mail_data = {};
                                        // mail_data.user_id = user._id;
                                        // mail_data.order_id = orderDetails._id;
                                        // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                        var mail_data = {};
                                        mail_data.user_id = orderDetails.user_id;
                                        mail_data.order_id = orderDetails._id;
                                        events.emit('neworderto_admin', mail_data, function (err, result) { });
                                        library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 2 });
                                        res.redirect("/payment-success");
                                    }
                                }
                            });

                        }
                    })
                }
            })
        } else {
            library.cleartemp({ id: mongoose.Types.ObjectId(req.body.orderId), type: 1 });
            res.redirect("/payment-failure");
        }
    };
    events.on('OrderUpdate', async function (req, done) {

        console.log("------------------------req.bodyreq--------------------------------------------------------------------------------------------------------")

        console.log(req.body)

        console.log("------------------------req.bodyreq--------------------------------------------------------------------------------------------------------")

        // console.log(req.body)


        // console.log("req.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.bodyreq.body")

        var data = {};
        data.status = '0';
        var message = '';
        // req.checkBody('transaction_id', 'transaction_id is required').notEmpty();
        // req.checkBody('user_id', 'user_id is required').notEmpty();
        // req.checkBody('cart_details', 'cart_details is required').notEmpty();
        // req.checkBody('city_id', 'city_id is required').notEmpty();
        // req.checkBody('total', 'total is required').notEmpty();
        // req.checkBody('pay_total', 'pay_total is required').notEmpty();
        // req.checkBody('service_tax', 'service_tax is required').notEmpty();
        // req.checkBody('offer_price', 'offer_discount is required').optional();
        // req.checkBody('coupon_price', 'coupon_discount is required').optional();
        // req.checkBody('coupon_code', 'coupon_code id is required').optional();
        // req.checkBody('coupon_discount', 'coupon_discount id is required').optional();
        // req.checkBody('food_offer_price', 'food_offer_price id is required').optional();
        // req.checkBody('package_charge', 'package_charge id is required').optional();
        // req.checkBody('delivery_charge', 'delivery_charge is required').optional();
        // // req.checkBody('night_fare', 'night_fare is required').optional();
        // // req.checkBody('surge_fare', 'surge_fare is required').optional();
        // req.checkBody('delivery_address.line1', 'delivery_address is required').notEmpty();
        // req.checkBody('delivery_address.choose_location', 'address_type is required').notEmpty();
        // req.checkBody('delivery_address.loc.lng', 'longitude is required').notEmpty();
        // req.checkBody('delivery_address.loc.lat', 'latitude is required').notEmpty();
        // req.checkBody('delivery_address.street', 'street is required').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     done(errors[0].msg, {});
        //     return;
        // }
        // req.sanitizeBody('transaction_id').trim();
        // req.sanitizeBody('user_id').trim();
        // req.sanitizeBody('city_id').trim();
        // req.sanitizeBody('quantity').trim();
        // req.sanitizeBody('individual_total').trim();
        // req.sanitizeBody('total').trim();
        // req.sanitizeBody('discount').trim();
        // req.sanitizeBody('coupon_code').trim();
        // req.sanitizeBody('delivery_charge').trim();
        // // req.sanitizeBody('surge_fare').trim();
        // // req.sanitizeBody('night_fare').trim();
        // req.sanitizeBody('address_type').trim();
        // req.sanitizeBody('longitude').trim();
        // req.sanitizeBody('latitude').trim();
        var request = {};
        // console.log(req.body, 'this is the request body of the request in the request of request');
        data.transaction_id = req.body.transaction_id;
        data.user_id = req.body.user_id;
        data.city_id = req.body.city_id;
        data.schedule_type = 0;
        if (req.body.schedule_type && typeof req.body.schedule_type != 'undefined') {
            data.schedule_type = req.body.schedule_type;
        }
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
        var date = new Date();
        if (req.body.schedule_type == 1) {
            var schedule_time = req.body.schedule_time;
            var schedule_day = req.body.schedule_day;
            var hours = parseInt(schedule_time.slice(0, -6));
            var minutes = parseInt(schedule_time.slice(3, -3));
            var meridiem = schedule_time.slice(-2);
            if (meridiem == 'pm' && hours != 12) {
                hours = hours + 12;
            }
            date.setHours(hours);
            date.setMinutes(minutes);
            date = new Date(date.getTime() - diff_offset);
            date = date.getTime();
            var date1 = date;
            if (schedule_day == 'tomorrow') {
                date = date + (24 * 60 * 60 * 1000);
            }
            data.schedule_time = date;
            data.show_schedule_time = new Date(date);
        }
        if (req.body.refer_offer) {
            data.refer_offer_price = req.body.refer_offer.discount_amount;
            data.refer_offer = req.body.refer_offer;
        }
        data.foods = req.body.cart_details;
        data.coupon_code = req.body.coupon_code;
        data.schedule_date = req.body.schedule_date;
        data.schedule_time_slot = req.body.schedule_time_slot;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address.fulladres;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.loc = req.body.delivery_address.loc;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.street;
        data.delivery_address.city = req.body.delivery_address.city;
        data.delivery_address.name = req.body.delivery_address.name;
        data.delivery_address.phone = req.body.delivery_address.phone.number;
        data.delivery_address.zipcode = req.body.delivery_address.zipcode;

        data.location = {};
        // data.location.lng = req.body.delivery_address.loc.lng;  //if incase use lat lang enable this
        // data.location.lat = req.body.delivery_address.loc.lat;
        if (typeof req.body.schedule_type != 'undefined' && req.body.schedule_type == 1) {
            data.status = 15;
        } else {
            data.status = 1;
        }
        const rest = await db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {})
        if (!rest) {
            done('Error in city', {});
        } else {
            // data.com_type = rest.com_type;
            // data.sub_city = rest.sub_city;
            // data.main_city = rest.main_city;
            // data.unique_commission = rest.unique_commission;
            // if (rest.efp_time && req.body.schedule_type == 1) {
            //     data.schedule_time = data.schedule_time - (rest.efp_time * 60 * 1000);
            //     data.eta = rest.efp_time * 60 * 1000;
            // }
            const user = await db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {})
            if (!user) {
                done('Error in user', {});
            } else {
                const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
                if (settings.status == false) {
                    done('Error in settings', {});
                } else {
                    var billings = {};
                    billings.amount = {};
                    billings.amount.total = req.body.total;
                    billings.amount.coupon_discount = req.body.coupon_price || 0;
                    billings.amount.food_offer_price = req.body.food_offer_price || 0;
                    billings.amount.offer_discount = req.body.offer_price || 0;
                    billings.amount.delivery_amount = req.body.delivery_charge || 0;
                    billings.amount.service_tax = req.body.service_tax || 0;
                    // billings.amount.night_fee = req.body.night_fare || 0;
                    // billings.amount.surge_fee = req.body.surge_fare || 0;
                    billings.amount.grand_total = req.body.pay_total || 0;
                    billings.amount.package_charge = req.body.package_charge || 0;
                    if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
                        data.order_id = settings.doc.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                    } else {
                        data.order_id = req.body.order_id;
                    }
                    data.created_time = Date.now();
                    if (data.schedule_type == 1) {
                        data.created_time = data.schedule_time;
                    }
                    const orderdata = await db.InsertDocument('orders', data)
                    if (orderdata.nModified == 0) {
                        done('Error in order', {});
                    } else {
                        //Hot Selling concept.
                        var each = require('sync-each');
                        if (orderdata && typeof orderdata.foods != 'undefined' && orderdata.foods.length > 0) {
                            each(orderdata.foods,
                                async function (getMessage, next) {
                                    const foodDetails = await db.GetOneDocument('food', { _id: getMessage.id }, {}, {})
                                    if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
                                        if (typeof foodDetails.doc.hotselling != 'undefined') {
                                            var count = foodDetails.doc.hotselling + 1;
                                            var up_dates = { 'hotselling': count };
                                            await db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {})
                                            // db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                                            // })

                                        } else {
                                            var up_dates = { 'hotselling': 1 };
                                            await db.UpdateDocument('food', { '_id': foodDetails.doc._id }, up_dates, {})
                                            // db.UpdateDocument('food', { '_id': foodDetails.doc._id }, up_dates, {}, function (err, response) { })
                                        }
                                    }
                                    // db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
                                    //     if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
                                    //         if (typeof foodDetails.hotselling != 'undefined') {
                                    //             var count = foodDetails.hotselling + 1;
                                    //             var up_dates = { 'hotselling': count };
                                    //             db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                                    //             })

                                    //         } else {
                                    //             var up_dates = { 'hotselling': 1 };
                                    //             db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
                                    //         }
                                    //     }
                                    // })
                                    process.nextTick(next);
                                },
                                function (err, transformedItems) { }
                            );
                        }
                        var order_id = orderdata.order_id;
                        req.body.order_id = orderdata._id;
                        req.body.user_id = data.user_id;
                        var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                        const response = await db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {})
                        if (response.nModified == 0) {
                            done('Error in order', {});
                        } else {
                            if (data.coupon_code) {
                                const cart_details = await db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {})
                                if (!cart_details) {
                                    done('Error in cart', {});
                                } else {
                                    if (cart_details && typeof cart_details.doc._id != 'undefined') {
                                        var updatedoc = { 'cart_details': cart_details.doc };
                                        await db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {})
                                        await db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id })
                                        // db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                                        // db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                                    } else {
                                        done('Error in cart', {});
                                    }
                                }
                                // db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                                //     if (err || !cart_details) {
                                //         done('Error in cart', {});
                                //     } else {
                                //         if (cart_details && typeof cart_details._id != 'undefined') {
                                //             var updatedoc = { 'cart_details': cart_details };
                                //             db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                                //             db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                                //         } else {
                                //             done('Error in cart', {});
                                //         }
                                //     }
                                // })
                                const usagelimit = await db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {})
                                if (!usagelimit.doc || usagelimit.doc.length == 0) {
                                    done("Sorry error in coupon..!", {});
                                } else {
                                    var usagelimits = usagelimit.doc[0].usage.total_coupons;
                                    var result1 = usagelimits - 1;
                                    var use = parseInt(usagelimit.doc[0].used) + parseInt(1);
                                    if (result1 <= 0) {
                                        result1 = 0;
                                    }
                                    const result = await db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result1, 'used': use })
                                    console.log(usagelimit, 'this is the usage limit+++++++++++++++===========+++++++++++++++');
                                    if (usagelimit.doc[0].used_by.length > 0) {
                                        const userEntry = usagelimit.doc[0].used_by.find(entry => entry.user_id == data.user_id);
                                        console.log(userEntry, 'this is user entry================');
                                        if (userEntry.number_of_time < usagelimit.doc[0].usage.per_user) {
                                            const update2 = await db.UpdateDocument('coupon',
                                                {
                                                    '_id': usagelimit.doc[0]._id,
                                                    'used_by.user_id': data.user_id
                                                },
                                                {
                                                    $inc: { 'used_by.$.number_of_time': 1 }
                                                },
                                                {})
                                            console.log(update2, 'this are the update 2 in this universe');
                                            // const update= await db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { $push: { used_by: {user_id:data.user_id, number_of_time:userEntry.number_of_time+1} } }, {})
                                        } else {
                                            const update = await db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { $push: { used_by: { user_id: data.user_id, number_of_time: 1 } } }, {})
                                            console.log(update, 'this is the update')
                                            // response.send({ error: true, status: 0, message: `You have already used the limit` })
                                        }
                                    } else {
                                        const update = await db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { $push: { used_by: { user_id: data.user_id, number_of_time: 1 } } }, {})
                                        console.log(update, 'this is the update');
                                    }
                                    if (result.nModified == 0) {
                                        done("Error in coupon updation..!", {});
                                    } else {
                                        // var android_restaurant = req.body.restaurant_id;
                                        // var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                        // var response_time = CONFIG.respond_timeout;
                                        // var action = 'order_request';
                                        // var options = [orderdata.order_id, android_restaurant, response_time, action];
                                        if (orderdata.schedule_type == 0) {
                                            // for (var i = 1; i == 1; i++) {
                                            //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                            // }
                                            var noti_data = {};
                                            noti_data.rest_id = rest._id;
                                            noti_data.order_id = orderdata.order_id;
                                            noti_data._id = orderdata._id;
                                            noti_data.user_id = orderdata.user_id;
                                            noti_data.user_name = user.username;
                                            noti_data.schedule_type = data.schedule_type;
                                            noti_data.order_type = 'user';
                                            //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                                            io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                            io.of('/chat').emit('adminnotify', noti_data);
                                            var mail_data = {};
                                            mail_data.user_id = user._id;
                                            mail_data.order_id = orderdata._id;
                                            events.emit('neworderto_admin', mail_data, function (err, result) { });
                                        }
                                        var mail_data = {};
                                        mail_data.user_id = orderdata.user_id;
                                        mail_data.order_id = orderdata._id;
                                        events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                        if (req.body.refer_offer) {
                                            var expires = req.body.refer_offer.expire_date;
                                            await db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {})
                                            // db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                                            if (user.initprocess == 'onorder') {
                                                var coupondata = {};
                                                coupondata.discount_amount = user.initoffer.discount_amount;
                                                coupondata.cart_amount = user.initoffer.cart_amount;
                                                coupondata.expire_date = Date.now() + (settings.doc.settings.rov_period * 24 * 60 * 60 * 1000);
                                                await db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {})
                                                await db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {})

                                                // db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                                // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                            }
                                        } else if (user.initprocess == 'onorder') {
                                            var coupondata = {};
                                            coupondata.discount_amount = user.initoffer.discount_amount;
                                            coupondata.cart_amount = user.initoffer.cart_amount;
                                            coupondata.expire_date = Date.now() + (settings.doc.settings.rov_period * 24 * 60 * 60 * 1000);
                                            await db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {})
                                            await db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {})

                                            // db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                            // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                        }
                                        done(null, {
                                            "status": '1',
                                            "response": 'Successfully your order registered',
                                            "order_id": orderdata.order_id,
                                        });
                                    }
                                    // db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                                    //     if (err || result.nModified == 0) {
                                    //         done("Error in coupon updation..!", {});
                                    //     } else {
                                    //         var android_restaurant = req.body.restaurant_id;
                                    //         var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                    //         var response_time = CONFIG.respond_timeout;
                                    //         var action = 'order_request';
                                    //         var options = [orderdata.order_id, android_restaurant, response_time, action];
                                    //         if (orderdata.schedule_type == 0) {
                                    //             // for (var i = 1; i == 1; i++) {
                                    //             //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                    //             // }
                                    //             var noti_data = {};
                                    //             noti_data.rest_id = rest._id;
                                    //             noti_data.order_id = orderdata.order_id;
                                    //             noti_data._id = orderdata._id;
                                    //             noti_data.user_id = orderdata.user_id;
                                    //             noti_data.user_name = user.username;
                                    //             noti_data.schedule_type = data.schedule_type;
                                    //             noti_data.order_type = 'user';
                                    //             //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                                    //             io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                    //             io.of('/chat').emit('adminnotify', noti_data);
                                    //             // var mail_data = {};
                                    //             // mail_data.user_id = user._id;
                                    //             // mail_data.order_id = orderdata._id;
                                    //             // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                    //             var mail_data = {};
                                    //             mail_data.user_id = user._id;
                                    //             mail_data.order_id = orderdata._id;
                                    //             events.emit('neworderto_admin', mail_data, function (err, result) { });
                                    //         }
                                    //         var mail_data = {};
                                    //         mail_data.user_id = orderdata.user_id;
                                    //         mail_data.order_id = orderdata._id;
                                    //         events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                    //         if (req.body.refer_offer) {
                                    //             var expires = req.body.refer_offer.expire_date;
                                    //             db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                                    //             if (user.initprocess == 'onorder') {
                                    //                 // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
                                    //                 var coupondata = {};
                                    //                 coupondata.discount_amount = user.initoffer.discount_amount;
                                    //                 coupondata.cart_amount = user.initoffer.cart_amount;
                                    //                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                    //                 //console.log('coupon_data', coupondata)
                                    //                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                    //                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                    //             }
                                    //         } else if (user.initprocess == 'onorder') {
                                    //             var coupondata = {};
                                    //             coupondata.discount_amount = user.initoffer.discount_amount;
                                    //             coupondata.cart_amount = user.initoffer.cart_amount;
                                    //             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                    //             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                    //             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                    //         }
                                    //         done(null, {
                                    //             "status": '1',
                                    //             "response": 'Successfully your order registered',
                                    //             "order_id": orderdata.order_id,
                                    //         });
                                    //     }
                                    // });
                                }
                                // db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
                                //     if (err || !usagelimit || usagelimit.length == 0) {
                                //         done("Sorry error in coupon..!", {});
                                //     } else {
                                //         var usagelimits = usagelimit[0].usage.total_coupons;
                                //         var result = usagelimits - 1;
                                //         var use = parseInt(usagelimit[0].used) + parseInt(1);
                                //         if (result <= 0) {
                                //             result = 0;
                                //         }
                                //         db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                                //             if (err || result.nModified == 0) {
                                //                 done("Error in coupon updation..!", {});
                                //             } else {
                                //                 var android_restaurant = req.body.restaurant_id;
                                //                 var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                //                 var response_time = CONFIG.respond_timeout;
                                //                 var action = 'order_request';
                                //                 var options = [orderdata.order_id, android_restaurant, response_time, action];
                                //                 if (orderdata.schedule_type == 0) {
                                //                     // for (var i = 1; i == 1; i++) {
                                //                     //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                //                     // }
                                //                     var noti_data = {};
                                //                     noti_data.rest_id = rest._id;
                                //                     noti_data.order_id = orderdata.order_id;
                                //                     noti_data._id = orderdata._id;
                                //                     noti_data.user_id = orderdata.user_id;
                                //                     noti_data.user_name = user.username;
                                //                     noti_data.schedule_type = data.schedule_type;
                                //                     noti_data.order_type = 'user';
                                //                     //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                                //                     io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                //                     io.of('/chat').emit('adminnotify', noti_data);
                                //                     // var mail_data = {};
                                //                     // mail_data.user_id = user._id;
                                //                     // mail_data.order_id = orderdata._id;
                                //                     // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                //                     var mail_data = {};
                                //                     mail_data.user_id = user._id;
                                //                     mail_data.order_id = orderdata._id;
                                //                     events.emit('neworderto_admin', mail_data, function (err, result) { });
                                //                 }
                                //                 var mail_data = {};
                                //                 mail_data.user_id = orderdata.user_id;
                                //                 mail_data.order_id = orderdata._id;
                                //                 events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                //                 if (req.body.refer_offer) {
                                //                     var expires = req.body.refer_offer.expire_date;
                                //                     db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                                //                     if (user.initprocess == 'onorder') {
                                //                         // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
                                //                         var coupondata = {};
                                //                         coupondata.discount_amount = user.initoffer.discount_amount;
                                //                         coupondata.cart_amount = user.initoffer.cart_amount;
                                //                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                //                         //console.log('coupon_data', coupondata)
                                //                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                //                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                //                     }
                                //                 } else if (user.initprocess == 'onorder') {
                                //                     var coupondata = {};
                                //                     coupondata.discount_amount = user.initoffer.discount_amount;
                                //                     coupondata.cart_amount = user.initoffer.cart_amount;
                                //                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                //                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                //                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                //                 }
                                //                 done(null, {
                                //                     "status": '1',
                                //                     "response": 'Successfully your order registered',
                                //                     "order_id": orderdata.order_id,
                                //                 });
                                //             }
                                //         });
                                //     }
                                // });
                            } else {
                                const cart_details = await db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {})
                                if (!cart_details) {
                                    done('Error in cart', {});
                                } else {
                                    if (cart_details && typeof cart_details.doc._id != 'undefined') {
                                        var updatedoc = { 'cart_details': cart_details.doc };
                                        await db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {})
                                        await db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id })

                                        // db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                                        // db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                                    } else {
                                        done('Error in cart', {});
                                    }
                                }

                                if (orderdata.schedule_type == 0) {
                                    var android_restaurant = req.body.city_id;
                                    var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                    var response_time = CONFIG.respond_timeout;
                                    var action = 'order_request';
                                    var options = [orderdata.order_id, android_restaurant, response_time, action];
                                    // for (var i = 1; i == 1; i++) {
                                    //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                    // }
                                    var noti_data = {};
                                    noti_data.rest_id = rest._id;
                                    noti_data.user_id = orderdata.user_id;
                                    noti_data._id = orderdata._id;
                                    noti_data.order_id = orderdata.order_id;
                                    noti_data.user_name = user.username;
                                    noti_data.order_type = 'user';
                                    noti_data.schedule_type = data.schedule_type;
                                    //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                                    io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                    io.of('/chat').emit('adminnotify', noti_data);
                                    // var mail_data = {};
                                    // mail_data.user_id = user._id;
                                    // mail_data.order_id = orderdata._id;
                                    // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                    var mail_data = {};
                                    mail_data.user_id = user._id;
                                    mail_data.order_id = orderdata._id;
                                    events.emit('neworderto_admin', mail_data, function (err, result) { });
                                }
                                var mail_data = {};
                                mail_data.user_id = orderdata.user_id;
                                mail_data.order_id = orderdata._id;
                                events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                if (req.body.refer_offer) {
                                    var expires = req.body.refer_offer.expire_date; db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {})
                                    // db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                                    if (user.initprocess == 'onorder') {
                                        var coupondata = {};
                                        coupondata.discount_amount = user.initoffer.discount_amount;
                                        coupondata.cart_amount = user.initoffer.cart_amount;
                                        coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                        await db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {})
                                        await db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {})

                                        // db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                        // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                    }
                                } else if (user.initprocess == 'onorder') {
                                    var coupondata = {};
                                    coupondata.discount_amount = user.initoffer.discount_amount;
                                    coupondata.cart_amount = user.initoffer.cart_amount;
                                    coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                                    await db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {})
                                    await db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {})

                                    // db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                                    // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                                }
                                done(null, {
                                    "status": '1',
                                    "response": 'Successfully your order registered',
                                    "order_id": orderdata.order_id,
                                });
                            }
                        }
                        // db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                        //     if (err || response.nModified == 0) {
                        //         done('Error in order', {});
                        //     } else {
                        //         if (data.coupon_code) {
                        //             db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                        //                 if (err || !cart_details) {
                        //                     done('Error in cart', {});
                        //                 } else {
                        //                     if (cart_details && typeof cart_details._id != 'undefined') {
                        //                         var updatedoc = { 'cart_details': cart_details };
                        //                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                        //                         db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                        //                     } else {
                        //                         done('Error in cart', {});
                        //                     }
                        //                 }
                        //             })
                        //             db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
                        //                 if (err || !usagelimit || usagelimit.length == 0) {
                        //                     done("Sorry error in coupon..!", {});
                        //                 } else {
                        //                     var usagelimits = usagelimit[0].usage.total_coupons;
                        //                     var result = usagelimits - 1;
                        //                     var use = parseInt(usagelimit[0].used) + parseInt(1);
                        //                     if (result <= 0) {
                        //                         result = 0;
                        //                     }
                        //                     db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                        //                         if (err || result.nModified == 0) {
                        //                             done("Error in coupon updation..!", {});
                        //                         } else {
                        //                             var android_restaurant = req.body.restaurant_id;
                        //                             var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                        //                             var response_time = CONFIG.respond_timeout;
                        //                             var action = 'order_request';
                        //                             var options = [orderdata.order_id, android_restaurant, response_time, action];
                        //                             if (orderdata.schedule_type == 0) {
                        //                                 // for (var i = 1; i == 1; i++) {
                        //                                 //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                        //                                 // }
                        //                                 var noti_data = {};
                        //                                 noti_data.rest_id = rest._id;
                        //                                 noti_data.order_id = orderdata.order_id;
                        //                                 noti_data._id = orderdata._id;
                        //                                 noti_data.user_id = orderdata.user_id;
                        //                                 noti_data.user_name = user.username;
                        //                                 noti_data.schedule_type = data.schedule_type;
                        //                                 noti_data.order_type = 'user';
                        //                                 //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                        //                                 io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                        //                                 io.of('/chat').emit('adminnotify', noti_data);
                        //                                 // var mail_data = {};
                        //                                 // mail_data.user_id = user._id;
                        //                                 // mail_data.order_id = orderdata._id;
                        //                                 // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                        //                                 var mail_data = {};
                        //                                 mail_data.user_id = user._id;
                        //                                 mail_data.order_id = orderdata._id;
                        //                                 events.emit('neworderto_admin', mail_data, function (err, result) { });
                        //                             }
                        //                             var mail_data = {};
                        //                             mail_data.user_id = orderdata.user_id;
                        //                             mail_data.order_id = orderdata._id;
                        //                             events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                        //                             if (req.body.refer_offer) {
                        //                                 var expires = req.body.refer_offer.expire_date;
                        //                                 db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                        //                                 if (user.initprocess == 'onorder') {
                        //                                     // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
                        //                                     var coupondata = {};
                        //                                     coupondata.discount_amount = user.initoffer.discount_amount;
                        //                                     coupondata.cart_amount = user.initoffer.cart_amount;
                        //                                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                        //                                     //console.log('coupon_data', coupondata)
                        //                                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                        //                                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                        //                                 }
                        //                             } else if (user.initprocess == 'onorder') {
                        //                                 var coupondata = {};
                        //                                 coupondata.discount_amount = user.initoffer.discount_amount;
                        //                                 coupondata.cart_amount = user.initoffer.cart_amount;
                        //                                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                        //                                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                        //                                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                        //                             }
                        //                             done(null, {
                        //                                 "status": '1',
                        //                                 "response": 'Successfully your order registered',
                        //                                 "order_id": orderdata.order_id,
                        //                             });
                        //                         }
                        //                     });
                        //                 }
                        //             });
                        //         } else {
                        //             db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                        //                 if (err || !cart_details) {
                        //                     done('Error in cart', {});
                        //                 } else {
                        //                     if (cart_details && typeof cart_details._id != 'undefined') {
                        //                         var updatedoc = { 'cart_details': cart_details };
                        //                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                        //                         db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                        //                     } else {
                        //                         done('Error in cart', {});
                        //                     }
                        //                 }
                        //             });
                        //             if (orderdata.schedule_type == 0) {
                        //                 var android_restaurant = req.body.city_id;
                        //                 var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                        //                 var response_time = CONFIG.respond_timeout;
                        //                 var action = 'order_request';
                        //                 var options = [orderdata.order_id, android_restaurant, response_time, action];
                        //                 // for (var i = 1; i == 1; i++) {
                        //                 //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                        //                 // }
                        //                 var noti_data = {};
                        //                 noti_data.rest_id = rest._id;
                        //                 noti_data.user_id = orderdata.user_id;
                        //                 noti_data._id = orderdata._id;
                        //                 noti_data.order_id = orderdata.order_id;
                        //                 noti_data.user_name = user.username;
                        //                 noti_data.order_type = 'user';
                        //                 noti_data.schedule_type = data.schedule_type;
                        //                 //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                        //                 io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                        //                 io.of('/chat').emit('adminnotify', noti_data);
                        //                 // var mail_data = {};
                        //                 // mail_data.user_id = user._id;
                        //                 // mail_data.order_id = orderdata._id;
                        //                 // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                        //                 var mail_data = {};
                        //                 mail_data.user_id = user._id;
                        //                 mail_data.order_id = orderdata._id;
                        //                 events.emit('neworderto_admin', mail_data, function (err, result) { });
                        //             }
                        //             var mail_data = {};
                        //             mail_data.user_id = orderdata.user_id;
                        //             mail_data.order_id = orderdata._id;
                        //             events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                        //             if (req.body.refer_offer) {
                        //                 var expires = req.body.refer_offer.expire_date;
                        //                 db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                        //                 if (user.initprocess == 'onorder') {
                        //                     var coupondata = {};
                        //                     coupondata.discount_amount = user.initoffer.discount_amount;
                        //                     coupondata.cart_amount = user.initoffer.cart_amount;
                        //                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                        //                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                        //                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                        //                 }
                        //             } else if (user.initprocess == 'onorder') {
                        //                 var coupondata = {};
                        //                 coupondata.discount_amount = user.initoffer.discount_amount;
                        //                 coupondata.cart_amount = user.initoffer.cart_amount;
                        //                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                        //                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                        //                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                        //             }
                        //             done(null, {
                        //                 "status": '1',
                        //                 "response": 'Successfully your order registered',
                        //                 "order_id": orderdata.order_id,
                        //             });
                        //         }
                        //     }
                        // });
                    }
                    // db.InsertDocument('orders', data, function (err, orderdata) {
                    //     if (err || orderdata.nModified == 0) {
                    //         done('Error in order', {});
                    //     } else {
                    //         //Hot Selling concept.
                    //         var each = require('sync-each');
                    //         if (orderdata && typeof orderdata.foods != 'undefined' && orderdata.foods.length > 0) {
                    //             each(orderdata.foods,
                    //                 function (getMessage, next) {
                    //                     db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
                    //                         if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
                    //                             if (typeof foodDetails.hotselling != 'undefined') {
                    //                                 var count = foodDetails.hotselling + 1;
                    //                                 var up_dates = { 'hotselling': count };
                    //                                 db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                    //                                 })

                    //                             } else {
                    //                                 var up_dates = { 'hotselling': 1 };
                    //                                 db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
                    //                             }
                    //                         }
                    //                     })
                    //                     process.nextTick(next);
                    //                 },
                    //                 function (err, transformedItems) { }
                    //             );
                    //         }
                    //         var order_id = orderdata.order_id;
                    //         req.body.order_id = orderdata._id;
                    //         req.body.user_id = data.user_id;
                    //         var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                    //         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                    //             if (err || response.nModified == 0) {
                    //                 done('Error in order', {});
                    //             } else {
                    //                 if (data.coupon_code) {
                    //                     db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                    //                         if (err || !cart_details) {
                    //                             done('Error in cart', {});
                    //                         } else {
                    //                             if (cart_details && typeof cart_details._id != 'undefined') {
                    //                                 var updatedoc = { 'cart_details': cart_details };
                    //                                 db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                    //                                 db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                    //                             } else {
                    //                                 done('Error in cart', {});
                    //                             }
                    //                         }
                    //                     })
                    //                     db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
                    //                         if (err || !usagelimit || usagelimit.length == 0) {
                    //                             done("Sorry error in coupon..!", {});
                    //                         } else {
                    //                             var usagelimits = usagelimit[0].usage.total_coupons;
                    //                             var result = usagelimits - 1;
                    //                             var use = parseInt(usagelimit[0].used) + parseInt(1);
                    //                             if (result <= 0) {
                    //                                 result = 0;
                    //                             }
                    //                             db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                    //                                 if (err || result.nModified == 0) {
                    //                                     done("Error in coupon updation..!", {});
                    //                                 } else {
                    //                                     var android_restaurant = req.body.restaurant_id;
                    //                                     var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                    //                                     var response_time = CONFIG.respond_timeout;
                    //                                     var action = 'order_request';
                    //                                     var options = [orderdata.order_id, android_restaurant, response_time, action];
                    //                                     if (orderdata.schedule_type == 0) {
                    //                                         // for (var i = 1; i == 1; i++) {
                    //                                         //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                    //                                         // }
                    //                                         var noti_data = {};
                    //                                         noti_data.rest_id = rest._id;
                    //                                         noti_data.order_id = orderdata.order_id;
                    //                                         noti_data._id = orderdata._id;
                    //                                         noti_data.user_id = orderdata.user_id;
                    //                                         noti_data.user_name = user.username;
                    //                                         noti_data.schedule_type = data.schedule_type;
                    //                                         noti_data.order_type = 'user';
                    //                                         //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                    //                                         io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                    //                                         io.of('/chat').emit('adminnotify', noti_data);
                    //                                         // var mail_data = {};
                    //                                         // mail_data.user_id = user._id;
                    //                                         // mail_data.order_id = orderdata._id;
                    //                                         // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                    //                                         var mail_data = {};
                    //                                         mail_data.user_id = user._id;
                    //                                         mail_data.order_id = orderdata._id;
                    //                                         events.emit('neworderto_admin', mail_data, function (err, result) { });
                    //                                     }
                    //                                     var mail_data = {};
                    //                                     mail_data.user_id = orderdata.user_id;
                    //                                     mail_data.order_id = orderdata._id;
                    //                                     events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                    //                                     if (req.body.refer_offer) {
                    //                                         var expires = req.body.refer_offer.expire_date;
                    //                                         db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                    //                                         if (user.initprocess == 'onorder') {
                    //                                             // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
                    //                                             var coupondata = {};
                    //                                             coupondata.discount_amount = user.initoffer.discount_amount;
                    //                                             coupondata.cart_amount = user.initoffer.cart_amount;
                    //                                             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                    //                                             //console.log('coupon_data', coupondata)
                    //                                             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                    //                                             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                    //                                         }
                    //                                     } else if (user.initprocess == 'onorder') {
                    //                                         var coupondata = {};
                    //                                         coupondata.discount_amount = user.initoffer.discount_amount;
                    //                                         coupondata.cart_amount = user.initoffer.cart_amount;
                    //                                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                    //                                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                    //                                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                    //                                     }
                    //                                     done(null, {
                    //                                         "status": '1',
                    //                                         "response": 'Successfully your order registered',
                    //                                         "order_id": orderdata.order_id,
                    //                                     });
                    //                                 }
                    //                             });
                    //                         }
                    //                     });
                    //                 } else {
                    //                     db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                    //                         if (err || !cart_details) {
                    //                             done('Error in cart', {});
                    //                         } else {
                    //                             if (cart_details && typeof cart_details._id != 'undefined') {
                    //                                 var updatedoc = { 'cart_details': cart_details };
                    //                                 db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                    //                                 db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                    //                             } else {
                    //                                 done('Error in cart', {});
                    //                             }
                    //                         }
                    //                     });
                    //                     if (orderdata.schedule_type == 0) {
                    //                         var android_restaurant = req.body.city_id;
                    //                         var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                    //                         var response_time = CONFIG.respond_timeout;
                    //                         var action = 'order_request';
                    //                         var options = [orderdata.order_id, android_restaurant, response_time, action];
                    //                         // for (var i = 1; i == 1; i++) {
                    //                         //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                    //                         // }
                    //                         var noti_data = {};
                    //                         noti_data.rest_id = rest._id;
                    //                         noti_data.user_id = orderdata.user_id;
                    //                         noti_data._id = orderdata._id;
                    //                         noti_data.order_id = orderdata.order_id;
                    //                         noti_data.user_name = user.username;
                    //                         noti_data.order_type = 'user';
                    //                         noti_data.schedule_type = data.schedule_type;
                    //                         //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                    //                         io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                    //                         io.of('/chat').emit('adminnotify', noti_data);
                    //                         // var mail_data = {};
                    //                         // mail_data.user_id = user._id;
                    //                         // mail_data.order_id = orderdata._id;
                    //                         // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                    //                         var mail_data = {};
                    //                         mail_data.user_id = user._id;
                    //                         mail_data.order_id = orderdata._id;
                    //                         events.emit('neworderto_admin', mail_data, function (err, result) { });
                    //                     }
                    //                     var mail_data = {};
                    //                     mail_data.user_id = orderdata.user_id;
                    //                     mail_data.order_id = orderdata._id;
                    //                     events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                    //                     if (req.body.refer_offer) {
                    //                         var expires = req.body.refer_offer.expire_date;
                    //                         db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                    //                         if (user.initprocess == 'onorder') {
                    //                             var coupondata = {};
                    //                             coupondata.discount_amount = user.initoffer.discount_amount;
                    //                             coupondata.cart_amount = user.initoffer.cart_amount;
                    //                             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                    //                             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                    //                             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                    //                         }
                    //                     } else if (user.initprocess == 'onorder') {
                    //                         var coupondata = {};
                    //                         coupondata.discount_amount = user.initoffer.discount_amount;
                    //                         coupondata.cart_amount = user.initoffer.cart_amount;
                    //                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                    //                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                    //                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                    //                     }
                    //                     done(null, {
                    //                         "status": '1',
                    //                         "response": 'Successfully your order registered',
                    //                         "order_id": orderdata.order_id,
                    //                     });
                    //                 }
                    //             }
                    //         });
                    //     }
                    // });
                }
                // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                //     if (err) {
                //         done('Error in settings', {});
                //     } else {
                //         var billings = {};
                //         billings.amount = {};
                //         billings.amount.total = req.body.total;
                //         billings.amount.coupon_discount = req.body.coupon_price || 0;
                //         billings.amount.food_offer_price = req.body.food_offer_price || 0;
                //         billings.amount.offer_discount = req.body.offer_price || 0;
                //         billings.amount.delivery_amount = req.body.delivery_charge || 0;
                //         billings.amount.service_tax = req.body.service_tax || 0;
                //         // billings.amount.night_fee = req.body.night_fare || 0;
                //         // billings.amount.surge_fee = req.body.surge_fare || 0;
                //         billings.amount.grand_total = req.body.pay_total || 0;
                //         billings.amount.package_charge = req.body.package_charge || 0;
                //         if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
                //             data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                //         } else {
                //             data.order_id = req.body.order_id;
                //         }
                //         data.created_time = Date.now();
                //         if (data.schedule_type == 1) {
                //             data.created_time = data.schedule_time;
                //         }
                //         db.InsertDocument('orders', data, function (err, orderdata) {
                //             if (err || orderdata.nModified == 0) {
                //                 done('Error in order', {});
                //             } else {
                //                 //Hot Selling concept.
                //                 var each = require('sync-each');
                //                 if (orderdata && typeof orderdata.foods != 'undefined' && orderdata.foods.length > 0) {
                //                     each(orderdata.foods,
                //                         function (getMessage, next) {
                //                             db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
                //                                 if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
                //                                     if (typeof foodDetails.hotselling != 'undefined') {
                //                                         var count = foodDetails.hotselling + 1;
                //                                         var up_dates = { 'hotselling': count };
                //                                         db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
                //                                         })

                //                                     } else {
                //                                         var up_dates = { 'hotselling': 1 };
                //                                         db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
                //                                     }
                //                                 }
                //                             })
                //                             process.nextTick(next);
                //                         },
                //                         function (err, transformedItems) { }
                //                     );
                //                 }
                //                 var order_id = orderdata.order_id;
                //                 req.body.order_id = orderdata._id;
                //                 req.body.user_id = data.user_id;
                //                 var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
                //                 db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                //                     if (err || response.nModified == 0) {
                //                         done('Error in order', {});
                //                     } else {
                //                         if (data.coupon_code) {
                //                             db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                //                                 if (err || !cart_details) {
                //                                     done('Error in cart', {});
                //                                 } else {
                //                                     if (cart_details && typeof cart_details._id != 'undefined') {
                //                                         var updatedoc = { 'cart_details': cart_details };
                //                                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                //                                         db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                //                                     } else {
                //                                         done('Error in cart', {});
                //                                     }
                //                                 }
                //                             })
                //                             db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
                //                                 if (err || !usagelimit || usagelimit.length == 0) {
                //                                     done("Sorry error in coupon..!", {});
                //                                 } else {
                //                                     var usagelimits = usagelimit[0].usage.total_coupons;
                //                                     var result = usagelimits - 1;
                //                                     var use = parseInt(usagelimit[0].used) + parseInt(1);
                //                                     if (result <= 0) {
                //                                         result = 0;
                //                                     }
                //                                     db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                //                                         if (err || result.nModified == 0) {
                //                                             done("Error in coupon updation..!", {});
                //                                         } else {
                //                                             var android_restaurant = req.body.restaurant_id;
                //                                             var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                //                                             var response_time = CONFIG.respond_timeout;
                //                                             var action = 'order_request';
                //                                             var options = [orderdata.order_id, android_restaurant, response_time, action];
                //                                             if (orderdata.schedule_type == 0) {
                //                                                 // for (var i = 1; i == 1; i++) {
                //                                                 //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                //                                                 // }
                //                                                 var noti_data = {};
                //                                                 noti_data.rest_id = rest._id;
                //                                                 noti_data.order_id = orderdata.order_id;
                //                                                 noti_data._id = orderdata._id;
                //                                                 noti_data.user_id = orderdata.user_id;
                //                                                 noti_data.user_name = user.username;
                //                                                 noti_data.schedule_type = data.schedule_type;
                //                                                 noti_data.order_type = 'user';
                //                                                 //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                //                                                 io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                //                                                 io.of('/chat').emit('adminnotify', noti_data);
                //                                                 // var mail_data = {};
                //                                                 // mail_data.user_id = user._id;
                //                                                 // mail_data.order_id = orderdata._id;
                //                                                 // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                //                                                 var mail_data = {};
                //                                                 mail_data.user_id = user._id;
                //                                                 mail_data.order_id = orderdata._id;
                //                                                 events.emit('neworderto_admin', mail_data, function (err, result) { });
                //                                             }
                //                                             var mail_data = {};
                //                                             mail_data.user_id = orderdata.user_id;
                //                                             mail_data.order_id = orderdata._id;
                //                                             events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                //                                             if (req.body.refer_offer) {
                //                                                 var expires = req.body.refer_offer.expire_date;
                //                                                 db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                //                                                 if (user.initprocess == 'onorder') {
                //                                                     // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
                //                                                     var coupondata = {};
                //                                                     coupondata.discount_amount = user.initoffer.discount_amount;
                //                                                     coupondata.cart_amount = user.initoffer.cart_amount;
                //                                                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                //                                                     //console.log('coupon_data', coupondata)
                //                                                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                //                                                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                //                                                 }
                //                                             } else if (user.initprocess == 'onorder') {
                //                                                 var coupondata = {};
                //                                                 coupondata.discount_amount = user.initoffer.discount_amount;
                //                                                 coupondata.cart_amount = user.initoffer.cart_amount;
                //                                                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                //                                                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                //                                                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                //                                             }
                //                                             done(null, {
                //                                                 "status": '1',
                //                                                 "response": 'Successfully your order registered',
                //                                                 "order_id": orderdata.order_id,
                //                                             });
                //                                         }
                //                                     });
                //                                 }
                //                             });
                //                         } else {
                //                             db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                //                                 if (err || !cart_details) {
                //                                     done('Error in cart', {});
                //                                 } else {
                //                                     if (cart_details && typeof cart_details._id != 'undefined') {
                //                                         var updatedoc = { 'cart_details': cart_details };
                //                                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
                //                                         db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                //                                     } else {
                //                                         done('Error in cart', {});
                //                                     }
                //                                 }
                //                             });
                //                             if (orderdata.schedule_type == 0) {
                //                                 var android_restaurant = req.body.city_id;
                //                                 var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                //                                 var response_time = CONFIG.respond_timeout;
                //                                 var action = 'order_request';
                //                                 var options = [orderdata.order_id, android_restaurant, response_time, action];
                //                                 // for (var i = 1; i == 1; i++) {
                //                                 //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                //                                 // }
                //                                 var noti_data = {};
                //                                 noti_data.rest_id = rest._id;
                //                                 noti_data.user_id = orderdata.user_id;
                //                                 noti_data._id = orderdata._id;
                //                                 noti_data.order_id = orderdata.order_id;
                //                                 noti_data.user_name = user.username;
                //                                 noti_data.order_type = 'user';
                //                                 noti_data.schedule_type = data.schedule_type;
                //                                 //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
                //                                 io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                //                                 io.of('/chat').emit('adminnotify', noti_data);
                //                                 // var mail_data = {};
                //                                 // mail_data.user_id = user._id;
                //                                 // mail_data.order_id = orderdata._id;
                //                                 // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                //                                 var mail_data = {};
                //                                 mail_data.user_id = user._id;
                //                                 mail_data.order_id = orderdata._id;
                //                                 events.emit('neworderto_admin', mail_data, function (err, result) { });
                //                             }
                //                             var mail_data = {};
                //                             mail_data.user_id = orderdata.user_id;
                //                             mail_data.order_id = orderdata._id;
                //                             events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                //                             if (req.body.refer_offer) {
                //                                 var expires = req.body.refer_offer.expire_date;
                //                                 db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
                //                                 if (user.initprocess == 'onorder') {
                //                                     var coupondata = {};
                //                                     coupondata.discount_amount = user.initoffer.discount_amount;
                //                                     coupondata.cart_amount = user.initoffer.cart_amount;
                //                                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                //                                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                //                                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                //                                 }
                //                             } else if (user.initprocess == 'onorder') {
                //                                 var coupondata = {};
                //                                 coupondata.discount_amount = user.initoffer.discount_amount;
                //                                 coupondata.cart_amount = user.initoffer.cart_amount;
                //                                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
                //                                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
                //                                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
                //                             }
                //                             done(null, {
                //                                 "status": '1',
                //                                 "response": 'Successfully your order registered',
                //                                 "order_id": orderdata.order_id,
                //                             });
                //                         }
                //                     }
                //                 });
                //             }
                //         });
                //     }
                // });
            }
            // db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
            //     if (err || !user) {
            //         done('Error in user', {});
            //     } else {
            //         db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            //             if (err) {
            //                 done('Error in settings', {});
            //             } else {
            //                 var billings = {};
            //                 billings.amount = {};
            //                 billings.amount.total = req.body.total;
            //                 billings.amount.coupon_discount = req.body.coupon_price || 0;
            //                 billings.amount.food_offer_price = req.body.food_offer_price || 0;
            //                 billings.amount.offer_discount = req.body.offer_price || 0;
            //                 billings.amount.delivery_amount = req.body.delivery_charge || 0;
            //                 billings.amount.service_tax = req.body.service_tax || 0;
            //                 // billings.amount.night_fee = req.body.night_fare || 0;
            //                 // billings.amount.surge_fee = req.body.surge_fare || 0;
            //                 billings.amount.grand_total = req.body.pay_total || 0;
            //                 billings.amount.package_charge = req.body.package_charge || 0;
            //                 if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
            //                     data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
            //                 } else {
            //                     data.order_id = req.body.order_id;
            //                 }
            //                 data.created_time = Date.now();
            //                 if (data.schedule_type == 1) {
            //                     data.created_time = data.schedule_time;
            //                 }
            //                 db.InsertDocument('orders', data, function (err, orderdata) {
            //                     if (err || orderdata.nModified == 0) {
            //                         done('Error in order', {});
            //                     } else {
            //                         //Hot Selling concept.
            //                         var each = require('sync-each');
            //                         if (orderdata && typeof orderdata.foods != 'undefined' && orderdata.foods.length > 0) {
            //                             each(orderdata.foods,
            //                                 function (getMessage, next) {
            //                                     db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
            //                                         if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
            //                                             if (typeof foodDetails.hotselling != 'undefined') {
            //                                                 var count = foodDetails.hotselling + 1;
            //                                                 var up_dates = { 'hotselling': count };
            //                                                 db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
            //                                                 })

            //                                             } else {
            //                                                 var up_dates = { 'hotselling': 1 };
            //                                                 db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
            //                                             }
            //                                         }
            //                                     })
            //                                     process.nextTick(next);
            //                                 },
            //                                 function (err, transformedItems) { }
            //                             );
            //                         }
            //                         var order_id = orderdata.order_id;
            //                         req.body.order_id = orderdata._id;
            //                         req.body.user_id = data.user_id;
            //                         var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
            //                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
            //                             if (err || response.nModified == 0) {
            //                                 done('Error in order', {});
            //                             } else {
            //                                 if (data.coupon_code) {
            //                                     db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
            //                                         if (err || !cart_details) {
            //                                             done('Error in cart', {});
            //                                         } else {
            //                                             if (cart_details && typeof cart_details._id != 'undefined') {
            //                                                 var updatedoc = { 'cart_details': cart_details };
            //                                                 db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
            //                                                 db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
            //                                             } else {
            //                                                 done('Error in cart', {});
            //                                             }
            //                                         }
            //                                     })
            //                                     db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
            //                                         if (err || !usagelimit || usagelimit.length == 0) {
            //                                             done("Sorry error in coupon..!", {});
            //                                         } else {
            //                                             var usagelimits = usagelimit[0].usage.total_coupons;
            //                                             var result = usagelimits - 1;
            //                                             var use = parseInt(usagelimit[0].used) + parseInt(1);
            //                                             if (result <= 0) {
            //                                                 result = 0;
            //                                             }
            //                                             db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
            //                                                 if (err || result.nModified == 0) {
            //                                                     done("Error in coupon updation..!", {});
            //                                                 } else {
            //                                                     var android_restaurant = req.body.restaurant_id;
            //                                                     var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
            //                                                     var response_time = CONFIG.respond_timeout;
            //                                                     var action = 'order_request';
            //                                                     var options = [orderdata.order_id, android_restaurant, response_time, action];
            //                                                     if (orderdata.schedule_type == 0) {
            //                                                         // for (var i = 1; i == 1; i++) {
            //                                                         //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
            //                                                         // }
            //                                                         var noti_data = {};
            //                                                         noti_data.rest_id = rest._id;
            //                                                         noti_data.order_id = orderdata.order_id;
            //                                                         noti_data._id = orderdata._id;
            //                                                         noti_data.user_id = orderdata.user_id;
            //                                                         noti_data.user_name = user.username;
            //                                                         noti_data.schedule_type = data.schedule_type;
            //                                                         noti_data.order_type = 'user';
            //                                                         //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
            //                                                         io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
            //                                                         io.of('/chat').emit('adminnotify', noti_data);
            //                                                         // var mail_data = {};
            //                                                         // mail_data.user_id = user._id;
            //                                                         // mail_data.order_id = orderdata._id;
            //                                                         // events.emit('restaurant_new_order', mail_data, function (err, result) { });
            //                                                         var mail_data = {};
            //                                                         mail_data.user_id = user._id;
            //                                                         mail_data.order_id = orderdata._id;
            //                                                         events.emit('neworderto_admin', mail_data, function (err, result) { });
            //                                                     }
            //                                                     var mail_data = {};
            //                                                     mail_data.user_id = orderdata.user_id;
            //                                                     mail_data.order_id = orderdata._id;
            //                                                     events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
            //                                                     if (req.body.refer_offer) {
            //                                                         var expires = req.body.refer_offer.expire_date;
            //                                                         db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
            //                                                         if (user.initprocess == 'onorder') {
            //                                                             // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
            //                                                             var coupondata = {};
            //                                                             coupondata.discount_amount = user.initoffer.discount_amount;
            //                                                             coupondata.cart_amount = user.initoffer.cart_amount;
            //                                                             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
            //                                                             //console.log('coupon_data', coupondata)
            //                                                             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
            //                                                             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
            //                                                         }
            //                                                     } else if (user.initprocess == 'onorder') {
            //                                                         var coupondata = {};
            //                                                         coupondata.discount_amount = user.initoffer.discount_amount;
            //                                                         coupondata.cart_amount = user.initoffer.cart_amount;
            //                                                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
            //                                                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
            //                                                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
            //                                                     }
            //                                                     done(null, {
            //                                                         "status": '1',
            //                                                         "response": 'Successfully your order registered',
            //                                                         "order_id": orderdata.order_id,
            //                                                     });
            //                                                 }
            //                                             });
            //                                         }
            //                                     });
            //                                 } else {
            //                                     db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
            //                                         if (err || !cart_details) {
            //                                             done('Error in cart', {});
            //                                         } else {
            //                                             if (cart_details && typeof cart_details._id != 'undefined') {
            //                                                 var updatedoc = { 'cart_details': cart_details };
            //                                                 db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
            //                                                 db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
            //                                             } else {
            //                                                 done('Error in cart', {});
            //                                             }
            //                                         }
            //                                     });
            //                                     if (orderdata.schedule_type == 0) {
            //                                         var android_restaurant = req.body.city_id;
            //                                         var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
            //                                         var response_time = CONFIG.respond_timeout;
            //                                         var action = 'order_request';
            //                                         var options = [orderdata.order_id, android_restaurant, response_time, action];
            //                                         // for (var i = 1; i == 1; i++) {
            //                                         //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
            //                                         // }
            //                                         var noti_data = {};
            //                                         noti_data.rest_id = rest._id;
            //                                         noti_data.user_id = orderdata.user_id;
            //                                         noti_data._id = orderdata._id;
            //                                         noti_data.order_id = orderdata.order_id;
            //                                         noti_data.user_name = user.username;
            //                                         noti_data.order_type = 'user';
            //                                         noti_data.schedule_type = data.schedule_type;
            //                                         //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
            //                                         io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
            //                                         io.of('/chat').emit('adminnotify', noti_data);
            //                                         // var mail_data = {};
            //                                         // mail_data.user_id = user._id;
            //                                         // mail_data.order_id = orderdata._id;
            //                                         // events.emit('restaurant_new_order', mail_data, function (err, result) { });
            //                                         var mail_data = {};
            //                                         mail_data.user_id = user._id;
            //                                         mail_data.order_id = orderdata._id;
            //                                         events.emit('neworderto_admin', mail_data, function (err, result) { });
            //                                     }
            //                                     var mail_data = {};
            //                                     mail_data.user_id = orderdata.user_id;
            //                                     mail_data.order_id = orderdata._id;
            //                                     events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
            //                                     if (req.body.refer_offer) {
            //                                         var expires = req.body.refer_offer.expire_date;
            //                                         db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
            //                                         if (user.initprocess == 'onorder') {
            //                                             var coupondata = {};
            //                                             coupondata.discount_amount = user.initoffer.discount_amount;
            //                                             coupondata.cart_amount = user.initoffer.cart_amount;
            //                                             coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
            //                                             db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
            //                                             db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
            //                                         }
            //                                     } else if (user.initprocess == 'onorder') {
            //                                         var coupondata = {};
            //                                         coupondata.discount_amount = user.initoffer.discount_amount;
            //                                         coupondata.cart_amount = user.initoffer.cart_amount;
            //                                         coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
            //                                         db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
            //                                         db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
            //                                     }
            //                                     done(null, {
            //                                         "status": '1',
            //                                         "response": 'Successfully your order registered',
            //                                         "order_id": orderdata.order_id,
            //                                     });
            //                                 }
            //                             }
            //                         });
            //                     }
            //                 });
            //             }
            //         });
            //     }
            // });
        }
        // db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
        //     if (err || !rest) {
        //         done('Error in city', {});
        //     } else {
        //         // data.com_type = rest.com_type;
        //         // data.sub_city = rest.sub_city;
        //         // data.main_city = rest.main_city;
        //         // data.unique_commission = rest.unique_commission;
        //         // if (rest.efp_time && req.body.schedule_type == 1) {
        //         //     data.schedule_time = data.schedule_time - (rest.efp_time * 60 * 1000);
        //         //     data.eta = rest.efp_time * 60 * 1000;
        //         // }
        //         db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
        //             if (err || !user) {
        //                 done('Error in user', {});
        //             } else {
        //                 db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        //                     if (err) {
        //                         done('Error in settings', {});
        //                     } else {
        //                         var billings = {};
        //                         billings.amount = {};
        //                         billings.amount.total = req.body.total;
        //                         billings.amount.coupon_discount = req.body.coupon_price || 0;
        //                         billings.amount.food_offer_price = req.body.food_offer_price || 0;
        //                         billings.amount.offer_discount = req.body.offer_price || 0;
        //                         billings.amount.delivery_amount = req.body.delivery_charge || 0;
        //                         billings.amount.service_tax = req.body.service_tax || 0;
        //                         // billings.amount.night_fee = req.body.night_fare || 0;
        //                         // billings.amount.surge_fee = req.body.surge_fare || 0;
        //                         billings.amount.grand_total = req.body.pay_total || 0;
        //                         billings.amount.package_charge = req.body.package_charge || 0;
        //                         if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
        //                             data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
        //                         } else {
        //                             data.order_id = req.body.order_id;
        //                         }
        //                         data.created_time = Date.now();
        //                         if (data.schedule_type == 1) {
        //                             data.created_time = data.schedule_time;
        //                         }
        //                         db.InsertDocument('orders', data, function (err, orderdata) {
        //                             if (err || orderdata.nModified == 0) {
        //                                 done('Error in order', {});
        //                             } else {
        //                                 //Hot Selling concept.
        //                                 var each = require('sync-each');
        //                                 if (orderdata && typeof orderdata.foods != 'undefined' && orderdata.foods.length > 0) {
        //                                     each(orderdata.foods,
        //                                         function (getMessage, next) {
        //                                             db.GetOneDocument('food', { _id: getMessage.id }, {}, {}, function (err, foodDetails) {
        //                                                 if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
        //                                                     if (typeof foodDetails.hotselling != 'undefined') {
        //                                                         var count = foodDetails.hotselling + 1;
        //                                                         var up_dates = { 'hotselling': count };
        //                                                         db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) {
        //                                                         })

        //                                                     } else {
        //                                                         var up_dates = { 'hotselling': 1 };
        //                                                         db.UpdateDocument('food', { '_id': foodDetails._id }, up_dates, {}, function (err, response) { })
        //                                                     }
        //                                                 }
        //                                             })
        //                                             process.nextTick(next);
        //                                         },
        //                                         function (err, transformedItems) { }
        //                                     );
        //                                 }
        //                                 var order_id = orderdata.order_id;
        //                                 req.body.order_id = orderdata._id;
        //                                 req.body.user_id = data.user_id;
        //                                 var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };
        //                                 db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
        //                                     if (err || response.nModified == 0) {
        //                                         done('Error in order', {});
        //                                     } else {
        //                                         if (data.coupon_code) {
        //                                             db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
        //                                                 if (err || !cart_details) {
        //                                                     done('Error in cart', {});
        //                                                 } else {
        //                                                     if (cart_details && typeof cart_details._id != 'undefined') {
        //                                                         var updatedoc = { 'cart_details': cart_details };
        //                                                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
        //                                                         db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
        //                                                     } else {
        //                                                         done('Error in cart', {});
        //                                                     }
        //                                                 }
        //                                             })
        //                                             db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
        //                                                 if (err || !usagelimit || usagelimit.length == 0) {
        //                                                     done("Sorry error in coupon..!", {});
        //                                                 } else {
        //                                                     var usagelimits = usagelimit[0].usage.total_coupons;
        //                                                     var result = usagelimits - 1;
        //                                                     var use = parseInt(usagelimit[0].used) + parseInt(1);
        //                                                     if (result <= 0) {
        //                                                         result = 0;
        //                                                     }
        //                                                     db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
        //                                                         if (err || result.nModified == 0) {
        //                                                             done("Error in coupon updation..!", {});
        //                                                         } else {
        //                                                             var android_restaurant = req.body.restaurant_id;
        //                                                             var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
        //                                                             var response_time = CONFIG.respond_timeout;
        //                                                             var action = 'order_request';
        //                                                             var options = [orderdata.order_id, android_restaurant, response_time, action];
        //                                                             if (orderdata.schedule_type == 0) {
        //                                                                 // for (var i = 1; i == 1; i++) {
        //                                                                 //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
        //                                                                 // }
        //                                                                 var noti_data = {};
        //                                                                 noti_data.rest_id = rest._id;
        //                                                                 noti_data.order_id = orderdata.order_id;
        //                                                                 noti_data._id = orderdata._id;
        //                                                                 noti_data.user_id = orderdata.user_id;
        //                                                                 noti_data.user_name = user.username;
        //                                                                 noti_data.schedule_type = data.schedule_type;
        //                                                                 noti_data.order_type = 'user';
        //                                                                 //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
        //                                                                 io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
        //                                                                 io.of('/chat').emit('adminnotify', noti_data);
        //                                                                 // var mail_data = {};
        //                                                                 // mail_data.user_id = user._id;
        //                                                                 // mail_data.order_id = orderdata._id;
        //                                                                 // events.emit('restaurant_new_order', mail_data, function (err, result) { });
        //                                                                 var mail_data = {};
        //                                                                 mail_data.user_id = user._id;
        //                                                                 mail_data.order_id = orderdata._id;
        //                                                                 events.emit('neworderto_admin', mail_data, function (err, result) { });
        //                                                             }
        //                                                             var mail_data = {};
        //                                                             mail_data.user_id = orderdata.user_id;
        //                                                             mail_data.order_id = orderdata._id;
        //                                                             events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
        //                                                             if (req.body.refer_offer) {
        //                                                                 var expires = req.body.refer_offer.expire_date;
        //                                                                 db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
        //                                                                 if (user.initprocess == 'onorder') {
        //                                                                     // db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initoffer: ""  } }, {}, function (err, referrer) {});
        //                                                                     var coupondata = {};
        //                                                                     coupondata.discount_amount = user.initoffer.discount_amount;
        //                                                                     coupondata.cart_amount = user.initoffer.cart_amount;
        //                                                                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
        //                                                                     //console.log('coupon_data', coupondata)
        //                                                                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
        //                                                                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
        //                                                                 }
        //                                                             } else if (user.initprocess == 'onorder') {
        //                                                                 var coupondata = {};
        //                                                                 coupondata.discount_amount = user.initoffer.discount_amount;
        //                                                                 coupondata.cart_amount = user.initoffer.cart_amount;
        //                                                                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
        //                                                                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
        //                                                                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
        //                                                             }
        //                                                             done(null, {
        //                                                                 "status": '1',
        //                                                                 "response": 'Successfully your order registered',
        //                                                                 "order_id": orderdata.order_id,
        //                                                             });
        //                                                         }
        //                                                     });
        //                                                 }
        //                                             });
        //                                         } else {
        //                                             db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
        //                                                 if (err || !cart_details) {
        //                                                     done('Error in cart', {});
        //                                                 } else {
        //                                                     if (cart_details && typeof cart_details._id != 'undefined') {
        //                                                         var updatedoc = { 'cart_details': cart_details };
        //                                                         db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) { });
        //                                                         db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
        //                                                     } else {
        //                                                         done('Error in cart', {});
        //                                                     }
        //                                                 }
        //                                             });
        //                                             if (orderdata.schedule_type == 0) {
        //                                                 var android_restaurant = req.body.city_id;
        //                                                 var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
        //                                                 var response_time = CONFIG.respond_timeout;
        //                                                 var action = 'order_request';
        //                                                 var options = [orderdata.order_id, android_restaurant, response_time, action];
        //                                                 // for (var i = 1; i == 1; i++) {
        //                                                 //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
        //                                                 // }
        //                                                 var noti_data = {};
        //                                                 noti_data.rest_id = rest._id;
        //                                                 noti_data.user_id = orderdata.user_id;
        //                                                 noti_data._id = orderdata._id;
        //                                                 noti_data.order_id = orderdata.order_id;
        //                                                 noti_data.user_name = user.username;
        //                                                 noti_data.order_type = 'user';
        //                                                 noti_data.schedule_type = data.schedule_type;
        //                                                 //io.of('/chat').in(rest._id).emit('restnotify', { restauranId: noti_data });
        //                                                 io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
        //                                                 io.of('/chat').emit('adminnotify', noti_data);
        //                                                 // var mail_data = {};
        //                                                 // mail_data.user_id = user._id;
        //                                                 // mail_data.order_id = orderdata._id;
        //                                                 // events.emit('restaurant_new_order', mail_data, function (err, result) { });
        //                                                 var mail_data = {};
        //                                                 mail_data.user_id = user._id;
        //                                                 mail_data.order_id = orderdata._id;
        //                                                 events.emit('neworderto_admin', mail_data, function (err, result) { });
        //                                             }
        //                                             var mail_data = {};
        //                                             mail_data.user_id = orderdata.user_id;
        //                                             mail_data.order_id = orderdata._id;
        //                                             events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
        //                                             if (req.body.refer_offer) {
        //                                                 var expires = req.body.refer_offer.expire_date;
        //                                                 db.UpdateDocument('users', { '_id': data.user_id }, { $pull: { refer_activity: { expire_date: { $eq: expires } } } }, {}, function (err, referrer) { });
        //                                                 if (user.initprocess == 'onorder') {
        //                                                     var coupondata = {};
        //                                                     coupondata.discount_amount = user.initoffer.discount_amount;
        //                                                     coupondata.cart_amount = user.initoffer.cart_amount;
        //                                                     coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
        //                                                     db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
        //                                                     db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
        //                                                 }
        //                                             } else if (user.initprocess == 'onorder') {
        //                                                 var coupondata = {};
        //                                                 coupondata.discount_amount = user.initoffer.discount_amount;
        //                                                 coupondata.cart_amount = user.initoffer.cart_amount;
        //                                                 coupondata.expire_date = Date.now() + (settings.settings.rov_period * 24 * 60 * 60 * 1000);
        //                                                 db.UpdateDocument('users', { 'unique_code': user.referral_code }, { $push: { refer_activity: coupondata } }, {}, function (err, referrer) { });
        //                                                 db.UpdateDocument('users', { '_id': data.user_id }, { $unset: { initprocess: 1, initoffer: "" } }, {}, function (err, referrer) { });
        //                                             }
        //                                             done(null, {
        //                                                 "status": '1',
        //                                                 "response": 'Successfully your order registered',
        //                                                 "order_id": orderdata.order_id,
        //                                             });
        //                                         }
        //                                     }
        //                                 });
        //                             }
        //                         });
        //                     }
        //                 });
        //             }
        //         });
        //     }
        // });
    });
    events.on('updateQuantity', async (req, res) => {
        try {

            let cartdetails = req.body.cart_details
            //let status = 2

            // console.log("------cartdetails--------------------------------cartdetails------------------------------------------cartdetails--------------")
            // console.log(req.body.selectedVariantId)
            // console.log("-------cartdetails-------------------------------cartdetails--------------------------------------------cartdetails------------")


            for (let i = 0; i < cartdetails.length; i++) {
                let getdocs = await db.GetOneDocument('food', { _id: new mongoose.Types.ObjectId(cartdetails[i].id) }, {}, {})
                if (!getdocs) {
                    console.log("update_quantityupdate_quantityupdate_quantity at line 7407")
                    res.send("no product found")
                } else {

                    if (cartdetails[i].size_status == 2 || status == 2) {

                        const condition = [
                            {
                                $match: { _id: new mongoose.Types.ObjectId(cartdetails[i].id) } // Match documents by _id
                            },
                            {
                                $project: {
                                    price_details: {
                                        $map: {
                                            input: "$price_details",
                                            as: "detail",
                                            in: {
                                                $cond: [
                                                    { $eq: ["$$detail._id", cartdetails[i].selectedVariantId] }, // Check if _id matches
                                                    { $mergeObjects: ["$$detail", { quantity: "5" }] }, // Update quantity if matched
                                                    "$$detail" // Otherwise, return the original detail
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        ];

                        let update_quantity = await db.UpdateDocument('food', { _id: new mongoose.Types.ObjectId(cartdetails[i].id) }, { 'quantity': update_quantity_value }, {})

                    } else {
                        let previous_quantity = getdocs.doc.quantity
                        let current_quan = cartdetails[i].quantity

                        let update_quantity_value = previous_quantity - cartdetails[i].quantity


                        // console.log("update_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_value")
                        // console.log(update_quantity_value)
                        // console.log("update_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_value")

                        // console.log(previous_quantity)

                        let update_quantity = await db.UpdateDocument('food', { _id: new mongoose.Types.ObjectId(cartdetails[i].id) }, { 'quantity': update_quantity_value }, {})

                        // console.log("update_quantityupdate_quantityupdate_quantity")

                        // console.log(update_quantity)
                        // console.log("update_quantityupdate_quantityupdate_quantity")

                    }







                }
            }




            // console.log("cart details ", req.body.cart_details)
            // console.log(res)

        } catch (e) {
            console.log("error at event listener of updateQuantity", e)
        }


    })
    return controller;
}

