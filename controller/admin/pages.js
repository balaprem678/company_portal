//"use strict";

module.exports = function () {
	var mongoose = require('mongoose');
	var db = require('../../controller/adaptor/mongodb.js');
	var async = require("async");
	var library = require('../../model/library.js');
	var CONFIG = require('../../config/config.js');
	var attachment = require('../../model/attachments.js');

	var controller = {};

	controller.submitFooterData = function (req, res) {

		var data = {};
		data.seo = {};
		data.name = 'footery'
		data.description = req.body.data.description;
		data.css_script = req.body.data.css_script;
		data.seo.title = req.body.data.seo.title;
		data.seo.keyword = req.body.data.seo.keyword;
		data.seo.description = req.body.data.seo.description;
		data.slug = req.body.data.slug || 'footery';
		data.status = 3;

		db.GetOneDocument('pages', { 'name': 'footery' }, {}, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				//if(docdata){}
				if (docdata) {
					db.UpdateDocument('pages', { _id: docdata._id }, data, function (err, result) {
						if (err) {
							res.send(err);
						} else {
							res.send({ message: 'Footer Content Updated Successfully' });
						}
					});
				} else {
					db.InsertDocument('pages', data, function (err, result) {
						if (err) {
							res.send(err);
						} else {
							res.send({ message: 'Footer Content Updated Successfully' });
						}
					});
				}
			}
		});
	}


	controller.submitmainpage = async function (req, res) {
		var data = {};
		data.seo = {};
		data.name = req.body.data.name;
		data.description = req.body.data.description;
		data.css_script = req.body.data.css_script;
		data.seo.title = req.body.data.seo.title;
		data.seo.keyword = req.body.data.seo.keyword;
		data.seo.description = req.body.data.seo.description;
		data.slug = req.body.data.slug;
		data.category = req.body.data.category;
		data.status = req.body.data.status;
		data.url = req.body.data.url;
		if (req.body.data.language) {
			data.language = req.body.data.language;
		}
		if (req.body.data.parent) {
			data.parent = req.body.data.parent;
		}
		if (req.body.data._id) {
			const result = await db.UpdateDocument('pages', { _id: new mongoose.Types.ObjectId(req.body.data._id) }, data)
			if (!result) {
				res.send({ status: "0", message: 'Already Page Url Exits' });
			} else {
				res.send({ status: "1", message: 'Pages Updated Successfully' });
			}
			// db.UpdateDocument('pages', { _id: new mongoose.Types.ObjectId(req.body.data._id) }, data, function (err, result) {
			// 	if (err) {
			// 		res.send({ status:"0",message: 'Already Page Url Exits' });
			// 	} else {
			// 		res.send({ status:"1", message: 'Pages Updated Successfully' });
			// 	}
			// });
		} else {
			const docdata = await db.GetOneDocument('pages', { $and: [{ language: new mongoose.Types.ObjectId(data.language) }, { parent: new mongoose.Types.ObjectId(data.parent) }] }, {}, {})
			if (docdata.status) {
				var data1 = "Assigned";
				res.send({ status: "1", message: 'Assigned' });
			} else {
				const result = await db.InsertDocument('pages', data)
				if (!result) {
					res.send({ status: "0", message: 'Already Page Url Exits' });
				} else {
					res.send({ status: "1", message: 'Pages Added Successfully' });
				}
				// db.InsertDocument('pages', data, function (err, result) {
				// 	if (err) {
				// 		res.send({ status:"0",message: 'Already Page Url Exits' });
				// 	} else {
				// 		res.send({status:"1", message: 'Pages Added Successfully' });
				// 	}
				// });
			}
			// db.GetOneDocument('pages', { $and: [{ language: new mongoose.Types.ObjectId(data.language) }, { parent: new mongoose.Types.ObjectId(data.parent) }] }, {}, {}, function (err, docdata) {
			// 	if (docdata) {
			// 		var data1 = "Assigned";
			// 		res.send({ status:"1",message: 'Assigned' });
			// 	} else {
			// 		db.InsertDocument('pages', data, function (err, result) {
			// 			if (err) {
			// 				res.send({ status:"0",message: 'Already Page Url Exits' });
			// 			} else {
			// 				res.send({status:"1", message: 'Pages Added Successfully' });
			// 			}
			// 		});
			// 	}
			// });

		}
	}

	controller.translatelanguage = function (req, res) {
		var count = {};
		async.parallel([
			function (callback) {
				db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { parent: { $exists: false } }] }, {}, {}, function (err, pagesdata) {
					if (err) return callback(err);
					count.pagesdata = pagesdata;
					callback();
				});
			},
			function (callback) {
				db.GetDocument('languages', { status: { $ne: 0 } }, {}, {}, function (err, languagedata) {
					if (err) return callback(err);
					count.languagedata = languagedata;
					callback();
				});

			}
		], function (err) {
			//console.log("count",count);
			if (err) return next(err);
			if (err) {
				res.send([0, 0]);
			} else {
				res.send(count);
			}
		});
	}

	controller.getPageSetting = function (req, res) {
		db.GetOneDocument('settings', { "alias": "pages_category" }, {}, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	}


	controller.deletecategorypage = function (req, res) {
		db.UpdateDocument('settings', { "alias": "pages_category", settings: { $elemMatch: { name: req.body.delData } } }, { $pull: { "settings": { name: req.body.delData } } }, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	}


	/*controller.submitcategoryPage = function (req, res) {
		var data = {};
		data.name = req.body.data.name;
		data.title = req.body.data.title;
		data.position = req.body.data.position;


		db.GetOneDocument('settings', { "alias": "pages_category", settings: { $elemMatch: { name: req.body.data.name } } }, { "settings.$": 1 }, {}, function (err, resdata) {
			if (err) {
				res.send(err);
			} else {
				if (resdata == null) {
					db.UpdateDocument('settings', { "alias": "pages_category" }, { $push: { 'settings': data } }, { upsert: true }, function (err, docdata) {
						if (err) {
							res.send(err);
						} else {
							res.send(docdata)

						}
					});
				}
				else {
					db.UpdateDocument('settings', { "alias": "pages_category", settings: { $elemMatch: { name: req.body.data.name } } }, { $set: { 'settings.$': data } }, { upsert: true }, function (err, docdata) {
						if (err) {
							res.send(err);
						} else {
							res.send(docdata)

						}
					});
				}
			}
		});
	}*/

	controller.submitcategoryPage = function (req, res) {

		var data = {};
		data.name = req.body.data.name;
		data.title = req.body.data.title;
		data.position = req.body.data.position;

		db.GetOneDocument('settings', { "alias": "pages_category" }, {}, {}, function (err, getdata) {
			if (err) {
				res.send(err);
			} else {
				db.UpdateDocument('settings', { "alias": "pages_category", 'settings': { $elemMatch: { 'name': getdata.settings[0].name } } }, { $set: { "settings.$.name": data.name, "settings.$.title": data.title } }, {}, function (err, settingsres) {
					if (err) {
						res.send(err);
					} else {
						var updateDetails = { 'category': data.name };
						var condition = { "category": getdata.settings[0].name };
						db.UpdateDocument('pages', condition, updateDetails, { multi: true }, function (err, rest) {
							if (err) {
								res.send(err);
							} else {
								res.send(rest)
							}
						});
					}
				});
			}
		});
	}


	controller.geteditpagedata = function (req, res) {
		db.GetOneDocument('settings', { "alias": "pages_category", settings: { $elemMatch: { name: req.body.data } } }, { "settings.$": 1 }, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			}
			else {
				res.send(docdata);
			}
		});
	}

	controller.getFooterData = function (req, res) {
		db.GetOneDocument('pages', { 'name': 'footery' }, {}, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	}



	controller.getlist = async function (req, res) {
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send(errors, 400);
		// 	return;
		// }

		if (req.body.sort) {
			if (req.body.sort.field) {
				var sorted = req.body.sort.field;
			}
			else {
				sorted = 'status';
			}
		}

		var pagesQuery = [{
			"$match": { $and: [{ status: { $ne: 0 } }, { name: { $ne: 'footery' } }, { parent: { $exists: false } }] }
		}, {
			$project: {
				name: 1,
				createdAt: 1,
				status: 1,
				category: 1,
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
		pagesQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

		if (req.body.search) {
			//condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
			var searchs = req.body.search;
			pagesQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
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
			var sorter = 'documentData.' + sorted;
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
		const docdata = await db.GetAggregation('pages', pagesQuery)
		if (!docdata) {
			res.send('err');
		} else {
			if (docdata.length != 0) {
				res.send([docdata[0].documentData, docdata[0].count]);
			} else {
				res.send([0, 0]);
			}
		}

		// db.GetAggregation('pages', pagesQuery, function (err, docdata) {
		// 	if (err) {
		// 		res.send(err);
		// 	} else {

		// 		if (docdata.length != 0) {
		// 			res.send([docdata[0].documentData, docdata[0].count]);
		// 		} else {
		// 			res.send([0, 0]);
		// 		}
		// 	}
		// });
	}

	controller.getsublist = function (req, res) {
		//console.log("req.body", req.body);
		var errors = req.validationErrors();
		if (errors) {
			res.send(errors, 400);
			return;
		}

		if (req.body.sort) {
			var sorted = req.body.sort.field;
		}

		var pagesQuery = [{
			"$match": { $and: [{ status: { $ne: 0 } }, { parent: new mongoose.Types.ObjectId(req.body.id) }] }

		}, {
			$project: {
				name: 1,
				createdAt: 1,
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
		pagesQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });

		if (req.body.search) {
			condition['name'] = { $regex: new RegExp('^' + req.body.search, 'i') };
			var searchs = req.body.search;
			pagesQuery.push({ "$match": { "documentData.name": { $regex: searchs + '.*', $options: 'si' } } });
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
		pagesQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });

		db.GetAggregation('pages', pagesQuery, function (err, docdata) {
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

	controller.deletepage = async (req, res) => {
		// req.checkBody('ids', 'Invalid delData').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send(errors, 400);
		// 	return;
		// }
		// req.checkBody('ids', 'Invalid delData').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send(errors, 400);
		// 	return;
		// }
		let deletePage = await db.UpdateAllDocument('pages', { _id: { $in: req.body.ids } }, { status: 0 }, { multi: true })
		// function (err, docdata) {

		console.log(deletePage, "ddddddddddddddddddddddddddddddddddddd")
		try {
			if (deletePage && deletePage.doc && deletePage.doc.modifiedCount && deletePage.doc.modifiedCount > 0) {
				res.send({ data: deletePage, status: 1, msg: "Deleted Successfully" })
			} else {
				res.send({ data: deletePage, status: 0, msg: "Something Went Wrong" })
			}
		} catch (e) {
			console.log(e)
		}


		// if (err) {
		// 	res.send(err);
		// } else {
		// 	res.send(docdata);
		// }
		// });
	}


	controller.editpage = async function (req, res) {
		const docdata = await db.GetDocument('pages', { status: { $ne: 0 }, _id: req.body.id }, {}, {})
		if (docdata.status === false) {
			res.send(docdata.doc);
		} else {
			res.send(docdata.doc);
		}
		// db.GetDocument('pages', { status: { $ne: 0 }, _id: req.body.id }, {}, {}, function (err, docdata) {
		// 	if (err) {
		// 		res.send(err);
		// 	} else {
		// 		res.send(docdata);
		// 	}
		// });
	}

	controller.getlistdropdown = function (req, res) {
		db.GetDocument('pages', { status: { $ne: 0 } }, {}, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	}
	controller.addLanding = (req, res) => {
		var section1 = {};
		var section2 = {};
		var section3 = {};
		section1.title = req.body.title1;
		section1.description = req.body.description1;
		section2.title = req.body.title2;
		section2.description = req.body.description2;
		section3.title = req.body.title3;
		section3.description = req.body.description3;
		db.GetDocument('driver_landing', {}, {}, {}, (err, docs) => {
			if (docs.length > 0) {
				if (req.body.croppedImage2) {
					var base64 = req.body.croppedImage2.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
					var fileName = Date.now().toString() + library.randomString(4, '#').toString() + '.png';
					var file = CONFIG.DIRECTORY_OTHERS + fileName;
					library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
					section2.icon = file;
				} else {
					section2.icon = docs[0].section2.icon;
				}
				if (req.body.croppedImage1) {
					var base64 = req.body.croppedImage1.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
					var fileName = Date.now().toString() + library.randomString(4, '#').toString() + '.png';
					var file = CONFIG.DIRECTORY_OTHERS + fileName;
					library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
					section1.icon = file;
				} else {
					section1.icon = docs[0].section1.icon;
				}
				if (req.body.croppedImage3) {
					var base64 = req.body.croppedImage3.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
					var fileName = Date.now().toString() + library.randomString(4, '#').toString() + '.png';
					var file = CONFIG.DIRECTORY_OTHERS + fileName;
					library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
					section3.icon = file;
				}
				else {
					section3.icon = docs[0].section3.icon;
				}
				var data = {};
				data.main_title = req.body.main_title;
				data.section1 = section1;
				data.section2 = section2;
				data.section3 = section3;
				data.banner = (typeof (docs[0].banner) == 'undefined') ? {} : docs[0].banner;
				db.UpdateDocument('driver_landing', { '_id': new mongoose.Types.ObjectId(docs[0]._id) }, { 'section1': data.section1, 'section2': data.section2, 'section3': data.section3, 'main_title': data.main_title }, {}, (err, updated) => {
					if (err) {
						res.send({ status: 0, response: err });
					}
					else {
						res.send({ status: 1, reponse: 'updated' });
					}
				})
			} else {
				var obj = {};
				obj.section1 = section1;
				obj.section2 = section2;
				obj.section3 = section3;
				obj.main_title = req.body.main_title;
				db.InsertDocument('driver_landing', obj, (err, ress) => {
					if (!err) {
						res.send({ status: 1, response: 'Inserted' });
					}
					else {
						res.send({ status: 0, response: 'cannot insert' });
					}
				})
			}
		})
	}
	controller.addDriverBanner = (req, res) => {
		var banner = {};
		banner.title = req.body.title;
		banner.description = req.body.description;
		db.GetOneDocument('driver_landing', {}, {}, {}, (err, existdata) => {
			if (err) {
				res.status(400).send(err)
			} else {
				if (req.body.icon) {
					var base64 = req.body.icon.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
					var fileName = Date.now().toString() + '.png';
					var file = CONFIG.DIRECTORY_OTHERS + fileName;
					library.base64Upload({ file: file, base64: base64[2] }, function (err, response) { });
					banner.icon = attachment.get_attachment(CONFIG.DIRECTORY_OTHERS, fileName);
				} else {
					banner.icon = existdata.banner.icon;
				}
				var data = {};
				data.section1 = {};
				data.section2 = {};
				data.section3 = {};
				if (typeof existdata.section1 != 'undefined') {
					data.section1.description = existdata.section1.description;
					data.section1.title = existdata.section1.title;
					data.section1.icon = existdata.section1.icon;
				}
				if (typeof existdata.section2 != 'undefined') {
					data.section2.icon = existdata.section2.icon;
					data.section2.title = existdata.section2.title;
					data.section2.description = existdata.section2.description;
				}
				if (typeof existdata.section3 != 'undefined') {
					data.section3.title = existdata.section3.title;
					data.section3.description = existdata.section3.description;
					data.section3.title = existdata.section3.icon;
				}

				data.main_title = existdata.main_title;
				data.banner = banner;

				db.UpdateDocument('driver_landing', { '_id': new mongoose.Types.ObjectId(existdata._id) }, { 'banner': data.banner }, {}, (err, ress) => {
					if (err) {
						res.status(400).send(err)
					} else {
						res.status(200).send(ress)
					}
				})
			}
		})
	}
	controller.getLandingContent = (req, res) => {
		db.GetOneDocument('driver_landing', {}, {}, {}, (err, existdata) => {
			if (err) {
				res.send({ status: 0, response: {} })
			}
			else {
				res.send({ status: 1, response: existdata })
			}
		})
	}

	controller.getPage = (req, res) => {
		var responceData = { status: 0, message: '', data: {} };
		console.log("req.params.slug", req.params.slug)
		try {
			db.GetOneDocument('pages', { 'slug': req.params.slug }, {}, {}, (err, pageData) => {
				if (err || !pageData) {
					responceData.message = err ? err.message : 'Invalid pages slug please check';
					res.send(responceData);
					return;
				} else {
					responceData.status = 1;
					responceData.message = 'Success';
					responceData.data = pageData;
					res.send(responceData);
					return;
				};
			})
		} catch (error) {
			var errorMessage = error ? error.message : 'pages controller getPage error';
			responceData.message = errorMessage;
			console.log(errorMessage);
			res.send(responceData);
		};
	}

	return controller;
}
