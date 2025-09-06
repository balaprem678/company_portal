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
const { tags, offermanagement } = require('../../model/mongodb.js');
const path = require('path');
const { promisify } = require('util');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);


module.exports = function (app) {
  var router = {};

  router.multer = async function (req, res) {
    try {

      console.log('tag save api hit....', req.body)
      const ogImageFile = req.files['og_image'][0];
      const ogImageUrl = path.join(CONFIG.DIRECTORY_OTHERS, ogImageFile.filename);

      const { tagName, tagUrl, status, category, product, color } = req.body;

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

  router.deleteTag = async function (req, res) {
    try {
      console.log('tag delete api hit////', req.body);
      const id = req.body.ids[0]
      const data = await tags.deleteOne({ _id: id })
      console.log(data, 'tag to be modified')
      if (data === null) {
        res.status(403).json({ status: 'no matching tag found', data })
      } else {
        await db.UpdateDocument('tags', { _id: id }, { 'status': 0 }, {});
        res.status(200).json({ status: 'Deletion success', data, item: "tag" });
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


  router.getTagList = async function (req, res) {
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
      const docdata = await db.GetAggregation('tags', usersQuery);
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


  router.getSingleTag = async function (req, res) {
    try {
      console.log('tag get single tag api hit', req.body);
      const { id } = req.body;

      const singleTag = await tags.findById(id)
        .populate('category')

      console.log(singleTag, 'single Data after querying')

      res.send(singleTag);

    } catch (error) {
      console.error(e);
      return res.send({ status: 0, message: "Something went wrong! Please try again" })
    }
  }

  router.editTag = async (req, res) => {
    try {

      console.log(' edit tag api hit', req.body);
      const { id } = req.body;
      // const { tagName, tagUrl, status, category, product ,color} = req.body;
      // const ogImageFile = req.files['og_image'][0];
      // const ogImageUrl = path.join(CONFIG.DIRECTORY_OTHERS, ogImageFile.filename);




      console.log('multer skip edit  hit ', req.body);
      const { name, status, address, number } = req.body;

      console.log(batchBase64,"batchBase64batchBase64batchBase64");
      
// return



      const data = await db.GetDocument('tags', { _id: id }, {}, {})
      console.log(data, 'tag to be modified')
      if (data === null) {
        res.status(403).json({ status: 'no matching tag found', data })
      } else {
        await db.UpdateDocument('tags', { _id: id }, {
          name,
          status,
          address,
          number
        }, {}, {});
        return res.send({ status: 1, message: 'vendor Edited successfully' });
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


  router.save = async function (req, res) {
    try {
      console.log('multer skip hit ', req.body);
      const { name, status, address, number } = req.body;
      // console.log(product);

      // let avatarPath = '';
      // let batchPath = ''

      // if (avatarBase64) {
      //   const base64Match = avatarBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      //   if (base64Match) {
      //     const fileName = Date.now().toString() + '.png';
      //     const filePath = path.join(CONFIG.DIRECTORY_OTHERS, fileName);
      //     await base64Upload({ file: filePath, base64: base64Match[2] });
      //     avatarPath = filePath;
      //   }
      // }
      // if (batchBase64) {
      //   const base64Match = batchBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      //   if (base64Match) {
      //     const fileName = Date.now().toString() + '.png';
      //     const filePath = path.join(CONFIG.DIRECTORY_OTHERS, fileName);
      //     await base64Upload({ file: filePath, base64: base64Match[2] });
      //     batchPath = filePath;
      //   }
      // }

      // // Check if a tag with the same name already exists and has a status of 0
      // const existingTag = await tags.findOne({ name: name });

      // if (existingTag) {
        // if (existingTag.status === 0) {
        //   // Update the existing tag
        //   existingTag.tagUrl = tagUrl;
        //   existingTag.status = status;
        //   existingTag.category = category;
        //   existingTag.products = product;
        //   existingTag.color = color;
        //   // if (avatarPath) {
        //   //   existingTag.iconimg = avatarPath;
        //   // }
        //   // if (batchPath) {
        //   //   existingTag.batchimg = batchPath;
        //   // }

        //   await existingTag.save();

        //   return res.send({ status: 1, message: 'Tag Updated Successfully' });
        // } else {
        //   // If the tag already exists and is not inactive, return an error
        //   return res.send({ status: 0, message: 'Tag already exists with an active status.' });
        // }
      // } else {
        // Create a new tag if no existing one is found
        const newTag = new tags({
          name,
          status,
          address,
          number
        });

        await newTag.save();

        return res.send({ status: 1, message: 'Vendor Saved Successfully' });
      // }
    } catch (error) {
      console.error('Error saving tag:', error);
      return res.send({ status: 0, message: "Something went wrong! Please try again" });
    }
  }



  router.getAllTags = async function (req, res) {
    const { user_id } = req.body; // Assuming user_id is passed as a query parameter
    const getUser= await db.GetOneDocument('users',{_id:user_id},{},{})
    if(getUser.status){

      try {
        const allTags = await tags.find({ status: { $eq: 1 } })
          .populate('products') // Populating the products field
          .exec();
  
        console.log(allTags, 'all tags');
  
        // Fetch favorite products if user_id is provided
        let favourite_list = [];
        
        if (user_id != "") {
          if (!mongoose.isValidObjectId(user_id)) {
            return res.status(400).send({ status: 0, message: "Invalid user id! Please check and try again" });
          }
           
          let fav_list = await db.GetDocument("favourite", { user_id: new mongoose.Types.ObjectId(user_id), status: 1 }, { product_id: 1 }, {});
          favourite_list = fav_list.doc.map(x => x.product_id.toString()); // Ensure to convert ObjectId to string
          console.log(favourite_list, 'favourite_list');
        }
  
        // Add favourite information to each tag's products
        const updatedTags = allTags.map(tag => {
          const updatedProducts = tag.products.map(product => ({
            ...product.toObject(),
            favourite: favourite_list.includes(product._id.toString()) // Check if the product is in the favorites
          }));
  
          return {
            ...tag.toObject(),
            products: updatedProducts
          };
        });
  
        return res.status(200).json(updatedTags);
      } catch (error) {
        console.error('Error fetching tags:', error);
        return res.send({ status: 0, message: "Something went wrong! Please try again" });
      }
    }else{
      try {
        const allTags = await tags.find({ status: { $eq: 1 } })
          .populate('products') // Populating the products field
          .exec();
  
        console.log(allTags, 'all tags');
  
        // Fetch favorite products if user_id is provided
        let favourite_list = [];
        
        if (user_id != "") {
           
          let fav_list = await db.GetDocument("temp_favourite", { user_id: user_id, status: 1 }, { product_id: 1 }, {});
          favourite_list = fav_list.doc.map(x => x.product_id.toString()); // Ensure to convert ObjectId to string
          console.log(favourite_list, 'favourite_list');
        }
  
        // Add favourite information to each tag's products
        const updatedTags = allTags.map(tag => {
          const updatedProducts = tag.products.map(product => ({
            ...product.toObject(),
            favourite: favourite_list.includes(product._id.toString()) // Check if the product is in the favorites
          }));
  
          return {
            ...tag.toObject(),
            products: updatedProducts
          };
        });
  
        return res.status(200).json(updatedTags);
      } catch (error) {
        console.error('Error fetching tags:', error);
        return res.send({ status: 0, message: "Something went wrong! Please try again" });
      }
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