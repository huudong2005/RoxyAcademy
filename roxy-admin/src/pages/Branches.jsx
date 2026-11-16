import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/formatters';
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
    <article
      onClick={onViewDetail}
      className={`rounded-xl border p-5 md:p-6 transition-all duration-200 flex flex-col justify-between relative cursor-pointer ${
        isActive
          ? 'bg-white border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm'
          : 'bg-slate-50/70 border-dashed border-slate-300 opacity-90 hover:border-blue-300 hover:shadow-sm'
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
                onClick={(e) => e.stopPropagation()}
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
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail();
          }}
          className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-xs font-semibold rounded-lg active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <span>👁️</span>
          <span>Xem chi tiết</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 text-xs font-semibold rounded-lg shadow-2xs active:scale-95 transition-all duration-100 cursor-pointer"
          >
            <span>✏️</span>
            <span>Sửa chi nhánh</span>
          </button>

          {isActive ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeactivate();
              }}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 text-xs font-semibold rounded-lg active:scale-95 transition-all duration-100 cursor-pointer"
            >
              <span>🚫</span>
              <span>Ngừng hoạt động</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReactivate();
              }}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 text-xs font-semibold rounded-lg active:scale-95 transition-all duration-100 cursor-pointer"
            >
              <span>✓</span>
              <span>Kích hoạt lại</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
