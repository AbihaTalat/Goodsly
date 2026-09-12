# Goodsly

Goodsly is a multi-vendor sports and performance-gear storefront built with React, Express, and MongoDB. The product experience focuses on considered catalogue browsing, clear product colorways, a lightweight cart, and role-aware account workspaces for customers, sellers, and administrators.

[![Frontend build](https://img.shields.io/badge/frontend-React%2019-61dafb)](./frontend)
[![Backend](https://img.shields.io/badge/backend-Express%205-000000)](./backend)
[![Database](https://img.shields.io/badge/database-MongoDB-47A248)](./backend/db/Database.js)

## Current status

The repository contains a working storefront and API foundation with optional integrations that fail clearly when credentials are absent.

### Implemented

- React storefront with responsive catalogue and product detail pages
- Product categories, text search, tags, and color-aware filtering
- Named color swatches in catalogue cards and product details
- Cart, quantity controls, wishlist, and checkout form
- Customer, seller, and admin authentication with short-lived JWT access tokens, hashed rotating refresh tokens, secure cookies, password reset and email verification token flows
- Password hashing with bcrypt
- Seller product publishing
- Admin order summary and status management
- MongoDB persistence with a development fallback repository
- CORS, bounded JSON parsing, centralized API errors, and health endpoint
- Helmet security headers and API rate limiting
- Socket.IO authenticated buyer/seller chat with persisted history
- In-app notifications, Web Push subscription endpoint, and service worker
- Seller analytics, multipart image uploads with Cloudinary or explicit local fallback
- Backend-calculated order totals with persisted payment lifecycle, idempotent Stripe webhook events for success/failure/refunds, and a PayPal REST create/capture/refund adapter
- Gemini-powered public support agent on the Shop page for scoped product, order, shipping, and returns questions
- Structured Pino request logging with redaction, live/ready health endpoints, optional Redis Socket.IO adapter, Docker and GitHub Actions CI workflow
- Local setup configuration and MongoDB Atlas example configuration

### Limitations

- Web Push subscriptions currently acknowledge valid subscriptions; durable subscription fan-out should be connected to a production notification worker.
- PayPal webhooks are intentionally not accepted until provider signature verification is configured; PayPal capture/refund routes use the REST API.
- The JSON repository is a development fallback; production should use MongoDB.
- Password reset and verification delivery requires an SMTP/notification worker; development token output is opt-in and disabled in production.

See the complete architecture and delivery plan in [CASE-STUDY.md](./CASE-STUDY.md).

## Repository structure

```text
Goodsly/
├── backend/
│   ├── config/          Environment templates
│   ├── db/              Mongoose connection
│   ├── middleware/      Authentication and error handling
│   ├── models/         User, product, and order schemas
│   ├── routes/          Auth, product, order, and admin APIs
│   ├── store/           MongoDB-aware repository and dev fallback
│   └── server.js        API process entry point
├── frontend/
│   └── src/
│       ├── components/  Auth and reusable storefront components
│       ├── data/        Catalogue seed data
│       ├── pages/       Storefront, checkout, account, and story pages
│       └── utils/       API and local cart storage helpers
├── CASE-STUDY.md
└── package.json
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB 7+ locally, or a MongoDB Atlas connection string

## Local setup

1. Install root dependencies:

   ```bash
   npm install
   ```

2. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. Configure the backend:

   ```bash
   copy backend\config\.env.example backend\config\.env
   ```

   Set `DB_URL` to a local MongoDB database or a complete Atlas URI. Add a strong `JWT_SECRET` before using authentication outside development.
   To enable the Shop support agent, set `GEMINI_API_KEY` (server-side only) and optionally change `GEMINI_MODEL`. Without a key, the support endpoint returns a clear `503` and the key is never sent to the browser.

4. Start the API:

   ```bash
   npm run dev
   ```

   The API runs at `http://localhost:8000`.

5. In a second terminal, start the frontend:

   ```bash
   cd frontend
   npm start
   ```

   The storefront runs at `http://localhost:3000`.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/live` | Liveness probe |
| GET | `/api/v1/ready` | Readiness probe for MongoDB/configuration |
| GET | `/api/v1/health` | API, database, and storage health |
| POST | `/api/v1/auth/register` | Create a customer or seller account |
| POST | `/api/v1/auth/login` | Authenticate a user |
| POST | `/api/v1/auth/refresh` | Rotate a secure refresh cookie and issue an access token |
| POST | `/api/v1/auth/logout` | Revoke the refresh token |
| POST | `/api/v1/auth/forgot-password` | Start a password reset (delivery is deployment-configured) |
| POST | `/api/v1/auth/reset-password` | Consume a one-time password reset token |
| POST | `/api/v1/auth/verify-email` | Consume a one-time email verification token |
| GET | `/api/v1/products` | List and filter products |
| POST | `/api/v1/products` | Publish a product as seller/admin |
| POST | `/api/v1/orders` | Create an authenticated order |
| GET | `/api/v1/orders` | List the current user's orders |
| PATCH | `/api/v1/orders/:id/status` | Update an order as seller/admin |
| GET | `/api/v1/admin/summary` | View admin sales summary |
| GET/POST | `/api/v1/chat/conversations` | List or create chat conversations |
| GET/POST | `/api/v1/chat/conversations/:id/messages` | Read or send messages |
| GET/PATCH | `/api/v1/notifications` | Read and acknowledge in-app notifications |
| GET | `/api/v1/analytics/seller` | Seller-scoped revenue and inventory metrics |
| POST | `/api/v1/uploads` | Upload an image through Cloudinary or local fallback |
| POST | `/api/v1/payments/checkout` | Create a payment against the server-calculated order total |
| POST | `/api/v1/payments/paypal/:paypalOrderId/capture` | Capture a PayPal order |
| POST | `/api/v1/payments/paypal/:captureId/refund` | Admin-only PayPal capture refund |
| POST | `/api/v1/payments/webhooks/stripe` | Verify and idempotently process Stripe payment events |
| GET | `/api/v1/push/config` | Check Web Push configuration |
| POST | `/api/v1/ai/support` | Public, rate-limited Gemini 3.6 Flash support for Goodsly catalogue, orders, shipping, and returns |

The support endpoint validates message size, includes a bounded catalogue snapshot from the repository, and uses a restricted system prompt. It does not perform account or order mutations; customers should contact the Goodsly team for account-specific actions.

## Deployment, backup, and recovery runbook

1. Set `NODE_ENV=production`, a 32+ character random `JWT_SECRET`, `DB_URL`, `FRONTEND_URLS`, and payment webhook secrets in a managed secret store. Never commit `.env`.
2. Deploy the API and run `GET /api/v1/ready` as the readiness probe; use `/api/v1/live` for liveness. Production readiness fails when MongoDB or required configuration is unavailable.
3. Configure Stripe webhook delivery for payment success, failure, and refund events. Configure PayPal REST credentials and use its capture/refund routes only after end-to-end sandbox verification.
4. Back up MongoDB with Atlas continuous backups or `mongodump --uri "$DB_URL" --archive=backup.archive --gzip`; encrypt backups and test restores at least quarterly.
5. Recovery: deploy the last known image, restore the backup to an isolated database, validate `/ready`, replay provider webhooks (the `PaymentEvent` unique key makes replay safe), then switch traffic and monitor structured logs.

## Validation

Build the frontend with:

```bash
cd frontend
npm run build
```

The backend can be smoke-tested with:

```bash
curl http://localhost:8000/api/v1/health
```

## Documentation

- [Complete case study and architecture diagrams](./CASE-STUDY.md)
- [Frontend setup](./frontend/README.md)
- [Backend configuration template](./backend/config/.env.example)

## License

This project is currently published without a declared open-source license. Add a license before accepting external contributions or redistributing it.
