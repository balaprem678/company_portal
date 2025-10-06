"use strict";
module.exports = function () {
  const db = require("../../controller/adaptor/mongodb.js");
  const mongoose = require("mongoose");
  const moment = require("moment");
  const controller = {};

  /**
   * @route POST /performance/report
   * @desc Generate performance analysis report for a given month & year
   */
  controller.performanceReport = async function (req, res) {
    try {
      const { month, year, search, sortBy, sortOrder = "asc", role } = req.body;

      if (!month || !year)
        return res.send({ status: false, message: "Month and Year are required" });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Fetch all employees (active ones)
      const employees = await db.GetDocument(
        "employee",
        role ? { status: 1, role } : { status: 1 },
        {},
        {}
      );

      if (!employees.status || !employees.doc.length)
        return res.send({ status: false, message: "No employees found" });

      const results = [];

      for (const emp of employees.doc) {
        // Get attendance document for employee
        const attnDoc = await db.GetOneDocument(
          "attendance",
          { employee: emp._id },
          {},
          {}
        );

        let leaveDays = 0,
          sickDays = 0,
          presentDays = 0,
          totalDays = 0;

        if (attnDoc.status && attnDoc.doc && attnDoc.doc.records.length > 0) {
          const records = attnDoc.doc.records.filter(
            (r) => r.date >= startDate && r.date <= endDate
          );

          totalDays = records.length;
          records.forEach((r) => {
            if (r.status === "P") presentDays++;
            if (r.status === "A") leaveDays++;
            if (r.status === "L" || r.status === "S") sickDays++;
          });
        }

        // Compute performance percentage
        const performancePercent =
          totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;

        // Get driver performance data if applicable
        let drivingBehaviour = null;
        if (emp.role === "Driver" && attnDoc.status && attnDoc.doc.performance.length > 0) {
          const perf = attnDoc.doc.performance.find(
            (p) => p.month === month && p.year === year
          );
          if (perf) {
            drivingBehaviour = {
              speedViolations: perf.speedViolations,
              accidents: perf.accidents,
              trafficPenalties: perf.trafficPenalties,
              incidents: perf.incidents,
            };
          }
        }

        results.push({
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          role: emp.role,
          doj: emp.dateOfJoining,
          leaveDays,
          sickDays,
          performancePercent,
          drivingBehaviour,
          remarks: "",
        });
      }

      // Sorting
      if (sortBy) {
        results.sort((a, b) => {
          let compare = 0;
          if (sortBy === "doj") {
            compare = new Date(a.doj) - new Date(b.doj);
          } else if (sortBy === "performance") {
            compare = a.performancePercent - b.performancePercent;
          }
          return sortOrder === "asc" ? compare : -compare;
        });
      }

      // Search filter
      let filtered = results;
      if (search) {
        filtered = results.filter((r) =>
          r.employeeName.toLowerCase().includes(search.toLowerCase())
        );
      }

      return res.send({
        status: true,
        count: filtered.length,
        data: filtered,
      });
    } catch (error) {
      console.log(error, "ERROR performanceReport");
      return res.send({
        status: false,
        message: "Error generating performance report",
      });
    }
  };

  controller.updateDrivingBehaviour = async function (req, res) {
  try {
    const { employeeId, month, year, speedViolations, accidents, trafficPenalties, incidents } = req.body;

    if (!employeeId || !month || !year)
      return res.send({ status: false, message: "Employee ID, month, and year are required" });

    const emp = await db.GetOneDocument("employee", { _id: new mongoose.Types.ObjectId(employeeId) }, {}, {});
    if (!emp.status) return res.send({ status: false, message: "Employee not found" });

    await db.UpdateDocument(
      "attendance",
      { employee: emp.doc._id },
      {
        $pull: { performance: { month, year } }
      }
    );

    await db.UpdateDocument(
      "attendance",
      { employee: emp.doc._id },
      {
        $push: {
          performance: {
            month,
            year,
            speedViolations,
            accidents,
            trafficPenalties,
            incidents
          }
        }
      }
    );

    return res.send({ status: true, message: "Driving behaviour updated successfully" });
  } catch (err) {
    console.log(err, "ERROR updateDrivingBehaviour");
    return res.send({ status: false, message: "Error updating driving behaviour" });
  }
};

  return controller;
};
