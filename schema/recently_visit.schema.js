var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var RECENTL_VIST_SCHEMA = {};
RECENTL_VIST_SCHEMA.RECENTL_VIST = {
    user_id: String,
    product_id: { type: Schema.ObjectId, ref: 'food' }
};
module.exports = RECENTL_VIST_SCHEMA;