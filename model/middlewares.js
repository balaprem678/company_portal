var Json2csvParser = require('json2csv').Parser;
// var json2csv = require('json2csv');
var multer = require('multer');
var fs = require('fs');
var db = require('../controller/adaptor/mongodb.js');
var moment = require('moment');
var async = require('async');
const { Parser } = require('json2csv');
// const sharp = require('sharp');
const webp = require('webp-converter');
const sharp = require('sharp');
const path = require('path');
/*function jsontocsv(column_header, data, path, callback) {
    json2csv({ data: data, fields: column_header }, function (err, csv) {
        if (err);
        fs.writeFile(path, csv, function (err) {
            if (err) {
                callback(err);
            }
            callback('file saved');
        });
    });
}*/

// function commonUpload(destinationPath) {
//     // console.log(destinationPath,"Hi this is upload");
//     // console.log(JSON.stringify(req.body,null,2));
//     var storage = multer.diskStorage({
//         destination: function (req, file, callback) {
//             callback(null, destinationPath);
//         },
//         filename: function (req, file, callback) {
//             var uploadName = file.originalname.split('.');
//             var extension = '.' + uploadName[uploadName.length - 1];
//             var fileName = Date.now().toString();
//             fs.readFile(destinationPath + file.originalname, function (err, res) {
//                 if (!err) {
//                     callback(null, fileName + extension);
//                 } else {
//                     callback(null, fileName + extension);
//                 }
//             });
//         }
//     });
//     var uploaded = multer({ storage: storage, limits: { fieldSize: 25 * 1024 * 1024 } }); /**----{limits : {fieldNameSize : 100}}---*/
//     // console.log(uploaded,'what about this');
//     return uploaded;
// }

const processImages = async (req, res, next) => {
    if (req.files ) {
        try {
            const promises = req.files.map(async (file) => {
                const originalImagePath = path.join(file.destination, file.filename);
                console.log(originalImagePath);
                
                const webpImagePath = path.join(file.destination, `${file.filename.split('.')[0]}.webp`);

                // Convert to WebP using sharp
                await sharp(originalImagePath).toFile(webpImagePath);

                return {
                    original: originalImagePath,
                    webp: webpImagePath,
                };
            });

            req.processedImages = await Promise.all(promises);
            next();
        } catch (error) {
            console.error('Error processing images:', error);
            return res.status(500).json({ status: 0, message: 'Image processing error' });
        }
    } else {
        next();
    }
};


function commonUpload(destinationPath) {
    var storage = multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, destinationPath); // Define where files are saved
        },
        filename: function (req, file, callback) {
            const uploadName = file.originalname.split('.');
            const extension = '.' + uploadName[uploadName.length - 1];
            const fileName = Date.now().toString();

            const originalFileName = fileName + extension;
            const webpFileName = fileName + '.webp';

            // Absolute paths for the original and WebP files
            const originalFilePath = path.resolve(destinationPath, originalFileName);
            const webpFilePath = path.resolve(destinationPath, webpFileName);

            console.log('Received file:', file);
            console.log('Original file path:', originalFilePath);
            console.log('WebP file path:', webpFilePath);

            // Assign the original file name to the callback for multer
            callback(null, originalFileName);

            // Set the filenames directly to req.uploadedFiles, but don't perform the conversion yet
            req.uploadedFiles = {
                original: originalFileName,
                webp: webpFileName,
            };
        }
    });

    var uploaded = multer({
        storage: storage,
        limits: { fileSize: 25 * 1024 * 1024 } // File size limit
    });

    // Adding an additional middleware for the WebP conversion
    uploaded.convertToWebP = async function (req, res, next) {
        try {
            const originalFilePath = path.resolve(destinationPath, req.uploadedFiles.original);
            const webpFilePath = path.resolve(destinationPath, req.uploadedFiles.webp);

            // Ensure the file exists
            if (!fs.existsSync(originalFilePath)) {
                console.log('Original file does not exist at path:', originalFilePath);
                return next(new Error('Original file missing'));
            }

            // Use sharp to convert the image to WebP
            await sharp(originalFilePath)
                .webp()
                .toFile(webpFilePath);

            console.log('Successfully converted image to WebP:', webpFilePath);
            next(); // Proceed to the next middleware or route handler
        } catch (err) {
            console.log('Error during file handling:', err);
            next(err); // Pass the error to the next middleware
        }
    };

    return uploaded;
}


