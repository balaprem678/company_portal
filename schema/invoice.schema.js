var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var INVOICE_SCHEMA = {};

INVOICE_SCHEMA.INVOICE = {
    invoiceNo: { type: String, unique: true },
    date: { type: Date, default: Date.now },
    dueDate: Date,
    clientName: String,
    contract: { type: Schema.Types.ObjectId, ref: "Contract" },
    items: [{
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number
    }],
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    remarks: String,
    totalAmount: Number,
    paymentDetails: {
        bankName: String,
        accountNo: String
    }
};

module.exports = INVOICE_SCHEMA;
