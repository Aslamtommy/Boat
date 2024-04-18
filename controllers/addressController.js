const user = require('../models/userModel')
const Address=require('../models/addressModel')



const addAddress = async (req, res) => {
    try {
        const id = req.session.user_id
        const userData = await user.findOne({ _id: id })

        const isLoggedIn = req.session.user_id ? true : false;

        return res.render('addaddress', { isLoggedIn, userData })
    } catch (error) {
        console.log(error.message);
    }
}

const addaddress = async (req, res) => {
    try {
      const { house, landmark, city, state, zipcode, country } = req.body;
  
      // Create a new address document
      const newAddress = new Address({
        userid: req.session.user_id, 
        address: {
          house: house,
          landmark: landmark,
          city: city,
          state: state,
          zipcode: zipcode,
          country: country
        }
      });
  
      // Save the new address to the database
      await newAddress.save();
  
     
      res.redirect('/useraccount');
    } catch (error) {
      console.error('Error adding address:', error.message);
      res.status(500).send('Internal Server Error');
    }
  }




const addnewaddress = async (req, res) => {
    try {
        const id = req.session.user_id
        const userData = await user.findOne({ _id: id })

        const isLoggedIn = req.session.user_id ? true : false;

        return res.render('addaddress', { isLoggedIn, userData })
    } catch (error) {
        console.log(error.message);
    }
}



const submitnewaddress = async (req, res) => {
    try {
        const userId = req.session.user_id;

        // Create a new address object from the request body
        const newAddress = {
            house: req.body.house,
            landmark: req.body.landmark,
            city: req.body.city,
            state: req.body.state,
            zipcode: req.body.zipcode,
            country: req.body.country
        };

        // Find the user's document in the Address collection
        const existingAddress = await Address.findOne({ userid: userId });

        // If the user's document exists, update the 'address' array
        if (existingAddress) {
            existingAddress.address.push(newAddress);
            await existingAddress.save();
        } else {
          
            console.log("User document not found");
        
        }

        return res.redirect('/useraccount');
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

const editAddress = async (req, res) => {
    try {
        const id = req.session.user_id;
        const userData = await user.findOne({ _id: id });
        const addressData=await Address.findOne({userid:id})
        const index = req.query.id;
        const address = addressData.address[index]
       
        const isLoggedIn = req.session.user_id ? true : false;
        res.render('editaddress', { isLoggedIn, userData,address });

    } catch (error) {
        console.log(error.message);
    }
};


const deleteaddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addressId = req.params.id;

        const userAddress = await Address.findOne({ userid: userId });
        if(userAddress){
            const deletedata = await Address.updateOne({userid:userId},
                {$pull:{'address':{_id:addressId}}})

            res.redirect('/useraccount?id=deleted')
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};



const editaddresspost = async (req, res) => {
    try {   
        const userId = req.session.user_id;
        const addId= req.body.id;
        const {house,landmark,city,state,zipcode,country} = req.body;

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
            },{new:true}
        );

        if (result) {
            console.log('Update successful');
    
            res.redirect('/useraccount');
        } else {
            console.log('No matching document found or no changes made');
            
            res.redirect('/useraccount');
        }
    } catch (error) {
        console.log(error.message);
        // Handle the error, redirect or send an error response
        res.redirect('/useraccount');
    }
};




module.exports={
  addAddress,
  addaddress,
  addnewaddress ,
  submitnewaddress,
  deleteaddress,
  editAddress,
  editaddresspost

}