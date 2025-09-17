var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var VENDOR_SCHEMA = {};

VENDOR_SCHEMA.VENDOR = {
    vendorName: { type: String, required: true },
    contractId: { type: String, unique: true },
    startDate: Date,
    endDate: Date,
    buses: [{ type: Schema.Types.ObjectId, ref: "Fleet" }],
    drivers: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    contactOfficer: String,
    contractType: String,

    invoicingDate: Date,
    lastPayment: Date,
    status: { type: Number, default: 1 },

    documents: [{
        documentType: String,
        fileUrl: String
    }]
};

module.exports = VENDOR_SCHEMA;
