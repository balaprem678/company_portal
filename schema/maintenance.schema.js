var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MAINTENANCE_SCHEMA = {};

MAINTENANCE_SCHEMA.MAINTENANCE = {
  vehicle: { type: Schema.Types.ObjectId, ref: "Fleet" },
  driver: { type: Schema.Types.ObjectId, ref: "Employee" },

  maintenanceDate: { type: Date, required: true }, // date of maintenance
  maintenanceType: { type: String, enum: ["Repaired", "Serviced", "Replaced"], required: true },

  // 🔹 Spare parts used (optional)
  partsUsed: [
    {
      part: { type: Schema.Types.ObjectId, ref: "Sparepart" },
      quantity: { type: Number, default: 1 }
    }
  ],

  maintenanceCost: { type: Number, default: 0 },
  remarks: String,

  status: { type: Number, default: 1 } // 1=Active, 0=Deleted
};

module.exports = MAINTENANCE_SCHEMA;
