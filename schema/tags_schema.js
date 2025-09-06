var mongoose = require("mongoose");
var TAGS_SCHEMA = {};
TAGS_SCHEMA.TAGS = {
    name: { type: String },
    address: { type: String },
    number: { type: String },
    status: { type: Number, default: 1 },
};
module.exports = TAGS_SCHEMA;
