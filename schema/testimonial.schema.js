var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var TESTIMONIAL_SCHEMA = {};
TESTIMONIAL_SCHEMA.TESTIMONIAL_MANAGEMENT = {
    name : String,
    company_name: String,
    position: String,
    description : String,
    image : String,
    status: Number,
    rating: Number,
    location : String
};
module.exports = TESTIMONIAL_SCHEMA;