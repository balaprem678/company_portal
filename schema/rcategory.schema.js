var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
mongoose.plugin(slug);
var RCAT_SCHEMA = {};
RCAT_SCHEMA.RCAT = {
    rcatname: { type: String, unique: true },
    img: String,
    iconimg: String,
    bannerimg : String,
    meta : {},
    slug: { type: String, slug: "rcatname" },
    is_cuisine: { type: Number, default: 2 },
    is_fssai: { type: Number, default: 2 },
    is_reward: { type: Number, default: 2 },
    feature: { type: Number, default: 1 },
    status: { type: Number, default: 2 },
    Taxs: { type: Number, default: 0 }
};
module.exports = RCAT_SCHEMA;
