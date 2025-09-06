var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var TAX_SCHEMA = {};
TAX_SCHEMA.TAX = {
    country: { code: String, name: String },
    tax_type: String,
    amount: Number,
    tax_label: String,
    state_name: String,
    status: { type: Number, default: 1 },
};
module.exports = TAX_SCHEMA;