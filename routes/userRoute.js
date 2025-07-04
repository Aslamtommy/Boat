const express = require("express");

const user_route = express();
user_route.set("view engine", "ejs");
user_route.set("views", "./views/users");
const path = require("path");
const otp = require("../config/otpGenerator");

const bodyParser = require("body-parser");

user_route.use(bodyParser.urlencoded({ extended: true }));
user_route.use(bodyParser.json());
const session = require("express-session");
const config = require("../config/config");
 user_route.use(session({ secret: config.sessionSecret }));


const { isLogin, isLogout, guest } = require("../middleware/auth");
const userController = require("../controllers/userController");
const cartcontroller = require('../controllers/cartController');
const cartmodel = require("../models/cartmodel");
const addressController=require('../controllers/addressController')
const orderController=require('../controllers/orderController')
const couponController=require('../controllers/coupenController')
const walletController=require('../controllers/walletController')
const wishlistController=require('../controllers/wishlistController')
user_route.get("/register", isLogout, guest, userController.loadRegister);

user_route.post("/register", userController.insertUser);

// user_route.get("/", isLogout, guest, userController.loginLoad);
user_route.get("/",isLogout, guest, userController.loadHome2);
user_route.get("/login", isLogout, guest, userController.loginLoad);
user_route.post("/login", isLogout, guest, userController.verifyLogin);
user_route.get("/home",isLogin, guest, userController.loadHome);
user_route.get("/logout", isLogin, userController.userLogout);
user_route.get('/forgetpassword',userController.forgetpassword)
user_route.post('/verifyemail',userController.verifyemail)
user_route.post('/verifyotp',userController.verifyotp)
user_route.post("/otp", isLogout, guest, userController.verifyOtp);
user_route.get("/resendotp/:email", isLogout, guest, userController.resendOtp);
user_route.get("/productpage", userController.productpage);

// user_route.get('/cartlist',cartcontroller.cartlist)
user_route.get('/cartpage',isLogin,cartcontroller. myCart)
user_route.get('/cart',isLogin,cartcontroller. cart)
user_route.get('/addToCart',cartcontroller. addToCart)
 user_route.get('/deletecart',cartcontroller.deletecart)
 user_route.post('/updatecart', cartcontroller.updateCartItemQuantity);


 user_route.get('/checkoutpage',isLogin,cartcontroller.checkoutpage)

 user_route.get('/ordersuccess',isLogin,orderController.ordersuccess)
 
 user_route.get('/retryorder',isLogin,orderController.retryorder)
 user_route.post('/placeorder',isLogin, orderController.placeOrder);

 user_route.post('/placeorder2',isLogin, orderController.placeOrder2);
user_route.get('/cancelorder/:orderId', isLogin,orderController.cancelorder);
user_route.get('/returnorder/:orderId', isLogin,orderController.returnorder);

user_route.get('/orderdetails',isLogin,orderController.orderdetailsUser)


 user_route.get('/useraccount',isLogin,userController.useraccount)

 user_route.post('/updateUserDetails',isLogin,userController.updatedetails)

 user_route.get('/addAddress',isLogin,addressController.addAddress)
 user_route.post('/addAddress',isLogin,addressController.addaddress)

 user_route.get('/addnewaddress',isLogin,addressController.addnewaddress)
user_route.post('/addnewaddress',addressController.submitnewaddress)

user_route.get('/editaddress',isLogin,addressController.editAddress)
user_route.post('/editaddress',addressController.editaddresspost)

user_route.get('/deleteaddress/:id',isLogin,addressController.deleteaddress)


user_route.get('/changePassword',userController.changePasswordPage)
user_route.post('/changePassword',isLogin,userController.changepassword)

user_route.post('/applycoupon',isLogin,couponController.applycoupon)
user_route.post('/cancelcoupon', isLogin, couponController.cancelcoupon);

user_route.get('/userwallet',isLogin,walletController.userwallet)
user_route.get('/wallettransaction',isLogin,walletController.walletTransaction )
user_route.get('/wishlist',isLogin,wishlistController.wishlist)

user_route.get('/addtowishlist',isLogin,wishlistController.addtowishlist)

user_route.get('/deletewishlist',wishlistController.deletewishlist)
user_route.get('/failedpayment',isLogin,orderController.failedpayment)
user_route.post('/paymentstatus',isLogin,orderController.paymentstatus)
user_route.get('/shop',isLogin,userController.shop)
user_route.get('/shopsort',isLogin,userController.sortshop)
user_route.get('/Invoice',isLogin,orderController.saveInvoice);
module.exports = user_route;
