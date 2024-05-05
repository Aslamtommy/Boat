const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');

const wishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const userData = await User.findOne({ _id: userId });
        const wishlistData = await Wishlist.findOne({ userid: userId }).populate('products');
        console.log('wishlistdata',wishlistData)
        res.render('wishlist', { userData, wishlistData });
    } catch (error) {
        console.log(error);
        res.status(500).send('Error retrieving wishlist');
    }
};

const addtowishlist = async (req, res) => {
    try {
        const productId = req.query.id;
        const userId = req.session.user_id;

        // Find or create the user's wishlist
        let wishlist = await Wishlist.findOne({ userid: userId });
        if (!wishlist) {
            wishlist = new Wishlist({
                userid: userId,
                products: [] 
            });
        }

        // Check if the product is already in the wishlist
        if (wishlist.products.includes(productId)) {
            console.log("Product already exists in the wishlist");
            return res.redirect('/'); // Redirect to home 
        }

        // Add the product to the wishlist
        wishlist.products.push(productId);
        await wishlist.save();
        console.log("Product added to wishlist");

        return res.redirect('/wishlist');
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Failed to add product to wishlist' });
    }
};


const deletewishlist = async (req, res) => {
    try {
        const id = req.query.id;
        const wishlistDoc = await Wishlist.findOne({ userid: req.session.user_id }); // Find the wishlist document

        // Find the index of the product to delete
        const indexToDelete = wishlistDoc.products.findIndex(product => product.toString() === id.toString());
        console.log(indexToDelete);

        if (indexToDelete !== -1) {
            wishlistDoc.products.splice(indexToDelete, 1); // Remove the product from the array
            await wishlistDoc.save(); // Save the changes to the database
        } else {
            console.log("Product not found in wishlist.");
        }

        res.redirect('/wishlist');
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
};


module.exports = {
    wishlist,
    addtowishlist,
    deletewishlist
};
