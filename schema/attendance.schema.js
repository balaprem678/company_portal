var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ATTENDANCE_SCHEMA = {};

ATTENDANCE_SCHEMA.ATTENDANCE = {
    employee: { type: Schema.Types.ObjectId, ref: "Employee" },
    date: { type: Date, required: true },
    status: { type: String, enum: ["P", "A", "L"], required: true },
    remarks: String
};

module.exports = ATTENDANCE_SCHEMA;
