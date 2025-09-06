
module.exports = function (io) {
    var db = require('../../controller/adaptor/mongodb.js');
    var CONFIG = require('../../config/config');
    var mongoose = require("mongoose");
    var timezone = require('moment-timezone');
    var push = require('../../model/pushNotification.js')(io);
    var stripe = require('stripe')('');
    var mailcontent = require('../../model/mailcontent.js');
    var EventEmitter = require('events').EventEmitter;
    var events = new EventEmitter();
    var pdf = require('html-pdf');
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }
    var urlrequest = require('request');

    var router = {};
    router.ResOrHistory = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$in": [7] } };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { $sort: { "created_time": -1 } },
                    {
                        $project: {
                            "_id": "$_id",
                            "order_id": "$order_id",
                            refer_offer_price: "$refer_offer_price",
                            "amount": "$billings.amount",
                            "restaurant_name": "$restaurant.restaurantname",
                            "pickup_address": "$restaurant.address.fulladres",
                            "restaurant_phone": "$restaurant.phone",
                            "user_name": "$users.username",
                            "user_image": "$users.avatar",
                            "drop_address": "$delivery_address.fulladres",
                            "user_phone": "$users.phone",
                            "delivery_date": "$order_history.food_delivered",
                            "order_status": "$status",
                            "foods": "$foods",
                            "created_time": "$created_time",
                        }
                    }
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        for (var i = 0; i < order_histry.length; i++) {
                            var bookdate = order_histry[i].delivery_date;
                            job[i].delivery_date = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.date_format) + ',    ' +
                                timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
                            if (!order_histry[i].user_image) {
                                job[i].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };

    router.printDocument = function (req, res) {
        var printData = req.body;
        var user_lang = 'en';
        var data;
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
            var settings = generalSettings.settings;
            if (err || !generalSettings) {
                data.status = 0;
                data.message = 'Configure your website settings';
                res.send(data);
            } else {
                db.GetOneDocument('orders', { 'order_id': req.body.order_id }, {}, {}, function (err, orders) {
                    if (err || !orders) {
                        data.status = 0;
                        data.message = 'error in orders';
                        res.send(data);
                    } else {
                        db.GetOneDocument('users', { '_id': orders.user_id }, {}, {}, function (err, user) {
                            if (err || !user) {
                                data.status = 0;
                                data.message = 'error in user';
                                res.send(data);
                            } else {
                                db.GetOneDocument('restaurant', { '_id': orders.restaurant_id }, {}, {}, function (err, restaurant) {
                                    if (err || !restaurant) {
                                        data.status = 0;
                                        data.message = 'error in restaurant';
                                        res.send(data);
                                    } else {
                                        db.GetDocument('emailtemplate', { name: 'print_invoice_outlet', 'status': { $ne: 0 } }, {}, {}, function (err, template) {
                                            if (err) {
                                                console.log("unable to get emailtemplate.....")
                                            }
                                            else {
                                                var order_date = timezone.tz(orders.createdAt, settings.time_zone).format(settings.date_format);
                                                var totalQty = 0;
                                                var totalMrp = 0;
                                                var totalAmt = 0;
                                                var mrpText = '';
                                                var amtText = '';
                                                var foodDetails = '<table border="0" border:1px solid #000000; cellspacing="0" cellpadding="0" width="100%" bgcolor="#fff"><tbody><tr style="border-bottom: 1px solid #545454;"><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 5px;">S:No</p></th><th style="width: 45%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 5px; text-align: left;">Item</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 5px;">Qty</p></th><th style="width: 20%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 5px;">Price</p></th><th style="width: 25%; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 5px;">Total AMT</p></th></tr>';
                                                for (var i = 0; i < orders.foods.length; i++) {
                                                    var PriceText = '';
                                                    var cost = 0.0;
                                                    var costText = '';
                                                    if (orders.foods[i].offer_price > 0) {
                                                        var remaing_price = (parseFloat(orders.foods[i].price) - parseFloat(orders.foods[i].offer_price)).toFixed(2)
                                                        PriceText = settings.currency_symbol + ' ' + remaing_price;
                                                        cost = (parseFloat(orders.foods[i].quantity * parseFloat(remaing_price))).toFixed(2)
                                                        costText = settings.currency_symbol + ' ' + cost;
                                                        totalMrp = (parseFloat(totalMrp) + parseFloat(remaing_price)).toFixed(2)
                                                        totalAmt = (parseFloat(totalAmt) + parseFloat(cost)).toFixed(2)
                                                    } else {
                                                        PriceText = settings.currency_symbol + ' ' + orders.foods[i].price;
                                                        cost = (parseFloat(orders.foods[i].quantity * orders.foods[i].price)).toFixed(2)
                                                        costText = settings.currency_symbol + ' ' + cost;
                                                        totalMrp = (parseFloat(totalMrp) + parseFloat(orders.foods[i].price)).toFixed(2)
                                                        totalAmt = (parseFloat(totalAmt) + parseFloat(cost)).toFixed(2)
                                                    }
                                                    totalQty = parseInt(totalQty + orders.foods[i].quantity)
                                                    foodDetails += '<tr bgcolor="#fff"><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + (i + 1) + '</p></td><td style="width: 45%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: left;">' + orders.foods[i].name + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + orders.foods[i].quantity + '</p></td><td style="width: 20%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + PriceText + '</p></td><td style="width: 20%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + costText + '</p></td></tr>';
                                                }
                                                mrpText = settings.currency_symbol + ' ' + totalMrp;
                                                amtText = settings.currency_symbol + ' ' + totalAmt;
                                                foodDetails += '<tr style="border-bottom: 1px solid #545454;"><th style="width: 5%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 0px;">&nbsp;</p></th><th style="width: 45%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 10px; text-align: left;">&nbsp;</p></th><th style="width: 5%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 0px;">' + totalQty + '</p></th><th style="width: 20%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 0px;">' + mrpText + '</p></th><th style="width: 20%; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: normal; padding: 10px 0px;">' + amtText + '</p></th></tr>';
                                                var total = '';
                                                if (orders.billings.amount.total > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Total Amount</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((orders.billings.amount.total).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var service_tax = '';
                                                if (orders.billings.amount.service_tax > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Service Tax</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((orders.billings.amount.service_tax).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var delivery_amount = '';
                                                if (orders.billings.amount.delivery_amount > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Delivery Charge</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((orders.billings.amount.delivery_amount).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var package_charge = '';
                                                if (orders.billings.amount.package_charge > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Package Charge</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((orders.billings.amount.package_charge).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var food_offer_price = '';
                                                if (orders.billings.amount.food_offer_price > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Food Offer Price</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((orders.billings.amount.food_offer_price).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var offer_discount = '';
                                                if (orders.billings.amount.offer_discount > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Offer Discount</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((orders.billings.amount.offer_discount).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var site_commission = '';
                                                if (printData.site_commission > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Site Commission</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((printData.site_commission).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var restaurant_commission = '';
                                                if (printData.restaurant_commission > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">Grand Total</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 7px 5px; text-align: center;">' + settings.currency_symbol + ' ' + ((printData.restaurant_commission).toFixed(2)) + '</p></td></tr>';
                                                }
                                                /* foodDetails += '<tr bgcolor="#fff"><td style="border-bottom: 1px solid #545454;" colspan="5"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 20px; margin: 0px; color: #404040; padding: 7px 10px; text-align: left;"><span style="font-weight: bold;">Return Policy:</span> Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries</p></td></tr>'; */
                                                foodDetails += '</tbody></table>';


                                                var html1 = template[0].email_content;
                                                html1 = html1.replace(/{{foodDetails}}/g, foodDetails);
                                                html1 = html1.replace(/{{site_url}}/g, settings.site_url);
                                                html1 = html1.replace(/{{site_title}}/g, settings.site_title);
                                                html1 = html1.replace(/{{logo}}/g, settings.site_url + settings.logo);
                                                html1 = html1.replace(/{{order_id}}/g, orders.order_id);
                                                html1 = html1.replace(/{{order_date}}/g, order_date);
                                                html1 = html1.replace(/{{username}}/g, user.username);
                                                html1 = html1.replace(/{{drop_address}}/g, orders.delivery_address.fulladres || ' ');
                                                html1 = html1.replace(/{{drop_address_state}}/g, orders.delivery_address.state || ' ');
                                                html1 = html1.replace(/{{restaurantname}}/g, restaurant.restaurantname);
                                                html1 = html1.replace(/{{pickup_address}}/g, restaurant.address.fulladres || ' ');
                                                html1 = html1.replace(/{{useremail}}/g, user.email);
                                                html1 = html1.replace(/{{user_phone}}/g, user.phone.code + ' ' + user.phone.number);
                                                html1 = html1.replace(/{{symbol}}/g, settings.currency_symbol);
                                                html1 = html1.replace(/{{totalQty}}/g, totalQty);

                                                var options = { format: 'A4' };
                                                var filename = new Date().getTime();
                                                pdf.create(html1, options).toFile('./uploads/invoice/' + filename + '.pdf', function (err, document) {
                                                    if (err) {
                                                        console.log("unable to create pdf.....");
                                                    } else {
                                                        var result = { "status": 1, message: '', "filepath": settings.site_url + 'uploads/invoice/' + filename + '.pdf', filename: filename }
                                                        res.send(result);
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
    };

    router.ResOrHistoryMax = function (req, res) {
        var query = { 'order_id': req.body.order_id };
        db.GetOneDocument('orders', { order_id: req.body.order_id }, {}, {}, function (err, orders) {
            if (err) {
                res.send(err)
            } else {
                db.GetAggregation('orders', [
                    { $match: query },
                    { $unwind: "$foods" },
                    {
                        $project: {
                            _id: 1,
                            total: 1,
                            billings: 1,
                            foods: 1,
                        }
                    },
                    {
                        "$group": {
                            "_id": "$_id",
                            "delivery_amount": { "$first": "$billings.amount.delivery_amount" },
                            "tax": { "$first": "$billings.amount.service_tax" },
                            "billings": { "$first": "$billings" },
                            "amount": { "$first": "$billings.amount.total" },
                            "grand_total": { "$first": "$billings.amount.grand_total" },
                            "bill_datails": { "$addToSet": "$foods" },
                        }
                    },
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        for (var i = 0; i < order_histry.length; i++) {
                            order_histry[i].delivery_amount = (order_histry[i].delivery_amount).toFixed(2) || 0;
                            order_histry[i].amount = (order_histry[i].amount).toFixed(2) || 0;
                            order_histry[i].tax = (order_histry[i].tax).toFixed(2) || 0;
                            order_histry[i].grand_total = (order_histry[i].grand_total).toFixed(2) || 0;
                            order_histry[i].billings.amount.restaurant_commission = parseFloat(order_histry[i].billings.amount.restaurant_commission) || 0;
                            order_histry[i].site_commision = parseFloat(parseFloat(order_histry[i].billings.amount.total - order_histry[i].billings.amount.food_offer_price - order_histry[i].billings.amount.offer_discount) * parseFloat(order_histry[i].billings.amount.applied_admin_com / 100)) || 0;
                        }
                        res.send(order_histry)
                    }
                })
            }
        });
    }
    router.ResOrders = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$in": [1, 3, 4, 5] } };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                var sortby = 'order_date'
                var sorting = {};
                sorting[sortby] = -1;

                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "drivers" } },
                    { $unwind: { path: "$drivers", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "city", localField: "cityname", foreignField: "_id", as: "restaurant.main_city" } },
                    { $unwind: { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            order_id: 1,
                            location: 1,
                            billings: 1,
                            users: 1,
                            order_history: 1,
                            delivery_address: 1,
                            drivers: 1,
                            restaurant: 1,
                            pickup_distance: 1,
                            deliver_distance: 1,
                            pickup_coords: 1,
                            foods: 1,
                            status: 1,

                        }
                    },
                    {
                        "$group": {
                            "_id": "$_id",
                            "order_id": { "$first": "$order_id" },
                            "location": { "$first": "$location" },
                            "rest_location": { "$first": "$restaurant.location" },
                            "pickup_coords": { "$first": "$pickup_coords" },
                            "admin_commission": { "$first": "$admin_commission" },
                            "unique_commission": { "$first": "$restaurant.unique_commission" },
                            "com_type": { "$first": "$restaurant.com_type" },
                            "pickup_distance": { "$first": "$pickup_distance" },
                            "pickup_mins": { "$first": "$pickup_distance" },
                            "deliver_distance": { "$first": "$deliver_distance" },
                            "order_date": { "$first": "$order_history.order_time" },
                            "driver_accpt_time": { "$first": "$order_history.driver_accepted" },
                            "driver_pickup_time": { "$first": "$order_history.driver_pikedup" },
                            "driver_deli_time": { "$first": "$order_history.food_delivered" },
                            "amount": { "$first": "$billings.amount" },
                            "user_name": { "$first": "$users.username" },
                            "user_image": { "$first": "$users.avatar" },
                            "driver_name": { "$first": "$drivers.username" },
                            "driver_image": { "$first": "$drivers.avatar" },
                            "driver_address": { "$first": "$drivers.address.fulladres" },
                            "drop_address": { "$first": "$delivery_address.fulladres" },
                            "user_phone": { "$first": "$users.phone" },
                            "driver_phone": { "$first": "$drivers.phone" },
                            "driver_location": { "$first": "$drivers.location" },
                            "order_status": { "$first": "$status" },
                            "food_datails": { "$addToSet": "$foods" },
                        }
                    },
                    { "$sort": sorting },
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        for (var k = 0; k < order_histry.length; k++) {
                            var applied_admin_com = 0;
                            if (com_type == 'common') {
                                if (typeof order_histry[k].admin_commission != 'undefined') {
                                    applied_admin_com = order_histry[k].admin_commission
                                }
                            } else {
                                if (typeof order_histry[k].unique_commission != 'undefined' && typeof order_histry[k].unique_commission.admin_commission != 'undefined') {
                                    applied_admin_com = order_histry[k].unique_commission.admin_commission
                                }
                            }
                            if (typeof applied_admin_com == 'undefined' || applied_admin_com == null) {
                                applied_admin_com = 0;
                            }
                            var site_total = 0;
                            var total = 0;
                            if (typeof amount.total != 'undefined' && amount.total != null) {
                                total = amount.total;
                            }
                            var offer_discount = 0;
                            if (typeof amount.offer_discount != 'undefined' && amount.offer_discount != null) {
                                offer_discount = amount.offer_discount;
                            }
                            var food_offer_price = 0;
                            if (typeof amount.food_offer_price != 'undefined' && amount.food_offer_price != null) {
                                food_offer_price = amount.food_offer_price;
                            }
                            if ((total - (offer_discount + food_offer_price)) > 0) {
                                site_total = (total - (offer_discount + food_offer_price)) * (applied_admin_com / 100)
                            }
                            order_histry[k].applied_admin_com = applied_admin_com;
                            order_histry[k].site_total = site_total;
                            if (order_histry[k].pickup_coords != undefined && order_histry[k].pickup_coords.length != 0) {

                                var rest_loc = order_histry[k].rest_location;
                                var driver_picked = order_histry[k].pickup_coords.slice(-1)[0];//drivert to restaurant

                                var R = 6371;
                                var Lat = (driver_picked.lat - rest_loc.lat) * (Math.PI / 180);
                                var Long = (driver_picked.lng - rest_loc.lng) * (Math.PI / 180);
                                var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(rest_loc.lat * (Math.PI / 180)) * Math.cos(driver_picked.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                var d = R * c;


                                var time = (d / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = mins;
                            }
                            else {
                                var time = (1 / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = 1;
                            }


                            if (!order_histry[k].user_image) {
                                job[k].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (!order_histry[k].driver_image) {
                                job[k].driver_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (order_histry[k].driver_accpt_time) {
                                job[k].driver_accpt_time = timezone.tz(order_histry[k].driver_accpt_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_accpt_time = '';
                            }
                            if (order_histry[k].driver_pickup_time) {
                                job[k].driver_pickup_time = timezone.tz(order_histry[k].driver_pickup_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_pickup_time = '';
                            }
                            if (order_histry[k].driver_deli_time) {
                                job[k].driver_deli_time = timezone.tz(order_histry[k].driver_deli_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_deli_time = '';
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };
    router.ResNewOrders = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$in": [1] } };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                var sortby = 'order_date'
                var sorting = {};
                sorting[sortby] = -1;

                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "drivers" } },
                    { $unwind: { path: "$drivers", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "city", localField: "restaurant.main_city", foreignField: "cityname", as: "cityDetails" } },
                    { $unwind: { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            order_id: 1,
                            location: 1,
                            order_history: 1,
                            billings: 1,
                            users: 1,
                            order_history: 1,
                            delivery_address: 1,
                            cityDetails: 1,
                            drivers: 1,
                            restaurant: 1,
                            pickup_distance: 1,
                            deliver_distance: 1,
                            pickup_coords: 1,
                            restaurant_time_out_alert: 1,
                            foods: 1,
                            status: 1,
                            cancellationreason: 1,
                            order_message: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
                        }
                    },
                    {
                        "$group": {
                            "_id": "$_id",
                            "order_id": { "$first": "$order_id" },
                            "location": { "$first": "$location" },
                            "rest_location": { "$first": "$restaurant.location" },
                            "pickup_coords": { "$first": "$pickup_coords" },
                            "pickup_distance": { "$first": "$pickup_distance" },
                            "cityDetails": { "$first": "$cityDetails" },
                            "admin_commission": { "$first": "$cityDetails.admin_commission" },
                            "unique_commission": { "$first": "$restaurant.unique_commission" },
                            "com_type": { "$first": "$restaurant.com_type" },
                            "restaurant_time_out_alert": { "$first": "$restaurant_time_out_alert" },
                            "pickup_mins": { "$first": "$pickup_distance" },
                            "deliver_distance": { "$first": "$deliver_distance" },
                            "order_date": { "$first": "$order_history.order_time" },
                            "driver_accpt_time": { "$first": "$order_history.driver_accepted" },
                            "driver_pickup_time": { "$first": "$order_history.driver_pikedup" },
                            "driver_deli_time": { "$first": "$order_history.food_delivered" },
                            "amount": { "$first": "$billings.amount" },
                            "earning_amount": { "$first": "$billings.amount" },
                            "user_name": { "$first": "$users.username" },
                            "user_image": { "$first": "$users.avatar" },
                            "driver_name": { "$first": "$drivers.username" },
                            "driver_image": { "$first": "$drivers.avatar" },
                            "driver_address": { "$first": "$drivers.address.fulladres" },
                            "drop_address": { "$first": "$delivery_address.fulladres" },
                            "user_phone": { "$first": "$users.phone" },
                            "driver_phone": { "$first": "$drivers.phone" },
                            "driver_location": { "$first": "$drivers.location" },
                            "order_status": { "$first": "$status" },
                            "order_message": { "$first": "$order_message" },
                            "cancellationreason": { "$first": "$cancellationreason" },
                            "food_datails": { "$addToSet": "$foods" },
                        }
                    },
                    { "$sort": sorting },
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        // for meging food and addons details from food table and order table starts
                        for (var k = 0; k < order_histry.length; k++) {
                            var applied_admin_com = 0;
                            if (order_histry[k].com_type == 'common') {
                                if (typeof order_histry[k].admin_commission != 'undefined') {
                                    applied_admin_com = order_histry[k].admin_commission
                                }
                            } else {
                                if (typeof order_histry[k].unique_commission != 'undefined' && typeof order_histry[k].unique_commission.admin_commission != 'undefined') {
                                    applied_admin_com = order_histry[k].unique_commission.admin_commission
                                }
                            }
                            if (typeof applied_admin_com == 'undefined' || applied_admin_com == null) {
                                applied_admin_com = 0;
                            }
                            var site_total = 0;
                            var total = 0;
                            if (typeof order_histry[k].amount.total != 'undefined' && order_histry[k].amount.total != null) {
                                total = order_histry[k].amount.total;
                            }
                            var offer_discount = 0;
                            if (typeof order_histry[k].amount.offer_discount != 'undefined' && order_histry[k].amount.offer_discount != null) {
                                offer_discount = order_histry[k].amount.offer_discount;
                            }
                            var food_offer_price = 0;
                            if (typeof order_histry[k].amount.food_offer_price != 'undefined' && order_histry[k].amount.food_offer_price != null) {
                                food_offer_price = order_histry[k].amount.food_offer_price;
                            }
                            if ((total - (offer_discount + food_offer_price)) > 0) {
                                site_total = (total - (offer_discount + food_offer_price)) * (applied_admin_com / 100)
                            }
                            order_histry[k].applied_admin_com = applied_admin_com;
                            order_histry[k].site_total = site_total;
                            if (order_histry[k].pickup_coords != undefined && order_histry[k].pickup_coords.length != 0) {

                                var rest_loc = order_histry[k].rest_location;
                                var driver_picked = order_histry[k].pickup_coords.slice(-1)[0];//drivert to restaurant

                                var R = 6371;
                                var Lat = (driver_picked.lat - rest_loc.lat) * (Math.PI / 180);
                                var Long = (driver_picked.lng - rest_loc.lng) * (Math.PI / 180);
                                var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(rest_loc.lat * (Math.PI / 180)) * Math.cos(driver_picked.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                var d = R * c;


                                var time = (d / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = mins;
                            }
                            else {
                                var time = (1 / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = 1;
                            }

                            if (!order_histry[k].user_image) {
                                job[k].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (!order_histry[k].driver_image) {
                                job[k].driver_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (order_histry[k].driver_accpt_time) {
                                job[k].driver_accpt_time = timezone.tz(order_histry[k].driver_accpt_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_accpt_time = '';
                            }
                            if (order_histry[k].driver_pickup_time) {
                                job[k].driver_pickup_time = timezone.tz(order_histry[k].driver_pickup_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_pickup_time = '';
                            }
                            if (order_histry[k].driver_deli_time) {
                                job[k].driver_deli_time = timezone.tz(order_histry[k].driver_deli_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_deli_time = '';
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };
    router.ResRejectedOrders = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$in": [2, 9, 10] } };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                var sortby = 'order_date'
                var sorting = {};
                sorting[sortby] = -1;

                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "drivers" } },
                    { $unwind: { path: "$drivers", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            order_id: 1,
                            location: 1,
                            billings: 1,
                            users: 1,
                            order_history: 1,
                            delivery_address: 1,
                            refer_offer_price: 1,
                            drivers: 1,
                            restaurant: 1,
                            pickup_distance: 1,
                            deliver_distance: 1,
                            pickup_coords: 1,
                            foods: 1,
                            status: 1,
                            cancellationreason: 1,
                            order_message: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
                        }
                    },
                    {
                        "$group": {
                            "_id": "$_id",
                            "order_id": { "$first": "$order_id" },
                            "refer_offer_price": { "$first": "$refer_offer_price" },
                            "location": { "$first": "$location" },
                            "rest_location": { "$first": "$restaurant.location" },
                            "pickup_coords": { "$first": "$pickup_coords" },
                            "pickup_distance": { "$first": "$pickup_distance" },
                            "pickup_mins": { "$first": "$pickup_distance" },
                            "deliver_distance": { "$first": "$deliver_distance" },
                            "order_date": { "$first": "$order_history.order_time" },
                            "driver_accpt_time": { "$first": "$order_history.driver_accepted" },
                            "driver_pickup_time": { "$first": "$order_history.driver_pikedup" },
                            "driver_deli_time": { "$first": "$order_history.food_delivered" },
                            "amount": { "$first": "$billings.amount" },
                            "user_name": { "$first": "$users.username" },
                            "user_image": { "$first": "$users.avatar" },
                            "driver_name": { "$first": "$drivers.username" },
                            "driver_image": { "$first": "$drivers.avatar" },
                            "driver_address": { "$first": "$drivers.address.fulladres" },
                            "drop_address": { "$first": "$delivery_address.fulladres" },
                            "user_phone": { "$first": "$users.phone" },
                            "driver_phone": { "$first": "$drivers.phone" },
                            "driver_location": { "$first": "$drivers.location" },
                            "order_status": { "$first": "$status" },
                            "order_message": { "$first": "$order_message" },
                            "cancellationreason": { "$first": "$cancellationreason" },
                            "food_datails": { "$addToSet": "$foods" },
                        }
                    },
                    { "$sort": sorting },
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        for (var k = 0; k < order_histry.length; k++) {
                            if (order_histry[k].pickup_coords != undefined && order_histry[k].pickup_coords.length != 0) {

                                var rest_loc = order_histry[k].rest_location;
                                var driver_picked = order_histry[k].pickup_coords.slice(-1)[0];//drivert to restaurant

                                var R = 6371;
                                var Lat = (driver_picked.lat - rest_loc.lat) * (Math.PI / 180);
                                var Long = (driver_picked.lng - rest_loc.lng) * (Math.PI / 180);
                                var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(rest_loc.lat * (Math.PI / 180)) * Math.cos(driver_picked.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                var d = R * c;


                                var time = (d / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = mins;
                            }
                            else {
                                var time = (1 / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = 1;
                            }

                            if (!order_histry[k].user_image) {
                                job[k].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (!order_histry[k].driver_image) {
                                job[k].driver_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (order_histry[k].driver_accpt_time) {
                                job[k].driver_accpt_time = timezone.tz(order_histry[k].driver_accpt_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_accpt_time = '';
                            }
                            if (order_histry[k].driver_pickup_time) {
                                job[k].driver_pickup_time = timezone.tz(order_histry[k].driver_pickup_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_pickup_time = '';
                            }
                            if (order_histry[k].driver_deli_time) {
                                job[k].driver_deli_time = timezone.tz(order_histry[k].driver_deli_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_deli_time = '';
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };
    router.ResOnGoingOrders = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$in": [3, 5, 6] } };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                var sortby = 'order_date'
                var sorting = {};
                sorting[sortby] = -1;

                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "drivers" } },
                    { $unwind: { path: "$drivers", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            order_id: 1,
                            location: 1,
                            billings: 1,
                            users: 1,
                            order_history: 1,
                            delivery_address: 1,
                            show_schedule_time: 1,
                            refer_offer_price: 1,
                            drivers: 1,
                            restaurant: 1,
                            pickup_distance: 1,
                            deliver_distance: 1,
                            pickup_coords: 1,
                            foods: 1,
                            status: 1,
                            cancellationreason: 1,
                            order_message: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
                        }
                    },
                    {
                        "$group": {
                            "_id": "$_id",
                            "order_id": { "$first": "$order_id" },
                            "refer_offer_price": { "$first": "$refer_offer_price" },
                            "show_schedule_time": { "$first": "$show_schedule_time" },
                            "location": { "$first": "$location" },
                            "rest_location": { "$first": "$restaurant.location" },
                            "pickup_coords": { "$first": "$pickup_coords" },
                            "pickup_distance": { "$first": "$pickup_distance" },
                            "pickup_mins": { "$first": "$pickup_distance" },
                            "deliver_distance": { "$first": "$deliver_distance" },
                            "order_date": { "$first": "$order_history.order_time" },
                            "driver_accpt_time": { "$first": "$order_history.driver_accepted" },
                            "driver_pickup_time": { "$first": "$order_history.driver_pikedup" },
                            "driver_deli_time": { "$first": "$order_history.food_delivered" },
                            "amount": { "$first": "$billings.amount" },
                            "user_name": { "$first": "$users.username" },
                            "user_image": { "$first": "$users.avatar" },
                            "driver_name": { "$first": "$drivers.username" },
                            "driver_image": { "$first": "$drivers.avatar" },
                            "driver_address": { "$first": "$drivers.address.fulladres" },
                            "drop_address": { "$first": "$delivery_address.fulladres" },
                            "user_phone": { "$first": "$users.phone" },
                            "driver_phone": { "$first": "$drivers.phone" },
                            "driver_location": { "$first": "$drivers.location" },
                            "order_status": { "$first": "$status" },
                            "order_message": { "$first": "$order_message" },
                            "cancellationreason": { "$first": "$cancellationreason" },
                            "food_datails": { "$addToSet": "$foods" },
                        }
                    },
                    { "$sort": sorting },
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        for (var k = 0; k < order_histry.length; k++) {
                            if (order_histry[k].pickup_coords != undefined && order_histry[k].pickup_coords.length != 0) {

                                var rest_loc = order_histry[k].rest_location;
                                var driver_picked = order_histry[k].pickup_coords.slice(-1)[0];//drivert to restaurant

                                var R = 6371;
                                var Lat = (driver_picked.lat - rest_loc.lat) * (Math.PI / 180);
                                var Long = (driver_picked.lng - rest_loc.lng) * (Math.PI / 180);
                                var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(rest_loc.lat * (Math.PI / 180)) * Math.cos(driver_picked.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                var d = R * c;


                                var time = (d / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = mins;
                            }
                            else {
                                var time = (1 / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = 1;
                            }

                            if (!order_histry[k].user_image) {
                                job[k].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (!order_histry[k].driver_image) {
                                job[k].driver_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (order_histry[k].driver_accpt_time) {
                                job[k].driver_accpt_time = timezone.tz(order_histry[k].driver_accpt_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_accpt_time = '';
                            }
                            if (order_histry[k].driver_pickup_time) {
                                job[k].driver_pickup_time = timezone.tz(order_histry[k].driver_pickup_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_pickup_time = '';
                            }
                            if (order_histry[k].driver_deli_time) {
                                job[k].driver_deli_time = timezone.tz(order_histry[k].driver_deli_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_deli_time = '';
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };

    router.ScheduledOrders = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': 15 };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                var sortby = 'order_date'
                var sorting = {};
                sorting[sortby] = -1;

                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "drivers" } },
                    { $unwind: { path: "$drivers", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            order_id: 1,
                            location: 1,
                            billings: 1,
                            users: 1,
                            order_history: 1,
                            delivery_address: 1,
                            show_schedule_time: 1,
                            refer_offer_price: 1,
                            drivers: 1,
                            restaurant: 1,
                            pickup_distance: 1,
                            deliver_distance: 1,
                            pickup_coords: 1,
                            foods: 1,
                            status: 1,
                            cancellationreason: 1,
                            order_message: { "$cond": [{ $or: [{ $eq: ["$status", 1] }, { $eq: ["$status", 15] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
                        }
                    },
                    {
                        "$group": {
                            "_id": "$_id",
                            "order_id": { "$first": "$order_id" },
                            "location": { "$first": "$location" },
                            "rest_location": { "$first": "$restaurant.location" },
                            "pickup_coords": { "$first": "$pickup_coords" },
                            "pickup_distance": { "$first": "$pickup_distance" },
                            "pickup_mins": { "$first": "$pickup_distance" },
                            "deliver_distance": { "$first": "$deliver_distance" },
                            "order_date": { "$first": "$order_history.order_time" },
                            "driver_accpt_time": { "$first": "$order_history.driver_accepted" },
                            "driver_pickup_time": { "$first": "$order_history.driver_pikedup" },
                            "driver_deli_time": { "$first": "$order_history.food_delivered" },
                            "show_schedule_time": { "$first": "$show_schedule_time" },
                            "refer_offer_price": { "$first": "$refer_offer_price" },
                            "amount": { "$first": "$billings.amount" },
                            "user_name": { "$first": "$users.username" },
                            "user_image": { "$first": "$users.avatar" },
                            "driver_name": { "$first": "$drivers.username" },
                            "driver_image": { "$first": "$drivers.avatar" },
                            "driver_address": { "$first": "$drivers.address.fulladres" },
                            "drop_address": { "$first": "$delivery_address.fulladres" },
                            "user_phone": { "$first": "$users.phone" },
                            "driver_phone": { "$first": "$drivers.phone" },
                            "driver_location": { "$first": "$drivers.location" },
                            "order_status": { "$first": "$status" },
                            "order_message": { "$first": "$order_message" },
                            "cancellationreason": { "$first": "$cancellationreason" },
                            "food_datails": { "$addToSet": "$foods" },
                        }
                    },
                    { "$sort": sorting },
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        for (var k = 0; k < order_histry.length; k++) {
                            if (order_histry[k].pickup_coords != undefined && order_histry[k].pickup_coords.length != 0) {

                                var rest_loc = order_histry[k].rest_location;
                                var driver_picked = order_histry[k].pickup_coords.slice(-1)[0];//drivert to restaurant

                                var R = 6371;
                                var Lat = (driver_picked.lat - rest_loc.lat) * (Math.PI / 180);
                                var Long = (driver_picked.lng - rest_loc.lng) * (Math.PI / 180);
                                var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(rest_loc.lat * (Math.PI / 180)) * Math.cos(driver_picked.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                var d = R * c;


                                var time = (d / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = mins;
                            }
                            else {
                                var time = (1 / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].pickup_distance = parseInt(sec / 2);
                                job[k].pickup_mins = 1;
                            }

                            if (!order_histry[k].user_image) {
                                job[k].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (!order_histry[k].driver_image) {
                                job[k].driver_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (order_histry[k].driver_accpt_time) {
                                job[k].driver_accpt_time = timezone.tz(order_histry[k].driver_accpt_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_accpt_time = '';
                            }
                            if (order_histry[k].driver_pickup_time) {
                                job[k].driver_pickup_time = timezone.tz(order_histry[k].driver_pickup_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_pickup_time = '';
                            }
                            if (order_histry[k].driver_deli_time) {
                                job[k].driver_deli_time = timezone.tz(order_histry[k].driver_deli_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_deli_time = '';
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };
    router.DriverAccOrders = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$in": [6] } };
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send(err);
            } else {
                db.GetAggregation('orders', [
                    { $match: query },
                    { "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
                    { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driver" } },
                    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
                    { $unwind: "$foods" },
                    {
                        $project: {
                            _id: 1,
                            order_id: 1,
                            location: 1,
                            billings: 1,
                            users: 1,
                            order_history: 1,
                            delivery_address: 1,
                            drivers: 1,
                            deliver_distance: 1,
                            pickup_coords: 1,
                            deliver_coords: 1,
                            foods: 1,
                            status: 1,
                        }
                    },
                    {

                        "$group": {
                            "_id": "$_id",
                            "order_id": { "$first": "$order_id" },
                            "location": { "$first": "$location" },
                            "rest_location": { "$first": "$restaurant.location" },
                            "deliver_distance": { "$first": "$deliver_coords" },
                            "deliver_mins": { "$first": "$deliver_coords" },
                            "deliver_coords": { "$first": "$deliver_coords" },
                            "driver_accpt_time": { "$first": "$order_history.driver_accepted" },
                            "driver_pickup_time": { "$first": "$order_history.driver_pikedup" },
                            "driver_deli_time": { "$first": "$order_history.food_delivered" },
                            "amount": { "$first": "$billings.amount" },
                            "user_name": { "$first": "$users.username" },
                            "user_image": { "$first": "$users.avatar" },
                            "driver_name": { "$first": "$drivers.username" },
                            "driver_image": { "$first": "$drivers.avatar" },
                            "driver_address": { "$first": "$drivers.address.fulladres" },
                            "drop_address": { "$first": "$delivery_address.fulladres" },
                            "user_phone": { "$first": "$users.phone" },
                            "delivery_date": { "$first": "$order_history.food_delivered" },
                            "driver_phone": { "$first": "$drivers.phone" },
                            "order_status": { "$first": "$status" },
                            "food_datails": { "$addToSet": "$foods" },
                            "driver_location": { "$first": "$drivers.location" },
                        }
                    }
                ], function (err, order_histry) {
                    if (err) {
                        res.send(err);
                    } else {
                        var job = {};
                        job = order_histry;
                        // for meging food and addons details from food table and order table starts
                        for (var k = 0; k < order_histry.length; k++) {
                            if (order_histry[k].deliver_coords != undefined && order_histry[k].deliver_coords.length != 0) {

                                var user_loc = order_histry[k].location;
                                var driver_deliver = order_histry[k].deliver_coords.slice(-1)[0];//driver to user

                                var R = 6371;
                                var Lat = (driver_deliver.lat - user_loc.lat) * (Math.PI / 180);
                                var Long = (driver_deliver.lng - user_loc.lng) * (Math.PI / 180);
                                var a = Math.sin(Lat / 2) * Math.sin(Lat / 2) + Math.cos(user_loc.lat * (Math.PI / 180)) * Math.cos(driver_deliver.lat * (Math.PI / 180)) * Math.sin(Long / 2) * Math.sin(Long / 2);
                                var c = 2 * Math.atan(Math.sqrt(a), Math.sqrt(1 - a));
                                var d = R * c;

                                var time = (d / 45) * 60;
                                var mins = parseInt(time);
                                var sec = time * 60;
                                job[k].deliver_distance = parseInt(sec / 2);
                                job[k].deliver_mins = mins;
                            }
                            else {
                                var time = (1 / 45) * 60;
                                var sec = time * 60;
                                job[k].deliver_distance = parseInt(sec / 2);
                                job[k].deliver_mins = 1;
                            }

                            if (!order_histry[k].user_image) {
                                job[k].user_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (!order_histry[k].driver_image) {
                                job[k].driver_image = CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            if (order_histry[k].driver_accpt_time) {
                                job[k].driver_accpt_time = timezone.tz(order_histry[k].driver_accpt_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_accpt_time = '';
                            }
                            if (order_histry[k].driver_pickup_time) {
                                job[k].driver_pickup_time = timezone.tz(order_histry[k].driver_pickup_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_pickup_time = '';
                            }
                            if (order_histry[k].driver_deli_time) {
                                job[k].driver_deli_time = timezone.tz(order_histry[k].driver_deli_time, settings.settings.time_zone).format(settings.settings.time_format);
                            }
                            else {
                                job[k].driver_deli_time = '';
                            }
                        }
                        res.send(job)
                    }
                });
            }
        });
    };

    router.ResrejectOreder = function (req, res) {
        var data = {};
        var request = {};
        request.order_id = req.body.id.order_id;
        db.GetOneDocument('orders', { order_id: req.body.id.order_id }, {}, {}, function (err, ordersDetails) {
            if (err || !ordersDetails) {
                res.status(400).send({ message: "Error in reject order" });
            } else {
                if (ordersDetails.status == 9) { res.status(400).send({ message: "Order is already canceled by user" }); }
                else if (ordersDetails.status == 10) { res.status(400).send({ message: "Order is already canceled by admin" }); }
                else if (ordersDetails.status == 0) { res.status(400).send({ message: "Your time is exceeded to accept this order" }); }
                else if (ordersDetails.status == 1 || ordersDetails.status == 15) {
                    db.GetOneDocument('restaurant', { "_id": ordersDetails.restaurant_id }, {}, {}, function (err, restaurant) {
                        if (err || !restaurant) {
                            res.status(400).send({ message: "Invalid restaurant, Please check your data" });
                        } else {
                            if (restaurant.status == 1) {
                                db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
                                    if (err || !transactionDetails) {
                                        res.status(400).send({ message: "Error in reject order" });
                                    } else {
                                        if (transactionDetails.type == 'stripe') {
                                            db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
                                                if (err || !paymentgateway.settings.secret_key) {
                                                    res.status(400).send({ message: "Error in reject order" });
                                                } else {
                                                    stripe.setApiKey(paymentgateway.settings.secret_key);
                                                    var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
                                                    if (charge_index != -1) {
                                                        var charge_id = transactionDetails.transactions[charge_index].gateway_response.id
                                                        stripe.refunds.create({
                                                            charge: charge_id,
                                                        }, function (err, refund) {
                                                            if (err) {
                                                                res.status(400).send({ message: "Error in reject order" });
                                                            } else {
                                                                db.UpdateDocument('orders', { 'order_id': req.body.id.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': req.body.id.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                                    if (err || docdata.nModified == 0) {
                                                                        res.status(400).send({ message: "Error in reject order" });
                                                                    } else {
                                                                        var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
                                                                        db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
                                                                            if (err || responses.nModified == 0) {
                                                                                res.status(400).send({ message: "Error in reject order" });
                                                                            } else {
                                                                                db.GetOneDocument('users', { "_id": ordersDetails.user_id }, {}, {}, function (err, user) {
                                                                                    var android_user = ordersDetails.user_id;
                                                                                    var message = CONFIG.NOTIFICATION.RESTAURANT_REJECTED;
                                                                                    var response_time = CONFIG.respond_timeout;
                                                                                    var options = [request.order_id, android_user, response_time];
                                                                                    for (var i = 1; i == 1; i++) {
                                                                                        push.sendPushnotification(android_user, message, 'order_rejected', 'ANDROID', options, 'USER', function (err, response, body) { });
                                                                                    }
                                                                                    io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
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
                                                                                    res.send(docdata)
                                                                                    mailData = {};
                                                                                    mailData.template = 'restaurant_reject_order';
                                                                                    mailData.to = restaurant.email;
                                                                                    mailData.html = [];
                                                                                    mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                                                    mailcontent.sendmail(mailData, function (err, response) { });

                                                                                    var mail_data = {};
                                                                                    mail_data.user_id = ordersDetails.user_id;
                                                                                    mail_data.order_id = ordersDetails._id;
                                                                                    events.emit('restaurant_reject_touser', mail_data, function (err, result) { });
                                                                                });
                                                                            }
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    } else {
                                                        res.status(400).send({ message: "Error in reject order" });
                                                    }
                                                }
                                            })

                                        } else if (transactionDetails.type == 'paypal') {
                                            var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.intent }).indexOf('authorize');
                                            if (charge_index != -1) {
                                                if (typeof transactionDetails.transactions[charge_index].gateway_response.transactions != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization != 'undefined') {
                                                    var authorization_id = transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization.id;
                                                    var api = require('paypal-rest-sdk');
                                                    api.authorization.void(authorization_id, function (error, refund) {
                                                        if (error) {
                                                            res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
                                                        } else {
                                                            db.UpdateDocument('orders', { 'order_id': req.body.id.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': req.body.id.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                                if (err || docdata.nModified == 0) {
                                                                    res.status(400).send({ message: "Error in reject order" });
                                                                } else {
                                                                    var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
                                                                    db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
                                                                        if (err || responses.nModified == 0) {
                                                                            res.status(400).send({ message: "Error in reject order" });
                                                                        } else {
                                                                            db.GetOneDocument('users', { "_id": ordersDetails.user_id }, {}, {}, function (err, user) {
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

                                                                                var mail_data = {};
                                                                                mail_data.user_id = ordersDetails.user_id;
                                                                                mail_data.order_id = ordersDetails._id;
                                                                                events.emit('restaurant_reject_touser', mail_data, function (err, result) { });
                                                                                res.send(docdata)
                                                                            });
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    })
                                                } else {
                                                    res.status(400).send({ message: "Error in reject order" });
                                                }
                                            } else {
                                                res.status(400).send({ message: "Error in reject order" });
                                            }
                                        } else if (transactionDetails.type == 'nopayment') {
                                            db.UpdateDocument('orders', { 'order_id': req.body.id.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': req.body.id.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                if (err || docdata.nModified == 0) {
                                                    res.status(400).send({ message: "Error in reject order" });
                                                } else {
                                                    db.GetOneDocument('users', { "_id": ordersDetails.user_id }, {}, {}, function (err, user) {
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
                                                        res.send(docdata)

                                                        mailData = {};
                                                        mailData.template = 'restaurant_reject_order';
                                                        mailData.to = restaurant.email;
                                                        mailData.html = [];
                                                        mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                        mailcontent.sendmail(mailData, function (err, response) { });

                                                        var mail_data = {};
                                                        mail_data.user_id = ordersDetails.user_id;
                                                        mail_data.order_id = ordersDetails._id;
                                                        events.emit('restaurant_reject_touser', mail_data, function (err, result) { });
                                                    });
                                                }
                                            })
                                        } else if (transactionDetails.type == 'COD') {
                                            db.UpdateDocument('orders', { 'order_id': req.body.id.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': req.body.id.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                if (err || docdata.nModified == 0) {
                                                    res.status(400).send({ message: "Error in reject order" });
                                                } else {
                                                    db.GetOneDocument('users', { "_id": ordersDetails.user_id }, {}, {}, function (err, user) {
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
                                                        res.send(docdata)

                                                        mailData = {};
                                                        mailData.template = 'restaurant_reject_order';
                                                        mailData.to = restaurant.email;
                                                        mailData.html = [];
                                                        mailData.html.push({ name: 'name', value: restaurant.username || "" });
                                                        mailcontent.sendmail(mailData, function (err, response) { });

                                                        var mail_data = {};
                                                        mail_data.user_id = ordersDetails.user_id;
                                                        mail_data.order_id = ordersDetails._id;
                                                        events.emit('restaurant_reject_touser', mail_data, function (err, result) { });

                                                        if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
                                                            var refer_offer = ordersDetails.refer_offer;
                                                            db.UpdateDocument('users', { '_id': user._id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
                                                        }

                                                    });
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
                                                            'refundNote': req.body.id.reason
                                                        }
                                                    };
                                                    urlrequest(options, async (error, response) => {
                                                        let respo = JSON.parse(response.body) // { message: 'Refund has been initiated.', refundId: 5659, status: 'OK' }
                                                        if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR") {
                                                            res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
                                                        } else {
                                                            db.UpdateDocument('orders', { 'order_id': req.body.id.order_id }, { 'status': 2, 'order_history.restaurant_rejected': new Date(), 'cancellationreason': req.body.id.reason, cancel_due_to: '1' }, {}, function (err, docdata) {
                                                                if (err || docdata.nModified == 0) {
                                                                    res.status(400).send({ message: "Error in reject order" });
                                                                } else {
                                                                    var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response_refund: respo } } };
                                                                    db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
                                                                        if (err || responses.nModified == 0) {
                                                                            res.status(400).send({ message: "Error in reject order" });
                                                                        } else {
                                                                            db.GetOneDocument('users', { "_id": ordersDetails.user_id }, {}, {}, function (err, user) {
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

                                                                                var mail_data = {};
                                                                                mail_data.user_id = ordersDetails.user_id;
                                                                                mail_data.order_id = ordersDetails._id;
                                                                                events.emit('restaurant_reject_touser', mail_data, function (err, result) { });
                                                                                res.send(docdata)
                                                                            });
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    });
                                                }
                                            });
                                        } else {
                                            res.status(400).send({ message: "Error in reject order" });
                                        }
                                    }
                                })
                            } else if (restaurant.status == 2) {
                                res.status(400).send({ message: "Your Account has been Deactivated" });

                            } else {
                                res.status(400).send({ message: "Invalid restaurant, Please check your data" });

                            }
                        }
                    })
                }
            }
        });
    }

    events.on('restaurant_reject_touser', function (req, done) {
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
                                        if (typeof orderDetails.order_history != 'undefined' && typeof orderDetails.order_history.restaurant_rejected != 'undefined') {
                                            orderDetails.order_history.restaurant_rejected = timezone.tz(orderDetails.order_history.restaurant_rejected, settings.settings.time_zone).format(settings.settings.date_format);
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
                                    mailData.template = 'restaurant_reject_touser';
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
                                    mailData.html.push({ name: 'restaurant_rejected', value: orderDetails.order_history.restaurant_rejected || "" });


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

    router.getcancelreason = function getcancelreason(req, res) {
        var query = {};
        query = { 'type': 'restaurant', 'status': 1 }
        db.GetDocument('cancellation', query, {}, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data);
            }
        });
    }

    router.getordercount = function getordercount(req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), 'status': { "$eq": 1 } };
        var pipeline = [
            { $match: query },
            { $sort: { "createdAt": -1 } }

        ]
        //db.GetDocument('orders', query, {}, {}, function (err, total) {
        db.GetAggregation('orders', pipeline, function (err, total) {

            //});
            if (err) {
                res.send(err);
            } else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (err) { res.send(err) }
                    else {
                        if (total[0] && total[0].order_history) {
                            var order_date = timezone.tz(total[0].order_history.order_time, settings.settings.time_zone).format(settings.settings.date_format);
                            var order_time = timezone.tz(total[0].order_history.order_time, settings.settings.time_zone).format(settings.settings.time_format);
                            var details = {};
                            details.order_time = order_time;
                            details.order_date = order_date;
                            details.order_count = total.length || 0;
                            res.send(details);
                        }
                        else {
                            var details = {};
                            details.order_count = 0;
                            res.send(details);
                        }
                    }
                });
            }
        });
    }
    /* 
        router.RestAcceptOrder = function (req, res) {
            var data = {};
            var request = {};
            request.order_id = req.body.id;
            db.GetOneDocument('orders', { 'order_id': request.order_id }, {}, {}, function (err, orders) {
                if (err || !orders) {
                    res.status(400).send({ message: "Invalid orders, Please check your data" });
                }
                else {
                    if (orders.status == 9) { res.status(400).send({ message: "Order is already canceled by user" }); }
                    else if (orders.status == 10) { res.status(400).send({ message: "Order is already canceled by admin" }); }
                    else if (orders.status == 0) { res.status(400).send({ message: "Your time is exceeded to accept this order" }); }
                    else if (orders.status == 1) {
                        db.GetOneDocument('restaurant', { _id: orders.restaurant_id }, {}, {}, function (err, restaurant) {
                            if (err || !restaurant) {
                                res.status(400).send({ message: "Invalid restaurant, Please check your data" });
                            } else {
                                if (restaurant.status == 1) {
                                    db.GetOneDocument('users', { _id: orders.user_id, status: 1 }, {}, {}, function (userErr, userRespo) {
                                        if (userErr || !userRespo) {
                                            res.status(400).send({ message: "Invalid User, Please check your data" });
                                        } else {
                                            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                                if (err) {
                                                    res.status(400).send({ message: "Error in settings" });
                                                } else {
                                                    var lon = restaurant.location.lng;
                                                    var lat = restaurant.location.lat;
                                                    var temp_radius = settings.settings.radius || 20;
                                                    var radius = parseInt(temp_radius);
                                                    var filter_query = { "status": 1, "currentStatus": 1, "currentJob": 0, "logout": 0 };
                                                    var citycondition = [												
                                                        {
                                                            "$geoNear": {
                                                                near: {
                                                                    type: "Point",
                                                                    coordinates: [parseFloat(lon), parseFloat(lat)]
                                                                },//user lat lng
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
                                                                email: 1,
                                                                device_info: 1,
                                                                document: "$$ROOT"
                                                            }
                                                        },
                                                        {
                                                            $group: { "_id": null, "documentData": { $push: "$document" } }
                                                        }
                                                    ];
                                                    db.GetAggregation('drivers', citycondition, function (err, docdata) {
                                                        if (err || docdata.length == 0 || !docdata) {
                                                            res.status(400).send({ message: 'sorry no drivers available in your location' });
                                                        } else {
                                                            db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 3, 'order_history.restaurant_accepted': new Date() }, {}, function (err, updateData) {
                                                                if (err || updateData.nModified == 0) {
                                                                    res.status(400).send({ message: "Error in accept order" });
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
                                                                            var message = CONFIG.NOTIFICATION.REQUEST_FOR_DRIVER;
                                                                            var response_time = 250;
                                                                            var options = [request.order_id, android_driver, gcm, device_token];
                                                                            push.sendPushnotification(android_driver, message, 'order_request', 'ANDROID', options, 'DRIVER', function (err, response, body) { });
                                                                        }
                                                                        io.of('/chat').in(orders._id).emit('OrderUpdated', { orderId: orders._id });
                                                                        res.status(200).send({ message: 'Sucessfully Accepted and send request for ' + docdata[0].documentData.length + ' drivers' });
                                                                        var mail_data = {};
                                                                        mail_data.user_id = userRespo._id;
                                                                        mail_data.order_id = orders._id;
                                                                        events.emit('restaurant_accept_order', mail_data, function (err, result) { });
                                                                        var mail_data = {};
                                                                        mail_data.user_id = userRespo._id;
                                                                        mail_data.order_id = orders._id;
                                                                        events.emit('restaurant_accepts_toadmin', mail_data, function (err, result) { });
                                                                        mailDatas = {};
                                                                        mailDatas.template = 'user_accept_order';
                                                                        mailDatas.to = userRespo.email;
                                                                        mailDatas.html = [];
                                                                        mailDatas.html.push({ name: 'name', value: userRespo.username || "" });
                                                                        mailcontent.sendmail(mailDatas, function (err, response) { });
                                                                    } else {
                                                                        res.status(400).send({ message: 'sorry no drivers available in your location' });
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                } else if (restaurant.status == 2) {
                                    res.status(400).send({ message: "Your Account has been Deactivated" });
    
                                } else {
                                    res.status(400).send({ message: "Invalid restaurant, Please check your data" });
    
                                }
                            }
                        });
                    }
                }
            });
        } */



    router.RestAcceptOrder = function (req, res) {
        var data = {};
        var request = {};
        request.order_id = req.body.id;
        db.GetOneDocument('orders', { 'order_id': request.order_id }, {}, {}, function (err, orders) {
            if (err || !orders) {
                res.status(400).send({ message: 'Invalid orders, Please check your data' });
            }
            else {
                if (orders.status == 9) { res.status(400).send({ message: 'Order is already canceled by user' }); }
                else if (orders.status == 10) { res.status(400).send({ message: 'Order is already canceled by admin' }); }
                else if (orders.status == 0) { res.status(400).send({ message: 'Your time is exceeded to accept this order' }); }
                else if (orders.status == 1 || orders.status == 15) {
                    db.GetOneDocument('restaurant', { _id: orders.restaurant_id }, {}, {}, function (err, restaurant) {
                        if (err || !restaurant) {
                            res.status(400).send({ message: 'Invalid restaurant, Please check your data' });
                        } else {
                            if (restaurant.status == 1) {
                                db.GetOneDocument('users', { _id: orders.user_id, status: 1 }, {}, {}, function (userErr, userRespo) {
                                    if (userErr || !userRespo) {
                                        res.status(400).send({ message: 'Invalid User, Please check your data' });
                                    } else {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            if (err) {
                                                res.status(400).send({ message: 'Error in settings' });
                                            } else {
                                                var lon = restaurant.location.lng;
                                                var lat = restaurant.location.lat;
                                                db.GetOneDocument('transaction', { "_id": orders.transaction_id }, {}, {}, function (err, transactionDetails) {
                                                    if (err || !transactionDetails) {
                                                        res.send({ "status": 0, "message": 'Invalid Error, Please check your data' });
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
                                                                    email: 1,
                                                                    device_info: 1,
                                                                    document: "$$ROOT"
                                                                }
                                                            },
                                                            {
                                                                $group: { "_id": null, "documentData": { $push: "$document" } }
                                                            }
                                                        ];
                                                        db.GetAggregation('drivers', citycondition, function (err, docdata) {
                                                            console.log('fd', err, docdata);

                                                            if (err || docdata.length == 0 || !docdata || !docdata[0].documentData || docdata[0].documentData.length < 0 || typeof docdata[0].documentData == 'undefined') {
                                                                filter_query['currentJob'] = 1;
                                                                db.GetAggregation('drivers', citycondition, function (err, docdata1) {
                                                                    console.log('fd111', err, docdata1);
                                                                    if (err || docdata1.length == 0 || !docdata1 || !docdata1[0].documentData || docdata1[0].documentData.length < 0 || typeof docdata1[0].documentData == 'undefined') {
                                                                        res.status(400).send({ message: 'sorry no drivers available in your location' });
                                                                    } else {
                                                                        db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 3, 'order_history.restaurant_accepted': new Date() }, {}, function (err, updateData) {
                                                                            if (err || updateData.nModified == 0) {
                                                                                res.status(400).send({ message: "Error in accept order" });
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
                                                                                    noti_data.user_name = userRespo.username;
                                                                                    noti_data.order_type = 'restaurant_accept_order';
                                                                                    io.of('/chat').in(orders.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                                    io.of('/chat').in(orders.user_id).emit('usernotify', noti_data);
                                                                                    io.of('/chat').emit('adminnotify', noti_data);
                                                                                    res.status(200).send({ message: 'Sucessfully Accepted and send request for ' + docdata1[0].documentData.length + ' drivers' });
                                                                                    var mail_data = {};
                                                                                    mail_data.user_id = userRespo._id;
                                                                                    mail_data.order_id = orders._id;
                                                                                    events.emit('restaurant_accept_order', mail_data, function (err, result) { });
                                                                                    var mail_data = {};
                                                                                    mail_data.user_id = userRespo._id;
                                                                                    mail_data.order_id = orders._id;
                                                                                    events.emit('restaurant_accepts_toadmin', mail_data, function (err, result) { });
                                                                                    mailDatas = {};
                                                                                    mailDatas.template = 'user_accept_order';
                                                                                    mailDatas.to = userRespo.email;
                                                                                    mailDatas.html = [];
                                                                                    mailDatas.html.push({ name: 'name', value: userRespo.username || "" });
                                                                                    mailcontent.sendmail(mailDatas, function (err, response) { });
                                                                                } else {
                                                                                    res.status(400).send({ message: 'sorry no drivers available in your location' });
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                })
                                                            } else {
                                                                db.UpdateDocument('orders', { 'order_id': request.order_id }, { 'status': 3, 'order_history.restaurant_accepted': new Date() }, {}, function (err, updateData) {
                                                                    if (err || updateData.nModified == 0) {
                                                                        res.status(400).send({ message: "Error in accept order" });
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
                                                                                var message = CONFIG.NOTIFICATION.REQUEST_FOR_DRIVER;
                                                                                var response_time = 250;
                                                                                var options = [request.order_id, android_driver, gcm, device_token];
                                                                                push.sendPushnotification(android_driver, message, 'order_request', 'ANDROID', options, 'DRIVER', function (err, response, body) { });
                                                                            }
                                                                            io.of('/chat').in(orders._id).emit('OrderUpdated', { orderId: orders._id });
                                                                            var noti_data = {};
                                                                            noti_data.rest_id = orders.restaurant_id;
                                                                            noti_data.order_id = orders.order_id;
                                                                            noti_data.user_id = orders.user_id;
                                                                            noti_data._id = orders._id;
                                                                            noti_data.user_name = userRespo.username;
                                                                            noti_data.order_type = 'restaurant_accept_order';
                                                                            io.of('/chat').in(orders.restaurant_id).emit('restnotify', { restauranId: noti_data });
                                                                            io.of('/chat').in(orders.user_id).emit('usernotify', noti_data);
                                                                            io.of('/chat').emit('adminnotify', noti_data);
                                                                            res.status(200).send({ message: 'Sucessfully Accepted and send request for ' + docdata[0].documentData.length + ' drivers' });
                                                                            var mail_data = {};
                                                                            mail_data.user_id = userRespo._id;
                                                                            mail_data.order_id = orders._id;
                                                                            events.emit('restaurant_accept_order', mail_data, function (err, result) { });
                                                                            var mail_data = {};
                                                                            mail_data.user_id = userRespo._id;
                                                                            mail_data.order_id = orders._id;
                                                                            events.emit('restaurant_accepts_toadmin', mail_data, function (err, result) { });
                                                                            mailDatas = {};
                                                                            mailDatas.template = 'user_accept_order';
                                                                            mailDatas.to = userRespo.email;
                                                                            mailDatas.html = [];
                                                                            mailDatas.html.push({ name: 'name', value: userRespo.username || "" });
                                                                            mailcontent.sendmail(mailDatas, function (err, response) { });
                                                                        } else {
                                                                            res.status(400).send({ message: 'sorry no drivers available in your location' });
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
                            } else if (restaurant.status == 2) {
                                res.status(400).send({ message: 'Your Account has been Deactivated' });

                            } else {
                                res.status(400).send({ message: 'Invalid restaurant, Please check your data' });

                            }
                        }
                    });
                }
            }
        });
    }
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
    router.invoice_number = async (req, res) => {
        try {
            const adminDetails = await db.GetOneDocument('orders', { _id: req.body._id }, {}, {});
    console.log(adminDetails, "adminDetailsadminDetailsadminDetails");
    let invoiceNumber;
    // Check if invoice_number exists and is valid
    if (adminDetails && adminDetails.doc && adminDetails.doc.invoice_number) {
    invoiceNumber = adminDetails.doc.invoice_number;
    res.send({ status: 1, data: invoiceNumber });
    } else {
    // let isUnique = false;
    // while (!isUnique) {
        const newInvoiceNumber = Math.floor(1000 + Math.random() * 9000).toString();
        const existingInvoice = await db.GetOneDocument('orders', { invoice_number: newInvoiceNumber }, {}, {});
        if ((existingInvoice && existingInvoice.doc  == 'Data Not found') || !existingInvoice) {
            invoiceNumber = newInvoiceNumber;
            // isUnique = true;
            await db.UpdateDocument('orders', { _id: req.body._id }, { $set: { invoice_number: invoiceNumber } });
            res.send({ status: 1, data: invoiceNumber });
        }
    // }
    }
        }
        catch (error) {
            // res.status(404).send({ status: 0, msg: 'Enter valid credentials' });
            console.error(error,"Invoice number error")
        }
    };

    
    return router;
};
