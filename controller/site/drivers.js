var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var middlewares = require('../../model/middlewares.js');
var async = require('async');
var mongoose = require('mongoose');
var mailcontent = require('../../model/mailcontent.js');
var twilio = require('../../model/twilio.js');
var library = require('../../model/library.js');
function isObjectId(n) {
    return mongoose.Types.ObjectId.isValid(n);
}
Jimp = require("jimp");

module.exports = function (io) {
    var router = {};

    router.driverloginVerifyPhonePass = function (req, res) {
        req.checkBody('phone_number', 'phone number is required').notEmpty();
        req.checkBody('country_code', 'country code is required').notEmpty();

        var errors = [];
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "message": errors[0].msg
            });
            return;
        }
        db.GetOneDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, driverData) {
            if (err) {
                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
            } else {
                if (driverData && typeof driverData._id != 'undefined') {
                    if (driverData.status == 1) {
                        if (typeof driverData.password != 'undefined') {
                            res.send({ "status": 1, "message": 'Driver exists' });
                        } else {
                            res.send({ "status": 0, "message": 'Sorry, your account has registered without password, use forgot password to set a new password' });
                        }
                    } else {
                        if (driverData.status == 0) {
                            res.send({ "status": 0, "message": 'Your account is currently unavailable' });
                        } else {
                            res.send({ "status": 0, "message": 'Your account is inactive... Please contact administrator for further details' });
                        }
                    }
                } else {
                    res.send({ "status": 0, "message": 'Sorry, your mobile number is not registered with us.' });
                }
            }
        })
    };
    router.driverloginVerifyPhoneOtp = function (req, res) {
        req.checkBody('phone_number', 'phone number is required').notEmpty();
        req.checkBody('country_code', 'country code is required').notEmpty();

        var errors = [];
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "message": errors[0].msg
            });
            return;
        }
        var otp = Math.floor(1000 + Math.random() * 9000);
        db.GetOneDocument('drivers', { "phone.number": req.body.phone_number, "phone.code": req.body.country_code }, {}, {}, function (err, driverData) {
            if (err) {
                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
            } else {
                if (driverData && typeof driverData._id != 'undefined') {
                    if (driverData.status == 1) {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, generalSettings) {
                            if (err) {
                                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                            } else {
                                var verify_otp = bcrypt.hashSync(otp, bcrypt.genSaltSync(8), null);
                                db.UpdateDocument('drivers', { _id: driverData._id }, { 'verify_otp': otp }, {}, function (err, response) {
                                    if (err || response.nModified == 0) {
                                        res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                                    } else {
                                        db.GetOneDocument('settings', { 'alias': 'sms' }, {}, {}, function (err, smsSettings) {
                                            if (err) {
                                                res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                                            } else {
                                                var data = {};
                                                data.mode = 0;
                                                data.otp = otp;
                                                var to = req.body.country_code + req.body.phone_number;
                                                var message = otp + ' is your Hucksmart login OTP. OTP is confidential. For security reasons. DO NOT share this Otp with anyone.';
                                                if (smsSettings.settings.twilio.mode == "production") {
                                                    data.mode = 1;
                                                    twilio.createMessage(to, '', message, function (err, response) { });
                                                }
                                                res.send({
                                                    "status": 1,
                                                    "message": "We've sent an OTP to the mobile number " + req.body.country_code + req.body.phone_number + ". Please enter it below to complete verification.",
                                                    "data": data
                                                });
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    } else {
                        if (driverData.status == 0) {
                            res.send({ "status": 0, "message": 'Your account is currently unavailable' });
                        } else {
                            res.send({ "status": 0, "message": 'Your account is inactive... Please contact administrator for further details' });
                        }
                    }
                } else {
                    res.send({ "status": 0, "message": 'Sorry, your mobile number is not registered with us.' });
                }
            }
        })
    };
    router.getCities = function (req, res) {
        var data = {};
        var cities = [];
        db.GetDocument('city', { 'status': { $eq: 1 } }, { "cityname": 1, 'driver_fare': 1 }, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send({
                    "status": "0",
                    "errors": "No cities found"
                });
            } else {
                db.GetDocument('vehicles', { 'status': { $eq: 1 } }, { "vehicle_name": 1 }, {}, function (err, vehidata) {
                    if (err || !docdata) {
                        res.send({
                            "status": "0",
                            "errors": "No cities found"
                        });
                    } else {

                        for (i in docdata) {
                            if (docdata[i].driver_fare) {
                                cities.push(docdata[i])
                            }
                        }
                        data.status = '1';
                        data.response = {};
                        data.response.cityList = cities;
                        data.response.vehicleList = vehidata;

                        res.send(data);

                    }
                });
            }
        });
    }

    router.getProfileData = function (req, res) {
        var errors = [];
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        var request = {};
        request.driver_id = req.body.driver_id;
        var driver = [];
        db.GetDocument('drivers', { _id: new mongoose.Types.ObjectId(request.driver_id) }, { username: 1, status: 1, last_name: 1, email: 1, main_city: 1, category: 1, avatar: 1, img_name: 1, img_path: 1, driver_documents: 1, address: 1, phone: 1, account_details: 1 }, {}, function (err, docs) {
            if (docs && docs.length > 0 && typeof docs[0]._id != 'undefined') {
                driver = docs;
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                    if (driver.length <= 0 || typeof driver[0].avatar == 'undefined') {
                        driver[0].avatar = settings.settings.site_url + 'uploads/default/user.jpg';
                    } else {
                        driver[0].avatar = settings.settings.site_url + driver[0].avatar;
                    }
                    if (err || !driver[0] || driver[0].length == 0) {
                        res.send({
                            "status": 0,
                            "errors": 'Profile cannot be found'
                        });
                    } else {
                        data.status = '1';
                        data.response = {};
                        data.response.driverDetails = '';
                        data.response.driverDetails = driver;
                        var async = require('async')
                        async.series([function (cb) {
                            db.GetDocument('city', { 'status': { $eq: 1 } }, { "cityname": 1 }, {}, function (err, docdata) {
                                if (err || !docdata) {
                                    data.response.cities = '';
                                    cb(null);
                                } else {

                                    data.response.cities = docdata;
                                    cb(null);
                                }
                            })
                        },
                        function (cb) {
                            db.GetDocument('vehicles', { 'status': { $eq: 1 } }, { "vehicle_name": 1 }, {}, function (err, vehidata) {
                                if (err || !vehidata) {
                                    data.response.vehicle_list = '';
                                    cb(null)
                                }
                                else {
                                    data.response.vehicle_list = vehidata;
                                    cb(null);
                                }
                            })
                        }, function (cb) {
                            db.GetDocument('documents', { doc_for: 'driver', 'status': 1 }, {}, {}, function (err, documents) {
                                if (err || !documents) {
                                    data.response.documentLists = [];
                                    cb(null)
                                } else {
                                    /* for (i in documents) {
                                        for (j in data.response.driverDetails[0].driver_documents) {
                                            if (documents[i].doc_name == data.response.driverDetails[0].driver_documents[j].doc_name) {
                                                documents[i].driver_doc_name = data.response.driverDetails[0].driver_documents[j].doc_name
                                            }
                                        }

                                    }
                                    var document_list = [];
                                    for (i in documents) {
                                        if (typeof documents[i].driver_doc_name == 'undefined') {
                                            var temp = {};
                                            temp.driver_doc_name = 'no_image';
                                            temp.status = documents[i].status;
                                            temp.has_require = documents[i].has_require;
                                            temp.has_expire = documents[i].has_expire;
                                            temp.expiry_dates = documents[i].expiry_dates;
                                            temp.doc_name = documents[i].doc_name;
                                            temp.doc_for = documents[i].doc_for;
                                            temp.createdAt = documents[i].createdAt;
                                            temp.updatedAt = documents[i].updatedAt;
                                            temp._id = documents[i]._id;
                                            temp.expiry_date = '';
                                            temp.image = '';
                                            if (driver.length > 0) {
                                                if (driver[0].driver_documents != null) {
                                                    for (j in driver[0].driver_documents) {
                                                        if (driver[0].driver_documents[j].doc_name == documents[i].driver_doc_name) {
                                                            temp.expiry_date = driver[0].driver_documents[j].expiry_date;
                                                            temp.image = driver[0].driver_documents[j].image;
                                                        }
                                                    }
                                                }

                                            }
                                            document_list.push(temp);
                                        } else {
                                            var temp = {};
                                            temp.driver_doc_name = documents[i].driver_doc_name;
                                            temp.status = documents[i].status;
                                            temp.has_require = documents[i].has_require;
                                            temp.has_expire = documents[i].has_expire;
                                            temp.expiry_dates = documents[i].expiry_dates;
                                            temp.doc_name = documents[i].doc_name;
                                            temp.doc_for = documents[i].doc_for;
                                            temp.createdAt = documents[i].createdAt;
                                            temp.updatedAt = documents[i].updatedAt;
                                            temp._id = documents[i]._id;
                                            temp.expiry_date = '';
                                            temp.image = '';
                                            if (driver.length > 0) {
                                                if (driver[0].driver_documents.length > 0) {
                                                    for (j in driver[0].driver_documents) {
                                                        if (driver[0].driver_documents[j].doc_name == documents[i].driver_doc_name) {
                                                            temp.expiry_date = driver[0].driver_documents[j].expiry_date;
                                                            temp.image = '';
                                                            if (typeof driver[0].driver_documents[j].image != 'undefined' && driver[0].driver_documents[j].image != null && driver[0].driver_documents[j].image != '') {
                                                                driver[0].driver_documents[j].image = driver[0].driver_documents[j].image.toString().replace('./', '');
                                                                driver[0].driver_documents[j].image = driver[0].driver_documents[j].image;
                                                                temp.image = driver[0].driver_documents[j].image;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            document_list.push(temp)
                                        }
                                    } */
                                    var driver_array = data.response.driverDetails[0].driver_documents;
                                    var doc_array = documents;
                                    var arr = driver_array.concat(doc_array);

                                    var results = [];
                                    documents.forEach(elem => {
                                        var index_pos = driver_array.map(function (e) { return e.doc_name }).indexOf(elem.doc_name)
                                        if (index_pos != -1) {
                                            driver_array[index_pos].has_require = elem.has_require;
                                            driver_array[index_pos].has_expire = elem.has_expire;
                                            results.push(driver_array[index_pos])
                                        } else {
                                            // console.log(elem)
                                            results.push(elem)
                                        }
                                    })
                                    /* if (document_list.length > 0) {
                                        document_list = document_list.filter(function (e) { return e.status == 1 });
                                    } */
                                    data.response.documentLists = results;
                                    cb(null);
                                }
                            });
                        }], function () {
                            res.send(data);
                        })
                    }
                })
            } else {
                res.send({});
            }
        })
    }
    router.editProfile = function (req, res) {

        var data = {};
        data.status = '0';
        var message = '';

        req.checkBody('data.username', 'first name is required').notEmpty();
        // req.checkBody('data.last_name', 'last name is required').notEmpty();
        req.checkBody('driver_id', 'driver_id is required').notEmpty();
        req.checkBody('data.email', 'email is required').isEmail();
        req.checkBody('data.selected_city', 'city  is required').notEmpty();
        req.checkBody('data.selected_vehicle', 'vehicle_type  is required').notEmpty();

        var errors = req.validationErrors();
        if (errors) {
            res.send(errors);
            return;
        }

        req.sanitizeBody('data.username').trim();
        // req.sanitizeBody('data.last_name').trim();
        req.sanitizeBody('driver_id').trim();
        req.sanitizeBody('data.email').trim();
        req.sanitizeBody('data.selected_city.cityname').trim();
        req.sanitizeBody('data.selected_vehicle.vehicle_name').trim();

        var request = {};
        data.email = req.body.data.email;
        data.avatarBase64 = req.body.data.newImage;
        data.driver_documents = req.body.data.driver_documents;
        data.driverDocs = req.body.data.driverDocs;
        if (req.body.data.newImage != null && req.body.data.newImage != '') {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = './uploads/images/users/' + fileName;
            data.img_name = fileName;
            data.img_path = './uploads/images/users/';
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.avatar = file;
            /*data.avatar = attachment.get_attachment(CONFIG.DIRECTORY_FOOD, fileName);
            data.img_name = encodeURI(fileName);
            data.img_path = CONFIG.DIRECTORY_FOOD.substring(2);*/
        }
        data.username = req.body.data.username || "";
        // data.last_name = req.body.data.last_name || "";
        data.driver_id = req.body.driver_id;
        data.city = req.body.data.selected_city.cityname;
        data.vehicle_type = req.body.data.selected_vehicle.vehicle_name;
        data.line1 = req.body.data.address.line1;
        data.line2 = req.body.data.address.line2;
        data.state = req.body.data.address.state;
        data.country = req.body.data.address.country;
        data.zipcode = req.body.data.address.zipcode;
        data.lng = req.body.data.address.lng;
        data.lat = req.body.data.address.lat;
        data.account_name = req.body.data.account_details.account_name;
        data.account_address = req.body.data.account_details.account_address;
        data.account_number = req.body.data.account_details.account_number;
        data.bank_name = req.body.data.account_details.bank_name;
        data.branch_address = req.body.data.account_details.branch_address;
        data.branch_name = req.body.data.account_details.branch_name;
        data.routing_number = req.body.data.account_details.routing_number;
        data.swift_code = req.body.data.account_details.swift_code;

        var newdata = {
            account_details: {}
        };
        newdata.username = data.username;
        // newdata.last_name = data.last_name;
        newdata.main_city = data.city;
        newdata.category = data.vehicle_type;
        newdata.driver_documents = [];
        newdata.driver_documents = req.body.docs
        newdata.address = {};
        newdata.location = {};
        newdata.location.lng = data.lng;
        newdata.location.lat = data.lat;
        newdata.address.line1 = data.line1;
        newdata.address.line2 = data.line2;
        newdata.address.state = data.state;
        newdata.address.country = data.country;
        newdata.address.zipcode = data.zipcode;
        newdata.address.lng = data.lng;
        newdata.address.lat = data.lat;
        newdata.address.fulladres = data.line1 + ' , ' + data.line2 + ' , ' + data.city + ' , ' + data.state + '  ' + data.zipcode + ' , ' + data.country;
        newdata.address.city = data.city;
        newdata.account_details.account_name = data.account_name;
        newdata.account_details.account_address = data.account_address;
        newdata.account_details.account_number = data.account_number;
        newdata.account_details.bank_name = data.bank_name;
        newdata.account_details.branch_address = data.branch_address;
        newdata.account_details.branch_name = data.branch_name;
        newdata.account_details.routing_number = data.routing_number;
        newdata.account_details.swift_code = data.swift_code;
        newdata.email = data.email;
        if (data.avatarBase64 != null && data.avatarBase64 != '') {
            newdata.avatar = data.avatar;
            newdata.img_name = data.img_name;
            newdata.img_path = data.img_path;
        }

        db.GetDocument('drivers', { email: newdata.email }, {}, {}, function (err, docs) {
            if (docs) {
                if (docs.length == 0) {
                    db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(data.driver_id) }, newdata, function (err, response) {
                        if (err) {
                            res.send({ 'status': 0, 'msg': 'some error occured' });
                        } else {
                            res.send({ 'status': 1, 'msg': 'successfully edited' });
                        }
                    })
                } else {
                    if (docs[0]._id.toString() == data.driver_id) {
                        db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(data.driver_id) }, newdata, function (err, response) {
                            res.send({ 'status': 1, 'msg': 'successfully edited', 'data': newdata })
                        })
                    } else {
                        res.send({ 'status': 0, 'msg': 'email already exists' });
                    }

                }
            } else {
                res.send(err)
            }
        });
    }

    router.getDeliveries = function (req, res) {
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};

        var request = {};

        request.driver_id = req.body.driver_id;
        var aggregation_data = [
            { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id) } },
            { $sort: { "createdAt": -1 } },
            { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
            { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    'RestaurantDetails': {
                        _id: '$RestaurantDetails._id',
                        restaurant_name: '$RestaurantDetails.restaurantname',
                        address: '$RestaurantDetails.address'
                    }, 'orderDetails': {
                        _id: '$_id',
                        createdAt: '$createdAt',
                        status: '$status',
                        order_id: '$order_id',
                        delivery_address: '$delivery_address',
                        foods: '$foods',
                        billings: '$billings'

                    }
                }
            }, { $project: { "orderDetails": 1, "RestaurantDetails": 1 } }
        ];

        db.GetAggregation('orders', aggregation_data, function (err, docdata) {
            if (err) {

                res.send(err)
            }
            else {


                var data = {};
                if (docdata.length > 0) {

                    data.Details = [];
                    for (i in docdata) {
                        var temp = {};
                        temp.restaurant_address = '';
                        if (typeof docdata[i].RestaurantDetails.address != 'undefined' && typeof docdata[i].RestaurantDetails.address.fulladres != 'undefined') {
                            temp.restaurant_address = docdata[i].RestaurantDetails.address.fulladres;
                        }

                        temp.restaurant_name = docdata[i].RestaurantDetails.restaurant_name;
                        temp.delivery_address = docdata[i].orderDetails.delivery_address.fulladres;
                        temp.order_id = docdata[i].orderDetails.order_id;
                        temp.order_placed_on = new Date(docdata[i].orderDetails.createdAt);
                        temp.food_list = docdata[i].orderDetails.foods;
                        if (typeof docdata[i].orderDetails.billings != 'undefined') {
                            temp.total = docdata[i].orderDetails.billings.amount.total;
                            temp.total = temp.total.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                        }
                        else {
                            temp.total = 0;
                            temp.total = temp.total.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                        }


                        data.Details.push(temp);
                    }

                }
                else {
                    data.Details = [];
                }
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (setterr, settings) => {
                    if (!setterr && settings) {
                        data.currency_symbol = (typeof (settings.settings) == 'undefined') || (typeof (settings.settings.currency_symbol) == 'undefined') ? '$' : settings.settings.currency_symbol;
                        data.distFormat = (typeof (settings.settings) == 'undefined') || (typeof (settings.settings.delivery_charge.format) == 'undefined') ? 'km' : settings.settings.delivery_charge.format;

                        res.send(data);
                    }
                    else {
                        data.currency_symbol = '$';
                        data.distFormat = 'km';

                        res.send(data);
                    }
                })
            }
        })
    }
    router.updateProfilepic = function (req, res) {
        var updatadata = {};
        if (req.file) {

            updatadata.avatar = attachment.get_attachment(req.file.destination, req.file.filename);
            updatadata.img_name = encodeURI(req.file.filename);
            updatadata.img_path = req.file.destination.substring(2);
            Jimp.read(req.file.path).then(function (lenna) {
                lenna.resize(100, 100)            // resize
                    .quality(60)                 // set JPEG quality
                    .write('./uploads/images/users/thumb/' + req.file.filename); // save
            }).catch(function (err) {

            });

        }
        db.UpdateDocument('drivers', { _id: req.body.user }, updatadata, {}, function (err, docdata) {
            if (err) {

                res.send(err);
            } else {

                res.send(updatadata.avatar);
            }
        });
    }

    router.getEarnings = function (req, res) {
        var moment = require('moment')
        var errors = [];
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};

        var request = {};
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
            request.driver_id = req.body.driver_id;
            var aggregation_data = [
                { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id) } }
                , { $sort: { "createdAt": -1 } },
                { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
                { $unwind: { path: "$UserDetails", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        'RestaurantDetails': {
                            _id: '$RestaurantDetails._id',
                            restaurant_name: '$RestaurantDetails.restaurantname',
                            address: '$RestaurantDetails.address',
                            location: '$RestaurantDetails.location'
                        }, 'orderDetails': {
                            _id: '$_id',
                            createdAt: '$createdAt',
                            status: '$status',
                            order_id: '$order_id',
                            delivery_address: '$delivery_address',
                            foods: '$foods',
                            billings: '$billings',
                            mileages_travelled: '$mileages_travelled'

                        }, 'UserDetails': {
                            _id: '$UserDetails._id',
                            address: '$UserDetails.address',
                            location: '$UserDetails.location',
                            username: '$UserDetails.username'
                        }


                    }
                }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
            ];

            db.GetAggregation('orders', aggregation_data, function (err, docdata) {
                if (err) {

                    res.send(err)
                }
                else {


                    var data = {};
                    async.series([function (cb) {
                        if (docdata.length > 0) {

                            data.Details = {};
                            data.Details.EarningDetails = [];
                            data.Details.TotalDetails = [];
                            var deliveryCount = 0;
                            var totalEarn = 0;


                            for (i in docdata) {
                                var temp = {};
                                temp.restaurant_address = '';
                                if (typeof docdata[i].RestaurantDetails.address != 'undefined' && typeof docdata[i].RestaurantDetails.address.fulladres != 'undefined') {
                                    temp.restaurant_address = docdata[i].RestaurantDetails.address.fulladres;
                                }
                                temp.restaurant_name = docdata[i].RestaurantDetails.restaurant_name;
                                temp.delivery_address = docdata[i].orderDetails.delivery_address.fulladres;
                                temp.order_id = docdata[i].orderDetails.order_id;
                                temp.order_placed_on = moment(new Date(docdata[i].orderDetails.createdAt)).format(settings.settings.date_format);
                                temp.food_list = docdata[i].orderDetails.foods;
                                temp.mileage = parseInt(docdata[i].orderDetails.mileages_travelled);

                                if (typeof docdata[i].orderDetails.billings != 'undefined') {

                                    temp.total = docdata[i].orderDetails.billings.amount.total;
                                    temp.total = temp.total.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                    // docdata[i].orderDetails.billings.amount.driver_commission = ( parseFloat(docdata[i].orderDetails.billings.amount.driver_commission) - parseFloat(docdata[i].orderDetails.billings.amount.bir_tax_amount) ).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                    docdata[i].orderDetails.billings.amount.driver_commission = (parseFloat(docdata[i].orderDetails.billings.amount.driver_commission)).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                    //var n = 120000
                                    //docdata[i].orderDetails.billings.amount.driver_commission = n.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                    temp.driver_commission = docdata[i].orderDetails.billings.amount.driver_commission;
                                    totalEarn = parseFloat(totalEarn) + parseFloat(temp.driver_commission)


                                }
                                else {

                                    temp.total = 0;
                                    temp.total = temp.total.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                    temp.driver_commission = 0;
                                    totalEarn = totalEarn + temp.driver_commission;

                                }

                                deliveryCount = deliveryCount + 1;

                                data.Details.EarningDetails.push(temp);
                            }
                            totalEarn = totalEarn.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                            data.Details.TotalDetails.push({ DeliveryCount: deliveryCount, TotalEarning: totalEarn });
                            cb(null);
                        }
                        else {
                            data.Details = {};
                            data.Details.EarningDetails = [];
                            data.Details.TotalDetails = [];
                            cb(null);
                        }

                    }], function (err, ress) {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (setterr, settings) => {
                            if (!setterr && settings) {
                                data.currency_symbol = (typeof (settings.settings) == 'undefined') || (typeof (settings.settings.currency_symbol) == 'undefined') ? '$' : settings.settings.currency_symbol;
                                data.distFormat = (typeof (settings.settings) == 'undefined') || (typeof (settings.settings.delivery_charge.format) == 'undefined') ? 'km' : settings.settings.delivery_charge.format;
                                res.send(data);
                            }
                            else {
                                data.currency_symbol = '$';
                                data.distFormat = 'km';
                                res.send(data);
                            }
                        })

                    })


                }
            })
        })
    }


    router.getDashboard = function (req, res) {
        var errors = [];
        var dateFormat = require('dateformat');
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        var request = {};
        request.driver_id = req.body.driver_id;
        var async = require('async');
        async.parallel({
            earningsHistory: function (callback) {
                var aggregation_data = [
                    { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id) } },
                    {
                        $project: { driver_commission: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }] }, "$billings.amount.driver_commission", 0] } }
                    },
                    { $group: { _id: null, total_deliveries: { $sum: 1 }, total_earnings: { $sum: "$driver_commission" } } }
                ];
                db.GetAggregation('orders', aggregation_data, function (err, orderDetails) {
                    var total_earnings = 0;
                    var total_deliveries = 0;
                    if (orderDetails && orderDetails.length > 0) {
                        if (typeof orderDetails[0].total_deliveries != 'undefined' && orderDetails[0].total_deliveries > 0) {
                            total_deliveries = orderDetails[0].total_deliveries;
                        }
                        if (typeof orderDetails[0].total_earnings != 'undefined' && orderDetails[0].total_earnings > 0) {
                            total_earnings = orderDetails[0].total_earnings;
                        }
                    }
                    callback(null, { total_earnings: total_earnings, total_deliveries: total_deliveries })
                })
            },
            orderHistory: function (callback) {
                db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, function (err, billingsettings) {
                    if (err || !billingsettings) {
                        callback(null, { order_history: [] });
                    } else {
                        if (typeof billingsettings.settings.last_billed_time != 'undefined') {
                            var last_billed_time = parseInt(billingsettings.settings.last_billed_time);
                        } else {
                            var last_billed_time = new Date(billingsettings.settings.last_billed_date).getTime();
                        }
                        var filter_query = { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id), "created_time": { $gte: parseInt(last_billed_time) } };
                        var condition = [
                            { "$match": filter_query },
                            {
                                $project: {
                                    orderDetails: {
                                        order_id: "$order_id",
                                        order_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
                                        mileage_travelled: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, "$mileages_travelled", 0] },
                                        you_earned: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
                                    }
                                }
                            },
                            {
                                $group: {
                                    _id: "null",
                                    "count": { $sum: 1 },
                                    "driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.you_earned", ''] }, ''] }, { $gte: ["$orderDetails.you_earned", 0] }] }, "$orderDetails.you_earned", 0] } },
                                    'orderDetails': { $push: "$orderDetails" }
                                }
                            },
                        ];
                        db.GetAggregation('orders', condition, function (err, docdata) {
                            if (err || !docdata) {
                                callback(null, { driver_total: 0, orderDetails: [], count: 0 })
                            } else {
                                var count = 0;
                                var driver_total = 0;
                                var orderDetails = [];
                                if (docdata && docdata.length > 0 && typeof docdata[0].count != 'undefined') {
                                    count = docdata[0].count;
                                }
                                if (docdata && docdata.length > 0 && typeof docdata[0].orderDetails != 'undefined') {
                                    orderDetails = docdata[0].orderDetails;
                                }
                                if (docdata && docdata.length > 0 && typeof docdata[0].driver_total != 'undefined') {
                                    driver_total = docdata[0].driver_total;
                                }
                                callback(null, { driver_total: driver_total, orderDetails: orderDetails, count: count })
                            }
                        })
                    }
                })
            },
            cancleOrder: function (callback) {
                db.GetCount('orders', { 'cancel_drivers': { $elemMatch: { 'id': request.driver_id } } }, function (err, cancleCount) {
                    var cancle_count = 0;
                    if (cancleCount && cancleCount > 0) {
                        cancle_count = cancleCount;
                    }
                    callback(null, { cancle_count: cancle_count })
                })
            },
        }, function (err, result) {
            var total_earnings = 0;
            var total_deliveries = 0;
            var driver_total = 0;
            var cancle_count = 0;
            var history = [];
            if (result && typeof result.earningsHistory != 'undefined' && typeof result.earningsHistory.total_deliveries != 'undefined' && result.earningsHistory.total_deliveries) {
                total_deliveries = result.earningsHistory.total_deliveries;
            }
            if (result && typeof result.earningsHistory != 'undefined' && typeof result.earningsHistory.total_earnings != 'undefined' && result.earningsHistory.total_earnings > 0) {
                total_earnings = result.earningsHistory.total_earnings;
            }
            if (result && typeof result.orderHistory != 'undefined' && typeof result.orderHistory.orderDetails != 'undefined' && result.orderHistory.orderDetails.length > 0) {
                history = result.orderHistory.orderDetails;
            }
            if (result && typeof result.orderHistory != 'undefined' && typeof result.orderHistory.driver_total != 'undefined' && result.orderHistory.driver_total > 0) {
                driver_total = result.orderHistory.driver_total;
            }
            if (result && typeof result.cancleOrder != 'undefined' && typeof result.cancleOrder.cancle_count != 'undefined' && result.cancleOrder.cancle_count > 0) {
                cancle_count = result.cancleOrder.cancle_count;
            }
            var date = new Date();
            var datestr = ''
            datestr = datestr + date.getDate();
            datestr = datestr + '/';
            var mon = parseInt(date.getMonth()) + 1;
            datestr = datestr + mon;
            datestr = datestr + '/';
            datestr = datestr + date.getFullYear();
            var total_driver_order = parseInt(cancle_count) + parseInt(total_deliveries);
            var final_response = {};
            final_response.total_deliveries = total_deliveries;
            final_response.total_earnings = total_earnings;
            final_response.driver_total = driver_total;
            final_response.history = history;
            final_response.date = datestr;
            final_response.bill = driver_total;
            final_response.paidStatus = 'Unpaid';
            final_response.EarnedHistory = driver_total;
            final_response.totalDenied = cancle_count;
            final_response.acceptPercent = parseInt(total_deliveries) * 100 / parseInt(total_driver_order)
            final_response.acceptPercent = parseFloat(final_response.acceptPercent).toFixed(2)
            if (cancle_count == 0 && total_deliveries == 0) {
                final_response.acceptPercent = 0;
            } else if (cancle_count > 0 && total_deliveries == 0) {
                final_response.acceptPercent = 0;
            } else if (total_deliveries == total_driver_order && total_driver_order > 0) {
                final_response.acceptPercent = 100
            }
            db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (setterr, settings) => {
                if (!setterr && settings) {
                    final_response.currency_symbol = (typeof (settings.settings) == 'undefined') || (typeof (settings.settings.currency_symbol) == 'undefined') ? '$' : settings.settings.currency_symbol;
                    final_response.distFormat = (typeof (settings.settings.delivery_charge) == 'undefined') || (typeof (settings.settings.delivery_charge.format) == 'undefined') ? 'km' : settings.settings.delivery_charge.format;
                    res.send({ 'status': 1, 'message': 'Success', data: final_response });
                }
                else {
                    final_response.currency_symbol = '$';
                    final_response.distFormat = 'km';
                    res.send({ 'status': 1, 'message': 'Success', data: final_response });
                }
            })
        });
    }




    /* router.getDashboard = (req, res) => {
        var errors = [];
        var dateFormat = require('dateformat');
        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};
        var request = {};
        request.driver_id = req.body.driver_id;
        var aggregation_data = [
            { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id) } },
            { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
            { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    'RestaurantDetails': {
                        _id: '$RestaurantDetails._id',
                        restaurant_name: '$RestaurantDetails.restaurantname',
                        address: '$RestaurantDetails.address',
                        location: '$RestaurantDetails.location'
                    }, 'orderDetails': {
                        _id: '$_id',
                        createdAt: '$createdAt',
                        status: '$status',
                        order_id: '$order_id',
                        delivery_address: '$delivery_address',
                        foods: '$foods',
                        billings: '$billings',
                        mileages_travelled: '$mileages_travelled'

                    }

                }
            }, { $project: { "orderDetails": 1, "RestaurantDetails": 1 } }
        ];

        db.GetAggregation('orders', aggregation_data, (err, docs) => {
            var data = {};
            async.series([function (cb) {
                var totalDeliveries = 0;
                var totalCommission = 0;
                for (i in docs) {
					 totalCommission = parseFloat(totalCommission) + ( parseFloat(docs[i].orderDetails.billings.amount.driver_commission));
                    totalDeliveries = parseInt(totalDeliveries) + 1;
                }
                totalCommission = totalCommission.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                data.total_earnings = totalCommission;
                data.total_deliveries = totalDeliveries;
                cb(null);
            }, (cb) => {
                db.GetOneDocument('settings', { 'alias': 'billing_cycle' }, {}, {}, (err, settings) => {
                    var date = '';
                    if (err || !settings) {
                        date = settings.settings.last_billed_date.getTime();
                    }
                    else {
                        date = settings.settings.last_billed_date.getTime();
                    }
                    var currdate = new Date();
                    var aggregation_data1 = [
                        { $match: { status: { $eq: 7 }, "driver_id": new mongoose.Types.ObjectId(request.driver_id), "created_time": { "$gte": date } } },
                        { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                        { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
                        {
                            $project: {
                                'RestaurantDetails': {
                                    _id: '$RestaurantDetails._id',
                                    restaurant_name: '$RestaurantDetails.restaurantname',
                                    address: '$RestaurantDetails.address',
                                    location: '$RestaurantDetails.location'
                                }, 'orderDetails': {
                                    _id: '$_id',
                                    createdAt: '$createdAt',
                                    status: '$status',
                                    order_id: '$order_id',
                                    delivery_address: '$delivery_address',
                                    foods: '$foods',
                                    billings: '$billings',
                                    mileages_travelled: '$mileages_travelled'

                                }, 'UserDetails': {
                                    _id: '$UserDetails._id',
                                    address: '$UserDetails.address',
                                    location: '$UserDetails.location',
                                    username: '$UserDetails.username'
                                }


                            }
                        }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
                    ];

                    db.GetAggregation('orders', aggregation_data1, (err, hist) => {
                        if (!err) {

                            data.history = [];
                            var val = 0, bill = 0;
                            let mappingFunc = (i, cbb) => {
                                let temp = {};
                                temp.order_id = i.orderDetails.order_id;
                                temp.order_amount = i.orderDetails.billings.amount.total.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                temp.mileage_travelled = parseInt(i.orderDetails.mileages_travelled);
                                temp.you_earned = ( parseFloat(i.orderDetails.billings.amount.driver_commission) - parseFloat(i.orderDetails.billings.amount.bir_tax_amount) ).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                val = parseFloat(val) + ( parseFloat(i.orderDetails.billings.amount.driver_commission) - parseFloat(i.orderDetails.billings.amount.bir_tax_amount) );
                                bill = parseFloat(bill) + ( parseFloat(i.orderDetails.billings.amount.driver_commission) - parseFloat(i.orderDetails.billings.amount.bir_tax_amount) );
                                val = val.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                data.history.push(temp)

                                cbb(null);

                            }
                            async.eachSeries(hist, mappingFunc, (err, resss) => {
                                let date = new Date();
                                let datestr = ''
                                datestr = datestr + date.getDate();
                                datestr = datestr + '/';
                                let mon = parseInt(date.getMonth()) + 1;
                                datestr = datestr + mon;
                                datestr = datestr + '/';
                                datestr = datestr + date.getFullYear();
                                data.date = datestr;
                                bill = bill.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                                data.bill = bill;
                                data.paidStatus = 'Unpaid'; 
                                data.EarnedHistory = val
                                cb(null);
                            })

                        }

                    })
                })

            }, (cb) => {
                db.GetDocument('orders', { 'cancel_drivers': { $elemMatch: { 'id': request.driver_id } } }, {}, {}, (err, docc) => {

                    data.totalDenied = docc.length;
                    let total = parseInt(data.totalDenied) + parseInt(data.total_deliveries);

                    data.acceptPercent = parseInt(data.total_deliveries) * 100 / parseInt(total)
                    data.acceptPercent = parseFloat(data.acceptPercent).toFixed(2)

                    if (data.totalDenied == 0 && data.total_deliveries == 0) {
                        data.acceptPercent = 0;
                    }
                    if (data.totalDenied > 0 && data.total_deliveries == 0) {
                        data.acceptPercent = 0;
                    }
                    if (data.total_deliveries == total && total > 0) {
                        data.acceptPercent = 100
                    }


                    cb(null);
                })

            }], function (err, resu) {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (setterr, settings) => {
                    if (!setterr && settings) {
                        data.currency_symbol = (typeof (settings.settings) == 'undefined') || (typeof (settings.settings.currency_symbol) == 'undefined') ? '$' : settings.settings.currency_symbol;
                        data.distFormat = (typeof (settings.settings.delivery_charge) == 'undefined') || (typeof (settings.settings.delivery_charge.format) == 'undefined') ? 'km' : settings.settings.delivery_charge.format;
                        res.send({ 'status': 1, 'message': 'Success', data: data });
                    }
                    else {
                        data.currency_symbol = '$';
                        data.distFormat = 'km';
                        res.send({ 'status': 1, 'message': 'Success', data: data });
                    }

                })

            })
        })
    } */
    router.updateDriverDocs = (req, res) => {
        if (typeof req.file != 'undefined') {
            var avatar = attachment.get_attachment(req.file.destination, req.file.filename);
            db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id), driver_documents: { $elemMatch: { 'doc_name': req.body.doc_name } } }, { $set: { "driver_documents.$.doc_name": req.body.doc_name, "driver_documents.$.image": avatar, "driver_documents.$.expiry_date": new Date() } }, {}, (err, updated) => {
                if (updated.nModified == 1) {
                    var temp = {};
                    temp.doc_name = req.body.doc_name;
                    temp.image = attachment.get_attachment(req.file.destination, req.file.filename);
                    res.send({ 'status': 1, 'message': 'Uploaded successfully', response: temp });
                }
                else {
                    var temp = {};
                    temp.doc_name = req.body.doc_name;
                    temp.image = attachment.get_attachment(req.file.destination, req.file.filename);
                    //temp.expiry_date = new Date();
                    res.send({ 'status': 1, response: temp });
                    /*db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.driver_id) }, { $addToSet: { 'driver_documents': temp } }, {}, (err, updated) => {
                        if (err) {
    
                            res.send({ 'status': 0, 'message': 'Cannot upload ' });
                        }
                        else {
    
    
                            res.send({ 'status': 1, 'message': 'Uploaded successfully' });
                        }
                    })*/

                }

            })
        }
        else {
            res.send({ 'status': 0, 'message': 'Cannot upload ' });
        }


    }
    router.getAccounts = (req, res) => {
        var errors = [];

        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};

        var request = {};

        request.driver_id = req.body.driver_id;
        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.driver_id) }, { account_details: 1, username: 1 }, {}, (err, docs) => {

            if (err) {
                res.send({ status: 0, data: err });
            }
            else {
                var data = {};
                data.account_name = docs.account_details.account_name;
                data.account_address = docs.account_details.account_address;
                data.account_number = docs.account_details.account_number;
                data.routing_number = docs.account_details.routing_number;
                data.bank_name = docs.account_details.bank_name;
                data.branch_address = docs.account_details.branch_address;
                data.branch_name = docs.account_details.branch_name;
                data.swift_code = docs.account_details.swift_code;
                res.send({ status: 1, data: data });
            }
        })
    }
    router.saveAccounts = (req, res) => {

        var errors = [];

        req.checkBody('driver_id', 'Driver ID is required').notEmpty();
        req.checkBody('data', 'Data is required').notEmpty();
        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};

        var request = {};

        request.driver_id = req.body.driver_id;
        request.account_number = req.body.data.data.account_number;
        request.bank_name = req.body.data.data.bank_name;
        request.routing_number = req.body.data.data.routing_number;
        request.account_name = req.body.data.data.account_name;
        request.swift_code = req.body.data.data.swift_code;
        request.account_address = req.body.data.data.account_address;
        request.branch_address = req.body.data.data.branch_address;
        request.branch_name = req.body.data.data.branch_name;
        var temp = {};
        temp.account_name = request.account_name;
        temp.account_number = request.account_number;
        temp.bank_name = request.bank_name;
        temp.routing_number = request.routing_number;
        temp.swift_code = request.swift_code;
        temp.account_address = request.account_address;
        temp.branch_address = request.branch_address;
        temp.branch_name = request.branch_name;
        db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.driver_id) }, { 'account_details': temp }, {}, (err, resp) => {
            if (err) {
                res.send({ 'status': 0, response: err });
            }
            else {
                res.send({ 'status': 1, response: 'Saved successfully' });
            }
        })
    }
    router.sendForgotEmail = (req, res) => {
        var errors = [];

        req.checkBody('email', 'Email Id is required').notEmpty();

        errors = req.validationErrors();
        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};

        var request = {};

        db.GetOneDocument('drivers', { 'email': req.body.email }, {}, {}, (err, ress) => {
            if (ress) {
                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {
                    var url = '';
                    if (settings) {
                        url = '<a style="display: inline-block; background-color: #e15500; color: #fff !important; padding: 10px; text-decoration: none; font-size: 12px; text-transform: uppercase;" href=' + settings.settings.site_url + 'forgotReturn/' + ress._id + '>Click to reset the password</a>';
                    }
                    var mailData = {};
                    mailData.template = 'forgot_password_driver';
                    mailData.to = req.body.email;
                    mailData.html = [];
                    mailData.html.push({ name: 'name', value: ress.username || "" });
                    mailData.html.push({ name: 'link', value: url || "" });
                    mailcontent.sendmail(mailData, function (err, response) { });
                    var forgot = {};
                    forgot.last_sent = new Date();
                    forgot.is_done = 0;
                    db.UpdateDocument('drivers', { 'email': req.body.email }, { 'forgot_password': forgot }, {}, (err, updated) => {
                        res.send({ status: 1, response: {} });
                    })

                })
            } else {
                res.send({ status: 0, response: 'No driver found' });
            }
        })
    }

    router.changePassword = (req, res) => {
        var moment = require('moment')
        var errors = [];

        req.checkBody('driver_id', 'Driver Id is required').notEmpty();
        req.checkBody('password', 'Password is required').notEmpty();


        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};


        var request = {};
        request.id = req.body.driver_id;
        request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, isDriver) => {
            if (isDriver) {
                if (isDriver.forgot_password.is_done == 1) {


                    res.send({ status: 0, response: 'Error in updating' })
                }
                else {



                    var a = moment(new Date(isDriver.forgot_password.last_sent));

                    var b = moment(new Date());

                    if (b.diff(a, 'minutes') > 60) {
                        res.send({ status: 0, response: 'Error in updating' })
                    }
                    else {
                        db.UpdateDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.id) }, { 'password': request.password, 'forgot_password.is_done': 1 }, {}, (err, updated) => {
                            if (updated.nModified == 1) {
                                res.send({ status: 1, response: 'updated successfully' })
                            }
                            else {
                                res.send({ status: 0, response: 'Error in updating' })
                            }

                        })
                    }


                }

            }
            else {
                res.send({ status: 0, response: 'Error in updating' })
            }
        })
    }
    router.getCycles = (req, res) => {          //    WILL FETCH BILLING CYCLES
        var moment = require('moment');
        db.GetOneDocument('settings', { 'alias': 'billing_cycle' }, {}, {}, (err, settings) => {   // CHECKING LAST BILLED DATE
            if (!err && settings != null) {

                var cycle_list = [];
                db.GetDocument('billing', {}, {}, { sort: { createdAt: -1 } }, (err, cycles) => {
                    //   FETCHING ALL BILLING CYCLES

                    if (!err || cycles.length > 0) {

                        for (i in cycles) {

                            var start_date = moment(new Date(cycles[i].start_date)).format("DD/MM/YYYY");
                            var end_date = moment(new Date(cycles[i].end_date)).format("DD/MM/YYYY");

                            var str = start_date + ' - ' + end_date;
                            cycle_list.push({ id: cycles[i]._id, cycle: str });
                        }

                        var date = new Date(settings.settings.last_billed_date);
                        //date = date.setDate(date.getDate() + 1);


                        date = moment(new Date(date)).format("DD/MM/YYYY");
                        var str = date + ' - till now';                 // CURRENT BILL CYCLE
                        cycle_list.unshift({ id: null, cycle: str });
                        res.send({ status: 1, cycle_list: cycle_list });

                    }
                    else {

                        res.send({ status: 0, cycle_list: [] });
                    }
                })




            }
            else {
                res.send({ status: 0, cycle_list: [] });
            }
        })
    }
    router.getLanding = (req, res) => {

        db.GetOneDocument('driver_landing', {}, {}, {}, (err, docs) => {
            if (err || !docs) {
                res.send({ status: 0, response: '' });
            }
            else {

                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, (err, settings) => {

                    if (typeof docs.section1 != 'undefined') {
                        docs.section1.icon = settings.settings.site_url + docs.section1.icon;
                        //docs.section1.icon = 'http://localhost:3006/' + docs.section1.icon;
                    }
                    if (typeof docs.section2 != 'undefined') {
                        docs.section2.icon = settings.settings.site_url + docs.section2.icon;
                        //docs.section2.icon = 'http://localhost:3006/' + docs.section2.icon;

                    }
                    if (typeof docs.section3 != 'undefined') {
                        docs.section3.icon = settings.settings.site_url + docs.section3.icon;
                        //docs.section3.icon = 'http://localhost:3006/' + docs.section3.icon;
                    }
                    if (typeof docs.banner != 'undefined' && typeof docs.banner.icon != 'undefined') {
                        docs.banner.icon = settings.settings.site_url + docs.banner.icon;
                        //docs.banner.icon = 'http://localhost:3006/' + docs.banner.icon;
                    }


                    res.send({ status: 1, response: docs });
                })
            }
        })
    }
    router.fetchByCycle = (req, res) => {
        var data = {};
        data.history = [];

        db.GetOneDocument('driver_earnings', { 'billing_id': new mongoose.Types.ObjectId(req.body.id), 'driver_id': new mongoose.Types.ObjectId(req.body.driver_id) }, {}, {}, (err, earnings) => {
            if (err || !earnings) {
                res.send({ status: 0, data: data })
            }
            else {
                var filter_query = { $and: [{ 'order_id': { $in: earnings.order_lists } }, { 'status': { $eq: 7 } }, { "driver_id": new mongoose.Types.ObjectId(req.body.driver_id) }] };
                var condition = [
                    { "$match": filter_query },
                    {
                        $project: {
                            orderDetails: {
                                order_id: "$order_id",
                                order_amount: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.total", ''] }, ''] }, { $gte: ["$billings.amount.total", 0] }] }, "$billings.amount.total", 0] },
                                mileage_travelled: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$mileages_travelled", ''] }, ''] }, { $gte: ["$mileages_travelled", 0] }] }, "$mileages_travelled", 0] },
                                you_earned: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$billings.amount.driver_commission", ''] }, ''] }, { $gte: ["$billings.amount.driver_commission", 0] }] }, "$billings.amount.driver_commission", 0] },
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "null",
                            "count": { $sum: 1 },
                            "driver_total": { $sum: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$orderDetails.you_earned", ''] }, ''] }, { $gte: ["$orderDetails.you_earned", 0] }] }, "$orderDetails.you_earned", 0] } },
                            'orderDetails': { $push: "$orderDetails" }
                        }
                    },
                ];
                db.GetAggregation('orders', condition, function (err, docdata) {
                    var date = new Date();
                    var datestr = ''
                    datestr = datestr + date.getDate();
                    datestr = datestr + '/';
                    var mon = parseInt(date.getMonth()) + 1;
                    datestr = datestr + mon;
                    datestr = datestr + '/';
                    datestr = datestr + date.getFullYear();
                    if (err || !docdata) {
                        var final_response = {};
                        final_response.driver_total = 0;
                        final_response.history = [];
                        final_response.date = datestr;
                        final_response.bill = 0;
                        if (earnings.paid_status == 0) {
                            final_response.paidStatus = 'Unpaid';
                        } else {
                            final_response.paidStatus = 'Paid';
                        }
                        final_response.EarnedHistory = driver_total;
                        res.send({ status: 1, data: final_response });
                    } else {
                        var count = 0;
                        var driver_total = 0;
                        var history = [];
                        if (docdata && docdata.length > 0 && typeof docdata[0].count != 'undefined') {
                            count = docdata[0].count;
                        }
                        if (docdata && docdata.length > 0 && typeof docdata[0].orderDetails != 'undefined') {
                            history = docdata[0].orderDetails;
                        }
                        if (docdata && docdata.length > 0 && typeof docdata[0].driver_total != 'undefined') {
                            driver_total = docdata[0].driver_total;
                        }
                        var final_response = {};
                        final_response.driver_total = driver_total;
                        final_response.history = history;
                        final_response.date = datestr;
                        final_response.bill = driver_total;
                        if (earnings.paid_status == 0) {
                            final_response.paidStatus = 'Unpaid';
                        } else {
                            final_response.paidStatus = 'Paid';
                        }
                        final_response.EarnedHistory = driver_total;
                        res.send({ status: 1, data: final_response });
                    }
                })

                /*  var aggregation_data = [
                     { $match: { $and: [{ 'order_id': { $in: earnings.order_lists } }, { 'status': { $eq: 7 } }, { "driver_id": new mongoose.Types.ObjectId(req.body.driver_id) }] } },
                     { $lookup: { from: "restaurant", localField: "restaurant_id", foreignField: "_id", as: "RestaurantDetails" } },
                     { $unwind: { path: "$RestaurantDetails", preserveNullAndEmptyArrays: true } },
                     { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "UserDetails" } },
                     { $unwind: { path: "$UserDetails", preserveNullAndEmptyArrays: true } },
                     {
                         $project: {
                             'RestaurantDetails': {
                                 _id: '$RestaurantDetails._id',
                                 restaurant_name: '$RestaurantDetails.restaurantname',
                                 address: '$RestaurantDetails.address',
                                 location: '$RestaurantDetails.location'
                             }, 'orderDetails': {
                                 _id: '$_id',
                                 createdAt: '$createdAt',
                                 status: '$status',
                                 order_id: '$order_id',
                                 delivery_address: '$delivery_address',
                                 foods: '$foods',
                                 billings: '$billings',
                                 mileages_travelled: '$mileages_travelled'
 
                             }, 'UserDetails': {
                                 _id: '$UserDetails._id',
                                 address: '$UserDetails.address',
                                 location: '$UserDetails.location',
                                 username: '$UserDetails.username'
                             }
 
 
                         }
                     }, { $project: { "orderDetails": 1, "RestaurantDetails": 1, "UserDetails": 1 } }
                 ];
                 db.GetAggregation('orders', aggregation_data, (err, docs) => {
                     if (err || !docs) {
                         res.send({ status: 0, data: data })
                     }
                     else {
                         data.history = [];
                         var val = 0, bill = 0;
                         let mappingFunc = (i, cbb) => {
                             let temp = {};
                             temp.order_id = i.orderDetails.order_id;
                             temp.order_amount = i.orderDetails.billings.amount.total;
                             temp.mileage_travelled = parseInt(i.orderDetails.mileages_travelled);
                             temp.you_earned = ( parseFloat(i.orderDetails.billings.amount.driver_commission) - parseFloat(i.orderDetails.billings.amount.bir_tax_amount) ).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                             val = parseFloat(val) + ( parseFloat(i.orderDetails.billings.amount.driver_commission) - parseFloat(i.orderDetails.billings.amount.bir_tax_amount) );
                             bill = parseFloat(bill) + ( parseFloat(i.orderDetails.billings.amount.driver_commission) - parseFloat(i.orderDetails.billings.amount.bir_tax_amount) );
                             val = val.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
 
                             data.history.push(temp)
 
                             cbb(null);
 
                         }
                         async.eachSeries(docs, mappingFunc, (err, resss) => {
                             let date = new Date();
 
 
                             let datestr = ''
                             datestr = datestr + date.getDate();
                             datestr = datestr + '/';
                             let mon = parseInt(date.getMonth()) + 1;
                             datestr = datestr + mon;
                             datestr = datestr + '/';
                             datestr = datestr + date.getFullYear();
                             data.date = datestr;
                             data.EarnedHistory = val;
                             bill = bill.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
 
                             data.bill = bill;
                             if (earnings.paid_status == 0) {
                                 data.paidStatus = 'Unpaid';
                             }
                             else {
                                 data.paidStatus = 'Paid';
                             }
                             res.send({ status: 1, data: data });
                         })
                     }
                 }) */

            }
        })
    }
    router.checkLink = (req, res) => {
        var moment = require('moment')
        var errors = [];

        req.checkBody('driver_id', 'Driver Id is required').notEmpty();
        // req.checkBody('password', 'Password is required').notEmpty();


        errors = req.validationErrors();

        if (errors) {
            res.send({
                "status": "0",
                "errors": errors[0].msg
            });
            return;
        }
        var data = {};


        var request = {};
        request.id = req.body.driver_id;
        // request.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(request.id) }, {}, {}, (err, isDriver) => {
            if (isDriver) {
                if (isDriver.forgot_password.is_done == 1) {


                    res.send({ status: 0, response: 'Error in updating' })
                }
                else {



                    var a = moment(new Date(isDriver.forgot_password.last_sent));

                    var b = moment(new Date());

                    if (b.diff(a, 'minutes') > 60) {
                        res.send({ status: 0, response: 'Error in updating' })
                    }
                    else {
                        res.send({ status: 1, response: 'No error in updating' });
                    }


                }

            }
            else {
                res.send({ status: 0, response: 'Error in updating' })
            }
        })
    }

    router.orderuserInvoice = function (req, res) {
        var userId;
        if (typeof req.query.userId != 'undefined' && req.query.userId != '') {
            if (isObjectId(req.query.userId)) {
                userId = new mongoose.Types.ObjectId(req.query.userId);
            } else {
                res.send({ 'status': 0, 'message': 'Invalid userId' });
                return;
            }
        } else {
            res.send({ 'status': 0, 'message': 'Invalid userId' });
            return;
        }
        var orderId;
        if (typeof req.query.orderId != 'undefined' && req.query.orderId != '') {
            if (isObjectId(req.query.orderId)) {
                orderId = new mongoose.Types.ObjectId(req.query.orderId);
            } else {
                res.send({ 'status': 0, 'message': 'Invalid orderId' });
                return;
            }
        } else {
            res.send({ 'status': 0, 'message': 'Invalid orderId' });
            return;
        }
        var request = require('request');
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            if (err || !settings) {
                socket.emit("r2e_download_summary", { err: 1, message: 'Invalid Error, Please check your data' });
                res.send({ 'status': 0, 'message': 'Invalid userId' });
            } else {
                var findRemoveSync = require('find-remove');
                var site_url = settings.settings.site_url;
                var site_title = settings.settings.site_title;
                var filename = site_title + '-order-' + Date.now() + '.pdf';
                findRemoveSync('./uploads/invoice', { age: { seconds: 100 }, extensions: '.pdf' });
                request(site_url + 'site/users/userorderSummary?userId=' + userId + '&orderId=' + orderId, function (error, response, body) {
                    if (error && error != null) {
                        res.send({ 'status': 0, 'message': 'Something went to wrong' });
                    } else {
                        if (response.statusCode == 200) {
                            try {
                                var body = JSON.parse(body);
                            } catch (e) {
                            }
                            if (typeof body == 'string') {
                                var pdf = require('html-pdf');
                                var options = { format: 'Letter' };
                                pdf.create(body, options).toFile('./uploads/invoice/' + filename, function (err, resp) {
                                    if (err) {
                                        res.send({ 'status': 0, 'message': 'Something went to wrong' });
                                    } else {
                                        var result = { "err": 0, message: '', "filepath": site_url + './uploads/invoice/' + filename, filename: filename }
                                        res.writeHead(301,
                                            { Location: site_url + './uploads/invoice/' + filename }
                                        );
                                        res.end();
                                        //  res.send({ 'status':1, 'result': result});
                                    }
                                });
                            } else {
                                if (typeof body.errors != 'undefined') {
                                    res.send({ 'status': 0, 'message': body.errors });
                                } else {
                                    res.send({ 'status': 0, 'message': 'Something went to wrong' });
                                }
                            }
                        } else {
                            res.send({ 'status': 0, 'message': 'Something went to wrong' });
                        }
                    }
                });
            }
        });

    }




    return router;
};
