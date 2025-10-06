// "use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var mongoose = require("mongoose");
  var controller = {};

  /**
   * @route POST /performance/report
   * @desc Get performance analysis report
   * @body { month, year, sortBy, filterBy }
   */
  controller.getPerformanceReport = async function (req, res) {
    try {
      const { month, year, sortBy, filterBy } = req.body;

      // Define date range for the selected month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Aggregate attendance + employee info
      const pipeline = [
        {
          $lookup: {
            from: "employee",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData"
          }
        },
        { $unwind: "$employeeData" },
        {
          $project: {
            employeeId: "$employeeData.employeeId",
            fullName: "$employeeData.fullName",
            role: "$employeeData.role",
            dateOfJoining: "$employeeData.dateOfJoining",
            records: 1
          }
        },
        {
          $addFields: {
            monthlyRecords: {
              $filter: {
                input: "$records",
                as: "rec",
                cond: {
                  $and: [
                    { $gte: ["$$rec.date", startDate] },
                    { $lte: ["$$rec.date", endDate] }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            employeeId: 1,
            fullName: 1,
            role: 1,
            dateOfJoining: 1,
            totalWorkingDays: { $size: "$monthlyRecords" },
            presentDays: {
              $size: {
                $filter: {
                  input: "$monthlyRecords",
                  as: "r",
                  cond: { $eq: ["$$r.status", "P"] }
                }
              }
            },
            leaveDays: {
              $size: {
                $filter: {
                  input: "$monthlyRecords",
                  as: "r",
                  cond: { $eq: ["$$r.status", "L"] }
                }
              }
            },
            sickDays: {
              $size: {
                $filter: {
                  input: "$monthlyRecords",
                  as: "r",
                  cond: { $eq: ["$$r.status", "S"] }
                }
              }
            },
            speedViolations: { $sum: "$monthlyRecords.speedViolations" },
            accidents: { $sum: "$monthlyRecords.accidents" },
            trafficPenalties: { $sum: "$monthlyRecords.trafficPenalties" },
            incidents: { $sum: "$monthlyRecords.incidents" }
          }
        },
        {
          $addFields: {
            performanceScore: {
              $cond: [
                { $eq: ["$totalWorkingDays", 0] },
                0,
                {
                  $multiply: [
                    { $divide: ["$presentDays", "$totalWorkingDays"] },
                    100
                  ]
                }
              ]
            }
          }
        },
        { $sort: { performanceScore: -1 } } // Default sort: high to low
      ];

      const result = await db.GetAggregation("attendance", pipeline);

      // Optional filters/sorting at API level
      let filtered = result;
      if (filterBy === "driver")
        filtered = filtered.filter(r => r.role === "Driver");
      if (filterBy === "lowPerformance")
        filtered = filtered.filter(r => r.performanceScore < 80);

      return res.send({
        status: true,
        count: filtered.length,
        data: filtered
      });
    } catch (error) {
      console.log(error, "ERROR getPerformanceReport");
      return res.send({
        status: false,
        message: "Something went wrong while generating performance report."
      });
    }
  };

  return controller;
};
