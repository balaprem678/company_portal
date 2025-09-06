var assert = require("chai").assert;
var app = require("../app");
var nodemailer = require("nodemailer");
var db = require("../controller/adaptor/mongodb.js");

describe("sms", function () {
  it("send", function (done) {
    this.timeout(5000);

    db.GetOneDocument(
      "settings",
      { alias: "sms" },
      {},
      {},
      function (err, document) {
        if (err) {
          callback(err, document);
        } else {
          var twilio = document.settings.twilio;
          var client = require("twilio")(twilio.accountSid, twilio.authToken);
          //if (!from) { from = '+18552513612' }
          client.messages.create({}, function (err, message) {
            callback(err, message);
          });
        }
      }
    );
  });
});
