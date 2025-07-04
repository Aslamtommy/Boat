const Product = require("../models/productModel");
const cart = require("../models/cartmodel");
const wishlist = require("../models/wishlistModel");
const fs = require("fs");
const categoryModel = require("../models/categoryModel");
const multer = require("multer");
const Order = require("../models/orderModel");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
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

      const { name, description, promoprice, Price, category, Stock } =
        req.body;

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
      console.log("categoryData", categoryData);

      // Handle case where category is not found
      if (!categoryData) {
        return res.status(404).json({ message: "Category not found" });
      }

      const { name, description, Price, category, Stock } = req.body;

      let updatedFields = {
        name: name,
        description: description,
        price: Price,
        category: req.body.category,
        stock: Stock,
      };

      // Check if new images were provided
      if (req.files.length > 0) {
        // Extract filenames of new images
        const newImages = req.files.map((file) => file.filename);
        // Retrieve the current product from the database
        const product = await Product.findById(id);
        //  new filenames with existing ones
        const allImages = [...product.additionalimages, ...newImages];
        updatedFields.additionalimages = allImages;
      }

      // Find the product by its ID and update its fields
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updatedFields,
        { new: true }
      ); // { new: true } ensures that the updated document is returned

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Updated product:", updatedProduct);
      res.redirect("/admin/productsList");
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).send("Internal Server Error");
    }
  });
};

const productOffer = async (req, res) => {
  try {
    const { offerPrice, originalPrice, productId } = req.body;

    const productData = await Product.findOne({ _id: productId });
    const updatedProduct = await Product.updateOne(
      { _id: productId },
      { promoprice: originalPrice, price: offerPrice }
    );
    return res.redirect("/admin/productslists");
  } catch (error) {
    console.log(error.message);
  }
};

const deleteimage = async (req, res) => {
  try {
    const index = req.body.index;
    const pdtId = req.body.id;
    const product = await Product.findById({ _id: pdtId });

    const deletePDTimage = product.additionalimages[index];
    fs.unlink(deletePDTimage, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("set");
      }
    });

    product.additionalimages.splice(index, 1);
    await product.save();
    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error.message);
  }
};

