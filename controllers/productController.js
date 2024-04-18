const Product = require("../models/productModel");
const cart=require('../models/cartmodel')
const wishlist=require('../models/wishlistModel')
const fs=require('fs')
const categoryModel = require("../models/categoryModel");
const multer = require("multer");
const Order=require('../models/orderModel')
const PDFDocument = require('pdfkit')
const ExcelJS = require('exceljs');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

var upload = multer({
  storage: storage,
}).array("images", 5);

const productslist = async (req, res) => {
  try {
      const productData = await Product.find({}).populate("category");
    
       // Optional: Log product data for debugging
      res.render("productslist", { products: productData });
  } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
  }
};

const addproducts = async (req, res) => {
  try {
    const categoryData = await categoryModel.find({});
    return res.render("addproducts", { category: categoryData });
  } catch (error) {
    console.log(error.message);
  }
};
const insertProduct = async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }

    try {
      console.log("Request body:", req.body); // Log the entire request body

      const { name, description, promoprice, Price, category, Stock } = req.body;

      const images = req.files.map((file) => file.filename);

      // Assuming you're using categoryModel to find the category ID
      const categoryData = await categoryModel.findOne({ name: category });

      if (!categoryData) {
        return res.status(404).send("Category not found");
      }

      const product = new Product({
        name: name,
        description: description,
        promoprice: promoprice,
        price: Price,
        category: categoryData._id,
        stock: Stock,
        additionalimages: images,
      });

      await product.save();
      console.log("New product:", product);
      res.redirect("/admin/productsList");
    } catch (error) {
      console.error("Error saving product:", error);
      res.status(500).send("Internal Server Error");
    }
  });
};


const editproduct = async (req, res) => {
  try {
    const productid = req.query._id;
    const productData = await Product.findOne({ _id: productid });
    const categoryData = await categoryModel.find({});
    res.render("editproduct", { category: categoryData, productData });
  } catch (error) {
    console.log(error);
  }
};
const updateProducts = async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }

    try {
      const id = req.body.id;
      console.log(id);

      // Find the category by its name
      
      const categoryData = await categoryModel.findById(req.body.category);

      console.log('categoryData',categoryData)
   


      // Handle case where category is not found
      if (!categoryData) {
        return res.status(404).json({ message: "Category not found" });
      }

      const { name, description, Price, category,Stock } = req.body;
    

      let updatedFields = {
        name: name,
        description: description,
        price: Price,
        category: req.body.category,
        stock: Stock,
      };

      // Check if new images were provided
      if (req.files.length > 0) {
        const images = req.files.map((file) => file.filename);
        updatedFields.additionalimages = images;
      }

      // Find the product by its ID and update its fields
      const product = await Product.findByIdAndUpdate(
        id,
        updatedFields,
        { new: true }
      ); // { new: true } ensures that the updated document is returned

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Updated product:", product);
      res.redirect("/admin/productsList");
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).send("Internal Server Error");
    }
  });
};



const productOffer = async (req, res) => {
  try {
      const { offerPrice, originalPrice, productId } = req.body
      

      const productData = await Product.findOne({ _id: productId })
      const updatedProduct = await Product.updateOne({ _id: productId }, { promoprice: originalPrice, price: offerPrice })
      return res.redirect('/admin/productslists')


  } catch (error) {
      console.log(error.message);
  }
}


const deleteimage = async(req,res)=>{
  try {
      
      const index = req.body.index
      const pdtId = req.body.id
      const product = await Product.findById({_id:pdtId})
      
      const deletePDTimage = product.additionalimages[index];
      fs.unlink(deletePDTimage,(err)=>{
          if (err) {
              console.error(err.message)
          } else {
              console.log('set');
          }
      })
    
      product.additionalimages.splice(index, 1);
       await product.save()
      res.status(200).json({success:true})
  } catch (error) {
      console.log(error.message);
   }
}

