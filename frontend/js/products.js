/**
 * TrendFusion — Products Page Controller
 *
 * Manages the /products.html page:
 *   - Fetches products from the backend with server-side filtering and pagination
 *   - Handles category filter buttons, sort dropdown, and search input
 *   - Renders product cards with skeleton loading states
 *   - Supports "Load More" pagination (appends to existing grid)
 *
 * All filtering is server-side — the backend's getAllProducts controller
 * handles category, badge, size, price range, sort, and MongoDB text search.
 *
 * Backend response: GET /api/products
 * { data: { products: [...], pagination: { total, totalPages, currentPage, limit, hasNextPage, hasPrevPage } } }
 *
 * Accepted query params (verified from productController.js):
 *   category  : 'Dresses' | 'Tops' | 'Bottoms' | 'Outerwear' | 'Accessories'
 *   badge     : 'New' | 'Sale' | 'Hot'
 *   sort      : 'price-asc' | 'price-desc' | 'newest' | 'oldest'
 *   page, limit : number  (backend default: page=1, limit=12, max limit=100)
 *   search    : string    (MongoDB $text index on name + brand)
 */

document.addEventListener('DOMContentLoaded', async () => {

  // ─── DOM References ─────────────────────────────────────
  const productGridElement   = document.getElementById('products-grid');
  const categoryFilterButtons = document.querySelectorAll('[data-filter]');
  const sortOrderDropdown    = document.getElementById('sort-select');
  const productSearchInput   = document.getElementById('search-input');
  const resultCountLabel     = document.getElementById('results-count');
  const loadMoreButton       = document.getElementById('load-more-btn');

  // ─── Page State ──────────────────────────────────────────
  let currentPageNumber      = 1;
  let hasMoreProductsToLoad  = false;
  let totalProductCount      = 0;
  let isFetchInProgress      = false;

  // Active filter params sent to the backend on every request
  const activeFilterParams = {
    page  : 1,
    limit : 12,
    sort  : '',
  };

  // ─── Pre-select from URL Params ──────────────────────────
  // Supports deep-linking: products.html?category=Dresses or ?badge=Sale
  const pageUrlParams = new URLSearchParams(window.location.search);
  const preselectedCategory = pageUrlParams.get('category');
  const preselectedBadge    = pageUrlParams.get('badge');

  if (preselectedCategory) activeFilterParams.category = preselectedCategory;
  if (preselectedBadge)    activeFilterParams.badge    = preselectedBadge;

  // ─── Fetch Products ──────────────────────────────────────
  /**
   * Core fetch function — called on initial load, filter changes, and load-more.
   * @param {boolean} shouldAppendToGrid  true = load more, false = fresh render
   */
  const fetchAndRenderProducts = async (shouldAppendToGrid = false) => {
    if (isFetchInProgress) return;
    isFetchInProgress = true;

    if (!shouldAppendToGrid) {
      window.TF.Skeleton.renderSkeletonsInGrid(productGridElement, 8);
    } else if (loadMoreButton) {
      loadMoreButton.textContent = 'Loading...';
    }

    try {
      // Strip empty string values before sending to avoid backend validation noise
      const cleanedFilterParams = {};
      Object.entries(activeFilterParams).forEach(([paramKey, paramValue]) => {
        if (paramValue !== '' && paramValue !== null && paramValue !== undefined) {
          cleanedFilterParams[paramKey] = paramValue;
        }
      });

      const apiResponse  = await window.TF.ProductsAPI.fetchAllProducts(cleanedFilterParams);
      const products     = apiResponse.data.data.products;
      const pagination   = apiResponse.data.meta;

      // Update local state from pagination metadata
      hasMoreProductsToLoad = pagination.hasNextPage;
      totalProductCount     = pagination.total;
      currentPageNumber     = pagination.page;

      // Update the result count label
      if (resultCountLabel) {
        const pluralSuffix = totalProductCount !== 1 ? 's' : '';
        resultCountLabel.textContent = `${totalProductCount} piece${pluralSuffix}`;
      }

      // Handle empty state
      if (products.length === 0 && !shouldAppendToGrid) {
        productGridElement.innerHTML = `
          <div style="grid-column:1/-1;padding:80px 0;text-align:center;">
            <p style="font-size:3rem;margin-bottom:12px;">∅</p>
            <p class="section-label">No items found for your selection</p>
          </div>
        `;
        if (loadMoreButton) loadMoreButton.style.display = 'none';
        return;
      }

      if (shouldAppendToGrid) {
        // Append new cards and collect references to animate only the new ones
        const temporaryFragment = document.createElement('div');
        temporaryFragment.innerHTML = products.map(product => window.TF.ProductCard(product)).join('');
        const newCardElements = Array.from(temporaryFragment.children);
        newCardElements.forEach(card => productGridElement.appendChild(card));

        // FIX: animate only the newly added cards, not the entire grid
        window.TF.Wishlist.syncAllHeartIcons();
        window.TF.Animations.animateProductCardsIn(newCardElements);
      } else {
        productGridElement.innerHTML = products.map(product => window.TF.ProductCard(product)).join('');
        window.TF.Wishlist.syncAllHeartIcons();
        window.TF.Animations.animateProductCardsIn('.product-card');
      }

      if (loadMoreButton) {
        loadMoreButton.style.display = hasMoreProductsToLoad ? 'block' : 'none';
        loadMoreButton.textContent = 'Load More';
      }

    } catch (fetchError) {
      if (!shouldAppendToGrid) {
        productGridElement.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:60px 0;">
            <p class="section-label" style="margin-bottom:12px;">Unable to load products</p>
            <button
              onclick="location.reload()"
              style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;text-decoration:underline;background:transparent;border:none;cursor:pointer;"
            >Try again</button>
          </div>
        `;
      }
      console.error('Product fetch failed:', fetchError);
    } finally {
      isFetchInProgress = false;
    }
  };

  // ─── Category Filter Buttons ─────────────────────────────
  /**
   * Filter values match backend enum exactly:
   * 'Dresses' | 'Tops' | 'Bottoms' | 'Outerwear' | 'Accessories'
   * The 'all' value means no category filter is applied.
   */
  categoryFilterButtons.forEach((filterButton) => {
    // Highlight the button that matches the URL pre-selection
    const buttonFilterValue    = filterButton.dataset.filter;
    const isPreselectedCategory = preselectedCategory && buttonFilterValue === preselectedCategory;
    const isDefaultAllButton    = !preselectedCategory && buttonFilterValue === 'all';

    if (isPreselectedCategory || isDefaultAllButton) {
      categoryFilterButtons.forEach(btn => btn.classList.remove('filter-active'));
      filterButton.classList.add('filter-active');
    }

    filterButton.addEventListener('click', () => {
      categoryFilterButtons.forEach(btn => btn.classList.remove('filter-active'));
      filterButton.classList.add('filter-active');

      if (buttonFilterValue === 'all') {
        delete activeFilterParams.category;
      } else {
        activeFilterParams.category = buttonFilterValue;
      }

      activeFilterParams.page = 1;
      fetchAndRenderProducts(false);
    });
  });

  // ─── Sort Dropdown ────────────────────────────────────────
  /**
   * Maps directly to backend sortMap keys:
   * 'price-asc' | 'price-desc' | 'newest' | 'oldest'
   */
  if (sortOrderDropdown) {
    sortOrderDropdown.addEventListener('change', () => {
      const sortValue = sortOrderDropdown.value;
      delete activeFilterParams.sortBy;
      delete activeFilterParams.sortOrder;
      if (sortValue === 'price-asc')  { activeFilterParams.sortBy = 'price';     activeFilterParams.sortOrder = 'asc';  }
      if (sortValue === 'price-desc') { activeFilterParams.sortBy = 'price';     activeFilterParams.sortOrder = 'desc'; }
      if (sortValue === 'newest')     { activeFilterParams.sortBy = 'createdAt'; activeFilterParams.sortOrder = 'desc'; }
      if (sortValue === 'oldest')     { activeFilterParams.sortBy = 'createdAt'; activeFilterParams.sortOrder = 'asc';  }
      activeFilterParams.page = 1;
      fetchAndRenderProducts(false);
    });
  }

  // ─── Search Input ─────────────────────────────────────────
  /**
   * Debounced search — waits 400ms after the user stops typing before
   * sending a request. Backend uses a MongoDB $text index on name + brand.
   */
  let searchDebounceTimer;

  if (productSearchInput) {
    productSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);

      searchDebounceTimer = setTimeout(() => {
        const trimmedSearchQuery = productSearchInput.value.trim();

        if (trimmedSearchQuery) {
          activeFilterParams.q = trimmedSearchQuery;
        } else {
          delete activeFilterParams.q; // Empty search = no filter
        }

        activeFilterParams.page = 1;
        fetchAndRenderProducts(false);
      }, 400);
    });
  }

  // ─── Load More Button ─────────────────────────────────────
  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', () => {
      if (!hasMoreProductsToLoad || isFetchInProgress) return;
      activeFilterParams.page = currentPageNumber + 1;
      fetchAndRenderProducts(true);
    });
  }

  // ─── Initial Page Load ────────────────────────────────────
  await fetchAndRenderProducts(false);

});
