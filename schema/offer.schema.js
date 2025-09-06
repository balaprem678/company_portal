var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var OFFER_SCHEMA = {};
OFFER_SCHEMA.OFFER = {
    city: String,
    restaurants: [{ type: Schema.ObjectId, ref: 'restaurant' }],
    price: Number,
    max_discount: Number,
    dis_percent: Number,
    status: Number,
};
module.exports = OFFER_SCHEMA;