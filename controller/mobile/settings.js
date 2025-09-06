
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




    controller.getSettings = async function (req, res) {
        try {
            console.log("hi where are they");
            const docdata = await db.GetOneDocument('settings', { alias: 'general' }, {

            }, {});
            const siteUrl = docdata.doc.settings.site_url
            console.log(docdata, 'docadataaaaaaaaasa');
            if (docdata.status === false) {
                res.send({ err: 1, message: 'Unable to fetch data', settings: {} })
            } else {
                console.log("hiiii");
                var settings = docdata.doc.settings;
                var server_offset = (new Date).getTimezoneOffset();
                settings.offset = server_offset;
                var jstz = require('jstimezonedetect');
                var server_time_zone = jstz.determine().name();
                settings.server_time_zone = server_time_zone;
                settings.with_otp = settings.with_otp ? settings.with_otp : 1;
                settings.with_password = settings.with_password ? settings.with_password : 0;
                var data = {};
                data.error = false
                data.message = "Settings retrieved successfully";
                if (settings.splash_screen) {
                    if (settings.splash_screen.length > 0) {
                        settings.splash_screen = settings.splash_screen.map(el => siteUrl.concat(el))
                    }
                }
                if (settings.logo.length > 0) {
                    settings.logo = siteUrl + settings.logo
                }
                // if(settings.footer_logo.length>0){
                //     settings.footer_logo= siteUrl+ settings.footer_logo;
                // }
                if (settings.favicon.length > 0) {
                    settings.favicon = siteUrl + settings.favicon;
                }
                if (settings.appicon.length > 0) {
                    settings.appicon = siteUrl + settings.appicon;
                }
                settings.privacy_policy = [''];
                settings.terms_conditions = [''];
                settings.contact_us = [''];
                settings.about_us = [''];
                settings.shipping_policy = [''];
                settings.return_policy = [''];
                settings.popup_offer = [{
                    "id": "",
                    "is_active": "",
                    "show_multiple_time": "",
                    "image": "",
                    "type": "",
                    "type_id": "",
                    "min_discount": "",
                    "max_discount": "",
                    "link": "",
                    "date_added": "",
                    "data": []
                }]
                data.data = settings;
                res.send(data);
            }
            // Use docdata for further processing
        } catch (error) {
            console.error('Error:', error);
            // Handle the error
        }
    }

    controller.getPages = async function (req, res) {
        try {
            const pages = await db.GetDocument('pages', {}, {}, {})
            if (pages.doc.length < 1) {
                res.status(404).send({ error: false, message: 'There is no data' })
            }
            else {
                res.status(200).send({ error: false, data: pages.doc })
            }
        } catch (error) {
            res.status(500).send({ error: true, message: 'Server Error' })
        }
    }

    controller.walkthroughImages = async function (req, res) {
        try {
            const walkthrough = await db.GetDocument('walkthroughimages', { status: 1 }, {}, {})
            const settings= await db.GetOneDocument('settings',{alias:'general'},{},{})
                res.send({ error: false, walkthrough: walkthrough.doc,splash_screen:settings.doc.settings.splash_screen })
        } catch (error) {
            console.log(error, "Error");
            res.send({ error: true, message: "There is something went wrong." })
        }
    }
    return controller;
}





