/**
 * TrendFusion — Main Bootstrap
 *
 * Initialises all shared UI systems on every page:
 *   - Toast notification service
 *   - Skeleton loader helper
 *   - ProductCard HTML component factory
 *   - Global inline-event handlers (wishlist hearts, quick-add buttons)
 *   - DOM-ready bootstrap (auth sync, animation init, mobile menu, logout)
 *
 * Load order in each HTML file:
 *   api.js → auth.js → cart.js → wishlist.js → animations.js → main.js
 */

window.TF = window.TF || {};

// ─── Toast Notification Service ───────────────────────────────
/**
 * Lightweight, self-contained toast system.
 * Call window.TF.Toast.show('Message', 'success' | 'error' | 'info')
 * from anywhere. Toasts auto-dismiss after `displayDurationMs`.
 */
window.TF.Toast = (() => {

  let toastContainerElement = null;

  const TOAST_BACKGROUND_COLORS = {
    success : '#0f0f0f',
    error   : '#dc2626',
    info    : '#44403c',
  };

  const TOAST_ICON_SVG = {
    success : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
    error   : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info    : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  };

  /** Lazily creates the fixed container div on first use */
  const createToastContainer = () => {
    toastContainerElement = document.createElement('div');
    toastContainerElement.id = 'tf-toast-container';
    toastContainerElement.style.cssText = [
      'position:fixed', 'top:24px', 'right:24px', 'z-index:9999',
      'display:flex', 'flex-direction:column', 'gap:10px', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(toastContainerElement);
  };

  /**
   * Display a toast notification.
   * @param {string} messageText       - Human-readable message
   * @param {'success'|'error'|'info'} toastType
   * @param {number}  displayDurationMs - How long before auto-dismiss
   */
  const showToastNotification = (messageText, toastType = 'success', displayDurationMs = 3000) => {
    if (!toastContainerElement) createToastContainer();

    const backgroundColor = TOAST_BACKGROUND_COLORS[toastType] || TOAST_BACKGROUND_COLORS.info;
    const iconMarkup      = TOAST_ICON_SVG[toastType] || '';

    const toastElement = document.createElement('div');
    toastElement.style.cssText = [
      'pointer-events:auto',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'padding:13px 18px',
      'font-size:11px',
      'letter-spacing:0.08em',
      `font-family:var(--font-body)`,
      `background:${backgroundColor}`,
      'color:white',
      'box-shadow:0 8px 30px rgba(0,0,0,0.25)',
      'min-width:200px',
      'transform:translateX(60px)',
      'opacity:0',
      'transition:all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
    ].join(';');

    toastElement.innerHTML = `${iconMarkup}<span>${messageText}</span>`;
    toastContainerElement.appendChild(toastElement);

    // Animate in on next frame (allows transition to apply from the initial state)
    requestAnimationFrame(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
    });

    // Animate out then remove from DOM
    setTimeout(() => {
      toastElement.style.transform = 'translateX(80px)';
      toastElement.style.opacity = '0';
      setTimeout(() => toastElement.remove(), 400);
    }, displayDurationMs);
  };

  return { show: showToastNotification, init: createToastContainer };

})();


// ─── Skeleton Loader Helper ───────────────────────────────────
/**
 * Renders placeholder skeleton cards while product data is being fetched.
 * The shimmer animation is defined via the `pulse` keyframe in main.js init.
 */
window.TF.Skeleton = {

  /** Generates the HTML for a single skeleton product card */
  buildProductCardSkeleton: () => `
    <div style="cursor:default;">
      <div style="aspect-ratio:3/4;background:#e8e4de;margin-bottom:14px;animation:pulse 1.5s ease infinite;"></div>
      <div style="height:10px;background:#e8e4de;width:35%;margin-bottom:8px;animation:pulse 1.5s ease infinite;"></div>
      <div style="height:13px;background:#e8e4de;width:70%;margin-bottom:8px;animation:pulse 1.5s ease infinite;"></div>
      <div style="height:13px;background:#e8e4de;width:25%;animation:pulse 1.5s ease infinite;"></div>
    </div>
  `,

  /**
   * Fills a container with `skeletonCount` skeleton cards.
   * @param {HTMLElement} gridContainerElement
   * @param {number}      skeletonCount
   */
  renderSkeletonsInGrid: (gridContainerElement, skeletonCount = 8) => {
    if (!gridContainerElement) return;
    gridContainerElement.innerHTML = Array(skeletonCount)
      .fill(window.TF.Skeleton.buildProductCardSkeleton())
      .join('');
  },
};


