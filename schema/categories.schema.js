var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var CATEGORIES_SCHEMA = {};
CATEGORIES_SCHEMA.CATEGORIES = {
    name: String,
    status: Number,
    avatar: String,
    description: String,
    mainparent: { type: String, default: 'no' },
    has_child: { type: String, default: 'no' },
    parent: { type: Schema.ObjectId, ref: 'categories' },
    restaurant: { type: Schema.ObjectId, ref: 'restaurant' },
};

module.exports = CATEGORIES_SCHEMA;