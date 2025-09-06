
module.exports = function (io) {
    var bcrypt = require('bcrypt-nodejs');
    var async = require("async");
    var GoogleAPI = require('../../model/googleapis.js');
    var mongoose = require("mongoose");
    var db = require('../adaptor/mongodb.js');
    var twilio = require('../../model/twilio.js');
    var library = require('../../model/library.js');
    var crypto = require('crypto');
    var controller = {};
    // var otp = require('otplib/lib/authenticator');
    var otp = require('otplib');
    otp.options = { crypto };
    var fs = require("fs");
    var attachment = require('../../model/attachments.js');
    var middlewares = require('../../model/middlewares.js');
    var Jimp = require("jimp");
    var path = require('path');
    var moment = require("moment");
    var CONFIG = require('../../config/config');
    var push = require('../../model/pushNotification.js')(io);
    var mailcontent = require('../../model/mailcontent.js');
    var timezone = require('moment-timezone');
    var htmlToText = require('html-to-text');
    var jwt = require('jsonwebtoken');
    var each = require('sync-each');
    var deg2rad = require('deg2rad');
    var distance = require('google-distance-matrix');

    const { check, body, validationResult, sanitizeBody } = require('express-validator');



    controller.ratingProductList = async (req, res) => {
        try {
            let settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {});
            settings = settings.doc;
            let product_id = req.body.product_id;
            if (!mongoose.isValidObjectId(product_id)) {
                return res.send({ status: 0, message: "Invalid product id!" });
            };
            let condition = { product_id: new mongoose.Types.ObjectId(product_id), status: 1 };
            let skip = req.body.skip ? parseInt(req.body.skip) : 0;
            let limit = req.body.limit ? parseInt(req.body.limit) : 10;
            let sort_val = {};
            if (req.body.sort && req.body.sort.name) {
                let sort = req.body.sort;
                sort_val[sort.name] = sort.value;
            } else {
                sort_val = { createdAt: -1 };
            };
            let ratingList = await db.GetAggregation('ratings', [
                {
                    $match: condition
                }, {
                    $sort: sort_val
                }, {
                    $skip: skip
                }, {
                    $limit: limit
                }, {
                    $lookup: {
                        from: "users",
                        let: { user_id: "$user" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$_id", "$$user_id"] },
                                            { $eq: ["$status", 1] }
                                        ]
                                    }
                                }
                            }, {
                                $project: {
                                    username: 1,
                                    first_name: 1,
                                    last_name: 1,
                                    email: 1,
                                    avatar: 1,
                                    createdAt: 1,
                                    updatedAt: 1,
                                }
                            }
                        ],
                        as: "users"
                    }
                }, {
                    $unwind: { path: "$users", preserveNullAndEmptyArrays: false }
                }, {
                    $project: {
                        rating: 1,
                        comment: 1,
                        image: 1,
                        user: 1,
                        product_id: 1,
                        order_id: 1,
                        users: 1,
                        createdAt: 1,
                        updatedAt: 1,
                    }
                }
            ]);


            if (ratingList && ratingList.length > 0) {
                for (let i = 0; i < ratingList.length; i++) {
                    if (ratingList[i].image && ratingList[i].image.length > 0) {
                        for (let j = 0; j < ratingList[i].image.length; j++) {
                            ratingList[i].image[j] = settings.settings.site_url + ratingList[i].image[j]
                        }
                    }


                }
            }



            let ratingCounts = await db.GetCount('ratings', condition);
            return res.send({ status: 1, error: false, message: "Rating list found", data: ratingList, totalCount: ratingCounts });;
        } catch (error) {
            console.log(error)
            return res.send({ status: 0, error: true, message: "Something went wrong please try again" })
        }
    }




    controller.getReviewDetail = async (req, res) => {

        var errors = validationResult(req).errors;
        if (errors && Array.isArray(errors) && errors.length > 0) {
            res.send({ status: 0, message: errors[0].msg });
            return;
        }
        let settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {});
        settings = settings.doc;
        if (!settings) {
            return res.send({ status: 0, message: "Something went wrong please try again" })
        } else {
            let docDetal = await db.GetOneDocument('ratings', { product_id: new mongoose.Types.ObjectId(req.body.product_id), user: new mongoose.Types.ObjectId(req.body.user_id), _id: new mongoose.Types.ObjectId(req.body.rating_id) }, {}, { createdAt: -1 });
            docDetal = docDetal.doc;
            if (!docDetal) {
                return res.send({ status: 0, message: "No review found" });
            } else {
                var images = [];
                // if (docDetal.image && docDetal.image.length > 0) {
                // 	docDetal.image.forEach(e => {
                // 		images.push(settings.settings.site_url + e.slice(2))
                // 	})
                // 	docDetal.image = images;
                // }
                return res.send({ status: 1, data: docDetal });
            };
        };

    }




    controller.reviewProduct = async (req, res) => {
        let errors = validationResult(req).errors;
        if (errors && Array.isArray(errors) && errors.length > 0) {
            res.send({
                status: false,
                message: errors[0].msg
            });
            return;
        }
        var data = {};
        data.rating = req.body.rating;
        data.comment = req.body.comment;
        data.username = req.body.username;
        data.rating_id = req.body.rating_id;
        data.order_id = req.body.order_id;
        data.user = new mongoose.Types.ObjectId(req.body.user_id);
        data.product_id = new mongoose.Types.ObjectId(req.body.product_id);
        data.image = [];
        if (req.body.image && Array.isArray(req.body.image) && req.body.image.length > 0) {
            data.image = req.body.image;
        }
        // if (req.body.multiBase64 && req.body.multiBase64.length > 0) {
        //     for (let index = 0; index < req.body.multiBase64.length; index++) {
        //         var Base64 = req.body.multiBase64[index].match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        //         var file_name = Date.now().toString() + index + '.png';
        //         var fil = CONFIG.DIRECTORY_OTHERS + file_name;
        //         library.base64Upload({ file: fil, base64: Base64[2] }, function (err, response) {
        //         });
        //         data.image.push(fil);
        //         delete fil
        //     }
        // };

        let productResult = await db.GetOneDocument('food', { _id: data.product_id }, {}, {});

        console.log("product result", productResult)
        let productDetails = productResult.doc;
        if (productDetails) {
            productDetails.total_rating = productDetails.total_rating ? productDetails.total_rating : 0;
            productDetails.total_rating_users = productDetails.total_rating_users ? productDetails.total_rating_users : 0;
            if (data.rating_id) {
                if (!mongoose.isValidObjectId(data.rating_id)) {
                    return res.send({ status: false, message: "Invalid rating id" });
                };
                let ratingDetails = await db.GetOneDocument('ratings', { _id: new mongoose.Types.ObjectId(data.rating_id) }, {}, {});
                ratingDetails = ratingDetails.doc;
                let total_rating = productDetails.total_rating - (ratingDetails.rating ? ratingDetails.rating : 0) + data.rating;
                let avg_rating = Number((total_rating / productDetails.total_rating_users).toFixed(1));
                await db.UpdateDocument('food', { _id: data.product_id }, { total_rating: total_rating, rating: avg_rating });
                await db.UpdateDocument('orders', { _id: new mongoose.Types.ObjectId(data.order_id), foods: { $elemMatch: { id: data.product_id } } }, { "foods.$.rating_user": true, "foods.$.rating": data.rating }, {});
                let ratingInsert = await db.UpdateDocument('ratings', { _id: new mongoose.Types.ObjectId(data.rating_id) }, data, {});
                if (ratingInsert) {
                    return res.send({ status: true, message: "Review updated successfully" })
                } else {
                    return res.send({ status: false, message: 'Something went wrong please try again' })
                }
            } else {
                if (!mongoose.isValidObjectId(data.order_id)) {
                    return res.send({ status: false, message: "Inavlid order id" });
                }
                let total_rating = productDetails.total_rating + data.rating;
                let avg_rating = Number((total_rating / (productDetails.total_rating_users + 1)).toFixed(1));
                await db.UpdateDocument('food', { _id: data.product_id }, { rating: avg_rating, total_rating: total_rating, $inc: { total_rating_users: 1 } }, {});

                data.productName = productDetails.name
                let ratingInsert = await db.InsertDocument('ratings', data);
                if (ratingInsert) {
                    await db.UpdateDocument('orders', { _id: new mongoose.Types.ObjectId(data.order_id), foods: { $elemMatch: { id: data.product_id } } }, { "foods.$.rating_user": true, "foods.$.rating": data.rating, "foods.$.rating_id": ratingInsert._id }, {});
                    return res.send({ status: true, message: "Review created successfully" })
                } else {
                    return res.send({ status: false, message: 'Something went wrong please try again' })
                }
            }
        } else {
            return res.send({ status: false, message: "Product not please check and try again" });
        }
    }


    // controller.reviewProduct = async (req, res) => {
    //     let errors = validationResult(req).errors;
    //     if (errors && Array.isArray(errors) && errors.length > 0) {
    //         res.send({
    //             status: false,
    //             message: errors[0].msg
    //         });
    //         return;
    //     }
    //     var data = {};
    //     data.rating = req.body.rating;
    //     data.comment = req.body.comment;
    //     data.username = req.body.username;
    //     data.rating_id = req.body.rating_id;
    //     data.order_id = req.body.order_id;
    //     data.user = new mongoose.Types.ObjectId(req.body.user_id);
    //     data.product_id = new mongoose.Types.ObjectId(req.body.product_id);
    //     data.image = [];
    
    //     if (req.body.multiBase64 && Array.isArray(req.body.multiBase64) && req.body.multiBase64.length > 0) {
    //         for (let index = 0; index < req.body.multiBase64.length; index++) {
    //             let base64String = req.body.multiBase64[index];
    //             let matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    //             if (matches.length !== 3) {
    //                 return res.send({ status: false, message: 'Invalid base64 string' });
    //             }
    
    //             let fileType = matches[1].split('/')[1];
    //             let base64Data = matches[2];
    //             let fileName = `${Date.now().toString()}_${index}.${fileType}`;
    //             let filePath = path.join(CONFIG.DIRECTORY_OTHERS, fileName);
    
    //             try {
    //                 fs.writeFileSync(filePath, base64Data, 'base64');
    //                 data.image.push(filePath);
    //             } catch (error) {
    //                 return res.send({ status: false, message: 'Error saving image' });
    //             }
    //         }
    //     }
    
    //     let productResult = await db.GetOneDocument('food', { _id: data.product_id }, {}, {});
    //     let productDetails = productResult.doc;
    
    //     if (productDetails) {
    //         productDetails.total_rating = productDetails.total_rating ? productDetails.total_rating : 0;
    //         productDetails.total_rating_users = productDetails.total_rating_users ? productDetails.total_rating_users : 0;
    
    //         if (data.rating_id) {
    //             if (!mongoose.isValidObjectId(data.rating_id)) {
    //                 return res.send({ status: false, message: "Invalid rating id" });
    //             };
    //             let ratingDetails = await db.GetOneDocument('ratings', { _id: new mongoose.Types.ObjectId(data.rating_id) }, {}, {});
    //             ratingDetails = ratingDetails.doc;
    //             let total_rating = productDetails.total_rating - (ratingDetails.rating ? ratingDetails.rating : 0) + data.rating;
    //             let avg_rating = Number((total_rating / productDetails.total_rating_users).toFixed(1));
    //             await db.UpdateDocument('food', { _id: data.product_id }, { total_rating: total_rating, rating: avg_rating });
    //             await db.UpdateDocument('orders', { _id: new mongoose.Types.ObjectId(data.order_id), foods: { $elemMatch: { id: data.product_id } } }, { "foods.$.rating_user": true, "foods.$.rating": data.rating }, {});
    //             let ratingInsert = await db.UpdateDocument('ratings', { _id: new mongoose.Types.ObjectId(data.rating_id) }, data, {});
    //             if (ratingInsert) {
    //                 return res.send({ status: true, message: "Review updated successfully" })
    //             } else {
    //                 return res.send({ status: false, message: 'Something went wrong please try again' })
    //             }
    //         } else {
    //             if (!mongoose.isValidObjectId(data.order_id)) {
    //                 return res.send({ status: false, message: "Invalid order id" });
    //             }
    //             let total_rating = productDetails.total_rating + data.rating;
    //             let avg_rating = Number((total_rating / (productDetails.total_rating_users + 1)).toFixed(1));
    //             await db.UpdateDocument('food', { _id: data.product_id }, { rating: avg_rating, total_rating: total_rating, $inc: { total_rating_users: 1 } }, {});
    
    //             data.productName = productDetails.name;
    //             let ratingInsert = await db.InsertDocument('ratings', data);
    //             if (ratingInsert) {
    //                 await db.UpdateDocument('orders', { _id: new mongoose.Types.ObjectId(data.order_id), foods: { $elemMatch: { id: data.product_id } } }, { "foods.$.rating_user": true, "foods.$.rating": data.rating, "foods.$.rating_id": ratingInsert._id }, {});
    //                 return res.send({ status: true, message: "Review created successfully" })
    //             } else {
    //                 return res.send({ status: false, message: 'Something went wrong please try again' })
    //             }
    //         }
    //     } else {
    //         return res.send({ status: false, message: "Product not found, please check and try again" });
    //     }
    // };











    controller.specific_rating_count = async (req, res) => {
        try {
            var product_id = req.body.product_id
            var data = {}


            var pipeline = [
                {
                    $match: {
                        "product_id": new mongoose.Types.ObjectId(req.body.product_id)
                    }
                },
                {

                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        _id: 1

                    }
                }
            ]

            let specific_count = await db.GetAggregation('ratings', pipeline)




            if (!specific_count) {
                data.status = 0
                data.error = true;
                data.message = "Somthing went wrong"
                res.send(data)
            } else {

                data.status = 1
                data.error = false;
                data.message = "Success"
                data.specific_count = specific_count
                res.send(data)


            }
        } catch (e) {
            console.log("Error in specific_rating_count api in rating.js", e)
        }


    }


















    // controller.setProductRating = async function (req, res) {
    //     try {
    //         const user_id = req.body.user_id;
    //         const product_id = req.body.product_id;
    //         let data = {}
    //         data.error = false;
    //         data.message = "Product Rated Successfully"
    //         data.data = {
    //             product_rating: []
    //         }
    //         res.send(data)
    //     } catch (error) {
    //         res.send(error)
    //     }
    // }

    // controller.deleteProductRating = async function (req, res) {
    //     try {
    //         const rating_id = req.body.rating_id;
    //         let data = {}
    //         data.error = false;
    //         data.message = "Deleted Rating Successfully";
    //         data.data = []
    //     } catch (error) {

    //     }
    // }

    // controller.getProductRating = async function (req, res) {
    //     try {
    //         const product_id = req.body.product_id;
    //         let data = {};
    //         data.error = false;
    //         data.message = "Rating retrieved successfully";
    //         data.no_of_rating = 0;
    //         data.total = "";
    //         data.star_1 = "";
    //         data.star_2 = "";
    //         data.star_3 = "";
    //         data.star_4 = "";
    //         data.star_5 = "";
    //         data.total_images = '';
    //         data.product_rating = "";
    //         data.data = []
    //         res.send(data);
    //     } catch (error) {
    //         res.send(error)
    //     }
    // }



    // controller.add_product_faqs = async function (req, res) {


    //     try {
    //         var faqs_data = {};
    //         faqs_data.question = req.body.question
    //         faqs_data.user = req.body.user_id
    //         faqs_data.product_id = req.body.product_id
    //         const add_faqs = await db.InsertDocument('faqs', faqs_data)
    //         var data = {}
    //         if (!add_quest) {
    //             data.message = "Some thing Went wrong",
    //                 data.status = 0
    //             res.send(data)
    //         } else {
    //             data.message = "Your Question Was Posted Successfully",
    //                 data.status = 1
    //             res.send(data)
    //         }
    //     } catch (e) {
    //         console.log("error at add_product_faqs api ", e)
    //     }
    // }





    return controller;
}





