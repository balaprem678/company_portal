var mongoose = require("mongoose");
var slugify = require('slugify')
var Schema = mongoose.Schema;

var FAQ_MANAGEMENT_SCHEMA = {};
FAQ_MANAGEMENT_SCHEMA.FAQ = {

    faq_details : [],
    status: { type: Number, default: 1 },
}

module.exports = FAQ_MANAGEMENT_SCHEMA;
