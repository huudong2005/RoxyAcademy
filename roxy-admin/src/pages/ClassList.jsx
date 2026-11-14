import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime } from '../utils/formatters';

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

  // State Drawer Chi tiết Lớp học & Tiến độ bài học (Lesson Progress)
  const [selectedDetailClass, setSelectedDetailClass] = useState(null);
  const [detailTab, setDetailTab] = useState('progress'); // 'progress' hoặc 'info'
  const [lessonProgresses, setLessonProgresses] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [classSchedules, setClassSchedules] = useState([]);

  // State Modal Thêm / Sửa Tiến độ bài học
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState(null);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [progressFormError, setProgressFormError] = useState('');
  const [progressFormData, setProgressFormData] = useState({
    scheduleId: '',
    lessonDate: '',
    title: '',
    content: '',
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

  // ==========================================
  // LOGIC TIẾN ĐỘ BÀI HỌC (LESSON PROGRESS) & DRAWER CHI TIẾT
  // ==========================================
  const canManageProgress = useCallback((cls) => {
    if (!cls) return false;
    if (isSuperAdmin) return true;
    if (currentUser.role === 'BranchManager') return cls.branchId === currentUser.branchId;
    if (currentUser.role === 'Teacher') return cls.teacherId === currentUser.id;
    return false;
  }, [isSuperAdmin, currentUser.role, currentUser.branchId, currentUser.id]);

  const loadLessonProgresses = useCallback(async (classId) => {
    setLoadingProgress(true);
    setProgressError('');
    try {
      const res = await axiosClient.get(`/LessonProgresses?classId=${classId}`);
      setLessonProgresses(res.data || []);
    } catch (err) {
      setProgressError(err.response?.data?.message || 'Không thể tải tiến độ bài học của lớp.');
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  const loadClassSchedules = useCallback(async (classId) => {
    try {
      const res = await axiosClient.get(`/Schedules?classId=${classId}`);
      setClassSchedules(res.data || []);
    } catch (err) {
      console.warn('Lỗi tải danh sách buổi học:', err);
      setClassSchedules([]);
    }
  }, []);

  const handleOpenDetail = (cls) => {
    setSelectedDetailClass(cls);
    setDetailTab('progress');
    loadLessonProgresses(cls.id);
    loadClassSchedules(cls.id);
  };

  const handleOpenCreateProgress = () => {
    setEditingProgress(null);
    setProgressFormError('');
    const today = new Date().toISOString().split('T')[0];
    setProgressFormData({
      scheduleId: '',
      lessonDate: today,
      title: '',
      content: '',
    });
    setIsProgressModalOpen(true);
  };

  const handleOpenEditProgress = (lp) => {
    setEditingProgress(lp);
    setProgressFormError('');
    setProgressFormData({
      scheduleId: lp.scheduleId ? String(lp.scheduleId) : '',
      lessonDate: lp.lessonDate || '',
      title: lp.title || '',
      content: lp.content || '',
    });
    setIsProgressModalOpen(true);
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDetailClass) return;
    if (!progressFormData.lessonDate) {
      setProgressFormError('Vui lòng chọn ngày diễn ra buổi học.');
      return;
    }
    if (!progressFormData.content.trim()) {
      setProgressFormError('Nội dung bài giảng và tình hình học tập là bắt buộc.');
      return;
    }

    setProgressSubmitting(true);
    setProgressFormError('');

    try {
      const payload = {
        scheduleId: progressFormData.scheduleId ? Number(progressFormData.scheduleId) : null,
        lessonDate: progressFormData.lessonDate,
        title: progressFormData.title.trim() || null,
        content: progressFormData.content.trim(),
      };

      if (editingProgress) {
        await axiosClient.put(`/LessonProgresses/${editingProgress.id}`, payload);
      } else {
        await axiosClient.post('/LessonProgresses', {
          ...payload,
          classId: selectedDetailClass.id,
        });
      }

      setIsProgressModalOpen(false);
      loadLessonProgresses(selectedDetailClass.id);
    } catch (err) {
      const data = err.response?.data;
      const detail =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
        'Có lỗi xảy ra khi lưu tiến độ bài học.';
      setProgressFormError(detail);
    } finally {
      setProgressSubmitting(false);
    }
  };

  const handleDeleteProgress = async (lp) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ghi nhận tiến độ ngày ${formatDate(lp.lessonDate)}?`
    );
    if (!confirmed) return;

    try {
      await axiosClient.delete(`/LessonProgresses/${lp.id}`);
      if (selectedDetailClass) {
        loadLessonProgresses(selectedDetailClass.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa tiến độ bài học.');
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
                <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
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
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
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
                      <div
                        onClick={() => handleOpenDetail(cls)}
                        className="font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết & tiến độ bài học"
                      >
                        {cls.className}
                      </div>
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

                    {/* Cột 9: Thao tác */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(cls)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all cursor-pointer"
                          title="Xem tiến độ bài học & chi tiết lớp"
                        >
                          <span>👁 Chi tiết</span>
                        </button>

                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(cls)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                              title="Sửa thông tin lớp"
                            >
                              <span>Sửa</span>
                            </button>
                            {cls.status !== 'Finished' && (
                              <button
                                type="button"
                                onClick={() => handleCloseClass(cls)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                                title="Đóng lớp học (Xóa mềm)"
                              >
                                <span>Đóng lớp</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
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

      {/* 6. DRAWER CHI TIẾT LỚP HỌC & TIẾN ĐỘ BÀI HỌC (LESSON PROGRESS) */}
      {selectedDetailClass && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setSelectedDetailClass(null)}
            aria-hidden="true"
          />

          {/* Drawer Panel trượt từ cạnh phải */}
          <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col z-10 h-full overflow-hidden">
            {/* Header Drawer */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    #CLS-{selectedDetailClass.id}
                  </span>
                  <h2 className="text-base md:text-lg font-bold text-slate-900">
                    {selectedDetailClass.className}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-blue-700">{selectedDetailClass.courseName || 'Khóa học'}</span>
                  <span>•</span>
                  <span>{selectedDetailClass.branchName || `Cơ sở #${selectedDetailClass.branchId}`}</span>
                  <span>•</span>
                  <span>👩‍🏫 {selectedDetailClass.teacherName || 'Chưa phân công'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailClass(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                type="button"
                onClick={() => setDetailTab('progress')}
                className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'progress'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📖 Tiến độ bài học</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 font-bold border border-blue-200">
                  {lessonProgresses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  detailTab === 'info'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>ℹ️ Thông tin chung</span>
              </button>
            </div>

            {/* Thân Drawer cuộn độc lập */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {detailTab === 'progress' ? (
                /* ========================================================
                   TAB 1: TIẾN ĐỘ BÀI HỌC (LESSON PROGRESS TIMELINE)
                   ======================================================== */
                <div className="space-y-6">
                  {/* Thanh tác vụ đầu tab */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-slate-900">
                        Nhật ký tiến độ bài dạy theo buổi
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Nội dung giảng dạy thực tế, mức độ tiếp thu và dặn dò sau từng buổi học
                      </p>
                    </div>

                    {canManageProgress(selectedDetailClass) && (
                      <button
                        type="button"
                        onClick={handleOpenCreateProgress}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <span>+ Ghi nhận tiến độ mới</span>
                      </button>
                    )}
                  </div>

                  {progressError && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                      ⚠️ {progressError}
                    </div>
                  )}

                  {loadingProgress ? (
                    <div className="py-12 text-center text-slate-400">
                      <svg className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span className="text-xs">Đang tải nhật ký tiến độ...</span>
                    </div>
                  ) : lessonProgresses.length === 0 ? (
                    /* Emil Kowalski Tasteful Clean Empty State */
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-2xl text-blue-600 shadow-xs">
                        📖
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Chưa có ghi nhận tiến độ bài học nào
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Giáo viên phụ trách lớp sẽ cập nhật nội dung giảng dạy thực tế, mức độ tiếp thu của các bé và dặn dò phụ huynh sau mỗi buổi học tại trung tâm.
                      </p>
                      {canManageProgress(selectedDetailClass) && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleOpenCreateProgress}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                          >
                            <span>+ Ghi nhận tiến độ buổi đầu tiên</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Timeline Trục Dọc Dòng Thời Gian */
                    <div className="border-l-2 border-slate-200 ml-3 md:ml-4 pl-4 md:pl-6 space-y-6 relative">
                      {lessonProgresses.map((lp) => (
                        <div key={lp.id} className="relative group">
                          {/* Dot chỉ thị nốt mốc */}
                          <div className="absolute -left-[23px] md:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100 shadow-xs" />

                          {/* Thẻ nội dung buổi học */}
                          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs md:text-sm">
                                    {formatDate(lp.lessonDate)}
                                  </span>
                                  {lp.scheduleId && (
                                    <span className="rounded bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 border border-blue-200">
                                      Buổi học #{lp.scheduleId}
                                    </span>
                                  )}
                                </div>
                                {lp.title && (
                                  <h4 className="text-xs font-bold text-blue-900 mt-1">
                                    {lp.title}
                                  </h4>
                                )}
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Ghi nhận bởi: <strong>{lp.createdByName || 'Giáo viên'}</strong>
                                  {lp.updatedAt && ` • Đã sửa ${formatDateTime(lp.updatedAt)}`}
                                </div>
                              </div>

                              {/* Nút sửa / xóa tiến độ */}
                              {canManageProgress(selectedDetailClass) && (
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditProgress(lp)}
                                    className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 text-xs"
                                    title="Sửa nội dung"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProgress(lp)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs"
                                    title="Xóa ghi nhận này"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Nội dung chi tiết */}
                            <div className="text-xs md:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                              {lp.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================
                   TAB 2: THÔNG TIN CHUNG CỦA LỚP HỌC
                   ======================================================== */
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                      Thông tin cơ bản lớp học
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
                      <div>
                        <span className="text-slate-500 block text-xs">Tên lớp học:</span>
                        <span className="font-bold text-slate-900">{selectedDetailClass.className}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Khóa học đào tạo:</span>
                        <span className="font-semibold text-slate-800">{selectedDetailClass.courseName || '—'}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Giáo viên phụ trách:</span>
                        <span className="font-semibold text-slate-800">👩‍🏫 {selectedDetailClass.teacherName || 'Chưa phân công'}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Cơ sở tổ chức:</span>
                        <span className="font-semibold text-slate-800">{selectedDetailClass.branchName || `Cơ sở #${selectedDetailClass.branchId}`}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Hình thức lớp:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedDetailClass.classType === 'OneToOne' ? 'Kèm 1-1 (OneToOne)' : 'Lớp nhóm (Group)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Sĩ số tối đa:</span>
                        <span className="font-semibold text-slate-800">{selectedDetailClass.maxStudents ?? '—'} học viên</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Ngày khai giảng:</span>
                        <span className="font-semibold text-slate-800">{formatDate(selectedDetailClass.startDate)}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Ngày bế giảng dự kiến:</span>
                        <span className="font-semibold text-slate-800">{formatDate(selectedDetailClass.endDate)}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Học phí lớp:</span>
                        <span className="font-bold text-blue-700">{formatFee(selectedDetailClass.tuitionFee)}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-xs">Trạng thái hiện tại:</span>
                        <span className="mt-0.5 inline-block">{renderStatusBadge(selectedDetailClass.status)}</span>
                      </div>
                    </div>

                    {selectedDetailClass.note && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-slate-500 block text-xs mb-1">Ghi chú phòng học / thiết bị:</span>
                        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                          {selectedDetailClass.note}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL THÊM / SỬA TIẾN ĐỘ BÀI HỌC (CREATE / EDIT LESSON PROGRESS) */}
      {isProgressModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
            onClick={() => !progressSubmitting && setIsProgressModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingProgress ? '✏️ Cập nhật tiến độ bài học' : '📖 Ghi nhận tiến độ bài học mới'}
                </h3>
                <p className="text-xs text-blue-700 font-semibold mt-0.5">
                  Lớp: {selectedDetailClass?.className}
                </p>
              </div>
              <button
                type="button"
                disabled={progressSubmitting}
                onClick={() => setIsProgressModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {progressFormError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {progressFormError}
              </div>
            )}

            <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Ngày diễn ra buổi học */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày diễn ra buổi học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={progressFormData.lessonDate}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, lessonDate: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {/* Buổi học trong lịch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buổi học trong lịch <span className="text-slate-400 font-normal">(Khuyên dùng)</span>
                </label>
                <select
                  value={progressFormData.scheduleId}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, scheduleId: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  <option value="">-- Chọn buổi học tương ứng (Nếu có) --</option>
                  {classSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      Buổi ngày {formatDate(s.studyDate)} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  ℹ️ Chọn buổi học tương ứng để hệ thống đồng bộ với lịch học và bảng điểm danh.
                </p>
              </div>

              {/* Tiêu đề tóm tắt */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề tóm tắt buổi dạy <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="VD: Luyện viết nhóm nét khuyết trên & dưới; Ôn tập bảng cộng trừ..."
                  value={progressFormData.title}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {/* Nội dung bài dạy & Tình hình học tập */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung bài dạy &amp; Tình hình học tập <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="- Nội dung đã dạy: ...&#10;- Đánh giá tiếp thu của học sinh trong lớp: ...&#10;- Bài tập / Nhiệm vụ dặn dò về nhà: ..."
                  value={progressFormData.content}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hỗ trợ xuống dòng và các gạch đầu dòng để nội dung dễ đọc cho ban quản lý và phụ huynh.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={progressSubmitting}
                  onClick={() => setIsProgressModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={progressSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {progressSubmitting ? (
                    'Đang lưu...'
                  ) : editingProgress ? (
                    'Lưu thay đổi'
                  ) : (
                    '✓ Lưu tiến độ'
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
