var mongoose = require("mongoose");
var COMBO_SCHEMA = {};
COMBO_SCHEMA.COMBO = {
    comboName: { type: String, required: true }, 
    category:  [{type: mongoose.Types.ObjectId, required: true, ref: 'rcategory' }],
    products: [{
        product:{ type: mongoose.Types.ObjectId, ref: 'food', required: true },
        variance:{},
        price:{}
    }],
    comboPrice:{type:Number},

    status: { type: Number, default: 1 }, 
  
};
module.exports = COMBO_SCHEMA;
