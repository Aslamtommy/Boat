const user = require("../models/userModel");
const product = require("../models/productModel");
const category = require("../models/categoryModel");
const address = require("../models/addressModel");
const order = require("../models/orderModel");
const cart = require("../models/cartmodel");
const Razorpay = require("razorpay");
const Wallet = require("../models/walletModel");
const easyinvoice = require("easyinvoice");
const { Readable } = require("stream");
const moment = require("moment");
const PDFDocument = require("pdfkit");
const fs = require("fs");
 const dotenv=require('dotenv')
dotenv.config();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,

  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
 

const ordersuccess = async (req, res) => {
  try {
    // Retrieve order ID from the session
    const orderId = req.session.orderId;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID not provided" });
    }

    // Retrieve order details from the database
    const orderData = await order.findOne({ _id: orderId });

    if (!orderData) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Reduce stock for each product in the order
    for (const item of orderData.items) {
      const productData = await product.findOne({ _id: item.productId });

      if (!productData) {
        // Handle case where product is not found
        continue;
      }

      // Update product stock
      const newStock = productData.stock - item.quantity;
      await product.updateOne(
        { _id: item.productId },
        { $set: { stock: newStock } }
      );
    }

    // Clear the order ID from the session
    delete req.session.orderId;

    // Render the order success page
    res.render("ordersuccess");
  } catch (error) {
    console.error("Error processing order:", error);
    res.status(500).send("Error processing order");
  }
};

