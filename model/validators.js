const { check, validationResult } = require("express-validator");

let validator = {};

validator.productDetail =[
    check("slug").notEmpty().withMessage("Slug is required"),
    (req,res,next)=>{
        let error = validationResult(req).errors;
        if(error && Array.isArray(error) && error.length > 0){
            return res.status(400).send({status:0,message:error[0].msg})
        };
        next();
    }
]

module.exports ={
    "validator" :validator
}