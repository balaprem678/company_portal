var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
var Schema = mongoose.Schema;
mongoose.plugin(slug);
var MOBBANNER_SCHEMA = {};
MOBBANNER_SCHEMA.MOBBANNER = {
    bannername: {type:String, unique:true},
    img: String,
    slug: { type: String, slug: "bannername" },
    status: { type: Number, default: 2 }
};
module.exports = MOBBANNER_SCHEMA;
