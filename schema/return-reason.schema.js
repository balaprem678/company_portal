const mongoose =require("mongoose")
const { types } = require("pg")

const RETURN_REASON_SCHEMA={}

RETURN_REASON_SCHEMA.RETURNREASON={
    reason:String,
    status:{type:Boolean,default:1}, // 1 -active status, 0-inactive status
    createdAt:{type:Date,default:Date.now}
}

module.exports=RETURN_REASON_SCHEMA