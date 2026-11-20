const TOKEN_KEYS = ['token', 'accessToken'];
const USER_KEY = 'user';

/**
 * Lấy access token từ localStorage hoặc sessionStorage.
 */
export function getStoredToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    null
  );
}

/**
 * Lấy chuỗi JSON user thô từ localStorage hoặc sessionStorage.
 */
export function getStoredUserRaw() {
  return localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || null;
}

/**
 * Parse thông tin user đang đăng nhập từ localStorage hoặc sessionStorage.
 */
export function getStoredUser(fallback = {}) {
  try {
    const raw = getStoredUserRaw();
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Lưu phiên đăng nhập vào localStorage (khi rememberMe = true) hoặc sessionStorage (khi rememberMe = false).
 * Luôn xóa ở storage còn lại để tránh dữ liệu cũ xung đột.
 */
export function saveAuthSession({ token, user, rememberMe = true }) {
  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;

  if (token) {
    TOKEN_KEYS.forEach((key) => {
      target.setItem(key, token);
      other.removeItem(key);
    });
  }

  if (user !== undefined) {
    if (user === null) {
      target.removeItem(USER_KEY);
    } else {
      target.setItem(USER_KEY, JSON.stringify(user));
    }
    other.removeItem(USER_KEY);
  }
}

/**
 * Cập nhật thông tin user vào đúng storage đang giữ phiên đăng nhập hiện tại.
 */
export function updateStoredUser(user) {
  const hasLocalSession = Boolean(
    localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem(USER_KEY)
  );
  const target = hasLocalSession ? localStorage : sessionStorage;
  const other = hasLocalSession ? sessionStorage : localStorage;

  target.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(USER_KEY);
}

/**
 * Xóa toàn bộ thông tin phiên đăng nhập khỏi cả localStorage và sessionStorage.
 */
export function clearAuthSession() {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}