// ─── Price Formatter Utility ──────────────────────────────────
/** Formats a raw number into a USD currency string, e.g. 295 → "$295.00" */
window.TF.formatCurrencyUSD = (rawPriceValue) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rawPriceValue || 0);


// ─── Product Card Component ───────────────────────────────────
/**
 * Pure function — receives a Product document from GET /api/v1/products
 * and returns the HTML string for a single product card.
 *
 * Key field notes:
 *   product.images   → Array of URLs (use [0] for the thumbnail)
 *   product.sizes    → Array of size strings (use [0] as the default for Quick Add)
 *   product.oldPrice → Nullable — only present when the product is on sale
 *   product.badge    → 'New' | 'Sale' | 'Hot' | null
 */
window.TF.buildProductCardHTML = (productData) => {
  const thumbnailImageUrl  = productData.images?.[0]?.url
    || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80';

  const fallbackImageUrl   = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80';

  const badgeLabelColor    = productData.badge === 'Sale' ? '#dc2626' : '#0f0f0f';
  const saleBadgeMarkup    = productData.badge
    ? `<span style="position:absolute;top:10px;left:10px;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;background:${badgeLabelColor};color:white;padding:4px 8px;z-index:2;">${productData.badge}</span>`
    : '';

  const originalPriceMarkup = productData.compareAtPrice
    ? `<span style="font-size:12px;text-decoration:line-through;color:#bbb;margin-right:6px;">${window.TF.formatCurrencyUSD(productData.compareAtPrice)}</span>`
    : '';

  // Quick Add uses the first available size (users pick a different size on the product page)
  const firstAvailableSize  = productData.variants?.[0]?.size || '';
  const isAlreadyWishlisted = window.TF.Wishlist?.isProductWishlisted(productData._id);
  const heartFillColor      = isAlreadyWishlisted ? '#0f0f0f' : 'none';
  const currentPriceColor   = productData.compareAtPrice ? '#dc2626' : '#0f0f0f';

  return `
    <article class="product-card" data-product-id="${productData._id}" style="cursor:pointer;">
      <div style="position:relative;overflow:hidden;aspect-ratio:3/4;background:#f5f0e8;margin-bottom:14px;">

        ${saleBadgeMarkup}

        <img
          class="product-img"
          src="${thumbnailImageUrl}"
          alt="${productData.name}"
          loading="lazy"
          style="width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(15%);transition:transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94),filter 0.5s ease;"
          onerror="this.src='${fallbackImageUrl}'"
        />

        <!-- Wishlist heart — shown on card hover via CSS (.product-card:hover .wishlist-btn) -->
        <button
          class="wishlist-btn${isAlreadyWishlisted ? ' is-wishlisted' : ''}"
          data-wishlist-btn="${productData._id}"
          onclick="event.stopPropagation(); handleProductWishlistToggle('${productData._id}', this)"
          aria-label="Toggle wishlist for ${productData.name}"
          style="position:absolute;top:10px;right:10px;width:34px;height:34px;background:rgba(255,255,255,0.92);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.25s ease;backdrop-filter:blur(4px);z-index:3;"
        >
          <svg class="heart-icon" width="15" height="15" viewBox="0 0 24 24" fill="${heartFillColor}" stroke="#0f0f0f" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
          </svg>
        </button>

        <!-- Quick Add bar — slides up from the bottom via CSS (.product-card:hover .quick-add-btn) -->
        <button
          class="quick-add-btn"
          onclick="event.stopPropagation(); handleQuickAddToCart('${productData._id}', '${firstAvailableSize}')"
          style="position:absolute;bottom:0;left:0;right:0;transform:translateY(100%);background:#0f0f0f;color:white;border:none;padding:13px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94);font-family:var(--font-body);z-index:3;"
        >
          Quick Add — ${firstAvailableSize || 'Select Size'}
        </button>
      </div>

      <!-- Product info — clicking navigates to the detail page -->
     <a href="#" onclick="event.preventDefault(); window.location.href='./product.html?id=${productData._id}'" style="text-decoration:none;color:inherit;display:block;">
        <p style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#8c8880;margin-bottom:4px;">${productData.brand}</p>
        <h3 style="font-size:13px;color:#0f0f0f;margin-bottom:6px;line-height:1.35;font-weight:500;">${productData.name}</h3>
        <div style="display:flex;align-items:center;">
          ${originalPriceMarkup}
          <span style="font-size:13px;font-weight:600;color:${currentPriceColor};">${window.TF.formatCurrencyUSD(productData.price)}</span>
        </div>
      </a>
    </article>
  `;
};

