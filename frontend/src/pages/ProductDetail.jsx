import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiHeart, FiShoppingBag } from "react-icons/fi";
import { products } from "../data/products";
import { addCartItem, loadCart, loadWishlist, saveCart, saveWishlist } from "../utils/store";
import ColorSwatches from "../components/ColorSwatches";
import "../styles/shop.css";

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((item) => item.id === id) || products[0];
  const [size, setSize] = useState("M");
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(() => loadWishlist().includes(product.id));
  const navigate = useNavigate();
  const addToBag = () => { const next = addCartItem(loadCart(), product, size); saveCart(next); setAdded(true); };
  const toggleWishlist = () => { const current = loadWishlist(); const next = current.includes(product.id) ? current.filter((item) => item !== product.id) : [...current, product.id]; saveWishlist(next); setLiked(!liked); };
  return (
    <div className="shop-page detail-page">
      <header className="site-header">
        <Link to="/shop" className="wordmark">goods<span>ly</span></Link>
        <Link to="/shop" className="back-link"><FiArrowLeft /> Back to shop</Link>
        <button className="bag-link" onClick={() => navigate("/shop")}><FiShoppingBag /> Bag</button>
      </header>
      <main className="detail-layout">
        <div className="detail-image"><img src={product.image} alt={product.name} /></div>
        <div className="detail-info"><p className="eyebrow">{product.category} / Goodsly essentials</p><h1>{product.name}</h1><p className="detail-price">${product.price}</p><p className="detail-description">{product.description}</p><div className="detail-rule" /><p className="detail-label">Available colorways <strong>{product.color}</strong></p><ColorSwatches color={product.color} className="colorway-list" /><p className="detail-label">Select size</p><div className="size-grid">{["XS", "S", "M", "L", "XL"].map((item) => <button className={size === item ? "selected" : ""} key={item} onClick={() => setSize(item)}>{item}</button>)}</div><button className="primary-button add-detail" onClick={addToBag}>{added ? "Added to your bag" : "Add to bag"} {added ? "✓" : <FiArrowRight />}</button><button className={`wishlist-detail ${liked ? "wish-active" : ""}`} onClick={toggleWishlist}><FiHeart /> {liked ? "Saved to wishlist" : "Add to wishlist"}</button><div className="detail-perks"><span>Free shipping over $100</span><span>30-day easy returns</span></div></div>
      </main>
    </div>
  );
};

export default ProductDetail;
