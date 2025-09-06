//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var mongoose = require("mongoose");
var isObjectId = (n) => {
    return mongoose.Types.ObjectId.isValid(n);
}
module.exports = (app, io) => {

    var router = {};
    router.getrange = (req, res) => {
        db.GetOneDocument('settings', { alias: 'rewards' }, {}, {}, (err, docdata) => {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };
    router.save = (req, res) => {
        var data = { settings: {} };
        data.settings.days = req.body.days;
        data.settings.range = req.body.range;
        db.UpdateDocument('settings', { "alias": "rewards" }, data, { upsert: true }, (err, docdata) => {
            if (err || !docdata.nModified == 0) {
                res.send({ message: 'Error in update', status: 0 });
            } else {
                res.send({ message: 'success', status: 1 });
            }
        });
    };
    router.list = (req, res) => {
        let data = {};
        var limit = 10;
        if (req.body.limit && parseInt(req.body.limit) > 0) {
            limit = parseInt(req.body.limit);
        }
        var skip = 0;
        if (req.body.skip && parseInt(req.body.skip) > 0) {
            skip = parseInt(req.body.skip);
        }
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            var sort = {};
            sort[sorter] = req.body.sort.order;
        } else {
            var sort = { 'status': 1, 'time': 1 };
        }
        var filter_query = { status: { $ne: 0 } };
        if (req.body.search && typeof req.body.search != "undefined" && req.body.search != "") {
            filter_query['userDetails.username'] = { $regex: req.body.search + '.*', $options: 'si' };
        }
        var condition = [
            { '$lookup': { from: 'users', localField: 'user_id', foreignField: '_id', as: 'userDetails' } },
            { "$unwind": { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            { $match: filter_query },
            {
                $facet: {
                    all: [
                        { "$count": "all" }
                    ],
                    documentData: [
                        { $sort: sort },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                username: "$userDetails.username",
                                phone: "$userDetails.phone",
                                status: 1,
                                time: 1,
                                claimed: 1,
                                reached: 1
                            }
                        }
                    ]
                }
            }
        ];
        db.GetAggregation('rewards', condition, (err, docdata) => {
            data.response = {}
            if (err || !docdata || (docdata && docdata.length == 0)) {
                res.send([[], 0]);
            } else {
                var count = 0;
                count = docdata[0].all ? (docdata[0].all[0] ? docdata[0].all[0].all : 0) : 0;
                if (docdata[0].documentData && docdata[0].documentData.length > 0 && count) {
                    res.send([docdata[0].documentData, count]);
                } else {
                    res.send([[], 0]);
                }
            }
        })
    }
    return router;
}