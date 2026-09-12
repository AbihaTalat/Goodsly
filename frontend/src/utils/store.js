const CART_KEY = "goodsly-cart";
const WISHLIST_KEY = "goodsly-wishlist";
const ORDERS_KEY = "goodsly-orders";

const read = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const loadCart = () => read(CART_KEY, []);
export const loadWishlist = () => read(WISHLIST_KEY, []);
export const loadOrders = () => read(ORDERS_KEY, []);

export const saveCart = (cart) => window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
export const saveWishlist = (wishlist) => window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
export const saveOrders = (orders) => window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

export const addCartItem = (cart, product, size = "M") => {
  const key = `${product.id}-${size}`;
  const existing = cart.find((item) => item.key === key);
  if (existing) {
    return cart.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
  }
  return [...cart, { ...product, key, size, quantity: 1 }];
};
