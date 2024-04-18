const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    orderId: {
      type: String,
      default: function() {
        return Math.floor(100000 + Math.random() * 900000).toString();
      },
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        name:{
          type:String,
          required:true
        },
        price:{
          type:Number,
          required:true
        },
        salesPrice: {
          type: Number, // Store the price at the time of ordering
         required :true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        subTotal: {
          type: Number,
          required: true,
          min: 0,
        },
        category:{
          type:mongoose.Types.ObjectId,
          ref:"Category",
          required:false
      },
        mainimage:String,
        additionalimages:Array,  
        // Nested schema for product details
        productDetails: {
          type: mongoose.Schema.Types.Mixed, // Store complete product details
       
        },
      
      }
    ],
    total: {
      type: Number,
      required: true,
      min: 0,
    },
   
    status: {
      type: String,
      default: "pending",
    },
    email: {
      type: String,
      required: false,
    },
    date: {
      type: Date,
      default: Date.now,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    discount:{
      type:Number,
      required:false
    },
    paymentstatus:{
      type:String,
      default:'pending'
    },
    
    payMethod: {
      type: String,
      required: false,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Order", orderSchema);