const retryorder = async (req, res) => {
  try {
    res.render("retry");
  } catch (error) {
    console.error("Error processing order:", error);
    res.status(500).send("Error processing order");
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { addressId, paymentOption, cartSubtotal, discount } = req.body;

    console.log("Received order placement request:", req.body);

    // Retrieve user data
    const userData = await user.findOne({ _id: userId });

    console.log("Retrieved user data:", userData);

    // Retrieve cart data
    const orderProductsData = await cart
      .findOne({ userId: userId })
      .populate("items.productId");

    console.log("Retrieved cart data:", orderProductsData);

    // Retrieve address data
    const addressData = await address.findOne({ userid: userId });
    const selectedAddress = addressData.address.find(
      (item) => item._id == addressId
    );

    console.log("Retrieved address data:", selectedAddress);

    if (!selectedAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // Calculate total price of the order after applying discount
    let total = cartSubtotal;
    console.log("Total before applying discount:", cartSubtotal);
    console.log("Discount applied:", discount);
    let discountedtotal = cartSubtotal - (discount || 0);
    console.log("Total after discount:", total);

    const orderItems = [];

    // Update product stock and create new order
    for (const item of orderProductsData.items) {
      const productData = await product.findOne({ _id: item.productId });

      const category = productData.category;

      // Add item to order items array with category included
      orderItems.push({
        productId: item.productId,
        name: item.productId.name,
        price: item.productId.price,
        quantity: item.quantity,
        additionalimages: item.productId.additionalimages,
        subTotal: item.quantity * item.productId.price,
        salesPrice: item.productId.price,
        category: category, // Include category field
      });
    }

    console.log("Order items:", orderItems);

    // Create new order instance
    const newOrder = new order({
      userId: userId,
      items: orderItems,
      email: userData.email,
      address: addressData,
      payMethod: paymentOption,
      total: total,
      discount: discount,
    });

    console.log("New order data:", newOrder);

    // Save order to database
    const orderData = await newOrder.save();

    console.log("Order saved to database:", orderData);

    // Clear cart
    console.log("Cart cleared for user:", userId);
    // Clear cart after placing order
    await cart.findOneAndUpdate({ userId: userId }, { $set: { items: [] } });

    // Deduct payment amount from wallet balance if payment option is 'Wallet'
    if (paymentOption === "Wallet") {
      // Store orderId in session
      req.session.orderId = orderData._id;
      const userWallet = await Wallet.findOne({ userid: userId });
      if (userWallet.balance >= total) {
        userWallet.balance -= total;
        userWallet.transaction.push({
          amount: total,
          reason: "product payment",
          transactionType: "Debit",
        });
        await userWallet.save();
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient balance in wallet" });
      }
    }

    // If payment option is 'Online Payment', generate Razorpay order
    if (paymentOption === "Online Payment") {
      req.session.orderId = orderData._id;
      const razorpayOrder = await razorpay.orders.create({
        amount: total * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: orderData._id.toString(), // Unique ID for the order
        payment_capture: 1, // Auto capture payment
      });

      console.log("Razorpay order created:", razorpayOrder);

      // Reduce stock for each product in the order
      // ...

      // Send Razorpay order ID and amount to client-side
      return res.status(200).json({
        success: true,
        message: "Order placed successfully",
        orderId: razorpayOrder.id,
        orderAmount: razorpayOrder.amount,
      });
    }

    // Store orderId in session
    req.session.orderId = orderData._id;

    return res.status(200).json({
      success: true,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to place order" });
  }
};

const placeOrder2 = async (req, res) => {
  try {
    const userId = req.session.user_id;

    const { addressId, paymentOption, cartSubtotal, discount } = req.body;

    // Retrieve user data
    const userData = await user.findOne({ _id: userId });

    // Retrieve cart data
    const orderProductsData = await order.findOne().sort({ date: -1 });
    console.log("last order", orderProductsData);

    // Retrieve address data
    const addressData = await address.findOne({ userid: userId });
    const selectedAddress = addressData.address.find(
      (item) => item._id == addressId
    );

    if (!selectedAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    // Calculate total price of the order
    let total = cartSubtotal - (discount || 0);

    // Update product stock
    for (const item of orderProductsData.items) {
      const productData = await product.findOne({ _id: item.productId });

      // Check if productData exists
      if (!productData) {
        return res
          .status(404)
          .json({
            success: false,
            message: `Product with ID ${item.productId} not found`,
          });
      }

      const newStock = productData.stock - item.quantity;

      // Check if newStock is valid
      if (newStock < 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: `Insufficient stock for product with ID ${item.productId}`,
          });
      }

      // Update product stock
      await product.updateOne(
        { _id: item.productId },
        { $set: { stock: newStock } }
      );
    }

    // Create new order instance
    const newOrder = new order({
      userId: userId,
      items: orderProductsData.items,
      total: total,
      status: "pending", // Set initial status to 'pending'
      paymentstatus: "pending",
      payMethod: paymentOption,
    });
    const secondOrder = await order.find().sort({ date: -1 }).limit(1);

    if (secondOrder.length > 0) {
      const orderToDelete = secondOrder[0];
      await order.deleteOne({ _id: orderToDelete._id });
      console.log("Second order deleted successfully.");
    } else {
      console.log("No second order found to delete.");
    }

    // Save the new order
    const savedOrder = await newOrder.save();

    // Clear cart
    await cart.updateOne({ userId: userId }, { $set: { items: [] } });

    // Deduct payment amount from wallet balance if payment option is 'Wallet'
    if (paymentOption === "Wallet") {
      const userWallet = await Wallet.findOne({ userid: userId });
      if (userWallet.balance >= total) {
        userWallet.balance -= total;
        userWallet.transaction.push({
          amount: total,
          reason: "product payment",
          transactionType: "Debit",
        });
        await userWallet.save();
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Insufficient balance in wallet" });
      }
    }

    // Generate Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: total * 100, // Razorpay expects amount in paise
      currency: "INR",
      // Unique ID for the order
      payment_capture: 1, // Auto capture payment
    });

    // Store the order ID in session
    req.session.orderId = savedOrder._id;

    // Send Razorpay order ID and amount to client-side
    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderId: razorpayOrder.id,
      orderAmount: razorpayOrder.amount,
    });
  } catch (error) {
    console.log("Error placing order:", error);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
};

