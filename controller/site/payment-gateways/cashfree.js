var api = require("paypal-rest-sdk");
var db = require("../../adaptor/mongodb.js");
// var db = require('../../adaptor/mongodb.js');

// db.GetOneDocument('paymentgateway', { status: { $ne: 0 }, alias: 'paypal' }, {}, {}, function (err, paymentgateway) {
// 	if (!err && paymentgateway && paymentgateway.settings && paymentgateway.settings.client_id) {
// 		if (paymentgateway && typeof paymentgateway._id != 'undefined') {
// 			api.configure({
// 				'mode': paymentgateway.settings.mode,
// 				'client_id': paymentgateway.settings.client_id,
// 				'client_secret': paymentgateway.settings.client_secret
// 			});
// 		} else {
//
// 		}
// 	}
// });
// function create(req, res, order, callback) {
// 	var create_payment_json = {
// 		"intent": "authorize",
// 		"payer": {
// 			"payment_method": "paypal"
// 		},
// 		"redirect_urls": {},
// 		"transactions": [{
// 			"item_list": {
// 				"items": []
// 			},
// 			"amount": {
// 				"currency": order.currency_code,
// 				"details": {}
// 			},
// 			"description": "order"
// 		}]
// 	};

// 	create_payment_json.transactions[0].description = order.site_title + ' ' + 'Payment :' + order.order_id;
// 	create_payment_json.transactions[0].amount.details.subtotal = 0.00;
// 	create_payment_json.transactions[0].amount.details.tax = 0.00;
// 	create_payment_json.transactions[0].amount.details.handling_fee = 0.00;
// 	create_payment_json.transactions[0].amount.details.shipping = 0.00;
// 	create_payment_json.transactions[0].amount.total = parseFloat(order.pay_total).toFixed(2);
// 	console.log(create_payment_json.transactions[0].amount)
// 	if (typeof order.return_url != 'undefined') {
// 		var return_url = order.return_url;	 // mobile
// 	} else {								   	// web
// 		var return_url = "/site/users/payment/paypal/execute";
// 	}

// 	if (typeof order.cancel_url != 'undefined') {
// 		var cancel_url = order.cancel_url; 	// mobile
// 	} else { 									// web
// 		var cancel_url = "/site/users/payment/paypal/cancel";
// 	}
// 	create_payment_json.redirect_urls.return_url = "http://" + req.headers.host + return_url + "?payment_id=" + order.payment_id;
// 	create_payment_json.redirect_urls.cancel_url = "http://" + req.headers.host + cancel_url + "?payment_id=" + order.payment_id;
// 	api.payment.create(create_payment_json, function (error, payment) {
// 		if (error) {
// 			callback(error)
// 		} else {
// 			var data = {};
// 			for (var i = 0; i < payment.links.length; i++) {
// 				var link = payment.links[i];
// 				if (link.method === 'REDIRECT') {
// 					data.redirectUrl = link.href;
// 				}
// 			}
// 			data.payment_mode = 'paypal';
// 			callback(data);
// 		}
// 	});
// }
// function createRecharge(req, res, order, callback) {
// 	var create_payment_json = {
// 		"intent": "authorize",
// 		"payer": {
// 			"payment_method": "paypal"
// 		},
// 		"redirect_urls": {},
// 		"transactions": [{
// 			"item_list": {
// 				"items": []
// 			},
// 			"amount": {
// 				"currency": order.currency_code,
// 				"details": {}
// 			},
// 			"description": "order"
// 		}]
// 	};

// 	create_payment_json.transactions[0].description = order.site_title + ' ' + 'Payment';
// 	create_payment_json.transactions[0].amount.details.subtotal = 0.00;
// 	create_payment_json.transactions[0].amount.details.tax = 0.00;
// 	create_payment_json.transactions[0].amount.details.handling_fee = 0.00;
// 	create_payment_json.transactions[0].amount.details.shipping = 0.00;
// 	create_payment_json.transactions[0].amount.total = parseFloat(order.pay_total).toFixed(2);
// 	console.log(create_payment_json.transactions[0].amount)
// 	if (typeof order.return_url != 'undefined') {
// 		var return_url = order.return_url;	 // mobile
// 	} else {								   	// web
// 		var return_url = "/site/users/recharge/paypal/execute";
// 	}

// 	if (typeof order.cancel_url != 'undefined') {
// 		var cancel_url = order.cancel_url; 	// mobile
// 	} else { 									// web
// 		var cancel_url = "/site/users/recharge/paypal/cancel";
// 	}
// 	create_payment_json.redirect_urls.return_url = "http://" + req.headers.host + return_url + "?payment_id=" + order.payment_id;
// 	create_payment_json.redirect_urls.cancel_url = "http://" + req.headers.host + cancel_url + "?payment_id=" + order.payment_id;
// 	console.log('create_payment_json', create_payment_json)
// 	api.payment.create(create_payment_json, function (error, payment) {
// 		if (error) {
// 			callback(error)
// 		} else {
// 			var data = {};
// 			for (var i = 0; i < payment.links.length; i++) {
// 				var link = payment.links[i];
// 				if (link.method === 'REDIRECT') {
// 					data.redirectUrl = link.href;
// 				}
// 			}
// 			data.payment_mode = 'paypal';
// 			console.log('data', data)
// 			callback(data);
// 		}
// 	});
// }
// function execute(paymentId, details, callback) {
// 	api.payment.execute(paymentId, details, function (error, payment) {
// 		if (error) {
// 			callback(error);
// 		} else {
// 			callback(payment);
// 		}
// 	});
// }