// function commonUpload(destinationPath) {
//     var storage = multer.diskStorage({
//         destination: function (req, file, callback) {
//             // Ensure the destination directory exists
//             fs.mkdirSync(destinationPath, { recursive: true });
//             callback(null, destinationPath);
//         },
//         filename: function (req, file, callback) {
//             const uploadName = file.originalname.split('.');
//             const extension = '.' + uploadName[uploadName.length - 1];
//             const fileName = Date.now().toString();
//             const filePath = path.join(destinationPath, fileName + extension);

//             // Save the file first
//             callback(null, fileName + extension);
               
//             // After saving, convert the file to WebP
//             const webpFilePath = path.join(destinationPath, fileName + '.webp');

//             webp.cwebp(filePath, webpFilePath, "-q 80", function(status, error) {
//                 if (status === '100') {
//                     console.log('Image successfully converted to WebP:', webpFilePath);
//                     // Optionally, delete the original file
//                     fs.unlink(filePath, (unlinkErr) => {
//                         if (unlinkErr) console.error('Error deleting original file:', unlinkErr);
//                     });
//                 } else {
//                     console.error('Error converting to WebP:', error);
//                 }
//             });
//         }
//     });

//     // Set multer limits for file size, field size, etc.
//     var uploaded = multer({
//         storage: storage,
//         limits: { fieldSize: 25 * 1024 * 1024 } // limit to 25 MB per file
//     });

//     return uploaded;
// }




const exportToCSVCategory = (req, res) => {
    try {
        const json2csvParser = new Parser({ fields: req.fields });
        const csv = json2csvParser.parse(req.data);
        
        // Set the headers for CSV download
        res.header('Content-Type', 'text/csv');
        res.attachment('category_list.csv');
        res.send({'status':1, 'data':csv});
    } catch (err) {
        console.error("Error exporting to CSV:", err);
        res.status(500).send("Error exporting to CSV");
    }
};

function exportToCSV(req, res, next) {
    const fields = req.fields || [];  // Define fields dynamically or use a fixed array
    const data = req.data || [];      // Data to export
    try {
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        res.header('Content-Type', 'text/csv');
        res.attachment('productlist.csv');
        return res.send({'status':1, 'data':csv});
    } catch (err) {
        console.error('Error generating CSV:', err);
        next(err); // Pass the error to the error handling middleware
    }
}

const exportToCSVuser = (req, res) => {
    try {
        const json2csvParser = new Parser({ fields: req.fields });
        const csv = json2csvParser.parse(req.data);
        
        // Set the headers for CSV download
        res.header('Content-Type', 'text/csv');
        res.attachment('user_list.csv');
        res.send({'status':1, 'data':csv});
    } catch (err) {
        console.error("Error exporting to CSV:", err);
        res.status(500).send("Error exporting to CSV");
    }
};

