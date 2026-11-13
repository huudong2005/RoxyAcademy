import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

  // Nếu chưa có token, điều hướng về trang /login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu có token, cho phép render các thành phần con (Outlet)
  return <Outlet />;
}
