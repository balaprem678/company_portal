var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var OFFER_SCHEMA = {};

OFFER_SCHEMA.OFFER_MANAGEMENT = {
      offer_name:String,
      // offer_url:String,
      producturl:String,
      offer_img:String,
      category: { type: mongoose.Types.ObjectId, required: true ,ref:'rcategory'},
      products: {type: mongoose.Types.ObjectId, required: true ,ref:'food'},

      slug: { type: String, slug: "offer_name" },
    //   content:String,
      status:Number,
      image:String,
      image_name:String,
	  
};
module.exports = OFFER_SCHEMA;