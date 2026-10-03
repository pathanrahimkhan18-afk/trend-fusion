/**
 * TrendFusion — API Service Layer (FIXED)
 *
 * Key fixes from original:
 *  1. Base URL: /api/v1 → /api  (backend has no v1 prefix)
 *  2. Cart endpoints corrected to match backend routes exactly
 *  3. Wishlist toggle replaced with individual add/remove (no /toggle route)
 *  4. Auth refresh endpoint fixed: /auth/refresh-token → /auth/refresh
 *  5. Admin API module added
 */

const BACKEND_BASE_URL = 'http://localhost:5000/api';

// ─── Axios Instance ────────────────────────────────────────────
const httpClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Auto-attach JWT ──────────────────────
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tf_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ─── Response Interceptor: 401 → redirect to login ────────────
httpClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tf_access_token');
      localStorage.removeItem('tf_current_user');
      const protectedPages = ['cart.html', 'wishlist.html', 'profile.html'];
      const page = window.location.pathname.split('/').pop();
      if (protectedPages.includes(page)) {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth API ──────────────────────────────────────────────────
// POST /api/auth/register   → { data: { user, accessToken } }
// POST /api/auth/login      → { data: { user, accessToken } }
// POST /api/auth/logout     → { message }
// POST /api/auth/refresh    → { data: { accessToken } }  ← FIXED (was /refresh-token)
// GET  /api/auth/me         → { data: { user } }
const AuthAPI = {
  registerNewUser:         (payload) => httpClient.post('/auth/register', payload),
  loginWithCredentials:    (payload) => httpClient.post('/auth/login', payload),
  logoutCurrentUser:       ()        => httpClient.post('/auth/logout'),
  refreshAccessToken:      ()        => httpClient.post('/auth/refresh'),   // FIXED
  fetchCurrentUserProfile: ()        => httpClient.get('/auth/me'),
};

// ─── Products API ──────────────────────────────────────────────
// GET /api/products          → { data: { products, pagination } }
// GET /api/products/:id      → { data: { product } }
// GET /api/products/slug/:slug
// POST /api/products/:id/reviews  (protected)
const ProductsAPI = {
  fetchAllProducts:    (params = {}) => httpClient.get('/products', { params }),
  fetchSingleProduct:  (id)          => httpClient.get(`/products/${id}`),
  fetchProductBySlug:  (slug)        => httpClient.get(`/products/slug/${slug}`),
  addReview:           (id, payload) => httpClient.post(`/products/${id}/reviews`, payload),
};

// ─── Categories API ────────────────────────────────────────────
// GET /api/categories
// GET /api/categories/:slug
const CategoriesAPI = {
  fetchAllCategories:    ()     => httpClient.get('/categories'),
  fetchCategoryBySlug:   (slug) => httpClient.get(`/categories/${slug}`),
};

// ─── Cart API ──────────────────────────────────────────────────
// Backend routes (cart.routes.js):
//   GET    /api/cart             → getCart
//   POST   /api/cart             → addToCart    body: { productId, size, quantity }
//   PUT    /api/cart/:itemId     → updateCartItem body: { quantity }
//   DELETE /api/cart             → clearCart
//   DELETE /api/cart/:itemId     → removeFromCart
//
// FIXED: Original used /cart/add, /cart/update, /cart/remove, /cart/clear
const CartAPI = {
  fetchUserCart: () => httpClient.get('/cart'),

  addItemToCart: (productId, size, quantity = 1) => {
    if (!size) throw new Error('size is required');
    return httpClient.post('/cart', { productId, size, quantity });
  },

  // itemId is the cart item's _id (from cart.items[n]._id)
  updateCartItem: (itemId, quantity) =>
    httpClient.put(`/cart/${itemId}`, { quantity }),

  removeFromCart: (itemId) =>
    httpClient.delete(`/cart/${itemId}`),

  clearEntireCart: () =>
    httpClient.delete('/cart'),
};

// ─── Wishlist API ──────────────────────────────────────────────
// Backend routes (wishlist.routes.js):
//   GET    /api/wishlist              → getWishlist
//   POST   /api/wishlist/:productId   → addToWishlist     ← no /toggle endpoint
//   DELETE /api/wishlist              → clearWishlist
//   DELETE /api/wishlist/:productId   → removeFromWishlist
//
// FIXED: Original used POST /wishlist/toggle — that route does NOT exist
const WishlistAPI = {
  fetchUserWishlist:    ()          => httpClient.get('/wishlist'),
  addToWishlist:        (productId) => httpClient.post(`/wishlist/${productId}`),
  removeFromWishlist:   (productId) => httpClient.delete(`/wishlist/${productId}`),
  clearWishlist:        ()          => httpClient.delete('/wishlist'),
};

// ─── Orders API ────────────────────────────────────────────────
// POST /api/orders              → createOrder
// GET  /api/orders/:id          → getOrderById
// POST /api/orders/:id/cancel   → cancelOrder
// GET  /api/users/orders        → getOrderHistory (user's own orders)
const OrdersAPI = {
  createOrder:       (payload) => httpClient.post('/orders', payload),
  fetchOrderById:    (id)      => httpClient.get(`/orders/${id}`),
  cancelOrder:       (id)      => httpClient.post(`/orders/${id}/cancel`),
  fetchOrderHistory: ()        => httpClient.get('/users/orders'),
};

// ─── Payments API ──────────────────────────────────────────────
// POST /api/payments/create-order   → createRazorpayOrder
// POST /api/payments/verify         → verifyPayment
// GET  /api/payments/:orderId       → getPaymentByOrder
const PaymentsAPI = {
  createRazorpayOrder: (payload) => httpClient.post('/payments/create-order', payload),
  verifyPayment:       (payload) => httpClient.post('/payments/verify', payload),
  getPaymentByOrder:   (orderId) => httpClient.get(`/payments/${orderId}`),
};

// ─── User Profile API ──────────────────────────────────────────
// GET  /api/users/profile
// PUT  /api/users/profile
// PUT  /api/users/change-password
// GET  /api/users/addresses
// POST /api/users/addresses
// PUT  /api/users/addresses/:id
// DELETE /api/users/addresses/:id
const UserAPI = {
  getProfile:       ()        => httpClient.get('/users/profile'),
  updateProfile:    (payload) => httpClient.put('/users/profile', payload),
  changePassword:   (payload) => httpClient.put('/users/change-password', payload),
  getAddresses:     ()        => httpClient.get('/users/addresses'),
  addAddress:       (payload) => httpClient.post('/users/addresses', payload),
  updateAddress:    (id, payload) => httpClient.put(`/users/addresses/${id}`, payload),
  deleteAddress:    (id)      => httpClient.delete(`/users/addresses/${id}`),
};

// ─── Admin API ─────────────────────────────────────────────────
// All routes require Authorization: Bearer <adminToken>
// GET    /api/admin/dashboard
// GET    /api/admin/analytics/revenue
// GET    /api/admin/users
// GET    /api/admin/users/:id
// PUT    /api/admin/users/:id/block
// PUT    /api/admin/users/:id/unblock
// DELETE /api/admin/users/:id
// POST   /api/admin/products        (multipart/form-data)
// PUT    /api/admin/products/:id    (multipart/form-data)
// DELETE /api/admin/products/:id
// GET    /api/admin/orders
// PUT    /api/admin/orders/:id/status
// POST   /api/admin/categories
// PUT    /api/admin/categories/:id
// DELETE /api/admin/categories/:id
const AdminAPI = {
  // Dashboard
  getDashboardStats:  ()              => httpClient.get('/admin/dashboard'),
  getRevenueAnalytics:(months = 6)   => httpClient.get('/admin/analytics/revenue', { params: { months } }),

  // Users
  getAllUsers:   (params = {})        => httpClient.get('/admin/users', { params }),
  getUserById:   (id)                 => httpClient.get(`/admin/users/${id}`),
  blockUser:     (id, reason)         => httpClient.put(`/admin/users/${id}/block`, { reason }),
  unblockUser:   (id)                 => httpClient.put(`/admin/users/${id}/unblock`),
  deleteUser:    (id)                 => httpClient.delete(`/admin/users/${id}`),

  // Products (multipart/form-data for image uploads)
  createProduct: (formData) => httpClient.post('/admin/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProduct: (id, formData) => httpClient.put(`/admin/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProduct:      (id)           => httpClient.delete(`/admin/products/${id}`),
  deleteProductImage: (id, imageId)  => httpClient.delete(`/admin/products/${id}/images/${imageId}`),

  // Orders
  getAllOrders:       (params = {})  => httpClient.get('/admin/orders', { params }),
  updateOrderStatus:  (id, payload) => httpClient.put(`/admin/orders/${id}/status`, payload),

  // Categories
  createCategory: (formData) => httpClient.post('/admin/categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateCategory: (id, payload) => httpClient.put(`/admin/categories/${id}`, payload),
  deleteCategory: (id)          => httpClient.delete(`/admin/categories/${id}`),
};

// ─── Expose via global TF namespace ───────────────────────────
window.TF = window.TF || {};
window.TF.httpClient    = httpClient;
window.TF.AuthAPI       = AuthAPI;
window.TF.ProductsAPI   = ProductsAPI;
window.TF.CategoriesAPI = CategoriesAPI;
window.TF.CartAPI       = CartAPI;
window.TF.WishlistAPI   = WishlistAPI;
window.TF.OrdersAPI     = OrdersAPI;
window.TF.PaymentsAPI   = PaymentsAPI;
window.TF.UserAPI       = UserAPI;
window.TF.AdminAPI      = AdminAPI;
