import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import ProfileModal from '../components/ProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useAuth } from '../context/authContext';
import { clearAuthSession, getStoredUser } from '../utils/authStorage';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: verifiedUser, setUser: setVerifiedUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);
  const [localUser, setLocalUser] = useState(() =>
    getStoredUser({ fullName: '', role: '', branchId: null })
  );

  const user = verifiedUser || localUser;

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    clearAuthSession();
    setVerifiedUser(null);
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
      case 'Parent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
            👨‍👩‍👧 Phụ huynh
          </span>
        );
      case 'Student':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-900">
            🎒 Học viên
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

  const renderUserAvatar = (sizeClass = 'h-8 w-8', textClass = 'text-xs') => {
    const url = typeof user?.avatarUrl === 'string' ? user.avatarUrl.trim() : '';
    if (url && failedAvatarUrl !== url) {
      return (
        <img
          src={url}
          alt={user?.fullName || 'Ảnh đại diện'}
          onError={() => setFailedAvatarUrl(url)}
          className={`${sizeClass} shrink-0 rounded-full border border-line object-cover bg-surface shadow-xs`}
        />
      );
    }
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-gold-soft border border-gold/40 ${textClass} font-bold text-teal shadow-xs`}
      >
        {getInitials(user.fullName)}
      </div>
    );
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
      isActive
        ? 'bg-white/[0.14] text-gold font-semibold'
        : 'text-white/80 font-medium hover:bg-white/[0.08] hover:text-white'
    }`;

  const isStaff = user.role === 'SuperAdmin' || user.role === 'BranchManager';
  const isSuperAdmin = user.role === 'SuperAdmin';
  const isParent = user.role === 'Parent';
  const isStudent = user.role === 'Student';
  const isTeacher = user.role === 'Teacher';

  const renderNavLinks = (onItemClick) => (
    <>
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        Nghiệp vụ đào tạo
      </div>
      <NavLink to="/" end className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📊</span>
        <span>Tổng quan</span>
      </NavLink>
      {isStaff && (
        <NavLink to="/courses" className={navItemClass} onClick={onItemClick}>
          <span className="text-base">📖</span>
          <span>Khóa học</span>
        </NavLink>
      )}
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
      <NavLink to="/grades" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">💯</span>
        <span>Điểm kiểm tra</span>
      </NavLink>
      <NavLink to="/leave-requests" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📝</span>
        <span>Xin nghỉ phép</span>
      </NavLink>

      {/* GIAO TIẾP & BẢNG TIN: HIỂN THỊ CHO TẤT CẢ VAI TRÒ ĐÃ ĐĂNG NHẬP */}
      <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        Giao tiếp &amp; Bảng tin
      </div>
      <NavLink to="/messages" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">💬</span>
        <span>Tin nhắn</span>
      </NavLink>
      <NavLink to="/newsfeed" className={navItemClass} onClick={onItemClick}>
        <span className="text-base">📰</span>
        <span>Bảng tin</span>
      </NavLink>

      {/* PHÂN HỆ NHÂN SỰ: CHỈ HIỂN THỊ CHO SUPERADMIN VÀ BRANCHMANAGER (ẨN HOÀN TOÀN VỚI TEACHER) */}
      {isStaff && (
        <>
          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Nhân sự &amp; Giáo viên
          </div>
          <NavLink to="/teachers" className={navItemClass} onClick={onItemClick}>
            <span className="text-base">👩‍🏫</span>
            <span>Giáo viên</span>
          </NavLink>
        </>
      )}

      {/* PHÂN HỆ TÀI CHÍNH: HIỂN THỊ CHO STAFF VÀ PHỤ HUYNH / HỌC VIÊN (ẨN HOÀN TOÀN VỚI TEACHER) */}
      {!isTeacher && (
        <>
          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            {isParent || isStudent ? 'Học phí & Thanh toán' : 'Tài chính & Sổ quỹ'}
          </div>
          <NavLink to="/tuitions" className={navItemClass} onClick={onItemClick}>
            <span className="text-base">💰</span>
            <span>Học phí</span>
          </NavLink>
          {(isStaff || isParent) && (
            <NavLink to="/payments" className={navItemClass} onClick={onItemClick}>
              <span className="text-base">💳</span>
              <span>{isParent ? 'Lịch sử thanh toán' : 'Thanh toán'}</span>
            </NavLink>
          )}
        </>
      )}

      {/* PHÂN HỆ HỆ THỐNG: CHỈ HIỂN THỊ CHO SUPERADMIN */}
      {isSuperAdmin && (
        <>
          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Hệ thống &amp; Thiết lập
          </div>
          <NavLink to="/branches" className={navItemClass} onClick={onItemClick}>
            <span className="text-base">🏢</span>
            <span>Quản lý chi nhánh</span>
          </NavLink>
        </>
      )}

      <div className="pt-5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        Phân hệ sắp tới
      </div>
      <div className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-white/50">
        <span className="flex items-center gap-2">
          <span>📱</span> Zalo Mini App
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/75">Giai đoạn 2</span>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-mint-canvas font-sans text-ink overflow-hidden">
      {/* SIDEBAR CỐ ĐỊNH TRÊN DESKTOP (>= 768px) */}
      <aside className="hidden md:flex w-64 flex-col bg-teal text-white/80 shadow-card">
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold font-bold text-teal shadow-xs">
            R
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-white">Roxy Academy</h1>
            <p className="text-[11px] text-white/60">Quản trị học tập</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        {/* Footer Sidebar */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            title="Hồ sơ cá nhân"
            className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-white/[0.08] active:scale-[0.98] transition-all cursor-pointer"
          >
            {renderUserAvatar('h-9 w-9', 'text-xs')}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">
                {user.fullName || 'Cán bộ quản trị'}
              </p>
              <p className="truncate text-[11px] text-white/60">{user.role}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setChangePasswordModalOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/[0.14] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>🔑</span>
            <span>Đổi mật khẩu</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER (KHI BẬT HAMBURGER TRÊN ĐIỆN THOẠI 375px - 414px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="relative flex w-72 max-w-[80%] flex-1 flex-col bg-teal text-white/80 shadow-modal transition-transform duration-200 ease-out z-10">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold font-bold text-teal text-sm shadow-xs">
                  R
                </div>
                <span className="font-bold text-white">Roxy Academy</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/75 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Đóng menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
              {renderNavLinks(() => setMobileMenuOpen(false))}
            </nav>

            <div className="border-t border-white/10 p-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                title="Hồ sơ cá nhân"
                className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-white/[0.08] active:scale-[0.98] transition-all cursor-pointer"
              >
                {renderUserAvatar('h-8 w-8', 'text-xs')}
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-semibold text-white">{user.fullName}</p>
                  <div className="mt-0.5">{getRoleBadge(user.role)}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setChangePasswordModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-medium text-white/90 hover:bg-white/[0.14] cursor-pointer"
              >
                <span>🔑</span>
                <span>Đổi mật khẩu</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/20 px-3 py-2 text-xs font-medium text-rose-100 hover:bg-rose-500/30 cursor-pointer"
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
        <header className="relative z-40 flex h-16 items-center justify-between border-b border-line bg-surface/95 backdrop-blur px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger Button trên Mobile (min 44px x 44px touch target) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-teal hover:bg-mint-canvas focus:outline-none md:hidden active:scale-95 transition-transform cursor-pointer"
              aria-label="Mở menu điều hướng"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h2 className="text-sm md:text-base font-semibold text-ink">
                {location.pathname.startsWith('/courses')
                  ? 'Quản lý Khóa học'
                  : location.pathname.startsWith('/students')
                  ? 'Quản lý Học viên'
                  : location.pathname.startsWith('/classes')
                  ? 'Quản lý Lớp học'
                  : location.pathname.startsWith('/schedules')
                  ? 'Lịch học & Thời khóa biểu'
                  : location.pathname.startsWith('/attendance')
                  ? 'Điểm danh học viên'
                  : location.pathname.startsWith('/homeworks')
                  ? 'Quản lý Bài tập về nhà'
                  : location.pathname.startsWith('/grades')
                  ? 'Quản lý Điểm kiểm tra'
                  : location.pathname.startsWith('/leave-requests')
                  ? 'Quản lý Đơn xin nghỉ phép'
                  : location.pathname.startsWith('/tuitions')
                  ? 'Quản lý Học phí & Công nợ'
                  : location.pathname.startsWith('/payments')
                  ? (isParent ? 'Lịch sử thanh toán học phí' : 'Quản lý Thanh toán & Sổ quỹ')
                  : location.pathname.startsWith('/branches')
                  ? 'Quản lý Chi nhánh'
                  : location.pathname.startsWith('/teachers')
                  ? 'Quản lý Giáo viên'
                  : location.pathname.startsWith('/messages')
                  ? 'Tin nhắn'
                  : location.pathname.startsWith('/newsfeed')
                  ? 'Bảng tin trung tâm'
                  : 'Bảng Tổng Quan'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
            {/* Chuông thông báo */}
            <NotificationBell />

            {/* Badge quyền người dùng */}
            <div className="hidden sm:inline-flex">{getRoleBadge(user.role)}</div>

            {/* User Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                title="Tài khoản người dùng"
                className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-mint-canvas active:scale-[0.98] transition-all cursor-pointer"
              >
                {renderUserAvatar('h-8 w-8', 'text-xs')}
                <span className="hidden lg:inline text-xs font-semibold text-ink-secondary max-w-[140px] truncate">
                  {user.fullName || 'Người dùng'}
                </span>
                <svg
                  className={`h-3.5 w-3.5 text-ink-muted transition-transform duration-150 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-card border border-line bg-surface py-2 shadow-modal z-40"
                >
                  <div className="border-b border-line/70 px-4 py-2.5">
                    <p className="truncate text-xs font-bold text-ink">
                      {user.fullName || 'Người dùng'}
                    </p>
                    <div className="mt-1.5">{getRoleBadge(user.role)}</div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-mint-canvas cursor-pointer"
                    >
                      <span>👤</span>
                      <span>Hồ sơ cá nhân</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setChangePasswordModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-mint-canvas cursor-pointer"
                    >
                      <span>🔑</span>
                      <span>Đổi mật khẩu</span>
                    </button>
                  </div>

                  <div className="border-t border-line/70 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <span>🚪</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Page (Scrollable area) */}
        <main className="flex-1 overflow-y-auto bg-mint-canvas p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Modal Hồ sơ cá nhân */}
      {profileModalOpen && (
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          currentUser={user}
          onUserUpdated={(updatedUser) => {
            setLocalUser(updatedUser);
            setVerifiedUser(updatedUser);
          }}
        />
      )}

      {/* Modal Đổi mật khẩu */}
      {changePasswordModalOpen && (
        <ChangePasswordModal
          isOpen={changePasswordModalOpen}
          onClose={() => setChangePasswordModalOpen(false)}
        />
      )}
    </div>
  );
}
