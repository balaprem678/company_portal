let stripe=require("stripe")
const db = require('../../adaptor/mongodb.js');


async function stripeCustomer(data) {
    try {
        let stripedata = await db.GetOneDocument("paymentgateway", { alias: "Stripe" }, {}, {});
        let stripeInstance = stripe(stripedata.doc.settings.secret_key);
        let token = data.data.tokens;
        const customer = await stripeInstance.customers.create({  
            //this is used to create a customer in stripe 
            email:token.email,
            source: token.id,
        });
        const charge = await stripeInstance.charges.create({ 
            //this is used to create a charge in stripe
            amount: data.data.amount * 100,
            description: "Payment for order in E-commerce",
            currency: "inr",
            customer: customer.id
        });
        if (charge.status === "succeeded") {
            return charge; 
            // Return the charge details if the charge is successful
        }else{
            return charge
        }
    } catch (error) {
        console.log(error);
        return error.message
        // throw new Error("Payment has failed"); // Throw an error if there's any issue with the payment
    }
}

async function stripeRefund(chargeid,amount){
    try {
        let stripedata = await db.GetOneDocument("paymentgateway", { alias: "Stripe" }, {}, {});
        let stripeInstance = stripe(stripedata.doc.settings.secret_key); 
        const refundData=await stripeInstance.refunds.create({
            charge:chargeid, //charge id has passed here
            amount: amount*100 //amount to be refunded
        })
        return refundData
    } catch (error) {   
        console.log(error)
        return error
    }
``}
async function stripechargeDetails(chargeId){ //this function is used to retrive details about the a specific charge in stripe
    try {
        let stripedata=await db.GetOneDocument("paymentgateway",{alias:"Stripe"},{},{})
        let stripeInstance=stripe(stripedata.doc.settings.secret_key)
        let chargeData=await stripeInstance.charges.retrieve(chargeId)
        return chargeData
    } catch (error) {
        return error
    }
}



module.exports={
    "stripecustomercreate":stripeCustomer,
    "stripeRefund":stripeRefund,
    "stripeChargeDetails":stripechargeDetails
}



////////////////////////////////////////////////////////////////////////////////////////////////////////// this payment is created using paymetnIntent
// const stripe = require("stripe")
// const db = require('../../adaptor/mongodb.js');

// async function stripeCustomer(data) {
//     try {
//         let stripedata = await db.GetOneDocument("paymentgateway", { alias: "Stripe" },{},{});
//             const stripeInstance = stripe(stripedata.doc.settings.secret_key);

//         let token = data;
//         const customer = await stripeInstance.customers.create({
//             email: token.email,
//             source: token.id
//         });

//         console.log("Customer created:", customer);
        
//         // Create a charge for the customer
//        await stripeInstance.paymentIntents.create({
//             amount: 1000*100,
//             description: "Payment for order",
//             currency: "inr",
//             customer: customer.id,
//             payment_method:token.card.id,
//             automatic_payment_methods: {
//                 enabled: true,
//               },

//         }).then(async(charges)=>{
//             console.log(charges,'this is the charges');
//             const paymentIntent = await stripeInstance.paymentIntents.confirm(
//                 charges.id,
//                 {
//                   payment_method: charges.payment_method,
//                   return_url: 'http://localhost:4200/payment/order/71810',
//                 })
//                 console.log("++++++++++++++++++++++++++this is the payment intent");
//             console.log(paymentIntent)
//         }).catch((err)=>{
//             console.log("somthing has happend here");
//             console.log(err)
//         })

        
//     } catch (error) {
//         console.error("Error occurred:", error);
//     }
// }

// module.exports = {
//     stripecustomercreate: stripeCustomer
// };
//////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////this is written using promise then methode 
// async function stripeCusotmer(data){
//     try { 
//     let stripedata= await db.GetOneDocument("paymentgateway",{alias:"Stripe"},{},{})
//     let stirpinstances=stripe(stripedata.doc.settings.secret_key)
//     let token=data.data.tokens
//     const customer=await stirpinstances.customers.create({
//         email:"suhail.th@teamtweaks.in",
//         source:token.id,
//     }).then((customer)=>{
//     return stirpinstances.charges.create({
//         amount:data.data.amount*100,
//         description:"payment for order",
//         currency:"inr",
//         customer:customer.id
//     })
//     }).then((charge)=>{
//     if(charge.status==="succeeded"){
//         return charge
//     }

//     })
        
//     }catch (error) {
//         console.log(error);
        
//         return "payment has failed"
//     }
   
    
// }