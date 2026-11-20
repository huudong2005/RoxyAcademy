import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDateTime } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';
import {
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  Badge,
  Card,
  PageHeader,
} from '../components/ui';

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
  const [searchParams] = useSearchParams();
  const initialBranchId = searchParams.get('branchId');
  const initialStatus = searchParams.get('status');
  const validStatuses = ['Upcoming', 'Ongoing', 'Finished'];
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(
    initialBranchId && /^\d+$/.test(initialBranchId) ? initialBranchId : ''
  );
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    initialStatus && validStatuses.includes(initialStatus) ? initialStatus : ''
  );

  // Phân trang Client-side (vì GET /api/Classes trả về Array)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // State Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null); // null = Thêm mới, object = Sửa
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // State Modal Xác nhận & Báo lỗi Đóng Lớp Học (Soft Delete)
  const [closeClassModal, setCloseClassModal] = useState(null); // { cls, submitting, errorMessage, reasons }

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
  const [detailTab, setDetailTab] = useState('students'); // 'students' | 'progress' | 'info'
  const [lessonProgresses, setLessonProgresses] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [classSchedules, setClassSchedules] = useState([]);

  // State Ghi danh học viên trong lớp (StudentClasses)
  const [classEnrollments, setClassEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [branchStudents, setBranchStudents] = useState([]);
  const [loadingBranchStudents, setLoadingBranchStudents] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollNote, setEnrollNote] = useState('');
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollSubmitError, setEnrollSubmitError] = useState('');
  const [statusActionModal, setStatusActionModal] = useState(null); // { sc, targetStatus, note, submitting, error }

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
    const activeCourses = courses.filter((c) => c.isActive !== false);
    const activeBranches = branches.filter((b) => b.isActive !== false);
    setFormData({
      className: '',
      courseId: activeCourses.length > 0 ? activeCourses[0].id : '',
      teacherId: '',
      branchId: activeBranches.length > 0 ? activeBranches[0].id : '',
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

    const selectedTeacherObj = teachers.find((t) => String(t.id) === String(formData.teacherId));
    if (selectedTeacherObj && selectedTeacherObj.isActive === false) {
      setSubmitError('Không thể phân công giáo viên đã bị khóa tài khoản. Vui lòng chọn giáo viên đang hoạt động.');
      return;
    }

    if (editingClass) {
      const currentActiveCount = editingClass.activeStudentsCount ?? 0;
      if (formData.maxStudents && Number(formData.maxStudents) < currentActiveCount) {
        setSubmitError(
          `Không thể hạ sĩ số tối đa xuống dưới số học viên đang theo học hiện tại (${currentActiveCount} học viên).`
        );
        return;
      }
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
  const handleCloseClass = (cls) => {
    setCloseClassModal({
      cls,
      submitting: false,
      errorMessage: '',
      reasons: [],
    });
  };

  const handleConfirmCloseClass = async () => {
    if (!closeClassModal?.cls) return;
    setCloseClassModal((prev) => ({ ...prev, submitting: true, errorMessage: '', reasons: [] }));

    try {
      await axiosClient.delete(`/Classes/${closeClassModal.cls.id}`);
      setCloseClassModal(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || 'Không thể đóng lớp học do còn ràng buộc nghiệp vụ.';
      let reasonsList = Array.isArray(data?.reasons) ? data.reasons : [];
      if (reasonsList.length === 0 && typeof data?.message === 'string' && data.message.includes('vì:')) {
        const afterVi = data.message.split('vì:')[1]?.split('. Vui lòng')[0] || '';
        reasonsList = afterVi
          .split(';')
          .map((r) => r.trim())
          .filter(Boolean);
      }
      setCloseClassModal((prev) => ({
        ...prev,
        submitting: false,
        errorMessage: msg,
        reasons: reasonsList,
      }));
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
          <Badge variant="blue" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Sắp mở
          </Badge>
        );
      case 'Ongoing':
      case 'Active':
        return (
          <Badge variant="emerald" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đang học
          </Badge>
        );
      case 'Finished':
        return (
          <Badge variant="neutral" className="normal-case tracking-normal text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
            Đã kết thúc
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="normal-case tracking-normal text-xs">
            {status}
          </Badge>
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

  // Chỉ SuperAdmin hoặc BranchManager (đúng chi nhánh) được thêm/duyệt ghi danh; Teacher chỉ xem
  const canManageEnrollments = useCallback((cls) => {
    if (!cls) return false;
    if (isSuperAdmin) return true;
    if (currentUser.role === 'BranchManager') return cls.branchId === currentUser.branchId;
    return false;
  }, [isSuperAdmin, currentUser.role, currentUser.branchId]);

  const loadClassEnrollments = useCallback(async (classId) => {
    setLoadingEnrollments(true);
    setEnrollmentError('');
    try {
      const res = await axiosClient.get(`/StudentClasses?classId=${classId}`);
      setClassEnrollments(res.data || []);
    } catch (err) {
      setEnrollmentError(err.response?.data?.message || 'Không thể tải danh sách ghi danh của lớp.');
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  const loadBranchStudents = useCallback(async (branchId) => {
    if (!branchId) return;
    setLoadingBranchStudents(true);
    try {
      const res = await axiosClient.get(`/Students?branchId=${branchId}&status=Active&pageSize=100`);
      setBranchStudents(res.data?.items || res.data || []);
    } catch (err) {
      console.warn('Không tải được danh sách học viên cùng chi nhánh:', err);
      setBranchStudents([]);
    } finally {
      setLoadingBranchStudents(false);
    }
  }, []);

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
    setDetailTab('students');
    setShowEnrollForm(false);
    setEnrollStudentId('');
    setEnrollNote('');
    setEnrollSubmitError('');
    loadClassEnrollments(cls.id);
    if (canManageEnrollments(cls)) {
      loadBranchStudents(cls.branchId);
    } else {
      setBranchStudents([]);
    }
    loadLessonProgresses(cls.id);
    loadClassSchedules(cls.id);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDetailClass) return;
    setEnrollSubmitError('');
    if (!enrollStudentId) {
      setEnrollSubmitError('Vui lòng chọn học viên cần ghi danh.');
      return;
    }

    setEnrollSubmitting(true);
    try {
      await axiosClient.post('/StudentClasses', {
        studentId: Number(enrollStudentId),
        classId: selectedDetailClass.id,
        note: enrollNote.trim() || null,
      });
      setEnrollStudentId('');
      setEnrollNote('');
      setShowEnrollForm(false);
      await loadClassEnrollments(selectedDetailClass.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      setEnrollSubmitError(data?.message || 'Không thể ghi danh học viên vào lớp.');
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleEnrollmentStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusActionModal || !selectedDetailClass) return;
    setStatusActionModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      await axiosClient.put(`/StudentClasses/${statusActionModal.sc.id}/status`, {
        status: statusActionModal.targetStatus,
        note: statusActionModal.note.trim() || null,
      });
      setStatusActionModal(null);
      await loadClassEnrollments(selectedDetailClass.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      setStatusActionModal((prev) => ({
        ...prev,
        submitting: false,
        error: data?.message || 'Không thể cập nhật trạng thái ghi danh.',
      }));
    }
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

  const [confirmModal, setConfirmModal] = useState(null);

  const handleDeleteProgress = (lp) => {
    setConfirmModal({
      mode: 'confirm',
      title: 'Xác nhận xóa tiến độ',
      message: `Bạn có chắc chắn muốn xóa ghi nhận tiến độ ngày ${formatDate(lp.lessonDate)}?`,
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/LessonProgresses/${lp.id}`);
          if (selectedDetailClass) {
            loadLessonProgresses(selectedDetailClass.id);
          }
        } catch (err) {
          setConfirmModal({
            mode: 'alert',
            title: 'Lỗi',
            message: err.response?.data?.message || 'Không thể xóa tiến độ bài học.',
          });
        }
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Trang & Phân Quyền Nút Thao Tác */}
      <PageHeader
        eyebrow="Quản lý đào tạo"
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            <span>Quản lý Lớp học</span>
            <Badge variant="gold">Tổng số: {classes.length} lớp</Badge>
          </span>
        }
        description="Quản lý kế hoạch mở lớp, phân công giáo viên và theo dõi quy mô sĩ số"
        actions={
          isSuperAdmin && (
            <PrimaryButton onClick={handleOpenCreateModal}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tạo lớp học mới</span>
            </PrimaryButton>
          )
        }
      />

      {/* 2. Thanh Công Cụ Tìm Kiếm & Lọc */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <InputPill
              type="text"
              placeholder="Tìm theo tên lớp, khóa, giáo viên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Lọc theo Cơ sở */}
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto min-w-[165px] rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
          >
            <option value="">Tất cả cơ sở</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branchName}
              </option>
            ))}
          </select>

          {/* Lọc theo Khóa học */}
          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto min-w-[165px] rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
          >
            <option value="">Tất cả khóa học</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseName}
              </option>
            ))}
          </select>

          {/* Lọc theo Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto min-w-[175px] rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Upcoming">Sắp mở</option>
            <option value="Ongoing">Đang học</option>
            <option value="Finished">Đã kết thúc</option>
          </select>

          <SecondaryButton
            type="button"
            onClick={() => {
              setSearch('');
              setBranchFilter('');
              setCourseFilter('');
              setStatusFilter('');
              setCurrentPage(1);
            }}
            title="Đặt lại bộ lọc"
            className="px-4 py-2 text-xs shrink-0"
          >
            Đặt lại
          </SecondaryButton>
        </div>
      </Card>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs md:text-sm text-rose-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. Bảng Danh Sách Lớp Học */}
      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-line text-left text-xs md:text-sm">
            <thead className="bg-surface-subtle border-b border-line text-[11px] uppercase font-semibold tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-2 py-2.5">Tên lớp</th>
                <th scope="col" className="px-2 py-2.5">Khóa học</th>
                <th scope="col" className="px-2 py-2.5">Giáo viên</th>
                <th scope="col" className="px-2 py-2.5">Cơ sở</th>
                <th scope="col" className="px-2 py-2.5">Sĩ số</th>
                <th scope="col" className="px-2 py-2.5">Hình thức &amp; Lịch</th>
                <th scope="col" className="px-2 py-2.5">Học phí</th>
                <th scope="col" className="px-2 py-2.5">Trạng thái</th>
                <th scope="col" className="px-2 py-2.5 text-center whitespace-nowrap sticky right-0 z-20 bg-surface-subtle shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-ink-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách lớp học...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-ink-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🏫</span>
                      <p className="text-sm font-medium text-ink-secondary">Không tìm thấy lớp học nào</p>
                      <p className="text-xs text-ink-muted">Thử thay đổi bộ lọc tìm kiếm hoặc tạo lớp học mới</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-mint-canvas/60 transition-colors duration-100">
                    {/* Cột 1: Tên lớp */}
                    <td className="px-2 py-2.5 max-w-[160px]">
                      <div
                        onClick={() => handleOpenDetail(cls)}
                        className="font-bold text-teal hover:text-gold-active hover:underline cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết & tiến độ bài học"
                      >
                        {cls.className}
                      </div>
                      <div className="text-[11px] text-ink-muted">#CLS-{cls.id}</div>
                    </td>

                    {/* Cột 2: Khóa học */}
                    <td className="px-2 py-2.5 max-w-[130px]">
                      <span className="font-medium text-ink">{cls.courseName || '—'}</span>
                    </td>

                    {/* Cột 3: Giáo viên phụ trách */}
                    <td className="px-2 py-2.5 max-w-[130px]">
                      <div className="flex items-center gap-1.5 text-ink">
                        <span className="shrink-0">👩‍🏫</span>
                        <span className="font-medium">{cls.teacherName || 'Chưa phân công'}</span>
                      </div>
                    </td>

                    {/* Cột 4: Cơ sở */}
                    <td className="px-2 py-2.5 min-w-[80px] max-w-[105px]">
                      <span className="inline-flex items-center rounded-full bg-surface-subtle border border-line px-2 py-0.5 text-xs text-ink-secondary font-medium">
                        {cls.branchName || `Cơ sở #${cls.branchId}`}
                      </span>
                    </td>

                    {/* Cột 5: Sĩ số hiện tại / tối đa */}
                    <td className="px-2 py-2.5 text-ink-secondary">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-mono font-semibold ${cls.maxStudents && (cls.activeStudentsCount ?? 0) >= cls.maxStudents
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-surface-subtle text-ink-secondary border-line'
                            }`}
                        >
                          {cls.activeStudentsCount ?? 0} / {cls.maxStudents ?? '—'} học viên
                        </span>
                        {cls.maxStudents && (cls.activeStudentsCount ?? 0) >= cls.maxStudents && (
                          <Badge variant="amber" className="normal-case tracking-normal text-[10px] px-2 py-0.5 whitespace-nowrap">
                            (Đầy)
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Cột 6: Hình thức & Lịch */}
                    <td className="px-2 py-2.5 max-w-[140px]">
                      <div className="font-medium text-ink">
                        {cls.classType === 'OneToOne' ? 'Kèm 1-1' : 'Lớp nhóm'}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {formatDate(cls.startDate)} → {formatDate(cls.endDate)}
                      </div>
                    </td>

                    {/* Cột 7: Học phí */}
                    <td className="px-2 py-2.5 whitespace-nowrap font-medium text-ink">
                      {formatFee(cls.tuitionFee)}
                    </td>

                    {/* Cột 8: Trạng thái */}
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      {renderStatusBadge(cls.status)}
                    </td>

                    {/* Cột 9: Thao tác */}
                    <td className="px-2 py-2.5 whitespace-nowrap text-center sticky right-0 z-10 bg-surface shadow-[-4px_0_8px_-4px_rgba(30,46,43,0.08)]">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <IconButton
                          variant="neutral"
                          onClick={() => handleOpenDetail(cls)}
                          title="Xem tiến độ bài học & chi tiết lớp"
                          aria-label="Xem tiến độ bài học & chi tiết lớp"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </IconButton>

                        {isSuperAdmin && (
                          <>
                            <IconButton
                              variant="neutral"
                              onClick={() => handleOpenEditModal(cls)}
                              title="Sửa thông tin lớp"
                              aria-label="Sửa thông tin lớp"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                              </svg>
                            </IconButton>
                            {cls.status !== 'Finished' && (
                              <IconButton
                                variant="danger"
                                onClick={() => handleCloseClass(cls)}
                                title="Đóng lớp học (Xóa mềm)"
                                aria-label="Đóng lớp học (Xóa mềm)"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                              </IconButton>
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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-line bg-surface-subtle px-4 py-3 gap-3 text-xs text-ink-secondary">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-ink">
              {filteredClasses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-ink">
              {Math.min(currentPage * pageSize, filteredClasses.length)}
            </span>{' '}
            trên tổng số <span className="font-semibold text-ink">{filteredClasses.length}</span> lớp học
          </div>

          <div className="flex items-center gap-1.5">
            <SecondaryButton
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 text-xs"
            >
              Trước
            </SecondaryButton>
            <span className="px-3 py-1.5 font-medium text-ink">
              Trang {currentPage} / {totalPages}
            </span>
            <SecondaryButton
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3.5 py-1.5 text-xs"
            >
              Sau
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {/* 5. Modal Tạo / Sửa Lớp Học Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !submitting && setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal modal-panel z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3.5 mb-4">
              <h3 className="text-base md:text-lg font-bold text-ink">
                {editingClass ? 'Cập nhật thông tin lớp học' : 'Tạo lớp học mới'}
              </h3>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Tên lớp */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="className"
                  placeholder="VD: Lớp Tiền tiểu học - Họa Mi 1, Lớp Luyện chữ đẹp Tối 2-4"
                  value={formData.className}
                  onChange={handleChange}
                  className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Khóa học */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Khóa học đào tạo <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="courseId"
                    required
                    value={formData.courseId}
                    onChange={handleChange}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  >
                    <option value="">-- Chọn khóa học --</option>
                    {courses
                      .filter((c) => !editingClass ? c.isActive !== false : c.isActive !== false || String(c.id) === String(editingClass.courseId))
                      .map((c) => (
                        <option key={c.id} value={c.id} disabled={c.isActive === false}>
                          {c.courseName} {c.isActive === false ? '(Đã ngừng hoạt động)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Giáo viên phụ trách (BẮT BUỘC) */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Giáo viên phụ trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="teacherId"
                    required
                    value={formData.teacherId}
                    onChange={handleChange}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  >
                    <option value="">-- Chọn giáo viên phụ trách --</option>
                    {teachers
                      .filter((t) => !editingClass ? t.isActive !== false : t.isActive !== false || String(t.id) === String(editingClass.teacherId))
                      .map((t) => (
                        <option key={t.id} value={t.id} disabled={t.isActive === false}>
                          👩‍🏫 {t.fullName} ({t.phoneNumber}) {t.isActive === false ? '(Đã khóa tài khoản)' : ''}
                        </option>
                      ))}
                  </select>
                  {editingClass &&
                    teachers.find((t) => String(t.id) === String(formData.teacherId))?.isActive === false && (
                      <p className="mt-1 text-[11px] text-rose-600 font-medium">
                        ⚠️ Giáo viên hiện tại đã bị khóa tài khoản. Vui lòng chọn sang giáo viên đang hoạt động.
                      </p>
                    )}
                  {editingClass != null &&
                    String(formData.teacherId) !== '' &&
                    String(formData.teacherId) !== String(editingClass.teacherId || '') && (
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                        <span className="font-semibold">⚠️ Lưu ý đổi giáo viên:</span> Giáo viên mới sẽ xem được toàn bộ lịch sử lớp (kể cả bài đã chấm trước đó) để dạy tiếp; giáo viên cũ mất quyền truy cập lớp ngay khi lưu.
                      </div>
                    )}
                </div>

                {/* Cơ sở */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Cơ sở tổ chức <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="branchId"
                    required
                    value={formData.branchId}
                    onChange={handleChange}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {branches
                      .filter((b) => !editingClass ? b.isActive !== false : b.isActive !== false || String(b.id) === String(editingClass.branchId))
                      .map((b) => (
                        <option key={b.id} value={b.id} disabled={b.isActive === false}>
                          {b.branchName} {b.isActive === false ? '(Đã ngừng hoạt động)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Hình thức lớp học (Group / OneToOne) */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Hình thức lớp học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="classType"
                    required
                    value={formData.classType}
                    onChange={handleChange}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  >
                    <option value="Group">Lớp nhóm (Group)</option>
                    <option value="OneToOne">Kèm 1-1 (OneToOne)</option>
                  </select>
                </div>

                {/* Sĩ số tối đa */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Sĩ số tối đa (MaxStudents) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxStudents"
                    min={editingClass ? Math.max(1, editingClass.activeStudentsCount ?? 0) : 1}
                    max="100"
                    required
                    value={formData.maxStudents}
                    onChange={handleChange}
                    className={`w-full rounded-full border bg-surface px-4 py-2.5 text-sm text-ink focus:outline-none ${editingClass && Number(formData.maxStudents) < (editingClass.activeStudentsCount ?? 0)
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25'
                      }`}
                  />
                  {editingClass && (
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Sĩ số đang theo học hiện tại:{' '}
                      <span className="font-mono font-semibold text-ink-secondary">
                        {editingClass.activeStudentsCount ?? 0}
                      </span>{' '}
                      học viên.
                    </p>
                  )}
                  {editingClass && Number(formData.maxStudents) < (editingClass.activeStudentsCount ?? 0) && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      ⚠️ Không thể hạ sĩ số tối đa xuống dưới số học viên đang theo học hiện tại ({editingClass.activeStudentsCount ?? 0} học viên).
                    </p>
                  )}
                </div>

                {/* Học phí */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
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
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                  {editingClass && (
                    <p className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 leading-relaxed">
                      ℹ️ Lưu ý: Không thể thay đổi học phí của lớp nếu lớp đã có khoản thu học phí phát sinh.
                    </p>
                  )}
                </div>

                {/* Ngày khai giảng */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Ngày khai giảng
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>

                {/* Ngày kết thúc */}
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                  />
                </div>
              </div>

              {/* Các trường mở rộng khi Chỉnh sửa lớp */}
              {editingClass && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 border-t border-line pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-secondary mb-1">
                      Trạng thái lớp học
                    </label>
                    <select
                      name="status"
                      disabled={editingClass.status === 'Finished'}
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
                    >
                      <option value="Upcoming">Sắp mở (Upcoming)</option>
                      <option value="Ongoing">Đang học (Ongoing)</option>
                      <option value="Finished">Đã kết thúc (Finished)</option>
                    </select>
                    {editingClass.status === 'Finished' && (
                      <p className="mt-1 text-[11px] text-ink-muted">
                        🔒 Lớp học đã kết thúc (Finished), không thể chuyển trạng thái quay lại Đang học.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isOpenForRegistration"
                        checked={formData.isOpenForRegistration}
                        onChange={handleChange}
                        className="h-4 w-4 rounded accent-teal border-line focus:ring-gold/30"
                      />
                      <span className="text-xs font-semibold text-ink-secondary">
                        Mở tiếp nhận đăng ký học viên mới
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Ghi chú lớp học (Phòng học, trang thiết bị...)
                </label>
                <textarea
                  rows={2}
                  name="note"
                  placeholder="VD: Phòng học Họa Mi tầng 1, kèm giáo cụ luyện chữ chuyên biệt..."
                  value={formData.note}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-line bg-surface p-3 text-xs md:text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-line pt-4">
                <SecondaryButton
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Hủy bỏ
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={
                    submitting ||
                    Boolean(editingClass && Number(formData.maxStudents) < (editingClass.activeStudentsCount ?? 0)) ||
                    Boolean(editingClass && teachers.find((t) => String(t.id) === String(formData.teacherId))?.isActive === false)
                  }
                  className="px-5 py-2 text-xs"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    'Lưu lớp học'
                  )}
                </PrimaryButton>
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
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => setSelectedDetailClass(null)}
            aria-hidden="true"
          />

          {/* Drawer Panel trượt từ cạnh phải */}
          <div className="relative w-full max-w-2xl bg-surface shadow-modal border-l border-line/60 flex flex-col z-10 h-full overflow-hidden">
            {/* Header Drawer */}
            <div className="flex items-start justify-between border-b border-line px-6 py-4 bg-surface-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink-muted">
                    #CLS-{selectedDetailClass.id}
                  </span>
                  <h2 className="text-base md:text-lg font-bold text-ink">
                    {selectedDetailClass.className}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary mt-1">
                  <span className="font-semibold text-teal">{selectedDetailClass.courseName || 'Khóa học'}</span>
                  <span>•</span>
                  <span>{selectedDetailClass.branchName || `Cơ sở #${selectedDetailClass.branchId}`}</span>
                  <span>•</span>
                  <span>👩‍🏫 {selectedDetailClass.teacherName || 'Chưa phân công'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailClass(null)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-mint-canvas hover:text-ink cursor-pointer"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-line bg-surface px-6 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDetailTab('students')}
                className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${detailTab === 'students'
                    ? 'border-teal text-teal'
                    : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
              >
                <span>🎓 Học viên trong lớp</span>
                <Badge variant="gold" className="normal-case tracking-normal px-2 py-0.5 text-[11px]">
                  {classEnrollments.filter((sc) => sc.status === 'Active').length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('progress')}
                className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${detailTab === 'progress'
                    ? 'border-teal text-teal'
                    : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
              >
                <span>📖 Tiến độ bài học</span>
                <Badge variant="gold" className="normal-case tracking-normal px-2 py-0.5 text-[11px]">
                  {lessonProgresses.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${detailTab === 'info'
                    ? 'border-teal text-teal'
                    : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
              >
                <span>ℹ️ Thông tin chung</span>
              </button>
            </div>

            {/* Thân Drawer cuộn độc lập */}
            <div className="flex-1 overflow-y-auto p-6 bg-mint-canvas/50">
              {detailTab === 'students' ? (
                /* ========================================================
                   TAB 1: HỌC VIÊN TRONG LỚP (GHI DANH / DUYỆT GHI DANH)
                   ======================================================== */
                <div className="space-y-4">
                  {/* Thanh tác vụ đầu tab */}
                  <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-ink">
                        Danh sách ghi danh lớp học
                      </h3>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        Tổng {classEnrollments.length} bản ghi danh (
                        {classEnrollments.filter((s) => s.status === 'Active').length} đang học,{' '}
                        {classEnrollments.filter((s) => s.status === 'Pending').length} chờ duyệt,{' '}
                        {classEnrollments.filter((s) => s.status === 'Dropped').length} ngừng học)
                      </p>
                    </div>

                    {canManageEnrollments(selectedDetailClass) && (
                      <PrimaryButton
                        type="button"
                        onClick={() => {
                          setShowEnrollForm((v) => !v);
                          setEnrollSubmitError('');
                        }}
                        className="px-3.5 py-1.5 text-xs self-start sm:self-auto"
                      >
                        <span>{showEnrollForm ? 'Đóng form thêm' : '+ Thêm học viên vào lớp'}</span>
                      </PrimaryButton>
                    )}
                  </Card>

                  {/* Ghi chú nghiệp vụ Dropped -> Active */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold">Lưu ý trạng thái ghi danh:</span> Khi đổi trạng thái học viên sang{' '}
                    <span className="font-semibold">Ngừng học (Dropped)</span>, mọi ghi danh lớp của học viên sẽ tự động chuyển thành{' '}
                    <span className="font-semibold">Dropped</span>. Khi đưa học viên về{' '}
                    <span className="font-semibold">Đang học (Active)</span>, ghi danh{' '}
                    <span className="font-semibold underline">không tự khôi phục</span> — quản lý phải duyệt lại tại đây để phụ huynh/học viên thấy lịch học.
                  </div>

                  {/* Form thêm học viên vào lớp (SuperAdmin / BranchManager) */}
                  {showEnrollForm && canManageEnrollments(selectedDetailClass) && (
                    <form
                      onSubmit={handleEnrollSubmit}
                      className="rounded-2xl border border-gold/40 bg-surface p-4 space-y-3 shadow-card"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-ink">
                          Ghi danh học viên đang học (Cơ sở: {selectedDetailClass.branchName || `#${selectedDetailClass.branchId}`})
                        </h4>
                      </div>

                      {enrollSubmitError && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                          ⚠️ {enrollSubmitError}
                        </div>
                      )}

                      {(() => {
                        const existingMap = new Map(classEnrollments.map((sc) => [sc.studentId, sc]));
                        const availableStudents = branchStudents.filter((stu) => !existingMap.has(stu.id));
                        const droppedInClass = branchStudents.filter(
                          (stu) => existingMap.get(stu.id)?.status === 'Dropped' || existingMap.get(stu.id)?.status === 'Rejected'
                        );

                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block font-semibold text-ink-secondary mb-1">
                                  Chọn học viên <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  required
                                  disabled={loadingBranchStudents}
                                  value={enrollStudentId}
                                  onChange={(e) => setEnrollStudentId(e.target.value)}
                                  className="w-full rounded-full border border-line bg-surface px-4 py-2 text-xs text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle"
                                >
                                  <option value="">
                                    {loadingBranchStudents
                                      ? 'Đang tải học viên...'
                                      : availableStudents.length === 0
                                        ? '-- Không còn học viên phù hợp --'
                                        : '-- Chọn học viên đang học --'}
                                  </option>
                                  {availableStudents.map((stu) => (
                                    <option key={stu.id} value={stu.id}>
                                      {stu.fullName} {stu.parentPhone ? `(${stu.parentPhone})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block font-semibold text-ink-secondary mb-1">
                                  Ghi chú ghi danh (tùy chọn)
                                </label>
                                <input
                                  type="text"
                                  maxLength={500}
                                  placeholder="VD: Nhập học từ tháng 11..."
                                  value={enrollNote}
                                  onChange={(e) => setEnrollNote(e.target.value)}
                                  className="w-full rounded-full border border-line bg-surface px-4 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                                />
                              </div>
                            </div>

                            {droppedInClass.length > 0 && (
                              <p className="text-[11px] text-ink-secondary">
                                💡 Học viên đã có bản ghi danh ở trạng thái Dropped/Rejected ({droppedInClass.map((s) => s.fullName).join(', ')}) không thể thêm trùng — hãy bấm <span className="font-semibold text-teal">Duyệt lại</span> ở danh sách bên dưới.
                              </p>
                            )}

                            <div className="flex justify-end gap-2 pt-1">
                              <SecondaryButton
                                type="button"
                                onClick={() => setShowEnrollForm(false)}
                                className="px-3.5 py-1.5 text-xs"
                              >
                                Hủy
                              </SecondaryButton>
                              <PrimaryButton
                                type="submit"
                                disabled={enrollSubmitting || !enrollStudentId}
                                className="px-3.5 py-1.5 text-xs"
                              >
                                {enrollSubmitting ? 'Đang ghi danh...' : 'Xác nhận ghi danh'}
                              </PrimaryButton>
                            </div>
                          </>
                        );
                      })()}
                    </form>
                  )}

                  {enrollmentError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                      ⚠️ {enrollmentError}
                    </div>
                  )}

                  {loadingEnrollments ? (
                    <div className="py-10 text-center text-xs text-ink-muted">
                      Đang tải danh sách học viên trong lớp...
                    </div>
                  ) : classEnrollments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
                      <div className="text-2xl mb-1.5">🎓</div>
                      <p className="text-xs font-semibold text-ink-secondary">Chưa có học viên nào ghi danh lớp này</p>
                      <p className="text-[11px] text-ink-muted mt-1">
                        {canManageEnrollments(selectedDetailClass)
                          ? 'Nhấn "+ Thêm học viên vào lớp" để ghi danh học viên đang học.'
                          : 'Danh sách học viên sẽ hiển thị khi quản lý ghi danh vào lớp.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {classEnrollments.map((sc) => {
                        const statusMap = {
                          Active: { label: 'Đang học (Active)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          Pending: { label: 'Chờ duyệt (Pending)', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                          Dropped: { label: 'Ngừng học (Dropped)', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                          Rejected: { label: 'Từ chối (Rejected)', cls: 'bg-surface-subtle text-ink-secondary border-line' },
                          Completed: { label: 'Hoàn thành', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                        };
                        const badge = statusMap[sc.status] || {
                          label: sc.status,
                          cls: 'bg-surface-subtle text-ink-secondary border-line',
                        };

                        return (
                          <Card
                            key={sc.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs md:text-sm font-bold text-ink">
                                  {sc.studentName || `Học viên #${sc.studentId}`}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <div className="text-[11px] text-ink-muted flex flex-wrap gap-x-3 gap-y-0.5">
                                <span>Đăng ký: {formatDateTime(sc.registeredAt)}</span>
                                {sc.approvedByName && (
                                  <span>
                                    Duyệt bởi: <span className="font-medium text-ink-secondary">{sc.approvedByName}</span>
                                    {sc.approvedAt ? ` (${formatDateTime(sc.approvedAt)})` : ''}
                                  </span>
                                )}
                              </div>

                              {sc.note && (
                                <p className="text-[11px] text-ink-secondary bg-surface-subtle rounded-xl px-2.5 py-1.5 border border-line/60">
                                  Ghi chú: {sc.note}
                                </p>
                              )}
                            </div>

                            {canManageEnrollments(selectedDetailClass) && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {(sc.status === 'Pending' || sc.status === 'Dropped' || sc.status === 'Rejected') && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({
                                        sc,
                                        targetStatus: 'Active',
                                        note: sc.note || '',
                                        submitting: false,
                                        error: '',
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                                  >
                                    {sc.status === 'Pending' ? 'Duyệt' : 'Duyệt lại'}
                                  </button>
                                )}
                                {(sc.status === 'Active' || sc.status === 'Pending') && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatusActionModal({
                                        sc,
                                        targetStatus: 'Dropped',
                                        note: sc.note || '',
                                        submitting: false,
                                        error: '',
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold hover:bg-rose-100 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                                  >
                                    {sc.status === 'Pending' ? 'Từ chối' : 'Ngừng ghi danh'}
                                  </button>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : detailTab === 'progress' ? (
                /* ========================================================
                   TAB 1: TIẾN ĐỘ BÀI HỌC (LESSON PROGRESS TIMELINE)
                   ======================================================== */
                <div className="space-y-6">
                  {/* Thanh tác vụ đầu tab */}
                  <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-ink">
                        Nhật ký tiến độ bài dạy theo buổi
                      </h3>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        Nội dung giảng dạy thực tế, mức độ tiếp thu và dặn dò sau từng buổi học
                      </p>
                    </div>

                    {canManageProgress(selectedDetailClass) && (
                      <PrimaryButton
                        type="button"
                        onClick={handleOpenCreateProgress}
                        className="px-3.5 py-1.5 text-xs self-start sm:self-auto"
                      >
                        <span>+ Ghi nhận tiến độ mới</span>
                      </PrimaryButton>
                    )}
                  </Card>

                  {progressError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                      ⚠️ {progressError}
                    </div>
                  )}

                  {loadingProgress ? (
                    <div className="py-12 text-center text-ink-muted">
                      <svg className="h-6 w-6 animate-spin mx-auto text-teal mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span className="text-xs">Đang tải nhật ký tiến độ...</span>
                    </div>
                  ) : lessonProgresses.length === 0 ? (
                    /* Emil Kowalski Tasteful Clean Empty State */
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold-soft text-2xl text-teal shadow-xs">
                        📖
                      </div>
                      <h4 className="text-sm font-bold text-ink">
                        Chưa có ghi nhận tiến độ bài học nào
                      </h4>
                      <p className="text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
                        Giáo viên phụ trách lớp sẽ cập nhật nội dung giảng dạy thực tế, mức độ tiếp thu của các bé và dặn dò phụ huynh sau mỗi buổi học tại trung tâm.
                      </p>
                      {canManageProgress(selectedDetailClass) && (
                        <div className="pt-2">
                          <PrimaryButton
                            type="button"
                            onClick={handleOpenCreateProgress}
                            className="px-4 py-2 text-xs"
                          >
                            <span>+ Ghi nhận tiến độ buổi đầu tiên</span>
                          </PrimaryButton>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Timeline Trục Dọc Dòng Thời Gian */
                    <div className="border-l-2 border-line ml-3 md:ml-4 pl-4 md:pl-6 space-y-6 relative">
                      {lessonProgresses.map((lp) => (
                        <div key={lp.id} className="relative group">
                          {/* Dot chỉ thị nốt mốc */}
                          <div className="absolute -left-[23px] md:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-gold border-2 border-surface ring-2 ring-gold-soft shadow-xs" />

                          {/* Thẻ nội dung buổi học */}
                          <Card className="p-4 hover:shadow-card-hover transition-shadow space-y-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line/60 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-ink text-xs md:text-sm">
                                    {formatDate(lp.lessonDate)}
                                  </span>
                                  {lp.scheduleId && (
                                    <Badge variant="gold" className="normal-case tracking-normal text-[10px] px-2 py-0.5">
                                      Buổi học #{lp.scheduleId}
                                    </Badge>
                                  )}
                                </div>
                                {lp.title && (
                                  <h4 className="text-xs font-bold text-teal mt-1">
                                    {lp.title}
                                  </h4>
                                )}
                                <div className="text-[11px] text-ink-muted mt-0.5">
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
                                    className="p-1.5 rounded-full text-ink-muted hover:text-teal hover:bg-gold-soft text-xs cursor-pointer"
                                    title="Sửa nội dung"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProgress(lp)}
                                    className="p-1.5 rounded-full text-ink-muted hover:text-rose-600 hover:bg-rose-50 text-xs cursor-pointer"
                                    title="Xóa ghi nhận này"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Nội dung chi tiết */}
                            <div className="text-xs md:text-sm text-ink-secondary whitespace-pre-line leading-relaxed">
                              {lp.content}
                            </div>
                          </Card>
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
                  <Card className="p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line pb-2">
                      Thông tin cơ bản lớp học
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
                      <div>
                        <span className="text-ink-muted block text-xs">Tên lớp học:</span>
                        <span className="font-bold text-ink">{selectedDetailClass.className}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Khóa học đào tạo:</span>
                        <span className="font-semibold text-ink">{selectedDetailClass.courseName || '—'}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Giáo viên phụ trách:</span>
                        <span className="font-semibold text-ink">👩‍🏫 {selectedDetailClass.teacherName || 'Chưa phân công'}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Cơ sở tổ chức:</span>
                        <span className="font-semibold text-ink">{selectedDetailClass.branchName || `Cơ sở #${selectedDetailClass.branchId}`}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Hình thức lớp:</span>
                        <span className="font-semibold text-ink">
                          {selectedDetailClass.classType === 'OneToOne' ? 'Kèm 1-1 (OneToOne)' : 'Lớp nhóm (Group)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Sĩ số hiện tại / tối đa:</span>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-ink">
                            {selectedDetailClass.activeStudentsCount ?? 0} / {selectedDetailClass.maxStudents ?? '—'} học viên
                          </span>
                          {selectedDetailClass.maxStudents &&
                            (selectedDetailClass.activeStudentsCount ?? 0) >= selectedDetailClass.maxStudents && (
                              <Badge variant="amber" className="normal-case tracking-normal text-[10px] px-2 py-0.5">
                                (Đầy)
                              </Badge>
                            )}
                        </div>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Ngày khai giảng:</span>
                        <span className="font-semibold text-ink">{formatDate(selectedDetailClass.startDate)}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Ngày bế giảng dự kiến:</span>
                        <span className="font-semibold text-ink">{formatDate(selectedDetailClass.endDate)}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Học phí lớp:</span>
                        <span className="font-bold text-teal">{formatFee(selectedDetailClass.tuitionFee)}</span>
                      </div>

                      <div>
                        <span className="text-ink-muted block text-xs">Trạng thái hiện tại:</span>
                        <span className="mt-0.5 inline-block">{renderStatusBadge(selectedDetailClass.status)}</span>
                      </div>
                    </div>

                    {selectedDetailClass.note && (
                      <div className="border-t border-line pt-3">
                        <span className="text-ink-muted block text-xs mb-1">Ghi chú phòng học / thiết bị:</span>
                        <div className="rounded-xl bg-surface-subtle p-3 text-xs text-ink-secondary">
                          {selectedDetailClass.note}
                        </div>
                      </div>
                    )}
                  </Card>
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
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !progressSubmitting && setIsProgressModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal modal-panel z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {editingProgress ? '✏️ Cập nhật tiến độ bài học' : '📖 Ghi nhận tiến độ bài học mới'}
                </h3>
                <p className="text-xs text-teal font-semibold mt-0.5">
                  Lớp: {selectedDetailClass?.className}
                </p>
              </div>
              <button
                type="button"
                disabled={progressSubmitting}
                onClick={() => setIsProgressModalOpen(false)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {progressFormError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {progressFormError}
              </div>
            )}

            <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Ngày diễn ra buổi học */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Ngày diễn ra buổi học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={progressFormData.lessonDate}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, lessonDate: e.target.value }))}
                  className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {/* Buổi học trong lịch */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Buổi học trong lịch <span className="text-ink-muted font-normal">(Khuyên dùng)</span>
                </label>
                <select
                  value={progressFormData.scheduleId}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, scheduleId: e.target.value }))}
                  className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                >
                  <option value="">-- Chọn buổi học tương ứng (Nếu có) --</option>
                  {classSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      Buổi ngày {formatDate(s.studyDate)} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-ink-muted mt-1">
                  ℹ️ Chọn buổi học tương ứng để hệ thống đồng bộ với lịch học và bảng điểm danh.
                </p>
              </div>

              {/* Tiêu đề tóm tắt */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Tiêu đề tóm tắt buổi dạy <span className="text-ink-muted font-normal">(Tùy chọn)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="VD: Luyện viết nhóm nét khuyết trên & dưới; Ôn tập bảng cộng trừ..."
                  value={progressFormData.title}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {/* Nội dung bài dạy & Tình hình học tập */}
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Nội dung bài dạy &amp; Tình hình học tập <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="- Nội dung đã dạy: ...&#10;- Đánh giá tiếp thu của học sinh trong lớp: ...&#10;- Bài tập / Nhiệm vụ dặn dò về nhà: ..."
                  value={progressFormData.content}
                  onChange={(e) => setProgressFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full rounded-2xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
                <p className="text-[11px] text-ink-muted mt-1">
                  Hỗ trợ xuống dòng và các gạch đầu dòng để nội dung dễ đọc cho ban quản lý và phụ huynh.
                </p>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-line pt-4">
                <SecondaryButton
                  type="button"
                  disabled={progressSubmitting}
                  onClick={() => setIsProgressModalOpen(false)}
                  className="px-4 py-2 text-xs"
                >
                  Hủy bỏ
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={progressSubmitting}
                  className="px-5 py-2 text-xs"
                >
                  {progressSubmitting ? (
                    'Đang lưu...'
                  ) : editingProgress ? (
                    'Lưu thay đổi'
                  ) : (
                    '✓ Lưu tiến độ'
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL XÁC NHẬN DUYỆT / NGỪNG GHI DANH HỌC VIÊN */}
      {statusActionModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !statusActionModal.submitting && setStatusActionModal(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-card-lg border border-line/60 bg-surface p-6 shadow-modal modal-panel z-10">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {statusActionModal.targetStatus === 'Active'
                    ? 'Duyệt ghi danh học viên'
                    : 'Ngừng ghi danh học viên'}
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  {statusActionModal.sc.studentName} — Lớp {selectedDetailClass?.className}
                </p>
              </div>
              <button
                type="button"
                disabled={statusActionModal.submitting}
                onClick={() => setStatusActionModal(null)}
                className="rounded-full p-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnrollmentStatusSubmit} className="mt-4 space-y-3 text-xs">
              {statusActionModal.error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700">
                  ⚠️ {statusActionModal.error}
                </div>
              )}

              <div className="rounded-2xl bg-surface-subtle border border-line px-3.5 py-2.5 text-ink-secondary">
                Trạng thái mới:{' '}
                <span
                  className={`font-bold ${statusActionModal.targetStatus === 'Active' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                >
                  {statusActionModal.targetStatus === 'Active' ? 'Đang học (Active)' : 'Ngừng học (Dropped)'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder={
                    statusActionModal.targetStatus === 'Active'
                      ? 'VD: Đã xác nhận xếp lớp, duyệt lại sau khi quay lại học...'
                      : 'VD: Phụ huynh xin nghỉ lớp, chuyển lớp khác...'
                  }
                  value={statusActionModal.note}
                  onChange={(e) =>
                    setStatusActionModal((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <SecondaryButton
                  type="button"
                  disabled={statusActionModal.submitting}
                  onClick={() => setStatusActionModal(null)}
                  className="px-4 py-2 text-xs"
                >
                  Hủy
                </SecondaryButton>
                <button
                  type="submit"
                  disabled={statusActionModal.submitting}
                  className={`px-4 py-2 rounded-full font-semibold text-white active:scale-[0.97] transition-transform duration-150 disabled:opacity-50 cursor-pointer ${statusActionModal.targetStatus === 'Active'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                >
                  {statusActionModal.submitting
                    ? 'Đang xử lý...'
                    : statusActionModal.targetStatus === 'Active'
                      ? 'Xác nhận duyệt'
                      : 'Xác nhận ngừng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL XÁC NHẬN & BÁO LỖI CHẶN ĐÓNG LỚP HỌC (BLOCKING DEPENDENCIES MODAL) */}
      {closeClassModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !closeClassModal.submitting && setCloseClassModal(null)}
            aria-hidden="true"
          />
          <div className="relative max-w-md w-full bg-surface rounded-card-lg shadow-modal border border-line/60 modal-panel p-6 z-10">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${closeClassModal.errorMessage
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-700'
                  }`}
              >
                {closeClassModal.errorMessage ? '🚫' : '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-ink">
                  {closeClassModal.errorMessage
                    ? 'Không thể đóng / xóa lớp học này'
                    : 'Xác nhận đóng lớp học'}
                </h3>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                  {closeClassModal.errorMessage ? (
                    <>
                      Lớp <strong className="text-ink">{closeClassModal.cls.className}</strong> hiện đang có các ràng buộc nghiệp vụ chưa hoàn tất:
                    </>
                  ) : (
                    <>
                      Bạn có chắc chắn muốn đóng lớp{' '}
                      <strong className="text-ink">&ldquo;{closeClassModal.cls.className}&rdquo;</strong>? Lớp học sẽ được chuyển trạng thái{' '}
                      <strong className="text-ink">Đã kết thúc (Finished)</strong> và đóng cổng đăng ký.
                    </>
                  )}
                </p>
              </div>
            </div>

            {closeClassModal.errorMessage && (
              <div className="mt-4 bg-rose-50/80 border border-rose-200 rounded-2xl p-4 space-y-2">
                {closeClassModal.reasons && closeClassModal.reasons.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-rose-900 font-medium">
                    {closeClassModal.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-rose-900 font-medium leading-relaxed">
                    {closeClassModal.errorMessage}
                  </p>
                )}
                <p className="text-[11px] text-rose-700 pt-1 border-t border-rose-200/70">
                  Vui lòng xử lý hoàn tất các mục trên trước khi thực hiện đóng lớp.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-line pt-4">
              {closeClassModal.errorMessage ? (
                <PrimaryButton
                  type="button"
                  onClick={() => setCloseClassModal(null)}
                  className="px-4 py-2 text-xs w-full sm:w-auto"
                >
                  Đã hiểu
                </PrimaryButton>
              ) : (
                <>
                  <SecondaryButton
                    type="button"
                    disabled={closeClassModal.submitting}
                    onClick={() => setCloseClassModal(null)}
                    className="px-4 py-2 text-xs"
                  >
                    Hủy bỏ
                  </SecondaryButton>
                  <button
                    type="button"
                    disabled={closeClassModal.submitting}
                    onClick={handleConfirmCloseClass}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {closeClassModal.submitting ? 'Đang kiểm tra & đóng lớp...' : 'Xác nhận đóng lớp'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmModal)}
        mode={confirmModal?.mode || 'confirm'}
        title={confirmModal?.title}
        message={confirmModal?.message}
        onConfirm={() => {
          const action = confirmModal?.onConfirm;
          setConfirmModal(null);
          action?.();
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
