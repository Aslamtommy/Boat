const nodemailer=require('nodemailer')
const sendMail=(email,otp)=>{
    let transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user: 'a48149660@gmail.com',
    
            pass:'nyss tlax psrw bpzk'
            
        }
    })
    
    let mailOptions ={
    
    from:'mhdrizwanpkd@gmail.com',
    to:email,
    subtect:'verify email',
    text:`Your OTP: ${otp}`
    
    }
    
    transporter.sendMail(mailOptions, function(error,info){
        if(error){
            console.log(error)
        }else{
            console.log('Email sent:' + info.response)
          console.log(otp)
        }
    });
}

module.exports={
    sendMail,
 
}