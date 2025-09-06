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
	var otp = require('otplib/lib/authenticator');
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
	var turf = require('turf');
	var stripe = require('stripe')('');
	var each = require('async-each-series');
	var CronJob = require('cron').CronJob;
	function isObjectId(n) {
		return mongoose.Types.ObjectId.isValid(n);
	}

	new CronJob('00 00 00 * * *', function () {
		db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, settings) {
			//console.log(settings)
			if (err || !settings) {
			} else {
				var billingcycle = parseInt(settings.settings.no_of_days) * 24 * 60 * 60 * 1000;
				if (typeof settings.settings.last_billed_time != 'undefined') {
					var startTime = parseInt(settings.settings.last_billed_time);
				} else {
					var startTime = new Date(settings.settings.last_billed_date).getTime();
				}
				var currentTime = Date.now();
				var different = currentTime - startTime;
				if (different >= billingcycle) {
					var insertedData = {};
					insertedData.status = 1;
					if (typeof settings.settings.last_billed_time != 'undefined') {
						insertedData.start_date = parseInt(settings.settings.last_billed_time);
					} else {
						insertedData.start_date = new Date(settings.settings.last_billed_date);
					}
					insertedData.end_date = new Date();
					insertedData.end_time = Date.now();
					insertedData.start_time = startTime;
					insertedData.billingcycle = moment(new Date(insertedData.start_date)).format("YYYY/MM/DD") + '-' + moment(new Date(insertedData.end_date)).format("YYYY/MM/DD");
					db.InsertDocument('billing', insertedData, function (err, billingdata) {
						if (err || billingdata.nModified == 0) {
						} else {
							db.UpdateDocument('settings', { 'alias': 'billing_cycle' }, { 'settings.last_billed_date': new Date(), 'settings.last_billed_time': Date.now() }, {}, function (err, settingres) {
								if (err || settingres.nModified == 0) {
									res.send({ "status": 0, "errors": 'Error in settings' });
								} else {
									db.GetDocument('drivers', {}, { '_id': 1 }, {}, function (err, drivers) {
										if (err || !drivers || drivers.length == 0) {
										} else {
											if (drivers.length > 0) {
												each(drivers, function (driver, next) {
													var newdata = {};
													newdata.driver_id = new mongoose.Types.ObjectId(driver._id);
													newdata.order_lists = [];
													newdata.billing_id = new mongoose.Types.ObjectId(billingdata._id);

													db.GetDocument('orders', { 'driver_id': driver._id, created_time: { $gt: insertedData.start_time, $lte: insertedData.end_time } }, { '_id': 1, 'order_id': 1 }, {}, function (err, orders) {
														//console.log('startTime',orders)
														if (!err && orders && orders.length > 0) {
															for (i in orders) {
																newdata.order_lists.push(orders[i].order_id);
															}
															db.InsertDocument('driver_earnings', newdata, function (err, driver_earnings) {
																next();
															})
														} else {
															next();
														}

													})
												}, function (err) {
													//	console.log('finished');
												})
											}
										}
									});
									db.GetDocument('restaurant', {}, { '_id': 1 }, {}, function (err, restaurants) {
										if (err || !restaurants || restaurants.length == 0) {
										} else {
											if (restaurants.length > 0) {
												each(restaurants, function (restaurant, next) {
													var newdata = {};
													newdata.restaurant_id = new mongoose.Types.ObjectId(restaurant._id);
													newdata.order_lists = [];
													newdata.billing_id = new mongoose.Types.ObjectId(billingdata._id);
													db.GetDocument('orders', { 'restaurant_id': restaurant._id, created_time: { $gt: insertedData.start_time, $lte: insertedData.end_time } }, { '_id': 1, 'order_id': 1 }, {}, function (err, orders) {
														if (!err && orders && orders.length > 0) {
															for (i in orders) {
																newdata.order_lists.push(orders[i].order_id);
															}
															db.InsertDocument('restaurant_earnings', newdata, function (err, driver_earnings) {
																next();
															})
														} else {
															next();
														}
													})
												}, function (err) {
													//	console.log('finished');
												})
											}
										}
									});
								}
							})
						}
					})
				}
			}
		});
	}, null, true, 'America/Los_Angeles');

	controller.adminEarnings = function (req, res) {

		//console.log('adminEarnings')
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		console.log('skip', req.query, skip)
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var sort = { 'orderDetails.createdAt': -1 };
		if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
			filters = req.query.filters;
			if (filters != '') {
				filters = decodeURIComponent(filters);
				filters = decodeURIComponent(filters);
				var filterArray = filters.split('|');
				for (var i = 0; i < filterArray.length; i++) {
					if (filterArray[i] != '') {
						var option = filterArray[i].split(':');
						if (option.length > 1) {
							var values = [];
							if (option[1] != '') {
								values = option[1].split(',');
							}
							if (values.length > 0) {
								if (option[0] == 'c') {
									main_city = values;
								}
								if (option[0] == 'l') {
									sub_city = values;
								}
								if (option[0] == 's') {
									if (values.length > 0) {
										start_time = values[0];
									}
								}
								if (option[0] == 'e') {
									if (values.length > 0) {
										end_time = values[0];
									}
								}
								if (option[0] == 'q') {
									if (values.length > 0) {
										searchs = values[0];
									}
								}
								if (option[0] == 'o') {
									if (values.length > 0) {
										sort = {};
										sort[values[0]] = parseInt(values[1]);
										//console.log(sort)
									}
								}

							}
						}
					}

				}
			}
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
			} else {

				var filter_query = { status: { $eq: 7 } };
				if (searchs != '') {
					filter_query['$or'] = [];
					var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
					filter_query['$or'].push(data);
				}
				if (main_city.length > 0) {
					filter_query.main_city = { $in: main_city };
				}
				if (sub_city.length > 0) {
					filter_query.sub_city = { $in: sub_city };
				}
				if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
					filter_query['$and'] = [];
					if (typeof start_time != 'undefined') {
						var data = { "created_time": { $gte: parseInt(start_time) } };
						filter_query['$and'].push(data)
					}
					if (typeof end_time != 'undefined') {
						var data = { "created_time": { $lte: parseInt(end_time) } };
						filter_query['$and'].push(data)
					}
				}
				var condition = [
					{ "$match": filter_query },
					{
						$project: {
							orderDetails: {
								order_id: "$order_id",
								_id: "$_id",
								billings: "$billings",
								status: "$status",
								createdAt: "$createdAt",
								grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
								item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
								refer_offer_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] },
								delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
								coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
								// driver_commission: { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] }] },
								driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
								restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
								'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
								'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
								'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
								// 'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
								'final_earnings': { $subtract: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, { $sum: [{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }] }
							}
						}
					},
					{
						$group: {
							_id: "null",
							"count": { $sum: 1 },
							'orderDetails': { $push: "$orderDetails" }
						}
					},
					{
						$project: {
							'orderDetails': 1,
							'count': 1,
							'admin_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": "$$order.final_earnings" } } },
							'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
							'restaurant_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } }

						}
					},
					{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
					{ $sort: sort },
					{ '$skip': parseInt(skip) },
					{ '$limit': parseInt(limit) },
					{
						$group: {
							_id: "null",
							"count": { $first: '$count' },
							"admin_total": { $first: '$admin_total' },
							"driver_total": { $first: '$driver_total' },
							"restaurant_total": { $first: '$restaurant_total' },
							'orderDetails': { $push: "$orderDetails" }
						}
					}
				];
				/* console.log('condition', condition)
				res.send({ status: '1', message: '', condition:condition});

				return; */

				db.GetAggregation('orders', condition, function (err, docdata) {
					if (err || !docdata) {
						res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
					} else {
						var count = 0;
						if (docdata.length > 0) {
							var restaurant_total = 0;
							var driver_total = 0;
							var admin_total = 0;
							var orderDetails = [];
							if (typeof docdata[0].count != 'undefined') {
								count = docdata[0].count;
							}
							if (typeof docdata[0].orderDetails != 'undefined') {
								orderDetails = docdata[0].orderDetails;
							}
							if (typeof docdata[0].restaurant_total != 'undefined') {
								restaurant_total = docdata[0].restaurant_total;
							}
							if (typeof docdata[0].driver_total != 'undefined') {
								driver_total = docdata[0].driver_total;
							}
							if (typeof docdata[0].admin_total != 'undefined') {
								admin_total = docdata[0].admin_total;
							}
							console.log("--------------", orderDetails);
							res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, restaurant_total: restaurant_total, driver_total: driver_total, admin_total: admin_total });
						} else {
							res.send({ status: '1', message: '', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
						}
					}
				})
			}
		})
	}

	controller.exportadminearning = function (req, res) {	



		/* console.log('request data ',req.body);
		return false; */
		

		var query = {};
		var string_status ='';
		
  
			var response = {};
			response.status = 0;
			var data = {};
			var exportdata = {};
			exportdata.collection = 'orders';
		    var main_city = [];
		    var sub_city = [];

			   var filter_query = { status: { $eq: 7 } };
			   
				if (req.body.searchs) {
					filter_query['$or'] = [];
					var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
					filter_query['$or'].push(data);
				}

				if (req.body.city) {
					filter_query.main_city = { $in: [req.body.city] };
				}
				if (req.body.area) {
					filter_query.sub_city = { $in: [req.body.area] };
				}
				var sort = { 'orderDetails.createdAt': -1 };	
			
			/* 	if (req.body.start_date || req.body.end_date) {

					filter_query['$and'] = [];
					if (req.body.start_date) {
						var data = { "created_time": { $gte: parseInt(req.body.start_date) } };
						filter_query['$and'].push(data)
					}
					if (req.body.end_date) {
						//var data = { "created_time": { $lte: parseInt(req.body.end_date) } };
						console.log('req.body.end_date ===',req.body.end_date);
						var data = { "created_time": { $lte: '2354' } };
						filter_query['$and'].push(data)
					}
				} */

				if ( req.body.start_date  || req.body.end_date) {
					filter_query['$and'] = [];
					if (req.body.start_date) {
						var data = { "created_time": { $gte: parseInt(req.body.start_date) } };
						filter_query['$and'].push(data)
					}
					if (req.body.end_date) {
						var data = { "created_time": { $lte: parseInt(req.body.end_date) } };
						filter_query['$and'].push(data)
					}
				}

				
				var condition = [
					{ "$match": filter_query },
					{
						$project: {
							orderDetails: {
								order_id: "$order_id",
								_id: "$_id",
								billings: "$billings",
								status: "$status",
								createdAt: "$createdAt",
								grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
								item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
								refer_offer_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] },
								delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
								coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
								driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
								restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
								'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
								'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
								'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
								// 'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
								'final_earnings': { $subtract: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, { $sum: [{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }] }
							}
						}
					},
					{
						$group: {
							_id: "null",
							"count": { $sum: 1 },
							'orderDetails': { $push: "$orderDetails" }
						}
					},
					{
						$project: {
							'orderDetails': 1,
							'count': 1,
							'admin_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": "$$order.final_earnings" } } },
							'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
							'restaurant_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } }

						}
					},
					{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
					{ $sort: sort },
					
					{
						$group: {
							_id: "null",
							"count": { $first: '$count' },
							"admin_total": { $first: '$admin_total' },
							"driver_total": { $first: '$driver_total' },
							"restaurant_total": { $first: '$restaurant_total' },
							'orderDetails': { $push: "$orderDetails" }
						}
					}
				];

			
				
		       /*  var filter_query = { status: { $eq: 7 } };				
				if (req.body.searchs) {
					filter_query['$or'] = [];
					var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
					filter_query['$or'].push(data);
				}
	
				if (req.body.city) {
					filter_query.main_city = { $in: req.body.city };
				}
				if (req.body.area) {
					filter_query.sub_city = { $in: req.body.area };
				}

				var start ,end;
				if (typeof req.body.start_date != 'undefined' || typeof req.body.end_date != 'undefined') {
					filter_query['$and'] = [];

					if (req.body.start_date && typeof req.body.start_date != 'undefined') {
						start = new Date((req.body.start_date)) ;
						start = new Date(start.setDate(start.getDate() + 0))
						start = moment(start).format('MM/DD/YYYY');
						start = start + ' 00:00:00';

						var data = { "created_time": { $gte: new Date(start) } };
						filter_query['$and'].push(data)
					}

					if (req.body.end_date && typeof req.body.end_date != 'undefined') {
						end = new Date(req.body.end_date);
						end = new Date(end.setDate(end.getDate() + 0))
						end = moment(end).format('MM/DD/YYYY');
						end = end + ' 23:59:59';

						var data = { "created_time": { $lte: new Date(end) } };
						filter_query['$and'].push(data)
					}
				}	

				data.query = [
					{ "$match": filter_query },
					{
						$project: {
							orderDetails: {
								order_id: "$order_id",
								_id: "$_id",
								billings: "$billings",
								status: "$status",
								createdAt: "$createdAt",
								grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
								item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
								refer_offer_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] },
								delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
								coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
								driver_commission: { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] }] },
								restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },  { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
								'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
								'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
								'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
								'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
								'final_earnings': { $subtract: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, { $sum: [{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] }] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }] },
								'service_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.service_tax", 0] }
							}
						}
					},
					{
						$group: {
							_id: "null",
							"count": { $sum: 1 },
							'orderDetails': { $push: "$orderDetails" }
						}
					},
					{
						$project: {
							'orderDetails': 1,
							'count': 1,
							'admin_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": "$$order.final_earnings" } } },
							'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$$order.billings.amount.bir_tax_amount", 0] }] }, "$$order.billings.amount.bir_tax_amount", 0] }] } } } },
							'restaurant_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } }

						}
					},
					{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
					
					{
						$group: {
							_id: "null",
							"count": { $first: '$count' },
							"admin_total": { $first: '$admin_total' },
							"driver_total": { $first: '$driver_total' },
							"restaurant_total": { $first: '$restaurant_total' },
							'orderDetails': { $push: "$orderDetails" }
						}
					}
				];   */
			
			
			
			exportdata.query  = condition;

			exportdata.csv = [
		         { label: 'Order Id', value: 'order_id' },
		         { label: 'Customer paid amount ', value: 'grand_total' },
		         { label: 'Item amount', value: 'item_total' },
		         { label: 'Tax', value: 'service_tax' },
		         { label: 'Site commission from restaurant', value: 'site_total' },
		         { label: 'BIR Tax', value: 'bir_tax' },
		         { label: 'Delivery Fee', value: 'delivery_amount' },
		         { label: 'Peak/Night', value: 'peak' },
		         { label: 'Coupon Discount', value: 'coupon_discount' },
		         { label: 'Refer offer Discount ', value: 'refer_offer_price' },
		         { label: 'Offer Discount', value: 'food_offer_price' },
		         { label: 'Amount to driver', value: 'driver_commission' },
		         { label: 'Amount to restaurant', value: 'restaurant_commission' },
		         { label: 'Final platform earnings', value: 'final_earnings' }
			];  
			
		/* 	res.send({ status: '1', message: 'no', condition:condition});
			return ; */
			
		
		/* 	db.GetAggregation('orders', condition, function (err, docdata) {
				console.log('======> err, docdata',err, docdata);
				if (err || !docdata) {
					res.send({ status: '1', message: 'no', docdata:data.query});
					return;
				} else {
					res.send({ status: '1', message: 'suc', condition: docdata});
					return;
					
				}
			}) */

			middlewares.jsontocsvadminearn(exportdata, function (err, data) {
				if (!err || data) {
					if (data.status == 1) {
						response.status = 1;
						response.message = data.message;
						res.send(response);
					} else {
						response.message = "No Data Found";
						res.send(response);
					}
				} else {
					response.message = "No Data Found";
					res.send(response);
				}
			});
		}

		controller.exportdriverpayout = function (req, res) {
			console.log('controller.exportdriverpayout',req.body)
			var query = {};
			var string_status ='';		
			var response = {};
			response.status = 0;
			var main_city = [];
			var sub_city = [];
			var cvsdata = {};
			cvsdata.collection = 'driver_earnings';
			var billing_id;
			if (typeof req.body.billing_id != 'undefined') {
				if (isObjectId(req.body.billing_id)) {
					billing_id = new mongoose.Types.ObjectId(req.body.billing_id);
				}
			}
			var sort = { sort_username: 1 }
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
				} else {
					db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
						if (err || !billingsettings) {
							res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
						} else {
							cvsdata.collection = 'orders';
							var filter_query = { status: { $eq: 7 } };
							var search_query = {};
							search_query['$or'] = [];
							if (req.body.search) {
								var data = { "sort_username": { $regex: req.body.search + '.*', $options: 'si' } };
								search_query['$or'].push(data);
								var data = { "sort_address": { $regex: req.body.search + '.*', $options: 'si' } };
								search_query['$or'].push(data);
							}
							if (search_query['$or'].length == 0) {
								delete search_query['$or'];
							}
							if (req.body.main_city) {
								filter_query.main_city = { $in: [req.body.main_city] };
							}
							if (req.body.sub_city) {
								filter_query.sub_city = { $in: [req.body.sub_city] };
							}
							if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof req.body.start_time != 'undefined') {
									var data = { "created_time": { $gte: parseInt(req.body.start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof req.body.end_time != 'undefined') {
									var data = { "created_time": { $lte: parseInt(req.body.end_time) } };
									filter_query['$and'].push(data)
								}
							}
							if (req.body.sort && typeof req.body.sort != 'undefined' && req.body.sort.trim() != '') {
								sort = req.body.sort;
							}
							console.log('sort',sort)
							var condition = [
								{ "$match": filter_query },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										orderDetails: {
											order_id: "$order_id",
											_id: "$_id",
											billings: "$billings",
											driver_id: "$driver_id",
											status: "$status",
											createdAt: "$createdAt",
											transactionDetails: "$transactionDetails",
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, { $multiply: ["$billings.amount.total", { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }] }] },
											admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] },
											//var restaurant_commission = (customar_paid_amount + package_charge) - (offer_discount + food_offer_price  + ((customar_paid_amount - (offer_discount + food_offer_price)) * applied_admin_percentage));
											driver_due: {
												"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
													$subtract: [{
														$subtract: [{
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																{ $gte: ["$billings.amount.grand_total", 0] }]
															}, "$billings.amount.grand_total", 0]
														},
														{
															$sum: [{
																$subtract: [{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																			{ $gte: ["$billings.amount.total", 0] }]
																		}, "$billings.amount.total", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																			{ $gte: ["$billings.amount.package_charge", 0] }]
																		}, "$billings.amount.package_charge", 0]
																	}]
																},
																{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																			{ $gte: ["$billings.amount.offer_discount", 0] }]
																		}, "$billings.amount.offer_discount", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																			{ $gte: ["$billings.amount.food_offer_price", 0] }]
																		}, "$billings.amount.food_offer_price", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{
																				$gte: [{
																					$subtract: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																							{ $gte: ["$billings.amount.total", 0] }]
																						}, "$billings.amount.total", 0]
																					},
																					{
																						$sum: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																								{ $gte: ["$billings.amount.offer_discount", 0] }]
																							}, "$billings.amount.offer_discount", 0]
																						},
																						{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																								{ $gte: ["$billings.amount.food_offer_price", 0] }]
																							}, "$billings.amount.food_offer_price", 0]
																						}]
																					}]
																				}, 0]
																			}]
																		},
																		{
																			$multiply: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$billings.amount.offer_discount", 0] }]
																						}, "$billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$billings.amount.food_offer_price", 0] }]
																						}, "$billings.amount.food_offer_price", 0]
																					}]
																				}]
																			},
																			{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																		}, 0]
																	}]
																}]
															}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
												}, 0]
											},
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
										"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
										"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },

									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'drivers', localField: "orderDetails.driver_id", foreignField: "_id", as: "orderDetails.driverDetails" } },
								{ $unwind: { path: "$orderDetails.driverDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
										'sort_username': { $toLower: "$orderDetails.driverDetails.username" },
										'sort_address': { $toLower: "$orderDetails.driverDetails.address.fulladres" },
									}
								},
								{ "$match": search_query },
								{
									$group: {
										_id: "$orderDetails.driver_id",
										"count": { $first: '$count' },
										"driver_total": { $first: '$driver_total' },
										"admin_due": { $first: '$admin_due' },
										"driver_due": { $first: '$driver_due' },
										'username': { $first: "$orderDetails.driverDetails.username" },
										'wallet_amount': { $first: "$orderDetails.driverDetails.wallet_settings.available" },
										'sort_username': { $first: "$sort_username" },
										'sort_address': { $first: "$sort_address" },
										'phone': { $first: "$orderDetails.driverDetails.phone" },
										'address': { $first: "$orderDetails.driverDetails.address" },
										'_deliveries': { $sum: 1 },
										'driver_due': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_due", ''] }, ''] }, { $gte: ["$orderDetails.driver_due", 0] }] }, "$orderDetails.driver_due", 0] } },
										'admin_due': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.admin_due", ''] }, ''] }, { $gte: ["$orderDetails.admin_due", 0] }] }, "$orderDetails.admin_due", 0] } },
										'driver_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $sort: sort },
								{
									$project: {
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
										'driverDetails': {
											'driver_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
											'driver_due': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.driver_due", 0] } } } },
											'admin_due': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
											'_deliveries': { $size: "$orderDetails" },
											'username': "$username",
											'wallet_amount': "$wallet_amount",
											'phone': "$phone",
											'address': "$address",
											'_id': '$_id',
											'range': { $literal: billing_id},
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: '$count' },
										"driver_total": { $first: '$driver_total' },
										"admin_due": { $first: '$admin_due' },
										"driver_due": { $first: '$driver_due' },
										'driverDetails': { $push: "$driverDetails" },
									}
								}
							];
								cvsdata.query = condition;
								cvsdata.csv = [
								{ label: 'Driver Name', value: 'username' },
								{ label: 'Phone Number', value: 'phone' },
								{ label: 'Location', value: 'address' },
								{ label: 'Completed Deliveries', value: '_deliveries' },
								{ label: 'Driver Earnings', value: 'driver_commission' },
								{ label: 'Driver Available Wallet Amount', value: 'wallet_amount' }
							  ];  				
							console.log('cvsdata',cvsdata)
						   middlewares.jsontocsvdriverpayout(cvsdata, function (err, data) {
							   if (!err || data) {
								   if (data.status == 1) {
									   response.status = 1;
									   response.message = data.message;
									   res.send(response);
								   } else {
									   response.message = "No Data Found";
									   res.send(response);
								   }
							   } else {
								   response.message = "No Data Found";
								   res.send(response);
							   }
						   });
						}
					})
				}
			})	  
				
	}

	controller.exportdriverdetail = function (req, res) {

			var query = {};
			var string_status ='';	
			
	    var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		
		var sort = { sort_username: 1 }

	  
				var response = {};
				response.status = 0;
				var cvsdata = {};
				cvsdata.collection = 'driver_earnings';
				var billing_id;
				var main_city = [];
				var sub_city = [];

				if (typeof req.body.billing_id != 'undefined') {
					if (isObjectId(req.body.billing_id)) {
						billing_id = new mongoose.Types.ObjectId(req.body.billing_id);
					}
				}
				var driver_id;
				if (typeof req.body.driver_id != 'undefined') {
					if (isObjectId(req.body.driver_id)) {
						driver_id = new mongoose.Types.ObjectId(req.body.driver_id);
					} else {
						res.send({ status: '0', message: 'some key value missing.' });
						return;
					}
				} else {
					res.send({ status: '0', message: 'some key value missing.' });
					return;
				}
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						if (err || !settings) {
							res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
						} else {
							db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
								if (err || !billingsettings) {
									res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
								} else {
									if (typeof billing_id == 'undefined') {
										cvsdata.collection = 'orders';										
										if (typeof billingsettings.settings.last_billed_time != 'undefined') {
											var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
										} else {
											var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
										}
			
										var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, 'driver_id': driver_id };								
									
										var search_query = {};
										search_query['$or'] = [];
										if (req.body.searchs) {
											var data = { "sort_username": { $regex: req.body.searchs + '.*', $options: 'si' } };
											search_query['$or'].push(data);
											var data = { "sort_address": { $regex: req.body.searchs + '.*', $options: 'si' } };
											search_query['$or'].push(data);
										}
										if (search_query['$or'].length == 0) {
											delete search_query['$or'];
										}
										if (req.body.main_city) {
											filter_query.main_city = { $in: [req.body.main_city] };
										}
										if (req.body.sub_city) {
											filter_query.sub_city = { $in: [req.body.sub_city] };
										}
										if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
											filter_query['$and'] = [];
											if (typeof req.body.start_time != 'undefined') {
												var data = { "created_time": { $gte: parseInt(req.body.start_time) } };
												filter_query['$and'].push(data)
											}
											if (typeof req.body.end_time != 'undefined') {
												var data = { "created_time": { $lte: parseInt(req.body.end_time) } };
												filter_query['$and'].push(data)
											}
										}
										var condition = [
											{ "$match": filter_query },
											{
												$lookup: {
													from: "transaction",
													let: {
														transactionId: "$transaction_id",
													},
													pipeline: [
														{
															$match: {
																$expr: {
																	$and: [
																		{ "$eq": ["$_id", "$$transactionId"] },
																	]
																}
															}
														},
														{ $limit: 1 },
														{
															$project: {
																type: "$type",
															}
														},
													],
													as: "transactionDetails"
												}
											},
											{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
											{
												$project: {
													orderDetails: {
														order_id: "$order_id",
														_id: "$_id",
														billings: "$billings",
														driver_id: "$driver_id",
														status: "$status",
														createdAt: "$createdAt",
														baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] },
														format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }] }, "$driver_fare.format", ''] },
														minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] },
														extra_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },
														mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] },
														surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] },
														night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] },
														pickup_distance: "$pickup_distance",
														mileages_travelled: "$mileages_travelled",
														extra_fare_commision: "$extra_fare_commision",
														night_fare_commision: "$night_fare_commision",
														grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
														delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
														coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
														driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
														// 'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
														payment_mode: {
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
															}, "$transactionDetails.type", '']
														},
														"transactionDetails": "$transactionDetails",
														"transaction_id": "$transaction_id",
														admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] },
														driver_due: {
															"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
																$subtract: [{
																	$subtract: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																			{ $gte: ["$billings.amount.grand_total", 0] }]
																		}, "$billings.amount.grand_total", 0]
																	},
																	{
																		$sum: [{
																			$subtract: [{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				/* {
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																						{ $gte: ["$billings.amount.service_tax", 0] }]
																					}, "$billings.amount.service_tax", 0]
																				}, */
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																						{ $gte: ["$billings.amount.package_charge", 0] }]
																					}, "$billings.amount.package_charge", 0]
																				}]
																			},
																			{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																						{ $gte: ["$billings.amount.offer_discount", 0] }]
																					}, "$billings.amount.offer_discount", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																						{ $gte: ["$billings.amount.food_offer_price", 0] }]
																					}, "$billings.amount.food_offer_price", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{
																							$gte: [{
																								$subtract: [{
																									"$cond": [{
																										$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																										{ $gte: ["$billings.amount.total", 0] }]
																									}, "$billings.amount.total", 0]
																								},
																								{
																									$sum: [{
																										"$cond": [{
																											$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																											{ $gte: ["$billings.amount.offer_discount", 0] }]
																										}, "$billings.amount.offer_discount", 0]
																									},
																									{
																										"$cond": [{
																											$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																											{ $gte: ["$billings.amount.food_offer_price", 0] }]
																										}, "$billings.amount.food_offer_price", 0]
																									}]
																								}]
																							}, 0]
																						}]
																					},
																					{
																						$multiply: [{
																							$subtract: [{
																								"$cond": [{
																									$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																									{ $gte: ["$billings.amount.total", 0] }]
																								}, "$billings.amount.total", 0]
																							},
																							{
																								$sum: [{
																									"$cond": [{
																										$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																										{ $gte: ["$billings.amount.offer_discount", 0] }]
																									}, "$billings.amount.offer_discount", 0]
																								},
																								{
																									"$cond": [{
																										$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																										{ $gte: ["$billings.amount.food_offer_price", 0] }]
																									}, "$billings.amount.food_offer_price", 0]
																								}]
																							}]
																						},
																						{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																					}, 0]
																				}]
																			}]
																		}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
																	}]
																}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
															}, 0]
														},
													}
												}
											},
											{
												$group: {
													_id: "null",
													"count": { $sum: 1 },
													"driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
													'orderDetails': { $push: "$orderDetails" }
			
												}
											},
											{
												$project: {
													'orderDetails': 1,
													'count': 1,
													'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
													"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
													"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },
			
												}
											},
											{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
											 { $sort: sort },
										/*	{ '$skip': parseInt(skip) },
											{ '$limit': parseInt(limit) }, */
											{
												$project: {
													'orderDetails': 1,
													'count': 1,
													'driver_total': 1,
													'admin_due': 1,
													'driver_due': 1,
												}
											},
											{
												$group: {
													_id: "null",
													"count": { $first: "$count" },
													"driver_total": { $first: "$driver_total" },
													"admin_due": { $first: "$admin_due" },
													"driver_due": { $first: "$driver_due" },
													'orderDetails': { $push: "$orderDetails" },
			
												}
											}
										];

										/* db.GetAggregation('orders', condition, function (err, docdata) {
											if (err || !docdata) {
												res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
											} else {
												var count = 0;
												if (docdata.length > 0) {
													var driver_total = 0;
												} else {
													res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
												}
											}
										}) */
									} else {								
										
										var filter_query = { 'orderDetails.status': { $eq: 7 } };
										if (req.body.searchs) {
											filter_query['$or'] = [];
											var data = { "driverDetails.username": { $regex: req.body.searchs + '.*', $options: 'si' } };
											filter_query['$or'].push(data);
											var data = { "driverDetails.address.fulladres": { $regex: req.body.searchs + '.*', $options: 'si' } };
											filter_query['$or'].push(data);
										}
										if (req.body.main_city) {
											filter_query['orderDetails.main_city'] = { $in: [req.body.main_city] };
										}
										if (req.body.sub_city) {
											filter_query['orderDetails.sub_city'] = { $in: [req.body.sub_city] };
										}
										if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
											filter_query['$and'] = [];
											if (typeof req.body.start_time != 'undefined') {
												var data = { "orderDetails.created_time": { $gte: parseInt(req.body.start_time) } };
												filter_query['$and'].push(data)
											}
											if (typeof req.body.end_time != 'undefined') {
												var data = { "orderDetails.created_time": { $lte: parseInt(req.body.end_time) } };
												filter_query['$and'].push(data)
											}
										}			
										var condition = [
											{ "$match": { billing_id: billing_id, driver_id: driver_id } },
			
											{
												$project: {
													order_id: "$order_lists",
													paid_status: "$paid_status",
													driver_id: "$driver_id",
													_id: "$_id",
													paid_date: "$paid_date",
													comments: "$comments",
													order_count: { '$size': '$order_lists' },
												}
											},
											{ "$match": { order_count: { $gt: 0 } } },
											{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
											{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
											{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
											{
												$lookup: {
													from: "transaction",
													let: {
														transactionId: "$orderDetails.transaction_id",
													},
													pipeline: [
														{
															$match: {
																$expr: {
																	$and: [
																		{ "$eq": ["$_id", "$$transactionId"] },
																	]
																}
															}
														},
														{ $limit: 1 },
														{
															$project: {
																type: "$type",
															}
														},
													],
													as: "transactionDetails"
												}
											},
											{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
											{
												$project: {
													payoutDetails: {
														paid_status: "$paid_status",
														driver_id: "$driver_id",
														type: { $literal: 'driver' },
														_id: "$_id",
														paid_date: "$paid_date",
														transaction_id: "$transaction_id",
														comments: "$comments",
													},
													orderDetails: {
														order_id: "$orderDetails.order_id",
														_id: "$orderDetails._id",
														billings: "$orderDetails.billings",
														driver_id: "$orderDetails.driver_id",
														status: "$orderDetails.status",
														createdAt: "$orderDetails.createdAt",
														created_time: "$orderDetails.created_time",
														main_city: "$orderDetails.main_city",
														sub_city: "$orderDetails.sub_city",
														baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.baseprice", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.baseprice", 0] }] }, "$orderDetails.driver_fare.baseprice", 0] },
														minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] },
														format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.format", ''] }, ''] }] }, "$orderDetails.driver_fare.format", ''] },
														mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.format", ''] }, ''] }, { $eq: ["$orderDetails.driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.mileages_travelled", ''] }, ''] }, { $gte: ["$orderDetails.mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$orderDetails.mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$orderDetails.mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.extra_price", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.extra_price", 0] }] }, "$orderDetails.driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.mileages_travelled", ''] }, ''] }, { $gte: ["$orderDetails.mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$orderDetails.mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$orderDetails.mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.extra_price", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.extra_price", 0] }] }, "$orderDetails.driver_fare.extra_price", 0] },] }, 0] }] },
														surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.surge_fee", 0] }] }, { $multiply: ["$orderDetails.billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.extra_fare_commision", ''] }, ''] }, { $gte: ["$orderDetails.extra_fare_commision", 0] }] }, { $divide: ["$orderDetails.extra_fare_commision", 100] }, 0] },] }, 0] },
														night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.night_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.night_fee", 0] }] }, { $multiply: ["$orderDetails.billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.night_fare_commision", ''] }, ''] }, { $gte: ["$orderDetails.night_fare_commision", 0] }] }, { $divide: ["$orderDetails.night_fare_commision", 100] }, 0] },] }, 0] },
														pickup_distance: "$orderDetails.pickup_distance",
														mileages_travelled: "$orderDetails.mileages_travelled",
														extra_fare_commision: "$orderDetails.extra_fare_commision",
														night_fare_commision: "$orderDetails.night_fare_commision",
														grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.grand_total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.grand_total", 0] }] }, "$orderDetails.billings.amount.grand_total", 0] },
														delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.delivery_amount", 0] }] }, "$orderDetails.billings.amount.delivery_amount", 0] },
														coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.coupon_discount", 0] }] }, "$orderDetails.billings.amount.coupon_discount", 0] },
														driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
														payment_mode: {
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
															}, "$transactionDetails.type", '']
														},
			
														'final_earnings': {
															$subtract: [{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																	{ $gte: ["$billings.amount.grand_total", 0] }]
																}, "$billings.amount.grand_total", 0]
															},
															{
																$sum: [{
																	$subtract: [{
																		$sum: [{
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																				{ $gte: ["$billings.amount.total", 0] }]
																			}, "$billings.amount.total", 0]
																		},
																		/* {
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																				{ $gte: ["$billings.amount.service_tax", 0] }]
																			}, "$billings.amount.service_tax", 0]
																		}, */
																		{
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																				{ $gte: ["$billings.amount.package_charge", 0] }]
																			}, "$billings.amount.package_charge", 0]
																		}]
																	},
																	{
																		$sum: [{
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																				{ $gte: ["$billings.amount.offer_discount", 0] }]
																			}, "$billings.amount.offer_discount", 0]
																		},
																		{
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																				{ $gte: ["$billings.amount.food_offer_price", 0] }]
																			}, "$billings.amount.food_offer_price", 0]
																		},
																		{
																			"$cond": [{
																				$and: [{
																					$gte: [{
																						$subtract: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																								{ $gte: ["$billings.amount.total", 0] }]
																							}, "$billings.amount.total", 0]
																						},
																						{
																							$sum: [{
																								"$cond": [{
																									$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																									{ $gte: ["$billings.amount.offer_discount", 0] }]
																								}, "$billings.amount.offer_discount", 0]
																							},
																							{
																								"$cond": [{
																									$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																									{ $gte: ["$billings.amount.food_offer_price", 0] }]
																								}, "$billings.amount.food_offer_price", 0]
																							}]
																						}]
																					}, 0]
																				}]
																			},
																			{
																				$multiply: [{
																					$subtract: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																							{ $gte: ["$billings.amount.total", 0] }]
																						}, "$billings.amount.total", 0]
																					},
																					{
																						$sum: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																								{ $gte: ["$billings.amount.offer_discount", 0] }]
																							}, "$billings.amount.offer_discount", 0]
																						},
																						{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																								{ $gte: ["$billings.amount.food_offer_price", 0] }]
																							}, "$billings.amount.food_offer_price", 0]
																						}]
																					}]
																				},
																				{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																			}, 0]
																		}]
																	}]
																}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
															}]
														},
														driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
														restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, { $multiply: ["$billings.amount.total", { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }] }] },
														admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] }] },
														driver_due: {
															"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
																$subtract: [{
																	$subtract: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																			{ $gte: ["$billings.amount.grand_total", 0] }]
																		}, "$billings.amount.grand_total", 0]
																	},
																	{
																		$sum: [{
																			$subtract: [{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				/* {
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																						{ $gte: ["$billings.amount.service_tax", 0] }]
																					}, "$billings.amount.service_tax", 0]
																				}, */
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																						{ $gte: ["$billings.amount.package_charge", 0] }]
																					}, "$billings.amount.package_charge", 0]
																				}]
																			},
																			{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																						{ $gte: ["$billings.amount.offer_discount", 0] }]
																					}, "$billings.amount.offer_discount", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																						{ $gte: ["$billings.amount.food_offer_price", 0] }]
																					}, "$billings.amount.food_offer_price", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{
																							$gte: [{
																								$subtract: [{
																									"$cond": [{
																										$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																										{ $gte: ["$billings.amount.total", 0] }]
																									}, "$billings.amount.total", 0]
																								},
																								{
																									$sum: [{
																										"$cond": [{
																											$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																											{ $gte: ["$billings.amount.offer_discount", 0] }]
																										}, "$billings.amount.offer_discount", 0]
																									},
																									{
																										"$cond": [{
																											$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																											{ $gte: ["$billings.amount.food_offer_price", 0] }]
																										}, "$billings.amount.food_offer_price", 0]
																									}]
																								}]
																							}, 0]
																						}]
																					},
																					{
																						$multiply: [{
																							$subtract: [{
																								"$cond": [{
																									$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																									{ $gte: ["$billings.amount.total", 0] }]
																								}, "$billings.amount.total", 0]
																							},
																							{
																								$sum: [{
																									"$cond": [{
																										$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																										{ $gte: ["$billings.amount.offer_discount", 0] }]
																									}, "$billings.amount.offer_discount", 0]
																								},
																								{
																									"$cond": [{
																										$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																										{ $gte: ["$billings.amount.food_offer_price", 0] }]
																									}, "$billings.amount.food_offer_price", 0]
																								}]
																							}]
																						},
																						{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																					}, 0]
																				}]
																			}]
																		}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
																	}]
																}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
															}, 0]
														},
													}
												}
											},
											{ "$match": filter_query },
											{
												$group: {
													_id: "null",
													'payoutDetails': { $first: '$payoutDetails' },
													"count": { $sum: 1 },
													"driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
													'orderDetails': { $push: "$orderDetails" }
												}
											},
											{
												$project: {
													'orderDetails': 1,
													'payoutDetails': 1,
													'count': 1,
													'driver_total': 1,
													//'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { $subtrsct: [  { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] },{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$$order.billings.amount.bir_tax_amount", 0] }] }, "$$order.billings.amount.bir_tax_amount", 0] } ] } } } }, - $iva
													"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
													"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },
												}
											},
											{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
											{ $sort: sort },
										/* 	{ '$skip': parseInt(skip) },
											{ '$limit': parseInt(limit) }, */
											{
												$project: {
													'orderDetails': 1,
													'payoutDetails': 1,
													'count': 1,
													'driver_total': 1,
													'admin_due': 1,
													'driver_due': 1,
												}
											},
											{
												$group: {
													_id: "null",
													"count": { $first: "$count" },
													"driver_total": { $first: '$driver_total' },
													"admin_due": { $first: '$admin_due' },
													"driver_due": { $first: '$driver_due' },
													"payoutDetails": { $first: "$payoutDetails" },
													'orderDetails': { $push: "$orderDetails" }
												}
											}
										];
									}

										cvsdata.query = condition;
										cvsdata.csv = [
										{ label: 'Order id', value: 'order_id' },
										{ label: 'Date', value: 'createdAt' },
										{ label: 'Payment Mode', value: 'payment_mode' },
										{ label: 'Customer paid amount ', value: 'grand_total' },
										{ label: 'Base fee ', value: 'baseprice' },
										{ label: 'Mile travelled fee', value: 'mile_fee' },
										{ label: 'Surge fee', value: 'surge_fee_amount' },
										{ label: 'Night fee ', value: 'night_fee_amount' },
										// { label: 'BIR Tax', value: 'bir_tax_amount' },
										{ label: 'Amount to driver', value: 'driver_commission' },
										{ label: 'Admin Payout / Due', value: 'admin_due' },
										{ label: 'Driver Payout / Due', value: 'driver_due' }
									  ];  								   
								   middlewares.jsontocsvdriverpaydetails(cvsdata, function (err, data) {
									   if (!err || data) {
										   if (data.status == 1) {
											   response.status = 1;
											   response.message = data.message;
											   res.send(response);
										   } else {
											   response.message = "No Data Found";
											   res.send(response);
										   }
									   } else {
										   response.message = "No Data Found";
										   res.send(response);
									   }
								   });

								}
							})
						}
					})	  
				
	}
	
	
	
	
	controller.exportDriverTranscations = function (req, res) {
		console.log('req.body',req.query)
			var query = {};
			var string_status ='';	
			
	    var filters = '';
		var searchs = '';
		var offer = false;
		// var limit = 10;
		/* if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		
		var sort = { sort_username: 1 } */
		var sort = { 'transactionDetails.createdAt': 1 }

	  
				var response = {};
				response.status = 0;
				var cvsdata = {};
				cvsdata.collection = 'driver_wallet';
				var driver_id;
				if (typeof req.query.driver_id != 'undefined') {
					if (isObjectId(req.query.driver_id)) {
						driver_id = new mongoose.Types.ObjectId(req.query.driver_id);
					} else {
						res.send({ status: '0', message: 'some key value missing.' });
						return;
					}
				} else {
					res.send({ status: '0', message: 'some key value missing.' });
					return;
				}
				if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
					filters = req.query.filters;
					if (filters != '') {
						filters = decodeURIComponent(filters);
						filters = decodeURIComponent(filters);
						var filterArray = filters.split('|');
						for (var i = 0; i < filterArray.length; i++) {
							if (filterArray[i] != '') {
								var option = filterArray[i].split(':');
								if (option.length > 1) {
									var values = [];
									if (option[1] != '') {
										values = option[1].split(',');
									}
									if (values.length > 0) {
										if (option[0] == 's') {
											if (values.length > 0) {
												start_time = values[0];
											}
										}
										if (option[0] == 'e') {
											if (values.length > 0) {
												end_time = values[0];
											}
										}
										if (option[0] == 'q') {
											if (values.length > 0) {
												searchs = values[0];
											}
										}

										if (option[0] == 'o') {
											if (values.length > 0) {
												sort = {};
												sort[values[0]] = parseInt(values[1]);
												//	console.log(sort)
											}
										}
									}
								}
							}

						}
					}
				}
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						if (err || !settings) {
							res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
						} else {
							db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
								if (err || !billingsettings) {
									res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
								} else {				
										
							var filter_query = { status: { $eq: 1 }, from : driver_id };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "createdAt": { $gte: new Date(parseInt(start_time)) } };
									console.log('data',data)
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "createdAt": { $lte: new Date(parseInt(end_time)) } };
									filter_query['$and'].push(data)
								}
							}
							//console.log('filter_query', filter_query)
							var condition = [
								{ "$match": filter_query },
								{
									$lookup: {
										from: "orders",
										let: {
											orderId: "$orderId",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$orderId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													order_id: "$order_id",
													_id: "$_id",
													billings: "$billings",
													driver_id: "$driver_id",
													status: "$status",
													baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] },
													minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] },
													extra_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },
													mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] },
													driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
													// 'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
													/* payment_mode: {
														"$cond": [{
															$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
														}, "$transactionDetails.type", '']
													} */
												}
											},
										],
										as: "orderDetails"
									}
								},
								{ "$unwind": { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										transactionDetails: {
											_id: "$_id",
											createdAt : "$createdAt",
											type : "$type",
											trans_type : {"$cond": [{ $ne: [{ "$ifNull": [ "$type", '' ]},'']},  {"$cond": [{ $eq: ['$type','admin_added_wallet_amount']},  "Credited by Admin",{"$cond": [{ $eq: ['$type','admin_removed_wallet_point']},  "Debited by Admin",{"$cond": [{ $eq: ['$type','driver_order_delivery']},  "Debit from Order Delivery",{"$cond": [{ $eq: ['$type','driver_order_pending_amount']},  "Debited due to Pending Balance",{"$cond": [{ $eq: ['$type','driver_recharge']},  "Drive Recharged by Paypal",""]}]}]}]}]},""]},
											credit: {"$cond": [{ $ne: [{ "$ifNull": [ "$type", '' ]},'']},  {"$cond": [{ $or: [{ $eq: ['$type','admin_added_wallet_amount']},{ $eq: ['$type','driver_recharge']}]}, "$amount", ""]}, ""]},
											debit: {"$cond": [{ $ne: [{ "$ifNull": [ "$type", '' ]},'']},  {"$cond": [{ $or: [{ $eq: ['$type','admin_removed_wallet_point']},{ $eq: ['$type','driver_order_delivery']},{ $eq: ['$type','driver_order_pending_amount']}]}, "$amount", ""]}, ""]},
											reason : "$reason",
											amount : "$amount",
											status : "$status",
											available_amount : "$available_amount",
											billings: "$orderDetails.billings",
											baseprice: "$orderDetails.baseprice",
											mile_fee: "$orderDetails.mile_fee",
											order_id: "$orderDetails.order_id",
											orderId: "$orderDetails._id",
											driver_commission: "$orderDetails.driver_commission",
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'transactionDetails': { $push: "$transactionDetails" }

									}
								},
								{
									$project: {
										'transactionDetails': 1,
										'count': 1
									}
								},
								{ $unwind: { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								/* { $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) }, */
								{
									$project: {
										'transactionDetails': 1,
										'count': 1
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										'transactionDetails': { $push: "$transactionDetails" }
									}
								}
							];
							cvsdata.query = condition;
							cvsdata.csv = [
							{ label: 'Date', value: 'createdAt' },
							{ label: 'Transcation Type', value: 'trans_type' },
							{ label: 'Credit', value: 'credit' },
							{ label: 'Debit', value: 'debit' },
							{ label: 'Balance', value: 'available_amount' }
						  ];  								   
					   middlewares.jsontocsvdrivertranscation(cvsdata, function (err, data) {
						   if (!err || data) {
							   if (data.status == 1) {
								   response.status = 1;
								   response.message = data.message;
								   res.send(response);
							   } else {
								   response.message = "No Data Found";
								   res.send(response);
							   }
						   } else {
							   response.message = "No Data Found";
							   res.send(response);
						   }
					   });

					}
				})
			}
		})	  
				
	}

	controller.exportrespayout = function (req, res) {
   
		
		var query = {};
		var string_status ='';		
  
			var response = {};
			response.status = 0;
			var cvsdata = {};
			var main_city = [];
		    var sub_city = [];
			cvsdata.collection = 'restaurant_earnings';
			var sort = { sort_username: 1 }
			
			var billing_id;
			if (typeof req.body.billing_id != 'undefined') {
				if (isObjectId(req.body.billing_id)) {
					billing_id = new mongoose.Types.ObjectId(req.body.billing_id);
				}
			}
				db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
					if (err || !settings) {
						res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
					} else {
						db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
							if (err || !billingsettings) {
								res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
							} else {
								if (typeof billing_id == 'undefined') {

									cvsdata.collection = 'orders';

									if (typeof billingsettings.settings.last_billed_time != 'undefined') {
										var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
									} else {
										var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
									}
									// var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) } };
									var filter_query = { status: { $eq: 7 } };
									var search_query = {};
									search_query['$or'] = [];
									if (req.body.searchs) {
										var data = { "sort_username": { $regex: req.body.searchs + '.*', $options: 'si' } };
										search_query['$or'].push(data);
										var data = { "sort_address": { $regex: req.body.searchs + '.*', $options: 'si' } };
										search_query['$or'].push(data);
									}
									if (search_query['$or'].length == 0) {
										delete search_query['$or'];
									}
									if (req.body.main_city) {
										filter_query.main_city = { $in: [req.body.main_city] };
									}
									if (req.body.sub_city) {
										filter_query.sub_city = { $in: [req.body.sub_city] };
									}
									if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
										filter_query['$and'] = [];
										if (typeof req.body.start_time != 'undefined') {
											var data = { "created_time": { $gte: parseInt(req.body.start_time) } };
											filter_query['$and'].push(data)
										}
										if (typeof req.body.end_time != 'undefined') {
											var data = { "created_time": { $lte: parseInt(req.body.end_time) } };
											filter_query['$and'].push(data)
										}
									}
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
													restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
													paid_commission:{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$paid_status", ''] }, ''] }, { $eq: ["$paid_status", 1] }]}, { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },0] },
													unpaid_commission:{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$paid_status", ''] }, ''] }, { $eq: ["$paid_status", 0] }]}, { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },0] }
												}
											}
										},
										{
											$group: {
												_id: "null",
												"count": { $sum: 1 },
												'orderDetails': { $push: "$orderDetails" }
											}
										},
										{
											$project: {
												'orderDetails': 1,
												'count': 1,
												'restaurant_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } },
												'paid_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.paid_commission", ''] }, ''] }, { $gte: ["$$order.paid_commission", 0] }] }, "$$order.paid_commission", 0] } } } },
												'unpaid_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.unpaid_commission", ''] }, ''] }, { $gte: ["$$order.unpaid_commission", 0] }] }, "$$order.unpaid_commission", 0] } } } },
		
											}
										},
										{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
										{ $lookup: { from: 'restaurant', localField: "orderDetails.restaurant_id", foreignField: "_id", as: "orderDetails.restaurantDetails" } },
										{ $unwind: { path: "$orderDetails.restaurantDetails", preserveNullAndEmptyArrays: true } },
										{
											$project: {
												'orderDetails': 1,
												'count': 1,
												'restaurant_total': 1,
												'paid_commission': 1,
												'unpaid_commission': 1,
												'sort_username': { $toLower: "$orderDetails.restaurantDetails.restaurantname" },
												'sort_address': { $toLower: "$orderDetails.restaurantDetails.address.fulladres" },
											}
										},
										{ "$match": search_query },
										{
											$group: {
												_id: "$orderDetails.restaurant_id",
												"count": { $first: '$count' },
												"restaurant_total": { $first: '$restaurant_total' },
												"paid_commission": { $first: '$paid_commission' },
												"unpaid_commission": { $first: '$unpaid_commission' },
												'username': { $first: "$orderDetails.restaurantDetails.restaurantname" },
												'sort_username': { $first: "$sort_username" },
												'sort_address': { $first: "$sort_address" },
												'phone': { $first: "$orderDetails.restaurantDetails.phone" },
												'address': { $first: "$orderDetails.restaurantDetails.address" },
												'_deliveries': { $sum: 1 },
												'restaurant_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
												'orderDetails': { $push: "$orderDetails" }
											}
										},
										 { $sort: sort },
									/*	{ '$skip': parseInt(skip) },
										{ '$limit': parseInt(limit) }, */
										{
											$project: {
												'count': 1,
												'restaurant_total': 1,
												'restaurantDetails': {
													'restaurant_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } },
													'_deliveries': { $size: "$orderDetails" },
													'username': "$username",
													'paid_commission': "$paid_commission",
													'unpaid_commission': "$unpaid_commission",
													'phone': "$phone",
													'address': "$address",
													'_id': '$_id',
													'range': { $literal: billing_id },
												}
											}
										},
										{
											$group: {
												_id: "null",
												"count": { $first: '$count' },
												"restaurant_total": { $first: '$restaurant_total' },
												'restaurantDetails': { $push: "$restaurantDetails" },
											}
										}
									];

									/* db.GetAggregation('orders', condition, function (err, docdata) {
										if (err || !docdata) {
											res.send({ status: '1', message: '', docdata:docdata});
										} else {
											res.send({ status: '1', message: '', docdata:docdata});
										
										}
									}) */
									
								} else {

									var filter_query = { 'orderDetails.status': { $eq: 7 } };
									if (req.body.searchs) {
										filter_query['$or'] = [];
										var data = { "driverDetails.username": { $regex: req.body.searchs + '.*', $options: 'si' } };
										filter_query['$or'].push(data);
										var data = { "driverDetails.address.fulladres": { $regex: req.body.searchs + '.*', $options: 'si' } };
										filter_query['$or'].push(data);
									}
									if (req.body.main_city) {
										filter_query['orderDetails.main_city'] = { $in: [req.body.main_city] };
									}
									if (req.body.sub_city) {
										filter_query['orderDetails.sub_city'] = { $in: [req.body.sub_city] };
									}
									if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
										filter_query['$and'] = [];
										if (typeof req.body.start_time != 'undefined') {
											var data = { "orderDetails.created_time": { $gte: parseInt(req.body.start_time) } };
											filter_query['$and'].push(data)
										}
										if (typeof req.body.end_time != 'undefined') {
											var data = { "orderDetails.created_time": { $lte: parseInt(req.body.end_time) } };
											filter_query['$and'].push(data)
										}
									}
							var condition = [
								{ "$match": { billing_id: billing_id } },
								{
									$project: {
										restaurant_id: "$restaurant_id",
										order_id: "$order_lists",
										payoutDetails: {
											paid_status: "$paid_status",
											driver_id: "$driver_id",
											type: { $literal: 'driver' },
											_id: "$_id",
											paid_date: "$paid_date",
											transaction_id: "$transaction_id",
											comments: "$comments",
										},
										order_count: { '$size': '$order_lists' },
									}
								},
								{ "$match": { order_count: { $gt: 0 } } },
								{ $lookup: { from: 'restaurant', localField: "restaurant_id", foreignField: "_id", as: "restaurantDetails" } },
								{ $unwind: { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										restaurant_id: "$restaurant_id",
										payoutDetails: "$payoutDetails",
										restaurantDetails: {
											username: "$restaurantDetails.restaurantname",
											_id: "$restaurantDetails._id",
											phone: "$restaurantDetails.phone",
											address: "$restaurantDetails.address",
											'sort_username': { $toLower: "$restaurantDetails.restaurantname" },
											'sort_address': { $toLower: "$restaurantDetails.address.fulladres" },
										},
										orderDetails: {
											order_id: "$orderDetails.order_id",
											_id: "$orderDetails._id",
											billings: "$orderDetails.billings",
											restaurant_id: "$orderDetails.restaurant_id",
											status: "$orderDetails.status",
											createdAt: "$orderDetails.createdAt",
											created_time: "$orderDetails.created_time",
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
										}
									}
								},
								{ "$match": filter_query },
								{
									$group: {
										_id: "$restaurant_id",
										"count": { $sum: 1 },
										'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'restaurantDetails': { $first: "$restaurantDetails" },
										'sort_username': { $first: "$restaurantDetails.sort_username" },
										'payoutDetails': { $first: "$payoutDetails" },
										'sort_address': { $first: "$restaurantDetails.sort_address" },
										'restaurant_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'_deliveries': { $sum: 1 },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								/* { $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) }, */
								{
									$project: {
										'count': 1,
										'restaurant_total': 1,
										'restaurantDetails': {
											'payoutDetails': '$payoutDetails',
											'restaurant_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } },
											'_deliveries': { $size: "$orderDetails" },
											'username': "$restaurantDetails.username",
											'phone': "$restaurantDetails.phone",
											'address': "$restaurantDetails.address",
											'_id': '$restaurantDetails._id',
											'range': { $literal: billing_id },
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$count", ''] }, ''] }, { $gte: ["$count", 0] }] }, "$count", 0] } },
										"restaurant_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$restaurant_total", ''] }, ''] }, { $gte: ["$restaurant_total", 0] }] }, "$restaurant_total", 0] } },
										'restaurantDetails': { $push: "$restaurantDetails" },
									}
								}
							];	 	 
									
						}

						//res.send({ status: '1', message: '', condition:condition});
					/* 	db.GetAggregation('restaurant_earnings', condition, function (err, docdata) {
							if (err || !docdata) {
								res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
							} else {
								res.send({ status: '1', message: '', docdata:docdata});
							}
						}) */
						
									cvsdata.query = condition;
									cvsdata.csv = [
									{ label: 'Restaurant Name', value: 'username' },
									{ label: 'Phone Number', value: 'phone' },
									{ label: 'Location', value: 'address' },
									{ label: 'Completed Deliveries', value: '_deliveries' },
									{ label: 'Restaurants Total Earnings', value: 'restaurant_commission' },
									{ label: 'Settled Amount', value: 'paid_commission' },
									{ label: 'Unsettled Amount', value: 'unpaid_commission' },
									{ label: 'Status', value: 'paid_status' }
								  ];  								   
							  middlewares.jsontocsvrespayout(cvsdata, function (err, data) {
								   if (!err || data) {
									   if (data.status == 1) {
										   response.status = 1;
										   response.message = data.message;
										   res.send(response);
									   } else {
										   response.message = "No Data Found";
										   res.send(response);
									   }
								   } else {
									   response.message = "No Data Found";
									   res.send(response);
								   }
							   }); 

							}
						})
					}
				})	  
			
}


