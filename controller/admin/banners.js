//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
const bcrypt = require('bcrypt');
var CONFIG = require('../../config/config.js');
var async = require("async");
var timezone = require('moment-timezone');
const { tags, offermanagement, testimonial } = require('../../model/mongodb.js');

var isObjectId = (n) => {
    return mongoose.Types.ObjectId.isValid(n);
}
module.exports = (app, io) => {

    var router = {};
    router.weblist = async (req, res) => {
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = {};
        if (req.body.status) {
            query = { $match: { status: { $eq: req.body.status } } };
        } else {
            query = { $match: { status: { $ne: 0 } } };
        }

        if (req.body.search) {
            var searchs = req.body.search;
            query = {
                "$match": {
                    "status": { "$ne": 0 },
                    "$or": [
                        { "bannername": { "$regex": '^' + searchs, "$options": 'si' } },
                        { "category": { "$regex": '^' + searchs, "$options": 'si' } }
                    ]
                }
            };

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
                                category: "$category",
                                bannername: "$bannername",
                                description: "$description",
                            }
                        }
                    ]
                }
            }
        )
        const rcatlist = await db.GetAggregation('webbanners', rcatQuery)
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('webbanners', [
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
            // db.GetAggregation('webbanners', [
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
        // db.GetAggregation('webbanners', rcatQuery, (err, rcatlist) => {
        //     if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
        //         res.send([], 0, []);
        //     } else {
        //         db.GetAggregation('webbanners', [
        //             {
        //                 $facet: {
        //                     all: [{ $match: { status: { $ne: 0 } } }, { $count: 'count' }],
        //                     active: [{ $match: { status: { $eq: 1 } } }, { $count: 'count' }],
        //                     inactive: [{ $match: { status: { $eq: 2 } } }, { $count: 'count' }]
        //                 }
        //             }
        //         ], (err, counts) => {
        //             var count = 0;
        //             count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
        //             if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
        //                 res.send([rcatlist[0].documentData, count, counts]);
        //             } else {
        //                 res.send([], 0, []);
        //             }
        //         })
        //     }
        // });
    }

    router.moblist = (req, res) => {
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
            query = { "$match": { status: { $ne: 0 }, "bannername": { $regex: '^' + searchs, $options: 'si' } } }
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
                                bannername: "$bannername"
                            }
                        }
                    ]
                }
            }
        )
        db.GetAggregation('mobbanners', rcatQuery, (err, rcatlist) => {
            if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
                res.send([], 0, []);
            } else {
                db.GetAggregation('mobbanners', [
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
    router.webdelete = async (req, res) => {
        // req.checkBody('ids', 'Invalid ids').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        console.log(req.body, 'BoDy');
        if (req.body.username === '' || req.body.password === '') {
            const update_data = await db.GetOneDocument('webbanners', { _id: req.body.ids[0] }, {}, {})
            if (update_data.doc.status != 0) {
                const docdata = await db.UpdateAllDocument('webbanners', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
                if (docdata.status === false) {
                    res.send(err);
                } else {
                    console.log("commeng in update console")
                    res.send(docdata.doc);
                }
            } else {
                const permenent_delet = await db.DeleteDocument('webbanners', { _id: { $in: req.body.ids } })
                if (permenent_delet.status === false) {
                    res.send('err');
                } else {
                    console.log("commeng in delete console")
                    res.send(permenent_delet.doc);
                }
            }
        }
        else {
            console.log('enetered B');
            const admin = await db.GetOneDocument('admins', { username: req.body.username }, {}, {})
            console.log(admin, "adminadminadminadmin");

            if (admin.status === false) {
                res.send({ status: false, msg: 'Username you entered is not correct.' })
            } else {
                const hashedPassword = admin.doc.password;
                console.log(hashedPassword, 'hashedpassword');
                const isMatch = bcrypt.compareSync(req.body.password, hashedPassword);
                if (isMatch) {
                    const update_data = await db.GetOneDocument('webbanners', { _id: req.body.ids[0] }, {}, {})
                    console.log("jo");
                    if (update_data.doc.status != 0) {
                        const docdata = await db.UpdateAllDocument('webbanners', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
                        if (docdata.status === false) {
                            res.send(err);
                        } else {
                            res.send(docdata.doc);
                        }
                    } else {
                        const permenent_delet = await db.DeleteDocument('webbanners', { _id: { $in: req.body.ids } })
                        if (permenent_delet.status === false) {
                            res.send('err');
                        } else {
                            res.send(permenent_delet.doc);
                        }
                    }
                } else {
                    return res.send({ status: false, msg: 'The password is incorrect' })
                }
            }
        }





        // db.UpdateDocument('webbanners', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true }, (err, docdata) => {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    };

    router.mobdelete = (req, res) => {
        req.checkBody('ids', 'Invalid ids').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('mobbanners', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true }, (err, docdata) => {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.dweblist = async (req, res) => {
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
            query = { "$match": { status: { $ne: 0 }, "bannername": { $regex: '^' + searchs, $options: 'si' } } }
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
                                bannername: "$bannername",
                                description: "$description",
                                category: 1
                            }
                        }
                    ]
                }
            }
        )
        //console.log(rcatQuery)
        const rcatlist = await db.GetAggregation('webbanners', rcatQuery)
        console.log(rcatlist)
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0);
        } else {
            var count = 0;
            count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
            if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
                res.send([rcatlist[0].documentData, count]);
            } else {
                res.send([rcatlist[0].documentData, 0]);
            }
        }
        // db.GetAggregation('webbanners', rcatQuery, (err, rcatlist) => {
        //     console.log(rcatlist)
        //     if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
        //         res.send([], 0);
        //     } else {
        //         var count = 0;
        //         count = rcatlist[0].all ? (rcatlist[0].all[0] ? rcatlist[0].all[0].all : 0) : 0;
        //         if (rcatlist[0].documentData && rcatlist[0].documentData.length > 0 && count) {
        //             res.send([rcatlist[0].documentData, count]);
        //         } else {
        //             res.send([rcatlist[0].documentData, 0]);
        //         }
        //     }
        // });
    }

    router.dmoblist = (req, res) => {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = { $match: { status: { $eq: 0 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $ne: 0 }, "bannername": { $regex: '^' + searchs, $options: 'si' } } }
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
                                bannername: "$bannername"
                            }
                        }
                    ]
                }
            }
        )
        db.GetAggregation('mobbanners', rcatQuery, (err, rcatlist) => {
            if (err || !rcatlist || (rcatlist && rcatlist.length == 0)) {
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
        });
    }

    router.websave = async (req, res) => {
        data = {};

        if (req.body._id && isObjectId(req.body._id)) {
            var update_data = {};
            update_data.bannername = req.body.bannername;
            update_data.description = req.body.description;
            update_data.category = req.body.banner_category;
            update_data.category_id = req.body.banner_category_id;

            if (req.files && req.files.length > 0) {
                update_data.img = req.files[0].destination + req.files[0].filename;
            }

            update_data.status = req.body.status;
            update_data.slug = req.body.slug1;
            const dup = await db.GetOneDocument('webbanners', { _id: { $ne: new mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {})
            if (!dup.doc) {
                data.status = 0;
                data.message = 'insert error';
                res.json(data);
            } else if (dup.doc && isObjectId(dup.doc._id)) {
                data.status = 0;
                data.message = 'banner name already exists';
                res.json(data);
            } else {
                const update = await db.UpdateDocument('webbanners', { _id: new mongoose.Types.ObjectId(req.body._id) }, update_data, {})
                if (update.status === false) {
                    data.status = 0;
                    data.message = 'update error';
                    res.json(data);
                } else {
                    data.status = 1;
                    data.message = 'Banner updated successfully';
                    res.json(data);
                }
                // db.UpdateDocument('webbanners', { _id: mongoose.Types.ObjectId(req.body._id) }, update_data, {}, (err, update) => {
                //     if (err || !update || update.nModified == 0) {
                //         data.status = 0;
                //         data.message = 'update error';
                //         res.json(data);
                //     } else {
                //         data.status = 1;
                //         data.message = 'Banner updated successfully';
                //         res.json(data);
                //     }
                // })
            }
            // db.GetOneDocument('webbanners', { _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
            //     if (err) {
            //         console.log(err)
            //         data.status = 0;
            //         data.message = 'insert error';
            //         res.json(data);
            //     } else if (dup && isObjectId(dup._id)) {
            //         data.status = 0;
            //         data.message = 'banner name already exists';
            //         res.json(data);
            //     } else {
            //         db.UpdateDocument('webbanners', { _id: mongoose.Types.ObjectId(req.body._id) }, update_data, {}, (err, update) => {
            //             if (err || !update || update.nModified == 0) {
            //                 data.status = 0;
            //                 data.message = 'update error';
            //                 res.json(data);
            //             } else {
            //                 data.status = 1;
            //                 data.message = 'Banner updated successfully';
            //                 res.json(data);
            //             }
            //         })
            //     }
            // })
        } else {
            console.log(req.body, 'This is the data from another universe');
            var insert_data = {};
            insert_data.bannername = req.body.bannername;
            insert_data.description = req.body.description;
            insert_data.category = req.body.banner_category;
            insert_data.category_id = req.body.banner_category_id;
            if (req.files && req.files.length > 0) {
                insert_data.img = req.files[0].destination + req.files[0].filename;
            }
            insert_data.status = req.body.status;
            const dup = await db.GetOneDocument('webbanners', { slug: req.body.slug1 }, { _id: 1 }, {})
            if (!dup) {
                data.status = 0;
                data.message = 'insert error';
                res.json(data);
            } else if (dup.doc && isObjectId(dup.doc._id)) {
                data.status = 0;
                data.message = 'Banner name already exists';
                res.json(data);
            } else {
                const insert = await db.InsertDocument('webbanners', insert_data)
                if (!insert) {
                    data.status = 0;
                    data.message = 'insert error';
                    res.json(data);
                } else {
                    data.status = 1;
                    data.message = 'Banner added successfully';
                    res.json(data);
                }
                // db.InsertDocument('webbanners', insert_data, (err, insert) => {
                //     if (err || !insert) {
                //         data.status = 0;
                //         data.message = 'insert error';
                //         res.json(data);
                //     } else {
                //         data.status = 1;
                //         data.message = 'Banner added successfully';
                //         res.json(data);
                //     }
                // });
            }
            // db.GetOneDocument('webbanners', { slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
            //     if (err) {
            //         data.status = 0;
            //         data.message = 'insert error';
            //         res.json(data);
            //     } else if (dup && isObjectId(dup._id)) {
            //         data.status = 0;
            //         data.message = 'Banner name already exists';
            //         res.json(data);
            //     } else {
            //         db.InsertDocument('webbanners', insert_data, (err, insert) => {
            //             if (err || !insert) {
            //                 data.status = 0;
            //                 data.message = 'insert error';
            //                 res.json(data);
            //             } else {
            //                 data.status = 1;
            //                 data.message = 'Banner added successfully';
            //                 res.json(data);
            //             }
            //         });
            //     }
            // });
        }
    }

    router.mobsave = (req, res) => {
        data = {};
        if (req.body._id && isObjectId(req.body._id)) {
            var update_data = {};
            update_data.bannername = req.body.bannername;
            if (req.files && req.files.length > 0) {
                update_data.img = req.files[0].destination + req.files[0].filename;
            }
            update_data.status = req.body.status;
            update_data.slug = req.body.slug1;

            db.GetOneDocument('mobbanners', { _id: { $ne: mongoose.Types.ObjectId(req.body._id) }, slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
                if (err) {
                    console.log(err)
                    data.status = 0;
                    data.message = 'insert error';
                    res.json(data);
                } else if (dup && isObjectId(dup._id)) {
                    data.status = 0;
                    data.message = 'banner name already exists';
                    res.json(data);
                } else {
                    db.UpdateDocument('mobbanners', { _id: mongoose.Types.ObjectId(req.body._id) }, update_data, {}, (err, update) => {
                        if (err || !update || update.nModified == 0) {
                            data.status = 0;
                            data.message = 'update error';
                            res.json(data);
                        } else {
                            data.status = 1;
                            data.message = 'Banner updated successfully';
                            res.json(data);
                        }
                    })
                }
            })
        } else {
            var insert_data = {};
            insert_data.bannername = req.body.bannername;
            if (req.files && req.files.length > 0) {
                insert_data.img = req.files[0].destination + req.files[0].filename;
            }
            insert_data.status = req.body.status;
            db.GetOneDocument('mobbanners', { slug: req.body.slug1 }, { _id: 1 }, {}, (err, dup) => {
                if (err) {
                    data.status = 0;
                    data.message = 'insert error';
                    res.json(data);
                } else if (dup && isObjectId(dup._id)) {
                    data.status = 0;
                    data.message = 'Banner name already exists';
                    res.json(data);
                } else {
                    db.InsertDocument('mobbanners', insert_data, (err, insert) => {
                        if (err || !insert) {
                            data.status = 0;
                            data.message = 'insert error';
                            res.json(data);
                        } else {
                            data.status = 1;
                            data.message = 'Banner added successfully';
                            res.json(data);
                        }
                    });
                }
            });
        }
    }

    router.webedit = async (req, res) => {
        if (isObjectId(req.body.id)) {
            const docdata = await db.GetDocument('webbanners', { '_id': req.body.id }, {}, {})
            if (docdata.status === false) {
                res.send(err);
            } else {
                console.log(docdata.doc, 'this is the doc data');
                res.send(docdata.doc);
            }
            // db.GetDocument('webbanners', { '_id': req.body.id }, {}, {}, (err, docdata) => {
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

    router.mobedit = (req, res) => {
        if (isObjectId(req.body.id)) {
            db.GetDocument('mobbanners', { '_id': req.body.id }, {}, {}, (err, docdata) => {
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

    router.webPermanentdelete = async function (req, res) {
        // req.checkBody('ids', 'Invalid ids').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        console.log(req.body, 'BoDy');
        // const docdata = await db.DeleteDocument('webbanners', { _id: { $in: req.body.ids } })
        // if (docdata.status === false) {
        //     res.send({ status: 0, message: err.message });
        // } else {
        //     res.send({ status: 1, message: 'Successfully Deleted' });
        // }

        // db.DeleteDocument('webbanners', { _id: { $in: req.body.ids } }, function (err, docdata) {
        //     if (err) {
        //         res.send({ status: 0, message: err.message });
        //     } else {

        //         res.send({ status: 1, message: 'Successfully Deleted' });
        //     }
        // });
    };
    router.offer_management = async (req, res) => {
        try {
            var data = {};
            data.offer_name = req.body.offer_name
            // data.offer_url = req.body.offer_url
            data.producturl = req.body.producturl
            data.category = req.body.category
            data.products = req.body.products
            // data.content = req.body.specification
            // data.type_name = req.body.type_name
            // data.type_status = req.body.type_status
            data.status = req.body.status
            if (req.file && req.file != undefined) {
                console.log(req.file, "req.file");
                data.image = req.file.destination + req.file.filename;
                data.image_name = req.file.originalname;
            }
            if (req.body._id) {
                const docdata = await db.UpdateDocument('offermanagement', { _id: req.body._id }, data, {});
                if (docdata.status === false) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Updated Successfully", response: docdata.doc });
                }
            } else {
                const result = await db.InsertDocument('offermanagement', data);
                if (!result) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Created Successfully", response: result });
                }
            };
        } catch (error) {
            console.log(error, "Error");
        }

    };
    router.testimonial = async (req, res) => {
        try {
            console.log(req.body, "reqqqqqqqqqqqqqqqqqq");

            // return
            var data = {};
            data.name = req.body.name
            data.rating = req.body.rating
            data.location = req.body.location
            data.description = req.body.description
            data.products = req.body.products
            data.status = req.body.status
            if (req.file && req.file != undefined) {
                console.log(req.file, "req.file");
                data.image = req.file.destination + req.file.filename;
                data.image_name = req.file.originalname;
            }
            if (req.body._id) {
                const docdata = await db.UpdateDocument('testimonial', { _id: req.body._id }, data, {});
                if (docdata.status === false) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Updated Successfully", response: docdata.doc });
                }
            } else {
                const result = await db.InsertDocument('testimonial', data);
                if (!result) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Created Successfully", response: result });
                }
            };
        } catch (error) {
            console.log(error, "Error");
        }

    };

    router.bannerType = async (req, res) => {
        try {
            var data = {};
            data.banner_name = req.body.banner_name
            data.banner_url = req.body.banner_url
            // data.content = req.body.specification
            data.type_name = req.body.type_name
            data.type_status = req.body.type_status
            data.status = req.body.status
            if (req.file && req.file != undefined) {

                console.log(req.file, "req.file");
                console.log(req.uploadedFiles, "req.file");
                // data.image = req.file.destination + req.file.filename;
                data.image = {
                    webpImage: req.file.destination + req.uploadedFiles.webp,
                    fallbackImage: req.file.destination + req.uploadedFiles.original
                }
                data.image_name = req.file.originalname;
            }
            console.log(data, "datadatadatadatadata");
            if (req.body._id) {
                const docdata = await db.UpdateDocument('bannertype', { _id: req.body._id }, data, {});
                console.log(docdata, "docdatadocdatadocdatadocdata");
                if (docdata.status === false) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Updated Successfully", response: docdata.doc });
                }
            } else {
                const result = await db.InsertDocument('bannertype', data);
                if (!result) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Created Successfully", response: result });
                }
            };
        } catch (error) {
            console.log(error, "Error");
        }

    };

    router.bannerBatchType = async (req, res) => {
        try {
            var data = {};
            console.log(req.body, req.files, "req.filereq.file");

            // return
            data.batchname_1 = req.body.batchname_1
            data.batchname_2 = req.body.batchname_2
            data.batchname_3 = req.body.batchname_3
            data.batchname_4 = req.body.batchname_4
            // data.banner_url = req.body.banner_url
            // data.content = req.body.specification
            data.type_name = req.body.type_name
            data.type_status = req.body.type_status
            data.status = req.body.status


            if (req && req.files && req.files != undefined) {
                console.log(req.files, "req.file111111111111111111");
                if (req && req.files && req.files.image_1 && req.files.image_1[0] && req.files.image_1[0] != (undefined || null || '')) {
                    data.image_1 = (req.files.image_1[0].destination + req?.files?.image_1[0]?.filename);
                } else {
                    data.image_1 = req.files.image_1;
                }

                if (req && req.files && req.files.image_2 && req.files.image_2[0] && req.files.image_2[0] != (undefined || null || '')) {
                    data.image_2 = req?.files?.image_2[0]?.destination + req?.files?.image_2[0]?.filename;
                } else {
                    data.image_2 = req.files.image_2;
                }

                if (req && req.files && req.files.image_3 && req.files.image_3[0] && req.files.image_3[0] != (undefined || null || '')) {
                    data.image_3 = req?.files?.image_3[0]?.destination + req?.files?.image_3[0]?.filename;
                } else {
                    data.image_3 = req.files.image_3;
                }
                if (req && req.files && req.files.image_4 && req.files.image_4[0] && req.files.image_4[0] != (undefined || null || '')) {
                    data.image_4 = req?.files?.image_4[0]?.destination + req?.files?.image_4[0]?.filename;
                } else {
                    data.image_4 = req.files.image_4;
                }
                // if(req && req.files && req.files.image_1){
                // }
                // if(req && req.files && req.files.image_2.length > 0 && req.files.image_2[0] && req.files.image_2[0] != undefined){
                // }
                // if(req && req.files && req.files.image_3.length > 0 && req.files.image_3[0] && req.files.image_3[0] != undefined){
                // }
                // data.image_name = req.file.originalname;
            }
            if (req.body._id) {
                const docdata = await db.UpdateDocument('bannertype', { _id: req.body._id }, data, {});
                console.log(docdata, "docdatadocdatadocdatadocdata");
                if (docdata.status === false) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Updated Successfully", response: docdata.doc });
                }
            } else {
                const result = await db.InsertDocument('bannertype', data);
                if (!result) {
                    res.send({ status: 0, message: "Something went wrong! Please try again" });
                } else {
                    res.send({ status: 1, message: "Banner Created Successfully", response: result });
                }
            };
        } catch (error) {
            console.log(error, "Error");
        }

    };

    router.bannerTypeList = async (req, res) => {

        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = {};
        // if (req.body.status) {
        //     query = { $match: { status: { $eq: req.body.status } } };
        // } else {
        //     query = { $match: { status: { $ne: 0 } } };
        // }

        if (req.body.search) {
            var searchs = req.body.search;
            query = {
                "$match": {
                    "status": { "$ne": 0 },
                    "$or": [
                        { "banner_name": { "$regex": '^' + searchs, "$options": 'si' } },
                        { "type_name": { "$regex": '^' + searchs, "$options": 'si' } },
                        // { "category": { "$regex": '^' + searchs, "$options": 'si' } }
                    ]
                }
            };

        } else {
            query = {
                $match: {
                    status: { $ne: 0 }
                }
            }
        }
        rcatQuery.push(query);
        // if (req.body.status) {
        //     rcatQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
        // }
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
                        // {
                        //     $project: {
                        //         _id: "$_id",
                        //         status: "$status",
                        //         img: "$img",
                        //         category: "$category",
                        //         bannername: "$bannername",
                        //         description: "$description",
                        //     }
                        // }
                    ]
                }
            }
        )
        const rcatlist = await db.GetAggregation('bannertype', rcatQuery)
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('bannertype', [
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
        }
    }


    router.getbannerType = async (req, res) => {
        console.log(req.body, "ffffffffffffffffffffffff");
        try {
            let getDoc
            if (req.body._id) {
                getDoc = await db.GetOneDocument('bannertype', { _id: new mongoose.Types.ObjectId(req.body._id) }, {}, {})
            } else {
                getDoc = await db.GetDocument('bannertype', { status: 1 }, {}, {})
            }
            console.log(getDoc, "getDocgetDocgetDocgetDocgetDoc");
            if (!getDoc) {
                res.send({ status: 0, data: [] });
            } else {
                res.send({ status: 1, data: getDoc });
            }
        } catch (error) {
            console.log(error);
        }

    }

    router.bannerDelete = async function (req, res) {
        // req.checkBody('ids', 'Invalid ids').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        const docdata = await db.UpdateAllDocument('bannertype', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
        if (!docdata) {
            res.send({ status: 0, message: err.message });
        } else {
            // if (typeof req.body.ids == 'object') {
            //     for (var i = 0; i < req.body.ids.length; i++) {
            //         io.of('/chat').emit('admin_changed', { user_id: req.body.ids[i], status: 0 });
            //         io.of('/chat').in(req.body.ids[i]).emit('r2e_user_logout', { userId: req.body.ids[i], status: 0 });
            //     }
            // } else {
            //     io.of('/chat').emit('admin_changed', { user_id: req.body.ids, status: 0 });
            //     io.of('/chat').in(req.body.ids).emit('r2e_user_logout', { userId: req.body.ids, status: 0 });
            // }
            res.send({ status: 1, message: 'Successfully Deleted' });
        }
    };


    router.offerManagementList = async (req, res) => {

        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = {};
        if (req.body.search) {
            var searchs = req.body.search;
            query = {
                "$match": {
                    "status": { "$ne": 0 },
                    "$or": [
                        { "offer_name": { "$regex": '^' + searchs, "$options": 'si' } },
                        // { "type_name": { "$regex": '^' + searchs, "$options": 'si' } },
                        // { "category": { "$regex": '^' + searchs, "$options": 'si' } }
                    ]
                }
            };

        } else {
            query = {
                $match: {
                    status: { $ne: 0 }
                }
            }
        }
        rcatQuery.push(query);
        // if (req.body.status) {
        //     rcatQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
        // }
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
                        // {
                        //     $project: {
                        //         _id: "$_id",
                        //         status: "$status",
                        //         img: "$img",
                        //         category: "$category",
                        //         bannername: "$bannername",
                        //         description: "$description",
                        //     }
                        // }
                    ]
                }
            }
        )
        const rcatlist = await db.GetAggregation('offermanagement', rcatQuery)
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('offermanagement', [
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
        }
    }

    router.testimonialList = async (req, res) => {
        console.log("testimonialList================");

        var skip = 0;
        var limit = 10;
        var rcatQuery = [];
        var query = {};
        if (req.body.search) {
            var searchs = req.body.search;
            query = {
                "$match": {
                    "status": { "$ne": 0 },
                    "$or": [
                        { "name": { "$regex": '^' + searchs, "$options": 'si' } },
                        { "position": { "$regex": '^' + searchs, "$options": 'si' } },
                        { "company_name": { "$regex": '^' + searchs, "$options": 'si' } },
                        // { "type_name": { "$regex": '^' + searchs, "$options": 'si' } },
                        // { "category": { "$regex": '^' + searchs, "$options": 'si' } }
                    ]
                }
            };

        } else {
            query = {
                $match: {
                    status: { $ne: 0 }
                }
            }
        }
        rcatQuery.push(query);
        // if (req.body.status) {
        //     rcatQuery.push({ "$match": { status: { $eq: parseInt(req.body.status) } } });
        // }
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
                        // {
                        //     $project: {
                        //         _id: "$_id",
                        //         status: "$status",
                        //         img: "$img",
                        //         category: "$category",
                        //         bannername: "$bannername",
                        //         description: "$description",
                        //     }
                        // }
                    ]
                }
            }
        )
        const rcatlist = await db.GetAggregation('testimonial', rcatQuery)
        console.log(rcatlist, "rcatlistrcatlist");
        if (!rcatlist || (rcatlist && rcatlist.length == 0)) {
            res.send([], 0, []);
        } else {
            const counts = await db.GetAggregation('testimonial', [
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
        }
    }


    router.getoffermanagement = async (req, res) => {
        try {
            let getDoc
            if (req.body._id) {
                getDoc = await db.GetOneDocument('offermanagement', { _id: new mongoose.Types.ObjectId(req.body._id) }, {}, {})
            } else {
                getDoc = await db.GetDocument('offermanagement', { status: 1 }, {}, {})
            }
            if (!getDoc) {
                res.send({ status: 0, data: [] });
            } else {
                res.send({ status: 1, data: getDoc });
            }
        } catch (error) {
            console.log(error);
        }

    }
    router.getTestimonialmanagement = async (req, res) => {
        try {
            let getDoc
            if (req.body._id) {
                getDoc = await db.GetOneDocument('testimonial', { _id: new mongoose.Types.ObjectId(req.body._id) }, {}, {})
            } else {
                getDoc = await db.GetDocument('testimonial', { status: 1 }, {}, {})
            }
            if (!getDoc) {
                res.send({ status: 0, data: [] });
            } else {
                res.send({ status: 1, data: getDoc });
            }
        } catch (error) {
            console.log(error);
        }

    }

    router.deleteOffer = async function (req, res) {
        try {
            const id = req.body.ids[0]
            const data = await offermanagement.deleteOne({ _id: id })
            console.log(data, 'tag to be modified')
            if (data === null) {
                res.status(403).json({ status: 'no matching tag found', data })
            } else {
                await db.UpdateDocument('offermanagement', { _id: id }, { 'status': 0 }, {});
                res.status(200).json({ status: 'Deletion success', data, item: "offermanagement" });
            }
        } catch (error) {
            console.log(error);
            return res.send({ status: 0, message: "Something went wrong! Please try again" })
        }
    }
    router.deleteTestimonial = async function (req, res) {
        try {
            const id = req.body.ids[0]
            const data = await testimonial.deleteOne({ _id: id })
            console.log(data, 'tag to be modified')
            if (data === null) {
                res.status(403).json({ status: 'no matching tag found', data })
            } else {
                await db.UpdateDocument('testimonial', { _id: id }, { 'status': 0 }, {});
                res.status(200).json({ status: 'Deletion success', data, item: "testimonial" });
            }
        } catch (error) {
            console.log(error);
            return res.send({ status: 0, message: "Something went wrong! Please try again" })
        }
    }
    return router;
}