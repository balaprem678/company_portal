var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MAINTENANCE_SCHEMA = {};

MAINTENANCE_SCHEMA.MAINTENANCE = {
    vehicle: { type: Schema.Types.ObjectId, ref: "Fleet" },
    driver: { type: Schema.Types.ObjectId, ref: "Employee" },
    lastMaintenanceDate: Date,
    maintenanceDueDate: Date,
    lastMaintenanceCost: Number,
    remarks: String
};

module.exports = MAINTENANCE_SCHEMA;
