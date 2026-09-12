# Goodsly — Multi-Vendor E-commerce Platform Case Study

## Executive summary

Goodsly is a React and Express commerce platform for performance clothing and sports equipment. It combines a visual storefront with JWT-authenticated customer, seller, and admin workspaces. The current release provides catalogue discovery, product colorway presentation, cart and checkout flows, seller publishing, administrative order operations, real-time chat, notifications, analytics, optional payments/media integrations, and MongoDB-backed persistence.

This document separates shipped functionality from planned platform extensions. That distinction keeps the case study technically accurate while showing how Goodsly can grow into the complete multi-vendor architecture.

### AI support agent

The Shop page includes a compact SupportAgent widget backed by `POST /api/v1/ai/support`. The public endpoint is IP rate-limited and accepts bounded conversation history. The server calls Gemini 3.6 Flash through its REST API using the server-only `GEMINI_API_KEY`, injects a bounded snapshot of repository products as context, and applies a system prompt restricted to Goodsly catalogue, orders, shipping, checkout, and returns support. Missing credentials return `503`; the agent cannot mutate orders or access account data.

## Goals

1. Make performance products easy to discover through categories, search, tags, and colorways.
2. Give sellers a simple path to publish products.
3. Give administrators visibility into orders and revenue.
4. Provide a secure foundation for payments, messaging, media, and notifications.
5. Keep the system modular enough to scale from a single deployment to multiple API and WebSocket instances.

## Product experience

### Implemented user roles

| Role | Current capabilities |
| --- | --- |
| Buyer/customer | Register, log in, browse, search, save wishlist items, manage cart, submit checkout, view local order history |
| Seller | Register, publish products, view seller catalogue, access authenticated APIs |
| Admin | View order summary, inspect recent orders, update order status |

### Implemented catalogue behavior

- Product cards with category, price, badge, description, and named color swatches
- Product detail pages with image, description, colorways, sizes, cart action, and wishlist action
- Search across name, category, description, color, and product tags
- Category tabs for Running, Training, Basketball, Football, Studio, Outdoor, and All
- Basketball catalogue content including an actual jersey image

## System architecture

```mermaid
flowchart LR
    Browser[React storefront] --> Router[React Router]
    Router --> Pages[Shop, detail, checkout, dashboard]
    Pages --> Local[Local cart and wishlist storage]
    Pages --> API[Express REST API]
    Pages --> Support[SupportAgent widget]
    Support --> AI[Gemini REST API via server]
    API --> Auth[JWT and bcrypt authentication]
    API --> Repository[Repository abstraction]
    Repository --> Mongo[(MongoDB via Mongoose)]
    Repository --> Fallback[Development JSON repository]
    API --> Errors[Central error middleware]
```

The repository abstraction allows local development to continue when MongoDB is unavailable. Production deployments should use MongoDB as the authoritative store and should disable or tightly constrain fallback persistence.

## Application flows

### Buyer flow

```mermaid
flowchart TD
    Start[Open Goodsly] --> Browse[Browse catalogue]
    Browse --> Filter[Search or filter]
    Filter --> Detail[Open product detail]
    Detail --> Wishlist[Optional: save wishlist item]
    Detail --> Cart[Add product to cart]
    Cart --> Checkout[Enter checkout details]
    Checkout --> Order[Create authenticated order]
    Order --> History[View order history]
```

### Seller flow

```mermaid
flowchart TD
    Seller[Seller registration/login] --> Dashboard[Seller dashboard]
    Dashboard --> Form[Product publishing form]
    Form --> Validate[API validates fields]
    Validate --> Store[Store product and seller ownership]
    Store --> Catalogue[Seller catalogue]
```

### Admin flow

```mermaid
flowchart TD
    Admin[Admin login] --> Summary[Summary metrics]
    Admin --> Orders[Recent orders]
    Orders --> Status[Update order status]
    Status --> Persist[Persist status in repository]
```

## Data model

```mermaid
erDiagram
    USER ||--o{ PRODUCT : publishes
    USER ||--o{ ORDER : places
    PRODUCT ||--o{ ORDER_ITEM : appears_in
    ORDER ||--|{ ORDER_ITEM : contains

    USER {
        string id
        string name
        string email
        string passwordHash
        string role
        date createdAt
    }
    PRODUCT {
        string id
        string sellerId
        string name
        string description
        string category
        string image
        number price
        number stock
    }
    ORDER {
        string id
        string customerId
        number total
        string status
        object shippingAddress
        date createdAt
    }
    ORDER_ITEM {
        string productId
        string name
        number quantity
        number price
        number subtotal
    }
```

## API architecture

The API is organized by business capability:

- `/api/v1/auth` — registration, login, and current-user lookup
- `/api/v1/products` — public listing plus seller/admin publishing and management
- `/api/v1/orders` — authenticated order creation, listing, and status updates
- `/api/v1/admin` — admin-only summary and order operations
- `/api/v1/health` — deployment health signal
- `/api/v1/ai/support` — public, rate-limited Gemini support endpoint

