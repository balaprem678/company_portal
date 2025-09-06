var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
var Schema = mongoose.Schema;
mongoose.plugin(slug);
var SCAT_SCHEMA = {};
SCAT_SCHEMA.SCAT = {
    scatname: {type:String, unique:true},
    img: String,
    color: String,
    heading_color: String,
    meta : {},
    rootCategory:Schema.ObjectId,
    slug: { type: String, slug: "scatname" },
    rcategory: Schema.ObjectId,
    // is_cuisine: { type: Number, default: 2 },
    // is_fssai: { type: Number, default: 2 },
    // is_reward: { type: Number, default: 2 },
    // is_food: { type: Number, default: 0 },
    status: { type: Number, default: 2 }
};
module.exports = SCAT_SCHEMA;
