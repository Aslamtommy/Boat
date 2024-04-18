const nodemailer=require('nodemailer')
const sendMail=(email,otp)=>{
    let transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user: 'mhdrizwanpkd@gmail.com',
    
            pass:'sgzmnhpoginjuwat'
            
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