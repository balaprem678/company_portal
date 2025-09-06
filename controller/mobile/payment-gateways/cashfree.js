var db = require("../../adaptor/mongodb");
const { Cashfree } = require("cashfree-pg");

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
      return_url: siteUrl + `payment/order/${order.order_id}`,
      // "return_url": `http://localhost:4200/payment/order/${order.order_id}`
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
    // console.log(a, 'what is the response');
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
module.exports = {
  create: createOrder,
  fetchPayment: fetchPayment,
};
