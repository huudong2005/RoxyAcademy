import axios from 'axios';
import {
  clearAuthSession,
  loadAuthSession,
  getCachedAccessToken,
} from '@/utils/storage';

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.roxy.edu.vn/api';

let unauthorizedHandler: (() => void) | null = null;

export function setOnUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  async (config) => {
    let token = getCachedAccessToken();
    if (!token) {
      const session = await loadAuthSession();
      token = session.accessToken;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await clearAuthSession();
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
