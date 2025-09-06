var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var CANCELLATION_SCHEMA = {};
CANCELLATION_SCHEMA.CANCELLATION = {
    'reason': String,
    'type': String,
    'status': Number
};

module.exports = CANCELLATION_SCHEMA;