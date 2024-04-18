const otpGenerator = require('otp-generator')
const Otp=require('../models/otpModel')


const OTP=async(email)=>{
    const otpValue=otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false ,lowerCaseAlphabets:false});
    const newOtp=new Otp({
        email:email,otp:otpValue
    })
    const otpData=await newOtp.save()
    return otpValue
}
module.exports=OTP


