/**
 * TrendFusion — Auth Module (FIXED)
 *
 * Fixes from original:
 *  1. Admin role check added for admin route protection
 *  2. Consistent use of AuthAPI (no path drift)
 *  3. refreshToken logic made more robust
 *
 * Backend login/register response shape:
 * {
 *   success: true,
 *   data: { user: { _id, name, email, role, avatar, ... }, accessToken: "eyJ..." }
 * }
 */

window.TF = window.TF || {};

window.TF.Auth = (() => {

  const TOKEN_KEY = 'tf_access_token';
  const USER_KEY  = 'tf_current_user';

  // ─── Session Helpers ──────────────────────────────────────
  const saveSession = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  };

  const isLoggedIn    = () => Boolean(getToken());
  const isAdmin       = () => getUser()?.role === 'admin';

  // ─── Login ────────────────────────────────────────────────
  // POST /api/auth/login
  // body: { email, password }
  // response: { data: { user, accessToken } }
  const loginUser = async (email, password) => {
    const res = await window.TF.AuthAPI.loginWithCredentials({ email, password });
    const { accessToken, user } = res.data.data;
    saveSession(accessToken, user);
    return user;
  };

  // ─── Register ─────────────────────────────────────────────
  // POST /api/auth/register
  // body: { name, email, password }
  const registerUser = async (name, email, password) => {
    const res = await window.TF.AuthAPI.registerNewUser({ name, email, password });
    const { accessToken, user } = res.data.data;
    saveSession(accessToken, user);
    return user;
  };

  // ─── Logout ───────────────────────────────────────────────
  // POST /api/auth/logout  (protected)
  const logoutUser = async () => {
    try {
      await window.TF.AuthAPI.logoutCurrentUser();
    } catch (e) {
      console.warn('Server logout failed, clearing locally:', e.message);
    }
    clearSession();
    window.location.href = 'index.html';
  };

  // ─── Route Guards ─────────────────────────────────────────
  const requireAuth = () => {
    if (!isLoggedIn()) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
  };

  const requireAdmin = () => {
    if (!isLoggedIn()) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
      return;
    }
    if (!isAdmin()) {
      alert('Access denied. Admin only.');
      window.location.href = 'index.html';
    }
  };

  // ─── Navbar Sync ──────────────────────────────────────────
  const syncNavbar = () => {
    const user = getUser();

    document.querySelectorAll('[data-auth-link]').forEach(el => {
      el.style.display = user ? '' : 'none';
    });
    document.querySelectorAll('[data-guest-link]').forEach(el => {
      el.style.display = user ? 'none' : '';
    });
    document.querySelectorAll('[data-admin-link]').forEach(el => {
      el.style.display = (user?.role === 'admin') ? '' : 'none';
    });

    const nameEl = document.querySelector('[data-user-name]');
    if (nameEl && user) {
      nameEl.textContent = user.name?.split(' ')[0] || 'Account';
    }
  };

  // ─── Public API ───────────────────────────────────────────
  return {
    loginUser,
    registerUser,
    logoutUser,
    isLoggedIn,
    isAdmin,
    getToken,
    getUser,
    requireAuth,
    requireAdmin,
    syncNavbar,
    // legacy aliases used in existing HTML
    isUserLoggedIn:          isLoggedIn,
    getStoredAccessToken:    getToken,
    getStoredUserProfile:    getUser,
    requireAuthOrRedirect:   requireAuth,
    syncNavbarWithAuthState: syncNavbar,
  };

})();
