var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var REFER_COUPON_SCHEMA = {};
REFER_COUPON_SCHEMA.REFER_COUPON = {
	discount_amount: Number,
	cart_amount: Number,
	refer_count: { type : Number, default: 0},
	expires: Date,
	status: { type: Number, default: 1 }
};
module.exports = REFER_COUPON_SCHEMA;