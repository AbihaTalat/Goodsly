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
- Customer, seller, and admin authentication with JWT
- Password hashing with bcrypt
- Seller product publishing
- Admin order summary and status management
- MongoDB persistence with a development fallback repository
- CORS, bounded JSON parsing, centralized API errors, and health endpoint
- Helmet security headers and API rate limiting
- Socket.IO authenticated buyer/seller chat with persisted history
- In-app notifications, Web Push subscription endpoint, and service worker
- Seller analytics, multipart image uploads with Cloudinary or explicit local fallback
- Payment provider abstraction with Stripe intents and signed webhook validation; PayPal configuration is detected but not silently simulated
- Docker and GitHub Actions CI workflow
- Local setup configuration and MongoDB Atlas example configuration

### Limitations

- Web Push subscriptions currently acknowledge valid subscriptions; durable subscription fan-out should be connected to a production notification worker.
- PayPal requires a provider SDK/API adapter before it can create or verify payments.
- The JSON repository is a development fallback; production should use MongoDB.

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
| GET | `/api/v1/health` | API and storage health |
| POST | `/api/v1/auth/register` | Create a customer or seller account |
| POST | `/api/v1/auth/login` | Authenticate a user |
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
| POST | `/api/v1/payments/checkout` | Create a configured Stripe payment intent |
| POST | `/api/v1/payments/webhooks/stripe` | Verify Stripe webhook signatures |
| GET | `/api/v1/push/config` | Check Web Push configuration |

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
