var path = require('path');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync(path.join(__dirname, "/config.json"), 'utf8'));

var CONFIG = {};
CONFIG.ENV = (process.env.NODE_ENV || 'development');
CONFIG.PORT = (process.env.VCAP_APP_PORT || config.port);
CONFIG.DB_URL = 'mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.database;
CONFIG.MOBILE_API = true; // true & false
CONFIG.SHIPROCKET_EMAIL =  "exports@rrpillais.in"
CONFIG.SHIPROCKET_PWD =  "Cst.@2024",
CONFIG.SHIPROCKET_API_EMAIL =  "fancyteam@teamtweaks.com"
CONFIG.SHIPROCKET_API_PWD =  "Fancy@#123",

CONFIG.DIRECTORY_USERS = './uploads/images/users/';
CONFIG.DIRECTORY_CATEGORIES = './uploads/images/category/';
CONFIG.DIRECTORY_SLIDERS = './uploads/images/sliders/';
CONFIG.DIRECTORY_OTHERS = './uploads/images/others/';
// CONFIG.BANNER_IMAGE = '/uploads/images/banner_type_images/';
CONFIG.DIRECTORY_FOOD = './uploads/images/food/';

CONFIG.USER_PROFILE_IMAGE_DEFAULT = 'uploads/default/user.jpg';
CONFIG.USER_PROFILE_IMAGE = 'uploads/images/users/';
CONFIG.CATEGORY_DEFAULT_IMAGE = 'uploads/default/category.jpg';
CONFIG.MARKER_DEFAULT_IMAGE = 'uploads/images/category/default.png';
CONFIG.CITY_DEFAULT_IMAGE = 'uploads/default/category.jpg';
CONFIG.RESTAURANT_DEFAULT_IMAGE = 'uploads/noimage/menu.jpg';//'uploads/default/category.jpg';
CONFIG.SITE_RESTAURANT_BANNER_IMAGE = 'uploads/default/res_dash_banner.png';
CONFIG.CUSINE_DEFAULT_IMAGE = 'uploads/noimage/dish.png';

CONFIG.SECRET_KEY = '26c24b4b956fd695fbd5fd85a883a7a0abe36043';
CONFIG.GOOGLE_MAP_API_KEY = 'AIzaSyAbggKSmOuBrUgyy-c3Lh588W61ikHPCaQ';

// Notifications
CONFIG.NOTIFICATION = {};
CONFIG.NOTIFICATION.ORDER_RECEIVED = 'Request for an order';
CONFIG.NOTIFICATION.RESTAURANT_ACCEPTED = 'Your order is accepted';
CONFIG.NOTIFICATION.RESTAURANT_REJECTED = 'Your order is declined,sorry for inconvenience';
CONFIG.NOTIFICATION.RESTAURANT_FAILED = 'is failed to accept your order';
CONFIG.NOTIFICATION.DRIVER_REJECTED = 'Your request is declined by driver,sorry for inconvenience';
CONFIG.NOTIFICATION.DRIVER_ACCEPTED = 'Driver accepted your request';
CONFIG.NOTIFICATION.DRIVER_PICKEDUP = 'Order picked up';
CONFIG.NOTIFICATION.DRIVER_ARRIVED = 'Driver arrived on your location';
CONFIG.NOTIFICATION.FOOD_DELIVERED = 'Your order has been delivered';
CONFIG.NOTIFICATION.PAYMENT_COMPLETED = 'Payment Completed';
CONFIG.NOTIFICATION.REQUEST_FOR_DRIVER = 'You got a request for a new order';
CONFIG.NOTIFICATION.DRIVER_ACCEPTED_FOR_USER = 'Driver assigned to your order';
CONFIG.NOTIFICATION.ADMIN_CANCELLED_ORDER = 'Admin cancelled this order';
CONFIG.NOTIFICATION.FORCE_LOGOUT = 'You are logging into an another device';
CONFIG.NOTIFICATION.ADMIN_ASSIGN_ORDER = 'Admin assigned a order for you';

CONFIG.SOCIAL_NETWORKS = {
    'facebookAuth': {
        'clientID': '1589589941346013',
        'clientSecret': 'ed67fd31ae628fde866bae1b6f71604e',
        'callbackURL': 'http://maidac.casperon.co/auth/facebook/callback'

    },
};
//Export Module
module.exports = CONFIG;