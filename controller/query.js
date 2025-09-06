var express = require('express');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var db = require('../controller/adaptor/mongodb.js');
var async = require('async');
var syncEach = require('sync-each');
var mongoose = require('mongoose');
var fs = require('fs');
function isObjectId(n) {
		return mongoose.Types.ObjectId.isValid(n);
	}

Date.prototype.isValid = function () {
	return this.getTime() === this.getTime();
};
function IsJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}
/* 
Sample input
https://www.tazteeorder.com/query/get-query-count?collections=users&type=document&projection={"_id":"1","social_login":"1","email":"1"}&condition={"social_login.facebook_id":{"$exists":true}} */
router.get('/get-query-count', function (req, res) {
	var collections = req.query.collections;
	var conditionJson = req.query.condition;
	var projectionJson = req.query.projection;
	var from_date = req.query.from_date;
	var to_date = req.query.to_date;
	var _validCollections = ['users'];
	var blnValid = false;
	var condition = {};
	var projection = {};
	var isvalidcondition = true;
	if(typeof conditionJson != 'undefined' &&  conditionJson != ''){
		var isvalid = IsJsonString(conditionJson);
		if(isvalid){
			condition = JSON.parse(conditionJson);
		}else{
			isvalidcondition = false;
		}
	}
	var type = 'count';
	if(typeof req.query.type != 'undefined' && req.query.type !=''){
		console.log('req.query.type',req.query.type)
		if(req.query.type == 'count' || req.query.type == 'document'){
			type = req.query.type;
		}
	}
	var isvalidprojection = true;
	if(typeof projectionJson != 'undefined' &&  projectionJson != ''){
		var isvalid = IsJsonString(projectionJson);
		if(isvalid){
			projection = JSON.parse(projectionJson);
		}else{
			isvalidcondition = false;
		}
	}
	if(isvalidcondition){
		if(typeof collections != 'undefined' && collections != 'undefined' && typeof from_date != 'undefined' && from_date != 'undefined' && typeof to_date != 'undefined' && to_date != ''){
			var isValid = new Date(to_date).isValid();
			var isValid1 = new Date(from_date).isValid();
			if (!blnValid) {
				for (var j = 0; j < _validCollections.length; j++) {
					var cname = _validCollections[j];
					if (collections.toLowerCase() == cname.toLowerCase()) {
						blnValid = true;
						break;
					}
				}
			}
			if(isValid && isValid1 && blnValid){
				var t1 = from_date + ' 00:00:00';
				var t2 = to_date + ' 23:59:59';
				var con = {"createdAt": { '$gte': new Date(t1), '$lte': new Date(t2) }};
				if(Object.keys(condition).length > 0){
					Object.keys(condition).forEach(function(key) {
					  con[key] = condition[key];
					});
				}
				db.GetCount(collections,con, function (err, count) {
					res.send({status:'1',count:count});
				})
			}else{
				 res.send({status:'0',message:'invalid input'});
			}
		}else{
			 if(typeof collections != 'undefined' && collections != 'undefined'){
				if (!blnValid) {
					for (var j = 0; j < _validCollections.length; j++) {
						var cname = _validCollections[j];
						if (collections.toLowerCase() == cname.toLowerCase()) {
							blnValid = true;
							break;
						}
					}
				}
				if(blnValid){
					var con = {};
					if(Object.keys(condition).length > 0){
						Object.keys(condition).forEach(function(key) {
						  con[key] = condition[key];
						});
					}
					var projec = {};
					if(Object.keys(projection).length > 0){
						Object.keys(projection).forEach(function(key) {
						  projec[key] = projection[key];
						});
					}
					if(type == 'count'){
						db.GetCount(collections,con, function (err, count) {
							res.send({status:'1',count:count});
						})
					}else{
						db.GetDocument(collections,con, projec,{},function (err, result) {
						console.log('err, result',err, result)
							res.send({status:'1',result:result});
						})
					}						
				}else{
					 res.send({status:'0',message:'invalid input'});
				}
			}else{
				 res.send({status:'0',message:'invalid input'});
			}
		}
	}else{
		res.send({status:'0',message:'invalid condition'});
	}
});
var editJsonFile = require("edit-json-file");
router.get('/create-restaurant-storage', function (req, res) {
	db.GetDocument('restaurant',{}, {},{}, function (err, GetMessageValue) {
		var each = require('sync-each');
		if(typeof GetMessageValue != 'undefined' && GetMessageValue.length > 0 ){
			each(GetMessageValue,
				function (message,next) {
					var jsonfile = editJsonFile('restaurantList.json', {stringify_width :0.1});
					var restaurantList = jsonfile.get('restaurantList');
					var index_posi = restaurantList.map(function (e) {
						return e._id.toString()}).indexOf(message._id.toString());
					if(index_posi != -1){
						restaurantList[index_posi] = message;
					}else{
						restaurantList.push(message);
					}
					jsonfile.set("restaurantList",restaurantList);
					jsonfile.set("last_update_timestamp",Date.now());
					jsonfile.save();
					process.nextTick(next);
				},
				function (err,transformedItems) {
					res.send('sucess');
				}
			);
		}else{
			res.send('sucess');
		}
	})
});

