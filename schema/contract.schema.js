var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var CONTRACT_SCHEMA = {};

CONTRACT_SCHEMA.CONTRACT = {
    clientName: { type: String, required: true },
    contractId: { type: String, unique: true },
    startDate: Date,
    endDate: Date,
    busesDeployed: [{ type: Schema.Types.ObjectId, ref: "Fleet" }],
    driversDeployed: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    contactOfficer: String,
    contractType: { type: String, enum: ["Fixed", "Flexible"] },

    invoicingDate: Date,
    lastPayment: Date,
    status: { type: Number, default: 1 }
};

module.exports = CONTRACT_SCHEMA;
