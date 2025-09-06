//"use strict";

module.exports = function (io) {

	var mongoose = require('mongoose');
	var db = require('../../controller/adaptor/mongodb.js');

	var controller = {};

	controller.list = async function (req, res) {
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.send(errors, 400);
		// 	return;
		// }
		var condition = { status: { $ne: 0 } };
		if (req.body.search && req.body.search != '') {
			var searchs = req.body.search;
			condition['$or'] = [
				{ "name": { $regex: searchs + '.*', $options: 'si' } },
				{ "sender_email": { $regex: searchs + '.*', $options: 'si' } },
				{ "email_subject": { $regex: searchs + '.*', $options: 'si' } }
			];
		}

		var emailQuery = [{
			"$match": condition
		}, {
			$project: {
				name: 1,
				email_subject: 1,
				sender_email: 1,
				createdAt: 1,
				sort_name: { $toLower: '$name' },
				sort_email_subject: { $toLower: '$email_subject' },
				sort_sender_email: { $toLower: '$sender_email' }
			}
		}, {
			$project: {
				name: 1,
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		emailQuery.push({ $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true } });
		var sorting = {};
		if (req.body.sort) {
			var sorter = 'documentData.' + req.body.sort.field;
			sorting[sorter] = req.body.sort.order;
			emailQuery.push({ $sort: sorting });
		} else {
			sorting["documentData.createdAt"] = 1;
			emailQuery.push({ $sort: sorting });
		}
		if ((req.body.limit && req.body.skip >= 0)) {
			emailQuery.push({ '$skip': parseInt(req.body.skip) }, { '$limit': parseInt(req.body.limit) });
		}
		emailQuery.push({ $group: { "_id": null, "count": { "$first": "$count" }, "documentData": { $push: "$documentData" } } });
		const docdata = await db.GetAggregation('emailtemplate', emailQuery)
		if (!docdata) {
			res.send(err);
		} else {
			if (docdata.length != 0) {
				res.send([docdata[0].documentData, docdata[0].count]);
			} else {
				res.send([0, 0]);
			}
		}
		// db.GetAggregation('emailtemplate', emailQuery, function (err, docdata) {
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
	};


	controller.list_active = async function (req, res) {
		try {
			// Define a simple condition to fetch email templates where status is not 0
			var condition = { status: { $ne: 0 } };
	
			// Build the aggregation query to match the condition and fetch necessary fields
			var emailQuery = [{
				"$match": condition
			}, {
				$project: {
					name: 1,
					email_subject: 1,
					sender_email: 1,
					createdAt: 1,
					sort_name: { $toLower: '$name' },
					sort_email_subject: { $toLower: '$email_subject' },
					sort_sender_email: { $toLower: '$sender_email' }
				}
			}, {
				$sort: { createdAt: 1 } // Sort by createdAt in ascending order
			}];
	
			// Execute the aggregation query
			const docdata = await db.GetAggregation('emailtemplate', emailQuery);
	
			if (!docdata) {
				res.status(500).send({ message: 'Error fetching email templates' });
			} else {
				res.status(200).send({status:1, data:docdata});
			}
		} catch (err) {
			res.status(500).send({ message: 'Server error', error: err.message });
		}
	};

	controller.edit = async function (req, res) {
		const docdata = await db.GetOneDocument('emailtemplate', { _id: req.body.id }, {}, {})
		if (!docdata.doc) {
			res.send(err);
		} else {
			res.send(docdata.doc);
		}
		// db.GetOneDocument('emailtemplate', { _id: req.body.id }, {}, {}, function (err, docdata) {
		// 	if (err) {
		// 		res.send(err);
		// 	} else {
		// 		res.send(docdata);
		// 	}
		// });
	};

	controller.save = async function (req, res) {
		// req.checkBody('name', 'Please enter template name').notEmpty();
		// req.checkBody('email_subject', 'Please enter email subject').notEmpty();
		// req.checkBody('email_content', 'Please enter email content').notEmpty();
		//req.checkBody('email_footer', 'Please enter email footer').notEmpty();
		//req.checkBody('email_header', 'Please enter email header').notEmpty();
		// var errors = req.validationErrors();
		// if (errors) {
		// 	res.status(400).send(errors[0].msg);
		// 	return;
		// } else {
		if (req.body._id) {
			const docdata = await db.UpdateDocument('emailtemplate', { _id: req.body._id }, req.body)
			if (!docdata) {
				res.send(err);
			} else {
				res.send(docdata);
			}
			// db.UpdateDocument('emailtemplate', { _id: req.body._id }, req.body, function (err, docdata) {
			// 	if (err) {
			// 		res.send(err);
			// 	} else {
			// 		res.send(docdata);
			// 	}
			// });
		} else {
			const result = await db.InsertDocument('emailtemplate', req.body)
			if (!result) {
				res.send("err");
			} else {
				res.send(result);
			}
			// db.InsertDocument('emailtemplate', req.body, function (err, result) {
			// 	if (err) {
			// 		res.send(err);
			// 	} else {
			// 		res.send(result);
			// 	}
			// });
		}
		// }
	};

	controller.delete = function (req, res) {
		req.checkBody('delData', 'Invalid delData').notEmpty();
		var errors = req.validationErrors();
		if (errors) {
			res.send(errors, 400);
			return;
		}

		db.UpdateDocument('emailtemplate', { _id: { $in: req.body.delData } }, { status: 0 }, { multi: true }, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	};

	controller.getsubscripermail = function (req, res) {
		db.GetDocument('emailtemplate', { 'subscription': 1, status: { $ne: 0 } }, {}, {}, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				res.send(docdata);
			}
		});
	};

	return controller;
}
