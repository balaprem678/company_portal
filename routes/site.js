"use strict";

var jwt = require('jsonwebtoken');
var middlewares = require('../model/middlewares.js');
var CONFIG = require('../config/config.js');
var axios = require('axios');
const user = require('../controller/mobile/user.js');
const { validator } = require("../model/validators.js");
const { check, body, validationResult, sanitizeBody } = require('express-validator');
var db = require('../controller/adaptor/mongodb.js');

function ensureAuthorized(req, res, next) {
    var authorizationHeader = req.headers.authorization;

    if (authorizationHeader) {

        if (authorizationHeader.startsWith('Bearer ')) {
            var token = authorizationHeader.slice(7);

            jwt.verify(token, CONFIG.SECRET_KEY, async function (err, decoded) {
                if (err) {
                    console.log(err);
                    res.status(401).send('Unauthorized Access');
                } else {
                    console.log('decoded', decoded)
                    if (decoded && decoded.email) {
                        let userDetails = await db.GetOneDocument('users', { email: decoded.email, status: 1 }, {}, {});
                        if (userDetails && userDetails.doc) {
                            next();
                        } else {
                            res.status(401).send('Unauthorized Access - Invalid Bearer token format');
                        }
                    } else {
                        res.status(401).send('Unauthorized Access - Invalid Bearer token format');
                    };
                }
            });
        } else {
            res.status(401).send('Unauthorized Access - Invalid Bearer token format');
        }
    } else {
        res.status(401).send('Unauthorized Access - Bearer token missing');
    }
};

function ensureAuthorizedSkip(req, res, next) {
    
    var authorizationHeader = req.headers.authorization;
    console.log(authorizationHeader,'authorizationHeader');
    if (authorizationHeader) {

        if (authorizationHeader.startsWith('Bearer ')) {
            var token = authorizationHeader.slice(7);

            jwt.verify(token, CONFIG.SECRET_KEY, async function (err, decoded) {
                if (err) {
                    console.log(err);
                    res.status(401).send('Unauthorized Access');
                } else {
                    if (decoded && decoded.email) {
                        let userDetails = await db.GetOneDocument('users', { email: decoded.email, status: 1 }, {}, {});
                        if (userDetails && userDetails.doc && userDetails.doc._id) {
                            next();
                        } else {
                            res.status(401).send('Unauthorized Access - Invalid Bearer token format');
                        }
                    } else {
                        res.status(401).send('Unauthorized Access - Invalid Bearer token format');
                    };
                }
            });
        } else {
            res.status(401).send('Unauthorized Access - Invalid Bearer token format');
        }
    } else {
        next();
    }
}

function ensureAuthorizedUser(req, res, next) {
    var authorizationHeader = req.headers.authorization;
    console.log(authorizationHeader,'authorizationHeader');
    
    if (authorizationHeader) {

        if (authorizationHeader.startsWith('Bearer ')) {
            var token = authorizationHeader.slice(7);

            jwt.verify(token, CONFIG.SECRET_KEY, async function (err, decoded) {
                if (err) {
                    console.log(err);
                    res.status(401).send('Unauthorized Access');
                } else {
                    if (decoded && decoded.email) {
                        let userDetails = await db.GetOneDocument('users', { email: decoded.email, status: 1 }, {}, {});
                        if (userDetails && userDetails.status) {

                            next();
                        } else {
                        let userDetails = await db.GetOneDocument('users', { email: decoded.email, }, {}, {});
                        if(userDetails.doc.status==2){
                            res.status(401).send('Unauthorized Access - user is deleted');
                        }else if(userDetails.doc.status==0){
                            res.status(401).send('Unauthorized Access - User is inactive');
                        }
                        }
                    } else {
                        res.status(401).send('Unauthorized Access - Invalid Bearer token format');
                    };
                }
            });
        } else {
            res.status(401).send('Unauthorized Access - Invalid Bearer token format');
        }
    } else {
        next();
    }
}

