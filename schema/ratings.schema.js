var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var RATINGS_SCHEMA = {};
RATINGS_SCHEMA.RATINGS = {
    rating: Number,
    comment: String,
    username: String,
    productName: String,
    image: [],
    user: { type: Schema.Types.ObjectId, ref: 'users' },
    //restaurant: { type: Schema.Types.ObjectId, ref: 'restaurant' },
    //driver: { type: Schema.Types.ObjectId, ref: 'drivers' },
    product_id: { type: Schema.Types.ObjectId, ref: 'food' },
    order_id: { type: Schema.Types.ObjectId, ref: 'orders' },
    status: { type: Number, default: 1 }
};

module.exports = RATINGS_SCHEMA;