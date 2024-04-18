const mongoose=require("mongoose");

const otpSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    createdOn:{
        type:Date,
        default:Date.now(),
        expires:60
    }

})
module.exports=mongoose.model("OTP",otpSchema);