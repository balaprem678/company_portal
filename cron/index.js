var express = require('express');
var moment = require('moment');
var mongoose = require('mongoose');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();
var CronJob = require('node-cron');
var db = require('../controller/adaptor/mongodb.js');
var async = require("async");
var each = require('sync-each');
var mail = require('../model/mail.js');
var email = require('../controller/site/payment.js');
var mailcontent = require('../model/mailcontent.js');
var timezone = require('moment-timezone');
var CONFIG = require('../config/config');
var stripe = require('stripe')('');
var urlrequest = require('request');
var shiprocket = require('../controller/admin/users.js')
module.exports = function (io, app) {
	var push = require('../model/pushNotification.js')(io);
	var shiprocket = require('../controller/admin/users.js')(io)

	var job = CronJob.schedule('*/1 * * * *', async () => {
		orderTimeout();
		userRefer();
	})

	var orderStatus = CronJob.schedule('0 * * * *', async () => {
		console.log('Running scheduled task to update Shiprocket status for orders...');
		try {
			// Ensure the router function is invoked correctly
			await shiprocket.shiprocket_check_multiple_orders_status();
		} catch (error) {
			console.error('Error during cron job execution:', error);
		}
	});
    orderStatus.start()

	// var job = new CronJob({
	// 	cronTime: '*/1 * * * *', //Daily Cron Check @ 00:00
	// 	onTick: function () {
	// 		orderTimeout();
	// 		userRefer();
	// 	},
	// 	start: false,
	// 	//timeZone: 'America/Los_Angeles'
	// });
	var job1 = CronJob.schedule('*/15 * * * * *', async () => {
		orderTimeoutAlert();
		//timeZone: 'America/Los_Angeles'
	});
	var job2 =CronJob.schedule('* 10 */2 * * ',async()=>{
		subscribeUserSendMail()
		//timeZone: 'America/Los_Angeles'
	});
	function orderTimeoutAlert() {
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
			} else {
				var reminder = parseInt(settings.settings.time_out);
				var restaurant_alert_time = 0;
				if (typeof settings.settings.restaurant_alert_time != 'undefined') {
					restaurant_alert_time = parseInt(settings.settings.restaurant_alert_time);
				}
				if (restaurant_alert_time > 0) {
					db.GetDocument('orders', { restaurant_time_out_alert: 0, $or: [{ "status": 1 }, { "status": 15 }] }, {}, {}, function (err, orders) {
						if (err || !orders) {
						} else {
							if (orders.length > 0) {
								each(orders, function (ordersDetails, next) {
									var currentTime = Date.now();
									if (typeof ordersDetails.created_time != 'undefined') {
										var order_ids = ordersDetails.order_id;
										var different = currentTime - ordersDetails.schedule_time;
										if (!ordersDetails.schedule_type || ordersDetails.schedule_type == 0) {
											different = currentTime - ordersDetails.created_time;
										}
										var currentTime = Date.now();
										var option_time = (reminder * 60 * 1000 - restaurant_alert_time * 60 * 1000);
										var option_time1 = reminder * 60 * 1000;
										if ((different > option_time) && (different < option_time1)) {
											db.UpdateDocument('orders', { 'order_id': order_ids }, { restaurant_time_out_alert: 1 }, {}, function (err, response) {
												var noti_data = {};
												noti_data.rest_id = ordersDetails.restaurant_id;
												noti_data.order_id = ordersDetails.order_id;
												noti_data.user_id = ordersDetails.user_id;
												noti_data._id = ordersDetails._id;
												noti_data.order_type = ordersDetails.order_type;
												io.of('/chat').in(ordersDetails.restaurant_id).emit('restordertimeoutnotify', { restauranId: noti_data });
												io.of('/chat').in(ordersDetails.user_id).emit('userordertimeoutnotify', noti_data);
												io.of('/chat').emit('adminordertimeoutnotify', noti_data);
												next();
											})
										}
									} else {
										next();
									}
								}, function (err, transformedItems) {

								});
							}
						}
					})
				}
			}
		});
	}

	job1.start();
	function orderTimeout() {
		db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
			if (err || !settings) {
			} else {
				var reminder = parseInt(settings.settings.time_out);
				var restaurant_alert_time = 0;
				if (typeof settings.settings.restaurant_alert_time != 'undefined') {
					restaurant_alert_time = parseInt(settings.settings.restaurant_alert_time);
				}
				db.GetDocument('orders', { $or: [{ "status": 1 }, { "status": 15 }] }, {}, {}, function (err, orders) {
					if (err || !orders) {
					} else {
						if (orders.length > 0) {
							each(orders, function (ordersDetails, next) {
								console.log("ordersDetails.notify", ordersDetails.notify)
								if (typeof ordersDetails != 'undefined' && typeof ordersDetails.created_time != 'undefined') {
									var order_ids = ordersDetails.order_id;
									var currentTime = Date.now();
									var different = currentTime - ordersDetails.created_time;
									var option_time = reminder * 60 * 1000;
									if (!ordersDetails.schedule_type || ordersDetails.schedule_type == 0) {
										if (different > option_time) {
											db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
												if (err || !transactionDetails) {
													next();
												} else {
													db.GetOneDocument('city', { _id: ordersDetails.city_id }, {}, {}, function (err, rest) {
														if (err || !rest) {
															next();
														} else {
															db.GetOneDocument('users', { _id: ordersDetails.user_id }, {}, {}, function (err, user) {
																if (err || !user) {
																	next();
																} else {
																	if (transactionDetails.type == 'stripe') {
																		db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
																			if (err || !paymentgateway || !paymentgateway.settings || !paymentgateway.settings.secret_key) {
																				next();
																			} else {
																				stripe.setApiKey(paymentgateway.settings.secret_key);
																				var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
																				if (charge_index != -1) {
																					var charge_id = transactionDetails.transactions[charge_index].gateway_response.id;
																					stripe.refunds.create({
																						charge: charge_id,
																					}, function (err, refund) {
																						if (err) {
																							if (typeof err.raw != 'undefined' && typeof err.raw.type != 'undefined') {
																								if (err.raw.type == 'invalid_request_error') {
																									db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', repay: 1 }, {}, function (err, response) {
																									});
																								}
																							}
																							next();
																						} else {
																							db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																								if (err || response.nModified == 0) {
																									next();
																								} else {
																									var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																									db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																										if (err || responses.nModified == 0) {
																											next();
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
																											var noti_data = {};
																											noti_data.rest_id = ordersDetails.restaurant_id;
																											noti_data.order_id = ordersDetails.order_id;
																											noti_data.user_id = ordersDetails.user_id;
																											noti_data._id = ordersDetails._id;
																											noti_data.user_name = user.username;
																											noti_data.order_type = 'order_rejected';
																											io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																											io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																											io.of('/chat').emit('adminnotify', noti_data);
																											io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																											next();
																										}
																									})
																								}
																							})
																						}
																					})
																				} else {
																					next();
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
																						next();
																					} else {
																						db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																							if (err || response.nModified == 0) {
																								next();
																							} else {
																								var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																								db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																									if (err || responses.nModified == 0) {
																										next();
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
																										var noti_data = {};
																										noti_data.rest_id = ordersDetails.restaurant_id;
																										noti_data.order_id = ordersDetails.order_id;
																										noti_data.user_id = ordersDetails.user_id;
																										noti_data._id = ordersDetails._id;
																										noti_data.user_name = user.username;
																										noti_data.order_type = 'order_rejected';
																										io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																										io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																										io.of('/chat').emit('adminnotify', noti_data);
																										io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																										next();
																									}
																								})
																							}
																						})
																					}
																				})
																			} else {
																				next();
																			}
																		} else {
																			next();
																		}
																	} else if (transactionDetails.type == 'nopayment') {
																		db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																			if (err || response.nModified == 0) {
																				next();
																			} else {
																				var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																				db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																					if (err || responses.nModified == 0) {
																						next();
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
																						var noti_data = {};
																						noti_data.rest_id = ordersDetails.restaurant_id;
																						noti_data.order_id = ordersDetails.order_id;
																						noti_data.user_id = ordersDetails.user_id;
																						noti_data._id = ordersDetails._id;
																						noti_data.user_name = user.username;
																						noti_data.order_type = 'order_rejected';
																						io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																						io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																						io.of('/chat').emit('adminnotify', noti_data);
																						io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																						next();
																					}
																				})
																			}
																		})
																	} else if (transactionDetails.type == 'COD') {
																		db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																			if (err || response.nModified == 0) {
																				next();
																			} else {
																				var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: 'refund' } } };
																				db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																					if (err || responses.nModified == 0) {
																						next();
																					} else {
																						var android_user = user._id;
																						var rest_name = rest.restaurantname;
																						var message = rest_name + ' ' + CONFIG.NOTIFICATION.RESTAURANT_FAILED;
																						var response_time = 250;
																						var options = [order_ids, android_user];
																						// for (var i = 1; i == 1; i++) {
																						// 	push.sendPushnotification(android_user, message, 'order_failed', 'ANDROID', options, 'USER', function (err, response, body) {
																						// 	});
																						// }
																						var noti_data = {};
																						noti_data.rest_id = ordersDetails.city_id;
																						noti_data.order_id = ordersDetails.order_id;
																						noti_data.user_id = ordersDetails.user_id;
																						noti_data._id = ordersDetails._id;
																						noti_data.user_name = user.username;
																						noti_data.order_type = 'order_rejected';
																						//io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																						io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																						io.of('/chat').emit('adminnotify', noti_data);
																						io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																						if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
																							var refer_offer = ordersDetails.refer_offer;
																							db.UpdateDocument('users', { '_id': ordersDetails.user_id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
																						}


																						next();
																					}
																				})
																			}
																		})
																	} else if (transactionDetails.type == 'cashfree') {
																		db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'cashfree' }, {}, {}, function (err, paymentgateway) {
																			if (err || !paymentgateway) {
																				next();
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
																						'refundNote': 'Cancelled due to timeout.'
																					}
																				};
																				urlrequest(options, async (error, response) => {
																					let respo = JSON.parse(response.body) // { message: 'Refund has been initiated.', refundId: 5659, status: 'OK' }
																					if (error || !response || !respo || !respo.status || respo.status != "OK" || respo.status == "ERROR") {
																						next();
																					} else {
																						db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																							if (err || response.nModified == 0) {
																								next();
																							} else {
																								var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response_refund: respo } } };
																								db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																									if (err || responses.nModified == 0) {
																										next();
																									} else {
																										var android_user = user._id;
																										var rest_name = rest.restaurantname;
																										var message = rest_name + ' ' + CONFIG.NOTIFICATION.RESTAURANT_FAILED;
																										var response_time = 250;
																										var options = [order_ids, android_user];
																										// for (var i = 1; i == 1; i++) {
																										// 	push.sendPushnotification(android_user, message, 'order_failed', 'ANDROID', options, 'USER', function (err, response, body) {
																										// 	});
																										// }
																										var noti_data = {};
																										noti_data.rest_id = ordersDetails.city_id;
																										noti_data.order_id = ordersDetails.order_id;
																										noti_data.user_id = ordersDetails.user_id;
																										noti_data._id = ordersDetails._id;
																										noti_data.user_name = user.username;
																										noti_data.order_type = 'order_rejected';
																										//io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																										io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																										io.of('/chat').emit('adminnotify', noti_data);
																										io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																										next();
																									}
																								})
																							}
																						})
																					}
																				})
																			}
																		})
																	} else {
																		next();
																	}
																}
															})
														}
													})
												}
											})
										} else {
											next();
										}
									} else {
										var different = currentTime - ordersDetails.schedule_time;
										if (different > option_time) {
											db.GetOneDocument('transaction', { "_id": ordersDetails.transaction_id, mode: 'charge' }, {}, {}, function (err, transactionDetails) {
												if (err || !transactionDetails) {
													next();
												} else {
													db.GetOneDocument('city', { _id: ordersDetails.city_id }, {}, {}, function (err, rest) {
														if (err || !rest) {
															next();
														} else {
															db.GetOneDocument('users', { _id: ordersDetails.user_id }, {}, {}, function (err, user) {
																if (err || !user) {
																	next();
																} else {
																	if (transactionDetails.type == 'stripe') {
																		db.GetOneDocument('paymentgateway', { status: { $eq: 1 }, alias: 'stripe' }, {}, {}, function (err, paymentgateway) {
																			if (err || !paymentgateway || !paymentgateway.settings || !paymentgateway.settings.secret_key) {
																				next();
																			} else {
																				stripe.setApiKey(paymentgateway.settings.secret_key);
																				var charge_index = transactionDetails.transactions.map(function (e) { return e.gateway_response.object }).indexOf('charge');
																				if (charge_index != -1) {
																					var charge_id = transactionDetails.transactions[charge_index].gateway_response.id;
																					stripe.refunds.create({
																						charge: charge_id,
																					}, function (err, refund) {
																						if (err) {
																							if (typeof err.raw != 'undefined' && typeof err.raw.type != 'undefined') {
																								if (err.raw.type == 'invalid_request_error') {
																									db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', repay: 1, cancel_due_to: '0' }, {}, function (err, response) {
																									});
																								}
																							}
																							next();
																						} else {
																							db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																								if (err || response.nModified == 0) {
																									next();
																								} else {
																									var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																									db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																										if (err || responses.nModified == 0) {
																											next();
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
																											var noti_data = {};
																											noti_data.rest_id = ordersDetails.restaurant_id;
																											noti_data.order_id = ordersDetails.order_id;
																											noti_data.user_id = ordersDetails.user_id;
																											noti_data._id = ordersDetails._id;
																											noti_data.user_name = user.username;
																											noti_data.order_type = 'order_rejected';
																											io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																											io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																											io.of('/chat').emit('adminnotify', noti_data);
																											io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																											next();
																										}
																									})
																								}
																							})
																						}
																					})
																				} else {
																					next();
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
																						next();
																					} else {
																						db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																							if (err || response.nModified == 0) {
																								next();
																							} else {
																								var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																								db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																									if (err || responses.nModified == 0) {
																										next();
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
																										var noti_data = {};
																										noti_data.rest_id = ordersDetails.restaurant_id;
																										noti_data.order_id = ordersDetails.order_id;
																										noti_data.user_id = ordersDetails.user_id;
																										noti_data._id = ordersDetails._id;
																										noti_data.user_name = user.username;
																										noti_data.order_type = 'order_rejected';
																										io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																										io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																										io.of('/chat').emit('adminnotify', noti_data);
																										io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																										next();
																									}
																								})
																							}
																						})
																					}
																				})
																			} else {
																				next();
																			}
																		} else {
																			next();
																		}
																	} else if (transactionDetails.type == 'nopayment') {
																		db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																			if (err || response.nModified == 0) {
																				next();
																			} else {
																				var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: refund } } };
																				db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																					if (err || responses.nModified == 0) {
																						next();
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
																						var noti_data = {};
																						noti_data.rest_id = ordersDetails.restaurant_id;
																						noti_data.order_id = ordersDetails.order_id;
																						noti_data.user_id = ordersDetails.user_id;
																						noti_data._id = ordersDetails._id;
																						noti_data.user_name = user.username;
																						noti_data.order_type = 'order_rejected';
																						io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																						io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																						io.of('/chat').emit('adminnotify', noti_data);
																						io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																						next();
																					}
																				})
																			}
																		})
																	} else if (transactionDetails.type == 'COD') {
																		db.UpdateDocument('orders', { 'order_id': order_ids }, { status: 2, cancellationreason: 'Cancelled due to timeout.', cancel_due_to: '0' }, {}, function (err, response) {
																			if (err || response.nModified == 0) {
																				next();
																			} else {
																				var updatedoc = { 'mode': 'refund', $push: { 'transactions': { gateway_response: 'refund' } } };
																				db.UpdateDocument('transaction', { '_id': ordersDetails.transaction_id }, updatedoc, {}, function (err, responses) {
																					if (err || responses.nModified == 0) {
																						next();
																					} else {
																						var android_user = user._id;
																						var rest_name = rest.cityname;
																						var message = rest_name + ' ' + CONFIG.NOTIFICATION.RESTAURANT_FAILED;
																						var response_time = 250;
																						var options = [order_ids, android_user];
																						// for (var i = 1; i == 1; i++) {
																						// 	push.sendPushnotification(android_user, message, 'order_failed', 'ANDROID', options, 'USER', function (err, response, body) {
																						// 	});
																						// }
																						var noti_data = {};
																						noti_data.rest_id = ordersDetails.city_id;
																						noti_data.order_id = ordersDetails.order_id;
																						noti_data.user_id = ordersDetails.user_id;
																						noti_data._id = ordersDetails._id;
																						noti_data.user_name = user.username;
																						noti_data.order_type = 'order_rejected';
																						//io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
																						io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
																						io.of('/chat').emit('adminnotify', noti_data);
																						io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
																						if (typeof ordersDetails.refer_offer != "undefined" && typeof ordersDetails.refer_offer.expire_date != "undefined") {
																							var refer_offer = ordersDetails.refer_offer;
																							db.UpdateDocument('users', { '_id': ordersDetails.user_id }, { $push: { refer_activity: refer_offer } }, {}, function (err, referrer) { });
																						}

																						next();
																					}
																				})
																			}
																		})
																	} else {
																		next();
																	}
																}
															})
														}
													})
												}
											})
										} else if (different > 0 && (!ordersDetails.notify || ordersDetails.notify == 0)) {
											console.log('inside notify')
											db.UpdateDocument('orders', { 'order_id': order_ids }, { notify: 1 }, {}, function (err, response) {
												if (err || response.nModified == 0) {
													next();
												} else {
													db.GetOneDocument('users', { _id: ordersDetails.user_id, status: { $eq: 1 } }, {}, {}, function (err, user) {
														if (err || !user) {
															next();
														} else {
															var android_restaurant = ordersDetails.restaurant_id;
															var message = CONFIG.NOTIFICATION.ORDER_RECEIVED;
															var response_time = CONFIG.respond_timeout;
															var action = 'order_request';
															var options = [ordersDetails.order_id, android_restaurant, response_time, action];
															// for (var i = 1; i == 1; i++) {
															// 	push.sendPushnotification(android_restaurant, message, 'order_request', 'ANDROID', options, 'RESTAURANT', function (err, response, body) { });
															// }
															var mail_data = {};
															mail_data.user_id = ordersDetails.user_id;
															mail_data.order_id = ordersDetails._id;
															email.res_send(mail_data, function (result) { });
															var mail_data = {};
															mail_data.user_id = ordersDetails.user_id;
															mail_data.order_id = ordersDetails._id;
															email.admin_send(mail_data, function (result) { });
															var noti_data = {};
															noti_data.rest_id = ordersDetails.restaurant_id;
															noti_data.order_id = ordersDetails.order_id;
															noti_data.user_id = ordersDetails.user_id;
															noti_data._id = ordersDetails._id;
															noti_data.user_name = user.username;
															noti_data.order_type = 'user';
															//io.of('/chat').in(ordersDetails.restaurant_id).emit('restnotify', { restauranId: noti_data });
															io.of('/chat').in(ordersDetails.user_id).emit('usernotify', noti_data);
															io.of('/chat').emit('adminnotify', noti_data);
															io.of('/chat').in(ordersDetails._id).emit('OrderUpdated', { orderId: ordersDetails._id });
															next();
														}
													});
												}
											});
										} else {
											next();
										}
									}
								} else {
									next();
								}
							}, function (err, transformedItems) {

							});
						}
					}
				})
			}
		});
	}

	function userRefer() {
		db.GetDocument('users', { $or: [{ "status": 1 }, { "status": 15 }] }, {}, {}, function (err, users) {
			if (err || !users) {
			} else {
				if (users.length > 0) {
					each(users, function (userdata, next) {
						if (userdata.initoffer != undefined || (typeof userdata.refer_activity != undefined && userdata.refer_activity.length > 0)) {
							var currentTime = Date.now();
							if (userdata.initoffer && userdata.initoffer.expire_date < currentTime) {
								db.UpdateDocument('users', { '_id': userdata._id }, { $unset: { initoffer: "" } }, {}, function (err, referrer) { });
							}
							if (userdata.refer_activity != undefined && userdata.refer_activity.length > 0) {
								db.UpdateDocument('users', { '_id': userdata._id }, { $pull: { refer_activity: { expire_date: { $lte: currentTime } } } }, {}, function (err, referrer) { });
							}
							next();
						} else {
							next();
						}
					});
				}
			}
		});
	}
	job.start();
	job2.start();

	function subscribeUserSendMail() {
		db.GetDocument('subscribe', { status: 1 }, {}, {}, (error, docData) => {
			if (error) {
				console.log("Error exception **cron** subscribeUserSendMail", error.message)
			} else {
				if (docData && docData.length > 0) {
					var query = [
						{ $match: { status: 1, offer_status: 1, offer_amount: { $gt: 0 } } },
						{
							$group: {
								"_id": null,
								"max_offer": { $max: "$offer_amount" },
								"base_price": { "$first": "$base_price" },
								"sale_price": { "$first": "$sale_price" },
								"avatar": { "$first": "$avatar" },
								"name": { "$first": "$name" },
							}
						},
						{
							$project: {
								offer_amount: "$max_offer",
								base_price: 1,
								sale_price: 1,
								avatar: 1,
								name: 1
							}
						},
						{ $sort: { createdAt: -1 } },
						{
							$sample: { size: 1 }
						}
					]
					db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
						if (err) {
							console.log("Error exception **Cron** subscribeUserSendMail", err.message)
						} else {
							db.GetAggregation('food', query, (err, doc) => {
								if (err) {
									console.log('Error exception **CRON** subscribeUserSendMail', err.message)
								} else {
									if (doc && doc.length > 0) {
										var data = doc[0];
										var mrb_price = data.sale_price;
										var s_price = parseInt(data.sale_price - ((data.sale_price * data.offer_amount) / 100));
										var image = settings.settings.site_url + data.avatar.slice(2);
										var p_name = data.name;
										var url = settings.settings.site_url;
										var currency_symbol = settings.settings.currency_symbol
										each(docData, function (subscrb, next) {
											var split = subscrb.email.split('@');
											var name = split[0]
											var mailData = {};
											mailData.template = 'best_offer_to_user';
											mailData.to = subscrb.email;
											mailData.html = [];
											mailData.html.push({ name: 'name', value: name || "" });
											mailData.html.push({ name: 'product_name', value: p_name || "" });
											mailData.html.push({ name: 'sale_price', value: s_price || "" });
											mailData.html.push({ name: 'mrb_price', value: mrb_price || "" });
											mailData.html.push({ name: 'offer_amount', value: data.offer_amount || "" });
											mailData.html.push({ name: 'image', value: image || "" });
											mailData.html.push({ name: 'link', value: url || "" });
											mailData.html.push({ name: 'currency', value: currency_symbol || "" });
											mailcontent.sendmail(mailData, function (err, response) { });
											next()

										})
									} else {
										var query = [
											// {$match: {status: 1, $or:[{expensive: {$eq : 1}},{offer_amount: {$gt: 0}}]}},
											{ $match: { status: 1, $or: [{ expensive: { $eq: 1 } }, { expensive: { $eq: 0 } }] } },
											{
												$project: {
													offer_status: 1,
													offer_amount: 1,
													base_price: 1,
													sale_price: 1,
													avatar: 1,
													name: 1
												}
											},
											{ $sort: { createdAt: -1 } },
											{
												$sample: { size: 1 }
											}
										]
										db.GetAggregation('food', query, (err, doc1) => {
											if (err) {
												console.log("Error exception **Cron** subscribeUserSendMail", err.message)
											} else {
												if (doc1 && doc1.length > 0) {
													var data = doc1[0];
													var mrb_price = data.sale_price;
													var s_price = parseInt(data.sale_price - ((data.sale_price * data.offer_amount) / 100));
													var image = settings.settings.site_url + data.avatar.slice(2);
													var p_name = data.name;
													var url = settings.settings.site_url;
													var currency_symbol = settings.settings.currency_symbol
													each(docData, function (subscrb, next) {
														var split = subscrb.email.split('@');
														var name = split[0]
														var mailData = {};
														mailData.template = 'best_offer_to_user';
														mailData.to = subscrb.email;
														mailData.html = [];
														mailData.html.push({ name: 'name', value: name || "" });
														mailData.html.push({ name: 'product_name', value: p_name || "" });
														mailData.html.push({ name: 'sale_price', value: s_price || "" });
														mailData.html.push({ name: 'mrb_price', value: mrb_price || "" });
														mailData.html.push({ name: 'offer_amount', value: data.offer_amount || "" });
														mailData.html.push({ name: 'image', value: image || "" });
														mailData.html.push({ name: 'link', value: url || "" });
														mailData.html.push({ name: 'currency', value: currency_symbol || "" });
														mailcontent.sendmail(mailData, function (err, response) { });
														next()

													})
												}
											}
										})
									}
								}
							})
						}
					})

				}
			}
		})
	}



}