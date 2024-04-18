const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      default: null 
    }, 
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        subTotal: {
          type: Number,
          required: true,
          min: 0,
          
        },
        mainimage:String,
additionalimages:Array,
isPublished:{
    type:Boolean,
    default:true
},
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    total: {
      type: Number,
      
      min: 0,
      default: 0  // Provide a default value
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("cart", cartSchema);
