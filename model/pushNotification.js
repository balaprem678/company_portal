module.exports = function (io) {
	var db = require('../controller/adaptor/mongodb.js');
	var FCM = require('fcm-node');
	return {
		sendPushnotification: function (regIds, message, action, type, urlval, app, callback) {
			db.GetOneDocument("settings", { "alias": "social_networks" }, {}, {}, function (err, socialsetting) {
				var settings = socialsetting && socialsetting.settings && socialsetting.settings.fcm_keys || {};
				var send_message = {};
				var data = {};
				send_message['message'] = message || '';
				send_message['action'] = action;
				if (urlval instanceof Array) {
					for (var i = 0; i < urlval.length; i++) {
						send_message['key' + i] = urlval[i];
						data['key' + i] = urlval[i];
					}
				} else {
					Object.keys(urlval).forEach(function (key, i) {
						send_message['key' + i] = urlval[key];
						data['key' + i] = urlval[key];
					});
				}
				data['message'] = message || '';
				data['action'] = action;
				var collection = '';
				if (app == 'DRIVER') {
					collection = 'drivers';
					type = 'drivers';
				} else if (app == 'USER') {
					collection = 'users';
					type = 'user';
				} else if (app == 'RESTAURANT') {
					collection = 'restaurant';
					type = 'restaurant';
				}
				db.GetDocument(collection, { '_id': regIds }, {}, {}, function (pushErr, pushRespo) {
					if (!pushErr && pushRespo[0]) {
						var notification = {};
						if (type == 'user') {
							notification.user = regIds;
						} else if (type == 'drivers') {
							notification.driver = regIds;
						}
						else if (type == 'restaurant') {
							notification.restaurant = regIds;
						}
						notification.type = type;
						notification.message = send_message.message;
						notification.raw_data = send_message;
						db.InsertDocument('notifications', notification, function (err, docdata) {
							if (!err) {
								var username = pushRespo[0].username;
								if (pushRespo[0].device_info) {
									if (pushRespo[0].device_info.device_type == "ios") {
										if (pushRespo[0].device_info.device_token && pushRespo[0].device_info.device_token != null && pushRespo[0].device_info.device_token != '') {
											var serverKey = '';
											if (collection == 'users') {
												serverKey = settings.ios_user;
											} else if (collection == 'drivers') {
												serverKey = settings.ios_driver;
											} else if (collection == 'restaurant') {
												serverKey = settings.ios_outlet;
											}
											var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
												to: pushRespo[0].device_info.device_token,
												notification: {
													title: send_message.message,
												},
												data: data
											};
											var fcm = new FCM(serverKey);
											fcm.send(message, function (err, response) {
												if (err) {
													console.log("Something has gone wrong!--IOS", err);
												} else {
													console.log("Successfully sent with response:--IOS", response);
												}
											});
										}
									} else {
										if (pushRespo[0].device_info.gcm && pushRespo[0].device_info.gcm != null && pushRespo[0].device_info.gcm != '') {
											var serverKey = '';
											if (collection == 'users') {
												serverKey = settings.ad_user;
											} else if (collection == 'drivers') {
												serverKey = settings.ad_driver;
											} else if (collection == 'restaurant') {
												serverKey = settings.ad_outlet;
											}

											var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
												to: pushRespo[0].device_info.gcm,
												/* notification: {
													title: "Title", 
													body: send_message.message 
												}, */
												data: { data: data }
											};

											var fcm = new FCM(serverKey);
											fcm.send(message, function (err, response) {
												if (err) {
													console.log("Something has gone wrong!", err);
												} else {
													console.log("Successfully sent with response: ", response);
												}
											});
										}
									}
								}
								callback("err", "httpResponse", send_message);
							}
						});
					}
				});
			})
		}
	};
};
