var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var SUBSCRIBE_SCHEMA = {};
SUBSCRIBE_SCHEMA.SUBSCRIBE = {
    email: String,
    status: { type: Number, default: 1 },
};
module.exports = SUBSCRIBE_SCHEMA;