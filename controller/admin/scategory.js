//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");
var timezone = require('moment-timezone');
var isObjectId = (n) => {

    return mongoose.Types.ObjectId.isValid(n);
}
module.exports = (app, io) => {

    var router = {};
    router.slist = (req, res) => {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = { $match: { status: { $ne: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { $or: [{ "rcatname": { $regex: searchs + '.*', $options: 'si' } }, { "scatname": { $regex: searchs + '.*', $options: 'si' } }] } };

            //query = { "$match": { status: { $ne: 0 }, "scatname": { $regex: '^' + searchs, $options: 'si' } } }
        }
        rcatQuery.push(query);
        if (req.body.status) {
            rcatQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
        }
        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            rcatQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            rcatQuery.push({ $sort: sorting });
        }
        if (req.body.limit && req.body.skip >= 0) {
            skip = parseInt(req.body.skip);
            limit = parseInt(req.body.limit);
        }
        rcatQuery.push(
            {
                $facet: {
                    all: [{ $count: 'all' }],
                    documentData: [
                        {
                            $lookup: {
                                from: 'rcategory',
                                localField: "rcategory",
                                foreignField: "_id",
                                as: "rcategorys"
                            }
                        },
                        { $unwind: { path: "$rcategorys", preserveNullAndEmptyArrays: true } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: "$_id",
                                status: "$status",
                                img: "$img",
                                scatname: "$scatname",
                                sort_rcatname: "$rcategorys.rcatname"
                            }
                        }
                    ]
                }
            }
        )
        db.GetAggregation('scategory', rcatQuery, (err, rcatlist) => {
            if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
                res.send([], 0, []);
            } else {
                db.GetAggregation('scategory', [
                    {
                        $facet: {
                            all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
                            active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
                            inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
                        }
                    }
                ], (err, counts) => {
                    var count = 0;
                    count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
                    if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
                        res.send([rcatlist[0].documentData, count, counts]);
                    } else {
                        res.send([], 0, []);
                    }
                })
            }
        });
    }

    //   In this query i need to get all the categories in both rcategories and scategories the last will always the rcategory when ever we get a data from the scategory there must be a objectId with the rcategory that maybe the from the collection rcategory or scategory if that is from rcategory it end the loop of pushing to the sort_rcatname otherwise it is from the scategory take that and go to the rcateogry then push and check and if it is not check again when the rcategory comes I need all these in sort_rcatname.

    router.list = async function (req, res) {
        // var errors = req.validationErrors();
        var query = {};
        console.log(req.body, 'this is the request body');
        if (req.body.status) {
            query = { status: { $eq: req.body.status } };

        } else {
            query = { status: { $ne: 0 } };
        }

        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }


        var usersQuery = [
            { "$match": query },
            {
                $lookup: {
                    from: 'rcategory',
                    localField: 'rcategory',
                    foreignField: '_id',
                    as: 'rcategoryData',
                },
            },
            {
                $lookup: {
                    from: 'scategory',
                    localField: 'rcategory',
                    foreignField: '_id',
                    as: 'scategoryData',
                },
            },
            { "$match": { $or: [{ "rcategoryData": { $ne: [] } }, { "scategoryData": { $ne: [] } }] } },
            {
                $graphLookup: {
                    from: "scategory",
                    startWith: "$rcategory",
                    connectFromField: "rcategory",
                    connectToField: "_id",

                    as: "rcategory_data",
                    depthField: "level",
                }
            },
            // { $unwind: { path: "$rcategory_data" } },
            // { $sort: { "$rcategory_data.level": 1 } },
            {
                $project: {
                    scatname: 1,
                    img: 1,
                    rcategory: { $cond: { if: { $ne: ["$rcategoryData", []] }, then: { $arrayElemAt: ["$rcategoryData", 0] }, else: null } },
                    scategory: { $cond: { if: { $ne: ["$scategoryData", []] }, then: { $arrayElemAt: ["$scategoryData", 0] }, else: null } },
                    status: 1,
                    createdAt: 1,
                    rcategory_data: 1,
                    rstatus: {
                        $cond: {
                            if: { $ne: ["$rcategoryData", []] },
                            then: { $ifNull: ["$rcategoryData.status", "$scategoryData.status"] },
                            else: "$scategoryData.status"
                        }
                    },
                    sort_name: '$scatname',
                    sort_rcatname: {
                        $cond: {
                            if: { $ne: ["$rcategoryData", []] },
                            then: { $ifNull: ["$rcategoryData.rcatname", "$scategoryData.scatname"] },
                            else: "$scategoryData.scatname"
                        }
                    },
                    substat: {
                        $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } },
                    },
                    "img": {
                        "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"],
                    },
                },
            },
            {
                $sort: { "createdAt": 1 }
            },

            {
                $project: {
                    scatname: 1,
                    rcategory: 1,
                    scategory: 1,
                    img: 1,
                    status: 1,
                    allCategories: {
                        $cond: {
                            if: { $ne: ["$scategory", null] },
                            then: {
                                $concatArrays: [
                                    [{ $ifNull: ["$rcategory.rcatname", null] }],
                                    ["$scategory.scatname"]
                                ]
                            },
                            else: ["$rcategory.rcatname"]
                        }
                    },
                    document: "$$ROOT",
                },
            },

            {
                $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } },
            },

        ];



        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({
                "$match": {
                    $or: [
                        { "documentData.rcategory.rcatname": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.scatname": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.email": { $regex: searchs + '.*', $options: 'si' } },
                    ],
                },
            });
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

        // usersQuery.push({ "$match": { 'documentData..status' : { $eq: 1}}})
        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }

        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        try {
            const rcatlist = await db.GetAggregation('scategory', usersQuery)




            if (rcatlist.length <= 0) {
                res.send([0, 0]);
            } else {
                const counts = await db.GetAggregation('scategory', [
                    {
                        $facet: {
                            all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
                            active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
                            inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
                        }
                    }
                ])
                if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && rcatlist[0].count) {
                    res.send([rcatlist[0].documentData, rcatlist[0].count, counts]);
                } else {
                    res.send([], 0, []);
                }

                // db.GetAggregation('scategory', [
                //     {
                //         $facet: {
                //             all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
                //             active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
                //             inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
                //         }
                //     }
                // ], (err, counts) => {

                //     if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && rcatlist[0].count) {
                //         res.send([rcatlist[0].documentData, rcatlist[0].count, counts]);
                //     } else {
                //         res.send([], 0, []);
                //     }
                // })
                // res.send([rcatlist[0].documentData, rcatlist[0].count]);
            }
            // db.GetAggregation('scategory', usersQuery, function (err, rcatlist) {
            //     if (err || rcatlist.length <= 0) {
            //         res.send([0, 0]);
            //     } else {
            //         db.GetAggregation('scategory', [
            //             {
            //                 $facet: {
            //                     all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
            //                     active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
            //                     inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
            //                 }
            //             }
            //         ], (err, counts) => {

            //             if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && rcatlist[0].count) {
            //                 res.send([rcatlist[0].documentData, rcatlist[0].count, counts]);
            //             } else {
            //                 res.send([], 0, []);
            //             }
            //         })
            //        // res.send([rcatlist[0].documentData, rcatlist[0].count]);
            //     }
            // });
        } catch (e) {
        }
    };
    // router.list = async function (req, res) {
    //     // var errors = req.validationErrors();
    //     var query = {};
    //     console.log(req.body, 'this is the request body');
    //     if (req.body.status) {
    //         query = { status: { $eq: req.body.status } };

    //     } else {
    //         query = { status: { $ne: 0 } };
    //     }

    //     // if (errors) {
    //     //     res.send(errors, 400);
    //     //     return;
    //     // }
    //     if (req.body.sort) {
    //         var sorted = req.body.sort.field;
    //     }


    //     var usersQuery = [
    //         { "$match": query },
    //         {
    //             $lookup: {
    //                 from: 'rcategory',
    //                 localField: 'rcategory',
    //                 foreignField: '_id',
    //                 as: 'rcategoryData',
    //             },
    //         },
    //         {
    //             $lookup: {
    //                 from: 'scategory',
    //                 localField: 'rcategory',
    //                 foreignField: '_id',
    //                 as: 'scategoryData',
    //             },
    //         },
    //         { "$match": { $or: [{ "rcategoryData": { $ne: [] } }, { "scategoryData": { $ne: [] } }] } },
    //         {
    //             $graphLookup: {
    //                 from: "scategory",
    //                 startWith: "$rcategory",
    //                 connectFromField: "rcategory",
    //                 connectToField: "_id",
    //                 as: "rcategory_data",
    //             }
    //         },
    //         {
    //             $project: {
    //                 scatname: 1,
    //                 img: 1,
    //                 rcategory: { $cond: { if: { $ne: ["$rcategoryData", []] }, then: { $arrayElemAt: ["$rcategoryData", 0] }, else: null } },
    //                 scategory: { $cond: { if: { $ne: ["$scategoryData", []] }, then: { $arrayElemAt: ["$scategoryData", 0] }, else: null } },
    //                 status: 1,
    //                 createdAt: 1,
    //                 rcategory_data: 1,
    //                 rstatus: {
    //                     $cond: {
    //                         if: { $ne: ["$rcategoryData", []] },
    //                         then: { $ifNull: ["$rcategoryData.status", "$scategoryData.status"] },
    //                         else: "$scategoryData.status"
    //                     }
    //                 },
    //                 sort_name: '$scatname',
    //                 sort_rcatname: {
    //                     $cond: {
    //                         if: { $ne: ["$rcategoryData", []] },
    //                         then: { $ifNull: ["$rcategoryData.rcatname", "$scategoryData.scatname"] },
    //                         else: "$scategoryData.scatname"
    //                     }
    //                 },
    //                 substat: {
    //                     $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } },
    //                 },
    //                 "img": {
    //                     "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"],
    //                 },
    //             },
    //         },
    //         {
    //             $sort: { "createdAt": 1 }
    //         },

    //         {
    //             $project: {
    //                 scatname: 1,
    //                 rcategory: 1,
    //                 scategory: 1,
    //                 img: 1,
    //                 status: 1,
    //                 allCategories: {
    //                     $cond: {
    //                         if: { $ne: ["$scategory", null] },
    //                         then: {
    //                             $concatArrays: [
    //                                 [{ $ifNull: ["$rcategory.rcatname", null] }],
    //                                 ["$scategory.scatname"]
    //                             ]
    //                         },
    //                         else: ["$rcategory.rcatname"]
    //                     }
    //                 },
    //                 document: "$$ROOT",
    //             },
    //         },

    //         {
    //             $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } },
    //         },

    //     ];



    //     var condition = { status: { $ne: 0 } };
    //     usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

    //     if (req.body.search) {
    //         var searchs = req.body.search;
    //         usersQuery.push({
    //             "$match": {
    //                 $or: [
    //                     { "documentData.rcategory.rcatname": { $regex: searchs + '.*', $options: 'si' } },
    //                     { "documentData.scatname": { $regex: searchs + '.*', $options: 'si' } },
    //                     { "documentData.email": { $regex: searchs + '.*', $options: 'si' } },
    //                 ],
    //             },
    //         });
    //         usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
    //         usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
    //         if (req.body.limit && req.body.skip >= 0) {
    //             usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
    //         }
    //         usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
    //     }


    //     var sorting = {};
    //     if (req.body.sort) {
    //         var sorter = 'documentData.' + req.body.sort.field;
    //         sorting[sorter] = req.body.sort.order;
    //         usersQuery.push({ $sort: sorting });
    //     } else {
    //         sorting["documentData.createdAt"] = -1;
    //         usersQuery.push({ $sort: sorting });
    //     }

    //     // usersQuery.push({ "$match": { 'documentData..status' : { $eq: 1}}})
    //     if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
    //         usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
    //     }

    //     if (!req.body.search) {
    //         usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
    //     }

    //     try {
    //         const rcatlist = await db.GetAggregation('scategory', usersQuery)




    //         if (rcatlist.length <= 0) {
    //             res.send([0, 0]);
    //         } else {
    //             const counts = await db.GetAggregation('scategory', [
    //                 {
    //                     $facet: {
    //                         all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
    //                         active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
    //                         inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
    //                     }
    //                 }
    //             ])
    //             if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && rcatlist[0].count) {
    //                 res.send([rcatlist[0].documentData, rcatlist[0].count, counts]);
    //             } else {
    //                 res.send([], 0, []);
    //             }

    //             // db.GetAggregation('scategory', [
    //             //     {
    //             //         $facet: {
    //             //             all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
    //             //             active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
    //             //             inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
    //             //         }
    //             //     }
    //             // ], (err, counts) => {

    //             //     if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && rcatlist[0].count) {
    //             //         res.send([rcatlist[0].documentData, rcatlist[0].count, counts]);
    //             //     } else {
    //             //         res.send([], 0, []);
    //             //     }
    //             // })
    //             // res.send([rcatlist[0].documentData, rcatlist[0].count]);
    //         }
    //         // db.GetAggregation('scategory', usersQuery, function (err, rcatlist) {
    //         //     if (err || rcatlist.length <= 0) {
    //         //         res.send([0, 0]);
    //         //     } else {
    //         //         db.GetAggregation('scategory', [
    //         //             {
    //         //                 $facet: {
    //         //                     all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
    //         //                     active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
    //         //                     inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
    //         //                 }
    //         //             }
    //         //         ], (err, counts) => {

    //         //             if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && rcatlist[0].count) {
    //         //                 res.send([rcatlist[0].documentData, rcatlist[0].count, counts]);
    //         //             } else {
    //         //                 res.send([], 0, []);
    //         //             }
    //         //         })
    //         //        // res.send([rcatlist[0].documentData, rcatlist[0].count]);
    //         //     }
    //         // });
    //     } catch (e) {
    //     }
    // };
    router.delete = async (req, res) => {
        // req.checkBody('ids', 'Invalid ids').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        // const docdata = await db.UpdateDocument('scategory', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
        const docdata = await db.DeleteDocument('scategory', { _id: { $in: req.body.ids } })
        if (docdata.status == false) {
            res.send(docdata.doc);
        } else {
            res.send(docdata.doc);

        }
        // db.UpdateDocument('scategory', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true }, (err, docdata) => {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    };

    router.dlist = async (req, res) => {
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = { $match: { status: { $eq: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $ne: 0 }, "scatname": { $regex: '^' + searchs, $options: 'si' } } }
        }
        rcatQuery.push(query);

        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            rcatQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            rcatQuery.push({ $sort: sorting });
        }
        if (req.body.limit && req.body.skip >= 0) {
            skip = parseInt(req.body.skip);
            limit = parseInt(req.body.limit);
        }
        rcatQuery.push(
            {
                $facet: {
                    all: [{ $count: 'all' }],
                    documentData: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: "$_id",
                                status: "$status",
                                img: "$img",
                                scatname: "$scatname"
                            }
                        }
                    ]

                }
            }
        )
        const rcatlist = await db.GetAggregation('scategory', rcatQuery)
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0);
        } else {
            var count = 0;
            count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
            if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
                res.send([rcatlist[0].documentData, count]);
            } else {
                res.send([rcatlist[0].documentData, count]);
            }
        }
        // db.GetAggregation('scategory', rcatQuery, (err, rcatlist) => {
        //     if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
        //         res.send([], 0);
        //     } else {
        //         var count = 0;
        //         count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
        //         if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
        //             res.send([rcatlist[0].documentData, count]);
        //         } else {
        //             res.send([rcatlist[0].documentData, count]);
        //         }
        //     }
        // });
    }

    router.sub_save = async (req, res) => {
        data = {};
        if (req.body._id && isObjectId(req.body._id)) {
            var update_data = {};
            update_data.scatname = req.body.scatname;
            update_data.rcategory = req.body.rcategory;
            update_data.rootCategory = new mongoose.Types.ObjectId(req.body.rootCategory);
            if (req.files && req.files.length > 0) {
                update_data.img = req.files[0].destination + req.files[0].filename;
            }
            // update_data.is_cuisine = req.body.is_cuisine;
            // update_data.is_reward = req.body.is_reward;
            //update_data.is_fssai = req.body.is_fssai;
            update_data.status = req.body.status;
            update_data.slug = req.body.slug1;
            update_data.color = req.body.color;
            update_data.heading_color = req.body.heading_color;
            update_data.meta = {};
            update_data.meta.meta_title = req.body.meta_title;
            update_data.meta.meta_keyword = req.body.meta_keyword;
            update_data.meta.meta_description = req.body.meta_description;

            //update_data.is_food = 0;
            // if (req.body.slug1 == 'food') {
            //     update_data.is_food = 1;
            // }
            console.log(update_data, 'check update data');
            const dup = await db.GetOneDocument('scategory', { _id: { $ne: new mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {})
            if (!dup) {
                console.log(err)
                data.status = 0;
                data.message = 'insert error';
                res.json(data);
            } else if (dup && isObjectId(dup.doc._id)) {
                data.status = 0;
                data.message = 'Sub Category name already exists';
                res.json(data);
            } else {
                const update = await db.UpdateDocument('scategory', { _id: new mongoose.Types.ObjectId(req.body._id) }, update_data, {})
                console.log(update, 'dddd');
                if (!update || update.nModified == 0) {
                    data.status = 0;
                    data.message = 'update error';
                    res.json(data);
                } else {
                    data.status = 1;
                    data.message = 'Sub Category updated successfully';
                    res.json(data);
                }
                // db.UpdateDocument('scategory', { _id: mongoose.Types.ObjectId(req.body._id) }, update_data, {}, (err, update) => {
                //     if (err || !update || update.nModified == 0) {
                //         data.status = 0;
                //         data.message = 'update error';
                //         res.json(data);
                //     } else {
                //         data.status = 1;
                //         data.message = 'Sub Category updated successfully';
                //         res.json(data);
                //     }
                // })
            }
            // db.GetOneDocument('scategory', { _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
            //     if (err) {
            //         console.log(err)
            //         data.status = 0;
            //         data.message = 'insert error';
            //         res.json(data);
            //     } else if (dup && isObjectId(dup._id)) {
            //         data.status = 0;
            //         data.message = 'Sub Category name already exists';
            //         res.json(data);
            //     } else {
            //         db.UpdateDocument('scategory', { _id: mongoose.Types.ObjectId(req.body._id) }, update_data, {}, (err, update) => {
            //             if (err || !update || update.nModified == 0) {
            //                 data.status = 0;
            //                 data.message = 'update error';
            //                 res.json(data);
            //             } else {
            //                 data.status = 1;
            //                 data.message = 'Sub Category updated successfully';
            //                 res.json(data);
            //             }
            //         })
            //     }
            // })
        } else {
            var insert_data = {};
            insert_data.id = req.body.id;
            insert_data.scatname = req.body.scatname;
            insert_data.rcategory = req.body.rcategory;
            insert_data.meta = {};
            insert_data.meta.meta_title = req.body.meta_title;
            insert_data.meta.meta_keyword = req.body.meta_keyword;
            insert_data.meta.meta_description = req.body.meta_description;
            insert_data.rootCategory = new mongoose.Types.ObjectId(req.body.rootCategory);
            if (req.files && req.files.length > 0) {
                insert_data.img = req.files[0].destination + req.files[0].filename;
            }
            // insert_data.is_cuisine = req.body.is_cuisine;
            // insert_data.is_reward = req.body.is_reward;
            insert_data.status = req.body.status;
            const dup = await db.GetOneDocument('scategory', { slug: req.body.slug1 }, { _id: 1 }, {})
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>');

            console.log(dup, 'duppppppppp');
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
            if (!dup) {
                data.status = 0;
                data.message = 'insert error';
                res.json(data);
            } else if (dup && isObjectId(dup.doc._id)) {
                data.status = 0;
                data.message = 'Sub category name already exists';
                res.json(data);
            }
            else {
                const insert = await db.InsertDocument('scategory', insert_data);
                console.log(insert_data, 'dataaaaaaa');
                console.log(insert, 'inserttttttt');
                if (!insert) {
                    data.status = 0;
                    data.message = 'insert error';
                    res.json(data);
                } else {
                    data.status = 1;
                    data.message = 'Sub Category added successfully';
                    res.json(data);
                }
                // db.InsertDocument('scategory', insert_data, (err, insert) => {
                //     if (err || !insert) {
                //         data.status = 0;
                //         data.message = 'insert error';
                //         res.json(data);
                //     } else {
                //         data.status = 1;
                //         data.message = 'Sub Category added successfully';
                //         res.json(data);
                //     }
                // });
            }
            // db.GetOneDocument('scategory', { slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
            //     if (err) {
            //         data.status = 0;
            //         data.message = 'insert error';
            //         res.json(data);
            //     } else if (dup && isObjectId(dup._id)) {
            //         data.status = 0;
            //         data.message = 'Sub category name already exists';
            //         res.json(data);
            //     } else {
            //         db.InsertDocument('scategory', insert_data, (err, insert) => {
            //             if (err || !insert) {
            //                 data.status = 0;
            //                 data.message = 'insert error';
            //                 res.json(data);
            //             } else {
            //                 data.status = 1;
            //                 data.message = 'Sub Category added successfully';
            //                 res.json(data);
            //             }
            //         });
            //     }
            // });
        }
    }

    router.sub_edit = async (req, res) => {
        if (isObjectId(req.body.id)) {
            // const id=req.body.id;
            data = {}
            let data_result = []
            const docdata = await db.GetOneDocument('scategory', { '_id': req.body.id }, {}, {})
            console.log(docdata, 'jjj');
            if (docdata) {
                var id = req.body.id;
                console.log(id, 'iddd');
                while (id != undefined) {
                    let result = await db.GetOneDocument('scategory', { '_id': id }, {}, {})

                    id = result.doc.rcategory;
                    console.log(id, 'id +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
                    data_result.push(id)
                }
                console.log(data_result, 'what about the data_result');
                data.data = docdata.doc;
                data.result = data_result;
                res.send(data);
            } else {
                data.data = docdata.doc;
                res.send(data);
            }
            // db.GetDocument('scategory', { '_id': req.body.id }, {}, {}, (err, docdata) => {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send(docdata);
            //     }
            // });
        } else {
            res.send([]);
        }
    }
    router.get_all_sub = async (req, res) => {
        console.log(req.body.id, 'hi where is loging at here 1');
        if (isObjectId(req.body.id)) {
            console.log(req.body.id, 'hi where is loging at here ');
            const docdata = await db.GetDocument('scategory', { 'rcategory': req.body.id, 'status': 1 }, {}, {})

            if (docdata.status === false) {
                res.send(err);
            } else {
                console.log(docdata);
                res.send(docdata.doc);
            }
            // db.GetDocument('scategory', { 'rcategory': req.body.id }, {}, {}, (err, docdata) => {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send(docdata);
            //     }
            // });
        }
        else {
            res.send([]);
        }
    }
    return router;
}