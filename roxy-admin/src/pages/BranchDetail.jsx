import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/formatters';
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-4 text-rose-600 shadow-xs">
          🚫
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Bạn không có quyền truy cập Chi tiết Chi nhánh
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          Thông tin quản trị chuyên sâu và điều phối vận hành chi nhánh chỉ dành riêng cho Ban Giám
          Đốc (SuperAdmin). Quản lý cơ sở và Giáo viên không có quyền truy cập.
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

  // ==================== TRẠNG THÁI LOADING ====================
  if (isValidBranchId && loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-5 w-64 bg-slate-200 rounded" />
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex justify-between">
            <div className="h-7 w-72 bg-slate-200 rounded" />
            <div className="h-7 w-32 bg-slate-200 rounded-full" />
          </div>
          <div className="h-4 w-2/3 bg-slate-100 rounded" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white border border-slate-200 rounded-xl" />
      </div>
    );
  }

  // ==================== TRẠNG THÁI 404 KHÔNG TÌM THẤY ====================
  if (!isValidBranchId || notFound || (!loading && !branch && !error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 text-slate-500">
          🏢
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy cơ sở này</h2>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          Chi nhánh <span className="font-mono font-semibold">#BR-{id}</span> không tồn tại hoặc đã
          bị xóa khỏi hệ thống.
        </p>
        <Link
          to="/branches"
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs active:scale-[0.98] transition-all"
        >
          <span>←</span>
          <span>Quay lại Quản lý chi nhánh</span>
        </Link>
      </div>
    );
  }

  // ==================== TRẠNG THÁI LỖI TẢI DỮ LIỆU ====================
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/branches"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700"
        >
          <span>←</span>
          <span>Quay lại Quản lý chi nhánh</span>
        </Link>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <div className="text-2xl">⚠️</div>
          <p className="text-sm font-medium text-rose-800">{error}</p>
          <button
            type="button"
            onClick={refreshData}
            className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg active:scale-95 transition-all cursor-pointer"
          >
            Thử tải lại
          </button>
        </div>
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

      {/* Breadcrumb chuẩn Wayfinding */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/branches"
          className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-blue-700 active:scale-95 transition-all duration-150 cursor-pointer min-h-[36px]"
        >
          <span>←</span>
          <span>Quay lại Quản lý chi nhánh</span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900 break-words">
          {branch.branchName}
        </span>
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          #BR-{branch.id}
        </span>
      </nav>

      {/* Header thông tin chi nhánh */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>🏢</span>
                <span>{branch.branchName}</span>
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                #BR-{branch.id}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ngày tạo: <span className="font-medium text-slate-700">{formatDate(branch.createdAt)}</span>
            </p>
          </div>

          {isActive ? (
            <span className="self-start bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5 shadow-2xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </span>
          ) : (
            <span className="self-start bg-slate-100 text-slate-600 border border-slate-300 font-medium px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5 shadow-2xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Ngừng hoạt động
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-slate-700 leading-relaxed flex items-start gap-2">
            <span className="shrink-0">📍</span>
            <span>
              <span className="font-medium text-slate-600">Địa chỉ: </span>
              {branch.address}
            </span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="shrink-0">📞</span>
            <span className="font-medium text-slate-600">Hotline liên hệ:</span>
            {branch.phone ? (
              <a
                href={telHref}
                className="text-blue-600 font-mono font-medium hover:underline inline-flex items-center gap-2 min-h-[36px]"
              >
                <span>{branch.phone}</span>
                <span className="text-[11px] font-sans bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                  📱 Gọi hotline
                </span>
              </a>
            ) : (
              <span className="text-slate-400 italic text-xs">(Chưa cập nhật số hotline)</span>
            )}
          </div>
        </div>

        {/* Cặp nút hành động ở Header */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 text-sm font-semibold rounded-lg shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>✏️</span>
            <span>Chỉnh sửa thông tin</span>
          </button>

          {isActive ? (
            <button
              type="button"
              onClick={() => setDeactivateModalOpen(true)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 hover:border-rose-400 text-sm font-semibold rounded-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>🚫</span>
              <span>Ngừng hoạt động cơ sở</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setReactivateModalOpen(true)}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 text-sm font-semibold rounded-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>✓</span>
              <span>Kích hoạt lại cơ sở</span>
            </button>
          )}
        </div>
      </section>

      {/* 3 thẻ KPI thống kê (lấy đúng từ GET /api/Branches/{id}) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`text-left p-4 md:p-5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            activeTab === 'classes'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-800">
            <span className="flex items-center gap-1.5">
              <span>🏫</span> Lớp đang mở
            </span>
            <span className="text-[11px] font-medium text-blue-600">Xem tab →</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-blue-700 font-mono my-1 tabular-nums">
            {branch.classCount ?? 0}
          </div>
          <div className="text-xs text-slate-500">Các lớp đang học hoặc sắp mở</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`text-left p-4 md:p-5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            activeTab === 'students'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
            <span className="flex items-center gap-1.5">
              <span>🎓</span> Học viên đang học
            </span>
            <span className="text-[11px] font-medium text-emerald-600">Xem tab →</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-emerald-700 font-mono my-1 tabular-nums">
            {branch.studentCount ?? 0}
          </div>
          <div className="text-xs text-slate-500">Học viên có trạng thái Active</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`text-left p-4 md:p-5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-[0.98] ${
            activeTab === 'teachers'
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-800">
            <span className="flex items-center gap-1.5">
              <span>👩‍🏫</span> Giáo viên cơ sở
            </span>
            <span className="text-[11px] font-medium text-indigo-600">Xem tab →</span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-indigo-700 font-mono my-1 tabular-nums">
            {branch.teacherCount ?? 0}
          </div>
          <div className="text-xs text-slate-500">Giáo viên đang hoạt động</div>
        </button>
      </div>

      {/* Hệ thống 3 Tabs Danh sách */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Thanh Header Tab */}
        <div
          role="tablist"
          aria-label="Danh sách chi tiết chi nhánh"
          className="flex border-b border-slate-200 gap-2 md:gap-4 px-4 overflow-x-auto"
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
                    ? 'border-blue-600 text-blue-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${
                    active ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
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
      </section>

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
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Đang học
        </span>
      );
    }
    if (status === 'Upcoming') {
      return (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Sắp mở
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Đã kết thúc
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          🏫 Danh sách lớp học ({totalCount} lớp)
        </h2>
        <Link
          to={`/classes?branchId=${branchId}`}
          className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs active:scale-[0.98] transition-all"
        >
          <span>↗</span>
          <span>Quản lý tại trang Lớp học</span>
        </Link>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên lớp, khóa học, giáo viên..."
            className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'Ongoing', label: 'Đang học' },
            { key: 'Upcoming', label: 'Sắp mở' },
            { key: 'Finished', label: 'Đã kết thúc' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onStatusFilterChange(opt.key)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          {totalCount === 0
            ? `Chưa có lớp học nào thuộc ${branchName}.`
            : 'Không tìm thấy lớp học phù hợp với bộ lọc.'}
        </div>
      ) : (
        <>
          {/* Bảng Desktop */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tên lớp</th>
                  <th className="py-3 px-4 font-semibold">Khóa học / Hình thức</th>
                  <th className="py-3 px-4 font-semibold">Giáo viên</th>
                  <th className="py-3 px-4 font-semibold">Sĩ số tối đa</th>
                  <th className="py-3 px-4 font-semibold">Thời gian</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls) => (
                  <tr
                    key={cls.id}
                    onClick={onNavigateToClasses}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-semibold text-blue-700 hover:underline">{cls.className}</p>
                      <p className="text-xs font-mono text-slate-400">#CLS-{cls.id}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-slate-800 font-medium">{cls.courseName || '—'}</p>
                      <p className="text-xs text-slate-500">
                        {cls.classType === 'OneToOne' ? 'Kèm 1-1' : 'Lớp nhóm'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {cls.teacherName ? (
                        <span className="text-slate-800 font-medium">👩‍🏫 {cls.teacherName}</span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Chưa phân công GV
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      Tối đa {cls.maxStudents ?? 0} bé
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {cls.startDate ? formatDate(cls.startDate) : '—'} –{' '}
                      {cls.endDate ? formatDate(cls.endDate) : '—'}
                    </td>
                    <td className="py-3 px-4">{renderClassStatusBadge(cls.status)}</td>
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
                className="border border-slate-200 rounded-xl p-4 space-y-2 hover:border-blue-300 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-blue-700 text-sm">{cls.className}</p>
                    <p className="text-xs font-mono text-slate-400">#CLS-{cls.id}</p>
                  </div>
                  {renderClassStatusBadge(cls.status)}
                </div>
                <p className="text-xs text-slate-600">
                  {cls.courseName || '—'} •{' '}
                  {cls.classType === 'OneToOne' ? 'Kèm 1-1' : 'Lớp nhóm'} • Tối đa{' '}
                  {cls.maxStudents ?? 0} bé
                </p>
                <p className="text-xs text-slate-700">
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
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          👩‍🏫 Đội ngũ giáo viên cơ sở ({totalCount} giáo viên)
        </h2>
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên giáo viên, SĐT, email..."
            className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {teachers.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          {totalCount === 0
            ? `Chưa có giáo viên nào được phân công tại ${branchName}.`
            : 'Không tìm thấy giáo viên phù hợp.'}
        </div>
      ) : (
        <>
          {/* Bảng Desktop */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Giáo viên</th>
                  <th className="py-3 px-4 font-semibold">Số điện thoại</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(t.fullName)}
                        </div>
                        <span className="font-semibold text-slate-900">{t.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {t.phone ? (
                        <a
                          href={`tel:${t.phone.replace(/\s+/g, '')}`}
                          className="text-blue-600 font-mono font-medium hover:underline inline-flex items-center gap-1.5"
                        >
                          <span>📞 {t.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {t.email ? (
                        <a
                          href={`mailto:${t.email}`}
                          className="text-slate-600 hover:text-blue-600 hover:underline"
                        >
                          {t.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {t.isActive ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          ● Hoạt động
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          ● Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
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
              <div key={t.id} className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(t.fullName)}
                    </div>
                    <p className="font-semibold text-slate-900 text-sm truncate">{t.fullName}</p>
                  </div>
                  {t.isActive ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0">
                      Đã khóa
                    </span>
                  )}
                </div>
                {t.email && (
                  <p className="text-xs text-slate-600 truncate">
                    ✉️{' '}
                    <a href={`mailto:${t.email}`} className="hover:underline">
                      {t.email}
                    </a>
                  </p>
                )}
                {t.phone && (
                  <a
                    href={`tel:${t.phone.replace(/\s+/g, '')}`}
                    className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold active:scale-95 transition-all"
                  >
                    <span>📞</span>
                    <span>Gọi {t.phone}</span>
                  </a>
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
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Đang học
          </span>
        );
      case 'Paused':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Tạm dừng
          </span>
        );
      case 'Graduated':
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            Tốt nghiệp
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
            Thôi học
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          🎓 Danh sách học viên ({totalCount} học viên)
        </h2>
        <Link
          to={`/students?branchId=${branchId}`}
          className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs active:scale-[0.98] transition-all"
        >
          <span>↗</span>
          <span>Quản lý tại trang Học viên</span>
        </Link>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên bé, mã #STU, trường học, phụ huynh..."
            className="w-full min-h-[42px] pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'Active', label: 'Đang học' },
            { key: 'Paused', label: 'Tạm dừng' },
            { key: 'Graduated', label: 'Tốt nghiệp' },
            { key: 'Dropped', label: 'Thôi học' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onStatusFilterChange(opt.key)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          {totalCount === 0
            ? `Chưa có học viên nào ghi danh tại ${branchName}.`
            : 'Không tìm thấy học viên phù hợp với bộ lọc.'}
        </div>
      ) : (
        <>
          {/* Bảng Desktop */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Học viên</th>
                  <th className="py-3 px-4 font-semibold">Mã số</th>
                  <th className="py-3 px-4 font-semibold">Ngày sinh / Tuổi</th>
                  <th className="py-3 px-4 font-semibold">Phụ huynh &amp; Liên hệ</th>
                  <th className="py-3 px-4 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((stu) => {
                  const age = calcAge(stu.dob);
                  return (
                    <tr
                      key={stu.id}
                      onClick={onNavigateToStudents}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{stu.fullName}</p>
                        {(stu.school || stu.grade) && (
                          <p className="text-xs text-slate-500">
                            {[stu.school, stu.grade].filter(Boolean).join(' – ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          #STU-{stu.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {stu.dob ? formatDate(stu.dob) : '—'}
                        {age !== null && <span className="text-slate-500"> ({age} tuổi)</span>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{stu.parentName || '—'}</p>
                        {stu.parentPhone && (
                          <a
                            href={`tel:${stu.parentPhone.replace(/\s+/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-mono text-blue-600 hover:underline"
                          >
                            📞 {stu.parentPhone}
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4">{renderStudentStatus(stu.status)}</td>
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
                  className="border border-slate-200 rounded-xl p-4 space-y-2 hover:border-blue-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{stu.fullName}</p>
                      <p className="text-xs font-mono text-slate-500">#STU-{stu.id}</p>
                    </div>
                    {renderStudentStatus(stu.status)}
                  </div>
                  <p className="text-xs text-slate-600">
                    {stu.dob ? formatDate(stu.dob) : '—'}
                    {age !== null ? ` (${age} tuổi)` : ''}
                    {stu.school ? ` • ${stu.school}` : ''}
                  </p>
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-700 truncate">
                      PH: {stu.parentName || '—'}
                    </span>
                    {stu.parentPhone && (
                      <a
                        href={`tel:${stu.parentPhone.replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shrink-0"
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
