var mongoose = require("mongoose");
var Schema= mongoose.Schema;
var RESTAURANT_EARNINGS_SCHEMA ={};

RESTAURANT_EARNINGS_SCHEMA.RESTAURANT_EARNINGS={
  restaurant_id:{type:Schema.ObjectId,ref:'restaurant'},
  order_lists:[],
  billing_id : {type:Schema.ObjectId,ref:'billing'},
  paid_status: { type: Number, default: 0 },
  paid_date: { type: Date},
  transaction_id: String,
  comments: String
}

module.exports = RESTAURANT_EARNINGS_SCHEMA;