controller.exportrestpaydetail = function (req, res) {
	// console.log("exportrestpaydetail",req.body);
	
	var query = {}; 
	var string_status ='';	
	
			var filters = '';
			var searchs = '';
			var offer = false;
			var limit = 10;
			if (req.query.limit) {
				var tmp = parseInt(req.query.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof req.query.pageId != 'undefined') {
				if (req.query.pageId) {
					var tmp = parseInt(req.query.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}

			var sort = { sort_username: 1 }


		var response = {};
		response.status = 0;
		var cvsdata = {};
		var main_city = [];
		var sub_city = [];
		cvsdata.collection = 'restaurant_earnings';
		var billing_id;
		if (typeof req.body.billing_id != 'undefined') {
			if (isObjectId(req.body.billing_id)) {
				billing_id = new mongoose.Types.ObjectId(req.body.billing_id);
			}
		}
		var restaurant_id;
		if (typeof req.body.restaurant_id != 'undefined') {
			if (isObjectId(req.body.restaurant_id)) {
				restaurant_id = new mongoose.Types.ObjectId(req.body.restaurant_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
				} else {
					db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
						if (err || !billingsettings) {
							res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
						} else {
							if (typeof billing_id == 'undefined') {

								cvsdata.collection = 'orders';
								if (typeof billingsettings.settings.last_billed_time != 'undefined') {
									var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
								} else {
									var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
								}
								
								var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, restaurant_id: restaurant_id };
								var search_query = {};
								search_query['$or'] = [];
								if (req.body.searchs) {
									// console.log("-------",req.body.searchs,"------")
									var data = { "order_id": { $regex: req.body.searchs + '.*', $options: 'si' } };
									search_query['$or'].push(data);

									//console.log("data----------",data)
									// var data = { "sort_address": { $regex: req.body.searchs + '.*', $options: 'si' } };
									// search_query['$or'].push(data);
								}
								if (search_query['$or'].length == 0) {
									delete search_query['$or'];
								}
								if (req.body.main_city) {
									filter_query.main_city = { $in: [req.body.main_city] };
								}
								if (req.body.sub_city) {
									filter_query.sub_city = { $in: [req.body.sub_city] };
								}
								if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
									filter_query['$and'] = [];
									if (typeof req.body.start_time != 'undefined') {
										var data = { "created_time": { $gte: parseInt(req.body.start_time) } };
										filter_query['$and'].push(data)
									}
									if (typeof req.body.end_time != 'undefined') {
										var data = { "created_time": { $lte: parseInt(req.body.end_time) } };
										filter_query['$and'].push(data)
									}
								}
							var condition = [
								{ "$match": search_query },

								
								{
									$project: {
										orderDetails: {
											order_id: "$order_id",
											_id: "$_id",
											billings: "$billings",
											restaurant_id: "$restaurant_id",
											status: "$status",
											createdAt: "$createdAt",
											item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
											refer_offer_price: { "$cond": [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, "$refer_offer_price", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
											'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
											'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
							     { $sort: sort },
							/*	{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) }, */
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"restaurant_total": { $first: "$restaurant_total" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];

								/* db.GetAggregation('orders', condition, function (err, docdata) {
									if (err || !docdata) {
										res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
									} else {
										res.send({ status: '1', message: '', docdata:docdata });
										
									}
								}) */
								
							} else {								
								cvsdata.collection = 'restaurant_earnings';

								var filter_query = { 'orderDetails.status': { $eq: 7 } };
								if (req.body.searchs) {
									filter_query['$or'] = [];
									var data = { "driverDetails.username": { $regex: req.body.searchs + '.*', $options: 'si' } };
									filter_query['$or'].push(data);
									var data = { "driverDetails.address.fulladres": { $regex: req.body.searchs + '.*', $options: 'si' } };
									filter_query['$or'].push(data);
								}
								if (req.body.main_city) {
									filter_query['orderDetails.main_city'] = { $in: [req.body.main_city] };
								}
								if (req.body.sub_city) {
									filter_query['orderDetails.sub_city'] = { $in: [req.body.sub_city] };
								}
								if (typeof req.body.start_time != 'undefined' || typeof req.body.end_time != 'undefined') {
									filter_query['$and'] = [];
									if (typeof req.body.start_time != 'undefined') {
										var data = { "orderDetails.created_time": { $gte: parseInt(req.body.start_time) } };
										filter_query['$and'].push(data)
									}
									if (typeof req.body.end_time != 'undefined') {
										var data = { "orderDetails.created_time": { $lte: parseInt(req.body.end_time) } };
										filter_query['$and'].push(data)
									}
								}
							var condition = [
								{ "$match": { billing_id: billing_id, restaurant_id: restaurant_id } },

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
								{ "$match": { order_count: { $gt: 0 } } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$orderDetails.transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },

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
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] },
											refer_offer_price: { "$cond": [{ $ne: [{ "$ifNull": ["$orderDetails.refer_offer_price", ''] }, ''] }, "$orderDetails.refer_offer_price", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.night_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.night_fee", 0] }] }, "$orderDetails.billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.surge_fee", 0] }] }, "$orderDetails.billings.amount.surge_fee", 0] }] },
											'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] },
											'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] },
											'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},
										}
									}
								},
								
								{ "$match": filter_query },
								 
								{
									$group: {
										_id: "null",
										payoutDetails: { $first: "$payoutDetails" },
										"count": { $sum: 1 },
										'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" },
									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"payoutDetails": { $first: "$payoutDetails" },
										"restaurant_total": { $first: "$restaurant_total" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];
								
						}

								cvsdata.query = condition;
								cvsdata.csv = [
								{ label: 'Order id', value: 'order_id' },
								{ label: 'Date', value: 'createdAt' },
								{ label: 'Payment Mode', value: 'payment_mode' },
								{ label: 'Item amount ', value: 'item_total' },
								{ label: 'Site commission', value: 'site_total' },
								{ label: 'Tax', value: 'service_tax' },
								{ label: 'Offer discount', value: 'food_offer_price' },
								{ label: 'Packing charge', value: 'package_charge' },
								{ label: 'Restaurant earnings', value: 'restaurant_commission' }
							  ];  	
							  // console.log("cvsdata",cvsdata)							   
						   middlewares.jsontocsvrestpaydetails(cvsdata, function (err, data) {
							   if (!err || data) {
								   if (data.status == 1) {
									   response.status = 1;
									   response.message = data.message;
									   res.send(response);
								   } else {
									   response.message = "No Data Found";
									   res.send(response);
								   }
							   } else {
								   response.message = "No Data Found";
								   res.send(response);
							   }
						   });

						}
					})
				}
			})	  
		
}

	controller.getOrderDetails = function (req, res) {
		//	console.log('getOrderDetails')
		var orderId;
		if (typeof req.body.orderId != 'undefined') {
			if (isObjectId(req.body.orderId)) {
				orderId = new mongoose.Types.ObjectId(req.body.orderId);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', restaurantDetails: {}, orderDetails: {}, userDetails: {}, driverDetails: {} });
			} else {
				var filter_query = { _id: orderId, status: { $eq: 7 } };
				var condition = [
					{ "$match": filter_query },
					{ '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
					{ "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
					{ '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
					{ "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
					{ '$lookup': { from: 'drivers', localField: 'driver_id', foreignField: '_id', as: 'driverDetails' } },
					{ "$unwind": { path: "$driverDetails", preserveNullAndEmptyArrays: true } },
					{ '$lookup': { from: 'city', localField: 'restaurantDetails.main_city', foreignField: 'cityname', as: 'cityDetails' } },
					{ "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
					{
						$project: {
							restaurantDetails: {
								"name": "$restaurantDetails.restaurantname",
								"status": "$restaurantDetails.status",
								"avail": "$restaurantDetails.avail",
								"phone": "$restaurantDetails.phone",
								"address": "$restaurantDetails.address",
								"availability": "$restaurantDetails.availability",
								"location": "$restaurantDetails.location",
								"email": "$restaurantDetails.email",
								"unique_code": "$restaurantDetails.unique_code",
								"time_setting": "$restaurantDetails.time_setting",
								"offer": "$restaurantDetails.offer",
								"avatar": "$restaurantDetails.avatar",
								"_id": "$restaurantDetails._id"
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
							driverDetails: {
								"name": "$driverDetails.username",
								"status": "$driverDetails.status",
								"phone": "$driverDetails.phone",
								"address": "$driverDetails.address",
								"location": "$driverDetails.location",
								"email": "$driverDetails.email",
								"avatar": "$driverDetails.avatar",
								"_id": "$driverDetails._id",
							},
							orderDetails: {
								order_id: "$order_id",
								_id: "$_id",
								billings: "$billings",
								coupon_code: "$coupon_code",
								delivery_address: "$delivery_address",
								foods: "$foods",
								status: "$status",
								createdAt: "$createdAt",
								deliver_distance: "$deliver_distance",
								extra_fare_commision: "$extra_fare_commision",
								night_fare_commision: "$night_fare_commision",
								refer_offer_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] },
								item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
								baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] },
								extra_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },
								format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }] }, "$driver_fare.format", ''] },
								mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] },
								surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] },
								night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] },
								driver_amount: { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] }] },
								// bir_tax: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
								pickup_distance: "$pickup_distance",
								driver_fare: "$driver_fare",
								mileages_travelled: "$mileages_travelled",
								extra_fare_commision: "$extra_fare_commision",
								night_fare_commision: "$night_fare_commision",
								grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
								delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
								coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
								driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
								restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
								'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
								'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
								'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
								'final_earnings': { $subtract: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, { $sum: [{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] }] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }] },
							}
						}
					}
				];
				db.GetAggregation('orders', condition, function (err, docdata) {
					//	console.log(err, docdata)
					if (err || !docdata) {
						res.send({ status: '1', message: '', restaurantDetails: {}, orderDetails: {}, userDetails: {}, driverDetails: {} });
					} else {
						var count = 0;
						if (docdata.length > 0) {

							var restaurantDetails = {};
							var orderDetails = {};
							var userDetails = {};
							if (typeof docdata[0].restaurantDetails != 'undefined') {
								restaurantDetails = docdata[0].restaurantDetails;
							}
							/* if(typeof docdata[0].orderDetails != 'undefined' ){
								orderDetails = docdata[0].orderDetails;
								 orderDetails.mile_fee = 0; 
								orderDetails.surge_night_fee = 0; 
								if(typeof orderDetails.baseprice != 'undefined'){
									orderDetails.baseprice = parseInt(orderDetails.baseprice);
								}
								if(typeof orderDetails.extra_price != 'undefined' && typeof orderDetails.mileages_travelled != 'undefined'){
									orderDetails.mile_fee = parseInt(orderDetails.extra_price) * parseInt(orderDetails.mileages_travelled)
								}
								var night_fare_commision_amount = 0;
								var extra_fare_commision_amount = 0;
								if (orderDetails.billings.amount.night_fee > 0) {
									if (typeof orderDetails.night_fare_commision != 'undefined' && parseInt(orderDetails.night_fare_commision) > 0) {
										night_fare_commision_amount = orderDetails.billings.amount.night_fee * (parseInt(orderDetails.night_fare_commision) / 100);
									}
								}
								if (orderDetails.billings.amount.surge_fee > 0) {
									if (typeof orderDetails.extra_fare_commision != 'undefined' && parseInt(orderDetails.extra_fare_commision) > 0) {
										extra_fare_commision_amount = orderDetails.billings.amount.surge_fee * (parseInt(orderDetails.extra_fare_commision) / 100);
									}
								}
								orderDetails.surge_night_fee = night_fare_commision_amount + extra_fare_commision_amount;
								if(typeof orderDetails.extra_price != 'undefined' && typeof orderDetails.mileages_travelled != 'undefined'){
									orderDetails.mile_fee = parseInt(orderDetails.extra_price) * parseInt(orderDetails.mileages_travelled)
								}
							}
							orderDetails.driver_amount = orderDetails.mile_fee + orderDetails.surge_night_fee + orderDetails.baseprice; */
							if (typeof docdata[0].orderDetails != 'undefined') {
								orderDetails = docdata[0].orderDetails;
							}
							if (typeof docdata[0].userDetails != 'undefined') {
								userDetails = docdata[0].userDetails;
							}
							if (typeof docdata[0].driverDetails != 'undefined') {
								driverDetails = docdata[0].driverDetails;
							}

							res.send({ status: '1', message: '', userDetails: userDetails, restaurantDetails: restaurantDetails, orderDetails: orderDetails, driverDetails: driverDetails });
						} else {
							res.send({ status: '1', message: '', restaurantDetails: {}, orderDetails: {}, userDetails: {}, driverDetails: {} });
						}
					}
				})
			}
		})
	}
	controller.fetchCycle = (req, res) => {
		/* db.GetDocument('billing',{},{},{},(err,ress)=>{
		  var result = [];
		  for(i in ress){
			result.push({billingcycle:ress[i].billingcycle,id:ress[i]._id,end_date:ress[i].end_date});
		  }
		  if(result.length > 0){
			  var d = moment(new Date(result[result.length-1].end_date)).format("YYYY/MM/DD");
			  var str = d + '- till now';
			  result.push({billingcycle:str,end_date:''});
		  }else{
			  var d = moment(new Date()).format("YYYY/MM/DD");
			  var str = d + '- till now';
			  result.push({billingcycle:str,end_date:''});
		  }
		  res.send({status:1,response:result});
		}) */
		db.GetDocument('billing', {}, {}, {}, (err, ress) => {
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				//console.log('settings.settings.time_zone',timezone.tz(ress[0].start_date, settings.settings.time_zone).format(settings.settings.date_format))
				var result = [];
				for (i in ress) {
					var from_date = timezone.tz(ress[i].start_date, settings.settings.time_zone).format(settings.settings.date_format);
					var to_date = timezone.tz(ress[i].end_date, settings.settings.time_zone).format(settings.settings.date_format);
					result.push({ billingcycle: from_date + ' - ' + to_date, id: ress[i]._id, end_date: ress[i].end_date });
				}
				if (result.length > 0) {
					var d = timezone.tz(new Date(result[result.length - 1].end_date), settings.settings.time_zone).format(settings.settings.date_format);
				} else {
					var d = timezone.tz(new Date(), settings.settings.time_zone).format(settings.settings.date_format);
				}
				var str = d + ' - till now';
				result.push({ billingcycle: str, end_date: '' });
				res.send({ status: 1, response: result });
			})
		})
	}

	controller.driverEarnings = function (req, res) {
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var billing_id;
		var sort = { sort_username: 1 }
		// c - means city 
		// l - means location 
		// s - means Starting Time 
		// e - means end time 
		// q - means search query  
		// r - means range  
		// o - means sort order
		if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
			filters = req.query.filters;
			if (filters != '') {
				filters = decodeURIComponent(filters);
				filters = decodeURIComponent(filters);
				var filterArray = filters.split('|');
				for (var i = 0; i < filterArray.length; i++) {
					if (filterArray[i] != '') {
						var option = filterArray[i].split(':');
						if (option.length > 1) {
							var values = [];
							if (option[1] != '') {
								values = option[1].split(',');
							}
							if (values.length > 0) {
								if (option[0] == 'c') {
									main_city = values;
								}
								if (option[0] == 'l') {
									sub_city = values;
								}
								if (option[0] == 's') {
									if (values.length > 0) {
										start_time = values[0];
									}
								}
								if (option[0] == 'e') {
									if (values.length > 0) {
										end_time = values[0];
									}
								}
								if (option[0] == 'q') {
									if (values.length > 0) {
										searchs = values[0];
									}
								}
								if (option[0] == 'r') {
									if (values.length > 0) {
										var reangeValue = values[0];
										if (typeof reangeValue != 'undefined') {
											if (isObjectId(reangeValue)) {
												billing_id = new mongoose.Types.ObjectId(reangeValue);
											}
										}
									}
								}
								if (option[0] == 'o') {
									if (values.length > 0) {
										sort = {};
										sort[values[0]] = parseInt(values[1]);
										//console.log(sort)
									}
								}
							}
						}
					}

				}
			}
		}
		//console.log('asdas',sort)
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
			} else {
				db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
					if (err || !billingsettings) {
						res.send({ status: '0', message: 'Configure your app settings', count: count, driverDetails: [], driver_total: 0 });
					} else {
						if (typeof billing_id == 'undefined') {
							if (typeof billingsettings.settings.last_billed_time != 'undefined') {
								var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
							} else {
								var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
							}
							// var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) } };
							var filter_query = { status: { $eq: 7 } };
							var search_query = {};
							search_query['$or'] = [];
							if (searchs != '') {
								var data = { "sort_username": { $regex: searchs + '.*', $options: 'si' } };
								search_query['$or'].push(data);
								var data = { "sort_address": { $regex: searchs + '.*', $options: 'si' } };
								search_query['$or'].push(data);
							}
							if (search_query['$or'].length == 0) {
								delete search_query['$or'];
							}
							if (main_city.length > 0) {
								filter_query.main_city = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query.sub_city = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}
							var condition = [
								{ "$match": filter_query },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										orderDetails: {
											order_id: "$order_id",
											_id: "$_id",
											billings: "$billings",
											driver_id: "$driver_id",
											status: "$status",
											createdAt: "$createdAt",
											transactionDetails: "$transactionDetails",
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, { $multiply: ["$billings.amount.total", { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }] }] },
											admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] },
											//var restaurant_commission = (customar_paid_amount + package_charge) - (offer_discount + food_offer_price  + ((customar_paid_amount - (offer_discount + food_offer_price)) * applied_admin_percentage));
											driver_due: {
												"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
													$subtract: [{
														$subtract: [{
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																{ $gte: ["$billings.amount.grand_total", 0] }]
															}, "$billings.amount.grand_total", 0]
														},
														{
															$sum: [{
																$subtract: [{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																			{ $gte: ["$billings.amount.total", 0] }]
																		}, "$billings.amount.total", 0]
																	},
																	/* {
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																			{ $gte: ["$billings.amount.service_tax", 0] }]
																		}, "$billings.amount.service_tax", 0]
																	}, */
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																			{ $gte: ["$billings.amount.package_charge", 0] }]
																		}, "$billings.amount.package_charge", 0]
																	}]
																},
																{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																			{ $gte: ["$billings.amount.offer_discount", 0] }]
																		}, "$billings.amount.offer_discount", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																			{ $gte: ["$billings.amount.food_offer_price", 0] }]
																		}, "$billings.amount.food_offer_price", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{
																				$gte: [{
																					$subtract: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																							{ $gte: ["$billings.amount.total", 0] }]
																						}, "$billings.amount.total", 0]
																					},
																					{
																						$sum: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																								{ $gte: ["$billings.amount.offer_discount", 0] }]
																							}, "$billings.amount.offer_discount", 0]
																						},
																						{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																								{ $gte: ["$billings.amount.food_offer_price", 0] }]
																							}, "$billings.amount.food_offer_price", 0]
																						}]
																					}]
																				}, 0]
																			}]
																		},
																		{
																			$multiply: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$billings.amount.offer_discount", 0] }]
																						}, "$billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$billings.amount.food_offer_price", 0] }]
																						}, "$billings.amount.food_offer_price", 0]
																					}]
																				}]
																			},
																			{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																		}, 0]
																	}]
																}]
															}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
												}, 0]
											},
										}
									}
								},



								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
										"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
										"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },

									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'drivers', localField: "orderDetails.driver_id", foreignField: "_id", as: "orderDetails.driverDetails" } },
								{ $unwind: { path: "$orderDetails.driverDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
										'sort_username': { $toLower: "$orderDetails.driverDetails.username" },
										'sort_address': { $toLower: "$orderDetails.driverDetails.address.fulladres" },
									}
								},
								{ "$match": search_query },
								{
									$group: {
										_id: "$orderDetails.driver_id",
										"count": { $sum: 1 },
										"driver_total": { $first: '$driver_total' },
										"admin_due": { $first: '$admin_due' },
										"driver_due": { $first: '$driver_due' },
										'username': { $first: "$orderDetails.driverDetails.username" },
										'wallet_amount': { $first: "$orderDetails.driverDetails.wallet_settings.available" },
										'sort_username': { $first: "$sort_username" },
										'sort_address': { $first: "$sort_address" },
										'phone': { $first: "$orderDetails.driverDetails.phone" },
										'address': { $first: "$orderDetails.driverDetails.address" },
										'_deliveries': { $sum: 1 },
										'driver_due': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_due", ''] }, ''] }, { $gte: ["$orderDetails.driver_due", 0] }] }, "$orderDetails.driver_due", 0] } },
										'admin_due': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.admin_due", ''] }, ''] }, { $gte: ["$orderDetails.admin_due", 0] }] }, "$orderDetails.admin_due", 0] } },
										'driver_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
										'driverDetails': {
											'driver_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
											'driver_due': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.driver_due", 0] } } } },
											'admin_due': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
											'_deliveries': { $size: "$orderDetails" },
											'username': "$username",
											'wallet_amount': "$wallet_amount",
											'phone': "$phone",
											'address': "$address",
											'_id': '$_id',
											'range': { $literal: billing_id },
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										"driver_total": { $first: '$driver_total' },
										"admin_due": { $first: '$admin_due' },
										"driver_due": { $first: '$driver_due' },
										'driverDetails': { $push: "$driverDetails" },
									}
								}
							];							

							db.GetAggregation('orders', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
								} else {
									var count = 0;
									if (docdata.length > 0) {
										var driver_total = 0;
										var admin_due = 0;
										var driver_due = 0;
										var driverDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].driverDetails != 'undefined') {
											driverDetails = docdata[0].driverDetails;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].driver_due != 'undefined') {
											driver_due = docdata[0].driver_due;
										}
										if (typeof docdata[0].admin_due != 'undefined') {
											admin_due = docdata[0].admin_due;
										}
										res.send({ status: '1', message: '', count: count, driverDetails: driverDetails, driver_total: driver_total, admin_due: admin_due, driver_due: driver_due });
									} else {
										res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
									}
								}
							})
						} else {
							var filter_query = { 'orderDetails.status': { $eq: 7 } };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "driverDetails.username": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
								var data = { "driverDetails.address.fulladres": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query['orderDetails.main_city'] = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query['orderDetails.sub_city'] = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "orderDetails.created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "orderDetails.created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}

							var condition = [
								{ "$match": { billing_id: billing_id } },
								{
									$project: {
										driver_id: "$driver_id",
										payoutDetails: {
											paid_status: "$paid_status",
											driver_id: "$driver_id",
											type: { $literal: 'driver' },
											_id: "$_id",
											paid_date: "$paid_date",
											transaction_id: "$transaction_id",
											comments: "$comments",
										},
										order_id: "$order_lists",
										order_count: { '$size': '$order_lists' },
									}
								},
								{ "$match": { order_count: { $gt: 0 } } },
								{ $lookup: { from: 'drivers', localField: "driver_id", foreignField: "_id", as: "driverDetails" } },
								{ $unwind: { path: "$driverDetails", preserveNullAndEmptyArrays: true } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$orderDetails.transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										driver_id: "$driver_id",
										payoutDetails: "$payoutDetails",
										driverDetails: {
											username: "$driverDetails.username",
											_id: "$driverDetails._id",
											phone: "$driverDetails.phone",
											address: "$driverDetails.address",
											'sort_username': { $toLower: "$driverDetails.username" },
											'sort_address': { $toLower: "$driverDetails.address.fulladres" },
										},
										orderDetails: {
											order_id: "$orderDetails.order_id",
											_id: "$orderDetails._id",
											billings: "$orderDetails.billings",
											driver_id: "$orderDetails.driver_id",
											status: "$orderDetails.status",
											createdAt: "$orderDetails.createdAt",
											created_time: "$orderDetails.created_time",
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											'final_earnings': {
												$subtract: [{
													$subtract: [{
														"$cond": [{
															$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.grand_total", ''] }, ''] },
															{ $gte: ["$billings.amount.grand_total", 0] }]
														}, "$orderDetails.billings.amount.grand_total", 0]
													},
													{
														$sum: [{
															$subtract: [{
																$sum: [{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																		{ $gte: ["$billings.amount.total", 0] }]
																	}, "$orderDetails.billings.amount.total", 0]
																},
																/* {
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] },
																		{ $gte: ["$orderDetails.billings.amount.service_tax", 0] }]
																	}, "$orderDetails.billings.amount.service_tax", 0]
																}, */
																{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] },
																		{ $gte: ["$orderDetails.billings.amount.package_charge", 0] }]
																	}, "$orderDetails.billings.amount.package_charge", 0]
																}]
															},
															{
																$sum: [{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] },
																		{ $gte: ["$orderDetails.billings.amount.offer_discount", 0] }]
																	}, "$orderDetails.billings.amount.offer_discount", 0]
																},
																{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] },
																		{ $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }]
																	}, "$orderDetails.billings.amount.food_offer_price", 0]
																},
																{
																	"$cond": [{
																		$and: [{
																			$gte: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] },
																						{ $gte: ["$orderDetails.billings.amount.total", 0] }]
																					}, "$orderDetails.billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$orderDetails.billings.amount.offer_discount", 0] }]
																						}, "$orderDetails.billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }]
																						}, "$orderDetails.billings.amount.food_offer_price", 0]
																					}]
																				}]
																			}, 0]
																		}]
																	},
																	{
																		$multiply: [{
																			$subtract: [{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] },
																					{ $gte: ["$orderDetails.billings.amount.total", 0] }]
																				}, "$orderDetails.billings.amount.total", 0]
																			},
																			{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] },
																						{ $gte: ["$orderDetails.billings.amount.offer_discount", 0] }]
																					}, "$orderDetails.billings.amount.offer_discount", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] },
																						{ $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }]
																					}, "$orderDetails.billings.amount.food_offer_price", 0]
																				}]
																			}]
																		},
																		{ $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }]
																	}, 0]
																}]
															}]
														}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] }]
													}]
												}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
											},
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, { $multiply: ["$orderDetails.billings.amount.total", { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }] }] },
											admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] }] },
											driver_due: {
												"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
													$subtract: [{
														"$cond": [{
															$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.grand_total", ''] }, ''] },
															{ $gte: ["$orderDetails.billings.amount.grand_total", 0] }]
														}, "$orderDetails.billings.amount.grand_total", 0]
													},
													{
														$sum: [{
															$subtract: [{
																$sum: [{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] },
																		{ $gte: ["$orderDetails.billings.amount.total", 0] }]
																	}, "$orderDetails.billings.amount.total", 0]
																},
																/* {
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																		{ $gte: ["$orderDetails.billings.amount.service_tax", 0] }]
																	}, "$orderDetails.billings.amount.service_tax", 0]
																}, */
																{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																		{ $gte: ["$billings.amount.package_charge", 0] }]
																	}, "$billings.amount.package_charge", 0]
																}]
															},
															{
																$sum: [{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																		{ $gte: ["$billings.amount.offer_discount", 0] }]
																	}, "$billings.amount.offer_discount", 0]
																},
																{
																	"$cond": [{
																		$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																		{ $gte: ["$billings.amount.food_offer_price", 0] }]
																	}, "$billings.amount.food_offer_price", 0]
																},
																{
																	"$cond": [{
																		$and: [{
																			$gte: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$billings.amount.offer_discount", 0] }]
																						}, "$billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$billings.amount.food_offer_price", 0] }]
																						}, "$billings.amount.food_offer_price", 0]
																					}]
																				}]
																			}, 0]
																		}]
																	},
																	{
																		$multiply: [{
																			$subtract: [{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																					{ $gte: ["$billings.amount.total", 0] }]
																				}, "$billings.amount.total", 0]
																			},
																			{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																						{ $gte: ["$billings.amount.offer_discount", 0] }]
																					}, "$billings.amount.offer_discount", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																						{ $gte: ["$billings.amount.food_offer_price", 0] }]
																					}, "$billings.amount.food_offer_price", 0]
																				}]
																			}]
																		},
																		{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																	}, 0]
																}]
															}]
														}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] }]
													}]
												}, 0]
											},
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},
										}
									}
								},
								{ "$match": filter_query },
								{
									$group: {
										_id: "$driver_id",
										'driverDetails': { $first: "$driverDetails" },
										'payoutDetails': { $first: "$payoutDetails" },
										'sort_username': { $first: "$driverDetails.sort_username" },
										'sort_address': { $first: "$driverDetails.sort_address" },
										'admin_due': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.admin_due", ''] }, ''] }, { $gte: ["$orderDetails.admin_due", 0] }] }, "$orderDetails.admin_due", 0] } },
										'driver_due': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_due", ''] }, ''] }, { $gte: ["$orderDetails.driver_due", 0] }] }, "$orderDetails.driver_due", 0] } },
										'driver_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'_deliveries': { $sum: 1 },
										"count": { $sum: 1 },
										'driver_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'count': 1,
										'driver_total': 1,
										'driver_due': 1,
										'admin_due': 1,
										'driverDetails': {
											'driver_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
											'driver_due': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.driver_due", 0] } } } },
											'admin_due': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
											'_deliveries': { $size: "$orderDetails" },
											'username': "$driverDetails.username",
											'phone': "$driverDetails.phone",
											'payoutDetails': "$payoutDetails",
											'address': "$driverDetails.address",
											'_id': '$driverDetails._id',
											'range': { $literal: billing_id },
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$count", ''] }, ''] }, { $gte: ["$count", 0] }] }, "$count", 0] } },
										"driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_total", ''] }, ''] }, { $gte: ["$driver_total", 0] }] }, "$driver_total", 0] } },
										"admin_due": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$admin_due", ''] }, ''] }, { $gte: ["$admin_due", 0] }] }, "$admin_due", 0] } },
										"driver_due": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_due", ''] }, ''] }, { $gte: ["$driver_due", 0] }] }, "$driver_due", 0] } },
										'driverDetails': { $push: "$driverDetails" },
									}
								}
							];
							//res.send({ status: '1', message: '', condition: condition});
							//return false;
							db.GetAggregation('driver_earnings', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0 });
								} else {
									var count = 0;
									if (docdata.length > 0) {

										var driver_total = 0;
										var driver_due = 0;
										var admin_due = 0;
										var driverDetails = [];
										var payoutDetails = {};
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].driverDetails != 'undefined') {
											driverDetails = docdata[0].driverDetails;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].driver_due != 'undefined') {
											driver_due = docdata[0].driver_due;
										}
										if (typeof docdata[0].admin_due != 'undefined') {
											admin_due = docdata[0].admin_due;
										}
										if (typeof docdata[0].payoutDetails != 'undefined') {
											payoutDetails = docdata[0].payoutDetails;
										}
										//console.log("--------------PRABHAT", driverDetails)
										res.send({ status: '1', message: '', count: count, driverDetails: driverDetails, driver_total: driver_total, payoutDetails: payoutDetails, admin_due: admin_due, driver_due: driver_due });
									} else {
										res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, driver_due: 0, admin_due: 0 });
									}
								}
							})
						}
					}
				})
			}
		})
	}







	// controller.getDriverOrderEarnings = function (req, res) {
	// 	console.log(req.query)
	// 	var filters = '';
	// 	var searchs = '';
	// 	var offer = false;
	// 	var limit = 10;
	// 	if (req.query.limit) {
	// 		var tmp = parseInt(req.query.limit);
	// 		if (tmp != NaN && tmp > 0) {
	// 			limit = tmp;
	// 		}
	// 	}
	// 	var skip = 0;
	// 	if (typeof req.query.pageId != 'undefined') {
	// 		if (req.query.pageId) {
	// 			var tmp = parseInt(req.query.pageId);
	// 			if (tmp != NaN && tmp > 0) {
	// 				skip = (tmp * limit) - limit;
	// 			}
	// 		}
	// 	}
	// 	var billing_id;
	// 	if( typeof req.query.billing_id !='undefined' && req.query.billing_id != ''){
	// 		if(isObjectId(req.query.billing_id)){
	// 			billing_id = new mongoose.Types.ObjectId(req.query.billing_id);
	// 		}else{
	// 			res.send({status: '0', message: 'some key value missing.'});
	// 			return;
	// 		}
	// 	}
	// 	var driver_id;
	// 	if( typeof req.query.driver_id !='undefined' ){
	// 		if(isObjectId(req.query.driver_id)){
	// 			driver_id = new mongoose.Types.ObjectId(req.query.driver_id);
	// 		}else{
	// 			res.send({status: '0', message: 'some key value missing.'});
	// 			return;
	// 		}
	// 	}else{
	// 		res.send({status: '0', message: 'some key value missing.'});
	// 		return;
	// 	}
	// 	var main_city = [];
	// 	var sub_city = [];
	// 	var start_time;
	// 	var end_time;
	// 	var sort = {sort_username:1}
	// 	// c - means city 
	// 	// l - means location 
	// 	// s - means Starting Time 
	// 	// e - means end time 
	// 	// q - means search query  
	// 	// r - means range  
	// 	// o - means sort order
	// 	if(typeof req.query.filters !='undefined' && req.query.filters != ''){
	// 		filters = req.query.filters;
	// 		if(filters!=''){
	// 			filters = decodeURIComponent(filters); 
	// 			filters = decodeURIComponent(filters); 
	// 			var filterArray = filters.split('|');
	// 			for(var i=0;i<filterArray.length;i++ ){
	// 				if(filterArray[i] != ''){
	// 					var option = filterArray[i].split(':');
	// 					if(option.length > 1){
	// 						var values = [];
	// 						if(option[1]!= ''){
	// 							values = option[1].split(',');
	// 						}
	// 						if(values.length > 0){
	// 							if(option[0] == 'c'){
	// 								main_city = values;
	// 							}
	// 							if(option[0] == 'l'){
	// 								sub_city = values;
	// 							}
	// 							if(option[0] == 's'){
	// 								if(values.length > 0){
	// 									start_time = values[0];
	// 								}
	// 							}
	// 							if(option[0] == 'e'){
	// 								if(values.length > 0){
	// 									end_time = values[0];
	// 								}
	// 							}
	// 							if(option[0] == 'q'){
	// 								if(values.length > 0){
	// 									searchs = values[0];
	// 								}
	// 							}

	// 							if(option[0] == 'o'){
	// 								if(values.length > 0){
	// 									sort={};
	// 									sort[values[0]] = parseInt(values[1]);
	// 								//	console.log(sort)
	// 								}
	// 							}
	// 						}
	// 					}
	// 				}

	// 			}
	// 		}
	// 	}
	// 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
	// 		if (err || !settings) {
	// 			res.send({status: '0', message: 'Configure your app settings',count:0,orderDetails:[],driver_total:0});
	// 		} else {
	// 			db.GetOneDocument('settings', {"alias":"billing_cycle"}, {}, {}, function (err, billingsettings) {
	// 				if (err || !billingsettings) {
	// 					res.send({status: '0', message: 'Configure your app settings',count:0,orderDetails:[],driver_total:0});
	// 				} else {
	// 					if(typeof billing_id == 'undefined'){
	// 						if(typeof billingsettings.settings.last_billed_time != 'undefined'){
	// 							var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
	// 						}else{
	// 							var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
	// 						}

	// 						var filter_query = { status: { $eq: 7 },"created_time": { $gte: parseInt(last_billed_time)},'driver_id':driver_id};
	// 						if (searchs!='') {
	// 							filter_query['$or'] = [];
	// 							var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
	// 							filter_query['$or'].push(data);
	// 						 }
	// 						 if(main_city.length > 0){
	// 							filter_query.main_city = {$in : main_city };
	// 						 }
	// 						 if(sub_city.length > 0){
	// 							filter_query.sub_city = {$in : sub_city };
	// 						 }
	// 						 if(typeof start_time != 'undefined' || typeof end_time != 'undefined'){
	// 							filter_query['$and'] = [];
	// 							if(typeof start_time != 'undefined'){
	// 								var data = {"created_time": { $gte: parseInt(start_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 							if(typeof end_time != 'undefined'){
	// 								var data = {"created_time": { $lte: parseInt(end_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 						 }
	// 						 console.log('filter_query',filter_query)
	// 						var condition = [
	// 							{"$match": filter_query},
	// 							{
	// 								$project: {
	// 									orderDetails:{
	// 										order_id:"$order_id",
	// 										_id:"$_id",
	// 										billings:"$billings",
	// 										driver_id:"$driver_id",
	// 										status:"$status",
	// 										createdAt:"$createdAt",
	// 										baseprice:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.baseprice", '' ]},'']},{ $gte: ["$driver_fare.baseprice",0]}] },"$driver_fare.baseprice",0]},
	// 										format:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.format", '' ]},'']}] },"$driver_fare.format",'']},
	// 										minimum_distance:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$driver_fare.minimum_distance",0]}] },"$driver_fare.minimum_distance",0]},
	// 										extra_price:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.extra_price", '' ]},'']},{ $gte: ["$driver_fare.extra_price",0]}] },"$driver_fare.extra_price",0]},
	// 										mile_fee:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.format", '' ]},'']},{ $eq: ["$driver_fare.format",'mile']}] },{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$mileages_travelled", '' ]},'']},{ $gte: ["$mileages_travelled",0]}] },{ $multiply: [ {"$cond": [{ $and: [{ $gt: [{ $subtract: [ { $divide: [ "$mileages_travelled", 1.609344] } , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$driver_fare.minimum_distance",0]}] },"$driver_fare.minimum_distance",0]} ] },0]}] },{ $subtract: [ { $divide: [ "$mileages_travelled", 1.609344] } , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$driver_fare.minimum_distance",0]}] },"$driver_fare.minimum_distance",0]} ] },0]}, {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.extra_price", '' ]},'']},{ $gte: ["$driver_fare.extra_price",0]}] },"$driver_fare.extra_price",0]},  ] },0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$mileages_travelled", '' ]},'']},{ $gte: ["$mileages_travelled",0]}] },{ $multiply: [ {"$cond": [{ $and: [{ $gt: [{ $subtract: [ "$mileages_travelled" , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$driver_fare.minimum_distance",0]}] },"$driver_fare.minimum_distance",0]} ] },0]}] },{ $subtract: [ "$mileages_travelled" , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$driver_fare.minimum_distance",0]}] },"$driver_fare.minimum_distance",0]} ] },0]}, {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$driver_fare.extra_price", '' ]},'']},{ $gte: ["$driver_fare.extra_price",0]}] },"$driver_fare.extra_price",0]},  ] },0]}]},
	// 										surge_fee_amount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.surge_fee", '' ]},'']},{ $gte: ["$billings.amount.surge_fee",0]}] },{ $multiply: [ "$billings.amount.surge_fee", {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$extra_fare_commision", '' ]},'']},{ $gte: ["$extra_fare_commision",0]}] },{ $divide: [ "$extra_fare_commision", 100 ] },0]},  ] },0]},
	// 										night_fee_amount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.night_fee", '' ]},'']},{ $gte: ["$billings.amount.night_fee",0]}] },{ $multiply: [ "$billings.amount.night_fee", {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$night_fare_commision", '' ]},'']},{ $gte: ["$night_fare_commision",0]}] },{ $divide: [ "$night_fare_commision", 100 ] },0]},  ] },0]},
	// 										pickup_distance:"$pickup_distance",
	// 										mileages_travelled:"$mileages_travelled",
	// 										extra_fare_commision:"$extra_fare_commision",
	// 										night_fare_commision:"$night_fare_commision",
	// 										grand_total:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.grand_total", '' ]},'']},{ $gte: ["$billings.amount.grand_total",0]}] },"$billings.amount.grand_total",0]},
	// 										delivery_amount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.delivery_amount", '' ]},'']},{ $gte: ["$billings.amount.delivery_amount",0]}] },"$billings.amount.delivery_amount",0]},
	// 										coupon_discount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.coupon_discount", '' ]},'']},{ $gte: ["$billings.amount.coupon_discount",0]}] },"$billings.amount.coupon_discount",0]},
	// 										driver_commission:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.driver_commission", '' ]},'']},{ $gte: ["$billings.amount.driver_commission",0]}] },"$billings.amount.driver_commission",0]},
	// 									}
	// 								}
	// 							},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									"count":{$sum : 1},
	// 									"driver_total":{$sum : {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.driver_commission", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.driver_commission",0]}] },"$orderDetails.billings.amount.driver_commission",0]}},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							},
	// 							{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
	// 							{$sort:sort},
	// 							{ '$skip': parseInt(skip) },
	// 							{ '$limit': parseInt(limit)},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									"count":{$first : "$count"},
	// 									"driver_total":{$first : "$driver_total"},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							}
	// 						];
	// 						db.GetAggregation('orders', condition, function (err, docdata) {
	// 						console.log('err, docdata',err, docdata)
	// 							if (err || !docdata) {
	// 								 res.send({status: '1', message: '',count:0,orderDetails:[],driver_total:0});
	// 							} else {
	// 								if(docdata.length > 0){
	// 									var count = 0;
	// 									var driver_total = 0;
	// 									var orderDetails = [];
	// 									if(typeof docdata[0].count != 'undefined' ){
	// 										count = docdata[0].count;
	// 									}
	// 									if(typeof docdata[0].orderDetails != 'undefined' ){
	// 										orderDetails = docdata[0].orderDetails;
	// 									}
	// 									if(typeof docdata[0].driver_total != 'undefined' ){
	// 										driver_total = docdata[0].driver_total;
	// 									}
	// 									res.send({status: '1', message: '',count:count,orderDetails:orderDetails,driver_total:driver_total});
	// 								}else{
	// 									res.send({status: '1', message: '',count:0,orderDetails:[],driver_total:0});
	// 								}
	// 							}
	// 						})
	// 					}else{
	// 						//console.log('iscomming')
	// 						var filter_query = { 'orderDetails.status': { $eq: 7 }};
	// 						if (searchs!='') {
	// 							filter_query['$or'] = [];
	// 							var data = { "orderDetails.order_id": { $regex: searchs + '.*', $options: 'si' } };
	// 							filter_query['$or'].push(data);
	// 						 }
	// 						 if(main_city.length > 0){
	// 							filter_query['orderDetails.main_city'] = {$in : main_city };
	// 						 }
	// 						 if(sub_city.length > 0){
	// 							filter_query['orderDetails.sub_city'] = {$in : sub_city };
	// 						 }
	// 						 if(typeof start_time != 'undefined' || typeof end_time != 'undefined'){
	// 							filter_query['$and'] = [];
	// 							if(typeof start_time != 'undefined'){
	// 								var data = {"orderDetails.created_time": { $gte: parseInt(start_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 							if(typeof end_time != 'undefined'){
	// 								var data = {"orderDetails.created_time": { $lte: parseInt(end_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 						 }

	// 						var condition = [
	// 							{"$match": { billing_id : billing_id,driver_id:driver_id}},
	// 							 {
	// 								$project: {
	// 									order_id:"$order_lists",
	// 									paid_status:"$paid_status",
	// 									driver_id:"$driver_id",
	// 									_id:"$_id",
	// 									paid_date:"$paid_date",
	// 									transaction_id:"$transaction_id",
	// 									comments:"$comments",
	// 									order_count:{'$size':'$order_lists'},
	// 								}
	// 							},
	// 							{"$match": { order_count : {$gt:0}}},
	// 							{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
	// 							{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
	// 							{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
	// 							{
	// 								$project: {
	// 									payoutDetails:{
	// 										paid_status:"$paid_status",
	// 										driver_id:"$driver_id",
	// 										type:{$literal:'driver'},
	// 										_id:"$_id",
	// 										paid_date:"$paid_date",
	// 										transaction_id:"$transaction_id",
	// 										comments:"$comments",
	// 									},
	// 									orderDetails:{
	// 										order_id:"$orderDetails.order_id",
	// 										_id:"$orderDetails._id",
	// 										billings:"$orderDetails.billings",
	// 										driver_id:"$orderDetails.driver_id",
	// 										status:"$orderDetails.status",
	// 										createdAt:"$orderDetails.createdAt",
	// 										created_time:"$orderDetails.created_time",
	// 										main_city:"$orderDetails.main_city",
	// 										sub_city:"$orderDetails.sub_city",
	// 										baseprice:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.baseprice", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.baseprice",0]}] },"$orderDetails.driver_fare.baseprice",0]},
	// 										minimum_distance:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.minimum_distance",0]}] },"$orderDetails.driver_fare.minimum_distance",0]},
	// 										format:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.format", '' ]},'']}] },"$orderDetails.driver_fare.format",'']},
	// 										mile_fee:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.format", '' ]},'']},{ $eq: ["$orderDetails.driver_fare.format",'mile']}] },{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.mileages_travelled", '' ]},'']},{ $gte: ["$orderDetails.mileages_travelled",0]}] },{ $multiply: [ {"$cond": [{ $and: [{ $gt: [{ $subtract: [ { $divide: [ "$orderDetails.mileages_travelled", 1.609344] } , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.minimum_distance",0]}] },"$orderDetails.driver_fare.minimum_distance",0]} ] },0]}] },{ $subtract: [ { $divide: [ "$orderDetails.mileages_travelled", 1.609344] } , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.minimum_distance",0]}] },"$orderDetails.driver_fare.minimum_distance",0]} ] },0]}, {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.extra_price", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.extra_price",0]}] },"$orderDetails.driver_fare.extra_price",0]},  ] },0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.mileages_travelled", '' ]},'']},{ $gte: ["$orderDetails.mileages_travelled",0]}] },{ $multiply: [ {"$cond": [{ $and: [{ $gt: [{ $subtract: [ "$orderDetails.mileages_travelled" , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.minimum_distance",0]}] },"$orderDetails.driver_fare.minimum_distance",0]} ] },0]}] },{ $subtract: [ "$orderDetails.mileages_travelled" , {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.minimum_distance", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.minimum_distance",0]}] },"$orderDetails.driver_fare.minimum_distance",0]} ] },0]}, {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.driver_fare.extra_price", '' ]},'']},{ $gte: ["$orderDetails.driver_fare.extra_price",0]}] },"$orderDetails.driver_fare.extra_price",0]},  ] },0]}]},
	// 										surge_fee_amount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.surge_fee", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.surge_fee",0]}] },{ $multiply: [ "$orderDetails.billings.amount.surge_fee", {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.extra_fare_commision", '' ]},'']},{ $gte: ["$orderDetails.extra_fare_commision",0]}] },{ $divide: [ "$orderDetails.extra_fare_commision", 100 ] },0]},  ] },0]},
	// 										night_fee_amount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.night_fee", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.night_fee",0]}] },{ $multiply: [ "$orderDetails.billings.amount.night_fee", {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.night_fare_commision", '' ]},'']},{ $gte: ["$orderDetails.night_fare_commision",0]}] },{ $divide: [ "$orderDetails.night_fare_commision", 100 ] },0]},  ] },0]},
	// 										pickup_distance:"$orderDetails.pickup_distance",
	// 										mileages_travelled:"$orderDetails.mileages_travelled",
	// 										extra_fare_commision:"$orderDetails.extra_fare_commision",
	// 										night_fare_commision:"$orderDetails.night_fare_commision",
	// 										grand_total:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.grand_total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.grand_total",0]}] },"$orderDetails.billings.amount.grand_total",0]},
	// 										delivery_amount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.delivery_amount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.delivery_amount",0]}] },"$orderDetails.billings.amount.delivery_amount",0]},
	// 										coupon_discount:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.coupon_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.coupon_discount",0]}] },"$orderDetails.billings.amount.coupon_discount",0]},
	// 										driver_commission:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.driver_commission", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.driver_commission",0]}] },"$orderDetails.billings.amount.driver_commission",0]},
	// 									}
	// 								}
	// 							},
	// 							{"$match": filter_query},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									'payoutDetails':{$first:'$payoutDetails'},
	// 									"count":{$sum : 1},
	// 									"driver_total":{$sum : {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.driver_commission", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.driver_commission",0]}] },"$orderDetails.billings.amount.driver_commission",0]}},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							},
	// 							{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
	// 							{$sort:sort},
	// 							{ '$skip': parseInt(skip) },
	// 							{ '$limit': parseInt(limit)},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									"count":{$first : "$count"},
	// 									"payoutDetails":{$first : "$payoutDetails"},
	// 									"driver_total":{$first : "$driver_total"},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							}
	// 						];
	// 						db.GetAggregation('driver_earnings', condition, function (err, docdata) {
	// 					//	console.log(err, docdata)
	// 							if (err || !docdata) {
	// 								 res.send({status: '1', message: '',count:0,orderDetails:[],driver_total:0});
	// 							} else {
	// 								if(docdata.length > 0){
	// 									var count = 0;
	// 									var driver_total = 0;
	// 									var orderDetails = [];
	// 									if(typeof docdata[0].count != 'undefined' ){
	// 										count = docdata[0].count;
	// 									}
	// 									if(typeof docdata[0].orderDetails != 'undefined' ){
	// 										orderDetails = docdata[0].orderDetails;
	// 									}
	// 									if(typeof docdata[0].driver_total != 'undefined' ){
	// 										driver_total = docdata[0].driver_total;
	// 									}
	// 									if(typeof docdata[0].payoutDetails != 'undefined' ){
	// 										payoutDetails = docdata[0].payoutDetails;
	// 									}
	// 									res.send({status: '1', message: '',count:count,orderDetails:orderDetails,driver_total:driver_total,payoutDetails:payoutDetails});
	// 								}else{
	// 									res.send({status: '1', message: '',count:0,orderDetails:[],driver_total:0});
	// 								}
	// 							}
	// 						})
	// 					}
	// 				}
	// 			})
	// 		}
	// 	})
	// }





	controller.getDriverOrderEarnings = function (req, res) {
		//console.log(req.query)
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		var billing_id;
		if (typeof req.query.billing_id != 'undefined' && req.query.billing_id != '') {
			if (isObjectId(req.query.billing_id)) {
				billing_id = new mongoose.Types.ObjectId(req.query.billing_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		}
		var driver_id;
		if (typeof req.query.driver_id != 'undefined') {
			if (isObjectId(req.query.driver_id)) {
				driver_id = new mongoose.Types.ObjectId(req.query.driver_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var sort = { sort_username: 1 }
		// c - means city 
		// l - means location 
		// s - means Starting Time 
		// e - means end time 
		// q - means search query  
		// r - means range  
		// o - means sort order
		if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
			filters = req.query.filters;
			if (filters != '') {
				filters = decodeURIComponent(filters);
				filters = decodeURIComponent(filters);
				var filterArray = filters.split('|');
				for (var i = 0; i < filterArray.length; i++) {
					if (filterArray[i] != '') {
						var option = filterArray[i].split(':');
						if (option.length > 1) {
							var values = [];
							if (option[1] != '') {
								values = option[1].split(',');
							}
							if (values.length > 0) {
								if (option[0] == 'c') {
									main_city = values;
								}
								if (option[0] == 'l') {
									sub_city = values;
								}
								if (option[0] == 's') {
									if (values.length > 0) {
										start_time = values[0];
									}
								}
								if (option[0] == 'e') {
									if (values.length > 0) {
										end_time = values[0];
									}
								}
								if (option[0] == 'q') {
									if (values.length > 0) {
										searchs = values[0];
									}
								}

								if (option[0] == 'o') {
									if (values.length > 0) {
										sort = {};
										sort[values[0]] = parseInt(values[1]);
										//	console.log(sort)
									}
								}
							}
						}
					}

				}
			}
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], driver_total: 0 });
			} else {
				db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
					if (err || !billingsettings) {
						res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], driver_total: 0 });
					} else {
						if (typeof billing_id == 'undefined') {
							
							if (typeof billingsettings.settings.last_billed_time != 'undefined') {
								var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
							} else {
								var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
							}

							var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, 'driver_id': driver_id };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query.main_city = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query.sub_city = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}
							//console.log('filter_query', filter_query)
							var condition = [
								{ "$match": filter_query },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										orderDetails: {
											order_id: "$order_id",
											_id: "$_id",
											billings: "$billings",
											driver_id: "$driver_id",
											status: "$status",
											createdAt: "$createdAt",
											baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] },
											format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }] }, "$driver_fare.format", ''] },
											minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] },
											extra_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },
											mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] },
											surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] },
											night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] },
											pickup_distance: "$pickup_distance",
											mileages_travelled: "$mileages_travelled",
											extra_fare_commision: "$extra_fare_commision",
											night_fare_commision: "$night_fare_commision",
											grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
											delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
											coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
											// 'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},
											"transactionDetails": "$transactionDetails",
											"transaction_id": "$transaction_id",
											admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] },
											driver_due: {
												"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
													$subtract: [{
														$subtract: [{
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																{ $gte: ["$billings.amount.grand_total", 0] }]
															}, "$billings.amount.grand_total", 0]
														},
														{
															$sum: [{
																$subtract: [{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																			{ $gte: ["$billings.amount.total", 0] }]
																		}, "$billings.amount.total", 0]
																	},
																	/* {
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																			{ $gte: ["$billings.amount.service_tax", 0] }]
																		}, "$billings.amount.service_tax", 0]
																	}, */
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																			{ $gte: ["$billings.amount.package_charge", 0] }]
																		}, "$billings.amount.package_charge", 0]
																	}]
																},
																{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																			{ $gte: ["$billings.amount.offer_discount", 0] }]
																		}, "$billings.amount.offer_discount", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																			{ $gte: ["$billings.amount.food_offer_price", 0] }]
																		}, "$billings.amount.food_offer_price", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{
																				$gte: [{
																					$subtract: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																							{ $gte: ["$billings.amount.total", 0] }]
																						}, "$billings.amount.total", 0]
																					},
																					{
																						$sum: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																								{ $gte: ["$billings.amount.offer_discount", 0] }]
																							}, "$billings.amount.offer_discount", 0]
																						},
																						{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																								{ $gte: ["$billings.amount.food_offer_price", 0] }]
																							}, "$billings.amount.food_offer_price", 0]
																						}]
																					}]
																				}, 0]
																			}]
																		},
																		{
																			$multiply: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$billings.amount.offer_discount", 0] }]
																						}, "$billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$billings.amount.food_offer_price", 0] }]
																						}, "$billings.amount.food_offer_price", 0]
																					}]
																				}]
																			},
																			{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																		}, 0]
																	}]
																}]
															}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
												}, 0]
											},
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										"driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }

									}
								},
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
										"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
										"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },

									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"driver_total": { $first: "$driver_total" },
										"admin_due": { $first: "$admin_due" },
										"driver_due": { $first: "$driver_due" },
										'orderDetails': { $push: "$orderDetails" },

									}
								}
							];							
							db.GetAggregation('orders', condition, function (err, docdata) {
								//console.log('=-===========-=', docdata)
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var driver_total = 0;
										var admin_due = 0;
										var driver_due = 0;
										var orderDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].orderDetails != 'undefined') {
											orderDetails = docdata[0].orderDetails;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].driver_due != 'undefined') {
											driver_due = docdata[0].driver_due;
										}
										if (typeof docdata[0].admin_due != 'undefined') {
											admin_due = docdata[0].admin_due;
										}
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, driver_total: driver_total, admin_due: admin_due, driver_due: driver_due });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0, admin_due: 0, driver_due: 0 });
									}
								}
							})
						} else {
							//console.log('iscomming')
							var filter_query = { 'orderDetails.status': { $eq: 7 } };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "orderDetails.order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query['orderDetails.main_city'] = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query['orderDetails.sub_city'] = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "orderDetails.created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "orderDetails.created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}
							console.log(billing_id, driver_id)
							var condition = [
								{ "$match": { billing_id: billing_id, driver_id: driver_id } },

								{
									$project: {
										order_id: "$order_lists",
										paid_status: "$paid_status",
										driver_id: "$driver_id",
										_id: "$_id",
										paid_date: "$paid_date",
										comments: "$comments",
										order_count: { '$size': '$order_lists' },
									}
								},
								{ "$match": { order_count: { $gt: 0 } } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$orderDetails.transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										payoutDetails: {
											paid_status: "$paid_status",
											driver_id: "$driver_id",
											type: { $literal: 'driver' },
											_id: "$_id",
											paid_date: "$paid_date",
											transaction_id: "$transaction_id",
											comments: "$comments",
										},
										orderDetails: {
											order_id: "$orderDetails.order_id",
											_id: "$orderDetails._id",
											billings: "$orderDetails.billings",
											driver_id: "$orderDetails.driver_id",
											status: "$orderDetails.status",
											createdAt: "$orderDetails.createdAt",
											created_time: "$orderDetails.created_time",
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.baseprice", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.baseprice", 0] }] }, "$orderDetails.driver_fare.baseprice", 0] },
											minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] },
											format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.format", ''] }, ''] }] }, "$orderDetails.driver_fare.format", ''] },
											mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.format", ''] }, ''] }, { $eq: ["$orderDetails.driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.mileages_travelled", ''] }, ''] }, { $gte: ["$orderDetails.mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$orderDetails.mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$orderDetails.mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.extra_price", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.extra_price", 0] }] }, "$orderDetails.driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.mileages_travelled", ''] }, ''] }, { $gte: ["$orderDetails.mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$orderDetails.mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$orderDetails.mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.extra_price", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.extra_price", 0] }] }, "$orderDetails.driver_fare.extra_price", 0] },] }, 0] }] },
											surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.surge_fee", 0] }] }, { $multiply: ["$orderDetails.billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.extra_fare_commision", ''] }, ''] }, { $gte: ["$orderDetails.extra_fare_commision", 0] }] }, { $divide: ["$orderDetails.extra_fare_commision", 100] }, 0] },] }, 0] },
											night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.night_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.night_fee", 0] }] }, { $multiply: ["$orderDetails.billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.night_fare_commision", ''] }, ''] }, { $gte: ["$orderDetails.night_fare_commision", 0] }] }, { $divide: ["$orderDetails.night_fare_commision", 100] }, 0] },] }, 0] },
											pickup_distance: "$orderDetails.pickup_distance",
											mileages_travelled: "$orderDetails.mileages_travelled",
											extra_fare_commision: "$orderDetails.extra_fare_commision",
											night_fare_commision: "$orderDetails.night_fare_commision",
											grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.grand_total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.grand_total", 0] }] }, "$orderDetails.billings.amount.grand_total", 0] },
											delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.delivery_amount", 0] }] }, "$orderDetails.billings.amount.delivery_amount", 0] },
											coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.coupon_discount", 0] }] }, "$orderDetails.billings.amount.coupon_discount", 0] },
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},

											'final_earnings': {
												$subtract: [{
													"$cond": [{
														$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
														{ $gte: ["$billings.amount.grand_total", 0] }]
													}, "$billings.amount.grand_total", 0]
												},
												{
													$sum: [{
														$subtract: [{
															$sum: [{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																	{ $gte: ["$billings.amount.total", 0] }]
																}, "$billings.amount.total", 0]
															},
															/* {
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																	{ $gte: ["$billings.amount.service_tax", 0] }]
																}, "$billings.amount.service_tax", 0]
															}, */
															{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																	{ $gte: ["$billings.amount.package_charge", 0] }]
																}, "$billings.amount.package_charge", 0]
															}]
														},
														{
															$sum: [{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																	{ $gte: ["$billings.amount.offer_discount", 0] }]
																}, "$billings.amount.offer_discount", 0]
															},
															{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																	{ $gte: ["$billings.amount.food_offer_price", 0] }]
																}, "$billings.amount.food_offer_price", 0]
															},
															{
																"$cond": [{
																	$and: [{
																		$gte: [{
																			$subtract: [{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																					{ $gte: ["$billings.amount.total", 0] }]
																				}, "$billings.amount.total", 0]
																			},
																			{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																						{ $gte: ["$billings.amount.offer_discount", 0] }]
																					}, "$billings.amount.offer_discount", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																						{ $gte: ["$billings.amount.food_offer_price", 0] }]
																					}, "$billings.amount.food_offer_price", 0]
																				}]
																			}]
																		}, 0]
																	}]
																},
																{
																	$multiply: [{
																		$subtract: [{
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																				{ $gte: ["$billings.amount.total", 0] }]
																			}, "$billings.amount.total", 0]
																		},
																		{
																			$sum: [{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																					{ $gte: ["$billings.amount.offer_discount", 0] }]
																				}, "$billings.amount.offer_discount", 0]
																			},
																			{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																					{ $gte: ["$billings.amount.food_offer_price", 0] }]
																				}, "$billings.amount.food_offer_price", 0]
																			}]
																		}]
																	},
																	{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																}, 0]
															}]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
												}]
											},
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, { $multiply: ["$billings.amount.total", { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }] }] },
											admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] }] },
											driver_due: {
												"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
													$subtract: [{
														$subtract: [{
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																{ $gte: ["$billings.amount.grand_total", 0] }]
															}, "$billings.amount.grand_total", 0]
														},
														{
															$sum: [{
																$subtract: [{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																			{ $gte: ["$billings.amount.total", 0] }]
																		}, "$billings.amount.total", 0]
																	},
																	/* {
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																			{ $gte: ["$billings.amount.service_tax", 0] }]
																		}, "$billings.amount.service_tax", 0]
																	}, */
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																			{ $gte: ["$billings.amount.package_charge", 0] }]
																		}, "$billings.amount.package_charge", 0]
																	}]
																},
																{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																			{ $gte: ["$billings.amount.offer_discount", 0] }]
																		}, "$billings.amount.offer_discount", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																			{ $gte: ["$billings.amount.food_offer_price", 0] }]
																		}, "$billings.amount.food_offer_price", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{
																				$gte: [{
																					$subtract: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																							{ $gte: ["$billings.amount.total", 0] }]
																						}, "$billings.amount.total", 0]
																					},
																					{
																						$sum: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																								{ $gte: ["$billings.amount.offer_discount", 0] }]
																							}, "$billings.amount.offer_discount", 0]
																						},
																						{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																								{ $gte: ["$billings.amount.food_offer_price", 0] }]
																							}, "$billings.amount.food_offer_price", 0]
																						}]
																					}]
																				}, 0]
																			}]
																		},
																		{
																			$multiply: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$billings.amount.offer_discount", 0] }]
																						}, "$billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$billings.amount.food_offer_price", 0] }]
																						}, "$billings.amount.food_offer_price", 0]
																					}]
																				}]
																			},
																			{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																		}, 0]
																	}]
																}]
															}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
												}, 0]
											},
										}
									}
								},
								{ "$match": filter_query },
								{
									$group: {
										_id: "null",
										'payoutDetails': { $first: '$payoutDetails' },
										"count": { $sum: 1 },
										"driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$project: {
										'orderDetails': 1,
										'payoutDetails': 1,
										'count': 1,
										'driver_total': 1,
										//'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { $subtrsct: [  { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] },{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$$order.billings.amount.bir_tax_amount", 0] }] }, "$$order.billings.amount.bir_tax_amount", 0] } ] } } } }, - $iva
										"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
										"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },
									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'orderDetails': 1,
										'payoutDetails': 1,
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"driver_total": { $first: '$driver_total' },
										"admin_due": { $first: '$admin_due' },
										"driver_due": { $first: '$driver_due' },
										"payoutDetails": { $first: "$payoutDetails" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];

							//res.send({ status: '1', message: '', condition: condition});
							//return false;

							db.GetAggregation('driver_earnings', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var driver_total = 0;
										var orderDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].orderDetails != 'undefined') {
											orderDetails = docdata[0].orderDetails;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].admin_due != 'undefined') {
											admin_due = docdata[0].admin_due;
										}
										if (typeof docdata[0].driver_due != 'undefined') {
											driver_due = docdata[0].driver_due;
										}
										if (typeof docdata[0].payoutDetails != 'undefined') {
											payoutDetails = docdata[0].payoutDetails;
										}
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, driver_total: driver_total, payoutDetails: payoutDetails });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0 });
									}
								}
							})
						}
					}
				})
			}
		})
	}
	
	
	
	
	
	controller.getDriverTranscations = function (req, res) {
		//console.log(req.query)
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		/* var billing_id;
		if (typeof req.query.billing_id != 'undefined' && req.query.billing_id != '') {
			if (isObjectId(req.query.billing_id)) {
				billing_id = new mongoose.Types.ObjectId(req.query.billing_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} */
		var driver_id;
		if (typeof req.query.driver_id != 'undefined') {
			if (isObjectId(req.query.driver_id)) {
				driver_id = new mongoose.Types.ObjectId(req.query.driver_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var sort = { 'transactionDetails.createdAt': 1 }
		// c - means city 
		// l - means location 
		// s - means Starting Time 
		// e - means end time 
		// q - means search query  
		// r - means range  
		// o - means sort order
		if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
			filters = req.query.filters;
			if (filters != '') {
				filters = decodeURIComponent(filters);
				filters = decodeURIComponent(filters);
				var filterArray = filters.split('|');
				for (var i = 0; i < filterArray.length; i++) {
					if (filterArray[i] != '') {
						var option = filterArray[i].split(':');
						if (option.length > 1) {
							var values = [];
							if (option[1] != '') {
								values = option[1].split(',');
							}
							if (values.length > 0) {
								if (option[0] == 's') {
									if (values.length > 0) {
										start_time = values[0];
									}
								}
								if (option[0] == 'e') {
									if (values.length > 0) {
										end_time = values[0];
									}
								}
								if (option[0] == 'q') {
									if (values.length > 0) {
										searchs = values[0];
									}
								}

								if (option[0] == 'o') {
									if (values.length > 0) {
										sort = {};
										sort[values[0]] = parseInt(values[1]);
										//	console.log(sort)
									}
								}
							}
						}
					}

				}
			}
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], driver_total: 0 });
			} else {
				db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
					if (err || !billingsettings) {
						res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], driver_total: 0 });
					} else {
						if (typeof billing_id == 'undefined') {
							
							if (typeof billingsettings.settings.last_billed_time != 'undefined') {
								var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
							} else {
								var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
							}

							// var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, 'driver_id': driver_id };
							var filter_query = { status: { $eq: 1 }, from : driver_id };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "createdAt": { $gte: new Date(parseInt(start_time)) } };
									console.log('data',data)
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "createdAt": { $lte: new Date(parseInt(end_time)) } };
									filter_query['$and'].push(data)
								}
							}
							//console.log('filter_query', filter_query)
							var condition = [
								{ "$match": filter_query },
								{
									$lookup: {
										from: "orders",
										let: {
											orderId: "$orderId",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$orderId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													order_id: "$order_id",
													_id: "$_id",
													billings: "$billings",
													driver_id: "$driver_id",
													status: "$status",
													baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] },
													minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] },
													extra_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },
													mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] },
													driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
													// 'bir_tax': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$billings.amount.bir_tax_amount", 0] }] }, "$billings.amount.bir_tax_amount", 0] },
													/* payment_mode: {
														"$cond": [{
															$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
														}, "$transactionDetails.type", '']
													} */
												}
											},
										],
										as: "orderDetails"
									}
								},
								{ "$unwind": { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										transactionDetails: {
											_id: "$_id",
											createdAt : "$createdAt",
											type : "$type",
											// reason : "$reason",
											amount : "$amount",
											status : "$status",
											available_amount : "$available_amount",
											billings: "$orderDetails.billings",
											baseprice: "$orderDetails.baseprice",
											mile_fee: "$orderDetails.mile_fee",
											order_id: "$orderDetails.order_id",
											orderId: "$orderDetails._id",
											driver_commission: "$orderDetails.driver_commission",
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'transactionDetails': { $push: "$transactionDetails" }

									}
								},
								{
									$project: {
										'transactionDetails': 1,
										'count': 1
									}
								},
								{ $unwind: { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'transactionDetails': 1,
										'count': 1
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										'transactionDetails': { $push: "$transactionDetails" }
									}
								}
							];			
							console.log('sort',sort)
							db.GetAggregation('driver_wallet', condition, function (err, docdata) {
								//console.log('=-===========-=', docdata)
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, orderDetails: []});
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var driver_total = 0;
										var admin_due = 0;
										var driver_due = 0;
										var orderDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].transactionDetails != 'undefined') {
											orderDetails = docdata[0].transactionDetails;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].driver_due != 'undefined') {
											driver_due = docdata[0].driver_due;
										}
										if (typeof docdata[0].admin_due != 'undefined') {
											admin_due = docdata[0].admin_due;
										}
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [] });
									}
								}
							})
						} else {
							//console.log('iscomming')
							var filter_query = { 'orderDetails.status': { $eq: 7 } };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "orderDetails.order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query['orderDetails.main_city'] = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query['orderDetails.sub_city'] = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "orderDetails.created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "orderDetails.created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}
							console.log(billing_id, driver_id)
							var condition = [
								{ "$match": { billing_id: billing_id, driver_id: driver_id } },

								{
									$project: {
										order_id: "$order_lists",
										paid_status: "$paid_status",
										driver_id: "$driver_id",
										_id: "$_id",
										paid_date: "$paid_date",
										comments: "$comments",
										order_count: { '$size': '$order_lists' },
									}
								},
								{ "$match": { order_count: { $gt: 0 } } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$orderDetails.transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										payoutDetails: {
											paid_status: "$paid_status",
											driver_id: "$driver_id",
											type: { $literal: 'driver' },
											_id: "$_id",
											paid_date: "$paid_date",
											transaction_id: "$transaction_id",
											comments: "$comments",
										},
										orderDetails: {
											order_id: "$orderDetails.order_id",
											_id: "$orderDetails._id",
											billings: "$orderDetails.billings",
											driver_id: "$orderDetails.driver_id",
											status: "$orderDetails.status",
											createdAt: "$orderDetails.createdAt",
											created_time: "$orderDetails.created_time",
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.baseprice", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.baseprice", 0] }] }, "$orderDetails.driver_fare.baseprice", 0] },
											minimum_distance: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] },
											format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.format", ''] }, ''] }] }, "$orderDetails.driver_fare.format", ''] },
											mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.format", ''] }, ''] }, { $eq: ["$orderDetails.driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.mileages_travelled", ''] }, ''] }, { $gte: ["$orderDetails.mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$orderDetails.mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$orderDetails.mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.extra_price", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.extra_price", 0] }] }, "$orderDetails.driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.mileages_travelled", ''] }, ''] }, { $gte: ["$orderDetails.mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$orderDetails.mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$orderDetails.mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.minimum_distance", 0] }] }, "$orderDetails.driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.driver_fare.extra_price", ''] }, ''] }, { $gte: ["$orderDetails.driver_fare.extra_price", 0] }] }, "$orderDetails.driver_fare.extra_price", 0] },] }, 0] }] },
											surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.surge_fee", 0] }] }, { $multiply: ["$orderDetails.billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.extra_fare_commision", ''] }, ''] }, { $gte: ["$orderDetails.extra_fare_commision", 0] }] }, { $divide: ["$orderDetails.extra_fare_commision", 100] }, 0] },] }, 0] },
											night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.night_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.night_fee", 0] }] }, { $multiply: ["$orderDetails.billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.night_fare_commision", ''] }, ''] }, { $gte: ["$orderDetails.night_fare_commision", 0] }] }, { $divide: ["$orderDetails.night_fare_commision", 100] }, 0] },] }, 0] },
											pickup_distance: "$orderDetails.pickup_distance",
											mileages_travelled: "$orderDetails.mileages_travelled",
											extra_fare_commision: "$orderDetails.extra_fare_commision",
											night_fare_commision: "$orderDetails.night_fare_commision",
											grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.grand_total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.grand_total", 0] }] }, "$orderDetails.billings.amount.grand_total", 0] },
											delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.delivery_amount", 0] }] }, "$orderDetails.billings.amount.delivery_amount", 0] },
											coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.coupon_discount", 0] }] }, "$orderDetails.billings.amount.coupon_discount", 0] },
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},

											'final_earnings': {
												$subtract: [{
													"$cond": [{
														$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
														{ $gte: ["$billings.amount.grand_total", 0] }]
													}, "$billings.amount.grand_total", 0]
												},
												{
													$sum: [{
														$subtract: [{
															$sum: [{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																	{ $gte: ["$billings.amount.total", 0] }]
																}, "$billings.amount.total", 0]
															},
															/* {
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																	{ $gte: ["$billings.amount.service_tax", 0] }]
																}, "$billings.amount.service_tax", 0]
															}, */
															{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																	{ $gte: ["$billings.amount.package_charge", 0] }]
																}, "$billings.amount.package_charge", 0]
															}]
														},
														{
															$sum: [{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																	{ $gte: ["$billings.amount.offer_discount", 0] }]
																}, "$billings.amount.offer_discount", 0]
															},
															{
																"$cond": [{
																	$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																	{ $gte: ["$billings.amount.food_offer_price", 0] }]
																}, "$billings.amount.food_offer_price", 0]
															},
															{
																"$cond": [{
																	$and: [{
																		$gte: [{
																			$subtract: [{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																					{ $gte: ["$billings.amount.total", 0] }]
																				}, "$billings.amount.total", 0]
																			},
																			{
																				$sum: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																						{ $gte: ["$billings.amount.offer_discount", 0] }]
																					}, "$billings.amount.offer_discount", 0]
																				},
																				{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																						{ $gte: ["$billings.amount.food_offer_price", 0] }]
																					}, "$billings.amount.food_offer_price", 0]
																				}]
																			}]
																		}, 0]
																	}]
																},
																{
																	$multiply: [{
																		$subtract: [{
																			"$cond": [{
																				$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																				{ $gte: ["$billings.amount.total", 0] }]
																			}, "$billings.amount.total", 0]
																		},
																		{
																			$sum: [{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																					{ $gte: ["$billings.amount.offer_discount", 0] }]
																				}, "$billings.amount.offer_discount", 0]
																			},
																			{
																				"$cond": [{
																					$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																					{ $gte: ["$billings.amount.food_offer_price", 0] }]
																				}, "$billings.amount.food_offer_price", 0]
																			}]
																		}]
																	},
																	{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																}, 0]
															}]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
												}]
											},
											driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, { $multiply: ["$billings.amount.total", { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }] }] },
											admin_due: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, 0, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] }] },
											driver_due: {
												"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }, { $eq: ["$transactionDetails.type", 'COD'] }] }, {
													$subtract: [{
														$subtract: [{
															"$cond": [{
																$and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] },
																{ $gte: ["$billings.amount.grand_total", 0] }]
															}, "$billings.amount.grand_total", 0]
														},
														{
															$sum: [{
																$subtract: [{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																			{ $gte: ["$billings.amount.total", 0] }]
																		}, "$billings.amount.total", 0]
																	},
																	/* {
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] },
																			{ $gte: ["$billings.amount.service_tax", 0] }]
																		}, "$billings.amount.service_tax", 0]
																	}, */
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] },
																			{ $gte: ["$billings.amount.package_charge", 0] }]
																		}, "$billings.amount.package_charge", 0]
																	}]
																},
																{
																	$sum: [{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																			{ $gte: ["$billings.amount.offer_discount", 0] }]
																		}, "$billings.amount.offer_discount", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																			{ $gte: ["$billings.amount.food_offer_price", 0] }]
																		}, "$billings.amount.food_offer_price", 0]
																	},
																	{
																		"$cond": [{
																			$and: [{
																				$gte: [{
																					$subtract: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																							{ $gte: ["$billings.amount.total", 0] }]
																						}, "$billings.amount.total", 0]
																					},
																					{
																						$sum: [{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																								{ $gte: ["$billings.amount.offer_discount", 0] }]
																							}, "$billings.amount.offer_discount", 0]
																						},
																						{
																							"$cond": [{
																								$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																								{ $gte: ["$billings.amount.food_offer_price", 0] }]
																							}, "$billings.amount.food_offer_price", 0]
																						}]
																					}]
																				}, 0]
																			}]
																		},
																		{
																			$multiply: [{
																				$subtract: [{
																					"$cond": [{
																						$and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] },
																						{ $gte: ["$billings.amount.total", 0] }]
																					}, "$billings.amount.total", 0]
																				},
																				{
																					$sum: [{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] },
																							{ $gte: ["$billings.amount.offer_discount", 0] }]
																						}, "$billings.amount.offer_discount", 0]
																					},
																					{
																						"$cond": [{
																							$and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] },
																							{ $gte: ["$billings.amount.food_offer_price", 0] }]
																						}, "$billings.amount.food_offer_price", 0]
																					}]
																				}]
																			},
																			{ $divide: ["$billings.amount.applied_admin_com", 100] }]
																		}, 0]
																	}]
																}]
															}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }]
														}]
													}, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, { $gte: ["$refer_offer_price", 0] }] }, "$refer_offer_price", 0] }]
												}, 0]
											},
										}
									}
								},
								{ "$match": filter_query },
								{
									$group: {
										_id: "null",
										'payoutDetails': { $first: '$payoutDetails' },
										"count": { $sum: 1 },
										"driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$project: {
										'orderDetails': 1,
										'payoutDetails': 1,
										'count': 1,
										'driver_total': 1,
										//'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { $subtrsct: [  { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] },{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.bir_tax_amount", ''] }, ''] }, { $gte: ["$$order.billings.amount.bir_tax_amount", 0] }] }, "$$order.billings.amount.bir_tax_amount", 0] } ] } } } }, - $iva
										"admin_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.admin_due", ''] }, ''] }, { $gte: ["$$order.admin_due", 0] }] }, "$$order.admin_due", 0] } } } },
										"driver_due": { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.driver_due", ''] }, ''] }, { $gte: ["$$order.driver_due", 0] }] }, "$$order.driver_due", 0] } } } },
									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'orderDetails': 1,
										'payoutDetails': 1,
										'count': 1,
										'driver_total': 1,
										'admin_due': 1,
										'driver_due': 1,
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"driver_total": { $first: '$driver_total' },
										"admin_due": { $first: '$admin_due' },
										"driver_due": { $first: '$driver_due' },
										"payoutDetails": { $first: "$payoutDetails" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];

							//res.send({ status: '1', message: '', condition: condition});
							//return false;

							db.GetAggregation('driver_earnings', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var driver_total = 0;
										var orderDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].orderDetails != 'undefined') {
											orderDetails = docdata[0].orderDetails;
										}
										if (typeof docdata[0].driver_total != 'undefined') {
											driver_total = docdata[0].driver_total;
										}
										if (typeof docdata[0].admin_due != 'undefined') {
											admin_due = docdata[0].admin_due;
										}
										if (typeof docdata[0].driver_due != 'undefined') {
											driver_due = docdata[0].driver_due;
										}
										if (typeof docdata[0].payoutDetails != 'undefined') {
											payoutDetails = docdata[0].payoutDetails;
										}
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, driver_total: driver_total, payoutDetails: payoutDetails });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0 });
									}
								}
							})
						}
					}
				})
			}
		})
	}






	controller.restaurantEarnings = function (req, res) {
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var billing_id;
		var sort = { sort_username: 1 }
		// c - means city 
		// l - means location 
		// s - means Starting Time 
		// e - means end time 
		// q - means search query  
		// r - means range  
		// o - means sort order
		if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
			filters = req.query.filters;
			if (filters != '') {
				filters = decodeURIComponent(filters);
				filters = decodeURIComponent(filters);
				var filterArray = filters.split('|');
				for (var i = 0; i < filterArray.length; i++) {
					if (filterArray[i] != '') {
						var option = filterArray[i].split(':');
						if (option.length > 1) {
							var values = [];
							if (option[1] != '') {
								values = option[1].split(',');
							}
							if (values.length > 0) {
								if (option[0] == 'c') {
									main_city = values;
								}
								if (option[0] == 'l') {
									sub_city = values;
								}
								if (option[0] == 's') {
									if (values.length > 0) {
										start_time = values[0];
									}
								}
								if (option[0] == 'e') {
									if (values.length > 0) {
										end_time = values[0];
									}
								}
								if (option[0] == 'q') {
									if (values.length > 0) {
										searchs = values[0];
									}
								}
								if (option[0] == 'r') {
									if (values.length > 0) {
										var reangeValue = values[0];
										if (typeof reangeValue != 'undefined') {
											if (isObjectId(reangeValue)) {
												billing_id = new mongoose.Types.ObjectId(reangeValue);
											}
										}
									}
								}
								if (option[0] == 'o') {
									if (values.length > 0) {
										sort = {};
										sort[values[0]] = parseInt(values[1]);
										//console.log(sort)
									}
								}
							}
						}
					}

				}
			}
		}
		//console.log('asdas',sort)
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', count: 0, restaurantDetails: [], restaurant_total: 0 });
			} else {
				db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
					if (err || !billingsettings) {
						res.send({ status: '0', message: 'Configure your app settings', count: 0, restaurantDetails: [], restaurant_total: 0 });
					} else {

						if (typeof billing_id == 'undefined') {
							if (typeof billingsettings.settings.last_billed_time != 'undefined') {
								var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
							} else {
								var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
							}
							// var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) } };
							var filter_query = { status: { $eq: 7 } };
							var search_query = {};
							search_query['$or'] = [];
							if (searchs != '') {
								var data = { "sort_username": { $regex: searchs + '.*', $options: 'si' } };
								search_query['$or'].push(data);
								var data = { "sort_address": { $regex: searchs + '.*', $options: 'si' } };
								search_query['$or'].push(data);
							}
							if (search_query['$or'].length == 0) {
								delete search_query['$or'];
							}
							if (main_city.length > 0) {
								filter_query.main_city = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query.sub_city = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}
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
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											paid_commission:{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$paid_status", ''] }, ''] }, { $eq: ["$paid_status", 1] }]}, { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },0] },
											unpaid_commission:{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$paid_status", ''] }, ''] }, { $eq: ["$paid_status", 0] }]}, { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },0] }
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'restaurant_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } },
										'paid_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.paid_commission", ''] }, ''] }, { $gte: ["$$order.paid_commission", 0] }] }, "$$order.paid_commission", 0] } } } },
										'unpaid_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.unpaid_commission", ''] }, ''] }, { $gte: ["$$order.unpaid_commission", 0] }] }, "$$order.unpaid_commission", 0] } } } },

									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'restaurant', localField: "orderDetails.restaurant_id", foreignField: "_id", as: "orderDetails.restaurantDetails" } },
								{ $unwind: { path: "$orderDetails.restaurantDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										'orderDetails': 1,
										'count': 1,
										'restaurant_total': 1,
										'paid_commission': 1,
										'unpaid_commission': 1,
										'sort_username': { $toLower: "$orderDetails.restaurantDetails.restaurantname" },
										'sort_address': { $toLower: "$orderDetails.restaurantDetails.address.fulladres" },
									}
								},
								{ "$match": search_query },
								{
									$group: {
										_id: "$orderDetails.restaurant_id",
										"count": { $first: '$count' },
										"restaurant_total": { $first: '$restaurant_total' },
										'username': { $first: "$orderDetails.restaurantDetails.restaurantname" },
										'paid_commission': { $first: "$paid_commission" },
										'unpaid_commission': { $first: "$unpaid_commission" },
										'sort_username': { $first: "$sort_username" },
										'sort_address': { $first: "$sort_address" },
										'phone': { $first: "$orderDetails.restaurantDetails.phone" },
										'address': { $first: "$orderDetails.restaurantDetails.address" },
										'_deliveries': { $sum: 1 },
										'restaurant_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'count': 1,
										'restaurant_total': 1,
										'restaurantDetails': {
											'restaurant_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } },
											'_deliveries': { $size: "$orderDetails" },
											'username': "$username",
											'paid_commission': "$paid_commission",
											'unpaid_commission': "$unpaid_commission",
											'phone': "$phone",
											'address': "$address",
											'_id': '$_id',
											'range': { $literal: billing_id },
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $first: '$count' },
										"restaurant_total": { $first: '$restaurant_total' },
										'restaurantDetails': { $push: "$restaurantDetails" },
									}
								}
							];
							db.GetAggregation('orders', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var restaurant_total = 0;
										var restaurantDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].restaurantDetails != 'undefined') {
											restaurantDetails = docdata[0].restaurantDetails;
										}
										if (typeof docdata[0].restaurant_total != 'undefined') {
											restaurant_total = docdata[0].restaurant_total;
										}
										res.send({ status: '1', message: '', count: count, restaurantDetails: restaurantDetails, restaurant_total: restaurant_total });
									} else {
										res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0 });
									}
								}
							})
						} else {
							var filter_query = { 'orderDetails.status': { $eq: 7 } };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "driverDetails.username": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
								var data = { "driverDetails.address.fulladres": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query['orderDetails.main_city'] = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query['orderDetails.sub_city'] = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "orderDetails.created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "orderDetails.created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}

							var condition = [
								{ "$match": { billing_id: billing_id } },
								{
									$project: {
										restaurant_id: "$restaurant_id",
										order_id: "$order_lists",
										payoutDetails: {
											paid_status: "$paid_status",
											driver_id: "$driver_id",
											type: { $literal: 'driver' },
											_id: "$_id",
											paid_date: "$paid_date",
											transaction_id: "$transaction_id",
											comments: "$comments",
										},
										order_count: { '$size': '$order_lists' },
									}
								},
								{ "$match": { order_count: { $gt: 0 } } },
								{ $lookup: { from: 'restaurant', localField: "restaurant_id", foreignField: "_id", as: "restaurantDetails" } },
								{ $unwind: { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										restaurant_id: "$restaurant_id",
										payoutDetails: "$payoutDetails",
										restaurantDetails: {
											username: "$restaurantDetails.restaurantname",
											_id: "$restaurantDetails._id",
											phone: "$restaurantDetails.phone",
											address: "$restaurantDetails.address",
											'sort_username': { $toLower: "$restaurantDetails.restaurantname" },
											'sort_address': { $toLower: "$restaurantDetails.address.fulladres" },
										},
										orderDetails: {
											order_id: "$orderDetails.order_id",
											_id: "$orderDetails._id",
											billings: "$orderDetails.billings",
											restaurant_id: "$orderDetails.restaurant_id",
											status: "$orderDetails.status",
											createdAt: "$orderDetails.createdAt",
											created_time: "$orderDetails.created_time",
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
										}
									}
								},
								{ "$match": filter_query },
								{
									$group: {
										_id: "$restaurant_id",
										"count": { $sum: 1 },
										'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'restaurantDetails': { $first: "$restaurantDetails" },
										'sort_username': { $first: "$restaurantDetails.sort_username" },
										'payoutDetails': { $first: "$payoutDetails" },
										'sort_address': { $first: "$restaurantDetails.sort_address" },
										'restaurant_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'_deliveries': { $sum: 1 },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$project: {
										'count': 1,
										'restaurant_total': 1,
										'restaurantDetails': {
											'payoutDetails': '$payoutDetails',
											'restaurant_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } },
											'_deliveries': { $size: "$orderDetails" },
											'username': "$restaurantDetails.username",
											'phone': "$restaurantDetails.phone",
											'address': "$restaurantDetails.address",
											'_id': '$restaurantDetails._id',
											'range': { $literal: billing_id },
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$count", ''] }, ''] }, { $gte: ["$count", 0] }] }, "$count", 0] } },
										"restaurant_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$restaurant_total", ''] }, ''] }, { $gte: ["$restaurant_total", 0] }] }, "$restaurant_total", 0] } },
										'restaurantDetails': { $push: "$restaurantDetails" },
									}
								}
							];
							db.GetAggregation('restaurant_earnings', condition, function (err, docdata) {
								//	console.log(err, docdata)
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var restaurant_total = 0;
										var restaurantDetails = [];
										var payoutDetails = {};
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].restaurantDetails != 'undefined') {
											restaurantDetails = docdata[0].restaurantDetails;
										}
										if (typeof docdata[0].restaurant_total != 'undefined') {
											restaurant_total = docdata[0].restaurant_total;
										}
										if (typeof docdata[0].payoutDetails != 'undefined') {
											payoutDetails = docdata[0].payoutDetails;
										}
										res.send({ status: '1', message: '', count: count, restaurantDetails: restaurantDetails, restaurant_total: restaurant_total, payoutDetails: payoutDetails });
									} else {
										res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0 });
									}
								}
							})
						}
					}
				})
			}
		})
	}


	controller.updateDriverPayoutDetails = function (req, res) {
		var driver_id;
		if (typeof req.body.driver_id != 'undefined') {
			if (isObjectId(req.body.driver_id)) {
				driver_id = new mongoose.Types.ObjectId(req.body.driver_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var record_id;
		if (typeof req.body._id != 'undefined') {
			if (isObjectId(req.body._id)) {
				record_id = new mongoose.Types.ObjectId(req.body._id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var type;
		if (typeof req.body.type != 'undefined') {
			if (req.body.type == 'driver') {
				type = req.body.type;
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var transaction_id;
		if (typeof req.body.transaction_id != 'undefined') {
			transaction_id = req.body.transaction_id;
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var paid_date;
		if (typeof req.body.paid_date != 'undefined') {
			try {
				paid_date = new Date(req.body.paid_date);
			} catch (e) {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var comments;
		if (typeof req.body.comments != 'undefined') {
			comments = req.body.comments;
		}
		var collection = 'driver_earnings';
		var condition = { _id: record_id, driver_id: driver_id }
		db.GetOneDocument(collection, condition, {}, {}, function (err, driver_earnings) {
			if (err || !driver_earnings) {
				res.send({ status: '0', message: 'Record Not Found' });
			} else {
				if (typeof driver_earnings != 'undefined') {
					var updateDetails = { "paid_date": paid_date, 'transaction_id': transaction_id, comments: comments, paid_status: 1 };
					db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
					});
					res.send({ status: '1', message: 'Successfully Updated...' });
				} else {
					res.send({ status: '0', message: 'Record Not Found' });
				}
			}
		})
	}
	controller.updateRestaurantPayoutDetails = function (req, res) {
		var restaurant_id;
		if (typeof req.body.restaurant_id != 'undefined') {
			if (isObjectId(req.body.restaurant_id)) {
				restaurant_id = new mongoose.Types.ObjectId(req.body.restaurant_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var record_id;
		if (typeof req.body._id != 'undefined') {
			if (isObjectId(req.body._id)) {
				record_id = new mongoose.Types.ObjectId(req.body._id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var type;
		if (typeof req.body.type != 'undefined') {
			if (req.body.type == 'restaurant') {
				type = req.body.type;
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var transaction_id;
		if (typeof req.body.transaction_id != 'undefined') {
			transaction_id = req.body.transaction_id;
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var paid_date;
		if (typeof req.body.paid_date != 'undefined') {
			try {
				paid_date = new Date(req.body.paid_date);
			} catch (e) {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var comments;
		if (typeof req.body.comments != 'undefined') {
			comments = req.body.comments;
		}
		var collection = 'restaurant_earnings';
		var condition = { _id: record_id, restaurant_id: restaurant_id }
		db.GetOneDocument(collection, condition, {}, {}, function (err, restaurant_earnings) {
			if (err || !restaurant_earnings) {
				res.send({ status: '0', message: 'Record Not Found' });
			} else {
				if (typeof restaurant_earnings != 'undefined') {
					var updateDetails = { "paid_date": paid_date, 'transaction_id': transaction_id, comments: comments, paid_status: 1 };
					db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
					});
					res.send({ status: '1', message: 'Successfully Updated...' });
				} else {
					res.send({ status: '0', message: 'Record Not Found' });
				}
			}
		})
	}

	// controller.getRestaurantOrderEarnings = function (req, res) {

	// 	console.log('-------------------pppppppppppppppppppp----------------------')

	// 	var filters = '';
	// 	var searchs = '';
	// 	var offer = false;
	// 	var limit = 10;
	// 	if (req.query.limit) {
	// 		var tmp = parseInt(req.query.limit);
	// 		if (tmp != NaN && tmp > 0) {
	// 			limit = tmp;
	// 		}
	// 	}
	// 	var skip = 0;
	// 	if (typeof req.query.pageId != 'undefined') {
	// 		if (req.query.pageId) {
	// 			var tmp = parseInt(req.query.pageId);
	// 			if (tmp != NaN && tmp > 0) {
	// 				skip = (tmp * limit) - limit;
	// 			}
	// 		}
	// 	}
	// 	var billing_id;
	// 	if( typeof req.query.billing_id !='undefined' && req.query.billing_id  != '' ){
	// 		if(isObjectId(req.query.billing_id)){
	// 			billing_id = new mongoose.Types.ObjectId(req.query.billing_id);
	// 		}else{
	// 			res.send({status: '0', message: 'some key value missing.'});
	// 			return;
	// 		}
	// 	}
	// 	var restaurant_id;
	// 	if( typeof req.query.restaurant_id !='undefined' && req.query.restaurant_id  != '' ){
	// 		if(isObjectId(req.query.restaurant_id)){
	// 			restaurant_id = new mongoose.Types.ObjectId(req.query.restaurant_id);
	// 		}else{
	// 			res.send({status: '0', message: 'some key value missing.'});
	// 			return;
	// 		}
	// 	}else{
	// 		res.send({status: '0', message: 'some key value missing.'});
	// 		return;
	// 	}
	// 	var main_city = [];
	// 	var sub_city = [];
	// 	var start_time;
	// 	var end_time;
	// 	var billing_id;
	// 	var sort = {sort_username:1}
	// 	// c - means city 
	// 	// l - means location 
	// 	// s - means Starting Time 
	// 	// e - means end time 
	// 	// q - means search query  
	// 	// r - means range  
	// 	// o - means sort order
	// 	if(typeof req.query.filters !='undefined' && req.query.filters != ''){
	// 		filters = req.query.filters;
	// 		if(filters!=''){
	// 			filters = decodeURIComponent(filters); 
	// 			filters = decodeURIComponent(filters); 
	// 			var filterArray = filters.split('|');
	// 			for(var i=0;i<filterArray.length;i++ ){
	// 				if(filterArray[i] != ''){
	// 					var option = filterArray[i].split(':');
	// 					if(option.length > 1){
	// 						var values = [];
	// 						if(option[1]!= ''){
	// 							values = option[1].split(',');
	// 						}
	// 						if(values.length > 0){
	// 							if(option[0] == 'c'){
	// 								main_city = values;
	// 							}
	// 							if(option[0] == 'l'){
	// 								sub_city = values;
	// 							}
	// 							if(option[0] == 's'){
	// 								if(values.length > 0){
	// 									start_time = values[0];
	// 								}
	// 							}
	// 							if(option[0] == 'e'){
	// 								if(values.length > 0){
	// 									end_time = values[0];
	// 								}
	// 							}
	// 							if(option[0] == 'q'){
	// 								if(values.length > 0){
	// 									searchs = values[0];
	// 								}
	// 							}
	// 							if(option[0] == 'o'){
	// 								if(values.length > 0){
	// 									sort={};
	// 									sort[values[0]] = parseInt(values[1]);
	// 									//console.log(sort)
	// 								}
	// 							}
	// 						}
	// 					}
	// 				}

	// 			}
	// 		}
	// 	}
	// 	//console.log('asdas',sort)
	// 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
	// 		if (err || !settings) {
	// 			res.send({status: '0', message: 'Configure your app settings',count:0,orderDetails:[],restaurant_total:0});
	// 		} else {
	// 			db.GetOneDocument('settings', {"alias":"billing_cycle"}, {}, {}, function (err, billingsettings) {
	// 				if (err || !billingsettings) {
	// 					res.send({status: '0', message: 'Configure your app settings',count:0,orderDetails:[],restaurant_total:0});
	// 				} else {
	// 					if(typeof billing_id == 'undefined'){
	// 						if(typeof billingsettings.settings.last_billed_time != 'undefined'){
	// 							var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
	// 						}else{
	// 							var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
	// 						}
	// 						var filter_query = { status: { $eq: 7 },"created_time": { $gte: parseInt(last_billed_time)},restaurant_id:restaurant_id};
	// 						if (searchs!='') {
	// 							filter_query['$or'] = [];
	// 							var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
	// 							filter_query['$or'].push(data);
	// 						 }
	// 						 if(main_city.length > 0){
	// 							filter_query.main_city = {$in : main_city };
	// 						 }
	// 						 if(sub_city.length > 0){
	// 							filter_query.sub_city = {$in : sub_city };
	// 						 }
	// 						 if(typeof start_time != 'undefined' || typeof end_time != 'undefined'){
	// 							filter_query['$and'] = [];
	// 							if(typeof start_time != 'undefined'){
	// 								var data = {"created_time": { $gte: parseInt(start_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 							if(typeof end_time != 'undefined'){
	// 								var data = {"created_time": { $lte: parseInt(end_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 						 }
	// 						var condition = [
	// 							{"$match": filter_query},
	// 							{
	// 								$project: {
	// 									orderDetails:{
	// 										order_id:"$order_id",
	// 										_id:"$_id",
	// 										billings:"$billings",
	// 										restaurant_id:"$restaurant_id",
	// 										status:"$status",
	// 										createdAt:"$createdAt",
	// 										item_total:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.total", '' ]},'']},{ $gte: ["$billings.amount.total",0]}] },"$billings.amount.total",0]},
	// 										restaurant_commission:{ $subtract: [ {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.total", '' ]},'']},{ $gte: ["$billings.amount.total",0]}] },"$billings.amount.total",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.service_tax", '' ]},'']},{ $gte: ["$billings.amount.service_tax",0]}] },"$billings.amount.service_tax",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.package_charge", '' ]},'']},{ $gte: ["$billings.amount.package_charge",0]}] },"$billings.amount.package_charge",0]}]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.offer_discount", '' ]},'']},{ $gte: ["$billings.amount.offer_discount",0]}] },"$billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]},{"$cond": [{ $and: [{ $gte: [{ $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.total", '' ]},'']},{ $gte: ["$billings.amount.total",0]}] },"$billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.offer_discount", '' ]},'']},{ $gte: ["$billings.amount.offer_discount",0]}] },"$billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]}]} ] },0]}] },{ $multiply: [ { $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.total", '' ]},'']},{ $gte: ["$billings.amount.total",0]}] },"$billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.offer_discount", '' ]},'']},{ $gte: ["$billings.amount.offer_discount",0]}] },"$billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]}]} ] }, { $divide: [ "$billings.amount.applied_admin_com", 100 ] }  ] },0]}]} ] },
	// 										'offer_discount':{$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.offer_discount", '' ]},'']},{ $gte: ["$billings.amount.offer_discount",0]}] },"$billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]}]},
	// 										'food_offer_price':{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]},
	// 										'site_total':{"$cond": [{ $and: [{ $gte: [{ $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.total", '' ]},'']},{ $gte: ["$billings.amount.total",0]}] },"$billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.offer_discount", '' ]},'']},{ $gte: ["$billings.amount.offer_discount",0]}] },"$billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]}]} ] },0]}] },{ $multiply: [ { $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.total", '' ]},'']},{ $gte: ["$billings.amount.total",0]}] },"$billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.offer_discount", '' ]},'']},{ $gte: ["$billings.amount.offer_discount",0]}] },"$billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$billings.amount.food_offer_price",0]}] },"$billings.amount.food_offer_price",0]}]} ] }, { $divide: [ "$billings.amount.applied_admin_com", 100 ] }  ] },0]},
	// 										payment_mode: {
	// 											"$cond": [{
	// 												$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
	// 											}, "$transactionDetails.type", '']
	// 										},
	// 									}
	// 								}
	// 							},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									"count":{$sum : 1},
	// 									'restaurant_total':{$sum : {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.restaurant_commission", '' ]},'']},{ $gte: ["$orderDetails.restaurant_commission",0]}] },"$orderDetails.restaurant_commission",0]}},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							},
	// 							{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
	// 							{$sort:sort},
	// 							{ '$skip': parseInt(skip) },
	// 							{ '$limit': parseInt(limit)},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									"count":{$first : "$count"},
	// 									"restaurant_total":{$first : "$restaurant_total"},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							}
	// 						];
	// 						db.GetAggregation('orders', condition, function (err, docdata) {
	// 						console.log("==============", docdata[0])
	// 							if (err || !docdata) {
	// 								 res.send({status: '1', message: '',count:0,orderDetails:[],restaurant_total:0});
	// 							} else {
	// 								if(docdata.length > 0){
	// 									var count = 0;
	// 									var restaurant_total = 0;
	// 									var orderDetails = [];
	// 									if(typeof docdata[0].count != 'undefined' ){
	// 										count = docdata[0].count;
	// 									}
	// 									if(typeof docdata[0].orderDetails != 'undefined' ){
	// 										orderDetails = docdata[0].orderDetails;
	// 									}
	// 									if(typeof docdata[0].restaurant_total != 'undefined' ){
	// 										restaurant_total = docdata[0].restaurant_total;
	// 									}
	// 									res.send({status: '1', message: '',count:count,orderDetails:orderDetails,restaurant_total:restaurant_total});
	// 								}else{
	// 									res.send({status: '1', message: '',count:0,orderDetails:[],restaurant_total:0});
	// 								}
	// 							}
	// 						})
	// 					}else{
	// 						var filter_query = { 'orderDetails.status': { $eq: 7 }};
	// 						if (searchs!='') {
	// 							filter_query['$or'] = [];
	// 							var data = { "orderDetails.order_id": { $regex: searchs + '.*', $options: 'si' } };
	// 							filter_query['$or'].push(data);
	// 						 }
	// 						 if(main_city.length > 0){
	// 							filter_query['orderDetails.main_city'] = {$in : main_city };
	// 						 }
	// 						 if(sub_city.length > 0){
	// 							filter_query['orderDetails.sub_city'] = {$in : sub_city };
	// 						 }
	// 						 if(typeof start_time != 'undefined' || typeof end_time != 'undefined'){
	// 							filter_query['$and'] = [];
	// 							if(typeof start_time != 'undefined'){
	// 								var data = {"orderDetails.created_time": { $gte: parseInt(start_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 							if(typeof end_time != 'undefined'){
	// 								var data = {"orderDetails.created_time": { $lte: parseInt(end_time)}};
	// 								filter_query['$and'].push(data)
	// 							 }
	// 						 }

	// 						var condition = [
	// 							{"$match": { billing_id : billing_id,restaurant_id:restaurant_id}},
	// 							 {
	// 								$project: {
	// 									restaurant_id:"$restaurant_id",
	// 									paid_status:"$paid_status",
	// 									paid_date:"$paid_date",
	// 									transaction_id:"$transaction_id",
	// 									order_id:"$order_lists",
	// 									comments:"$comments",
	// 									order_count:{'$size':'$order_lists'},
	// 								}
	// 							},
	// 							{"$match": { order_count : {$gt:0}}},
	// 							{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
	// 							{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
	// 							{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
	// 							 {
	// 								$project: {
	// 									payoutDetails:{
	// 										paid_status:"$paid_status",
	// 										restaurant_id:"$restaurant_id",
	// 										type:{$literal:'restaurant'},
	// 										_id:"$_id",
	// 										paid_date:"$paid_date",
	// 										transaction_id:"$transaction_id",
	// 										comments:"$comments",
	// 									},
	// 									orderDetails:{
	// 										order_id:"$orderDetails.order_id",
	// 										_id:"$orderDetails._id",
	// 										billings:"$orderDetails.billings",
	// 										restaurant_id:"$orderDetails.restaurant_id",
	// 										status:"$orderDetails.status",
	// 										createdAt:"$orderDetails.createdAt",
	// 										created_time:"$orderDetails.created_time",
	// 										main_city:"$orderDetails.main_city",
	// 										sub_city:"$orderDetails.sub_city",
	// 										item_total:{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.total",0]}] },"$orderDetails.billings.amount.total",0]},
	// 										restaurant_commission:{ $subtract: [ {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.total",0]}] },"$orderDetails.billings.amount.total",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.service_tax", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.service_tax",0]}] },"$orderDetails.billings.amount.service_tax",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.package_charge", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.package_charge",0]}] },"$orderDetails.billings.amount.package_charge",0]}]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.offer_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.offer_discount",0]}] },"$orderDetails.billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]},{"$cond": [{ $and: [{ $gte: [{ $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.total",0]}] },"$orderDetails.billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.offer_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.offer_discount",0]}] },"$orderDetails.billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]}]} ] },0]}] },{ $multiply: [ { $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.total",0]}] },"$orderDetails.billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.offer_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.offer_discount",0]}] },"$orderDetails.billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]}]} ] }, { $divide: [ "$orderDetails.billings.amount.applied_admin_com", 100 ] }  ] },0]}]} ] },
	// 										'peak':{$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.night_fee", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.night_fee",0]}] },"$orderDetails.billings.amount.night_fee",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.surge_fee", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.surge_fee",0]}] },"$orderDetails.billings.amount.surge_fee",0]}]},
	// 										'offer_discount':{$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.offer_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.offer_discount",0]}] },"$orderDetails.billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]}]},
	// 										'food_offer_price':{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]},
	// 										'site_total':{"$cond": [{ $and: [{ $gte: [{ $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.total",0]}] },"$orderDetails.billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.offer_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.offer_discount",0]}] },"$orderDetails.billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]}]} ] },0]}] },{ $multiply: [ { $subtract: [ {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.total", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.total",0]}] },"$orderDetails.billings.amount.total",0]}, {$sum:[{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.offer_discount", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.offer_discount",0]}] },"$orderDetails.billings.amount.offer_discount",0]},{"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.billings.amount.food_offer_price", '' ]},'']},{ $gte: ["$orderDetails.billings.amount.food_offer_price",0]}] },"$orderDetails.billings.amount.food_offer_price",0]}]} ] }, { $divide: [ "$orderDetails.billings.amount.applied_admin_com", 100 ] }  ] },0]},
	// 									}
	// 								}
	// 							},
	// 							{"$match": filter_query},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									payoutDetails:{$first:"$payoutDetails"},
	// 									"count":{$sum : 1},
	// 									'restaurant_total':{$sum : {"$cond": [{ $and: [{ $ne: [{ "$ifNull": [ "$orderDetails.restaurant_commission", '' ]},'']},{ $gte: ["$orderDetails.restaurant_commission",0]}] },"$orderDetails.restaurant_commission",0]}},
	// 									'orderDetails':{$push:"$orderDetails"},
	// 								}
	// 							},
	// 							{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
	// 							{$sort:sort},
	// 							{ '$skip': parseInt(skip) },
	// 							{ '$limit': parseInt(limit)},
	// 							{
	// 								$group: {
	// 									_id: "null",
	// 									"count":{$first : "$count"},
	// 									"payoutDetails":{$first : "$payoutDetails"},
	// 									"restaurant_total":{$first : "$restaurant_total"},
	// 									'orderDetails':{$push:"$orderDetails"}
	// 								}
	// 							}
	// 						];
	// 						db.GetAggregation('restaurant_earnings', condition, function (err, docdata) {
	// 					//	console.log(err, docdata)
	// 							if (err || !docdata) {
	// 								 res.send({status: '1', message: '',count:0,orderDetails:[],restaurant_total:0});
	// 							} else {
	// 								if(docdata.length > 0){
	// 									var count = 0;
	// 									var restaurant_total = 0;
	// 									var orderDetails = [];
	// 									if(typeof docdata[0].count != 'undefined' ){
	// 										count = docdata[0].count;
	// 									}
	// 									if(typeof docdata[0].orderDetails != 'undefined' ){
	// 										orderDetails = docdata[0].orderDetails;
	// 									}
	// 									if(typeof docdata[0].payoutDetails != 'undefined' ){
	// 										payoutDetails = docdata[0].payoutDetails;
	// 									}

	// 									if(typeof docdata[0].restaurant_total != 'undefined' ){
	// 										restaurant_total = docdata[0].restaurant_total;
	// 									}
	// 									res.send("==================PRABHAT",orderDetails)
	// 									res.send({status: '1', message: '',count:count,orderDetails:orderDetails,restaurant_total:restaurant_total,payoutDetails:payoutDetails});
	// 								}else{
	// 									res.send({status: '1', message: '',count:0,orderDetails:[],restaurant_total:0,payoutDetails:{}});
	// 								}
	// 							}
	// 						})
	// 					}
	// 				}
	// 			})
	// 		}
	// 	})
	// }


	controller.getRestaurantOrderEarnings = function (req, res) {
		// console.log("============",req.query)
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.query.limit) {
			var tmp = parseInt(req.query.limit);
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
			}
		}
		var skip = 0;
		if (typeof req.query.pageId != 'undefined') {
			if (req.query.pageId) {
				var tmp = parseInt(req.query.pageId);
				if (tmp != NaN && tmp > 0) {
					skip = (tmp * limit) - limit;
				}
			}
		}
		/* var billing_id;
		if (typeof req.query.billing_id != 'undefined' && req.query.billing_id != '') {
			if (isObjectId(req.query.billing_id)) {
				billing_id = new mongoose.Types.ObjectId(req.query.billing_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} */
		var restaurant_id;
		if (typeof req.query.restaurant_id != 'undefined' && req.query.restaurant_id != '') {
			if (isObjectId(req.query.restaurant_id)) {
				restaurant_id = new mongoose.Types.ObjectId(req.query.restaurant_id);
			} else {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var billing_id;
		var paymatch;
		var sort = { sort_username: 1 };
		/* var paymatch = [0];
		if(typeof req.query.payId != "undefined"){
			if(req.query.payId == "all"){
				paymatch = [0,1]
			}else if(req.query.payId == "paid"){
				paymatch = [1]
			}
		} */
		
		// c - means city 
		// l - means location 
		// s - means Starting Time 
		// e - means end time 
		// q - means search query  
		// r - means range  
		// o - means sort order
		if (typeof req.query.filters != 'undefined' && req.query.filters != '') {
		console.log('req.query.filters',req.query.filters)
			filters = req.query.filters;
			if (filters != '') {
				filters = decodeURIComponent(filters);
				filters = decodeURIComponent(filters);
				var filterArray = filters.split('|');
				for (var i = 0; i < filterArray.length; i++) {
					if (filterArray[i] != '') {
						var option = filterArray[i].split(':');
						if (option.length > 1) {
							var values = [];
							if (option[1] != '') {
								values = option[1].split(',');
							}
							if (values.length > 0) {
								if (option[0] == 'c') {
									main_city = values;
								}
								if (option[0] == 'l') {
									sub_city = values;
								}
								if (option[0] == 's') {
									if (values.length > 0) {
										start_time = values[0];
									}
								}
								if (option[0] == 'e') {
									if (values.length > 0) {
										end_time = values[0];
									}
								}
								if (option[0] == 'q') {
									if (values.length > 0) {
										searchs = values[0];
									}
								}
								if (option[0] == 'o') {
									if (values.length > 0) {
										sort = {};
										sort[values[0]] = parseInt(values[1]);
										//console.log(sort)
									}
								}	
								if (option[0] == 'p') {
									if (values.length > 0) {
										if(typeof values[0] != 'undefined' && (values[0] == '0' || values[0] == '1')){
											if(values[0] == '0'){
												paymatch = [0];
											}else{
												paymatch = [1];
											}
										}
										console.log('paymatch',paymatch)
										//console.log(sort)
									}
								}
							}
						}
					}
				}
			}
		}
		//console.log('asdas',sort)
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {

			if (err || !settings) {
				res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
			} else {
				db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
					//console.log("========BILLING",billingsettings)
					if (err || !billingsettings) {
						res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
					} else {
						if (typeof billing_id == 'undefined') {
							if (typeof billingsettings.settings.last_billed_time != 'undefined') {
								var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
							} else {
								var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
							}
							// var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, restaurant_id: restaurant_id };
							var filter_query = { status: { $eq: 7 }, restaurant_id: restaurant_id};
							console.log('paymatch',paymatch)
							if(typeof paymatch != 'undefined'){
								var filter_query = { status: { $eq: 7 }, restaurant_id: restaurant_id, paid_status: { $in : paymatch } };
							}
							console.log('filter_query',filter_query)
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query.main_city = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query.sub_city = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}

							var condition = [
								{ "$match": filter_query },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										orderDetails: {
											order_id: "$order_id",
											_id: "$_id",
											billings: "$billings",
											restaurant_id: "$restaurant_id",
											status: "$status",
											createdAt: "$createdAt",
											paid_status: "$paid_status",
											item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
											refer_offer_price: { "$cond": [{ $ne: [{ "$ifNull": ["$refer_offer_price", ''] }, ''] }, "$refer_offer_price", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
											'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
											'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"restaurant_total": { $first: "$restaurant_total" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];
							db.GetAggregation('orders', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var restaurant_total = 0;
										var orderDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].orderDetails != 'undefined') {
											orderDetails = docdata[0].orderDetails;
										}

										if (typeof docdata[0].restaurant_total != 'undefined') {
											restaurant_total = docdata[0].restaurant_total;
										}
										//console.log("===============orderDetails.status",orderDetails)
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, restaurant_total: restaurant_total });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0 });
									}
								}
							})

						} else {

							var filter_query = { 'orderDetails.status': { $eq: 7 } };
							if (searchs != '') {
								filter_query['$or'] = [];
								var data = { "orderDetails.order_id": { $regex: searchs + '.*', $options: 'si' } };
								filter_query['$or'].push(data);
							}
							if (main_city.length > 0) {
								filter_query['orderDetails.main_city'] = { $in: main_city };
							}
							if (sub_city.length > 0) {
								filter_query['orderDetails.sub_city'] = { $in: sub_city };
							}
							if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
								filter_query['$and'] = [];
								if (typeof start_time != 'undefined') {
									var data = { "orderDetails.created_time": { $gte: parseInt(start_time) } };
									filter_query['$and'].push(data)
								}
								if (typeof end_time != 'undefined') {
									var data = { "orderDetails.created_time": { $lte: parseInt(end_time) } };
									filter_query['$and'].push(data)
								}
							}

							var condition = [
								{ "$match": { billing_id: billing_id, restaurant_id: restaurant_id } },

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
								{ "$match": { order_count: { $gt: 0 } } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "transaction",
										let: {
											transactionId: "$orderDetails.transaction_id",
										},
										pipeline: [
											{
												$match: {
													$expr: {
														$and: [
															{ "$eq": ["$_id", "$$transactionId"] },
														]
													}
												}
											},
											{ $limit: 1 },
											{
												$project: {
													type: "$type",
												}
											},
										],
										as: "transactionDetails"
									}
								},
								{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },

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
											main_city: "$orderDetails.main_city",
											sub_city: "$orderDetails.sub_city",
											item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] },
											refer_offer_price: { "$cond": [{ $ne: [{ "$ifNull": ["$orderDetails.refer_offer_price", ''] }, ''] }, "$orderDetails.refer_offer_price", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, */ { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.night_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.night_fee", 0] }] }, "$orderDetails.billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.surge_fee", 0] }] }, "$orderDetails.billings.amount.surge_fee", 0] }] },
											'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] },
											'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] },
											'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] },
											payment_mode: {
												"$cond": [{
													$and: [{ $ne: [{ "$ifNull": ["$transactionDetails.type", ''] }, ''] }]
												}, "$transactionDetails.type", '']
											},
										}
									}
								},
								{ "$match": filter_query },
								{
									$group: {
										_id: "null",
										payoutDetails: { $first: "$payoutDetails" },
										"count": { $sum: 1 },
										'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" },
									}
								},
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"payoutDetails": { $first: "$payoutDetails" },
										"restaurant_total": { $first: "$restaurant_total" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];
							
							
							db.GetAggregation('restaurant_earnings', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0 });
								} else {
									if (docdata.length > 0) {
										var count = 0;
										var restaurant_total = 0;
										var orderDetails = [];
										if (typeof docdata[0].count != 'undefined') {
											count = docdata[0].count;
										}
										if (typeof docdata[0].orderDetails != 'undefined') {
											orderDetails = docdata[0].orderDetails;
										}
										if (typeof docdata[0].payoutDetails != 'undefined') {
											payoutDetails = docdata[0].payoutDetails;
										}

										if (typeof docdata[0].restaurant_total != 'undefined') {
											restaurant_total = docdata[0].restaurant_total;
										}
										//console.log(err, "============pRABHAT" , payoutDetails)
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, restaurant_total: restaurant_total, payoutDetails: payoutDetails });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, payoutDetails: {} });
									}
								}
							})
						}
					}
				})
			}
		})
	}
	controller.getRestaurantOrderEarningsAmount = function (req, res) {
		var order_ids = [];;
		if (typeof req.body.order_ids == 'object' && req.body.order_ids.length > 0) {
			for(var i = 0;i<req.body.order_ids.length;i++){
				if (isObjectId(req.body.order_ids[i])) {
					var order_id = new mongoose.Types.ObjectId(req.body.order_ids[i]);
					order_ids.push(order_id);
				} else {
					res.send({ status: '0', message: 'some key value missing.' });
					return;
				}
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		if(order_ids.length > 0){
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
				} else {
					var filter_query = { status: { $eq: 7 }, _id: {$in:order_ids},paid_status: { $in : [0] }};
					var condition = [
						{ "$match": filter_query },
						{
							$project: {
								orderDetails: {
									order_id: "$order_id",
									_id: "$_id",
									restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								}
							}
						},
						{
							$group: {
								_id: "null",
								"count": { $sum: 1 },
								'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
								"order_id": { $push: '$orderDetails.order_id' },
								"record_ids": { $push: '$orderDetails._id' },
							}
						}
					];
					db.GetAggregation('orders', condition, function (err, docdata) {
						if (err || !docdata) {
							res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0 });
						} else {
							if (docdata.length > 0) {
								var count = 0;
								var restaurant_total = 0;
								var record_ids = [];
								if (typeof docdata[0].record_ids != 'undefined') {
									record_ids = docdata[0].record_ids;
								}
								if (typeof docdata[0].restaurant_total != 'undefined') {
									restaurant_total = docdata[0].restaurant_total;
								}
								//console.log("===============orderDetails.status",orderDetails)
								res.send({ status: '1', message: '', count: count, record_ids: record_ids, restaurant_total: restaurant_total });
							} else {
								res.send({ status: '1', message: '', count: 0, record_ids: [], restaurant_total: 0 });
							}
						}
					})
				}
			})
		}else{
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
	}
	controller.updateRestaurantPayoutAmount = function (req, res) {
		console.log('req.body',req.body)
		var order_ids = [];;
		if (typeof req.body.record_ids == 'object' && req.body.record_ids.length > 0) {
			for(var i = 0;i<req.body.record_ids.length;i++){
				if (isObjectId(req.body.record_ids[i])) {
					var order_id = new mongoose.Types.ObjectId(req.body.record_ids[i]);
					order_ids.push(order_id);
				} else {
					res.send({ status: '0', message: 'some key value missing.' });
					return;
				}
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var transaction_id;
		if (typeof req.body.transaction_id != 'undefined') {
			transaction_id = req.body.transaction_id;
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var amount;
		if (typeof req.body.amount != 'undefined') {
			amount = req.body.amount;
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var paid_date;
		if (typeof req.body.paid_date != 'undefined') {
			try {
				paid_date = new Date(req.body.paid_date);
			} catch (e) {
				res.send({ status: '0', message: 'some key value missing.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
		var comments;
		if (typeof req.body.comments != 'undefined') {
			comments = req.body.comments;
		}
		if(order_ids.length > 0){
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
				} else {
					var filter_query = { status: { $eq: 7 }, _id: {$in:order_ids},paid_status: { $in : [0] }};
					var condition = [
						{ "$match": filter_query },
						{
							$project: {
								orderDetails: {
									order_id: "$order_id",
									_id: "$_id",
									restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, /* { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] },  */{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								}
							}
						},
						{
							$group: {
								_id: "null",
								"count": { $sum: 1 },
								'restaurant_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
								"order_id": { $push: '$orderDetails.order_id' },
								"record_ids": { $push: '$orderDetails._id' },
							}
						}
					];
					db.GetAggregation('orders', condition, function (err, docdata) {
						if (err || !docdata) {
							res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0 });
						} else {
							var count = 0;
							var restaurant_total = 0;
							var record_ids = [];
							if (docdata.length > 0) {
								if (typeof docdata[0].restaurant_total != 'undefined') {
									restaurant_total = docdata[0].restaurant_total;
								}
							}
							if(restaurant_total == amount){
								var collection = 'restaurant_payout';
								var newdata = { "paid_date": paid_date, 'transaction_id': transaction_id, comments: comments,amount: restaurant_total,order_ids:order_ids,timestamp:Date.now()};
								db.InsertDocument(collection, newdata, function (err, driver_earnings) {});
								var condition = { _id: {$in:order_ids},paid_status:{$eq:0}};
								var updateDetails = { "paid_status": 1};
								db.UpdateDocument('orders', condition, updateDetails, { multi: true }, function (err, res) {
								});
								res.send({ status: '1', message: 'Successfully Updated...' });
							}else{
								res.send({ status: '0', message: 'Something Went to wrong.Try again.' });
								return;
							}
						}
					})
				}
			})
		}else{
			res.send({ status: '0', message: 'some key value missing.' });
			return;
		}
	}
	return controller;
}
