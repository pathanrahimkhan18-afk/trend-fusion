/**
 * TrendFusion — Wishlist Module (FIXED)
 *
 * Fixes from original:
 *  1. Removed toggleWishlistProduct using POST /wishlist/toggle — route does NOT exist
 *  2. Now uses:
 *     POST   /api/wishlist/:productId   → add
 *     DELETE /api/wishlist/:productId   → remove
 *  3. toggleProductInWishlist checks local cache and calls add OR remove accordingly
 *
 * Backend response shapes:
 * GET /api/wishlist
 *   → { data: { wishlist: { user, products: [...full product docs] } } }
 *
 * POST /api/wishlist/:productId
 *   → { data: { wishlist: { products: [...] } } }
 *
 * DELETE /api/wishlist/:productId
 *   → { data: { wishlist: { products: [...] } } }
 */

window.TF = window.TF || {};

window.TF.Wishlist = (() => {

  // Local cache of wishlisted product IDs (string format)
  let wishlistedIds = new Set();

  // ─── Fetch Wishlist ───────────────────────────────────────
  // GET /api/wishlist
  const fetchWishlist = async () => {
    if (!window.TF.Auth.isLoggedIn()) return { products: [] };

    const res     = await window.TF.WishlistAPI.fetchUserWishlist();
    const wishlist = res.data.data.wishlist;
    const products = wishlist?.products || [];

    // Seed local cache — products may be full objects or just IDs
    wishlistedIds = new Set(products.map(p => String(p._id || p)));

    syncHeartIcons();
    return wishlist;
  };

  // ─── Toggle (add or remove) ───────────────────────────────
  // Checks local cache first; calls the correct endpoint
  const toggleProduct = async (productId) => {
    if (!window.TF.Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return null;
    }

    const id = String(productId);
    const isWishlisted = wishlistedIds.has(id);

    try {
      if (isWishlisted) {
        // DELETE /api/wishlist/:productId
        await window.TF.WishlistAPI.removeFromWishlist(productId);
        wishlistedIds.delete(id);
        window.TF.Toast.show('Removed from wishlist', 'info');
      } else {
        // POST /api/wishlist/:productId
        await window.TF.WishlistAPI.addToWishlist(productId);
        wishlistedIds.add(id);
        window.TF.Toast.show('Saved to wishlist', 'success');
      }

      syncHeartIcons();
      return !isWishlisted; // true = now wishlisted
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update wishlist';
      window.TF.Toast.show(msg, 'error');
      throw err;
    }
  };

  // ─── Check single product ─────────────────────────────────
  const isWishlisted = (productId) => wishlistedIds.has(String(productId));

  // ─── Sync all heart icons on page ────────────────────────
  const syncHeartIcons = () => {
    document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
      const pid = btn.dataset.wishlistBtn;
      const wishlisted = wishlistedIds.has(String(pid));
      btn.classList.toggle('is-wishlisted', wishlisted);
      // Keep wishlisted hearts always visible; non-wishlisted fade on hover via CSS
      btn.style.opacity = wishlisted ? '1' : '';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', wishlisted ? '#0f0f0f' : 'none');
    });
  };

  // ─── Public API ───────────────────────────────────────────
  return {
    fetchWishlist,
    toggleProduct,
    isWishlisted,
    syncHeartIcons,
    // legacy aliases
    toggleProductInWishlist: toggleProduct,
    isProductWishlisted:     isWishlisted,
    syncAllHeartIcons:       syncHeartIcons,
  };

})();
