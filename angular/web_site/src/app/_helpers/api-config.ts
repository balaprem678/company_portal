export const Apiconfig = {
    mainData: {
        method: "post",
        url: "site/main"
    },
    Getpage: {
        method: "post",
        url: "site/users/get-page",
    },
    landingData: {
        method: "post",
        url: "site/landing/landingdata"
    },
    siteSettign: {
        method: "get",
        url: "get/site-settings/details"
    },

    shiprocketOrdersStatus: {
        "url": "shiprocket_getorderstatus",
        "method": "post"
    },

    allCategory: {
        method: "post",
        url: "site/get-all-category"
    },
    allBanners: {
        method: "get",
        url: "site/get-all-banners"
    },
    allBrands: {
        method: "get",
        url: "site/get-all-brands"
    },
    allFeatureProduct: {
        method: "post",
        url: "site/get-feature-products"
    },
    getCategoryList: {
        method: "post",
        url: "site/get-category-list"
    },
    getExpensiveProd: {
        method: "post",
        url: "site/get-expensive-product"
    },
    hotSellingProduct: {
        method: "get",
        url: "site/get-hotselling-products"
    },
    widgets: {
        "url": "settings/widgets",
        "method": "get"
    },
    trendinWeekProducts: {
        method: "post",
        url: "site/trending-week-prod"
    },
    codPayment: {
        method: 'post',
        url: "site/users/cod-payment"
    },
    subscribeData: {
        method: 'post',
        url: "site/subscribe"
    },
    subscribeDataList: {
        method: 'get',
        url: "site/subscribe-list"
    },
    recommendProducts: {
        method: 'post',
        url: "site/recommended"
    },
    offerManagementList: {
        "url": "offer/list",
        "method": "post"
    },
    testimonialManagementList: {
        "url": "testimonial/list",
        "method": "post"
    },
    getFaq: {
        "url": "site/users/get-faq",
        "method": "post"
    },
    contactUS: {
        method: 'post',
        url: "site/contact-us"
    },
    allProducts: {
        method: "post",
        url: "site/get-all-products"
    },
    cancelReason: {
        method: "get",
        url: "site/users/get-cancel-reason"
    },
    allSearchData: {
        method: "post",
        url: "site/search-product"
    },
    fCategory: {
        method: "get",
        url: "site/get-all-fcategory"
    },
    feautr_pro: {
        method: "post",
        url: "site/feature_cat_product"
    },
    featured_categories: {
        method: "post",
        url: "site/featured_categories"
    },

    save_profilelist: {
        method: "post",
        url: "site/users/save/profile"
    },
    userVerifyLogin: {
        method: "post",
        url: "site/login-verify-phone-otp"
    },
    userLogin: {
        method: "post",
        url: "site/site-user-login"
    },
    userProfileUpdate: {
        method: "post",
        url: 'site/user/updateUser'
    },
    siteRegisterOtp: {
        method: "post",
        url: "siteuserregisterotp"
    },
    getshippingManagement: {
        "url": "settings/getshipping",
        "method": "get"
    },
    siteRegister: {
        method: "post",
        url: "siteuserregister"
    },

    favouriteList: {
        method: "post",
        url: "site/users/favouritelist"
    },
    comboOfferList: {
        method: "post",
        url: "site/product/all/combo"
    },
    shipManagement: {
        method: "post",
        url: "site/users/shippinmanagement"
    },
    applayCoupon: {
        method: "post",
        url: "site/user/apply-coupon"
    },
    fetchCoupon: {
        method: "post",
        url: "site/user/fetch-coupon"
    },
    removeCoupon: {
        method: "post",
        url: "site/user/remove-coupon"
    },
    rewardList: {
        method: "post",
        url: "site/users/reward-list"
    },
    addFavourite: {
        method: "post",
        url: "site/users/addfavourite"
    },
    delteFavourite: {
        method: "post",
        url: "site/users/deletefavourite"
    },
    multipleDeleteFavo: {
        method: "post",
        url: "site/users/multi-delete-favourite"
    },
    productDetails: {
        method: "post",
        url: "site/users/productdetails"
    },
    productDetailsGet: {
        method: "post",
        url: "site/product-details/get"
    },
    relatedProductList: {
        method: "post",
        url: "site/users/related-prod/list"
    },
    allmProductList: {
        method: "post",
        url: "site/get-all-mproducts"
    },
    get_variance: {
        method: "post",
        url: "site/get_variance"
    },
    saveAddres: {
        method: "post",
        url: "site/users/order/adress"
    },
    saveBillingAddress: {
        method: "post",
        url: "site/users/order/billadress"
    },
    saveNewAddres: {
        method: "post",
        url: "site/users/new/adress"
    },
    getBillingAddress: {
        method: "post",
        url: "site/users/get/billing-address"
    },
    getShippingAddress: {
        method: "post",
        url: "site/users/get/shipping-address"
    },
    editShippingAddress: {
        method: "post",
        url: "site/users/edit/shipping-address"
    },
    setAsDefaultShippingAddress: {
        method: "post",
        url: "site/users/set-default/adress"
    },
    deleteShippingAddress: {
        method: "post",
        url: "site/users/delete/adress"
    },
    deleteAddress: {
        method: "post",
        url: "site/users/delete/order/adress"
    },
    deleteBillingAddress: {
        method: "post",
        url: "site/users/delete/billing/adress"
    },
    editAddress: {
        method: "post",
        url: "site/users/order/edit-adress"
    },
    updateAddress: {
        method: "post",
        url: "site/users/update-address"
    },
    timeSlotData: {
        method: "get",
        url: "site/get-all-timeslots"
    },
    deliveryCharge: {
        method: "post",
        url: "site/users/deliverycharge"
    },
    stripedata: {
        method: "get",
        url: "stripedata"
    },
    addressCount: {
        method: "post",
        url: "site/users/address/count"
    },
    getDeliveryAddress: {
        method: "post",
        url: "site/users/get-address"
    },
    getTaxForCart: {
        method: "post",
        url: "site/users/order/tax"
    },
    getCouponData: {
        method: "get",
        url: "site/users/getOfferCoupons"
    },
    updateCouponUsed: {
        method: "get",
        url: "site/users/updateCoupons"
    },
    getMaxminPrice: {
        method: "get",
        url: "site/max-min-price"
    },
    recentlyVisit: {
        method: "post",
        url: "site/users/recently-visit"
    },
    cartCount: {
        method: "post",
        url: "site/users/cart/count"
    },
    getUser: {
        method: "post",
        url: "site/users/get_user"
    },
    getSocialLink: {
        method: "get",
        url: "site/users/get-social-link"
    },
    pagesData: {
        method: "get",
        url: "site/users/pagelist"
    },
    forgotPassword: {
        method: "post",
        url: "site/users/forgot-password"
    },
    verifyOtp: {
        method: "post",
        url: "site/users/otp-verify"
    },
    sendOtp: {
        method: "post",
        url: "site/users/otp-send"
    },
    changePassword: {
        method: "post",
        url: "site/users/change-password"
    },
    createTempOrder: {
        method: "post",
        url: "site/users/create-temp-order"
    },
    stripePayment: {
        method: "post",
        url: "stripepayment"
    }
    ,
    mipsPaymentRequest: {
        method: "post",
        url: "site/mips/payment-request"
    },
    subscribeUser: {
        method: "post",
        url: "site/subscribe-user"
    },
    downloadSummery: {
        method: "post",
        url: "site/users/orderSummary"
    },
    ratingProduct: {
        method: "post",
        url: "site/users/review-rating-product"
    },
    orderList: {
        method: "post",
        url: "site/user/order"
    },
    reOrder: {
        method: "post",
        url: "site/user/reorder"
    },
    cancelOrder: {
        method: "post",
        url: "site/user/cancel-order"
    },
    returnProduct: {
        method: "post",
        url: "site/user/return-product"
    },
    printOrders: {
        method: "post",
        url: "site/order/printDocument"
    },
    invoice_number_site: {
        method: "post",
        url: "site/get/invoice_generate"
    },
    getRattingList: {
        method: "post",
        url: "site/users/rattign-list"
    },
    getReviewData: {
        method: "post",
        url: "site/users/getreview"
    },
    addRecentVisit: {
        method: "post",
        url: "site/users/recent/visit"
    },
    getProductSize: {
        method: "post",
        url: "site/users/product/size"
    },
    checkPaymentStatus: {
        method: "post",
        url: "order/payment/status_check"
    },
    ratingProductList: {
        method: "post",
        url: "site/product/rating/list"
    },
    //get paymetn methode
    getPaymentMethode: {
        method: "get",
        url: "site/getpaymentmethods"
    },
    checkTimeSlot: {
        method: "get",
        url: "site/check_time_slots"
    },

    //prabu

    post_question: {
        method: "post",
        url: "site/user/postquestion"
    },
    category_filter_get: {
        method: "post",
        url: "site/category/filter"
    },
    sub_cat_filter_get: {
        method: "post",
        url: "site/sub-category/filter"
    },
    sub_category_filter_get: {
        method: "post",
        url: "site/sub-category/list"
    },
    product_all_list: {
        method: "post",
        url: "site/product/all/list"
    },

    getBannerTypes: {
        "url": "banners/getbanners",
        "method": "post"
    },

    // tag with products api

    getAllTags: {
        "url": 'tags/getAll',
        "method": 'post'
    },
    getAllDeals: {
        "url": 'deals/getAll',
        "method": 'post'
    },
    emailRegisterCheck: {
        method: "post",
        url: "site/users/email_check"
    },
}