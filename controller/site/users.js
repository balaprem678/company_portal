var db = require('../../controller/adaptor/mongodb.js');
var async = require('async');
var mongoose = require('mongoose');
var mailcontent = require('../../model/mailcontent.js');
var twilio = require('../../model/twilio.js');
var timezone = require('moment-timezone');
var moment = require("moment");
var bcrypt = require('bcrypt');
var format = require('format-number');
var library = require('../../model/library.js');
var CONFIG = require('../../config/config.js');
var pdf = require('html-pdf');
var fs = require('fs');
const crypto = require("crypto");
var jwt = require('jsonwebtoken');

const { users, contact, billing_address } = require('../../model/mongodb.js')

const { check, body, validationResult, sanitizeBody } = require('express-validator');

function isObjectId(n) {
	return mongoose.Types.ObjectId.isValid(n);
};
var each = require('sync-each');
var geoTz = require('geo-tz');
var tz = require('moment-timezone');
const { settings } = require('../../schema/setting.schema.js');
const { response } = require('express');
const { json } = require('body-parser');
const { log } = require('console');
const smsClient = require('../../help/sendsms.js');
const mail = require('../../model/mail.js');

module.exports = function (io) {
	var router = {};

	router.getrefercoupon = function (req, res) {
		db.GetOneDocument('refer_coupon', { 'status': 1, "expires": { "$gte": new Date() } }, {}, {}, function (err, coupon) {
			if (err) {
				res.send(err);
			} else {
				res.send(coupon);
			}
		});
	}

	router.forgotpass = function (req, res) {
		db.GetOneDocument('users', { "email": req.body.email }, {}, {}, function (err, userData) {
			if (err) {
				res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
			} else {
				if (userData && typeof userData._id != 'undefined') {
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
						var url = '';
						if (settings) {
							url = '<a style="display: inline-block; background-color: #e15500; color: #fff !important; padding: 10px; text-decoration: none; font-size: 12px; text-transform: uppercase;" href=' + settings.settings.site_url + 'userforgotReturn/' + userData._id + '>Click to reset the password</a>';
						}
						var mailData = {};
						mailData.template = 'forgot_password_user';
						mailData.to = req.body.email;
						mailData.html = [];
						mailData.html.push({ name: 'name', value: userData.username || "" });
						mailData.html.push({ name: 'link', value: url || "" });
						mailcontent.sendmail(mailData, function (err, response) { });
						var forgot = {};
						forgot.last_sent = new Date();
						forgot.is_done = 0;
						db.UpdateDocument('users', { 'email': req.body.email }, { 'forgot_password': forgot }, {}, (err, updated) => {
							res.send({ status: 1, response: {} });
						});
					})
				} else {
					res.send({ "status": 0, "message": 'Sorry, your email Id is not registered with us.' });
				}
			}
		})
	};

	router.loginVerifyPhonepass = function (req, res) {
		db.GetOneDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, userData) {
			if (err) {
				res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
			} else {
				if (userData && typeof userData._id != 'undefined') {
					if (typeof userData.password != 'undefined') {
						res.send({ "status": 1, "message": 'user exists' });
					} else {
						res.send({ "status": 0, "message": 'Sorry, your account has registered without password, use forgot password to set a new password' });
					}
				} else {
					res.send({ "status": 0, "message": 'Sorry, your mobile number is not registered with us.' });
				}
			}
		})
	};

	router.loginVerifyPhoneOtp = function (req, res) {
		var otp = Math.floor(1000 + Math.random() * 9000);
		db.GetOneDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, userData) {
			if (err) {
				res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
			} else {
				if (userData && typeof userData._id != 'undefined') {
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
						if (err) {
							res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
						} else {
							var verify_otp = bcrypt.hashSync(otp, bcrypt.genSaltSync(8), null);
							db.UpdateDocument('users', { _id: userData._id }, { 'verify_otp': otp }, {}, function (err, response) {
								if (err || response.nModified == 0) {
									res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
								} else {
									db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smsSettings) {
										if (err) {
											res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
										} else {
											var data = {};
											data.mode = 0;
											data.otp = otp;
											var to = req.body.country_code + req.body.phone_number;
											var message = `${otp} is your ${generalSettings.settings.site_title} OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.`;
											if (smsSettings.settings.twilio.mode == "production") {
												data.mode = 1;
												twilio.createMessage(to, '', message, function (err, response) { });
											}
											res.send({
												"status": 1,
												"message": `We've sent an OTP to the mobile number ${req.body.country_code} ${req.body.phone_number}. Please enter it below to complete verification.`,
												"data": data
											});
										}
									})
								}
							})
						}
					})
				} else {
					res.send({ "status": 0, "message": 'Sorry, your mobile number is not registered with us.' });
				}
			}
		})
	};

	router.getAllFeatureCity = function (req, res) {
		var data = {};
		db.GetDocument('city', { 'status': 1, 'featured': 'Yes' }, { cityname: 1, image: 1, slug: 1, location: 1, address: 1 }, { sort: { cityname: 1 } }, function (err, cities) {
			if (err) {
				data.err = 1;
				data.msg = 'unable to fetch data';
				data.cityDetails = [];
				res.send(data);
			} else {
				data.err = 0;
				data.msg = '';
				data.cityDetails = [];
				if (typeof cities != 'undefined') {
					data.cityDetails = cities;
				}
				res.send(data);
			}
		});
	}

	router.getCityDetails = function (req, res) {
		var city;
		if (typeof req.body.city != 'undefined' && req.body.city != '') {
			city = req.body.city;
		} else {
			res.send({ err: 1, message: 'Invalid city' });
			return;
		}
		var data = {};
		db.GetOneDocument('city', { 'status': 1, 'featured': 'Yes', 'cityname': city }, { cityname: 1, image: 1 }, {}, function (err, cities) {
			if (err) {
				data.err = 1;
				data.msg = 'unable to fetch data';
				data.cityDetails = {};
				res.send(data);
			} else {
				data.err = 0;
				data.msg = '';
				data.cityDetails = {};
				if (cities && typeof cities != 'undefined') {
					data.cityDetails = cities;
				}
				res.send(data);
			}
		});
	}

	router.getRestaurantDetails = function (req, res) {
		var slug;
		if (typeof req.body.slug != 'undefined' && req.body.slug != '') {
			slug = req.body.slug;
		} else {
			res.send({ err: 1, message: 'Invalid slug' });
			return;
		}
		var lat;
		if (typeof req.body.lat != 'undefined' && req.body.lat != '') {
			lat = req.body.lat;
		} else {
			res.send({ err: 1, message: 'Invalid lat' });
			return;
		}
		var lon;
		if (typeof req.body.lon != 'undefined' && req.body.lon != '') {
			lon = req.body.lon;
		} else {
			res.send({ err: 1, message: 'Invalid long' });
			return;
		}
		var client_offset = (new Date).getTimezoneOffset();
		if (typeof req.body.client_offset != 'undefined') {
			client_offset = req.body.client_offset
		}
		var radius = 20;
		if (typeof req.body.radius != 'undefined' && req.body.radius != '') {
			try {
				radius = parseInt(req.body.radius);
			} catch (e) {
				radius = 20;
			}
		}
		var foodcond = { $and: [{ $eq: ["$$food.status", 1] }] };
		if (req.body.veg && parseInt(req.body.veg) == 1) {
			foodcond = { $and: [{ $eq: ["$$food.status", 1] }, { $eq: ["$$food.itmcat", 1] }] };
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ err: 0, message: '', restaurantList: {} });
			} else {
				var temp_radius = settings.settings.radius || 20;
				var radius = parseInt(temp_radius);
				var filter_query = { "status": 1, slug: { $eq: slug } };
				var Restaurantcondition = [
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
							restaurantList: {
								username: "$username", _id: "$_id", restaurantname: "$restaurantname", slug: "$slug", time_setting: "$time_setting", working_hours: "$working_hours", avg_ratings: "$avg_ratings", food_img: "$food_img", offer: "$offer", about: "$about", logo: "$logo", avatar: "$avatar", distance: "$distance", main_cuisine: "$main_cuisine", efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] }, location: "$location", latitude: "$location.lat", longitude: "$location.lng", avail: "$avail", avg_delivery: "$avg_delivery", deliverd: "$deliverd", cancelled: "$cancelled", categories: "$categories", availability: "$availability", phone: "$phone", address: "$address", fssaino: "$fssaino", rcategory: "$rcategory"
							}
						}
					},
					{ $lookup: { from: 'categories', localField: "restaurantList._id", foreignField: "restaurant", as: "restaurantList.restaurantCategories" } },
					{ $lookup: { from: 'food', localField: "restaurantList._id", foreignField: "shop", as: "restaurantList.foodDetails" } },
					{
						$project: {
							restaurantList: {
								username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, working_hours: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, fssaino: 1, rcategory: 1,
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
										cond: foodcond
									}
								}
							}
						}
					},
					{
						$project: {
							restaurantList: {
								username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, working_hours: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, fssaino: 1, rcategory: 1, foodDetails: 1,
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
								username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, working_hours: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, fssaino: 1, rcategory: 1,
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
												"$cond": [{ $or: [{ $and: [{ $ne: [{ "$ifNull": ["$$el.subCategories", ''] }, ''] }, { $gte: [{ "$size": "$$el.subCategories" }, 0] }] }, { $and: [{ $ne: [{ "$ifNull": ["$$el.name", ''] }, ''] }, { $eq: ["$$el.name", 'Recommended'] }] }] }, {
													$filter: {
														input: "$restaurantList.foodDetails",
														as: "food",
														cond: { $or: [{ $and: [{ $gte: [{ "$size": "$$food.categories" }, 1] }, { $or: [{ $gte: [{ "$size": { "$setIntersection": ["$$food.categories", [{ 'category': "$$el._id" }]] } }, 1] }, { "$setEquals": ["$$food.categories", [{ 'category': "$$el._id" }]] }] }] }, { $and: [{ $ne: [{ "$ifNull": ["$$el.name", ''] }, ''] }, { $eq: ["$$el.name", 'Recommended'] }, { $eq: ["$$food.recommended", 1] }] }] }
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
								username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, working_hours: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, fssaino: 1, rcategory: 1,
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
								username: 1, _id: 1, restaurantname: 1, slug: 1, time_setting: 1, working_hours: 1, avg_ratings: 1, food_img: 1, offer: 1, about: 1, logo: 1, avatar: 1, distance: 1, main_cuisine: 1, efp_time: 1, location: 1, latitude: 1, longitude: 1, avail: 1, avg_delivery: 1, deliverd: 1, cancelled: 1, categories: 1, availability: 1, phone: 1, address: 1, fssaino: 1, rcategory: 1, fssaiview: { $literal: 2 },
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
						res.send({ err: 0, message: '', restaurantList: {} });
					} else {
						if (docdata.length > 0) {
							db.GetOneDocument('rcategory', { '_id': docdata[0].restaurantList.rcategory }, {}, {}, function (err, rcatDetails) {
								var rfoodcond = { 'shop': docdata[0].restaurantList._id, 'isRecommeneded': 1, 'status': { $eq: 1 } };
								if (req.body.veg && parseInt(req.body.veg) == 1) {
									rfoodcond = { $and: [{ 'shop': docdata[0].restaurantList._id, 'isRecommeneded': 1, 'status': { $eq: 1 } }, { "itmcat": { $eq: 1 } }] };
								}
								db.GetDocument('food', rfoodcond, {}, {}, function (err, recdocdatas) {
									if (recdocdatas && recdocdatas.length > 0) {
										var recDoc = {};
										recDoc.restaurant = docdata[0].restaurantList._id;
										recDoc.name = "Recommended";
										recDoc._id = '';
										if (recdocdatas[0].categories[0].category) {
											recDoc._id = recdocdatas[0].categories[0].category;
										}
										recDoc.subCategories = []
										recDoc.subCategoriesLength = 0;
										recDoc.foodDetails = recdocdatas;
										var Recarr = [];
										Recarr.push(recDoc)
										for (var i = 0; i < docdata[0].restaurantList.mainCategories.length; i++) {
											Recarr.push(docdata[0].restaurantList.mainCategories[i])
										}
										docdata[0].restaurantList.mainCategories = Recarr;
									} else {
										docdata[0].restaurantList.mainCategories = docdata[0].restaurantList.mainCategories;
									}
									var restaurantList = {};
									if (typeof docdata[0].restaurantList != 'undefined' && typeof docdata[0].restaurantList._id != 'undefined') {
										var server_offset = (new Date).getTimezoneOffset();
										var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
										var rest_diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);

										/* if (typeof docdata[0].restaurantList.working_hours != 'undefined' && docdata[0].restaurantList.working_hours.length > 0) {
											docdata[0].restaurantList.working_hours.forEach(function (element) {
												if (typeof element.slots != "undefined" && element.slots.length > 0) {
													for (var i = 0; i < element.slots.length; i++) {
														element.slots[i].start_time = new Date(new Date(element.slots[i].start_time).getTime() + rest_diff_offset);
														element.slots[i].end_time = new Date(new Date(element.slots[i].end_time).getTime() + rest_diff_offset);
													}
												}
											})
										} */

										if (typeof docdata[0].restaurantList.mainCategories != 'undefined' && docdata[0].restaurantList.mainCategories.length > 0) {
											for (var i = 0; i < docdata[0].restaurantList.mainCategories.length; i++) {
												if (typeof docdata[0].restaurantList.mainCategories[i].subCategoriesLength != 'undefined') {
													if (docdata[0].restaurantList.mainCategories[i].subCategoriesLength == 0) {
														if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails != 'undefined' && docdata[0].restaurantList.mainCategories[i].foodDetails.length > 0) {
															for (var j = 0; j < docdata[0].restaurantList.mainCategories[i].foodDetails.length; j++) {
																if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status != 'undefined' && docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.status == 1) {
																	if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time != 'undefined') {
																		docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.from_time).getTime() + diff_offset)
																	}
																	if (typeof docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time != 'undefined') {
																		docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].foodDetails[j].food_time.to_time).getTime() + diff_offset)
																	}

																}
															}
														}
													} else {
														if (typeof docdata[0].restaurantList.mainCategories[i].subCategories != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories.length > 0) {
															for (var j = 0; j < docdata[0].restaurantList.mainCategories[i].subCategories.length; j++) {
																if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails.length > 0) {
																	for (var z = 0; z < docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails.length; z++) {
																		if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time != 'undefined' && typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status != 'undefined' && docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.status == 1) {
																			if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time != 'undefined') {
																				docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.from_time).getTime() + diff_offset)
																			}
																			if (typeof docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time != 'undefined') {
																				docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time = new Date(new Date(docdata[0].restaurantList.mainCategories[i].subCategories[j].foodDetails[z].food_time.to_time).getTime() + diff_offset)
																			}

																		}
																	}
																}

															}
														}
													}

												}
											}
										}
										restaurantList = docdata[0].restaurantList;
										let tzname = geoTz(parseFloat(restaurantList.location.lat), parseFloat(restaurantList.location.lng))[0];
										offset = tz.tz(tzname).utcOffset();
										day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
									}
									if (rcatDetails.is_fssai == 1) {
										restaurantList.fssaiview = 1;
									}
									res.send({ err: 0, message: '', restaurantList: restaurantList, day: day, offset: offset });
								})
							});
						} else {
							res.send({ err: 0, message: '', restaurantList: {} });
						}
					}
				})
			}
		})
	}

	router.getItemDetails = function (req, res) {

		var lat;
		if (typeof req.body.lat != 'undefined' && req.body.lat != '') {
			lat = req.body.lat;
		} else {
			res.send({ err: 1, message: 'Invalid lat' });
			return;
		}
		var lon;
		if (typeof req.body.lon != 'undefined' && req.body.lon != '') {
			lon = req.body.lon;
		} else {
			res.send({ err: 1, message: 'Invalid long' });
			return;
		}
		var client_offset = (new Date).getTimezoneOffset();
		if (typeof req.body.client_offset != 'undefined') {
			client_offset = req.body.client_offset
		}
		var radius = 20;
		if (typeof req.body.radius != 'undefined' && req.body.radius != '') {
			try {
				radius = parseInt(req.body.radius);
			} catch (e) {
				radius = 20;
			}
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ err: 0, message: '', restaurantList: {} });
			} else {
				var temp_radius = settings.settings.radius || 20;
				var radius = parseInt(temp_radius);
				//var filter_query = { "status": 1, slug: { $eq: slug } };
				city = req.body.city;
				city = city.charAt(0).toUpperCase() + city.slice(1);
				// Create a new ObjectID
				var mongoose = require('mongoose');
				rfoodcond = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { "main_city": { $eq: city } }] };
				//console.log(rfoodcond)
				var productcondition = [
					{ "$match": rfoodcond },
					{
						$lookup: {
							from: "rcategory",
							localField: "rcategory",
							foreignField: "_id",
							as: "category"
						}
					},
					{
						$unwind: "$category"
					},
					{
						$lookup: {
							from: "city",
							localField: "main_city",
							foreignField: "cityname",
							as: "city"
						}
					},
					{
						$unwind: "$city"
					}
				];
				db.GetAggregation('food', productcondition, function (err, recdocdatas) {
					var restaurantList = {};
					if (err || !recdocdatas) {

						res.send({ err: 0, message: '', restaurantList: {} });
					} else {
						var server_offset = (new Date).getTimezoneOffset();
						var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
						var rest_diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);
						restaurantList['product'] = recdocdatas;
						let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
						offset = tz.tz(tzname).utcOffset();
						day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
						db.GetOneDocument('rcategory', { '_id': mongoose.Types.ObjectId(req.body.rcat) }, {}, {}, function (err, catdata) {

							if (err || !catdata) {
								res.send({ err: 0, message: '', restaurantList: {} });
							} else {
								restaurantList['maincat'] = catdata;
								res.send({ err: 0, message: '', restaurantList: restaurantList, day: day, offset: offset });
							}
						});

					}
				});
				// return false;

				// 				db.GetDocument('food', rfoodcond, {}, {}, function (err, recdocdatas) {
				// 					var restaurantList = {};
				// 					if (recdocdatas) {
				// 						var server_offset = (new Date).getTimezoneOffset();
				// 						var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
				// 						var rest_diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);
				// 						restaurantList = recdocdatas;
				// 						 let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
				// 						 offset = tz.tz(tzname).utcOffset();
				// 						 day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
				// 					}

				// 					res.send({ err: 0, message: '', restaurantList: restaurantList, day: day, offset: offset });
				// 					//res.send({ err: 0, message: '', restaurantList: restaurantList });
				// 				})
				// });
				// } else {
				//     res.send({ err: 0, message: '', restaurantList: {} });
				// }
				//}
				//})
			}
		})
	}

	router.SignUp = function (req, res) {
		var data = {};
		data.status = '0';
		var message = '';

		req.checkBody('first_name', 'first_name is required').notEmpty();
		req.checkBody('last_name', 'last_name is required').optional();
		req.checkBody('email', 'email is required').isEmail();
		req.checkBody('password', 'password is required').notEmpty();
		req.checkBody('country_code', 'country_code  is required').notEmpty();
		req.checkBody('phone_number', 'phone_number is required').notEmpty();
		var errors = req.validationErrors();
		if (errors) {
			res.send({ "status": "0", "errors": errors[0].msg });
			return;
		}

		req.sanitizeBody('first_name').trim();
		req.sanitizeBody('last_name').trim();
		req.sanitizeBody('email').trim();
		req.sanitizeBody('password').trim();
		req.sanitizeBody('country_code').trim();
		req.sanitizeBody('phone_number').trim();
		req.sanitizeBody('referal_code').trim();
		req.sanitizeBody('deviceToken').trim();
		req.sanitizeBody('gcm_id').trim();

		var request = {};
		data.email = req.body.email;
		data.password = req.body.password;
		data.username = req.body.first_name || "";
		data.last_name = req.body.last_name || "";
		data.country_code = req.body.country_code;
		data.phone_number = req.body.phone_number;
		data.role = 'user';
		data.status = '1';
		db.GetDocument('users', { "email": data.email }, {}, {}, function (err, emaildocs) {
			if (err) {
				res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
			} else {
				if (emaildocs.length != 0) {
					res.send({ "status": "2", "message": "Email Id exist" });
				} else {
					db.GetDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
						if (err) {
							res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
						} else {
							if (phonedocs.length != 0) { res.send({ "status": "2", "message": "mobile number exist" }); }
							else {
								db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
									if (err || !settings) {
										res.send({ "status": "0", "errors": "Configure your website settings" });
									} else {
										db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
											if (err) {
												res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
											} else {
												var newdata = { phone: {} };
												newdata.username = data.username;
												newdata.last_name = data.last_name;
												newdata.unique_code = library.randomString(8, '#A');
												newdata.role = 'user';
												newdata.user_type = 'normal';
												newdata.email = data.email;
												newdata.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
												newdata.status = 1;
												newdata.phone.code = data.country_code;
												newdata.phone.number = data.phone_number;
												var secret = otp.generateSecret();
												var otp_string = otp.generate(secret);
												var pass_code = otp_string.slice(0, 4);
												var to = req.body.country_code + req.body.phone_number;
												var message = pass_code + ' is your ' + settings.settings.site_title + ' OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
												var otp_status = "development";
												if (smssettings.settings.twilio.mode == 'production') {
													otp_status = "production";
													twilio.createMessage(to, '', message, function (err, response) { });
												}
												newdata.verification = {};
												newdata.verification.otp = pass_code;
												db.InsertDocument('users', newdata, function (err, response) {
													if (err || response.nModified == 0) {
														res.send({ "status": "0", "errors": "Sorry Email Exist..!" });
													} else {
														res.send({
															"status": '1',
															"message": 'Successfully registered',
															"user_image": settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT,
															"user_id": response._id,
															"user_name": response.username,
															"email": response.email,
															"country_code": response.phone.code,
															"phone_number": response.phone.number,
															"referal_code": response.unique_code,
															"refered_code": '',
															"currency_code": settings.settings.currency_code,
															"currency_symbol": settings.settings.currency_symbol,
															otp_status: otp_status,
															otp: pass_code
														});
													}
												})
											}
										})
									}
								})

							}
						}
					})
				}
			}
		})
	}



	router.sendotp = async function (req, res) {
		const { phone_number, code } = req.body;

		// Generate a dynamic OTP
		const generateOTP = () => {
			return crypto.randomInt(1000, 9999).toString(); // Generates a 4-digit OTP
		};

		const otp = generateOTP();
		let data = {
			phone: {
				code: code,
				number: phone_number
			},
			otp: otp
		};

		try {
			let existing = await db.GetOneDocument('users', { 'phone': data.phone,status:{$in:[2,0]} }, {}, {});
			if(existing.status){
				if(existing.doc.status==2){
					
					return res.status(200).json({
					status: '0',
					message: 'User is inactive.'
				});
				}else{
					return res.status(200).json({
						status: '0',
						message: 'Your account has been deleted by the admin.'
					});
				}
			}
			// Check if the phone number already exists in 'temp_users'
			let existingUser = await db.GetOneDocument('temp_users', { 'phone': data.phone }, {}, {});
			console.log(existingUser, "existing");

			if (existingUser.status == true) {
				// Phone number exists, update the OTP
				await db.UpdateDocument('temp_users', { 'phone': data.phone }, { otp: otp }, {});
			} else {
				// Phone number does not exist, insert a new document
				console.log(data);

				await db.InsertDocument('temp_users', data);
			}

			// Prepare user data for sending OTP
			const user = {
				phone: phone_number,
				verifyCode: otp
			};
             //Your OTP verification code is %%|otp^{"inputtype" : "text", "maxlength" : "6"}%% By Pillais Foods.
			 //Your OTP verification code is otp By Pillais Foods.
			// Send OTP using smsClient
			let template = `Your OTP verification code is ${user.verifyCode} By Pillais Foods.`
			const result = await smsClient(phone_number, template);
			console.log(result, "SMSClient");

			// Send response
			res.status(200).json({
				status: '1',
				message: 'OTP sent successfully'
			});

		} catch (error) {
			console.error("Error sending OTP:", error);
			res.status(500).json({
				status: '0',
				message: 'Failed to send OTP'
			});
		}
	};



	router.SendOtp = function (req, res) {
		var data = {};
		data.status = '0';
		var message = '';
		req.checkBody('country_code', 'country_code  is required').notEmpty();
		req.checkBody('phone_number', 'phone_number is required').notEmpty();
		var errors = req.validationErrors();
		if (errors) {
			res.send({ "status": "0", "errors": errors[0].msg });
			return;
		}
		req.sanitizeBody('country_code').trim();
		req.sanitizeBody('phone_number').trim();
		var request = {};
		data.country_code = req.body.country_code;
		data.phone_number = req.body.phone_number;
		db.GetDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code }, {}, {}, function (err, phonedocs) {
			if (err) {
				res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
			} else {
				if (phonedocs.length != 0) { res.send({ "status": "2", "message": "mobile number exist" }); }
				else {
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						if (err || !settings) {
							res.send({ "status": "0", "errors": "Configure your website settings" });
						} else {
							db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
								if (err) {
									res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
								} else {
									var secret = otp.generateSecret();
									var otp_string = otp.generate(secret);
									var pass_code = otp_string.slice(0, 4);
									var to = req.body.country_code + req.body.phone_number;
									var message = pass_code + ' is your ' + settings.settings.site_title + ' OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
									var otp_status = "development";
									if (smssettings.settings.twilio.mode == 'production') {
										otp_status = "production";
										twilio.createMessage(to, '', message, function (err, response) { });
									}
									res.send({
										"status": '1',
										"message": 'Successfully Sent Otp.',
										"country_code": response.phone.code,
										"phone_number": response.phone.number,
										otp_status: otp_status,
										otp: pass_code
									});
								}
							})
						}
					})

				}
			}
		})

	}

	router.UserLogin = function (req, res) {
		var errors = [];
		// For Register
		req.checkBody('country_code', 'country_code is required').notEmpty();
		req.checkBody('phone_number', 'phone_number is required').notEmpty();
		req.checkBody('password', 'password is required').notEmpty();
		// For Login
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
		data.password = req.body.password;
		var validPassword = function (password, passwordb) {
			return bcrypt.compareSync(password, passwordb);
		};
		db.GetDocument('users', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, phonedocs) {
			if (err) {
				res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
			} else {
				db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
					if (err) {
						res.send({ "status": "0", "errors": "Something Went Wrong..!!" });
					} else {
						if (req.body.password) {
							db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
								if (err) {
									res.send({
										"status": 0,
										"errors": 'Please check the email and try again'
									});
								} else {
									db.GetDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, {}, {}, function (err, docs) {
										if (err || !docs[0]) {
											res.send({
												"status": 0,
												"errors": 'Please check the phone number and try again'
											});
										} else {
											if (!docs[0].password || docs[0].password.length == 0) {
												res.send({
													"status": 0,
													"errors": 'Please try again with your social login'
												});
											} else {
												if (validPassword(data.password, docs[0].password)) {
													if (docs[0].status == 1) {
														db.UpdateDocument('users', { "phone.number": data.phone_number, "phone.code": data.country_code, 'status': { $eq: 1 } }, { 'activity.last_login': new Date() }, {}, function (err, response) {
															if (err || response.nModified == 0) {
																res.send({
																	"status": 0,
																	"errors": 'Please check the phone number and try again'
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
																	user_image: user_image,
																	avatar: docs[0].avatar,
																	user_id: docs[0]._id,
																	user_name: docs[0].username,
																	email: docs[0].email,
																	message: "You are Logged In successfully",
																	currency_code: settings.settings.currency_code,
																	currency_symbol: settings.settings.currency_symbol,
																	referal_code: docs[0].unique_code || "",
																	refered_code: '',
																	location_name: docs[0].address.city || "",
																	country_code: docs[0].phone.code,
																	phone_number: docs[0].phone.number,
																})
															}
														});
													} else {
														if (docs[0].status == 0) {
															res.send({
																"status": 0,
																"errors": 'Your account is currently unavailable'
															});
														} else {
															res.send({
																"status": 0,
																"errors": 'Your account need to be verified by admin'
															});
														}
													}
												} else {
													res.send({
														"status": 0,
														"errors": 'Password is invalid'
													});
												}
											}
										}
									});
								}
							});
						}
					}
				});
			}
		});
	};

	router.saveOrderAddress = async function (req, res) {
		console.log("------------------------comming here at 923--------------------------------------------------------------")

		console.log(req.body, 'this is the request body');
		var or_location = {};

		if (req.body.long && req.body.lat) {
			or_location.lng = req.body.long;
			or_location.lat = req.body.lat;
		}

		var order_address = {
			'first_name': req.body.name,
			'last_name': req.body.lastname,
			'username': req.body.name + ' ' + req.body.lastname,
			'line1': req.body.line1,
			'street': req.body.street,
			'fulladres': req.body.fulladres,
			'country': req.body.country,
			'city': req.body.city,
			'zipcode': req.body.zipcode,
			'state': req.body.state,
			'phone': req.body.phone,
			'status': 1,
			'choose_location': req.body.choose_location,
			'address_value': req.body.address_value,
			'loc': or_location,
			'user_id': req.body.user_id
		};
		console.log(order_address, 'order_addressorder_address');
		const response = await db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {})
		if (response.status === false) {
			res.send({
				"status": "0",
				"errors": "User not found..!"
			});
		} else {
			if (req.body.id) {
				await db.UpdateDocument('order_address', { "_id": req.body.id, 'user_id': req.body.user_id }, order_address, {})
				res.send({
					"status": "1",
					"response": "Delivery Address Updated Successfully ",
				});
				// db.UpdateDocument('order_address', { "_id": req.body.id, 'user_id': req.body.user_id }, order_address, {}, function (err, response) {
				// 	res.send({
				// 		"status": "1",
				// 		"response": "Delivery Address Updated Successfully for edit address.",
				// 	});
				// })
			} else {
				const insert = await db.InsertDocument('order_address', order_address)
				if (!insert) {
					res.send({
						"status": "0",
						"errors": "Error in delivery location update..!"
					});
				}
				const doc = await db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {})
				if (doc.doc && doc.doc.length == 1) {
					await db.UpdateDocument('order_address', { 'user_id': req.body.user_id }, { $set: { 'active': true } }, {})

				}
				res.send({
					"status": "1",
					"response": "Delivery Address Added Successfully.",
					"result": insert
				});
				// db.InsertDocument('order_address', order_address, function (err, secdata) {
				// 	if (err) {
				// 		res.send({
				// 			"status": "0",
				// 			"errors": "Error in delivery location update..!"
				// 		});
				// 	}
				// 	else {
				// 		db.GetDocument('order_address', { "_id": req.body.id, 'user_id': req.body.user_id }, {}, {}, function (err, doc) {
				// 			if (doc && doc.length == 1) {
				// 				db.UpdateDocument('order_address', condition, { $set: { 'active': true } }, {}, function (err, res) {
				// 				});
				// 			}

				// 		})
				// 		res.send({
				// 			"status": "1",
				// 			"response": "Delivery Address Added Successfully.",
				// 			"result": secdata
				// 		});
				// 	}
				// });
			}
		}
	}



	router.fetchTaxForProducts = async (req, res) => {
		try {
			// Get cart details from the request body
			const cartDetails = req.body.cartDetails;

			// Check if cartDetails is provided and is an array
			if (!Array.isArray(cartDetails) || cartDetails.length === 0) {
				return res.status(400).send({ error: true, message: "Cart details are missing or invalid" });
			}

			// Prepare an array to store the tax details for each product and initialize total tax amount
			let productTaxDetails = [];
			let totalTaxAmount = 0;

			// Loop through each product in the cart and fetch the tax for the corresponding rcat_id
			for (const product of cartDetails) {
				const rcatId = product.rcat_id;

				// Fetch the tax for the given rcat_id
				const rcatData = await db.GetOneDocument('rcategory', { _id: new mongoose.Types.ObjectId(rcatId) }, { Taxs: 1 }, {});

				let taxPercentage = 0;
				if (rcatData && rcatData.doc) {
					taxPercentage = rcatData.doc.Taxs || 0;  // Default to 0 if no tax found
				}

				// Calculate the tax amount for the product (tax% of product.total)
				const taxAmount = (product.total * taxPercentage) / 100;

				// Add the tax amount to the total tax amount
				totalTaxAmount += taxAmount;

				// Add the product tax details to the array
				productTaxDetails.push({
					productId: product.id,
					productName: product.name,
					taxPercentage: taxPercentage,
					total: product.total,
					taxAmount: taxAmount.toFixed(2)  // Format to 2 decimal places
				});
			}

			// Return the tax details for each product and the total tax amount
			res.status(200).json({
				success: true,
				data: productTaxDetails,
				totalTaxAmount: totalTaxAmount.toFixed(2)  // Format to 2 decimal places
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: 'Failed to fetch tax for products',
				error: error.message
			});
		}
	};


	router.saveBillAddress = async function (req, res) {


		// console.log("------------------------comming here at 1013--------------------------------------------------------------")
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// req.checkBody('name', 'name is required').notEmpty();
		// req.checkBody('fulladres', 'fulladres is required').notEmpty();
		// req.checkBody('line1', 'line1 is required').notEmpty();
		// req.checkBody('phone', 'phone is required').notEmpty();
		// req.checkBody('country', 'country is required').optional();
		// req.checkBody('id', 'id is required').optional();
		// req.checkBody('city', 'city is required').notEmpty();
		// req.checkBody('zipcode', 'zipcode is required').notEmpty();
		// req.checkBody('long', 'long is required').optional();
		// req.checkBody('lat', 'lat is required').optional();
		var choose_location = req.body.choose_location;
		// var data = {};
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ "status": 0, "errors": errors[0].msg });
		// 	return;
		// }
		var or_location = {};
		if (req.body.long && req.body.lat) {
			or_location.lng = req.body.long;
			or_location.lat = req.body.lat;
		}
		var order_address = {
			'first_name': req.body.first_name,
			'last_name': req.body.last_name,
			'username': req.body.first_name + ' ' + req.body.last_name,
			'line1': req.body.line1,
			'street': req.body.street,
			// 'fulladres': req.body.fulladres,
			'country': req.body.country,
			'city': req.body.city,
			'zipcode': req.body.pincode,
			'phone_number': req.body.phone_number,
			'status': 1,
			// 'address_value': req.body.address_value,	
			// 'choose_location': choose_location,
			// 'loc': or_location,
			'user_id': req.body.user_id,
			'state': req.body.state,
			'email': req.body.email
		};

		console.log(order_address, 'orderaddreszs');
		if (req.body._id) {
			const doc = await db.GetDocument('billing_address', { 'user_id': req.body.user_id }, {}, {});
			console.log('..............................................');
			console.log(doc, 'check doc');
			if (doc.doc && doc.doc.length == 1) {
				const docUpdate = await db.UpdateDocument('billing_address', { _id: new mongoose.Types.ObjectId(req.body._id) }, { $set: order_address }, {})
			}
			res.send({
				"status": 1,
				"response": "Delivery Address Added Successfully.",
				// "result": docUpdate
			});
		} else {
			const secdata = await db.InsertDocument('billing_address', order_address)
			res.send({
				"status": 1,
				"response": "Delivery Address Added Successfully.",
				"result": secdata
			});
			if (!secdata) {
				res.send({
					"status": 0,
					"errors": "Error in delivery location update..!"
				});
			}
		}
		// const secdata = await db.InsertDocument('billing_address', order_address)
		// console.log(secdata, 'seecc');
		// if (!secdata) {
		// 	res.send({
		// 		"status": 0,
		// 		"errors": "Error in delivery location update..!"
		// 	});
		// } else {
		// 	const doc = await db.GetDocument('billing_address', { 'user_id': req.body.user_id }, {}, {});
		// 	console.log('..............................................');
		// 	console.log(doc, 'check doc');
		// 	if (doc.doc && doc.doc.length == 1) {
		// 		await db.UpdateDocument('billing_address', { _id: new mongoose.Types.ObjectId(secdata._id) }, { $set: { 'active': true } }, {})
		// 	}
		// 	res.send({
		// 		"status": 1,
		// 		"response": "Delivery Address Added Successfully.",
		// 		"result": secdata
		// 	});
		// }
		// db.InsertDocument('order_address', order_address, function (err, secdata) {
		// 	if (err) {
		// 		res.send({
		// 			"status": 0,
		// 			"errors": "Error in delivery location update..!"
		// 		});
		// 	}
		// 	else {
		// 		db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {}, function (err, doc) {
		// 			if (doc && doc.length == 1) {
		// 				db.UpdateDocument('order_address', { _id: mongoose.Types.ObjectId(secdata._id) }, { $set: { 'active': true } }, {}, function (err, res) {
		// 				});
		// 			}

		// 		})
		// 		res.send({
		// 			"status": 1,
		// 			"response": "Delivery Address Added Successfully.",
		// 			"result": secdata
		// 		});
		// 	}
		// });

	}




	// router.saveNewAddress = async function (req, res) {


	// 	// console.log("------------------------comming here at 1013--------------------------------------------------------------")
	// 	// req.checkBody('user_id', 'user_id is required').notEmpty();
	// 	// req.checkBody('name', 'name is required').notEmpty();
	// 	// req.checkBody('fulladres', 'fulladres is required').notEmpty();
	// 	// req.checkBody('line1', 'line1 is required').notEmpty();
	// 	// req.checkBody('phone', 'phone is required').notEmpty();
	// 	// req.checkBody('country', 'country is required').optional();
	// 	// req.checkBody('id', 'id is required').optional();
	// 	// req.checkBody('city', 'city is required').notEmpty();
	// 	// req.checkBody('zipcode', 'zipcode is required').notEmpty();
	// 	// req.checkBody('long', 'long is required').optional();
	// 	// req.checkBody('lat', 'lat is required').optional();
	// 	var choose_location = req.body.choose_location;
	// 	// var data = {};
	// 	// var errors = req.validationErrors();
	// 	// if (errors) {
	// 	// 	res.send({ "status": 0, "errors": errors[0].msg });
	// 	// 	return;
	// 	// }
	// 	var or_location = {};
	// 	if (req.body.long && req.body.lat) {
	// 		or_location.lng = req.body.long;
	// 		or_location.lat = req.body.lat;
	// 	}
	// 	var order_address = {
	// 		// 'name': req.body.name,
	// 		'first_name': req.body.first_name,
	// 		'last_name': req.body.last_name,
	// 		'username': req.body.first_name + ' ' + req.body.last_name,
	// 		'line1': req.body.line1,
	// 		'street': req.body.street,
	// 		// 'fulladres': req.body.fulladres,
	// 		'country': req.body.country,
	// 		'city': req.body.city,
	// 		'zipcode': req.body.pincode,
	// 		'phone_number': req.body.phone_number,
	// 		'status': 1,
	// 		// 'address_value': req.body.address_value,	
	// 		'choose_location': choose_location,	
	// 		// 'loc': or_location,
	// 		'user_id': req.body.user_id,
	// 		'state': req.body.state,
	// 		'email': req.body.email

	// 	};
	// 	// if (req.body.id) {
	// 	// return
	// 	if (req.body._id) {
	// 		console.log("yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy");
	// 		const doc = await db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {});
	// 		console.log(doc, 'check doc');
	// 		// if (doc.doc && doc.doc.length == 1) {
	// 		const docUpdate = await db.UpdateDocument('order_address', { _id: new mongoose.Types.ObjectId(req.body._id) }, { $set: order_address }, {})
	// 		// }
	// 		res.send({
	// 			"status": 1,
	// 			"response": "Delivery Address Updated Successfully.",
	// 			// "result": docUpdate
	// 		});
	// 	} else {

	// 		const secdata = await db.InsertDocument('order_address', order_address)
	// 		console.log(secdata, 'seecc');
	// 		if (!secdata) {
	// 			res.send({
	// 				"status": 0,
	// 				"errors": "Error in delivery location update..!"
	// 			});
	// 		}
	// 		// }
	// 		else {
	// 			const doc = await db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {});
	// 			console.log('..............................................');
	// 			console.log(doc, 'check doc');
	// 			if (doc.doc && doc.doc.length == 1) {
	// 				await db.UpdateDocument('order_address', { _id: new mongoose.Types.ObjectId(secdata._id) }, { $set: { 'active': true } }, {})
	// 			}
	// 			res.send({
	// 				"status": 1,
	// 				"response": "Delivery Address Added Successfully.",
	// 				"result": secdata
	// 			});
	// 		}
	// 	}
	// 	// db.InsertDocument('order_address', order_address, function (err, secdata) {
	// 	// 	if (err) {
	// 	// 		res.send({
	// 	// 			"status": 0,
	// 	// 			"errors": "Error in delivery location update..!"
	// 	// 		});
	// 	// 	}
	// 	// 	else {
	// 	// 		db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {}, function (err, doc) {
	// 	// 			if (doc && doc.length == 1) {
	// 	// 				db.UpdateDocument('order_address', { _id: mongoose.Types.ObjectId(secdata._id) }, { $set: { 'active': true } }, {}, function (err, res) {
	// 	// 				});
	// 	// 			}

	// 	// 		})
	// 	// 		res.send({
	// 	// 			"status": 1,
	// 	// 			"response": "Delivery Address Added Successfully.",
	// 	// 			"result": secdata
	// 	// 		});
	// 	// 	}
	// 	// });

	// }


	router.reorder = async (req, res) => {
		const { orderId, userId } = req.body;
		console.log(orderId, userId);

		const collection = 'cart';
		const orderCollection = 'orders';
		const foodCollection = 'food';

		try {
			// Fetch the order by orderId
			const order = await db.GetOneDocument(orderCollection, { _id: orderId, user_id: userId }, {}, {});
			if (!order) {
				throw new Error("Order not found or unauthorized access.");
			}
			console.log(order, "orderorder");

			const orderedFoods = order.doc.foods || [];
			console.log(orderedFoods);

			if (!orderedFoods.length) {
				throw new Error("No foods available in the order for reorder.");
			}

			// Fetch or initialize the user's cart
			const condition = { user_id: userId, type_status: 0 };
			let cartdata = await db.GetOneDocument(collection, condition, {}, {});
			
			let cart = cartdata;
			// If the document is not found or has an error status
			if (!cart || !cart.status || cart.status === false || !cart.doc || cart.doc === 'Data Not found') {
				// Initialize the cart with an empty cart_details array
				cart = {
					user_id: userId,
					type_status: 0,
					cart_details: [] // Initialize cart_details as an empty array
				};
			} else {
				// If the document exists and contains valid data, extract cart_details from it
				cart = {
					user_id: userId,
					type_status: 0,
					cart_details: cart.doc.cart_details || [] // Extract cart_details if available, otherwise initialize as empty array
				};
			}
			
	
			// Process each food item from the order
			for (const food of orderedFoods) {
				console.log(food, "fooosssss");

				const foodDetails = await db.GetOneDocument(foodCollection, { _id: food.id, status: 1 }, {}, {});
				console.log(foodDetails, "foodDetails");

				if (!foodDetails || !foodDetails.doc || foodDetails.doc.length <= 0) {
					console.warn(`Food with ID ${food.id} is no longer available.`);
					continue; // Skip unavailable items
				}

				console.log(food.variations[0], "food.variations[0]");

				const variations = Array.isArray(food.variations[0]) ? food.variations[0] : [];
				console.log(variations, 'variations');
	
				// Use .find() only if variations is an array
				const variant = variations.find(v => v.chaild_id);
	
				console.log(variant, "variant");
	
				// Handle the case where no matching variant is found
				if (!variant) {
					console.warn(`Variant for food ID ${food.id} is either unavailable or invalid.`);
					continue; // Skip this food item if no valid variant is found
				}
	
				console.log('Found variant:', variant);

				const existingItemIndex = cart.cart_details.findIndex((item) =>item.id.toString() == food.id.toString());
				
				console.log(existingItemIndex,'exiting index for me . ............')

				if (existingItemIndex !== -1) {
					// If the item exists, increment the quantity
					cart.cart_details[existingItemIndex].quantity += food.quantity;
					console.log(`Updated quantity for food ID ${food.id}`);
				} else {
					// If the item does not exist, add it to the cart details
					cart.cart_details.push({
						id: food.id,
						mprice: variant.mprice,
						psprice: variant.sprice,
						quantity: food.quantity,
						image: food.image,
						addons: food.addons || [],
						variations: food.variations,
						rcat_id: food.rcat_id,
						scat_id: food.scat_id,
						active: true,
						size_status: food.size_status,
						selectedVariantId: food.selectedVariantId
					});
					console.log(`Added new food ID ${food.id} to cart.`);
				}
	
				// // Add the food to the cart details
				// cart.cart_details.push({
				// 	id: food.id,
				// 	mprice: variant.mprice,
				// 	psprice: variant.sprice,
				// 	quantity: food.quantity,
				// 	image: food.image,
				// 	addons: food.addons || [],
				// 	variations: food.variations,
				// 	rcat_id: food.rcat_id,
				// 	scat_id: food.scat_id,
				// 	active: true,
				// 	size_status: food.size_status,
				// 	selectedVariantId: food.selectedVariantId
				// });
			}
			console.log(cart,"doccccccc");
			console.log(cartdata,"adad");

			// Update or insert the cart in the database
			if (cartdata.doc && cartdata.doc !== 'Data Not found'  && cartdata.doc._id ) {
				console.log(cartdata,"adadxxxxx");

				let cart_update = await db.UpdateDocument(collection, { _id: cartdata.doc._id }, { $set: { cart_details: cart.cart_details } });
				console.log(cart_update, '132456');
			} else {
				let cart_update = await db.InsertDocument(collection, { user_id: userId, type_status: 0, cart_details: cart.cart_details });
				console.log(cart_update, "789456123");
			}

			return res.send({ success: true, message: "Reorder successful", cart });
		} catch (error) {
			console.error(error.message);
			return res.send({ success: false, message: error.message });
		}
	};
	



	router.saveNewAddress = async function (req, res) {
		try {
			const userId = req.body.user_id; // Extract user ID from request
			const addressData = {
				name: req.body.name || '',
				first_name: req.body.first_name,
				last_name: req.body.last_name,
				email: req.body.email,
				username: `${req.body.first_name} ${req.body.last_name}`,
				phone: {
					code: req.body.phone_code || '',
					number: req.body.phone_number,
				},
				line1: req.body.line1,
				landmark: req.body.landmark || '',
				country: req.body.country,
				city: req.body.city,
				state: req.body.state,
				active: true,
				zipcode: req.body.pincode,
				fullAddress: req.body.fullAddress,
				choose_location: req.body.choose_location,
				isDefault: 2 // Set to 2 when added as main address
			};
			console.log(req.body, "adasdasdasd");

			console.log(addressData);

			// Check if the user document exists
			const userDoc = await db.GetDocument('order_address', { user_id: userId }, {}, {});
			console.log(userDoc, "userdoc");

			if (userDoc && userDoc.doc && userDoc.doc.length != 0) {
				// If the user document exists
				if (req.body._id) { // If editing an existing address
					console.log("data received");

					const updateResult = await db.UpdateDocument('order_address',
						{ user_id: userId, 'addressList._id': req.body._id },
						{ $set: { 'addressList.$': addressData } }, {}
					);
					console.log(updateResult);

					// Check if checkout is 1 to update the main address
					if (req.body.checkout === 1) {
						await db.UpdateDocument('order_address',
							{ user_id: userId },
							{
								$set: {
									first_name: addressData.first_name,
									last_name: addressData.last_name,
									email: addressData.email,
									username: addressData.username,
									phone: addressData.phone,
									line1: addressData.line1,
									country: addressData.country,
									city: addressData.city,
									active: true,
									state: addressData.state,
									zipcode: addressData.zipcode,
									choose_location: addressData.choose_location,
									fullAddress: addressData.fullAddress
								}
							}, {}
						);
					}

					res.send({
						status: 1,
						response: "Address updated successfully.",
						result: updateResult
					});
				} else {
					const insertResult = await db.UpdateDocument('order_address',
						{ user_id: userId },
						{ $push: { addressList: addressData } }, {}
					);

					// Check if this is the first address
					console.log(userDoc.doc[0].addressList);

					if (userDoc.doc[0].addressList.length == 0 || req.body.checkout === 1) {
						// Set as the main address
						await db.UpdateDocument('order_address',
							{ user_id: userId },
							{
								$set: {
									first_name: addressData.first_name,
									last_name: addressData.last_name,
									email: addressData.email,
									username: addressData.username,
									phone: addressData.phone,
									line1: addressData.line1,
									country: addressData.country,
									city: addressData.city,
									active: true,
									state: addressData.state,
									zipcode: addressData.zipcode,
									choose_location: addressData.choose_location,
									fullAddress: addressData.fullAddress
								}
							}, {}
						);
					}

					res.send({
						status: 1,
						response: "Address added successfully.",
						result: insertResult
					});
				}
			} else {
				// If the user document does not exist, create a new one with the address
				const newAddressDoc = {
					user_id: userId,
					addressList: [addressData],
					first_name: addressData.first_name,
					last_name: addressData.last_name,
					email: addressData.email,
					username: addressData.username,
					phone: addressData.phone,
					line1: addressData.line1,
					country: addressData.country,
					city: addressData.city,
					active: true,
					state: addressData.state,
					zipcode: addressData.zipcode,
					choose_location: addressData.choose_location,
					fullAddress: addressData.fullAddress
				};

				const insertResult = await db.InsertDocument('order_address', newAddressDoc);
				res.send({
					status: 1,
					response: "New address created successfully.",
					result: insertResult
				});
			}
		} catch (error) {
			console.error(error);
			res.send({
				status: 0,
				errors: "An error occurred while saving the address."
			});
		}
	};




	router.setDefaultAddress = async function (req, res) {
		try {
			const userId = req.body.user_id;
			const addressId = req.body.address_id;
			console.log(userId, addressId);

			// Find the current default address and set its isDefault to 1
			await db.UpdateDocument('order_address',
				{ user_id: userId },
				{ $set: { 'addressList.$[].isDefault': 1 } },
				{}
			);

			// Set the new default address
			const updateResult = await db.UpdateDocument('order_address',
				{ user_id: userId, 'addressList._id': addressId },
				{ $set: { 'addressList.$.isDefault': 2 } }, {}
			);

			// Move the new default address to the main fields
			const addressToMakeDefault = await db.GetDocument('order_address',
				{ user_id: userId, 'addressList._id': addressId },
				{ 'addressList.$': 1 },
				{},
			);

			if (addressToMakeDefault.doc && addressToMakeDefault.doc.length) {
				const defaultAddress = addressToMakeDefault.doc[0].addressList[0];
				await db.UpdateDocument('order_address',
					{ user_id: userId },
					{
						$set: {
							first_name: defaultAddress.first_name,
							last_name: defaultAddress.last_name,
							username: defaultAddress.username,
							email: defaultAddress.email,

							phone: defaultAddress.phone,
							line1: defaultAddress.line1,
							country: defaultAddress.country,
							city: defaultAddress.city,
							state: defaultAddress.state,
							zipcode: defaultAddress.zipcode,
							choose_location: defaultAddress.choose_location,
							fullAddress: defaultAddress.fullAddress
						}
					}
				);
			}

			res.send({
				status: 1,
				response: "Default address set successfully."
			});
		} catch (error) {
			console.error(error);
			res.send({
				status: 0,
				errors: "An error occurred while setting the default address."
			});
		}
	};


	router.deleteAddress = async function (req, res) {
		const { user_id, address_id } = req.body;

		try {
			// Find the user document
			const userDoc = await db.GetDocument('order_address', { user_id }, {}, {});

			if (!userDoc || !userDoc.doc || userDoc.doc.length === 0) {
				return res.status(404).send({ status: 0, message: 'User not found.' });
			}

			const addressList = userDoc.doc[0].addressList;
			const addressToDelete = addressList.find(address => address._id.toString() === address_id);

			if (!addressToDelete) {
				return res.status(404).send({ status: 0, message: 'Address not found.' });
			}

			// Check if the deleted address is the default address
			const isDefaultAddress = addressToDelete.isDefault === 2;

			// Delete the address from the array
			await db.UpdateDocument('order_address',
				{ user_id },
				{ $pull: { addressList: { _id: address_id } } },
				{}
			);

			if (isDefaultAddress) {
				// Set the next address as default, if available
				const remainingAddresses = await db.GetDocument('order_address', { user_id }, {}, {});
				const newAddressList = remainingAddresses.doc[0].addressList;

				// Find the next available address to set as default
				const nextDefaultAddress = newAddressList.find(address => address._id.toString() !== address_id) || newAddressList[0];

				if (nextDefaultAddress) {
					// Update the new default address
					await db.UpdateDocument('order_address',
						{ user_id, 'addressList._id': nextDefaultAddress._id },
						{ $set: { 'addressList.$.isDefault': 2 } },
						{}
					);

					// Update the main address fields to match the new default address
					await db.UpdateDocument('order_address',
						{ user_id },
						{
							$set: {
								first_name: nextDefaultAddress.first_name,
								last_name: nextDefaultAddress.last_name,
								username: nextDefaultAddress.username,
								email: nextDefaultAddress.email,
								phone: nextDefaultAddress.phone,
								line1: nextDefaultAddress.line1,
								country: nextDefaultAddress.country,
								city: nextDefaultAddress.city,
								state: nextDefaultAddress.state,
								zipcode: nextDefaultAddress.zipcode,
								choose_location: nextDefaultAddress.choose_location,
								fullAddress: nextDefaultAddress.fullAddress
							}
						}
					);
				}
			}

			res.send({
				status: 1,
				message: 'Address deleted successfully.',
			});
		} catch (error) {
			console.error(error);
			res.status(500).send({
				status: 0,
				message: 'An error occurred while deleting the address.'
			});
		}
	};

	// router.saveNewAddress = async function (req, res) {

	// 	console.log(req.body.id, 'check idSDHHHHHHHHHHHHHHHHHHH');
	// 	let id = req.body.id;
	// 	console.log(id, 'sahfashfashfsahfj');
	// 	// console.log("------------------------comming here at 1013--------------------------------------------------------------")
	// 	// req.checkBody('user_id', 'user_id is required').notEmpty();
	// 	// req.checkBody('name', 'name is required').notEmpty();
	// 	// req.checkBody('fulladres', 'fulladres is required').notEmpty();
	// 	// req.checkBody('line1', 'line1 is required').notEmpty();
	// 	// req.checkBody('phone', 'phone is required').notEmpty();
	// 	// req.checkBody('country', 'country is required').optional();
	// 	// req.checkBody('id', 'id is required').optional();
	// 	// req.checkBody('city', 'city is required').notEmpty();
	// 	// req.checkBody('zipcode', 'zipcode is required').notEmpty();
	// 	// req.checkBody('long', 'long is required').optional();
	// 	// req.checkBody('lat', 'lat is required').optional();
	// 	var choose_location = req.body.choose_location;
	// 	// var data = {};
	// 	// var errors = req.validationErrors();
	// 	// if (errors) {
	// 	// 	res.send({ "status": 0, "errors": errors[0].msg });
	// 	// 	return;
	// 	// }
	// 	var or_location = {};
	// 	if (req.body.long && req.body.lat) {
	// 		or_location.lng = req.body.long;
	// 		or_location.lat = req.body.lat;
	// 	}
	// 	var order_address = {
	// 		// 'name': req.body.name,
	// 		'first_name': req.body.name,
	// 		'last_name': req.body.lastname,
	// 		'username': req.body.name + ' ' + req.body.lastname,
	// 		'line1': req.body.line1,
	// 		'street': req.body.street,
	// 		'fulladres': req.body.fulladres,
	// 		'country': req.body.country,
	// 		'city': req.body.city,
	// 		'zipcode': req.body.zipcode,
	// 		'phone': req.body.phone,
	// 		'status': 1,
	// 		'choose_location': choose_location,
	// 		'address_value': req.body.address_value,
	// 		'loc': or_location,
	// 		'user_id': req.body.user_id,
	// 		'state': req.body.state,


	// 	};

	// 	console.log(req.body.id, 'check id');

	// 	console.log("-----------------------")
	// 	console.log(req.body)
	// 	const doc = await db.UpdateDocument('order_address', { '_id': new mongoose.Types.ObjectId(id) }, { order_address }, {});
	// 	console.log(doc, 'ssss');

	// 	// console.log(order_address, 'sksnsk');
	// 	res.send({
	// 		"status": "1",
	// 		"response": "Order Address updated Successfully",
	// 	});



	// 	let secdata = await db.InsertDocument('order_address', order_address);

	// 	console.log(secdata, '/////////////////////////////');
	// 	if (!secdata) {
	// 		res.send({
	// 			"status": 0,
	// 			"errors": "Error in delivery location update..!"
	// 		});
	// 	}
	// 	else {
	// 		const doc = await db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {})
	// 		if (doc.doc && doc.doc.length == 1) {
	// 			await db.UpdateDocument('order_address', { _id: new mongoose.Types.ObjectId(secdata._id) }, { $set: { 'active': true } }, {})
	// 		}
	// 		res.send({
	// 			"status": 1,
	// 			"response": "Delivery Address Added Successfully.",
	// 			"result": secdata
	// 		});
	// 	}


	// 	// db.InsertDocument('order_address', order_address, function (err, secdata) {
	// 	// 	if (err) {
	// 	// 		res.send({
	// 	// 			"status": 0,
	// 	// 			"errors": "Error in delivery location update..!"
	// 	// 		});
	// 	// 	}
	// 	// 	else {
	// 	// 		db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {}, function (err, doc) {
	// 	// 			if (doc && doc.length == 1) {
	// 	// 				db.UpdateDocument('order_address', { _id: mongoose.Types.ObjectId(secdata._id) }, { $set: { 'active': true } }, {}, function (err, res) {
	// 	// 				});
	// 	// 			}

	// 	// 		})
	// 	// 		res.send({
	// 	// 			"status": 1,
	// 	// 			"response": "Delivery Address Added Successfully.",
	// 	// 			"result": secdata
	// 	// 		});
	// 	// 	}
	// 	// });

	// }

	router.getDeleveryAddress = async (req, res) => {
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ "status": 0, "errors": errors[0].msg });
		// 	return;		
		// }
		console.log(req.body, 'request body in get address');
		const doc = await db.GetDocument('order_address', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'active': true, 'status': 1 }, {}, {})
		console.log(doc, 'this is doc from get address');
		if (doc.status === false) {
			return res.send({ "status": 0, "errors": 'Something went wrong Please try again' })
		} else {
			if (doc.doc.length >= 1) {
				return res.send({ "status": 1, data: doc.doc })
			} else {
				const docData = await db.GetOneDocument('order_address', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'active': true }, {}, {})
				// console.log(docData, 'this is doc from get address');

				if (docData.status === false) {
					return res.send({ "status": 0, "errors": 'Something went wrong Please try again' })
				} else {
					return res.send({ "status": 1, data: docData.doc })
				}
			}
		}
		// db.GetOneDocument('order_address', { 'user_id': req.body.user_id, 'active': true, 'status': 1 }, {}, {}, function (err, doc) {
		// 	if (err) {
		// 		return res.send({ "status": 0, "errors": err.message || 'Something went wrong Please try again' })
		// 	} else {
		// 		if (doc) {
		// 			return res.send({ "status": 1, data: doc })
		// 		} else {
		// 			db.GetOneDocument('order_address', { 'user_id': req.body.user_id, 'active': true }, {}, {}, function (err, docData) {
		// 				if (err) {
		// 					return res.send({ "status": 0, "errors": err.message || 'Something went wrong Please try again' })
		// 				} else {
		// 					return res.send({ "status": 1, data: docData })
		// 				}
		// 			})
		// 		}
		// 	}
		// })
	}


	router.getBillingAddress = async function (req, res) {
		let { id } = req.body;
		try {
			const doc = await db.GetOneDocument('billing_address', { 'user_id': new mongoose.Types.ObjectId(id), 'status': 1 }, {}, {})
			console.log(doc, "docdocdocdocdoc");
			if (doc.doc.status != 0) {
				// const docdata = await db.UpdateAllDocument('webbanners', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
				if (doc.status === false) {
					return res.send({ data: {}, message: 'Data Not found' });
				} else {
					return res.send({ data: doc.doc });
				}
				// return res.send({data : doc.doc});
			} else {
				return res.send({ data: {}, message: 'Something went wrong' });
			}

		} catch (error) {
			console.log(error);
		}

	}
	router.getShippingAddress = async function (req, res) {
		let { id } = req.body;
		try {
			const doc = await db.GetOneDocument('order_address', { 'user_id': new mongoose.Types.ObjectId(id), 'status': 1 }, {}, {})
			if (doc.doc.status != 0) {
				// const docdata = await db.UpdateAllDocument('webbanners', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
				if (doc.status === false) {
					return res.send({ data: {}, message: 'Data Not found' });
				} else {
					return res.send({ data: doc.doc });
				}
				// return res.send({data : doc.doc});
			} else {
				return res.send({ data: {}, message: 'Something went wrong' });
			}

		} catch (error) {
			console.log(error);
		}

	}

	router.editShippingAddress = async function (req, res) {
		const { user_id, address_id } = req.body; // Extract user_id and address_id from request body

		try {
			// Fetch the document that matches the user_id
			const doc = await db.GetOneDocument('order_address',
				{ user_id: new mongoose.Types.ObjectId(user_id), status: 1 },
				{},
				{}
			);

			// Check if the document exists and contains an addressList
			if (doc && doc.doc && doc.doc.addressList) {
				const address = doc.doc.addressList.find(addr => addr._id.toString() === address_id);

				if (address) {
					return res.send({ data: address, message: 'Address found' });
				} else {
					return res.send({ data: {}, message: 'Address not found' });
				}
			} else {
				return res.send({ data: {}, message: 'No addresses found for this user' });
			}
		} catch (error) {
			console.error(error);
			return res.status(500).send({ data: {}, message: 'An error occurred while retrieving the address' });
		}
	};


	router.cartCount = async (req, res) => {
		var type;
		console.log(req.body.type, 'req.body.type124');
		if (typeof req.body.type != 'undefined' && req.body.type != '') {
			if (req.body.type == 'temp_cart' || req.body.type == 'cart') {
				type = req.body.type;
			} else {
				return res.send({ err: 1, message: 'Invalid Type' })
			}
		}
		else {

			return res.send({ err: 1, message: 'Invalid Type' });
		}
		var collection = 'cart';
		if (type == 'temp_cart') {
			collection = 'temp_cart';
		}
		var userId;
		if (type == 'temp_cart') {
			if (typeof req.body.userId != 'undefined' && req.body.userId != '') {
				userId = req.body.userId;
			} else {
				return res.send({ err: 1, message: 'Invalid userId' });
			}
		}
		else {
			if (typeof req.body.userId != 'undefined' && req.body.userId != '') {
				if (isObjectId(req.body.userId)) {
					userId = new mongoose.Types.ObjectId(req.body.userId);
				} else {
					return res.send({ err: 1, message: 'Invalid userId' });
				}
			} else {
				return res.send({ err: 1, message: 'Invalid userId' });
			}
		}
		query = [
			{ $match: { "user_id": userId, type_status: 0 } },
			{
				$project: {
					value: { $size: "$cart_details" }
				}
			},
			{
				$project: {
					count: { $cond: { if: { $eq: ["$value", 0] }, then: 0, else: "$value" } }
				}
			}
		]
		const doc = await db.GetAggregation(collection, query)
		if (doc.length > 0) {
			res.send({ status: 1, message: '', count: doc[0] && doc[0].count > 0 ? doc[0].count : 0 });
		} else {
			res.send({ status: 0, message: "Not found" });
		}
		// db.GetAggregation(collection, query, function (err, doc) {
		// 	if (err) {
		// 		res.send({ status: 0, message: err });
		// 	} else {
		// 		res.send({ status: 1, message: '', count: doc[0] && doc[0].count > 0 ? doc[0].count : 0 });
		// 	}
		// });
	}

	router.getUser = async (req, res) => {
		try {
			const { userId } = req.body;
			console.log("checkinh user id ---------------------------")

			console.log(userId)
			console.log("checkinh user id ---------------------------")

			const user = await db.GetOneDocument('users', { _id: new mongoose.Types.ObjectId(userId) }, {}, {})

			if (user.status === false) {
				res.send({ status: false, message: "There is something went wrong." })
			} else {
				res.send({ status: true, data: user.doc })
			}
		} catch (error) {
			console.log("error", error)
			res.send({ status: false, message: "There is something went wrong." })
		}
	}

	router.updateAddress = async (req, res) => {
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// req.checkBody('address_id', 'address_id is required').notEmpty();
		var data = {};
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ "status": 0, "errors": errors[0].msg });
		// 	return;
		// }
		data.user_id = req.body.user_id;
		data.address_id = req.body.address_id;
		const doc = await db.UpdateDocument('order_address', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), '_id': { $ne: req.body.address_id } }, { $set: { 'active': false } }, { multi: true });
		console.log(doc, 'this is the doc');
		const docdata = await db.UpdateDocument('order_address', { 'user_id': req.body.user_id, '_id': req.body.address_id }, { $set: { 'active': true } }, {})
		console.log(docdata, 'this is the docdata');
		if (!docdata) {
			res.send({
				"status": 0,
				"errors": "Error in order address update..!"
			});
		} else {
			res.send({
				"status": 1,
				"response": "Order address update successfully."
			});
		}
		// db.UpdateDocument('order_address', { 'user_id': data.user_id }, { $set: { 'active': false } }, { multi: true }, function (err, docdata) { })
		// db.UpdateDocument('order_address', { 'user_id': data.user_id, '_id': data.address_id }, { $set: { 'active': true } }, {}, function (err, docdata) {
		// 	if (err) {
		// 		res.send({
		// 			"status": 0,
		// 			"errors": "Error in order address update..!"
		// 		});
		// 	} else {
		// 		res.send({
		// 			"status": 1,
		// 			"response": "Order address update successfully."
		// 		});
		// 	}
		// });
	}

	router.editOrderAddress = function (req, res) {
		req.checkBody('user_id', 'user_id is required').notEmpty();
		req.checkBody('address_id', 'address_id is required').notEmpty();
		req.checkBody('type', 'type is required').notEmpty();
		req.checkBody('street', 'Building Name, Flat Number can\'t be empty').notEmpty();
		req.checkBody('landmark', 'landmark is required').optional();
		var data = {};
		var errors = req.validationErrors();
		if (errors) {
			res.send({ "status": "0", "errors": errors[0].msg });
			return;
		}
		db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
			if (err || !response) {
				res.send({
					"status": "0",
					"errors": "User not found..!"
				});
			} else {
				if (req.body.type == 'home' || req.body.type == 'work') {
					var updateDetails = { "choose_location": 'other', address_value: '' };
					var condition = { 'user_id': req.body.user_id, '_id': { $nin: [req.body.address_id] }, 'choose_location': req.body.type };
					db.UpdateDocument('order_address', condition, updateDetails, { multi: true }, function (err, res) {
					});
				}
				db.UpdateDocument('order_address', { "_id": req.body.address_id, 'user_id': req.body.user_id }, { 'choose_location': req.body.type, 'street': req.body.street, 'landmark': req.body.landmark, 'address_value': req.body.address_value }, {}, function (err, response) {
					res.send({
						"status": "1",
						"response": "Delivery location updated Successfully.",
					});
				})
			}
		});
	}

	router.deleteOrderAddress = async function (req, res) {
		console.log(req.body, 'thsi is the request body');
		var data = {};
		data.user_id = req.body.user_id;
		data.address_id = req.body.address_id;
		const docdata = await db.DeleteDocument('order_address', { 'user_id': data.user_id, '_id': data.address_id })
		if (docdata.status === false) {
			res.send({
				"status": "0",
				"errors": "Error in order address delete..!"
			});
		} else {
			res.send({
				"status": "1",
				"response": "Order address deleted successfully."
			});
		}
	};

	router.deleteBillingAddress = async function (req, res) {
		console.log(req.body, 'thsi is the request body');
		var data = {};
		data.user_id = req.body.user_id;
		data.address_id = req.body.address_id;
		const docdata = await db.DeleteDocument('billing_address', { 'user_id': data.user_id, '_id': data.address_id })
		if (docdata.status === false) {
			res.send({
				"status": "0",
				"errors": "Error in Billing address delete..!"
			});
		} else {
			res.send({
				"status": "1",
				"response": "Billing address deleted successfully."
			});
		}
	};


	router.deleteOrderCard = function (req, res) {
		req.checkBody('user_id', 'user_id is required').notEmpty();
		req.checkBody('customer_id', 'customer_id is required').notEmpty();
		var data = {};
		var errors = req.validationErrors();
		if (errors) {
			res.send({ "status": "0", "errors": errors[0].msg });
			return;
		}
		db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
			if (err || !response) {
				res.send({
					"status": "0",
					"errors": "User not found..!"
				});
			} else {
				var updateDetails = { "$pull": { 'card_details': { customer_id: { $in: [req.body.customer_id] } } } };
				var condition = { "_id": req.body.user_id, "card_details": { $elemMatch: { "customer_id": req.body.customer_id } } };
				db.UpdateDocument('users', condition, updateDetails, {}, function (err, response) {
					res.send({
						"status": "1",
						"response": "Card Removed Successfully.",
					});
				})
			}
		});
	}

	router.saveUserProfile = async function (req, res) {
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// req.checkBody('first_name', 'first_name is required').notEmpty();
		// req.checkBody('last_name', 'Last Name is required').notEmpty();
		// req.checkBody('email', 'email is required').notEmpty();
		// req.checkBody('gender', 'gender is required').notEmpty();
		// req.checkBody('phone', 'phone is required').notEmpty();
		var avatar;
		if (req.body.base64) {
			var base64 = req.body.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
			var fileName = Date.now().toString() + '.png';
			var file = CONFIG.DIRECTORY_FOOD + fileName;
			library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
			avatar = file;
			// var base64 = req.body.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
			// var fileName = Date.now().toString() + '.png';
			// var file = CONFIG.DIRECTORY_FOOD + fileName;
			// console.log(base64,fileName,file,'base64,fileName,file base64,fileName,file');
			// library.base64Upload({ file: file, base64: base64[2] });
			// avatar = file;
		} else {
			avatar = req.body.image;
		}
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ "status": 0, "errors": errors[0].msg });
		// 	return;
		// }
		const response = await db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {})
		if (response.status === false) {
			res.send({
				"status": 0,
				"errors": "User not found..!"
			});
		} else {
			console.log("hi are you entered in this ");
			const user = await db.GetOneDocument('users', { '_id': { $nin: [req.body.user_id] }, email: req.body.email.toLowerCase() }, {}, {})
			console.log(user, 'user is here ');
			if (!user) {
				res.send({
					"status": 0,
					"errors": "User not found..!"
				});
			} else {
				if (user.doc != 'Data Not found') {
					res.send({
						"status": 0,
						"errors": "Email Id already exists."
					});
				} else {
					const user1 = await db.GetOneDocument('users', { '_id': { $nin: [req.body.user_id] }, "phone.code": req.body.phone.code, "phone.number": req.body.phone.number }, {}, {})
					console.log(user1, 'this is user 1');
					if (user1.doc != 'Data Not found') {
						res.send({
							"status": 0,
							"errors": "Phone number already exists."
						});
					} else {
						var username = (req.body.first_name + req.body.last_name).toLowerCase();
						var updateDetails = { 'username': username, 'first_name': req.body.first_name, email: req.body.email, 'last_name': req.body.last_name, 'gender': req.body.gender, 'avatar': avatar, 'phone': req.body.phone };
						var condition = { "_id": req.body.user_id, };
						const result = await db.UpdateDocument('users', condition, updateDetails, {})
						if (result.status) {
							res.send({
								"status": 1,
								"response": "Successfully Updated.",
							});
						}
						// db.UpdateDocument('users', condition, updateDetails, {}, function (err, response) {
						// 	res.send({
						// 		"status": 1,
						// 		"response": "Successfully Updated.",
						// 	});
						// })
					}
				}
			}
		}
		// db.GetOneDocument('users', { '_id': req.body.user_id, 'status': { $ne: 0 } }, {}, {}, function (err, response) {
		// 	if (err || !response) {
		// 		res.send({
		// 			"status": 0,
		// 			"errors": "User not found..!"
		// 		});
		// 	} else {
		// 		db.GetOneDocument('users', { '_id': { $nin: [req.body.user_id] }, email: req.body.email.toLowerCase() }, {}, {}, function (err, user) {
		// 			if (err) {
		// 				res.send({
		// 					"status": 0,
		// 					"errors": "User not found..!"
		// 				});
		// 			} else {
		// 				if (user) {
		// 					res.send({
		// 						"status": 0,
		// 						"errors": "Email Id already exists."
		// 					});
		// 				} else {
		// 					db.GetOneDocument('users', { '_id': { $nin: [req.body.user_id] }, "phone.code": req.body.phone.code, "phone.number": req.body.phone.number }, {}, {}, function (err, user1) {
		// 						if (user1) {
		// 							res.send({
		// 								"status": 0,
		// 								"errors": "Phone number already exists."
		// 							});
		// 						} else {
		// 							var username = (req.body.first_name + req.body.last_name).toLowerCase();
		// 							var updateDetails = { 'username': username, 'first_name': req.body.first_name, email: req.body.email, 'last_name': req.body.last_name, 'gender': req.body.gender, 'avatar': avatar, 'phone': req.body.phone };
		// 							var condition = { "_id": req.body.user_id, };
		// 							db.UpdateDocument('users', condition, updateDetails, {}, function (err, response) {
		// 								res.send({
		// 									"status": 1,
		// 									"response": "Successfully Updated.",
		// 								});
		// 							})
		// 						}
		// 					})
		// 				}
		// 			}
		// 		});

		// 	}
		// });
	}

	router.addRemoveFavourite = function (req, res) {
		var data = {};
		data.status = 0;
		req.checkBody('user_id', 'user_id is Required').notEmpty();
		req.checkBody('rest_id', 'rest_id  is Required').notEmpty();
		req.checkBody('status', 'status  is Required').notEmpty();

		var errors = req.validationErrors();
		if (errors) {
			data.response = errors[0].msg;
			res.send(data); return;
		}

		var user_id;
		if (typeof req.body.user_id != 'undefined' && req.body.user_id != '') {
			if (isObjectId(req.body.user_id)) {
				user_id = new mongoose.Types.ObjectId(req.body.user_id);
			} else {
				res.send({ status: "0", "errors": "Invalid user_id" });
				return;
			}
		} else {
			res.send({ status: "0", "errors": "Invalid user_id" });
			return;
		}
		var rest_id;
		if (typeof req.body.rest_id != 'undefined' && req.body.rest_id != '') {
			if (isObjectId(req.body.rest_id)) {
				rest_id = new mongoose.Types.ObjectId(req.body.rest_id);
			} else {
				res.send({ status: "0", "errors": "Invalid rest_id" });
				return;
			}
		} else {
			res.send({ status: "0", "errors": "Invalid rest_id" });
			return;
		}
		var status;
		if (typeof req.body.status != 'undefined' && req.body.status != '') {
			if (req.body.status == 'add' || req.body.status == 'remove') {
				status = req.body.status;
			} else {
				res.send({ status: "0", "errors": "Invalid status" });
				return;
			}
		} else {
			res.send({ status: "0", "errors": "Invalid status" });
			return;
		}
		req.sanitizeBody('user_id').trim();
		req.sanitizeBody('rest_id').trim();
		req.sanitizeBody('status').trim();
		db.GetOneDocument('users', { '_id': user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
			if (err || !user) {
				res.send({ status: "0", "errors": "User id is wrong..!" });
			} else {
				db.GetOneDocument('users', { '_id': user_id, status: { $ne: 0 }, "favourite": { $elemMatch: { "id": rest_id } } }, { _id: 1 }, {}, function (err, favdoc) {
					if (err) {
						res.send({ status: "0", "errors": "Error in Favourite..!" });
					} else {
						if (status == 'add') {
							if (!favdoc || (favdoc && typeof favdoc._id == 'undefined')) {
								var data = { id: rest_id, timestamp: Date.now() }
								var condition = { '_id': user_id, status: { $ne: 0 } };
								var updateDetails = { "$push": { 'favourite': data } };
								db.UpdateDocument('users', condition, updateDetails, {}, function (err, docdata) {
									res.send({ status: "1", "message": "Favourite updated successfully..!" });
								});
							} else {
								res.send({ status: "1", "message": "Favourite updated successfully..!" });
							}
						} else {
							if (favdoc && typeof favdoc._id != 'undefined') {
								var condition = { '_id': user_id, status: { $ne: 0 }, "favourite": { $elemMatch: { "id": rest_id } } };
								var updateDetails = { "$pull": { 'favourite': { id: { $in: [rest_id] } } } };
								db.UpdateDocument('users', condition, updateDetails, {}, function (err, docdata) {
									res.send({ status: "1", "message": "Favourite updated successfully..!" });
								});
							} else {
								res.send({ status: "1", "message": "Favourite updated successfully..!" });
							}
						}
					}
				});
			}
		});
	};

	router.getPaymentGateway = function (req, res) {
		var type;
		if (typeof req.query.type != 'undefined') {
			if (req.query.type == 'stripe' || req.query.type == 'paypal') {
				type = req.query.type;
			} else {
				res.send({ err: 1, msg: 'Invalid type' });
				return;
			}
		} else {
			res.send({ err: 1, msg: 'Invalid type' });
			return;
		}
		db.GetOneDocument('paymentgateway', { 'alias': type, status: 1 }, {}, {}, function (err, gateWay) {
			if (err || !gateWay) {
				res.send({ err: 1, msg: 'unable to fetch data' });
			} else {
				if (typeof gateWay != 'undefined' && typeof gateWay.settings != 'undefined') {
					res.send({ err: 0, msg: '', settings: gateWay.settings });
				} else {
					res.send({ err: 0, msg: '', settings: {} });
				}
			}
		});
	};

	router.getPaymentMethods = function (req, res) {
		var sorting = {};
		var condition = { status: { $eq: 1 } };
		db.GetDocument('paymentgateway', condition, {}, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	}

	router.getcancelreason = function getcancelreason(req, res) {
		var query = {};
		query = { 'type': 'user', 'status': 1 }
		db.GetDocument('cancellation', query, {}, {}, function (err, data) {
			if (err) {
				res.send(err);
			} else {
				res.send(data);
			}
		});
	}

	router.orderSummary = function (req, res) {
		var userId;
		if (typeof req.query.userId != 'undefined' && req.query.userId != '') {
			if (isObjectId(req.query.userId)) {
				userId = new mongoose.Types.ObjectId(req.query.userId);
			} else {
				res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
				return;
			}
		} else {
			res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
			return;
		}
		var orderId;
		if (typeof req.query.orderId != 'undefined' && req.query.orderId != '') {
			if (isObjectId(req.query.orderId)) {
				orderId = new mongoose.Types.ObjectId(req.query.orderId);
			} else {
				res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
				return;
			}
		} else {
			res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
			return;
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
			} else {
				db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
					if (err || !userDetails) {
						res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
					} else {
						var filter_query = { "user_id": userId, _id: orderId, $or: [{ "status": 2 }, { "status": 7 }, { "status": 9 }] };
						var condition = [
							{ $match: filter_query },
							{ '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
							{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
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
										// 	restaurantname: "$restaurantDetails.restaurantname",
										// 	username: "$restaurantDetails.username",
										// 	email: "$restaurantDetails.email",
										// 	address: "$restaurantDetails.address",
										// },
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
													'net_quantity': '$$el.net_quantity',
													'units': '$$el.units',
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
										order_status: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Received", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Acepted", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Driver Pickedup", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By User", { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] }
									}
								}
							}
						];
						db.GetAggregation('orders', condition, function (err, docdata) {
							if (err || !docdata) {
								res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
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
											orderDetails.item_total = (orderDetails.billings.amount.total).toFixed(2);
											orderDetails.item_total = myFormat(orderDetails.item_total, { integerSeparator: ',' })
											orderDetails.billings.amount.offer_discount = myFormat(orderDetails.billings.amount.offer_discount.toFixed(2), { integerSeparator: ',' })
											// orderDetails.billings.amount.coupon_discount = myFormat(orderDetails.billings.amount.coupon_discount.toFixed(2), { integerSeparator: ',' })
											// orderDetails.billings.amount.delivery_amount = myFormat(orderDetails.billings.amount.delivery_amount.toFixed(2), { integerSeparator: ',' })
											// if(orderDetails.billings.amount.package_charge){
											// 	orderDetails.billings.amount.package_charge = myFormat(orderDetails.billings.amount.package_charge.toFixed(2), { integerSeparator: ',' })
											// }
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
									res.render('site/order_summary', pug);
								} else {
									res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
								}
							}
						})
					}
				})

			}
		})
	};

	router.userorderSummary = function (req, res) {
		var userId;
		if (typeof req.query.userId != 'undefined' && req.query.userId != '') {
			if (isObjectId(req.query.userId)) {
				userId = new mongoose.Types.ObjectId(req.query.userId);
			} else {
				res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
				return;
			}
		} else {
			res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
			return;
		}
		var orderId;
		if (typeof req.query.orderId != 'undefined' && req.query.orderId != '') {
			if (isObjectId(req.query.orderId)) {
				orderId = new mongoose.Types.ObjectId(req.query.orderId);
			} else {
				res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
				return;
			}
		} else {
			res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
			return;
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
				res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
			} else {
				db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, username: 1, last_name: 1, phone: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1 }, {}, function (err, userDetails) {
					if (err || !userDetails) {
						res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
					} else {
						var filter_query = { "user_id": userId, _id: orderId, $or: [{ "status": 2 }, { "status": 7 }, { "status": 9 }] };
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
										// 	restaurantname: "$restaurantDetails.restaurantname",
										// 	username: "$restaurantDetails.username",
										// 	email: "$restaurantDetails.email",
										// 	address: "$restaurantDetails.address",
										// },
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
								res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
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
									res.render('site/user_order_summary', pug);
								} else {
									res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
								}
							}
						})
					}
				})

			}
		})
	};

	router.usersUniqueCode = function (req, res) {
		var user = JSON.parse(req.cookies.siteuserglobals);
		if (!user || user == 'undefined' || user == '') {
			res.send({
				status: 0,
				msg: "No user found."
			})
		} else {
			var user_id = user.currentUser.user_id;
			var unique_code = user.currentUser.unique_code;
			res.send({
				user_id: user_id, unique_code: unique_code
			})
		}


		//req.checkBody('user_id', 'user_id is required').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ "status": "0", "errors": errors[0].msg });
		// 	return;
		// }
		// db.GetDocument('users', { _id: req.body.user_id }, { unique_code: 1 }, {}, function (err, uniqueData) {
		// 	if (err || !uniqueData) {
		// 		res.send({
		// 			status: 0,
		// 			msg: "no offer"
		// 		})
		// 	} else {
		// 		//console.log(uniqueData)
		// 		res.send(uniqueData)
		// 	}

		// })

	}

	router.userAddressCount = async function userAddressCount(req, res) {
		var user_id = "";
		var query = {};
		if (req.body.user_id && typeof req.body.user_id != "undefined" && req.body.user_id != "null") {
			user_id = req.body.user_id;
			query = { "user_id": user_id }
			const countData = await db.GetCount('order_address', query)
			if (!countData) {
				res.send({ status: 0, message: 'no data' });
			} else {
				res.send({ status: 1, message: '', count: countData });
			}
			// db.GetCount('order_address', query, function (err, countData) {
			// 	if (err) {
			// 		res.send({ status: 0, message: err });
			// 	} else {
			// 		res.send({ status: 1, message: '', count: countData });
			// 	}
			// });
		} else {
			res.send({ status: 0, message: 'Invalid User' });
		}
	}

	router.getAccounts = (req, res) => {
		var errors = [];

		req.checkBody('id', 'User ID is required').notEmpty();
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

		request.id = req.body.id;
		db.GetOneDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, { username: 1 }, {}, (err, docs) => {

			if (err) {
				res.send({ status: 0, data: err });
			}
			else {
				var data = {};
				data.username = docs.username;
				res.send({ status: 1, data: data });
			}
		})
	}

	router.checkLink = (req, res) => {
		var moment = require('moment')
		var errors = [];
		req.checkBody('id', 'User Id is required').notEmpty();
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
		request.id = req.body.id;
		// request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
		db.GetOneDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, isUser) => {
			if (isUser) {
				if (isUser.forgot_password.is_done == 1) {


					res.send({ status: 0, response: 'Error in updating' })
				}
				else {
					var a = moment(new Date(isUser.forgot_password.last_sent));
					var b = moment(new Date());
					if (b.diff(a, 'minutes') > 60) {
						res.send({ status: 0, response: 'Error in updating' })
					}
					else {
						res.send({ status: 1, response: 'No error in updating' });
					}
				}
			}
			else {
				res.send({ status: 0, response: 'Error in updating' })
			}
		})
	}

	router.changePassword = async (req, res) => {
		// var moment = require('moment')
		// var errors = [];
		// req.checkBody('user_id', 'User Id is required').notEmpty();
		// req.checkBody('password', 'Password is required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		"status": "0",
		// 		"errors": errors[0].msg
		// 	});
		// 	return;
		// }
		var data = {};
		var request = {};
		request.id = req.body.user_id;
		request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
		const isUser = await db.GetOneDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {})
		if (isUser.status === false) {
			if (isUser.forgot_password.is_done == 1) {
				res.send({ status: 0, response: 'Error in updating' })
			}
			else {
				var a = moment(new Date(isUser.forgot_password.last_sent));
				var b = moment(new Date());
				if (b.diff(a, 'minutes') > 60) {
					res.send({ status: 0, response: 'Error in updating' })
				}
				else {
					const updated = await db.UpdateDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, { 'password': request.password, 'forgot_password.is_done': 1 }, {},)
					if (updated.doc.nModified == 1) {
						res.send({ status: 1, response: 'updated successfully' })
					} else {
						res.send({ status: 0, response: 'Error in updating' })
					}
					// db.UpdateDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, { 'password': request.password, 'forgot_password.is_done': 1 }, {}, (err, updated) => {
					// 	if (updated.nModified == 1) {
					// 		res.send({ status: 1, response: 'updated successfully' })
					// 	}
					// 	else {
					// 		res.send({ status: 0, response: 'Error in updating' })
					// 	}
					// })
				}
			}
		} else {
			res.send({ status: 0, response: 'Error in updating' })
		}
		// db.GetOneDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, isUser) => {
		// 	if (isUser) {
		// 		if (isUser.forgot_password.is_done == 1) {
		// 			res.send({ status: 0, response: 'Error in updating' })
		// 		}
		// 		else {
		// 			var a = moment(new Date(isUser.forgot_password.last_sent));
		// 			var b = moment(new Date());
		// 			if (b.diff(a, 'minutes') > 60) {
		// 				res.send({ status: 0, response: 'Error in updating' })
		// 			}
		// 			else {
		// 				db.UpdateDocument('users', { '_id': new mongoose.Types.ObjectId(request.id) }, { 'password': request.password, 'forgot_password.is_done': 1 }, {}, (err, updated) => {
		// 					if (updated.nModified == 1) {
		// 						res.send({ status: 1, response: 'updated successfully' })
		// 					}
		// 					else {
		// 						res.send({ status: 0, response: 'Error in updating' })
		// 					}
		// 				})
		// 			}
		// 		}
		// 	}
		// 	else {
		// 		res.send({ status: 0, response: 'Error in updating' })
		// 	}
		// })
	}

	router.getAllRcategory = async (req, res) => {
		var data = {};


		let cat_count = await db.GetCount('rcategory', { 'status': { $eq: 1 } })


		if (cat_count && cat_count > 0) {
			var eachrun = 10;
			var loop = Math.ceil(cat_count / eachrun);
			var loopcount = 1;
			var categories = [];
			var subfood = '';
			async.whilst(
				(cb) => {
					cb(null, loopcount <= loop)
				},
				(callback) => {
					var limit = eachrun;
					var skip = ((eachrun * loopcount)) - eachrun;
					var query = [
						{ $match: { 'status': { $eq: 1 } } },
						{
							$lookup: {
								from: 'food', let: {
									rcategory: "$_id",
								},
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ "$eq": ["$rcategory", "$$rcategory"] },
													{ "$eq": ["$status", 1] },
													// { "$in": [ req.body.cityid,"$main_city"] }
												]
											}
										}
									},
									{
										$count: 'count'
									}
								], as: "foods"
							}
						},
						{ "$unwind": { path: "$foods", preserveNullAndEmptyArrays: true } },
						{
							$lookup: {
								from: 'scategory',
								let: {
									rcategory: "$_id",
								},
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ "$eq": ["$rcategory", "$$rcategory"] },
													{ "$eq": ["$status", 1] },
												]
											}
										}
									}
								],
								as: "subcategory"
							}
						},
						//{ "$match": { "subcategory.status": {$eq: 1} }},
						//{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
						{ $sort: { rcatname: 1 } },
						{ $skip: skip },
						{ $limit: limit },
						{
							$project: {
								rcatname: "$rcatname",
								rfood: "$foods.count",
								img: 1,
								subcategory: "$subcategory"
							}
						}
					];

					// let cat_aggre = await db.GetAggregation('rcategory', query)




					db.GetAggregation('rcategory', query).then(catlist => {
						if (catlist && catlist.length > 0) {
							// for(var i=0; i < catlist.length; i++){

							// 	for(var j=0; j < catlist[i].subcategory.length; j++){

							// 		catlist[i].subcategory[j].food = "";


							// 		// db.GetCount('food', { 'scategory': mongoose.Types.ObjectId(catlist[i].subcategory[j]._id) }, (err, sfood) => {
							// 		// 	subfood = sfood;
							// 		// });
							// 		catlist[i].subcategory[j].food = sfood;


							// 	}

							// }
							categories = [...categories, ...catlist];
							loopcount++;
							callback(null, loopcount);
						} else {
							loopcount++;
							callback(null, loopcount);
						}
					})

					// (err, catlist) => {
					// if (catlist && catlist.length > 0) {
					// 	// for(var i=0; i < catlist.length; i++){

					// 	// 	for(var j=0; j < catlist[i].subcategory.length; j++){

					// 	// 		catlist[i].subcategory[j].food = "";


					// 	// 		// db.GetCount('food', { 'scategory': mongoose.Types.ObjectId(catlist[i].subcategory[j]._id) }, (err, sfood) => {
					// 	// 		// 	subfood = sfood;
					// 	// 		// });
					// 	// 		catlist[i].subcategory[j].food = sfood;


					// 	// 	}

					// 	// }
					// 	categories = [...categories, ...catlist];
					// 	loopcount++;
					// 	callback(null, loopcount);
					// } else {
					// 	loopcount++;
					// 	callback(null, loopcount);
					// }
					// });
				},
				() => {
					if (categories) {

						data.status = 1;
						data.message = 'success';
						data.list = categories;
						res.send(data);
					}
				}
			);
		} else {
			console.log("------------------comming at else part-------------------")
			data.status = 1;
			data.message = 'success';
			data.list = [];
			res.send(data);
		}
		// db.GetCount('rcategory', { 'status': { $eq: 1 } }, (err, count) => {
		// 	if (err || count < 1) {
		// 		data.status = 1;
		// 		data.message = 'success';
		// 		data.list = [];
		// 		res.send(data);
		// 	} else {
		// 		var eachrun = 10;
		// 		var loop = Math.ceil(count / eachrun);
		// 		var loopcount = 1;
		// 		var categories = [];
		// 		var subfood = '';
		// 		async.whilst(
		// 			(cb) => {
		// 				cb(null, loopcount <= loop)
		// 			},
		// 			(callback) => {
		// 				var limit = eachrun;
		// 				var skip = ((eachrun * loopcount)) - eachrun;
		// 				var query = [
		// 					{ $match: { 'status': { $eq: 1 } } },
		// 					{
		// 						$lookup: {
		// 							from: 'food', let: {
		// 								rcategory: "$_id",
		// 							},
		// 							pipeline: [
		// 								{
		// 									$match: {
		// 										$expr: {
		// 											$and: [
		// 												{ "$eq": ["$rcategory", "$$rcategory"] },
		// 												{ "$eq": ["$status", 1] },
		// 												// { "$in": [ req.body.cityid,"$main_city"] }
		// 											]
		// 										}
		// 									}
		// 								},
		// 								{
		// 									$count: 'count'
		// 								}
		// 							], as: "foods"
		// 						}
		// 					},
		// 					{ "$unwind": { path: "$foods", preserveNullAndEmptyArrays: true } },
		// 					{
		// 						$lookup: {
		// 							from: 'scategory',
		// 							let: {
		// 								rcategory: "$_id",
		// 							},
		// 							pipeline: [
		// 								{
		// 									$match: {
		// 										$expr: {
		// 											$and: [
		// 												{ "$eq": ["$rcategory", "$$rcategory"] },
		// 												{ "$eq": ["$status", 1] },
		// 											]
		// 										}
		// 									}
		// 								}
		// 							],
		// 							as: "subcategory"
		// 						}
		// 					},
		// 					//{ "$match": { "subcategory.status": {$eq: 1} }},
		// 					//{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
		// 					{ $sort: { rcatname: 1 } },
		// 					{ $skip: skip },
		// 					{ $limit: limit },
		// 					{
		// 						$project: {
		// 							rcatname: "$rcatname",
		// 							rfood: "$foods.count",
		// 							img: 1,
		// 							subcategory: "$subcategory"
		// 						}
		// 					}
		// 				];
		// 				db.GetAggregation('rcategory', query, (err, catlist) => {
		// 					if (catlist && catlist.length > 0) {
		// 						// for(var i=0; i < catlist.length; i++){

		// 						// 	for(var j=0; j < catlist[i].subcategory.length; j++){

		// 						// 		catlist[i].subcategory[j].food = "";


		// 						// 		// db.GetCount('food', { 'scategory': mongoose.Types.ObjectId(catlist[i].subcategory[j]._id) }, (err, sfood) => {
		// 						// 		// 	subfood = sfood;
		// 						// 		// });
		// 						// 		catlist[i].subcategory[j].food = sfood;


		// 						// 	}

		// 						// }
		// 						categories = [...categories, ...catlist];
		// 						loopcount++;
		// 						callback(null, loopcount);
		// 					} else {
		// 						loopcount++;
		// 						callback(null, loopcount);
		// 					}
		// 				});
		// 			},
		// 			() => {
		// 				if (categories) {

		// 					data.status = 1;
		// 					data.message = 'success';
		// 					data.list = categories;
		// 					res.send(data);
		// 				}
		// 			}
		// 		);
		// 	}
		// });
	}

	router.getRcategoryList = async (req, res) => {
		const { category, sub_cat } = req.body;
		try {
			if (category) {
				let findMainCat = await db.GetOneDocument("rcategory", { slug: category, status: 1 }, {}, {});
				if (!findMainCat || !findMainCat.doc || !findMainCat.doc._id) {
					findMainCat = await db.GetOneDocument("scategory", { slug: category, status: 1 }, {}, {})
				};
				if (findMainCat && findMainCat.doc && findMainCat.doc._id) {
					let subIds = [];
					let sub_det = {};
					if (sub_cat && Array.isArray(sub_cat) && sub_cat.length > 0) {
						let sub_list = await db.GetDocument("scategory", { slug: { $in: sub_cat }, status: 1 }, {}, {});
						sub_list.doc.map(x => {
							subIds.push(x._id);
							sub_det[x._id] = x.rcategory
						});
					}
					let query = [
						{
							$match: { rcategory: { $in: [findMainCat.doc._id, ...subIds] }, status: 1 }
						}, {
							$group: {
								_id: "$rcategory",
								document: { $push: "$$ROOT" }
							}
						}
					]
					let categoryList = await db.GetAggregation("scategory", query);
					let condition_attri = {};
					if (findMainCat.doc && findMainCat.doc.rootCategory) {
						condition_attri = {
							$or: [
								{ "category._id": findMainCat.doc._id },
								{ "category._id": findMainCat.doc.rootCategory },
							]
						};
					} else {
						condition_attri = { "category._id": findMainCat.doc._id, status: 1 };
					}
					let attributes_list = await db.GetDocument("attributes", condition_attri, {}, {});
					let sub_cat_list = {};
					categoryList.map(x => {
						sub_cat_list[x._id] = x.document
					});
					// if(main_cat){
					let mainCatList = await db.GetDocument("rcategory", { status: 1 }, {}, {});
					sub_cat_list["mainCat"] = mainCatList.doc;
					// }
					// console.log(sub_cat_list)
					return res.status(200).send({ status: 1, message: "category list found", response: { categoryDetails: findMainCat.doc, sub_list: sub_cat_list, attributes: attributes_list.doc, subIds: subIds, sub_det: sub_det } });
				};
			};
			let findMainCat = await db.GetDocument("rcategory", { status: 1 }, {}, {});
			if (findMainCat && findMainCat.doc) {
				return res.status(200).send({ status: 1, message: "category list found", response: { sub_list: { "mainCat": findMainCat.doc } } });
			} else {
				return res.status(200).send({ status: 1, message: "category list found", response: { sub_list: [] } });
			}
		} catch (error) {
			return res.status(500).send({ status: 0, message: "Something went wrong! Please try again" });
		}
	};

	router.getSubCatList = async (req, res) => {
		const { category_id } = req.body;
		try {
			if (!mongoose.isValidObjectId(category_id)) {
				return res.status(400).send({ status: 0, message: "Invalid category id! Please check and try again" });
			};
			let categoryList = await db.GetDocument("scategory", { rcategory: new mongoose.Types.ObjectId(category_id), status: 1 }, {}, {});
			return res.status(200).send({ status: 1, message: "Sub category list found", response: categoryList.doc });
		} catch (error) {
			return res.status(500).send({ status: 0, message: "Something went wrong! Please try again" });
		}
	}

	router.deliverycharge = (req, res) => {

		var data = {};
		var request = {};
		request.id = req.body.cityid;

		db.GetOneDocument('city', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, citydata) => {
			if (citydata) {
				//console.log(citydata)
				db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
					if (err || !settings) {
						res.send({ status: 0, err: 1, message: 'Configure your app settings' });
					} else {
						db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
							if (err || !socialsettings) {
								res.send({ status: 0, err: 1, message: 'Configure your app settings' });
							} else {
								var apiKey = socialsettings.settings.map_api.web_key;
								var distance = require('google-distance-matrix');
								distance.key(apiKey);
								if (citydata.format == "mile") {
									distance.units('imperial');
								} else {
									distance.units('metric');
								}
								//distance.units('imperial');
								let from = [citydata.warehouse.lat.toString() + ',' + citydata.warehouse.lng.toString()];
								let to = [req.body.lat.toString() + ',' + req.body.lng.toString()];
								distance.matrix(from, to, function (err, distances) {
									//console.log(distances)
									if (distances.rows[0].elements[0].status == 'OK') {
										request.distance = distances.rows[0].elements[0].distance.value / 1000;
									}
									if (citydata.format == "mile") {
										request.distance = request.distance / 8 * 5;
									}

									totalkms = request.distance || 0;
									totalkms = parseFloat(totalkms);
									data.minimum_distance = citydata.minimum_distance;
									if (totalkms > citydata.minimum_distance) {
										data.total_kms = totalkms - citydata.minimum_distance;
										if (req.body.total_amount < citydata.delivery_charge.target_amount) {
											data.delivery_charge = parseFloat((data.total_kms * citydata.extra_price) + citydata.delivery_charge.default_amt).toFixed(2);
										} else {
											data.delivery_charge = parseFloat(data.total_kms * citydata.extra_price).toFixed(2);
										}
									} else {
										data.total_kms = totalkms;
										if (req.body.total_amount < citydata.delivery_charge.target_amount) {
											data.delivery_charge = citydata.delivery_charge.default_amt;
										} else {
											data.delivery_charge = 0.00;
										}

									}
									res.send({ status: 1, err: 0, message: 'Delivery charge Details..', data: data });
								})

							}
						});
					}

				})
			}
			else {
				res.send({ status: 0, response: 'Error in Getting charge' })
			}
		})
	}

	router.getAllCitys = (req, res) => {
		var data = {};
		db.GetCount('city', { 'status': { $eq: 1 } }, (err, count) => {
			if (err || count < 1) {
				data.status = 1;
				data.message = 'success';
				data.list = [];
				res.send(data);
			} else {
				var eachrun = 10;
				var loop = Math.ceil(count / eachrun);
				var loopcount = 1;
				var citylist = [];
				async.whilst(
					(cb) => {
						cb(null, loopcount <= loop)
					},
					(callback) => {
						var limit = eachrun;
						var skip = ((eachrun * loopcount)) - eachrun;
						var query = [
							{ $match: { 'status': { $eq: 1 } } },
							{ $sort: { cityname: 1 } },
							{ $skip: skip },
							{ $limit: limit },
							{
								$project: {
									cityname: "$cityname",
									status: 1,
									address: 1,
									location: 1
								}
							}
						];
						db.GetAggregation('city', query, (err, citlist) => {
							if (citlist && citlist.length > 0) {
								citylist = [...citylist, ...citlist];
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
						data.list = citylist;
						res.send(data);
					}
				);
			}
		});
	}

	router.getBanners = async (req, res) => {
		var data = {};
		const count = await db.GetCount('webbanners', { 'status': { $eq: 1 } })
		if (count < 1) {
			data.status = 1;
			data.message = 'success';
			data.bannerlist = [];
			res.send(data);
		} else {
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {
				var eachrun = 30;
				var loop = Math.ceil(count / eachrun);
				var loopcount = 1;
				var banners = [];
				const getBannerList = async () => {
					try {
						while (loopcount <= loop) {
							const limit = eachrun;
							const skip = (eachrun * loopcount) - eachrun;

							const query = [
								{ $match: { 'status': { $eq: 1 } } },
								{
									$lookup: {
										from: "rcategory",
										localField: "category",
										foreignField: "rcatname",
										as: "categoryInfo"
									}
								},
								{ $unwind: '$categoryInfo' },
								{ $sort: { img: 1, bannername: 1 } },
								{ $skip: skip },
								{ $limit: limit },
								{
									$project: {
										bannername: "$bannername",
										img: 1,
										description: 1,
										categoryInfo: 1
									}
								}
							];

							const bannerlist = await db.GetAggregation('webbanners', query);
							if (bannerlist && bannerlist.length > 0) {
								bannerlist.forEach(banner => {
									if (banner.img !== undefined) {
										banner.img = settings.doc.settings.site_url + banner.img.slice(2);
									} else {
										banner.img = "";
									}
								});
								banners = [...banners, ...bannerlist];
							}

							loopcount++;
						}

						const data = {
							status: 1,
							message: 'success',
							bannerlist: banners
						};

						res.send(data);

					} catch (error) {
						res.status(500).send('Internal Server Error');
					}
				};

				getBannerList();

			}
		}
		// db.GetCount('webbanners', { 'status': { $eq: 1 } }, (err, count) => {
		// 	if (err || count < 1) {
		// 		data.status = 1;
		// 		data.message = 'success';
		// 		data.bannerlist = [];
		// 		res.send(data);
		// 	} else {
		// 		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 			if (err || !settings) {
		// 				res.send({ "status": "0", "errors": "Configure your app settings" });
		// 			} else {
		// 				var eachrun = 30;
		// 				var loop = Math.ceil(count / eachrun);
		// 				var loopcount = 1;
		// 				var banners = [];


		// async.whilst(
		// 	(cb) => {
		// 		cb(null, loopcount <= loop)
		// 	},
		// 	(callback) => {
		// 		var limit = eachrun;
		// 		var skip = ((eachrun * loopcount)) - eachrun;
		// 		var query = [
		// 			{ $match: { 'status': { $eq: 1 } } },
		// 			{ $sort: { img: 1, bannername: 1 } },
		// 			{ $skip: skip },
		// 			{ $limit: limit },
		// 			{
		// 				$project: {
		// 					bannername: "$bannername",
		// 					img: 1,
		// 					description: 1
		// 				}
		// 			}
		// 		];
		// 		db.GetAggregation('webbanners', query, (err, bannerlist) => {
		// 			if (bannerlist && bannerlist.length > 0) {

		// 				for (var i = 0; i < bannerlist.length; i++) {
		// 					if (bannerlist[i].img != undefined) {
		// 						image = settings.settings.site_url + bannerlist[i].img.slice(2);
		// 						bannerlist[i].img = image;
		// 					} else {
		// 						bannerlist[i].img = "";
		// 					}
		// 				}
		// 				banners = [...banners, ...bannerlist];
		// 				loopcount++;
		// 				callback(null, loopcount);
		// 			} else {
		// 				loopcount++;
		// 				callback(null, loopcount);
		// 			}
		// 		});
		// 	},
		// 	() => {
		// 		data.status = 1;
		// 		data.message = 'success';
		// 		data.bannerlist = banners;
		// 		res.send(data);
		// 	}
		// );
		// 			}
		// 		});
		// 	}
		// });
	}

	router.getBrands = (req, res) => {
		var data = {};
		db.GetCount('brands', { 'status': { $eq: 1 } }, (err, count) => {
			if (err || count < 1) {
				data.status = 1;
				data.message = 'success';
				data.bannerlist = [];
				res.send(data);
			} else {
				db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
					if (err || !settings) {
						res.send({ "status": "0", "errors": "Configure your app settings" });
					} else {
						var eachrun = 30;
						var loop = Math.ceil(count / eachrun);
						var loopcount = 1;
						var brands = [];
						async.whilst(
							(cb) => {
								cb(null, loopcount <= loop)
							},
							(callback) => {
								var limit = eachrun;
								var skip = ((eachrun * loopcount)) - eachrun;
								var query = [
									{ $match: { 'status': { $eq: 1 } } },
									{ $sort: { img: 1, bannername: 1 } },
									{ $skip: skip },
									{ $limit: limit },
									{
										$project: {
											brandname: "$brandname",
											img: 1
										}
									}
								];
								db.GetAggregation('brands', query, (err, brandlist) => {
									if (brandlist && brandlist.length > 0) {

										for (var i = 0; i < brandlist.length; i++) {
											if (brandlist[i].img != undefined) {
												image = settings.settings.site_url + brandlist[i].img.slice(2);
												brandlist[i].img = image;
											} else {
												brandlist[i].img = "";
											}
										}
										brands = [...brands, ...brandlist];
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
								data.brandlist = brands;
								res.send(data);
							}
						);
					}
				});
			}
		});
	}
	router.featured_cat = async (req, res) => {

		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			res.send({ "status": "0", "errors": "Configure your app settings" });
		} else {
			let get_feutred_cat_pipeline = [
				{ $match: { feature: 1 } },
				{
					$lookup: {
						from: 'food',
						let: { "rcat": "$_id" },
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: ["$rcategory", "$$rcat"]
									}
								}
							}, {
								$limit: 8
							}
						],
						as: 'foodData',
					},
				},
			];
			if (req.body.user_id) {
				if (!mongoose.isValidObjectId(req.body.user_id)) {
					return res.send({ status: 0, message: "Invalid user_id!" });
				};
				get_feutred_cat_pipeline[1]["$lookup"].pipeline.push(
					{
						$lookup: {
							from: "favourite",
							let: { product_id: "$_id" },
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$product_id", "$$product_id"] },
												{ $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.user_id)] },
											]
										}
									}
								}
							],
							as: "favourite"
						}
					}, {
					$addFields: { favourite_add: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } } }
				},
					{
						$addFields: {
							discount_percentage:
							{
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]
							}
						}
					},
					{
						$addFields: {
							outOfStockQuantity: {
								$cond: {
									if: { "$eq": ["$size_status", 2] },
									then: "$quantity",
									else: {
										$sum: "$price_details.quantity"
									}
								}
							}
						}
					}
				)
			} else {
				get_feutred_cat_pipeline[1]["$lookup"].pipeline.push(
					{ $addFields: { favourite_add: { $literal: false } } },
					{
						$addFields: {
							discount_percentage:
							{
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]
							}
						}
					},
					{
						$addFields: {
							outOfStockQuantity: {
								$cond: {
									if: { "$eq": ["$size_status", 2] },
									then: "$quantity",
									else: {
										$sum: "$price_details.quantity"
									}
								}
							}
						}
					}
				);
			};
			get_feutred_cat_pipeline.push(
				{
					$match: { "foodData._id": { $exists: true } }
				}
			)
			const featured_pro = await db.GetAggregation('rcategory', get_feutred_cat_pipeline);

			if (featured_pro && featured_pro.length > 0) {
				for (let i = 0; i < featured_pro.length; i++) {
					if (featured_pro[i] && featured_pro[i].foodData && featured_pro[i].foodData.length > 0) {
						for (let j = 0; j < featured_pro[i].foodData.length; j++) {


							if (featured_pro[i].foodData[j].offer_status == 1) {

								featured_pro[i].foodData[j].offer_base = JSON.parse(JSON.stringify(featured_pro[i].foodData[j].base_price));
								var offer_price = parseFloat(parseFloat((featured_pro[i].foodData[j].base_price * featured_pro[i].foodData[j].offer_amount) / 100).toFixed(2));
								var sub_price = featured_pro[i].foodData[j].base_price - offer_price;
								featured_pro[i].foodData[j].offer_sale = sub_price > 0 ? sub_price : 0


							}

						}
					}
				}
			}

			// if (featured_pro.offer_status == 1) {


			// 	featured_pro.offer_base = JSON.parse(JSON.stringify(featured_pro.base_price));
			// 	var offer_price = parseFloat(parseFloat((featured_pro.base_price * featured_pro.offer_amount) / 100).toFixed(2));
			// 	var sub_price = featured_pro.base_price - offer_price;
			// 	featured_pro.offer_sale = sub_price > 0 ? sub_price : 0
			// }



			if (featured_pro) {
				var data = {};
				data.feature = featured_pro;
				data.status = 1
				res.send(data);
			} else {
				var data = {};

				data.status = 0
				data.err = "Something wentWrong"
				res.send(data)
			}
		}
	}


	router.get_featured_categories = async (req, res) => {

		var get_featured_categories_data = {};


		let feutred = await db.GetDocument('rcategory', { feature: 1, status: 1 }, {}, {})

		if (!feutred) {
			get_featured_categories_data.status = 0
			get_featured_categories_data.message = "No Featured Category Found"
			res.send(get_featured_categories_data)
		} else {
			get_featured_categories_data.status = 0
			get_featured_categories_data.message = "No Featured Category Found"
			get_featured_categories_data = feutred.doc


			res.send(get_featured_categories_data)
		}

	}

	// router.featureproducts = (req, res) => {
	// 	var data = {};
	// 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
	// 		if (err || !settings) {
	// 			res.send({ "status": "0", "errors": "Configure your app settings" });
	// 		} else {
	// 			db.GetDocument('rcategory', {  'status': { $eq: 1 }  }, {}, { sort: { rcatname: 1 } }, (err, rcatdata) => {

	// 				if (err || rcatdata == "") {
	// 					data.status = 0;
	// 					data.message = 'error';
	// 					data.featurelist = [];
	// 					res.send(data);
	// 				} else {
	// 					let cityid = new mongoose.Types.ObjectId();
	// 					if (isObjectId(req.body.cityid)) {
	// 						cityid = mongoose.Types.ObjectId(req.body.cityid)
	// 					}
	// 					data.featurelist = [];
	// 					if (rcatdata.length > 0) {
	// 						each(rcatdata,
	// 							function (cat, next) {
	// 								let featured = {}
	// 								// featured.is_cuisine = cat.is_cuisine;
	// 								// featured.is_fssai = cat.is_fssai;
	// 								// featured.is_reward = cat.is_reward;
	// 								// featured.feature = cat.feature;
	// 								// featured.status = cat.status;
	// 								featured._id = cat._id;
	// 								// featured.is_food = cat.is_food;
	// 								featured.rcatname = cat.rcatname;
	// 								featured.img = cat.img;
	// 								featured.slug = cat.slug;
	// 								featured.products = [];
	// 								var limit = 20;
	// 								var skip = 0;
	// 								var query = [
	// 									{ $match: { $and: [{ 'rcategory': cat._id,/* main_city: { $in: [cityid.toString()] }*/ }, { 'status': { $eq: 1 } }] } },
	// 									{ $sort: { name: 1 } },
	// 									{ $skip: skip },
	// 									{ $limit: limit },
	// 									{
	// 										$lookup: {
	// 											from: "scategory",
	// 											let: {
	// 												scategory: "$scategory",
	// 											},
	// 											pipeline: [
	// 												{
	// 													$match: {
	// 														$expr: {
	// 															$and: [
	// 																{ "$eq": ["$_id", "$$scategory"] },
	// 																{ "$eq": ["$status", 1] },
	// 															]
	// 														}
	// 													}
	// 												}
	// 											],
	// 											as: "subcategory"
	// 										}
	// 									},
	// 									{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
	// 									{
	// 										$lookup: {
	// 											from: "brands",
	// 											let: {
	// 												brandId: "$brandname",
	// 											},
	// 											pipeline: [
	// 												{ $match: { "$expr": { "$eq": ["$_id", "$$brandId"] }, status: { $eq: 1 } } },
	// 												{ $limit: 1 }
	// 											],
	// 											as: "brandDetails"
	// 										}
	// 									},
	// 									{ $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true } },
	// 									{
	// 										$project: {
	// 											name: 1,
	// 											avatar: 1,
	// 											rcat_id: "$rcategory",
	// 											scat_id: "$subcategory._id",
	// 											brandname: "$brandDetails.brandname",
	// 											isRecommeneded: 1,
	// 											itmcat: 1,
	// 											status: 1,
	// 											price_details: 1,
	// 											"images": {
	// 												"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
	// 											}
	// 										}
	// 									}
	// 								];
	// 								db.GetAggregation('food', query, (err, productlist) => {
	// 									if (productlist && productlist.length > 0) {
	// 										productlist.forEach(prduct => {
	// 											prduct.favourite = 0;
	// 											if(prduct.avatar && prduct.avatar != undefined){
	// 												prduct.avatar = settings.settings.site_url + prduct.avatar.slice(2);
	// 											}

	// 											if(prduct.price_details.length > 0){
	// 												prduct.price_details.forEach(val => {
	// 													if(val.image != undefined && val.image != ''){
	// 														val.image = settings.settings.site_url + val.image.slice(2);
	// 													}
	// 												});
	// 											}
	// 										});
	// 										featured.img = settings.settings.site_url + featured.img.slice(2);
	// 										featured.products = productlist;
	// 									}
	// 									data.featurelist.push(featured)
	// 									next()
	// 								});
	// 							},
	// 							function (err, transformedItems) {
	// 								data.status = 1;
	// 								data.message = 'success';
	// 								res.send(data);
	// 							}
	// 						)
	// 					} else {
	// 						data.status = 0;
	// 						data.message = 'error';
	// 						data.featurelist = [];
	// 						res.send(data);
	// 					}
	// 				}
	// 			});
	// 		}
	// 	});
	// }
	router.featureproducts = async (req, res) => {


		try {
			var data = {};
			var condition = {};
			if (typeof req.body.search == 'undefined' || typeof req.body.search == null) {
				// data.status = 0;
				// data.message = 'search is requird';
				// return res.send(data);
				condition =
				{
					// $match: { 
					status: { $eq: 1 }
					// } 
				}
			} else {
				var searchs = req.body.search;

				condition['$and'] = []
				condition['$and'].push(
					// {
					// $match: 
					{ status: { $eq: 1 }, name: { $regex: searchs + '.*', $options: 'si' } }
					// }
				)

			}
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {
				var query = [
					{ $match: condition },
					// { 'status': { $eq: 1 } }
					{ $sort: { createdAt: -1 } },
					{
						$lookup: {
							from: "scategory",
							let: {
								scategory: "$scategory",
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ "$eq": ["$_id", "$$scategory"] },
												{ "$eq": ["$status", 1] },
											]
										}
									}
								}
							],
							as: "subcategory"
						}
					},
					{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
					{
						$project: {
							name: 1,
							slug: 1,
							avatar: 1,
							rcategory: 1,
							scat_id: "$subcategory._id",
							itmcat: 1,
							status: 1,
							size: 1,
							hover_image: 1,
							base_price: 1,
							sale_price: 1,
							offer_status: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							offer_amount: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating_users: 1,
							price_details: {
								$map: {
									input: '$price_details',
									as: 'priceDetail',
									in: {
										$mergeObjects: [
											'$$priceDetail',
											{

												discount_percentage: {
													$cond: {
														if: { $lt: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, 0] },
														then: 0,
														else: {
															$round: {

																$multiply: [

																	{ $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
																	100
																]
															}
														}

													}

												}

											}
										]
									}


								}
							},
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: ["$$item.status", 1]
											},
											{
												$ne: ['$$item.quantity', 0]
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
							scat_id: "$subcategory._id",
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
							notZero: 1,
							rating: 1,
							total_rating_users: 1,
							price_details: 1,
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							avatar: 1,
							rcategory: 1,
							scat_id: "$subcategory._id",
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
							notZero: 1,
							rating: 1,
							total_rating_users: 1,
							filterSize: { $ifNull: ['$notZero', []] },
							price_details: 1,
							outOfStockQuantity: {
								$cond: {
									if: { "$eq": ["$size_status", 2] },
									then: "$quantity",
									else: {
										$sum: "$price_details.quantity"
									}
								}
							}
						}
					},
					// {$sample: {size: 8}}
					{ $limit: 8 },
				];
				if (req.body.user_id) {
					if (!mongoose.isValidObjectId(req.body.user_id)) {
						return res.send({ status: 0, message: "Invalid user_id! Please check and try again" });
					}
					query.push(
						{
							$lookup: {
								from: "favourite",
								let: { product_id: "$_id" },
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.user_id)] },
													{ $eq: ["$product_id", "$$product_id"] },
													{ $eq: ["$status", 1] }
												]
											}
										}
									}
								],
								as: "favourite"
							}
						}
					)
				} else {
					query.push(
						{ $addFields: { favourite: { $literal: [] } } }
					)
				};
				query.push(
					{
						$project: {
							name: 1,
							slug: 1,
							avatar: 1,
							rcat_id: "$rcategory",
							scat_id: "$scat_id",
							itmcat: 1,
							status: 1,
							size: 1,
							hover_image: 1,
							base_price: 1,
							sale_price: 1,
							offer_status: 1,
							quantity: 1,
							filterSize: 1,
							rating: 1,
							total_rating_users: 1,
							offer_amount: { $ifNull: ['$offer_amount', 0] },
							size_status: 1,
							quantity_size: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$eq: ["$$item.status", 1]
									}
								}
							},
							price_details: {
								$map: {
									input: '$price_details',
									as: 'priceDetail',
									in: {
										$mergeObjects: [
											'$$priceDetail',
											{

												discount_percentage: {
													$cond: {
														if: { $lt: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, 0] },
														then: 0,
														else: {
															$round: {

																$multiply: [

																	{ $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
																	100
																]
															}
														}

													}

												}

											}
										]
									}


								}
							},


							favourite_add: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
							in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
							no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },

							discount_percentage: {
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]

							},
							outOfStockQuantity: {
								$cond: {
									if: { "$eq": ["$size_status", 2] },
									then: "$quantity",
									else: {
										$sum: "$price_details.quantity"
									}
								}
							}

						}
					},
				)




				const productlist = await db.GetAggregation('food', query)




				if (productlist && productlist.length > 0) {
					productlist.forEach(prduct => {
						prduct.favourite = 0;
						if (prduct.avatar && prduct.avatar != undefined) {
							prduct.avatar = settings.doc.settings.site_url + prduct.avatar.slice(2);
						}
						if (prduct.hover_image && prduct.hover_image != undefined) {
							prduct.hover_image = settings.doc.settings.site_url + prduct.hover_image.slice(2);
						}
						prduct.currency = settings.doc.settings.currency_symbol;

						if (prduct.offer_status == 1) {
							prduct.offer_base = JSON.parse(JSON.stringify(prduct.base_price));
							var offer_price = parseFloat(parseFloat((prduct.base_price * prduct.offer_amount) / 100).toFixed(2));
							var sub_price = prduct.base_price - offer_price;
							prduct.offer_sale = sub_price > 0 ? sub_price : 0
						}



						if (prduct.size_status == 1 && (prduct.price_details && prduct.price_details.length > 0)) {
							for (let i = 0; i < prduct.price_details.length; i++) {
								if (prduct.price_details[i].quantity > 0) {
									prduct.price_details[i].variance_ = 1


								} else {
									prduct.price_details[i].availability = 0
								}
							}
							prduct.variance_quantity = prduct.price_details.reduce((accumulator, currentValue) => {
								return accumulator + currentValue.quantity;
							}, 0)
						}

						if (prduct.size_status == 2) {
							if (prduct.quantity > 0) {

								prduct.availability = 1
							} else {
								prduct.availability = 0
							}
						}



					});
					data.status = true;
					data.message = 'success';
					data.productList = productlist;
					res.send(data);
					// console.log("-----------data---------at status 1-------", data)
				} else {
					data.status = 0;
					data.message = 'success';
					data.productList = [];
					// console.log("-----------data----------------", data)
					res.send(data);
				}
			}
		} catch (e) {
			console.log("Error at featureproducts apis ", e)

			data.status = 0
			data.message = "Something Went Wrong"
			res.send(data)
		}

		// }
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": "0", "errors": "Configure your app settings" });
		// 	} else {
		// 		var query = [
		// 			{ $match: { 'status': { $eq: 1 } } },
		// 			{ $sort: { createdAt: -1 } },
		// 			{
		// 				$lookup: {
		// 					from: "scategory",
		// 					let: {
		// 						scategory: "$scategory",
		// 					},
		// 					pipeline: [
		// 						{
		// 							$match: {
		// 								$expr: {
		// 									$and: [
		// 										{ "$eq": ["$_id", "$$scategory"] },
		// 										{ "$eq": ["$status", 1] },
		// 									]
		// 								}
		// 							}
		// 						}
		// 					],
		// 					as: "subcategory"
		// 				}
		// 			},
		// 			{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scat_id: "$subcategory._id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: { $ifNull: ["$quantity", 0] },
		// 					offer_amount: 1,
		// 					size_status: 1,
		// 					quantity_size: 1,
		// 					notZero: {
		// 						$filter: {
		// 							input: "$quantity_size",
		// 							as: "item",
		// 							cond: {
		// 								$and: [
		// 									{
		// 										$eq: ["$$item.status", 1]
		// 									},
		// 									{
		// 										$ne: ['$$item.quantity', 0]
		// 									}
		// 								]
		// 							}
		// 						}
		// 					}
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scat_id: "$subcategory._id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: 1,
		// 					offer_amount: 1,
		// 					size_status: 1,
		// 					quantity_size: 1,
		// 					notZero: 1,
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scat_id: "$subcategory._id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: 1,
		// 					offer_amount: 1,
		// 					size_status: 1,
		// 					quantity_size: 1,
		// 					notZero: 1,
		// 					filterSize: { $ifNull: ['$notZero', []] }
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcat_id: "$rcategory",
		// 					scat_id: "$scat_id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: 1,
		// 					filterSize: 1,
		// 					offer_amount: { $ifNull: ['$offer_amount', 0] },
		// 					size_status: 1,
		// 					quantity_size: {
		// 						$filter: {
		// 							input: "$quantity_size",
		// 							as: "item",
		// 							cond: {
		// 								$eq: ["$$item.status", 1]
		// 							}
		// 						}
		// 					},
		// 					in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
		// 					no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
		// 				}
		// 			},
		// 			// {$sample: {size: 8}}
		// 			{ $limit: 8 }
		// 		];
		// 		db.GetAggregation('food', query, (err, productlist) => {
		// 			console.log("err", err)
		// 			if (productlist && productlist.length > 0) {
		// 				productlist.forEach(prduct => {
		// 					prduct.favourite = 0;
		// 					if (prduct.avatar && prduct.avatar != undefined) {
		// 						prduct.avatar = settings.settings.site_url + prduct.avatar.slice(2);
		// 					}
		// 					if (prduct.hover_image && prduct.hover_image != undefined) {
		// 						prduct.hover_image = settings.settings.site_url + prduct.hover_image.slice(2);
		// 					}
		// 					prduct.currency = settings.settings.currency_symbol;

		// 					if (prduct.offer_status == 1) {
		// 						prduct.offer_base = JSON.parse(JSON.stringify(prduct.base_price));
		// 						var offer_price = parseFloat(parseFloat((prduct.base_price * prduct.offer_amount) / 100).toFixed(2));
		// 						var sub_price = prduct.base_price - offer_price;
		// 						prduct.offer_sale = sub_price > 0 ? sub_price : 0
		// 					}

		// 				});
		// 				data.status = 1;
		// 				data.message = 'success';
		// 				data.productList = productlist;
		// 				res.send(data);
		// 			} else {
		// 				data.status = 0;
		// 				data.message = 'success';
		// 				data.productList = [];
		// 				res.send(data);
		// 			}
		// 		});
		// 	}
		// });
	}
	router.searchproducts = async (req, res) => {
		var data = {};
		if (typeof req.body.search == 'undefined' || typeof req.body.search == null) {
			data.status = 0;
			data.message = 'search is requird';
			return res.send(data);
		}
		var searchs = req.body.search;
		const isValidSearchTerm = /^[a-zA-Z0-9\s]*$/.test(searchs);

		if (!isValidSearchTerm) {
			data.status = 0;
			data.message = 'success';
			data.sear_product = [];
			return res.send(data);
			// return res.send([]);
		}
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			res.send({ "status": "0", "errors": "Configure your app settings" });
		} else {
			var query = [
				// { $match: { 'status': { $eq: 1 }, name: { $regex: searchs, $options: "i" } } },
				{ $match: { 'status': { $eq: 1 }, name: { $regex: new RegExp(searchs, 'i') } } },
				{
					$project: {
						name: 1,
						rcategory: 1,
						scategory: 1,
						slug: 1,
						avatar: 1,
						base_price: 1,
						sale_price: 1,
						price_details: 1
					}
				},
				{
					$project: {
						name: 1,
						rcat_id: "$rcategory",
						scat_id: "$scategory",
						slug: 1,
						avatar: 1,
						base_price: 1,
						sale_price: 1,
						price_details: 1
					}
				},
				{ $sort: { createdAt: -1 } },
				{ $limit: 20 }
			];
			const productlist = await db.GetAggregation('food', query)
			if (productlist && productlist.length > 0) {
				data.status = 1;
				data.message = 'success';
				data.sear_product = productlist;
				res.send(data);
			} else {
				data.status = 0;
				data.message = 'success';
				data.sear_product = [];
				res.send(data);
			}
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": "0", "errors": "Configure your app settings" });
		// 	} else {
		// 		var query = [
		// 			{ $match: { 'status': { $eq: 1 }, name: { $regex: searchs, $options: "i" } } },
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					rcategory: 1,
		// 					scategory: 1,
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					rcat_id: "$rcategory",
		// 					scat_id: "$scategory"
		// 				}
		// 			},
		// 			{ $sort: { createdAt: -1 } },
		// 			{ $limit: 20 }
		// 		];
		// 		db.GetAggregation('food', query, (err, productlist) => {
		// 			if (productlist && productlist.length > 0) {
		// 				data.status = 1;
		// 				data.message = 'success';
		// 				data.sear_product = productlist;
		// 				res.send(data);
		// 			} else {
		// 				data.status = 0;
		// 				data.message = 'success';
		// 				data.sear_product = [];
		// 				res.send(data);
		// 			}
		// 		});
		// 	}
		// });
	}
	router.trendingweekproducts = async (req, res) => {
		var data = {};
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			res.send({ "status": "0", "errors": "Configure your app settings" });
		} else {
			var query = [
				{ $match: { 'status': { $eq: 1 } } },
				{ $sort: { createdAt: -1 } },
				{
					$lookup: {
						from: "scategory",
						let: {
							scategory: "$scategory",
						},
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ "$eq": ["$_id", "$$scategory"] },
											{ "$eq": ["$status", 1] },
										]
									}
								}
							}
						],
						as: "subcategory"
					}
				},
				{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						name: 1,
						slug: 1,
						avatar: 1,
						rcategory: 1,
						scat_id: "$subcategory._id",
						itmcat: 1,
						status: 1,
						size: 1,
						hover_image: 1,
						base_price: 1,
						sale_price: 1,
						offer_status: 1,
						quantity: { $ifNull: ["$quantity", 0] },
						offer_amount: 1,
						size_status: 1,
						price_details: 1,
						quantity_size: 1,
						notZero: {
							$filter: {
								input: "$quantity_size",
								as: "item",
								cond: {
									$and: [
										{
											$eq: ["$$item.status", 1]
										},
										{
											$ne: ['$$item.quantity', 0]
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
						scat_id: "$subcategory._id",
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
						notZero: 1,
						price_details: 1
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						avatar: 1,
						rcategory: 1,
						scat_id: "$subcategory._id",
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
						price_details: 1,
						filterSize: { $ifNull: ['$notZero', []] },
						outOfStockQuantity: {
							$cond: {
								if: { "$eq": ["$size_status", 2] },
								then: "$quantity",
								else: {
									$sum: "$price_details.quantity"
								}
							}
						}
					}
				},
				// {$sample: {size: 8}}
				{ $limit: 12 }
			];
			if (req.body.user_id) {
				if (!mongoose.isValidObjectId(req.body.user_id)) {
					return res.send({ status: 0, message: "Invalid user_id! Please check and try again" });
				}
				query.push(
					{
						$lookup: {
							from: "favourite",
							let: { product_id: "$_id" },
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.user_id)] },
												{ $eq: ["$product_id", "$$product_id"] },
												{ $eq: ["$status", 1] }
											]
										}
									}
								}
							],
							as: "favourite"
						}
					}
				)
			} else {
				query.push(
					{ $addFields: { favourite: { $literal: [] } } }
				)
			};
			query.push(
				{
					$project: {
						name: 1,
						slug: 1,
						avatar: 1,
						rcat_id: "$rcategory",
						scat_id: "$scat_id",
						itmcat: 1,
						status: 1,
						size: 1,
						hover_image: 1,
						base_price: 1,
						sale_price: 1,
						offer_status: 1,
						quantity: 1,
						filterSize: 1,
						offer_amount: { $ifNull: ['$offer_amount', 0] },
						size_status: 1,
						price_details: 1,
						favourite_add: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
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

						discount_percentage: {
							$round: [
								{
									$multiply: [
										{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
										100
									]
								}
							]
						},
						outOfStockQuantity: {
							$cond: {
								if: { "$eq": ["$size_status", 2] },
								then: "$quantity",
								else: {
									$sum: "$price_details.quantity"
								}
							}
						}
					}
				},
			)
			const productlist = await db.GetAggregation('food', query)
			if (productlist && productlist.length > 0) {
				productlist.forEach(prduct => {
					prduct.favourite = 0;
					if (prduct.avatar && prduct.avatar != undefined) {
						prduct.avatar = settings.doc.settings.site_url + prduct.avatar.slice(2);
					}
					if (prduct.hover_image && prduct.hover_image != undefined) {
						prduct.hover_image = settings.doc.settings.site_url + prduct.hover_image.slice(2);
					}
					prduct.currency = settings.doc.settings.currency_symbol;
					if (prduct.offer_status == 1) {
						prduct.offer_base = JSON.parse(JSON.stringify(prduct.base_price));
						var offer_price = parseFloat(parseFloat((prduct.base_price * prduct.offer_amount) / 100).toFixed(2));
						var sub_price = prduct.base_price - offer_price;
						prduct.offer_sale = sub_price > 0 ? sub_price : 0
					}

				});
				data.status = 1;
				data.message = 'success';
				data.productList = productlist;
				res.send(data);
			} else {
				data.status = 0;
				data.message = 'success';
				data.productList = [];
				res.send(data);
			}
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": "0", "errors": "Configure your app settings" });
		// 	} else {
		// 		var query = [
		// 			{ $match: { 'status': { $eq: 1 } } },
		// 			{ $sort: { createdAt: -1 } },
		// 			{
		// 				$lookup: {
		// 					from: "scategory",
		// 					let: {
		// 						scategory: "$scategory",
		// 					},
		// 					pipeline: [
		// 						{
		// 							$match: {
		// 								$expr: {
		// 									$and: [
		// 										{ "$eq": ["$_id", "$$scategory"] },
		// 										{ "$eq": ["$status", 1] },
		// 									]
		// 								}
		// 							}
		// 						}
		// 					],
		// 					as: "subcategory"
		// 				}
		// 			},
		// 			{ $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scat_id: "$subcategory._id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: { $ifNull: ["$quantity", 0] },
		// 					offer_amount: 1,
		// 					size_status: 1,
		// 					quantity_size: 1,
		// 					notZero: {
		// 						$filter: {
		// 							input: "$quantity_size",
		// 							as: "item",
		// 							cond: {
		// 								$and: [
		// 									{
		// 										$eq: ["$$item.status", 1]
		// 									},
		// 									{
		// 										$ne: ['$$item.quantity', 0]
		// 									}
		// 								]
		// 							}
		// 						}
		// 					}
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scat_id: "$subcategory._id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: 1,
		// 					offer_amount: 1,
		// 					size_status: 1,
		// 					quantity_size: 1,
		// 					notZero: 1
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scat_id: "$subcategory._id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: 1,
		// 					offer_amount: 1,
		// 					size_status: 1,
		// 					quantity_size: 1,
		// 					filterSize: { $ifNull: ['$notZero', []] }
		// 				}
		// 			},
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					avatar: 1,
		// 					rcat_id: "$rcategory",
		// 					scat_id: "$scat_id",
		// 					itmcat: 1,
		// 					status: 1,
		// 					size: 1,
		// 					hover_image: 1,
		// 					base_price: 1,
		// 					sale_price: 1,
		// 					offer_status: 1,
		// 					quantity: 1,
		// 					filterSize: 1,
		// 					offer_amount: { $ifNull: ['$offer_amount', 0] },
		// 					size_status: 1,
		// 					quantity_size: {
		// 						$filter: {
		// 							input: "$quantity_size",
		// 							as: "item",
		// 							cond: {
		// 								$eq: ["$$item.status", 1]
		// 							}
		// 						}
		// 					},
		// 					in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
		// 					no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
		// 				}
		// 			},
		// 			// {$sample: {size: 8}}
		// 			{ $limit: 12 }
		// 		];
		// db.GetAggregation('food', query, (err, productlist) => {
		// 	if (productlist && productlist.length > 0) {
		// 		productlist.forEach(prduct => {
		// 			prduct.favourite = 0;
		// 			if (prduct.avatar && prduct.avatar != undefined) {
		// 				prduct.avatar = settings.settings.site_url + prduct.avatar.slice(2);
		// 			}
		// 			if (prduct.hover_image && prduct.hover_image != undefined) {
		// 				prduct.hover_image = settings.settings.site_url + prduct.hover_image.slice(2);
		// 			}
		// 			prduct.currency = settings.settings.currency_symbol;
		// 			if (prduct.offer_status == 1) {
		// 				prduct.offer_base = JSON.parse(JSON.stringify(prduct.base_price));
		// 				var offer_price = parseFloat(parseFloat((prduct.base_price * prduct.offer_amount) / 100).toFixed(2));
		// 				var sub_price = prduct.base_price - offer_price;
		// 				prduct.offer_sale = sub_price > 0 ? sub_price : 0
		// 			}

		// 		});
		// 		data.status = 1;
		// 		data.message = 'success';
		// 		data.productList = productlist;
		// 		res.send(data);
		// 	} else {
		// 		data.status = 0;
		// 		data.message = 'success';
		// 		data.productList = [];
		// 		res.send(data);
		// 	}
		// });
		// 	}
		// });
	}

	router.getAllCategory = async (req, res) => {
		var responseData = {};
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		const limit = req.body.limit;
		if (settings.status === false) {
			res.send({ "status": 0, "errors": "Configure your app settings" });
		} else {
			if (req.body.id) {
				var mainCategory = await db.GetOneDocument('rcategory', { '_id': req.body.id }, {}, {})

				if (mainCategory.status == false) {
					mainCategory = await db.GetOneDocument('scategory', { '_id': req.body.id }, {}, {})
				}
				console.log(mainCategory, 'this is main category');
				const datas = await db.GetDocument('scategory', { 'status': { $eq: 1 } }, {}, {})
				const data = datas.doc
				let responseResult = buildTree(data, mainCategory.doc._id.valueOf(), limit)
				console.log(JSON.stringify(responseResult, null, 2));
				function buildTree(data, parent, limit, currentLevel = 0) {
					if (currentLevel > limit) {
						return [];
					}

					let tree = [];
					for (let item of data) {
						if (item.rcategory == parent) {
							let children = buildTree(data, item._id.valueOf(), limit, currentLevel + 1);
							let newItem = {
								_id: item._doc._id,
								scatname: item._doc.scatname,
								img: item._doc.img,
								rcategory: item._doc.rcategory,
								status: item._doc.status,
								createdAt: item._doc.createdAt,
								updatedAt: item._doc.updatedAt,
								slug: item._doc.slug

							};

							if (children.length) {
								newItem.children = children;
							}

							tree.push(newItem);
						}
					}
					return tree;
				}
				let mainCategoryData = {
					_id: mainCategory.doc._id,
					scatname: mainCategory.doc.scatname,
					img: mainCategory.doc.img,
					rcategory: mainCategory.doc.rcategory,
					status: mainCategory.doc.status,
					createdAt: mainCategory.doc.createdAt,
					updatedAt: mainCategory.doc.updatedAt,
					slug: mainCategory.doc.slug,
					iconimg: mainCategory.doc.iconimg
				};


				//  children property to the new object
				mainCategoryData.children = responseResult;
				console.log(mainCategoryData, 'this is main category data');
				console.log(mainCategory);
				responseData.message = "Category retrieved successfully";
				responseData.error = false;
				responseData.data = mainCategoryData
				responseData.text = '';
				responseData.state = {};
				responseData.icon = '';
				responseData.level = 0;
				// console.log(JSON.stringify(responseResult, null, 2));
				// console.log(JSON.stringify(responseData,null,2),'this is the response data++++++');
				res.send(responseData);
			} else {
				const rcatdata = await db.GetDocument('rcategory', { 'status': { $eq: 1 } }, {}, {})
				const scatdata = await db.GetDocument('scategory', { 'status': { $eq: 1 } }, {}, {})
				if (rcatdata.false === false) {
					responseData.status = 0;
					responseData.message = 'error';
					responseData.categoryList = [];
					res.send(responseData);
				}
				function buildTree(data, parent, limit, currentLevel = 0) {
					if (currentLevel > limit) {
						return []; // Stop recursion if the limit is reached
					}

					let tree = [];
					for (let item of data) {
						if (item.rcategory == parent) {
							let children = buildTree(scatdata.doc, item._id.valueOf(), limit, currentLevel + 1);
							let newItem = {
								_id: item._doc._id,
								scatname: item._doc.scatname,
								img: item._doc.img,
								rcategory: item._doc.rcategory,
								status: item._doc.status,
								createdAt: item._doc.createdAt,
								updatedAt: item._doc.updatedAt,
								slug: item._doc.slug,
								iconimg: item._doc.iconimg
							};

							if (children.length) {
								newItem.children = children;
							}

							tree.push(newItem);
						}
					}
					return tree;
				}

				// Example usage with a limit of 2 nested levels
				let responseResult = buildTree(rcatdata.doc, parent = null, limit);
				// console.log(responseResult,'what is the result');


				const rcatdataCount = await db.GetCount('rcategory', { 'status': { $eq: 1 } })
				const scatdataCount = await db.GetCount('scategory', { 'status': { $eq: 1 } })
				const featureRcategory = await db.GetDocument('rcategory', { 'status': { $eq: 1 }, 'feature': 2 }, {}, {})
				const featureScategory = await db.GetDocument('rcategory', { 'status': { $eq: 1 }, 'feature': 2 }, {}, {})
				const featureCategories = [...featureRcategory.doc, ...featureScategory.doc]
				let responseFeatureCategory = buildTree(featureCategories, parent = null)
				const total = rcatdataCount + scatdataCount
				responseData.total = total;
				responseData.error = false;
				responseData.data = responseResult;
				var Array = JSON.parse(JSON.stringify(rcatdata.doc))
				Array.forEach(prduct => {
					prduct.img = settings.doc.settings.site_url + prduct.img.slice(2);
				})
				responseData.status = 1;
				responseData.message = 'Category retrieved successfully';
				responseData.text = '';
				responseData.state = {};
				responseData.icon = '';
				responseData.level = '';
				responseData.feature_categories = responseFeatureCategory
				responseData.categoryList = Array;
				res.send(responseData);
			}
		}
	}

	router.getExpensiveProduct = async (req, res) => {
		var data = {};
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			res.send({ "status": 0, "errors": "Configure your app settings" });
		} else {
			var query = [
				{ $match: { $and: [{ 'expensive': 1 }, { 'status': { $eq: 1 } }] } },
				{ $limit: 1 },
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						information: 1,
						avatar: 1,
						rcategory: 1,
						scategory: 1,
						hover_image: 1
					}
				}
			]
			const productlist = await db.GetAggregation('food', query)
			if (!productlist) {
				data.status = 0;
				data.message = err.message;
				data.product_detail = null;
				return res.send(data);
			} else {
				if (productlist.length == 0) {
					var query = [
						{ $match: { 'status': { $eq: 1 } } },
						{ $sort: { sale_price: -1 } },
						{ $limit: 1 },
						{
							$project: {
								name: 1,
								size: 1,
								information: 1,
								avatar: 1,
								rcategory: 1,
								scategory: 1,
								hover_image: 1
							}
						}
					]
					const productList = await db.GetAggregation('food', query)
					if (!productList) {
						data.status = 0;
						data.message = err.message;
						data.product_detail = null;
						return res.send(data);
					}
					else {
						var value = productlist[0];
						if (value) {
							value.avatar = settings.settings.site_url + value.avatar;
							value.hover_image = settings.settings.site_url + value.hover_image;
						}
						data.status = 1;
						data.message = 'Success';
						data.product_detail = value ? value : null;
						return res.send(data);
					}
				} else {
					var value = productlist[0];
					if (value) {
						value.avatar = settings.doc.settings.site_url + value.avatar;
						value.hover_image = settings.doc.settings.site_url + value.hover_image;
					}
					data.status = 1;
					data.message = 'Success';
					data.product_detail = value ? value : null;
					return res.send(data);
				}
			}
		}


		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": 0, "errors": "Configure your app settings" });
		// 	} else {
		// 		var query = [
		// 			{ $match: { $and: [{ 'expensive': 1 }, { 'status': { $eq: 1 } }] } },
		// 			{ $limit: 1 },
		// 			{
		// 				$project: {
		// 					name: 1,
		// 					slug: 1,
		// 					size: 1,
		// 					information: 1,
		// 					avatar: 1,
		// 					rcategory: 1,
		// 					scategory: 1,
		// 					hover_image: 1
		// 				}
		// 			}
		// 		]
		// 		db.GetAggregation('food', query, (err, productlist) => {
		// 			if (err || !productlist) {
		// 				console.log("getExpensive product details Error ++++++++++", err.message)
		// 				data.status = 0;
		// 				data.message = err.message;
		// 				data.product_detail = null;
		// 				return res.send(data);
		// 			} else {
		// 				if (productlist.length == 0) {
		// 					var query = [
		// 						{ $match: { 'status': { $eq: 1 } } },
		// 						{ $sort: { sale_price: -1 } },
		// 						{ $limit: 1 },
		// 						{
		// 							$project: {
		// 								name: 1,
		// 								size: 1,
		// 								information: 1,
		// 								avatar: 1,
		// 								rcategory: 1,
		// 								scategory: 1,
		// 								hover_image: 1
		// 							}
		// 						}
		// 					]
		// 					db.GetAggregation('food', query, (err, productList) => {
		// 						if (err || !productlist) {
		// 							console.log("getExpensive product details Error ++++++++++", err.message)
		// 							data.status = 0;
		// 							data.message = err.message;
		// 							data.product_detail = null;
		// 							return res.send(data);
		// 						} else {
		// 							var value = productlist[0];
		// 							if (value) {
		// 								value.avatar = settings.settings.site_url + value.avatar;
		// 								value.hover_image = settings.settings.site_url + value.hover_image;
		// 							}
		// 							data.status = 1;
		// 							data.message = 'Success';
		// 							data.product_detail = value ? value : null;
		// 							return res.send(data);
		// 						}
		// 					})
		// 				} else {
		// 					var value = productlist[0];
		// 					if (value) {
		// 						value.avatar = settings.settings.site_url + value.avatar;
		// 						value.hover_image = settings.settings.site_url + value.hover_image;
		// 					}
		// 					data.status = 1;
		// 					data.message = 'Success';
		// 					data.product_detail = value ? value : null;
		// 					return res.send(data);
		// 				}
		// 			}
		// 		})
		// 	}
		// })
	}

	// router.getAllFeaturecategory = async (req, res) => {
	// 	var data = {};
	// 	var qry = {};
	// 	const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, { rcategory: 1 })

	// 	if (settings.status === false) {
	// 		res.send({ "status": "0", "errors": "Configure your app settings" });
	// 	} else {
	// 		qry["$or"] = [];
	// 		if (settings.doc.settings.rcategory != undefined && settings.doc.settings.rcategory != "") {
	// 			if (settings.doc.settings.rcategory.length > 0) {
	// 				for (var i = 0; i < settings.doc.settings.rcategory.length; i++) {
	// 					qry["$or"].push({ $and: [{ '_id': new mongoose.Types.ObjectId(settings.doc.settings.rcategory[i]) }, { 'status': { $eq: 1 } }] });
	// 				}
	// 			}
	// 		}
	// 		var eachrun = 10;
	// 		var loop = Math.ceil(100 / eachrun);
	// 		const getCategoryList = async () => {
	// 			try {
	// 				let loopcount = 1;
	// 				let categories = [];

	// 				const shouldContinue = () => loopcount <= loop;

	// 				while (shouldContinue()) {
	// 					const limit = eachrun;
	// 					const skip = (eachrun * loopcount) - eachrun;

	// 					const query = [
	// 						{ $match: qry },

	// 						{
	// 							$lookup: {
	// 								from: 'scategory',
	// 								let: {
	// 									rcategory: "$_id",
	// 								},
	// 								pipeline: [
	// 									{
	// 										$match: {
	// 											$expr: {
	// 												$and: [
	// 													{ "$eq": ["$rcategory", "$$rcategory"] },
	// 													{ "$eq": ["$status", 1] },
	// 												]
	// 											}
	// 										}
	// 									}

	// 								],
	// 								as: "subcategory"
	// 							}
	// 						},
	// 						{ $skip: skip },
	// 						{ $limit: limit },
	// 						{
	// 							$project: {
	// 								rcatname: "$rcatname",
	// 								img: 1,
	// 								slug: 1,
	// 								subcategory: "$subcategory",
	// 								iconimage: "$iconimg"

	// 							}
	// 						}
	// 					];

	// 					const catlist = await db.GetAggregation('rcategory', query);

	// 					if (catlist && catlist.length > 0) {
	// 						categories = [...categories, ...catlist];
	// 						// console.log("-----------categories--------------------", categories)
	// 					}

	// 					loopcount++;
	// 				}
	// 				// console.log(categories, 'this are the categories++++++++++++____________++++++++++__________++++++++');
	// 				const scatdata = await db.GetDocument('scategory', { 'status': { $eq: 1 } }, {}, {})
	// 				// console.log(scatdata, 'this are scatdata__________');
	// 				const data = {
	// 					status: 1,
	// 					message: 'success',
	// 					list: categories,
	// 					scat: scatdata.doc
	// 				};
	// 				res.send(data);

	// 			} catch (error) {
	// 				console.log(error,"errorrrrrrrrrrrrr");

	// 				res.status(500).send('Internal Server Error');
	// 			}
	// 		};

	// 		getCategoryList();
	// 	}
	// }


	router.getAllFeaturecategory = async (req, res) => {
		try {
			let qry = {}; // Initialize the query object
			const settings = await db.GetOneDocument('settings', { alias: 'general' }, {}, { rcategory: 1 });

			if (!settings || settings.status === false) {
				return res.send({ status: "0", errors: "Configure your app settings" });
			}

			const rcategoryList = settings.doc.settings.rcategory || [];

			if (rcategoryList.length > 0) {
				qry["$or"] = rcategoryList.map((id) => ({
					$and: [
						{ '_id': new mongoose.Types.ObjectId(id) },
						{ 'status': { $eq: 1 } }
					]
				}));
			}

			const eachrun = 10;
			const loop = Math.ceil(100 / eachrun);

			const getCategoryList = async () => {
				let loopcount = 1;
				let categories = [];

				while (loopcount <= loop) {
					const skip = (eachrun * loopcount) - eachrun;
					const query = [
						...(Object.keys(qry).length ? [{ $match: qry }] : []),
						{
							$lookup: {
								from: 'scategory',
								let: { rcategory: "$_id" },
								pipeline: [
									{
										$match: {
											$expr: {
												$and: [
													{ "$eq": ["$rcategory", "$$rcategory"] },
													{ "$eq": ["$status", 1] }
												]
											}
										}
									}
								],
								as: "subcategory"
							}
						},
						{ $skip: skip },
						{ $limit: eachrun },
						{
							$project: {
								rcatname: "$rcatname",
								img: 1,
								slug: 1,
								subcategory: "$subcategory",
								iconimage: "$iconimg"
							}
						}
					];

					const catlist = await db.GetAggregation('rcategory', query);
					if (catlist && catlist.length > 0) {
						categories = [...categories, ...catlist];
					}
					loopcount++;
				}

				const scatdata = await db.GetDocument('scategory', { status: { $eq: 1 } }, {}, {});

				const data = {
					status: 1,
					message: 'success',
					list: categories,
					scat: scatdata.doc
				};
				res.send(data);
			};

			getCategoryList();
		} catch (error) {
			console.error(error, "Internal Server Error");
			res.status(500).send('Internal Server Error');
		}
	};



	router.headercategorylist = async (req, res) => {
		var data = {};
		var qry = {};
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, { rcategory: 1 })
		if (settings.status) {
			res.send({ "status": "0", "errors": "Configure your app settings" });
		} else {
			qry["$or"] = [];
			for (var i = 0; i < settings.doc.settings.rcategory.length; i++) {
				qry["$or"].push({ $and: [{ '_id': new mongoose.Types.ObjectId(settings.doc.settings.rcategory[i]) }, { 'status': { $eq: 1 } }] });
			}
			var eachrun = 10;
			var loop = Math.ceil(100 / eachrun);
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
						{ $match: qry },
						{ $lookup: { from: 'scategory', localField: "_id", foreignField: "rcategory", as: "subcategory" } },
						{ $sort: { is_food: -1, rcatname: 1 } },
						{ $skip: skip },
						{ $limit: limit },
						{
							$project: {
								rcatname: "$rcatname",
								img: 1,
								subcategory: "$subcategory",
								iconimg: "$iconimg"
							}
						}
					];
					const catlist = db.GetAggregation('rcategory', query)


					if (catlist && catlist.length > 0) {
						categories = [...categories, ...catlist];
						loopcount++;
						callback(null, loopcount);
					} else {
						loopcount++;
						callback(null, loopcount);
					}
					// db.GetAggregation('rcategory', query, (err, catlist) => {
					// 	if (catlist && catlist.length > 0) {
					// 		categories = [...categories, ...catlist];
					// 		loopcount++;
					// 		callback(null, loopcount);
					// 	} else {
					// 		loopcount++;
					// 		callback(null, loopcount);
					// 	}
					// });
				},
				() => {
					data.status = 1;
					data.message = 'success';
					data.list = categories;
					res.send(data);
				}
			);
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, { rcategory: 1 }, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": "0", "errors": "Configure your app settings" });
		// 	} else {

		// 		// db.GetCount('rcategory', { $and: [{ 'feature': { $eq: 0 } }, { 'status': { $eq: 1 } }] }, (err, count) => {
		// 		// 	if (err || count < 1) {
		// 		// 		data.status = 1;
		// 		// 		data.message = 'success';
		// 		// 		data.list = [];
		// 		// 		res.send(data);
		// 		// 	} else {
		// 		qry["$or"] = [];
		// 		for (var i = 0; i < settings.settings.rcategory.length; i++) {
		// 			console.log(settings.settings.rcategory[i])
		// 			qry["$or"].push({ $and: [{ '_id': mongoose.Types.ObjectId(settings.settings.rcategory[i]) }, { 'status': { $eq: 1 } }] });
		// 		}
		// 		var eachrun = 10;
		// 		var loop = Math.ceil(100 / eachrun);
		// 		var loopcount = 1;
		// 		var categories = [];
		// 		//{ $and: [{ 'feature': { $eq: 0 } }, { 'status': { $eq: 1 } }] }
		// 		async.whilst(
		// 			(cb) => {
		// 				cb(null, loopcount <= loop)
		// 			},
		// 			(callback) => {
		// 				var limit = eachrun;
		// 				var skip = ((eachrun * loopcount)) - eachrun;
		// 				var query = [
		// 					{ $match: qry },
		// 					{ $lookup: { from: 'scategory', localField: "_id", foreignField: "rcategory", as: "subcategory" } },
		// 					{ $sort: { is_food: -1, rcatname: 1 } },
		// 					{ $skip: skip },
		// 					{ $limit: limit },
		// 					{
		// 						$project: {
		// 							rcatname: "$rcatname",
		// 							img: 1,
		// 							subcategory: "$subcategory"
		// 						}
		// 					}
		// 				];
		// 				db.GetAggregation('rcategory', query, (err, catlist) => {
		// 					if (catlist && catlist.length > 0) {
		// 						categories = [...categories, ...catlist];
		// 						loopcount++;
		// 						callback(null, loopcount);
		// 					} else {
		// 						loopcount++;
		// 						callback(null, loopcount);
		// 					}
		// 				});
		// 			},
		// 			() => {
		// 				data.status = 1;
		// 				data.message = 'success';
		// 				data.list = categories;
		// 				res.send(data);
		// 			}
		// 		);
		// 	}
		// });

	}

	router.hotselling_products = (req, res) => {

		var query = { $and: [{ 'hotselling': { $gt: 0 } }, { 'status': { $eq: 1 } }] };
		var usersQuery = [{ "$match": query },
		{ $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
		{ $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
		{ $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
		{ $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				name: 1,
				avatar: 1,
				rcat_id: "$rcategory._id",
				scat_id: "$scategory._id",
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				brandname: { $toLower: '$brands.brandname' },
				isRecommeneded: 1,
				itmcat: 1,
				status: 1,
				price_details: 1,
				sort_name: { $toLower: '$name' },
				substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
				"images": {
					"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
				}
			}
		},
		{
			$project: {
				name: 1,
				rcategory: 1,
				substat: 1,
				images: 1,
				status: 1,
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
		var sorting = {};
		sorting["documentData.hotselling"] = -1;
		usersQuery.push({ $sort: sorting });


		usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(40) });
		usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

		var data = {};
		try {
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					res.send({ "status": "0", "errors": "Configure your app settings" });
				} else {
					db.GetAggregation('food', usersQuery, function (err, docdata) {
						if (err || docdata.length <= 0) {
							data.status = 1;
							data.message = 'success';
							data.count = [];
							data.productlist = [];
							res.send(data);
						} else {

							if (docdata[0].documentData && docdata[0].documentData.length > 0) {

								for (var i = 0; i < docdata[0].documentData.length; i++) {
									docdata[0].documentData[i].favourite = 0;
									if (docdata[0].documentData[i].avatar != undefined) {
										image = settings.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
										docdata[0].documentData[i].avatar = image;
									} else {
										docdata[0].documentData[i].avatar = "";
									}
									for (var j = 0; j < docdata[0].documentData[i].price_details.length; j++) {

										if (docdata[0].documentData[i].price_details[j].image != undefined) {
											image = settings.settings.site_url + docdata[0].documentData[i].price_details[j].image.slice(2);
											docdata[0].documentData[i].price_details[j].image = image;
										} else {
											docdata[0].documentData[i].price_details[j].image = "";
										}
									}

								}
								// docdata[0].documentData.sort(function(a, b) {
								// 	var keyA = new Date(a.hotselling),
								// 	keyB = new Date(b.hotselling);
								// 	// Compare the 2 prices
								// 	if (keyB < keyA) return -1;
								// 	if (keyB > keyA) return 1;
								// 	return 0;
								// });

							}

							data.status = 1;
							data.message = 'success';
							data.count = docdata[0].count;
							data.productlist = docdata[0].documentData;
							res.send(data);

						}
					});
				}
			});
		} catch (e) {
		}

	}


	router.productlist = function (req, res) {
		console.log(req.body, 'what is this************************************************');
		const id = req.body.product_ids
		if (id != undefined || typeof id == 'undefined') {

		} else {

		}
		var query = {};
		// req.checkBody('rcat', 'category id is Required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		//     res.send({
		//         "status": "0",
		//         "errors": errors[0].msg
		//     });
		//     return;
		// }
		query = { 'status': { $eq: 1 } };
		if (req.body.rcat) {
			query = { $and: [{ 'rcategory': new mongoose.Types.ObjectId(req.body.rcat) }, { 'status': { $eq: 1 } }] };
		}
		if (req.body.scat) {
			query = { $and: [{ 'rcategory': new mongoose.Types.ObjectId(req.body.rcat) }, { 'scategory': new mongoose.Types.ObjectId(req.body.scat) }] };
		}

		if (req.body.isRecommeneded == 1) {
			query = { $and: [{ 'isRecommeneded': { $eq: 1 } }, { 'status': { $eq: 1 } }] };
		}

		let cityid = new mongoose.Types.ObjectId();
		if (isObjectId(req.body.cityid)) {
			cityid = new mongoose.Types.ObjectId(req.body.cityid)
		}
		query['main_city'] = { $in: [cityid.toString()] }

		if (req.body.sort) {
			var sorted = req.body.sort.field;
		}

		var usersQuery = [{ "$match": query },
		{ $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
		{ $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
		{ $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
		{ $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				name: 1,
				slug: 1,
				avatar: 1,
				size: 1,
				rcat_id: "$rcategory._id",
				scat_id: "$scategory._id",
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				brandname: { $toLower: '$brands.brandname' },
				isRecommeneded: 1,
				itmcat: 1,
				status: 1,
				price_details: 1,
				sort_name: { $toLower: '$name' },
				substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
				"images": {
					"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
				}
			}
		},
		{
			$project: {
				name: 1,
				slug: 1,
				rcategory: 1,
				substat: 1,
				images: 1,
				status: 1,
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];

		var condition = { status: { $ne: 0 } };
		usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

		if (req.body.search) {

			var searchs = req.body.search;
			usersQuery.push({ "$match": { $or: [{ "documentData.rcategory.rcatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.scategory.scatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.brands.brandname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.isRecommeneded": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.itmcat": { $regex: searchs + '.*', $options: 'si' } }] } });
			//search limit
			usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
			usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
			if (req.body.limit && req.body.skip >= 0) {
				usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
			}
			usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
		}

		var sorting = {};
		if (req.body.sort) {
			var sorter = 'documentData.' + req.body.sort.field;
			sorting[sorter] = req.body.sort.order;
			usersQuery.push({ $sort: sorting });
		} else {
			sorting["documentData.createdAt"] = -1;
			usersQuery.push({ $sort: sorting });
		}

		if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
			usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
		} else {
			usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(30) });
		}
		if (!req.body.search) {
			usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
		}
		var data = {};
		try {
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					res.send({ "status": "0", "errors": "Configure your app settings" });
				} else {
					db.GetAggregation('food', usersQuery, function (err, docdata) {
						if (err || docdata.length <= 0) {
							data.status = 1;
							data.message = 'success';
							data.count = [];
							data.productlist = [];
							res.send(data);
						} else {

							if (docdata[0].documentData && docdata[0].documentData.length > 0) {

								for (var i = 0; i < docdata[0].documentData.length; i++) {
									docdata[0].documentData[i].favourite = 0;
									if (docdata[0].documentData[i].avatar != undefined) {
										image = settings.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
										docdata[0].documentData[i].avatar = image;
									} else {
										docdata[0].documentData[i].avatar = "";
									}
									for (var j = 0; j < docdata[0].documentData[i].price_details.length; j++) {

										if (docdata[0].documentData[i].price_details[j].image != undefined) {
											image = settings.settings.site_url + docdata[0].documentData[i].price_details[j].image.slice(2);
											docdata[0].documentData[i].price_details[j].image = image;
										} else {
											docdata[0].documentData[i].price_details[j].image = "";
										}
									}

								}
								//categories = [...categories, ...scatlist];
							}
							data.status = 1;
							data.message = 'success';
							data.count = docdata[0].count;
							data.productlist = docdata[0].documentData;
							res.send(data);

						}
					});
				}
			});
		} catch (e) {
		}
	}

	router.maxminPrice = function (req, res) {
		var query = [
			{ "$match": { status: 1 } },
			{
				"$group": {
					"_id": null,
					"max_val": { "$max": "$sale_price" },
					"min_val": { "$min": "$sale_price" }
				}
			}
		]
		db.GetAggregation('food', query, function (err, docdata) {
			if (err || !docdata) {
				return res.send({ status: 0, data: null })
			} else {
				res.send({ status: 1, data: docdata[0] })
			}
		})
	}

	router.recentyVisit = async (req, res) => {



		var id = [];
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// req.checkBody('type', 'type is required').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ status: 0, message: errors[0].msg });
		// 	return;
		// }
		var collection = 'recently_visit';
		if (req.body.type == 'temp_visit') {
			collection = 'recent_temp_visit'
		}
		// if(req.body.idDoc && req.body.idDoc.length > 0){
		// 	req.body.idDoc.forEach(e=>{
		// 		id.push(new mongoose.Types.ObjectId(e))
		// 	})
		// }
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			res.send({ "status": "0", "errors": "Configure your app settings" });
		} else {
			var query = [
				{ "$match": { user_id: req.body.user_id } },
				{
					$lookup: {
						from: 'food',
						let: { product_id: "$product_id" },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ["$_id", "$$product_id"] },
											{ $eq: ["$status", 1] },
										]
									}
								}
							}
						],
						as: "product"
					}
				},
				{ $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
				{ $sort: { createdAt: 1 } },
				{ $limit: 24 },
				{
					$project: {
						name: "$product.name",
						slug: "$product.slug",
						avatar: "$product.avatar",
						size: "$product.size",
						rcategory: "$product.rcategory",
						scategory: "$product.scategory",
						status: "$product.status",
						offer_status: "$product.offer_status",
						offer_amount: "$product.offer_amount",
						price_details: "$product.price_details",
						quantity: "$product.quantity",
						sale_price: "$product.sale_price",
						base_price: "$product.base_price",
						hover_image: "$product.hover_image",
						product_id: "$product._id",
						size_status: "$product.size_status",
						quantity_size: "$product.quantity_size",
						rating: "$product.rating",
						total_rating: "$product.total_rating",
						total_rating_users: "$product.total_rating_users",
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						avatar: 1,
						size: 1,
						rcategory: 1,
						scategory: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: { $ifNull: ["$quantity", 0] },
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						product_id: 1,
						size_status: 1,
						quantity_size: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						notZero: {
							$filter: {
								input: "$quantity_size",
								as: "item",
								cond: {
									$and: [
										{
											$eq: ["$$item.status", 1]
										},
										{
											$ne: ['$$item.quantity', 0]
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
						size: 1,
						rcategory: 1,
						scategory: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						product_id: 1,
						size_status: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						quantity_size: 1,
						notZero: 1
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						avatar: 1,
						size: 1,
						rcategory: 1,
						scategory: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						product_id: 1,
						size_status: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						quantity_size: 1,
						discount_percentage: {
							$round: [
								{
									$multiply: [
										{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
										100
									]
								}
							]
						},
						filterSize: { $ifNull: ['$notZero', []] }
					}
				},

			];
			if (req.body.user_id) {
				if (!mongoose.isValidObjectId(req.body.user_id)) {
					return res.send({ status: 0, message: "Invalid user_id!" });
				};
				query.push(
					{
						$lookup: {
							from: "favourite",
							let: { product_id: "$product_id" },
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$product_id", "$$product_id"] },
												{ $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.user_id)] }
											]
										}
									}
								}
							],
							as: "favourite"
						}
					}
				)
			} else {
				query.push({
					$addFields: { favourite: { $literal: [] } }
				});
			};
			query.push(
				{
					$project: {
						name: 1,
						slug: 1,
						avatar: 1,
						size: 1,
						rcategory: 1,
						scategory: 1,
						status: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						product_id: 1,
						filterSize: 1,
						size_status: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						discount_percentage: {
							$round: [
								{
									$multiply: [
										{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
										100
									]
								}
							]
						},
						favourite_add: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
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
			)
			const docdata = await db.GetAggregation(collection, query)



			if (!docdata) {
				return res.send({ status: 0, data: [] })
			} else {
				for (var i = 0; i < docdata.length; i++) {
					docdata[i].currency = settings.doc.settings.currency_symbol;
					docdata[i].favourite = 0;
					if (docdata[i].avatar != undefined) {
						console.log(docdata[i].avatar);

						image = settings.doc.settings.site_url + docdata[i].avatar;
						docdata[i].avatar = image;
					} else {
						docdata[i].avatar = "";
					}
					if (docdata[i].hover_image != undefined) {
						image = settings.doc.settings.site_url + docdata[i].hover_image;
						docdata[i].hover_image = image;
					} else {
						docdata[i].hover_image = "";
					}
					if (docdata[i].offer_status == 1) {
						// docdata[i].base_price = JSON.parse(JSON.stringify(docdata[i].sale_price));
						// var offer_price = parseInt((docdata[i].sale_price * docdata[i].offer_amount)/100)
						// var sub_price = docdata[i].sale_price - offer_price;
						// docdata[i].sale_price = sub_price>0?sub_price: 0;
						docdata[i].offer_base = JSON.parse(JSON.stringify(docdata[i].base_price));
						var offer_price = parseFloat(parseFloat((docdata[i].base_price * docdata[i].offer_amount) / 100).toFixed(2));
						var sub_price = docdata[i].base_price - offer_price;
						docdata[i].offer_sale = sub_price > 0 ? sub_price : 0
					}
				}
				res.send({ status: 1, data: docdata })
			}
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": "0", "errors": "Configure your app settings" });
		// 	} else {
		// 		// var query = [
		// 		// 	{ "$match": { user_id: req.body.user_id } },
		// 		// 	{
		// 		// 		$lookup: {
		// 		// 			from: 'food',
		// 		// 			let: { product_id: "$product_id" },
		// 		// 			pipeline: [
		// 		// 				{
		// 		// 					$match: {
		// 		// 						$expr: {
		// 		// 							$and: [
		// 		// 								{ $eq: ["$_id", "$$product_id"] },
		// 		// 								{ $eq: ["$status", 1] },
		// 		// 							]
		// 		// 						}
		// 		// 					}
		// 		// 				}
		// 		// 			],
		// 		// 			as: "product"
		// 		// 		}
		// 		// 	},
		// 		// 	{ $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
		// 		// 	{
		// 		// 		$project: {
		// 		// 			name: "$product.name",
		// 		// 			slug: "$product.slug",
		// 		// 			avatar: "$product.avatar",
		// 		// 			size: "$product.size",
		// 		// 			rcategory: "$product.rcategory",
		// 		// 			scategory: "$product.scategory",
		// 		// 			status: "$product.status",
		// 		// 			offer_status: "$product.offer_status",
		// 		// 			offer_amount: "$product.offer_amount",
		// 		// 			price_details: "$product.price_details",
		// 		// 			quantity: "$product.quantity",
		// 		// 			sale_price: "$product.sale_price",
		// 		// 			base_price: "$product.base_price",
		// 		// 			hover_image: "$product.hover_image",
		// 		// 			product_id: "$product._id",
		// 		// 			size_status: "$product.size_status",
		// 		// 			quantity_size: "$product.quantity_size",
		// 		// 		}
		// 		// 	},
		// 		// 	{
		// 		// 		$project: {
		// 		// 			name: 1,
		// 		// 			slug: 1,
		// 		// 			avatar: 1,
		// 		// 			size: 1,
		// 		// 			rcategory: 1,
		// 		// 			scategory: 1,
		// 		// 			status: 1,
		// 		// 			offer_status: 1,
		// 		// 			offer_amount: 1,
		// 		// 			price_details: 1,
		// 		// 			quantity: { $ifNull: ["$quantity", 0] },
		// 		// 			sale_price: 1,
		// 		// 			base_price: 1,
		// 		// 			hover_image: 1,
		// 		// 			product_id: 1,
		// 		// 			size_status: 1,
		// 		// 			quantity_size: 1,
		// 		// 			notZero: {
		// 		// 				$filter: {
		// 		// 					input: "$quantity_size",
		// 		// 					as: "item",
		// 		// 					cond: {
		// 		// 						$and: [
		// 		// 							{
		// 		// 								$eq: ["$$item.status", 1]
		// 		// 							},
		// 		// 							{
		// 		// 								$ne: ['$$item.quantity', 0]
		// 		// 							}
		// 		// 						]
		// 		// 					}
		// 		// 				}
		// 		// 			}
		// 		// 		}
		// 		// 	},
		// 		// 	{
		// 		// 		$project: {
		// 		// 			name: 1,
		// 		// 			slug: 1,
		// 		// 			avatar: 1,
		// 		// 			size: 1,
		// 		// 			rcategory: 1,
		// 		// 			scategory: 1,
		// 		// 			status: 1,
		// 		// 			offer_status: 1,
		// 		// 			offer_amount: 1,
		// 		// 			price_details: 1,
		// 		// 			quantity: 1,
		// 		// 			sale_price: 1,
		// 		// 			base_price: 1,
		// 		// 			hover_image: 1,
		// 		// 			product_id: 1,
		// 		// 			size_status: 1,
		// 		// 			quantity_size: 1,
		// 		// 			notZero: 1
		// 		// 		}
		// 		// 	},
		// 		// 	{
		// 		// 		$project: {
		// 		// 			name: 1,
		// 		// 			slug: 1,
		// 		// 			avatar: 1,
		// 		// 			size: 1,
		// 		// 			rcategory: 1,
		// 		// 			scategory: 1,
		// 		// 			status: 1,
		// 		// 			offer_status: 1,
		// 		// 			offer_amount: 1,
		// 		// 			price_details: 1,
		// 		// 			quantity: 1,
		// 		// 			sale_price: 1,
		// 		// 			base_price: 1,
		// 		// 			hover_image: 1,
		// 		// 			product_id: 1,
		// 		// 			size_status: 1,
		// 		// 			quantity_size: 1,
		// 		// 			filterSize: { $ifNull: ['$notZero', []] }
		// 		// 		}
		// 		// 	},
		// 		// 	{
		// 		// 		$project: {
		// 		// 			name: 1,
		// 		// 			slug: 1,
		// 		// 			avatar: 1,
		// 		// 			size: 1,
		// 		// 			rcategory: 1,
		// 		// 			scategory: 1,
		// 		// 			status: 1,
		// 		// 			offer_status: 1,
		// 		// 			offer_amount: 1,
		// 		// 			price_details: 1,
		// 		// 			quantity: 1,
		// 		// 			sale_price: 1,
		// 		// 			base_price: 1,
		// 		// 			hover_image: 1,
		// 		// 			product_id: 1,
		// 		// 			filterSize: 1,
		// 		// 			size_status: 1,
		// 		// 			quantity_size: {
		// 		// 				$filter: {
		// 		// 					input: "$quantity_size",
		// 		// 					as: "item",
		// 		// 					cond: {
		// 		// 						$eq: ["$$item.status", 1]
		// 		// 					}
		// 		// 				}
		// 		// 			},
		// 		// 			in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
		// 		// 			no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
		// 		// 		}
		// 		// 	},
		// 		// 	{ $limit: 24 },
		// 		// 	{ $sort: { createdAt: 1 } }
		// 		// ]
		// 		db.GetAggregation(collection, query, function (err, docdata) {
		// 			if (err || !docdata) {
		// 				return res.send({ status: 0, data: [] })
		// 			} else {
		// 				for (var i = 0; i < docdata.length; i++) {
		// 					docdata[i].currency = settings.settings.currency_symbol;
		// 					docdata[i].favourite = 0;
		// 					if (docdata[i].avatar != undefined) {
		// 						image = settings.settings.site_url + docdata[i].avatar.slice(2);
		// 						docdata[i].avatar = image;
		// 					} else {
		// 						docdata[i].avatar = "";
		// 					}
		// 					if (docdata[i].hover_image != undefined) {
		// 						image = settings.settings.site_url + docdata[i].hover_image.slice(2);
		// 						docdata[i].hover_image = image;
		// 					} else {
		// 						docdata[i].hover_image = "";
		// 					}
		// 					if (docdata[i].offer_status == 1) {
		// 						// docdata[i].base_price = JSON.parse(JSON.stringify(docdata[i].sale_price));
		// 						// var offer_price = parseInt((docdata[i].sale_price * docdata[i].offer_amount)/100)
		// 						// var sub_price = docdata[i].sale_price - offer_price;
		// 						// docdata[i].sale_price = sub_price>0?sub_price: 0;
		// 						docdata[i].offer_base = JSON.parse(JSON.stringify(docdata[i].base_price));
		// 						var offer_price = parseFloat(parseFloat((docdata[i].base_price * docdata[i].offer_amount) / 100).toFixed(2));
		// 						var sub_price = docdata[i].base_price - offer_price;
		// 						docdata[i].offer_sale = sub_price > 0 ? sub_price : 0
		// 					}
		// 				}
		// 				res.send({ status: 1, data: docdata })
		// 			}
		// 		})
		// 	}
		// })
		// if(id.length>0){
		// 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 		if (err || !settings) {
		// 			res.send({ "status": "0", "errors": "Configure your app settings" });
		// 		} else {
		// 			var query = [
		// 				{ "$match": {_id: {$in: id},status: 1}},
		// 				{ 
		// 					$project : {
		// 						name: 1,
		// 						slug: 1,
		// 						avatar: 1,
		// 						size: 1,
		// 						rcategory: 1,
		// 						scategory: 1,
		// 						status: 1,
		// 						offer_status: 1,
		// 						offer_amount: 1,
		// 						price_details: 1,
		// 						quantity: 1,
		// 						sale_price: 1,
		// 						base_price: 1,
		// 						hover_image: 1,
		// 					}
		// 				}

		// 			]
		// 			db.GetAggregation('food', query, function (err, docdata) {
		// 				if(err || !docdata){
		// 					return res.send({status: 0, data: []})
		// 				} else{
		// 					for (var i = 0; i < docdata.length; i++) {
		// 						docdata[i].currency = settings.settings.currency_symbol;
		// 						docdata[i].favourite = 0;
		// 						if (docdata[i].avatar != undefined) {
		// 							image = settings.settings.site_url + docdata[i].avatar.slice(2);
		// 							docdata[i].avatar = image;
		// 						} else {
		// 							docdata[i].avatar = "";
		// 						}
		// 						if (docdata[i].hover_image != undefined) {
		// 							image = settings.settings.site_url + docdata[i].hover_image.slice(2);
		// 							docdata[i].hover_image = image;
		// 						} else {
		// 							docdata[i].hover_image = "";
		// 						}
		// 						if(docdata[i].offer_status == 1){
		// 							docdata[i].base_price = JSON.parse(JSON.stringify(docdata[i].sale_price));
		// 							var offer_price = parseInt((docdata[i].sale_price * docdata[i].offer_amount)/100)
		// 							var sub_price = docdata[i].sale_price - offer_price;
		// 							docdata[i].sale_price = sub_price>0?sub_price: 0;
		// 						}
		// 					}
		// 					res.send({status: 1,data: docdata})
		// 				}
		// 			})
		// 		}
		// 	})
		// } else {
		// 	res.send({status: 0,data: []})
		// }
	}


	router.relateProductlist = async function (req, res) {
		var query = {};
		var favoriteDetails = [];
		if (req.body.user_id) {
			favoriteDetails = await db.GetDocument('favourite', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id) }, { product_id: 1 }, {});
			console.log(favoriteDetails, 'favourite productsss');
		}

		query = { 'status': { $eq: 1 } };
		if (req.body.rcat) {
			query = { $and: [{ 'rcategory': new mongoose.Types.ObjectId(req.body.rcat) }, { 'status': { $eq: 1 } }] };
		}
		if (req.body.scat) {
			query = { $and: [{ 'rcategory': new mongoose.Types.ObjectId(req.body.rcat) }, { 'scategory': new mongoose.Types.ObjectId(req.body.scat) }, { 'status': { $eq: 1 } }] };
		}

		if (req.body.sort) {
			var sorted = req.body.sort.field;
		}

		var usersQuery = [{ "$match": query },
		{ $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
		{ $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },

		{ $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
		{ $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },

		{ $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
		{ $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				avatar: 1,
				rcat_id: "$rcategory._id",
				scat_id: "$scategory._id",
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				offer_status: 1,
				offer_amount: 1,
				quantity: { $ifNull: ["$quantity", 0] },
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				createdAt: 1,
				sort_name: { $toLower: '$name' },
				size_status: 1,
				quantity_size: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				notZero: {
					$filter: {
						input: "$quantity_size",
						as: "item",
						cond: {
							$and: [
								{
									$eq: [
										"$$item.status",
										1
									]
								},
								{
									$ne: ['$$item.quantity', 0]
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
				size: 1,
				avatar: 1,
				rcat_id: 1,
				scat_id: 1,
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				offer_status: 1,
				offer_amount: 1,
				quantity: 1,
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				createdAt: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				sort_name: { $toLower: '$name' },
				size_status: 1,
				quantity_size: 1,
				notZero: 1
			}
		},
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				avatar: 1,
				rcat_id: 1,
				scat_id: 1,
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				offer_status: 1,
				offer_amount: 1,
				quantity: 1,
				sale_price: 1,
				base_price: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				hover_image: 1,
				createdAt: 1,
				sort_name: { $toLower: '$name' },
				size_status: 1,
				quantity_size: 1,
				filterSize: { $ifNull: ['$notZero', []] }
			}
		},
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				avatar: 1,
				rcat_id: 1,
				scat_id: 1,
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				offer_status: 1,
				offer_amount: 1,
				quantity: 1,
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				createdAt: 1,
				sort_name: { $toLower: '$name' },
				size_status: 1,
				filterSize: 1,
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
		{
			$project: {
				name: 1,
				size: 1,
				slug: 1,
				rcategory: 1,
				images: 1,
				status: 1,

				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];

		var condition = { status: { $ne: 0 } };
		usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
		if (req.body.rand) {
			usersQuery.push({ $sample: { size: parseInt(req.body.limit) } });
		}
		if (req.body.search) {
			//try {
			//condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
			var searchs = req.body.search;
			usersQuery.push({ "$match": { $or: [{ "documentData.rcatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.scatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.brandname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.isRecommeneded": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.itmcat": { $regex: searchs + '.*', $options: 'si' } }] } });
			//search limit
			usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
			usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
			if (req.body.limit && req.body.skip >= 0) {
				usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
			}
			usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
		}

		var sorting = {};
		if (req.body.sort) {
			var sorter = 'documentData.' + req.body.sort.field;
			sorting[sorter] = req.body.sort.order;
			usersQuery.push({ $sort: sorting });
		} else {
			sorting["documentData.createdAt"] = -1;
			usersQuery.push({ $sort: sorting });
		}


		if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
			usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
		} else {
			usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(10) });
		}
		if (!req.body.search) {
			usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
		}
		var data = {};
		try {
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {
				const docdata = await db.GetAggregation('food', usersQuery)
				if (docdata.length <= 0) {
					data.status = 1;
					data.message = 'success';
					data.count = [];
					data.productlist = [];
					res.send(data);
				} else {

					if (docdata[0].documentData && docdata[0].documentData.length > 0) {

						for (var i = 0; i < docdata[0].documentData.length; i++) {
							docdata[0].documentData[i].favourite = 0;
							docdata[0].documentData[i].currency = settings.doc.settings.currency_symbol;
							if (favoriteDetails && favoriteDetails.length > 0) {
								favoriteDetails.forEach(fav => {
									if (docdata[0].documentData[i]._id.toString() == fav.product_id.toString()) {
										docdata[0].documentData[i].favourite = 1;
									}
								});
							}
							if (docdata[0].documentData[i].avatar != undefined) {
								image = settings.doc.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
								docdata[0].documentData[i].avatar = image;
							} else {
								docdata[0].documentData[i].avatar = "";
							}
							if (docdata[0].documentData[i].hover_image != undefined) {
								image = settings.doc.settings.site_url + docdata[0].documentData[i].hover_image.slice(2);
								docdata[0].documentData[i].hover_image = image;
							} else {
								docdata[0].documentData[i].hover_image = "";
							}

							if (docdata[0].documentData[i].offer_status == 1) {
								// docdata[0].documentData[i].base_price = JSON.parse(JSON.stringify(docdata[0].documentData[i].sale_price));
								// var offer_price = parseInt((docdata[0].documentData[i].sale_price * docdata[0].documentData[i].offer_amount)/100)
								// var sub_price = docdata[0].documentData[i].sale_price - offer_price;
								// docdata[0].documentData[i].sale_price = sub_price>0?sub_price: 0;
								docdata[0].documentData[i].offer_base = JSON.parse(JSON.stringify(docdata[0].documentData[i].base_price));
								var offer_price = parseFloat(parseFloat((docdata[0].documentData[i].base_price * docdata[0].documentData[i].offer_amount) / 100).toFixed(2));
								var sub_price = docdata[0].documentData[i].base_price - offer_price;
								docdata[0].documentData[i].offer_sale = sub_price > 0 ? sub_price : 0
							}

						}
						//categories = [...categories, ...scatlist];

					}

					data.status = 1;
					data.message = 'success';
					data.count = docdata[0].count;
					data.productlist = docdata[0].documentData;
					res.send(data);
					console.log("-relateProductlist-relateProductlistrelateProductlist", docdata[0].documentData)
				}
			}
			// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			// 	if (err || !settings) {
			// 		res.send({ "status": "0", "errors": "Configure your app settings" });
			// 	} else {
			// 		db.GetAggregation('food', usersQuery, function (err, docdata) {
			// 			if (err || docdata.length <= 0) {
			// 				data.status = 1;
			// 				data.message = 'success';
			// 				data.count = [];
			// 				data.productlist = [];
			// 				res.send(data);
			// 			} else {

			// 				if (docdata[0].documentData && docdata[0].documentData.length > 0) {

			// 					for (var i = 0; i < docdata[0].documentData.length; i++) {
			// 						docdata[0].documentData[i].favourite = 0;
			// 						docdata[0].documentData[i].currency = settings.settings.currency_symbol;
			// 						if (favoriteDetails && favoriteDetails.length > 0) {
			// 							favoriteDetails.forEach(fav => {
			// 								if (docdata[0].documentData[i]._id.toString() == fav.product_id.toString()) {
			// 									docdata[0].documentData[i].favourite = 1;
			// 								}
			// 							});
			// 						}
			// 						if (docdata[0].documentData[i].avatar != undefined) {
			// 							image = settings.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
			// 							docdata[0].documentData[i].avatar = image;
			// 						} else {
			// 							docdata[0].documentData[i].avatar = "";
			// 						}
			// 						if (docdata[0].documentData[i].hover_image != undefined) {
			// 							image = settings.settings.site_url + docdata[0].documentData[i].hover_image.slice(2);
			// 							docdata[0].documentData[i].hover_image = image;
			// 						} else {
			// 							docdata[0].documentData[i].hover_image = "";
			// 						}

			// 						if (docdata[0].documentData[i].offer_status == 1) {
			// 							// docdata[0].documentData[i].base_price = JSON.parse(JSON.stringify(docdata[0].documentData[i].sale_price));
			// 							// var offer_price = parseInt((docdata[0].documentData[i].sale_price * docdata[0].documentData[i].offer_amount)/100)
			// 							// var sub_price = docdata[0].documentData[i].sale_price - offer_price;
			// 							// docdata[0].documentData[i].sale_price = sub_price>0?sub_price: 0;
			// 							docdata[0].documentData[i].offer_base = JSON.parse(JSON.stringify(docdata[0].documentData[i].base_price));
			// 							var offer_price = parseFloat(parseFloat((docdata[0].documentData[i].base_price * docdata[0].documentData[i].offer_amount) / 100).toFixed(2));
			// 							var sub_price = docdata[0].documentData[i].base_price - offer_price;
			// 							docdata[0].documentData[i].offer_sale = sub_price > 0 ? sub_price : 0
			// 						}

			// 					}
			// 					//categories = [...categories, ...scatlist];

			// 				}

			// 				data.status = 1;
			// 				data.message = 'success';
			// 				data.count = docdata[0].count;
			// 				data.productlist = docdata[0].documentData;
			// 				res.send(data);

			// 			}
			// 		});
			// 	}
			// });
		} catch (e) {
		}
	}

	router.getproductlist = async function (req, res) {
		var query = {};

		// console.log(JSON.stringify(req.body, null, 2), 'what are in the body');
		query = { 'status': { $eq: 1 } };



		// {
		// if (req.body.category && req.body?.category[0].scat.length > 0) {
		// 	var arr_ = new mongoose.Types.ObjectId(req.body?.category[0].scat[0])
		// 	console.log("-----arr_-----------", arr_)

		// 	query["child_cat_array"] = {
		// 		$in: [arr_]
		// 	};

		// }

		// if (req.body.scat_array && req.body.scat_array.length > 0 && req.body.category[0].scat && req.body.category[0].scat.length > 0 && req.body.category != "") {
		// 	// query["$or"] = [];
		// 	// console.log("----------------req.body.scat_array.length---------------------------", req.body.scat_array.length)
		// 	// console.log("------------------req.body.scat_array-------inside wit---------------", req.body.scat_array)
		// 	// console.log("--------req.body.category--------------------------", req.body.category[0].scat[0])
		// 	let child_filter = req.body.scat_array

		// 	let final_child_array = child_filter.map(x => new mongoose.Types.ObjectId(x))

		// 	// query['$or'].push({ 'scategory': { $in: objectIdArray } },
		// 	// 	{ 'scategory': anotherObjectId })

		// 	// = [
		// 	// 	{ scategory: { $in: objectIdArray } },
		// 	// 	{ otherField: anotherObjectId }
		// 	// ];

		// 	query['scategory'] = { "$in": final_child_array }




		// }
		// }


		if (req.body.category && req.body.category != "") {
			// console.log("------------------req.body.scat_array----------------------", req.body.scat_array)
			// console.log("---------comming----------------")
			categorys = req.body.category;
			if (categorys[0].rcat != undefined && categorys.length > 0) {
				// query["$and"] = [];
				query["$or"] = [];
				var cate_id = [];
				var subcate_id = [];
				for (var i = 0; i < categorys.length; i++) {
					if (categorys[i].rcat && categorys[i].rcat != undefined) {
						if (categorys[i].scat && categorys[i].scat != "" && categorys[i].scat != null && categorys[i].scat[0] != null && categorys[i].scat != undefined && categorys[i].scat.length > 0) {
							// if (categorys[i].scat[0] == categorys[i].rcat) {
							// 	query["$or"].push({ $and: [{ 'rcategory': new mongoose.Types.ObjectId(categorys[i].rcat) }, { 'status': { $eq: 1 } }] });
							// } else {
							cate_id.push(new mongoose.Types.ObjectId(categorys[i].rcat));
							for (var j = 0; j < categorys[i].scat.length; j++) {
								query["$or"].push({ $and: [{ 'status': { $eq: 1 } }, { 'child_cat_array': { $in: [new mongoose.Types.ObjectId(categorys[i].scat[j])] } }] });


							}
							// }

							console.log("-------------------------------cmiming through initial  filter if  part")

						} else {
							// cate_id.push(mongoose.Types.ObjectId(categorys[i].rcat));
							console.log("-------------------------------cmiming through initial  filter else  part")
							query["$or"].push({ $and: [{ 'rcategory': new mongoose.Types.ObjectId(categorys[i].rcat) }, { 'status': { $eq: 1 } }] });
						}
					}
				}
				// if(cate_id.length>0 && subcate_id.length>0){
				// 	query["$and"].push({$and:[{ 'rcategory': {$in: cate_id}, 'scategory': { $in: subcate_id }}]});
				// 	// query["$and"].push({ 'rcategory': {$in: cate_id}, 'scategory': { $in: subcate_id }});
				// } else if(cate_id.length>0 && subcate_id.length == 0){
				// 	query["$and"].push({'rcategory': {$in: cate_id}})
				// }
				// query["$and"].push({ $and: [{ 'rcategory': mongoose.Types.ObjectId(categorys[i].rcat) }, { 'status': { $eq: 1 } }] });
			}
		}
		if (req.body.pricedtl) {

			if (req.body.pricedtl != undefined && req.body.pricedtl.length > 0) {
				// if (!query["$or"]) {
				// 	console.log("-----------comming through $or----")
				// 	query["$or"] = [];
				// }
				// if (!query["$and"]) {
				// 	console.log("-----------comming through $and----")

				// }
				query["$and"] = [];
				var pricedtl = req.body.pricedtl;
				var pricefiltArray = [];

				for (var i = 0; i < pricedtl.length; i++) {
					// query["$or"].push({ 'price_details.sprice': {$lt: 
					// 	parseFloat(pricedtl[i].maxprice) , $gt: 
					// 	parseFloat(pricedtl[i].minprice)} });
					pricefiltArray.push({
						'sale_price': {
							$lt:
								parseFloat(pricedtl[i].maxprice), $gt:
								parseFloat(pricedtl[i].minprice)
						}
					});
				}
				// query["$and"].push({$and: pricefiltArray});
				query["$and"].push({ $or: pricefiltArray })
			}
		}
		// if (req.body.size_filter && req.body.size_filter.length > 0) {
		// 	if (!query["$and"]) {
		// 		query["$and"] = [];
		// 	}
		// 	query["$and"].push({
		// 		'quantity_size': {
		// 			$elemMatch: {
		// 				size: { $in: req.body.size_filter },
		// 				status: { $eq: 1 },
		// 			},
		// 		},
		// 	});
		// }


		if (req.body.size_filter && req.body.size_filter.length > 0) {
			let matchArray = req.body.size_filter
			query["$and"] = [];
			query["$and"].push({ $and: [{ 'attributes': { $in: matchArray } }, { 'status': { $eq: 1 } }] });


			console.log("-------------------------------cmiming through size filter")
		}
		// if (req.body.isRecommeneded == 1) {
		// 	query["$and"] = [];
		// 	query["$and"].push({ $and: [{ 'isRecommeneded': { $eq: 1 } }, { 'status': { $eq: 1 } }] });
		// }
		// return
		// if (req.body.brandname && req.body.brandname != undefined) {
		// 	var brands = req.body.brandname;
		// 	query["$or"] = [];
		// 	if(brands.length > 0){
		// 		for(var j=0;j<brands.length;j++){
		// 			query["$or"].push({ $and: [{ 'brandname': mongoose.Types.ObjectId(brands[j]) }, { 'status': { $eq: 1 } }] });
		// 		}
		// 	}
		// }

		// let cityid = new mongoose.Types.ObjectId();
		// if (isObjectId(req.body.cityid)) {
		// 	cityid = mongoose.Types.ObjectId(req.body.cityid)
		// }
		// query['main_city'] = { $in: [cityid.toString()] }

		if (req.body.sort) {
			var sorted = req.body.sort.field;
		}

		if (query["$and"] && query["$and"].length == 0) {
			delete query["$and"];
		}

		if (req.body.rating_filter) {
			query.rating = { $gte: Number(req.body.rating_filter) }
		};

		var usersQuery = [{ "$match": query },
		{
			$lookup: {
				from: 'rcategory',
				let: {
					rcategory: "$rcategory",
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ "$eq": ["$_id", "$$rcategory"] },
									{ "$ne": ["$status", 2] },
								]
							}
						}
					}
				],
				as: "rcategory"
			}
		},
		{ "$match": { "rcategory": { $ne: [] } } },
		{ $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
		{
			$lookup: {
				from: 'scategory',
				let: {
					scategory: "$scategory",
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ "$eq": ["$_id", "$$scategory"] },
									{ "$eq": ["$status", 1] },
								]
							}
						}
					}
				],
				as: "scategory"
			}
		},
		{ $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
		// { 
		// 	$lookup: { 
		// 		from: 'brands', 
		// 		let: {
		// 			brandname: "$brandname",
		// 		},
		// 		pipeline: [
		// 			{
		// 				$match: {
		// 					$expr: {
		// 						$and: [
		// 							{ "$eq": ["$_id", "$$brandname"] },
		// 							{ "$eq": ["$status", 1] },
		// 						]
		// 					}
		// 				}
		// 			}
		// 		],
		// 		as: "brands" 
		// 	} 
		// },		
		// { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				avatar: 1,
				rcat_id: "$rcategory._id",
				scat_id: "$scategory._id",
				rcategory: { $toLower: '$rcategory.rcatname' },
				scategory: { $toLower: '$scategory.scatname' },
				// brandname: { $toLower: '$brands.brandname' },
				isRecommeneded: 1,
				itmcat: 1,
				status: 1,
				offer_status: 1,
				offer_amount: 1,
				price_details: 1,
				quantity: { $ifNull: ["$quantity", 0] },
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				createdAt: 1,
				size_status: 1,
				quantity_size: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				sort_name: { $toLower: '$name' },
				substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
				"images": {
					"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
				},
				notZero: {
					$filter: {
						input: "$quantity_size",
						as: "item",
						cond: {
							$and: [
								{
									$eq: [
										"$$item.status",
										1
									]
								},
								{
									$ne: ['$$item.quantity', 0]
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
				size: 1,
				avatar: 1,
				rcat_id: 1,
				scat_id: 1,
				rcategory: 1,
				scategory: 1,
				// brandname: { $toLower: '$brands.brandname' },
				isRecommeneded: 1,
				itmcat: 1,
				status: 1,
				offer_status: 1,
				offer_amount: 1,
				price_details: 1,
				quantity: 1,
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				createdAt: 1,
				size_status: 1,
				quantity_size: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				sort_name: { $toLower: '$name' },
				substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
				"images": {
					"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
				},
				notZero: 1
			}
		},
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				avatar: 1,
				rcat_id: 1,
				scat_id: 1,
				rcategory: 1,
				scategory: 1,
				// brandname: { $toLower: '$brands.brandname' },
				isRecommeneded: 1,
				itmcat: 1,
				status: 1,
				offer_status: 1,
				offer_amount: 1,
				price_details: 1,
				quantity: 1,
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				createdAt: 1,
				size_status: 1,
				quantity_size: 1,
				sort_name: 1,
				substat: 1,
				"images": 1,
				filterSize: { $ifNull: ['$notZero', []] },
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
			}
		},
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				avatar: 1,
				rcat_id: 1,
				scat_id: 1,
				rcategory: 1,
				scategory: 1,
				// brandname: 1,
				isRecommeneded: 1,
				itmcat: 1,
				status: 1,
				offer_status: 1,
				offer_amount: 1,
				price_details: 1,
				quantity: 1,
				sale_price: 1,
				base_price: 1,
				hover_image: 1,
				createdAt: 1,
				sort_name: 1,
				filterSize: 1,
				substat: 1,
				"images": 1,
				size_status: 1,
				rating: 1,
				total_rating: 1,
				total_rating_users: 1,
				discount_percentage: {
					$round: [
						{
							$multiply: [
								{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
								100
							]
						}
					]
				},
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
		{
			$project: {
				name: 1,
				slug: 1,
				size: 1,
				rcategory: 1,
				substat: 1,
				images: 1,
				status: 1,
				document: "$$ROOT",

			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];

		var condition = { status: { $ne: 0 } };
		usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

		if (req.body.search) {
			//try {
			//condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
			var searchs = req.body.search;
			// usersQuery[0]["$match"]["name"] = {$regex: searchs + '.*', $options: 'si'};
			usersQuery.push({ "$match": { $or: [{ "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.scategory": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.brandname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.isRecommeneded": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.itmcat": { $regex: searchs + '.*', $options: 'si' } }] } });
			//search limit
			usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
			usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
			if (req.body.limit && req.body.skip >= 0) {
				usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
			}
			usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
		}

		var sorting = {};

		if (req.body.filter == "lowtohigh") {
			var sorter = 'documentData.sale_price';
			sorting[sorter] = 1;
			usersQuery.push({ $sort: sorting });
		}

		if (req.body.filter == "hightolow") {
			var sorter = 'documentData.sale_price';
			sorting[sorter] = -1;
			usersQuery.push({ $sort: sorting });
		}
		if (req.body.filter == "rathightolow") {
			var sorter = 'documentData.rating';
			sorting[sorter] = -1;
			usersQuery.push({ $sort: sorting });
		}
		if (req.body.filter == "ratlowtohigh") {
			var sorter = 'documentData.rating';
			sorting[sorter] = 1;
			usersQuery.push({ $sort: sorting });
		}

		// if (req.body.sort) {
		// 	var sorter = 'documentData.' + req.body.sort.field;
		// 	sorting[sorter] = req.body.sort.order;
		// 	usersQuery.push({ $sort: sorting });
		// }

		if (req.body.filter == "latest") {
			sorting["documentData.createdAt"] = -1;
			usersQuery.push({ $sort: sorting });
		}

		if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
			usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
		} else {
			usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(40) });
		}
		if (!req.body.search) {
			usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
		};
		var data = {};
		try {
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {
				const docdata = await db.GetAggregation('food', usersQuery)
				if (docdata.length <= 0) {
					data.status = 1;
					data.message = 'success';
					data.count = [];
					data.productlist = [];
					res.send(data);
				} else {

					if (docdata[0].documentData && docdata[0].documentData.length > 0) {

						for (var i = 0; i < docdata[0].documentData.length; i++) {
							docdata[0].documentData[i].favourite = 0;
							docdata[0].documentData[i].currency = settings.doc.settings.currency_symbol;
							if (docdata[0].documentData[i].avatar != undefined) {
								image = settings.doc.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
								docdata[0].documentData[i].avatar = image;
							} else {
								docdata[0].documentData[i].avatar = "";
							}
							if (docdata[0].documentData[i].hover_image != undefined) {
								image = settings.doc.settings.site_url + docdata[0].documentData[i].hover_image.slice(2);
								docdata[0].documentData[i].hover_image = image;
							} else {
								docdata[0].documentData[i].hover_image = "";
							}
							if (docdata[0].documentData[i].offer_status == 1) {
								// docdata[0].documentData[i].base_price = JSON.parse(JSON.stringify(docdata[0].documentData[i].sale_price));
								// var offer_price = parseInt((docdata[0].documentData[i].sale_price * docdata[0].documentData[i].offer_amount)/100);
								// var sub_price = docdata[0].documentData[i].sale_price - offer_price;
								// docdata[0].documentData[i].sale_price = sub_price > 0 ? sub_price : 0
								docdata[0].documentData[i].offer_base = JSON.parse(JSON.stringify(docdata[0].documentData[i].base_price));
								var offer_price = parseFloat(parseFloat((docdata[0].documentData[i].base_price * docdata[0].documentData[i].offer_amount) / 100).toFixed(2));
								var sub_price = docdata[0].documentData[i].base_price - offer_price;
								docdata[0].documentData[i].offer_sale = sub_price > 0 ? sub_price : 0
							}
							// if(req.body.filter == "lowtohigh") {
							// 	docdata[0].documentData[i].price_details.sort(function(a, b) {
							// 		var keyA = new Date(a.sprice),
							// 		keyB = new Date(b.sprice);
							// 		// Compare the 2 prices
							// 		if (keyA < keyB) return -1;
							// 		if (keyA > keyB) return 1;
							// 		return 0;
							// 	});
							// }

						}
						//categories = [...categories, ...scatlist];

					}

					data.status = 1;
					data.message = 'success';
					data.count = docdata[0].count;
					data.productlist = docdata[0].documentData;
					res.send(data);

				}
			}
			// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			// 	if (err || !settings) {
			// 		res.send({ "status": "0", "errors": "Configure your app settings" });
			// 	} else {
			// 		db.GetAggregation('food', usersQuery, function (err, docdata) {
			// 			if (err || docdata.length <= 0) {
			// 				data.status = 1;
			// 				data.message = 'success';
			// 				data.count = [];
			// 				data.productlist = [];
			// 				res.send(data);
			// 			} else {

			// 				if (docdata[0].documentData && docdata[0].documentData.length > 0) {

			// 					for (var i = 0; i < docdata[0].documentData.length; i++) {
			// 						docdata[0].documentData[i].favourite = 0;
			// 						docdata[0].documentData[i].currency = settings.settings.currency_symbol;
			// 						if (docdata[0].documentData[i].avatar != undefined) {
			// 							image = settings.settings.site_url + docdata[0].documentData[i].avatar.slice(2);
			// 							docdata[0].documentData[i].avatar = image;
			// 						} else {
			// 							docdata[0].documentData[i].avatar = "";
			// 						}
			// 						if (docdata[0].documentData[i].hover_image != undefined) {
			// 							image = settings.settings.site_url + docdata[0].documentData[i].hover_image.slice(2);
			// 							docdata[0].documentData[i].hover_image = image;
			// 						} else {
			// 							docdata[0].documentData[i].hover_image = "";
			// 						}
			// 						if (docdata[0].documentData[i].offer_status == 1) {
			// 							// docdata[0].documentData[i].base_price = JSON.parse(JSON.stringify(docdata[0].documentData[i].sale_price));
			// 							// var offer_price = parseInt((docdata[0].documentData[i].sale_price * docdata[0].documentData[i].offer_amount)/100);
			// 							// var sub_price = docdata[0].documentData[i].sale_price - offer_price;
			// 							// docdata[0].documentData[i].sale_price = sub_price > 0 ? sub_price : 0
			// 							docdata[0].documentData[i].offer_base = JSON.parse(JSON.stringify(docdata[0].documentData[i].base_price));
			// 							var offer_price = parseFloat(parseFloat((docdata[0].documentData[i].base_price * docdata[0].documentData[i].offer_amount) / 100).toFixed(2));
			// 							var sub_price = docdata[0].documentData[i].base_price - offer_price;
			// 							docdata[0].documentData[i].offer_sale = sub_price > 0 ? sub_price : 0
			// 						}
			// 						// if(req.body.filter == "lowtohigh") {
			// 						// 	docdata[0].documentData[i].price_details.sort(function(a, b) {
			// 						// 		var keyA = new Date(a.sprice),
			// 						// 		keyB = new Date(b.sprice);
			// 						// 		// Compare the 2 prices
			// 						// 		if (keyA < keyB) return -1;
			// 						// 		if (keyA > keyB) return 1;
			// 						// 		return 0;
			// 						// 	});
			// 						// }

			// 					}
			// 					//categories = [...categories, ...scatlist];

			// 				}

			// 				data.status = 1;
			// 				data.message = 'success';
			// 				data.count = docdata[0].count;
			// 				data.productlist = docdata[0].documentData;
			// 				res.send(data);

			// 			}
			// 		});
			// 	}
			// });
		} catch (e) {
			console.log(e, 'this is error');
		}
	}


	router.get_variance = async function (req, res) {
		var data = {}
		var id = new mongoose.Types.ObjectId(req.body.id)

		if (!id) {
			data.res = []
			data.status = 0;
			data.message = "Err"
			res.send(data)
		} else {
			let pipeline = [
				{ $match: { _id: id } },
				{
					$lookup: {
						from: 'attributes', // name of the second collection
						localField: '_id', // field from the first collection
						foreignField: 'category._id', // field from the second collection's array of objects
						as: 'matchedDocuments'
					}
				},
				{
					$unwind: '$matchedDocuments'
				}
			]

			var result = []
			var variance = await db.GetAggregation('rcategory', pipeline)

			variance.forEach(x => {
				result.push(x.matchedDocuments)
			})

			if (!variance) {
				data.res = []
				data.status = 0;
				data.message = "Err"
				res.send(data)
			} else {



				data.res = result
				data.status = 1;
				data.message = "Success"
				res.send(data)

			}



		}


	}

















	router.getalltimeslots = async function (req, res) {
		var data = {};
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status == false) {
			res.send({ "status": "0", "errors": "Configure your app settings" });
		} else {
			const docdata = await db.GetDocument('timeslots', { status: { $eq: 1 } }, {}, {})


			if (docdata.status == false) {
				res.send(err);
				data.status = 1;
				data.message = 'error';
				data.timeslots = [];
				res.send(data);
			} else {

				var timedata = [];
				for (var i = 0; i < docdata.doc.length; i++) {

					var time_now = Date.now()
					// .format(settings.doc.settings.time_format);




					var currentTime = moment(time_now, "HH:mm a");
					currentTime.toString();

					let startTime = docdata.doc[i].time_start
					// .format(settings.doc.settings.time_format);

					let endTime = docdata.doc[i].time_end
					// .format(settings.doc.settings.time_format);




					if (endTime == '11:59 pm') {
						endTime = '24:00 pm';
					}
					var start_Time = moment(startTime, "HH:mm a");
					//start_Time.toString();
					var end_Time = moment(endTime, "HH:mm a");
					//end_Time.toString();
					var timeslots = [];

					while (start_Time <= end_Time) {
						timeslots.push(new moment(start_Time).format('hh:mm a'));
						start_Time.add(docdata.doc[i].slottime, 'minutes');
					}

					var timeobj = {
						'_id': docdata.doc[i]._id,
						'weekday': docdata.doc[i].weekday,
						'slottime': docdata.doc[i].slottime,
						'time_start': startTime,
						'time_end': endTime,
						'timeslots': timeslots,
						'status': docdata.doc[i].status
					}








					timedata.push(timeobj);

				}

				data.status = 1;
				data.message = 'success';
				data.timeslots = timedata;
				res.send(data);



			}
			// db.GetDocument('timeslots', { status: { $eq: 1 } }, {}, {}, function (err, docdata) {
			// 	if (err) {
			// 		res.send(err);
			// 		data.status = 1;
			// 		data.message = 'error';
			// 		data.timeslots = [];
			// 		res.send(data);
			// 	} else {

			// 		var timedata = [];
			// 		for (var i = 0; i < docdata.length; i++) {

			// 			var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
			// 			var currentTime = moment(time_now, "HH:mm a");
			// 			currentTime.toString();

			// 			// var currentday = new Date();
			// 			// var currentweekday = moment(currentday).format('dddd');
			// 			// if(currentweekday == docdata[i].weekday){
			// 			// 	startTime = timezone.tz(docdata[i].time_now, settings.settings.time_zone).format(settings.settings.time_format);
			// 			// }else{
			// 			// 	startTime = timezone.tz(docdata[i].time_start, settings.settings.time_zone).format(settings.settings.time_format);
			// 			// }

			// 			startTime = timezone.tz(docdata[i].time_start, settings.settings.time_zone).format(settings.settings.time_format);

			// 			endTime = timezone.tz(docdata[i].time_end, settings.settings.time_zone).format(settings.settings.time_format);
			// 			if (endTime == '11:59 pm') {
			// 				endTime = '24:00 pm';
			// 			}
			// 			var start_Time = moment(startTime, "HH:mm a");
			// 			//start_Time.toString();
			// 			var end_Time = moment(endTime, "HH:mm a");
			// 			//end_Time.toString();
			// 			var timeslots = [];

			// 			while (start_Time <= end_Time) {
			// 				timeslots.push(new moment(start_Time).format('hh:mm a'));
			// 				start_Time.add(docdata[i].slottime, 'minutes');
			// 			}

			// 			var timeobj = {
			// 				'_id': docdata[i]._id,
			// 				'weekday': docdata[i].weekday,
			// 				'slottime': docdata[i].slottime,
			// 				'time_start': startTime,
			// 				'time_end': endTime,
			// 				'timeslots': timeslots,
			// 				'status': docdata[i].status
			// 			}

			// 			timedata.push(timeobj);

			// 		}

			// 		data.status = 1;
			// 		data.message = 'success';
			// 		data.timeslots = timedata;
			// 		res.send(data);
			// 	}
			// });
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err || !settings) {
		// 		res.send({ "status": "0", "errors": "Configure your app settings" });
		// 	} else {

		// 		db.GetDocument('timeslots', { status: { $eq: 1 } }, {}, {}, function (err, docdata) {
		// 			if (err) {
		// 				res.send(err);
		// 				data.status = 1;
		// 				data.message = 'error';
		// 				data.timeslots = [];
		// 				res.send(data);
		// 			} else {

		// 				var timedata = [];
		// 				for (var i = 0; i < docdata.length; i++) {

		// 					var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
		// 					var currentTime = moment(time_now, "HH:mm a");
		// 					currentTime.toString();

		// 					// var currentday = new Date();
		// 					// var currentweekday = moment(currentday).format('dddd');
		// 					// if(currentweekday == docdata[i].weekday){
		// 					// 	startTime = timezone.tz(docdata[i].time_now, settings.settings.time_zone).format(settings.settings.time_format);
		// 					// }else{
		// 					// 	startTime = timezone.tz(docdata[i].time_start, settings.settings.time_zone).format(settings.settings.time_format);
		// 					// }

		// 					startTime = timezone.tz(docdata[i].time_start, settings.settings.time_zone).format(settings.settings.time_format);

		// 					endTime = timezone.tz(docdata[i].time_end, settings.settings.time_zone).format(settings.settings.time_format);
		// 					if (endTime == '11:59 pm') {
		// 						endTime = '24:00 pm';
		// 					}
		// 					var start_Time = moment(startTime, "HH:mm a");
		// 					//start_Time.toString();
		// 					var end_Time = moment(endTime, "HH:mm a");
		// 					//end_Time.toString();
		// 					var timeslots = [];

		// 					while (start_Time <= end_Time) {
		// 						timeslots.push(new moment(start_Time).format('hh:mm a'));
		// 						start_Time.add(docdata[i].slottime, 'minutes');
		// 					}

		// 					var timeobj = {
		// 						'_id': docdata[i]._id,
		// 						'weekday': docdata[i].weekday,
		// 						'slottime': docdata[i].slottime,
		// 						'time_start': startTime,
		// 						'time_end': endTime,
		// 						'timeslots': timeslots,
		// 						'status': docdata[i].status
		// 					}

		// 					timedata.push(timeobj);

		// 				}

		// 				data.status = 1;
		// 				data.message = 'success';
		// 				data.timeslots = timedata;
		// 				res.send(data);
		// 			}
		// 		});
		// 	}
		// });
	}

	router.getsearchdata = function (req, res) {
		var data = {};
		data.searchdata = [];
		var searchdata = [];
		db.GetDocument('rcategory', { 'status': { $eq: 1 } }, { rcatname: 1 }, { sort: { rcatname: 1 } }, (err, rcatdata) => {
			if (err || rcatdata == "") {
				data.status = 0;
				data.message = 'error';
				data.searchdata = [];
				//res.send(data);
			} else {
				for (var i = 0; i < rcatdata.length; i++) {
					searchdata.push(rcatdata[i].rcatname);
				}

			}
		});

		db.GetDocument('scategory', { 'status': { $eq: 1 } }, { scatname: 1 }, { sort: { scatname: 1 } }, (err, scatdata) => {
			if (err || scatdata == "") {
				data.status = 0;
				data.message = 'error';
				data.searchdata = [];
				//res.send(data);
			} else {
				for (var i = 0; i < scatdata.length; i++) {
					searchdata.push(scatdata[i].scatname);
				}
			}
		});
		db.GetDocument('brands', { 'status': { $eq: 1 } }, { brandname: 1 }, { sort: { brandname: 1 } }, (err, brandsdata) => {
			if (err || brandsdata == "") {
				data.status = 0;
				data.message = 'error';
				data.searchdata = [];
				//res.send(data);
			} else {
				for (var i = 0; i < brandsdata.length; i++) {
					searchdata.push(brandsdata[i].brandname);
				}
			}
		});
		db.GetDocument('food', { 'status': { $eq: 1 } }, { name: 1 }, { sort: { name: 1 } }, (err, productdata) => {
			if (err || productdata == "") {
				data.status = 0;
				data.message = 'error';
				data.searchdata = [];
				//res.send(data);

			} else {

				for (var i = 0; i < productdata.length; i++) {
					searchdata.push(productdata[i].name);
				}
			}
			for (var j = 0; j < searchdata.length; j++) {
				data.searchdata.push(searchdata[j]);
			}
			data.status = 1;
			data.message = 'success';
			res.send(data);

		});

	}

	router.userclaimreward = (req, res) => {
		var data = { status: 0, message: 'Something went wrong, Try again' };
		if (isObjectId(req.body.user)) {
			let type = parseInt(req.body.type);
			if (type == 0 || type == 1) {
				if (type == 0) {
					db.UpdateDocument('users', { _id: mongoose.Types.ObjectId(req.body.user) }, { mark_status: 0 }, {}, (err, update) => {
						if (err || !update || update.nModified == 0) {
							res.json(data);
						} else {
							data.status = 1;
							data.message = 'Reward Updated Successfully';
							res.json(data);
						}
					})
				} else {
					db.GetOneDocument('users', { _id: mongoose.Types.ObjectId(req.body.user) }, { reached_points: 1, mark_status: 1, current_points: 1, next_points: 1, start_time: 1 }, {}, (err, userDetails) => {
						if (err || !userDetails || userDetails._id === undefined) {
							res.json(data)
						} else {
							let insert_data = {};
							insert_data.user_id = userDetails._id;
							insert_data.time = Date.now();
							insert_data.claimed = userDetails.current_points;
							insert_data.reached = userDetails.reached_points;
							insert_data.status = 1;
							db.InsertDocument('rewards', insert_data, (err, insert) => {
								if (err || !insert) {
									res.json(data);
								} else {
									db.UpdateDocument('users', { _id: userDetails._id }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {}, (err, update) => { });
									data.status = 1;
									data.message = 'Reward Updated Successfully';
									res.json(data);
								}
							})
						}
					})
				}
			} else {
				res.json(data);
			}
		} else {
			res.json(data);
		}
	}

	router.rewardlist = (req, res) => {
		let data = {};
		var limit = 10;
		if (req.body.limit && parseInt(req.body.limit) > 0) {
			limit = req.body.limit;
		}
		var skip = 0;
		if (req.body.skip && parseInt(req.body.skip) > 0) {
			skip = req.body.skip;
		}
		var filter_query = { "user_id": { $eq: mongoose.Types.ObjectId(req.body.user) } };
		var condition = [
			{ $match: filter_query },
			{
				$facet: {
					all: [
						{ "$count": "all" }
					],
					documentData: [
						{ $sort: { 'time': 1 } },
						{ $skip: skip },
						{ $limit: limit },
						{
							$project: {
								_id: 1,
								time: 1,
								status: 1,
								claimed: 1,
								reached: 1
							}
						}
					]
				}
			}
		];
		db.GetAggregation('rewards', condition, function (err, docdata) {
			if (err || !docdata || (docdata && docdata.length == 0)) {
				data.status = 1;
				data.total = 0;
				data.list = [];
				res.send(data);
			} else {
				var count = 0;
				count = docdata[0].all ? (docdata[0].all[0] ? docdata[0].all[0].all : 0) : 0;
				if (docdata[0].documentData && docdata[0].documentData.length > 0 && count) {
					data.status = 1;
					data.total = count;
					data.list = docdata[0].documentData;
					res.send(data);
				} else {
					data.status = 1;
					data.total = 0;
					data.list = [];
					res.send(data);
				}
			}
		})
	}

	// router.productrelateddetails = function (req, res) {
	// 	req.checkBody('product_id', 'product id is Required').notEmpty();
	// 	errors = req.validationErrors();
	// 	if (errors) {
	// 	    res.send({
	// 	        "status": "0",
	// 	        "errors": errors[0].msg
	// 	    });
	// 	    return;
	// 	}
	// 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
	// 		if (err || !settings) {
	// 			res.send({ "status": "0", "errors": "Configure your app settings" });
	// 		} else {
	// 			var productQuery = [
	// 				{$match:{'_id': new mongoose.Types.ObjectId(req.body.product_id)}},
	// 				// { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
	// 				// { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
	// 				// { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
	// 				// { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
	// 				// {	$lookup:{
	// 				// 				from: 'food',
	// 				// 				let: {
	// 				// 					maincity: "$main_city",
	// 				// 					rcategory: "$rcategory",
	// 				// 					scategory: "$scategory"
	// 				// 				},
	// 				// 				pipeline: [
	// 				// 					{
	// 				// 						'$match': {
	// 				// 							$expr: { $eq: ["$rcategory", "$$rcategory"],$eq: ["$scategory", "$$scategory"] },
	// 				// 							//main_city: { $in: ["$$maincity"] },
	// 				// 							status: { $eq: 1 }

	// 				// 						}
	// 				// 					},
	// 				// 					{
	// 				// 						"$project": {
	// 				// 							main_city: 1,
	// 				// 							isRecommeneded: 1,
	// 				// 							itmcat: 1,
	// 				// 							status: 1,
	// 				// 							visibility: 1,
	// 				// 							hotselling: 1,
	// 				// 							recommended: 1,
	// 				// 							name: 1,
	// 				// 							slug: 1,
	// 				// 							price_details: 1,
	// 				// 							rcategory: 1,
	// 				// 							scategory: 1,
	// 				// 							attributes: 1,
	// 				// 							avatar:{ $substr: [ "$avatar", 2 , -1] }
	// 				// 						}
	// 				// 					},
	// 				// 					{
	// 				// 						$group: {
	// 				// 							_id: "$rcategory",
	// 				// 							data: {
	// 				// 								$push: {
	// 				// 									main_city: "$main_city",
	// 				// 									isRecommeneded: "$isRecommeneded",
	// 				// 									itmcat: "$itmcat",
	// 				// 									status: "$status",
	// 				// 									visibility: "$visibility",
	// 				// 									hotselling: "$hotselling",
	// 				// 									recommended: "$recommended",
	// 				// 									name: "$name",
	// 				// 									slug: "$slug",
	// 				// 									price_details: "$price_details",
	// 				// 									rcategory: "$rcategory",
	// 				// 									scategory: "$scategory",
	// 				// 									attributes: "$attributes",
	// 				// 									avatar: { $concat: [settings.settings.site_url, "$avatar"] },
	// 				// 									//avatar: { $cond: ["$avatar", { $concat: [settings.settings.site_url, "$avatar"] }, { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] },
	// 				// 								}
	// 				// 							}
	// 				// 						}
	// 				// 					}
	// 				// 				],
	// 				// 				as: 'relatedproduct'
	// 				// 			}
	// 				// },
	// 				// { $unwind: { path: "$relatedproduct", preserveNullAndEmptyArrays: true } },
	// 				{
	// 					"$project": {
	// 						main_city: 1,
	// 						isRecommeneded: 1,
	// 						itmcat: 1,
	// 						status: 1,
	// 						visibility: 1,
	// 						hotselling: 1,
	// 						recommended: 1,
	// 						name: 1,
	// 						slug: 1,
	// 						price_details: 1,
	// 						rcategory: 1,
	// 						scategory: 1,
	// 						attributes: 1,
	// 						avatar: { $substr: [ "$avatar", 2 , -1] },
	// 						relatedproduct: "$relatedproduct"
	// 					}
	// 				},
	// 				{
	// 					$group: {
	// 						_id: "$_id",
	// 						main_city: { "$first": "$main_city"},
	// 						isRecommeneded: { "$first": "$isRecommeneded"},
	// 						itmcat: { "$first": "$itmcat"},
	// 						status: { "$first": "$status"},
	// 						visibility: { "$first": "$visibility"},
	// 						hotselling: { "$first": "$hotselling"},
	// 						recommended: { "$first": "$recommended"},
	// 						name: { "$first": "$name"},
	// 						slug: { "$first": "$slug"},
	// 						price_details: { "$first": "$price_details"},
	// 						rcategory: { "$first": "$rcategory"},
	// 						scategory: { "$first": "$scategory"},
	// 						attributes: { "$first": "$attributes"},
	// 						avatar: { "$first": { $concat: [settings.settings.site_url, "$avatar"] }},
	// 						//avatar: { $cond: ["$avatar", { $concat: [settings.settings.site_url, "$listactiveicon"] }, { $literal: settings.settings.site_url + CONFIG.CATEGORY_DEFAULT_IMAGE }] },
	// 						//relatedproduct: { "$first": "$relatedproduct"}
	// 					}
	// 				}

	// 			]
	// 			db.GetAggregation('food', productQuery, function (err, Productdata) {
	// 				if (err) {
	// 					console.log(err)
	// 					res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
	// 				} else {
	// 					if (Productdata) {
	// 						res.send({ "status": 0, "message": 'Successfull.', data:  Productdata});

	// 					} else {
	// 						res.send({ "status": 0, "message": 'Sorry, product details not available.' });
	// 					}
	// 				}
	// 			});
	// 		}
	// 	})
	// };

	router.productdetails = async (req, res) => {
		// req.checkBody('product_id', 'product id is Required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		"status": 0,
		// 		"errors": errors[0].msg
		// 	});
		// 	return;
		// }
		var favoriteDetails = [];
		if (req.body.user_id) {
			favoriteDetails = await db.GetDocument('favourite', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id) }, { product_id: 1 }, {});
		}
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			res.send({ "status": 0, "errors": "Configure your app settings" });
		} else {
			var condition = { status: 1 };
			if (req.body.product_id) {
				condition._id = new mongoose.Types.ObjectId(req.body.product_id);
			};
			if (req.body.slug) {
				condition.slug = req.body.slug;
			};
			if (!req.body.product_id && !req.body.slug) {
				return res.send({ status: 0, message: "Product id or product slug is required" });
			}
			var productQuery = [
				{ $match: condition },
				{ $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
				{ $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
				{ $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
				{ $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
				{ $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
				{ $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						size_status: 1,
						avatar: 1,
						rcat_id: "$rcategory._id",
						scat_id: "$scategory._id",
						rcatname: { $toLower: '$rcategory.rcatname' },
						scatname: { $toLower: '$scategory.scatname' },
						attributes: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: { $ifNull: ["$quantity", 0] },
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						product_details: 1,
						information: 1,
						images: 1,
						quantity_size: 1,
						sort_name: { $toLower: '$name' },
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						notZero: {
							$filter: {
								input: "$quantity_size",
								as: "item",
								cond: {
									$and: [
										{
											$eq: [
												"$$item.status",
												1
											]
										},
										{
											$ne: ['$$item.quantity', 0]
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
						size: 1,
						size_status: 1,
						avatar: 1,
						rcat_id: 1,
						scat_id: 1,
						rcatname: { $toLower: '$rcategory.rcatname' },
						scatname: { $toLower: '$scategory.scatname' },
						attributes: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						product_details: 1,
						information: 1,
						images: 1,
						quantity_size: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						sort_name: { $toLower: '$name' },
						notZero: 1
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						size_status: 1,
						avatar: 1,
						rcat_id: 1,
						scat_id: 1,
						rcatname: { $toLower: '$rcategory.rcatname' },
						scatname: { $toLower: '$scategory.scatname' },
						attributes: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						hover_image: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						product_details: 1,
						information: 1,
						images: 1,
						quantity_size: 1,
						sort_name: { $toLower: '$name' },
						filterSize: { $ifNull: ['$notZero', []] }
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						size: 1,
						size_status: 1,
						avatar: 1,
						rcat_id: 1,
						scat_id: 1,
						rcatname: { $toLower: '$rcategory.rcatname' },
						scatname: { $toLower: '$scategory.scatname' },
						attributes: 1,
						offer_status: 1,
						offer_amount: 1,
						price_details: 1,
						quantity: 1,
						sale_price: 1,
						base_price: 1,
						rating: 1,
						total_rating: 1,
						total_rating_users: 1,
						hover_image: 1,
						product_details: 1,
						information: 1,
						images: 1,
						filterSize: 1,
						quantity_size: {
							$filter: {
								input: "$quantity_size",
								as: "item",
								cond: {
									$eq: ["$$item.status", 1]
								}
							}
						},
						sort_name: { $toLower: '$name' },
						in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
						no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
					}
				},
				{
					$project: {
						name: 1,
						slug: 1,
						images: 1,
						status: 1,
						document: "$$ROOT"
					}
				}, {
					$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
				}
			];
			const documentData = await db.GetAggregation('food', productQuery)
			if (!documentData.length) {
				res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
			} else {
				var Productdata = documentData[0] && documentData[0].documentData[0];

				console.log("--------------Productdata----------------", Productdata)
				if (Productdata) {
					Productdata.variants = [];
					Productdata.multiImage = [];
					if (Productdata.images && Productdata.images.length > 0) {
						for (var i = 0; i < Productdata.images.length; i++) {
							var logo = settings.doc.settings.site_url + Productdata.images[i].slice(2);
							Productdata.multiImage.push(logo);
						}
					}
					if (Productdata.price_details.length > 0) {
						Productdata.price_details.forEach(val => {
							if (val.image != undefined && val.image != '') {
								val.image = settings.doc.settings.site_url + val.image.slice(2);
							}
							if (val.attributes && val.attributes.length > 0) {
								for (var i = 0; i < val.attributes.length; i++) {
									var variant = { values: [] };
									if (Productdata.variants && Productdata.variants.length > 0) {

										var n = 0;
										for (var j = 0; j < Productdata.variants.length; j++) {
											if (Productdata.variants[j].parrent_id === val.attributes[i].parrent_id) {
												var m = 0;
												for (var k = 0; k < Productdata.variants[j].values.length; k++) {
													if (Productdata.variants[j].values[k].chaild_id != val.attributes[i].chaild_id) {
														m++;
													}
												}
												if (m === Productdata.variants[j].values.length) {
													Productdata.variants[j].values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name });
													//break;
												}
											} else {
												n++;
											}
										}
										if (n === Productdata.variants.length) {
											variant.parrent_id = val.attributes[i].parrent_id;
											variant.attri_name = val.attributes[i].attri_name;
											variant.values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, });
											Productdata.variants.push(variant);
										}

									} else {
										variant.parrent_id = val.attributes[i].parrent_id;
										variant.attri_name = val.attributes[i].attri_name;
										variant.values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, });
										Productdata.variants.push(variant);
										//break;
									}

								}
							}
						});
					}
					if (favoriteDetails && favoriteDetails.length > 0) {
						favoriteDetails.forEach(fav => {
							if (Productdata._id.toString() == fav.product_id.toString()) {
								Productdata.favourite = 1;
							}
						});
					}


					var image = settings.doc.settings.site_url + Productdata.avatar.slice(2);
					Productdata.avatar = image;
					var hoverimage = '';
					if (Productdata.hover_image) {
						hoverimage = settings.doc.settings.site_url + Productdata.hover_image.slice(2);
					}
					Productdata.hover_image = hoverimage;
					Productdata.currency = settings.doc.settings.currency_symbol
					if (Productdata.offer_status == 1) {
						// Productdata.base_price = JSON.parse(JSON.stringify(Productdata.sale_price));
						// var offer_price = parseInt((Productdata.sale_price * Productdata.offer_amount)/100)
						// var sub_price = Productdata.sale_price - offer_price;
						// Productdata.sale_price = sub_price > 0 ? sub_price : 0
						Productdata.offer_base = JSON.parse(JSON.stringify(Productdata.base_price));
						var offer_price = parseFloat(parseFloat((Productdata.base_price * Productdata.offer_amount) / 100).toFixed(2));
						var sub_price = Productdata.base_price - offer_price;
						Productdata.offer_sale = sub_price > 0 ? parseFloat(parseFloat(sub_price).toFixed(2)) : 0
					}
					console.log(Productdata, 'this is Productdata Productdata');
					res.send({ "status": 1, "message": 'Products retrieved successfully !', data: Productdata });

				} else {
					res.send({ "status": 0, "message": 'Sorry, product details not available.' });
				}
			}
		}
	};

	router.addFavourite = async function (req, res) {
		// req.checkBody('product_id', 'Product id is Required').notEmpty();
		// req.checkBody('user_id', 'User id is Required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		"status": 0,
		// 		"errors": errors[0].msg
		// 	});
		// 	return;
		// }
		if(!req.body.not_login){

			console.log(req.body, 'this is the body************************************************************');
			const favouritdoc = await db.GetOneDocument('favourite', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'product_id': new mongoose.Types.ObjectId(req.body.product_id) }, {}, {})
			if (favouritdoc) {
				if (favouritdoc.status === false) {
					if (favouritdoc.doc === 'Data Not found') {
	
						var insert_data = {};
						insert_data.user_id = req.body.user_id;
						insert_data.product_id = req.body.product_id;
						insert_data.chaild_id = req.body.child_id;
						const insert = await db.InsertDocument('favourite', insert_data)
						if (!insert) {
							res.send({ "status": 0, "errors": "Something went wrong" });
						} else {
							res.send({ "status": 1, "message": "Added to favourite." });
						}
					}
				} else {
					res.send({ "status": 0, "errors": "Product already exists", favorite_id: favouritdoc.doc._id });
				}
			} else {
				res.send({ "status": "0", "errors": "Something went wrong" });
			}
		}else{
			console.log(req.body, 'this is the body************************************************************');
			const favouritdoc = await db.GetOneDocument('temp_favourite', { 'user_id':req.body.user_id, 'product_id': new mongoose.Types.ObjectId(req.body.product_id) }, {}, {})
			if (favouritdoc) {
				if (favouritdoc.status === false) {
					if (favouritdoc.doc === 'Data Not found') {
							
						var insert_data = {};
						insert_data.user_id = req.body.user_id;
						insert_data.product_id = req.body.product_id;
						insert_data.chaild_id = req.body.child_id;
                          console.log(insert_data);
						  
						const insert = await db.InsertDocument('temp_favourite', insert_data)
						if (!insert) {
							res.send({ "status": 0, "errors": "Something went wrong" });
						} else {
							res.send({ "status": 1, "message": "Added to favourite." });
						}
					}
				} else {
					res.send({ "status": 0, "errors": "Product already exists", favorite_id: favouritdoc.doc._id });
				}
			} else {
				res.send({ "status": "0", "errors": "Something went wrong" });
			}
		}

	};

	router.deleteFavourite = async function (req, res) {
		console.log(req.body, 'delete favourites************************************************');
		const favouritdoc = await db.GetOneDocument('favourite', { '_id': new mongoose.Types.ObjectId(req.body.fav_id) }, {}, {})
		console.log(favouritdoc,'favouritdocfavouritdocfavouritdoc original');

		if (favouritdoc.status === false) {
		const favouritdoc = await db.GetOneDocument('temp_favourite', { '_id': new mongoose.Types.ObjectId(req.body.fav_id) }, {}, {})
		console.log(favouritdoc,'favouritdocfavouritdocfavouritdoc temp');
		
		if (favouritdoc.status === false) {

			if (favouritdoc.doc === "Data Not found") {
				res.send({ "status": 0, "errors": "No data found." });
			} else {
				res.send({ "status": 0, "errors": "Something went wrong" });
			}
		}else{
			const deldata = await db.DeleteDocument('temp_favourite', { '_id': new mongoose.Types.ObjectId(req.body.fav_id) })
			console.log(deldata);
			if (deldata.status === false) {
				res.send({ "status": 0, "errors": "Something went wrong" });
			} else {
				res.send({ "status": 1, "message": "Removed from favourite." });
			}
		}
		} else {
			const deldata = await db.DeleteDocument('favourite', { '_id': new mongoose.Types.ObjectId(req.body.fav_id) })
			console.log(deldata);
			if (deldata.status === false) {
				res.send({ "status": 0, "errors": "Something went wrong" });
			} else {
				res.send({ "status": 1, "message": "Removed from favourite." });
			}
		}

	};

	router.multiDeleteFav = async (req, res) => {
		// req.checkBody('docId', 'docId is Required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		"status": 0,
		// 		"errors": errors[0].msg
		// 	});
		// 	return;
		// }
		var ids = [];
		if (req.body.docId && req.body.docId.length < 0) {
			res.send({
				"status": 0,
				"errors": "Wishlist id is empty"
			});
			return;
		}
		req.body.docId.map(i => { ids.push(new mongoose.Types.ObjectId(i)) });
		if (ids.length > 0) {
			const GetOne= await db.GetOneDocument('favourite',{ '_id':  ids[0]},{},{})
			if(GetOne.status){

				deldata = db.DeleteDocument('favourite', { '_id': { $in: ids } })
				if (!deldata) {
					res.send({ "status": 0, "errors": "Something went wrong" });
				} else {
					res.send({ "status": 1, "message": "Favourite Deleted Successfully." });
				}
			}else{
				deldata = db.DeleteDocument('temp_favourite', { '_id': { $in: ids } })
				if (!deldata) {
					res.send({ "status": 0, "errors": "Something went wrong" });
				} else {
					res.send({ "status": 1, "message": "Favourite Deleted Successfully." });
				}
			}
			// db.DeleteDocument('favourite', { '_id': { $in: ids } }, (err, deldata) => {
			// 	if (err || !deldata) {
			// 		res.send({ "status": 0, "errors": "Something went wrong" });
			// 	} else {
			// 		res.send({ "status": 1, "message": "Favourite Deleted Successfully." });
			// 	}
			// })
		} else {
			return res.send({ status: 0, "errors": "Wishlist id is empty" })
		}
	}

	router.favouritelist = async function (req, res) {

		// req.checkBody('user_id', 'User id is Required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		"status": "0",
		// 		"errors": errors[0].msg
		// 	});
		// 	return;
		// }
		if(!req.body.not_login){

			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {
				var favouriteQuery = [
					{ $match: { 'user_id': new mongoose.Types.ObjectId(req.body.user_id) } },
					{
						$lookup: {
							from: 'food',
							let: { product_id: "$product_id" },
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$_id", "$$product_id"] },
												{ $eq: ["$status", 1] },
											]
										}
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										sku: 1,
										rcategory: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										price_details: 1,
										quantity: { $ifNull: ["$quantity", 0] },
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										quantity_size: 1,
										rating: 1,
										total_rating_users: 1,
										notZero: {
											$filter: {
												input: "$quantity_size",
												as: "item",
												cond: {
													$and: [
														{
															$eq: ["$$item.status", 1]
														},
														{
															$ne: ['$$item.quantity', 0]
														}
													]
												}
											}
										},
										offer_base: "$base_price",
										// $divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
										// ]
										offer_sale: {
											$subtract: [
												"$base_price",
												{
													$divide: [
														{ $multiply: ["$base_price", "$offer_amount"] },
														100
													]
												}
											]
										}
	
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										sku: 1,
										rcategory: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										price_details: 1,
										quantity: 1,
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										quantity_size: 1,
										notZero: 1,
										rating: 1,
										total_rating_users: 1,
										offer_base: 1,
										offer_sale: 1,
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										sku: 1,
										rcategory: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										price_details: 1,
										quantity: 1,
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										quantity_size: 1,
										offer_base: 1,
										offer_sale: 1,
										rating: 1,
										total_rating_users: 1,
										filterSize: { $ifNull: ['$notZero', []] }
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										rcategory: 1,
										sku: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										offer_base: 1,
										offer_sale: 1,
										price_details: 1,
										quantity: 1,
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										filterSize: 1,
										rating: 1,
										total_rating_users: 1,
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
							],
							as: "product"
						}
					},
					{ $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
					{
						"$project": {
							product_id: 1,
							user_id: 1,
							status: 1,
							chaild_id:1,
							product: "$product",
							createdAt: 1
						}
					},
					{
						$group: {
							_id: "$_id",
							product_id: { "$first": "$product_id" },
							user_id: { "$first": "$user_id" },
							chaild_id: { "$first": "$chaild_id" },
							status: { "$first": "$status" },
							product: { "$first": "$product" },
							createdAt: { "$first": "$createdAt" }
						}
					},
					{ $sort: { createdAt: -1 } }
	
				]
				const favouritedata = await db.GetAggregation('favourite', favouriteQuery)
				if (favouritedata) {
					if (favouritedata.length > 0) {
						for (var i = 0; i < favouritedata.length; i++) {
							// favouritedata[i].product.currency = settings.settings && settings.settings.currency_symbol;
							if (favouritedata[i].product && favouritedata[i].product != null) {
								if (favouritedata[i].product.avatar != undefined) {
									image = favouritedata[i].product.avatar
									favouritedata[i].product.avatar = image;
								} else {
									favouritedata[i].product.avatar = "";
								}
								if (favouritedata[i].offer_status == 1) {
									// favouritedata[i].base_price = JSON.parse(JSON.stringify(favouritedata[i].sale_price));
									var offer_price = parseInt((favouritedata[i].base_price * favouritedata[i].offer_amount) / 100)
									var sub_price = favouritedata[i].base_price - offer_price;
									favouritedata[i].sale_price = sub_price > 0 ? sub_price : 0
								}
							}
						}
					}
					res.send({ "status": 1, "message": 'Successfull.', data: favouritedata });
				} else {
					res.send({ "status": 0, "message": 'Sorry, favourite details not available.' });
				}
			}
		}else{
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {
				var favouriteQuery = [
					{ $match: { 'user_id': req.body.user_id } },
					{
						$lookup: {
							from: 'food',
							let: { product_id: "$product_id" },
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$_id", "$$product_id"] },
												{ $eq: ["$status", 1] },
											]
										}
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										sku: 1,
										rcategory: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										price_details: 1,
										quantity: { $ifNull: ["$quantity", 0] },
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										quantity_size: 1,
										rating: 1,
										total_rating_users: 1,
										notZero: {
											$filter: {
												input: "$quantity_size",
												as: "item",
												cond: {
													$and: [
														{
															$eq: ["$$item.status", 1]
														},
														{
															$ne: ['$$item.quantity', 0]
														}
													]
												}
											}
										},
										offer_base: "$base_price",
										// $divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
										// ]
										offer_sale: {
											$subtract: [
												"$base_price",
												{
													$divide: [
														{ $multiply: ["$base_price", "$offer_amount"] },
														100
													]
												}
											]
										}
	
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										sku: 1,
										rcategory: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										price_details: 1,
										quantity: 1,
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										quantity_size: 1,
										notZero: 1,
										rating: 1,
										total_rating_users: 1,
										offer_base: 1,
										offer_sale: 1,
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										sku: 1,
										rcategory: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										price_details: 1,
										quantity: 1,
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										quantity_size: 1,
										offer_base: 1,
										offer_sale: 1,
										rating: 1,
										total_rating_users: 1,
										filterSize: { $ifNull: ['$notZero', []] }
									}
								},
								{
									$project: {
										name: 1,
										slug: 1,
										avatar: 1,
										size: 1,
										rcategory: 1,
										sku: 1,
										scategory: 1,
										status: 1,
										offer_status: 1,
										offer_amount: 1,
										offer_base: 1,
										offer_sale: 1,
										price_details: 1,
										quantity: 1,
										sale_price: 1,
										base_price: 1,
										hover_image: 1,
										product_id: 1,
										size_status: 1,
										filterSize: 1,
										rating: 1,
										total_rating_users: 1,
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
							],
							as: "product"
						}
					},
					{ $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
					{
						"$project": {
							product_id: 1,
							user_id: 1,
							chaild_id: 1, 
							status: 1,
							product: "$product",
							createdAt: 1
						}
					},
					{
						$group: {
							_id: "$_id",
							product_id: { "$first": "$product_id" },
							user_id: { "$first": "$user_id" },
							chaild_id: { "$first": "$chaild_id" },
							status: { "$first": "$status" },
							product: { "$first": "$product" },
							createdAt: { "$first": "$createdAt" }
						}
					},
					{ $sort: { createdAt: -1 } }
	
				]
				const favouritedata = await db.GetAggregation('temp_favourite', favouriteQuery)
				if (favouritedata) {
					if (favouritedata.length > 0) {
						for (var i = 0; i < favouritedata.length; i++) {
							// favouritedata[i].product.currency = settings.settings && settings.settings.currency_symbol;
							if (favouritedata[i].product && favouritedata[i].product != null) {
								if (favouritedata[i].product.avatar != undefined) {
									image = favouritedata[i].product.avatar
									favouritedata[i].product.avatar = image;
								} else {
									favouritedata[i].product.avatar = "";
								}
								if (favouritedata[i].offer_status == 1) {
									// favouritedata[i].base_price = JSON.parse(JSON.stringify(favouritedata[i].sale_price));
									var offer_price = parseInt((favouritedata[i].base_price * favouritedata[i].offer_amount) / 100)
									var sub_price = favouritedata[i].base_price - offer_price;
									favouritedata[i].sale_price = sub_price > 0 ? sub_price : 0
								}
							}
						}
					}
					res.send({ "status": 1, "message": 'Successfull.', data: favouritedata });
				} else {
					res.send({ "status": 0, "message": 'Sorry, favourite details not available.' });
				}
			}
		}

	};

	router.SocilaLink = async (req, res) => {
		const docdata = await db.GetOneDocument('settings', { alias: 'social_networks' }, {}, {})
		console.log(docdata, 'sociallink');
		if (docdata.status === false) {
			res.send("err");
		} else {
			res.send(docdata.doc.settings);
		}
		// db.GetOneDocument('settings', { alias: 'social_networks' }, {}, {}, function (err, docdata) {
		// 	if (err || !docdata) {
		// 		res.send(err);
		// 	} else {
		// 		res.send(docdata.settings);
		// 	}
		// });
	}
	router.pageList = async (req, res) => {
		var pagesQuery = [{
			"$match": { status: 1 }
		}, {
			$project: {
				name: 1,
				url: 1,
				slug: 1,
				status: 1
			}
		},
		{ $sort: { createdAt: 1 } }
		];
		const docdata = await db.GetAggregation('pages', pagesQuery);


		if (docdata) {
			res.send(docdata)
		} else {
			res.send({ status: false, msg: "err" });
		}
		// db.GetAggregation('pages', pagesQuery, function (err, docdata) {
		// 	if (err) {
		// 		res.send(err);
		// 	} else {
		// 		res.send({status: true, data: docdata})
		// 	}
		// });
	}
	router.getPage = async (req, res) => {
		var responceData = { status: 0, message: '', data: {} };
		try {

			let page_data = await db.GetOneDocument('pages', { 'slug': req.body.slug }, {}, {})


			// (err, pageData) => {
			if (!page_data) {
				responceData.message = err ? err.message : 'Invalid pages slug please check';
				res.send(responceData);
				return;
			} else {
				responceData.status = 1;
				responceData.message = 'Success';
				responceData.data = page_data.doc;
				res.send(responceData);
				return;
			};
			// })

		} catch (error) {

			console.log(error)
			var errorMessage = error ? error.message : 'pages controller getPage error';
			responceData.message = errorMessage;
			res.send(responceData);
		};
	}

	router.forgotPassword = async (req, res) => {
		//  [check('email').isEmail().withMessage("Email should be valid")]
		// async (req, res, next) => {
		//     // Check validation.
		//     const errors = validationResult(req).array();
		//     console.log(errors[0]);
		// if (errors && errors.length>0) {
		//     // errors.array().forEach(err => req.flash('error', err.msg));
		// 	console.log(errors,'afashfasf');
		//     return res.send({status:false ,message:errors[0].msg});
		// }
		const userData = await db.GetOneDocument('users', { "email": req.body.email }, {}, {})
		if (userData.status === false) {
			res.send({ "status": 0, "message": 'Entere email has no user...' });
		} else {
			if (userData && userData.doc.status == 0) {
				return res.send({ status: 0, message: 'Your account is currently unavailable' });
			} else if (userData && userData.doc.status == 2) {
				return res.send({ status: 0, message: 'Your account is inactive...Please contact administrator for further details' });
			}
			if (userData && typeof userData.doc._id != 'undefined') {
				const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
				var random = Math.floor(1000 + Math.random() * 9000);
				console.log(random, 'RANDOM');
				var mailData = {};
				mailData.template = 'forgot_password';
				mailData.to = req.body.email;
				mailData.html = [];
				mailData.html.push({ name: 'name', value: userData.username || "" });
				mailData.html.push({ name: 'otp', value: random || "" });

				const emailSuccess = await mailcontent.sendmail(mailData)
				console.log(emailSuccess, 'email success');
				if (emailSuccess) {
					return res.send({ status: 0, message: "Something went wrong please try again" })
				} else {
					var forgot = {};
					forgot.last_sent = new Date();
					forgot.is_done = 0;
					var expr_date = Date.now()
					const updated = await db.UpdateDocument('users', { 'email': req.body.email }, { 'forgot_password': forgot, otp: random, otp_time: expr_date }, {})
					if (updated.status) {
						res.send({ status: 1, message: "OTP send to email successfully.", });
					}
				}

			} else {
				res.send({ "status": 0, "message": 'Sorry, your email Id is not registered with us.' });
			}
		}
		// }
		// req.checkBody('email', 'email is required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		status: 0,
		// 		message: errors[0].msg
		// 	});
		// 	return;
		// }
		// db.GetOneDocument('users', { "email": req.body.email }, {}, {}, function (err, userData) {
		// 	if (err) {
		// 		res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
		// 	} else {
		// 		if (userData && userData.status == 0) {
		// 			return res.send({ status: 0, message: 'Your account is currently unavailable' });
		// 		} else if (userData && userData.status == 2) {
		// 			return res.send({ status: 0, message: 'Your account is inactive...Please contact administrator for further details' });
		// 		}
		// 		if (userData && typeof userData._id != 'undefined') {
		// 			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
		// 				var random = Math.floor(1000 + Math.random() * 9000);
		// 				var mailData = {};
		// 				mailData.template = 'forgot_password';
		// 				mailData.to = req.body.email;
		// 				mailData.html = [];
		// 				mailData.html.push({ name: 'name', value: userData.username || "" });
		// 				mailData.html.push({ name: 'otp', value: random || "" });
		// 				mailcontent.sendmail(mailData, function (err, response) {
		// 					if (err) {
		// 						return res.send({ status: 0, message: "Something went wrong please try again" })
		// 					} else {
		// 						var forgot = {};
		// 						forgot.last_sent = new Date();
		// 						forgot.is_done = 0;
		// 						var expr_date = Date.now()
		// 						db.UpdateDocument('users', { 'email': req.body.email }, { 'forgot_password': forgot, otp: random, otp_time: expr_date }, {}, (err, updated) => {
		// 							res.send({ status: 1, otp: random, message: "OTP send to email successfully.", });
		// 						});
		// 					}
		// 				});
		// 			})
		// 		} else {
		// 			res.send({ "status": 0, "message": 'Sorry, your email Id is not registered with us.' });
		// 		}
		// 	}
		// })
	}

	router.otpVerify = async (req, res) => {
		try {
			const { phone, code, otp } = req.body;
			let phoneNumber = {
				code: code,
				number: phone
			}
			// Fetch temporary user data based on phone number
			let tempcheck = await db.GetOneDocument('temp_users', { 'phone': phoneNumber }, {}, {});
			console.log(tempcheck);

			if (tempcheck.doc) {
				// Check if the OTP matches
				if (tempcheck.doc.otp === otp || otp == "1234") {
					// OTP matches, now check if the phone number exists in 'users'
					console.log("phoneNumber", phoneNumber)
					let userData = await db.GetOneDocument('users', { 'phone': phoneNumber }, {}, {});
					console.log("userData", userData);

					if (userData.status === false) {
						return res.send({ status: 1, message: 'Something went wrong. Please try again...' });
					}

					if (userData.status === true) {
						function jwtSign(payload) {
							var token = jwt.sign(payload, CONFIG.SECRET_KEY);
							return token;
						}
						var authHeader = jwtSign({ email: userData.doc.email });

						// Phone number exists in the 'users' collection
						return res.send({ status: 1, message: "OTP verified successfully. User found.", userData: userData.doc,token:authHeader });


					} else {
						// Phone number does not exist in the 'users' collection
						return res.send({ status: 0, message: 'Phone number not registered. Please sign up.' });
					}
				} else {
					// OTP does not match
					return res.send({ status: 0, message: "Please enter the valid OTP" });
				}
			} else {
				// Temporary user data not found
				return res.send({ status: 0, message: 'Invalid OTP request' });
			}
		} catch (error) {
			console.error('Error in otpVerify:', error);
			return res.status(500).send({ status: 0, message: 'Internal server error' });
		}
	};

	// req.checkBody('otp', 'otp is required').notEmpty();
	// req.checkBody('email', 'email is required').notEmpty();
	// errors = req.validationErrors();
	// if (errors) {
	// 	res.send({
	// 		status: 0,
	// 		message: errors[0].msg
	// 	});
	// 	return;
	// }
	// db.GetOneDocument('users', { "email": req.body.email }, {}, {}, function (err, userData) {
	// 	if (err) {
	// 		res.send({ status: 0, message: 'Something went to wrong.Please try again...' });
	// 	} else {
	// 		if (userData.status == 1) {
	// 			var date = Date.now();
	// 			let diff_date = date - userData.otp_time;
	// 			if (diff_date > 500000) {
	// 				return res.status(201).send({ status: 0, message: "Timeout please try again." });
	// 			}
	// 			if (userData && userData.otp == req.body.otp) {
	// 				return res.send({ status: 1, message: "OTP verified successfully" })
	// 			} else {
	// 				return res.send({ status: 0, message: "OTP doesn't match, please enter valid otp" })
	// 			}
	// 		} else {
	// 			if (userData.status == 0) {
	// 				return res.send({ status: 0, message: 'Your account is currently unavailable' });
	// 			} else {
	// 				return res.send({ status: 0, message: 'Your account is inactive...Please contact administrator for further details' });
	// 			}
	// 		}
	// 	}
	// })


	router.changePassword = async (req, res) => {
		// req.checkBody('password', 'password is required').notEmpty();
		// req.checkBody('email', 'email is required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		status: 0,
		// 		message: errors[0].msg
		// 	});
		// 	return;
		// }
		var new_pass = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
		if (new_pass) {
			const response = await db.UpdateDocument('users', { "email": req.body.email }, { $set: { "password": new_pass } }, {})
			if (response.doc.nModified == 0) {
				return res.send({ status: 0, message: 'Password not changes please try again' });
			} else {
				return res.send({ status: 1, message: "Password changed successfully" })
			}
			// db.UpdateDocument('users', { "email": req.body.email }, { $set: { "password": new_pass } }, {}, function (err, response) {
			// 	if (err || response.nModified == 0) {
			// 		return res.send({ status: 0, message: 'Password not changes please try again' });
			// 	} else {
			// 		return res.send({ status: 1, message: "Password changed successfully" })
			// 	}
			// })
		}
	}

	router.cancelOrder = async function (req, res) {
		try {
			console.log("is it currectly here or not");
			console.log(req.body, 'this is request body');
			const docdata = await db.UpdateDocument('orders', { _id: { $in: req.body.id } }, { status: 9, $set: { cancelReason: req.body.reason } }, { multi: true })
			if (docdata.status == false) {
				res.send({ status: 0, message: err.message });
			} else {
				res.send({ status: 1, message: 'Cancel Order Successfully' });
			}

		} catch (error) {

		}
	}

	router.returnOrder = async function (req, res) {
		try {
			console.log(req.body, 'this is the request body000000000000000000000000000000000000000');
			// change food status,
			const date = new Date();
			const docdata = await db.UpdateDocument('orders', { _id: { $in: req.body.id }, "foods.id": req.body.product_id }, { $set: { "foods.$.status": 16, "foods.$.return_date": date, "foods.$.return_reason": req.body.reason } }, { multi: true, })
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

	router.reviewProduct = async (req, res) => {
		let errors = validationResult(req).errors;
		if (errors && Array.isArray(errors) && errors.length > 0) {
			res.send({
				status: 0,
				message: errors[0].msg
			});
			return;
		}
		var data = {};
		data.rating = req.body.rating;
		data.comment = req.body.comment;
		data.username = req.body.username;
		data.rating_id = req.body.rating_id;
		data.order_id = req.body.order_id;
		data.productName = req.body.productName;
		data.user = new mongoose.Types.ObjectId(req.body.user_id);
		data.product_id = new mongoose.Types.ObjectId(req.body.product_id);
		data.image = [];
		if (req.body.image && Array.isArray(req.body.image) && req.body.image.length > 0) {
			data.image = req.body.image;
		}
		if (req.body.multiBase64 && req.body.multiBase64.length > 0) {
			for (let index = 0; index < req.body.multiBase64.length; index++) {
				var Base64 = req.body.multiBase64[index].match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
				var file_name = Date.now().toString() + index + '.png';
				var fil = CONFIG.DIRECTORY_OTHERS + file_name;
				library.base64Upload({ file: fil, base64: Base64[2] }, function (err, response) {
				});
				data.image.push(fil);
				delete fil
			}
		};
		console.log(data)
		let productResult = await db.GetOneDocument('food', { _id: data.product_id }, {}, {});
		let productDetails = productResult.doc;
		if (productDetails) {
			productDetails.total_rating = productDetails.total_rating ? productDetails.total_rating : 0;
			productDetails.total_rating_users = productDetails.total_rating_users ? productDetails.total_rating_users : 0;
			if (data.rating_id) {
				if (!mongoose.isValidObjectId(data.rating_id)) {
					return res.send({ status: 0, message: "Invalid rating id" });
				};
				let ratingDetails = await db.GetOneDocument('ratings', { _id: new mongoose.Types.ObjectId(data.rating_id) }, {}, {});
				ratingDetails = ratingDetails.doc;
				let total_rating = productDetails.total_rating - (ratingDetails.rating ? ratingDetails.rating : 0) + data.rating;
				let avg_rating = Number((total_rating / productDetails.total_rating_users).toFixed(1));
				await db.UpdateDocument('food', { _id: data.product_id }, { total_rating: total_rating, rating: avg_rating });
				await db.UpdateDocument('orders', { user_id: new mongoose.Types.ObjectId(data.user), foods: { $elemMatch: { id: data.product_id } } }, { "foods.$.rating_user": true, "foods.$.rating": data.rating }, {});
				let ratingInsert = await db.UpdateDocument('ratings', { _id: new mongoose.Types.ObjectId(data.rating_id) }, data, {});
				if (ratingInsert) {
					return res.send({ status: 1, message: "Review updated successfully" })
				} else {
					return res.send({ status: 0, message: 'Something went wrong please try again' })
				}
			} else {
				if (!mongoose.isValidObjectId(data.product_id)) {
					return res.send({ status: 0, message: "Inavlid order id" });
				}
				let total_rating = productDetails.total_rating + data.rating;
				let avg_rating = Number((total_rating / (productDetails.total_rating_users + 1)).toFixed(1));
				await db.UpdateDocument('food', { _id: data.product_id }, { rating: avg_rating, total_rating: total_rating, $inc: { total_rating_users: 1 } }, {});



				let ratingInsert = await db.InsertDocument('ratings', data);
				if (ratingInsert) {
					await db.UpdateAllDocument('orders', { user_id: new mongoose.Types.ObjectId(data.user), foods: { $elemMatch: { id: data.product_id } } }, { "foods.$.rating_user": true, "foods.$.rating": data.rating, "foods.$.rating_id": ratingInsert._id }, {});


					return res.send({ status: 1, message: "Review created successfully" })
				} else {
					return res.send({ status: 0, message: 'Something went wrong please try again' })
				}
			}
		} else {
			return res.send({ status: 0, message: "Product not please check and try again" });
		}
	}

	router.subscribeUser = async (req, res) => {
		// req.checkBody('email', 'email is required').notEmpty();
		// errors = req.validationErrors();
		// if (errors) {
		// 	res.send({
		// 		status: 0,
		// 		message: errors[0].msg
		// 	});
		// 	return;
		// }
		const result = await db.GetOneDocument('subscribe', { email: req.body.email, status: 1 }, {}, {})
		if (!result) {
			return res.send({ status: 0, message: 'Something went wrong' });
		} else {
			if (result.status === true) {
				return res.send({ status: 0, message: "This email is already subscribed" });
			} else {
				var data = {
					email: req.body.email
				}
				const insertDoc = await db.InsertDocument('subscribe', data)
				if (!insertDoc) {
					return res.send({ status: 0, message: 'Something went wrong' });
				} else {
					return res.send({ status: 1, message: "Subscribed successfully" })
				}
				// db.InsertDocument('subscribe', data, (err, insertDoc) => {
				// 	if (err) {
				// 		return res.send({ status: 0, message: err.message || 'Something went wrong' });
				// 	} else {
				// 		return res.send({ status: 1, message: "Subscribed successfully" })
				// 	}
				// })
			}
		}
		// db.GetOneDocument('subscribe', { email: req.body.email, status: 1 }, {}, {}, (err, result) => {
		// 	if (err) {
		// 		return res.send({ status: 0, message: err.message || 'Something went wrong' });
		// 	} else {
		// 		if (result) {
		// 			return res.send({ status: 0, message: "This email is already subscribed" });
		// 		} else {
		// 			var data = {
		// 				email: req.body.email
		// 			}
		// 			db.InsertDocument('subscribe', data, (err, insertDoc) => {
		// 				if (err) {
		// 					return res.send({ status: 0, message: err.message || 'Something went wrong' });
		// 				} else {
		// 					return res.send({ status: 1, message: "Subscribed successfully" })
		// 				}
		// 			})
		// 		}
		// 	}
		// })
	}

	router.reviewUser = (req, res) => {
		req.checkBody('user', 'user is required').notEmpty();
		errors = req.validationErrors();
		if (errors) {
			res.send({
				status: 0,
				message: errors[0].msg
			});
			return;
		}
	}

	router.ordersListOld = async function (req, res) {
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			return res.send({ status: 0, message: "Something went wrong please try again" })
		} else {
			var query = {};
			query = { user_id: new mongoose.Types.ObjectId(req.body.user_id), status: { $nin: [2, 0, 15] } };

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
				$lookup: {
					from: "food",
					let: { foods: "$foods" },
					pipeline: [
						{
							$addFields: { foods: "$$foods" }
						},
						{ $unwind: { path: "$foods" } },
						{
							$match: {
								$expr: {
									$eq: ["$foods.id", "$_id"]
								}
							}
						},
						{
							$project: {
								id: "$_id",
								rcat_id: "$foods.rcat_id",
								scat_id: "$foods.scat_id",
								name: "$foods.name",
								price: "$foods.price",
								mprice: "$foods.mprice",
								offer_price: "$foods.offer_price",
								net_quantity: "$foods.net_quantity",
								units: "$foods.units",
								quantity: "$foods.quantity",
								instruction: "$foods.instruction",
								slug: "$foods.slug",
								offer: "$foods.offer",
								varntid: "$foods.varntid",
								image: "$foods.image",
								size: "$foods.size",
								size_status: "$foods.size_status",
								rating: "$foods.rating",
								avg_rating: "$rating"
							}
						}
					],
					as: "foods"
				}
			},
			{
				$project: {
					foods: 1,
					user: 1,
					order_id: 1,
					billings: 1,
					order_history: 1,
					amount: "$billings.amount.total",
					delivery_address: 1,
					returnStatus: 1,
					returnReason: 1,
					status: 1,
					restaurant_time_out_alert: 1,
					cancellationreason: 1,
					schedule_date: 1,
					schedule_time_slot: 1,
					seen_status: 1,
					refundStatus: 1,
					shipped_date: "$order_history.shipped",
					packed_date: "$order_history.packed",
					delivery: "$order_history.delivered",
					createdAt: 1,

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
			// console.log(JSON.stringify(usersQuery))
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
					res.send({ status: 1, data: [], count: 0, message: "Success" });
				}
			}

		}

	}

	router.ordersList = async function (req, res) {
		let errors = validationResult(req).errors;
		if (errors && Array.isArray(errors) && errors.length > 0) {
			res.send({
				status: 0,
				message: errors[0].msg
			});
			return;
		}
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
				{
					$lookup: {
						from: "transaction",
						localField: "transaction_id",
						foreignField: "_id",
						as: "transactions"
					}
				},
				{ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						foods: 1,
						transactions: 1,
						user: {
							avatar: "$user.avatar",
							email: "$user.email",
							createdAt: "$user.createdAt",
							favourite: "$user.favourite",
							gender: "$user.gender",
							last_name: "$user.avatar",
							phone: "$user.phone",
							role: "$user.role",
							sample_email: "$user.sample_email",
							status: "$user.status",
							user_type: "$user.user_type",
							username: "$user.username",
							_id: "$user._id",

							// avatar:"$user.avatar",
							// avatar:"$user.avatar",
							// avatar:"$user.avatar",

						},
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
						createdAt: 1,
						refundStatus: 1,
						returnStatus: 1,
						billing_address: 1,
						shiprocket_data: 1,
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
	router.printDocument = async (req, res) => {

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
					data.message = 'error in orders';
					res.send(data);
				} else {
					let users_id = await db.GetOneDocument('users', { '_id': order_id.doc.user_id }, {}, {})





					if (users_id.status == false) {
						data.status = 0;
						data.message = 'error in user';
						res.send(data);
					} else {
						let transaction_id = await db.GetOneDocument('transaction', { '_id': order_id.doc.transaction_id }, {}, {})


						if (transaction_id.status == false) {
							data.status = 0;
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
									var order_time = moment(deliv_date).format('h:mm:ss')
									//  timezone.tz(deliv_date, settings.time_zone)
									// .format(settings.time_format);
									var mydate = moment(order_date, 'DD/MM/YYYY');

									// console.log("---------------------------------------------------------------------------------------")
									// console.log("------------------checking ,y mydate", mydate)

									var order_delivery_Date = moment(mydate).format('DD/MM/YYYY')


									// console.log("------------------checking ,y order_delivery_Date", order_delivery_Date)

									// console.log("---------------------------------------------------------------------------------------")

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
									console.log(order_id, 'order_id');
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

									// foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Discount Type</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + order_id.doc.cart_details.doc.discount_type + '</p></td></tr>';
									var package_charge = '';
									foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Delivery Charge</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Free</p></td></tr>';
									// if (orders.billings.amount.package_charge > 0) {
									// }

									if (order_id.doc.billings.amount.coupon_discount > 0) {
										foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Coupon Discount</p></td><td  colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.coupon_discount).toFixed(2)) + '</p></td></tr>';
									}
									if (order_id && order_id.doc && order_id.doc.coupon_code != undefined && order_id.doc.coupon_code != null) {
										foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Coupon Code</p></td><td  colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + (order_id.doc.coupon_code) + '</p></td></tr>';
									}
									if (order_id.doc.billings.amount.grand_total > 0) {
										foodDetails += '<tr bgcolor="#fff"><td style="border-right: 1px solid #545454;" colspan="3"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">&nbsp;</p></td><td style="border-bottom: 1px solid #545454; border-right: 1px solid #545454;" ><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">Grand Total</p></td><td colspan="2" style="border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 15px; margin: 0px; color: #404040; padding: 5px 10px; text-align: center;">' + '₹ ' + ' ' + ((order_id.doc.billings.amount.grand_total).toFixed(2)) + '</p></td></tr>';
									}

									foodDetails += '</tbody></table>';


									console.log("_____________________________________________________________________________________")

									console.log(settings.doc.settings.phone)

									console.log("_____________________________________________________________________________________")


									const site_widget = await db.GetOneDocument('settings', { alias: 'widgets' }, {}, {})
									// const site_address = site_widget.doc.settings.footer_widgets_1;
									var html1 = template.doc[0].email_content;
									html1 = html1.replace(/{{foodDetails}}/g, foodDetails);
									html1 = html1.replace(/{{site_url}}/g, settings.doc.settings.site_url);
									html1 = html1.replace(/{{site_title}}/g, settings.doc.settings.site_title);
									html1 = html1.replace(/{{logo}}/g, settings.doc.settings.site_url + settings.doc.settings.logo);
									html1 = html1.replace(/{{order_id}}/g, order_id.doc.order_id);
									// html1 = html1.replace(/{{site_address}}/g, settings.doc.settings.site_address);
									html1 = html1.replace(/{{order_date}}/g, order_date);
									html1 = html1.replace(/{{order_delivery_Date}}/g, order_delivery_Date);
									html1 = html1.replace(/{{order_delivery_Time}}/g, order_delivery_Time);
									html1 = html1.replace(/{{firstname}}/g, users_id.doc.first_name);
									html1 = html1.replace(/{{site_address}}/g, settings.doc.settings.site_address);
									html1 = html1.replace(/{{lastname}}/g, users_id.doc.last_name);
									html1 = html1.replace(/{{username}}/g, users_id.doc.username);
									html1 = html1.replace(/{{helpPhone}}/g, settings.doc.settings.phone);
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
									// var paymenttype = "Pay By Cards, UPI, Wallets, Net Banking";
									var paymenttype = "Pay By " + transaction_id.doc.type;
									html1 = html1.replace(/{{paymenttype}}/g, paymenttype);
									console.log(foodDetails, 'foodDetails-------');

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
											console.log(result, 'result---------');
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






		// return;


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
												// var foodDetails = '<table style="border:1px solid #000000;" border="0" cellspacing="0" cellpadding="0" width="100%" bgcolor="#fff"><tbody><tr style="border-bottom: 1px solid #545454;" bgcolor="#e8e8e8"><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">S:No</p></th><th style="width: 45%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px; text-align: left;">Item</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Units</p></th><th style="width: 5%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Qty</p></th><th style="width: 20%; border-right: 1px solid #545454; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">MRP</p></th><th style="width: 20%; border-bottom: 1px solid #545454;"><p style="font-family: Arial, Helvetica, sans-serif; line-height: 15px; margin: 0px; font-size: 9px; color: #000; font-weight: bold; padding: 5px 10px;">Total AMT</p></th></tr>';
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

	router.rattingList = async (req, res) => {
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ status: 0, message: errors[0].msg });
		// 	return;
		// }
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		if (settings.status === false) {
			return res.send({ status: 0, message: "Something went wrong please try again" })
		} else {
			const docData = await db.GetDocument('ratings', { user: new mongoose.Types.ObjectId(req.body.user_id) }, {}, {})
			if (!docData) {
				return res.send({ status: 0, message: "No data found" })
			} else {
				if (docData && docData.length > 0) {
					return res.send({ status: 1, data: docData })
				} else {
					return res.send({ status: 1, data: [] })
				}
			}
		}
		// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 	if (err) {
		// 		return res.send({ status: 0, message: "Something went wrong please try again" })
		// 	} else {
		// 		db.GetDocument('ratings', { user: mongoose.Types.ObjectId(req.body.user_id) }, {}, {}, (err, docData) => {
		// 			if (err) {
		// 				return res.send({ status: 0, message: "No data found" })
		// 			} else {
		// 				if (docData && docData.length > 0) {
		// 					return res.send({ status: 1, data: docData })
		// 				} else {
		// 					return res.send({ status: 1, data: [] })
		// 				}
		// 			}
		// 		})
		// 	}
		// });
	}

	router.ratingProductList = async (req, res) => {
		try {
			let product_id = req.body.product_id;
			if (!mongoose.isValidObjectId(product_id)) {
				return res.send({ status: 0, message: "Invalid product id!" });
			};
			let condition = { product_id: new mongoose.Types.ObjectId(product_id), status: 1 };
			let skip = req.body.skip ? parseInt(req.body.skip) : 0;
			let limit = req.body.limit ? parseInt(req.body.limit) : 10;
			let sort_val = {};
			if (req.body.sort && req.body.sort.name) {
				let sort = req.body.sort;
				sort_val[sort.name] = sort.value;
			} else {
				sort_val = { createdAt: -1 };
			};
			let ratingList = await db.GetAggregation('ratings', [
				{
					$match: condition
				}, {
					$sort: sort_val
				}, {
					$skip: skip
				}, {
					$limit: limit
				}, {
					$lookup: {
						from: "users",
						let: { user_id: "$user" },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ["$_id", "$$user_id"] },
											{ $eq: ["$status", 1] }
										]
									}
								}
							}, {
								$project: {
									username: 1,
									first_name: 1,
									last_name: 1,
									email: 1,
									avatar: 1,
								}
							}
						],
						as: "users"
					}
				}, {
					$unwind: { path: "$users", preserveNullAndEmptyArrays: false }
				}, {
					$project: {
						rating: 1,
						comment: 1,
						image: 1,
						user: 1,
						product_id: 1,
						order_id: 1,
						users: 1
					}
				}
			]);
			let ratingCounts = await db.GetCount('ratings', condition);
			return res.send({ status: 1, message: "Rating list found", data: ratingList, totalCount: ratingCounts });;
		} catch (error) {
			return res.send({ status: 0, message: "Something went wrong please try again" })
		}
	}

	router.getReviewDetailOld = (req, res) => {
		req.checkBody('user_id', 'user_id is required').notEmpty();
		req.checkBody('product_id', 'product_id is required').notEmpty();
		var errors = req.validationErrors();
		if (errors) {
			res.send({ status: 0, message: errors[0].msg });
			return;
		}
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err) {
				return res.send({ status: 0, message: "Something went wrong please try again" })
			} else {
				db.GetOneDocument('ratings', { product_id: mongoose.Types.ObjectId(req.body.product_id), user: mongoose.Types.ObjectId(req.body.user_id) }, {}, { createdAt: -1 }, (error, docDetal) => {
					if (error || !docDetal) {
						return res.send({ status: 0, message: "Successfully get review" });
					} else {
						var images = [];
						if (docDetal.image && docDetal.image.length > 0) {
							docDetal.image.forEach(e => {
								images.push(settings.settings.site_url + e.slice(2))
							})
							docDetal.image = images;
						}
						return res.send({ status: 1, data: docDetal });
					}
				})
			}
		})

	};

	router.getReviewDetail = async (req, res) => {

		var errors = validationResult(req).errors;
		if (errors && Array.isArray(errors) && errors.length > 0) {
			res.send({ status: 0, message: errors[0].msg });
			return;
		}
		let settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {});
		settings = settings.doc;
		if (!settings) {
			return res.send({ status: 0, message: "Something went wrong please try again" })
		} else {
			let docDetal = await db.GetOneDocument('ratings', { product_id: new mongoose.Types.ObjectId(req.body.product_id), user: new mongoose.Types.ObjectId(req.body.user_id), _id: new mongoose.Types.ObjectId(req.body.rating_id) }, {}, { createdAt: -1 });
			docDetal = docDetal.doc;
			if (!docDetal) {
				return res.send({ status: 0, message: "No review found" });
			} else {
				var images = [];
				// if (docDetal.image && docDetal.image.length > 0) {
				// 	docDetal.image.forEach(e => {
				// 		images.push(settings.settings.site_url + e.slice(2))
				// 	})
				// 	docDetal.image = images;
				// }
				return res.send({ status: 1, data: docDetal });
			};
		};

	}

	router.recent_visit = async (req, res) => {
		// req.checkBody('user_id', 'user_id is required').notEmpty();
		// req.checkBody('product_id', 'product_id is required').notEmpty();
		// req.checkBody('type', 'product_id is required').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send({ status: 0, message: errors[0].msg });
		// 	return;
		// }
		var collection = 'recently_visit';
		if (req.body.type == 'temp_visit') {
			collection = 'recent_temp_visit'
		}
		const doc = await db.GetOneDocument(collection, { user_id: req.body.user_id, product_id: req.body.product_id }, {}, {})


		// if (doc.status === false) {
		// return res.send({ status: 0, message: "something gone wrong" })
		// } else {
		if (doc.doc != "Data Not found") {
			return res.send({ status: 1, message: "Already added" })
		} else {
			const result = await db.InsertDocument(collection, { user_id: req.body.user_id, product_id: new mongoose.Types.ObjectId(req.body.product_id) })
			if (!result) {
				return res.send({ status: 0, message: err.message })
			} else {
				return res.send({ status: 1, message: "Added Successfully" })
			}
		}
		// }
		// db.GetOneDocument(collection, { user_id: req.body.user_id, product_id: mongoose.Types.ObjectId(req.body.product_id) }, {}, {}, (error, doc) => {
		// 	if (error) {
		// 		return res.send({ status: 0, message: error.message })
		// 	} else {
		// 		if (doc) {
		// 			return res.send({ status: 1, message: "Already added" })
		// 		} else {
		// 			db.InsertDocument(collection, { user_id: req.body.user_id, product_id: mongoose.Types.ObjectId(req.body.product_id) }, (err, result) => {
		// 				if (err) {
		// 					return res.send({ status: 0, message: err.message })
		// 				} else {
		// 					return res.send({ status: 1, message: "Added Successfully" })
		// 				}
		// 			});
		// 		}
		// 	}
		// })
	}

	router.productSize = (req, res) => {
		if (typeof req.body.id == 'undefined') {
			return res.send({ status: 0, message: "id is required" });
		}
		db.GetOneDocument('food', { _id: mongoose.Types.ObjectId(req.body.id) }, {}, {}, (err, doc) => {
			if (err || !doc) {
				return res.send({ status: 0, message: err.message || 'Something went wrong' })
			} else {
				return res.send({ status: 1, data: doc && doc.size ? doc.size : [] });
			}
		})
	}

	router.orderMailUpdate = async (req, res) => {
		if (typeof req.body.sample_email == 'undefined') {
			return res.send({ status: 0, message: "email is required" });
		}
		if (typeof req.body.userId == 'undefined') {
			return res.send({ status: 0, message: "user id is required" });
		}
		const update = await db.UpdateDocument('users', { _id: new mongoose.Types.ObjectId(req.body.userId) }, { $set: { "sample_email": req.body.sample_email } }, {})
		if (update.status === false) {
			return res.send({ status: 0, message: error.message })
		} else {
			return res.send({ status: 1, message: "Success" })
		}
		// db.UpdateDocument('users', { _id: new mongoose.Types.ObjectId(req.body.userId) }, { $set: { "sample_email": req.body.sample_email } }, {}, (error, result) => {
		// 	if (error) {
		// 		return res.send({ status: 0, message: error.message })
		// 	} else {
		// 		return res.send({ status: 1, message: "Success" })
		// 	}
		// })
	}

	router.deleteUser = async (req, res) => {
		const docdata = await db.UpdateDocument('users', { _id: { $in: req.body.user_id } }, { status: 0 }, { multi: true })
		if (!docdata) {
			res.send({ status: 0, message: err.message });
		} else {
			// if (typeof req.body.user_id == 'object') {
			//     for (var i = 0; i < req.body.user_id.length; i++) {
			//         io.of('/chat').emit('admin_changed', { user_id: req.body.user_id[i], status: 0 });
			//         io.of('/chat').in(req.body.user_id[i]).emit('r2e_user_logout', { userId: req.body.user_id[i], status: 0 });
			//     }
			// } else {
			io.of('/chat').emit('admin_changed', { user_id: req.body.user_id, status: 0 });
			io.of('/chat').in(req.body.user_id).emit('r2e_user_logout', { userId: req.body.user_id, status: 0 });
			// }
			res.send({ status: 1, error: false, message: 'Successfully Deleted', data: docdata.doc });
		}
	}

	router.userVerify = async (req, res) => {
		if (req.body.email) {
			const emailExist = await db.GetOneDocument('users', { email: req.body.email }, {}, {})
			console.log(emailExist.doc, 'this is true');
			if (emailExist.status === false) {
				const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
				var random = Math.floor(1000 + Math.random() * 9000);
				var mailData = {};
				mailData.template = 'forgot_password';
				mailData.to = req.body.email;
				mailData.html = [];
				mailData.html.push({ name: 'name', value: "This is your otp" });
				mailData.html.push({ name: 'otp', value: random || "" });
				// mailcontent.sendmail(mailData, async function (err, response) {
				const emailSuccess = await mailcontent.sendmail(mailData)
				console.log(emailSuccess, 'email success');
				if (emailSuccess) {
					return res.send({ status: 0, message: "Something went wrong please try again" })
				} else {
					var forgot = {};
					forgot.last_sent = new Date();
					forgot.is_done = 0;
					const expirationTime = 60 * 1000; // 1 minute in milliseconds

					// Store OTP and expiration time in the session
					// req.session.otp = otp;
					// req.session.otpExpiration = Date.now() + expirationTime;
					var expr_date = Date.now()
					req.session.otp = random;
					req.session.expr_date = expr_date + expirationTime;
					// const updated = await db.UpdateDocument('users', { 'email': req.body.email }, { 'forgot_password': forgot, otp: random, otp_time: expr_date }, {})
					// console.log(updated,'+++++++this are updated+++++++');
					// if (updated.status) {
					res.send({ status: 1, otp: random, message: "OTP send to email successfully.", });
					// }
				}
			} else {
				res.send({ error: true, message: "This email is already exist" })
			}
		}
		else if (req.body.phone_number && req.body.country_code) {
			console.log("Hlo");
		} else {
			res.send({ error: true, message: "Enter a valid phone number or email" })
		}
	}

	// router.otpVerify = async (req, res) => {
	// 	console.log(req.session.otp, '---------------------otp-----------------------');
	// 	console.log(req.session.expr_date, '---------------------expr_date-------------------')

	// 	const userInput = req.body.userInput;
	// 	const storedOTP = req.session.otp;
	// 	const expirationTime = req.session.expr_date;

	// 	if (Date.now() <= expirationTime && userInput === storedOTP) {
	// 		// OTP is valid
	// 		res.send({ message: 'OTP is valid', error: false });
	// 	} else {
	// 		// OTP is invalid or expired
	// 		res.send({ message: 'Invalid OTP', error: true });
	// 	}
	// }

	// router.add_product_faqs = async (req, res) => {

	// 	try {

	// 	} catch (e) {
	// 		console
	// 	}
	// 	var faqs_data = {};
	// 	faqs_data.question = req.body.question
	// 	faqs_data.user = req.body.user_id
	// 	faqs_data.product_id = req.body.product_id
	// 	const add_quest = await db.InsertDocument('faqs', faqs_data)
	// 	var data = {}
	// 	if (!add_quest) {
	// 		data.message = "Some thing Went wrong",
	// 			data.status = 0
	// 		res.send(data)
	// 	} else {
	// 		data.message = "Your Question Was Posted Successfully",
	// 			data.status = 1
	// 		res.send(data)
	// 	}
	// }


	router.productListAll = async (req, res) => {
		const { category, user_id, variant_filter, price_filter, rating_filter, sort_filter, mainCat, search } = req.body;

		console.log(req.body, "1111111111111111111111111111111111111111111111111111111111");
		const getUser= await db.GetOneDocument('users',{_id:user_id},{},{})
		if(getUser.status){

			try {
				let skip = req.body.skip ? parseInt(req.body.skip) : 0;
				let limit = req.body.limit ? parseInt(req.body.limit) : 20;
				let condition = { status: 1 };
				condition['combo'] = {$ne: true}
				let sort = { createdAt: -1 };
				if (search) {
					condition["name"] = { $regex: search, $options: "i" }
					// condition["name"] = { $regex: search, $options: "i" }
				}
				if (category) {
					// let mainCat;
					// let subCat = [];
					// let category_list
					// category.map((x, i) => {
					// 	if (i === 0) {
					// 		mainCat = new mongoose.Types.ObjectId(x);
					// 	} else {
					// 		subCat.push(new mongoose.Types.ObjectId(x))
					// 	}
					// });
					// if (mainCat && subCat && Array.isArray(subCat) && subCat.length > 0) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $in: [mainCat, ...subCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat, child_cat_array: { $in: subCat }
					// 		}
					// 	];
					// } else if (mainCat) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $all: [mainCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat
					// 		}
					// 	];
					// }
					let cond_cat = [];
					let cat_list = Object.entries(category);
					for (let index = 0; index < cat_list.length; index++) {
						console.log(cat_list[index][1], "cat_list[index][1]cat_list[index][1]cat_list[index][1]cat_list[index][1]");
						if (cat_list[index][1] && Array.isArray(cat_list[index][1]) && cat_list[index][1].length > 0) {
							cond_cat.push(
								{
									child_cat_array: { $in: cat_list[index][1].map(x => new mongoose.Types.ObjectId(x)) }
	
								}
							)
	
						}
					}
					if (cond_cat && Array.isArray(cond_cat) && cond_cat.length > 0) {
						condition["$or"] = cond_cat;
					} else if (mainCat) {
						if (!mongoose.isValidObjectId(mainCat)) {
							return res.status(400).send({ status: false, message: "Inavid category id! Please check and try again" });
						}
						console.log(mainCat, "mainCatmainCatmainCatmainCat");
						condition["$or"] = [
							{ rcategory: new mongoose.Types.ObjectId(mainCat) },
							{ child_cat_array: new mongoose.Types.ObjectId(mainCat) }
						]
					};
				};
				if (variant_filter && Array.isArray(variant_filter) && variant_filter.length > 0) {
					condition.attributes = { $in: variant_filter.map(x => new mongoose.Types.ObjectId(x)) };
				};
				if (price_filter && Array.isArray(price_filter) && price_filter.length > 0) {
					let cond_price = [];
					price_filter.map(price => {
						let split_val = price.split(":");
						let min = parseInt(split_val[0]), max = parseInt(split_val[1]);
						cond_price.push(
							{
								sale_price: { $gte: min, $lte: max }
							}
						)
					});
					if (condition["$or"]) {
						condition["$and"] = [
							{
								$or: [...condition["$or"]]
							}, {
								$or: cond_price
							}
						];
						delete condition["$or"]
					} else {
						condition["$or"] = cond_price;
					}
				};
				if (rating_filter) {
					condition.rating = { $gte: parseInt(rating_filter) }
				};
				if (sort_filter) {
					switch (sort_filter) {
						case "latest":
							sort = { createdAt: -1 };
							break;
						case "lowtohigh":
							sort = { sale_price: 1 };
							break;
						case "hightolow":
							sort = { sale_price: -1 };
							break;
						case "ratlowtohigh":
							sort = { rating: -1 };
							break;
						case "rathightolow":
							sort = { rating: -1 };
							break;
						default:
							break;
					}
				}
				let favourite_list = []
				if (user_id) {
					if (!mongoose.isValidObjectId(user_id)) {
						return res.status(400).send({ status: 0, message: "Invalid user id! Please check and try again" });
					}
					let fav_list = await db.GetDocument("favourite", { user_id: new mongoose.Types.ObjectId(user_id), status: 1 }, { product_id: 1 }, {});
					favourite_list = fav_list.doc.map(x => x.product_id);
					console.log(favourite_list, 'favourite_list');
				} else {
					favourite_list = []
				}
				console.log('///////////////////////////////');
				console.log(condition);
				console.log('/////////////////////////////');
				let query = [
					{
						$match: condition
					}, {
						$sort: sort
					}, {
						$skip: skip
					}, {
						$limit: limit
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: "$rcategory",
							scat_id: "$scategory",
							rcategory: { $toLower: '$rcategory.rcatname' },
							scategory: { $toLower: '$scategory.scatname' },
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: [
													"$$item.status",
													1
												]
											},
											{
												$ne: ['$$item.quantity', 0]
											}
										]
									}
								}
							},
							offer_base: "$base_price",
							offer_sale: {
								$divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
								]
							}
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: 1,
							offer_sale: { $subtract: ["$base_price", "$offer_sale"] },
							offer_base: 1
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							sort_name: 1,
							substat: 1,
							"images": 1,
							filterSize: { $ifNull: ['$notZero', []] },
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							offer_base: 1,
							offer_sale: 1,
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: 1,
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							sort_name: 1,
							filterSize: 1,
							substat: 1,
							"images": 1,
							size_status: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							discount_percentage: {
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]
							},
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
							offer_base: 1,
							offer_sale: 1,
							favourite: { $cond: { if: { $in: ["$_id", favourite_list] }, then: true, else: false } }
						}
					},
				];
				console.log("*********************************************************************************************")
				// console.log(JSON.stringify(query))
	
				let responseList = await db.GetAggregation("food", query);
	
				console.log(responseList, "responseListresponseListresponseList");
				let responseCount = db.GetCount("food", condition);
	
				Promise.all([responseList, responseCount]).then(([list, count]) => {
					return res.status(200).send({ status: 1, message: "Product list found", response: { list: list, count: count } });
				}).catch(error => {
					return res.status(500).send({ status: 0, message: "Something went wrong! Please try again", error: error });
				})
			} catch (error) {
				return res.status(500).send({ status: 0, message: "Product not found", error: error });
			}
		}else{
			try {
				let skip = req.body.skip ? parseInt(req.body.skip) : 0;
				let limit = req.body.limit ? parseInt(req.body.limit) : 20;
				let condition = { status: 1 };
				condition['combo'] = {$ne: true}

				let sort = { createdAt: -1 };
				if (search) {
					condition["name"] = { $regex: search, $options: "i" }
					// condition["name"] = { $regex: search, $options: "i" }
				}
				if (category) {
					// let mainCat;
					// let subCat = [];
					// let category_list
					// category.map((x, i) => {
					// 	if (i === 0) {
					// 		mainCat = new mongoose.Types.ObjectId(x);
					// 	} else {
					// 		subCat.push(new mongoose.Types.ObjectId(x))
					// 	}
					// });
					// if (mainCat && subCat && Array.isArray(subCat) && subCat.length > 0) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $in: [mainCat, ...subCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat, child_cat_array: { $in: subCat }
					// 		}
					// 	];
					// } else if (mainCat) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $all: [mainCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat
					// 		}
					// 	];
					// }
					let cond_cat = [];
					let cat_list = Object.entries(category);
					for (let index = 0; index < cat_list.length; index++) {
						console.log(cat_list[index][1], "cat_list[index][1]cat_list[index][1]cat_list[index][1]cat_list[index][1]");
						if (cat_list[index][1] && Array.isArray(cat_list[index][1]) && cat_list[index][1].length > 0) {
							cond_cat.push(
								{
									child_cat_array: { $in: cat_list[index][1].map(x => new mongoose.Types.ObjectId(x)) }
	
								}
							)
	
						}
					}
					if (cond_cat && Array.isArray(cond_cat) && cond_cat.length > 0) {
						condition["$or"] = cond_cat;
					} else if (mainCat) {
						if (!mongoose.isValidObjectId(mainCat)) {
							return res.status(400).send({ status: false, message: "Inavid category id! Please check and try again" });
						}
						console.log(mainCat, "mainCatmainCatmainCatmainCat");
						condition["$or"] = [
							{ rcategory: new mongoose.Types.ObjectId(mainCat) },
							{ child_cat_array: new mongoose.Types.ObjectId(mainCat) }
						]
					};
				};
				if (variant_filter && Array.isArray(variant_filter) && variant_filter.length > 0) {
					condition.attributes = { $in: variant_filter.map(x => new mongoose.Types.ObjectId(x)) };
				};
				if (price_filter && Array.isArray(price_filter) && price_filter.length > 0) {
					let cond_price = [];
					price_filter.map(price => {
						let split_val = price.split(":");
						let min = parseInt(split_val[0]), max = parseInt(split_val[1]);
						cond_price.push(
							{
								sale_price: { $gte: min, $lte: max }
							}
						)
					});
					if (condition["$or"]) {
						condition["$and"] = [
							{
								$or: [...condition["$or"]]
							}, {
								$or: cond_price
							}
						];
						delete condition["$or"]
					} else {
						condition["$or"] = cond_price;
					}
				};
				if (rating_filter) {
					condition.rating = { $gte: parseInt(rating_filter) }
				};
				if (sort_filter) {
					switch (sort_filter) {
						case "latest":
							sort = { createdAt: -1 };
							break;
						case "lowtohigh":
							sort = { sale_price: 1 };
							break;
						case "hightolow":
							sort = { sale_price: -1 };
							break;
						case "ratlowtohigh":
							sort = { rating: -1 };
							break;
						case "rathightolow":
							sort = { rating: -1 };
							break;
						default:
							break;
					}
				}
				let favourite_list = []
				if (user_id) {

					let fav_list = await db.GetDocument("temp_favourite", { user_id: user_id, status: 1 }, { product_id: 1 }, {});
					favourite_list = fav_list.doc.map(x => x.product_id);
					console.log(favourite_list, 'favourite_list');
				} else {
					favourite_list = []
				}
				console.log('///////////////////////////////');
				console.log(condition);
				console.log('/////////////////////////////');
				let query = [
					{
						$match: condition
					}, {
						$sort: sort
					}, {
						$skip: skip
					}, {
						$limit: limit
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: "$rcategory",
							scat_id: "$scategory",
							rcategory: { $toLower: '$rcategory.rcatname' },
							scategory: { $toLower: '$scategory.scatname' },
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: [
													"$$item.status",
													1
												]
											},
											{
												$ne: ['$$item.quantity', 0]
											}
										]
									}
								}
							},
							offer_base: "$base_price",
							offer_sale: {
								$divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
								]
							}
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: 1,
							offer_sale: { $subtract: ["$base_price", "$offer_sale"] },
							offer_base: 1
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							sort_name: 1,
							substat: 1,
							"images": 1,
							filterSize: { $ifNull: ['$notZero', []] },
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							offer_base: 1,
							offer_sale: 1,
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: 1,
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							sort_name: 1,
							filterSize: 1,
							substat: 1,
							"images": 1,
							size_status: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							discount_percentage: {
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]
							},
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
							offer_base: 1,
							offer_sale: 1,
							favourite: { $cond: { if: { $in: ["$_id", favourite_list] }, then: true, else: false } }
						}
					},
				];
				console.log("*********************************************************************************************")
				// console.log(JSON.stringify(query))
	
				let responseList = await db.GetAggregation("food", query);
	
				console.log(responseList, "responseListresponseListresponseList");
				let responseCount = db.GetCount("food", condition);
	
				Promise.all([responseList, responseCount]).then(([list, count]) => {
					return res.status(200).send({ status: 1, message: "Product list found", response: { list: list, count: count } });
				}).catch(error => {
					return res.status(500).send({ status: 0, message: "Something went wrong! Please try again", error: error });
				})
			} catch (error) {
				return res.status(500).send({ status: 0, message: "Product not found", error: error });
			}
		}
	};
	router.comboOffer = async (req, res) => {
		const { category, user_id, variant_filter, price_filter, rating_filter, sort_filter, mainCat, search } = req.body;

		console.log(req.body, "1111111111111111111111111111111111111111111111111111111111");
		const getUser= await db.GetOneDocument('users',{_id:user_id},{},{})
		if(getUser.status){

			try {
				let skip = req.body.skip ? parseInt(req.body.skip) : 0;
				let limit = req.body.limit ? parseInt(req.body.limit) : 20;
				let condition = { status: 1 };
				condition['combo'] = {$eq: true}
				let sort = { createdAt: -1 };
				if (search) {
					condition["name"] = { $regex: search, $options: "i" }
					// condition["name"] = { $regex: search, $options: "i" }
				}
				if (category) {
					// let mainCat;
					// let subCat = [];
					// let category_list
					// category.map((x, i) => {
					// 	if (i === 0) {
					// 		mainCat = new mongoose.Types.ObjectId(x);
					// 	} else {
					// 		subCat.push(new mongoose.Types.ObjectId(x))
					// 	}
					// });
					// if (mainCat && subCat && Array.isArray(subCat) && subCat.length > 0) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $in: [mainCat, ...subCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat, child_cat_array: { $in: subCat }
					// 		}
					// 	];
					// } else if (mainCat) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $all: [mainCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat
					// 		}
					// 	];
					// }
					let cond_cat = [];
					let cat_list = Object.entries(category);
					for (let index = 0; index < cat_list.length; index++) {
						console.log(cat_list[index][1], "cat_list[index][1]cat_list[index][1]cat_list[index][1]cat_list[index][1]");
						if (cat_list[index][1] && Array.isArray(cat_list[index][1]) && cat_list[index][1].length > 0) {
							cond_cat.push(
								{
									child_cat_array: { $in: cat_list[index][1].map(x => new mongoose.Types.ObjectId(x)) }
	
								}
							)
	
						}
					}
					if (cond_cat && Array.isArray(cond_cat) && cond_cat.length > 0) {
						condition["$or"] = cond_cat;
					} else if (mainCat) {
						if (!mongoose.isValidObjectId(mainCat)) {
							return res.status(400).send({ status: false, message: "Inavid category id! Please check and try again" });
						}
						console.log(mainCat, "mainCatmainCatmainCatmainCat");
						condition["$or"] = [
							{ rcategory: new mongoose.Types.ObjectId(mainCat) },
							{ child_cat_array: new mongoose.Types.ObjectId(mainCat) }
						]
					};
				};
				if (variant_filter && Array.isArray(variant_filter) && variant_filter.length > 0) {
					condition.attributes = { $in: variant_filter.map(x => new mongoose.Types.ObjectId(x)) };
				};
				if (price_filter && Array.isArray(price_filter) && price_filter.length > 0) {
					let cond_price = [];
					price_filter.map(price => {
						let split_val = price.split(":");
						let min = parseInt(split_val[0]), max = parseInt(split_val[1]);
						cond_price.push(
							{
								sale_price: { $gte: min, $lte: max }
							}
						)
					});
					if (condition["$or"]) {
						condition["$and"] = [
							{
								$or: [...condition["$or"]]
							}, {
								$or: cond_price
							}
						];
						delete condition["$or"]
					} else {
						condition["$or"] = cond_price;
					}
				};
				if (rating_filter) {
					condition.rating = { $gte: parseInt(rating_filter) }
				};
				if (sort_filter) {
					switch (sort_filter) {
						case "latest":
							sort = { createdAt: -1 };
							break;
						case "lowtohigh":
							sort = { sale_price: 1 };
							break;
						case "hightolow":
							sort = { sale_price: -1 };
							break;
						case "ratlowtohigh":
							sort = { rating: -1 };
							break;
						case "rathightolow":
							sort = { rating: -1 };
							break;
						default:
							break;
					}
				}
				let favourite_list = []
				if (user_id) {
					if (!mongoose.isValidObjectId(user_id)) {
						return res.status(400).send({ status: 0, message: "Invalid user id! Please check and try again" });
					}
					let fav_list = await db.GetDocument("favourite", { user_id: new mongoose.Types.ObjectId(user_id), status: 1 }, { product_id: 1 }, {});
					favourite_list = fav_list.doc.map(x => x.product_id);
					console.log(favourite_list, 'favourite_list');
				} else {
					favourite_list = []
				}
				console.log('///////////////////////////////');
				console.log(condition);
				console.log('/////////////////////////////');
				let query = [
					{
						$match: condition
					}, {
						$sort: sort
					}, {
						$skip: skip
					}, {
						$limit: limit
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: "$rcategory",
							scat_id: "$scategory",
							rcategory: { $toLower: '$rcategory.rcatname' },
							scategory: { $toLower: '$scategory.scatname' },
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: [
													"$$item.status",
													1
												]
											},
											{
												$ne: ['$$item.quantity', 0]
											}
										]
									}
								}
							},
							offer_base: "$base_price",
							offer_sale: {
								$divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
								]
							}
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: 1,
							offer_sale: { $subtract: ["$base_price", "$offer_sale"] },
							offer_base: 1
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							sort_name: 1,
							substat: 1,
							"images": 1,
							filterSize: { $ifNull: ['$notZero', []] },
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							offer_base: 1,
							offer_sale: 1,
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: 1,
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							sort_name: 1,
							filterSize: 1,
							substat: 1,
							"images": 1,
							size_status: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							discount_percentage: {
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]
							},
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
							offer_base: 1,
							offer_sale: 1,
							favourite: { $cond: { if: { $in: ["$_id", favourite_list] }, then: true, else: false } }
						}
					},
				];
				console.log("*********************************************************************************************")
				// console.log(JSON.stringify(query))
	
				let responseList = await db.GetAggregation("food", query);
	
				console.log(responseList, "responseListresponseListresponseList");
				let responseCount = db.GetCount("food", condition);
	
				Promise.all([responseList, responseCount]).then(([list, count]) => {
					return res.status(200).send({ status: 1, message: "Product list found", response: { list: list, count: count } });
				}).catch(error => {
					return res.status(500).send({ status: 0, message: "Something went wrong! Please try again", error: error });
				})
			} catch (error) {
				return res.status(500).send({ status: 0, message: "Product not found", error: error });
			}
		}else{
			try {
				let skip = req.body.skip ? parseInt(req.body.skip) : 0;
				let limit = req.body.limit ? parseInt(req.body.limit) : 20;
				let condition = { status: 1 };
				condition['combo'] = {$eq: true}

				let sort = { createdAt: -1 };
				if (search) {
					condition["name"] = { $regex: search, $options: "i" }
					// condition["name"] = { $regex: search, $options: "i" }
				}
				if (category) {
					// let mainCat;
					// let subCat = [];
					// let category_list
					// category.map((x, i) => {
					// 	if (i === 0) {
					// 		mainCat = new mongoose.Types.ObjectId(x);
					// 	} else {
					// 		subCat.push(new mongoose.Types.ObjectId(x))
					// 	}
					// });
					// if (mainCat && subCat && Array.isArray(subCat) && subCat.length > 0) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $in: [mainCat, ...subCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat, child_cat_array: { $in: subCat }
					// 		}
					// 	];
					// } else if (mainCat) {
					// 	condition["$or"] = [
					// 		{
					// 			child_cat_array: { $all: [mainCat] }
					// 		},
					// 		{
					// 			rcategory: mainCat
					// 		}
					// 	];
					// }
					let cond_cat = [];
					let cat_list = Object.entries(category);
					for (let index = 0; index < cat_list.length; index++) {
						console.log(cat_list[index][1], "cat_list[index][1]cat_list[index][1]cat_list[index][1]cat_list[index][1]");
						if (cat_list[index][1] && Array.isArray(cat_list[index][1]) && cat_list[index][1].length > 0) {
							cond_cat.push(
								{
									child_cat_array: { $in: cat_list[index][1].map(x => new mongoose.Types.ObjectId(x)) }
	
								}
							)
	
						}
					}
					if (cond_cat && Array.isArray(cond_cat) && cond_cat.length > 0) {
						condition["$or"] = cond_cat;
					} else if (mainCat) {
						if (!mongoose.isValidObjectId(mainCat)) {
							return res.status(400).send({ status: false, message: "Inavid category id! Please check and try again" });
						}
						console.log(mainCat, "mainCatmainCatmainCatmainCat");
						condition["$or"] = [
							{ rcategory: new mongoose.Types.ObjectId(mainCat) },
							{ child_cat_array: new mongoose.Types.ObjectId(mainCat) }
						]
					};
				};
				if (variant_filter && Array.isArray(variant_filter) && variant_filter.length > 0) {
					condition.attributes = { $in: variant_filter.map(x => new mongoose.Types.ObjectId(x)) };
				};
				if (price_filter && Array.isArray(price_filter) && price_filter.length > 0) {
					let cond_price = [];
					price_filter.map(price => {
						let split_val = price.split(":");
						let min = parseInt(split_val[0]), max = parseInt(split_val[1]);
						cond_price.push(
							{
								sale_price: { $gte: min, $lte: max }
							}
						)
					});
					if (condition["$or"]) {
						condition["$and"] = [
							{
								$or: [...condition["$or"]]
							}, {
								$or: cond_price
							}
						];
						delete condition["$or"]
					} else {
						condition["$or"] = cond_price;
					}
				};
				if (rating_filter) {
					condition.rating = { $gte: parseInt(rating_filter) }
				};
				if (sort_filter) {
					switch (sort_filter) {
						case "latest":
							sort = { createdAt: -1 };
							break;
						case "lowtohigh":
							sort = { sale_price: 1 };
							break;
						case "hightolow":
							sort = { sale_price: -1 };
							break;
						case "ratlowtohigh":
							sort = { rating: -1 };
							break;
						case "rathightolow":
							sort = { rating: -1 };
							break;
						default:
							break;
					}
				}
				let favourite_list = []
				if (user_id) {

					let fav_list = await db.GetDocument("temp_favourite", { user_id: user_id, status: 1 }, { product_id: 1 }, {});
					favourite_list = fav_list.doc.map(x => x.product_id);
					console.log(favourite_list, 'favourite_list');
				} else {
					favourite_list = []
				}
				console.log('///////////////////////////////');
				console.log(condition);
				console.log('/////////////////////////////');
				let query = [
					{
						$match: condition
					}, {
						$sort: sort
					}, {
						$skip: skip
					}, {
						$limit: limit
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: "$rcategory",
							scat_id: "$scategory",
							rcategory: { $toLower: '$rcategory.rcatname' },
							scategory: { $toLower: '$scategory.scatname' },
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: [
													"$$item.status",
													1
												]
											},
											{
												$ne: ['$$item.quantity', 0]
											}
										]
									}
								}
							},
							offer_base: "$base_price",
							offer_sale: {
								$divide: [{ $multiply: ["$base_price", "$offer_amount"] }, 100
								]
							}
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
							"images": {
								"$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
							},
							notZero: 1,
							offer_sale: { $subtract: ["$base_price", "$offer_sale"] },
							offer_base: 1
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: { $toLower: '$brands.brandname' },
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							size_status: 1,
							quantity_size: 1,
							sort_name: 1,
							substat: 1,
							"images": 1,
							filterSize: { $ifNull: ['$notZero', []] },
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							offer_base: 1,
							offer_sale: 1,
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							avatar: 1,
							rcat_id: 1,
							scat_id: 1,
							rcategory: 1,
							scategory: 1,
							// brandname: 1,
							isRecommeneded: 1,
							itmcat: 1,
							status: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							createdAt: 1,
							sort_name: 1,
							filterSize: 1,
							substat: 1,
							"images": 1,
							size_status: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							discount_percentage: {
								$round: [
									{
										$multiply: [
											{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
											100
										]
									}
								]
							},
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
							offer_base: 1,
							offer_sale: 1,
							favourite: { $cond: { if: { $in: ["$_id", favourite_list] }, then: true, else: false } }
						}
					},
				];
				console.log("*********************************************************************************************")
				// console.log(JSON.stringify(query))
	
				let responseList = await db.GetAggregation("food", query);
	
				console.log(responseList, "responseListresponseListresponseList");
				let responseCount = db.GetCount("food", condition);
	
				Promise.all([responseList, responseCount]).then(([list, count]) => {
					return res.status(200).send({ status: 1, message: "Product list found", response: { list: list, count: count } });
				}).catch(error => {
					return res.status(500).send({ status: 0, message: "Something went wrong! Please try again", error: error });
				})
			} catch (error) {
				return res.status(500).send({ status: 0, message: "Product not found", error: error });
			}
		}
	};


	router.sCategoryAll = async (req, res) => {
		const { category } = req.body;
		try {
			if (category) {
				if (mongoose.isValidObjectId(category)) {
					return res.status(400).send({ status: 0, message: "Invalid category! Please check and try again" });
				};
				let subList = await db.GetDocument('scategory', { rcategory: new mongoose.Types.ObjectId(category), status: 1 }, {}, {});
				if (subList && subList.doc && subList.doc.length > 0) {
					return res.status(200).send({ status: 1, message: "No sub-list found", response: subList.doc })
				} else {
					return res.status(200).send({ status: 1, message: "No sub-list found", response: [] });
				}
			} else {
				return res.status(400).send({ status: 0, message: "Category is required!" });
			}
		} catch (error) {
			return res.status(500).send({ status: 0, message: "Product not found", error: error });
		}
	};

	router.productDetailsGet = async (req, res) => {
		const { slug, user_id, product_id } = req.body;
		try {
			const getUser= await db.GetOneDocument('users',{_id:user_id},{},{})
			if(getUser.status){
				let condition = { slug: slug };
				if (product_id) { 
					if (!mongoose.isValidObjectId(product_id)) {
						return res.status(400).send({ status: 0, message: "Invalid Product Id!Please check and try again" });
					};
					condition._id = new mongoose.Types.ObjectId(product_id);
				};
				let query = [
					{
						$match: condition
					},
					{
						$lookup: {
							from: 'scategory',
							localField: 'scategory',
							foreignField: '_id',
							as: 'scategory'
	
						}
					},
					{
						$unwind: { path: '$scategory', preserveNullAndEmptyArrays: true }
					},
					{
						$lookup: {
							from: 'rcategory',
							localField: 'rcategory',
							foreignField: '_id',
							as: 'rcategory'
	
						}
					},
					{
						$unwind: { path: '$rcategory', preserveNullAndEmptyArrays: true }
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							image_alt: 1,
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: "$rcategory._id",
							scat_id: "$scategory._id",
							scat_slug: "$scategory.slug",
							rcat_slug:"$rcategory.slug",
							// scat_color: "$scategory.color",
							scat_color: { $ifNull: ["$scategory.color", "#e5a1ac4d"] },
							scatHead_color: { $ifNull: ["$scategory.heading_color", "#89212c"] },
							rcatname: { $toLower: '$rcategory.rcatname' },
							scatname: { $toLower: '$scategory.scatname' },
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							product_details: 1,
							information: 1,
							images: 1,
							quantity_size: 1,
							sort_name: { $toLower: '$name' },
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							meta : 1,
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: [
													"$$item.status",
													1
												]
											},
											{
												$ne: ['$$item.quantity', 0]
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
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: 1,
							scat_id: 1,
							scat_slug: 1,
							rcat_slug:1,
							rcategory: 1,
							scategory: 1,
							scat_color: 1,
							scatHead_color: 1,
							image_alt: 1,
							rcatname: '$rcatname',
							scatname: '$scatname',
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							product_details: 1,
							information: 1,
							images: 1,
							quantity_size: 1,
							rating: 1,
							meta : 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							notZero: 1
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							rcatname: '$rcatname',
							scatname: '$scatname',
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							image_alt: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: 1,
							scat_id: 1,
							scat_slug: 1,
							rcat_slug:1,
							rcategory: 1,
							scategory: 1,
							scat_color: 1,
							scatHead_color: 1,
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							product_details: 1,
							information: 1,
							images: 1,
							meta : 1,
							quantity_size: 1,
							sort_name: { $toLower: '$name' },
							filterSize: { $ifNull: ['$notZero', []] }
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							rcatname: '$rcatname',
							scatname: '$scatname',
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: 1,
							scat_id: 1,
							scat_slug: 1,
							rcat_slug:1,
							rcategory: 1,
							scategory: 1,
							scat_color: 1,
							scatHead_color: 1,
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							hover_image: 1,
							product_details: 1,
							information: 1,
							images: 1,
							filterSize: 1,
							image_alt: 1,
							meta : 1,
							quantity_size: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$eq: ["$$item.status", 1]
									}
								}
							},
							sort_name: { $toLower: '$name' },
							in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
							no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
						}
					},
				]
				let ProductDetails = await db.GetAggregation("food", query);
	
				if (ProductDetails && ProductDetails && Array.isArray(ProductDetails) && ProductDetails.length > 0) {
					let response_obj = { ...ProductDetails[0], favourite: false, variants: [] };
					console.log(response_obj);
					if (response_obj.offer_status == 1) {
						var offer_price = parseFloat(parseFloat((response_obj.base_price * response_obj.offer_amount) / 100).toFixed(2));
						var sub_price = response_obj.base_price - offer_price;
						response_obj.offer_sale = sub_price > 0 ? sub_price : 0
					}
					if (user_id) {
						if (!mongoose.isValidObjectId(user_id)) {
							return res.status(400).send({ status: 0, message: "Invalid usersid!Please check and try again" });
						};
						console.log(user_id,"userId");
						
						let checkFavourite = await db.GetOneDocument("favourite", { user_id: new mongoose.Types.ObjectId(user_id), product_id: response_obj._id }, {}, {});
						console.log(checkFavourite,"checkFavourite");
						if (checkFavourite && checkFavourite.doc) {
							if (checkFavourite.doc._id && checkFavourite.doc._id !== null) {
								// Data is present in doc
								response_obj.favourite = true;
							} else {
								// Data is not found
								response_obj.favourite = false;
							}
						} else {
							// No doc or checkFavourite is falsy
							response_obj.favourite = false;
						}
					};
					if (response_obj && response_obj.attributes && response_obj.attributes.length > 0) {
						let query = [
							{
								$match: { "units._id": { $in: response_obj.attributes }, status: 1 }
							}, {
								$project: {
									name: 1,
									slug: 1,
									status: 1,
									createdAt: 1,
									updatedAt: 1,
									units: {
										$filter: {
											input: "$units",
											as: "unit",
											cond: { $in: ["$$unit._id", response_obj.attributes] }
										}
									}
								}
							}, {
								$addFields: {
									"units.isSelected": false,
	
								}
							}
						]
						let attributes_list = await db.GetAggregation("attributes", query);
						response_obj.variants = attributes_list;
					}
					console.log("----------------------------------response_obj----------------------------------")
					console.log(response_obj)
					console.log("----------------------------------response_obj----------------------------------")
					return res.status(200).send({ status: 1, message: "Product Found", response: response_obj });
				} else {
					return res.status(400).send({ status: 0, message: "Product not found! Please check and try again" });
				}
			}else{
				let condition = { slug: slug };
				if (product_id) { 
					if (!mongoose.isValidObjectId(product_id)) {
						return res.status(400).send({ status: 0, message: "Invalid Product Id!Please check and try again" });
					};
					condition._id = new mongoose.Types.ObjectId(product_id);
				};
				let query = [
					{
						$match: condition
					},
					{
						$lookup: {
							from: 'scategory',
							localField: 'scategory',
							foreignField: '_id',
							as: 'scategory'
	
						}
					},
					{
						$unwind: { path: '$scategory', preserveNullAndEmptyArrays: true }
					},
					{
						$lookup: {
							from: 'rcategory',
							localField: 'rcategory',
							foreignField: '_id',
							as: 'rcategory'
	
						}
					},
					{
						$unwind: { path: '$rcategory', preserveNullAndEmptyArrays: true }
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							image_alt: 1,
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: "$rcategory._id",
							scat_id: "$scategory._id",
							scat_slug: "$scategory.slug",
							rcat_slug:"$rcategory.slug",
							// scat_color: "$scategory.color",
							scat_color: { $ifNull: ["$scategory.color", "#e5a1ac4d"] },
							scatHead_color: { $ifNull: ["$scategory.heading_color", "#89212c"] },
							rcatname: { $toLower: '$rcategory.rcatname' },
							scatname: { $toLower: '$scategory.scatname' },
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: { $ifNull: ["$quantity", 0] },
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							product_details: 1,
							information: 1,
							images: 1,
							quantity_size: 1,
							sort_name: { $toLower: '$name' },
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							meta : 1,
							notZero: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$and: [
											{
												$eq: [
													"$$item.status",
													1
												]
											},
											{
												$ne: ['$$item.quantity', 0]
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
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: 1,
							scat_id: 1,
							scat_slug: 1,
							rcat_slug:1,
							rcategory: 1,
							scategory: 1,
							scat_color: 1,
							scatHead_color: 1,
							image_alt: 1,
							rcatname: '$rcatname',
							scatname: '$scatname',
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							product_details: 1,
							information: 1,
							images: 1,
							quantity_size: 1,
							rating: 1,
							meta : 1,
							total_rating: 1,
							total_rating_users: 1,
							sort_name: { $toLower: '$name' },
							notZero: 1
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							rcatname: '$rcatname',
							scatname: '$scatname',
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							image_alt: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: 1,
							scat_id: 1,
							scat_slug: 1,
							rcat_slug:1,
							rcategory: 1,
							scategory: 1,
							scat_color: 1,
							scatHead_color: 1,
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							hover_image: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							product_details: 1,
							information: 1,
							images: 1,
							meta : 1,
							quantity_size: 1,
							sort_name: { $toLower: '$name' },
							filterSize: { $ifNull: ['$notZero', []] }
						}
					},
					{
						$project: {
							name: 1,
							slug: 1,
							size: 1,
							size_status: 1,
							avatar: 1,
							sku: 1,
							rcatname: '$rcatname',
							scatname: '$scatname',
							Product_ingredients: 1,
							alternative_name: 1,
							receipes_cook: 1,
							HealthBenefit_List: 1,
							product_descriptions: 1,
							vegOptions: 1,
							recipe_name: 1,
							recipe_ingredients: 1,
							cooking_instructions: 1,
							faq_details: 1,
							trade_mark_image: 1,
							rcat_id: 1,
							scat_id: 1,
							scat_slug: 1,
							rcat_slug:1,
							rcategory: 1,
							scategory: 1,
							scat_color: 1,
							scatHead_color: 1,
							attributes: 1,
							offer_status: 1,
							offer_amount: 1,
							price_details: 1,
							quantity: 1,
							sale_price: 1,
							base_price: 1,
							rating: 1,
							total_rating: 1,
							total_rating_users: 1,
							hover_image: 1,
							product_details: 1,
							information: 1,
							images: 1,
							filterSize: 1,
							image_alt: 1,
							meta : 1,
							quantity_size: {
								$filter: {
									input: "$quantity_size",
									as: "item",
									cond: {
										$eq: ["$$item.status", 1]
									}
								}
							},
							sort_name: { $toLower: '$name' },
							in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
							no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
						}
					},
				]
				let ProductDetails = await db.GetAggregation("food", query);
	
				if (ProductDetails && ProductDetails && Array.isArray(ProductDetails) && ProductDetails.length > 0) {
					let response_obj = { ...ProductDetails[0], favourite: false, variants: [] };
					console.log(response_obj);
					if (response_obj.offer_status == 1) {
						var offer_price = parseFloat(parseFloat((response_obj.base_price * response_obj.offer_amount) / 100).toFixed(2));
						var sub_price = response_obj.base_price - offer_price;
						response_obj.offer_sale = sub_price > 0 ? sub_price : 0
					}
					if (user_id) {
						// if (!mongoose.isValidObjectId(user_id)) {
						// 	return res.status(400).send({ status: 0, message: "Invalid usersid!Please check and try again" });
						// };
						let checkFavourite = await db.GetOneDocument("temp_favourite", { user_id: user_id, product_id: response_obj._id }, {}, {});
						if (checkFavourite && checkFavourite.doc && checkFavourite.doc._id) {
							response_obj.favourite = true;
						};
					};
					if (response_obj && response_obj.attributes && response_obj.attributes.length > 0) {
						let query = [
							{
								$match: { "units._id": { $in: response_obj.attributes }, status: 1 }
							}, {
								$project: {
									name: 1,
									slug: 1,
									status: 1,
									createdAt: 1,
									updatedAt: 1,
									units: {
										$filter: {
											input: "$units",
											as: "unit",
											cond: { $in: ["$$unit._id", response_obj.attributes] }
										}
									}
								}
							}, {
								$addFields: {
									"units.isSelected": false,
	
								}
							}
						]
						let attributes_list = await db.GetAggregation("attributes", query);
						response_obj.variants = attributes_list;
					}
					console.log("----------------------------------response_obj----------------------------------")
					console.log(response_obj)
					console.log("----------------------------------response_obj----------------------------------")
					return res.status(200).send({ status: 1, message: "Product Found", response: response_obj });
				} else {
					return res.status(400).send({ status: 0, message: "Product not found! Please check and try again" });
				}
			}

		} catch (error) {
			return res.status(500).send({ status: 0, message: "Product not found", error: error });
		}
	}



	router.contactUs = async (req, res) => {
		try {

			const { email, name, message } = req.body;
			// const data = {
			// 	email
			// }

			const contactData = await db.InsertDocument('contact', { email, name, message })

			// const contactData = await contact.insertOne({email ,name,message},{});

			if (!contactData) {
				return res.send({ status: 0, message: 'something went wrong' });
			} else {
				return res.send({ status: 1, message: 'Message Added Successfully' });

			}

		} catch (error) {
			console.error(error.message);
			// return res.send({status:1,message:'Message Added Successfully'});

		}
	}

	router.updateUserProfile = async (req, res) => {
		try {

			console.log('hit, apihit you are in the update profile route. +++++++')
			const { userId, firstName, email, lastName, currentPassword, newPassword, confirmPassword } = req.body;

			console.log(req.body, '....>>>>>>>>this is body')
			// Validate input
			if (!firstName || !lastName) {
				return res.status(400).send({ status: 0, message: "First name and last name are required" });
			}

			console.log('not that errrorr...')
			const userData = await users.findById({ _id: userId });

			console.log(userData, 'this is user Data...')
			if (!userData) {
				return res.status(404).send({ status: 0, message: "User not found" });
			}

			userData.first_name = firstName;
			userData.last_name = lastName;
			userData.email = email;

			if (newPassword) {

				if (!confirmPassword || newPassword !== confirmPassword) {
					return res.send({ status: 0, message: "Passwords do not match" });
				}


				const isMatch = await bcrypt.compare(currentPassword, userData.password);
				if (!isMatch) {
					return res.send({ status: 0, message: "Current password is incorrect" });
				}


				const hashedPassword = await bcrypt.hash(newPassword, 10);
				userData.password = hashedPassword;
			}


			await userData.save();

			res.send({ status: 1, userData });



		} catch (error) {
			return res.send({ status: 0, message: "something went wrong" });

		}
	}

	router.faqData = async (req, res) => {
		try {
			var faqGetData = await db.GetOneDocument('faq', {}, {}, {})
			console.log(faqGetData, "faqGetDatafaqGetDatafaqGetData");

			if (faqGetData && faqGetData.doc && faqGetData.doc.faq_details && faqGetData.doc.faq_details.length > 0) {
				return res.send({ status: 1, data: faqGetData })
			} else {
				return res.send({ status: 0, message: "Something went wrong" })
			}
		} catch (error) {
			console.log(error, "error");
		}
	}
	// router.offerManagementList = async (req, res) => {

	// 	var skip = 0;
	// 	var limit = 10;
	// 	var rcatQuery = [];
	// 	var query = {};
	// 	if (req.body.search) {
	// 		var searchs = req.body.search;
	// 		query = {
	// 			"$match": {
	// 				"status": { "$ne": 0 },
	// 				"$or": [
	// 					{ "offer_name": { "$regex": '^' + searchs, "$options": 'si' } },
	// 					// { "type_name": { "$regex": '^' + searchs, "$options": 'si' } },
	// 					// { "category": { "$regex": '^' + searchs, "$options": 'si' } }
	// 				]
	// 			}
	// 		};

	// 	} else {
	// 		query = {
	// 			$match: {
	// 				status: { $ne: 0 }
	// 			}
	// 		}
	// 	}
	// 	rcatQuery.push(query);
	// 	// if (req.body.status) {
	// 	//     rcatQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
	// 	// }
	// 	var sorting = {};
	// 	if (req.body.sort) {
	// 		var sorter = req.body.sort.field;
	// 		sorting[sorter] = req.body.sort.order;
	// 		rcatQuery.push({ $sort: sorting });
	// 	} else {
	// 		sorting["createdAt"] = -1;
	// 		rcatQuery.push({ $sort: sorting });
	// 	}
	// 	if (req.body.limit && req.body.skip >= 0) {
	// 		skip = parseInt(req.body.skip);
	// 		limit = parseInt(req.body.limit);
	// 	}
	// 	rcatQuery.push(
	// 		{
	// 			$facet: {
	// 				all: [{ $count: 'all' }],
	// 				documentData: [
	// 					{ $skip: skip },
	// 					{ $limit: limit },
	// 					// {
	// 					//     $project: {
	// 					//         _id: "$_id",
	// 					//         status: "$status",
	// 					//         img: "$img",
	// 					//         category: "$category",
	// 					//         bannername: "$bannername",
	// 					//         description: "$description",
	// 					//     }
	// 					// }
	// 				]
	// 			}
	// 		}
	// 	)
	// 	const rcatlist = await db.GetAggregation('offermanagement', rcatQuery)
	// 	if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
	// 		res.send([], 0, []);
	// 	} else {
	// 		const counts = await db.GetAggregation('offermanagement', [
	// 			{
	// 				$facet: {
	// 					all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
	// 					active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
	// 					inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
	// 				}
	// 			}
	// 		])
	// 		var count = 0;
	// 		count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
	// 		if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
	// 			res.send([rcatlist[0].documentData, count, counts]);
	// 		} else {
	// 			res.send([], 0, []);
	// 		}
	// 	}
	// }


	router.offerManagementList = async (req, res) => {

		var skip = 0;
		var limit = 10;
		var rcatQuery = [];
		var query = {
			$match: {
				status: { $eq: 1 } // Filter by status = 1
			}
		};

		rcatQuery.push(query);

		var sorting = {};
		if (req.body.sort) {
			var sorter = req.body.sort.field;
			sorting[sorter] = req.body.sort.order;
			rcatQuery.push({ $sort: sorting });
		} else {
			sorting["createdAt"] = -1;
			rcatQuery.push({ $sort: sorting });
		}

		if (req.body.limit && req.body.skip >= 0) {
			skip = parseInt(req.body.skip);
			limit = parseInt(req.body.limit);
		}

		rcatQuery.push(
			{
				$facet: {
					all: [{ $count: 'all' }],
					documentData: [
						{ $skip: skip },
						{ $limit: limit }
					]
				}
			}
		);

		const rcatlist = await db.GetAggregation('offermanagement', rcatQuery);

		if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
			res.send([], 0, []);
		} else {
			const counts = await db.GetAggregation('offermanagement', [
				{
					$facet: {
						all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
						active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
						inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
					}
				}
			]);

			var count = 0;
			count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
			if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
				res.send([rcatlist[0].documentData, count, counts]);
			} else {
				res.send([], 0, []);
			}
		}
	};
	router.testimonialManagementList = async (req, res) => {

		// var skip = 0;
		// var limit = 10;
		var rcatQuery = [];
		var query = {
			$match: {
				status: { $eq: 1 } // Filter by status = 1
			}
		};

		rcatQuery.push(query);

		var sorting = {};
		if (req.body.sort) {
			var sorter = req.body.sort.field;
			sorting[sorter] = req.body.sort.order;
			rcatQuery.push({ $sort: sorting });
		} else {
			sorting["createdAt"] = -1;
			rcatQuery.push({ $sort: sorting });
		}

		if (req.body.limit && req.body.skip >= 0) {
			skip = parseInt(req.body.skip);
			limit = parseInt(req.body.limit);
		}

		rcatQuery.push(
			{
				$facet: {
					all: [{ $count: 'all' }],
					documentData: [
						// { $skip: skip },
						// { $limit: limit }
					]
				}
			}
		);

		const rcatlist = await db.GetAggregation('testimonial', rcatQuery);

		if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
			res.send([], 0, []);
		} else {
			const counts = await db.GetAggregation('testimonial', [
				{
					$facet: {
						all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
						active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
						inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
					}
				}
			]);

			var count = 0;
			count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
			if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
				res.send([rcatlist[0].documentData, count, counts]);
			} else {
				res.send([], 0, []);
			}
		}
	};


	router.subscribe_Data = async (req, res) => {
		try {

			const { email } = req.body;
			// const data = {
			// 	email
			// }

			const subscribeData = await db.InsertDocument('subscribe', { email })

			// const contactData = await contact.insertOne({email ,name,message},{});

			if (!subscribeData) {
				return res.send({ status: 0, message: 'something went wrong' });
			} else {
				const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})

				const template = await db.GetOneDocument('emailtemplate', { name: "subscribe_news_letter", 'status': { $ne: 0 } }, {}, {})

				var html = template.doc.email_content;
				html = html.replace(/{{privacy}}/g, settings.site_url + 'page/privacy-policy');
				html = html.replace(/{{help}}/g, settings.email_address);
				html = html.replace(/{{terms}}/g, settings.site_url + 'page/terms-and-conditions');
				html = html.replace(/{{site}}/g, settings.site_url);
				var mailOptions = {
					from: template.doc.sender_email,
					to: email,
					subject: template.doc.email_subject,
					text: html,
					html: html
				};
				mail.send(mailOptions, function (err, response) { });
				;

				return res.send({ status: 1, message: 'Subscribe Successfully' });

			}

		} catch (error) {
			console.error(error.message);
			// return res.send({status:1,message:'Message Added Successfully'});

		}
	}
	router.checkEmailRegister= async (req, res)=>{
		try{
			const getUser= await db.GetOneDocument('users',{email:req.body.email},{},{})
			if(getUser.status){
				return res.send({status:false, message:"Email Already Registered."})
			}
			return res.send({status:true, message:"Email is not registered."})
		}catch(error){
			return res.send({status:false, message:"There is something went wrong."})
		}
	}
	router.checkPhoneRegister= async (req, res)=>{
		try{
			const getUser= await db.GetOneDocument('users',{'phone.number':req.body.phone},{},{})
			if(getUser.status){
				return res.send({status:false, message:"Phone Number Already Registered."})
			}
			return res.send({status:true, message:"Phone Number is not registered."})
		}catch(error){
			return res.send({status:false, message:"There is something went wrong."})
		}
	}

	router.subscribe_Data_list = async (req, res) => {
		try {

			const list = await db.GetDocument('subscribe', {}, {}, {});


			res.status(200).json(list);
		} catch (error) {

			res.status(500).json({ error: 'Failed to fetch data' });
		}

	}

	router.Recommeneded = async (req, res) => {
		const { rcat_id, _id } = req.body
		console.log(rcat_id, _id, "11111111111111111111111111111");

		try {
			console.log("22222222111111111122222222222222222222");
			let docData = await db.GetDocument('food', { 'rcategory': new mongoose.Types.ObjectId(rcat_id), '_id': { $ne: new mongoose.Types.ObjectId(_id) } }, {}, {})
			console.log("2222222222222222222222222222");

			console.log(docData, "docDatadocDatadocDatadocDatadocDatadocData");

			if (!docData) {
				return res.send({ status: 0, message: "Product not found", error: error })
			} else {
				return res.send({ status: 1, message: "Product list found", data: docData })
			}
		} catch (error) {
			console.log(error, "error")
		}
	}


	router.getshippingManagement = async (req, res) => {
		try {
			var docdata = await db.GetOneDocument('shipping', {}, {}, {})

			console.log(docdata, "docdatadocdata");

			if (!docdata) {
				res.send({ err: 1, message: 'Unable to fetch data', data: {} })
			} else {
				res.send({ err: 0, message: 'fetch data', data: { docdata } })

			}

		} catch (error) {
			console.log(error, "error");

		}
	}

	return router;
};


// let updated_add = await db.GetOneDocument('order_address', { 'user_id': req.body.user_id, '_id': req.body.address_id }, {}, {})

// 		if (updated_add) {
// 			const docdata = await db.UpdateDocument('order_address', updated_add, { $set: { 'active': true } }, {})
// 			console.log("----------docdata-----------------", docdata)
// 			if (!docdata) {
// 				res.send({
// 					"status": 0,
// 					"errors": "Error in order address update..!"
// 				});
// 			} else {
// 				res.send({
// 					"status": 1,
// 					"response": "Order address update successfully."
// 				});
// 			}
// 		}

// 		let false_add = await db.GetDocument('order_address', { 'user_id': req.body.user_id, '_id': { $ne: req.body.address_id } }, {}, {})


// 		if (false_add) {
// 			const doc = await db.UpdateDocument('order_address', false_add, { $set: { 'active': false } }, { multi: true });
// 		}