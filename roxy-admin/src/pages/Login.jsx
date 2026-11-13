import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || !password) {
      setError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosClient.post('/Auth/login', {
        phoneNumber: cleanPhone,
        password,
      });

      const { accessToken, user } = response.data;

      // Lưu Token vào LocalStorage
      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);

      // Nếu Backend trả sẵn thông tin user, lưu luôn; nếu chưa có thì gọi /Auth/me
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        try {
          const meRes = await axiosClient.get('/Auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          localStorage.setItem('user', JSON.stringify(meRes.data));
        } catch (meErr) {
          console.warn('Không thể nạp thông tin tài khoản qua /Auth/me:', meErr);
        }
      }

      // Đăng nhập thành công -> Điều hướng về trang quản trị
      navigate('/', { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Số điện thoại hoặc mật khẩu không chính xác.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200/80">
        {/* Header Thương hiệu */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-md mb-3">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Roxy Academy
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Hệ thống quản lý học tập dành cho cán bộ &amp; giáo viên
          </p>
        </div>

        {/* Khối Thông báo Lỗi */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700"
          >
            <svg
              className="h-4 w-4 shrink-0 mt-0.5 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Số điện thoại
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </span>
              <input
                type="tel"
                autoComplete="tel"
                required
                disabled={loading}
                placeholder="0900000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={loading}
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Đang xác thực...</span>
              </>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
          Roxy Academy © 2026 • Bảo mật thông tin học viên &amp; nội bộ
        </div>
      </div>
    </div>
  );
}
