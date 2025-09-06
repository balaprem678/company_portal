var request = require('request');
var db = require('../controller/adaptor/mongodb.js');


function createMessage(to, from, message, callback) {
    db.GetOneDocument('settings', { alias: 'sms' }, {}, {}, function (err, document) {
        if (err) {
            callback(err, document);
        } else {
            /* var twilio = document.settings.twilio;
            var client = require('twilio')(twilio.account_sid, twilio.authentication_token);
            if (!from) { from = twilio.default_phone_number }
            client.messages.create({
                to: to,
                from: from,
                body: message
            }, function (err, message) {
                callback(err, message);
            }); */
            var axios = require('axios');
            var qs = require('qs');
            var data = qs.stringify({
                'numbers': to,
                'apikey': document.settings.twilio.apikey,
                'sender': document.settings.twilio.sender,
                'message': message
            });
            var config = {
                method: 'post',
                url: 'https://api.textlocal.in/send/',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: data
            };

            axios(config)
                .then(function (response) {
                     console.log('ssss', JSON.stringify(response.data));
                    callback(null, response.data);
                })
                .catch(function (error) {
                     console.log('errr', error);
                    callback(error, null);
                });
        }
    });
}


module.exports = {
    "createMessage": createMessage
};