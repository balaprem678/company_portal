var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var ORDERS_SCHEMA = {};

ORDERS_SCHEMA.ORDERS = {
    order_id: { type: String, unique: true },
    user_id: { type: Schema.ObjectId, ref: 'users' },
    city_id: { type: Schema.ObjectId, ref: 'city' },
    driver_id: { type: Schema.ObjectId, ref: 'drivers' }, //after driver accept
    transaction_id: { type: Schema.ObjectId, ref: 'transaction' },
    razorpaypayment_id: String,
    razorpayorderid: String,
    stripechargeid: String,
    cancelReason: String,
    cancelled_role: Number,//1-admin,2-subadmin
    cancelled_name: String,
    email: String,
    sub_city: String,
    rest_offer: Object,
    com_type: String,
    guestLogin:Boolean,
    schedule_type: Number,
    schedule_time: Number,
    restaurant_time_out_alert: { type: Number, default: 0 },
    product_order_alert: { type: Number, default: 0 },
    paid_status: { type: Number, default: 0 },//0-commission unpaid to restaurant,1-commission paid to restaurant
    show_schedule_time: Date,
    schedule_date: String,
    schedule_time_slot: String,
    eta: Number,
    notify: Number,
    refer_offer_price: Number,
    cancel_due_to: String, // in order status 2 - '0'- restaurant failed to accept (timeout),'1' - restaurant cancelled the order
    refer_offer: {},
    unique_commission: Object,
    created_time: { type: Number, default: 0 },
    updated_time: { type: Number, default: 0 },
    seen_status: { type: Number, default: 0 },
    rating_done: { type: Number, default: 0 },//1-rated,0-need to rate
    foods: [{
        _id: false,
        id: { type: Schema.ObjectId, ref: 'food' },
        rcat_id: { type: Schema.ObjectId, ref: 'rcategory' },
        scat_id: { type: Schema.ObjectId, ref: 'scategory' },
        name: String,
        price: Number,
        mprice: Number,
        offer_price: Number,
        net_quantity: Number,
        units: String,
        quantity: Number,
        instruction: String,
        slug: String,
        offer: Number,
        varntid: String,
        image: String,
        sku: String,
        refundStatus: String,
        // return_days: Date,
        size: String,
        return_date: Date,
        collected_date: Date,
        refund_date: Date,
        return_reason: String,
        status: { type: Number, default: 1 }, // 1 product exists, 16 returned, 18 refunded
        size_status: Number,
        variations: [],
        rating_user: { type: Boolean, default: false },
        rating: { type: Number, default: 0 },
        rating_id: { type: Schema.ObjectId, ref: 'ratings' }
    }],
    cancel_drivers: [{
        id: { type: Schema.ObjectId, ref: 'drivers' },
        cancelledAt: { type: Date, default: Date.now }
    }],
    billings: {
        amount: {
            total: Number, // grand total (quantity*individual_total) without deducting discount
            offer_discount: Number,// discount amount by restaurant 
            coupon_discount: Number,// adiscount amount by admin
            delivery_amount: Number,
            food_offer_price: Number,
            service_tax: Number,
            food_offer_price: Number,
            night_fee: Number,
            surge_fee: Number,
            package_charge: Number,
            grand_total: Number, //user need to pay
            admin_commission: Number,
            admin_commission_with_driver: Number,
            driver_commission: Number,
            restaurant_commission: Number,
            wallet_usage: Number,
            balance_amount: Number,
            applied_admin_com: Number,
            bir_tax_amount: Number,
            shippingCharge: Number,
            cod_charge: Number,
            total_weight: Number,
        }
    },
    coupon_code: String,
    coupon_discount: Number,
    discount_type: Object,
    delivery_address: {},
    cod: Number, // 1 true, 0 false
    order_history: {
        food_delivered: Date,
        driver_accepted: Date,
        driver_pickedup: Date,
        order_time: Date,
        restaurant_accepted: Date,
        restaurant_rejected: Date,
        delivered: Date,
        packed: Date,
        shipped: Date,
        order_collected: Date,
        refund_pending: Date,
        refund_accepted: Date,
        refund_success: Date,
        refund_canceled: Date,
        refund_onhold: Date,
        refund_failed: Date,
        cancelledDate: Date,
        returnedDate: Date
    },
    location: {
        lng: Number,
        lat: Number
    },
    status: Number,// 0-Deleted,1-order received,2-restaurant rejected,3-restaurant acepted,4-driver rejected,5-driver acepted,6-driver pickedup,7-deliverd,8-payment completed,9-cancelled by user,10-admin cancelled oreder,15-scheduled, 16-returned, 17-product_cullected, 18- refunded 19-cancel order by admin
    status_description:String,
    wallet_payment_details: {
        admin_pending_amount: { type: Number, default: 0 },
        driver_pending_amount: { type: Number, default: 0 },
        admin_amount: { type: Number, default: 0 },
    },
    paid: { type: Number, default: 0 },
    repay: { type: Number, default: 0 },//0 - no need to pay ,1 - admin needs to pay client
    cancellationreason: String,
    returnReason: String,
    returnStatus: { type: Boolean, default: false },
    refundStatus: String,
    main_city: String,
    sub_city: String,
    mileages_travelled: Number,
    minimum_distance: Number,
    night_fare_commision: Number,
    extra_fare_commision: Number,
    cart_details: {},
    pickup_distance: Number,
    deliver_distance: Number,
    invoice_number : String,
    driver_fare: {
        baseprice: Number,
        format: String,
        extra_price: Number,
        minimum_distance: Number
    },
    pickup_coords: [],
    deliver_coords: [],
    confirmed: { type: Number, default: 0 }, // 0- item not confirm by driver, 1- item confirmed by driver
    billing_address: {},
    shipping_address : {},
    shiprocket_data:{},
    shiprocket_timeline:[]

};
module.exports = ORDERS_SCHEMA;