async function jsontocsvnew(data, callback) {
    try {
        var response = {};
        response.status = 0;
        const documentsCount = await db.GetCount(data.collection, { status: { $ne: 0 } });
        if (documentsCount <= 0) {
            response.message = "Unable to Export";
            return callback(null, response);
        }

        var filename = data.file_name + new Date().getTime();
        var fileType = 'csv';
        var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;
        var eachrun = 100000;
        var TotalSeg = Math.ceil(documentsCount / eachrun);

        var dir = 'uploads/csv/orders/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        for (var count = 1; count <= TotalSeg; count++) {
            var limit = eachrun;
            var skip = ((eachrun * count)) - eachrun;
            var mongoQuery = Array.from(data.query);
            mongoQuery.push({ '$skip': parseInt(skip) });
            mongoQuery.push({ '$limit': parseInt(limit) });
            const mydata = await db.GetAggregation(data.collection, mongoQuery);
            console.log(mydata,'this is the mydata');
            if (mydata.length > 0) {
                for (var i = 0; i < mydata.length; i++) {
                    mydata[i].createdAt = moment(mydata[i].createdAt).format('DD/MM/YYYY');
                    if (mydata[i].billings && typeof mydata[i].billings.amount != 'undefined' && typeof mydata[i].billings.amount.grand_total != 'undefined') {
                        mydata[i].billings.amount.grand_total = mydata[i].billings.amount.grand_total.toFixed(2);
                    }
                    if (mydata[i].status) {
                        switch (mydata[i].status) {
                            case 1:
                                mydata[i].string_status = 'Order Received';
                                break;
                            case 2:
                                mydata[i].string_status = 'Order Rejected';
                                break;
                            case 15:
                                mydata[i].string_status = 'new orders';
                                break;
                            case 3:
                                mydata[i].string_status = 'Order Packed';
                                break;
                            case 4:
                                mydata[i].string_status = 'Driver Rejected';
                                break;
                            case 5:
                                mydata[i].string_status = 'Driver Accepted';
                                break;
                            case 6:
                                mydata[i].string_status = 'Driver Pickedup';
                                break;
                            case 7:
                                mydata[i].string_status = 'Deliverd';
                                break;
                        }
                    }
                }

                if (fs.existsSync(filenamePath)) {
                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                    const csv = parser.parse(mydata);
                    fs.appendFileSync(filenamePath, csv + '\r\n');
                } else {
                    const parser = new Json2csvParser({ fields: data.csv });
                    const csv = parser.parse(mydata);
                    fs.writeFileSync(filenamePath, csv + '\r\n');
                }
            } else {
                response.message = "Unable to Export";
                return callback(null, response);
            }
        }

        response.status = 1;
        response.message = {};
        response.message.filename = filename;
        response.message.type = fileType;
        return callback(null, response);
    } catch (error) {
        return callback(error, null);
    }
}

function jsontocsvadminearn(data, callback) {
    var response = {};
    response.status = 0;
    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {
        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {
            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;

            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;

            async.whilst(
                function test(cb) { cb(null, count <= TotalSeg) },
                function (asynCallback) {
                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });
                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            // asynCallback(err, response);
                            callback(err, response);
                        } else {
                            //console.log("+++++++++++++",mydata[0].orderDetails);
                            mydata = mydata[0].orderDetails;
                            for (var i = 0; i < mydata.length; i++) {
                                mydata[i].createdAt = moment(mydata[i].createdAt).format('DD/MM/YYYY');
                                mydata[i].site_total = mydata[i].site_total.toFixed(2);
                                mydata[i].grand_total = mydata[i].grand_total.toFixed(2);
                                mydata[i].bir_tax = mydata[i].bir_tax.toFixed(2);
                                mydata[i].delivery_amount = mydata[i].delivery_amount.toFixed(2);
                                mydata[i].driver_commission = mydata[i].driver_commission.toFixed(2);
                                mydata[i].restaurant_commission = mydata[i].restaurant_commission.toFixed(2);
                                mydata[i].item_total = mydata[i].item_total.toFixed(2);
                                mydata[i].final_earnings = mydata[i].final_earnings.toFixed(2);
                                mydata[i].service_tax = mydata[i].billings.amount.service_tax.toFixed(2);
                            }

                            if (fs.existsSync(filenamePath)) {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                                    const csv = parser.parse(mydata);
                                    fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }
                            } else {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv });
                                    const csv = parser.parse(mydata);
                                    fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }

                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}

