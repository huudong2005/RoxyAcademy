import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatCurrency, numberToVietnameseWords } from '../utils/formatters';

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
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all transform animate-in fade-in duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <span>{toastMessage.type === 'error' ? '❌' : '✓'}</span>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* HEADER & TIÊU ĐỀ TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>📖</span> Quản lý Khóa học
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Danh mục chương trình đào tạo, số buổi tiêu chuẩn và học phí định mức tại Roxy Academy.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm rounded-lg shadow-xs transition-all duration-150 cursor-pointer min-h-[42px]"
        >
          <span className="text-base font-bold">+</span>
          <span>Thêm khóa học mới</span>
        </button>
      </div>

      {/* THẺ THỐNG KÊ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng số khóa học</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
            📚
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang kích hoạt</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
            ✅
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tạm ngưng</p>
            <p className="text-2xl font-bold text-slate-500 mt-1">{stats.inactive}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-600">
            ⏸️
          </div>
        </div>
      </div>

      {/* THANH TÌM KIẾM VÀ BỘ LỌC */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Ô Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã khóa học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>

        {/* Thanh lọc trạng thái */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ACTIVE', label: '✓ Đang kích hoạt' },
            { id: 'INACTIVE', label: '⏸ Tạm ngưng' },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BẢNG DỮ LIỆU & MOBILE CARDS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Đang tải danh sách khóa học...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-3 text-slate-400">
              📖
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy khóa học nào</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Không có kết quả khớp với bộ lọc hiện tại. Thử đổi từ khóa hoặc bộ lọc.'
                : 'Chưa có khóa học nào được tạo trong hệ thống. Bấm "+ Thêm khóa học mới" để bắt đầu.'}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Mã khóa</th>
                    <th className="py-3 px-4">Tên khóa học</th>
                    <th className="py-3 px-4">Mô tả</th>
                    <th className="py-3 px-4 text-center">Số buổi</th>
                    <th className="py-3 px-4 text-right">Học phí chuẩn</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {c.courseCode ? (
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                            {c.courseCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {c.courseName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={c.description}>
                        {c.description || <span className="text-slate-400 italic">Chưa có mô tả</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-800">
                        {c.totalSessions ? `${c.totalSessions} buổi` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                        {formatCurrency(c.defaultFee)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Đang mở
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Tạm ngưng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Chỉnh sửa khóa học"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(c)}
                            title="Xóa khóa học"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredCourses.map((c) => (
                <div key={c.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {c.courseCode && (
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-200 mb-1">
                          {c.courseCode}
                        </span>
                      )}
                      <h4 className="font-bold text-slate-900 text-sm">{c.courseName}</h4>
                    </div>
                    <div>
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Đang mở
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          Tạm ngưng
                        </span>
                      )}
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">
                      Thời lượng: <strong className="text-slate-800">{c.totalSessions || 0} buổi</strong>
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatCurrency(c.defaultFee)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(c)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 overflow-hidden">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa khóa học</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hành động này sẽ vô hiệu hóa khóa học trong hệ thống.</p>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-700 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa khóa học{' '}
              <strong className="text-slate-900 font-semibold">{deletingCourse.courseName}</strong> (Mã:{' '}
              {deletingCourse.courseCode || '—'})?
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <span className="shrink-0 text-sm">❌</span>
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>{isEdit ? '✏️' : '✨'}</span>
                <span>{isEdit ? 'Chỉnh sửa Khóa học' : 'Thêm Khóa học mới'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? `Cập nhật thông tin cho khóa "${course?.courseName}"`
                  : 'Thiết lập chương trình đào tạo mới tại trung tâm'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 max-h-[calc(85vh-130px)] overflow-y-auto">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <span className="shrink-0 text-sm">⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Tên khóa học */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên khóa học <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                placeholder="VD: Luyện chữ đẹp, Tiền tiểu học..."
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full h-10 px-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 float-right mt-1">{courseName.length}/150</span>
            </div>

            {/* Mã khóa học & Số buổi học */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã khóa học <span className="text-slate-400 font-normal">(tùy chọn)</span>
                </label>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="VD: LCD-01, TTH-24..."
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 text-xs md:text-sm font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số buổi học <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={365}
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(e.target.value)}
                  className="w-full h-10 px-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Học phí tiêu chuẩn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Học phí tiêu chuẩn (VNĐ) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                step={50000}
                value={defaultFee}
                onChange={(e) => setDefaultFee(e.target.value)}
                className="w-full h-10 px-3 text-xs md:text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {/* Phiên âm số tiền thành chữ tiếng Việt */}
              {numFee > 0 && (
                <p className="mt-1.5 text-xs text-blue-700 bg-blue-50/70 border border-blue-100 rounded-md p-2 italic leading-relaxed">
                  Bằng chữ: <strong>{numberToVietnameseWords(numFee)}</strong>
                </p>
              )}
            </div>

            {/* Mô tả khóa học */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả chương trình <span className="text-slate-400 font-normal">(tùy chọn)</span>
              </label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Mô tả mục tiêu đầu ra, đối tượng học viên hoặc đặc điểm nổi bật..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              />
              <span className="text-[10px] text-slate-400 float-right mt-1">{description.length}/500</span>
            </div>

            {/* Trạng thái Kích hoạt */}
            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Kích hoạt khóa học (cho phép mở lớp và đăng ký)
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
