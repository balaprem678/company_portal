var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var CUISINE_SCHEMA = {};
CUISINE_SCHEMA.CUISINE = {
    name: { type: String, index: { unique: true } },
    status: Number,
    image: String,
    img_name: String,
    img_path: String,
    //parent: String,
    //parent_id: { type: Schema.ObjectId, ref: 'cuisine' }
};

module.exports = CUISINE_SCHEMA;
