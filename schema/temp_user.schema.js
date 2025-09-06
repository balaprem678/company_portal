var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var TEMP_USERS_SCHEMA = {};
TEMP_USERS_SCHEMA.USER = {
    phone: {
        code: String,
        number: String
    },
    otp: String,
	otp_verification :{
		otp_time:Number
	},
   timestamp: { type: Number, default: Date.now },
};
module.exports = TEMP_USERS_SCHEMA;
