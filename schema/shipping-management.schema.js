// import mongoose from 'mongoose';
// const Schema = mongoose.Schema
// const shippingInfoSchema = mongoose.Schema({

//     price: [],
//     status: { type: Number, default: 1 },

// }, {
//     timestamps: true,
//     versionKey: false
// });

// export default mongoose.model('shipping', shippingInfoSchema, 'shipping');


var mongoose = require("mongoose");
var slug = require('mongoose-slug-generator');
var Schema = mongoose.Schema;
// mongoose.plugin(slug);
var SHIPPING_SCHEMA = {};
SHIPPING_SCHEMA.SHIPPING = {
    price: [],
    kilogram : Number,
    constAmount : Number,
    status: { type: Number, default: 1 },
};
module.exports = SHIPPING_SCHEMA;