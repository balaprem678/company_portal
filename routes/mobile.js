//"use strict";

var jwt = require('jsonwebtoken');
var middlewares = require('../model/middlewares.js');
var CONFIG = require('../config/config');

function ensureAuthorized(req, res, next) {
    var authorizationHeader = req.headers.authorization;

    if (authorizationHeader) {

        if (authorizationHeader.startsWith('Bearer ')) {
            var token = authorizationHeader.slice(7);

            jwt.verify(token, CONFIG.SECRET_KEY, function (err, decoded) {
                if (err) {
                    console.log(err);
                    res.status(401).send('Unauthorized Access');
                } else {
                    next();
                }
            });
        } else {
            res.status(401).send('Unauthorized Access - Invalid Bearer token format');
        }
    } else {
        res.status(401).send('Unauthorized Access - Bearer token missing');
    }
}
module.exports = function (app, io) {
    try {
        /* module */
        var mobile_user = require('../controller/mobile/user.js')(io);
        var mobile_driver = require('../controller/mobile/driver.js')(io);
        var mobile_orders = require('../controller/mobile/orders.js')(io);
        var mobile_restaurant = require('../controller/mobile/restaurant.js')(io);
        var mobile_payment = require('../controller/mobile/payment.js')(io);
        var custum_delete = require('../controller/custum/sortdb.js')(io);
        const mobile_product = require('../controller/mobile/product.js')(io);
        const mobile_settings = require('../controller/mobile/settings.js')(io);
        const mobile_rating = require('../controller/mobile/ratting.js')(io);
        const mobile_address = require('../controller/mobile/address.js')(io);
        const mobile_cart = require('../controller/mobile/cart.js')(io);
        const mobile_section = require('../controller/mobile/section.js')(io);

        const mobile_favourites = require('../controller/mobile/favourites.js')(io);
        const mobile_transactions = require('../controller/mobile/transaction.js')(io);
        const mobile_ticket = require('../controller/mobile/tickets.js')(io);

        /* API List for User*/
        app.post('/mobile/users/update_number/resend_otp', mobile_user.updtnumSendOtp);
        app.post('/mobile/users/app_info', mobile_user.appInfo);
        app.post('/mobile/users/profile/update', mobile_user.updateProfile);
        app.post('/mobile/users/profile/save', middlewares.commonUpload('./uploads/images/users/').fields([{ name: 'avatar', maxCount: 1 }]), mobile_user.saveprofile)
        // app.post('/mobile/users/profile-pic', middlewares.commonUpload('uploads/images/users/').single('file'), mobile_user.userProfilePic);
        app.post('/mobile/users/loginVerifyPhone', mobile_user.loginVerifyPhone);
        app.post('/mobile/users/SubmitOtpVerify', mobile_user.SubmitOtpVerify);
        app.post('/mobile/users/login', mobile_user.UserLogin);
        app.post('/mobile/users/signup', mobile_user.SignUp);
        app.post('/mobile/users/social/login', mobile_user.socialLogin);
        app.post('/mobile/users/social/signup/otp', mobile_user.socialSignUpOtp);

        app.post('/mobile/users/forgot/otp', mobile_user.forgotOtp);  // otp to phone number

        app.post('/mobile/users/check/restaurant/availability', mobile_user.restavailability);
        app.post('/mobile/users/forgot', mobile_user.mobileforgotPassword);
        app.post('/mobile/users/social/signup', mobile_user.socialSignUp);
        app.post('/mobile/users/social/check', mobile_user.socialCheck); // not using
        app.get('/mobile/users/termsandconditions', mobile_user.termsandConditions);
        app.post('/mobile/users/restaurant/list', mobile_user.restaurantList);
        app.post('/mobile/users/forgotpass/mailcheck', mobile_user.UsermailCheck);  //otp by both phone and mail
        app.post('/mobile/users/forgotpass/forgotPassword', mobile_user.UserforgotPassword);  // password update
        app.get('/mobile/users/rcategory/list', mobile_user.getRcat);
        app.post('/mobile/users/subcategory/list', mobile_user.subcatlist);
        app.post('/mobile/users/product/list', mobile_user.productlist);
        app.get('/mobile/users/banners/list', mobile_user.getBanners);
        app.post('/mobile/users/cusines/list', mobile_user.cusineList);
        app.post('/mobile/users/menu', mobile_user.foodMenu);
        app.post('/mobile/users/sub/menu', mobile_user.foodSubMenu);
        app.post('/mobile/users/get/food', mobile_user.getFood);
        app.post('/mobile/users/get/menu', mobile_user.getMenu);
        app.post('/mobile/users/getaddons', mobile_user.getAddons);
        app.post('/mobile/users/order/adress', mobile_user.saveOrderAddress);
        app.post('/mobile/users/get/order/adress', mobile_user.getOrderAddress);
        app.post('/mobile/users/delete/order/adress', mobile_user.deleteOrderAddress);
        app.post('/mobile/users/edit/order/adress', mobile_user.editOrderAddress);
        app.post('/mobile/users/check/adress/distance', mobile_user.checkOrderdist);// not using
        app.post('/mobile/users/change/password', mobile_user.changePassword);
        app.post('/mobile/users/add/favourite/restaurant', mobile_user.addFavourite);
        app.post('/mobile/users/get/favourite/restaurant', mobile_user.getFavourite);
        app.post('/mobile/users/logout', mobile_user.logout);
        app.post('/mobile/user/notification/mode', mobile_user.notificationMode);
        app.post('/mobile/users/search/restaurant', mobile_user.searchRestaurant);
        app.post('/mobile/users/get/cancelreason', mobile_user.cancellationreson);
        app.post('/mobile/users/profilePic', middlewares.commonUpload('./uploads/images/users/').fields([{ name: 'avatar', maxCount: 1 }]), mobile_user.profilePic);
        app.post('/mobile/users/submit-rating', mobile_user.submit_Rating);
        app.post('/mobile/users/get-unrating', mobile_user.get_Unrating);
        app.post('/mobile/users/get-profile', mobile_user.get_Profile);
        app.post('/mobile/users/payment_list', mobile_user.get_PayList);
        app.post('/mobile/users/deliverycharge', mobile_user.deliverycharge);
        app.post('/mobile/users/product/all/list', mobile_user.productListAll);
        //app.get('/mobile/users/getFeaturedRestaurantList', mobile_user.getFeaturedRestaurantList);
        app.post('/mobile/users/getFeaturedRestaurantList', mobile_user.getFeaturedRestaurantList);
        app.post('/mobile/users/offer/list', mobile_user.offerList);
        app.post('/mobile/users/profile/update-number', mobile_user.updateNumber);
        app.post('/mobile/users/getUserCardDetails', mobile_user.getUserCardDetails);
        app.post('/mobile/users/getUserCityid', mobile_user.getUserCityid);
        app.get('/mobile/users/gettimeslots', mobile_user.getalltimeslots);
        app.get('/mobile/users/get-all-payments', mobile_user.getallpayments);
        app.post('/mobile/users/get-all-headercategorys', mobile_user.getAllFeaturecategory);
        app.get('/mobile/users/get-all-brands', mobile_user.getBrands);
        app.get('/mobile/users/get-hotselling-products', mobile_user.hotselling_products);
        app.post('/mobile/users/recently-visit', mobile_user.recentlyVisit); // getting recently visited products
        app.post('/mobile/users/recent/visit', mobile_user.recent_visit);  //adding recently visited products
        /* API List for orders*/
        app.post('/mobile/users/order/min_history', mobile_orders.minOrderHis);
        app.post('/mobile/users/order/min_history_complete', mobile_orders.minOrderHiscomplete);
        app.post('/mobile/users/order/min_history_on_process', mobile_orders.minOrderHisOnprocess);
        app.post('/mobile/users/expand/order', mobile_orders.expandOrder);
        app.post('/mobile/users/track/order', mobile_orders.trackOrder);
        app.post('/mobile/users/get-delivery/charge', mobile_orders.deliveryCharge);

        app.post('/mobile/users/get/offer', mobile_orders.getOffer);
        app.post('/mobile/users/order', mobile_orders.placeOrders);
        app.post('/mobile/users/add/cart', mobile_orders.addCart);
        app.post('/mobile/users/cart/check', mobile_orders.cartCheck);
        app.post('/mobile/users/cart/get-cart-by-restaurant', mobile_orders.getCartDetailsByRestaurant);
        app.post('/mobile/users/getSingleOrderDetails', mobile_orders.getSingleOrderDetails);
        app.get('/mobile/users/getOfferCoupons', mobile_orders.getOfferCoupons);
        app.post('/mobile/users/applycoupon', mobile_orders.applyCoupon);
        app.post('/mobile/users/removeCoupon', mobile_orders.removeCoupon);

        app.post('/mobile/users/printDocument', mobile_orders.printDocument);


        /* API List for milestone reward*/
        app.post('/mobile/users/claim-reward', mobile_user.userclaimreward);
        app.post('/mobile/users/reward-list', mobile_user.rewardlist);
        app.post('/mobile/users/reward-details', mobile_user.rewarddetails);
        app.get('/mobile/user/get_banner_products', mobile_user.getProductsFromBanner)


        /* API List for referral*/
        app.post('/mobile/users/refer_friends', mobile_user.referFriends);

        /* API List for Payments*/
        app.post('/mobile/users/stripe-payment', mobile_payment.stripePayment);
        app.post('/mobile/users/cancel-order', mobile_payment.cancelOrder);
        app.post('/mobile/users/return-order', mobile_payment.returnOrder);
        app.post('/mobile/users/stripe', mobile_payment.retrive);
        app.post('/mobile/users/paypal-payment', mobile_payment.paypalPayment);
        app.get('/mobile/users/payment/paypal/execute', mobile_payment.paypalExecute);
        app.get('/mobile/users/payment/paypal/cancel', mobile_payment.paypalCancel);
        app.post('/mobile/users/paypal-recharge-payment', mobile_payment.paypalRecharge);
        app.get('/mobile/users/payment/recharge/paypal/execute', mobile_payment.paypalRechargeExecute);
        app.get('/mobile/users/payment/recharge/paypal/cancel', mobile_payment.paypalRechargeCancel);
        app.get('/mobile/payment/success', mobile_payment.paymentSuccess);
        app.get('/mobile/payment/failure', mobile_payment.paymentFailure);
        app.post('/mobile/users/codpayment', mobile_payment.CODPayment);

        app.post('/mobile/users/create-temp-order', mobile_payment.createtempOrdersNew);
        app.get("/mobile/users/stripedata", mobile_payment.getstripedata)
        app.post('/mobile/users/stripepayment', mobile_payment.stripepayment)
        app.post('/mobile/users/stripechargewebhook', mobile_payment.stripe_chargewebhook)//webhook for stripe charge success
        app.post("/mobile/users/striprefundwebhook", mobile_payment.striperefundwebhook) //webhook for the stripe charge refund
        app.post('/mobile/users/status_check', mobile_payment.checkPayment);
        app.get('/mobile/cashfree/request', mobile_payment.cashrequest);
        app.post('/mobile/cashfree/response', mobile_payment.cashresponse);

        /* API List for driver*/
        app.post('/mobile/driver/OtpSubmitVerify', mobile_driver.OtpSubmitVerify);
        app.post('/mobile/driver/getcity', mobile_driver.getCity);
        app.post('/mobile/driver/signup', middlewares.commonUpload('uploads/images/users/').any(), mobile_driver.SignUp);
        app.post('/mobile/driver/login', mobile_driver.Login);
        app.post('/mobile/driver/otp', mobile_driver.otpGenerate);
        app.post('/mobile/driver/forgotPassword', mobile_driver.forgotPassword);
        app.post('/mobile/driver/changePassword', mobile_driver.changePassword);
        app.post('/mobile/driver/profile', mobile_driver.profile);
        app.post('/mobile/driver/driverDocs', mobile_driver.driverDocs);
        app.post('/mobile/driver/deliveries', mobile_driver.deliveries);
        app.post('/mobile/driver/resetPassword', mobile_driver.resetPassword);
        app.post('/mobile/driver/editProfile', mobile_driver.editProfile);
        app.post('/mobile/driver/profilePic', middlewares.commonUpload('./uploads/images/users/').fields([{ name: 'avatar', maxCount: 1 }]), mobile_driver.profilePic);
        app.post('/mobile/driver/earnings', mobile_driver.getEarnings);
        app.post('/mobile/driver/newOrder', mobile_driver.newOrder);
        app.post('/mobile/driver/driverAccepts', mobile_driver.driverAccepts);
        app.post('/mobile/driver/Assigndriverorder', mobile_driver.Assigndriverorder);
        app.post('/mobile/driver/driverPicked', mobile_driver.driverPicked);
        app.post('/mobile/driver/orderDelivered', mobile_driver.orderDelivered);
        app.post('/mobile/driver/rejectOrder', mobile_driver.rejectOrder);
        app.post('/mobile/driver/confirmOrder', mobile_driver.confirmOrder);
        app.post('/mobile/driver/confirmOrderupdate', mobile_driver.confirmOrderupdate);
        app.post('/mobile/driver/logout', mobile_driver.logout);
        app.post('/mobile/driver/food_list', mobile_driver.food_list);
        app.post('/mobile/driver/billings', mobile_driver.billings);
        app.post('/mobile/driver/accounts', mobile_driver.accounts);
        app.post('/mobile/driver/editAccount', mobile_driver.editAccount);
        app.post('/mobile/driver/docsUpload', middlewares.commonUpload('./uploads/images/others/').any(), mobile_driver.docsUpload);
        app.post('/mobile/driver/driverStat', mobile_driver.driverStat);
        app.post('/mobile/driver/currentJob', mobile_driver.currentJob);
        app.post('/mobile/driver/continueJob', mobile_driver.continueJob);
        //app.post('/mobile/driver/docsUpload', middlewares.commonUpload('./uploads/images/others/').any(), mobile_driver.docsUpload);
        app.post('/mobile/driver/docValidate', mobile_driver.docValidate);
        app.post('/mobile/driver/getByCycle', mobile_driver.getByCycle);
        app.get('/mobile/driver/getCycles', mobile_driver.getCycles);
        app.post('/mobile/driver/billingDay', mobile_driver.billingForADay);
        app.post('/mobile/driver/billingHistory', mobile_driver.billingCycle);
        app.post('/mobile/driver/current/jobstatus', mobile_driver.jobStatus);
        app.post('/mobile/driver/driverCurrentLocation', mobile_driver.driverCurrentLocation);
        //social signup    
        app.post('/mobile/driver/social/login', mobile_driver.socialLogin);
        app.post('/mobile/driver/social/signup', mobile_driver.socialSignUp);
        app.post('/mobile/driver/social/check', mobile_driver.socialCheck);
        app.post('/mobile/driver/social/signup/otp', mobile_user.socialSignUpOtp);
        app.post('/mobile/driver/forgot/otp', mobile_user.forgotOtp);
        app.post('/mobile/driver/getSettings', mobile_driver.getSettings);
        app.post('/mobile/driver/OfflineEarnings', mobile_driver.OfflineEarnings);

        app.post('/mobile/driver/orderlist', mobile_driver.orderlist);

        /* API List for restaurant*/
        app.post('/mobile/restaurant/login', mobile_restaurant.login);
        app.post('/mobile/restaurant/availability', mobile_restaurant.avilabilityEdit);
        app.post('/mobile/restaurant/get_dashdata', mobile_restaurant.dashData);
        app.post('/mobile/restaurant/new-orders', mobile_restaurant.newOrders);
        app.post('/mobile/restaurant/expand-orders', mobile_restaurant.expandOrders);
        app.post('/mobile/restaurant/accept-orders', mobile_restaurant.acceptOrders);
        app.post('/mobile/restaurant/reject-orders', mobile_restaurant.rejectOrders);
        app.post('/mobile/restaurant/logout', mobile_restaurant.logOut);
        app.post('/mobile/restaurant/changePassword', mobile_restaurant.changePassword);
        app.post('/mobile/restaurant/get_business/info', mobile_restaurant.businesInfo);
        app.post('/mobile/restaurant/update_business/info', mobile_restaurant.updateBusinesInfo);
        app.post('/mobile/restaurant/get/menu', mobile_restaurant.getMenu);
        app.post('/mobile/restaurant/get/menucount', mobile_restaurant.getMenuCount);
        app.post('/mobile/restaurant/getbasepack', mobile_restaurant.getbasepack);
        app.post('/mobile/restaurant/addons/visibility', mobile_restaurant.addonsVisibility);
        app.post('/mobile/restaurant/basepack/visibility', mobile_restaurant.basepackVisibility);
        app.post('/mobile/restaurant/food/visibility', mobile_restaurant.foodVisibility);
        app.post('/mobile/restaurant/get/category', mobile_restaurant.getCategory);
        app.post('/mobile/restaurant/forgotpass/mailcheck', mobile_restaurant.RestmailCheck);
        app.post('/mobile/restaurant/forgotpass/forgotPassword', mobile_restaurant.RestforgotPassword);
        app.post('/mobile/restaurant/get/billings', mobile_restaurant.getBillings);
        app.post('/mobile/restaurant/getcancelreason', mobile_restaurant.getcancelReason);
        app.post('/mobile/restaurant/track_order', mobile_restaurant.trackOrder);

        /* --- To delete data from collection ---- */
        app.post('/custum/collection', custum_delete.removecollection);
        app.post('/custum/fooddata', custum_delete.foodproduct);

        /* ------ To get details about product ---- */
        // app.post('/mobile/product_details', mobile_product.productdetails);


        app.post('/mobile/get_products', mobile_product.getProducts)
        app.post('/mobile/get-all-mproducts', mobile_product.getproductlist);
        app.post('/mobile/get_filter_products', mobile_product.mobile_filterproducts)
        app.post('/mobile/get_settings', mobile_settings.getSettings);
        app.get('/mobile/user/walkthrough_images', mobile_settings.walkthroughImages);
        app.get('/mobile/get_pages', mobile_settings.getPages);

        app.post('/mobile/get_slider_images', mobile_user.getSliderImages);
        app.post('/mobile/get_offer_images', ensureAuthorized, mobile_user.getOfferImages);
        app.post('/mobile/get_faqs', ensureAuthorized, mobile_user.getFaqs);
        app.post('/mobile/validate_promocode', ensureAuthorized, mobile_user.validatePromocode);
        app.post('/mobile/get_promo_code', ensureAuthorized, mobile_user.getPromoCode);
        app.post('/mobile/add_product_faqs', ensureAuthorized, mobile_user.addProductFaqs);
        app.post('/mobile/validate_reffer_code', ensureAuthorized, mobile_user.validateRefferCode);
        app.post('/mobile/get-feature-products',  mobile_user.featureproducts);

        app.post('/mobile/orders/place_order', ensureAuthorized, mobile_orders.placeOrders)
        app.post('/mobile/orders/get_orders', mobile_orders.getOrders);
        app.post('/mobile/orders/delete_order', mobile_orders.deleteOrder);

        app.post('/mobile/orders/orderList', mobile_orders.ordersList)

        // rating  and  FAQ's
        app.post('/mobile/rating/ratingProductList', mobile_rating.ratingProductList);
        app.post('/mobile/rating/getreview_details', mobile_rating.getReviewDetail);
        // app.post('/mobile/rating/reviewProduct',middlewares.commonUpload('uploads/images/users/').any(), mobile_rating.reviewProduct);
        app.post('/mobile/rating/reviewProduct',middlewares.commonUpload('./uploads/images/others/').any(), mobile_rating.reviewProduct);

        app.post('/mobile/rating/specific_rating_count', mobile_rating.specific_rating_count);
        // app.post('/mobile/rating/delete_product_rating', ensureAuthorized, mobile_rating.deleteProductRating);
        // app.post('/mobile/rating/get_prodcut_rating', ensureAuthorized, mobile_rating.getProductRating);


        // app.post('/mobile/add_product_faqs', ensureAuthorized, mobile_rating.add_product_faqs)

        // address 
        app.post('/mobile/address/add_address', ensureAuthorized, mobile_address.addAddress);
        app.post('/mobile/address/update_address', ensureAuthorized, mobile_address.updateAddress);
        app.post('/mobile/address/delete_address', ensureAuthorized, mobile_address.deleteAddress);
        app.get('/mobile/address/get_address', ensureAuthorized, mobile_address.getAddress);
        app.get('/mobile/address/get_cities', ensureAuthorized, mobile_address.getCities);
        app.get('/mobile/address/get_area_by_sity_id', ensureAuthorized, mobile_address.getAreaByCityId);
        app.get('/mobile/address/get_zipcodes', ensureAuthorized, mobile_address.getZipCode);
        app.post('/mobile/address/is_product_deliverable', ensureAuthorized, mobile_address.isProductDeliverable);
        app.post('/mobile/address/check_cart_products_deliverable', ensureAuthorized, mobile_address.checkCartProductDeliverable);

        // cart 
        app.post('/mobile/cart/get_cart', mobile_cart.getCart)
        app.post('/mobile/cart/add_cart', mobile_cart.addCart);
        app.patch('/mobile/cart/update_cart', mobile_cart.updateCart);
        app.delete('/mobile/cart/delete_cart', ensureAuthorized, mobile_cart.deleteCart);

        //section
        app.post('/mobile/section/get_section', mobile_section.getSection);
        app.get('/mobile/section/get_notification', ensureAuthorized, mobile_section.getNotifications);

        //favourites
        app.get('/mobile/favourites/get_favourites', mobile_favourites.getFavourites);
        app.post('/mobile/favourites/add_favourites', ensureAuthorized, mobile_favourites.addFavourites);
        app.patch('/mobile/favourites/update_favourites', ensureAuthorized, mobile_favourites.updateFavourites);
        app.delete('/mobile/favourites/delete_favourites', ensureAuthorized, mobile_favourites.removeFavourites);

        //transaction
        app.get('/mobile/transactions/get_paypal_links', ensureAuthorized, mobile_transactions.getPaypalLink);
        app.post('/mobile/transactions/get_transaction', ensureAuthorized, mobile_transactions.getTransactions);
        app.post('/mobile/transactions/add_transaction', ensureAuthorized, mobile_transactions.addTransaction);
        app.post('/mobile/transactions/generate_paytm_checksum', ensureAuthorized, mobile_transactions.generatePaytmChecksum);
        app.post('/mobile/transactions/generate_paytm_txn_token', ensureAuthorized, mobile_transactions.generatePaytmTxnToken);
        app.post('/mobile/transactions/validate_paytm_checksum', ensureAuthorized, mobile_transactions.validatePaytmChecksum);
        app.post('/mobile/transactions/flutterwave_webview', ensureAuthorized, mobile_transactions.flutterwaveWebview);
        app.post('/mobile/transactions/flutterwave_payment_response', ensureAuthorized, mobile_transactions.flutterwavePaymentResponse);
        app.post('/mobile/transactions/create_midtrans_transaction', ensureAuthorized, mobile_transactions.createMidtransTransaction);
        app.post('/mobile/transactions/get_midtrans_transaction_status', ensureAuthorized, mobile_transactions.getMidtransTransaction);
        app.post('/mobile/transactions/instamojo_webview', ensureAuthorized, mobile_transactions.instamojoWebview);

        //tickets
        app.get('/mobile/tickets/get_ticket_types', ensureAuthorized, mobile_ticket.getTicketTypes);
        app.post('/mobile/tickets/add_ticket', ensureAuthorized, mobile_ticket.addTicket);
        app.post('/mobile/tickets/edit_ticket', ensureAuthorized, mobile_ticket.editTicket);
        app.post('/mobile/tickets/send_message', ensureAuthorized, mobile_ticket.sendMessage);
        app.get('/mobile/tickets/get_tickets', ensureAuthorized, mobile_ticket.getTickets);
        app.get('/mobile/tickets/get_messages', ensureAuthorized, mobile_ticket.getMessages);

        app.post('/mobile/send_bank_transfer_proof', ensureAuthorized, mobile_user.sendBankTransferProof)

        app.post('/mobile/get-category-list', mobile_user.getAllCategory);


        app.get('/mobile/user/get_flash_sale', ensureAuthorized, mobile_user.getFlashSale);
        app.post('/mobile/user/update_fcm', ensureAuthorized, mobile_user.updateFcm);












    } catch (e) {
        console.log('Error in mobile router ----->', e);
    }
};
