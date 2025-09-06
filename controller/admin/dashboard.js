module.exports = function () {


    var controller = {};

    var mongoose = require('mongoose');
    var db = require('../../controller/adaptor/mongodb.js');
    var moment = require("moment");
    var async = require("async");

    controller.userStats = async function userstats(req, res) {

        var userQuery = { _id: { "$dayOfWeek": "$createdAt" } };
        if (req.query.month == 'true') {
            if (req.query.day == 'false') { userQuery._id = { "$month": "$createdAt" } }
            if (req.query.day == 'true') { userQuery._id = { "$dayOfMonth": "$createdAt" } }
        }
        userQuery.count = { "$sum": 1 };
        userQuery.Date = { "$first": "$createdAt" };

        var getstatistics = [
            { "$match": { createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 'status': { $ne: 0 } } },
            { "$group": userQuery },
            { $sort: { "Date": 1 } }
        ];

        const docs = await db.GetAggregation('users', getstatistics)
        console.log(docs, 'what');
        if (!docs) {
            res.send(err);
        } else {
            res.send(docs);
        }
        // db.GetAggregation('users', getstatistics, function (err, docs) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docs);
        //     }
        // });

    }

    controller.driverStats = async function driverstats(req, res) {

        var userQuery = { _id: { "$dayOfWeek": "$createdAt" } };
        if (req.query.month == 'true') {
            if (req.query.day == 'false') { userQuery._id = { "$month": "$createdAt" } }
            if (req.query.day == 'true') { userQuery._id = { "$dayOfMonth": "$createdAt" } }
        }
        userQuery.count = { "$sum": 1 };
        userQuery.Date = { "$first": "$createdAt" };

        var getstatistics = [
            { "$match": { createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 'status': { $ne: 0 } } },
            { "$group": userQuery },
            { $sort: { "Date": 1 } }
        ];

        const docs = await db.GetAggregation('drivers', getstatistics)
        if (!docs) {
            res.send(err);
        } else {
            res.send(docs);
        }
        // db.GetAggregation('drivers', getstatistics, function (err, docs) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docs);
        //     }
        // });

    }

    controller.restaurantStats = async function restaurantStats(req, res) {

        var userQuery = { _id: { "$dayOfWeek": "$createdAt" } };
        if (req.query.month == 'true') {
            if (req.query.day == 'false') { userQuery._id = { "$month": "$createdAt" } }
            if (req.query.day == 'true') { userQuery._id = { "$dayOfMonth": "$createdAt" } }
        }
        userQuery.count = { "$sum": 1 };
        userQuery.Date = { "$first": "$createdAt" };

        var getstatistics = [
            { "$match": { createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 'status': { $ne: 0 } } },
            { "$group": userQuery },
            { $sort: { "Date": 1 } }
        ];
        const docs = await db.GetAggregation('restaurant', getstatistics)
        if (!docs) {
            res.send(err);
        } else {
            res.send(docs);
        }
        // db.GetAggregation('restaurant', getstatistics, function (err, docs) {
        //     if (err) {
        //         res.send(err);
        //     } else {
        //         res.send(docs);
        //     }
        // });

    }

    // controller.orderStats = async function orderStats(req, res) {
    //     var userQuery = { _id: { "$dayOfWeek": "$createdAt" } };
    //     if (req.query.month == 'true') {
    //         if (req.query.day == 'false') { userQuery._id = { "$month": "$createdAt" } }
    //         if (req.query.day == 'true') { userQuery._id = { "$dayOfMonth": "$createdAt" } }
    //     }
    //     userQuery.count = { "$sum": 1 };
    //     userQuery.Date = { "$first": "$createdAt" };
    //     userQuery.totalGrandAmount = { "$sum": "$billings.amount.grand_total" };
    //     var getstatistics = [
    //         { "$match": { createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 'status': { $ne: 0 } } },
    //         { "$group": userQuery },
    //         { $sort: { "Date": 1 } }
    //     ];
    //     const docs = await db.GetAggregation('orders', getstatistics)
    //     if (!docs) {
    //         res.send(err);
    //     } else {
    //         res.send(docs);
    //     }
    //     // db.GetAggregation('orders', getstatistics, function (err, docs) {
    //     //     if (err) {
    //     //         res.send(err);
    //     //     } else {
    //     //         res.send(docs);
    //     //     }
    //     // });

    // }




    controller.orderStats = async function orderStats(req, res) {
        let userQuery = {};
        let matchQuery;
    
        if (req.query.from == 0 && req.query.to == 0) {
            // When both 'from' and 'to' are 0, fetch all records and group by month
            matchQuery = { 'status': { $ne: 0 } }; // You can add more conditions if needed
        } else {
            // When specific date range is provided
            matchQuery = { 
                createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 
                'status': { $ne: 0 } 
            };
        }
    
        //console.log(req.query.month, "req.query.month");
        //console.log(req.query, "req.query.");
    
        if (req.query.month == 'true' && req.query.day == 'false') {
            // Monthly statistics for a specific year
            userQuery._id = { 
                month: { "$month": "$createdAt" },
                year: { "$year": "$createdAt" }
            };
            userQuery.Date = { "$first": "$createdAt" };
        } else if (req.query.month == 'true' && req.query.day == 'true') {
            // Daily statistics for a specific month
            userQuery._id = { "$dayOfMonth": "$createdAt" };
            userQuery.Date = { "$first": "$createdAt" };
        } else if (req.query.mothvalue == 0 && req.query.year) {
            // When no specific month is provided but a year is
            userQuery._id = { "$dayOfMonth": "$createdAt" };
            userQuery.Date = { "$first": "$createdAt" };
        } else {
            // Default to daily statistics if no specific query parameter is provided
            userQuery._id = { "$dayOfWeek": "$createdAt" };
            userQuery.Date = { "$first": "$createdAt" };
        }
    
        userQuery.count = { "$sum": 1 };
        userQuery.totalGrandAmount = { "$sum": "$billings.amount.grand_total" };
    
        let getstatistics = [
            { "$match": matchQuery },
            { "$group": userQuery },
            { $sort: { "Date": 1 } }
        ];
    
        try {
            const docs = await db.GetAggregation('orders', getstatistics);
            res.send(docs);
        } catch (err) {
            res.status(500).send(err);
        }
    };
    

    // controller.orderStats = async function orderStats(req, res) {
    //     let userQuery = {};
    //     let matchQuery
    //     // if(req.query.from == 0 && req.query.from == 0){

    //         matchQuery = { 
    //            createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 
    //            'status': { $ne: 0 } 
    //        };
    //     // }else{

    //         // matchQuery = { 
    //         //    createdAt: { $lt: new Date(req.query.to), $gte: new Date(req.query.from) }, 
    //         //    'status': { $ne: 0 } 
    //     //    };
    //     // }
    //  console.log(req.query.month,"req.query.monthreq.query.monthreq.query.month");
    //  console.log(req.query,"req.query.");
    //     if (req.query.mothvalue != 0 && req.query.month == 'true' && req.query.day == 'false') {
    //         // Monthly statistics for a specific year
    //         userQuery._id = { "$month": "$createdAt" };
    //         userQuery.Date = { "$first": "$createdAt" };
    //     } else if (req.query.mothvalue != 0 && req.query.month == 'true' && req.query.day == 'true') {
    //         // Daily statistics for a specific month
    //         userQuery._id = { "$dayOfMonth": "$createdAt" };
    //         userQuery.Date = { "$first": "$createdAt" };
    //     } else if(req.query.mothvalue == 0 && req.query.year){
    //         userQuery._id = { "$dayOfMonth": "$createdAt" };
    //         userQuery.Date = { "$first": "$createdAt" };
    //     }
        
    //     else {
    //         // Default to daily statistics if no specific query parameter is provided
    //         userQuery._id = { "$dayOfWeek": "$createdAt" };
    //         userQuery.Date = { "$first": "$createdAt" };
    //     }
    
    //     userQuery.count = { "$sum": 1 };
    //     userQuery.totalGrandAmount = { "$sum": "$billings.amount.grand_total" };
    
    //     let getstatistics = [
    //         { "$match": matchQuery },
    //         { "$group": userQuery },
    //         { $sort: { "Date": 1 } }
    //     ];
    
    //     try {
    //         const docs = await db.GetAggregation('orders', getstatistics);
    //         res.send(docs);
    //     } catch (err) {
    //         res.status(500).send(err);
    //     }
    // };
    





//     controller.allStats = async function allStats(req, res) {
//         const users = await db.GetCount('users', { status: { $ne: 0 } })
//         console.log(users, 'hit hti si');
//         const activeUsers = await db.GetCount('users', { status: { $eq: 1 } })
//         const inactiveUsers = await db.GetCount('users', { status: { $eq: 2 } })
//         const drivers = await db.GetCount('drivers', { status: { $ne: 0 } })
//         const approvedDrivers = await db.GetCount('drivers', { status: { $in: [1, 2] } })
//         const unapprovedDrivers = await db.GetCount('drivers', { status: { $eq: 3 } })
//         var current_time = Date.now();
//         var three_min_section = 45 * 1000;
//         var before_twenty_seconds = current_time - three_min_section;
//         const onlineDrivers = await db.GetCount('drivers', { status: { $eq: 1 }, currentStatus: { $eq: 1 }, last_update_time: { $gte: before_twenty_seconds } })
//         const oflineDrivers = await db.GetCount('drivers', { status: { $eq: 1 }, $or: [{ currentStatus: { $eq: 0 } }, { last_update_time: { $lt: before_twenty_seconds } }] })
//         var walletQuery = [{
//             $match: { status: { $ne: 0 } }
//         }, {
//             $group:
//             {
//                 _id: null,
//                 totalAmount: { $sum: "$wallet_settings.available" },
//                 count: { $sum: 1 }
//             }
//         }]
//         const driverwallet = await db.GetAggregation('drivers', walletQuery)
//         const products = await db.GetCount('food', {})
//         const recommended = await db.GetCount('food', { isRecommeneded: { $eq: 1 } })
//         const unrecommended = await db.GetCount('food', { isRecommeneded: { $eq: 0 } })
//         const activeproducts = await db.GetCount('food', { status: { $eq: 1 } })
//         const inactiveproducts = await db.GetCount('food', { status: { $eq: 2 } })
//         const orders = await db.GetCount('orders', { status: { $ne: 0 } })
//         const inprogressOrders = await db.GetCount('orders', { status: { $in: [1, 3, 4, 5, 6] } })
//         const completedOrders = await db.GetCount('orders', { status: { $in: [2, 7, 9, 10] } })
//         var totalAmountQuery = [
//             {
//                 $group: {
//                     _id: null,
//                     total_amount: { $sum: "$billings.amount.grand_total" }
//                 }
//             }
//         ]

//         const totalAmount = await db.GetAggregation('orders',totalAmountQuery)
// // console.log(totalAmount,"totalAmounttotalAmounttotalAmounttotalAmount");
//       var subCatList = [   {
//         $unwind: "$foods"
//       },
//       {
//         $lookup: {
//           from: "food",
//           localField: "foods.id",
//           foreignField: "_id",
//           as: "productDetails"
//         }
//       },
//       {
//         $unwind: "$productDetails"
//       },
//       {
//         $lookup: {
//           from: "rcategory",
//           localField: "productDetails.rcategory",
//           foreignField: "_id",
//           as: "categoryDetails"
//         }
//       },
//       {
//         $unwind: "$categoryDetails"
//       },
//       {
//         $group: {
//           _id: "$categoryDetails._id",
//           categoryName: { $first: "$categoryDetails.rcatname" },
//           orderCount: { $sum: "$foods.quantity" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           categoryId: "$_id",
//           categoryName: 1,
//           orderCount: 1
//         }
//       }
//     ]

// const subCategoryDoc = await db.GetAggregation('orders',subCatList)
//         Promise.all([users, activeUsers, inactiveUsers, drivers, approvedDrivers, onlineDrivers, oflineDrivers, driverwallet, products, recommended, unrecommended, activeproducts, inactiveproducts, orders, inprogressOrders, completedOrders]).then(([users, activeUsers, inactiveUsers, drivers, approvedDrivers, onlineDrivers, oflineDrivers, driverwallet, products, recommended, unrecommended, activeproducts, inactiveproducts, orders, inprogressOrders, completedOrders]) => {
//             var response = {};
//             response.statistics = {};

//             response.statistics.users = users || 0;
//             response.statistics.activeUsers = activeUsers || 0;
//             response.statistics.inactiveUsers = inactiveUsers || 0;

//             response.statistics.drivers = drivers || 0;
//             response.statistics.approvedDrivers = approvedDrivers || 0;
//             response.statistics.unapprovedDrivers = unapprovedDrivers || 0;
//             response.statistics.onlineDrivers = onlineDrivers || 0;
//             response.statistics.oflineDrivers = oflineDrivers || 0;
//             response.statistics.driverwallet = driverwallet || 0;

//             response.statistics.products = products || 0;
//             response.statistics.recommended = recommended || 0;
//             response.statistics.unrecommended = unrecommended || 0;
//             response.statistics.activeproducts = activeproducts || 0;
//             response.statistics.inactiveproducts = inactiveproducts || 0;

//             response.statistics.orders = orders || 0;
//             response.statistics.inprogressOrders = inprogressOrders || 0;
//             response.statistics.completedOrders = completedOrders || 0;
//             response.statistics.totalAmount = totalAmount && totalAmount[0] && totalAmount[0].total_amount != undefined && totalAmount[0].total_amount || 0;
//             response.statistics.subCategoryDoc = subCategoryDoc || 0;
//             console.log(response);
//             res.send(response);
//         }).catch((err) => {
//             res.send(err);
//         })
//         // async.parallel({
//         //     users: function (callback) {
//         //         db.GetCount('users', { status: { $ne: 0 } }, function (err, users) {
//         //             callback(err, users);
//         //         });
//         //     },
//         //     activeUsers: function (callback) {
//         //         db.GetCount('users', { status: { $eq: 1 } }, function (err, taskers) {
//         //             callback(err, taskers);
//         //         });
//         //     },
//         //     inactiveUsers: function (callback) {
//         //         db.GetCount('users', { status: { $eq: 2 } }, function (err, categories) {
//         //             callback(err, categories);
//         //         });
//         //     },
//         //     drivers: function (callback) {
//         //         db.GetCount('drivers', { status: { $ne: 0 } }, function (err, coupons) {
//         //             callback(err, coupons);
//         //         });
//         //     },
//         //     approvedDrivers: function (callback) {
//         //         db.GetCount('drivers', { status: { $in: [1, 2] } }, function (err, tasks) {
//         //             callback(err, tasks);
//         //         });
//         //     },
//         //     unapprovedDrivers: function (callback) {
//         //         db.GetCount('drivers', { status: { $eq: 3 } }, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         // 	onlineDrivers: function (callback) {
//         // 		var current_time = Date.now();
//         // 		var three_min_section = 45 * 1000;
//         // 		var before_twenty_seconds = current_time - three_min_section;
//         //         db.GetCount('drivers', { status: { $eq: 1 }, currentStatus: { $eq: 1 }, last_update_time: { $gte : before_twenty_seconds } }, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         // 	oflineDrivers: function (callback) {
//         // 		var current_time = Date.now();
//         // 		var three_min_section = 45 * 1000;
//         // 		var before_twenty_seconds = current_time - three_min_section;
//         //         db.GetCount('drivers', { status: { $eq: 1 },$or:[{currentStatus: { $eq: 0 }},{last_update_time: { $lt : before_twenty_seconds }}]}, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         // 	driverwallet: function (callback) {
//         // 		var walletQuery =[{
//         // 			$match: { status: { $ne: 0 } }
//         // 		},{
//         // 			   $group:
//         // 				 {
//         // 				   _id: null,
//         // 				   totalAmount: { $sum: "$wallet_settings.available" },
//         // 				   count: { $sum: 1 }
//         // 				 }
//         // 			 }]
//         // 		db.GetAggregation('drivers', walletQuery, function (err, docdata) {
//         // 			var totalAmount = 0;
//         // 			if(docdata && docdata.length > 0 && typeof docdata[0].totalAmount != 'undefined'){
//         // 				totalAmount = docdata[0].totalAmount;
//         // 			}
//         // 			callback(err,totalAmount);
//         // 		});
//         // 	},
//         //     products: function (callback) {
//         //         db.GetCount('food', {}, function (err, coupons) {
//         //             callback(err, coupons);
//         //         });
//         //     },
//         //     recommended: function (callback) {
//         //         db.GetCount('food', { isRecommeneded: { $eq: 1 } }, function (err, tasks) {
//         //             callback(err, tasks);
//         //         });
//         //     },
//         //     unrecommended: function (callback) {
//         //         db.GetCount('food', { isRecommeneded: { $eq: 0 } }, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         // 	activeproducts: function (callback) {
//         //         db.GetCount('food', { status: { $eq: 1 } }, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         // 	inactiveproducts: function (callback) {
//         //         db.GetCount('food', { status: { $eq: 2 } }, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         //     orders: function (callback) {
//         //         db.GetCount('orders', { status: { $ne: 0 } }, function (err, coupons) {
//         //             callback(err, coupons);
//         //         });
//         //     },
//         //     inprogressOrders: function (callback) {
//         //         db.GetCount('orders', { status: { $in: [1, 3, 4, 5, 6] } }, function (err, tasks) {
//         //             callback(err, tasks);
//         //         });
//         //     },
//         //     completedOrders: function (callback) {
//         //         db.GetCount('orders', { status: { $in: [2, 7, 9, 10] } }, function (err, subscribers) {
//         //             callback(err, subscribers);
//         //         });
//         //     },
//         // }, function (err, results) {
//         //     if (err) {
//         //         res.send(err);
//         //     } else {
//         //         var response = {};
//         //         response.statistics = {};

//         //         response.statistics.users = results.users || 0;
//         //         response.statistics.activeUsers = results.activeUsers || 0;
//         //         response.statistics.inactiveUsers = results.inactiveUsers || 0;

//         //         response.statistics.drivers = results.drivers || 0;
//         //         response.statistics.approvedDrivers = results.approvedDrivers || 0;
//         //         response.statistics.unapprovedDrivers = results.unapprovedDrivers || 0;
//         //         response.statistics.onlineDrivers = results.onlineDrivers || 0;
//         //         response.statistics.oflineDrivers = results.oflineDrivers || 0;
//         //         response.statistics.driverwallet = results.driverwallet || 0;

//         //         response.statistics.products = results.products || 0;
//         //         response.statistics.recommended = results.recommended || 0;
//         //         response.statistics.unrecommended = results.unrecommended || 0;
//         //         response.statistics.activeproducts = results.activeproducts || 0;
//         //         response.statistics.inactiveproducts = results.inactiveproducts || 0;

//         //         response.statistics.orders = results.orders || 0;
//         //         response.statistics.inprogressOrders = results.inprogressOrders || 0;
//         //         response.statistics.completedOrders = results.completedOrders || 0;

//         //         res.send(response);
//         //     }
//         // });
//     }



// controller.allStats = async function allStats(req, res) {
//     try {
//         const users = await db.GetCount('users', { status: { $ne: 0 } });
//         const activeUsers = await db.GetCount('users', { status: { $eq: 1 } });
//         const inactiveUsers = await db.GetCount('users', { status: { $eq: 2 } });
//         const drivers = await db.GetCount('drivers', { status: { $ne: 0 } });
//         const approvedDrivers = await db.GetCount('drivers', { status: { $in: [1, 2] } });
//         const unapprovedDrivers = await db.GetCount('drivers', { status: { $eq: 3 } });
//         var current_time = Date.now();
//         var three_min_section = 45 * 1000;
//         var before_twenty_seconds = current_time - three_min_section;
//         const onlineDrivers = await db.GetCount('drivers', { status: { $eq: 1 }, currentStatus: { $eq: 1 }, last_update_time: { $gte: before_twenty_seconds } });
//         const oflineDrivers = await db.GetCount('drivers', { status: { $eq: 1 }, $or: [{ currentStatus: { $eq: 0 } }, { last_update_time: { $lt: before_twenty_seconds } }] });
        
//         var walletQuery = [{
//             $match: { status: { $ne: 0 } }
//         }, {
//             $group:
//             {
//                 _id: null,
//                 totalAmount: { $sum: "$wallet_settings.available" },
//                 count: { $sum: 1 }
//             }
//         }];
//         const driverwallet = await db.GetAggregation('drivers', walletQuery);
        
//         const products = await db.GetCount('food', {});
//         const recommended = await db.GetCount('food', { isRecommeneded: { $eq: 1 } });
//         const unrecommended = await db.GetCount('food', { isRecommeneded: { $eq: 0 } });
//         const activeproducts = await db.GetCount('food', { status: { $eq: 1 } });
//         const inactiveproducts = await db.GetCount('food', { status: { $eq: 2 } });
//         const orders = await db.GetCount('orders', { status: { $ne: 0 } });
//         const inprogressOrders = await db.GetCount('orders', { status: { $in: [1, 3, 4, 5, 6] } });
//         const completedOrders = await db.GetCount('orders', { status: { $in: [2, 7, 9, 10] } });
        
//         var totalAmountQuery = [
//             {
//                 $group: {
//                     _id: null,
//                     total_amount: { $sum: "$billings.amount.grand_total" }
//                 }
//             }
//         ];
//         const totalAmount = await db.GetAggregation('orders', totalAmountQuery);

//         var subCatList = [
//             {
//                 $unwind: "$foods"
//             },
//             {
//                 $lookup: {
//                     from: "food",
//                     localField: "foods.id",
//                     foreignField: "_id",
//                     as: "productDetails"
//                 }
//             },
//             {
//                 $unwind: "$productDetails"
//             },
//             {
//                 $lookup: {
//                     from: "rcategory",
//                     localField: "productDetails.rcategory",
//                     foreignField: "_id",
//                     as: "categoryDetails"
//                 }
//             },
//             {
//                 $unwind: "$categoryDetails"
//             },
//             {
//                 $group: {
//                     _id: "$categoryDetails._id",
//                     categoryName: { $first: "$categoryDetails.rcatname" },
//                     orderCount: { $sum: "$foods.quantity" }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     categoryId: "$_id",
//                     categoryName: 1,
//                     orderCount: 1
//                 }
//             }
//         ];
//         const subCategoryDoc = await db.GetAggregation('orders', subCatList);

//         // New aggregation for last 7 days order count
//         var sevenDaysAgo = new Date();
//         sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//         var dailyOrdersQuery = [
//             {
//                 $match: {
//                     status: { $ne: 0 },
//                     createdAt: { $gte: sevenDaysAgo }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
//                     },
//                     count: { $sum: 1 }
//                 }
//             },
//             {
//                 $sort: { "_id": 1 }
//             }
//         ];
//         const dailyOrders = await db.GetAggregation('orders', dailyOrdersQuery);

//         // Preparing the last 7 days order count array
//         let last7Days = [];
//         for (let i = 6; i >= 0; i--) {
//             let day = new Date();
//             day.setDate(day.getDate() - i);
//             let dayString = day.toISOString().split('T')[0];
//             let orderForDay = dailyOrders.find(order => order._id === dayString);
//             last7Days.push(orderForDay ? orderForDay.count : 0);
//         }

//         const response = {
//             statistics: {
//                 users: users || 0,
//                 activeUsers: activeUsers || 0,
//                 inactiveUsers: inactiveUsers || 0,
//                 drivers: drivers || 0,
//                 approvedDrivers: approvedDrivers || 0,
//                 unapprovedDrivers: unapprovedDrivers || 0,
//                 onlineDrivers: onlineDrivers || 0,
//                 oflineDrivers: oflineDrivers || 0,
//                 driverwallet: driverwallet[0]?.totalAmount || 0,
//                 products: products || 0,
//                 recommended: recommended || 0,
//                 unrecommended: unrecommended || 0,
//                 activeproducts: activeproducts || 0,
//                 inactiveproducts: inactiveproducts || 0,
//                 orders: orders || 0,
//                 inprogressOrders: inprogressOrders || 0,
//                 completedOrders: completedOrders || 0,
//                 totalAmount: totalAmount[0]?.total_amount || 0,
//                 subCategoryDoc: subCategoryDoc || 0,
//                 last7DaysOrders: last7Days
//             }
//         };
//         console.log(response);
//         res.send(response);
//     } catch (err) {
//         res.send(err);
//     }
// };


controller.allStats = async function allStats(req, res) {
    try {
        const users = await db.GetCount('users', { status: { $ne: 0 } });
        const activeUsers = await db.GetCount('users', { status: { $eq: 1 } });
        const inactiveUsers = await db.GetCount('users', { status: { $eq: 2 } });
        const drivers = await db.GetCount('drivers', { status: { $ne: 0 } });
        const approvedDrivers = await db.GetCount('drivers', { status: { $in: [1, 2] } });
        const unapprovedDrivers = await db.GetCount('drivers', { status: { $eq: 3 } });
        var current_time = Date.now();
        var three_min_section = 45 * 1000;
        var before_twenty_seconds = current_time - three_min_section;
        const onlineDrivers = await db.GetCount('drivers', { status: { $eq: 1 }, currentStatus: { $eq: 1 }, last_update_time: { $gte: before_twenty_seconds } });
        const oflineDrivers = await db.GetCount('drivers', { status: { $eq: 1 }, $or: [{ currentStatus: { $eq: 0 } }, { last_update_time: { $lt: before_twenty_seconds } }] });

        var walletQuery = [{
            $match: { status: { $ne: 0 } }
        }, {
            $group:
            {
                _id: null,
                totalAmount: { $sum: "$wallet_settings.available" },
                count: { $sum: 1 }
            }
        }];
        const driverwallet = await db.GetAggregation('drivers', walletQuery);

        const products = await db.GetCount('food', {});
        const recommended = await db.GetCount('food', { isRecommeneded: { $eq: 1 } });
        const unrecommended = await db.GetCount('food', { isRecommeneded: { $eq: 0 } });
        const activeproducts = await db.GetCount('food', { status: { $eq: 1 } });
        const inactiveproducts = await db.GetCount('food', { status: { $eq: 2 } });
        const orders = await db.GetCount('orders', { status: { $ne: 0 } });
        const inprogressOrders = await db.GetCount('orders', { status: { $in: [1, 3, 4, 5, 6] } });
        const completedOrders = await db.GetCount('orders', { status: { $in: [2, 7, 9, 10] } });

        var totalAmountQuery = [
            {
                $group: {
                    _id: null,
                    total_amount: { $sum: "$billings.amount.grand_total" }
                }
            }
        ];
        const totalAmount = await db.GetAggregation('orders', totalAmountQuery);

        var subCatList = [
            {
                $unwind: "$foods"
            },
            {
                $lookup: {
                    from: "food",
                    localField: "foods.id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $lookup: {
                    from: "rcategory",
                    localField: "productDetails.rcategory",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            {
                $unwind: "$categoryDetails"
            },
            {
                $group: {
                    _id: "$categoryDetails._id",
                    categoryName: { $first: "$categoryDetails.rcatname" },
                    orderCount: { $sum: "$foods.quantity" }
                }
            },
            {
                $project: {
                    _id: 0,
                    categoryId: "$_id",
                    categoryName: 1,
                    orderCount: 1
                }
            }
        ];
        const subCategoryDoc = await db.GetAggregation('orders', subCatList);

        // Aggregation for last 7 days order count
        var sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        var dailyOrdersQuery = [
            {
                $match: {
                    status: { $ne: 0 },
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ];
        const dailyOrders = await db.GetAggregation('orders', dailyOrdersQuery);

        // Aggregation for last 7 days user count
        var dailyUsersQuery = [
            {
                $match: {
                    status: { $ne: 0 },
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ];
        const dailyUsers = await db.GetAggregation('users', dailyUsersQuery);

        // Aggregation for last 7 days total amount
        var dailyAmountQuery = [
            {
                $match: {
                    status: { $ne: 0 },
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    total_amount: { $sum: "$billings.amount.grand_total" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ];
        const dailyAmounts = await db.GetAggregation('orders', dailyAmountQuery);

        // Aggregation for last 7 days products
        var dailyProductsQuery = [
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ];
        const dailyProducts = await db.GetAggregation('food', dailyProductsQuery);

        // Prepare the last 7 days order count array
        let last7DaysOrders = [];
        let last7DaysUsers = [];
        let last7DaysAmounts = [];
        let last7DaysProducts = [];
        for (let i = 6; i >= 0; i--) {
            let day = new Date();
            day.setDate(day.getDate() - i);
            let dayString = day.toISOString().split('T')[0];

            let orderForDay = dailyOrders.find(order => order._id === dayString);
            last7DaysOrders.push(orderForDay ? orderForDay.count : 0);

            let userForDay = dailyUsers.find(user => user._id === dayString);
            last7DaysUsers.push(userForDay ? userForDay.count : 0);

            let amountForDay = dailyAmounts.find(amount => amount._id === dayString);
            last7DaysAmounts.push(amountForDay ? amountForDay.total_amount : 0);

            let productForDay = dailyProducts.find(product => product._id === dayString);
            last7DaysProducts.push(productForDay ? productForDay.count : 0);
        }

        const response = {
            statistics: {
                users: users || 0,
                activeUsers: activeUsers || 0,
                inactiveUsers: inactiveUsers || 0,
                drivers: drivers || 0,
                approvedDrivers: approvedDrivers || 0,
                unapprovedDrivers: unapprovedDrivers || 0,
                onlineDrivers: onlineDrivers || 0,
                oflineDrivers: oflineDrivers || 0,
                driverwallet: driverwallet[0]?.totalAmount || 0,
                products: products || 0,
                recommended: recommended || 0,
                unrecommended: unrecommended || 0,
                activeproducts: activeproducts || 0,
                inactiveproducts: inactiveproducts || 0,
                orders: orders || 0,
                inprogressOrders: inprogressOrders || 0,
                completedOrders: completedOrders || 0,
                totalAmount: totalAmount[0]?.total_amount || 0,
                subCategoryDoc: subCategoryDoc || 0,
                last7DaysOrders: last7DaysOrders,
                last7DaysUsers: last7DaysUsers,
                last7DaysAmounts: last7DaysAmounts,
                last7DaysProducts: last7DaysProducts
            }
        };
        console.log(response);
        res.send(response);
    } catch (err) {
        res.send(err);
    }
};



    return controller;
}