function jsontocsvdriverpayout(data, callback) {
    var response = {};
    response.status = 0;
    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {
        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {
            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;

            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;

            async.whilst(
                function test(cb) { cb(null, count <= TotalSeg) },
                function (asynCallback) {
                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });
                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        console.log('err, mydata', err, mydata)
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            callback(err, response);
                        } else {
                            mydata = mydata[0].driverDetails;
                            for (var i = 0; i < mydata.length; i++) {
                                mydata[i].phone = mydata[i].phone.number;
                                mydata[i].address = mydata[i].address.fulladres;
                                mydata[i].driver_commission = mydata[i].driver_commission.toFixed(2);
                                if (mydata[i].admin_due == 0) {
                                    mydata[i].admin_due = 'Payment unsettled';
                                } else {
                                    mydata[i].admin_due = 'Payment settled';
                                }
                            }
                            if (fs.existsSync(filenamePath)) {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                                    const csv = parser.parse(mydata);
                                    fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }
                            } else {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv });
                                    const csv = parser.parse(mydata);
                                    fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }
                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}


function jsontocsvdriverpaydetails(data, callback) {
    var response = {};
    response.status = 0;
    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {

        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {
            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;

            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;

            async.whilst(
                function test(cb) { cb(null, count <= TotalSeg) },
                function (asynCallback) {
                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });
                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            // asynCallback(err, response);
                            callback(err, response);
                        } else {
                            //console.log("+++++++++++++",mydata[0].orderDetails);
                            mydata = mydata[0].orderDetails;
                            for (var i = 0; i < mydata.length; i++) {
                                mydata[i].createdAt = moment(mydata[i].createdAt).format('DD/MM/YYYY hh:mm a');
                                mydata[i].bir_tax_amount = 0;
                            }

                            if (fs.existsSync(filenamePath)) {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                                    const csv = parser.parse(mydata);
                                    fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }

                            } else {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv });
                                    const csv = parser.parse(mydata);
                                    fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }

                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}

function jsontocsvrespayout(data, callback) {
    var response = {};
    response.status = 0;
    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {
        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {
            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;
            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;
            var limit = eachrun;
            var skip = ((eachrun * count)) - eachrun;
            var mongoQuery = Array.from(data.query);
            mongoQuery.push({ '$skip': parseInt(skip) });
            mongoQuery.push({ '$limit': parseInt(limit) });
            var limit = eachrun;
            var skip = ((eachrun * count)) - eachrun;

            async.whilst(
                function test(cb) { cb(null, count <= TotalSeg) },
                function (asynCallback) {
                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });
                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            // asynCallback(err, response);
                            callback(err, response);
                        } else {
                            //console.log("+++++++++++++",mydata[0].orderDetails);
                            mydata = mydata[0].restaurantDetails;
                            for (var i = 0; i < mydata.length; i++) {
                                mydata[i].phone = mydata[i].phone.number;
                                mydata[i].address = mydata[i].address.fulladres;
                                /* if(mydata[i].payoutDetails){

                                    if(mydata[i].payoutDetails.paid_status == 0)   {
                                        mydata[i].paid_status = 'Payment unsettled';
                                    }else{
                                        mydata[i].paid_status = 'Payment settled';
                                    }

                                }else{
                                    mydata[i].paid_status = 'Payment unsettled';
                                } */
                                if (mydata[i].unpaid_commission) {
                                    if (mydata[i].unpaid_commission == 0) {
                                        mydata[i].paid_status = 'Payment settled';
                                    } else {
                                        mydata[i].paid_status = 'Payment unsettled';
                                    }
                                } else {
                                    mydata[i].paid_status = 'Payment unsettled';
                                }

                            }

                            if (fs.existsSync(filenamePath)) {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                                    const csv = parser.parse(mydata);
                                    fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }
                            } else {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv });
                                    const csv = parser.parse(mydata);
                                    fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }
                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}

