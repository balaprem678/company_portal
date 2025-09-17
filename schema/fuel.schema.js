var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var FUEL_SCHEMA = {};

FUEL_SCHEMA.FUEL = {
    vehicle: { type: Schema.Types.ObjectId, ref: "Fleet" },
    driver: { type: Schema.Types.ObjectId, ref: "Employee" },
    monthlyAllowance: Number,
    actualUsage: Number,
    lastRechargeDate: Date,
    remarks: String
};

module.exports = FUEL_SCHEMA;
