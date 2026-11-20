import axios from 'axios';
import { clearAuthSession, getStoredToken } from '../utils/authStorage';

// Sử dụng biến môi trường VITE_API_BASE_URL nếu có, mặc định là '/api' qua Vite proxy
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR REQUEST: Tự động đính kèm Bearer Token nếu đã đăng nhập
axiosClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// INTERCEPTOR RESPONSE: Tự động điều hướng khi phiên hết hạn (401)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
