//"use strict";
var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");
var turf = require('turf');
var timezone = require('moment-timezone');
var sortBy = require('sort-by');
module.exports = function (app, io) {

    var router = {};

    router.getusers = function (req, res) {
        db.GetDocument('restaurant', {}, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.currentUser = function (req, res) {
        db.GetDocument('restaurant', { username: req.body.currentUserData }, { username: 1, privileges: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };
    router.save = function (req, res) {
        var data = {
            activity: {}
        };

        data.time_setting = {};
        data.time_setting.week_days = {};
        data.time_setting.week_end = {};

        if (typeof req.body.data.unique_code != "undefined" && req.body.data.unique_code != '') {
            var code = req.body.data.unique_code;
        } else {
            var token = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
            var len = 6;
            var code = '';
            for (var i = 0; i < len; i++) {
                var rnum = Math.floor(Math.random() * token.length);
                code += token.substring(rnum, rnum + 1);
            }
        }

        data.unique_code = code;
        data.restaurantname = req.body.data.restaurantname;
        data.username = req.body.data.username;
        data.name = req.body.data.name;
        data.availability = req.body.data.availability;
        data.gender = req.body.data.gender;
        data.time_zone = req.body.data.time_zone;
        data.efp_time = req.body.data.efp_time || 0;
        data.role = 'restaurant';
        data.about = req.body.data.about;
        data.phone = req.body.data.phone;
        data.role = req.body.data.role;
        data.email = req.body.data.email;
        data.address = req.body.data.address;
        data.status = req.body.data.status;
        data.com_type = req.body.data.com_type;
        data.com_taxtype = req.body.data.com_taxtype;
        data.emergency_contact = req.body.data.emergency_contact;
        data.avatarBase64 = req.body.data.avatarBase64;
        data.working_hours = req.body.data.working_hours;
        data.rcategory = req.body.data.rcategory;
        data.fssaino = req.body.data.fssaino;

        if (req.files) {
            for (var i = 0; i < req.files.length; i++) {
                if (req.files[i].fieldname == 'data[avatar]') {
                    data.avatar = req.files[i].destination + req.files[i].filename;
                }
                if (req.files[i].fieldname == 'data[logo]') {
                    data.logo = req.files[i].destination + req.files[i].filename;
                }
                if (req.files[i].fieldname == 'data[food_img]') {
                    data.food_img = req.files[i].destination + req.files[i].filename;
                }
                if (req.files[i].fieldname == 'data[avatarfood][0]') {
                    data.food_img_name = req.files[i].originalname;
                }
            }
        }

        if (data.avatar) {
            data.avatar = data.avatar;
        }
        if (req.body.data.password_confirm) {
            data.password = bcrypt.hashSync(req.body.data.password, bcrypt.genSaltSync(8), null);
        }

        data.location = {};
        data.location.lng = req.body.data.address.lng;
        data.location.lat = req.body.data.address.lat;
        var area_array = [[data.location.lng, data.location.lat]]


        data.offer = {};
        data.offer.offer_type = req.body.data.offer_type || 'Flat';
        data.offer.offer_status = req.body.data.offer_status || 'false';
        data.offer.offer_amount = req.body.data.offer_amount || 0;
        data.offer.target_amount = req.body.data.target_amount || 0;
        var max_off = 0;
        if (typeof req.body.data.max_off != 'undefined' && req.body.data.max_off != null) {
            max_off = req.body.data.max_off;
        }
        data.offer.max_off = max_off;


        data.package_charge = {};
        data.package_charge.package_status = req.body.data.package_status || 'false';
        data.package_charge.package_amount = req.body.data.package_amount || 0;

        data.unique_commission = {};
        data.unique_commission.admin_commission = req.body.data.admin_commission || 0;
        data.unique_commission.service_tax = req.body.data.service_tax || 0;
		
		data.unique_tax = {};
        data.unique_tax.rest_tax = req.body.data.rest_tax || 0;

        //Restaurant documents starts
        var restaurant_documents = [];
        var expiry_details = req.body.data.images || '';
        for (var ex = 0; ex < expiry_details.length; ex++) {
            var doc_name = expiry_details[ex].doc_name;
            var id = expiry_details[ex]._id;
            var expiry_date = expiry_details[ex].expiry_date;
            var img_name = expiry_details[ex].image;
            var img_name_org = expiry_details[ex].image_name || '';
            if (req.files) {
                for (var f = 0; f < req.files.length; f++) {
                    if (req.files[f].fieldname == 'data[newimage][' + expiry_details[ex]._id + ']') {
                        img_name = req.files[f].destination + req.files[f].filename;
                        img_name_org = req.files[f].originalname;
                        break;
                    }
                }
            }
            restaurant_documents.push({ "image_name": img_name_org || '', "doc_name": doc_name || '', "id": id || '', "image": img_name || '', "expiry_date": expiry_date || '' });
        }
        data.restaurant_documents = restaurant_documents;
        //Restaurant documents ends

        var city_doc = '';
        db.GetOneDocument('city', { 'cityname': req.body.data.main_city }, {}, {}, function (err, docdata) {
            if (docdata.area_management) {
                for (var i = 0; i < docdata.area_management.length; i++) {
                    if (docdata.area_management[i].area_name == req.body.data.sub_city) {
                        city_doc = docdata.area_management[i];
                    }
                }
                var childCoordinates = area_array;
                var inside = true;
                if (typeof city_doc.area_poly != 'undefined' && typeof city_doc.area_poly.coordinates != 'undefined') {
                    var parentCoordinates = city_doc.area_poly.coordinates[0];
                    var parentPolygon = turf.polygon([parentCoordinates]);
                    childCoordinates.forEach(function (coordinates) {
                        point = turf.point(coordinates);
                        if (!turf.inside(point, parentPolygon)) {
                            inside = false;
                        }
                    });
                } else {
                    inside = false;
                }

                data.main_city = req.body.data.main_city;
                data.sub_city = req.body.data.sub_city;

                if (req.body.data.main_cuisine) {
                    var arr = []
                    for (var i = 0; i < req.body.data.main_cuisine.length; i++) {
                        arr.push({ 'name': req.body.data.main_cuisine[i].name, '_id': req.body.data.main_cuisine[i]._id })
                    }
                    data.main_cuisine = arr;
                }
                //data.sub_cuisine = req.body.data.sub_cuisine;
                if (inside == true) {
                    if (req.body.data._id) {
                        data.tax = 0;
                        if (req.body.data.tax && req.body.data.tax != null && req.body.data.tax != undefined) {
                            data.tax = req.body.data.tax;
                        }
                        db.GetOneDocument('tax', { 'country.name': data.address.country }, {}, {}, function (err, taxrespo) {
                            if (err) { res.send(err); }
                            else {
                                var tax = 0;
                                if (taxrespo && typeof taxrespo._id != 'undefined') {
                                    if (typeof taxrespo.amount != 'undefined' && taxrespo.amount != null) {
                                        tax = taxrespo.amount;
                                    }
                                    data.tax_id = taxrespo._id;
                                    if (taxrespo.tax_type == 'state') {
                                        db.GetOneDocument('tax', { 'country.name': data.address.country, state_name: data.address.state }, {}, {}, function (err, taxres) {
                                            if (err) { res.send(err); }
                                            else {
                                                if (taxres && typeof taxres._id != 'undefined') {
                                                    if (typeof taxres.amount != 'undefined' && taxres.amount != null) {
                                                        tax = taxres.amount;
                                                    }
                                                    data.tax_id = taxres._id;
                                                }
                                                data.tax = tax;
                                                db.UpdateDocument('restaurant', { _id: req.body.data._id }, data, {}, function (err, docdata) {
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        if (data.status == 2 || data.status == 0) {
                                                            io.of('/chat').emit('r2e_rest_logout', { rest_id: req.body.data._id, status: data.status });
                                                        }
                                                        if (data.status == 2 || data.status == 0) {
                                                            io.of('/chat').in(req.body.data._id).emit('r2e_rest_logout', { rest_id: req.body.data._id, status: data.status });
                                                        }
                                                        res.send(docdata);
                                                    }
                                                });
                                            }
                                        })
                                    } else {
                                        data.tax = tax;
                                        db.UpdateDocument('restaurant', { _id: req.body.data._id }, data, {}, function (err, docdata) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                if (data.status == 2 || data.status == 0) {
                                                    io.of('/chat').emit('r2e_rest_logout', { rest_id: req.body.data._id, status: data.status });
                                                }
                                                if (data.status == 2 || data.status == 0) {
                                                    io.of('/chat').in(req.body.data._id).emit('r2e_rest_logout', { rest_id: req.body.data._id, status: data.status });
                                                }
                                                res.send(docdata);
                                            }
                                        });
                                    }
                                } else {
                                    data.tax = 0;
                                    db.UpdateDocument('restaurant', { _id: req.body.data._id }, data, {}, function (err, docdata) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            if (data.status == 2 || data.status == 0) {
                                                io.of('/chat').emit('r2e_rest_logout', { rest_id: req.body.data._id, status: data.status });
                                            }
                                            if (data.status == 2 || data.status == 0) {
                                                io.of('/chat').in(req.body.data._id).emit('r2e_rest_logout', { rest_id: req.body.data._id, status: data.status });
                                            }
                                            res.send(docdata);
                                        }
                                    });
                                }
                            }
                        })
                    }
                    else {
                        data.activity.created = new Date();
                        data.status = 1;
                        var tax = 0;
                        db.GetOneDocument('tax', { 'country.name': data.address.country }, {}, {}, function (err, taxrespo) {
                            if (err) { res.send(err); }
                            else {
                                if (taxrespo && typeof taxrespo._id != 'undefined') {
                                    if (typeof taxrespo.amount != 'undefined' && taxrespo.amount != null) {
                                        tax = taxrespo.amount;
                                    }
                                    data.tax_id = taxrespo._id;
                                    if (taxrespo.tax_type == 'state') {
                                        db.GetOneDocument('tax', { 'country.name': data.address.country, state_name: data.address.state }, {}, {}, function (err, taxres) {
                                            if (err) { res.send(err); }
                                            else {
                                                if (taxres && typeof taxres._id != 'undefined') {
                                                    if (typeof taxres.amount != 'undefined' && taxres.amount != null) {
                                                        tax = taxres.amount;
                                                    }
                                                    data.tax_id = taxres._id;
                                                }
                                                data.tax = tax;
                                                db.InsertDocument('restaurant', data, function (err, result) {
                                                    if (err) {
                                                        res.send(err);
                                                    } else {
                                                        /* var rec_data = {};
                                                        rec_data.restaurant = result._id;
                                                        rec_data.name = 'Recommended';
                                                        rec_data.status = 1;
                                                        rec_data.mainparent = 'yes';
                                                        db.InsertDocument('categories', rec_data, function (rec_err, rec_response) {
                                                            if (rec_err) {
                                                                res.send(err);
                                                            } else {
                                                            }
                                                        }); */
                                                        res.send(result);
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        data.tax = tax;
                                        db.InsertDocument('restaurant', data, function (err, result) {
                                            if (err) {
                                                res.send(err);
                                            } else {
                                                /* var rec_data = {};
                                                rec_data.restaurant = result._id;
                                                rec_data.name = 'Recommended';
                                                rec_data.status = 1;
                                                rec_data.mainparent = 'yes';
                                                db.InsertDocument('categories', rec_data, function (rec_err, rec_response) {
                                                    if (rec_err) {
                                                        res.send(err);
                                                    } else {
                                                    }
                                                }); */
                                                res.send(result);
                                            }
                                        });
                                    }
                                } else {
                                    data.tax = tax;
                                    db.InsertDocument('restaurant', data, function (err, result) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            /* var rec_data = {};
                                            rec_data.restaurant = result._id;
                                            rec_data.name = 'Recommended';
                                            rec_data.status = 1;
                                            rec_data.mainparent = 'yes';
                                            db.InsertDocument('categories', rec_data, function (rec_err, rec_response) {
                                                if (rec_err) {
                                                    res.send(err);
                                                } else {
                                                }
                                            }); */
                                            res.send(result);
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
                else {
                    res.status(400).send({ message: "Your Restaurant Location being out of " + city_doc.area_name });
                }
            }
            else {
                res.status(400).send({ message: "No areas found in" + docdata.cityname });
            }
        });
    }


    /*  router.save = function (req, res) {
  
          var data = {
              activity: {}
          };
  
          var token = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZ";
          var len = 6;
          var code = '';
          for (var i = 0; i < len; i++) {
              var rnum = Math.floor(Math.random() * token.length);
              code += token.substring(rnum, rnum + 1);
          }
  
          data.unique_code = code;
          data.restaurantname = req.body.data.restaurantname;
          data.username = req.body.data.username;
          data.name = req.body.data.name;
          data.availability = req.body.data.availability;
          data.gender = req.body.data.gender;
          data.time_zone = req.body.data.time_zone;
  
          //data.subcity = req.body.data.subcity;
          data.role = 'restaurant';
          data.about = req.body.data.about;
          data.phone = req.body.data.phone;
          data.role = req.body.data.role;
          data.email = req.body.data.email;
          data.address = req.body.data.address;
          data.status = req.body.data.status;
          data.com_type = req.body.data.com_type;
          data.emergency_contact = req.body.data.emergency_contact;
          data.avatarBase64 = req.body.data.avatarBase64;
  
          if (data.avatarBase64) {
              var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              var fileName = Date.now().toString() + '.png';
              var file = CONFIG.DIRECTORY_USERS + fileName;
              library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
              data.avatar = attachment.get_attachment(CONFIG.DIRECTORY_USERS, fileName);
              data.img_name = encodeURI(fileName);
              data.img_path = CONFIG.DIRECTORY_USERS.substring(2);
          }
          if (req.body.data.password_confirm) {
              data.password = bcrypt.hashSync(req.body.data.password, bcrypt.genSaltSync(8), null);
          }
  
          data.location = {};
          data.location.lng = req.body.data.address.lng;
          data.location.lat = req.body.data.address.lat;
  
          var area_array = [[data.location.lng, data.location.lat]]
  
  
          data.offer = {};
          data.offer.offer_type = req.body.data.offer_type;
          data.offer.offer_amount = req.body.data.offer_amount;
          data.offer.target_amount = req.body.data.target_amount;
  
          data.unique_commission = {};
          data.unique_commission.admin_commission = req.body.data.admin_commission || 0;
          data.unique_commission.service_tax = req.body.data.service_tax || 0;
    
          //Restaurant documents starts
          var restaurant_documents = [];
          var expiry_details = req.body.data.images;
  
          for (var ex = 0; ex < expiry_details.length; ex++) {
              var doc_name = expiry_details[ex].doc_name;
              var expiry_date = expiry_details[ex].expiry_date;
              var img_name = expiry_details[ex].image;
              if (req.files) {
                  for (var f = 0; f < req.files.length; f++) {
                      if (req.files[f].fieldname == 'data[newimage][' + expiry_details[ex]._id + ']') {
                          img_name = req.files[f].destination + req.files[f].filename;
                          break;
                      }
                  }
              }
              restaurant_documents.push({ "doc_name": doc_name || '', "image": img_name || '', "expiry_date": expiry_date || '' });
          }
          data.restaurant_documents = restaurant_documents;
          //Restaurant documents ends
  
  
          //---start removing dublicates start  for selected
          var isssues = req.body.value || '';
          var menu = [];
          var menulen = isssues.length;
          if (menulen > 0) {
              for (var i = 0; i < menulen; i++) {
                  if (req.body.value[i].selected == 'true') {
                      menu.push(req.body.value[i].id)
                  }
              }
          }
  
  
          var selected_list = [];
          var idsSeen = {}; var idSeenValue = {};
          for (var i = 0, len = menu.length, id; i < len; ++i) {
              id = menu[i];
              if (idsSeen[id] !== idSeenValue) {
                  selected_list.push(menu[i]);
                  idsSeen[id] = idSeenValue;
              }
          }
          //---end removing dublicates start  for selected
  
  
          //---start removing dublicates start  for un selected
          var menus = [];
          var second_issue = req.body.value || '';
          var menuslen = second_issue.length;
          if (menuslen > 0) {
              for (var i = 0; i < menuslen; i++) {
                  if (req.body.value[i].selected == 'false') {
                      menus.push(req.body.value[i].id)
                  }
              }
          }
  
          var unselected_list = [];
          var idsSeen = {}; var idSeenValue = {};
          for (var i = 0, len = menus.length, id; i < len; ++i) {
              id = menus[i];
              if (idsSeen[id] !== idSeenValue) {
                  unselected_list.push(menus[i]);
                  idsSeen[id] = idSeenValue;
              }
          }
          //---end removing dublicates start  for un selected
  
          if (selected_list && !unselected_list) { var final_category = selected_list; }
          if (selected_list && unselected_list) {
              var seun_category = [];
              for (var i in selected_list) {
                  var shared = false;
                  for (var j in unselected_list)
                      if (unselected_list[j] == selected_list[i]) {
                          shared = true;
                          break;
                      }
                  if (!shared) seun_category.push(selected_list[i])
              }
              final_category = seun_category;
          }
  
  
          // var city_id = '596de20bb18edf441739c131';
          var city_doc = '';
          db.GetOneDocument('city', { 'cityname': req.body.data.main_city }, {}, {}, function (err, docdata) {
              if (docdata.area_management) {
                  for (var i = 0; i < docdata.area_management.length; i++) {
                      if (docdata.area_management[i].area_name == req.body.data.sub_city) {
                          city_doc = docdata.area_management[i];
                      }
                  }
                  var parentCoordinates = city_doc.area_poly.coordinates[0];
                  var childCoordinates = area_array;
  
                  var parentPolygon = turf.polygon([parentCoordinates]);
                  var inside = true;
                  childCoordinates.forEach(function (coordinates) {
                      point = turf.point(coordinates);
                      if (!turf.inside(point, parentPolygon)) {
                          inside = false;
                      }
                  });
  
                  data.main_city = req.body.data.main_city;
                  data.sub_city = req.body.data.sub_city;
  
                  if (inside == true) {
                      if (req.body.data._id) {
                          db.GetOneDocument('restaurant', { status: { $ne: 0 }, _id: req.body.data._id }, { 'categories': 1 }, {}, function (err, resdoc) {
                              if (err) {
                                  res.send(err);
                              }
                              else {
                                  // if only selected values coming means adding new values with old db values
                                  if (selected_list) {
                                      final_category = selected_list.concat(resdoc.categories);
                                  }
  
                                  // if only un selected values coming means removing unselected values with old db values
                                  if (unselected_list) {
                                      var editun_category = [];
                                      for (var i in resdoc.categories) {
                                          var shared = false;
                                          for (var j in unselected_list)
                                              if (unselected_list[j] == resdoc.categories[i]) {
                                                  shared = true;
                                                  break;
                                              }
                                          if (!shared) editun_category.push(resdoc.categories[i])
                                      }
                                      final_category = editun_category;
                                  }
  
                                  // if both selected and un-selected values coming means adding and removing selected unselected values with old db values
                                  if (selected_list && unselected_list) {
                                      var temp_sepdb = selected_list.concat(resdoc.categories);
                                      var final_temp_sepdb = [];
                                      for (var i in temp_sepdb) {
                                          var shared = false;
                                          for (var j in unselected_list)
                                              if (unselected_list[j] == temp_sepdb[i]) {
                                                  shared = true;
                                                  break;
                                              }
                                          if (!shared) final_temp_sepdb.push(temp_sepdb[i])
                                      }
                                      final_category = final_temp_sepdb;
                                  }
  
                                  //finally once removing all dublicates for security
                                  var unique_list = [];
                                  var idsSeen = {}; var idSeenValue = {};
                                  for (var i = 0, len = final_temp_sepdb.length, id; i < len; ++i) {
                                      id = final_temp_sepdb[i];
                                      if (idsSeen[id] !== idSeenValue) {
                                          unique_list.push(final_temp_sepdb[i]);
                                          idsSeen[id] = idSeenValue;
                                      }
                                  }
                                  final_category = unique_list;
  
                                  data.categories = final_category;
                                  db.UpdateDocument('restaurant', { _id: req.body.data._id }, data, {}, function (err, docdata) {
                                      if (err) {
                                          res.send(err);
                                      } else {
                                          res.send(docdata);
                                      }
                                  });
                              }
                          });
                      }
                      else {
                          data.categories = final_category;
                          data.activity.created = new Date();
                          data.status = 1;
  
                          db.InsertDocument('restaurant', data, function (err, result) {
                              if (err) {
                                  res.send(err);
                              } else {
                                  res.send(result);
                              }
                          });
                      }
                  }
                  else {
                      res.status(400).send({ message: "Your Restaurant Location being out of " + city_doc.area_name });
                  }
              }
              else {
                  res.status(400).send({ message: "No areas found in" + docdata.cityname });
              }
          });
      }
  
    */

    router.deletdriverdata = function (req, res) {
        db.UpdateDocument('restaurant', { '_id': req.body.data }, { 'status': 0 }, {}, function (err, data) {
            if (err) {
                res.send(err);
            } else {
                res.send(data);
            }
        });
    };

    router.getuserdetails = function (req, res) {
        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
            var getQuery = [{
                "$match": { status: { $in: [1, 2, 3] } }
            },
            {
                $project: {
                    email: 1,
                    restaurantname: 1,
                    username: 1,
                    status: 1,
                    createdAt: 1,

                    "avatar": {
                        $ifNull: ["$avatar", settings.settings.site_url + CONFIG.USER_PROFILE_IMAGE_DEFAULT]
                    }
                }
            }, {
                $project: {
                    document: "$$ROOT"
                }
            },
            {
                $sort: {
                    "document.createdAt": -1
                }
            },
            {
                $limit: 10
            },
            {
                $group: { "_id": "_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
            }

            ];
            db.GetAggregation('restaurant', getQuery, function (err, data) {
                if (err) {
                    res.send(err);
                } else {
                    if (data.length != 0) {
                        res.send(data[0].documentData);
                    } else {
                        res.send([0]);
                    }
                }
            });
        });
    };

    router.getpendinglist = function (req, res) {
        db.GetDocument('restaurant', { status: { $eq: 13 } }, {}, {}, function (err, shops) {
            if (err) {
                res.send(err);
            } else {
                res.send(shops);
            }
        });
    };

    router.edit = function (req, res) {
        /* var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = req.body.client_offset;
        } */
        db.GetDocument('restaurant', { _id: req.body.id }, { password: 0 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                /* var server_offset = (new Date).getTimezoneOffset();
                var diff_offset = (client_offset * 60 * 1000) - (server_offset * 60 * 1000);
                if (typeof docdata[0].working_hours != 'undefined' && docdata[0].working_hours.length > 0) {
                    docdata[0].working_hours.forEach(function (element) {
                        if (typeof element.slots != "undefined" && element.slots.length > 0) {
                            for (var i = 0; i < element.slots.length; i++) {
                                element.slots[i].start_time = new Date(new Date(element.slots[i].start_time).getTime() + diff_offset);
                                element.slots[i].end_time = new Date(new Date(element.slots[i].end_time).getTime() + diff_offset);
                            }
                        }
                    })
                } */
                res.send(docdata);
            }
        });
    };

    router.transactionsList = function (req, res) {
        var data = {};
        data.user_id = req.body.id;
        if (req.body.id != '') {
            db.GetOneDocument('walletReacharge', { user_id: req.body.id }, {}, {}, function (userErr, userRespo) {
                if (userRespo) {

                    var usersQuery = [{
                        "$match": { user_id: new mongoose.Types.ObjectId(req.body.id) }
                    },
                    {
                        $project:
                        {
                            'transactions': 1,
                            'user_id': 1,
                            'total': 1
                        }
                    },
                    {
                        $project: {
                            document: "$$ROOT"
                        }
                    },
                    {
                        $group: { "_id": "$user_id", "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
                    }
                    ];

                    usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
                    usersQuery.push({ $unwind: { path: "$documentData.transactions", preserveNullAndEmptyArrays: true } });

                    //pagination
                    if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
                        usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });

                    }
                    usersQuery.push({ $group: { "_id": null, "total": { "$sum": "$count" }, "transactions": { $push: "$documentData.transactions" } } });
                    usersQuery.push({ $group: { "_id": null, "count": { "$sum": "$total" }, "documentData": { $push: "$$ROOT" } } });
                    //pagination
                    db.GetAggregation('walletReacharge', usersQuery, function (walletErr, walletRespo) {
                        if (walletErr || walletRespo.length == 0) {
                            res.send({
                                "status": "0",
                                "response": 'Data Not available'
                            });
                        } else {
                            if (walletRespo.length >= 0 && walletRespo[0].documentData[0].transactions) {
                                var total_amount = walletRespo[0].documentData[0].total;
                                var transArr = [];

                                for (var i = 0; i < walletRespo[0].documentData[0].transactions.length; i++) {

                                    var title = '';
                                    var transacData = {};
                                    if (walletRespo[0].documentData[0].transactions[i].type == 'CREDIT') {
                                        if (walletRespo[0].documentData[0].transactions[i].credit_type == 'welcome') {
                                            title = 'Welcome Bonus';
                                        } else if (walletRespo[0].documentData[0].transactions[i].credit_type == 'referral') {
                                            title = 'Referral reward';
                                            if (walletRespo[0].documentData[0].transactions[i].ref_id != null) {
                                                title = 'Wallet Recharge';
                                            }
                                        } else {
                                            title = 'Wallet Recharge';
                                        }
                                    } else if (walletRespo[0].documentData[0].transactions[i].type == 'DEBIT') {
                                        title = 'Payment by wallet';
                                    }
                                    transacData.type = walletRespo[0].documentData[0].transactions[i].type || '';
                                    transacData.trans_amount = walletRespo[0].documentData[0].transactions[i].trans_amount || 0;
                                    transacData.title = title;
                                    transacData.trans_date = new Date(walletRespo[0].documentData[0].transactions[i].trans_date);
                                    transacData.balance_amount = walletRespo[0].documentData[0].transactions[i].avail_amount;
                                    transArr.push(transacData);
                                }

                                db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                                    if (err || !settings) {
                                        res.send({
                                            "status": 0,
                                            "message": 'Please check the email and try again'
                                        });
                                    } else {
                                        res.send({
                                            "status": "1",
                                            "response": { 'currency': settings.settings.currency_code, 'total_amount': parseInt(total_amount), 'total_transaction': walletRespo[0].documentData[0].transactions.length, 'trans': transArr, 'count': userRespo.transactions.length }
                                        })
                                    }
                                });
                            }
                        }
                    });


                } else {
                    res.send({
                        "status": "0",
                        "message": "Invalid User"
                    });
                }
            });
        }
    };

    router.allUsers = function getusers(req, res) {
        var errors = req.validationErrors();
        var query = {};
        if (req.body.status == 0) {
            query = { status: { $in: [1, 2] } };
        }
        else if (req.body.status == 1) {
            query = { status: { $eq: 1 } };
        }
        else if (req.body.status == 2) {
            query = { status: { $in: [2] } };
        }

        if (errors) {
            res.send(errors, 400);
            return;
        }
        var moment = require("moment");
        var client_offset = (new Date).getTimezoneOffset();
        if (typeof req.body.client_offset != 'undefined') {
            client_offset = req.body.client_offset;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var usersQuery = [{
            "$match": query
        },
        { $lookup: { from: 'categories', localField: '_id', foreignField: 'restaurant', as: 'categorydetails' } },
        // { $unwind: { path: "$categorydetails", preserveNullAndEmptyArrays: true } },       
        {
            $project: {
                createdAt: 1,
                availability: 1,
                restaurantname: 1,
                // restaurantname: { $toLower: "$restaurantname" },
                updatedAt: 1,
                username: 1,
                time_setting: 1,
                address: 1,
                restaurant_documents: 1,
                tot_req: 1,
                cancelled: 1,
                deliverd: 1,
                avg_delivery: 1,
                avail: 1,
                verified: 1,
                role: 1,
                phone: 1,
                status: 1,
                //email: 1,
                email: { $toLower: "$email" },
                dname: { $toLower: '$' + sorted },
                activity: 1,
                categorydetails: 1,
                _id: 1,
                restaurant: 1,
                feature: 1,
                feature_img: 1
            }
        },
        {
            $project: {
                categorydetails: 1,
                username: 1,
                document: "$$ROOT",
                // _id:1,
                // restaurant:1
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }

        ];
        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        if (req.body.search) {
            var searchs = req.body.search;
            // condition['username'] = { $regex: new RegExp('^' + searchs, 'i') };
            usersQuery.push({ "$match": { $or: [{ "documentData.address.city": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.address.line1": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.number": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.code": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.restaurantname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
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
        db.GetAggregation('restaurant', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All user
                    function (callback) {
                        db.GetCount('restaurant', { status: { $in: [1, 2] } }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    },
                    //Active user
                    function (callback) {
                        db.GetCount('restaurant', { status: { $eq: 1 } }, function (err, activeValue) {
                            if (err) return callback(err);
                            count.activeValue = activeValue;
                            callback();
                        });
                    },
                    //Deactive user
                    function (callback) {
                        db.GetCount('restaurant', { status: { $in: [2] } }, function (err, deactivateValue) {
                            if (err) return callback(err);
                            count.deactivateValue = deactivateValue;
                            callback();
                        });
                    }
                ], function (err) {
                    //if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                        db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
                            if (err || !settings) {
                                res.send({ "status": "0", "errors": "Configure your app settings" });
                            } else {
                                var week_days_checkin = 1;
                                var d = new Date();
                                var n = d.getDay();
                                if (n == 6 || n == 0) { week_days_checkin = 0; }
                                var server_offset = (new Date).getTimezoneOffset();
                                var diff_offset = (server_offset * 60 * 1000) + (client_offset * 60 * 1000);
                                for (var i = 0; i < docdata[0].documentData.length; i++) {
                                    var stime;
                                    var etime;
                                    if (typeof docdata[0].documentData[i].time_setting != 'undefined') {
                                        if (week_days_checkin == 1) {
                                            if (typeof docdata[0].documentData[i].time_setting.week_days != 'undefined') {
                                                if (typeof docdata[0].documentData[i].time_setting.week_days.start_time != 'undefined') {
                                                    docdata[0].documentData[i].time_setting.week_days.start_time = new Date(new Date(docdata[0].documentData[i].time_setting.week_days.start_time).getTime() + diff_offset);
                                                    stime = docdata[0].documentData[i].time_setting.week_days.start_time;
                                                }
                                                if (typeof docdata[0].documentData[i].time_setting.week_days.end_time != 'undefined') {
                                                    docdata[0].documentData[i].time_setting.week_days.end_time = new Date(new Date(docdata[0].documentData[i].time_setting.week_days.end_time).getTime() + diff_offset);
                                                    etime = docdata[0].documentData[i].time_setting.week_days.end_time;
                                                }
                                            }
                                        } else {
                                            if (typeof docdata[0].documentData[i].time_setting.week_end != 'undefined') {
                                                if (typeof docdata[0].documentData[i].time_setting.week_end.start_time != 'undefined') {
                                                    docdata[0].documentData[i].time_setting.week_end.start_time = new Date(new Date(docdata[0].documentData[i].time_setting.week_end.start_time).getTime() + diff_offset);
                                                    stime = docdata[0].documentData[i].time_setting.week_end.start_time;
                                                }
                                                if (typeof docdata[0].documentData[i].time_setting.week_end.end_time != 'undefined') {
                                                    docdata[0].documentData[i].time_setting.week_end.end_time = new Date(new Date(docdata[0].documentData[i].time_setting.week_end.end_time).getTime() + diff_offset);
                                                    etime = docdata[0].documentData[i].time_setting.week_end.start_time;
                                                }
                                            }
                                        }
                                        if (typeof docdata[0].documentData[i].time_setting.week_days != 'undefined') {
                                            docdata[0].documentData[i].time_setting.week_days.start_time = stime;
                                            docdata[0].documentData[i].time_setting.week_days.end_time = etime;
                                        }
                                    }
                                }
                                res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                            }
                        });
                    }
                });
            }
        });
    };


    router.newRestaurants = function newRestaurants(req, res) {

        var errors = req.validationErrors();
        var query = {};
        query = { status: { $eq: 3 } };

        var sorting = {};
        sorting['order_history.order_time'] = -1;

        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var usersQuery = [{
            "$match": query
        },
        { $lookup: { from: 'categories', localField: '_id', foreignField: 'restaurant', as: 'catrespo' } },
        { $lookup: { from: 'food', localField: '_id', foreignField: 'shop', as: 'foodrespo' } },
        // { $unwind: { path: "$categorydetails", preserveNullAndEmptyArrays: true } },       
        {
            $project: {
                createdAt: 1,
                availability: 1,
                restaurantname: 1,
                updatedAt: 1,
                username: 1,
                time_setting: 1,
                address: 1,
                restaurant_documents: 1,
                tot_req: 1,
                cancelled: 1,
                deliverd: 1,
                avg_delivery: 1,
                avail: 1,
                verified: 1,
                role: 1,
                phone: 1,
                status: 1,
                email: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1,
                catrespo: 1,
                foodrespo: 1,
                _id: 1,
                restaurant: 1,
            }
        },
        {
            $project: {
                categorydetails: 1,
                username: 1,
                document: "$$ROOT",
                // _id:1,
                // restaurant:1
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        },
        { "$sort": sorting },
        ];
        var condition = { status: { $ne: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
        if (req.body.search) {
            //condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.address.city": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.address.line1": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.number": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.phone.code": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.restaurantname": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
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
        db.GetAggregation('restaurant', usersQuery, function (err, docdata) {
            if (err || docdata.length <= 0) {
                res.send([0, 0]);
            } else {
                // res.send([docdata[0].documentData, docdata[0].count]);
                db.GetDocument('documents', { 'doc_for': 'restaurant', 'has_require': 1 }, {}, {}, (err, ress) => {
                    async.series([(cb) => {
                        if (ress.length > 0) {
                            if (docdata.length > 0) {
                                for (i in docdata[0].documentData) {
                                    docdata[0].documentData[i].doc_len = ress.length;
                                    docdata[0].documentData[i].catrespo = docdata[0].documentData[i].catrespo.length;
                                    docdata[0].documentData[i].foodrespo = docdata[0].documentData[i].foodrespo.length;
                                }
                                for (i in ress) {
                                    for (j in docdata[0].documentData) {
                                        for (x in docdata[0].documentData[j].restaurant_documents) {
                                            if (ress[i].doc_name == docdata[0].documentData[j].restaurant_documents[x].doc_name) {
                                                docdata[0].documentData[j].doc_len = parseInt(docdata[0].documentData[j].doc_len) - 1;
                                            }
                                        }
                                    }
                                }
                            }
                            cb(null);
                        }
                        else {
                            if (docdata.length > 0) {
                                for (i in docdata[0].documentData) {
                                    docdata[0].documentData[i].doc_len = 0;
                                }
                            }
                            cb(null);
                        }
                    }, (cb) => {
                        if (docdata.length > 0) {
                            for (i in docdata[0].documentData) {
                                if (typeof docdata[0].documentData[i].last_name != 'undefined') {
                                    docdata[0].documentData[i].name = docdata[0].documentData[i].username + ' ' + docdata[0].documentData[i].last_name;
                                }
                                else {
                                    docdata[0].documentData[i].name = docdata[0].documentData[i].username + '';
                                }
                                if (typeof docdata[0].documentData[i].phone != 'undefined' && docdata[0].documentData[i].phone != null && docdata[0].documentData[i].phone != '') {
                                    if (typeof docdata[0].documentData[i].phone.code != 'undefined') {
                                        docdata[0].documentData[i].phone_no = docdata[0].documentData[i].phone.code + docdata[0].documentData[i].phone.number
                                    }
                                    else {
                                        docdata[0].documentData[i].phone_no = docdata[0].documentData[i].phone.number
                                    }
                                }
                                else {
                                    docdata[0].documentData[i].phone_no = '';
                                }

                                if (typeof docdata[0].documentData[i].currentStatus == 'undefined') {
                                    docdata[0].documentData[i].currentStatus = 1;
                                }
                            }
                            cb(null);
                        }
                        else {
                            cb(null);
                        }
                    }], (err, succc) => {
                        if (docdata.length > 0) {
                            res.send([docdata[0].documentData, docdata[0].count]);
                        }
                        else {
                            res.send([[], 0]);
                        }
                    })
                })
            }
        });
    };


    router.idUsers = function getusers(req, res) {

        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }

        var data = {};
        data.id = req.body.id;
        var errors = req.validationErrors();
        var query = {
            // 'driver_id':req.body.id, status: { $ne: 0 }
            'restaurant_id': new mongoose.Types.ObjectId(req.body.id), status: { $ne: 0 }
        };
        var usersQuery = [{
            "$match": query
        },

        { $lookup: { from: 'restaurant', localField: 'restaurant_id', foreignField: '_id', as: 'restaurantiddetails' } },
        { $unwind: { path: "$restaurantiddetails", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'usersiddetails' } },
        { $unwind: { path: "$usersiddetails", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'drivers', localField: 'driver_id', foreignField: '_id', as: 'driverdetails' } },
        { $unwind: { path: "$driverdetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                status: 1,
                read_status: 1,
                billings: 1,
                user_id: 1,
                driver_id: 1,
                coupon_code: 1,
                order_id: 1,
                delivery_address: 1,
                cancel_drivers: 1,
                restaurantiddetails: 1,
                usersiddetails: 1,
                driverdetails: 1,
                dname: { $toLower: '$' + sorted },
                dna: { $cond: { if: { $eq: [{ $strcasecmp: ['$' + sorted, { $toLower: "$position" }] }, 0] }, then: '$' + sorted, else: { $toLower: '$' + sorted } } }

            }
        }, {
            $project: {
                driver_id: 1,
                document: "$$ROOT"
            }
        },
        {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }
        ];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.body).length != 0) {
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.search != '' && req.body.search != 'undefined' && req.body.search) {
                searchs = req.body.search;
                usersQuery.push({ "$match": { $or: [{ "documentData.billings.amount.grand_total": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.order_id": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.driverdetails.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.usersiddetails.username": { $regex: searchs + '.*', $options: 'si' } }] } });
            }

            if (req.body.sort !== '' && req.body.sort) {
                sorting = {};
                if (req.body.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    usersQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    usersQuery.push({ $sort: sorting });
                }
            }
            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                usersQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('orders', usersQuery, function (err, docdata) {
            if (err || !docdata || docdata.length == 0) {
                res.send([]);
            } else {
                res.send([docdata[0].documentData, docdata[0].count]);
            }
        });
    };


    router.recentUser = function recentuser(req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.query.sort != "") {
            var sorted = req.query.sort;
        }


        var usersQuery = [{
            "$match": { status: { $ne: 0 } }
        }, {
            $project: {
                username: 1,
                role: 1,
                email: 1,
                createdAt: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $sort: {
                createdAt: -1
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var sorting = {};
        var searchs = '';

        var condition = { status: { $ne: 0 } };

        if (Object.keys(req.query).length != 0) {
            usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

            if (req.query.search != '' && req.query.search != 'undefined' && req.query.search) {
                condition['username'] = { $regex: new RegExp('^' + req.query.search, 'i') };
                searchs = req.query.search;
                usersQuery.push({ "$match": { "documentData.username": { $regex: searchs + '.*', $options: 'si' } } });
            }
            if (req.query.sort !== '' && req.query.sort) {
                sorting = {};
                if (req.query.status == 'false') {
                    sorting["documentData.dname"] = -1;
                    usersQuery.push({ $sort: sorting });
                } else {
                    sorting["documentData.dname"] = 1;
                    usersQuery.push({ $sort: sorting });
                }
            }
            if (req.query.limit != 'undefined' && req.query.skip != 'undefined') {
                usersQuery.push({ '$skip': parseInt(req.query.skip) }, { '$limit': parseInt(req.query.limit) });
            }
            usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('restaurant', usersQuery, function (err, docdata) {
            if (err && docdata.length > 0) {
                res.send([0, 0]);
            } else {
                res.send([docdata[0].documentData, docdata[0].count]);
            }
        });
    };

    router.delete = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.UpdateDocument('restaurant', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                if (typeof req.body.delData == 'object') {
                    for (var i = 0; i < req.body.delData.length; i++) {
                        io.of('/chat').emit('r2e_rest_logout', { rest_id: req.body.delData[i], status: 0 });
                        io.of('/chat').in(req.body.delData[i]).emit('r2e_rest_logout', { rest_id: req.body.delData[i], status: 0 });
                    }
                } else {
                    io.of('/chat').emit('r2e_rest_logout', { rest_id: req.body.delData, status: 0 });
                    io.of('/chat').in(req.body.delData).emit('r2e_rest_logout', { rest_id: req.body.delData, status: 0 });
                }
                res.send(docdata);
            }
        });
    };


    router.walletAmount = function (req, res) {
        db.GetDocument('walletReacharge', { user_id: req.body.data }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.addaddress = function addaddress(req, res) {
        var address = {
            'fulladress': req.body.data.editaddressdata.fulladres || "",
            'line1': req.body.data.editaddressdata.line1 || "",
            'country': req.body.data.editaddressdata.country || "",
            'street': req.body.data.editaddressdata.street || "",
            'state': req.body.data.editaddressdata.state || "",
            'city': req.body.data.editaddressdata.city || "",
            'landmark': req.body.data.editaddressdata.landmark || "",
            'status': req.body.data.editaddressdata.status || 1,
            'locality': req.body.data.editaddressdata.locality || "",
            'zipcode': req.body.data.editaddressdata.zipcode || "",
            'location': req.body.data.addressList.location || ""
        };
        if (req.body.data.editaddressdata._id) {
            if (req.body.data.addressList.location.lng == '' || req.body.data.addressList.location.lat == '') {
                db.UpdateDocument('restaurant', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id },
                    {
                        "addressList.$.fulladress": req.body.data.editaddressdata.fulladres,
                        "addressList.$.line1": req.body.data.editaddressdata.line1, "addressList.$.country": req.body.data.editaddressdata.country, "addressList.$.street": req.body.data.editaddressdata.street,
                        "addressList.$.city": req.body.data.editaddressdata.city, "addressList.$.landmark": req.body.data.editaddressdata.landmark, "addressList.$.status": req.body.data.editaddressdata.status, "addressList.$.locality": req.body.data.editaddressdata.locality,
                        "addressList.$.zipcode": req.body.data.editaddressdata.zipcode
                    }, {}, function (err, docdata) {

                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
            } else {
                db.UpdateDocument('restaurant', { _id: req.body.userid, 'addressList._id': req.body.data.editaddressdata._id },
                    {
                        "addressList.$.fulladress": req.body.data.editaddressdata.fulladres,
                        "addressList.$.line1": req.body.data.editaddressdata.line1, "addressList.$.country": req.body.data.editaddressdata.country, "addressList.$.street": req.body.data.editaddressdata.street,
                        "addressList.$.city": req.body.data.editaddressdata.city, "addressList.$.landmark": req.body.data.editaddressdata.landmark, "addressList.$.status": req.body.data.editaddressdata.status, "addressList.$.locality": req.body.data.editaddressdata.locality,
                        "addressList.$.zipcode": req.body.data.editaddressdata.zipcode, "addressList.$.location.lat": req.body.data.addressList.location.lat, "addressList.$.location.lng": req.body.data.addressList.location.lng
                    }, { multi: true }, function (err, docdata) {

                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
            }
        } else {
            db.UpdateDocument('restaurant', { _id: req.body.userid }, { "$push": { 'addressList': address } }, {}, function (err, docdata) {

                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    };
    router.UserAddress = function (req, res) {

        db.GetDocument('restaurant', { _id: req.body.id }, { 'addressList': 1 }, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.addressStatus = function (req, res) {
        db.UpdateDocument('restaurant', { '_id': req.body.userid, 'addressList.status': 3 }, { "addressList.$.status": 1 }, { multi: true }, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                db.UpdateDocument('restaurant', { '_id': req.body.userid, 'addressList._id': req.body.add_id }, { "addressList.$.status": 3 }, {}, function (err, docdata) {

                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });
    };

    router.deleteUserAddress = function (req, res) {
        db.UpdateDocument('restaurant', { '_id': req.body.userid }, { $pull: { "addressList": { _id: req.body.add_id } } }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.getdeletedusers = function getdeletedusers(req, res) {
        var errors = req.validationErrors();

        var query = {};
        if (errors) {
            res.send(errors, 400);
            return;
        }
        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }
        var usersQuery = [{
            "$match": { status: { $eq: 0 } }
        }, {
            $project: {
                createdAt: 1,
                updatedAt: 1,
                username: 1,
                phone: 1,
                address: 1,
                restaurantname: 1,
                role: 1,
                status: 1,
                email: 1,
                dname: { $toLower: '$' + sorted },
                activity: 1
            }
        }, {
            $project: {
                username: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];
        var condition = { status: { $eq: 0 } };
        usersQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            condition['username'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            usersQuery.push({ "$match": { $or: [{ "documentData.username": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.email": { $regex: searchs + '.*', $options: 'si' } }] } });
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
        usersQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

        db.GetAggregation('restaurant', usersQuery, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                var count = {};
                async.parallel([
                    //All Deleted user
                    function (callback) {
                        db.GetCount('restaurant', { status: { $eq: 0 } }, function (err, allValue) {
                            if (err) return callback(err);
                            count.allValue = allValue;
                            callback();
                        });
                    }
                ], function (err) {

                    if (err) return next(err);
                    var totalCount = count;
                    if (err || docdata.length <= 0) {
                        res.send([0, 0]);
                    } else {
                        res.send([docdata[0].documentData, docdata[0].count, totalCount]);
                    }
                });
            }
        });
    };

    router.getCity = async function (req, res) {

        var getQuery = [{ "$match": { 'status': { $eq: 1 } } },
        {
            $project: {
                updatedAt: 1,
                createdAt: 1,
                cityname: 1,
                sort_cityname: { $toLower: "$cityname" },
                address: 1,
                slug: 1,
                featured: 1,
                image: 1,
                location: 1,
                status: 1,
                extra_fare_settings: 1,
                night_fare_settings: 1,
                reject_fare: 1,
                delivery_charge: 1,
                driver_fare: 1,
                admin_commission: 1,
            }
        },
        {
            $sort: {
                "sort_cityname": 1
            }
        }
        ]
        const docdata= await  db.GetAggregation('city', getQuery)
        if (!docdata) {
            res.send(err);
        } else {
            const data= await db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {})
            if (data.status==false) {
                res.send(data.doc);
            } else {
                res.send([docdata, data.doc]);
            }
            // db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
            //     if (err) {
            //         res.send(err);
            //     } else {
            //         res.send([docdata, data]);
            //     }
            // });
        }
        // db.GetAggregation('city', getQuery, function (err, docdata) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
        //             if (err) {
        //                 res.send(err);
        //             } else {
        //                 res.send([docdata, data]);
        //             }
        //         });
        //     }
        // });

        /* db.GetDocument('city', { 'status': { $eq: 1 } }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('cuisine', { 'status': { $eq: 1 } }, { name: 1 }, {}, function (err, data) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send([docdata, data]);
                    }
                });
            }
        }); */
    };

    router.getDocField = function (req, res) {
        if (req.body.id) {
            db.GetDocument('restaurant', { _id: req.body.id }, {}, {}, function (err, data) {
                if (err || !data) {
                    res.send(err);
                } else {
                    db.GetDocument('documents', { doc_for: 'restaurant', status: { $eq: 1 } }, {}, {}, function (docerr, docdata) {
                        if (docerr) {
                            res.send(docerr);
                        }
                        else {
                            if (!data[0].avatar) {
                                data[0].avatar = './' + CONFIG.USER_PROFILE_IMAGE_DEFAULT;
                            }
                            var driver_array = data[0].restaurant_documents;
                            var doc_array = docdata;
                            var arr = driver_array.concat(doc_array);
                            var results = [];
                            var idsSeen = {}, idSeenValue = {};
                            for (var i = 0, len = arr.length, id; i < len; ++i) {
                                id = arr[i].doc_name;
                                if (idsSeen[id] !== idSeenValue) {
                                    results.push(arr[i]);
                                    idsSeen[id] = idSeenValue;
                                }
                            }
                            res.send(results);
                        }
                    });
                }
            });
        }
        else {
            db.GetDocument('documents', { 'status': { $eq: 1 }, 'doc_for': 'restaurant' }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    }

    router.getsubCity = function (req, res) {
        //
        db.GetDocument('city', { 'cityname': req.body.value, 'status': { $ne: 0 } }, { area_management: 1 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {

                if (typeof docdata != 'undefined' && docdata.length > 0 && typeof docdata[0].area_management != 'undefined' && docdata[0].area_management.length > 0) {
                    docdata[0].area_management.sort(sortBy('area_name'));
                }

                res.send(docdata);
            }
        });
    };

    router.getsubCuisine = function (req, res) {
        db.GetOneDocument('cuisine', { 'name': req.body.value, 'status': { $ne: 0 } }, {}, {}, function (err, namedata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('cuisine', { 'parent_id': namedata._id, 'status': { $ne: 0 } }, { name: 1 }, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });
    };

    router.restaurantTimezones = function (req, res) {
        var timezone = require('moment-timezone');
        var moment = require("moment");
        var timeZones = timezone.tz.names();
        var offsetTmz = [];
        for (i in timeZones) {
            offsetTmz.push(timeZones[i] + ' ' + "(GMT" + moment.tz(timeZones[i]).format('Z') + ")");
        }
        res.send(offsetTmz);
    };

    router.getTax = function (req, res) {
        db.GetDocument('tax', { 'status': { $eq: 1 } }, {}, {}, function (err, taxdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(taxdata);
            }
        });
    };

    router.getstatetax = function (req, res) {
        db.GetOneDocument('tax', { 'country.name': req.body.country, 'state_name': req.body.state, 'status': { $eq: 1 } }, {}, {}, function (err, taxres) {
            if (err) { res.send(err); }
            else {
                res.send(taxres)
            }
        })
    };


    router.restaurantDashboard = function (req, res) {
        //drivers in top rating
        var query = { status: { '$ne': 0 } };
        var data = {};
        data.sortby = 'avg_ratings';
        data.orderby = parseInt(req.body.orderby) || -1;
        var sorting = {};
        sorting[data.sortby] = data.orderby;
        data.perPage = 5;

        var topratingList_condition = [
            { $match: query },
            { "$sort": sorting },
            { "$limit": data.perPage },
            {
                $project: {
                    username: 1,
                    restaurantname: 1,
                    deliverd: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            }
        ];

        var lquery = { status: { '$ne': 0 } };
        var ldata = {};
        ldata.sortby = 'avg_ratings';
        ldata.orderby = parseInt(req.body.orderby) || 1;
        var lsorting = {};
        lsorting[ldata.sortby] = ldata.orderby;
        ldata.perPage = 5;

        var LowestratingList_condition = [
            { $match: lquery },
            { "$sort": lsorting },
            { "$limit": ldata.perPage },
            {
                $project: {
                    username: 1,
                    restaurantname: 1,
                    deliverd: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            }
        ];

        var tquery = { status: { '$ne': 0 } };
        var tdata = {};
        tdata.sortby = 'deliverd';
        tdata.orderby = parseInt(req.body.orderby) || -1;
        var tsorting = {};
        tsorting[tdata.sortby] = tdata.orderby;
        tdata.perPage = 5;

        var topDeliList_condition = [
            { $match: tquery },
            { "$sort": tsorting },
            { "$limit": tdata.perPage },
            {
                $project: {
                    username: 1,
                    deliverd: 1,
                    restaurantname: 1,
                    avg_ratings: 1,
                    phone: 1,
                    email: 1
                }
            }
        ];

        db.GetAggregation('restaurant', topratingList_condition, function (err, topratingList) {
            if (err) {
                res.send(err)
            } else {
                db.GetAggregation('restaurant', LowestratingList_condition, function (err, LowestratingList) {
                    if (err) {
                        res.send(err)
                    } else {
                        db.GetAggregation('restaurant', topDeliList_condition, function (err, topDeliList) {
                            if (err) {
                                res.send(err)
                            } else {
                                // driver graphical representation
                                db.GetDocument('restaurant', { 'status': { $ne: 0 } }, {}, {}, function (err, driversdata) {
                                    if (err) {
                                        res.send(err);
                                    } else {
                                        var count = {};
                                        async.parallel([
                                            //new drivers
                                            function (callback) {
                                                db.GetCount('restaurant', { status: { $eq: 3 } }, function (err, new_rest) {
                                                    if (err) return callback(err);
                                                    count.new_rest = new_rest;
                                                    callback();
                                                });
                                            },
                                            //Active drivers
                                            function (callback) {
                                                db.GetCount('restaurant', { status: { $eq: 1 } }, function (err, active_rest) {
                                                    if (err) return callback(err);
                                                    count.active_rest = active_rest;
                                                    callback();
                                                });
                                            },
                                            //Deactive drivers
                                            function (callback) {
                                                db.GetCount('restaurant', { status: { $eq: 2 } }, function (err, inactivate) {
                                                    if (err) return callback(err);
                                                    count.inactivate = inactivate;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //disable drivers
                                                db.GetCount('restaurant', { status: { $eq: 4 } }, function (err, disable) {
                                                    if (err) return callback(err);
                                                    count.disable = disable;
                                                    callback();
                                                });
                                            },
                                            function (callback) {
                                                //deleted drivers
                                                db.GetCount('restaurant', { status: { $eq: 0 } }, function (err, deleted) {
                                                    if (err) return callback(err);
                                                    count.deleted = deleted;
                                                    callback();
                                                });
                                            }
                                        ], function (err) {
                                            if (err) return next(err);
                                            var totalCount = count;
                                            if (err || totalCount.length <= 0) {
                                                res.send([0, 0]);
                                            } else {
                                                res.send([topratingList, LowestratingList, topDeliList, totalCount]);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    router.restaurantsList = function (req, res) {

        db.GetDocument('restaurant', { 'main_city': req.body.city, 'status': { $ne: 0 } }, { restaurantname: 1 }, {}, function (err, docdata) {

            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.submitOffer = function (req, res) {
        var data = {};
        data.city = req.body.city;
        data.price = req.body.price;
        data.dis_percent = req.body.dis_percent;
        data.max_discount = req.body.max_discount;
        data.status = req.body.status || 0;
        data.restaurants = [];
        for (var i = 0; i <= req.body.rest_name.length - 1; i++) {
            data.restaurants.push(req.body.rest_name[i]._id)
        }
        if (req.body._id) {
            db.UpdateDocument('offer', { _id: req.body._id }, data, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
        else {
            db.InsertDocument('offer', data, function (err, result) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(result);
                }
            });
        }
    };

    router.Listoffer = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }

        if (req.body.sort) {
            var sorted = req.body.sort.field;
        }

        var pagesQuery = [{
            "$match": { $and: [{ status: { $ne: 0 } }, { parent: { $exists: false } }] }
        }, {
            $project: {
                city: 1,
                price: 1,
                createdAt: 1,
                status: 1,
                dname: { $toLower: '$' + sorted }
            }
        }, {
            $project: {
                city: 1,
                price: 1,
                status: 1,
                document: "$$ROOT"
            }
        }, {
            $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
        }];

        var condition = { status: { $ne: 0 } };
        pagesQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

        if (req.body.search) {
            condition['city'] = { $regex: new RegExp('^' + req.body.search, 'i') };
            var searchs = req.body.search;
            pagesQuery.push({ "$match": { "documentData.city": { $regex: searchs + '.*', $options: 'si' } } });
            //search limit
            pagesQuery.push({ $group: { "_id": null, "countvalue": { "$sum": 1 }, "documentData": { $push: "$documentData" } } });
            pagesQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
            if (req.body.limit && req.body.skip >= 0) {
                pagesQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            pagesQuery.push({ $group: { "_id": null, "count": { "$first": "$countvalue" }, "documentData": { $push: "$documentData" } } });
            //search limit
        }

        var sorting = {};
        if (req.body.sort) {
            var sorter = 'documentData.' + req.body.sort.field;
            sorting[sorter] = req.body.sort.order;
            pagesQuery.push({ $sort: sorting });
        } else {
            sorting["documentData.createdAt"] = -1;
            pagesQuery.push({ $sort: sorting });
        }

        if ((req.body.limit && req.body.skip >= 0) && !req.body.search) {
            pagesQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
        }
        //pagesQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

        if (!req.body.search) {
            pagesQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }

        db.GetAggregation('offer', pagesQuery, function (err, docdata) {
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


    router.getOfferEditdoc = function (req, res) {
        var data = {};
        var options = {};
        options.populate = 'restaurants';
        db.GetOneDocument('offer', { '_id': req.body._id, 'status': { $ne: 0 } }, {}, options, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                db.GetDocument('restaurant', { 'main_city': docdata.city, 'status': { $ne: 0 } }, { restaurantname: 1 }, {}, function (err, restdata) {
                    res.send([docdata, restdata]);
                });
            }
        });
    };

    router.deleteOffer = function (req, res) {
        req.checkBody('delData', 'Invalid delData').notEmpty();
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.DeleteDocument('offer', { _id: req.body.delData }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.resCatSave = function (req, res) {
        var data = {};
        data.status = req.body.value.status;
        data.name = req.body.value.name;
        data.description = req.body.value.description;
        data.avatarBase64 = req.body.value.avatarBase64;
        data.mainparent = 'yes';

        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_CATEGORIES + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.avatar = attachment.get_attachment(CONFIG.DIRECTORY_CATEGORIES, fileName);
            data.img_name = encodeURI(fileName);
            data.img_path = CONFIG.DIRECTORY_CATEGORIES.substring(2);
        }

        if (data.name == 'Recommended') {
            res.status(400).send({ message: "Category already added" });
        }
        else {

            db.GetOneDocument('categories', { '_id': req.body.value._id, 'status': { $ne: 0 } }, {}, {}, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    if (docdata) {
                        db.UpdateDocument('categories', { '_id': req.body.value._id }, data, function (err, result) {
                            if (err) {
                                res.send(err);
                            } else {
                                res.send(docdata.restaurant);
                            }
                        });
                    } else {
                        db.GetOneDocument('categories', { 'restaurant': req.body.value.restaurant, 'name': data.name }, {}, {}, function (err, docdata) {
                            if (err) {
                                res.send(err);
                            } else {
                                if (!docdata) {
                                    data.status = req.body.value.status;
                                    data.restaurant = req.body.value.restaurant;
                                    db.InsertDocument('categories', data, function (err, result) {
                                        if (err) {
                                            res.send(err);
                                        } else {
                                            res.send(data.restaurant);
                                        }
                                    });
                                } else {
                                    if (docdata.name = data.name) {
                                        res.send("exist");
                                        //res.send("category existing");
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
    }


    router.saveRecommended = function (req, res) {
        var test = [];
        for (var i in req.body.foods) {
            test.push(req.body.foods[i]._id)
        }
        db.GetOneDocument('categories', { 'restaurant': req.body.restaurant, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
            var catid = '';
            if (catdata && !err) {
                catid = catdata._id;
            }
            db.GetCount('food', { status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.restaurant), recommended: 1 }, function (err, allValue) {
                var test_count = allValue;
                if (test_count > test.length) {
                    test_count = test.length;
                }
                db.GetCount('food', { status: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.restaurant), 'categories': { $elemMatch: { 'category': catid } } }, function (err, allValues) {
                    var allva = 0;
                    if (allValues != undefined && allValues && allValues != 'undefined') {
                        allva = allValues;
                    }
                    var counts = parseInt(allva) + parseInt(test_count);
                    if (counts < 6) {
                        db.UpdateDocument('food', { shop: req.body.restaurant, status: 1 }, { recommended: 0 }, { multi: true }, function (err, doc) {
                            db.UpdateDocument('food', { _id: { $in: test } }, { recommended: 1 }, { multi: true }, function (err, docdata) {
                                if (err) {
                                    res.send(err);
                                } else {
                                    res.send(docdata)
                                }
                            });
                        });
                    } else {
                        res.status(400).send({ message: "We can add only six food in recommended list" });
                    }
                });
            });
        });
    }

    router.getRecomendedFoodList = function (req, res) {
        db.GetOneDocument('categories', { 'restaurant': req.body.id, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
            var recid = '';
            if (!err && catdata) {
                recid = catdata._id;
            } //else {
            var matc_query = {
                $or: [{ status: { $eq: 1 }, 'categories': { $not: { $elemMatch: { 'category': recid } } }, 'shop': new mongoose.Types.ObjectId(req.body.id) }, { status: { $eq: 1 }, recommended: { $ne: 1 }, 'categories': { $not: { $elemMatch: { 'category': recid } } }, 'shop': new mongoose.Types.ObjectId(req.body.id) }]
            }
            var categoryQuery = [{
                "$match": matc_query
            }, {
                $project: {
                    name: 1
                }
            }, {
                $project: {
                    name: 1,
                    document: "$$ROOT"
                }
            }, {
                $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
            }];



            var matched_query = {
                $or: [{ status: { $eq: 1 }, 'categories': { $not: { $elemMatch: { 'category': recid } } }, recommended: { $eq: 1 }, 'shop': new mongoose.Types.ObjectId(req.body.id) }, { status: { $eq: 1 }, recommended: { $eq: 1 }, 'categories': { $not: { $elemMatch: { 'category': recid } } }, 'shop': new mongoose.Types.ObjectId(req.body.id) }]
            }
            var foodQuery = [{
                "$match": matched_query
            }, {
                $project: {
                    name: 1
                }
            }, {
                $project: {
                    name: 1,
                    document: "$$ROOT"
                }
            }, {
                $group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
            }];

            db.GetAggregation('food', categoryQuery, function (err, docdata) {
                db.GetAggregation('food', foodQuery, function (err, fooddata) {
                    var foods = 0
                    if (fooddata[0]) {
                        foods = fooddata[0].documentData
                    }
                    if (err) {
                        res.send(err);
                    } else {
                        if (docdata.length != 0) {
                            res.send([docdata[0].documentData, docdata[0].count, foods]);
                        } else {
                            res.send([0, 0, foods]);
                        }
                    }
                });
            });
            // }
        });
    }

    router.resMaincatList = function (req, res) {
        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 }, 'name': { $ne: 'Recommended' }, 'mainparent': 'yes', 'restaurant': new mongoose.Types.ObjectId(req.body.id) }
        }, {
            $project: {
                name: 1,
                avatar: 1,
                parent: 1,
                restaurant: 1,
                description: 1,
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
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
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


    router.resRecomendedList = function (req, res) {
        db.GetOneDocument('categories', { 'restaurant': req.body.id, 'name': { $eq: 'Recommended' } }, {}, {}, function (err, catdata) {
            var recid = '';
            if (!err && catdata) {
                recid = catdata._id;
            }// else {
            if (req.body.sort != "") {
                var sorted = req.body.sort;
            }
            var matc_query = {
                $or: [{ status: { $ne: 0 }, recommended: 1, 'shop': new mongoose.Types.ObjectId(req.body.id) }, { status: { $ne: 0 }, 'categories': { $elemMatch: { 'category': recid } }, 'shop': new mongoose.Types.ObjectId(req.body.id) }]
            }
            var categoryQuery = [{
                "$match": matc_query
            }, {
                $project: {
                    name: 1,
                    avatar: 1,
                    price: 1,
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
            db.GetAggregation('food', categoryQuery, function (err, docdata) {
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
            //  }

        });
    }




    router.resMenuList = function (req, res) {
        var sorted = 'status';
        if (req.body.sort) {
            if (req.body.sort.field) {
                sorted = req.body.sort.field;
            }
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 }, 'shop': new mongoose.Types.ObjectId(req.body.id) }
        }, {
            $project: {
                name: 1,
                avatar: 1,
                price: 1,
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
                // categoryQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
                categoryQuery.push({ "$match": { $or: [{ "documentData.name": { $regex: searchs + '.*', $options: 'si' } }, { "documentData.price": { $regex: searchs + '.*', $options: 'si' } }] } });
            }

            var sorting = {};
            if (req.body.sort) {
                var sorter = 'documentData.' + sorted;
                sorting[sorter] = req.body.sort.order;
                categoryQuery.push({ $sort: sorting });
            } else {
                sorting["documentData.createdAt"] = -1;
                categoryQuery.push({ $sort: sorting });
            }

            if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            }
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('food', categoryQuery, function (err, docdata) {
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

    router.resSubcatList = function (req, res) {

        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }

        var categoryQuery = [{
            "$match": { status: { $ne: 0 }, 'mainparent': 'no', 'restaurant': new mongoose.Types.ObjectId(req.body.id) }
        }, {
            $project: {
                name: 1,
                avatar: 1,
                parent: 1,
                restaurant: 1,
                description: 1,
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
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
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

    router.resMaincatEdit = function (req, res) {
        db.GetDocument('categories', { '_id': req.body.value }, {}, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.resSubCatdata = function (req, res) {
        var options = {};
        options.populate = 'parent';
        db.GetOneDocument('categories', { '_id': req.body.value }, {}, options, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    }

    router.restcatList = function (req, res) {
        var regid = req.query.id;
        var matchQuery = {
            "status": { $ne: 0 }
        }
        var doc = [];
        if (!regid || regid == 'null') {
            res.send(doc);
        } else {
            matchQuery.parent = new mongoose.Types.ObjectId(regid)
            var subCategoryQuery = [{ "$match": matchQuery },
            { $project: { 'name': 1, 'parent': 1 } }];
            db.GetAggregation('categories', subCategoryQuery, function (err, docdata) {
                if (err) {
                    res.send(err);
                } else {
                    res.send(docdata);
                }
            });
        }
    }


    router.resSubCatSave = function (req, res) {

        var data = {};
        data.status = req.body.value.status;
        data.name = req.body.value.name;
        data.description = req.body.value.description;
        data.avatarBase64 = req.body.value.avatarBase64;
        data.mainparent = 'no';

        if (data.avatarBase64) {
            var base64 = data.avatarBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            var fileName = Date.now().toString() + '.png';
            var file = CONFIG.DIRECTORY_CATEGORIES + fileName;
            library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
            data.avatar = attachment.get_attachment(CONFIG.DIRECTORY_CATEGORIES, fileName);
            data.img_name = encodeURI(fileName);
            data.img_path = CONFIG.DIRECTORY_CATEGORIES.substring(2);
        }

        if (req.body.value._id) {
            db.UpdateDocument('categories', { '_id': req.body.value._id }, data, function (err, result) {
                db.GetOneDocument('categories', { '_id': req.body.value._id }, {}, {}, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        //console.log('docdata.restaurant', docdata.restaurant)
                        res.send(docdata.restaurant);
                    }
                });
            });
        }
        else {
            data.parent = req.body.value.subparent;
            if (!req.body.value.subparent || req.body.value.subparent.length == 4) {
                data.parent = req.body.value.parent;
            }
            db.GetOneDocument('food', { 'categories.category': data.parent }, {}, {}, function (err, fooddata) {
                if (fooddata) { res.status(400).send({ message: "Sorry this parent category already has food.!" }); }
                else {
                    db.GetOneDocument('categories', { '_id': data.parent }, {}, {}, function (err, docdata) {
                        db.UpdateDocument('categories', { '_id': data.parent }, { 'has_child': 'yes' }, {}, function (err, respo) { });
                        if (err) {
                            res.send(err);
                        } else {
                            //data.status = 1;
							db.GetOneDocument('categories', { 'restaurant': docdata.restaurant, 'parent': data.parent,'name': data.name  }, {}, {}, function (err, subcatData) {
								if(!subcatData){
									data.restaurant = docdata.restaurant;
									db.InsertDocument('categories', data, function (err, result) {
										if (err) {
											res.send(err);
										} else {
											res.send(data.restaurant);
											// console.log('docdata.restaurant', data.restaurant)
										}
									});
								}else{
									if (subcatData.name = data.name) {
                                        res.send("exist");
                                        //res.send("category existing");
                                    }
								}
							});
                        }
                    });
                }
            });
        }
    }

    router.MainCatDelete = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.DeleteDocument('categories', { _id: { $in: req.body.delData } }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.subCatDelete = function (req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.DeleteDocument('categories', { _id: { $in: req.body.delData } }, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.deactiveUsers = function (req, res) {
        db.UpdateDocument('restaurant', { _id: req.body.id }, { 'status': 0 }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };

    router.availability = function (req, res) {
        db.UpdateDocument('restaurant', { _id: { $ne: req.body.id } }, { status: 0 }, { multi: true }, function (err1, docdata1) {
            if (err1) {
                res.send(err1);
            } else {
                db.UpdateDocument('restaurant', { _id: req.body.id }, { status: 1 }, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            }
        });
    }

    router.restaurantDefault = function (req, res) {
        if (req.body.availability == 0) {
            db.UpdateDocument('restaurant', { _id: req.body.id }, { availability: 1, status: 1 }, { multi: true }, function (err1, docdata1) {
                if (err1) {
                    res.send(err1);
                }
                else {
                    res.send(docdata1);
                }
            });
        }
        else {
            db.UpdateDocument('restaurant', { _id: req.body.id }, { availability: 0 }, { multi: true }, function (err1, docdata1) {
                if (err1) {
                    res.send(err1);
                }
                else {
                    res.send(docdata1);
                }

            });
        }
    }
    router.getRestaurants = (req, res) => {
        var request = {};
        request.city = req.body.city;
        if (typeof req.body.area != 'undefined') {
            request.area = req.body.area;
        }
        else {
            request.area = '';
        }

        var query = { status: { $ne: 0 }, 'main_city': request.city };
        if (request.area) { query = { status: { $ne: 0 }, 'main_city': request.city, 'sub_city': request.area }; }
        var condition = [
            { $match: query },
            { "$project": { _id: 1, username: 1, role: 1, createdAt: 1, restaurantname: 1, status: 1, order_id: 1 } },
            {
                $sort: {
                    "createdAt": -1
                }
            }
        ];

        db.GetAggregation('restaurant', condition, function (err, restaurant) {
            if (err) {
                res.send({ status: 0, data: err })
            }
            else {
                res.send({ status: 1, data: restaurant });
            }
        });
    }

    router.saveBankDetails = function (req, res) {
        db.UpdateDocument('restaurant', { _id: req.body.id, 'status': { $ne: 0 } }, { 'banking_details': req.body.bank }, {}, function (err, docdata) {
            if (err) {
                res.send(err);
            } else {
                res.send(docdata);
            }
        });
    };


    router.changeRestaurantFeature = function (req, res) {
        db.GetOneDocument('restaurant', { _id: req.body.id }, {}, {}, function (err, userData) {
            if (userData.feature == 1) {
                userData.feature = 0;
                db.UpdateDocument('restaurant', { _id: req.body.id }, userData, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.send(docdata);
                    }
                });
            } else {
                if (userData.feature == 0) {
                    userData.feature = 1;
                    db.UpdateDocument('restaurant', { _id: req.body.id }, userData, function (err, docdata) {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send(docdata);
                        }
                    });
                }
            }

        });
    }


    router.uploadRestaurantFeature = function (req, res) {
        var userData = {};
        userData.feature = 1;
        db.GetDocument('settings', { 'alias': 'general' }, {}, {}, function (err, setData) {
            if (err) {
                res.send(err);
            } else {
                if (req.file) {
                    userData.feature_img = setData[0].settings.site_url + req.file.destination.substring(2) + req.file.filename;
                }
                //userData.feature_img = setData[0].settings.site_url + req.file.destination.substring(2) + req.file.filename;
                db.UpdateDocument('restaurant', { _id: req.body.id }, userData, function (err, docdata) {
                    if (err) {
                        res.send(err);
                    } else {

                        res.send(docdata);
                    }
                });
            }
        });

    }


    router.getFeaturedRestaurantList = function getFeaturedRestaurantList(req, res) {
        var errors = req.validationErrors();
        if (errors) {
            res.send(errors, 400);
            return;
        }
        db.GetOneDocument('restaurant', { '_id': req.body.id }, {}, {}, function (err, docdata) {
            if (err || !docdata) {
                res.send({ err: err, status: '0' });
            } else {
                res.send(docdata)
            }

        });
    };


    router.resMaincataList = function (req, res) {
        if (req.body.sort != "") {
            var sorted = req.body.sort;
        }
        var categoryQuery = [{
            "$match": { status: { $ne: 0 }, 'name': { $ne: 'Recommended' }, 'mainparent': 'yes', 'restaurant': new mongoose.Types.ObjectId(req.body.id) }
        }, {
            $project: {
                name: 1,
                avatar: 1,
                parent: 1,
                restaurant: 1,
                description: 1,
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
            /* if (req.body.limit != 'undefined' && req.body.skip != 'undefined') {
                categoryQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
            } */
            categoryQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
        }
        db.GetAggregation('categories', categoryQuery, function (err, docdata) {
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

    router.getrcategory = async (req, res) => {
        var data = {};
        console.log("is this entered to the getrcategory");
        const count = await db.GetCount('rcategory', { 'status': { $eq: 1 } })
        if ( count < 1) {
            data.status = 1;
            data.message = 'success';
            data.list = [];
            res.send(data);
        } else {
            const eachrun = 10;
            const loop = Math.ceil(count / eachrun);
            let categories = [];
            
            const fetchData = async (skip, limit) => {
                const query = [
                    { $match: { 'status': { $eq: 1 } } },
                    { $sort: { rcatname: 1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            rcatname: "$rcatname",
                            is_cuisine: 1,
                            is_fssai: 1
                        }
                    }
                ];
            
                return await db.GetAggregation('rcategory', query);
            };
            
            const getData = async () => {
                for (let loopcount = 1; loopcount <= loop; loopcount++) {
                    const limit = eachrun;
                    const skip = (eachrun * loopcount) - eachrun;
            
                    const catlist = await fetchData(skip, limit);
            
                    if (catlist && catlist.length > 0) {
                        categories = [...categories, ...catlist];
                    }
                }
            
                const data = {
                    status: 1,
                    message: 'success',
                    list: categories
                };
            
                console.log(data, 'this is the data from the another universe');
                res.send(data);
            };
            
            getData();
            
        }
        // db.GetCount('rcategory', { 'status': { $eq: 1 } }, (err, count) => {
        //     if (err || count < 1) {
        //         data.status = 1;
        //         data.message = 'success';
        //         data.list = [];
        //         res.send(data);
        //     } else {
        //         var eachrun = 10;
        //         var loop = Math.ceil(count / eachrun);
        //         var loopcount = 1;
        //         var categories = [];
        //         async.whilst(
        //             (cb) => {
        //                 cb(null, loopcount <= loop)
        //             },
        //             (callback) => {
        //                 var limit = eachrun;
        //                 var skip = ((eachrun * loopcount)) - eachrun;
        //                 var query = [
        //                     { $match: { 'status': { $eq: 1 } } },
        //                     { $sort: { rcatname: 1 } },
        //                     { $skip: skip },
        //                     { $limit: limit },
        //                     {
        //                         $project: {
        //                             rcatname: "$rcatname",
        //                             is_cuisine: 1,
        //                             is_fssai: 1
        //                         }
        //                     }
        //                 ];
        //                 db.GetAggregation('rcategory', query, (err, catlist) => {
        //                     if (catlist && catlist.length > 0) {
        //                         categories = [...categories, ...catlist];
        //                         loopcount++;
        //                         callback(null, loopcount);
        //                     } else {
        //                         loopcount++;
        //                         callback(null, loopcount);
        //                     }
        //                 });
        //             },
        //             () => {
        //                 data.status = 1;
        //                 data.message = 'success';
        //                 data.list = categories;
        //                 res.send(data);
        //             }
        //         );
        //     }
        // });
    }


    return router;
}