const blockProduct = async (req, res) => {
  try {
    const productid = req.query.productId;

    console.log(productid);
    const update = await Product.findByIdAndUpdate(
      { _id: productid },
      { isPublished: true }
    );

    // Remove the blocked product from the user's cart
    await cart.updateMany({ 'items.productId': productid },
      { $pull: { items: { productId: productid } } }
    );

 // Remove the blocked product from all wishlists
 await wishlist.updateMany(
  { products: productid },
  { $pull: { products: productid } }
);

    res.redirect("/admin/productsList");
  } catch (error) {
    console.log(error.message);
  }
};

const unBlockProduct = async (req, res) => {
  try {
    const productid = req.query.productId;

    console.log(productid);
    const update = await Product.findByIdAndUpdate(
      { _id: productid },
      { isPublished: false }
    );
    res.redirect("/admin/productsList");
  } catch (error) {
    console.log(error.message);
  }
};


const salesreport = async (req, res) => {
  try {
    const orderData = await Order.aggregate([
      {
        $match: {
          status: "delivered",
        }
      },
      {
        $group: {
          _id: { $year: "$date" },
          orders: { $push: "$$ROOT" }
        }
      },
      {
        $unwind: "$orders"
      },
      {
        $lookup: {
          from: "User",
          localField: "orders.userId",
          foreignField: "_id",
          as: "orders.user"
        }
      },
      {
        $group: {
          _id: "$_id",
          orders: { $push: "$orders" }
        }
      },
      { $sort: { "_id": -1 } }
    ]);

    if (orderData.length === 0) {
      return res.status(400).json({ success: false, message: "something went wrong" });
    }

    // Calculate overall order amount, discount, and sales count
    let overallOrderAmount = 0;
    let overallDiscount = 0;
    let overallSalesCount = 0;

    orderData[0].orders.forEach(sale => {
      overallOrderAmount += sale.total;
      // Check if the discount value is a valid number
      if (!isNaN(sale.discount)) {
        overallDiscount += sale.discount;
      }
      overallSalesCount++;
    });

    // Pass data to the frontend
    const option = undefined;
    return res.status(200).render('salesreport', {
      orderData: orderData[0].orders,
      overallOrderAmount: overallOrderAmount,
      overallDiscount: overallDiscount,
      overallSalesCount: overallSalesCount,
      option: option
    });
   
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).send('Error retrieving sales data');
  }
};


const saleReport = async (req, res) => {
  try {

    console.log('its cominggg')
   
    const option = req.query.option;

    let report;
        const startdate = req.query.startDate;
        const enddate = req.query.endDate;

        if (startdate && enddate) { // Check if custom date range is provided
            Report = await Order.aggregate([
                {
                    $match: {
                        status: "delivered",
                        date: { $gte: new Date(startdate), $lte: new Date(enddate) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        orders: { $push: "$$ROOT" }
                    }
                },
                {
                    $unwind: "$orders"
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "orders.userId",
                        foreignField: "_id",
                        as: "orders.user"
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        orders: { $push: "$orders" }
                    }
                },
                { $sort: { "_id": 1 } }
            ])}
      
   
  else if (option == 'Daily') {
      const today = new Date();
      
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0); // Beginning of the current day
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59); // End of the current day
    
      var Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        },
      
        { $sort: { "_id": 1 } }
      ]);
    } else if (option == 'Month') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startDate = new Date(currentYear, currentMonth, 1); // First day of the current month
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        }, {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);
    } else if (option == 'Week') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentDay = new Date().getDate(); // Get the current day of the month
      const currentDayOfWeek = new Date().getDay(); // Get the current day of the week (0 for Sunday, 1 for Monday, ..., 6 for Saturday)

      const startOfWeek = new Date(currentYear, currentMonth, currentDay - currentDayOfWeek); // Sunday of the current week

      // Calculate the end date for the current week
      const endOfWeek = new Date(currentYear, currentMonth, currentDay + (6 - currentDayOfWeek), 23, 59, 59); // Saturday of the current week, with time set to end of day

      // Construct the start and end dates for the current month
      const startDate = new Date(currentYear, currentMonth, 1); // First day of the current month
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59); // Last day of the current month, with time set to end of day

      Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            $or: [
              {
                date: {
                  $gte: startDate,
                  $lte: endDate
                }
              },
              {
                date: {
                  $gte: startOfWeek,
                  $lte: endOfWeek
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: { $week: "$date" },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    }
  
    let overallOrderAmount = 0;
    let overallDiscount = 0;
    let overallSalesCount = Report[0].orders.length;

    if (report && report.length > 0) {
      overallSalesCount = report[0].orders.length;

      report[0].orders.forEach(sale => {
        overallOrderAmount += sale.total;
        if (!isNaN(sale.discount)) {
          overallDiscount += sale.discount;
        }
      });
    }

    console.log("Report:", Report)
    if (Report.length == 0) {
      return res.status(400).json({ success: true, message: "something went Wroung" })
    }
    return res.status(200).render('salesreport', { date: Report[0]._id,date: Report[0]._id, orderData: Report[0].orders, option: option, overallOrderAmount: overallOrderAmount, overallDiscount: overallDiscount, overallSalesCount: overallSalesCount });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error. Please try again later.");
  }
}


