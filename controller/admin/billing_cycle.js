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
	var turf = require('turf');
	var stripe = require('stripe')('');
	var each = require('async-each-series');
	var CronJob = require('cron').CronJob;
	function isObjectId(n) {
		return mongoose.Types.ObjectId.isValid(n);
	}

	new CronJob('*/59 * * * *', function () {
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




	controller.adminEarnings = async function (req, res) {
		//console.log('adminEarnings')
		console.log("req.body", req.body);
		var filters = '';
		var searchs = '';
		var offer = false;
		var limit = 10;
		if (req.body.limit) {
			var tmp = parseInt(req.body.limit);
			console.log(tmp,'temp');
			if (tmp != NaN && tmp > 0) {
				limit = tmp;
				console.log(limit,'this is the limit');
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
		var main_city = [];
		var sub_city = [];
		var start_time;
		var end_time;
		var sort = { 'orderDetails.createdAt': -1 };
		// console.log("req.body.filters", req.body.filters)
		if (typeof req.body.filters != 'undefined' && req.body.filters != '') {
			filters = req.body.filters;
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
								// if (option[0] == 'c') {
								// 	main_city = values;
								// }
								// if (option[0] == 'l') {
								// 	sub_city = values;
								// }
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
		} else if (req.body.search && req.body.search != '' && typeof req.body.search != 'undefined') {
			searchs = req.body.search
		}
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (!settings) {
			res.send({ status: '0', message: 'Configure your app settings', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
		} else {
			var filter_query = { status: { $eq: 7 } };
			if (searchs != '') {
				filter_query['$or'] = [];
				var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
				filter_query['$or'].push(data);
			}
			// if (main_city.length > 0) {
			// 	filter_query.main_city = { $in: main_city };
			// }
			// if (sub_city.length > 0) {
			// 	filter_query.sub_city = { $in: sub_city };
			// }
			if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
				filter_query['$and'] = [];
				if (typeof start_time != 'undefined') {
					var data = { "createdAt": { '$lte': new Date(end) } };
					filter_query['$and'].push(data)
				}
				if (typeof end_time != 'undefined') {
					var data = { "createdAt": { '$lte': new Date(end_time) } };
					filter_query['$and'].push(data)
				}
			}
			var start, end;
			if (req.body.From_Date != undefined) {
				start = new Date((req.body.From_Date));
				start = new Date(start.setDate(start.getDate() + 0))
				start = moment(start).format('MM/DD/YYYY');
				start = start + ' 00:00:00';
			}
			if (req.body.To_Date != undefined) {
				end = new Date(req.body.To_Date);
				end = new Date(end.setDate(end.getDate() + 0))
				end = moment(end).format('MM/DD/YYYY');
				end = end + ' 23:59:59';
			} else {
				end = new Date();
			}
			if (req.body.From_Date == undefined) {
				filter_query['$and'] = [];
				filter_query['$and'].push({ "createdAt": { '$lte': new Date(end) } })
			} else if (req.body.From_Date != undefined && req.body.To_Date != undefined) {
				filter_query['$and'] = [];
				filter_query['$and'].push({ "createdAt": { '$gte': new Date(start), '$lte': new Date(end) } })
			}
			console.log(JSON.stringify(filter_query))

			var condition = [
				{ "$match": filter_query },
				{
					$lookup: {
						from: 'transaction',
						localField: 'transaction_id',
						foreignField: '_id',

						as: 'trasactiondata'
					}
				},

				{
					$unwind: {
						path: "$trasactiondata", preserveNullAndEmptyArrays: true
					}

				},
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
							delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
							coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
							driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
							/* restaurant_commission =  (total + service_tax + package_charge) - (offer_discount + food_offer_price +site_total) */
							restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
							'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
							'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
							'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
							'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
							'discountPercentage': {
								$round: [
									{
										$multiply: [

											{ $divide: [{ $subtract: ['$item_total', '$grand_total'] }, '$item_total'] },
											100
										]
									},
									2
								]
							},
							modeOfPayment: '$trasactiondata.type',
							// {

							// },
							/* site_total
							if((total - (offer_discount+food_offer_price)) > 0){
								site_total = total ( - (offer_discount+food_offer_price) )* (applied_admin_com/100)
							}else{
								site_total = 0;
							} */
							/* final_earnings = grand_total -[restaurant_commission+driver_commission] */
							'final_earnings': { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, { $sum: [{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] }] }
						},
						// trasactiondata: 1
					}
				},
				{
					$group: {
						_id: "null",
						"count": { $sum: 1 },
						'orderDetails': { $push: "$orderDetails" },
						// 'trasactiondata': { $push: "$trasactiondata" }
					}
				},
				{
					$project: {
						'orderDetails': 1,
						// 'trasactiondata': 1,
						'count': 1,
						'admin_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": "$$order.grand_total" } } },
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
						'orderDetails': { $push: "$orderDetails" },
						// 'trasactiondata': { $push: "$trasactiondata" },
						'createdAt': { $push: "$createdAt" }
					}
				}
			];
			const docdata = await db.GetAggregation('orders', condition)

			if (!docdata) {
				res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
			} else {
				var count = 0;
				if (docdata.length > 0) {
					var restaurant_total = 0;
					var driver_total = 0;
					var admin_total = 0;
					var orderDetails = [];
					if (typeof docdata[0].length != 'undefined') {
						count = docdata[0].length;
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
					res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, restaurant_total: restaurant_total, driver_total: driver_total, admin_total: admin_total });
				} else {
					res.send({ status: '1', message: '', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
				}
			}
			// db.GetAggregation('orders', condition, function (err, docdata) {
			// 	if (err || !docdata) {
			// 		res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
			// 	} else {
			// 		var count = 0;
			// 		if (docdata.length > 0) {
			// 			var restaurant_total = 0;
			// 			var driver_total = 0;
			// 			var admin_total = 0;
			// 			var orderDetails = [];
			// 			if (typeof docdata[0].count != 'undefined') {
			// 				count = docdata[0].count;
			// 			}
			// 			if (typeof docdata[0].orderDetails != 'undefined') {
			// 				orderDetails = docdata[0].orderDetails;
			// 			}
			// 			if (typeof docdata[0].restaurant_total != 'undefined') {
			// 				restaurant_total = docdata[0].restaurant_total;
			// 			}
			// 			if (typeof docdata[0].driver_total != 'undefined') {
			// 				driver_total = docdata[0].driver_total;
			// 			}
			// 			if (typeof docdata[0].admin_total != 'undefined') {
			// 				admin_total = docdata[0].admin_total;
			// 			}
			// 			res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, restaurant_total: restaurant_total, driver_total: driver_total, admin_total: admin_total });
			// 		} else {
			// 			res.send({ status: '1', message: '', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
			// 		}
			// 	}
			// })
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ status: '0', message: 'Configure your app settings', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
		// 	} else {
		// 		var filter_query = { status: { $eq: 7 } };
		// 		if (searchs != '') {
		// 			filter_query['$or'] = [];
		// 			var data = { "order_id": { $regex: searchs + '.*', $options: 'si' } };
		// 			filter_query['$or'].push(data);
		// 		}
		// 		// if (main_city.length > 0) {
		// 		// 	filter_query.main_city = { $in: main_city };
		// 		// }
		// 		// if (sub_city.length > 0) {
		// 		// 	filter_query.sub_city = { $in: sub_city };
		// 		// }
		// 		if (typeof start_time != 'undefined' || typeof end_time != 'undefined') {
		// 			filter_query['$and'] = [];
		// 			if (typeof start_time != 'undefined') {
		// 				var data = { "createdAt": { '$lte': new Date(end) } };
		// 				filter_query['$and'].push(data)
		// 			}
		// 			if (typeof end_time != 'undefined') {
		// 				var data = { "createdAt": { '$lte': new Date(end_time) } };
		// 				filter_query['$and'].push(data)
		// 			}
		// 		}
		// 		var start, end;
		// 		if (req.body.From_Date != undefined) {
		// 			start = new Date((req.body.From_Date));
		// 			start = new Date(start.setDate(start.getDate() + 0))
		// 			start = moment(start).format('MM/DD/YYYY');
		// 			start = start + ' 00:00:00';
		// 		}
		// 		if (req.body.To_Date!= undefined) {
		// 			end = new Date(req.body.To_Date);
		// 			end = new Date(end.setDate(end.getDate() + 0))
		// 			end = moment(end).format('MM/DD/YYYY');
		// 			end = end + ' 23:59:59';
		// 		} else {
		// 			end = new Date();
		// 		}
		// 		if (req.body.From_Date == undefined) {
		// 			filter_query['$and'] = [];
		// 			filter_query['$and'].push({ "createdAt": { '$lte': new Date(end) }})
		// 		} else if (req.body.From_Date != undefined && req.body.To_Date != undefined) {
		// 			filter_query['$and'] = [];
		// 			filter_query['$and'].push({ "createdAt": { '$gte': new Date(start), '$lte': new Date(end) }})
		// 		}
		// 		console.log(JSON.stringify(filter_query))

		// 		var condition = [
		// 			{ "$match": filter_query },
		// 			{
		// 				$project: {
		// 					orderDetails: {
		// 						order_id: "$order_id",
		// 						_id: "$_id",
		// 						billings: "$billings",
		// 						status: "$status",
		// 						createdAt: "$createdAt",
		// 						grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
		// 						item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
		// 						delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
		// 						coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
		// 						driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
		// 						/* restaurant_commission =  (total + service_tax + package_charge) - (offer_discount + food_offer_price +site_total) */
		// 						restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
		// 						'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
		// 						'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
		// 						'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
		// 						'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
		// 						/* site_total
		// 						if((total - (offer_discount+food_offer_price)) > 0){
		// 							site_total = total ( - (offer_discount+food_offer_price) )* (applied_admin_com/100)
		// 						}else{
		// 							site_total = 0;
		// 						} */
		// 						/* final_earnings = grand_total -[restaurant_commission+driver_commission] */
		// 						'final_earnings': { $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, { $sum: [{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] }] }] }
		// 					}
		// 				}
		// 			},
		// 			{
		// 				$group: {
		// 					_id: "null",
		// 					"count": { $sum: 1 },
		// 					'orderDetails': { $push: "$orderDetails" }
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					'orderDetails': 1,
		// 					'count': 1,
		// 					'admin_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": "$$order.grand_total" } } },
		// 					'driver_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
		// 					'restaurant_total': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.restaurant_commission", ''] }, ''] }, { $gte: ["$$order.restaurant_commission", 0] }] }, "$$order.restaurant_commission", 0] } } } }

		// 				}
		// 			},
		// 			{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
		// 			{ $sort: sort },
		// 			{ '$skip': parseInt(skip) },
		// 			{ '$limit': parseInt(limit) },
		// 			{
		// 				$group: {
		// 					_id: "null",
		// 					"count": { $first: '$count' },
		// 					"admin_total": { $first: '$admin_total' },
		// 					"driver_total": { $first: '$driver_total' },
		// 					"restaurant_total": { $first: '$restaurant_total' },
		// 					'orderDetails': { $push: "$orderDetails" },
		// 					'createdAt': { $push: "$createdAt" }
		// 				}
		// 			}
		// 		];
		// 		db.GetAggregation('orders', condition, function (err, docdata) {
		// 			if (err || !docdata) {
		// 				res.send({ status: '1', message: '', count: 0, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
		// 			} else {
		// 				var count = 0;
		// 				if (docdata.length > 0) {
		// 					var restaurant_total = 0;
		// 					var driver_total = 0;
		// 					var admin_total = 0;
		// 					var orderDetails = [];
		// 					if (typeof docdata[0].count != 'undefined') {
		// 						count = docdata[0].count;
		// 					}
		// 					if (typeof docdata[0].orderDetails != 'undefined') {
		// 						orderDetails = docdata[0].orderDetails;
		// 					}
		// 					if (typeof docdata[0].restaurant_total != 'undefined') {
		// 						restaurant_total = docdata[0].restaurant_total;
		// 					}
		// 					if (typeof docdata[0].driver_total != 'undefined') {
		// 						driver_total = docdata[0].driver_total;
		// 					}
		// 					if (typeof docdata[0].admin_total != 'undefined') {
		// 						admin_total = docdata[0].admin_total;
		// 					}
		// 					res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, restaurant_total: restaurant_total, driver_total: driver_total, admin_total: admin_total });
		// 				} else {
		// 					res.send({ status: '1', message: '', count: count, orderDetails: [], restaurant_total: 0, driver_total: 0, admin_total: 0 });
		// 				}
		// 			}
		// 		})
		// 	}
		// })
	}
	controller.getOrderDetails = function (req, res) {
		var orderId;
		if (typeof req.body.orderId != 'undefined') {
			if (isObjectId(req.body.orderId)) {
				orderId = new mongoose.Types.ObjectId(req.body.orderId);
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
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
								item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
								baseprice: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] },
								extra_price: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },
								format: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }] }, "$driver_fare.format", ''] },
								mile_fee: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] },
								surge_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] },
								night_fee_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] },
								surge_fee_amount_admin: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: [{ $subtract: [100, "$extra_fare_commision"] }, 100] }, 0] },] }, 0] },
								night_fee_amount_admin: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: [{ $subtract: [100, "$night_fare_commision"] }, 100] }, 0] },] }, 0] },
								driver_amount: { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] }] },
								pickup_distance: "$pickup_distance",
								driver_fare: "$driver_fare",
								mileages_travelled: "$mileages_travelled",
								extra_fare_commision: "$extra_fare_commision",
								night_fare_commision: "$night_fare_commision",
								grand_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] },
								delivery_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.delivery_amount", ''] }, ''] }, { $gte: ["$billings.amount.delivery_amount", 0] }] }, "$billings.amount.delivery_amount", 0] },
								coupon_discount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.coupon_discount", ''] }, ''] }, { $gte: ["$billings.amount.coupon_discount", 0] }] }, "$billings.amount.coupon_discount", 0] },
								driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
								restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
								'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, "$billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, "$billings.amount.surge_fee", 0] }] },
								'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
								'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
								'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },
								'final_earnings': {
									$subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.grand_total", ''] }, ''] }, { $gte: ["$billings.amount.grand_total", 0] }] }, "$billings.amount.grand_total", 0] }, {
										$sum: [
											/* restaurant_commission */
											{ $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											/* driver_commission */
											{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.baseprice", ''] }, ''] }, { $gte: ["$driver_fare.baseprice", 0] }] }, "$driver_fare.baseprice", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.format", ''] }, ''] }, { $eq: ["$driver_fare.format", 'mile'] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: [{ $divide: ["$mileages_travelled", 1.609344] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, { $multiply: [{ "$cond": [{ $and: [{ $gt: [{ $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }] }, { $subtract: ["$mileages_travelled", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.minimum_distance", ''] }, ''] }, { $gte: ["$driver_fare.minimum_distance", 0] }] }, "$driver_fare.minimum_distance", 0] }] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_fare.extra_price", ''] }, ''] }, { $gte: ["$driver_fare.extra_price", 0] }] }, "$driver_fare.extra_price", 0] },] }, 0] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$billings.amount.surge_fee", 0] }] }, { $multiply: ["$billings.amount.surge_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$extra_fare_commision", ''] }, ''] }, { $gte: ["$extra_fare_commision", 0] }] }, { $divide: ["$extra_fare_commision", 100] }, 0] },] }, 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.night_fee", ''] }, ''] }, { $gte: ["$billings.amount.night_fee", 0] }] }, { $multiply: ["$billings.amount.night_fee", { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$night_fare_commision", ''] }, ''] }, { $gte: ["$night_fare_commision", 0] }] }, { $divide: ["$night_fare_commision", 100] }, 0] },] }, 0] }] }
										]
									}]
								},
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
		//console.log('asda','driverEarnings')
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
							} else {
								filter_query["created_time"] = { $gte: parseInt(last_billed_time) };
							}
							var condition = [
								{ "$match": filter_query },
								{
									$project: {
										orderDetails: {
											order_id: "$order_id",
											_id: "$_id",
											billings: "$billings",
											driver_id: "$driver_id",
											status: "$status",
											createdAt: "$createdAt",
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
										'username': { $first: "$orderDetails.driverDetails.username" },
										'sort_username': { $first: "$sort_username" },
										'sort_address': { $first: "$sort_address" },
										'phone': { $first: "$orderDetails.driverDetails.phone" },
										'address': { $first: "$orderDetails.driverDetails.address" },
										'_deliveries': { $sum: 1 },
										'driver_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$facet: {
										ecount: [{ $count: 'ecount' }],
										details: [
											{ $sort: sort },
											{ '$skip': parseInt(skip) },
											{ '$limit': parseInt(limit) },
											{
												$project: {
													'count': 1,
													'driver_total': 1,
													'driverDetails': {
														'driver_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
														'_deliveries': { $size: "$orderDetails" },
														'username': "$username",
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
													"driver_total": { $first: '$driver_total' },
													'driverDetails': { $push: "$driverDetails" },
												}
											}
										]
									}
								}
							];
							db.GetAggregation('orders', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, ecount: 0 });
								} else {
									var count = 0;
									if (docdata.length > 0) {
										if (docdata[0].details.length > 0 && docdata[0].ecount.length > 0 && docdata[0].ecount[0].ecount > 0) {
											var driver_total = 0;
											var driverDetails = [];
											if (typeof docdata[0].details[0].count != 'undefined') {
												count = docdata[0].details[0].count;
											}
											if (typeof docdata[0].details[0].driverDetails != 'undefined') {
												driverDetails = docdata[0].details[0].driverDetails;
											}
											if (typeof docdata[0].details[0].driver_total != 'undefined') {
												driver_total = docdata[0].details[0].driver_total;
											}
											res.send({ status: '1', message: '', count: count, driverDetails: driverDetails, driver_total: driver_total, ecount: docdata[0].ecount[0].ecount });
										} else {
											res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, ecount: 0 });
										}
									} else {
										res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, ecount: 0 });
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
										'driver_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'_deliveries': { $sum: 1 },
										"count": { $sum: 1 },
										'driver_total': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.driver_commission", 0] }] }, "$orderDetails.billings.amount.driver_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$facet: {
										ecount: [{ $count: 'ecount' }],
										details: [
											{ $sort: sort },
											{ '$skip': parseInt(skip) },
											{ '$limit': parseInt(limit) },
											{
												$project: {
													'count': 1,
													'driver_total': 1,
													'driverDetails': {
														'driver_commission': { $sum: { "$map": { "input": "$orderDetails", "as": "order", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$order.billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$$order.billings.amount.driver_commission", 0] }] }, "$$order.billings.amount.driver_commission", 0] } } } },
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
													'driverDetails': { $push: "$driverDetails" },
												}
											}
										]
									}
								}
							];
							db.GetAggregation('driver_earnings', condition, function (err, docdata) {
								//	console.log(err, docdata)
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, ecount: 0 });
								} else {
									var count = 0;
									if (docdata.length > 0) {
										if (docdata[0].details.length > 0 && docdata[0].ecount.length > 0 && docdata[0].ecount[0].ecount > 0) {
											var driver_total = 0;
											var driverDetails = [];
											var payoutDetails = {};
											if (typeof docdata[0].details[0].count != 'undefined') {
												count = docdata[0].details[0].count;
											}
											if (typeof docdata[0].details[0].driverDetails != 'undefined') {
												driverDetails = docdata[0].details[0].driverDetails;
											}
											if (typeof docdata[0].details[0].driver_total != 'undefined') {
												driver_total = docdata[0].details[0].driver_total;
											}
											if (typeof docdata[0].details[0].payoutDetails != 'undefined') {
												payoutDetails = docdata[0].details[0].payoutDetails;
											}
											res.send({ status: '1', message: '', count: count, driverDetails: driverDetails, driver_total: driver_total, payoutDetails: payoutDetails, ecount: docdata[0].ecount[0].ecount });
										} else {
											res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, ecount: 0 });
										}
									} else {
										res.send({ status: '1', message: '', count: 0, driverDetails: [], driver_total: 0, ecount: 0 });
									}
								}
							})
						}
					}
				})
			}
		})
	}


	controller.getDriverOrderEarnings = function (req, res) {
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
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		}
		var driver_id;
		if (typeof req.query.driver_id != 'undefined') {
			if (isObjectId(req.query.driver_id)) {
				driver_id = new mongoose.Types.ObjectId(req.query.driver_id);
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
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
							var condition = [
								{ "$match": filter_query },
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
											/* driver_commission = surge_fee_amount + night_fare_commision + mile_fee + baseprice */
											/* 	
											var mile_fee;
											if(format == 'mile'){
												if((mileages_travelled /1.609344) > 0){
													var x 
													if((mileages_travelled /1.609344) - minimum_distance > 0){
														x =  (mileages_travelled /1.609344) - minimum_distance;
													}else{
														x =0;
													}
													mile_fee = x * extra_price 
												}else{
													mile_fee = 0;
												}
											}else{
												if(mileages_travelled > 0){
													var x 
													if(mileages_travelled - minimum_distance > 0){
														x =  mileages_travelled - minimum_distance;
													}else{
														x =0;
													}
													mile_fee = x * extra_price 
												}else{
													mile_fee = 0;
												}
											} */
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
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"driver_total": { $first: "$driver_total" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];
							db.GetAggregation('orders', condition, function (err, docdata) {
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
										res.send({ status: '1', message: '', count: count, orderDetails: orderDetails, driver_total: driver_total });
									} else {
										res.send({ status: '1', message: '', count: 0, orderDetails: [], driver_total: 0 });
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

							var condition = [
								{ "$match": { billing_id: billing_id, driver_id: driver_id } },
								{
									$project: {
										order_id: "$order_lists",
										paid_status: "$paid_status",
										driver_id: "$driver_id",
										_id: "$_id",
										paid_date: "$paid_date",
										transaction_id: "$transaction_id",
										comments: "$comments",
										order_count: { '$size': '$order_lists' },
									}
								},
								{ "$match": { order_count: { $gt: 0 } } },
								{ $unwind: { path: "$order_id", preserveNullAndEmptyArrays: true } },
								{ $lookup: { from: 'orders', localField: "order_id", foreignField: "order_id", as: "orderDetails" } },
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
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
								{ $unwind: { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) },
								{
									$group: {
										_id: "null",
										"count": { $first: "$count" },
										"payoutDetails": { $first: "$payoutDetails" },
										"driver_total": { $first: "$driver_total" },
										'orderDetails': { $push: "$orderDetails" }
									}
								}
							];
							db.GetAggregation('driver_earnings', condition, function (err, docdata) {
								//	console.log(err, docdata)
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
							} else {
								filter_query['created_time'] = { $gte: parseInt(last_billed_time) };
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
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }] }] }
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
										'sort_username': { $first: "$sort_username" },
										'sort_address': { $first: "$sort_address" },
										'phone': { $first: "$orderDetails.restaurantDetails.phone" },
										'address': { $first: "$orderDetails.restaurantDetails.address" },
										'_deliveries': { $sum: 1 },
										'restaurant_commission': { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.restaurant_commission", ''] }, ''] }, { $gte: ["$orderDetails.restaurant_commission", 0] }] }, "$orderDetails.restaurant_commission", 0] } },
										'orderDetails': { $push: "$orderDetails" }
									}
								},
								{
									$facet: {
										ecount: [{ $count: 'ecount' }],
										details: [
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
										]
									}
								}
							];
							db.GetAggregation('orders', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0, ecount: 0 });
								} else {
									if (docdata.length > 0) {
										if (docdata[0].details.length > 0 && docdata[0].ecount.length > 0 && docdata[0].ecount[0].ecount > 0) {
											var count = 0;
											var restaurant_total = 0;
											var restaurantDetails = [];
											if (typeof docdata[0].details[0].count != 'undefined') {
												count = docdata[0].details[0].count;
											}
											if (typeof docdata[0].details[0].restaurantDetails != 'undefined') {
												restaurantDetails = docdata[0].details[0].restaurantDetails;
											}
											if (typeof docdata[0].details[0].restaurant_total != 'undefined') {
												restaurant_total = docdata[0].details[0].restaurant_total;
											}
											res.send({ status: '1', message: '', count: count, restaurantDetails: restaurantDetails, restaurant_total: restaurant_total, ecount: docdata[0].ecount[0].ecount });
										} else {
											res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0, ecount: 0 });
										}
									} else {
										res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0, ecount: 0 });
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
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }] }] }
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
								{
									$facet: {
										ecount: [{ $count: 'ecount' }],
										details: [
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
										]
									}
								}
							];
							db.GetAggregation('restaurant_earnings', condition, function (err, docdata) {
								if (err || !docdata) {
									res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0, ecount: 0 });
								} else {
									if (docdata.length > 0) {
										if (docdata[0].details.length > 0 && docdata[0].ecount.length > 0 && docdata[0].ecount[0].ecount > 0) {
											var count = 0;
											var restaurant_total = 0;
											var restaurantDetails = [];
											var payoutDetails = {};
											if (typeof docdata[0].details[0].count != 'undefined') {
												count = docdata[0].details[0].count;
											}
											if (typeof docdata[0].details[0].restaurantDetails != 'undefined') {
												restaurantDetails = docdata[0].details[0].restaurantDetails;
											}
											if (typeof docdata[0].details[0].restaurant_total != 'undefined') {
												restaurant_total = docdata[0].details[0].restaurant_total;
											}
											if (typeof docdata[0].details[0].payoutDetails != 'undefined') {
												payoutDetails = docdata[0].details[0].payoutDetails;
											}
											res.send({ status: '1', message: '', count: count, restaurantDetails: restaurantDetails, restaurant_total: restaurant_total, payoutDetails: payoutDetails, ecount: docdata[0].ecount[0].ecount });
										} else {
											res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0, ecount: 0 });
										}
									} else {
										res.send({ status: '1', message: '', count: 0, restaurantDetails: [], restaurant_total: 0, ecount: 0 });
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
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var record_id;
		if (typeof req.body._id != 'undefined') {
			if (isObjectId(req.body._id)) {
				record_id = new mongoose.Types.ObjectId(req.body._id);
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var type;
		if (typeof req.body.type != 'undefined') {
			if (req.body.type == 'driver') {
				type = req.body.type;
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var transaction_id;
		if (typeof req.body.transaction_id != 'undefined') {
			transaction_id = req.body.transaction_id;
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var paid_date;
		if (typeof req.body.paid_date != 'undefined') {
			try {
				paid_date = new Date(req.body.paid_date);
			} catch (e) {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
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
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var record_id;
		if (typeof req.body._id != 'undefined') {
			if (isObjectId(req.body._id)) {
				record_id = new mongoose.Types.ObjectId(req.body._id);
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var type;
		if (typeof req.body.type != 'undefined') {
			if (req.body.type == 'restaurant') {
				type = req.body.type;
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var transaction_id;
		if (typeof req.body.transaction_id != 'undefined') {
			transaction_id = req.body.transaction_id;
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
		}
		var paid_date;
		if (typeof req.body.paid_date != 'undefined') {
			try {
				paid_date = new Date(req.body.paid_date);
			} catch (e) {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
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

	controller.getRestaurantOrderEarnings = function (req, res) {
		/*console.log('-----------------------------------------')
		console.log(req.query)
		console.log('-----------------------------------------')*/
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
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		}
		var restaurant_id;
		if (typeof req.query.restaurant_id != 'undefined' && req.query.restaurant_id != '') {
			if (isObjectId(req.query.restaurant_id)) {
				restaurant_id = new mongoose.Types.ObjectId(req.query.restaurant_id);
			} else {
				res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
				return;
			}
		} else {
			res.send({ status: '0', message: 'Kindly fill all the mandatory fields.' });
			return;
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
				res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
			} else {
				db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
					if (err || !billingsettings) {
						res.send({ status: '0', message: 'Configure your app settings', count: 0, orderDetails: [], restaurant_total: 0 });
					} else {
						if (typeof billing_id == 'undefined') {
							if (typeof billingsettings.settings.last_billed_time != 'undefined') {
								var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
							} else {
								var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
							}
							var filter_query = { status: { $eq: 7 }, "created_time": { $gte: parseInt(last_billed_time) }, restaurant_id: restaurant_id };
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
											restaurant_id: "$restaurant_id",
											status: "$status",
											createdAt: "$createdAt",
											item_total: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.service_tax", ''] }, ''] }, { $gte: ["$billings.amount.service_tax", 0] }] }, "$billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.package_charge", ''] }, ''] }, { $gte: ["$billings.amount.package_charge", 0] }] }, "$billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] },
											'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] },
											'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$billings.amount.offer_discount", 0] }] }, "$billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$billings.amount.food_offer_price", 0] }] }, "$billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$billings.amount.applied_admin_com", 100] }] }, 0] },


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
											restaurant_commission: { $subtract: [{ $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.service_tax", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.service_tax", 0] }] }, "$orderDetails.billings.amount.service_tax", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.package_charge", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.package_charge", 0] }] }, "$orderDetails.billings.amount.package_charge", 0] }] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }, { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] }] }] },
											'peak': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.night_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.night_fee", 0] }] }, "$orderDetails.billings.amount.night_fee", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.surge_fee", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.surge_fee", 0] }] }, "$orderDetails.billings.amount.surge_fee", 0] }] },
											'offer_discount': { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] },
											'food_offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] },
											'site_total': { "$cond": [{ $and: [{ $gte: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, 0] }] }, { $multiply: [{ $subtract: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.total", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.total", 0] }] }, "$orderDetails.billings.amount.total", 0] }, { $sum: [{ "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.offer_discount", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.offer_discount", 0] }] }, "$orderDetails.billings.amount.offer_discount", 0] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.billings.amount.food_offer_price", ''] }, ''] }, { $gte: ["$orderDetails.billings.amount.food_offer_price", 0] }] }, "$orderDetails.billings.amount.food_offer_price", 0] }] }] }, { $divide: ["$orderDetails.billings.amount.applied_admin_com", 100] }] }, 0] },
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
								//	console.log(err, docdata)
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

	return controller;
}
