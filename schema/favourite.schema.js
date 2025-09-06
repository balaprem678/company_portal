var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var FAVOURITE_SCHEMA = {};
FAVOURITE_SCHEMA.FAVOURITE = {
    user_id: { type: Schema.ObjectId, ref: 'users' },
    chaild_id: { type: String },
    city_id: { type: Schema.ObjectId, ref: 'city' },
    product_id: { type: Schema.ObjectId, ref: 'food' },
    status: { type: Number, default: 1 },
};
module.exports = FAVOURITE_SCHEMA;
