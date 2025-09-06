//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
// const bcrypt = require('bcrypt');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");

module.exports = function () {

    var router = {};

    router.timeList = function (req, res) {

        var regid = req.query.id;
        var matchQuery = {
            "status": 1
        }
        var doc = [];
        if (!regid || regid == 'null') {
            res.send(doc);
        } else {
            matchQuery.parent = new mongoose.Types.ObjectId(regid)
            var subCategoryQuery = [{ "$match": matchQuery }];
            db.GetAggregation('timeslots', subCategoryQuery, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                    // console.log('>>>>>>>>>>>>>>>>>>>', docdata)
                }
            });
        }
    }

    router.attributesList = function (req, res) {
        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }

        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                name: 1,
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

        if (Object.keys(req.body).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                searchs = req.body.search;
                categoryQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
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
        db.GetAggregation('timeslots', categoryQuery, function (err, docdata) {
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

    router.getalltimeslots = function (req, res) {
        db.GetDocument('timeslots', {}, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {

                res.send(docdata);
            }
        });
    }

    router.slotEdit = async function (req, res) {
        const docdata = await db.GetDocument('timeslots', { '_id': req.body.id }, {}, {})
        if (docdata.status === false) {
            res.send(docdata.doc);
        } else {
            res.send(docdata.doc);
        }
        // db.GetDocument('timeslots', { '_id': req.body.id }, {}, {}, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {

        //         res.send(docdata);
        //     }
        // });
    }

    router.slotDelete = async function (req, res) {
        if (req.body.tabledelete == true) {


            const docdatas = await db.DeleteDocument('timeslots', { '_id': { $in: req.body.ids } })
            if (docdatas.status == false) {
                res.send(docdatas.doc);
            } else {
                res.send({ data: docdatas.doc, status: 1, msg: "Deleted Successfully" });
            }

        } else {
            // console.log(req.body, "Body----");
            const checkAdmin = await db.GetOneDocument('admins', { username: req.body.username }, {}, {})
            if (checkAdmin.status === false) {
                res.send({ status: 0, msg: 'There is no user name' })
            } else {
                const isMatch = bcrypt.compareSync(req.body.password, checkAdmin.doc.password);
                if (isMatch) {
                    const docdata = await db.DeleteDocument('timeslots', { '_id': { $in: req.body.ids } })
                    if (docdata.status == false) {
                        res.send(docdata.doc);
                    } else {
                        res.send({ data: docdata.doc, status: 1, msg: "Deleted Successfully" });
                    }
                } else {
                    res.send({ status: 0, msg: 'The password doesnt match' })
                }
            }
        }

    }


    router.attSave = async function (req, res) {
        try {
            var data = {};
            var recommended = 0;
            data.weekday = req.body.value.weekday;
            data.slottime = req.body.value.slottime;
            data.time_start = req.body.value.time_start;
            data.time_end = req.body.value.time_end;
            data.status = req.body.value.status;
            console.log(recommended, 'recommended recommended');
            if (recommended == 1) {
                res.status(400).send({ message: "Time slot already added" });
            }
            else {
                if (req.body.value._id) {
                    const result = await db.UpdateDocument('timeslots', { '_id': req.body.value._id }, data)
                    console.log(result, 'this are the results');
                    if (result.status == false) {
                        res.send({ status: false, result: result.doc });
                    } else {
                        console.log(result.doc, 'this is doc');
                        res.send({ status: true, result: result.doc });
                    }
                    // db.UpdateDocument('timeslots', { '_id': req.body.value._id }, data, function (err, result) {
                    //     if (err) {
                    // 		res.send(err);
                    // 	} else {
                    // 		res.send(result);
                    // 	}
                    // });
                } else {
                    const checkAlreadyExists = await db.GetOneDocument('timeslots', { weekday: req.body.value.weekday }, {}, {})
                    console.log(checkAlreadyExists, 'This is the checkDatabase');
                    if (checkAlreadyExists.status === true) {
                        res.send({ status: false, result: 'This day is already exist' });
                    } else {
                        const result = await db.InsertDocument('timeslots', data)
                        if (!result) {
                            res.send({ status: false, result });
                        } else {
                            res.send({ status: true, result });
                        }
                    }
                }
            }
        } catch (error) {
            res.send(500).send({ status: false, result: error.message })
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
        var timeQuery = [];
        var query = { $match: { status: { $ne: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $ne: 0 }, "weekday": { $regex: '^' + searchs, $options: 'si' } } }
        }
        timeQuery.push(query);
        if (req.body.status) {
            timeQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
        }
        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            timeQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            timeQuery.push({ $sort: sorting });
        }
        if (req.body.limit && req.body.skip >= 0) {
            skip = parseInt(req.body.skip);
            limit = parseInt(req.body.limit);
        }
        timeQuery.push(
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
                                weekday: "$weekday",
                                slottime: "$slottime",
                                time_start: "$time_start",
                                time_end: "$time_end"
                            }
                        }
                    ]
                }
            }
        )
        const attlist = await db.GetAggregation('timeslots', timeQuery)
        if (!attlist) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('timeslots', [
                {
                    $facet: {
                        all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
                        active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
                        inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
                    }
                }
            ])
            if (!counts) {

            } else {
                var count = 0;
                count = attlist[0].all ? (attlist[0].all[0] ? attlist[0].all[0].all : 0) : 0;
                if (attlist[0].documentData && attlist[0].documentData.length > 0 && count) {
                    res.send([attlist[0].documentData, count, counts]);
                } else {
                    res.send([], 0, []);
                }
            }
        }
        // db.GetAggregation('timeslots', timeQuery, (err, attlist) => {
        //     if (err || !attlist || (attlist && attlist.length == 0)) {
        //         res.send([], 0, []);
        //     } else {
        //         db.GetAggregation('timeslots', [
        //             {
        //                 $facet: {
        //                     all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
        //                     active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
        //                     inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
        //                 }
        //             }
        //         ], (err, counts) => {
        //             var count = 0;
        //             count = attlist[0].all ? (attlist[0].all[0] ? attlist[0].all[0].all : 0) : 0;
        //             if (attlist[0].documentData && attlist[0].documentData.length > 0 && count) {
        //                 res.send([attlist[0].documentData, count, counts]);
        //             } else {
        //                 res.send([], 0, []);
        //             }
        //         })
        //     }
        // });
    }

    return router;
}
