var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var VEHICLE_SCHEMA = {};
VEHICLE_SCHEMA.VEHICLE = {
    vehicle_name: String,
    status: { type: Number, default: 0 },
};
module.exports = VEHICLE_SCHEMA;
