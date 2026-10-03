/**
 * TrendFusion — Cart Module (FIXED)
 *
 * Fixes from original:
 *  1. addItemToCart: POST /cart (not /cart/add)
 *  2. updateCartItem: PUT /cart/:itemId with item's _id (not /cart/update with productId+size)
 *  3. removeFromCart: DELETE /cart/:itemId (not /cart/remove with body)
 *  4. clearCart: DELETE /cart (not /cart/clear)
 *
 * Backend cart item shape:
 * {
 *   _id      : ObjectId   ← use this as itemId for PUT/DELETE
 *   product  : ObjectId
 *   name     : String
 *   brand    : String
 *   price    : Number
 *   image    : String
 *   size     : String
 *   quantity : Number (1–10)
 * }
 *
 * Backend cart virtuals:
 *   totalItems : Number
 *   subtotal   : Number
 */

window.TF = window.TF || {};

window.TF.Cart = (() => {

  let cartState = null;

  // ─── Fetch Cart ───────────────────────────────────────────
  // GET /api/cart
  const fetchCart = async () => {
    const res   = await window.TF.CartAPI.fetchUserCart();
    cartState   = res.data.data.cart;
    updateCartBadge();
    return cartState;
  };

  // ─── Add Item ─────────────────────────────────────────────
  // POST /api/cart  body: { productId, size, quantity }
  // size is REQUIRED — backend validates against product sizes
  const addItemToCart = async (productId, size, quantity = 1) => {
    if (!window.TF.Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    if (!size) {
      window.TF.Toast.show('Please select a size', 'error');
      return;
    }

    try {
      const res  = await window.TF.CartAPI.addItemToCart(productId, size, quantity);
      cartState  = res.data.data.cart;
      updateCartBadge();
      window.TF.Toast.show('Added to cart', 'success');
      return cartState;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add to cart';
      window.TF.Toast.show(msg, 'error');
      throw err;
    }
  };

  // ─── Update Item Quantity ─────────────────────────────────
  // PUT /api/cart/:itemId  body: { quantity }
  // itemId = cart item's _id (NOT productId)
  const updateItemQuantity = async (itemId, quantity) => {
    try {
      const res  = await window.TF.CartAPI.updateCartItem(itemId, quantity);
      cartState  = res.data.data.cart;
      updateCartBadge();
      return cartState;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update quantity';
      window.TF.Toast.show(msg, 'error');
      throw err;
    }
  };

  // ─── Remove Item ──────────────────────────────────────────
  // DELETE /api/cart/:itemId
  // itemId = cart item's _id
  const removeFromCart = async (itemId) => {
    try {
      const res  = await window.TF.CartAPI.removeFromCart(itemId);
      cartState  = res.data.data.cart;
      updateCartBadge();
      window.TF.Toast.show('Item removed', 'info');
      return cartState;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove item';
      window.TF.Toast.show(msg, 'error');
      throw err;
    }
  };

  // ─── Clear Cart ───────────────────────────────────────────
  // DELETE /api/cart
  const clearCart = async () => {
    await window.TF.CartAPI.clearEntireCart();
    cartState = { items: [], totalItems: 0, subtotal: 0 };
    updateCartBadge();
  };

  // ─── Cart Badge ───────────────────────────────────────────
  const updateCartBadge = () => {
    const badge = document.querySelector('[data-cart-count]');
    if (!badge) return;
    const count = cartState?.items?.length || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  };

  // ─── Subtotal ─────────────────────────────────────────────
  const getSubtotal = () => {
    if (cartState?.subtotal) return cartState.subtotal;
    if (!cartState?.items?.length) return 0;
    return cartState.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  // ─── Public API ───────────────────────────────────────────
  return {
    fetchCart,
    addItemToCart,
    updateItemQuantity,
    removeFromCart,
    clearCart,
    getSubtotal,
    updateCartBadge,
    // legacy aliases
    addItemToCartAlias:   addItemToCart,
    removeItemFromCart:   removeFromCart,
    clearAllCartItems:    clearCart,
    calculateCartSubtotal: getSubtotal,
    refreshCartBadgeCount: updateCartBadge,
  };

})();
