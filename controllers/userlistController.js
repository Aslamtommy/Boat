const User=require('../models/userModel')

const userList = async (req, res) => {
    try {
        const page = req.query.page || 1; // Get page number from query parameters, default to 1
        const limit = 10; // Set the number of users per page

        // Count total number of users
        const totalUsers = await User.countDocuments();

        // Calculate total pages
        const totalPages = Math.ceil(totalUsers / limit);

        // Paginate users
        const user= await User.find()
            .limit(limit)
            .skip((page - 1) * limit);

        res.render('userList', { user, totalPages, currentPage: page });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Error retrieving user list');
    }
};


const userblock=async(req,res)=>{
    try {
        const userdata=req.query._id
        console.log(userdata)
        const data=await User.findByIdAndUpdate(userdata,{isBlocked:true})
        console.log('blocked user',data)
        res.redirect('/admin/userlist')
    } catch (error) {
        console.log(error.message)
    }
}

const userunblock=async(req,res)=>{
    try {
        const userdata=req.query._id
        console.log(userdata)
        const data=await User.findByIdAndUpdate(userdata,{isBlocked:false})
        console.log("unblock user",data)
        res.redirect('/admin/userlist')
    } catch (error) {
        console.log(error.message)
    }
}


module.exports={
userList,
userblock,
userunblock
}