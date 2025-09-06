//"use strict";
module.exports = function () {

    var db = require('../../controller/adaptor/mongodb.js');
    var async = require("async");
    var mongoose = require('mongoose');
    var moment = require('moment');
    var controller = {};



    controller.RestaurantList = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var usersQuery = [];
        var query = { $match: { status: { $eq: 1 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $eq: 1 }, "restaurantname": { $regex: '^' + searchs, $options: 'si' } } }
        }
        usersQuery.push(query);

        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }
        usersQuery.push(
            {
                $project: {
                    documentData: {
                        _id: "$_id",
                        avg_ratings: "$avg_ratings",
                        restaurant_name: "$restaurantname"
                    }
                }
            },
            {
                $group: { _id: null, "count": { $sum: 1 }, "documentData": { $push: '$documentData' } }
            },
            { $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } }
        )
        if (req.body.limit && req.body.skip >= 0) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': skip }, { '$limit': limit });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        db.GetAggregation('restaurant', usersQuery, function (err, docdata) {
            if (docdata.length != 0) {
                res.send([docdata[0].documentData, docdata[0].count]);
            } else {
                res.send([0, 0]);
            }
        });
    };
    controller.ResturantRatingList = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var usersQuery = [];
        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting['documentData.dname'] = req.body.sort.order;
        } else {
            var sorter = 'createdAt';
            sorting["documentData.dname"] = -1;
        }
        // console.log('sorter',req.body)
        usersQuery.push(
            { $match: { status: { $eq: 1 }, 'restaurant': new mongoose.Types.ObjectId(req.body.id) } },
            {
                "$lookup": {
                    "from": "restaurant",
                    "localField": "restaurant",
                    "foreignField": "_id",
                    "as": "restaurantDetails"
                }
            },
            { $unwind: { path: "$restaurantDetails", preserveNullAndEmptyArrays: true } },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user",
                    "foreignField": "_id",
                    "as": "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    document: {
                        _id: '$_id',
                        restaurant_name: "$restaurantDetails.restaurantname",
                        user_name: "$userDetails.username",
                        rating: '$rating'
                    }
                }
            },
            {
                $project: {
                    document: {
                        _id: 1,
                        restaurant_name: 1,
                        user_name: 1,
                        dname: { $toLower: '$document.' + sorter },
                        rating: 1
                    }
                }
            },
            {
                $group: { _id: null, "count": { $sum: 1 }, documentData: { $push: "$document" } }
            },
            { $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } }
        )

        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({
                "$match": {
                    $or: [
                        { "documentData.restaurant_name": { $regex: '^' + searchs, $options: 'si' } }, { "documentData.user_name": { $regex: '^' + searchs, $options: 'si' } }]
                }
            })
        }

        usersQuery.push({ $sort: sorting });
        if ((req.body.limit && req.body.skip >= 0)) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': skip }, { '$limit': limit });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        db.GetAggregation('ratings', usersQuery, function (err, docdata) {
            if (docdata.length != 0) {
                res.send([docdata[0].documentData, docdata[0].count]);
            } else {
                res.send([0, 0]);
            }
        });
    }



    controller.DriverList = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var usersQuery = [];
        var query = { $match: { status: { $eq: 1 } } };
        if (req.body.search) {
            var searchs = req.body.search;
            query = { "$match": { status: { $eq: 1 }, "username": { $regex: '^' + searchs, $options: 'si' } } }
        }
        usersQuery.push(query);

        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            usersQuery.push({ $sort: sorting });
        } else {
            sorting["createdAt"] = -1;
            usersQuery.push({ $sort: sorting });
        }
        usersQuery.push(
            {
                $project: {
                    documentData: {
                        _id: "$_id",
                        avg_ratings: "$avg_ratings",
                        driver_name: "$username"
                    }
                }
            },
            {
                $group: { _id: null, "count": { $sum: 1 }, "documentData": { $push: '$documentData' } }
            },
            { $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } }
        )
        if (req.body.limit && req.body.skip >= 0) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': skip }, { '$limit': limit });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        db.GetAggregation('drivers', usersQuery, function (err, docdata) {
            if (docdata.length != 0) {
                res.send([docdata[0].documentData, docdata[0].count]);
            } else {
                res.send([0, 0]);
            }
        });
    };

    controller.DriverviewRating = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var skip = 0;
        var limit = 10;
        var usersQuery = [];
        var sorting = {};
        if (req.body.sort) {
            var sorter = req.body.sort.field;
            sorting['documentData.dname'] = req.body.sort.order;
        } else {
            var sorter = 'createdAt';
            sorting["documentData.dname"] = -1;
        }
        usersQuery.push(
            { $match: { status: { $eq: 1 }, 'driver': new mongoose.Types.ObjectId(req.body.id) } },
            {
                "$lookup": {
                    "from": "drivers",
                    "localField": "driver",
                    "foreignField": "_id",
                    "as": "driverDetails"
                }
            },
            { $unwind: { path: "$driverDetails", preserveNullAndEmptyArrays: true } },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user",
                    "foreignField": "_id",
                    "as": "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    document: {
                        _id: '$_id',
                        driver_name: "$driverDetails.username",
                        user_name: "$userDetails.username",
                        rating: '$rating'
                    }
                }
            },
            {
                $project: {
                    document: {
                        _id: 1,
                        driver_name: 1,
                        user_name: 1,
                        dname: { $toLower: '$document.' + sorter },
                        rating: 1
                    }
                }
            },
            {
                $group: { _id: null, "count": { $sum: 1 }, documentData: { $push: "$document" } }
            },
            { $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } }
        )
        if (req.body.search) {
            var searchs = req.body.search;
            usersQuery.push({
                "$match": {
                    $or: [
                        { "documentData.user_name": { $regex: '^' + searchs, $options: 'si' } }, { "documentData.driver_name": { $regex: '^' + searchs, $options: 'si' } }]
                }
            })
        }
        usersQuery.push({ $sort: sorting });
        if ((req.body.limit && req.body.skip >= 0)) {
            usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        } else {
            usersQuery.push({ '$skip': skip }, { '$limit': limit });
        }
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        db.GetAggregation('ratings', usersQuery, function (err, docdata) {
            if (docdata.length != 0) {
                res.send([docdata[0].documentData, docdata[0].count]);
            } else {
                res.send([0, 0]);
            }
        });

    }

    controller.RatingReviewList = async function (req, res) {
        try {
            // console.log("data for the review fetching")
            // console.log(req.body)
            let skip = req.body.skip ? parseInt(req.body.skip) : 0;
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let sort_val = { createdAt: -1 };
            let condition = {};
            let from_date = req.body.From_Date
            let to_date = req.body.End_Date
            if (req.body.status) {
                condition.status = req.body.status === 4 ? 0 : parseInt(req.body.status);
            };
            if (req.body.search && req.body.search != '') {
                condition["$or"] = [
                    { comment: { $regex: req.body.search + ".*", $options: "si" } },
                    { username: { $regex: req.body.search + ".*", $options: "si" } },
                    { productName: { $regex: req.body.search + ".*", $options: "si" } }
                ]
                // console.log(condition)
            };

            if (from_date && from_date != undefined) {
                from_date = new Date((req.body.From_Date)); // Creates a new Date object from req.body.From_Date
                from_date = new Date(from_date.setDate(from_date.getDate() + 0));
                from_date = moment(from_date).format("MM/DD/YYYY")
                from_date = from_date + ' 00:00:00'
                from_date = new Date(from_date)
            }
            if (to_date && to_date != undefined) {
                to_date = new Date((req.body.End_Date)); // Creates a new Date object from req.body.From_Date
                to_date = new Date(to_date.setDate(to_date.getDate() + 0));
                to_date = moment(to_date).format("MM/DD/YYYY")
                to_date = to_date + ' 23:59:59'
                to_date = new Date(to_date)
            }
            if (from_date !== undefined && from_date != '' && to_date != '' && to_date != undefined) {
                condition["createdAt"] =
                {
                    $gte: from_date,
                    $lte: to_date
                }

            }
            let query = [
                { $match: condition },
                { $sort: sort_val },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: "food",
                        let: { product_id: "$product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$_id", "$$product_id"] },
                                            // { $eq: ["$status", 1] }
                                        ]
                                    }
                                }
                            }, {
                                $limit: 1
                            }, {
                                $project: {
                                    name: 1
                                }
                            }
                        ],
                        as: "product"
                    }
                },
                {
                    $unwind: { path: "$product", preserveNullAndEmptyArrays: true }
                },
                {
                    $lookup: {
                        from: 'users',
                        foreignField: '_id',
                        localField: 'user',
                        as: 'username'
                    }
                },
                {
                    $unwind: { path: "$username", preserveNullAndEmptyArrays: true }
                },
                {
                    $project: {
                        rating: 1,
                        comment: 1,
                        // username: '$product.username',
                        first_name: {
                            $cond: ["$username.first_name", "$username.first_name", 'unknown_user']
                        },
                        last_name: { $cond: { if: "$username.last_name", then: "$username.last_name", else: "-" } },
                        product: 1,
                        user: 1,
                        status: 1,
                        product_id: 1,
                        order_id: 1,
                    }
                }
            ]
            // console.log(query);
            let reviewsList = await db.GetAggregation('ratings', query);
            let reviewsCount = await db.GetCount('ratings', condition);
            let reviewsActive = await db.GetCount('ratings', { status: 1 });
            let reviewsInactive = await db.GetCount('ratings', { status: 2 });
            let reviewsDeleted = await db.GetCount('ratings', { status: 0 });
            let reviewsAll = await db.GetCount('ratings', {});
            console.log("checking what comes in list", reviewsList)

            Promise.all([reviewsList, reviewsCount, reviewsActive, reviewsInactive, reviewsDeleted, reviewsAll]).then(([list, count, active, inactive, deleted, all]) => {
                return res.send({ status: 1, message: "Rating list found", data: list, count: count, activeCount: active, inactiveCount: inactive, deletedCount: deleted, allCount: all });
            })
        } catch (error) {
            console.log(error);
            return res.send({ status: 0, message: "Something went wrong! Please try egain" });
        }
    };

    controller.RatingReviewsDelete = async function (req, res) {
        try {
            let deleted_ids = req.body.ids;
            if (deleted_ids && Array.isArray(deleted_ids) && deleted_ids.length > 0) {
                if (req.body.forcedelete) {
                    deleted_ids = deleted_ids.map(x => new mongoose.Types.ObjectId(x));
                    console.log(deleted_ids)
                    let deleted_list = await db.DeleteDocument('ratings', { _id: deleted_ids, status: 0 });
                    console.log("deleted_list", deleted_list)
                    if (deleted_list && deleted_list.doc && deleted_list.doc.deletedCount > 0) {
                        return res.send({ status: 1, message: "Review Permanently deleted successfully" });
                    } else {
                        return res.send({ status: 0, message: "Something went wrong! Please try again" });
                    };
                } else {
                    let deleted_list = await db.UpdateDocument('ratings', { _id: deleted_ids }, { status: 0 }, {});
                    if (deleted_list && deleted_list.doc && deleted_list.doc.modifiedCount > 0) {
                        return res.send({ status: 1, message: "Review Temporarily deleted successfully" });
                    } else {
                        return res.send({ status: 0, message: "Something went wrong! Please try again" });
                    };
                }
            } else {
                return res.send({ status: 0, message: "Ratings ids is required" });
            }
        } catch (error) {
            return res.send({ status: 0, message: "Something went wrong! Please try again" });
        }
    };

    controller.RatingReviewDetails = async function (req, res) {
        try {
            let rating_id = req.body.rating_id;
            if (!rating_id) {
                return res.send({ status: 0, message: "Rating id is required" });
            };
            if (!mongoose.isValidObjectId(rating_id)) {
                return res.send({ status: 0, message: "Invalid ratings id!" });
            };
            let query = [
                {
                    $match: { _id: new mongoose.Types.ObjectId(rating_id) }
                }, {
                    $limit: 1
                }, {
                    $lookup: {
                        from: "food",
                        let: { product_id: "$product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$product_id"]
                                    }
                                }
                            }, {
                                $project: {
                                    name: 1
                                }
                            }, {
                                $limit: 1
                            }
                        ],
                        as: "products"
                    }
                }, {
                    $unwind: { path: "$products", preserveNullAndEmptyArrays: true }
                }
            ]
            let ratingDetails = await db.GetAggregation('ratings', query);
            if (ratingDetails && ratingDetails.length > 0) {
                return res.send({ status: 1, message: "Ratind details found", data: ratingDetails[0] });
            } else {
                return res.send({ status: 0, message: "Something went wrong! Please try again" });
            }
        } catch (error) {
            return res.send({ status: 0, message: "Something went wrong! Please try egain" });
        }
    }

    return controller;
}
