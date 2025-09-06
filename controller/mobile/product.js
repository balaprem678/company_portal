//"use strict";

const { favourite } = require('../../model/mongodb.js');

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



    controller.getProducts = async function (req, res) {
        const id = req.body.product_id;
        const search = req.body.search;
        const limit = req.body.limit;
        const offset = req.body.offset;
        const sort = req.body.sort;
        const order = req.body.order;
        const userId = req.body.user_id;
        const filter = req.body.filter;
        if (id) {
            //_______________This is the product details________________
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            const siteUrl = settings.doc.settings.site_url;
            if (settings.status === false) {
                res.send({ "status": 0, "errors": "Configure your app settings" });
            } else {
                // var condition = { '_id': new mongoose.Types.ObjectId(id) };


                var condition = {};
                if (typeof req.body.search == 'undefined' || typeof req.body.search == null) {
                    // data.status = 0;
                    // data.message = 'search is requird';
                    // return res.send(data);
                    condition =
                    {
                        // $match: { 
                        '_id': new mongoose.Types.ObjectId(id),
                        status: 1
                        // } 
                    }
                } else {
                    var searchs = req.body.search;

                    condition['$and'] = []
                    condition['$and'].push(
                        // {
                        // $match: 
                        { name: { $regex: searchs + '.*', $options: 'si' }, '_id': new mongoose.Types.ObjectId(id), status: 1 }
                        // }
                    )

                }




                var productQuery = [
                    { $match: condition },
                    { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                    { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
                    { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
                    { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            name: 1,
                            image: "$avatar",
                            rcat_id: "$rcategory._id",
                            scat_id: "$scategory._id",
                            description: "$information",
                            category_id: "$rcategory._id",
                            category_name: { $toLower: '$rcategory.rcatname' },
                            scategory: { $toLower: '$scategory.scatname' },
                            brandname: { $toLower: '$brands.brandname' },
                            ratting: { $toLower: '$brands.rating' },
                            tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
                            attributes: 1,
                            isRecommeneded: 1,
                            itmcat: 1,
                            slug: 1,
                            visibility: "$status",
                            min_max_price: {
                                min_price: "$base_price",
                                max_price: "$sale_price",
                                discount_percentage: {
                                    $round: [
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        { $subtract: ['$base_price', '$sale_price'] },
                                                        '$base_price'
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        2 // Rounding to two decimal places
                                    ]
                                }
                            },
                            sale_discount: { $subtract: ['$base_price', '$sale_price'] },
                            status: 1,
                            color: 1,
                            base_price: 1,
                            product_details: 1,
                            sale_price: 1,
                            offer_status: 1,
                            offer_amount: 1,
                            variant: "$price_details",
                            price_details: 1,
                            quantity: 1,
                            sort_name: { $toLower: '$name' },
                            substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                            images: 1,
                            rating: 1,
                            total_rating: 1,
                            total_rating_users: 1,
                            size_status: 1
                        }
                    },
                    {
                        $addFields: {
                            // Calculate sales_offer_amount if offer_status is 1
                            sales_offer_amount: {
                                $cond: {
                                    if: { $eq: ["$offer_status", 1] },
                                    then: {
                                        $subtract: [
                                            "$base_price",
                                            { $multiply: ["$offer_amount", { $divide: ["$base_price", 100] }] }
                                        ]
                                    },
                                    else: null // or any default value you prefer if offer_status is not 1
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            substat: 1,
                            images: 1,
                            status: 1,
                            document: "$$ROOT"
                        }
                    },
                    {
                        $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                    }
                ];

                if (userId) {
                    var productQuery = [
                        { $match: condition },
                        { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                        { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
                        { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
                        { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "favourite",
                                let: { product_id: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$user_id", new mongoose.Types.ObjectId(userId)] },
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
                        {
                            $project: {
                                name: 1,
                                image: "$avatar",
                                rcat_id: "$rcategory._id",
                                scat_id: "$scategory._id",
                                description: "$information",
                                category_id: "$rcategory._id",
                                category_name: { $toLower: '$rcategory.rcatname' },
                                scategory: { $toLower: '$scategory.scatname' },
                                brandname: { $toLower: '$brands.brandname' },
                                ratting: { $toLower: '$brands.brandname' },
                                tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
                                attributes: 1,
                                isRecommeneded: 1,
                                is_favourite: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                                itmcat: 1,
                                slug: 1,
                                product_details: 1,
                                visibility: "$status",
                                min_max_price: {
                                    "min_price": "$base_price", "max_price": "$sale_price", "discount_percentage": {
                                        $multiply: [
                                            { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                            100
                                        ]
                                    }
                                },
                                sale_discount: { $subtract: ['$base_price', '$sale_price'] },
                                status: 1,
                                color: 1,
                                base_price: 1,
                                sale_price: 1,
                                sale_price: 1,
                                variant: "$price_details",
                                price_details: 1,
                                quantity: 1,
                                offer_status: 1,
                                offer_amount: 1,
                                sort_name: { $toLower: '$name' },
                                substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                                images: 1,
                                size_status: 1,
                                rating: 1,
                                total_rating: 1,
                                total_rating_users: 1,
                            }
                        },
                        {
                            $addFields: {
                                // Calculate sales_offer_amount if offer_status is 1
                                sales_offer_amount: {
                                    $cond: {
                                        if: { $eq: ["$offer_status", 1] },
                                        then: {
                                            $subtract: [
                                                "$base_price",
                                                { $multiply: ["$offer_amount", { $divide: ["$base_price", 100] }] }
                                            ]
                                        },
                                        else: null // or any default value you prefer if offer_status is not 1
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                substat: 1,
                                images: 1,
                                status: 1,
                                document: "$$ROOT"
                            }
                        }, {
                            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                        }
                    ];
                }

                const documentData = await db.GetAggregation('food', productQuery)
                if (!documentData) {
                    res.send({ "status": 0, "message": 'Something went to wrong.Please try again...' });
                } else {
                    if (documentData.length > 0) {
                        var Productdata = documentData[0].documentData[0];

                        // console.log("------------------Productdata----- at line 202-----------", Productdata.variant)

                        if (Productdata && Productdata.variant?.length > 0) {
                            for (let i = 0; i < Productdata.variant.length; i++) {
                                Productdata.variant[i].image = siteUrl + Productdata.variant[i].image
                            }
                        }
                        Productdata.variant_attributes = [];
                        if (Productdata) {
                            var image = settings.doc.settings.site_url + Productdata.image
                            Productdata.image = image;
                            Productdata.images = Productdata.images.map(el => siteUrl + el);
                            if (Productdata.price_details.length > 0) {
                                Productdata.price_details.forEach(val => {
                                    if (val.image != undefined && val.image != '') {
                                        val.image = settings.doc.settings.site_url + val.image
                                    }



                                    if (val.attributes && val.attributes.length > 0) {
                                        for (var i = 0; i < val.attributes.length; i++) {
                                            var variant = { values: [] };
                                            if (Productdata.variant_attributes && Productdata.variant_attributes.length > 0) {

                                                var n = 0;
                                                for (var j = 0; j < Productdata.variant_attributes.length; j++) {
                                                    if (Productdata.variant_attributes[j].parrent_id === val.attributes[i].parrent_id) {
                                                        var m = 0;
                                                        for (var k = 0; k < Productdata.variant_attributes[j].values.length; k++) {
                                                            if (Productdata.variant_attributes[j].values[k].chaild_id != val.attributes[i].chaild_id) {
                                                                m++;
                                                            }
                                                        }
                                                        if (m === Productdata.variant_attributes[j].values.length) {

                                                            Productdata.variant_attributes[j].values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, "parent_id": val.attributes[i].parrent_id });
                                                        }
                                                    } else {
                                                        n++;
                                                    }
                                                }
                                                if (n === Productdata.variant_attributes.length) {
                                                    // console.log("-----------------------------240------------------")
                                                    // console.log(val.attributes[i])

                                                    // console.log("--------------------------240---------------------")
                                                    variant.parrent_id = val.attributes[i].parrent_id;
                                                    variant.attri_name = val.attributes[i].attri_name;
                                                    variant.values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, "parent_id": val.attributes[i].parrent_id });




                                                    Productdata.variant_attributes.push(variant);
                                                }
                                            } else {

                                                variant.parrent_id = val.attributes[i].parrent_id;
                                                variant.attri_name = val.attributes[i].attri_name;
                                                variant.values.push({ 'chaild_id': val.attributes[i].chaild_id, 'chaild_name': val.attributes[i].chaild_name, "parent_id": val.attributes[i].parrent_id });







                                                Productdata.variant_attributes.push(variant);





                                            }
                                        }
                                    }
                                });
                            }
                            res.send({ "status": 1, "message": 'Successfull.', data: Productdata });

                        } else {
                            res.send({ "status": 0, "message": 'Sorry, product details not available.' });
                        }
                    } else {
                        res.send({ "status": 0, error: true, "message": 'Product is not found !' });
                    }
                }
            }
        } else if (search) {
            // _______________________this is for the search_____________________
            let data = {}
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            const siteUrl = settings.doc.settings.site_url;
            var query = [
                { $match: { 'status': { $eq: 1 }, name: { $regex: search, $options: "i" } } },
                {
                    $lookup: {
                        from: 'rcategory',
                        localField: 'rcategory',
                        foreignField: '_id',
                        as: 'rcategory'
                    }
                },
                {
                    $project: {
                        name: 1,
                        rcategory: 1,
                        scategory: 1,
                        avatar: 1,

                    }
                },
                {
                    $project: {
                        name: 1,
                        category_name: "$rcategory.rcatname",
                        scat_id: "$scategory",
                        image: {
                            $concat: [
                                siteUrl,
                                "$avatar"
                            ]
                        }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 20 }
            ];
            const productlist = await db.GetAggregation('food', query)
            if (productlist && productlist.length > 0) {
                data.status = 1;
                data.message = 'success';
                data.sear_product = productlist;
                res.send(data);
            } else {
                data.status = 0;
                data.message = 'success';
                data.search_product = [];
                res.send(data);
            }
        } else if (filter) {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            const siteUrl = settings.doc.settings.site_url;
            var data = {}

            if (userId) {


                var filterQuery = [
                    { $match: { scategory: new mongoose.Types.ObjectId(req.body.filter), status: 1 } },
                    { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                    { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
                    { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
                    { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "favourite",
                            let: { product_id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$user_id", new mongoose.Types.ObjectId(userId)] },
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
                    {
                        $project: {
                            name: 1,
                            avatar: 1,
                            rcat_id: "$rcategory._id",
                            scat_id: "$scategory._id",
                            description: "$information",
                            category_id: "$rcategory._id",
                            category_name: { $toLower: '$rcategory.rcatname' },
                            scategory: { $toLower: '$scategory.scatname' },
                            brandname: { $toLower: '$brands.brandname' },
                            ratting: { $toLower: '$brands.brandname' },
                            tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
                            attributes: 1,
                            isRecommeneded: 1,
                            is_favourite: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                            itmcat: 1,
                            slug: 1,
                            visibility: "$status",
                            min_max_price: {
                                "min_price": "$base_price", "max_price": "$sale_price",

                            },
                            discount_percentage: {
                                $round: [
                                    {
                                        $multiply: [
                                            { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                            100
                                        ]
                                    }
                                ]

                            },
                            sale_discount: { $subtract: ['$base_price', '$sale_price'] },
                            status: 1,
                            color: 1,
                            base_price: 1,
                            sale_price: 1,
                            sale_price: 1,
                            offer_status: 1,
                            offer_amount: 1,
                            price_details: "$price_details",
                            // price_details: 1,
                            quantity: 1,
                            sort_name: { $toLower: '$name' },
                            substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                            images: 1,
                            size_status: 1,
                            rating: 1,
                            total_rating: 1,
                            total_rating_users: 1,
                        }
                    },
                    {
                        $addFields: {
                            // Calculate sales_offer_amount if offer_status is 1
                            sales_offer_amount: {
                                $cond: {
                                    if: { $eq: ["$offer_status", 1] },
                                    then: {
                                        $subtract: [
                                            "$base_price",
                                            { $multiply: ["$offer_amount", { $divide: ["$base_price", 100] }] }
                                        ]
                                    },
                                    else: null // or any default value you prefer if offer_status is not 1
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            substat: 1,
                            images: 1,
                            rating: 1,
                            total_rating: 1,
                            total_rating_users: 1,
                            status: 1,
                            document: "$$ROOT"
                        }
                    },
                    {
                        $addFields: {
                            "document.price_details": {
                                $map: {
                                    input: "$document.price_details",
                                    as: "priceDetail",
                                    in: {
                                        $mergeObjects: [
                                            "$$priceDetail",
                                            {
                                                discount_percentage: {
                                                    $multiply: [
                                                        { $divide: [{ $subtract: ["$$priceDetail.mprice", "$$priceDetail.sprice"] }, "$$priceDetail.mprice"] },
                                                        100
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                    }
                ]

                let filterdata = await db.GetAggregation('food', filterQuery)

                if (filterdata && filterdata.length > 0 && filterdata[0].documentData && filterdata[0].documentData.length > 0) {

                    filterdata[0].documentData.map(x => {
                        x.avatar = siteUrl + x.avatar
                    })
                }


                if (!filterdata) {

                    data.message = "Something Went Wrong"
                    data.error = true,
                        data.status = 0
                    res.send(data)
                } else {

                    if (filterdata && filterdata.length > 0) {
                        data.message = "Success "
                        data.error = false,
                            data.status = 1
                        data.data = filterdata[0].documentData
                        res.send(data)
                    } else {
                        data.message = "Product Not Found"
                        data.error = true,
                            data.status = 1
                        data.data = []
                        res.send(data)
                    }


                }
            } else {
                var filterQuery = [
                    {
                        $match: { scategory: new mongoose.Types.ObjectId(req.body.filter), status: 1 }
                    },
                    {
                        $project: {
                            name: 1,
                            slug: 1,
                            rcategory: 1,
                            scategory: 1,
                            attributes: 1,
                            // product_details: 1,
                            main_city: 1,
                            tags: 1,
                            isRecommeneded: 1,
                            child_cat_array: 1,
                            itmcat: 1,
                            status: 1,
                            visibility: 1,
                            avatar: 1,
                            hover_image: 1,
                            sales_offer_amount: {
                                $cond: {
                                    if: { $eq: ["$offer_status", 1] },
                                    then: {
                                        $subtract: [
                                            "$base_price",
                                            { $multiply: ["$offer_amount", { $divide: ["$base_price", 100] }] }
                                        ]
                                    },
                                    else: null // or any default value you prefer if offer_status is not 1
                                }
                            },
                            images: 1,
                            size: 1,
                            hotselling: 1,
                            quantity_size: 1,
                            max_price: 1,
                            min_price: 1,
                            information: 1,
                            base_price: 1,
                            sale_price: 1,
                            quantity: 1,
                            product_details: {
                                $map: {
                                    input: "$price_details",
                                    as: "priceDetail",
                                    in: {
                                        $mergeObjects: [
                                            "$$priceDetail",
                                            {
                                                discount_percentage: {
                                                    $round: [
                                                        {
                                                            $multiply: [
                                                                { $divide: [{ $subtract: ["$$priceDetail.mprice", "$$priceDetail.sprice"] }, "$$priceDetail.mprice"] },
                                                                100
                                                            ]
                                                        },
                                                        2 // specify the precision of rounding
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            },
                            offer_status: 1,
                            offer_amount: 1,
                            expensive: 1,
                            rating: 1,
                            total_rating: 1,
                            total_rating_users: 1,
                        }
                    }
                ];


                let filterdata = await db.GetAggregation('food', filterQuery)

                if (filterdata && filterdata.length > 0) {

                    filterdata.map(x => {
                        x.avatar = siteUrl + x.avatar

                    })
                }
                if (!filterdata) {

                    data.message = "Something Went Wrong"
                    data.error = true,
                        data.status = 0
                    res.send(data)
                } else {

                    if (filterdata && filterdata.length > 0) {
                        data.message = "Success "
                        data.error = false,
                            data.status = 1
                        data.data = filterdata
                        res.send(data)
                    } else {
                        data.message = "Data not Found"
                        data.error = true,
                            data.status = 1
                        data.data = []
                        res.send(data)
                    }


                }
            }

            // ______________________________this is for the filter data_____________________________

            // if (userId) {

            // } else {

            // }
            // const query = [
            //     {
            //         $match: {
            //             "category._id": filter
            //         }
            //     },
            //     {
            //         $project: {
            //             _id: 0,
            //             name: "$name",
            //             attribute_values: {
            //                 $map: {
            //                     input: "$units",
            //                     as: "uni",
            //                     in: "$$uni.name"
            //                 }
            //             },
            //             swatche_type: "0",
            //             swatche_value: "0"
            //         }
            //     }
            // ]
            // var condition = {};
            // // var productQuery = [
            // //     { $match: condition },
            // //     { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
            // //     { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
            // //     { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
            // //     { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
            // //     { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
            // //     { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
            // //     {
            // //         $project: {
            // //             name: 1,
            // //             image: "$avatar",
            // //             rcat_id: "$rcategory._id",
            // //             scat_id: "$scategory._id",
            // //             description: "$information",
            // //             category_id: "$rcategory._id",
            // //             category_name: { $toLower: '$rcategory.rcatname' },
            // //             scategory: { $toLower: '$scategory.scatname' },
            // //             brandname: { $toLower: '$brands.brandname' },
            // //             ratting: { $toLower: '$brands.brandname' },
            // //             tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
            // //             attributes: 1,
            // //             isRecommeneded: 1,
            // //             itmcat: 1,
            // //             slug: 1,
            // //             visibility:"$status",
            // //             min_max_price: {
            // //                 "min_price": "$base_price", "max_price": "$sale_price", "discount_percentage": {
            // //                     $multiply: [
            // //                         { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
            // //                         100
            // //                     ]
            // //                 }
            // //             },
            // //             sale_discount: { $subtract: ['$base_price', '$sale_price'] },
            // //             status: 1,
            // //             color: 1,
            // //             base_price: 1,
            // //             sale_price: 1,
            // //             sale_price: 1,
            // //             variant: "$price_details",
            // //             price_details: 1,
            // //             sort_name: { $toLower: '$name' },
            // //             substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
            // //            images:1
            // //         }
            // //     },
            // //     {
            // //         $project: {
            // //             name: 1,
            // //             substat: 1,
            // //             images: 1,
            // //             status: 1,
            // //             document: "$$ROOT"
            // //         }
            // //     }, {
            // //         $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
            // //     }
            // // ];
            // // const documentData = await db.GetAggregation('food', productQuery)
            // // console.log(documentData,'this is the document data in another universe');
            // const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            // const siteUrl = settings.doc.settings.site_url;
            // const filterResult = await db.GetAggregation('attributes', query);
            // const subCategory = await db.GetDocument('scategory', {}, {}, {});

            // function getNestedSubcategoryIds(categoryId, result = []) {
            //     result.push(categoryId.valueOf());
            //     const subs = subCategory.doc.filter(el => el.rcategory == categoryId)
            //     if (subs.length > 0) {
            //         subs.forEach(subcat => {
            //             if (subcat._id) {
            //                 getNestedSubcategoryIds(subcat._id, result);
            //             }
            //         })
            //     }
            //     return result;
            // }
            // const selectedCategory = filter
            // if (selectedCategory) {
            //     const nestedSubcategoryIds = getNestedSubcategoryIds(selectedCategory);
            //     console.log(nestedSubcategoryIds, 'this are nested category is');
            //     const condition = { scategory: { $in: nestedSubcategoryIds } };
            //     const sortField = req.body.sort || 'name';
            //     const sortOrder = req.body.order && req.body.order.toLowerCase() === 'DESC' ? -1 : 1;
            //     let options = {
            //         options: {
            //             sort: { [sortField]: sortOrder },
            //             skip: req.body.offset,
            //             limit: req.body.limit
            //         }
            //     }
            //     const products = await db.GetDocument('food', condition, {}, {})
            //     if (products.doc.length <= 0) {
            //         const condition = { scategory: { $in: nestedSubcategoryIds } };
            //         const sortField = req.body.sort || 'name';
            //         const sortOrder = req.body.order && req.body.order.toLowerCase() === 'DESC' ? -1 : 1;
            //         let options = {
            //             options: {
            //                 sort: { [sortField]: sortOrder },
            //                 skip: req.body.offset,
            //                 limit: req.body.limit
            //             }
            //         }
            //         const products = await db.GetDocument('food', condition, {}, {})
            //         console.log(products, 'this are the products');
            //         if (products.status === false) {
            //             res.send({ message: products.doc })
            //         }
            //         let data = {}
            //         data.message = "Products not Found !"
            //         // data.filters = filterResult;
            //         data.offset = offset;
            //         data.error = true;
            //         data.data = products.doc

            //         res.send(data)
            //     } else {
            //         console.log(products, 'this are the products');
            //         if (products.status === false) {
            //             res.send({ message: products.doc })
            //         }
            //         let data = {}
            //         data.error = false;
            //         data.message = "Products retrieved successfully !"
            //         data.filters = filterResult;
            //         data.offset = offset;
            //         data.data = products.doc

            //         data.data.forEach(product => {
            //             // Update avatar path
            //             if (product.avatar) {
            //                 product.avatar = `${siteUrl}${product.avatar}`;
            //             }

            //             // Update hover_image path
            //             if (product.hover_image) {
            //                 product.hover_image = `${siteUrl}${product.hover_image}`;
            //             }

            //             // Update images array paths
            //             if (product.images && product.images.length > 0) {
            //                 product.images = product.images.map(image => `${siteUrl}${image}`);
            //             }
            //         });
            //         res.send(data)
            //     }
            //     // const products = await db.GetDocument('food', condition, {}, options)

            // } else {
            // }
        }//end
    }

    controller.mobile_filterproducts = async (req, res) => {
        var product_id = req.body.product_id;
        var filter_parent_id = req.body.filter_parent_id
        var filter_id = req.body.filter_id
        var filter_data = {
            data: {}
        }
        var filter_document = await db.GetDocument('food', { '_id': new mongoose.Types.ObjectId(product_id) }, {}, {})
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        let siteUrl = settings.doc.settings.site_url;
        console.log(filter_document, 'filter_document');
        if (!filter_document || !filter_document.doc || filter_document.doc.length === 0) {
            filter_data.error = true
            filter_data.message = "No product"
            res.send(filter_data)
            return; // Exiting the function to avoid further execution
        }

        for (let i = 0; i < filter_document.doc.length; i++) {
            for (let j = 0; j < filter_document.doc[i].price_details.length; j++) {
                if (filter_document.doc[i].price_details[j]._id == filter_id) {
                    filter_data.data.image = siteUrl + filter_document.doc[i].price_details[j].image
                    filter_data.data.quantity = filter_document.doc[i].price_details[j].quantity
                    filter_data.data.mprice = filter_document.doc[i].price_details[j].mprice
                    filter_data.data.sprice = filter_document.doc[i].price_details[j].sprice
                    filter_data.offer_amount = filter_document.doc[0].offer_amount
                    filter_data.data.offer_sprice = filter_data.data.mprice * (filter_document.doc[0].offer_amount / 100)
                    filter_data.data.offerprice = (((filter_document.doc[i].price_details[j].mprice - filter_document.doc[i].price_details[j].sprice) / filter_document.doc[i].price_details[j].mprice) * 100).toFixed(2)
                }
            }
        }

        filter_data.data.offer_status = filter_document.doc[0].offer_status; // Assuming offer_status is the same for all documents
        // filter_data.data.offer_sprice=filter_document.doc[0].base_price*(filter_document.doc[0].offer_amount/100)
        filter_data.error = false
        filter_data.message = "Success"
        res.send(filter_data)
    }


    controller.getproductlist = async function (req, res) {
        var query = {};


        query = { 'status': { $eq: 1 } };






        if (req.body.category && req.body.category != "") {

            categorys = req.body.category;
            if (categorys[0].rcat != undefined && categorys.length > 0) {
                // query["$and"] = [];
                query["$or"] = [];
                var cate_id = [];
                var subcate_id = [];
                for (var i = 0; i < categorys.length; i++) {
                    if (categorys[i].rcat && categorys[i].rcat != undefined) {
                        if (categorys[i].scat && categorys[i].scat != "" && categorys[i].scat != null && categorys[i].scat[0] != null && categorys[i].scat != undefined && categorys[i].scat.length > 0) {

                            cate_id.push(new mongoose.Types.ObjectId(categorys[i].rcat));
                            for (var j = 0; j < categorys[i].scat.length; j++) {
                                query["$or"].push({ $and: [{ 'status': { $eq: 1 } }, { 'child_cat_array': { $in: [new mongoose.Types.ObjectId(categorys[i].scat[j])] } }] });


                            }




                        } else {
                            // cate_id.push(mongoose.Types.ObjectId(categorys[i].rcat));
                            console.log("-------------------------------cmiming through initial  filter else  part")
                            query["$or"].push({ $and: [{ 'rcategory': new mongoose.Types.ObjectId(categorys[i].rcat) }, { 'status': { $eq: 1 } }] });
                        }
                    }
                }
            }
        }
        if (req.body.pricedtl) {

            if (req.body.pricedtl != undefined && req.body.pricedtl.length > 0) {
                // if (!query["$or"]) {
                // 	console.log("-----------comming through $or----")
                // 	query["$or"] = [];
                // }
                // if (!query["$and"]) {
                // 	console.log("-----------comming through $and----")

                // }
                query["$and"] = [];
                var pricedtl = req.body.pricedtl;
                var pricefiltArray = [];

                for (var i = 0; i < pricedtl.length; i++) {

                    pricefiltArray.push({
                        'sale_price': {
                            $lt:
                                parseFloat(pricedtl[i].maxprice), $gt:
                                parseFloat(pricedtl[i].minprice)
                        }
                    });
                }
                // query["$and"].push({$and: pricefiltArray});
                query["$and"].push({ $or: pricefiltArray })
            }
        }



        if (req.body.size_filter && req.body.size_filter.length > 0) {
            let matchArray = req.body.size_filter
            query["$and"] = [];
            query["$and"].push({ $and: [{ 'attributes': { $in: matchArray } }, { 'status': { $eq: 1 } }] });


            console.log("-------------------------------cmiming through size filter")
        }


        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        if (query["$and"] && query["$and"].length == 0) {
            delete query["$and"];
        }

        if (req.body.rating_filter) {
            query.rating = { $gte: Number(req.body.rating_filter) }
        };
        if (req.body.userId) {
            var usersQuery = [
                { $match: query },
                { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
                { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'scategory', localField: "scategory", foreignField: "_id", as: "scategory" } },
                { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'brands', localField: "brandname", foreignField: "_id", as: "brands" } },
                { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "favourite",
                        let: { product_id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$user_id", new mongoose.Types.ObjectId(req.body.userId)] },
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

                {
                    $project: {
                        name: 1,
                        avatar: "$avatar",
                        rcat_id: "$rcategory._id",
                        scat_id: "$scategory._id",
                        description: "$information",
                        category_id: "$rcategory._id",
                        category_name: { $toLower: '$rcategory.rcatname' },
                        scategory: { $toLower: '$scategory.scatname' },
                        brandname: { $toLower: '$brands.brandname' },
                        // ratting: { $toLower: '$brands.brandname' },
                        tags: [{ $toLower: '$rcategory.rcatname' }, { $toLower: '$scategory.scatname' }],
                        attributes: 1,
                        isRecommeneded: 1,
                        is_favourite: { $cond: { if: { $gt: [{ $size: "$favourite" }, 0] }, then: true, else: false } },
                        itmcat: 1,
                        slug: 1,
                        visibility: "$status",
                        min_max_price: {
                            "min_price": "$base_price", "max_price": "$sale_price"


                        },
                        discount_percentage: {
                            $round: {
                                $multiply: [
                                    { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                    100
                                ]
                            }
                        },
                        sale_discount: { $subtract: ['$base_price', '$sale_price'] },
                        status: 1,
                        color: 1,
                        base_price: 1,
                        sale_price: 1,
                        sale_price: 1,
                        variant: "$price_details",
                        price_details: {
                            $map: {
                                input: '$price_details',
                                as: 'priceDetail',
                                in: {
                                    $mergeObjects: [
                                        '$$priceDetail',
                                        {

                                            discount_percentage: {
                                                $cond: {
                                                    if: { $lt: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, 0] },
                                                    then: 0,
                                                    else: {
                                                        $round: {

                                                            $multiply: [

                                                                { $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
                                                                100
                                                            ]
                                                        }
                                                    }

                                                }

                                            }

                                        }
                                    ]
                                }


                            }
                        },
                        quantity: 1,
                        sort_name: { $toLower: '$name' },
                        substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                        images: 1,
                        size_status: 1,
                        rating: 1,
                        total_rating: 1,
                        total_rating_users: 1,
                        offer_status: 1,
                        offer_amount: 1
                    }
                },
                {
                    $project: {
                        name: 1,
                        substat: 1,
                        images: 1,
                        status: 1,
                        document: "$$ROOT"
                    }
                }, {
                    $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                }
            ];
        } else {
            var usersQuery = [{ "$match": query },
            {
                $lookup: {
                    from: 'rcategory',
                    let: {
                        rcategory: "$rcategory",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { "$eq": ["$_id", "$$rcategory"] },
                                        { "$ne": ["$status", 2] },
                                    ]
                                }
                            }
                        }
                    ],
                    as: "rcategory"
                }
            },
            { "$match": { "rcategory": { $ne: [] } } },
            { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'scategory',
                    let: {
                        scategory: "$scategory",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { "$eq": ["$_id", "$$scategory"] },
                                        { "$eq": ["$status", 1] },
                                    ]
                                }
                            }
                        }
                    ],
                    as: "scategory"
                }
            },
            { $unwind: { path: "$scategory", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    name: 1,
                    slug: 1,
                    size: 1,
                    avatar: 1,
                    rcat_id: "$rcategory._id",
                    scat_id: "$scategory._id",
                    rcategory: { $toLower: '$rcategory.rcatname' },
                    scategory: { $toLower: '$scategory.scatname' },
                    // brandname: { $toLower: '$brands.brandname' },
                    isRecommeneded: 1,
                    itmcat: 1,
                    status: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    price_details: {
                        $map: {
                            input: '$price_details',
                            as: 'priceDetail',
                            in: {
                                $mergeObjects: [
                                    '$$priceDetail',
                                    {

                                        discount_percentage: {
                                            $cond: {
                                                if: { $lt: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, 0] },
                                                then: 0,
                                                else: {
                                                    $round: {

                                                        $multiply: [

                                                            { $divide: [{ $subtract: ['$$priceDetail.mprice', '$$priceDetail.sprice'] }, '$$priceDetail.mprice'] },
                                                            100
                                                        ]
                                                    }
                                                }

                                            }

                                        }

                                    }
                                ]
                            }


                        }
                    },
                    quantity: { $ifNull: ["$quantity", 0] },
                    sale_price: 1,
                    base_price: 1,
                    hover_image: 1,
                    createdAt: 1,
                    size_status: 1,
                    quantity_size: 1,
                    rating: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    total_rating: 1,
                    total_rating_users: 1,
                    sort_name: { $toLower: '$name' },
                    substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                    "images": {
                        "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                    },
                    notZero: {
                        $filter: {
                            input: "$quantity_size",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: [
                                            "$$item.status",
                                            1
                                        ]
                                    },
                                    {
                                        $ne: ['$$item.quantity', 0]
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    size: 1,
                    avatar: 1,
                    rcat_id: 1,
                    scat_id: 1,
                    rcategory: 1,
                    scategory: 1,
                    // brandname: { $toLower: '$brands.brandname' },
                    isRecommeneded: 1,
                    itmcat: 1,
                    status: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    price_details: 1,
                    quantity: 1,
                    sale_price: 1,
                    base_price: 1,
                    hover_image: 1,
                    createdAt: 1,
                    size_status: 1,
                    quantity_size: 1,
                    rating: 1,
                    total_rating: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    total_rating_users: 1,
                    sort_name: { $toLower: '$name' },
                    substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                    "images": {
                        "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                    },
                    notZero: 1
                }
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    size: 1,
                    avatar: 1,
                    rcat_id: 1,
                    scat_id: 1,
                    rcategory: 1,
                    scategory: 1,
                    // brandname: { $toLower: '$brands.brandname' },
                    isRecommeneded: 1,
                    itmcat: 1,
                    status: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    price_details: 1,
                    quantity: 1,
                    sale_price: 1,
                    base_price: 1,
                    hover_image: 1,
                    createdAt: 1,
                    size_status: 1,
                    quantity_size: 1,
                    sort_name: 1,
                    substat: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    "images": 1,
                    filterSize: { $ifNull: ['$notZero', []] },
                    rating: 1,
                    total_rating: 1,
                    total_rating_users: 1,
                }
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    size: 1,
                    avatar: 1,
                    rcat_id: 1,
                    scat_id: 1,
                    rcategory: 1,
                    scategory: 1,
                    // brandname: 1,
                    isRecommeneded: 1,
                    itmcat: 1,
                    status: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    price_details: 1,
                    quantity: 1,
                    sale_price: 1,
                    base_price: 1,
                    hover_image: 1,
                    createdAt: 1,
                    sort_name: 1,
                    filterSize: 1,
                    substat: 1,
                    offer_status: 1,
                    offer_amount: 1,
                    "images": 1,
                    size_status: 1,
                    rating: 1,
                    total_rating: 1,
                    total_rating_users: 1,
                    discount_percentage: {
                        $round: [
                            {
                                $multiply: [
                                    { $divide: [{ $subtract: ['$base_price', '$sale_price'] }, '$base_price'] },
                                    100
                                ]
                            }
                        ]
                    },
                    quantity_size: {
                        $filter: {
                            input: "$quantity_size",
                            as: "item",
                            cond: {
                                $eq: ["$$item.status", 1]
                            }
                        }
                    },
                    in_size: { $cond: { if: { $gt: [{ $size: "$filterSize" }, 0] }, then: 1, else: 0 } },
                    no_size: { $cond: { if: { $gt: ["$quantity", 0] }, then: 1, else: 0 } },
                }
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    size: 1,
                    rcategory: 1,
                    substat: 1,
                    images: 1,
                    status: 1,
                    document: "$$ROOT",

                }
            }, {
                $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
            },
            ];
        }


        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            //try {
            //condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            // usersQuery[0]["$match"]["name"] = {$regex: searchs + '.*', $options: 'si'};
            usersQuery.push({ "$match": { $or: [{ "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.scategory": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.brandname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.isRecommeneded": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.itmcat": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
        }

        var sorting = {};

        if (req.body.filter == "lowtohigh") {
            var sorter = 'documentData.sale_price';
            sorting[sorter] = 1;
            usersQuery.push({ $sort: sorting });
        }

        if (req.body.filter == "hightolow") {
            var sorter = 'documentData.sale_price';
            sorting[sorter] = -1;
            usersQuery.push({ $sort: sorting });
        }
        if (req.body.filter == "rathightolow") {
            var sorter = 'documentData.rating';
            sorting[sorter] = -1;
            usersQuery.push({ $sort: sorting });
        }
        if (req.body.filter == "ratlowtohigh") {
            var sorter = 'documentData.rating';
            sorting[sorter] = 1;
            usersQuery.push({ $sort: sorting });
        }



        if (req.body.filter == "latest") {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(40) });
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        };

        var data = {};
        try {
            const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
            if (settings.status === false) {
                res.send({ "status": "0", "errors": "Configure your app settings" });
            } else {
                const docdata = await db.GetAggregation('food', usersQuery)
                if (docdata.length <= 0) {
                    data.status = 1;
                    data.message = 'success';
                    data.count = [];
                    data.productlist = [];
                    res.send(data);
                } else {

                    if (docdata[0].documentData && docdata[0].documentData.length > 0) {

                        for (var i = 0; i < docdata[0].documentData.length; i++) {

                            docdata[0].documentData[i].currency = settings.doc.settings.currency_symbol;
                            if (docdata[0].documentData[i].avatar != undefined) {
                                image = settings.doc.settings.site_url + docdata[0].documentData[i].avatar;
                                docdata[0].documentData[i].avatar = image;
                            } else {
                                docdata[0].documentData[i].avatar = "";
                            }
                            if (docdata[0].documentData[i].hover_image != undefined) {
                                image = settings.doc.settings.site_url + docdata[0].documentData[i].hover_image;
                                docdata[0].documentData[i].hover_image = image;
                            } else {
                                docdata[0].documentData[i].hover_image = "";
                            }
                            if (docdata[0].documentData[i].offer_status == 1) {

                                docdata[0].documentData[i].offer_base = JSON.parse(JSON.stringify(docdata[0].documentData[i].base_price));
                                var offer_price = parseFloat(parseFloat((docdata[0].documentData[i].base_price * docdata[0].documentData[i].offer_amount) / 100).toFixed(2));
                                var sub_price = docdata[0].documentData[i].base_price - offer_price;
                                docdata[0].documentData[i].offer_sale = sub_price > 0 ? sub_price : 0
                            }


                        }

                    }

                    data.status = 1;
                    data.message = 'success';
                    data.count = docdata[0].count;
                    data.productlist = docdata[0].documentData;
                    res.send(data);

                }
            }

        } catch (e) {
            console.log(e, 'this is error');
        }
    }


    return controller;
}





