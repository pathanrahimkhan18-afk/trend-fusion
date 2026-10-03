# 🛍️ Trend Fusion — Premium Fashion E-Commerce Backend

A production-ready REST API built with Node.js, Express, MongoDB, and Razorpay.

---

## 📁 Project Structure

```
trend-fusion/
├── server.js                   # Entry point
├── .env.example                # Environment variables template
├── package.json
│
├── config/
│   ├── db.js                   # MongoDB connection
│   ├── cloudinary.js           # Image upload config
│   └── razorpay.js             # Payment gateway config
│
├── models/
│   ├── user.model.js           # Users (roles, soft delete, addresses)
│   ├── product.model.js        # Products (variants, reviews, search)
│   ├── category.model.js       # Categories (hierarchy, slugs)
│   ├── cart.model.js           # Shopping cart
│   ├── wishlist.model.js       # Wishlist
│   ├── order.model.js          # Orders (full lifecycle tracking)
│   └── payment.model.js        # Razorpay transactions
│
├── controllers/
│   ├── auth.controller.js      # Register, login, refresh, logout
│   ├── user.controller.js      # Profile, addresses, order history
│   ├── product.controller.js   # CRUD, search, filter, reviews
│   ├── category.controller.js  # Category management
│   ├── cart.controller.js      # Cart CRUD
│   ├── wishlist.controller.js  # Wishlist management
│   ├── order.controller.js     # Create, track, cancel orders
│   ├── payment.controller.js   # Razorpay integration + webhook
│   └── admin.controller.js     # Dashboard, analytics, user/order mgmt
│
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── product.routes.js
│   ├── category.routes.js
│   ├── cart.routes.js
│   ├── wishlist.routes.js
│   ├── order.routes.js
│   ├── payment.routes.js
│   └── admin.routes.js
│
├── middleware/
│   ├── auth.middleware.js      # JWT protect + optionalAuth
│   ├── role.middleware.js      # restrictTo("admin")
│   ├── rateLimiter.js          # Global, auth, payment limiters
│   └── errorHandler.js        # Centralised error handling
│
├── utils/
│   ├── jwt.utils.js            # Token generation & verification
│   ├── response.utils.js       # successResponse, AppError, pagination
│   ├── validators.js           # All Joi schemas + validate() middleware
│   └── logger.js               # Winston logger
│
└── logs/
    ├── error.log
    ├── combined.log
    └── exceptions.log
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your MongoDB URI, JWT secrets, Cloudinary keys, Razorpay keys
```

### 3. Run development server
```bash
npm run dev
```

### 4. Health check
```
GET http://localhost:5000/health
```

---

## 🔐 Authentication Flow

```
POST /api/auth/register   → { name, email, password, phone }
POST /api/auth/login      → { email, password }
                          ← { accessToken, user }

# Add to all protected requests:
Authorization: Bearer <accessToken>

POST /api/auth/refresh    → { refreshToken }  (or cookie)
POST /api/auth/logout
GET  /api/auth/me
```

---

## 📦 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/refresh` | ❌ | Refresh access token |
| POST | `/api/auth/logout` | ✅ | Logout |
| GET | `/api/auth/me` | ✅ | Get current user |

