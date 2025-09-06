var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var TEMP_CART_SCHEMA = {};
TEMP_CART_SCHEMA.CART = {
    user_id: String,
    city_id: { type: Schema.ObjectId, ref: 'city' },
    type_status: {type: Number, default: 0},
    cart_details: [{
        id: { type: Schema.ObjectId, ref: 'food' },
        pid: String,
        mprice: Number,
        psprice: Number,
        quantity: Number,
        instruction: String,
        size: String,
        image: String,
        addons: [],
        variations: [],
        base_pack: [],
        varntid: { type: Schema.ObjectId },
        rcat_id: { type: Schema.ObjectId, ref: 'rcategory' },
        scat_id: { type: Schema.ObjectId, ref: 'scategory' },
        active: {type: Boolean, default: true},
        color_id: { type: Schema.ObjectId },
        color_price: Number,
        size_status: Number
    }]
};
module.exports = TEMP_CART_SCHEMA;