// Keep a short alias used in HTML inline event strings — easier to read in markup
window.TF.ProductCard = window.TF.buildProductCardHTML;


// ─── Global Inline-Event Handlers ────────────────────────────
/**
 * These live on `window` because they are called from inline onclick
 * attributes inside dynamically-generated HTML strings. Putting them
 * here keeps them out of individual page scripts.
 */

/** Handles heart button click on any product card anywhere on the site */
window.handleProductWishlistToggle = async (productId, heartButtonElement) => {
  const isNowWishlisted = await window.TF.Wishlist.toggleProductInWishlist(productId);

  if (isNowWishlisted !== null) {
    const heartSvgElement = heartButtonElement.querySelector('svg');
    if (heartSvgElement) {
      heartSvgElement.setAttribute('fill', isNowWishlisted ? '#0f0f0f' : 'none');
    }
  }
};

/**
 * Handles "Quick Add" button on product cards.
 * Uses the product's first available size. If no size is available,
 * prompts the user to open the product detail page instead.
 */
window.handleQuickAddToCart = async (productId, firstAvailableSize) => {
  if (!firstAvailableSize) {
    window.TF.Toast.show('Please open the product to select your size', 'info');
    return;
  }
  await window.TF.Cart.addItemToCart(productId, firstAvailableSize, 1);
};


// ─── DOM-Ready Bootstrap ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Initialise toast container early so it's ready before any async calls
  window.TF.Toast.init();

  // Reflect auth state in the navbar before any other rendering
  window.TF.Auth.syncNavbarWithAuthState();

  // Boot all GSAP + Lenis animations
  window.TF.Animations.initialiseAllAnimations();

  // Inject the CSS keyframe for skeleton shimmer animation
  if (!document.getElementById('tf-skeleton-pulse-style')) {
    const shimmerStyleElement = document.createElement('style');
    shimmerStyleElement.id = 'tf-skeleton-pulse-style';
    shimmerStyleElement.textContent = `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`;
    document.head.appendChild(shimmerStyleElement);
  }

  // Wire up logout buttons (any element with [data-logout] attribute)
  document.querySelectorAll('[data-logout]').forEach((logoutTriggerElement) => {
    logoutTriggerElement.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      window.TF.Auth.logoutUser();
    });
  });

  // Mobile navigation menu toggle
  const mobileMenuToggleButton = document.getElementById('tf-menu-btn');
  const mobileNavigationPanel  = document.getElementById('tf-mobile-menu');
  if (mobileMenuToggleButton && mobileNavigationPanel) {
    mobileMenuToggleButton.addEventListener('click', () => {
      mobileNavigationPanel.classList.toggle('hidden');
    });
  }

  // Pre-load cart badge count and wishlist state for logged-in users
  // Errors are silently swallowed — these are non-critical initialisation calls
  if (window.TF.Auth.isUserLoggedIn()) {
    window.TF.Cart.fetchCart().catch(() => {});
    window.TF.Wishlist.fetchWishlist().catch(() => {});
  }

  // ─── Home Page: New Arrivals Grid ──────────────────────────
  // Only runs on index.html (grid element won't exist on other pages)
  const homeProductsGrid = document.getElementById('home-products-grid');
  if (homeProductsGrid) {
    (async () => {
      try {
        // Fetch products marked as new arrivals
        const res = await window.TF.ProductsAPI.fetchAllProducts({ newArrival: 'true', limit: 4 });
        const products = res?.data?.data?.products || [];

        if (products.length > 0) {
          homeProductsGrid.innerHTML = products.map(p => window.TF.ProductCard(p)).join('');
          window.TF.Animations?.animateProductCardsIn?.('.product-card');
          window.TF.Wishlist?.syncAllHeartIcons?.();
        } else {
          // No new arrivals — fallback to latest 4 products
          const fallbackRes = await window.TF.ProductsAPI.fetchAllProducts({ limit: 4, sort: '-createdAt' });
          const fallbackProducts = fallbackRes?.data?.data?.products || [];

          if (fallbackProducts.length > 0) {
            homeProductsGrid.innerHTML = fallbackProducts.map(p => window.TF.ProductCard(p)).join('');
            window.TF.Animations?.animateProductCardsIn?.('.product-card');
            window.TF.Wishlist?.syncAllHeartIcons?.();
          } else {
            homeProductsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#888;padding:40px 0;">No products found.</p>`;
          }
        }
      } catch (err) {
        console.error('[TF] Home products load failed:', err.message);
        homeProductsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#888;padding:40px 0;">Could not load products.</p>`;
      }
    })();
  }

});
