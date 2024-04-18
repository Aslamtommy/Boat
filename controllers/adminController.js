const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const order=require('../models/orderModel')
const product=require('../models/productModel')
const category=require('../models/categoryModel')
const { getDailyDataArray, getMonthlyDataArray, getYearlyDataArray } = require('../config/chartData')


const loadLogin = async (req, res) => {
  try {
    res.render("adminLogin");
  } catch (error) {
    console.log(error.message);
  }
};
const verifyLogin = async (req, res) => {
  try {
    console.log("hellooooo");
    const email = req.body.email;
    const password = req.body.password;
    const userData = await User.findOne({ email: email });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_admin === 0) {
          res.render("adminLogin", {
            message: "Email and password is incorrect",
          });
        } else {
          console.log("hellooooo");
          req.session.adminId = userData._id;

          res.render("adminPanel");
        }
      }
    } else {
      res.render("login", { message: "email and password is incorrect" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    const products = await product.find()
    const users=await User.find()
 
    const orders = await order.find()
    const categories = await category.find()
    const orderData = await order.find({ status: "delivered" }).limit(10).sort({ date: -1 })
    const topProducts=await getTopSellingProducts()


    const topCategories=await getTopSellingCategories()

    // let totalOrderPrice = 0;
    // orders.forEach(order => {
    //     totalOrderPrice += order.total || 0
    // })
    const monthlyDataArray = await getMonthlyDataArray();
    const dailyDataArray = await getDailyDataArray();
    const yearlyDataArray = await getYearlyDataArray();


    const monthlyOrderCounts = monthlyDataArray.map((item) => item.count)

    const dailyOrderCounts = dailyDataArray.map((item) => item.count)

    const yearlyOrderCounts = yearlyDataArray.map((item) => item.count)




    res.render("adminPanel",{ 
      users,topCategories,
      orders: orders, products: products, categories: categories,
      orderData, dailyOrderCounts, monthlyOrderCounts, yearlyOrderCounts,
      topProducts
    });
  } catch (error) {
    console.log(error.message);
  }
};
const logout = async (req, res) => {
  try {
   
    req.session.adminId = undefined;
  
    res.redirect("/admin");
  } catch (error) {
    console.log(error.message);
  }
};

const getTopSellingProducts = async () => {
  try {
      // Initialize productSales
      const productSales = {};

      const orders = await order.find({ status: "delivered" });
    
      if (!orders || orders.length === 0) {
        console.log("No orders found or orders array is empty.");
        return [];
    }
      // Calculate total sales for each product
      orders.forEach(order => {
          order.items.forEach(item => {
              if (productSales[item.productId]) {
                  productSales[item.productId] += item.quantity;
              } else {
                  productSales[item.productId] = item.quantity;
              }
          });
      });

  

      // Fetch product details for top products
      const productIds = Object.keys(productSales);
     

      const topProductsDetails = await product.find({ _id: { $in: productIds } });
     

      // Map product details with sales
      const topProducts = topProductsDetails.map(product => ({
          id: product._id,
          name: product.name,
          sales: productSales[product._id],
      }));
      // Sort topProducts by sales in descending order
      topProducts.sort((a, b) => b.sales - a.sales);
      

      const top10Products = topProducts.slice(0, 10); // Return only top 10 products
     

      return top10Products;
  } catch (error) {
      console.error("Error fetching top selling products:", error.message);
      return [];
  }
};


// Function to fetch top selling categories
const getTopSellingCategories = async () => {
  try {
      const orders = await order.find({ status: "delivered" })
    
      const categorySales = {};

      // Calculate total sales for each category
      orders.forEach(order => {
          order.items.forEach(item => {
            console.log('Item:', item)
              const categoryId = item.category;
          
              if (categoryId) { // Check if categoryId is defined
                  if (categorySales[categoryId]) {
                      categorySales[categoryId] += item.quantity;
                  } else {
                      categorySales[categoryId] = item.quantity;
                  }
              }
          });
      });

      // Sort categories by sales and get top 10
      const categoryIds = Object.keys(categorySales)
      const topCategoriesDetails = await category.find({ _id: { $in: categoryIds}});

      const topCategories= topCategoriesDetails.map(category => ({
          id: category._id,
          name: category.name,
          sales: categorySales[category._id],
      }));

      topCategories.sort((a,b) => b.sales-a.sales)

      return topCategories.slice(0,10)
  } catch (error) {
      console.error(error.message);
      return [];
  }
};







module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,
  logout,
};
