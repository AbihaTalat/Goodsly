const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const storagePath = path.join(__dirname, "..", "data", "store.json");
const loadStore = () => {
  try {
    const saved = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    return {
      users: new Map(Object.entries(saved.users || {})),
      products: new Map(Object.entries(saved.products || {})),
      orders: new Map(Object.entries(saved.orders || {})),
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`Could not read persistent store: ${error.message}`);
    return { users: new Map(), products: new Map(), orders: new Map() };
  }
};
const store = loadStore();
const users = store.users;
const products = store.products;
const orders = store.orders;
const persist = () => {
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  fs.writeFileSync(storagePath, JSON.stringify({
    users: Object.fromEntries(users),
    products: Object.fromEntries(products),
    orders: Object.fromEntries(orders),
  }, null, 2));
};

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

const publicUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return clone(safeUser);
};
const mongoReady = () => mongoose.connection.readyState === 1;
const publicMongoUser = (user) => user ? publicUser({ ...user, _id: String(user._id) }) : null;

const usersRepository = {
  async create({ name, email, passwordHash, role = "customer" }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (mongoReady()) {
      const user = await User.create({ name, email: normalizedEmail, passwordHash, role });
      return publicMongoUser(user.toObject());
    }
    if ([...users.values()].some((user) => user.email === normalizedEmail)) {
      const error = new Error("An account with this email already exists");
      error.statusCode = 409;
      throw error;
    }
    const user = {
      _id: id(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: now(),
      updatedAt: now(),
    };
    users.set(user._id, user);
    persist();
    return publicUser(user);
  },
  async findByEmail(email) {
    if (mongoReady()) {
      const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash").lean();
      return user ? { ...user, _id: String(user._id) } : null;
    }
    return [...users.values()].find((user) => user.email === email.trim().toLowerCase()) || null;
  },
  async findById(userId) {
    if (mongoReady()) {
      const user = await User.findById(userId).lean();
      return publicMongoUser(user);
    }
    return publicUser(users.get(userId));
  },
};

const productsRepository = {
  async list(filters = {}) {
    if (mongoReady()) {
      const query = {};
      if (filters.sellerId) query.sellerId = filters.sellerId;
      if (filters.category) query.category = filters.category;
      if (filters.q) query.$or = [
        { name: new RegExp(filters.q, "i") },
        { description: new RegExp(filters.q, "i") },
        { category: new RegExp(filters.q, "i") },
      ];
      return Product.find(query).sort({ createdAt: -1 }).lean();
    }
    let result = [...products.values()];
    if (filters.sellerId) result = result.filter((product) => product.sellerId === filters.sellerId);
    if (filters.category) result = result.filter((product) => product.category === filters.category);
    if (filters.q) {
      const query = filters.q.toLowerCase();
      result = result.filter((product) =>
        `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query)
      );
    }
    return clone(result);
  },
  async findById(productId) {
    if (mongoReady()) return Product.findById(productId).lean();
    return clone(products.get(productId) || null);
  },
  async create(input, sellerId) {
    if (mongoReady()) {
      const product = await Product.create({
        name: input.name,
        description: input.description,
        category: input.category,
        image: input.image,
        price: input.price,
        stock: input.stock || 0,
        sellerId,
      });
      return product.toObject();
    }
    const product = {
      _id: id(),
      name: input.name.trim(),
      description: String(input.description || "").trim(),
      category: String(input.category || "").trim(),
      image: String(input.image || "").trim(),
      price: Number(input.price),
      stock: Number.isInteger(input.stock) ? input.stock : Number(input.stock || 0),
      sellerId,
      createdAt: now(),
      updatedAt: now(),
    };
    products.set(product._id, product);
    persist();
    return clone(product);
  },
  async update(productId, input) {
    if (mongoReady()) return Product.findByIdAndUpdate(productId, input, { new: true, runValidators: true }).lean();
    const product = products.get(productId);
    if (!product) return null;
    const allowed = ["name", "description", "category", "image", "price", "stock"];
    allowed.forEach((field) => {
      if (input[field] !== undefined) product[field] = field === "name" ? String(input[field]).trim() : input[field];
    });
    if (input.price !== undefined) product.price = Number(input.price);
    if (input.stock !== undefined) product.stock = Number(input.stock);
    product.updatedAt = now();
    persist();
    return clone(product);
  },
  async remove(productId) {
    if (mongoReady()) {
      const result = await Product.findByIdAndDelete(productId);
      return Boolean(result);
    }
    const removed = products.delete(productId);
    persist();
    return removed;
  },
};

const ordersRepository = {
  async create({ customerId, items, shippingAddress }) {
    if (mongoReady()) {
      const normalizedItems = [];
      for (const item of items) {
        const product = await Product.findById(item.productId);
        const quantity = Number(item.quantity);
        if (!product) {
          const error = new Error(`Product ${item.productId} was not found`);
          error.statusCode = 404;
          throw error;
        }
        if (!Number.isInteger(quantity) || quantity < 1 || product.stock < quantity) {
          const error = new Error(`${product.name} does not have enough stock`);
          error.statusCode = 400;
          throw error;
        }
        product.stock -= quantity;
        await product.save();
        normalizedItems.push({ productId: product._id, name: product.name, quantity, price: product.price, subtotal: product.price * quantity });
      }
      const order = await Order.create({ customerId, items: normalizedItems, total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0), shippingAddress });
      return order.toObject();
    }
    const normalizedItems = [];
    for (const item of items) {
      const product = products.get(item.productId);
      const quantity = Number(item.quantity);
      if (!product) {
        const error = new Error(`Product ${item.productId} was not found`);
        error.statusCode = 404;
        throw error;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error("Each order quantity must be a positive integer");
        error.statusCode = 400;
        throw error;
      }
      if (product.stock < quantity) {
        const error = new Error(`${product.name} does not have enough stock`);
        error.statusCode = 400;
        throw error;
      }
      normalizedItems.push({
        productId: product._id,
        name: product.name,
        quantity,
        price: product.price,
        subtotal: product.price * quantity,
      });
    }
    normalizedItems.forEach((item) => {
      products.get(item.productId).stock -= item.quantity;
    });
    const order = {
      _id: id(),
      customerId,
      items: normalizedItems,
      total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
      shippingAddress: shippingAddress || null,
      status: "pending",
      createdAt: now(),
      updatedAt: now(),
    };
    orders.set(order._id, order);
    persist();
    return clone(order);
  },
  async findById(orderId) {
    if (mongoReady()) return Order.findById(orderId).lean();
    return clone(orders.get(orderId) || null);
  },
  async list(customerId) {
    if (mongoReady()) return Order.find(customerId ? { customerId } : {}).sort({ createdAt: -1 }).lean();
    const result = [...orders.values()].filter((order) => !customerId || order.customerId === customerId);
    return clone(result);
  },
  async updateStatus(orderId, status) {
    if (mongoReady()) return Order.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true }).lean();
    const order = orders.get(orderId);
    if (!order) return null;
    order.status = status;
    order.updatedAt = now();
    persist();
    return clone(order);
  },
  async summary() {
    if (mongoReady()) {
      const [usersCount, productsCount, allOrders] = await Promise.all([User.countDocuments(), Product.countDocuments(), Order.find().lean()]);
      return {
        users: usersCount,
        products: productsCount,
        orders: allOrders.length,
        revenue: allOrders.filter((order) => order.status !== "cancelled").reduce((total, order) => total + order.total, 0),
        pendingOrders: allOrders.filter((order) => order.status === "pending").length,
      };
    }
    const allOrders = [...orders.values()];
    return {
      users: users.size,
      products: products.size,
      orders: allOrders.length,
      revenue: allOrders
        .filter((order) => order.status !== "cancelled")
        .reduce((total, order) => total + order.total, 0),
      pendingOrders: allOrders.filter((order) => order.status === "pending").length,
    };
  },
};

module.exports = {
  users: usersRepository,
  products: productsRepository,
  orders: ordersRepository,
  publicUser,
  storage: {
    get type() {
      return mongoReady() ? "mongodb" : "json-file";
    },
    path: storagePath,
    counts: () => ({ users: users.size, products: products.size, orders: orders.size }),
  },
};