// module.exports = {
// 	"create": create,
// 	"createRecharge": createRecharge,
// 	"execute": execute
// };

// const sdk = require('api')('@cashfreedocs-new/v4#600zhmzls1ioc7l');
// sdk.auth('your-x-client-id', 'your-x-client-secret');
// sdk.pGCreateOrder({

//   },
//   terminal: {
//     terminal_id: 'your-terminal-id'
//   },
//   order_id: 'your-order-id',
//   order_amount: 10.15,
//   order_currency: 'INR',
//   order_expiry_time: '2021-07-02T10:20:12+05:30'
// }, {'x-api-version': '2023-08-01'})
//   .then(({ data }) => console.log(data))
//   .catch(err => console.error(err));

// const Cashfree= require('cashfree-pg');
const { Cashfree } = require("cashfree-pg");

// Now you can use the Cashfree object
var XClientSecret;
var XClientId;

async function getKeys() {
  const cashfreePaymentGateway = await db.GetOneDocument(
    "paymentgateway",
    { status: { $ne: 0 }, alias: "cashfree" },
    {},
    {}
  );
  if (cashfreePaymentGateway.status == true) {
    XClientId = cashfreePaymentGateway.doc.settings.app_key;
    XClientSecret = cashfreePaymentGateway.doc.settings.secret_key;

    Cashfree.XClientId = XClientId;
    Cashfree.XClientSecret = XClientSecret;
    Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;
  } else {
    console.log(cashfreePaymentGateway.doc);
  }
}

async function createOrder(order) {
  // get the keys
  await getKeys();
  console.log(
    order,
    "this is the order from another universe of the same name"
  );
  // Get the current time
  const currentTime = new Date();

  // Calculate the expiration time by adding 10 minutes (600,000 milliseconds) to the current time
  const expirationTime = new Date(currentTime.getTime() + 16 * 60 * 1000);

  // Format the expiration time in ISO 8601 format
  const formattedExpirationTime = expirationTime.toISOString();
  const transaction = await db.GetOneDocument(
    "transaction",
    { _id: order.transaction_id },
    {},
    {}
  );
  const settings = await db.GetOneDocument(
    "settings",
    { alias: "general" },
    {},
    {}
  );
  const siteUrl = settings.doc.settings.site_url;
  var request = {
    order_amount: transaction.doc.amount,
    order_currency: "INR",
    order_id: order.order_id,
    customer_details: {
      customer_id: order.user_id,
      customer_phone: order.delivery_address.phone,
      customer_name: order.delivery_address.name,
      customer_email: order.email,
    },
    order_meta: {
      return_url: siteUrl + "/payment/order/{order_id}",
      // "return_url":"http://localhost:4200/payment/order/{order_id}"
    },
    order_expiry_time: formattedExpirationTime,
    order_note: "Sample Order Note",
    order_tags: {
      name: "Developer",
      company: "Cashfree",
    },
  };

  // var request = {
  //     "order_amount": "100",
  //     "order_currency": "INR",
  //     "customer_details": {
  //         "customer_id": "node_sdk_test0111",
  //         "customer_name": "",
  //         "customer_email": "6801kpadarsh@gmail.com",
  //         "customer_phone": "8157020182"
  //     },
  //     "order_meta": {
  //         "return_url":"http://localhost:4201/payment/order/{order_id}"
  //         // "return_url": "https://www.cashfree.com/devstudio/preview/pg/web/checkout?order_id=my_order_o18012"
  //     },
  //     "order_note": ""
  // }

  try {
    const response = await Cashfree.PGCreateOrder("2022-09-01", request);
    var a = response.data;
    console.log(a, "what is the response");
    return a;
  } catch (error) {
    console.error("Error setting up order request:", error.response.data);
    throw error; // Re-throw the error if needed
  }
}

async function fetchPayment(id) {
  await getKeys();
  try {
    const response = await Cashfree.PGOrderFetchPayments("2023-08-01", id);
    console.log("response :", response);
    let a = response.data;
    console.log("Order fetched successfully:", a);
    return a;
  } catch (error) {
    console.error("Error:", error.response.data.message);
  }
}
async function createRefund(id, amount) {
  await getKeys();
  try {
    const request = {
      refund_id: id,
      refund_amount: amount,
      refund_speed: "STANDARD",
    };
    const response = await Cashfree.PGOrderCreateRefund(
      "2023-08-01",
      id,
      request
    );
    let a = response.data;
    console.log(
      response,
      "this is the response 0f the refund++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    );
    return a;
  } catch (error) {
    return error;
  }
}
async function fetchRefund(id) {
  await getKeys();
  try {
    const response = await Cashfree.PGOrderFetchRefund("2022-09-01", id, id);
    console.log(response, "this are the response");
    let a = response.data;
    return a;
  } catch (error) {
    console.log(error);
  }
}
module.exports = {
  create: createOrder,
  fetchPayment: fetchPayment,
  createRefund: createRefund,
};