router.get('/create-category-storage', function (req, res) {
var editJsonFile = require("edit-json-file");
	db.GetDocument('categories',{}, {},{}, function (err, GetMessageValue) {
		var each = require('sync-each');
		if(typeof GetMessageValue != 'undefined' && GetMessageValue.length > 0 ){
			each(GetMessageValue,
				function (message,next) {
					var jsonfile = editJsonFile('siteManagement.json', {stringify_width :0.1});
					var categoryList = jsonfile.get('categoryList');
					var index_posi = categoryList.map(function (e) {
						return e._id.toString()}).indexOf(message._id.toString());
					if(index_posi != -1){
						categoryList[index_posi] = message;
					}else{
						categoryList.push(message);
					}
					jsonfile.set("categoryList",categoryList);
					jsonfile.set("last_update_timestamp",Date.now());
					jsonfile.save();
					process.nextTick(next);
				},
				function (err,transformedItems) {
					res.send('sucess');
				}
			);
		}else{
			res.send('sucess');
		}
	})
});
router.get('/create-category-storage', function (req, res) {
var editJsonFile = require("edit-json-file");
	db.GetDocument('categories',{}, {},{}, function (err, GetMessageValue) {
		var each = require('sync-each');
		if(typeof GetMessageValue != 'undefined' && GetMessageValue.length > 0 ){
			each(GetMessageValue,
				function (message,next) {
					var jsonfile = editJsonFile('siteManagement.json', {stringify_width :0.1});
					var categoryList = jsonfile.get('categoryList');
					var index_posi = categoryList.map(function (e) {
						return e._id.toString()}).indexOf(message._id.toString());
					if(index_posi != -1){
						categoryList[index_posi] = message;
					}else{
						categoryList.push(message);
					}
					jsonfile.set("categoryList",categoryList);
					jsonfile.set("last_update_timestamp",Date.now());
					jsonfile.save();
					process.nextTick(next);
				},
				function (err,transformedItems) {
					res.send('sucess');
				}
			);
		}else{
			res.send('sucess');
		}
	})
});
router.get('/create-cuisine-storage', function (req, res) {
var editJsonFile = require("edit-json-file");
	db.GetDocument('cuisine',{}, {},{}, function (err, GetMessageValue) {
		var each = require('sync-each');
		if(typeof GetMessageValue != 'undefined' && GetMessageValue.length > 0 ){
			each(GetMessageValue,
				function (message,next) {
					var jsonfile = editJsonFile('siteManagement.json', {stringify_width :0.1});
					var cuisineList = jsonfile.get('cuisineList');
					var index_posi = cuisineList.map(function (e) {
						return e._id.toString()}).indexOf(message._id.toString());
					if(index_posi != -1){
						cuisineList[index_posi] = message;
					}else{
						cuisineList.push(message);
					}
					jsonfile.set("cuisineList",cuisineList);
					jsonfile.set("last_update_timestamp",Date.now());
					jsonfile.save();
					process.nextTick(next);
				},
				function (err,transformedItems) {
					res.send('sucess');
				}
			);
		}else{
			res.send('sucess');
		}
	})
});

