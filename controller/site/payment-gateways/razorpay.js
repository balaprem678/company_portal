
const Razorpay = require('razorpay');
var db = require('../../adaptor/mongodb.js');

let instances



//this function is used to create the instances of razorpay for payment
async function getrazopraydata() {
    //this is used to fetch the data about the api and sceret key to fetch the data from the back end for razorpay payment
    let data = await db.GetOneDocument("paymentgateway", { status: { $ne: 0 }, alias: 'Razorpay' }, {}, {})
    instances = new Razorpay({
        key_id: data.doc.settings.id,
        key_secret: data.doc.settings.secret
    })
}



//this function is used to create the  razorpay order id
async function createRazorpayOrder(orderdata, amount) {
    await getrazopraydata();
    const options = {
        amount: amount*100,
        currency: "INR"
    };
    try {
        let data = await instances.orders.create(options);
        return data;
    } catch (err) {
        return err;
    }
}


//this fucntion is used to fetch the details about the paymetn we have created earlier
async function fetchRazorayOrderbyID(orderId) {
    try {
        await getrazopraydata();
        let data = await instances.orders.fetch(orderId)
        return data
    } catch (error) {
        return error
    }
}
async function razorpayRefund(paymentId,refundAmount,refundSpeed){ //this is used to implement refund functionality for razorpay payment 
    try {
        await getrazopraydata()
        let data=await instances.payments.refund(paymentId,{
            amount:refundAmount, //amount to be refund  
            speed:refundSpeed //here we mention what is the refund mode such as intant or normal
        })
        return data
        
    } catch (error) {
        console.log(error)
        return error
        
    }
}    
module.exports = {
    "createOrder": createRazorpayOrder,
    "fetchOder": fetchRazorayOrderbyID,
    "refundPayment":razorpayRefund,


}