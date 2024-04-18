const mongoose=require('mongoose')

const productSchema=new mongoose.Schema({

name:{
    type:String,
    required:true
},

category:{
    type:mongoose.Types.ObjectId,
    ref:'Category',
    required:true
},
promoprice:{
    type:Number,
    required:false
},
description:{
    type:String,
    required:true

},
stock:{
    type:Number,
 required:true
},

price:{
    type:Number,

    required:true
},
mainimage:String,
additionalimages:Array,
isPublished:{
    type:Boolean,
    default:false
},

discount:{
    type:Number,
    default:0
},
offer:{
    type: mongoose.Types.ObjectId,
    ref: 'Offer'
}  


})
const product=mongoose.model('product',productSchema)
module.exports=product;