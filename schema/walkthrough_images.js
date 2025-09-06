var mongoose = require("mongoose");
// var Schema = mongoose.Schema;

var WALKTHROUGHIMAGE_SCHEMA = {};
WALKTHROUGHIMAGE_SCHEMA.WALKTHROUGHIMAGE = {
    title: {type:String, unique:true},
    img: String,
    // slug: { type: String, slug: "bannername" },
    status: { type: Number, default: 2 },
    description: String,
};
module.exports = WALKTHROUGHIMAGE_SCHEMA;