Authentication is enforced by middleware that verifies a JWT and attaches the public user to the request. Role authorization is applied to seller and admin routes.

## Tech stack

### Current implementation

| Area | Technology |
| --- | --- |
| Frontend | React 19, React Router, React Icons, Create React App |
| Backend | Node.js, Express 5 |
| Persistence | MongoDB, Mongoose, development JSON repository |
| Authentication | JWT, bcrypt |
| Configuration | dotenv |
| Frontend state | React state and local storage for cart/wishlist |
| AI support | Gemini REST API via server-side `fetch` (no SDK dependency) |

### Optional platform extensions

| Capability | Proposed technology |
| --- | --- |
| Real-time chat | Socket.IO with authenticated rooms and persisted message history (Redis adapter remains a scale-out option) |
| Payments | Stripe payment intents and signed webhook verification; PayPal configuration is detected and fails clearly until its API adapter is supplied |
| Media | Cloudinary upload stream with validated local data-URL fallback |
| Push notifications | In-app notification APIs, Web Push configuration/subscription endpoint, and service worker |
| Analytics | Seller-scoped repository metrics and dashboard cards |
| Delivery | Docker, docker-compose, and GitHub Actions CI |
| Monitoring | Sentry, structured logs, uptime checks |

## Advanced architecture roadmap

### Real-time messaging

`Conversation` and `Message` models, authenticated Socket.IO connections, conversation rooms, message persistence, and REST history endpoints are implemented. The server derives the sender from the verified socket identity rather than trusting a client-supplied user ID. Read receipts and typing indicators remain follow-up enhancements.

### Payments

The payment service exposes a provider interface, creates Stripe payment intents, and verifies signed Stripe webhooks. Credentials are mandatory and missing configuration returns a clear 503/501 rather than fake success. PayPal order creation and verification remains an explicit integration limitation.

### Notifications

Persisted in-app notifications and read APIs are implemented, with Web Push VAPID configuration, subscription validation, and a service worker. A production worker should connect subscriptions to fan-out delivery.

### Seller analytics

Seller-scoped revenue, order, units, and inventory metrics are exposed through `/analytics/seller` and rendered in the seller workspace. Time-series charts can be added without changing the endpoint boundary.

### Cloud media

Multipart uploads enforce seller authorization, image MIME type, and a 5 MB limit. Cloudinary stores production assets when configured; otherwise the API returns an explicit local data URL suitable for development.

## Security and reliability plan

The current application has JWT role checks, bcrypt password hashing, CORS allowlisting, bounded request parsing, centralized errors, Helmet, and rate limiting. Before production, add:

- Strong required JWT secrets and secret management
- Request schema validation and sanitization
- Helmet security headers and rate limiting
- Refresh-token rotation, email verification, and password reset
- Signed payment webhooks
- Upload scanning and file restrictions
- Structured logs, audit trails, Sentry, and dependency monitoring
- Automated tests for authorization, stock, order totals, and webhook idempotency

## CI/CD and deployment plan

```mermaid
flowchart LR
    Commit[Git push or pull request] --> CI[GitHub Actions]
    CI --> Install[Install dependencies]
    Install --> Checks[Lint, test, build]
    Checks --> Image[Build Docker image]
    Image --> Deploy[Deploy staging/production]
    Deploy --> Health[Health and smoke checks]
```

The recommended deployment separates the React static build from the API service. MongoDB Atlas, object storage, Redis, payment providers, and monitoring should be managed services with environment-specific credentials.

## Challenges and solutions

### Keeping product discovery expressive

Products expose category, color, description, and tags so search can match the way customers naturally describe sports gear.

### Supporting development without hiding production failures

The repository abstraction provides a development fallback, while the API health response exposes the active storage mode. Production configuration should require a reachable MongoDB service rather than silently relying on local JSON persistence.

### Protecting role-specific operations

Authentication and role authorization are separate middleware concerns. This keeps public product reads simple while protecting seller publishing and admin operations.

## Best-practice checklist

- [x] Reusable frontend product and colorway components
- [x] API routes separated by business capability
- [x] Centralized error response format
- [x] Role-aware access control
- [x] MongoDB connection configuration
- [ ] Automated test suite for core API behavior
- [ ] Payment provider abstraction and webhook tests
- [ ] Real-time chat authorization and persistence
- [ ] Cloud upload validation
- [ ] Production CI/CD and monitoring

## Conclusion

Goodsly currently delivers the foundation of a multi-vendor commerce product: a refined storefront, role-aware API, product publishing, order operations, and MongoDB support. The architecture diagrams and roadmap define the path to the full case-study platform without presenting unbuilt capabilities as shipped functionality.
