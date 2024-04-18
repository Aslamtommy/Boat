const mongoose=require("mongoose")

const categorySchema=new mongoose.Schema({

name:{
    type:String,
    required:true
},

description:{
    type:String,
    required:true
},
isBlocked:{
    type:Number,
    default:0
}

})

module.exports=mongoose.model("Category",categorySchema)

