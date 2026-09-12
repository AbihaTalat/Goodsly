import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FiArrowLeft, FiBox, FiCheck, FiLogOut, FiPlus, FiTruck } from "react-icons/fi";
import { api } from "../utils/api";
import { loadOrders } from "../utils/store";
import "../styles/shop.css";

const Dashboard = () => {
  const user = JSON.parse(window.localStorage.getItem("goodsly-user") || "null");
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerOrders] = useState(loadOrders);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", category: "Training", price: "", image: "", description: "" });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        if (user.role === "admin") {
          const [summaryResponse, orderResponse] = await Promise.all([api.summary(), api.adminOrders()]);
          setSummary(summaryResponse.summary);
          setOrders(orderResponse.orders || []);
        }
        if (user.role === "seller") setProducts((await api.products()).products || []);
      } catch (error) {
        setMessage(error.message);
      }
    };
    load();
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  const logout = () => { window.localStorage.removeItem("goodsly-token"); window.localStorage.removeItem("goodsly-user"); window.location.href = "/login"; };
  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const addProduct = async (event) => {
    event.preventDefault();
    try {
      const response = await api.createProduct({ ...form, price: Number(form.price) });
      setProducts((current) => [...current, response.product]);
      setForm({ name: "", category: "Training", price: "", image: "", description: "" });
      setMessage("Product published to the Goodsly catalog.");
    } catch (error) { setMessage(error.message); }
  };
  const updateOrder = async (id, status) => {
    try {
      const response = await api.updateOrder(id, status);
      setOrders((current) => current.map((order) => order._id === id ? response.order : order));
    } catch (error) { setMessage(error.message); }
  };

  return <div className="shop-page dashboard-page">
    <header className="site-header"><Link to="/shop" className="wordmark">goods<span>ly</span></Link><Link to="/shop" className="back-link"><FiArrowLeft /> Storefront</Link><button className="bag-link" onClick={logout}><FiLogOut /> Sign out</button></header>
    <main className="dashboard-shell">
      <div className="dashboard-heading"><div><p className="eyebrow">{user.role} workspace</p><h1>Good morning,<br /><em>{user.name.split(" ")[0]}.</em></h1></div><p>Manage the movement behind Goodsly.</p></div>
      {message && <div className="dashboard-message">{message}</div>}
      {user.role === "admin" && <><div className="stat-grid"><div><FiBox /><span>Products</span><strong>{summary?.products ?? "—"}</strong></div><div><FiTruck /><span>Orders</span><strong>{summary?.orders ?? "—"}</strong></div><div><FiCheck /><span>Revenue</span><strong>${summary?.revenue ?? "—"}</strong></div></div><section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Operations</p><h2>Recent orders</h2></div></div><div className="order-table"><div className="order-row order-header"><span>Order</span><span>Customer</span><span>Total</span><span>Status</span></div>{orders.map((order) => <div className="order-row" key={order._id}><span>#{order._id.slice(-6)}</span><span>{order.customer?.name || "Customer"}</span><span>${order.total}</span><select value={order.status} onChange={(event) => updateOrder(order._id, event.target.value)}><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></div>)}{!orders.length && <p className="empty-dashboard">Orders will appear here as customers check out.</p>}</div></section></>}
      {user.role === "seller" && <><section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Seller studio</p><h2>Publish a product</h2></div><FiPlus /></div><form className="product-form" onSubmit={addProduct}><input name="name" value={form.name} onChange={updateField} required placeholder="Product name" /><div className="form-grid"><select name="category" value={form.category} onChange={updateField}><option>Running</option><option>Training</option><option>Studio</option><option>Outdoor</option></select><input name="price" value={form.price} onChange={updateField} required type="number" min="1" placeholder="Price" /></div><input name="image" value={form.image} onChange={updateField} required placeholder="Image URL" /><textarea name="description" value={form.description} onChange={updateField} required placeholder="Product description" /><button className="primary-button" type="submit">Publish product <FiPlus /></button></form></section><section className="dashboard-panel"><p className="eyebrow">Your catalog</p><h2>Live products</h2><div className="seller-products">{products.map((product) => <div key={product._id}><img src={product.images?.[0]?.url || product.image} alt="" /><span>{product.name}</span><strong>${product.price}</strong></div>)}</div></section></>}
      {user.role === "customer" && <><section className="dashboard-panel customer-dashboard"><p className="eyebrow">Your account</p><h2>Ready for your next session?</h2><p>Browse the latest Goodsly essentials and keep your training kit moving forward.</p><Link to="/shop" className="primary-button">Shop the collection <FiArrowLeft /></Link></section><section className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Your movement</p><h2>Order history</h2></div></div>{customerOrders.length ? <div className="customer-orders">{customerOrders.map((order) => <div className="customer-order" key={order.id}><div><strong>#{order.id}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><b>{order.status}</b><strong>${order.total}</strong><div className="order-progress"><span className={["Processing", "Shipped", "Delivered"].includes(order.status) ? "done" : ""}></span><span className={["Shipped", "Delivered"].includes(order.status) ? "done" : ""}></span><span className={order.status === "Delivered" ? "done" : ""}></span></div></div>)}</div> : <p className="empty-dashboard">Your completed orders will appear here.</p>}</section></>}
    </main>
  </div>;
};

export default Dashboard;
