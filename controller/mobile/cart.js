
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





	controller.getCart = async function (req, res) {
		try {
			var type;
			// console.log("hi you entered");
			// if (typeof req.body.type != 'undefined' && req.body.type != '') {
			// 	if (req.body.type == 'temp_cart' || req.body.type == 'cart') {
			// 		type = req.body.type;
			// 	} else {
			// 		res.send ({ err: 1, message: 'Invalid Type' });
			// 		return;
			// 	}
			// } else {
			// 	res.send ({ err: 1, message: 'Invalid Type' });
			// 	return;
			// }
			var userId;
			if (req.body.type == 'temp_cart') {
				if (typeof req.body.userId != 'undefined' && req.body.userId != '') {
					userId = req.body.userId;
				} else {
					res.send({ err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof req.body.userId != 'undefined' && req.body.userId != '') {
					if (req.body.userId) {
						userId = new mongoose.Types.ObjectId(req.body.userId);
					} else {
						res.send({ err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					res.send({ err: 1, message: 'Invalid userId' });
					return;
				}
			}
			var client_offset = (new Date).getTimezoneOffset();
			// console.log("hi daaaa");
			var collection = 'cart';
			if (req.body.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId };

			if (req.body && req.body.cart_value == 1) {
				condition.type_status = 1;
			} else {
				condition.type_status = 0;
			}
			var server_offset = (new Date).getTimezoneOffset();
			var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
			var date = Date.now() + diff_offset;
			var isodate = new Date(date);
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			const siteUrl = settings.doc.settings.site_url
			if (settings.status === false) {
				res.send({ err: 1, message: 'Error in settings..!' });
			} else {
				var aggregationdata = [
					{ $match: condition },
					{ "$unwind": { path: "$cart_details", preserveNullAndEmptyArrays: true } },
					{
						$lookup: {
							from: "food",
							let: {
								foodId: "$cart_details.id",
								sizeC: "$cart_details.size",
								qunty: "$cart_details.id"
							},
							pipeline: [
								{
									$match: {
										"$expr": {
											"$and": [
												{ "$eq": ["$_id", "$$foodId"] },
												{ "$eq": ["$status", 1] },
											]
										}
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										rcategory: 1,
										scategory: 1,
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
										selectedVariantId: 1,
										notZero: {
											$filter: {
												input: "$quantity_size",
												as: "item",
												cond: {
													$and: [
														// {
														// 	$eq:["$$item.size","$$sizeC"]
														// },
														{
															$eq: ["$$item.status", 1]
														},
														{
															$gt: ["$$item.quantity", 0]
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
										scategory: 1,
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
										selectedVariantId: 1,
										filterSize: { $ifNull: ['$notZero', []] }
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										rcategory: 1,
										scategory: 1,
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
										filterSize: 1,
										selectedVariantId: 1,
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
								{ $limit: 1 },
							],
							as: "cart_details.foodDetails"
						}
					},
					{ "$unwind": { path: "$cart_details.foodDetails", preserveNullAndEmptyArrays: true } },
					{ $group: { _id: { _id: "$_id", user_id: "$user_id", city_id: "$city_id" }, discount_type: { $first: "$discount_type" }, type_status: { $first: "$type_status" }, coupon_code: { $first: "$coupon_code" }, coupon_discount: { $first: "$coupon_discount" }, cart_details: { $push: "$cart_details" } } },
					{
						$lookup: {
							from: "coupon",
							let: {
								coupon_code: "$coupon_code",
							},
							pipeline: [
								{ $match: { "$expr": { "$eq": ["$code", "$$coupon_code"] } } },

								{ $limit: 1 },
							],
							as: "couponDetails"
						}
					},
					{ "$unwind": { path: "$couponDetails", preserveNullAndEmptyArrays: true } },
					{
						$lookup: {
							from: "orders",
							let: {
								coupon_code: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, "$coupon_code", ''] },
								userId: "$_id.user_id",
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ "$eq": ["$coupon_code", "$$coupon_code"] },
												{ "$eq": ["$user_id", "$$userId"] },
											]
										}
									}
								},
								{ $count: 'count' },
							],
							as: "orderDetails"
						}
					},
					{ "$unwind": { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
					{
						$project: {

							"user_id": "$_id.user_id",
							"city_id": "$_id.city_id",
							// "cityDetails": "$cityDetails",
							"type_status": "$type_status",
							"_id": "$_id._id",
							"coupon_code": "$coupon_code",
							"isodate": { $literal: isodate },
							"couponDetails": "$couponDetails",
							"is_coupon_applied": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, 1, 0] },
							"discount_type": "$discount_type",
							"coupon_discount": "$coupon_discount",
							'coupon_limit': "$orderDetails.count",
							"cart_details": {
								"$map": {
									// "input": "$cart_details",
									"input": {
										"$filter": {
											"input": "$cart_details",
											"as": "cart",
											"cond": {
												$eq: ["$$cart.id", "$$cart.foodDetails._id"],
											}
										}
									},
									"as": "el",
									"in": {
										'name': '$$el.foodDetails.name',
										// 'image': '$$el.image',
										'image': {
											$concat: [siteUrl, "$$el.image"]
										},
										// 'price_details': '$$el.foodDetails.price_details',
										'id': '$$el.id',
										// 'varntid': '$$el.varntid',
										'product_size': '$$el.foodDetails.size',
										'rcat_id': '$$el.rcat_id',
										'scat_id': '$$el.scat_id',
										'cart_id': '$$el._id',
										'size': '$$el.size',
										'offer': '$$el.foodDetails.offer_amount',
										'offer_status': '$$el.foodDetails.offer_status',
										'quantity_size': '$$el.foodDetails.quantity_size',
										'size_status': '$$el.size_status',
										"selectedVariantId": "$$el.selectedVariantId",
										'in_size': '$$el.foodDetails.in_size',
										'no_size': '$$el.foodDetails.no_size',
										'is_offer_available': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, 1, 0] },
										'offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, { $multiply: ['$$el.quantity', { $multiply: ['$$el.foodDetails.base_price', { $divide: ["$$el.foodDetails.offer_amount", 100] }] }] }, 0] },
										'price': '$$el.psprice',
										// 'offer_stats':{"$cond":{ if: [{$eq:["$$el.foodDetails.offer_status"]},1], then: 1, else: 0 }},
										'offsale': { $cond: [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, { $subtract: ["$$el.foodDetails.base_price", { $multiply: ['$$el.foodDetails.base_price', { $divide: ["$$el.foodDetails.offer_amount", 100] }] }] }, 0] },
										'offbase': '$$el.foodDetails.base_price',
										'mprice': '$$el.mprice',
										'slug': '$$el.foodDetails.slug',
										'status': '$$el.foodDetails.status',
										'product_quantity': '$$el.foodDetails.quantity',
										'quantity': '$$el.quantity',
										// 'total': { $multiply: ['$$el.quantity', '$$el.mprice'] },
										'total': { $cond: [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, { $multiply: ['$$el.quantity', '$$el.mprice'] }, { $multiply: ['$$el.quantity', '$$el.psprice'] }] },
										'mtotal': { $multiply: ['$$el.quantity', '$$el.mprice'] },
										'variations': '$$el.variations',

										'discount_percentage': {
											$round: [
												{
													$multiply: [

														{ $divide: [{ $subtract: ['$$el.foodDetails.base_price', '$$el.psprice'] }, '$$el.foodDetails.base_price'] },
														100
													]
												},
												2
											]

											// $multiply: [
											// 	{
											// 		$divide: [
											// 			{
											// 				$subtract: ['$$el.foodDetails.base_price', '$$el.psprice']

											// 			},
											// 			{ $abs: { $add: ['$$el.foodDetails.base_price', '$$el.psprice'] } }
											// 		]
											// 	},
											// 	100
											// ]
										}
									}
								}
							}
						}
					},
					{
						$project: {
							"selectedVariantId": "$selectedVariantId",
							"user_id": "$user_id",
							"city_id": "$city_id",
							// "cityDetails": "$cityDetails",
							"type_status": "$type_status",
							// "status": "$cityDetails.status",
							// "tax": { "$ifNull": ["$cityDetails.tax.tax_amount", 0] },
							"_id": "$_id",
							"coupon_code": "$coupon_code",
							"couponDetails": "$couponDetails",
							"food_offer_price": { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.offer_price" } } }] },
							"coupon_limit": "$coupon_limit",
							"is_coupon_err": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }, { $ne: [{ "$ifNull": ["$couponDetails", ''] }, ''] }, { $eq: ["$couponDetails.status", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'admin'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'restaurant'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }, { $gte: [{ "$size": { "$setIntersection": ["$couponDetails.restaurant", ["$restaurant_id"]] } }, 1] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, 'Coupon not valid1'] }] }, { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 0] }] }, '', 'Coupon not valid2'] }] },
							"is_coupon_applied": "$is_coupon_applied",
							"discount_type": "$discount_type",
							"coupon_discount": "$coupon_discount",
							"cart_details": "$cart_details",
							"total": { $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } },
							"sub_total": { $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "offer", "in": "$$offer.offer_price" } } }] }] },//itemtotal - itemtotaloffer
						}
					},
					{
						$project: {
							"selectedVariantId": "$selectedVariantId",
							"user_id": "$user_id",
							"city_id": "$city_id",
							"type_status": "$type_status",
							// "cityDetails": "$cityDetails",
							"_id": "$_id",
							"isodate": "$isodate",
							// "status": "$status",
							"food_offer_price": "$food_offer_price",
							"cart_details": "$cart_details",
							"coupon_code": "$coupon_code",
							"couponDetails": "$couponDetails",
							"discount_type": "$discount_type",
							"coupon_discount": "$coupon_discount",
							"total": "$total",
							"coupon_price": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] },
							"is_coupon_err": "$is_coupon_err",
							"is_coupon_applied": "$is_coupon_applied",
							"sub_total": "$sub_total",
							// 'service_tax': { "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] },
							"offer_price": "$offer_price",
							"pay_total": {
								$sum: [
									{
										"$cond": [{
											$and:
												[{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }]
										},
										{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0]
									},
									{
										$subtract: ["$sub_total", {
											"$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] },
											{
												"$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] },
												{
													$multiply: [{
														$subtract: [
															{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } },
															{ $sum: ["$food_offer_price", "$offer_price"] }
														]
													}, {
														$divide: ["$couponDetails.amount_percentage", 100]
													}]
												},
													"$couponDetails.amount_percentage"]
											}, 0]
										}]
									}]
							},
							"delivery_cost": { $literal: 0 },
							"deli_target_cost": { $literal: 0 },
							"tax_percent": { $literal: 0 },
							"schedule_type": { $literal: '' },
							"schedule_time": { $literal: '' },
							"schedule_day": { $literal: '' }

						}
					},
					{
						$project: {
							"selectedVariantId": "$selectedVariantId",
							"user_id": "$user_id",
							"city_id": "$city_id",
							"type_status": "$type_status",
							"_id": "$_id",
							"isodate": "$isodate",
							"food_offer_price": "$food_offer_price",
							"cart_details": "$cart_details",
							"coupon_code": "$coupon_code",
							"couponDetails": "$couponDetails",
							"discount_type": "$discount_type",
							"coupon_discount": "$coupon_discount",
							"total": "$total",
							"coupon_price": {
								"$cond": [{
									$and: [{
										$eq: ["$is_coupon_applied", 1]
									}]
								}, {
									"$cond": [{
										$and: [{
											$eq: ["$couponDetails.discount_type", 'Percentage']
										}]
									}, {
										$multiply: [{
											$subtract: [{
												$sum: {
													"$map": {
														"input": "$cart_details",
														"as": "el",
														"in": "$$el.total"
													}
												}
											}, {
												$sum: ["$food_offer_price", "$offer_price"]
											}]
										}, {
											$divide: ["$couponDetails.amount_percentage", 100]
										}]
									}, "$couponDetails.amount_percentage"]
								}, 0]
							},
							"is_coupon_err": "$is_coupon_err",
							"is_coupon_applied": "$is_coupon_applied",
							"sub_total": {
								$round: "$sub_total" // Round sub_total
							},
							"offer_price": {
								$round: "$offer_price" // Round offer_price
							},
							"pay_total": {
								$round: "$pay_total" // Round pay_total
							},
							"delivery_cost": {
								$literal: 0
							},
							"deli_target_cost": {
								$literal: 0
							},
							"tax_percent": {
								$literal: 0
							},
							"schedule_type": {
								$literal: ''
							},
							"schedule_time": {
								$literal: ''
							},
							"schedule_day": {
								$literal: ''
							}
						}
					}

				];
				//    var data={}
				const cartDetails = await db.GetAggregation(collection, aggregationdata)
				// console.log(cartDetails, 'this is the initial card details');
				if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {

					if (cartDetails[0].cart_details) {
						// console.log(cartDetails[0].cart_details, 'this is the initial card details of that');

						for (let index = 0; index < cartDetails[0].cart_details.length; index++) {
							let substring_to_find = "./";
							if (typeof cartDetails[0].cart_details[index].id != 'undefined' && typeof cartDetails[0].cart_details[index].id != 'null') {
								if (cartDetails[0].cart_details[index].image && cartDetails[0].cart_details[index].image.indexOf(substring_to_find) !== -1) {



									cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image
								} else {



									cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image;
								}
							}
						}
					}

					cartDetails[0].currency = settings.doc.settings.currency_symbol;
					cartDetails[0].pay_total = cartDetails[0].pay_total;




					if (cartDetails[0].pay_total < 0) {
						cartDetails[0].pay_total = 0;
					}
					const data = {
						error: false,
						message: 'Data Retrieved From Cart !',
						data: [],
						total_quantity: "",
						dataproduct_details: cartDetails[0],
						sub_total: "",
						delivery_charge: "",
						tax_percentage: "",
						tax_amount: "",
						overall_amount: "",
						total_arr: "",
					}
					res.send(data);
				} else {
					await db.DeleteDocument('cart', { 'user_id': req.body.userId })
					res.send({ err: 0, error: true, message: '', cartDetails: {} });
				}
			}
		} catch (error) {
			console.log(error);
		}
	}


	// in this add, update, delete 
	controller.addCart = async function (req, res) {
		try {
			let data = {}
			data.foodId = req.body.product_id;
			data.type = req.body.type;
			data.foodname = req.body.product_name;
			data.userId = req.body.user_id;
			data.mprice = req.body.base_price;
			data.pprice = req.body.sale_price;
			data.varientId = req.body.varient_id;
			data.quantity = req.body.quantity;
			data.variants = req.body.variance;
			data.selectedVariantId = req.body.selectedVariantId



			var type;
			type = data.type;
			console.log(data, 'this is the data');
			var userId;
			userId = data.userId;

			// if (data.type == 'temp_cart') {
			// 	if (typeof data.userId != 'undefined' && data.userId != '') {
			// 	} else {
			// 		res.send( { err: 1, message: 'Invalid userId' });
			// 		return;
			// 	}
			// } else {
			// 	if (typeof data.userId != 'undefined' && data.userId != '') {
			// 		if (isObjectId(data.userId)) {
			// 			userId = new mongoose.Types.ObjectId(data.userId);
			// 		} else {
			// 			res.send( { err: 1, message: 'Invalid userId' });
			// 			return;
			// 		}
			// 	} else {
			// 		res.send( { err: 1, message: 'Invalid userId' });
			// 		return;
			// 	}
			// }
			var foodId;
			foodId = new mongoose.Types.ObjectId(data.foodId);
			// if (typeof data.foodId != 'undefined' && data.foodId != '') {
			// 	if (isObjectId(data.foodId)) {

			// 	} else {
			// 		res.send( { err: 1, message: 'Invalid foodId' });
			// 		return;
			// 	}
			// } else {
			// 	res.send( { err: 1, message: 'Invalid foodId' });
			// 	return;
			// }
			var varntid;

			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId };
			// console.log(data.type_status, 'this is type status');
			if (data && data.type_status == 1) {
				// console.log("It is exist at here");
				condition.type_status = 1;
				const cart = await db.GetOneDocument(collection, condition, {}, {})
				if (!cart) {
					res.send({ err: 1, message: 'Unable to fetch data.' });
				}
				else {
					var is_cart_available = 0;
					if (cart && typeof cart._id != 'undefined') {
						is_cart_available = 1;

					}
					var condition = { _id: foodId, status: 1 };
					const foodDetails = await db.GetOneDocument('food', condition, {}, {})
					if (!foodDetails) {
						res.send({ err: 1, message: 'Unable to fetch data.' });
					} else {
						if (foodDetails.doc && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
							var quantityCond = 0
							if (data.size_status == 1) {

								let con = {
									"price_details.attributes": {
										$elemMatch: {
											chaild_id: targetChaildId
										}
									},

									"price_details.$": 1

								}
								console.log("hi are you here please respond");
								const isVarient = await db.GetDocument.find('food', con, {}, {})
								console.log(isVarient, 'this is checking for varient');

							} else {
								console.log("Are you entered at here");
								if (foodDetails.doc.quantity >= parseInt(data.addons_quantity)) {
								}
							}
							if (quantityCond == 1) {
								await db.DeleteDocument(collection, { user_id: userId, type_status: 1 });

								var updateDetails = { user_id: userId, cart_details: [], type_status: 1 };
								var foods = {
									id: foodDetails.doc._id,
									pid: data.pid,
									psprice: data.psprice,
									mprice: data.mprice,
									quantity: parseInt(data.addons_quantity),
									rcat_id: data.rcat_id,
									scat_id: data.scat_id,	
									size: data.size,
									size_status: data.size_status,
									image: foodDetails.doc.avatar.webpImg,
									selectedVariantId: data.selectedVariantId
								}
								updateDetails.cart_details.push(foods);
								await db.InsertDocument(collection, updateDetails)
								res.send({ err: 0, message: '', 'updateDetails': updateDetails });

							} else {
								res.send({ err: 1, message: 'This product is in below Quantity.' });
							}
						} else {
							res.send({ err: 1, message: 'Product Not Found.' });
						}
					}

				}

			} else {
				const cart = await db.GetOneDocument(collection, condition, {}, {})
				console.log(cart, 'this is the cart____----------------');
				if (!cart) {
					res.send({ error: true, message: 'Unable to fetch data.' });
				} else {
					var is_cart_available = 0;
					if (cart && typeof cart.doc._id != 'undefined') {
						is_cart_available = 1;
					}
					console.log(is_cart_available, 'is_cart_available is_cart_available is_cart_available ');
					var condition = { _id: foodId, status: 1 };
					const foodDetails = await db.GetOneDocument('food', condition, {}, {})
					// console.log(foodDetails, 'this is the food details');
					if (!foodDetails) {
						res.send({ error: true, message: 'Unable to fetch data.' });
					} else {
						if (foodDetails && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
							var quantityCond = 0;
							if (foodDetails.doc.size_status == 1) {
								console.log(data.varientId, 'this is varient id');
								let con = {
									"_id": foodDetails.doc._id,
									"price_details.attributes": {
										$elemMatch: {
											chaild_id: data.varientId
										}
									}

								}
								console.log("hi are you here please respond");
								const isVarient = await db.GetOneDocument('food', con, {}, {})
								console.log(isVarient, 'this is varient');
								const priceDetails = isVarient.doc.price_details
								const matchingItem = priceDetails?.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
								console.log(matchingItem, 'this is matching item ****');
								if (matchingItem) {
									if (is_cart_available == 0) {
										console.log("hi are you here");
										console.log(matchingItem.image, 'this is the image');
										var updateDetails1 = { user_id: userId, cart_details: [] };
										var foods = {
											id: foodDetails.doc._id,
											// pid: data.pid,
											psprice: matchingItem.sprice,
											mprice: matchingItem.mprice,
											quantity: parseInt(data.quantity),
											rcat_id: foodDetails.doc.rcategory,
											scat_id: foodDetails.doc.scategory,
											// size: data.size,
											product_varient: data.varientId,
											size_status: data.size_status,
											image: matchingItem.image,
											variations: data.variants,
											selectedVariantId: data.selectedVariantId
										}

										console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");

										console.log(foods);

										console.log("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");

										updateDetails1.cart_details.push(foods);
										const wy = await db.InsertDocument(collection, updateDetails1)
										console.log(wy, 'wywywywywywywywywywywywywywywywywywywy');
										res.send({ error: false, message: '', 'updateDetails': updateDetails })
									} else {
										let index_pos = cart.doc.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString());
										console.log(index_pos, 'this is index pos');
										if (index_pos == -1) {
											console.log(matchingItem.image, 'image of the product');
											var foods = {
												id: foodDetails.doc._id,
												// pid: data.pid,
												psprice: matchingItem.sprice,
												mprice: matchingItem.mprice,
												quantity: parseInt(data.quantity),
												rcat_id: foodDetails.doc.rcategory,
												scat_id: foodDetails.doc.scategory,
												// size: data.size,
												product_varient: data.varientId,
												size_status: data.size_status,
												image: matchingItem.image,
												variations: data.variants,
												selectedVariantId: data.selectedVariantId
											}
											var condition = { user_id: userId };
											var updateDetails = { $push: { 'cart_details': foods } };
											await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
											res.send({ error: false, message: 'The product is added to cart', 'updateDetails': updateDetails });
											// });
										} else {
											const matchingItem = priceDetails.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
											console.log(matchingItem, 'This is matching id');
											var condition = { user_id: userId };
											var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
											if (data) {
												const cart = await db.GetOneDocument(collection, condition, {}, {})
												const isSizeInCart = cart.doc.cart_details.some(item => item.size === data.size);
												console.log(cart, 'this is cart');
												console.log(isSizeInCart, 'is in cart available');
												if (isSizeInCart) {
													var condition = {
														user_id: userId
													};
													if (foodDetails.doc.size_status === 1) {
														const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
														const currentProductQuantity = currentProduct[0].quantity;
														const matchSize = priceDetails.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
														const matchQuantity = matchSize.quantity;
														console.log(currentProduct, 'currentProduct');
														console.log(currentProductQuantity, 'currentProductQuantity');
														console.log(matchSize, 'matchSize');
														console.log(matchQuantity, 'matchQuantity');
														const IsProductExist = cart.doc.cart_details.some(item => item.product_varient === data.varientId);
														if (IsProductExist) {
															if (currentProductQuantity >= matchQuantity) {
																res.send({ error: true, message: 'This product is in below Quantity.' });
															} else {
																var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.quantity) } };
																// console.log(data, 'this is the datoo oo }}{{}}{{}}{{}}{}{}{}{}{{}{}}}{}{}');
																const rest = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }, { "elem.variations": { $all: data.variants } }] }] })
																res.send({ error: false, message: 'The product added to the cart', 'updateDetails': rest });
															}
														} else {
															console.log(matchingItem.image, 'image of the product');
															var foods = {
																id: foodDetails.doc._id,
																// pid: data.pid,
																psprice: matchingItem.sprice,
																mprice: matchingItem.mprice,
																quantity: parseInt(data.quantity),
																rcat_id: foodDetails.doc.rcategory,
																scat_id: foodDetails.doc.scategory,
																// size: data.size,
																product_varient: data.varientId,
																size_status: data.size_status,
																image: matchingItem.image,
																variations: data.variants,
																selectedVariantId: data.selectedVariantId
															}
															var condition = { user_id: userId };
															var updateDetails = { $push: { 'cart_details': foods } };
															await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
															res.send({ error: false, message: 'The prodcut added to cart', 'updateDetails': updateDetails });
														}

													} else {
														const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
														const currentProductQuantity = currentProduct[0].quantity;
														const matchQuantity = foodDetails.doc.quantity
														if (currentProductQuantity >= matchQuantity) {
															res.send({ error: true, message: 'This product is in below Quantity.' });
														} else {
															var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
															const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] })
															res.send({ error: false, message: 'This is update 2', 'updateDetails': res });
														}

													}
												} else {
													var foods = {
														id: foodDetails.doc._id,
														pid: data.pid,
														psprice: data.pprice,
														mprice: data.mprice,
														quantity: 1,
														rcat_id: data.rcat_id,
														scat_id: data.scat_id,
														size: data.size,
														size_status: data.size_status,
														image: foodDetails.doc.avatar.slice(2),
														selectedVariantId: data.selectedVariantId
													}
													var condition = { user_id: userId };
													var updateDetails = { $push: { 'cart_details': foods } };
													const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
													res.send({ error: false, message: 'This is update 2', 'updateDetails': res });

												}

											}

										}
									}
								} else {
									return res.send({ error: true, message: 'This product is in below Quantity.' });
								}
							} else {
								if (foodDetails.doc.quantity >= parseInt(data.quantity)) {
									quantityCond = 1;
								}
							}
							console.log(quantityCond, 'this is quantity count');
							if (quantityCond == 1) {
								console.log("hi you entered in the quantity cound");
								if (is_cart_available == 0) {
									var updateDetails1 = { user_id: userId, cart_details: [] };
									var foods = {
										id: foodDetails.doc._id,
										pid: data.pid,
										psprice: data.pprice,
										mprice: data.mprice,
										quantity: parseInt(data.quantity),
										rcat_id: foodDetails.doc.rcategory,
										scat_id: foodDetails.doc.scategory,
										size: data.size,
										size_status: foodDetails.doc.size_status,
										image: foodDetails.doc.avatar.slice(2),
										selectedVariantId: data.selectedVariantId

									}
									updateDetails1.cart_details.push(foods);
									await db.InsertDocument(collection, updateDetails1)
									res.send({ error: false, message: 'Product added to the cart', 'updateDetails': updateDetails })
								} else {
									let index_pos = cart.doc.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString());
									console.log(index_pos, 'this are the index_pos');
									if (index_pos == -1) {
										var foods = {
											id: foodDetails.doc._id,
											pid: data.pid,
											psprice: data.pprice,
											mprice: data.mprice,
											quantity: parseInt(data.quantity),
											rcat_id: foodDetails.doc.rcategory,
											scat_id: foodDetails.doc.scategory,
											size: data.size,
											size_status: foodDetails.doc.size_status,
											image: foodDetails.doc.avatar.slice(2),
											selectedVariantId: data.selectedVariantId

										}
										var condition = { user_id: userId };
										var updateDetails = { $push: { 'cart_details': foods } };
										await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										res.send({ error: true, message: 'The product added to the cart', 'updateDetails': updateDetails });

										// });
									} else {
										var condition = { user_id: userId };
										var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.quantity) } };
										// if (data.size) {
										console.log(updateDetails, 'update details');
										const cart = await db.GetOneDocument(collection, condition, {}, {})
										console.log(cart, 'this is the cart');
										const isSizeInCart = cart.doc.cart_details.some(item => item.size === data.size);
										console.log(isSizeInCart, 'is size in chart');
										if (isSizeInCart) {
											var condition = {
												user_id: userId
											};
											if (foodDetails.doc.size_status === 1) {
												const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
												const currentProductQuantity = currentProduct[0].quantity;
												const matchSize = foodDetails.doc.quantity_size.filter(el => el.size === data.size)
												const matchQuantity = matchSize[0].quantity;
												if (currentProductQuantity >= matchQuantity) {
													res.send({ err: 1, message: 'This product is in below Quantity.' });
												} else {
													var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
													const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] })
													res.send({ error: false, message: 'The product added successfully', 'updateDetails': res });
												}
											} else {
												const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId)
												console.log(currentProduct, 'this is the current product');
												const currentProductQuantity = currentProduct[0].quantity;
												console.log(currentProductQuantity, 'this is the current product quantity');
												const matchQuantity = foodDetails.doc.quantity
												console.log(matchQuantity, 'match quantity');
												if (currentProductQuantity >= matchQuantity) {
													res.send({ error: true, message: 'This product is in below Quantity.' });
												} else {
													// data.size="None";
													console.log("I think you are at here");
													var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.quantity) } };

													const resul = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }] }] })
													console.log(resul, 'this is the res_________-----------');
													res.send({ error: false, message: 'Product added to the cart', 'updateDetails': resul });
												}
											}
										} else {
											var foods = {
												id: foodDetails.doc._id,
												pid: data.pid,
												psprice: data.psprice,
												mprice: data.mprice,
												quantity: 1,
												rcat_id: data.rcat_id,
												scat_id: data.scat_id,
												size: data.size,
												size_status: data.size_status,
												image: foodDetails.doc.avatar.slice(2),
												selectedVariantId: data.selectedVariantId
											}
											var condition = { user_id: userId };
											var updateDetails = { $push: { 'cart_details': foods } };
											const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
											res.send({ error: false, message: 'The product added to cart', 'updateDetails': res });

										}

										// }

									}
								}
							} else {
								res.send({ error: true, message: 'This product is in below Quantity.' });
							}
						} else {
							res.send({ error: true, message: 'Product Not Found.' });
						}
					}

				}

			}
		} catch (error) {

		}
	}

	controller.updateCart = async function (req, res) {
		try {
			var type;
			data = {};
			data.foodId = req.body.product_id;
			data.cart_id = req.body.cart_id;
			data.quantity_type = req.body.quantity_type;
			data.userId = req.body.user_id;
			data.type = req.body.type;
			data.variations = req.body.variations;

			console.log(data, 'this is the data from the data+++++++++++++++++++++++++++++++++++');
			type = data.type;


			var userId;
			userId = data.userId;



			var foodId;
			foodId = data.foodId;
			var cart_id;
			cart_id = data.cart_id;
			var quantity_type;
			quantity_type = data.quantity_type;

			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId };
			const cart = await db.GetOneDocument(collection, condition, {}, {})
			console.log(cart, 'this is cart from the universe ');
			if (!cart) {
				res.send({ err: 2, message: 'Unable to fetch data.' });
			} else {
				var is_food_available = 0;
				var is_cart_available = 0;
				var foodIndex = -1;
				var cartLength = -1;
				if (cart.doc && typeof cart.doc._id != 'undefined') {
					is_cart_available = 1;
					if (typeof cart.doc.cart_details != 'undefined') {
						cartLength = cart.doc.cart_details.length;
						console.log(cart_id, 'this is the cart id');
						console.log('cartDetails', cart.doc.cart_details);
						foodIndex = cart.doc.cart_details.map(function (e) { return e._id.toString(); })
						console.log(foodIndex, 'this is the food index');
						console.log(foodId, 'this is the food id');
						foodIndex = foodIndex.indexOf(cart_id)
						console.log(foodIndex, 'this is the food index +_____________');
						// console.log();
						// indexOf(req.body.product_id.toString());
						if (foodIndex != -1) {
							is_food_available = 1;
						}
					}
				} else {
					res.send({ error: true, message: 'Cart Details Not Found.' });
					return;
				}
				console.log(is_food_available, 'is_food_available');
				console.log(foodIndex, 'foodIndex');
				console.log(cartLength, 'cartLength');
				if (is_food_available == 0 || foodIndex == -1 || cartLength == -1) {
					res.send({ err: 2, message: 'Product Not Found+++++++++++.' });
					return;
				} else {
					var condition = { _id: foodId, status: 1 };
					const foodDetails = await db.GetOneDocument('food', condition, {}, {})
					console.log(foodDetails, 'this is the details from the universe');
					if (!foodDetails) {
						res.send({ err: 2, message: 'Unable to fetch data.' });
					} else {
						if (typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
							var quantitys = 0
							quantitys = cart.doc.cart_details[foodIndex].quantity;
							if (data.variations && data.variations.length > 0) {
								console.log("Hello how are you");


								function findMatchingProduct(variants, priceDetails) {
									for (const product of priceDetails) {
										const attributes = product.attributes.map(attr => attr.chaild_name);
										if (variants.every(variant => attributes.includes(variant))) {
											return product;
										}
									}
									return null;
								}
								if (data && data.type_status == 0) {
									var condition = { user_id: userId, "cart_details": { $elemMatch: { "id": foodId, "size": data.size } } };
									const doc = await db.GetOneDocument(collection, condition, {}, {})
									console.log(doc, 'this is doc');
									if (doc.status) {
										var quantityCond = 0;
										var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= cart.doc.cart_details[foodIndex].quantity });
										if (sizeArr && sizeArr.length > 0) {
											quantityCond = 1;
										}
										if (quantityCond == 1) {
											var updateDetails = { "cart_details.$.size": data.size };
											const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
											res.send({ error: false, message: 'Sucessfully Cart Updated.' });
										} else {
											res.send({ error: true, message: 'This product is in below Quantity.' });
										}
									} else {
										var condtin = { user_id: userId, "cart_details": { $elemMatch: { "_id": cart_id } } }
										const docdata = await db.GetOneDocument(collection, condtin, {}, {})
										if (docdata.status) {
											var quantityCond = 0;
											var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= 0 });
											if (sizeArr && sizeArr.length > 0) {
												quantityCond = 1;
											}
											if (quantityCond == 1) {

												var foods = {
													id: foodDetails.doc._id,
													pid: data.pid,
													psprice: data.psprice,
													mprice: data.mprice,
													quantity: 1,
													rcat_id: data.rcat_id,
													scat_id: data.scat_id,
													size: data.size,
													size_status: data.size_status,
													image: foodDetails.doc.avatar.slice(2)
												}
												var condition = { user_id: userId };
												var updateDetails = { $push: { 'cart_details': foods } };
												res.send({ error: false, message: '', 'updateDetails': updateDetails });

											} else {
												res.send({ error: true, message: 'This product is in below Quantity.' });
											}
										} else {
											res.send({ error: false, message: '', 'updateDetails': updateDetails });
										}

									}

								} else {
									var quantityCond = 0;
									const matchingProduct = findMatchingProduct(data.variations, foodDetails.doc.price_details);
									var quantity = 0;
									if (typeof cart.doc.cart_details[foodIndex].quantity != 'undefined') {
										quantity = cart.doc.cart_details[foodIndex].quantity;
									}
									if (quantity_type == 'decreement') {
										if (quantity > 0) {
											quantity = quantity - 1;
										}
									} else {
										quantity = quantity + 1;
									}
									console.log(matchingProduct, 'this is the matching product');
									if (matchingProduct != null && matchingProduct.quantity > 0 && quantity <= matchingProduct.quantity) {
										quantityCond = 1;
									}
									if (quantityCond == 1) {
										var condition = {
											user_id: userId,
											"cart_details": {
												$elemMatch: {
													"_id": cart_id,
													"variations": { $in: data.variations }
												}
											}
										};
										console.log(quantity, 'quantity quantity quantity');
										var updateDetails = { "cart_details.$.quantity": parseInt(quantity) };
										var update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										console.log(update, 'update');


										if (update.status) {
											res.send({ error: false, message: 'Sucessfully Cart Updated.', product_details: update.doc });
										}

									} else {
										res.send({ err: 1, message: 'This product is in below Quantity.' });
									}
								}

							} else {
								console.log("Hi how are you");
								var quantity = 0;
								if (typeof cart.doc.cart_details[foodIndex].quantity != 'undefined') {
									quantity = cart.doc.cart_details[foodIndex].quantity;
								}
								if (quantity_type == 'decreement') {
									if (quantity > 0) {
										quantity = quantity - 1;
									}
								} else {
									quantity = quantity + 1;
								}
								if (quantity > 0) {
									var quantityCond = 0;
									if (cart.doc.cart_details[foodIndex].size_status == 1) {
										var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == cart.doc.cart_details[foodIndex].size && e.quantity >= parseInt(quantity) });
										if (sizeArr && sizeArr.length > 0) {
											quantityCond = 1;
										}
									} else {
										if (foodDetails.doc.quantity >= parseInt(quantity)) {
											quantityCond = 1;
										}
									}
									if (quantityCond == 1) {
										var updateDetails = { "cart_details.$.quantity": parseInt(quantity) };
										var condition = { user_id: userId, "cart_details": { $elemMatch: { "id": foodId } } };
										const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										console.log(update, 'this is the update');
										if (update.status) {
											res.send({ error: false, message: 'Sucessfully Cart Updated.' });
										}

									} else {
										res.send({ error: true, message: 'This product is in below Quantity.' });
									}
								} else {
									if (cartLength > 1) {
										var updateDetails = { "$pull": { 'cart_details': { _id: { $in: [cart_id] } } } };
										var condition = { user_id: userId };
										const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										if (update.status) {
											res.send({ err: 0, message: 'Sucessfully Cart Updated.' });
										}

									} else {
										var condition = { user_id: userId };
										await db.DeleteDocument(collection, condition)
										res.send({ error: false, message: 'Sucessfully Cart Updated.' });

									}
								}
							}
						} else {
							res.send({ error: true, message: 'Product Not Found.' });

						}
					}
				}
			}
		} catch (error) {

		}
	}

	controller.deleteCart = async function (req, res) {
		try {
			var type;
			console.log(req.body, 'this is the ');
			let data = {}
			data.type = req.body.type
			data.userId = req.body.userId
			data.cartId = req.body.cartId
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					res.send({ err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				res.send({ err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					res.send({ err: 1, message: 'Invalid userId' });
					return;
				}
			}
			userId = data.userId;
			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var cartId;
			if (typeof data.cartId != 'undefined' && data.cartId != '') {
				cartId = data.cartId;
			} else {
				res.send({ err: 1, message: 'Invalid cartId' });
				return;
			}
			if (data.type_status && data.type_status == 1) {
				var condition = { user_id: userId, type_status: 1, cart_details: { $elemMatch: { _id: cartId } } };
			} else {
				var condition = { user_id: userId, type_status: 0, cart_details: { $elemMatch: { _id: cartId } } };
			}
			const cart = await db.GetOneDocument(collection, { user_id: userId }, {}, {})
			if (cart.status === false) {
				res.send({ err: 1, message: 'Unable to fetch data.' });
			} else {
				if (cart && typeof cart.doc._id != 'undefined') {
					if (typeof cart.doc.cart_details != 'undefined' && cart.doc.cart_details.length > 1) {
						var updateDetails = { "$pull": { 'cart_details': { _id: { $in: [cartId] } } } };
						var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cartId } } };
						await db.UpdateDocument(collection, condition, updateDetails, { multi: true })

						res.send({ err: 0, message: 'Sucessfully Removed From Cart.' });
					} else {
						if (data.type_status && data.type_status == 1) {
							var condition = { user_id: userId, type_status: 1 };
						} else {
							var condition = { user_id: userId };
						}
						const del = await db.DeleteDocument(collection, condition)

						res.send({ error: false, message: 'Sucessfully Removed From Cart.', cart: condition });
					}
				} else {
					res.send({ err: 1, message: 'Cart Not Found.' });
				}
			}
		} catch (error) {
			console.log(error, 'this is the error');
		}
	}
	return controller;
}





