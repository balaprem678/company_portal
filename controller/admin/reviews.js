//"use strict";
module.exports = function () {

    var db = require('../../controller/adaptor/mongodb.js');
    var async = require("async");

    var controller = {};


    controller.newlist = function (req, res) {

        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        var query = {};

        if (req.body.type == 'restaurant') {
            query = { $and: [{ status: { $ne: 0 } }, { rating_to: { $eq: 'restaurant' } }] };
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var usersQuery = [
            { "$match": query },
            { "$lookup": { from: "users", localField: "user", foreignField: "_id", as: "user" } },
            { "$unwind": "$user" },
            { "$lookup": { from: "restaurant", localField: "restaurant", foreignField: "_id", as: "restaurant" } },
            { "$unwind": "$restaurant" },
            { "$lookup": { from: "orders", localField: "order", foreignField: "_id", as: "order" } },
            { "$unwind": "$order" },
            {
                "$project": {
                    createdAt: -1,
                    rating: 1, comment: 1, user: 1, order: 1, restaurant: 1, rating_to: 1, order_id: 1
                    /*  usertasker: {
                          $cond: { if: { $eq: ["$rating_to", 'restaurant'] }, then: '$user', else: '$driver' }
                      }*/
                }
            },
            { "$project": { document: "$$ROOT" } },
            { "$group": { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } } }
        ];
        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({
                "$match": {
                    $or: [
                        // { "documentData.usertasker.username": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.order.order_id": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.to_restaurant": { $regex: searchs + '.*', $options: 'si' } }
                    ]
                }

            });

            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
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

        db.GetAggregation('review', usersQuery, function (err, docdata) {
            if (docdata.length != 0) {
                res.send([docdata[0].documentData]);
              
            } else {
                res.send([0, 0]);
            }
        });
    }

    controller.list = function (req, res) { 

        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        var query = {};
        if (req.body.type == 'all') {
            query = { status: { $ne: 0 } };
        }
        else if (req.body.type == 'restaurant') {
            query = { $and: [{ status: { $ne: 0 } }, { rating_to: { $eq: 'restaurant' } }] };
        }
        else if (req.body.type == 'driver') {
            query = { $and: [{ status: { $ne: 0 } }, { rating_to: { $eq: 'driver' } }] };
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var usersQuery = [
            { "$match": query },
            { "$lookup": { from: "users", localField: "user", foreignField: "_id", as: "user" } },
            { "$unwind": "$user" },
            { "$lookup": { from: "drivers", localField: "driver", foreignField: "_id", as: "driverdata" } },
            { "$unwind": "$driverdata" },
            /*{ "$lookup": { from: "restaurant", localField: "restaurant", foreignField: "_id", as: "restaurant" } },
             { "$unwind": "$restaurant" },*/

            { "$lookup": { from: "orders", localField: "order", foreignField: "_id", as: "order" } },
            { "$unwind": "$order" },
            {
                "$project": {
                    createdAt: -1,
                    rating: 1, user: 1, order: 1, restaurant: 1, rating_to: 1, order_id: 1, driverdata: 1,
                    /*  usertasker: {
                          $cond: { if: { $eq: ["$rating_to", 'restaurant'] }, then: '$user', else: '$driver' }
                      }*/
                }
            },
            { "$project": { document: "$$ROOT" } },
            { "$group": { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } } }
        ];
        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({
                "$match": {
                    $or: [
                        // { "documentData.usertasker.username": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.order.order_id": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.to_restaurant": { $regex: searchs + '.*', $options: 'si' } }
                    ]
                }

            });

            //search limit
            usersQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
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

        db.GetAggregation('review', usersQuery, function (err, docdata) {


            // console.log('________________', docdata)

            var count = {};
            async.parallel([
                //All Reviews
                function (callback) {
                    db.GetCount('review', { status: { $ne: 0 } }, function (err, allValue) {
                        if (err) return callback(err);
                        count.allValue = allValue;
                        callback();
                    });
                },
                //Review to restaurant
                function (callback) {
                    db.GetCount('review', { $and: [{ status: { $ne: 0 } }, { rating_to: { $eq: 'restaurant' } }] }, function (err, userValue) {
                        if (err) return callback(err);
                        count.userValue = userValue;
                        callback();
                    });
                },
                //Review to driver
                function (callback) {
                    db.GetCount('review', { $and: [{ status: { $ne: 0 } }, { rating_to: { $eq: 'driver' } }] }, function (err, taskerValue) {
                        if (err) return callback(err);
                        count.taskerValue = taskerValue;
                        callback();
                    });
                }


            ], function (err) {
                if (err) return next(err);
                var totalCount = count;
                if (docdata.length != 0) {
                    res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    //console.log('---------', [docdata[0].documentData, docdata[0].count, totalCount])
                } else {
                    res.send([0, 0]);
                }
            });
        });
    }

    controller.edit = function (req, res) {
        var options = {};
        options.populate = 'tasker user task category';
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.GetDocument('review', { _id: req.body.id }, {}, options, function (err, data) {

            if (err) {
                res.send(err);
            } else {
                res.send(data);
            }
        });
    }

    controller.save = function (req, res) {


        var data = {};
        data.task = req.body.task;
        data.user = req.body.user;
        data.tasker = req.body.tasker;
        data.rating = req.body.rating;
        data.comments = req.body.comments;

        if (req.body._id) {
            db.UpdateDocument('review', { _id: { $in: req.body._id } }, data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        } else {
            db.InsertDocument('review', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        }
    }

    controller.deletereviews = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        db.UpdateDocument('review', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }
    return controller;
}