const blockProduct = async (req, res) => {
  try {
    const productid = req.query.productId;

    console.log(productid);
    const update = await Product.findByIdAndUpdate(
      { _id: productid },
      { isPublished: true }
    );

    // Remove the blocked product from the user's cart
    await cart.updateMany(
      { "items.productId": productid },
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
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // UTC +5:30
    const orderData = await Order.aggregate([
      {
        $match: {
          status: { $regex: "^delivered$", $options: "i" },
        },
      },
      {
        $group: {
          _id: { $year: "$date" },
          orders: { $push: "$$ROOT" },
        },
      },
      {
        $unwind: "$orders",
      },
      {
        $lookup: {
          from: "User",
          localField: "orders.userId",
          foreignField: "_id",
          as: "orders.user",
        },
      },
      {
        $group: {
          _id: "$_id",
          orders: { $push: "$orders" },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    if (orderData.length === 0) {
      return res.status(400).json({ success: false, message: "No orders found" });
    }

    let overallOrderAmount = 0;
    let overallDiscount = 0;
    let overallSalesCount = 0;

    orderData[0].orders.forEach((sale) => {
      overallOrderAmount += sale.total || 0;
      if (!isNaN(sale.discount)) {
        overallDiscount += sale.discount || 0;
      }
      overallSalesCount++;
    });

    return res.status(200).render("salesreport", {
      orderData: orderData[0].orders,
      overallOrderAmount: overallOrderAmount,
      overallDiscount: overallDiscount,
      overallSalesCount: overallSalesCount,
      option: undefined,
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).send("Error retrieving sales data");
  }
};

const saleReport = async (req, res) => {
  try {
    const option = req.query.option;
    const startdate = req.query.startDate;
    const enddate = req.query.endDate;
    console.log("Query Parameters:", { option, startdate, enddate });

    let Report;
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // UTC +5:30

    // Validate custom date range
    if (startdate && enddate) {
      const start = new Date(startdate);
      const end = new Date(enddate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        console.log("Invalid date range provided");
        return res.status(400).json({ error: "Invalid date range" });
      }
    }

    if (option === "All") {
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
          },
        },
        {
          $group: {
            _id: { $year: "$date" },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: -1 } },
      ]);
    } else if (startdate && enddate) {
      const start = new Date(new Date(startdate).getTime() + IST_OFFSET);
      const end = new Date(new Date(enddate).getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else if (option === "Daily") {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const startDateIST = new Date(startDate.getTime() + IST_OFFSET);
      const endDateIST = new Date(endDate.getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: startDateIST, $lte: endDateIST },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else if (option === "Month") {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      const startDateIST = new Date(startDate.getTime() + IST_OFFSET);
      const endDateIST = new Date(endDate.getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: startDateIST, $lte: endDateIST },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);
    } else if (option === "Week") {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentDay = new Date().getDate();
      const currentDayOfWeek = new Date().getDay();
      const startOfWeek = new Date(currentYear, currentMonth, currentDay - currentDayOfWeek);
      const endOfWeek = new Date(currentYear, currentMonth, currentDay + (6 - currentDayOfWeek), 23, 59, 59);
      const startOfWeekIST = new Date(startOfWeek.getTime() + IST_OFFSET);
      const endOfWeekIST = new Date(endOfWeek.getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: startOfWeekIST, $lte: endOfWeekIST },
          },
        },
        {
          $group: {
            _id: { $week: "$date" },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else {
      console.log("Invalid option provided:", option);
      return res.status(400).json({ error: "Invalid report option" });
    }

    // Calculate totals
    let overallOrderAmount = 0;
    let overallDiscount = 0;
    let overallSalesCount = 0;

    if (Report && Report.length > 0 && Report[0].orders) {
      overallSalesCount = Report[0].orders.length;
      Report[0].orders.forEach((sale) => {
        overallOrderAmount += sale.total || 0;
        if (!isNaN(sale.discount)) {
          overallDiscount += sale.discount || 0;
        }
      });
    }

    console.log("Report:", JSON.stringify(Report, null, 2));

    if (!Report || Report.length === 0 || !Report[0].orders || Report[0].orders.length === 0) {
      return res.status(400).json({ success: false, message: "No orders found" });
    }

    return res.status(200).render("salesreport", {
      date: Report[0]._id,
      orderData: Report[0].orders,
      option: option,
      overallOrderAmount: overallOrderAmount,
      overallDiscount: overallDiscount,
      overallSalesCount: overallSalesCount,
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    return res.status(500).send("Internal Server Error. Please try again later.");
  }
};
const downloadPdf = async (req, res) => {
  try {
    const { option = "Month", startDate, endDate } = req.query;
    console.log("Query Parameters:", { option, startDate, endDate });

    // Validate custom date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        console.log("Invalid date range provided");
        res.status(400).json({ error: "Invalid date range" });
        return;
      }
    }

    let Report;
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // UTC +5:30

    // Fetch orders based on the selected option or custom date range
    if (option === "All") {
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
          },
        },
        {
          $group: {
            _id: { $year: "$date" },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User", // Matches User schema
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: -1 } },
      ]);
    } else if (startDate && endDate) {
      const start = new Date(new Date(startDate).getTime() + IST_OFFSET);
      const end = new Date(new Date(endDate).getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else if (option === "Daily") {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const startDateIST = new Date(startDate.getTime() + IST_OFFSET);
      const endDateIST = new Date(endDate.getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: startDateIST, $lte: endDateIST },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else if (option === "Month") {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      const startDateIST = new Date(startDate.getTime() + IST_OFFSET);
      const endDateIST = new Date(endDate.getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: startDateIST, $lte: endDateIST },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);
    } else if (option === "Week") {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentDay = new Date().getDate();
      const currentDayOfWeek = new Date().getDay();
      const startOfWeek = new Date(currentYear, currentMonth, currentDay - currentDayOfWeek);
      const endOfWeek = new Date(currentYear, currentMonth, currentDay + (6 - currentDayOfWeek), 23, 59, 59);
      const startOfWeekIST = new Date(startOfWeek.getTime() + IST_OFFSET);
      const endOfWeekIST = new Date(endOfWeek.getTime() + IST_OFFSET);
      Report = await Order.aggregate([
        {
          $match: {
            status: { $regex: "^delivered$", $options: "i" },
            date: { $gte: startOfWeekIST, $lte: endOfWeekIST },
          },
        },
        {
          $group: {
            _id: { $week: "$date" },
            orders: { $push: "$$ROOT" },
          },
        },
        {
          $unwind: "$orders",
        },
        {
          $lookup: {
            from: "User",
            localField: "orders.userId",
            foreignField: "_id",
            as: "orders.user",
          },
        },
        {
          $group: {
            _id: "$_id",
            orders: { $push: "$orders" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } else {
      console.log("Invalid option provided:", option);
      res.status(400).json({ error: "Invalid report option" });
      return;
    }

    console.log("Report:", JSON.stringify(Report, null, 2));

    // Initialize PDF document
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="sale_report.pdf"');
    doc.pipe(res);

    // Check if Report is empty or undefined
    if (!Report || Report.length === 0 || !Report[0].orders || Report[0].orders.length === 0) {
      console.log("No orders found for the selected period");
      doc.fontSize(12).text("No orders found for the selected period.", { align: "center" });
      doc.end();
      return;
    }

    // Add title based on the option
    if (option === "All") {
      doc.text("All Sales Report", { fontSize: 17, underline: true }).moveDown();
    } else if (startDate && endDate) {
      doc.text(`Sales Report (${startDate} to ${endDate})`, { fontSize: 17, underline: true }).moveDown();
    } else if (option === "Week") {
      doc.text("Weekly Sale Report", { fontSize: 17, underline: true }).moveDown();
    } else if (option === "Month") {
      doc.text("Monthly Sale Report", { fontSize: 17, underline: true }).moveDown();
    } else if (option === "Daily") {
      doc.text("Daily Sale Report", { fontSize: 17, underline: true }).moveDown();
    }

    // Add header information
    doc
      .fontSize(22)
      .text("boAt", { align: "center" })
      .text("earbuds", { align: "center" })
      .text("kochi india", { align: "center" })
      .moveDown();

    // Create table header
    const rowHeight = 20;
    const yPos = doc.y + rowHeight / 2;
    doc
      .fontSize(12)
      .rect(10, doc.y, 800, rowHeight)
      .text("Order ID", 20, yPos)
      .text("Email", 90, yPos)
      .text("Date", 210, yPos)
      .text("Paymethod", 260, yPos)
      .text("Discount", 340, yPos)
      .text("Total", 400, yPos)
      .moveDown();

    // Loop through orders and add to PDF
    let TotalAmount = 0;
    let overallDiscount = 0;
    let overallSalesCount = 0;

    for (const group of Report) {
      for (const order of group.orders) {
        const yPos = doc.y + rowHeight / 2;
        doc
          .fontSize(10)
          .rect(10, doc.y, 800, rowHeight)
          .stroke()
          .text(order.orderId.toString(), 15, yPos)
          .text(order.email || "N/A", 80, yPos)
          .text(new Date(order.date).toLocaleDateString(), 200, yPos)
          .text(order.payMethod || "N/A", 260, yPos)
          .text(order.discount ? order.discount.toString() : "0", 360, yPos)
          .text(order.total.toString(), 400, yPos)
          .moveDown();

        TotalAmount += order.total || 0;
        overallDiscount += order.discount || 0;
        overallSalesCount++;
      }
    }

    // Add summary
    doc
      .fontSize(12)
      .text(`Total Amount: ${TotalAmount.toFixed(2)}`, { align: "right" })
      .text(`Overall Discount: ${overallDiscount.toFixed(2)}`, { align: "right" })
      .text(`Overall Sales Count: ${overallSalesCount}`, { align: "right" });

    doc.end();
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

    orders.forEach((order) => {
      worksheet.addRow([
        order.orderId.toString(),
        order.email,
        new Date(order.date).toLocaleDateString(),
        order.payMethod,
        order.discount,
        order.total.toString(),
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

async function fetchSaleReportData(option, startDate, endDate) {
  try {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // UTC +5:30
    let matchStage = { status: { $regex: "^delivered$", $options: "i" } };

    if (option === "All") {
      // No date filter for "All" option
    } else if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(new Date(startDate).getTime() + IST_OFFSET),
        $lte: new Date(new Date(endDate).getTime() + IST_OFFSET),
      };
    } else if (option === "Daily") {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      matchStage.date = {
        $gte: new Date(startDate.getTime() + IST_OFFSET),
        $lte: new Date(endDate.getTime() + IST_OFFSET),
      };
    } else if (option === "Month") {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      matchStage.date = {
        $gte: new Date(startDate.getTime() + IST_OFFSET),
        $lte: new Date(endDate.getTime() + IST_OFFSET),
      };
    } else if (option === "Week") {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentDay = new Date().getDate();
      const currentDayOfWeek = new Date().getDay();
      const startOfWeek = new Date(currentYear, currentMonth, currentDay - currentDayOfWeek);
      const endOfWeek = new Date(currentYear, currentMonth, currentDay + (6 - currentDayOfWeek), 23, 59, 59);
      matchStage.date = {
        $gte: new Date(startOfWeek.getTime() + IST_OFFSET),
        $lte: new Date(endOfWeek.getTime() + IST_OFFSET),
      };
    } else {
      throw new Error("Invalid report option");
    }

    const Report = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: option === "All" ? { $year: "$date" } :
               option === "Month" ? { year: { $year: "$date" }, month: { $month: "$date" } } :
               option === "Week" ? { $week: "$date" } :
               { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          orders: { $push: "$$ROOT" },
        },
      },
      { $unwind: "$orders" },
      {
        $lookup: {
          from: "User",
          localField: "orders.userId",
          foreignField: "_id",
          as: "orders.user",
        },
      },
      {
        $group: {
          _id: "$_id",
          orders: { $push: "$orders" },
        },
      },
      { $sort: option === "Month" ? { "_id.year": 1, "_id.month": 1 } : { _id: 1 } },
    ]);

    console.log("Fetched Report:", JSON.stringify(Report, null, 2));
    return Report[0]?.orders || [];
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
  downloadExcel,
};
