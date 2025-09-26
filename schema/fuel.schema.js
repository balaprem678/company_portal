var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var FUEL_SCHEMA = {};

FUEL_SCHEMA.FUEL = {
  vehicle: { type: Schema.Types.ObjectId, ref: "Fleet", required: true },
  driver: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  contractId: { type: String, default: "" },        // <-- added field
  monthlyAllowance: { type: Number, default: 0 },
  actualUsage: { type: Number, default: 0 },
  lastRechargeDate: { type: Date, default: null },
  remarks: { type: String, default: "" },
  startOdometer: { type: Number, default: 0 },
  endOdometer: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  issuedBy: { type: String, default: "" },
  fuelConsumed: { type: Number, default: 0 },
};

module.exports = FUEL_SCHEMA;
