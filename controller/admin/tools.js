//"use strict";

module.exports = function () {
	var mongoose = require('mongoose');
	var db = require('../../controller/adaptor/mongodb.js');
	var attachment = require('../../model/attachments.js');
	var json2csv = require('json2csv');
	var fs = require('fs');

	var controller = {};

	controller.userexport = function (req, res) {
		var bannerQuery = [{
			"$match": { status: { $ne: 0 } }
		},
		{
			$project: {
				username: 1,
				email: 1,
				name: 1,
				gender: 1,
				phone: 1,
				address: 1,
				status: 1,
				location: 1,
				emergency_contact: 1,
			}
		}, {
			$project: {
				//question: 1,
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		db.GetAggregation('users', bannerQuery, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				if (docdata.length != 0) {
					var fields = ['username', 'name.first_name', 'name.last_name', 'email', 'gender', 'phone.code', 'phone.number', 'address.city', 'address.state', 'address.zipcode', 'address.country', 'emergency_contact.name', 'emergency_contact.email', 'emergency_contact.phone.code', 'emergency_contact.phone.number'];
					var fieldNames = ['User Name', 'First Name', 'Last Name', 'User mail', 'Gender', 'Phone code', 'Phone number', 'Address city', 'State', 'zipcode', 'Country', 'Emergency_contact name', 'Emergency_contact Email', 'Emergency_contact Mobile Code', 'Emergency_contact Mobile Number'];
					var mydata = docdata[0].documentData;
					json2csv({ data: mydata, fields: fields, fieldNames: fieldNames }, function (err, csv) {
						if (err);
						var filename = 'uploads/csv/user/users-' + new Date().getTime() + '.csv';
						fs.writeFile(filename, csv, function (err) {
							if (err) throw err;
							res.download(filename);
						});
					});
				} else {
					res.send([0, 0]);
				}
			}
		});
	}


	controller.userexportpost = function (req, res) {
		var bannerQuery = [{
			"$match": { status: { $ne: 0 } }
		},
		{
			$project: {
				username: 1,
				email: 1,
				name: 1,
				gender: 1,
				phone: 1,
				address: 1,
				status: 1,
				location: 1,
				emergency_contact: 1,
			}
		}, {
			$project: {
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		db.GetAggregation('users', bannerQuery, function (err, docdata) {
			if (err || docdata.length == 0) {
				res.send({ error: 'No Data' });
			} else {
				res.send(docdata);
			}
		});
	}

	controller.driverexport = function (req, res) {
		var bannerQuery = [{
			"$match": { status: { $ne: 0 } }
		},
		{
			$project: {
				username: 1,
				email: 1,
				name: 1,
				gender: 1,
				phone: 1,
				address: 1,
				status: 1,
				location: 1,
				emergency_contact: 1,
			}
		}, {
			$project: {
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		db.GetAggregation('drivers', bannerQuery, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				if (docdata.length != 0) {
					var fields = ['username', 'name.first_name', 'name.last_name', 'email', 'gender', 'phone.code', 'phone.number', 'address.city', 'address.state', 'address.zipcode', 'address.country', 'emergency_contact.name', 'emergency_contact.email', 'emergency_contact.phone.code', 'emergency_contact.phone.number'];
					var fieldNames = ['User Name', 'First Name', 'Last Name', 'User mail', 'Gender', 'Phone code', 'Phone number', 'Address city', 'State', 'zipcode', 'Country', 'Emergency_contact name', 'Emergency_contact Email', 'Emergency_contact Mobile Code', 'Emergency_contact Mobile Number'];
					var mydata = docdata[0].documentData;
					json2csv({ data: mydata, fields: fields, fieldNames: fieldNames }, function (err, csv) {
						if (err);
						var filename = 'uploads/csv/driver/drivers-' + new Date().getTime() + '.csv';
						fs.writeFile(filename, csv, function (err) {
							if (err) throw err;
							res.download(filename);
						});
					});
				} else {
					res.send([0, 0]);
				}
			}
		});
	}

	controller.driverexportpost = function (req, res) {
		var bannerQuery = [{
			"$match": { status: { $ne: 0 } }
		},
		{
			$project: {
				username: 1,
				email: 1,
				name: 1,
				gender: 1,
				phone: 1,
				address: 1,
				status: 1,
				location: 1,
				emergency_contact: 1,


			}
		}, {
			$project: {
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		db.GetAggregation('drivers', bannerQuery, function (err, docdata) {
			if (err || docdata.length == 0) {
				res.send({ error: 'No Data' });
			} else {
				res.send(docdata);
			}
		});
	}


	controller.restaurantexport = function (req, res) {
		var bannerQuery = [{
			"$match": { status: { $ne: 0 } }
		},
		{
			$project: {
				username: 1,
				email: 1,
				name: 1,
				gender: 1,
				phone: 1,
				address: 1,
				status: 1,
				location: 1,
				emergency_contact: 1,
			}
		}, {
			$project: {
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		db.GetAggregation('restaurant', bannerQuery, function (err, docdata) {
			if (err) {
				res.send(err);
			} else {
				if (docdata.length != 0) {
					var fields = ['username', 'name.first_name', 'name.last_name', 'email', 'gender', 'phone.code', 'phone.number', 'address.city', 'address.state', 'address.zipcode', 'address.country', 'emergency_contact.name', 'emergency_contact.email', 'emergency_contact.phone.code', 'emergency_contact.phone.number'];
					var fieldNames = ['User Name', 'First Name', 'Last Name', 'User mail', 'Gender', 'Phone code', 'Phone number', 'Address city', 'State', 'zipcode', 'Country', 'Emergency_contact name', 'Emergency_contact Email', 'Emergency_contact Mobile Code', 'Emergency_contact Mobile Number'];
					var mydata = docdata[0].documentData;
					json2csv({ data: mydata, fields: fields, fieldNames: fieldNames }, function (err, csv) {
						if (err);
						var filename = 'uploads/csv/restaurant/restaurants-' + new Date().getTime() + '.csv';
						fs.writeFile(filename, csv, function (err) {
							if (err) throw err;
							res.download(filename);
						});
					});
				} else {
					res.send([0, 0]);
				}
			}
		});
	}

	controller.restaurantexportpost = function (req, res) {
		var bannerQuery = [{
			"$match": { status: { $ne: 0 } }
		},
		{
			$project: {
				username: 1,
				email: 1,
				name: 1,
				gender: 1,
				phone: 1,
				address: 1,
				status: 1,
				location: 1,
				emergency_contact: 1,
			}
		}, {
			$project: {
				document: "$$ROOT"
			}
		}, {
			$group: { "_id": null, "count": { "$sum": 1 }, "documentData": { $push: "$document" } }
		}];
		db.GetAggregation('restaurant', bannerQuery, function (err, docdata) {
			if (err || docdata.length == 0) {
				res.send({ error: 'No Data' });
			} else {
				res.send(docdata);
			}
		});
	}

	return controller;
}
