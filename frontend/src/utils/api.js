const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

const request = async (path, options = {}) => {
  const token = window.localStorage.getItem("goodsly-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong");
  if (data.provider === "local" && data.url?.startsWith("/")) data.url = `${API_URL.replace(/\/api\/v1$/, "")}${data.url}`;
  return data;
};

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  summary: () => request("/admin/summary"),
  adminOrders: () => request("/admin/orders"),
  products: () => request("/products"),
  createProduct: (body) => request("/products", { method: "POST", body: JSON.stringify(body) }),
  updateOrder: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  orders: () => request("/orders"),
  sellerAnalytics: () => request("/analytics/seller"),
  notifications: (unread = false) => request(`/notifications${unread ? "?unread=true" : ""}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  conversations: () => request("/chat/conversations"),
  messages: (id) => request(`/chat/conversations/${id}/messages`),
  sendMessage: (id, body) => request(`/chat/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  createPayment: (body) => request("/payments/checkout", { method: "POST", body: JSON.stringify(body) }),
  paymentProviders: () => request("/payments/providers"),
  support: (message, history = []) => request("/ai/support", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  }),
  uploadImage: async (file) => {
    const token = window.localStorage.getItem("goodsly-token");
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${API_URL}/uploads`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Upload failed");
    if (data.provider === "local" && data.url && data.url.startsWith("/")) data.url = API_URL.replace("/api/v1", "") + data.url;
    return data;
  },
};
