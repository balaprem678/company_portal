var CONFIG = require('../config/config');
var async = require("async");
var mail = require('../model/mail.js');
var db = require('../controller/adaptor/mongodb.js');


async function sendmail(data) {


	console.log(data,'data for sending mail inside send function ')

	try {
		const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})
		const template = await db.GetDocument('emailtemplate', { name: data.template, 'status': { $ne: 0 } }, {}, {})
		const socialsettings = await db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {})


		console.log("settings chck:", settings.doc.settings.site_address)

		Promise.all([settings, template, socialsettings]).then(async ([settings, template, socialsettings]) => {

			var html = '';
			
			if (typeof template.doc != 'undefined' && template.doc.length > 0) {
				if (typeof template.doc[0].email_header != 'undefined' && template.doc[0].email_header != '') {
					html = html + template.doc[0].email_header;
				}

				html = html + template.doc[0].email_content;
				if (typeof template.doc[0].email_footer != 'undefined' && template.doc[0].email_footer != 'undefined') {
					html = html + template.doc[0].email_header;
				}

				
				html = html.replace(/{{privacy}}/g, settings.doc.settings.site_url + 'page/privacy-policy');
				html = html.replace(/{{terms}}/g, settings.doc.settings.site_url + 'page/terms-conditions');
				html = html.replace(/{{aboutus}}/g, settings.doc.settings.site_url + 'page/about-us');
				html = html.replace(/{{senderemail}}/g, template.doc[0].sender_email);
				html = html.replace(/{{sendername}}/g, template.doc[0].sender_name);
				html = html.replace(/{{logo}}/g, settings.doc.settings.site_url + settings.doc.settings.logo);
				html = html.replace(/{{site_url}}/g, settings.doc.settings.site_url);
				html = html.replace(/{{site_address}}/g, settings.doc.settings.site_address);
				html = html.replace(/{{ios}}/g, settings.doc.settings.site_url + 'uploads/default/ios.png');
				html = html.replace(/{{ios2}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.mobileapp[1].landingimg);
				html = html.replace(/{{ios1}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.mobileapp[1].img);
				html = html.replace(/{{fb}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.link[0].img);
				html = html.replace(/{{fb_link}}/g, socialsettings.doc.settings.link[0].url);
				html = html.replace(/{{twitter}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.link[1].img);
				html = html.replace(/{{twitter_link}}/g, socialsettings.doc.settings.link[1].url);
				html = html.replace(/{{social3}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.link[2].img);
				html = html.replace(/{{social3_link}}/g, socialsettings.doc.settings.link[2].url);
				html = html.replace(/{{social4}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.link[3].img);
				html = html.replace(/{{social4_link}}/g, socialsettings.doc.settings.link[3].url);
				html = html.replace(/{{social5}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.link[4].img);
				html = html.replace(/{{social5_link}}/g, socialsettings.doc.settings.link[4].url);
				html = html.replace(/{{instagram}}/g, settings.doc.settings.site_url + socialsettings.doc.settings.link[5].img);
				html = html.replace(/{{instagram_link}}/g, socialsettings.doc.settings.link[5].url);

                if(data.html && data.temp &&  data.temp =='notemp'){
					html = data.html
					//  html.replace(/{{content_content}}/g, data.html);
					console.log(html,"htmllllllllllll");
					
				}


				if (data && data.html && data.html.length > 0 && data.html[1] != undefined) {

					html = html.replace(/{{order_id}}/g, data.html[1].value ? data.html[1].value : '');

				}
				// console.log( "data.html[2] ------------------------------------")
				//  console.log(data.html[2])
				// console.log( "data.html[2] ------------------------------------")
				if (data && data.html && data.html.length > 0 && data.html[2] != undefined) {
					html = html.replace(/{{date}}/g, data.html[2].value ? data.html[2].value : '');

				}


				html = html.replace(/{{site_title}}/g, settings.doc.settings.site_title);
				html = html.replace(/{{email_title}}/g, settings.doc.settings.site_title);
				html = html.replace(/{{email_address}}/g, settings.doc.settings.email_address);
				for (i = 0; i < data.html.length; i++) {
					var regExp = new RegExp('{{' + data.html[i].name + '}}', 'g');
					html = html.replace(regExp, data.html[i].value);
				}

				if (data.to) {
					var tomail = data.to;
				} else {
					var tomail = template[0].sender_email;
				}
				var email_subject = template.doc[0].email_subject;
				email_subject = email_subject.replace(/{{privacy}}/g, settings.doc.settings.site_url + 'page/privacy-policy');
				email_subject = email_subject.replace(/{{terms}}/g, settings.doc.settings.site_url + 'page/terms-conditions');
				email_subject = email_subject.replace(/{{contactus}}/g, settings.doc.settings.site_url + 'contact_us');
				email_subject = email_subject.replace(/{{senderemail}}/g, template.doc[0].sender_email);
				email_subject = email_subject.replace(/{{sendername}}/g, template.doc[0].sender_name);
				email_subject = email_subject.replace(/{{logo}}/g, settings.doc.settings.site_url + settings.doc.settings.logo);
				email_subject = email_subject.replace(/{{site_title}}/g, settings.doc.settings.site_title);
				email_subject = email_subject.replace(/{{email_title}}/g, settings.doc.settings.site_title);
				email_subject = email_subject.replace(/{{email_address}}/g, settings.doc.settings.email_address);

				for (i = 0; i < data.html.length; i++) {
					var regExp = new RegExp('{{' + data.html[i].name + '}}', 'g');
					email_subject = email_subject.replace(regExp, data.html[i].value);
				}

				var mailOptions = {
					from: data.from ? data.from : (template.doc[0]?.sender_email || ''),
					to: tomail,
					subject: email_subject,
					text: html,
					html: html
				};

				const emailSent = await mail.send(mailOptions)

               console.log(emailSent,"emailSentemailSentemailSentemailSent");


				return emailSent;
			} else {

			}
		})
	} catch (error) {
		console.log("error at sending mait in mailcontent.js", error)
		return error;
	}

}



async function sendSubmail(data) {


	console.log(data,'data for sending mail inside send function ')

	try {
		// const settings = await db.GetOneDocument('settings', { 'alias': 'general' }, {}, {})


		// console.log("settings chck:", settings.doc.settings.site_address)


			// var html = '';
			 
			    

				var mailOptions = {
					from: data.from ? data.from : '',
					to: data.to,
					subject: data.subject,
					text: data.html,
					html: data.html
				};

				const emailSent = await mail.send(mailOptions)

               console.log(emailSent,"emailSentemailSentemailSentemailSent");


				return emailSent;
			
	} catch (error) {
		console.log("error at sending mait in mailcontent.js", error)
		return error;
	}

}



// function sendmail(data, callback) {
// 	async.waterfall([
// 		function (callback) {
// 			db.GetOneDocument('settings', { 'alias': 'general' }, {}, {}, function (err, settings) {
// 				if (err || !settings) { data.response = 'Configure your website settings'; res.send(data); }
// 				else { callback(err, settings.settings); }
// 			});
// 		},
// 		function (settings, callback) {
// 			db.GetDocument('emailtemplate', { name: data.template, 'status': { $ne: 0 } }, {}, {}, function (err, template) {
// 				if (err || !template) { data.response = 'Unable to get email template'; res.send(data); }
// 				else { callback(err, settings, template); }
// 			});
// 		},
// 		function (settings, template, callback) {
// 			db.GetOneDocument('settings', { 'alias': 'social_networks' }, {}, {}, function (err, socialsettings) {
// 				if (err || !template) { data.response = 'Unable to get email template'; res.send(data); }
// 				else { callback(err, settings, template, socialsettings.settings); }
// 			});
// 		}
// 	],
// 		function (err, settings, template, socialsettings) {
// 			var html = '';
// 			console.log("settings.logo", settings.logo)
// 			console.log("settings.site_url", settings.site_url)
// 			if (typeof template != 'undefined' && template.length > 0) {
// 				if (typeof template[0].email_header != 'undefined' && template[0].email_header != '') {
// 					html = html + template[0].email_header;
// 				}
// 				html = html + template[0].email_content;
// 				if (typeof template[0].email_footer != 'undefined' && template[0].email_footer != 'undefined') {
// 					html = html + template[0].email_header;
// 				}

// 				html = html.replace(/{{privacy}}/g, settings.site_url + 'page/privacy-policy');
// 				html = html.replace(/{{terms}}/g, settings.site_url + 'page/terms-conditions');
// 				html = html.replace(/{{aboutus}}/g, settings.site_url + 'page/about-us');
// 				html = html.replace(/{{senderemail}}/g, template[0].sender_email);
// 				html = html.replace(/{{sendername}}/g, template[0].sender_name);
// 				html = html.replace(/{{logo}}/g, settings.site_url + settings.logo);
// 				html = html.replace(/{{site_url}}/g, settings.site_url);
// 				html = html.replace(/{{site_address}}/g, settings.site_address);

// 				// html = html.replace(/{{android}}/g, settings.site_url + 'uploads/default/android.png');
// 				// html = html.replace(/{{android2}}/g, settings.site_url + socialsettings.mobileapp[0].landingimg);
// 				// html = html.replace(/{{android1}}/g, settings.site_url + socialsettings.mobileapp[0].img);
// 				/*if(socialsettings.mobileapp && socialsettings.mobileapp[0] && socialsettings.mobileapp[0].url){
// 					for(var i=0;i<socialsettings.mobileapp[0].url.length;i++){
// 						if(socialsettings.mobileapp[0].url[i].name == "User App"){
// 							html = html.replace(/{{android_link}}/g, socialsettings.mobileapp[0].url[i].url);
// 						}
// 						if(socialsettings.mobileapp[0].url[i].name == "Driver App"){
// 							html = html.replace(/{{android_driver_link}}/g, socialsettings.mobileapp[0].url[i].url);
// 						}
// 						if(socialsettings.mobileapp[0].url[i].name == "Restaurant App"){
// 							html = html.replace(/{{android_restaurant_link}}/g, socialsettings.mobileapp[0].url[i].url);
// 						}
// 					}
// 				} */
// 				/* if(socialsettings.mobileapp && socialsettings.mobileapp[1] && socialsettings.mobileapp[1].url){
// 					for(var i=0;i<socialsettings.mobileapp[1].url.length;i++){
// 						if(socialsettings.mobileapp[1].url[i].name == "User App"){
// 							html = html.replace(/{{ios_link}}/g, socialsettings.mobileapp[1].url[i].url);
// 						}
// 						if(socialsettings.mobileapp[1].url[i].name == "Driver App"){
// 							html = html.replace(/{{ios_driver_link}}/g, socialsettings.mobileapp[1].url[i].url);
// 						}
// 						if(socialsettings.mobileapp[1].url[i].name == "Restaurant App"){
// 							html = html.replace(/{{ios_restaurant_link}}/g, socialsettings.mobileapp[1].url[i].url);
// 						}
// 					}
// 				} */

// 				html = html.replace(/{{ios}}/g, settings.site_url + 'uploads/default/ios.png');
// 				html = html.replace(/{{ios2}}/g, settings.site_url + socialsettings.mobileapp[1].landingimg);
// 				html = html.replace(/{{ios1}}/g, settings.site_url + socialsettings.mobileapp[1].img);
// 				// html = html.replace(/{{ios_link}}/g, socialsettings.mobileapp[1].url);

// 				/* html = html.replace(/{{fb}}/g, settings.site_url + socialsettings.link[0].img);
// 				html = html.replace(/{{fb_link}}/g, socialsettings.link[0].url);
// 				html = html.replace(/{{linkedin}}/g, settings.site_url + socialsettings.link[1].img);
// 				html = html.replace(/{{linked_link}}/g, socialsettings.link[1].url);
// 				html = html.replace(/{{twitter}}/g, settings.site_url + socialsettings.link[2].img);
// 				html = html.replace(/{{twitter_link}}/g, socialsettings.link[2].url); */

// 				html = html.replace(/{{fb}}/g, settings.site_url + socialsettings.link[0].img);
// 				html = html.replace(/{{fb_link}}/g, socialsettings.link[0].url);
// 				html = html.replace(/{{twitter}}/g, settings.site_url + socialsettings.link[1].img);
// 				html = html.replace(/{{twitter_link}}/g, socialsettings.link[1].url);
// 				html = html.replace(/{{social3}}/g, settings.site_url + socialsettings.link[2].img);
// 				html = html.replace(/{{social3_link}}/g, socialsettings.link[2].url);
// 				html = html.replace(/{{social4}}/g, settings.site_url + socialsettings.link[3].img);
// 				html = html.replace(/{{social4_link}}/g, socialsettings.link[3].url);
// 				html = html.replace(/{{social5}}/g, settings.site_url + socialsettings.link[4].img);
// 				html = html.replace(/{{social5_link}}/g, socialsettings.link[4].url);
// 				html = html.replace(/{{instagram}}/g, settings.site_url + socialsettings.link[5].img);
// 				html = html.replace(/{{instagram_link}}/g, socialsettings.link[5].url);


// 				html = html.replace(/{{site_title}}/g, settings.site_title);
// 				html = html.replace(/{{email_title}}/g, settings.site_title);
// 				html = html.replace(/{{email_address}}/g, settings.email_address);
// 				for (i = 0; i < data.html.length; i++) {
// 					var regExp = new RegExp('{{' + data.html[i].name + '}}', 'g');
// 					html = html.replace(regExp, data.html[i].value);
// 				}

// 				if (data.to) {
// 					var tomail = data.to;
// 				} else {
// 					var tomail = template[0].sender_email;
// 				}
// 				var email_subject = template[0].email_subject;
// 				email_subject = email_subject.replace(/{{privacy}}/g, settings.site_url + 'page/privacy-policy');
// 				email_subject = email_subject.replace(/{{terms}}/g, settings.site_url + 'page/terms-conditions');
// 				email_subject = email_subject.replace(/{{contactus}}/g, settings.site_url + 'contact_us');
// 				email_subject = email_subject.replace(/{{senderemail}}/g, template[0].sender_email);
// 				email_subject = email_subject.replace(/{{sendername}}/g, template[0].sender_name);
// 				email_subject = email_subject.replace(/{{logo}}/g, settings.site_url + settings.logo);
// 				// email_subject = email_subject.replace(/{{android}}/g, settings.site_url + socialsettings.mobileapp[0].img);
// 				// email_subject = email_subject.replace(/{{android_link}}/g, socialsettings.mobileapp[0].url);
// 				// email_subject = email_subject.replace(/{{ios}}/g, settings.site_url + socialsettings.mobileapp[1].img);
// 				// email_subject = email_subject.replace(/{{ios_link}}/g, socialsettings.mobileapp[1].url);

// 				// email_subject = email_subject.replace(/{{fb}}/g, settings.site_url + socialsettings.link[0].img);
// 				// email_subject = email_subject.replace(/{{fb_link}}/g, socialsettings.link[0].url);
// 				// email_subject = email_subject.replace(/{{linkedin}}/g, settings.site_url + socialsettings.link[1].img);
// 				// email_subject = email_subject.replace(/{{linked_link}}/g, socialsettings.link[1].url);
// 				// email_subject = email_subject.replace(/{{twitter}}/g, settings.site_url + socialsettings.link[2].img);
// 				// email_subject = email_subject.replace(/{{twitter_link}}/g, socialsettings.link[2].url);
// 				email_subject = email_subject.replace(/{{site_title}}/g, settings.site_title);
// 				email_subject = email_subject.replace(/{{email_title}}/g, settings.site_title);
// 				email_subject = email_subject.replace(/{{email_address}}/g, settings.email_address);
// 				for (i = 0; i < data.html.length; i++) {
// 					var regExp = new RegExp('{{' + data.html[i].name + '}}', 'g');
// 					email_subject = email_subject.replace(regExp, data.html[i].value);
// 				}
// 				var mailOptions = {
// 					from: template[0].sender_email,
// 					to: tomail,
// 					subject: email_subject,
// 					text: html,
// 					html: html
// 				};

// 				//console.log(mailOptions)
// 				mail.send(mailOptions, function (err, response) { callback(err, response); });
// 			} else {
// 				callback(null, null);
// 			}
// 		});
// }

module.exports = {
	"sendmail": sendmail,
	'sendSubmail':sendSubmail
};
