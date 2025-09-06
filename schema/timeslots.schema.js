var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
var Schema = mongoose.Schema;
mongoose.plugin(slug);
var TIMESLOTS_SCHEMA = {};
TIMESLOTS_SCHEMA.TIMESLOTS = {
    weekday: {type: String,unique: true },
    slottime: Number,
    time_start: Date,
    time_end: Date,
    status: Number
   
};

module.exports = TIMESLOTS_SCHEMA;
