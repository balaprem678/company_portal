"use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var mongoose = require("mongoose");
  var controller = {};

  /**
   * @route POST /attendance/save
   * @desc Add or Update Attendance
   */
//   controller.saveAttendance = async function (req, res) {
//     try {
//       const body = req.body;

//       if (!body.employee || !body.date || !body.status) {
//         return res.send({ status: false, message: "Missing required fields" });
//       }

//       let attendanceDate = new Date(body.date);
//       attendanceDate.setHours(0, 0, 0, 0); // normalize date

//       let data = {
//         employee: new mongoose.Types.ObjectId(body.employee),
//         date: attendanceDate,
//         status: body.status,
//         remarks: body.remarks || "",
//       };

//       let result;

//       if (body._id && body._id !== "null") {
//         // ---- Update existing attendance ----
//         result = await db.UpdateDocument(
//           "attendance",
//           { _id: new mongoose.Types.ObjectId(body._id) },
//           data
//         );
//       } else {
//         // ---- Upsert (if attendance for employee already exists that date, update it) ----
//         result = await db.UpdateDocument(
//           "attendance",
//           { employee: data.employee, date: data.date },
//           data,
//           { upsert: true }
//         );
//       }

//       return res.send({
//         status: true,
//         message: body._id ? "Attendance updated successfully" : "Attendance saved successfully",
//         data: result,
//       });
//     } catch (error) {
//       console.log(error, "ERROR saveAttendance");
//       return res.send({
//         status: false,
//         message: "Something went wrong while saving attendance.",
//       });
//     }
//   };
controller.saveAttendance = async function (req, res) {
  try {
    const body = req.body;

    if (!body.employee || !body.date || !body.status) {
      return res.send({ status: false, message: "Missing required fields" });
    }

    const data = {
      employee: new mongoose.Types.ObjectId(body.employee),
      date: new Date(body.date),
      status: body.status,
      remarks: body.remarks || "",
    };

    let result;
    if (body._id) {
      result = await db.UpdateDocument("attendance", { _id: body._id }, data);
    } else {
      result = await db.InsertDocument("attendance", data);
    }

    return res.send({
      status: true,
      message: body._id ? "Attendance updated" : "Attendance saved",
      data: result,
    });
  } catch (err) {
    console.log("ERROR saveAttendance", err);
    return res.send({ status: false, message: "Error saving attendance" });
  }
};
  
/**
   * @route POST /attendance/list
   * @desc List Attendance with filters, pagination, sorting, search
   */


  controller.listAttendance = async function (req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status,
        startDate,
        endDate,
        sortBy,
        sortOrder = "desc",
      } = req.body;

      let match = {};

      // 🔹 Search by employee name or remarks
      if (search) {
        match.$or = [
          { remarks: { $regex: search, $options: "i" } },
          { "employeeData.fullName": { $regex: search, $options: "i" } },
        ];
      }

      // 🔹 Filter by status
      if (status) {
        match.status = status;
      }

      // 🔹 Filter by date range
      if (startDate && endDate) {
        match.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // 🔹 Sorting
      let sort = {};
      if (sortBy === "date") sort.date = sortOrder === "asc" ? 1 : -1;
      else if (sortBy === "employee") sort["employeeData.fullName"] = sortOrder === "asc" ? 1 : -1;
      else sort.date = -1; // default sort by newest date

      // 🔹 Aggregation Pipeline
      let pipeline = [
        {
          $lookup: {
            from: "employee",
            localField: "employee",
            foreignField: "_id",
            as: "employeeData",
          },
        },
        { $unwind: { path: "$employeeData", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            date: 1,
            status: 1,
            remarks: 1,
            "employeeData._id": 1,
            "employeeData.fullName": 1,
            "employeeData.employeeCode": 1,
          },
        },
        { $sort: sort },
      ];

      // Apply match only after lookup/project so search works
      if (Object.keys(match).length > 0) {
        pipeline.push({ $match: match });
      }

      // Pagination
      pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

      const [data, total] = await Promise.all([
        db.GetAggregation("attendance", pipeline),
        db.GetCount("attendance", {}),
      ]);

      return res.send({
        status: true,
        count: total,
        page: parseInt(page),
        limit: parseInt(limit),
        data,
      });
    } catch (error) {
      console.log(error, "ERROR listAttendance");
      return res.send({
        status: false,
        message: "Something went wrong while fetching attendance.",
      });
    }
  };

  controller.saveCustomerPayment = async function (req, res) {
  try {
    const body = req.body;

    const data = {
      client: body.client, // ref to Client
      contractId: body.contractId,
      invoiceNo: body.invoiceNo,
      dueDate: new Date(body.dueDate),
      amountPaid: body.amountPaid,
      status: body.status,
      balance: body.balance,
      remarks: body.remarks || "",
    };

    let result;
    if (body._id) {
      result = await db.UpdateDocument("customerPayment", { _id: body._id }, data);
    } else {
      result = await db.InsertDocument("customerPayment", data);
    }

    return res.send({
      status: true,
      message: body._id ? "Customer payment updated" : "Customer payment saved",
      data: result,
    });
  } catch (err) {
    console.log("ERROR saveCustomerPayment", err);
    return res.send({ status: false, message: "Error saving customer payment" });
  }
};


