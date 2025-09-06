//"use strict";

module.exports = function () {

    var mongoose = require('mongoose');
    var db = require('../../controller/adaptor/mongodb.js');
    var moment = require("moment");

    function validationCoupon(req, res, next) {
        req.checkBody('code', 'coupon code is required').notEmpty();
        req.checkBody('discount_type', 'discount type is invalid').notEmpty();
        req.checkBody('discount_amount', 'Discount Amount is invalid').notEmpty();
        req.checkBody('cart_amount', 'Cart Amount is invalid').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        return next();
    }

    var controller = {};

    controller.list = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var couponQuery = [{
            "$match": { status: { $ne: 0 } }
        },
        // { $lookup: { from: 'restaurant', localField: "restaurant", foreignField: "_id", as: "shop" } },
        // { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                discount_amount: 1,
                cart_amount: 1,
                status: 1,
                expires: 1,
                refer_count: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                code: 1,
                document: "$$ROOT"
            }
        },
        {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];


        var condition = { status: { $ne: 0 } };
        couponQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            // condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            couponQuery.push({
                "$match": {
                    $or: [
                        // { "documentData.shop.restaurantname": { $regex: searchs + '.*', $options: 'si' } },
                        //{ "documentData.shop.usage.total_coupons": { $regex: searchs + '.*', $options: 'si' } },
                        // { "documentData.code": { $regex: searchs + '.*', $options: 'si' } },
                        // { "documentData.discount_type": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.discount_amount": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.refer_count": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.cart_amount": { $regex: searchs + '.*', $options: 'si' } }
                    ]
                }
            });
            //search limit
            couponQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            couponQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                couponQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            couponQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            couponQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            couponQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            couponQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        if (!req.body.search) {
            couponQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('refer_coupon', couponQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetOneDocument('refer_coupon', { 'status': 1,  "expires": {"$gte": new Date()} }, {}, {}, function (err, coupon) {
                    if (err) {
                        res.send(err);
                    } else {
                        if (docdata.length != 0) {
                            res.send([docdata[0].documentData, docdata[0].count,coupon]);
                        } else {
                            res.send([0, 0, coupon]);
                        }
                    }
                });
            }
        });
    }

    controller.deletecoupon = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.DeleteDocument('refer_coupon', { '_id': { $in: req.body.delData } }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }


    controller.editcoupon = function (req, res) {
        /* var options = {};
        options.populate = 'restaurant'; */
        db.GetDocument('refer_coupon', { status: { $ne: 0 }, _id: req.body.id }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata[0]);
            }
        });
    }

    controller.couponRestaurant = function (req, res) {
        if (req.body.id) {
            var extension = {};
            extension.populate = 'restaurant';
            db.GetDocument('coupon', { status: { $ne: 0 }, _id: req.body.id }, {}, extension, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
        else {
            db.GetDocument('restaurant', { status: { $eq: 1 } }, { restaurantname: 1, main_city: 1 }, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    }

    controller.userGet = function (req, res) {
        db.GetDocument('users', { status: { $eq: 1 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    controller.save = function (req, res) {

        var data = {};
        data.discount_amount = req.body.discount_amount;
        data.cart_amount = req.body.cart_amount;
        data.status = req.body.status;
        data.expires = req.body.expires;
         
        /* if (req.body.shop) {
            data.restaurant = [];
            for (var i = 0; i <= req.body.shop.length - 1; i++) {
                data.restaurant.push(req.body.shop[i]._id)
            }
        } */
        // if (req.body.city) { data.city = req.body.city || ''; }
        if (data.status == 1) {
            db.UpdateDocument('refer_coupon', { status: 1 }, { status: 2 }, function (err, result) {
                if (err) {
                    res.status(400).send(err);
                } else {
                    if (req.body._id) {
                        db.UpdateDocument('refer_coupon', { _id: { $in: req.body._id } }, data, function (err, result) {
                            // console.log('err, result', err, result)
                            if (err) {
                                res.status(400).send(err);
                            } else {
                                res.send(result);
                            }
                        });
                    } else {
                        db.InsertDocument('refer_coupon', data, function (err, result) {
                            if (err) {
                                res.status(400).send(err);
                            } else {
                                res.send(result);
                            }
                        });
                    }
                }
            });
        } else {
            if (req.body._id) {
                db.UpdateDocument('refer_coupon', { _id: { $in: req.body._id } }, data, function (err, result) {
                    // console.log('err, result', err, result)
                    if (err) {
                        res.status(400).send(err);
                    } else {
                        res.send(result);
                    }
                });
            } else {                
                db.InsertDocument('refer_coupon', data, function (err, result) {
                    if (err) {
                        res.status(400).send(err);
                    } else {
                        res.send(result);
                    }
                });
            }
        }
    }

    return controller;
}
