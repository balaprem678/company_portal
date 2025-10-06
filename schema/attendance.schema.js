var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ATTENDANCE_SCHEMA = {};

ATTENDANCE_SCHEMA.ATTENDANCE = {
  employee: { type: Schema.Types.ObjectId, ref: "Employee", unique: true },

  // Daily attendance records
  records: [
    {
      date: { type: Date, required: true },
      status: { type: String, enum: ["P", "A", "L", "S"], required: true }, // S = Sick Leave
      remarks: { type: String },
    },
  ],

  // Monthly behavior / performance data (for drivers)
  performance: [
    {
      month: Number, // 1-12
      year: Number,
      speedViolations: { type: Number, default: 0 },
      accidents: { type: Number, default: 0 },
      trafficPenalties: { type: Number, default: 0 },
      incidents: { type: Number, default: 0 },
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

module.exports = ATTENDANCE_SCHEMA;
