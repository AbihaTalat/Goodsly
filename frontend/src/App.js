import React from "react";
import "./App.css";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import {LoginPage, SignUpPage} from "./Routes.js";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import Story from "./pages/Story";

const App = () => {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/shop" replace />} />
      <Route path="/shop" element={<Shop/>} />
      <Route path="/product/:id" element={<ProductDetail/>} />
      <Route path="/checkout" element={<Checkout/>} />
      <Route path="/dashboard" element={<Dashboard/>} />
      <Route path="/story" element={<Story/>} />
      <Route path="/login" element={<LoginPage/>} />
      <Route path="/sign-up" element={<SignUpPage/>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </BrowserRouter>
  )
}

export default App;