const wallet=require('../models/walletModel')
const user=require('../models/userModel')
const mongoose = require('mongoose');
const moment = require('moment');

const userwallet=async(req,res)=>{
    try {

        const userData=await user.findOne({_id:req.session.user_id})
        walletData=await wallet.findOne({userid:req.session.user_id})
     console.log('walletya',walletData)
        res.render('userwallet',{userData,walletData})
    } catch (error) {
        console.log(error)
        
    }
}



const walletTransaction = async (req, res, next) => {
    try {
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page); // Convert to integer
        }

        const limit = 7; // Limit per page

        // Count total transactions for the user
        const totalTransactions = await wallet.aggregate([
            { $match: { userid: new mongoose.Types.ObjectId(req.session.user_id) } },
            { $unwind: "$transaction" },
            { $count: "total" }
        ]);

        const totalTransactionsCount = totalTransactions.length > 0 ? totalTransactions[0].total : 0;

        // Fetch wallet data with pagination
        const walletData = await wallet.aggregate([
            { $match: { userid: new mongoose.Types.ObjectId(req.session.user_id) } },
            { $unwind: "$transaction" },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ]);

        walletData.forEach(walletItem => {
            if (Array.isArray(walletItem.transaction)) {
                walletItem.transaction.forEach(transactionItem => {
                    const parsedDate = moment(parseInt(transactionItem.date)).toDate();
                    console.log(`Parsed date for transaction: ${parsedDate}`);
                    transactionItem.date = moment(parsedDate).format('YYYY-MM-DD HH:mm:ss');
                });
            } else if (typeof walletItem.transaction === 'object') {
                const parsedDate = moment(parseInt(walletItem.transaction.date)).toDate();
                console.log(`Parsed date for transaction: ${parsedDate}`);
                walletItem.transaction.date = moment(parsedDate).format('YYYY-MM-DD HH:mm:ss');
            }
        });
        
        

        const userData = await user.findOne({ _id: new mongoose.Types.ObjectId(req.session.user_id) });

        return res.status(200).render("transaction", {
            wallet: walletData,
            Name: userData,
            totalPages: Math.ceil(totalTransactionsCount / limit),
            currentPage: page,
            limit: limit
        });
    } catch (error) {
        next(error.message);
    }
}


module.exports={
    userwallet,
    walletTransaction 
}