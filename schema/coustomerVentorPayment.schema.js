var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var PAYMENT_SCHEMA = {};

/**
 * Customer Payments Schema
 */
PAYMENT_SCHEMA.CUSTOMER_PAYMENT = {
  client: { type: Schema.Types.ObjectId, ref: "Customer", required: true }, // linked customer
  contractId: { type: String, required: true }, // contract reference
  invoiceNo: { type: String }, // optional invoice no
  dueDate: { type: Date }, // payment due date
  amountPaid: { type: Number, default: 0 }, // amount received
  balance: { type: Number, default: 0 }, // pending balance
  status: { type: String, enum: ["Paid", "Unpaid", "Partial"], default: "Unpaid" }, // payment status
  remarks: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

/**
 * Vendor Payments Schema
 */
PAYMENT_SCHEMA.VENDOR_PAYMENT = {
  vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true }, // linked vendor
  contractId: { type: String, required: true },
  invoiceNo: { type: String },
  dueDate: { type: Date },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ["Paid", "Unpaid", "Partial"], default: "Unpaid" },
  remarks: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

module.exports = PAYMENT_SCHEMA;
