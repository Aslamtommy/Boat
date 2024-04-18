const express = require("express");
const admin_route = express();

const session = require("express-session");
const config = require("../config/config");
admin_route.use(session({ secret: config.sessionSecret }));

const bodyParser = require("body-parser");

admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({ extended: true }));

admin_route.set("view engine", "ejs");
admin_route.set("views", "./views/admin");

const { isLogin, isLogout } = require("../middleware/adminAuth");

const adminController = require("../controllers//adminController");
const userlistController = require("../controllers//userlistController");
const categoryController = require("../controllers//categoryController");
const productController = require("../controllers//productController");
const orderController=require('../controllers/orderController')
const couponController=require('../controllers/coupenController')


admin_route.get("/", isLogout, adminController.loadLogin);

admin_route.post("/login", isLogout, adminController.verifyLogin);
admin_route.get("/adminhome", isLogin, adminController.loadDashboard);
admin_route.get("/adminLogout", isLogin, adminController.logout);

admin_route.get("/userlist", isLogin, userlistController.userList);
admin_route.get("/userblock", isLogin, userlistController.userblock);
admin_route.get("/userunblock", isLogin, userlistController.userunblock);

admin_route.get("/categories", isLogin, categoryController.categories);
admin_route.post("/categories", isLogin, categoryController.insertcategory);
admin_route.get("/editcategory", isLogin, categoryController.editcategory);
admin_route.post("/editcategory", isLogin, categoryController.updateCategory);
admin_route.get("/categoriesblock", isLogin, categoryController.blockCategory);
admin_route.get( "/categoriesunblock",isLogin,categoryController.unblockCategory);

admin_route.get("/productsList", isLogin, productController.productslist);

admin_route.get("/addproducts", isLogin, productController.addproducts);
admin_route.post("/addproduct", isLogin, productController.insertProduct);
admin_route.get("/editproduct", isLogin, productController.editproduct);
admin_route.post('/deleteimage', isLogin, productController.deleteimage);

admin_route.post("/updateproduct", isLogin, productController.updateProducts);

admin_route.get("/blockProduct", isLogin, productController.blockProduct);
admin_route.get("/unblockProduct", isLogin, productController.unBlockProduct);

admin_route.get('/orderlist',isLogin,orderController.orderlist)

admin_route.get('/orderdetails',isLogin,orderController.orderdetails)
admin_route.post('/updateStatus',isLogin,orderController.updatstatus)

admin_route.get('/couponlist',isLogin,couponController.couponlist)
admin_route.get('/addcoupon',isLogin,couponController.addcoupon)
admin_route.post('/addcoupon',isLogin,couponController.submitcoupon)
admin_route.get('/listingCoupon/:id',isLogin,couponController.changelisting)

 admin_route.post('/productsList', isLogin, productController.productOffer)
 admin_route.post('/category',isLogin, categoryController.categoryOffer)
admin_route.get('/salesreport',isLogin,productController.salesreport)
admin_route.get('/selectedReport',isLogin,productController.saleReport);
admin_route.get('/downloadPdf',productController.downloadPdf);
admin_route.get('/downloadExel',productController.downloadExcel);
admin_route.get("/*", isLogin, adminController.loadDashboard);

module.exports = admin_route;
