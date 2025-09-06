var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ATTRIBUTES_SCHEMA = {};
ATTRIBUTES_SCHEMA.ATTRIBUTES = {
    name: String,
    slug: String,
    status: Number,
    units: [{
        name:String
    }],
    category:[{
        _id:Schema.Types.ObjectId,
        rcatname:String,
        is_fassai:String,
        is_cuisine:String
    }]
};

module.exports = ATTRIBUTES_SCHEMA;