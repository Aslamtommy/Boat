const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
   name: {
      type: String,
      required: true
   },
   Order:{
      type:mongoose.Types.ObjectId,
      ref:'Order',
      required:false
  },
   email: {
      type: String,
      required: true
   },
   mobile:{
      type:Number,
      required:true
   },
   password: {
      type: String, 
      required: true
   },
   is_admin: {
      type: Number, 
      default:0
   },
   is_verified: {
      type: Number, 
      default: 0 
   },
   otp:{
      type:String
   },
   isBlocked:{
      type:Boolean,
      default:false
   }
});

module.exports = mongoose.model('User', userSchema);
