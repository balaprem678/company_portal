//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");

module.exports = function () {

    var router = {};

    router.attList = async function (req, res) {
        console.log("hi");
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
            const docdata = await db.GetAggregation('attributes', subCategoryQuery)
            if (!docdata) {
                res.send('err');
            } else {
                res.send(docdata);
                // console.log('>>>>>>>>>>>>>>>>>>>', docdata)
            }
            // db.GetAggregation('attributes', subCategoryQuery, function (err, docdata) {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send(docdata);
            //         // console.log('>>>>>>>>>>>>>>>>>>>', docdata)
            //     }
            // });
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
        db.GetAggregation('attributes', categoryQuery, function (err, docdata) {
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

    router.getallatt = async function (req, res) {
        console.log("hii");
        const docdata = await db.GetDocument('attributes', {}, {}, {})
        if (!docdata) {
            res.send('err');
        } else {

            res.send(docdata.doc);
        }
        // db.GetDocument('attributes', {}, {}, {}, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {

        //         res.send(docdata);
        //     }
        // });
    }

    router.attEdit = async function (req, res) {
        const docdata = await db.GetDocument('attributes', { '_id': req.body.id }, {}, {})
        if (docdata.status === false) {
            res.send(docdata.doc);
        } else {

            res.send(docdata.doc);
        }
        // db.GetDocument('attributes', { '_id': req.body.id }, {}, {}, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {

        //         res.send(docdata);
        //     }
        // });
    }

    router.attDelete = async function (req, res) {

        var data = {}
        const checkAttribute = await db.GetDocument('food', { "price_details.attributes.parrent_id": { $in: req.body.ids } }, {}, {})

        if (checkAttribute && checkAttribute.doc && checkAttribute.doc.length > 0) {

            data.status = 0
            data.msg = "Some products are mapped with the selected attribute. Please remove it from those products"

            res.send(data)

        } else {
            const docdata = await db.DeleteDocument('attributes', { '_id': { $in: req.body.ids } })

            if (docdata.status === false) {
                res.send(docdata.doc);
            } else {
                res.send(docdata.doc);
            }
        }


    }


    router.attSave = async function (req, res) {
        var data = {};
        var recommended = 0;
        console.log(req.body, 'req.body');
        console.log(req.body.value, 'this is values');
        data.name = req.body.value.name;
        data.slug = req.body.value.slug.toLowerCase();
        data.units = req.body.value.units;
        data.status = req.body.value.status;
        // console.log('recommended', recommended)
        if (recommended == 1) {
            res.status(400).send({ message: "Attribute already added" });
        }
        else {
            if (req.body.value.category && Array.isArray(req.body.value.category) && req.body.value.category.length > 0) {
                data.category = req.body.value.category;
            };
            if (req.body.value._id) {
                const name = data.name.toLowerCase()
                const units = await db.GetOneDocument('attributes', { 'slug': name }, {}, {})
                console.log(units);

                // if(units.status ){
                //     res.send({status:false,msg:'Something went wrong'});
                // }
                if (units.status && units.doc.length > 1) {
                    res.send({ status: false, msg: 'Something went wrong' });
                }
                else {
                    const result = await db.UpdateDocument('attributes', { '_id': req.body.value._id }, data)
                    if (!result) {
                        res.send({ status: false, msg: 'The unit is already exists' });
                    } else {
                        // db.UpdateDocument('category', { '_id': req.body.value._id }, { $push: { 'ancestors': tempancestors } }, function (err, anfftresult) {
                        // });
                        res.send({ status: true, result });
                    }
                }
                // db.UpdateDocument('attributes', { '_id': req.body.value._id }, data, function (err, result) {
                //     if (err) {
                //         res.send(err);
                //     } else {
                //         // db.UpdateDocument('category', { '_id': req.body.value._id }, { $push: { 'ancestors': tempancestors } }, function (err, anfftresult) {
                //         // });
                //         res.send(result);
                //     }
                // });
            } else {
                const name = data.name.toLowerCase()
                console.log(name);
                const units = await db.GetOneDocument('attributes', { 'slug': name }, {}, {})
                console.log(units, 'units');
                if (units.status) {
                    res.send({ status: false, msg: 'The unit is already exists' });
                }
                else {
                    const result = await db.InsertDocument('attributes', data)
                    if (!result) {
                        res.send({ status: false, msg: 'Something went wrong' });
                    } else {
                        res.send({ status: true, result });
                    }
                }
                // db.InsertDocument('attributes', data, function (err, result) {
                //     if (err) {
                //         res.send(err);
                //     } else {
                //         // db.UpdateDocument('category', { '_id': result._id }, { $push: { 'ancestors': tempancestors } }, function (err, antresult) {
                //         // });
                //         res.send(result);
                //     }
                // });
            }
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
        var attQuery = [];
        var query = { $match: { status: { $ne: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $ne: 0 }, "name": { $regex: '^' + searchs, $options: 'si' } } }
        }
        attQuery.push(query);
        if (req.body.status) {
            attQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
        }
        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            attQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            attQuery.push({ $sort: sorting });
        }
        if (req.body.limit && req.body.skip >= 0) {
            skip = parseInt(req.body.skip);
            limit = parseInt(req.body.limit);
        }
        attQuery.push(
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
                                name: "$name",
                                units: "$units",
                                category : 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            }
        )
        const attlist = await db.GetAggregation('attributes', attQuery)
        if (!attlist || (attlist && attlist.length == 0)) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('attributes', [
                {
                    $facet: {
                        all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
                        active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
                        inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
                    }
                }
            ])
            var count = 0;
            count = attlist[0].all ? (attlist[0].all[0] ? attlist[0].all[0].all : 0) : 0;
            if (attlist[0].documentData && attlist[0].documentData.length > 0 && count) {
                res.send([attlist[0].documentData, count, counts]);
            } else {
                res.send([], 0, []);
            }
            // db.GetAggregation('attributes', [
            //     {
            //         $facet: {
            //             all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
            //             active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
            //             inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
            //         }
            //     }
            // ], (err, counts) => {
            //     var count = 0;
            //     count = attlist[0].all ? (attlist[0].all[0] ? attlist[0].all[0].all : 0) : 0;
            //     if (attlist[0].documentData && attlist[0].documentData.length > 0 && count) {
            //         res.send([attlist[0].documentData, count, counts]);
            //     } else {
            //         res.send([], 0, []);
            //     }
            // })
        }
        // db.GetAggregation('attributes', attQuery, (err, attlist) => {
        //     if (err || !attlist || (attlist && attlist.length == 0)) {
        //         res.send([], 0, []);
        //     } else {
        //         db.GetAggregation('attributes', [
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