### User Panel
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/avatar` | Upload avatar |
| PUT | `/api/users/change-password` | Change password |
| GET/POST | `/api/users/addresses` | List / add address |
| PUT/DELETE | `/api/users/addresses/:id` | Update / remove address |
| GET | `/api/users/orders` | Order history |
| GET | `/api/users/orders/:id` | Single order |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | ❌ | List with search & filters |
| GET | `/api/products/:id` | ❌ | Product detail |
| GET | `/api/products/slug/:slug` | ❌ | By slug |
| POST | `/api/products/:id/reviews` | ✅ | Add review |

**Product Filters (query params):**
```
?q=shirt          Full-text search
?category=<id>    Filter by category
?brand=Nike       Filter by brand
?gender=men       men | women | unisex | kids
?minPrice=500&maxPrice=2000
?rating=4         Minimum rating
?featured=true
?newArrival=true
?inStock=true
?sortBy=price&sortOrder=asc
?page=1&limit=12
```

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | View cart |
| POST | `/api/cart` | Add item `{ productId, quantity, size, color }` |
| PUT | `/api/cart/:itemId` | Update quantity `{ quantity }` |
| DELETE | `/api/cart/:itemId` | Remove item |
| DELETE | `/api/cart` | Clear cart |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist/:productId` | Add product |
| DELETE | `/api/wishlist/:productId` | Remove product |
| DELETE | `/api/wishlist` | Clear wishlist |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order from cart |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/orders/:id/cancel` | Cancel order |

### Payments (Razorpay)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment signature |
| POST | `/api/payments/webhook` | Razorpay webhook handler |
| GET | `/api/payments/:orderId` | Get payment by order |

**Payment Flow:**
```
1. User creates order  →  POST /api/orders
2. Get Razorpay order  →  POST /api/payments/create-order { orderId }
3. Open Razorpay SDK   →  Use razorpayOrderId + keyId from step 2
4. After payment       →  POST /api/payments/verify
                           { razorpay_order_id, razorpay_payment_id, razorpay_signature }
5. Webhook (parallel)  →  Razorpay calls POST /api/payments/webhook
```

### Admin Panel (requires `role: admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Stats: users, orders, revenue |
| GET | `/api/admin/analytics/revenue` | Revenue by month |
| GET | `/api/admin/users` | List users (search, filter, paginate) |
| PUT | `/api/admin/users/:id/block` | Block user |
| PUT | `/api/admin/users/:id/unblock` | Unblock user |
| DELETE | `/api/admin/users/:id` | Soft delete user |
| POST | `/api/admin/products` | Create product (multipart/form-data) |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Soft delete product |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/:id` | Update category |
| GET | `/api/admin/orders` | All orders (filter by status) |
| PUT | `/api/admin/orders/:id/status` | Update order status |

**Valid order statuses:**
`pending` → `confirmed` → `processing` → `shipped` → `out_for_delivery` → `delivered`
Can also be: `cancelled`, `return_requested`, `returned`, `refunded`

---

## 🗄️ Database Models Overview

### User
- name, email, password (hashed), phone, avatar
- role: `user | admin`
- addresses (up to 5, with default flag)
- isBlocked, isDeleted (soft delete)
- lastLogin, passwordChangedAt

### Product
- name, slug (auto), description, price, compareAtPrice
- category (ref), brand, tags, gender
- images (up to 6, Cloudinary)
- variants: `[{ size, color, stock, sku }]`
- totalStock (computed), totalSold
- reviews with averageRating
- isFeatured, isNewArrival, isBestSeller
- Full-text search index on name, description, brand, tags

### Order
- orderNumber (auto: `TF-XXXXX-XXXX`)
- items snapshot (price locked at order time)
- shippingAddress (embedded)
- subtotal, shippingCharge, tax, totalAmount
- status + paymentStatus
- trackingHistory array
- cancellation fields

### Payment
- razorpayOrderId, razorpayPaymentId, razorpaySignature
- amount (paise), currency
- status: `created | captured | failed | refunded`
- webhookPayload, webhookVerified
- refund tracking

---

## 🛡️ Security Features

- **Helmet** — HTTP security headers
- **CORS** — configurable origin
- **bcryptjs** — password hashing (12 rounds)
- **JWT** — short-lived access + long-lived refresh token
- **Rate limiting** — global (100/15min), auth (20/15min), payments (30/hr)
- **Input validation** — Joi on all request bodies
- **Soft deletes** — no hard data loss
- **Role-based access** — user / admin middleware
- **Razorpay HMAC** — signature verification on payment & webhook
- **Mongoose query middleware** — auto-excludes deleted documents

---

## 🚀 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong random `JWT_SECRET` (32+ chars)
- [ ] Configure `CLIENT_URL` for CORS
- [ ] Set up MongoDB Atlas with IP whitelist
- [ ] Add Cloudinary production account
- [ ] Configure Razorpay production keys
- [ ] Set Razorpay webhook URL in dashboard
- [ ] Set up PM2 or Docker for process management
- [ ] Add SSL/TLS (nginx reverse proxy)
- [ ] Monitor logs in `/logs/`
