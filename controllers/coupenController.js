 
const Coupon = require('../models/coupenModel');
const Cart = require('../models/cartmodel');

const couponlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);

        const couponData = await Coupon.find()
            .sort({ date: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        res.render('coupenlist', { couponData, totalPages, currentPage: page });
    } catch (error) {
        console.error('Error retrieving coupon list:', error.message);
        res.status(500).send('Error retrieving coupon list');
    }
};

const addcoupon = async (req, res) => {
    try {
        res.render('addcoupon', { message: '' });
    } catch (error) {
        console.error('Error rendering add coupon page:', error.message);
        res.status(500).send('Error rendering add coupon page');
    }
};

const submitcoupon = async (req, res) => {
    try {
        const { couponCode, discountPercentage, minAmount, maxDiscountAmount, list } = req.body;
        const existingCoupon = await Coupon.findOne({ code: couponCode });
        if (existingCoupon) {
            return res.render('addcoupon', { message: 'Coupon code already exists' });
        }

        const couponData = new Coupon({
            code: couponCode,
            discount: discountPercentage,
            minAmt: minAmount,
            maxDiscAmt: maxDiscountAmount,
            is_list: list === 'true'
        });

        await couponData.save();
        res.redirect('/admin/couponlist');
    } catch (error) {
        console.error('Error submitting coupon:', error.message);
        res.render('addcoupon', { message: 'Failed to add coupon' });
    }
};

const changelisting = async (req, res) => {
    try {
        const couponCode = req.params.id;
        const couponData = await Coupon.findOne({ code: couponCode });

        if (!couponData) {
            return res.status(404).send('Coupon not found');
        }

        const newIsBlockValue = !couponData.is_list;
        await Coupon.updateOne({ code: couponCode }, { $set: { is_list: newIsBlockValue } });

        console.log(`Coupon is_list toggled to: ${newIsBlockValue}`);
        res.redirect('/admin/couponlist');
    } catch (error) {
        console.error('Error toggling coupon listing:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const applycoupon = async (req, res) => {
    try {
        const { couponCode, totalPrice } = req.body;
        const userId = req.session.user_id;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: Please log in' });
        }

        if (!couponCode || totalPrice === undefined) {
            return res.status(400).json({ message: 'Coupon code and total price are required' });
        }

        const couponData = await Coupon.findOne({ code: couponCode, 'user.userid': { $in: [userId] } });
        if (couponData) {
            return res.status(200).json({ message: 'User already used this coupon' });
        }

        const codeData = await Coupon.findOne({ code: couponCode });
        if (!codeData || !codeData.is_list) {
            return res.status(200).json({ message: 'Coupon is not valid' });
        }

        const percentage = parseFloat(codeData.discount);
        const total = typeof totalPrice === 'string' ? parseFloat(totalPrice.replace('₹', '')) : parseFloat(totalPrice);

        if (isNaN(total)) {
            return res.status(400).json({ message: 'Invalid total price' });
        }

        if (codeData.minAmt > total) {
            return res.status(200).json({ message: `Purchase for at least ₹${codeData.minAmt}` });
        }

        let discount = total * (percentage / 100);
        if (codeData.maxDiscAmt && discount > codeData.maxDiscAmt) {
            discount = codeData.maxDiscAmt;
        }

        const newTotal = total - discount;

        await Coupon.updateOne(
            { code: couponCode },
            { $push: { user: { userid: userId } } }
        );

        console.log(`Coupon applied: ${codeData.code}, Discount: ₹${discount}, New Total: ₹${newTotal}`);
        return res.status(200).json({
            message: 'Coupon applied successfully',
            total: newTotal.toFixed(2),
            discount: discount.toFixed(2)
        });
    } catch (error) {
        console.error('Error applying coupon:', error.message);
        res.status(500).json({ message: 'Failed to apply coupon' });
    }
};

const cancelcoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user_id;

        console.log('Cancel coupon request:', { couponCode, userId });

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: Please log in' });
        }

        if (!couponCode) {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        const couponData = await Coupon.findOne({ code: couponCode });
        if (!couponData) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const userExists = couponData.user.some(user => user.userid === userId);
        if (!userExists) {
            return res.status(200).json({ message: 'Coupon not applied by this user' });
        }

        await Coupon.updateOne(
            { code: couponCode },
            { $pull: { user: { userid: userId } } }
        );

        console.log(`Coupon ${couponCode} canceled for user ${userId}`);
        return res.status(200).json({ message: 'Coupon canceled successfully' });
    } catch (error) {
        console.error('Error canceling coupon:', error.message);
        res.status(500).json({ message: 'Failed to cancel coupon', error: error.message });
    }
};

module.exports = {
    couponlist,
    addcoupon,
    submitcoupon,
    changelisting,
    applycoupon,
    cancelcoupon
};
 