import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/authContext';

export default function ProtectedRoute({ allowedRoles }) {
  const navigate = useNavigate();
  const { user: verifiedUser, setUser: setVerifiedUser } = useAuth();
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

  const [verifying, setVerifying] = useState(() => Boolean(token && !verifiedUser));
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    if (!token || verifiedUser) {
      return;
    }

    let ignore = false;

    const verifySession = async () => {
      try {
        const res = await axiosClient.get('/Auth/me');
        if (ignore) return;
        const meData = res.data;
        if (!meData || !meData.role) {
          throw new Error('Thông tin tài khoản không hợp lệ.');
        }
        localStorage.setItem('user', JSON.stringify(meData));
        setVerifiedUser(meData);
      } catch {
        if (ignore) return;
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setVerifiedUser(null);
        setAuthFailed(true);
      } finally {
        if (!ignore) {
          setVerifying(false);
        }
      }
    };

    verifySession();

    return () => {
      ignore = true;
    };
  }, [token, verifiedUser, setVerifiedUser]);

  if (!token || authFailed) {
    return <Navigate to="/login" replace />;
  }

  if (verifying || !verifiedUser) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Đang xác thực phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(verifiedUser.role)) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600 shadow-xs">
          🚫
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900">
          403 — Không có quyền truy cập
        </h1>
        <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-600">
          Tài khoản của bạn không có quyền truy cập trang này. Vui lòng quay về Tổng quan hoặc liên hệ quản trị viên nếu cần hỗ trợ.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard', { replace: true })}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          Quay về Tổng quan
        </button>
      </div>
    );
  }

  return <Outlet />;
}
