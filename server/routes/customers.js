
const express = require('express');
const Address = require('../models/Address');
const Customer = require('../models/Customer');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get customer addresses
router.get('/addresses', auth, async (req, res) => {
  try {
    const addresses = await Address.find({ customer: req.customer._id });
    res.json(addresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to get addresses' });
  }
});

// Add new address
router.post('/addresses', auth, async (req, res) => {
  try {
    const { fullName, phoneNumber, streetAddress, city, state, pincode, landmark, isDefault } = req.body;
    
    // If this is default address, update all others to false
    if (isDefault) {
      await Address.updateMany(
        { customer: req.customer._id },
        { isDefault: false }
      );
    }
    
    const address = new Address({
      customer: req.customer._id,
      fullName,
      phoneNumber,
      streetAddress,
      city,
      state,
      pincode,
      landmark,
      isDefault
    });
    
    await address.save();
    
    // Add address to customer
    await Customer.findByIdAndUpdate(
      req.customer._id,
      { $push: { addresses: address._id } }
    );
    
    res.status(201).json(address);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add address' });
  }
});

// Update address
router.put('/addresses/:id', auth, async (req, res) => {
  try {
    const { fullName, phoneNumber, streetAddress, city, state, pincode, landmark, isDefault } = req.body;
    
    // If this is default address, update all others to false
    if (isDefault) {
      await Address.updateMany(
        { customer: req.customer._id },
        { isDefault: false }
      );
    }
    
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, customer: req.customer._id },
      { fullName, phoneNumber, streetAddress, city, state, pincode, landmark, isDefault },
      { new: true }
    );
    
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    res.json(address);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update address' });
  }
});

// Delete address
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      customer: req.customer._id
    });
    
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Remove address from customer
    await Customer.findByIdAndUpdate(
      req.customer._id,
      { $pull: { addresses: address._id } }
    );
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
});

module.exports = router;
