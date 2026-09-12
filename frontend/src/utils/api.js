const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

const request = async (path, options = {}) => {
  const token = window.localStorage.getItem("goodsly-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong");
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
};
