var db = require('../../controller/adaptor/mongodb.js');
var bcrypt = require('bcrypt-nodejs');
var attachment = require('../../model/attachments.js');
var library = require('../../model/library.js');
var Jimp = require("jimp");
var mongoose = require("mongoose");
var CONFIG = require('../../config/config.js');
var async = require("async");
var moment = require("moment");
var timezone = require('moment-timezone');
var mailcontent = require('../../model/mailcontent.js');
const { tags , offermanagement, deals} = require('../../model/mongodb.js');
const path = require('path');
const { promisify } = require('util');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);


module.exports  = function(app){
 var router ={};

 router.multer= async function (req,res){
    try {

      console.log('tag save api hit....',req.body)
      const ogImageFile = req.files['og_image'][0];
      const ogImageUrl = path.join(CONFIG.DIRECTORY_OTHERS, ogImageFile.filename);

      const { tagName, tagUrl, status, category, product ,color} = req.body;

      // Saving data to the database
      const tag = new tags({
        tagName,
        tagUrl,
        status,
        category,
        products: product, 
        iconimg: ogImageUrl,
        color
      });

      const tagdata = await tag.save();
      res.status(200).json({ message: 'Tag saved successfully', tag });
        
    } catch (error) {
        console.log(error);
        return res.send({ status: 0, message: "Something went wrong! Please try again" })
    }
 }

 router.deleteDeal = async function (req,res){
    try {
        console.log('tag delete api hit////',req.body);
        const id = req.body.ids[0]
        const data = await tags.deleteOne({_id:id})
        console.log(data,'tag to be modified')
        if(data === null){
            res.status(403).json({status:'no matching tag found',data})
        }else{
            await db.UpdateDocument('tags',{_id:id},{'status':0},{});
            res.status(200).json({status:'Deletion success',data,item:"tag"});
        }
    } catch (error) {
        console.log(error);
        return res.send({ status: 0, message: "Something went wrong! Please try again" })
    }
 }



//  router.getTagList = async function (req,res){
//   console.log("++++++++++++")
//   console.log(req.body)
//     const usersQuery = [];

//     console.log('tag list api hit',req.body);

//     // Search and filter
//     if (req.body.search) {
//       const searchs = req.body.search;

//       // usersQuery.push({
//       //   "$match": {
//       //     $or: [
//       //       { "tagName": { $regex: searchs + '.*', $options: 'si' } },
//       //     ]
//       //   }
//       // });
//       usersQuery.push({
//         "$match": {
//           "status": { $ne: 0 },  // Moved outside of the $and block
//           $and: [
//             {
//               $or: [
//                 { "tagName": { $regex: searchs + '.*', $options: 'si' } }
//                 // Add more $or conditions if needed
//               ]
//             }
//           ],
//         }
//       });
      
//     }
    

//     if (req.body.status) {
      
//       usersQuery.push({
//         "$match": { "status": {$ne:0}}
//       });
//     }
    
    
//     // usersQuery.push({
//     //     $group: {
//     //       "_id": null,
//     //       "countvalue": { "$sum": 1 },
//     //       "documentData": { $push: "$$ROOT" }
//     //     }
//     //   });

//     // usersQuery.push({
//     //   $unwind: { path: "$documentData", preserveNullAndEmptyArrays: true }
//     // });
    

//     const skip = parseInt(req.body.skip) || 0;
//     const limit = parseInt(req.body.limit) || 10;
//     console.log(skip)
//     console.log(limit)
//     usersQuery.push({ '$skip': skip });
//     usersQuery.push({ '$limit': limit });
    
//     // Sorting
//     const sorting = {};
//     if (req.body.sort) {
//       const sorter =  req.body.sort.field;
//       sorting[sorter] = req.body.sort.order;
//     } else {
//       sorting["createdAt"] = -1; 
//     }
//     usersQuery.push({ $sort: sorting });
    
    
//     // usersQuery.push({
//     //     $group: {
//     //       "_id": null,
//     //       "count": { "$first": "$countvalue" },
//     //       "documentData": { $push: "$documentData" }
//     //     }
//     //   });

//       // console.log(usersQuery,'query for listing ....')

//     try {
//       const docdata = await db.GetAggregation('tags', usersQuery); 
//       console.log(docdata)
//       console.log(docdata,'document data after querying...')
//       if (docdata.length <= 0) {
//         res.send([[], 0]);
//       } else {
//         return res.send([docdata, docdata.length]);
//         // res.send([docdata[0].documentData, docdata[0].documentData.length]);

//       }
//     } catch (e) {
//       console.log(e)
//       console.error(e);
//       return res.send({ status: 0, message: "Something went wrong! Please try again" })
//     }
//  }


router.getDealList = async function (req, res) {
  console.log("++++++++++++")
  console.log(req.body)
  const usersQuery = [];

  console.log('tag list api hit', req.body);

  // Always include status filter
  usersQuery.push({
      "$match": {
          "status": { $ne: 0 }
      }
  });

  // Search and filter
  if (req.body.search) {
      const searchs = req.body.search;

      usersQuery.push({
          "$match": {
              $and: [
                  {
                      $or: [
                          { "tagName": { $regex: searchs + '.*', $options: 'si' } }
                          // Add more $or conditions if needed
                      ]
                  }
              ],
          }
      });
  }

  // Add other filters as necessary
  if (req.body.status) {
      usersQuery.push({
          "$match": { "status": { $ne: 0 } }
      });
  }

  const skip = parseInt(req.body.skip) || 0;
  const limit = parseInt(req.body.limit) || 10;
  console.log(skip)
  console.log(limit)
  usersQuery.push({ '$skip': skip });
  usersQuery.push({ '$limit': limit });

  // Sorting
  const sorting = {};
  if (req.body.sort) {
      const sorter = req.body.sort.field;
      sorting[sorter] = req.body.sort.order;
  } else {
      sorting["createdAt"] = -1;
  }
  usersQuery.push({ $sort: sorting });

  try {
      const docdata = await db.GetAggregation('deals', usersQuery);
      console.log(docdata)
      console.log(docdata, 'document data after querying...')
      if (docdata.length <= 0) {
          res.send([[], 0]);
      } else {
          return res.send([docdata, docdata.length]);
      }
  } catch (e) {
      console.log(e)
      console.error(e);
      return res.send({ status: 0, message: "Something went wrong! Please try again" })
  }
}


 router.getSingleDeal = async function (req,res){
    try {
        console.log('tag get single tag api hit',req.body);
        const {id} = req.body;
        
        const singleTag = await deals.findById(id)
              .populate('category') 
          
              console.log(singleTag,'single Data after querying')
  
          res.send(singleTag);
    
    } catch (error) {
        console.error(e);
        return res.send({ status: 0, message: "Something went wrong! Please try again" })
    }
 }

 router.editDeal = async (req,res)=>{
  try {
    
    console.log(' edit tag api hit',req.body);
    const {id} = req.body;
    // const { tagName, tagUrl, status, category, product ,color} = req.body;
    // const ogImageFile = req.files['og_image'][0];
    // const ogImageUrl = path.join(CONFIG. DIRECTORY_OTHERS, ogImageFile.filename);




    console.log('multer skip edit  hit ',req.body);
    const { dealName, status, category, product, color, avatarBase64 } = req.body;

    let avatarPath = '';

    if (avatarBase64) {
      const base64Match = avatarBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (base64Match) {
        const fileName = Date.now().toString() + '.png';
        const filePath = path.join(CONFIG.DIRECTORY_OTHERS, fileName);
        await base64Upload({ file: filePath, base64: base64Match[2] });
        avatarPath = filePath;
      }else if(avatarBase64 !='' && !base64Match){
        avatarPath = avatarBase64;
      }
    }





    const data = await db.GetDocument('deals',{_id:id},{},{})
      console.log(data,'deal to be modified')
      if(data === null){
          res.status(403).json({status:'no matching tag found',data})
      }else{
          await db.UpdateDocument('deals',{_id:id},{
            dealName,
            status,
            category,
            products: product, 
            // iconimg: avatarPath,
            color
          },{},{});
          return res.send({ status: 1, message: 'Deals Edited successfully' });
      }


  } catch (error) {
    console.error(error);
    return res.send({ status: 0, message: "Something went wrong! Please try again" })
  }
 }



//  router.save = async function(req,res){
//   try {

//     console.log('multer skip hit ',req.body);
//     const { tagName, tagUrl, status, category, product, color, avatarBase64 } = req.body;
//     console.log(product);

//     let avatarPath = '';

//     if (avatarBase64) {
//       const base64Match = avatarBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
//       if (base64Match) {
//         const fileName = Date.now().toString() + '.png';
//         const filePath = path.join(CONFIG.DIRECTORY_OTHERS, fileName);
//         await base64Upload({ file: filePath, base64: base64Match[2] });
//         avatarPath = filePath;
//       }
//     }

//     // Save the tag details along with the avatar path to your database
//     const newTag = new tags({
//       tagName,
//       tagUrl,
//       status,
//       category,
//       products:product,
//       color,
//       iconimg: avatarPath,
//     });

//     await newTag.save();

//     return res.send({ status: 1, message: 'Tag Saved Successfully' });
//   } catch (error) {
//     console.error('Error saving tag:', error);
//     return res.send({ status: 0, message: "Something went wrong! Please try again" })
//   }
//  }
router.getSingleDeal = async function (req,res){
  try {
      console.log('tag get single tag api hit',req.body);
      const {id} = req.body;
      
      const singleTag = await deals.findById(id)
        
            console.log(singleTag,'single Data after querying')

        res.send(singleTag);
  
  } catch (error) {
      console.error(error);
      return res.send({ status: 0, message: "Something went wrong! Please try again" })
  }
}




router.save = async function(req, res) {
  try {
    console.log('multer skip hit ', req.body);
    const { driverName, idNo, licenseNo, doj, expiryDate, nomineeName, nationality } = req.body;
   
      const newDeal = new deals({
        driverName,
        idNo,licenseNo, doj, expiryDate, nomineeName, nationality 
        
        // iconimg: avatarPath,
      });

      await newDeal.save();

      return res.send({ status: 1, message: 'Deal Saved Successfully' });
    // }
  } catch (error) {
    console.error('Error saving deal:', error);
    return res.send({ status: 0, message: "Something went wrong! Please try again" });
  }
}




router.getAllDeals = async function (req, res) {
  const { user_id } = req.body; // Assuming user_id is passed as a query parameter

  try {
    const allDeals = await deals.find({ status: { $eq: 1 } })
      .populate('products') // Assuming products are populated with their details
      .exec();

    console.log(allDeals, 'all deals');

    // Fetch favorite products if user_id is provided
    let favourite_list = [];
    if (user_id) {
      if (!mongoose.isValidObjectId(user_id)) {
        return res.status(400).send({ status: 0, message: "Invalid user id! Please check and try again" });
      }
      
      let fav_list = await db.GetDocument("favourite", { user_id: new mongoose.Types.ObjectId(user_id), status: 1 }, { product_id: 1 }, {});
      favourite_list = fav_list.doc.map(x => x.product_id.toString()); // Ensure to convert ObjectId to string
      console.log(favourite_list, 'favourite_list');
    }else if(req.body.userid){
     
      
      let fav_list = await db.GetDocument("temp_favourite", { user_id: req.body.userid, status: 1 }, { product_id: 1 }, {});
      favourite_list = fav_list.doc.map(x => x.product_id.toString());
      console.log(favourite_list, 'favourite_list');
    }

    // Add favourite information to each deal's products and filter out products with status != 1
    const updatedDeals = allDeals.map(deal => {
      const updatedProducts = deal.products
        .filter(product => product.status === 1) // Filter products with status 1
        .map(product => ({
          ...product.toObject(),
          favourite: favourite_list.includes(product._id.toString()) // Check if the product is in the favorites
        }));

      return {
        ...deal.toObject(),
        products: updatedProducts // Only include products with status 1
      };
    });

    return res.status(200).json(updatedDeals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return res.send({ status: 0, message: "Something went wrong! Please try again" });
  }
};

 return router

}





async function base64Upload({ file, base64 }) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    await writeFile(file, buffer);
    return { success: true, filePath: file };
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw error;
  }
}