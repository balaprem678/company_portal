var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var slug = require('mongoose-slug-generator');
mongoose.plugin(slug);
var RESTAURANT_SCHEMA = {};
RESTAURANT_SCHEMA.RESTAURANT = {
    restaurantname: String,
    username: String,
    slug: { type: String, slug: "restaurantname", slug_padding_size: 2, unique_slug: true },
    feature: { type: Number, default: 0 },
    feature_img: String,
    email: { type: String, lowercase: true, index: { unique: true }, trim: true },
    password: String,
    unique_code: { type: String, index: { unique: true }, trim: true },
    availability: { type: Number, default: 0 },
    food_count: { type: Number, default: 0 },
    com_type: { type: String, default: 'common' },
    com_taxtype: { type: String, default: 'common' },
	unique_tax:{
        rest_tax: Number,
    },
    efp_time: Number, //estimated food prepare time
    tax: Number,
    tax_id: { type: Schema.ObjectId, ref: 'tax' },
    rcategory: { type: Schema.ObjectId, ref: 'rcategory' },
    parent_rests: [{ type: Schema.ObjectId, ref: 'restaurant' }],
    phone: {
        code: String,
        number: String
    },
    otp: String,
    main_city: String,
    city_id: { type: Schema.ObjectId },
    sub_city_id: { type: Schema.ObjectId },
    sub_city: String,
    //main_cuisine: String,
    main_cuisine: [{
        _id: false,
        name: String,
        _id: { type: Schema.ObjectId, ref: 'cuisine' }
    }],
    time_zone: String,
    about: String,
    address: {
        fulladres: String,
        line1: String,
        line2: String,//Apt No
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
    },
    //role: String,
    role: { type: String, default: 'restaurant' },
    activity: {
        last_login: { type: Date, default: Date.now },
        last_logout: { type: Date, default: Date.now }
    },
    avg_ratings: { type: Number, default: 0 },
    categories: [{ type: Schema.ObjectId, ref: 'category' }],
    avatar: String,
    food_img: String,
    food_img_name: String,
    logo: String,
    status: { type: Number, default: 1 },
    offer: {
        offer_status: String,
        offer_type: String, //flat/percentage
        offer_amount: Number,
        target_amount: Number,
        max_off: Number
    },
    package_charge: {
        package_status: String,
        package_amount: Number,
    },
    device_info: {
        device_type: String, //ios/android
        device_token: String,
        gcm: String,
        android_notification_mode: String, //socket/gcm
        ios_notification_mode: String, //socket/apns
    },
    location: {
        lng: Number,
        lat: Number
    },
    unique_commission: {
        admin_commission: Number,
    },
    driver_location: [{
        id: { type: Schema.ObjectId, ref: 'drivers' },
        location: {
            lng: Number,
            lat: Number
        },
        distance: String,
        time: Number,
        timestamp: Number,
    }],
    restaurant_documents: [{
        id: { type: Schema.ObjectId, ref: 'documents' },
        doc_name: String,
        image: String,
        image_name: String,
        expiry_date: { type: Date, default: Date.now },
        has_require: { type: Number, default: 0 },
        has_expire: { type: Number, default: 0 }
    }],
    tot_req: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    deliverd: { type: Number, default: 0 },
    avg_delivery: { type: Number, default: 0 },
    avail: { type: Number, default: 0 },  //1-yes, 0-no
    verified: { type: Number, default: 0 }, //1-yes 0-no

    // time_setting: {
    //     week_days: { start_time: { type: Date, default: Date.now }, end_time: { type: Date, default: Date.now }, },
    //     week_end: { start_time: { type: Date, default: Date.now }, end_time: { type: Date, default: Date.now } },

    // },
    /* time_setting: {
        Sunday: [ { start_time: { type: Date }, end_time: { type: Date} } ],
        Monday: [ { start_time: { type: Date }, end_time: { type: Date} } ],
        Tuesday: [ {  start_time: { type: Date }, end_time: { type: Date} } ],
        Wednesday: [ {  start_time: { type: Date }, end_time: { type: Date} } ],
        Thursday: [ { start_time: { type: Date }, end_time: { type: Date} } ],
        Friday: [ { start_time: { type: Date }, end_time: { type: Date} } ],
        Saturday: [ { start_time: { type: Date }, end_time: { type: Date} } ],
		week_days: { start_time: { type: Date, default: Date.now }, end_time: { type: Date, default: Date.now }, },
        week_end: { start_time: { type: Date, default: Date.now }, end_time: { type: Date, default: Date.now } },
    }, */
    working_hours: [{
        day: String,
        slots: [{
            _id: false,
            start_time: { type: Date },
            end_time: { type: Date }
        }],
        selected: Number,
        wholeday: Number
    }],
    banking_details: {},
	fssaino:String
};
module.exports = RESTAURANT_SCHEMA;