const downloadPdf = async (req, res) => {
  try {
    // Fetch delivered orders from the database

    let option = req.query.option || 'Month'
    if (option == 'Daily') {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0); // Beginning of the current day
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59); // End of the current day
      var Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    } else if (option == 'Month') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startDate = new Date(currentYear, currentMonth, 1); // First day of the current month
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        }, {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);
    } else if (option == 'Week') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentDay = new Date().getDate(); // Get the current day of the month
      const currentDayOfWeek = new Date().getDay(); // Get the current day of the week (0 for Sunday, 1 for Monday, ..., 6 for Saturday)

      const startOfWeek = new Date(currentYear, currentMonth, currentDay - currentDayOfWeek); // Sunday of the current week

      // Calculate the end date for the current week
      const endOfWeek = new Date(currentYear, currentMonth, currentDay + (6 - currentDayOfWeek), 23, 59, 59); // Saturday of the current week, with time set to end of day

      // Construct the start and end dates for the current month
      const startDate = new Date(currentYear, currentMonth, 1); // First day of the current month
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59); // Last day of the current month, with time set to end of day

      Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            $or: [
              {
                date: {
                  $gte: startDate,
                  $lte: endDate
                }
              },
              {
                date: {
                  $gte: startOfWeek,
                  $lte: endOfWeek
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: { $week: "$date" },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    }

    const doc = new PDFDocument();

    // Set the Content-Type header to display the PDF in the browser
    res.setHeader("Content-Type", "application/pdf");
    // Set Content-Disposition to suggest a filename
    res.setHeader("Content-Disposition", 'inline; filename="sale_report.pdf"');
    // Pipe the PDF content to the response stream
    doc.pipe(res);
    if (option == 'Week') {
      doc.text("Weekly Sale Report", { fontSize: 17, underline: true }).moveDown();
    } else if (option == 'Month') {
      doc.text("Monthly Sale Report", { fontSize: 17, underline: true }).moveDown();
    } else if (option == 'Year') {
      doc.text("Yearly Sale Report", { fontSize: 17, underline: true }).moveDown();
    }
    // Add content to the PDF (based on your sale report structure)
    doc
      .fontSize(22)
      .text("boAt", { align: "center" })
      .text("earbuds", { align: "center" })
      .text("kochi india", { align: "center" })
      

    const rowHeight = 20; // You can adjust this value based on your preference

    // Calculate the vertical position for each line of text in the row
    const yPos = doc.y + rowHeight / 2;

    // Create a table header
    doc
      .fontSize(12)
      .rect(10, doc.y, 800, rowHeight) // Set a rectangle for each row
      .text("Order ID", 20, yPos)
      .text("email", 90, yPos)
      .text("date", 210, yPos)
      .text("paymethod", 260, yPos)
      .text("discount", 340, yPos)
      .text("total", 400, yPos)
      
    doc.moveDown();

    // Loop through fetched orders and products
    for (const order of Report[0].orders) {
      // Set a fixed height for each row
      const rowHeight = 20; // You can adjust this value based on your preference

      // Calculate the vertical position for each line of text in the row
      const yPos = doc.y + rowHeight / 2;

      // Add the sale report details to the PDF table
      doc
        .fontSize(10)
        .rect(10, doc.y, 800, rowHeight) // Set a rectangle for each row
        .stroke() // Draw the rectangle
        .text(order.orderId.toString(), 15, yPos)
        .text(order.email,80, yPos)
        .text(new Date(order.date).toLocaleDateString() ,200, yPos)
        .text(order.payMethod.toString(), 260, yPos)
        .text(order.discount, 360, yPos)
        .text(order.total.toString(), 400, yPos)

      // Move to the next row
      doc.moveDown();
    }
  
    let TotalAmount = 0;
    let overallDiscount = 0;
    let overallSalesCount = 0;

    if (Report && Report.length > 0 && Report[0].orders) {
      overallSalesCount = Report[0].orders.length;

      Report[0].orders.forEach(order => {
        TotalAmount += order.total || 0;
        overallDiscount += order.discount || 0;
      });
    }




// Pipe the PDF content to the response stream



    // Add overall summary to the PDF
    doc.fontSize(12)
    .text(`Overall Order Amount: ${TotalAmount.toFixed(2)}`, { align: "right" })
    .text(`Overall Discount: ${overallDiscount.toFixed(2)}`, { align: "right" })
    .text(`Overall Sales Count: ${overallSalesCount}`, { align: "right" });




    doc.end();
    // End the document
   
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const downloadExcel = async (req, res) => {
  try {
    const option = req.query.option;
    // Fetch your sale report data from MongoDB, similar to what you're doing for the PDF download
    const orders = await fetchSaleReportData(option);

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sale Report");

    // Add headers to the worksheet with Product Name
    worksheet.addRow([
      "Order ID",
      "Email",
      "Date",
      "Payment Method",
      "Discount",
      "Total",
     
    ]); 
   

    // Add data to the worksheet
    
    orders.forEach(order => {
      worksheet.addRow([
        order.orderId.toString(),
        order.email,
        new Date(order.date).toLocaleDateString(),
        order.payMethod,
        order.discount,
        order.total.toString()
      ]);
    });

    // Set headers for the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sale_report.xlsx"
    );

    // Write the Excel workbook to the response
    await workbook.xlsx.write(res);

    // End the response
    res.end();
  } catch (error) {
    console.error("Error downloading Excel:", error);
    res.status(500).send("Internal Server Error");
  }
};

async function fetchSaleReportData(option) {
  try {
    // Fetch the orders from the MongoDB database
    if (option == 'Daily') {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0); // Beginning of the current day
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59); // End of the current day
      var Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    } else if (option == 'Month') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startDate = new Date(currentYear, currentMonth, 1); // First day of the current month
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        }, {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);
    } else if (option == 'Week') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentDay = new Date().getDate(); // Get the current day of the month
      const currentDayOfWeek = new Date().getDay(); // Get the current day of the week (0 for Sunday, 1 for Monday, ..., 6 for Saturday)

      const startOfWeek = new Date(currentYear, currentMonth, currentDay - currentDayOfWeek); // Sunday of the current week

      // Calculate the end date for the current week
      const endOfWeek = new Date(currentYear, currentMonth, currentDay + (6 - currentDayOfWeek), 23, 59, 59); // Saturday of the current week, with time set to end of day

      // Construct the start and end dates for the current month
      const startDate = new Date(currentYear, currentMonth, 1); // First day of the current month
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59); // Last day of the current month, with time set to end of day

      Report = await Order.aggregate([
        {
          $match: {
            status: "delivered",
            $or: [
              {
                date: {
                  $gte: startDate,
                  $lte: endDate
                }
              },
              {
                date: {
                  $gte: startOfWeek,
                  $lte: endOfWeek
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: { $week: "$date" },
            orders: { $push: "$$ROOT" }
          }
        },
        {
          $unwind: "$orders"
        },
        {
          $lookup: {
            from: "users",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user"
          }
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" }
          }
        },
        { $sort: { "_id": 1 } }
      ]);
    }
    return  Report[0].orders;
  } catch (error) {
    console.error("Error fetching sale report data:", error);
    throw error;
  }
}




module.exports = {
  productslist,
  addproducts,
  insertProduct,
  editproduct,
  updateProducts,
  deleteimage,
  blockProduct,
  unBlockProduct,
  salesreport,
  productOffer,
  saleReport,
  downloadPdf,
  downloadExcel

 
};
