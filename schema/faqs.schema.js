var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var FAQS_SCHEMA = {};

FAQS_SCHEMA.FAQS = {
    question: String,
    answer: String,
    product_id: { type: Schema.Types.ObjectId, ref: 'food' },
    user: { type: Schema.Types.ObjectId, ref: 'users' },
    status: { type: Number, default: 1 }

}

module.exports = FAQS_SCHEMA;