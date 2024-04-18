const mongoose=require('mongoose')


const wishlistSchema=new mongoose.Schema({
    userid:{
        type:String,
        required:true
    },
    products:[{
        type:mongoose.Types.ObjectId,
        ref:'product',
        required:true
    }]
})

module.exports=mongoose.model('wishlist',wishlistSchema)   
