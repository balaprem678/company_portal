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
    router.save = async (req, res) => {
        data = {};
        if (req.body._id && isObjectId(req.body._id)) {
            var update_data = {};
            update_data.rcatname = req.body.rcatname;
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    if (req.files[i].fieldname == 'img') {
                        update_data.img = req.files[i].destination + req.files[i].filename;
                    }
                    if (req.files[i].fieldname == 'iconimg') {
                        update_data.iconimg = req.files[i].destination + req.files[i].filename;
                    }
                    if (req.files[i].fieldname == 'bannerimg') {
                        update_data.bannerimg = req.files[i].destination + req.files[i].filename;
                    }
                }
            }
            update_data.is_cuisine = req.body.is_cuisine;
            update_data.is_reward = req.body.is_reward;
            // update_data.Taxs = parseInt(req.body.Taxs);
            update_data.is_fssai = req.body.is_fssai;
            update_data.status = req.body.status;
            update_data.slug = req.body.slug1;
            update_data.meta = {}
            update_data.meta.meta_title = req.body.meta_title
            update_data.meta.meta_keyword = req.body.meta_keyword
            update_data.meta.meta_description = req.body.meta_description
            update_data.is_food = 0;
            if (req.body.slug1 == 'food') {
                update_data.is_food = 1;
            }
            const dup = await db.GetOneDocument('rcategory', { _id: { $ne: new mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {})
            if (!dup) {
                data.status = 0;
                data.message = 'insert error';
                res.json(data);
            } else if (dup.doc && isObjectId(dup.doc._id)) {
                data.status = 0;
                data.message = 'Category slug already exists';
                res.json(data);
            } else {
                const update = await db.UpdateDocument('rcategory', { _id: new mongoose.Types.ObjectId(req.body._id) }, update_data, {})
                if (!update || update.doc.nModified == 0) {
                    data.status = 0;
                    data.message = 'update error';
                    res.json(data);
                } else {
                    data.status = 1;
                    data.message = 'Category updated successfully';
                    res.json(data);
                }

            }

        } else {
            var insert_data = {};
            insert_data.rcatname = req.body.rcatname;
            if (req.files && req.files.length > 0) {

                for (let i = 0; i < req.files.length; i++) {
                    if (req.files[i].fieldname == 'img') {
                        insert_data.img = req.files[i].destination + req.files[i].filename;
                    }
                    if (req.files[i].fieldname == 'iconimg') {
                        insert_data.iconimg = req.files[i].destination + req.files[i].filename;
                    }
                    if (req.files[i].fieldname == 'bannerimg') {
                        insert_data.bannerimg = req.files[i].destination + req.files[i].filename;
                    }
                }




            }



            insert_data.is_cuisine = req.body.is_cuisine;
            insert_data.is_reward = req.body.is_reward;
            insert_data.status = req.body.status;
            // insert_data.Taxs = parseInt(req.body.Taxs);
            insert_data.meta = {}
            insert_data.meta.meta_title = req.body.meta_title
            insert_data.meta.meta_keyword = req.body.meta_keyword
            insert_data.meta.meta_description = req.body.meta_description
            const dup = await db.GetOneDocument('rcategory', { slug: req.body.slug1 }, { _id: 1 }, {})
            if (!dup) {
                data.status = 0;
                data.message = 'insert error';
                res.json(data);
            } else if (dup.doc && isObjectId(dup.doc._id)) {
                data.status = 0;
                data.message = 'category name already exists';
                res.json(data);
            } else {
                const insert = await db.InsertDocument('rcategory', insert_data)
                if (!insert) {
                    data.status = 0;
                    data.message = 'insert error';
                    res.json(data);
                } else {
                    data.status = 1;
                    data.message = 'Category added successfully';
                    res.json(data);
                }
            }
        }
    }
    router.edit = async (req, res) => {
        if (isObjectId(req.body.id)) {
            const docdata = await db.GetDocument('rcategory', { '_id': req.body.id }, {}, {})
            if (!docdata) {
                res.send(err);
            } else {
                res.send(docdata.doc);
            }
            // db.GetDocument('rcategory', { '_id': req.body.id }, {}, {}, (err, docdata) => {
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
    router.list = async (req, res) => {
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = { $match: { status: { $ne: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $ne: 0 }, "rcatname": { $regex: '^' + searchs, $options: 'si' } } }
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
                                feature: "$feature",
                                img: "$img",
                                rcatname: "$rcatname",
                                // Taxs : 1
                            }
                        }
                    ]
                }
            }
        )
        console.log(rcatQuery[2], 'rcatQuery0---------');
        const rcatlist = await db.GetAggregation('rcategory', rcatQuery)
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('rcategory', [
                {
                    $facet: {
                        all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
                        active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
                        inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
                    }
                }
            ])
            var count = 0;
            count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
            if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
                res.send([rcatlist[0].documentData, count, counts]);
            } else {
                res.send([], 0, []);
            }
            // db.GetAggregation('rcategory', [
            //     {
            //         $facet: {
            //             all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
            //             active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
            //             inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
            //         }
            //     }
            // ], (err, counts) => {
            //     var count = 0;
            //     count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
            //     if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
            //         res.send([rcatlist[0].documentData, count, counts]);
            //     } else {
            //         res.send([], 0, []);
            //     }
            // })
        }
    }


    router.exportCategoryList = async (req, res, next) => {
        try {
            var query = { status: { $ne: 0 } }; // Default query to exclude inactive categories
    
            // Add search filter if provided
            if (req.body.search) {
                const searchs = req.body.search;
                query.rcatname = { $regex: '^' + searchs, $options: 'si' }; // Regex for case-insensitive search
            }
    
            // Fetch the category data
            const categoryList = await db.GetAggregation('rcategory', [
                { $match: query },
                {
                    $project: {
                        _id: "$_id",
                        status: "$status",
                        feature: "$feature",
                        img: "$img",
                        rcatname: "$rcatname",
                        Taxs: 1
                    }
                }
            ]);
            const formattedCategoryList = categoryList.map(cat => ({
                ...cat,
                status: cat.status === 1 ? 'Active' : cat.status === 2 ? 'Inactive' : '',
            }));
            // Prepare CSV fields
            req.fields = [
                { label: 'Category Name', value: 'rcatname' },
                { label: 'Status', value: 'status' },
                // { label: 'Feature', value: 'feature' },
                // { label: 'Image', value: 'img' },
                { label: 'Tax (in %)', value: 'Taxs' }
            ];
    
            // Set the data for CSV export
            req.data = formattedCategoryList;
    
            // Call the CSV middleware to handle the export
            next();
    
        } catch (err) {
            console.error("Error exporting category list:", err);
            res.status(500).send("Error exporting category list");
        }
    };


    router.delete = async (req, res) => {
        // req.checkBody('ids', 'Invalid ids').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        if (req.body.forcedelete) {
            const docdata = await db.DeleteDocument('rcategory', { _id: { $in: req.body.ids } })
            if (!docdata) {
                res.send({ status: 0, message: err.message });
            } else {
                res.send({ status: 1, message: 'Successfully Deleted' });
            }
            // db.DeleteDocument('rcategory', { _id: { $in: req.body.ids } }, (err, docdata) => {
            //     if (err) {
            //         res.send({status:0,message: err.message});
            //     } else {
            //         res.send({status: 1, message: 'Successfully Deleted' });
            //     }
            // });
        } else {
            const docdata = await db.UpdateDocument('rcategory', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
            if (!docdata) {
                res.send({ status: 0, message: err.message });
            } else {
                res.send({ status: 1, message: 'Successfully Deleted' });
            }
            // db.UpdateDocument('rcategory', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true }, (err, docdata) => {
            //     if (err) {
            //         res.send({status:0,message: err.message});
            //     } else {
            //         res.send({status: 1, message: 'Successfully Deleted' });
            //     }
            // });
        }
    };

    router.deletecat = (req, res) => {
        req.checkBody('id', 'Invalid category Id').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.db == 'rcategory') {
            query = { rcategory: req.body.id };
        } else {
            query = { scategory: req.body.id };
        }

        db.GetCount('food', query, function (err, countData) {
            if (err) {
                res.send({ status: 0, message: err });
            } else {
                //console.log(countData);
                //return false;
                if (countData == 0) {
                    db.DeleteDocument(req.body.db, { '_id': mongoose.Types.ObjectId(req.body.id) }, (err, docdata) => {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send({ status: 1, message: "Category deleted successfully..", docdata: docdata });
                        }
                    });
                } else {
                    res.send({ status: 1, message: "Can't delete products existed", count: countData });
                }


            }
        });

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
            query = { "$match": { status: { $ne: 0 }, "rcatname": { $regex: '^' + searchs, $options: 'si' } } }
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
                                rcatname: "$rcatname"
                            }
                        }
                    ]
                }
            }
        )
        const rcatlist = await db.GetAggregation('rcategory', rcatQuery)
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
        // db.GetAggregation('rcategory', rcatQuery, (err, rcatlist) => {
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

    return router;
}