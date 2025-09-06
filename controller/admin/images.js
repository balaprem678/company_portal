//"use strict";
module.exports = function() {
    var db = require('../../controller/adaptor/mongodb.js'),
        CONFIG = require('../../config/config');
    var attachment = require('../../model/attachments.js');
    var controller = {};

    controller.list = function(req, res) {
        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }
        var imagesQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                imagefor: 1,
                image: 1,
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

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.query).length != 0) {
            imagesQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['imagefor'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                imagesQuery.push({ "$match": { "documentData.imagefor": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    imagesQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    imagesQuery.push({ $sort: sorting });
                }
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                imagesQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }
            imagesQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('images', imagesQuery, function(err, docdata) {

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

    controller.edit = function(req, res) {
        db.GetDocument('images', { _id: req.body.id }, {}, {}, function(err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data);
            }
        });
    }

    controller.save = function(req, res) {
        var data = {};
        data.status = 1;
        var data1 = {};
        var data1 = { settings: { admin: { colors: {} } } };
        data1.settings.admin.colors.header = req.body.header;
        data1.settings.admin.colors.branding = req.body.branding;
        data1.settings.admin.colors.sidebar = req.body.sidebar;
        data1.settings.admin.colors.active = req.body.active;
        data1.settings.admin.fixed_header = req.body.fixedheader;
        data1.settings.admin.fixed_aside = req.body.fixedaside;

        if (typeof req.files.backgroundimage != 'undefined') {
            if (req.files.backgroundimage.length > 0) {
                data.image = attachment.get_attachment(req.files.backgroundimage[0].destination, req.files.backgroundimage[0].filename);
                data.img_name = encodeURI(req.files.backgroundimage[0].filename);
                data.img_path = req.files.backgroundimage[0].destination.substring(2);
            }
            db.GetOneDocument('images', { 'imagefor': 'backgroundimage' }, {}, {}, function(err, backgroundimage) {
                if (err) {
                    res.send(err);
                } else {
                    if (backgroundimage && typeof backgroundimage._id != 'undefined') {
                        db.UpdateDocument('images', { 'imagefor': 'backgroundimage' }, data, function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                // res.send(result);
                            }
                        });
                    } else {
                        var insertDate = { status: data.status, image: data.image, img_name: data.img_name, img_path: data.img_path, imagefor: 'backgroundimage' };
                        db.InsertDocument('images', insertDate, function(err, res) {})
                    }
                }
            })
        }
        if (typeof req.files.sitelanding != 'undefined') {
            var sitelanding_data = {};
            sitelanding_data.status = 1;
            if (req.files.sitelanding.length > 0) {
                sitelanding_data.image = attachment.get_attachment(req.files.sitelanding[0].destination, req.files.sitelanding[0].filename);
                sitelanding_data.img_name = encodeURI(req.files.sitelanding[0].filename);
                sitelanding_data.img_path = req.files.sitelanding[0].destination.substring(2);
            }
            db.GetOneDocument('images', { 'imagefor': 'sitelanding' }, {}, {}, function(err, sitelanding) {
                if (err) {
                    res.send(err);
                } else {
                    if (sitelanding && typeof sitelanding._id != 'undefined') {
                        db.UpdateDocument('images', { 'imagefor': 'sitelanding' }, sitelanding_data, function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {}
                        });
                    } else {
                        var insertDate = { status: sitelanding_data.status, image: sitelanding_data.image, img_name: sitelanding_data.img_name, img_path: sitelanding_data.img_path, imagefor: 'sitelanding' };
                        db.InsertDocument('images', insertDate, function(err, res) {})
                    }
                }
            })
        }
        if (typeof req.files.taskersignup != 'undefined') {
            var taskersignup_data = {};
            taskersignup_data.status = 1;
            if (req.files.taskersignup.length > 0) {
                taskersignup_data.image = attachment.get_attachment(req.files.taskersignup[0].destination, req.files.taskersignup[0].filename);
                taskersignup_data.img_name = encodeURI(req.files.taskersignup[0].filename);
                taskersignup_data.img_path = req.files.taskersignup[0].destination.substring(2);
            }
            db.GetOneDocument('images', { 'imagefor': 'taskersignup' }, {}, {}, function(err, taskersignup) {
                if (err) {
                    res.send(err);
                } else {
                    if (taskersignup && typeof taskersignup._id != 'undefined') {
                        db.UpdateDocument('images', { 'imagefor': 'taskersignup' }, taskersignup_data, function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                // res.send(result);
                            }
                        });
                    } else {
                        var insertDate = { status: taskersignup_data.status, image: taskersignup_data.image, img_name: taskersignup_data.img_name, img_path: taskersignup_data.img_path, imagefor: 'taskersignup' };
                        db.InsertDocument('images', insertDate, function(err, res) {})
                    }
                }
            })
        }
        if (typeof req.files.adminlogin != 'undefined') {
            var adminlogin_data = {};
            adminlogin_data.status = 1;
            if (req.files.adminlogin.length > 0) {
                adminlogin_data.image = attachment.get_attachment(req.files.adminlogin[0].destination, req.files.adminlogin[0].filename);
                adminlogin_data.img_name = encodeURI(req.files.adminlogin[0].filename);
                adminlogin_data.img_path = req.files.adminlogin[0].destination.substring(2);
            }
            db.GetOneDocument('images', { 'imagefor': 'adminlogin' }, {}, {}, function(err, adminlogin) {
                if (err) {
                    res.send(err);
                } else {
                    if (adminlogin && typeof adminlogin._id != 'undefined') {
                        db.UpdateDocument('images', { 'imagefor': 'adminlogin' }, adminlogin_data, function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {}
                        });
                    } else {
                        var insertDate = { status: adminlogin_data.status, image: adminlogin_data.image, img_name: adminlogin_data.img_name, img_path: adminlogin_data.img_path, imagefor: 'adminlogin' };
                        db.InsertDocument('images', insertDate, function(err, res) {})
                    }
                }
            })
        }
        if (typeof req.files.loginpage != 'undefined') {
            var loginpage_data = {};
            loginpage_data.status = 1;
            if (req.files.loginpage.length > 0) {
                loginpage_data.image = attachment.get_attachment(req.files.loginpage[0].destination, req.files.loginpage[0].filename);
                loginpage_data.img_name = encodeURI(req.files.loginpage[0].filename);
                loginpage_data.img_path = req.files.loginpage[0].destination.substring(2);
            }
            db.GetOneDocument('images', { 'imagefor': 'loginpage' }, {}, {}, function(err, loginpage) {
                if (err) {
                    res.send(err);
                } else {
                    if (loginpage && typeof loginpage._id != 'undefined') {
                        db.UpdateDocument('images', { 'imagefor': 'loginpage' }, loginpage_data, function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                // res.send(result);
                            }
                        });
                    } else {
                        var insertDate = { status: loginpage_data.status, image: loginpage_data.image, img_name: loginpage_data.img_name, img_path: loginpage_data.img_path, imagefor: 'loginpage' };
                        db.InsertDocument('images', insertDate, function(err, res) {})
                    }
                }
            })
        }
        if (typeof req.files.taskerprofile != 'undefined') {
            if (req.files.taskerprofile.length > 0) {
                data.image = attachment.get_attachment(req.files.taskerprofile[0].destination, req.files.taskerprofile[0].filename);
                data.img_name = encodeURI(req.files.taskerprofile[0].filename);
                data.img_path = req.files.taskerprofile[0].destination.substring(2);
            }
            db.GetOneDocument('images', { 'imagefor': 'taskerprofile' }, {}, {}, function(err, taskerprofile) {
                if (err) {
                    res.send(err);
                } else {
                    if (taskerprofile && typeof taskerprofile._id != 'undefined') {
                        db.UpdateDocument('images', { 'imagefor': 'taskerprofile' }, data, function(err, result) {
                            if (err) {
                                res.send(err);
                            } else {}
                        });
                    } else {
                        var insertDate = { status: data.status, image: data.image, img_name: data.img_name, img_path: data.img_path, imagefor: 'taskerprofile' };
                        db.InsertDocument('images', insertDate, function(err, res) {})
                    }
                }
            })
        }
        db.UpdateDocument('settings', { "alias": "appearance" }, data1, { upsert: true }, function(err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    controller.fixedHeaderSave = function(req, res) {
        var data = req.body.checkedvalue;
        if (req.body.checkedvalue == true) {
            data = "true";
        } else {
            data = "false";
        }
        db.UpdateDocument('settings', { "alias": "appearance" }, { 'settings.admin.fixed_header': data }, { upsert: true }, function(err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });

    }

    controller.fixedAsideSave = function(req, res) {
        var data = req.body.checkedvalue;
        if (req.body.checkedvalue == true) {
            data = "true";
        } else {
            data = "false";
        }
        db.UpdateDocument('settings', { "alias": "appearance" }, { 'settings.admin.fixed_aside': data }, { upsert: true }, function(err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });

    }


    controller.deleteimages = function(req, res) {

        req.checkBody('delData', 'Invalid images delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        db.UpdateDocument('images', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function(err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }


    controller.getImage = function(req, res) {
        db.GetDocument('images', { 'status': 1 }, {}, {}, function(err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data);

            }
        });

    }

    controller.getappearance = function(req, res) {
        db.GetDocument('settings', { alias: "appearance" }, {}, {}, function(err, docdata) {
            if (err) {
                res.send(err);
            } else {
                //console.log("docdata/////////////////////",docdata);
                res.send(docdata[0].settings);
            }
        });
    }

    return controller;
}