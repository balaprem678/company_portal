
module.exports = function (io) {
    var bcrypt = require('bcrypt-nodejs');
    var async = require("async");
    var GoogleAPI = require('../../model/googleapis.js');
    var mongoose = require("mongoose");
    var db = require('../adaptor/mongodb.js');
    var twilio = require('../../model/twilio.js');
    var library = require('../../model/library.js');
    var crypto = require('crypto');
    var controller = {};
    // var otp = require('otplib/lib/authenticator');
    var otp = require('otplib');
    otp.options = { crypto };
    var fs = require("fs");
    var attachment = require('../../model/attachments.js');
    var middlewares = require('../../model/middlewares.js');
    var Jimp = require("jimp");
    var path = require('path');
    var moment = require("moment");
    var CONFIG = require('../../config/config');
    var push = require('../../model/pushNotification.js')(io);
    var mailcontent = require('../../model/mailcontent.js');
    var timezone = require('moment-timezone');
    var htmlToText = require('html-to-text');
    var jwt = require('jsonwebtoken');
    var each = require('sync-each');
    var deg2rad = require('deg2rad');
    var distance = require('google-distance-matrix');



    controller.addAddress = async function (req, res) {

        try {
            console.log(req.body, 'this is the request body');
            var or_location = {};

            if (req.body.long && req.body.lat) {
                or_location.lng = req.body.long;
                or_location.lat = req.body.lat;
            }

            var order_address = {
                'name': req.body.name,
                'first_name' : req.body.first_name,
                'last_name' : req.body.last_name,
                'line1': req.body.line1,
                'street': req.body.street,
                'fulladres': req.body.fulladres,
                'country': req.body.country,
                'city': req.body.city,
                'zipcode': req.body.zipcode,
                'state': req.body.state,
                'phone': {
                    code: req.body.code,
                    number: req.body.mobile,
                },
                'user_id': req.body.user_id,
                "choose_location": req.body.choose_location
            };
            console.log(order_address, 'order_addressorder_address');
            const response = await db.GetOneDocument('users', { '_id': req.body.user_id }, {}, {})
            if (response.status === false) {
                res.send({
                    "status": "0",
                    error: false,
                    message: "There is no user found",
                    "errors": "User not found..!"
                });
            } else {
                if (req.body.id) {
                    await db.UpdateDocument('order_address', { "_id": req.body.id, 'user_id': req.body.user_id }, order_address, {})
                    res.send({
                        "status": "1",
                        "response": "Delivery Address Updated Successfully for edit address.",
                    });
                } else {
                    const insert = await db.InsertDocument('order_address', order_address)
                    if (!insert) {
                        res.send({
                            "status": "0",
                            "errors": "Error in delivery location update..!"
                        });
                    }
                    const doc = await db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {})
                    if (doc.doc && doc.doc.length == 1) {
                        await db.UpdateDocument('order_address', { 'user_id': req.body.user_id }, { $set: { 'active': true } }, {})
                    }
                    res.send({
                        "error": false,
                        "message": "Address Added Successfully",
                        "status": "1",
                        "response": "Delivery Address Added Successfully.",
                        "data": insert
                    });
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    controller.updateAddress = async function (req, res) {





        try {

            var or_location = {};

            if (req.body.long && req.body.lat) {
                or_location.lng = req.body.long;
                or_location.lat = req.body.lat;
            }

            var order_address = {
                'name': req.body.name,
                'line1': req.body.line1,
                'street': req.body.street,
                'fulladres': req.body.fulladres,
                'country': req.body.country,
                'city': req.body.city,
                'zipcode': req.body.zipcode,
                'state': req.body.state,
                // 'phone': req.body.mobile,
                'phone': {
                    code: req.body.code,
                    number: req.body.mobile,
                },
                'status': 1,
                'choose_location': req.body.choose_location,
                'address_value': req.body.address_value,
                'loc': or_location,
                'user_id': req.body.user_id
            };

            if (req.body.active) {

                const updat = await db.UpdateAllDocument('order_address', { 'user_id': req.body.user_id, '_id': { $ne: req.body.address_id } }, { $set: { active: false } }, { multi: true })
                console.log(updat, 'this updat');
                if (updat.status === false) {
                    res.send({ error: true, message: 'Update has some error' })
                } else {
                    const update = await db.UpdateDocument('order_address', { 'user_id': req.body.user_id, '_id': req.body.address_id }, { $set: { active: true } }, {})

                    if (update.status === false) {
                        res.send({ error: true, message: 'Update has some error' })
                    } else {
                        res.send({ error: false, message: 'Updated the address successfully' })
                    }
                }
            }
            const response = await db.GetOneDocument('users', { '_id': req.body.user_id, }, {}, {})
            if (response.status === false && !req.body.active) {
                res.send({
                    "status": "0",
                    "errors": "User not found..!"
                });
            } else {
                if (req.body.id && !req.body.active) {
                    await db.UpdateDocument('order_address', { "_id": req.body.id, 'user_id': req.body.user_id }, order_address, {})
                    res.send({
                        "status": "1",
                        "response": "Delivery Address Updated Successfully for edit address.",
                    });
                } else {
                    if (!req.body.active) {
                        const insert = await db.InsertDocument('order_address', order_address)
                        if (!insert) {
                            res.send({
                                "status": "0",
                                "errors": "Error in delivery location update..!"
                            });
                        }
                        const doc = await db.GetDocument('order_address', { 'user_id': req.body.user_id }, {}, {})
                        if (doc.doc && doc.doc.length == 1) {
                            await db.UpdateDocument('order_address', { 'user_id': req.body.user_id }, { $set: { 'active': true } }, {})
                        }
                        res.send({
                            "error": false,
                            "message": "Address updated Successfully",
                            "status": "1",
                            "response": "Delivery Address updated Successfully.",
                            "data": insert
                        });
                    }

                }
            }
        } catch (error) {

        }
    }

    controller.deleteAddress = async function (req, res) {
        try {
            var data = {};
            data.user_id = req.body.user_id;
            data.address_id = req.body.address_id;
            const docdata = await db.DeleteDocument('order_address', { 'user_id': data.user_id, '_id': data.address_id })
            if (docdata.status === false) {
                res.send({
                    "status": "0",
                    "errors": "Error in order address delete..!"
                });
            } else {
                res.send({
                    "status": "1",
                    "response": "Order address deleted successfully."
                });
            }
        } catch (error) {

        }
    }

    controller.getAddress = async function (req, res) {
        try {
            console.log(req.body, 'this is request body');
            var userId;
            if (typeof req.body.userId != 'undefined' && req.body.userId != '') {
                if (req.body.userId) {
                    userId = new mongoose.Types.ObjectId(req.body.userId);

                } else {
                    res.send({ err: 1, message: 'Invalid userId' })
                    return;
                }
            } else {
                res.send({ err: 1, message: 'Invalid userId' });
                return;
            }
            var limit = 10;
            if (req.body.limit) {
                var tmp = parseInt(req.body.limit);
                if (tmp != NaN && tmp > 0) {
                    limit = tmp;
                }
            }
            var skip = 0;
            if (typeof req.body.pageId != 'undefined') {
                if (req.body.pageId) {
                    var tmp = parseInt(req.body.pageId);
                    if (tmp != NaN && tmp > 0) {
                        skip = (tmp * limit) - limit;
                    }
                }
            }
            console.log("Hi this is your codee");
            var condition = { user_id: userId, status: { $eq: 1 } };
            var aggregationdata = [
                { $match: condition },
                {
                    $project: {
                        document: {
                            _id: "$_id",
                            choose_location: "$choose_location",
                            name: "$name",
                            first_name : "$first_name",
                            last_name : "$last_name",
                            phone: "$phone",
                            country: "$country",
                            city: "$city",
                            state: "$state",
                            fulladres: "$fulladres",
                            line1: "$line1",
                            loc: "$loc",
                            status: "$status",
                            street: "$street",
                            user_id: "$user_id",
                            createdAt: "$createdAt",
                            zipcode: "$zipcode",
                            active: "$active",
                            address_value: "$address_value",
                        }

                    }
                },
                { $sort: { "document.createdAt": 1 } },
                { '$skip': skip },
                { '$limit': limit },
                { $group: { _id: null, order_address: { $push: "$document" } } },
            ];
            const addressDetails = await db.GetAggregation('order_address', aggregationdata)
            console.log(addressDetails, 'this is the address details');
            if (typeof addressDetails != 'undefined' && addressDetails.length > 0) {
                if (typeof addressDetails[0].order_address != 'undefined') {
                    res.send({ err: false, message: 'Address Retrieved Successfully', data: addressDetails[0].order_address });
                } else {
                    res.send({ error: true, message: 'Address Retrieved Unsuccessfully', order_address: [] });
                }
            } else {
                res.send({ err: true, message: 'Address Retrieved Unsuccessfully', order_address: [] });
            }
        } catch (error) {

        }
    }

    controller.getCities = async function (req, res) {
        try {
            let data = {}
            data.error = false;
            data.total = "";
            data.data = []
        } catch (error) {

        }
    }

    controller.getAreaByCityId = async function (req, res) {
        try {

        } catch (error) {

        }
    }

    controller.getZipCode = async function (req, res) {
        try {

        } catch (error) {

        }
    }

    controller.isProductDeliverable = async function (req, res) {
        const product_id = req.body.product_id;
        const zipcode = req.body.zipcode;
        try {
            let data = {}
            data.error = false;
            data.message = "Product is deliverable on 00000."
            res.send(data);
        } catch (error) {

        }
    }

    controller.checkCartProductDeliverable = async function (req, res) {
        const address_id = req.body.address_id;
        const user_id = req.body.user_id;
        try {
            let data = {}
            data.error = false;
            data.message = "Product(s) are delivarable";
            data.data = []
        } catch (error) {
        }
    }


    return controller;
}





