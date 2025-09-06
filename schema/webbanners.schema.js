var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
var Schema = mongoose.Schema;
mongoose.plugin(slug);
var WEBBANNER_SCHEMA = {};
WEBBANNER_SCHEMA.WEBBANNER = {
    bannername: {type:String, unique:true},
    img: String,
    slug: { type: String, slug: "bannername" },
    status: { type: Number, default: 2 },
    description: String,
    category: String,
    category_id:Schema.ObjectId
};
module.exports = WEBBANNER_SCHEMA;