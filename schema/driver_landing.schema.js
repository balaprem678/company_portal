var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var DRIVER_LANDING = {};
DRIVER_LANDING.LANDING = {
    section1:{
        title:String,
        description:String,
        icon:String
    },
    section2:{
        title:String,
        description:String,
        icon:String
    },section3:{
        title:String,
        description:String,
        icon:String
    },
    banner:{
        title:String,
        description:String,
        icon:String
    },
    main_title:String

}
module.exports = DRIVER_LANDING;