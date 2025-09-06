var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var REWARDS_SCHEMA = {};
REWARDS_SCHEMA.REWARDS = {
    user_id: { type: Schema.ObjectId, ref: 'users' },
    time: Number,
    claimed: Number,
    reached: Number,
    status: { type: Number, default: 1 }
};
module.exports = REWARDS_SCHEMA;





