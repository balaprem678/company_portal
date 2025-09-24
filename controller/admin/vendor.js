// "use strict";
module.exports = function () {
  var db = require("../../controller/adaptor/mongodb.js");
  var mongoose = require("mongoose");
  var controller = {};

  /**
   * @route POST /vendor/save
   * @desc Add or Update a vendor
   */
  controller.saveVendor = async function (req, res) {
    try {
      const body = req.body;

      console.log(body, "body vendor");
      console.log(req.files, "files vendor");

      // Normalize documents
      let documents = [];
      if (body.documents) {
        let docsFromBody = typeof body.documents === "string"
          ? JSON.parse(body.documents)
          : body.documents;

        documents = docsFromBody.map((doc, index) => {
          let matchedFile = req.files?.find(
            (f) => f.fieldname === `documents[${index}][file]`
          );

          return {
            documentType: doc.type || doc.documentType,
            fileUrl: matchedFile
              ? matchedFile.destination + matchedFile.filename
              : doc.fileUrl || null,
          };
        });
      }

      let vendorData = {
        vendorName: body.vendorName,
        contractId: body.contractId,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        buses: body.buses ? body.buses.split(",").map(id => new mongoose.Types.ObjectId(id)) : [],
        drivers: body.drivers ? body.drivers.split(",").map(id => new mongoose.Types.ObjectId(id)) : [],
        noOfBuses: body.noOfBuses || 0,
        noOfDrivers: body.noOfDrivers || 0,
        contactOfficer: body.contactOfficer || null,
        contractType: body.contractType || null,
        invoicingDate: body.invoicingDate ? new Date(body.invoicingDate) : null,
        lastPayment: body.lastPayment ? new Date(body.lastPayment) : null,
        status: Number(body.status) || 1,
        documents: documents
      };

      let result;
      if (body._id && body._id !== "null") {
        // ---- Update Vendor ----
        result = await db.UpdateDocument(
          "vendor",
          { _id: new mongoose.Types.ObjectId(body._id) },
          vendorData
        );
        return res.send({
          status: true,
          message: "Vendor updated successfully",
          data: result,
        });
      } else {
        // ---- Add New Vendor ----
        result = await db.InsertDocument("vendor", vendorData);
        return res.send({
          status: true,
          message: "Vendor added successfully",
          data: result,
        });
      }
    } catch (error) {
      console.log(error, "ERROR saveVendor");
      return res.send({
        status: false,
        message: "Something went wrong while saving vendor.",
      });
    }
  };

  /**
   * @route POST /vendor/view
   * @desc View vendor by ID
   */
  controller.viewVendor = async function (req, res) {
    try {
      const { id } = req.body;

      const result = await db.GetOneDocument(
        "vendor",
        { _id: new mongoose.Types.ObjectId(id) },
        {},
        {}
      );

      if (!result) {
        return res.send({ status: false, message: "Vendor not found" });
      }

      return res.send({ status: true, data: result });
    } catch (error) {
      console.log(error, "ERROR viewVendor");
      return res.send({
        status: false,
        message: "Something went wrong while fetching vendor details.",
      });
    }
  };

  /**
   * @route POST /vendor/list
   * @desc List vendors with filters
   */
  controller.listVendors = async function (req, res) {
    try {
      const { status, contractType, startDate, endDate, search } = req.body;

      let match = {};
      if (status) match.status = parseInt(status);
      if (contractType) match.contractType = contractType;

      if (startDate && endDate) {
        match.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      if (search) {
        match.$or = [
          { vendorName: { $regex: search, $options: "i" } },
          { contractId: { $regex: search, $options: "i" } },
        ];
      }

      let pipeline = [
        { $match: match },
        {
          $lookup: {
            from: "fleet",
            localField: "buses",
            foreignField: "_id",
            as: "busesDetails"
          }
        },
        {
          $lookup: {
            from: "employee",
            localField: "drivers",
            foreignField: "_id",
            as: "driversDetails"
          }
        },
        {
          $project: {
            vendorName: 1,
            contractId: 1,
            startDate: 1,
            endDate: 1,
            contactOfficer: 1,
            contractType: 1,
            invoicingDate: 1,
            lastPayment: 1,
            status: 1,
            "busesDetails.vehicleName": 1,
            "driversDetails.fullName": 1
          }
        },
        { $sort: { startDate: -1 } }
      ];

      const result = await db.GetAggregation("vendor", pipeline);

      return res.send({
        status: true,
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.log(error, "ERROR listVendors");
      return res.send({
        status: false,
        message: "Something went wrong while fetching vendors.",
      });
    }
  };

  return controller;
};
