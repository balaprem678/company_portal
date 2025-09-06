
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




	// controller.getSettings= async function (req,res){
	//     try {
	//         console.log("hi where are they");
	//         const docdata = await db.GetOneDocument('settings', { alias: 'general' }, { 

	//         }, {});
	//         console.log(docdata,'docadataaaaaaaaasa');
	//         if(docdata.status===false){
	//                 res.send({ err: 1, message: 'Unable to fetch data', settings: {} })
	//         }else{
	//             console.log("hiiii");
	//             var settings = docdata.doc.settings;
	//                 var server_offset = (new Date).getTimezoneOffset();
	//                 settings.offset = server_offset;
	//                 var jstz = require('jstimezonedetect');
	//                 var server_time_zone = jstz.determine().name();
	//                 settings.server_time_zone = server_time_zone;
	//                 settings.with_otp = settings.with_otp ? settings.with_otp : 1;
	//                 settings.with_password = settings.with_password ? settings.with_password : 0;
	//                 var data = {};
	//                 data.error=false
	//                 data.message = "Settings retrieved successfully";
	//                 data.data = settings;
	//                 console.log(data,'data...');
	//                 res.send(data);
	//         }
	//         // Use docdata for further processing
	//     } catch (error) {
	//         console.error('Error:', error);
	//         // Handle the error
	//     }
	// }

	controller.getFavourites = async function (req, res) {

		try {
			var condition = {};
			if (typeof req.body.search == 'undefined' || typeof req.body.search == null) {
				// data.status = 0;
				// data.message = 'search is requird';
				// return res.send(data);
				condition =
				{
					// $match: { 
					user_id: new mongoose.Types.ObjectId(req.body.user_id)
					// } 
				}
			} else {
				var searchs = req.body.search;

				condition['$and'] = []
				condition['$and'].push(
					// {
					// $match: 
					{ status: { $eq: 1 }, name: { $regex: searchs + '.*', $options: 'si' }, user_id: new mongoose.Types.ObjectId(req.body.user_id) },
					// }
				)

			}


			const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
			if (settings.status === false) {
				res.send({ "status": "0", "errors": "Configure your app settings" });
			} else {

				var favouriteQuery = [
					{ $match: condition },
					// { 'user_id': new mongoose.Types.ObjectId(req.body.user_id) }
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
									$lookup: {
										from: "cart",
										let: { product_id: "$_id" },
										pipeline: [{
											$match: {
												$expr: {
													$and: [
														// { $eq: ["$$user_id", "$user_id"] },
														// { $eq: ["$$type_status", "$type_status"] },
														{ $in: ["$$product_id", "$cart_details.id"] }
													]
												}
											}
										}],
										as: "cart_details"
									},
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
										is_cart: { $cond: { if: { $gt: [{ $size: "$cart_details" }, 0] }, then: true, else: false } },
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
										quantity_size: 1,
										rating: 1,
										total_rating: 1,
										total_rating_users: 1,
										is_cart: 1,
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
										quantity_size: 1,
										rating: 1,
										total_rating: 1,
										total_rating_users: 1,
										is_cart: 1,
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
										filterSize: 1,
										rating: 1,
										total_rating: 1,
										total_rating_users: 1,
										is_cart: 1,
										discount_percentage: {
											$round: {
												$multiply: [
													{ $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
													100
												]
											}

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
							product: "$product",
							createdAt: 1
						}
					},
					{
						$group: {
							_id: "$_id",
							product_id: { "$first": "$product_id" },
							user_id: { "$first": "$user_id" },
							status: { "$first": "$status" },
							product: { "$first": "$product" },
							createdAt: { "$first": "$createdAt" }
						}
					},
					{ $sort: { createdAt: -1 } }

				]

				try {
					const favouritedata = await db.GetAggregation('favourite', favouriteQuery)

					if (favouritedata) {
						if (favouritedata.length > 0) {
							for (var i = 0; i < favouritedata.length; i++) {
								// favouritedata[i].product.currency = settings.settings && settings.settings.currency_symbol;
								if (favouritedata[i].product && favouritedata[i].product != null) {
									if (favouritedata[i].product.avatar != undefined) {
										image = settings.doc.settings.site_url + favouritedata[i].product.avatar.slice(2);
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
						res.send({ "message": 'Successfull.', error: false, data: favouritedata });
					} else {
						res.send({ "message": 'Sorry, favourite details not available.', error: true });
					}
				} catch (e) {
					console.log("error at favorites api", e)
				}

			}

		} catch (error) {
			console.log(error);
		}
	}


	controller.addFavourites = async function (req, res) {
		console.log(req.body, 'this is the___________');
		try {
			const favouritdoc = await db.GetOneDocument('favourite', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'product_id': new mongoose.Types.ObjectId(req.body.product_id) }, {}, {})
			console.log(favouritdoc, 'this is the doc');
			// if (favouritdoc) {
			if (favouritdoc.status === false) {
				if (favouritdoc.doc === 'Data Not found') {
					var insert_data = {};
					insert_data.user_id = req.body.user_id;
					insert_data.product_id = req.body.product_id;
					const insert = await db.InsertDocument('favourite', insert_data)
					if (!insert) {
						res.send({ "status": 0, "errors": "Something went wrong" });
					} else {
						res.send({ "status": 1, error: false, "message": "Added to favourite.", data: insert });
					}
				}
			} else {
				res.send({ "error": true, message: "Product is already added" });
			}
			// } else {
			// 	res.send({  errors: true,message:"Something went wrong "});
			// }
		} catch (error) {

		}
	}

	controller.updateFavourites = async function (req, res) {
		try {

		} catch (error) {

		}
	}

	controller.removeFavourites = async function (req, res) {
		try {
			const favouritdoc = await db.GetOneDocument('favourite', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'product_id': new mongoose.Types.ObjectId(req.body.product_id) }, {}, {})
			if (favouritdoc.status === false) {
				if (favouritdoc.doc === "Data Not found") {
					res.send({ "status": 0, error: true, "message": "No data found." });
				} else {
					res.send({ "status": 0, error: true, "message": "Something went wrong" });
				}
			} else {
				const deldata = await db.DeleteDocument('favourite', { 'user_id': new mongoose.Types.ObjectId(req.body.user_id), 'product_id': new mongoose.Types.ObjectId(req.body.product_id) })
				console.log(deldata);
				if (deldata.status === false) {
					res.send({ "status": 0, error: true, "message": "Something went wrong" });
				} else {
					res.send({ "status": 1, error: false, "message": "Removed from favourite." });
				}
			}
		} catch (error) {

		}
	}
	return controller;
}





