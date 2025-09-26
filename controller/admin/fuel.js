// "use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var mongoose = require("mongoose");
  var controller = {};

  /**
   * @route POST /fuel/save
   * @desc Add or Update Fuel Record
   */
  controller.saveFuel = async function (req, res) {
  try {
    const body = req.body;

    let fuelData = {
      vehicle: body.vehicleId ? new mongoose.Types.ObjectId(body.vehicleId) : null,
      driver: body.driverId ? new mongoose.Types.ObjectId(body.driverId) : null,
      contractId: body.contractId || "",                 // <-- added field
      monthlyAllowance: Number(body.monthlyAllowance) || 0,
      actualUsage: Number(body.actualUsage) || 0,
      lastRechargeDate: body.lastRechargeDate ? new Date(body.lastRechargeDate) : null,
      remarks: body.remarks || "",
      startOdometer: Number(body.startOdometer) || 0,
      endOdometer: Number(body.endOdometer) || 0,
      amountPaid: Number(body.amountPaid) || 0,
      issuedBy: body.issuedBy || "",
      fuelConsumed: Number(body.fuelConsumed) || 0,
    };

    let result;

    if (body._id) {
      // Update existing fuel record
      result = await db.UpdateDocument(
        "fuel",
        { _id: new mongoose.Types.ObjectId(body._id) },
        fuelData
      );
      return res.send({
        status: true,
        message: "Fuel record updated successfully",
        data: result,
      });
    } else {
      // Insert new fuel record
      result = await db.InsertDocument("fuel", fuelData);
      return res.send({
        status: true,
        message: "Fuel record added successfully",
        data: result,
      });
    }
  } catch (error) {
    console.error(error, "ERROR saveFuel");
    return res.send({
      status: false,
      message: "Something went wrong while saving fuel record.",
    });
  }
};

  /**
   * @route POST /fuel/view
   * @desc View single fuel record
   */
  controller.viewFuel = async function (req, res) {
  try {
    const { id } = req.body;

    const result = await db.GetOneDocument(
      "fuel",
      { _id: new mongoose.Types.ObjectId(id) },
      {},
      { populate: ["vehicle", "driver"] }
    );

    if (!result) {
      return res.send({ status: false, message: "Fuel record not found" });
    }

    return res.send({ status: true, data: result });
  } catch (error) {
    console.log(error, "ERROR viewFuel");
    return res.send({
      status: false,
      message: "Something went wrong while fetching fuel record.",
    });
  }
};


  /**
   * @route POST /fuel/list
   * @desc Get list of fuel records with filters
   */
  controller.listFuels = async function (req, res) {
  try {
    const { vehicle, driver, startDate, endDate, search } = req.body;

    let match = {};
    if (vehicle) match.vehicle = new mongoose.Types.ObjectId(vehicle);
    if (driver) match.driver = new mongoose.Types.ObjectId(driver);
    if (startDate && endDate) {
      match.lastRechargeDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (search) {
      // Search remarks, contractId, vehicle registration, or driver name
      match.$or = [
        { remarks: { $regex: search, $options: "i" } },
        { contractId: { $regex: search, $options: "i" } },
      ];
    }

    let pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "fleet",
          localField: "vehicle",
          foreignField: "_id",
          as: "vehicleData",
        },
      },
      { $unwind: { path: "$vehicleData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employee",
          localField: "driver",
          foreignField: "_id",
          as: "driverData",
        },
      },
      { $unwind: { path: "$driverData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          contractId: 1,              // <-- added contractId
          monthlyAllowance: 1,
          actualUsage: 1,
          lastRechargeDate: 1,
          remarks: 1,
          startOdometer: 1,
          endOdometer: 1,
          amountPaid: 1,
          issuedBy: 1,
          fuelConsumed: 1,
          "vehicleData._id": 1,
          "vehicleData.vehicleName": 1,
          "vehicleData.registrationNo": 1,
          "driverData._id": 1,
          "driverData.fullName": 1,
          "driverData.employeeId": 1,
        },
      },
      { $sort: { lastRechargeDate: -1 } },
    ];

    const result = await db.GetAggregation("fuel", pipeline);

    return res.send({
      status: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error, "ERROR listFuels");
    return res.send({
      status: false,
      message: "Something went wrong while fetching fuel records.",
    });
  }
};


  return controller;
};
