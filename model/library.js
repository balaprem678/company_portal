var http = require('http');
var async = require("async");
var fs = require("fs");
var mongoose = require("mongoose");
var isObjectId = (n) => {
	return mongoose.Types.ObjectId.isValid(n);
}
var db = require('../controller/adaptor/mongodb.js');
const sharp = require('sharp');
const CONFIG = require('../config/config.js');
const path = require('path');
function randomString(length, chars) {
	var mask = '';
	if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
	if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	if (chars.indexOf('#') > -1) mask += '0123456789';
	if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
	var result = '';
	for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
	return result;
}
function getlanguage(req, converter, original) {
	if (req) {
		var text = req.__(converter);
		if (typeof text == 'undefined' || text == converter) {
			return original;
		} else {
			return text;
		}
	} else {
		return original;
	}
}
async function base64Upload(data,callback) {
	fs.writeFile(data.file, data.base64, { encoding: 'base64' }, function (err) {
		if (err) {
			callback(err, null);
		} else {
			callback(null, { 'status': 1, 'image': data.file });
		}
	});
	// const upload=   fs.writeFile(data.file, data.base64, { encoding: 'base64' })
	// console.log(upload,'this is upload');
	// function (err) {
	// 	if (err) {
	// 		callback(err, null);
	// 	} else {
	// 		callback(null, { 'status': 1, 'image': data.file });
	// 	}
	// });
}


// async function handleBase64Upload(base64Image,directory) {
//     // Check if the base64 string is valid
//     if (!base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)) {
//         throw new Error('Invalid base64 format');
//     }

//     // Extract base64 data
//     const base64 = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)[2];
//     const buffer = Buffer.from(base64, 'base64'); // Convert base64 to buffer
//     const fileName = `${Date.now()}-${Math.floor(100 + Math.random() * 900)}.webp`;
//     const file = path.join(directory || CONFIG.DIRECTORY_FOOD, fileName);

//     // Use sharp to convert the image to WebP and save it
//     await sharp(buffer)
//         .webp({ quality: 80 }) // Set quality as needed
//         .toFile(file);

//     return file; // Return the path to the saved WebP file
// }

async function handleBase64Upload(base64Image, directory) {
    // Validate base64 string
    if (!base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)) {
        throw new Error('Invalid base64 format');
    }

    const base64 = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)[2];
    const buffer = Buffer.from(base64, 'base64');

    const fileName = `${Date.now()}-${Math.floor(100 + Math.random() * 900)}.webp`;

    if (typeof directory !== 'string') {
        console.warn('Invalid directory value:', directory);
        directory = CONFIG.DIRECTORY_FOOD;  // Fallback to config directory
    }

    const file = path.join(directory, fileName);  // Join the path safely

    // Use sharp to convert the image to WebP and save it
    await sharp(buffer)
        .webp({ quality: 80 })
        .toFile(file);

    return file;
}

function timeDifference(a, b) {
	var timediff = {};
	var jobTime = '';
	if (a.diff(b, 'years') != 0) {
		timediff = { type: 'years', value: a.diff(b, 'years') };
	} else if (a.diff(b, 'months') != 0) {
		timediff = { type: 'months', value: a.diff(b, 'months') };
	} else if (a.diff(b, 'days') != 0) {
		timediff = { type: 'days', value: a.diff(b, 'days') };
	} else if (a.diff(b, 'minutes') != 0) {
		timediff = { type: 'minutes', value: a.diff(b, 'minutes') };
	} else {
		timediff = { type: 'seconds', value: a.diff(b, 'seconds') };
	}
	if (timediff.value > 0) {
		timeWord = timediff.value + ' ' + timediff.type + ' later';
	} else {
		timeWord = Math.abs(timediff.value) + ' ' + timediff.type + ' ago';
	}
	return timeWord;
}

function inArray(search, array) {
	var length = array.length;
	for (var i = 0; i < length; i++) {
		if (array[i] == search) return true;
	}
	return false;
}

function exchangeRates(from, to, callback) {
	async.parallel({
		google: function (callback) {
			http.get({
				protocol: 'http:',
				host: 'www.google.com',
				path: '/finance/converter?a=1&from=' + from + '&to=' + to
			}, function (response) {
				var body = '';
				response.on('data', function (d) {
					body += d;
				});
				response.on('end', function () {
					var conversion = body.match(/<span class=bld>(.*)<\/span>/);
					var rate = conversion[1].replace(/[^0-9.]/g, "");
					callback(null, rate);
				})
					.on('error', function (error) {
						callback(error, null);
					});
			});
		},
		yahoo: function (callback) {
			http.get({
				protocol: 'http:',
				host: 'download.finance.yahoo.com',
				path: '/d/quotes.csv?s=' + from + to + '=X&f=l1'
			}, function (response) {
				var body = '';
				response.on('data', function (d) {
					body += d;
				});
				response.on('end', function () {
					var rate = body.replace(/[^0-9.]/g, "");
					callback(null, rate);
				})
					.on('error', function (error) {
						callback(error, null);
					});
			});
		}
	}, function (err, result) {
		callback(err, result);
	});
}

