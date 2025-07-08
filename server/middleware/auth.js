
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(decoded.id);
    
    if (!customer) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.customer = customer;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (!req.customer.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin required.' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Admin authorization failed' });
  }
};

module.exports = { auth, adminAuth };
