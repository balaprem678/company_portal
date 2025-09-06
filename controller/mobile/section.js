
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






    controller.getSection = async function (req, res) {
        const user_id = req.body.user_id;
        var condition = {};
        if (typeof req.body.search == 'undefined' || typeof req.body.search == null) {
            // data.status = 0;
            // data.message = 'search is requird';
            // return res.send(data);
            condition =
            {
                // $match: { 
                user_id: new mongoose.Types.ObjectId(req.body.user_id), status: { $eq: 1 }
                // } 
            }
        } else {
            var searchs = req.body.search;

            condition['$and'] = []
            condition['$and'].push(
                // {
                // $match: 
                { status: { $eq: 1 }, name: { $regex: searchs + '.*', $options: 'si' }, user_id: new mongoose.Types.ObjectId(req.body.user_id) },
                // }
            )

        }
        if (!user_id) {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            const siteUrl = settings ? settings.doc.settings.site_url : '';
            if (settings.status === false) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {

                const get_featured_cat_pipeline = [
                    {
                        $lookup: {
                            from: "favourite",
                            let: { product_id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$user_id", new mongoose.Types.ObjectId(user_id)] },
                                                { $eq: ["$product_id", "$$product_id"] },
                                                { $eq: ["$status", 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "favourite"
                        }
                    },
                    { $match: { feature: 1 } },
                    {
                        $lookup: {
                            from: 'food',
                            let: { r_category: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$rcategory", "$$r_category"] },
                                                { $eq: ["$status", 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: 'foodData',
                        },
                    },
                    {
                        $unwind: '$foodData', // Unwind the 'foodData' array
                    },
                    {
                        $addFields: {
                            // Concatenate 'img', 'avatar', and 'hoverimages' within 'foodData'
                            'img': {
                                $concat: [
                                    siteUrl,
                                    '$img',
                                ]
                            },
                            'foodData.avatar': {
                                $concat: [
                                    siteUrl,
                                    '$foodData.avatar',
                                ]
                            },
                            'foodData.hoverimages': {
                                $concat: [
                                    siteUrl,
                                    '$foodData.hoverimages',
                                ]
                            },
                            'foodData.images': {
                                $map: {
                                    input: '$foodData.images',
                                    as: 'image',
                                    in: {
                                        $concat: [
                                            siteUrl,
                                            '$$image',
                                        ]
                                    }
                                }
                            },
                            'foodData.quantity': '$foodData.quantity',
                            is_favourite: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                            'foodData.min_max_price': {
                                "min_price": "$foodData.base_price",
                                "max_price": "$foodData.sale_price",
                                "discount_percentage": {
                                    $multiply: [
                                        { $divide: [{ $subtract: ['$foodData.base_price', '$foodData.sale_price'] }, '$foodData.base_price'] },
                                        100
                                    ]
                                },
                                "offer_sprice": {
                                    $cond: {
                                        if: { $eq: ["$foodData.offer_status", 1] }, // Check if offerstatus is 1
                                        then: {
                                            $round: {
                                                $multiply: [
                                                    { $divide: ["$foodData.offer_amount", 100] },
                                                    "$foodData.base_price",
                                                ]
                                            }
                                        },
                                        else: null // If offerstatus is not 1, set offer_sprice to null
                                    }
                                }
                            },
                            'foodData.price_details': {
                                $map: {
                                    input: '$foodData.price_details',
                                    as: 'priceDetail',
                                    in: {
                                        $mergeObjects: [
                                            '$$priceDetail',
                                            {

                                                discount_percentage: {
                                                    $round: {

                                                        $multiply: [

                                                            { $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
                                                            100
                                                        ]
                                                    }
                                                },
                                                offer_sprice: {
                                                    $cond: {
                                                        if: { $eq: ["$foodData.offer_status", 1] }, // Check if offerstatus is 1
                                                        then: {
                                                            $round: {
                                                                $multiply: [
                                                                    { $divide: ["$foodData.offer_amount", 100] },
                                                                    "$$priceDetail.mprice",
                                                                ]
                                                            }
                                                        },
                                                        else: null // If offerstatus is not 1, set offer_sprice to null
                                                    }
                                                }

                                            }
                                        ]
                                    }
                                }
                            }

                        }
                    },

                    {
                        $group: {
                            _id: '$_id',
                            title: { $first: '$rcatname' },
                            feature: { $first: '$feature' },
                            status: { $first: '$status' },
                            img: { $first: '$img' },
                            createdAt: { $first: '$createdAt' },
                            updatedAt: { $first: '$updatedAt' },
                            slug: { $first: '$slug' },
                            data: {
                                $push: '$foodData',
                            },
                            // min_max_price: { $first: '$foodData.min_max_price' }
                        },
                    },
                    {
                        $sort: { title: 1 }
                    }
                ];


                const featured_pro = await db.GetAggregation('rcategory', get_featured_cat_pipeline);

                // if (featured_pro && featured_pro.data && featured_pro.data.length > 0) {
                //     for (let i = 0; i < featured_pro.data.length; i++) {
                //         if (data[i].price_details && data[i].price_details.length > 0) {
                //             for (let j = 0; j < data[i].price_details.length; j++) {

                //                 data[i].price_details[j].image = siteUrl + data[i].price_details[j].image
                //             }
                //         }
                //     }
                // }

                if (featured_pro) {
                    var data = {};
                    data.error = false;
                    data.message = "Sections Retrieved Successfully";
                    data.min_price = "";
                    data.max_price = "";
                    data.status = 1
                    data.data = featured_pro;

                    res.send(data);
                } else {
                    var data = {};
                    data.status = 0
                    data.error = true
                    data.message = "Something wentWrong"
                    res.send(data)
                }



            }
        } else {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            const siteUrl = settings ? settings.doc.settings.site_url : '';
            if (settings.status === false) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                // "foodData.is_favour":"$foodData._id",
                //  how to check the foodData._id is an element of the collection food which is also matches the user_id
                const get_featured_cat_pipeline = [

                    { $match: { feature: 1 } },
                    {
                        $lookup: {
                            from: 'food',
                            let: { r_category: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$rcategory", "$$r_category"] },
                                                { $eq: ["$status", 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: 'foodData',
                        },
                    },
                    {
                        $unwind: '$foodData', // Unwind the 'foodData' array
                    },
                    {
                        $lookup: {
                            from: "favourite",
                            let: { product_id: "$foodData._id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$user_id", new mongoose.Types.ObjectId(user_id)] },
                                                { $eq: ["$product_id", "$$product_id"] },
                                                // { $eq: ["$status", 1] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "favourite"
                        }
                    },
                    {
                        $addFields: {
                            // Concatenate 'img', 'avatar', and 'hoverimages' within 'foodData'
                            'img': {
                                $concat: [
                                    siteUrl,
                                    '$img',
                                ]
                            },
                            "foodData.is_favour": "$foodData._id",
                            "foodData.is_favourite": { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                            'foodData.avatar': {
                                $concat: [
                                    siteUrl,
                                    '$foodData.avatar',
                                ]
                            },
                            'foodData.hoverimages': {
                                $concat: [
                                    siteUrl,
                                    '$foodData.hoverimages',
                                ]
                            },
                            'foodData.images': {
                                $map: {
                                    input: '$foodData.images',
                                    as: 'image',
                                    in: {
                                        $concat: [
                                            siteUrl,
                                            '$$image',
                                        ]
                                    }
                                }
                            },
                            "foodData.fav": '$favorite',
                            'foodData.quantity': '$foodData.quantity',
                            'foodData.min_max_price': {
                                "min_price": "$foodData.base_price",
                                "max_price": "$foodData.sale_price",
                                "discount_percentage": {
                                    $round: {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $subtract: ['$foodData.base_price', '$foodData.sale_price'] },
                                                    '$foodData.base_price'
                                                ]
                                            },
                                            100
                                        ],
                                        // Specify the number of decimal places to round to
                                    }
                                },
                                "offer_sprice": {
                                    $cond: {
                                        if: { $eq: ["$foodData.offer_status", 1] }, // Check if offerstatus is 1
                                        then: {
                                            $round: {
                                                $multiply: [
                                                    { $divide: ["$foodData.offer_amount", 100] },
                                                    "$foodData.base_price",
                                                ]
                                            }
                                        },
                                        else: null // If offerstatus is not 1, set offer_sprice to null
                                    }
                                }
                            }
                            ,
                            'foodData.price_details': {
                                $map: {
                                    input: '$foodData.price_details',
                                    as: 'priceDetail',
                                    in: {
                                        $mergeObjects: [
                                            '$$priceDetail',
                                            {

                                                discount_percentage: {
                                                    $round: {

                                                        $multiply: [

                                                            { $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
                                                            100
                                                        ]
                                                    }
                                                },
                                                offer_sprice: {
                                                    $cond: {
                                                        if: { $eq: ["$foodData.offer_status", 1] }, // Check if offerstatus is 1
                                                        then: {
                                                            $round: {
                                                                $multiply: [
                                                                    { $divide: ["$foodData.offer_amount", 100] },
                                                                    "$$priceDetail.mprice",
                                                                ]
                                                            }
                                                        },
                                                        else: null // If offerstatus is not 1, set offer_sprice to null
                                                    }
                                                }

                                            }
                                        ]
                                    }
                                }
                            }

                        }
                    },

                    {
                        $group: {
                            _id: '$_id',
                            title: { $first: '$rcatname' },
                            feature: { $first: '$feature' },
                            status: { $first: '$status' },
                            img: { $first: '$img' },
                            createdAt: { $first: '$createdAt' },
                            updatedAt: { $first: '$updatedAt' },
                            slug: { $first: '$slug' },
                            data: {
                                $push: '$foodData',
                            },
                            // min_max_price: { $first: '$foodData.min_max_price' }
                        },
                    },
                    {
                        $sort: { title: 1 }
                    }
                ];



                const featured_pro = await db.GetAggregation('rcategory', get_featured_cat_pipeline);
                // console.log("sdfsdfgdsfds", featured_pro)
                // if (featured_pro && featured_pro.data && featured_pro.data.length > 0) {

                //     for (let i = 0; i < featured_pro.data.length; i++) {
                //         if (data[i].price_details && data[i].price_details.length > 0) {
                //             for (let j = 0; j < data[i].price_details.length; j++) {

                //                 data[i].price_details[j].image = siteUrl + data[i].price_details[j].image
                //             }
                //         }
                //     }
                // }
                if (featured_pro) {
                    var data = {};
                    data.error = false;
                    data.message = "Sections Retrieved Successfully";
                    data.min_price = "";
                    data.max_price = "";
                    data.status = 1
                    data.data = featured_pro;

                    res.send(data);
                } else {
                    var data = {};
                    data.status = 0
                    data.error = true
                    data.message = "Something wentWrong"
                    res.send(data)
                }
            }
        }

    }

    controller.getNotifications = function (req, res) {
        try {
            let data = {}
            data.error = false;
            data.message = "Notifications Retrieved Successfully"
            data.total = '';
            data.data = [{
                id: '',
                title: '',
                message: '',
                type: '',
                type_id: '',
                send_to: '',
                user_id: '',
                image: '',
                link: '',
                date_sent: '',
            }]
            res.send(data);
        } catch (error) {

        }
    }
    return controller;
}





