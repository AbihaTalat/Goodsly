const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");

const storagePath = path.join(__dirname, "..", "data", "store.json");
const loadStore = () => {
  try {
    const saved = JSON.parse(fs.readFileSync(storagePath, "utf8"));
    return {
      users: new Map(Object.entries(saved.users || {})),
      products: new Map(Object.entries(saved.products || {})),
      orders: new Map(Object.entries(saved.orders || {})),
      conversations: new Map(Object.entries(saved.conversations || {})),
      messages: new Map(Object.entries(saved.messages || {})),
      notifications: new Map(Object.entries(saved.notifications || {})),
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`Could not read persistent store: ${error.message}`);
    return { users: new Map(), products: new Map(), orders: new Map(), conversations: new Map(), messages: new Map(), notifications: new Map() };
  }
};
const store = loadStore();
const users = store.users;
const products = store.products;
const orders = store.orders;
const conversations = store.conversations;
const messages = store.messages;
const notifications = store.notifications;
const persist = () => {
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  fs.writeFileSync(storagePath, JSON.stringify({
    users: Object.fromEntries(users),
    products: Object.fromEntries(products),
    orders: Object.fromEntries(orders),
    conversations: Object.fromEntries(conversations),
    messages: Object.fromEntries(messages),
    notifications: Object.fromEntries(notifications),
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

const chatRepository = {
      async listConversations(userId) {
        if (mongoReady()) return Conversation.find({ participants: userId }).sort({ lastMessageAt: -1 }).lean();
        return clone([...conversations.values()].filter((item) => item.participants.includes(userId)).sort((a, b) => String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || ""))));
      },
      async createConversation(participants, orderId) {
        const normalized = [...new Set(participants.map(String))];
        if (mongoReady()) {
          let conversation = await Conversation.findOne({ participants: { $all: normalized, $size: normalized.length }, ...(orderId ? { orderId } : {}) }).lean();
          if (!conversation) conversation = (await Conversation.create({ participants: normalized, orderId, lastMessageAt: now() })).toObject();
          return conversation;
        }
        const existing = [...conversations.values()].find((item) => item.participants.length === normalized.length && normalized.every((userId) => item.participants.includes(userId)) && (!orderId || item.orderId === orderId));
        if (existing) return clone(existing);
        const conversation = { _id: id(), participants: normalized, orderId: orderId || null, lastMessageAt: now(), createdAt: now(), updatedAt: now() };
        conversations.set(conversation._id, conversation);
        persist();
        return clone(conversation);
      },
      async canAccess(conversationId, userId) {
        const conversation = mongoReady() ? await Conversation.findOne({ _id: conversationId, participants: userId }).lean() : conversations.get(conversationId);
        return conversation && conversation.participants.map(String).includes(String(userId)) ? conversation : null;
      },
      async listMessages(conversationId, limit = 50) {
        if (mongoReady()) return Message.find({ conversationId }).sort({ createdAt: -1 }).limit(limit).lean().then((items) => items.reverse());
        return clone([...messages.values()].filter((item) => item.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-limit));
      },
      async createMessage(conversationId, senderId, body) {
        if (mongoReady()) {
          const message = await Message.create({ conversationId, senderId, body });
          await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: message.createdAt });
          return message.toObject();
        }
        const message = { _id: id(), conversationId, senderId, body: String(body).trim(), createdAt: now(), updatedAt: now() };
        messages.set(message._id, message);
        const conversation = conversations.get(conversationId);
        if (conversation) conversation.lastMessageAt = message.createdAt;
        persist();
        return clone(message);
      },
    };

    const notificationRepository = {
      async list(userId, unreadOnly = false) {
        if (mongoReady()) return Notification.find({ userId, ...(unreadOnly ? { readAt: null } : {}) }).sort({ createdAt: -1 }).limit(100).lean();
        return clone([...notifications.values()].filter((item) => item.userId === userId && (!unreadOnly || !item.readAt)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100));
      },
      async create(input) {
        if (mongoReady()) return (await Notification.create(input)).toObject();
        const notification = { _id: id(), ...input, readAt: null, createdAt: now(), updatedAt: now() };
        notifications.set(notification._id, notification);
        persist();
        return clone(notification);
      },
      async markRead(notificationId, userId) {
        if (mongoReady()) return Notification.findOneAndUpdate({ _id: notificationId, userId }, { readAt: new Date() }, { new: true }).lean();
        const notification = notifications.get(notificationId);
        if (!notification || notification.userId !== userId) return null;
        notification.readAt = now();
        persist();
        return clone(notification);
      },
    };

    const analyticsRepository = {
      async seller(sellerId) {
        const sellerProducts = await productsRepository.list({ sellerId });
        const sellerProductIds = new Set(sellerProducts.map((item) => String(item._id)));
        const allOrders = mongoReady() ? await Order.find({ "items.productId": { $in: [...sellerProductIds] } }).lean() : [...orders.values()];
        const relevant = allOrders.filter((order) => order.status !== "cancelled" && order.items.some((item) => sellerProductIds.has(String(item.productId))));
        const revenue = relevant.reduce((sum, order) => sum + order.items.filter((item) => sellerProductIds.has(String(item.productId))).reduce((s, item) => s + item.subtotal, 0), 0);
        return { products: sellerProducts.length, orders: relevant.length, revenue, unitsSold: relevant.reduce((s, order) => s + order.items.filter((item) => sellerProductIds.has(String(item.productId))).reduce((n, item) => n + item.quantity, 0), 0), inventory: sellerProducts.reduce((s, item) => s + Number(item.stock || 0), 0) };
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
  chat: chatRepository,
  notifications: notificationRepository,
  analytics: analyticsRepository,
  publicUser,
  storage: {
    get type() {
      return mongoReady() ? "mongodb" : "json-file";
    },
    path: storagePath,
    counts: () => ({ users: users.size, products: products.size, orders: orders.size, conversations: conversations.size, messages: messages.size, notifications: notifications.size }),
  },
};
