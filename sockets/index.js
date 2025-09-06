module.exports = function (io) {
	var db = require('../controller/adaptor/mongodb.js');
	var async = require("async");
	var mongoose = require("mongoose");
	var CONFIG = require('../config/config');
	var apn = require('apn');
	var timezone = require('moment-timezone');
	var moment = require("moment");
	var gcm = require('node-gcm');
	var usernames = {};
	var rooms = [];
	var chatRooms = [];
	var driverdatas = [];
	var userdatas = [];
	var orderdatas = [];
	var socketrestaurant = [];
	var restaurantdatas = [];
	var socketdrivers = [];
	var socketusers = [];
	var socketorders = [];
	var notifyRooms = [];
	var twilio = require('../model/twilio.js');
	var clientconnected = false;
	var clienttimeStamp = Date.now();
	var GoogleAPI = require('../model/googleapis.js');
	var library = require('../model/library.js');
	var EventEmitter = require('events').EventEmitter;
	var ss = require('socket.io-stream');
	var fs = require('fs');
	var path = require('path');
	var events = new EventEmitter();
	var bcrypt = require('bcrypt-nodejs');
	var fs = require('fs');
	var path = require('path');
	var chat = io.of('/chat');
	var CONFIG = require('../config/config');
	var ss = require('socket.io-stream');
	var push = require('../model/pushNotification.js')(io);
	var syncEach = require('sync-each');

	// function isProductExist(inputArray, cartArray) {
	// 	const inputChaildIds = inputArray.flat().map(attr => attr.chaild_id);

	// 	return cartArray.some(cartItem => {
	// 		const cartChaildIds = cartItem.flat().map(attr => attr.chaild_id);

	// 		return inputChaildIds.every(id => cartChaildIds.includes(id));
	// 	});
	// }
	function isProductExist(inputArray, cartArray) {
		const inputChaildIds = inputArray.flat().map(attr => attr.chaild_id);

		return cartArray.some(cartItem => {

			const cartChaildIds = cartItem.variations.flat().map(attr => attr.chaild_id);

			return inputChaildIds.every(id => cartChaildIds.includes(id));
		});
	}


	function isObjectId(n) {
		return mongoose.Types.ObjectId.isValid(n);
	};
	var geoTz = require('geo-tz'),
		tz = require('moment-timezone');
	chat.on('connection', function (socket) {
		var req = socket.request;
		socket.on('resdirect-admin', function (data) {
			res.redirect(301, '/admin');
		})
		// by venkatesh starts
		socket.on('join network', function (data) {
			var room = data.user;
			if (room) {
				if (notifyRooms.indexOf(room) == -1) {
					notifyRooms.push(room);
				}
				socket.join(room);
				socket.emit('network created', room);
			}
		});

		socket.on('network disconnect', function (data) {
			if (data) {
				if (data.user) {
					var room = data.user;
					delete notifyRooms[room];
					socket.emit('network disconnect', room);
					socket.leave(room);
				}
			}
		});



		/* socket.on('create_restaurant', function (data) {
			var restaurantId;
			if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
				if (isObjectId(data.restaurantId)) {
					restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
				} else {
					socket.emit('create_restaurant', { err: 1, message: 'Invalid restaurantId' });
					return;
				}
			} else {
				socket.emit("create_restaurant", { err: 1, message: 'Invalid restaurantId' });
				return;
			}

			if (typeof restaurantId != 'undefined') {
				if (restaurantdatas.indexOf(restaurantId) == -1) {
					restaurantdatas.push(restaurantId);

				}
			}
			socket.join(restaurantId);
			socket.emit('restaurant_created', data);
			socketrestaurant[socket.id] = restaurantId;
		}); */
		socket.on('remove_restaurant', function (data) {
			var restaurantId;
			if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
				if (isObjectId(data.restaurantId)) {
					restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
				} else {
					socket.emit('remove_restaurant', { err: 1, message: 'Invalid restaurantId' });
					return;
				}
			} else {
				socket.emit("remove_restaurant", { err: 1, message: 'Invalid restaurantId' });
				return;
			}
			delete restaurantdatas[restaurantId];
			socket.leave(restaurantId);
		});
		// by venkatesh ends
		socket.on('r2e_get_location', function (data) {
			db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
				if (err || !socialsettings) {
					socket.emit("r2e_restaurants_search", { err: 1, message: 'Configure your app settings' });
				} else {
					var apiKey = socialsettings.settings.map_api.web_key;
					var lat;
					if (typeof data.lat != 'undefined' && data.lat != '') {
						lat = data.lat;
					} else {
						socket.emit("r2e_get_location", { err: 1, message: 'Invalid lat' });
						return;
					}
					var lon;
					if (typeof data.lon != 'undefined' && data.lon != '') {
						lon = data.lon;
					} else {
						socket.emit("r2e_get_location", { err: 1, message: 'Invalid long' });
						return;
					}
					var NodeGeocoder = require('node-geocoder');
					var options = {
						provider: 'google',
						//language:"EN"
						// Optional depending on the providers
						httpAdapter: 'https', // Default
						apiKey: apiKey, // for Mapquest, OpenCage, Google Premier
						formatter: null         // 'gpx', 'string', ...
					};
					var geocoder = NodeGeocoder(options);
					geocoder.reverse({ lat: lat, lon: lon }, function (err, res) {
						if (typeof res != 'undefined' && res.length > 0) {
							var response = res[0];
							if (typeof response != 'undefined' && typeof response.city == 'undefined') {
								if (typeof response.administrativeLevels != 'undefined' && typeof response.administrativeLevels.level2long != 'undefined') {
									response.city = response.administrativeLevels.level2long;
								}
							}
							socket.emit("r2e_get_location", { err: 0, message: '', result: { address: response } });
						} else {
							var geocode = {
								'latitude': lat,
								'longitude': lon
							};
							var newdata = { address: {} };
							GoogleAPI.geocode(geocode, function (response) {
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
									socket.emit("r2e_get_location", { err: 0, message: '', result: newdata });
								}
							})
						}
					});
				}
			})
		});
		socket.on('r2e_restaurants_search_count', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_restaurants_search_count", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_restaurants_search_count", { err: 1, message: 'Invalid long' });
				return;
			}
			var filters = '';
			var cuisine = [];
			var sortArray = [];
			var offer = false;
			var search_query;
			if (typeof data.filters != 'undefined' && data.filters != '') {
				filters = data.filters;
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
										cuisine = values;
									}
									if (option[0] == 's') {
										sortArray = values;
									}
									if (option[0] == 'o') {
										if (values.length > 0) {
											offer = values[0];
										}
									}
									if (option[0] == 'q') {
										if (values.length > 0) {
											search_query = values[0];
										}
									}
								}
							}
						}

					}
				}
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			let rcat = '';
			if (data.rcat && isObjectId(data.rcat)) {
				rcat = mongoose.Types.ObjectId(data.rcat);
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_restaurants_search_count", { err: 1, message: 'Configure your app settings' });
				} else {
					var temp_radius = settings.settings.radius || 20;
					var radius = parseInt(temp_radius);
					var filter_query = { "status": 1, food_count: { $gte: 1 } };
					if (cuisine.length > 0) {
						//filter_query.main_cuisine = { $in: cuisine };
						filter_query.main_cuisine = { $elemMatch: { name: { $in: cuisine } } };
					}
					if (offer == 'true') {
						filter_query['offer.offer_status'] = { $eq: 'true' };
					}
					if (rcat != '') {
						filter_query.rcategory = { $eq: rcat };
					}
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
								_id: 1,
								main_cuisine: 1,
								restaurantname: 1,
								main_cuisine_search: { $reduce: { input: "$main_cuisine", initialValue: "", in: { $concat: ["$$value", "$$this.name"] } } },
							}
						}];
					if (search_query != '' && search_query != '0' && typeof search_query != 'undefined') {
						var condition = {};
						condition['$or'] = [];
						var data = { "restaurantname": { $regex: search_query + '.*', $options: 'si' } };
						condition["$or"].push(data)
						var data = { "main_cuisine_search": { $regex: search_query + '.*', $options: 'si' } };
						condition["$or"].push(data)
						var data = { "foodDetails.count": { $gte: 1 } };
						condition["$or"].push(data)
						var aggregationdata = [{
							$lookup: {
								from: "food",
								let: {
									restaurantId: "$_id",
								},
								pipeline: [

									{ $match: { "$expr": { "$eq": ["$shop", "$$restaurantId"] }, status: { $eq: 1 }, name: { $regex: search_query + '.*', $options: 'si' } } },
									{ $limit: 1 },
									{ $count: 'count' }
								],
								as: "foodDetails"
							}
						},
						{ $unwind: { path: "$foodDetails", preserveNullAndEmptyArrays: true } },
						{ $match: condition },
						];
						citycondition = citycondition.concat(aggregationdata);
					}
					var aggregationdata = [{
						$group: {
							_id: "null",
							"count": { $sum: 1 },
						}
					}
					];
					citycondition = citycondition.concat(aggregationdata);
					db.GetAggregation('restaurant', citycondition, function (err, docdata) {
						if (err || !docdata) {
							socket.emit("r2e_restaurants_search_count", { err: 0, message: '', count: 0 });
						} else {
							if (docdata.length > 0) {
								var count = 0;
								if (typeof docdata[0].count != 'undefined') {
									count = docdata[0].count;
								}
								socket.emit("r2e_restaurants_search_count", { err: 0, message: '', count: count });
							} else {
								socket.emit("r2e_restaurants_search_count", { err: 0, message: '', count: 0 });
							}
						}
					})
				}
			})
		});
		socket.on('r2e_search_page_resolve', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_search_page_resolve", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_search_page_resolve", { err: 1, message: 'Invalid long' });
				return;
			}
			var filters = '';
			var cuisine = [];
			var sortArray = [];
			var offer = false;
			if (typeof data.filters != 'undefined' && data.filters != '') {
				filters = data.filters;
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
										cuisine = values;
									}
									if (option[0] == 's') {
										sortArray = values;
									}
									if (option[0] == 'o') {
										offer = values;
									}
								}
							}
						}

					}
				}
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_search_page_resolve", { err: 1, message: 'Configure your app settings' });
				} else {
					var temp_radius = settings.settings.radius || 20;
					var radius = parseInt(temp_radius);
					var filter_query = { "status": 1, food_count: { $gte: 1 } };
					if (data.rcat && isObjectId(data.rcat)) {
						filter_query.rcategory = { $eq: mongoose.Types.ObjectId(data.rcat) };
					}
					db.GetOneDocument('rcategory', { '_id': { $eq: data.rcat } }, {}, {}, function (err, rcatdata) {
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
									_id: 1,
									main_cuisine: 1
								}
							},
							{
								$facet: {
									all: [{ $count: 'all' }],
									cuisines: [
										{ $unwind: { path: "$main_cuisine", preserveNullAndEmptyArrays: true } },
										{
											$group: {
												_id: "null",
												"count": { $sum: 1 },
												"main_cuisine": { $addToSet: "$main_cuisine" }
											}
										},
										{
											$project: {
												_id: 1,
												count: 1,
												main_cuisine: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$main_cuisine.name", ''] }, ''] }] }, "$main_cuisine.name", ''] }
											}
										},
										{
											$group: {
												_id: "null",
												"count": { $first: "$count" },
												"cuisine": { $first: "$main_cuisine" }
											}
										},
										{
											$project: {
												"count": 1,
												"cuisine": {
													"$map": {
														"input": "$cuisine",
														"as": "el",
														"in": {
															'selected': { "$cond": [{ $or: [{ $gte: [{ "$size": { "$setIntersection": [cuisine, ['$$el']] } }, 1] }, { $ne: [{ "$ifNull": ["$level", ''] }, ''] }, { "$setEquals": [cuisine, ['$$el']] }] }, true, false] },
															'value': '$$el'
														}
													}
												}
											}
										},
										{
											$project: {
												"count": 1,
												"cuisine": {
													$filter: {
														input: "$cuisine",
														as: "cuisine",
														cond: { $and: [{ $ne: [{ "$ifNull": ["$$cuisine.value", ''] }, ''] }] }
													}
												}
											}
										}
									]
								}
							}
						];
						db.GetAggregation('restaurant', citycondition, function (err, docdata) {
							if (err || !docdata) {
								socket.emit("r2e_search_page_resolve", { err: 0, message: '', cuisine: [], count: 0 });
							} else {
								if (docdata.length > 0) {
									let count = docdata[0].all ? (docdata[0].all[0] ? docdata[0].all[0].all : 0) : 0;
									var cuisine = [];
									if (docdata[0].cuisines && docdata[0].cuisines.length > 0 && count) {
										if (docdata[0].cuisines[0].cuisine && docdata[0].cuisines[0].cuisine.length > 0) {
											cuisine = docdata[0].cuisines[0].cuisine;
										}
									}
									if (rcatdata && rcatdata.is_cuisine != 1) {
										cuisine = [];
									}
									socket.emit("r2e_search_page_resolve", { err: 0, message: '', cuisine: cuisine, count: count });
								} else {
									socket.emit("r2e_search_page_resolve", { err: 0, message: '', cuisine: [], count: 0 });
								}
							}
						})
					})
				}
			})
		});
		socket.on('r2e_restaurants_search', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_restaurants_search", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_restaurants_search", { err: 1, message: 'Invalid long' });
				return;
			}
			var user_id;
			if (typeof data.user_id != 'undefined' && data.user_id != '') {
				if (isObjectId(data.user_id)) {
					user_id = new mongoose.Types.ObjectId(data.user_id);
				} else {
					socket.emit("r2e_restaurants_search", { err: 1, message: 'Invalid long' });
					return;
				}
			}
			var client_offset = (new Date).getTimezoneOffset();
			if (typeof data.client_offset != 'undefined') {
				client_offset = data.client_offset;
			}
			var filters = '';
			var cuisine = [];
			var sortArray = [];
			var offer = false;
			var search_query;
			var sort = { 'document.efp_time': 1 };
			if (typeof data.filters != 'undefined' && data.filters != '') {
				filters = data.filters;
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
										cuisine = values;
									}

									if (option[0] == 's') {
										if (values.length > 0) {
											if (values[0] == 'DEL_TIME' || values[0] == 'RATING') {
												if (values[0] == 'DEL_TIME') {
													sort = { 'document.eta': 1 };
												}
												if (values[0] == 'RATING') {
													sort = { 'document.avg_ratings': -1 };
												}
											}
										}
									}
									if (option[0] == 'o') {
										if (values.length > 0) {
											offer = values[0];
										}
									}
									if (option[0] == 'q') {
										if (values.length > 0) {
											search_query = values[0];
										}
									}
								}
							}
						}

					}
				}
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}

			var limit = 50;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}
			var isWeekend = new Date().getDay() % 6 == 0;
			var current_time = Date.now();
			var three_min_section = 3 * 60 * 1000;
			var before_three_min = current_time - three_min_section;
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_restaurants_search", { err: 1, message: 'Configure your app settings' });
				} else {
					db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
						if (err || !socialsettings) {
							socket.emit("r2e_restaurants_search", { err: 1, message: 'Configure your app settings' });
						} else {
							var apiKey = socialsettings.settings.map_api.web_key;
							var temp_radius = settings.settings.radius || 20;
							var radius = parseInt(temp_radius);
							var filter_query = { "status": 1, food_count: { $gte: 1 } };
							if (cuisine.length > 0) {
								filter_query.main_cuisine = { $elemMatch: { name: { $in: cuisine } } };
							}
							if (offer == 'true') {
								filter_query['offer.offer_status'] = { $eq: 'true' };
							}
							var eta_time = 0;
							if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
								eta_time = parseInt(settings.settings.eta_time)
							}
							if (data.rcat && isObjectId(data.rcat)) {
								filter_query.rcategory = { $eq: mongoose.Types.ObjectId(data.rcat) };
							}
							db.GetOneDocument('users', { '_id': user_id, status: { $eq: 1 } }, { favourite: 1 }, {}, function (err, user) {
								if (err) {
									socket.emit("r2e_restaurants_search", { err: 1, message: "User id is wrong..!" });
								} else {
									var favourite = [];
									if (typeof user_id != 'undefined' && user && typeof user.favourite != 'undefined') {
										for (var i = 0; i < user.favourite.length; i++) {
											var data = { id: user.favourite[i].id, timestamp: user.favourite[i].id };
											favourite.push(data);
										}
									}
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
												document: {
													username: "$username",
													food_count: "$food_count",
													_id: "$_id",
													restaurantname: "$restaurantname",
													foodDetails: "$foodDetails",
													slug: "$slug",
													time_setting: "$time_setting",
													working_hours: "$working_hours",
													avg_ratings: "$avg_ratings",
													availability: "$availability",
													about: "$about",
													skip: { $literal: skip },
													eta_time_settings: { $literal: eta_time },
													favourite: { $literal: favourite },
													avatar: "$food_img",
													distance: "$distance",
													main_cuisine: "$main_cuisine",
													main_cuisine_search: { $reduce: { input: "$main_cuisine", initialValue: "", in: { $concat: ["$$value", "$$this.name"] } } },
													offer: "$offer",
													efp_time: {
														"$cond": [{
															$and: [{
																$ne: [{ "$ifNull": ["$efp_time", ''] },
																	'']
															}, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] },
															{ $gte: ["$efp_time", 1] }]
														}, "$efp_time", 0]
													},
													location: "$location",
													latitude: "$location.lat",
													longitude: "$location.lng",
													driver_location: {
														$filter: {
															input: "$driver_location",
															as: "driver_location",
															cond: { $and: [{ $gte: ["$$driver_location.timestamp", before_three_min] }] }
														}
													},
												}
											}
										},
									]
									if (search_query != '' && search_query != '0' && typeof search_query != 'undefined') {
										var condition = {};
										condition['$or'] = [];
										var data = { "document.restaurantname": { $regex: search_query + '.*', $options: 'si' } };
										condition["$or"].push(data)
										var data = { "document.main_cuisine_search": { $regex: search_query + '.*', $options: 'si' } };
										condition["$or"].push(data)
										var data = { "foodDetails.count": { $gte: 1 } };
										condition["$or"].push(data)
										var aggregationdata = [{
											$lookup: {
												from: "food",
												let: {
													restaurantId: "$document._id",
												},
												pipeline: [
													{ $match: { "$expr": { "$eq": ["$shop", "$$restaurantId"] }, status: { $eq: 1 }, name: { $regex: search_query + '.*', $options: 'si' } } },
													{ $limit: 1 },
													{ $count: 'count' }
												],
												as: "foodDetails"
											}
										},
										{ $unwind: { path: "$foodDetails", preserveNullAndEmptyArrays: true } },
										{ $match: condition },
										];
										citycondition = citycondition.concat(aggregationdata);
									}
									var aggregationdata = [
										{
											$project: {
												document: {
													username: "$document.username",
													foodDetails: "$foodDetails",
													_id: "$document._id",
													favourite: { "$map": { "input": "$document.favourite", "as": "el", "in": "$$el.id" } },
													restaurantname: "$document.restaurantname",
													slug: "$document.slug",
													time_setting: "$document.time_setting",
													working_hours: "$document.working_hours",
													avg_ratings: "$document.avg_ratings",
													availability: "$document.availability",
													about: "$document.about",
													skip: { $add: 1 },
													avatar: "$document.avatar",
													distance: "$document.distance",
													main_cuisine: "$document.main_cuisine",
													offer: "$document.offer",
													efp_time: "$document.efp_time",
													location: "$document.location",
													latitude: "$document.location.lat",
													longitude: "$document.location.lng",
													driver_location: "$document.driver_location",
													driver_location: "$document.driver_location",
													eta: {
														$sum: [eta_time, "$document.efp_time"]
													},

												}
											}
										},
										{
											$group: {
												_id: "null",
												"document": {
													$push: "$document"
												}
											}
										},
										{ $unwind: { path: "$document", preserveNullAndEmptyArrays: true } },
										{ $sort: sort },
										{ '$skip': skip },
										{ '$limit': limit },
										{
											$project: {
												document: {
													username: "$document.username",
													_id: "$document._id",
													is_favourite: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ['$document.favourite', ''] }, ''] }, { $gte: [{ "$size": '$document.favourite' }, 1] }, { $or: [{ $gte: [{ "$size": { "$setIntersection": ['$document.favourite', ['$document._id']] } }, 1] }, { "$setEquals": ['$document.favourite', ['$document._id']] }] }] }, 1, 0] },
													restaurantname: "$document.restaurantname",
													slug: "$document.slug",
													time_setting: "$document.time_setting",
													working_hours: "$document.working_hours",
													avg_ratings: "$document.avg_ratings",
													availability: "$document.availability",
													about: "$document.about",
													foodDetails: "$document.foodDetails",
													avatar: "$document.avatar",
													skip: "$document.skip",
													distance: "$document.distance",
													main_cuisine: "$document.main_cuisine",
													offer: "$document.offer",
													efp_time: "$document.efp_time",
													location: "$document.location",
													latitude: "$document.location.lat",
													longitude: "$document.location.lng",
													eta: "$document.eta",
													eta: "$document.eta",
												}
											}
										},
										{
											$group: {
												_id: "null",
												"restaurantList": {
													$push: "$document"
												}
											}
										}
									];

									citycondition = citycondition.concat(aggregationdata);
									db.GetAggregation('restaurant', citycondition, function (err, docdata) {
										if (err || !docdata) {
											socket.emit("r2e_restaurants_search", { err: 0, message: '', restaurantList: [] });
										} else {
											var server_offset = (new Date).getTimezoneOffset();
											var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
											if (docdata.length > 0) {
												var restaurantList = [];
												if (typeof docdata[0].restaurantList != 'undefined' && docdata[0].restaurantList.length) {
													var distance = require('google-distance-matrix');
													distance.key(apiKey);
													distance.units('imperial');
													var origins = [lat.toString() + ',' + lon.toString()];
													var destinations = [];

													var rest_diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);

													for (var i = 0; i < docdata[0].restaurantList.length; i++) {
														/* if (typeof docdata[0].restaurantList[i].working_hours != 'undefined' && docdata[0].restaurantList[i].working_hours.length > 0) {
															docdata[0].restaurantList[i].working_hours.forEach(function (element) {
																if (typeof element.slots != "undefined" && element.slots.length > 0) {
																	for (var i = 0; i < element.slots.length; i++) {
																		element.slots[i].start_time = new Date(new Date(element.slots[i].start_time).getTime() + rest_diff_offset);
																		element.slots[i].end_time = new Date(new Date(element.slots[i].end_time).getTime() + rest_diff_offset);
																	}
																}
															})
														} */

														var latlong = docdata[0].restaurantList[i].location.lat.toString() + ',' + docdata[0].restaurantList[i].location.lng.toString();
														destinations.push(latlong)
													}
													if (destinations.length > 0) {
														distance.matrix(origins, destinations, function (err, distances) {
															if (typeof distances != 'undefined' && distances.status == 'OK') {
																for (var i = 0; i < origins.length; i++) {
																	for (var j = 0; j < destinations.length; j++) {
																		var origin = distances.origin_addresses[i];
																		var destination = distances.destination_addresses[j];
																		if (distances.rows[0].elements[j].status == 'OK') {
																			var distance = distances.rows[i].elements[j].distance.text;
																			var time_mins = parseInt(parseInt(distances.rows[i].elements[j].duration.value) / 60);
																			if (time_mins == 0) {
																				time_mins = 1;
																			}
																			docdata[0].restaurantList[j].eta = docdata[0].restaurantList[j].eta + time_mins;
																			var restaurant_id = docdata[0].restaurantList[j]._id;
																			var current_time = Date.now();
																			var three_min_section = 3 * 60 * 1000;
																			var before_three_min = current_time - three_min_section;
																			var updateDetails = { "$pull": { 'driver_location': { timestamp: { $lte: before_three_min } } } };
																			var condition = { "_id": restaurant_id };
																			db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
																			});
																		} else {
																			//no use
																		}
																	}
																}
															}
														});
													}
													restaurantList = docdata[0].restaurantList;
												}
												let day = '';
												let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
												let offset = tz.tz(tzname).utcOffset();
												day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
												socket.emit("r2e_restaurants_search", { err: 0, message: '', restaurantList: restaurantList, day: day, offset: offset });
											} else {
												socket.emit("r2e_restaurants_search", { err: 0, message: '', restaurantList: [] });
											}
										}
									})
								}
							});
						}
					})
				}
			})
		});

		socket.on('r2e_get_estimated_delivery_time', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: 'Invalid long' });
				return;
			}
			var restaurantId;
			if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
				if (isObjectId(data.restaurantId)) {
					restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
				} else {
					socket.emit('r2e_get_estimated_delivery_time', { err: 1, message: 'Invalid restaurantId' });
					return;
				}
			} else {
				socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: 'Invalid restaurantId' });
				return;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			var current_time = Date.now();
			var three_min_section = 3 * 60 * 1000;
			var before_three_min = current_time - three_min_section;
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: 'Configure your app settings' });
				} else {
					db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
						if (err || !socialsettings) {
							socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: 'Configure your app settings' });
						} else {
							var apiKey = socialsettings.settings.map_api.web_key;
							var temp_radius = settings.settings.radius || 20;
							var radius = parseInt(temp_radius);
							var filter_query = { "status": 1, food_count: { $gte: 1 } };
							var eta_time = 0;
							if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
								eta_time = parseInt(settings.settings.eta_time)
							}
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
										efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] },
										location: "$location",
										_id: "$_id",
										latitude: "$location.lat",
										longitude: "$location.lng",
										driver_location: {
											$filter: {
												input: "$driver_location",
												as: "driver_location",
												cond: { $and: [{ $gte: ["$$driver_location.timestamp", before_three_min] }] }
											}
										},
									}
								},
								{
									$project: {
										efp_time: "$efp_time",
										_id: "$_id",
										location: "$location",
										latitude: "$location.lat",
										longitude: "$location.lng",
										user_eta: { $literal: 0 },
										request: { $literal: '' },
										eta_time: { $literal: eta_time },
										driver_location: "$driver_location",
										driver_location_eta: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_location", ''] }, ''] }, { $gt: [{ $size: "$driver_location" }, 0] }] }, { $sum: [eta_time, "$efp_time", { $divide: [{ $sum: { "$map": { "input": "$driver_location", "as": "el", "in": "$$el.time" } } }, { $size: "$driver_location" }] }] }, { $sum: [eta_time, "$efp_time", 40] }] },
										//eta: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$driver_location", ''] }, ''] }, { $gt: [{ $size: "$driver_location" }, 0] }] }, { $sum: [eta_time, "$efp_time", { $divide: [{ $sum: { "$map": { "input": "$driver_location", "as": "el", "in": "$$el.time" } } }, { $size: "$driver_location" }] }] }, { $sum: [eta_time, "$efp_time", 40] }] },
										eta: {
											$sum: [eta_time, "$efp_time"]
										},
									}
								}
							];
							db.GetAggregation('restaurant', citycondition, function (err, docdata) {
								if (err || !docdata) {
									socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: '', restaurantList: {} });
								} else {
									if (docdata.length > 0) {
										var restaurantList = {};
										if (typeof docdata[0]._id != 'undefined') {
											var distance = require('google-distance-matrix');
											distance.key(apiKey);
											distance.units('imperial');
											var origins = [lat.toString() + ',' + lon.toString()];
											var destinations = [];
											var latlong = docdata[0].location.lat.toString() + ',' + docdata[0].location.lng.toString();
											destinations.push(latlong)
											if (destinations.length > 0) {
												distance.matrix(origins, destinations, function (err, distances) {
													if (typeof distances != 'undefined' && distances.status == 'OK') {
														docdata[0].request = distances.status;
														for (var i = 0; i < origins.length; i++) {
															for (var j = 0; j < destinations.length; j++) {
																var origin = distances.origin_addresses[i];
																var destination = distances.destination_addresses[j];
																if (distances.rows[0].elements[j].status == 'OK') {
																	var distance = distances.rows[i].elements[j].distance.text;
																	var time_mins = parseInt(parseInt(distances.rows[i].elements[j].duration.value) / 60);
																	if (time_mins == 0) {
																		time_mins = 1;
																	}
																	docdata[0].eta = docdata[0].eta + time_mins;
																	docdata[0].user_eta = time_mins;

																	var restaurant_id = docdata[0]._id;
																	var current_time = Date.now();
																	var three_min_section = 3 * 60 * 1000;
																	var before_three_min = current_time - three_min_section;
																	var updateDetails = { "$pull": { 'driver_location': { timestamp: { $lte: before_three_min } } } };
																	var condition = { "_id": restaurant_id };
																	db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
																	});
																}
															}
														}
														restaurantList = docdata[0];
														socket.emit("r2e_get_estimated_delivery_time", { err: 0, message: '', restaurantList: restaurantList });
													} else {
														docdata[0].eta = docdata[0].eta + 30;
														var restaurant_id = docdata[0]._id;
														var current_time = Date.now();
														docdata[0].user_eta = 30;
														var three_min_section = 3 * 60 * 1000;
														var before_three_min = current_time - three_min_section;
														var updateDetails = { "$pull": { 'driver_location': { timestamp: { $lte: before_three_min } } } };
														var condition = { "_id": restaurant_id };
														db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
														});
														restaurantList = docdata[0];
														socket.emit("r2e_get_estimated_delivery_time", { err: 0, message: '', restaurantList: restaurantList });
													}
												});
											}
										} else {
											socket.emit("r2e_get_estimated_delivery_time", { err: 0, message: '', restaurantList: {} });
										}

									} else {
										socket.emit("r2e_get_estimated_delivery_time", { err: 1, message: 'Restaurant Not Found', restaurantList: {} });
									}
								}
							})
						}
					})
				}
			})
		});

		socket.on('r2e_check_restaurant_availability', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_check_restaurant_availability", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_check_restaurant_availability", { err: 1, message: 'Invalid long' });
				return;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			var restaurantId = '';
			if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
				if (isObjectId(data.restaurantId)) {
					restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
				} else {
					socket.emit('r2e_check_restaurant_availability', { err: 1, message: 'Invalid restaurantId' });
					return;
				}
			}
			var condition = { "status": 1, food_count: { $gte: 1 } };
			if (restaurantId != '') {
				condition._id = restaurantId;
			}

			if (data.rcat && isObjectId(data.rcat)) {
				condition.rcategory = { $eq: mongoose.Types.ObjectId(data.rcat) };
			}

			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_check_restaurant_availability", { err: 1, message: 'Configure your app settings' });
				} else {
					var temp_radius = settings.settings.radius || 20;
					var radius = parseInt(temp_radius);
					var aggregationdata = [
						{
							"$geoNear": {
								near: {
									type: "Point",
									coordinates: [parseFloat(lon), parseFloat(lat)]
								},
								distanceField: "distance",
								includeLocs: "location",
								query: condition,
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
								_id: 1,
								document: {
									_id: "$_id",
									main_city: "$main_city",
									status: "$status",
								}
							}
						}];
					data = { $group: { _id: null, count: { $sum: 1 } } };
					aggregationdata.push(data);
					db.GetAggregation('restaurant', aggregationdata, function (err, restaurantDetails) {
						if (typeof restaurantDetails != 'undefined' && restaurantDetails.length > 0 && typeof restaurantDetails[0].count != 'undefined') {
							socket.emit("r2e_check_restaurant_availability", { err: 0, message: '', count: restaurantDetails[0].count });
						} else {
							socket.emit("r2e_check_restaurant_availability", { err: 0, message: '', count: 0 });
						}
					});

				}
			})
		});

		socket.on('r2e_check_city_availability', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_check_city_availability", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_check_city_availability", { err: 1, message: 'Invalid long' });
				return;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}

			var condition = { "status": 1, food_count: { $gte: 1 } };

			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_check_city_availability", { err: 1, message: 'Configure your app settings' });
				} else {

					db.GetOneDocument('city', {
						"status": { $eq: 1 },
						"poly_test": {
							"$geoIntersects": {
								$geometry: { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] }
							}
						}
					}, {}, {}, function (err, docdata) {

						if (typeof docdata != 'undefined' && docdata.length > 0) {
							let cityid = docdata && docdata._id ? docdata._id : new mongoose.Types.ObjectId();
							socket.emit("r2e_check_city_availability", { err: 0, message: '', cityid: cityid, count: 1 });
						}
						if (err) {
							socket.emit("r2e_check_city_availability", { err: 0, message: '', count: 0, cityid: '' });
						}
					})
				}
			})
		});

		socket.on('r2e_favourite_restaurants', function (data) {
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_favourite_restaurants", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_favourite_restaurants", { err: 1, message: 'Invalid long' });
				return;
			}
			var user_id;
			if (typeof data.user_id != 'undefined' && data.user_id != '') {
				if (isObjectId(data.user_id)) {
					user_id = new mongoose.Types.ObjectId(data.user_id);
				} else {
					socket.emit("r2e_favourite_restaurants", { err: 1, message: 'Invalid user_id' });
					return;
				}
			} else {
				socket.emit("r2e_favourite_restaurants", { err: 1, message: 'Invalid user_id' });
				return;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			var client_offset = (new Date).getTimezoneOffset();
			if (typeof data.client_offset != 'undefined') {
				client_offset = data.client_offset;
			}
			var server_offset = (new Date).getTimezoneOffset();
			var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
			var limit = 20;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var latViewedId = data.latViewedId;
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						page = tmp;
						if (latViewedId) {
							if (tmp > 2) {
								skip = ((tmp - 1) * limit) - limit;
							}
						} else {
							skip = (tmp * limit) - limit;
						}
					}
				}
			}

			var isWeekend = new Date().getDay() % 6 == 0;
			var current_time = Date.now();
			var three_min_section = 3 * 60 * 1000;
			var before_three_min = current_time - three_min_section;
			let rcat = '';
			if (data.rcat && isObjectId(data.rcat)) {
				rcat = mongoose.Types.ObjectId(data.rcat)
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_favourite_restaurants", { err: 1, message: 'Configure your app settings' });
				} else {
					db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
						if (err || !socialsettings) {
							socket.emit("r2e_favourite_restaurants", { err: 1, message: 'Configure your app settings' });
						} else {
							var apiKey = socialsettings.settings.map_api.web_key;
							var temp_radius = settings.settings.radius || 20;
							var radius = parseInt(temp_radius);
							var filter_query = { "status": 1, food_count: { $gte: 1 } };
							var eta_time = 0;
							if (typeof settings.settings != 'undefined' && typeof settings.settings.eta_time != 'undefined') {
								eta_time = parseInt(settings.settings.eta_time)
							}
							db.GetOneDocument('users', { '_id': user_id, status: { $eq: 1 } }, { favourite: 1 }, {}, function (err, user) {
								if (err) {
									socket.emit("r2e_favourite_restaurants", { err: 1, message: "User id is wrong..!" });
								} else {
									var favourite = [];
									var favourite_id = [];
									if (typeof user_id != 'undefined' && user && typeof user.favourite != 'undefined') {
										for (var i = 0; i < user.favourite.length; i++) {
											var data = { id: user.favourite[i].id, timestamp: user.favourite[i].timestamp };
											favourite.push(data);
											favourite_id.push(data.id)
										}
									}
									if (favourite_id.length > 0) {
										filter_query._id = { $in: favourite_id };
									}
									if (rcat != '') {
										filter_query.rcategory = { $eq: rcat };
									}
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
											$project: {
												document: {
													username: "$username",
													food_count: "$food_count",
													_id: "$_id",
													favourite: { $literal: favourite },
													restaurantname: "$restaurantname",
													slug: "$slug",
													time_setting: "$time_setting",
													avg_ratings: "$avg_ratings",
													availability: "$availability",
													working_hours: "$working_hours",
													eta_time_settings: { $literal: eta_time },
													avatar: "$food_img",
													distance: "$distance",
													main_cuisine: "$main_cuisine",
													offer: "$offer",
													efp_time: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$efp_time", ''] }, ''] }, { $ne: ["$efp_time", ''] }, { $ne: ["$efp_time", 'null'] }, { $gte: ["$efp_time", 1] }] }, "$efp_time", 0] },
													location: "$location",
													latitude: "$location.lat",
													longitude: "$location.lng",
													driver_location: {
														$filter: {
															input: "$driver_location",
															as: "driver_location",
															cond: { $and: [{ $gte: ["$$driver_location.timestamp", before_three_min] }] }
														}
													},
												}
											}
										},
										{
											"$redact": {
												"$cond": {
													"if": { "$lte": ["$document.distance", radius] },
													"then": "$$KEEP",
													"else": "$$PRUNE"
												}
											}
										},
										{
											$project: {
												document: {
													username: "$document.username",
													_id: "$document._id",
													restaurantname: "$document.restaurantname",
													timestamp: {
														"$arrayElemAt": [{
															"$map": {
																"input": {
																	"$cond": [{
																		$and: [{
																			$ne: [{
																				"$ifNull": [{
																					$filter: {
																						input: "$document.favourite",
																						as: "favourite",
																						cond: { $and: [{ $eq: ["$$favourite.id", "$document._id"] }] }
																					}
																				}, '']
																			}, '']
																		}]
																	}, {
																		$filter: {
																			input: "$document.favourite",
																			as: "favourite",
																			cond: { $and: [{ $eq: ["$$favourite.id", "$document._id"] }] }
																		}
																	}, []]
																}, "as": "el", "in": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.timestamp", ''] }, ''] }] }, "$$el.timestamp", 0] }
															}
														}, 0]
													},
													slug: "$document.slug",
													time_setting: "$document.time_setting",
													avg_ratings: "$document.avg_ratings",
													availability: "$document.availability",
													working_hours: "$document.working_hours",
													avatar: "$document.avatar",
													distance: "$document.distance",
													main_cuisine: "$document.main_cuisine",
													offer: "$document.offer",
													efp_time: "$document.efp_time",
													location: "$document.location",
													latitude: "$document.location.lat",
													longitude: "$document.location.lng",
													driver_location: "$document.driver_location",
													driver_location: "$document.driver_location",
													//eta: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$document.driver_location", ''] }, ''] }, { $gt: [{ $size: "$document.driver_location" }, 0] }] }, { $sum: [eta_time, "$document.efp_time", { $divide: [{ $sum: { "$map": { "input": "$document.driver_location", "as": "el", "in": "$$el.time" } } }, { $size: "$document.driver_location" }] }] }, { $sum: [eta_time, "$document.efp_time", 40] }] },
													eta: {
														$sum: [eta_time, "$document.efp_time"]
													},
												}
											}
										},
										{ $sort: { 'document.timestamp': -1 } },
										{ $match: { $and: [{ "document.timestamp": { $gt: 0 } }] } },
										{ '$skip': 0 },
										{ '$limit': limit },
										{
											$group: {
												_id: "null",
												"restaurantList": {
													$push: "$document"
												}
											}
										},
										{
											$project: {
												document: "$restaurantList",
												restaurantList: "$restaurantList",
											}
										},
										{ $unwind: { path: "$document", preserveNullAndEmptyArrays: true } },

										{ $group: { _id: null, restaurantList: { $first: "$restaurantList" }, document: { $push: "$document" } } },
										{
											$project: {
												'restaurantList': {
													"$map": {
														"input": "$restaurantList",
														"as": "restaurant",
														"in": {
															'username': "$$restaurant.username",
															'_id': "$$restaurant._id",
															'restaurantname': "$$restaurant.restaurantname",
															'timestamp': "$$restaurant.timestamp",
															'slug': "$$restaurant.slug",
															'time_setting': "$$restaurant.time_setting",
															'avg_ratings': "$$restaurant.avg_ratings",
															'availability': "$$restaurant.availability",
															'working_hours': "$$restaurant.working_hours",
															'avatar': "$$restaurant.avatar",
															'distance': "$$restaurant.distance",
															'main_cuisine': "$$restaurant.main_cuisine",
															'offer': "$$restaurant.offer",
															'efp_time': "$$restaurant.efp_time",
															'location': "$$restaurant.location",
															'latitude': "$$restaurant.latitude",
															'longitude': "$$restaurant.longitude",
															'eta': "$$restaurant.eta",
															is_favourite: { $literal: 1 },
															//'is_available': { "$cond": [{ $and: [{ $gte: [{ "$size": { "$setIntersection": ["$restaurantList", ["$$restaurant"]] } }, 1] }] }, "1", '0'] },

														}
													}
												}
											}
										}
									];
									if (typeof latViewedId != 'undefined' && latViewedId != '') {
										citycondition[5] = { $match: { $and: [{ "document.timestamp": { $lt: parseInt(latViewedId) } }, { "document.timestamp": { $ne: parseInt(latViewedId) } }] } };
									}
									db.GetAggregation('restaurant', citycondition, function (err, docdata) {
										if (err || !docdata) {
											socket.emit("r2e_favourite_restaurants", { err: 0, message: '', restaurantList: [] });
										} else {
											if (docdata.length > 0) {
												var restaurantList = [];
												if (typeof docdata[0].restaurantList != 'undefined' && docdata[0].restaurantList.length) {
													var distance = require('google-distance-matrix');
													distance.key(apiKey);
													distance.units('imperial');
													var origins = [lat.toString() + ',' + lon.toString()];
													var destinations = [];

													var rest_diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);

													for (var i = 0; i < docdata[0].restaurantList.length; i++) {
														/* if (typeof docdata[0].restaurantList[i].working_hours != 'undefined' && docdata[0].restaurantList[i].working_hours.length > 0) {
															docdata[0].restaurantList[i].working_hours.forEach(function (element) {
																if (typeof element.slots != "undefined" && element.slots.length > 0) {
																	for (var i = 0; i < element.slots.length; i++) {
																		element.slots[i].start_time = new Date(new Date(element.slots[i].start_time).getTime() + rest_diff_offset);
																		element.slots[i].end_time = new Date(new Date(element.slots[i].end_time).getTime() + rest_diff_offset);
																	}
																}
															})
														} */

														var latlong = docdata[0].restaurantList[i].location.lat.toString() + ',' + docdata[0].restaurantList[i].location.lng.toString();
														destinations.push(latlong)
													}
													if (destinations.length > 0) {
														distance.matrix(origins, destinations, function (err, distances) {
															if (distances.status == 'OK') {
																for (var i = 0; i < origins.length; i++) {
																	for (var j = 0; j < destinations.length; j++) {
																		var origin = distances.origin_addresses[i];
																		var destination = distances.destination_addresses[j];
																		if (distances.rows[0].elements[j].status == 'OK') {
																			var distance = distances.rows[i].elements[j].distance.text;
																			var time_mins = parseInt(parseInt(distances.rows[i].elements[j].duration.value) / 60);
																			if (time_mins == 0) {
																				time_mins = 1;
																			}
																			docdata[0].restaurantList[j].eta = docdata[0].restaurantList[j].eta + time_mins;
																			var restaurant_id = docdata[0].restaurantList[j]._id;
																			var current_time = Date.now();
																			var three_min_section = 3 * 60 * 1000;
																			var before_three_min = current_time - three_min_section;
																			var updateDetails = { "$pull": { 'driver_location': { timestamp: { $lte: before_three_min } } } };
																			var condition = { "_id": restaurant_id };
																			db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
																			});
																		} else {
																			//no use
																		}
																	}
																}
															}
														});
													}
													restaurantList = docdata[0].restaurantList;
												}
												let day = '';
												let tzname = geoTz(parseFloat(lat), parseFloat(lon))[0];
												let offset = tz.tz(tzname).utcOffset();
												day = new Date(Date.now() + ((offset + server_offset) * 60000)).getDay();
												socket.emit("r2e_favourite_restaurants", { err: 0, message: '', restaurantList: restaurantList, day: day, offset: offset });
											} else {
												socket.emit("r2e_favourite_restaurants", { err: 0, message: '', restaurantList: [] });
											}
										}
									})
								}
							});
						}
					})
				}
			})
		});
		socket.on('r2e_get_order_address', async function (data) {
			var userId;
			// console.log(data, 'this is data from the order');
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_get_order_address', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_get_order_address", { err: 1, message: 'Invalid userId' });
				return;
			}
			// var cityid;
			// if (typeof data.cityid != 'undefined' && data.cityid != '') {
			// 	if (isObjectId(data.cityid)) {
			// 		cityid = new mongoose.Types.ObjectId(data.cityid);
			// 	} else {
			// 		socket.emit('r2e_get_order_address', { err: 1, message: 'Invalid cityid' });
			// 		return;
			// 	}
			// } else {
			// 	socket.emit("r2e_get_order_address", { err: 1, message: 'Invalid cityid' });
			// 	return;
			// }
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_get_order_address", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_get_order_address", { err: 1, message: 'Invalid long' });
				return;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			console.log(settings, 'this is the settings from the get address');
			if (settings.status === false) {
				socket.emit("r2e_get_order_address", { err: 1, message: 'Configure your app settings' });
			} else {
				var temp_radius = settings.doc.settings.radius || 20;
				var radius = parseInt(temp_radius);
				var condition = { $and: [{ user_id: userId }, { status: { $eq: 1 } }] };
				var aggregationdata = [
					{
						"$geoNear": {
							near: {
								type: "Point",
								coordinates: [parseFloat(lon), parseFloat(lat)]
							},
							distanceField: "distance",
							includeLocs: "loc",
							query: condition,
							distanceMultiplier: 0.001,
							spherical: true
						}
					},
					{
						$project: {
							document: {
								_id: "$_id",
								choose_location: "$choose_location",
								distance: "$distance",
								status: "$status",
								landmark: "$landmark",
								line1: "$line1",
								loc: "$loc",
								status: "$status",
								street: "$street",
								user_id: "$user_id",
								createdAt: "$createdAt",
								address_value: "$address_value",
							}

						}
					},
					{ $sort: { "document.createdAt": 1 } },
					{ $group: { _id: null, document: { $push: "$document" } } },
					{
						$project: {
							document: "$document",
							order_address: "$document",
						}
					},
					{ $unwind: { path: "$document", preserveNullAndEmptyArrays: true } },
					{
						"$redact": {
							"$cond": {
								"if": { "$lte": ["$document.distance", radius] },
								"then": "$$KEEP",
								"else": "$$PRUNE"
							}
						}
					},
					{ $group: { _id: null, order_address: { $first: "$order_address" }, document: { $push: "$document" } } },
					{
						$project: {
							'order_address': {
								"$map": {
									"input": "$order_address",
									"as": "address",
									"in": {
										'_id': "$$address._id",
										'choose_location': "$$address.choose_location",
										'distance': "$$address.distance",
										'status': "$$address.status",
										'landmark': "$$address.landmark",
										'_id': "$$address._id",
										'line1': "$$address.line1",
										'loc': "$$address.loc",
										'street': "$$address.street",
										'user_id': "$$address.user_id",
										'address_value': "$$address.address_value",
										'is_available': { "$cond": [{ $and: [{ $gte: [{ "$size": { "$setIntersection": ["$document", ["$$address"]] } }, 1] }] }, "1", '0'] },

									}
								}
							}
						}
					}
				];
				const userDetails = await db.GetAggregation('order_address', aggregationdata)
				console.log(userDetails, 'this is user details from the get address');
				if (typeof userDetails != 'undefined' && userDetails.length > 0) {
					socket.emit("r2e_get_order_address", { err: 0, message: '', Document: userDetails[0] });
				} else {
					socket.emit("r2e_get_order_address", { err: 0, message: '', Document: [] });
				}
			}



			// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			// 	if (err || !settings) {
			// 		socket.emit("r2e_get_order_address", { err: 1, message: 'Configure your app settings' });
			// 	} else {
			// 		var temp_radius = settings.settings.radius || 20;
			// 		var radius = parseInt(temp_radius);
			// 		var condition = { $and: [{ user_id: userId }, { status: { $eq: 1 } }] };
			// 		// {
			// 		// 	"$geoNear": {
			// 		// 		near: {
			// 		// 			type: "Point",
			// 		// 			coordinates: [parseFloat(lon), parseFloat(lat)]
			// 		// 		},
			// 		// 		distanceField: "distance",
			// 		// 		includeLocs: "loc",
			// 		// 		query: condition,
			// 		// 		distanceMultiplier: 0.001,
			// 		// 		spherical: true
			// 		// 	}
			// 		// },
			// 		var aggregationdata = [
			// 			{
			// 				"$geoNear": {
			// 					near: {
			// 						type: "Point",
			// 						coordinates: [parseFloat(lon), parseFloat(lat)]
			// 					},
			// 					distanceField: "distance",
			// 					includeLocs: "loc",
			// 					query: condition,
			// 					distanceMultiplier: 0.001,
			// 					spherical: true
			// 				}
			// 			},
			// 			{
			// 				$project: {
			// 					document: {
			// 						_id: "$_id",
			// 						choose_location: "$choose_location",
			// 						distance: "$distance",
			// 						status: "$status",
			// 						landmark: "$landmark",
			// 						line1: "$line1",
			// 						loc: "$loc",
			// 						status: "$status",
			// 						street: "$street",
			// 						user_id: "$user_id",
			// 						createdAt: "$createdAt",
			// 						address_value: "$address_value",
			// 					}

			// 				}
			// 			},
			// 			{ $sort: { "document.createdAt": 1 } },
			// 			{ $group: { _id: null, document: { $push: "$document" } } },
			// 			{
			// 				$project: {
			// 					document: "$document",
			// 					order_address: "$document",
			// 				}
			// 			},
			// 			{ $unwind: { path: "$document", preserveNullAndEmptyArrays: true } },
			// 			{
			// 				"$redact": {
			// 					"$cond": {
			// 						"if": { "$lte": ["$document.distance", radius] },
			// 						"then": "$$KEEP",
			// 						"else": "$$PRUNE"
			// 					}
			// 				}
			// 			},
			// 			{ $group: { _id: null, order_address: { $first: "$order_address" }, document: { $push: "$document" } } },
			// 			{
			// 				$project: {
			// 					'order_address': {
			// 						"$map": {
			// 							"input": "$order_address",
			// 							"as": "address",
			// 							"in": {
			// 								'_id': "$$address._id",
			// 								'choose_location': "$$address.choose_location",
			// 								'distance': "$$address.distance",
			// 								'status': "$$address.status",
			// 								'landmark': "$$address.landmark",
			// 								'_id': "$$address._id",
			// 								'line1': "$$address.line1",
			// 								'loc': "$$address.loc",
			// 								'street': "$$address.street",
			// 								'user_id': "$$address.user_id",
			// 								'address_value': "$$address.address_value",
			// 								'is_available': { "$cond": [{ $and: [{ $gte: [{ "$size": { "$setIntersection": ["$document", ["$$address"]] } }, 1] }] }, "1", '0'] },

			// 							}
			// 						}
			// 					}
			// 				}
			// 			}
			// 		];
			// 		db.GetAggregation('order_address', aggregationdata, function (err, userDetails) {
			// 			if (typeof userDetails != 'undefined' && userDetails.length > 0) {
			// 				socket.emit("r2e_get_order_address", { err: 0, message: '', Document: userDetails[0] });
			// 			} else {
			// 				socket.emit("r2e_get_order_address", { err: 0, message: '', Document: [] });
			// 			}
			// 		});
			// 	}
			// })
		});

		socket.on('r2e_get_saved_address', async function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_get_saved_address', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_get_saved_address", { err: 1, message: 'Invalid userId' });
				return;
			}
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}
			var condition = { user_id: userId, status: { $eq: 1 } };
			var aggregationdata = [
				{ $match: condition },
				{
					$project: {
						document: {
							_id: "$_id",
							choose_location: "$choose_location",
							name: "$name",
							first_name: "$first_name",
							last_name: "$last_name",
							phone: "$phone",
							country: "$country",
							city: "$city",
							state: "$state",
							fulladres: "$fulladres",
							line1: "$line1",
							loc: "$loc",
							status: "$status",
							street: "$street",
							user_id: "$user_id",
							createdAt: "$createdAt",
							zipcode: "$zipcode",
							active: "$active",
							address_value: "$address_value",
						}

					}
				},
				{ $sort: { "document.createdAt": 1 } },
				{ '$skip': skip },
				{ '$limit': limit },
				{ $group: { _id: null, order_address: { $push: "$document" } } },
			];
			const addressDetails = await db.GetAggregation('order_address', aggregationdata)
			if (typeof addressDetails != 'undefined' && addressDetails.length > 0) {
				if (typeof addressDetails[0].order_address != 'undefined') {
					socket.emit("r2e_get_saved_address", { err: 0, message: '', order_address: addressDetails[0].order_address });
				} else {
					socket.emit("r2e_get_saved_address", { err: 0, message: '', order_address: [] });
				}
			} else {
				socket.emit("r2e_get_saved_address", { err: 0, message: '', order_address: [] });
			}

		});

		socket.on('r2e_get_billing_address', async function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_get_billing_address', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_get_billing_address", { err: 1, message: 'Invalid userId' });
				return;
			}
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}
			var condition = { user_id: userId, status: { $eq: 1 } };
			var aggregationdata = [
				{ $match: condition },
				{
					$project: {
						document: {
							_id: "$_id",
							choose_location: "$choose_location",
							name: "$name",
							first_name: "$first_name",
							last_name: "$last_name",
							phone: "$phone",
							country: "$country",
							city: "$city",
							state: "$state",
							fulladres: "$fulladres",
							line1: "$line1",
							loc: "$loc",
							status: "$status",
							street: "$street",
							user_id: "$user_id",
							createdAt: "$createdAt",
							zipcode: "$zipcode",
							active: "$active",
							address_value: "$address_value",
						}

					}
				},
				{ $sort: { "document.createdAt": 1 } },
				{ '$skip': skip },
				{ '$limit': limit },
				{ $group: { _id: null, order_address: { $push: "$document" } } },
			];
			const addressDetails = await db.GetAggregation('billing_address', aggregationdata)
			if (typeof addressDetails != 'undefined' && addressDetails.length > 0) {
				if (typeof addressDetails[0].order_address != 'undefined') {
					console.log(addressDetails[0], 'in sockettt');
					socket.emit("r2e_get_billing_address", { err: 0, message: '', order_address: addressDetails[0].order_address });
				} else {
					socket.emit("r2e_get_billing_address", { err: 0, message: '', order_address: [] });
				}
			} else {
				socket.emit("r2e_get_billing_address", { err: 0, message: '', order_address: [] });
			}

		});

		socket.on('r2e_get_refer_coupons', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_get_refer_coupons', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_get_refer_coupons", { err: 1, message: 'Invalid userId' });
				return;
			}
			db.GetOneDocument('users', { '_id': userId }, { refer_activity: 1 }, {}, function (err, refer_coupons) {
				if (err) {
					socket.emit("r2e_get_refer_coupons", { err: 1, message: 'Invalid userId' });
				} else {
					if (refer_coupons && refer_coupons.refer_activity && refer_coupons.refer_activity.length > 0) {
						socket.emit("r2e_get_refer_coupons", { err: 0, message: '', refer_coupons: refer_coupons.refer_activity });
					} else {
						socket.emit("r2e_get_refer_coupons", { err: 0, message: '', refer_coupons: [] });
					}
				}
			});
		});
		socket.on('r2e_get_order_details', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_get_order_details', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_get_order_details", { err: 1, message: 'Invalid userId' });
				return;
			}
			var sort = { 'document.createdAt': -1 };
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_get_order_details", { err: 1, message: 'Configure your app settings' });
				} else {
					var filter_query = { "user_id": userId };
					var condition = [
						{ $match: filter_query },
						{ '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
						{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
						{ '$lookup': { from: 'city', localField: 'city_id', foreignField: '_id', as: 'restaurantDetails' } },
						{ "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
						{
							$project: {
								document: {
									createdAt: "$createdAt",
									status: "$status",
									schedule_date: "$schedule_date",
									schedule_time_slot: "$schedule_time_slot",
									show_schedule_time: "$show_schedule_time",
									schedule_time: "$schedule_time",
									refer_offer_price: "$refer_offer_price",
									order_status: { "$cond": [{ $or: [{ $eq: ["$status", 1] }, { $eq: ["$status", 15] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Outlet Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Outlet Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Picked Up", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By You", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
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
						},
						{ $sort: sort },
						{ '$skip': skip },
						{ '$limit': limit },
						{
							$group: {
								_id: "null",
								"orderDetails": {
									$push: "$document"
								}
							}
						}
					];
					db.GetAggregation('orders', condition, function (err, docdata) {
						if (err || !docdata) {
							socket.emit("r2e_get_order_details", { err: 0, message: '', orderDetails: [] });
						} else {
							if (docdata.length > 0) {
								var orderDetails = [];
								if (typeof docdata[0].orderDetails != 'undefined') {
									orderDetails = docdata[0].orderDetails;
								}
								socket.emit("r2e_get_order_details", { err: 0, message: '', orderDetails: orderDetails });
							} else {
								socket.emit("r2e_get_order_details", { err: 0, message: '', orderDetails: [] });
							}
						}
					})
				}
			})
		});
		socket.on('r2e_get_single_order_details', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_get_single_order_details', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_get_single_order_details", { err: 1, message: 'Invalid orderId' });
				return;
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {

				if (err || !settings) {
					socket.emit("r2e_get_single_order_details", { err: 1, message: 'Configure your app settings' });
				} else {
					var filter_query = { "user_id": orderId };
					var condition = [
						{ $match: filter_query },
						{ '$lookup': { from: 'transaction', localField: 'transaction_id', foreignField: '_id', as: 'transactionDetails' } },
						{ "$unwind": { path: "$transactionDetails", preserveNullAndEmptyArrays: true } },
						{ '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
						{ "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
						{ "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
						{ "$unwind": { path: "$users", preserveNullAndEmptyArrays: true } },
						{ "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driver" } },
						{ "$unwind": { path: "$driver", preserveNullAndEmptyArrays: true } },
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
									userDetails: {
										username: "$users.username",
										email: "$users.email",
										address: "$users.address",
										_id: "$users._id",
									},
									driverDetails: {
										username: "$driver.username",
										email: "$driver.email",
										address: "$driver.address",
										_id: "$driver._id",
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
							socket.emit("r2e_get_single_order_details", { err: 0, message: '', orderDetails: [] });
						} else {
							if (docdata.length > 0) {
								var orderDetails = [];
								// if (typeof docdata[0].orderDetails != 'undefined') {
								orderDetails = docdata
								// }
								socket.emit("r2e_get_single_order_details", { err: 0, message: '', orderDetails: orderDetails });
							} else {
								socket.emit("r2e_get_single_order_details", { err: 0, message: '', orderDetails: {} });
							}
						}
					})
				}
			})
		});
		socket.on('r2e_common_search_box', function (data) {
			var query;
			if (typeof data.query != 'undefined' && data.query != '') {
				query = data.query;
			} else {
				socket.emit("r2e_common_search_box", { err: 1, message: 'Invalid query' });
				return;
			}
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_common_search_box", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_common_search_box", { err: 1, message: 'Invalid long' });
				return;
			}
			var cuisine = '';
			if (typeof data.cuisine != 'undefined' && data.cuisine != '') {
				cuisine = data.cuisine;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			var skip = 0;
			if (data.skip) {
				var tmp = parseInt(data.skip);
				if (tmp != NaN && tmp > 0) {
					skip = tmp;
				}
			}
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var condition = { status: { $eq: 1 } };
			if (query != '' && query != '0' && typeof query != 'undefined') {
				condition['name'] = { $regex: query + '.*', $options: 'si' };
			}
			let rcat = '';
			if (data.rcat && isObjectId(data.rcat)) {
				rcat = mongoose.Types.ObjectId(data.rcat)
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_common_search_box", { err: 1, message: 'Configure your app settings' });
				} else {
					var temp_radius = settings.settings.radius || 20;
					var radius = parseInt(temp_radius);
					var aggregationdata = [
						{ $match: condition },
						{
							$project: {
								shop: "$shop",
								name: "$name"
							}
						}];
					data = { $group: { _id: null, name: { $push: "$name" }, ShopIds: { $push: "$shop" } } };
					aggregationdata.push(data);
					db.GetAggregation('food', aggregationdata, function (err, foodDetails) {
						var condition = { status: { $eq: 1 }, food_count: { $gte: 1 } };
						if (rcat != '') {
							condition.rcategory = { $eq: rcat };
						}
						var ShopIds = [];
						if (foodDetails && foodDetails.length > 0 && typeof foodDetails[0].ShopIds != 'undefined' && foodDetails[0].ShopIds.length > 0) {
							ShopIds = foodDetails[0].ShopIds;
						}
						var sorting = { restaurantname: 1 };
						var aggregationdata = [
							{
								"$geoNear": {
									near: {
										type: "Point",
										coordinates: [parseFloat(lon), parseFloat(lat)]
									},
									distanceField: "distance",
									includeLocs: "location",
									query: condition,
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
									document: {
										restaurantname: "$restaurantname",
										_id: "$_id",
										slug: "$slug",
										avatar: "$food_img",
										main_cuisine: "$main_cuisine",
										main_cuisine_search: { $reduce: { input: "$main_cuisine", initialValue: "", in: { $concat: ["$$value", "$$this.name"] } } },
										status: "$status",
										availability: "$availability"
									}

								}
							},
						];
						var condition = {};
						condition["$or"] = [];
						if (ShopIds.length) {
							var data = { "document._id": { $in: ShopIds } };
							condition["$or"].push(data)
						}
						if (query != '' && query != '0' && typeof query != 'undefined') {
							if (query != '' && query != '0' && typeof query != 'undefined') {
								var data = { "document.restaurantname": { $regex: query + '.*', $options: 'si' } };
								condition["$or"].push(data)
							}
							if (query != '' && query != '0' && typeof query != 'undefined') {
								var data = { "document.main_cuisine_search": { $regex: query + '.*', $options: 'si' } };
								condition["$or"].push(data)
							}
						}
						if (condition["$or"].length == 0) {
							delete condition["$or"];
						}
						var data = { $match: condition };
						aggregationdata.push(data);
						data = { $group: { _id: null, count: { $sum: 1 }, document: { $push: "$document" } } };
						aggregationdata.push(data);
						aggregationdata.push({ $unwind: { path: "$document", preserveNullAndEmptyArrays: true } });
						if (limit != '0' && limit != 'undefined' && limit != '' && !isNaN(limit)) {
							var data = { '$skip': skip };
							aggregationdata.push(data);
							var data = { '$limit': limit };
							aggregationdata.push(data);
						}
						data = { $group: { _id: null, count: { $first: "$count" }, document: { $push: "$document" } } };
						aggregationdata.push(data);
						db.GetAggregation('restaurant', aggregationdata, function (err, restaurantDetails) {
							if (typeof restaurantDetails != 'undefined' && restaurantDetails.length > 0) {
								var count = 0;
								if (typeof restaurantDetails[0].count != 'undefined') {
									count = restaurantDetails[0].count
								}
								var restaurant = [];
								if (typeof restaurantDetails[0].document != 'undefined') {
									restaurant = restaurantDetails[0].document
								}
								socket.emit("r2e_common_search_box", { err: 0, message: '', restaurantDetails: restaurant, count: count });
							} else {
								socket.emit("r2e_common_search_box", { err: 1, error: err, message: '', restaurantDetails: [], count: 0 });
							}
						});
					})

				}
			})
		});

		socket.on('r2e_mobile_cart_details', function (data) {
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_mobile_cart_details', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_mobile_cart_details", { err: 1, message: 'Invalid userId' });
				return;
			}
			var collection = 'cart';
			var condition = { user_id: userId };
			var server_offset = (new Date).getTimezoneOffset();
			var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
			var date = Date.now() + diff_offset;
			var isodate = new Date(date);
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err) {
					socket.emit("r2e_mobile_cart_details", { err: 1, message: 'Error in settings..!' });
				} else {
					var aggregationdata = [
						{ $match: condition },
						{ '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
						{ "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
						{ "$unwind": { path: "$cart_details", preserveNullAndEmptyArrays: true } },
						{ '$lookup': { from: 'food', localField: 'cart_details.id', foreignField: '_id', as: 'cart_details.foodDetails' } },
						{ "$unwind": { path: "$cart_details.foodDetails", preserveNullAndEmptyArrays: true } },
						{ $group: { _id: { _id: "$_id", user_id: "$user_id", restaurant_id: "$restaurant_id" }, restaurantDetails: { $first: "$restaurantDetails" }, discount_type: { $first: "$discount_type" }, coupon_code: { $first: "$coupon_code" }, coupon_discount: { $first: "$coupon_discount" }, cart_details: { $push: "$cart_details" } } },
						{ '$lookup': { from: 'coupon', localField: 'coupon_code', foreignField: 'code', as: 'couponDetails' } },
						{ "$unwind": { path: "$couponDetails", preserveNullAndEmptyArrays: true } },
						{ '$lookup': { from: 'orders', localField: 'coupon_code', foreignField: 'coupon_code', as: 'orderDetails' } },
						{ '$lookup': { from: 'city', localField: 'restaurantDetails.main_city', foreignField: 'cityname', as: 'cityDetails' } },
						{ "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
						{
							$project: {
								"user_id": "$_id.user_id",
								"restaurant_id": "$_id.restaurant_id",
								"cityDetails": "$cityDetails",
								"_id": "$_id._id",
								"name": "$restaurantDetails.restaurantname",
								"status": "$restaurantDetails.status",
								"avail": "$restaurantDetails.avail",
								"availability": "$restaurantDetails.availability",
								"package_charge": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$restaurantDetails.package_charge", ''] }, ''] }, { $ne: [{ "$ifNull": ["$restaurantDetails.package_charge.package_status", ''] }, ''] }, { $ne: [{ "$ifNull": ["$restaurantDetails.package_charge.package_amount", ''] }, ''] }, { $eq: ["$restaurantDetails.package_charge.package_status", 'true'] }] }, "$restaurantDetails.package_charge.package_amount", 0] },
								"location": "$restaurantDetails.location",
								"unique_code": "$restaurantDetails.unique_code",
								"time_setting": "$restaurantDetails.time_setting",
								"offer": "$restaurantDetails.offer",
								"avatar": "$restaurantDetails.avatar",
								"tax": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$restaurantDetails.unique_tax", ''] }, ''] }, { $ne: [{ "$ifNull": ["$restaurantDetails.unique_tax.rest_tax", ''] }, ''] }, { $ne: [{ "$ifNull": ["$restaurantDetails.unique_tax.rest_tax", ''] }, ''] }, { $eq: ["$restaurantDetails.com_taxtype", 'unique'] }] }, "$restaurantDetails.unique_tax.rest_tax", "$restaurantDetails.tax"] },
								"coupon_code": "$coupon_code",
								"isodate": { $literal: isodate },
								"couponDetails": "$couponDetails",
								"is_coupon_applied": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, 1, 0] },
								"discount_type": "$discount_type",
								"coupon_discount": "$coupon_discount",
								'coupon_limit': {
									"$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails", ''] }, ''] }, { $gt: [{ $size: "$orderDetails" }, 0] }] }, {
										$size: {
											$filter: {
												input: "$orderDetails",
												as: "order",
												cond: { $and: [{ $eq: ["$$order.user_id", "$_id.user_id"] }] }
											}
										}
									}, 0]
								},
								"cart_details": {
									"$map": {
										"input": "$cart_details",
										"as": "el",
										"in": {
											'id': '$$el.id',
											'cart_id': '$$el._id',
											'offer': '$$el.foodDetails.offer',
											'is_offer_available': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer.status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer.status", 1] }] }, 0, 1] },
											'offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer.status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer.status", 1] }] }, { $multiply: ['$$el.quantity', { $multiply: ['$$el.foodDetails.price', { $divide: ["$$el.foodDetails.offer.amount", 100] }] }] }, 0] },
											'price': '$$el.foodDetails.price',
											'slug': '$$el.foodDetails.slug',
											'status': '$$el.foodDetails.status',
											'visibility': '$$el.foodDetails.visibility',
											'quantity': '$$el.quantity',
											'instruction': '$$el.instruction',
											'food_addons': '$$el.foodDetails.addons',
											'food_base_pack': '$$el.foodDetails.base_pack',
											'addons': {
												"$map": {
													"input": "$$el.addons",
													"as": "addons",
													"in": {
														'_id': "$$addons._id",
														'addons_details': {
															"$cond": [{
																$and: [{
																	$ne: [{
																		"$ifNull": [{
																			"$arrayElemAt": [{
																				$filter: {
																					input: "$$el.foodDetails.addons",
																					as: "food_addons",
																					cond: { $and: [{ $eq: ["$$addons._id", "$$food_addons._id"] }] }
																				}
																			}, 0]
																		}, '']
																	}, '']
																},]
															}, {
																"$arrayElemAt": [{
																	$filter: {
																		input: "$$el.foodDetails.addons",
																		as: "food_addons",
																		cond: { $and: [{ $eq: ["$$addons._id", "$$food_addons._id"] }] }
																	}
																}, 0]
															}, {}]
														}
													}
												}
											},
											'base_pack': {
												"$map": {
													"input": "$$el.base_pack",
													"as": "base_pack",
													"in": {
														'_id': "$$base_pack._id",
														'sub_pack': "$$base_pack.sub_pack",
														'base_pack_details': {
															"$cond": [{
																$and: [{
																	$ne: [{
																		"$ifNull": [{
																			"$arrayElemAt": [{
																				$filter: {
																					input: "$$el.foodDetails.base_pack",
																					as: "food_base_pack",
																					cond: { $and: [{ $eq: ["$$base_pack._id", "$$food_base_pack._id"] }] }
																				}
																			}, 0]
																		}, '']
																	}, '']
																},]
															}, {
																"$arrayElemAt": [{
																	$filter: {
																		input: "$$el.foodDetails.base_pack",
																		as: "food_base_pack",
																		cond: { $and: [{ $eq: ["$$base_pack._id", "$$food_base_pack._id"] }] }
																	}
																}, 0]
															}, {}]
														}
													}
												}
											},
										}
									}
								}
							}
						},
						{
							$project: {
								"user_id": "$user_id",
								"restaurant_id": "$restaurant_id",
								"cityDetails": "$cityDetails",
								"_id": "$_id",
								"name": "$name",
								"status": "$status",
								"avail": "$avail",
								"availability": "$availability",
								"package_charge": "$package_charge",
								"avatar": "$avatar",
								"tax": "$tax",
								"location": "$location",
								"unique_code": "$unique_code",
								"coupon_code": "$coupon_code",
								"couponDetails": "$couponDetails",
								"is_coupon_err": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }, { $ne: [{ "$ifNull": ["$couponDetails", ''] }, ''] }, { $eq: ["$couponDetails.status", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'admin'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'restaurant'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }, { $gte: [{ "$size": { "$setIntersection": ["$couponDetails.restaurant", ["$restaurant_id"]] } }, 1] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, 'Coupon not valid1'] }] }, { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 0] }] }, '', 'Coupon not valid2'] }] },
								"is_coupon_applied": "$is_coupon_applied",
								"coupon_limit": "$coupon_limit",
								"discount_type": "$discount_type",
								"time_setting": "$time_setting",
								"offer": "$offer",
								"coupon_discount": "$coupon_discount",
								"cart_details": {
									"$map": {
										"input": "$cart_details",
										"as": "el",
										"in": {
											'id': '$$el.id',
											'cart_id': '$$el.cart_id',
											'offer': '$$el.offer',
											'is_offer_available': '$$el.is_offer_available',
											'offer_price': '$$el.offer_price',
											'price': '$$el.price',
											'slug': '$$el.slug',
											'status': '$$el.status',
											'quantity': '$$el.quantity',
											'addons': {
												"$map": {
													"input": "$$el.addons",
													"as": "addons",
													"in": {
														'quantity': '$$addons.quantity',
														'_id': "$$addons._id",
														'is_deleted': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details._id", ''] }, ''] }] }, 0, 1] },
														'name': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details.name", ''] }, ''] }] }, "$$addons.addons_details.name", ''] },
														'price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details.price", ''] }, ''] }] }, "$$addons.addons_details.price", 0] },
														'visibility': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$addons.addons_details.visibility", ''] }, ''] }] }, "$$addons.addons_details.visibility", 0] }
													}
												}
											},
											'base_pack': {
												"$map": {
													"input": "$$el.base_pack",
													"as": "base_pack",
													"in": {
														'_id': "$$base_pack._id",
														'is_deleted': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details._id", ''] }, ''] }] }, 0, 1] },
														'name': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details.name", ''] }, ''] }] }, "$$base_pack.base_pack_details.name", ''] },
														'description': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details.description", ''] }, ''] }] }, "$$base_pack.base_pack_details.description", ''] },
														'type': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$base_pack.base_pack_details.type", ''] }, ''] }] }, "$$base_pack.base_pack_details.type", ''] },
														'sub_pack': {
															"$map": {
																"input": "$$base_pack.sub_pack",
																"as": "sub_pack",
																"in": {
																	'_id': "$$sub_pack._id",
																	'sub_pack_details': {
																		"$cond": [{
																			$and: [{
																				$ne: [{
																					"$ifNull": [{
																						"$arrayElemAt": [{
																							$filter: {
																								input: "$$base_pack.base_pack_details.sub_pack",
																								as: "food_sub_pack",
																								cond: { $and: [{ $eq: ["$$sub_pack._id", "$$food_sub_pack._id"] }] }
																							}
																						}, 0]
																					}, '']
																				}, '']
																			},]
																		}, {
																			"$arrayElemAt": [{
																				$filter: {
																					input: "$$base_pack.base_pack_details.sub_pack",
																					as: "food_sub_pack",
																					cond: { $and: [{ $eq: ["$$sub_pack._id", "$$food_sub_pack._id"] }] }
																				}
																			}, 0]
																		}, {}]
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
							}
						},
						{
							$project: {
								"user_id": "$user_id",
								"cityDetails": "$cityDetails",
								"restaurant_id": "$restaurant_id",
								"cityDetails": "$cityDetails",
								"_id": "$_id",
								"name": "$name",
								"status": "$status",
								"avail": "$avail",
								"time_setting": "$time_setting",
								"package_charge": "$package_charge",
								"isodate": "$isodate",
								"availability": "$availability",
								"location": "$location",
								"unique_code": "$unique_code",
								"coupon_code": "$coupon_code",
								"avatar": "$avatar",
								"tax": "$tax",
								"couponDetails": "$couponDetails",
								"is_coupon_err": "$is_coupon_err",
								"is_coupon_applied": "$is_coupon_applied",
								"discount_type": "$discount_type",
								"coupon_discount": "$coupon_discount",
								"offer": "$offer",
								"food_offer_price": { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "offer", "in": "$$offer.offer_price" } } }] },
								"cart_details": {
									"$map": {
										"input": "$cart_details",
										"as": "el",
										"in": {
											'id': '$$el.id',
											'cart_id': '$$el.cart_id',
											'offer': '$$el.offer',
											'price': '$$el.price',
											'slug': '$$el.slug',
											'status': '$$el.status',
											'quantity': '$$el.quantity',
											'is_offer_available': '$$el.is_offer_available',
											'offer_price': '$$el.offer_price',
											"total": { $sum: [{ $multiply: ['$$el.quantity', '$$el.price'] }, { $sum: { "$map": { "input": "$$el.addons", "as": "addons", "in": { $sum: { $multiply: ['$$el.quantity', '$$addons.price'] } } } } }] }
										}
									}
								}
							}
						},
						{
							$project: {
								"user_id": "$user_id",
								"restaurant_id": "$restaurant_id",
								"cityDetails": "$cityDetails",
								"_id": "$_id",
								"name": "$name",
								"time_setting": "$time_setting",
								"status": "$status",
								"offer": "$offer",
								"isodate": "$isodate",
								"tax": "$tax",
								"food_offer_price": "$food_offer_price",
								"location": "$location",
								"avatar": "$avatar",
								"avail": "$avail",
								"availability": "$availability",
								"unique_code": "$unique_code",
								"cart_details": "$cart_details",
								"coupon_code": "$coupon_code",
								"couponDetails": "$couponDetails",
								"discount_type": "$discount_type",
								"is_coupon_err": "$is_coupon_err",
								"is_coupon_applied": "$is_coupon_applied",
								"coupon_discount": "$coupon_discount",
								"package_charge": "$package_charge",
								"total": { $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } },
								"sub_total": { $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, "$food_offer_price"] },
								"offer_price": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$offer.offer_status", ''] }, ''] }, { $eq: ["$offer.offer_status", 'true'] }, { $gt: ["$offer.offer_amount", 0] }, { $gt: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, "$offer.offer_amount"] }] }, { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$offer.offer_type", ''] }, ''] }, { $eq: ["$offer.offer_type", 'Percentage'] },] }, { "$cond": [{ $gt: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, "$food_offer_price"] }, "$offer.target_amount"] }, { "$cond": [{ $and: [{ $gt: [{ $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, "$food_offer_price"] }, { $divide: ["$offer.offer_amount", 100] }] }, "$offer.max_off"] }] }, "$offer.max_off", { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, "$food_offer_price"] }, { $divide: ["$offer.offer_amount", 100] }] }] }, 0] }, { "$cond": [{ $gte: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, "$food_offer_price"] }, "$offer.target_amount"] }, '$offer.offer_amount', 0] }] }, 0] }
							}
						},
						{
							$project: {
								"user_id": "$user_id",
								"restaurant_id": "$restaurant_id",
								"_id": "$_id",
								"name": "$name",
								"time_setting": "$time_setting",
								"status": "$status",
								"offer": "$offer",
								"package_charge": "$package_charge",
								"food_offer_price": "$food_offer_price",
								"avail": "$avail",
								"availability": "$availability",
								"location": "$location",
								"unique_code": "$unique_code",
								"avatar": "$avatar",
								"coupon_code": "$coupon_code",
								"couponDetails": "$couponDetails",
								"discount_type": "$discount_type",
								"coupon_discount": "$coupon_discount",
								"total": "$total",
								"coupon_price": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] },
								"is_coupon_err": "$is_coupon_err",
								"is_coupon_applied": "$is_coupon_applied",
								"sub_total": "$sub_total",
								'service_tax': { "$cond": [{ $and: [{ $gt: [{ $multiply: [{ $subtract: ["$sub_total", { $sum: [{ "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }, "$offer_price"] }] }, { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: [{ $subtract: ["$sub_total", { $sum: [{ "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }, "$offer_price"] }] }, { $divide: ["$tax", 100] }] }, 0] },
								"offer_price": "$offer_price",
								"pay_total": { $sum: [{ $multiply: [{ $subtract: ["$sub_total", { $sum: [{ "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }, "$offer_price"] }] }, { $divide: ["$tax", 100] }] }, { $subtract: [{ $subtract: ["$sub_total", "$offer_price"] }, { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] },] }] },
								"delivery_cost": { $literal: 0 },
								"deli_target_cost": { $literal: 0 },
								// "tax_percent": { $literal: 0 },
								"surge_fare": { $literal: 0 },
								"night_fare": { $literal: 0 },
							}
						}
					];
					db.GetAggregation(collection, aggregationdata, function (err, cartDetails) {
						if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {
							if (typeof cartDetails[0].cityDetails != 'undefined') {
								var default_amt = 0;
								if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.default_amt != 'undefined') {
									default_amt = cartDetails[0].cityDetails.delivery_charge.default_amt;
								}
								var delivery_charge = 0;
								if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.target_amount != 'undefined') {
									delivery_charge = cartDetails[0].cityDetails.delivery_charge.target_amount;
								}
								var delivery_cost = parseInt(default_amt);
								var deli_target_cost = parseInt(delivery_charge);
								var tax = settings.settings.service_tax || 0;
								var night_fare = 0;
								var surge_fare = 0;
								var time_now = timezone.tz(Date.now(), settings.settings.time_zone).format(settings.settings.time_format);
								var currentTime = moment(time_now, "HH:mm a");
								currentTime.toString();
								if (typeof cartDetails[0].cityDetails.night_fare_settings != 'undefined' && typeof cartDetails[0].cityDetails.night_fare_settings.status != 'undefined' && cartDetails[0].cityDetails.night_fare_settings.status == 1) {
									var nit_start_date = timezone.tz(cartDetails[0].cityDetails.night_fare_settings.start_time, settings.settings.time_zone).format(settings.settings.time_format);
									var nit_end_date = timezone.tz(cartDetails[0].cityDetails.night_fare_settings.end_time, settings.settings.time_zone).format(settings.settings.time_format);
									var startTime = moment(nit_start_date, "HH:mm a");
									startTime.toString();
									var endTime = moment(nit_end_date, "HH:mm a");
									endTime.toString();
									if (startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) {
										night_fare = parseFloat(cartDetails[0].cityDetails.night_fare_settings.amount);
									}
								}
								if (typeof cartDetails[0].cityDetails.extra_fare_settings != 'undefined' && typeof cartDetails[0].cityDetails.extra_fare_settings.status != 'undefined' && cartDetails[0].cityDetails.extra_fare_settings.status == 1) {
									var extra_start_date = timezone.tz(cartDetails[0].cityDetails.extra_fare_settings.start_time, settings.settings.time_zone).format(settings.settings.time_format);
									var extra_end_date = timezone.tz(cartDetails[0].cityDetails.extra_fare_settings.end_time, settings.settings.time_zone).format(settings.settings.time_format);
									var startTime = moment(extra_start_date, "HH:mm a");
									startTime.toString();
									var endTime = moment(extra_end_date, "HH:mm a");
									endTime.toString();
									if (startTime.isBefore(currentTime) && currentTime.isBefore(endTime)) {
										surge_fare = parseFloat(cartDetails[0].cityDetails.extra_fare_settings.amount);
									}
								}
								cartDetails[0].delivery_charge = delivery_cost;
								cartDetails[0].target_charge = deli_target_cost;
								cartDetails[0].tax_percent = tax;
								cartDetails[0].night_fare = night_fare;
								cartDetails[0].surge_fare = surge_fare;
								cartDetails[0].pay_total = cartDetails[0].pay_total + night_fare + surge_fare;
								if (cartDetails[0].pay_total > deli_target_cost) {
									cartDetails[0].delivery_charge = 0;
								}
								cartDetails[0].pay_total = cartDetails[0].pay_total + cartDetails[0].delivery_charge + cartDetails[0].package_charge;
								if (cartDetails[0].pay_total < 0) {
									cartDetails[0].pay_total = 0;
								}
							}
							socket.emit("r2e_mobile_cart_details", { err: 0, message: '', cartDetails: cartDetails[0] });
						} else {
							socket.emit("r2e_mobile_cart_details", { err: 0, error: err, message: '', cartDetails: {} });
						}
					})

				}
			});
		});

		socket.on('r2e_favourite_products', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_favourite_products', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_favourite_products", { err: 1, message: 'Invalid userId' });
				return;
			}

			var collection = 'favourite';
			var condition = { user_id: userId };
			db.GetDocument(collection, condition, {}, {}, function (err, fav) {
				if (err || !fav) {
					socket.emit("r2e_favourite_products", { err: 1, message: 'Unable to fetch data.' });
				} else {
					if (fav && typeof fav != 'undefined') {
						socket.emit("r2e_favourite_products", { err: 0, message: 'Sucessfully', favDetails: fav });
					} else {
						socket.emit("r2e_favourite_products", { err: 1, message: 'favourite Not Found.' });
					}
				}
			});
		});

		socket.on('r2e_cart_details', async function (data) {

			try {

				// return socket.emit("r2e_cart_details", { err: 1, message: data });
				var type;
				console.log(data, "hi you entered");
				if (typeof data.type != 'undefined' && data.type != '') {
					if (data.type == 'temp_cart' || data.type == 'cart') {
						type = data.type;
					} else {
						socket.emit("r2e_cart_details", { err: 1, message: 'Invalid Type' });
						return;
					}
				} else {
					socket.emit("r2e_cart_details", { err: 1, message: 'Invalid Type' });
					return;
				}
				var userId;
				let guestId;
				if (data.type == 'temp_cart') {
					if (typeof data.userId != 'undefined' && data.userId != '') {
						userId = data.userId;
						if (data.guestLogin) {
							guestId = data.guestId
						}
					} else {
						socket.emit("r2e_cart_details", { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					if (typeof data.userId != 'undefined' && data.userId != '') {
						if (isObjectId(data.userId)) {
							userId = new mongoose.Types.ObjectId(data.userId);
						} else {
							socket.emit('r2e_cart_details', { err: 1, message: 'Invalid userId' });
							return;
						}
					} else {
						socket.emit("r2e_cart_details", { err: 1, message: 'Invalid userId' });
						return;
					}
				}
				var client_offset = (new Date).getTimezoneOffset();

				var collection = 'cart';
				if (data.type == 'temp_cart') {
					collection = 'temp_cart';
				}
				var condition = { user_id: userId };

				if (data && data.cart_value == 1) {
					condition.type_status = 1;
				} else {
					condition.type_status = 0;
				}
				var server_offset = (new Date).getTimezoneOffset();
				var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
				var date = Date.now() + diff_offset;
				var isodate = new Date(date);
				const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
				if (settings.status === false) {
					socket.emit("r2e_cart_details", { err: 1, message: 'Error in settings..!' });
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
											sku: 1,
											sku2: "$price_details.sku",
											rcategory: 1,
											scategory: 1,
											itmcat: 1,
											status: 1,
											tax : 1,
											size: 1,
											hover_image: 1,
											base_price: 1,
											sale_price: 1,
											offer_status: 1,
											quantity: 1,
											offer_amount: 1,
											size_status: 1,
											quantity_size: 1,
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
											tax : 1,
											sku: 1,
											sku2: 1,
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
											tax : 1,
											sku: 1,
											sku2: 1,
											size: 1,
											hover_image: 1,
											base_price: 1,
											sale_price: 1,
											offer_status: 1,
											quantity: 1,
											offer_amount: 1,
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
											// quantity_check: {$cond:{
											// 	if:{$and:[
											// 		{$eq:["$size_status",1]},
											// 		{$ne:[{$size: "$filterSize"},0]}
											// 	]},
											// 	then: 1,
											// 	else: {
											// 		$cond:{
											// 			if:{
											// 				$and:[
											// 					{$eq:["$size_status",2]},
											// 					{$gt:["$quantity","$cart_details.quantity"]}
											// 				]
											// 			},
											// 			then: 1, else:0
											// 		}
											// 	}
											// }}
										}
									},
									// {$match:{"quantity_check": {$eq: 1}}},
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
						// {
						// 	$lookup: {
						// 		from: "city",
						// 		let: {
						// 			city_id: "$_id.city_id",
						// 		},
						// 		pipeline: [
						// 			{ $match: { "$expr": { "$eq": ["$_id", "$$city_id"] } } },
						// 			{ $limit: 1 },
						// 		],
						// 		as: "cityDetails"
						// 	}
						// },
						// { "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
						// {
						// 	$lookup: {
						// 	  from: "rcategory", // The collection that has the tax information
						// 	  localField: "cart_details.rcat_id", // The field in your cart details to match
						// 	  foreignField: "_id", // The field in the rcategory collection
						// 	  as: "rcatDetails" // The alias for the joined data
						// 	}
						//   },
						//   {
						// 	$unwind: {
						// 	  path: "$rcatDetails", // Unwind the joined array to a single document
						// 	  preserveNullAndEmptyArrays: true // Keep documents even if no match is found
						// 	}
						//   },



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
								"coupon_status": "$coupon_status",
								// "sku"   : "$cart_details.foodDetails.sku",
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
											'image': '$$el.image',
											// 'avatar': '$$el.avatar.fallback',
											// 'price_details': '$$el.foodDetails.price_details',
											'id': '$$el.id',
											// 'varntid': '$$el.varntid',
											'product_size': '$$el.foodDetails.size',
											'rcat_id': '$$el.rcat_id',
											'scat_id': '$$el.scat_id',
											'cart_id': '$$el._id',
											// 'category_tax': '$rcatDetails.Taxs',
											'sku': '$$el.foodDetails.sku',
											'sku2': '$$el.foodDetails.sku2',
											'size': '$$el.size',
											'offer': '$$el.foodDetails.offer_amount',
											'offer_status': '$$el.foodDetails.offer_status',
											'quantity_size': '$$el.foodDetails.quantity_size',
											'size_status': '$$el.size_status',
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
											'tax': '$$el.foodDetails.tax',
											'status': '$$el.foodDetails.status',
											'product_quantity': '$$el.foodDetails.quantity',
											'quantity': '$$el.quantity',
											// 'total': { $multiply: ['$$el.quantity', '$$el.mprice'] },
											'total': { $cond: [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, { $multiply: ['$$el.quantity', '$$el.mprice'] }, { $multiply: ['$$el.quantity', '$$el.psprice'] }] },
											'mtotal': { $multiply: ['$$el.quantity', '$$el.mprice'] },
											'variations': '$$el.variations'
										}
									}
								}
							}
						},
						{
							$project: {
								"user_id": "$user_id",
								"city_id": "$city_id",
								// "cityDetails": "$cityDetails",
								"type_status": "$type_status",
								// "status": "$cityDetails.status",
								// "tax": { "$ifNull": ["$cityDetails.tax.tax_amount", 0] },
								"_id": "$_id",
								// "sku" : "$sku",
								"coupon_code": "$coupon_code",
								"couponDetails": "$couponDetails",
								"food_offer_price": { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.offer_price" } } }] },
								"coupon_limit": "$coupon_limit",
								// "is_coupon_err": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }, { $ne: [{ "$ifNull": ["$couponDetails", ''] }, ''] }, { $eq: ["$couponDetails.status", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'admin'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'restaurant'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }, { $gte: [{ "$size": { "$setIntersection": ["$couponDetails.restaurant", ["$restaurant_id"]] } }, 1] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, 'Coupon not valid1'] }] }, { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 0] }] }, '', 'Coupon not valid2'] }] },
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
								"user_id": "$user_id",
								"city_id": "$city_id",
								"type_status": "$type_status",
								// "cityDetails": "$cityDetails",
								"_id": "$_id",
								"isodate": "$isodate",
								// "status": "$status",
								"food_offer_price": "$food_offer_price",
								// "sku" : "$sku",
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
								"pay_total": { $sum: [{ "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }, { $subtract: ["$sub_total", { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }] }] },
								"delivery_cost": { $literal: 0 },
								"deli_target_cost": { $literal: 0 },
								// "tax_percent": { $literal: 0 },
								"schedule_type": { $literal: '' },
								"schedule_time": { $literal: '' },
								"schedule_day": { $literal: '' }

							}
						}
					];
					const cartDetails = await db.GetAggregation(collection, aggregationdata)
					// favourite
					let favourite_list = [];
					console.log(userId, data.user_id, "userrrr");
					if (data.user_id) {
						//   if (!mongoose.isValidObjectId(userId)) {
						// 	socket.emit("r2e_checkout_cart_details", { err: 1, message: "Invalid user id! Please check and try again" });
						//   }

						let fav_list = await db.GetDocument("favourite", { user_id: new mongoose.Types.ObjectId(userId), status: 1 }, { product_id: 1 }, {});
						favourite_list = fav_list.doc.map(x => x.product_id.toString()); // Ensure to convert ObjectId to string
						console.log(favourite_list, 'favourite_list');
					} else if(!data.user_id){
						let fav_list = await db.GetDocument("temp_favourite", { user_id: userId, status: 1 }, { product_id: 1 }, {});
						favourite_list = fav_list.doc.map(x => x.product_id.toString()); // Ensure to convert ObjectId to string


						
					}else{
                     favourite_list = []
					}

					console.log(cartDetails, 'this is the initial card details');
					// console.log(cartDetails[0].cart_details, 'this is the initial card details');
					if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {

						if (cartDetails[0].cart_details) {
							// console.log(cartDetails[0].cart_details, 'this is the initial card details of that');

							for (let index = 0; index < cartDetails[0].cart_details.length; index++) {
								let substring_to_find = "./";
								if (typeof cartDetails[0].cart_details[index].id != 'undefined' && typeof cartDetails[0].cart_details[index].id != 'null') {
									cartDetails[0].cart_details[index].favourite = favourite_list.includes(cartDetails[0].cart_details[index].id.toString())

									console.log(cartDetails[0].cart_details[index].image && cartDetails[0].cart_details[index].image.indexOf(substring_to_find));

									if (cartDetails[0].cart_details[index].image && cartDetails[0].cart_details[index].image.indexOf(substring_to_find) !== -1) {
										cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image.slice(2);
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
						socket.emit("r2e_cart_details", { err: 0, message: '', cartDetails: cartDetails[0] });
					} else {
						await db.DeleteDocument('cart', { 'user_id': data.userId })
						socket.emit("r2e_cart_details", { err: 0, error: '', message: '', cartDetails: {} });
					}
				}
			} catch (err) {
				console.log("error in cart sockert", err)
			}
		});




		socket.on('r2e_checkout_cart_details', async function (data) {
			var type;
			console.log(data,"DATAAAAAAAA");
			
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					if (isObjectId(data.userId)) {
						userId = new mongoose.Types.ObjectId(data.userId);
					} else {
						socket.emit('r2e_checkout_cart_details', { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid userId' });
					return;
				}
			}

			var client_offset = (new Date).getTimezoneOffset();
			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId };
			if (data && data.cart_value == 1) {
				condition.type_status = 1;
			} else {
				condition.type_status = 0;
			}
			console.log("data", data)
			console.log("condition", condition)
			var server_offset = (new Date).getTimezoneOffset();
			var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
			var date = Date.now() + diff_offset;
			var isodate = new Date(date);
			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Error in settings..!' });
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
										tax : 1,
										size: 1,
										hover_image: 1,
										base_price: 1,
										sale_price: 1,
										offer_status: 1,
										quantity: 1,
										offer_amount: 1,
										size_status: 1,
										quantity_size: 1,
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
										tax : 1,
										offer_amount: 1,
										size_status: 1,
										quantity_size: 1,
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
										tax : 1,
										hover_image: 1,
										base_price: 1,
										sale_price: 1,
										offer_status: 1,
										quantity: 1,
										offer_amount: 1,
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
										// quantity_check: {$cond:{
										// 	if:{$and:[
										// 		{$eq:["$size_status",1]},
										// 		{$ne:[{$size: "$filterSize"},0]}
										// 	]},
										// 	then: 1,
										// 	else: {
										// 		$cond:{
										// 			if:{
										// 				$and:[
										// 					{$eq:["$size_status",2]},
										// 					{$gt:["$quantity","$cart_details.quantity"]}
										// 				]
										// 			},
										// 			then: 1, else:0
										// 		}
										// 	}
										// }}
									}
								},
								// {$match:{"quantity_check": {$eq: 1}}},
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
					// {
					// 	$lookup: {
					// 		from: "city",
					// 		let: {
					// 			city_id: "$_id.city_id",
					// 		},
					// 		pipeline: [
					// 			{ $match: { "$expr": { "$eq": ["$_id", "$$city_id"] } } },
					// 			{ $limit: 1 },
					// 		],
					// 		as: "cityDetails"
					// 	}
					// },
					// { "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
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
										'image': '$$el.image',
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
										'in_size': '$$el.foodDetails.in_size',
										'no_size': '$$el.foodDetails.no_size',
										'tax': '$$el.foodDetails.tax',
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
										'variations': '$$el.variations'
									}
								}
							}
						}
					},
					{
						$project: {
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
							"pay_total": { $sum: [{ "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }, { $subtract: ["$sub_total", { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }] }] },
							"delivery_cost": { $literal: 0 },
							"deli_target_cost": { $literal: 0 },
							// "tax_percent": { $literal: 0 },
							"schedule_type": { $literal: '' },
							"schedule_time": { $literal: '' },
							"schedule_day": { $literal: '' }

						}
					}
				];
				const cartDetails = await db.GetAggregation(collection, aggregationdata)
				console.log(cartDetails, 'how');
				if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {
					// if (typeof cartDetails[0].cityDetails != 'undefined') {
					// var default_amt = 0;
					// if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.default_amt != 'undefined') {
					// 	default_amt = cartDetails[0].cityDetails.delivery_charge.default_amt;
					// }
					// var delivery_charge = 0;
					// if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.target_amount != 'undefined') {
					// 	delivery_charge = cartDetails[0].cityDetails.delivery_charge.target_amount;
					// }
					// var delivery_cost = parseInt(default_amt);
					// var deli_target_cost = parseInt(delivery_charge);
					// var tax = settings.settings.service_tax || 0;
					// if (data.schedule_type == '1') {
					// 	cartDetails[0].schedule_type = data.schedule_type;
					// 	cartDetails[0].schedule_time = data.schedule_time;
					// 	cartDetails[0].schedule_day = data.schedule_day;
					// }
					// cartDetails[0].delivery_charge = delivery_cost;
					// cartDetails[0].target_charge = deli_target_cost;
					// cartDetails[0].tax_percent = tax;
					// if (cartDetails[0].sub_total > deli_target_cost) {
					// 	cartDetails[0].delivery_charge = 0;
					// }
					//cartDetails[0].pay_total = cartDetails[0].pay_total + cartDetails[0].delivery_charge;
					// }
					if (cartDetails[0].cart_details) {
						for (let index = 0; index < cartDetails[0].cart_details.length; index++) {
							console.log("Are you entered in this ");
							let substring_to_find = "./";
							if (cartDetails[0].cart_details[index].image && cartDetails[0].cart_details[index].image.indexOf(substring_to_find) !== -1) {
								cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image.slice(2);
							} else {
								cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image;
							}
						}
						// cartDetails[0].cart_details = cartDetails[0].cart_details.filter((value)=>value)
					}

					cartDetails[0].currency = settings.doc.settings.currency_symbol;
					cartDetails[0].pay_total = cartDetails[0].pay_total;
					if (cartDetails[0].pay_total < 0) {
						cartDetails[0].pay_total = 0;
					}
					socket.emit("r2e_checkout_cart_details", { err: 0, message: '', cartDetails: cartDetails[0] });
					if (condition && condition.type_status == 0) {
						if (cartDetails[0].cart_details.length == 0) {
							await db.DeleteDocument('cart', { 'user_id': data.userId })
							// db.DeleteDocument('cart', { 'user_id': data.userId}, function (err, res) { });
						}
						await db.DeleteDocument('cart', { 'user_id': data.userId, type_status: 1 })
						// db.DeleteDocument('cart', { 'user_id': data.userId, type_status: 1 }, function (err, res) { });
					}
				} else {
					// db.DeleteDocument('cart', { 'user_id': data.userId }, function (err, res) { });
					socket.emit("r2e_checkout_cart_details", { err: 0, message: '', cartDetails: {} });
				}
			}
			// db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			// 	if (err) {
			// 		socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Error in settings..!' });
			// 	} else {
			// 		var aggregationdata = [
			// 			{ $match: condition },
			// 			{ "$unwind": { path: "$cart_details", preserveNullAndEmptyArrays: true } },
			// 			{
			// 				$lookup: {
			// 					from: "food",
			// 					let: {
			// 						foodId: "$cart_details.id",
			// 						sizeC: "$cart_details.size",
			// 						qunty: "$cart_details.quantity"
			// 					},
			// 					pipeline: [
			// 						{ $match: { 
			// 								"$expr": {
			// 									"$and":[
			// 										{"$eq": ["$_id", "$$foodId"] },
			// 										{"$eq": ["$status", 1] },													
			// 									]
			// 								} 
			// 							} 
			// 						},
			// 						{
			// 							$project: {
			// 								name: 1,							
			// 								slug: 1,
			// 								avatar: 1,
			// 								rcategory: 1,
			// 								scategory: 1,
			// 								itmcat: 1,
			// 								status: 1,
			// 								size: 1,
			// 								hover_image: 1,
			// 								base_price: 1,
			// 								sale_price: 1,
			// 								offer_status: 1,
			// 								quantity: {$ifNull:['$quantity', 0]},
			// 								offer_amount: 1,
			// 								size_status: 1,
			// 								quantity_size: 1,
			// 								notZero: {
			// 									$filter: {
			// 										input: "$quantity_size",
			// 										as: "item",
			// 										cond: {
			// 											$and: [
			// 												{
			// 													$eq:["$$item.size","$$sizeC"]
			// 												},
			// 												{
			// 													$eq: ["$$item.status",1]
			// 												},
			// 												{
			// 													$gt:["$$item.quantity",0]
			// 												}
			// 											]
			// 										}
			// 									}
			// 								}
			// 							}
			// 						},
			// 						{
			// 							$project: {
			// 								name: 1,							
			// 								slug: 1,
			// 								avatar: 1,
			// 								rcategory: 1,
			// 								scategory: 1,
			// 								itmcat: 1,
			// 								status: 1,
			// 								size: 1,
			// 								hover_image: 1,
			// 								base_price: 1,
			// 								sale_price: 1,
			// 								offer_status: 1,
			// 								quantity: 1,
			// 								offer_amount: 1,
			// 								size_status: 1,
			// 								quantity_size: 1,
			// 								filterSize: {$ifNull:['$notZero', []]}
			// 							}
			// 						},
			// 						{
			// 							$project: {
			// 								name: 1,
			// 								slug: 1,
			// 								avatar: 1,
			// 								rcategory: 1,
			// 								scategory: 1,
			// 								itmcat: 1,
			// 								status: 1,
			// 								size: 1,
			// 								hover_image: 1,
			// 								base_price: 1,
			// 								sale_price: 1,
			// 								offer_status: 1,
			// 								quantity: 1,
			// 								offer_amount: 1,
			// 								size_status: 1,
			// 								filterSize: 1,
			// 								quantity_size: {$filter: {
			// 									input: "$quantity_size",
			// 									as: "item",
			// 									cond: {
			// 										$eq: [ "$$item.status", 1]
			// 									}
			// 								}},
			// 								in_size: {$cond:{if:{ $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0}},
			// 								no_size: {$cond:{if:{ $gt: ["$quantity", 0] }, then: 1, else: 0}},
			// 								quantity_check: {$cond:{
			// 									if:{$and:[
			// 										{$eq:["$size_status",1]},
			// 										{$ne:[{$size: "$filterSize"},0]}
			// 									]},
			// 									then: 1,
			// 									else: {
			// 										$cond:{
			// 											if:{
			// 												$and:[
			// 													{$eq:["$size_status",2]},
			// 													{$gte:["$quantity","$$qunty"]}
			// 												]
			// 											},
			// 											then: 1, else:0
			// 										}
			// 									}
			// 								}}
			// 							}
			// 						},
			// 						{$match:{"quantity_check": {$eq: 1}}},
			// 						{ $limit: 1 },
			// 					],
			// 					as: "cart_details.foodDetails"
			// 				}
			// 			},
			// 			{ "$unwind": { path: "$cart_details.foodDetails", preserveNullAndEmptyArrays: true } },
			// 			{ $group: { _id: { _id: "$_id", user_id: "$user_id", city_id: "$city_id" }, discount_type: { $first: "$discount_type" },type_status:{$first: "$type_status"}, coupon_code: { $first: "$coupon_code" }, coupon_discount: { $first: "$coupon_discount" }, cart_details: { $push: "$cart_details" } } },
			// 			{
			// 				$lookup: {
			// 					from: "coupon",
			// 					let: {
			// 						coupon_code: "$coupon_code",
			// 					},
			// 					pipeline: [
			// 						{ $match: { "$expr": { "$eq": ["$code", "$$coupon_code"] } } },
			// 						{ $limit: 1 },
			// 					],
			// 					as: "couponDetails"
			// 				}
			// 			},
			// 			{ "$unwind": { path: "$couponDetails", preserveNullAndEmptyArrays: true } },
			// 			{
			// 				$lookup: {
			// 					from: "orders",
			// 					let: {
			// 						coupon_code: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, "$coupon_code", ''] },
			// 						userId: "$_id.user_id",
			// 					},
			// 					pipeline: [
			// 						{
			// 							$match: {
			// 								$expr: {
			// 									$and: [
			// 										{ "$eq": ["$coupon_code", "$$coupon_code"] },
			// 										{ "$eq": ["$user_id", "$$userId"] },
			// 									]
			// 								}
			// 							}
			// 						},
			// 						{ $count: 'count' },
			// 					],
			// 					as: "orderDetails"
			// 				}
			// 			},
			// 			{ "$unwind": { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
			// 			{
			// 				$lookup: {
			// 					from: "city",
			// 					let: {
			// 						city_id: "$_id.city_id",
			// 					},
			// 					pipeline: [
			// 						{ $match: { "$expr": { "$eq": ["$_id", "$$city_id"] } } },
			// 						{ $limit: 1 },
			// 					],
			// 					as: "cityDetails"
			// 				}
			// 			},
			// 			{ "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
			// 			{
			// 				$project: {
			// 					"user_id": "$_id.user_id",
			// 					"city_id": "$_id.city_id",
			// 					// "cityDetails": "$cityDetails",
			// 					"type_status": "$type_status",
			// 					"_id": "$_id._id",
			// 					"coupon_code": "$coupon_code",
			// 					"isodate": { $literal: isodate },
			// 					"couponDetails": "$couponDetails",
			// 					"is_coupon_applied": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, 1, 0] },
			// 					"discount_type": "$discount_type",
			// 					"coupon_discount": "$coupon_discount",
			// 					'coupon_limit': "$orderDetails.count",
			// 					// 'cart_details': "$cart_details",
			// 					"cart_details": {
			// 						"$map": {
			// 							// "input": "$cart_details",
			// 							"input": {
			// 								"$filter": {
			// 								  "input": "$cart_details",
			// 								  "as": "cart",
			// 								  "cond": { 
			// 									   $eq: ["$$cart.id", "$$cart.foodDetails._id"],
			// 									//    $or:[
			// 									// 	{$and:[{$eq:["$$cart.foodDetails.size_status",1]}, {$eq:["$$cart.foodDetails.in_size",1]}]},
			// 									// 	{$and:[{$eq:["$$cart.foodDetails.size_status",2]}, {$eq:["$$cart.foodDetails.no_size",1]}]}
			// 									//    ]
			// 								    }
			// 								}
			// 							  },
			// 							"as": "el",
			// 							"in": {
			// 								'name': '$$el.foodDetails.name',
			// 								'image': '$$el.foodDetails.avatar',
			// 								// 'price_details': '$$el.foodDetails.price_details',
			// 								'id': '$$el.id',
			// 								// 'varntid': '$$el.varntid',
			// 								'product_size':'$$el.foodDetails.size',
			// 								'rcat_id': '$$el.rcat_id',
			// 								'scat_id': '$$el.scat_id',
			// 								'cart_id': '$$el._id',
			// 								'size':'$$el.size',
			// 								'offer': '$$el.foodDetails.offer_amount',
			// 								'quantity_size': '$$el.foodDetails.quantity_size',
			// 								'size_status': '$$el.size_status',
			// 								'in_size': '$$el.foodDetails.in_size',
			// 								'no_size': '$$el.foodDetails.no_size',
			// 								'offer_status': '$$el.foodDetails.offer_status',
			// 								'is_offer_available': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, 1, 0] },
			// 								'offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, { $multiply: ['$$el.quantity', { $multiply: ['$$el.foodDetails.base_price', { $divide: ["$$el.foodDetails.offer_amount", 100] }] }] }, 0] },
			// 								'price': '$$el.psprice',
			// 								// 'pricevalue': {"$ifNull":["$$el.psprice"]},
			// 								// 'offer_stats':{"$cond":{ if: [{$eq:["$$el.foodDetails.offer_status"]},1], then: 1, else: 0 }},
			// 								'offsale': {$cond:[{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] },{$subtract:["$$el.foodDetails.base_price",{ $multiply: ['$$el.foodDetails.base_price', { $divide: ["$$el.foodDetails.offer_amount", 100] }]}]}, 0]},
			// 								'offbase': '$$el.foodDetails.base_price',
			// 								'mprice': '$$el.mprice',
			// 								'slug': '$$el.foodDetails.slug',
			// 								'status': '$$el.foodDetails.status',
			// 								'product_quantity': '$$el.foodDetails.quantity',
			// 								'quantity': '$$el.quantity',
			// 								// 'total': { $multiply: ['$$el.quantity', '$$el.mprice'] },
			// 								'total': {$cond:[{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }]}, { $multiply: ['$$el.quantity', '$$el.mprice'] }, { $multiply: ['$$el.quantity', '$$el.mprice'] }]},
			// 								'mtotal': { $multiply: ['$$el.quantity', '$$el.mprice'] },
			// 								'variations': '$$el.variations'
			// 							}
			// 						}
			// 					}
			// 				}
			// 			},
			// 			{
			// 				$project: {
			// 					"user_id": "$user_id",
			// 					"city_id": "$city_id",
			// 					// "cityDetails": "$cityDetails",
			// 					"type_status": "$type_status",
			// 					// "status": "$cityDetails.status",
			// 					// "tax": { "$ifNull": ["$cityDetails.tax.tax_amount", 0] },
			// 					"_id": "$_id",
			// 					"coupon_code": "$coupon_code",
			// 					"couponDetails": "$couponDetails",
			// 					"food_offer_price": { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.offer_price" } } }] },
			// 					"coupon_limit": "$coupon_limit",
			// 					"is_coupon_err": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }, { $ne: [{ "$ifNull": ["$couponDetails", ''] }, ''] }, { $eq: ["$couponDetails.status", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'admin'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'restaurant'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }, { $gte: [{ "$size": { "$setIntersection": ["$couponDetails.restaurant", ["$restaurant_id"]] } }, 1] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, 'Coupon not valid1'] }] }, { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 0] }] }, '', 'Coupon not valid2'] }] },
			// 					"is_coupon_applied": "$is_coupon_applied",
			// 					"discount_type": "$discount_type",
			// 					"coupon_discount": "$coupon_discount",
			// 					"cart_details": "$cart_details",
			// 					"total": { $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } },
			// 					"sub_total": { $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "offer", "in": "$$offer.offer_price" } } }] }] },//itemtotal - itemtotaloffer
			// 				}
			// 			},
			// 			{
			// 				$project: {
			// 					"user_id": "$user_id",
			// 					"city_id": "$city_id",
			// 					"type_status": "$type_status",
			// 					// "cityDetails": "$cityDetails",
			// 					"_id": "$_id",
			// 					"isodate": "$isodate",
			// 					// "status": "$status",
			// 					"food_offer_price": "$food_offer_price",
			// 					"cart_details": {"$filter": {
			// 						"input": "$cart_details",
			// 						"as": "item",
			// 						"cond": { 
			// 							$gt: ["$$item.total", 0],
			// 						}
			// 					}},
			// 					"coupon_code": "$coupon_code",
			// 					"couponDetails": "$couponDetails",
			// 					"discount_type": "$discount_type",
			// 					"coupon_discount": "$coupon_discount",
			// 					"total": "$total",
			// 					"coupon_price": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] },
			// 					"is_coupon_err": "$is_coupon_err",
			// 					"is_coupon_applied": "$is_coupon_applied",
			// 					"sub_total": "$sub_total",
			// 					// 'service_tax': { "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] },
			// 					"offer_price": "$offer_price",
			// 					"pay_total": { $sum: [{ "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }, { $subtract: ["$sub_total", { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }] }] },
			// 					"delivery_cost": { $literal: 0 },
			// 					"deli_target_cost": { $literal: 0 },
			// 					"tax_percent": { $literal: 0 },
			// 					"schedule_type": { $literal: '' },
			// 					"schedule_time": { $literal: '' },
			// 					"schedule_day": { $literal: '' }

			// 				}
			// 			},
			// 			{
			// 				$project: {
			// 					"user_id": 1,
			// 					"city_id": 1,
			// 					"type_status": 1,
			// 					// "cityDetails": "$cityDetails",
			// 					"_id": 1,
			// 					"isodate": 1,
			// 					// "status": "$status",
			// 					"food_offer_price": 1,
			// 					"cart_details": 1,
			// 					"coupon_code": 1,
			// 					"couponDetails": 1,
			// 					"discount_type": 1,
			// 					"coupon_discount": 1,
			// 					"total": 1,
			// 					"coupon_price": 1,
			// 					"is_coupon_err": 1,
			// 					"is_coupon_applied": 1,
			// 					"sub_total": 1,
			// 					// 'service_tax': { "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] },
			// 					"offer_price": 1,
			// 					"pay_total": 1,
			// 					"delivery_cost": 1,
			// 					"deli_target_cost": 1,
			// 					"tax_percent": 1,
			// 					"schedule_type": 1,
			// 					"schedule_time": 1,
			// 					"schedule_day": 1

			// 				}
			// 			},
			// 			{$match:{cart_details: {$exists: true}}}
			// 		];

			// 		db.GetAggregation(collection, aggregationdata, function (err, cartDetails) {
			// 			if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {
			// 				// if (typeof cartDetails[0].cityDetails != 'undefined') {
			// 					// var default_amt = 0;
			// 					// if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.default_amt != 'undefined') {
			// 					// 	default_amt = cartDetails[0].cityDetails.delivery_charge.default_amt;
			// 					// }
			// 					// var delivery_charge = 0;
			// 					// if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.target_amount != 'undefined') {
			// 					// 	delivery_charge = cartDetails[0].cityDetails.delivery_charge.target_amount;
			// 					// }
			// 					// var delivery_cost = parseInt(default_amt);
			// 					// var deli_target_cost = parseInt(delivery_charge);
			// 					// var tax = settings.settings.service_tax || 0;
			// 					// if (data.schedule_type == '1') {
			// 					// 	cartDetails[0].schedule_type = data.schedule_type;
			// 					// 	cartDetails[0].schedule_time = data.schedule_time;
			// 					// 	cartDetails[0].schedule_day = data.schedule_day;
			// 					// }
			// 					// cartDetails[0].delivery_charge = delivery_cost;
			// 					// cartDetails[0].target_charge = deli_target_cost;
			// 					// cartDetails[0].tax_percent = tax;
			// 					// if (cartDetails[0].sub_total > deli_target_cost) {
			// 					// 	cartDetails[0].delivery_charge = 0;
			// 					// }
			// 					//cartDetails[0].pay_total = cartDetails[0].pay_total + cartDetails[0].delivery_charge;
			// 					// }
			// 					if(cartDetails[0].cart_details){
			// 						for (let index = 0; index < cartDetails[0].cart_details.length; index++) {
			// 							let substring_to_find = "./";
			// 							if(cartDetails[0].cart_details[index].image && cartDetails[0].cart_details[index].image.indexOf(substring_to_find) !==-1){
			// 								cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image.slice(2);
			// 							} else{
			// 								cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image;
			// 							}
			// 						}
			// 						// cartDetails[0].cart_details = cartDetails[0].cart_details.filter((value)=>value)
			// 					}

			// 					cartDetails[0].currency = settings.settings.currency_symbol;										
			// 					cartDetails[0].pay_total = cartDetails[0].pay_total;
			// 					if (cartDetails[0].pay_total < 0) {
			// 						cartDetails[0].pay_total = 0;
			// 					}
			// 				socket.emit("r2e_checkout_cart_details", { err: 0, message: '', cartDetails: cartDetails[0] });
			// 				if(condition && condition.type_status == 0){
			// 					if(cartDetails[0].cart_details.length == 0){

			// 						db.DeleteDocument('cart', { 'user_id': data.userId}, function (err, res) { });
			// 					}
			// 					db.DeleteDocument('cart', { 'user_id': data.userId, type_status: 1 }, function (err, res) { });
			// 				}
			// 			} else {
			// 				// db.DeleteDocument('cart', { 'user_id': data.userId }, function (err, res) { });
			// 				socket.emit("r2e_checkout_cart_details", { err: 0, error: err, message: '', cartDetails: {} });
			// 			}
			// 		})

			// 	}
			// });
		});




		// socket.on('r2e_checkout_cart_details', function (data) {
		// 	var type;
		// 	if (typeof data.type != 'undefined' && data.type != '') {
		// 		if (data.type == 'temp_cart' || data.type == 'cart') {
		// 			type = data.type;
		// 		} else {
		// 			socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid Type' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid Type' });
		// 		return;
		// 	}
		// 	var userId;
		// 	if (data.type == 'temp_cart') {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			userId = data.userId;
		// 		} else {
		// 			socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	} else {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			if (isObjectId(data.userId)) {
		// 				userId = new mongoose.Types.ObjectId(data.userId);
		// 			} else {
		// 				socket.emit('r2e_checkout_cart_details', { err: 1, message: 'Invalid userId' });
		// 				return;
		// 			}
		// 		} else {
		// 			socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	}
		// 	// var cityid;
		// 	// if (typeof data.cityid != 'undefined' && data.cityid != '') {
		// 	// 	if (isObjectId(data.cityid)) {
		// 	// 		cityid = new mongoose.Types.ObjectId(data.cityid);
		// 	// 	} else {
		// 	// 		socket.emit('r2e_cart_details', { err: 1, message: 'Invalid cityid' });
		// 	// 		return;
		// 	// 	}
		// 	// } else {
		// 	// 	socket.emit("r2e_cart_details", { err: 1, message: 'Invalid cityid' });
		// 	// 	return;
		// 	// }
		// 	var client_offset = (new Date).getTimezoneOffset();
		// 	// if (typeof data.client_offset != 'undefined') {
		// 	// 	client_offset = data.client_offset;
		// 	// }
		// 	var collection = 'cart';
		// 	if (data.type == 'temp_cart') {
		// 		collection = 'temp_cart';
		// 	}
		// 	var condition = { user_id: userId};
		// 	/* var date = new Date().toISOString();
		// 	var isodate = new Date(date); */
		// 	if(data && data.cart_value == 1){
		// 		condition.type_status =1;
		// 	} else{
		// 		condition.type_status = 0;
		// 	}
		// 	console.log("data", data)
		// 	console.log("condition", condition)
		// 	var server_offset = (new Date).getTimezoneOffset();
		// 	var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
		// 	var date = Date.now() + diff_offset;
		// 	var isodate = new Date(date);
		// 	db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
		// 		if (err) {
		// 			socket.emit("r2e_checkout_cart_details", { err: 1, message: 'Error in settings..!' });
		// 		} else {
		// 			var aggregationdata = [
		// 				{ $match: condition },
		// 				{ "$unwind": { path: "$cart_details", preserveNullAndEmptyArrays: true } },
		// 				{
		// 					$lookup: {
		// 						from: "food",
		// 						let: {
		// 							foodId: "$cart_details.id",
		// 							sizeC: "$cart_details.size",
		// 							qunty: "$cart_details.quantity"
		// 						},
		// 						pipeline: [
		// 							{ $match: { 
		// 									"$expr": {
		// 										"$and":[
		// 											{"$eq": ["$_id", "$$foodId"] },
		// 											{"$eq": ["$status", 1] },													
		// 										]
		// 									} 
		// 								} 
		// 							},
		// 							{
		// 								$project: {
		// 									name: 1,							
		// 									slug: 1,
		// 									avatar: 1,
		// 									rcategory: 1,
		// 									scategory: 1,
		// 									itmcat: 1,
		// 									status: 1,
		// 									size: 1,
		// 									hover_image: 1,
		// 									base_price: 1,
		// 									sale_price: 1,
		// 									offer_status: 1,
		// 									quantity: {$ifNull:['$quantity', 0]},
		// 									offer_amount: 1,
		// 									size_status: 1,
		// 									quantity_size: 1,
		// 									notZero: {
		// 										$filter: {
		// 											input: "$quantity_size",
		// 											as: "item",
		// 											cond: {
		// 												$and: [
		// 													{
		// 														$eq:["$$item.size","$$sizeC"]
		// 													},
		// 													{
		// 														$eq: ["$$item.status",1]
		// 													},
		// 													{
		// 														$gt:["$$item.quantity",0]
		// 													}
		// 												]
		// 											}
		// 										}
		// 									}
		// 								}
		// 							},
		// 							{
		// 								$project: {
		// 									name: 1,							
		// 									slug: 1,
		// 									avatar: 1,
		// 									rcategory: 1,
		// 									scategory: 1,
		// 									itmcat: 1,
		// 									status: 1,
		// 									size: 1,
		// 									hover_image: 1,
		// 									base_price: 1,
		// 									sale_price: 1,
		// 									offer_status: 1,
		// 									quantity: 1,
		// 									offer_amount: 1,
		// 									size_status: 1,
		// 									quantity_size: 1,
		// 									filterSize: {$ifNull:['$notZero', []]}
		// 								}
		// 							},
		// 							{
		// 								$project: {
		// 									name: 1,
		// 									slug: 1,
		// 									avatar: 1,
		// 									rcategory: 1,
		// 									scategory: 1,
		// 									itmcat: 1,
		// 									status: 1,
		// 									size: 1,
		// 									hover_image: 1,
		// 									base_price: 1,
		// 									sale_price: 1,
		// 									offer_status: 1,
		// 									quantity: 1,
		// 									offer_amount: 1,
		// 									size_status: 1,
		// 									filterSize: 1,
		// 									quantity_size: {$filter: {
		// 										input: "$quantity_size",
		// 										as: "item",
		// 										cond: {
		// 											$eq: [ "$$item.status", 1]
		// 										}
		// 									}},
		// 									in_size: {$cond:{if:{ $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0}},
		// 									no_size: {$cond:{if:{ $gt: ["$quantity", 0] }, then: 1, else: 0}},
		// 									quantity_check: {$cond:{
		// 										if:{$and:[
		// 											{$eq:["$size_status",1]},
		// 											{$ne:[{$size: "$filterSize"},0]}
		// 										]},
		// 										then: 1,
		// 										else: {
		// 											$cond:{
		// 												if:{
		// 													$and:[
		// 														{$eq:["$size_status",2]},
		// 														{$gte:["$quantity","$$qunty"]}
		// 													]
		// 												},
		// 												then: 1, else:0
		// 											}
		// 										}
		// 									}}
		// 								}
		// 							},
		// 							{$match:{"quantity_check": {$eq: 1}}},
		// 							{ $limit: 1 },
		// 						],
		// 						as: "cart_details.foodDetails"
		// 					}
		// 				},
		// 				{ "$unwind": { path: "$cart_details.foodDetails", preserveNullAndEmptyArrays: true } },
		// 				{ $group: { _id: { _id: "$_id", user_id: "$user_id", city_id: "$city_id" }, discount_type: { $first: "$discount_type" },type_status:{$first: "$type_status"}, coupon_code: { $first: "$coupon_code" }, coupon_discount: { $first: "$coupon_discount" }, cart_details: { $push: "$cart_details" } } },
		// 				{
		// 					$lookup: {
		// 						from: "coupon",
		// 						let: {
		// 							coupon_code: "$coupon_code",
		// 						},
		// 						pipeline: [
		// 							{ $match: { "$expr": { "$eq": ["$code", "$$coupon_code"] } } },
		// 							{ $limit: 1 },
		// 						],
		// 						as: "couponDetails"
		// 					}
		// 				},
		// 				{ "$unwind": { path: "$couponDetails", preserveNullAndEmptyArrays: true } },
		// 				{
		// 					$lookup: {
		// 						from: "orders",
		// 						let: {
		// 							coupon_code: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, "$coupon_code", ''] },
		// 							userId: "$_id.user_id",
		// 						},
		// 						pipeline: [
		// 							{
		// 								$match: {
		// 									$expr: {
		// 										$and: [
		// 											{ "$eq": ["$coupon_code", "$$coupon_code"] },
		// 											{ "$eq": ["$user_id", "$$userId"] },
		// 										]
		// 									}
		// 								}
		// 							},
		// 							{ $count: 'count' },
		// 						],
		// 						as: "orderDetails"
		// 					}
		// 				},
		// 				{ "$unwind": { path: "$orderDetails", preserveNullAndEmptyArrays: true } },
		// 				{
		// 					$lookup: {
		// 						from: "city",
		// 						let: {
		// 							city_id: "$_id.city_id",
		// 						},
		// 						pipeline: [
		// 							{ $match: { "$expr": { "$eq": ["$_id", "$$city_id"] } } },
		// 							{ $limit: 1 },
		// 						],
		// 						as: "cityDetails"
		// 					}
		// 				},
		// 				{ "$unwind": { path: "$cityDetails", preserveNullAndEmptyArrays: true } },
		// 				{
		// 					$project: {
		// 						"user_id": "$_id.user_id",
		// 						"city_id": "$_id.city_id",
		// 						// "cityDetails": "$cityDetails",
		// 						"type_status": "$type_status",
		// 						"_id": "$_id._id",
		// 						"coupon_code": "$coupon_code",
		// 						"isodate": { $literal: isodate },
		// 						"couponDetails": "$couponDetails",
		// 						"is_coupon_applied": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$coupon_code", ''] }, ''] }] }, 1, 0] },
		// 						"discount_type": "$discount_type",
		// 						"coupon_discount": "$coupon_discount",
		// 						'coupon_limit': "$orderDetails.count",
		// 						// 'cart_details': "$cart_details",
		// 						"cart_details": {
		// 							"$map": {
		// 								// "input": "$cart_details",
		// 								"input": {
		// 									"$filter": {
		// 									  "input": "$cart_details",
		// 									  "as": "cart",
		// 									  "cond": { 
		// 										   $eq: ["$$cart.id", "$$cart.foodDetails._id"],
		// 										//    $or:[
		// 										// 	{$and:[{$eq:["$$cart.foodDetails.size_status",1]}, {$eq:["$$cart.foodDetails.in_size",1]}]},
		// 										// 	{$and:[{$eq:["$$cart.foodDetails.size_status",2]}, {$eq:["$$cart.foodDetails.no_size",1]}]}
		// 										//    ]
		// 									    }
		// 									}
		// 								  },
		// 								"as": "el",
		// 								"in": {
		// 									'name': '$$el.foodDetails.name',
		// 									'image': '$$el.foodDetails.avatar',
		// 									// 'price_details': '$$el.foodDetails.price_details',
		// 									'id': '$$el.id',
		// 									// 'varntid': '$$el.varntid',
		// 									'product_size':'$$el.foodDetails.size',
		// 									'rcat_id': '$$el.rcat_id',
		// 									'scat_id': '$$el.scat_id',
		// 									'cart_id': '$$el._id',
		// 									'size':'$$el.size',
		// 									'offer': '$$el.foodDetails.offer_amount',
		// 									'quantity_size': '$$el.foodDetails.quantity_size',
		// 									'size_status': '$$el.size_status',
		// 									'in_size': '$$el.foodDetails.in_size',
		// 									'no_size': '$$el.foodDetails.no_size',
		// 									'offer_status': '$$el.foodDetails.offer_status',
		// 									'is_offer_available': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, 1, 0] },
		// 									'offer_price': { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] }, { $multiply: ['$$el.quantity', { $multiply: ['$$el.foodDetails.base_price', { $divide: ["$$el.foodDetails.offer_amount", 100] }] }] }, 0] },
		// 									'price': '$$el.psprice',
		// 									// 'pricevalue': {"$ifNull":["$$el.psprice"]},
		// 									// 'offer_stats':{"$cond":{ if: [{$eq:["$$el.foodDetails.offer_status"]},1], then: 1, else: 0 }},
		// 									'offsale': {$cond:[{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }] },{$subtract:["$$el.foodDetails.base_price",{ $multiply: ['$$el.foodDetails.base_price', { $divide: ["$$el.foodDetails.offer_amount", 100] }]}]}, 0]},
		// 									'offbase': '$$el.foodDetails.base_price',
		// 									'mprice': '$$el.mprice',
		// 									'slug': '$$el.foodDetails.slug',
		// 									'status': '$$el.foodDetails.status',
		// 									'product_quantity': '$$el.foodDetails.quantity',
		// 									'quantity': '$$el.quantity',
		// 									// 'total': { $multiply: ['$$el.quantity', '$$el.mprice'] },
		// 									'total': {$cond:[{ $and: [{ $ne: [{ "$ifNull": ["$$el.foodDetails.offer_status", ''] }, ''] }, { $eq: ["$$el.foodDetails.offer_status", 1] }]}, { $multiply: ['$$el.quantity', '$$el.mprice'] }, { $multiply: ['$$el.quantity', '$$el.mprice'] }]},
		// 									'mtotal': { $multiply: ['$$el.quantity', '$$el.mprice'] },
		// 									'variations': '$$el.variations'
		// 								}
		// 							}
		// 						}
		// 					}
		// 				},
		// 				{
		// 					$project: {
		// 						"user_id": "$user_id",
		// 						"city_id": "$city_id",
		// 						// "cityDetails": "$cityDetails",
		// 						"type_status": "$type_status",
		// 						// "status": "$cityDetails.status",
		// 						// "tax": { "$ifNull": ["$cityDetails.tax.tax_amount", 0] },
		// 						"_id": "$_id",
		// 						"coupon_code": "$coupon_code",
		// 						"couponDetails": "$couponDetails",
		// 						"food_offer_price": { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.offer_price" } } }] },
		// 						"coupon_limit": "$coupon_limit",
		// 						"is_coupon_err": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }, { $ne: [{ "$ifNull": ["$couponDetails", ''] }, ''] }, { $eq: ["$couponDetails.status", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'admin'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.coupon_type", 'restaurant'] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.expiry_date", "$isodate"] }, { $lte: ["$couponDetails.valid_from", "$isodate"] }, { $gte: [{ "$size": { "$setIntersection": ["$couponDetails.restaurant", ["$restaurant_id"]] } }, 1] }] }, { "$cond": [{ $and: [{ $gte: ["$couponDetails.usage.per_user", '$coupon_limit'] }, { $gte: ["$couponDetails.usage.total_coupons", 1] }] }, '', 'Coupon code limit exceeded'] }, 'Coupon code expired'] }, 'Coupon not valid1'] }] }, { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 0] }] }, '', 'Coupon not valid2'] }] },
		// 						"is_coupon_applied": "$is_coupon_applied",
		// 						"discount_type": "$discount_type",
		// 						"coupon_discount": "$coupon_discount",
		// 						"cart_details": "$cart_details",
		// 						"total": { $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } },
		// 						"sub_total": { $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: [{ $sum: { "$map": { "input": "$cart_details", "as": "offer", "in": "$$offer.offer_price" } } }] }] },//itemtotal - itemtotaloffer
		// 					}
		// 				},
		// 				{
		// 					$project: {
		// 						"user_id": "$user_id",
		// 						"city_id": "$city_id",
		// 						"type_status": "$type_status",
		// 						// "cityDetails": "$cityDetails",
		// 						"_id": "$_id",
		// 						"isodate": "$isodate",
		// 						// "status": "$status",
		// 						"food_offer_price": "$food_offer_price",
		// 						"cart_details": {"$filter": {
		// 							"input": "$cart_details",
		// 							"as": "item",
		// 							"cond": { 
		// 								$gt: ["$$item.total", 0],
		// 							}
		// 						}},
		// 						"coupon_code": "$coupon_code",
		// 						"couponDetails": "$couponDetails",
		// 						"discount_type": "$discount_type",
		// 						"coupon_discount": "$coupon_discount",
		// 						"total": "$total",
		// 						"coupon_price": { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] },
		// 						"is_coupon_err": "$is_coupon_err",
		// 						"is_coupon_applied": "$is_coupon_applied",
		// 						"sub_total": "$sub_total",
		// 						// 'service_tax': { "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] },
		// 						"offer_price": "$offer_price",
		// 						"pay_total": { $sum: [{ "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }, { $subtract: ["$sub_total", { "$cond": [{ $and: [{ $eq: ["$is_coupon_applied", 1] }] }, { "$cond": [{ $and: [{ $eq: ["$couponDetails.discount_type", 'Percentage'] }] }, { $multiply: [{ $subtract: [{ $sum: { "$map": { "input": "$cart_details", "as": "el", "in": "$$el.total" } } }, { $sum: ["$food_offer_price", "$offer_price"] }] }, { $divide: ["$couponDetails.amount_percentage", 100] }] }, "$couponDetails.amount_percentage"] }, 0] }] }] },
		// 						"delivery_cost": { $literal: 0 },
		// 						"deli_target_cost": { $literal: 0 },
		// 						"tax_percent": { $literal: 0 },
		// 						"schedule_type": { $literal: '' },
		// 						"schedule_time": { $literal: '' },
		// 						"schedule_day": { $literal: '' }

		// 					}
		// 				},
		// 				{
		// 					$project: {
		// 						"user_id": 1,
		// 						"city_id": 1,
		// 						"type_status": 1,
		// 						// "cityDetails": "$cityDetails",
		// 						"_id": 1,
		// 						"isodate": 1,
		// 						// "status": "$status",
		// 						"food_offer_price": 1,
		// 						"cart_details": 1,
		// 						"coupon_code": 1,
		// 						"couponDetails": 1,
		// 						"discount_type": 1,
		// 						"coupon_discount": 1,
		// 						"total": 1,
		// 						"coupon_price": 1,
		// 						"is_coupon_err": 1,
		// 						"is_coupon_applied": 1,
		// 						"sub_total": 1,
		// 						// 'service_tax': { "$cond": [{ $and: [{ $gt: [{ $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] }] }, { $multiply: ["$sub_total", { $divide: ["$tax", 100] }] }, 0] },
		// 						"offer_price": 1,
		// 						"pay_total": 1,
		// 						"delivery_cost": 1,
		// 						"deli_target_cost": 1,
		// 						"tax_percent": 1,
		// 						"schedule_type": 1,
		// 						"schedule_time": 1,
		// 						"schedule_day": 1

		// 					}
		// 				},
		// 				{$match:{cart_details: {$exists: true}}}
		// 			];

		// 			db.GetAggregation(collection, aggregationdata, function (err, cartDetails) {
		// 				if (typeof cartDetails != 'undefined' && cartDetails.length > 0) {
		// 					// if (typeof cartDetails[0].cityDetails != 'undefined') {
		// 						// var default_amt = 0;
		// 						// if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.default_amt != 'undefined') {
		// 						// 	default_amt = cartDetails[0].cityDetails.delivery_charge.default_amt;
		// 						// }
		// 						// var delivery_charge = 0;
		// 						// if (typeof cartDetails[0].cityDetails.delivery_charge != 'undefined' && typeof cartDetails[0].cityDetails.delivery_charge.target_amount != 'undefined') {
		// 						// 	delivery_charge = cartDetails[0].cityDetails.delivery_charge.target_amount;
		// 						// }
		// 						// var delivery_cost = parseInt(default_amt);
		// 						// var deli_target_cost = parseInt(delivery_charge);
		// 						// var tax = settings.settings.service_tax || 0;
		// 						// if (data.schedule_type == '1') {
		// 						// 	cartDetails[0].schedule_type = data.schedule_type;
		// 						// 	cartDetails[0].schedule_time = data.schedule_time;
		// 						// 	cartDetails[0].schedule_day = data.schedule_day;
		// 						// }
		// 						// cartDetails[0].delivery_charge = delivery_cost;
		// 						// cartDetails[0].target_charge = deli_target_cost;
		// 						// cartDetails[0].tax_percent = tax;
		// 						// if (cartDetails[0].sub_total > deli_target_cost) {
		// 						// 	cartDetails[0].delivery_charge = 0;
		// 						// }
		// 						//cartDetails[0].pay_total = cartDetails[0].pay_total + cartDetails[0].delivery_charge;
		// 						// }
		// 						if(cartDetails[0].cart_details){
		// 							for (let index = 0; index < cartDetails[0].cart_details.length; index++) {
		// 								let substring_to_find = "./";
		// 								if(cartDetails[0].cart_details[index].image && cartDetails[0].cart_details[index].image.indexOf(substring_to_find) !==-1){
		// 									cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image.slice(2);
		// 								} else{
		// 									cartDetails[0].cart_details[index].image = cartDetails[0].cart_details[index].image;
		// 								}
		// 							}
		// 							// cartDetails[0].cart_details = cartDetails[0].cart_details.filter((value)=>value)
		// 						}

		// 						cartDetails[0].currency = settings.settings.currency_symbol;										
		// 						cartDetails[0].pay_total = cartDetails[0].pay_total;
		// 						if (cartDetails[0].pay_total < 0) {
		// 							cartDetails[0].pay_total = 0;
		// 						}
		// 					socket.emit("r2e_checkout_cart_details", { err: 0, message: '', cartDetails: cartDetails[0] });
		// 					if(condition && condition.type_status == 0){
		// 						if(cartDetails[0].cart_details.length == 0){

		// 							db.DeleteDocument('cart', { 'user_id': data.userId}, function (err, res) { });
		// 						}
		// 						db.DeleteDocument('cart', { 'user_id': data.userId, type_status: 1 }, function (err, res) { });
		// 					}
		// 				} else {
		// 					// db.DeleteDocument('cart', { 'user_id': data.userId }, function (err, res) { });
		// 					socket.emit("r2e_checkout_cart_details", { err: 0, error: err, message: '', cartDetails: {} });
		// 				}
		// 			})

		// 		}
		// 	});
		// });

		socket.on('r2e_remove_food_from_cart', async function (data) {
			var type;
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					if (isObjectId(data.userId)) {
						userId = new mongoose.Types.ObjectId(data.userId);
					} else {
						socket.emit('r2e_remove_food_from_cart', { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			}
			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			// var restaurantId;
			// if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
			// 	if (isObjectId(data.restaurantId)) {
			// 		restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
			// 	} else {
			// 		socket.emit('r2e_remove_food_from_cart', { err: 1, message: 'Invalid restaurantId' });
			// 		return;
			// 	}
			// } else {
			// 	socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Invalid restaurantId' });
			// 	return;
			// }
			var cartId;
			if (typeof data.cartId != 'undefined' && data.cartId != '') {
				if (isObjectId(data.cartId)) {
					cartId = new mongoose.Types.ObjectId(data.cartId);
				} else {
					socket.emit('r2e_remove_food_from_cart', { err: 1, message: 'Invalid cartId' });
					return;
				}
			} else {
				socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Invalid cartId' });
				return;
			}
			if (data.type_status && data.type_status == 1) {
				var condition = { user_id: userId, type_status: 1, cart_details: { $elemMatch: { _id: cartId } } };
			} else {
				var condition = { user_id: userId, type_status: 0, cart_details: { $elemMatch: { _id: cartId } } };
			}
			const cart = await db.GetOneDocument(collection, condition, {}, {})
			if (cart.status === false) {
				socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Unable to fetch data.' });
			} else {
				if (cart && typeof cart.doc._id != 'undefined') {
					if (typeof cart.doc.cart_details != 'undefined' && cart.doc.cart_details.length > 1) {
						var updateDetails = { "$pull": { 'cart_details': { _id: { $in: [cartId] } } } };
						var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cartId } } };
						await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
						// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
						// });
						socket.emit("r2e_remove_food_from_cart", { err: 0, message: 'Sucessfully Removed From Cart.' });
					} else {
						if (data.type_status && data.type_status == 1) {
							var condition = { user_id: userId, type_status: 1 };
						} else {
							var condition = { user_id: userId };
						}
						const del = await db.DeleteDocument(collection, condition)
						// db.DeleteDocument(collection, condition, function (err, res) {
						// });
						socket.emit("r2e_remove_food_from_cart", { err: 0, message: 'Sucessfully Removed From Cart.' });
					}
				} else {
					socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Cart Not Found.' });
				}
			}

			// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
			// 	if (err || !cart) {
			// 		socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Unable to fetch data.' });
			// 	} else {
			// 		if (cart && typeof cart._id != 'undefined') {
			// 			if (typeof cart.cart_details != 'undefined' && cart.cart_details.length > 1) {
			// 				var updateDetails = { "$pull": { 'cart_details': { _id: { $in: [cartId] } } } };
			// 				var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cartId } } };
			// 				db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
			// 				});
			// 				socket.emit("r2e_remove_food_from_cart", { err: 0, message: 'Sucessfully Removed From Cart.' });
			// 			} else {
			// 				if(data.type_status && data.type_status == 1){
			// 					var condition = { user_id: userId, type_status: 1 };
			// 				} else{
			// 					var condition = { user_id: userId};
			// 				}
			// 				db.DeleteDocument(collection, condition, function (err, res) {
			// 				});
			// 				socket.emit("r2e_remove_food_from_cart", { err: 0, message: 'Sucessfully Removed From Cart.' });
			// 			}
			// 		} else {
			// 			socket.emit("r2e_remove_food_from_cart", { err: 1, message: 'Cart Not Found.' });
			// 		}
			// 	}
			// });
		})

		socket.on('r2e_temp_cart_convert_to_cart', function (data) {
			var tempUserId;
			if (typeof data.tempUserId != 'undefined' && data.tempUserId != '') {
				tempUserId = data.tempUserId;
			} else {
				socket.emit("r2e_temp_cart_convert_to_cart", { err: 1, message: 'Invalid tempUserId' });
				return;
			}
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_temp_cart_convert_to_cart', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_temp_cart_convert_to_cart", { err: 1, message: 'Invalid userId' });
				return;
			}
			var condition = { user_id: tempUserId };
			db.GetOneDocument('temp_cart', condition, {}, {}, function (err, tempcart) {
				if (err) {
					socket.emit("r2e_temp_cart_convert_to_cart", { err: 1, message: 'Unable to fetch data.' });
				} else {
					if (tempcart && typeof tempcart != 'undefined' && typeof tempcart._id != 'undefined') {
						var condition = { user_id: userId };
						db.DeleteDocument('cart', condition, function (err, res) {
						});
						tempcart.user_id = userId;
						var condition = { user_id: tempUserId };
						db.DeleteDocument('temp_cart', condition, function (err, res) {
						});
						var data = { user_id: tempcart.user_id, city_id: tempcart.city_id, cart_details: tempcart.cart_details }
						db.InsertDocument('cart', data, function (err, res) {
							socket.emit("r2e_temp_cart_convert_to_cart", { err: 0, message: '' });
						})

					}

				}
			});
		})
		socket.on('r2e_repeat_order', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_repeat_order', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_repeat_order", { err: 1, message: 'Invalid userId' });
				return;
			}
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_repeat_order', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_repeat_order", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var condition = { _id: orderId, user_id: userId };
			db.GetOneDocument('orders', condition, {}, {}, function (err, order) {
				if (err) {
					socket.emit("r2e_repeat_order", { err: 1, message: 'Unable to fetch data.' });
				} else {
					if (order && typeof order != 'undefined' && typeof order._id != 'undefined' && typeof order.cart_details != 'undefined' && typeof order.cart_details._id != 'undefined') {
						var condition = { user_id: userId };
						db.DeleteDocument('cart', condition, function (err, res) {
						});
						var orderDetails = {};
						if (typeof order.delivery_address != 'undefined') {
							orderDetails.delivery_address = order.delivery_address;
						}
						var data = { user_id: order.cart_details.user_id, city_id: order.cart_details.city_id, cart_details: order.cart_details.cart_details };
						db.InsertDocument('cart', data, function (err, res) {
							socket.emit("r2e_repeat_order", { err: 0, message: '', orderDetails: orderDetails });
						})
					} else {
						socket.emit("r2e_repeat_order", { err: 1, message: 'Something went to wrong.' });
					}
				}
			});
		})
		socket.on('r2e_download_summary', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_download_summary', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_download_summary", { err: 1, message: 'Invalid userId' });
				return;
			}
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_download_summary', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_download_summary", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var request = require('request');
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_download_summary", { err: 1, message: 'Invalid Error, Please check your data' });
				} else {
					var findRemoveSync = require('find-remove');
					var site_url = settings.settings.site_url;
					var site_title = settings.settings.site_title;
					var filename = site_title + '-order-' + Date.now() + '.pdf';
					findRemoveSync('./uploads/invoice', { age: { seconds: 100 }, extensions: '.pdf' });
					request(site_url + 'site/users/orderSummary?userId=' + userId + '&orderId=' + orderId, function (error, response, body) {
						if (error && error != null) {
							socket.emit("r2e_download_summary", { err: 1, message: 'Something went to wrong' });
						} else {
							if (response.statusCode == 200) {
								try {
									var body = JSON.parse(body);
								} catch (e) {
								}
								if (typeof body == 'string') {
									var pdf = require('html-pdf');
									var options = { format: 'Letter' };
									pdf.create(body, options).toFile('./uploads/invoice/' + filename, function (err, resp) {
										if (err) {
											socket.emit("r2e_download_summary", { err: 1, message: 'Something went to wrong' });
										} else {
											var result = { "err": 0, message: '', "filepath": site_url + './uploads/invoice/' + filename, filename: filename }
											socket.emit("r2e_download_summary", result);
										}
									});
								} else {
									if (typeof body.errors != 'undefined') {
										socket.emit("r2e_download_summary", { err: 1, message: body.errors });
									} else {
										socket.emit("r2e_download_summary", { err: 1, message: 'Something went to wrong' });
									}
								}
							} else {
								socket.emit("r2e_download_summary", { err: 1, message: 'Something went to wrong' });
							}
						}
					});
				}
			});
		})

		var js2xmlparser = require("js2xmlparser");
		var to_json = require('xmljson').to_json;
		var parseString = require('xml2js').parseString,
			xml2js = require('xml2js');
		ss(socket).on('r2e_upload_language_xml', function (stream, value) {
			var requesttime = value.requesttime;
			var id;
			if (typeof value.id != 'undefined' && value.id != '') {
				id = value.id
			} else {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid id', 'requesttime': requesttime });
				return;
			}
			var app_type;
			if (typeof value.app_type != 'undefined' && value.app_type != '') {
				app_type = value.app_type
			} else {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid app_type', 'requesttime': requesttime });
				return;
			}
			var app_filter;
			if (typeof value.app_filter != 'undefined' && value.app_filter != '') {
				app_filter = value.app_filter
			} else {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid app_filter', 'requesttime': requesttime });
				return;
			}

			var xmlresult = [];
			stream.on("data", function (chunk) {
				xmlresult.push(chunk)
			});
			stream.on("finish", function (fh) {
				var xmlStr = xmlresult.toString();
				to_json(xmlStr, function (error, data) {
					if (error) {
						ss(socket).emit('fileNotFound', { err: 1, message: 'XML file is invalid', 'requesttime': requesttime });
					} else {
						if (typeof data != 'undefined' && typeof data[id] != 'undefined') {
							if (typeof data[id][app_type] != 'undefined') {
								if (typeof data[id][app_type][app_filter] != 'undefined') {
									fs.readFile(path.join(__dirname, '../', '/uploads/languages/en.json'), "utf8", function (error, englishRaw) {
										if (error) {
											ss(socket).emit('fileNotFound', { err: 1, message: 'Language File Not Found', 'requesttime': requesttime });
										} else {
											var english = JSON.parse(englishRaw);
											var appKeys = Object.keys(english);
											var index_of = appKeys.indexOf(app_type);
											if (appKeys.indexOf(app_type) != -1) {
												var filterKeys = Object.keys(english[app_type]);
												var index_of1 = filterKeys.indexOf(app_filter);
												if (filterKeys.indexOf(app_filter) != -1) {
													var engKeys = Object.keys(english[app_type][app_filter]);
													fs.readFile(path.join(__dirname, '../', '/uploads/languages/' + id + '.json'), "utf8", function (error, objectdata) {
														if (error) {
															ss(socket).emit('fileNotFound', { err: 1, message: 'Language File Not Found', 'requesttime': requesttime });
														} else {
															var objects = JSON.parse(objectdata);
															var appKeys1 = Object.keys(objects);
															var result = {};
															for (var key in objects) {
																result[key] = objects[key]
															}
															if (appKeys1.indexOf(app_type) != -1) {
																var filterKeys1 = Object.keys(objects[app_type]);
																if (filterKeys1.indexOf(app_filter) != -1) {
																	var obj = objects[app_type][app_filter];
																	var keys = Object.keys(obj);
																	for (var i = 0; i < engKeys.length; i++) {
																		if (obj[engKeys[i]]) {
																			result[app_type][app_filter][engKeys[i]] = obj[engKeys[i]];
																		} else {
																			result[app_type][app_filter][engKeys[i]] = '';
																		}
																	}
																	var obj = data[id][app_type][app_filter];
																	for (var i = 0; i < engKeys.length; i++) {
																		if (obj[engKeys[i]]) {
																			result[app_type][app_filter][engKeys[i]] = obj[engKeys[i]];
																		} else {
																			result[app_type][app_filter][engKeys[i]] = '';
																		}
																	}
																	var keysasdasds = Object.keys(result[app_type][app_filter]);
																	for (var i = 0; i < keysasdasds.length; i++) {
																		if (obj[keysasdasds[i]]) {
																			result[app_type][app_filter][keysasdasds[i]] = obj[keysasdasds[i]];
																		}
																		if (!result[app_type][app_filter][keysasdasds[i]]) {
																			delete result[app_type][app_filter][keysasdasds[i]];
																		}
																	}
																	var outputfile = path.join(__dirname, "../", '/uploads/languages/' + id + ".json");
																	fs.writeFile(outputfile, JSON.stringify(result, null, 4), function (err) {
																		if (err) {
																			ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid language File', 'requesttime': requesttime });
																		} else {
																			ss(socket).emit("uploadSuccess", { err: 0, message: 'Sucessfully Uploaded..', 'requesttime': requesttime });
																		}
																	});
																} else {
																	ss(socket).emit('fileNotFound', { err: 1, message: 'Something went to wrong', 'requesttime': requesttime });
																}
															} else {
																ss(socket).emit('fileNotFound', { err: 1, message: 'Something went to wrong', 'requesttime': requesttime });
															}
														}
													})
												} else {
													ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Xml File', 'requesttime': requesttime });
												}


											} else {
												ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Xml File', 'requesttime': requesttime });
											}
										}
									});
								} else {
									ss(socket).emit('fileNotFound', { err: 1, message: 'Language Filter Type is invalid', 'requesttime': requesttime });
								}
							} else {
								ss(socket).emit('fileNotFound', { err: 1, message: 'Language App Type is invalid', 'requesttime': requesttime });
							}
						} else {
							ss(socket).emit('fileNotFound', { err: 1, message: 'Language Code is invalid', 'requesttime': requesttime });
						}
					}

				});
			});
			stream.on("error", function (fh) {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid File' });
			});
		});
		ss(socket).on('r2e_download_language_xml', function (stream, value) {
			var id;
			if (typeof value.id != 'undefined' && value.id != '') {
				id = value.id
			} else {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid id', 'requesttime': requesttime });
				return;
			}
			var app_type;
			if (typeof value.app_type != 'undefined' && value.app_type != '') {
				app_type = value.app_type
			} else {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid app_type', 'requesttime': requesttime });
				return;
			}
			var app_filter;
			if (typeof value.app_filter != 'undefined' && value.app_filter != '') {
				app_filter = value.app_filter
			} else {
				ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid app_filter', 'requesttime': requesttime });
				return;
			}
			var requesttime = value.requesttime;
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Error, Please check your data', 'requesttime': requesttime });
				} else {
					fs.readFile(path.join(__dirname, '../', '/uploads/languages/en.json'), "utf8", function (error, englishRaw) {
						if (error) {
							ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Error, Please check your data', 'requesttime': requesttime });
						} else {
							var english = JSON.parse(englishRaw);
							var appKeys = Object.keys(english);
							if (appKeys.indexOf(app_type) != -1) {
								var filterKeys = Object.keys(english[app_type]);
								if (filterKeys.indexOf(app_filter) != -1) {
									var engKeys = Object.keys(english[app_type][app_filter]);
									fs.readFile(path.join(__dirname, '../', '/uploads/languages/' + id + '.json'), "utf8", function (error, languageRaw) {

										if (error) {
											//res.send(error);
											ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Error, Please check your data', 'requesttime': requesttime });
										} else {
											var objects = JSON.parse(languageRaw);
											var appKeys1 = Object.keys(objects);
											if (appKeys1.indexOf(app_type) != -1) {
												var filterKeys1 = Object.keys(objects[app_type]);
												if (filterKeys1.indexOf(app_filter) != -1) {
													var obj = objects[app_type][app_filter];
													var keys = Object.keys(obj);
													var newarray = {};
													for (var i = 0; i < engKeys.length; i++) {
														if (obj[engKeys[i]]) {
															newarray[engKeys[i]] = obj[engKeys[i]];
														} else {
															//newarray[engKeys[i]] = '';
															newarray[engKeys[i]] = english[app_type][app_filter][engKeys[i]];
														}
													}
													english[app_type][app_filter] = newarray;
													var jsonResult = {};
													jsonResult[id] = {};
													jsonResult[id][app_type] = {};
													jsonResult[id][app_type][app_filter] = english[app_type][app_filter];
													try {
														var builder = new xml2js.Builder();
														var xml = builder.buildObject(jsonResult);
														var str = require('string-to-stream')
														str(xml).pipe(stream)
													} catch (e) {
														ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Error, Please check your data', 'requesttime': requesttime });
													}
												}
											} else {
												ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Error, Please check your data', 'requesttime': requesttime });
											}
										}
									})
								}
							} else {
								ss(socket).emit('fileNotFound', { err: 1, message: 'Invalid Error, Please check your data', 'requesttime': requesttime });
							}
						}
					})
				}
			})
		});

		socket.on('r2e_remove_to_cart', function (data) {
			var type;
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					socket.emit("r2e_remove_to_cart", { err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				socket.emit("r2e_remove_to_cart", { err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					socket.emit("r2e_remove_to_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					if (isObjectId(data.userId)) {
						userId = new mongoose.Types.ObjectId(data.userId);
					} else {
						socket.emit('r2e_remove_to_cart', { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					socket.emit("r2e_remove_to_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			}
			var restaurantId;
			if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
				if (isObjectId(data.restaurantId)) {
					restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
				} else {
					socket.emit('r2e_remove_to_cart', { err: 1, message: 'Invalid restaurantId' });
					return;
				}
			} else {
				socket.emit("r2e_remove_to_cart", { err: 1, message: 'Invalid restaurantId' });
				return;
			}
			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId, restaurant_id: restaurantId };
			db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
				if (err) {
					socket.emit("r2e_remove_to_cart", { err: 1, message: 'Unable to fetch data.' });
				} else {
					var condition = { user_id: userId };
					db.DeleteDocument(collection, condition, function (err, res) {
						socket.emit("r2e_remove_to_cart", { err: 0, message: 'Sucessfully Removed From Cart.' });
					});
				}
			});
		});


		// socket.on('r2e_add_to_cart', function (data) {
		// 	var type;
		// 	if (typeof data.type != 'undefined' && data.type != '') {
		// 		if (data.type == 'temp_cart' || data.type == 'cart') {
		// 			type = data.type;
		// 		} else {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid Type' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid Type' });
		// 		return;
		// 	}
		// 	var userId;
		// 	if (data.type == 'temp_cart') {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			userId = data.userId;
		// 		} else {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	} else {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			if (isObjectId(data.userId)) {
		// 				userId = new mongoose.Types.ObjectId(data.userId);
		// 			} else {
		// 				socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid userId' });
		// 				return;
		// 			}
		// 		} else {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	}
		// 	var foodId;
		// 	if (typeof data.foodId != 'undefined' && data.foodId != '') {
		// 		if (isObjectId(data.foodId)) {
		// 			foodId = new mongoose.Types.ObjectId(data.foodId);
		// 		} else {
		// 			socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid foodId' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid foodId' });
		// 		return;
		// 	}
		// 	var varntid;
		// 	// if (typeof data.varntid != 'undefined' && data.varntid != '') {
		// 	// 	if (isObjectId(data.varntid)) {
		// 	// 		varntid = new mongoose.Types.ObjectId(data.varntid);
		// 	// 	} else {
		// 	// 		socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid varntid' });
		// 	// 		return;
		// 	// 	}
		// 	// } else {
		// 	// 	socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid varntid' });
		// 	// 	return;
		// 	// }
		// 	// var cityid;
		// 	// if (typeof data.cityid != 'undefined' && data.cityid != '') {
		// 	// 	if (isObjectId(data.cityid)) {
		// 	// 		cityid = new mongoose.Types.ObjectId(data.cityid);
		// 	// 	} else {
		// 	// 		socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid cityid' });
		// 	// 		return;
		// 	// 	}
		// 	// } else {
		// 	// 	socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid cityid' });
		// 	// 	return;
		// 	// }

		// 	// db.GetOneDocument('city', { _id: cityid, "status": { $eq: 1 } }, {}, {}, function (err, citydetails) {
		// 	// 	if (err || !citydetails) {
		// 	// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 	// 	} else {
		// 			var collection = 'cart';
		// 			if (data.type == 'temp_cart') {
		// 				collection = 'temp_cart';
		// 			}
		// 			var condition = { user_id: userId};
		// 			console.log("data", data)
		// 			if(data && data.type_status == 1){
		// 				condition.type_status = 1;
		// 				db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
		// 					if (err) {
		// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 					} else {
		// 						// var is_food_available = 0;
		// 						var is_cart_available = 0;
		// 						if (cart && typeof cart._id != 'undefined') {
		// 							is_cart_available = 1;
		// 							// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
		// 							// 	if (typeof cart.cart_details != 'undefined') {
		// 							// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
		// 							// 		if (foodIndex != -1) {
		// 							// 			is_food_available = 1;
		// 							// 		}
		// 							// 	}
		// 							// } else {
		// 							// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
		// 							// 	return;
		// 							// }
		// 						}
		// 						var condition = { _id: foodId, status: 1 };
		// 						db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 							if (err) {
		// 								socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 							} else {
		// 								if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 									var quantityCond = 0
		// 									if(data.size_status == 1){
		// 										var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity)});
		// 										if(sizeArr && sizeArr.length>0){
		// 											quantityCond = 1;
		// 										}
		// 									} else{
		// 										if(foodDetails.quantity >= parseInt(data.addons_quantity)){
		// 											quantityCond = 1;
		// 										}
		// 									}
		// 									if(quantityCond == 1){
		// 										db.DeleteDocument(collection, {user_id: userId, type_status: 1}, function (err, res) {console.log("err, res", err, res) });
		// 										// if (is_cart_available == 1) {
		// 										// 	console.log(condition)
		// 										// } 
		// 										var updateDetails = { user_id: userId,  cart_details: [], type_status: 1 };
		// 										var foods = {
		// 											id: foodDetails._id,
		// 											pid: data.pid,
		// 											psprice: data.psprice,
		// 											mprice: data.mprice,
		// 											quantity: parseInt(data.addons_quantity),
		// 											rcat_id: data.rcat_id,
		// 											scat_id: data.scat_id,
		// 											size: data.size,
		// 											size_status: data.size_status,
		// 											image: foodDetails.avatar.slice(2)
		// 										}
		// 										updateDetails.cart_details.push(foods);
		// 										db.InsertDocument(collection, updateDetails, function (err, res) {
		// 											console.log("err, res", err, res)
		// 											socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 										})
		// 										// else {
		// 										// 	let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());
		// 										// 	// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 										// 	if (index_pos == -1) {
		// 										// 		var foods = {
		// 										// 			id: foodDetails._id,
		// 										// 			pid: data.pid,
		// 										// 			psprice: data.psprice,
		// 										// 			mprice: data.mprice,
		// 										// 			quantity: parseInt(data.addons_quantity),
		// 										// 			rcat_id: data.rcat_id,
		// 										// 			scat_id: data.scat_id,
		// 										// 			size: data.size,
		// 										// 			image: foodDetails.avatar.slice(2)
		// 										// 		}
		// 										// 		var condition = { user_id: userId, type_status: 1};
		// 										// 		var updateDetails = { $push: { 'cart_details': foods } };
		// 										// 		db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 										// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 										// 		});
		// 										// 	} else {
		// 										// 		if(data.size){
		// 										// 			var condition = { user_id: userId};
		// 										// 			var updateDetails = { 'cart_details.$[elem].size': data.size};
		// 										// 			db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $eq: {"elem.id": foodDetails._id} }] }, function (err, res) {
		// 										// 				socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 										// 			});
		// 										// 		} else{
		// 										// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 										// 		}
		// 										// 		// var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 										// 		// if(data.size){
		// 										// 		// }
		// 										// 	}
		// 										// }
		// 									} else{
		// 										socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 									}
		// 								} else {
		// 									socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 								}
		// 							}
		// 						})
		// 					}
		// 				});
		// 			} else{
		// 				db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
		// 					if (err) {
		// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 					} else {
		// 						// var is_food_available = 0;
		// 						var is_cart_available = 0;
		// 						if (cart && typeof cart._id != 'undefined') {
		// 							is_cart_available = 1;
		// 							// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
		// 							// 	if (typeof cart.cart_details != 'undefined') {
		// 							// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
		// 							// 		if (foodIndex != -1) {
		// 							// 			is_food_available = 1;
		// 							// 		}
		// 							// 	}
		// 							// } else {
		// 							// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
		// 							// 	return;
		// 							// }
		// 						}
		// 						var condition = { _id: foodId, status: 1 };
		// 						db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 							if (err) {
		// 								socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 							} else {
		// 								if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 									var quantityCond = 0;
		// 									console.log("data", data)
		// 									if(data.size_status == 1){
		// 										var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity)});
		// 										console.log("sizeArr", sizeArr)
		// 										if(sizeArr && sizeArr.length>0){
		// 											quantityCond = 1;
		// 										}
		// 									} else{
		// 										if(foodDetails.quantity >= parseInt(data.addons_quantity)){
		// 											quantityCond = 1;
		// 										}
		// 									}
		// 									if(quantityCond == 1){
		// 										if (is_cart_available == 0) {
		// 											var updateDetails = { user_id: userId,  cart_details: [] };
		// 											var foods = {
		// 												id: foodDetails._id,
		// 												pid: data.pid,
		// 												psprice: data.psprice,
		// 												mprice: data.mprice,
		// 												quantity: parseInt(data.addons_quantity),
		// 												rcat_id: data.rcat_id,
		// 												scat_id: data.scat_id,
		// 												size: data.size,
		// 												size_status: data.size_status,
		// 												image: foodDetails.avatar.slice(2)
		// 											}
		// 											updateDetails.cart_details.push(foods);
		// 											db.InsertDocument(collection, updateDetails, function (err, res) {
		// 												socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 											})
		// 										} else {
		// 											let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());

		// 											// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 											if (index_pos == -1) {
		// 												var foods = {
		// 													id: foodDetails._id,
		// 													pid: data.pid,
		// 													psprice: data.psprice,
		// 													mprice: data.mprice,
		// 													quantity: parseInt(data.addons_quantity),
		// 													rcat_id: data.rcat_id,
		// 													scat_id: data.scat_id,
		// 													size: data.size,
		// 													size_status: data.size_status,
		// 													image: foodDetails.avatar.slice(2)
		// 												}
		// 												var condition = { user_id: userId};
		// 												var updateDetails = { $push: { 'cart_details': foods } };
		// 												db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 													socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 												});
		// 											} else {
		// 												var condition = { user_id: userId};
		// 												var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 												if(data.size){
		// 													var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) }, 'cart_details.$[elem].size': data.size};
		// 												}
		// 												db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
		// 													socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 												});
		// 											}
		// 										}
		// 									} else{
		// 										socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 									}
		// 								} else {

		// 									socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 								}
		// 							}
		// 						})
		// 					}
		// 				});
		// 			}
		// 	// 	}
		// 	// });
		// });




		// socket.on('r2e_add_to_cart', async function (data) {
		// 	var type;
		// 	if (typeof data.type != 'undefined' && data.type != '') {
		// 		if (data.type == 'temp_cart' || data.type == 'cart') {
		// 			type = data.type;
		// 		} else {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid Type' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid Type' });
		// 		return;
		// 	}
		// 	var userId;
		// 	if (data.type == 'temp_cart') {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			userId = data.userId;
		// 		} else {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	} else {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			if (isObjectId(data.userId)) {
		// 				userId = new mongoose.Types.ObjectId(data.userId);
		// 			} else {
		// 				socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid userId' });
		// 				return;
		// 			}
		// 		} else {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	}
		// 	var foodId;
		// 	if (typeof data.foodId != 'undefined' && data.foodId != '') {
		// 		if (isObjectId(data.foodId)) {
		// 			foodId = new mongoose.Types.ObjectId(data.foodId);
		// 		} else {
		// 			socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid foodId' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid foodId' });
		// 		return;
		// 	}
		// 	var varntid;
		// 	// if (typeof data.varntid != 'undefined' && data.varntid != '') {
		// 	// 	if (isObjectId(data.varntid)) {
		// 	// 		varntid = new mongoose.Types.ObjectId(data.varntid);
		// 	// 	} else {
		// 	// 		socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid varntid' });
		// 	// 		return;
		// 	// 	}
		// 	// } else {
		// 	// 	socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid varntid' });
		// 	// 	return;
		// 	// }
		// 	// var cityid;
		// 	// if (typeof data.cityid != 'undefined' && data.cityid != '') {
		// 	// 	if (isObjectId(data.cityid)) {
		// 	// 		cityid = new mongoose.Types.ObjectId(data.cityid);
		// 	// 	} else {
		// 	// 		socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid cityid' });
		// 	// 		return;
		// 	// 	}
		// 	// } else {
		// 	// 	socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid cityid' });
		// 	// 	return;
		// 	// }

		// 	// db.GetOneDocument('city', { _id: cityid, "status": { $eq: 1 } }, {}, {}, function (err, citydetails) {
		// 	// 	if (err || !citydetails) {
		// 	// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 	// 	} else {
		// 	var collection = 'cart';
		// 	if (data.type == 'temp_cart') {
		// 		collection = 'temp_cart';
		// 	}
		// 	var condition = { user_id: userId };
		// 	// query2.o
		// 	// from where is the type status came from 
		// 	if (data && data.type_status == 1) {
		// 		condition.type_status = 1;

		// 		const cart = await db.GetOneDocument(collection, condition, {}, {})
		// 		console.log(condition, 'this is condition');
		// 		if (cart.status === false) {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 		} else {
		// 			// var is_food_available = 0;
		// 			var is_cart_available = 0;
		// 			if (cart && typeof cart._id != 'undefined') {
		// 				is_cart_available = 1;
		// 				// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
		// 				// 	if (typeof cart.cart_details != 'undefined') {
		// 				// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
		// 				// 		if (foodIndex != -1) {
		// 				// 			is_food_available = 1;
		// 				// 		}
		// 				// 	}
		// 				// } else {
		// 				// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
		// 				// 	return;
		// 				// }
		// 			}
		// 			var condition = { _id: foodId, status: 1 };
		// 			const foodDetails = await db.GetOneDocument('food', condition, {}, {})
		// 			if (foodDetails.status == false) {
		// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 			} else {
		// 				if (foodDetails && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
		// 					var quantityCond = 0
		// 					if (data.size_status == 1) {
		// 						var sizeArr = foodDetails.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
		// 						if (sizeArr && sizeArr.length > 0) {
		// 							quantityCond = 1;
		// 						}
		// 					} else {
		// 						if (foodDetails.quantity >= parseInt(data.addons_quantity)) {
		// 							quantityCond = 1;
		// 						}
		// 					}
		// 					if (quantityCond == 1) {
		// 						await db.DeleteDocument(collection, { user_id: userId, type_status: 1 })
		// 						// db.DeleteDocument(collection, {user_id: userId, type_status: 1}, function (err, res) {console.log("err, res", err, res) });
		// 						// if (is_cart_available == 1) {
		// 						// 	console.log(condition)
		// 						// } 
		// 						var updateDetails = { user_id: userId, cart_details: [], type_status: 1 };
		// 						var foods = {
		// 							id: foodDetails._id,
		// 							pid: data.pid,
		// 							psprice: data.psprice,
		// 							mprice: data.mprice,
		// 							quantity: parseInt(data.addons_quantity),
		// 							rcat_id: data.rcat_id,
		// 							scat_id: data.scat_id,
		// 							size: data.size,
		// 							size_status: data.size_status,
		// 							image: foodDetails.avatar.slice(2)
		// 						}
		// 						updateDetails.cart_details.push(foods);
		// 						await db.InsertDocument(collection, updateDetails)
		// 						// db.InsertDocument(collection, updateDetails, function (err, res) {
		// 						// 	console.log("err, res", err, res)
		// 						// 	socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 						// })
		// 						// else {
		// 						// 	let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());
		// 						// 	// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 						// 	if (index_pos == -1) {
		// 						// 		var foods = {
		// 						// 			id: foodDetails._id,
		// 						// 			pid: data.pid,
		// 						// 			psprice: data.psprice,
		// 						// 			mprice: data.mprice,
		// 						// 			quantity: parseInt(data.addons_quantity),
		// 						// 			rcat_id: data.rcat_id,
		// 						// 			scat_id: data.scat_id,
		// 						// 			size: data.size,
		// 						// 			image: foodDetails.avatar.slice(2)
		// 						// 		}
		// 						// 		var condition = { user_id: userId, type_status: 1};
		// 						// 		var updateDetails = { $push: { 'cart_details': foods } };
		// 						// 		db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 						// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 						// 		});
		// 						// 	} else {
		// 						// 		if(data.size){
		// 						// 			var condition = { user_id: userId};
		// 						// 			var updateDetails = { 'cart_details.$[elem].size': data.size};
		// 						// 			db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $eq: {"elem.id": foodDetails._id} }] }, function (err, res) {
		// 						// 				socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 						// 			});
		// 						// 		} else{
		// 						// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 						// 		}
		// 						// 		// var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 						// 		// if(data.size){
		// 						// 		// }
		// 						// 	}
		// 						// }
		// 					} else {
		// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 					}
		// 				} else {
		// 					socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 				}
		// 			}
		// 			// db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 			// 	if (err) {
		// 			// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 			// 	} else {
		// 			// 		if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 			// 			var quantityCond = 0
		// 			// 			if(data.size_status == 1){
		// 			// 				var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity)});
		// 			// 				if(sizeArr && sizeArr.length>0){
		// 			// 					quantityCond = 1;
		// 			// 				}
		// 			// 			} else{
		// 			// 				if(foodDetails.quantity >= parseInt(data.addons_quantity)){
		// 			// 					quantityCond = 1;
		// 			// 				}
		// 			// 			}
		// 			// 			if(quantityCond == 1){
		// 			// 				db.DeleteDocument(collection, {user_id: userId, type_status: 1}, function (err, res) {console.log("err, res", err, res) });
		// 			// 				// if (is_cart_available == 1) {
		// 			// 				// 	console.log(condition)
		// 			// 				// } 
		// 			// 				var updateDetails = { user_id: userId,  cart_details: [], type_status: 1 };
		// 			// 				var foods = {
		// 			// 					id: foodDetails._id,
		// 			// 					pid: data.pid,
		// 			// 					psprice: data.psprice,
		// 			// 					mprice: data.mprice,
		// 			// 					quantity: parseInt(data.addons_quantity),
		// 			// 					rcat_id: data.rcat_id,
		// 			// 					scat_id: data.scat_id,
		// 			// 					size: data.size,
		// 			// 					size_status: data.size_status,
		// 			// 					image: foodDetails.avatar.slice(2)
		// 			// 				}
		// 			// 				updateDetails.cart_details.push(foods);
		// 			// 				db.InsertDocument(collection, updateDetails, function (err, res) {
		// 			// 					console.log("err, res", err, res)
		// 			// 					socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 				})
		// 			// 				// else {
		// 			// 				// 	let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());
		// 			// 				// 	// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 			// 				// 	if (index_pos == -1) {
		// 			// 				// 		var foods = {
		// 			// 				// 			id: foodDetails._id,
		// 			// 				// 			pid: data.pid,
		// 			// 				// 			psprice: data.psprice,
		// 			// 				// 			mprice: data.mprice,
		// 			// 				// 			quantity: parseInt(data.addons_quantity),
		// 			// 				// 			rcat_id: data.rcat_id,
		// 			// 				// 			scat_id: data.scat_id,
		// 			// 				// 			size: data.size,
		// 			// 				// 			image: foodDetails.avatar.slice(2)
		// 			// 				// 		}
		// 			// 				// 		var condition = { user_id: userId, type_status: 1};
		// 			// 				// 		var updateDetails = { $push: { 'cart_details': foods } };
		// 			// 				// 		db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 			// 				// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 				// 		});
		// 			// 				// 	} else {
		// 			// 				// 		if(data.size){
		// 			// 				// 			var condition = { user_id: userId};
		// 			// 				// 			var updateDetails = { 'cart_details.$[elem].size': data.size};
		// 			// 				// 			db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $eq: {"elem.id": foodDetails._id} }] }, function (err, res) {
		// 			// 				// 				socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 				// 			});
		// 			// 				// 		} else{
		// 			// 				// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 				// 		}
		// 			// 				// 		// var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 			// 				// 		// if(data.size){
		// 			// 				// 		// }
		// 			// 				// 	}
		// 			// 				// }
		// 			// 			} else{
		// 			// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 			// 			}
		// 			// 		} else {
		// 			// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 			// 		}
		// 			// 	}
		// 			// })
		// 		}

		// 		// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
		// 		// 	if (err) {
		// 		// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 		// 	} else {
		// 		// 		// var is_food_available = 0;
		// 		// 		var is_cart_available = 0;
		// 		// 		if (cart && typeof cart._id != 'undefined') {
		// 		// 			is_cart_available = 1;
		// 		// 			// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
		// 		// 			// 	if (typeof cart.cart_details != 'undefined') {
		// 		// 			// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
		// 		// 			// 		if (foodIndex != -1) {
		// 		// 			// 			is_food_available = 1;
		// 		// 			// 		}
		// 		// 			// 	}
		// 		// 			// } else {
		// 		// 			// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
		// 		// 			// 	return;
		// 		// 			// }
		// 		// 		}
		// 		// 		var condition = { _id: foodId, status: 1 };
		// 		// 		db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 		// 			if (err) {
		// 		// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 		// 			} else {
		// 		// 				if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 		// 					var quantityCond = 0
		// 		// 					if(data.size_status == 1){
		// 		// 						var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity)});
		// 		// 						if(sizeArr && sizeArr.length>0){
		// 		// 							quantityCond = 1;
		// 		// 						}
		// 		// 					} else{
		// 		// 						if(foodDetails.quantity >= parseInt(data.addons_quantity)){
		// 		// 							quantityCond = 1;
		// 		// 						}
		// 		// 					}
		// 		// 					if(quantityCond == 1){
		// 		// 						db.DeleteDocument(collection, {user_id: userId, type_status: 1}, function (err, res) {console.log("err, res", err, res) });
		// 		// 						// if (is_cart_available == 1) {
		// 		// 						// 	console.log(condition)
		// 		// 						// } 
		// 		// 						var updateDetails = { user_id: userId,  cart_details: [], type_status: 1 };
		// 		// 						var foods = {
		// 		// 							id: foodDetails._id,
		// 		// 							pid: data.pid,
		// 		// 							psprice: data.psprice,
		// 		// 							mprice: data.mprice,
		// 		// 							quantity: parseInt(data.addons_quantity),
		// 		// 							rcat_id: data.rcat_id,
		// 		// 							scat_id: data.scat_id,
		// 		// 							size: data.size,
		// 		// 							size_status: data.size_status,
		// 		// 							image: foodDetails.avatar.slice(2)
		// 		// 						}
		// 		// 						updateDetails.cart_details.push(foods);
		// 		// 						db.InsertDocument(collection, updateDetails, function (err, res) {
		// 		// 							console.log("err, res", err, res)
		// 		// 							socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 						})
		// 		// 						// else {
		// 		// 						// 	let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());
		// 		// 						// 	// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 		// 						// 	if (index_pos == -1) {
		// 		// 						// 		var foods = {
		// 		// 						// 			id: foodDetails._id,
		// 		// 						// 			pid: data.pid,
		// 		// 						// 			psprice: data.psprice,
		// 		// 						// 			mprice: data.mprice,
		// 		// 						// 			quantity: parseInt(data.addons_quantity),
		// 		// 						// 			rcat_id: data.rcat_id,
		// 		// 						// 			scat_id: data.scat_id,
		// 		// 						// 			size: data.size,
		// 		// 						// 			image: foodDetails.avatar.slice(2)
		// 		// 						// 		}
		// 		// 						// 		var condition = { user_id: userId, type_status: 1};
		// 		// 						// 		var updateDetails = { $push: { 'cart_details': foods } };
		// 		// 						// 		db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 		// 						// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 						// 		});
		// 		// 						// 	} else {
		// 		// 						// 		if(data.size){
		// 		// 						// 			var condition = { user_id: userId};
		// 		// 						// 			var updateDetails = { 'cart_details.$[elem].size': data.size};
		// 		// 						// 			db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $eq: {"elem.id": foodDetails._id} }] }, function (err, res) {
		// 		// 						// 				socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 						// 			});
		// 		// 						// 		} else{
		// 		// 						// 			socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 						// 		}
		// 		// 						// 		// var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 		// 						// 		// if(data.size){
		// 		// 						// 		// }
		// 		// 						// 	}
		// 		// 						// }
		// 		// 					} else{
		// 		// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 		// 					}
		// 		// 				} else {
		// 		// 					socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 		// 				}
		// 		// 			}
		// 		// 		})
		// 		// 	}
		// 		// });
		// 	} else {
		// 		const cart = await db.GetOneDocument(collection, condition, {}, {})
		// 		console.log(cart, "This is the cart from the cart");
		// 		if (!cart.doc) {
		// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 		} else {
		// 			// var is_food_available = 0;
		// 			var is_cart_available = 0;
		// 			if (cart && typeof cart.doc._id != 'undefined') {
		// 				is_cart_available = 1;
		// 				// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
		// 				// 	if (typeof cart.cart_details != 'undefined') {
		// 				// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
		// 				// 		if (foodIndex != -1) {
		// 				// 			is_food_available = 1;
		// 				// 		}
		// 				// 	}
		// 				// } else {
		// 				// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
		// 				// 	return;
		// 				// }
		// 			}
		// 			console.log(is_cart_available, 'is_cart_available is_cart_available');
		// 			var condition = { _id: foodId, status: 1 };
		// 			const foodDetails = await db.GetOneDocument('food', condition, {}, {})
		// 			console.log(foodDetails, 'is it okk in product');
		// 			if (foodDetails.status === false) {
		// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 			} else {
		// 				if (foodDetails.doc && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
		// 					var quantityCond = 0;
		// 					if (data.size_status == 1) {
		// 						var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
		// 						if (sizeArr && sizeArr.length > 0) {
		// 							quantityCond = 1;
		// 						}
		// 					} else {
		// 						// here has no quantity 
		// 						console.log("entered the size");
		// 						if (foodDetails.doc.quantity >= parseInt(data.addons_quantity)) {
		// 							quantityCond = 1;
		// 						}
		// 					}
		// 					if (quantityCond == 1) {
		// 						console.log("hi entered quantity count");
		// 						if (is_cart_available == 0) {
		// 							var updateDetails = { user_id: userId, cart_details: [] };
		// 							var foods = {
		// 								id: foodDetails.doc._id,
		// 								pid: data.pid,
		// 								psprice: data.psprice,
		// 								mprice: data.mprice,
		// 								quantity: parseInt(data.addons_quantity),
		// 								rcat_id: data.rcat_id,
		// 								scat_id: data.scat_id,
		// 								size: data.size,
		// 								size_status: data.size_status,
		// 								image: foodDetails.doc.avatar.slice(2)
		// 							}
		// 							updateDetails.cart_details.push(foods);
		// 							const upd = await db.InsertDocument(collection, updateDetails)
		// 							socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });

		// 							// db.InsertDocument(collection, updateDetails, function (err, res) {
		// 							// 	socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 							// })
		// 						} else {
		// 							console.log("index_pos level 1***************");
		// 							let index_pos = cart.doc.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString());
		// 							console.log(index_pos, 'this is index pos');
		// 							// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 							if (index_pos == -1) {
		// 								var foods = {
		// 									id: foodDetails.doc._id,
		// 									pid: data.pid,
		// 									psprice: data.psprice,
		// 									mprice: data.mprice,
		// 									quantity: parseInt(data.addons_quantity),
		// 									rcat_id: data.rcat_id,
		// 									scat_id: data.scat_id,
		// 									size: data.size,
		// 									size_status: data.size_status,
		// 									image: foodDetails.doc.avatar.slice(2)
		// 								}
		// 								var condition = { user_id: userId };
		// 								var updateDetails = { $push: { 'cart_details': foods } };
		// 								const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
		// 								if (update.status) {
		// 									socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 								}
		// 								// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 								// 	socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 								// });
		// 							} else {
		// 								var condition = { user_id: userId };
		// 								var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 								if (data.size) {
		// 									var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) }, 'cart_details.$[elem].size': data.size };
		// 								}
		// 								a
		// 								const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] })
		// 								if (update.status) {
		// 									socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 								}
		// 								// db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
		// 								// 	socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 								// });
		// 							}
		// 						}
		// 					} else {
		// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 					}
		// 				} else {

		// 					socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 				}
		// 			}
		// 			// db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 			// 	if (err) {
		// 			// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 			// 	} else {
		// 			// 		if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 			// 			var quantityCond = 0;
		// 			// 			console.log("data", data)
		// 			// 			if(data.size_status == 1){
		// 			// 				var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity)});
		// 			// 				console.log("sizeArr", sizeArr)
		// 			// 				if(sizeArr && sizeArr.length>0){
		// 			// 					quantityCond = 1;
		// 			// 				}
		// 			// 			} else{
		// 			// 				if(foodDetails.quantity >= parseInt(data.addons_quantity)){
		// 			// 					quantityCond = 1;
		// 			// 				}
		// 			// 			}
		// 			// 			if(quantityCond == 1){
		// 			// 				if (is_cart_available == 0) {
		// 			// 					var updateDetails = { user_id: userId,  cart_details: [] };
		// 			// 					var foods = {
		// 			// 						id: foodDetails._id,
		// 			// 						pid: data.pid,
		// 			// 						psprice: data.psprice,
		// 			// 						mprice: data.mprice,
		// 			// 						quantity: parseInt(data.addons_quantity),
		// 			// 						rcat_id: data.rcat_id,
		// 			// 						scat_id: data.scat_id,
		// 			// 						size: data.size,
		// 			// 						size_status: data.size_status,
		// 			// 						image: foodDetails.avatar.slice(2)
		// 			// 					}
		// 			// 					updateDetails.cart_details.push(foods);
		// 			// 					db.InsertDocument(collection, updateDetails, function (err, res) {
		// 			// 						socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 					})
		// 			// 				} else {
		// 			// 					let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());

		// 			// 					// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 			// 					if (index_pos == -1) {
		// 			// 						var foods = {
		// 			// 							id: foodDetails._id,
		// 			// 							pid: data.pid,
		// 			// 							psprice: data.psprice,
		// 			// 							mprice: data.mprice,
		// 			// 							quantity: parseInt(data.addons_quantity),
		// 			// 							rcat_id: data.rcat_id,
		// 			// 							scat_id: data.scat_id,
		// 			// 							size: data.size,
		// 			// 							size_status: data.size_status,
		// 			// 							image: foodDetails.avatar.slice(2)
		// 			// 						}
		// 			// 						var condition = { user_id: userId};
		// 			// 						var updateDetails = { $push: { 'cart_details': foods } };
		// 			// 						db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 			// 							socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 						});
		// 			// 					} else {
		// 			// 						var condition = { user_id: userId};
		// 			// 						var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 			// 						if(data.size){
		// 			// 							var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) }, 'cart_details.$[elem].size': data.size};
		// 			// 						}
		// 			// 						db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
		// 			// 							socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 			// 						});
		// 			// 					}
		// 			// 				}
		// 			// 			} else{
		// 			// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 			// 			}
		// 			// 		} else {

		// 			// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 			// 		}
		// 			// 	}
		// 			// })
		// 		}


		// 		// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
		// 		// 	if (err) {
		// 		// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 		// 	} else {
		// 		// 		// var is_food_available = 0;
		// 		// 		var is_cart_available = 0;
		// 		// 		if (cart && typeof cart._id != 'undefined') {
		// 		// 			is_cart_available = 1;
		// 		// 			// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
		// 		// 			// 	if (typeof cart.cart_details != 'undefined') {
		// 		// 			// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
		// 		// 			// 		if (foodIndex != -1) {
		// 		// 			// 			is_food_available = 1;
		// 		// 			// 		}
		// 		// 			// 	}
		// 		// 			// } else {
		// 		// 			// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
		// 		// 			// 	return;
		// 		// 			// }
		// 		// 		}
		// 		// 		var condition = { _id: foodId, status: 1 };
		// 		// 		db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 		// 			if (err) {
		// 		// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
		// 		// 			} else {
		// 		// 				if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 		// 					var quantityCond = 0;
		// 		// 					console.log("data", data)
		// 		// 					if(data.size_status == 1){
		// 		// 						var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity)});
		// 		// 						console.log("sizeArr", sizeArr)
		// 		// 						if(sizeArr && sizeArr.length>0){
		// 		// 							quantityCond = 1;
		// 		// 						}
		// 		// 					} else{
		// 		// 						if(foodDetails.quantity >= parseInt(data.addons_quantity)){
		// 		// 							quantityCond = 1;
		// 		// 						}
		// 		// 					}
		// 		// 					if(quantityCond == 1){
		// 		// 						if (is_cart_available == 0) {
		// 		// 							var updateDetails = { user_id: userId,  cart_details: [] };
		// 		// 							var foods = {
		// 		// 								id: foodDetails._id,
		// 		// 								pid: data.pid,
		// 		// 								psprice: data.psprice,
		// 		// 								mprice: data.mprice,
		// 		// 								quantity: parseInt(data.addons_quantity),
		// 		// 								rcat_id: data.rcat_id,
		// 		// 								scat_id: data.scat_id,
		// 		// 								size: data.size,
		// 		// 								size_status: data.size_status,
		// 		// 								image: foodDetails.avatar.slice(2)
		// 		// 							}
		// 		// 							updateDetails.cart_details.push(foods);
		// 		// 							db.InsertDocument(collection, updateDetails, function (err, res) {
		// 		// 								socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 							})
		// 		// 						} else {
		// 		// 							let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());

		// 		// 							// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
		// 		// 							if (index_pos == -1) {
		// 		// 								var foods = {
		// 		// 									id: foodDetails._id,
		// 		// 									pid: data.pid,
		// 		// 									psprice: data.psprice,
		// 		// 									mprice: data.mprice,
		// 		// 									quantity: parseInt(data.addons_quantity),
		// 		// 									rcat_id: data.rcat_id,
		// 		// 									scat_id: data.scat_id,
		// 		// 									size: data.size,
		// 		// 									size_status: data.size_status,
		// 		// 									image: foodDetails.avatar.slice(2)
		// 		// 								}
		// 		// 								var condition = { user_id: userId};
		// 		// 								var updateDetails = { $push: { 'cart_details': foods } };
		// 		// 								db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 		// 									socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 								});
		// 		// 							} else {
		// 		// 								var condition = { user_id: userId};
		// 		// 								var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
		// 		// 								if(data.size){
		// 		// 									var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) }, 'cart_details.$[elem].size': data.size};
		// 		// 								}
		// 		// 								db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
		// 		// 									socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
		// 		// 								});
		// 		// 							}
		// 		// 						}
		// 		// 					} else{
		// 		// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
		// 		// 					}
		// 		// 				} else {

		// 		// 					socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
		// 		// 				}
		// 		// 			}
		// 		// 		})
		// 		// 	}
		// 		// });
		// 	}
		// 	// 	}
		// 	// });
		// });
		socket.on('r2e_add_to_cart', async function (data) {


			console.log('cart add emit')
			console.log("--------------------------ewwe----------------------------------------")
			console.log(data);

			console.log("------------------------------------------------------------------")

			var type;
			console.log(data, 'this is the data');
			console.log(data.variations, 'this is the datavarii');
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					if (isObjectId(data.userId)) {
						userId = new mongoose.Types.ObjectId(data.userId);
					} else {
						socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			}
			var foodId;
			if (typeof data.foodId != 'undefined' && data.foodId != '') {
				if (isObjectId(data.foodId)) {
					foodId = new mongoose.Types.ObjectId(data.foodId);
				} else {
					socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid foodId' });
					return;
				}
			} else {
				socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid foodId' });
				return;
			}
			var varntid;
			// if (typeof data.varntid != 'undefined' && data.varntid != '') {
			// 	if (isObjectId(data.varntid)) {
			// 		varntid = new mongoose.Types.ObjectId(data.varntid);
			// 	} else {
			// 		socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid varntid' });
			// 		return;
			// 	}
			// } else {
			// 	socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid varntid' });
			// 	return;
			// }
			// var cityid;
			// if (typeof data.cityid != 'undefined' && data.cityid != '') {
			// 	if (isObjectId(data.cityid)) {
			// 		cityid = new mongoose.Types.ObjectId(data.cityid);
			// 	} else {
			// 		socket.emit('r2e_add_to_cart', { err: 1, message: 'Invalid cityid' });
			// 		return;
			// 	}
			// } else {
			// 	socket.emit("r2e_add_to_cart", { err: 1, message: 'Invalid cityid' });
			// 	return;
			// }

			// db.GetOneDocument('city', { _id: cityid, "status": { $eq: 1 } }, {}, {}, function (err, citydetails) {
			// 	if (err || !citydetails) {
			// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
			// 	} else {
			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId };
			console.log(data.type_status, 'this is type status');
			if (data && data.type_status == 1) {
				console.log("It is exist at here");
				condition.type_status = 1;
				const cart = await db.GetOneDocument(collection, condition, {}, {})


				if (!cart) {
					socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
				}
				else {
					// var is_food_available = 0;
					var is_cart_available = 0;
					if (cart && typeof cart._id != 'undefined') {
						is_cart_available = 1;
						// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
						// 	if (typeof cart.cart_details != 'undefined') {
						// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
						// 		if (foodIndex != -1) {
						// 			is_food_available = 1;
						// 		}
						// 	}
						// } else {
						// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
						// 	return;
						// }
					}
					var condition = { _id: foodId, status: 1 };
					const foodDetails = await db.GetOneDocument('food', condition, {}, {});
					console.log(foodDetails, 'foodDetailsssss');
					if (!foodDetails) {
						socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
					} else {
						if (foodDetails.doc && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
							var quantityCond = 0
							console.log(data.size_status, '8*******************************************************************************************');
							if (data.size_status == 1) {
								let con = {
									"price_details.attributes": {
										$elemMatch: {
											chaild_id: targetChaildId
										}
									},

									"price_details.$": 1

								}
								console.log(targetChaildId, 'targetChaildId targetChaildId+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
								console.log("hi are you here please respond");
								const isVarient = await db.GetDocument.find('food', con, {}, {})
								console.log(isVarient, 'this is checking for varient');

							} else {
								console.log("Are you entered at here");
								if (foodDetails.doc.quantity >= parseInt(data.addons_quantity)) {
									// quantityCond = 1;
								}
							}
							if (quantityCond == 1) {
								await db.DeleteDocument(collection, { user_id: userId, type_status: 1 });
								// if (is_cart_available == 1) {
								// 	console.log(condition)
								// } 
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
									image: foodDetails.doc.avatar,
									fallbackimage: foodDetails.doc.avatar?.fallback.slice(2),
									Webpimage: foodDetails.doc.avatar?.webpImg.slice(2)
								}
								updateDetails.cart_details.push(foods);
								await db.InsertDocument(collection, updateDetails)
								socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });


							} else {
								socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.6476' });
							}
						} else {
							socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
						}
					}

				}

			} else {
				const cart = await db.GetOneDocument(collection, condition, {}, {})
				console.log("----------------------cart-----------------------------")
				console.log(cart)
				console.log("----------------------cart-----------------------------")
				if (!cart) {
					socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
				} else {
					// var is_food_available = 0;
					var is_cart_available = 0;
					if (cart && typeof cart.doc._id != 'undefined') {
						is_cart_available = 1;
						// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
						// 	if (typeof cart.cart_details != 'undefined') {
						// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
						// 		if (foodIndex != -1) {
						// 			is_food_available = 1;
						// 		}
						// 	}
						// } else {
						// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
						// 	return;
						// }
					}
					var condition = { _id: foodId, status: 1 };
					const foodDetails = await db.GetOneDocument('food', condition, {}, {})

					console.log("------------------foddata--------------------")
					console.log(foodDetails)

					console.log("------------------foddata--------------------")
					if (!foodDetails) {
						socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
					} else {
						if (foodDetails && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
							var quantityCond = 0;
							if (data.size_status == 1) {
								// var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
								// if (sizeArr && sizeArr.length > 0) {
								// 	quantityCond = 1;
								console.log(data, 'this the datass');
								// }

								console.log('this ............................');
								console.log(data.variations, 'this is varient id');
								console.log('this ............................');

								// let childIdConditions = data.variations.map(variation => {
								// 	return { chaild_id: variation.chaild_id };
								// });

								// let con = {
								// 	"_id": data.foodId,
								// 	"price_details.attributes": {
								// 		$elemMatch: {
								// 			$or: childIdConditions
								// 		}
								// 	}
								// };
								// console.log(data.variations[0][0].chaild_id, 'data.variations[0].chaild_id');
								let variationschaild = data.variations && data.variations[0][0].chaild_id || data && data.variations && data.variations.attributes && data.variations.attributes[0] && data.variations.attributes[0].chaild_id || data.variations[0][0].attribute_ids
								let con = {
									"_id": data.foodId,
									"price_details.attributes": {
										$elemMatch: {
											chaild_id: variationschaild
										}
									}

								}
								console.log(data, 'data.variations[0]data.variations[0]');
								console.log(data.variations, con, "hi are you here please respond");
								const isVarient = await db.GetOneDocument('food', con, {}, {})
								console.log(isVarient, 'isvarientsss');
								const priceDetails = isVarient.doc.price_details;
								console.log(priceDetails, 'totalPRiceDetails');



								const matchingItem = priceDetails?.find(item => {
									console.log("6565", item)
									const itemAttributeIds = item.attribute_ids.map(id => id.toString());
									return data.variations[0].every(fd => itemAttributeIds.includes(fd.chaild_id || fd.attribute_ids) && parseInt(item.quantity) !== 0);
								});

								// const matchingItem = priceDetails.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
								// const matchingItem = data.variations[0];
								// const matchingItem = isVarient.doc.price_details.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
								console.log(matchingItem, 'this is matching item ****');
								if (matchingItem) {
									if (is_cart_available == 0) {
										console.log("hi are you here");
										console.log(matchingItem.image, 'this is the image');
										var updateDetails1 = { user_id: userId, cart_details: [] };
										var foods = {
											id: foodDetails.doc._id,
											pid: data.pid,
											psprice: matchingItem.sprice,
											mprice: matchingItem.mprice,
											quantity: parseInt(data.addons_quantity),
											rcat_id: data.rcat_id,
											scat_id: data.scat_id,
											selectedVariantId: matchingItem._id,
											size: data.size,
											product_varient: data.varientId,
											size_status: data.size_status,
											image: foodDetails.doc.avatar.fallback,
											variations: data.variations,
											fallbackimage: foodDetails.doc.avatar.fallback,
											Webpimage: foodDetails.doc.avatar.webpImg
										}
										updateDetails1.cart_details.push(foods);
										console.log(foods, 'foodsfoods');
										await db.InsertDocument(collection, updateDetails1)
										socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails })
										// db.InsertDocument(collection, updateDetails1)
									} else {
										console.log("-------------------------------------------------commed in else--------------------------")
										console.log(foodDetails.doc);
										console.log(cart.doc.cart_details, "cartdetailsssssss");


										let index_pos = cart.doc.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString());
										console.log(index_pos, 'this is index pos');
										// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString() && e.varntid.toString() == varntid.toString());
										if (index_pos == -1 || index_pos > 0) {
											console.log(matchingItem.image, 'image of the product');
											var foods = {
												id: foodDetails.doc._id,
												pid: data.pid,
												psprice: matchingItem.sprice,
												mprice: matchingItem.mprice,
												quantity: parseInt(data.addons_quantity),
												rcat_id: data.rcat_id,
												product_varient: data.varientId,
												scat_id: data.scat_id,
												size: data.size,
												selectedVariantId: matchingItem._id,
												size_status: data.size_status,
												image: foodDetails.doc.avatar.fallback,
												variations: data.variations,
												fallbackimage: foodDetails.doc.avatar.fallback,
												Webpimage: foodDetails.doc.avatar.webpImg
											}
											var condition = { user_id: userId };

											var updateDetails = { $push: { 'cart_details': foods } };
											let checkingoutput = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
											console.log("-------------checkingoutput--------------------------------")
											console.log(checkingoutput)

											console.log("-------------checkingoutput--------------------------------")

											socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 1', 'updateDetails': updateDetails });
											// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
											// });
										}
										else {
											const matchingItem = priceDetails.find(item => {
												const itemAttributeIds = item.attribute_ids.map(id => id.toString());
												return data.variations[0].every(fd => itemAttributeIds.includes(fd.chaild_id) && parseInt(item.quantity) !== 0);
											});
											// const matchingItem = priceDetails.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
											// const matchingItem = data.variations[0];
											console.log(matchingItem, 'This is matching id');
											var condition = { user_id: userId };
											console.log(condition, 'conditionfoods');
											var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
											if (data) {
												const cart = await db.GetOneDocument(collection, condition, {}, {})
												const isSizeInCart = cart.doc.cart_details.some(item => item.size === data.size);
												console.log(cart, 'this is cart');
												console.log(cart.doc.cart_details, 'cart.doc.cart_detailscart.doc.cart_details');
												console.log(cart.doc.cart_details[0].variations, 'is in cart available');
												if (isSizeInCart) {
													var condition = {
														user_id: userId
													};
													if (foodDetails.doc.size_status === 1) {
														const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
														const currentProductQuantity = currentProduct[0].quantity;
														console.log(foodDetails, 'foodDetailsss');
														const matchSize = priceDetails.find(item => {
															const itemAttributeIds = item.attribute_ids.map(id => id.toString());
															return data.variations[0].every(fd => itemAttributeIds.includes(fd.chaild_id) && parseInt(item.quantity) !== 0);
														});
														// const matchSize = priceDetails.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
														// const matchSize = data.variations[0];;
														const matchQuantity = matchSize.quantity;
														console.log(currentProduct, 'currentProduct');
														console.log(currentProductQuantity, 'currentProductQuantity');

														console.log(matchSize, 'matchSize');
														console.log(matchQuantity, 'matchQuantity');
														console.log(data.variations, 'checkkkkkkkd ata1');
														console.log(cart.doc.cart_details, 'helllssa');
														// const IsProductExist = data.variations[0];;


														// const IsProductExist = data.variations.some(dataItem =>
														// 	cart.doc.cart_details[0].variations.some(cartItem =>
														// 		data.variations.every(attr =>
														// 			cart.doc.cart_details[0].variations.some(cartAttr =>
														// 				cartAttr.chaild_id === attr.chaild_id
														// 			)
														// 		)
														// 	)
														// );
														// 2.this is update 
														const IsProductExist = isProductExist(data.variations, cart.doc.cart_details);


														// const IsProductExist = cart.doc.cart_details.some(item => item.product_varient === data.varientId);
														console.log(IsProductExist, 'IsProductExistIsProductExist214');
														if (IsProductExist) {
															if (currentProductQuantity >= matchQuantity) {
																socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity6696.' });
															} else {
																try {
																	var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
																	// console.log(updateDetails, 'updateDetailsupdateDetailsupdateDetails');
																	// console.log(data, 'this is the datoo oo }}{{}}{{}}{{}}{}{}{}{}{{}{}}}{}{}');
																	// // [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }, { "elem.variations": { $all: data.variations } }] }] })
																	// console.log(foodDetails, 'foodDetails');
																	// console.log(foodDetails.doc._id, ' foodDetails.doc._id');
																	// console.log(data.size, 'data.size');
																	// console.log(varntid, 'varntid');
																	// console.log(data.variations, 'data.variations');

																	let checkDate = await db.GetOneDocument(collection, condition, {}, {})

																	console.log("checkDate", checkDate.doc.cart_details[0].variations)

																	const res = await db.UpdateDocument(collection, condition, updateDetails,
																		{
																			multi: true, arrayFilters: [{
																				$and: [{
																					"elem.id": foodDetails.doc._id, "elem.size":
																						data.size
																				}, { "elem.varntid": varntid }, {
																					"elem.variations":
																						{ $all: data.variations }
																				}]
																			}]
																		})
																	console.log(res, 'checkkkupdatessss');
																	socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
																} catch (e) {
																	console.log("errro in inga", e)
																}

															}
														}
														else {
															console.log(matchingItem.image, 'image of the product');
															var foods = {
																id: foodDetails.doc._id,
																pid: data.pid,
																psprice: matchingItem.sprice,
																mprice: matchingItem.mprice,
																quantity: parseInt(data.addons_quantity),
																rcat_id: data.rcat_id,
																product_varient: data.varientId,
																scat_id: data.scat_id,
																size: data.size,
																selectedVariantId: matchingItem._id,
																size_status: data.size_status,
																image: foodDetails.doc.avatar.fallback,
																variations: data.variations,
																fallbackimage: foodDetails.doc.avatar.fallback,
																Webpimage: foodDetails.doc.avatar.webpImg
															}
															var condition = { user_id: userId };
															var updateDetails = { $push: { 'cart_details': foods } };
															let checking_anotherData = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })

															console.log("---------------checking_anotherData---------------------------")

															console.log(checking_anotherData)
															console.log("---------------checking_anotherData---------------------------")

															socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 1', 'updateDetails': updateDetails });
														}

													} else {
														const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
														const currentProductQuantity = currentProduct[0].quantity;
														const matchQuantity = foodDetails.doc.quantity
														if (currentProductQuantity >= matchQuantity) {
															socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity6769.' });
														} else {
															var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
															const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] })
															console.log("--------------------------------------res--------------------------------")

															console.log(res)

															console.log("--------------------------------------res--------------------------------")

															socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
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
														image: foodDetails.doc.avatar.fallback,
														fallbackimage: foodDetails.doc.avatar.fallback,
														Webpimage: foodDetails.doc.avatar.webpImg
													}
													var condition = { user_id: userId };
													var updateDetails = { $push: { 'cart_details': foods } };
													const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })

													console.log("-------------------------------please come at least here------------------------")

													console.log(res)
													console.log("-------------------------------please come at least here------------------------")


													socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });

												}
												// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
												// 	const isSizeInCart = cart.cart_details.some(item => item.size === data.size);
												// 	if (isSizeInCart) {

												// 		var condition = {
												// 			user_id: userId
												// 		};
												// 		if (foodDetails.doc.size_status === 1) {
												// 			const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
												// 			const currentProductQuantity = currentProduct[0].quantity;
												// 			const matchSize = foodDetails.doc.quantity_size.filter(el => el.size === data.size)
												// 			const matchQuantity = matchSize[0].quantity;
												// 			if (currentProductQuantity >= matchQuantity) {
												// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
												// 			} else {
												// 				var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
												// 				db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
												// 					socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
												// 				});
												// 			}
												// 		} else {
												// 			const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
												// 			const currentProductQuantity = currentProduct[0].quantity;
												// 			const matchQuantity = foodDetails.doc.quantity
												// 			if (currentProductQuantity >= matchQuantity) {
												// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
												// 			} else {
												// 				var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
												// 				db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
												// 					socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
												// 				});
												// 			}

												// 		}
												// 	} else {
												// 		var foods = {
												// 			id: foodDetails.doc._id,
												// 			pid: data.pid,
												// 			psprice: data.psprice,
												// 			mprice: data.mprice,
												// 			quantity: 1,
												// 			rcat_id: data.rcat_id,
												// 			scat_id: data.scat_id,
												// 			size: data.size,
												// 			size_status: data.size_status,
												// 			image: foodDetails.doc.avatar.slice(2)
												// 		}
												// 		var condition = { user_id: userId };
												// 		var updateDetails = { $push: { 'cart_details': foods } };
												// 		db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
												// 			socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
												// 		})
												// 	}
												// })
											}
											// db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
											// 	socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': updateDetails });
											// });
										}
									}
								} else {
									return socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity6872.' });
								}
							} else {
								if (foodDetails.doc.quantity >= parseInt(data.addons_quantity)) {
									quantityCond = 1;
								}
							}
							if (quantityCond == 1) {
								if (is_cart_available == 0) {
									var updateDetails1 = { user_id: userId, cart_details: [] };
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
										image: foodDetails.doc.avatar.fallback,
										fallbackimage: foodDetails.doc.avatar.fallback,
										Webpimage: foodDetails.doc.avatar.webpImg
									}
									updateDetails1.cart_details.push(foods);
									await db.InsertDocument(collection, updateDetails1)
									socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails })
									// db.InsertDocument(collection, updateDetails1)
								} else {
									let index_pos = cart.doc.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString());

									// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails.doc._id.toString() && e.varntid.toString() == varntid.toString());
									if (index_pos == -1) {
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
											image: foodDetails.doc.avatar.fallback,
											fallbackimage: foodDetails.doc.avatar.fallback,
											Webpimage: foodDetails.doc.avatar.webpImg
										}
										var condition = { user_id: userId };
										var updateDetails = { $push: { 'cart_details': foods } };
										await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 1', 'updateDetails': updateDetails });
										// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {

										// });
									} else {
										var condition = { user_id: userId };
										var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
										if (data.size) {
											const cart = await db.GetOneDocument(collection, condition, {}, {})
											const isSizeInCart = cart.doc.cart_details.some(item => item.size === data.size);
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
														socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity6943.' });
													} else {
														var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
														const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] })
														socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });

													}
												} else {
													const currentProduct = cart.doc.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
													const currentProductQuantity = currentProduct[0].quantity;
													const matchQuantity = foodDetails.doc.quantity
													if (currentProductQuantity >= matchQuantity) {
														socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity6955.' });
													} else {
														var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
														const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] })
														socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
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
													image: foodDetails.doc.avatar.fallback,
													fallbackimage: foodDetails.doc.avatar.fallback,
													Webpimage: foodDetails.doc.avatar.webpImg
												}
												var condition = { user_id: userId };
												var updateDetails = { $push: { 'cart_details': foods } };
												const res = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
												socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });

											}
											// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
											// 	const isSizeInCart = cart.cart_details.some(item => item.size === data.size);
											// 	if (isSizeInCart) {

											// 		var condition = {
											// 			user_id: userId
											// 		};
											// 		if (foodDetails.doc.size_status === 1) {
											// 			const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
											// 			const currentProductQuantity = currentProduct[0].quantity;
											// 			const matchSize = foodDetails.doc.quantity_size.filter(el => el.size === data.size)
											// 			const matchQuantity = matchSize[0].quantity;
											// 			if (currentProductQuantity >= matchQuantity) {
											// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
											// 			} else {
											// 				var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
											// 				db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
											// 					socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
											// 				});
											// 			}
											// 		} else {
											// 			const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
											// 			const currentProductQuantity = currentProduct[0].quantity;
											// 			const matchQuantity = foodDetails.doc.quantity
											// 			if (currentProductQuantity >= matchQuantity) {
											// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
											// 			} else {
											// 				var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
											// 				db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
											// 					socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
											// 				});
											// 			}

											// 		}
											// 	} else {
											// 		var foods = {
											// 			id: foodDetails.doc._id,
											// 			pid: data.pid,
											// 			psprice: data.psprice,
											// 			mprice: data.mprice,
											// 			quantity: 1,
											// 			rcat_id: data.rcat_id,
											// 			scat_id: data.scat_id,
											// 			size: data.size,
											// 			size_status: data.size_status,
											// 			image: foodDetails.doc.avatar.slice(2)
											// 		}
											// 		var condition = { user_id: userId };
											// 		var updateDetails = { $push: { 'cart_details': foods } };
											// 		db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
											// 			socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
											// 		})
											// 	}
											// })
										}
										// db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails.doc._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
										// 	socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': updateDetails });
										// });
									}
								}
							} else {
								socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity7045.' });
							}
						} else {

							socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
						}
					}
					// db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails.doc) {
					// 	if (err) {
					// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
					// 	} else {
					// 		if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
					// 			var quantityCond = 0;
					// 			if (data.size_status == 1) {
					// 				var sizeArr = foodDetails.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
					// 				if (sizeArr && sizeArr.length > 0) {
					// 					quantityCond = 1;
					// 				}
					// 			} else {
					// 				if (foodDetails.quantity >= parseInt(data.addons_quantity)) {
					// 					quantityCond = 1;
					// 				}
					// 			}
					// 			if (quantityCond == 1) {
					// 				if (is_cart_available == 0) {
					// 					var updateDetails1 = { user_id: userId, cart_details: [] };
					// 					var foods = {
					// 						id: foodDetails._id,
					// 						pid: data.pid,
					// 						psprice: data.psprice,
					// 						mprice: data.mprice,
					// 						quantity: parseInt(data.addons_quantity),
					// 						rcat_id: data.rcat_id,
					// 						scat_id: data.scat_id,
					// 						size: data.size,
					// 						size_status: data.size_status,
					// 						image: foodDetails.avatar.slice(2)
					// 					}
					// 					updateDetails1.cart_details.push(foods);
					// 					db.InsertDocument(collection, updateDetails1, function (err, res) {
					// 						socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
					// 					})
					// 				} else {
					// 					let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());

					// 					// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
					// 					if (index_pos == -1) {
					// 						var foods = {
					// 							id: foodDetails._id,
					// 							pid: data.pid,
					// 							psprice: data.psprice,
					// 							mprice: data.mprice,
					// 							quantity: parseInt(data.addons_quantity),
					// 							rcat_id: data.rcat_id,
					// 							scat_id: data.scat_id,
					// 							size: data.size,
					// 							size_status: data.size_status,
					// 							image: foodDetails.avatar.slice(2)
					// 						}
					// 						var condition = { user_id: userId };
					// 						var updateDetails = { $push: { 'cart_details': foods } };
					// 						db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
					// 							socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 1', 'updateDetails': updateDetails });
					// 						});
					// 					} else {
					// 						var condition = { user_id: userId };
					// 						var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
					// 						if (data.size) {
					// 							db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
					// 								const isSizeInCart = cart.cart_details.some(item => item.size === data.size);
					// 								if (isSizeInCart) {

					// 									var condition = {
					// 										user_id: userId
					// 									};
					// 									if (foodDetails.size_status === 1) {
					// 										const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
					// 										const currentProductQuantity = currentProduct[0].quantity;
					// 										const matchSize = foodDetails.quantity_size.filter(el => el.size === data.size)
					// 										const matchQuantity = matchSize[0].quantity;
					// 										if (currentProductQuantity >= matchQuantity) {
					// 											socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
					// 										} else {
					// 											var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
					// 											db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
					// 												socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
					// 											});
					// 										}
					// 									} else {
					// 										const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
					// 										const currentProductQuantity = currentProduct[0].quantity;
					// 										const matchQuantity = foodDetails.quantity
					// 										if (currentProductQuantity >= matchQuantity) {
					// 											socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
					// 										} else {
					// 											var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
					// 											db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
					// 												socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
					// 											});
					// 										}

					// 									}
					// 								} else {
					// 									var foods = {
					// 										id: foodDetails._id,
					// 										pid: data.pid,
					// 										psprice: data.psprice,
					// 										mprice: data.mprice,
					// 										quantity: 1,
					// 										rcat_id: data.rcat_id,
					// 										scat_id: data.scat_id,
					// 										size: data.size,
					// 										size_status: data.size_status,
					// 										image: foodDetails.avatar.slice(2)
					// 									}
					// 									var condition = { user_id: userId };
					// 									var updateDetails = { $push: { 'cart_details': foods } };
					// 									db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
					// 										socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
					// 									})
					// 								}
					// 							})
					// 						}
					// 						// db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
					// 						// 	socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': updateDetails });
					// 						// });
					// 					}
					// 				}
					// 			} else {
					// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
					// 			}
					// 		} else {

					// 			socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
					// 		}
					// 	}
					// })
				}
				// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
				// 	if (err) {
				// 		socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
				// 	} else {
				// 		// var is_food_available = 0;
				// 		var is_cart_available = 0;
				// 		if (cart && typeof cart._id != 'undefined') {
				// 			is_cart_available = 1;
				// 			// if (typeof cart.restaurant_id != 'undefined' && cart.restaurant_id.toString() == restaurantId.toString()) {
				// 			// 	if (typeof cart.cart_details != 'undefined') {
				// 			// 		var foodIndex = cart.cart_details.map(function (e) { return e.id.toString(); }).indexOf(foodId.toString());
				// 			// 		if (foodIndex != -1) {
				// 			// 			is_food_available = 1;
				// 			// 		}
				// 			// 	}
				// 			// } else {
				// 			// 	socket.emit("r2e_add_to_cart", { err: 2, message: 'Already cart has another restaurant.' });
				// 			// 	return;
				// 			// }
				// 		}
				// 		var condition = { _id: foodId, status: 1 };
				// 		db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
				// 			if (err) {
				// 				socket.emit("r2e_add_to_cart", { err: 1, message: 'Unable to fetch data.' });
				// 			} else {
				// 				if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
				// 					var quantityCond = 0;
				// 					if (data.size_status == 1) {
				// 						var sizeArr = foodDetails.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
				// 						if (sizeArr && sizeArr.length > 0) {
				// 							quantityCond = 1;
				// 						}
				// 					} else {
				// 						if (foodDetails.quantity >= parseInt(data.addons_quantity)) {
				// 							quantityCond = 1;
				// 						}
				// 					}
				// 					if (quantityCond == 1) {
				// 						if (is_cart_available == 0) {
				// 							var updateDetails1 = { user_id: userId, cart_details: [] };
				// 							var foods = {
				// 								id: foodDetails._id,
				// 								pid: data.pid,
				// 								psprice: data.psprice,
				// 								mprice: data.mprice,
				// 								quantity: parseInt(data.addons_quantity),
				// 								rcat_id: data.rcat_id,
				// 								scat_id: data.scat_id,
				// 								size: data.size,
				// 								size_status: data.size_status,
				// 								image: foodDetails.avatar.slice(2)
				// 							}
				// 							updateDetails1.cart_details.push(foods);
				// 							db.InsertDocument(collection, updateDetails1, function (err, res) {
				// 								socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
				// 							})
				// 						} else {
				// 							let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString());

				// 							// let index_pos = cart.cart_details.findIndex(e => e.id.toString() == foodDetails._id.toString() && e.varntid.toString() == varntid.toString());
				// 							if (index_pos == -1) {
				// 								var foods = {
				// 									id: foodDetails._id,
				// 									pid: data.pid,
				// 									psprice: data.psprice,
				// 									mprice: data.mprice,
				// 									quantity: parseInt(data.addons_quantity),
				// 									rcat_id: data.rcat_id,
				// 									scat_id: data.scat_id,
				// 									size: data.size,
				// 									size_status: data.size_status,
				// 									image: foodDetails.avatar.slice(2)
				// 								}
				// 								var condition = { user_id: userId };
				// 								var updateDetails = { $push: { 'cart_details': foods } };
				// 								db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
				// 									socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 1', 'updateDetails': updateDetails });
				// 								});
				// 							} else {
				// 								var condition = { user_id: userId };
				// 								var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
				// 								if (data.size) {
				// 									db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
				// 										const isSizeInCart = cart.cart_details.some(item => item.size === data.size);
				// 										if (isSizeInCart) {

				// 											var condition = {
				// 												user_id: userId
				// 											};
				// 											if (foodDetails.size_status === 1) {
				// 												const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
				// 												const currentProductQuantity = currentProduct[0].quantity;
				// 												const matchSize = foodDetails.quantity_size.filter(el => el.size === data.size)
				// 												const matchQuantity = matchSize[0].quantity;
				// 												if (currentProductQuantity >= matchQuantity) {
				// 													socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
				// 												} else {
				// 													var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
				// 													db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
				// 														socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
				// 													});
				// 												}
				// 											} else {
				// 												const currentProduct = cart.cart_details.filter(el => el.id == data.foodId && el.size == data.size)
				// 												const currentProductQuantity = currentProduct[0].quantity;
				// 												const matchQuantity = foodDetails.quantity
				// 												if (currentProductQuantity >= matchQuantity) {
				// 													socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
				// 												} else {
				// 													var updateDetails = { $inc: { 'cart_details.$[elem].quantity': parseInt(data.addons_quantity) } };
				// 													db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id, "elem.size": data.size }, { "elem.varntid": varntid }] }] }, function (err, res) {
				// 														socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
				// 													});
				// 												}

				// 											}
				// 										} else {
				// 											var foods = {
				// 												id: foodDetails._id,
				// 												pid: data.pid,
				// 												psprice: data.psprice,
				// 												mprice: data.mprice,
				// 												quantity: 1,
				// 												rcat_id: data.rcat_id,
				// 												scat_id: data.scat_id,
				// 												size: data.size,
				// 												size_status: data.size_status,
				// 												image: foodDetails.avatar.slice(2)
				// 											}
				// 											var condition = { user_id: userId };
				// 											var updateDetails = { $push: { 'cart_details': foods } };
				// 											db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
				// 												socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': res });
				// 											})
				// 										}
				// 									})
				// 								}
				// 								// db.UpdateDocument(collection, condition, updateDetails, { multi: true, arrayFilters: [{ $and: [{ "elem.id": foodDetails._id }, { "elem.varntid": varntid }] }] }, function (err, res) {
				// 								// 	socket.emit("r2e_add_to_cart", { err: 0, message: 'This is update 2', 'updateDetails': updateDetails });
				// 								// });
				// 							}
				// 						}
				// 					} else {
				// 						socket.emit("r2e_add_to_cart", { err: 1, message: 'This product is in below Quantity.' });
				// 					}
				// 				} else {

				// 					socket.emit("r2e_add_to_cart", { err: 1, message: 'Product Not Found.' });
				// 				}
				// 			}
				// 		})
				// 	}
				// });
			}
			// 	}
			// });
		});

		socket.on('r2e_buy_to_cart', async function (data) {
			console.log(data, 'this is data');
			var type;
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					socket.emit("r2e_buy_to_cart", { err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				socket.emit("r2e_buy_to_cart", { err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					socket.emit("r2e_buy_to_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					if (isObjectId(data.userId)) {
						userId = new mongoose.Types.ObjectId(data.userId);
					} else {
						socket.emit('r2e_buy_to_cart', { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					socket.emit("r2e_buy_to_cart", { err: 1, message: 'Invalid userId' });
					return;
				}
			}
			var foodId;
			if (typeof data.foodId != 'undefined' && data.foodId != '') {
				if (isObjectId(data.foodId)) {
					foodId = new mongoose.Types.ObjectId(data.foodId);
				} else {
					socket.emit('r2e_buy_to_cart', { err: 1, message: 'Invalid foodId' });
					return;
				}
			} else {
				socket.emit("r2e_buy_to_cart", { err: 1, message: 'Invalid foodId' });
				return;
			}
			var varntid;
			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId };
			console.log(collection, 'this is the collection');
			console.log(condition, 'this is the codition');

			condition.type_status = 1;
			const cart = await db.GetOneDocument(collection, condition, {}, {})
			console.log(cart, 'this is cart');
			if (!cart) {
				socket.emit("r2e_buy_to_cart", { err: 1, message: 'Unable to fetch data.' });
			} else {
				var is_cart_available = 0;
				if (cart && typeof cart.doc._id != 'undefined') {
					is_cart_available = 1;
				}
				var condition = { _id: foodId, status: 1 };
				const foodDetails = await db.GetOneDocument('food', condition, {}, {})
				console.log(foodDetails, 'hi this is that');
				if (!foodDetails) {
					socket.emit("r2e_buy_to_cart", { err: 1, message: 'Unable to fetch data.' });
				} else {
					if (foodDetails.doc && typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
						var quantityCond = 0
						if (data.size_status == 1) {
							// var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
							// if (sizeArr && sizeArr.length > 0) {
							// 	quantityCond = 1;
							// }
							quantityCond = 1;
						} else {
							if (foodDetails.doc.quantity >= parseInt(data.addons_quantity)) {
								quantityCond = 1;
							}
						}
						if (quantityCond == 1) {



							if (data.size_status == 1) {
								let con = {
									"_id": data.foodId,
									"price_details.attributes": {
										$elemMatch: {
											chaild_id: data.variations[0][0].chaild_id
										}
									}

								}
								console.log("hi are you here please respond");
								const isVarient = await db.GetOneDocument('food', con, {}, {})
								const priceDetails = isVarient.doc.price_details;
								const matchingItem = priceDetails.find(item => {
									const itemAttributeIds = item.attribute_ids.map(id => id.toString());
									return data.variations[0].every(fd => itemAttributeIds.includes(fd.chaild_id) && parseInt(item.quantity) !== 0);
								});
								// const matchingItem = priceDetails.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
								// const matchingItem = isVarient.doc.price_details.find(item => item.attributes.some(attr => attr.chaild_id === data.varientId) && parseInt(item.quantity) !== 0);
								console.log(matchingItem, 'this is matching item ****');
								await db.DeleteDocument(collection, { user_id: userId, type_status: 1 })

								// db.DeleteDocument(collection, { user_id: userId, type_status: 1 }, function (err, res) { console.log("err, res", err, res) });
								var updateDetails = { user_id: userId, cart_details: [], type_status: 1 };
								console.log(matchingItem, 'this is matching item ****+++++++++++++++');
								var foods = {
									id: foodDetails.doc._id,
									pid: data.pid,
									psprice: matchingItem.sprice,
									mprice: matchingItem.mprice,
									quantity: parseInt(data.addons_quantity),
									rcat_id: data.rcat_id,
									scat_id: data.scat_id,
									size: data.size,
									product_varient: data.varientId,
									selectedVariantId: matchingItem._id,
									size_status: data.size_status,
									image: matchingItem.image,
									variations: data.variations
								}
								updateDetails.cart_details.push(foods);
								await db.InsertDocument(collection, updateDetails)

								console.log(updateDetails, 'updateDetailsupdateDetails');
								socket.emit("r2e_buy_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
							} else {
								await db.DeleteDocument(collection, { user_id: userId, type_status: 1 })

								// db.DeleteDocument(collection, { user_id: userId, type_status: 1 }, function (err, res) { console.log("err, res", err, res) });
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
									image: foodDetails.doc.avatar.slice(2)
								}
								updateDetails.cart_details.push(foods);
								await db.InsertDocument(collection, updateDetails)
								socket.emit("r2e_buy_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
							}

							// db.InsertDocument(collection, updateDetails, function (err, res) {
							// 	socket.emit("r2e_buy_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
							// })
						} else {
							socket.emit("r2e_buy_to_cart", { err: 1, message: 'This product is in below Quantity7501.' });
						}
					} else {
						socket.emit("r2e_buy_to_cart", { err: 1, message: 'Product Not Found.' });
					}
				}
				// db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
				// 	if (err) {
				// 		socket.emit("r2e_buy_to_cart", { err: 1, message: 'Unable to fetch data.' });
				// 	} else {
				// 		if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
				// 			var quantityCond = 0
				// 			if (data.size_status == 1) {
				// 				var sizeArr = foodDetails.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
				// 				if (sizeArr && sizeArr.length > 0) {
				// 					quantityCond = 1;
				// 				}
				// 			} else {
				// 				if (foodDetails.quantity >= parseInt(data.addons_quantity)) {
				// 					quantityCond = 1;
				// 				}
				// 			}
				// 			if (quantityCond == 1) {
				// 				db.DeleteDocument(collection, { user_id: userId, type_status: 1 }, function (err, res) { console.log("err, res", err, res) });
				// 				var updateDetails = { user_id: userId, cart_details: [], type_status: 1 };
				// 				var foods = {
				// 					id: foodDetails._id,
				// 					pid: data.pid,
				// 					psprice: data.psprice,
				// 					mprice: data.mprice,
				// 					quantity: parseInt(data.addons_quantity),
				// 					rcat_id: data.rcat_id,
				// 					scat_id: data.scat_id,
				// 					size: data.size,
				// 					size_status: data.size_status,
				// 					image: foodDetails.avatar.slice(2)
				// 				}
				// 				updateDetails.cart_details.push(foods);
				// 				db.InsertDocument(collection, updateDetails, function (err, res) {
				// 					socket.emit("r2e_buy_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
				// 				})
				// 			} else {
				// 				socket.emit("r2e_buy_to_cart", { err: 1, message: 'This product is in below Quantity.' });
				// 			}
				// 		} else {
				// 			socket.emit("r2e_buy_to_cart", { err: 1, message: 'Product Not Found.' });
				// 		}
				// 	}
				// })
			}
			// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
			// 	if (err) {
			// 		socket.emit("r2e_buy_to_cart", { err: 1, message: 'Unable to fetch data.' });
			// 	} else {
			// 		var is_cart_available = 0;
			// 		if (cart && typeof cart._id != 'undefined') {
			// 			is_cart_available = 1;
			// 		}
			// 		var condition = { _id: foodId, status: 1 };
			// 		db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
			// 			if (err) {
			// 				socket.emit("r2e_buy_to_cart", { err: 1, message: 'Unable to fetch data.' });
			// 			} else {
			// 				if (foodDetails && typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
			// 					var quantityCond = 0
			// 					if (data.size_status == 1) {
			// 						var sizeArr = foodDetails.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= parseInt(data.addons_quantity) });
			// 						if (sizeArr && sizeArr.length > 0) {
			// 							quantityCond = 1;
			// 						}
			// 					} else {
			// 						if (foodDetails.quantity >= parseInt(data.addons_quantity)) {
			// 							quantityCond = 1;
			// 						}
			// 					}
			// 					if (quantityCond == 1) {
			// 						db.DeleteDocument(collection, { user_id: userId, type_status: 1 }, function (err, res) { console.log("err, res", err, res) });
			// 						var updateDetails = { user_id: userId, cart_details: [], type_status: 1 };
			// 						var foods = {
			// 							id: foodDetails._id,
			// 							pid: data.pid,
			// 							psprice: data.psprice,
			// 							mprice: data.mprice,
			// 							quantity: parseInt(data.addons_quantity),
			// 							rcat_id: data.rcat_id,
			// 							scat_id: data.scat_id,
			// 							size: data.size,
			// 							size_status: data.size_status,
			// 							image: foodDetails.avatar.slice(2)
			// 						}
			// 						updateDetails.cart_details.push(foods);
			// 						db.InsertDocument(collection, updateDetails, function (err, res) {
			// 							socket.emit("r2e_buy_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
			// 						})
			// 					} else {
			// 						socket.emit("r2e_buy_to_cart", { err: 1, message: 'This product is in below Quantity.' });
			// 					}
			// 				} else {
			// 					socket.emit("r2e_buy_to_cart", { err: 1, message: 'Product Not Found.' });
			// 				}
			// 			}
			// 		})
			// 	}
			// });
		});


		// socket.on('r2e_change_cart_quantity', function (data) {
		// 	var type;
		// 	if (typeof data.type != 'undefined' && data.type != '') {
		// 		if (data.type == 'temp_cart' || data.type == 'cart') {
		// 			type = data.type;
		// 		} else {
		// 			socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid Type' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid Type' });
		// 		return;
		// 	}
		// 	var userId;
		// 	if (data.type == 'temp_cart') {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			userId = data.userId;
		// 		} else {
		// 			socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	} else {
		// 		if (typeof data.userId != 'undefined' && data.userId != '') {
		// 			if (isObjectId(data.userId)) {
		// 				userId = new mongoose.Types.ObjectId(data.userId);
		// 			} else {
		// 				socket.emit('r2e_change_cart_quantity', { err: 1, message: 'Invalid userId' });
		// 				return;
		// 			}
		// 		} else {
		// 			socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid userId' });
		// 			return;
		// 		}
		// 	}

		// 	var foodId;
		// 	if (typeof data.foodId != 'undefined' && data.foodId != '') {
		// 		if (isObjectId(data.foodId)) {
		// 			foodId = new mongoose.Types.ObjectId(data.foodId);
		// 		} else {
		// 			socket.emit('r2e_change_cart_quantity', { err: 1, message: 'Invalid foodId' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid foodId' });
		// 		return;
		// 	}
		// 	var cart_id;
		// 	if (typeof data.cart_id != 'undefined' && data.cart_id != '') {
		// 		if (isObjectId(data.cart_id)) {
		// 			cart_id = new mongoose.Types.ObjectId(data.cart_id);
		// 		} else {
		// 			socket.emit('r2e_change_cart_quantity', { err: 1, message: 'Invalid cart_id' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid cart_id' });
		// 		return;
		// 	}
		// 	var quantity_type;

		// 	if (typeof data.quantity_type != 'undefined' && data.quantity_type != '') {
		// 		if (data.quantity_type == 'increement' || data.quantity_type == 'decreement') {
		// 			quantity_type = data.quantity_type;
		// 		} else if(data.quantity_type == 'size'){
		// 			quantity_type = data.quantity_type;
		// 		} else {
		// 			socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid quantity_type' });
		// 			return;
		// 		}
		// 	} else {
		// 		socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid quantity_type' });
		// 		return;
		// 	}

		// 	var collection = 'cart';
		// 	if (data.type == 'temp_cart') {
		// 		collection = 'temp_cart';
		// 	}
		// 	var condition = { user_id: userId};

		// 	db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
		// 		if (err) {
		// 			socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Unable to fetch data.' });
		// 		} else {
		// 			var is_food_available = 0;
		// 			var is_cart_available = 0;
		// 			var foodIndex = -1;
		// 			var cartLength = -1;
		// 			if (cart && typeof cart._id != 'undefined') {
		// 				is_cart_available = 1;
		// 				if (typeof cart.cart_details != 'undefined') {
		// 					cartLength = cart.cart_details.length;
		// 					foodIndex = cart.cart_details.map(function (e) { return e._id.toString(); }).indexOf(cart_id.toString());
		// 					if (foodIndex != -1) {
		// 						is_food_available = 1;
		// 					}
		// 				}
		// 				// if (typeof cart.city_id != 'undefined' && cart.city_id.toString() == cityid.toString()) {
		// 				// 	if (typeof cart.cart_details != 'undefined') {
		// 				// 		cartLength = cart.cart_details.length;
		// 				// 		foodIndex = cart.cart_details.map(function (e) { return e._id.toString(); }).indexOf(cart_id.toString());
		// 				// 		if (foodIndex != -1) {
		// 				// 			is_food_available = 1;
		// 				// 		}
		// 				// 	}
		// 				// } else {
		// 				// 	socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Already cart has another city.' });
		// 				// 	return;

		// 				// }
		// 			} else {
		// 				socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Cart Details Not Found.' });
		// 				return;
		// 			}
		// 			if (is_food_available == 0 || foodIndex == -1 || cartLength == -1) {
		// 				socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Product Not Found.' });
		// 				return;
		// 			} else {
		// 				var condition = { _id: foodId, status: 1 };
		// 				db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
		// 					if (err) {
		// 						socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Unable to fetch data.' });
		// 					} else {
		// 						if (typeof foodDetails != 'undefined' && typeof foodDetails._id != 'undefined') {
		// 							var quantitys = 0
		// 							quantitys = cart.cart_details[foodIndex].quantity;
		// 							if(quantity_type == 'size'){
		// 								if(data && data.type_status == 0){
		// 									var condition = { user_id: userId, "cart_details": { $elemMatch: { "id": foodId, "size": data.size} } };
		// 									db.GetOneDocument(collection,condition,{},{},(err, doc)=>{
		// 										if(doc){		
		// 											var quantityCond = 0;
		// 											var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= cart.cart_details[foodIndex].quantity});
		// 											if(sizeArr && sizeArr.length>0){
		// 												quantityCond = 1;
		// 											}	
		// 											if(quantityCond == 1){
		// 												var updateDetails = { "cart_details.$.size": data.size };
		// 												db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 													socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
		// 												});
		// 											} else{
		// 												socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity.' });
		// 											}									
		// 										} else{
		// 											var condtin = {user_id: userId, "cart_details": { $elemMatch: { "_id": cart_id} }}
		// 											db.GetOneDocument(collection,condtin,{},{},(err, docdata)=>{
		// 												if(docdata){
		// 													var quantityCond = 0;
		// 													var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= 0});
		// 													if(sizeArr && sizeArr.length>0){
		// 														quantityCond = 1;
		// 													}
		// 													if(quantityCond == 1){

		// 														var foods = {
		// 															id: foodDetails._id,
		// 															pid: data.pid,
		// 															psprice: data.psprice,
		// 															mprice: data.mprice,
		// 															quantity: 1,
		// 															rcat_id: data.rcat_id,
		// 															scat_id: data.scat_id,
		// 															size: data.size,
		// 															size_status: data.size_status,
		// 															image: foodDetails.avatar.slice(2)
		// 														}
		// 														var condition = { user_id: userId};
		// 														var updateDetails = { $push: { 'cart_details': foods } };
		// 														db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 															// console.log("err, res", err, res)
		// 															socket.emit("r2e_change_cart_quantity", { err: 0, message: '', 'updateDetails': updateDetails });
		// 														});
		// 													} else{
		// 														socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity.' });
		// 													}
		// 												} else{
		// 													socket.emit("r2e_change_cart_quantity", { err: 0, message: '', 'updateDetails': updateDetails });
		// 												}
		// 											})
		// 										}
		// 									})
		// 								} else{
		// 									var quantityCond = 0;
		// 									var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == data.size && e.quantity >= cart.cart_details[foodIndex].quantity});
		// 									if(sizeArr && sizeArr.length>0){
		// 										quantityCond = 1;
		// 									}
		// 									if(quantityCond == 1){
		// 										var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cart_id} } };
		// 										var updateDetails = { "cart_details.$.size": data.size };
		// 										db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
		// 										});
		// 									} else{
		// 										socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity.' });
		// 									}
		// 								}
		// 								// if(foodDetails.quantity >= quantitys){

		// 								// } else{
		// 								// 	socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity.' });
		// 								// }
		// 							} else{
		// 								var quantity = 0;
		// 								if (typeof cart.cart_details[foodIndex].quantity != 'undefined') {
		// 									quantity = cart.cart_details[foodIndex].quantity;
		// 								}
		// 								if (quantity_type == 'decreement') {
		// 									if (quantity > 0) {
		// 										quantity = quantity - 1;
		// 									}
		// 								} else {
		// 									quantity = quantity + 1;
		// 								}
		// 								if (quantity > 0) {
		// 									var quantityCond = 0;
		// 									if(cart.cart_details[foodIndex].size_status == 1){
		// 										var sizeArr = foodDetails.quantity_size.filter(e=>{return e.status == 1 && e.size == cart.cart_details[foodIndex].size && e.quantity >= parseInt(quantity)});
		// 										if(sizeArr && sizeArr.length>0){
		// 											quantityCond = 1;
		// 										}
		// 									} else{
		// 										if(foodDetails.quantity >= parseInt(quantity)){
		// 											quantityCond = 1;
		// 										}
		// 									}
		// 									if(quantityCond == 1){
		// 										var updateDetails = { "cart_details.$.quantity": parseInt(quantity) };
		// 										var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cart_id } } };
		// 										db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
		// 										});
		// 									} else{
		// 										socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity.' });
		// 									}
		// 								} else {
		// 									if (cartLength > 1) {
		// 										var updateDetails = { "$pull": { 'cart_details': { _id: { $in: [cart_id] } } } };
		// 										var condition = { user_id: userId};
		// 										db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
		// 											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
		// 										});
		// 									} else {
		// 										var condition = { user_id: userId };
		// 										db.DeleteDocument(collection, condition, function (err, res) {
		// 											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
		// 										});
		// 									}
		// 								}
		// 							}

		// 						} else {
		// 							socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Product Not Found.' });

		// 						}
		// 					}
		// 				})
		// 			}

		// 		}
		// 	});
		// });



		socket.on('r2e_change_cart_quantity', async function (data) {
			var type;
			console.log(data, 'this is the data from the data');
			if (typeof data.type != 'undefined' && data.type != '') {
				if (data.type == 'temp_cart' || data.type == 'cart') {
					type = data.type;
				} else {
					socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid Type' });
					return;
				}
			} else {
				socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid Type' });
				return;
			}
			var userId;
			if (data.type == 'temp_cart') {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					userId = data.userId;
				} else {
					socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				if (typeof data.userId != 'undefined' && data.userId != '') {
					if (isObjectId(data.userId)) {
						userId = new mongoose.Types.ObjectId(data.userId);
					} else {
						socket.emit('r2e_change_cart_quantity', { err: 1, message: 'Invalid userId' });
						return;
					}
				} else {
					socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid userId' });
					return;
				}
			}

			var foodId;
			if (typeof data.foodId != 'undefined' && data.foodId != '') {
				if (isObjectId(data.foodId)) {
					foodId = new mongoose.Types.ObjectId(data.foodId);
				} else {
					socket.emit('r2e_change_cart_quantity', { err: 1, message: 'Invalid foodId' });
					return;
				}
			} else {
				socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid foodId' });
				return;
			}
			var cart_id;
			if (typeof data.cart_id != 'undefined' && data.cart_id != '') {
				if (isObjectId(data.cart_id)) {
					cart_id = new mongoose.Types.ObjectId(data.cart_id);
				} else {
					socket.emit('r2e_change_cart_quantity', { err: 1, message: 'Invalid cart_id' });
					return;
				}
			} else {
				socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid cart_id' });
				return;
			}
			var quantity_type;

			if (typeof data.quantity_type != 'undefined' && data.quantity_type != '') {
				if (data.quantity_type == 'increement' || data.quantity_type == 'decreement') {
					quantity_type = data.quantity_type;
				} else if (data.quantity_type == 'size') {
					quantity_type = data.quantity_type;
				} else {
					socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid quantity_type' });
					return;
				}
			} else {
				socket.emit("r2e_change_cart_quantity", { err: 1, message: 'Invalid quantity_type' });
				return;
			}

			var collection = 'cart';
			if (data.type == 'temp_cart') {
				collection = 'temp_cart';
			}
			var condition = { user_id: userId, type_status: data.type_status };
			const cart = await db.GetOneDocument(collection, condition, {}, {})
			console.log(cart, 'this is cart from the universe ');
			if (!cart) {
				socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Unable to fetch data.' });
			} else {
				var is_food_available = 0;
				var is_cart_available = 0;
				var foodIndex = -1;
				var cartLength = -1;
				if (cart.doc && typeof cart.doc._id != 'undefined') {
					is_cart_available = 1;
					console.log(cart.doc.cart_details, 'cart.doc.cart_details');
					if (typeof cart.doc.cart_details != 'undefined') {
						cartLength = cart.doc.cart_details.length;
						foodIndex = cart.doc.cart_details.map(function (e) {
							return e._id.toString();
						}).indexOf(cart_id.toString());
						if (foodIndex != -1) {
							is_food_available = 1;
						}
					}
					// if (typeof cart.city_id != 'undefined' && cart.city_id.toString() == cityid.toString()) {
					// 	if (typeof cart.cart_details != 'undefined') {
					// 		cartLength = cart.cart_details.length;
					// 		foodIndex = cart.cart_details.map(function (e) { return e._id.toString(); }).indexOf(cart_id.toString());
					// 		if (foodIndex != -1) {
					// 			is_food_available = 1;
					// 		}
					// 	}
					// } else {
					// 	socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Already cart has another city.' });
					// 	return;

					// }
				} else {
					socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Cart Details Not Found.' });
					return;
				}
				if (is_food_available == 0 || foodIndex == -1 || cartLength == -1) {
					socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Product Not Found.' });
					return;
				} else {
					var condition = { _id: foodId, status: 1 };
					const foodDetails = await db.GetOneDocument('food', condition, {}, {})
					console.log(foodDetails, 'this is the details from the universe');
					if (!foodDetails) {
						socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Unable to fetch data.' });
					} else {
						if (typeof foodDetails.doc != 'undefined' && typeof foodDetails.doc._id != 'undefined') {
							var quantitys = 0
							quantitys = cart.doc.cart_details[foodIndex].quantity;
							if (data.variations && data.variations.length > 0) {
								console.log("Hello how are you");


								// function findMatchingProduct(variants, priceDetails) {
								// 	for (const product of priceDetails) {
								// 		const attributes = product.attributes.map(attr => attr.chaild_name);
								// 		console.log(product.attributes, 'product.attributesproduct.attributes');
								// 		if (variants.every(variant => attributes.includes(variant))) {
								// 			console.log('-----====-----');
								// 			return product;
								// 		}
								// 	}
								// 	return null;
								// }

								function findMatchingProduct(variants, priceDetails) {
									for (const product of priceDetails) {
										const attributeIds = product.attribute_ids.map(id => id.toString());
										if (variants.every(variant => attributeIds.includes(variant.chaild_id))) {
											return product;
										}
									}
									return null;
								}



								if (data && data.type_status == 0) {
									var condition = { user_id: userId, "cart_details": { $elemMatch: { "id": foodId, "size": data.size } } };
									console.log(condition, 'sssszxcondition');
									const doc = await db.GetOneDocument(collection, condition, {}, {})
									console.log(doc, 'c');
									if (doc.status) {
										var quantityCond = 0;
										// console.log('-------------------------foodDetails.doc.price_details---------------');
										// console.log(foodDetails.doc.price_details, 'foodDetails.doc.price_details');
										// console.log('.....................................................................');
										// console.log('//////////////////////////data.variationsdata/////////////////////');
										// console.log(data.variations, 'data.variationsdata.variations');
										// console.log();
										const matchingProduct = findMatchingProduct(data.variations[0], foodDetails.doc.price_details);
										console.log(matchingProduct, 'matchingProduct123');
										var quantity = 0;

										console.log(cart.doc.cart_details[foodIndex].quantity, 'cart.doc.cart_details[foodIndex].quantity');
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
										if (matchingProduct != null && matchingProduct.quantity > 0 && quantity < matchingProduct.quantity) {
											quantityCond = 1;
										}
										console.log(quantityCond, 'quantityCond');
										// var quantityCond = 0;
										// var sizeArr = foodDetails.doc.quantity_size.filter(e => { return e.status == 1 && e.size == data.size && e.quantity >= cart.doc.cart_details[foodIndex].quantity });
										// if (sizeArr && sizeArr.length > 0) {
										// 	quantityCond = 1;
										// }
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
											const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
											console.log(update, '----------');
											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
											// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
											// 	socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
											// });
										} else {
											socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity8092.' });
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
												console.log(foods, 'fooods in socker');
												var condition = { user_id: userId };
												var updateDetails = { $push: { 'cart_details': foods } };
												socket.emit("r2e_change_cart_quantity", { err: 0, message: '', 'updateDetails': updateDetails });
											} else {
												socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity8122.' });
											}
										} else {
											socket.emit("r2e_change_cart_quantity", { err: 0, message: '', 'updateDetails': updateDetails });
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
									if (matchingProduct != null && matchingProduct.quantity > 0 && quantity < matchingProduct.quantity) {
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
										// var updateDetails = { "cart_details.$.size": data.size };
										var update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										console.log(update, 'update');

										// var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cart_id } } };

										if (update.status) {
											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										}
										// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
										// 	socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										// });
									} else {
										socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity8172.' });
									}
								}
								// if(foodDetails.quantity >= quantitys){

								// } else{
								// 	socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity.' });
								// }
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
										var condition = { user_id: userId, "cart_details": { $elemMatch: { "_id": cart_id } } };
										const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										if (update.status) {
											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										}
										// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
										// 	socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										// });
									} else {

										socket.emit("r2e_change_cart_quantity", { err: 1, message: 'This product is in below Quantity8217.' });
									}
								} else {
									if (cartLength > 1) {
										var updateDetails = { "$pull": { 'cart_details': { _id: { $in: [cart_id] } } } };
										var condition = { user_id: userId };
										const update = await db.UpdateDocument(collection, condition, updateDetails, { multi: true })
										if (update.status) {
											socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										}
										// db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
										// 	socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										// });
									} else {
										var condition = { user_id: userId };
										await db.DeleteDocument(collection, condition)
										socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										// db.DeleteDocument(collection, condition, function (err, res) {
										// 	socket.emit("r2e_change_cart_quantity", { err: 0, message: 'Sucessfully Cart Updated.' });
										// });
									}
								}
							}

						} else {
							socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Product Not Found.' });

						}
					}
				}
			}




			// db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
			// 	if (err) {
			// 		socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Unable to fetch data.' });
			// 	} else {
			// 		var is_food_available = 0;
			// 		var is_cart_available = 0;
			// 		var foodIndex = -1;
			// 		var cartLength = -1;
			// 		if (cart && typeof cart._id != 'undefined') {
			// 			is_cart_available = 1;
			// 			if (typeof cart.cart_details != 'undefined') {
			// 				cartLength = cart.cart_details.length;
			// 				foodIndex = cart.cart_details.map(function (e) { return e._id.toString(); }).indexOf(cart_id.toString());
			// 				if (foodIndex != -1) {
			// 					is_food_available = 1;
			// 				}
			// 			}
			// 			// if (typeof cart.city_id != 'undefined' && cart.city_id.toString() == cityid.toString()) {
			// 			// 	if (typeof cart.cart_details != 'undefined') {
			// 			// 		cartLength = cart.cart_details.length;
			// 			// 		foodIndex = cart.cart_details.map(function (e) { return e._id.toString(); }).indexOf(cart_id.toString());
			// 			// 		if (foodIndex != -1) {
			// 			// 			is_food_available = 1;
			// 			// 		}
			// 			// 	}
			// 			// } else {
			// 			// 	socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Already cart has another city.' });
			// 			// 	return;

			// 			// }
			// 		} else {
			// 			socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Cart Details Not Found.' });
			// 			return;
			// 		}
			// 		if (is_food_available == 0 || foodIndex == -1 || cartLength == -1) {
			// 			socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Product Not Found.' });
			// 			return;
			// 		} else {
			// 			var condition = { _id: foodId, status: 1 };
			// 			// db.GetOneDocument('food', condition, {}, {}, function (err, foodDetails) {
			// 			// 	if (err) {
			// 			// 		socket.emit("r2e_change_cart_quantity", { err: 2, message: 'Unable to fetch data.' });
			// 			// 	} 
			// 			// })
			// 		}

			// 	}
			// });
		});






		socket.on('r2e_get_user_details', async function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_get_user_details', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_get_user_details", { err: 1, message: 'Invalid userId' });
				return;
			}
			const settings = await db.GetOneDocument('settings', { alias: 'rewards' }, {}, {})
			const userDetails = await db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, first_name: 1, username: 1, last_name: 1, phone: 1, gender: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1, reached_points: 1, mark_status: 1, current_points: 1, next_points: 1, start_time: 1, avatar: 1, sample_email: 1 }, {})
			console.log(userDetails, 'this is the user details from user details');
			if (userDetails.status === false) {
				socket.emit("r2e_get_user_details", { err: 1, message: 'Error in user..!' });
			} else {
				if (settings.doc && settings.doc.settings && settings.doc.settings.days && settings.doc.settings.days > 0 && userDetails.doc.start_time > 0) {
					userDetails.doc.start_time = userDetails.doc.start_time + (settings.doc.settings.days * 86400000);
					if (userDetails.doc.start_time < Date.now()) {
						console.log("hi from the user details");
						userDetails.doc.start_time = 0;
						userDetails.doc.reached_points = 0;
						userDetails.doc.mark_status = 0;
						userDetails.doc.current_points = 0;
						userDetails.doc.next_points = 0;
						try {
							const updated = await db.UpdateDocument('users', { _id: userId }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {})
							console.log(updated, 'this is the update from the userdetails');
						} catch (err) {
							console.log(err, 'this is error');
						}

						// db.UpdateDocument('users', { _id: userId }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {}, (err, update) => { });
					}
				}
				if (userDetails.doc && typeof userDetails.doc != 'undefined') {
					socket.emit("r2e_get_user_details", { err: 0, message: '', userDetails: userDetails.doc });
				} else {
					socket.emit("r2e_get_user_details", { err: 1, message: 'Error in user..!' });
				}
			}
			// db.GetOneDocument('settings', { alias: 'rewards' }, {}, {}, (err, settings) => {
			// 	db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, { email: 1, first_name: 1, username: 1, last_name: 1, phone: 1, gender: 1, location: 1, user_type: 1, role: 1, avatar: 1, card_details: 1, reached_points: 1, mark_status: 1, current_points: 1, next_points: 1, start_time: 1, avatar: 1, sample_email: 1}, {}, function (err, userDetails) {
			// 		if (err || !userDetails) {
			// 			socket.emit("r2e_get_user_details", { err: 1, message: 'Error in user..!' });
			// 		} else {
			// 			if (settings && settings.settings && settings.settings.days && settings.settings.days > 0 && userDetails.start_time > 0) {
			// 				userDetails.start_time = userDetails.start_time + (settings.settings.days * 86400000);
			// 				if (userDetails.start_time < Date.now()) {
			// 					userDetails.start_time = 0;
			// 					userDetails.reached_points = 0;
			// 					userDetails.mark_status = 0;
			// 					userDetails.current_points = 0;
			// 					userDetails.next_points = 0;
			// 					db.UpdateDocument('users', { _id: userId }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {}, (err, update) => { });
			// 				}
			// 			}
			// 			if (userDetails && typeof userDetails != 'undefined') {
			// 				socket.emit("r2e_get_user_details", { err: 0, message: '', userDetails: userDetails });
			// 			} else {
			// 				socket.emit("r2e_get_user_details", { err: 1, message: 'Error in user..!' });
			// 			}
			// 		}
			// 	})
			// })
		});
		socket.on('update_temp_vist', function (data) {
			var userId;
			if (typeof data.userId == 'undefined' && data.userId == '') {
				socket.emit('update_temp_vist', { err: 1, message: 'Invalid userId' });
				return;
			}
			if (typeof data.user_id == 'undefined' && data.user_id == '') {
				socket.emit('update_temp_vist', { err: 1, message: 'Invalid userId' });
				return;
			}
			db.GetDocument('recent_temp_visit', { user_id: data.user_id }, {}, {}, (error, docData) => {
				if (error) {
					socket.emit("update_temp_vist", { err: 1, message: 'Error in recent_temp_visit..!' });
				} else {
					if (docData && docData.length > 0) {
						syncEach(docData, (value, next) => {
							var obj = {
								user_id: data.userId,
								product_id: value.product_id
							}
							db.GetOneDocument('recently_visit', { user_id: data.userId }, {}, {}, (error, docDet) => {
								if (error) {
									process.nextTick(next)
								} else {
									if (!docDet) {
										db.InsertDocument('recently_visit', obj, (err, result) => {
											delete obj.user_id
											delete obj.product_id
											process.nextTick(next)
										})
									} else {
										process.nextTick(next)
									}
								}
							})
						}, (error, result) => {
							socket.emit("update_temp_vist", { err: 0, message: 'Successfully updated..!' });
						})
					} else {
						socket.emit("update_temp_vist", { err: 1, message: 'Empty recent_temp_visit..!' });
					}
				}

			})
		});
		socket.on('tempcart_to_cart', async function (data) {
			var userId;
			if (typeof data.userId == 'undefined' && data.userId == '') {
				socket.emit('tempcart_to_cart', { err: 1, message: 'Invalid userId' });
				return;
			}
			if (typeof data.user_id == 'undefined' && data.user_id == '') {
				socket.emit('tempcart_to_cart', { err: 1, message: 'Invalid userId' });
				return;
			}
			var docData = await db.GetOneDocument('temp_cart', { user_id: data.user_id }, {}, { createdAt: -1 })
			console.log(docData.doc, 'docData');
			if (docData.status) {
				var obj = {
					user_id: data.userId,
					cart_details: docData.doc.cart_details
				}
				console.log(obj, "objobj")
				var cartDoc = await db.GetOneDocument('cart', { user_id: data.userId, type_status: 0 }, {}, {})
				if (!cartDoc.status) {
					var insrtDoct = await db.InsertDocument('cart', obj)
					console.log(insrtDoct, "insrtDoctinsrtDoct");

					if (!insrtDoct) {
						socket.emit("tempcart_to_cart", { err: 1, message: 'Empty tempcart_to_cart..!' });
					} else {
						db.DeleteDocument('temp_cart', { user_id: data.user_id }, (err, result) => { })
						socket.emit("tempcart_to_cart", { err: 0, message: 'Successfully updated..!' });
					}
				} else {
					syncEach(docData.doc.cart_details, async (value, next) => {
						console.log(docData.doc.cart_details, 'docData.doc.cart_details');
						console.log(cartDoc, 'cartDoc');
						if (cartDoc) {
							let index_pos = cartDoc.doc.cart_details.findIndex(e => e.id.toString() == value.id.toString());
							console.log(index_pos, 'index_pos');
							if (index_pos == -1) {
								console.log('oooooooo');
								var foods = {
									id: value.id,
									psprice: value.psprice,
									mprice: value.mprice,
									quantity: value.quantity,
									rcat_id: value.rcat_id,
									scat_id: value.scat_id,
									size_status: value.size_status,
									size: value.size,
									image: value.image,
									variations:value.variations
								}
								var condition = { user_id: data.userId, type_status: 0 };
								var updateDetails = { $push: { 'cart_details': foods } };
								var res = await db.UpdateDocument('cart', condition, updateDetails, { multi: true })
								// , function (err, res) {
								next();
								// socket.emit("r2e_add_to_cart", { err: 0, message: '', 'updateDetails': updateDetails });
								// });
							} else {
								next();
							}
						} else {
							next();
						}
					}, (error, result) => {
						db.DeleteDocument('temp_cart', { user_id: data.user_id }, (err, result) => { });
						socket.emit("tempcart_to_cart", { err: 0, message: 'Empty tempcart_to_cart..!' });
					})
				}
			} else {
				socket.emit("tempcart_to_cart", { err: 1, message: 'Empty tempcart_to_cart..!' });
			}
		});

		socket.on('tempfav_to_fav', async function (data) {
			var userId;
			console.log(data,'broooooooooooooooooooooooooooooooooo is this dataaaaaaaaaaaaaaaaaaaaaaaa');
			
			if (typeof data.userId == 'undefined' && data.userId == '') {
				socket.emit('tempfav_to_fav', { err: 1, message: 'Invalid userId' });
				return;
			}
			if (typeof data.user_id == 'undefined' && data.user_id == '') {
				socket.emit('tempfav_to_fav', { err: 1, message: 'Invalid userId' });
				return;
			}
			var docData = await db.GetDocument('temp_favourite', { user_id: data.user_id }, {}, { createdAt: -1 })
			var docDataFav = await db.GetDocument('favourite', { user_id: data.userId }, {}, { createdAt: -1 })


			console.log(docData.doc, 'docData');
			const tempProducts = Array.isArray(docData.doc) && docData.doc.length > 0
			? docData.doc.map(el => el.product_id)
			: [];
		  
			const actualCart = Array.isArray(docDataFav.doc) && docDataFav.doc.length > 0
			? docDataFav.doc.map(el => el.product_id)
			: [];
			console.log(tempProducts, 'docData');
			console.log(actualCart, 'docData');
		  
			if (docData.status) {
				let uniqueElements = tempProducts.filter(element => !actualCart.includes(element));
				console.log(uniqueElements, 'uniqueElements');

				// Create the new array of objects with user_id and product_id
				let productArray = uniqueElements.map(productId => ({ user_id: data.userId, product_id: productId,status:1 }));
				console.log(productArray,'productArray');
				
				var insrtDoct = await db.InsertDocument('favourite', productArray)

const deleteTempFav= await db.DeleteDocument('temp_favourite',{ user_id: data.user_id })
socket.emit("tempfav_to_fav", { err: 0, message: 'Successfully updated..!' });

			} else {
				socket.emit("tempfav_to_fav", { err: 1, message: 'Empty tempcart_to_cart..!' });
			}
		});

		socket.on('update_to_cart', async function (data) {

			var userId;
			if (typeof data.product_id == 'undefined' && data.product_id == '') {
				socket.emit('update_to_cart', { err: 1, message: 'Invalid product id' });
				return;
			}
			if (typeof data.user_id == 'undefined' && data.user_id == '') {
				socket.emit('update_to_cart', { err: 1, message: 'Invalid userId' });
				return;
			}
			const cartDoc = await db.GetOneDocument('cart', { user_id: new mongoose.Types.ObjectId(data.user_id) }, {}, {})
			if (cartDoc.status === false) {
				socket.emit("update_to_cart", { err: 1, message: 'Error in cart..!' });

			} else {
				var updateDetails = { "$pull": { 'cart_details': { id: data.product_id } } };
				var condition = { user_id: new mongoose.Types.ObjectId(data.user_id) };
				const res = await db.UpdateDocument('cart', condition, updateDetails, { multi: true })
				const doc = await db.GetOneDocument('cart', { user_id: new mongoose.Types.ObjectId(data.user_id), type_status: 0, cart_details: { $in: [null, []] } }, {}, {})
				console.log("testing for ubasdfjasdfoiewfds");
				console.log(doc)
				if (doc.status === false) {
					socket.emit("update_to_cart", { err: 0, message: 'Sucessfully Cart Updated.' });
				} else {
					await db.DeleteDocument('cart', { user_id: data.user_id, type_status: 0 });
					socket.emit("update_to_cart", { err: 0, message: 'Sucessfully Cart Updated.' });
				}
				// db.UpdateDocument('cart', condition, updateDetails, { multi: true }, function (err, res) {
				// 	db.GetOneDocument('cart', { user_id:new mongoose.Types.ObjectId(data.user_id), type_status: 0, cart_details: { $in: [null, []] } }, {}, {}, (error, doc) => {
				// 		if (doc) {
				// 			db.DeleteDocument('cart', { user_id: data.user_id, type_status: 0 }, (err, result) => { });
				// 			socket.emit("update_to_cart", { err: 0, message: 'Sucessfully Cart Updated.' });
				// 		} else {
				// 			socket.emit("update_to_cart", { err: 0, message: 'Sucessfully Cart Updated.' });
				// 		}
				// 	})
				// });
			}
			// db.GetOneDocument('cart', { user_id: mongoose.Types.ObjectId(data.user_id) }, {}, {}, (error, cartDoc) => {
			// 	if (error) {
			// 		socket.emit("update_to_cart", { err: 1, message: 'Error in cart..!' });
			// 	} else {
			// 		var updateDetails = { "$pull": { 'cart_details': { id: { $in: [mongoose.Types.ObjectId(data.product_id)] } } } };
			// 		var condition = { user_id: mongoose.Types.ObjectId(data.user_id) };
			// 		db.UpdateDocument('cart', condition, updateDetails, { multi: true }, function (err, res) {
			// 			db.GetOneDocument('cart', { user_id: mongoose.Types.ObjectId(data.user_id), type_status: 0, cart_details: { $in: [null, []] } }, {}, {}, (error, doc) => {
			// 				if (doc) {
			// 					db.DeleteDocument('cart', { user_id: data.user_id, type_status: 0 }, (err, result) => { });
			// 					socket.emit("update_to_cart", { err: 0, message: 'Sucessfully Cart Updated.' });
			// 				} else {
			// 					socket.emit("update_to_cart", { err: 0, message: 'Sucessfully Cart Updated.' });
			// 				}
			// 			})
			// 		});
			// 	}
			// })
		});


		socket.on('r2e_apply_coupon', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_apply_coupon', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_apply_coupon", { err: 1, message: 'Invalid userId' });
				return;
			}
			var restaurantId;
			// if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
			// 	if (isObjectId(data.restaurantId)) {
			// 		restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
			// 	} else {
			// 		socket.emit('r2e_apply_coupon', { err: 1, message: 'Invalid restaurantId' });
			// 		return;
			// 	}
			// } else {
			// 	socket.emit("r2e_apply_coupon", { err: 1, message: 'Invalid restaurantId' });
			// 	return;
			// }
			var code;
			if (typeof data.code != 'undefined' && data.code != '') {
				code = data.code;
			} else {
				socket.emit("r2e_apply_coupon", { err: 1, message: 'Invalid code' });
				return;
			}
			var date = new Date();
			var isodate = date.toISOString();
			var collection = 'cart';
			//var condition = { user_id: userId, restaurant_id: restaurantId };
			var condition = { user_id: userId };
			db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
				if (!cart) {
					socket.emit("r2e_apply_coupon", { err: 1, message: 'Unable to fetch data.' });
				} else {
					if (cart && typeof cart._id != 'undefined') {
						db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
							if (userErr || !userRespo) {
								socket.emit("r2e_apply_coupon", { err: 1, message: "Invalid user, Please check your data..!" });
							} else {
								db.GetOneDocument('coupon', { status: { $eq: 1 }, code: code }, {}, {}, function (err, coupondata) {
									if (err || !coupondata) {
										socket.emit("r2e_apply_coupon", { err: 1, message: "Sorry invalid Coupon..!" });
									} else {

										if ((typeof coupondata.coupon_type != 'undefined' && coupondata.coupon_type == 'admin') || (typeof coupondata.coupon_type != 'undefined' && coupondata.coupon_type == 'restaurant')) {
											var query;
											if (coupondata.coupon_type == 'admin') {
												query = { status: { $eq: 1 }, code: code, "expiry_date": { "$gte": isodate }, "valid_from": { "$lte": isodate } }
											}
											// else if (coupondata.coupon_type == 'restaurant') {
											// 	query = { 'restaurant': { $in: [restaurantId] }, status: { $ne: 0 }, code: code, "expiry_date": { "$gte": isodate }, "valid_from": { "$lte": isodate } }
											// }
											db.GetOneDocument('coupon', query, {}, {}, function (err, coupon) {
												if (err || !coupon) {
													//if (coupondata.coupon_type == 'restaurant') {
													// 	var restaurantIndex = coupondata.restaurant.map(function (e) { return e.toString(); }).indexOf(restaurantId.toString());
													// 	if (restaurantIndex != -1) {
													// 		socket.emit("r2e_apply_coupon", { err: 1, message: "Sorry coupon code expired..!" });
													// 	} else {
													// 		socket.emit("r2e_apply_coupon", { err: 1, message: "Sorry invalid Coupon..!" });
													// 	}
													// } else {
													socket.emit("r2e_apply_coupon", { err: 1, message: "Sorry coupon code expired..!" });
													//}
												} else {
													db.GetCount('orders', { 'user_id': userId, 'coupon_code': code }, function (orderErr, orderRespo) {
														if (orderErr) {
															socket.emit("r2e_apply_coupon", { err: 1, message: "Errors in orders..!" });
														} else {

															var usage = 0;
															if (orderRespo > 0) { usage = parseInt(orderRespo); }
															db.GetOneDocument('coupon', { status: { $eq: 1 }, code: code, 'usage.per_user': { '$gt': usage }, 'usage.total_coupons': { '$gte': 1 } }, {}, {}, function (err, usagelimit) {

																if (err || !usagelimit) {
																	socket.emit("r2e_apply_coupon", { err: 1, message: "Sorry coupon code limit exceeded..!" });
																} else {

																	//var condition = { user_id: userId, restaurant_id: restaurantId };
																	var condition = { user_id: userId };
																	var updateDetails = { 'coupon_code': code, 'discount_type': usagelimit.discount_type, 'coupon_discount': usagelimit.amount_percentage };
																	db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
																	});
																	socket.emit("r2e_apply_coupon", { err: 0, message: "Successfully Coupon Applied." });
																}
															})
														}
													})

												}
											})
										} else {
											socket.emit("r2e_apply_coupon", { err: 1, message: "Sorry invalid Coupon..!" });
										}
									}
								})
							}
						});
					} else {
						socket.emit("r2e_apply_coupon", { err: 1, message: 'Unable to fetch data.' });
					}
				}
			});
		});
		socket.on('r2e_remove_coupon', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('r2e_remove_coupon', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("r2e_remove_coupon", { err: 1, message: 'Invalid userId' });
				return;
			}
			// var restaurantId;
			// if (typeof data.restaurantId != 'undefined' && data.restaurantId != '') {
			// 	if (isObjectId(data.restaurantId)) {
			// 		restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
			// 	} else {
			// 		socket.emit('r2e_remove_coupon', { err: 1, message: 'Invalid restaurantId' });
			// 		return;
			// 	}
			// } else {
			// 	socket.emit("r2e_remove_coupon", { err: 1, message: 'Invalid restaurantId' });
			// 	return;
			// }
			var date = new Date();
			var isodate = date.toISOString();
			var collection = 'cart';
			//var condition = { user_id: userId, restaurant_id: restaurantId };
			var condition = { user_id: userId };
			db.GetOneDocument(collection, condition, {}, {}, function (err, cart) {
				if (err || !cart) {
					socket.emit("r2e_remove_coupon", { err: 1, message: 'Unable to fetch data.' });
				} else {
					if (cart && typeof cart._id != 'undefined') {
						db.GetOneDocument('users', { _id: userId, status: { $eq: 1 } }, {}, {}, function (userErr, userRespo) {
							if (userErr || !userRespo) {
								socket.emit("r2e_remove_coupon", { err: 1, message: "Invalid user, Please check your data..!" });
							} else {
								//var condition = { user_id: userId, restaurant_id: restaurantId };
								var condition = { user_id: userId };
								var updateDetails = { 'coupon_code': '', 'discount_type': '', 'coupon_discount': 0 };
								db.UpdateDocument(collection, condition, updateDetails, { multi: true }, function (err, res) {
								});
								socket.emit("r2e_remove_coupon", { err: 0, message: "Successfully Coupon Removed." });
							}
						});
					} else {
						socket.emit("r2e_remove_coupon", { err: 1, message: 'Unable to fetch data.' });
					}
				}
			});
		});


		socket.on('r2e_send_otp', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("r2e_send_otp", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("r2e_send_otp", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			var first_name;
			if (typeof data.first_name != 'undefined' && data.first_name != '') {
				first_name = data.first_name;
			} else {
				socket.emit("r2e_send_otp", { err: 1, message: 'Invalid first_name' });
				return;
			}
			var email;
			if (typeof data.email != 'undefined' && data.email != '') {
				email = data.email.toLowerCase();
			} else {
				socket.emit("r2e_send_otp", { err: 1, message: 'Invalid email' });
				return;
			}
			db.GetDocument('users', { "phone.code": data.country_code, "phone.number": data.phone_number }, {}, {}, function (err, phonedocs) {
				if (err) {
					socket.emit("r2e_send_otp", { err: 1, message: 'Something Went Wrong..!' });
				} else {
					if (phonedocs.length != 0) { socket.emit("r2e_send_otp", { err: 1, message: 'Phone Number already exists.' }); }
					else {
						db.GetDocument('users', { email: data.email.toLowerCase() }, {}, {}, function (err, emaildocs) {
							if (err) {
								socket.emit("r2e_send_otp", { err: 1, message: 'Something Went Wrong..!' });
							} else {
								if (emaildocs.length != 0) { socket.emit("r2e_send_otp", { err: 1, message: 'Email Id already exists.' }); }
								else {
									db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
										if (err || !settings) {
											socket.emit("r2e_send_otp", { err: 1, message: 'Configure your website settings' });
										} else {
											db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
												if (err) {
													socket.emit("r2e_send_otp", { err: 1, message: 'Something Went Wrong..!' });
												} else {
													var crypto = require('crypto');
													var otp = require('otplib/authenticator');
													otp.options = { crypto };
													var secret = otp.generateSecret();
													var otp_string = otp.generate(secret);
													var pass_code = otp_string.slice(0, 4);
													var to = country_code + phone_number;
													var message = 'Dear ' + first_name + '! your one time pass code is ' + pass_code;
													var otp_status = "development";
													var mode = 0;
													if (smssettings.settings.twilio.mode == 'production') {
														mode = 1;
														otp_status = "production";
														twilio.createMessage(to, '', message, function (err, response) {

														});
													}
													socket.emit("r2e_send_otp", { err: 0, message: 'Successfully Sent Otp', otp_status: otp_status, otp: pass_code, mode: mode });
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
		});
		socket.on('r2e_send_otp_for_forget_password', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("r2e_send_otp_for_forget_password", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("r2e_send_otp_for_forget_password", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			db.GetOneDocument('users', { $or: [{ "phone.code": data.country_code, "phone.number": data.phone_number }] }, {}, {}, function (err, users) {
				if (err) {
					socket.emit("r2e_send_otp_for_forget_password", { err: 1, message: 'Something Went Wrong..!' });
				} else {
					if (!users || typeof users == 'undefined' || (typeof users != 'undefined' && typeof users._id == 'undefined')) {
						socket.emit("r2e_send_otp_for_forget_password", { err: 1, message: 'user not registered' });
					} else {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) {
								socket.emit("r2e_send_otp_for_forget_password", { err: 1, message: 'Configure your website settings' });
							} else {
								db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
									if (err) {
										socket.emit("r2e_send_otp_for_forget_password", { err: 1, message: 'Something Went Wrong..!' });
									} else {
										var crypto = require('crypto');
										var otp = require('otplib/authenticator');
										otp.options = { crypto };
										var secret = otp.generateSecret();
										var otp_string = otp.generate(secret);
										var pass_code = otp_string.slice(0, 4);
										var to = country_code + phone_number;
										var message = 'Dear ' + to + '! your one time pass code is ' + pass_code;
										var otp_status = "development";
										if (smssettings.settings.twilio.mode == 'production') {
											otp_status = "production";
											twilio.createMessage(to, '', message, function (err, response) {

											});
										}
										var updateDetails = { otp: pass_code, otp_verification: { otp_time: Date.now() } };
										db.UpdateDocument('users', { _id: users._id }, updateDetails, { multi: true }, function (err, res) {
										});
										socket.emit("r2e_send_otp_for_forget_password", { err: 0, message: 'Successfully Sent Otp', otp_status: otp_status, otp: pass_code });
									}
								})
							}
						})
					}
				}
			})
		});
		socket.on('r2e_resend_otp_for_login', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("r2e_resend_otp_for_login", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("r2e_resend_otp_for_login", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			db.GetOneDocument('users', { $or: [{ "phone.code": data.country_code, "phone.number": data.phone_number }] }, {}, {}, function (err, users) {
				if (err) {
					socket.emit("r2e_resend_otp_for_login", { err: 1, message: 'Something Went Wrong..!' });
				} else {
					if (!users || typeof users == 'undefined' || (typeof users != 'undefined' && typeof users._id == 'undefined')) {
						socket.emit("r2e_resend_otp_for_login", { err: 1, message: 'user not registered' });
					} else {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) {
								socket.emit("r2e_resend_otp_for_login", { err: 1, message: 'Configure your website settings' });
							} else {
								db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
									if (err) {
										socket.emit("r2e_resend_otp_for_login", { err: 1, message: 'Something Went Wrong..!' });
									} else {
										var crypto = require('crypto');
										var otp = require('otplib/authenticator');
										otp.options = { crypto };
										var secret = otp.generateSecret();
										var otp_string = otp.generate(secret);
										var pass_code = otp_string.slice(0, 4);
										var to = country_code + phone_number;
										var message = 'Dear ' + to + '! your one time pass code is ' + pass_code;
										var otp_status = "development";
										var mode = 0;
										if (smssettings.settings.twilio.mode == 'production') {
											otp_status = "production";
											mode = 1;
											twilio.createMessage(to, '', message, function (err, response) { });
										}
										var updateDetails = { verify_otp: pass_code };
										db.UpdateDocument('users', { _id: users._id }, updateDetails, {}, function (err, res) { });
										socket.emit("r2e_resend_otp_for_login", { err: 0, message: 'Successfully Sent Otp', otp_status: otp_status, otp: pass_code, mode: mode });
									}
								})
							}
						})
					}
				}
			})
		});
		socket.on('r2e_resend_otp_for_register', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("r2e_resend_otp_for_register", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("r2e_resend_otp_for_register", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_resend_otp_for_register", { err: 1, message: 'Configure your website settings' });
				} else {
					db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
						if (err) {
							socket.emit("r2e_resend_otp_for_register", { err: 1, message: 'Something Went Wrong..!' });
						} else {
							var crypto = require('crypto');
							var otp = require('otplib/authenticator');
							otp.options = { crypto };
							var secret = otp.generateSecret();
							var otp_string = otp.generate(secret);
							var pass_code = otp_string.slice(0, 4);
							var to = country_code + phone_number;
							var message = 'Dear ' + to + '! your one time pass code is ' + pass_code;
							var otp_status = "development";
							var mode = 0;
							if (smssettings.settings.twilio.mode == 'production') {
								otp_status = "production";
								mode = 1;
								twilio.createMessage(to, '', message, function (err, response) {

								});
							}
							socket.emit("r2e_resend_otp_for_register", { err: 0, message: 'Successfully Sent Otp', otp_status: otp_status, otp: pass_code, mode: mode });
						}
					})
				}
			})
		});
		socket.on('r2e_resend_otp_for_driver_login', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("r2e_resend_otp_for_driver_login", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("r2e_resend_otp_for_driver_login", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			db.GetOneDocument('drivers', { $or: [{ "phone.code": data.country_code, "phone.number": data.phone_number }] }, {}, {}, function (err, drivers) {
				if (err) {
					socket.emit("r2e_resend_otp_for_driver_login", { err: 1, message: 'Something Went Wrong..!' });
				} else {
					if (!drivers || typeof drivers == 'undefined' || (typeof drivers != 'undefined' && typeof drivers._id == 'undefined')) {
						socket.emit("r2e_resend_otp_for_driver_login", { err: 1, message: 'user not registered' });
					} else {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) {
								socket.emit("r2e_resend_otp_for_driver_login", { err: 1, message: 'Configure your website settings' });
							} else {
								db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
									if (err) {
										socket.emit("r2e_resend_otp_for_driver_login", { err: 1, message: 'Something Went Wrong..!' });
									} else {
										var crypto = require('crypto');
										var otp = require('otplib/authenticator');
										otp.options = { crypto };
										var secret = otp.generateSecret();
										var otp_string = otp.generate(secret);
										var pass_code = otp_string.slice(0, 4);
										var to = country_code + phone_number;
										var message = 'Dear ' + to + '! your one time pass code is ' + pass_code;
										var otp_status = "development";
										var mode = 0;
										if (smssettings.settings.twilio.mode == 'production') {
											otp_status = "production";
											mode = 1;
											twilio.createMessage(to, '', message, function (err, response) { });
										}
										var updateDetails = { verify_otp: pass_code };
										db.UpdateDocument('drivers', { _id: drivers._id }, updateDetails, {}, function (err, res) { });
										socket.emit("r2e_resend_otp_for_driver_login", { err: 0, message: 'Successfully Sent Otp', otp_status: otp_status, otp: pass_code, mode: mode });
									}
								})
							}
						})
					}
				}
			})
		});
		socket.on('otp_verification', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("otp_verification", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("otp_verification", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			var otp;
			if (typeof data.otp != 'undefined' && data.otp != '') {
				otp = data.otp;
			} else {
				socket.emit("otp_verification", { err: 1, message: 'Invalid otp' });
				return;
			}
			db.GetOneDocument('users', { $or: [{ "phone.code": data.country_code, "phone.number": data.phone_number }] }, {}, {}, function (err, users) {
				if (err) {
					socket.emit("otp_verification", { err: 1, message: 'Something Went Wrong..!' });
				} else {
					if (!users || typeof users == 'undefined' || (typeof users != 'undefined' && typeof users._id == 'undefined')) {
						socket.emit("otp_verification", { err: 1, message: 'user not registered' });
					} else {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) {
								socket.emit("otp_verification", { err: 1, message: 'Configure your website settings' });
							} else {
								db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
									if (err) {
										socket.emit("otp_verification", { err: 1, message: 'Something Went Wrong..!' });
									} else {
										if (users.otp == otp) {
											var currentTime = Date.now();
											var expire = 60 * 1000; // 1 min
											if (typeof users.otp_verification != 'undefined' && typeof users.otp_verification.otp_time != 'undefined') {
												var diff = currentTime - parseInt(users.otp_verification.otp_time);
												if (diff < expire) {
													socket.emit("otp_verification", { err: 0, message: 'Successfully verified' });
												} else {
													socket.emit("otp_verification", { err: 1, message: 'Session expired.' });
												}
											}
										} else {
											socket.emit("otp_verification", { err: 1, message: 'Invalid OTP' });
										}

									}
								})
							}
						})
					}
				}
			})
		});
		socket.on('r2e_change_password', function (data) {
			var country_code;
			if (typeof data.country_code != 'undefined' && data.country_code != '') {
				country_code = data.country_code;
			} else {
				socket.emit("r2e_change_password", { err: 1, message: 'Invalid country_code' });
				return;
			}
			var phone_number;
			if (typeof data.phone_number != 'undefined' && data.phone_number != '') {
				phone_number = data.phone_number;
			} else {
				socket.emit("r2e_change_password", { err: 1, message: 'Invalid phone_number' });
				return;
			}
			var password;
			if (typeof data.password != 'undefined' && data.password != '') {
				password = data.password;
			} else {
				socket.emit("r2e_change_password", { err: 1, message: 'Invalid password' });
				return;
			}
			db.GetOneDocument('users', { $or: [{ "phone.code": data.country_code, "phone.number": data.phone_number }] }, {}, {}, function (err, users) {
				if (err) {
					socket.emit("r2e_change_password", { err: 1, message: 'Something Went Wrong..!' });
				} else {
					if (!users || typeof users == 'undefined' || (typeof users != 'undefined' && typeof users._id == 'undefined')) {
						socket.emit("r2e_change_password", { err: 1, message: 'user not registered' });
					} else {
						db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
							if (err || !settings) {
								socket.emit("r2e_change_password", { err: 1, message: 'Configure your website settings' });
							} else {
								db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smssettings) {
									if (err) {
										socket.emit("r2e_change_password", { err: 1, message: 'Something Went Wrong..!' });
									} else {
										var currentTime = Date.now();
										var expire = 3 * 60 * 1000; // 1 min
										if (typeof users.otp_verification != 'undefined' && typeof users.otp_verification.otp_time != 'undefined') {
											var diff = currentTime - parseInt(users.otp_verification.otp_time);
											if (diff < expire) {
												var new_password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
												var updateDetails = { password: new_password }
											};
											db.UpdateDocument('users', { _id: users._id }, updateDetails, { multi: true }, function (err, res) {
											});
											socket.emit("r2e_change_password", { err: 0, message: 'Successfully changed password.' });
										} else {
											socket.emit("r2e_change_password", { err: 1, message: 'Session expired.' });
										}
									}
								})
							}
						})
					}
				}
			})
		})

		socket.on('remove_user', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('remove_user', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("remove_user", { err: 1, message: 'Invalid userId' });
				return;
			}
			delete userdatas[userId];
			socket.leave(userId);
		});
		socket.on('create_user', function (data) {
			var userId;
			if (typeof data.userId != 'undefined' && data.userId != '') {
				if (isObjectId(data.userId)) {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else {
					socket.emit('create_user', { err: 1, message: 'Invalid userId' });
					return;
				}
			} else {
				socket.emit("create_user", { err: 1, message: 'Invalid userId' });
				return;
			}

			if (typeof userId != 'undefined') {
				if (userdatas.indexOf(userId) == -1) {
					userdatas.push(userId);

				}
			}
			socket.join(userId);
			socket.emit('user_created', data);
			socketusers[socket.id] = userId;
			db.GetOneDocument('users', { _id: userId, status: 1 }, { _id: 1 }, {}, function (err, currentUser) {
				if (err || !currentUser) {
					chat.in(data.userId).emit('r2e_user_logout', data);
				}
			});
		});
		socket.on('clear_site_cache', function (data) {
			socket.broadcast.emit('clear_site_cache', {});
		})
		socket.on('remove_driver', function (data) {
			var driverId;
			if (typeof data.driverId != 'undefined' && data.driverId != '') {
				if (isObjectId(data.driverId)) {
					driverId = new mongoose.Types.ObjectId(data.driverId);
				} else {
					socket.emit('remove_driver', { err: 1, message: 'Invalid driverId' });
					return;
				}
			} else {
				socket.emit("remove_driver", { err: 1, message: 'Invalid driverId' });
				return;
			}
			delete driverdatas[driverId];
			socket.leave(driverId);
		});
		socket.on('create_driver', function (data) {
			var driverId;
			if (typeof data.driverId != 'undefined' && data.driverId != '') {
				if (isObjectId(data.driverId)) {
					driverId = new mongoose.Types.ObjectId(data.driverId);
				} else {
					socket.emit('create_driver', { err: 1, message: 'Invalid driverId' });
					return;
				}
			} else {
				socket.emit("create_driver", { err: 1, message: 'Invalid driverId' });
				return;
			}
			if (typeof driverId != 'undefined') {
				if (driverdatas.indexOf(driverId) == -1) {
					driverdatas.push(driverId);
				}
			}
			socket.join(driverId);
			socket.emit('driver_created', data);
			socketdrivers[socket.id] = driverId;

			db.GetOneDocument('drivers', { _id: driverId }, { _id: 1, loginId: 1 }, {}, function (err, currentDriver) {
				if (err || !currentDriver) {
					data.loginId = Date.now();
					chat.in(data.driverId).emit('mobileLogout', data);
				} else {
					data.loginId = currentDriver.loginId;
					chat.in(data.driverId).emit('mobileLogout', data);
				}
			});
		});

		io.connectAsync = function (url, options) {
			return new Promise(function (resolve, reject) {
				var requestedId = library.randomString(12, '#');
				options.requestedId = requestedId;
				chat.in(options.requestDriver).emit(url, options)
				events.on(url, function (data, done) {
					if (options.requestedId == data.requestedId) {
						resolve(data);
					}
					done({ err: 0 });
				})
			});
		}
		socket.on('disconnect', function (data) {
			if (data) {
				if (data.user) {
					var room = data.user;
					delete chatRooms[room];
					socket.emit('disconnect', room);
					socket.leave(room);
				}
			}
		});
		socket.on('r2e_get_nearest_driver', function (data) {
			var filters = '';
			var searchs = '';
			var offer = false;
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}
			var main_city = [];
			var sub_city = [];
			var start_time;
			var end_time;
			var sort = { 'drivers.distance': 1 };
			if (typeof data.filters != 'undefined' && data.filters != '') {
				filters = data.filters;
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
									if (option[0] == 'q') {
										if (values.length > 0) {
											searchs = values[0];
										}
									}
									if (option[0] == 'o') {
										if (values.length > 0) {
											sort = {};
											sort[values[0]] = parseInt(values[1]);
										}
									}

								}
							}
						}

					}
				}
			}
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Invalid lat' });
				return;
			}

			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Invalid long' });
				return;
			}
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_get_nearest_driver', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var cityname;
			if (typeof data.cityname != 'undefined' && data.cityname != '') {
				cityname = data.cityname;
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Configure your app settings' });
				} else {
					db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
						if (err || !socialsettings) {
							socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Configure your app settings' });
						} else {
							var apiKey = socialsettings.settings.map_api.web_key;
							var temp_radius = settings.settings.radius || 20;
							var radius = parseInt(temp_radius);
							var current_time = Date.now();
							var thirty_sec_section = 45 * 1000;
							var before_thirty_sec = current_time - thirty_sec_section;
							var condition = { status: { $eq: 1 }, currentJob: { $lt: 2 }, currentStatus: { $eq: 1 }, last_update_time: { $gte: before_thirty_sec } };
							if (searchs != '') {
								condition['$or'] = [];
								var data = { "username": { $regex: searchs + '.*', $options: 'si' } };
								condition['$or'].push(data);
								var data = { "phone.code": { $regex: searchs + '.*', $options: 'si' } };
								condition['$or'].push(data);
								var data = { "phone.number": { $regex: searchs + '.*', $options: 'si' } };
								condition['$or'].push(data);
								var data = { "email": { $regex: searchs + '.*', $options: 'si' } };
								condition['$or'].push(data);
							}
							var aggregationdata = [
								// {
								// 	"$geoNear": {
								// 		near: {
								// 			type: "Point",
								// 			coordinates: [parseFloat(lon), parseFloat(lat)]
								// 		},
								// 		distanceField: "distance",
								// 		includeLocs: "location",
								// 		query: condition,
								// 		distanceMultiplier: 0.001,
								// 		spherical: true
								// 	}
								// },
								{ "$match": { $and: [{ main_city: cityname }, { currentStatus: { $ne: 0 } }, { status: { $eq: 1 } }] } },
								//{ "$match": {currentStatus:{$eq:1}}},
								// {
								// 	"$redact": {
								// 		"$cond": {
								// 			"if": { "$lte": ["$distance", radius] },
								// 			"then": "$$KEEP",
								// 			"else": "$$PRUNE"
								// 		}
								// 	}
								// },
								{
									$project: {
										drivers: {
											_id: "$_id",
											"name": "$username",
											'sort_username': { $toLower: "$username" },
											"distance": "$distance",
											"status": "$status",
											"phone": "$phone",
											"address": "$address",
											"location": "$location",
											"currentStatus": "$currentStatus",
											"email": "$email",
											"avatar": "$avatar",
											"_id": "$_id",
											"last_update_time": "$last_update_time",
											"pickup_distance": { $literal: 30 },
											"deliver_distance": { $literal: 30 },
											"delivery_diff_distance": { $literal: 0 },
										}
									}
								},
								{
									$group: {
										_id: "null",
										"count": { $sum: 1 },
										'drivers': { $push: "$drivers" }
									}
								},
								{ $unwind: { path: "$drivers", preserveNullAndEmptyArrays: true } },
								{ $sort: sort },
								{ '$skip': parseInt(skip) },
								{ '$limit': parseInt(limit) }];
							data = { $group: { _id: null, count: { $first: '$count' }, drivers: { $push: "$drivers" } } };
							aggregationdata.push(data);

							db.GetAggregation('drivers', aggregationdata, function (err, driversDetails) {

								if (typeof driversDetails != 'undefined' && driversDetails.length > 0 && typeof driversDetails[0].drivers != 'undefined') {

									db.GetOneDocument('orders', { '_id': orderId, status: { '$eq': 3 } }, {}, {}, function (err, orderDetails) {
										if (typeof orderDetails != 'undefined' && typeof orderDetails._id != 'undefined' && typeof orderDetails.city_id != 'undefined' && typeof orderDetails.user_id != 'undefined') {

											db.GetOneDocument('city', { _id: orderDetails.city_id, status: 1 }, { _id: 1, address: 1, location: 1, cityname: 1 }, {}, function (err, restaurant) {

												if (err || !restaurant) {
													socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Invalid restaurant, Please check your data', driversDetails: [], count: 0 });
												} else {
													db.GetOneDocument('users', { _id: orderDetails.user_id, status: 1 }, { _id: 1, username: 1, location: 1 }, {}, function (userErr, userRespo) {
														if (userErr || !userRespo) {
															socket.emit("r2e_get_nearest_driver", { err: 1, message: 'Invalid user, Please check your data', driversDetails: [], count: 0 });
														} else {
															var distance = require('google-distance-matrix');
															distance.key(apiKey);
															distance.units('imperial');
															var each = require('async-each-series');
															if (driversDetails[0].drivers.length > 0) {
																each(driversDetails[0].drivers, function (driver, next) {
																	db.GetOneDocument('orders', { driver_id: driver._id, status: { '$in': [5, 6] } }, {}, {}, function (err, driverorder) {
																		if (driverorder && typeof driverorder != 'undefined' && typeof driverorder._id != 'undefined' && typeof driverorder.user_id != 'undefined') {
																			let origins1 = [`${driverorder.location.lat},${driverorder.location.lng}`];
																			let destinations1 = [`${orderDetails.location.lat},${orderDetails.location.lng}`];
																			distance.matrix(origins1, destinations1, function (err, distances) {
																				if (distances.status == 'OK') {
																					if (distances.rows[0].elements[0].status == 'OK') {
																						var distance = distances.rows[0].elements[0].distance.text;
																						driver.delivery_diff_distance = distance;
																						next()
																					} else {
																						next()
																					}
																				} else {
																					next()
																				}
																			});
																		} else {
																			next()
																		}
																		/* if (typeof driver.location != 'undefined' && typeof driver.location.lat != 'undefined' && typeof driver.location.lng != 'undefined') {
																			var origins = [driver.location.lat + ',' + driver.location.lng.toString()];
																			var destinations = [];
																			var latlong = restaurant.location.lat.toString() + ',' + restaurant.location.lng.toString();
																			destinations.push(latlong)
																			var latlong = orderDetails.location.lat.toString() + ',' + orderDetails.location.lng.toString();
																			destinations.push(latlong)
																			if (destinations.length > 0) {
																				distance.matrix(origins, destinations, function (err, distances) {
																					if (distances.status == 'OK') {
																						for (var i = 0; i < origins.length; i++) {
																							for (var j = 0; j < destinations.length; j++) {
																								if (distances.rows[0].elements[j].status == 'OK') {
																									if (j == 0) {
																										console.log('000ss',distances.rows[i].elements[j])
																										var distance = distances.rows[i].elements[j].distance.text;
																										driver.pickup_distance = distance;
																									}
																									if (j == 1) {
																										console.log('111s',distances.rows[i].elements[j])
																										var distance = distances.rows[i].elements[j].distance.text;
																										driver.deliver_distance = distance;
																									}
																								}
																							}
																						}
																					}
																				});
																				next()
																			}
																		} */
																	})
																}, function (err) {
																	socket.emit("r2e_get_nearest_driver", { err: 0, driversDetails: driversDetails[0].drivers, count: driversDetails[0].count });
																})
															} else {
																socket.emit("r2e_get_nearest_driver", { err: 0, driversDetails: driversDetails[0].drivers, count: driversDetails[0].count });
															}
														}
													})
												}
											})
										}
									})
								} else {
									socket.emit("r2e_get_nearest_driver", { err: 0, driversDetails: [], count: 0 });
								}
							})
						}
					})
				}
			})
		});
		socket.on('r2e_assign_driver_by_admin', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_assign_driver_by_admin', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var driverId;
			if (typeof data.driverId != 'undefined' && data.driverId != '') {
				if (isObjectId(data.driverId)) {
					driverId = new mongoose.Types.ObjectId(data.driverId);
				} else {
					socket.emit('r2e_assign_driver_by_admin', { err: 1, message: 'Invalid driverId' });
					return;
				}
			} else {
				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid driverId' });
				return;
			}
			var pickup_distance;
			if (typeof data.pickup_distance != 'undefined' && data.pickup_distance != '') {
				pickup_distance = data.pickup_distance;
			} else {
				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid driverId' });
				return;
			}
			var deliver_distance;
			if (typeof data.deliver_distance != 'undefined' && data.deliver_distance != '') {
				deliver_distance = data.deliver_distance;
			} else {
				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid driverId' });
				return;
			}
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid long' });
				return;
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Configure your app settings' });
				} else {
					var temp_radius = settings.settings.radius || 20;
					var radius = parseInt(temp_radius);
					var current_time = Date.now();
					var thirty_sec_section = 45 * 1000;
					var before_thirty_sec = current_time - thirty_sec_section;
					//var condition = { _id: driverId, status: { $eq: 1 }, last_update_time: { $gte: before_thirty_sec } };
					var condition = { _id: driverId, status: { $eq: 1 }, currentStatus: { $eq: 1 } };
					var aggregationdata = [
						// {
						// 	"$geoNear": {
						// 		near: {
						// 			type: "Point",
						// 			coordinates: [parseFloat(lon), parseFloat(lat)]
						// 		},
						// 		distanceField: "distance",
						// 		includeLocs: "location",
						// 		query: condition,
						// 		distanceMultiplier: 0.001,
						// 		spherical: true
						// 	}
						// },
						// {
						// 	"$redact": {
						// 		"$cond": {
						// 			"if": { "$lte": ["$distance", radius] },
						// 			"then": "$$KEEP",
						// 			"else": "$$PRUNE"
						// 		}
						// 	}
						// },
						{ "$match": condition },
						{
							$project: {
								drivers: {
									_id: "$_id",
									"name": "$username",
									"distance": "$distance",
									"status": "$status",
									"phone": "$phone",
									"address": "$address",
									"location": "$location",
									"email": "$email",
									"avatar": "$avatar",
									"_id": "$_id",
									"last_update_time": "$last_update_time",
								}
							}
						},
					];
					db.GetAggregation('drivers', aggregationdata, function (err, driversDetails) {
						if (typeof driversDetails != 'undefined' && driversDetails.length > 0 && typeof driversDetails[0].drivers != 'undefined') {
							db.GetOneDocument('orders', { '_id': orderId, status: { '$eq': 3 } }, {}, {}, function (err, orderDetails) {

								if (typeof orderDetails != 'undefined' && typeof orderDetails._id != 'undefined') {
									if (typeof orderDetails != 'undefined' && typeof orderDetails._id != 'undefined' && typeof orderDetails.city_id != 'undefined' && typeof orderDetails.user_id != 'undefined') {
										db.GetOneDocument('city', { _id: orderDetails.city_id, status: 1 }, { _id: 1, address: 1, location: 1, cityname: 1 }, {}, function (err, restaurant) {
											if (err || !restaurant) {
												socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid city, Please check your data', driversDetails: [], count: 0 });
											} else {
												db.GetOneDocument('users', { _id: orderDetails.user_id, status: 1 }, { _id: 1, username: 1 }, {}, function (userErr, userRespo) {
													if (userErr || !userRespo) {
														socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Invalid user, Please check your data', driversDetails: [], count: 0 });
													} else {
														db.GetOneDocument('city', { 'status': { $ne: 0 }, 'cityname': restaurant.cityname }, {}, {}, function (err, citydocdata) {
															if (err || !citydocdata) {
																socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Error in admin commission', driversDetails: [], count: 0 });
															} else {
																var nit_comm = 0;
																var extra_comm = 0;
																var night_fare_commision = 0;
																var extra_fare_commision = 0;
																var driver_fare = {};
																if (typeof citydocdata != 'undefined' && typeof citydocdata.driver_fare != 'undefined') {
																	driver_fare = citydocdata.driver_fare;
																}
																if (orderDetails.billings.amount.night_fee > 0) {
																	if (typeof citydocdata.night_fare_settings.driver_share != 'undefined') {
																		night_fare_commision = citydocdata.night_fare_settings.driver_share;
																	}
																	nit_comm = parseFloat(citydocdata.night_fare_settings.driver_share) / 100 * parseFloat(orderDetails.billings.amount.night_fee) || 0;
																	nit_comm = parseFloat(nit_comm).toFixed(2)
																}

																if (orderDetails.billings.amount.surge_fee > 0) {
																	if (typeof citydocdata.extra_fare_settings.driver_share != 'undefined') {
																		extra_fare_commision = citydocdata.extra_fare_settings.driver_share;
																	}
																	extra_comm = parseFloat(citydocdata.extra_fare_settings.driver_share) / 100 * parseFloat(orderDetails.billings.amount.surge_fee) || 0;
																	extra_comm = parseFloat(extra_comm).toFixed(2)
																}
																var driver_comm = parseFloat(nit_comm) + parseFloat(extra_comm);
																drivver_comm = parseFloat(driver_comm).toFixed(2);
																db.UpdateDocument('orders', { '_id': orderDetails._id }, { 'status': 5, 'driver_id': driverId, 'billings.amount.driver_commission': driver_comm, 'night_fare_commision': night_fare_commision, 'extra_fare_commision': extra_fare_commision, 'mileages_travelled': 0, 'order_history.driver_accepted': new Date(), 'pickup_distance': pickup_distance, driver_fare: driver_fare, 'deliver_distance': deliver_distance }, {}, function (err, docdata) {
																	if (err) {
																		socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Error in server', driversDetails: [], count: 0 });
																	}
																	else {
																		db.GetOneDocument('drivers', { _id: driverId }, { _id: 1, username: 1, avatar: 1, phone: 1 }, {}, function (driverErr, driverRespo) {
																			if (driverErr) {
																				socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Driver cannot be found', driversDetails: [], count: 0 });
																			} else {
																				db.GetCount('orders', { driver_id: mongoose.Types.ObjectId(driverId), status: { $in: [5, 6] } }, (err, count) => {
																					let jobcount = count || 1;
																					db.UpdateDocument('drivers', { '_id': driverId }, { 'currentJob': jobcount }, {}, (err, upd) => {
																						var imgurl = '';
																						imgurl = settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
																						if (driverRespo) {
																							if (driverRespo.avatar) {
																								imgurl = settings.settings.site_url + driverRespo.avatar;
																							}
																						}
																						var comb = {};
																						comb.restaurant = restaurant;
																						comb.orderDetails = orderDetails;
																						comb.users = {};
																						comb.users.username = userRespo.username;
																						// var android_driver = restaurant._id;
																						// var message = CONFIG.NOTIFICATION.DRIVER_ACCEPTED;
																						// var response_time = 250;
																						// var options = [orderDetails.order_id, android_driver];
																						// push.sendPushnotification(android_driver, message, 'driver_accepted', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
																						var android_driver1 = userRespo._id;
																						var message1 = CONFIG.NOTIFICATION.DRIVER_ACCEPTED_FOR_USER;
																						var response_time1 = 250;
																						var food_count = orderDetails.foods.length;
																						var options1 = [orderDetails.order_id, android_driver1,
																						restaurant.restaurantname, food_count, orderDetails.billings.amount.grand_total, orderDetails.location, restaurant.location, driverRespo.username, driverRespo.phone, imgurl];
																						push.sendPushnotification(android_driver1, message1, 'driver_accepted', 'ANDROID', options1, 'USER', function (err, response, body) { });
																						io.of('/chat').in(orderDetails._id).emit('OrderUpdated', { orderId: orderDetails._id });
																						var android_driver = driverId;
																						var message = CONFIG.NOTIFICATION.ADMIN_ASSIGN_ORDER;
																						var response_time = 250;
																						var options = [orderDetails.order_id, android_driver];
																						push.sendPushnotification(android_driver, message, 'driver_accepted', 'ANDROID', options, 'DRIVER', function (err, response, body) { });
																						var noti_data = {};
																						noti_data.rest_id = restaurant._id;
																						noti_data.order_id = orderDetails.order_id;
																						noti_data.user_name = driverRespo.username;
																						noti_data.user_id = orderDetails.user_id;
																						noti_data._id = orderDetails._id;
																						noti_data.order_type = 'driver_accept';
																						//io.of('/chat').in(data.restaurant_id).emit('restnotify', { restauranId: noti_data });
																						io.of('/chat').in(orderDetails.user_id).emit('usernotify', noti_data);
																						io.of('/chat').emit('adminnotify', noti_data);

																						socket.emit("r2e_assign_driver_by_admin", { err: 0, message: '', data: comb });
																					})
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
									} else {
										socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Order not Found.', driversDetails: [], count: 0 });
									}
								} else {
									socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Order not Found.', driversDetails: [], count: 0 });
								}
							})
						} else {
							socket.emit("r2e_assign_driver_by_admin", { err: 1, message: 'Currently driver not available', driversDetails: [], count: 0 });
						}
					})
				}
			})
		});


		socket.on('r2e_driver_current_location', function (data) {
			//r2e_driver_current_location
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_driver_current_location", { err: 1, message: 'Invalid lat' });
				return;
			}
			var lon;
			if (typeof data.lon != 'undefined' && data.lon != '') {
				lon = data.lon;
			} else {
				socket.emit("r2e_driver_current_location", { err: 1, message: 'Invalid long' });
				return;
			}
			var driverId;
			if (typeof data.driverId != 'undefined' && data.driverId != '') {
				if (isObjectId(data.driverId)) {
					driverId = new mongoose.Types.ObjectId(data.driverId);
				} else {
					socket.emit('r2e_driver_current_location', { err: 1, message: 'Invalid driverId' });
					return;
				}
			} else {
				socket.emit("r2e_driver_current_location", { err: 1, message: 'Invalid driverId' });
				return;
			}
			var radius = 20;
			if (typeof data.radius != 'undefined' && data.radius != '') {
				try {
					radius = parseInt(data.radius);
				} catch (e) {
					radius = 20;
				}
			}
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) {
					socket.emit("r2e_driver_current_location", { err: 1, message: 'Configure your app settings' });
				} else {
					var temp_radius = settings.settings.radius || 20;
					var radius = parseInt(temp_radius);
					db.GetOneDocument('drivers', { status: { $eq: 1 } }, {}, {}, function (err, drivers) {

						if (err || !drivers || (drivers && typeof drivers._id == 'undefined')) {
							socket.emit("r2e_driver_current_location", { err: 1, message: 'Driver not found.' });
						} else {
							var updateDetails = { "$pull": { 'driver_location': { id: { $in: [driverId] } } } };
							var condition = { "driver_location": { $elemMatch: { "id": driverId } } };
							db.UpdateDocument('restaurant', condition, updateDetails, { multi: true }, function (err, res) {
							});
							var geocode = { 'latitude': lat, 'longitude': lon };
							GoogleAPI.geocode(geocode, function (response) {
								if (response[0]) {
									if (response[0].formatted_address) {
										var addres = response[0].formatted_address;
									} else {
										addres = '';
									}
								}
								else {
									addres = '';
								}
								var location = {};
								location.lng = lon;
								location.lat = lat;
								var updateDetails = { location: location, 'address.fulladres': addres, last_update_time: Date.now() };
								var condition = { "_id": driverId };
								db.UpdateDocument('drivers', condition, updateDetails, { multi: true }, function (err, res) {
									socket.emit("r2e_driver_current_location", { err: 0, message: 'Successfully Updated...' });
								});
							});
							var condition = { status: { $eq: 1 }, availability: { $eq: 1 } };
							var aggregationdata = [
								{
									"$geoNear": {
										near: {
											type: "Point",
											coordinates: [parseFloat(lon), parseFloat(lat)]
										},
										distanceField: "distance",
										includeLocs: "location",
										query: condition,
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
										restaurant: {
											_id: "$_id",
											location: "$location",
										}
									}
								}];
							data = { $group: { _id: null, restaurant: { $push: "$restaurant" } } };
							aggregationdata.push(data);
						}
					});
				}
			})
		});

		socket.on('remove_order', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('remove_order', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("remove_order", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var respo = {};
			respo.msg = 'order removed sucessfully'
			chat.in(orderId).emit('remove_order', respo);
			delete orderdatas[orderId];
			socket.leave(orderId);
		});

		socket.on('create_order', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('create_order', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("create_order", { err: 1, message: 'Invalid orderId' });
				return;
			}
			if (typeof orderId != 'undefined') {
				if (orderdatas.indexOf(orderId) == -1) {
					orderdatas.push(orderId);
				}
			}
			socket.join(orderId);
			socket.emit('order_created', data);
			socketorders[socket.id] = orderId;
		});

		socket.on('r2e_restaurant_tracking', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_restaurant_tracking', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_restaurant_tracking", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_restaurant_tracking", { err: 1, message: 'latitude required' });
				return;
			}
			var long;
			if (typeof data.long != 'undefined' && data.long != '') {
				long = data.long;
			} else {
				socket.emit("r2e_restaurant_tracking", { err: 1, message: 'longitude required' });
				return;
			}
			var bearing;
			if (typeof data.bearing != 'undefined' && data.bearing != '') {
				bearing = data.bearing;
			} else {
				socket.emit("r2e_restaurant_tracking", { err: 1, message: 'bearing required' });
				return;
			}
			var loc = {};
			loc.lat = data.lat;
			loc.lng = data.long;
			loc.bearing = data.bearing;
			db.UpdateDocument('orders', { '_id': orderId }, { '$addToSet': { pickup_coords: loc } }, {}, (err, updated) => {
				if (err) {
					socket.emit("r2e_restaurant_tracking", { err: 1, message: 'error in saving coords' });
				} else {
					var result = { err: 0, message: '', orderId: orderId, loc: loc };
					chat.in(orderId).emit('r2e_restaurant_tracking', result);
				}
			})
		})

		socket.on('r2e_user_tracking', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_user_tracking', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_user_tracking", { err: 1, message: 'Invalid orderId' });
				return;
			}
			var lat;
			if (typeof data.lat != 'undefined' && data.lat != '') {
				lat = data.lat;
			} else {
				socket.emit("r2e_user_tracking", { err: 1, message: 'latitude required' });
				return;
			}
			var long;
			if (typeof data.long != 'undefined' && data.long != '') {
				long = data.long;
			} else {
				socket.emit("r2e_user_tracking", { err: 1, message: 'longitude required' });
				return;
			}
			var bearing;
			if (typeof data.bearing != 'undefined' && data.bearing != '') {
				bearing = data.bearing;
			} else {
				socket.emit("r2e_user_tracking", { err: 1, message: 'bearing required' });
				return;
			}
			var loc = {};
			loc.lat = data.lat;
			loc.lng = data.long;
			loc.bearing = data.bearing;
			db.UpdateDocument('orders', { '_id': orderId }, { '$addToSet': { deliver_coords: loc } }, {}, (err, updated) => {
				if (err) {
					socket.emit("r2e_user_tracking", { err: 1, message: 'error in saving coords' });
				} else {
					var result = { err: 0, message: '', orderId: orderId, loc: loc };
					chat.in(orderId).emit('r2e_user_tracking', result);
				}
			})
		})
		socket.on('r2e_get_tracking_details', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				if (isObjectId(data.orderId)) {
					orderId = new mongoose.Types.ObjectId(data.orderId);
				} else {
					socket.emit('r2e_get_tracking_details', { err: 1, message: 'Invalid orderId' });
					return;
				}
			} else {
				socket.emit("r2e_get_tracking_details", { err: 1, message: 'Invalid orderId' });
				return;
			}

			var filter_query = { "_id": orderId };
			var condition = [
				{ $match: filter_query },
				{ "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
				{ $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
				{ "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driver" } },
				{ $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
				{ '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
				{ "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						tracking_details: {
							_id: "$_id",
							order_id: "$order_id",
							order_date: "$createdAt",
							location: "$restaurantDetails.location",
							name: "$restaurantDetails.restaurantname",
							address: "$restaurantDetails.address.fulladres",
							phone: "$restaurantDetails.phone",
							rest_id: "$restaurantDetails._id",
							user_location: "$location",
							"driver_accpt_time": "$order_history.driver_accepted",
							"driver_pickup_time": "$order_history.driver_pickedup",
							"driver_deli_time": "$order_history.food_delivered",
							refer_offer_price: "$refer_offer_price",
							show_schedule_time: "$show_schedule_time",
							"amount": "$billings.amount",
							"user_name": "$users.username",
							"user_image": "$users.avatar",
							"driver_name": "$driver.username",
							"driver_image": "$driver.avatar",
							"driver_address": "$driver.address.fulladres",
							"drop_address": "$delivery_address.fulladres",
							"delivery_address": "$delivery_address",
							"user_phone": "$users.phone",
							"delivery_date": "$order_history.food_delivered",
							"driver_phone": "$driver.phone",
							"order_status": "$status",
							"cancellationreason": "$cancellationreason",
							order_message: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Picked Up", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By You", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
							"food_datails": "$foods",
							"driver_location": "$driver.location",
							"pickup_distance": "$pickup_distance",
							"deliver_distance": "$deliver_distance",
							"com_type": "$com_type",
							"unique_commission": "$unique_commission",
							"pickup_mins": "$pickup_distance",
							pickup: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$pickup_coords", ''] }, ''] }] }, "$pickup_coords", []] },
							deliver: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$deliver_coords", ''] }, ''] }] }, "$deliver_coords", []] },

						}
					}
				}
			];
			db.GetAggregation('orders', condition, function (err, docdata) {
				if (err || !docdata) {
					socket.emit("r2e_get_tracking_details", { err: 0, message: '', tracking_details: {} });
				} else {
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						var options = {};
						options.populate = 'restaurant_id';
						var foodQuery = [
							{ "$match": { 'order_id': docdata[0].tracking_details.order_id, 'restaurant_id': new mongoose.Types.ObjectId(docdata[0].tracking_details.rest_id) } },
							{ "$project": { foods: 1, } },
						];
						db.GetOneDocument('orders', { 'order_id': docdata[0].tracking_details.order_id, restaurant_id: new mongoose.Types.ObjectId(docdata[0].tracking_details.rest_id) }, {}, options, function (err, respo) {
							if (err || !respo) {
								socket.emit("r2e_get_tracking_details", { err: 0, message: 'Invalid order, Please check your data', tracking_details: {} });
							} else {
								db.GetAggregation('orders', foodQuery, function (err, fooddata) {
									db.GetOneDocument('city', { 'status': { $ne: 0 }, 'cityname': respo.restaurant_id.main_city }, {}, {}, function (err, citydocdata) {
										if (err || !citydocdata) {
											socket.emit("r2e_get_tracking_details", { err: 0, message: 'Invalid city Data', tracking_details: {} });
										} else {
											var tracking_details = {};
											if (docdata && docdata.length > 0 && typeof docdata[0].tracking_details != 'undefined') {
												var response = {};
												var applied_admin_com = 0;
												if (typeof applied_admin_com == 'undefined' || applied_admin_com == null) {
													applied_admin_com = 0;
												}
												if (docdata[0].tracking_details.com_type == 'common') {
													if (typeof citydocdata.admin_commission != 'undefined') {
														applied_admin_com = citydocdata.admin_commission;
													}
												} else {
													if (typeof docdata[0].tracking_details.unique_commission != 'undefined' && typeof docdata[0].tracking_details.unique_commission.admin_commission != 'undefined') {
														applied_admin_com = docdata[0].tracking_details.unique_commission.admin_commission;
													}
												}
												var site_total = 0;
												var total = 0;
												if (typeof respo.billings.amount.total != 'undefined' && respo.billings.amount.total != null) {
													total = respo.billings.amount.total;
												}
												var offer_discount = 0;
												if (typeof respo.billings.amount.offer_discount != 'undefined' && respo.billings.amount.offer_discount != null) {
													offer_discount = respo.billings.amount.offer_discount;
												}
												var food_offer_price = 0;
												if (typeof respo.billings.amount.food_offer_price != 'undefined' && respo.billings.amount.food_offer_price != null) {
													food_offer_price = respo.billings.amount.food_offer_price;
												}
												var sub_com = (total - (offer_discount + food_offer_price));
												if (sub_com > 0) {
													site_total = sub_com * (applied_admin_com / 100)
												}
												docdata[0].tracking_details.site_commission = site_total;
												docdata[0].tracking_details.restaurant_commission = (respo.billings.amount.total + respo.billings.amount.service_tax + respo.billings.amount.package_charge) - (respo.billings.amount.offer_discount + respo.billings.amount.food_offer_price + site_total);
												tracking_details = docdata[0].tracking_details;
											}
											socket.emit("r2e_get_tracking_details", { err: 0, message: '', tracking_details: tracking_details });
											//});
										}
									})
								})
							}
						})
					})
				}
			});
		})


		socket.on('r2e_get_admin_tracking_details', function (data) {
			var orderId;
			if (typeof data.orderId != 'undefined' && data.orderId != '') {
				orderId = data.orderId;
			} else {
				socket.emit("r2e_get_admin_tracking_details", { err: 1, message: 'Invalid orderId' });
				return;
			}


			//Dinedoo-552750
			var filter_query = {
				$expr: {
					$and: [
						{ "$eq": [{ $toLower: "$order_id" }, orderId.toLowerCase()] },
					]
				}
			};
			var condition = [
				{ $match: filter_query },
				{ "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
				{ $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
				{ "$lookup": { from: "users", localField: "user_id", foreignField: "_id", as: "users" } },
				{ $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
				{ "$lookup": { from: "drivers", localField: "driver_id", foreignField: "_id", as: "driver" } },
				{ $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
				{ '$lookup': { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantDetails' } },
				{ "$unwind": { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						tracking_details: {
							_id: "$_id",
							order_id: "$order_id",
							driver_id: "$driver_id",
							user_id: "$user_id",
							restaurant_id: "$restaurant_id",
							location: "$restaurantDetails.location",
							name: "$restaurantDetails.restaurantname",
							address: "$restaurantDetails.address.fulladres",
							phone: "$restaurantDetails.phone",
							user_location: "$location",
							"driver_accpt_time": "$order_history.driver_accepted",
							"driver_pickup_time": "$order_history.driver_pickedup",
							"driver_deli_time": "$order_history.food_delivered",
							"amount": "$billings.amount",
							"user_name": "$users.username",
							"user_image": "$users.avatar",
							"driver_name": "$driver.username",
							"driver_image": "$driver.avatar",
							"restaurant_image": "$restaurantDetails.avatar",
							"restaurant_logo": "$restaurantDetails.logo",
							"driver_address": "$driver.address.fulladres",
							"drop_address": "$delivery_address.fulladres",
							"delivery_address": "$delivery_address",
							"user_phone": "$users.phone",
							"delivery_date": "$order_history.food_delivered",
							"driver_phone": "$driver.phone",
							"order_status": "$status",
							"food_datails": "$foods",
							"driver_location": "$driver.location",
							"pickup_distance": "$pickup_distance",
							"deliver_distance": "$deliver_distance",
							order_message: { "$cond": [{ $and: [{ $eq: ["$status", 1] }] }, "Booked", { "$cond": [{ $and: [{ $eq: ["$status", 2] }] }, "Restaurant Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 3] }] }, "Restaurant Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 4] }] }, "Driver Rejected", { "$cond": [{ $and: [{ $eq: ["$status", 5] }] }, "Driver Accepted", { "$cond": [{ $and: [{ $eq: ["$status", 6] }] }, "Driver Picked Up", { "$cond": [{ $and: [{ $eq: ["$status", 7] }] }, "Delivered", { "$cond": [{ $and: [{ $eq: ["$status", 8] }] }, "Payment Completed", { "$cond": [{ $and: [{ $eq: ["$status", 9] }] }, "Cancelled By You", { "$cond": [{ $and: [{ $eq: ["$status", 10] }] }, "Admin Cancelled Order", ""] }] }] }] }] }] }] }] }] }] },
							"pickup_mins": "$pickup_distance",
							pickup: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$pickup_coords", ''] }, ''] }] }, "$pickup_coords", []] },
							deliver: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$deliver_coords", ''] }, ''] }] }, "$deliver_coords", []] },

						}
					}
				}
			];
			db.GetAggregation('orders', condition, function (err, docdata) {
				if (err || !docdata) {
					socket.emit("r2e_get_admin_tracking_details", { err: 0, message: '', tracking_details: {} });
				} else {
					var tracking_details = {};
					if (docdata && docdata.length > 0 && typeof docdata[0].tracking_details != 'undefined') {
						tracking_details = docdata[0].tracking_details
					}
					socket.emit("r2e_get_admin_tracking_details", { err: 0, message: '', tracking_details: tracking_details });
				}
			});
		})
		socket.on('sc_get_server_time', function (data) {
			data.err = 0;
			data.msg = ''
			data.server_time = Date.now();
			var Moment = require('moment-timezone');
			var d = moment(data.server_time).tz("Asia/Hovd").format()
			data.server_time = moment(d).valueOf();
			socket.emit("sc_get_server_time", data);
		});
		socket.on('r2e_get_settings_details', function (data) {
			db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1, 'settings.with_otp': 1, 'settings.with_password': 1 }, {}, function (err, docdata) {
				if (err || !docdata) {
					socket.emit("r2e_get_settings_details", { err: 1, message: 'Unable to fetch data', settings: {} });
				} else {
					var settings = docdata.settings;
					var server_offset = (new Date).getTimezoneOffset();
					settings.offset = server_offset;
					var jstz = require('jstimezonedetect');
					var server_time_zone = jstz.determine().name();
					var data = {};
					data.err = 0;
					data.message = "";
					data.settings = settings;
					socket.emit("r2e_get_settings_details", data);
				}
			});
		});
		socket.on('r2e_check_tax_available', function (data) {
			var country;
			if (typeof data.country != 'undefined' && data.country != '') {
				country = data.country;
			} else {
				socket.emit("r2e_check_tax_available", { err: 1, message: 'Invalid country' });
				return;
			}
			db.GetOneDocument('tax', { 'country.name': country }, {}, {}, function (err, taxrespo) {
				if (err || !taxrespo) {
					socket.emit("r2e_check_tax_available", { err: 0, message: '', is_available: 0 });
				} else {
					if (taxrespo._id != 'undefined') {
						socket.emit("r2e_check_tax_available", { err: 0, message: '', is_available: 1, taxid: taxrespo._id, amount: taxrespo.amount, tax_label: taxrespo.tax_label });
					} else {
						socket.emit("r2e_check_tax_available", { err: 0, message: '', is_available: 0 });
					}
				}
			});
		});

		socket.on('r2e_widgets_settings_details', function (data) {
			db.GetOneDocument('settings', { alias: 'widgets' }, {}, {}, function (err, docdata) {
				if (err || !docdata) {
					socket.emit("r2e_widgets_settings_details", { err: 1, message: 'Unable to fetch data', settings: {} });
				} else {
					socket.emit("r2e_widgets_settings_details", { err: 0, message: '', settings: docdata.settings });
				}
			});
		})
		socket.on('r2e_get_landing_image', function (data) {
			db.GetOneDocument('images', { 'imagefor': 'sitelanding' }, {}, {}, function (err, images) {
				if (err || !images) {
					socket.emit("r2e_get_landing_image", { err: 1, message: 'Unable to fetch data', imageDetails: {} });
				} else {
					socket.emit("r2e_get_landing_image", { err: 0, message: '', imageDetails: images });
				}
			});
		})
		socket.on('r2e_set_last_billing', function (data) {
			var today = moment(new Date()).format('MM/DD/YYYY');
			var last_billed = today + ' 00:00:00';
			var last_billed_date = new Date(last_billed);
			var last_billed_time = last_billed_date.getTime();
			db.UpdateDocument('settings', { 'alias': 'billing_cycle' }, { 'settings.last_billed_date': last_billed_date, 'settings.last_billed_time': last_billed_time }, {}, function (err, settingres) {
				if (err || settingres.nModified == 0) {
					socket.emit("r2e_set_last_billing", { err: 1, message: 'Error in settings', imageDetails: {} });
				} else {
					socket.emit("r2e_set_last_billing", { err: 1, message: 'successfully changed ', last_billed_date: last_billed_date, last_billed_time: last_billed_time });
				}
			})
		})

		/*  **************************************   Query Update In Manual *********************    */

		socket.on('r2e_update_tax_restaurant', function (data) {
			var each = require('async-each-series');
			db.GetDocument('restaurant', { "tax_id": { $exists: false } }, {}, {}, function (err, restaurant_list) {
				if (err) {
					socket.emit("r2e_update_tax_restaurant", { err: 0, 'message': 'Sucessfully Added' });
				} else {
					if (restaurant_list.length > 0) {
						each(restaurant_list, function (restaurant, next) {
							if (typeof restaurant.address != 'undefined' && typeof restaurant.address.country != 'undefined' && restaurant.address.country != '') {
								var country = restaurant.address.country;
								var state = restaurant.address.state;
								var tax = 0;
								var tax_id = '';
								db.GetOneDocument('tax', { 'country.name': country }, {}, {}, function (err, taxrespo) {
									if (taxrespo && typeof taxrespo != 'undefined' && taxrespo._id != 'undefined') {
										tax = taxrespo.amount || 0;
										tax_id = taxrespo._id;
										db.GetOneDocument('tax', { 'country.name': country, state_name: state }, {}, {}, function (err, taxrespo1) {
											if (taxrespo1 && typeof taxrespo1 != 'undefined' && taxrespo1._id != 'undefined') {
												tax = taxrespo1.amount || 0;
												tax_id = taxrespo1._id;
											}
											db.UpdateDocument('restaurant', { '_id': restaurant._id }, { 'tax': tax, 'tax_id': tax_id }, {}, function (err, restaurantres) {
												next()
											})
										});
									} else {
										db.UpdateDocument('restaurant', { '_id': restaurant._id }, { 'tax': tax, 'tax_id': tax_id }, {}, function (err, restaurantres) {
											next()
										})
									}
								});
							} else {
								next()
							}
						}, function (err) {
							socket.emit("r2e_update_tax_restaurant", { err: 0, 'message': 'Sucessfully Added' });
						})
					} else {
						socket.emit("r2e_update_tax_restaurant", { err: 0, 'message': 'Sucessfully Added' });
					}
				}
			})
		});
		socket.on('r2e_update_city_res', function (data) {
			var each = require('async-each-series');
			db.GetDocument('restaurant', {}, {}, {}, function (err, restaurant_list) {
				if (err) {
					socket.emit("r2e_update_city_res", { err: 0, 'message': 'Sucessfully Added' });
				} else {
					if (restaurant_list.length > 0) {
						each(restaurant_list, function (restaurant, next) {
							if (typeof restaurant.main_city != 'undefined' && typeof restaurant.sub_city != 'undefined') {
								var main_city = restaurant.main_city;
								var sub_city = restaurant.sub_city;
								db.GetOneDocument('city', { 'cityname': main_city }, {}, {}, function (err, cityrespo) {
									if (cityrespo && typeof cityrespo != 'undefined' && cityrespo._id != 'undefined') {
										var city_id = cityrespo._id;
										if (typeof cityrespo.area_management != 'undefined') {
											var SubCityIndex = cityrespo.area_management.map(function (e) { return e.area_name.toString(); }).indexOf(sub_city);
											if (SubCityIndex != -1) {
												var sub_city_id = cityrespo.area_management[SubCityIndex]._id;
												db.UpdateDocument('restaurant', { '_id': restaurant._id }, { 'sub_city_id': sub_city_id, 'city_id': city_id }, {}, function (err, restaurantres) {
													next()
												})
											} else {
												db.DeleteDocument('restaurant', { '_id': restaurant._id }, function (err, restaurantres) {
													next()
												})
											}
										} else {
											db.DeleteDocument('restaurant', { '_id': restaurant._id }, function (err, restaurantres) {
												next()
											})
										}
									} else {
										db.DeleteDocument('restaurant', { '_id': restaurant._id }, function (err, restaurantres) {
											next()
										})
									}
								});
							} else {
								db.DeleteDocument('restaurant', { '_id': restaurant._id }, function (err, restaurantres) {
									next()
								})
							}
						}, function (err) {
							socket.emit("r2e_update_city_res", { err: 0, 'message': 'Sucessfully Added' });
						})
					} else {
						socket.emit("r2e_update_city_res", { err: 0, 'message': 'Sucessfully Added' });
					}
				}
			})
		});
		socket.on('r2e_update_category_food', function (data) {
			var each = require('async-each-series');
			db.GetDocument('food', {}, {}, {}, function (err, food_list) {
				if (err) {
					socket.emit("r2e_update_category_food", { err: 0, 'message': 'Sucessfully Added' });
				} else {
					if (food_list.length > 0) {
						each(food_list, function (food, next) {
							if (typeof food.categories != 'undefined' && food.categories.length > 0) {
								var category = food.categories[0].category;
								if (typeof category != 'undefined') {
									db.GetOneDocument('categories', { 'parent': category }, {}, {}, function (err, categoryrespo) {
										if (categoryrespo && typeof categoryrespo != 'undefined' && typeof categoryrespo._id != 'undefined') {
											db.DeleteDocument('food', { '_id': food._id }, function (err, foodres) {
												next()
											})
										} else {
											next()
										}
									})
								} else {
									db.DeleteDocument('food', { '_id': food._id }, function (err, foodres) {
										next()
									})
								}
							}
						}, function (err) {
							socket.emit("r2e_update_category_food", { err: 0, 'message': 'Sucessfully Added' });
						})
					} else {
						socket.emit("r2e_update_category_food", { err: 0, 'message': 'Sucessfully Added' });
					}
				}
			})
		});
		socket.on('r2e_wallet_recharge_settings', function (data) {
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit("r2e_wallet_recharge_settings", { err: 1, message: 'Invalid from Id' });
					return;
				}
			} else {
				socket.emit("r2e_wallet_recharge_settings", { err: 1, message: 'Invalid from Id' });
				return;
			}
			var to;
			if (typeof data.to != 'undefined') {
				if (isObjectId(data.to)) {
					to = new mongoose.Types.ObjectId(data.to);
				} else {
					socket.emit("r2e_wallet_recharge_settings", { err: 1, message: 'Invalid to Id' });
					return;
				}
			}
			var type;
			if (typeof data.type != 'undefined') {
				if (data.type == 'admin_added_wallet_amount' || data.type == 'admin_removed_wallet_point') {
					type = data.type;
				} else {
					socket.emit('r2e_wallet_recharge_settings', { err: 1, msg: 'Invalid type' });
					return;
				}
			} else {
				socket.emit('r2e_wallet_recharge_settings', { err: 1, msg: 'Invalid type' });
				return;
			}
			var collection;
			if (typeof data.collection != 'undefined') {
				if (data.collection == 'users' || data.collection == 'drivers') {
					collection = data.collection;
				} else {
					socket.emit('r2e_wallet_recharge_settings', { err: 1, msg: 'Invalid collection' });
					return;
				}
			} else {
				socket.emit('r2e_wallet_recharge_settings', { err: 1, msg: 'Invalid collection' });
				return;
			}

			var projection = { username: 1, avatar: 1, wallet_settings: 1, wallet_pending_payment: 1 };
			if (collection == 'drivers') {
				projection = { username: 1, avatar: 1, wallet_settings: 1, wallet_pending_payment: 1 };
			}
			db.GetOneDocument(collection, { _id: from }, projection, {}, function (err, currentUser) {
				if (err || !currentUser) {
					socket.emit("r2e_wallet_recharge_settings", { err: 1, message: 'User Not Found' });
				} else {
					db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1 }, {}, function (err, settings) {
						if (err || !settings) {
							socket.emit("r2e_wallet_recharge_settings", { err: 1, msg: 'Unable to fetch settings' });
						} else {
							if (typeof currentUser != 'undefined' && typeof currentUser._id != 'undefined') {
								if ((type == 'admin_removed_wallet_point' || type == 'admin_added_wallet_amount') && typeof data.amount != 'undefined' && data.amount > 0) {
									var wallet_amount = data.amount;
									var life_time_wallet_amount = data.amount;
									var used = data.amount;
									var update_amount = data.amount;

									if (typeof currentUser.wallet_settings != 'undefined' && typeof currentUser.wallet_settings.available != 'undefined') {
										if (type == 'admin_removed_wallet_point') {
											if (currentUser.wallet_settings.available >= data.amount) {
												update_amount = currentUser.wallet_settings.available - update_amount;
											} else {
												data.err = 1;
												data.msg = 'Wallet recharge amount is invalid';
												data.update_amount = currentUser.wallet_settings.available;
												socket.emit('r2e_wallet_recharge_settings', data);
												return;
											}
										} else {
											update_amount = currentUser.wallet_settings.available + update_amount;
										}
									} else {
										if (type == 'admin_removed_wallet_point') {
											data.err = 1;
											data.msg = 'Wallet recharge amount is invalid';
											data.wallet_amount = wallet_amount;
											socket.emit('r2e_wallet_recharge_settings', data);
											return;
										}
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
									if (type == 'admin_removed_wallet_point') {
										updateData = { 'wallet_settings.available': update_amount, 'wallet_settings.used': used };
									}
									var InsertData = { _id: recordId, from: from, activity: activity, type: type, amount: wallet_amount, reason: data.reason, available_amount: update_amount };
									db.InsertDocument('driver_wallet', InsertData, function (err, document) {
									});
									db.UpdateDocument(collection, condition, updateData, {}, function (err, response) {
										//remove pending amount to orders
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
																var InsertData = { _id: recordId, from: from, activity: activity, type: 'driver_order_pending_amount', amount: reduce_wallet_amount, reason: '', available_amount: update_amount1 };
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
									data.err = 0;
									data.msg = '';
									data.wallet_amount = wallet_amount;
									socket.emit('r2e_wallet_recharge_settings', data);
								} else {
									socket.emit("r2e_wallet_recharge_settings", { err: 1, message: 'Invalid input' });
								}
							} else {
								socket.emit("r2e_wallet_recharge_settings", { err: 1, message: 'User Not Found' });
							}
						}
					})
				}
			})
		})
		socket.on('r2e_set_wallets', function (data) {
			var wallet_settings = { available: 0, life_time: 0, used: 0 }
			var updateData = { 'wallet_settings': wallet_settings };
			db.UpdateDocument('drivers', { wallet_settings: { $exists: false } }, updateData, { multi: true }, function (err, response) {
			});
		})
		socket.on('r2e_get_driver_details', function (data) {
			var driverId;
			if (typeof data.driverId != 'undefined' && data.driverId != '') {
				if (isObjectId(data.driverId)) {
					driverId = new mongoose.Types.ObjectId(data.driverId);
				} else {
					socket.emit('r2e_get_driver_details', { err: 1, message: 'Invalid driverId' });
					return;
				}
			} else {
				socket.emit("r2e_get_driver_details", { err: 1, message: 'Invalid driverId' });
				return;
			}
			db.GetOneDocument('drivers', { _id: driverId }, { _id: 1, 'username': 1, 'email': 1, 'phone': 1, 'wallet_settings': 1, 'avatar': 1 }, {}, function (err, docdata) {
				if (err || !docdata) {
					socket.emit("r2e_get_driver_details", { err: 1, message: 'Unable to fetch data', driverDetails: {} });
				} else {
					var wallet_settings = { life_time: 0, available: 0, used: 0 };
					if (typeof docdata._id != 'undefined') {
						if (typeof docdata.wallet_settings == 'undefined' || typeof docdata.wallet_settings.available == 'undefined') {
							docdata.wallet_settings = wallet_settings;
						}
						socket.emit("r2e_get_driver_details", { err: 0, message: '', driverDetails: docdata });
					} else {
						socket.emit("r2e_get_driver_details", { err: 1, message: 'Unable to fetch data', driverDetails: {} });
					}

				}
			});
		})
		socket.on('r2e_get_wallet_history', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_get_wallet_history', { err: 1, message: "some key value missing." });
				return;
			}
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit('r2e_get_wallet_history', { err: 1, msg: 'Invalid From Id' });
					return;
				}
			} else {
				socket.emit('r2e_get_wallet_history', { err: 1, msg: 'Invalid From Id' });
				return;
			}
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}

			var matchCondition = { $match: { "status": 1, $and: [{ 'type': { $ne: 'admin_removed_wallet_point' } }, { 'type': { $ne: 'driver_order_delivery' } }], $or: [{ 'from': mongoose.Types.ObjectId(from) }] } };
			var searchQuery = [matchCondition,
				{
					$project: {
						"_id": "$_id",
						"updatedAt": "$updatedAt",
						"createdAt": "$createdAt",
						"from": "$from",
						"from_user": "$from",
						"activity": "$activity",
						"type": "$type",
						"timestamp": "$timestamp",
						"amount": "$amount",
						"reason": "$reason",
					}
				},
				{ $sort: { 'timestamp': -1 } },

				{ '$skip': skip },
				{ '$limit': limit },
				{ '$lookup': { from: 'users', localField: 'from_user', foreignField: '_id', as: 'user' } },
				{ "$unwind": { path: "$user", preserveNullAndEmptyArrays: true } },
				{ '$lookup': { from: 'users', localField: 'activity', foreignField: '_id', as: 'activity_user' } },
				{ "$unwind": { path: "$activity_user", preserveNullAndEmptyArrays: true } },
				{ '$lookup': { from: 'order', localField: 'activity', foreignField: '_id', as: 'activity_details' } },
				{ "$unwind": { path: "$activity_details", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						wallet_history: {
							"_id": "$_id",
							"updatedAt": "$updatedAt",
							"from_user": "$from_user",
							"createdAt": "$createdAt",
							"from": "$from",
							"activity": "$activity",
							"type": "$type",
							"timestamp": "$timestamp",
							"amount": "$amount",
							"status": "$status",
							"reason": "$reason",
							"activity_type": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$activity_user", ''] }, ''] }] }, "user", 'order'] },
							"activity_details": '$activity_details',
						}
					}
				},
				{
					$group: { _id: null, "wallet_history": { $push: "$wallet_history" } }
				}
			];
			db.GetAggregation('driver_wallet', searchQuery, function (err, docdata) {
				if (typeof docdata != 'undefined' && docdata.length > 0) {
					if (typeof docdata[0].wallet_history != 'undefined') {
						socket.emit("r2e_get_wallet_history", { err: '', message: '', 'wallet_history': docdata[0].wallet_history });
					} else {
						socket.emit("r2e_get_wallet_history", { err: '', message: '', 'wallet_history': [] });
					}
				} else {
					socket.emit("r2e_get_wallet_history", { err: '', message: '', 'wallet_history': [] });
				}
			});
		});
		socket.on('r2e_get_wallet_history_count', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_get_wallet_history_count', { err: 1, message: "some key value missing." });
				return;
			}
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit('r2e_get_wallet_history_count', { err: 1, msg: 'Invalid From Id' });
					return;
				}
			} else {
				socket.emit('r2e_get_wallet_history_count', { err: 1, msg: 'Invalid From Id' });
				return;
			}
			var matchCondition = { $match: { "status": 1, $and: [{ 'type': { $ne: 'driver_order_delivery' } }, { 'type': { $ne: 'admin_removed_wallet_point' } }], $or: [{ 'from': mongoose.Types.ObjectId(from) }] } };
			var searchQuery = [matchCondition,
				{ $project: { "_id": "$_id" } },
				{ $group: { _id: null, "count": { "$sum": 1 } } }
			];
			db.GetAggregation('driver_wallet', searchQuery, function (err, docdata) {
				if (typeof docdata != 'undefined' && docdata.length > 0) {
					if (typeof docdata[0].count != 'undefined') {
						socket.emit("r2e_get_wallet_history_count", { err: '', message: '', 'count': docdata[0].count });
					} else {
						socket.emit("r2e_get_wallet_history_count", { err: '', message: '', 'count': 0 });
					}
				} else {
					socket.emit("r2e_get_wallet_history_count", { err: '', message: '', 'count': 0 });
				}
			});
		});
		socket.on('r2e_get_wallet_history_usage', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_get_wallet_history_usage', { err: 1, message: "some key value missing." });
				return;
			}
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit('r2e_get_wallet_history_usage', { err: 1, msg: 'Invalid From Id' });
					return;
				}
			} else {
				socket.emit('r2e_get_wallet_history_usage', { err: 1, msg: 'Invalid From Id' });
				return;
			}
			var limit = 10;
			if (data.limit) {
				var tmp = parseInt(data.limit);
				if (tmp != NaN && tmp > 0) {
					limit = tmp;
				}
			}
			var skip = 0;
			if (typeof data.pageId != 'undefined') {
				if (data.pageId) {
					var tmp = parseInt(data.pageId);
					if (tmp != NaN && tmp > 0) {
						skip = (tmp * limit) - limit;
					}
				}
			}

			var matchCondition = { $match: { "status": 1, 'from': mongoose.Types.ObjectId(from), $or: [{ 'type': { $eq: 'admin_removed_wallet_point' } }, { 'type': { $eq: 'driver_order_delivery' } }] } };
			var searchQuery = [matchCondition,
				{
					$project: {
						"_id": "$_id",
						"updatedAt": "$updatedAt",
						"createdAt": "$createdAt",
						"from": "$from",
						"from_user": "$from",
						"activity": "$activity",
						"type": "$type",
						"timestamp": "$timestamp",
						"amount": "$amount",
						"status": "$status",
						"reason": "$reason",
					}
				},
				{ $sort: { 'timestamp': -1 } },
				{ '$skip': skip },
				{ '$limit': limit },
				{ '$lookup': { from: 'users', localField: 'from_user', foreignField: '_id', as: 'user' } },
				{ "$unwind": { path: "$user", preserveNullAndEmptyArrays: true } },
				{ '$lookup': { from: 'orders', localField: 'activity', foreignField: '_id', as: 'activity_details' } },
				{ "$unwind": { path: "$activity_details", preserveNullAndEmptyArrays: true } },
				{ '$lookup': { from: 'users', localField: 'activity', foreignField: '_id', as: 'activity_user' } },
				{ "$unwind": { path: "$activity_user", preserveNullAndEmptyArrays: true } },
				{
					$project: {
						wallet_history: {
							"_id": "$_id",
							"updatedAt": "$updatedAt",
							"createdAt": "$createdAt",
							"from": "$from",
							"activity": "$activity",
							"type": "$type",
							"timestamp": "$timestamp",
							"amount": "$amount",
							"status": "$status",
							"activity_type": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$activity_user", ''] }, ''] }] }, "user", 'orders'] },
							"activity_details": { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$activity_user", ''] }, ''] }] }, "$activity_user", "$activity_details"] },
							"reason": "$reason",
						}
					}
				},
				{
					$group: { _id: null, "wallet_history": { $push: "$wallet_history" } }
				}
			];
			db.GetAggregation('driver_wallet', searchQuery, function (err, docdata) {
				if (typeof docdata != 'undefined' && docdata.length > 0) {
					if (typeof docdata[0].wallet_history != 'undefined') {
						socket.emit("r2e_get_wallet_history_usage", { err: '', message: '', 'wallet_history': docdata[0].wallet_history });
					} else {
						socket.emit("r2e_get_wallet_history_usage", { err: '', message: '', 'wallet_history': [] });
					}
				} else {
					socket.emit("r2e_get_wallet_history_usage", { err: '', message: '', 'wallet_history': [] });
				}
			});
		});
		socket.on('r2e_get_wallet_history_usage_count', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_get_wallet_history_usage_count', { err: 1, message: "some key value missing." });
				return;
			}
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit('r2e_get_wallet_history_usage_count', { err: 1, msg: 'Invalid From Id' });
					return;
				}
			} else {
				socket.emit('r2e_get_wallet_history_usage_count', { err: 1, msg: 'Invalid From Id' });
				return;
			}
			var matchCondition = { $match: { "status": 1, 'from': mongoose.Types.ObjectId(from), $or: [{ 'type': { $eq: 'admin_removed_wallet_point' } }, { 'type': { $eq: 'driver_order_delivery' } }] } };
			var searchQuery = [matchCondition,
				{ $project: { "_id": "$_id" } },
				{ $group: { _id: null, "count": { "$sum": 1 } } }
			];
			db.GetAggregation('driver_wallet', searchQuery, function (err, docdata) {
				if (typeof docdata != 'undefined' && docdata.length > 0) {
					if (typeof docdata[0].count != 'undefined') {
						socket.emit("r2e_get_wallet_history_usage_count", { err: '', message: '', 'count': docdata[0].count });
					} else {
						socket.emit("r2e_get_wallet_history_usage_count", { err: '', message: '', 'count': 0 });
					}
				} else {
					socket.emit("r2e_get_wallet_history_usage_count", { err: '', message: '', 'count': 0 });
				}
			});
		});
		socket.on('r2e_get_current_order', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_get_current_order', { err: 1, message: "some key value missing." });
				return;
			}
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit('r2e_get_current_order', { err: 1, msg: 'Invalid From Id' });
					return;
				}
			} else {
				socket.emit('r2e_get_current_order', { err: 1, msg: 'Invalid From Id' });
				return;
			}
			db.GetOneDocument('orders', { user_id: from }, {}, { sort: { created_time: -1 } }, function (err, docdata) {
				if (err || !docdata) {
					socket.emit('r2e_get_current_order', { err: 1, msg: "Record Not Found", error: err });
				} else {
					if (docdata && typeof docdata._id != 'undefined') {
						db.GetOneDocument('users', { _id: docdata.user_id }, {}, {}, function (err, userDetails) {
							if (err || !userDetails) {
								socket.emit('r2e_get_current_order', { err: 1, msg: "Record Not Found", error: err });
							} else {
								db.GetOneDocument('restaurant', { _id: docdata.restaurant_id }, {}, {}, function (err, restaurantDetails) {
									if (err || !restaurantDetails) {
										socket.emit('r2e_get_current_order', { err: 1, msg: "Record Not Found", error: err });
									} else {
										var foodcounts = 0;
										if (typeof docdata != 'undefined' && typeof docdata.foods != 'undefined' && docdata.foods.length > 0) {
											for (var j = 0; j < docdata.foods.length; j++) {
												foodcounts = foodcounts + docdata.foods[j].quantity || 0;
											}
										}
										var grand_total = 0;
										if (typeof docdata != 'undefined' && typeof docdata.billings != 'undefined' && typeof docdata.billings.amount != 'undefined' && typeof docdata.billings.amount.grand_total != 'undefined') {
											grand_total = docdata.billings.amount.grand_total;
										}
										var response = { 'foodcounts': foodcounts, 'grand_total': grand_total, "order_id": docdata.order_id, "res_loc": restaurantDetails.location, "user_loc": docdata.location }
										socket.emit('r2e_get_current_order', { err: 0, msg: "", response: response });

									}
								})
							}
						})
					} else {
						socket.emit('r2e_get_current_order', { err: 1, msg: "Record Not Found" });
					}
				}
			});
		})
		socket.on('r2e_check_inactive_status', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_check_inactive_status', { err: 1, message: "some key value missing." });
				return;
			}
			var from;
			if (typeof data.from != 'undefined') {
				if (isObjectId(data.from)) {
					from = new mongoose.Types.ObjectId(data.from);
				} else {
					socket.emit('r2e_check_inactive_status', { err: 1, msg: 'Invalid From Id' });
					return;
				}
			} else {
				socket.emit('r2e_check_inactive_status', { err: 1, msg: 'Invalid From Id' });
				return;
			}
			var type;
			if (typeof data.type != 'undefined') {
				type = data.type;
			} else {
				socket.emit('r2e_check_inactive_status', { err: 1, msg: 'Invalid type key' });
				return;
			}
			var collection;
			if (type == 'users') {
				collection = 'users';
			} else if (type == 'restaurant') {
				collection = 'restaurant';
			} else if (type == 'drivers') {
				collection = 'drivers';
			}
			db.GetOneDocument(collection, { _id: from }, { status: 1 }, {}, function (err, userDetails) {
				if (err || !userDetails) {
					socket.emit('r2e_check_inactive_status', { err: 1, msg: "Record Not Found", error: err });
				} else {
					if (userDetails.status == 2) {
						if (type == 'users') {
							io.of('/chat').in(from).emit('r2e_check_inactive_status', { err: 0, userId: from, status: userDetails.status });
						} else if (type == 'restaurant') {
							io.of('/chat').in(from).emit('r2e_check_inactive_status', { err: 0, userId: from, status: userDetails.status });
						} else if (type == 'drivers') {
							io.of('/chat').in(from).emit('r2e_check_inactive_status', { err: 0, userId: from, status: userDetails.status });
						}
					}
				}
			})
		});

		socket.on('r2e_delete_cart', function (data) {
			if (typeof data == 'undefined' || data == null) {
				socket.emit('r2e_delete_cart', { err: 1, message: "some key value missing." });
				return;
			}
			var type;
			if (typeof data.type != 'undefined') {
				type = data.type
			} else {
				socket.emit('r2e_delete_cart', { err: 1, msg: 'Invalid Type' });
				return;
			}

			var userId;
			if (typeof data.userId != 'undefined') {
				if (isObjectId(data.userId) && type == 'cart') {
					userId = new mongoose.Types.ObjectId(data.userId);
				} else if (type == 'temp_cart') {
					userId = data.userId;
				} else {
					socket.emit('r2e_delete_cart', { err: 1, msg: 'Invalid User Id' });
					return;
				}
			} else {
				socket.emit('r2e_delete_cart', { err: 1, msg: 'Invalid User Id' });
				return;
			}

			var collection;
			if (type == 'cart') {
				collection = 'cart';
			} else if (type == 'temp_cart') {
				collection = 'temp_cart';
			}

			var condition = { user_id: userId };
			db.DeleteDocument(collection, condition, function (err, res) { });
			socket.emit('r2e_delete_cart', { err: 0, msg: "", response: 'success' });
		})


	});


};