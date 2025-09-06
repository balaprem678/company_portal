var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var NOTIFICATIONS = {};
NOTIFICATIONS.NOTIFICATIONS = {
	user: { type: Schema.ObjectId, ref: 'users' },
	restaurant: { type: Schema.ObjectId, ref: 'restaurant' },
	driver: { type: Schema.ObjectId, ref: 'drivers' },
	type: String,
	message: String,
	raw_data: {},
	status: { type: Number, default: 1 }
};

module.exports = NOTIFICATIONS;