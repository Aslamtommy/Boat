const User = require("../models/userModel");
const Product = require("../models/productModel");
const bcrypt = require("bcrypt");
const{ sendMail} = require("../config/nodemailer");
const Otp = require("../models/otpModel");
const otpGenerator = require("../config/otpGenerator");
const product = require("../models/productModel");
const Address=require('../models/addressModel')
const order=require('../models/orderModel')
const category=require('../models/categoryModel')

const nodemailer = require('nodemailer');
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.email,
    pass: process.env.pass
  }
});


const securepassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const loadRegister = async (req, res) => {
  console.log("get register page");

  try {
    res.render("page-login-register");
  } catch (error) {
    console.log(error.message);
  }
};

const insertUser = async (req, res) => {
  req.session.userdetails = req.body;
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.render("page-login-register", {
        message: "User with this email already exists",
      });
    }
    const spassword = await securepassword(req.session.userdetails.Password);
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.Phone,
      password: spassword,
      is_admin: 0,
    });
    console.log("datas", user);
    const email = req.session.userdetails.email;

    const otp = await otpGenerator(email);
   sendMail(email, otp);
    const userData = await user.save();
    if (userData) {
      res.render("otp", { email: req.body.email });
    } else {
      res.render("registration", {
        message: "your registration has beed failed",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

// login user methods started

const loginLoad = async (req, res) => {
  try {
    // Retrieve isBlocked from the session, default to false if not set
    const isBlocked = req.session.isBlocked || false;
    // Define the message as null initially
    const message = null;
    res.render("login", { isBlocked, message });
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const isLoggedIn = req.session.user_id ? true : false;
    
    const userData = await User.findOne({ email: email });
    
    if (userData) {
      // Check if the user is blocked
      if (userData.isBlocked) {
      
        req.session.isBlocked = true;
        return res.redirect("/login"); // Redirect to login page
      }

      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        req.session.user_id = userData._id;
        req.session.email_id = userData.email;
    
        // Store the user's email in the session
        return res.redirect("/home");
      } else {
        // Pass a message to the login template for incorrect email or password
        const message = "Email or password is incorrect";
        const isBlocked = req.session.isBlocked || false; // Ensure isBlocked is defined
        return res.render("login", { message, isBlocked });
      }
    } else {
     
      const message = "Email or password is incorrect";
      const isBlocked = req.session.isBlocked || false; 
      return res.render("login", { message, isBlocked });
    }
  } catch (error) {
    console.log(error.message);
   
    const message = "An error occurred. Please try again later.";
    const isBlocked = req.session.isBlocked || false; 
    return res.render("login", { message, isBlocked });
  }
};


const loadHome = async (req, res) => {
  try {
    const isLoggedIn = req.session.user_id ? true : false;
    console.log(req.session.user_id);
    const productData = await Product.find({}).populate("category");
    res.render("home", { product: productData,isLoggedIn });
  } catch (error) {
    console.log(error.message);
  }
};

const loadHome2 = async (req, res) => {
  try {
    const isLoggedIn = req.session.user_id ? true : false;
    console.log(req.session.user_id);
    const productData = await Product.find({}).populate("category");
    res.render("home", { product: productData,isLoggedIn });
  } catch (error) {
    console.log(error.message);
  }
};

const  userLogout = async (req, res) => {
  try {
    // Clear session variables
    req.session.user_id = undefined;
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      } else {
        console.log('Session destroyed successfully');
      }
    });
    res.redirect('/login');
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).send('Error logging out');
  }
};


