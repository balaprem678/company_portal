
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






    controller.getTransactions = async function (req, res) {
        try {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            if (settings.status === false) {
                return res.send({ status: 0, message: "Something went wrong please try again" })
            } else {
                var query = {};
                query = { user_id: new mongoose.Types.ObjectId(req.body.user_id), status: { $nin: [2, 0, 9, 10, 15] } };

                if (req.body.sort) {
                    var sorted = req.body.sort.field;
                }
                var usersQuery = [{
                    "$match": query

                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        foods: 1,
                        user: 1,
                        order_id: 1,
                        billings: 1,
                        order_history: 1,
                        amount: "$billings.amount.total",
                        delivery_address: 1,
                        status: 1,
                        restaurant_time_out_alert: 1,
                        cancellationreason: 1,
                        schedule_date: 1,
                        schedule_time_slot: 1,
                        seen_status: 1,
                        shipped_date: "$order_history.shipped",
                        packed_date: "$order_history.packed",
                        delivery: "$order_history.delivered",
                        createdAt: 1,

                    }
                }, {
                    $project: {
                        question: 1,
                        document: "$$ROOT"
                    }
                },
                {
                    $sort: {
                        "document.createdAt": -1
                    }
                }, {
                    $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                }
                ];


                var condition = { status: { $ne: 0 } };
                usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });



                if (req.body.search) {
                    var searchs = req.body.search;
                    usersQuery.push({
                        "$match": {
                            $or: [
                                { "documentData.foods.name": { $regex: searchs + '.*', $options: 'si' } },
                                { "documentData.order_id": { $regex: searchs + '.*', $options: 'si' } },

                            ]
                        }
                    });

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
                }

                if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
                    usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
                }

                if (!req.body.search) {
                    usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
                }
                //console.log(JSON.stringify(usersQuery))
                const docdata = await db.GetAggregation('orders', usersQuery)
                if (!docdata) {
                    res.send({ status: 0, message: err.message });
                } else {
                    if (docdata && docdata.length > 0) {
                        for (var i = 0; i < docdata[0].documentData.length; i++) {
                            docdata[0].documentData[i].currency = settings.doc.settings.currency_symbol;
                        }
                        res.send({ "error": false, "message": "Transactions Retrieved Successfully", status: 1, data: docdata[0].documentData, count: docdata[0].count, message: "Success" });
                    } else {
                        res.send({ "error": false, "message": "Transactions Retrieved Successfully", status: 1, data: [], count: 0, message: "Success" });
                    }
                }

            }
        } catch (error) {

        }
    }

    controller.getPaypalLink = async function (req, res) {
        try {
            const user_id = req.body.user_id;
            const order_id = req.body.order_id;
            const amount = req.body.amount;
            let data = {}
            data.error = false;
            data.message = "Order Detail Founded !";
            data.data = "";
            res.send(data)
        } catch (error) {

        }
    }

    controller.addTransaction = async function (req, res) {
        try {
            const user_id = req.body.user_id;
            order_id = req.body.order_id;
            type = req.body.type;
            txn_id = req.body.tnx_id;
            amount = req.body.amount;
            let data={}
            data.error=false;
            data.message="Transaction Added Successfully";
            data.data=""
            res.send(data)
        } catch (error) {

        }
    }

    controller.generatePaytmChecksum = async function (req, res) {  
        try {
            const order_id=req.body.order_id;
            const amount=req.body.amount;
            let data={};
            data.error=false;
            data.message="Checksum created successfully"
            data.order_id='';
            data.data={
                MID:'',
                ORDER_ID:'',
                TXN_AMOUNT:'',
                CUST_ID:'',
                WEBSITE:'',
                CALLBACK_URL:'',
            };
            data.signature='';
            res.send(data)
        } catch (error) {

        }
    }

    controller.generatePaytmTxnToken = async function (req, res) {
        try {
            const amount= req.body.amount;
            const order_id= req.body.order_id;
            const user_id= req.body.user_id;
            data={}
            res.send(data)
        } catch (error) {

        }
    }

    controller.validatePaytmChecksum = async function (req, res) {
        try {

        } catch (error) {

        }
    }

    controller.flutterwaveWebview = async function (req, res) {
        try {
            const amount= req.body.amount;
            const user_id= req.body.user_id;
            const order_id= req.body.order_id;
            let data={};
            data.error=false;
            data.message="Payment link generated. Follow the link to make the payment!";
            data.link=""
            res.send(data)
        } catch (error) {

        }
    }

    controller.flutterwavePaymentResponse = async function (req, res) {
        try {

        } catch (error) {

        }
    }

    controller.createMidtransTransaction = async function (req, res) {
        try {
            const amount= req.body.amount;
            const user_id= req.body.user_id;
            const order_id= req.body.order_id;
            let data={}
            data.error=false;
            data.message="Token generated successfully."
            data.data={
                token:"",
                redirected_url:"",
            }
            res.send(data)
        } catch (error) {

        }
    }

    controller.getMidtransTransaction = async function (req, res) {
        try {
            const user_id=req.body.user_id;
            let data={}
            data.error=false;
            data.message="";
            data.data={
                status_code:"",
                transaction_id:"",
                gross_amount:"",
                currency:"",
                order_id:"",
                payment_type:"",
                signature_key:"",
                transaction_status:"",
                fraud_status:"",
                status_message:"",
                merchant_id:"",
                transaction_time:"",
                settlement_time:"",
                expiry_time:"",
                channel_response_code:"",
                channel_response_message:"",
                bank:"",
                approval_code:"",
                masked_card:"",
                card_type:"",
                channel:"",
                on_us:false
            }
            res.send(data);
        } catch (error) {

        }
    }

    controller.instamojoWebview = async function (req, res) {
        try {
            const user_id=req.body.user_id;
            const order_id=req.body.order_id;
            let data={};
            data.error=false;
            data.message="Payment request send successfully.";
            data.data={
                id:'',
                user:'',
                phone:'',
                email:'',
                buyer_name:'',
                amount:'',
                purpose:'',
                status:'',
                payments:'',
                send_sms:'',
                send_email:'',
                sms_status:'',
                email_status:'',
                short_url:'',
                long_url:'',
                redirect_url:'',
                webhook_url:'',
                scheduled_at:'',
                expires_at:'',
                allow_repeated_payments:false,
                mark_fulfilled:true,
                created_at:'',
                modified_at:'',
                resource_url:"",
                http_code:""

            }
        } catch (error) {

        }
    }
    return controller;
}





