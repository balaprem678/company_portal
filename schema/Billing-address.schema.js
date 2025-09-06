var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var BILLING_SCHEMA = {};
BILLING_SCHEMA.BILLING = {
    name: String,
    first_name: String,
    last_name: String,
    username: String,
    email : String,
    phone: {
        code: String,
        number: String
    },
    phone_number : Number,
    line1: String,
    landmark: String,
    country: String,
    city: String,
    state: String,
    street: String,
    zipcode: String,
    choose_location: String,
    address_value: String,
    fulladres: String,
    active: { type: Boolean, default: false },
    distance: { type: Number, default: 0 },
    loc: {
        lng: Number,
        lat: Number
    },
    status: { type: Number, default: 1 },
    user_id: { type: Schema.ObjectId, ref: 'users' }
};
module.exports = BILLING_SCHEMA;