const returnorder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderData = await order.findById(orderId).populate("items.productId");
    if (!orderData) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    orderData.status = "returned";
    await orderData.save();
    // Restore stock for each product in the cancelled order
    for (const item of orderData.items) {
      const productData = await product.findById(item.productId);
      if (productData) {
        const newStock = productData.stock + item.quantity;
        // Update the stock for the product
        await productData.updateOne({ stock: newStock });
      }
    }
    if (orderData.payMethod === "Online Payment" || "Wallet") {
      console.log("Checking user wallet...");
      const userWallet = await Wallet.findOne({ userid: orderData.userId });
      console.log("newth", userWallet);
      if (userWallet) {
        console.log("User wallet found:", userWallet);
        // Update the balance
        userWallet.balance += orderData.total;

        userWallet.transaction.push({
          amount: orderData.total,
          reason: "return a product",
          transactionType: "credit",
        });
        console.log("Updating user wallet balance:", userWallet.balance);
        await userWallet.save();
      } else {
        // Create a new wallet entry if it doesn't exist
        console.log("User wallet not found. Creating new wallet entry...");
        const userWallet = await Wallet.create({
          userid: orderData.userId,
          balance: orderData.total,
        });
        console.log("New wallet created:", userWallet);
      }
    }

    res.redirect("/useraccount");
  } catch (error) {
    console.log(error);
  }
};

