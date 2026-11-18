import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatCurrency, numberToVietnameseWords } from '../utils/formatters';
import {
  PageHeader,
  Card,
  Badge,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
} from '../components/ui';

export default function Courses() {
  // 1. Phân quyền truy cập: Chỉ SuperAdmin và BranchManager
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isStaff = currentUser.role === 'SuperAdmin' || currentUser.role === 'BranchManager';

  // State dữ liệu
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 2. Tải danh sách khóa học
  useEffect(() => {
    if (!isStaff) return;

    let ignore = false;
    const fetchCourses = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosClient.get('/Courses');
        if (!ignore) {
          setCourses(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải danh sách khóa học:', err);
          setError(err.response?.data?.message || 'Không thể tải danh sách khóa học.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchCourses();
    return () => {
      ignore = true;
    };
  }, [isStaff, reloadKey]);

  // 3. Thống kê KPI
  const stats = useMemo(() => {
    const total = courses.length;
    const active = courses.filter((c) => c.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [courses]);

  // 4. Lọc dữ liệu theo tìm kiếm và trạng thái
  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return courses.filter((c) => {
      // Tìm theo tên hoặc mã khóa
      const matchSearch =
        !term ||
        (c.courseName && c.courseName.toLowerCase().includes(term)) ||
        (c.courseCode && c.courseCode.toLowerCase().includes(term));

      // Lọc theo trạng thái
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.isActive) ||
        (statusFilter === 'INACTIVE' && !c.isActive);

      return matchSearch && matchStatus;
    });
  }, [courses, searchTerm, statusFilter]);

  // Điều hướng nếu không có quyền
  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  // 5. Thao tác Mở Modal Thêm / Sửa / Xóa
  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setSelectedCourse(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (course) => {
    setModalMode('EDIT');
    setSelectedCourse(course);
    setModalOpen(true);
  };

  const handleOpenDelete = (course) => {
    setDeletingCourse(course);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Xác nhận Xóa
  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await axiosClient.delete(`/Courses/${deletingCourse.id}`);
      showToast(`Đã xóa thành công khóa học "${deletingCourse.courseName}".`);
      setDeleteModalOpen(false);
      setDeletingCourse(null);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      console.error('Lỗi khi xóa khóa học:', err);
      // Xử lý thông báo lỗi nghiệp vụ rõ ràng (VD: có lớp đang mở)
      const msg =
        err.response?.data?.message ||
        'Không thể xóa khóa học này do đang có lớp học hoặc dữ liệu liên kết.';
      setDeleteError(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOAST THÔNG BÁO TỨC THÌ */}
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

      {/* HEADER & TIÊU ĐỀ TRANG */}
      <PageHeader
        eyebrow="Chương trình đào tạo"
        title={
          <span className="inline-flex items-center gap-2.5 flex-wrap">
            <span>Quản lý Khóa học</span>
            <Badge variant="gold">{stats.total} khóa học</Badge>
          </span>
        }
        description="Danh mục chương trình đào tạo, số buổi tiêu chuẩn và học phí định mức tại Roxy Academy."
        actions={
          <PrimaryButton type="button" onClick={handleOpenCreate}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm khóa học mới</span>
          </PrimaryButton>
        }
      />

      {/* THẺ THỐNG KÊ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Tổng số khóa học</p>
            <p className="text-2xl font-bold text-teal mt-1 tabular-nums">{stats.total}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft text-xl text-teal">
            📚
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Đang kích hoạt</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{stats.active}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700">
            ✅
          </div>
        </Card>

        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Tạm ngưng</p>
            <p className="text-2xl font-bold text-ink-muted mt-1 tabular-nums">{stats.inactive}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-subtle text-xl text-ink-muted">
            ⏸️
          </div>
        </Card>
      </div>

      {/* THANH TÌM KIẾM VÀ BỘ LỌC */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-ink-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <InputPill
              type="text"
              placeholder="Tìm theo tên hoặc mã khóa học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Select lọc trạng thái */}
          <select
            aria-label="Lọc trạng thái khóa học"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[175px] rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
          >
            <option value="ALL">Tất cả ({stats.total})</option>
            <option value="ACTIVE">Đang kích hoạt ({stats.active})</option>
            <option value="INACTIVE">Tạm ngưng ({stats.inactive})</option>
          </select>

          <SecondaryButton
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
          >
            Đặt lại
          </SecondaryButton>
        </div>
      </Card>

      {/* BẢNG DỮ LIỆU & MOBILE CARDS */}
      <Card className="overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
            <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Đang tải danh sách khóa học...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-subtle border border-line flex items-center justify-center text-3xl mb-3 text-ink-muted">
              📖
            </div>
            <h3 className="text-base font-bold text-ink">Không tìm thấy khóa học nào</h3>
            <p className="text-xs text-ink-secondary mt-1 max-w-sm">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Không có kết quả khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bộ lọc.'
                : 'Chưa có khóa học nào được tạo trong hệ thống. Bấm "Thêm khóa học mới" để bắt đầu.'}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="px-2 py-2.5">Mã khóa</th>
                    <th className="px-2 py-2.5">Tên khóa học</th>
                    <th className="px-2 py-2.5">Mô tả</th>
                    <th className="px-2 py-2.5 text-center">Số buổi</th>
                    <th className="px-2 py-2.5 text-right">Học phí chuẩn</th>
                    <th className="px-2 py-2.5 text-center">Trạng thái</th>
                    <th scope="col" className="px-2 py-2.5 text-right whitespace-nowrap sticky right-0 z-20 bg-surface-subtle shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-mint-canvas/60 transition-colors">
                      <td className="px-2 py-2.5 font-mono font-medium text-ink">
                        {c.courseCode ? (
                          <span className="inline-block rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs font-semibold text-ink border border-line">
                            {c.courseCode}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 font-semibold text-ink">
                        {c.courseName}
                      </td>
                      <td className="px-2 py-2.5 text-ink-secondary max-w-xs truncate" title={c.description}>
                        {c.description || <span className="text-ink-muted italic">Chưa có mô tả</span>}
                      </td>
                      <td className="px-2 py-2.5 text-center font-medium text-ink tabular-nums">
                        {c.totalSessions ? `${c.totalSessions} buổi` : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold text-teal font-mono tabular-nums">
                        {formatCurrency(c.defaultFee)}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {c.isActive ? (
                          <Badge variant="emerald">Đang mở</Badge>
                        ) : (
                          <Badge variant="neutral">Tạm ngưng</Badge>
                        )}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-right sticky right-0 z-10 bg-surface shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">
                        <div className="inline-flex items-center justify-end gap-1">
                          <IconButton
                            variant="neutral"
                            onClick={() => handleOpenEdit(c)}
                            title="Chỉnh sửa khóa học"
                            aria-label="Chỉnh sửa khóa học"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </IconButton>
                          <IconButton
                            variant="danger"
                            onClick={() => handleOpenDelete(c)}
                            title="Xóa khóa học"
                            aria-label="Xóa khóa học"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="block md:hidden divide-y divide-line/60">
              {filteredCourses.map((c) => (
                <div key={c.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {c.courseCode && (
                        <span className="inline-block rounded-full bg-surface-subtle px-2.5 py-0.5 text-[11px] font-semibold text-ink border border-line mb-1 font-mono">
                          {c.courseCode}
                        </span>
                      )}
                      <h4 className="font-bold text-ink text-sm">{c.courseName}</h4>
                    </div>
                    <div>
                      {c.isActive ? (
                        <Badge variant="emerald">Đang mở</Badge>
                      ) : (
                        <Badge variant="neutral">Tạm ngưng</Badge>
                      )}
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60">
                    <span className="text-ink-muted">
                      Thời lượng: <strong className="text-ink">{c.totalSessions || 0} buổi</strong>
                    </span>
                    <span className="font-bold text-teal font-mono tabular-nums">
                      {formatCurrency(c.defaultFee)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <SecondaryButton
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="px-3.5 py-1.5 text-xs"
                    >
                      Sửa
                    </SecondaryButton>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(c)}
                      className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* MODAL THÊM / SỬA KHÓA HỌC */}
      {modalOpen && (
        <CourseFormModal
          mode={modalMode}
          course={selectedCourse}
          onClose={() => setModalOpen(false)}
          onSuccess={(msg) => {
            setModalOpen(false);
            showToast(msg);
            setReloadKey((prev) => prev + 1);
          }}
        />
      )}

      {/* MODAL XÁC NHẬN XÓA KHÓA HỌC */}
      {deleteModalOpen && deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-surface rounded-card-lg shadow-modal border border-line/60 p-6 overflow-hidden modal-panel"
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Xác nhận xóa khóa học</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Hành động này sẽ vô hiệu hóa khóa học trong hệ thống.</p>
              </div>
            </div>

            <p className="text-xs md:text-sm text-ink-secondary leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa khóa học{' '}
              <strong className="text-ink font-semibold">{deletingCourse.courseName}</strong> (Mã:{' '}
              {deletingCourse.courseCode || '—'})?
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-card text-xs text-rose-800 flex items-start gap-2">
                <span className="shrink-0 text-sm">❌</span>
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteSubmitting}
              >
                Hủy bỏ
              </SecondaryButton>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-full shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MODAL THÊM / SỬA KHÓA HỌC ====================
function CourseFormModal({ mode, course, onClose, onSuccess }) {
  const isEdit = mode === 'EDIT';

  const [courseName, setCourseName] = useState(course?.courseName || '');
  const [courseCode, setCourseCode] = useState(course?.courseCode || '');
  const [description, setDescription] = useState(course?.description || '');
  const [totalSessions, setTotalSessions] = useState(
    course?.totalSessions !== undefined ? String(course.totalSessions) : '12'
  );
  const [defaultFee, setDefaultFee] = useState(
    course?.defaultFee !== undefined ? String(course.defaultFee) : '2500000'
  );
  const [isActive, setIsActive] = useState(course?.isActive ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const numFee = Number(defaultFee) || 0;
  const numSessions = Number(totalSessions) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!courseName.trim()) {
      setFormError('Vui lòng nhập tên khóa học.');
      return;
    }
    if (courseName.trim().length > 150) {
      setFormError('Tên khóa học không được vượt quá 150 ký tự.');
      return;
    }
    if (courseCode.trim().length > 30) {
      setFormError('Mã khóa học không được vượt quá 30 ký tự.');
      return;
    }
    if (description.trim().length > 500) {
      setFormError('Mô tả không được vượt quá 500 ký tự.');
      return;
    }
    if (numSessions <= 0) {
      setFormError('Số buổi học phải là số nguyên lớn hơn 0.');
      return;
    }
    if (numFee < 0) {
      setFormError('Học phí tiêu chuẩn không được âm.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseName: courseName.trim(),
        courseCode: courseCode.trim() || null,
        description: description.trim() || null,
        totalSessions: numSessions,
        defaultFee: numFee,
        isActive: Boolean(isActive),
      };

      if (isEdit) {
        await axiosClient.put(`/Courses/${course.id}`, payload);
        onSuccess(`Cập nhật khóa học "${payload.courseName}" thành công!`);
      } else {
        await axiosClient.post('/Courses', payload);
        onSuccess(`Thêm mới khóa học "${payload.courseName}" thành công!`);
      }
    } catch (err) {
      console.error('Lỗi khi lưu khóa học:', err);
      if (err.response?.status === 409) {
        setFormError('Mã khóa học này đã tồn tại trong hệ thống, vui lòng chọn mã khác.');
      } else {
        setFormError(err.response?.data?.message || 'Không thể lưu thông tin khóa học.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-surface rounded-card-lg shadow-modal border border-line/60 overflow-hidden my-8 modal-panel"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line/60 bg-surface-subtle">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-1.5">
                <span>{isEdit ? '✏️' : '✨'}</span>
                <span>{isEdit ? 'Chỉnh sửa Khóa học' : 'Thêm Khóa học mới'}</span>
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5">
                {isEdit
                  ? `Cập nhật thông tin cho khóa "${course?.courseName}"`
                  : 'Thiết lập chương trình đào tạo mới tại trung tâm'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:bg-surface hover:text-ink cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[calc(85vh-130px)] overflow-y-auto">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-card text-xs text-rose-800 flex items-start gap-2">
                <span className="shrink-0 text-sm">⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Tên khóa học */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Tên khóa học <span className="text-rose-600">*</span>
              </label>
              <InputPill
                type="text"
                required
                maxLength={150}
                placeholder="VD: Luyện chữ đẹp, Tiền tiểu học..."
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
              <span className="text-[10px] text-ink-muted float-right mt-1">{courseName.length}/150</span>
            </div>

            {/* Mã khóa học & Số buổi học */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Mã khóa học <span className="text-ink-muted font-normal">(tùy chọn)</span>
                </label>
                <InputPill
                  type="text"
                  maxLength={30}
                  placeholder="VD: LCD-01, TTH-24..."
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Số buổi học <span className="text-rose-600">*</span>
                </label>
                <InputPill
                  type="number"
                  required
                  min={1}
                  max={365}
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(e.target.value)}
                />
              </div>
            </div>

            {/* Học phí tiêu chuẩn */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Học phí tiêu chuẩn (VNĐ) <span className="text-rose-600">*</span>
              </label>
              <InputPill
                type="number"
                required
                min={0}
                step={50000}
                value={defaultFee}
                onChange={(e) => setDefaultFee(e.target.value)}
                className="font-mono"
              />
              {/* Phiên âm số tiền thành chữ tiếng Việt */}
              {numFee > 0 && (
                <p className="mt-1.5 text-xs text-teal bg-gold-soft/70 border border-gold/40 rounded-card p-2.5 italic leading-relaxed">
                  Bằng chữ: <strong>{numberToVietnameseWords(numFee)}</strong>
                </p>
              )}
            </div>

            {/* Mô tả khóa học */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Mô tả chương trình <span className="text-ink-muted font-normal">(tùy chọn)</span>
              </label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Mô tả mục tiêu đầu ra, đối tượng học viên hoặc đặc điểm nổi bật..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 text-xs md:text-sm bg-surface border border-line rounded-2xl text-ink focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 placeholder:text-ink-muted"
              />
              <span className="text-[10px] text-ink-muted float-right mt-1">{description.length}/500</span>
            </div>

            {/* Trạng thái Kích hoạt */}
            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-teal rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-ink">
                  Kích hoạt khóa học (cho phép mở lớp và đăng ký)
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line/60 bg-surface-subtle">
            <SecondaryButton
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
