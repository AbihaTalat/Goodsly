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
        <h1>Better things<br /><em>for moving.</em></h1>
        <p>Goodsly began with a simple question: what if performance gear felt as considered as the rest of your wardrobe?</p>
      </section>
      <section className="story-feature">
        <img src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85" alt="Marathon athlete running outdoors" />
        <div>
          <p className="eyebrow">01 — Start with purpose</p>
          <h2>Gear that earns<br /><em>its place.</em></h2>
          <p>We design for real movement: early runs, repeat sessions, slow Sundays and every effort in between. Each piece is made to work hard without shouting for attention.</p>
        </div>
      </section>
      <section className="story-copy">
        <p className="eyebrow">02 — Less, but better</p>
        <h2>We choose a smaller<br /><em>starting line.</em></h2>
        <p>Instead of chasing every trend, we focus on dependable silhouettes, thoughtful materials and details that make a difference once you are in motion. The result is a focused collection that works together and lasts beyond one season.</p>
        <Link to="/shop" className="primary-button">Explore the collection <FiArrowRight /></Link>
      </section>
    </main>
    <footer><Link to="/shop" className="wordmark">goods<span>ly</span></Link><p>Performance, with a point of view.</p><span>© 2025 Goodsly</span></footer>
  </div>;
};

export default Story;
