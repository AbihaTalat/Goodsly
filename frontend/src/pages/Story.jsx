import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import "../styles/shop.css";

const Story = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return <div className="shop-page story-page">
    <header className="site-header">
      <Link to="/shop" className="wordmark">goods<span>ly</span></Link>
      <Link to="/shop" className="back-link"><FiArrowLeft /> Back to shop</Link>
    </header>
    <main>
      <section className="story-hero">
        <p className="eyebrow">The Goodsly story</p>
          <h1>More to find<br /><em>and keep.</em></h1>
          <p>Goodsly began with a simple question: what if discovering independent sellers felt as considered as the products themselves?</p>
      </section>
      <section className="story-feature">
        <img src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85" alt="Marathon athlete running outdoors" />
        <div>
          <p className="eyebrow">01 — Start with purpose</p>
          <h2>Products with<br /><em>a point of view.</em></h2>
          <p>We make room for independent sellers, thoughtful products and the small discoveries that make an everyday marketplace worth returning to.</p>
        </div>
      </section>
      <section className="story-copy">
        <p className="eyebrow">02 — Less, but better</p>
        <h2>A better way<br /><em>to browse.</em></h2>
        <p>Instead of endless noise, Goodsly brings together considered collections from independent sellers. The result is a focused place to discover something useful, beautiful or unexpectedly right.</p>
        <Link to="/shop" className="primary-button">Explore the collection <FiArrowRight /></Link>
      </section>
    </main>
    <footer><Link to="/shop" className="wordmark">GOOD<span>SLY</span></Link><p>A marketplace worth exploring.</p><span>© 2025 Goodsly</span></footer>
  </div>;
};

export default Story;
