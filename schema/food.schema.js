var mongoose = require("mongoose");
var slugify = require('slugify')
var Schema = mongoose.Schema;
// mongoose.plugin(slugify);
const slugOptions = {
    replacement: '-',
    remove: undefined,
    lower: false,
    strict: false,
    locale: 'vi',
    trim: true
};
var FOOD_SCHEMA = {};
FOOD_SCHEMA.FOOD = {
    name: String,
    slug: {
        type: String,
        unique: true,
        set: function (value) {
            return slugify(value, slugOptions);
        }
    },
    //shop: { type: Schema.ObjectId, ref: 'restaurant' },
    /*seo: {
        title: String,
        keyword: String,
        description: String
    },*/
    brandname: Schema.ObjectId,
    rcategory: Schema.ObjectId,
    scategory: Schema.ObjectId,
    Product_ingredients : [],
    alternative_name : [],
    receipes_cook : [],
    HealthBenefit_List : [],
    product_descriptions : String, //Produc details description
    vegOptions : { type: Number, default: 0},
    attributes: [],
    product_details: [],
    main_city: [],
    sub_city: String,
    description: String,
    recipe_name : String,
    recipe_ingredients : [],
    image_alt : String,
    cooking_instructions : [],
    faq_details : [],
    tags: Array,
    isRecommeneded: { type: Number, default: 0 },
    child_cat_array: Array,
    //categories: [{ _id: false, category: { type: Schema.ObjectId, ref: 'categories' } }],
    itmcat: { type: Number, default: 3 },  // 1:veg || 2: non-veg || 3: none
    status: { type: Number, default: 2 },  // 1:publish || 2: unpublish
    visibility: { type: Number, default: 1 },  // 1:visible || 2: invisible
    avatar:{ 
    webpImg:String,
    fallback: String    
    },
    hover_image: { 
        webpImg:String,
        fallback: String    
        },
    trade_mark_image: { 
        webpImg:String,
        fallback: String   
        },
    images: [],
    size: [],

    meta : {
        meta_title : String,
        meta_keyword : [],
        meta_description : String
    },
    size_status: Number,
    quantity_size: [],
    hotselling: { type: Number, default: 0 },
    // base_pack: [],
    recommended: { type: Number, default: 0 },
    max_price: Number,
    min_price: Number,
    /* base_pack: [{
         name: { type: String },
         description: { type: String },
         type: { type: String },
         sub_pack: [{
             name: { type: String },
             visibility: { type: Number, default: 1 },  // 1:visible || 2: invisible
         }],
     }],*/
    //today_sell:{
    //from_date : { type: Number, default: 0 },
    //to_date : { type: Number, default: 0 },
    //count: { type: Number, default: 0 },
    //},
    information: String,
    base_price: Number,
    sale_price: Number,
    quantity: Number,
    sku : String,
    tax : Number,
    price_details: [{
        //_id: Number,
        quantity: Number,
        unit: String,
        sku:String,
        mprice: Number,
        sprice: Number,
        image: String,
        attributes: [],
        attribute_ids: [],
        parent_ids: [],
    }],
    return_days:{type:Number},
    offer_status: { type: Number, default: 0 },
    offer_amount: { type: Number, default: 0 },
    expensive: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    total_rating: { type: Number, default: 0 },
    total_rating_users: { type: Number, default: 0 },
    combo : {type : Boolean,default : false}
    /*
    food_time: {
        status: { type: Number, default: 0 },
        //pick_time: Date,
        from_time: Date,
        to_time: Date
    },
    must_try :{
        status: { type: Number, default: 0 }
    }*/
};

module.exports = FOOD_SCHEMA;
