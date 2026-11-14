import { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';

export default function ClassList() {
  // Lấy quyền từ user đang đăng nhập
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isSuperAdmin = currentUser.role === 'SuperAdmin';

  // State danh sách lớp và trạng thái tải
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Danh mục bổ trợ
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Phân trang Client-side (vì GET /api/Classes trả về Array)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // State Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null); // null = Thêm mới, object = Sửa
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    className: '',
    courseId: '',
    teacherId: '',
    branchId: '',
    classType: 'Group', // 'Group' hoặc 'OneToOne' theo DB constraint
    maxStudents: 15,
    startDate: '',
    endDate: '',
    tuitionFee: '',
    note: '',
    status: 'Upcoming',
    isOpenForRegistration: true,
  });

  // Tải danh mục bổ trợ (Courses, Branches, Teachers)
  useEffect(() => {
    let ignore = false;

    const fetchMetadata = async () => {
      try {
        const [courseRes, branchRes] = await Promise.allSettled([
          axiosClient.get('/Courses'),
          axiosClient.get('/Branches'),
        ]);

        if (!ignore) {
          if (courseRes.status === 'fulfilled') setCourses(courseRes.value.data || []);
          if (branchRes.status === 'fulfilled') setBranches(branchRes.value.data || []);
        }

        // Lấy danh sách Giáo viên
        try {
          const teacherRes = await axiosClient.get('/Users?role=Teacher&pageSize=100');
          if (!ignore) {
            setTeachers(teacherRes.data.items || teacherRes.data || []);
          }
        } catch (tErr) {
          console.warn('Không tải được danh sách giáo viên:', tErr);
        }
      } catch (err) {
        console.error('Lỗi tải danh mục bổ trợ:', err);
      }
    };

    fetchMetadata();

    return () => {
      ignore = true;
    };
  }, []);

  // Tải danh sách lớp học
  useEffect(() => {
    let ignore = false;

    const loadClasses = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axiosClient.get('/Classes');
        if (!ignore) {
          setClasses(response.data || []);
        }
      } catch (err) {
        if (!ignore) {
          if (err.response?.status === 403) {
            setError('Bạn không có quyền xem danh sách lớp học.');
          } else {
            setError('Không thể tải dữ liệu lớp học.');
          }
          console.error(err);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadClasses();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Lọc dữ liệu lớp học phía Client
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const nameMatch = cls.className?.toLowerCase().includes(query);
        const courseMatch = cls.courseName?.toLowerCase().includes(query);
        const teacherMatch = cls.teacherName?.toLowerCase().includes(query);
        if (!nameMatch && !courseMatch && !teacherMatch) return false;
      }
      if (branchFilter && cls.branchId !== Number(branchFilter)) return false;
      if (courseFilter && cls.courseId !== Number(courseFilter)) return false;
      if (statusFilter && cls.status !== statusFilter) return false;
      return true;
    });
  }, [classes, search, branchFilter, courseFilter, statusFilter]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  // Mở modal Thêm mới
  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setSubmitError('');
    setFormData({
      className: '',
      courseId: courses.length > 0 ? courses[0].id : '',
      teacherId: '',
      branchId: branches.length > 0 ? branches[0].id : '',
      classType: 'Group',
      maxStudents: 15,
      startDate: '',
      endDate: '',
      tuitionFee: '',
      note: '',
      status: 'Upcoming',
      isOpenForRegistration: true,
    });
    setIsModalOpen(true);
  };

  // Mở modal Sửa
  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    setSubmitError('');
    setFormData({
      className: cls.className || '',
      courseId: cls.courseId || '',
      teacherId: cls.teacherId || '',
      branchId: cls.branchId || '',
      classType: cls.classType || 'Group',
      maxStudents: cls.maxStudents || 15,
      startDate: cls.startDate ? cls.startDate.split('T')[0] : '',
      endDate: cls.endDate ? cls.endDate.split('T')[0] : '',
      tuitionFee: cls.tuitionFee != null ? cls.tuitionFee : '',
      note: cls.note || '',
      status: cls.status || 'Upcoming',
      isOpenForRegistration: cls.isOpenForRegistration ?? true,
    });
    setIsModalOpen(true);
  };

  // Xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? value === ''
            ? ''
            : Number(value)
          : value,
    }));
  };

  // Submit Form Tạo / Sửa
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!formData.className.trim()) {
      setSubmitError('Tên lớp học là bắt buộc.');
      return;
    }
    if (!formData.courseId) {
      setSubmitError('Vui lòng chọn khóa học.');
      return;
    }
    if (!formData.teacherId) {
      setSubmitError('Vui lòng chọn giáo viên phụ trách.');
      return;
    }
    if (!formData.branchId) {
      setSubmitError('Vui lòng chọn cơ sở.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        className: formData.className.trim(),
        courseId: Number(formData.courseId),
        teacherId: Number(formData.teacherId),
        branchId: Number(formData.branchId),
        classType: formData.classType,
        maxStudents: formData.maxStudents ? Number(formData.maxStudents) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        tuitionFee: formData.tuitionFee !== '' ? Number(formData.tuitionFee) : null,
        note: formData.note.trim() || null,
      };

      if (editingClass) {
        // Cập nhật lớp (PUT /api/Classes/{id})
        await axiosClient.put(`/Classes/${editingClass.id}`, {
          ...payload,
          status: formData.status,
          isOpenForRegistration: formData.isOpenForRegistration,
        });
      } else {
        // Tạo lớp mới (POST /api/Classes)
        await axiosClient.post('/Classes', payload);
      }

      setIsModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      const detail =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
        'Có lỗi xảy ra khi lưu lớp học.';
      setSubmitError(detail);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Đóng lớp học / Xóa mềm (DELETE /api/Classes/{id})
  const handleCloseClass = async (cls) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn đóng lớp "${cls.className}"? Lớp học sẽ được chuyển trạng thái "Đã kết thúc" (Finished) và đóng cổng đăng ký.`
    );
    if (!confirmed) return;

    try {
      await axiosClient.delete(`/Classes/${cls.id}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể đóng lớp học.');
      console.error(err);
    }
  };

  // Helper format ngày
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const clean = dateStr.split('T')[0];
      const [y, m, d] = clean.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper format học phí
  const formatFee = (fee) => {
    if (fee == null || fee === '') return 'Theo khóa học';
    return `${Number(fee).toLocaleString('vi-VN')} đ`;
  };

  // Helper badge trạng thái lớp
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Sắp mở
          </span>
        );
      case 'Ongoing':
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đang học
          </span>
        );
      case 'Finished':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Đã kết thúc
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Trang & Phân Quyền Nút Thao Tác */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Quản lý Lớp học
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              Tổng số: {classes.length} lớp
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý kế hoạch mở lớp, phân công giáo viên và theo dõi quy mô sĩ số
          </p>
        </div>

        {/* Nút Tạo Lớp Mới: Chỉ hiển thị cho SuperAdmin theo phân quyền backend */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer self-start sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Tạo lớp học mới</span>
          </button>
        )}
      </div>

      {/* 2. Thanh Công Cụ Tìm Kiếm & Lọc */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên lớp, khóa, giáo viên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs md:text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* Lọc theo Cơ sở */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tất cả cơ sở</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Khóa học */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tất cả khóa học</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Trạng thái & Nút reset */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Upcoming">Sắp mở</option>
              <option value="Ongoing">Đang học</option>
              <option value="Finished">Đã kết thúc</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setBranchFilter('');
                setCourseFilter('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              title="Đặt lại bộ lọc"
              className="h-10 px-3 border border-slate-300 rounded-lg bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs md:text-sm text-rose-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. Bảng Danh Sách Lớp Học */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase font-semibold tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Tên lớp</th>
                <th scope="col" className="px-4 py-3.5">Khóa học</th>
                <th scope="col" className="px-4 py-3.5">Giáo viên</th>
                <th scope="col" className="px-4 py-3.5">Cơ sở</th>
                <th scope="col" className="px-4 py-3.5">Sĩ số</th>
                <th scope="col" className="px-4 py-3.5">Hình thức &amp; Lịch</th>
                <th scope="col" className="px-4 py-3.5">Học phí</th>
                <th scope="col" className="px-4 py-3.5">Trạng thái</th>
                {isSuperAdmin && <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách lớp học...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🏫</span>
                      <p className="text-sm font-medium text-slate-600">Không tìm thấy lớp học nào</p>
                      <p className="text-xs text-slate-400">Thử thay đổi bộ lọc tìm kiếm hoặc tạo lớp học mới</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors duration-100">
                    {/* Cột 1: Tên lớp */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-blue-700">{cls.className}</div>
                      <div className="text-[11px] text-slate-400">#CLS-{cls.id}</div>
                    </td>

                    {/* Cột 2: Khóa học */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{cls.courseName || '—'}</span>
                    </td>

                    {/* Cột 3: Giáo viên phụ trách */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <span>👩‍🏫</span>
                        <span className="font-medium">{cls.teacherName || 'Chưa phân công'}</span>
                      </div>
                    </td>

                    {/* Cột 4: Cơ sở */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 font-medium">
                        {cls.branchName || `Cơ sở #${cls.branchId}`}
                      </span>
                    </td>

                    {/* Cột 5: Sĩ số tối đa */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      Tối đa <span className="font-semibold text-slate-900">{cls.maxStudents ?? '—'}</span> học viên
                    </td>

                    {/* Cột 6: Hình thức & Lịch */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {cls.classType === 'OneToOne' ? 'Kèm 1-1' : 'Lớp nhóm'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDate(cls.startDate)} → {formatDate(cls.endDate)}
                      </div>
                    </td>

                    {/* Cột 7: Học phí */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                      {formatFee(cls.tuitionFee)}
                    </td>

                    {/* Cột 8: Trạng thái */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatusBadge(cls.status)}
                    </td>

                    {/* Cột 9: Thao tác (Chỉ SuperAdmin) */}
                    {isSuperAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cls)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all"
                            title="Sửa thông tin lớp"
                          >
                            <span>Sửa</span>
                          </button>
                          {cls.status !== 'Finished' && (
                            <button
                              type="button"
                              onClick={() => handleCloseClass(cls)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all"
                              title="Đóng lớp học (Xóa mềm)"
                            >
                              <span>Đóng lớp</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Thanh Phân Trang */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 gap-3 text-xs text-slate-600">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-800">
              {filteredClasses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredClasses.length)}
            </span>{' '}
            trên tổng số <span className="font-semibold text-slate-800">{filteredClasses.length}</span> lớp học
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Trước
            </button>
            <span className="px-3 py-1.5 font-medium text-slate-800">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal Tạo / Sửa Lớp Học Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !submitting && setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="text-base md:text-lg font-bold text-slate-900">
                {editingClass ? 'Cập nhật thông tin lớp học' : 'Tạo lớp học mới'}
              </h3>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Tên lớp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="className"
                  placeholder="VD: Lớp Tiền tiểu học - Họa Mi 1, Lớp Luyện chữ đẹp Tối 2-4"
                  value={formData.className}
                  onChange={handleChange}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Khóa học */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Khóa học đào tạo <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="courseId"
                    required
                    value={formData.courseId}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    <option value="">-- Chọn khóa học --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Giáo viên phụ trách (BẮT BUỘC) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giáo viên phụ trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="teacherId"
                    required
                    value={formData.teacherId}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    <option value="">-- Chọn giáo viên phụ trách --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        👩‍🏫 {t.fullName} ({t.phoneNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cơ sở */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cơ sở tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="branchId"
                    required
                    value={formData.branchId}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hình thức lớp học (Group / OneToOne) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hình thức lớp học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="classType"
                    required
                    value={formData.classType}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    <option value="Group">Lớp nhóm (Group)</option>
                    <option value="OneToOne">Kèm 1-1 (OneToOne)</option>
                  </select>
                </div>

                {/* Sĩ số tối đa */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sĩ số tối đa (MaxStudents) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxStudents"
                    min="1"
                    max="100"
                    required
                    value={formData.maxStudents}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Học phí */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Học phí (VND)
                  </label>
                  <input
                    type="number"
                    name="tuitionFee"
                    min="0"
                    step="10000"
                    placeholder="Để trống nếu theo học phí khóa học"
                    value={formData.tuitionFee}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Ngày khai giảng */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày khai giảng
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>

                {/* Ngày kết thúc */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Các trường mở rộng khi Chỉnh sửa lớp */}
              {editingClass && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Trạng thái lớp học
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    >
                      <option value="Upcoming">Sắp mở (Upcoming)</option>
                      <option value="Ongoing">Đang học (Ongoing)</option>
                      <option value="Finished">Đã kết thúc (Finished)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isOpenForRegistration"
                        checked={formData.isOpenForRegistration}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Mở tiếp nhận đăng ký học viên mới
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú lớp học (Phòng học, trang thiết bị...)
                </label>
                <textarea
                  rows={2}
                  name="note"
                  placeholder="VD: Phòng học Họa Mi tầng 1, kèm giáo cụ luyện chữ chuyên biệt..."
                  value={formData.note}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs md:text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    'Lưu lớp học'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
