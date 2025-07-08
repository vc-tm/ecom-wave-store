
const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Product = require('../models/Product');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    
    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query)
      .populate('category')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get products' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get product' });
  }
});

// Create product (Admin only)
router.post('/', adminAuth, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, discountPrice, category, stock, specifications } = req.body;
    
    let imageUrls = [];
    
    // Upload images to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'ecommerce/products' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(file.buffer);
        });
      });
      
      imageUrls = await Promise.all(uploadPromises);
    }
    
    const product = new Product({
      name,
      description,
      price,
      discountPrice: discountPrice || 0,
      category,
      stock,
      images: imageUrls,
      specifications: specifications ? JSON.parse(specifications) : {}
    });
    
    await product.save();
    await product.populate('category');
    
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update product (Admin only)
router.put('/:id', adminAuth, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, discountPrice, category, stock, specifications } = req.body;
    
    let updateData = {
      name,
      description,
      price,
      discountPrice: discountPrice || 0,
      category,
      stock,
      specifications: specifications ? JSON.parse(specifications) : {}
    };
    
    // Upload new images if provided
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'ecommerce/products' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(file.buffer);
        });
      });
      
      const imageUrls = await Promise.all(uploadPromises);
      updateData.images = imageUrls;
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete product (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router;
