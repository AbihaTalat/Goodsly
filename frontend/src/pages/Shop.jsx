import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiHeart,
  FiMenu,
  FiSearch,
  FiShoppingBag,
  FiX,
} from "react-icons/fi";
import { categories, products } from "../data/products";
import { addCartItem, loadCart, loadWishlist, saveCart, saveWishlist } from "../utils/store";
import ColorSwatches from "../components/ColorSwatches";
import SupportAgent from "../components/SupportAgent";
import "../styles/shop.css";

const Header = ({ cartCount, wishlistCount, onCart, onMenu, onSearch, onWishlist }) => (
  <header className="site-header">
    <button className="mobile-menu" onClick={onMenu} aria-label="Open menu">
      <FiMenu />
    </button>
    <Link to="/shop" className="wordmark">
      goods<span>ly</span>
    </Link>
    <nav className="main-nav">
      <a href="#shop">Explore</a>
      <a href="#sellers">Meet sellers</a>
      <a href="#story">Our approach</a>
      <Link to="/dashboard">Your account</Link>
    </nav>
    <div className="header-actions">
      <button aria-label="Search" onClick={onSearch}><FiSearch /></button>
      <button aria-label="Wishlist" className="icon-with-count" onClick={onWishlist}>
        <FiHeart /><small>{wishlistCount}</small>
      </button>
      <button aria-label="Cart" className="icon-with-count" onClick={onCart}>
        <FiShoppingBag /><small>{cartCount}</small>
      </button>
    </div>
  </header>
);

const ProductCard = ({ product, liked, onLike, onAdd }) => (
  <article className="product-card">
    <div className="product-image-wrap">
      <Link to={`/product/${product.id}`}>
        <img src={product.image} alt={product.name} />
      </Link>
      {product.badge && <span className="product-badge">{product.badge}</span>}
      <button
        className={`like-button ${liked ? "liked" : ""}`}
        aria-label={`Add ${product.name} to wishlist`}
        onClick={() => onLike(product.id)}
      >
        <FiHeart />
      </button>
      <button className="quick-add" onClick={() => onAdd(product)}>
        Quick add <FiArrowRight />
      </button>
    </div>
    <div className="product-meta">
      <div>
        <p className="eyebrow">Independent seller · {product.category}</p>
        <Link to={`/product/${product.id}`} className="product-name">{product.name}</Link>
        <p className="seller-label">Curated by <strong>Goodsly marketplace</strong></p>
        <ColorSwatches color={product.color} className="product-color" />
      </div>
      <strong>${product.price}</strong>
    </div>
  </article>
);

const WishlistDrawer = ({ items, onClose, onRemove, onAdd }) => (
  <div className="drawer-backdrop" onClick={onClose}>
    <aside className="cart-drawer wishlist-drawer" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-heading"><div><p className="eyebrow">Saved for later</p><h2>Wishlist ({items.length})</h2></div><button onClick={onClose} aria-label="Close wishlist"><FiX /></button></div>
      {items.length === 0 ? <div className="empty-bag"><FiHeart /><p>Your wishlist is empty. Save pieces you want to revisit.</p></div> : <div className="cart-items">{items.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div><p>{item.name}</p><span>${item.price}</span><button onClick={() => onAdd(item)}>Add to bag</button><button onClick={() => onRemove(item.id)}>Remove</button></div></div>)}</div>}
    </aside>
  </div>
);

const CartDrawer = ({ items, onClose, onRemove, onQuantity }) => (
  <div className="drawer-backdrop" onClick={onClose}>
    <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-heading">
        <div><p className="eyebrow">Your selection</p><h2>Bag ({items.length})</h2></div>
        <button onClick={onClose} aria-label="Close cart"><FiX /></button>
      </div>
      {items.length === 0 ? (
        <div className="empty-bag"><FiShoppingBag /><p>Your bag is ready for something good.</p></div>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt="" />
                <div><p>{item.name}</p><span>Size {item.size} · ${item.price}</span><div className="quantity-control"><button onClick={() => onQuantity(item.key, -1)}>-</button><b>{item.quantity}</b><button onClick={() => onQuantity(item.key, 1)}>+</button></div><button onClick={() => onRemove(item.key)}>Remove</button></div>
              </div>
            ))}
          </div>
          <div className="cart-total"><span>Subtotal</span><strong>${items.reduce((sum, item) => sum + item.price, 0)}</strong></div>
          <Link to="/checkout" className="primary-button checkout-button" onClick={onClose}>Checkout <FiArrowRight /></Link>
        </>
      )}
    </aside>
  </div>
);

