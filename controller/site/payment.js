const { log, tryEach } = require('async');
const { fstat } = require('fs');

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
    var moment = require('moment');
    var jwt = require('jsonwebtoken');
    var stripe = require('stripe')('');
    var EventEmitter = require('events').EventEmitter;
    var events = new EventEmitter();
    var orderTimeLibrary = require('../../model/ordertime.js')(io);
    var paypal = require('../../controller/site/payment-gateways/paypal.js');
    const cashfree = require('../../controller/site/payment-gateways/cashfree.js');
    const razorpay = require("../../controller/site/payment-gateways/razorpay.js")
    const stripeconf = require("../../controller/site/payment-gateways/stripe.js")

    //var each = require('sync-each');
    var urlrequest = require('request');
    var chat = io.of('/chat');
    var axios = require('axios').default;
    var fs = require('fs');
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    };
    var getFullAddress = function (data) {
        return new Promise(function (resolve, reject) {
            db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
                if (err) {
                    res.send({ "status": 0, "errors": 'Error in settings..!' });
                } else {
                    var apiKey = socialsettings.settings.map_api.web_key;
                    if (typeof data != 'undefined' && typeof data.lat != 'undefined' && data.lat != '' && typeof data.lon != 'undefined' && data.lon != '') {
                        var lat = data.lat;
                        var lon = data.lon;
                        var NodeGeocoder = require('node-geocoder');
                        var options = {
                            provider: 'google',
                            httpAdapter: 'https', // Default
                            apiKey: apiKey, // for Mapquest, OpenCage, Google Premier
                            formatter: null // 'gpx', 'string', ...
                        };
                        var geocoder = NodeGeocoder(options);
                        geocoder.reverse({ lat: lat, lon: lon }).then(function (res) {
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
                                //console.log({ err: 0, message: '', result: { address: response } })

                                resolve({ err: 0, message: '', result: { address: response } });

                            } else {
                                var geocode = {
                                    'latitude': lat,
                                    'longitude': lon
                                };
                                var newdata = { address: {} };
                                GoogleAPI.geocodePromise(geocode).then(function (response) {

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
                                        //return new Promise(function (resolve, reject) {
                                        resolve({ err: 0, message: '', result: newdata });
                                        //})
                                    } else {
                                        //return new Promise(function (resolve, reject) {
                                        resolve({ err: 0, message: '', result: {} });
                                        //})
                                    }
                                }).catch(function (err) {
                                    var result = { err: 0, message: '', result: {} };
                                    //	return new Promise(function (resolve, reject) {
                                    resolve(result);
                                    //	})
                                });
                            }
                        }).catch(function (err) {
                            var result = { err: 0, message: '', result: {} };
                            //return new Promise(function (resolve, reject) {
                            resolve(result);
                            //})
                        });
                    } else {
                        //return new Promise(function (resolve, reject) {
                        resolve({ err: 0, message: '', result: {} });
                        //})
                    }
                }
            })
        })
    }
    controller.mipsPaymentrequest = async (req, res) => {
        console.log('hi this is your success for your');
        var data = {};
        data.status = '0';
        var message = '';
        // req.checkQuery('orderId', 'order id is required').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send({ "status": "0", "errors": errors[0].msg });
        //     return;
        // }
        const settings = await db.GetOneDocument('settings', { alias: 'general' }, {}, {})
        if (settings.status == false) {
            library.cleartemp({ id: new mongoose.Types.ObjectId(req.query.orderId), type: 1 });
            var siteur = settings.doc.settings.site_url + "/payment-failure"
            res.redirect(siteur);
        } else {
            const gateWay = await db.GetOneDocument('paymentgateway', { 'alias': 'mips', status: 1 }, {}, {})
            if (gateWay.status === false) {
                library.cleartemp({ id: new mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                var siteur = settings.doc.settings.site_url + "/payment-failure"
                res.redirect(siteur);
            } else {
                const order = await db.GetOneDocument('temporders', { '_id': new mongoose.Types.ObjectId(req.query.orderId) }, {}, {})
                if (order.status === false) {
                    library.cleartemp({ id: new mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                    var siteur = settings.doc.settings.site_url + "/payment-failure"
                    res.redirect(siteur);
                } else {
                    const user = await db.GetOneDocument('users', { '_id': order.doc.user_id }, {}, {})
                    if (user.status === false) {
                        library.cleartemp({ id: new mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                        var siteur = settings.doc.settings.site_url + "/payment-failure"
                        res.redirect(siteur);
                    } else {
                        if (order.doc.billings === undefined || order.doc.billings.amount === undefined || order.doc.billings.amount.grand_total === undefined || order.doc.billings.amount.grand_total <= 0) {
                            library.cleartemp({ id: new mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                            var siteur = settings.doc.settings.site_url + "/payment-failure"
                            res.redirect(siteur);
                        } else {

                            var url = "https://api.mips.mu/api/create_payment_request";
                            var signatureData = new Buffer('kanavu_fashion_ltd_h6tg4e:Nhy654rgu%tgdt579UHGTr43r%^ujoj7').toString('base64');
                            // console.log("signatureData", signatureData)
                            var options = {
                                method: 'POST',
                                url: 'https://api.mips.mu/api/create_payment_request',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Basic ${signatureData}`,
                                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
                                },
                                body: {
                                    "authentify": {
                                        "id_merchant": gateWay.doc.settings.id_merchant,
                                        "id_entity": gateWay.doc.settings.id_entity,
                                        "id_operator": gateWay.doc.settings.id_operator,
                                        "operator_password": gateWay.doc.settings.operator_password
                                    },
                                    request: {
                                        request_mode: 'simple',
                                        options: 'warranty',
                                        sending_mode: 'mail',
                                        request_title: 'User Order Placement',
                                        // exp_date: '2023-08-24',
                                        client_details: {
                                            first_name: user.doc.first_name,
                                            last_name: user.doc.last_name,
                                            client_email: order.doc.email ? order.doc.email : user.doc.email,
                                            phone_number: user.doc.phone.number
                                        },
                                        max_amount_total: 0,
                                        max_amount_per_claim: 0,
                                        max_frequency: 0,
                                    },
                                    initial_payment: { id_order: req.query.orderId, currency: 'MUR', amount: parseFloat(parseFloat(order.doc.billings.amount.grand_total).toFixed(2)) }
                                },
                                json: true
                            };
                            // var responseData = await axios.request(options)
                            console.log("responseData ++++++++++++++", options)
                            urlrequest(options, function (error, response, body) {
                                console.log(options, 'is it have options');
                                console.log(body, 'is it have body');
                                if (error) throw new Error(error);
                                if (body && body.operation_status == 'success') {
                                    var link;
                                    if (body && body.payment_link) {
                                        link = body.payment_link.url
                                    }
                                    if (link) {
                                        // var siteur = settings.doc.settings.site_url + "/payment-failure"
                                        // console.log(siteur,'site user');
                                        // res.redirect(siteur);
                                        console.log(link, 'this is the login');
                                        res.redirect(link)
                                    } else {
                                        var siteur = settings.doc.settings.site_url + "/payment-failure"
                                        res.redirect(siteur);
                                    }
                                }
                            });
                        }
                    }
                    // db.GetOneDocument('users', { '_id': order.user_id }, {}, {}, async (err, user) => {
                    //     if (err || !user) {
                    //         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                    //         var siteur = settings.settings.site_url + "/payment-failure"
                    //         res.redirect(siteur);
                    //     } else {
                    //         if (order.billings === undefined || order.billings.amount === undefined || order.billings.amount.grand_total === undefined || order.billings.amount.grand_total <= 0) {
                    //             library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                    //             var siteur = settings.settings.site_url + "/payment-failure"
                    //             res.redirect(siteur);
                    //         } else {
                    //             // let url = '';
                    //             // console.log("gateWay.settings", gateWay.settings)
                    //             // if (gateWay.settings.mode == "live") {
                    //             //     url = "https://api.mips.mu/api/create_payment_request";
                    //             // } else {
                    //             //     url = "https://api.mips.mu/api/create_payment_request";
                    //             // }
                    //             var url = "https://api.mips.mu/api/create_payment_request";
                    //             var signatureData = new Buffer('kanavu_fashion_ltd_h6tg4e:Nhy654rgu%tgdt579UHGTr43r%^ujoj7').toString('base64');
                    //             // console.log("signatureData", signatureData)
                    //             var options = {
                    //                 method: 'POST',
                    //                 url: 'https://api.mips.mu/api/create_payment_request',
                    //                 headers: {
                    //                     'Content-Type': 'application/json',
                    //                     'Authorization': `Basic ${signatureData}`,
                    //                     'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
                    //                 },
                    //                 body: {
                    //                     "authentify": {
                    //                         "id_merchant": gateWay.settings.id_merchant,
                    //                         "id_entity": gateWay.settings.id_entity,
                    //                         "id_operator": gateWay.settings.id_operator,
                    //                         "operator_password": gateWay.settings.operator_password
                    //                     },
                    //                     request: {
                    //                         request_mode: 'simple',
                    //                         options: 'warranty',
                    //                         sending_mode: 'mail',
                    //                         request_title: 'User Order Placement',
                    //                         // exp_date: '2023-08-24',
                    //                         client_details: {
                    //                             first_name: user.first_name,
                    //                             last_name: user.last_name,
                    //                             client_email: order.email ? order.email : user.email,
                    //                             phone_number: user.phone.number
                    //                         },
                    //                         max_amount_total: 0,
                    //                         max_amount_per_claim: 0,
                    //                         max_frequency: 0,
                    //                     },
                    //                     initial_payment: { id_order: req.query.orderId, currency: 'MUR', amount: parseFloat(parseFloat(order.billings.amount.grand_total).toFixed(2)) }
                    //                 },
                    //                 json: true
                    //             };
                    //             // var responseData = await axios.request(options)
                    //             // console.log("responseData ++++++++++++++", responseData)
                    //             urlrequest(options, function (error, response, body) {
                    //                 if (error) throw new Error(error);
                    //                 if (body && body.operation_status == 'success') {
                    //                     var link;
                    //                     if (body && body.payment_link) {
                    //                         link = body.payment_link.url
                    //                     }
                    //                     if (link) {
                    //                         res.redirect(link)
                    //                     } else {
                    //                         var siteur = settings.settings.site_url + "/payment-failure"
                    //                         res.redirect(siteur);
                    //                     }
                    //                 }
                    //             });
                    //         }
                    //     }
                    // });
                }
                // db.GetOneDocument('temporders', { '_id': mongoose.Types.ObjectId(req.query.orderId) }, {}, {}, (err, order) => {
                //     if (err || !order) {
                //         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                //         var siteur = settings.settings.site_url + "/payment-failure"
                //         res.redirect(siteur);
                //     } else {
                //         db.GetOneDocument('users', { '_id': order.user_id }, {}, {}, async (err, user) => {
                //             if (err || !user) {
                //                 library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                //                 var siteur = settings.settings.site_url + "/payment-failure"
                //                 res.redirect(siteur);
                //             } else {
                //                 if (order.billings === undefined || order.billings.amount === undefined || order.billings.amount.grand_total === undefined || order.billings.amount.grand_total <= 0) {
                //                     library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                //                     var siteur = settings.settings.site_url + "/payment-failure"
                //                     res.redirect(siteur);
                //                 } else {
                //                     // let url = '';
                //                     // console.log("gateWay.settings", gateWay.settings)
                //                     // if (gateWay.settings.mode == "live") {
                //                     //     url = "https://api.mips.mu/api/create_payment_request";
                //                     // } else {
                //                     //     url = "https://api.mips.mu/api/create_payment_request";
                //                     // }
                //                     var url = "https://api.mips.mu/api/create_payment_request";
                //                     var signatureData = new Buffer('kanavu_fashion_ltd_h6tg4e:Nhy654rgu%tgdt579UHGTr43r%^ujoj7').toString('base64');
                //                     // console.log("signatureData", signatureData)
                //                     var options = {
                //                         method: 'POST',
                //                         url: 'https://api.mips.mu/api/create_payment_request',
                //                         headers: {
                //                             'Content-Type': 'application/json',
                //                             'Authorization': `Basic ${signatureData}`,
                //                             'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
                //                         },
                //                         body: {
                //                             "authentify": {
                //                                 "id_merchant": gateWay.settings.id_merchant,
                //                                 "id_entity": gateWay.settings.id_entity,
                //                                 "id_operator": gateWay.settings.id_operator,
                //                                 "operator_password": gateWay.settings.operator_password
                //                             },
                //                             request: {
                //                                 request_mode: 'simple',
                //                                 options: 'warranty',
                //                                 sending_mode: 'mail',
                //                                 request_title: 'User Order Placement',
                //                                 // exp_date: '2023-08-24',
                //                                 client_details: {
                //                                     first_name: user.first_name,
                //                                     last_name: user.last_name,
                //                                     client_email: order.email ? order.email : user.email,
                //                                     phone_number: user.phone.number
                //                                 },
                //                                 max_amount_total: 0,
                //                                 max_amount_per_claim: 0,
                //                                 max_frequency: 0,
                //                             },
                //                             initial_payment: { id_order: req.query.orderId, currency: 'MUR', amount: parseFloat(parseFloat(order.billings.amount.grand_total).toFixed(2)) }
                //                         },
                //                         json: true
                //                     };
                //                     // var responseData = await axios.request(options)
                //                     // console.log("responseData ++++++++++++++", responseData)
                //                     urlrequest(options, function (error, response, body) {
                //                         if (error) throw new Error(error);
                //                         if (body && body.operation_status == 'success') {
                //                             var link;
                //                             if (body && body.payment_link) {
                //                                 link = body.payment_link.url
                //                             }
                //                             if (link) {
                //                                 res.redirect(link)
                //                             } else {
                //                                 var siteur = settings.settings.site_url + "/payment-failure"
                //                                 res.redirect(siteur);
                //                             }
                //                         }
                //                     });
                //                 }
                //             }
                //         });
                //     }
                // });
            }
            // db.GetOneDocument('paymentgateway', { 'alias': 'mips', status: 1 }, {}, {}, (err, gateWay) => {
            //     if (err || !gateWay) {
            //         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
            //         var siteur = settings.settings.site_url + "/payment-failure"
            //         res.redirect(siteur);
            //     } else {
            //         db.GetOneDocument('temporders', { '_id': mongoose.Types.ObjectId(req.query.orderId) }, {}, {}, (err, order) => {
            //             if (err || !order) {
            //                 library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
            //                 var siteur = settings.settings.site_url + "/payment-failure"
            //                 res.redirect(siteur);
            //             } else {
            //                 db.GetOneDocument('users', { '_id': order.user_id }, {}, {}, async (err, user) => {
            //                     if (err || !user) {
            //                         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
            //                         var siteur = settings.settings.site_url + "/payment-failure"
            //                         res.redirect(siteur);
            //                     } else {
            //                         if (order.billings === undefined || order.billings.amount === undefined || order.billings.amount.grand_total === undefined || order.billings.amount.grand_total <= 0) {
            //                             library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
            //                             var siteur = settings.settings.site_url + "/payment-failure"
            //                             res.redirect(siteur);
            //                         } else {
            //                             // let url = '';
            //                             // console.log("gateWay.settings", gateWay.settings)
            //                             // if (gateWay.settings.mode == "live") {
            //                             //     url = "https://api.mips.mu/api/create_payment_request";
            //                             // } else {
            //                             //     url = "https://api.mips.mu/api/create_payment_request";
            //                             // }
            //                             var url = "https://api.mips.mu/api/create_payment_request";
            //                             var signatureData = new Buffer('kanavu_fashion_ltd_h6tg4e:Nhy654rgu%tgdt579UHGTr43r%^ujoj7').toString('base64');
            //                             // console.log("signatureData", signatureData)
            //                             var options = {
            //                                 method: 'POST',
            //                                 url: 'https://api.mips.mu/api/create_payment_request',
            //                                 headers: {
            //                                     'Content-Type': 'application/json',
            //                                     'Authorization': `Basic ${signatureData}`,
            //                                     'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            //                                 },
            //                                 body: {
            //                                     "authentify": {
            //                                         "id_merchant": gateWay.settings.id_merchant,
            //                                         "id_entity": gateWay.settings.id_entity,
            //                                         "id_operator": gateWay.settings.id_operator,
            //                                         "operator_password": gateWay.settings.operator_password
            //                                     },
            //                                     request: {
            //                                         request_mode: 'simple',
            //                                         options: 'warranty',
            //                                         sending_mode: 'mail',
            //                                         request_title: 'User Order Placement',
            //                                         // exp_date: '2023-08-24',
            //                                         client_details: {
            //                                             first_name: user.first_name,
            //                                             last_name: user.last_name,
            //                                             client_email: order.email ? order.email : user.email,
            //                                             phone_number: user.phone.number
            //                                         },
            //                                         max_amount_total: 0,
            //                                         max_amount_per_claim: 0,
            //                                         max_frequency: 0,
            //                                     },
            //                                     initial_payment: { id_order: req.query.orderId, currency: 'MUR', amount: parseFloat(parseFloat(order.billings.amount.grand_total).toFixed(2)) }
            //                                 },
            //                                 json: true
            //                             };
            //                             // var responseData = await axios.request(options)
            //                             // console.log("responseData ++++++++++++++", responseData)
            //                             urlrequest(options, function (error, response, body) {
            //                                 if (error) throw new Error(error);
            //                                 if (body && body.operation_status == 'success') {
            //                                     var link;
            //                                     if (body && body.payment_link) {
            //                                         link = body.payment_link.url
            //                                     }
            //                                     if (link) {
            //                                         res.redirect(link)
            //                                     } else {
            //                                         var siteur = settings.settings.site_url + "/payment-failure"
            //                                         res.redirect(siteur);
            //                                     }
            //                                 }
            //                             });
            //                         }
            //                     }
            //                 });
            //             }
            //         });
            //     }
            // });
        }
        // db.GetOneDocument('settings', { alias: 'general' }, {}, {}, (err, settings) => {
        //     if (err || !settings) {
        //         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //         var siteur = settings.settings.site_url + "/payment-failure"
        //         res.redirect(siteur);
        //     } else {
        //         db.GetOneDocument('paymentgateway', { 'alias': 'mips', status: 1 }, {}, {}, (err, gateWay) => {
        //             if (err || !gateWay) {
        //                 library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                 var siteur = settings.settings.site_url + "/payment-failure"
        //                 res.redirect(siteur);
        //             } else {
        //                 db.GetOneDocument('temporders', { '_id': mongoose.Types.ObjectId(req.query.orderId) }, {}, {}, (err, order) => {
        //                     if (err || !order) {
        //                         library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                         var siteur = settings.settings.site_url + "/payment-failure"
        //                         res.redirect(siteur);
        //                     } else {
        //                         db.GetOneDocument('users', { '_id': order.user_id }, {}, {}, async (err, user) => {
        //                             if (err || !user) {
        //                                 library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                                 var siteur = settings.settings.site_url + "/payment-failure"
        //                                 res.redirect(siteur);
        //                             } else {
        //                                 if (order.billings === undefined || order.billings.amount === undefined || order.billings.amount.grand_total === undefined || order.billings.amount.grand_total <= 0) {
        //                                     library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
        //                                     var siteur = settings.settings.site_url + "/payment-failure"
        //                                     res.redirect(siteur);
        //                                 } else {
        //                                     // let url = '';
        //                                     // console.log("gateWay.settings", gateWay.settings)
        //                                     // if (gateWay.settings.mode == "live") {
        //                                     //     url = "https://api.mips.mu/api/create_payment_request";
        //                                     // } else {
        //                                     //     url = "https://api.mips.mu/api/create_payment_request";
        //                                     // }
        //                                     var url = "https://api.mips.mu/api/create_payment_request";
        //                                     var signatureData = new Buffer('kanavu_fashion_ltd_h6tg4e:Nhy654rgu%tgdt579UHGTr43r%^ujoj7').toString('base64');
        //                                     // console.log("signatureData", signatureData)
        //                                     var options = {
        //                                         method: 'POST',
        //                                         url: 'https://api.mips.mu/api/create_payment_request',
        //                                         headers: {
        //                                             'Content-Type': 'application/json',
        //                                             'Authorization': `Basic ${signatureData}`,
        //                                             'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        //                                         },
        //                                         body: {
        //                                             "authentify": {
        //                                                 "id_merchant": gateWay.settings.id_merchant,
        //                                                 "id_entity": gateWay.settings.id_entity,
        //                                                 "id_operator": gateWay.settings.id_operator,
        //                                                 "operator_password": gateWay.settings.operator_password
        //                                             },
        //                                             request: {
        //                                                 request_mode: 'simple',
        //                                                 options: 'warranty',
        //                                                 sending_mode: 'mail',
        //                                                 request_title: 'User Order Placement',
        //                                                 // exp_date: '2023-08-24',
        //                                                 client_details: {
        //                                                     first_name: user.first_name,
        //                                                     last_name: user.last_name,
        //                                                     client_email: order.email ? order.email : user.email,
        //                                                     phone_number: user.phone.number
        //                                                 },
        //                                                 max_amount_total: 0,
        //                                                 max_amount_per_claim: 0,
        //                                                 max_frequency: 0,
        //                                             },
        //                                             initial_payment: { id_order: req.query.orderId, currency: 'MUR', amount: parseFloat(parseFloat(order.billings.amount.grand_total).toFixed(2)) }
        //                                         },
        //                                         json: true
        //                                     };
        //                                     // var responseData = await axios.request(options)
        //                                     // console.log("responseData ++++++++++++++", responseData)
        //                                     urlrequest(options, function (error, response, body) {
        //                                         if (error) throw new Error(error);
        //                                         if (body && body.operation_status == 'success') {
        //                                             var link;
        //                                             if (body && body.payment_link) {
        //                                                 link = body.payment_link.url
        //                                             }
        //                                             if (link) {
        //                                                 res.redirect(link)
        //                                             } else {
        //                                                 var siteur = settings.settings.site_url + "/payment-failure"
        //                                                 res.redirect(siteur);
        //                                             }
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

    controller.stripePayment = function (req, res) {
        var data = {};
        data.status = '1';
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id is Required').notEmpty();
        req.checkBody('pay_total', 'pay_total is Required').notEmpty();
        req.checkBody('card_type', 'card_type is Required').notEmpty();
        if (req.body.card_type == 'new') {
            req.checkBody('stripe.id', 'token_id is Required').notEmpty();
            req.checkBody('save_card', 'save_card is Required').notEmpty();
        }
        if (req.body.card_type == 'old') {
            req.checkBody('customer_id', 'customer_id is Required').notEmpty();
            req.checkBody('card_details.cvc', 'CVC is Required').notEmpty();
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
        req.sanitizeBody('restaurant_id').trim();
        req.sanitizeBody('pay_total').trim();
        req.sanitizeBody('save_card').trim();
        req.sanitizeBody('card_type').trim();
        req.sanitizeBody('customer_id').trim();
        req.sanitizeBody('stripe.id').trim();
        req.sanitizeBody('card_details.cvc').trim();
        var request = {};
        request.user_id = req.body.user_id;
        request.restaurant_id = req.body.restaurant_id;
        request.pay_total = req.body.pay_total;
        request.save_card = req.body.save_card;
        request.card_type = req.body.card_type;
        request.customer_id = req.body.customer_id;
        if (req.body.card_type == 'new') {
            request.token_id = req.body.stripe.id;
        }
        var card = {};
        card.cvc = req.body.card_details.cvc;
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
                        db.GetOneDocument('restaurant', { _id: request.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                            if (err || !rest) {
                                res.send({ "status": 0, "errors": 'Error in restaurant..!' });
                            } else {
                                db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                    if (err || !user) {
                                        res.send({ "status": 0, "errors": 'Error in user..!' });
                                    } else {
                                        if (request.card_type == 'new') {
                                            if (request.save_card == 'yes') {
                                                stripe.customers.create({
                                                    email: user.email,
                                                    source: request.token_id,
                                                }).then(function (customer) {
                                                    if (!customer) {
                                                        res.send({ "status": "0", "errors": "Error in customer token generate..!" });
                                                    } else {
                                                        var pay = parseInt(request.pay_total * 100);
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
                                                                data.restaurant = request.restaurant_id;
                                                                data.amount = request.pay_total;
                                                                data.strip_customer_id = customer.id;
                                                                data.schedule_type = req.body.schedule_type;
                                                                data.type = 'stripe';
                                                                data.mode = 'charge';
                                                                var card_details = {};
                                                                card_details.customer_id = customer.id;
                                                                card_details.email = customer.email;
                                                                card_details.card_no = charges.source.last4;
                                                                card_details.exp_month = charges.source.exp_month;
                                                                card_details.exp_year = charges.source.exp_year;
                                                                card_details.brand = charges.source.brand;
                                                                card_details.mode = paymentgateway.settings.mode;
                                                                db.GetOneDocument('users', { _id: request.user_id, card_details: { $elemMatch: { email: card_details.email, card_no: card_details.card_no, exp_month: card_details.exp_month, exp_year: card_details.exp_year, brand: card_details.brand } } }, {}, {}, function (err, GetCardDetails) {
                                                                    if (err) {
                                                                        res.send({ "status": 0, "errors": 'Error in user..!' });
                                                                    } else {
                                                                        var condition;
                                                                        var updateDetails;
                                                                        if (GetCardDetails && typeof GetCardDetails._id != 'undefined') {
                                                                            updateDetails = { "card_details.$.customer_id": card_details.customer_id };
                                                                            condition = { _id: request.user_id, card_details: { $elemMatch: { email: card_details.email, card_no: card_details.card_no, exp_month: card_details.exp_month, exp_year: card_details.exp_year, brand: card_details.brand } } };
                                                                        } else {
                                                                            updateDetails = { "$push": { 'card_details': card_details } };
                                                                            condition = { _id: request.user_id };
                                                                        }
                                                                        db.UpdateDocument('users', condition, updateDetails, {}, function (err, secdata) {
                                                                            if (err || secdata.nModified == 0) {
                                                                                res.send({ "status": "0", "errors": "Error in card update..!" });
                                                                            } else {
                                                                                db.InsertDocument('transaction', data, function (err, transdata) {
                                                                                    if (err || transdata.nModified == 0) {
                                                                                        res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                                    } else {
                                                                                        var transactionsData = [{ 'gateway_response': charges }];
                                                                                        db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                                            if (err || transaction.nModified == 0) {
                                                                                                res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                                            } else {
                                                                                                req.body.transaction_id = transdata._id;
                                                                                                events.emit('OrderUpdate', req, function (err, result) {
                                                                                                    if (err) {
                                                                                                        res.send({ "status": 0, "errors": err });
                                                                                                    } else {
                                                                                                        io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                                                                                                        res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
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
                                                        });
                                                    }
                                                })
                                            } else {
                                                var pay = parseInt(request.pay_total * 100);
                                                stripe.charges.create({
                                                    amount: pay,
                                                    currency: currency_code,
                                                    'capture': false,
                                                    source: request.token_id,
                                                    description: site_title + ' ' + "Payment From User" + ' - ' + req.body.order_id,
                                                }, function (err, charges) {
                                                    if (err) {
                                                        res.send({ "status": "0", "errors": "Error in charge creation.!" });
                                                    } else {
                                                        var data = {};
                                                        data.user = request.user_id;
                                                        data.restaurant = request.restaurant_id;
                                                        data.amount = request.pay_total;
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
                                                                        req.body.transaction_id = transdata._id;
                                                                        events.emit('OrderUpdate', req, function (err, result) {
                                                                            if (err) {
                                                                                res.send({ "status": 0, "errors": err });
                                                                            } else {
                                                                                res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
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
                                            var pay = parseInt(request.pay_total * 100);
                                            stripe.charges.create({
                                                amount: pay,
                                                currency: currency_code,
                                                'capture': false,
                                                customer: request.customer_id,
                                                description: site_title + ' ' + "Payment From User" + ' - ' + req.body.order_id,
                                                metadata: { 'cvc': card.cvc }
                                            }, function (err, charges) {
                                                if (err) {
                                                    res.send({ "status": "0", "errors": "Error in charge creation.!" });
                                                } else {
                                                    var data = {};
                                                    data.user = request.user_id;
                                                    data.restaurant = request.restaurant_id;
                                                    data.amount = request.pay_total;
                                                    data.mode = 'charge';
                                                    data.type = 'stripe';
                                                    db.InsertDocument('transaction', data, function (err, transdata) {
                                                        if (err || transdata.nModified == 0) {
                                                            res.send({ "status": 0, "errors": 'Error in transaction' });
                                                        } else {
                                                            var transactionsData = [{ 'gateway_response': charges }];
                                                            db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                if (err || transaction.nModified == 0) {
                                                                    res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                } else {
                                                                    req.body.transaction_id = transdata._id;
                                                                    events.emit('OrderUpdate', req, function (err, result) {
                                                                        if (err) {
                                                                            res.send({ "status": 0, "errors": err });
                                                                        } else {
                                                                            res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
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
                            }
                        });
                    }
                });
            }
        })
    }
    controller.paypalPayment = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('_id', 'cart_id is required').notEmpty();
        req.checkBody('cart_details', 'food is required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id is required').notEmpty();
        req.checkBody('total', 'total is required').notEmpty();
        req.checkBody('pay_total', 'pay_total is required').notEmpty();
        req.checkBody('service_tax', 'service_tax is required').notEmpty();
        req.checkBody('offer_price', 'offer_discount is required').optional();
        req.checkBody('coupon_price', 'coupon_discount is required').optional();
        req.checkBody('coupon_code', 'coupon_code id is required').optional();
        req.checkBody('coupon_discount', 'coupon_discount id is required').optional();
        req.checkBody('food_offer_price', 'food_offer_price id is required').optional();
        req.checkBody('package_charge', 'package_charge id is required').optional();
        req.checkBody('delivery_charge', 'delivery_charge is required').optional();
        req.checkBody('night_fare', 'night_fare is required').optional();
        req.checkBody('surge_fare', 'surge_fare is required').optional();
        req.checkBody('delivery_address.line1', 'delivery_address is required').notEmpty();
        req.checkBody('delivery_address.choose_location', 'address_type is required').notEmpty();
        req.checkBody('delivery_address.loc.lng', 'longitude is required').notEmpty();
        req.checkBody('delivery_address.loc.lat', 'latitude is required').notEmpty();
        req.checkBody('delivery_address.street', 'street is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
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
        req.sanitizeBody('delivery_charge').trim();
        req.sanitizeBody('surge_fare').trim();
        req.sanitizeBody('night_fare').trim();
        req.sanitizeBody('address_type').trim();
        req.sanitizeBody('longitude').trim();
        req.sanitizeBody('latitude').trim();
        var data = {};
        data.transaction_id = req.body.transaction_id;
        data.cart_id = req.body._id;
        data.user_id = req.body.user_id;
        data.restaurant_id = req.body.restaurant_id;
        data.foods = req.body.cart_details;
        data.coupon_code = req.body.coupon_code;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address.line1;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.loc = req.body.delivery_address.loc;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.street;
        data.location = {};
        data.location.lng = req.body.delivery_address.loc.lng;
        data.location.lat = req.body.delivery_address.loc.lat;
        data.status = '1';
        db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
            if (err || !paymentgateway) {
                res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
            } else {
                db.GetOneDocument('restaurant', { _id: data.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                    if (err || !rest) {
                        res.send({ "status": 0, "errors": 'Error in restaurant..!' });
                    } else {
                        db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                            if (err || !user) {
                                res.send({ "status": 0, "errors": 'Error in user..!' });
                            } else {
                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err) {
                                        res.send({ "status": 0, "errors": 'Error in settings..!' });
                                    } else {
                                        db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
                                            if (err || !cart_details) {
                                                res.send({ "status": 0, "errors": 'Error in cart..!' });
                                            } else {
                                                if (cart_details && typeof cart_details._id != 'undefined') {
                                                    data.cart_details = cart_details;
                                                    var billings = {};
                                                    billings.amount = {};
                                                    billings.amount.total = req.body.total;
                                                    billings.amount.coupon_discount = req.body.coupon_price || 0;
                                                    billings.amount.food_offer_price = req.body.food_offer_price || 0;
                                                    billings.amount.offer_discount = req.body.offer_price || 0;
                                                    billings.amount.delivery_amount = req.body.delivery_charge || 0;
                                                    billings.amount.service_tax = req.body.service_tax || 0;
                                                    billings.amount.night_fee = req.body.night_fare || 0;
                                                    billings.amount.surge_fee = req.body.surge_fare || 0;
                                                    billings.amount.grand_total = req.body.pay_total || 0;
                                                    billings.amount.package_charge = req.body.package_charge || 0;
                                                    data.billings = billings;
                                                    data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                                                    var temp_payment = {
                                                        order: data,
                                                        created_time: Date.now()
                                                    }
                                                    db.InsertDocument('temp_payment', temp_payment, function (err, orderdata) {
                                                        if (err || orderdata.nModified == 0) {
                                                            res.send({ "status": 0, "errors": 'Error in order..!' });
                                                        } else {
                                                            data.payment_id = orderdata._id;
                                                            data.pay_total = req.body.pay_total || 0;
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
    controller.paypalRecharge = function (req, res) {
        req.checkBody('driver_id', 'driver id is required').notEmpty();
        req.checkBody('amount', 'amount is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
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
                                res.send({ "status": 0, "errors": 'Error in settings..!' });
                            } else {
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
    controller.noPayment = function (req, res) {
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('_id', 'cart_id is required').notEmpty();
        req.checkBody('cart_details', 'food is required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id is required').notEmpty();
        req.checkBody('total', 'total is required').notEmpty();
        req.checkBody('pay_total', 'pay_total is required').notEmpty();
        req.checkBody('service_tax', 'service_tax is required').notEmpty();
        req.checkBody('offer_price', 'offer_discount is required').optional();
        req.checkBody('coupon_price', 'coupon_discount is required').optional();
        req.checkBody('coupon_code', 'coupon_code id is required').optional();
        req.checkBody('coupon_discount', 'coupon_discount id is required').optional();
        req.checkBody('food_offer_price', 'food_offer_price id is required').optional();
        req.checkBody('package_charge', 'package_charge id is required').optional();
        req.checkBody('delivery_charge', 'delivery_charge is required').optional();
        req.checkBody('night_fare', 'night_fare is required').optional();
        req.checkBody('surge_fare', 'surge_fare is required').optional();
        req.checkBody('delivery_address.line1', 'delivery_address is required').notEmpty();
        req.checkBody('delivery_address.choose_location', 'address_type is required').notEmpty();
        req.checkBody('delivery_address.loc.lng', 'longitude is required').notEmpty();
        req.checkBody('delivery_address.loc.lat', 'latitude is required').notEmpty();
        req.checkBody('delivery_address.street', 'street is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
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
        req.sanitizeBody('delivery_charge').trim();
        req.sanitizeBody('surge_fare').trim();
        req.sanitizeBody('night_fare').trim();
        req.sanitizeBody('address_type').trim();
        req.sanitizeBody('longitude').trim();
        req.sanitizeBody('latitude').trim();
        var data = {};
        data.transaction_id = req.body.transaction_id;
        data.cart_id = req.body._id;
        data.user_id = req.body.user_id;
        data.restaurant_id = req.body.restaurant_id;
        data.foods = req.body.cart_details;
        data.coupon_code = req.body.coupon_code;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address.line1;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.loc = req.body.delivery_address.loc;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.street;
        data.location = {};
        data.location.lng = req.body.delivery_address.loc.lng;
        data.location.lat = req.body.delivery_address.loc.lat;
        data.status = '1';
        db.GetOneDocument('restaurant', { _id: data.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
            if (err || !rest) {
                res.send({ "status": 0, "errors": 'Error in restaurant..!' });
            } else {
                db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                    if (err || !user) {
                        res.send({ "status": 0, "errors": 'Error in user..!' });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err) {
                                res.send({ "status": 0, "errors": 'Error in settings..!' });
                            } else {
                                db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
                                    if (err || !cart_details) {
                                        res.send({ "status": 0, "errors": 'Error in cart..!' });
                                    } else {
                                        if (cart_details && typeof cart_details._id != 'undefined') {
                                            var transaction_data = {};
                                            transaction_data.user = data.user_id;
                                            transaction_data.restaurant = data.restaurant_id;
                                            transaction_data.amount = data.pay_total;
                                            transaction_data.mode = 'charge';
                                            transaction_data.type = 'nopayment';
                                            db.InsertDocument('transaction', transaction_data, function (err, transdata) {
                                                if (err || transdata.nModified == 0) {
                                                    res.send({ "status": 0, "errors": 'Error in transaction' });
                                                } else {
                                                    req.body.transaction_id = transdata._id;
                                                    events.emit('OrderUpdate', req, function (err, result) {
                                                        if (err) {
                                                            res.send({ "status": 0, "errors": err });
                                                        } else {
                                                            res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                                                        }
                                                    });
                                                }
                                            });
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
    controller.cancelOrder = function (req, res) {
        var data = {};
        data.status = 0;
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('order_id', 'orderId is Required').notEmpty();
        // req.checkBody('restaurant_id', 'restaurant_id is Required').notEmpty();
        req.checkBody('cancellationreason', 'cancellationreason is Required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": 0,
                message: errors[0].msg
            });
            return;
        }
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('orderId').trim();
        var request = {};
        request.user_id = req.body.user_id;
        // request.restaurant_id = req.body.restaurant_id;
        db.GetOneDocument('orders', { "user_id": req.body.user_id, _id: req.body.order_id, $or: [{ "status": 1 }, { "status": 15 }] }, {}, {}, function (err, ordersDetails) {
            if (err || !ordersDetails) {
                res.send({ "status": 0, message: 'Invalid Error, Please check your data' });
            } else {
                db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id }, {}, {}, function (err, transactionDetails) {
                    if (err || !transactionDetails) {
                        res.send({ "status": 0, message: 'Invalid Error, Please check your data' });
                    } else {
                        if (transactionDetails.type == 'stripe') {
                            db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
                                if (err || !paymentgateway.settings.secret_key) {
                                    res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
                                } else {
                                    stripe.setApiKey(paymentgateway.settings.secret_key);
                                    var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
                                    if (charge_index != -1) {
                                        db.GetOneDocument('city', { _id: request.restaurant_id }, {}, {}, function (err, rest) {
                                            if (err || !rest) {
                                                res.send({ "status": 0, "errors": 'Error in city..!' });
                                            } else {
                                                db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                                    if (err || !user) {
                                                        res.send({ "status": 0, "errors": 'Error in user..!' });
                                                    } else {
                                                        var charge_id = transactionDetails.transactions[charge_index].gateway_response.id
                                                        stripe.refunds.create({
                                                            charge: charge_id,
                                                        }, function (err, refund) {
                                                            if (err) {
                                                                res.send({ "status": "0", "errors": "Error in refunds creation.!" });
                                                            } else {
                                                                var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
                                                                db.UpdateDocument('orders', { '_id': req.body.order_id }, updatedoc, {}, function (err, response) { })
                                                                var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
                                                                db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, response) { })
                                                                io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                                                var noti_data = {};
                                                                noti_data.rest_id = ordersDetails.restaurant_id;
                                                                noti_data.order_id = ordersDetails.order_id;
                                                                noti_data._id = ordersDetails._id;
                                                                noti_data.user_id = ordersDetails.user_id;
                                                                noti_data.user_name = user.username;
                                                                noti_data.order_type = 'order_rejected';
                                                                io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                                io.of('/chat').emit('adminnotify', noti_data);
                                                                var android_restaurant = ordersDetails.restaurant_id;
                                                                var message = 'User cancelled your order';
                                                                var response_time = CONFIG.respond_timeout;
                                                                var action = 'admin_cancel';
                                                                if (ordersDetails.status == 1) {
                                                                    var options = [req.body.order_id, android_restaurant, response_time, action];
                                                                    for (var i = 1; i == 1; i++) {
                                                                        push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                    }
                                                                }
                                                                var mail_data = {};
                                                                mail_data.user_id = user._id;
                                                                mail_data.order_id = ordersDetails._id;
                                                                events.emit('cancelOrderEmail', mail_data, function (err, result) { });
                                                                res.send({ "status": "1", "message": "Order Cancelled" });
                                                            }
                                                        })
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
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
                                        db.GetOneDocument('restaurant', { _id: request.restaurant_id }, {}, {}, function (err, rest) {
                                            if (err || !rest) {
                                                res.send({ "status": 0, "errors": 'Error in restaurant..!' });
                                            } else {
                                                db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                                    if (err || !user) {
                                                        res.send({ "status": 0, "errors": 'Error in user..!' });
                                                    } else {
                                                        if (typeof transactionDetails.transactions[charge_index].gateway_response.transactions != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization != 'undefined') {
                                                            var authorization_id = transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization.id;
                                                            var api = require('paypal-rest-sdk');
                                                            api.authorization.void(authorization_id, function (error, refund) {
                                                                if (error) {
                                                                    res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
                                                                } else {
                                                                    var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
                                                                    db.UpdateDocument('orders', { '_id': req.body.order_id }, updatedoc, {}, function (err, response) { })
                                                                    var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
                                                                    db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, response) { })
                                                                    io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                                                    var noti_data = {};
                                                                    noti_data.rest_id = ordersDetails.restaurant_id;
                                                                    noti_data.order_id = ordersDetails.order_id;
                                                                    noti_data._id = ordersDetails._id;
                                                                    noti_data.user_id = ordersDetails.user_id;
                                                                    noti_data.user_name = user.username;
                                                                    noti_data.order_type = 'order_rejected';
                                                                    io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                    io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                                    var android_restaurant = ordersDetails.restaurant_id;
                                                                    var message = 'User cancelled your order';
                                                                    var response_time = CONFIG.respond_timeout;
                                                                    var action = 'admin_cancel';
                                                                    var options = [req.body.order_id, android_restaurant, response_time, action];
                                                                    for (var i = 1; i == 1; i++) {
                                                                        push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                    }
                                                                    var mail_data = {};
                                                                    mail_data.user_id = user._id;
                                                                    mail_data.order_id = ordersDetails._id;
                                                                    events.emit('cancelOrderEmail', mail_data, function (err, result) { });
                                                                    res.send({ "status": "1", "message": "Order Cancelled" });
                                                                }
                                                            })
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
                                    }
                                }
                            })
                        } else if (transactionDetails.type == 'nopayment') {
                            db.GetOneDocument('restaurant', { _id: request.restaurant_id }, {}, {}, function (err, rest) {
                                if (err || !rest) {
                                    res.send({ "status": 0, "errors": 'Error in restaurant..!' });
                                } else {
                                    db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                        if (err || !user) {
                                            res.send({ "status": 0, "errors": 'Error in user..!' });
                                        } else {
                                            var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
                                            db.UpdateDocument('orders', { '_id': req.body.order_id }, updatedoc, {}, function (err, response) { })
                                            io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                            var noti_data = {};
                                            noti_data.rest_id = ordersDetails.restaurant_id;
                                            noti_data.order_id = ordersDetails.order_id;
                                            noti_data._id = ordersDetails._id;
                                            noti_data.user_id = ordersDetails.user_id;
                                            noti_data.user_name = user.username;
                                            noti_data.order_type = 'order_rejected';
                                            io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                            io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                            io.of('/chat').emit('adminnotify', noti_data);
                                            var android_restaurant = ordersDetails.restaurant_id;
                                            var message = 'User cancelled your order';
                                            var response_time = CONFIG.respond_timeout;
                                            var action = 'admin_cancel';
                                            var options = [req.body.order_id, android_restaurant, response_time, action];
                                            for (var i = 1; i == 1; i++) {
                                                push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                            }
                                            var mail_data = {};
                                            mail_data.user_id = user._id;
                                            mail_data.order_id = ordersDetails._id;
                                            events.emit('cancelOrderEmail', mail_data, function (err, result) { });
                                            res.send({ "status": "1", "message": "Order Cancelled" });
                                        }
                                    });
                                }
                            });
                        } else if (transactionDetails.type == 'COD') {
                            db.GetOneDocument('city', { _id: request.restaurant_id }, {}, {}, function (err, rest) {
                                if (err || !rest) {
                                    res.send({ "status": 0, "errors": 'Error in City..!' });
                                } else {
                                    db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                        if (err || !user) {
                                            res.send({ "status": 0, "errors": 'Error in user..!' });
                                        } else {
                                            var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
                                            db.UpdateDocument('orders', { '_id': req.body.order_id }, updatedoc, {}, function (err, response) { })
                                            io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                            var noti_data = {};
                                            noti_data.rest_id = ordersDetails.restaurant_id;
                                            noti_data.order_id = ordersDetails.order_id;
                                            noti_data.user_id = ordersDetails.user_id;
                                            noti_data._id = ordersDetails._id;
                                            noti_data.user_name = user.username;
                                            noti_data.order_type = 'order_rejected';
                                            // io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                            io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                            io.of('/chat').emit('adminnotify', noti_data);
                                            var android_restaurant = ordersDetails.restaurant_id;
                                            var message = 'User cancelled your order';
                                            var response_time = CONFIG.respond_timeout;
                                            var action = 'admin_cancel';
                                            var options = [req.body.order_id, android_restaurant, response_time, action];
                                            // if (ordersDetails.status == 1) {
                                            //     for (var i = 1; i == 1; i++) {
                                            //         push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                            //     }
                                            // }
                                            if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
                                                var refer_offer = ordersDetails.refer_offer;
                                                db.UpdateDocument('users', { '_id': user._id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
                                            }
                                            var mail_data = {};
                                            mail_data.user_id = user._id;
                                            mail_data.order_id = ordersDetails._id;
                                            events.emit('cancelOrderEmail', mail_data, function (err, result) { });
                                            res.send({ "status": "1", "message": "Order Cancelled" });
                                        }
                                    });
                                }
                            });
                        } else if (transactionDetails.type == 'cashfree') {
                            db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'cashfree' }, {}, {}, function (err, paymentgateway) {
                                if (err || !paymentgateway) {
                                    res.send({ "status": "0", "errors": "Invalid payment method, Please contact the website administrator..!" });
                                } else {
                                    db.GetOneDocument('city', { _id: request.restaurant_id }, {}, {}, function (err, rest) {
                                        if (err || !rest) {
                                            res.send({ "status": 0, "errors": 'Error in city..!' });
                                        } else {
                                            db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                                if (err || !user) {
                                                    res.send({ "status": 0, "errors": 'Error in user..!' });
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
                                                            'refundNote': req.body.cancellationreason
                                                        }
                                                    };
                                                    urlrequest(options, async (error, response) => {
                                                        let respo = JSON.parse(response.body) // { message: 'Refund has been initiated.', refundId: 5659, status: 'OK' }
                                                        if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR") {
                                                            res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
                                                        } else {
                                                            var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
                                                            db.UpdateDocument('orders', { '_id': req.body.order_id }, updatedoc, {}, function (err, response) { })
                                                            var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response_refund: respo } } };
                                                            db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, response) { });
                                                            io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
                                                            var noti_data = {};
                                                            noti_data.city_id = ordersDetails.restaurant_id;
                                                            noti_data.order_id = ordersDetails.order_id;
                                                            noti_data.user_id = ordersDetails.user_id;
                                                            noti_data._id = ordersDetails._id;
                                                            noti_data.user_name = user.username;
                                                            noti_data.order_type = 'order_rejected';
                                                            //io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                            io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                            var android_restaurant = ordersDetails.restaurant_id;
                                                            var message = 'User cancelled your order';
                                                            var response_time = CONFIG.respond_timeout;
                                                            var action = 'admin_cancel';
                                                            var options = [req.body.order_id, android_restaurant, response_time, action];
                                                            // if (ordersDetails.status == 1) {
                                                            //     for (var i = 1; i == 1; i++) {
                                                            //         push.sendPushnotification(android_restaurant, message, 'admin_cancel', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                            //     }
                                                            // }
                                                            if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
                                                                var refer_offer = ordersDetails.refer_offer;
                                                                db.UpdateDocument('users', { '_id': user._id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
                                                            }
                                                            var mail_data = {};
                                                            mail_data.user_id = user._id;
                                                            mail_data.order_id = ordersDetails._id;
                                                            events.emit('cancelOrderEmail', mail_data, function (err, result) { });
                                                            res.send({ "status": "1", "message": "Order Cancelled" });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        } else if (transactionDetails.type == 'mips') {
                            db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'mips' }, {}, {}, function (err, paymentgateway) {
                                if (err || !paymentgateway) {
                                    res.send({ "status": 0, message: "Invalid payment method, Please contact the website administrator..!" });
                                } else {
                                    db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                                        if (err || !user) {
                                            res.send({ "status": 0, message: 'Error in user..!' });
                                        } else {
                                            const options = {
                                                method: 'POST',
                                                url: 'https://api.mips.mu/api/claim_payment_request',
                                                headers: {
                                                    'user-agent': '',
                                                    'Content-Type': 'application/json',
                                                    Accept: 'application/json',
                                                    Authorization: 'Basic bWVyY2hhbnRfYXBpQG1pcHMubXU6ZGs1NEAhTmMxMTIxITJnag=='
                                                },
                                                body: {
                                                    authentify: {
                                                        "id_merchant": paymentgateway.settings.id_merchant,
                                                        "id_entity": paymentgateway.settings.id_entity,
                                                        "id_operator": paymentgateway.settings.id_operator,
                                                        "operator_password": paymentgateway.settings.operator_password
                                                    },
                                                    order: {
                                                        id_order: transactionDetails.transactions[0].gateway_response.id_order,
                                                        currency: transactionDetails.transactions[0].gateway_response.currencty,
                                                        amount: transactionDetails.transactions[0].gateway_response.amount
                                                    },
                                                    id_token: transactionDetails.transactions[0].gateway_response.token['id_token'],
                                                    balance_number: 0
                                                },
                                                json: true
                                            };

                                            request(options, function (error, response, body) {
                                                if (error) throw new Error(error);
                                                if (body && body.payment_status == 'SUCCESS' && body.Reason == "APPROVED") {
                                                    return res.send({ status: 1, message: "Order cancel successfully" })
                                                } else {
                                                    return res.send({ status: 2, message: "Sorry, we are not able to process your cancel order at moment. so please contact admin" })
                                                }
                                            });
                                        }
                                    })
                                }
                            })
                        }
                    }
                })
            }
        });
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
                                                    if (orderDetails.billings.amount.package_charge != undefined) {
                                                        orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
                                                    }
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
                                            var foodDetails = '';
                                            for (var i = 0; i < orderDetails.foods.length; i++) {
                                                var PriceText = '';
                                                if (orderDetails.foods[i].offer_price > 0) {
                                                    PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >' +
                                                        settings.settings.currency_symbol + ' ' +
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
                                            //console.log("newdata",newdata);
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
                                            //mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                            //mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                            //mailData.html.push({ name: 'package_charge', value: night_fee || "" });
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
                                                // console.log('err, response', err, response)
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
    controller.paypalRechargeCancel = function (req, res) {
        var payment_id = req.query.payment_id;
        db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
            if (err || !tempPayment) { } else {
                db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
            }
        })
        res.redirect("/payment-failure?type=recharge");
    }
    controller.paypalRechargeExecute = function (req, res) {
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
                                res.redirect("/payment-failure");
                            } else {
                                var projection = { username: 1, avatar: 1, wallet_settings: 1, wallet_pending_payment: 1 };
                                var collection = 'drivers';
                                if (typeof tempPayment.order != 'undefined' && typeof tempPayment.order.driver_id != 'undefined') {
                                    var from = tempPayment.order.driver_id;
                                    var to = tempPayment.order.driver_id;
                                    db.GetOneDocument(collection, { _id: new mongoose.Types.ObjectId(from) }, projection, {}, function (err, currentUser) {
                                        if (err || !currentUser) {
                                            res.redirect("/payment-failure");
                                        } else {
                                            db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1 }, {}, function (err, settings) {
                                                if (err || !settings) {
                                                    res.redirect("/payment-failure");
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
                                                            var InsertData = { _id: recordId, from: from, activity: activity, type: type, amount: wallet_amount, reason: tempData.note, payment_gateway_response: data.payment_gateway_response, available_amount: update_amount };
                                                            db.InsertDocument('driver_wallet', InsertData, function (err, document) { });
                                                            db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
                                                            db.UpdateDocument(collection, condition, updateData, {}, function (err, response) {
                                                                db.GetOneDocument(collection, { _id: from }, projection, {}, function (err, currentUser) {
                                                                    if (err || !currentUser) { } else {
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
                                                                                        db.UpdateDocument(collection, condition, updateData, {}, function (err, response) { })
                                                                                        var recordId = new mongoose.Types.ObjectId();
                                                                                        var activity = currentUser.wallet_pending_payment[i].order_id;
                                                                                        var InsertData = { _id: recordId, from: from, activity: activity, type: 'driver_order_pending_amount', amount: reduce_wallet_amount, reason: '' };
                                                                                        db.InsertDocument('driver_wallet', InsertData, function (err, document) { });
                                                                                        var updateData = { 'wallet_payment_details.driver_pending_amount': 0 };
                                                                                        db.UpdateDocument('orders', { '_id': activity }, updateData, {}, function (err, docdata) { })
                                                                                        var condition = { '_id': from };
                                                                                        var update_data = { "$pull": { 'wallet_pending_payment': { _id: { $in: [currentUser.wallet_pending_payment[i]._id] } } } };
                                                                                        db.UpdateDocument(collection, condition, updateData, {}, function (err, docdata) { })
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                })
                                                            });
                                                            res.redirect("/payment-success?type='recharge'");
                                                        } else {
                                                            res.redirect("/payment-failure?type='recharge'");
                                                        }
                                                    } else {
                                                        res.redirect("/payment-failure?type='recharge'");
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
                    res.redirect("/payment-failure");
                }
            } else {
                res.redirect("/payment-failure");
            }
        });
    }
    controller.paypalCancel = function (req, res) {
        var payment_id = req.query.payment_id;
        db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
            if (err || !tempPayment) { } else {
                db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
            }
        })
        res.redirect("/payment-failure");
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
                                res.redirect("/payment-failure");
                            } else {
                                db.GetOneDocument('temp_payment', { _id: new mongoose.Types.ObjectId(payment_id) }, {}, {}, function (err, tempPayment) {
                                    if (err || !tempPayment) {
                                        res.redirect("/payment-failure");
                                    } else {
                                        db.GetOneDocument('restaurant', { _id: new mongoose.Types.ObjectId(tempPayment.order.restaurant_id) }, {}, {}, function (err, rest) {
                                            if (err || !rest) {
                                                res.redirect("/payment-failure");
                                            } else {
                                                db.GetOneDocument('users', { _id: new mongoose.Types.ObjectId(tempPayment.order.user_id), status: { $eq: 1 } }, {}, {}, function (err, user) {
                                                    if (err || !user) {
                                                        res.redirect("/payment-failure");
                                                    } else {
                                                        var data = {};
                                                        data.user = tempPayment.order.user_id;
                                                        data.restaurant = tempPayment.order.restaurant_id;
                                                        data.amount = tempPayment.order.billings.amount.grand_total;
                                                        data.type = 'paypal';
                                                        data.mode = 'charge';
                                                        db.InsertDocument('transaction', data, function (err, transdata) {
                                                            if (err || transdata.nModified == 0) {
                                                                res.redirect("/payment-failure");
                                                            } else {
                                                                var transactionsData = [{ 'gateway_response': result }];
                                                                db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                    if (err || transaction.nModified == 0) {
                                                                        res.redirect("/payment-failure");
                                                                    } else {
                                                                        var order_data = tempPayment.order;
                                                                        order_data.transaction_id = transdata._id;
                                                                        order_data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                                                                        order_data.main_city = rest.main_city;
                                                                        order_data.sub_city = rest.sub_city;
                                                                        order_data.created_time = Date.now();
                                                                        db.InsertDocument('orders', order_data, function (err, orderdata) {
                                                                            if (err || orderdata.nModified == 0) {
                                                                                res.redirect("/payment-failure");
                                                                            } else {
                                                                                var updatedoc = { 'order_history.order_time': new Date() };
                                                                                db.UpdateDocument('orders', { '_id': orderdata._id }, updatedoc, {}, function (err, response) {
                                                                                    if (err || response.nModified == 0) {
                                                                                        res.redirect("/payment-failure");
                                                                                    } else {
                                                                                        var cart_id = tempPayment.order.cart_id;
                                                                                        db.DeleteDocument('cart', { '_id': new mongoose.Types.ObjectId(cart_id) }, function (err, res) { });
                                                                                        if (tempPayment.order.coupon_code && tempPayment.order.coupon_code != '') {
                                                                                            db.GetDocument('coupon', { status: { $ne: 0 }, code: tempPayment.order.coupon_code }, {}, {}, function (err, usagelimit) {
                                                                                                if (err || !usagelimit || usagelimit.length == 0) {
                                                                                                    res.redirect("/payment-failure");
                                                                                                } else {
                                                                                                    var usagelimits = usagelimit[0].usage.total_coupons;
                                                                                                    var result = usagelimits - 1;
                                                                                                    var use = parseInt(usagelimit[0].used) + parseInt(1);
                                                                                                    if (result <= 0) {
                                                                                                        result = 0;
                                                                                                    }
                                                                                                    db.UpdateDocument('coupon', { status: { $ne: 0 }, code: tempPayment.order.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                                                                                                        if (err || result.nModified == 0) {
                                                                                                            res.redirect("/payment-failure");
                                                                                                        } else {
                                                                                                            var android_restaurant = tempPayment.order.restaurant_id;
                                                                                                            var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                                                                            var response_time = CONFIG.respond_timeout;
                                                                                                            var action = 'order_request';
                                                                                                            var options = [orderdata.order_id, android_restaurant, response_time, action];
                                                                                                            for (var i = 1; i == 1; i++) {
                                                                                                                push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                                            }
                                                                                                            var noti_data = {};
                                                                                                            noti_data.rest_id = tempPayment.order.restaurant_id;
                                                                                                            noti_data.order_id = orderdata.order_id;
                                                                                                            noti_data._id = orderdata._id;
                                                                                                            noti_data.user_id = tempPayment.order.user_id;
                                                                                                            noti_data.user_name = user.username;
                                                                                                            noti_data.order_type = 'user';
                                                                                                            io.of('/chat').in(tempPayment.order.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                                            io.of('/chat').in(tempPayment.order.user_id).emit('usernotify', noti_data);
                                                                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                                                                            io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                                                                                                            events.emit('OrderPlacedEmail', req, function (err, result) { });
                                                                                                            var mail_data = {};
                                                                                                            mail_data.user_id = user._id;
                                                                                                            mail_data.order_id = orderdata._id;
                                                                                                            events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                                            var mail_data = {};
                                                                                                            mail_data.user_id = user._id;
                                                                                                            mail_data.order_id = orderdata._id;
                                                                                                            events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                                            db.DeleteDocument('temp_payment', { '_id': tempPayment._id }, function (err, res) { });
                                                                                                            res.redirect("/mobile/payment/success");
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        } else {
                                                                                            var android_restaurant = tempPayment.order.restaurant_id;
                                                                                            var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                                                            var response_time = CONFIG.respond_timeout;
                                                                                            var action = 'order_request';
                                                                                            var options = [orderdata.order_id, android_restaurant, response_time, action];
                                                                                            for (var i = 1; i == 1; i++) {
                                                                                                push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                            }
                                                                                            var noti_data = {};
                                                                                            noti_data.rest_id = tempPayment.order.restaurant_id;
                                                                                            noti_data.order_id = orderdata.order_id;
                                                                                            noti_data._id = orderdata._id;
                                                                                            noti_data.user_id = tempPayment.order.user_id;
                                                                                            noti_data.user_name = user.username;
                                                                                            noti_data.order_type = 'user';
                                                                                            io.of('/chat').in(tempPayment.order.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                            io.of('/chat').in(tempPayment.order.user_id).emit('usernotify', noti_data);
                                                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                                                            events.emit('OrderPlacedEmail', req, function (err, result) { });
                                                                                            var mail_data = {};
                                                                                            mail_data.user_id = user._id;
                                                                                            mail_data.order_id = orderdata._id;
                                                                                            events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                            var mail_data = {};
                                                                                            mail_data.user_id = user._id;
                                                                                            mail_data.order_id = orderdata._id;
                                                                                            events.emit('restaurant_new_order', mail_data, function (err, result) { });
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
                        })
                    }
                } else {
                    res.redirect("/payment-failure");
                }
            } else {
                res.redirect("/payment-failure");
            }
        });
    }
    events.on('OrderUpdate', async function (req, done) {
        var data = {};
        data.status = '0';
        var message = '';
   
        var request = {};
        console.log(req.body, 'this is the request body of the request in the request of request');
        data.transaction_id = req.body.transaction_id;
        if(!req.body.guestLogin){

            data.user_id = req.body.user_id;
        }
        if(req.body.guestLogin){
            data.email = req.body.shipping_address.email;
            data.guestLogin=true;
        }
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
        data.billing_address = req.body.billing_address
        data.shipping_address = req.body.shipping_address
        data.coupon_code = req.body.coupon_code;
        data.schedule_date = req.body.schedule_date;
        data.schedule_time_slot = req.body.schedule_time_slot;
        data.delivery_address = {};
        data.delivery_address = req.body.delivery_address
        // data.delivery_address.fulladres = req.body.delivery_address.fulladres;
        // data.delivery_address.type = req.body.delivery_address.choose_location;
        // data.delivery_address.loc = req.body.delivery_address.loc;
        // data.delivery_address.landmark = req.body.delivery_address.landmark;
        // data.delivery_address.street = req.body.delivery_address.street;
        // data.delivery_address.city = req.body.delivery_address.city;
        // data.delivery_address.name = req.body.delivery_address.name;
        if (req.body && req.body.delivery_address && req.body.delivery_address.phone && req.body.delivery_address.phone.number != (undefined || null || '' || 'undefined')) {
            data.delivery_address.phone = req.body && req.body != (undefined || null) && req.body.delivery_address && req.body.delivery_address.phone.number ? req.body.delivery_address.phone.number : '';
        }
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
                    billings.amount.shippingCharge = req.body.shippingCharge || 0;
                    billings.amount.cod_charge = req.body.cod_charge || 0;
                    billings.amount.total_weight = req.body.total_weight || 0;

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
                        // req.body.user_id = data.user_id;
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
                                let cart_details;
                                if(req.body.guestLogin){
                                     cart_details = await db.GetOneDocument('temp_cart', { 'user_id': req.body.user_id}, {}, {})
                                     await db.DeleteDocument('temp_cart', { 'user_id': req.body.user_id})

                                }else{
                                    cart_details = await db.GetOneDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, {}, {})
                                        await db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id })

                                }
                                console.log(cart_details,'cart_detailscart_detailscart_details');
                                
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
                                // });
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
                                                    // orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
                                                    // orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
                                                    // orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
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
                                            var foodDetails = '';
                                            for (var i = 0; i < orderDetails.foods.length; i++) {
                                                var PriceText = '';
                                                if (orderDetails.foods[i].offer_price > 0) {
                                                    PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >' +
                                                        settings.settings.currency_symbol + ' ' +
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
                                                //mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
                                                mailData.html.push({ name: 'delivery_address_street', value: street || "" });
                                                mailData.html.push({ name: 'delivery_address_fulladres', value: delivery_address_fulladres || "" });
                                                mailData.html.push({ name: 'delivery_address_landmark', value: delivery_address_landmark || "" });
                                                mailData.html.push({ name: 'foodDetails', value: foodDetails || "" });
                                                mailData.html.push({ name: 'item_total', value: item_total || "" });
                                                mailData.html.push({ name: 'offer_discount', value: offer_discount || "" });
                                                mailData.html.push({ name: 'coupon_discount', value: coupon_discount || "" });
                                                mailData.html.push({ name: 'delivery_amount', value: delivery_amount || "" });
                                                //mailData.html.push({ name: 'surge_fee', value: surge_fee || "" });
                                                //mailData.html.push({ name: 'night_fee', value: package_charge || "" });
                                                //mailData.html.push({ name: 'package_charge', value: night_fee || "" });
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
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >' +
                                                settings.settings.currency_symbol + ' ' +
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
    events.on('OrderPlacedEmail', function (req, done) {
        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                done('Invalid Error, Please check your data', {});
                return;
            }
        } else {
            done('Invalid Error, Please check your data', {});
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                done('Invalid Error, Please check your data', {});
                return;
            }
        } else {
            done('Invalid Error, Please check your data', {});
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                done('Invalid Error, Please check your data', {});
            } else {
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                    if (err || !social_settings) {
                        res.send({ status: 0, message: 'Configure your website settings' });
                    } else {
                        db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, code: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                            if (err || !userDetails) {
                                done('Invalid Error, Please check your data', {});
                            } else {
                                //console.log("userDetails", userDetails)
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
                                                refer_offer_price: "$refer_offer_price",
                                                schedule_date: "$schedule_date",
                                                schedule_time_slot: "$schedule_time_slot",
                                                restaurantDetails: {
                                                    restaurantname: "$restaurantDetails.cityname",
                                                    username: "$restaurantDetails.username",
                                                    email: "$restaurantDetails.email",
                                                    address: "$restaurantDetails.address",
                                                },
                                                userDetails: {
                                                    "name": "$userDetails.username",
                                                    "status": "$userDetails.status",
                                                    "phone": "$userDetails.phone",
                                                    "code": "$userDetails.code",
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
                                db.GetAggregation('orders', condition, async function (err, docdata) {
                                    //console.log('docdata',docdata)
                                    if (err || !docdata) {
                                        done('Invalid Error, Please check your data', {});
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
                                            //console.log(delivery_lat_lon)
                                            let response = await getFullAddress(delivery_lat_lon);
                                            //console.log('response',response)
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
                                                db.UpdateDocument('orders', { _id: orderId }, updateData, {}, function (err, secdata) { })
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
                                                        // orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
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
                                                var foodDetails = '<table border="0" width="100%"><tbody><tr style="background-color: #e15500;" width="100%"><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 30%; padding-left: 10px; text-transform: uppercase;" align="center">ITEM NAME</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">PRICE</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 15%; padding-left: 10px; text-transform: uppercase;" align="center">QTY</td><td style="padding: 0px; font-size: 11px; color: #fff; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px; width: 25%; padding-left: 10px; text-transform: uppercase;" align="center">COST</td></tr>';
                                                for (var i = 0; i < orderDetails.foods.length; i++) {
                                                    var PriceText = '';
                                                    var cost = 0.0;
                                                    var costText = '';
                                                    if (orderDetails.foods[i].offer_price > 0) {
                                                        var remaing_price = (parseFloat(orderDetails.foods[i].total) - parseFloat(orderDetails.foods[i].offer_price)).toFixed(2);
                                                        PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >' +
                                                            settings.settings.currency_symbol + ' ' +
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
                                                // if (orderDetails.coupon_code && orderDetails.coupon_code != null && orderDetails.coupon_code != '') {
                                                //     payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Coupon Discount</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.coupon_discount + '</td></tr>';
                                                // }
                                                var delivery_amount = '';
                                                if (orderDetails.billings.amount) {
                                                    payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Delivery Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: green; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">Free</td></tr>';
                                                }
                                                // var surge_fee = '';
                                                // if (orderDetails.billings.amount.surge_fee > 0) {
                                                //     payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Surge Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.surge_fee + '</td></tr>';
                                                // }
                                                // var package_charge = '';
                                                // if (orderDetails.billings.amount.package_charge > 0) {
                                                //     payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Package Charges</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right">' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.package_charge + '</td></tr> ';
                                                // }
                                                // var night_fee = '';
                                                // if (orderDetails.billings.amount.night_fee > 0) {
                                                //     payment_details += '<tr><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;" width="50%" align="right">Night Fare</td><td width="20%" align="right">:</td><td style="padding: 0px; font-size: 11px; color: #000; font-family: open sans,arial,helvetica,sans-serif; line-height: 26px;text-align:center;padding-left:33px;" width="50%" align="right"> ' + settings.settings.currency_symbol + ' ' + orderDetails.billings.amount.night_fee + '</td></tr>';
                                                // }
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
                                                mailData.to = orderDetails.email || userDetails.email;
                                                mailData.html = [];
                                                mailData.html.push({ name: 'orderId', value: orderDetails.order_id || "" });
                                                mailData.html.push({ name: 'mode', value: orderDetails.mode || "" });
                                                mailData.html.push({ name: 'createDate', value: orderDetails.createDate || "" });
                                                mailData.html.push({ name: 'UserName', value: orderDetails.userDetails.name || "" });
                                                // mailData.html.push({ name: 'RestaurantName', value: orderDetails.restaurantDetails.restaurantname || "" });
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
                                                //mailData.html.push({ name: 'package_charge', value: night_fee || "" });
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
                                                mailcontent.sendmail(mailData, function (err, response) { });
                                                done(null, { status: 1, response: response });
                                            }
                                        } else {
                                            done('Invalid Error, Please check your data', {});
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
    /* events.on('OrderPlacedEmail', function (req, done) {
    var userId;
    if (typeof req.body.user_id != 'undefined' && req.body.user_id != '') {
    if (isObjectId(req.body.user_id)) {
    userId = new mongoose.Types.ObjectId(req.body.user_id);
    } else {
    done('Invalid Error, Please check your data', {});
    return;
    }
    } else {
    done('Invalid Error, Please check your data', {});
    return;
    }
    var orderId;
    if (typeof req.body.order_id != 'undefined' && req.body.order_id != '') {
    if (isObjectId(req.body.order_id)) {
    orderId = new mongoose.Types.ObjectId(req.body.order_id);
    } else {
    done('Invalid Error, Please check your data', {});
    return;
    }
    } else {
    done('Invalid Error, Please check your data', {});
    return;
    }
    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
    if (err || !settings) {
    done('Invalid Error, Please check your data', {});
    } else {
    db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
    if (err || !userDetails) {
    done('Invalid Error, Please check your data', {});
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
    refer_offer_price:"$refer_offer_price",
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
    if (err || !docdata) {
    done('Invalid Error, Please check your data', {});
    } else {
    if (docdata.length > 0) {
    var orderDetails = [];
    var format = require('format-number');
    var myFormat = format({ integerSeparator: ',' });
    var pug = {};
    if (typeof docdata[0].orderDetails != 'undefined') {
    orderDetails = docdata[0].orderDetails;
    var lat;
    var lon
    if(typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.loc != 'undefined' && typeof orderDetails.delivery_address.loc.lat != 'undefined'){
    lat = orderDetails.delivery_address.loc.lat;
    }
    if(typeof orderDetails.delivery_address != 'undefined' && typeof orderDetails.delivery_address.loc != 'undefined' && typeof orderDetails.delivery_address.loc.lng != 'undefined'){
    lon = orderDetails.delivery_address.loc.lng;
    }
    var delivery_lat_lon = {lat:lat,lon:lon};
    getFullAddress(delivery_lat_lon).then(function(txtTranslated) {
	
    })
	
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
    var remaing_price = (parseFloat(orderDetails.foods[i].total) - parseFloat(orderDetails.foods[i].offer_price)).toFixed(2);
    PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >'
        + settings.settings.currency_symbol + ' ' +
        orderDetails.foods[i].total + '</span><span>'+remaing_price+'</span>'
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
        var refer_offer_price = '';
        if (orderDetails.refer_offer_price && orderDetails.refer_offer_price != null && orderDetails.refer_offer_price != '') {
        var refer_offer_price = '<tr style="background-color:#ddd"><td class="one-column" style="padding:0px 16px;" bgcolor="#FFFFFF"><table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#FFFFFF"><tr><td class="two-column" style="padding: 3px 16px;text-align:left;font-size:0;" ><div class="column" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="left" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;"></td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">Referral Offer </td></tr></table></div><div class="column width-50" style="width:100%;max-width:30%;display:inline-block;vertical-align:top;"><table class="contents" style="border-spacing:0; width:100%"  ><tr><td align="right" style="font-family: open sans,arial,helvetica,sans-serif;font-size:15px;color:#000;">' + settings.settings.currency_symbol + ' ' + orderDetails.refer_offer_price + '</td></tr></table></div></td></tr></table></td></tr>';
        }
        var mailData = {};
        mailData.template = 'Invoice';
        mailData.to = userDetails.email;
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
        mailData.html.push({ name: 'refer_offer_price', value: refer_offer_price || "" });
        mailData.html.push({ name: 'logo', value: settings.settings.logo || "" });
        mailData.html.push({ name: 'currency_code', value: settings.settings.currency_code || "" });
        mailData.html.push({ name: 'currency_symbol', value: settings.settings.currency_symbol || "" });
        mailData.html.push({ name: 'site_title', value: settings.settings.site_title || "" });
        mailData.html.push({ name: 'site_url', value: settings.settings.site_url || "" });
        mailcontent.sendmail(mailData, function (err, response) {
        done(null, { status: 1, response: response }); });
        } else {
        done('Invalid Error, Please check your data', {});
        }
        }
        })
        }
        })
        }
        })
        }) */
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
        // req.checkBody('delivery_charge', 'billing charge is required').optional();
        // // req.checkBody('night_fare', 'night billing is required').optional();
        // // req.checkBody('surge_fare', 'sugar fare billingrequired').optional();
        // req.checkBody('delivery_address.line1', 'delivery billingddress is required').notEmpty();
        // req.checkBody('delivery_address.choose_location', 'billing type is required').notEmpty();
        // req.checkBody('delivery_address.loc.lng', 'longitude is billinguired').notEmpty();
        // req.checkBody('delivery_address.loc.lat', 'latitude is requiredbilling).notEmpty();
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
        console.log(req.body, "222222222222222222222222222");
        // return
        var data = {};
        data.transaction_id = req.body.transaction_id;
        data.cart_id = req.body._id;
        data.user_id = req.body.user_id;
        data.city_id = req.body.city_id;



        console.log("----------req.body.cart_details------------", req.body.cart_details)
        if (req.body.cart_details) {
            if (req.body.cart_details.length > 0) {
                var food = [];
                let matchingItem 
                for (var i = 0; i < req.body.cart_details.length; i++) {

                    var products = req.body.cart_details[i];
                    const productChecks = await db.GetOneDocument('food', { _id: products.id }, {}, {})
                    const sku =  await db.GetOneDocument('food', { _id: products.id }, { price_details: 1 }, {});
                    console.log(sku.doc.price_details,products.mprice,products.price);
                    
                    if (sku.doc && sku.doc.price_details) {
                        // Find the matching SKU
                        matchingItem = sku.doc.price_details.find(item => 
                            item.mprice === products.mprice && item.sprice === products.price
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
                        // id: products.id,
                        // rcat_id: products.rcat_id,
                        // scat_id: products.scat_id,
                        // name: products.name,
                        // image: products.image,
                        // price: products.price,
                        // mprice: products.mprice,
                        // net_quantity: products.quantity,
                        // quantity: products.quantity,
                        // return_days: returnDate,
                        // slug: products.slug,
                        // offer_price: products.offer_price,
                        // size: products.size,
                        // offer: products.offer,
                        // size_status: products.size_status,
                        // variations: products.variations,
                        let rating = await db.GetDocument('ratings', { user: data.user_id, product_id: products.id }, {}, {})









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
        console.log(req.body, '++++++++++++++++++this is my req.body',)
        data.delivery_address.fulladres = req.body.delivery_address.fulladres;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.loc = req.body.delivery_address.loc;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.city;
        data.delivery_address.name = req.body.delivery_address.name;
        if (req.body && req.body.delivery_address && req.body.delivery_address.phone && req.body.delivery_address.phone.number != (undefined || null || '' || 'undefined')) {

            data.delivery_address.number = req.body && req.body != (undefined || null) && req.body.delivery_address && req.body.delivery_address.phone.number ? req.body.delivery_address.phone.number : '';
        }

        // data.billing_address = {};
        // data.billing_address.fulladres = req.body.billing_address.fulladres;
        // data.billing_address.type = req.body.billing_address.choose_location;
        // data.billing_address.loc = req.body.billing_address.loc;
        // data.billing_address.landmark = req.body.billing_address.landmark;
        // data.billing_address.street = req.body.billing_address.city;
        // data.billing_address.name = req.body.billing_address.name;

        data.location = {};
        // data.location.lng = req.body.delivery_address.loc.lng ? req.body.delivery_address.loc.lng : '';  //if incase use lat lang enable this key and line 
        // data.location.lat = req.body.delivery_address.loc.lat ? req.body.delivery_address.loc.lat : '';
        data.status = '1';
        // db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
        //     if (err || !rest) {
        //         res.send({ "status": 0, "errors": 'Error in city..!' });
        //     } else {
        if(req.body.guestLogin){
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            if (settings.status == false) {
                res.send({ "status": 0, "errors": 'Error in settings..!' });
            } else {
                const cart_details = await db.GetOneDocument('temp_cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {})
                if (cart_details.status == false) {
                    // if (req.body.buyNow) {
                        var transaction_data = {};
                        transaction_data.user_name = data.shipping_address.first_name;
                        transaction_data.city_id = data.city_id;
                        transaction_data.schedule_type = req.body.schedule_type;
                        transaction_data.amount = req.body.pay_total;
                        transaction_data.mode = 'charge';
                        transaction_data.type = 'COD';
                        const transdata = await db.InsertDocument('transaction', transaction_data)
                        console.log(transaction_data, 'this is the transaction dataaaaa');
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
                    // } else {
                    //     res.send({ "status": 0, "errors": 'Error in cart..! 1' });
                    // }
                } else {
                    if (cart_details && typeof cart_details.doc._id != 'undefined') {


                        var transaction_data = {};
                        // transaction_data.user = data.user_id;
                        transaction_data.city_id = data.city_id;
                        transaction_data.schedule_type = req.body.schedule_type;
                        transaction_data.amount = req.body.pay_total;
                        transaction_data.user_name = req.body.shipping_address.first_name;

                        transaction_data.mode = 'charge';
                        if (req.body.pay_total == 0) {
                            transaction_data.type = 'coupon zero cost';
                        } else {
                            transaction_data.type = 'COD';
                        }
                        const transdata = await db.InsertDocument('transaction', transaction_data)
                        console.log(transaction_data, 'this is the transaction dataaaaa');
                        if (!transdata) {
                            res.send({ "status": 0, "errors": 'Error in transaction' });
                        } else {
                            req.body.transaction_id = transdata._id;
                            console.log("I think this is here right now________----------------____________");

                            events.emit('OrderUpdate', req, async function (err, result) {
                                console.log(result, "5555555555555555555555555555");
                                let order_id = result.order_id
                                // return
                                if (err) {
                                    // res.send({ "status": 0, "errors": err });
                                } else {
                                    io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })

                                    res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id, "order_id":order_id  })
                                    // .then(() => {



                                    // });

                                    try {
                                        // events.emit('updateQuantity', req, res);

                                    } catch (e) {
                                        console.log("error at line 5191", e)
                                    }
                                    const template = await db.GetDocument('emailtemplate', { name: 'new_order_to_user', status: { $ne: 0 } }, {}, {});

                                    if (!template || template.length === 0) {
                                        console.error("Email template not found or is inactive.");
                                        return;
                                    }

                                    // Format the date
                                    // const formattedDate = moment(order_date).format('DD/MM/YYYY');

                                    // Prepare mail data

                                    // console.log(user, "templatetemplatetemplate");
                                    // return
                                    // let date = New Date()
                                    let date = new Date();
                                    let formattedDate = moment(date).format('DD/MM/YYYY');
                                    const mailData = {
                                        template: template.doc[0].name,
                                        to: req.body.shipping_address.email,
                                        html: [
                                            // { name: 'site_url', value: settings.site_url || "" },
                                            // { name: 'site_title', value: settings.site_title || "" },
                                            { name: 'name', value: req.body.shipping_address.first_name || "" },
                                            { name: 'order_id', value: order_id || "" },
                                            { name: 'date', value: formattedDate || "" }
                                        ]
                                    };

                                    // Send email
                                    const response = await mailcontent.sendmail(mailData);
                                    // console.log("Email sent successfully:", response);

                                    // console.log()
                                    // cart_details.doc.cart_details.forEach(x => {
                                    //     console.log(x)
                                    // })






                                }
                            });



                        }
                    } else {
                        res.send({ "status": 0, "errors": 'Error in cart..! 2' });
                    }
                }
        
            }
        }else{

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
                            console.log(transaction_data, 'this is the transaction dataaaaa');
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
                            console.log(transaction_data, 'this is the transaction dataaaaa');
                            if (!transdata) {
                                res.send({ "status": 0, "errors": 'Error in transaction' });
                            } else {
                                req.body.transaction_id = transdata._id;
                                console.log("I think this is here right now________----------------____________");
    
                                events.emit('OrderUpdate', req, async function (err, result) {
                                    console.log(result, "5555555555555555555555555555");
                                    let order_id = result.order_id
                                    // return
                                    if (err) {
                                        // res.send({ "status": 0, "errors": err });
                                    } else {
                                        io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
    
                                        res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id,"order_id":order_id })
                                        // .then(() => {
    
    
    
                                        // });
    
                                        try {
                                            events.emit('updateQuantity', req, res);
    
                                        } catch (e) {
                                            console.log("error at line 5191", e)
                                        }
                                        const template = await db.GetDocument('emailtemplate', { name: 'new_order_to_user', status: { $ne: 0 } }, {}, {});
    
                                        if (!template || template.length === 0) {
                                            console.error("Email template not found or is inactive.");
                                            return;
                                        }
    
                                        // Format the date
                                        // const formattedDate = moment(order_date).format('DD/MM/YYYY');
    
                                        // Prepare mail data
    
                                        console.log(user, "templatetemplatetemplate");
                                        // return
                                        // let date = New Date()
                                        let date = new Date();
                                        let formattedDate = moment(date).format('DD/MM/YYYY');
                                        const mailData = {
                                            template: template.doc[0].name,
                                            to: user.doc.email,
                                            html: [
                                                // { name: 'site_url', value: settings.site_url || "" },
                                                // { name: 'site_title', value: settings.site_title || "" },
                                                { name: 'name', value: user.doc.username || "" },
                                                { name: 'order_id', value: order_id || "" },
                                                { name: 'date', value: formattedDate || "" }
                                            ]
                                        };
    
                                        // Send email
                                        const response = await mailcontent.sendmail(mailData);
                                        // console.log("Email sent successfully:", response);
    
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

    function res_send(req, done) {
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
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >' +
                                                settings.settings.currency_symbol + ' ' +
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
    }

    function admin_send(req, done) {
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
                                            PriceText = '<span style = "text-decoration: line-through;margin-right: 5px;color: #afafaf;" >' +
                                                settings.settings.currency_symbol + ' ' +
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
                                        mailcontent.sendmail(mailData, function (err, response) {
                                            //console.log('err, response', err, response)
                                            done(null, { status: 1, response: response });
                                        });
                                    });
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

    controller.getOfferCoupons = function (req, res) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": 'Configure your app settings' });
            } else {
                var todayDate = new Date();
                var couponquery = { status: 1, $and: [{ "valid_from": { $lt: todayDate } }, { "expiry_date": { $gte: todayDate } }] }
                db.GetDocument('coupon', couponquery, {}, {}, function (err, couponData) {
                    if (err || !couponData) {
                        res.send({ "status": "0", "message": 'Sorry no coupon is available', "data": [] });
                    } else {
                        res.send({ "status": "1", "message": '', "data": couponData });
                    }
                    events.emit('coupon_update', {}, function (err, result) { });
                })
            }
        })
    }

    controller.createtempOrders = (req, res) => {
        var data = {};
        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('cart_details', 'cart_details is required').notEmpty();
        req.checkBody('total', 'total is required').notEmpty();
        req.checkBody('pay_total', 'pay_total is required').notEmpty();
        req.checkBody('service_tax', 'service_tax is required').notEmpty();
        req.checkBody('city_id', 'city_id is required').notEmpty();
        req.checkBody('offer_price', 'offer_price is required').optional();
        //req.checkBody('package_charge', 'package_charge is required').optional();
        req.checkBody('coupon_price', 'coupon_discount is required').optional();
        req.checkBody('coupon_code', 'coupon_code id is required').optional();
        req.checkBody('delivery_charge', 'delivery_charge is required').optional();
        req.checkBody('cityDetails', 'cityDetails is required').notEmpty();
        // req.checkBody('surge_fare', 'surge_fee is required').optional();
        req.checkBody('food_offer_price', 'food_offer_price is required').optional();
        req.checkBody('delivery_address.line1', 'delivery_address is required').notEmpty();
        req.checkBody('delivery_address.choose_location', 'address_type is required').notEmpty();
        req.checkBody('delivery_address.loc.lng', 'longitude is required').notEmpty();
        req.checkBody('delivery_address.loc.lat', 'latitude is required').notEmpty();
        req.checkBody('delivery_address.street', 'street is required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        req.sanitizeBody('transaction_id').trim();
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('city_id').trim();
        req.sanitizeBody('total').trim();
        req.sanitizeBody('coupon_code').trim();
        req.sanitizeBody('delivery_charge').trim();
        // req.sanitizeBody('surge_fare').trim();
        // req.sanitizeBody('night_fare').trim();

        // console.log('night_fee',req.body.night_fare,req.body.surge_fare);


        data.transaction_id = req.body.transaction_id;
        data.user_id = req.body.user_id;
        data.city_id = req.body.city_id;
        data.cityDetails = req.body.cityDetails;
        //data.restaurant_id = req.body.restaurant_id;
        if (req.body.cart_details) {
            if (req.body.cart_details.length > 0) {
                var food = [];
                for (var i = 0; i < req.body.cart_details.length; i++) {
                    var products = req.body.cart_details[i];
                    result = products.price_details.find(function (itm) {
                        return itm._id == products.varntid;
                    });
                    if (result && result != "" && result != undefined) {
                        var obj = {
                            id: products.id,
                            rcat_id: products.rcat_id,
                            scat_id: products.scat_id,
                            name: products.name,
                            price: products.price,
                            net_quantity: result.quantity,
                            units: result.unit,
                            quantity: products.quantity,
                            slug: products.slug,
                            offer_price: products.offer_price,
                            varntid: products.varntid
                        }
                        food.push(obj);
                    }
                }
            }
        }
        data.foods = food;
        data.cart_id = req.body._id;
        data.coupon_code = req.body.coupon_code;
        data.schedule_date = req.body.schedule_date;
        data.schedule_time_slot = req.body.schedule_time_slot;
        data.delivery_address = {};
        data.delivery_address.fulladres = req.body.delivery_address.line1;
        data.delivery_address.type = req.body.delivery_address.choose_location;
        data.delivery_address.loc = req.body.delivery_address.loc;
        data.delivery_address.landmark = req.body.delivery_address.landmark;
        data.delivery_address.street = req.body.delivery_address.street;
        data.location = {};
        data.location.lng = req.body.delivery_address.loc.lng;
        data.location.lat = req.body.delivery_address.loc.lat;

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
        if (typeof req.body.schedule_type != 'undefined' && req.body.schedule_type == 1) {
            data.status = 15;
        } else {
            data.status = 1;
        }

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
                if (err || !rest) {
                    res.send({ "status": 0, "errors": 'Error in city' });
                }
                else {
                    // data.rest_offer = rest.offer;
                    // data.com_type = rest.com_type;
                    // data.main_city = rest.main_city;
                    // data.sub_city = rest.sub_city;
                    // data.unique_commission = rest.unique_commission || '';
                    db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                        if (err || !user) {
                            res.send({ "status": 0, "errors": 'Error in user' });
                        }
                        else {
                            db.GetOneDocument('city', { 'status': { $ne: 0 }, 'cityname': data.cityDetails.cityname }, {}, {}, function (err, docdata) {
                                if (err || !docdata) {
                                    res.send({
                                        "status": "0", "errors": "Error in admin commission"
                                    });
                                } else {
                                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                        if (err) {
                                            res.send({ "status": 0, "errors": 'Error in settings' });
                                        }
                                        else {
                                            db.GetOneDocument('cart', { '_id': data.cart_id, 'user_id': data.user_id, 'city_id': data.city_id }, {}, {}, function (err, cart_details) {
                                                if (err || !cart_details) {
                                                    res.send({ "status": 0, "errors": 'Error in cart..!' });
                                                } else {
                                                    if (cart_details && typeof cart_details._id != 'undefined') {
                                                        var billings = {};
                                                        billings.amount = {};
                                                        billings.amount.total = req.body.total;
                                                        billings.amount.coupon_discount = req.body.coupon_price || 0;
                                                        billings.amount.offer_discount = req.body.offer_price || 0;
                                                        billings.amount.delivery_amount = req.body.delivery_charge || 0;
                                                        billings.amount.service_tax = req.body.service_tax || 0;
                                                        // billings.amount.night_fee = req.body.night_fare || 0;
                                                        // billings.amount.surge_fee = req.body.surge_fare || 0;
                                                        //billings.amount.package_charge = req.body.package_charge || 0;
                                                        billings.amount.food_offer_price = req.body.food_offer_price || 0;
                                                        billings.amount.grand_total = req.body.pay_total || 0;
                                                        if (typeof req.body.order_id == 'undefined' || req.body.order_id == '') {
                                                            data.order_id = settings.settings.bookingIdPrefix + '-' + Math.floor(100000 + Math.random() * 900000);
                                                        } else {
                                                            data.order_id = req.body.order_id;
                                                        }
                                                        data.created_time = Date.now();
                                                        if (data.schedule_type == 1) {
                                                            data.created_time = data.schedule_time;
                                                        }
                                                        data.cart_details = cart_details;
                                                        let collection = 'temporders';
                                                        if (billings.amount.grand_total <= 0) {
                                                            collection = 'orders';
                                                        }
                                                        var txn_data = {};
                                                        txn_data.user = data.user_id;
                                                        txn_data.city_id = data.city_id;
                                                        txn_data.amount = req.body.pay_total;
                                                        txn_data.schedule_type = req.body.schedule_type;
                                                        txn_data.type = 'cashfree';
                                                        if (billings.amount.grand_total <= 0) {
                                                            txn_data.type = 'nopayment';
                                                        }
                                                        txn_data.mode = 'charge';
                                                        db.InsertDocument('transaction', txn_data, function (err, transdata) {
                                                            if (err || transdata.nModified == 0) {
                                                                res.send({ "status": 0, "errors": 'Error in transaction' });
                                                            } else {
                                                                var transactionsData = [{ 'gateway_response': {} }];
                                                                db.UpdateDocument('transaction', { '_id': transdata._id }, { 'transactions': transactionsData }, {}, function (err, transaction) {
                                                                    if (err || transaction.nModified == 0) {
                                                                        res.send({ "status": 0, "errors": 'Error in transaction' });
                                                                    } else {
                                                                        data.transaction_id = transdata._id;
                                                                        db.InsertDocument(collection, data, function (err, orderdata) {
                                                                            if (err || orderdata.nModified == 0) {
                                                                                res.send({ "status": 0, "errors": 'Error in order' });
                                                                            } else {
                                                                                var updatedoc = { 'order_history.order_time': new Date(), 'billings': billings };

                                                                                db.UpdateDocument(collection, { '_id': orderdata._id }, updatedoc, {}, function (err, response) {

                                                                                    if (err || response.nModified == 0) {
                                                                                        res.send({ "status": 0, "errors": 'Error in order' });
                                                                                    }
                                                                                    else {
                                                                                        if (billings.amount.grand_total <= 0) {
                                                                                            if (data.coupon_code) {
                                                                                                db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                                                                                                db.GetDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, {}, {}, function (err, usagelimit) {
                                                                                                    if (err || !usagelimit || usagelimit.length == 0) {
                                                                                                        res.send({ "status": "0", "errors": "Sorry error in coupon..!" });
                                                                                                    } else {
                                                                                                        var usagelimits = usagelimit[0].usage.total_coupons;
                                                                                                        var result = usagelimits - 1;
                                                                                                        var use = parseInt(usagelimit[0].used) + parseInt(1);
                                                                                                        if (result <= 0) {
                                                                                                            result = 0;
                                                                                                        }
                                                                                                        db.UpdateDocument('coupon', { status: { $ne: 0 }, code: data.coupon_code }, { 'usage.total_coupons': result, 'used': use }, function (err, result) {
                                                                                                            if (err || result.nModified == 0) { res.send({ "status": "0", "errors": "Error in coupon updation..!" }); }
                                                                                                            else {
                                                                                                                var android_restaurant = req.body.restaurant_id;
                                                                                                                var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                                                                                var response_time = CONFIG.respond_timeout;
                                                                                                                var action = 'order_request';
                                                                                                                var options = [orderdata.order_id, android_restaurant, response_time, action];
                                                                                                                // for (var i = 1; i == 1; i++) {
                                                                                                                //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                                                // }
                                                                                                                var noti_data = {};
                                                                                                                noti_data.city_id = data.city_id;
                                                                                                                noti_data.order_id = orderdata.order_id;
                                                                                                                noti_data.user_id = orderdata.user_id;
                                                                                                                noti_data._id = orderdata._id;
                                                                                                                noti_data.user_name = user.username;
                                                                                                                noti_data.schedule_type = data.schedule_type;
                                                                                                                noti_data.order_type = 'user';
                                                                                                                //io.of('/chat').in(data.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                                                io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                                                                                                io.of('/chat').emit('adminnotify', noti_data);
                                                                                                                var mail_data = {};
                                                                                                                mail_data.user_id = user._id;
                                                                                                                mail_data.order_id = orderdata._id;
                                                                                                                events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                                                                                                // var order_id = orderdata.order_id;
                                                                                                                // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                                                                                                // var mail_data = {};
                                                                                                                // mail_data.user_id = user._id;
                                                                                                                // mail_data.order_id = orderdata._id;
                                                                                                                // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                                                var mail_data = {};
                                                                                                                mail_data.user_id = user._id;
                                                                                                                mail_data.order_id = orderdata._id;
                                                                                                                events.emit('neworderto_admin', mail_data, function (err, result) { });
                                                                                                                res.redirect("/payment-success");
                                                                                                            }
                                                                                                        });
                                                                                                    }
                                                                                                });
                                                                                            }
                                                                                            else {
                                                                                                db.DeleteDocument('cart', { 'user_id': data.user_id, 'city_id': data.city_id }, function (err, res) { });
                                                                                                var android_restaurant = req.body.city_id;
                                                                                                var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
                                                                                                var response_time = CONFIG.respond_timeout;
                                                                                                var action = 'order_request';
                                                                                                var options = [orderdata.order_id, android_restaurant, response_time, action];
                                                                                                // for (var i = 1; i == 1; i++) {
                                                                                                //     push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
                                                                                                // }
                                                                                                var noti_data = {};
                                                                                                noti_data.city_id = data.city_id;
                                                                                                noti_data.order_id = orderdata.order_id;
                                                                                                noti_data.user_id = orderdata.user_id;
                                                                                                noti_data._id = orderdata._id;
                                                                                                noti_data.user_name = user.username;
                                                                                                noti_data.schedule_type = data.schedule_type;
                                                                                                noti_data.order_type = 'user';
                                                                                                // io.of('/chat').in(data.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                                io.of('/chat').in(orderdata.user_id).emit('usernotify', noti_data);
                                                                                                io.of('/chat').emit('adminnotify', noti_data);
                                                                                                var mail_data = {};
                                                                                                mail_data.user_id = orderdata.user_id;
                                                                                                mail_data.order_id = orderdata._id;
                                                                                                events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                                                                                // var order_id = orderdata.order_id;
                                                                                                // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                                                                                // var mail_data = {};
                                                                                                // mail_data.user_id = user._id;
                                                                                                // mail_data.order_id = orderdata._id;
                                                                                                // events.emit('restaurant_new_order', mail_data, function (err, result) { });
                                                                                                var mail_data = {};
                                                                                                mail_data.user_id = orderdata.user_id;
                                                                                                mail_data.order_id = orderdata._id;
                                                                                                events.emit('neworderto_admin', mail_data, function (err, result) { });
                                                                                                res.redirect("/payment-success");
                                                                                            }
                                                                                        } else {

                                                                                            res.send({ "status": 1, "response": 'temp order created', orderId: orderdata._id });
                                                                                        }
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                })
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
        });
    };

    controller.chechPayment = async (req, res) => {
        try {
            console.log(req.body, 'this is the body');
            if (req.body && req.body.data && req.body.data.paymenttype === "razorpay") {
                const orderid = req.body.data.razorpay_order_id
                let razoprpayorderfetch = await razorpay.fetchOder(orderid)

                if (razoprpayorderfetch.status === "paid") {
                    let data = await db.GetOneDocument("paymentgateway", { status: { $ne: 0 }, alias: 'Razorpay' }, {}, {})
                    let secret = data.doc.settings.secret
                    let hmac = crypto.Hmac("sha256", secret)
                    hmac.update(razoprpayorderfetch.id + "|" + req.body.data.razorpay_payment_id)
                    const generated_signature = hmac.digest('hex');
                    // console.log("-----------------")
                    if (generated_signature === req.body.data.razorpay_signature) {
                        let temp_order = await db.GetOneDocument('temporders', { 'razorpayorderid': orderid }, {}, {});
                        const clonetemporeder = JSON.parse(JSON.stringify(temp_order.doc))
                        clonetemporeder.razorpaypayment_id = req.body.data.razorpay_payment_id
                        delete clonetemporeder._id //razorpay payment id is added to the orders data for the particular order
                        let orderinsert = await db.InsertDocument('orders', clonetemporeder) //this is used to insert the data to the orders after verification of the razorapy signature
                        // console.log(orderinsert,"order has inseted success fully")
                        if(temp_order.doc.guestLogin){

                        let removecart = await db.DeleteDocument('temp_cart', { 'user_id': req.body.data.userId  })//this is used to remove data from the cart
                        let deletedtemporder = await db.DeleteDocument("temporders", { 'razorpayorderid': orderid }, {})//this is used to remove data form temporders that we created initally
                        }else{
                            let removecart = await db.DeleteDocument('cart', { 'user_id': temp_order.doc.user_id })//this is used to remove data from the cart
                        let deletedtemporder = await db.DeleteDocument("temporders", { 'razorpayorderid': orderid }, {})//this is used to remove data form temporders that we created initally
                        }
                        io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                        res.status(200).send({status:1, message: "oder placed successfully", data: razoprpayorderfetch, order_id: orderinsert.order_id})//response is sentback to the front for after verifcation of the payment in razorpay
                    } else {
                        res.send({ message: "razorpay signature verification failed", status: false, data: razoprpayorderfetch })
                    }


                } else {
                    res.send({ message: "razorpay payement is not done", status: false, data: razoprpayorderfetch })
                }

            } else {

                // const id = req.body.id
                // let cash = await cashfree.fetchPayment(id)
                // console.log(cash, 'cash this is cash');
                // if (cash[0].payment_status == "SUCCESS") {

                //     const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
                //     if (settings.status == false) {
                //         res.send({ "status": 0, "errors": 'Error in settings..!' });
                //     } else {
                //         // const cart_details = await db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {})
                //         // if (cart_details.status == false) {
                //         // if (req.body.buyNow) {
                //         //     var transaction_data = {};
                //         //     transaction_data.user = data.user_id;
                //         //     transaction_data.city_id = data.city_id;
                //         //     transaction_data.schedule_type = req.body.schedule_type;
                //         //     transaction_data.amount = data.pay_total;
                //         //     transaction_data.mode = 'charge';
                //         //     transaction_data.type = 'COD';
                //         //     const transdata = await db.InsertDocument('transaction', transaction_data)
                //         //     console.log(transaction_data, 'this is the transaction dataaaaa');
                //         //     if (!transdata) {
                //         //         res.send({ "status": 0, "errors": 'Error in transaction' });
                //         //     } else {
                //         //         req.body.transaction_id = transdata._id;
                //         //         events.emit('OrderUpdate', req, function (err, result) {
                //         //             if (err) {
                //         //                 // res.send({ "status": 0, "errors": err });
                //         //             } else {
                //         //                 io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                //         //                 res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                //         //             }
                //         //         });
                //         //     }
                //         // } else {
                //         //     res.send({ "status": 0, "errors": 'Error in cart..! 1' });
                //         // }
                //         // } else {

                //         let temp_order = await db.GetOneDocument('temporders', { 'order_id': cash[0].order_id }, {}, {})
                //         console.log(temp_order, 'this is temp order++++++++++++++++');
                //         let orders = {}
                //         orders.billings = temp_order.doc.billings
                //         orders.order_history = temp_order.doc.order_history
                //         orders.wallet_payment_details = temp_order.doc.wallet_payment_details;
                //         orders.order_id = temp_order.doc.order_id
                //         orders.user_id = temp_order.doc.user_id
                //         orders.transaction_id = temp_order.doc.transaction_id;
                //         orders.email = temp_order.doc.email;
                //         orders.foods = temp_order.doc.foods;
                //         orders.delivery_address = temp_order.doc.delivery_address;
                //         orders.schedule_date = temp_order.doc.schedule_date;
                //         orders.schedule_time_slot = temp_order.doc.schedule_time_slot;
                //         orders.status = temp_order.doc.status;
                //         orders.paid = temp_order.doc.paid;
                //         orders.repay = temp_order.doc.repay;
                //         orders.cart_details = temp_order.doc.cart_details;
                //         orders.pickup_coords = temp_order.doc.pickup_coords;
                //         orders.deliver_coords = temp_order.doc.deliver_coords;
                //         orders.cancel_drivers = temp_order.doc.cancel_drivers;
                //         console.log(orders, 'this is order--------------------------');

                //         delete orders._id
                //         console.log(orders, 'this is order++++++++++++++++++++++++++');
                //         let order = await db.InsertDocument('orders', orders)
                //         console.log(order, 'this is order***************************');
                //         if (!order) {
                //             console.log("error");
                //         } else {


                //             var updatedoc = { 'order_history.payment_time': new Date() };
                //             const response = await db.UpdateDocument('orders', { 'order_id': cash[0].order_id }, updatedoc, {})
                //             await db.DeleteDocument('cart', { 'user_id': temp_order.doc.user_id })
                //             await db.DeleteDocument('temporders', { 'order_id': cash[0].order_id })
                //             io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                //             // res.send({ "status": 1, "message": 'Payment success.', "transaction_id": temp_order.doc.transdata_id });
                //         }
                //         // if (cart_details && typeof cart_details.doc._id != 'undefined') {
                //         //     var transaction_data = {};
                //         //     transaction_data.user = data.user_id;
                //         //     transaction_data.city_id = data.city_id;
                //         //     transaction_data.schedule_type = req.body.schedule_type;
                //         //     transaction_data.amount = data.pay_total;
                //         //     transaction_data.mode = 'charge';
                //         //     transaction_data.type = 'COD';
                //         //     const transdata = await db.InsertDocument('transaction', transaction_data)
                //         //     console.log(transaction_data, 'this is the transaction dataaaaa');
                //         //     if (!transdata) {
                //         //         res.send({ "status": 0, "errors": 'Error in transaction' });
                //         //     } else {
                //         //         req.body.transaction_id = transdata._id;
                //         //         events.emit('OrderUpdate', req, function (err, result) {
                //         //             if (err) {
                //         //             } else {
                //         //                 io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                //         //                 res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                //         //             }
                //         //         });
                //         //     }
                //         // } else {
                //         //     res.send({ "status": 0, "errors": 'Error in cart..! 2' });
                //         // }
                //         // }
                //         // db.GetOneDocument('cart', { 'user_id': data.user_id, 'restaurant_id': data.restaurant_id }, {}, {}, function (err, cart_details) {
                //         //     if (err || !cart_details) {
                //         //         res.send({ "status": 0, "errors": 'Error in cart..!' });
                //         //     } else {
                //         //         if (cart_details && typeof cart_details._id != 'undefined') {
                //         //             var transaction_data = {};
                //         //             transaction_data.user = data.user_id;
                //         //             transaction_data.city_id = data.city_id;
                //         //             transaction_data.schedule_type = req.body.schedule_type;
                //         //             transaction_data.amount = data.pay_total;
                //         //             transaction_data.mode = 'charge';
                //         //             transaction_data.type = 'COD';
                //         //             db.InsertDocument('transaction', transaction_data, function (err, transdata) {
                //         //                 if (err || transdata.nModified == 0) {
                //         //                     res.send({ "status": 0, "errors": 'Error in transaction' });
                //         //                 } else {
                //         //                     req.body.transaction_id = transdata._id;
                //         //                     events.emit('OrderUpdate', req, function (err, result) {
                //         //                         if (err) {
                //         //                             res.send({ "status": 0, "errors": err });
                //         //                         } else {
                //         //                             io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                //         //                             res.send({ "status": 1, "message": 'Payment success.', "transaction_id": transdata._id });
                //         //                         }
                //         //                     });
                //         //                 }
                //         //             });
                //         //         } else {
                //         //             res.send({ "status": 0, "errors": 'Error in cart..!' });
                //         //         }
                //         //     }
                //         // })
                //     }
                // }
                // res.send({ status: true, error: false, data: cash })

            }

        } catch (error) {
            console.log(error);
        }
    }

    controller.checkRefundStatus = async (req, res) => {
        try {
            console.log(req.body, 'this is the request of body+++++++++++++++++++++++++++++++++');
            const data = req.body.data.refund;
            const ts = req.headers["x-webhook-timestamp"]
            // const signature = req.headers["x-webhook-signature"]
            const currTs = Math.floor(new Date().getTime() / 1000)
            if (currTs - ts > 30000) {
                res.send("Failed")
            }
            if (data.refund_status == 'PENDING') {
                await db.UpdateDocument('orders', { order_id: data.order_id }, { $set: { refundStatus: data.refund_status, "order_history.refund_sucess": new Date() } }, {});
                console.log("PENDING PENDING PENDING ");
            } else if (data.refund_status == 'SUCCESS') {
                console.log("SUCCESS SUCCESS SUCCESS  ");
                await db.UpdateDocument('orders', { order_id: data.order_id }, { $set: { refundStatus: data.refund_status, "order_history.refund_success": new Date() } }, {});
            } else if (data.refund_status == 'CANCELLED') {
                console.log("CANCELLED CANCELLED CANCELLED  ");
                await db.UpdateDocument('orders', { order_id: data.order_id }, { $set: { refundStatus: data.refund_status, "order_history.refund_canceled": new Date() } }, {});

            } else if (data.refund_status == 'ONHOLD') {
                console.log("ONHOLD ONHOLD ONHOLD");
                await db.UpdateDocument('orders', { order_id: data.order_id }, { $set: { refundStatus: data.refund_status, "order_history.refund_onhold": new Date() } }, {});

            } else if (data.refund_status == 'FAILED') {
                console.log("FAILED FAILED FAILED");
                await db.UpdateDocument('orders', { order_id: data.order_id }, { $set: { refundStatus: data.refund_status, "order_history.refund_failed": new Date() } }, {});
            }
            const orderss = await db.GetOneDocument('orders', { 'order_id': data.order_id }, {}, {})
            let delivery_address = orderss.doc.delivery_address
            var mailData = {};
            mailData.template = 'new_order_to_user';
            mailData.to = orderss.doc.email;
            mailData.html = [];
            mailData.html.push({ "name": 'name', "value": delivery_address.name });
            mailData.html.push({ "name": 'order_id', "value": data.order_id });
            mailData.html.push({ "name": 'date', "value": data.processed_at });
            // mailData.html.push({ name: 'link', value: settings.settings.site_url });
            mailcontent.sendmail(mailData, function (err, response) { });
            io.of('/chat').emit('order_notification_to_admin', { data: `${data.order_id} is change the status of order refund into ${data.data.refund.refund_status}` })
            res.send({ status: true, error: false, message: "send mail currectly" })

        } catch (error) {
            console.log(error, 'this is the error');
        }
    }
    // function verify(ts, rawBody){
    //     const body = ts + rawBody
    //     let test = crypto.createHmac('sha256', "").update(body).digest("base64");
    //     return test
    //   }
    // function verify(ts, rawBody){
    //     const body = ts + rawBody
    //     let test = crypto.createHmac('sha256', "").update(body).digest("base64");
    //     console.log(test,'this is the test++++++++++++++++++++++');
    //     return test
    //   }


    controller.createtempOrdersNew = async (req, res) => {
        console.log("data you are looking for is printed here");
        console.log(req.body, "req.body111111111111111111111111")


        // return

        try {
            var data = {};


            console.log(req.body, 'whole request body=55555555555555555%%%%%%%%%%%%%%%%%%%%%%%%%%');
            console.log("delivery_address", req.body.delivery_address)


            data.transaction_id = req.body.transaction_id;
            data.user_id = req.body.user_id;
            data.email = req.body.email;
            data.cityDetails = req.body.cityDetails;
            if (req.body.cart_details) {
                if (req.body.cart_details.length > 0) {
                    var food = [];
                    let matchingItem
                    for (var i = 0; i < req.body.cart_details.length; i++) {

                        var products = req.body.cart_details[i];
                        const productCheck = await db.GetOneDocument('food', { _id: products.id }, {}, {})

                        const sku =  await db.GetOneDocument('food', { _id: products.id }, { price_details: 1 }, {});
                        console.log(sku.doc.price_details,products.mprice,products.price);
                        
                        if (sku.doc && sku.doc.price_details) {
                            // Find the matching SKU
                            matchingItem = sku.doc.price_details.find(item => 
                                item.mprice === products.mprice && item.sprice === products.price
                            );
                            
                            if (matchingItem) {
                                console.log(matchingItem.sku,"sku...................................."); // Output: "INRPF240"
                            } else {
                                console.log("No matching SKU found.");
                            }
                        } else {
                            console.log("Product not found or no price details available.");
                        }
                        // const currentDate = new Date();
                        // const returnProductDays = productCheck.doc.return_days;
                        // const returnDate = new Date(currentDate);
                        // returnDate.setDate(returnDate.getDate() + returnProductDays);
                        var obj = {
                            id: products.id,
                            rcat_id: products.rcat_id,
                            scat_id: products.scat_id,
                            name: products.name,
                            image: products.image,
                            price: products.price,
                            mprice: products.mprice,
                            net_quantity: products.quantity,
                            quantity: products.quantity,
                            // return_days: returnDate,
                            slug: products.slug,
                            offer_price: products.offer_price,
                            size: products.size,
                            offer: products.offer,
                            size_status: products.size_status,
                            variations: products.variations,
                            sku:matchingItem.sku || ''
                        }
                        food.push(obj);
                    }
                }

            }
            data.foods = food;
            data.cart_id = req.body._id;
            data.delivery_address = {};
            data.delivery_address.fulladres = req.body.delivery_address.fulladres;
            data.delivery_address.line1 = req.body.delivery_address.line1;
            data.delivery_address.first_name = req.body.delivery_address.first_name;
            data.delivery_address.last_name = req.body.delivery_address.last_name;
            data.delivery_address.email = req.body.delivery_address.email;


            data.delivery_address.state = req.body.delivery_address.state;
            data.delivery_address.type = req.body.delivery_address.choose_location;
            data.delivery_address.landmark = req.body.delivery_address.landmark;
            data.delivery_address.street = req.body.delivery_address.street;
            data.delivery_address.country = req.body.delivery_address.country;
            data.delivery_address.city = req.body.delivery_address.city;
            data.delivery_address.zipcode = req.body.delivery_address.zipcode;
            data.delivery_address.username = req.body.delivery_address.username;
            data.billing_address = {};
            data.shipping_address = data.delivery_address;

            // data.billing_address.fulladres = req.body.billing_address.fulladres;
            data.billing_address.line1 = req.body.billing_address.line1;
            data.billing_address.state = req.body.billing_address.state;
            // data.billing_address.type = req.body.billing_address.choose_location;
            // data.billing_address.landmark = req.body.billing_address.landmark;
            // data.billing_address.street = req.body.billing_address.street;
            data.billing_address.country = req.body.billing_address.country;
            data.billing_address.city = req.body.billing_address.city;
            data.billing_address.pincode = req.body.billing_address.pincode;
            data.billing_address.first_name = req.body.billing_address.first_name;
            data.billing_address.last_name = req.body.billing_address.last_name;
            data.schedule_date = req.body.schedule_date;
            data.schedule_time_slot = req.body.schedule_time_slot;
            // console.log(req.body.delivery_address.phone.code,"req.body.delivery_address.phone.code");

            data.delivery_address.phone = req.body.delivery_address.phone.number ? req.body.delivery_address.phone.number : '';
            data.billing_address.phone = req.body.billing_address.phone_number ? req.body.billing_address.phone_number : '';
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
                if (user.status === false && req.body.guestLogin) {
                    data.guestLogin=true;
                    if (data.type && data.type == 'bynow') {
                        console.log("going insdie this");
                        var billings = {};
                        billings.amount = {};
                        billings.amount.total = parseFloat(parseFloat(req.body.total).toFixed(2));
                        billings.amount.offer_discount = req.body.offer_price || 0;
                        billings.amount.food_offer_price = req.body.food_offer_price || 0;
                        billings.amount.grand_total = parseFloat(parseFloat(req.body.pay_total).toFixed(2)) || 0;
                        billings.amount.service_tax = req.body.service_tax || 0;
                        billings.amount.shippingCharge = req.body.shippingCharge || 0;
                        billings.amount.cod_charge = req.body.cod_charge || 0;
                        billings.amount.total_weight = req.body.total_weight || 0;
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
                                    }

                                }
                            }
                        }


                    } else {
                        console.log("are you here?");
                        
                        const cart_details = await db.GetOneDocument('temp_cart', {  'user_id': req.body.user_id }, {}, {})
                        console.log(cart_details,'cart_details');
                        console.log(data.user_id,'data.user_id');
                        console.log(req.body.user_id,'req.body.user_id');

                        // data.user_id=""
                        delete data.user_id;
                        data.email=req.body.delivery_address.email
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
                                billings.amount.service_tax = req.body.service_tax || 0;
                                billings.amount.shippingCharge = req.body.shippingCharge || 0;
                                billings.amount.cod_charge = req.body.cod_charge || 0;
                                billings.amount.total_weight = req.body.total_weight || 0;
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
                                // txn_data.user = data.user_id;
                                txn_data.user_name = req.body.delivery_address.first_name;

                                txn_data.amount = req.body.pay_total;
                                if (req.body.paymenttype == "Razorpay") {
                                    txn_data.type = "razorpay"
                                } else if (req.body.paymenttype == "Stripe") {
                                    txn_data.type = "stripe"
                                }
                                else {
                                    txn_data.type = 'cashfree';
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
                                        console.log(data, 'data------------');
                    data.guestLogin=true;

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
                                                    await db.DeleteDocument('temp_cart', { 'user_id': data.user_id })
                                                    // db.DeleteDocument('cart', { 'user_id': data.user_id }, function (err, res) { });
                                                    res.redirect("/payment-success");
                                                } else {

                                                    // console.log(orderdata, 'this are order data++++++++++++++++++++++++++');
                                                    if (req.body.paymenttype == "Razorpay") {
                                                        const amounttopay = req.body.pay_total
                                                        let razorpaydata = await razorpay.createOrder(orderdata, amounttopay)
                                                        let data = await db.GetOneDocument("paymentgateway", { status: { $ne: 0 }, alias: 'Razorpay' }, {}, {})
                                                        razorpaydata.secretkey = data.doc.settings.secret
                                                        const response = await db.UpdateDocument(collection, { '_id': orderdata._id }, { razorpayorderid: razorpaydata.id }, {})
                                                        return res.send({ status: 1, message: "Razorpay order created", res: razorpaydata ,orderid: orderdata.order_id})

                                                    } else if (req.body.paymenttype === "Stripe") {
                                                        console.log("are we reaching here");
                                                        res.send({ data: orderdata, status: 1, message: "stripe", orderid: orderdata.order_id })
                                                    } else {

                                                        let cash = await cashfree.create(orderdata)
                                                        console.log(cash, 'cash this is cash');
                                                        return res.send({ status: 1, message: 'Order created', res: cash });
                                                    }
                                                }
                                            }
                                        }
                                    }

                                }

                            } else {
                                return res.send({ status: 0, message: 'Error in user' });
                            }
                        }

                    }
                } else {
                    if (data.type && data.type == 'bynow') {
                        console.log("going insdie this");
                        var billings = {};
                        billings.amount = {};
                        billings.amount.total = parseFloat(parseFloat(req.body.total).toFixed(2));
                        billings.amount.offer_discount = req.body.offer_price || 0;
                        billings.amount.food_offer_price = req.body.food_offer_price || 0;
                        billings.amount.grand_total = parseFloat(parseFloat(req.body.pay_total).toFixed(2)) || 0;
                        billings.amount.service_tax = req.body.service_tax || 0;
                        billings.amount.shippingCharge = req.body.shippingCharge || 0;
                        billings.amount.cod_charge = req.body.cod_charge || 0;
                        billings.amount.total_weight = req.body.total_weight || 0;
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
                                    }

                                }
                            }
                        }


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
                                billings.amount.service_tax = req.body.service_tax || 0;
                                billings.amount.shippingCharge = req.body.shippingCharge || 0;
                                billings.amount.cod_charge = req.body.cod_charge || 0;
                                billings.amount.total_weight = req.body.total_weight || 0;
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
                                if (req.body.paymenttype == "Razorpay") {
                                    txn_data.type = "razorpay"
                                } else if (req.body.paymenttype == "Stripe") {
                                    txn_data.type = "stripe"
                                }
                                else {
                                    txn_data.type = 'cashfree';
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
                                        console.log(data, 'data------------');
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
                                                        const response = await db.UpdateDocument(collection, { '_id': orderdata._id }, { razorpayorderid: razorpaydata.id }, {})
                                                        return res.send({ status: 1, message: "Razorpay order created", res: razorpaydata })

                                                    } else if (req.body.paymenttype === "Stripe") {
                                                        console.log("are we reaching here");
                                                        res.send({ data: orderdata, status: 1, message: "stripe", orderid: orderdata.order_id })
                                                    } else {

                                                        let cash = await cashfree.create(orderdata)
                                                        console.log(cash, 'cash this is cash');
                                                        return res.send({ status: 1, message: 'Order created', res: cash });
                                                    }
                                                }
                                            }
                                        }
                                    }

                                }

                            } else {
                                return res.send({ status: 0, message: 'Error in user' });
                            }
                        }

                    }
                }
            }
        } catch (error) {
            console.log("hrer we have reached");
            console.log(error);
            res.status(500).send({ status: false, message: 'Something went wrong' })
        }
    }

    controller.cashrequest = (req, res) => {
        let crypto = require('crypto');

        var data = {};
        data.status = '0';
        var message = '';
        req.checkQuery('orderId', 'order id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        db.GetOneDocument('settings', { alias: 'general' }, {}, {}, (err, settings) => {
            if (err || !settings) {
                library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                res.redirect("/payment-failure");
            } else {
                db.GetOneDocument('paymentgateway', { 'alias': 'cashfree', status: 1 }, {}, {}, (err, gateWay) => {
                    if (err || !gateWay) {
                        library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                        res.redirect("/payment-failure");
                    } else {
                        db.GetOneDocument('temporders', { '_id': mongoose.Types.ObjectId(req.query.orderId) }, {}, {}, (err, order) => {
                            if (err || !order) {
                                library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                                res.redirect("/payment-failure");
                            } else {
                                db.GetOneDocument('users', { '_id': order.user_id }, {}, {}, (err, user) => {
                                    if (err || !user) {
                                        library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                                        res.redirect("/payment-failure");
                                    } else {
                                        if (order.billings === undefined || order.billings.amount === undefined || order.billings.amount.grand_total === undefined || order.billings.amount.grand_total <= 0) {
                                            library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                                            res.redirect("/payment-failure");
                                        } else {

                                            /* var postData = {
                                                "appId": gateWay.settings.app_key,
                                                "orderId": req.query.orderId,
                                                "orderAmount": order.billings.amount.grand_total,
                                                "orderCurrency": settings.settings.currency_code,
                                                "orderNote": 'user order placement',
                                                'customerName': user.username,
                                                "customerEmail": user.email,
                                                "customerPhone": `${user.phone.code}${user.phone.number}`,
                                                "returnUrl": `${settings.settings.site_url}cashfree/response`
                                            },
                                                secretKey = gateWay.settings.secret_key,
                                                sortedkeys = Object.keys(postData),
                                                url = "",
                                                signatureData = "";
                                            sortedkeys.sort();
                                            for (var i = 0; i < sortedkeys.length; i++) {
                                                k = sortedkeys[i];
                                                signatureData += k + postData[k];
                                            }
                                            var signature = crypto.createHmac('sha256', secretKey).update(signatureData).digest('base64');
                                            postData['signature'] = signature;
                                            if (gateWay.settings.mode == "live") {
                                                url = "https://www.cashfree.com/checkout/post/submit";
                                            } else {
                                                url = "https://test.cashfree.com/billpay/checkout/post/submit";
                                            }
                                            res.render('site/request.pug', { postData: JSON.stringify(postData), url: url }); */
                                            let url = '';
                                            if (gateWay.settings.mode == "live") {
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
                                                    "appId": gateWay.settings.app_key,
                                                    "secretKey": gateWay.settings.secret_key,
                                                    "orderId": req.query.orderId,
                                                    "orderAmount": order.billings.amount.grand_total,
                                                    "orderCurrency": settings.settings.currency_code,
                                                    "orderNote": 'user order placement',
                                                    'customerName': user.username,
                                                    "customerEmail": user.email,
                                                    "customerPhone": `${user.phone.code}${user.phone.number}`,
                                                    "returnUrl": `${settings.settings.site_url}cashfree/response`
                                                }
                                            };

                                            urlrequest(options, async (error, response) => {
                                                let respo = JSON.parse(response.body) // {"paymentLink":"link","status":"OK"}
                                                if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR" || !respo.paymentLink) {
                                                    library.cleartemp({ id: mongoose.Types.ObjectId(req.query.orderId), type: 1 });
                                                    res.redirect("/payment-failure");
                                                } else {
                                                    res.redirect(respo.paymentLink);
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
        });
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
                                                    events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
                                                    // var order_id = orderDetails.order_id;
                                                    // orderTimeLibrary.orderReminder(order_id, function (err, response) { });
                                                    //var mail_data = {};
                                                    //mail_data.user_id = user._id;
                                                    //mail_data.order_id = orderDetails._id;
                                                    //events.emit('restaurant_new_order', mail_data, function (err, result) { });
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
                                        db.DeleteDocument('cart', { 'user_id': orderDetails.user_id, 'city_id': orderDetails.city_id }, function (err, res) { });
                                        var android_restaurant = req.body.city_id;
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
                                        //io.of('/chat').in(orderDetails.user_id).emit('usernotify', noti_data);
                                        //io.of('/chat').emit('adminnotify', noti_data);
                                        var mail_data = {};
                                        mail_data.user_id = orderDetails.user_id;
                                        mail_data.order_id = orderDetails._id;
                                        events.emit('OrderPlacedEmail', mail_data, function (err, result) { });
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
    controller.mipsresponse = (req, res) => {
        db.GetOneDocument('settings', { alias: 'general' }, {}, {}, (err, settings) => {
            if (err || !settings) {
                var siteur = settings.settings.site_url + "/payment-failure"
                res.redirect(siteur);
            } else {
                var siteur = settings.settings.site_url + "/payment-success"
                res.redirect(siteur);
            }
        })
    };

    controller.paymentSuccess = (req, res) => {
        // console.log("req.body paymentSuccess ++++++++++++++++++",req.body); 
        if (req.body) {
            db.GetOneDocument('settings', { alias: 'general' }, {}, {}, (err, settings) => {
                if (err || !settings) {
                    var siteur = settings.settings.site_url + "/payment-failure"
                    res.redirect(siteur);
                } else {
                    // var crypted_callback = "c1ppdDFzOWdiNXMxUEx6MVNHalhubDNtSGhpejlmQndNNnA4N1JhUTNwUDdxRFF2ZXlId1gwdldWTUwwcHZwUnFqUHdUdmJTMkdHRTdNKzMwUzBmd0JwTGoxYWtXTWxIeGw1akZ2VzdYaWdaTjh2SjRkODBkT05UcDdUUCtSYnBLRnJrUnBHRXh0KzYvcWp1K042TGJPRkRyY2J2WHEzTDl1dkducDhCMitUT01JWjQvdXNYdnZwWWRhQzdWS1hoR2NpTzU4UHZDWHluSi9RWGtXcDlrdXoydW45d3VyWDd0RGs0aWZxN3REeU94eDVUQkRxeEQ3SjFEa2ovM0JPdmJ2Z3pyakRaekZaZEZsTWE5TlhEQ0c1TDJuenZVNzlFT05GcXlIdVR1YWd2SnVncWxLMGJ4Sy9KSHRoRnYvMHAxM253WCtGQnZwWm5GVHlJZWxSMG9URVV2eWJBT0NHQUxGcHI1Z3AyVUhvaFlhQ25tT3pYSytvekE0ZkNZU0k2ZnYvMXlOY0w1NHJ4Q25sNXIzckhNT0NXUEJSZDg5bXNOQmlyYlVYRGZWNy96L3pmWFhRSHRoTXZFVG5jQjdlSzF6YXluSUZuU0JkWVg3RjduNXZxeEovQjlDeDFWeGY5RUlmQ21NdHNRazVlc3IwdWZqNC9zRTJJM1hHZHM4Tyt0WHVzOTFYS2s1TmJBSGR6b0QrL2ZCN1Y5RjhLbXQ2ZnI4WVhDaE9NLzZYMkRabkllTDJaQXdRMW8raFJBUFJQekdZaERVNDRWNHR0NnZmaDQzdU1xMGFLVCtmemdMZWl4azF6WDFkVGI4Um96TE1CZ3FTRUhMcWxVMnJ3aUdsdVBZS1JJSVhpeEplcU5EWTBZRXREandsdG5JS2FYbmxNN0tDNzhTbEliM289";
                    var crypted_callback = req.body.crypted_callback;
                    db.GetOneDocument('paymentgateway', { 'alias': 'mips', status: 1 }, {}, {}, (err, gateWay) => {
                        if (err || !gateWay) {
                            var siteur = settings.settings.site_url + "/payment-failure"
                            res.redirect(siteur);
                        } else {
                            var signatureData = new Buffer('kanavu_fashion_ltd_h6tg4e:Nhy654rgu%tgdt579UHGTr43r%^ujoj7').toString('base64');
                            const options = {
                                method: 'POST',
                                url: 'https://api.mips.mu/api/decrypt_imn_data',
                                headers: {
                                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json',
                                    'Authorization': `Basic ${signatureData}`,
                                },
                                body: {
                                    authentify: {
                                        id_merchant: gateWay.settings.id_merchant,
                                        id_entity: gateWay.settings.id_entity,
                                        id_operator: gateWay.settings.id_operator,
                                        operator_password: gateWay.settings.operator_password
                                    },
                                    salt: gateWay.settings.salt,
                                    cipher_key: gateWay.settings.cipher_key,
                                    received_crypted_data: crypted_callback
                                },
                                json: true
                            };

                            urlrequest(options, function (error, response, body) {
                                if (error) {
                                    console.log("Error in mips payment urlrequest *** IMN Callback paymentSuccess ***", error)
                                    // throw new Error(error)
                                };
                                // console.log('body ++++++++++++++++', body)
                                if (body && body.merchant_order_id && body.status == 'SUCCESS') {
                                    db.GetOneDocument('temporders', { _id: mongoose.Types.ObjectId(body.merchant_order_id) }, {}, {}, (err, orderData) => {
                                        // console.log("err, orderData", err, orderData)
                                        if (err && !orderData) {
                                            console.log("111111111111111111111111111111111111111111")
                                            library.cleartemp({ id: mongoose.Types.ObjectId(body.merchant_order_id), type: 1 });
                                            console.log('Error in Mips Payment *** IMN Callback paymentSuccess ***', err)
                                            // var siteur= settings.settings.site_url + "/payment-failure"
                                            // res.redirect(siteur); 
                                        } else {
                                            if (orderData) {
                                                let insert_data = {};
                                                // insert_data._id = orderData._id;
                                                insert_data.billings = orderData.billings;
                                                insert_data.email = orderData.email;
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
                                                db.GetOneDocument('orders', { order_id: orderData.order_id }, {}, {}, (err, orderGet) => {
                                                    if (err) {
                                                        library.cleartemp({ id: mongoose.Types.ObjectId(body.merchant_order_id), type: 1 });
                                                        // var siteur= settings.settings.site_url + "/payment-failure"
                                                        // res.redirect(siteur);
                                                        console.log('Error in Mips Payment *** IMN Callback paymentSuccess ***', err.message)
                                                        return ''
                                                    } else {
                                                        if (orderGet) {
                                                            db.UpdateDocument('orders', { _id: mongoose.Types.ObjectId(orderGet._id) }, { order_id: orderData.order_id }, {}, (error, result) => {
                                                                console.log("+++++++ error, result", error, result)
                                                            })
                                                        } else {
                                                            db.InsertDocument('orders', insert_data, (err, orderDetails) => {
                                                                console.log("err, orderDetails", err, orderDetails)
                                                                if (err && !orderDetails) {
                                                                    console.log("22222222222222222222222222222222222222")
                                                                    library.cleartemp({ id: mongoose.Types.ObjectId(body.merchant_order_id), type: 1 });
                                                                    // var siteur= settings.settings.site_url + "/payment-failure"
                                                                    // res.redirect(siteur);
                                                                    console.log('Error in Mips Payment *** IMN Callback paymentSuccess ***', err.message)
                                                                    return ''
                                                                } else {
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
                                                                    db.UpdateDocument('transaction', { '_id': orderDetails.transaction_id }, { 'transactions': [{ 'gateway_response': body }] }, {}, function (err, response) { })
                                                                    db.GetDocument('users', { _id: orderDetails.user_id }, {}, {}, function (err, user) {
                                                                        if (err && !user) {
                                                                            console.log("3333333333333333333333333333333333333")
                                                                            library.cleartemp({ id: mongoose.Types.ObjectId(body.merchant_order_id), type: 2 });
                                                                            // var siteur= settings.settings.site_url + "/#/payment-success"
                                                                            // res.redirect(siteur);
                                                                            console.log('SUCCESS in Mips Payment *** IMN Callback paymentSuccess ***')
                                                                            return ''
                                                                        } else {
                                                                            if (orderDetails.cart_details && orderDetails.cart_details.type_status == 1) {
                                                                                db.DeleteDocument('cart', { 'user_id': orderDetails.user_id, 'type_status': orderDetails.cart_details.type_status }, function (err, res) { });
                                                                            } else {
                                                                                db.DeleteDocument('cart', { 'user_id': orderDetails.user_id }, function (err, res) { });

                                                                            }

                                                                            console.log('SUCCESS in Mips Payment *** IMN Callback paymentSuccess ***')
                                                                            return
                                                                            // }
                                                                        }
                                                                    });
                                                                    io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                                                                    orderCreateMail(orderDetails._id, orderDetails.user_id);
                                                                }
                                                            })
                                                        }
                                                    }
                                                })
                                            }
                                        }
                                    })
                                }
                            });
                        }
                    })
                }
            })
        } else {
            console.log('IMN Callback req.body return empty response');
        }

    }
    //this is used to fetch all the payment available for the user
    controller.getpaymentmethods = async (req, res) => {
        try {
            let data = await db.GetDocument("paymentgateway", { status: { $eq: 1 } }, {}, {})
            console.log(data);
            console.log("this is the data we are fetching for getting the data about the payment methode available");
            res.send(data.doc)
        } catch (error) {
            res.status(500).send({ message: "somthing has went wrong", error: error })
        }

    }
    controller.getTimeSlot = async (req, res) => {
        try {
            const docdata = await db.GetDocument('timeslots', { status: { $eq: 1 } }, {}, {})
            console.log(docdata);
            console.log("this is the data we are fetching for getting the data about the payment methode available");
            res.send(docdata.doc)
        } catch (error) {
            res.status(500).send({ message: "somthing has went wrong", error: error })
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
            console.log(data);
            let result = await stripeconf.stripecustomercreate(data)
            let chargeid = result.id
            if (result.status == "succeeded") {
                let temporder = await db.GetOneDocument("temporders", { order_id: data.data.orderid }, {}, {})
                let datacloned = JSON.parse(JSON.stringify(temporder.doc))
                datacloned.stripechargeid = chargeid
                delete datacloned._id
                let inserorder = await db.InsertDocument('orders', datacloned)//inset the order after the payment has become success
                let removetemporder = await db.DeleteDocument('temporders', { user_id: temporder.doc.user_id }) //this is used to romove the temporder we have created first  
                let removecart = await db.DeleteDocument('cart', { user_id: temporder.doc.user_id })  //this is used to clear the cart
                io.of('/chat').emit('order_notification_to_admin', { data: "new order placed " })
                res.status(200).send({ message: "oreder has created succussfully" })
            }
        } catch (error) {
            console.log(res)
            res.status(500).send({ message: "payment has failed", error: error })
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


    //this controller is used to do webhook for payment confomation on the base of event occured and verify and sent a mail to the use
    controller.razorpaywebhook = async (req, res) => {
        try {
            let orderstatus = req.body.payload.order.entity.status
            let data = await db.GetOneDocument("temporders", { razorpayorderid: req.body.payload.order.entity.id }, {}, {})
            let dateString = new Date(data.doc.createdAt).toISOString().slice(0, 10)
            if (data && data.doc && orderstatus === "paid") {
                var mailData = {};
                mailData.template = 'Order_Placed_Successfully';
                mailData.to = data.doc.email;
                mailData.html = [];
                mailData.html.push({ name: 'name', value: data.doc.delivery_address ? data.doc.delivery_address.name : '' });
                mailData.html.push({ order_id: 'order_id', value: data.doc.order_id });
                mailData.html.push({ data: 'date', value: dateString })
                // mailData.html.push({ name: 'link', value:"" });
                mailcontent.sendmail(mailData, function (err, response) { });
                console.log("mail has send")

                res.status(200).send('Webhook received');
            } else {
                res.status(500).send({ messsage: "somthing went wrong" })
            }
        } catch (error) {
            res.status(500).send({ message: "server side error", error: error })
        }

    }

    controller.razorpayrefund = async (req, res) => {
        try {
            let refundstatus = JSON.stringify(req.body, null, 2)
            let data = await db.GetOneDocument("orders", { razorpayorderid: req.body.payload.payment.entity.order_id }, {}, {})
            console.log(req.body)
            let datestring = new Date(data?.doc?.createdAt).toISOString().slice(0, 10)
            if (data && data.doc && req.body.event == "refund.processed") {
                var mailData = {};
                mailData.template = 'Refund payment';
                mailData.to = data.doc.email;
                mailData.html = [];
                mailData.html.push({ name: 'name', value: data.doc.delivery_address.name });
                mailData.html.push({ order_id: 'order_id', value: data.doc.order_id });
                // mailData.html.push({ name: 'link', value:"" });
                mailData.html.push({ data: 'date', value: datestring })
                mailcontent.sendmail(mailData, function (err, response) { });
                console.log("mail has send")
                res.status(200).send('Webhook received Successfully');
            } else if (data && data.doc && req.body.event == "refund.failed") {
                await db.UpdateDocument('orders', { _id: { $in: req.body.order_id }, "foods.id": req.body.row.foods.id }, { $set: { "foods.$.status": 18, "foods.$.refundStatus": data.status, "foods.$.refund_date": date } }, { multi: true, })
                let data = await db.UpdateDocument("orders", { order_id: req.body.payload.payment.entity.order_id }, { $set: { status: 17 } }, {})
                res.status(200).send({ message: "webhook has failed" })
            } else {
                console.log("somthing went wrong")
            }
        } catch (error) {
            console.log(error)
            res.status(500).send({ message: "server side error", error: error })
        }
    }

    function orderCreateMail(orderId, user_id) {
        db.GetOneDocument('settings', { alias: 'general' }, {}, {}, (err, settings) => {
            if (err) {
                console.log('Error exception ** orderCreateMail **', err.message);
                return;
            } else {
                db.GetOneDocument('orders', { _id: mongoose.Types.ObjectId(orderId) }, {}, {}, (error, order) => {
                    if (error) {
                        console.log('Error exception ** orderCreateMail **', error.message);
                        return;
                    } else {
                        db.GetOneDocument('users', { _id: mongoose.Types.ObjectId(user_id) }, {}, {}, (error, userdata) => {
                            if (error) {
                                console.log('Error exception ** orderCreateMail **', error.message);
                                return;
                            } else {
                                var date = moment(new Date(order.createdAt)).format('MMMM Do YYYY');
                                var mailData = {};
                                mailData.template = 'new_order_to_user';
                                mailData.to = order.email ? order.email : userdata.email;
                                mailData.html = [];
                                mailData.html.push({ name: 'name', value: userdata.username || "" });
                                mailData.html.push({ name: 'order_id', value: order.order_id || "" });
                                mailData.html.push({ name: 'date', value: date || "" });
                                mailData.html.push({ name: 'link', value: settings.settings.site_url || "" });
                                mailcontent.sendmail(mailData, function (err, response) { });

                                // if(settings.settings && settings.settings.email){
                                //     var mailData1 = {};
                                //     mailData1.template = 'new_order_create';
                                //     mailData1.to = settings.settings.email;
                                //     mailData1.html = [];
                                //     mailData1.html.push({ name: 'name', value: userdata.username || "" });
                                //     mailData1.html.push({ name: 'order_id', value: order.order_id || "" });
                                //     mailData1.html.push({ name: 'date', value: date || "" });
                                //     mailData1.html.push({ name: 'link', value: settings.settings.site_url || "" });
                                //     mailcontent.sendmail(mailData1, function (err, response) { });
                                // }

                                return
                            }
                        })


                    }
                })
            }
        })
    }

    events.on('coupon_update', function (req, done) {
        var todayDate = new Date();
        db.GetDocument('coupon', { status: 1, "expiry_date": { $lt: todayDate } }, {}, {}, function (err, couponData) {
            if (err || !couponData) {
            } else {
                for (var i = 0; i < couponData.length; i++) {
                    db.UpdateDocument('coupon', { '_id': couponData[i]._id }, { status: 0 }, {}, function (err, response) {
                        if (err || response.nModified == 0) {
                            res.send({ "status": 0, "message": 'Error in order' });
                        } else {
                            done({ "status": 1, "message": 'updated successfully' });
                        }
                    })
                }
            }
        })
    })
    events.on('updateQuantity', async (req, res) => {
        try {
            console.log(req.body,'updateQuantityupdateQuantityupdateQuantityupdateQuantity');
            
            let cartdetails = req.body.selectedVariantId








            for (let i = 0; i < cartdetails.length; i++) {
                let getdocs = await db.GetOneDocument('food', { _id: new mongoose.Types.ObjectId(cartdetails[i].id) }, {}, {})
                if (!getdocs) {
                    console.log("update_quantityupdate_quantityupdate_quantity at line 7407")
                    res.send("no product found")
                } else {
                    let previous_quantity = getdocs.doc.quantity
                    let current_quan = cartdetails[i].quantity

                    let update_quantity_value = previous_quantity - cartdetails[i].quantity


                    // console.log("update_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_value")
                    // console.log(update_quantity_value)
                    // console.log("update_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_valueupdate_quantity_value")

                    // console.log(previous_quantity)

                    let update_quantity = await db.UpdateDocument('food', { _id: new mongoose.Types.ObjectId(cartdetails[i].id) }, { 'quantity': update_quantity_value }, {})

                    console.log("update_quantityupdate_quantityupdate_quantity")

                    console.log(update_quantity)
                    console.log("update_quantityupdate_quantityupdate_quantity")






                }
            }




            // console.log("cart details ", req.body.cart_details)
            // console.log(res)

        } catch (e) {
            console.log("error at event listener of updateQuantity", e)
        }


    })
    module.exports = {
        'res_send': res_send,
        'admin_send': admin_send
    }

    return controller;
}
