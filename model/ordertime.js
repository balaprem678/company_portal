module.exports = function (io) {
	var db = require('../controller/adaptor/mongodb.js');
	var async = require("async");
	var mail = require('../model/mail.js');
	var mailcontent = require('../model/mailcontent.js');
	var timezone = require('moment-timezone');
	var push = require('../model/pushNotification.js')(io);
	var CONFIG = require('../config/config');
	var stripe = require('stripe')('');
	return {
		orderReminder: function orderReminder(order_ids, callback) {
			async.parallel({
				settings: function (callback) {
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						callback(err, settings.settings);
					});
				}
			}, function (err, result) {
				if (!err || result) {
					var reminder = parseInt(result.settings.time_out);
					var adminreminder = reminder * 60 * 1000;
					setTimeout(function () {
						//**code here
						db.GetOneDocument('orders', { order_id: order_ids }, {}, {}, function (err, ordersDetails) {
							if (ordersDetails && typeof ordersDetails.status != 'undefined' && ordersDetails.status == 1) {
								if (err || !ordersDetails) {
									//res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
								} else {
									db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
										if (err || !transactionDetails) {
											//res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
										} else {
											db.GetOneDocument('restaurant', { _id: ordersDetails.restaurant_id }, {}, {}, function (err, rest) {
												if (err || !rest) {
													//res.send({ "status": 0, "errors": 'Error in restaurant..!' });
												}
												else {
													db.GetOneDocument('users', { _id: ordersDetails.user_id }, {}, {}, function (err, user) {
														if (err || !user) {
															//res.send({ "status": 0, "errors": 'Error in user..!' });
														} else {
															if (transactionDetails.type == 'stripe') {
																db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
																	if (err || !paymentgateway.settings.secret_key) {
																	} else {
																		stripe.setApiKey(paymentgateway.settings.secret_key);
																		var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
																		if (charge_index != -1) {
																			var charge_id = transactionDetails.transactions[charge_index].gateway_response.id;
																			stripe.refunds.create({
																				charge: charge_id,
																			}, function (err, refund) {
																				if (err) {
																				} else {
																					db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason:'Cancelled due to timeout.'}, {}, function (err, response) {
																						if (err || response.nModified == 0) {
																						} else {
																							var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																							db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																								if (err || responses.nModified == 0) {
																									//res.send({ "status": "0", "errors": "Error in refunds creation.!" });
																								} else {
																									var android_user = user._id;
																									var rest_name = rest.restaurantname;
																									var message = rest_name + ' ' + CONFIG.NOTIFICATION.RESTAURANT_FAILED;
																									var response_time = 250;
																									var options = [order_ids, android_user];
																									for (var i = 1; i == 1; i++) {
																										push.sendPushnotification(android_user, message, 'order_failed', 'ANDROID', options, 'USER', function (err, response, body) {
																										});
																									}
																									io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																								}
																							})
																						}
																					})
																				}
																			})	
																		} else {
																			//res.send({ "status": 0, "errors": 'Invalid Error, Please check your data' });
																		}
																	}
																})
															}else if (transactionDetails.type == 'paypal') {
																var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.intent }).indexOf('authorize');
																if (charge_index != -1) {
																	if (typeof transactionDetails.transactions[charge_index].gateway_response.transactions != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources != 'undefined' && transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources.length > 0 && typeof transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization != 'undefined') {
																		var authorization_id = transactionDetails.transactions[charge_index].gateway_response.transactions[0].related_resources[0].authorization.id;
																		var api = require('paypal-rest-sdk');
																		api.authorization.void(authorization_id, function (error, refund) {
																			if (error) {
																				//res.send({ "status": "0", "errors": "Something went wrong.Please try again" });
																			} else {
																				db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason:'Cancelled due to timeout.'}, {}, function (err, response) {
																					if (err || response.nModified == 0) {
																						//res.send({ "status": "0", "errors": "Error in refunds creation.!" });
																					} else {
																						var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																						db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																							if (err || responses.nModified == 0) {
																								//res.send({ "status": "0", "errors": "Error in refunds creation.!" });
																							} else {
																								var android_user = user._id;
																								var rest_name = rest.restaurantname;
																								var message = rest_name + ' ' + CONFIG.NOTIFICATION.RESTAURANT_FAILED;
																								var response_time = 250;

																								var options = [order_ids, android_user];
																								//console.log('options', options)
																								for (var i = 1; i == 1; i++) {
																									push.sendPushnotification(android_user, message, 'order_failed', 'ANDROID', options, 'USER', function (err, response, body) {
																										//console.log('options-----------------------------------------------------------------')
																										//console.log('options', err, response, body)
																									});
																								}
																								io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																							}
																						})
																					}
																				})
																			}
																		})
																	}
																}
															}else if (transactionDetails.type == 'nopayment') {
																db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason:'Cancelled due to timeout.'}, {}, function (err, response) {
																	if (err || response.nModified == 0) {
																		//res.send({ "status": "0", "errors": "Error in refunds creation.!" });
																	} else {
																		var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																		db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																			if (err || responses.nModified == 0) {
																				//res.send({ "status": "0", "errors": "Error in refunds creation.!" });
																			} else {
																				var android_user = user._id;
																				var rest_name = rest.restaurantname;
																				var message = rest_name + ' ' + CONFIG.NOTIFICATION.RESTAURANT_FAILED;
																				var response_time = 250;

																				var options = [order_ids, android_user];
																				//console.log('options', options)
																				for (var i = 1; i == 1; i++) {
																					push.sendPushnotification(android_user, message, 'order_failed', 'ANDROID', options, 'USER', function (err, response, body) {
																						//console.log('options-----------------------------------------------------------------')
																						//console.log('options', err, response, body)
																					});
																				}
																				io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																			}
																		})
																	}
																})
															}
														}
													})
												}
											})
										}
									})
								}
							}
						});
					}, adminreminder);
					callback(err, result);
				}
			});
		}
	};
}
