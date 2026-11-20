import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';
import { fetchAllStudents } from '../utils/fetchAllStudents';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  CustomSelect,
} from '../components/ui';

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
  const [currentUser] = useState(() => getStoredUser());

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
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [requesterTypeFilter, setRequesterTypeFilter] = useState('all'); // 'all', 'Student', 'Teacher'
  const [studentFilter, setStudentFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(
    isBranchManager && currentUser.branchId ? String(currentUser.branchId) : ''
  );
  const [statusFilter, setStatusFilter] = useState(
    initialStatus && validStatuses.includes(initialStatus) ? initialStatus : 'all'
  ); // 'all', 'Pending', 'Approved', 'Rejected', 'Cancelled'
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

  // Banner cảnh báo không tự tắt khi duyệt đơn có buổi đã chấm Present/Late được giữ nguyên
  const [skippedBanner, setSkippedBanner] = useState(null);
  const [studentsLoadError, setStudentsLoadError] = useState('');

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

        // Tải danh sách học viên (phân trang pageSize <= 100 theo ràng buộc StudentQuery)
        setStudentsLoadError('');
        try {
          const stuList = await fetchAllStudents();
          if (!ignore) {
            if (isParent) {
              setStudents(
                stuList.filter((s) => Number(s.parentId) === Number(currentUser.id))
              );
            } else if (isStudent) {
              setStudents(
                stuList.filter(
                  (s) =>
                    Number(s.userId) === Number(currentUser.id) ||
                    Number(s.id) === Number(currentUser.studentId)
                )
              );
            } else if (isBranchManager && currentUser.branchId) {
              setStudents(
                stuList.filter((s) => Number(s.branchId) === Number(currentUser.branchId))
              );
            } else {
              setStudents(stuList);
            }
          }
        } catch (sErr) {
          console.warn('Lỗi tải danh sách học viên:', sErr);
          if (!ignore) {
            const msg =
              sErr?.response?.data?.message ||
              'Không thể tải danh sách học viên. Vui lòng thử tải lại trang.';
            setStudentsLoadError(msg);
          }
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

  const lastFocusRefreshRef = useRef(0);

  // Tự động làm mới danh sách khi người dùng quay lại tab / focus cửa sổ
  useEffect(() => {
    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < 2000) return;
      lastFocusRefreshRef.current = now;
      setReloadKey((k) => k + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };

    window.addEventListener('focus', triggerRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', triggerRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  // State Modal Xác nhận Hủy Đơn Đã Duyệt (Revoke Approved Leave Request)
  const [cancelApprovedModal, setCancelApprovedModal] = useState(null); // { req, reason, submitting, error }

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

      const res = await axiosClient.put(`/LeaveRequests/${selectedRequest.id}/review`, payload);

      const skippedDates = Array.isArray(res.data?.skippedDates) ? res.data.skippedDates : [];
      const attendanceSkipped = res.data?.attendanceSkipped ?? 0;
      if (newStatus === 'Approved' && (attendanceSkipped > 0 || skippedDates.length > 0)) {
        setSkippedBanner({
          message:
            res.data?.message ||
            'Một số buổi học đã được chấm Có mặt/Đi muộn nên điểm danh được giữ nguyên.',
          skippedDates,
          attendanceSkipped,
        });
      }

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

  const [confirmModal, setConfirmModal] = useState(null);

  // Duyệt nhanh từ danh sách (Quick Approve)
  const handleQuickApprove = (req, e) => {
    e.stopPropagation();
    setConfirmModal({
      mode: 'confirm',
      title: 'Xác nhận phê duyệt',
      message: `Xác nhận phê duyệt đơn xin nghỉ #${req.id} cho ${req.studentName || req.teacherName}?`,
      onConfirm: async () => {
        try {
          const res = await axiosClient.put(`/LeaveRequests/${req.id}/review`, {
            status: 'Approved',
            reviewNote: 'Đã duyệt nhanh từ danh sách.',
          });
          const skippedDates = Array.isArray(res.data?.skippedDates) ? res.data.skippedDates : [];
          const attendanceSkipped = res.data?.attendanceSkipped ?? 0;
          if (attendanceSkipped > 0 || skippedDates.length > 0) {
            setSkippedBanner({
              message:
                res.data?.message ||
                'Một số buổi học đã được chấm Có mặt/Đi muộn nên điểm danh được giữ nguyên.',
              skippedDates,
              attendanceSkipped,
            });
          }
          showToast('success', `Đã duyệt đơn #${req.id} và tự động đồng bộ điểm danh!`);
          setReloadKey((k) => k + 1);
        } catch (err) {
          console.error('Lỗi duyệt nhanh đơn:', err);
          const msg = err.response?.data?.message || 'Không thể phê duyệt đơn này.';
          showToast('error', msg);
        }
      },
    });
  };

  // Hủy đơn xin nghỉ (Pending: hủy nhanh; Approved: mở modal bắt buộc nhập lý do)
  const handleCancelRequest = (reqOrId, e) => {
    if (e) e.stopPropagation();
    const reqObj =
      typeof reqOrId === 'object'
        ? reqOrId
        : leaveRequests.find((r) => r.id === reqOrId) || selectedRequest;
    const reqId = typeof reqOrId === 'object' ? reqOrId.id : reqOrId;

    if (reqObj && reqObj.status === 'Approved') {
      setCancelApprovedModal({
        req: reqObj,
        reason: '',
        submitting: false,
        error: '',
      });
      return;
    }

    setConfirmModal({
      mode: 'confirm',
      title: 'Xác nhận hủy đơn',
      message: 'Bạn có chắc chắn muốn hủy đơn xin nghỉ này không?',
      onConfirm: async () => {
        try {
          await axiosClient.put(`/LeaveRequests/${reqId}/cancel`, { reason: 'Hủy đơn chờ duyệt' });
          showToast('success', 'Đã hủy đơn xin nghỉ phép thành công.');
          if (detailModalOpen) setDetailModalOpen(false);
          setReloadKey((k) => k + 1);
        } catch (err) {
          console.error('Lỗi hủy đơn xin nghỉ:', err);
          const msg = err.response?.data?.message || 'Không thể hủy đơn này.';
          showToast('error', msg);
        }
      },
    });
  };

  // Submit hủy đơn đã duyệt (Approved -> Cancelled kèm lý do bắt buộc)
  const handleConfirmCancelApproved = async (e) => {
    e.preventDefault();
    if (!cancelApprovedModal?.req) return;
    const trimmedReason = cancelApprovedModal.reason.trim();
    if (!trimmedReason) {
      setCancelApprovedModal((prev) => ({
        ...prev,
        error: 'Vui lòng nhập lý do hủy đơn xin nghỉ đã được phê duyệt.',
      }));
      return;
    }

    setCancelApprovedModal((prev) => ({ ...prev, submitting: true, error: '' }));
    try {
      await axiosClient.put(`/LeaveRequests/${cancelApprovedModal.req.id}/cancel`, {
        reason: trimmedReason,
      });
      showToast('success', 'Đã hủy đơn xin nghỉ đã duyệt và hoàn tác dữ liệu liên quan thành công!');
      setCancelApprovedModal(null);
      if (detailModalOpen) setDetailModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi hủy đơn đã duyệt:', err);
      const msg = err.response?.data?.message || 'Không thể hủy đơn đã duyệt này.';
      setCancelApprovedModal((prev) => ({
        ...prev,
        submitting: false,
        error: msg,
      }));
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
          className={`toast-panel fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border ${
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
      <PageHeader
        eyebrow="Nghỉ phép & Chuyên cần"
        title="Quản lý Đơn xin nghỉ phép"
        description="Theo dõi, tiếp nhận và xét duyệt đơn xin nghỉ học của học viên và nghỉ dạy của giáo viên tại các chi nhánh."
        actions={
          <PrimaryButton type="button" onClick={handleOpenCreateModal}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Gửi đơn xin nghỉ</span>
          </PrimaryButton>
        }
      />

      {/* BANNER CẢNH BÁO KHÔNG TỰ TẮT KHI CÓ BUỔI ĐÃ CHẤM PRESENT/LATE ĐƯỢC GIỮ NGUYÊN */}
      {skippedBanner && (
        <div
          role="alert"
          className="rounded-card border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-xs flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-sm">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="space-y-1.5">
              <p className="font-semibold">
                {skippedBanner.message}
              </p>
              {skippedBanner.skippedDates.length > 0 && (
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">Các ngày được giữ nguyên điểm danh: </span>
                  <span className="font-mono">
                    {skippedBanner.skippedDates.map((d) => formatDate(d)).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSkippedBanner(null)}
            aria-label="Đóng thông báo"
            className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 hover:text-amber-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* BỘ LỌC ĐA NĂNG (FILTER TOOLBAR) */}
      <Card className="p-4 space-y-3.5">
        {/* Hàng 1: Search + Dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Ô Tìm kiếm thông minh */}
          <div className="lg:col-span-2 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <InputPill
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên người xin, người gửi, lý do..."
              className="!h-10 !pl-9 !pr-8 !py-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-muted hover:text-ink text-xs cursor-pointer"
                aria-label="Xóa từ khóa"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc theo Đối tượng */}
          <div>
            <CustomSelect
              value={requesterTypeFilter}
              aria-label="Lọc theo đối tượng"
              onChange={(v) => {
                setRequesterTypeFilter(v);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'Tất cả đối tượng' },
                { value: 'Student', label: '🎓 Học viên xin nghỉ' },
                { value: 'Teacher', label: '👩‍🏫 Giáo viên xin nghỉ' },
              ]}
            />
          </div>

          {/* Lọc theo Học viên */}
          <div>
            <CustomSelect
              value={studentFilter}
              aria-label="Lọc theo học viên"
              onChange={(v) => {
                setStudentFilter(v);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: 'Tất cả học viên' },
                ...students.map((s) => ({
                  value: String(s.id),
                  label: `${s.fullName} (${s.code || `#STU-${s.id}`})`,
                })),
              ]}
            />
          </div>

          {/* Lọc theo Lớp học */}
          <div>
            <CustomSelect
              value={classFilter}
              aria-label="Lọc theo lớp học"
              onChange={(v) => {
                setClassFilter(v);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: 'Tất cả lớp học' },
                ...classes.map((c) => ({ value: String(c.id), label: c.className })),
              ]}
            />
          </div>

          {/* Lọc theo Chi nhánh */}
          <div>
            {isBranchManager ? (
              <div
                title="Chi nhánh bị khóa theo quyền quản lý cơ sở"
                className="w-full h-10 px-4 flex items-center gap-1.5 text-sm bg-surface-subtle border border-line rounded-full text-ink-muted cursor-not-allowed select-none truncate"
              >
                <span className="shrink-0">🔒</span>
                <span className="truncate">
                  {branches.find((b) => b.id === currentUser.branchId)?.branchName || 'Cơ sở của tôi'}
                </span>
              </div>
            ) : (
              <CustomSelect
                value={branchFilter}
                aria-label="Lọc theo chi nhánh"
                onChange={(v) => {
                  setBranchFilter(v);
                  setCurrentPage(1);
                }}
                disabled={!isSuperAdmin}
                options={[
                  { value: '', label: 'Tất cả cơ sở' },
                  ...branches.map((b) => ({ value: String(b.id), label: b.branchName })),
                ]}
              />
            )}
          </div>
        </div>

        {/* Hàng 2: Segmented Status Pills + Lọc Khoảng ngày */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2.5 border-t border-line/60">
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
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out whitespace-nowrap active:scale-95 cursor-pointer ${
                    active
                      ? tab.key === 'Pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : tab.key === 'Approved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : tab.key === 'Rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-teal text-gold shadow-xs'
                      : 'bg-surface-subtle text-ink-secondary hover:bg-mint-canvas'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active
                        ? tab.key === 'all' || tab.key === 'Cancelled'
                          ? 'bg-gold/20 text-gold'
                          : 'bg-white/25 text-white'
                        : 'bg-line/70 text-ink'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lọc khoảng ngày xin nghỉ */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
            <span className="font-medium whitespace-nowrap">Ngày nghỉ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              title="Từ ngày"
              className="h-9 px-3 text-xs bg-surface border border-line rounded-full text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
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
              className="h-9 px-3 text-xs bg-surface border border-line rounded-full text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-teal hover:text-gold-active hover:underline ml-1 cursor-pointer"
              >
                Xóa lọc ngày
              </button>
            )}
          </div>
        </div>
      </Card>

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
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal border-t-transparent" />
            <p className="text-xs text-ink-secondary">Đang tải danh sách đơn xin nghỉ phép...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          /* TRẠNG THÁI RỖNG (TASTEFUL EMPTY STATE) */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gold-soft flex items-center justify-center text-3xl mb-3">
              📋
            </div>
            <h3 className="text-base font-semibold text-ink">
              {search || statusFilter !== 'all' || fromDate || toDate
                ? 'Không tìm thấy đơn xin nghỉ nào phù hợp'
                : 'Chưa có đơn xin nghỉ phép nào'}
            </h3>
            <p className="text-xs text-ink-secondary max-w-md mt-1 leading-relaxed">
              {search || statusFilter !== 'all' || fromDate || toDate
                ? 'Thử thay đổi bộ lọc hoặc xóa từ khóa tìm kiếm để xem các đơn khác.'
                : 'Phụ huynh, học viên hoặc giáo viên có thể gửi đơn xin nghỉ học / nghỉ dạy tại đây.'}
            </p>
            <PrimaryButton
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 !text-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Gửi đơn xin nghỉ đầu tiên</span>
            </PrimaryButton>
          </div>
        ) : (
          <>
            {/* 1. BẢNG DESKTOP (ẨN TRÊN MÀN HÌNH NHỎ < 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3">Người xin nghỉ &amp; Vai trò</th>
                    <th className="px-4 py-3">Lớp &amp; Buổi học / Ngày nghỉ</th>
                    <th className="px-4 py-3 max-w-xs">Lý do xin nghỉ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Người duyệt &amp; Ghi chú</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {paginatedRequests.map((req) => {
                    const isPending = req.status === 'Pending';
                    const isStudentReq = req.requesterType === 'Student';
                    const displayName = isStudentReq ? req.studentName : req.teacherName;
                    const canCancelThis = isPending && (req.requestedBy === currentUser.id || canReview);

                    return (
                      <tr
                        key={req.id}
                        onClick={() => handleOpenDetail(req)}
                        className="hover:bg-mint-canvas/60 cursor-pointer transition-colors duration-150 ease-out"
                      >
                        {/* Cột 1: Người xin nghỉ & Vai trò */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isStudentReq
                                  ? 'bg-gold-soft text-teal border border-gold/30'
                                  : 'bg-mint-canvas text-teal border border-line'
                              }`}
                            >
                              {getInitials(displayName)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-ink truncate">
                                  {displayName || 'Chưa cập nhật tên'}
                                </span>
                                {renderRequesterBadge(req.requesterType)}
                              </div>
                              <div className="text-xs text-ink-secondary mt-0.5 space-x-1">
                                {isStudentReq && req.studentId && (
                                  <span className="font-mono text-[11px] font-semibold text-ink-secondary">
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
                            <div className="font-medium text-ink">
                              {req.className || (
                                <span className="text-ink-muted italic">Nghỉ cả ngày — tất cả các lớp đang học</span>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-teal mt-0.5">
                              📅 {formatDateWithWeekday(req.leaveDate)}
                            </div>
                            <div className="text-[11px] text-ink-secondary mt-0.5">
                              {req.scheduleId ? (
                                <span className="inline-flex items-center gap-1 text-ink-secondary">
                                  <span>⏰ Buổi #{req.scheduleId}</span>
                                </span>
                              ) : (
                                <span className="inline-block rounded-full bg-surface-subtle px-2 py-0.2 text-[10px] text-ink-secondary font-medium">
                                  Nghỉ cả ngày
                                </span>
                              )}
                              {req.branchName && (
                                <span className="ml-1 text-ink-muted">• {req.branchName}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Lý do xin nghỉ */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p
                            className="text-xs text-ink-secondary italic line-clamp-2"
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
                          {req.status === 'Approved' && !isStudentReq && (
                            <div className="text-[10px] font-medium text-emerald-700 mt-1 flex items-center gap-0.5">
                              <span>✓</span> Đã xử lý lịch dạy
                            </div>
                          )}
                        </td>

                        {/* Cột 5: Người duyệt & Ghi chú */}
                        <td className="px-4 py-3.5">
                          {req.reviewedByName ? (
                            <div className="text-xs">
                              <div className="font-medium text-ink">
                                {req.reviewedByName}
                              </div>
                              {req.reviewedAt && (
                                <div className="text-[11px] text-ink-muted">
                                  {formatDateTime(req.reviewedAt)}
                                </div>
                              )}
                              {req.reviewNote && (
                                <div
                                  className="text-[11px] text-ink-secondary italic line-clamp-1 mt-0.5"
                                  title={req.reviewNote}
                                >
                                  Note: {req.reviewNote}
                                </div>
                              )}
                            </div>
                          ) : req.status === 'Pending' ? (
                            <span className="text-xs text-ink-muted italic">
                              — (Đang chờ xét duyệt)
                            </span>
                          ) : (
                            <div className="text-xs">
                              <div className="font-medium text-ink-secondary">
                                Đã xử lý
                              </div>
                              {req.reviewedAt && (
                                <div className="text-[11px] text-ink-muted">
                                  {formatDateTime(req.reviewedAt)}
                                </div>
                              )}
                              {req.reviewNote && (
                                <div
                                  className="text-[11px] text-ink-secondary italic line-clamp-1 mt-0.5"
                                  title={req.reviewNote}
                                >
                                  Note: {req.reviewNote}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cột 6: Thao tác */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-center gap-1">
                            {/* Phím duyệt nhanh cho SuperAdmin & BranchManager khi Pending */}
                            {canReview && isPending && (
                              <>
                                <IconButton
                                  variant="neutral"
                                  onClick={(e) => handleQuickApprove(req, e)}
                                  title="Duyệt nhanh đơn này"
                                  className="!bg-emerald-50 !border-emerald-200 !text-emerald-700 hover:!bg-emerald-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </IconButton>
                                <IconButton
                                  variant="danger"
                                  onClick={() => handleOpenDetail(req)}
                                  title="Từ chối đơn (nhập lý do)"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </IconButton>
                              </>
                            )}

                            {/* Hủy đơn khi Pending */}
                            {canCancelThis && !canReview && (
                              <IconButton
                                variant="danger"
                                onClick={(e) => handleCancelRequest(req, e)}
                                title="Hủy đơn xin nghỉ này"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </IconButton>
                            )}

                            {/* Hủy đơn đã duyệt (dành cho SuperAdmin & BranchManager khi Approved) */}
                            {canReview && req.status === 'Approved' && (
                              <IconButton
                                variant="danger"
                                onClick={(e) => handleCancelRequest(req, e)}
                                title="Hủy đơn đã duyệt & hoàn tác điểm danh / lịch dạy"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </IconButton>
                            )}

                            {/* Xem chi tiết */}
                            <IconButton
                              variant="neutral"
                              onClick={() => handleOpenDetail(req)}
                              title="Xem chi tiết đơn"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. CARD STACK TRÊN MOBILE (< 768px) CHUẨN APPLE HIG */}
            <div className="md:hidden divide-y divide-line/60">
              {paginatedRequests.map((req) => {
                const isPending = req.status === 'Pending';
                const isStudentReq = req.requesterType === 'Student';
                const displayName = isStudentReq ? req.studentName : req.teacherName;
                const canCancelThis = isPending && (req.requestedBy === currentUser.id || canReview);

                return (
                  <div
                    key={req.id}
                    onClick={() => handleOpenDetail(req)}
                    className="p-4 space-y-2.5 active:bg-mint-canvas/50 transition-colors"
                  >
                    {/* Header Card: Tên + Badge trạng thái */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isStudentReq ? 'bg-gold-soft text-teal border border-gold/30' : 'bg-mint-canvas text-teal border border-line'
                          }`}
                        >
                          {getInitials(displayName)}
                        </div>
                        <div>
                          <div className="font-semibold text-ink text-sm">
                            {displayName || 'Chưa cập nhật tên'}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-ink-secondary">
                            {renderRequesterBadge(req.requesterType)}
                            {isStudentReq && req.studentId && <span>• #STU-{req.studentId}</span>}
                          </div>
                        </div>
                      </div>
                      <div>{renderStatusBadge(req.status)}</div>
                    </div>

                    {/* Chi tiết ngày nghỉ & lớp */}
                    <div className="rounded-xl bg-surface-subtle p-2.5 text-xs space-y-1">
                      <div className="font-semibold text-teal">
                        📅 {formatDateWithWeekday(req.leaveDate)}
                      </div>
                      <div className="text-ink">
                        🏫 {req.className || 'Nghỉ cả ngày — tất cả các lớp đang học'}
                        {req.scheduleId && ` • Buổi #${req.scheduleId}`}
                      </div>
                      <div className="text-ink-secondary italic line-clamp-2">
                        💬 &ldquo;{req.reason}&rdquo;
                      </div>
                    </div>

                    {/* Dòng phụ người gửi */}
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
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
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full shadow-xs active:scale-95 cursor-pointer"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(req)}
                            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-full active:scale-95 cursor-pointer"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Từ chối</span>
                          </button>
                        </>
                      )}

                      <SecondaryButton
                        type="button"
                        onClick={() => handleOpenDetail(req)}
                        className={`flex-1 min-h-[44px] !text-xs ${
                          canReview && isPending ? '' : 'w-full'
                        }`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Chi tiết</span>
                      </SecondaryButton>

                      {canCancelThis && !canReview && (
                        <button
                          type="button"
                          onClick={(e) => handleCancelRequest(req, e)}
                          className="min-h-[44px] px-3.5 flex items-center justify-center gap-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Hủy</span>
                        </button>
                      )}

                      {canReview && req.status === 'Approved' && (
                        <button
                          type="button"
                          onClick={(e) => handleCancelRequest(req, e)}
                          className="min-h-[44px] px-3.5 flex items-center justify-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-full active:scale-95 transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out cursor-pointer"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Hủy đơn đã duyệt</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* THANH PHÂN TRANG */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line bg-surface-subtle px-4 py-3 text-xs text-ink-secondary">
                <div>
                  Hiển thị <span className="font-semibold text-ink">{(currentPage - 1) * pageSize + 1}</span> -{' '}
                  <span className="font-semibold text-ink">
                    {Math.min(currentPage * pageSize, filteredRequests.length)}
                  </span>{' '}
                  trên tổng số <span className="font-semibold text-ink">{filteredRequests.length}</span> đơn
                </div>
                <div className="flex items-center gap-1.5">
                  <SecondaryButton
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Trước
                  </SecondaryButton>
                  <span className="px-2 font-medium text-ink">
                    {currentPage} / {totalPages}
                  </span>
                  <SecondaryButton
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Sau
                  </SecondaryButton>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ============================================================ */}
      {/* 8. MODAL TẠO ĐƠN XIN NGHỈ MỚI (ROLE-ADAPTIVE FORM)            */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !createSubmitting && setIsCreateModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-card-lg bg-surface border border-line/60 shadow-modal modal-panel overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-line/60 px-6 py-4 bg-surface-subtle/60">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <span>📝</span> Tạo đơn xin nghỉ phép mới
                </h2>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Gửi đơn xin nghỉ học hoặc nghỉ dạy đến Ban quản trị Roxy Academy.
                </p>
              </div>
              <IconButton
                variant="neutral"
                onClick={() => setIsCreateModalOpen(false)}
                title="Đóng"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            {/* Form nội dung cuộn */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {createError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{createError}</span>
                </div>
              )}

              {/* 1. ROLE-ADAPTIVE: Phân loại đối tượng xin nghỉ */}
              {isStaff ? (
                /* SuperAdmin / BranchManager: Được chọn Học viên hoặc Giáo viên */
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink">
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
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border text-xs font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 ease-out cursor-pointer ${
                        createFormData.requesterType === 'Student'
                          ? 'border-teal bg-gold-soft text-teal shadow-xs'
                          : 'border-line bg-surface text-ink-secondary hover:bg-mint-canvas'
                      }`}
                    >
                      Học viên xin nghỉ
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
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border text-xs font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 ease-out cursor-pointer ${
                        createFormData.requesterType === 'Teacher'
                          ? 'border-teal bg-gold-soft text-teal shadow-xs'
                          : 'border-line bg-surface text-ink-secondary hover:bg-mint-canvas'
                      }`}
                    >
                      Giáo viên xin nghỉ
                    </button>
                  </div>

                  {/* Dropdown chọn Người xin tương ứng */}
                  {createFormData.requesterType === 'Student' ? (
                    <div>
                      <label className="block text-xs font-semibold text-ink mt-2 mb-1">
                        Chọn học viên: <span className="text-rose-500">*</span>
                      </label>
                      {studentsLoadError && (
                        <p className="mb-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                          ⚠️ {studentsLoadError}
                        </p>
                      )}
                      <CustomSelect
                        value={createFormData.studentId}
                        onChange={(v) =>
                          setCreateFormData((prev) => ({ ...prev, studentId: v }))
                        }
                        options={[
                          { value: '', label: '-- Chọn học viên --' },
                          ...students.map((s) => ({
                            value: s.id,
                            label: `${s.fullName} (${s.code || `#STU-${s.id}`})${s.branchName ? ` • ${s.branchName}` : ''}`,
                          })),
                        ]}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-ink mt-2 mb-1">
                        Chọn giáo viên: <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        value={createFormData.teacherId}
                        onChange={(v) =>
                          setCreateFormData((prev) => ({ ...prev, teacherId: v }))
                        }
                        options={[
                          { value: '', label: '-- Chọn giáo viên --' },
                          ...teachers.map((t) => ({
                            value: t.id,
                            label: `${t.fullName} (${t.email || t.username})`,
                          })),
                        ]}
                      />
                    </div>
                  )}
                </div>
              ) : isTeacher ? (
                /* Giáo viên: Tự động điền chính mình */
                <div className="rounded-xl bg-mint-canvas border border-line p-3">
                  <div className="text-xs font-semibold text-teal">
                    👩‍🏫 Đơn xin nghỉ dạy của Giáo viên
                  </div>
                  <div className="text-xs text-ink-secondary mt-0.5">
                    Họ và tên: <span className="font-semibold text-ink">{currentUser.fullName || 'Tôi'}</span>
                  </div>
                </div>
              ) : isParent ? (
                /* Phụ huynh: Chọn con mình */
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Chọn học viên (con của bạn): <span className="text-rose-500">*</span>
                  </label>
                  {studentsLoadError && (
                    <p className="mb-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                      ⚠️ {studentsLoadError}
                    </p>
                  )}
                  <CustomSelect
                    value={createFormData.studentId}
                    onChange={(v) =>
                      setCreateFormData((prev) => ({ ...prev, studentId: v }))
                    }
                    options={[
                      { value: '', label: '-- Chọn học viên --' },
                      ...students.map((s) => ({
                        value: s.id,
                        label: `${s.fullName} (${s.code || `#STU-${s.id}`})`,
                      })),
                    ]}
                  />
                </div>
              ) : (
                /* Học viên tự gửi: Tự động cho chính mình */
                <div className="rounded-xl bg-mint-canvas border border-line p-3">
                  <div className="text-xs font-semibold text-teal">
                    🎓 Đơn xin nghỉ học của Học viên
                  </div>
                  <div className="text-xs text-ink-secondary mt-0.5">
                    Học viên: <span className="font-semibold text-ink">{currentUser.fullName || 'Tôi'}</span>
                  </div>
                </div>
              )}

              {/* 2. Lớp học liên quan (Tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Lớp học liên quan: <span className="text-ink-muted font-normal">(Khuyên dùng)</span>
                </label>
                <CustomSelect
                  value={createFormData.classId}
                  onChange={(newClassId) => {
                    setCreateFormData((prev) => ({
                      ...prev,
                      classId: newClassId,
                      scheduleId: '',
                    }));
                    if (!newClassId) {
                      setAvailableSchedules([]);
                    }
                  }}
                  options={[
                    { value: '', label: '-- Không chọn lớp cụ thể (Nghỉ cả ngày) --' },
                    ...classes.map((c) => ({
                      value: c.id,
                      label: `${c.className}${c.branchName ? ` • ${c.branchName}` : ''}`,
                    })),
                  ]}
                />
                <p className="text-[11px] text-ink-muted mt-1">
                  Chọn lớp học để hệ thống tự động đồng bộ điểm danh khi đơn được duyệt.
                </p>
              </div>

              {/* 3. Ngày xin nghỉ */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Ngày xin nghỉ: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={createFormData.leaveDate}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, leaveDate: e.target.value }))
                  }
                  required
                  className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
                />
              </div>

              {/* 4. Buổi học trong ngày (nếu đã chọn lớp) */}
              {createFormData.classId && (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Buổi học cụ thể:{' '}
                    {loadingSchedules && <span className="text-teal font-normal">Đang tìm...</span>}
                  </label>
                  <CustomSelect
                    value={createFormData.scheduleId}
                    onChange={(v) =>
                      setCreateFormData((prev) => ({ ...prev, scheduleId: v }))
                    }
                    options={[
                      { value: '', label: '-- Nghỉ cả ngày / Không theo buổi cụ thể --' },
                      ...availableSchedules.map((sc) => ({
                        value: sc.id,
                        label: `Buổi #${sc.id}: ${formatDate(sc.studyDate)} (${sc.startTime} - ${sc.endTime})${sc.room ? ` • ${sc.room}` : ''}`,
                      })),
                    ]}
                  />
                  {availableSchedules.length === 0 && !loadingSchedules && (
                    <p className="text-[11px] text-ink-muted mt-1">
                      (Không tìm thấy buổi học nào trong ngày này của lớp. Đơn sẽ áp dụng nghỉ cả ngày).
                    </p>
                  )}
                </div>
              )}

              {/* 5. Lý do xin nghỉ phép */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink">
                    Lý do xin nghỉ phép: <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-ink-muted">
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
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />

                {/* Gợi ý lý do nhanh (Quick Reason Pills) */}
                <div className="mt-2 space-y-1">
                  <span className="text-[11px] font-medium text-ink-muted">Gợi ý lý do nhanh:</span>
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
                        className="px-2.5 py-1 rounded-full bg-gold-soft/60 border border-gold/30 hover:bg-gold-soft text-teal text-[11px] font-medium transition-colors active:scale-95 cursor-pointer"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-4 border-t border-line/60 flex items-center justify-end gap-3">
                <SecondaryButton
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="!text-xs"
                >
                  Hủy bỏ
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={createSubmitting}
                  className="!text-xs"
                >
                  {createSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                      <span>Đang gửi đơn...</span>
                    </>
                  ) : (
                    <span>Gửi đơn xin nghỉ</span>
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. MODAL XEM CHI TIẾT & DUYỆT / TỪ CHỐI ĐƠN                   */}
      {/* ============================================================ */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => setDetailModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-card-lg bg-surface border border-line/60 shadow-modal modal-panel overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-line/60 px-6 py-4 bg-surface-subtle/60">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">
                    Chi tiết đơn xin nghỉ #{selectedRequest.id}
                  </h2>
                  {renderStatusBadge(selectedRequest.status)}
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Ngày gửi: {formatDateTime(selectedRequest.createdAt)}
                </p>
              </div>
              <IconButton
                variant="neutral"
                onClick={() => setDetailModalOpen(false)}
                title="Đóng"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            {/* Nội dung chi tiết */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {reviewError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{reviewError}</span>
                </div>
              )}

              {/* Khối Thông tin người xin */}
              <div className="rounded-card border border-line bg-surface-subtle/60 p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Thông tin đối tượng xin nghỉ
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-ink-secondary">Đối tượng:</span>{' '}
                    <span className="font-semibold text-ink">
                      {selectedRequest.requesterType === 'Teacher' ? '👩‍🏫 Giáo viên' : '🎓 Học viên'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Họ và tên:</span>{' '}
                    <span className="font-semibold text-ink">
                      {selectedRequest.studentName || selectedRequest.teacherName || '—'}
                    </span>
                    {selectedRequest.studentId && (
                      <span className="ml-1 font-mono text-[11px] text-ink-muted">
                        (#STU-{selectedRequest.studentId})
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-ink-secondary">Người gửi đơn:</span>{' '}
                    <span className="font-medium text-ink">
                      {selectedRequest.requestedByName || 'Phụ huynh / Học viên'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Cơ sở chi nhánh:</span>{' '}
                    <span className="font-medium text-ink">
                      {selectedRequest.branchName || 'Trung tâm'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Lớp học:</span>{' '}
                    <span className="font-medium text-ink">
                      {selectedRequest.className || 'Nghỉ cả ngày — tất cả các lớp đang học'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-secondary">Ngày xin nghỉ:</span>{' '}
                    <span className="font-semibold text-teal">
                      {formatDateWithWeekday(selectedRequest.leaveDate)}
                    </span>
                  </div>
                </div>

                {selectedRequest.scheduleId && (
                  <div className="pt-2 border-t border-line/60 text-xs text-ink-secondary">
                    <span className="font-medium">Buổi học xin nghỉ:</span> Buổi #{selectedRequest.scheduleId}
                  </div>
                )}
              </div>

              {/* Khối Lý do xin nghỉ */}
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Lý do xin nghỉ phép:
                </label>
                <div className="rounded-card border border-line bg-surface p-3.5 text-xs text-ink italic leading-relaxed">
                  &ldquo;{selectedRequest.reason}&rdquo;
                </div>
              </div>

              {/* KHỐI LƯU Ý NGHIỆP VỤ SƯ PHẠM (ĐỒNG BỘ ĐIỂM DANH TỰ ĐỘNG) */}
              {selectedRequest.requesterType === 'Student' && (
                <div className="rounded-card border border-line bg-mint-canvas/70 p-3.5 text-xs text-teal space-y-1 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>⚡</span> Cơ chế đồng bộ Điểm danh tự động (Auto Excused-Absent):
                  </div>
                  <p className="text-[11px] text-ink-secondary">
                    Khi đơn xin nghỉ này được <strong>&ldquo;DUYỆT&rdquo; (Approved)</strong>, hệ thống sẽ <strong>TỰ ĐỘNG</strong> đánh dấu học viên ở trạng thái <em>&ldquo;Nghỉ có phép&rdquo; (ExcusedAbsent)</em> trên bảng điểm danh của buổi học liên quan. Giáo viên phụ trách không cần tích tay thủ công lại trên trang Điểm danh.
                  </p>
                </div>
              )}

              {/* KHỐI LƯU Ý XỬ LÝ BUỔI DẠY KHI DUYỆT ĐƠN NGHỈ CỦA GIÁO VIÊN */}
              {selectedRequest.requesterType === 'Teacher' && (
                <div className="rounded-card border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>⚠️</span> Cơ chế xử lý buổi dạy khi duyệt đơn nghỉ của Giáo viên:
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Khi đơn nghỉ của giáo viên được &ldquo;DUYỆT&rdquo; (Approved), các buổi học đang ở trạng thái &ldquo;Sắp tới (Scheduled)&rdquo; trong ngày/buổi nghỉ mà chưa có người dạy thay sẽ tự động chuyển sang trạng thái &ldquo;Tạm hoãn / Cần giáo viên dạy thay&rdquo; (Cancelled) để không còn buổi học Scheduled với giáo viên đang nghỉ.
                  </p>
                </div>
              )}

              {/* KHỐI KẾT QUẢ XÉT DUYỆT (NẾU ĐÃ DUYỆT HOẶC TỪ CHỐI) */}
              {selectedRequest.status !== 'Pending' && (
                <div
                  className={`rounded-card border p-4 space-y-1.5 text-xs ${
                    selectedRequest.status === 'Approved'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : selectedRequest.status === 'Rejected'
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-line bg-surface-subtle text-ink-secondary'
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
                <div className="rounded-card border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>✍️</span> Xét duyệt đơn xin nghỉ phép
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Ghi chú / Lời nhắn phản hồi: <span className="text-ink-muted font-normal">(Bắt buộc nếu từ chối)</span>
                    </label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Nhập ghi chú phản hồi cho phụ huynh/giáo viên..."
                      className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
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
                          className="px-2.5 py-0.5 rounded-full bg-surface hover:bg-gold-soft/70 text-teal border border-gold/40 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          {quickText}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal: Các nút hành động */}
            <div className="border-t border-line/60 px-6 py-3.5 bg-surface-subtle flex items-center justify-between gap-2">
              <div>
                {/* Cho phép người tạo hoặc staff hủy đơn khi Pending */}
                {selectedRequest.status === 'Pending' &&
                  (selectedRequest.requestedBy === currentUser.id || canReview) && (
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(selectedRequest)}
                      className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                    >
                      Hủy đơn xin nghỉ này
                    </button>
                  )}

                {/* Cho phép SuperAdmin / BranchManager hủy đơn đã duyệt */}
                {selectedRequest.status === 'Approved' && canReview && (
                  <button
                    type="button"
                    onClick={() => handleCancelRequest(selectedRequest)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-[0.98] rounded-full text-xs font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out cursor-pointer"
                  >
                    Hủy đơn đã duyệt
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="!text-xs"
                >
                  Đóng
                </SecondaryButton>

                {canReview && selectedRequest.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={() => handleReview('Rejected')}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs rounded-full active:scale-[0.98] transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Từ chối đơn</span>
                    </button>
                    <PrimaryButton
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={() => handleReview('Approved')}
                      className="!text-xs"
                    >
                      {reviewSubmitting ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                          <span>Đang duyệt...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Phê duyệt đơn</span>
                        </>
                      )}
                    </PrimaryButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. MODAL XÁC NHẬN HỦY ĐƠN ĐÃ DUYỆT (REVOKE APPROVED LEAVE)   */}
      {/* ============================================================ */}
      {cancelApprovedModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !cancelApprovedModal.submitting && setCancelApprovedModal(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-card-lg bg-surface border border-line/60 shadow-modal modal-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/60 px-5 py-4 bg-rose-50/40">
              <div>
                <h3 className="text-sm md:text-base font-bold text-ink">
                  Hủy đơn nghỉ phép đã duyệt (#{cancelApprovedModal.req.id})
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  {cancelApprovedModal.req.studentName || cancelApprovedModal.req.teacherName} •{' '}
                  {formatDateWithWeekday(cancelApprovedModal.req.leaveDate)}
                </p>
              </div>
              <IconButton
                variant="neutral"
                disabled={cancelApprovedModal.submitting}
                onClick={() => setCancelApprovedModal(null)}
                title="Đóng"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            <form onSubmit={handleConfirmCancelApproved} className="p-5 space-y-4 text-xs">
              {cancelApprovedModal.error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 font-medium">
                  ⚠️ {cancelApprovedModal.error}
                </div>
              )}

              <div className="rounded-card border border-line bg-mint-canvas/70 p-3.5 text-teal leading-relaxed">
                {cancelApprovedModal.req.requesterType === 'Teacher' ? (
                  <p>
                    🔄 Các buổi học bị tạm hoãn từ đơn này sẽ được khôi phục lại trạng thái{' '}
                    <strong>&ldquo;Sắp tới (Scheduled)&rdquo;</strong>.
                  </p>
                ) : (
                  <p>
                    🔄 Điểm danh <strong>&ldquo;Nghỉ có phép (ExcusedAbsent)&rdquo;</strong> đã tạo tự động từ đơn này sẽ được hoàn tác về trạng thái trước đó.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">
                  Lý do hủy đơn đã duyệt <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  placeholder="Nhập lý do hủy đơn nghỉ phép đã duyệt (bắt buộc)..."
                  value={cancelApprovedModal.reason}
                  onChange={(e) =>
                    setCancelApprovedModal((prev) => ({
                      ...prev,
                      reason: e.target.value,
                      error: '',
                    }))
                  }
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/60">
                <SecondaryButton
                  type="button"
                  disabled={cancelApprovedModal.submitting}
                  onClick={() => setCancelApprovedModal(null)}
                  className="!text-xs"
                >
                  Đóng
                </SecondaryButton>
                <button
                  type="submit"
                  disabled={cancelApprovedModal.submitting || !cancelApprovedModal.reason.trim()}
                  className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs active:scale-[0.98] transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {cancelApprovedModal.submitting ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
                </button>
              </div>
            </form>
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
