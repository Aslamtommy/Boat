const user = require('../models/userModel');
const Address = require('../models/addressModel');

// Render the add address page
const addAddress = async (req, res) => {
    try {
        const id = req.session.user_id;
        const userData = await user.findOne({ _id: id });

        // Pass the 'from' query parameter to the view
        const from = req.query.from || '';
        return res.render('addaddress', { userData, from });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Handle address submission
const addaddress = async (req, res) => {
    try {
        const { house, landmark, city, state, zipcode, country, from } = req.body;

        // Create a new address document
        const newAddress = new Address({
            userid: req.session.user_id,
            address: [{
                house: house,
                landmark: landmark,
                city: city,
                state: state,
                zipcode: zipcode,
                country: country
            }]
        });

        // Save the new address to the database
        await newAddress.save();

        // Redirect based on the 'from' parameter
        const redirectTo = from === 'checkout' ? '/checkoutpage' : '/useraccount';
        res.redirect(redirectTo);
    } catch (error) {
        console.error('Error adding address:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Render the add new address page
const addnewaddress = async (req, res) => {
    try {
        const id = req.session.user_id;
        const userData = await user.findOne({ _id: id });

        // Pass the 'from' query parameter to the view
        const from = req.query.from || '';
        return res.render('addaddress', { userData, from });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Handle new address submission
const submitnewaddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { house, landmark, city, state, zipcode, country, from } = req.body;

        // Create a new address object
        const newAddress = {
            house,
            landmark,
            city,
            state,
            zipcode,
            country
        };

        // Find the user's document in the Address collection
        const existingAddress = await Address.findOne({ userid: userId });

        // If the user's document exists, update the 'address' array
        if (existingAddress) {
            existingAddress.address.push(newAddress);
            await existingAddress.save();
        } else {
            // Create a new document if none exists
            const newAddressDoc = new Address({
                userid: userId,
                address: [newAddress]
            });
            await newAddressDoc.save();
        }

        // Redirect based on the 'from' parameter
        const redirectTo = from === 'checkout' ? '/checkoutpage' : '/useraccount';
        res.redirect(redirectTo);
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Edit address page
const editAddress = async (req, res) => {
    try {
        const id = req.session.user_id;
        const userData = await user.findOne({ _id: id });
        const addressData = await Address.findOne({ userid: id });
        const index = req.query.id;
        const from = req.query.from || ''; // Pass the 'from' parameter
        const address = addressData.address[index];

        res.render('editaddress', { userData, address, index, from });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Handle address deletion
const deleteaddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addressId = req.params.id;

        const userAddress = await Address.findOne({ userid: userId });
        if (userAddress) {
            await Address.updateOne(
                { userid: userId },
                { $pull: { address: { _id: addressId } } }
            );
            res.redirect('/useraccount?id=deleted');
        } else {
            res.status(404).send('Address not found');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Handle edit address submission
const editaddresspost = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addId = req.body.id;
        const { house, landmark, city, state, zipcode, country, from } = req.body;

        const result = await Address.updateOne(
            {
                userid: userId,
                'address._id': addId
            },
            {
                $set: {
                    'address.$.house': house,
                    'address.$.landmark': landmark,
                    'address.$.city': city,
                    'address.$.state': state,
                    'address.$.zipcode': zipcode,
                    'address.$.country': country
                }
            },
            { new: true }
        );

        if (result.modifiedCount > 0) {
            console.log('Update successful');
        } else {
            console.log('No matching document found or no changes made');
        }

        // Redirect based on the 'from' parameter
        const redirectTo = from === 'checkout' ? '/checkoutpage' : '/useraccount';
        res.redirect(redirectTo);
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    addAddress,
    addaddress,
    addnewaddress,
    submitnewaddress,
    deleteaddress,
    editAddress,
    editaddresspost
};