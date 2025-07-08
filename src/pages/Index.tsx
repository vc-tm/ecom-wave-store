
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from '../components/Header';
import HomePage from '../components/HomePage';
import ProductDetail from '../components/ProductDetail';
import Login from '../components/Login';
import Profile from '../components/Profile';
import AdminDashboard from '../components/AdminDashboard';
import Cart from '../components/Cart';
import Checkout from '../components/Checkout';
import Orders from '../components/Orders';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';

const Index = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default Index;