const verifyOtp = async (req, res) => {
  try {
    const otp = req.body.otp;
    console.log(otp);
    const email = req.session.userdetails.email;
    console.log(email);

    const otpData = await Otp.findOne({ email: email, otp: otp });
    console.log("otpData:", otpData);
    if (otpData) {
      res.redirect("/login");
    } else {


      res.status(400).render("otp", { email: req.session.userdetails.email,alert: "Invalid otp" });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const resendOtp = async (req, res) => {
  try {
    const email = req.params.email;
    const otp = await otpGenerator(email);
    sendMail(email, otp);
    return res.status(200).json({ message: "new otp sent successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const productpage = async (req, res) => {
  try {
    const productid = req.query.id;
    console.log('product id',productid)
    const productdetail = await Product.findById({ _id: productid });

    res.render("productpage", { product: productdetail });
  } catch (error) {
    console.log(error);
  }
};




const useraccount = async (req, res) => {
  try {
     
      const userId = req.session.user_id; 

      // Fetch the user from the database based on the user ID
      const userData = await User.findById(userId);
      const addressData = await Address.findOne({ userid: userId });

      // Paginate orders
      const page = req.query.page || 1; // Get page number from query parameters, default to 1
      const limit = 5; // Set the number of orders per page

      // Fetch orders for the user and sort by date in descending order
      const orders = await order.find({ userId: userId })
          .sort({ date: -1 })
          .limit(limit)
          .skip((page - 1) * limit);

      // Calculate total number of orders for pagination
      const totalOrders = await order.countDocuments({ userId: userId });
      const totalPages = Math.ceil(totalOrders / limit);

      // Render the user account page and pass the user's data, address data, orders, and pagination variables
      res.render('useraccount', {
          userData,
          addressData,
          orders,
          currentPage: page,
          totalPages
      });
  } catch (error) {
      console.error('Error rendering user account page:', error.message);
      res.status(500).send('Internal Server Error');
  }
};

const changepassword = async (req, res) => {
  try {
    const userId = req.session.user_id
    const password = req.body.password;
         // Paginate orders
         const page = req.query.page || 1; // Get page number from query parameters, default to 1
         const limit = 5; // Set the number of orders per page
   
    console.log('entered password',)
    const email = req.session.email_id; // Use session variable set during login
    console.log('Changing password for email:', email);

    const userData = await User.findOne({ email: email });

    // if (!userData) {
    //   console.log("User not found");
    //   return res.status(404).send("User not found");
    // }

    const NewPassword = await securepassword(password);
    console.log('New hashed password:', NewPassword);

    await User.findByIdAndUpdate(userData._id, { $set: { password: NewPassword } });
    console.log('Password changed successfully for user:', userData._id);

    // Fetch address data separately
    const addressData = await Address.findOne({ userid: userData._id });
    const orders = await order.find({ userId: userId })
    .sort({ date: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
    const totalOrders = await order.countDocuments({ userId: userId });
    const totalPages = Math.ceil(totalOrders / limit);
    return res.render('useraccount', { message3: "Password Changed Successfully", isLoggedIn: req.session.user_id ? true : false, userData, orders,addressData, currentPage: page,
    totalPages });
  } catch (error) {
    console.log('Error changing password:', error.message);
    return res.status(500).send("Internal Server Error");
  }
};


const updatedetails = async (req, res) => {
  try {
    console.log('working')
      const { name, email, mobile } = req.body
      const updateddetails = await User.updateOne({ _id: req.session.user_id }, { name: name, email: email, mobile: mobile })

      if (updateddetails) {
          res.redirect('/useraccount')
      }
  } catch (error) {
      console.log(error.message);
  }
}

const changePasswordPage = async (req, res) => {
  try {
      res.render('newpass')
  } catch (error) {
      console.log(error.message);
  }
}


const  forgetpassword = async (req, res) => {
  try {
      res.render('forgetpass')

  } catch (error) {
      console.log(error.message);
  }
}

const verifyemail = async (req, res) => {
  try {
      const Email = req.body.email
      req.session.email_id = Email
      const userData = await User.findOne({ email: Email })
      console.log('userdata',userData)

      if (userData) {
        const  Otps =await otpGenerator(Email)

          const mailOptions = {
              from: 'mhdrizwanpkd@gmail.com',
              to: Email,
              subject: 'Your OTP for Verification',
              text: `Your OTP is: ${Otps}`
          };
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                  console.error('Error sending email:', error);
                  return res.render('verification', { message: `Error sending otp ${Otps}` })
              }
              console.log('here',Otps)
              const message = "Verified...Otp sent successfully"
              res.status(200).json(message)
          });


      }
      if (!userData) {
          const message = "This Email is not Registered"
          res.status(200).json(message)
      }

  } catch (error) {
      console.log(error.message);
  }
}

const verifyotp = async (req, res) => {
  try {
    const userProvidedOtp = req.body.otp;
    const email = req.session.email_id; // Assuming you store the email in the session during OTP generation

    // Find the user in the database based on the email
    const userData = await User.findOne({ email });

    if (!userData) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    // Now, you need to fetch the OTP stored in your database for this user
    const storedOtpData = await Otp.findOne({ email }); // Assuming you have a model named Otp and store the OTP with the user's email

    if (!storedOtpData) {
      return res.status(400).json({ success: false, message: 'OTP not found' });
    }

    const storedOtp = storedOtpData.otp; // Assuming the OTP is stored in the 'otp' field

    // Compare the user-provided OTP with the stored OTP
    if (storedOtp === userProvidedOtp) {
      return res.status(200).json({ success: true, successmessage: 'OTP success' });
    } else {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
const shop = async (req, res) => {
  try {
    let productData;
    const searchQuery = req.query.search;

    // Check if there is a search query
    if (searchQuery) {
      // If there's a search query, perform the search
      productData = await Product.find({
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      }).populate("category");
    } else {
      // If there's no search query, fetch all products
      productData = await Product.find({}).populate("category");
    }

    // Fetch all categories that are not blocked
    const categoryData = await category.find({ isBlocked: 0 });

    // Filter out products belonging to blocked categories
    const filteredProductData = productData.filter(product => {
      return categoryData.some(category => category._id.equals(product.category._id));
    });

    // Fetch user data using the session user ID
    const userId = req.session.user_id; // Assuming user ID is stored in session
    const userData = await User.find({ _id: userId });

    // Render the shop page with filtered product, category, and user data
    res.render('shop', {
      products: filteredProductData,
      userData,
      category: categoryData,
      searchQuery // Pass the search query to the template for display purposes
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
}



const sortshop = async (req, res) => {
  try {
    
    const productData = await product.find({}).populate("category");

    // Fetch categories which are not blocked
    const categoryData = await category.find({ is_block: 0 });

    console.log("Query option:", req.query.option);

    if (req.query.option) {
      const option = req.query.option;
;

      if (option === 'Low to High') {
        productData.sort((a, b) => a.price - b.price);
      } else if (option === 'High to Low') {
        productData.sort((a, b) => b.price - a.price);
      }
    }

    res.render('shopsort', { products: productData, category: categoryData });
  } catch (error) {
    // Catch and log any errors that occur during execution
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  loadRegister,
  insertUser,
  loginLoad,
  loadHome,
  verifyLogin,
  userLogout,
  verifyOtp,
  resendOtp,
  productpage,
  useraccount,
  updatedetails,
  changePasswordPage,
  changepassword,
  forgetpassword,
  verifyotp ,
  verifyemail,
  shop,
  sortshop,
  loadHome2

};


