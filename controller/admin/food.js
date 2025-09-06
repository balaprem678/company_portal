//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");
var multer = require('multer');
var htmlToText = require('html-to-text');
var timezone = require('moment-timezone');
var moment = require("moment");
const xlsx = require('xlsx');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { default: axios } = require('axios');
function isObjectId(n) {
    return mongoose.Types.ObjectId.isValid(n);
}
module.exports = function () {
    var router = {};

    router.Category = function (req, res) {
        var id = new objectId(req.query.id);
        var categoryQuery = [{
            $match: { $or: [{ sub_category: new objectId(req.query.id) }, { parent: new objectId(req.query.parent) }] }
        }, {
            $project: {
                name: 1,
                position: 1,
                parent: 1,
                sub_category: 1,
                status: 1
            }
        }, {
            $project: {
                name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        db.GetAggregation('category', categoryQuery, function (err, docdata) {
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
    };

    // router.getProductlist = function (req, res) {
    //     if (req.body.sort != "") {
    //         var sorted = req.body.sort;
    //     }
    //     var productQuery = [
    //         { "$match": { status: { $ne: 0 } } },
    //         { $lookup: { from: 'restaurant', localField: "shop", foreignField: "_id", as: "shop" } },
    //         { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
    //         {
    //             $project: {
    //                 name: 1,
    //                 avatar: 1,
    //                 shop: 1,
    //                 status: 1,
    //                 dname: { $toLower: '$' + sorted },
    //                 substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
    //                 "images": {
    //                     "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
    //                 }
    //             }
    //         },
    //         {
    //             $project: {
    //                 name: 1,
    //                 shop: 1,
    //                 substat: 1,
    //                 images: 1,
    //                 status: 1,
    //                 document: "$$ROOT"
    //             }
    //         }, {
    //             $group: { _id: "$id", "count": { "$sum": 1 }, deletedCount: { "$sum": "$substat" }, "documentData": { $push: "$document" } }
    //         }];


    //     var sorting = {};
    //     var searchs = '';
    //     var condition = { status: { $ne: 0 } };
    //     if (Object.keys(req.body).length != 0) {
    //         productQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: false } });
    //         if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
    //             condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
    //             searchs = req.body.search;
    //             productQuery.push({ "$match": { $or: [{ "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.shop.name": { $regex: searchs + '.*', $options: 'si' } }] } });
    //         }
    //         if (req.body.sort !== '' && req.body.sort) {
    //             sorting = {};
    //             if (req.body.status == 'false') {
    //                 sorting["documentData.dname"] = -1;
    //                 productQuery.push({ $sort: sorting });
    //             } else {
    //                 sorting["documentData.dname"] = 1;
    //                 productQuery.push({ $sort: sorting });
    //             }
    //         }
    //         if (req.body.filter != '' && req.body.filter != 'undefined' && req.body.filter) {
    //             condition['status'] = { $regex: new RegExp('^' + req.body.filter, 'i') };
    //             searchs = req.body.filter;
    //             productQuery.push({ "$match": { "documentData.status": parseInt(searchs) } });
    //         }
    //         if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
    //             productQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
    //         }
    //         productQuery.push({ $group: { "_id": "$_id", "count": { "$first": "$count" }, "deletedCount": { "$first": "$deletedCount" }, "documentData": { $push: "$documentData" } } });
    //     }
    //     db.GetAggregation('food', productQuery, function (err, docdata) {
    //         if (err) {
    //             res.send(err);
    //         } else {
    //             if (docdata.length != 0) {
    //                 res.send([docdata[0].documentData, docdata[0].count, { "deletedCount": docdata[0].deletedCount }]);
    //             } else {
    //                 res.send([0, 0]);
    //             }
    //         }
    //     });
    // };
    router.getCity = async function (req, res) {

        var getQuery = [{ "$match": { 'status': { $eq: 1 } } },
        {
            $project: {
                updatedAt: 1,
                createdAt: 1,
                cityname: 1,
                sort_cityname: { $toLower: "$cityname" },
                address: 1,
                slug: 1,
                featured: 1,
                image: 1,
                location: 1,
                status: 1,
                extra_fare_settings: 1,
                night_fare_settings: 1,
                reject_fare: 1,
                delivery_charge: 1,
                driver_fare: 1,
                admin_commission: 1,
            }
        },
        {
            $sort: {
                "sort_cityname": 1
            }
        }
        ]
        const docdata = await db.GetAggregation('city', getQuery)
        if (!docdata) {
            res.send('err');
        } else {
            const data = await db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {})
            if (!data) {
                res.send('err');
            } else {
                res.send([docdata, data.doc]);
            }
            // db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send([docdata, data]);
            //     }
            // });
        }
        // db.GetAggregation('city', getQuery, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
        //             if (err) {
        //                 res.send(err);
        //             } else {
        //                 res.send([docdata, data]);
        //             }
        //         });
        //     }
        // });

        /* db.GetDocument('city', { 'status': { $eq: 1 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send([docdata, data]);
                    }
                });
            }
        }); */
    };

    router.getbrandns = async function (req, res) {

        var getQuery = [{ "$match": { 'status': { $eq: 1 } } },
        {
            $project: {
                updatedAt: 1,
                createdAt: 1,
                brandname: 1,
                sort_brandname: { $toLower: "$brandname" },
                slug: 1,
                img: 1
            }
        },
        {
            $sort: {
                "sort_brandname": 1
            }
        }
        ]
        const docdata = await db.GetAggregation('brands', getQuery)
        if (!docdata) {
            res.send('err');
        } else {
            res.send([docdata]);
        }
        // db.GetAggregation('brands', getQuery, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send([docdata]);
        //     }
        // });
    };

    router.catbrandns = function (req, res) {

        var getQuery = [{ "$match": { 'rcategory': new mongoose.Types.ObjectId(req.body.cat_id), 'status': { $eq: 1 } } },
        {
            $project: {
                updatedAt: 1,
                createdAt: 1,
                brandname: 1,
                sort_brandname: { $toLower: "$brandname" },
                slug: 1,
                img: 1
            }
        },
        {
            $sort: {
                "sort_brandname": 1
            }
        }
        ]
        db.GetAggregation('brands', getQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send([docdata]);
            }
        });
    };

    router.getattributes = async function (req, res) {
        // { $match: { arrayField: { $in: [searchString] } } }

        var getQuery = [{ "$match": { $and: [{ 'category._id': new mongoose.Types.ObjectId(req.body.mcat) }, { 'status': { $eq: 1 } }] } },
        {
            $project: {
                updatedAt: 1,
                createdAt: 1,
                name: 1,
                sort_name: { $toLower: "$name" },
                slug: 1,
                img: 1,
                units: 1
            }
        },
        {
            $sort: {
                "sort_name": 1
            }
        }
        ]
        const docdata = await db.GetAggregation('attributes', getQuery)
        console.log(docdata);
        if (!docdata) {
            res.send(err);
        } else {
            res.send([docdata]);
        }
        // db.GetAggregation('attributes', getQuery, function (err, docdata){
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send([docdata]);
        //     }
        // });
    };

    router.getsubCity = async function (req, res) {

        const docdata = await db.GetDocument('city', { '_id': req.body.value, 'status': { $ne: 0 } }, { area_management: 1 }, {})
        if (docdata.status === false) {
            res.send(docdata.doc);
        } else {
            //console.log(docdata[0].area_management)
            // if (typeof docdata != 'undefined' && docdata.length > 0 && typeof docdata[0].area_management != 'undefined' && docdata[0].area_management.length > 0) {
            //     docdata[0].area_management.sort(sortBy('area_name'));
            //     // docdata[0].area_management.sortBy(docdata[0].area_management, (e) => { 
            //     //     return e.area_name 
            //     // })
            // }
            res.send(docdata.doc);
        }
        // db.GetDocument('city', { '_id': req.body.value, 'status': { $ne: 0 } }, { area_management: 1 }, {}, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         //console.log(docdata[0].area_management)
        //         // if (typeof docdata != 'undefined' && docdata.length > 0 && typeof docdata[0].area_management != 'undefined' && docdata[0].area_management.length > 0) {
        //         //     docdata[0].area_management.sort(sortBy('area_name'));
        //         //     // docdata[0].area_management.sortBy(docdata[0].area_management, (e) => { 
        //         //     //     return e.area_name 
        //         //     // })
        //         // }
        //         res.send(docdata);
        //     }
        // });
    };

    // router.getrcategory = async (req, res) => {
    //     var data = {};
    //     const count = await db.GetCount('rcategory', { 'status': { $eq: 1 } })
    //     if ( count < 1) {
    //         data.status = 1;
    //         data.message = 'success';
    //         data.list = [];
    //         res.send(data);
    //     } else {
    //         var eachrun = 30;
    //         var loop = Math.ceil(count / eachrun);
    //         var loopcount = 1;
    //         var categories = [];
    //         async.whilst(
    //             (cb) => {
    //                 cb(null, loopcount <= loop)
    //             },
    //             async (callback) => {
    //                 var limit = eachrun;
    //                 var skip = ((eachrun * loopcount)) - eachrun;
    //                 var query = [
    //                     { $match: { 'status': { $eq: 1 } } },
    //                     { $sort: { rcatname: 1 } },
    //                     { $skip: skip },
    //                     { $limit: limit },
    //                     {
    //                         $project: {
    //                             rcatname: "$rcatname",
    //                             is_cuisine: 1,
    //                             is_fssai: 1
    //                         }
    //                     }
    //                 ];
    //                 const catlist= await db.GetAggregation('rcategory', query)
    //                 console.log(catlist,'this is catlist');
    //                 if (catlist && catlist.length > 0) {
    //                     categories = [...categories, ...catlist];
    //                     loopcount++;
    //                     callback(null, loopcount);
    //                 } else {
    //                     loopcount++;
    //                     callback(null, loopcount);
    //                 }
    //                 // db.GetAggregation('rcategory', query, (err, catlist) => {
    //                 //     if (catlist && catlist.length > 0) {
    //                 //         categories = [...categories, ...catlist];
    //                 //         loopcount++;
    //                 //         callback(null, loopcount);
    //                 //     } else {
    //                 //         loopcount++;
    //                 //         callback(null, loopcount);
    //                 //     }
    //                 // });
    //             },
    //             () => {
    //                 console.log('hi');
    //                 console.log(data,'this is data');
    //                 data.status = 1;
    //                 data.message = 'success';
    //                 data.list = categories;
    //                 res.send(data);
    //             }
    //         );
    //     }
    //     // db.GetCount('rcategory', { 'status': { $eq: 1 } }, (err, count) => {
    //     //     if (err || count < 1) {
    //     //         data.status = 1;
    //     //         data.message = 'success';
    //     //         data.list = [];
    //     //         res.send(data);
    //     //     } else {
    //     //         var eachrun = 30;
    //     //         var loop = Math.ceil(count / eachrun);
    //     //         var loopcount = 1;
    //     //         var categories = [];
    //     //         async.whilst(
    //     //             (cb) => {
    //     //                 cb(null, loopcount <= loop)
    //     //             },
    //     //             (callback) => {
    //     //                 var limit = eachrun;
    //     //                 var skip = ((eachrun * loopcount)) - eachrun;
    //     //                 var query = [
    //     //                     { $match: { 'status': { $eq: 1 } } },
    //     //                     { $sort: { rcatname: 1 } },
    //     //                     { $skip: skip },
    //     //                     { $limit: limit },
    //     //                     {
    //     //                         $project: {
    //     //                             rcatname: "$rcatname",
    //     //                             is_cuisine: 1,
    //     //                             is_fssai: 1
    //     //                         }
    //     //                     }
    //     //                 ];
    //     //                 db.GetAggregation('rcategory', query, (err, catlist) => {
    //     //                     if (catlist && catlist.length > 0) {
    //     //                         categories = [...categories, ...catlist];
    //     //                         loopcount++;
    //     //                         callback(null, loopcount);
    //     //                     } else {
    //     //                         loopcount++;
    //     //                         callback(null, loopcount);
    //     //                     }
    //     //                 });
    //     //             },
    //     //             () => {
    //     //                 data.status = 1;
    //     //                 data.message = 'success';
    //     //                 data.list = categories;
    //     //                 res.send(data);
    //     //             }
    //     //         );
    //     //     }
    //     // });
    // }
    router.getrcategory = async (req, res) => {
        try {
            var data = {};
            const count = await db.GetCount('rcategory', { 'status': { $eq: 1 } });

            if (count < 1) {
                data.status = 1;
                data.message = 'success';
                data.list = [];
                res.send(data);
            } else {
                var eachrun = 30;
                var loop = Math.ceil(count / eachrun);
                var loopcount = 1;
                var categories = [];

                while (loopcount <= loop) {
                    var limit = eachrun;
                    var skip = ((eachrun * loopcount)) - eachrun;
                    var query = [
                        { $match: { 'status': { $eq: 1 } } },
                        { $sort: { rcatname: 1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                rcatname: "$rcatname",
                                slug: '$slug',
                                is_cuisine: 1,
                                is_fssai: 1
                            }
                        }
                    ];
                    // console.log(query, "queryqueryqueryquery");
                    const catlist = await db.GetAggregation('rcategory', query);

                    console.log(catlist, 'this is catlist');

                    if (catlist && catlist.length > 0) {
                        categories = [...categories, ...catlist];
                    }

                    loopcount++;
                }

                // console.log('hi');
                // console.log(data, 'this is data');

                data.status = 1;
                data.message = 'success';
                data.list = categories;
                // console.log(data, 'this is data');
                res.send(data);
            }
        } catch (error) {
            // Handle errors appropriately
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    };

    router.getProductlist = async function (req, res) {
        // var errors = req.validationErrors();
        var query = {};
        var sqry = {};
        console.log(req.body,);

        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        //query = { 'status': { $eq: 1 } };
        // if (req.body.publish == 2) {
        //     query = { 'status': { $eq: 2 } };
        //     sqry = { 'status': { $eq: 2 } };
        // } else if (req.body.publish == 0) {
        //     query = { 'status': { $eq: 0 } };
        //     sqry = { 'status': { $eq: 0 } };
        // } else {
        // }
        if (req.body.filter && req.body.status == 1) {
            query = { 'status': { $in: [1, 2] } };
            sqry = { 'status': 1 };
        } else if (req.body.filter && req.body.status == 2) {
            query = { 'status': { $in: [1, 2] } };
            sqry = { 'status': 2 };
        }

        if (req.body.rcat) {
            query = { $and: [{ 'rcategory': new mongoose.Types.ObjectId(req.body.rcat) }, sqry] };
        }

        if (req.body.scat) {
            query = { $and: [{ 'rcategory': new mongoose.Types.ObjectId(req.body.rcat) }, { 'scategory': new mongoose.Types.ObjectId(req.body.scat) }, sqry] };
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        // if(req.body.rcat && req.body.isRecommeneded == 1){
        //     query = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) }, { 'isRecommeneded': { $eq: 1 } },{ 'status': { $eq: 1 } }] };
        // }
        // if(req.body.rcat && req.body.scat && req.body.isRecommeneded == 1){
        //     query = { $and: [{ 'rcategory': mongoose.Types.ObjectId(req.body.rcat) },{ 'scategory': mongoose.Types.ObjectId(req.body.scat) }, { 'isRecommeneded': { $eq: 1 } },{ 'status': { $eq: 1 } }] };
        // }

        if (req.body.isRecommeneded == 0) {
            query['isRecommeneded'] = { $eq: 0 };
        }
        if (req.body.isRecommeneded == 1) {
            query['isRecommeneded'] = { $eq: 1 };
        }
        if (req.body.city) {
            query['main_city'] = { $in: [req.body.city] }
        }

        if (req.body.brandname) {
            query['brandname'] = { $eq: new mongoose.Types.ObjectId(req.body.brandname) }
        }
        console.log(JSON.stringify(query), 'query');
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
            $project: {
                name: 1,
                avatar: 1,
                rcategory: 1,
                status: 1,
                isRecommeneded: 1,
                slug: 1,
                base_price: 1,
                sale_price: 1,
                createdAt: 1,
                expensive: 1,
                sort_name: { $toLower: '$name' },
                sort_rcatname: { $toLower: '$rcategory.rcatname' },
                dname: { $toLower: '$' + sorted },
                substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                "images": {
                    "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                }
            }
        },
        {
            $project: {
                name: 1,
                rcategory: 1,
                substat: 1,
                images: 1,
                isRecommeneded: 1,
                expensive: 1,
                status: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            //try {
            //condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.rcategory.rcatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.number": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.code": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.last_name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
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
        } else {
            usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(10) });
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        try {
            const docdata = await db.GetAggregation('food', usersQuery)
            if (docdata.length <= 0) {
                res.send([[], 0]);
            } else {
                res.send([docdata[0].documentData, docdata[0].count]);
            }
            // db.GetAggregation('food', usersQuery, function (err, docdata) {
            //     if (err || docdata.length <= 0) {
            //         res.send([[], 0]);
            //     } else {
            //         res.send([docdata[0].documentData, docdata[0].count]);

            //     }
            // });
        } catch (e) {
        }
    };



    router.exportProductlist = async function (req, res, next) {
        let query = {};

        // Filtering logic based on request body
        if (req.body.filter && req.body.status == 1) {
            query = { 'status': { $in: [1, 2] } };
        } else if (req.body.filter && req.body.status == 2) {
            query = { 'status': { $in: [1, 2] } };
        }
        if (req.body.rcat) {
            query['rcategory'] = new mongoose.Types.ObjectId(req.body.rcat);
        }
        if (req.body.scat) {
            query['scategory'] = new mongoose.Types.ObjectId(req.body.scat);
        }
        if (req.body.isRecommeneded != null) {
            query['isRecommeneded'] = req.body.isRecommeneded;
        }
        if (req.body.city) {
            query['main_city'] = { $in: [req.body.city] };
        }
        if (req.body.brandname) {
            query['brandname'] = new mongoose.Types.ObjectId(req.body.brandname);
        }

        try {
            const productList = await db.GetAggregation('food', [
                { "$match": query },
                {
                    $lookup: {
                        from: 'rcategory',
                        let: { rcategory: "$rcategory" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { "$eq": ["$_id", "$$rcategory"] },
                                            { "$ne": ["$status", 2] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "rcategory"
                    }
                },
                { "$unwind": { path: "$rcategory", preserveNullAndEmptyArrays: true } },
                { "$unwind": { path: "$price_details", preserveNullAndEmptyArrays: true } },
            
                {
                    $project: {
                        name: 1,
                        sale_price: { $ifNull: ["$price_details.sprice", "$sale_price"] }, // Fallback to the existing sale_price if no price_details
                        base_price: { $ifNull: ["$price_details.mprice", "$base_price"] }, // Fallback to the existing sale_price if no price_details
                        status: 1,
                        createdAt: 1,
                        sku: { $ifNull: ["$price_details.sku", "$sku"] }, // Fallback to "No SKU" if no price_details
                        unit: { $ifNull: ["$price_details.unit", "No Unit"] }, // Fallback to "No Unit" if no price_details
                        quantity: { $ifNull: ["$price_details.quantity", "$quantity"] }, // Fallback to 0 if no price_details
                        rcategory: 1,
                        price_details: 1,
                        isRecommeneded: 1,
                    }
                }
            ]);
            
            // return res.send(productList)
            const formattedProductList = productList.map(product => ({
                ...product,
                status: product.status === 1 ? 'Active' : product.status === 2 ? 'Inactive' : '',
                createdAt: new Date(product.createdAt).toLocaleDateString('en-GB') // Format as DD/MM/YYYY
            }));

            // Prepare the CSV fields and data
            const fields = [
                { label: 'Name', value: 'name' },
                { label: 'Unit', value: 'unit' },
                { label: 'Quantity', value: 'quantity' },
                { label: 'Sku', value: 'sku' },
                { label: 'Sale Price', value: 'sale_price' },
                { label: 'Base Price', value: 'base_price' },
                { label: 'Published', value: 'createdAt' },
                { label: 'Status', value: 'status' }
            ];

            // Send the data and fields to the middleware for CSV export
            req.fields = fields;
            req.data = formattedProductList;  // Assuming `productList` is an array of objects

            next(); // Proceed to the CSV export middleware
        } catch (err) {
            console.error("Error fetching product list:", err);
            res.status(500).send("Error exporting product list");
        }
    }

    router.getProductlist_deals = async function (req, res) {
        var query = {};
        var sqry = {};
        console.log(req.body);

        // Handle filter and status
        if (req.body.filter && req.body.status == 1) {
            query = { 'status': { $in: [1, 2] } };
            sqry = { 'status': 1 };
        } else if (req.body.filter && req.body.status == 2) {
            query = { 'status': { $in: [1, 2] } };
            sqry = { 'status': 2 };
        }

        // Handle multiple category selections for rcat
        if (req.body.rcat && Array.isArray(req.body.rcat)) {
            query = {
                $and: [
                    { 'rcategory': { $in: req.body.rcat.map(id => new mongoose.Types.ObjectId(id)) } },
                    sqry
                ]
            };
        }

        // Handle sub-category (scat) if provided
        if (req.body.scat) {
            query = {
                $and: [
                    { 'rcategory': { $in: req.body.rcat.map(id => new mongoose.Types.ObjectId(id)) } },
                    { 'scategory': new mongoose.Types.ObjectId(req.body.scat) },
                    sqry
                ]
            };
        }

        // Handle recommended products
        if (req.body.isRecommeneded === 0) {
            query['isRecommeneded'] = { $eq: 0 };
        } else if (req.body.isRecommeneded === 1) {
            query['isRecommeneded'] = { $eq: 1 };
        }

        // Handle filtering by city
        if (req.body.city) {
            query['main_city'] = { $in: [req.body.city] };
        }

        // Handle filtering by brand name
        if (req.body.brandname) {
            query['brandname'] = { $eq: new mongoose.Types.ObjectId(req.body.brandname) };
        }

        console.log(JSON.stringify(query), 'query');

        // Building aggregation pipeline for products
        var usersQuery = [
            { "$match": query },
            {
                $lookup: {
                    from: 'rcategory',
                    let: { rcategory: "$rcategory" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { "$eq": ["$_id", "$$rcategory"] },
                                        { "$ne": ["$status", 2] }
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
                $project: {
                    name: 1,
                    avatar: 1,
                    rcategory: 1,
                    status: 1,
                    isRecommeneded: 1,
                    base_price: 1,
                    sale_price: 1,
                    createdAt: 1,
                    expensive: 1,
                    sort_name: { $toLower: '$name' },
                    sort_rcatname: { $toLower: '$rcategory.rcatname' },
                    dname: { $toLower: '$' + (req.body.sort ? req.body.sort.field : 'name') },
                    substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                    "images": {
                        "$cond": [
                            { "$eq": ["$images", []] },
                            [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }],
                            "$images"
                        ]
                    }
                }
            },
            {
                $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$$ROOT" } }
            }
        ];

        // Search functionality
        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({
                "$match": {
                    $or: [
                        { "documentData.name": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.rcategory.rcatname": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.phone.number": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.phone.code": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.last_name": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }
                    ]
                }
            });

            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
        }

        // Sorting
        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }

        // Pagination
        if (req.body.limit && req.body.skip >= 0 && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': parseInt(0) }, { '$limit': parseInt(10) });
        }

        // Final grouping
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        // Execute the aggregation
        try {
            const docdata = await db.GetAggregation('food', usersQuery);
            if (docdata.length <= 0) {
                res.send([[], 0]);
            } else {
                res.send([docdata[0].documentData, docdata[0].count]);
            }
        } catch (e) {
            console.error("Error during aggregation", e);
            res.status(500).send("Internal server error");
        }
    };



    router.getRestaurantCategory = function (req, res) {
        var resultData = { mainCategoryList: [] };
        var request = {};
        request.restaurantId = req.body.id;
        if (typeof req.body.id != 'undefined') {
            if (isObjectId(req.body.id)) {
                request.restaurantId = new mongoose.Types.ObjectId(req.body.id);
            } else {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!", mainCategoryList: {} });
                return;
            }
        } else {
            res.send({ status: "0", "errors": "Restaurant id is wrong..!", mainCategoryList: {} });
            return;
        }
        var categoryQuery = [{ "$match": { status: { $eq: 1 }, 'restaurant': request.restaurantId, 'mainparent': 'yes' } }];
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
            if (docdata && docdata.length > 0) {
                resultData.mainCategoryList = docdata;
                resultData.status = '1';
                resultData.errors = '';
                res.send(resultData);
            } else {
                resultData.status = '0';
                resultData.errors = 'Restaurant id is wrong..!';
                res.send(resultData);

            }
        });
    }

    router.getSubCategoryDetails = function (req, res) {
        var resultData = { subCategoryList: [], categoryDetails: {}, isAvalibleSubCateory: 0 };
        var request = {};
        request.categoryId = req.body.id;
        if (typeof req.body.id != 'undefined') {
            if (isObjectId(req.body.id)) {
                request.categoryId = new mongoose.Types.ObjectId(req.body.id);
            } else {
                res.send({ status: "0", "errors": "Category id is wrong..!", subCategoryList: [], categoryDetails: {}, isAvalibleSubCateory: 0 });
                return;
            }
        } else {
            res.send({ status: "0", "errors": "Category id is wrong..!", subCategoryList: [], categoryDetails: {}, isAvalibleSubCateory: 0 });
            return;
        }
        request.restaurantId = req.body.restaurantId;
        if (typeof req.body.restaurantId != 'undefined') {
            if (isObjectId(req.body.restaurantId)) {
                request.restaurantId = new mongoose.Types.ObjectId(req.body.restaurantId);
            } else {
                res.send({ status: "0", "errors": "Restaurant id is wrong..!", mainCategoryList: {} });
                return;
            }
        } else {
            res.send({ status: "0", "errors": "Restaurant id is wrong..!", mainCategoryList: {} });
            return;
        }
        var categoryQuery = [
            { "$match": { status: { $eq: 1 }, 'restaurant': request.restaurantId, _id: request.categoryId } },
            {
                $project: {
                    _id: "$_id",
                    restaurant: "$restaurant",
                    name: "$name",
                    status: "$status",
                    has_child: "$has_child",
                    mainparent: "$mainparent",
                    parent: "$parent",
                }
            },
            {
                $lookup: {
                    from: "categories",
                    let: {
                        parentId: "$_id",
                        restaurantId: "$restaurant",
                    },
                    pipeline: [
                        { $match: { parent: { $exists: true }, status: { $eq: 1 }, "$expr": { "$eq": ["$restaurant", "$$restaurantId"], "$eq": ["$parent", "$$parentId"] } } },
                        {
                            $project: {
                                _id: "$_id",
                                restaurant: "$restaurant",
                                name: "$name",
                                status: "$status",
                                has_child: "$has_child",
                                mainparent: "$mainparent",
                                parent: "$parent",
                            }
                        }
                    ],
                    as: "subCategoryList"
                }
            },
            {
                $project: {
                    _id: "$_id",
                    restaurant: "$restaurant",
                    name: "$name",
                    status: "$status",
                    has_child: "$has_child",
                    mainparent: "$mainparent",
                    subCategoryList: "$subCategoryList",
                }
            },
            {
                $lookup: {
                    from: "categories",
                    let: {
                        parentId: "$_id",
                        restaurantId: "$restaurant",
                    },
                    pipeline: [
                        { $match: { parent: { $exists: true }, "$expr": { "$eq": ["$restaurant", "$$restaurantId"], "$eq": ["$parent", "$$parentId"] } } },
                        { $limit: 1 },
                        { '$count': "count" }
                    ],
                    as: "isAvalibleSubCateory"
                }
            },
            { $unwind: { path: "$isAvalibleSubCateory", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    categoryDetails: {
                        _id: "$_id",
                        restaurant: "$restaurant",
                        name: "$name",
                        status: "$status",
                        has_child: "$has_child",
                        mainparent: "$mainparent"
                    },
                    subCategoryList: "$subCategoryList",
                    isAvalibleSubCateory: { "$cond": [{ $and: [{ $ne: [{ "$ifNull": ["$isAvalibleSubCateory.count", ''] }, ''] }] }, "$isAvalibleSubCateory.count", 0] },
                }
            },
        ];
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
            if (docdata && docdata.length > 0) {
                resultData.categoryDetails = {};
                if (typeof docdata[0].categoryDetails != 'undefined') {
                    resultData.categoryDetails = docdata[0].categoryDetails;
                }
                if (typeof docdata[0].subCategoryList != 'undefined' && docdata[0].subCategoryList.length > 0) {
                    resultData.subCategoryList = docdata[0].subCategoryList;
                }
                if (typeof docdata[0].isAvalibleSubCateory != 'undefined') {
                    resultData.isAvalibleSubCateory = docdata[0].isAvalibleSubCateory;
                }
                resultData.status = '1';
                resultData.errors = '';
                res.send(resultData);
            } else {
                resultData.categoryDetails = {};
                resultData.subCategoryList = [];
                resultData.isAvalibleSubCateory = 0;
                resultData.status = '1';
                resultData.errors = 'Restaurant id is wrong..!';
                res.send(resultData);
            }
        });
    }

    router.getFoodDetails = async function (req, res) {
        var resultData = { foodDetails: {} };
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = req.body.client_offset;
        }
        var request = {};

        if (typeof req.body.id != 'undefined' && req.body.id != '') {
            if (isObjectId(req.body.id)) {
                request.foodId = new mongoose.Types.ObjectId(req.body.id);
            } else {
                res.send({ status: "0", "errors": "Product id is wrong..!", foodDetails: {} });
                return;
            }
        }
        const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
        if (settings.status == false) {
            res.send({ "status": 0, "errors": 'Error in settings' });
        } else {
            if (typeof request.foodId != 'undefined') {
                var Foodcondition = [
                    {
                        $match: { '_id': request.foodId }
                    },
                    {
                        $project: {
                            foodDetails: {
                                attributes: 1,
                                price_details: "$price_details",
                                price_details1: "$price_details1",
                                avatar: "$avatar",
                                rcategory: "$rcategory",
                                quantity: "$quantity",
                                scategory: "$scategory",
                                product_details: "$product_details",
                                brandname: "$brandname",
                                sub_city: "$sub_city",
                                main_city: "$main_city",
                                description: "$description",
                                createdAt: "$createdAt",
                                mainParent: "$mainParent",
                                food_time: "$food_time",
                                name: "$name",
                                main_pack: "$main_pack",
                                recommended: "$recommended",
                                offer: "$offer",
                                slug: "$slug",
                                isRecommeneded: "$isRecommeneded",
                                size_status: "$size_status",
                                status: "$status",
                                visibility: "$visibility",
                                updatedAt: "$updatedAt",
                                tags: "$tags",
                                base_price: "$base_price",
                                itmcat: "$itmcat",
                                _id: "$_id",
                                hover_image: "$hover_image",
                                information: "$information",
                                sale_price: "$sale_price",
                                child_cat_array: "$child_cat_array",
                                offer_status: "$offer_status",
                                images: "$images",
                                offer_amount: "$offer_amount",
                                return_days: "$return_days",
                                meta: "$meta",
                                sku: "$sku",
                                Product_ingredients: "$Product_ingredients",
                                alternative_name: "$alternative_name",
                                receipes_cook: "$receipes_cook",
                                HealthBenefit_List: "$HealthBenefit_List",
                                product_descriptions: "$product_descriptions",
                                vegOptions: "$vegOptions",
                                recipe_name: "$recipe_name",
                                recipe_ingredients: "$recipe_ingredients",
                                cooking_instructions: "$cooking_instructions",
                                faq_details: "$faq_details",
                                trade_mark_image: "$trade_mark_image",
                                image_alt : "$image_alt",
                                combo:'$combo',
                                tax: { $ifNull: ["$tax", 0] }

                            }
                        }
                    }

                ];
                const docdata = await db.GetAggregation('food', Foodcondition);
                if (!docdata) {
                    resultData.status = '0';
                    resultData.errors = 'Product id is wrong..!';

                    res.send(resultData);
                } else {
                    var id = []
                    if (typeof docdata != 'undefined' && docdata.length > 0) {
                        if (typeof docdata[0].foodDetails != 'undefined') {
                            resultData.foodDetails = docdata[0].foodDetails;
                            var server_offset = (new Date).getTimezoneOffset();
                            var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
                            if (typeof resultData.foodDetails != 'undefined') {

                                if (typeof resultData.foodDetails.avatar == 'undefined') {
                                    resultData.foodDetails.avatar = CONFIG.DIRECTORY_USERS;
                                }
                                /* if(typeof resultData.foodDetails.avatar != 'undefined'){
                                    var avartar = resultData.foodDetails.avatar.split("./")[1]
                                    resultData.foodDetails.avatar = settings.settings.site_url+ avartar;
                                } */
                            }
                        }

                        // if(docdata[0].scategory){
                        console.log("hi how can I help you");
                        console.log(docdata[0].foodDetails.scategory, 'this is docdata fi');
                        let scat = docdata[0].foodDetails.scategory
                        const id = [scat];
                        console.log(id, 'id array');
                        while (scat != undefined) {
                            const dup = await db.GetOneDocument('scategory', { _id: new mongoose.Types.ObjectId(scat) }, {}, {})
                            console.log(dup, 'this is the dup');
                            scat = dup.doc.rcategory;
                            id.push(scat)
                        }
                        console.log(id, 'id array test two');

                        // }
                        resultData.scatId = id;
                        resultData.status = '1';
                        resultData.errors = '';

                        res.send(resultData);
                    } else {
                        resultData.status = '1';
                        resultData.errors = '';
                        res.send(resultData);
                    }
                }
                // db.GetAggregation('food', Foodcondition, function (err, docdata) {

                //     if (err || !docdata) {
                //         resultData.status = '0';
                //         resultData.errors = 'Product id is wrong..!';
                //         res.send(resultData);
                //     } else {
                //         if (typeof docdata != 'undefined' && docdata.length > 0) {
                //             if (typeof docdata[0].foodDetails != 'undefined') {
                //                 resultData.foodDetails = docdata[0].foodDetails;
                //                 var server_offset = (new Date).getTimezoneOffset();
                //                 var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
                //                 if (typeof resultData.foodDetails != 'undefined') {

                //                     if (typeof resultData.foodDetails.avatar == 'undefined') {
                //                         resultData.foodDetails.avatar = CONFIG.DIRECTORY_USERS;
                //                     }
                //                     /* if(typeof resultData.foodDetails.avatar != 'undefined'){
                //                         var avartar = resultData.foodDetails.avatar.split("./")[1]
                //                         resultData.foodDetails.avatar = settings.settings.site_url+ avartar;
                //                     } */
                //                 }
                //             }

                //             resultData.status = '1';
                //             resultData.errors = '';
                //             res.send(resultData);
                //         } else {
                //             resultData.status = '1';
                //             resultData.errors = '';
                //             res.send(resultData);
                //         }
                //     }
                // })
            } else {

                resultData.status = '1';
                resultData.errors = '';
                res.send(resultData);
            }
        }
        // db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
        //     if (err) {
        //         res.send({ "status": 0, "errors": 'Error in settings' });
        //     } else {
        //         if (typeof request.foodId != 'undefined') {
        //             var Foodcondition = [
        //                 { $match: { '_id': request.foodId } },
        //                 {
        //                     $project: {
        //                         foodDetails: {
        //                             price_details: "$price_details",
        //                             price_details1: "$price_details1",
        //                             avatar: "$avatar",
        //                             rcategory: "$rcategory",
        //                             scategory: "$scategory",
        //                             brandname: "$brandname",
        //                             attributes: "$attributes",
        //                             attributes1: "$attributes1",
        //                             main_city: "$main_city",
        //                             sub_city: "$sub_city",
        //                             createdAt: "$createdAt",
        //                             description: "$description",
        //                             food_time: "$food_time",
        //                             mainParent: "$mainParent",
        //                             main_pack: "$main_pack",
        //                             name: "$name",
        //                             offer: "$offer",
        //                             recommended: "$recommended",
        //                             isRecommeneded: "$isRecommeneded",
        //                             slug: "$slug",
        //                             status: "$status",
        //                             tags: "$tags",
        //                             updatedAt: "$updatedAt",
        //                             visibility: "$visibility",
        //                             _id: "$_id",
        //                             itmcat: "$itmcat",
        //                             base_price: "$base_price",
        //                             sale_price: "$sale_price",
        //                             images: "$images",
        //                             hover_image: "$hover_image",
        //                             product_details: "$product_details",
        //                             information: "$information",
        //                             quantity: "$quantity",
        //                             offer_status: "$offer_status",
        //                             offer_amount: "$offer_amount",
        //                             size: "$size",
        //                             size_status: "$size_status",
        //                             quantity_size: "$quantity_size",

        //                         }
        //                     }
        //                 },
        //                 {
        //                     $project: {
        //                         foodDetails: "$foodDetails"
        //                     }
        //                 },

        //                 {
        //                     $project: {
        //                         foodDetails: {
        //                             price_details: "$foodDetails.price_details",
        //                             price_details1: "$foodDetails.price_details1",
        //                             avatar: "$foodDetails.avatar",
        //                             main_city: "$foodDetails.main_city",
        //                             sub_city: "$foodDetails.sub_city",
        //                             brandname: "$foodDetails.brandname",
        //                             rcategory: "$foodDetails.rcategory",
        //                             scategory: "$foodDetails.scategory",
        //                             attributes: "$foodDetails.attributes",
        //                             attributes1: "$foodDetails.attributes1",
        //                             createdAt: "$foodDetails.createdAt",
        //                             description: "$foodDetails.description",
        //                             name: "$foodDetails.name",
        //                             recommended: "$foodDetails.recommended",
        //                             isRecommeneded: "$foodDetails.isRecommeneded",
        //                             slug: "$foodDetails.slug",
        //                             status: "$foodDetails.status",
        //                             tags: "$foodDetails.tags",
        //                             updatedAt: "$foodDetails.updatedAt",
        //                             visibility: "$foodDetails.visibility",
        //                             _id: "$foodDetails._id",
        //                             itmcat: "$foodDetails.itmcat",
        //                             base_price: "$foodDetails.base_price",
        //                             sale_price: "$foodDetails.sale_price",
        //                             images: "$foodDetails.images",
        //                             hover_image: "$foodDetails.hover_image",
        //                             product_details: "$foodDetails.product_details",
        //                             information: "$foodDetails.information",
        //                             quantity: "$foodDetails.quantity",
        //                             offer_status: "$foodDetails.offer_status",
        //                             offer_amount: "$foodDetails.offer_amount",
        //                             size: "$foodDetails.size",
        //                             size_status: "$foodDetails.size_status",
        //                             quantity_size: "$foodDetails.quantity_size",

        //                         }
        //                     }
        //                 }
        //             ];
        //             db.GetAggregation('food', Foodcondition, function (err, docdata) {

        //                 if (err || !docdata) {
        //                     resultData.status = '0';
        //                     resultData.errors = 'Product id is wrong..!';
        //                     res.send(resultData);
        //                 } else {
        //                     if (typeof docdata != 'undefined' && docdata.length > 0) {
        //                         if (typeof docdata[0].foodDetails != 'undefined') {
        //                             resultData.foodDetails = docdata[0].foodDetails;
        //                             var server_offset = (new Date).getTimezoneOffset();
        //                             var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
        //                             if (typeof resultData.foodDetails != 'undefined') {

        //                                 if (typeof resultData.foodDetails.avatar == 'undefined') {
        //                                     resultData.foodDetails.avatar = CONFIG.DIRECTORY_USERS;
        //                                 }
        //                                 /* if(typeof resultData.foodDetails.avatar != 'undefined'){
        //                                     var avartar = resultData.foodDetails.avatar.split("./")[1]
        //                                     resultData.foodDetails.avatar = settings.settings.site_url+ avartar;
        //                                 } */
        //                             }
        //                         }

        //                         resultData.status = '1';
        //                         resultData.errors = '';
        //                         res.send(resultData);
        //                     } else {
        //                         resultData.status = '1';
        //                         resultData.errors = '';
        //                         res.send(resultData);
        //                     }
        //                 }
        //             })
        //         } else {

        //             resultData.status = '1';
        //             resultData.errors = '';
        //             res.send(resultData);
        //         }
        //     }
        // })
    }

    router.edit = function (req, res) {
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = req.body.client_offset;
        }
        //console.log(req.body.id)
        var options = {};
        db.GetDocument('food', { _id: req.body.id }, {}, {}, function (err, docdata) {
            //  console.log(docdata)
            if (err) {
                res.send(err);
            } else {
                // var server_offset = (new Date).getTimezoneOffset();
                // var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
                // if (typeof docdata != 'undefined' && docdata.length > 0) {
                //     if (typeof docdata[0].food_time != 'undefined') {
                //         if (typeof docdata[0].food_time.from_time != 'undefined') {
                //             docdata[0].food_time.from_time = new Date(new Date(docdata[0].food_time.from_time).getTime() + diff_offset);
                //         }
                //         if (typeof docdata[0].food_time.to_time != 'undefined') {
                //             docdata[0].food_time.to_time = new Date(new Date(docdata[0].food_time.to_time).getTime() + diff_offset);
                //         }
                //     }
                // }
                if (docdata[0].categories.length > 0) {

                    res.send(docdata)
                    return

                    db.GetOneDocument('categories', { _id: docdata[0].categories[0].category }, { name: 1 }, {}, function (err, catdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            /*var cat = [catdata]
                            var respo = [];
                            for (var i = 0; i < docdata.length; i++) {
                                respo.push({
                                    'docdata': docdata[i].seo,
                                    'tags': docdata[i].tags,
                                    'categories': docdata[i].categories,
                                    'categorylist': cat,
                                    'status': docdata[i].status,
                                    'visibility': docdata[i].visibility,
                                    'base_pack': docdata[i].base_pack,
                                    'addons': docdata[i].addons,
                                    'offer': docdata[i].offer,
                                    'food_time': docdata[i].food_time,
                                    'avatar': docdata[i].avatar,
                                    'price': docdata[i].price,
                                    'shop': docdata[i].shop,
                                    'description': docdata[i].description,
                                    'slug': docdata[i].slug,
                                    'name': docdata[i].name,
                                    'createdAt': docdata[i].createdAt,
                                    'updatedAt': docdata[i].updatedAt,
                                    '_id': docdata[i]._id
                                })
                            }*/

                            res.send(docdata)
                        }
                    });
                } else {
                    res.send([])
                }
            }
        });
    };

    router.getParent = function (req, res) {
        db.GetOneDocument('food', { _id: req.body.value }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.categories.length > 0) {
                    var getCategory = [];
                    db.GetOneDocument('categories', { '_id': docdata.categories[0].category }, {}, {}, function (err, secdoc) {
                        if (err) {
                            res.send(err);
                        } else {
                            if (secdoc && typeof secdoc != 'undefined' && (typeof secdoc.parent == 'undefined' || secdoc.parent == null)) {
                                if (typeof secdoc != 'undefined' && typeof secdoc.name != 'undefined') {
                                    var data = { name: secdoc.name, _id: secdoc._id };
                                    getCategory.push(data);
                                    res.send(getCategory);
                                } else {
                                    res.send([]);
                                    return;
                                }
                            } else {
                                if (typeof secdoc != 'undefined' && typeof secdoc.name != 'undefined') {
                                    db.GetOneDocument('categories', { '_id': secdoc.parent }, {}, {}, function (err, mainCate) {
                                        if (err) {
                                            res.send(err);
                                            return;
                                        } else {
                                            if (typeof mainCate != 'undefined' && typeof mainCate.name != 'undefined') {
                                                var data = { name: mainCate.name, _id: mainCate._id };
                                                getCategory.push(data);
                                                var data = { name: secdoc.name, _id: secdoc._id };
                                                getCategory.push(data);
                                                res.send(getCategory);
                                            } else {
                                                var data = { name: secdoc.name, _id: secdoc._id };
                                                getCategory.push(data);
                                                res.send(getCategory);
                                            }
                                        }
                                    })
                                } else {
                                    res.send([]);
                                    return;
                                }
                            }
                        }
                    });
                } else {
                    res.send([]);
                }
            }
        });
    };


    router.exditcategoryList = function (req, res) {
        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                name: 1,
                position: 1,
                parent: 1,
                sub_category: 1,
                status: 1,
                dname: { $toLower: '$' + sorted },
                dna: { $cond: { if: { $eq: [{ $strcasecmp: ['$' + sorted, { $toLower: "$position" }] }, 0] }, then: '$' + sorted, else: { $toLower: '$' + sorted } } }
            }
        }, {
            $project: {
                name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';
        var condition = { status: { $ne: 0 } };
        if (Object.keys(req.query).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['name'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                categoryQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    categoryQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    categoryQuery.push({ $sort: sorting });
                }
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('category', categoryQuery, function (err, docdata) {
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
    };

    router.restDetails = function (req, res) {
        var categoryQuery = [
            {
                "$match": { status: { $eq: 1 }, '_id': new mongoose.Types.ObjectId(req.body.value) },

            },
            {
                "$project": {
                    restaurantname: 1,
                    status: 1,
                    username: 1

                }
            }];
        db.GetAggregation('restaurant', categoryQuery, function (err, docdata) {
            if (docdata.length > 0) {
                if (err) {
                    res.send(err);
                }
                else {
                    res.send([docdata]);
                }
            }
            else {
                res.send([0]);
            }
        });
    };

    router.categoryList = function (req, res) {
        /* var categoryQuery = [{
             "$match": { status: { $ne: 0 }, '_id': new mongoose.Types.ObjectId(req.query.id) }
         },
         { $unwind: "$categories" },
         { "$lookup": { from: "category", localField: "categories", foreignField: "_id", as: "categories" } },
         { $unwind: "$categories" },
         { $unwind: "$categories.ancestors" },
         { "$lookup": { from: "category", localField: "categories.ancestors", foreignField: "_id", as: "menu" } },
         { $unwind: "$menu" },
         {
             $group: { "_id": null, 'menu': { '$addToSet': '$menu' } }
         }
         ];
 
         db.GetAggregation('restaurant', categoryQuery, function (err, docdata) {
             if (docdata.length > 0) {
                 if (err) {
                     res.send(err);
                 }
                 else {
                     var options = {};
                     options.populate = 'categories'
                     db.GetOneDocument('restaurant', { '_id': req.query.id }, {}, options, function (err, secdoc) {
                         res.send([docdata, secdoc.categories]);
                     });
                 }
             }
             else {
                 res.send([0, 0]);
             }
         });*/

        var categoryQuery = [{ "$match": { status: { $eq: 1 }, 'restaurant': new mongoose.Types.ObjectId(req.query.id), 'mainparent': 'yes' } }];
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
            if (docdata.length > 0) {
                if (err) {
                    res.send(err);
                }
                else {
                    res.send([docdata]);
                }
            }
            else {
                res.send([0]);
            }
        });
    };

    router.foodList = function (req, res) {
        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }
        var shopQuery = [
            { $lookup: { from: 'food', localField: "_id", foreignField: "shop", as: "id" } }, {
                $project: {
                    restaurantname: 1,
                    username: 1,
                    name: 1,
                    shop_owner: 1,
                    id: 1,
                    status: 1,
                    favorite_status: 1,
                    dname: { $toLower: '$' + sorted },
                    shop_status: {
                        $let: {
                            vars: {
                                pendingCount: { $cond: { if: { $eq: ["$status", 3] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                                activeCount: { $cond: { if: { $eq: ["$status", 1] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                                inactiveCount: { $cond: { if: { $eq: ["$status", 2] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                                deletedCount: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } }
                            },
                            in: { pendingCount: "$$pendingCount", activeCount: "$$activeCount", inactiveCount: "$$inactiveCount", deletedCount: "$$deletedCount" }
                        }
                    }
                }
            }, {
                $project: {
                    name: 1,
                    shop_status: 1,
                    document: "$$ROOT"
                }
            }, {
                $group: { "_id": null, "count": { "$sum": 1 }, pendingCount: { "$sum": "$shop_status.pendingCount" }, activeCount: { "$sum": "$shop_status.activeCount" }, inactiveCount: { "$sum": "$shop_status.inactiveCount" }, deletedCount: { "$sum": "$shop_status.deletedCount" }, "documentData": { $push: "$document" } }
            }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };
        if (Object.keys(req.query).length != 0 && req.query.filter != "all") {
            shopQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['name'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                shopQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    shopQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    shopQuery.push({ $sort: sorting });
                }
            }
            if (req.query.filter != '' && req.query.filter != 'undefined' && req.query.filter) {
                condition['status'] = { $regex: new RegExp('^' + req.query.filter, 'i') };
                searchs = req.query.filter;
                shopQuery.push({ "$match": { "documentData.status": parseInt(searchs) } });
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                shopQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }

            shopQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "pendingCount": { "$first": "$pendingCount" }, "activeCount": { "$first": "$activeCount" }, "inactiveCount": { "$first": "$inactiveCount" }, "deletedCount": { "$first": "$deletedCount" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('restaurant', shopQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (docdata.length != 0) {
                    res.send([docdata[0].documentData, docdata[0].count, { "pendingCount": docdata[0].pendingCount }, { "activeCount": docdata[0].activeCount }, { "inactiveCount": docdata[0].inactiveCount }, { "deletedCount": docdata[0].deletedCount }]);
                } else {
                    res.send([0, 0]);
                }
            }
        });
    };

    router.foodAdd = async (req, res) => {

        var data = {};
        data.name = req.body.name;
        data.slug = req.body.slug;
        data.combo = req.body.combo;
        var price_details = req.body.price_details;
        data.quantity = 0;
        var db_price_details = [];
        let attributes_ids = [];
        for (var i = 0; i < price_details.length; i++) {
            if (price_details[i].image) {
                if (price_details[i].image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)) {
                    var base64 = price_details[i].image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    var fileName = Date.now().toString() + '.png';
                    var file = CONFIG.DIRECTORY_FOOD + fileName;
                    library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
                    price_details[i].image = file;
                }
                console.log("price_details[i].image11111111111111111111111", price_details[i])
                let att_id = price_details[i].attributes.map(x => new mongoose.Types.ObjectId(x.chaild_id));
                let parent_ids = price_details[i].attributes.map(x => new mongoose.Types.ObjectId(x.parrent_id));
                db_price_details.push({ 'quantity': price_details[i].quantity ? price_details[i].quantity : 0, 'sku': price_details[i].sku ? price_details[i].sku : '', 'unit': price_details[i].unit ? price_details[i].unit : '', 'mprice': price_details[i].mprice ? price_details[i].mprice : 0, 'sprice': price_details[i].sprice ? price_details[i].sprice : '', 'image': price_details[i].image ? price_details[i].image : '', 'attributes': price_details[i].attributes ? price_details[i].attributes : '', 'attribute_ids': att_id ? att_id : '', "parent_ids": parent_ids, '_id': price_details[i]._id });
                attributes_ids.push(...att_id);
                data.quantity += parseInt(price_details[i].quantity ? price_details[i].quantity : 0);
            } else {
                let att_id = price_details[i].attributes.map(x => new mongoose.Types.ObjectId(x.chaild_id));
                let parent_ids = price_details[i].attributes.map(x => new mongoose.Types.ObjectId(x.parrent_id));
                db_price_details.push({ 'quantity': price_details[i].quantity ? price_details[i].quantity : 0, 'sku': price_details[i].sku ? price_details[i].sku : '', 'unit': price_details[i].unit ? price_details[i].unit : '', 'mprice': price_details[i].mprice ? price_details[i].mprice : 0, 'sprice': price_details[i].sprice ? price_details[i].sprice : 0, 'attributes': price_details[i].attributes ? price_details[i].attributes : '', 'attribute_ids': att_id ? att_id : '', "parent_ids": parent_ids ? parent_ids : '', '_id': price_details[i]._id });
                attributes_ids.push(...att_id);
                data.quantity += parseInt(price_details[i].quantity ? price_details[i].quantity : 0);
            }
        }
       
        db_price_details.sort(function (a, b) {
            var keyA = new Date(a.sprice),
                keyB = new Date(b.sprice);
            if (keyB < keyA) return -1;
            if (keyB > keyA) return 1;
            return 0;
        });
        data.price_details = db_price_details;
        data.max_price = db_price_details[0] ? db_price_details[0].mprice : '';
        data.min_price = db_price_details[db_price_details.length - 1] ? db_price_details[db_price_details.length - 1].sprice : '';
        data.rcategory = req.body.rcategory;

        console.log(req.body.scategory);

        if (Array.isArray(req.body.scategory)) {
            data.scategory = req.body.scategory.length > 0 ? new mongoose.Types.ObjectId(req.body.scategory[0]) : '';
        } else if (req.body.scategory) {
            data.scategory = new mongoose.Types.ObjectId(req.body.scategory);
        } else {
            data.scategory = '';
        }
        if (req.body.child_cat_array && req.body.child_cat_array != undefined && req.body.child_cat_array.length > 0) {
            let arr_push = req.body.child_cat_array.map(x => {
                return new mongoose.Types.ObjectId(x);
            });
            data.child_cat_array = arr_push;
        }
        if (attributes_ids && Array.isArray(attributes_ids) && attributes_ids.length > 0) {
            data.attributes = attributes_ids;
        };

        data.base_price = req.body.base_price ? req.body.base_price : db_price_details[0].mprice;
        data.sale_price = req.body.sale_price ? req.body.sale_price : db_price_details[db_price_details.length - 1].sprice;
        data.offer_status = req.body.offer_status;
        data.offer_amount = req.body.offer_amount;
        data.image_alt = req.body.image_alt;
        data.information = req.body.information;
        if (req.body && req.body.quantity && req.body.quantity != (undefined || null || '')) {
            data.quantity = parseInt(req.body.quantity);
        }
        data.status = req.body.status || 1;
        data.tags = req.body.tags;
        data.Product_ingredients = req.body.Product_ingredients
        data.alternative_name = req.body.alternativeList
        data.receipes_cook = req.body.receipe_list
        data.tax = req.body.tax;
        data.vegOptions = req.body.vegOptions
        data.HealthBenefit_List = req.body.HealthBenefit_List
        data.product_descriptions = req.body.product_description
        data.size = req.body.size;
        data.size_status = req.body.size_status;
        data.meta = {}
        data.meta.meta_title = req.body.meta_title
        data.meta.meta_keyword = req.body.meta_keyword
        data.meta.meta_description = req.body.meta_description
        data.sku = req.body.sku
        data.avatarBase64 = req.body.avatarBase64;
        data.product_details = req.body.product_details ? req.body.product_details : [];
        data.quantity_size = req.body.quantity_size ? req.body.quantity_size : [];
        data.recipe_name = req.body.receipe_name
        data.recipe_ingredients = req.body.receipe_ingredients
        data.cooking_instructions = req.body.cooking_instrctions
        data.faq_details = req.body.faq_details
        if (req.body.recommended) { data.isRecommeneded = req.body.recommended.status; }
        var food_time_checking = 0;
        data.images = req.body.documentFiles ? req.body.documentFiles : [];
        if (data.size_status === 2) {
            data.price_details = [];
        }
  
        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + Math.floor(100 + Math.random() * 900) + '.png';
            var file = CONFIG.DIRECTORY_FOOD + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.avatar = {}
            data.avatar.fallback = file;
            data.avatar.webpImg = await library.handleBase64Upload(data.avatarBase64, CONFIG.DIRECTORY_FOOD);
        }
        if (req.body.hoverImageBas64) {
            var hoverbase64 = req.body.hoverImageBas64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName1 = Date.now().toString() + Math.floor(100 + Math.random() * 900) + '.png';
            var file1 = CONFIG.DIRECTORY_FOOD + fileName1;
            library.base64Upload({ file: file1, base64: hoverbase64[2] }, function (err, response) { });
            data.trade_mark_image = {};
            data.trade_mark_image.fallback = file1;
            data.trade_mark_image.webpImg = await library.handleBase64Upload(req.body.hoverImageBas64, CONFIG.DIRECTORY_FOOD);

        }
        if (req.body.multiBase64 && req.body.multiBase64.length > 0) {
       
            data.images = await Promise.all(req.body.multiBase64.map(library.handleBase64Upload));

        }
        let condition = { slug: data.slug };
        if (req.body._id) {
            condition._id = { $ne: new mongoose.Types.ObjectId(req.body._id) };
        };
        let checkSlug = await db.GetOneDocument('food', condition, {}, {});
        if (checkSlug && checkSlug.doc && checkSlug.doc._id && checkSlug.doc._id != (null || undefined || '')) {
            return res.send({ status: 0, message: "Product slug already! Please try different name" });
        }
        console.log(data, "datadatadatadatadatadatadatadatadatadata");
        if (req.body._id) {
            const docdata = await db.UpdateDocument('food', { _id: req.body._id }, data, {});
            if (docdata.status === false) {
                res.send({ status: 0, message: "Something went wrong! Please try again" });
            } else {
                res.send({ status: 1, message: "Category Updated Successfully", response: docdata.doc });
            }
        
        } else {
            const result = await db.InsertDocument('food', data);
            if (!result) {
                res.send({ status: 0, message: "Something went wrong! Please try again" });
            } else {
                res.send({ status: 1, message: "Category Created Successfully", response: result });
            }
        };
    };

    async function upload64(name, file) {
        return new Promise((resolve, reject) => {
            library.base64Upload({ file: name, base64: file }, function (err, response) {
            });
            resolve(name)
        })
    }

    router.foodDelete = async function (req, res) {
        const catdata = await db.GetOneDocument('food', { _id: { $in: req.body.ids } }, {}, {})
        const data = await db.DeleteDocument('food', { _id: { $in: req.body.ids } })
        var updateDetails = { "$pull": { 'cart_details': { id: { $in: [req.body.ids] } } } };
        var updateDetailsrecent = { product_id: { $in: [req.body.ids] } };
        await db.UpdateDocument('temp_cart', {}, updateDetails, { multi: true })
        await db.UpdateDocument('cart', {}, updateDetails, { multi: true })
        await db.DeleteDocument('favourite', { product_id: { $in: [req.body.ids] } })
        await db.DeleteDocument('recently_visit', { product_id: { $in: [req.body.ids] } })
        res.send(data.doc)
    };


    router.foodClone = function (req, res) {
        var data = {};
        data.name = req.body.name;
        data.slug = req.body.slug;
        var price_details = req.body.price_details;
        var db_price_details = [];
        for (var i = 0; i < price_details.length; i++) {
            if (price_details[i].image) {
                if (price_details[i].image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)) {
                    var base64 = price_details[i].image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    var fileName = Date.now().toString() + '.png';
                    var file = CONFIG.DIRECTORY_FOOD + fileName;
                    library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
                    price_details[i].image = file;
                }
            }

            db_price_details.push({ 'attributes': price_details[i].attributes, 'quantity': price_details[i].quantity, 'unit': price_details[i].unit, 'mprice': price_details[i].mprice, 'sprice': price_details[i].sprice, 'image': price_details[i].image })
        }
        db_price_details.sort(function (a, b) {
            var keyA = new Date(a.sprice),
                keyB = new Date(b.sprice);
            // Compare the 2 prices
            if (keyB < keyA) return -1;
            if (keyB > keyA) return 1;
            return 0;
        });
        data.price_details = db_price_details;

        data.rcategory = req.body.rcategory;
        data.scategory = req.body.scategory;
        data.brandname = req.body.brandname;
        data.attributes = req.body.attributes;
        data.main_city = req.body.main_city;
        data.sub_city = req.body.sub_city;
        data.itmcat = req.body.itmcat;
     
        data.status = req.body.status || 1;
        data.tags = req.body.tags;
        data.avatarBase64 = req.body.avatarBase64;
       
        if (req.body.recommended) { data.isRecommeneded = req.body.recommended.status; }
        var food_time_checking = 0;

        if (false && food_time_checking == 1) {
            res.status(400).send({ message: "Sorry Invalid Food time" });
        } else {
            if (data.avatarBase64) {
                var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                var fileName = Date.now().toString() + '.png';
                var file = CONFIG.DIRECTORY_FOOD + fileName;
                library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
                data.avatar = file;
            } else {
                data.avatar = req.body.avatar;
            }
         


            db.InsertDocument('food', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
            // };
        }
    };

    async function downloadAndSaveImage(imageUrl, folderPath, convertToWebP = true) {
        try {
            // Remove any trailing commas or unwanted characters from the URL
            const sanitizedImageUrl = imageUrl.replace(/,+$/, ''); // Remove trailing commas
            const encodedImageUrl = encodeURI(sanitizedImageUrl); // Ensure proper encoding
            console.log(`Downloading image from: ${encodedImageUrl}`);
        
            const absoluteFolderPath = path.resolve(folderPath);
        
            // Ensure the target folder exists
            if (!fs.existsSync(absoluteFolderPath)) {
                fs.mkdirSync(absoluteFolderPath, { recursive: true });
            }
        
            // Download the image using Axios
            const response = await axios.get(encodedImageUrl, { responseType: 'arraybuffer', timeout: 10000 });
        
            // Generate a unique filename using timestamp to avoid collisions
            const timestamp = Date.now();
            const originalFileName = `${timestamp}-${path.basename(sanitizedImageUrl)}`;
        
            // Build file path for the original image
            const originalFilePath = path.join(absoluteFolderPath, originalFileName);
        
            // Save original image
            fs.writeFileSync(originalFilePath, response.data);
        
            if (convertToWebP) {
                const webpFileName = `${timestamp}-${path.basename(sanitizedImageUrl, path.extname(sanitizedImageUrl))}.webp`;
                const webpFilePath = path.join(absoluteFolderPath, webpFileName);
        
                // Convert to WebP and save
                await sharp(response.data)
                    .webp()
                    .toFile(webpFilePath);
        
                const relativeWebpPath = path.relative(__dirname, webpFilePath).replace(/\\/g, '/');
                const relativeOriginalPath = path.relative(__dirname, originalFilePath).replace(/\\/g, '/');
        
                // Return both original and WebP paths
                return {
                    original: relativeOriginalPath,
                    webp: relativeWebpPath
                };
            } else {
                // If no WebP conversion, just return the original image path
                const relativeOriginalPath = path.relative(__dirname, originalFilePath).replace(/\\/g, '/');
                return {
                    original: relativeOriginalPath,
                    webp: null // No WebP version saved
                };
            }
        } catch (error) {
            console.error('Error downloading and saving image:', error.message);
    
            if (error.response) {
                console.error(`HTTP Status Code: ${error.response.status}`);
                console.error(`Response Body: ${JSON.stringify(error.response.data)}`);
            }
    
            return null;
        }
    }
    

    // Your existing function to upload bulk inventory
    router.uploadBulkInventory = async function (req, res) {
        res.setTimeout(600000, () => { // 10 minutes in milliseconds
            console.log('Request timed out');
            res.status(408).send({ status: 0, message: 'Request Timeout' });
        });

        try {
    
            // Folder path to save images
            const folderPath = path.join(__dirname, '../..', 'uploads', 'images', 'food');  // Ensure this is the correct folder path
            let skippedCount = 0;
            let skippedDocuments = []; // Declare the skippedDocuments array to store skipped products and reasons
    
            // Step 1: Iterate over the data array
            for (const productData of req.excelData) {
                // Split variants by '\n' for multiple variants
                // const variants = parseVariants(productData);
    
                // Step 2: Fetch the category and subcategory from the database
                const category = await db.GetOneDocument('rcategory', {
                    rcatname: { $regex: new RegExp(`^${productData['Product Category']}$`, 'i') }
                }, {}, {});
    
                const subcategory = await db.GetOneDocument('scategory', {
                    scatname: { $regex: new RegExp(`^${productData['Product Sub Category']}$`, 'i') }
                }, {}, {});
             
               
                if (!category || !category.doc || category.doc == 'Data Not found' ) {
                    skippedCount++;
                    skippedDocuments.push({
                        product: productData['Product Name  *'],
                        reason: `Category "${productData['Product Category']}" not found`
                    });
                    continue;
                }
                
                if (!subcategory || !subcategory.doc ||subcategory.doc == 'Data Not found' ) {
                    skippedCount++;
                    skippedDocuments.push({
                        product: productData['Product Name  *'],
                        reason: `Subcategory "${productData['Product Sub Category']}" not found`
                    });
                    continue;
                }
                
                // Ensure both `category.doc._id` and `subcategory.doc.rcategory` exist before comparing
                if (
                    category.doc._id &&
                    subcategory.doc.rcategory &&
                    category.doc._id.toString() !== subcategory.doc.rcategory.toString()
                ) {
                    // console.log(`Skipping product "${productData['Product Name  *']}" as category does not match subcategory.`);
                    skippedCount++;
                    skippedDocuments.push({
                        product: productData['Product Name  *'],
                        reason: `Category does not match subcategory`
                    });
                    continue; // Skip the current product and move to the next one
                }
    
                // Step 3: Check if the product already exists
                const productExists = await db.GetOneDocument('food', {
                    name: { $regex: new RegExp(`^${productData['Product Name  *']}$`, 'i') },
                    rcategory: category.doc._id
                }, {}, {});

                let tax = parseFloat(productData['Tax(%)']);
                 if (isNaN(tax) || tax < 0) {
                  tax = 0; // Default tax value if invalid
                  }

    
                // Step 4: Prepare the foodData
                let foodData = {
                    name: productData['Product Name  *'],
                    slug: slugify(productData['Product Name  *']),
                    rcategory: category.doc._id,
                    image_alt: productData['Image Alt Text'],
                    tax: tax,
                    scategory: subcategory.doc ? subcategory.doc._id : null,  
                    child_cat_array: [subcategory.doc ? subcategory.doc._id : null],
                    Product_ingredients: cleanText(productData['Product Ingredients']),
                    alternative_name: cleanText(productData['Alternative Name']),
                    information: productData['Description'],
                    HealthBenefit_List: cleanText(productData['Health Benefits']),
                    product_descriptions: productData['Product Details'],
                    vegOptions: productData['Veg (or) Non-Veg *'] === 'Veg' ? 1 : 2,
                    recipe_name: productData['Recipe Name'],
                    recipe_ingredients: cleanText(productData['Recipe Ingredients']),
                    receipes_cook: cleanText(productData['Recipes to Cook']),
                    cooking_instructions: cleanText(productData['Cooking Instructions']),
                    faq_details: parseFAQ(productData['FAQ\'s']),
                    attributes: [],
                    meta: {
                        meta_title: productData['Meta Title *'],
                        meta_keyword: cleanText(productData['Meta Keyword *']),
                        meta_description: productData['Meta Description *']
                    },
                    images: [],
                    avatar: {},
                    trade_mark_image: {},
                    status: 1,
                    size_status: 1
                };

                // Download and save avatar image if available
                if (productData['Product Image URL']) {
                    const avatarImages = await downloadAndSaveImage(productData['Product Image URL'], folderPath);
                    if (avatarImages) {
                        foodData.avatar = {
                            webpImg: avatarImages.webp, // Store the relative URL path for WebP
                            fallback: avatarImages.original  // Store the relative URL path for the original image
                        };
                    }
                }
    
                // Download and save trade mark image if available
                if (productData['Trade Mark Image ']) {
                    const tradeMarkImages = await downloadAndSaveImage(productData['Trade Mark Image '], folderPath);
                    if (tradeMarkImages) {
                        foodData.trade_mark_image = {
                            webpImg: tradeMarkImages.webp, // Store the relative URL path for WebP
                            fallback: tradeMarkImages.original  // Store the relative URL path for the original image
                        };
                    }
                }
    
                if (productData['Additional Image']) {
                    const additionalImages = productData['Additional Image'].split('\n');
                    const savedImages = [];
                
                    // Iterate through each additional image and download them
                    for (let i = 0; i < additionalImages.length; i++) {
                        const imageUrl = cleanPrefix(additionalImages[i]);
                
                        // Call downloadAndSaveImage with convertToWebP as false
                        const savedImage = await downloadAndSaveImage(imageUrl, folderPath, false); // Pass false for WebP conversion
                        if (savedImage) {
                            savedImages.push(savedImage.original); // Only store the original image path
                        }
                    }
                
                    // Store the saved images in the foodData
                    foodData.images = savedImages;
                }
    
                let priceDetails = [];
    
                // Fetch the attribute collection (for "weight", etc.)
                const attributes = await db.GetDocument('attributes', {}, {}, {});
                // console.log(attributes);
    
                // Step 5: Process variants (Size, Price, Stock, SKU, etc.)
                const skuVariants = normalizeField(productData['SKU']);
                const priceVariants = normalizeField(productData['Product Sale Price *']);
                const unitVariants = normalizeField(productData['Unit']);
                // console.log(unitVariants);
                
                const basePriceVariants = normalizeField(productData['Product Base Price *']);
                const stockVariants = normalizeField(productData['Quantity']);
                const additionalImages = productData['Additional Image'] ? normalizeField(productData['Additional Image']) : [];
                
    
                for (let i = 0; i < Math.max(skuVariants.length, unitVariants.length, priceVariants.length, stockVariants.length, basePriceVariants.length); i++) {
                    const sku = skuVariants[i] || ''; // Use empty string if the index doesn't exist
                    const unit = unitVariants[i] || '';
                    const basePrice = basePriceVariants[i] ? parseFloat(basePriceVariants[i].trim()) : 0;
                    const salePrice = priceVariants[i] ? parseFloat(priceVariants[i].trim()) : 0;
                    const quantity = stockVariants[i] ? parseInt(stockVariants[i].trim()) : 0;
                    const image = additionalImages[i] || '';
                
                    if (!sku || !unit || isNaN(basePrice) || isNaN(salePrice) || isNaN(quantity)) {
                        skippedCount++;
                        skippedDocuments.push({
                            product: productData['Product Name  *'],
                            reason: `Invalid SKU, unit, or price details`,
                        });
                        continue; // Skip invalid entries
                    }
                
                    const priceDetail = {
                        sku,
                        mprice: basePrice,
                        sprice: salePrice,
                        quantity,
                        unit,
                        image,
                        attributes: [],
                        attribute_ids: [],
                        parent_ids: [],
                    };
                
    
                    // Find matching attributes for the variant
                    const matchingAttribute = attributes.doc.find(attr => {
                        return attr.units.some(unitObj => unitObj.name.toLowerCase() === unit.toLowerCase());
                    });
                    // console.log(matchingAttribute);
                    
                    if (matchingAttribute) {
                        const unitObj = matchingAttribute.units.find(u => u.name.toLowerCase() === unit.toLowerCase());
                        priceDetail.attributes.push({
                            chaild_id: unitObj._id.toString(),
                            chaild_name: unitObj.name,
                            attri_name: matchingAttribute.name,
                            parrent_id: matchingAttribute._id.toString(),
                        });
                        priceDetail.parent_ids.push(matchingAttribute._id);
                        priceDetail.attribute_ids.push(unitObj._id);
                        foodData.attributes.push(unitObj._id);
                    }
                
                    priceDetails.push(priceDetail);
                }
    
                foodData.price_details = priceDetails;
                foodData.max_price = Math.max(...priceDetails.map(p => p.mprice));
                foodData.base_price = Math.max(...priceDetails.map(p => p.mprice));
                foodData.min_price = Math.min(...priceDetails.map(p => p.sprice));
                foodData.sale_price = Math.min(...priceDetails.map(p => p.sprice));
    
                // Step 6: Check if product exists and update or insert
                if (productExists && productExists.doc && productExists.status === true) {
                    foodData.slug = productExists.doc.slug

                    const updatedProduct = await db.UpdateDocument('food', { _id: productExists.doc._id }, foodData, {});
                    if (updatedProduct.status) {
                        // console.log('Product updated successfully');
                    }
                } else {
                    foodData.slug = await generateUniqueSlug(productData['Product Name  *'], 'food');

                    const newProduct = await db.InsertDocument('food', foodData);
                    if (newProduct) {
                        // console.log('New product added successfully');
                    }
                }
            }
    
            // Final response
            res.send({
                status: 1,
                message: 'Bulk upload completed successfully',
                skippedCount: skippedCount,
                skippedDocuments: skippedDocuments // Include the skipped documents with reasons
            });
        } catch (error) {
            console.error('Error uploading bulk inventory:', error.message);
            res.status(500).json({ status: 0, message: 'Internal server error' });
        }
    };
    
  

    // Helper function to parse FAQ
    function parseFAQ(faqString) {
        const faqArray = faqString.split('\n').map(faq => {
            const [title, content] = faq.split(':');
            return { title: title.replace(/^\d+\)/, '').trim(), content: content ? content.trim() : '' };
        });
        return faqArray;
    }

    function cleanText(text) {
        return text
            ? text.split(/\d+[\).\s]*\s*/)  
                .map(item => item.trim())  
                .filter(Boolean)           
            : [];
    }

    async function generateUniqueSlug(name, collection) {
        let baseSlug = slugify(name);  // Slugify the name once
        let maxAttempts = 10;  // Limit the number of slug variations to check
        let slugList = [baseSlug];
    
        // Generate potential slugs with counters (baseSlug, baseSlug-1, baseSlug-2, ...)
        for (let i = 1; i <= maxAttempts; i++) {
            slugList.push(`${baseSlug}-${i}`);
        }
    
        // Query to check which slugs already exist
        const existingSlugs = await db.GetDocument(collection, { slug: { $in: slugList } }, {}, {});
    
        // Filter out existing slugs
        const existingSlugSet = new Set(existingSlugs.doc.map(item => item.slug));
    
        // Find the first available unique slug
        for (const slug of slugList) {
            if (!existingSlugSet.has(slug)) {
                return slug; // Return the first unique slug
            }
        }
    
        // If no unique slug was found (unlikely), return the base slug as fallback
        return baseSlug;
    }
    
    
    function slugify(text) {
        text = text.toLowerCase();
        text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
        text = text.replace(/\s+/g, '-'); // Replace spaces with hyphens
        text = text.replace(/[^a-z0-9-]/g, ''); // Remove invalid characters
        text = text.replace(/-+/g, '-'); // Replace multiple hyphens with one
        text = text.replace(/^-+/, '').replace(/-+$/, ''); // Trim hyphens from start and end
        return text;
    }
    

    // Helper function to parse product variants and clean fields
    function cleanPrefix(value) {
        // Remove numeric prefix (e.g., "1)") and comma at the end, then trim the string
        return value.replace(/^\d+\)\s*/, '').replace(/,$/, '').trim();  // Cleans "1) 500g," -> "500g"
    }

    function normalizeField(field) {
        if (typeof field === 'string') {
            // Split by new lines (`\n`) and commas (`,`) and clean each entry
            return field
                .split(/[\n,]+/) // Split by new lines or commas
                .map(item => cleanPrefix(item.trim())) // Clean each entry
                .filter(Boolean); // Remove empty entries
        }
        return []; // Return an empty array if field is null or undefined
    }

    function parseVariants(productData) {
        const variants = [];
        const skus = productData['SKU'].split('\n');
        const units = productData['Unit'].split('\n'); // Split by newline
        const basePrices = productData['Product Base Price *'].split('\n');
        const salePrices = productData['Product Sale Price *'].split('\n');
        const stock = productData['Quantity'].split('\n');
        const images = productData['Additional Image'] ? productData['Additional Image'].split('\n') : [];

        for (let i = 0; i < skus.length; i++) {
            const unit = cleanPrefix(units[i]);  // Clean unit
            const image = images[i] ? cleanPrefix(images[i]) : '';  // Clean image URL
            const sku = skus[i].replace(/\)/g, '').replace(/\(/g, '').trim();  // Clean SKU if necessary

            variants.push({
                sku: sku,  // Clean SKU
                unit: unit,  // Clean unit
                basePrice: basePrices[i] ? parseFloat(basePrices[i].trim()) : 0,  // Ensure correct base price
                salePrice: salePrices[i] ? parseFloat(salePrices[i].trim()) : 0,  // Ensure correct sale price
                stock: stock[i] ? parseInt(stock[i].trim()) : 0,  // Ensure correct stock quantity
                image: image,  // Clean image URL
                attributes: [{  // Example of adding attributes
                    chaild_id: "some_attribute_id", // Replace with actual child IDs
                    chaild_name: cleanPrefix(units[i]), // Clean chaild_name
                    attri_name: "weight",
                    parrent_id: "some_parent_category_id" // Replace with actual parent ID
                }]
            });
        }
        return variants;
    }

    function parseImages(additionalImages) {
        return additionalImages
            ? additionalImages.split('\n').map(imageUrl => imageUrl.replace(/^\d+\)/, '').trim()).filter(Boolean)
            : [];
    }

    return router;
}
