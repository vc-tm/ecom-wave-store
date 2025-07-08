
const express = require('express');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const OTP = require('../models/OTP');
const twilioClient = require('../config/twilio');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to database
    await OTP.findOneAndDelete({ phoneNumber }); // Remove existing OTP
    const newOTP = new OTP({
      phoneNumber,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    });
    await newOTP.save();
    
    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP for login is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP and Login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    // Find OTP
    const otpRecord = await OTP.findOne({ phoneNumber, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'OTP expired' });
    }
    
    // Find or create customer
    let customer = await Customer.findOne({ phoneNumber });
    if (!customer) {
      customer = new Customer({
        phoneNumber,
        isVerified: true
      });
      await customer.save();
    } else {
      customer.isVerified = true;
      await customer.save();
    }
    
    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: customer._id, phoneNumber: customer.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      customer: {
        id: customer._id,
        phoneNumber: customer.phoneNumber,
        name: customer.name,
        email: customer.email,
        isAdmin: customer.isAdmin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id)
      .populate('addresses')
      .populate('orders');
    
    res.json({
      id: customer._id,
      phoneNumber: customer.phoneNumber,
      name: customer.name,
      email: customer.email,
      isAdmin: customer.isAdmin,
      addresses: customer.addresses,
      orders: customer.orders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const customer = await Customer.findByIdAndUpdate(
      req.customer._id,
      { name, email },
      { new: true }
    );
    
    res.json({
      id: customer._id,
      phoneNumber: customer.phoneNumber,
      name: customer.name,
      email: customer.email,
      isAdmin: customer.isAdmin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;
