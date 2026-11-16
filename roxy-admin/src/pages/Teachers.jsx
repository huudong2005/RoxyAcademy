import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';
import {
  CreateEditTeacherModal,
  ResetTeacherPasswordModal,
  ToggleTeacherStatusModal,
  TeacherDetailDrawer,
} from '../components/TeacherModals';

const PAGE_SIZE = 20;

/**
 * Màn hình Quản lý Giáo viên (/teachers).
 * - SuperAdmin: xem/tạo/sửa/khóa/mở/đặt lại mật khẩu giáo viên mọi chi nhánh.
 * - BranchManager: chỉ thao tác giáo viên thuộc chi nhánh mình (khóa cứng chi nhánh).
 * - Teacher / Parent / Student: chặn 403 Forbidden, không gọi API /Users.
 */
export default function Teachers() {
  const navigate = useNavigate();

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
  const canAccess = isSuperAdmin || isBranchManager;
  const managerBranchId = isBranchManager ? currentUser.branchId : null;

  // Danh sách giáo viên & phân trang
  const [teachers, setTeachers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Thống kê nhanh (KPI)
  const [kpiStats, setKpiStats] = useState({ total: 0, active: 0, inactive: 0 });

  // Danh mục chi nhánh
  const [branches, setBranches] = useState([]);

  // Bộ lọc
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(() =>
    isBranchManager && managerBranchId ? String(managerBranchId) : ''
  );
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Modals / Drawer
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [resetPwdTarget, setResetPwdTarget] = useState(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState(null);

  // Debounce từ khóa tìm kiếm (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Tải danh sách chi nhánh (chỉ khi có quyền)
  useEffect(() => {
    if (!canAccess) return;
    let ignore = false;
    const fetchBranches = async () => {
      try {
        const res = await axiosClient.get('/Branches');
        if (!ignore) {
          setBranches(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách chi nhánh:', err);
      }
    };
    fetchBranches();
    return () => {
      ignore = true;
    };
  }, [canAccess]);

  // Tải danh sách giáo viên + KPI (chỉ khi có quyền)
  useEffect(() => {
    if (!canAccess) return;

    let ignore = false;
    const fetchTeachers = async () => {
      setLoading(true);
      setError('');
      try {
        const effectiveBranchId = isSuperAdmin
          ? branchFilter || undefined
          : managerBranchId || undefined;

        const params = {
          role: 'Teacher',
          page,
          pageSize: PAGE_SIZE,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (effectiveBranchId) params.branchId = Number(effectiveBranchId);
        if (statusFilter === 'active') params.isActive = true;
        if (statusFilter === 'inactive') params.isActive = false;

        const baseCountParams = {
          role: 'Teacher',
          page: 1,
          pageSize: 1,
          ...(effectiveBranchId ? { branchId: Number(effectiveBranchId) } : {}),
        };

        const [listRes, activeCountRes, inactiveCountRes] = await Promise.all([
          axiosClient.get('/Users', { params }),
          axiosClient.get('/Users', {
            params: { ...baseCountParams, isActive: true },
          }),
          axiosClient.get('/Users', {
            params: { ...baseCountParams, isActive: false },
          }),
        ]);

        if (ignore) return;

        const data = listRes.data || {};
        setTeachers(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);

        const activeCount = activeCountRes.data?.total ?? 0;
        const inactiveCount = inactiveCountRes.data?.total ?? 0;
        setKpiStats({
          total: activeCount + inactiveCount,
          active: activeCount,
          inactive: inactiveCount,
        });
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải danh sách giáo viên:', err);
          setError(
            err.response?.data?.message ||
              (!err.response
                ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.'
                : 'Không thể tải danh sách giáo viên. Vui lòng thử lại sau.')
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchTeachers();
    return () => {
      ignore = true;
    };
  }, [
    canAccess,
    isSuperAdmin,
    managerBranchId,
    branchFilter,
    statusFilter,
    debouncedSearch,
    page,
    reloadKey,
  ]);

  const refreshTeachers = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const getInitials = (name) => {
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const currentManagerBranchName =
    branches.find((b) => String(b.id) === String(managerBranchId))?.branchName ||
    'Chi nhánh của bạn';

  // ==================== MÀN HÌNH CHẶN 403 ====================
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4 text-rose-600 shadow-xs">
          🚫
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          403 — Bạn không có quyền truy cập phân hệ Quản lý Giáo viên
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          Phân hệ Quản lý Giáo viên chỉ dành cho Ban Giám Đốc (SuperAdmin) và Quản lý
          cơ sở (BranchManager).
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Quay lại Tổng quan
          </button>
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            Xem Lớp học
          </button>
        </div>
      </div>
    );
  }

  // ==================== GIAO DIỆN CHÍNH ====================
  return (
    <div className="space-y-5">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '❌' : '✓'}</span>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header & Nút CTA chính */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>👩‍🏫</span>
            <span>Quản lý Giáo viên</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSuperAdmin
              ? 'Danh sách tài khoản giáo viên, phân công chi nhánh, lịch dạy và cấp lại mật khẩu.'
              : `Danh sách giáo viên thuộc ${currentManagerBranchName}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTeacher(null);
            setFormModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer min-h-[44px] shrink-0"
        >
          <span>+</span>
          <span>Thêm giáo viên</span>
        </button>
      </div>

      {/* KPI Cards nhỏ gọn */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-blue-50 text-blue-700 items-center justify-center text-lg shrink-0">
            👩‍🏫
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Tổng giáo viên</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {kpiStats.total}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 items-center justify-center text-lg shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Đang hoạt động</p>
            <p className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
              {kpiStats.active}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-rose-50 text-rose-700 items-center justify-center text-lg shrink-0">
            🔒
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Đã khóa</p>
            <p className="text-lg font-bold font-mono text-rose-700 tabular-nums">
              {kpiStats.inactive}
            </p>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm họ tên hoặc số điện thoại..."
              className="w-full min-h-[42px] pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc chi nhánh */}
          <div className="sm:w-56">
            <select
              aria-label="Lọc theo chi nhánh"
              value={branchFilter}
              disabled={!isSuperAdmin}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full min-h-[42px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                !isSuperAdmin
                  ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            >
              {isSuperAdmin ? (
                <>
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branchName}
                    </option>
                  ))}
                </>
              ) : (
                <option value={managerBranchId || ''}>
                  {currentManagerBranchName}
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Tab trạng thái */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'all', label: `Tất cả (${kpiStats.total})` },
            { key: 'active', label: `Đang hoạt động (${kpiStats.active})` },
            { key: 'inactive', label: `Đã khóa (${kpiStats.inactive})` },
          ].map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách / Loading / Error / Empty */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-12 bg-slate-100 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium text-rose-800">{error}</p>
          <button
            type="button"
            onClick={refreshTeachers}
            className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="text-3xl">👩‍🏫</div>
          <h3 className="text-base font-bold text-slate-800">
            Không tìm thấy giáo viên phù hợp
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {debouncedSearch || statusFilter !== 'all' || (isSuperAdmin && branchFilter)
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem các giáo viên khác.'
              : 'Hãy bấm nút "Thêm giáo viên" để tạo tài khoản giáo viên đầu tiên.'}
          </p>
          {(debouncedSearch || statusFilter !== 'all' || (isSuperAdmin && branchFilter)) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
                setStatusFilter('all');
                if (isSuperAdmin) setBranchFilter('');
                setPage(1);
              }}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {teachers.map((t) => (
              <div
                key={t.id}
                onClick={() => setDetailTarget(t)}
                className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-colors ${
                  t.isActive
                    ? 'bg-white border-slate-200 shadow-2xs'
                    : 'bg-slate-50/80 border-dashed border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(t.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{t.fullName}</p>
                      <p className="text-xs font-mono text-slate-600 tabular-nums">
                        {t.phoneNumber}
                      </p>
                    </div>
                  </div>
                  {t.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Đã khóa
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Chi nhánh</span>
                    <span className="font-medium text-slate-800">
                      {t.branchName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mật khẩu</span>
                    <span
                      className={`font-medium ${
                        t.hasPassword ? 'text-blue-700' : 'text-amber-700'
                      }`}
                    >
                      {t.hasPassword ? 'Đã đặt mật khẩu' : 'Chưa có mật khẩu'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Email: </span>
                    <span className="text-slate-700">{t.email || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>Tạo: {formatDate(t.createdAt)}</span>
                    <span>
                      Đăng nhập:{' '}
                      {t.lastLoginAt ? formatDateTime(t.lastLoginAt) : 'Chưa đăng nhập'}
                    </span>
                  </div>
                </div>

                <div
                  className="flex flex-wrap gap-2 pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setDetailTarget(t)}
                    className="min-h-[40px] flex-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeacher(t);
                      setFormModalOpen(true);
                    }}
                    className="min-h-[40px] flex-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPwdTarget(t)}
                    className="min-h-[40px] px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Đặt MK
                  </button>
                  <button
                    type="button"
                    onClick={() => setToggleStatusTarget(t)}
                    className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                      t.isActive
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {t.isActive ? 'Khóa' : 'Mở khóa'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Table (>= 768px) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Giáo viên</th>
                    <th className="py-3 px-4">Liên hệ</th>
                    <th className="py-3 px-4">Chi nhánh</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Mật khẩu</th>
                    <th className="py-3 px-4">Tạo / Đăng nhập</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {teachers.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setDetailTarget(t)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                        !t.isActive ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(t.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                              {t.fullName}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID #{t.id} • {t.preferredLanguage === 'en' ? 'EN' : 'VI'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-mono font-medium text-slate-800 tabular-nums">
                          {t.phoneNumber}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">
                          {t.email || '—'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {t.branchName || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {t.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Đã khóa
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {t.hasPassword ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Đã đặt mật khẩu
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Chưa có mật khẩu
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums">
                        <p>Tạo: {formatDate(t.createdAt)}</p>
                        <p className="text-slate-400 mt-0.5">
                          {t.lastLoginAt
                            ? `Login: ${formatDateTime(t.lastLoginAt)}`
                            : 'Chưa đăng nhập'}
                        </p>
                      </td>

                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailTarget(t)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacher(t);
                              setFormModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetPwdTarget(t)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            Đặt MK
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleStatusTarget(t)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                              t.isActive
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {t.isActive ? 'Khóa' : 'Mở khóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phân trang */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
            <span className="tabular-nums">
              Hiển thị{' '}
              <strong className="text-slate-900">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </strong>{' '}
              trong tổng số <strong className="text-slate-900">{total}</strong> giáo viên
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Trước
              </button>
              <span className="font-mono font-semibold text-slate-800 px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sau →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Thêm / Sửa Giáo viên */}
      {formModalOpen && (
        <CreateEditTeacherModal
          teacher={editingTeacher}
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          managerBranchId={managerBranchId}
          onClose={() => {
            setFormModalOpen(false);
            setEditingTeacher(null);
          }}
          onSuccess={(msg) => {
            setFormModalOpen(false);
            setEditingTeacher(null);
            showToast(msg, 'success');
            refreshTeachers();
          }}
        />
      )}

      {/* Modal Đặt lại mật khẩu */}
      {resetPwdTarget && (
        <ResetTeacherPasswordModal
          teacher={resetPwdTarget}
          onClose={() => setResetPwdTarget(null)}
          onSuccess={(msg) => {
            setResetPwdTarget(null);
            showToast(msg, 'success');
            refreshTeachers();
          }}
        />
      )}

      {/* Modal Xác nhận Khóa / Mở khóa */}
      {toggleStatusTarget && (
        <ToggleTeacherStatusModal
          teacher={toggleStatusTarget}
          onClose={() => setToggleStatusTarget(null)}
          onSuccess={(msg) => {
            setToggleStatusTarget(null);
            showToast(msg, 'success');
            refreshTeachers();
          }}
        />
      )}

      {/* Drawer Chi tiết Giáo viên */}
      {detailTarget && (
        <TeacherDetailDrawer
          teacher={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={(t) => {
            setDetailTarget(null);
            setEditingTeacher(t);
            setFormModalOpen(true);
          }}
          onResetPassword={(t) => {
            setDetailTarget(null);
            setResetPwdTarget(t);
          }}
          onToggleStatus={(t) => {
            setDetailTarget(null);
            setToggleStatusTarget(t);
          }}
        />
      )}
    </div>
  );
}
