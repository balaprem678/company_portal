var mongoose = require("mongoose");
var Schema= mongoose.Schema;
var RESTAURANT_EARNING_PAYOUT_SCHEMA ={};
RESTAURANT_EARNING_PAYOUT_SCHEMA.RESTAURANT_EARNING_PAYOUT={
  order_ids:[{type:Schema.ObjectId,ref:'orders'}],
  paid_date: { type: Date},
  transaction_id: String,
  comments: String,
  amount: Number,
  timestamp: Number,
}
module.exports = RESTAURANT_EARNING_PAYOUT_SCHEMA;
