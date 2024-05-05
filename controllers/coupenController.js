const coupon=require('../models/coupenModel')
const cart=require('../models/cartmodel')

const couponlist = async (req, res) => {
    try {
        const page = req.query.page || 1; // Get page number from query parameters, default to 1
        const limit = 10; // Set the number of coupons per page

        // Count total number of coupons
        const totalCoupons = await coupon.countDocuments();

        // Calculate total pages
        const totalPages = Math.ceil(totalCoupons / limit);

        // Paginate coupons
        const couponData = await coupon.find()
            .sort({ date: -1 }) // Sorting by date field in descending order
            .limit(limit)
            .skip((page - 1) * limit);

        res.render('coupenlist', { couponData, totalPages, currentPage: page });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Error retrieving coupon list');
    }
};


const addcoupon = async (req, res) => {
    try {
        return res.render('addcoupon', { message: '' })
    } catch (error) {
        console.log(error.message);
    }
}



const submitcoupon = async (req, res) => {
    try {
        const { couponCode, discountPercentage, minAmount, maxDiscountAmount, list } = req.body
        console.log(req.body);
        const existingCoupon = await coupon.findOne({ code: couponCode });
        if (existingCoupon) {
            return res.render('addcoupon', { message: "Coupon code Already Exist" })
        }
        const couponData = new coupon({
            code: couponCode,
            discount: discountPercentage,
            minAmt: minAmount,
            maxDiscAmt: maxDiscountAmount,
            is_list: list
        })
        couponData.save()

        res.redirect('/admin/couponlist')
    } catch (error) {
        console.log(error.message);
    }
}


const changelisting = async (req, res) => {
    try {

        const couponCode = req.params.id;
        const couponData = await coupon.findOne({ code: couponCode })

        if (!couponData) {
            return res.status(404).send("category not found");
        }

        const newIsBlockValue = couponData.is_list === true ? false : true;

        await coupon.updateOne({ code: couponCode }, { $set: { is_list: newIsBlockValue } });

        console.log(`Category is_block toggled to: ${newIsBlockValue}`);
        return res.redirect('/admin/couponlist');
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Internal Server Error");
    }
}



const applycoupon = async (req, res) => {
    try {
        const { couponCode, totalPrice } = req.body;
        console.log(totalPrice);
        let discount

        const userid = req.session.user_id
        const couponData = await coupon.findOne({ code: couponCode, 'user.userid': { $in: [userid] } });
        if (!couponData) {
            codeData = await coupon.findOne({ code: couponCode })
            if (codeData.is_list==true) {
                const percentage = parseFloat(codeData.discount);
                let total = parseFloat(totalPrice.replace('$', ''));
                console.log(total);
                discount = total * (percentage / 100);
                if(codeData.minAmt<=total){
                    if(codeData.maxDiscAmt<discount){
                        total=total-codeData.maxDiscAmt
                        console.log("after discount:"+total);
                        await coupon.updateOne( { code: couponCode },
                            { $push: { user:{userid:userid} } })
                        console.log(codeData);
                        return res.status(200).json({message:"Coupon applied Successfully",total,discount})

                    }else{
                        total=total-discount
                        console.log("after discount:"+total);
                        await coupon.updateOne( { code: couponCode },
                            { $push: { user:{userid:userid} } })
                        console.log(codeData);
                        return res.status(200).json({message:"Coupon applied Successfully",total,discount})
                    }

                }else{
                    return res.status(200).json({message:`Purchase for at least ${codeData.minAmt}`})
                }

            
            } else {
                return res.status(200).json({ message: 'Coupon is Not Valid' })
            }

        }
        else {
            return res.status(200).json({message:'User already used This Coupon'})
        }

    } catch (error) {
        console.log(error.message);
    }
}



module.exports={
    couponlist,
    addcoupon,
    submitcoupon,
    changelisting,
    applycoupon
}