var db = require('../../controller/adaptor/mongodb.js');
var attachment = require('../../model/attachments.js');
var middlewares = require('../../model/middlewares.js');
var async = require('async');
var mongoose = require('mongoose');
var mailcontent = require('../../model/mailcontent.js');


module.exports = function () {

    var router = {};
    // get main data updated 
    router.getMainData = async function (req, res) {//---
        var data = {};
        const settings = db.GetDocument('settings', { alias: { $in: ['general', 'seo', 'social_networks', 'widgets', 'pages_category'] } }, {}, {})
        const languages = db.GetDocument('languages', { 'status': 1 }, {}, {})
        const images = db.GetDocument('images', { imagefor: { $in: ['loginpage', 'taskersignup', 'backgroundimage', 'taskerprofile', 'adminlogin'] } }, {}, {})
        const social = db.GetDocument('settings', { 'alias': 'social_networks' }, {}, {})
        const footer_content = db.GetDocument('pages', { 'name': 'footery' }, {}, {})
        var dataQuery = [
            { "$match": { "alias": 'pages_category', "settings.name": { $exists: true } } },
            { $unwind: { path: "$settings", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'pages', localField: "settings.name", foreignField: "category", as: "categoryname" } },
            { $project: { categoryname: { $filter: { input: "$categoryname", as: "categoryna", cond: { $eq: ["$$categoryna.status", 1] } } }, settings: 1 } }
        ];
        sorting = {};
        sorting['settings.position'] = 1;
        dataQuery.push({ $sort: sorting });
        const pages = db.GetAggregation('settings', dataQuery)
        Promise.all([settings, languages, images, social, footer_content, pages])
            .then(([settings, languages, images, social, footer_content, pages]) => {
                const data = { response: [] };
                data.response.push({ 'settings': settings.doc[0].settings });
                data.response.push({ 'seo': settings.doc[1].settings });
                data.response.push({ 'social': settings.doc[2].settings });
                data.response.push({ 'languages': languages.doc.languages });
                data.response.push({ 'widgets': settings.doc[3].settings });
                data.response.push({ 'images': images.doc.images });
                data.response.push({ 'currencies': {} });
                data.response.push({ 'social_2': social.doc.social });
                data.response.push({ 'pages': pages.pages });
                data.response.push({ 'footer_content': footer_content.doc.footer_content });
                res.send(data);
            })
            .catch((error) => {
                console.error('Promise.all Error:', error);
                res.status(500).send('Internal Server Error');
            });
        // async.parallel({
        //     settings: function (callback) {
        //         db.GetDocument('settings', { alias: { $in: ['general', 'seo', 'social_networks', 'widgets', 'pages_category'] } }, {}, {}, function (err, settings) {
        //             callback(err, settings);
        //         });
        //     },
        //     languages: function (callback) {
        //         db.GetDocument('languages', { 'status': 1 }, {}, {}, function (err, languages) {
        //             callback(err, languages);
        //         });
        //     },
        //     images: function (callback) {
        //         db.GetDocument('images', { imagefor: { $in: ['loginpage', 'taskersignup', 'backgroundimage', 'taskerprofile', 'adminlogin'] } }, {}, {}, function (err, images) {
        //             callback(err, images);
        //         });
        //     },
        //     social: function (callback) {
        //         db.GetDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, social) {
        //             callback(err, social);
        //         });
        //     },
        //     footer_content: function (callback) {
        //         db.GetDocument('pages', { 'name': 'footery' }, {}, {}, function (err, footer_content) {
        //             callback(err, footer_content);
        //         });
        //     },
        //     pages: function (callback) {
        //         var dataQuery = [
        //             { "$match": { "alias": 'pages_category', "settings.name": { $exists: true } } },
        //             { $unwind: { path: "$settings", preserveNullAndEmptyArrays: true } },
        //             { $lookup: { from: 'pages', localField: "settings.name", foreignField: "category", as: "categoryname" } },
        //             { $project: { categoryname: { $filter: { input: "$categoryname", as: "categoryna", cond: { $eq: ["$$categoryna.status", 1] } } }, settings: 1 } }
        //         ];
        //         sorting = {};
        //         sorting['settings.position'] = 1;
        //         dataQuery.push({ $sort: sorting });

        //         db.GetAggregation('settings', dataQuery, function (err, pages) {
        //             callback(err, pages);
        //         });
        //     }
        // }, function (err, result) {
        //     if (err || !result) {
        //         data.response = 'No Data';
        //         res.send(data);
        //     } else {

        //         /*var arrList = [];
        //         if (result.social) {
        //             for (i in result.social) {
        //                 if (result.social[i].settings.link.status == 1) {
        //                     arrList.push(result.social[i].settings.link)
        //                 }
        //             }
        //         }*/
        //         data.response = [];
        //         data.response.push({ 'settings': result.settings[0].settings });
        //         data.response.push({ 'seo': result.settings[1].settings });
        //         data.response.push({ 'social': result.settings[2].settings });
        //         data.response.push({ 'languages': result.languages });
        //         data.response.push({ 'widgets': result.settings[3].settings });
        //         data.response.push({ 'images': result.images });
        //         data.response.push({ 'currencies': {} });
        //         data.response.push({ 'social_2': result.social });
        //         data.response.push({ 'pages': result.pages });
        //         data.response.push({ 'footer_content': result.footer_content });
        //         var CircularJSON = require('circular-json');
        //         var json = CircularJSON.stringify(data);
        //         res.send(json);
        //     }
        // });
    }

    router.getWidgets = function (req, res) {
        db.GetDocument('settings', {}, { widgets: 1, social_networks: 1, general: 1 }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata[0]);
            }
        });
    }
    router.getlandingdata = function (req, res) {//--
        var data = {};

        let ActiveCategory = db.GetDocument('category', { 'status': 1, 'parent': { $exists: false } }, {}, { sort: { name: 1 } })
        if (ActiveCategory.status) {
            var category = [];
            if (ActiveCategory.doc.length < 9) {
                for (var i = 0; i < provider.length; i++) {
                    category.push(ActiveCategory.doc[i])
                }
            }
            else {
                for (var i = 0; i < 9; i++) {
                    category.push(ActiveCategory.doc[i])
                }
            }
            ActiveCategory = category;
            console.log(ActiveCategory, 'Activate category');
        }
        const Categorylength = db.GetDocument('category', { 'status': 1, 'parent': { $exists: false } }, {}, { sort: { name: 1 } })
        const Postheader = db.GetDocument('postheader', { 'status': 1 }, {}, {})
        const Settings = db.GetOneDocument('settings', { alias: 'general' }, {}, {})
        const slider = db.GetDocument('slider', { status: 1 }, {}, {})

        Promise.all([ActiveCategory, Categorylength, Postheader, Settings, slider])
            .then(([ActiveCategory, Categorylength, Postheader, Settings, slider]) => {
                const data = { response: [] };
                data.response.push({ 'ActiveCategory': ActiveCategory.doc });
                data.response.push({ 'PostHeader': Postheader.doc });
                data.response.push({ 'Settings': Settings.doc });
                data.response.push({ 'slider': slider.doc });
                data.response.push({ 'Category': Categorylength.doc });
                res.send(data);
            })
            .catch((error) => {
                console.error('Promise.all Error:', error);
                res.status(500).send('Internal Server Error');
            });

        // async.parallel({
        //     ActiveCategory: function (callback) {
        //         db.GetDocument('category', { 'status': 1, 'parent': { $exists: false } }, {}, { sort: { name: 1 } }, function (err, provider) {
        //             if (err) {
        //                 callback(err, provider);
        //             } else {
        //                 var category = [];
        //                 if (provider.length < 9) {
        //                     for (var i = 0; i < provider.length; i++) {
        //                         category.push(provider[i])
        //                     }
        //                 }
        //                 else {
        //                     for (var i = 0; i < 9; i++) {
        //                         category.push(provider[i])
        //                     }

        //                 }
        //                 callback(err, category);
        //             }
        //         });
        //     },
        //     Categorylength: function (callback) {
        //         db.GetDocument('category', { 'status': 1, 'parent': { $exists: false } }, {}, { sort: { name: 1 } }, function (err, categorylength) {
        //             if (err) {
        //                 callback(err, categorylength);
        //             } else {

        //                 callback(err, categorylength);
        //             }
        //         });
        //     },
        //     Postheader: function (callback) {
        //         db.GetDocument('postheader', { 'status': 1 }, {}, {}, function (err, postheader) {
        //             callback(err, postheader);
        //         });
        //     },
        //     Settings: function (callback) {
        //         db.GetOneDocument('settings', { alias: 'general' }, {}, {}, function (err, settings) {
        //             callback(err, settings);
        //         });
        //     },
        //     slider: function (callback) {
        //         db.GetDocument('slider', { status: 1 }, {}, {}, function (err, settings) {
        //             callback(err, settings);
        //         });
        //     }
        // }, function (err, result) {
        //     if (err || !result) {
        //         data.response = 'No Data';
        //         res.send(data);
        //     } else {
        //         data.response = [];
        //         data.response.push({ 'ActiveCategory': result.ActiveCategory });
        //         data.response.push({ 'PostHeader': result.Postheader });
        //         data.response.push({ 'Settings': result.Settings });
        //         data.response.push({ 'slider': result.slider });
        //         data.response.push({ 'Category': result.Categorylength });
        //         res.send(data);
        //     }
        // });
    }




    router.list = function (req, res) {//----

        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }
        var bannerQuery = [{
            "$match": { status: 1 }
        }, {
            $project: {
                name: 1,
                image: 1,
                status: 1,
                description: 1,
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

        var sorting = {};
        var searchs = '';

        var condition = { status: 1 };

        if (Object.keys(req.query).length != 0) {
            bannerQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['name'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                bannerQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    bannerQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    bannerQuery.push({ $sort: sorting });
                }
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                bannerQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }
            bannerQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }


        db.GetAggregation('slider', bannerQuery, function (err, docdata) {
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



    router.getTransalatePage = function (req, res) {//--
        const languagedata = db.GetDocument('languages', { 'status': 1 }, {}, {})
        if (languagedata.status === false) {
            res.send(languagedata.doc);
        } else {
            for (var i = 0; i < languagedata.doc.length; i++) {
                if (languagedata[i].name == req.body.language) {
                    var matchlanguage = languagedata[i]._id;
                }
            }
            const pagedata = db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { parent: new mongoose.Types.ObjectId(req.body.page) }, { language: new mongoose.Types.ObjectId(matchlanguage) }] }, {}, {})
            if (pagedata.doc.length == 0) {
                const pagedata = db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { _id: new mongoose.Types.ObjectId(req.body.page) }] }, {}, {})
                if (pagedata.doc.length == 0) {
                    res.send(err)
                } else {
                    res.send(pagedata.doc);
                }
            }
            else {
                res.send(pagedata);
            }
        }
        // db.GetDocument('languages', { 'status': 1 }, {}, {}, function (err, languagedata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         for (var i = 0; i < languagedata.length; i++) {
        //             if (languagedata[i].name == req.body.language) {
        //                 var matchlanguage = languagedata[i]._id;
        //             }
        //         }
        //         db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { parent: new mongoose.Types.ObjectId(req.body.page) }, { language: new mongoose.Types.ObjectId(matchlanguage) }] }, {}, {}, function (err, pagedata) {
        //             if (err || pagedata.length == 0) {
        //                 db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { _id: new mongoose.Types.ObjectId(req.body.page) }] }, {}, {}, function (err, pagedata) {
        //                     if (err || pagedata.length == 0) {
        //                         res.send(err)
        //                     } else {
        //                         res.send(pagedata);
        //                     }
        //                 });
        //             } else {
        //                 res.send(pagedata);
        //             }
        //         });

        //     }

        // });
    }

    router.getDefaultLanguage = async function (req, res) {//---
        var query = {};
        if (req.query.name == 'undefined' || req.query.name == '') {
            query = { 'status': 1, default: 1 };
        } else {
            query = { 'status': 1, 'name': req.query.name };
        }
        const docdata = await db.GetDocument('languages', query, {}, {})
        if (docdata.status) {
            res.send(docdata.doc);
        } else {
            res.send(docdata.doc);
        }
        // db.GetDocument('languages', query, {}, {}, function (err, docdata) {
        //     if (err) {
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }

    router.getDefaultCurrency = async function (req, res) {//--
        var query = {};
        if (req.query.name == 'undefined' || req.query.name == '') {
            query = { 'status': 1, default: 1 };

        } else {
            query = { 'status': 1, 'name': req.query.name };

        }
        docdata = await db.GetDocument('currencies', query, {}, {})
        if (docdata.status) {
            res.send(docdata.doc);
        } else {
            res.send(docdata.doc);
        }
        // db.GetDocument('currencies', query, {}, {}, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docdata);
        //     }
        // });
    }


    router.subscription = function (req, res) {
        db.GetOneDocument('newsletter', { 'email': req.body.email }, {}, {}, function (err, user) {
            if (err) {
                res.send(err);
            } else {
                if (user) {
                    res.status(400).send({ message: 'Email Already Subscribed' });
                }
                else {
                    db.InsertDocument('newsletter', { 'email': req.body.email, 'status': "1" }, function (err, result) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(result);
                            var mailData = {};
                            mailData.template = 'subscription';
                            mailData.to = req.body.email;
                            mailData.html = [];
                            //mailData.html.push({ name: 'email', value: req.body.email });
                            mailcontent.sendmail(mailData, function (err, response) { });
                        }
                    });
                }
            }
        });
    }

    router.settingsDetails = async (req, res) => {
        try {
            const docdata = await db.GetOneDocument('settings', { alias: 'general' }, { 
                'settings.currency_code': 1,
                'settings.wallet': 1,
                'settings.currency_symbol': 1,
                'settings.site_publish': 1,
                'settings.date_format': 1,
                'settings.time_format': 1,
                'settings.time_zone': 1,
                'settings.time_zone_value': 1,
                'settings.with_otp': 1,
                'settings.with_password': 1,
                'settings.email_address': 1,
                'settings.phone': 1,
                'settings.shipping_banner': 1,
                'settings.allcat_banner': 1
            }, {});
            console.log(docdata,'docadataaaaaaaaasa');
            if(docdata.status===false){
                    res.send({ err: 1, message: 'Unable to fetch data', settings: {} })
            }else{
                console.log("hiiii");
                var settings = docdata.doc.settings;
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
                    console.log(data,'data...');
                    res.send(data);
            }
            // Use docdata for further processing
        } catch (error) {
            console.error('Error:', error);
            // Handle the error
        }
        
  
        // db.GetOneDocument('settings', { alias: 'general' }, { 'settings.currency_code': 1, 'settings.wallet': 1, 'settings.currency_symbol': 1, 'settings.site_publish': 1, 'settings.date_format': 1, 'settings.time_format': 1, 'settings.time_zone': 1, 'settings.time_zone_value': 1, 'settings.with_otp': 1, 'settings.with_password': 1, 'settings.email_address': 1, 'settings.phone': 1 }, {}, function (err, docdata) {
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

    return router;
};
