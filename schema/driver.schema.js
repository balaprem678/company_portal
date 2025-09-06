var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var DRIVER_SCHEMA = {};
DRIVER_SCHEMA.DRIVER = {
    username: { type: String, trim: true },
    email: { type: String, lowercase: true, index: { unique: true }, trim: true },
    password: String,
    verify_otp: String,
    last_name: String,
    main_city: String,
    category: String,
    phone: {
        code: String,
        number: String
    },
    otp: String,
    about: String,
    last_update_time: Number,
    address: {
        fulladres: String,
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
        lng: Number,
        lat: Number
    },
    role: String,
    com_type: String,
    activity: {
        last_login: { type: Date, default: Date.now },
        last_logout: { type: Date, default: Date.now }
    },
    social_login: {
        facebook_id: { type: String },
        google_id: { type: String }
    },
    referal_code: String,
    unique_code: { type: String, index: { unique: true }, trim: true },
    avatar: String,
    img_name: String,
    img_path: String,
    status: { type: Number, default: 1 },
    old_status: { type: Number, default: 0 },
    avg_ratings: { type: Number, default: 0 },
    wallet_id: { type: Schema.ObjectId },
    wallet_settings: {
        life_time: { type: Number, default: 0 },
        available: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
    },
    wallet_pending_payment: [],
    location: {
        lng: Number,
        lat: Number
    },
    type: String,
    reset_code: String,
    mode: String, //availability: Number,
    bio: String, //vehicle: String,
    device_info: {
        device_type: String, //ios/android
        device_token: String,
        gcm: String,
        android_notification_mode: String, //socket/gcm
        ios_notification_mode: String, //socket/apns
    },
    unique_commission: {
        admin_commission: Number,
        service_tax: Number
    },
    tot_req: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    deliverd: { type: Number, default: 0 },
    avg_delivery: { type: Number, default: 0 },
    avail: { type: Number, default: 0 },  //1-yes, 0-no equal to availability
    verified: { type: Number, default: 0 }, //1-yes 0-no
    loginId: { type: Number, default: 0 },
    driver_documents: [{
        id: { type: Schema.ObjectId, ref: 'documents' },
        doc_name: String,
        image: String,
        expiry_date: { type: Date, default: Date.now },
        has_require: { type: Number, default: 0 },
        has_expire: { type: Number, default: 0 }
    }],
    account_details: {
        account_name: String,
        account_address: String,
        account_number: String,
        bank_name: String,
        branch_name: String,
        branch_address: String,
        routing_number: String,
        swift_code: String,
    },
    currentStatus: { type: Number, default: 0 },
    currentJob: { type: Number, default: 0 },
    // currentJob1: { type: Number, default: 0 },
    logout: { type: Number, default: 0 },
    forgot_password: {
        last_sent: Date,
        is_done: Number
    }
};
module.exports = DRIVER_SCHEMA;
