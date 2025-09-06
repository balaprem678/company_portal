//"use strict";

module.exports = function (io, res) {
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
    var orderTimeLibrary = require('../../model/ordertime.js')(io, res);
    var EventEmitter = require('events').EventEmitter;
    var events = new EventEmitter();
    var pdf = require('html-pdf');
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }
    function jwtSign(payload) {
        var token = jwt.sign(payload, CONFIG.SECRET_KEY);
        return token;
    }

    function jwtSign(payload) {
        var token = jwt.sign(payload, CONFIG.SECRET_KEY);
        return token;
    }
    var geoTz = require('geo-tz'),
        tz = require('moment-timezone');

    controller.minOrderHis = function (req, res) {
        var status = '0';
        var response = '';
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('tab', 'tab is Required').optional();
        req.checkBody('perPage', 'perPage is Required').optional();
        req.checkBody('page', 'Page is Required').optional();
        req.checkBody('orderby', 'orderby is Required').optional();
        req.checkBody('sortby', 'sortby is Required').optional();
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
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('perPage').trim();
        req.sanitizeBody('page').trim();
        req.sanitizeBody('orderby').trim();
        req.sanitizeBody('sortby').trim();
        req.sanitizeBody('from').trim();
        req.sanitizeBody('to').trim();

        var data = {};
        data.user_id = req.body.user_id.trim();
        data.tab = req.body.tab;

        data.type = [2, 7, 9, 10, 1, 3, 4, 5, 6, 8, 15];
        // if (data.tab == 'progress') { data.type = [1, 3, 4, 5, 6, 8]; }

        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);

        data.orderby = parseInt(req.body.orderby) || -1;
        data.page = parseInt(req.body.page) || 1;
        data.perPage = parseInt(req.body.perPage) || 200;
        data.from = req.body.from + ' 00:00:00';
        data.to = req.body.to + ' 23:59:59';

        if (data.perPage <= 0) {
            data.perPage = 200;
        }

        data.sortby = 'order_date'
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        db.GetOneDocument('users', { _id: req.body.user_id, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                var query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type } };
                if (req.body.from && req.body.to) {
                    query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
                }

                db.GetCount('orders', query, function (err, count) {
                    if (err || count == 0) {
                        res.send({
                            "status": "0",
                            "errors": "You have no orders..!"
                        });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err || !settings) {
                                data.errors = 'Configure your settings';
                                res.send(data);
                            } else {
                                db.GetAggregation('orders', [
                                    { $match: query },
                                    { "$lookup": { from: "city", localField: "city_id", foreignField: "_id", as: "restaurant" } },
                                    { $unwind: "$foods" },
                                    //{ "$lookup": { from: "food", localField: "foods.id", foreignField: "_id", as: "foodsdoc" } },
                                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                                    //{ $unwind: { path: "$foodsdoc", preserveNullAndEmptyArrays: true } },
                                    // { $unwind: "$foodsdoc" },
                                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driverss" } },
                                    { $unwind: { path: "$driverss", preserveNullAndEmptyArrays: true } },
                                    {
                                        "$group": {
                                            "_id": "$_id",
                                            "order_id": { "$first": "$order_id" },
                                            "restaurant_name": { "$first": "$restaurant.restaurantname" },
                                            "restaurant_image": { "$first": "$restaurant.food_img" },
                                            "restaurant_street": { "$first": "$restaurant.address.line1" },
                                            "restaurant_address": { "$first": "$restaurant.address.fulladres" },
                                            "restaurant_city": { "$first": "$restaurant.address.city" },
                                            "efp_time": { "$first": "$restaurant.efp_time" },
                                            "restaurant_id": { "$first": "$restaurant._id" },
                                            "amount": { "$first": "$billings.amount.grand_total" },
                                            "order_time": { "$first": "$order_history.order_time" },
                                            "order_date": { "$first": "$order_history.order_time" },
                                            "order_status": { "$first": "$status" },
                                            "created_time": { "$first": "$created_time" },
                                            "eta": { "$first": "$eta" },
                                            "schedule_date": { "$first": "$schedule_date" },
                                            "schedule_time_slot": { "$first": "$schedule_time_slot" },
                                            "driver": { "$first": "$driverss.username" },
                                            "driver_img": { "$first": "$driverss.avatar" },
                                            "driver_phone": { "$first": "$driverss.phone" },
                                            //"food_name": { "$addToSet": "$foods.name" },
                                            "food_quantity": { "$push": "$foods" },
                                            "foods": { "$push": "$foods" },
                                            "food_count": { "$first": "$status" },
                                            "tracking_id": { "$first": "$_id" },
                                            "user_cordinates": { "$first": "$location" },
                                            "restaurant_cordinates": { "$first": "$restaurant.location" },
                                            "deliver_coords": { "$first": "$deliver_coords" }
                                        }
                                    },
                                    {
                                        "$project": {
                                            "_id": "$_id",
                                            "order_id": "$order_id",
                                            "restaurant_name": "$restaurant_name",
                                            "restaurant_image": "$restaurant_image",
                                            "restaurant_street": "$restaurant_street",
                                            "restaurant_address": "$restaurant_address",
                                            "restaurant_city": "$restaurant_city",
                                            "restaurant_id": "$restaurant_id",
                                            "efp_time": "$efp_time",
                                            "amount": "$amount",
                                            "order_time": "$order_time",
                                            "order_date": "$order_date",
                                            "order_status": "$order_status",
                                            "created_time": "$created_time",
                                            "eta": "$eta",
                                            "schedule_date": "$schedule_date",
                                            "schedule_time_slot": "$schedule_time_slot",
                                            "driver": { "$cond": [{ $ne: [{ "$ifNull": ["$driver", ''] }, ''] }, "$driver", ""] },
                                            "driver_img": { "$cond": [{ $ne: [{ "$ifNull": ["$driver_img", ''] }, ''] }, "$driver_img", ""] },
                                            "driver_phone": { "$cond": [{ $ne: [{ "$ifNull": ["$driver_phone", ''] }, ''] }, "$driver_phone", ""] },
                                            //"food_name": { "$addToSet": "$foods.name" },
                                            "food_quantity": "$food_quantity",
                                            "foods": "$foods",
                                            "food_count": "$food_count",
                                            "tracking_id": "$tracking_id",
                                            "user_cordinates": "$user_cordinates",
                                            "restaurant_cordinates": "$restaurant_cordinates",
                                            "driver_cordinates": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$deliver_coords", ''] }, ''] }, { $gt: [{ $size: "$deliver_coords" }, 0] }] }, { $arrayElemAt: ["$deliver_coords", -1] }, "$restaurant_cordinates"] }
                                        }
                                    },
                                    { "$sort": sorting },
                                    { "$skip": (data.perPage * (data.page - 1)) },
                                    { "$limit": data.perPage }
                                ], function (err, order_histry) {
                                    if (err || order_histry.length == 0) {
                                        res.send({
                                            "status": "0",
                                            "errors": "You have no orders..!"
                                        });
                                    } else {
                                        for (var i = 0; i < order_histry.length; i++) {
                                            var total = 0;
                                            for (var j = 0; j < order_histry[i].food_quantity.length; j++) {
                                                total = total + order_histry[i].food_quantity[j].quantity;
                                            }

                                            order_histry[i].food_count = total;
                                            if (order_histry[i].restaurant_image) {
                                                var img = order_histry[i].restaurant_image.slice(2);
                                                order_histry[i].restaurant_image = settings.settings.site_url + img;
                                            } else {
                                                order_histry[i].restaurant_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }
                                            if (order_histry[i].driver_img) {
                                                var imagedriver = order_histry[i].driver_img.split('./');
                                                if (imagedriver[0] == '') {
                                                    order_histry[i].driver_img = settings.settings.site_url + imagedriver[1];
                                                } else {
                                                    order_histry[i].driver_img = settings.settings.site_url + order_histry[i].driver_img;
                                                }
                                            } else {
                                                order_histry[i].driver_img = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }

                                            var bookdate = order_histry[i].order_date;
                                            order_histry[i].order_date = timezone.tz(bookdate, settings.settings.time_zone).format("MMM") + ' ' + timezone.tz(bookdate, settings.settings.time_zone).format("DD");
                                            order_histry[i].order_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
                                            if (order_histry[i].order_status == 15) {
                                                order_histry[i].new_order_time = new Date(order_histry[i].created_time + order_histry[i].eta + (30 * 60 * 1000));
                                            } else {
                                                order_histry[i].new_order_time = new Date(order_histry[i].created_time + order_histry[i].eta);
                                            }
                                            // order_histry[i].new_order_time = new Date(new Date(order_histry[i].created_time).getTime() - diff_offset + order_histry[i].eta + (30*60*1000));
                                            // order_histry[i].new_order_time = new Date(order_histry[i].created_time);

                                            //  rest.time_setting.week_end.end_time = new Date(new Date(rest.time_setting.week_end.end_time).getTime() + diff_offset);
                                            delete order_histry[i].food_quantity; // removing unwanted elements(food_quantity) from objects
                                        }

                                        res.send({
                                            "status": "1",
                                            "response": {
                                                //"total_orders": food.length,
                                                "current_page": data.page,
                                                "perPage": data.perPage,
                                                "orders": order_histry
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

    controller.minOrderHiscomplete = function (req, res) {
        var status = '0';
        var response = '';
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('tab', 'tab is Required').optional();
        req.checkBody('perPage', 'perPage is Required').optional();
        req.checkBody('page', 'Page is Required').optional();
        req.checkBody('orderby', 'orderby is Required').optional();
        req.checkBody('sortby', 'sortby is Required').optional();
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
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('perPage').trim();
        req.sanitizeBody('page').trim();
        req.sanitizeBody('orderby').trim();
        req.sanitizeBody('sortby').trim();
        req.sanitizeBody('from').trim();
        req.sanitizeBody('to').trim();

        var data = {};
        data.user_id = req.body.user_id.trim();
        data.tab = req.body.tab;

        data.type = [7];
        // if (data.tab == 'progress') { data.type = [1, 3, 4, 5, 6, 8]; }


        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);

        data.orderby = parseInt(req.body.orderby) || -1;
        data.page = parseInt(req.body.page) || 1;
        data.perPage = parseInt(req.body.perPage) || 200;
        data.from = req.body.from + ' 00:00:00';
        data.to = req.body.to + ' 23:59:59';

        if (data.perPage <= 0) {
            data.perPage = 200;
        }

        data.sortby = 'order_date'
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        db.GetOneDocument('users', { _id: req.body.user_id, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                var query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type } };
                if (req.body.from && req.body.to) {
                    query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
                }

                db.GetCount('orders', query, function (err, count) {
                    if (err || count == 0) {
                        res.send({
                            "status": "0",
                            "errors": "You have no orders..!"
                        });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err || !settings) {
                                data.errors = 'Configure your settings';
                                res.send(data);
                            } else {
                                db.GetAggregation('orders', [
                                    { $match: query },
                                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                                    { $unwind: "$foods" },
                                    //{ "$lookup": { from: "food", localField: "foods.id", foreignField: "_id", as: "foodsdoc" } },
                                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                                    //{ $unwind: { path: "$foodsdoc", preserveNullAndEmptyArrays: true } },
                                    // { $unwind: "$foodsdoc" },
                                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driverss" } },
                                    { $unwind: { path: "$driverss", preserveNullAndEmptyArrays: true } },
                                    {
                                        "$group": {
                                            "_id": "$_id",
                                            "order_id": { "$first": "$order_id" },
                                            "restaurant_name": { "$first": "$restaurant.restaurantname" },
                                            "restaurant_image": { "$first": "$restaurant.food_img" },
                                            "restaurant_street": { "$first": "$restaurant.address.line1" },
                                            "restaurant_city": { "$first": "$restaurant.address.city" },
                                            "efp_time": { "$first": "$restaurant.efp_time" },
                                            "amount": { "$first": "$billings.amount.grand_total" },
                                            "order_time": { "$first": "$order_history.order_time" },
                                            "order_date": { "$first": "$order_history.order_time" },
                                            "order_status": { "$first": "$status" },
                                            "created_time": { "$first": "$created_time" },
                                            "eta": { "$first": "$eta" },
                                            "driver": { "$first": "$driverss.username" },
                                            "driver_img": { "$first": "$driverss.avatar" },
                                            "driver_phone": { "$first": "$driverss.phone" },
                                            //"food_name": { "$addToSet": "$foods.name" },
                                            "food_quantity": { "$push": "$foods" },
                                            "foods": { "$push": "$foods" },
                                            "food_count": { "$first": "$status" },
                                            "tracking_id": { "$first": "$_id" },
                                            "user_cordinates": { "$first": "$location" },
                                            "restaurant_cordinates": { "$first": "$restaurant.location" },
                                            "deliver_coords": { "$first": "$deliver_coords" }
                                        }
                                    },
                                    {
                                        "$project": {
                                            "_id": "$_id",
                                            "order_id": "$order_id",
                                            "restaurant_name": "$restaurant_name",
                                            "restaurant_image": "$restaurant_image",
                                            "restaurant_street": "$restaurant_street",
                                            "restaurant_city": "$restaurant_city",
                                            "efp_time": "$efp_time",
                                            "amount": "$amount",
                                            "order_time": "$order_time",
                                            "order_date": "$order_date",
                                            "order_status": "$order_status",
                                            "created_time": "$created_time",
                                            "eta": "$eta",
                                            "driver": { "$cond": [{ $ne: [{ "$ifNull": ["$driver", ''] }, ''] }, "$driver", ""] },
                                            "driver_img": { "$cond": [{ $ne: [{ "$ifNull": ["$driver_img", ''] }, ''] }, "$driver_img", ""] },
                                            "driver_phone": { "$cond": [{ $ne: [{ "$ifNull": ["$driver_phone", ''] }, ''] }, "$driver_phone", ""] },
                                            //"food_name": { "$addToSet": "$foods.name" },
                                            "food_quantity": "$food_quantity",
                                            "foods": "$foods",
                                            "food_count": "$food_count",
                                            "tracking_id": "$tracking_id",
                                            "user_cordinates": "$user_cordinates",
                                            "restaurant_cordinates": "$restaurant_cordinates",
                                            "driver_cordinates": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$deliver_coords", ''] }, ''] }, { $gt: [{ $size: "$deliver_coords" }, 0] }] }, { $arrayElemAt: ["$deliver_coords", -1] }, "$restaurant_cordinates"] }
                                        }
                                    },
                                    { "$sort": sorting },
                                    { "$skip": (data.perPage * (data.page - 1)) },
                                    { "$limit": data.perPage }
                                ], function (err, order_histry) {
                                    if (err || order_histry.length == 0) {
                                        res.send({
                                            "status": "0",
                                            "errors": "You have no orders..!"
                                        });
                                    } else {
                                        for (var i = 0; i < order_histry.length; i++) {
                                            //for (j in order_histry[i].food_quantity.length) {
                                            var total = 0;
                                            for (var j = 0; j < order_histry[i].food_quantity.length; j++) {
                                                total = total + order_histry[i].food_quantity[j].quantity;
                                            }

                                            order_histry[i].food_count = total;
                                            if (order_histry[i].restaurant_image) {
                                                var img = order_histry[i].restaurant_image.slice(2);
                                                order_histry[i].restaurant_image = settings.settings.site_url + img;
                                            } else {
                                                order_histry[i].restaurant_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }

                                            var bookdate = order_histry[i].order_date;
                                            order_histry[i].order_date = timezone.tz(bookdate, settings.settings.time_zone).format("MMM") + ' ' + timezone.tz(bookdate, settings.settings.time_zone).format("DD");
                                            order_histry[i].order_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
                                            if (order_histry[i].order_status == 15) {
                                                order_histry[i].new_order_time = new Date(order_histry[i].created_time + order_histry[i].eta + (30 * 60 * 1000));
                                            } else {
                                                order_histry[i].new_order_time = new Date(order_histry[i].created_time + order_histry[i].eta);
                                            }
                                            // order_histry[i].new_order_time = new Date(new Date(order_histry[i].created_time).getTime() - diff_offset + order_histry[i].eta + (30*60*1000));
                                            // order_histry[i].new_order_time = new Date(order_histry[i].created_time);

                                            //  rest.time_setting.week_end.end_time = new Date(new Date(rest.time_setting.week_end.end_time).getTime() + diff_offset);
                                            delete order_histry[i].food_quantity; // removing unwanted elements(food_quantity) from objects
                                        }

                                        res.send({
                                            "status": "1",
                                            "response": {
                                                //"total_orders": food.length,
                                                "current_page": data.page,
                                                "perPage": data.perPage,
                                                "orders": order_histry
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

    controller.minOrderHisOnprocess = function (req, res) {
        var status = '0';
        var response = '';
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('tab', 'tab is Required').optional();
        req.checkBody('perPage', 'perPage is Required').optional();
        req.checkBody('page', 'Page is Required').optional();
        req.checkBody('orderby', 'orderby is Required').optional();
        req.checkBody('sortby', 'sortby is Required').optional();
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
        req.sanitizeBody('user_id').trim();
        req.sanitizeBody('perPage').trim();
        req.sanitizeBody('page').trim();
        req.sanitizeBody('orderby').trim();
        req.sanitizeBody('sortby').trim();
        req.sanitizeBody('from').trim();
        req.sanitizeBody('to').trim();

        var data = {};
        data.user_id = req.body.user_id.trim();
        data.tab = req.body.tab;

        data.type = [1, 3, 5, 6];
        // if (data.tab == 'progress') { data.type = [1, 3, 4, 5, 6, 8]; }


        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        var server_offset = (new Date).getTimezoneOffset();
        var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);

        data.orderby = parseInt(req.body.orderby) || -1;
        data.page = parseInt(req.body.page) || 1;
        data.perPage = parseInt(req.body.perPage) || 200;
        data.from = req.body.from + ' 00:00:00';
        data.to = req.body.to + ' 23:59:59';

        if (data.perPage <= 0) {
            data.perPage = 200;
        }

        data.sortby = 'order_date'
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        db.GetOneDocument('users', { _id: req.body.user_id, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                var query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type } };
                if (req.body.from && req.body.to) {
                    query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
                }

                db.GetCount('orders', query, function (err, count) {
                    if (err || count == 0) {
                        res.send({
                            "status": "0",
                            "errors": "You have no orders..!"
                        });
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err || !settings) {
                                data.errors = 'Configure your settings';
                                res.send(data);
                            } else {
                                db.GetAggregation('orders', [
                                    { $match: query },
                                    { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                                    { $unwind: "$foods" },
                                    //{ "$lookup": { from: "food", localField: "foods.id", foreignField: "_id", as: "foodsdoc" } },
                                    { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                                    //{ $unwind: { path: "$foodsdoc", preserveNullAndEmptyArrays: true } },
                                    // { $unwind: "$foodsdoc" },
                                    { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driverss" } },
                                    { $unwind: { path: "$driverss", preserveNullAndEmptyArrays: true } },
                                    {
                                        "$group": {
                                            "_id": "$_id",
                                            "order_id": { "$first": "$order_id" },
                                            "restaurant_name": { "$first": "$restaurant.restaurantname" },
                                            "restaurant_image": { "$first": "$restaurant.food_img" },
                                            "restaurant_street": { "$first": "$restaurant.address.line1" },
                                            "restaurant_city": { "$first": "$restaurant.address.city" },
                                            "efp_time": { "$first": "$restaurant.efp_time" },
                                            "amount": { "$first": "$billings.amount.grand_total" },
                                            "order_time": { "$first": "$order_history.order_time" },
                                            "order_date": { "$first": "$order_history.order_time" },
                                            "order_status": { "$first": "$status" },
                                            "created_time": { "$first": "$created_time" },
                                            "eta": { "$first": "$eta" },
                                            "driver": { "$first": "$driverss.username" },
                                            "driver_img": { "$first": "$driverss.avatar" },
                                            "driver_phone": { "$first": "$driverss.phone" },
                                            //"food_name": { "$addToSet": "$foods.name" },
                                            "food_quantity": { "$push": "$foods" },
                                            "foods": { "$push": "$foods" },
                                            "food_count": { "$first": "$status" },
                                            "tracking_id": { "$first": "$_id" },
                                            "user_cordinates": { "$first": "$location" },
                                            "restaurant_cordinates": { "$first": "$restaurant.location" },
                                            "deliver_coords": { "$first": "$deliver_coords" }
                                        }
                                    },
                                    {
                                        "$project": {
                                            "_id": "$_id",
                                            "order_id": "$order_id",
                                            "restaurant_name": "$restaurant_name",
                                            "restaurant_image": "$restaurant_image",
                                            "restaurant_street": "$restaurant_street",
                                            "restaurant_city": "$restaurant_city",
                                            "efp_time": "$efp_time",
                                            "amount": "$amount",
                                            "order_time": "$order_time",
                                            "order_date": "$order_date",
                                            "order_status": "$order_status",
                                            "created_time": "$created_time",
                                            "eta": "$eta",
                                            "driver": { "$cond": [{ $ne: [{ "$ifNull": ["$driver", ''] }, ''] }, "$driver", ""] },
                                            "driver_img": { "$cond": [{ $ne: [{ "$ifNull": ["$driver_img", ''] }, ''] }, "$driver_img", ""] },
                                            "driver_phone": { "$cond": [{ $ne: [{ "$ifNull": ["$driver_phone", ''] }, ''] }, "$driver_phone", ""] },
                                            //"food_name": { "$addToSet": "$foods.name" },
                                            "food_quantity": "$food_quantity",
                                            "foods": "$foods",
                                            "food_count": "$food_count",
                                            "tracking_id": "$tracking_id",
                                            "user_cordinates": "$user_cordinates",
                                            "restaurant_cordinates": "$restaurant_cordinates",
                                            "driver_cordinates": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$deliver_coords", ''] }, ''] }, { $gt: [{ $size: "$deliver_coords" }, 0] }] }, { $arrayElemAt: ["$deliver_coords", -1] }, "$restaurant_cordinates"] }
                                        }
                                    },
                                    { "$sort": sorting },
                                    { "$skip": (data.perPage * (data.page - 1)) },
                                    { "$limit": data.perPage }
                                ], function (err, order_histry) {
                                    if (err || order_histry.length == 0) {
                                        res.send({
                                            "status": "0",
                                            "errors": "You have no orders..!"
                                        });
                                    } else {
                                        for (var i = 0; i < order_histry.length; i++) {
                                            //for (j in order_histry[i].food_quantity.length) {
                                            var total = 0;
                                            for (var j = 0; j < order_histry[i].food_quantity.length; j++) {
                                                total = total + order_histry[i].food_quantity[j].quantity;
                                            }

                                            order_histry[i].food_count = total;
                                            if (order_histry[i].restaurant_image) {
                                                var img = order_histry[i].restaurant_image.slice(2);
                                                order_histry[i].restaurant_image = settings.settings.site_url + img;
                                            } else {
                                                order_histry[i].restaurant_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }

                                            var bookdate = order_histry[i].order_date;
                                            order_histry[i].order_date = timezone.tz(bookdate, settings.settings.time_zone).format("MMM") + ' ' + timezone.tz(bookdate, settings.settings.time_zone).format("DD");
                                            order_histry[i].order_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
                                            if (order_histry[i].order_status == 15) {
                                                order_histry[i].new_order_time = new Date(order_histry[i].created_time + order_histry[i].eta + (30 * 60 * 1000));
                                            } else {
                                                order_histry[i].new_order_time = new Date(order_histry[i].created_time + order_histry[i].eta);
                                            }
                                            // order_histry[i].new_order_time = new Date(new Date(order_histry[i].created_time).getTime() - diff_offset + order_histry[i].eta + (30*60*1000));
                                            // order_histry[i].new_order_time = new Date(order_histry[i].created_time);

                                            //  rest.time_setting.week_end.end_time = new Date(new Date(rest.time_setting.week_end.end_time).getTime() + diff_offset);
                                            delete order_histry[i].food_quantity; // removing unwanted elements(food_quantity) from objects
                                        }

                                        res.send({
                                            "status": "1",
                                            "response": {
                                                //"total_orders": food.length,
                                                "current_page": data.page,
                                                "perPage": data.perPage,
                                                "orders": order_histry
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

    /* controller.minOrderHis = function (req, res) {
 
         var status = '0';
         var response = '';
         var errors = [];
         req.checkBody('user_id', 'user_id is Required').notEmpty();
         req.checkBody('tab', 'tab is Required').optional();
         req.checkBody('perPage', 'perPage is Required').optional();
         req.checkBody('page', 'Page is Required').optional();
         req.checkBody('orderby', 'orderby is Required').optional();
         req.checkBody('sortby', 'sortby is Required').optional();
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
         req.sanitizeBody('user_id').trim();
         req.sanitizeBody('perPage').trim();
         req.sanitizeBody('page').trim();
         req.sanitizeBody('orderby').trim();
         req.sanitizeBody('sortby').trim();
         req.sanitizeBody('from').trim();
         req.sanitizeBody('to').trim();
 
         var data = {};
         data.user_id = req.body.user_id.trim();
         data.tab = req.body.tab;
 
 
         data.type = [2, 7, 9, 10, 1, 3, 4, 5, 6, 8];
         // if (data.tab == 'progress') { data.type = [1, 3, 4, 5, 6, 8]; }
 
 
         data.orderby = parseInt(req.body.orderby) || -1;
         data.page = parseInt(req.body.page) || 1;
         data.perPage = parseInt(req.body.perPage) || 200;
         data.from = req.body.from + ' 00:00:00';
         data.to = req.body.to + ' 23:59:59';
 
         if (data.perPage <= 0) {
             data.perPage = 200;
         }
 
         data.sortby = 'order_date'
         var sorting = {};
         sorting[data.sortby] = data.orderby;
         db.GetOneDocument('users', { _id: req.body.user_id, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
             if (userErr || !userRespo) {
                 res.send({
                     "status": "0",
                     "errors": "Invalid User, Please check your data"
                 });
             } else {
                 var query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type } };
                 if (req.body.from && req.body.to) {
                     query = { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'status': { "$in": data.type }, "order_history.order_time": { '$gte': new Date(data.from), '$lte': new Date(data.to) } };
                 }
 
                 db.GetCount('orders', query, function (err, count) {
                     if (err || count == 0) {
                         res.send({
                             "status": "0",
                             "errors": "You have no orders..!"
                         });
                     } else {
                         db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                             if (err || !settings) {
                                 data.errors = 'Configure your settings';
                                 res.send(data);
                             } else {
                                 db.GetAggregation('orders', [
                                     { $match: query },
                                     { "$lookup": { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "restaurant" } },
                                     { $unwind: "$foods" },
                                     { "$lookup": { from: "food", localField: "foods.id", foreignField: "_id", as: "foodsdoc" } },
                                     { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                                     //{ $unwind: { path: "$foodsdoc", preserveNullAndEmptyArrays: true } },
                                     { $unwind: "$foodsdoc" },
                                     {
                                         "$group": {
                                             "_id": "$_id",
                                             "order_id": { "$first": "$order_id" },
                                             "restaurant_name": { "$first": "$restaurant.restaurantname" },
                                             "restaurant_image": { "$first": "$restaurant.food_img" },
                                             "restaurant_street": { "$first": "$restaurant.address.line1" },
                                             "restaurant_city": { "$first": "$restaurant.address.city" },
                                             "amount": { "$first": "$billings.amount.grand_total" },
                                             "order_time": { "$first": "$order_history.order_time" },
                                             "order_date": { "$first": "$order_history.order_time" },
                                             "order_status": { "$first": "$status" },
                                             "food_name": { "$addToSet": "$foodsdoc.name" },
                                             "food_quantity": { "$addToSet": "$foods.quantity" },
                                             "food_count": { "$first": "$status" },
                                         }
                                     },
                                     { "$sort": sorting },
                                     { "$skip": (data.perPage * (data.page - 1)) },
                                     { "$limit": data.perPage }
                                 ], function (err, order_histry) {
                                     if (err || order_histry.length == 0) {
                                         res.send({
                                             "status": "0",
                                             "errors": "You have no orders..!"
                                         });
                                     } else {
                                         for (var i = 0; i < order_histry.length; i++) {
                                             // Food quantity comes in reverse order so change it to appropriate order
                                             var foodquantity = [];
                                             for (var k = order_histry[i].food_quantity.length - 1; k >= 0; k--) {
                                                 foodquantity.push(order_histry[i].food_quantity[k])
                                             }
                                             order_histry[i].food_quantity = foodquantity;
                                             // end
 
                                             // Food quantity and food name merged with one another here
                                             var food = [];
                                             var counts = 0;
                                             for (var j = 0; j < order_histry[i].food_name.length; j++) {
                                                 food.push({ 'name': order_histry[i].food_name[j], 'quantity': order_histry[i].food_quantity[j] })
                                                 counts = counts + order_histry[i].food_quantity[j];
                                             }
 
                                             order_histry[i].food_name = food;
                                             order_histry[i].food_count = counts;
                                             // end
 
                                             if (order_histry[i].restaurant_image) {
                                                 var img = order_histry[i].restaurant_image.slice(2);
                                                 order_histry[i].restaurant_image = settings.settings.site_url + img;
                                             } else {
                                                 order_histry[i].restaurant_image = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                             }
 
                                             var bookdate = order_histry[i].order_date;
                                             order_histry[i].order_date = timezone.tz(bookdate, settings.settings.time_zone).format("MMM") + ' ' + timezone.tz(bookdate, settings.settings.time_zone).format("DD");
                                             order_histry[i].order_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);
 
 
                                             delete order_histry[i].food_quantity; // removing unwanted elements(food_quantity) from objects
                                         }
 
                                         res.send({
                                             "status": "1",
                                             "response": {
                                                 "total_orders": food.length,
                                                 "current_page": data.page,
                                                 "perPage": data.perPage,
                                                 "orders": order_histry
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
 */


    controller.expandOrder = function (req, res) {

        var status = '0';
        var response = '';
        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('order_id', 'order_id is Required').notEmpty();

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

        var data = {};
        data.user_id = req.body.user_id.trim();
        data.order_id = req.body.order_id.trim();

        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                db.GetOneDocument('orders', { order_id: data.order_id }, {}, {}, function (err, orders) {

                    if (err || !orders) {
                        res.send({
                            "status": "0",
                            "errors": "Invalid order, Please check your data"
                        });
                    } else {
                        var driver_cordinates = orders.deliver_coords.slice(-1)[0];
                        var user_cordinates = orders.location;
                        var query = { 'order_id': data.order_id, 'status': { "$ne": 0 } };
                        db.GetAggregation('orders', [
                            { $match: query },
                            { "$lookup": { from: "city", localField: "city_id", foreignField: "_id", as: "restaurant" } },
                            { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                            { "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driverss" } },
                            { $unwind: { path: "$driverss", preserveNullAndEmptyArrays: true } },
                            { $unwind: "$foods" },
                            {
                                $project: {
                                    _id: 1,
                                    order_id: 1,
                                    total: 1,
                                    status: 1,
                                    delivery_amount: 1,
                                    delivery_address: 1,
                                    delivery_address_type: 1,
                                    discount: 1,
                                    foods: 1,
                                    driverss: 1,
                                    restaurant: 1,
                                    booking_type: 1,
                                    schedule_type: 1,
                                    schedule_time: 1,
                                    schedule_time_slot: 1,
                                    schedule_date: 1,
                                    notify: 1,
                                    billings: 1,
                                    refer_offer_price: 1,
                                }
                            },

                            { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
                            { $unwind: { path: "$foods", preserveNullAndEmptyArrays: true } },
                            {
                                "$group": {
                                    "_id": "$_id",
                                    "order_id": { "$first": "$order_id" },
                                    "tracking_id": { "$first": "$_id" },
                                    "driver_cordinates": { "$first": "$order_id" },
                                    "user_cordinates": { "$first": "$order_id" },
                                    "restaurant_cordinates": { "$first": "$restaurant.location" },
                                    "delivery_amount": { "$first": "$billings.amount.delivery_amount" },
                                    "discount": { "$first": "$billings.amount.offer_discount" },
                                    "coupon_discount": { "$first": "$billings.amount.coupon_discount" },
                                    "food_discount": { "$first": "$billings.amount.food_offer_price" },
                                    "package_charge": { "$first": "$billings.amount.package_charge" },
                                    "tax": { "$first": "$billings.amount.service_tax" },
                                    "night_fee": { "$first": "$billings.amount.night_fee" },
                                    "surge_fee": { "$first": "$billings.amount.surge_fee" },
                                    "amount": { "$first": "$billings.amount.grand_total" },
                                    "restaurant_name": { "$first": "$restaurant.restaurantname" },
                                    "restaurant_address": { "$first": "$restaurant.address.fulladres" },
                                    "user_address": { "$first": "$delivery_address.fulladres" },
                                    "address_type": { "$first": "$delivery_address.type" },
                                    "order_time": { "$first": "$order_history.order_time" },
                                    "order_date": { "$first": "$order_history.order_time" },
                                    "order_status": { "$first": "$status" },
                                    "driver": { "$first": "$driverss.username" },
                                    "driver_img": { "$first": "$driverss.avatar" },
                                    "driver_phone": { "$first": "$driverss.phone" },
                                    "food_count": { "$first": "$driverss.username" },
                                    "currency_code": { "$first": "" },
                                    "booking_type": { "$first": "$booking_type" },
                                    "schedule_type": { "$first": "$schedule_type" },
                                    "schedule_time_slot": { "$first": "$schedule_time_slot" },
                                    "schedule_date": { "$first": "$schedule_date" },
                                    "notify": { "$first": "$notify" },
                                    "schedule_time": { "$first": "$schedule_time" },
                                    "bill_datails": { "$push": "$foods" },
                                    "refer_offer_price": { "$first": "$refer_offer_price" },

                                }
                            },
                        ], function (err, order_histry) {
                            if (err || order_histry.length == 0) {
                                res.send({
                                    "status": "0",
                                    "errors": "No Orders Found"
                                });
                            } else {
                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err || !settings) {
                                        data.errors = 'Configure your settings';
                                        res.send(data);
                                    } else {
                                        order_histry[0].currency_code = settings.settings.currency_code;
                                        var foodcounts = 0;
                                        for (var j = 0; j < order_histry[0].bill_datails.length; j++) {
                                            foodcounts = foodcounts + order_histry[0].bill_datails[j].quantity || 0;
                                        }
                                        for (var i = 0; i < order_histry.length; i++) {
                                            var bookdate = order_histry[i].order_date;
                                            var test = order_histry[0].driver;
                                            order_histry[0].food_count = foodcounts;
                                            order_histry[0].driver = '';
                                            if (order_histry[0].driver_img) {
                                                var imagedriver = order_histry[0].driver_img.split('./');
                                                if (imagedriver[0] == '') {
                                                    order_histry[0].driver_img = settings.settings.site_url + imagedriver[1];
                                                } else {
                                                    order_histry[0].driver_img = settings.settings.site_url + order_histry[0].driver_img;
                                                }
                                            } else {
                                                order_histry[0].driver_img = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                                            }
                                            var phone = order_histry[0].driver_phone;
                                            order_histry[0].driver_phone = '';
                                            if (phone) {
                                                order_histry[0].driver_phone = phone;
                                            }
                                            if (test) {
                                                order_histry[0].driver = test;
                                            }
                                            order_histry[0].driver_cordinates = order_histry[0].restaurant_cordinates;
                                            delete order_histry[0].restaurant_cordinates;
                                            if (driver_cordinates) {
                                                order_histry[0].driver_cordinates = driver_cordinates;
                                            }

                                            order_histry[0].user_cordinates = user_cordinates;

                                            order_histry[0].driver = order_histry[0].driver

                                            order_histry[i].order_date = timezone.tz(bookdate, settings.settings.time_zone).format("MMM") + ' ' + timezone.tz(bookdate, settings.settings.time_zone).format("DD");
                                            order_histry[i].order_time = timezone.tz(bookdate, settings.settings.time_zone).format(settings.settings.time_format);


                                        }

                                        for (i in order_histry[0].bill_datails) {
                                            order_histry[0].bill_datails[i].price_withaddons = 0;
                                            var amt = 0;
                                            if (typeof order_histry[0].bill_datails[i].price != 'undefined' && order_histry[0].bill_datails[i].price != null) {
                                                amt = order_histry[0].bill_datails[i].price;
                                            }
                                            var tr = 0;
                                            if (order_histry[0].bill_datails[i].addons && typeof order_histry[0].bill_datails[i].addons != 'undefined' && order_histry[0].bill_datails[i].addons != null) {
                                                for (j in order_histry[0].bill_datails[i].addons) {
                                                    if (order_histry[0].bill_datails[i].addons[j].price && typeof order_histry[0].bill_datails[i].addons[j].price != 'undefined' && order_histry[0].bill_datails[i].addons[j].price != null) {
                                                        tr += order_histry[0].bill_datails[i].addons[j].price;
                                                    }
                                                }
                                            }
                                            order_histry[0].bill_datails[i].price_withaddons = amt + tr;
                                        }

                                        order_histry[0].refer_offer_price = 0;

                                        if (order_histry[0].refer_offer_price && typeof order_histry[0].refer_offer_price != 'undefined' && order_histry[0].refer_offer_price != null) {
                                            order_histry[0].refer_offer_price = refer_offer_price;
                                        }

                                        res.send({
                                            "status": "1",
                                            "response": order_histry[0]
                                        })
                                    }
                                });
                            }
                        })
                    }
                });
            }
        });
    }

    controller.trackOrder = function (req, res) {

        var status = '0';
        var response = '';
        var errors = [];

        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('order_id', 'order_id is Required').notEmpty();

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

        var data = {};
        data.user_id = req.body.user_id.trim();
        data.order_id = req.body.order_id.trim();

        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({
                    "status": "0",
                    "errors": "Invalid User, Please check your data"
                });
            } else {
                var options = {};
                options.populate = 'restaurant_id driver_id';
                db.GetOneDocument('orders', { order_id: data.order_id }, {}, options, function (err, orders) {
                    if (err || !orders) {
                        res.send({
                            "status": "0",
                            "errors": "Invalid order, Please check your data"
                        });
                    } else {

                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err || !settings) {
                                data.errors = 'Configure your settings';
                                res.send(data);
                            } else {

                                var response = {};
                                response.status = '1';
                                response.rest_name = orders.restaurant_id.restaurantname;
                                response.order_amt = orders.billings.amount.grand_total;

                                response.user_lat = orders.delivery_address.lat;
                                response.user_lng = orders.delivery_address.lng;

                                response.rest_location = orders.restaurant_id.location;
                                response.order_status = orders.status;

                                response.driver_location = '';
                                response.driver_name = '';
                                response.driver_phone = '';
                                response.driver_image = '';

                                if (orders.driver_id) {
                                    response.driver_location = orders.driver_id.location || '';
                                    response.driver_name = orders.driver_id.username || '';
                                    response.driver_phone = orders.driver_id.phone || '';
                                    var img = orders.driver_id.avatar.slice(2);
                                    response.driver_image = settings.settings.site_url + img || '';
                                }

                                switch (response.order_status) {
                                    case 1:
                                        response.order_status = 'Order Received';
                                        break;
                                    case 2:
                                        response.order_status = 'Restaurant Rejected';
                                        break;
                                    case 3:
                                        response.order_status = 'Restaurant Accepted';
                                        break;
                                    case 4:
                                        response.order_status = 'Restaurant Accepted';
                                        break;
                                    case 5:
                                        response.order_status = 'Driver Accepted';
                                        break;
                                    case 6:
                                        response.order_status = 'Order Picked Up';
                                        break;
                                    case 7:
                                        response.order_status = 'Delivered';
                                        break;
                                    case 8:
                                        response.order_status = 'payment completed';
                                        break;
                                    case 9:
                                        response.order_status = 'Cancelled by you';
                                        break;
                                    case 10:
                                        response.order_status = 'Cancelled by admin';
                                        break;
                                    default:
                                        response.order_status = 'Onprogress';
                                        break;
                                }
                                res.send(response)
                            }
                        });
                    }
                });
            }
        });
    }

    controller.deliveryCharge = function (req, res) {

        var errors = [];
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id is Required').notEmpty();

        req.checkBody('latitude', 'latitude is Required').notEmpty();
        req.checkBody('longitude', 'longitude is Required').notEmpty();

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
        var data = {};
        var request = {};
        request.user_id = req.body.user_id.trim();
        request.restaurant_id = req.body.restaurant_id.trim();
        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({ "status": "0", "errors": "Invalid User, Please check your data..!" });
            } else {
                db.GetOneDocument('restaurant', { _id: request.restaurant_id }, {}, {}, function (err, restaurant) {
                    if (err || !restaurant) {
                        res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                    } else {
                        db.GetOneDocument('city', { cityname: restaurant.main_city }, {}, {}, function (err, citydoc) {
                            if (err || !citydoc) {
                                res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                            } else {
                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err) {
                                        res.send({ "status": 0, "errors": 'Error in settings..!' });
                                    } else {
                                        db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
                                            if (err) {
                                                res.send({ "status": 0, "errors": 'Error in settings..!' });
                                            } else {
                                                var apiKey = socialsettings.settings.map_api.web_key;
                                                if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
                                                    eta_time = parseInt(settings.settings.eta_time)
                                                }
                                                var default_km = settings.settings.radius;
                                                var lat1 = req.body.latitude;
                                                var lat2 = restaurant.location.lat;
                                                var lon1 = req.body.longitude;
                                                var lon2 = restaurant.location.lng;

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
                                                if (km > default_km) {
                                                    res.send({ "status": "0", "errors": "This location is too far away from the restaurant for " + settings.settings.site_title + " to deliver. Please pick a valid location.!" });
                                                } else {
                                                    var delivery_cost = citydoc.delivery_charge.default_amt;
                                                    var deli_target_cost = citydoc.delivery_charge.target_amount;
                                                    var tax = 0;
                                                    if (restaurant && typeof restaurant.com_taxtype != 'undefined' && restaurant.com_taxtype != null && restaurant.com_taxtype != '' && restaurant.com_taxtype == 'unique') {
                                                        if (restaurant && typeof restaurant.unique_tax != 'undefined' && restaurant.unique_tax != null && restaurant.unique_tax != '' && restaurant.unique_tax.rest_tax && typeof restaurant.unique_tax.rest_tax != 'undefined' && restaurant.unique_tax.rest_tax != null && restaurant.unique_tax.rest_tax != '') {
                                                            tax = restaurant.unique_tax.rest_tax || 0;
                                                        }
                                                    } else {
                                                        if (restaurant && typeof restaurant.tax != 'undefined' && restaurant.tax != null && restaurant.tax != '') {
                                                            tax = restaurant.tax || 0;
                                                        }
                                                    }
                                                    var epf_time = restaurant.efp_time || 0;
                                                    data.status = '1';
                                                    data.response = {};
                                                    data.response.night_fare = '';
                                                    data.response.eta = '';
                                                    data.response.user_eta = '';
                                                    data.response.surge_fare = '';
                                                    var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                                    var currentTime = moment(time_now, "HH:mm a");
                                                    currentTime.toString();
                                                    var currentTime1 = new Date();
                                                    var current_seconds = (currentTime1.getHours() * 60 * 60) + (currentTime1.getMinutes() * 60) + currentTime1.getSeconds();
                                                    var date = new Date();
                                                    if (typeof citydoc.night_fare_settings != 'undefined' && typeof citydoc.night_fare_settings.status != 'undefined' && citydoc.night_fare_settings.status == 1) {
                                                        var start_time = new Date(citydoc.night_fare_settings.start_time);
                                                        var end_time = new Date(citydoc.night_fare_settings.end_time);
                                                        var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                        var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                        if (start_time_seconds < current_seconds && current_seconds < end_time_seconds) {
                                                            data.response.night_fare = parseFloat(citydoc.night_fare_settings.amount);
                                                        }
                                                    }
                                                    if (typeof citydoc.extra_fare_settings != 'undefined' && typeof citydoc.extra_fare_settings.status != 'undefined' && citydoc.extra_fare_settings.status == 1) {
                                                        var start_time = new Date(citydoc.extra_fare_settings.start_time);
                                                        var end_time = new Date(citydoc.extra_fare_settings.end_time);
                                                        var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                        var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                        if (start_time_seconds < current_seconds && current_seconds < end_time_seconds) {
                                                            data.response.surge_fare = parseFloat(citydoc.extra_fare_settings.amount);
                                                        }
                                                    }
                                                    var destinations = [];
                                                    var distance = require('google-distance-matrix');
                                                    distance.key(apiKey);
                                                    distance.units('imperial');
                                                    var origins = [lat1.toString() + ',' + lon1.toString()];
                                                    var latlong = lat2.toString() + ',' + lon2.toString();
                                                    destinations.push(latlong)
                                                    if (destinations.length > 0) {
                                                        distance.matrix(origins, destinations, function (err, distances) {
                                                            if (typeof distances != 'undefined' && distances.status == 'OK') {
                                                                for (var i = 0; i < origins.length; i++) {
                                                                    for (var j = 0; j < destinations.length; j++) {
                                                                        var origin = distances.origin_addresses[i];
                                                                        var destination = distances.destination_addresses[j];
                                                                        if (distances.rows[0].elements[j].status == 'OK') {
                                                                            var time_mins = parseInt(parseInt(distances.rows[i].elements[j].duration.value) / 60);
                                                                            if (time_mins == 0) {
                                                                                time_mins = 1;
                                                                            }
                                                                            var eta = parseInt(eta_time + epf_time + time_mins);
                                                                            var user_eta = parseInt(time_mins);
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                var eta = parseInt(eta_time + epf_time);
                                                                var user_eta = "0";
                                                            }
                                                            data.response.eta = eta;
                                                            data.response.user_eta = user_eta;
                                                            data.response.delivery_charge = delivery_cost;
                                                            data.response.target_charge = deli_target_cost;
                                                            data.response.tax_percent = tax;
                                                            res.send(data)
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }

    // controller.applyCoupon = function (req, res) {

    //     console.log("-------------working apply coupon")
    //     var status = 'false';
    //     var response = {};
    //     // req.checkBody('user_id', 'user_id is Required').notEmpty();
    //     // req.checkBody('code', 'code is Required').notEmpty();
    //     // req.checkBody('city_id', 'city_id  is Required').notEmpty();
    //     var data = {};

    //     data.user_id = req.body.user_id;
    //     data.code = req.body.code;
    //     // data.city_id = req.body.city_id;

    //     var errors = [];
    //     // errors = req.validationErrors();
    //     // if (errors) {
    //     //     res.send({
    //     //         "status": "false",
    //     //         "errors": errors[0].msg
    //     //     });
    //     //     return;
    //     // }

    //     var request = {};
    //     var date = new Date();
    //     var isodate = date.toISOString();//new Date("2016-08-30T18:30:00.0Z");

    //     db.GetOneDocument('users', { _id: req.body.user_id, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
    //         if (userErr || !userRespo) {
    //             res.send({ "status": "0", "errors": "Invalid user, Please check your data..!" });
    //         } else {
    //             db.GetDocument('coupon', { status: { $eq: 1 }, code: req.body.code }, {}, {}, function (err, coupondata) {
    //                 if (err || coupondata.length == 0) {
    //                     res.send({ "status": "0", "errors": "Sorry invalid Coupon..!" });
    //                 }
    //                 else {
    //                     if (coupondata[0].coupon_type == 'admin') {
    //                         var query = { status: { $eq: 1 }, code: req.body.code, "expiry_date": { "$gte": isodate }, "valid_from": { "$lte": isodate } }
    //                         db.GetDocument('coupon', query, {}, {}, function (err, data) {
    //                             if (err || data.length == 0) {
    //                                 res.send({ "status": "0", "errors": "Sorry coupon code expired..!" });
    //                             }
    //                             else {
    //                                 db.GetCount('orders', { 'user_id': req.body.user_id, 'coupon_code': req.body.code }, function (orderErr, orderRespo) {
    //                                     if (orderErr) {
    //                                         res.send({ "status": "0", "errors": "Errors in orders..!" });
    //                                     }
    //                                     else {
    //                                         var usage = 0;
    //                                         if (orderRespo > 0) { usage = parseInt(orderRespo); }
    //                                         db.GetDocument('coupon', { status: { $eq: 1 }, code: req.body.code, 'usage.per_user': { '$gt': usage }, 'usage.total_coupons': { '$gte': 1 } }, {}, {}, function (err, usagelimit) {
    //                                             if (err || !usagelimit || usagelimit.length == 0) {
    //                                                 res.send({ "status": "0", "errors": "Sorry coupon code limit exceeded..!" });
    //                                             } else {
    //                                                 var request = {};
    //                                                 request.status = '1';
    //                                                 request.response = {};
    //                                                 request.response.message = 'Success';
    //                                                 request.response.coupon_code = usagelimit[0].code;
    //                                                 request.response.discount_type = usagelimit[0].discount_type;
    //                                                 request.response.amount = usagelimit[0].amount_percentage;
    //                                                 res.send(request)
    //                                             }
    //                                         });
    //                                     }
    //                                 })
    //                             }
    //                         });
    //                     }
    //                     // }
    //                     // else {
    //                     //     var query = { 'city': { $in: [data.city_id] }, status: { $ne: 0 }, code: req.body.code }
    //                     //     db.GetDocument('coupon', query, {}, {}, function (err, CouponExits) {
    //                     //         if (err || CouponExits.length == 0) {
    //                     //             res.send({ "status": "0", "errors": "Invalid Coupon code" });
    //                     //         } else {
    //                     //             var query = { 'city': { $in: [data.restaurant_id] }, status: { $ne: 0 }, code: req.body.code, "expiry_date": { "$gte": isodate }, "valid_from": { "$lte": isodate } }
    //                     //             db.GetDocument('coupon', query, {}, {}, function (err, data) {
    //                     //                 if (err || data.length == 0) {
    //                     //                     res.send({ "status": "0", "errors": "Sorry coupon code expired..!" });
    //                     //                 }
    //                     //                 else {
    //                     //                     db.GetCount('orders', { 'user_id': req.body.user_id, 'coupon_code': req.body.code }, function (orderErr, orderRespo) {
    //                     //                         if (orderErr) {
    //                     //                             res.send({ "status": "0", "errors": "Errors in orders..!" });
    //                     //                         }
    //                     //                         else {
    //                     //                             var usage = 0;
    //                     //                             if (orderRespo > 0) { usage = parseInt(orderRespo); }
    //                     //                             db.GetDocument('coupon', { status: { $ne: 0 }, code: req.body.code, 'usage.per_user': { '$gte': usage }, 'usage.total_coupons': { '$gte': 1 } }, {}, {}, function (err, usagelimit) {
    //                     //                                 if (err || !usagelimit || usagelimit.length == 0) {
    //                     //                                     res.send({ "status": "0", "errors": "Sorry coupon code limit exceeded..!" });
    //                     //                                 } else {
    //                     //                                     var request = {};
    //                     //                                     request.status = '1';
    //                     //                                     request.response = {};
    //                     //                                     request.response.message = 'Success';
    //                     //                                     request.response.coupon_code = usagelimit[0].code;
    //                     //                                     request.response.discount_type = usagelimit[0].discount_type;
    //                     //                                     request.response.amount = usagelimit[0].amount_percentage;
    //                     //                                     res.send(request)
    //                     //                                 }
    //                     //                             });
    //                     //                         }
    //                     //                     })
    //                     //                 }
    //                     //             });
    //                     //         }
    //                     //     })
    //                     // }
    //                 }
    //             });
    //         }
    //     });
    // }

    controller.getOffer = function (req, res) {
        var status = '0';
        var response = {};
        req.checkBody('user_id', 'user_id is Required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id  is Required').notEmpty();


        var data = {};
        data.user_id = req.body.user_id;
        data.restaurant_id = req.body.restaurant_id;

        var errors = [];
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        db.GetOneDocument('users', { _id: req.body.user_id }, {}, {}, function (userErr, userRespo) {
            if (userErr || !userRespo) {
                res.send({ "status": "0", "errors": "Invalid user, Please check your data..!" });
            } else {
                db.GetOneDocument('restaurant', { _id: data.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, resRespo) {
                    if (err || !resRespo) {
                        res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                    } else {

                        var response = {}
                        if (resRespo.offer.offer_status == 'true') {
                            response.status = '1';
                            response.message = 'Offer available';
                            response.offer_type = resRespo.offer.offer_type;
                            response.target_amount = resRespo.offer.target_amount;
                            response.offer_amount = resRespo.offer.offer_amount;
                            response.max_off = resRespo.offer.max_off;
                        }
                        else {
                            response.status = '0';
                            response.message = 'Sorry no offer available..!';
                        }
                        res.send(response)
                    }
                });
            }
        });
    }

    controller.placeOrders = async function (req, res) {

    }


    events.on('neworderto_admin', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
            } else {
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                    if (err || !social_settings) {
                        res.send({ status: 0, message: 'Configure your website settings' });
                    } else {
                        db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                            if (err || !userDetails) {
                                // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
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
        })
    });

    events.on('restaurant_new_order', function (req, done) {

        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            return;
        }

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
            } else {
                db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                    if (err || !userDetails) {
                        // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
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
                                        done(null, { status: 1, response: response });
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

    });

    events.on('OrderEmail', function (req, done) {
        var userId;
        if (typeof req.user_id != 'undefined' && req.user_id != '') {
            if (isObjectId(req.user_id)) {
                userId = new mongoose.Types.ObjectId(req.user_id);
            } else {
                return;
            }
        } else {
            //  res.send({ "status": 0, "errors": 'Error in mail13..!' });
            return;
        }
        var orderId;
        if (typeof req.order_id != 'undefined' && req.order_id != '') {
            if (isObjectId(req.order_id)) {
                orderId = new mongoose.Types.ObjectId(req.order_id);
            } else {
                //  res.send({ "status": 0, "errors": 'Error in mail.14.!' });
                return;
            }
        } else {
            // res.send({ "status": 0, "errors": 'Error in mail15..!' });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                //res.send({ "status": 0, "errors": 'Error in mail..16!' }); 
            } else {
                db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social_settings) {
                    if (err || !social_settings) {
                        res.send({ status: 0, message: 'Configure your website settings' });
                    } else {
                        db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
                            if (err || !userDetails) {
                                // res.send({ "status": 0, "errors": 'Error in mail.16.!' });
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
                                                done(null, { status: 1, response: response });
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
        })
    })
    /* controller.addCart = function (req, res) {
        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('restaurant_id', 'restaurant_id is required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        data.user_id = req.body.user_id;
        data.restaurant_id = req.body.restaurant_id;
        data.cart_details = req.body.food;
        data.coupon_code = req.body.coupon_code;
        data.discount_type = req.body.discount_type;
        db.GetOneDocument('restaurant', { _id: data.restaurant_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
            if (err || !rest) {
                res.send({ "status": 0, "errors": 'Error in restaurant..!' });
            }
            else {
                db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                    if (err || !user) {
                        res.send({ "status": 0, "errors": 'Error in user..!' });
                    }
                    else {
                        db.GetOneDocument('cart', { user_id: data.user_id, restaurant_id: data.restaurant_id }, {}, {}, function (err, cart) {
                            if (err) {
                                res.send({ "status": 0, "errors": 'Error in cart..!' });
                            }
                            else {
                                if (cart) {
                                    db.UpdateDocument('cart', { user_id: data.user_id, restaurant_id: data.restaurant_id }, { cart_details: '', cart_details: data.cart_details, coupon_code: data.coupon_code, discount_type: data.discount_type }, {}, function (err, response) {
                                        if (err || response.nModified == 0) {
                                            res.send({ "status": 0, "errors": 'Error in cart' });
                                        }
                                        else {
                                            res.send({ "status": 1, "response": 'Food Successfully updated in cart.' });
                                        }
                                    });
                                }
                                else {
                                    db.InsertDocument('cart', data, function (err, cartdoc) {
                                        if (err || cartdoc.nModified == 0) {
                                            res.send({ "status": 0, "errors": 'Error in add to cart..!' });
                                        } else {
                                            res.send({ "status": 1, "response": 'Food Successfully added in cart.' });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
    } */

    controller.addCart = function (req, res) {
        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('city_id', 'city_id is required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        data.user_id = req.body.user_id;
        data.city_id = req.body.city_id;
        data.cart_details = req.body.cart_details;
        data.coupon_code = req.body.coupon_code;
        data.discount_type = req.body.discount_type;
        // if (typeof data.cart_details != 'undefined' && data.cart_details.length > 0) {
        //     for (var i = 0; i < data.cart_details.length; i++) {
        //         if (typeof data.cart_details[i].addons != 'undefined' && data.cart_details[i].addons.length > 0) {
        //             for (var j = 0; j < data.cart_details[i].addons.length; j++) {
        //                 if (isObjectId(data.cart_details[i].addons[j]._id)) {
        //                     data.cart_details[i].addons[j]._id = new mongoose.Types.ObjectId(data.cart_details[i].addons[j]._id);
        //                 }
        //             }
        //         }
        //         if (typeof data.cart_details[i].base_pack != 'undefined' && data.cart_details[i].base_pack.length > 0) {
        //             for (var j = 0; j < data.cart_details[i].base_pack.length; j++) {
        //                 if (isObjectId(data.cart_details[i].base_pack[j]._id)) {
        //                     data.cart_details[i].base_pack[j]._id = new mongoose.Types.ObjectId(data.cart_details[i].base_pack[j]._id);
        //                 }
        //                 if (typeof data.cart_details[i].base_pack[j].sub_pack != 'undefined' && data.cart_details[i].base_pack[j].sub_pack.length > 0) {
        //                     for (var z = 0; z < data.cart_details[i].base_pack[j].sub_pack.length; z++) {
        //                         if (isObjectId(data.cart_details[i].base_pack[j].sub_pack[z]._id)) {
        //                             data.cart_details[i].base_pack[j].sub_pack[z]._id = new mongoose.Types.ObjectId(data.cart_details[i].base_pack[j].sub_pack[z]._id);
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // }
        db.GetOneDocument('city', { _id: data.city_id, status: { $eq: 1 } }, {}, {}, function (err, rest) {
            if (err || !rest) {
                res.send({ "status": 0, "errors": 'Error in city..!' });
            }
            else {
                db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
                    if (err || !user) {
                        res.send({ "status": 0, "errors": 'Error in user..!' });
                    }
                    else {
                        db.GetOneDocument('cart', { user_id: data.user_id, city_id: data.city_id }, {}, {}, function (err, cart) {
                            if (err) {
                                res.send({ "status": 0, "errors": 'Error in cart..!' });
                            }
                            else {
                                if (cart) {
                                    db.UpdateDocument('cart', { user_id: data.user_id, city_id: data.city_id }, { cart_details: data.cart_details, coupon_code: data.coupon_code, discount_type: data.discount_type }, {}, function (err, response) {
                                        if (err || response.nModified == 0) {
                                            res.send({ "status": 0, "errors": 'Error in cart' });
                                        }
                                        else {
                                            res.send({ "status": 1, "response": 'Product Successfully updated in cart.' });
                                        }
                                    });
                                }
                                else {
                                    db.InsertDocument('cart', data, function (err, cartdoc) {
                                        if (err || cartdoc.nModified == 0) {
                                            res.send({ "status": 0, "errors": 'Error in add to cart..!' });
                                        } else {
                                            res.send({ "status": 1, "response": 'Product Successfully added in cart.' });
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

    controller.cartCheck = function (req, res) {
        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('user_id', 'user_id is required').notEmpty();
        req.checkBody('city_id', 'city_id is required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }

        data.user_id = req.body.user_id;
        data.city_id = req.body.city_id;

        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        // db.GetOneDocument('restaurant', { _id: data.restaurant_id }, {}, {}, function (err, rest) {
        //     if (err || !rest) {
        //         res.send({ "status": 0, "errors": 'Error in restaurant..!' });
        //     }
        //     else {
        //         if (rest.status == 1) {
        //             var respo = {}
        //             if (rest.offer) {
        //                 respo.offer_type = rest.offer.offer_type;
        //                 respo.target_amount = rest.offer.target_amount;
        //                 respo.offer_amount = rest.offer.offer_amount;
        //                 respo.max_off = rest.offer.max_off;
        //                 respo.offer_status = rest.offer.offer_status;
        //             }
        //             var respo1 = {};
        //             if (rest.package_charge) {
        //                 respo1.package_status = rest.package_charge.package_status;
        //                 respo1.package_amount = rest.package_charge.package_amount.toFixed(2);
        //             }
        db.GetOneDocument('users', { _id: data.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
            if (err || !user) {
                res.send({ "status": 0, "errors": 'Error in user..!' });
            }
            else {
                db.GetDocument('order_address', { 'user_id': data.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
                    if (err) {
                        res.send({
                            "status": "0",
                            "errors": "No delivery address found..!"
                        });
                    } else {
                        var doc = [];
                        if (response) {
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
                        }
                        db.GetOneDocument('cart', { city_id: mongoose.Types.ObjectId(data.city_id), user_id: mongoose.Types.ObjectId(data.user_id) }, {}, {}, function (err, cartdoc) {
                            if (err || !cartdoc) {
                                res.send({ "status": 0, "errors": 'Error in cart..!' });
                            } else {
                                var server_offset = (new Date).getTimezoneOffset();
                                var diff_offset = (server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                var food = [];
                                if (cartdoc) {
                                    if (cartdoc.cart_details) {
                                        for (var i = 0; i < cartdoc.cart_details.length; i++) {
                                            food.push((cartdoc.cart_details[i].id).toString())
                                        }
                                    }
                                }
                                db.GetDocument('food', { '_id': { $in: food } }, {}, {}, function (err, data) {
                                    if (err) {
                                        res.send(err);
                                    }
                                    else {
                                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                            if (err || !settings) {
                                                res.send({ "status": "0", "errors": "Configure your app settings" });
                                            } else {

                                                db.GetOneDocument('city', { _id: mongoose.Types.ObjectId(req.body.city_id) }, {}, {}, function (err, citydoc) {
                                                    if (err || !citydoc) {
                                                        res.send({ "status": "0", "errors": "Invalid City, Please check your data..!" });
                                                    } else {
                                                        var delivery_cost = citydoc.delivery_charge.default_amt;
                                                        var deli_target_cost = citydoc.delivery_charge.target_amount;

                                                        var tax = 0;


                                                        // if(rest && typeof rest.com_taxtype != 'undefined' && rest.com_taxtype != null && rest.com_taxtype != '' && rest.com_taxtype == 'unique' ){
                                                        // 	if (rest && typeof rest.unique_tax != 'undefined' && rest.unique_tax != null && rest.unique_tax != '' && rest.unique_tax.rest_tax && typeof rest.unique_tax.rest_tax != 'undefined' && rest.unique_tax.rest_tax != null && rest.unique_tax.rest_tax != '') {
                                                        // 		tax = rest.unique_tax.rest_tax;
                                                        // 	}
                                                        // } else{
                                                        // 	 if (rest && typeof rest.tax != 'undefined' && rest.tax != null && rest.tax != '') {
                                                        // 		tax = rest.tax;
                                                        // 	}
                                                        // }
                                                        var response = {};
                                                        response.status = '1';
                                                        response.cart_id = cartdoc._id;
                                                        response.charge_details = {};
                                                        // response.charge_details.night_fare = '';
                                                        // response.charge_details.surge_fare = '';
                                                        var currentTime1 = new Date();
                                                        var current_seconds = (currentTime1.getHours() * 60 * 60) + (currentTime1.getMinutes() * 60) + currentTime1.getSeconds();
                                                        var date = new Date();
                                                        if (req.body.schedule_type == '1') {
                                                            var schedule_time = req.body.schedule_time;
                                                            var schedule_day = req.body.schedule_day;
                                                            var hours = parseInt(schedule_time.slice(0, -6));
                                                            var minutes = parseInt(schedule_time.slice(3, -3));
                                                            var meridiem = schedule_time.slice(-2);
                                                            if (meridiem == 'PM' && hours != 12) {
                                                                hours = hours + 12;
                                                            }
                                                            date.setHours(hours);
                                                            date.setMinutes(minutes);
                                                            var current_seconds = (date.getHours() * 60 * 60) + (date.getMinutes() * 60) + date.getSeconds();
                                                        }
                                                        // if (typeof citydoc.night_fare_settings != 'undefined' && typeof citydoc.night_fare_settings.status != 'undefined' && citydoc.night_fare_settings.status == 1) {
                                                        //     var start_time = new Date(citydoc.night_fare_settings.start_time);
                                                        //     var end_time = new Date(citydoc.night_fare_settings.end_time);
                                                        //     var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                        //     var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                        //     if (start_time_seconds < current_seconds && current_seconds < end_time_seconds) {
                                                        //         response.charge_details.night_fare = parseFloat(citydoc.night_fare_settings.amount);
                                                        //     }
                                                        // }

                                                        // if (typeof citydoc.extra_fare_settings != 'undefined' && typeof citydoc.extra_fare_settings.status != 'undefined' && citydoc.extra_fare_settings.status == 1) {
                                                        //     var start_time = new Date(citydoc.extra_fare_settings.start_time);
                                                        //     var end_time = new Date(citydoc.extra_fare_settings.end_time);
                                                        //     var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                        //     var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                        //     if (start_time_seconds < current_seconds && current_seconds < end_time_seconds) {
                                                        //         response.charge_details.surge_fare = parseFloat(citydoc.extra_fare_settings.amount);
                                                        //     }
                                                        // }

                                                        response.charge_details.delivery_charge = delivery_cost;
                                                        response.charge_details.target_charge = deli_target_cost;
                                                        response.charge_details.tax_percent = tax;
                                                        var cart = [];
                                                        if (data) {
                                                            // var curent_date = timezone.tz(new Date(), settings.settings.time_zone).format(settings.settings.time_format);
                                                            // var current_time = moment(curent_date, ["h:mm A"]).format("HH:mm");
                                                            for (var i = 0; i < data.length; i++) {
                                                                // var food_availability = data[i].visibility;
                                                                // var availability = 0;
                                                                // if (typeof data[i].food_time != 'undefined' && typeof data[i].food_time.status != 'undefined' && data[i].food_time.status == 1) {
                                                                //     var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                                                //     var currentTime = moment(time_now, "HH:mm a");
                                                                //     currentTime.toString();

                                                                //     from_date = timezone.tz(data[i].food_time.from_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                                //     to_date = timezone.tz(data[i].food_time.to_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                                //     var startTime = moment(from_date, "HH:mm a");
                                                                //     startTime.toString();
                                                                //     var endTime = moment(to_date, "HH:mm a");
                                                                //     endTime.toString();
                                                                //     if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && data[i].visibility == 1) {
                                                                //         data[i].visibility = 1;
                                                                //     }
                                                                //     else {
                                                                //         data[i].visibility = 0;
                                                                //     }
                                                                //     if (typeof data[i].food_time.from_time != 'undefined') {
                                                                //         data[i].food_time.from_time = new Date(new Date(data[i].food_time.from_time).getTime() + diff_offset);
                                                                //     }
                                                                //     if (typeof data[i].food_time.to_time != 'undefined') {
                                                                //         data[i].food_time.to_time = new Date(new Date(data[i].food_time.to_time).getTime() + diff_offset);
                                                                //     }
                                                                // }
                                                                // var offer = '';
                                                                // if (data[i].offer.status == 1) { offer = data[i].offer.amount || 0 }
                                                                cart.push({ 'name': data[i].name, 'id': data[i]._id, 'status': data[i].status, 'visibility': data[i].visibility })
                                                                // cart[i].addons = data[i].addons;
                                                                // cart[i].base_pack = data[i].base_pack;
                                                                // cart[i].food_time = data[i].food_time;
                                                                // cart[i].food_status = data[i].status;
                                                            }
                                                        }
                                                        /* var week_days_checkin = 1;
                                                        var d = new Date();
                                                        var n = d.getDay();
                                                        if (n == 6 || n == 0) { week_days_checkin = 0; } //its week end

                                                        var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
                                                        var currentTime = moment(time_now, "HH:mm a");
                                                        currentTime.toString();

                                                        if (typeof rest.time_setting != 'undefined') {
                                                            if (typeof rest.time_setting.week_days != 'undefined') {
                                                                var start_date = timezone.tz(rest.time_setting.week_days.start_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                                var end_date = timezone.tz(rest.time_setting.week_days.end_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                            }
                                                        }
                                                        
                                                        if (typeof rest.time_setting != 'undefined') {
                                                            if (typeof rest.time_setting.week_end.start_time != 'undefined') {

                                                                if (week_days_checkin == 0) {
                                                                    start_date = timezone.tz(rest.time_setting.week_end.start_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                                    end_date = timezone.tz(rest.time_setting.week_end.end_time, settings.settings.time_zone).format(settings.settings.time_format);
                                                                }
                                                            }
                                                        }

                                                        var startTime = moment(start_date, "HH:mm a");
                                                        startTime.toString();

                                                        var endTime = moment(end_date, "HH:mm a");
                                                        endTime.toString();

                                                        var rest_visibility = 0;

                                                        if ((startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) && rest.availability == 1) {
                                                            rest_visibility = 1;
                                                        }

                                                        if (typeof rest.time_setting != 'undefined') {
                                                            if (typeof rest.time_setting.week_days != 'undefined') {
                                                                if (typeof rest.time_setting.week_days.start_time != 'undefined') {
                                                                    rest.time_setting.week_days.start_time = new Date(new Date(rest.time_setting.week_days.start_time).getTime() + diff_offset);
                                                                }
                                                                if (typeof rest.time_setting.week_days.end_time != 'undefined') {
                                                                    rest.time_setting.week_days.end_time = new Date(new Date(rest.time_setting.week_days.end_time).getTime() + diff_offset);
                                                                }
                                                                if (typeof rest.time_setting.week_end.start_time != 'undefined') {
                                                                    rest.time_setting.week_end.start_time = new Date(new Date(rest.time_setting.week_end.start_time).getTime() + diff_offset);
                                                                }
                                                                if (typeof rest.time_setting.week_end.end_time != 'undefined') {
                                                                    rest.time_setting.week_end.end_time = new Date(new Date(rest.time_setting.week_end.end_time).getTime() + diff_offset);
                                                                }
                                                            }
                                                        } */


                                                        //business hour per day
                                                        // var diff_b_offset = -(server_offset * 60 * 1000) - (client_offset * 60 * 1000);
                                                        // var currentBtime = new Date();
                                                        // var current_b_seconds = (currentBtime.getHours() * 60 * 60) + (currentBtime.getMinutes() * 60) + currentBtime.getSeconds();
                                                        // var open_till = new Date(new Date().getTime() + diff_b_offset);
                                                        // var day_array = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                        // let day = (new Date).getDay();
                                                        // let tzname = geoTz(parseFloat(rest.location.lat), parseFloat(rest.location.lng))[0];
                                                        // let offset = tz.tz(tzname).utcOffset();
                                                        // day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
                                                        // var currentDay = day_array[day];
                                                        // var working_hours_availability = 0;
                                                        // if (typeof rest.working_hours != 'undefined' && rest.working_hours.length > 0) {
                                                        //     var index_pos = rest.working_hours.map(function (e) { return e.day; }).indexOf(currentDay);
                                                        //     if (index_pos != -1) {
                                                        //         var working_hours = rest.working_hours[index_pos];
                                                        //         if (working_hours.selected == 1) {
                                                        //             var match_index = working_hours.slots.findIndex(item => {
                                                        //                 var start_time = new Date(item.start_time);
                                                        //                 var end_time = new Date(item.end_time);
                                                        //                 var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                                        //                 var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                                        //                 if (start_time_seconds > end_time_seconds) {
                                                        //                     return ((start_time_seconds < current_b_seconds && 86400 > current_b_seconds) || (0 < current_b_seconds && end_time_seconds > current_b_seconds))
                                                        //                 } else {
                                                        //                     return (start_time_seconds < current_b_seconds && end_time_seconds > current_b_seconds)
                                                        //                 }
                                                        //             })
                                                        //             if (match_index != -1 || working_hours.wholeday == 1) {
                                                        //                 if (working_hours.wholeday == 1) {
                                                        //                     var d = new Date();
                                                        //                     d.setHours(23);
                                                        //                     d.setMinutes(59);
                                                        //                     open_till = new Date(new Date(d).getTime() + diff_b_offset);
                                                        //                 } else {
                                                        //                     open_till = new Date(new Date(working_hours.slots[match_index].end_time).getTime() + diff_b_offset);
                                                        //                 }
                                                        //                 working_hours_availability = 1;
                                                        //             } else {
                                                        //                 working_hours_availability = 0;
                                                        //             }
                                                        //         } else {
                                                        //             working_hours_availability = 0;
                                                        //         }
                                                        //     } else {
                                                        //         working_hours_availability = 0;
                                                        //     }
                                                        // }
                                                        //business hour per day end


                                                        /* response.rest_visibility = 0;
                                                        response.week_days_checkin = 1;
                                                        response.working_time_setting = {}; */
                                                        //response.availability = rest.availability;
                                                        response.address_details = doc;
                                                        //response.offer = respo;
                                                        //response.package_charge = respo1;
                                                        response.refer_offer = user.refer_activity;
                                                        response.cart_details = cart;
                                                        // response.tax_percent = tax;
                                                        // response.working_hours_availability = working_hours_availability;
                                                        //response.open_till = open_till;
                                                        db.GetOneDocument('tax', { tax_type: 'common' }, {}, {}, function (err, taxdoc) {
                                                            //console.log(taxdoc.amount)
                                                            if (taxdoc.amount) {
                                                                response.tax_percent = taxdoc.amount;
                                                            } else {
                                                                response.tax_percent = tax;
                                                            }
                                                            res.send(response);
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
        });
        //     } else {
        //         res.send({ "status": "0", "errors": "Currently Restaurant not available" });
        //     }
        // }
        //});
    }

    controller.getCartDetailsByRestaurant = function (req, res) {
        var data = {};
        data.status = '0';
        var message = '';
        req.checkBody('restaurant_id', 'restaurant_id is required').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send({ "status": "0", "errors": errors[0].msg });
            return;
        }
        data.restaurant_id = req.body.restaurant_id;
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = parseInt(req.body.client_offset);
        }
        db.GetOneDocument('restaurant', { _id: data.restaurant_id }, {}, {}, function (err, rest) {
            if (err || !rest) {
                res.send({ "status": 0, "errors": 'Error in restaurant..!' });
            }
            else {
                if (rest.status == 1) {
                    var respo = {}
                    if (rest.offer) {
                        respo.offer_type = rest.offer.offer_type;
                        respo.offer_status = rest.offer.offer_status;
                        respo.target_amount = rest.offer.target_amount;
                        respo.offer_amount = rest.offer.offer_amount;
                        respo.max_off = rest.offer.max_off;
                    }
                    var respo1 = {};
                    if (rest.package_charge) {
                        respo1.package_status = rest.package_charge.package_status;
                        respo1.package_amount = rest.package_charge.package_amount.toFixed(2);
                    }
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        if (err || !settings) {
                            res.send({ "status": "0", "errors": "Configure your app settings" });
                        } else {
                            db.GetOneDocument('city', { cityname: rest.main_city }, {}, {}, function (err, citydoc) {
                                if (err || !citydoc) {
                                    res.send({ "status": "0", "errors": "Invalid restaurant, Please check your data..!" });
                                } else {
                                    var delivery_cost = citydoc.delivery_charge.default_amt;
                                    var deli_target_cost = citydoc.delivery_charge.target_amount;
                                    var tax = 0;
                                    if (rest && typeof rest.com_taxtype != 'undefined' && rest.com_taxtype != null && rest.com_taxtype != '' && rest.com_taxtype == 'unique') {
                                        if (rest && typeof rest.unique_tax != 'undefined' && rest.unique_tax != null && rest.unique_tax != '' && rest.unique_tax.rest_tax && typeof rest.unique_tax.rest_tax != 'undefined' && rest.unique_tax.rest_tax != null && rest.unique_tax.rest_tax != '') {
                                            tax = rest.unique_tax.rest_tax;
                                        }
                                    } else {
                                        if (rest && typeof rest.tax != 'undefined' && rest.tax != null && rest.tax != '') {
                                            tax = rest.tax;
                                        }
                                    }
                                    var response = {};
                                    response.status = '1';
                                    response.charge_details = {};
                                    response.charge_details.night_fare = '';
                                    response.charge_details.surge_fare = '';
                                    var currentTime1 = new Date();
                                    var current_seconds = (currentTime1.getHours() * 60 * 60) + (currentTime1.getMinutes() * 60) + currentTime1.getSeconds();
                                    var date = new Date();
                                    if (req.body.schedule_type == '1') {
                                        var schedule_time = req.body.schedule_time;
                                        var schedule_day = req.body.schedule_day;
                                        var hours = parseInt(schedule_time.slice(0, -6));
                                        var minutes = parseInt(schedule_time.slice(3, -3));
                                        var meridiem = schedule_time.slice(-2);
                                        if (meridiem == 'PM' && hours != 12) {
                                            hours = hours + 12;
                                        }
                                        date.setHours(hours);
                                        date.setMinutes(minutes);
                                        var current_seconds = (date.getHours() * 60 * 60) + (date.getMinutes() * 60) + date.getSeconds();
                                    }
                                    if (typeof citydoc.night_fare_settings != 'undefined' && typeof citydoc.night_fare_settings.status != 'undefined' && citydoc.night_fare_settings.status == 1) {
                                        var start_time = new Date(citydoc.night_fare_settings.start_time);
                                        var end_time = new Date(citydoc.night_fare_settings.end_time);
                                        var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                        var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                        if (start_time_seconds < current_seconds && current_seconds < end_time_seconds) {
                                            response.charge_details.night_fare = parseFloat(citydoc.night_fare_settings.amount);
                                        }
                                    }

                                    if (typeof citydoc.extra_fare_settings != 'undefined' && typeof citydoc.extra_fare_settings.status != 'undefined' && citydoc.extra_fare_settings.status == 1) {
                                        var start_time = new Date(citydoc.extra_fare_settings.start_time);
                                        var end_time = new Date(citydoc.extra_fare_settings.end_time);
                                        var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                                        var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                                        if (start_time_seconds < current_seconds && current_seconds < end_time_seconds) {
                                            response.charge_details.surge_fare = parseFloat(citydoc.extra_fare_settings.amount);
                                        }
                                    }
                                    response.charge_details.delivery_charge = delivery_cost;
                                    response.charge_details.target_charge = deli_target_cost;
                                    response.charge_details.tax_percent = tax;
                                    response.offer = respo;
                                    response.package_charge = respo1;
                                    response.tax_percent = tax;
                                    res.send(response);
                                }
                            });
                        }
                    });
                } else {
                    res.send({ "status": "0", "errors": "Currently Restaurant not available" });
                }
            }
        });
    }
    controller.getSingleOrderDetails = function (req, res) {
        var orderId;
        if (typeof req.body.orderId != 'undefined' && req.body.orderId != '') {
            orderId = req.body.orderId;
        } else {
            res.send({ "status": "0", "errors": 'Invalid orderId' });
            return;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ "status": "0", "errors": 'Configure your app settings' });
            } else {
                var filter_query = { "order_id": orderId };
                var condition = [
                    { $match: filter_query },
                    { '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
                    { "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
                    { '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
                    { "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            orderDetails: {
                                createdAt: "$createdAt",
                                status: "$status",
                                order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Picked Up", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By You", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
                                mode: "$transactionDetails.type",
                                order_history: "$order_history",
                                restaurantDetails: {
                                    restaurantname: "$restaurantDetails.restaurantname",
                                    username: "$restaurantDetails.username",
                                    email: "$restaurantDetails.email",
                                    address: "$restaurantDetails.address",
                                    _id: "$restaurantDetails._id",
                                },
                                _id: "$_id",
                                transaction_id: "$transaction_id",
                                user_id: "$user_id",
                                restaurant_id: "$restaurant_id",
                                coupon_code: "$coupon_code",
                                delivery_address: "$delivery_address",
                                order_id: "$order_id",
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
                                cancellationreason: "$cancellationreason",
                            }
                        }
                    }
                ];
                db.GetAggregation('orders', condition, function (err, docdata) {
                    if (err || !docdata) {
                        res.send({ "status": "1", "message": '', orderDetails: {} });
                    } else {
                        if (docdata.length > 0) {
                            var orderDetails = [];
                            if (typeof docdata[0].orderDetails != 'undefined') {
                                orderDetails = docdata[0].orderDetails;
                            }
                            res.send({ "status": "1", "message": '', orderDetails: orderDetails });
                        } else {
                            res.send({ "status": "1", "message": '', orderDetails: {} });
                        }
                    }
                })
            }
        })
    }
    controller.getOfferCoupons = async (req, res) => {
        var coupon_data = {}
        try {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            console.log("site_url", settings.doc)
            var site_url = settings.doc.settings.site_url
            if (!settings) {
                coupon_data.status = false
                coupon_data.message = "Something went wrong"
                res.send(coupon_data)
            } else {
                var todayDate = new Date();
                var couponquery = { status: 1, "expiry_date": { $gte: todayDate }, total: { $ne: 0 } }
                const get_coupons = await db.GetDocument('coupon', couponquery, {}, {})

                for (let i = 0; i < get_coupons.doc.length > 0; i++) {
                    get_coupons.doc[i].image = site_url + get_coupons.doc[i].image
                }



                if (get_coupons && get_coupons.status == true) {
                    console.log("coupons at line 3010", get_coupons.doc.length)
                }

                if (!get_coupons) {
                    coupon_data.status = false
                    coupon_data.message = "Something went wrong"
                    res.send(coupon_data)
                } else {
                    coupon_data.status = true
                    coupon_data.message = "Success"
                    coupon_data.coupon = get_coupons
                    res.send(coupon_data)
                }
            }
        } catch (e) {
            console.log(e, "Error at getoffercoupon")
        }
        // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {

        //     if (err || !settings) {
        //         res.send({ "status": "0", "errors": 'Configure your app settings' });
        //     } else {
        //         var todayDate = new Date();
        //         var couponquery = { status: 1, "expiry_date": { $gte: todayDate } }
        //         db.GetDocument('coupon', couponquery, {}, {}, function (err, couponData) {
        //             if (err || !couponData) {
        //                 res.send({ "status": "0", "message": 'Sorry no coupon is available', "data": [] });
        //             } else {
        //                 res.send({ "status": "1", "message": '', "data": couponData });
        //             }
        //             events.emit('coupon_update', {}, function (err, result) { });
        //         })
        //     }
        // })
    }
    controller.applyCoupon = async (req, res) => {
        try {
            console.log(req.body, 'this is request body');
            const couponCode = req.body.couponCode;
            const user_id = req.body.user_id;
            const cart_id = req.body.cart_id;
            const type = req.body.type;  // buy_now, cart
            const today = new Date()
            let couponCondition = false;
            const coupon = await db.GetOneDocument('coupon', { 'code': couponCode }, {}, {})
            console.log(coupon, 'this is the coupon');
            if (coupon.status === false) {
                res.send({ error: true, status: false, message: "You entered wrong one" })
            } else {
                if (coupon.doc.valid_from < today) {
                    console.log("Hi this fine now");
                    if (coupon.doc.expiry_date > today) {
                        console.log("Hi this is not fine now");
                        if (coupon.doc.used <= coupon.doc.total) {
                            console.log("Hi waiting for you");
                            if (coupon.doc.used_by) {
                                const userEntry = coupon.doc.used_by.find(entry => entry.user_id === user_id);
                                console.log(userEntry, 'this is user entry');
                                if (userEntry) {
                                    if (userEntry.number_of_time < coupon.doc.usage.per_user) {
                                        couponCondition = true
                                    } else {
                                        res.send({ error: true, status: false, message: `You have already used the limit` })
                                    }
                                } else {
                                    couponCondition = true;
                                }
                            } else {
                                couponCondition = true;
                            }

                        } else {
                            res.send({ error: true, status: false, message: `The coupon not available` })
                        }
                    } else {
                        res.send({ error: true, status: false, message: `The coupon code is expired` })
                    }
                } else {
                    res.send({ error: true, status: false, message: `The coupon code is not active now` })
                }
            }
            if (couponCondition) {
                console.log('surprise you entered at here');
                // const cart= await db.UpdateDocument('users', { '_id': user._id }, { $push: { refer_activity: refer_offer } }, {})
                if (type == 'buy_now') {

                } else {
                    const cart = await db.GetOneDocument('cart', { _id: cart_id }, {}, {})
                    console.log(cart.doc, 'this is the cart ____________');
                    if (cart.status == false) {
                        console.log("------line at 3092--------------------")
                        res.send({ error: true, message: 'Something went wrong' })
                    } else {
                        const discount_type = coupon.doc.discount_type;
                        let discount_amount;
                        if (discount_type == 'Percentage') {
                            // const sumPsprice = cart.doc.cart_details.reduce((total, item) => total + item.psprice, 0);
                            const sumPspriceQuantity = cart.doc.cart_details.reduce((total, item) => total + (item.psprice * item.quantity), 0);
                            const discountAmount = (coupon.doc.amount_percentage / 100) * sumPspriceQuantity;
                            
                            // Calculate the discounted total
                            // const discountedTotal = sumPspriceQuantity - discountAmount;

                            //                             console.log(sumPspriceQuantity,'sumPsprice sumPsprice');
                            //                             console.log(discountedTotal,'discountedTotal discountedTotal ');
                            discount_amount = discountAmount
                            const update = await db.UpdateDocument('cart', { '_id': cart_id }, { $set: { coupon_discount: discount_amount, coupon_code: couponCode, discount_type: discount_type } }, {})
                            console.log(update, 'this  is the update');
                            if (update.status) {
                                //   const update1=  await db.UpdateDocument('coupon', { '_id': coupon.doc._id }, { $inc: { used: 1 } }, {})
                                //   console.log(update1,'this is the update increment used');
                                //  const update= await db.UpdateDocument('coupon', { '_id': coupon._id }, { $push: { used_by: {user_id:user_id, number_of_time:} } }, {})
                                // let userEntry = coupon.doc.used_by.find(entry => entry.user_id === user_id);
                                // if(userEntry){
                                //  const update2= await db.UpdateDocument('coupon', { '_id': coupon.doc._id, 'used_by.user_id': user_id }, { $inc: { "used_by.user_id": {number_of_time:1} } }, {})
                                //   console.log(update2,'this is the update increment used number_of_time');
                                // }else{
                                // await db.UpdateDocument('coupon', { '_id': coupon.doc._id }, { $push: { used_by: {user_id:user_id, number_of_time:1} } }, {})
                                res.send({ error: false, status: true, message: 'The coupon is added successfully' })
                                // const update= await db.UpdateDocument('coupon', { '_id': user_id }, { $push: {user_id:user_id,number_of_time:1} }, {})
                                // }
                            } else {
                                res.send({ message: 'Something went wrong', error: true })
                            }
                            // let total_amount = cart.doc.cart_details.
                        } else if (discount_type == 'Flat') {
                            discount_amount = coupon.doc.amount_percentage;
                            // const update= await db.UpdateDocument('coupon', { '_id': coupon._id }, { $set: { refer_activity: refer_offer } }, {})
                            const update = await db.UpdateDocument('cart', { '_id': cart_id }, { $set: { coupon_discount: discount_amount, coupon_code: couponCode, discount_type: discount_type } }, {})
                            console.log(update, 'this  is the update');
                            if (update.status) {
                                //   const update1=  await db.UpdateDocument('coupon', { '_id': coupon.doc._id }, { $inc: { used: 1 } }, {})
                                //   console.log(update1,'this is the update increment used');
                                //  const update= await db.UpdateDocument('coupon', { '_id': coupon._id }, { $push: { used_by: {user_id:user_id, number_of_time:} } }, {})
                                // let userEntry = coupon.doc.used_by.find(entry => entry.user_id === user_id);
                                // if(userEntry){
                                //  const update2= await db.UpdateDocument('coupon', { '_id': coupon.doc._id, 'used_by.user_id': user_id }, { $inc: { "used_by.user_id": {number_of_time:1} } }, {})
                                //   console.log(update2,'this is the update increment used number_of_time');
                                // }else{
                                // await db.UpdateDocument('coupon', { '_id': coupon.doc._id }, { $push: { used_by: {user_id:user_id, number_of_time:1} } }, {})
                                res.send({ error: false, status: true, message: 'The coupon is added successfully' })
                                // const update= await db.UpdateDocument('coupon', { '_id': user_id }, { $push: {user_id:user_id,number_of_time:1} }, {})
                                // }
                            } else {
                                res.send({ message: 'Something went wrong', error: true })
                            }

                        }
                    }
                }
            }
        } catch (error) {

        }
    }
    controller.removeCoupon = async (req, res) => {
        try {
            console.log(req.body, 'this is request body');
            const couponCode = req.body.couponCode;
            const user_id = req.body.user_id;
            const cart_id = req.body.cart_id;
            const type = req.body.type;  // buy_now, cart
            const today = new Date()
            let couponCondition = false;
            const coupon = await db.GetOneDocument('coupon', { 'code': couponCode }, {}, {})
            console.log(coupon, 'this is the coupon');
            if (coupon.status === false) {
                res.send({ error: true, message: 'There is some error' })
            } else {
                const update = await db.UpdateDocument('cart', { '_id': cart_id }, { $unset: { coupon_discount: 0, coupon_code: '', discount_type: '' } }, {})
                if (update.status == false) {
                    res.send({ error: true, message: 'There is some error please try later' })
                } else {
                    res.send({ error: false, message: 'The coupon is removed' })
                }
            }

        } catch (error) {

        }
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

    controller.getOrders = async function (req, res) {
        console.log("hi what is this*********");
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        if (settings.status === false) {
            return res.send({ status: 0, message: "Something went wrong please try again" })
        } else {
            var query = {};
            query = { user_id: new mongoose.Types.ObjectId(req.body.user_id), status: { $nin: [2, 0, 9, 10, 15] } };

            if (req.body.sort) {
                var sorted = req.body.sort.field;
            }
            var usersQuery = [{
                "$match": query

            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    foods: 1,
                    user: 1,
                    order_id: 1,
                    billings: 1,
                    order_history: 1,
                    amount: "$billings.amount.total",
                    delivery_address: 1,
                    status: 1,
                    restaurant_time_out_alert: 1,
                    cancellationreason: 1,
                    schedule_date: 1,
                    schedule_time_slot: 1,
                    seen_status: 1,
                    shipped_date: "$order_history.shipped",
                    packed_date: "$order_history.packed",
                    delivery: "$order_history.delivered",
                    createdAt: 1
                }
            }, {
                $project: {
                    question: 1,
                    document: "$$ROOT"
                }
            },
            {
                $sort: {
                    "document.createdAt": -1
                }
            }, {
                $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
            }
            ];


            var condition = { status: { $ne: 0 } };
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            // console.log("req.body.status>>",req.body.status);
            //     var condition = { status: { $eq:req.body.status } };
            //     console.log("condition>>",condition);

            if (req.body.search) {
                //condition['foods.name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                var searchs = req.body.search;
                usersQuery.push({
                    "$match": {
                        $or: [
                            { "documentData.foods.name": { $regex: searchs + '.*', $options: 'si' } },
                            { "documentData.order_id": { $regex: searchs + '.*', $options: 'si' } },
                            // { "documentData.user.username": { $regex: searchs + '.*', $options: 'si' } },
                            // { "documentData.restaurants.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                            // { "documentData.user.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                            // { "documentData.driver.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                            // { "documentData.restaurants.restaurantname": { $regex: searchs + '.*', $options: 'si' } }
                        ]
                    }
                });

                //search limit
                usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
                usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
                if (req.body.limit && req.body.skip >= 0) {
                    usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
                }
                usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
                //search limit
            }
            var sorting = {};
            if (req.body.sort) {
                var sorter = 'documentData.' + req.body.sort.field;
                sorting[sorter] = req.body.sort.order;
                usersQuery.push({ $sort: sorting });
            }

            if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }

            if (!req.body.search) {
                usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
            }
            //console.log(JSON.stringify(usersQuery))
            const docdata = await db.GetAggregation('orders', usersQuery)
            if (!docdata) {
                res.send({ status: 0, message: err.message });
            } else {
                if (docdata && docdata.length > 0) {
                    for (var i = 0; i < docdata[0].documentData.length; i++) {
                        docdata[0].documentData[i].currency = settings.doc.settings.currency_symbol;
                    }
                    res.send({ status: 1, data: docdata[0].documentData, count: docdata[0].count, message: "Success" });
                } else {
                    res.send({ status: 1, data: [], count: 0, message: "Data retrieved successfully", error: false });
                }
            }

        }

    }

    controller.deleteOrder = async function (req, res) {
        var data = {};
        data.status = 0;
        var errors = [];
        var request = {};
        request.user_id = req.body.user_id;
        const ordersDetails = await db.GetOneDocument('orders', { "user_id": req.body.user_id, _id: req.body.order_id, $or: [{ "status": 1 }, { "status": 15 }] }, {}, {})


        if (!ordersDetails) {
            res.send({ "status": 0, message: 'Invalid Error, Please check your data' });
        } else {
            const transactionDetails = await db.GetOneDocument('transaction', { "_id": ordersDetails.doc.transaction_id }, {}, {})
            if (!transactionDetails) {
                res.send({ "status": 0, message: 'Invalid Error, Please check your data' });
            } else {
                if (transactionDetails.doc.type == 'COD') {
                    const rest = await db.GetOneDocument('city', { _id: request.restaurant_id }, {}, {})
                    if (!rest) {
                        res.send({ "status": 0, "errors": 'Error in City..!' });
                    } else {
                        const user = await db.GetOneDocument('users', { _id: request.user_id, status: { $eq: 1 } }, {}, {})
                        if (!user) {
                            res.send({ "status": 0, "errors": 'Error in user..!' });
                        } else {
                            var updatedoc = { 'status': 9, 'cancellationreason': req.body.cancellationreason };
                            await db.UpdateDocument('orders', { '_id': req.body.order_id }, updatedoc, {})
                            io.of('/chat').in(ordersDetails.doc._id).emit('OrderUpdated', { orderId: ordersDetails.doc._id });
                            var noti_data = {};
                            noti_data.rest_id = ordersDetails.doc.restaurant_id;
                            noti_data.order_id = ordersDetails.doc.order_id;
                            noti_data.user_id = ordersDetails.doc.user_id;
                            noti_data._id = ordersDetails.doc._id;
                            noti_data.user_name = user.username;
                            noti_data.order_type = 'order_rejected';
                            io.of('/chat').in(ordersDetails.doc.user_id).emit('usernotify', noti_data);
                            io.of('/chat').emit('adminnotify', noti_data);
                            var android_restaurant = ordersDetails.doc.restaurant_id;
                            var message = 'User cancelled your order';
                            var response_time = CONFIG.respond_timeout;
                            var action = 'admin_cancel';
                            var options = [req.body.order_id, android_restaurant, response_time, action];
                            if (typeof ordersDetails.doc.refer_offer != "undefined" && typeof ordersDetails.doc.refer_offer.expire_date != "undefined") {
                                var refer_offer = ordersDetails.doc.refer_offer;
                                await db.UpdateDocument('users', { '_id': user._id }, { $push: { refer_activity: refer_offer } }, {});
                            }
                            var mail_data = {};
                            mail_data.user_id = user._id;
                            mail_data.order_id = ordersDetails.doc._id;
                            events.emit('cancelOrderEmail', mail_data, function (err, result) { });
                            res.send({ "status": "1", "message": "Order Cancelled" });
                        }
                    }
                }
            }
        }
    }


    controller.ordersList = async function (req, res) {
        // let errors = validationResult(req).errors;
        // if (errors && Array.isArray(errors) && errors.length > 0) {
        // 	res.send({
        // 		status: 0,
        // 		message: errors[0].msg
        // 	});
        // 	return;
        // }
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        if (settings.status === false) {
            return res.send({ status: 0, message: "Something went wrong please try again" })
        } else {
            var query = {};
            query = { user_id: new mongoose.Types.ObjectId(req.body.user_id), status: { $nin: [2, 0, 15] } };
            let skip = req.body.skip ? parseInt(req.body.skip) : 0;
            let limit = req.body.limit ? parseInt(req.body.limit) : 20;
            if (req.body.sort) {
                var sorted = req.body.sort.field;
            };
            var sorting = {};
            if (req.body.sort) {
                var sorter = 'documentData.' + req.body.sort.field;
                sorting[sorter] = req.body.sort.order;
            } else {
                sorting = { createdAt: -1 };
            };
            if (req.body.search) {
                query["$or"] = [
                    { "foods.name": { $regex: req.body.search + '.*', $options: 'si' } },
                    { "order_id": { $regex: req.body.search + '.*', $options: 'si' } },
                    // { "documentData.user.username": { $regex: searchs + '.*', $options: 'si' } },
                    // { "documentData.restaurants.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                    // { "documentData.user.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                    // { "documentData.driver.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                    // { "documentData.restaurants.restaurantname": { $regex: searchs + '.*', $options: 'si' } }
                ]
            };
            var usersQuery = [
                {
                    "$match": query

                },
                { $sort: sorting },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "transaction",
                        localField: "transaction_id",
                        foreignField: "_id",
                        as: "transaction"
                    }
                },
                { $unwind: { path: "$transaction", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        foods: 1,
                        user: 1,
                        order_id: 1,
                        transaction:1,
                        billings: 1,
                        order_history: 1,
                        amount: "$billings.amount.total",
                        delivery_address: 1,
                        status: 1,
                        restaurant_time_out_alert: 1,
                        cancellationreason: 1,
                        schedule_date: 1,
                        schedule_time_slot: 1,
                        seen_status: 1,
                        shipped_date: "$order_history.shipped",
                        packed_date: "$order_history.packed",
                        delivery: "$order_history.delivered",
                        createdAt: 1,
                        refundStatus: 1,
                        returnStatus: 1,
                        currency: { $literal: settings.doc.settings.currency_symbol }
                    }
                }
            ];
            const docdata = await db.GetAggregation('orders', usersQuery);
            const count = await db.GetCount("orders", query);
            if (!docdata) {
                res.send({ status: 0, message: err.message });
            } else {
                if (docdata && docdata.length > 0) {
                    res.send({ status: 1, data: docdata, count: count, message: "Success" });
                } else {
                    res.send({ status: 1, data: [], count: 0, message: "Success" });
                }
            }

        }

    }

    controller.printDocument = async (req, res) => {

        var data = {};
        try {
            let settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            if (settings.status == false) {
                data.status = 0
                data.message = "Configure your website settings"
                res.send(data)
            } else {
                let order_id = await db.GetOneDocument('orders', { 'order_id': req.body.order_id }, {}, {})


                if (order_id.status == false) {
                    data.status = 0;
                    data.error = true
                    data.message = 'error in orders';
                    res.send(data);
                } else {
                    let users_id = await db.GetOneDocument('users', { '_id': order_id.doc.user_id }, {}, {})




                    if (users_id.status == false) {
                        data.status = 0;
                        data.error = true
                        data.message = 'error in user';
                        res.send(data);
                    } else {
                        let transaction_id = await db.GetOneDocument('transaction', { '_id': order_id.doc.transaction_id }, {}, {})



                        if (transaction_id.status == false) {
                            data.status = 0;
                            data.error = true
                            data.message = 'error in transaction';
                            res.send(data);
                        } else {
                            let template = await db.GetDocument('emailtemplate', { name: 'print_invoice_order', 'status': { $ne: 0 } }, {}, {})



                            //  function (err, template) {
                            if (template.status == false) {

                                res.send("something went wrong")
                            } else {
                                try {

                                    var deliv_date = order_id.doc.order_history.delivered || order_id.doc.createdAt;
                                    var order_date = deliv_date
                                    //  timezone.tz(deliv_date, settings.time_zone)
                                    // .format(settings.date_format);
                                    var order_time = moment(deliv_date, 'h:mm:ss')
                                    //  timezone.tz(deliv_date, settings.time_zone)
                                    // .format(settings.time_format);
                                    var mydate = moment(order_date, 'DD/MM/YYYY');

                                    var order_delivery_Date = moment(mydate)
                                    // .format(settings.date_format);
                                    //console.log(order_delivery_Date)
                                    //var order_delivery_Date =  Date(orders.schedule_date).format(settings.date_format);
                                    var order_delivery_Time = order_time;
                                    var totalQty = 0;
                                    var totalMrp = 0;
                                    var totalAmt = 0;
                                    var mrpText = '';
                                    var amtText = '';
                                    // var foodDetails = '<table style="border:1px solid #000000;" border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#fff"><tbody><tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">S:No</p></th><th style="width: 45%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px; text-align: left;">Item</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Units</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Qty</p></th><th style="width: 20%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">MRP</p></th><th style="width: 20%; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Total AMT</p></th></tr>';
                                    var foodDetails = '<table style="border:1px solid #000000;" border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#fff"><tbody><tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">S:No</p></th><th style="width: 45%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px; text-align: left;">Item</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Qty</p></th><th style="width: 20%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">MRP</p></th><th colspan="2" style="width: 25%; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Total AMT</p></th></tr>';



                                    for (var i = 0; i < order_id.doc.foods.length; i++) {
                                        var PriceText = '';
                                        var cost = 0.0;
                                        var costText = '';
                                        if (order_id.doc.foods[i].offer_price > 0) {



                                            // console.log("---------------------------order_id.doc.foods[i].mprice---------------------------------------")

                                            // console.log(order_id.doc)
                                            // console.log("---------------------------order_id.doc.foods[i].mprice---------------------------------------")


                                            var remaing_price = (parseFloat(order_id.doc.foods[i].price)).toFixed(2)
                                            PriceText = '₹ ' + ' ' + parseFloat(order_id.doc.foods[i].price).toFixed(2);
                                            cost = (parseFloat(order_id.doc.foods[i].quantity * parseFloat(order_id.doc.foods[i].price))).toFixed(2)
                                            costText = '₹ ' + ' ' + cost;
                                            totalMrp = (parseFloat(totalMrp) + parseFloat(order_id.doc.foods[i].price)).toFixed(2)


                                            totalAmt = (parseFloat(totalAmt) + parseFloat(cost)).toFixed(2)
                                        } else {
                                            PriceText = '₹ ' + ' ' + order_id.doc.foods[i].price;
                                            cost = (parseFloat(order_id.doc.foods[i].quantity * order_id.doc.foods[i].price)).toFixed(2)
                                            costText = '₹ ' + ' ' + cost;
                                            totalMrp = (parseFloat(totalMrp) + parseFloat(order_id.doc.foods[i].price)).toFixed(2)
                                            totalAmt = (parseFloat(totalAmt) + parseFloat(cost)).toFixed(2)
                                        }
                                        totalQty = parseInt(totalQty + order_id.doc.foods[i].quantity)
                                        // foodDetails += '<tr bgcolor="#fff"><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + (i + 1) + '</p></td><td style="width: 45%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: left;">' + orders.foods[i].name + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + orders.foods[i].net_quantity + ' ' + orders.foods[i].units + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + orders.foods[i].quantity + '</p></td><td style="width: 20%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + PriceText + '</p></td><td style="width: 10%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + costText + '</p></td></tr>';
                                        foodDetails += '<tr bgcolor="#fff"><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + (i + 1) + '</p></td><td style="width: 45%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: left;">' + order_id.doc.foods[i].name + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + order_id.doc.foods[i].quantity + '</p></td><td style="width: 20%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + PriceText + '</p></td><td colspan="2" style="width: 10%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + costText + '</p></td></tr>';
                                    }
                                    grand_total = parseFloat(order_id.doc.billings.amount.grand_total).toFixed(2);
                                    mrpText = '₹ ' + ' ' + totalMrp;
                                    amtText = '₹ ' + ' ' + totalAmt;
                                    netamtText = '₹ ' + ' ' + grand_total;
                                    foodDetails += '<tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">&nbsp;</p></th><th style="width: 5%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">' + totalQty + '</p></th><th style="width: 20%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">' + mrpText + '</p></th><th  colspan="2" style="width: 20%; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">' + amtText + '</p></th></tr>';
                                    var total = '';
                                    if (order_id.doc.billings.amount.total > 0) {
                                        foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Total Amount</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.total).toFixed(2)) + '</p></td></tr>';
                                    }
                                    var service_tax = '';
                                    if (order_id.doc.billings.amount.service_tax > 0) {
                                        foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Service Tax</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.service_tax).toFixed(2)) + '</p></td></tr>';
                                    }
                                    var delivery_amount = '';
                                    if (order_id.doc.billings.amount.food_offer_price > 0) {
                                        foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Offer Discount</p></td><td  colspan="2"style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.food_offer_price).toFixed(2)) + '</p></td></tr>';
                                    }
                                    var package_charge = '';
                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Delivery Charge</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Free</p></td></tr>';
                                    // if (orders.billings.amount.package_charge > 0) {
                                    // }

                                    if (order_id.doc.billings.amount.coupon_discount > 0) {
                                        foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Coupon Discount</p></td><td  colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.coupon_discount).toFixed(2)) + '</p></td></tr>';
                                    }

                                    if (order_id.doc.billings.amount.grand_total > 0) {
                                        foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" ><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Grand Total</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.grand_total).toFixed(2)) + '</p></td></tr>';
                                    }

                                    foodDetails += '</tbody></table>';






                                    var html1 = template.doc[0].email_content;
                                    html1 = html1.replace(/{{foodDetails}}/g, foodDetails);
                                    html1 = html1.replace(/{{site_url}}/g, settings.doc.settings.site_url);
                                    html1 = html1.replace(/{{site_title}}/g, settings.doc.settings.site_title);
                                    html1 = html1.replace(/{{logo}}/g, settings.doc.settings.site_url + settings.doc.settings.logo);
                                    html1 = html1.replace(/{{order_id}}/g, order_id.doc.order_id);
                                    html1 = html1.replace(/{{site_address}}/g, settings.doc.settings.site_address);
                                    html1 = html1.replace(/{{order_date}}/g, order_date);
                                    html1 = html1.replace(/{{order_delivery_Date}}/g, order_delivery_Date);
                                    html1 = html1.replace(/{{order_delivery_Time}}/g, order_delivery_Time);
                                    html1 = html1.replace(/{{username}}/g, users_id.doc.username);
                                    html1 = html1.replace(/{{drop_address}}/g, order_id.doc.delivery_address.fulladres || ' ');
                                    html1 = html1.replace(/{{drop_address_state}}/g, order_id.doc.delivery_address.state || ' ');
                                    //html1 = html1.replace(/{{restaurantname}}/g, restaurant.cityname);
                                    // html1 = html1.replace(/{{pickup_address}}/g, restaurant.address.fulladres || ' ');
                                    html1 = html1.replace(/{{useremail}}/g, users_id.doc.email);
                                    html1 = html1.replace(/{{user_phone}}/g, users_id.doc.phone.code + ' ' + users_id.doc.phone.number);
                                    html1 = html1.replace(/{{symbol}}/g, '₹ ');
                                    html1 = html1.replace(/{{totalQty}}/g, totalQty);
                                    html1 = html1.replace(/{{amtText}}/g, amtText);
                                    html1 = html1.replace(/{{netamtText}}/g, netamtText);
                                    var paymenttype = "Pay By Cards, UPI, Wallets, Net Banking";
                                    html1 = html1.replace(/{{paymenttype}}/g, paymenttype);
                                    // if (transaction.type == 'mips') {
                                    // } else {
                                    //     var paymenttype = "COD";
                                    //     html1 = html1.replace(/{{paymenttype}}/g, paymenttype);
                                    // }

                                    var options = {
                                        format: 'A4',
                                        // phantomPath: "./node_modules/phantomjs-prebuilt/bin/phantomjs"
                                    };
                                    var filename = new Date().getTime();




                                    pdf.create(html1, options).toFile('./uploads/invoice/' + filename + '.pdf', function (err, document) {
                                        if (err) {
                                        } else {




                                            var result = { "status": 1, message: '', "filepath": settings.doc.settings.site_url + 'uploads/invoice/' + filename + '.pdf', filename: filename }
                                            res.send(result);
                                        }
                                    });
                                } catch (e) {
                                    console.log(e, "error at saving data in pdf at prinDocument api")

                                }

                            }
                            // });
                        }
                    }
                }
            }
        } catch (e) {
            data.status = 0
            data.msg = "Something Went Wrong"
            // res.send(data)
            console.log(e, "error at print document settings trycatch")
        }






        return;


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
                                db.GetOneDocument('transaction', { '_id': orders.transaction_id }, {}, {}, function (err, transaction) {
                                    if (err || !transaction) {
                                        data.status = 0;
                                        data.message = 'error in transaction';
                                        res.send(data);

                                    } else {
                                        db.GetDocument('emailtemplate', { name: 'print_invoice_order', 'status': { $ne: 0 } }, {}, {}, function (err, template) {
                                            if (err) {
                                            } else {
                                                var deliv_date = orders.order_history.delivered || orders.createdAt;
                                                var order_date = timezone.tz(deliv_date, settings.time_zone).format(settings.date_format);
                                                var order_time = timezone.tz(deliv_date, settings.time_zone).format(settings.time_format);
                                                var mydate = moment(order_date, 'DD/MM/YYYY');

                                                var order_delivery_Date = moment(mydate).format(settings.date_format);
                                                //console.log(order_delivery_Date)
                                                //var order_delivery_Date =  Date(orders.schedule_date).format(settings.date_format);
                                                var order_delivery_Time = order_time;
                                                var totalQty = 0;
                                                var totalMrp = 0;
                                                var totalAmt = 0;
                                                var mrpText = '';
                                                var amtText = '';
                                                // var foodDetails = '<table style="border:1px solid #000000;" border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#fff"><tbody><tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">S:No</p></th><th style="width: 45%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px; text-align: left;">Item</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;"></p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Qty</p></th><th style="width: 20%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">MRP</p></th><th style="width: 20%; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Total AMT</p></th></tr>';
                                                var foodDetails = '<table style="border:1px solid #000000;" border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#fff"><tbody><tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">S:No</p></th><th style="width: 45%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px; text-align: left;">Item</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Qty</p></th><th style="width: 20%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">MRP</p></th><th colspan="2" style="width: 25%; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Total AMT</p></th></tr>';
                                                for (var i = 0; i < orders.foods.length; i++) {
                                                    var PriceText = '';
                                                    var cost = 0.0;
                                                    var costText = '';
                                                    if (orders.foods[i].offer_price > 0) {
                                                        var remaing_price = (parseFloat(orders.foods[i].mprice)).toFixed(2)
                                                        PriceText = '₹ ' + ' ' + parseFloat(orders.foods[i].mprice).toFixed(2);
                                                        cost = (parseFloat(orders.foods[i].quantity * parseFloat(orders.foods[i].mprice))).toFixed(2)
                                                        costText = '₹ ' + ' ' + cost;
                                                        totalMrp = (parseFloat(totalMrp) + parseFloat(orders.foods[i].mprice)).toFixed(2)
                                                        totalAmt = (parseFloat(totalAmt) + parseFloat(cost)).toFixed(2)
                                                    } else {
                                                        PriceText = '₹ ' + ' ' + orders.foods[i].mprice;
                                                        cost = (parseFloat(orders.foods[i].quantity * orders.foods[i].mprice)).toFixed(2)
                                                        costText = '₹ ' + ' ' + cost;
                                                        totalMrp = (parseFloat(totalMrp) + parseFloat(orders.foods[i].mprice)).toFixed(2)
                                                        totalAmt = (parseFloat(totalAmt) + parseFloat(cost)).toFixed(2)
                                                    }
                                                    totalQty = parseInt(totalQty + orders.foods[i].quantity)
                                                    // foodDetails += '<tr bgcolor="#fff"><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + (i + 1) + '</p></td><td style="width: 45%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: left;">' + orders.foods[i].name + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + orders.foods[i].net_quantity + ' ' + orders.foods[i].units + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + orders.foods[i].quantity + '</p></td><td style="width: 20%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + PriceText + '</p></td><td style="width: 10%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + costText + '</p></td></tr>';
                                                    foodDetails += '<tr bgcolor="#fff"><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + (i + 1) + '</p></td><td style="width: 45%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: left;">' + orders.foods[i].name + '</p></td><td style="width: 5%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + orders.foods[i].quantity + '</p></td><td style="width: 20%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + PriceText + '</p></td><td colspan="2" style="width: 10%;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 10px 10px; text-align: center;">' + costText + '</p></td></tr>';
                                                }
                                                grand_total = parseFloat(orders.billings.amount.grand_total).toFixed(2);
                                                mrpText = '₹ ' + ' ' + totalMrp;
                                                amtText = '₹ ' + ' ' + totalAmt;
                                                netamtText = '₹ ' + ' ' + grand_total;
                                                foodDetails += '<tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">&nbsp;</p></th><th style="width: 5%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">' + totalQty + '</p></th><th style="width: 20%; border-right: 1px solid #545454; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">' + mrpText + '</p></th><th  colspan="2" style="width: 20%; border-top: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 10px 0px;">' + amtText + '</p></th></tr>';
                                                var total = '';
                                                if (orders.billings.amount.total > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Total Amount</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((orders.billings.amount.total).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var service_tax = '';
                                                if (orders.billings.amount.service_tax > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Service Tax</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((orders.billings.amount.service_tax).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var delivery_amount = '';
                                                if (orders.billings.amount.food_offer_price > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Offer Discount</p></td><td  colspan="2"style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((orders.billings.amount.food_offer_price).toFixed(2)) + '</p></td></tr>';
                                                }
                                                var package_charge = '';
                                                foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Delivery Charge</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Free</p></td></tr>';
                                                // if (orders.billings.amount.package_charge > 0) {
                                                // }

                                                if (orders.billings.amount.coupon_discount > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Coupon Discount</p></td><td  colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((orders.billings.amount.coupon_discount).toFixed(2)) + '</p></td></tr>';
                                                }

                                                if (orders.billings.amount.grand_total > 0) {
                                                    foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" ><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Grand Total</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((orders.billings.amount.grand_total).toFixed(2)) + '</p></td></tr>';
                                                }
                                                // var food_offer_price = '';
                                                // if (orders.billings.amount.food_offer_price > 0) {
                                                //     foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Food Offer Price</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">'+ settings.currency_symbol + ' ' +((orders.billings.amount.food_offer_price).toFixed(2)) +'</p></td></tr>';
                                                // }
                                                // var offer_discount = '';
                                                // if (orders.billings.amount.offer_discount > 0) {
                                                //     foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Offer Discount</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">'+ settings.currency_symbol + ' ' +((orders.billings.amount.offer_discount).toFixed(2)) +'</p></td></tr>';
                                                // }
                                                // var site_commission = '';
                                                // if (printData.site_commission > 0) {
                                                //     foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Site Commission</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">'+ settings.currency_symbol + ' ' +((printData.site_commission).toFixed(2)) +'</p></td></tr>';
                                                // }
                                                // var restaurant_commission = '';
                                                // if (printData.restaurant_commission > 0) {
                                                //     foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" colspan="2"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Grand Total</p></td><td style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">'+ settings.currency_symbol + ' ' +((printData.restaurant_commission).toFixed(2)) +'</p></td></tr>';
                                                // }
                                                /* foodDetails += '<tr bgcolor="#fff"><td style="border-bottom: 1px solid #545454;" colspan="5"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 20px; margin: 0px; color: #404040; padding: 7px 10px; text-align: left;"><span style="font-weight: bold;">Return Policy:</span> Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries</p></td></tr>'; */
                                                foodDetails += '</tbody></table>';

                                                var html1 = template[0].email_content;
                                                html1 = html1.replace(/{{foodDetails}}/g, foodDetails);
                                                html1 = html1.replace(/{{site_url}}/g, settings.site_url);
                                                html1 = html1.replace(/{{site_title}}/g, settings.site_title);
                                                html1 = html1.replace(/{{logo}}/g, settings.site_url + settings.logo);
                                                html1 = html1.replace(/{{order_id}}/g, orders.order_id);
                                                html1 = html1.replace(/{{order_date}}/g, order_date);
                                                html1 = html1.replace(/{{order_delivery_Date}}/g, order_delivery_Date);
                                                html1 = html1.replace(/{{order_delivery_Time}}/g, order_delivery_Time);
                                                html1 = html1.replace(/{{username}}/g, user.username);
                                                html1 = html1.replace(/{{drop_address}}/g, orders.delivery_address.fulladres || ' ');
                                                html1 = html1.replace(/{{drop_address_state}}/g, orders.delivery_address.state || ' ');
                                                //html1 = html1.replace(/{{restaurantname}}/g, restaurant.cityname);
                                                // html1 = html1.replace(/{{pickup_address}}/g, restaurant.address.fulladres || ' ');
                                                html1 = html1.replace(/{{useremail}}/g, user.email);
                                                html1 = html1.replace(/{{user_phone}}/g, user.phone.code + ' ' + user.phone.number);
                                                html1 = html1.replace(/{{symbol}}/g, '₹ ');
                                                html1 = html1.replace(/{{totalQty}}/g, totalQty);
                                                html1 = html1.replace(/{{amtText}}/g, amtText);
                                                html1 = html1.replace(/{{netamtText}}/g, netamtText);
                                                var paymenttype = "Pay By Cards, UPI, Wallets, Net Banking";
                                                html1 = html1.replace(/{{paymenttype}}/g, paymenttype);
                                                // if (transaction.type == 'mips') {
                                                // } else {
                                                //     var paymenttype = "COD";
                                                //     html1 = html1.replace(/{{paymenttype}}/g, paymenttype);
                                                // }

                                                var options = {
                                                    format: 'A4',
                                                    // phantomPath: "./node_modules/phantomjs-prebuilt/bin/phantomjs"
                                                };
                                                var filename = new Date().getTime();
                                                pdf.create(html1, options).toFile('./uploads/invoice/' + filename + '.pdf', function (err, document) {
                                                    if (err) {
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

    // reviews and ratings












    return controller;
}
