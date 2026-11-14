import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';

// Helper: Định dạng ngày kèm thứ tiếng Việt (VD: "Thứ Sáu, 14/11/2026")
function formatDateWithWeekday(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const weekdays = [
      'Chủ Nhật',
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
    ];
    const weekday = weekdays[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${weekday}, ${day}/${month}/${year}`;
  } catch {
    return String(dateString);
  }
}

export default function LeaveRequests() {
  // ==========================================
  // 1. THÔNG TIN NGƯỜI DÙNG & VAI TRÒ
  // ==========================================
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const role = currentUser.role || '';
  const isSuperAdmin = role === 'SuperAdmin';
  const isBranchManager = role === 'BranchManager';
  const isTeacher = role === 'Teacher';
  const isParent = role === 'Parent';
  const isStudent = role === 'Student';
  const isStaff = isSuperAdmin || isBranchManager;
  const canReview = isSuperAdmin || isBranchManager;

  // ==========================================
  // 2. STATE DANH SÁCH & BỘ LỌC
  // ==========================================
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Danh mục phục vụ bộ lọc & modal
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [requesterTypeFilter, setRequesterTypeFilter] = useState('all'); // 'all', 'Student', 'Teacher'
  const [studentFilter, setStudentFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(
    isBranchManager && currentUser.branchId ? String(currentUser.branchId) : ''
  );
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'Approved', 'Rejected', 'Cancelled'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Phân trang Client-side
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Toast feedback
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Debounce thanh tìm kiếm 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ==========================================
  // 3. TẢI DANH MỤC BỔ TRỢ (Metadata)
  // ==========================================
  useEffect(() => {
    let ignore = false;

    const fetchMetadata = async () => {
      try {
        const [branchRes, classRes] = await Promise.allSettled([
          axiosClient.get('/Branches'),
          axiosClient.get('/Classes'),
        ]);

        if (!ignore) {
          if (branchRes.status === 'fulfilled') {
            setBranches(branchRes.value.data || []);
          }
          if (classRes.status === 'fulfilled') {
            const cls = classRes.value.data || [];
            if (isTeacher) {
              setClasses(cls.filter((c) => c.teacherId === currentUser.id));
            } else if (isBranchManager && currentUser.branchId) {
              setClasses(cls.filter((c) => c.branchId === currentUser.branchId));
            } else {
              setClasses(cls);
            }
          }
        }

        // Tải danh sách học viên
        try {
          const studentRes = await axiosClient.get('/Students?pageSize=200');
          if (!ignore) {
            const raw = studentRes.data;
            const stuList = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
            if (isParent) {
              setStudents(stuList.filter((s) => s.parentId === currentUser.id));
            } else if (isStudent) {
              setStudents(stuList.filter((s) => s.userId === currentUser.id || s.id === currentUser.studentId));
            } else if (isBranchManager && currentUser.branchId) {
              setStudents(stuList.filter((s) => s.branchId === currentUser.branchId));
            } else {
              setStudents(stuList);
            }
          }
        } catch (sErr) {
          console.warn('Lỗi tải danh sách học viên:', sErr);
        }

        // Tải danh sách giáo viên (chỉ staff cần để duyệt hoặc chọn)
        if (isStaff) {
          try {
            const teacherRes = await axiosClient.get('/Users?role=Teacher&pageSize=100');
            if (!ignore) {
              const rawT = teacherRes.data;
              const tList = Array.isArray(rawT?.items) ? rawT.items : Array.isArray(rawT) ? rawT : [];
              if (isBranchManager && currentUser.branchId) {
                setTeachers(tList.filter((t) => t.branchId === currentUser.branchId));
              } else {
                setTeachers(tList);
              }
            }
          } catch (tErr) {
            console.warn('Lỗi tải danh sách giáo viên:', tErr);
          }
        }
      } catch (err) {
        console.error('Lỗi nạp danh mục bổ trợ:', err);
      }
    };

    fetchMetadata();

    return () => {
      ignore = true;
    };
  }, [currentUser.id, currentUser.branchId, currentUser.studentId, isBranchManager, isParent, isStaff, isStudent, isTeacher]);

  // ==========================================
  // 4. TẢI DANH SÁCH ĐƠN XIN NGHỈ (LEAVE REQUESTS)
  // ==========================================
  useEffect(() => {
    let ignore = false;

    const loadRequests = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (requesterTypeFilter !== 'all') params.requesterType = requesterTypeFilter;
        if (studentFilter) params.studentId = studentFilter;
        if (classFilter) params.classId = classFilter;
        if (isSuperAdmin && branchFilter) params.branchId = branchFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;

        const response = await axiosClient.get('/LeaveRequests', { params });
        if (!ignore) {
          const data = response.data;
          setLeaveRequests(Array.isArray(data) ? data : data?.items || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi nạp danh sách đơn xin nghỉ:', err);
          if (err.response?.status === 403) {
            setError('Bạn không có quyền xem danh sách đơn xin nghỉ phép.');
          } else {
            setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadRequests();

    return () => {
      ignore = true;
    };
  }, [
    reloadKey,
    requesterTypeFilter,
    studentFilter,
    classFilter,
    branchFilter,
    statusFilter,
    fromDate,
    toDate,
    isSuperAdmin,
  ]);

  // Lọc dữ liệu client-side theo từ khóa search debounced
  const filteredRequests = useMemo(() => {
    if (!debouncedSearch.trim()) return leaveRequests;
    const kw = debouncedSearch.trim().toLowerCase();
    return leaveRequests.filter((lr) => {
      const stuName = (lr.studentName || '').toLowerCase();
      const teaName = (lr.teacherName || '').toLowerCase();
      const reqName = (lr.requestedByName || '').toLowerCase();
      const clsName = (lr.className || '').toLowerCase();
      const reason = (lr.reason || '').toLowerCase();
      const revName = (lr.reviewedByName || '').toLowerCase();
      const idStr = String(lr.id);
      return (
        stuName.includes(kw) ||
        teaName.includes(kw) ||
        reqName.includes(kw) ||
        clsName.includes(kw) ||
        reason.includes(kw) ||
        revName.includes(kw) ||
        idStr.includes(kw)
      );
    });
  }, [leaveRequests, debouncedSearch]);

  // Thống kê số lượng theo trạng thái
  const statusCounts = useMemo(() => {
    const counts = { all: leaveRequests.length, Pending: 0, Approved: 0, Rejected: 0, Cancelled: 0 };
    leaveRequests.forEach((lr) => {
      if (counts[lr.status] !== undefined) {
        counts[lr.status] += 1;
      }
    });
    return counts;
  }, [leaveRequests]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // ==========================================
  // 5. STATE & LOGIC MODAL TẠO ĐƠN MỚI
  // ==========================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Form State tạo đơn
  const [createFormData, setCreateFormData] = useState({
    requesterType: isTeacher ? 'Teacher' : 'Student',
    studentId: '',
    teacherId: isTeacher ? String(currentUser.id) : '',
    classId: '',
    scheduleId: '',
    leaveDate: '',
    reason: '',
  });

  // Danh sách buổi học khi chọn class & leaveDate trong modal tạo đơn
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Mở modal tạo đơn và thiết lập giá trị ban đầu theo vai trò
  const handleOpenCreateModal = () => {
    setCreateError('');
    const today = new Date().toISOString().split('T')[0];

    let initialStudentId = '';
    let initialTeacherId = '';
    let initialRequesterType = 'Student';

    if (isTeacher) {
      initialRequesterType = 'Teacher';
      initialTeacherId = String(currentUser.id);
    } else if (isStudent) {
      initialRequesterType = 'Student';
      const myStudent = students.find((s) => s.userId === currentUser.id);
      if (myStudent) initialStudentId = String(myStudent.id);
    } else if (isParent && students.length === 1) {
      initialStudentId = String(students[0].id);
    }

    setCreateFormData({
      requesterType: initialRequesterType,
      studentId: initialStudentId,
      teacherId: initialTeacherId,
      classId: '',
      scheduleId: '',
      leaveDate: today,
      reason: '',
    });
    setAvailableSchedules([]);
    setIsCreateModalOpen(true);
  };

  // Nạp danh sách buổi học khi người dùng chọn ClassId hoặc LeaveDate trong form tạo đơn
  useEffect(() => {
    let ignore = false;

    if (!isCreateModalOpen || !createFormData.classId) {
      return () => {
        ignore = true;
      };
    }

    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const params = { classId: createFormData.classId };
        if (createFormData.leaveDate) {
          params.fromDate = createFormData.leaveDate;
          params.toDate = createFormData.leaveDate;
        }
        const res = await axiosClient.get('/Schedules', { params });
        if (!ignore) {
          const list = Array.isArray(res.data) ? res.data : [];
          setAvailableSchedules(list);
          // Nếu có buổi học trùng khớp, tự động chọn hoặc giữ nguyên
          if (list.length === 1) {
            setCreateFormData((prev) => ({ ...prev, scheduleId: String(list[0].id) }));
          }
        }
      } catch (err) {
        if (!ignore) {
          console.warn('Lỗi nạp lịch học của lớp:', err);
          setAvailableSchedules([]);
        }
      } finally {
        if (!ignore) setLoadingSchedules(false);
      }
    };

    fetchSchedules();

    return () => {
      ignore = true;
    };
  }, [isCreateModalOpen, createFormData.classId, createFormData.leaveDate]);

  // Submit tạo đơn mới
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    const { requesterType, studentId, teacherId, classId, scheduleId, leaveDate, reason } = createFormData;

    // Validation
    if (!leaveDate) {
      setCreateError('Vui lòng chọn ngày xin nghỉ.');
      return;
    }
    if (!reason.trim()) {
      setCreateError('Vui lòng nhập lý do xin nghỉ phép.');
      return;
    }
    if (reason.trim().length > 500) {
      setCreateError('Lý do xin nghỉ không được vượt quá 500 ký tự.');
      return;
    }

    if (requesterType === 'Student') {
      if (!studentId) {
        setCreateError('Vui lòng chọn học viên xin nghỉ.');
        return;
      }
    } else if (requesterType === 'Teacher') {
      if (!teacherId && !isTeacher) {
        setCreateError('Vui lòng chọn giáo viên xin nghỉ dạy.');
        return;
      }
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        requesterType,
        studentId: requesterType === 'Student' ? Number(studentId) : null,
        teacherId: requesterType === 'Teacher' ? Number(teacherId || currentUser.id) : null,
        classId: classId ? Number(classId) : null,
        scheduleId: scheduleId ? Number(scheduleId) : null,
        leaveDate,
        reason: reason.trim(),
      };

      await axiosClient.post('/LeaveRequests', payload);

      showToast('success', 'Gửi đơn xin nghỉ phép thành công! Ban quản lý sẽ sớm xét duyệt.');
      setIsCreateModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi gửi đơn xin nghỉ:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        'Không thể gửi đơn xin nghỉ. Vui lòng kiểm tra lại thông tin.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Nút chèn gợi ý lý do nhanh
  const handleInsertQuickReason = (text) => {
    setCreateFormData((prev) => ({
      ...prev,
      reason: text,
    }));
  };

  // ==========================================
  // 6. STATE & LOGIC MODAL CHI TIẾT & DUYỆT ĐƠN
  // ==========================================
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const handleOpenDetail = (req) => {
    setSelectedRequest(req);
    setReviewNote('');
    setReviewError('');
    setDetailModalOpen(true);
  };

  // Duyệt hoặc Từ chối đơn
  const handleReview = async (newStatus) => {
    if (!selectedRequest) return;
    setReviewError('');

    if (newStatus === 'Rejected' && !reviewNote.trim()) {
      setReviewError('Vui lòng nhập lý do từ chối để phản hồi cho người gửi đơn.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const payload = {
        status: newStatus,
        reviewNote: reviewNote.trim() || (newStatus === 'Approved' ? 'Đã duyệt đơn xin nghỉ phép.' : ''),
      };

      await axiosClient.put(`/LeaveRequests/${selectedRequest.id}/review`, payload);

      const successMsg =
        newStatus === 'Approved'
          ? 'Đã phê duyệt đơn xin nghỉ và tự động cập nhật điểm danh (Nghỉ có phép)!'
          : 'Đã từ chối đơn xin nghỉ phép.';
      showToast('success', successMsg);

      setDetailModalOpen(false);
      setSelectedRequest(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi duyệt đơn xin nghỉ:', err);
      const msg =
        err.response?.data?.message ||
        'Không thể xử lý xét duyệt đơn này. Vui lòng kiểm tra lại quyền hạn hoặc trạng thái đơn.';
      setReviewError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Duyệt nhanh từ danh sách (Quick Approve)
  const handleQuickApprove = async (req, e) => {
    e.stopPropagation();
    if (!window.confirm(`Xác nhận phê duyệt đơn xin nghỉ #${req.id} cho ${req.studentName || req.teacherName}?`)) {
      return;
    }

    try {
      await axiosClient.put(`/LeaveRequests/${req.id}/review`, {
        status: 'Approved',
        reviewNote: 'Đã duyệt nhanh từ danh sách.',
      });
      showToast('success', `Đã duyệt đơn #${req.id} và tự động đồng bộ điểm danh!`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi duyệt nhanh đơn:', err);
      const msg = err.response?.data?.message || 'Không thể phê duyệt đơn này.';
      showToast('error', msg);
    }
  };

  // Hủy đơn xin nghỉ (cho người gửi hoặc staff)
  const handleCancelRequest = async (reqId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn xin nghỉ này không?')) return;

    try {
      await axiosClient.put(`/LeaveRequests/${reqId}/cancel`);
      showToast('success', 'Đã hủy đơn xin nghỉ phép thành công.');
      if (detailModalOpen) setDetailModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi hủy đơn xin nghỉ:', err);
      const msg = err.response?.data?.message || 'Không thể hủy đơn này.';
      showToast('error', msg);
    }
  };

  // ==========================================
  // 7. HELPER BADGE & RENDER
  // ==========================================
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ duyệt
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đã duyệt
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Từ chối
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 line-through">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderRequesterBadge = (type) => {
    if (type === 'Teacher') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
          <span>👩‍🏫</span> Giáo viên
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
        <span>🎓</span> Học viên
      </span>
    );
  };

  const getInitials = (name) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* TOAST THÔNG BÁO NỔI */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all duration-200 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <span className="text-base">{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER TRANG */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>📋</span> Quản lý Đơn xin nghỉ phép
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi, tiếp nhận và xét duyệt đơn xin nghỉ học của học viên và nghỉ dạy của giáo viên tại các chi nhánh.
          </p>
        </div>

        {/* NÚT TẠO ĐƠN MỚI - HIỂN THỊ CHO TẤT CẢ VAI TRÒ */}
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150 shrink-0 min-h-[44px]"
        >
          <span>➕</span>
          <span>Gửi đơn xin nghỉ</span>
        </button>
      </div>

      {/* BỘ LỌC ĐA NĂNG (FILTER TOOLBAR) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
        {/* Hàng 1: Search + Dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Ô Tìm kiếm thông minh */}
          <div className="lg:col-span-2 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên người xin, người gửi, lý do..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all duration-150"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc theo Đối tượng */}
          <div>
            <select
              value={requesterTypeFilter}
              onChange={(e) => {
                setRequesterTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 transition-all duration-150"
            >
              <option value="all">Tất cả đối tượng</option>
              <option value="Student">🎓 Học viên xin nghỉ</option>
              <option value="Teacher">👩‍🏫 Giáo viên xin nghỉ</option>
            </select>
          </div>

          {/* Lọc theo Học viên */}
          <div>
            <select
              value={studentFilter}
              onChange={(e) => {
                setStudentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 transition-all duration-150"
            >
              <option value="">Tất cả học viên</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.code || `#STU-${s.id}`})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Lớp học */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 transition-all duration-150"
            >
              <option value="">Tất cả lớp học</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Chi nhánh */}
          <div>
            {isBranchManager ? (
              <div
                title="Chi nhánh bị khóa theo quyền quản lý cơ sở"
                className="w-full h-10 px-3 flex items-center gap-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed select-none"
              >
                <span>🔒</span>
                <span className="truncate">
                  {branches.find((b) => b.id === currentUser.branchId)?.branchName || 'Cơ sở của tôi'}
                </span>
              </div>
            ) : (
              <select
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!isSuperAdmin}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700 transition-all duration-150 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">Tất cả cơ sở</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Hàng 2: Segmented Status Pills + Lọc Khoảng ngày */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Pills trạng thái */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { key: 'all', label: 'Tất cả', count: statusCounts.all },
              { key: 'Pending', label: '⏳ Chờ duyệt', count: statusCounts.Pending },
              { key: 'Approved', label: '✓ Đã duyệt', count: statusCounts.Approved },
              { key: 'Rejected', label: '✕ Từ chối', count: statusCounts.Rejected },
              { key: 'Cancelled', label: 'Đã hủy', count: statusCounts.Cancelled },
            ].map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap active:scale-95 ${
                    active
                      ? tab.key === 'Pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : tab.key === 'Approved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : tab.key === 'Rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lọc khoảng ngày xin nghỉ */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-medium whitespace-nowrap">Ngày nghỉ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Từ ngày"
              className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
            <span>đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Đến ngày"
              className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setCurrentPage(1);
                }}
                className="text-xs text-blue-600 hover:underline ml-1"
              >
                Xóa lọc ngày
              </button>
            )}
          </div>
        </div>
      </div>

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs font-semibold text-rose-700 underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* DANH SÁCH ĐƠN XIN NGHỈ PHÉP */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
            <p className="text-xs text-slate-500">Đang tải danh sách đơn xin nghỉ phép...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          /* TRẠNG THÁI RỖNG (TASTEFUL EMPTY STATE) */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-3">
              📋
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {search || statusFilter !== 'all' || fromDate || toDate
                ? 'Không tìm thấy đơn xin nghỉ nào phù hợp'
                : 'Chưa có đơn xin nghỉ phép nào'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              {search || statusFilter !== 'all' || fromDate || toDate
                ? 'Thử thay đổi bộ lọc hoặc xóa từ khóa tìm kiếm để xem các đơn khác.'
                : 'Phụ huynh, học viên hoặc giáo viên có thể gửi đơn xin nghỉ học / nghỉ dạy tại đây.'}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs active:scale-95 transition-all"
            >
              <span>➕</span>
              <span>Gửi đơn xin nghỉ đầu tiên</span>
            </button>
          </div>
        ) : (
          <>
            {/* 1. BẢNG DESKTOP (ẨN TRÊN MÀN HÌNH NHỎ < 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Người xin nghỉ &amp; Vai trò</th>
                    <th className="px-4 py-3">Lớp &amp; Buổi học / Ngày nghỉ</th>
                    <th className="px-4 py-3 max-w-xs">Lý do xin nghỉ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Người duyệt &amp; Ghi chú</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRequests.map((req) => {
                    const isPending = req.status === 'Pending';
                    const isStudentReq = req.requesterType === 'Student';
                    const displayName = isStudentReq ? req.studentName : req.teacherName;
                    const canCancelThis = isPending && (req.requestedBy === currentUser.id || canReview);

                    return (
                      <tr
                        key={req.id}
                        onClick={() => handleOpenDetail(req)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-100"
                      >
                        {/* Cột 1: Người xin nghỉ & Vai trò */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isStudentReq
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}
                            >
                              {getInitials(displayName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 truncate">
                                  {displayName || 'Chưa cập nhật tên'}
                                </span>
                                {renderRequesterBadge(req.requesterType)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 space-x-1">
                                {isStudentReq && req.studentId && (
                                  <span className="font-mono text-[11px] font-semibold text-slate-600">
                                    #STU-{req.studentId}
                                  </span>
                                )}
                                <span>•</span>
                                <span className="italic">
                                  Gửi bởi:{' '}
                                  {req.requestedByName || (req.requestedBy === currentUser.id ? 'Tôi' : 'Phụ huynh')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Lớp & Buổi học / Ngày nghỉ */}
                        <td className="px-4 py-3.5">
                          <div>
                            <div className="font-medium text-slate-900">
                              {req.className || (
                                <span className="text-slate-400 italic">Nghỉ cả ngày (không theo lớp)</span>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-blue-700 mt-0.5">
                              📅 {formatDateWithWeekday(req.leaveDate)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {req.scheduleId ? (
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <span>⏰ Buổi #{req.scheduleId}</span>
                                </span>
                              ) : (
                                <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 font-medium">
                                  Nghỉ cả ngày
                                </span>
                              )}
                              {req.branchName && (
                                <span className="ml-1 text-slate-400">• {req.branchName}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Lý do xin nghỉ */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p
                            className="text-xs text-slate-700 italic line-clamp-2"
                            title={req.reason}
                          >
                            &ldquo;{req.reason}&rdquo;
                          </p>
                        </td>

                        {/* Cột 4: Trạng thái */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {renderStatusBadge(req.status)}
                          {req.status === 'Approved' && isStudentReq && (
                            <div className="text-[10px] font-medium text-emerald-700 mt-1 flex items-center gap-0.5">
                              <span>✓</span> Đã đồng bộ điểm danh
                            </div>
                          )}
                        </td>

                        {/* Cột 5: Người duyệt & Ghi chú */}
                        <td className="px-4 py-3.5">
                          {req.reviewedByName ? (
                            <div className="text-xs">
                              <div className="font-medium text-slate-800">
                                {req.reviewedByName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {formatDateTime(req.reviewedAt)}
                              </div>
                              {req.reviewNote && (
                                <div
                                  className="text-[11px] text-slate-600 italic line-clamp-1 mt-0.5"
                                  title={req.reviewNote}
                                >
                                  Note: {req.reviewNote}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              — (Đang chờ xét duyệt)
                            </span>
                          )}
                        </td>

                        {/* Cột 6: Thao tác */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Phím duyệt nhanh cho SuperAdmin & BranchManager khi Pending */}
                            {canReview && isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickApprove(req, e)}
                                  title="Duyệt nhanh đơn này"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-2xs active:scale-95 transition-all duration-100"
                                >
                                  <span>✓</span>
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(req)}
                                  title="Từ chối đơn (nhập lý do)"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-md active:scale-95 transition-all duration-100"
                                >
                                  <span>✕</span>
                                  <span>Từ chối</span>
                                </button>
                              </>
                            )}

                            {/* Hủy đơn khi Pending */}
                            {canCancelThis && !canReview && (
                              <button
                                type="button"
                                onClick={(e) => handleCancelRequest(req.id, e)}
                                title="Hủy đơn xin nghỉ này"
                                className="inline-flex items-center px-2 py-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                Hủy đơn
                              </button>
                            )}

                            {/* Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(req)}
                              title="Xem chi tiết đơn"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md active:scale-95 transition-all"
                            >
                              <span>👁</span>
                              <span>Chi tiết</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. CARD STACK TRÊN MOBILE (< 768px) CHUẨN APPLE HIG */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedRequests.map((req) => {
                const isPending = req.status === 'Pending';
                const isStudentReq = req.requesterType === 'Student';
                const displayName = isStudentReq ? req.studentName : req.teacherName;
                const canCancelThis = isPending && (req.requestedBy === currentUser.id || canReview);

                return (
                  <div
                    key={req.id}
                    onClick={() => handleOpenDetail(req)}
                    className="p-4 space-y-2.5 active:bg-slate-50 transition-colors"
                  >
                    {/* Header Card: Tên + Badge trạng thái */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isStudentReq ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {getInitials(displayName)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {displayName || 'Chưa cập nhật tên'}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            {renderRequesterBadge(req.requesterType)}
                            {isStudentReq && req.studentId && <span>• #STU-{req.studentId}</span>}
                          </div>
                        </div>
                      </div>
                      <div>{renderStatusBadge(req.status)}</div>
                    </div>

                    {/* Chi tiết ngày nghỉ & lớp */}
                    <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
                      <div className="font-semibold text-blue-700">
                        📅 {formatDateWithWeekday(req.leaveDate)}
                      </div>
                      <div className="text-slate-700">
                        🏫 {req.className || 'Nghỉ cả ngày (không theo lớp)'}
                        {req.scheduleId && ` • Buổi #${req.scheduleId}`}
                      </div>
                      <div className="text-slate-600 italic line-clamp-2">
                        💬 &ldquo;{req.reason}&rdquo;
                      </div>
                    </div>

                    {/* Dòng phụ người gửi */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Gửi bởi: {req.requestedByName || 'Phụ huynh'}</span>
                      <span>Mã: #LR-{req.id}</span>
                    </div>

                    {/* Nút hành động đạt chuẩn touch Apple HIG >= 44px */}
                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {canReview && isPending && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleQuickApprove(req, e)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs active:scale-95"
                          >
                            <span>✓</span> Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(req)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg active:scale-95"
                          >
                            <span>✕</span> Từ chối
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenDetail(req)}
                        className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg active:scale-95 ${
                          canReview && isPending ? '' : 'w-full'
                        }`}
                      >
                        <span>👁</span> Chi tiết
                      </button>

                      {canCancelThis && !canReview && (
                        <button
                          type="button"
                          onClick={(e) => handleCancelRequest(req.id, e)}
                          className="min-h-[44px] px-3 flex items-center justify-center text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* THANH PHÂN TRANG */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                <div>
                  Hiển thị <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> -{' '}
                  <span className="font-semibold">
                    {Math.min(currentPage * pageSize, filteredRequests.length)}
                  </span>{' '}
                  trên tổng số <span className="font-semibold">{filteredRequests.length}</span> đơn
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    Trước
                  </button>
                  <span className="px-2 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* 8. MODAL TẠO ĐƠN XIN NGHỈ MỚI (ROLE-ADAPTIVE FORM)            */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-150 scale-100 flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📝</span> Tạo đơn xin nghỉ phép mới
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gửi đơn xin nghỉ học hoặc nghỉ dạy đến Ban quản trị Roxy Academy.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form nội dung cuộn */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {createError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{createError}</span>
                </div>
              )}

              {/* 1. ROLE-ADAPTIVE: Phân loại đối tượng xin nghỉ */}
              {isStaff ? (
                /* SuperAdmin / BranchManager: Được chọn Học viên hoặc Giáo viên */
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Loại đối tượng xin nghỉ: <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          requesterType: 'Student',
                          teacherId: '',
                        }))
                      }
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        createFormData.requesterType === 'Student'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>🎓</span> Học viên xin nghỉ
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          requesterType: 'Teacher',
                          studentId: '',
                        }))
                      }
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        createFormData.requesterType === 'Teacher'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>👩‍🏫</span> Giáo viên xin nghỉ
                    </button>
                  </div>

                  {/* Dropdown chọn Người xin tương ứng */}
                  {createFormData.requesterType === 'Student' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mt-2 mb-1">
                        Chọn học viên: <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={createFormData.studentId}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({ ...prev, studentId: e.target.value }))
                        }
                        required
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">-- Chọn học viên --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.code || `#STU-${s.id}`}) {s.branchName ? `• ${s.branchName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mt-2 mb-1">
                        Chọn giáo viên: <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={createFormData.teacherId}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({ ...prev, teacherId: e.target.value }))
                        }
                        required
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">-- Chọn giáo viên --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName} ({t.email || t.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : isTeacher ? (
                /* Giáo viên: Tự động điền chính mình */
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                  <div className="text-xs font-semibold text-indigo-900">
                    👩‍🏫 Đơn xin nghỉ dạy của Giáo viên
                  </div>
                  <div className="text-xs text-indigo-700 mt-0.5">
                    Họ và tên: <span className="font-semibold">{currentUser.fullName || 'Tôi'}</span>
                  </div>
                </div>
              ) : isParent ? (
                /* Phụ huynh: Chọn con mình */
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn học viên (con của bạn): <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createFormData.studentId}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({ ...prev, studentId: e.target.value }))
                    }
                    required
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">-- Chọn học viên --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.code || `#STU-${s.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Học viên tự gửi: Tự động cho chính mình */
                <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
                  <div className="text-xs font-semibold text-sky-900">
                    🎓 Đơn xin nghỉ học của Học viên
                  </div>
                  <div className="text-xs text-sky-700 mt-0.5">
                    Học viên: <span className="font-semibold">{currentUser.fullName || 'Tôi'}</span>
                  </div>
                </div>
              )}

              {/* 2. Lớp học liên quan (Tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lớp học liên quan: <span className="text-slate-400 font-normal">(Khuyên dùng)</span>
                </label>
                <select
                  value={createFormData.classId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setCreateFormData((prev) => ({
                      ...prev,
                      classId: newClassId,
                      scheduleId: '',
                    }));
                    if (!newClassId) {
                      setAvailableSchedules([]);
                    }
                  }}
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700"
                >
                  <option value="">-- Không chọn lớp cụ thể (Nghỉ cả ngày) --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} {c.branchName ? `• ${c.branchName}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chọn lớp học để hệ thống tự động đồng bộ điểm danh khi đơn được duyệt.
                </p>
              </div>

              {/* 3. Ngày xin nghỉ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày xin nghỉ: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={createFormData.leaveDate}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, leaveDate: e.target.value }))
                  }
                  required
                  className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700"
                />
              </div>

              {/* 4. Buổi học trong ngày (nếu đã chọn lớp) */}
              {createFormData.classId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buổi học cụ thể:{' '}
                    {loadingSchedules && <span className="text-blue-600 font-normal">Đang tìm...</span>}
                  </label>
                  <select
                    value={createFormData.scheduleId}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({ ...prev, scheduleId: e.target.value }))
                    }
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-700"
                  >
                    <option value="">-- Nghỉ cả ngày / Không theo buổi cụ thể --</option>
                    {availableSchedules.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        Buổi #{sc.id}: {formatDate(sc.studyDate)} ({sc.startTime} - {sc.endTime}){' '}
                        {sc.room ? `• ${sc.room}` : ''}
                      </option>
                    ))}
                  </select>
                  {availableSchedules.length === 0 && !loadingSchedules && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      (Không tìm thấy buổi học nào trong ngày này của lớp. Đơn sẽ áp dụng nghỉ cả ngày).
                    </p>
                  )}
                </div>
              )}

              {/* 5. Lý do xin nghỉ phép */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Lý do xin nghỉ phép: <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {createFormData.reason.length} / 500 ký tự
                  </span>
                </div>
                <textarea
                  value={createFormData.reason}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Nhập lý do chi tiết (VD: Bé bị ốm sốt cần đi khám, gia đình có việc bận...)"
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {/* Gợi ý lý do nhanh (Quick Reason Pills) */}
                <div className="mt-2 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Gợi ý lý do nhanh:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: '⚡ Bị ốm / Khám bệnh',
                        text: 'Bé có triệu chứng ốm sốt, gia đình xin phép cho bé nghỉ để đi khám và điều trị.',
                      },
                      {
                        label: '⚡ Việc gia đình',
                        text: 'Gia đình có việc bận đột xuất nên xin phép cho bé tạm nghỉ buổi học này.',
                      },
                      {
                        label: '⚡ Trùng lịch thi ở trường',
                        text: 'Học viên trùng lịch thi học kỳ tại trường phổ thông, xin phép nghỉ buổi học.',
                      },
                      {
                        label: '⚡ Công tác / Việc riêng',
                        text: 'Giáo viên có việc đột xuất / tập huấn chuyên môn, xin phép nghỉ buổi dạy này.',
                      },
                    ].map((pill, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertQuickReason(pill.text)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors active:scale-95"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  {createSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Đang gửi đơn...</span>
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      <span>Gửi đơn xin nghỉ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. MODAL XEM CHI TIẾT & DUYỆT / TỪ CHỐI ĐƠN                   */}
      {/* ============================================================ */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-150 scale-100 flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Chi tiết đơn xin nghỉ #{selectedRequest.id}
                  </h2>
                  {renderStatusBadge(selectedRequest.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ngày gửi: {formatDateTime(selectedRequest.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {reviewError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Khối Thông tin người xin */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Thông tin đối tượng xin nghỉ
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Đối tượng:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {selectedRequest.requesterType === 'Teacher' ? '👩‍🏫 Giáo viên' : '🎓 Học viên'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Họ và tên:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {selectedRequest.studentName || selectedRequest.teacherName || '—'}
                    </span>
                    {selectedRequest.studentId && (
                      <span className="ml-1 font-mono text-[11px] text-slate-500">
                        (#STU-{selectedRequest.studentId})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500">Người gửi đơn:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {selectedRequest.requestedByName || 'Phụ huynh / Học viên'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cơ sở chi nhánh:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {selectedRequest.branchName || 'Trung tâm'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lớp học:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {selectedRequest.className || '— (Nghỉ cả ngày)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ngày xin nghỉ:</span>{' '}
                    <span className="font-semibold text-blue-700">
                      {formatDateWithWeekday(selectedRequest.leaveDate)}
                    </span>
                  </div>
                </div>

                {selectedRequest.scheduleId && (
                  <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                    <span className="font-medium">Buổi học xin nghỉ:</span> Buổi #{selectedRequest.scheduleId}
                  </div>
                )}
              </div>

              {/* Khối Lý do xin nghỉ */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Lý do xin nghỉ phép:
                </label>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 italic leading-relaxed">
                  &ldquo;{selectedRequest.reason}&rdquo;
                </div>
              </div>

              {/* KHỐI LƯU Ý NGHIỆP VỤ SƯ PHẠM (ĐỒNG BỘ ĐIỂM DANH TỰ ĐỘNG) */}
              {selectedRequest.requesterType === 'Student' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 space-y-1 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>⚡</span> Cơ chế đồng bộ Điểm danh tự động (Auto Excused-Absent):
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Khi đơn xin nghỉ này được <strong>&ldquo;DUYỆT&rdquo; (Approved)</strong>, hệ thống sẽ <strong>TỰ ĐỘNG</strong> đánh dấu học viên ở trạng thái <em>&ldquo;Nghỉ có phép&rdquo; (ExcusedAbsent)</em> trên bảng điểm danh của buổi học liên quan. Giáo viên phụ trách không cần tích tay thủ công lại trên trang Điểm danh.
                  </p>
                </div>
              )}

              {/* KHỐI KẾT QUẢ XÉT DUYỆT (NẾU ĐÃ DUYỆT HOẶC TỪ CHỐI) */}
              {selectedRequest.status !== 'Pending' && (
                <div
                  className={`rounded-xl border p-4 space-y-1.5 text-xs ${
                    selectedRequest.status === 'Approved'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : selectedRequest.status === 'Rejected'
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{selectedRequest.status === 'Approved' ? '✓' : '✕'}</span>
                    <span>
                      Đơn đã được {selectedRequest.status === 'Approved' ? 'phê duyệt' : selectedRequest.status === 'Rejected' ? 'từ chối' : 'hủy'}
                    </span>
                  </div>
                  {selectedRequest.reviewedByName && (
                    <div>
                      Người xét duyệt: <span className="font-semibold">{selectedRequest.reviewedByName}</span> • Lúc:{' '}
                      {formatDateTime(selectedRequest.reviewedAt)}
                    </div>
                  )}
                  {selectedRequest.reviewNote && (
                    <div className="italic pt-1 border-t border-black/10">
                      Ghi chú phản hồi: &ldquo;{selectedRequest.reviewNote}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* KHU VỰC PHÊ DUYỆT (CHỈ DÀNH CHO SUPERADMIN & BRANCHMANAGER KHI STATUS == 'PENDING') */}
              {canReview && selectedRequest.status === 'Pending' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>✍️</span> Xét duyệt đơn xin nghỉ phép
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ghi chú / Lời nhắn phản hồi: <span className="text-slate-400 font-normal">(Bắt buộc nếu từ chối)</span>
                    </label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Nhập ghi chú phản hồi cho phụ huynh/giáo viên..."
                      className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                    />

                    {/* Gợi ý phản hồi nhanh */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        'Đồng ý cho học viên nghỉ phép.',
                        'Đã duyệt, chúc bé mau khỏe nhé mẹ!',
                        'Đã duyệt, cô giáo sẽ chuẩn bị bài tập gửi kèm sau buổi học.',
                        'Đã duyệt nghỉ phép và bố trí giáo viên dạy thay.',
                      ].map((quickText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReviewNote(quickText)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-medium transition-colors"
                        >
                          ⚡ {quickText}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal: Các nút hành động */}
            <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50 flex items-center justify-between gap-2">
              <div>
                {/* Cho phép người tạo hoặc staff hủy đơn khi Pending */}
                {selectedRequest.status === 'Pending' &&
                  (selectedRequest.requestedBy === currentUser.id || canReview) && (
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(selectedRequest.id)}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Hủy đơn xin nghỉ này
                    </button>
                  )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                >
                  Đóng
                </button>

                {canReview && selectedRequest.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={() => handleReview('Rejected')}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs rounded-lg active:scale-[0.98] transition-all"
                    >
                      ✕ Từ chối đơn
                    </button>
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={() => handleReview('Approved')}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                      {reviewSubmitting ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Đang duyệt...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Phê duyệt đơn</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
