var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var TRANSACTION_SCHEMA = {};
TRANSACTION_SCHEMA.TRANSACTION = {
	user: { type: Schema.Types.ObjectId, ref: 'users' },
	city_id: { type: Schema.Types.ObjectId, ref: 'city' },
	type: String,
	mode: String,
	schedule_type: String,
	user_name:String,
	strip_customer_id: String,
	amount: Number,
	status: { type: Number, default: 1 },
	transactions: []
};
module.exports = TRANSACTION_SCHEMA;


/** Status
 * 1 - Completed
 * 2 - Pending
 * 3 - InComplete
 * 
 *  */