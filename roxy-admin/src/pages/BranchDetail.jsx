import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/formatters';
import {
  Card,
  Badge,
  PrimaryButton,
  SecondaryButton,
  InputPill,
} from '../components/ui';
import {
  CreateEditBranchModal,
  DeactivateBranchModal,
  ReactivateBranchModal,
} from '../components/BranchModals';

/**
 * Màn hình Chi tiết Chi nhánh (/branches/:id) — Chỉ dành cho SuperAdmin.
 */
export default function BranchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const branchId = Number(id);
  const isValidBranchId = Boolean(id) && Number.isInteger(branchId) && branchId > 0;

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  // State dữ liệu chi nhánh & danh sách liên quan
  const [branch, setBranch] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Tab đang chọn: 'classes' | 'teachers' | 'students'
  const [activeTab, setActiveTab] = useState('classes');

  // Bộ lọc từng tab
  const [classSearch, setClassSearch] = useState('');
  const [classStatusFilter, setClassStatusFilter] = useState('all');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);

  const refreshData = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Tải dữ liệu (chỉ gọi API khi là SuperAdmin và ID hợp lệ)
  useEffect(() => {
    if (!isSuperAdmin || !isValidBranchId) return;

    let ignore = false;
    const fetchAll = async () => {
      setLoading(true);
      setNotFound(false);
      setError('');

      try {
        const branchRes = await axiosClient.get(`/Branches/${branchId}`);
        if (ignore) return;
        setBranch(branchRes.data);

        const [classesRes, teachersRes, studentsRes] = await Promise.allSettled([
          axiosClient.get('/Classes'),
          axiosClient.get(`/Users?role=Teacher&branchId=${branchId}&pageSize=100`),
          axiosClient.get(`/Students?branchId=${branchId}&pageSize=100`),
        ]);

        if (ignore) return;

        if (classesRes.status === 'fulfilled') {
          const allClasses = Array.isArray(classesRes.value.data) ? classesRes.value.data : [];
          setClasses(allClasses.filter((c) => c.branchId === branchId));
        } else {
          setClasses([]);
        }

        if (teachersRes.status === 'fulfilled') {
          const tData = teachersRes.value.data;
          const items = Array.isArray(tData?.items)
            ? tData.items
            : Array.isArray(tData)
            ? tData
            : [];
          setTeachers(items);
        } else {
          setTeachers([]);
        }

        if (studentsRes.status === 'fulfilled') {
          const sData = studentsRes.value.data;
          const items = Array.isArray(sData?.items)
            ? sData.items
            : Array.isArray(sData)
            ? sData
            : [];
          setStudents(items);
        } else {
          setStudents([]);
        }
      } catch (err) {
        if (ignore) return;
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          console.error('Lỗi tải chi tiết chi nhánh:', err);
          setError(
            err.response?.data?.message ||
              'Không thể tải thông tin chi nhánh. Vui lòng thử lại sau.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      ignore = true;
    };
  }, [isSuperAdmin, isValidBranchId, branchId, reloadKey]);

  // Lọc danh sách lớp
  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    return classes.filter((c) => {
      if (classStatusFilter !== 'all' && c.status !== classStatusFilter) return false;
      if (!q) return true;
      return (
        (c.className || '').toLowerCase().includes(q) ||
        (c.courseName || '').toLowerCase().includes(q) ||
        (c.teacherName || '').toLowerCase().includes(q) ||
        `#cls-${c.id}`.includes(q)
      );
    });
  }, [classes, classSearch, classStatusFilter]);

  // Lọc danh sách giáo viên
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return teachers.filter((t) => {
      if (!q) return true;
      return (
        (t.fullName || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q)
      );
    });
  }, [teachers, teacherSearch]);

  // Lọc danh sách học viên
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (studentStatusFilter !== 'all' && s.status !== studentStatusFilter) return false;
      if (!q) return true;
      return (
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.school || '').toLowerCase().includes(q) ||
        (s.parentName || '').toLowerCase().includes(q) ||
        (s.parentPhone || '').toLowerCase().includes(q) ||
        `#stu-${s.id}`.includes(q)
      );
    });
  }, [students, studentSearch, studentStatusFilter]);

  // ==================== MÀN HÌNH CHẶN 403 (KHÔNG PHẢI SUPERADMIN) ====================
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card large className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-3xl mb-4 text-rose-600 mx-auto">
            🚫
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">
            Bạn không có quyền truy cập Chi tiết Chi nhánh
          </h2>
          <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
            Thông tin quản trị chuyên sâu và điều phối vận hành chi nhánh chỉ dành riêng cho Ban Giám
            Đốc (SuperAdmin). Quản lý cơ sở và Giáo viên không có quyền truy cập.
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

  // ==================== TRẠNG THÁI LOADING ====================
  if (isValidBranchId && loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-9 w-56 bg-surface-subtle rounded-full" />
        <Card large className="p-6 space-y-4">
          <div className="flex justify-between">
            <div className="h-7 w-72 bg-surface-subtle rounded-lg" />
            <div className="h-7 w-32 bg-surface-subtle rounded-full" />
          </div>
          <div className="h-4 w-2/3 bg-surface-subtle rounded-lg" />
          <div className="h-4 w-48 bg-surface-subtle rounded-lg" />
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-28" />
          ))}
        </div>
        <Card className="h-64" />
      </div>
    );
  }

  // ==================== TRẠNG THÁI 404 KHÔNG TÌM THẤY ====================
  if (!isValidBranchId || notFound || (!loading && !branch && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[55vh] px-4">
        <Card large className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-subtle border border-line flex items-center justify-center text-3xl mb-4 text-ink-muted mx-auto">
            🏢
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Không tìm thấy cơ sở này</h2>
          <p className="text-sm text-ink-secondary mb-6">
            Chi nhánh <span className="font-mono font-semibold text-ink">#BR-{id}</span> không tồn tại hoặc đã
            bị xóa khỏi hệ thống.
          </p>
          <PrimaryButton as={Link} to="/branches">
            <span>←</span>
            <span>Quay lại Quản lý chi nhánh</span>
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  // ==================== TRẠNG THÁI LỖI TẢI DỮ LIỆU ====================
  if (error) {
    return (
      <div className="space-y-4">
        <SecondaryButton as={Link} to="/branches">
          <span>←</span>
          <span>Quay lại Quản lý chi nhánh</span>
        </SecondaryButton>
        <Card className="bg-rose-50/70 border-rose-200 p-6 text-center space-y-3">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium text-rose-800">{error}</p>
          <button
            type="button"
            onClick={refreshData}
            className="min-h-[44px] px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-full active:scale-95 transition-all cursor-pointer"
          >
            Thử tải lại
          </button>
        </Card>
      </div>
    );
  }

  const isActive = Boolean(branch.isActive);
  const telHref = branch.phone ? `tel:${branch.phone.replace(/\s+/g, '')}` : null;

  return (
    <div className="space-y-5">
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

      {/* Breadcrumb chuẩn Wayfinding */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <SecondaryButton as={Link} to="/branches" className="px-4 py-2 text-xs">
          <span>←</span>
          <span>Quay lại Quản lý chi nhánh</span>
        </SecondaryButton>
        <span className="text-ink-muted">/</span>
        <span className="font-semibold text-ink break-words">
          {branch.branchName}
        </span>
        <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-subtle text-ink-secondary border border-line">
          #BR-{branch.id}
        </span>
      </nav>

      {/* Header thông tin chi nhánh */}
      <Card as="section" large className="p-5 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                <span>🏢</span>
                <span>{branch.branchName}</span>
              </h1>
              <span className="font-mono text-xs font-semibold text-ink-secondary bg-surface-subtle border border-line px-2.5 py-0.5 rounded-full">
                #BR-{branch.id}
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Ngày tạo: <span className="font-medium text-ink-secondary">{formatDate(branch.createdAt)}</span>
            </p>
          </div>

          {isActive ? (
            <Badge variant="emerald" className="self-start shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </Badge>
          ) : (
            <Badge variant="neutral" className="self-start shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-muted" />
              Ngừng hoạt động
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-ink-secondary leading-relaxed flex items-start gap-2">
            <span className="shrink-0">📍</span>
            <span>
              <span className="font-medium text-ink">Địa chỉ: </span>
              {branch.address}
            </span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="shrink-0">📞</span>
            <span className="font-medium text-ink">Hotline liên hệ:</span>
            {branch.phone ? (
              <a
                href={telHref}
                className="text-teal hover:text-gold-active font-mono font-semibold hover:underline inline-flex items-center gap-2 min-h-[36px] transition-colors"
              >
                <span>{branch.phone}</span>
                <span className="text-[11px] font-sans bg-gold-soft text-teal border border-gold/40 px-2.5 py-0.5 rounded-full">
                  📱 Gọi hotline
                </span>
              </a>
            ) : (
              <span className="text-ink-muted italic text-xs">(Chưa cập nhật số hotline)</span>
            )}
          </div>
        </div>

        {/* Cặp nút hành động ở Header */}
        <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <SecondaryButton
            type="button"
            onClick={() => setEditModalOpen(true)}
          >
            <span>✏️</span>
            <span>Chỉnh sửa thông tin</span>
          </SecondaryButton>

          {isActive ? (
            <button
              type="button"
              onClick={() => setDeactivateModalOpen(true)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 text-sm font-semibold rounded-full active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>🚫</span>
              <span>Ngừng hoạt động cơ sở</span>
            </button>
          ) : (
            <PrimaryButton
              type="button"
              onClick={() => setReactivateModalOpen(true)}
            >
              <span>✓</span>
              <span>Kích hoạt lại cơ sở</span>
            </PrimaryButton>
          )}
        </div>
      </Card>

      {/* 3 thẻ KPI thống kê (lấy đúng từ GET /api/Branches/{id}) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`text-left p-4 md:p-5 rounded-card border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            activeTab === 'classes'
              ? 'bg-gold-soft/50 border-teal ring-2 ring-teal/20 shadow-card'
              : 'bg-surface border-line/80 hover:border-line-strong hover:bg-mint-canvas/50 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal">
            <span className="flex items-center gap-1.5">
              <span>🏫</span> Lớp đang mở
            </span>
            <span className="text-[11px] font-semibold text-teal">Xem tab →</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-teal font-mono my-1 tabular-nums">
            {branch.classCount ?? 0}
          </div>
          <div className="text-xs text-ink-secondary">Các lớp đang học hoặc sắp mở</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`text-left p-4 md:p-5 rounded-card border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            activeTab === 'students'
              ? 'bg-gold-soft/50 border-teal ring-2 ring-teal/20 shadow-card'
              : 'bg-surface border-line/80 hover:border-line-strong hover:bg-mint-canvas/50 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
            <span className="flex items-center gap-1.5">
              <span>🎓</span> Học viên đang học
            </span>
            <span className="text-[11px] font-semibold text-teal">Xem tab →</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-emerald-700 font-mono my-1 tabular-nums">
            {branch.studentCount ?? 0}
          </div>
          <div className="text-xs text-ink-secondary">Học viên có trạng thái Active</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`text-left p-4 md:p-5 rounded-card border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            activeTab === 'teachers'
              ? 'bg-gold-soft/50 border-teal ring-2 ring-teal/20 shadow-card'
              : 'bg-surface border-line/80 hover:border-line-strong hover:bg-mint-canvas/50 shadow-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal">
            <span className="flex items-center gap-1.5">
              <span>👩‍🏫</span> Giáo viên cơ sở
            </span>
            <span className="text-[11px] font-semibold text-teal">Xem tab →</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-teal font-mono my-1 tabular-nums">
            {branch.teacherCount ?? 0}
          </div>
          <div className="text-xs text-ink-secondary">Giáo viên đang hoạt động</div>
        </button>
      </div>

      {/* Hệ thống 3 Tabs Danh sách */}
      <Card as="section" className="overflow-hidden">
        {/* Thanh Header Tab */}
        <div
          role="tablist"
          aria-label="Danh sách chi tiết chi nhánh"
          className="flex border-b border-line gap-2 md:gap-4 px-4 overflow-x-auto bg-surface"
        >
          {[
            { key: 'classes', icon: '🏫', label: 'Lớp học cơ sở', count: classes.length },
            { key: 'teachers', icon: '👩‍🏫', label: 'Giáo viên cơ sở', count: teachers.length },
            { key: 'students', icon: '🎓', label: 'Học viên cơ sở', count: students.length },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-[48px] py-3 px-3 text-sm inline-flex items-center gap-2 whitespace-nowrap border-b-2 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  active
                    ? 'border-teal text-teal font-bold'
                    : 'border-transparent text-ink-secondary hover:text-ink font-medium'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                    active ? 'bg-gold-soft text-teal' : 'bg-surface-subtle text-ink-secondary'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Nội dung Tab */}
        <div key={activeTab} className="p-4 md:p-5 tab-content">
          {activeTab === 'classes' && (
            <ClassesTabContent
              branchId={branch.id}
              branchName={branch.branchName}
              classes={filteredClasses}
              totalCount={classes.length}
              search={classSearch}
              onSearchChange={setClassSearch}
              statusFilter={classStatusFilter}
              onStatusFilterChange={setClassStatusFilter}
              onNavigateToClasses={() => navigate(`/classes?branchId=${branch.id}`)}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersTabContent
              branchName={branch.branchName}
              teachers={filteredTeachers}
              totalCount={teachers.length}
              search={teacherSearch}
              onSearchChange={setTeacherSearch}
            />
          )}

          {activeTab === 'students' && (
            <StudentsTabContent
              branchId={branch.id}
              branchName={branch.branchName}
              students={filteredStudents}
              totalCount={students.length}
              search={studentSearch}
              onSearchChange={setStudentSearch}
              statusFilter={studentStatusFilter}
              onStatusFilterChange={setStudentStatusFilter}
              onNavigateToStudents={() => navigate(`/students?branchId=${branch.id}`)}
            />
          )}
        </div>
      </Card>

      {/* Modals */}
      {editModalOpen && (
        <CreateEditBranchModal
          branch={branch}
          onClose={() => setEditModalOpen(false)}
          onSuccess={(message) => {
            setEditModalOpen(false);
            showToast(message, 'success');
            refreshData();
          }}
        />
      )}

      {deactivateModalOpen && (
        <DeactivateBranchModal
          branch={branch}
          onClose={() => setDeactivateModalOpen(false)}
          onSuccess={() => {
            setDeactivateModalOpen(false);
            showToast('Đã ngừng hoạt động chi nhánh thành công.', 'success');
            refreshData();
          }}
        />
      )}

      {reactivateModalOpen && (
        <ReactivateBranchModal
          branch={branch}
          onClose={() => setReactivateModalOpen(false)}
          onSuccess={() => {
            setReactivateModalOpen(false);
            showToast('Đã kích hoạt lại chi nhánh thành công.', 'success');
            refreshData();
          }}
        />
      )}
    </div>
  );
}

// ==================== TAB 1: LỚP HỌC CƠ SỞ ====================
function ClassesTabContent({
  branchId,
  branchName,
  classes,
  totalCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNavigateToClasses,
}) {
  const renderClassStatusBadge = (status) => {
    if (status === 'Ongoing') {
      return <Badge variant="emerald">Đang học</Badge>;
    }
    if (status === 'Upcoming') {
      return <Badge variant="blue">Sắp mở</Badge>;
    }
    return <Badge variant="neutral">Đã kết thúc</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wide">
          🏫 Danh sách lớp học ({totalCount} lớp)
        </h2>
        <PrimaryButton as={Link} to={`/classes?branchId=${branchId}`} className="px-4 py-2 text-xs">
          <span>↗</span>
          <span>Quản lý tại trang Lớp học</span>
        </PrimaryButton>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-ink-muted pointer-events-none">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <InputPill
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên lớp, khóa học, giáo viên..."
            className="pl-10"
          />
        </div>

        <select
          aria-label="Lọc trạng thái lớp học"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="min-w-[165px] rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Ongoing">Đang học</option>
          <option value="Upcoming">Sắp mở</option>
          <option value="Finished">Đã kết thúc</option>
        </select>
      </div>

      {classes.length === 0 ? (
        <div className="border border-dashed border-line rounded-card p-8 text-center text-sm text-ink-secondary bg-surface-subtle">
          {totalCount === 0
            ? `Chưa có lớp học nào thuộc ${branchName}.`
            : 'Không tìm thấy lớp học phù hợp với bộ lọc.'}
        </div>
      ) : (
        <>
          {/* Bảng Desktop */}
          <div className="hidden md:block overflow-x-auto border border-line rounded-card">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-subtle text-[11px] uppercase tracking-wider text-ink-muted border-b border-line">
                <tr>
                  <th className="px-2.5 py-2.5 font-semibold">Tên lớp</th>
                  <th className="px-2.5 py-2.5 font-semibold">Khóa học / Hình thức</th>
                  <th className="px-2.5 py-2.5 font-semibold">Giáo viên</th>
                  <th className="px-2.5 py-2.5 font-semibold">Sĩ số tối đa</th>
                  <th className="px-2.5 py-2.5 font-semibold">Thời gian</th>
                  <th className="px-2.5 py-2.5 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {classes.map((cls) => (
                  <tr
                    key={cls.id}
                    onClick={onNavigateToClasses}
                    className="hover:bg-mint-canvas/60 cursor-pointer transition-colors"
                  >
                    <td className="px-2.5 py-2.5">
                      <p className="font-semibold text-teal hover:underline">{cls.className}</p>
                      <p className="text-xs font-mono text-ink-muted">#CLS-{cls.id}</p>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <p className="text-ink font-medium">{cls.courseName || '—'}</p>
                      <p className="text-xs text-ink-secondary">
                        {cls.classType === 'OneToOne' ? 'Kèm 1-1' : 'Lớp nhóm'}
                      </p>
                    </td>
                    <td className="px-2.5 py-2.5">
                      {cls.teacherName ? (
                        <span className="text-ink font-medium">👩‍🏫 {cls.teacherName}</span>
                      ) : (
                        <Badge variant="amber">Chưa phân công GV</Badge>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono text-ink-secondary tabular-nums">
                      Tối đa {cls.maxStudents ?? 0} bé
                    </td>
                    <td className="px-2.5 py-2.5 text-xs text-ink-secondary tabular-nums">
                      {cls.startDate ? formatDate(cls.startDate) : '—'} –{' '}
                      {cls.endDate ? formatDate(cls.endDate) : '—'}
                    </td>
                    <td className="px-2.5 py-2.5">{renderClassStatusBadge(cls.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Thẻ Mobile */}
          <div className="md:hidden space-y-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={onNavigateToClasses}
                className="border border-line rounded-card p-4 space-y-2 hover:border-line-strong active:scale-[0.99] transition-all cursor-pointer bg-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-teal text-sm">{cls.className}</p>
                    <p className="text-xs font-mono text-ink-muted">#CLS-{cls.id}</p>
                  </div>
                  {renderClassStatusBadge(cls.status)}
                </div>
                <p className="text-xs text-ink-secondary">
                  {cls.courseName || '—'} •{' '}
                  {cls.classType === 'OneToOne' ? 'Kèm 1-1' : 'Lớp nhóm'} • Tối đa{' '}
                  {cls.maxStudents ?? 0} bé
                </p>
                <p className="text-xs text-ink">
                  👩‍🏫 {cls.teacherName || 'Chưa phân công giáo viên'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== TAB 2: GIÁO VIÊN CƠ SỞ ====================
function TeachersTabContent({ branchName, teachers, totalCount, search, onSearchChange }) {
  const getInitials = (name) => {
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wide">
          👩‍🏫 Đội ngũ giáo viên cơ sở ({totalCount} giáo viên)
        </h2>
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-ink-muted pointer-events-none">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <InputPill
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên giáo viên, SĐT, email..."
            className="pl-10"
          />
        </div>
      </div>

      {teachers.length === 0 ? (
        <div className="border border-dashed border-line rounded-card p-8 text-center text-sm text-ink-secondary bg-surface-subtle">
          {totalCount === 0
            ? `Chưa có giáo viên nào được phân công tại ${branchName}.`
            : 'Không tìm thấy giáo viên phù hợp.'}
        </div>
      ) : (
        <>
          {/* Bảng Desktop */}
          <div className="hidden md:block overflow-x-auto border border-line rounded-card">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-subtle text-[11px] uppercase tracking-wider text-ink-muted border-b border-line">
                <tr>
                  <th className="px-2.5 py-2.5 font-semibold">Giáo viên</th>
                  <th className="px-2.5 py-2.5 font-semibold">Số điện thoại</th>
                  <th className="px-2.5 py-2.5 font-semibold">Email</th>
                  <th className="px-2.5 py-2.5 font-semibold">Trạng thái</th>
                  <th className="px-2.5 py-2.5 font-semibold">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-mint-canvas/60 transition-colors">
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gold-soft text-teal font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(t.fullName)}
                        </div>
                        <span className="font-semibold text-ink">{t.fullName}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      {t.phone ? (
                        <a
                          href={`tel:${t.phone.replace(/\s+/g, '')}`}
                          className="text-teal hover:text-gold-active font-mono font-semibold hover:underline inline-flex items-center gap-1.5"
                        >
                          <span>📞 {t.phone}</span>
                        </a>
                      ) : (
                        <span className="text-ink-muted italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5">
                      {t.email ? (
                        <a
                          href={`mailto:${t.email}`}
                          className="text-ink-secondary hover:text-teal hover:underline"
                        >
                          {t.email}
                        </a>
                      ) : (
                        <span className="text-ink-muted italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5">
                      {t.isActive ? (
                        <Badge variant="emerald">Hoạt động</Badge>
                      ) : (
                        <Badge variant="neutral">Đã khóa</Badge>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 text-xs text-ink-secondary tabular-nums">
                      {t.createdAt ? formatDate(t.createdAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Thẻ Mobile */}
          <div className="md:hidden space-y-3">
            {teachers.map((t) => (
              <div key={t.id} className="border border-line rounded-card p-4 space-y-2.5 bg-surface">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gold-soft text-teal font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(t.fullName)}
                    </div>
                    <p className="font-semibold text-ink text-sm truncate">{t.fullName}</p>
                  </div>
                  {t.isActive ? (
                    <Badge variant="emerald" className="shrink-0">Hoạt động</Badge>
                  ) : (
                    <Badge variant="neutral" className="shrink-0">Đã khóa</Badge>
                  )}
                </div>
                {t.email && (
                  <p className="text-xs text-ink-secondary truncate">
                    ✉️{' '}
                    <a href={`mailto:${t.email}`} className="hover:underline">
                      {t.email}
                    </a>
                  </p>
                )}
                {t.phone && (
                  <SecondaryButton
                    as="a"
                    href={`tel:${t.phone.replace(/\s+/g, '')}`}
                    className="w-full py-2 text-xs"
                  >
                    <span>📞</span>
                    <span>Gọi {t.phone}</span>
                  </SecondaryButton>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== TAB 3: HỌC VIÊN CƠ SỞ ====================
function StudentsTabContent({
  branchId,
  branchName,
  students,
  totalCount,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNavigateToStudents,
}) {
  const calcAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const diff = new Date().getFullYear() - birth.getFullYear();
    return diff >= 0 ? diff : null;
  };

  const renderStudentStatus = (status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="emerald">Đang học</Badge>;
      case 'Paused':
        return <Badge variant="amber">Tạm dừng</Badge>;
      case 'Graduated':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-200">
            Tốt nghiệp
          </span>
        );
      default:
        return <Badge variant="neutral">Thôi học</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wide">
          🎓 Danh sách học viên ({totalCount} học viên)
        </h2>
        <PrimaryButton as={Link} to={`/students?branchId=${branchId}`} className="px-4 py-2 text-xs">
          <span>↗</span>
          <span>Quản lý tại trang Học viên</span>
        </PrimaryButton>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-ink-muted pointer-events-none">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </span>
          <InputPill
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên bé, mã #STU, trường học, phụ huynh..."
            className="pl-10"
          />
        </div>

        <select
          aria-label="Lọc trạng thái học viên"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="min-w-[165px] rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Active">Đang học</option>
          <option value="Paused">Tạm dừng</option>
          <option value="Graduated">Tốt nghiệp</option>
          <option value="Dropped">Thôi học</option>
        </select>
      </div>

      {students.length === 0 ? (
        <div className="border border-dashed border-line rounded-card p-8 text-center text-sm text-ink-secondary bg-surface-subtle">
          {totalCount === 0
            ? `Chưa có học viên nào ghi danh tại ${branchName}.`
            : 'Không tìm thấy học viên phù hợp với bộ lọc.'}
        </div>
      ) : (
        <>
          {/* Bảng Desktop */}
          <div className="hidden md:block overflow-x-auto border border-line rounded-card">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-subtle text-[11px] uppercase tracking-wider text-ink-muted border-b border-line">
                <tr>
                  <th className="px-2.5 py-2.5 font-semibold">Học viên</th>
                  <th className="px-2.5 py-2.5 font-semibold">Mã số</th>
                  <th className="px-2.5 py-2.5 font-semibold">Ngày sinh / Tuổi</th>
                  <th className="px-2.5 py-2.5 font-semibold">Phụ huynh &amp; Liên hệ</th>
                  <th className="px-2.5 py-2.5 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {students.map((stu) => {
                  const age = calcAge(stu.dob);
                  return (
                    <tr
                      key={stu.id}
                      onClick={onNavigateToStudents}
                      className="hover:bg-mint-canvas/60 cursor-pointer transition-colors"
                    >
                      <td className="px-2.5 py-2.5">
                        <p className="font-semibold text-ink">{stu.fullName}</p>
                        {(stu.school || stu.grade) && (
                          <p className="text-xs text-ink-secondary">
                            {[stu.school, stu.grade].filter(Boolean).join(' – ')}
                          </p>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span className="font-mono text-xs font-semibold text-ink-secondary bg-surface-subtle border border-line px-2 py-0.5 rounded-full">
                          #STU-{stu.id}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-xs text-ink-secondary tabular-nums">
                        {stu.dob ? formatDate(stu.dob) : '—'}
                        {age !== null && <span className="text-ink-muted"> ({age} tuổi)</span>}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <p className="font-medium text-ink">{stu.parentName || '—'}</p>
                        {stu.parentPhone && (
                          <a
                            href={`tel:${stu.parentPhone.replace(/\s+/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-mono text-teal hover:text-gold-active hover:underline"
                          >
                            📞 {stu.parentPhone}
                          </a>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5">{renderStudentStatus(stu.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Thẻ Mobile */}
          <div className="md:hidden space-y-3">
            {students.map((stu) => {
              const age = calcAge(stu.dob);
              return (
                <div
                  key={stu.id}
                  onClick={onNavigateToStudents}
                  className="border border-line rounded-card p-4 space-y-2 hover:border-line-strong cursor-pointer bg-surface"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink text-sm">{stu.fullName}</p>
                      <p className="text-xs font-mono text-ink-muted">#STU-{stu.id}</p>
                    </div>
                    {renderStudentStatus(stu.status)}
                  </div>
                  <p className="text-xs text-ink-secondary">
                    {stu.dob ? formatDate(stu.dob) : '—'}
                    {age !== null ? ` (${age} tuổi)` : ''}
                    {stu.school ? ` • ${stu.school}` : ''}
                  </p>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-ink truncate">
                      PH: {stu.parentName || '—'}
                    </span>
                    {stu.parentPhone && (
                      <a
                        href={`tel:${stu.parentPhone.replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1 bg-gold-soft text-teal border border-gold/40 rounded-full text-xs font-semibold shrink-0"
                      >
                        <span>📞</span>
                        <span>{stu.parentPhone}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
