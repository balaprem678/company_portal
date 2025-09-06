var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var DOCUMENT_SCHEMA = {};
DOCUMENT_SCHEMA.DOCUMENTS = {
    doc_for: String,
    doc_name: String,
    expiry_dates: Number,
    has_require: Number,
    has_expire: Number,
    status: { type: Number, default: 0 },
};
module.exports = DOCUMENT_SCHEMA;
