var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var RECENT_TEMP_VISIT_SCHEMA = {};
RECENT_TEMP_VISIT_SCHEMA.RECENT_TEMP_VIST = {
    user_id: String,
    product_id: { type: Schema.ObjectId, ref: 'food' }
};
module.exports = RECENT_TEMP_VISIT_SCHEMA;