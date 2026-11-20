import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/authContext';
import { clearAuthSession, getStoredToken, updateStoredUser } from '../utils/authStorage';
import { PrimaryButton } from './ui';

export default function ProtectedRoute({ allowedRoles }) {
  const navigate = useNavigate();
  const { user: verifiedUser, setUser: setVerifiedUser } = useAuth();
  const token = getStoredToken();

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
        updateStoredUser(meData);
        setVerifiedUser(meData);
      } catch {
        if (ignore) return;
        clearAuthSession();
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
      <div className="flex min-h-screen w-full items-center justify-center bg-mint-canvas p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-teal border-t-transparent" />
          <p className="text-sm font-medium text-ink-secondary">Đang xác thực phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(verifiedUser.role)) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center bg-mint-canvas px-4 text-center">
        <div className="flex max-w-md flex-col items-center rounded-card-lg border border-line bg-surface p-6 md:p-8 shadow-card">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600 shadow-xs">
            🚫
          </div>
          <h1 className="mb-2 text-xl font-bold text-ink">
            403 — Không có quyền truy cập
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-ink-secondary">
            Tài khoản của bạn không có quyền truy cập trang này. Vui lòng quay về Tổng quan hoặc liên hệ quản trị viên nếu cần hỗ trợ.
          </p>
          <PrimaryButton
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            Quay về Tổng quan
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
