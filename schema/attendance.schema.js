var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ATTENDANCE_SCHEMA = {};

/**
 * Attendance Schema
 * Each employee has ONE attendance document
 * Records are stored as an array of days
 */
ATTENDANCE_SCHEMA.ATTENDANCE = {
  employee: { type: Schema.Types.ObjectId, ref: "Employee", unique: true },

  // Array of daily records
  records: [
    {
      date: { type: Date, required: true }, // YYYY-MM-DD
      status: { type: String, enum: ["P", "A", "L"], required: true }, // Present/Absent/Leave
      remarks: { type: String }
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
};

module.exports = ATTENDANCE_SCHEMA;