router.get('/create-restaurant-food-storage', function (req, res) {
	var editJsonFile = require("edit-json-file");
	var jsonfile = editJsonFile('restaurantList.json', {stringify_width :0.1});
	var restaurantList = jsonfile.get('restaurantList');
	var each = require('sync-each');
	each(restaurantList,
		function (message,next) {
			var editJsonFile1 = require("edit-json-file");
			var jsonfile1 = editJsonFile1('./restaurantJson/'+ message._id + '.json', {stringify_width :0.1});	
			jsonfile1.set("restaurantList",message);
			jsonfile1.set("last_update_timestamp",Date.now());
			db.GetDocument('food',{shop:message._id}, {},{}, function (err, foodList) {
				if(typeof foodList != 'undefined' && foodList.length > 0 ){
					console.log('message._id',message._id,foodList.length)
					jsonfile1.set("foodList",foodList);
					jsonfile1.save();
					process.nextTick(next);
				}else{
					jsonfile1.set("foodList",[]);
					jsonfile1.save();
					process.nextTick(next);
				}
			})
		},
		function (err,transformedItems) {
			res.send('sucess');
		}
	);
});
router.get('/get-restaurant-details', function (req, res) {
	var restaurant_id;
	if(typeof req.query.restaurant_id !='undefined' ){
		if(isObjectId(req.query.restaurant_id)){
			restaurant_id = new mongoose.Types.ObjectId(req.query.restaurant_id);
		}else{
			res.send({status: '0',message:'Invalid restaurant_id'});
			return;
		}
	}else{
		res.send({status: '0',message:'Invalid restaurant_id'});
		return;
	}
	var status;
	if(typeof req.query.status !='undefined' ){
		if(req.query.status == '1' || req.query.status == '0'){
			status = req.query.status;
		}else{
			res.send({status: '0',message:'Invalid status'});
			return;
		}
	}else{
		res.send({status: '0',message:'Invalid status'});
		return;
	}
	var timestamp;
	if(typeof req.query.timestamp !='undefined' && req.query.timestamp != ''){
		timestamp = parseInt(req.query.timestamp);
	}
	var editJsonFile = require("edit-json-file");
	var jsonfile = editJsonFile('./restaurantJson/'+ restaurant_id.toString() + '.json', {stringify_width :0.1});	
	var restaurantList = jsonfile.get("restaurantList");
	var last_update_timestamp = jsonfile.get("last_update_timestamp");
	var foodList = jsonfile.get("foodList");
	if(typeof restaurantList != 'undefined' && typeof restaurantList._id != 'undefined'){
		if(status == '0' && typeof last_update_timestamp != 'undefined' && last_update_timestamp == timestamp){
			res.send({status: '2',message:'No changes'});
			return;
		}
	}else{
		res.send({status: '0',message:'Invalid record'});
		return;
	}
	var data = {};
	data.restaurantList = {username:restaurantList.username,_id:restaurantList._id,restaurantname:restaurantList.restaurantname,slug:restaurantList.slug,time_setting:restaurantList.time_setting,avg_ratings:restaurantList.avg_ratings,food_img:restaurantList.food_img,offer:restaurantList.offer,about:restaurantList.about,logo:restaurantList.logo,avatar:restaurantList.avatar,distance:restaurantList.distance,main_cuisine:restaurantList.main_cuisine,efp_time:restaurantList.efp_time,location:restaurantList.location,avail:restaurantList.avail,avg_delivery:restaurantList.avg_delivery,deliverd:restaurantList.deliverd,cancelled:restaurantList.cancelled,categories:restaurantList.categories,availability:restaurantList.availability,phone:restaurantList.phone,address:restaurantList.address};
	data.last_update_timestamp = last_update_timestamp;
	var sitemanagementjsonfile = editJsonFile('siteManagement.json', {stringify_width :0.1});
	var categoryList = sitemanagementjsonfile.get("categoryList");
	var restaurantCategorys = [];
	if(typeof categoryList != 'undefined' && categoryList.length > 0){
		restaurantCategorys = categoryList.filter(function(e){ return e.restaurant.toString() == restaurant_id.toString() && e.status == 1});
	}
	var mainCategories = [];
	if(typeof restaurantCategorys != 'undefined' && restaurantCategorys.length > 0){
		mainCategories = restaurantCategorys.filter(function(e){ return e.mainparent == 'yes'});
	}
	var finalResult = [];
	for(var i = 0;i<mainCategories.length;i++){
		var insertmaincategory = {};
		insertmaincategory.restaurant =  mainCategories[i].restaurant;
		insertmaincategory.name =  mainCategories[i].name;
		insertmaincategory._id =  mainCategories[i]._id;
		var subCategories = restaurantCategorys.filter(function(e){ return e.parent && e.parent.toString() == mainCategories[i]._id.toString()});
		insertmaincategory.subCategoriesLength = 0;
		insertmaincategory.subCategories = [];
		if(subCategories.length >0){
			insertmaincategory.subCategoriesLength = subCategories.length;
			for(var j=0;j<subCategories.length;j++){
				var insertsubcategory = {};
				insertsubcategory.name =  subCategories[j].name;
				insertsubcategory._id =  subCategories[j]._id;
				insertsubcategory.foodDetails =  [];
				var subcategoryfoodDetails = foodList.filter(function(e){ return e.categories.length > 0 && (e.categories.map(function (e) {return e.category.toString()}).indexOf(subCategories[j]._id.toString()) != -1) });
				if(typeof subcategoryfoodDetails != 'undefined' && subcategoryfoodDetails.length > 0){
					insertsubcategory.foodDetails = subcategoryfoodDetails;
				}
				insertmaincategory.subCategories.push(insertsubcategory);
			}
			insertmaincategory.subCategories  = insertmaincategory.subCategories.filter(function(e){ return e.foodDetails.length > 0 });
		}
		insertmaincategory.foodDetails = [];
		if(insertmaincategory.subCategoriesLength ==0 ||  mainCategories[i].name == 'Recommended'){
			var maincategoryfoodDetails = foodList.filter(function(e){ return e.categories.length > 0 && (e.categories.map(function (e) {return e.category.toString()}).indexOf(mainCategories[i]._id.toString()) != -1) });
			if(typeof maincategoryfoodDetails != 'undefined' && maincategoryfoodDetails.length > 0){
				insertmaincategory.foodDetails = maincategoryfoodDetails;
			}
		}
		finalResult.push(insertmaincategory);
	}
	finalResult = finalResult.filter(function(e){ return (e.foodDetails.length > 0 || e.subCategories.length > 0) });
	data.mainCategories = finalResult;
	res.send({status: '1',message:'',response:data});
});
router.get('/get-restaurant-list', function (req, res) {
	var jsonfile = editJsonFile('restaurantList.json', {stringify_width :0.1});	
	var restaurantList = jsonfile.get("restaurantList");
	var data = {};
	data.restaurantList = restaurantList;
	res.send({status: '1',message:'',response:data});
});
router.get('/clear-order-related-db', function (req, res) {
	var username = '';
	if(typeof req.query.username != 'undefined' && req.query.username != ''){
		username = req.query.username;
	}else{
		res.send({err: 1,msg:  'invalid username'});
		return;
	}
	var password = '';
	if(typeof req.query.password != 'undefined' && req.query.password != ''){
		password = req.query.password;
	}else{
		res.send({err: 1,msg:  'invalid password'});
		return;
	}
	if(username != '' && password != ''){
		db.GetOneDocument('admins', { 'username': username, 'role': 'admin', 'status': 1 }, {}, {}, function (err, user) {
			if (err) {
				res.send({err: 1,msg:  'something went to wrong'});
				return;
			} else {
				if (!user || !user.validPassword(password)) {
					res.send({err: 1,msg:  'You are not authorized admin. Verify that you are using valid credentials'});
					return;
				} else {
					console.log('is comming')
					db.DeleteDocument('orders', {},function (err, currentUser) {
						db.DeleteDocument('driver_earnings', {},function (err, currentUser) {
							db.DeleteDocument('restaurant_earnings', {},function (err, currentUser) {
								db.DeleteDocument('billing', {},function (err, currentUser) {
									db.DeleteDocument('temp_cart', {},function (err, currentUser) {
										db.DeleteDocument('cart', {},function (err, currentUser) {
											res.send('Db Cleared successfully.')
										})
									})
								})
							})
						})
					})
				}
			}
		})
	}else{
		res.send({err: 1,msg:  'Some filed is missing'});
	}
})
router.get('/clear-db', function (req, res) {
	var username = '';
	if(typeof req.query.username != 'undefined' && req.query.username != ''){
		username = req.query.username;
	}else{
		res.send({err: 1,msg:  'invalid username'});
		return;
	}
	var password = '';
	if(typeof req.query.password != 'undefined' && req.query.password != ''){
		password = req.query.password;
	}else{
		res.send({err: 1,msg:  'invalid password'});
		return;
	}
	if(username != '' && password != ''){
		db.GetOneDocument('admins', { 'username': username, 'role': 'admin', 'status': 1 }, {}, {}, function (err, user) {
			if (err) {
				res.send({err: 1,msg:  'something went to wrong'});
				return;
			} else {
				if (!user || !user.validPassword(password)) {
					res.send({err: 1,msg:  'You are not authorized admin. Verify that you are using valid credentials'});
					return;
				} else {
					console.log('is comming')
					db.DeleteDocument('driver_wallet', {},function (err, currentUser) {
						db.DeleteDocument('users', {},function (err, currentUser) {
							db.DeleteDocument('transaction', {},function (err, currentUser) {
								db.DeleteDocument('temp_payment', {},function (err, currentUser) {
									db.DeleteDocument('temp_cart', {},function (err, currentUser) {
										db.DeleteDocument('tax', {},function (err, currentUser) {
											db.DeleteDocument('restaurant_earnings', {},function (err, currentUser) {
												db.DeleteDocument('restaurant', {},function (err, currentUser) {
													db.DeleteDocument('refer_coupon', {},function (err, currentUser) {
														db.DeleteDocument('ratings', {},function (err, currentUser) {
															db.DeleteDocument('question', {},function (err, currentUser) {
																db.DeleteDocument('orders', {},function (err, currentUser) {
																	db.DeleteDocument('order_address', {},function (err, currentUser) {
																		db.DeleteDocument('notifications', {},function (err, currentUser) {
																			db.DeleteDocument('food', {},function (err, currentUser) {
																				db.DeleteDocument('experience', {},function (err, currentUser) {
																					db.DeleteDocument('drivers', {},function (err, currentUser) {
																						db.DeleteDocument('driver_wallet', {},function (err, currentUser) {
																							db.DeleteDocument('driver_earnings', {},function (err, currentUser) {
																								db.DeleteDocument('city', {},function (err, currentUser) {
																									db.DeleteDocument('categories', {},function (err, currentUser) {
																										db.DeleteDocument('cart', {},function (err, currentUser) {
																											res.send('Db Cleared successfully.')
																										})
																									})
																								})
																							})
																						})
																					})
																				})
																			})
																		})
																	})
																})
															})
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				}
			}
		})
	}else{
		res.send({err: 1,msg:  'Some filed is missing'});
	}
	})
	
	router.get('/remove-user', function (req, res) {
		var user_id;
		if(typeof req.query.user_id !='undefined' ){
			if(isObjectId(req.query.user_id)){
				user_id = new mongoose.Types.ObjectId(req.query.user_id);
			}else{
				res.send({status: '0',message:'Invalid user_id'});
				return;
			}
		}else{
			res.send({status: '0',message:'Invalid user_id'});
			return;
		}
		var username = '';
		if(typeof req.query.username != 'undefined' && req.query.username != ''){
			username = req.query.username;
		}else{
			res.send({err: 1,msg:  'invalid username'});
			return;
		}
		var password = '';
		if(typeof req.query.password != 'undefined' && req.query.password != ''){
			password = req.query.password;
		}else{
			res.send({err: 1,msg:  'invalid password'});
			return;
		}
		
		 db.GetOneDocument('users', {'_id':user_id}, {}, {}, function (err, userList){
			if(err){
				res.send({status: '0',message:'Invalid user'});
				return;
			}else{
				if(userList && typeof userList._id != 'undefined'){
					if(username != '' && password != ''){
						db.GetOneDocument('admins', { 'username': username, 'role': 'admin', 'status': 1 }, {}, {}, function (err, user) {
							if (err) {
								res.send({err: 1,msg:  'something went to wrong'});
								return;
							} else {
								if (!user || !user.validPassword(password)) {
									res.send({err: 1,msg:  'You are not authorized admin. Verify that you are using valid credentials'});
									return;
								} else {
									db.DeleteDocument('users', {'_id':user_id}, function (err, deldata) {
										res.send({status: '1',message:'user removed successfully..'});
										return;
									}); 
								}
							}
						})
					}else{
						res.send({err: 1,msg:  'Some filed is missing'});
					}
				}else{
					res.send({status: '0',message:'record not found..'});
					return;
					
				}
			}
		 })
	})
	
	router.get('/site-config', function (req, res) {
		var site_name = '';
		if(typeof req.query.site_name != 'undefined' && req.query.site_name != ''){
			site_name = req.query.site_name;
		}
		var site_url = '';
		if(typeof req.query.site_url != 'undefined' && req.query.site_url != ''){
			site_url = req.query.site_url;
		}
		db.GetOneDocument('settings', { alias: 'general' }, {}, {}, function (err, settings) {
			if(typeof settings.settings.site_title != 'undefined' && site_name != ''){
				db.UpdateDocument('settings', { _id: settings._id }, { 'settings.site_title': site_name}, {}, function (err, updateData) {
				})
			}
			if(typeof settings.settings.site_url != 'undefined' && site_url != ''){
				db.UpdateDocument('settings', { _id: settings._id }, { 'settings.site_url': site_url}, {}, function (err, updateData) {
				})
			}
		})
		db.GetOneDocument('settings', { alias: 'seo' }, {}, {}, function (err, settings) {
			if(typeof settings.settings.seo_title != 'undefined' && site_name != ''){
				var meta_description = settings.settings.meta_description.replace(/Site Name/g, site_name);
				var focus_keyword = settings.settings.focus_keyword.replace(/Site Name/g, site_name);
				db.UpdateDocument('settings', { _id: settings._id }, { 'settings.seo_title': site_name,'settings.focus_keyword':focus_keyword,'settings.meta_description':meta_description}, {}, function (err, updateData) {
				})
			}
		})
		db.GetOneDocument('settings', { alias: 'widgets' }, {}, {}, function (err, settings) {
			var updateDatas = {};
			if(typeof settings.settings.footer_widgets_1 != 'undefined' && site_name != ''){
				updateDatas['settings.footer_widgets_1'] = settings.settings.footer_widgets_1.replace(/Site Name/g, site_name);
			}
			if(typeof settings.settings.footer_widgets_2 != 'undefined' && site_name != ''){
				updateDatas['settings.footer_widgets_2'] = settings.settings.footer_widgets_2.replace(/Site Name/g, site_name);
			}
			if(typeof settings.settings.footer_widgets_3 != 'undefined' && site_name != ''){
				updateDatas['settings.footer_widgets_3'] = settings.settings.footer_widgets_3.replace(/Site Name/g, site_name);
			}
			if(typeof settings.settings.footer_widgets_4 != 'undefined' && site_name != ''){
				updateDatas['settings.footer_widgets_4'] = settings.settings.footer_widgets_4.replace(/Site Name/g, site_name);
			}
			if(typeof settings.settings.footer_widgets_5 != 'undefined' && site_name != ''){
				updateDatas['settings.footer_widgets_5'] = settings.settings.footer_widgets_5.replace(/Site Name/g, site_name);
			}
			if(Object.keys(updateDatas).length > 0){
				db.UpdateDocument('settings', { _id: settings._id }, updateDatas, {}, function (err, updateData) {
				})
			}
		})
		var each = require('sync-each');
		db.GetDocument('postheader',{}, {},{}, function (err, GetMessageValue) {
			if(typeof GetMessageValue != 'undefined' && GetMessageValue.length > 0 ){
				each(GetMessageValue,
					function (message,next) {
						var updateData = {};
						if(typeof message.title != 'undefined' && message.title != 'null'){
							updateData.title = message.title.replace(/Site Name/g, site_name);
						}
						if(typeof message.name != 'undefined' && message.name != 'null'){
							updateData.name = message.name.replace(/Site Name/g, site_name);
						}
						if(typeof message.description1 != 'undefined' && message.description1 != 'null'){
							updateData.description1 = message.description1.replace(/Site Name/g, site_name);
						}
						if(typeof message.description != 'undefined' && message.description != 'null'){
							updateData.description = message.description.replace(/Site Name/g, site_name);
						}
						if(Object.keys(updateData).length > 0){
							db.UpdateDocument('postheader', { _id: message._id }, updateData, {}, function (err, updateData) {
								process.nextTick(next);
							})
						}else{
							process.nextTick(next);
						}
					},
					function (err,transformedItems) {
					}
				);
			}
		})
		db.GetDocument('emailtemplate',{}, {},{}, function (err, GetMessageValue) {
			if(typeof GetMessageValue != 'undefined' && GetMessageValue.length > 0 ){
				each(GetMessageValue,
					function (message,next) {
						var updateData = {};
						if(typeof message.name != 'undefined' && message.name != 'null'){
							updateData.name = message.name.replace(/sitename/g, site_name);
						}
						if(typeof message.sender_email != 'undefined' && message.sender_email != 'null'){
							updateData.sender_email = message.sender_email.replace(/sitename/g, site_name);
						}
						if(typeof message.email_header != 'undefined' && message.email_header != 'null'){
							updateData.email_header = message.email_header.replace(/sitename/g, site_name);
						}
						if(typeof message.email_footer != 'undefined' && message.email_footer != 'null'){
							updateData.email_footer = message.email_footer.replace(/sitename/g, site_name);
						}
						if(Object.keys(updateData).length > 0){
							db.UpdateDocument('emailtemplate', { _id: message._id }, updateData, {}, function (err, updateData) {
								process.nextTick(next);
							})
						}else{
							process.nextTick(next);
						}
					},
					function (err,transformedItems) {
					}
				);
			}
		})
		res.send('Success')
	})
	router.get('/update-city-empty-array', function (req, res) {
		var each = require('sync-each');
		db.GetDocument('city',{}, {},{}, function (err, cityList) {
			if(cityList && cityList.length > 0){
				each(cityList,function(item,next){
					var area_management = item.area_management;
					var new_array = [];
					for(var i =0;i<area_management.length;i++){
						if(area_management[i] && typeof area_management[i]._id != 'undefined'){
							new_array.push(area_management[i]);
						}
					}
					console.log('new_array',new_array)
					db.UpdateDocument('city', { '_id': item._id }, {'area_management':new_array}, {multi:true}, function (err, response) {
						next();
					})
				},function(err,transformedItems){
					res.send({cityList:cityList});
				})
			}else{
				res.send({cityList:cityList});
			}
		})
	})
		
	router.get('/remove-old-user', function (req, res) {
		var user_id;
		if(typeof req.query.user_id !='undefined' ){
			if(isObjectId(req.query.user_id)){
				user_id = new mongoose.Types.ObjectId(req.query.user_id);
			}else{
				res.send({status: '0',message:'Invalid user_id'});
				return;
			}
		}else{
			res.send({status: '0',message:'Invalid user_id'});
			return;
		}
		 db.GetOneDocument('users', {'_id':user_id}, {}, {}, function (err, userList){
			if(err){
				res.send({status: '0',message:'Invalid user'});
				return;
			}else{
				if(userList && typeof userList._id != 'undefined'){
					db.DeleteDocument('users', {'_id':user_id}, function (err, deldata) {
						res.send({status: '1',message:'user removed successfully..'});
						return;
					}); 
				}else{
					res.send({status: '0',message:'record not found..'});
					return;
					
				}
			}
		 })
	})
	router.get('/update-product',(req, res)=>{
		db.GetDocument('food',{status: 1},{},{},(error, docData)=>{
			if(error){
				return res.send({status: 0, message: error.message})
			} else{
				syncEach(docData,(value, next)=>{
					var size = ['S','M','L','XL','XXL','XXXL'];
					db.UpdateDocument('food',{_id: mongoose.Types.ObjectId(value._id)},{$set:{"size": size}},{},(error, result)=>{
						next()
					})
				},(err, result)=>{
					res.send({status: 1, message: "Successfully updated"})
				})
			}
		})
	})
	router.get('/product/size-quantity',(req, res)=>{
		db.GetDocument('food',{size_status : 1},{},{},(error, docData)=>{
			if(error){
				return res.send({status: 0, message: "ERROR: "+error.message})
			} else{
				syncEach(docData,(value, next)=>{
					const quantity_size = [
						{size: 'S', quantity: 5, status: 1},
						{size: 'M', quantity: 3, status: 1},
						{size: 'L', quantity: 5, status: 1},
						{size: 'XL', quantity: 2, status: 1},
						{size: 'XXL', quantity: 3, status: 1},
						{size: 'XXXL', quantity: 1, status: 1},
					  ]
					var size = ['S','M','L','XL','XXL','XXXL'];
					db.UpdateDocument('food',{_id: mongoose.Types.ObjectId(value._id)},{$set:{"quantity_size": quantity_size,"size_status": 1}, $unset:{size:1, quantity: 1}},{},(error, result)=>{
						next()
					})
				},(err, result)=>{
					res.send({status: 1, message: "Successfully updated"})
				})
			}
		})
	})
	router.get('/product/quantity',(req, res)=>{
		db.GetDocument('food',{rcategory:{$ne:mongoose.Types.ObjectId("6493f6a3df101f1c8869fe79")}},{},{},(error, docData)=>{
			if(error){
				return res.send({status: 0, message: error.message})
			} else{
				syncEach(docData,(value, next)=>{
					db.UpdateDocument('food',{_id: mongoose.Types.ObjectId(value._id)},{$set:{"size_status": 2},$unset:{"size": 1}},{},(error, result)=>{
						next()
					})
				},(err, result)=>{
					res.send({status: 1, message: "Successfully updated"})
				})
			}
		})
	})
module.exports = router;
