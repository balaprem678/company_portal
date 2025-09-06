var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var driver_wallet_schema = {};
driver_wallet_schema.driver_wallet = {
	activity : { type: Schema.ObjectId},
	from : { type: Schema.ObjectId, ref: 'drivers' },
	status: { type:Number, default:1 },
	type: String,
	amount:{ type: Number, default: 0},
	timestamp: { type: Date, default: Date.now },
	reason: { type: String },
	payment_gateway_response: Object,
	orderId: { type: Schema.ObjectId, ref: 'orders' },
	available_amount: { type: Number, default: 0}
};
module.exports = driver_wallet_schema;