
module.exports = function (app, io) {


    var bcrypt = require('bcrypt-nodejs');
    var db = require('../../controller/adaptor/mongodb.js')
    var attachment = require('../../model/attachments.js');
    var middlewares = require('../../model/middlewares.js');
    var async = require("async");
    var mail = require('../../model/mail.js');
    var twilio = require('../../model/twilio.js');
    var CONFIG = require('../../config/config');
    var library = require('../../model/library.js');
    var util = require('util');
    var turf = require('turf');
    var mongoose = require("mongoose");
    var GoogleAPI = require('../../model/googleapis.js');
    var htmlToText = require('html-to-text');
    var moment = require("moment");
    var timezone = require('moment-timezone');
    var each = require('sync-each');
    var mailcontent = require('../../model/mailcontent.js');
    function isObjectId(n) {
        return mongoose.Types.ObjectId.isValid(n);
    }
    var sortBy = require('sort-by');


    var router = {};
    router.getRcat = (req, res) => {
        var data = {};
        db.GetCount('rcategory', { 'status': { $eq: 1 } }, (err, count) => {
            if (err || count < 1) {
                data.status = 1;
                data.message = 'success';
                data.list = [];
                res.send(data);
            } else {
                var eachrun = 10;
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
                            { $sort: { rcatname: 1 } },
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $project: {
                                    rcatname: "$rcatname",
                                    is_cuisine: 1,
                                    is_fssai: 1
                                }
                            }
                        ];
                        db.GetAggregation('rcategory', query, (err, catlist) => {
                            if (catlist && catlist.length > 0) {
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
                        data.list = categories;
                        res.send(data);
                    }
                );
            }
        });
    }
    router.getCity = function (req, res) {
        db.GetDocument('city', { 'status': { $eq: 1 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        db.GetDocument('restaurant', { status: { $eq: 1 } }, { restaurantname: 1 }, {}, function (err, respo) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send([docdata, data, respo]);
                            }
                        });
                    }
                });
            }
        });
    };

    router.getsubCity = function (req, res) {
        db.GetDocument('city', { 'cityname': req.body.value, 'status': { $eq: 1 } }, { area_management: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (typeof docdata != 'undefined' && docdata.length > 0 && typeof docdata[0].area_management != 'undefined' && docdata[0].area_management.length > 0) {
                    docdata[0].area_management.sort(sortBy('area_name'));
                }
                res.send(docdata);
            }
        });
    };

    router.getsubCuisine = function (req, res) {
        db.GetOneDocument('cuisine', { 'name': req.body.value, 'status': { $ne: 0 } }, {}, {}, function (err, namedata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('cuisine', { 'parent_id': namedata._id, 'status': { $ne: 0 } }, { name: 1 }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });
    };

    router.restaurantTimezones = function (req, res) {
        var timezone = require('moment-timezone');
        var moment = require("moment");
        var timeZones = timezone.tz.names();
        var offsetTmz = [];
        for (i in timeZones) {
            offsetTmz.push(timeZones[i] + ' ' + "(GMT" + moment.tz(timeZones[i]).format('Z') + ")");
        }
        res.send(offsetTmz);
    };


    /*     router.getDocField = function (req, res) {
            db.GetDocument('documents', { 'status': { $ne: 0 }, 'doc_for': 'restaurant' }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        } */


    router.currentRest = function (req, res) {
        db.GetAggregation('restaurant', [{
            $match: {
                '_id': req.body.currentUserData
            }
        }, {
            $project: {
                "name": 1,
                "address": 1,
                "activity": 1,
                "unique_code": 1,
                "refer_history": 1,
                "verification_code": 1,
                "status": 1,
                "tasker_status": 1,
                "privileges": 1,
                "billing_address": 1,
                "location": 1,
                "socialnetwork": 1,
                "facebook": 1,
                "twitter": 1,
                "geo": 1,
                "google": 1,
                "shipping_address": 1,
                "seller": 1,
                "birthdate": 1,
                "profile_details": 1,
                "taskerskills": 1,
                "vehicle": 1,
                "working_days": 1,
                "emergency_contact": 1,
                "banking": 1,
                "username": 1,
                "email": 1,
                "role": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "phone": 1,
                "working_area": 1,
                "_id": 1,
                "avatar": 1,
                "type": 1,
                "about": 1,
                "gender": 1
            }
        }], function (err, docdata) {
            if (err || !docdata[0]) {
                res.status(400).send(err);
            } else {
                if (!docdata[0].avatar) {
                    docdata[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                }
                res.send(docdata);
            }
        });
    };


    router.getDashdata = function (req, res) {
        //TOTAL ORDERS
        var query = { 'restaurant_id': req.body.id };
        //ACCEPTED ORDERS
        var acepted_query = { 'restaurant_id': req.body.id, status: { '$in': [3, 4, 5, 6, 7] } };
        //DENIED ORDERS
        var denied_query = { 'restaurant_id': req.body.id, status: { '$eq': 2 } };
        //TOTAL EARNINGS
        var earning_query = { 'restaurant_id': req.body.id, status: { '$eq': 7 } };
        var new_query = { 'restaurant_id': req.body.id, status: { '$eq': 1 } };
        var admincancel_query = { 'restaurant_id': req.body.id, status: { '$eq': 10 } };

        var usercancel_query = { 'restaurant_id': req.body.id, status: { '$eq': 9 } };



        db.GetDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, { restaurantname: 1, availability: 1, avatar: 1 }, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send(err);
            } else {
                db.GetCount('food', { shop: req.body.id, visibility: { $eq: 1 }, status: { $eq: 1 } }, function (err, foods) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        // res.send([docdata, foods]);
                        db.GetDocument('orders', earning_query, {}, {}, function (err, earnings) {
                            if (err) { res.send(err); }
                            else {
                                var total = 0;
                                var final = 0;
                                for (var i = 0; i < earnings.length; i++) {
                                    var amt = 0;
                                    if (earnings[i].billings.amount.restaurant_commission && earnings[i].billings.amount.restaurant_commission != undefined) {
                                        amt = earnings[i].billings.amount.restaurant_commission;
                                    }
                                    total += amt;
                                    final = (total).toFixed(2);
                                }

                                var count = {}; var count = {};
                                async.parallel([
                                    //TOTAL ORDERS
                                    function (callback) {
                                        db.GetCount('orders', query, function (err, total_orders) {
                                            if (err) return callback(err);
                                            count.total_orders = total_orders;
                                            callback();
                                        });
                                    },
                                    //ACCEPTED ORDERS
                                    function (callback) {
                                        db.GetCount('orders', acepted_query, function (err, acpt_order) {
                                            if (err) return callback(err);
                                            count.acpt_order = acpt_order;
                                            callback();
                                        });
                                    },
                                    //NEW ORDER
                                    function (callback) {
                                        db.GetCount('orders', new_query, function (err, new_order) {
                                            if (err) return callback(err);
                                            count.new_order = new_order;
                                            callback();
                                        });
                                    },
                                    //ADMIN CANCEL
                                    function (callback) {
                                        db.GetCount('orders', admincancel_query, function (err, admin_order) {
                                            if (err) return callback(err);
                                            count.admin_order = admin_order;
                                            callback();
                                        });
                                    },
                                    //USER CANCEL
                                    function (callback) {
                                        db.GetCount('orders', usercancel_query, function (err, usercancel_order) {
                                            if (err) return callback(err);
                                            count.usercancel_order = usercancel_order;
                                            callback();
                                        });
                                    },
                                    //DENIED ORDERS
                                    function (callback) {
                                        db.GetCount('orders', denied_query, function (err, denied) {
                                            if (err) return callback(err);
                                            count.denied = denied;
                                            callback();
                                        });
                                    }
                                ], function (err) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        if (docdata && docdata.length > 0) {
                                            var data = {};
                                            data.restaurantname = docdata[0].restaurantname;
                                            data.avatar = CONFIG.SITE_RESTAURANT_BANNER_IMAGE;
                                            if (docdata[0].avatar) { data.avatar = docdata[0].avatar }
                                            data.availability = docdata[0].availability;
                                            data.total_menu = foods || 0;
                                            data.total_order = count.total_orders;
                                            data.acpt_order = count.acpt_order;
                                            data.denied = count.denied;
                                            data.earnings = final || 0;
                                            data.new_order = count.new_order;
                                            data.admin_order = count.admin_order;
                                            data.usercancel_order = count.usercancel_order;

                                            res.send(data)
                                        } else {
                                            var data = {};
                                            res.send(data)
                                        }

                                        //res.send([docdata, foods, count, final]);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }


    router.AboutBusiness = function (req, res) {
        var client_offset = req.body.offset;
        db.GetDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err || !docdata || (docdata && docdata.length == 0)) {
                res.send(err);
            } else {
                var avatar = CONFIG.SITE_RESTAURANT_BANNER_IMAGE;
                if (docdata[0].avatar) { docdata[0].avatar = docdata[0].avatar }
                else {
                    docdata[0].avatar = avatar;
                }
                db.GetDocument('orders', { restaurant_id: req.body.id }, { order_id: 1, billings: 1, status: 1 }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        /* var server_offset = (new Date).getTimezoneOffset();
						var diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);
                        if (typeof docdata != 'undefined' && docdata.length > 0) {
							if(typeof docdata[0].working_hours != 'undefined' && docdata[0].working_hours.length > 0){
								docdata[0].working_hours.forEach(function(element) {
									if(typeof element.slots != "undefined" && element.slots.length > 0){
										for(var i=0; i<element.slots.length; i++){
											element.slots[i].start_time = new Date(new Date(element.slots[i].start_time).getTime() + diff_offset);
											element.slots[i].end_time = new Date(new Date(element.slots[i].end_time).getTime() + diff_offset);
										}
									}
								})
							}
                        } */
                        var pipeline = [
                            { $match: { 'status': 7, 'restaurant_id': new mongoose.Types.ObjectId(req.body.id) } },
                            { $project: { 'status': 1, 'billings': 1 } },
                            { $group: { '_id': '$status', 'total_earnings': { $sum: '$billings.amount.restaurant_commission' } } }
                        ];
                        db.GetAggregation('orders', pipeline, function (err, bookings) {
                            if (err) {
                                res.send(err)
                            }
                            else {
                                res.send([docdata, data, bookings])
                            }
                        });
                    }
                });
            }
        });
    }


    router.GetFoods = function (req, res) {
        db.GetOneDocument('categories', { '_id': req.body.id.categories }, {}, {}, function (err, categoriesdata) {
            if (categoriesdata.name == 'Recommended') {
                db.GetDocument('food', { $or: [{ 'shop': req.body.id.shop, 'categories.category': req.body.id.categories, 'status': { $eq: 1 } }, { 'shop': req.body.id.shop, 'recommended': 1, 'status': { $eq: 1 } }] }, {}, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata)
                    }
                });
            } else {
                db.GetDocument('food', { 'shop': req.body.id.shop, 'categories.category': req.body.id.categories, 'status': { $eq: 1 } }, {}, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata)
                    }
                });
            }
        });
    }

    router.foodVisibility = function (req, res) {
        db.GetOneDocument('food', { '_id': req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, parentdocdata) {
            if (err) {
                res.send(err);
            } else {
                var visibile = 1;
                if (parentdocdata.visibility == 1) { visibile = 0; }
                db.UpdateDocument('food', { '_id': req.body.id, 'status': { $ne: 0 } }, { 'visibility': visibile }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata)
                    }
                });
            }
        });
    }


    router.addonsVisibility = function (req, res) {
        db.GetOneDocument('food', { 'shop': req.body.id.shop, 'addons._id': req.body.id.id, 'status': { $ne: 0 } }, { addons: 1 }, {}, function (err, parentdocdata) {
            if (err) {
                res.send(err);
            } else {
                var visibile = 1;
                if (parentdocdata.addons) {
                    for (var i = 0; i < parentdocdata.addons.length; i++) {
                        if (parentdocdata.addons[i]._id == req.body.id.id) {
                            if (parentdocdata.addons[i].visibility == 1) { visibile = 0; }
                        }
                    }
                }
                // if (parentdocdata.visibility == 1) { visibile = 0; }
                db.UpdateDocument('food', { '_id': parentdocdata._id, 'addons._id': req.body.id.id }, { "addons.$.visibility": visibile }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata)
                    }
                });
            }
        });
    }

    router.basepackVisibility = function (req, res) {
        var condition = { 'shop': req.body.id.shop, "base_pack": { "$elemMatch": { '_id': req.body.id.mainid, "sub_pack": { "$elemMatch": { "_id": req.body.id.id } } } } };
        db.GetOneDocument('food', condition, { base_pack: 1 }, {}, function (err, parentdocdata) {
            if (err) {
                res.send(err);
            } else {
                var visibile = 0;
                if (parentdocdata.base_pack.length > 0) {
                    var base_pack_index = parentdocdata.base_pack.map(function (e) { return e._id.toString(); }).indexOf(req.body.id.mainid.toString());
                    if (base_pack_index != -1) {
                        var sub_pack_index = parentdocdata.base_pack[base_pack_index].sub_pack.map(function (e) { return e._id.toString(); }).indexOf(req.body.id.id.toString());
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
                                        res.send(err);
                                    } else {
                                        res.send(docdata)
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    router.getDash_filterdata = function (req, res) {
        var data = {};
        data.from = req.body.from_date;
        data.to = req.body.to_date;
        /*  if (req.body.from_date) {
             var from_date = moment(new Date(req.body.from_date)).format('MM/DD/YYYY') + ' 00:00:00';
             var from_time = new Date(from_date).getTime();
             data.from_time = from_time;
         }
         if (req.body.to_date) {
             var to_date = moment(new Date(req.body.to_date)).format('MM/DD/YYYY') + ' 23:59:59';
             var to_time = new Date(to_date).getTime();
             data.to_time = to_time;
         } */

        if (req.body.start_time && req.body.start_time != '') {
            data.from_time = req.body.start_time;
        }
        if (req.body.end_time && req.body.end_time != '') {
            data.to_time = req.body.end_time;
        }
        /* if (req.body.days) {
            var today = new Date();
            var yesterday = new Date(today.setDate(today.getDate() - req.body.days))
            var sdate = moment(yesterday).format('YYYY/MM/DD');
            var from_days = sdate + ' 00:00:00';
        } */
        var from_days;
        if (req.body.start_time_from_days && req.body.start_time_from_days != '') {
            data.from_days = req.body.start_time_from_days;
            var from_days = req.body.start_time_from_days;
        }

        //TOTAL ORDERS
        var query = { 'restaurant_id': req.body.id };
        if (req.body.from_date && req.body.to_date && !from_days) {
            query = { 'restaurant_id': req.body.id, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            query = {
                'restaurant_id': req.body.id, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }
        //ACCEPTED ORDERS
        var acepted_query = { 'restaurant_id': req.body.id, status: { '$in': [3, 4, 5, 6, 7] } };
        if (req.body.from_date && req.body.to_date && !from_days) {
            acepted_query = { 'restaurant_id': req.body.id, status: { '$in': [3, 4, 5, 6, 7] }, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            acepted_query = {
                'restaurant_id': req.body.id, status: { '$in': [3, 4, 5, 6, 7, 8, 9, 10] }, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }

        //NEW ORDERS
        var new_query = { 'restaurant_id': req.body.id, status: { '$eq': 1 } };
        if (req.body.from_date && req.body.to_date && !from_days) {
            new_query = { 'restaurant_id': req.body.id, status: { '$eq': 1 }, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            new_query = {
                'restaurant_id': req.body.id, status: { '$eq': 1 }, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }

        //ADMIN CANCEL ORDERS
        var admincancel_query = { 'restaurant_id': req.body.id, status: { '$eq': 10 } };
        if (req.body.from_date && req.body.to_date && !from_days) {
            admincancel_query = { 'restaurant_id': req.body.id, status: { '$eq': 10 }, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            admincancel_query = {
                'restaurant_id': req.body.id, status: { '$eq': 10 }, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }

        //USER CANCEL ORDERS
        var usercancel_query = { 'restaurant_id': req.body.id, status: { '$eq': 9 } };
        if (req.body.from_date && req.body.to_date && !from_days) {
            usercancel_query = { 'restaurant_id': req.body.id, status: { '$eq': 9 }, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            usercancel_query = {
                'restaurant_id': req.body.id, status: { '$eq': 9 }, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }

        //DENIED ORDERS
        var denied_query = { 'restaurant_id': req.body.id, status: { '$eq': 2 } };
        if (req.body.from_date && req.body.to_date && !from_days) {
            denied_query = { 'restaurant_id': req.body.id, status: { '$eq': 2 }, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            denied_query = {
                'restaurant_id': req.body.id, status: { '$eq': 2 }, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }

        //TOTAL EARNINGS
        var earning_query = { 'restaurant_id': req.body.id, status: { '$eq': 7 } };
        if (req.body.from_date && req.body.to_date && !from_days) {
            earning_query = { 'restaurant_id': req.body.id, status: { '$eq': 7 }, "created_time": { '$gte': data.from_time, '$lte': data.to_time } };
        }
        else if (!req.body.from_date && !req.body.to_date && from_days) {
            earning_query = {
                'restaurant_id': req.body.id, status: { '$eq': 7 }, "order_history.order_time": { '$gte': new Date(from_days), '$lte': new Date() },
            };
        }
        db.GetDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, { restaurantname: 1, availability: 1, avatar: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetCount('food', { shop: req.body.id, status: { $eq: 1 }, visibility: { $eq: 1 } }, function (err, foods) {
                    if (err) {
                        res.send(err);
                    }
                    else {
                        // res.send([docdata, foods]);
                        db.GetDocument('orders', earning_query, {}, {}, function (err, earnings) {
                            if (err) { res.send(err); }
                            else {
                                var total = 0;
                                var final = 0;
                                for (var i = 0; i < earnings.length; i++) {
                                    if (typeof earnings[i].billings.amount.restaurant_commission != 'undefined' && !isNaN(earnings[i].billings.amount.restaurant_commission)) {
                                        total += (earnings[i].billings.amount.restaurant_commission);
                                        final = (total).toFixed(2);
                                    }
                                }

                                var count = {}; var count = {};
                                async.parallel([
                                    //TOTAL ORDERS
                                    function (callback) {
                                        db.GetCount('orders', query, function (err, total_orders) {
                                            if (err) return callback(err);
                                            count.total_orders = total_orders;
                                            callback();
                                        });
                                    },
                                    //ACCEPTED ORDERS
                                    function (callback) {
                                        db.GetCount('orders', acepted_query, function (err, acpt_order) {
                                            if (err) return callback(err);
                                            count.acpt_order = acpt_order;
                                            callback();
                                        });
                                    },
                                    //NEW ORDER
                                    function (callback) {
                                        db.GetCount('orders', new_query, function (err, new_order) {
                                            if (err) return callback(err);
                                            count.new_order = new_order;
                                            callback();
                                        });
                                    },
                                    //ADMIN CANCEL
                                    function (callback) {
                                        db.GetCount('orders', admincancel_query, function (err, admin_order) {
                                            if (err) return callback(err);
                                            count.admin_order = admin_order;
                                            callback();
                                        });
                                    },
                                    //USER CANCEL
                                    function (callback) {
                                        db.GetCount('orders', usercancel_query, function (err, usercancel_order) {
                                            if (err) return callback(err);
                                            count.usercancel_order = usercancel_order;
                                            callback();
                                        });
                                    },
                                    //DENIED ORDERS
                                    function (callback) {
                                        db.GetCount('orders', denied_query, function (err, denied) {
                                            if (err) return callback(err);
                                            count.denied = denied;
                                            callback();
                                        });
                                    }
                                ], function (err) {
                                    if (err) return next(err);
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var datas = {};
                                        datas.restaurantname = docdata[0].restaurantname;
                                        datas.avatar = CONFIG.SITE_RESTAURANT_BANNER_IMAGE;
                                        if (docdata[0].avatar) { datas.avatar = docdata[0].avatar }
                                        datas.availability = docdata[0].availability;
                                        datas.total_menu = foods || 0;
                                        datas.total_order = count.total_orders;
                                        datas.acpt_order = count.acpt_order;
                                        datas.new_order = count.new_order;
                                        datas.admin_order = count.admin_order;
                                        datas.usercancel_order = count.usercancel_order;
                                        datas.denied = count.denied;
                                        datas.earnings = (total).toFixed(2) || 0;
                                        res.send(datas)
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    router.avilabilityEdit = function (req, res) {
        db.UpdateDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, { 'availability': req.body.value }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (req.body.value == 0 || req.body.value == 1) {
                    io.of('/chat').emit('r2e_rest_online_change_by_rest', { rest_id: req.body.id, value: req.body.value });
                    // io.of('/chat').in(request.id).emit('r2e_rest_online_change', { rest_id: request.id, value: request.value });
                }
                res.send(docdata);
            }
        });
    }


    router.updateBinfo = function (req, res) {

        var data = {};
        data.time_setting = {};
        data.time_setting.week_days = {};
        data.time_setting.week_end = {};
        data.location = {};
        data.phone = {};
        data.offer = {};
        data.package_charge = {};

        data.restaurantname = req.body.value.restaurantname;
        data.username = req.body.value.username;
        data.efp_time = req.body.value.efp_time;
        data.email = req.body.value.email;
        data.working_hours = req.body.value.working_hours;
        data.rcategory = req.body.value.rcategory;
        data.fssaino = req.body.value.fssaino;

        if (req.body.parent_rests) { data.parent_rests = req.body.parent_rests; }
        if (req.body.value.main_cuisine) {
            var arr = []
            for (var i = 0; i < req.body.value.main_cuisine.length; i++) {
                arr.push({ 'name': req.body.value.main_cuisine[i].name, '_id': req.body.value.main_cuisine[i]._id })
            }
            data.main_cuisine = arr;
        }
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            data.phone.code = req.body.value.phone.code;
            data.phone.number = req.body.value.phone.number;
            var client_offset = -(new Date().getTimezoneOffset());
            if (req.body.value.offer) {
                if (req.body.value.offer.offer_type) {
                    data.offer.offer_type = req.body.value.offer.offer_type;
                    data.offer.offer_status = req.body.value.offer.offer_status;
                    data.offer.offer_amount = req.body.value.offer.offer_amount;
                    data.offer.target_amount = req.body.value.offer.target_amount;
                    data.offer.max_off = req.body.value.offer.max_off;
                }
            }

            if (req.body.value.package_charge) {
                data.package_charge.package_status = req.body.value.package_charge.package_status;
                data.package_charge.package_amount = req.body.value.package_charge.package_amount;
            }
			data.unique_tax = {};
			data.com_taxtype = req.body.value.com_taxtype;
			if (req.body.value.unique_tax) {
				data.unique_tax.rest_tax = req.body.value.unique_tax.rest_tax;
			}

            // Restaurant Profile pic

            if (req.files) {
                for (var i = 0; i < req.files.length; i++) {
                    if (req.files[i].fieldname == 'value[avatar]') {
                        data.avatar = req.files[i].destination + req.files[i].filename;
                    }
                    if (req.files[i].fieldname == 'value[food_img]') {
                        data.food_img = req.files[i].destination + req.files[i].filename;
                    }
                    if (req.files[i].fieldname == 'value[avatarfood][0]') {
                        data.food_img_name = req.files[i].originalname;
                    }
                    if (req.files[i].fieldname == 'value[logo]') {
                        data.logo = req.files[i].destination + req.files[i].filename;
                    }
                }
            }

            //Restaurant documents starts

            var restaurant_documents = [];
            var expiry_details = req.body.value.images;
            if (typeof expiry_details != 'undefined' && expiry_details.length > 0) {
                for (var ex = 0; ex < expiry_details.length; ex++) {
                    var doc_name = expiry_details[ex].doc_name;
                    var expiry_date = expiry_details[ex].expiry_date;
                    var img_name = expiry_details[ex].image;
                    var img_name_org = expiry_details[ex].image_name || '';
                    if (req.files) {
                        for (var f = 0; f < req.files.length; f++) {
                            if (req.files[f].fieldname == 'value[newimage][' + expiry_details[ex]._id + ']') {
                                img_name = req.files[f].destination + req.files[f].filename;
                                img_name_org = req.files[f].originalname;
                                break;
                            }
                        }
                    }
                    restaurant_documents.push({ "image_name": img_name_org || '', "doc_name": doc_name || '', "image": img_name || '', "expiry_date": expiry_date || '' });
                }
            }

            data.restaurant_documents = restaurant_documents;
            var city_doc = '';
            db.GetOneDocument('city', { 'cityname': req.body.value.main_city }, {}, {}, function (err, docdata) {
                db.GetOneDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, rest_location) {
                    if (typeof docdata != 'undefined' && typeof docdata.area_management != 'undefined') {
                        for (var i = 0; i < docdata.area_management.length; i++) {
                            if (docdata.area_management[i].area_name == req.body.value.sub_city) {
                                city_doc = docdata.area_management[i];
                            }
                        }

                        //data.location = {};
                        data.location.lng = rest_location.location.lng;
                        data.location.lat = rest_location.location.lat;
                        var area_array = [[data.location.lng, data.location.lat]]

                        if (req.body.value.address.lng && req.body.value.address.lat) {
                            data.location.lng = req.body.value.address.lng;
                            data.location.lat = req.body.value.address.lat;
                            area_array = [[data.location.lng, data.location.lat]]
                            data.address = {};
                            data.address = req.body.value.address;
                        }

                        var childCoordinates = area_array;
                        var inside = true;
                        if (typeof city_doc.area_poly != 'undefined' && typeof city_doc.area_poly.coordinates != 'undefined') {
                            var parentCoordinates = city_doc.area_poly.coordinates[0];
                            var parentPolygon = turf.polygon([parentCoordinates]);
                            childCoordinates.forEach(function (coordinates) {
                                point = turf.point(coordinates);
                                if (!turf.inside(point, parentPolygon)) {
                                    inside = false;
                                }
                            });
                        } else {
                            inside = false;
                        }

                        data.main_city = req.body.value.main_city;
                        data.sub_city = req.body.value.sub_city;
                        if (inside == true) {
                            data.tax = 0;
                            if (req.body.value.tax && req.body.value.tax != null && req.body.value.tax != undefined) {
                                data.tax = req.body.value.tax;
                            }
                            db.GetOneDocument('tax', { 'country.name': data.address.country }, {}, {}, function (err, taxrespo) {
                                if (err) { res.send(err); }
                                else {
                                    if (taxrespo) {
                                        tax = taxrespo.amount || '';
                                        data.tax_id = taxrespo._id;
                                        if (taxrespo.tax_type == 'state') {
                                            db.GetOneDocument('tax', { 'country.name': data.address.country, state_name: data.address.state }, {}, {}, function (err, taxres) {
                                                if (err) { res.send(err); }
                                                else {
                                                    if (taxres) {
                                                        tax = taxres.amount || '';
                                                        data.tax_id = taxres._id;
                                                    }
                                                    data.tax = tax;
                                                    db.UpdateDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, data, {}, function (err, docdata) {
                                                        if (err) {
                                                            res.send(err);
                                                        } else {
                                                            res.send(docdata);
                                                        }
                                                    });
                                                }
                                            })
                                        } else {
                                            data.tax = tax;
                                            db.UpdateDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, data, {}, function (err, docdata) {
                                                if (err) {
                                                    res.send(err);
                                                } else {
                                                    res.send(docdata);
                                                }
                                            });
                                        }
                                    }
                                }
                            })
                        }
                        else {
                            res.status(400).send({ message: "Your Restaurant Location being out of " + city_doc.area_name });
                        }
                    }
                    else {
                        res.status(400).send({ message: "No areas found in" + docdata.cityname });
                    }
                });
            });
        })
    }
    router.getDocField = function (req, res) {
        if (req.body.id) {
            db.GetDocument('restaurant', { _id: req.body.id }, { password: 0 }, {}, function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    db.GetDocument('documents', { doc_for: 'restaurant', status: { $eq: 1 } }, { status: 0, createdAt: 0, updatedAt: 0 }, {}, function (docerr, docdata) {
                        if (docerr) {
                            res.send(docerr);
                        }
                        else {
                            // console.log('docdata',docdata)
                            if (!data[0].avatar) {
                                data[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            var driver_array = data[0].restaurant_documents;
                            var doc_array = docdata;
                            var arr = driver_array.concat(doc_array);

                            var results = [];
                            docdata.forEach(elem => {
                                var index_pos = driver_array.map(function (e) { return e.doc_name }).indexOf(elem.doc_name)
                                if (index_pos != -1) {
                                    driver_array[index_pos].has_require = elem.has_require;
                                    driver_array[index_pos].has_expire = elem.has_expire;
                                    results.push(driver_array[index_pos])
                                } else {
                                    // console.log(elem)
                                    results.push(elem)
                                }
                            })
                            res.send(results);
                        }
                    });
                }
            });
        }
        else {
            db.GetDocument('documents', { 'status': { $ne: 0 }, 'doc_for': 'restaurant' }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    }

    router.getEarnings = function (req, res) {
        db.GetDocument('orders', { restaurant_id: req.body.id }, { order_id: 1, billings: 1, status: 1 }, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                var pipeline = [
                    { $match: { 'status': 8, 'restaurant_id': new mongoose.Types.ObjectId(req.body.id) } },
                    { $project: { 'status': 1, 'billings': 1 } },
                    { $group: { '_id': '$status', 'total_earnings': { $sum: '$billings.amount.restaurant_commission' } } }
                ];
                db.GetAggregation('orders', pipeline, function (err, bookings) {
                    if (err) {
                        res.send(err)
                    }
                    else {
                        res.send([data, bookings])
                    }
                });
            }
        });
    };


    router.saveBankinfo = function (req, res) {
        var data = {};
        data.banking_details = {};
        data.banking_details.holder_name = req.body.value.holder_name;
        data.banking_details.acc_number = req.body.value.acc_number;
        data.banking_details.bank_name = req.body.value.bank_name;
        data.banking_details.routing_number = req.body.value.routing_number;
        data.banking_details.swift_code = req.body.value.swift_code;
        db.UpdateDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, data, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.getCategories = function (req, res) {
        db.GetDocument('categories', { 'restaurant': req.body.id, 'name': { $ne: 'Recommended' }, 'status': { $ne: 0 }, 'mainparent': 'yes' }, { name: 1, status: 1 }, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('categories', { 'restaurant': req.body.id, 'status': { $ne: 0 }, 'mainparent': 'no' }, { name: 1, status: 1, parent: 1 }, {}, function (err, childdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send([data, childdata])
                    }
                });
            }
        });
    };

    router.FoodAddCategories = function (req, res) {
        var categoryQuery = [{ "$match": { status: { $eq: 1 }, 'restaurant': new mongoose.Types.ObjectId(req.body.id) } }];
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
            if (docdata.length > 0) {
                if (err) {
                    res.send(err);
                }
                else {
                    res.send([docdata]);
                }
            }
            else {
                res.send([0]);
            }
        });
    }


    router.GetMenus = function (req, res) {
        var categoryQuery = [{ "$match": { status: { $ne: 0 }, 'restaurant': new mongoose.Types.ObjectId(req.body.id) } }];
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
            if (docdata.length > 0) {
                if (err) {
                    res.send(err);
                }
                else {
                    res.send([docdata]);
                }
            }
            else {
                res.send([0]);
            }
        });
    }

    router.saveMainCategories = function (req, res) {
        var data = {};
        data.restaurant = req.body.id;
        data.name = req.body.value.cname;
        data.status = 1;
        data.mainparent = 'yes';
        if (data.name == 'Recommended') {
            res.status(400).send({ message: "Category already added" });
        } else {
            db.InsertDocument('categories', data, function (err, response) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(response)
                }
            });

        }
    };

    router.saveSubCategories = function (req, res) {
        var data = {};
        data.restaurant = req.body.id;
        data.name = req.body.value.subcatname;
        data.parent = req.body.value.subparent;
        if (!req.body.value.subparent || req.body.value.subparent.length == 4) {
            data.parent = req.body.value.parent;
        }
        data.status = 1;
        data.mainparent = 'no';
        db.GetOneDocument('food', { 'categories.category': data.parent }, {}, {}, function (err, fooddata) {
            if (fooddata) { res.status(400).send({ message: "Sorry this parent category already has food.!" }); }
            else {
                db.InsertDocument('categories', data, function (err, response) {
                    db.UpdateDocument('categories', { '_id': data.parent }, { 'has_child': 'yes' }, {}, function (err, respo) { });
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(response)
                    }
                });
            }
        });
    };

    router.getSubCategories = function (req, res) {
        var regid = req.body.id;
        var matchQuery = {
            "status": { $eq: 1 }
        }
        var doc = [];
        if (!regid || regid == 'null') {
            res.send(doc);
        } else {
            matchQuery.parent = new mongoose.Types.ObjectId(regid)
            var subCategoryQuery = [{ "$match": matchQuery },
            { $project: { 'name': 1, 'parent': 1 } }];
            db.GetAggregation('categories', subCategoryQuery, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    }

    router.getInitialFoods = function (req, res) {
        var pipeline = [
            { $match: { 'status': { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.id) } },
            { "$project": { name: 1, price: 1, avatar: 1, addons: 1, base_pack: 1, visibility: 1, description: 1 } },
            { $sort: { "createdAt": -1 } },
            { $limit: 5 }
        ];
        db.GetAggregation('food', pipeline, function (err, docdata) {
            if (err) { res.send(err) }
            else { res.send(docdata) }
        });
    }


    /* router.saveFood = function (req, res) {
 
         var data = {};
         data.categories = {};
         data.categories.category = req.body.final_cat;
         data.name = req.body.name;
         data.addons = req.body.addons;
         data.base_pack = req.body.main_pack;
         var text = htmlToText.fromString(req.body.food_desc)
         data.description = text;
         data.status = 1;
         data.shop = req.body.shop;
         data.price = req.body.price;
         data.avatarBase64 = req.body.avatarBase64;
         if (req.body.offer) { data.offer = { status: req.body.offer.status || 0, amount: req.body.offer.amount } }
         if (req.body.food_time) { data.food_time = { status: req.body.food_time.status || 0, from_time: req.body.food_time.from_time, to_time: req.body.food_time.to_time } }
 
 
         var food_time_checking = 0;
         if (req.body.food_time) {
             data.food_time = {
                 status: req.body.food_time.status || 0,
                 from_time: req.body.food_time.from_time,
                 to_time: req.body.food_time.to_time
             }
 
             var stat = new Date();
             if (req.body.food_time.from_time) { stat = req.body.food_time.from_time }
             var end = new Date();
             if (req.body.food_time.to_time) { end = req.body.food_time.to_time }
 
             var startTime = moment(stat, "HH:mm a");
             startTime.toString();
             var endTime = moment(end, "HH:mm a");
             endTime.toString();
             if (startTime.isAfter(endTime) || startTime.isSame(endTime)) {
                 food_time_checking = 1;
             }
         }
 
         if (food_time_checking == 1) {
             res.status(400).send({ message: "Sorry Invalid Food time" });
         }
         else {
             if (data.avatarBase64) {
                 var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                 var fileName = Date.now().toString() + '.png';
                 var file = CONFIG.DIRECTORY_FOOD + fileName;
                 library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
                 data.avatar = file;
         
             }
             db.GetDocument('categories', { 'parent': data.categories.category, status: { $eq: 1 } }, {}, {}, function (err, catdata) {
                 if (err) {
                     res.send(err);
                 } else {
                     if (catdata.length > 0) {
                         res.status(400).send({ message: "Sorry selected category has child..!" });
                     }
                     else {
                        
                         db.GetCount('food', { shop: data.shop }, function (err, foodcount) {
                             db.InsertDocument('food', data, function (err, result) {
                                 if (err) {
                                     res.send(err);
                                 } else {
                                     db.UpdateDocument('restaurant', { _id: data.shop }, { food_count: foodcount || 1 }, {}, function (err, docdata) {
                                         if (err) {
                                             res.send(err);
                                         } else {
                                             res.send(docdata);
                                         }
                                     });
                                 }
                             });
                         });
                     }
                 }
             });
         }
     };*/
    router.updateLogo = function (req, res) {
        var logo = req.files[0].destination + req.files[0].filename;
        db.UpdateDocument('restaurant', { _id: req.body.id }, { logo: logo }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetOneDocument('restaurant', { '_id': req.body.id }, { logo: 1 }, {}, function (err, catdata) {
                    res.send(catdata);
                });
            }
        });
    }
    router.saveFood = function (req, res) {
        var data = {};
        data.categories = {};
        data.categories.category = req.body.final_cat;
        data.name = req.body.name;
        data.addons = req.body.addons;
        data.base_pack = req.body.main_pack;
        var text = htmlToText.fromString(req.body.food_desc)
        data.description = text;
        data.status = 1;
        data.itmcat = req.body.itmcat;
        data.shop = req.body.shop;
        data.price = req.body.price;
        data.avatarBase64 = req.body.avatarBase64;
        if (req.body.offer) { data.offer = { status: req.body.offer.status || 0, amount: req.body.offer.amount } }
        if (req.body.food_time) { data.food_time = { status: req.body.food_time.status || 0, from_time: req.body.food_time.from_time, to_time: req.body.food_time.to_time } }

        var food_time_checking = 0;
        if (req.body.food_time) {
            data.food_time = {
                status: req.body.food_time.status || 0,
                from_time: req.body.food_time.from_time,
                to_time: req.body.food_time.to_time
            }

            /* var start = new Date();
            var end = new Date();
            if (req.body.food_time.from_time && req.body.food_time.from_time != undefined) {
                start = req.body.food_time.from_time;
            };
            if (req.body.food_time.to_time && req.body.food_time.to_time != undefined) {
                end = req.body.food_time.to_time;
            }; */


            var start_time = new Date(req.body.food_time.from_time);
            var end_time = new Date(req.body.food_time.to_time);

            var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
            var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
            if (req.body.food_time.from_time > req.body.food_time.to_time || req.body.food_time.from_time == req.body.food_time.to_time) {
                food_time_checking = 1;
            }
        }

        if (food_time_checking == 1) {
            res.status(400).send({ message: "Sorry Invalid Food time" });
        }
        else {

            if (data.avatarBase64) {
                var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                var fileName = Date.now().toString() + '.png';
                var file = CONFIG.DIRECTORY_FOOD + fileName;
                library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
                data.avatar = file;

            }

            db.GetOneDocument('categories', { 'restaurant': data.shop, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
                var id = '';
                if (catdata) {
                    if (catdata._id) {
                        id = catdata._id;
                    }
                }
                db.GetOneDocument('categories', { '_id': data.categories.category, status: { $eq: 1 } }, {}, {}, function (err, catdata) {
                    if (err || !catdata) {
                        res.status(400).send({ message: "Cannot add food item to this category..!" });
                    }
                    else {
                        db.GetCount('food', { status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(data.shop), recommended: 1 }, function (err, allValue) {
                            var test_count = allValue || 0;
                            db.GetCount('food', { status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(data.shop), 'categories': { $elemMatch: { 'category': id } } }, function (err, allValues) {
                                var counts = parseInt(allValues) + parseInt(test_count);
                                if (id == req.body.final_cat) {
                                    if (counts < 6 && counts != 6) {
                                        db.GetDocument('categories', { 'parent': data.categories.category, status: { $eq: 1 } }, {}, {}, function (err, catdata) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                if (catdata.length > 0) {
                                                    res.status(400).send({ message: "Sorry selected category has child..!" });
                                                }
                                                else {

                                                    db.GetCount('food', { shop: data.shop }, function (err, foodcount) {
                                                        db.InsertDocument('food', data, function (err, result) {
                                                            if (err) {
                                                                res.send(err);
                                                            } else {
                                                                db.UpdateDocument('restaurant', { _id: data.shop }, { food_count: foodcount || 1 }, {}, function (err, docdata) {
                                                                    if (err) {
                                                                        res.send(err);
                                                                    } else {
                                                                        res.send(docdata);
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    });
                                                }
                                            }
                                        });
                                    }
                                    else {
                                        res.status(400).send({ message: "We can add only six food in recommended list" });
                                    }
                                } else {
                                    db.GetDocument('categories', { 'parent': data.categories.category, status: { $eq: 1 } }, {}, {}, function (err, catdata) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            if (catdata.length > 0) {
                                                res.status(400).send({ message: "Sorry selected category has child..!" });
                                            }
                                            else {
                                                db.GetCount('food', { shop: data.shop }, function (err, foodcount) {
                                                    db.InsertDocument('food', data, function (err, result) {
                                                        if (err) {
                                                            res.send(err);
                                                        } else {
                                                            db.UpdateDocument('restaurant', { _id: data.shop }, { food_count: foodcount || 1 }, {}, function (err, docdata) {
                                                                if (err) {
                                                                    res.send(err);
                                                                } else {
                                                                    res.send(docdata);
                                                                }
                                                            });
                                                        }
                                                    });
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            });
        }
    };

    router.mostSaledFood = function (req, res) {
        var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id), status: { $eq: 7 } };
        //var query = { 'restaurant_id': new mongoose.Types.ObjectId(req.body.id) };
        db.GetAggregation('orders', [
            { $match: query },
            { $unwind: "$foods" },
            { $project: { _id: 1, foods: 1, } },
            { "$group": { "_id": "$_id", "foods": { "$addToSet": "$foods.id" }, } }
        ], function (err, order_histry) {
            if (err) { res.send(err) }
            else {
                var test = [];
                for (var i = 0; i < order_histry.length; i++) {
                    var test = test.concat(order_histry[i].foods);
                }

                //To find no of time the same food get orderd
                var arr = test;
                var obj = {};
                for (var i = 0, j = arr.length; i < j; i++) {
                    obj[arr[i]] = (obj[arr[i]] || 0) + 1;
                }


                //sorting the order based on no of time get orderd(acending)
                var myList = Object.keys(obj).map(function (key) {
                    return { label: key, value: obj[key] }
                });

                myList.sort(function (a, b) {
                    return b.value - a.value
                })

                // To get food  details 
                each(myList, function (item, next) {
                    db.GetOneDocument('food', { '_id': item.label }, { name: 1, price: 1 }, {}, function (err, docdata) {
                        if (err) {
                            callback(err);
                        } else {
                            var result = {
                                food_doc: docdata, no_of_order: item.value
                            }
                            next(err, result);
                        }
                    });
                }, function (err, transformedItems) {
                    if (err) { res.send(err) }
                    else {
                        if (!transformedItems || transformedItems.length == 0) {
                            res.send();
                        }
                        else {
                            var doc_to_send = [];
                            for (var i = 0; i < transformedItems.length; i++) { // no of items to be send to client side
                                var name = '';
                                var price = 0.0;
                                var no_of_order = 0;
                                var earnings = 0.0;
                                if (typeof transformedItems[i].food_doc != 'undefined' && transformedItems[i].food_doc != 'null' && transformedItems[i].food_doc != null) {
                                    if (typeof transformedItems[i].food_doc.name != 'undefined') {
                                        name = transformedItems[i].food_doc.name;
                                    }
                                    if (typeof transformedItems[i].food_doc.price != 'undefined') {
                                        price = transformedItems[i].food_doc.price
                                    }
                                    if (typeof transformedItems[i].no_of_order != 'undefined') {
                                        no_of_order = transformedItems[i].no_of_order
                                    }
                                    doc_to_send.push({
                                        name: name, price: price, no_orders: no_of_order,
                                        earnings: ((price * no_of_order)).toFixed(2)
                                    })
                                }
                            }
                            res.send(doc_to_send)
                        }
                    }
                });
            }
        });
    }

    router.saveRecomendFoods = function (req, res) {
        var test = [];
        for (i in req.body.foods) {
            if (req.body.foods[i].name != false) {
                test.push(req.body.foods[i].name)
            }
        }
        if (test.length > 0 && test) {
            db.GetDocument('food', { _id: { $in: test } }, { categories: 1 }, {}, function (err, catdetails) {
                var cat_id = [];
                for (i in catdetails) {
                    cat_id.push(catdetails[i].categories[0].category)
                }
                db.GetDocument('categories', { _id: { $in: cat_id }, status: { $ne: 1 } }, {}, {}, function (err, catresult) {
                    if (catresult && catresult.length > 0) {
                        res.status(400).send({ message: "Your selected category is not valid" });
                    }
                    else {
                        db.GetOneDocument('categories', { 'restaurant': req.body.shop, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
                            var catid = '';
                            if (catdata && !err) {
                                catid = catdata._id;
                            }
                            db.GetCount('food', { status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.shop), recommended: 1 }, function (err, allValue) {
                                var test_count = allValue;
                                db.GetCount('food', { status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.shop), 'categories': { $elemMatch: { 'category': catid } } }, function (err, allValues) {
                                    var allva = 0;
                                    if (allValues != undefined && allValues && allValues != 'undefined') {
                                        allva = allValues;
                                    }
                                    var counts = parseInt(allva) + parseInt(test_count) + parseInt(test.length);
                                    if (counts <= 6) {
                                        db.UpdateDocument('food', { _id: { $in: test } }, { recommended: 1 }, { multi: true }, function (err, docdata) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                res.send(docdata)
                                            }
                                        });
                                    } else {
                                        res.status(400).send({ message: "We can add only six food in recommended list" });
                                    }
                                });
                            });
                        });
                    }
                });
            });
        }
        else {
            res.status(400).send({ message: "Please Select Food" });
        }
    }

    router.removeRecomendFoods = function (req, res) {
        db.GetOneDocument('food', { '_id': req.body.food_id }, {}, {}, function (err, catdatas) {
            db.GetOneDocument('categories', { '_id': catdatas.categories[0].category }, {}, {}, function (err, catdata) {
                if (catdata.name == 'Recommended') {
                    db.UpdateDocument('food', { _id: req.body.food_id }, { status: 0 }, {}, function (err, docdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata)
                        }
                    });
                }
                else {
                    db.UpdateDocument('food', { _id: req.body.food_id }, { recommended: 0 }, {}, function (err, docdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata)
                        }
                    });
                }
            });
        });
    }


    router.getrecomendFoods = function (req, res) {
        db.GetOneDocument('categories', { 'restaurant': req.body.id, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
            var cat_id = '';
            if (!err && catdata) {
                cat_id = catdata._id;
            }

            var matc_query = {
                $or: [{ status: { $eq: 1 }, 'categories': { $elemMatch: { 'category': cat_id } }, 'shop': new mongoose.Types.ObjectId(req.body.id) }, { status: { $eq: 1 }, recommended: 1, 'shop': new mongoose.Types.ObjectId(req.body.id) }]
            }

            var pipeline = [
                { $match: matc_query },
                { "$project": { name: 1, price: 1, avatar: 1, visibility: 1, description: 1 } },
                { $sort: { "createdAt": -1 } },
                { $limit: 6 }
            ];
            db.GetAggregation('food', pipeline, function (err, docdata) {
                if (err) { res.send(err) }
                else { res.send(docdata) }
            });
        });
    }

    router.getpopupFoods = function (req, res) {
        db.GetOneDocument('categories', { 'restaurant': req.body.id, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
            var cat_id = '';
            if (!err && catdata) {
                cat_id = catdata._id;
            }
            var matc_query = {
                status: { $eq: 1 }, 'categories': { $not: { $elemMatch: { 'category': cat_id } } }, 'shop': new mongoose.Types.ObjectId(req.body.id), recommended: { $ne: 1 }
                /* $or: [{ status: { $eq: 1 }, 'categories': { $not: { $elemMatch: { 'category': cat_id } } }, 'shop': new mongoose.Types.ObjectId(req.body.id) }, { 'categories': { $not: { $elemMatch: { 'category': cat_id } } }, status: { $eq: 1 }, recommended: { $ne: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.id) }]*/
            }
            var filter_query = {
                'categoriesdata.status': { $eq: 1 }
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
                        "food_details": { "$push": { food_name: "$name", food_id: "$_id" } },
                        "cat_name": { "$first": "$categoriesdata.name" },
                    }
                },

                { $sort: { "createdAt": -1 } }
            ];
            db.GetAggregation('food', pipeline, function (err, docdata) {
                if (err) { res.send(err) }
                else { res.send(docdata) }
            });
        });
    }

    router.restsendForgotEmail = (req, res) => {
        db.GetOneDocument('restaurant', { 'email': req.body.email, status: { $in: [1, 3] } }, {}, {}, (err, ress) => {
            if (err || !ress) { res.send({ status: 0, response: err }); }
            else {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
                    if (err) { res.send({ status: 0, response: err }); }
                    else {

                        var url = settings.settings.site_url + 'restforgotReturn/' + ress._id;
                        // url = '<a style="display: inline-block; background-color: #e15500; color: #fff !important; padding: 10px; text-decoration: none; font-size: 12px; text-transform: uppercase;" href=' + settings.settings.site_url + 'restforgotReturn/' + ress._id + '>Click to reset the password</a>';
                        var mailData = {};
                        mailData.template = 'forgot_password_restaurant';
                        mailData.to = req.body.email;
                        mailData.html = [];
                        mailData.html.push({ name: 'name', value: ress.restaurantname || "" });
                        mailData.html.push({ name: 'link', value: url || "" });
                        mailcontent.sendmail(mailData, function (err, response) { });
                        res.send({ status: 1, response: settings });

                    }
                })
            }
        })
    }


    router.changeForgotEmail = (req, res) => {
        var request = {};
        request.id = req.body.id;
        request.password = bcrypt.hashSync(req.body.passcode, bcrypt.genSaltSync(8), null);
        db.GetOneDocument('restaurant', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, isDriver) => {
            if (isDriver) {
                db.UpdateDocument('restaurant', { '_id': new mongoose.Types.ObjectId(request.id) }, { 'password': request.password }, {}, (err, updated) => {
                    if (updated.nModified == 1) {
                        res.send({ status: 1, response: 'updated successfully' })
                    }
                    else {
                        res.send({ status: 0, response: 'Error in updating' })
                    }
                })
            }
            else {
                res.send({ status: 0, response: 'Error in updating' })
            }
        })
    }

    router.getCycles = (req, res) => {
        var restaurant_id;
        if (typeof req.body.restaurant_id != 'undefined' && req.body.restaurant_id != '') {
            if (isObjectId(req.body.restaurant_id)) {
                restaurant_id = new mongoose.Types.ObjectId(req.body.restaurant_id);
            } else {
                res.send({ status: 1, message: 'Unable to fetch data', response: [] });
                return;
            }
        } else {
            res.send({ status: 1, message: 'Unable to fetch data', response: [] });
            return;
        }
        db.GetOneDocument('restaurant', restaurant_id, {}, {}, function (err, restaurantDetails) {
            if (err || !restaurantDetails || typeof restaurantDetails._id == 'undefined') {
                res.send({ status: 1, message: 'Unable to fetch data', response: [] });
            } else {
                var startTime = new Date(restaurantDetails.createdAt).getTime();
                db.GetDocument('billing', { start_time: { $gte: startTime } }, {}, {}, (err, ress) => {
                    db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                        var result = [];
                        for (i in ress) {
                            var from_date = timezone.tz(ress[i].start_date, settings.settings.time_zone).format(settings.settings.date_format);
                            var to_date = timezone.tz(ress[i].end_date, settings.settings.time_zone).format(settings.settings.date_format);
                            result.push({ billingcycle: from_date + '-' + to_date, id: ress[i]._id, end_date: ress[i].end_date });
                        }
                        if (result.length > 0) {
                            var d = timezone.tz(new Date(result[result.length - 1].end_date), settings.settings.time_zone).format(settings.settings.date_format);
                        } else {
                            var d = timezone.tz(new Date(), settings.settings.time_zone).format(settings.settings.date_format);
                        }

                        var str = d + '- till now';
                        result.push({ billingcycle: str, end_date: '' });
                        res.send({ status: 1, response: result });
                    })
                })
            }
        })
    }

    router.Billingdata = function (req, res) {
        var billing_id = req.body.billing_id || '';
        var restaurant_id = req.body.restaurant_id || '';

        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
            } else {
                db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
                    if (err || !billingsettings) {
                        res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
                    } else {
                        if (typeof billing_id == 'undefined' || !billing_id) {
                            var initial_data = [{ $match: { status: { $eq: 7 }, restaurant_id: new mongoose.Types.ObjectId(restaurant_id) } }]
                            db.GetAggregation('orders', initial_data, function (err, dashsata) {
                                var totalDeliveries = 0;
                                var totalCommission = 0;
                                for (i in dashsata) {
                                    if (typeof dashsata[i].billings.amount.restaurant_commission != 'undefined' && !isNaN(dashsata[i].billings.amount.restaurant_commission)) {
                                        totalCommission = (parseFloat(totalCommission) + parseFloat(dashsata[i].billings.amount.restaurant_commission)).toFixed(2);
                                    }
                                    totalDeliveries = parseInt(totalDeliveries) + 1;
                                }
                                var total_order = {};
                                total_order.totalamt = totalCommission || 0;
                                total_order.totalorder = totalDeliveries || 0;

                                var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
                                var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, restaurant_id: new mongoose.Types.ObjectId(restaurant_id) };

                                var condition = [
                                    { "$match": filter_query },
                                    {
                                        $project: {
                                            orderDetails: {
                                                order_id: "$order_id",
                                                _id: "$_id",
                                                billings: "$billings",
                                                restaurant_id: "$restaurant_id",
                                                status: "$status",
                                                createdAt: "$createdAt",

                                            }
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: "null",

                                            'orderDetails': { $push: "$orderDetails" }
                                        }
                                    },
                                    { $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
                                    { $sort: { "createdAt": -1 } },
                                    {
                                        $group: {
                                            _id: "null",
                                            "count": { $first: "$count" },
                                            'orderDetails': { $push: "$orderDetails" }
                                        }
                                    },
                                ];
                                db.GetAggregation('orders', condition, function (err, docdata) {
                                    if (err || !docdata) {
                                        res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: total_order.totalamt, total_order: total_order });
                                    } else {
                                        if (docdata.length > 0) {
                                            var count = 0;
                                            var restaurant_total = 0;
                                            var orderDetails = [];

                                            if (typeof docdata[0].orderDetails != 'undefined') {
                                                orderDetails = docdata[0].orderDetails;
                                            }

                                            for (i in docdata[0].orderDetails) {
                                                var order_date = timezone.tz(docdata[0].orderDetails[i].createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                                docdata[0].orderDetails[i].createdAt = order_date;
                                            }
                                            res.send({ status: '1', message: '', count: 0, orderDetails: orderDetails, restaurant_total: total_order.totalamt, total_order: total_order });
                                        } else {
                                            res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: total_order.totalamt, total_order: total_order });
                                        }
                                    }
                                })
                            })
                        } else {
                            var initial_data = [{ $match: { status: { $eq: 7 }, restaurant_id: new mongoose.Types.ObjectId(restaurant_id) } }]
                            db.GetAggregation('orders', initial_data, function (err, dashsata) {
                                var totalDeliveries = 0;
                                var totalCommission = 0;
                                for (i in dashsata) {
                                    if (typeof dashsata[i].billings.amount.restaurant_commission != 'undefined' && !isNaN(dashsata[i].billings.amount.restaurant_commission)) {
                                        totalCommission = (parseFloat(totalCommission) + parseFloat(dashsata[i].billings.amount.restaurant_commission)).toFixed(2);
                                        totalDeliveries = parseInt(totalDeliveries) + 1;
                                    }
                                }
                                var total_order = {};
                                total_order.totalamt = totalCommission || 0;
                                total_order.totalorder = totalDeliveries || 0;

                                var filter_query = { 'orderDetails.status': { $eq: 7 } };

                                var condition = [
                                    { "$match": { billing_id: new mongoose.Types.ObjectId(billing_id), restaurant_id: new mongoose.Types.ObjectId(restaurant_id) } },
                                    {
                                        $project: {
                                            restaurant_id: "$restaurant_id",
                                            paid_status: "$paid_status",
                                            paid_date: "$paid_date",
                                            transaction_id: "$transaction_id",
                                            order_id: "$order_lists",
                                            comments: "$comments",
                                            order_count: { '$size': '$order_lists' },
                                        }
                                    },
                                    // { "$match": { order_count: { $gt: 0 } } },
                                    { $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
                                    { $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
                                    { $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
                                    {
                                        $project: {
                                            payoutDetails: {
                                                paid_status: "$paid_status",
                                                restaurant_id: "$restaurant_id",
                                                type: { $literal: 'restaurant' },
                                                _id: "$_id",
                                                paid_date: "$paid_date",
                                                transaction_id: "$transaction_id",
                                                comments: "$comments",
                                            },
                                            orderDetails: {
                                                order_id: "$orderDetails.order_id",
                                                _id: "$orderDetails._id",
                                                billings: "$orderDetails.billings",
                                                restaurant_id: "$orderDetails.restaurant_id",
                                                status: "$orderDetails.status",
                                                createdAt: "$orderDetails.createdAt",
                                                created_time: "$orderDetails.created_time",
                                            }
                                        }
                                    },
                                    { "$match": filter_query },
                                    {
                                        $group: {
                                            _id: "null",
                                            payoutDetails: { $first: "$payoutDetails" },
                                            "count": { $sum: 1 },
                                            'orderDetails': { $push: "$orderDetails" },
                                        }
                                    },
                                    { $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
                                    { $sort: { "createdAt": -1 } },
                                    {
                                        $group: {
                                            _id: "null",
                                            "count": { $first: "$count" },
                                            "payoutDetails": { $first: "$payoutDetails" },
                                            'orderDetails': { $push: "$orderDetails" }
                                        }
                                    }
                                ];
                                db.GetAggregation('restaurant_earnings', condition, function (err, docdata) {
                                    if (err || !docdata) {
                                        res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, payoutDetails: {}, total_order: total_order });
                                    } else {
                                        if (docdata.length > 0) {
                                            var count = 0;
                                            var restaurant_total = 0;
                                            var orderDetails = [];

                                            if (typeof docdata[0].orderDetails != 'undefined') {
                                                orderDetails = docdata[0].orderDetails;
                                            }
                                            if (typeof docdata[0].payoutDetails != 'undefined') {
                                                payoutDetails = docdata[0].payoutDetails;
                                            }

                                            var billing_total = 0;
                                            for (i in docdata[0].orderDetails) {
                                                var order_date = timezone.tz(docdata[0].orderDetails[i].createdAt, settings.settings.time_zone).format(settings.settings.date_format);
                                                docdata[0].orderDetails[i].createdAt = order_date;
                                                if (typeof docdata[0].orderDetails[i].billings.amount.restaurant_commission != 'undefined' && !isNaN(docdata[0].orderDetails[i].billings.amount.restaurant_commission)) {
                                                    billing_total = (parseFloat(billing_total) + parseFloat(docdata[0].orderDetails[i].billings.amount.restaurant_commission)).toFixed(2);
                                                }
                                            }
                                            res.send({ status: '1', message: '', count: 0, orderDetails: orderDetails, restaurant_total: billing_total, payoutDetails: payoutDetails, total_order: total_order });
                                        } else {
                                            res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, payoutDetails: {}, total_order: total_order });
                                        }
                                    }
                                })
                            })
                        }
                    }
                })
            }
        })
    }

    router.updateMainCategories = function (req, res) {
        db.GetOneDocument('categories', { _id: new mongoose.Types.ObjectId(req.body.cat_id) }, {}, {}, function (err, categories) {
            if (err || !categories) {
                res.send({ status: '0', message: 'Error in Categories' });
            } else {
                if (categories && typeof categories._id != 'undefined') {
                    db.GetOneDocument('categories', { '_id': { $ne: categories._id }, restaurant: categories.restaurant, name: req.body.cat_name }, {}, {}, function (err, docdata) {
                        if (err) {
                            res.send({ status: '0', message: 'Error in Categories' });
                        } else {
                            if (!docdata) {
                                var updatedoc = {
                                    name: req.body.cat_name
                                }
                                db.UpdateDocument('categories', { _id: new mongoose.Types.ObjectId(req.body.cat_id) }, updatedoc, {}, function (err, response) {
                                    if (err) {
                                        res.send({ status: '0', message: 'Error in Categories' });
                                    } else {
                                        res.send({ status: '1', message: 'Successfully Updated' })
                                    }
                                })
                            } else {

                                res.send({ status: '0', message: "Category already added" });
                            }
                        }
                    })
                } else {
                    res.send({ status: '0', message: 'Error in Categories' });
                }
            }
        })

    }
    router.updateSubCategories = function (req, res) {
        db.GetOneDocument('categories', { _id: new mongoose.Types.ObjectId(req.body.cat_id) }, {}, {}, function (err, categories) {
            if (err || !categories) {
                res.send({ status: '0', message: 'Error in Categories' });
            } else {
                if (categories && typeof categories._id != 'undefined') {
                    db.GetOneDocument('categories', { '_id': { $ne: categories._id }, restaurant: categories.restaurant, name: req.body.cat_name }, {}, {}, function (err, docdata) {
                        if (err) {
                            res.send({ status: '0', message: 'Error in Categories' });
                        } else {
                            if (!docdata) {
                                var updatedoc = {
                                    name: req.body.cat_name
                                }
                                db.UpdateDocument('categories', { _id: new mongoose.Types.ObjectId(req.body.cat_id) }, updatedoc, {}, function (err, response) {
                                    if (err) {
                                        res.send({ status: '0', message: 'Error in Categories' });
                                    } else {
                                        res.send({ status: '1', message: 'Successfully Updated' })
                                    }
                                })
                            } else {

                                res.send({ status: '0', message: "Category already added" });
                            }
                        }
                    })
                } else {
                    res.send({ status: '0', message: 'Error in Categories' });
                }
            }
        })
    }
    return router;
};
