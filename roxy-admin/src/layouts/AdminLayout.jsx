import { Outlet, Link, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      {/* Sidebar bên trái */}
      <aside className="w-64 flex-col bg-white shadow-md flex">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">Roxy Academy</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <Link to="/" className="block rounded bg-blue-50 px-4 py-2 font-medium text-blue-700">
            📊 Tổng quan
          </Link>
          <Link to="/classes" className="block rounded px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            🏫 Lớp học
          </Link>
          <Link to="/students" className="block rounded px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            🎓 Học viên
          </Link>
        </nav>
      </aside>

      {/* Khu vực nội dung chính */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bên trên */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
          <h2 className="text-xl font-semibold">Trang quản trị</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Xin chào, Admin</span>
            <button 
              onClick={handleLogout}
              className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Nội dung thay đổi (Dashboard, Danh sách lớp...) sẽ hiển thị ở đây */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}