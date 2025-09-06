var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var COUPON_SCHEMA = {};
COUPON_SCHEMA.COUPON = {
	name: String,
	code: { type: String, unique: true },
	description: String,
	discount_type: String,
	amount_percentage: Number,
	maxamount:Number,
	minamount:Number,
	coupon_type: String,
	city: String,
	used_by: [{ user_id: String, number_of_time: Number }],
	usage: {
		total_coupons: Number,
		per_user: Number,
	},
	valid_from: { type: Date, default: Date.now },
	expiry_date: { type: Date, default: Date.now },
	status: { type: Number, default: 1 },
	used: { type: Number, default: 0 },
	total: Number,
	image: String,
	img_name: String,
	img_path: String,
};
module.exports = COUPON_SCHEMA;