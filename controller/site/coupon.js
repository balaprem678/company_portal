var db = require('../../controller/adaptor/mongodb.js');
var attachment = require('../../model/attachments.js');
var middlewares = require('../../model/middlewares.js');
var async = require('async');
var mongoose = require('mongoose');

module.exports = function () {
    var router = {};
    // router.getpage = function getpage(req, res) {
    // 	if (req.body.language != undefined) {
    // 		db.GetDocument('languages', { $and: [{ status: { $ne: 0 } }, { name: req.body.language }] }, {}, {}, function (err, languagedata) {
    // 			if (err || languagedata.length == 0) {
    // 				res.send(err);
    // 			} else {
    // 				db.GetDocument('pages', { slug: req.body.slug,status :1 }, {}, {}, function (err, pagedetailsdata) {
    // 					if (err || !pagedetailsdata) {
    // 						res.send([]);
    // 					} else {
    // 						if(typeof pagedetailsdata != 'undefined' && pagedetailsdata.length > 0){
    // 							var language = languagedata[0]._id;
    // 							db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { parent: new mongoose.Types.ObjectId(pagedetailsdata[0]._id) }, { language: new mongoose.Types.ObjectId(language) }] }, {}, {}, function (err, pagedata) {
    // 								if (err || pagedata.length == 0) {
    // 									db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { _id: new mongoose.Types.ObjectId(pagedetailsdata[0]._id) }] }, {}, {}, function (err, pagedata) {
    // 										if (err || pagedata.length == 0) {
    // 											res.send([])
    // 										} else {
    // 											res.send(pagedata);
    // 										}
    // 									});
    // 								} else {
    // 									res.send(pagedata);
    // 								}
    // 							});
    // 						}else{
    // 							res.send([])
    // 						}
    // 					}
    // 				});
    // 			}
    // 		});
    // 	} else {
    // 		db.GetDocument('languages', { default: { $eq: 1 } }, {}, {}, function (err, languagedata) {
    // 			if (err) {
    // 				res.send(err);
    // 			} else {
    // 				db.GetDocument('pages', { slug: req.body.slug,status :1}, {}, {}, function (err, pagedetailsdata) {
    // 					if (err || !pagedetailsdata) {
    // 						res.send([]);
    // 					} else {
    // 						if(typeof pagedetailsdata != 'undefined' && pagedetailsdata.length > 0){
    // 							var language = languagedata[0]._id;
    // 							db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { parent: new mongoose.Types.ObjectId(pagedetailsdata[0]._id) }, { language: new mongoose.Types.ObjectId(language) }] }, {}, {}, function (err, pagedata) {
    // 								if (err || pagedata.length == 0) {
    // 									db.GetDocument('pages', { $and: [{ status: { $ne: 0 } }, { _id: new mongoose.Types.ObjectId(pagedetailsdata[0]._id) }] }, {}, {}, function (err, pagedata) {
    // 										if (err || pagedata.length == 0) {
    // 											res.send([])
    // 										} else {
    // 											res.send(pagedata);
    // 										}
    // 									});
    // 								} else {
    // 									res.send(pagedata);
    // 								}
    // 							});
    // 						}else{
    // 							res.send([])
    // 						}
    // 					}
    // 				});

    // 			}
    // 		});
    // 	}
    // }

    console.log("ki");
    // db.myCollection.update(
    //     { "_id": 1 }, // Find the document with _id: 1
    //     {
    //       "$push": {
    //         "items": {
    //           "name": "newItem",
    //           "quantity": 5
    //         }
    //       }
    //     }
    //   )

    router.applyCoupon = async function applyCoupon(req, res) {
        try {
            console.log(req.body, 'asdfasdf');
            console.log(req.body, 'this is request body');
            const couponCode = req.body.couponCode;
            const user_id = req.body.user_id;
            const cart_id = req.body.cart_id;
            const type = req.body.type;  // buy_now, cart
            const amount = req.body.cartamount
            const today = new Date()
            let couponCondition = false;
            const coupon = await db.GetOneDocument('coupon', { 'code': couponCode }, {}, {})

            console.log('__________________________________________________');

            console.log(coupon, 'this is the coupon2');


            if (coupon.status === false) {
                res.send({ error: true, status: 0, message: "Invalid coupon code. Please try again with a valid one" })
            }
            else {

                if (coupon.doc.status === 2) {
                    res.send({ error: true, status: 0, message: "Invalid coupon code. Please try again with a valid one" })
                }
                else {

                    if (coupon.doc.valid_from < today) {
                        console.log("Hi this fine now");
                        if (coupon.doc.expiry_date > today) {
                            console.log("Hi this is not fine now");
                            if (coupon.doc.used <= coupon.doc.total) {
                                console.log("Hi waiting for you");
                                if (coupon.doc.used_by) {
                                    const userEntry = coupon.doc.used_by.find(entry => entry.user_id === user_id);
                                    console.log(userEntry, 'this is user entry');
                                    if (userEntry) {
                                        if (userEntry.number_of_time < coupon.doc.usage.per_user && coupon.doc.total > 0) {
                                            console.log(coupon.doc.total, 'coupon.doc.totalcoupon.doc.total');
                                            // coupon.doc.total = coupon.doc.total - 1;
                                            const update = await db.UpdateDocument('coupon', { '_id': coupon._id }, { $set: { total: total - 1 } }, {});
                                            console.log(update, 'check the coupon is updated');
                                            couponCondition = true
                                        } else {
                                            res.send({ error: true, status: 0, message: `You have already used the limit` })
                                        }
                                    } else if (coupon.doc.total > 0) {
                                        couponCondition = true;
                                    }
                                    else {
                                        res.send({ error: true, status: 0, message: `The coupon not available` })
                                    }
                                } else if (coupon.doc.total > 0) {
                                    couponCondition = true;
                                }
                                else {
                                    res.send({ error: true, status: 0, message: `The coupon not available` })
                                }
                            } else {
                                res.send({ error: true, status: 0, message: `The coupon not available` })
                            }
                        } else {
                            res.send({ error: true, status: 0, message: `The coupon code is expired` })
                        }
                    } else {
                        res.send({ error: true, status: 0, message: `The coupon code is not active now` })
                    }
                }
            }
            if (couponCondition) {
                console.log('surprise you entered at here');
                // const cart= await db.UpdateDocument('users', { '_id': user._id }, { $push: { refer_activity: refer_offer } }, {})
                if (type == 'buy_now') {

                } else {
                    const cart = await db.GetOneDocument('cart', { _id: cart_id }, {}, {})
                    console.log(cart.doc, 'this is the cart ____________');
                    if (cart.status == false) {
                        res.send({ error: true, message: 'Something went wrong' })
                    } else {
                        const discount_type = coupon.doc.discount_type;
                        let discount_amount;
                        if (discount_type == 'Percentage') {
                            // Calculate the total price for the cart, considering the quantity of each item.
                            const sumPspriceQuantity = cart.doc.cart_details.reduce((total, item) => total + (item.psprice * item.quantity), 0);
                            
                            // Check if the cart total meets the minimum amount requirement.
                            if (sumPspriceQuantity < coupon.doc.minamount) {
                                return res.send({ error: true, status: 0, message: `The total cart amount must be at least ${coupon.doc.minamount} to apply this coupon.` });
                            }
                        
                            // Calculate the discount amount based on the percentage.
                            const discountAmount = (coupon.doc.amount_percentage / 100) * sumPspriceQuantity;
                            
                            // Ensure the discount does not exceed the maximum allowed amount.
                            if (discountAmount > coupon.doc.maxamount) {
                                discount_amount = coupon.doc.maxamount;
                            } else {
                                discount_amount = discountAmount;
                            }
                        
                            // Apply the discount to the cart.
                            const update = await db.UpdateDocument('cart', { '_id': cart_id }, { $set: { coupon_discount: discount_amount, coupon_code: couponCode, discount_type: discount_type } }, {});
                            
                            console.log(update, 'this is the update');
                        
                            if (update.status) {
                                res.send({ error: false, status: 1, message: 'The coupon is added successfully' });
                            } else {
                                res.send({ message: 'Something went wrong', error: true });
                            }
                        } else if (discount_type == 'Flat') {
                            console.log("reached here +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                            console.log(coupon.doc.minamount)
                            console.log(amount);
                            if (amount < coupon.doc.minamount) {
                                return res.send({ error: true, status: 0, message: "minimum amount is required for apply this coupon" })

                            }
                            discount_amount = coupon.doc.amount_percentage;
                            // const update= await db.UpdateDocument('coupon', { '_id': coupon._id }, { $set: { refer_activity: refer_offer } }, {})
                            const update = await db.UpdateDocument('cart', { '_id': cart_id }, { $set: { coupon_discount: discount_amount, coupon_code: couponCode, discount_type: discount_type } }, {})
                            console.log(update, 'this  is the update');
                            if (update.status) {
                                //   const update1=  await db.UpdateDocument('coupon', { '_id': coupon.doc._id }, { $inc: { used: 1 } }, {})
                                //   console.log(update1,'this is the update increment used');
                                //  const update= await db.UpdateDocument('coupon', { '_id': coupon._id }, { $push: { used_by: {user_id:user_id, number_of_time:} } }, {})
                                // let userEntry = coupon.doc.used_by.find(entry => entry.user_id === user_id);
                                // if(userEntry){
                                //  const update2= await db.UpdateDocument('coupon', { '_id': coupon.doc._id, 'used_by.user_id': user_id }, { $inc: { "used_by.user_id": {number_of_time:1} } }, {})
                                //   console.log(update2,'this is the update increment used number_of_time');
                                // }else{
                                // await db.UpdateDocument('coupon', { '_id': coupon.doc._id }, { $push: { used_by: {user_id:user_id, number_of_time:1} } }, {})
                                res.send({ error: false, status: 1, message: 'The coupon is added successfully' })
                                // const update= await db.UpdateDocument('coupon', { '_id': user_id }, { $push: {user_id:user_id,number_of_time:1} }, {})
                                // }
                            } else {
                                res.send({ message: 'Something went wrong', error: true })
                            }

                        }
                    }
                }
            }
        } catch (error) {

        }
    }
    router.fetchCoupon = async function fetchCoupon(req, res) {
        try {
            const { cartAmount, userId } = req.body;  // Assuming cartAmount and userId are sent in the request body
            const currentDate = new Date();

            // Validate the cart amount
            if (isNaN(cartAmount)) {
                return res.status(400).send({ error: true, message: "Invalid cart amount" });
            }

            // Fetch active coupons within the valid date range
            const coupons = await db.GetDocument('coupon', {
                status: 1,  // Active coupons
                valid_from: { $lte: currentDate },  // Valid from is before or equal to the current date
                expiry_date: { $gte: currentDate }  // Expiry date is after or equal to the current date
            }, {}, {});

            console.log(coupons.doc);

            // Separate available coupons and nearest coupons
            const availableCoupons = [];
            const nearestCoupons = [];

            coupons.doc.forEach(coupon => {
                // Check if the coupon can be used for the current cart amount
                const meetsMinAmountCondition = cartAmount >= coupon.minamount;

                // Check maxamount condition only for "Percentage" discount_type
                const meetsMaxAmountCondition = coupon.discount_type === "Percentage"
                    ? (!coupon.maxamount || cartAmount <= coupon.maxamount)
                    : true;  // No maxamount check for "Flat"

                // Check coupon usage limits
                const totalUsed = coupon.used || 0;
                const totalCoupons = coupon.usage.total_coupons || Infinity;  // Total coupon usage limit
                const userUsage = coupon.used_by.find(user => user.user_id === userId);  // Find user's coupon usage
                const userUsedCount = userUsage ? userUsage.number_of_time : 0;  // How many times the user has used the coupon
                const perUserLimit = coupon.usage.per_user || Infinity;  // Per-user coupon usage limit

                const meetsUsageConditions = totalUsed < totalCoupons && userUsedCount < perUserLimit;

                // If the coupon can be applied, add it to availableCoupons
                if (meetsMinAmountCondition && meetsMaxAmountCondition && meetsUsageConditions) {
                    availableCoupons.push(coupon);
                }
                // If the coupon's minamount is greater than the cartAmount, consider it as a nearest coupon
                else if (coupon.minamount > cartAmount) {
                    nearestCoupons.push(coupon);
                }
            });

            // Return the available coupons and nearest coupons
            res.status(200).json({
                success: true,
                data: {
                    availableCoupons,
                    nearestCoupons
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch available coupons',
                error: error.message
            });
        }
    }




    router.removeCoupon = async function applyCoupon(req, res) {
        try {
            console.log(req.body, 'this is request body');
            const couponCode = req.body.couponCode;
            const user_id = req.body.user_id;
            const cart_id = req.body.cart_id;
            const type = req.body.type;  // buy_now, cart
            const today = new Date()
            let couponCondition = false;
            const coupon = await db.GetOneDocument('coupon', { 'code': couponCode }, {}, {})
            console.log(coupon, 'this is the coupon');
            if (coupon.status === false) {
                res.send({ error: true, message: 'There is some error' })
            } else {
                const update = await db.UpdateDocument('cart', { '_id': cart_id }, { $unset: { coupon_discount: '', coupon_code: '', discount_type: '' } }, {})
                console.log(update, 'coupon update detailss');
                if (update.status == false) {
                    res.send({ error: true, message: 'There is some error please try later' })
                } else {
                    res.send({ error: false, message: 'The coupon is removed' })
                }
            }

        } catch (error) {

        }
    }

    router.updateCouponTotal = async function applyCoupon(req, res) {
        try {
            const couponCode = req.body.couponCode;

            if (!couponCode) {
                return res.status(400).send({ message: 'Coupon code is required' });
            }
            const result = await db.UpdateDocument('coupon', { 'code': couponCode, 'total': { $gt: 0 } }, { $inc: { total: -1 } }, {});

            if (result.modifiedCount > 0) {
                res.status(200).send({ message: 'Coupon total updated successfully' });
            } else {
                res.status(404).send({ message: 'Coupon not found or total is already zero' });
            }
        } catch (error) {
            res.status(500).send({ message: 'An error occurred while updating the coupon total', error: error.message });
        }
    };


    return router;
};
