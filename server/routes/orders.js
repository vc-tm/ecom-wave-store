
const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, adminAuth } = require('../middleware/auth');
const twilioClient = require('../config/twilio');
const nodemailer = require('nodemailer');

const router = express.Router();

// Configure nodemailer
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Create order
router.post('/', auth, async (req, res) => {
  try {
    const { products, deliveryAddress, paymentMethod, razorpayOrderId } = req.body;
    
    // Calculate total amount
    let totalAmount = 0;
    const orderProducts = [];
    
    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      
      const price = product.discountPrice > 0 ? product.discountPrice : product.price;
      totalAmount += price * item.quantity;
      
      orderProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: price
      });
      
      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Generate order ID
    const orderId = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
    
    const order = new Order({
      orderId,
      customer: req.customer._id,
      products: orderProducts,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      razorpayOrderId: razorpayOrderId || '',
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING'
    });
    
    await order.save();
    
    // Add order to customer
    await Customer.findByIdAndUpdate(
      req.customer._id,
      { $push: { orders: order._id } }
    );
    
    // Send SMS notification
    try {
      await twilioClient.messages.create({
        body: `Order placed successfully! Order ID: ${orderId}. Total: ₹${totalAmount}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: req.customer.phoneNumber
      });
    } catch (smsError) {
      console.error('SMS Error:', smsError);
    }
    
    // Send email notification if email exists
    if (req.customer.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: req.customer.email,
          subject: 'Order Confirmation',
          html: `
            <h2>Order Confirmation</h2>
            <p>Your order has been placed successfully!</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p>Thank you for shopping with us!</p>
          `
        });
      } catch (emailError) {
        console.error('Email Error:', emailError);
      }
    }
    
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

// Get customer orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.customer._id })
      .populate('products.product')
      .populate('deliveryAddress')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get orders' });
  }
});

// Get all orders (Admin only)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status) {
      query.orderStatus = status;
    }
    
    const orders = await Order.find(query)
      .populate('customer')
      .populate('products.product')
      .populate('deliveryAddress')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Order.countDocuments(query);
    
    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get orders' });
  }
});

// Update order status (Admin only)
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    ).populate('customer').populate('products.product');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Send status update SMS
    try {
      await twilioClient.messages.create({
        body: `Order ${order.orderId} status updated to: ${orderStatus}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: order.customer.phoneNumber
      });
    } catch (smsError) {
      console.error('SMS Error:', smsError);
    }
    
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

// Update payment status
router.put('/:id/payment', auth, async (req, res) => {
  try {
    const { paymentStatus, razorpayPaymentId } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        paymentStatus,
        razorpayPaymentId: razorpayPaymentId || ''
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update payment status' });
  }
});

module.exports = router;
