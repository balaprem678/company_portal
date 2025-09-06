var api = require('paypal-rest-sdk');
var db = require('../../adaptor/mongodb.js');

db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
	if (!err && paymentgateway && paymentgateway.settings && paymentgateway.settings.client_id) {
		if (paymentgateway && typeof paymentgateway._id != 'undefined') {
			api.configure({
				'mode': paymentgateway.settings.mode,
				'client_id': paymentgateway.settings.client_id,
				'client_secret': paymentgateway.settings.client_secret
			});
		} else {
			api.configure({
				'mode': 'sandbox',
				'client_id': 'AVJ655Mw_pGDGHmZ2LjYWXY6XaRVZOI9SutflwRBYLSqeudNRBSIHzmG5Qvt6gxcZ3JH4pcISh521eU6',
				'client_secret': 'EODh1WtNkO3LOcMwLwWpTxNaWDyQ4zyNZnjTaeh6moYVBInl4ioVb--fedPdceJvHHjhQYNog-B95aS1'
			});
		}
	}
});
function create(req, res, order, callback) {
	var create_payment_json = {
		"intent": "authorize",
		"payer": {
			"payment_method": "paypal"
		},
		"redirect_urls": {},
		"transactions": [{
			"item_list": {
				"items": []
			},
			"amount": {
				"currency": order.currency_code,
				"details": {}
			},
			"description": "order"
		}]
	};

	create_payment_json.transactions[0].description = order.site_title + ' ' + 'Payment :' + order.order_id;
	create_payment_json.transactions[0].amount.details.subtotal = 0.00;
	create_payment_json.transactions[0].amount.details.tax = 0.00;
	create_payment_json.transactions[0].amount.details.handling_fee = 0.00;
	create_payment_json.transactions[0].amount.details.shipping = 0.00;
	create_payment_json.transactions[0].amount.total = parseFloat(order.pay_total).toFixed(2);
	console.log(create_payment_json.transactions[0].amount)
	if (typeof order.return_url != 'undefined') {
		var return_url = order.return_url;	 // mobile
	} else {								   	// web
		var return_url = "/site/users/payment/paypal/execute";
	}

	if (typeof order.cancel_url != 'undefined') {
		var cancel_url = order.cancel_url; 	// mobile
	} else { 									// web
		var cancel_url = "/site/users/payment/paypal/cancel";
	}
	create_payment_json.redirect_urls.return_url = "http://" + req.headers.host + return_url + "?payment_id=" + order.payment_id;
	create_payment_json.redirect_urls.cancel_url = "http://" + req.headers.host + cancel_url + "?payment_id=" + order.payment_id;
	api.payment.create(create_payment_json, function (error, payment) {
		if (error) {
			callback(error)
		} else {
			var data = {};
			for (var i = 0; i < payment.links.length; i++) {
				var link = payment.links[i];
				if (link.method === 'REDIRECT') {
					data.redirectUrl = link.href;
				}
			}
			data.payment_mode = 'paypal';
			callback(data);
		}
	});
}
function createRecharge(req, res, order, callback) {
	var create_payment_json = {
		"intent": "authorize",
		"payer": {
			"payment_method": "paypal"
		},
		"redirect_urls": {},
		"transactions": [{
			"item_list": {
				"items": []
			},
			"amount": {
				"currency": order.currency_code,
				"details": {}
			},
			"description": "order"
		}]
	};

	create_payment_json.transactions[0].description = order.site_title + ' ' + 'Payment';
	create_payment_json.transactions[0].amount.details.subtotal = 0.00;
	create_payment_json.transactions[0].amount.details.tax = 0.00;
	create_payment_json.transactions[0].amount.details.handling_fee = 0.00;
	create_payment_json.transactions[0].amount.details.shipping = 0.00;
	create_payment_json.transactions[0].amount.total = parseFloat(order.pay_total).toFixed(2);
	console.log(create_payment_json.transactions[0].amount)
	if (typeof order.return_url != 'undefined') {
		var return_url = order.return_url;	 // mobile
	} else {								   	// web
		var return_url = "/site/users/recharge/paypal/execute";
	}

	if (typeof order.cancel_url != 'undefined') {
		var cancel_url = order.cancel_url; 	// mobile
	} else { 									// web
		var cancel_url = "/site/users/recharge/paypal/cancel";
	}
	create_payment_json.redirect_urls.return_url = "http://" + req.headers.host + return_url + "?payment_id=" + order.payment_id;
	create_payment_json.redirect_urls.cancel_url = "http://" + req.headers.host + cancel_url + "?payment_id=" + order.payment_id;
	console.log('create_payment_json', create_payment_json)
	api.payment.create(create_payment_json, function (error, payment) {
		if (error) {
			callback(error)
		} else {
			var data = {};
			for (var i = 0; i < payment.links.length; i++) {
				var link = payment.links[i];
				if (link.method === 'REDIRECT') {
					data.redirectUrl = link.href;
				}
			}
			data.payment_mode = 'paypal';
			console.log('data', data)
			callback(data);
		}
	});
}
function execute(paymentId, details, callback) {
	api.payment.execute(paymentId, details, function (error, payment) {
		if (error) {
			callback(error);
		} else {
			callback(payment);
		}
	});
}

module.exports = {
	"create": create,
	"createRecharge": createRecharge,
	"execute": execute
};