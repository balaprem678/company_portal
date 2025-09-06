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
    router.list = (req, res) => {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = { $match: { status: { $ne: 0 } } };
        //var query = {};
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $ne: 0 }, "brandname": { $regex: '^' + searchs, $options: 'si' } } }
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
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: "$_id",
                                status: "$status",
                                img: "$img",
                                brandname: "$brandname"
                            }
                        }
                    ]
                }
            }
        )
        db.GetAggregation('brands', rcatQuery, (err, rcatlist) => {
            if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
                res.send([], 0, []);
            } else {
                db.GetAggregation('brands', [
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

    router.brand_list = function (req, res) {
        var errors = req.validationErrors();
        var query = {};
        if (req.body.status == 0) {
            query = { status: { $ne: 0 } };
        }else {
            query = { status: { $eq: req.body.status } };
        }

        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var usersQuery = [{ "$match": { status: { $ne: 0 } } },
        { $lookup: { from: 'rcategory', localField: "rcategory", foreignField: "_id", as: "rcategory" } },
        { $unwind: { path: "$rcategory", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                scatname: 1,
                img: 1,
                rcategory: 1,
                status: 1,
				sort_name: { $toLower: '$scatname' },
                sort_rcatname: { $toLower: '$rcategory.rcatname' },
                substat: { $cond: { if: { $eq: ["$status", 0] }, then: { "$sum": 1 }, else: { "$sum": 0 } } },
                "img": {
                    "$cond": [{ "$eq": ["$images", []] }, [{ url: { $literal: "uploads/default/category.jpg" }, tag: { $literal: "" } }], "$images"]
                }
            }
        },
        {
            $project: {
                scatname: 1,
                rcategory: 1,
                img: 1,
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
            usersQuery.push({ "$match": { $or: [{ "documentData.rcategory.rcatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.scatname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
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
        }
        if (!req.body.search) {
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        try {
            db.GetAggregation('scategory', usersQuery, function (err, docdata) {
                if (err || docdata.length <= 0) {
                    res.send([0, 0]);
                } else {
                    res.send([docdata[0].documentData, docdata[0].count]);

                }
            });
        } catch (e) {
        }
    };
    router.delete = (req, res) => {
        req.checkBody('ids', 'Invalid ids').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('brands', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true }, (err, docdata) => {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.dlist = (req, res) => {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var brandQuery = [];
        var query = { $match: { status: { $eq: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $eq: 0 }, "brandname": { $regex: '^' + searchs, $options: 'si' } } }
        }
        brandQuery.push(query);

        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            brandQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            brandQuery.push({ $sort: sorting });
        }
        if (req.body.limit && req.body.skip >= 0) {
            skip = parseInt(req.body.skip);
            limit = parseInt(req.body.limit);
        }
        brandQuery.push(
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
                                brandname: "$brandname"
                            }
                        }
                    ]
                }
            }
        )
        db.GetAggregation('brands', brandQuery, (err, brandlist) => {
            if (err || !brandlist || (brandlist && brandlist.length == 0)) {
                res.send([[], 0]);
            } else {
                var count = 0;
                count = brandlist[0].all ? (brandlist[0].all[0] ? brandlist[0].all[0].all : 0) : 0;
                if (brandlist[0].documentData && brandlist[0].documentData.length > 0 && count) {
                    res.send([brandlist[0].documentData, count]);
                } else {
                    res.send([[], 0]);
                }
            }
        });
    }

    router.brand_save = (req, res) => {
        data = {};
        if (req.body._id && isObjectId(req.body._id)) {
            var update_data = {};
            update_data.brandname = req.body.brandname;
            update_data.rcategory = req.body.rcategory;
            update_data.scategory = req.body.scategory;
            if (req.files && req.files.length > 0) {
                update_data.img = req.files[0].destination + req.files[0].filename;
            }
            // update_data.is_cuisine = req.body.is_cuisine;
            // update_data.is_reward = req.body.is_reward;
            //update_data.is_fssai = req.body.is_fssai;
            update_data.status = req.body.status;
            update_data.slug = req.body.slug1;
            //update_data.is_food = 0;
            // if (req.body.slug1 == 'food') {
            //     update_data.is_food = 1;
            // }
            db.GetOneDocument('brands', { _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
                if (err) {
                    data.status = 0;
                    data.message = 'Update error';
                    res.json(data);
                } else if (dup && isObjectId(dup._id)) {
                    data.status = 0;
                    data.message = 'Brand name already exists';
                    res.json(data);
                } else {
                    db.UpdateDocument('brands', { _id: mongoose.Types.ObjectId(req.body._id) }, update_data, {}, (err, update) => {
                        if (err || !update || update.nModified == 0) {
                            data.status = 0;
                            data.message = 'update error';
                            res.json(data);
                        } else {
                            data.status = 1;
                            data.message = 'Brand updated successfully';
                            res.json(data);
                        }
                    })
                }
            })
        } else {
            var insert_data = {};
            insert_data.brandname = req.body.brandname;
            insert_data.rcategory = req.body.rcategory;
            insert_data.scategory = req.body.scategory;
            if (req.files && req.files.length > 0) {
                insert_data.img = req.files[0].destination + req.files[0].filename;
            }
           
            // insert_data.is_cuisine = req.body.is_cuisine;
            // insert_data.is_reward = req.body.is_reward;
            insert_data.status = req.body.status;
            db.GetOneDocument('brands', { slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
                if (err) {
                    data.status = 0;
                    data.message = 'insert error';
                    res.json(data);
                } else if (dup && isObjectId(dup._id)) {
                    data.status = 0;
                    data.message = 'Brand name already exists';
                    res.json(data);
                } else {
                    db.InsertDocument('brands', insert_data, (err, insert) => {
                        if (err || !insert) {
                            data.status = 0;
                            data.message = 'insert error';
                            res.json(data);
                        } else {
                            data.status = 1;
                            data.message = 'Brand added successfully';
                            res.json(data);
                        }
                    });
                }
            });
        }
    }

    router.brand_edit = (req, res) => {
        if (isObjectId(req.body.id)) {
            db.GetDocument('brands', { '_id': req.body.id }, {}, {}, (err, docdata) => {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        } else {
            res.send([]);
        }
    }

    return router;
}