module.exports = function (app, io) {
    try {
        /** ROUTERS for site **/
        var site_landing = require('../controller/site/landing.js')(app);
        var site_restaurant = require('../controller/site/restaurant.js')(app, io);
        var site_orders = require('../controller/site/orders.js')(io);
        var pages = require('../controller/site/pages.js')(app);
        var users = require('../controller/site/users.js')(io);
        var site_payment = require('../controller/site/payment.js')(io);
        var drivers = require('../controller/site/drivers.js')(app);
        const coupon = require('../controller/site/coupon.js')(io)


        /* landing page*/
        app.get('/slider/list', ensureAuthorizedSkip, site_landing.list);
        app.post('/site/main', ensureAuthorizedSkip, site_landing.getMainData);
        app.post('/site/landing/landingdata', ensureAuthorizedSkip, site_landing.getlandingdata);
        app.get('/site/landing/getDefaultLanguage', ensureAuthorizedSkip, site_landing.getDefaultLanguage);
        app.get('/site/landing/getDefaultCurrency', ensureAuthorizedSkip, site_landing.getDefaultCurrency);

        app.post('/site/landing/getTransalatePage', ensureAuthorizedSkip, site_landing.getTransalatePage);
        app.post('/site/landing/subscription', ensureAuthorizedSkip, site_landing.subscription);
        app.get('/get/site-settings/details', ensureAuthorizedSkip, site_landing.settingsDetails);
        app.get('/site/restarant/getrcat', ensureAuthorizedSkip, site_restaurant.getRcat);
        app.get('/site/restarant/getcity', ensureAuthorizedSkip, site_restaurant.getCity);
        app.post('/restarant/get/subcity', ensureAuthorizedSkip, site_restaurant.getsubCity);
        app.post('/site/rest/currentUser', ensureAuthorizedSkip, site_restaurant.currentRest);
        app.post('/restarant/get/dashboard_data', ensureAuthorizedSkip, site_restaurant.getDashdata);
        app.post('/site/restarant/get/filter_data', ensureAuthorizedSkip, site_restaurant.getDash_filterdata);
        app.post('/restarant/availabilityChange', ensureAuthorizedSkip, site_restaurant.avilabilityEdit);
        app.post('/site/restarant/upload_logo', ensureAuthorizedSkip, middlewares.commonUpload(CONFIG.DIRECTORY_OTHERS).any(), site_restaurant.updateLogo);
        app.post('/restarant/update/info', ensureAuthorizedSkip, middlewares.commonUpload(CONFIG.DIRECTORY_OTHERS).any(), site_restaurant.updateBinfo);
        app.post('/site/restaurant/document/dynamic', ensureAuthorized, site_restaurant.getDocField);
        app.post('/site_restarant/get/earnings', ensureAuthorized, site_restaurant.getEarnings);
        app.post('/site/restarant/save/bank_info', ensureAuthorized, site_restaurant.saveBankinfo);
        app.post('/site/restarant/get/categories', ensureAuthorized, site_restaurant.getCategories);
        app.post('/site/restarant/save/main_cat', ensureAuthorized, site_restaurant.saveMainCategories);
        app.post('/site/rest/category/catList', ensureAuthorized, site_restaurant.getSubCategories);
        app.post('/site/restarant/save/sub_cat', ensureAuthorized, site_restaurant.saveSubCategories);
        app.post('/site/restarant/get/categories/for_food', ensureAuthorized, site_restaurant.FoodAddCategories);
        app.post('/site/restarant/save/food', ensureAuthorized, site_restaurant.saveFood);
        app.post('/restarant/get/aboutbusiness_data', ensureAuthorized, site_restaurant.AboutBusiness);
        app.post('/site/restarant/get/menus', ensureAuthorized, site_restaurant.GetMenus);
        app.post('/site/restarant/get/food', ensureAuthorized, site_restaurant.GetFoods);
        app.post('/site/food/visibility', ensureAuthorized, site_restaurant.foodVisibility);
        app.post('/site/addons/visibility', ensureAuthorized, site_restaurant.addonsVisibility);
        app.post('/site/basepack/visibility', ensureAuthorized, site_restaurant.basepackVisibility);
        app.post('/site/initial/food', ensureAuthorized, site_restaurant.getInitialFoods);
        app.post('/restarant/get/mostsaled/food', ensureAuthorized, site_restaurant.mostSaledFood);
        app.post('/site/seve/recomend_food', ensureAuthorized, site_restaurant.saveRecomendFoods);
        app.post('/site/remove/recomend_food', ensureAuthorized, site_restaurant.removeRecomendFoods);
        app.post('/site/rest/sendForgotEmail', ensureAuthorized, site_restaurant.restsendForgotEmail);
        app.post('/site/restaurant/changePassword', ensureAuthorized, site_restaurant.changeForgotEmail);
        app.post('/site/get/popup/food', ensureAuthorized, site_restaurant.getpopupFoods);
        app.post('/site/restarant/get/recomend_food', ensureAuthorized, site_restaurant.getrecomendFoods);
        app.post('/site/restarant/fetchCycles', ensureAuthorized, site_restaurant.getCycles);
        app.post('/site/restarant/billingdata', ensureAuthorized, site_restaurant.Billingdata);
        app.get('/site/restaurant/timezones', ensureAuthorized, site_restaurant.restaurantTimezones);
        app.post('/site/restarant/update/main_cat', ensureAuthorized, site_restaurant.updateMainCategories);
        app.post('/site/restarant/update/sub_cat', ensureAuthorized, site_restaurant.updateSubCategories);



        //orders Url
        app.post('/restarant/get/order_history', ensureAuthorized, site_orders.ResOrHistory);
        app.post('/restarant/get/or_max_history', ensureAuthorized, site_orders.ResOrHistoryMax);
        app.post('/restarant/get/order', ensureAuthorized, site_orders.ResOrders);
        app.post('/restarant/get/new-order', ensureAuthorized, site_orders.ResNewOrders);
        app.post('/restarant/get/on-going-order', ensureAuthorized, site_orders.ResOnGoingOrders);
        app.post('/restarant/get/scheduled-order', ensureAuthorized, site_orders.ScheduledOrders);
        app.post('/restarant/get/rejected-order', ensureAuthorized, site_orders.ResRejectedOrders);
        app.post('/site/get/invoice_generate', site_orders.invoice_number);
        app.post('/restarant/get/driver_accepted/order', ensureAuthorized, site_orders.DriverAccOrders);
        app.post('/restarant/reject/order', ensureAuthorized, site_orders.ResrejectOreder);
        app.post('/site/account/getcancelreason', ensureAuthorized, site_orders.getcancelreason);
        app.post('/site/orders/orderlist', ensureAuthorized, site_orders.getordercount);
        app.post('/restarant/accept/order', ensureAuthorized, site_orders.RestAcceptOrder);
        app.post('/restarant/order/printDocument', ensureAuthorized, site_orders.printDocument);


        /** Footer Page**/
        app.post('/site/pages/getpage', ensureAuthorizedSkip, pages.getpage);
        app.post('/site/users/shippinmanagement', ensureAuthorizedSkip, users.getshippingManagement);
        //app.get('/site/faq/getfaq', pages.getfaq);
        app.post('/site/get-all-category', ensureAuthorizedSkip, users.getAllRcategory);
        app.get('/site/get-hotselling-products', ensureAuthorizedSkip, users.hotselling_products);
        app.get('/site/get-all-fcategory', ensureAuthorizedSkip, users.getAllFeaturecategory);
        app.get('/site/get-all-fcategory1', ensureAuthorizedSkip, users.headercategorylist);
        app.get('/site/get-all-citys', ensureAuthorizedSkip, users.getAllCitys);
        app.get('/site/get-all-timeslots', ensureAuthorizedSkip, users.getalltimeslots);
        app.get('/site/get-all-banners', ensureAuthorizedSkip, users.getBanners);
        app.get('/site/get-all-brands', ensureAuthorizedSkip, users.getBrands);
        app.get('/site/get-all-searchdata', ensureAuthorizedSkip, users.getsearchdata);
        app.post('/site/search-product', ensureAuthorizedSkip, users.searchproducts);
        app.get('/site/max-min-price', ensureAuthorizedSkip, users.maxminPrice);
        app.post('/site/trending-week-prod', ensureAuthorizedSkip, users.trendingweekproducts);
        app.post('/site/get-feature-products', ensureAuthorizedSkip, users.featureproducts);
        app.post('/site/feature_cat_product', ensureAuthorizedSkip, users.featured_cat)  // new api for show feautred products below banner

        app.post('/site/featured_categories', ensureAuthorizedSkip, users.get_featured_categories)

        app.post('/site/get-category-list', ensureAuthorizedSkip, users.getAllCategory);
        app.post('/site/contact-us', ensureAuthorizedSkip, users.contactUs);

        ///re-order
        app.post('/site/user/reorder', ensureAuthorizedSkip, users.reorder);




        app.post('/site/get-expensive-product', ensureAuthorizedSkip, users.getExpensiveProduct);
        app.post('/site/get-all-products', ensureAuthorizedSkip, users.productlist);
        app.post('/site/get-all-mproducts', ensureAuthorizedSkip, users.getproductlist);
        app.post('/site/get_variance', ensureAuthorizedSkip, users.get_variance)
        app.get('/site/get-all-feature-city', ensureAuthorizedSkip, users.getAllFeatureCity);
        app.post('/site/user-forgotpass', ensureAuthorizedSkip, users.forgotpass);
        app.post('/site/user-change-password', ensureAuthorizedSkip, users.changePassword);
        app.post('/site/user-getAccounts', ensureAuthorizedSkip, users.getAccounts);
        app.post('/site/user-checkLink', ensureAuthorizedSkip, users.checkLink);
        app.post('/site/login-verify-phone-pass', ensureAuthorizedSkip, users.loginVerifyPhonepass);
        app.post('/site/login-verify-phone-otp', ensureAuthorizedSkip, users.loginVerifyPhoneOtp);
        app.post('/site/get-city-details', ensureAuthorizedSkip, users.getCityDetails);
        app.post('/site/get-restaurant-details', ensureAuthorizedSkip, users.getRestaurantDetails);
        app.post('/site/get-item-details', ensureAuthorizedSkip, users.getItemDetails);
        app.post('/site/users/signup', ensureAuthorizedSkip, users.SignUp);
        app.post('/site/users/getrefercoupon', ensureAuthorizedSkip, users.getrefercoupon);
        app.post('/site/users/order/adress', ensureAuthorizedSkip, users.saveOrderAddress);
        app.post('/site/users/order/tax', ensureAuthorizedSkip, users.fetchTaxForProducts);
        app.post('/site/users/order/billadress', ensureAuthorizedSkip, users.saveBillAddress);
        app.post('/site/users/new/adress', ensureAuthorizedSkip, users.saveNewAddress);
        app.post('/site/users/delete/adress', ensureAuthorizedSkip, users.deleteAddress);
        app.post('/site/users/set-default/adress', ensureAuthorizedSkip, users.setDefaultAddress);
        app.post('/site/users/update-address', ensureAuthorizedSkip, users.updateAddress);
        app.post('/site/users/get-address', ensureAuthorizedSkip, users.getDeleveryAddress);
        app.post('/site/users/address/count', ensureAuthorizedSkip, users.userAddressCount);
        app.post('/site/users/order/edit-adress', ensureAuthorizedSkip, users.editOrderAddress);
        app.post('/site/users/delete/order/adress', ensureAuthorizedSkip, users.deleteOrderAddress)
        app.post('/site/users/delete/billing/adress', ensureAuthorizedSkip, users.deleteBillingAddress)
        app.post('/site/users/delete/order/card', ensureAuthorizedSkip, users.deleteOrderCard)
        app.post('/site/users/save/profile', ensureAuthorizedSkip, users.saveUserProfile);
        app.post('/site/users/get/billing-address', ensureAuthorizedSkip, users.getBillingAddress);
        app.post('/site/users/get/shipping-address', ensureAuthorizedSkip, users.getShippingAddress);
        app.post('/site/users/edit/shipping-address', ensureAuthorizedSkip, users.editShippingAddress);
        app.post('/site/users/cart/count', ensureAuthorizedSkip, users.cartCount);
        app.post('/site/users/get_user',ensureAuthorizedUser, users.getUser)
        app.post('/site/users/add-remove/favourite/restaurant', ensureAuthorizedSkip, users.addRemoveFavourite);
        app.get('/site/users/get-payment-gateway', ensureAuthorizedSkip, users.getPaymentGateway);
        app.get('/site/users/get-payment-methods', ensureAuthorizedSkip, users.getPaymentMethods);
        app.get('/site/users/get-cancel-reason', ensureAuthorizedSkip, users.getcancelreason);
        app.get('/site/users/orderSummary', ensureAuthorizedSkip, users.orderSummary);
        app.post('/site/users/usersUniqueCode', ensureAuthorizedSkip, users.usersUniqueCode);
        app.get('/site/users/userorderSummary', ensureAuthorizedSkip, users.userorderSummary);
        app.post('/site/users/claim-reward', ensureAuthorizedSkip, users.userclaimreward);
        app.post('/site/users/reward-list', ensureAuthorizedSkip, users.rewardlist);
        app.post('/site/users/deliverycharge', ensureAuthorizedSkip, users.deliverycharge);
        app.post('/site/users/productdetails', ensureAuthorizedSkip, users.productdetails);
        app.post('/site/users/addfavourite', ensureAuthorizedSkip, users.addFavourite);
        app.post('/site/users/deletefavourite', ensureAuthorizedSkip, users.deleteFavourite);
        app.post('/site/users/multi-delete-favourite', ensureAuthorizedSkip, users.multiDeleteFav);
        app.post('/site/users/favouritelist', ensureAuthorizedSkip, users.favouritelist);
        app.post('/site/users/recently-visit', ensureAuthorizedSkip, users.recentyVisit);
        app.post('/site/users/related-prod/list', ensureAuthorizedSkip, users.relateProductlist);
        app.get('/site/users/get-social-link', ensureAuthorizedSkip, users.SocilaLink);
        app.get('/site/users/pagelist', ensureAuthorizedSkip, users.pageList);
        app.post('/site/users/get-page', ensureAuthorizedSkip, users.getPage);
        app.post('/site/users/forgot-password', ensureAuthorizedSkip, users.forgotPassword);
        app.post('/site/users/otp-verify', ensureAuthorizedSkip, users.otpVerify);
        app.post('/site/users/otp-send', ensureAuthorizedSkip, users.sendotp);
        app.post('/site/users/change-password', ensureAuthorizedSkip, users.changePassword);
        app.post('/site/users/review-rating-product', [
            check('user_id', 'user_id is required').notEmpty(),
            check('product_id', 'product_id is required').notEmpty(),
            check('order_id', 'order_id is required').notEmpty(),
            check('rating', 'rating is required').optional(),
            check('comment', 'comment is required').optional(),
            check('rating_id', 'Rating is required').optional(),
            check('multiBase64', 'multiBase64 is required').optional(),
        ], ensureAuthorizedSkip, users.reviewProduct);
        app.post('/site/subscribe-user', ensureAuthorizedSkip, users.subscribeUser);
        app.post('/site/user/order', [
            check('user_id', 'user id is required').notEmpty()
        ], ensureAuthorizedSkip, users.ordersList);
        app.post('/site/user/cancel-order', ensureAuthorizedSkip, users.cancelOrder);
        app.post('/site/user/return-product', ensureAuthorizedSkip, users.returnOrder)
        app.post('/site/order/printDocument', ensureAuthorizedSkip, users.printDocument);
        app.post('/site/users/rattign-list', ensureAuthorizedSkip, users.rattingList);
        app.post('/site/product/rating/list', [
            check('product_id', 'Product id is required').notEmpty()
        ], ensureAuthorizedSkip, users.ratingProductList);
        app.post('/site/users/getreview', [
            check('user_id', 'user_id is required').notEmpty(),
            check('product_id', 'product_id is required').notEmpty(),
            check('order_id', 'order_id is required').notEmpty(),
            check('rating_id', 'rating_id is required').notEmpty(),
        ], ensureAuthorizedSkip, users.getReviewDetail);
        app.post('/site/users/recent/visit', ensureAuthorizedSkip, users.recent_visit);
        app.post('/site/users/product/size', ensureAuthorizedSkip, users.productSize);
        app.post('/site/user/order-email', ensureAuthorizedSkip, users.orderMailUpdate);
        app.post('/site/users/get-faq', users.faqData);
        app.post('/site/user/updateUser', ensureAuthorizedSkip, users.updateUserProfile)
        app.post('/site/subscribe', users.subscribe_Data)
        app.get('/site/subscribe-list', users.subscribe_Data_list)
        app.post('/site/recommended', users.Recommeneded)
        app.post('/site/users/email_check', users.checkEmailRegister)
        app.post('/site/users/phone_check', users.checkPhoneRegister)

        //faqs


        //    app.post('/site/user/postquestion', users.add_product_faqs)

        /* API List for Payments*/
        app.post('/site/users/stripe-payment', ensureAuthorizedSkip, site_payment.stripePayment);
        app.post('/site/users/paypal-payment', ensureAuthorizedSkip, site_payment.paypalPayment);
        app.post('/site/users/no-payment', ensureAuthorizedSkip, site_payment.noPayment);
        app.post('/site/users/cod-payment', ensureAuthorizedSkip, site_payment.CODPayment);
        app.post('/site/users/cancel-order', ensureAuthorizedSkip, site_payment.cancelOrder);
        app.get('/site/users/payment/paypal/cancel', ensureAuthorizedSkip, site_payment.paypalCancel);
        app.get('/site/users/payment/paypal/execute', ensureAuthorizedSkip, site_payment.paypalExecute);
        app.post('/site/users/paypal-recharge', ensureAuthorizedSkip, site_payment.paypalRecharge);
        app.get('/site/users/recharge/paypal/cancel', ensureAuthorizedSkip, site_payment.paypalRechargeCancel);
        app.get('/site/users/recharge/paypal/execute', ensureAuthorizedSkip, site_payment.paypalRechargeExecute);
        app.get('/site/users/getOfferCoupons', ensureAuthorizedSkip, site_payment.getOfferCoupons);

        // app.post('/site/users/create-temp-order', site_payment.createtempOrders);
        app.post('/site/users/create-temp-order', ensureAuthorizedSkip, site_payment.createtempOrdersNew);
        app.get('/site/mips/payment-request', ensureAuthorizedSkip, site_payment.mipsPaymentrequest);
        app.get('/site/cashfree/request', ensureAuthorizedSkip, site_payment.cashrequest);
        app.post('/cashfree/response', ensureAuthorizedSkip, site_payment.cashresponse);
        app.get('/mips/response', ensureAuthorizedSkip, site_payment.mipsresponse);
        app.post('/mips/payment/success', ensureAuthorizedSkip, site_payment.paymentSuccess);
        app.post('/order/payment/status_check', ensureAuthorizedSkip, site_payment.chechPayment);
        app.post('/order/refund-status', ensureAuthorizedSkip, site_payment.checkRefundStatus)

        app.get("/site/check_time_slots", ensureAuthorizedSkip, site_payment.getTimeSlot)
        app.get("/site/getpaymentmethods", ensureAuthorizedSkip, site_payment.getpaymentmethods)   //get all the payment methode available for the users
        app.get("/stripedata", ensureAuthorizedSkip, site_payment.getstripedata)//stripedata fetching
        app.post('/stripepayment', ensureAuthorizedSkip, site_payment.stripepayment)
        app.post('/stripechargewebhook', ensureAuthorizedSkip, site_payment.stripe_chargewebhook)//webhook for stripe charge success
        app.post("/striprefundwebhook", ensureAuthorizedSkip, site_payment.striperefundwebhook) //webhook for the stripe charge refund


        app.post("/razorpayrefundwebhook", ensureAuthorizedSkip, site_payment.razorpayrefund) //webook verfication for razorpay for refund
        app.post('/razorpaywebhook', ensureAuthorizedSkip, site_payment.razorpaywebhook)//webhook verfication for razorapy order created 

        /* Site for drivers */
        app.post('/site/driver-login-verify-phone-pass', ensureAuthorizedSkip, drivers.driverloginVerifyPhonePass);
        app.post('/site/driver-login-verify-phone-otp', ensureAuthorizedSkip, drivers.driverloginVerifyPhoneOtp);
        app.get('/site/drivers/getCities', ensureAuthorizedSkip, drivers.getCities);
        app.post('/site/drivers/getProfileData', ensureAuthorizedSkip, drivers.getProfileData);
        app.post('/site/drivers/editProfile', ensureAuthorizedSkip, drivers.editProfile);
        app.post('/site/drivers/getDeliveries', ensureAuthorizedSkip, drivers.getDeliveries);
        app.post('/site/drivers/updateProfilePic', ensureAuthorizedSkip, middlewares.commonUpload('./uploads/images/users/').single('pic'), drivers.updateProfilepic)
        app.post('/site/drivers/getEarnings', ensureAuthorizedSkip, drivers.getEarnings);
        app.post('/site/drivers/getDashboard', ensureAuthorizedSkip, drivers.getDashboard);
        app.post('/site/drivers/updateDriverDocs', ensureAuthorizedSkip, middlewares.commonUpload('./uploads/images/others/').single('pic'), drivers.updateDriverDocs);
        app.post('/site/drivers/getAccounts', ensureAuthorizedSkip, drivers.getAccounts);
        app.post('/site/drivers/saveAccounts', ensureAuthorizedSkip, drivers.saveAccounts);
        app.post('/site/drivers/sendForgotEmail', ensureAuthorizedSkip, drivers.sendForgotEmail);
        app.post('/site/drivers/changePassword', ensureAuthorizedSkip, drivers.changePassword);
        app.get('/site/drivers/getCycles', ensureAuthorizedSkip, drivers.getCycles);
        app.get('/site/drivers/landingDetails', ensureAuthorizedSkip, drivers.getLanding);
        app.post('/site/drivers/fetchByCycle', ensureAuthorizedSkip, drivers.fetchByCycle);
        app.post('/site/driver/checkLink', ensureAuthorizedSkip, drivers.checkLink);
        app.get('/site/drivers/orderuserInvoice', ensureAuthorizedSkip, drivers.orderuserInvoice);

        app.post('/offer/list', users.offerManagementList);
        app.post('/testimonial/list', users.testimonialManagementList);
        app.post('/site_user_verify', ensureAuthorizedSkip, users.userVerify);
        app.post('/site_user_otp_verify', ensureAuthorizedSkip, users.otpVerify)
        app.post('/site/user/delete', ensureAuthorizedSkip, users.deleteUser);
        app.post('/site/user/apply-coupon', ensureAuthorizedSkip, coupon.applyCoupon)
        app.post('/site/user/fetch-coupon', ensureAuthorizedSkip, coupon.fetchCoupon)
        app.post('/site/user/remove-coupon', ensureAuthorizedSkip, coupon.removeCoupon)

        app.get('site/users/updateCoupons', ensureAuthorizedSkip, coupon.updateCouponTotal);


        app.get('/site/getIP', (req, res) => {
            axios.get("http://ipinfo.io/json", { json: true }).then((response) => {
                return res.json(response.data);
            })
        });


        //


        /**New Updated Routes for site products lis start */
        app.post("/site/category/filter", ensureAuthorizedSkip, users.getRcategoryList);
        app.post("/site/sub-category/filter", ensureAuthorizedSkip, users.sCategoryAll);
        app.post("/site/sub-category/list", ensureAuthorizedSkip, users.getSubCatList);
        app.post("/site/product/all/list", ensureAuthorizedSkip, users.productListAll);
        app.post("/site/product/all/combo", ensureAuthorizedSkip, users.comboOffer);
        app.post("/site/product-details/get", ensureAuthorizedSkip, validator.productDetail, users.productDetailsGet);
        /**New Updated Routes for site products lis end */


    } catch (e) {
        console.log('Error On Site', e);
    }
};
