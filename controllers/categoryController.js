const category = require("../models/categoryModel");
const product=require('../models/productModel')

const categories = async (req, res) => {
  try {
    console.log('its coming to category page')
    const Category = await category.find({});
    const error = req.query.error; // Extract the error message from query parameter
   return res.render("categories", { Category, error });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("categories", { error: "Internal server error" });
  }
};
const insertcategory = async (req, res) => {
  try {
    console.log('its coming to insert category page')
    const existingCategory = await category.findOne({ name: req.body.productname });

    if (existingCategory) {
      return res.redirect("/admin/categories?error=Category%20with%20the%20same%20name%20already%20exists.");
    }

    const newCategory = new category({
      name: req.body.productname,
      description: req.body.description,
      isBlocked: 0,
    });

    const categoryData = await newCategory.save();

    if (categoryData) {
      return res.redirect("/admin/categories");
    } else {
      return res.status(500).render("categories", { error: "Failed to add category" });
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).render("categories", { error: "Internal server error" });
  }
};


const editcategory = async (req, res) => {
  try {
    console.log('its coming to edit category page')
    const id = req.query.id;
    const categoryData = await category.findOne({ _id: id });
    const error = req.query.error; // Extract the error message from query parameter
    res.render("editcategory", { category: categoryData, error });
    console.log(categoryData);
  } catch (error) {
    console.log(error.message);
    res.status(500).render("editcategory", { error: "Internal server error" });
  }
};

const updateCategory = async (req, res) => {
  try {
    console.log('its coming to update category page')
    const existingCategory = await category.findOne({ name: req.body.productname });
    if (existingCategory && existingCategory._id.toString() !== req.body.id) {
      const errorMessage = encodeURIComponent("Category with the same name already exists.");
      return res.redirect(`/admin/editcategory?id=${req.body.id}&error=${errorMessage}`);
    }

    const categoryData = await category.findByIdAndUpdate(req.body.id, {
      $set: { name: req.body.productname, description: req.body.description },
    });

    console.log(categoryData);
    res.redirect("/admin/categories");
  } catch (error) {
    console.log(error.message);
    return res.status(500).send("Internal server error."); 
  }
};


const blockCategory = async (req, res) => {
  try {
    const userdata = req.query._id;
    const data = await category.findByIdAndUpdate(userdata, {
      isBlocked: true,
    });
    res.redirect("/admin/categories");
  } catch (error) {
    console.log(error.message);
  }
};

const unblockCategory = async (req, res) => {
  try {
    const userdata = req.query._id;
    const data = await category.findByIdAndUpdate(userdata, {
      isBlocked: false,
    });
    res.redirect("/admin/categories");
  } catch (error) {
    console.log(error.message);
  }
};

const categoryOffer = async (req, res) => {
  try {
    const { offerPercentage, category } = req.body;

    // Validate offerPercentage
    if (isNaN(offerPercentage)) {
      return res.status(400).send("Invalid offer percentage");
    }
    // Parse offerPercentage to ensure it's a valid number
    const parsedPercentage = parseFloat(offerPercentage);
    console.log(parsedPercentage, category);
    const productData = await product.find({ category }).populate('category'); // Assuming category is the correct field name
    console.log('Product Data:', productData); // Log the product data to see if it's empty or contains data
    // Check if productData is empty
    if (productData.length === 0) {
      console.log('Product data is empty');
      return res.status(404).send("No products found for the specified category");
    }
   
    for (let i = 0; i < productData.length; i++) {
      // Log each iteration
      console.log(`Processing product ${i + 1}: ${productData[i].name}`);
      // Calculate percentageAmount only if offerPercentage is a valid number
      const percentageAmount = parsedPercentage * productData[i].price / 100;
      productData[i].promoprice = parseInt(productData[i].price);
      productData[i].price -= parseInt(percentageAmount);
      await productData[i].save();
    }
    console.log('Offer applied successfully');
    res.redirect('/admin/categories');
  } catch (error) {
    console.log('Error:', error.message);
    res.status(500).send("Internal Server Error");
  }
}


module.exports = {
  categories,
  insertcategory,
  editcategory,
  updateCategory,
  blockCategory,
  unblockCategory,
  categoryOffer
};
