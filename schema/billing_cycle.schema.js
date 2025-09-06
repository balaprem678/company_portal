var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var BILLING_CYCLE_SCHEMA = {};

BILLING_CYCLE_SCHEMA.BILLING_CYCLE = {
      billingcycle:String,
      start_date:Date,
      end_date:Date,
      status:Number,
      start_time:{ type: Number, default: 0 },
      end_time:{ type: Number, default: 0 },
	  
};
module.exports = BILLING_CYCLE_SCHEMA;
