var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var POSTHEADER_SCHEMA = {};

POSTHEADER_SCHEMA.POSTHEADER = {
	title: String,
	name: String,
	image: String,
	img_name: String,
	type: String,
	img_path: String,
	description: String,
	description1: String,
	status: { type: Number, default: 1 }
};

module.exports = POSTHEADER_SCHEMA;
