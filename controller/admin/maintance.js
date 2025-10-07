// "use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var mongoose = require("mongoose");
  var controller = {};

  /**
   * @route POST /maintenance/save
   * @desc Add or Update Maintenance Record
   */
  controller.saveMaintenance = async function (req, res) {
    try {
      const body = req.body;

      let maintenanceData = {
        vehicle: body.vehicle,
        driver: body.driver,
        maintenanceDate: body.maintenanceDate ? new Date(body.maintenanceDate) : new Date(),
        maintenanceType: body.maintenanceType,
        partsUsed: body.partsUsed || [], // [{ part: ObjectId, quantity: Number }]
        maintenanceCost: body.maintenanceCost || 0,
        remarks: body.remarks || ""
      };

      let result;

      if (body._id && body._id !== "null") {
        // ---- Update Maintenance ----
        result = await db.UpdateDocument(
          "maintenance",
          { _id: new mongoose.Types.ObjectId(body._id) },
          maintenanceData
        );
      } else {
        // ---- Add New Maintenance ----
        result = await db.InsertDocument("maintenance", maintenanceData);
      }

      // 🔹 Deduct stock if parts are used
      if (maintenanceData.partsUsed && maintenanceData.partsUsed.length > 0) {
        for (let item of maintenanceData.partsUsed) {
          await db.UpdateDocument(
            "sparepart",
            { _id: new mongoose.Types.ObjectId(item.part) },
            { $inc: { totalQuantity: -item.quantity } }
          );
        }
      }

      return res.send({
        status: true,
        message: body._id ? "Maintenance updated successfully" : "Maintenance added successfully",
        data: result,
      });

    } catch (error) {
      console.log(error, "ERROR saveMaintenance");
      return res.send({
        status: false,
        message: "Something went wrong while saving maintenance.",
      });
    }
  };

  /**
   * @route POST /maintenance/list
   * @desc Get Maintenance Records with filters
   */
  controller.listMaintenance = async function (req, res) {
    try {
      const { vehicle, month, maintenanceType, part, startDate, endDate, sortBy } = req.body;

      let match = { status: 1 };

      if (vehicle) match.vehicle = new mongoose.Types.ObjectId(vehicle);
      if (maintenanceType) match.maintenanceType = maintenanceType;
      if (part) match["partsUsed.part"] = new mongoose.Types.ObjectId(part);

      if (month) {
        let start = new Date(`${month}-01`);
        let end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        match.maintenanceDate = { $gte: start, $lt: end };
      }

      if (startDate && endDate) {
        match.maintenanceDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      let sort = {};
      if (sortBy === "dateNewest") sort.maintenanceDate = -1;
      if (sortBy === "dateOldest") sort.maintenanceDate = 1;
      if (sortBy === "costLow") sort.maintenanceCost = 1;
      if (sortBy === "costHigh") sort.maintenanceCost = -1;

      let pipeline = [
  { $match: match },
  { $lookup: { from: "fleet", localField: "vehicle", foreignField: "_id", as: "vehicleData" } },
  { $unwind: { path: "$vehicleData", preserveNullAndEmptyArrays: true } },
  { $lookup: { from: "employee", localField: "driver", foreignField: "_id", as: "driverData" } },
  { $unwind: { path: "$driverData", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "sparepart",
      localField: "partsUsed.part",
      foreignField: "_id",
      as: "partsData"
    }
  },
  {
    $project: {
      maintenanceDate: 1,
      maintenanceType: 1,
      maintenanceCost: 1,
      remarks: 1,
      "vehicleData.registrationNo": 1,
      "driverData.fullName": 1,
      partsUsed: 1,
      partsData: { name: 1, partNumber: 1 }
    }
  }
];

// ✅ Add sort only if not empty
if (Object.keys(sort).length > 0) {
  pipeline.push({ $sort: sort });
} else {
  pipeline.push({ $sort: { maintenanceDate: -1 } }); // default newest first
}


      const result = await db.GetAggregation("maintenance", pipeline);

      return res.send({
        status: true,
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.log(error, "ERROR listMaintenance");
      return res.send({
        status: false,
        message: "Something went wrong while fetching maintenance records.",
      });
    }
  };

  return controller;
};
