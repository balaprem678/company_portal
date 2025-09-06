var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var CITY_SCHEMA = {};

CITY_SCHEMA.CITY = {
    address: String,
    cityname: String, //achanged as area name, now u have to use area_name instead of cityname in mobile app
    status: { type: Number, default: 1 },
    poly_test: Object,
    image: String,
    featured: String,
    admin_commission: Number,
    //fare_settings: {},
    minimum_distance: { type: Number, default: 1 },
    format: { type: String, default: "km" },
    extra_price: { type: Number, default: 0 },
    driver_fare: {},
    reject_fare: {},
    delivery_charge: {
        default_amt: { type: Number, default: 0 },
        target_amount: { type: Number, default: 0 }
    },
    tax: {},
    location: {
        lng: Number,
        lat: Number
    },
    slug: { type: String, unique: true, required: true },
    night_fare_settings: {},
    extra_fare_settings: {},
    area_management: [{
        address: String,
        area_name: String,
        status: { type: Number, default: 1 },
        avatar: String, //do not delete this variable becoz its using for redirect
        area_poly: Object,
    }],
    warehouse: {
        fulladres: String,
        line1: String,
        line2: String, //Apt No
        city: String,
        state: String,
        zipcode: String,
        country: String,
        mobile: Number,
        street: String,
        do_no: String,
        landmark: String,
        locality: String,
        lat: Number,
        lng: Number
    }
};
module.exports = CITY_SCHEMA;