var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var TEMP_FAVOURITE_SCHEMA = {};
TEMP_FAVOURITE_SCHEMA.TEMP_FAVOURITE = {
    user_id: { type: String },
    city_id: { type: Schema.ObjectId, ref: 'city' },
    chaild_id: { type: String },
    product_id: { type: Schema.ObjectId, ref: 'food' },
    status: { type: Number, default: 1 },
};
module.exports = TEMP_FAVOURITE_SCHEMA;
