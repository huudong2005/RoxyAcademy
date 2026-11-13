import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Thêm useNavigate

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Khởi tạo điều hướng

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('/api/Auth/login', { phoneNumber, password });
      localStorage.setItem('token', response.data.accessToken);
      
      // Đăng nhập thành công thì chuyển hướng về trang chủ ("/")
      navigate('/');
      
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Số điện thoại hoặc mật khẩu không đúng!');
      } else {
        setError('Lỗi kết nối đến máy chủ.');
      }
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-blue-600">Roxy Academy</h1>
        
        {error && <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">{error}</div>}
        
        <input 
          type="text" placeholder="Số điện thoại" 
          value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 p-3 text-gray-800 focus:border-blue-500 focus:outline-none" required
        />
        <input 
          type="password" placeholder="Mật khẩu" 
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded border border-gray-300 p-3 text-gray-800 focus:border-blue-500 focus:outline-none" required
        />
        <button type="submit" className="w-full rounded bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700">
          Đăng Nhập
        </button>
      </form>
    </div>
  );
}