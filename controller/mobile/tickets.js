
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





controller.getTicketTypes= async function(req,res){
    try{
        let data={};
        data.error=false;
        data.message="Ticket types fetched successfully.";
        data.data[{
            id:"",
            title:'',
            date_created:''
        }]
        res.send(data);
    }catch(error){

    }
}

controller.addTicket= async function(req,res){
    try{
        const ticket_type_id=req.body.ticket_type_id;
        const subject= req.body.subject;
        const email= req.body.email;
        const description= req.body.description;
        const user_id= req.body.user_id;
        let data={}
        data.error=false;
        data.message="Ticket Added Successfully"
        data.data=[{
            id:'',
            ticket_type_id:'',
            user_id:'',
            subject:'',
            email:'',
            description:'',
            status:'',
            last_updated_at:'',
            date_created:'',
            name:'',
            ticket_type:'',
        }]
        res.send(data)
    }catch(error){

    }
}

controller.editTicket= async function(req,res){
    try{
        const ticket_id=req.body.ticket_id;
        const ticket_type_id=req.body.ticket_type_id;
        const subject=req.body.subject;
        const email=req.body.email;
        const description=req.body.description;
        const user_id=req.body.user_id;
        const status=req.body.status;
        let data={}
        data.error=false;
        data.message="Ticket Edited Successfully"
        data.data=[{
            id:'',
            ticket_type_id:'',
            user_id:'',
            subject:'',
            email:'',
            description:'',
            status:'',
            last_updated_at:'',
            date_created:'',
            name:'',
            ticket_type:'',
        }]
        res.send(data)
    }catch(error){

    }
}

controller.sendMessage= async function(req,res){
    try{
        const user_type=req.body.user_type;
        const user_id= req.body.user_id;
        const ticket_id= req.body.ticket_id;
        let data={}
        data.error=false;
        data.message="Ticket Message Added Successfully!";
        data.data={
            id:'',
            user_type:'',
            user_id:'',
            ticket_id:'',
            message:'',
            name:'',
            subject:'',
            last_updated_at:'',
            date_created_at:'',
        }
        res.send(data);
    }catch(error){

    }
}

controller.getTickets= async function(req,rs){
    try{
   let data={};
   data.error=false;
   data.message='Ticket retrived successfully';
   data.total='';
   data.data=[{
    id:'',
    tiket_id_type:'',
    user_id:'',
    subject:'',
    email:'',
    description:'',
    status:'',
    last_updated:'',
    date_created:'',
    name:'',
    ticket_type:'',
   }]
    }catch(error){

    }
}

controller.getMessages= async function(req,res){
    try{
        const ticket_id = req.body.ticket_id;
        let data={};
        data.error=false;
        data.message="Message retrieved successfully"
        data.total='';
        data.data=[{
            id:'',
            user_type:'',
            user_id:'',
            subject:'',
            email:'',
            description:'',
            status:'',
            last_updated_at:'',
            date_created:'',
            name:'',
            ticket_type:'',

        }]
        res.send(data)
    }catch(error){
        
    }
}
    return controller;
}





