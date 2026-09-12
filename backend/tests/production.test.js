process.env.NODE_ENV = "test";
process.env.DB_URL = "";
process.env.GEMINI_API_KEY = "";
process.env.ALLOW_DEV_RESET_TOKEN = "true";
process.env.LOG_LEVEL = "silent";

const request = require("supertest");
const app = require("../app");
const repository = require("../store/repository");

describe("production readiness protections", () => {
  test("health exposes live and ready checks", async () => {
    expect((await request(app).get("/api/v1/live")).status).toBe(200);
    expect((await request(app).get("/api/v1/ready")).status).toBe(200);
  });

  test("AI support fails clearly without a server key", async () => {
    const response = await request(app).post("/api/v1/ai/support").send({ message: "hello" });
    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/not configured/i);
  });

  test("upload requires authenticated seller/admin", async () => {
    const response = await request(app).post("/api/v1/uploads").attach("image", Buffer.from("not-an-image"), "x.png");
    expect(response.status).toBe(401);
  });

  test("orders require authentication and admin summary is role protected", async () => {
    expect((await request(app).post("/api/v1/orders").send({ items: [] })).status).toBe(401);
    const customer = await request(app).post("/api/v1/auth/register").send({ name: "Customer", email: `customer-${Date.now()}@example.com`, password: "a-secure-password" });
    expect((await request(app).get("/api/v1/admin/summary").set("Authorization", `Bearer ${customer.body.token}`)).status).toBe(403);
  });

  test("registration issues an access token and refresh cookie", async () => {
    const email = `test-${Date.now()}@example.com`;
    const response = await request(app).post("/api/v1/auth/register").send({ name: "Test User", email, password: "a-secure-password" });
    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.headers["set-cookie"].some((cookie) => cookie.startsWith("goodsly_refresh="))).toBe(true);
  });

  test("payment events are idempotent", async () => {
    const first = await repository.paymentEvents.record({ eventId: `evt-${Date.now()}`, provider: "stripe", type: "payment_intent.succeeded" });
    const second = await repository.paymentEvents.record({ eventId: first.event.eventId, provider: "stripe", type: "payment_intent.succeeded" });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
  });

  test("order totals are calculated from catalog prices and payment state persists", async () => {
    const product = await repository.products.create({ name: "Test shoe", price: 37, stock: 3 }, "seller-test");
    const order = await repository.orders.create({ customerId: "customer-test", items: [{ productId: product._id, quantity: 2 }] });
    expect(order.total).toBe(74);
    const paid = await repository.orders.updatePayment(order._id, { provider: "stripe", paymentId: "pi-test", status: "succeeded" });
    expect(paid.payment.status).toBe("succeeded");
  });
});