const cancelorder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Find the order by ID and populate the items field with product details
    const orderData = await order.findById(orderId).populate("items.productId");

    // Check if the order exists
    if (!orderData) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update order status to 'Cancelled' and save it
    orderData.status = "cancelled";
    await orderData.save();

    // Restore stock for each product in the cancelled order
    for (const item of orderData.items) {
      const productData = await product.findById(item.productId);
      if (productData) {
        const newStock = productData.stock + item.quantity;
        // Update the stock for the product
        await productData.updateOne({ stock: newStock });
      }
    }
    if (orderData.payMethod === "Online Payment" || "Wallet") {
      console.log("Checking user wallet...");
      const userWallet = await Wallet.findOne({ userid: orderData.userId });
      console.log("newth", userWallet);
      if (userWallet) {
        console.log("User wallet found:", userWallet);
        // Update the balance
        userWallet.balance += orderData.total;
        console.log("Updating user wallet balance:", userWallet.balance);

        userWallet.transaction.push({
          amount: orderData.total,
          reason: "Cancelled a product",
          transactionType: "credit",
        });

        await userWallet.save();
      } else {
        // Create a new wallet entry if it doesn't exist
        console.log("User wallet not found. Creating new wallet entry...");
        const userWallet = await Wallet.create({
          userid: orderData.userId,
          balance: orderData.total,
        });
        console.log("New wallet created:", userWallet);
      }
    }

    // Redirect to user account page with a success message
    res.redirect("/useraccount?id=cancelled");
  } catch (error) {
    console.log("Error cancelling order:", error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
};

const orderlist = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const totalOrders = await order.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    // Paginate orders and sort by date in descending order
    const orderData = await order
      .find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("orderlist", { orderData, totalPages, currentPage: page });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const orderdetails = async (req, res) => {
  try {
    // Retrieve order ID from query parameters
    const orderId = req.query.id;

    // Fetch order details from the database based on the order ID and populate the productId field within the items array
    const orderData = await order.findById(orderId).populate("items.productId");

    // Check if orderData exists
    if (!orderData) {
      return res.status(404).send("Order not found");
    }

    res.render("orderdetails", { orderData });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error retrieving order details");
  }
};

const orderdetailsUser = async (req, res) => {
  try {
    // Retrieve order ID from query parameters
    const orderId = req.query.id;
    const Userid = req.session.user_id;
    const addressData = await address.findOne({ userid: Userid });
    console.log("address datas ", addressData);
    // Fetch order details from the database based on the order ID and populate the productId field within the items array
    const orderData = await order.findById(orderId).populate("items.productId");
    const userData = await user.findOne({ _id: orderData.userId });

    if (!orderData) {
      return res.status(404).send("Order not found");
    }

    // Render the order details page and pass the order data and product details to the template
    res.render("orderdetails", { orderData, userData, addressData });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error retrieving order details");
  }
};

const updatstatus = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const newStatus = req.query.newStatus;

    // Find the order by ID
    const orderToUpdate = await order.findById(orderId);

    if (!orderToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update the order status
    orderToUpdate.status = newStatus;

    // Save the updated order
    await orderToUpdate.save();

    return res.json({
      success: true,
      message: "Order status updated successfully",
      updatedOrder: orderToUpdate,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update order status" });
  }
};

const failedpayment = async (req, res) => {
  try {
    const orderid = req.query.id;
    const orderData = await order.findOne({ orderId: orderid });

    const userData = await user.find({ _id: req.session.user_id });
    const addressData = await address.findOne({ userid: req.session.user_id });
    console.log(orderData);

    return res.render("failedpayment", { userData, addressData, orderData });
  } catch (error) {
    console.error("Error in failedpayment function:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const paymentstatus = async (req, res) => {
  try {
    const { status } = req.body;
    console.log("Request Body:", req.body);

    // Find the last placed order in the database based on creation timestamp
    const lastPlacedOrder = await order.findOne().sort({ createdAt: -1 });

    if (!lastPlacedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }

    // Update the payment status of the last placed order and assign the result to a variable
    const updatedOrder = await order.findOneAndUpdate(
      { _id: lastPlacedOrder._id },
      { $set: { paymentstatus: status } },
      { new: true }
    );

    console.log("Updated Order:", updatedOrder);

    if (!updatedOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    console.log("Status updated successfully");
    return res.status(200).json({ success: true, updatedOrder });
  } catch (error) {
    console.log("Error updating payment status:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update payment status" });
  }
};

const saveInvoice = async (req, res) => {
  try {
    const { id: orderId } = req.query;
    const { user_id: userId } = req.session;

    // Fetch user details
    const userData = await user.findById(userId);

    // Fetch the address data for the user
    const addressData = await address.findOne({ userId });

    // Fetch the order details with product and address information
    const orderData = await order
      .findOne({ _id: orderId })
      .populate("items.productId");

    // Create a new PDF document with specified width and height
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set HTTP headers for the PDF response
    res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
    res.setHeader("Content-Type", "application/pdf");

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add content to the PDF document
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Invoice", { align: "center" })
      .moveDown();

    // Print Sender Details
    doc.font("Helvetica-Bold").text("Sender:", { underline: true });
    doc.font("Helvetica").text("boAt");
    doc.text("Kochi, kalamassery, India").moveDown();

    // Print Customer Details
    doc.font("Helvetica-Bold").text("Customer:", { underline: true });
    doc.font("Helvetica").text(`Name: ${userData.name}`);
    doc.text(`Mobile: ${userData.mobile}`).moveDown();

    // Print Address
    if (addressData) {
      const userAddress = addressData.address[0]; // Assuming the first address is used
      doc.font("Helvetica-Bold").text("Address:", { underline: true });
      doc.font("Helvetica").text(`House: ${userAddress.house}`);
      doc.text(`Landmark: ${userAddress.landmark}`);
      doc.text(`City: ${userAddress.city}`);
      doc.text(`State: ${userAddress.state}`);
      doc.text(`Zipcode: ${userAddress.zipcode}`);
      doc.text(`Country: ${userAddress.country}`).moveDown();
    }

    // Print Date
    doc
      .font("Helvetica-Bold")
      .text(`Date: ${moment(orderData.date).format("LL")}`);

    // Print Order Details
    doc.moveDown();
    doc.font("Helvetica-Bold").text(`Order ID: ${orderId}`);
    doc.font("Helvetica").text(`Payment Method: ${orderData.payMethod}`);
    doc.text(`Order Status: ${orderData.paymentstatus}`);

    // Print Products
    doc.moveDown();
    doc.font("Helvetica-Bold").text("Products:", { underline: true });
    let totalPrice = 0;
    orderData.items.forEach((item) => {
      const productName = item.productId
        ? item.productId.name || "Product Name Unavailable"
        : "Product Name Unavailable";
      const price = item.price * item.quantity;
      totalPrice += price;
      doc.font("Helvetica").text(`- ${productName}`);
      doc.text(`  Quantity: ${item.quantity}`);
      doc.text(`  Price: $${price.toFixed(2)}`);
      doc.text(`  Tax Rate: 0%`).moveDown();
    });

    // Print Total Price
    doc
      .font("Helvetica-Bold")
      .text(`Total Price: $${totalPrice.toFixed(2)}`)
      .moveDown();

    // Print Thank you message
    doc
      .font("Helvetica-Bold")
      .text("Thank you for your business!", { align: "center" });

    // Finalize the PDF document
    doc.end();
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  placeOrder,
  ordersuccess,
  cancelorder,
  orderlist,
  orderdetails,
  updatstatus,
  orderdetailsUser,
  returnorder,
  failedpayment,
  placeOrder2,
  paymentstatus,
  saveInvoice,
  retryorder,
};
