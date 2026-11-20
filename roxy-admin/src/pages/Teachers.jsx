import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  Badge,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  SelectPill,
} from '../components/ui';
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

  const [currentUser] = useState(() => getStoredUser());

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
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card large className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-3xl mb-4 text-rose-600 mx-auto">
            🚫
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">
            403 — Không có quyền truy cập
          </h2>
          <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
            Phân hệ Quản lý Giáo viên chỉ dành cho Ban Giám Đốc (SuperAdmin) và Quản lý
            cơ sở (BranchManager).
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <PrimaryButton type="button" onClick={() => navigate('/')}>
              Quay lại Tổng quan
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => navigate('/classes')}>
              Xem Lớp học
            </SecondaryButton>
          </div>
        </Card>
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
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-modal text-sm font-medium ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-teal text-white'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '❌' : '✓'}</span>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header & Nút CTA chính */}
      <PageHeader
        eyebrow="Nhân sự giảng dạy"
        title={
          <span className="inline-flex items-center gap-2.5 flex-wrap">
            <span>Quản lý Giáo viên</span>
            <Badge variant="gold">{kpiStats.total} giáo viên</Badge>
          </span>
        }
        description={
          isSuperAdmin
            ? 'Danh sách tài khoản giáo viên, phân công chi nhánh, lịch dạy và cấp lại mật khẩu.'
            : `Danh sách giáo viên thuộc ${currentManagerBranchName}.`
        }
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              setEditingTeacher(null);
              setFormModalOpen(true);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm giáo viên</span>
          </PrimaryButton>
        }
      />

      {/* KPI Cards nhỏ gọn */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-gold-soft text-teal items-center justify-center text-lg shrink-0">
            👩‍🏫
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted truncate">
              Tổng giáo viên
            </p>
            <p className="text-lg sm:text-xl font-bold text-teal tabular-nums">
              {kpiStats.total}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 items-center justify-center text-lg shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted truncate">
              Đang hoạt động
            </p>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 tabular-nums">
              {kpiStats.active}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-rose-50 text-rose-700 items-center justify-center text-lg shrink-0">
            🔒
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted truncate">
              Đã khóa
            </p>
            <p className="text-lg sm:text-xl font-bold text-rose-700 tabular-nums">
              {kpiStats.inactive}
            </p>
          </div>
        </Card>
      </div>

      {/* Thanh tìm kiếm & lọc */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-ink-muted pointer-events-none">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <InputPill
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm họ tên hoặc số điện thoại..."
              className="pl-10 pr-9"
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
                className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc chi nhánh */}
          <SelectPill
            aria-label="Lọc theo chi nhánh"
            value={branchFilter}
            disabled={!isSuperAdmin}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            wrapperClassName="w-full md:w-auto md:min-w-[175px]"
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
          </SelectPill>

          {/* Lọc trạng thái */}
          <SelectPill
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            wrapperClassName="w-full md:w-auto md:min-w-[175px]"
          >
            <option value="all">Tất cả ({kpiStats.total})</option>
            <option value="active">Đang hoạt động ({kpiStats.active})</option>
            <option value="inactive">Đã khóa ({kpiStats.inactive})</option>
          </SelectPill>

          <SecondaryButton
            type="button"
            onClick={() => {
              setSearchInput('');
              setDebouncedSearch('');
              setStatusFilter('all');
              if (isSuperAdmin) setBranchFilter('');
              setPage(1);
            }}
          >
            Đặt lại
          </SecondaryButton>
        </div>
      </Card>

      {/* Danh sách / Loading / Error / Empty */}
      {loading ? (
        <Card className="p-4 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-12 bg-surface-subtle rounded-xl" />
          ))}
        </Card>
      ) : error ? (
        <Card className="bg-rose-50/70 border-rose-200 p-6 text-center space-y-3">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium text-rose-800">{error}</p>
          <button
            type="button"
            onClick={refreshTeachers}
            className="min-h-[44px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-full active:scale-[0.98] transition-all cursor-pointer"
          >
            Thử tải lại
          </button>
        </Card>
      ) : teachers.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="text-3xl">👩‍🏫</div>
          <h3 className="text-base font-bold text-ink">
            Không tìm thấy giáo viên phù hợp
          </h3>
          <p className="text-sm text-ink-secondary max-w-md mx-auto">
            {debouncedSearch || statusFilter !== 'all' || (isSuperAdmin && branchFilter)
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc để xem các giáo viên khác.'
              : 'Hãy bấm nút "Thêm giáo viên" để tạo tài khoản giáo viên đầu tiên.'}
          </p>
          {(debouncedSearch || statusFilter !== 'all' || (isSuperAdmin && branchFilter)) && (
            <SecondaryButton
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
                setStatusFilter('all');
                if (isSuperAdmin) setBranchFilter('');
                setPage(1);
              }}
            >
              Đặt lại bộ lọc
            </SecondaryButton>
          )}
        </Card>
      ) : (
        <>
          {/* MOBILE VIEW: Cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {teachers.map((t) => (
              <Card
                key={t.id}
                interactive
                onClick={() => setDetailTarget(t)}
                className={`p-4 space-y-3 cursor-pointer ${
                  !t.isActive ? 'bg-surface-subtle/80 border-dashed' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gold-soft text-teal font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(t.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink truncate">{t.fullName}</p>
                      <p className="text-xs font-mono text-ink-secondary tabular-nums">
                        {t.phoneNumber}
                      </p>
                    </div>
                  </div>
                  {t.isActive ? (
                    <Badge variant="emerald" className="shrink-0">
                      Hoạt động
                    </Badge>
                  ) : (
                    <Badge variant="rose" className="shrink-0">
                      Đã khóa
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-ink-secondary pt-2 border-t border-line/60">
                  <div>
                    <span className="text-ink-muted block">Chi nhánh</span>
                    <span className="font-medium text-ink">
                      {t.branchName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block">Mật khẩu</span>
                    <span className="mt-0.5 inline-block">
                      {t.hasPassword ? (
                        <Badge variant="blue">Đã đặt MK</Badge>
                      ) : (
                        <Badge variant="amber">Chưa có MK</Badge>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-ink-muted">Email: </span>
                    <span className="text-ink">{t.email || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between text-[11px] text-ink-muted tabular-nums">
                    <span>Tạo: {formatDate(t.createdAt)}</span>
                    <span>
                      Đăng nhập:{' '}
                      {t.lastLoginAt ? formatDateTime(t.lastLoginAt) : 'Chưa đăng nhập'}
                    </span>
                  </div>
                </div>

                <div
                  className="flex flex-wrap gap-2 pt-2 border-t border-line/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SecondaryButton
                    type="button"
                    onClick={() => setDetailTarget(t)}
                    className="flex-1 px-3 py-2 text-xs"
                  >
                    Chi tiết
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => {
                      setEditingTeacher(t);
                      setFormModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-xs"
                  >
                    Sửa
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => setResetPwdTarget(t)}
                    className="px-3 py-2 text-xs"
                  >
                    Đặt MK
                  </SecondaryButton>
                  <button
                    type="button"
                    onClick={() => setToggleStatusTarget(t)}
                    className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-full border cursor-pointer transition-colors ${
                      t.isActive
                        ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {t.isActive ? 'Khóa' : 'Mở khóa'}
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* DESKTOP VIEW: Table (>= 768px) */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="pl-2.5 pr-1.5 py-2.5">Giáo viên</th>
                    <th className="px-1.5 py-2.5">Liên hệ</th>
                    <th className="px-1.5 py-2.5">Chi nhánh</th>
                    <th className="px-1.5 py-2.5">Trạng thái</th>
                    <th className="px-1.5 py-2.5">Mật khẩu</th>
                    <th className="px-1.5 py-2.5 whitespace-nowrap">Tạo / Đăng nhập</th>
                    <th scope="col" className="pl-1.5 pr-2 py-2.5 text-center whitespace-nowrap sticky right-0 z-20 bg-surface-subtle shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 text-sm">
                  {teachers.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setDetailTarget(t)}
                      className={`hover:bg-mint-canvas/60 cursor-pointer transition-colors ${
                        !t.isActive ? 'bg-surface-subtle/60' : ''
                      }`}
                    >
                      <td className="pl-2.5 pr-1.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gold-soft text-teal font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(t.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate max-w-[140px]" title={t.fullName}>
                              {t.fullName}
                            </p>
                            <p className="text-xs text-ink-muted whitespace-nowrap">
                              ID #{t.id} • {t.preferredLanguage === 'en' ? 'EN' : 'VI'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-1.5 py-2.5">
                        <p className="font-mono font-medium text-ink tabular-nums whitespace-nowrap">
                          {t.phoneNumber}
                        </p>
                        <p className="text-xs text-ink-secondary truncate max-w-[135px]" title={t.email || undefined}>
                          {t.email || '—'}
                        </p>
                      </td>

                      <td className="px-1.5 py-2.5 text-ink font-medium">
                        <span className="block truncate max-w-[110px]" title={t.branchName || undefined}>
                          {t.branchName || '—'}
                        </span>
                      </td>

                      <td className="px-1.5 py-2.5 whitespace-nowrap">
                        {t.isActive ? (
                          <Badge variant="emerald" className="whitespace-nowrap">Đang hoạt động</Badge>
                        ) : (
                          <Badge variant="rose" className="whitespace-nowrap">Đã khóa</Badge>
                        )}
                      </td>

                      <td className="px-1.5 py-2.5 whitespace-nowrap">
                        {t.hasPassword ? (
                          <Badge variant="blue" className="whitespace-nowrap">Đã đặt mật khẩu</Badge>
                        ) : (
                          <Badge variant="amber" className="whitespace-nowrap">Chưa có mật khẩu</Badge>
                        )}
                      </td>

                      <td className="px-1.5 py-2.5 text-xs text-ink-secondary tabular-nums whitespace-nowrap">
                        <p>Tạo: {formatDate(t.createdAt)}</p>
                        <p className="text-ink-muted mt-0.5">
                          {t.lastLoginAt
                            ? `Login: ${formatDateTime(t.lastLoginAt)}`
                            : 'Chưa đăng nhập'}
                        </p>
                      </td>

                      <td
                        className="pl-1.5 pr-2 py-2.5 whitespace-nowrap text-center sticky right-0 z-10 bg-surface shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <IconButton
                            variant="neutral"
                            onClick={() => setDetailTarget(t)}
                            title="Xem chi tiết giáo viên"
                            aria-label="Xem chi tiết giáo viên"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </IconButton>

                          <IconButton
                            variant="neutral"
                            onClick={() => {
                              setEditingTeacher(t);
                              setFormModalOpen(true);
                            }}
                            title="Chỉnh sửa giáo viên"
                            aria-label="Chỉnh sửa giáo viên"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </IconButton>

                          <IconButton
                            variant="neutral"
                            onClick={() => setResetPwdTarget(t)}
                            title="Đặt lại mật khẩu"
                            aria-label="Đặt lại mật khẩu"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </IconButton>

                          <IconButton
                            variant={t.isActive ? 'danger' : 'neutral'}
                            onClick={() => setToggleStatusTarget(t)}
                            title={t.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            aria-label={t.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {t.isActive ? (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Phân trang */}
          <Card className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 text-xs text-ink-secondary">
            <span className="tabular-nums">
              Hiển thị{' '}
              <strong className="text-ink">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </strong>{' '}
              trong tổng số <strong className="text-ink">{total}</strong> giáo viên
            </span>

            <div className="flex items-center gap-2">
              <SecondaryButton
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 text-xs"
              >
                ← Trước
              </SecondaryButton>
              <span className="font-mono font-semibold text-teal px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <SecondaryButton
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 text-xs"
              >
                Sau →
              </SecondaryButton>
            </div>
          </Card>
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
