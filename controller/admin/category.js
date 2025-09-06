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

    router.catList = function (req, res) {

        var regid = req.query.id;
        var matchQuery = {
            "status": 1
        }
        var doc = [];
        if (!regid || regid == 'null') {
            res.send(doc);
        } else {
            matchQuery.parent = new mongoose.Types.ObjectId(regid)
            var subCategoryQuery = [{ "$match": matchQuery },
            { $project: { 'name': 1, 'parent': 1 } }];
            db.GetAggregation('category', subCategoryQuery, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                    // console.log('>>>>>>>>>>>>>>>>>>>', docdata)
                }
            });
        }
    }

    router.categoryList = function (req, res) {
        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }

        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                name: 1,
                avatar: 1,
                position: 1,
                parent: 1,
                sub_category: 1,
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
        db.GetAggregation('category', categoryQuery, function (err, docdata) {
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

    router.catEdit = function (req, res) {
        db.GetDocument('category', { '_id': req.body.id }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.catDelete = function (req, res) {
        db.DeleteDocument('category', { '_id': { $in: req.body.delData } }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }


    router.catSave = function (req, res) {
        var data = {
            seo: {}
        };
        var recommended = 0;
        data.name = req.body.value.name;
        data.slug = req.body.value.slug;
        //data.position = req.body.value.position;
        data.position = 2;
        data.status = req.body.value.status;
        data.parent = req.body.value.parent;
        data.description = req.body.value.description;
        var tempancestors = req.body.value.mainParent;
        data.avatarBase64 = req.body.value.avatarBase64;
        data.mainparent = 'no';
        var parent = req.body.value.mainParent;
        if (!parent) {
            data.mainparent = 'yes';
            data.position = 1; //using this position in admin pannel
            if (data.name == 'Recommended') {
                recommended = 1;
            }
        }
        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_CATEGORIES + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.avatar = attachment.get_attachment(CONFIG.DIRECTORY_CATEGORIES, fileName);
            data.img_name = encodeURI(fileName);
            data.img_path = CONFIG.DIRECTORY_CATEGORIES.substring(2);
        }

        if (req.body.value.seo) {
            data.seo.title = req.body.value.seo.title;
            data.seo.keyword = req.body.value.seo.keyword;
            data.seo.description = req.body.value.seo.description;
        }
        // console.log('recommended', recommended)
        if (recommended == 1) {
            res.status(400).send({ message: "Category already added" });
        }
        else {
            if (req.body.value._id) {
                if (req.body.anscestor) {
                    data.ancestors = req.body.anscestor;
                }
                db.UpdateDocument('category', { '_id': req.body.value._id }, data, function (err, result) {
                    if (err) {
                        res.send(err);
                    } else {
                        db.UpdateDocument('category', { '_id': req.body.value._id }, { $push: { 'ancestors': tempancestors } }, function (err, anfftresult) {
                        });
                        res.send(result);
                    }
                });
            } else {
                data.ancestors = req.body.anscestor;
                data.status = 1;
                db.InsertDocument('category', data, function (err, result) {
                    if (err) {
                        res.send(err);
                    } else {
                        db.UpdateDocument('category', { '_id': result._id }, { $push: { 'ancestors': tempancestors } }, function (err, antresult) {
                        });
                        res.send(result);
                    }
                });
            }
        }
    }


    router.getSetting = function (req, res) {
        db.GetDocument('settings', { alias: 'general' }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.getCurrencies = function (req, res) {
        db.GetOneDocument('currencies', { 'default': 1 }, {}, {}, function (err, currencies) {
            if (err) {
                res.send(err);
            } else {
                res.send(currencies);
            }
        });
    };


    router.getMaincuisineList = function (req, res) {
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                name: 1,
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

        if (Object.keys(req.body).length != 0) {
            categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                //condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
                searchs = req.body.search;
                categoryQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
                //search limit
                categoryQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
                categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
                if (req.body.limit && req.body.skip >= 0) {
                    categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
                }
                categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
                //search limit
            }


            var sorting = {};
            if (req.body.sort) {
                var sorter = 'documentData.' + req.body.sort.field;
                sorting[sorter] = req.body.sort.order;
                categoryQuery.push({ $sort: sorting });
            } else {
                sorting["documentData.createdAt"] = -1;
                categoryQuery.push({ $sort: sorting });
            }

            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            //categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
            if (!req.body.search) {
                categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
            }
        }

        db.GetAggregation('cuisine', categoryQuery, function (err, docdata) {
            //console.log('docdata[0].documentData', docdata)
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

    router.saveCuisine = function (req, res) {
        var data = {};
        data.name = req.body.name;
        data.status = req.body.status;
        data.parent = req.body.parent;
        data.avatarBase64 = req.body.avatarBase64;
        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_USERS + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.image = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
            data.img_name = encodeURI(fileName);
            data.img_path = CONFIG.DIRECTORY_USERS.substring(2);
        }
        if (req.body._id) {
            db.UpdateDocument('cuisine', { _id: req.body._id }, data, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    db.GetOneDocument('cuisine', { '_id': req.body._id }, {}, {}, function (err, getCousine) {
                        if (getCousine && typeof getCousine._id != 'undefined') {
                            if (typeof getCousine.status != 'undefined' && getCousine.status != 1) {
                                var condition = { main_cuisine: { $elemMatch: { _id: getCousine._id } } };
                                var update_data = { "$pull": { 'main_cuisine': { _id: { $in: [getCousine._id] } } } };
                                db.UpdateDocument('restaurant', condition, update_data, { multi: true }, function (err, response) {
                                });
                            }
                        }
                    });
                    res.send(docdata);
                }
            });
        } else {
            db.InsertDocument('cuisine', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        }
    }


    router.getCuision = function (req, res) {
        var data = {};
        data.name = req.body.name;
        data.status = req.body.status;
        db.GetOneDocument('cuisine', { '_id': req.body.id }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    /*  router.deleteMaincuisine = function (req, res) {
          console.log(req.body.delData);
          req.checkBody('delData', 'Invalid delData').notEmpty();
          var errors = req.validationErrors();
          if (errors) {
              res.send(errors, 400);
              return;
          }
          var response = [];
          var func = (x, cb) => {
              db.UpdateDocument('cuisine', { _id: new mongoose.Types.ObjectId(x) }, { status: 0 }, {}, function (err, docdata) {
                  if (err) {
                      cb(null)
                  } else {
                      response.push(docdata);
                      cb(null);
                  }
              });
          }
          async.eachSeries(req.body.delData, func, (err, ress) => {
              if (err) {
                  res.send(err);
              }
              else {
                  res.send(response);
              }
          })
      }
  */

    router.deleteMaincuisine = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        var each = require('sync-each');
        if (typeof req.body.delData != 'undefined' && typeof req.body.delData != 'string') {
            each(req.body.delData, function (item, next) {
                db.GetOneDocument('cuisine', { '_id': item }, {}, {}, function (err, getCousine) {
                    if (getCousine && typeof getCousine._id != 'undefined') {
                        var condition = { main_cuisine: { $elemMatch: { _id: getCousine._id } } };
                        var update_data = { "$pull": { 'main_cuisine': { _id: { $in: [getCousine._id] } } } };
                        db.UpdateDocument('restaurant', condition, update_data, { multi: true }, function (err, response) {

                        });
                        next();
                    } else {
                        next();
                    }
                });
            }, function (err, trans) {
                db.DeleteDocument('cuisine', { _id: { $in: req.body.delData } }, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            });
        } else {
            db.GetOneDocument('cuisine', { _id: { $in: req.body.delData } }, {}, {}, function (err, getCousine) {
                if (getCousine && typeof getCousine._id != 'undefined') {
                    var condition = { main_cuisine: { $elemMatch: { _id: getCousine._id } } };
                    var update_data = { "$pull": { 'main_cuisine': { _id: { $in: [getCousine._id] } } } };
                    db.UpdateDocument('restaurant', condition, update_data, { multi: true }, function (err, response) {
                    });
                }
                db.DeleteDocument('cuisine', { _id: { $in: req.body.delData } }, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            });
        }
    };

    router.deleteSubcuisine = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('cuisine', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var each = require('sync-each');
                if (typeof req.body.delData != 'undefined' && typeof req.body.delData != 'string') {
                    each(req.body.delData, function (item, next) {
                        db.GetOneDocument('cuisine', { '_id': item }, {}, {}, function (err, getCousine) {
                            if (getCousine && typeof getCousine._id != 'undefined') {
                                var condition = { main_cuisine: { $elemMatch: { _id: getCousine._id } } };
                                var update_data = { "$pull": { 'main_cuisine': { _id: { $in: [getCousine._id] } } } };
                                db.UpdateDocument('restaurant', condition, update_data, { multi: true }, function (err, response) {

                                });
                                next();
                            } else {
                                next();
                            }
                        });
                    }, function (err, trans) {
                    });
                } else {
                    db.GetOneDocument('cuisine', { _id: { $in: req.body.delData } }, {}, {}, function (err, getCousine) {
                        if (getCousine && typeof getCousine._id != 'undefined') {
                            var condition = { main_cuisine: { $elemMatch: { _id: getCousine._id } } };
                            var update_data = { "$pull": { 'main_cuisine': { _id: { $in: [getCousine._id] } } } };
                            db.UpdateDocument('restaurant', condition, update_data, { multi: true }, function (err, response) {
                            });
                        }
                    })
                }
                res.send(docdata);
            }
        });
    };


    /* router.deleteSubcuisine = function (req, res) {
            db.UpdateDocument('cuisine', { _id: req.body.delData }, { status: 0 }, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    */

    router.getSubCuisine = function (req, res) {
        if (req.body.id) {
            var options = {};
            options.populate = 'parent_id'
            db.GetOneDocument('cuisine', { _id: req.body.id }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    db.GetDocument('cuisine', { 'parent': 'yes' }, { name: 1 }, {}, function (err, parent_data) {
                        if (err) {
                            res.send(err);
                        } else {
                            if (docdata) { res.send([docdata, parent_data]); }
                            else { res.send([0, parent_data]); }
                        }
                    });
                }
            });
        } else {
            db.GetDocument('cuisine', { 'parent': 'yes' }, { name: 1 }, {}, function (err, parent_data) {
                if (err) {
                    res.send(err);
                } else {
                    res.send([0, parent_data]);
                }
            });
        }
    }


    router.saveSubCuisine = function (req, res) {
        var data = {};
        data.name = req.body.name;
        data.status = req.body.status;
        data.parent = req.body.parent;
        data.parent_id = req.body.parent_id;
        if (req.body._id) {
            db.UpdateDocument('cuisine', { _id: req.body._id }, data, { multi: true }, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        } else {
            db.InsertDocument('cuisine', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        }
    }

    router.getSubcuisineList = function (req, res) {
        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 }, parent: 'no' }
        },
        { "$lookup": { from: "cuisine", localField: "parent_id", foreignField: "_id", as: "cuisine_parent" } },
        {
            $project: {
                name: 1,
                cuisine_parent: 1,
                status: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                name: 1,
                cuisine_parent: 1,
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
                //search limit
                categoryQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
                categoryQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
                if (req.body.limit && req.body.skip >= 0) {
                    categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
                }
                categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
                //search limit
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
            //categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
            if (!req.body.search) {
                categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
            }
        }

        db.GetAggregation('cuisine', categoryQuery, function (err, docdata) {
            //console.log('docdata[0].documentData', docdata)
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

    router.getCatrestid = function (req, res) {
        db.GetDocument('categories', {}, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    return router;
}