function jsontocsvrestpaydetails(data, callback) {
    var response = {};
    response.status = 0;
    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {
        console.log(documentsCount);
        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {
            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;

            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;

            async.whilst(
                function test(cb) { cb(null, count <= TotalSeg) },
                function (asynCallback) {
                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });
                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            // asynCallback(err, response);
                            callback(err, response);
                        } else {
                            //console.log("+++++++++++++",mydata[0].orderDetails);
                            mydata = mydata[0].orderDetails;
                            for (var i = 0; i < mydata.length; i++) {
                                mydata[i].createdAt = moment(mydata[i].createdAt).format('DD/MM/YYYY hh:mm a');
                                mydata[i].service_tax = mydata[i].billings.amount.service_tax ? mydata[i].billings.amount.service_tax.toFixed(2) : 0.0;
                                mydata[i].food_offer_price = mydata[i].billings.amount.food_offer_price ? mydata[i].billings.amount.food_offer_price.toFixed(2) : 0.0;
                                mydata[i].site_total = mydata[i].site_total ? mydata[i].site_total.toFixed(2) : 0.0;
                                mydata[i].item_total = mydata[i].item_total ? mydata[i].item_total.toFixed(2) : 0.0;
                                mydata[i].package_charge = mydata[i].billings.amount.package_charge ? mydata[i].billings.amount.package_charge : 0.0;
                            }
                            if (fs.existsSync(filenamePath)) {
                                try {
                                    console.log("if filenamePath=====> ");
                                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                                    const csv = parser.parse(mydata);
                                    fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }

                            } else {
                                console.log("if filenamePath=====> else ");
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv });
                                    const csv = parser.parse(mydata);
                                    fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }

                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}



function jsontocsvdrivertranscation(data, callback) {
    var response = {};
    response.status = 0;
    db.GetCount(data.collection, { status: { $ne: 0 } }, function (err, documentsCount) {

        if (err || documentsCount <= 0) {
            response.message = "Unable to Export";
            callback(err, response);
        } else {
            var filename = data.collection + new Date().getTime();
            var fileType = 'csv';
            var filenamePath = 'uploads/csv/orders/' + filename + '.' + fileType;

            var eachrun = 100000
            var TotalSeg = Math.ceil(documentsCount / eachrun);
            var count = 1;

            async.whilst(
                function test(cb) { cb(null, count <= TotalSeg) },
                function (asynCallback) {
                    var limit = eachrun;
                    var skip = ((eachrun * count)) - eachrun;

                    var mongoQuery = Array.from(data.query);
                    mongoQuery.push({ '$skip': parseInt(skip) });
                    mongoQuery.push({ '$limit': parseInt(limit) });
                    db.GetAggregation(data.collection, mongoQuery, function (err, mydata) {
                        if (err || mydata.length <= 0) {
                            response.message = "Unable to Export";
                            // asynCallback(err, response);
                            callback(err, response);
                        } else {
                            //console.log("+++++++++++++",mydata[0].transactionDetails);
                            mydata = mydata[0].transactionDetails;

                            if (fs.existsSync(filenamePath)) {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv, header: false });
                                    const csv = parser.parse(mydata);
                                    fs.appendFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }
                            } else {
                                try {
                                    const parser = new Json2csvParser({ fields: data.csv });
                                    const csv = parser.parse(mydata);
                                    fs.writeFile(filenamePath, csv + '\r\n', function (err) {
                                        count++;
                                        asynCallback(err);
                                    });
                                } catch (e) {
                                    asynCallback(e);
                                }

                            }
                        }
                    });
                },
                function (err, n) {
                    response.status = 1;
                    response.message = {};
                    response.message.filename = filename;
                    response.message.type = fileType;
                    callback(err, response);
                });
        }
    });
}


module.exports = {
    // jsontocsv: jsontocsv,
    commonUpload: commonUpload,
    processImages: processImages,
    exportToCSVCategory: exportToCSVCategory,
    exportToCSVuser: exportToCSVuser,
    exportToCSV: exportToCSV,
    jsontocsvnew: jsontocsvnew,
    jsontocsvadminearn: jsontocsvadminearn,
    jsontocsvdriverpayout: jsontocsvdriverpayout,
    jsontocsvdriverpaydetails: jsontocsvdriverpaydetails,
    jsontocsvrespayout: jsontocsvrespayout,
    jsontocsvrestpaydetails: jsontocsvrestpaydetails,
    jsontocsvdrivertranscation: jsontocsvdrivertranscation
};
