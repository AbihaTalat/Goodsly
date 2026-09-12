import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { loadCart, loadOrders, saveOrders, saveCart } from "../utils/store";
import "../styles/shop.css";

const Checkout = () => {
  const [cart] = useState(loadCart);
  const [complete, setComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  if (complete) {
    return <div className="shop-page confirmation"><div className="confirmation-mark"><FiCheck /></div><p className="eyebrow">Order confirmed</p><h1>Good choice.<br /><em>Keep moving.</em></h1><p>Your order <strong>#{orderNumber}</strong> is being prepared. You can follow its progress from your account.</p><div className="confirmation-actions"><Link to="/dashboard" className="primary-button">Track order <FiArrowRight /></Link><Link to="/shop" className="text-link">Continue shopping</Link></div></div>;
  }

  return (
    <div className="shop-page checkout-page">
      <header className="site-header"><Link to="/shop" className="wordmark">goods<span>ly</span></Link><Link to="/shop" className="back-link"><FiArrowLeft /> Back to shop</Link></header>
      <main className="checkout-layout">
        <section><p className="eyebrow">Secure checkout</p><h1>Finish your<br /><em>selection.</em></h1><form onSubmit={(event) => { event.preventDefault(); const number = `GDS-${Date.now().toString().slice(-6)}`; const nextOrder = { id: number, items: cart, total: subtotal >= 100 ? subtotal : subtotal + 8, status: "Processing", createdAt: new Date().toISOString() }; saveOrders([nextOrder, ...loadOrders()]); saveCart([]); setOrderNumber(number); setComplete(true); }}>
          <div className="checkout-block"><h2>Contact</h2><input type="email" required placeholder="Email address" /><label className="check-row"><input type="checkbox" /> Email me with news and offers</label></div>
          <div className="checkout-block"><h2>Delivery</h2><div className="form-grid"><input required placeholder="First name" /><input required placeholder="Last name" /></div><input required placeholder="Address" /><div className="form-grid"><input required placeholder="City" /><input required placeholder="Postal code" /></div><select defaultValue="US"><option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option></select></div>
          <div className="checkout-block"><h2>Payment</h2><input required placeholder="Card number" inputMode="numeric" /><div className="form-grid"><input required placeholder="MM / YY" /><input required placeholder="CVC" /></div></div>
          <button className="primary-button place-order" type="submit">Place order <FiArrowRight /></button>
        </form></section>
        <aside className="order-summary"><p className="eyebrow">In your bag</p><h2>Summary</h2>{cart.map((item) => <div className="summary-item" key={item.key}><img src={item.image} alt="" /><div><p>{item.name}</p><span>Size {item.size} · Qty {item.quantity}</span></div><strong>${item.price * item.quantity}</strong></div>)}<div className="summary-line"><span>Subtotal</span><strong>${subtotal}</strong></div><div className="summary-line"><span>Shipping</span><span>{subtotal >= 100 ? "Free" : "$8"}</span></div><div className="summary-total"><span>Total</span><strong>${subtotal >= 100 ? subtotal : subtotal + 8}</strong></div></aside>
      </main>
    </div>
  );
};

export default Checkout;
