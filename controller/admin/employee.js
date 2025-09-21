//"use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var async = require("async");
  var mongoose = require("mongoose");
  var moment = require("moment");
  var controller = {};

  /**
   * @route POST /employee/add
   * @desc Add a new employee
   */
controller.saveEmployee = async function (req, res) {
  try {
    const body = req.body;

console.log(body,"bodybody");

    return

    let employeeData = {
      fullName: body.fullName,
      nationality: body.nationality || null,
      bloodGroup: body.bloodGroup || null,
      dob: body.dob ? new Date(body.dob) : null,
      permanentAddress: body.permanentAddress || null,
      designation: body.designation || null,
      employeeId: body.employeeId,
      employmentType: body.employmentType || "Full-Time",
      dateOfJoining: body.dateOfJoining ? new Date(body.dateOfJoining) : new Date(),
      underContract: body.underContract || null,
      salary: body.salary || 0,
      bankDetails: body.bankDetails || {},
      nominee: body.nominee || {},
      visaExpiry: body.visaExpiry ? new Date(body.visaExpiry) : null,
      licenseNo: body.licenseNo || null,
      role: body.role || "Staff", // Default role Staff
      documents: body.documents || [],
      status: body.status || 1
    };

    let result;

    if (body._id) {
      // ---- Update Employee ----
      result = await db.UpdateDocument(
        "employee",
        { _id: mongoose.Types.ObjectId(body._id) },
        employeeData
      );
      return res.send({
        status: true,
        message: "Employee updated successfully",
        data: result,
      });
    } else {
      // ---- Add New Employee ----
      result = await db.InsertDocument("employee", employeeData);
      return res.send({
        status: true,
        message: "Employee added successfully",
        data: result,
      });
    }
  } catch (error) {
    console.log(error, "ERROR saveEmployee");
    return res.send({
      status: false,
      message: "Something went wrong while saving employee.",
    });
  }
};


  /**
   * @route POST /employee/list
   * @desc Get employees with filters
   */
  controller.listEmployees = async function (req, res) {
    try {
      const { role, status, nationality, designation, startDate, endDate, search } = req.body;

      let match = {};

      if (role) match.role = role;
      if (status) match.status = parseInt(status);
      if (nationality) match.nationality = nationality;
      if (designation) match.designation = designation;

      // Date range filter (DOJ)
      if (startDate && endDate) {
        match.dateOfJoining = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Text search (fullName / employeeId)
      if (search) {
        match.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { employeeId: { $regex: search, $options: "i" } },
        ];
      }

      let pipeline = [
        { $match: match },
        {
          $project: {
            fullName: 1,
            employeeId: 1,
            designation: 1,
            nationality: 1,
            dateOfJoining: 1,
            visaExpiry: 1,
            role: 1,
            status: 1,
          },
        },
        { $sort: { dateOfJoining: -1 } },
      ];

      const result = await db.GetAggregation("employee", pipeline);

      return res.send({
        status: true,
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.log(error, "ERROR listEmployees");
      return res.send({
        status: false,
        message: "Something went wrong while fetching employees.",
      });
    }
  };

  return controller;
};