const MobileMenu = ({ onClose }) => (
  <div className="mobile-menu-backdrop" onClick={onClose}>
    <aside className="mobile-menu-drawer" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-heading">
        <div><p className="eyebrow">Goodsly navigation</p><h2>Move well.</h2></div>
        <button onClick={onClose} aria-label="Close menu"><FiX /></button>
      </div>
      <nav className="mobile-nav">
        <a href="#shop" onClick={onClose}>Explore products <FiArrowRight /></a>
        <a href="#sellers" onClick={onClose}>Meet sellers <FiArrowRight /></a>
        <Link to="/story" onClick={onClose}>Our approach <FiArrowRight /></Link>
        <Link to="/dashboard" onClick={onClose}>Your account <FiArrowRight /></Link>
      </nav>
      <p className="mobile-menu-note">Performance essentials for the pace you choose.</p>
    </aside>
  </div>
);

const Shop = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState(loadCart);
  const [wishlist, setWishlist] = useState(loadWishlist);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldNote, setFieldNote] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const visibleProducts = useMemo(
    () => products.filter((product) => {
      const tokens = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const searchable = `${product.name} ${product.category} ${product.color} ${product.description} ${(product.tags || []).join(" ")}`.toLowerCase();
      return (activeCategory === "All" || product.category === activeCategory) && tokens.every((token) => searchable.includes(token));
    }),
    [activeCategory, search]
  );

  const addToCart = (product) => {
    setCart((current) => { const next = addCartItem(current, product); saveCart(next); return next; });
    setNotice(`${product.name} added to your bag`);
    window.setTimeout(() => setNotice(""), 2400);
  };
  const toggleWishlist = (id) => setWishlist((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; saveWishlist(next); return next; });
  const wishlistProducts = products.filter((product) => wishlist.includes(product.id));
  const removeFromCart = (key) => setCart((current) => { const next = current.filter((item) => item.key !== key); saveCart(next); return next; });
  const updateQuantity = (key, change) => setCart((current) => { const next = current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, item.quantity + change) } : item); saveCart(next); return next; });
  const submitNewsletter = (event) => {
    event.preventDefault();
    if (!fieldNote.trim()) return;
    setNewsletterMessage("Thanks for sharing your note with the Goodsly club.");
    setFieldNote("");
  };

  return (
    <div className="shop-page">
      <Header cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} wishlistCount={wishlist.length} onCart={() => setIsCartOpen(true)} onMenu={() => setIsMenuOpen(true)} onSearch={() => setIsSearchOpen((open) => !open)} onWishlist={() => setIsWishlistOpen(true)} />
      <main>
        {isSearchOpen && <div className="search-bar"><FiSearch /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try basketball, shoes, football..." /><button onClick={() => { setSearch(""); setIsSearchOpen(false); }}><FiX /></button><span className="search-result-count">{visibleProducts.length} {visibleProducts.length === 1 ? "match" : "matches"}</span></div>}
        {search && <section className="search-results collection-section"><div className="section-heading"><div><p className="eyebrow">Search results</p><h2>Made for<br /><em>“{search}”.</em></h2></div><p>{visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"} matched your search.</p></div><div className="product-grid">{visibleProducts.map((product) => <ProductCard key={`search-${product.id}`} product={product} liked={wishlist.includes(product.id)} onLike={toggleWishlist} onAdd={addToCart} />)}</div></section>}
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Independent sellers · one place</p>
            <h1>Find something<br /><em>worth keeping.</em></h1>
            <p className="hero-intro">Discover products from independent sellers, all in one place. A marketplace worth exploring.</p>
            <a className="primary-button" href="#shop">Explore products <FiArrowRight /></a>
          </div>
          <div className="hero-image">
            <img src="https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1400&q=90" alt="Athlete stretching outdoors" />
            <span className="hero-note">01 — The everyday<br />athlete</span>
          </div>
        </section>
        <section className="marquee" aria-label="Goodsly values"><span>INDEPENDENT SELLERS</span><i>✳</i><span>UNEXPECTED FINDS</span><i>✳</i><span>ONE PLACE TO EXPLORE</span></section>
        {!search && <section className="collection-section" id="shop">
          <div className="section-heading">
            <div><p className="eyebrow">The catalogue</p><h2>Worth a<br /><em>look.</em></h2></div>
            <p>A considered mix of products from independent sellers, made for the things you do every day.</p>
          </div>
          <div className="category-tabs">
            {categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>
          {search && <p className="search-summary">Showing products related to <strong>“{search}”</strong></p>}
          <div className="product-grid">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} liked={wishlist.includes(product.id)} onLike={toggleWishlist} onAdd={addToCart} />)}
          </div>
        </section>}
        <section className="seller-section" id="sellers">
          <div className="section-heading"><div><p className="eyebrow">The marketplace</p><h2>Meet the<br /><em>sellers.</em></h2></div><p>Independent sellers. Unique products. One place to discover them.</p></div>
          <div className="seller-grid">
            {["Running", "Studio", "Outdoor"].map((category, index) => (
              <article className="seller-card" key={category}>
                <div className={`seller-card-image seller-card-image-${index + 1}`}><span>{String(index + 1).padStart(2, "0")}</span></div>
                <p className="eyebrow">Independent seller</p>
                <h3>{category} edit</h3>
                <p>Small-batch finds and considered essentials from sellers worth knowing.</p>
                <a href="#shop" className="text-link">Explore collection <FiArrowRight /></a>
              </article>
            ))}
          </div>
        </section>
        <section className="approach" id="story">
          <div className="approach-image"><img src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85" alt="Marathon athlete running outdoors" /></div>
          <div className="approach-copy"><p className="eyebrow">Why Goodsly</p><h2>A marketplace<br /><em>worth exploring.</em></h2><p>We bring independent sellers into one thoughtful catalogue so discovery feels personal, useful and a little unexpected.</p><Link to="/story" className="text-link">Read our story <FiArrowRight /></Link></div>
        </section>
        <section className="newsletter" id="collections"><p className="eyebrow">Field notes</p><h2>Useful ideas for<br /><em>moving well.</em></h2><p className="newsletter-copy">Share a training thought, a gear-care tip or a lesson from your last session. Your note helps shape the next Goodsly field note.</p><form onSubmit={submitNewsletter} autoComplete="off"><textarea required name="fieldNote" value={fieldNote} onChange={(event) => setFieldNote(event.target.value)} placeholder="Write your field note..." aria-label="Write your field note" autoComplete="off" rows="3" /><button type="submit" aria-label="Submit field note"><FiArrowRight /></button></form><small>{newsletterMessage || "Tell us what is helping you move well."}</small></section>
      </main>
      <footer><Link to="/shop" className="wordmark">GOOD<span>SLY</span></Link><p>A marketplace worth exploring.</p><span>© 2025 Goodsly</span></footer>
      {notice && <div className="toast">{notice}</div>}
      {isMenuOpen && <MobileMenu onClose={() => setIsMenuOpen(false)} />}
      {isWishlistOpen && <WishlistDrawer items={wishlistProducts} onClose={() => setIsWishlistOpen(false)} onRemove={toggleWishlist} onAdd={(product) => { addToCart(product); setIsWishlistOpen(false); }} />}
      {isCartOpen && <CartDrawer items={cart} onClose={() => setIsCartOpen(false)} onRemove={removeFromCart} onQuantity={updateQuantity} />}
      <SupportAgent />
    </div>
  );
};

export default Shop;
