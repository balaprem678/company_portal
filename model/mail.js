"use strict"

var nodemailer = require('nodemailer');
var db = require('../controller/adaptor/mongodb.js');

async function send(data) {
       
    const settings = await db.GetOneDocument('settings', { 'alias': 'smtp' }, {}, {})
    if (settings.status === false) {
        data.response = 'Error in settings'; res.send(data);
    } else {
        var smtp_host = settings.doc.settings.smtp_host;
        var smtp_port = settings.doc.settings.smtp_port;
        var smtp_username = settings.doc.settings.smtp_username;
        var smtp_password = settings.doc.settings.smtp_password;
        var transporter = nodemailer.createTransport({
            host: smtp_host,
            port: smtp_port,
            secure: false,
            auth: {
                user: smtp_username,
                pass: smtp_password
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        // transporter.sendMail(data, function (error, info) {
        //     if(error){
        //         return error;
        //     }else{
        //         return data;
        //     }
        // }); 
        console.log(data, 'data1111');

        transporter.sendMail(data, function (error, info) {
            if (error) {
                console.error('Error sending email:', error);
                data.response = 'Error sending email';
            } else {
                console.log('Email sent successfully:', info);
                data.response = 'Email sent successfully';
                return data;
            }
        });
        console.log('settings', transporter)


    }
    // db.GetOneDocument('settings', { 'alias': 'smtp' }, {}, {}, function (err, settings) {
    //     // console.log("errrr",err);
    //     // console.log("settings",settings)
    //     if (err || !settings) {
    //         data.response = 'Error in settings'; res.send(data);
    //     } else {
    //         var smtp_host = settings.settings.smtp_host;
    //         var smtp_port = settings.settings.smtp_port;
    //         var smtp_username = settings.settings.smtp_username;
    //         var smtp_password = settings.settings.smtp_password;
    //         var transporter = nodemailer.createTransport({
    //             host: smtp_host,
    //             port: smtp_port,
    //             secure: false,
    //             auth: {
    //                 user: smtp_username,
    //                 pass: smtp_password
    //             },
    //             tls: {
    //                 rejectUnauthorized: false
    //             }
    //         });
    // 		// console.log('settings',settings)
    // transporter.sendMail(data, function (error, info) {
    // 	// console.log('error, info +++++++++++++++++',error, info)
    //     callback(error, info);
    // }); 
    //     }
    // });
}

module.exports = {
    "send": send
};
