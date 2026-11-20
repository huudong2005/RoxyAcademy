import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/formatters';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  Badge,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  CustomSelect,
} from '../components/ui';
import {
  CreateEditBranchModal,
  DeactivateBranchModal,
  ReactivateBranchModal,
} from '../components/BranchModals';

/**
 * Màn hình Quản lý Chi nhánh (/branches) — Chỉ dành cho SuperAdmin.
 */
export default function Branches() {
  const navigate = useNavigate();

  const [currentUser] = useState(() => getStoredUser());

  const isSuperAdmin = currentUser.role === 'SuperAdmin';

  // Danh sách chi nhánh
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Tìm kiếm & lọc trạng thái
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);

  // Tải danh sách chi nhánh (chỉ gọi API khi là SuperAdmin)
  useEffect(() => {
    if (!isSuperAdmin) return;

    let ignore = false;
    const fetchBranches = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosClient.get('/Branches');
        if (!ignore) {
          setBranches(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải danh sách chi nhánh:', err);
          setError(
            err.response?.data?.message ||
              'Không thể tải danh sách chi nhánh. Vui lòng thử lại sau.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchBranches();
    return () => {
      ignore = true;
    };
  }, [isSuperAdmin, reloadKey]);

  const refreshBranches = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Tính toán KPI tổng quan
  const summaryStats = useMemo(() => {
    const activeCount = branches.filter((b) => b.isActive).length;
    const inactiveCount = branches.length - activeCount;
    const totalClasses = branches.reduce((sum, b) => sum + (b.classCount || 0), 0);
    const totalStudents = branches.reduce((sum, b) => sum + (b.studentCount || 0), 0);
    const totalTeachers = branches.reduce((sum, b) => sum + (b.teacherCount || 0), 0);
    return {
      total: branches.length,
      activeCount,
      inactiveCount,
      totalClasses,
      totalStudents,
      totalTeachers,
    };
  }, [branches]);

  // Lọc danh sách theo từ khóa và trạng thái
  const filteredBranches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return branches.filter((b) => {
      if (statusFilter === 'active' && !b.isActive) return false;
      if (statusFilter === 'inactive' && b.isActive) return false;
      if (!q) return true;
      const nameMatch = (b.branchName || '').toLowerCase().includes(q);
      const addrMatch = (b.address || '').toLowerCase().includes(q);
      const phoneMatch = (b.phone || '').toLowerCase().includes(q);
      return nameMatch || addrMatch || phoneMatch;
    });
  }, [branches, searchTerm, statusFilter]);

  // ==================== MÀN HÌNH CHẶN 403 (KHÔNG PHẢI SUPERADMIN) ====================
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card large className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-3xl mb-4 text-rose-600 mx-auto">
            🚫
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">
            Bạn không có quyền truy cập phân hệ Quản lý Chi nhánh
          </h2>
          <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
            Phân hệ Cấu hình Chi nhánh &amp; Cơ sở trung tâm chỉ dành riêng cho Ban Giám Đốc
            (SuperAdmin). Quản lý cơ sở và Giáo viên không được phép can thiệp danh mục cơ sở.
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

  // ==================== GIAO DIỆN CHÍNH (SUPERADMIN) ====================
  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-modal text-sm font-medium transition-all ${
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
        eyebrow="Hệ thống cơ sở"
        title={
          <span className="inline-flex items-center gap-2.5 flex-wrap">
            <span>Quản lý Chi nhánh</span>
            <Badge variant="gold">{summaryStats.activeCount}/{summaryStats.total} hoạt động</Badge>
          </span>
        }
        description="Danh sách cơ sở đào tạo, thông tin liên hệ và giám sát hoạt động giảng dạy toàn hệ thống Roxy Academy."
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              setEditingBranch(null);
              setFormModalOpen(true);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm chi nhánh mới</span>
          </PrimaryButton>
        }
      />

      {/* Thanh tóm tắt nhanh (Summary Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold-soft text-teal flex items-center justify-center text-lg shrink-0">
            🏛️
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted leading-snug">
              Chi nhánh hoạt động
            </p>
            <p className="text-lg font-bold text-teal tabular-nums">
              {summaryStats.activeCount}
              <span className="text-xs font-normal text-ink-muted ml-1">
                / {summaryStats.total}
              </span>
            </p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold-soft text-teal flex items-center justify-center text-lg shrink-0">
            🏫
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted leading-snug">
              Lớp đang mở
            </p>
            <p className="text-lg font-bold text-teal tabular-nums">
              {summaryStats.totalClasses}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg shrink-0">
            🎓
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted leading-snug">
              Học viên đang học
            </p>
            <p className="text-lg font-bold text-emerald-700 tabular-nums">
              {summaryStats.totalStudents}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-lg shrink-0">
            👩‍🏫
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted leading-snug">
              Giáo viên cơ sở
            </p>
            <p className="text-lg font-bold text-amber-700 tabular-nums">
              {summaryStats.totalTeachers}
            </p>
          </div>
        </Card>
      </div>

      {/* Thanh tìm kiếm & lọc trạng thái */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-ink-muted pointer-events-none">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <InputPill
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên cơ sở, địa chỉ, số điện thoại..."
              className="pl-10 pr-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <CustomSelect
            aria-label="Lọc theo trạng thái chi nhánh"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            wrapperClassName="w-full md:w-auto md:min-w-[175px]"
            options={[
              { value: 'all', label: `Tất cả (${summaryStats.total})` },
              { value: 'active', label: `Đang hoạt động (${summaryStats.activeCount})` },
              { value: 'inactive', label: `Ngừng hoạt động (${summaryStats.inactiveCount})` },
            ]}
          />

          <SecondaryButton
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            Đặt lại
          </SecondaryButton>
        </div>
      </Card>

      {/* Trạng thái Loading / Error / Empty / Danh sách */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {[1, 2].map((n) => (
            <Card key={n} className="p-5 md:p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="h-6 w-48 bg-surface-subtle rounded-lg" />
                <div className="h-6 w-28 bg-surface-subtle rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-surface-subtle rounded-lg" />
                <div className="h-4 w-1/2 bg-surface-subtle rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="h-16 bg-surface-subtle rounded-card" />
                <div className="h-16 bg-surface-subtle rounded-card" />
                <div className="h-16 bg-surface-subtle rounded-card" />
              </div>
              <div className="flex justify-between pt-2">
                <div className="h-10 w-32 bg-surface-subtle rounded-full" />
                <div className="h-10 w-36 bg-surface-subtle rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-rose-50/70 border-rose-200 p-6 text-center space-y-3">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium text-rose-800">{error}</p>
          <button
            type="button"
            onClick={refreshBranches}
            className="min-h-[44px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-full active:scale-95 transition-all cursor-pointer"
          >
            Thử tải lại
          </button>
        </Card>
      ) : filteredBranches.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="text-3xl">🏢</div>
          <h3 className="text-base font-bold text-ink">
            {branches.length === 0
              ? 'Chưa có chi nhánh nào trong hệ thống'
              : 'Không tìm thấy chi nhánh phù hợp'}
          </h3>
          <p className="text-sm text-ink-secondary max-w-md mx-auto">
            {branches.length === 0
              ? 'Hãy bấm nút "Thêm chi nhánh mới" để khởi tạo cơ sở đầu tiên cho Roxy Academy.'
              : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem các cơ sở khác.'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <SecondaryButton
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Đặt lại bộ lọc
            </SecondaryButton>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 md:gap-6">
          {filteredBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onViewDetail={() => navigate(`/branches/${branch.id}`)}
              onEdit={() => {
                setEditingBranch(branch);
                setFormModalOpen(true);
              }}
              onDeactivate={() => setDeactivateTarget(branch)}
              onReactivate={() => setReactivateTarget(branch)}
            />
          ))}
        </div>
      )}

      {/* Modal Thêm / Sửa Chi nhánh */}
      {formModalOpen && (
        <CreateEditBranchModal
          branch={editingBranch}
          onClose={() => {
            setFormModalOpen(false);
            setEditingBranch(null);
          }}
          onBranchSaved={refreshBranches}
          onSuccess={(message) => {
            setFormModalOpen(false);
            setEditingBranch(null);
            showToast(message, 'success');
            refreshBranches();
          }}
        />
      )}

      {/* Hộp thoại Xác nhận Ngừng hoạt động (Xử lý lỗi 400) */}
      {deactivateTarget && (
        <DeactivateBranchModal
          branch={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => {
            setDeactivateTarget(null);
            showToast('Đã ngừng hoạt động chi nhánh thành công.', 'success');
            refreshBranches();
          }}
        />
      )}

      {/* Hộp thoại Xác nhận Kích hoạt lại */}
      {reactivateTarget && (
        <ReactivateBranchModal
          branch={reactivateTarget}
          onClose={() => setReactivateTarget(null)}
          onSuccess={() => {
            setReactivateTarget(null);
            showToast('Đã kích hoạt lại chi nhánh thành công.', 'success');
            refreshBranches();
          }}
        />
      )}
    </div>
  );
}

