//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");
var turf = require('turf');
var country = require('countryjs');
var timezone = require('moment-timezone');
var moment = require("moment");
var mailcontent = require('../../model/mailcontent.js');

module.exports = function (app, io) {

    var router = {};

    router.getusers = function (req, res) {
        db.GetDocument('drivers', {}, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.cityDetails = function (req, res) {
        db.GetDocument('restaurant', {}, {}, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.Restaurantdetails = function (req, res) {
        db.GetDocument('restaurant', {}, {}, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.currentUser = function (req, res) {
        db.GetDocument('drivers', {
            username: req.body.currentUserData
        }, { username: 1, privileges: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.save = function (req, res) {
        var data = {
            activity: {}
        };
        var token = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
        var len = 6;
        var code = '';
        for (var i = 0; i < len; i++) {
            var rnum = Math.floor(Math.random() * token.length);
            code += token.substring(rnum, rnum + 1);
        }
        data.unique_code = code;
        data.username = req.body.username;
        data.main_city = req.body.main_city;
        data.category = req.body.category;
        data.name = req.body.name;
        data.gender = req.body.gender;
        data.about = req.body.about;
        data.phone = req.body.phone;
        //data.vehicle = req.body.vehicle;
        data.com_type = req.body.com_type;
        data.role = req.body.role;
        data.email = req.body.email;
        data.address = req.body.address;
        data.status = req.body.status;
        data.emergency_contact = req.body.emergency_contact;
        data.account_details = req.body.account_details;
        if (req.files) {
            for (var i = 0; i < req.files.length; i++) {
                if (req.files[i].fieldname == 'avatar') {
                    data.avatar = req.files[i].destination + req.files[i].filename;
                }
            }
        }

        if (req.body.password_confirm) {
            data.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(8), null);
        }
        data.unique_commission = {};
        data.unique_commission.admin_commission = req.body.admin_commission || 0;
        data.unique_commission.service_tax = req.body.service_tax || 0;

        var driver_documents = [];
        var expiry_details = req.body.images;
        if (req.body.images) {
            console.log('images===>', req.body.images)
            for (var ex = 0; ex < expiry_details.length; ex++) {
                var doc_name = expiry_details[ex].doc_name;
                var expiry_date = expiry_details[ex].expiry_date;
                var img_name = expiry_details[ex].image;
                if (req.files) {
                    for (var f = 0; f < req.files.length; f++) {
                        console.log("expiry detauls", 'newimage[' + expiry_details[ex]._id + ']')
                        console.log("filed name", req.files[f].fieldname == 'newimage[' + expiry_details[ex]._id + ']')
                        console.log("filed name", req.files[f].fieldname, 'newimage[' + expiry_details[ex]._id + ']')
                        if (req.files[f].fieldname == 'newimage[' + expiry_details[ex]._id + ']') {
                            img_name = req.files[f].destination + req.files[f].filename;
                            console.log('////////////', img_name)
                            break;
                        }
                    }
                }
                console.log('document name/////', doc_name)
                driver_documents.push({ "doc_name": doc_name || '', "image": img_name || '', "expiry_date": expiry_date || '' });
            }
        }
        data.driver_documents = driver_documents;
        if (req.body._id) {
            db.GetOneDocument('drivers', { _id: { $ne: req.body._id }, 'email': req.body.email }, {}, {}, function (emailerr, emailcheck) {
                db.GetOneDocument('drivers', { _id: req.body._id }, {}, {}, function (emailerr, check) {
                    if (emailcheck) {
                        res.status(400).send({ message: "email-ID already exists." });
                    } else {
                        var old_status = check.status;
                        var new_status = check.status;
                        db.GetOneDocument('drivers', { _id: { $ne: req.body._id }, 'phone.code': req.body.phone.code, 'phone.number': req.body.phone.number }, {}, {}, function (phoneerr, phonecheck) {
                            if (phonecheck) {
                                res.status(400).send({ message: "Phone number exists" });
                            } else {
                                data.old_status = old_status;
                                console.log("updatedriver-----------------------", data)
                                db.UpdateDocument('drivers', { _id: req.body._id }, data, {}, function (err, docdata) {
                                    console.log("errdatas", err)
                                    if (err) {
                                        res.send(err);
                                    } else {

                                        if (data.status == 2 || data.status == 0) {
                                            io.of('/chat').emit('AdminRemoveDriver', { driverId: req.body._id, status: data.status });
                                        }
                                        if (old_status == 3 && data.status == 1) {
                                            mailData = {};
                                            mailData.template = 'profileapproved_todriver';
                                            mailData.to = check.email;
                                            mailData.html = [];
                                            mailData.html.push({ name: 'name', value: check.username || "" });
                                            mailcontent.sendmail(mailData, function (err, response) { });
                                        }
                                        res.send(docdata);
                                    }
                                });
                            }
                        });
                    }
                });
            });
        } else {
            db.GetOneDocument('drivers', { $or: [{ email: req.body.email }] }, {}, {}, function (emailerr, emailcheck) {
                if (emailcheck) {
                    res.status(400).send({ message: "email-ID already exists." });
                } else {
                    db.GetOneDocument('drivers', { 'phone.code': req.body.phone.code, 'phone.number': req.body.phone.number }, {}, {}, function (phoneerr, phonecheck) {
                        if (phonecheck) {
                            res.status(400).send({ message: "Phone number exists" });
                        } else {
                            data.activity.created = new Date();
                            //data.status = 1;
                            data.old_status = req.body.status;
                            db.InsertDocument('drivers', data, function (err, result) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    db.GetOneDocument('settings', { alias: 'general' }, {}, {}, function (err, docdata) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            res.send(result);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        };
    }

    router.deletdriverdata = function (req, res) {
        db.GetOneDocument('drivers', { '_id': new mongoose.Types.ObjectId(req.body.data) }, {}, {}, function (err, driverDetails) {
            if (!driverDetails) {
                res.send(err);
            } else {
                var old_status = driverDetails.status;
                db.UpdateDocument('drivers', { '_id': req.body.data }, { 'status': 0, old_status: old_status }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        io.of('/chat').emit('AdminRemoveDriver', { driverId: req.body.data, status: 0 });
                        res.send(data);
                    }
                });
            }
        })
    };

    router.getuserdetails = async function (req, res) {
        const settings= await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        var getQuery = [{
            "$match": { role: 'driver', status: { $in: [2, 3, 1] } }
        },
        {
            $project: {
                email: 1,
                username: 1,
                sort_name: { $toLower: "$username" },
                status: 1,
                createdAt: 1,

                "avatar": {
                    $ifNull: ["$avatar", settings.doc.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT]
                }
            }
        }, {
            $project: {
                document: "$$ROOT"
            }
        },
        {
            $sort: {
                "document.createdAt": -1
            }
        },
        {
            $limit: 10
        },
        {
            $group: { "_id": "_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }

        ];
        const data= await db.GetAggregation('drivers', getQuery)
        if(!data){
            res.send(err);
        }else{
            if (data.length != 0) {
                res.send(data[0].documentData);
            } else {
                res.send([0]);
            }
        }
        // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        //     var getQuery = [{
        //         "$match": { role: 'driver', status: { $in: [2, 3, 1] } }
        //     },
        //     {
        //         $project: {
        //             email: 1,
        //             username: 1,
        //             sort_name: { $toLower: "$username" },
        //             status: 1,
        //             createdAt: 1,

        //             "avatar": {
        //                 $ifNull: ["$avatar", settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT]
        //             }
        //         }
        //     }, {
        //         $project: {
        //             document: "$$ROOT"
        //         }
        //     },
        //     {
        //         $sort: {
        //             "document.createdAt": -1
        //         }
        //     },
        //     {
        //         $limit: 10
        //     },
        //     {
        //         $group: { "_id": "_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        //     }

        //     ];
        //     db.GetAggregation('drivers', getQuery, function (err, data) {
        //         if (err) {
        //             res.send(err);
        //         } else {
        //             if (data.length != 0) {
        //                 res.send(data[0].documentData);
        //             } else {
        //                 res.send([0]);
        //             }
        //         }
        //     });
        // });
    };

    router.getpendinglist = async function (req, res) {
        const shops= await db.GetDocument('drivers', { status: { $eq: 13 } }, {}, {})
        if (shops.status===false) {
            res.send(err);
        } else {
            res.send(shops.doc);
        }
        // db.GetDocument('drivers', { status: { $eq: 13 } }, {}, {}, function (err, shops) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(shops);
        //     }
        // });
    };


    /*router.edit = function (req, res) {
        db.GetDocument('drivers', { _id: req.body.id }, { password: 0 }, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                if (!data[0].avatar) {
                    data[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                }
                res.send(data);

            }
        });
    };
*/

    router.edit = function (req, res) {
        db.GetDocument('drivers', { _id: req.body.id }, { password: 0 }, {}, function (err, data) {
            if (err || !data) {
                res.send(err);
            } else {
                db.GetDocument('documents', { doc_for: 'driver', status: { $eq: 1 } }, {}, {}, function (docerr, docdata) {
                    if (docerr) {
                        res.send(docerr);
                    } else {
                        if (!data[0].avatar) {
                            data[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                        }
                        var results = [];
                        if (data && data != null && typeof data != 'undefined' && data.length > 0 && data[0].driver_documents != null && typeof data[0].driver_documents != 'undefined' && data[0].driver_documents.length > 0) {
                            var driver_array = data[0].driver_documents;
                            var doc_array = docdata;
                            var arr = driver_array.concat(doc_array);

                            var idsSeen = {},
                                idSeenValue = {};
                            for (var i = 0, len = arr.length, id; i < len; ++i) {
                                id = arr[i].doc_name;
                                if (idsSeen[id] !== idSeenValue) {
                                    results.push(arr[i]);
                                    idsSeen[id] = idSeenValue;
                                }
                            }
                        }

                        res.send([data, results]);
                    }
                });

            }
        });
    };


    router.transactionsList = function (req, res) {
        var data = {};
        data.user_id = req.body.id;

        if (req.body.id != '') {
            db.GetOneDocument('walletReacharge', { user_id: req.body.id }, {}, {}, function (userErr, userRespo) {
                if (userRespo) {

                    var usersQuery = [{
                        "$match": { user_id: new mongoose.Types.ObjectId(req.body.id) }
                    },
                    {
                        $project: {
                            'transactions': 1,
                            'user_id': 1,
                            'total': 1
                        }
                    },
                    {
                        $project: {
                            document: "$$ROOT"
                        }
                    },
                    {
                        $group: { "_id": "$user_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                    }
                    ];

                    usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
                    usersQuery.push({ $unwind: { path: "$documentData.transactions", preserveNullAndEmptyArrays: true } });

                    //pagination
                    if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
                        usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });

                    }
                    usersQuery.push({ $group: { "_id": null, "total": { "$sum": "$count" }, "transactions": { $push: "$documentData.transactions" } } });
                    usersQuery.push({ $group: { "_id": null, "count": { "$sum": "$total" }, "documentData": { $push: "$$ROOT" } } });
                    //pagination
                    db.GetAggregation('walletReacharge', usersQuery, function (walletErr, walletRespo) {
                        if (walletErr || walletRespo.length == 0) {
                            res.send({
                                "status": "0",
                                "response": 'Data Not available'
                            });
                        } else {
                            if (walletRespo.length >= 0 && walletRespo[0].documentData[0].transactions) {
                                var total_amount = walletRespo[0].documentData[0].total;
                                var transArr = [];

                                for (var i = 0; i < walletRespo[0].documentData[0].transactions.length; i++) {

                                    var title = '';
                                    var transacData = {};
                                    if (walletRespo[0].documentData[0].transactions[i].type == 'CREDIT') {
                                        if (walletRespo[0].documentData[0].transactions[i].credit_type == 'welcome') {
                                            title = 'Welcome Bonus';
                                        } else if (walletRespo[0].documentData[0].transactions[i].credit_type == 'referral') {
                                            title = 'Referral reward';
                                            if (walletRespo[0].documentData[0].transactions[i].ref_id != null) {
                                                title = 'Wallet Recharge';
                                            }
                                        } else {
                                            title = 'Wallet Recharge';
                                        }
                                    } else if (walletRespo[0].documentData[0].transactions[i].type == 'DEBIT') {
                                        //title = 'Booking for #' + walletRespo[0].documentData[0].transactions[i].ref_id;
                                        title = 'Payment by wallet';
                                    }
                                    transacData.type = walletRespo[0].documentData[0].transactions[i].type || '';
                                    transacData.trans_amount = walletRespo[0].documentData[0].transactions[i].trans_amount || 0;
                                    transacData.title = title;
                                    transacData.trans_date = new Date(walletRespo[0].documentData[0].transactions[i].trans_date);
                                    transacData.balance_amount = walletRespo[0].documentData[0].transactions[i].avail_amount;
                                    transArr.push(transacData);
                                }

                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err || !settings) {
                                        res.send({
                                            "status": 0,
                                            "message": 'Please check the email and try again'
                                        });
                                    } else {
                                        res.send({
                                            "status": "1",
                                            "response": { 'currency': settings.settings.currency_code, 'total_amount': parseInt(total_amount), 'total_transaction': walletRespo[0].documentData[0].transactions.length, 'trans': transArr, 'count': userRespo.transactions.length }
                                        })
                                    }
                                });
                            }
                        }
                    });


                } else {
                    res.send({
                        "status": "0",
                        "message": "Invalid User"
                    });
                }
            });
        }
    };



    router.allUsers = function getusers(req, res) {

        //console.log('req.body', req.body)
        var errors = req.validationErrors();

        var query = {};
        if (req.body.status == 0) {
            query = { $and: [{ status: { $ne: 0 } }, { status: { $ne: 3 } }] };
        } else {
            query = { status: { $eq: req.body.status } };
        }

        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var current_time = Date.now();
        var three_min_section = 45 * 1000;
        var before_twenty_seconds = current_time - three_min_section;
        var usersQuery = [{
            "$match": query
        }, {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                main_city: 1,
                username: 1,
                sort_username: { $toLower: "$username" },
                last_name: 1,
                phone: 1,
                currentStatus: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$last_update_time", ''] }, ''] }, { $ne: [{ "$ifNull": ["$currentStatus", ''] }, ''] }, { $gte: ["$last_update_time", before_twenty_seconds] }, { $gte: ["$currentStatus", 1] }] }, 1, 0] },
                driver_documents: 1,
                tot_req: 1,
                cancelled: 1,
                deliverd: 1,
                avg_delivery: 1,
                avail: 1,
                verified: 1,
                role: 1,
                status: 1,
                email: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1,
                wallet: '$wallet_settings.available'
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];


        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        if (req.body.search) {
            //condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.main_city": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.number": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.code": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.last_name": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('drivers', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All user
                    function (callback) {
                        db.GetCount('drivers', { status: { $ne: 0 } }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    },
                    //Active user
                    function (callback) {
                        db.GetCount('drivers', { status: { $eq: 1 } }, function (err, activeValue) {
                            if (err) return callback(err);
                            count.activeValue = activeValue;
                            callback();
                        });
                    },
                    //Deactive user
                    function (callback) {
                        db.GetCount('drivers', { status: { $eq: 2 } }, function (err, deactivateValue) {
                            if (err) return callback(err);
                            count.deactivateValue = deactivateValue;
                            callback();
                        });
                    },
                    // wallet amount
                    function (callback) {
                        var walletQuery = [{
                            $match: { status: { $ne: 0 } }
                        }, {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: "$wallet_settings.available" },
                                count: { $sum: 1 }
                            }
                        }]
                        db.GetAggregation('drivers', walletQuery, function (err, docdata) {
                            if (err) return callback(err);
                            var totalAmount = 0;
                            if (docdata && docdata.length > 0 && typeof docdata[0].totalAmount != 'undefined') {
                                totalAmount = docdata[0].totalAmount;
                            }
                            count.walletamont = totalAmount;
                            callback();
                        });
                    }

                ], function (err) {

                    if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                        if (docdata.length > 0) {
                            // console.log(docdata[0].documentData);
                            for (i in docdata[0].documentData) {
                                if (typeof docdata[0].documentData[i].last_name != 'undefined') {
                                    docdata[0].documentData[i].name = docdata[0].documentData[i].username + ' ' + docdata[0].documentData[i].last_name;
                                } else {
                                    docdata[0].documentData[i].name = docdata[0].documentData[i].username + '';
                                }
                                if (typeof docdata[0].documentData[i].phone != 'undefined' && docdata[0].documentData[i].phone != null && docdata[0].documentData[i].phone != '') {

                                    if (typeof docdata[0].documentData[i].phone.code != 'undefined') {
                                        docdata[0].documentData[i].phone_no = docdata[0].documentData[i].phone.code + docdata[0].documentData[i].phone.number
                                    } else {
                                        docdata[0].documentData[i].phone_no = docdata[0].documentData[i].phone.number
                                    }
                                } else {
                                    docdata[0].documentData[i].phone_no = '';
                                }

                                /*  if (typeof docdata[0].documentData[i].currentStatus == 'undefined') {
                                     docdata[0].documentData[i].currentStatus = 1;
                                 } */


                            }
                        }

                        res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    }
                });
            }
        });
    };


    router.recentUser = async function recentuser(req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }


        var usersQuery = [{
            "$match": { status: { $ne: 0 }, "role": "driver" }
        }, {
            $project: {
                username: 1,
                role: 1,
                email: 1,
                createdAt: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $sort: {
                createdAt: -1
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.query).length != 0) {
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['username'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                usersQuery.push({ "$match": { "documentData.username": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    usersQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    usersQuery.push({ $sort: sorting });
                }
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                usersQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        const docdata= await db.GetAggregation('drivers', usersQuery)
        if(!docdata || docdata.length > 0){
            res.send([0, 0]);
        }else{
            res.send([docdata[0].documentData, docdata[0].count]);
        }
        // db.GetAggregation('drivers', usersQuery, function (err, docdata) {
        //     if (err && docdata.length > 0) {
        //         res.send([0, 0]);
        //     } else {
        //         res.send([docdata[0].documentData, docdata[0].count]);
        //     }
        // });
    };
    var each = require('sync-each');
    router.delete = function (req, res) {
        req.checkBody('ids', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.GetDocument('drivers', { _id: { $in: req.body.ids } }, {}, {}, function (err, drivers) {
            if (err || !drivers) {
                res.send(err);
            } else {
                if (drivers.length > 0) {
                    each(drivers, function (item, next) {
                        var old_status = item.status;
                        db.UpdateDocument('drivers', { _id: { $in: item._id } }, { status: 0, old_status: old_status }, { multi: true }, function (err, docdata) {
                            if (err) {
                                next(err, docdata);
                            } else {
                                io.of('/chat').emit('AdminRemoveDriver', { driverId: item._id, status: 0 });
                                next(err, docdata);
                            }
                        });
                    }, function (err, transformedItems) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send({ n: 1, nModified: 1, ok: 1 });
                        }
                    });
                }
            }
        });
    };

    router.iddelete = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        db.UpdateDocument('drivers', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.walletAmount = function (req, res) {
        db.GetDocument('walletReacharge', { user_id: req.body.data }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.addaddress = function addaddress(req, res) {
        var address = {
            'fulladress': req.body.data.editaddressdata.fulladres || "",
            'line1': req.body.data.editaddressdata.line1 || "",
            'country': req.body.data.editaddressdata.country || "",
            'street': req.body.data.editaddressdata.street || "",
            'state': req.body.data.editaddressdata.state || "",
            'city': req.body.data.editaddressdata.city || "",
            'landmark': req.body.data.editaddressdata.landmark || "",
            'status': req.body.data.editaddressdata.status || 1,
            'locality': req.body.data.editaddressdata.locality || "",
            'zipcode': req.body.data.editaddressdata.zipcode || "",
            'location': req.body.data.addressList.location || ""
        };
        if (req.body.data.editaddressdata._id) {
            if (req.body.data.addressList.location.lng == '' || req.body.data.addressList.location.lat == '') {
                db.UpdateDocument('drivers', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id }, {
                    "addressList.$.fulladress": req.body.data.editaddressdata.fulladres,
                    "addressList.$.line1": req.body.data.editaddressdata.line1,
                    "addressList.$.country": req.body.data.editaddressdata.country,
                    "addressList.$.street": req.body.data.editaddressdata.street,
                    "addressList.$.city": req.body.data.editaddressdata.city,
                    "addressList.$.landmark": req.body.data.editaddressdata.landmark,
                    "addressList.$.status": req.body.data.editaddressdata.status,
                    "addressList.$.locality": req.body.data.editaddressdata.locality,
                    "addressList.$.zipcode": req.body.data.editaddressdata.zipcode
                }, {}, function (err, docdata) {

                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            } else {
                db.UpdateDocument('drivers', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id }, {
                    "addressList.$.fulladress": req.body.data.editaddressdata.fulladres,
                    "addressList.$.line1": req.body.data.editaddressdata.line1,
                    "addressList.$.country": req.body.data.editaddressdata.country,
                    "addressList.$.street": req.body.data.editaddressdata.street,
                    "addressList.$.city": req.body.data.editaddressdata.city,
                    "addressList.$.landmark": req.body.data.editaddressdata.landmark,
                    "addressList.$.status": req.body.data.editaddressdata.status,
                    "addressList.$.locality": req.body.data.editaddressdata.locality,
                    "addressList.$.zipcode": req.body.data.editaddressdata.zipcode,
                    "addressList.$.location.lat": req.body.data.addressList.location.lat,
                    "addressList.$.location.lng": req.body.data.addressList.location.lng
                }, { multi: true }, function (err, docdata) {

                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        } else {
            db.UpdateDocument('drivers', { _id: req.body.userid }, { "$push": { 'addressList': address } }, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    };

    router.UserAddress = function (req, res) {
        db.GetDocument('drivers', { _id: req.body.id }, { 'addressList': 1 }, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.addressStatus = function (req, res) {
        db.UpdateDocument('drivers', { '_id': req.body.userid, 'addressList.status': 3 }, { "addressList.$.status": 1 }, { multi: true }, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                db.UpdateDocument('drivers', { '_id': req.body.userid, 'addressList._id': req.body.add_id }, { "addressList.$.status": 3 }, {}, function (err, docdata) {

                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });
    };


    router.deleteUserAddress = function (req, res) {
        db.UpdateDocument('drivers', { '_id': req.body.userid }, { $pull: { "addressList": { _id: req.body.add_id } } }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.getdeletedusers = function getdeletedusers(req, res) {
        var errors = req.validationErrors();

        var query = {};
        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var usersQuery = [{
            "$match": { status: { $eq: 0 }, "role": "driver" }
        }, {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                username: { $toLower: "$username" },
                role: 1,
                status: 1,
                email: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];
        var condition = { status: { $eq: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

        db.GetAggregation('drivers', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All Deleted user
                    function (callback) {
                        db.GetCount('drivers', { status: { $eq: 0 } }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    }
                ], function (err) {

                    if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                        res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    }
                });
            }
        });
    };

    router.cityList = function (req, res) {
        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        },
        {
            $project: {
                cityname: 1,
                status: 1,
                createdAt: 1,
                dname: { $toLower: '$' + sorted },
                dna: { $cond: { if: { $eq: [{ $strcasecmp: ['$' + sorted, { $toLower: "$position" }] }, 0] }, then: '$' + sorted, else: { $toLower: '$' + sorted } } }
            }
        },
        {
            $project: {
                cityname: 1,
                document: "$$ROOT"
            }
        },
        {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }
        ];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.body).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                searchs = req.body.search;
                categoryQuery.push({ "$match": { "documentData.cityname": { $regex: searchs + '.*', $options: 'si' } } });
            }
            var sorting = {};
            if (req.body.sort) {
                var sorter = 'documentData.' + req.body.sort.field;
                sorting[sorter] = req.body.sort.order;
                categoryQuery.push({ $sort: sorting });
            } else {
                sorting["documentData.createdAt"] = -1;
                categoryQuery.push({ $sort: sorting });
            }

            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('city', categoryQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length != 0) {
                    res.send([docdata[0].documentData, docdata[0].count]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    }

    router.cityEditdoc = function (req, res) {
        db.GetOneDocument('city', { '_id': req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.docAddoc = function (req, res) {
        var data = {};
        data.status = req.body.status;
        data.doc_for = req.body.doc_for;
        data.doc_name = req.body.doc_name;
        data.expiry_dates = req.body.expiry_dates || 1;
        data.has_require = req.body.has_require;
        data.has_expire = req.body.has_expire;
        //console.log('req.body._id',data)
        if (data.doc_for == 'restaurant') {
            if (req.body._id) {
                db.GetOneDocument('documents', { 'doc_for': 'restaurant', doc_name: data.doc_name, '_id': { $ne: req.body._id }, status: { $in: [1, 2] } }, {}, {}, function (err, editdocexists) {
                    if (editdocexists) {
                        res.status(400).send({ message: "Document already exists" });
                    } else {
                        db.UpdateDocument('documents', { '_id': req.body._id }, data, {}, function (err, docdata) {
                            if (err || docdata.nModified == 0) {
                                res.send(err);
                            } else {
                                res.send(docdata);
                            }
                        });
                    }
                });
            } else {
                db.GetOneDocument('documents', { 'doc_for': 'restaurant', doc_name: data.doc_name, status: { $in: [1, 2] } }, {}, {}, function (err, docexists) {
                    if (docexists) {
                        res.status(400).send({ message: "Document already exists" });
                    } else {
                        db.InsertDocument('documents', data, function (err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send(result);
                            }
                        });
                    }
                });
            }
        } else {
            if (req.body._id) {
                db.GetOneDocument('documents', { '_id': { $ne: req.body._id }, 'doc_for': 'driver', doc_name: data.doc_name, status: { $in: [1, 2] } }, {}, {}, function (err, editdocexists) {
                    //console.log(err, editdocexists)
                    if (editdocexists) {
                        res.status(400).send({ message: "Document already exists" });
                    } else {
                        db.UpdateDocument('documents', { '_id': req.body._id }, data, {}, function (err, docdata) {
                            if (err || docdata.nModified == 0) {
                                res.send(err);
                            } else {
                                res.send(docdata);
                            }
                        });
                    }
                });
            } else {
                db.GetOneDocument('documents', { 'doc_for': 'driver', doc_name: data.doc_name, status: { $in: [1, 2] } }, {}, {}, function (err, docexists) {
                    if (docexists) {
                        res.status(400).send({ message: "Document already exists" });
                    } else {
                        db.InsertDocument('documents', data, function (err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send(result);
                            }
                        });
                    }
                });
            }
        }
    }

    router.getDocList = function (req, res) {
        if (req.body.sort != "" && req.body.sort != undefined) {
            var sorted = req.body.sort.field;
        }

        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                doc_for: { $toLower: "$doc_for" },
                doc_name: { $toLower: "$doc_name" },
                expiry_date: 1,
                has_require: 1,
                has_expire: 1,
                status: 1,
                dname: { $toLower: '$' + sorted },
                dna: { $cond: { if: { $eq: [{ $strcasecmp: ['$' + sorted, { $toLower: "$position" }] }, 0] }, then: '$' + sorted, else: { $toLower: '$' + sorted } } }
            }
        }, {
            $project: {
                doc_name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.body).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                //condition['doc_name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                searchs = req.body.search;
                categoryQuery.push({ "$match": { $or: [{ "documentData.doc_name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.doc_for": { $regex: searchs + '.*', $options: 'si' } }] } });
            }
            /*        if (req.body.sort !== '' && req.body.sort) {
                        sorting = {};
                        if (req.body.status == 'false') {
                            sorting["documentData.dname"] = -1;
                            categoryQuery.push({ $sort: sorting });
                        } else {
                            sorting["documentData.dname"] = 1;
                            categoryQuery.push({ $sort: sorting });
                        }
                    }
        */

            var sorting = {};
            if (req.body.sort) {
                var sorter = 'documentData.' + req.body.sort.field;
                sorting[sorter] = req.body.sort.order;
                categoryQuery.push({ $sort: sorting });
            } else {
                sorting["documentData.createdAt"] = -1;
                categoryQuery.push({ $sort: sorting });
            }


            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('documents', categoryQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length != 0) {
                    res.send([docdata[0].documentData, docdata[0].count]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    }

    router.getEditDocList = function (req, res) {
        db.GetOneDocument('documents', { '_id': req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.docDelete = function (req, res) {
        req.checkBody('ids', 'Invalid ids').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.DeleteDocument('documents', { '_id': req.body.ids }, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data);
            }
        });
    };

    router.dynamic = function (req, res) {
        db.GetDocument('documents', { 'status': { $eq: 1 }, 'doc_for': 'driver' }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.drivercityList = function (req, res) {
        db.GetDocument('city', { 'status': { $eq: 1 } }, { cityname: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('vehicles', { 'status': { $eq: 1 } }, {}, {}, function (err, vehiclesdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send([docdata, vehiclesdata]);
                    }
                });
            }
        });
    }

    router.vehicleAdd = function (req, res) {
        var data = {};
        data.vehicle_name = req.body.vehicle_name;
        data.status = req.body.status;
        if (req.body._id) {
            db.GetOneDocument('vehicles', { '_id': { $ne: req.body._id }, 'vehicle_name': data.vehicle_name, 'status': { $ne: 0 } }, {}, {}, function (err, vehiclesdata) {
                if (vehiclesdata) {
                    res.status(400).send({ message: "Vehicle name exists" });
                } else {
                    db.UpdateDocument('vehicles', { '_id': req.body._id }, { 'vehicle_name': data.vehicle_name, 'status': data.status }, {}, function (err, docdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
                }
            });
        } else {
            db.GetOneDocument('vehicles', { 'vehicle_name': data.vehicle_name, 'status': { $ne: 0 } }, {}, {}, function (err, vehiclesdata) {
                if (vehiclesdata) {
                    res.status(400).send({ message: "Vehicle name exists" });
                } else {
                    db.InsertDocument('vehicles', data, function (err, result) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(result);
                        }
                    });
                }
            });
        }
    }

    router.vehicleGet = function (req, res) {

        if (req.body.sort) {
            if (req.body.sort.field) {
                var sorted = req.body.sort.field;
            }
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                vehicle_name: 1,
                status: 1,
                dname: { $toLower: '$' + sorted },
                dna: { $cond: { if: { $eq: [{ $strcasecmp: ['$' + sorted, { $toLower: "$position" }] }, 0] }, then: '$' + sorted, else: { $toLower: '$' + sorted } } }
            }
        }, {
            $project: {
                doc_name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };
        if (Object.keys(req.body).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                //condition['vehicle_name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                searchs = req.body.search;
                categoryQuery.push({ "$match": { $or: [{ "documentData.vehicle_name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.doc_for": { $regex: searchs + '.*', $options: 'si' } }] } });
            }

            sorting = {};
            if (req.body.sort) {
                sorting["documentData.dname"] = req.body.sort.order;
                categoryQuery.push({ $sort: sorting });
            } else {
                sorting["documentData.dname"] = 1;
                categoryQuery.push({ $sort: sorting });
            }

            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('vehicles', categoryQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length != 0) {
                    res.send([docdata[0].documentData, docdata[0].count]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    }

    router.vehicleEdit = function (req, res) {
        db.GetOneDocument('vehicles', { '_id': req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.driversDashboard = function (req, res) {
        //drivers in top rating
        var query = { status: { '$ne': 0 } };
        var data = {};
        data.sortby = 'avg_ratings';
        data.orderby = parseInt(req.body.orderby) || -1;
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        data.perPage = 5;

        db.GetAggregation('drivers', [
            { $match: query },
            { "$sort": sorting },
            { "$limit": data.perPage },
            {
                $project: {
                    username: 1,
                    deliverd: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            },
        ], function (err, topratingList) {
            if (err) {
                res.send(err)
            } else {

                //drivers in loeast rating
                var query = { status: { '$ne': 0 } };
                var data = {};
                data.sortby = 'avg_ratings';
                data.orderby = parseInt(req.body.orderby) || 1;
                var sorting = {};
                sorting[data.sortby] = data.orderby;

                data.perPage = 5;

                db.GetAggregation('drivers', [
                    { $match: query },
                    { "$sort": sorting },
                    { "$limit": data.perPage },
                    {
                        $project: {
                            username: 1,
                            deliverd: 1,
                            avg_ratings: 1,
                            phone: 1,
                            email: 1
                        }
                    },
                ], function (err, LowestratingList) {
                    if (err) {
                        res.send(err)
                    } else {

                        //drivers in top delivery
                        var query = { status: { '$ne': 0 } };
                        var data = {};
                        data.sortby = 'deliverd';
                        data.orderby = parseInt(req.body.orderby) || -1;
                        var sorting = {};
                        sorting[data.sortby] = data.orderby;

                        data.perPage = 5;

                        db.GetAggregation('drivers', [
                            { $match: query },
                            { "$sort": sorting },
                            { "$limit": data.perPage },
                            {
                                $project: {
                                    username: 1,
                                    deliverd: 1,
                                    avg_ratings: 1,
                                    phone: 1,
                                    email: 1
                                }
                            },
                        ], function (err, topDeliList) {
                            if (err) {
                                res.send(err)
                            } else {

                                // driver graphical representation

                                db.GetDocument('drivers', { 'status': { $ne: 0 } }, {}, {}, function (err, driversdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var count = {};
                                        async.parallel([
                                            //new drivers
                                            function (callback) {
                                                db.GetCount('drivers', { status: { $eq: 3 } }, function (err, newdriver) {
                                                    if (err) return callback(err);
                                                    count.newdriver = newdriver;
                                                    callback();
                                                });
                                            },
                                            //Active drivers
                                            function (callback) {
                                                db.GetCount('drivers', { status: { $eq: 1 } }, function (err, active) {
                                                    if (err) return callback(err);
                                                    count.active = active;
                                                    callback();
                                                });
                                            },
                                            //Deactive drivers
                                            function (callback) {
                                                db.GetCount('drivers', { status: { $eq: 2 } }, function (err, inactivate) {
                                                    if (err) return callback(err);
                                                    count.inactivate = inactivate;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //disable drivers
                                                db.GetCount('drivers', { status: { $eq: 4 } }, function (err, disable) {
                                                    if (err) return callback(err);
                                                    count.disable = disable;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //deleted drivers
                                                db.GetCount('drivers', { status: { $eq: 0 } }, function (err, deleted) {
                                                    if (err) return callback(err);
                                                    count.deleted = deleted;
                                                    callback();
                                                });
                                            }
                                        ], function (err) {
                                            if (err) return next(err);
                                            var totalCount = count;
                                            if (err || totalCount.length <= 0) {
                                                res.send([0, 0]);
                                            } else {
                                                res.send([topratingList, LowestratingList, topDeliList, totalCount]);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    router.vehicleDelete = function (req, res) {

        req.checkBody('ids', 'Invalid ids').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.DeleteDocument('vehicles', { _id: { $in: req.body.ids } }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.addCity = function (req, res) {
        var corner = req.body.corners;
        var data = {};
        data.cityname = req.body.data.cityname;
        data.address = req.body.data.address;
        data.slug = req.body.data.slug;
        data.status = req.body.data.status;
        data.tax = req.body.data.tax;
        data.featured = req.body.data.featured;
        var poly_corner = [corner];
        var polytest = {};
        polytest.type = 'Polygon';
        polytest.coordinates = poly_corner;
        data.avatarBase64 = req.body.Base64;

        var updateData = { 'slug': data.slug, 'status': data.status, 'address': data.address, 'cityname': data.cityname, featured: data.featured, 'tax': data.tax };
        // if (data.avatarBase64) {
        //     var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        //     var fileName = Date.now().toString() + '.png';
        //     var file = CONFIG.DIRECTORY_OTHERS + fileName;
        //     library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
        //     data.image = attachment.get_attachment(CONFIG.DIRECTORY_OTHERS, fileName);
        //     updateData.image = attachment.get_attachment(CONFIG.DIRECTORY_OTHERS, fileName);
        // }

        var locations = {};
        locations.lng = req.body.lng || '';
        locations.lat = req.body.lat || '';
        if (req.body.lng && req.body.lat) {
            updateData.location = locations
        }
        data.location = locations;
        if (req.body.data._id) {
            var pipeline = [{
                $match: {
                    poly_test: {
                        $geoIntersects: {
                            $geometry: {
                                type: "Polygon",
                                coordinates: poly_corner,
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    _id: { $ne: new mongoose.Types.ObjectId(req.body.data._id) }
                }
            },
            { $project: { 'cityname': 1 } }
            ];
            db.GetAggregation('city', pipeline, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    if (docdata.length != 0) {
                        res.status(400).send({ message: "City already exists" });
                    } else {
                        var cityname = data.cityname;
                        db.GetOneDocument('city', { '_id': { $ne: req.body.data._id }, cityname: cityname }, {}, {}, function (err, cityDetails) {
                            if (err) {
                                res.status(400).send({ message: "City already exists" });
                            } else {
                                if (cityDetails && typeof cityDetails._id != 'undefined') {
                                    res.status(400).send({ message: "City already exists" });
                                } else {
                                    db.UpdateDocument('city', { '_id': req.body.data._id }, updateData, {}, function (err, docdata) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            db.UpdateDocument('city', { '_id': req.body.data._id }, { 'poly_test.coordinates': poly_corner }, {}, function (err, polydoc) {
                                                if (err) {
                                                    res.send(err);
                                                } else {
                                                    db.UpdateDocument('restaurant', { 'city_id': req.body.data._id }, { 'main_city': req.body.data.cityname }, { multi: true }, function (err, restaurantres) { });
                                                    res.send(polydoc);
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        })
                    }
                }
            })
        } else {
            var pipeline = [{
                $match: {
                    poly_test: {
                        $geoIntersects: {
                            $geometry: {
                                type: "Polygon",
                                coordinates: poly_corner,
                            }
                        }
                    }
                }
            },
            { $project: { 'cityname': 1 } }
            ];

            db.GetAggregation('city', pipeline, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    if (docdata.length != 0) {
                        res.status(400).send({ message: "City already exists" });
                    } else {
                        // data.admin_commission = req.body.data.admin_commission;
                        // data.driver_fare = {};
                        // data.driver_fare.baseprice = req.body.data.driver_fare.baseprice;
                        // data.driver_fare.extra_price = req.body.data.driver_fare.extra_price;
                        // data.driver_fare.format = req.body.data.driver_fare.format || 'km';
                        // data.driver_fare.minimum_distance = req.body.data.driver_fare.minimum_distance || 'km';


                        // data.delivery_charge = {};
                        // data.delivery_charge.default_amt = req.body.data.delivery_charge.default_amt;
                        // data.delivery_charge.target_amount = req.body.data.delivery_charge.target_amount;


                        // data.reject_fare = {};
                        // if (req.body.data.reject_fare) {
                        //     data.reject_fare.status = req.body.data.reject_fare.status || '0';
                        //     data.reject_fare.amount = req.body.data.reject_fare.amount;
                        // }
                        var nit_time_check = 0;
                        var sourage_time_check = 0;

                        data.night_fare_settings = {};
                        // if (req.body.data.night_fare_settings) {
                        //     data.night_fare_settings.status = req.body.data.night_fare_settings.status || '0';
                        //     data.night_fare_settings.amount = req.body.data.night_fare_settings.amount || '';
                        //     data.night_fare_settings.driver_share = req.body.data.night_fare_settings.driver_share || '';
                        //     data.night_fare_settings.start_time = req.body.data.night_fare_settings.start_time || '';
                        //     data.night_fare_settings.end_time = req.body.data.night_fare_settings.end_time || '';
                        //     if (req.body.data.night_fare_settings.status == 'true' || req.body.data.night_fare_settings.status == true || req.body.data.night_fare_settings.status == 1 || req.body.data.night_fare_settings.status == '1') {
                        //         var start = new Date();
                        //         var end = new Date();
                        //         if (req.body.data.night_fare_settings.start_time && req.body.data.night_fare_settings.start_time != undefined) {
                        //             start = req.body.data.night_fare_settings.start_time;
                        //         };
                        //         if (req.body.data.night_fare_settings.end_time && req.body.data.night_fare_settings.end_time != undefined) {
                        //             end = req.body.data.night_fare_settings.end_time;
                        //         };
                        //         var start_time = new Date(start);
                        //         var end_time = new Date(end);

                        //         var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                        //         var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                        //         if (start_time_seconds > end_time_seconds || start_time_seconds == end_time_seconds) {
                        //             nit_time_check = 1;
                        //         }
                        //     }
                        // }
                        data.extra_fare_settings = {};
                        // if (req.body.data.extra_fare_settings) {
                        //     data.extra_fare_settings.status = req.body.data.extra_fare_settings.status || '0';
                        //     data.extra_fare_settings.amount = req.body.data.extra_fare_settings.amount || '';
                        //     data.extra_fare_settings.driver_share = req.body.data.extra_fare_settings.driver_share || '';
                        //     data.extra_fare_settings.start_time = req.body.data.extra_fare_settings.start_time || '';
                        //     data.extra_fare_settings.end_time = req.body.data.extra_fare_settings.end_time || '';

                        //     if (req.body.data.extra_fare_settings.status == 'true' || req.body.data.extra_fare_settings.status == true || req.body.data.extra_fare_settings.status == 1 || req.body.data.extra_fare_settings.status == '1') {
                        //         var start = new Date();
                        //         var end = new Date();
                        //         if (req.body.data.extra_fare_settings.start_time && req.body.data.extra_fare_settings.start_time != undefined) {
                        //             start = req.body.data.extra_fare_settings.start_time;
                        //         };
                        //         if (req.body.data.extra_fare_settings.end_time && req.body.data.extra_fare_settings.end_time != undefined) {
                        //             end = req.body.data.extra_fare_settings.end_time;
                        //         };

                        //         var start_time = new Date(start);
                        //         var end_time = new Date(end);

                        //         var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
                        //         var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
                        //         if (start_time_seconds > end_time_seconds || start_time_seconds == end_time_seconds) {
                        //             sourage_time_check = 1;
                        //         }
                        //     }
                        // }

                        if (nit_time_check == 1) {
                            res.status(400).send({ message: "Sorry Invalid Night Fare time" });
                        } else if (sourage_time_check == 1) {
                            res.status(400).send({ message: "Sorry Invalid Surge Fare time" });
                        } else {
                            var cityname = data.cityname;
                            db.GetOneDocument('city', { cityname: cityname }, {}, {}, function (err, cityDetails) {
                                if (err) {
                                    res.status(400).send({ message: "City already exists" });
                                } else {
                                    if (cityDetails && typeof cityDetails._id != 'undefined') {
                                        res.status(400).send({ message: "City already exists" });
                                    } else {
                                        db.InsertDocument('city', data, function (err, result) {
                                            if (err || result.nModified == 0) {
                                                res.send(err);
                                            } else {
                                                db.UpdateDocument('city', { '_id': result._id }, { 'poly_test': polytest }, {}, function (err, docdata) {
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        res.send(docdata);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            })
                        }
                    }
                }
            });
        }
    }


    router.cityAddfare = function (req, res) {

        var data = {};
        data.cityname = req.body.cityname;
        //data.admin_commission = req.body.data.admin_commission;

        //data.driver_fare = {};
        //data.driver_fare.baseprice = req.body.data.driver_fare.baseprice;
        //data.driver_fare.extra_price = req.body.data.driver_fare.extra_price;
        //data.driver_fare.format = req.body.data.driver_fare.format || 'km';
        //data.driver_fare.minimum_distance = req.body.data.driver_fare.minimum_distance || 'km';

        data.minimum_distance = req.body.minimum_distance;
        data.format = req.body.format;
        data.extra_price = req.body.extra_price;
        data.delivery_charge = {};
        data.delivery_charge.default_amt = req.body.default_amt;
        data.delivery_charge.target_amount = req.body.target_amount;
        //data.delivery_charge.percentage_amt = req.body.data.delivery_charge.percentage_amt;


        // data.reject_fare = {};
        // if (req.body.data.reject_fare) {
        //     data.reject_fare.status = req.body.data.reject_fare.status || '0';
        //     data.reject_fare.amount = req.body.data.reject_fare.amount;
        // }


        /*data.fare_settings = {};
        data.fare_settings.baseprice = req.body.data.fare_settings.baseprice;
 
        data.fare_settings.delivery_charge = {};
        data.fare_settings.delivery_charge.extra_amount = req.body.data.fare_settings.delivery_charge.extra_amount;
        data.fare_settings.delivery_charge.min_amount = req.body.data.fare_settings.delivery_charge.min_amount;
        data.fare_settings.delivery_charge.min_distance = req.body.data.fare_settings.delivery_charge.min_distance;
        data.fare_settings.delivery_charge.format = req.body.data.fare_settings.delivery_charge.format;*/
        // var nit_time_check = 0;
        // var sourage_time_check = 0;

        // data.night_fare_settings = {};
        // if (req.body.data.night_fare_settings) {
        //     data.night_fare_settings.status = req.body.data.night_fare_settings.status || '0';
        //     data.night_fare_settings.amount = req.body.data.night_fare_settings.amount || '';
        //     data.night_fare_settings.driver_share = req.body.data.night_fare_settings.driver_share || '';
        //     data.night_fare_settings.start_time = req.body.data.night_fare_settings.start_time || '';
        //     data.night_fare_settings.end_time = req.body.data.night_fare_settings.end_time || '';


        //     if (req.body.data.night_fare_settings.status == 'true' || req.body.data.night_fare_settings.status == true || req.body.data.night_fare_settings.status == 1 || req.body.data.night_fare_settings.status == '1') {

        //         var start = new Date();
        //         var end = new Date();
        //         if (req.body.data.night_fare_settings.start_time && req.body.data.night_fare_settings.start_time != undefined) {
        //             start = req.body.data.night_fare_settings.start_time;
        //         };
        //         if (req.body.data.night_fare_settings.end_time && req.body.data.night_fare_settings.end_time != undefined) {
        //             end = req.body.data.night_fare_settings.end_time;
        //         };

        //         var start_time = new Date(start);
        //         var end_time = new Date(end);

        //         var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
        //         var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
        //         if (start_time_seconds > end_time_seconds || start_time_seconds == end_time_seconds) {
        //             nit_time_check = 1;
        //         }
        //     }

        // }

        // data.extra_fare_settings = {};
        // if (req.body.data.extra_fare_settings) {
        //     data.extra_fare_settings.status = req.body.data.extra_fare_settings.status || '0';
        //     data.extra_fare_settings.amount = req.body.data.extra_fare_settings.amount || '';
        //     data.extra_fare_settings.driver_share = req.body.data.extra_fare_settings.driver_share || '';
        //     data.extra_fare_settings.start_time = req.body.data.extra_fare_settings.start_time || '';
        //     data.extra_fare_settings.end_time = req.body.data.extra_fare_settings.end_time || '';

        //     if (req.body.data.extra_fare_settings.status == 'true' || req.body.data.extra_fare_settings.status == true || req.body.data.extra_fare_settings.status == 1 || req.body.data.extra_fare_settings.status == '1') {
        //         var start = new Date();
        //         var end = new Date();
        //         if (req.body.data.extra_fare_settings.start_time && req.body.data.extra_fare_settings.start_time != undefined) {
        //             start = req.body.data.extra_fare_settings.start_time;
        //         };
        //         if (req.body.data.extra_fare_settings.end_time && req.body.data.extra_fare_settings.end_time != undefined) {
        //             end = req.body.data.extra_fare_settings.end_time;
        //         };

        //         var start_time = new Date(start);
        //         var end_time = new Date(end);

        //         var start_time_seconds = (start_time.getHours() * 60 * 60) + (start_time.getMinutes() * 60) + start_time.getSeconds();
        //         var end_time_seconds = (end_time.getHours() * 60 * 60) + (end_time.getMinutes() * 60) + end_time.getSeconds();
        //         if (start_time_seconds > end_time_seconds || start_time_seconds == end_time_seconds) {
        //             sourage_time_check = 1;
        //         }
        //     }
        // }

        // if (nit_time_check == 1) {
        //     res.status(400).send({ status: 0, message: "Sorry Invalid Night Fare time" });
        // } else if (sourage_time_check == 1) {
        //     res.status(400).send({ status: 0, message: "Sorry Invalid Surge Fare time" });
        // } else {
        console.log("city fare data", data)
        db.UpdateDocument('city', { '_id': req.body._id }, data, {}, function (err, docdata) {
            if (err) {
                res.send({ status: 0, message: err.message });
            } else {
                res.send({ status: 1, message: "city fare details updated.", result: docdata });
            }
        });
        // }
    }

    router.cityEditfaredoc = function (req, res) {
        db.GetOneDocument('city', { '_id': req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata) {
                    res.send([docdata]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    }


    /* router.Addcityarea = function (req, res) {
 
 
         var corner = req.body.corners;
         var data = {};
         data.id = req.body.id;
 
         var area_management = { area_poly: {} };
         area_management.area_name = req.body.data.area_name;
         area_management.address = req.body.data.address;
         area_management.status = req.body.data.status;
 
         var poly_corner = [corner];
         area_management.area_poly.type = 'Polygon';
         area_management.area_poly.coordinates = poly_corner;
 
         data.avatarBase64 = req.body.avatarBase64;
         if (data.avatarBase64) {
             var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
             var fileName = Date.now().toString() + '.png';
             var file = CONFIG.DIRECTORY_USERS + fileName;
             library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
             area_management.avatar = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
         }
 
         db.GetOneDocument('city', { '_id': data.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
             if (err) {
                 res.send(err);
             } else {
 
                 var parentCoordinates = docdata.poly_test.coordinates[0];
                 var childCoordinates = corner;
 
                 var parentPolygon = turf.polygon([parentCoordinates]);
                 var inside = true;
                 childCoordinates.forEach(function (coordinates) {
                     point = turf.point(coordinates);
                     if (!turf.inside(point, parentPolygon)) {
                         inside = false;
                     }
                 });
 
                 if (inside == true) {
                     var query = {
                         'area_management.area_poly': {
                             $geoIntersects: {
                                 $geometry: {
                                     type: "Polygon",
                                     coordinates: poly_corner,
                                 }
                             }
                         }
                     };
 
                     var pipeline = [
                         {
                             $match: query
                         },
                         { $project: { 'cityname': 1 } }
                     ];
 
                     db.GetAggregation('city', pipeline, function (err, docdata) {
                         if (err) {
                             res.send(err);
                         }
                         else {
                             if (docdata.length != 0) {
                                 res.status(400).send({ message: "Area Already Exists" });
                             }
                             else {
                                 db.UpdateDocument('city', { '_id': data.id }, { $push: { "area_management": area_management } }, {}, function (err, docdata) {
                                     if (err) {
                                         res.send(err);
                                     }
                                     else {
                                         res.send(docdata);
                                     }
                                 });
                             }
                         }
                     });
                 }
                 else {
                     res.status(400).send({ message: "Your Region being out of " + docdata.cityname + " city" });
                 }
             }
         });
     }
 */

    router.Addcityarea = function (req, res) {
        var corner = req.body.corners;
        var data = {};
        data.id = req.body.id;

        var area_management = { area_poly: {} };
        area_management.area_name = req.body.data.area_name;
        area_management.address = req.body.data.address;
        area_management.status = req.body.data.status;

        var poly_corner = [corner];
        area_management.area_poly.type = 'Polygon';
        area_management.area_poly.coordinates = poly_corner;

        data.avatarBase64 = req.body.avatarBase64;
        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_USERS + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            area_management.avatar = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
        }
        //console.log('welcome')
        db.GetOneDocument('city', { '_id': data.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                console.log('welcome', docdata._id)
                if (docdata && typeof docdata._id != 'undefined') {
                    var area_management_arr = docdata.area_management;
                    if (typeof area_management_arr == 'undefined' || area_management_arr == null) {
                        area_management_arr = []
                    }
                    var index_pos = area_management_arr.map(function (e) { return e._id.toString(); }).indexOf(req.body.id.toString());
                    if (index_pos != -1) {
                        area_management_arr.splice(index_pos, 1);
                    }
                    var index_pos = area_management_arr.map(function (e) { return e.area_name.toString(); }).indexOf(req.body.data.area_name);
                    console.log('index_pos', index_pos)
                    if (index_pos == -1) {
                        var parentCoordinates = docdata.poly_test.coordinates[0];
                        var childCoordinates = corner;
                        var parentPolygon = turf.polygon([parentCoordinates]);
                        var inside = true;
                        childCoordinates.forEach(function (coordinates) {
                            point = turf.point(coordinates);
                            if (!turf.inside(point, parentPolygon)) {
                                inside = false;
                            }
                        });
                        console.log('inside', inside)
                        if (inside == true) {
                            var query = {
                                'area_management.area_poly': {
                                    $geoIntersects: {
                                        $geometry: {
                                            type: "Polygon",
                                            coordinates: poly_corner,
                                        }
                                    }
                                }
                            };

                            var pipeline = [{
                                $match: query
                            },
                            { $project: { 'cityname': 1 } }
                            ];

                            db.GetAggregation('city', pipeline, function (err, docdata) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    /*  if (docdata.length != 0) {
                                          res.status(400).send({ message: "Area Already Exists" });
                                      }
                                      else {*/
                                    db.UpdateDocument('city', { '_id': data.id }, { $push: { "area_management": area_management } }, {}, function (err, docdata) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            res.send(docdata);
                                        }
                                    });
                                    // }
                                }
                            });
                        } else {
                            res.status(400).send({ message: "Your Region being out of " + docdata.cityname + " city" });
                        }
                    } else {
                        res.status(400).send({ message: "Area Already Exists" });
                    }
                } else {
                    res.status(400).send({ message: "City Not Found" });
                }
            }
        });
    }

    router.Warehouse = function (req, res) {
        var data = {};
        data.id = req.body.id;

        var warehouse = {};
        warehouse.line1 = req.body.data.line1;
        warehouse.fulladres = req.body.data.fulladres;
        warehouse.zipcode = req.body.data.zipcode;
        warehouse.lat = req.body.data.lat;
        warehouse.lng = req.body.data.lng;
        warehouse.city = req.body.data.city;
        warehouse.state = req.body.data.state;
        warehouse.country = req.body.data.country;


        //console.log('welcome')
        db.GetOneDocument('city', { '_id': data.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                //console.log('welcome', docdata._id)
                if (docdata && typeof docdata._id != 'undefined') {
                    //var area_management_arr = docdata.area_management;

                    var inside = true;

                    if (inside == true) {

                        db.UpdateDocument('city', { '_id': data.id }, { "warehouse": warehouse }, {}, function (err, docdata) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send(docdata);
                            }
                        });
                    } else {
                        res.status(400).send({ message: "Your Region being out of " + docdata.cityname + " city" });
                    }

                } else {
                    res.status(400).send({ message: "City Not Found" });
                }
            }
        });
    }

    router.cityAreaList = function (req, res) {

        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }

        var categoryQuery = [{
            "$match": { '_id': new mongoose.Types.ObjectId(req.body.id), status: { $ne: 0 } }
        }, {
            $project: {
                area_management: 1,
                area_name: 1,
                //area_name: "$area_management.area_name",
                dname: { $toLower: '$' + sorted },
                dna: { $cond: { if: { $eq: [{ $strcasecmp: ['$' + sorted, { $toLower: "$position" }] }, 0] }, then: '$' + sorted, else: { $toLower: '$' + sorted } } },
                count: { "$size": "$area_management" }
            }
        }, {
            $project: {
                area_management: 1,
                area_name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$first": "$document.count" }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };
        if (Object.keys(req.body).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                categoryQuery.push({ $unwind: { path: "$documentData.area_management", preserveNullAndEmptyArrays: true } });
                // condition['imagefor'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                //condition['area_name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                searchs = req.body.search;
                // categoryQuery.push({ "$match": { "documentData.imagefor": { $regex: searchs + '.*', $options: 'si' } } });
                categoryQuery.push({ "$match": { "documentData.area_management.area_name": { $regex: searchs + '.*', $options: 'si' } } });
            }

            if (req.body.sort !== '' && req.body.sort) {
                sorting = {};
                if (req.body.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    categoryQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    categoryQuery.push({ $sort: sorting });
                }
            }

            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('city', categoryQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {

                if (req.body.search == undefined) {
                    res.send([docdata[0].documentData[0].area_management, docdata[0].count]);

                } else if (req.body.search != undefined) {

                    if (req.body.search.length == 0) {
                        res.send([docdata[0].documentData[0].area_management, docdata[0].count]);
                    } else {
                        if (docdata[0]) {
                            res.send([
                                [docdata[0].documentData[0].area_management], docdata[0].count
                            ]);
                        } else {
                            res.send([0, 0]);
                        }

                    }
                } else {
                    res.send([0, 0]);
                }
            }
        });
    }

    router.getCityAreaEditdoc = function (req, res) {
        db.GetOneDocument('city', { 'area_management._id': req.body.id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var test = docdata.area_management;
                var final = [];
                for (var i = 0; i < test.length; i++) {
                    if (test[i]._id == req.body.id) {
                        final = [test[i]];
                    }
                }
                final[0].avatar = docdata._id;
                res.send(final);
            }
        });
    }



    router.EditCityArea = function (req, res) {
        var data = {};
        var area_poly = {};
        var corvalues = [req.body.corners];
        area_poly.coordinates = corvalues;
        area_poly.type = 'Polygon';

        data.avatarBase64 = req.body.avatarBase64;
        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_USERS + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            var newavatar = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
        }
        var final_avatar = req.body.data.avatar;
        if (newavatar) {
            final_avatar = newavatar;
        }
        var schemavalues = {
            'area_management.$.area_name': req.body.data.area_name,
            'area_management.$.address': req.body.data.address,
            'area_management.$.status': req.body.data.status,
            'area_management.$.avatar': final_avatar,
            'area_management.$.area_poly': area_poly
        }

        db.GetOneDocument('city', { 'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.id) } }, 'status': { $ne: 0 } }, {}, {}, function (err, getdata) {
            if (err) {
                res.send(err)
            } else {
                console.log('getdata')
                if (getdata && typeof getdata._id != 'undefined') {
                    var area_management_arr = getdata.area_management;
                    if (typeof area_management_arr == 'undefined' || area_management_arr == null) {
                        area_management_arr = []
                    }
                    var index_pos = area_management_arr.map(function (e) { return e._id.toString(); }).indexOf(req.body.id.toString());
                    if (index_pos != -1) {
                        area_management_arr.splice(index_pos, 1);
                    }
                    console.log('req.body.data.area_name', req.body.data.area_name)
                    var index_pos = area_management_arr.map(function (e) { return e.area_name.toString(); }).indexOf(req.body.data.area_name);
                    console.log('index_pos', index_pos)
                    if (index_pos == -1) {
                        var parentCoordinates = getdata.poly_test.coordinates[0];
                        var childCoordinates = req.body.corners;

                        var parentPolygon = turf.polygon([parentCoordinates]);
                        var inside = true;
                        childCoordinates.forEach(function (coordinates) {
                            point = turf.point(coordinates);
                            if (!turf.inside(point, parentPolygon)) {
                                inside = false;
                            }
                        });
                        console.log('inside', inside)
                        if (inside == true) {
                            var query = {
                                'status': { "$ne": 0 },
                                'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.id) } },
                            };

                            var rrrr = [
                                { $match: query },
                                { $unwind: "$area_management" },
                                {
                                    $project: {
                                        _id: 1,
                                        area_management: 1,
                                        test: {
                                            $cond: { if: { $eq: ["$area_management._id", new mongoose.Types.ObjectId(req.body.id)] }, then: 1, else: 0 }
                                        }
                                    }
                                },
                                { $match: { "test": 0 } },
                                {
                                    "$group": {
                                        "_id": "$_id",
                                        "area_management": { "$addToSet": "$area_management" },
                                    }
                                },
                                {
                                    $match: {
                                        'area_management.area_poly': {
                                            $geoIntersects: {
                                                $geometry: {
                                                    type: "Polygon",
                                                    coordinates: corvalues,
                                                }
                                            }
                                        }
                                    }
                                }
                            ];
                            db.GetAggregation('city', rrrr, function (err, docdata) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    /*if (docdata.length != 0) {
                                        res.status(400).send({ message: "Area Already Exists" });
                                    }
                                    else {*/
                                    db.UpdateDocument('city', { 'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.id) } } }, schemavalues, { multi: true }, function (err, updatedocdata) {
                                        if (err) {
                                            res.send(err)
                                        } else {
                                            db.UpdateDocument('restaurant', { 'sub_city_id': new mongoose.Types.ObjectId(req.body.id) }, { 'sub_city': req.body.data.area_name }, { multi: true }, function (err, restaurantres) { });
                                            res.send(updatedocdata);
                                        }
                                    });
                                    //}
                                }
                            });
                        } else {
                            res.status(400).send({ message: "Your Region being out of " + getdata.cityname + " city" });
                        }
                    } else {
                        res.status(400).send({ message: "Area Already Exists" });
                    }
                } else {
                    res.status(400).send({ message: "Record Not Found" });
                }
            }
        });
    }

    /*
    
      router.EditCityArea = function (req, res) {
    
            var data = {};
            var area_poly = {};
            var corvalues = [req.body.corners];
            area_poly.coordinates = corvalues;
            area_poly.type = 'Polygon';
    
            data.avatarBase64 = req.body.avatarBase64;
            if (data.avatarBase64) {
                var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                var fileName = Date.now().toString() + '.png';
                var file = CONFIG.DIRECTORY_USERS + fileName;
                library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
                var newavatar = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
            }
            var final_avatar = req.body.data.avatar;
            if (newavatar) {
                final_avatar = newavatar;
            }
    
            var schemavalues = {
                'area_management.$.area_name': req.body.data.area_name,
                'area_management.$.address': req.body.data.address,
                'area_management.$.status': req.body.data.status,
                'area_management.$.avatar': final_avatar,
                'area_management.$.area_poly': area_poly
            }
    
            db.GetOneDocument('city', { 'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.id) } }, 'status': { $ne: 0 } }, {}, {}, function (err, getdata) {
                if (err) {
                    res.send(err)
                }
                else {
                    var parentCoordinates = getdata.poly_test.coordinates[0];
                    var childCoordinates = req.body.corners;
    
                    var parentPolygon = turf.polygon([parentCoordinates]);
                    var inside = true;
                    childCoordinates.forEach(function (coordinates) {
                        point = turf.point(coordinates);
                        if (!turf.inside(point, parentPolygon)) {
                            inside = false;
                        }
                    });
    
                    if (inside == true) {
                        var query = {
                            'status': { "$ne": 0 },
                            'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.id) } },
                        };
    
                        var rrrr = [
                            { $match: query },
                            { $unwind: "$area_management" },
                            {
                                $project: {
                                    _id: 1,
                                    area_management: 1,
                                    test: {
                                        $cond: { if: { $eq: ["$area_management._id", new mongoose.Types.ObjectId(req.body.id)] }, then: 1, else: 0 }
                                    }
                                }
                            },
                            { $match: { "test": 0 } },
                            {
                                "$group": {
                                    "_id": "$_id",
                                    "area_management": { "$addToSet": "$area_management" },
                                }
                            },
                            {
                                $match: {
                                    'area_management.area_poly': {
                                        $geoIntersects: {
                                            $geometry: {
                                                type: "Polygon",
                                                coordinates: corvalues,
                                            }
                                        }
                                    }
                                }
                            }
                        ];
                        db.GetAggregation('city', rrrr, function (err, docdata) {
                            if (err) {
                                res.send(err);
                            }
                            else {
                                if (docdata.length != 0) {
                                    res.status(400).send({ message: "Area Already Exists" });
                                }
                                else {
                                    db.UpdateDocument('city', { 'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.id) } } }, schemavalues, { multi: true }, function (err, updatedocdata) {
                                        if (err) {
                                            res.send(err)
                                        } else {
                                            res.send(updatedocdata);
                                        }
                                    });
                                }
                            }
                        });
                    }
                    else {
                        res.status(400).send({ message: "Your Region being out of " + getdata.cityname + " city" });
                    }
                }
            });
        }
    
    */


    router.DeleteCity = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('city', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }


    router.DeleteArea = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('city', { 'area_management': { $elemMatch: { '_id': new mongoose.Types.ObjectId(req.body.delData) } } }, { $unset: { 'area_management': 1 } }, { multi: true }, function (err, updatedocdata) {
            if (err) {
                res.send(err)
            } else {
                res.send(updatedocdata);
            }
        });
    }

    router.getDrivers = function (req, res) {
        //drivers in top rating
        if (req.body.sub_city && req.body.main_city) {

            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }] }
        } else if (!req.body.sub_city && req.body.main_city) {

            var query = { main_city: req.body.main_city };
        }
        var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
        var data = {};
        data.sortby = 'avg_ratings';
        data.orderby = parseInt(req.body.orderby) || -1;
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        data.perPage = 5;

        db.GetAggregation('drivers', [
            { $match: query },
            { "$sort": sorting },
            { "$limit": data.perPage },
            {
                $project: {
                    username: 1,
                    deliverd: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            },
        ], function (err, topratingList) {
            if (err) {
                res.send(err)
            } else {

                //drivers in loeast rating
                var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
                var data = {};
                data.sortby = 'avg_ratings';
                data.orderby = parseInt(req.body.orderby) || 1;
                var sorting = {};
                sorting[data.sortby] = data.orderby;

                data.perPage = 5;

                db.GetAggregation('drivers', [
                    { $match: query },
                    { "$sort": sorting },
                    { "$limit": data.perPage },
                    {
                        $project: {
                            username: 1,
                            deliverd: 1,
                            avg_ratings: 1,
                            phone: 1,
                            email: 1
                        }
                    },
                ], function (err, LowestratingList) {
                    if (err) {
                        res.send(err)
                    } else {

                        //drivers in top delivery
                        var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
                        var data = {};
                        data.sortby = 'deliverd';
                        data.orderby = parseInt(req.body.orderby) || -1;
                        var sorting = {};
                        sorting[data.sortby] = data.orderby;

                        data.perPage = 5;

                        db.GetAggregation('drivers', [
                            { $match: query },
                            { "$sort": sorting },
                            { "$limit": data.perPage },
                            {
                                $project: {
                                    username: 1,
                                    deliverd: 1,
                                    avg_ratings: 1,
                                    phone: 1,
                                    email: 1
                                }
                            },
                        ], function (err, topDeliList) {
                            if (err) {
                                res.send(err)
                            } else {

                                // driver graphical representation

                                db.GetDocument('drivers', { main_city: req.body.main_city, 'status': { $ne: 0 } }, {}, {}, function (err, driversdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var count = {};
                                        async.parallel([
                                            //new drivers
                                            function (callback) {
                                                db.GetCount('drivers', { main_city: req.body.main_city, status: { $eq: 3 } }, function (err, newdriver) {
                                                    if (err) return callback(err);
                                                    count.newdriver = newdriver;
                                                    callback();
                                                });
                                            },
                                            //Active drivers
                                            function (callback) {
                                                db.GetCount('drivers', { main_city: req.body.main_city, status: { $eq: 1 } }, function (err, active) {
                                                    if (err) return callback(err);
                                                    count.active = active;
                                                    callback();
                                                });
                                            },
                                            //Deactive drivers
                                            function (callback) {
                                                db.GetCount('drivers', { main_city: req.body.main_city, status: { $eq: 2 } }, function (err, inactivate) {
                                                    if (err) return callback(err);
                                                    count.inactivate = inactivate;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //disable drivers
                                                db.GetCount('drivers', { main_city: req.body.main_city, status: { $eq: 4 } }, function (err, disable) {
                                                    if (err) return callback(err);
                                                    count.disable = disable;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //deleted drivers
                                                db.GetCount('drivers', { main_city: req.body.main_city, status: { $eq: 0 } }, function (err, deleted) {
                                                    if (err) return callback(err);
                                                    count.deleted = deleted;
                                                    callback();
                                                });
                                            }
                                        ], function (err) {
                                            if (err) return next(err);
                                            var totalCount = count;
                                            if (err || totalCount.length <= 0) {
                                                res.send([0, 0]);
                                            } else {
                                                if (req.body.sub_city && req.body.main_city) {
                                                    var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $ne: 0 } }
                                                } else if (!req.body.sub_city && req.body.main_city) {

                                                    var query = { main_city: req.body.main_city, status: { $ne: 0 } };
                                                }
                                                db.GetAggregation('restaurant', [

                                                    { $match: query },
                                                    { "$sort": sorting },
                                                    { "$limit": data.perPage },
                                                    {
                                                        $project: {
                                                            username: 1,
                                                            deliverd: 1,
                                                            restaurantname: 1,
                                                            avg_ratings: 1,
                                                            phone: 1,
                                                            email: 1
                                                        }
                                                    },
                                                ], function (err, restopratingList) {
                                                    if (err) {
                                                        res.send(err)
                                                    } else {

                                                        //restaurant in loeast rating
                                                        //var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
                                                        if (req.body.sub_city && req.body.main_city) {
                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $ne: 0 } }
                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                            var query = { main_city: req.body.main_city, status: { $ne: 0 } };
                                                        }
                                                        var data = {};
                                                        data.sortby = 'avg_ratings';
                                                        data.orderby = parseInt(req.body.orderby) || 1;
                                                        var sorting = {};
                                                        sorting[data.sortby] = data.orderby;

                                                        data.perPage = 5;

                                                        db.GetAggregation('restaurant', [
                                                            { $match: query },
                                                            { "$sort": sorting },
                                                            { "$limit": data.perPage },
                                                            {
                                                                $project: {
                                                                    username: 1,
                                                                    deliverd: 1,
                                                                    restaurantname: 1,
                                                                    avg_ratings: 1,
                                                                    phone: 1,
                                                                    email: 1
                                                                }
                                                            },
                                                        ], function (err, resLowestratingList) {
                                                            if (err) {
                                                                res.send(err)
                                                            } else {

                                                                //restaurant in top delivery
                                                                //var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
                                                                if (req.body.sub_city && req.body.main_city) {
                                                                    var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $ne: 0 } }
                                                                } else if (!req.body.sub_city && req.body.main_city) {

                                                                    var query = { main_city: req.body.main_city, status: { $ne: 0 } };
                                                                }
                                                                var data = {};
                                                                data.sortby = 'deliverd';
                                                                data.orderby = parseInt(req.body.orderby) || -1;
                                                                var sorting = {};
                                                                sorting[data.sortby] = data.orderby;

                                                                data.perPage = 5;

                                                                db.GetAggregation('restaurant', [
                                                                    { $match: query },
                                                                    { "$sort": sorting },
                                                                    { "$limit": data.perPage },
                                                                    {
                                                                        $project: {
                                                                            username: 1,
                                                                            deliverd: 1,
                                                                            restaurantname: 1,
                                                                            avg_ratings: 1,
                                                                            phone: 1,
                                                                            email: 1
                                                                        }
                                                                    },
                                                                ], function (err, restopDeliList) {
                                                                    if (err) {
                                                                        res.send(err)
                                                                    } else {

                                                                        // restaurant graphical representation
                                                                        if (req.body.sub_city && req.body.main_city) {

                                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $ne: 0 } }
                                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                                            var query = { main_city: req.body.main_city, status: { $ne: 0 } };
                                                                        }

                                                                        db.GetDocument('restaurant', query, {}, {}, function (err, resdriversdata) {
                                                                            if (err) {
                                                                                res.send(err);
                                                                            } else {
                                                                                var count = {};
                                                                                async.parallel([
                                                                                    //new restaurant
                                                                                    function (callback) {
                                                                                        if (req.body.sub_city && req.body.main_city) {

                                                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $eq: 3 } }
                                                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                                                            var query = { main_city: req.body.main_city, status: { $eq: 3 } };
                                                                                        }
                                                                                        db.GetCount('restaurant', query, function (err, newdriver) {
                                                                                            if (err) return callback(err);
                                                                                            count.newdriver = newdriver;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    //Active restaurant
                                                                                    function (callback) {
                                                                                        if (req.body.sub_city && req.body.main_city) {

                                                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $eq: 1 } }
                                                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                                                            var query = { main_city: req.body.main_city, status: { $eq: 1 } };
                                                                                        }
                                                                                        db.GetCount('restaurant', query, function (err, active) {
                                                                                            if (err) return callback(err);
                                                                                            count.active = active;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    //Deactive restaurant
                                                                                    function (callback) {
                                                                                        if (req.body.sub_city && req.body.main_city) {

                                                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $eq: 2 } }
                                                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                                                            var query = { main_city: req.body.main_city, status: { $eq: 2 } };
                                                                                        }
                                                                                        db.GetCount('restaurant', query, function (err, inactivate) {
                                                                                            if (err) return callback(err);
                                                                                            count.inactivate = inactivate;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    function (callback) {
                                                                                        if (req.body.sub_city && req.body.main_city) {

                                                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $eq: 4 } }
                                                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                                                            var query = { main_city: req.body.main_city, status: { $eq: 4 } };
                                                                                        }
                                                                                        //disable restaurant
                                                                                        db.GetCount('restaurant', query, function (err, disable) {
                                                                                            if (err) return callback(err);
                                                                                            count.disable = disable;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    function (callback) {
                                                                                        if (req.body.sub_city && req.body.main_city) {

                                                                                            var query = { $and: [{ 'main_city': req.body.main_city }, { 'sub_city': req.body.sub_city }], status: { $eq: 0 } }
                                                                                        } else if (!req.body.sub_city && req.body.main_city) {

                                                                                            var query = { main_city: req.body.main_city, status: { $eq: 0 } };
                                                                                        }
                                                                                        //deleted restaurant
                                                                                        db.GetCount('restaurant', query, function (err, deleted) {
                                                                                            if (err) return callback(err);
                                                                                            count.deleted = deleted;
                                                                                            callback();
                                                                                        });
                                                                                    }
                                                                                ], function (err) {
                                                                                    if (err) return next(err);
                                                                                    var restotalCount = count;
                                                                                    if (err || totalCount.length <= 0) {
                                                                                        res.send([0, 0]);
                                                                                    } else {

                                                                                        // res.send([topratingList, LowestratingList, topDeliList, totalCount,driversdata]);

                                                                                        res.send([topratingList, LowestratingList, topDeliList, totalCount, driversdata, restopratingList, resLowestratingList, restopDeliList, restotalCount, resdriversdata]);

                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                                // res.send([topratingList, LowestratingList, topDeliList, totalCount,driversdata]);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    router.getRestaurant = function (req, res) {
        //drivers in top rating
        var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
        var data = {};
        data.sortby = 'avg_ratings';
        data.orderby = parseInt(req.body.orderby) || -1;
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        data.perPage = 5;

        db.GetAggregation('restaurant', [
            { $match: query },
            { "$sort": sorting },
            { "$limit": data.perPage },
            {
                $project: {
                    username: 1,
                    deliverd: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            },
        ], function (err, topratingList) {
            if (err) {
                res.send(err)
            } else {

                //drivers in loeast rating
                var query = { main_city: req.body.main_city, status: { '$ne': 0 } };
                var data = {};
                data.sortby = 'avg_ratings';
                data.orderby = parseInt(req.body.orderby) || 1;
                var sorting = {};
                sorting[data.sortby] = data.orderby;

                data.perPage = 5;

                db.GetAggregation('restaurant', [
                    { $match: query },
                    { "$sort": sorting },
                    { "$limit": data.perPage },
                    {
                        $project: {
                            username: 1,
                            deliverd: 1,
                            avg_ratings: 1,
                            phone: 1,
                            email: 1
                        }
                    },
                ], function (err, LowestratingList) {
                    if (err) {
                        res.send(err)
                    } else {

                        //drivers in top delivery
                        var query = { main_city: req.body.main_city, 'status': { '$ne': 0 } };
                        var data = {};
                        data.sortby = 'deliverd';
                        data.orderby = parseInt(req.body.orderby) || -1;
                        var sorting = {};
                        sorting[data.sortby] = data.orderby;

                        data.perPage = 5;

                        db.GetAggregation('restaurant', [
                            { $match: query },
                            { "$sort": sorting },
                            { "$limit": data.perPage },
                            {
                                $project: {
                                    username: 1,
                                    deliverd: 1,
                                    avg_ratings: 1,
                                    phone: 1,
                                    email: 1
                                }
                            },
                        ], function (err, topDeliList) {
                            if (err) {
                                res.send(err)
                            } else {

                                // driver graphical representation

                                db.GetDocument('restaurant', { main_city: req.body.main_city, 'status': { $ne: 0 } }, {}, {}, function (err, driversdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var count = {};
                                        async.parallel([
                                            //new drivers
                                            function (callback) {
                                                db.GetCount('restaurant', { main_city: req.body.main_city, 'status': { $eq: 3 } }, function (err, newdriver) {
                                                    if (err) return callback(err);
                                                    count.newdriver = newdriver;
                                                    callback();
                                                });
                                            },
                                            //Active drivers
                                            function (callback) {
                                                db.GetCount('restaurant', { main_city: req.body.main_city, 'status': { $eq: 1 } }, function (err, active) {
                                                    if (err) return callback(err);
                                                    count.active = active;
                                                    callback();
                                                });
                                            },
                                            //Deactive drivers
                                            function (callback) {
                                                db.GetCount('restaurant', { main_city: req.body.main_city, 'status': { $eq: 2 } }, function (err, inactivate) {
                                                    if (err) return callback(err);
                                                    count.inactivate = inactivate;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //disable drivers
                                                db.GetCount('restaurant', { main_city: req.body.main_city, 'status': { $eq: 4 } }, function (err, disable) {
                                                    if (err) return callback(err);
                                                    count.disable = disable;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //deleted drivers
                                                db.GetCount('restaurant', { main_city: req.body.main_city, 'status': { $eq: 0 } }, function (err, deleted) {
                                                    if (err) return callback(err);
                                                    count.deleted = deleted;
                                                    callback();
                                                });
                                            }
                                        ], function (err) {
                                            if (err) return next(err);
                                            var totalCount = count;
                                            if (err || totalCount.length <= 0) {
                                                res.send([0, 0]);
                                            } else {
                                                res.send([topratingList, LowestratingList, topDeliList, totalCount, driversdata]);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }



    router.getDriverRestStatics = function (req, res) {
        //drivers in top rating
        var query = { status: { '$ne': 0 } };
        var data = {};
        data.sortby = 'avg_ratings';
        data.orderby = parseInt(req.body.orderby) || -1;
        var sorting = {};
        sorting[data.sortby] = data.orderby;

        data.perPage = 5;

        db.GetAggregation('drivers', [
            { $match: query },
            { "$sort": sorting },
            { "$limit": data.perPage },
            {
                $project: {
                    username: 1,
                    deliverd: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            },
        ], function (err, topratingList) {
            if (err) {
                res.send(err)
            } else {

                //drivers in loeast rating
                var query = { status: { '$ne': 0 } };
                var data = {};
                data.sortby = 'avg_ratings';
                data.orderby = parseInt(req.body.orderby) || 1;
                var sorting = {};
                sorting[data.sortby] = data.orderby;

                data.perPage = 5;

                db.GetAggregation('drivers', [
                    { $match: query },
                    { "$sort": sorting },
                    { "$limit": data.perPage },
                    {
                        $project: {
                            username: 1,
                            deliverd: 1,
                            avg_ratings: 1,
                            phone: 1,
                            email: 1
                        }
                    },
                ], function (err, LowestratingList) {
                    if (err) {
                        res.send(err)
                    } else {

                        //drivers in top delivery
                        var query = { status: { '$ne': 0 } };
                        var data = {};
                        data.sortby = 'deliverd';
                        data.orderby = parseInt(req.body.orderby) || -1;
                        var sorting = {};
                        sorting[data.sortby] = data.orderby;

                        data.perPage = 5;

                        db.GetAggregation('drivers', [
                            { $match: query },
                            { "$sort": sorting },
                            { "$limit": data.perPage },
                            {
                                $project: {
                                    username: 1,
                                    deliverd: 1,
                                    avg_ratings: 1,
                                    phone: 1,
                                    email: 1
                                }
                            },
                        ], function (err, topDeliList) {
                            if (err) {
                                res.send(err)
                            } else {

                                // driver graphical representation

                                db.GetDocument('drivers', { 'status': { $ne: 0 } }, {}, {}, function (err, driversdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var count = {};
                                        async.parallel([
                                            //new drivers
                                            function (callback) {
                                                db.GetCount('drivers', { status: { $eq: 3 } }, function (err, newdriver) {
                                                    if (err) return callback(err);
                                                    count.newdriver = newdriver;
                                                    callback();
                                                });
                                            },
                                            //Active drivers
                                            function (callback) {
                                                db.GetCount('drivers', { status: { $eq: 1 } }, function (err, active) {
                                                    if (err) return callback(err);
                                                    count.active = active;
                                                    callback();
                                                });
                                            },
                                            //Deactive drivers
                                            function (callback) {
                                                db.GetCount('drivers', { status: { $eq: 2 } }, function (err, inactivate) {
                                                    if (err) return callback(err);
                                                    count.inactivate = inactivate;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //disable drivers
                                                db.GetCount('drivers', { status: { $eq: 4 } }, function (err, disable) {
                                                    if (err) return callback(err);
                                                    count.disable = disable;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //deleted drivers
                                                db.GetCount('drivers', { status: { $eq: 0 } }, function (err, deleted) {
                                                    if (err) return callback(err);
                                                    count.deleted = deleted;
                                                    callback();
                                                });
                                            }
                                        ], function (err) {
                                            if (err) return next(err);
                                            var totalCount = count;
                                            if (err || totalCount.length <= 0) {
                                                res.send([0, 0]);
                                            } else {
                                                //restaurant in top rating
                                                var sortby = 'avg_ratings';
                                                var sorting1 = {};
                                                sorting1[sortby] = -1;
                                                db.GetAggregation('restaurant', [
                                                    { $match: query },
                                                    { "$sort": sorting1 },
                                                    { "$limit": 5 },
                                                    {
                                                        $project: {
                                                            username: 1,
                                                            deliverd: 1,
                                                            restaurantname: 1,
                                                            avg_ratings: 1,
                                                            phone: 1,
                                                            email: 1
                                                        }
                                                    },
                                                ], function (err, restopratingList) {
                                                    if (err) {
                                                        res.send(err)
                                                    } else {
                                                        //restaurant in loeast rating
                                                        var query = { status: { '$ne': 0 } };
                                                        var data = {};
                                                        data.sortby = 'avg_ratings';
                                                        data.orderby = parseInt(req.body.orderby) || 1;
                                                        var sorting = {};
                                                        sorting[data.sortby] = data.orderby;

                                                        data.perPage = 5;

                                                        db.GetAggregation('restaurant', [
                                                            { $match: query },
                                                            { "$sort": sorting },
                                                            { "$limit": data.perPage },
                                                            {
                                                                $project: {
                                                                    username: 1,
                                                                    deliverd: 1,
                                                                    restaurantname: 1,
                                                                    avg_ratings: 1,
                                                                    phone: 1,
                                                                    email: 1
                                                                }
                                                            },
                                                        ], function (err, resLowestratingList) {
                                                            if (err) {
                                                                res.send(err)
                                                            } else {

                                                                //restaurant in top delivery
                                                                var query = { status: { '$ne': 0 } };
                                                                var data = {};
                                                                data.sortby = 'deliverd';
                                                                data.orderby = parseInt(req.body.orderby) || -1;
                                                                var sorting = {};
                                                                sorting[data.sortby] = data.orderby;

                                                                data.perPage = 5;

                                                                db.GetAggregation('restaurant', [
                                                                    { $match: query },
                                                                    { "$sort": sorting },
                                                                    { "$limit": data.perPage },
                                                                    {
                                                                        $project: {
                                                                            username: 1,
                                                                            restaurantname: 1,
                                                                            deliverd: 1,
                                                                            avg_ratings: 1,
                                                                            phone: 1,
                                                                            email: 1
                                                                        }
                                                                    },
                                                                ], function (err, restopDeliList) {
                                                                    if (err) {
                                                                        res.send(err)
                                                                    } else {

                                                                        // restaurant graphical representation

                                                                        db.GetDocument('restaurant', { 'status': { $ne: 0 } }, {}, {}, function (err, resdriversdata) {
                                                                            if (err) {
                                                                                res.send(err);
                                                                            } else {
                                                                                var count = {};
                                                                                async.parallel([
                                                                                    //new restaurant
                                                                                    function (callback) {
                                                                                        db.GetCount('restaurant', { status: { $eq: 3 } }, function (err, newdriver) {
                                                                                            if (err) return callback(err);
                                                                                            count.newdriver = newdriver;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    //Active restaurant
                                                                                    function (callback) {
                                                                                        db.GetCount('restaurant', { status: { $eq: 1 } }, function (err, active) {
                                                                                            if (err) return callback(err);
                                                                                            count.active = active;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    //Deactive restaurant
                                                                                    function (callback) {
                                                                                        db.GetCount('restaurant', { status: { $eq: 2 } }, function (err, inactivate) {
                                                                                            if (err) return callback(err);
                                                                                            count.inactivate = inactivate;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    function (callback) {
                                                                                        //disable restaurant
                                                                                        db.GetCount('restaurant', { status: { $eq: 4 } }, function (err, disable) {
                                                                                            if (err) return callback(err);
                                                                                            count.disable = disable;
                                                                                            callback();
                                                                                        });
                                                                                    },
                                                                                    function (callback) {
                                                                                        //deleted restaurant
                                                                                        db.GetCount('restaurant', { status: { $eq: 0 } }, function (err, deleted) {
                                                                                            if (err) return callback(err);
                                                                                            count.deleted = deleted;
                                                                                            callback();
                                                                                        });
                                                                                    }
                                                                                ], function (err) {
                                                                                    if (err) return next(err);
                                                                                    var restotalCount = count;
                                                                                    if (err || totalCount.length <= 0) {
                                                                                        res.send([0, 0]);
                                                                                    } else {

                                                                                        // res.send([topratingList, LowestratingList, topDeliList, totalCount,driversdata]);

                                                                                        res.send([topratingList, LowestratingList, topDeliList, totalCount, driversdata, restopratingList, resLowestratingList, restopDeliList, restotalCount, resdriversdata]);

                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                                // res.send([topratingList, LowestratingList, topDeliList, totalCount,driversdata]);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }




    router.idUsers = function getusers(req, res) {

        // console.log('-------------', req.body)


        var data = {};
        data.id = req.body.id;

        var errors = req.validationErrors();





        var query = {
            'driver_id': new mongoose.Types.ObjectId(req.body.id),
            status: { $ne: 0 }
        };




        var usersQuery = [{
            "$match": query
        },

        { $lookup: { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantiddetails' } },
        { $unwind: { path: "$restaurantiddetails", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'usersiddetails' } },
        { $unwind: { path: "$usersiddetails", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'drivers', localField: 'driver_id', foreignField: '_id', as: 'driver' } },
        { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                status: 1,
                read_status: 1,
                billings: 1,
                user_id: 1,
                driver_id: 1,
                coupon_code: 1,
                order_id: 1,
                delivery_address: 1,
                cancel_drivers: 1,
                restaurantiddetails: 1,
                usersiddetails: 1,
                driver: 1
            }
        }, {
            $project: {
                driver_id: 1,
                document: "$$ROOT"
            }
        },
        {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }
        ];


        /* var condition = { status: { $ne: 0 } };
         usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });*/



        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        var condition = { driver_id: req.body.id, status: { $ne: 0 } };
        if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.order_id": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.restaurantiddetails.restaurantname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.usersiddetails.username": { $regex: searchs + '.*', $options: 'si' } }] } });
        }
        if (req.body.limit && req.body.skip >= 0) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });


        db.GetAggregation('orders', usersQuery, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All user
                    function (callback) {
                        db.GetCount('orders', { driver_id: req.body.id }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    },
                    //Active user
                    function (callback) {
                        db.GetOneDocument('drivers', { _id: req.body.id }, {}, {}, function (err, deliverValue) {
                            // db.GetCount('orders', { driver_id: req.body.id, status: { $eq: 7 } }, function (err, deliverValue) {
                            if (err) return callback(err);
                            var ct = 0;
                            if (deliverValue.deliverd > 0) {
                                ct = deliverValue.deliverd;
                            }
                            count.deliverValue = ct;
                            callback();
                        });
                    },
                    //Deactive user
                    function (callback) {
                        db.GetOneDocument('drivers', { _id: req.body.id }, {}, {}, function (err, cancelValue) {
                            //db.GetCount('orders', { driver_id: req.body.id, status: { $eq: 4 } }, function (err, cancelValue) {
                            if (err) return callback(err);
                            var ct = 0;
                            if (cancelValue.cancelled > 0) {
                                ct = cancelValue.cancelled;
                            }
                            count.cancelValue = cancelValue.cancelled;
                            callback();
                        });
                    }

                ], function (err) {

                    if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                        //console.log("docdata[0].documentData>>>>", docdata[0].documentData);
                        res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    }
                });
            }
        });
    };

    router.driverAvailable = function (req, res) {
        if (req.body.avail == 0) {
            db.UpdateDocument('drivers', { _id: req.body.id }, { avail: 1 }, { multi: true }, function (err1, docdata1) {
                if (err1) {
                    res.send(err1);
                } else {
                    res.send(docdata1);
                }
            });
        } else {
            db.UpdateDocument('drivers', { _id: req.body.id }, { avail: 0 }, { multi: true }, function (err1, docdata1) {
                if (err1) {
                    res.send(err1);
                } else {
                    res.send(docdata1);
                }
            });
        }
    }
    router.getState = function (req, res) {
        var empty = [];
        var stateList = country.info(req.body.name.code);
        if (stateList) {
            if (stateList.provinces) {
                res.send(stateList.provinces)
            } else { res.send(empty) }
        } else { res.send(empty) }
    }

    router.taxSave = function (req, res) {

        var data = {};
        data.country = {};
        data.country.code = req.body.country.code;
        data.country.name = req.body.country.name;
        data.tax_type = req.body.tax_type;
        data.amount = req.body.amount;
        data.tax_label = req.body.tax_label;
        data.state_name = req.body.state_name;
        //data.status = req.body.status || 1;
        data.status = 1;
        if (req.body._id) {
            let citytax = {
                "tax_id": req.body._id,
                "tax_amount": req.body.amount,
                "tax_label": req.body.tax_label
            }
            if (req.body.tax_type == 'common') {
                db.GetOneDocument('tax', { '_id': { $ne: req.body._id }, 'country.name': data.country.name, 'tax_type': 'state' }, {}, {}, function (err, taxres) {
                    if (err) {
                        res.send(err);
                    } else {
                        if (taxres) {
                            res.status(400).send({ message: "This country already has state wise tax" });
                        } else {
                            db.GetOneDocument('tax', { '_id': { $ne: req.body._id }, 'country.name': data.country.name }, {}, {}, function (err, taxrespo) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    if (taxrespo) {
                                        res.status(400).send({ message: "country tax exist" });
                                    } else {
                                        db.UpdateDocument('tax', { _id: req.body._id }, data, {}, function (err, docdata) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                if (req.body.status == 2) {
                                                    // db.UpdateDocument('restaurant', { 'tax_id': req.body._id }, { 'tax': 0 }, { multi: true }, function (err, res) { });
                                                    citytax.tax_amount = 0;
                                                    db.UpdateDocument('city', { 'tax.tax_id': req.body._id.toString() }, { 'tax': citytax }, { multi: true }, function (err, res) { });
                                                } else {
                                                    // db.UpdateDocument('restaurant', { 'tax_id': req.body._id }, { 'tax': data.amount }, { multi: true }, function (err, res) { });
                                                    db.UpdateDocument('city', { 'tax.tax_id': req.body._id.toString() }, { 'tax': citytax }, { multi: true }, function (err, res) { });
                                                }
                                                res.send(docdata);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                db.GetOneDocument('tax', { '_id': { $ne: req.body._id }, 'country.name': data.country.name, 'tax_type': 'common' }, {}, {}, function (err, taxres) {
                    if (err) {
                        res.send(err);
                    } else {
                        if (taxres) {
                            res.status(400).send({ message: "This country already has common tax" });
                        } else {
                            db.GetOneDocument('tax', { '_id': { $ne: req.body._id }, 'country.name': data.country.name, 'state_name': data.state_name }, {}, {}, function (err, taxrespo) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    if (taxrespo) {
                                        res.status(400).send({ message: "state tax exist" });
                                    } else {
                                        if (req.body.status == 2) {
                                            db.UpdateDocument('restaurant', { 'tax_id': req.body._id }, { 'tax': 0 }, { multi: true }, function (err, res) { });
                                        } else {
                                            db.UpdateDocument('restaurant', { 'tax_id': req.body._id }, { 'tax': data.amount }, { multi: true }, function (err, res) { });
                                        }
                                        db.UpdateDocument('tax', { _id: req.body._id }, data, {}, function (err, docdata) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                res.send(docdata);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        } else {
            if (req.body.tax_type == 'common') {
                db.GetOneDocument('tax', { 'country.name': data.country.name, 'tax_type': 'state' }, {}, {}, function (err, taxres) {
                    if (err) {
                        res.send(err);
                    } else {
                        if (taxres) {
                            res.status(400).send({ message: "This country already has state wise tax" });
                        } else {
                            db.GetOneDocument('tax', { 'country.name': data.country.name }, {}, {}, function (err, taxrespo) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    if (taxrespo) {
                                        res.status(400).send({ message: "country tax exist" });
                                    } else {
                                        db.InsertDocument('tax', data, function (err, result) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                res.send(result)
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            } else {
                db.GetOneDocument('tax', { 'country.name': data.country.name, 'tax_type': 'common' }, {}, {}, function (err, taxres) {
                    if (err) {
                        res.send(err);
                    } else {
                        if (taxres) {
                            res.status(400).send({ message: "This country already has common tax" });
                        } else {
                            db.GetOneDocument('tax', { 'country.name': data.country.name, 'state_name': data.state_name }, {}, {}, function (err, taxrespo) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    if (taxrespo) {
                                        res.status(400).send({ message: "state tax exist" });
                                    } else {
                                        db.InsertDocument('tax', data, function (err, result) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                res.send(result)
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    }

    router.taxList = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var newsQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                country: 1,
                tax_label: 1,
                status: 1,
                state_name: 1,
                tax_type: 1,
                createdAt: 1
            }
        }, {
            $project: {
                country: 1,
                tax_label: 1,
                status: 1,
                state_name: 1,
                tax_type: 1,
                createdAt: { $toLower: '$' + sorted },
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];
        var condition = { status: { $ne: 0 } };
        newsQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            //condition['email'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            newsQuery.push({ "$match": { $or: [{ "documentData.country.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.tax_type": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.state_name": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            newsQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            newsQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                newsQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            newsQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }
        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            newsQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            newsQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            newsQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }

        if (!req.body.search) {
            newsQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('tax', newsQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length != 0) {
                    res.send([docdata[0].documentData, docdata[0].count]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    }

    router.editTax = function (req, res) {
        db.GetDocument('tax', { _id: req.body.id }, {}, {}, function (err, taxrespo) {
            if (err) {
                res.send(err);
            } else {
                res.send(taxrespo);
            }
        });
    }

    router.newDrivers = (req, res) => {
        var errors = req.validationErrors();

        var query = {};

        query = { status: { $eq: 3 } };
        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var current_time = Date.now();
        var three_min_section = 45 * 1000;
        var before_twenty_seconds = current_time - three_min_section;
        var usersQuery = [{
            "$match": query
        }, {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                main_city: 1,
                username: 1,
                sort_name: { $toLower: "$username" },
                last_name: 1,
                phone: 1,
                currentStatus: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$last_update_time", ''] }, ''] }, { $ne: [{ "$ifNull": ["$currentStatus", ''] }, ''] }, { $gte: ["$last_update_time", before_twenty_seconds] }, { $gte: ["$currentStatus", 1] }] }, 1, 0] },
                driver_documents: 1,
                tot_req: 1,
                cancelled: 1,
                deliverd: 1,
                avg_delivery: 1,
                avail: 1,
                verified: 1,
                role: 1,
                status: 1,
                email: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        if (req.body.search) {
            //condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.main_city": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.number": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.code": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.last_name": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('drivers', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('documents', { 'doc_for': 'driver', 'has_require': 1, 'has_expire': 1 }, {}, {}, (err, ress) => {
                    async.series([(cb) => {
                        if (ress.length > 0) {
                            if (docdata.length > 0) {
                                for (i in docdata[0].documentData) {
                                    docdata[0].documentData[i].doc_len = ress.length;
                                }
                                for (i in ress) {
                                    for (j in docdata[0].documentData) {
                                        for (x in docdata[0].documentData[j].driver_documents) {
                                            if (ress[i].doc_name == docdata[0].documentData[j].driver_documents[x].doc_name) {
                                                docdata[0].documentData[j].doc_len = parseInt(docdata[0].documentData[j].doc_len) - 1;
                                            }
                                        }
                                    }
                                }
                            }
                            cb(null);
                        } else {
                            if (docdata.length > 0) {
                                for (i in docdata[0].documentData) {
                                    docdata[0].documentData[i].doc_len = 0;
                                }
                            }
                            cb(null);
                        }
                    }, (cb) => {
                        if (docdata.length > 0) {
                            for (i in docdata[0].documentData) {
                                if (typeof docdata[0].documentData[i].last_name != 'undefined') {
                                    docdata[0].documentData[i].name = docdata[0].documentData[i].username + ' ' + docdata[0].documentData[i].last_name;
                                } else {
                                    docdata[0].documentData[i].name = docdata[0].documentData[i].username + '';
                                }
                                if (typeof docdata[0].documentData[i].phone != 'undefined' && docdata[0].documentData[i].phone != null && docdata[0].documentData[i].phone != '') {
                                    if (typeof docdata[0].documentData[i].phone.code != 'undefined') {
                                        docdata[0].documentData[i].phone_no = docdata[0].documentData[i].phone.code + docdata[0].documentData[i].phone.number
                                    } else {
                                        docdata[0].documentData[i].phone_no = docdata[0].documentData[i].phone.number
                                    }
                                } else {
                                    docdata[0].documentData[i].phone_no = '';
                                }
                                /* console.log('docdata[0].documentData[i].currentStatus', docdata[0].documentData[i].currentStatus)
                                if (typeof docdata[0].documentData[i].currentStatus == 'undefined') {
                                    docdata[0].documentData[i].currentStatus = 1;
                                } */
                            }
                            cb(null);
                        } else {
                            cb(null);
                        }
                    }], (err, succc) => {
                        if (docdata.length > 0) {
                            res.send([docdata[0].documentData, docdata[0].count]);
                        } else {
                            res.send([
                                [], 0
                            ]);
                        }
                    })
                })
            }
        });
    }


    return router;
}