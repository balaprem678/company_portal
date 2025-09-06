var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var USERS_SCHEMA = {};
USERS_SCHEMA.USER = {
    email: { type: String, lowercase: true, index: { unique: true }, trim: true },
    first_name: String,
    last_name: String,
    username: String,
    password: String,
    verify_otp: String,
    phone: {
        code: String,
        number: String
    },
    /*social_login: {
        facebook_id: { type: String, :lowercase true, index: { unique: true }, trim: true },
        google_id: { type: String, lowercase: true, index: { unique: true }, trim: true }
    },*/
    login_type: String,
    social_login: {
        facebook_id: { type: String },
        google_id: { type: String }
    },
    favourite: [{ id: { type: Schema.ObjectId, ref: 'restaurant' }, timestamp: Number, _id: false }],
    otp: String,
    otp_time: Number,
    otp_verification: {
        otp_time: Number
    },
    about: String,
    gender: String,
    address: {
        fulladres: { type: String, default: '' },
        line1: String,
        line2: String,
        city: String,
        state: String,
        zipcode: String,
        country: String,
        mobile: Number,
        street: String,
        landmark: String,
        locality: String,
        lat: Number,
        lng: Number
    },
    location: {
        lng: Number,
        lat: Number
    },
    order_location: {
        lng: Number,
        lat: Number
    },
    role: String,
    user_type: String,
    activity: {
        last_login: { type: Date, default: Date.now },
        last_logout: { type: Date, default: Date.now }
    },
    referral_code: String,
    unique_code: { type: String },
    appliedreferoffer: [],
    initoffer: {},
    initprocess: String,
    refer_activity: [],
    avatar: String,
    img_name: String,
    img_path: String,
    flag:Number,
    status: { type: Number, default: 1 },
    wallet_id: { type: Schema.ObjectId },
    location: {
        lng: Number,
        lat: Number
    },
    type: String,
    verification: {
        otp: { type: Number, default: 0 },
        otp_verified: { type: Number, default: 0 }
    },
    cancellation_reason: String,
    device_info: {
        device_type: String, //ios/android
        device_token: String,
        gcm: String,
        android_notification_mode: String, //socket/gcm
        ios_notification_mode: String, //socket/apns
    },
    card_details: [{ customer_id: String, card_no: String, exp_month: String, exp_year: String, brand: String, email: String, mode: String, date: { type: Date, default: Date.now } }],
    forgot_password: {
        last_sent: Date,
        is_done: Number
    },
    reached_points: { type: Number, default: 0 },
    mark_status: { type: Number, default: 0 }, // 0 - onprogress, 1- user need to accept or reject
    current_points: { type: Number, default: 0 },
    next_points: { type: Number, default: 0 },
    start_time: { type: Number, default: 0 },
    sample_email: String,
    firstName:{type:String},
    lastName:{type:String}
};
module.exports = USERS_SCHEMA;
