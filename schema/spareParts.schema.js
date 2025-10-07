var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var SPAREPART_SCHEMA = {};

SPAREPART_SCHEMA.SPAREPART = {
  name: { type: String, required: true }, // e.g., Brake Pad
  partNumber: { type: String, unique: true }, // unique code
  totalQuantity: { type: Number, default: 0 }, // running inventory count

  // 🔹 Track different additions (batches)
  addedBatches: [
    {
      quantity: Number,
      pricePerUnit: Number,
      supplier: String,
      addedDate: { type: Date, default: Date.now },
    },
  ],

  status: { type: Number, default: 1 }, // 1=Active, 0=Deleted
};

module.exports = SPAREPART_SCHEMA;
