var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var BANNER_TYPE_SCHEMA = {};

BANNER_TYPE_SCHEMA.BANNER_TYPE = {
      banner_name:String,
      banner_url:String,
      banner_img:String,
      slug: { type: String, slug: "banner_name" },
      content:String,
      status:Number,
      image:{
        webpImage:String,
        fallbackImage:String
      },
      image_name:String,
      type_name : String,
      image_1 : String,
      image_2 : String,
      image_3 : String,
      image_4 : String,
      batchname_1 : String,
      batchname_2 : String,
      batchname_3 : String,
      batchname_4 : String,
      type_status:{ type: Number, default: 0 },
    //   end_time:{ type: Number, default: 0 },
	  
};
module.exports = BANNER_TYPE_SCHEMA;
