var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var CART_SCHEMA = {};
CART_SCHEMA.CART = {
    user_id: { type: Schema.ObjectId, ref: 'users' },
    city_id: { type: Schema.ObjectId, ref: 'city' },
    uniqueId: { type: Schema.ObjectId },
    type_status: { type: Number, default: 0 },
    cart_details: [{
        id: { type: Schema.ObjectId, ref: 'food' },
        pid: String,
        mprice: Number,
        psprice: Number,
        quantity: Number,
        instruction: String,
        image: String,
        size: String,
        product_varient: String,
        addons: [],
        variations: [],
        base_pack: [],
        varntid: { type: Schema.ObjectId },
        rcat_id: { type: Schema.ObjectId, ref: 'rcategory' },
        scat_id: { type: Schema.ObjectId, ref: 'scategory' },
        active: { type: Boolean, default: true },
        size_status: Number,
        selectedVariantId: { type: Schema.ObjectId }
    }],
    coupon_code: String,
    discount_type: String,
    coupon_status: { type: Boolean, default: false },
    coupon_discount: { type: Number, default: 0 },
};
module.exports = CART_SCHEMA;





