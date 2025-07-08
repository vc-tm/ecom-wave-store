
const express = require('express');
const razorpay = require('../config/razorpay');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: 'order_' + Date.now()
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RZP_KEY_ID
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// Verify payment
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RZP_KEY_SECRET);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');
    
    if (generated_signature === razorpay_signature) {
      res.json({ 
        success: true, 
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id 
      });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment verification error' });
  }
});

module.exports = router;