/**
 * Thẻ hiển thị thông tin và KPI của 1 chi nhánh.
 */
function BranchCard({ branch, onViewDetail, onEdit, onDeactivate, onReactivate }) {
  const isActive = Boolean(branch.isActive);
  const telHref = branch.phone ? `tel:${branch.phone.replace(/\s+/g, '')}` : null;

  return (
    <Card
      as="article"
      interactive
      onClick={onViewDetail}
      className={`p-5 md:p-6 flex flex-col justify-between relative cursor-pointer ${
        !isActive ? 'bg-surface-subtle/80 border-dashed opacity-90' : ''
      }`}
    >
      <div>
        {/* Tiêu đề & Badge trạng thái */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg md:text-xl text-ink tracking-tight">
                {branch.branchName}
              </h2>
              <span className="text-xs font-mono font-semibold text-ink-secondary bg-surface-subtle border border-line px-2 py-0.5 rounded-full">
                #BR-{branch.id}
              </span>
            </div>
          </div>

          {isActive ? (
            <Badge variant="emerald" className="shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </Badge>
          ) : (
            <Badge variant="neutral" className="shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted" />
              Ngừng hoạt động
            </Badge>
          )}
        </div>

        {/* Thông tin địa chỉ, hotline, ngày tạo */}
        <div className="space-y-1.5 text-sm">
          <p className="text-ink-secondary leading-relaxed flex items-start gap-2">
            <span className="shrink-0 mt-0.5">📍</span>
            <span>{branch.address}</span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="shrink-0">📞</span>
            {branch.phone ? (
              <a
                href={telHref}
                onClick={(e) => e.stopPropagation()}
                className="text-teal hover:text-gold-active font-mono font-semibold hover:underline inline-flex items-center gap-1.5 min-h-[32px] transition-colors"
              >
                <span>{branch.phone}</span>
                <span className="text-[11px] font-sans bg-gold-soft text-teal border border-gold/40 px-2 py-0.5 rounded-full">
                  Gọi ngay
                </span>
              </a>
            ) : (
              <span className="text-ink-muted italic text-xs">— (Chưa cập nhật số hotline)</span>
            )}
          </div>

          <p className="text-xs text-ink-muted flex items-center gap-2 pt-0.5">
            <span>📅</span>
            <span>Ngày tạo: {formatDate(branch.createdAt)}</span>
          </p>
        </div>

        {/* Cụm 3 thẻ chỉ số KPI thời gian thực */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="bg-surface-subtle border border-line/80 rounded-card p-2.5 text-center">
            <p className="font-bold font-mono text-lg text-teal tabular-nums">
              {branch.classCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-tight">
              🏫 Lớp đang mở
            </p>
          </div>

          <div className="bg-surface-subtle border border-line/80 rounded-card p-2.5 text-center">
            <p className="font-bold font-mono text-lg text-emerald-700 tabular-nums">
              {branch.studentCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-tight">
              🎓 Học viên
            </p>
          </div>

          <div className="bg-surface-subtle border border-line/80 rounded-card p-2.5 text-center">
            <p className="font-bold font-mono text-lg text-teal tabular-nums">
              {branch.teacherCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-tight">
              👩‍🏫 Giáo viên
            </p>
          </div>
        </div>
      </div>

      {/* Thanh thao tác chân thẻ */}
      <div
        className="pt-3 border-t border-line/60 flex flex-wrap items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <SecondaryButton
          type="button"
          onClick={onViewDetail}
          className="px-4 py-2 text-xs"
        >
          <span>Xem chi tiết</span>
        </SecondaryButton>

        <div className="flex items-center gap-2">
          <IconButton
            variant="neutral"
            onClick={onEdit}
            title="Chỉnh sửa chi nhánh"
            aria-label="Chỉnh sửa chi nhánh"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </IconButton>

          {isActive ? (
            <IconButton
              variant="danger"
              onClick={onDeactivate}
              title="Ngừng hoạt động chi nhánh"
              aria-label="Ngừng hoạt động chi nhánh"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </IconButton>
          ) : (
            <IconButton
              variant="neutral"
              onClick={onReactivate}
              title="Kích hoạt lại chi nhánh"
              aria-label="Kích hoạt lại chi nhánh"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </IconButton>
          )}
        </div>
      </div>
    </Card>
  );
}
