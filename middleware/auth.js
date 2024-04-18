const User = require("../models/userModel");
const isLogin = async (req, res, next) => {
  try {
    
    if (req.session.user_id) {
      next();
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    console.log(error.messsage);
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      return res.redirect("/");
    }
    next();
  } catch (error) {
    console.log(error.messsage);
  }
};



const guest=async(req,res,next)=>{
  try {
    if(req.session.user_id){
      const userData=await User.findOne({_id: req.session.user_id})
      if(userData && userData.isBlocked){
        return res.redirect('/logout')
      }
    }
    next()
  } catch (error) {
    console.log(error)
  }
}
module.exports = {
  isLogin,
  isLogout,
  guest,
};
