
//"use strict";
module.exports = function (io) {
    var mongoose = require('mongoose');
    var attachment = require('../../model/attachments.js');
    var fs = require('fs');
    var db = require('../../controller/adaptor/mongodb.js');
    var path = require('path');
    var library = require('../../model/library.js');
    var controller = {};
    var CONFIG = {};
    CONFIG.DIRECTORY_OTHERS = './uploads/images/others/';
    const shipping = require('../../model/mongodb.js')  



    controller.currencyList = function (req, res) {

        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var currencyQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                name: 1,
                default_currency: 1,
                code: 1,
                symbol: 1,
                status: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];


        var condition = { status: { $ne: 0 } };
        currencyQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            currencyQuery.push({
                "$match": {
                    $or: [
                        { "documentData.name": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.code": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.symbol": { $regex: searchs + '.*$aus.*', $options: 'x' } }
                    ]
                }
            });
            //search limit
            currencyQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            currencyQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                currencyQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            currencyQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            currencyQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            currencyQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            currencyQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        //currencyQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        if (!req.body.search) {
            currencyQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('currencies', currencyQuery, function (err, docdata) {

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

    controller.currencyEdit = function (req, res) {
        if (req.body) {
            req.checkBody('id', 'Invalid id').notEmpty();
            var errors = req.validationErrors();
            if (errors) {
                res.send(errors, 400);
                return;
            }
            db.GetDocument('currencies', { _id: req.body.id }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    }
    controller.mobilesave = function (req, res) {
        var data = { settings: {} };
        data.settings.user_app = req.body.user_app;
        data.settings.tasker_app = req.body.tasker_app;
        data.settings.invite_friends = req.body.invite_friends;
        db.UpdateDocument('settings', { "alias": "mobile" }, data, { upsert: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);

            }
        });
    }

    controller.getmobile = function (req, res) {
        db.GetOneDocument('settings', { alias: 'mobile' }, {}, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send(err);
            } else {
                res.send(docdata.settings);
            }
        });
    }

    controller.currencySave = function (req, res) {
        req.checkBody('name', 'Currency name is invalid').notEmpty();
        req.checkBody('code', 'Currency code is invalid').notEmpty();
        req.checkBody('symbol', 'Currency symbol is invalid').notEmpty();
        req.checkBody('value', 'Currency value is invalid').notEmpty();
        req.checkBody('status', 'Currency status is invalid').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }


        var data = {};
        data.name = req.body.name;
        data.code = req.body.code;
        data.symbol = req.body.symbol;
        data.value = req.body.value;

        if (req.body._id) {
            data.featured = req.body.featured;
            data.status = req.body.status;
            db.UpdateDocument('currencies', { _id: req.body._id }, data, function (err, data) {
                if (err) { res.send(err); } else {
                    data.method = 'edit';
                    res.send(data);
                }
            });
        } else {
            data.featured = 0;
            data.status = 1;
            db.InsertDocument('currencies', data, function (err, data) {
                //    console.log(err, data)
                if (err || data.nModified == 0) { res.send(err); } else {
                    res.send(data);
                }
            });
        }
    }

    controller.currencyDelete = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.RemoveDocument('currencies', { _id: { $in: req.body.delData }, default: { $ne: 1 } }, function (err, docdata) {
            // db.UpdateDocument('currencies', { _id: { $in: req.body.delData }, default: { $ne: 1 } }, { status: 0 }, function (err, docdata) {
            if (err || docdata.nModified == 0) {
                //res.send(err);
                res.status(400).send({ message: "Default currencies cant be deleted..!" });
            } else {
                res.send(docdata);
            }
        });
    }

    controller.currencyDefaultSave = function (req, res) {
        db.GetOneDocument('currencies', { _id: req.body.id, status: { $eq: 1 } }, {}, {}, function (err, dddocdata) {
            if (err || !dddocdata || dddocdata == null || dddocdata.length == 0) {
                // res.send(err);
                res.status(400).send({ message: "Errors" });
            } else {
                db.UpdateDocument('currencies', { _id: { $ne: req.body.id } }, { default: 0 }, { multi: true }, function (err1, docdata1) {
                    if (err1) {
                        res.send(err1);

                    } else {
                        db.UpdateDocument('currencies', { _id: req.body.id }, { default: 1 }, function (err, docdata) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send(docdata);
                            }
                        });
                    }
                });
            }
        });

    }




    controller.currencyDefault = function (req, res) {
        db.GetOneDocument('currencies', { default: 1 }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }



    controller.socialnetworkssave = async function (req, res) {
        var sociladata = {};
        sociladata.link = [];
        if (typeof req.files.facebookimage != 'undefined') {
            if (req.files.facebookimage.length > 0) {
                var facebookimage = attachment.get_attachment(req.files.facebookimage[0].destination, req.files.facebookimage[0].filename);
                var facebook_img_name = encodeURI(req.files.facebookimage[0].filename);
                var facebook_img_path = req.files.facebookimage[0].destination.substring(2);
                var fbimage = req.files.facebookimage[0].destination.substring(2) + encodeURI(req.files.facebookimage[0].filename);

            }
        }
        if (typeof req.files.twitterimage != 'undefined') {
            if (req.files.twitterimage.length > 0) {
                var twitterimage = attachment.get_attachment(req.files.twitterimage[0].destination, req.files.twitterimage[0].filename);
                var twitter_img_name = encodeURI(req.files.twitterimage[0].filename);
                var twitter_img_path = req.files.twitterimage[0].destination.substring(2);
                var twitimage = req.files.twitterimage[0].destination.substring(2) + encodeURI(req.files.twitterimage[0].filename);

            }
        }
        if (typeof req.files.linkedinimage != 'undefined') {
            if (req.files.linkedinimage.length > 0) {
                var linkedinimage = attachment.get_attachment(req.files.linkedinimage[0].destination, req.files.linkedinimage[0].filename);
                var linkedin_img_name = encodeURI(req.files.linkedinimage[0].filename);
                var linkedin_img_path = req.files.linkedinimage[0].destination.substring(2);
                var liimage = req.files.linkedinimage[0].destination.substring(2) + encodeURI(req.files.linkedinimage[0].filename);

            }
        }
        if (typeof req.files.pinterestimage != 'undefined') {
            if (req.files.pinterestimage.length > 0) {
                var pinterestimage = attachment.get_attachment(req.files.pinterestimage[0].destination, req.files.pinterestimage[0].filename);
                var pinterest_img_name = encodeURI(req.files.pinterestimage[0].filename);
                var pinterest_img_path = req.files.pinterestimage[0].destination.substring(2);
                var pinimage = req.files.pinterestimage[0].destination.substring(2) + encodeURI(req.files.pinterestimage[0].filename);

            }
        }
        if (typeof req.files.youtubeimage != 'undefined') {
            if (req.files.youtubeimage.length > 0) {
                var youtubeimage = attachment.get_attachment(req.files.youtubeimage[0].destination, req.files.youtubeimage[0].filename);
                var youtube_img_name = encodeURI(req.files.youtubeimage[0].filename);
                var youtube_img_path = req.files.youtubeimage[0].destination.substring(2);
                var youimage = req.files.youtubeimage[0].destination.substring(2) + encodeURI(req.files.youtubeimage[0].filename);

            }
        }
        if (typeof req.files.instagramimage != 'undefined') {
            if (req.files.instagramimage.length > 0) {
                var instagramimage = attachment.get_attachment(req.files.instagramimage[0].destination, req.files.instagramimage[0].filename);
                var youtube_img_name = encodeURI(req.files.instagramimage[0].filename);
                var youtube_img_path = req.files.instagramimage[0].destination.substring(2);
                var instaimage = req.files.instagramimage[0].destination.substring(2) + encodeURI(req.files.instagramimage[0].filename);

            }
        }
        if (typeof req.files.googleimage != 'undefined') {
            if (req.files.googleimage.length > 0) {
                var googleimage = attachment.get_attachment(req.files.googleimage[0].destination, req.files.googleimage[0].filename);
                var google_img_name = encodeURI(req.files.googleimage[0].filename);
                var google_img_path = req.files.googleimage[0].destination.substring(2);
                var googimage = req.files.googleimage[0].destination.substring(2) + encodeURI(req.files.googleimage[0].filename);

            }
        }
        if (typeof req.files.googleplayimage != 'undefined') {
            if (req.files.googleplayimage.length > 0) {
                var googleplayimage = attachment.get_attachment(req.files.googleplayimage[0].destination, req.files.googleplayimage[0].filename);
                var googply_img_name = encodeURI(req.files.googleplayimage[0].filename);
                var googply_img_path = req.files.googleplayimage[0].destination.substring(2);
                var googplyimage = req.files.googleplayimage[0].destination.substring(2) + encodeURI(req.files.googleplayimage[0].filename);

            }
        }
        if (typeof req.files.googleplaylandingimage != 'undefined') {
            if (req.files.googleplaylandingimage.length > 0) {
                var googleplaylandingimage = attachment.get_attachment(req.files.googleplaylandingimage[0].destination, req.files.googleplaylandingimage[0].filename);
                var googply_img_name = encodeURI(req.files.googleplaylandingimage[0].filename);
                var googply_img_path = req.files.googleplaylandingimage[0].destination.substring(2);
                var googplylandingimage = req.files.googleplaylandingimage[0].destination.substring(2) + encodeURI(req.files.googleplaylandingimage[0].filename);

            }
        }
        if (typeof req.files.googplycommingsoonimage != 'undefined') {
            if (req.files.googplycommingsoonimage.length > 0) {
                var googplycommingsoonimage = attachment.get_attachment(req.files.googplycommingsoonimage[0].destination, req.files.googplycommingsoonimage[0].filename);
                var googply_comming_soon_img_name = encodeURI(req.files.googplycommingsoonimage[0].filename);
                var googply_img_comming_soon_path = req.files.googplycommingsoonimage[0].destination.substring(2);
                var googplycommingsoonimage = req.files.googplycommingsoonimage[0].destination.substring(2) + encodeURI(req.files.googplycommingsoonimage[0].filename);

            }
        }
        if (typeof req.files.appstoreimage != 'undefined') {
            if (req.files.appstoreimage.length > 0) {
                var appstoreimage = attachment.get_attachment(req.files.appstoreimage[0].destination, req.files.appstoreimage[0].filename);
                var appstr_img_name = encodeURI(req.files.appstoreimage[0].filename);
                var appstr_img_path = req.files.appstoreimage[0].destination.substring(2);
                var appstrimage = req.files.appstoreimage[0].destination.substring(2) + encodeURI(req.files.appstoreimage[0].filename);

            }
        }
        if (typeof req.files.appstorelandingimage != 'undefined') {
            if (req.files.appstorelandingimage.length > 0) {
                var appstorelandingimage = attachment.get_attachment(req.files.appstorelandingimage[0].destination, req.files.appstorelandingimage[0].filename);
                var appstr_img_name = encodeURI(req.files.appstorelandingimage[0].filename);
                var appstr_img_path = req.files.appstorelandingimage[0].destination.substring(2);
                var appstrlandingimage = req.files.appstorelandingimage[0].destination.substring(2) + encodeURI(req.files.appstorelandingimage[0].filename);

            }
        }
        if (typeof req.files.appstorecommingsoonimage != 'undefined') {
            if (req.files.appstorecommingsoonimage.length > 0) {
                var appstorecommingsoonimage = attachment.get_attachment(req.files.appstorecommingsoonimage[0].destination, req.files.appstorecommingsoonimage[0].filename);
                var appstr_img_commingsoon_name = encodeURI(req.files.appstorecommingsoonimage[0].filename);
                var appstr_img_commingsoon_path = req.files.appstorecommingsoonimage[0].destination.substring(2);
                var appstorecommingsoonimage = req.files.appstorecommingsoonimage[0].destination.substring(2) + encodeURI(req.files.appstorecommingsoonimage[0].filename);

            }
        }


        if (fbimage == undefined) {
            fbimage = req.body.facebookimage;
        }
        if (twitimage == undefined) {
            twitimage = req.body.twitterimage;
        }
        if (liimage == undefined) {
            liimage = req.body.linkedinimage;
        }
        if (pinimage == undefined) {
            pinimage = req.body.pinterestimage;
        }
        if (youimage == undefined) {
            youimage = req.body.instagramimage;
        }
        if (instaimage == undefined) {
            instaimage = req.body.youtubeimage;
        }
        if (googimage == undefined) {
            googimage = req.body.googleimage;
        }
        if (googplyimage == undefined) {
            googplyimage = req.body.googleplayimage;
        }
        if (googplylandingimage == undefined) {
            googplylandingimage = req.body.googleplaylandingimage;
        }
        if (googplycommingsoonimage == undefined) {
            googplycommingsoonimage = req.body.googplycommingsoonimage;
        }

        if (appstrimage == undefined) {
            appstrimage = req.body.appstoreimage;
        }
        if (appstrlandingimage == undefined) {
            appstrlandingimage = req.body.appstorelandingimage;
        }
        if (appstorecommingsoonimage == undefined) {
            appstorecommingsoonimage = req.body.appstorecommingsoonimage;
        }

        sociladata.link = [{
            img: fbimage,
            name: req.body.facebookname,
            url: req.body.facebookurl,
            status: req.body.facebookstatus
        },
        {
            img: twitimage,
            name: req.body.twittername,
            url: req.body.twitterurl,
            status: req.body.twitterstatus
        },
        {
            img: liimage,
            name: req.body.linkedinname,
            url: req.body.linkedinurl,
            status: req.body.linkedinstatus
        },
        {
            img: pinimage,
            name: req.body.pinterestname,
            url: req.body.pinteresturl,
            status: req.body.pintereststatus
        },
        {
            img: youimage,
            name: req.body.youtubename,
            url: req.body.youtubeurl,
            status: req.body.youtubestatus
        },
        {
            img: instaimage,
            name: req.body.instagramname,
            url: req.body.instagramurl,
            status: req.body.instagramstatus
        },
        {
            img: googimage,
            name: req.body.googlename,
            url: req.body.googleurl,
            status: req.body.googlestatus
        }
        ];

        var mobileapp = [{
            img: googplyimage,
            landingimg: googplylandingimage,
            comming_soon_img: googplycommingsoonimage,
            name: req.body.googleplayname,
            url: req.body.googleplayurl,
            status: req.body.googleplaystatus
        },
        {
            img: appstrimage,
            landingimg: appstrlandingimage,
            comming_soon_img: appstorecommingsoonimage,
            name: req.body.appstorename,
            url: req.body.appstoreurl,
            status: req.body.appstorestatus
        }
        ];
        const docdata = await db.UpdateDocument('settings', { "alias": "social_networks" }, { $set: { "settings.link": sociladata.link, "settings.mobileapp": mobileapp, "settings.facebook_api": req.body.facebook_api, "settings.google_api": req.body.google_api, "settings.map_api": req.body.map_api, "settings.fcm_keys": req.body.fcm_keys } }, { multi: true })
        if (docdata.status === false) {
            res.send({ status: false });
        } else {
            res.send({ status: true, docdata: docdata.doc });
        }
        // db.UpdateDocument('settings', { "alias": "social_networks" }, { $set: { "settings.link": sociladata.link, "settings.mobileapp": mobileapp, "settings.facebook_api": req.body.facebook_api, "settings.google_api": req.body.google_api, "settings.map_api": req.body.map_api, "settings.fcm_keys": req.body.fcm_keys } }, { multi: true }, function (err, docdata) {
        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }


    controller.restaurantDefault = function (req, res) {


        if (req.body.availability == 0) {

            db.UpdateDocument('restaurant', { _id: req.body.id }, { availability: 1 }, { multi: true }, function (err1, docdata1) {
                if (err1) {
                    res.send(err1);
                } else {
                    res.send(docdata1);
                }

            });
        } else {

            db.UpdateDocument('restaurant', { _id: req.body.id }, { availability: 0 }, { multi: true }, function (err1, docdata1) {
                if (err1) {
                    res.send(err1);
                } else {
                    res.send(docdata1);
                }

            });

        }

    }



    controller.restaurantDefaultSave = function (req, res) {
        db.GetDocument('restaurant', { _id: req.body.id }, {}, {}, function (err, docdata) {
            if (docdata[0].availability == 0) {
                db.UpdateDocument('restaurant', { _id: req.body.id }, { availability: 1 }, { multi: true }, function (err1, docdata1) {
                    if (err1) {
                        res.send(err1);

                    }

                });
            } else {
                db.UpdateDocument('restaurant', { _id: req.body.id }, { availability: 0 }, { multi: true }, function (err1, docdata1) {
                    if (err1) {
                        res.send(err1);

                    }

                });

            }

        });
    }
    controller.languagelist = function (req, res) {
        //console.log("req.body",req.body);
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }


        var languageQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                name: 1,
                default_currency: 1,
                default: 1,
                code: 1,
                status: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                name: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];


        var condition = { status: { $ne: 0 } };
        languageQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            languageQuery.push({
                "$match": {
                    $or: [
                        { "documentData.name": { $regex: searchs + '.*', $options: 'si' } },
                        { "documentData.code": { $regex: searchs + '.*', $options: 'si' } }

                    ]
                }
            });
            //search limit
            languageQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            languageQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                languageQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            languageQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            languageQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            languageQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            languageQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        //languageQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        if (!req.body.search) {
            languageQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('languages', languageQuery, function (err, docdata) {

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
    controller.languagegetlanguage = function (req, res) {
        console.log("111111111", req.params.id);
        db.GetDocument('languages', { _id: req.params.id }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                console.log(".........", docdata)
                res.send(docdata);
            }
        });
    }

    controller.getlanguageDetails = function (req, res) {
        console.log(req.body);
        var filters = '';
        var searchs = '';
        var offer = false;
        var limit = 30;
        if (req.query.limit) {
            var tmp = parseInt(req.query.limit);
            if (tmp != NaN && tmp > 0) {
                limit = tmp;
            }
        }
        var skip = 0;
        if (typeof req.query.pageId != 'undefined') {
            if (req.query.pageId) {
                var tmp = parseInt(req.query.pageId);
                if (tmp != NaN && tmp > 0) {
                    skip = (tmp * limit) - limit;
                }
            }
        }
        var app_type = 'WUA';
        var app_filter = 'front-end';
        console.log('req.query.filters', req.query.filters)
        if (typeof req.query.filters != 'undefined' && req.query.filters != '' && req.query.filters != undefined) {
            var filters = Buffer.from(req.query.filters, 'base64').toString();
            if (filters != '') {
                var filter_type = JSON.parse(filters);
                if (filter_type != '') {
                    app_type = filter_type.app_type
                    app_filter = filter_type.app_filter
                }
            }
        }
        // filters = decodeURIComponent(filters);
        // filters = decodeURIComponent(filters);
        // var filterArray = filters.split('|');
        // for (var i = 0; i < filterArray.length; i++) {
        //     if (filterArray[i] != '') {
        //         var option = filterArray[i].split(':');
        //         console.log('option', option)
        //         if (option.length > 1) {
        //             var values = [];
        //             if (option[1] != '') {
        //                 values = option[1].split(',');
        //             }
        //             if (values.length > 0) {
        //                 if (option[0] == 't') {
        //                     app_type = values[0];
        //                 }
        //                 if (option[0] == 'f') {
        //                     app_filter = values[0];
        //                 }
        //             }
        //         }
        //     }

        // }
        // }
        // }
        if (app_type != 'AUA' && app_type != 'ARA' && app_type != 'ADA' && app_type != 'IUA' && app_type != 'IRA' && app_type != 'IDA' && app_type != 'WUA' && app_type != 'WRA' && app_type != 'WDA') {
            app_type = 'WUA';
        }
        console.log('app_filter', app_filter)
        if (app_filter != 'front-end' && app_filter != 'back-end') {
            app_filter = 'front-end';
        } else {
            if (app_filter == 'front-end') {
                app_filter = 'front-end';
            } else {
                app_filter = 'back-end';
            }
        }
        console.log('app_type', app_type, app_filter)
        fs.readFile(path.join(__dirname, '../../', '/uploads/languages/en.json'), "utf8", function (error, englishRaw) {
            if (error) {
                res.send(error);
            } else {
                var english = JSON.parse(englishRaw);
                var appKeys = Object.keys(english);
                if (appKeys.indexOf(app_type) != -1) {
                    console.log('1');
                    var filterKeys = Object.keys(english[app_type]);
                    if (filterKeys.indexOf(app_filter) != -1) {
                        var engKeys = Object.keys(english[app_type][app_filter]);

                        fs.readFile(path.join(__dirname, '../../', '/uploads/languages/' + req.body.code + '.json'), "utf8", function (error, languageRaw) {
                            if (error) {
                                res.send(error);
                            } else {
                                var objects = JSON.parse(languageRaw);
                                var appKeys1 = Object.keys(objects);
                                if (appKeys1.indexOf(app_type) != -1) {

                                    var filterKeys1 = Object.keys(objects[app_type]);
                                    if (filterKeys1.indexOf(app_filter) != -1) {
                                        var obj = objects[app_type][app_filter];
                                        var keys = Object.keys(obj);
                                        var newarray = [];
                                        for (var i = 0; i < engKeys.length; i++) {
                                            if (obj[engKeys[i]]) {
                                                newarray[engKeys[i]] = obj[engKeys[i]];
                                            } else {
                                                newarray[engKeys[i]] = english[app_type][app_filter][engKeys[i]];
                                                //newarray[engKeys[i]] = '';
                                            }
                                        }
                                        var keysasdasds = Object.keys(newarray);
                                        var languageManage = {};
                                        languageManage.total = keysasdasds.length;
                                        languageManage.data = {};
                                        var start = req.body.limit * (req.body.current - 1);
                                        var end = req.body.limit + (req.body.limit * (req.body.current - 1));
                                        console.log('start', start, end)
                                        for (var i = start; i < end; i++) {
                                            languageManage.data[keysasdasds[i]] = newarray[keysasdasds[i]];
                                        }
                                        var result = { jsondata: languageManage, app_type: app_type, app_filter: app_filter }
                                        res.send(result);
                                    } else {
                                        res.send('Something went to wrong');
                                    }
                                } else {
                                    res.send('Something went to wrong');
                                }
                            }
                        });
                    } else {
                        res.send('Something went to wrong');
                    }
                } else {
                    res.send('Something went to wrong');
                }
            }
        });
    }


    controller.languageedit = function (req, res) {
        console.log("req from Body", req.body)
        req.checkBody('name', 'Language name is invalid').notEmpty();
        req.checkBody('code', 'Invalid language code').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var data = {};
        data.name = req.body.name;
        data.code = req.body.code;
        data.status = req.body.status;
        var obj;
        var objectValue;
        if (req.body._id) {
            db.GetOneDocument('languages', { '_id': req.body._id, status: { $ne: 0 } }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    fs.readFile(path.join(__dirname, '../../', '/uploads/languages/' + docdata.code + '.json'), "utf8", function (error, objectdata) {
                        if (error) {
                            res.send(err);
                        } else {
                            obj = JSON.parse(objectdata)
                            objectValue = obj;
                            fs.writeFile(path.join(__dirname, '../../', '/uploads/languages/' + req.body.code + '.json'), JSON.stringify(objectValue, null, 4), function (err, respo) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    db.UpdateDocument('languages', { _id: { $in: req.body._id } }, data, function (err, result) {
                                        if (err) { res.send(err); } else { res.send(result); }
                                    });
                                }
                            });
                        }

                    });
                }

            });
        } else {
            db.GetOneDocument('languages', { 'code': req.body.code, status: { $ne: 0 } }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    if (docdata != null) {
                        //  console.log("file already exist")
                        res.status(400).send({ message: 'Language is Already Exist' });
                    } else {
                        //console.log("InsertDocument")
                        fs.readFile(path.join(__dirname, '../../', '/uploads/languages/en.json'), "utf8", function (error, objectdata) {
                            if (error) {
                                db.GetOneDocument('languages', { default: 1, status: 1 }, {}, {}, function (err, defaultdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        fs.readFile(path.join(__dirname, '../../', '/uploads/languages/' + defaultdata.code + '.json'), "utf8", function (error, objectdata) {
                                            if (error) {
                                                res.send(err);
                                            } else {
                                                obj = JSON.parse(objectdata)
                                                objectValue = obj;

                                                fs.writeFile(path.join(__dirname, '../../', '/uploads/languages/' + req.body.code + '.json'), JSON.stringify(objectValue, null, 4), function (err, respo) {
                                                    console.log('asdas', '../../', '/uploads/languages/' + req.body.code + '.json', err, respo)
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        db.InsertDocument('languages', data, function (err, result) {
                                                            if (err) { res.send(err); } else { res.send(result); }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else {
                                obj = JSON.parse(objectdata)
                                objectValue = obj;
                                console.log('sada', path.join(__dirname, '../../', '/uploads/languages/' + req.body.code + '.json'))
                                fs.writeFile(path.join(__dirname, '../../', '/uploads/languages/' + req.body.code + '.json'), JSON.stringify(objectValue, null, 4), function (err, respo) {

                                    if (err) {
                                        res.send(err);
                                    } else {
                                        db.InsertDocument('languages', data, function (err, result) {
                                            if (err) { res.send(err); } else { res.send(result); }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    }

    controller.languageSaveTranslation = function (req, res) {
        req.checkBody('id', 'Invalid Id').notEmpty();
        req.checkBody('data', 'Invalid Data').notEmpty();
        req.checkBody('app_filter', 'Invalid app_filter').notEmpty();
        req.checkBody('app_type', 'Invalid app_type').notEmpty();
        var errors = req.validationErrors();
        if (errors) { res.send(errors, 400); return; }
        var app_type = 'WUA';
        var app_filter = 'front-end';

        if (req.body.app_type != 'AUA' && req.body.app_type != 'ARA' && req.body.app_type != 'ADA' && req.body.app_type != 'IUA' && req.body.app_type != 'IRA' && req.body.app_type != 'IDA' && req.body.app_type != 'WUA' && req.body.app_type != 'WRA' && req.body.app_type != 'WDA') {
            app_type = 'WUA';
        }
        console.log('app_filter', app_filter)
        if (req.body.app_filter != 'front-end' && req.body.app_filter != 'back-end') {
            app_filter = 'front-end';
        } else {
            if (app_filter == 'front-end') {
                app_filter = 'front-end';
            } else {
                app_filter = 'back-end';
            }
        }
        fs.readFile(path.join(__dirname, '../../', '/uploads/languages/en.json'), "utf8", function (error, englishRaw) {
            if (error) {
                res.send(error);
            } else {
                var english = JSON.parse(englishRaw);
                var appKeys = Object.keys(english);
                var index_of = appKeys.indexOf(app_type);
                var result = {};
                for (var key in english) {
                    result[key] = english[key]
                }
                result = english;
                if (appKeys.indexOf(app_type) != -1) {
                    var filterKeys = Object.keys(english[app_type]);
                    var index_of1 = filterKeys.indexOf(app_filter);
                    if (filterKeys.indexOf(app_filter) != -1) {
                        var engKeys = Object.keys(english[app_type][app_filter]);
                        fs.readFile(path.join(__dirname, '../../', '/uploads/languages/' + req.body.id + '.json'), "utf8", function (error, objectdata) {
                            if (error) {

                            } else {
                                var objects = JSON.parse(objectdata);
                                var appKeys1 = Object.keys(objects);
                                if (appKeys1.indexOf(app_type) != -1) {
                                    var filterKeys1 = Object.keys(objects[app_type]);
                                    if (filterKeys1.indexOf(app_filter) != -1) {
                                        var obj = objects[app_type][app_filter];
                                        var keys = Object.keys(obj);
                                        //var newarray = [];
                                        for (var i = 0; i < engKeys.length; i++) {
                                            if (obj[engKeys[i]]) {
                                                result[app_type][app_filter][engKeys[i]] = obj[engKeys[i]];
                                            } else {
                                                result[app_type][app_filter][engKeys[i]] = '';
                                            }
                                        }
                                        var keysasdasds = Object.keys(result[app_type][app_filter]);
                                        var keys = Object.keys(req.body.data);
                                        for (var i = 0; i < keysasdasds.length; i++) {
                                            if (req.body.data[keysasdasds[i]]) {
                                                result[app_type][app_filter][keysasdasds[i]] = req.body.data[keysasdasds[i]];
                                            }
                                            if (!result[app_type][app_filter][keysasdasds[i]]) {
                                                delete result[app_type][app_filter][keysasdasds[i]];
                                            }
                                        }
                                        console.log('newarray', 'index_of', result[app_type][app_filter])
                                        var outputfile = path.join(__dirname, "../../", '/uploads/languages/' + req.body.id + ".json");
                                        fs.writeFile(outputfile, JSON.stringify(result, null, 4), function (err) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                res.send(outputfile);
                                            }
                                        });
                                        //res.send('');
                                    } else {
                                        res.send('Something went to wrong');
                                    }
                                } else {
                                    res.send('Something went to wrong');
                                }
                            }
                        });
                    } else {
                        res.send('Something went to wrong');
                    }
                } else {
                    res.send('Something went to wrong');
                }
                /*  var english = JSON.parse(englishRaw);
                 var engKeys = Object.keys(english);
                 fs.readFile(path.join(__dirname, '../../', '/uploads/languages/' + req.body.id + '.json'), "utf8", function (error, objectdata) {
                     if (error) {
 
                     } else {
                         var obj = JSON.parse(objectdata)
                         var orgKeys = Object.keys(obj);
 
                         var newarray = {};
                         for (var i = 0; i < engKeys.length; i++) {
                             if (obj[engKeys[i]]) {
                                 newarray[engKeys[i]] = obj[engKeys[i]];
                             } else {
                                 newarray[engKeys[i]] = '';
                             }
                         }
                         var keysasdasds = Object.keys(newarray);
 
                         var keys = Object.keys(req.body.data);
                         for (var i = 0; i < keysasdasds.length; i++) {
                             if (req.body.data[keysasdasds[i]]) {
                                 newarray[keysasdasds[i]] = req.body.data[keysasdasds[i]];
                             }
                             if (!newarray[keysasdasds[i]]) {
                                 delete newarray[keysasdasds[i]];
                             }
                         }
 
                         var outputfile = path.join(__dirname, "../../", '/uploads/languages/' + req.body.id + ".json");
                         fs.writeFile(outputfile, JSON.stringify(newarray, null, 4), function (err) {
                             if (err) {
                                 res.send(err);
                             } else {
                                 res.send(outputfile);
                             }
                         });
 
                     }
                 }); */
            }
        });
    }


    controller.languageTranslation = function (req, res) {
        req.checkBody('code', 'Invalid Code').notEmpty();
        var errors = req.validationErrors();
        if (errors) { res.send(errors, 400); return; }

        db.GetOneDocument('languages', { 'status': 1, 'code': req.body.code }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    controller.languageGetTranslation = function (req, res) {
        db.GetOneDocument('languages', { 'status': 1, 'code': 'en' }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata.translation);
            }
        });
    }

    controller.languagedelete = function (req, res) {
        //console.log("delData", req.body)
        req.checkBody('ids', 'Invalid ids').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        //db.RemoveDocument('languages', { _id: { $in: req.body.ids } }, function (err, docdata) {
        db.UpdateDocument('languages', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    controller.languagedefaultsave = function (req, res) {
        db.GetOneDocument('languages', { _id: { $eq: req.body.id }, status: { $eq: 1 } }, {}, {}, function (err, docdata) {
            if (docdata) {
                db.UpdateDocument('languages', { _id: { $ne: req.body.id } }, { default: 0 }, { multi: true }, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        db.UpdateDocument('languages', { _id: req.body.id }, { default: 1 }, function (err, docdata) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send(docdata);
                            }
                        });
                    }
                });
            } else {
                res.status(400).send("Can't set Default language to status of unpublish Please choose some other language or else change the status ");
            }
        });
    }

    controller.languagedefault = function (req, res) {
        //res.send({});
        db.GetOneDocument('languages', { default: 1 }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }


    controller.general = async function (req, res) {
        const docdata = await db.GetDocument('settings', { alias: "general" }, {}, {})
        if (err) {
            res.send(err);
        } else {
            //console.log("docdata/////////////////////",docdata);
            res.send(docdata.doc[0].settings);
        }
        // db.GetDocument('settings', { alias: "general" }, {}, {}, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         //console.log("docdata/////////////////////",docdata);
        //         res.send(docdata[0].settings);
        //     }
        // });
    }

    controller.themecolor = async function (req, res) {
        const docdata = await db.GetDocument('settings', { alias: "appearance" }, {}, {})
        if (err) {
            res.send(err);
        } else {
            //console.log("docdata/////////////////////",docdata);
            res.send(docdata.doc[0].settings);
        }
        // db.GetDocument('settings', { alias: "appearance" }, {}, {}, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         //console.log("docdata/////////////////////",docdata);
        //         res.send(docdata[0].settings);
        //     }
        // });
    }


    controller.timezones = function (req, res) {
        /* var timezone = require('moment-timezone');
        var timezoneData = timezone.tz.names();
        res.send(timezoneData); */

        var timezone = require('moment-timezone');
        var moment = require("moment");
        var timeZones = timezone.tz.names();
        var offsetTmz = [];
        for (i in timeZones) {
            var data = { 'label': timeZones[i] + ' ' + "(GMT" + moment.tz(timeZones[i]).format('Z') + ")", value: timeZones[i] };
            offsetTmz.push(data);
        }
        res.send(offsetTmz);
    };

    /*  controller.timezones = function (req, res) {
         var timezone = require('moment-timezone');
         var moment = require("moment");
         var timeZones = timezone.tz.names();
         var offsetTmz = [];
         for (i in timeZones) {
             offsetTmz.push(timeZones[i] + ' ' + "(GMT" + moment.tz(timeZones[i]).format('Z') + ")");
         }
         res.send(offsetTmz);
     };
 */

    controller.deleteSplashScreen = async function (req, res) {
        try {
            // db.settings.update(
            //     { "alias": "general" },
            //     { $unset: { ["settings.splash_screen." + index]: 1 } }
            //   )
            console.log(req.body.id, 'this is id and id');
            const spla = await db.GetOneDocument('settings', { alias: 'general' }, {}, {})
            console.log(spla, 'this is spla');
            const splash = spla.doc.settings.splash_screen
            splash.splice(req.body.id, 1);
            // await  db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.wallet.status": req.body.status } }
            let updated = await db.UpdateDocument('settings', { "alias": "general" }, { $set: { "settings.splash_screen": splash } }, { multi: false });
            console.log(updated, 'this is updated');

            res.send({ error: false, message: "Splash screen deleted" })
        } catch (error) {
            console.log(error, ':error');
        }
    }

    controller.save = async function (req, res) {
        console.log(req.body, 'this is request body+++++++++++++++++++++++++++++++++++++++++++++++++++++++))))))))))))))))');
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
            // return;
        // }
        // return
        var data = { settings: { wallet: { amount: {} } } };
        data.settings.meta = {}
        data.settings.meta.meta_title = req.body.meta_title;
        data.settings.meta.meta_keyword = JSON.parse(req.body.meta_keyword);
        data.settings.meta.meta_description = req.body.meta_description;
        data.settings.site_title = req.body.site_title;
        data.settings.site_address = req.body.site_address;
        data.settings.radius = req.body.radius;
        data.settings.time_out = req.body.time_out;
        data.settings.rcategory = req.body.rcategory;
        data.settings.mrcategory = req.body.mrcategory;
        data.settings.restaurant_alert_time = req.body.restaurant_alert_time;
        data.settings.drivertime_out = req.body.drivertime_out;
        data.settings.site_url = req.body.site_url;
        data.settings.email_address = req.body.email_address;
        data.settings.report_email = req.body.report_email;
        data.settings.phone = req.body.phone;
        data.settings.admin_commission = req.body.admin_commission;
        data.settings.minimum_amount = req.body.minimum_amount;
        data.settings.driver_commission = req.body.driver_commission;
        data.settings.service_tax = req.body.service_tax;
        data.settings.billingcycle = req.body.billingcycle;
        data.settings.time_slot = req.body.time_slot;
        data.settings.bookingIdPrefix = req.body.bookingIdPrefix.toUpperCase();
        data.settings.time_zone = req.body.time_zone;
        if (req.body.time_slot == 'enable') {
            data.settings.delivery_days = 0;
        } else {
            data.settings.delivery_days = req.body.delivery_days;
        }
        data.settings.eta_time = req.body.eta_time;
        data.settings.currency_code = req.body.currency_code;
        data.settings.currency_symbol = req.body.currency_symbol;
        data.settings.site_publish = req.body.site_publish;
        data.settings.coupon_process = req.body.coupon_process;
        data.settings.rov_period = req.body.rov_period;
        data.settings.bir_tax = req.body.bir_tax;
        data.settings.best_seller = req.body.best_seller;
        data.settings.splash_screen = [];
        if (req.body.review_rating === 'true') {
            data.settings.review_rating = true;
        } else {
            data.settings.review_rating = false;
        }
        var timezone = require('moment-timezone');
        var moment = require("moment");
        var timeZones = timezone.tz.names();
        var timeZonesIndex = timeZones.map(function (e) { return e; }).indexOf(req.body.time_zone);
        if (timeZonesIndex != -1) {
            data.settings.time_zone_value = moment.tz(timeZones[timeZonesIndex]).format('Z');
        }
        if (req.body.datekeyformat) {
            data.settings.date_format = req.body.datekeyformat;
        } else {
            data.settings.date_format = req.body.date_format;
        }
        data.settings.time_format = req.body.time_format;
        console.log(typeof req.body.multiBase64, 'this is the type of +++++++++++++++++++++++++++++++++++++++++++');

        if (req.body.multiBase64 && req.body.multiBase64.length > 0) {
            console.log('ooh god are you intered________________________________________________________________');
            for (let index = 0; index < req.body.multiBase64.length; index++) {
                var Base64 = req.body.multiBase64[index].match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                var file_name = Date.now().toString() + Math.floor(100 + Math.random() * 900) + '.png';
                var fil = CONFIG.DIRECTORY_OTHERS + file_name;
                console.log(Base64, 'thi si base 64 array...')

                library.base64Upload({ file: fil, base64: Base64[2] }, function (err, response) { });

                // var success = await upload64(fil, Base64[2]);

                data.settings.splash_screen.push(fil);
                console.log(data, "splash...............");
            }
        }
        const spla = await db.GetOneDocument('settings', { alias: 'general' }, {}, {})
        console.log(spla, 'this is spla');
        if (spla.doc.settings.splash_screen) {
            if (spla.doc.settings.splash_screen.length > 0) {
                for (let i = 0; i < spla.doc.settings.splash_screen.length; i++) {
                    console.log(spla.doc.settings.splash_screen[i], 'spla.doc.settings.splash_screen[i]');
                    data.settings.splash_screen.push(spla.doc.settings.splash_screen[i]);
                }
            }
        }


        // data.settings.wallet.amount.minimum_recharge = req.body.wallet.amount.minimum_recharge;
        // data.settings.wallet.amount.minimum_request = req.body.wallet.amount.minimum_request;
        // data.settings.wallet.amount.minimum_amount = req.body.wallet.amount.minimum_amount;
        // data.settings.wallet.amount.maximum_amount = req.body.wallet.amount.maximum_amount;

        /*  data.settings.wallet.amount.minimum = req.body.wallet.amount.minimum;
         data.settings.wallet.amount.maximum = req.body.wallet.amount.maximum;
         data.settings.walle.DIRECTORY_SPLASH_SCREEN req.body.wallet.amount.welcome; */
        // data.settings.wal.splash_screen
        var pay_by_cash = {};
        data.settings.pay_by_cash = req.body.pay_by_cash;

        var referral = {};
        data.settings.referral = req.body.referral;

        var delivery_charge = {};
        data.settings.delivery_charge = req.body.delivery_charge;

        var categorycommission = {};
        data.settings.categorycommission = req.body.categorycommission;
        // data.settings.categorycommission = req.body.categorycommission;


        if (typeof req.files.logo != 'undefined') {
            if (req.files.logo.length > 0) {
                data.settings.logo = attachment.get_attachment(req.files.logo[0].destination, req.files.logo[0].filename);
                data.img_name = encodeURI(req.files.logo[0].filename);
                data.img_path = req.files.logo[0].destination.substring(2);
            }
        } else {
            data.settings.logo = req.body.logo;
        }
        if (typeof req.files.footer_logo != 'undefined') {
            if (req.files.footer_logo.length > 0) {
                data.settings.footer_logo = attachment.get_attachment(req.files.footer_logo[0].destination, req.files.footer_logo[0].filename);
                data.img_name = encodeURI(req.files.footer_logo[0].filename);
                data.img_path = req.files.footer_logo[0].destination.substring(2);
            }
        } else {
            data.settings.footer_logo = req.body.footer_logo;
        }
        if (typeof req.files.shipping_banner != 'undefined') {
            if (req.files.shipping_banner.length > 0) {
                data.settings.shipping_banner = attachment.get_attachment(req.files.shipping_banner[0].destination, req.files.shipping_banner[0].filename);
                // data.img_name = encodeURI(req.files.shipping_banner[0].filename);
                // data.img_path = req.files.shipping_banner[0].destination.substring(2);
            }
        } else {
            data.settings.shipping_banner = req.body.shipping_banner;
        }
        if (typeof req.files.allcat_banner != 'undefined') {
            if (req.files.allcat_banner.length > 0) {
                data.settings.allcat_banner = attachment.get_attachment(req.files.allcat_banner[0].destination, req.files.allcat_banner[0].filename);
                // data.img_name = encodeURI(req.files.allcat_banner[0].filename);
                // data.img_path = req.files.allcat_banner[0].destination.substring(2);
            }
        } else {
            data.settings.allcat_banner = req.body.allcat_banner;
        }
        if (typeof req.files.login_image != 'undefined') {
            if (req.files.login_image.length > 0) {
                data.settings.login_image = attachment.get_attachment(req.files.login_image[0].destination, req.files.login_image[0].filename);
            }
        } else if (req.body.login_image) {
            data.settings.login_image = req.body.login_image;
        }
        if (typeof req.files.register_image != 'undefined') {
            if (req.files.register_image.length > 0) {
                data.settings.register_image = attachment.get_attachment(req.files.register_image[0].destination, req.files.register_image[0].filename);
            }
        } else if (req.body.register_image) {
            data.settings.register_image = req.body.register_image;
        }
        if (typeof req.files.favicon != 'undefined') {
            if (req.files.favicon.length > 0) {
                data.settings.favicon = attachment.get_attachment(req.files.favicon[0].destination, req.files.favicon[0].filename);
            }
        } else {
            data.settings.favicon = req.body.favicon;
        }
        // adding AppIcon 
        if (typeof req.files.appicon != 'undefined') {
            if (req.files.appicon.length > 0) {
                data.settings.appicon = attachment.get_attachment(req.files.appicon[0].destination, req.files.appicon[0].filename);
            }
        } else {
            data.settings.appicon = req.body.appicon;
        }


        if (typeof req.files.footer_icon != 'undefined') {
            if (req.files.footer_icon.length > 0) {
                data.settings.footer_icon = attachment.get_attachment(req.files.footer_icon[0].destination, req.files.footer_icon[0].filename);
            }
        } else {
            data.settings.footer_icon = req.body.footer_icon;
        }
        if (typeof req.files.site_logo != 'undefined') {
            if (req.files.site_logo.length > 0) {
                data.settings.site_logo = attachment.get_attachment(req.files.site_logo[0].destination, req.files.site_logo[0].filename);
            }
        } else {
            data.settings.site_logo = req.body.site_logo;
        }

        data.settings.with_password = 0;
        data.settings.with_otp = 0;
        if (req.body.with_password == 'true') {
            data.settings.with_password = 1;
        }
        if (req.body.with_otp == 'true') {
            data.settings.with_otp = 1;
        }
        console.log(data, 'this isth data we are lookin for a long time__________++++_++_+++++');
        const docdata = await db.UpdateDocument('settings', { "alias": "general" }, data, { upsert: true })
        if (!docdata) {
            res.send(err);
        } else {
            const docdata = await db.GetOneDocument('settings', { alias: 'general' }, {}, {})
            if (!docdata) { } else {
                io.of('/chat').emit('changeAdminSettings', { settings: docdata.doc.settings });
            }
            // db.GetOneDocument('settings', { alias: 'general' }, {}, {}, function(err, docdata) {
            //     if (err || !docdata) {} else {
            //         io.of('/chat').emit('changeAdminSettings', { settings: docdata.settings });
            //     }
            // });
            const doc = await db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {})
            var data = {};
            data.settings = {};
            data.settings.no_of_days = req.body.billingcycle;
            //  console.log(doc)
            if (doc.doc == null) {
                data.settings.last_billed_date = new Date();
                data.alias = "billing_cycle";
                const inserted = await db.InsertDocument('settings', data)
                res.send(docdata.doc);
                // db.InsertDocument('settings', data, (err, inserted) => {
                //     res.send(docdata);
                // })
            } else {
                data.settings.last_billed_date = doc.doc.settings.last_billed_date;
                const updated = await db.UpdateDocument('settings', { "alias": "billing_cycle" }, data, {})
                res.send(docdata.doc);
                // db.UpdateDocument('settings', { "alias": "billing_cycle" }, data, {}, (err, updated) => {

                //     res.send(docdata);
                // })
            }

            // db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, (err, doc) => {
            //     var data = {};
            //     data.settings = {};
            //     data.settings.no_of_days = req.body.billingcycle;
            //     //  console.log(doc)
            //     if (err || doc == null) {
            //         data.settings.last_billed_date = new Date();
            //         data.alias = "billing_cycle";
            //         db.InsertDocument('settings', data, (err, inserted) => {
            //             res.send(docdata);
            //         })
            //     } else {
            //         data.settings.last_billed_date = doc.settings.last_billed_date;
            //         db.UpdateDocument('settings', { "alias": "billing_cycle" }, data, {}, (err, updated) => {

            //             res.send(docdata);
            //         })
            //     }

            // })


        }
        // db.UpdateDocument('settings', { "alias": "general" }, data, { upsert: true }, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         db.GetOneDocument('settings', { alias: 'general' }, {}, {}, function(err, docdata) {
        //             if (err || !docdata) {} else {
        //                 io.of('/chat').emit('changeAdminSettings', { settings: docdata.settings });
        //             }
        //         });


        //         db.GetOneDocument('settings', { "alias": "billing_cycle" }, {}, {}, (err, doc) => {
        //             var data = {};
        //             data.settings = {};
        //             data.settings.no_of_days = req.body.billingcycle;
        //             //  console.log(doc)
        //             if (err || doc == null) {
        //                 data.settings.last_billed_date = new Date();
        //                 data.alias = "billing_cycle";
        //                 db.InsertDocument('settings', data, (err, inserted) => {
        //                     res.send(docdata);
        //                 })
        //             } else {
        //                 data.settings.last_billed_date = doc.settings.last_billed_date;
        //                 db.UpdateDocument('settings', { "alias": "billing_cycle" }, data, {}, (err, updated) => {

        //                     res.send(docdata);
        //                 })
        //             }

        //         })


        //     }
        // });
    }
    controller.currency = async function (req, res) {
        var data = { settings: {} };
        data.settings.currency = req.body.currency;
        let updated = await db.UpdateDocument('settings', { "alias": "currency" }, data, { upsert: true });
        res.send(updated);
    }
    controller.get_currency = async function (req, res) {
        let docdata = await db.GetDocument('settings', { alias: "currency" }, {}, {});
        if (docdata && docdata.doc) {
            res.send({ error: 0, message: "success", data: docdata.doc[0].settings });
        } else if (!docdata[0]) {
            res.send({ error: 1, message: "No data", data: [] })
        }
    }

    controller.seo = async function (req, res) {
        const docdata = await db.GetOneDocument('settings', { alias: 'seo' }, {}, {})
        if (!docdata) {
            res.send(err);
        } else {
            res.send(docdata.doc.settings);
        }
        db.GetOneDocument('settings', { alias: 'seo' }, {}, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send(err);
            } else {
                res.send(docdata.settings);
            }
        });
    }
    controller.seosave = async function (req, res) {
        var data = { settings: { webmaster: {} } };
        data.settings.seo_title = req.body.seo_title;
        data.settings.focus_keyword = req.body.focus_keyword;
        data.settings.meta_description = req.body.meta_description;
        // data.settings.webmaster.google_analytics = req.body.webmaster.google_analytics;
        // data.settings.webmaster.google_html_tag = req.body.webmaster.google_html_tag;
        if (typeof req.files.og_image != 'undefined' || typeof req.body.og_image != 'undefined') {
            console.log(req.files)
            if (req.files && req.files.og_image && req.files.og_image.length > 0) {
                data.settings.og_image = attachment.get_attachment(req.files.og_image[0].destination, req.files.og_image[0].filename);
            } else if (req.body.og_image) {
                data.settings.og_image = req.body.og_image;
            };
            const docdata = await db.UpdateDocument('settings', { "alias": "seo" }, data, { upsert: true });
            if (!docdata) {
                res.send('err');
            } else {
                if (docdata.doc && docdata.doc.modifiedCount > 0) {
                    return res.status(200).send({ status: 1, message: "SEO updated successfully" });
                } else {
                    return res.status(400).send({ status: 0, message: "Something went wrong! Please try again" });
                }
            }
            // db.UpdateDocument('settings', { "alias": "seo" }, data, { upsert: true }, function(err, docdata) {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send(docdata);

            //     }
            // });
        } else {
            const docdata = await db.UpdateDocument('settings', { "alias": "seo" }, data, { upsert: true })
            if (!docdata) {
                res.send('err');
            } else {
                res.send(docdata);
            }
            // db.UpdateDocument('settings', { "alias": "seo" }, data, { upsert: true }, function(err, docdata) {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send(docdata);

            //     }
            // });
        }

    }


    controller.widgets = async function (req, res) {
        // db.GetDocument('settings',{},{widgets:1},function(err,docdata){\
        const docdata = await db.GetOneDocument('settings', { alias: 'widgets' }, {}, {})
        if (!docdata) {
            res.send('err');
        } else {
            res.send(docdata.doc.settings);
        }
        // db.GetOneDocument('settings', { alias: 'widgets' }, {}, {}, function(err, docdata) {
        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata.settings);
        //     }
        // });
    }

    controller.getSetting = async function (req, res) {
        const docdata = await db.GetDocument('settings', { alias: 'general' }, {}, {})
        if (docdata.status == false) {
            res.send(docdata.doc);
        } else {
            res.send(docdata.doc);
        }
        // db.GetDocument('settings', { alias: 'general' }, {}, {}, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    };



    controller.widgetssave = async (req, res) => {
        var send_data = {}
        var data = { settings: {} };
        data.settings.footer_widgets_1 = req.body.footer_widgets_1;
        data.settings.footer_widgets_2 = req.body.footer_widgets_2;
        data.settings.footer_widgets_3 = req.body.footer_widgets_3;
        data.settings.footer_widgets_4 = req.body.footer_widgets_4;
        data.settings.footer_widgets_5 = req.body.footer_widgets_5;
        data.settings.footer_widgets_6 = req.body.footer_widgets_6;
        data.settings.footer_widgets_7 = req.body.footer_widgets_7;

        data.settings.how_readytoeat_works = req.body.how_quickrabbit_works;
        data.settings.features = req.body.features;
        data.settings.why_use_readytoeat = req.body.why_use_quickrabbit;

        let widget_update = await db.UpdateDocument('settings', { "alias": "widgets" }, data, {})

        console.log("widget_updatewidget_updatewidget_updatewidget_updatewidget_update")

        console.log(widget_update, "gap", widget_update.doc.modifiedCount)


        console.log("widget_updatewidget_updatewidget_updatewidget_updatewidget_update")


        if (!widget_update) {

            send_data.status == 0;
            send_data.message = "Something Went Wrong"
            res.send(send_data)

        } else {



            send_data.status == 1;
            send_data.message = "Widgets Updated Successfully"
            send_data.data = widget_update.doc
            res.send(send_data)
        }






        // db.UpdateDocument('settings', { "alias": "widgets" }, data, { upsert: true }, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }

    controller.smtp = async function (req, res) {
        const docdata = await db.GetOneDocument('settings', { alias: 'smtp' }, {}, {})
        if (!docdata) {
            res.send('err');
        } else {
            res.send(docdata.doc.settings);
        }
        // db.GetOneDocument('settings', { alias: 'smtp' }, {}, {}, function(err, docdata) {
        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata.settings);
        //     }
        // });
    }

    controller.smtpsave = async function (req, res) {

        // req.checkBody('smtp_host', 'host is invalid').notEmpty();
        // req.checkBody('smtp_port', 'Invalid port').notEmpty();
        // req.checkBody('smtp_username', 'Username is invalid').notEmpty();
        // req.checkBody('smtp_password', 'Invalid password').notEmpty();
        // // req.checkBody('mode', 'Invalid password').notEmpty();

        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        console.log(req.body, 'BBODY');
        var data = { settings: {} };
        data.settings.smtp_host = req.body.smtp_host;
        data.settings.smtp_port = req.body.smtp_port;
        data.settings.smtp_username = req.body.smtp_username;
        data.settings.smtp_password = req.body.smtp_password;
        data.settings.mode = 'development';
        console.log(data, 'data');
        const docdata = await db.UpdateDocument('settings', { "alias": "smtp" }, data, {})
        console.log(docdata);
        if (docdata.status === false) {
            res.send({ status: false, messag: 'Not updated' });
        } else {
            res.send({ status: true, message: 'Updated successfully' });
        }
        // db.UpdateDocument('settings', { "alias": "smtp" }, data, { upsert: true }, function(err, docdata) {

        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);

        //     }
        // });
    }

    controller.sms = async function (req, res) {
        const docdata = await db.GetOneDocument('settings', { alias: 'sms' }, {}, {})
        if (!docdata.doc) {
            res.send(err);
        } else {
            res.send(docdata.doc.settings);
        }
        // db.GetOneDocument('settings', { alias: 'sms' }, {}, {}, function(err, docdata) {
        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata.settings);
        //     }
        // });
    }


    controller.smssave = async function (req, res) {
        // req.checkBody('twilio.apikey', 'API Key is Invalid').notEmpty();
        // req.checkBody('twilio.sender', 'Sender is Invalid').notEmpty();

        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }

        var data = { settings: { twilio: {} } };
        data.settings.twilio.apikey = req.body.twilio.apikey;
        data.settings.twilio.sender = req.body.twilio.sender;
        data.settings.twilio.mode = req.body.twilio.mode;

        const docdata = await db.UpdateDocument('settings', { "alias": "sms" }, data, { upsert: true })
        if (!docdata.doc) {
            res.send(err);
        } else {
            res.send(docdata.doc);
        }
        // db.UpdateDocument('settings', { "alias": "sms" }, data, { upsert: true }, function(err, docdata) {
        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });

    }

    controller.socialnetworks = async function (req, res) {
        const docdata = await db.GetOneDocument('settings', { alias: 'social_networks' }, {}, {})
        if (!docdata.doc) {
            res.send(err);
        } else {
            res.send(docdata.doc.settings);
        }
        // db.GetOneDocument('settings', { alias: 'social_networks' }, {}, {}, function(err, docdata) {
        //     if (err || !docdata) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata.settings);
        //     }
        // });
    }

    controller.walletSetting = async function (req, res) {
        var data = {};
        data = { settings: { wallet: {} } };
        data.settings.wallet.status = req.body.status;

        const docdata = await db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.wallet.status": req.body.status } }, { multi: false })
        if (!docdata.doc) {
            res.send('err');
        } else {
            res.send(docdata.doc);
        }
        // db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.wallet.status": req.body.status } }, { multi: false }, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }

    controller.categorySetting = async function (req, res) {
        var data = {};
        data = { settings: { wallet: {} } };
        data.settings.wallet.status = req.body.status;

        const docdata = await db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.categorycommission.status": req.body.status } }, { multi: false })
        if (!docdata) {
            res.send('err');
        } else {
            res.send(docdata);
        }
        // db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.categorycommission.status": req.body.status } }, { multi: false }, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }

    controller.cashSetting = async function (req, res) {
        var data = {};
        data = { settings: { pay_by_cash: {} } };
        data.settings.pay_by_cash.status = req.body.status;

        const docdata = await db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.pay_by_cash.status": req.body.status } }, { multi: false })
        if (!docdata) {
            res.send('err');
        } else {
            res.send(docdata.doc);
        }
        // db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.pay_by_cash.status": req.body.status } }, { multi: false }, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }


    controller.referralStatus = async function (req, res) {
        var data = {};
        data = { settings: { referral: {} } };
        data.settings.referral.status = req.body.status;

        const docdata = await db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.referral.status": req.body.status } }, { multi: false })
        if (!docdata) {
            res.send('err');
        } else {
            res.send(docdata.doc);
        }
        // db.UpdateDocument('settings', { alias: 'general' }, { $set: { "settings.referral.status": req.body.status } }, { multi: false }, function(err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }

    controller.settingsDetails = async (req, res) => {
        const docdata = await db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1, 'settings.with_otp': 1, 'settings.with_password': 1 }, {})
        if (!docdata) {
            res.send({ err: 1, message: 'Unable to fetch data', settings: {} })
        } else {
            var settings = docdata.settings;
            var server_offset = (new Date).getTimezoneOffset();
            settings.offset = server_offset;
            var jstz = require('jstimezonedetect');
            var server_time_zone = jstz.determine().name();
            settings.server_time_zone = server_time_zone;
            settings.with_otp = settings.with_otp ? settings.with_otp : 1;
            settings.with_password = settings.with_password ? settings.with_password : 0;
            var data = {};
            data.err = 0;
            data.message = "";
            data.settings = settings;
            res.send(data);
        }
        // db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1, 'settings.with_otp': 1, 'settings.with_password': 1 }, {}, function(err, docdata) {
        //     if (err || !docdata) {
        //         res.send({ err: 1, message: 'Unable to fetch data', settings: {} })
        //     } else {
        //         var settings = docdata.settings;
        //         var server_offset = (new Date).getTimezoneOffset();
        //         settings.offset = server_offset;
        //         var jstz = require('jstimezonedetect');
        //         var server_time_zone = jstz.determine().name();
        //         settings.server_time_zone = server_time_zone;
        //         settings.with_otp = settings.with_otp ? settings.with_otp : 1;
        //         settings.with_password = settings.with_password ? settings.with_password : 0;
        //         var data = {};
        //         data.err = 0;
        //         data.message = "";
        //         data.settings = settings;
        //         res.send(data);
        //     }
        // });
    }
    // controller.shippingManagement = function (req, res) {

    //     try {

    //         // if (errors) {
    //         //     res.send(errors, 400);
    //         //     return;
    //         // }
    //         let { price_list } = req.body
    //         console.log(price_list)
    //         // price_list

    //         let data = {};
    //             data.price = price_list;
    //         // data.code = req.body.code;
    //         // data.symbol = req.body.symbol;
    //         // data.value = req.body.value;

    //         if (req.body._id) {
    //             data.featured = req.body.featured;
    //             data.status = req.body.status;
    //             db.UpdateDocument('shipping', { _id: req.body._id }, data, function (err, data) {
    //                 if (err) { res.send(err); } else {
    //                     // data.method = 'edit';
    //                     // res.send(data);
    //                     return res.send({ status: true, message: "Updated Successfully" });
    //                 }
    //             });
    //         } else {

    //             db.InsertDocument('shipping', data, function (err, data) {
    //                 //    console.log(err, data)
    //                 if (err || data.nModified == 0) { res.send(err); } else {
    //                     // res.send(data);
    //                     return res.send({ status: true, message: "Added Successfully" });
    //                 }
    //             });
    //         }
    //     } catch (error) {
    //         console.log(error, "error");
    //         res.status(500).send({message:"somthing went wrong",status:false})
    //     }
    // }
    controller.shippingManagement = async (req, res) => {
        try {
            let { price_list, _id ,kilos,constAmount} = req.body;
            let data = {};
            data.price = price_list;
            data.kilogram = kilos
            data.constAmount = constAmount

            if (_id && _id != undefined) {
                // data.featured = req.body.featured;
                // data.status = req.body.status;
                // {$set:{"size": size}},
                let check =   await db.GetDocument('shipping', { _id : new mongoose.Types.ObjectId(_id) },{},{})
                console.log(check,'check');
                
                let UpdateDoc = await db.UpdateDocument('shipping', { _id :new mongoose.Types.ObjectId(_id) }, { $set: { "price": price_list ,"kilogram" : kilos ,"constAmount" : constAmount} },{})
                // let UpdateDoc = await shipping.findByIdAndUpdate(
                //     { "_id": req.body._id },
                //     { $set: { "price": price_list } }
                //   );
                  
                console.log(UpdateDoc, "docdatadocdata");

                if (!UpdateDoc) {
                    return res.send({ status: false, message: "Something went wrong" });
                } else {
                    return res.send({ status: true, message: "Updated Successfully" });

                }


                // db.UpdateDocument('shipping', { _id: req.body._id }, data, function (err, updateResult) {
                //     if (err) {
                //         res.status(500).send(err);
                //     } else {
                //         return res.send({ status: true, message: "Updated Successfully" });
                //     }
                // });
            } else {
                console.log("shippppp111111", data);
                var docdata = await db.InsertDocument('shipping', data)

                console.log(docdata, "docdatadocdata");

                if (!docdata) {
                    return res.send({ status: false, message: "Something went wrong" });
                } else {
                    return res.send({ status: true, message: "Added Successfully" });

                }
                // db.InsertDocument('shipping', data, function (err, insertResult) {
                //     console.log("shippppp22222");

                //     if (err || !insertResult) {
                //         res.status(500).send(err);
                //     } else {
                //         return res.send({ status: true, message: "Added Successfully" });
                //     }
                // });
            }
        } catch (error) {
            console.log(error,"errorerrorerror");
            
            res.send({ message: "Something went wrong", status: false });
        }
    }

    controller.getshippingManagement = async (req, res) => {
        // if (req.body) {
        // req.checkBody('id', 'Invalid id').notEmpty();
        // var errors = req.validationErrors();
        // if (errors) {
        //     res.send(errors, 400);
        //     return;
        // }
        try {
            var docdata = await db.GetOneDocument('shipping', {}, {}, {})

            console.log(docdata, "docdatadocdata");

            if (!docdata) {
                res.send({ err: 1, message: 'Unable to fetch data', data: {} })
            } else {
                res.send({ err: 0, message: 'fetch data', data: { docdata } })

            }

        } catch (error) {
            console.log(error, "error");

        }
        // db.GetOneDocument('shipping', function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         return res.send(docdata);
        //     }
        // });
        // }
    }

    return controller;
}