controller.saveVendorPayment = async function (req, res) {
  try {
    const body = req.body;

    const data = {
      vendor: body.vendor, // ref to Vendor
      contractId: body.contractId,
      invoiceNo: body.invoiceNo,
      dueDate: new Date(body.dueDate),
      amountPaid: body.amountPaid,
      status: body.status,
      balance: body.balance,
      remarks: body.remarks || "",
    };

    let result;
    if (body._id) {
      result = await db.UpdateDocument("vendorPayment", { _id: body._id }, data);
    } else {
      result = await db.InsertDocument("vendorPayment", data);
    }

    return res.send({
      status: true,
      message: body._id ? "Vendor payment updated" : "Vendor payment saved",
      data: result,
    });
  } catch (err) {
    console.log("ERROR saveVendorPayment", err);
    return res.send({ status: false, message: "Error saving vendor payment" });
  }
};


controller.listCustomerPayment = async function (req, res) {
  try {
    let { page, pagesize, search, status, startDate, endDate, sortField, sortOrder } = req.query;

    page = parseInt(page) || 1;
    pagesize = parseInt(pagesize) || 10;
    sortOrder = sortOrder === "desc" ? -1 : 1;

    let query = {};
    if (status) query.status = status;
    if (startDate && endDate) {
      query.dueDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { contractId: { $regex: search, $options: "i" } },
        { remarks: { $regex: search, $options: "i" } },
      ];
    }

    let sortObj = {};
    if (sortField) sortObj[sortField] = sortOrder;
    else sortObj.createdAt = -1;

    const result = await db.GetAggregation("customerpayment", [
      { $match: query },
      {
        $lookup: {
          from: "customers",
          localField: "client",
          foreignField: "_id",
          as: "clientData",
        },
      },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
      { $sort: sortObj },
      { $skip: (page - 1) * pagesize },
      { $limit: pagesize },
    ]);

    const count = await db.GetCount("customerpayment", query);

    return res.send({ status: true, count, data: result });
  } catch (err) {
    console.log(err, "ERROR listCustomerPayment");
    return res.send({ status: false, message: "Error fetching customer payments" });
  }
};

// 🔹 List Vendor Payments
controller.listVendorPayment = async function (req, res) {
  try {
    let { page, pagesize, search, status, startDate, endDate, sortField, sortOrder } = req.query;

    page = parseInt(page) || 1;
    pagesize = parseInt(pagesize) || 10;
    sortOrder = sortOrder === "desc" ? -1 : 1;

    let query = {};
    if (status) query.status = status;
    if (startDate && endDate) {
      query.dueDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { contractId: { $regex: search, $options: "i" } },
        { remarks: { $regex: search, $options: "i" } },
      ];
    }

    let sortObj = {};
    if (sortField) sortObj[sortField] = sortOrder;
    else sortObj.createdAt = -1;

    const result = await db.GetAggregation("vendorpayment", [
      { $match: query },
      {
        $lookup: {
          from: "vendors",
          localField: "vendor",
          foreignField: "_id",
          as: "vendorData",
        },
      },
      { $unwind: { path: "$vendorData", preserveNullAndEmptyArrays: true } },
      { $sort: sortObj },
      { $skip: (page - 1) * pagesize },
      { $limit: pagesize },
    ]);

    const count = await db.GetCount("vendorpayment", query);

    return res.send({ status: true, count, data: result });
  } catch (err) {
    console.log(err, "ERROR listVendorPayment");
    return res.send({ status: false, message: "Error fetching vendor payments" });
  }
};



  return controller;
};
