import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/formatters';

/**
 * Màn hình Quản lý Chi nhánh (/branches) — Chỉ dành cho SuperAdmin.
 */
export default function Branches() {
  const navigate = useNavigate();

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4 text-rose-600 shadow-xs">
          🚫
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Bạn không có quyền truy cập phân hệ Quản lý Chi nhánh
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          Phân hệ Cấu hình Chi nhánh &amp; Cơ sở trung tâm chỉ dành riêng cho Ban Giám Đốc
          (SuperAdmin). Quản lý cơ sở và Giáo viên không được phép can thiệp danh mục cơ sở.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
          >
            Quay lại Tổng quan
          </button>
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            Xem Lớp học
          </button>
        </div>
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
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>🏢</span>
            <span>Quản lý Chi nhánh Cơ sở</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Danh sách cơ sở đào tạo, thông tin liên hệ và giám sát hoạt động giảng dạy toàn hệ
            thống Roxy Academy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingBranch(null);
            setFormModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150 cursor-pointer min-h-[44px] shrink-0"
        >
          <span>+</span>
          <span>Thêm chi nhánh mới</span>
        </button>
      </div>

      {/* Thanh tóm tắt nhanh (Summary Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-lg shrink-0">
            🏛️
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Chi nhánh hoạt động</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {summaryStats.activeCount}
              <span className="text-xs font-sans font-normal text-slate-400 ml-1">
                / {summaryStats.total}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-lg shrink-0">
            🏫
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Lớp đang mở</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {summaryStats.totalClasses}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg shrink-0">
            🎓
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Học viên đang học</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {summaryStats.totalStudents}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-lg shrink-0">
            👩‍🏫
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Giáo viên cơ sở</p>
            <p className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              {summaryStats.totalTeachers}
            </p>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc trạng thái */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên cơ sở, địa chỉ, số điện thoại..."
            className="w-full min-h-[42px] pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'all', label: `Tất cả (${summaryStats.total})` },
            { key: 'active', label: `Đang hoạt động (${summaryStats.activeCount})` },
            { key: 'inactive', label: `Ngừng hoạt động (${summaryStats.inactiveCount})` },
          ].map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

      {/* Trạng thái Loading / Error / Empty / Danh sách */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="h-6 w-48 bg-slate-200 rounded" />
                <div className="h-6 w-28 bg-slate-200 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="h-16 bg-slate-100 rounded-lg" />
                <div className="h-16 bg-slate-100 rounded-lg" />
                <div className="h-16 bg-slate-100 rounded-lg" />
              </div>
              <div className="flex justify-between pt-2">
                <div className="h-10 w-32 bg-slate-200 rounded-lg" />
                <div className="h-10 w-36 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium text-rose-800">{error}</p>
          <button
            type="button"
            onClick={refreshBranches}
            className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="text-3xl">🏢</div>
          <h3 className="text-base font-bold text-slate-800">
            {branches.length === 0
              ? 'Chưa có chi nhánh nào trong hệ thống'
              : 'Không tìm thấy chi nhánh phù hợp'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {branches.length === 0
              ? 'Hãy bấm nút "Thêm chi nhánh mới" để khởi tạo cơ sở đầu tiên cho Roxy Academy.'
              : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để xem các cơ sở khác.'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 md:gap-6">
          {filteredBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
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
function BranchCard({ branch, onEdit, onDeactivate, onReactivate }) {
  const isActive = Boolean(branch.isActive);
  const telHref = branch.phone ? `tel:${branch.phone.replace(/\s+/g, '')}` : null;

  return (
    <article
      className={`rounded-xl border p-5 md:p-6 transition-all duration-200 flex flex-col justify-between relative ${
        isActive
          ? 'bg-white border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm'
          : 'bg-slate-50/70 border-dashed border-slate-300 opacity-90'
      }`}
    >
      <div>
        {/* Tiêu đề & Badge trạng thái */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg md:text-xl text-slate-900 tracking-tight">
                {branch.branchName}
              </h2>
              <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                #BR-{branch.id}
              </span>
            </div>
          </div>

          {isActive ? (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 border border-slate-300 font-medium px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Ngừng hoạt động
            </span>
          )}
        </div>

        {/* Thông tin địa chỉ, hotline, ngày tạo */}
        <div className="space-y-1.5 text-sm">
          <p className="text-slate-700 leading-relaxed flex items-start gap-2">
            <span className="shrink-0 mt-0.5">📍</span>
            <span>{branch.address}</span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="shrink-0">📞</span>
            {branch.phone ? (
              <a
                href={telHref}
                className="text-blue-600 font-mono font-medium hover:underline inline-flex items-center gap-1.5 min-h-[32px]"
              >
                <span>{branch.phone}</span>
                <span className="text-[11px] font-sans bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                  Gọi ngay
                </span>
              </a>
            ) : (
              <span className="text-slate-400 italic text-xs">— (Chưa cập nhật số hotline)</span>
            )}
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-2 pt-0.5">
            <span>📅</span>
            <span>Ngày tạo: {formatDate(branch.createdAt)}</span>
          </p>
        </div>

        {/* Cụm 3 thẻ chỉ số KPI thời gian thực */}
        <div className="grid grid-cols-3 gap-2.5 my-4">
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 text-center">
            <p className="font-bold font-mono text-lg text-blue-700 tabular-nums">
              {branch.classCount ?? 0}
            </p>
            <p className="text-[11px] font-medium text-blue-800 uppercase tracking-tight">
              🏫 Lớp đang mở
            </p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 text-center">
            <p className="font-bold font-mono text-lg text-emerald-700 tabular-nums">
              {branch.studentCount ?? 0}
            </p>
            <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-tight">
              🎓 Học viên
            </p>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2.5 text-center">
            <p className="font-bold font-mono text-lg text-indigo-700 tabular-nums">
              {branch.teacherCount ?? 0}
            </p>
            <p className="text-[11px] font-medium text-indigo-800 uppercase tracking-tight">
              👩‍🏫 Giáo viên
            </p>
          </div>
        </div>
      </div>

      {/* Thanh thao tác chân thẻ */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 text-xs font-semibold rounded-lg shadow-2xs active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <span>✏️</span>
          <span>Sửa chi nhánh</span>
        </button>

        {isActive ? (
          <button
            type="button"
            onClick={onDeactivate}
            className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 text-xs font-semibold rounded-lg active:scale-95 transition-all duration-100 cursor-pointer"
          >
            <span>🚫</span>
            <span>Ngừng hoạt động</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onReactivate}
            className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 text-xs font-semibold rounded-lg active:scale-95 transition-all duration-100 cursor-pointer"
          >
            <span>✓</span>
            <span>Kích hoạt lại</span>
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * Khối cảnh báo lỗi 400 khi không thể ngừng hoạt động chi nhánh.
 */
function DeactivationBlockedAlert({ branchId, message, onNavigate }) {
  return (
    <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-900 space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0">❌</span>
        <div className="space-y-1 text-sm">
          <p className="font-bold text-rose-900">Không thể ngừng hoạt động chi nhánh này!</p>
          <p className="text-rose-800 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-rose-200 space-y-2">
        <p className="text-xs font-semibold text-rose-800">Hành động khắc phục nhanh:</p>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/classes?branchId=${branchId}`}
            onClick={onNavigate}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>🏫</span>
            <span>Mở danh sách Lớp học</span>
          </Link>
          <Link
            to={`/students?branchId=${branchId}`}
            onClick={onNavigate}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>🎓</span>
            <span>Mở danh sách Học viên</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal Thêm mới / Chỉnh sửa thông tin Chi nhánh.
 * Mobile: Bottom sheet; Desktop: Centered modal.
 */
function CreateEditBranchModal({ branch, onClose, onSuccess }) {
  const isEdit = Boolean(branch);

  const [branchName, setBranchName] = useState(branch?.branchName || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [isActive, setIsActive] = useState(branch ? Boolean(branch.isActive) : true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isDeactivationBlocked, setIsDeactivationBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const validate = () => {
    const errors = {};
    const trimmedName = branchName.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      errors.branchName = 'Vui lòng nhập tên chi nhánh cơ sở.';
    } else if (trimmedName.length < 3 || trimmedName.length > 150) {
      errors.branchName = 'Tên chi nhánh phải từ 3 đến 150 ký tự.';
    }

    if (!trimmedAddress) {
      errors.address = 'Vui lòng nhập địa chỉ cụ thể của cơ sở.';
    } else if (trimmedAddress.length < 5 || trimmedAddress.length > 300) {
      errors.address = 'Địa chỉ chi nhánh phải từ 5 đến 300 ký tự.';
    }

    if (trimmedPhone) {
      const normalized = trimmedPhone.replace(/[\s.-]/g, '');
      if (trimmedPhone.length > 20 || !/^(0|\+84)[0-9]{8,10}$/.test(normalized)) {
        errors.phone = 'Số điện thoại không hợp lệ (VD: 0326 538 824).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    setIsDeactivationBlocked(false);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const trimmedPhone = phone.trim();
      if (isEdit) {
        await axiosClient.put(`/Branches/${branch.id}`, {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
          isActive,
        });
        onSuccess('Cập nhật thông tin chi nhánh thành công.');
      } else {
        await axiosClient.post('/Branches', {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
        });
        onSuccess('Thêm chi nhánh mới thành công.');
      }
    } catch (err) {
      console.error('Lỗi lưu chi nhánh:', err);
      const status = err.response?.status;
      const serverMsg =
        err.response?.data?.message || 'Không thể lưu thông tin chi nhánh. Vui lòng thử lại.';
      setSubmitError(serverMsg);
      if (isEdit && status === 400 && !isActive && branch?.isActive) {
        setIsDeactivationBlocked(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Modal / Mobile Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0 transition-transform duration-200"
      >
        {/* Drag handle trên Mobile */}
        <div className="sm:hidden pt-2.5 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h3 id="branch-modal-title" className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🏢</span>
              <span>{isEdit ? 'Chỉnh sửa thông tin chi nhánh' : 'Thêm chi nhánh cơ sở mới'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Cập nhật tên cơ sở, địa chỉ liên hệ hoặc trạng thái hoạt động.'
                : 'Điền đầy đủ thông tin địa điểm đào tạo của Roxy Academy.'}
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {submitError &&
            (isDeactivationBlocked ? (
              <DeactivationBlockedAlert
                branchId={branch.id}
                message={submitError}
                onNavigate={onClose}
              />
            ) : (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3 flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{submitError}</span>
              </div>
            ))}

          {/* Tên chi nhánh */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên chi nhánh cơ sở <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={150}
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                if (fieldErrors.branchName) {
                  setFieldErrors((prev) => ({ ...prev, branchName: '' }));
                }
              }}
              placeholder="VD: Cơ sở 1 - Bình Trưng Đông"
              className={`w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.branchName
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {fieldErrors.branchName && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.branchName}</p>
            )}
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Địa chỉ chi nhánh <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) {
                  setFieldErrors((prev) => ({ ...prev, address: '' }));
                }
              }}
              placeholder="VD: 123 Nguyễn Duy Trinh, P. Bình Trưng, TP.HCM"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.address
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {fieldErrors.address && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.address}</p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại hotline <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <input
              type="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }
              }}
              placeholder="VD: 0326 538 824"
              className={`w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.phone
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Trạng thái hoạt động (CHỈ HIỂN THỊ KHI SỬA) */}
          {isEdit && (
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Trạng thái hoạt động
              </label>
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-sm text-slate-700">
                  {isActive
                    ? 'Đang hoạt động (Tiếp nhận lớp học & học viên mới)'
                    : 'Ngừng hoạt động (Ẩn khỏi danh mục mở lớp mới)'}
                </span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked);
                    setIsDeactivationBlocked(false);
                    setSubmitError('');
                  }}
                  className="h-5 w-5 accent-blue-600 rounded cursor-pointer shrink-0"
                />
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu dữ liệu...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{isEdit ? 'Lưu thay đổi' : 'Lưu chi nhánh'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Hộp thoại xác nhận ngừng hoạt động chi nhánh (gọi DELETE /api/Branches/{id}).
 * Giữ nguyên hộp thoại và hiển thị lỗi 400 nếu chi nhánh còn lớp mở hoặc học viên active.
 */
function DeactivateBranchModal({ branch, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error400, setError400] = useState('');
  const [otherError, setOtherError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirm = async () => {
    if (isSubmitting || error400) return;

    setIsSubmitting(true);
    setError400('');
    setOtherError('');
    try {
      await axiosClient.delete(`/Branches/${branch.id}`);
      onSuccess();
    } catch (err) {
      console.error('Lỗi ngừng hoạt động chi nhánh:', err);
      const status = err.response?.status;
      const serverMsg =
        err.response?.data?.message ||
        'Không thể ngừng hoạt động chi nhánh. Vui lòng thử lại.';
      if (status === 400) {
        setError400(serverMsg);
      } else {
        setOtherError(serverMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 id="deactivate-modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>⚠️</span>
            <span>Xác nhận ngừng hoạt động chi nhánh</span>
          </h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            Bạn có chắc chắn muốn ngừng hoạt động chi nhánh{' '}
            <strong className="text-slate-900">{branch.branchName}</strong>{' '}
            <span className="font-mono text-xs text-slate-500">(#BR-{branch.id})</span>?
          </p>

          <ul className="text-xs text-slate-600 space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3 list-disc list-inside">
            <li>Chi nhánh sẽ bị ẩn khỏi danh mục chọn cơ sở khi tạo Lớp học mới và ghi danh.</li>
            <li>Dữ liệu lịch sử, học phí và điểm danh trước đây vẫn được bảo toàn nguyên vẹn.</li>
          </ul>

          {error400 && (
            <DeactivationBlockedAlert
              branchId={branch.id}
              message={error400}
              onNavigate={onClose}
            />
          )}

          {otherError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3">
              {otherError}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isSubmitting || Boolean(error400)}
              onClick={handleConfirm}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>🚫</span>
                  <span>Xác nhận ngừng hoạt động</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hộp thoại xác nhận kích hoạt lại chi nhánh (PUT /api/Branches/{id} với isActive: true).
 */
function ReactivateBranchModal({ branch, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await axiosClient.put(`/Branches/${branch.id}`, {
        branchName: branch.branchName,
        address: branch.address,
        phone: branch.phone || null,
        isActive: true,
      });
      onSuccess();
    } catch (err) {
      console.error('Lỗi kích hoạt lại chi nhánh:', err);
      setErrorMsg(
        err.response?.data?.message || 'Không thể kích hoạt lại chi nhánh. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reactivate-modal-title"
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 id="reactivate-modal-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>✓</span>
            <span>Kích hoạt lại chi nhánh</span>
          </h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Bạn có muốn kích hoạt lại cơ sở{' '}
            <strong className="text-slate-900">{branch.branchName}</strong>? Cơ sở này sẽ xuất hiện
            trở lại trong danh sách tuyển sinh và mở lớp mới.
          </p>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang kích hoạt...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Xác nhận kích hoạt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
