import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : { fullName: '', role: '', branchId: null };
    } catch (e) {
      console.warn('Lỗi phân tích dữ liệu user từ localStorage:', e);
      return { fullName: '', role: '', branchId: null };
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SuperAdmin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            👑 Quản trị cấp cao
          </span>
        );
      case 'BranchManager':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
            🏢 Quản lý cơ sở
          </span>
        );
      case 'Teacher':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
            👩‍🏫 Giáo viên
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
            {role || 'Nhân sự'}
          </span>
        );
    }
  };

  const getInitials = (name) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 pl-2.5 shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const isStaff = user.role === 'SuperAdmin' || user.role === 'BranchManager';

  const renderNavLinks = (onItemClick) => (
    <>
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Nghiệp vụ đào tạo
      </div>
      <NavLink to="/" end className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📊</span>
        <span>Tổng quan</span>
      </NavLink>
      <NavLink to="/students" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">🎓</span>
        <span>Hồ sơ học viên</span>
      </NavLink>
      <NavLink to="/classes" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">🏫</span>
        <span>Lớp học</span>
      </NavLink>
      <NavLink to="/schedules" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📅</span>
        <span>Lịch học</span>
      </NavLink>
      <NavLink to="/attendance" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📋</span>
        <span>Điểm danh</span>
      </NavLink>
      <NavLink to="/homeworks" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📚</span>
        <span>Bài tập</span>
      </NavLink>
      <NavLink to="/leave-requests" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📝</span>
        <span>Xin nghỉ phép</span>
      </NavLink>

      {/* PHÂN HỆ TÀI CHÍNH: CHỈ HIỂN THỊ CHO SUPERADMIN VÀ BRANCHMANAGER (ẨN HOÀN TOÀN VỚI TEACHER) */}
      {isStaff && (
        <>
          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Tài chính &amp; Sổ quỹ
          </div>
          <NavLink to="/tuitions" className={navItemClass} onClick={onItemClick}>
            <span className="text-base">💰</span>
            <span>Học phí</span>
          </NavLink>
          <NavLink to="/payments" className={navItemClass} onClick={onItemClick}>
            <span className="text-base">💳</span>
            <span>Thanh toán</span>
          </NavLink>
        </>
      )}

      <div className="pt-5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Phân hệ sắp tới
      </div>
      <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-400 opacity-60">
        <span className="flex items-center gap-2">
          <span>📱</span> Zalo Mini App
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Giai đoạn 2</span>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* SIDEBAR CỐ ĐỊNH TRÊN DESKTOP (>= 768px) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white shadow-xs">
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-xs">
            R
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-900">Roxy Academy</h1>
            <p className="text-[11px] text-slate-500">Quản trị học tập</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        {/* Footer Sidebar */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {getInitials(user.fullName)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-slate-800">
                {user.fullName || 'Cán bộ quản trị'}
              </p>
              <p className="truncate text-[11px] text-slate-500">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER (KHI BẬT HAMBURGER TRÊN ĐIỆN THOẠI 375px - 414px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="relative flex w-72 max-w-[80%] flex-1 flex-col bg-white shadow-xl transition-transform duration-200 ease-out z-10">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-sm">
                  R
                </div>
                <span className="font-bold text-slate-900">Roxy Academy</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Đóng menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
              {renderNavLinks(() => setMobileMenuOpen(false))}
            </nav>

            <div className="border-t border-slate-100 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {getInitials(user.fullName)}
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-semibold text-slate-800">{user.fullName}</p>
                  <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger Button trên Mobile (min 44px x 44px touch target) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus:outline-none md:hidden active:scale-95 transition-transform"
              aria-label="Mở menu điều hướng"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h2 className="text-sm md:text-base font-semibold text-slate-800">
                {location.pathname.startsWith('/students')
                  ? 'Quản lý Học viên'
                  : location.pathname.startsWith('/classes')
                  ? 'Quản lý Lớp học'
                  : location.pathname.startsWith('/schedules')
                  ? 'Lịch học & Thời khóa biểu'
                  : location.pathname.startsWith('/attendance')
                  ? 'Điểm danh học viên'
                  : location.pathname.startsWith('/homeworks')
                  ? 'Quản lý Bài tập về nhà'
                  : location.pathname.startsWith('/tuitions')
                  ? 'Quản lý Học phí & Công nợ'
                  : location.pathname.startsWith('/payments')
                  ? 'Quản lý Thanh toán & Sổ quỹ'
                  : 'Bảng Tổng Quan'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Badge quyền người dùng */}
            <div className="hidden sm:inline-flex">{getRoleBadge(user.role)}</div>

            {/* Thông tin tên người dùng */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 shadow-xs">
                {getInitials(user.fullName)}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-700 max-w-[140px] truncate">
                {user.fullName || 'Người dùng'}
              </span>
            </div>

            {/* Nút Đăng xuất */}
            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Content Page (Scrollable area) */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
