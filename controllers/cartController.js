
const Cart=require('../models/cartmodel')
const Product=require('../models/productModel')
const category=require('../models/categoryModel')
const user=require('../models/userModel');
const addressModel = require('../models/addressModel');
const coupon=require('../models/coupenModel')
const cart = async (req, res) => {
  try {
    // Get the user ID from the session
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).send('Unauthorized'); // Ensure user is logged in
    }

    // Find the cart for the current user
    const userCart = await Cart.findOne({ userId }).populate('items.productId');

    // Fetch the total subtotal from your database
    const totalSubtotal = userCart.total; // Assuming you have a 'total' field in your cart schema

    res.render('cart', { cart: userCart || { items: [] }, totalSubtotal }); // Pass cart data and total subtotal to the cart view
  } catch (error) {
    console.error('Error rendering cart page:', error.message);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};

const addToCart = async (req, res) => {
  try {
    const productId = req.query.id;
    const productData = await Product.findOne({ _id: productId });

    if (!productData) {
      return res.status(404).send('Product not found'); // Product not found, handle appropriately
    }

    // Get the user ID from the session
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).send('Unauthorized'); // Ensure user is logged in
    }

    // Find the cart for the current user
    let userCart = await Cart.findOne({ userId });

    // If the cart doesn't exist, create a new one
    if (!userCart) {
      userCart = new Cart({ userId, items: [] });
    }

    // Check if the product already exists in the cart
    const existingItemIndex = userCart.items.findIndex(item => item.productId.toString() === productId);

    if (existingItemIndex !== -1) {
      // If the product exists, increase its quantity
      userCart.items[existingItemIndex].quantity += 1;
      // Update subtotal for the existing quantity
      userCart.items[existingItemIndex].subTotal = userCart.items[existingItemIndex].quantity * productData.price;
    } else {
      // If the product doesn't exist, add it to the cart
      const subTotal = productData.price;
      userCart.items.push({ productId, subTotal, quantity: 1 });
    }

    // Recalculate total
    userCart.total = userCart.items.reduce((total, item) => total + item.subTotal, 0);

    // Save the cart
    await userCart.save();

    // Redirect to the cart page
    res.redirect('/cart');
  } catch (error) {
    console.error('Error adding product to cart:', error.message);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};

const deletecart = async (req, res) => {
  try {
    const { id } = req.query;
    const userId = req.session.user_id;

    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId: id } } },
      { new: true }
    ).populate('items.productId');

    if (!updatedCart) {
      return res.status(404).send('Cart not found');
    }

    res.redirect('/cart');
  } catch (error) {
    console.error('Error deleting product from cart:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};


const updateCartItemQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user_id;

    console.log('User ID:', userId);
    console.log('Product ID:', productId);
    console.log('Quantity:', quantity);

    // Ensure quantity is parsed as a number
    const parsedQuantity = parseInt(quantity);

    // Find the cart for the current user
    let userCart = await Cart.findOne({ userId });

    console.log('User Cart:', userCart);

    // If cart not found, create a new one
    if (!userCart) {
      console.log('Cart not found, creating a new one');
      userCart = new Cart({ userId, items: [] });
    }

    // Update the quantity in the cart
    const itemIndex = userCart.items.findIndex(item => item.productId.toString() === productId);
    console.log('Item Index:', itemIndex);
    
    if (itemIndex !== -1) {
      // Update quantity and subtotal
      console.log('Updating quantity and subtotal');
      console.log('Old quantity:', userCart.items[itemIndex].quantity);
      console.log('New quantity:', parsedQuantity);

      // Fetch product data to get the price
      const productData = await Product.findOne({ _id: productId });
      console.log('Product Price:', productData.price);

      // Update quantity
      userCart.items[itemIndex].quantity = parsedQuantity;

      // Update subtotal with the new quantity and price
      userCart.items[itemIndex].subTotal = productData.price * parsedQuantity;
      console.log('New subtotal:', userCart.items[itemIndex].subTotal);
    } else {
      console.log('Product not found in cart');
    }

    // Recalculate total
    console.log('Recalculating total');
    userCart.total = userCart.items.reduce((total, item) => total + item.subTotal, 0);
    console.log('New total:', userCart.total);

    // Save the updated cart
    console.log('Saving the updated cart');
    await userCart.save();

    console.log('Cart updated successfully');
    res.status(200).send('Cart updated successfully');
  } catch (error) {
    console.error('Error updating cart:', error.message);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};
const checkoutpage = async (req, res) => {
  try {
    // Get the user ID from the session
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).send('Unauthorized'); // Ensure user is logged in
    }

    // Find the cart for the current user
    const userCart = await Cart.findOne({ userId }).populate('items.productId');

    if (!userCart) {
      return res.status(404).send('Cart not found');
    }
const addressData= await addressModel.findOne({userid:userId})
    // Calculate total subtotal
    console.log(addressData)
    const totalSubtotal = userCart.total;
    const coupons = await coupon.find({ is_list: false});


    // Render the checkout page with cart and totalSubtotal
    res.render('checkout', { cart: userCart, totalSubtotal: totalSubtotal,addressData:addressData,coupons });
  } catch (error) {
    console.error('Error rendering checkout page:', error.message);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};



module.exports = {
  cart,
  addToCart,
  deletecart,
  updateCartItemQuantity,
  checkoutpage,


};

