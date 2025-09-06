//"use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var async = require("async");
  var mongoose = require("mongoose");
  var moment = require("moment");
  var controller = {};

  controller.getReportPayment = async function (req, res) {
    try {
      const { year, month } = req.body;
  
      // Ensure month is a valid integer (0 or between 1 and 12)
      const selectedMonth = month && month !== '0' ? parseInt(month) : 0;
  
      let pipeline = [
        // Match transactions from the specified year
        {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01T00:00:00.000Z`), // Start of the year
              $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`), // Start of the next year
            },
          },
        },
        // Add a field to extract the month and day from the createdAt date
        {
          $addFields: {
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
        },
        // If a specific month is requested, filter transactions by that month
        ...(selectedMonth ? [{
          $match: {
            month: selectedMonth,
          },
        }] : []),
        // Group by month, day, and transaction type (razorpay or COD), and sum the amounts
        {
          $group: {
            _id: { month: "$month", day: "$day", type: "$type" },
            totalAmount: { $sum: "$amount" },
          },
        },
        // Project the result to have a clear structure
        {
          $project: {
            month: "$_id.month",
            day: "$_id.day",
            type: "$_id.type",
            totalAmount: 1,
            _id: 0,
          },
        },
      ];
  
      const result = await db.GetAggregation('transaction', pipeline);
  
      let reportData = [];
      let razorpayAmountTotal = 0;
      let codAmountTotal = 0;
  
      if (selectedMonth === 0) {
        // For the entire year (month-wise)
        for (let m = 1; m <= 12; m++) {
          let razorpayAmount = 0;
          let codAmount = 0;
  
          result.forEach(entry => {
            if (entry.month === m) {
              if (entry.type === 'razorpay') {
                razorpayAmount = entry.totalAmount;
              } else if (entry.type === 'COD') {
                codAmount = entry.totalAmount;
              }
            }
          });
  
          razorpayAmountTotal += razorpayAmount;
          codAmountTotal += codAmount;
  
          reportData.push({
            label: new Date(year, m - 1).toLocaleString('default', { month: 'long' }),
            razorpay_amount: razorpayAmount,
            cod_amount: codAmount,
          });
        }
      } else {
        // For the specific month (day-wise)
        const daysInMonth = new Date(year, selectedMonth, 0).getDate();
  
        for (let d = 1; d <= daysInMonth; d++) {
          let razorpayAmount = 0;
          let codAmount = 0;
  
          result.forEach(entry => {
            if (entry.month === selectedMonth && entry.day === d) {
              if (entry.type === 'razorpay') {
                razorpayAmount = entry.totalAmount;
              } else if (entry.type === 'COD') {
                codAmount = entry.totalAmount;
              }
            }
          });
  
          razorpayAmountTotal += razorpayAmount;
          codAmountTotal += codAmount;
  
          reportData.push({
            label: `${String(d).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${year}`,
            razorpay_amount: razorpayAmount,
            cod_amount: codAmount,
          });
        }
      }
  
      // Calculate total amount (sum of razorpay and cod amounts)
      const totalAmount = razorpayAmountTotal + codAmountTotal;
  
      // Add the total object to the response
      return res.send({
        status: true,
        data: reportData,
        total: {
          razorpay_amount_total: razorpayAmountTotal,
          cod_amount_total: codAmountTotal,
          total_amount: totalAmount,
        },
      });
    } catch (error) {
      console.log(error, "ERRORRR");
      return res.send({
        status: false,
        message: "There is something went wrong.",
      });
    }
  };
  
  
  
  
  
  
  
  controller.getReportSales = async function (req, res) {
    try {
        const { year, month } = req.body;
        console.log(req.body, "BODYYY");
        let category = [];
        let totalSaleSum = 0, grossSaleSum = 0, discountSum = 0, shippingSum = 0, taxesSum = 0;
      
        // If month is 0, set the start and end date for the whole year
        let startDate, endDate;
        let months = [];
      
        if (month === 0 || month === "0") {
          // For month = 0, set the start and end dates to cover the entire year
          startDate = new Date(year, 0, 1); // First day of the year
          endDate = new Date(year + 1, 0, 0); // Last day of the year (December 31)
      
          // Create categories for all months of the year
          months = Array.from({ length: 12 }, (_, i) => {
            return {
              month: new Date(year, i).toLocaleString('default', { month: 'long' }), // Get month name
              total_sale: 0, // Default value for each month
              gross_sale: 0,
              discount: 0,
              shipping: 0,
              taxes: 0,
            };
          });
        } else {
          // For any specific month, use the original logic
          startDate = new Date(year, month - 1, 1); // First day of the month
          endDate = new Date(year, month, 0); // Last day of the month
      
          // Create a category for the specific month
          months = [
            {
              month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }), // Month name
              total_sale: 0, // Default value for this month
              gross_sale: 0,
              discount: 0,
              shipping: 0,
              taxes: 0,
              days: [] // To store daily totals for the specific month
            }
          ];
        }
      
        // Aggregation pipeline to fetch orders based on the selected date range
        const pipeline = [
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
            },
          },
          {
            $project: {
              order_id: 1,
              user_id: 1,
              createdAt: 1, // Include createdAt for reference
              total_sale: "$billings.amount.total", // Include total sale in the projection
              gross_sale: "$billings.amount.grand_total", // Include gross sale
              discount: "$billings.amount.coupon_discount", // Discount amount
              shipping: "$billings.amount.shippingCharge", // Shipping charge
              taxes: "$billings.amount.service_tax", // Tax amount
            },
          },
        ];
      
        const getOrders = await db.GetAggregation("orders", pipeline);
      
        // Process the fetched orders and calculate totals for each month or day
        if (month === 0 || month === "0") {
          // If it's a year report, accumulate totals for the respective month
          getOrders.forEach(order => {
            const orderMonth = new Date(order.createdAt).getMonth(); // Get the month of the order
            const orderTotalSale = order.total_sale || 0; // Ensure there's a default if total_sale is not present
            const orderGrossSale = order.gross_sale || 0;
            const orderDiscount = order.discount || 0;
            const orderShipping = order.shipping || 0;
            const orderTaxes = order.taxes || 0;
      
            // Accumulate totals for that month
            months[orderMonth].total_sale += orderTotalSale;
            months[orderMonth].gross_sale += orderGrossSale;
            months[orderMonth].discount += orderDiscount;
            months[orderMonth].shipping += orderShipping;
            months[orderMonth].taxes += orderTaxes;
      
            // Sum the totals for the entire report (both monthly and yearly)
            totalSaleSum += orderTotalSale;
            grossSaleSum += orderGrossSale;
            discountSum += orderDiscount;
            shippingSum += orderShipping;
            taxesSum += orderTaxes;
          });
      
          // Fill missing months with 0 values if no orders exist for that month
          months.forEach((monthData) => {
            category.push({
                label: monthData.month,
              total_sale: monthData.total_sale || 0,
              gross_sale: monthData.gross_sale || 0,
              discount: monthData.discount || 0,
              shipping: monthData.shipping || 0,
              taxes: monthData.taxes || 0,
            });
          });
        } else {
          // If it's a specific month, calculate day-wise totals
          const daysInMonth = new Date(year, month, 0).getDate(); // Get number of days in the month
      
          // Initialize the days array with 0 totals for each day
          for (let i = 1; i <= daysInMonth; i++) {
            months[0].days.push({
              day: i,
              total_sale: 0,
              gross_sale: 0,
              discount: 0,
              shipping: 0,
              taxes: 0,
              date: `${i < 10 ? '0' + i : i}/${month < 10 ? '0' + month : month}/${year}`, // Format date as dd/mm/yyyy
            });
          }
      
          // Process orders and assign totals to the correct day
          getOrders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            if (orderDate.getMonth() === (month - 1)) { // Ensure it's for the correct month
              const orderDay = orderDate.getDate();
              const orderTotalSale = order.total_sale || 0;
              const orderGrossSale = order.gross_sale || 0;
              const orderDiscount = order.discount || 0;
              const orderShipping = order.shipping || 0;
              const orderTaxes = order.taxes || 0;
      
              // Accumulate totals for the respective day
              const dayData = months[0].days.find(day => day.day === orderDay);
              if (dayData) {
                dayData.total_sale += orderTotalSale;
                dayData.gross_sale += orderGrossSale;
                dayData.discount += orderDiscount;
                dayData.shipping += orderShipping;
                dayData.taxes += orderTaxes;
      
                // Sum the totals for the entire report
                totalSaleSum += orderTotalSale;
                grossSaleSum += orderGrossSale;
                discountSum += orderDiscount;
                shippingSum += orderShipping;
                taxesSum += orderTaxes;
              }
            }
          });
      
          // Push the day-wise totals for the specific month
          months[0].days.forEach(dayData => {
            category.push({
                label: dayData.date,
              total_sale: dayData.total_sale || 0,
              gross_sale: dayData.gross_sale || 0,
              discount: dayData.discount || 0,
              shipping: dayData.shipping || 0,
              taxes: dayData.taxes || 0,
            });
          });
        }
      
        // Return the result, including the sum of all fields
        return res.send({
          status: true,
          data: getOrders,
          category: category,
          total: {
            total_sale: totalSaleSum,
            gross_sale: grossSaleSum,
            discount: discountSum,
            shipping: shippingSum,
            taxes: taxesSum,
          }
        });
    } catch (error) {
      console.log(error, "ERRORRR");
      return res.send({
        status: false,
        message: "There is something went wrong.",
      });
    }
  };

  return controller;
};
