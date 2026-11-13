import axios from 'axios';

// Tạo một instance (bản sao) của axios với cấu hình mặc định
const axiosClient = axios.create({
  baseURL: '/api', // Mặc định tự nối thêm /api (nhờ proxy Vite)
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR REQUEST: Trước khi gửi đi
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage
    const token = localStorage.getItem('token');
    
    // Nếu có token, tự động gắn vào Header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// INTERCEPTOR RESPONSE: Khi nhận kết quả về
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý chung các lỗi (ví dụ 401 là chưa xác thực hoặc token hết hạn)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Ép văng ra màn hình login ngay lập tức
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default axiosClient;