String.prototype.capitalizeFirstLetter = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function userRegister(data, callback) {
	/*
	async.waterfall([
		function (callback) {
			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
				if (err || !settings) { data.response = 'Configure your website settings'; res.send(data); }
				else { callback(err, settings.settings); }
			});
		},
		function (settings, callback) {
			db.GetDocument('emailtemplate', { name: data.template, 'status': { $ne: 0 } }, {}, {}, function (err, template) {

				if (err || !template) { data.response = 'Unable to get email template'; res.send(data); }
				else { callback(err, settings, template); }
			});
		}
	],
		function (err, settings, template) {
			var html = template[0].email_content;
			html = html.replace(/{{privacy}}/g, settings.site_url + 'page/privacypolicy');
			html = html.replace(/{{terms}}/g, settings.site_url + 'page/termsandconditions');
			html = html.replace(/{{contactus}}/g, settings.site_url + 'contact_us');
			html = html.replace(/{{senderemail}}/g, template[0].sender_email);
			html = html.replace(/{{sendername}}/g, template[0].sender_name);
			html = html.replace(/{{logo}}/g, settings.site_url + settings.logo);
			html = html.replace(/{{site_title}}/g, settings.site_title);
			html = html.replace(/{{email_title}}/g, settings.site_title);
			html = html.replace(/{{email_address}}/g, settings.email_address);

			for (i = 0; i < data.html.length; i++) {
				var regExp = new RegExp('{{' + data.html[i].name + '}}', 'g');
				html = html.replace(regExp, data.html[i].value);
			}

			if (data.to) {
				var tomail = data.to;
			} else {
				var tomail = template[0].sender_email;
			}

			var mailOptions = {
				from: template[0].sender_email,
				to: tomail,
				subject: template[0].email_subject,
				text: html,
				html: html
			};

			mail.send(mailOptions, function (err, response) { callback(err, response); });

		});
		*/
}

var getMapApi = () => {
	db.GetOneDocument('settings', {"alias": "social_networks" }, {}, {}, (err, settings) => {
		if (err || !settings) {
			return '';
		} else {
			return settings.settings.map_api.web_key;
		}
	})
}

var cleartemp = (data) => {
	if (data && isObjectId(data.id)) {
		db.GetOneDocument('temporders', { _id: data.id }, { transaction_id: 1 }, {}, (err, order) => {
			if (err || !order) {
				return '';
			} else {
				if (data.type == 1) {
					db.DeleteDocument('transaction', { _id: order.transaction_id }, (err, respo) => { });
				}
				db.DeleteDocument('temporders', { _id: data.id }, (err, respo) => { });
				return '';
			}
		})
	} else {
		return '';
	}
}

var rewardUpdate = async (data) => {
	return new Promise((resolve, reject) => {
		let response = { status: 0, reached: 0 };
		if (Array.isArray(data) && data.length > 0) {
			db.GetOneDocument('settings', { alias: 'rewards' }, {}, {}, (err, settings) => {
				if (err || !settings || settings.settings === undefined) {
					resolve(response);
				} else {
					db.GetOneDocument('users', { _id: data[0].UserDetails[0]._id }, { reached_points: 1, mark_status: 1, current_points: 1, next_points: 1, start_time: 1 }, {}, (err, userDetails) => {
						if (err || !userDetails || userDetails._id === undefined) {
							resolve(response);
						} else {
							if (settings.settings.days && settings.settings.days > 0 && userDetails.start_time > 0) {
								userDetails.start_time = userDetails.start_time + (settings.settings.days * 86400000);
								if (userDetails.start_time < Date.now()) {
									userDetails.start_time = 0;
									userDetails.reached_points = 0;
									userDetails.mark_status = 0;
									userDetails.current_points = 0;
									userDetails.next_points = 0;
									db.UpdateDocument('users', { _id: userDetails._id }, { reached_points: 0, mark_status: 0, current_points: 0, next_points: 0, start_time: 0 }, {}, (err, update) => { });
								}
							}
							let updated_points = userDetails.current_points + data[0].orderDetails.billings.amount.total;
							if (data[0].orderDetails.billings.amount.food_offer_price > 0) {
								updated_points = updated_points - data[0].orderDetails.billings.amount.food_offer_price;
							}
							let closest = settings.settings.range.reduce((prev, curr) => {
								return (Math.abs(curr - updated_points) < Math.abs(prev - updated_points) ? curr : prev);
							});
							if (closest) {
								let closeindex = settings.settings.range.findIndex(element => element == closest);
								if (closeindex > -1) {
									let reached_points = userDetails.reached_points;
									let next_points = userDetails.next_points;
									if (closest > updated_points) {
										next_points = closest;
										reached_points = closeindex > 0 ? settings.settings.range[closeindex - 1] : 0;
									} else {
										next_points = closeindex < (settings.settings.range.length - 1) ? settings.settings.range[closeindex + 1] : -1;
										reached_points = closest;
									}
									let update_data = {};
									update_data.reached_points = reached_points;
									update_data.next_points = next_points;
									update_data.current_points = parseFloat((updated_points).toFixed(2));
									update_data.mark_status = 0;
									if (reached_points != userDetails.reached_points || next_points == -1) {
										update_data.mark_status = 1;
									}
									if (userDetails.current_points == 0) {
										update_data.start_time = Date.now();
									}
									db.UpdateDocument('users', { _id: userDetails._id }, update_data, {}, (err, update) => {
										response.status = 1;
										if (reached_points != userDetails.reached_points || next_points == -1) {
											response.reached = 1;
										}
										resolve(response);
									})
								} else {
									resolve(response);
								}
							} else {
								resolve(response);
							}
						}
					})
				}
			})
		}
	})
}

module.exports = {
	"randomString": randomString,
	"handleBase64Upload": handleBase64Upload,
	"base64Upload": base64Upload,
	"timeDifference": timeDifference,
	"inArray": inArray,
	"exchangeRates": exchangeRates,
	"userRegister": userRegister,
	"getlanguage": getlanguage,
	"cleartemp": cleartemp,
	"getMapApi": getMapApi,
	"rewardUpdate": rewardUpdate
};