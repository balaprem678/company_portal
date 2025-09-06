var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
var Schema = mongoose.Schema;
mongoose.plugin(slug);
var BRAND_SCHEMA = {};
BRAND_SCHEMA.BRAND = {
    brandname: {type:String, unique:true},
    img: String,
    rcategory: Schema.ObjectId,
    scategory: Schema.ObjectId,
    slug: { type: String, slug: "brandname" },
    status: { type: Number, default: 2 }
};
module.exports = BRAND_SCHEMA;
