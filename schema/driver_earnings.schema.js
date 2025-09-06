var mongoose = require("mongoose");
var Schema= mongoose.Schema;
var DRIVER_EARNINGS_SCHEMA ={};

DRIVER_EARNINGS_SCHEMA.DRIVER_EARNINGS={
  driver_id:{type:Schema.ObjectId,ref:'drivers'},
  order_lists:[],
  billing_id : {type:Schema.ObjectId,ref:'billing'},
  paid_status: { type: Number, default: 0 },
  paid_date: { type: Date},
  transaction_id: String,
  comments: String
}

module.exports = DRIVER_EARNINGS_SCHEMA;
