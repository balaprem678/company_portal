var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var WALLET_SCHEMA = {};
WALLET_SCHEMA.WALLET = {
    user_id: { type: Schema.ObjectId, ref: 'users' },
    total: Number,
    transactions: []
};
module.exports = WALLET_SCHEMA;

