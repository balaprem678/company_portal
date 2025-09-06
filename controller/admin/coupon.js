//"use strict";

module.exports = function () {

    var mongoose = require('mongoose');
    var db = require('../../controller/adaptor/mongodb.js');
    var moment = require("moment");


    function validationCoupon(req, res, next) {
        req.checkBody('name', 'coupon name is invalid').notEmpty();
        req.checkBody('code', 'coupon code is required').notEmpty();
        req.checkBody('discount_type', 'discount type is invalid').notEmpty();
        req.checkBody('amount_percentage', 'Amount/Percentage is invalid').notEmpty();
        req.checkBody('usage.total_coupons', 'Usage Limit Per Coupon is invalid').notEmpty();
        req.checkBody('usage.per_user', 'Usage Limit Per User is invalid').notEmpty();
        req.checkBody('valid_from', 'Valid From is invalid').notEmpty();
        req.checkBody('expiry_date', 'Expiry Date is invalid').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        return next();
    }

    var controller = {};

    controller.list = async function (req, res) {
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var couponQuery = [{
            "$match": { status: { $ne: 0 } }
        },
        {
            $sort: {
                createdAt: -1

            }
        },
        // { $lookup: { from: 'restaurant', localField: "restaurant", foreignField: "_id", as: "shop" } },
        // { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: 1,
                //shop: 1,
                coupon_type: 1,
                code: 1,
                total: 1,
                used: 1,
                amount_percentage: 1,
                usage: 1,
                discount_type: 1,
                dname: { $toLower: '$' + sorted },
                status: 1,
                createdAt: 1,
                availablecoupon: { $subtract: ["$total", "$used"] },
            }
        }, {
            $project: {
                name: 1,
                shop: 1,
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
                        { "documentData.name": { $regex: searchs + '.*', $options: 'si' } },
                        // { "documentData.shop.restaurantname": { $regex: searchs + '.*', $options: 'si' } },
                        //{ "documentData.shop.usage.total_coupons": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.code": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.discount_type": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.amount_percentage": { $regex: searchs + '.*', $options: 'si' } }
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
        }
        // else {


        //     sorting["documentData.createdAt"] = 1;
        //     couponQuery.push({ $sort: sorting });
        // }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            couponQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        if (!req.body.search) {
            couponQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        const docdata = await db.GetAggregation('coupon', couponQuery)
        if (!docdata) {
            res.send('err');
        } else {
            if (docdata.length != 0) {
                res.send([docdata[0].documentData, docdata[0].count]);
            } else {
                res.send([0, 0]);
            }
        }

        // db.GetAggregation('coupon', couponQuery, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         if (docdata.length != 0) {
        //             res.send([docdata[0].documentData, docdata[0].count]);
        //         } else {
        //             res.send([0, 0]);
        //         }
        //     }
        // });
    }

    controller.deletecoupon = async function (req, res) {
        // req.checkBody('ids', 'Invalid delData').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        const docdata = await db.DeleteDocument('coupon', { '_id': { $in: req.body.ids } })
        if (docdata.status == false) {
            res.send({ status: false });
        } else {
            res.send(docdata.doc);
        }
        // db.DeleteDocument('coupon', { '_id': { $in: req.body.ids } }, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }


    controller.editcoupon = async function (req, res) {
        var options = {};
        console.log('this is adarsh');
        // options.populate = 'restaurant';
        const docdata = await db.GetDocument('coupon', { status: { $ne: 0 }, _id: req.body.id }, {}, options)
        if (docdata.status === false) {
            res.send(docdata.doc);
        } else {
            console.log(docdata.doc, 'this is docdata of the coupon_______________________________');
            // db.GetDocument('restaurant', { 'main_city': docdata[0].city, 'status': { $eq: 1 } }, { restaurantname: 1 }, {}, function (err, restdata) {
            res.send([docdata.doc[0]]);
            // });
        }
        // db.GetDocument('coupon', { status: { $ne: 0 }, _id: req.body.id }, {}, options, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         db.GetDocument('restaurant', { 'main_city': docdata[0].city, 'status': { $eq: 1 } }, { restaurantname: 1 }, {}, function (err, restdata) {
        //             res.send([docdata[0], restdata]);
        //         });
        //     }
        // });
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

    controller.save = async function (req, res) {
        var data = {
            usage: {}
        };
        console.log(req.body, "ahsdfeudj");


        data.name = req.body.name;
        data.code = req.body.code;
        data.description = req.body.description;
        data.discount_type = req.body.discount_type;
        data.amount_percentage = req.body.amount_percentage;
        data.usage.total_coupons = req.body.usage.total_coupons;
        data.usage.per_user = req.body.usage.per_user;
        if (req.body.minamount && req.body.minamount !== '') {
            data.minamount = req.body.minamount
        } 
        if(req.body.maxamount && req.body.maxamount != '') {
            data.maxamount = req.body.maxamount
        }
        var expiry_date = moment(new Date(req.body.expiry_date)).format('MM/DD/YYYY') + ' 23:59:59';
        var valid_from = moment(new Date(req.body.valid_from)).format('MM/DD/YYYY') + ' 00:00:00';
        data.valid_from = new Date(valid_from);
        
        data.expiry_date = new Date(expiry_date);
        data.status = req.body.status;
        data.coupon_type = req.body.coupon_type;
        data.total = req.body.usage.total_coupons;
        if (req.files && req.files.length > 0) {
            data.image = req.files[0].destination + req.files[0].filename;
        }
        if (req.body.shop) {
            data.restaurant = [];
            for (var i = 0; i <= req.body.shop.length - 1; i++) {
                data.restaurant.push(req.body.shop[i]._id)
            }
        }
        if (req.body.city) { data.city = req.body.city || ''; }





        if (req.body._id) {

            const updateexistCoupon = await db.GetOneDocument('coupon', { _id: { $ne: req.body._id }, code: req.body.code, status: 1 }, {}, {})

            if (updateexistCoupon && updateexistCoupon.status == true) {

                res.send({ status: 2, message: "Coupon Code already exist" })


            } else {
                const result = await db.UpdateDocument('coupon', { _id: { $in: req.body._id } }, data)
                if (result.status == false) {
                    res.status(400).send('err');
                } else {
                    res.send(result.doc);
                }
            }
            // db.UpdateDocument('coupon', { _id: { $in: req.body._id } }, data, function (err, result) {
            //     // console.log('err, result', err, result)
            //     if (err) {
            //         res.status(400).send(err);
            //     } else {
            //         res.send(result);
            //     }
            // });
        } else {
            try {
                const existCoupon = await db.GetOneDocument('coupon', { code: req.body.code, status: 1 }, {}, {})

                if (existCoupon && existCoupon.status == true) {
                    res.send({ status: 2, message: "Coupon Code already exist" })

                } else {
                    console.log(data)
                    const result = await db.InsertDocument('coupon', data)
                    res.send({ message: "coupon added successfully" })
                }
            } catch (error) {
                console.log(error)
                res.status(500).send({ message: "somthing went wrong" })
            }

            // db.InsertDocument('coupon', data, function (err, result) {
            //     if (err) {
            //         res.status(400).send(err);
            //     } else {
            //         res.send(result);
            //     }
            // });
        }



    }

    return controller;
}
