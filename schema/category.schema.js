var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var CATEGORY_SCHEMA = {};
CATEGORY_SCHEMA.CATEGORY = {
    name: String,
    slug: String,
    position: Number,
    status: Number,
    avatar: String,
    description: String,
    mainparent: { type: String, default: 'no' },
    seo: {
        title: String,
        keyword: String,
        description: String
    },
    parent: { type: Schema.ObjectId, ref: 'category' },
    ancestors: [{ type: Schema.ObjectId, ref: 'category' }]
};

module.exports = CATEGORY_SCHEMA;