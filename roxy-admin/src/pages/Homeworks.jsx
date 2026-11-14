import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';

export default function Homeworks() {
  // 1. Phân quyền người dùng hiện tại
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
  const canManage = isSuperAdmin || isBranchManager || isTeacher;

  // 2. State danh sách bài tập & bộ lọc
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [dueStatusFilter, setDueStatusFilter] = useState('all'); // 'all', 'active', 'warning', 'overdue'

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 3. State Modal Tạo / Sửa bài tập
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [classSchedulesForModal, setClassSchedulesForModal] = useState([]);
  const [formData, setFormData] = useState({
    classId: '',
    scheduleId: '',
    title: '',
    description: '',
    attachmentUrl: '',
    dueDate: '',
  });

  // 4. State Drawer / Modal Chi tiết & Chấm bài / Nộp bài
  const [detailHomeworkId, setDetailHomeworkId] = useState(null);
  const [detailHomework, setDetailHomework] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [submissionTab, setSubmissionTab] = useState('all'); // 'all', 'Submitted', 'Reviewed', 'Pending'
  const [submissionSearch, setSubmissionSearch] = useState('');

  // Form chấm bài (cho Giáo viên / Staff)
  const [gradingScore, setGradingScore] = useState('');
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [gradingSubmitting, setGradingSubmitting] = useState(false);
  const [gradingError, setGradingError] = useState('');
  const [gradingSuccess, setGradingSuccess] = useState('');

  // Form nộp bài (cho Học sinh / Phụ huynh)
  const [studentSubmissionUrl, setStudentSubmissionUrl] = useState('');
  const [studentNote, setStudentNote] = useState('');
  const [studentSubmitting, setStudentSubmitting] = useState(false);
  const [studentSubmitError, setStudentSubmitError] = useState('');
  const [studentSubmitSuccess, setStudentSubmitSuccess] = useState('');

  // Lightbox xem ảnh lớn
  const [lightboxImage, setLightboxImage] = useState(null);

  // ==========================================
  // LOAD DỮ LIỆU BAN ĐẦU: LỚP HỌC & BÀI TẬP
  // ==========================================
  useEffect(() => {
    let ignore = false;
    const fetchClasses = async () => {
      try {
        const res = await axiosClient.get('/Classes');
        if (!ignore) {
          const list = res.data || [];
          if (isTeacher) {
            setClasses(list.filter((c) => c.teacherId === currentUser.id));
          } else {
            setClasses(list);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách lớp học:', err);
      }
    };
    fetchClasses();
    return () => {
      ignore = true;
    };
  }, [isTeacher, currentUser.id]);

  // Tải danh sách bài tập từ backend
  useEffect(() => {
    let ignore = false;
    const fetchHomeworks = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (classFilter) params.classId = classFilter;
        if (scheduleFilter) params.scheduleId = scheduleFilter;

        const res = await axiosClient.get('/Homeworks', { params });
        if (!ignore) {
          setHomeworks(res.data || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || 'Không thể tải danh sách bài tập.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchHomeworks();
    return () => {
      ignore = true;
    };
  }, [classFilter, scheduleFilter, reloadKey]);

  // Tải danh sách buổi học khi lọc theo lớp
  useEffect(() => {
    let ignore = false;
    if (!classFilter) return;

    const fetchSchedules = async () => {
      try {
        const res = await axiosClient.get(`/Schedules?classId=${classFilter}`);
        if (!ignore) {
          setSchedules(res.data || []);
        }
      } catch (err) {
        console.warn('Lỗi tải buổi học:', err);
      }
    };
    fetchSchedules();
    return () => {
      ignore = true;
    };
  }, [classFilter]);

  // ==========================================
  // BỘ LỌC DỮ LIỆU BÀI TẬP PHÍA CLIENT
  // ==========================================
  const filteredHomeworks = useMemo(() => {
    const now = new Date().getTime();

    return homeworks.filter((hw) => {
      // Tìm kiếm tiêu đề & tên lớp
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const titleMatch = hw.title?.toLowerCase().includes(q);
        const classMatch = hw.className?.toLowerCase().includes(q);
        const teacherMatch = hw.createdByName?.toLowerCase().includes(q);
        if (!titleMatch && !classMatch && !teacherMatch) return false;
      }

      // Lọc hạn nộp
      if (dueStatusFilter !== 'all') {
        if (!hw.dueDate) {
          if (dueStatusFilter === 'overdue') return false;
        } else {
          const dueTime = new Date(hw.dueDate).getTime();
          const diffHours = (dueTime - now) / (1000 * 3600);

          if (dueStatusFilter === 'active' && dueTime < now) return false;
          if (dueStatusFilter === 'overdue' && dueTime >= now) return false;
          if (dueStatusFilter === 'warning' && (dueTime < now || diffHours > 24)) return false;
        }
      }

      return true;
    });
  }, [homeworks, search, dueStatusFilter]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredHomeworks.length / pageSize));
  const paginatedHomeworks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHomeworks.slice(start, start + pageSize);
  }, [filteredHomeworks, currentPage, pageSize]);

  // ==========================================
  // HELPER FORMAT & KIỂM TRA HẠN NỘP
  // ==========================================
  const getDueStatus = (dueDateStr) => {
    if (!dueDateStr) {
      return { status: 'none', label: 'Không giới hạn', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', textNote: '' };
    }
    const dueTime = new Date(dueDateStr).getTime();
    const now = new Date().getTime();
    const diffMs = dueTime - now;
    const diffDays = Math.round(diffMs / (1000 * 3600 * 24));
    const diffHours = Math.round(diffMs / (1000 * 3600));

    if (diffMs < 0) {
      const pastDays = Math.abs(diffDays);
      return {
        status: 'overdue',
        label: 'Đã quá hạn',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
        textNote: pastDays === 0 ? '⚠️ Quá hạn hôm nay' : `⚠️ Quá hạn ${pastDays} ngày`,
      };
    } else if (diffHours <= 24) {
      return {
        status: 'warning',
        label: 'Sắp hết hạn',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse',
        textNote: diffHours <= 1 ? '⏳ Còn dưới 1 giờ' : `⏳ Còn ${diffHours} giờ`,
      };
    } else {
      return {
        status: 'active',
        label: 'Còn hạn',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
        textNote: `(Còn ${diffDays} ngày)`,
      };
    }
  };

  // Kiểm tra quyền Sửa/Xóa của bài tập
  const canModifyHomework = (hw) => {
    if (isSuperAdmin) return true;
    if (isBranchManager) return hw.branchId === currentUser.branchId;
    if (isTeacher) return hw.createdBy === currentUser.id;
    return false;
  };

  // ==========================================
  // THAO TÁC MODAL GIAO / SỬA BÀI TẬP
  // ==========================================
  const handleOpenCreateModal = () => {
    setEditingHomework(null);
    setFormError('');
    const defaultClassId = classes.length > 0 ? String(classes[0].id) : '';
    setFormData({
      classId: defaultClassId,
      scheduleId: '',
      title: '',
      description: '',
      attachmentUrl: '',
      dueDate: '',
    });

    if (defaultClassId) {
      loadClassSchedulesForModal(defaultClassId);
    } else {
      setClassSchedulesForModal([]);
    }
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (hw) => {
    setEditingHomework(hw);
    setFormError('');

    let formattedDueDate = '';
    if (hw.dueDate) {
      try {
        const d = new Date(hw.dueDate);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        formattedDueDate = `${y}-${m}-${day}T${h}:${min}`;
      } catch {
        formattedDueDate = '';
      }
    }

    setFormData({
      classId: String(hw.classId),
      scheduleId: hw.scheduleId ? String(hw.scheduleId) : '',
      title: hw.title || '',
      description: hw.description || '',
      attachmentUrl: hw.attachmentUrl || '',
      dueDate: formattedDueDate,
    });

    loadClassSchedulesForModal(hw.classId);
    setIsFormModalOpen(true);
  };

  const loadClassSchedulesForModal = async (classId) => {
    try {
      const res = await axiosClient.get(`/Schedules?classId=${classId}`);
      setClassSchedulesForModal(res.data || []);
    } catch (err) {
      console.warn('Lỗi tải buổi học cho modal:', err);
      setClassSchedulesForModal([]);
    }
  };

  const handleFormClassChange = (e) => {
    const classId = e.target.value;
    setFormData((prev) => ({ ...prev, classId, scheduleId: '' }));
    if (classId) {
      loadClassSchedulesForModal(classId);
    } else {
      setClassSchedulesForModal([]);
    }
  };

  // Nút phím nhanh hạn nộp
  const handleSetQuickDueDate = (type) => {
    const now = new Date();
    if (type === 'plus2days') {
      now.setDate(now.getDate() + 2);
      now.setHours(21, 0, 0, 0);
    } else if (type === 'nextSunday') {
      const currentDay = now.getDay();
      const distance = (7 - currentDay) % 7 || 7;
      now.setDate(now.getDate() + distance);
      now.setHours(21, 0, 0, 0);
    }

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setFormData((prev) => ({ ...prev, dueDate: `${y}-${m}-${d}T${h}:${min}` }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Tiêu đề bài tập là bắt buộc.');
      return;
    }

    if (!editingHomework && !formData.classId) {
      setFormError('Vui lòng chọn lớp học áp dụng.');
      return;
    }

    setFormSubmitting(true);

    try {
      const payload = {
        scheduleId: formData.scheduleId ? Number(formData.scheduleId) : null,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        attachmentUrl: formData.attachmentUrl?.trim() || null,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      };

      if (editingHomework) {
        // Cập nhật
        await axiosClient.put(`/Homeworks/${editingHomework.id}`, payload);
      } else {
        // Tạo mới
        await axiosClient.post('/Homeworks', {
          ...payload,
          classId: Number(formData.classId),
        });
      }

      setIsFormModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const data = err.response?.data;
      const detail =
        data?.message ||
        (data?.errors ? Object.values(data.errors).flat().join(' ') : '') ||
        'Có lỗi xảy ra khi lưu bài tập.';
      setFormError(detail);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteHomework = async (hw) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa bài tập "${hw.title}"?\nToàn bộ dữ liệu bài nộp của học sinh thuộc bài tập này cũng sẽ bị xóa vĩnh viễn.`
    );
    if (!confirmed) return;

    try {
      await axiosClient.delete(`/Homeworks/${hw.id}`);
      setReloadKey((k) => k + 1);
      if (detailHomeworkId === hw.id) {
        setDetailHomeworkId(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa bài tập.');
    }
  };

  // ==========================================
  // XỬ LÝ DRAWER CHI TIẾT & BÀI NỘP
  // ==========================================
  const handleOpenDetail = (hw) => {
    setDetailHomeworkId(hw.id);
    setDetailHomework(hw);
    setSubmissionTab('all');
    setSubmissionSearch('');
    setGradingError('');
    setGradingSuccess('');
    setStudentSubmitError('');
    setStudentSubmitSuccess('');
    loadSubmissions(hw.id);
  };

  const initGradingState = useCallback((sub) => {
    if (!sub) return;
    setGradingError('');
    setGradingSuccess('');

    // Tách điểm từ feedback nếu đã có định dạng [Điểm: X/10]
    let score = '';
    let feedback = sub.teacherFeedback || '';

    const scoreMatch = feedback.match(/^\[Điểm:\s*([0-9.]+)\/10\]\s*/i);
    if (scoreMatch) {
      score = scoreMatch[1];
      feedback = feedback.replace(/^\[Điểm:\s*[0-9.]+\/10\]\s*/i, '');
    }

    setGradingScore(score);
    setGradingFeedback(feedback);

    // Điền sẵn dữ liệu form học sinh nộp nếu là học sinh
    setStudentSubmissionUrl(sub.submissionUrl || '');
    setStudentNote(sub.studentNote || '');
  }, []);

  const loadSubmissions = useCallback(async (hwId) => {
    setLoadingSubmissions(true);
    setSubmissionError('');
    try {
      const res = await axiosClient.get(`/HomeworkSubmissions?homeworkId=${hwId}`);
      const list = res.data || [];
      setSubmissions(list);

      // Mặc định chọn bài nộp đầu tiên chờ chấm nếu có
      if (list.length > 0) {
        const pendingReview = list.find((s) => s.status === 'Submitted') || list[0];
        setSelectedSubmissionId(pendingReview.id);
        initGradingState(pendingReview);
      } else {
        setSelectedSubmissionId(null);
      }
    } catch (err) {
      setSubmissionError(err.response?.data?.message || 'Không thể tải danh sách bài nộp.');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [initGradingState]);

  // Thay đổi học viên đang chọn trong Split-View
  const handleSelectSubmission = (sub) => {
    setSelectedSubmissionId(sub.id);
    initGradingState(sub);
  };

  // Danh sách bài nộp sau lọc tab & search
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (submissionTab !== 'all' && sub.status !== submissionTab) {
        return false;
      }
      if (submissionSearch.trim()) {
        const q = submissionSearch.trim().toLowerCase();
        const nameMatch = sub.studentName?.toLowerCase().includes(q);
        const idMatch = String(sub.studentId).includes(q);
        if (!nameMatch && !idMatch) return false;
      }
      return true;
    });
  }, [submissions, submissionTab, submissionSearch]);

  const selectedSubmission = useMemo(() => {
    return submissions.find((s) => s.id === selectedSubmissionId) || null;
  }, [submissions, selectedSubmissionId]);

  // Thống kê tiến độ bài nộp trong Drawer
  const submissionCounts = useMemo(() => {
    const total = submissions.length;
    const submitted = submissions.filter((s) => s.status === 'Submitted').length;
    const reviewed = submissions.filter((s) => s.status === 'Reviewed').length;
    const pending = submissions.filter((s) => s.status === 'Pending').length;
    return { total, submitted, reviewed, pending };
  }, [submissions]);

  // ==========================================
  // THAO TÁC CHẤM BÀI (TEACHER / STAFF)
  // ==========================================
  const handleReviewSubmission = async (targetStatus = 'Reviewed', moveToNext = false) => {
    if (!selectedSubmission) return;

    setGradingSubmitting(true);
    setGradingError('');
    setGradingSuccess('');

    try {
      let finalFeedback = gradingFeedback.trim();
      if (gradingScore !== '' && !isNaN(gradingScore)) {
        finalFeedback = `[Điểm: ${Number(gradingScore)}/10] ${finalFeedback}`.trim();
      }

      await axiosClient.put(`/HomeworkSubmissions/${selectedSubmission.id}/review`, {
        status: targetStatus,
        teacherFeedback: finalFeedback || null,
      });

      setGradingSuccess(targetStatus === 'Reviewed' ? '✓ Đã lưu kết quả chấm điểm!' : '✓ Đã yêu cầu học sinh làm lại bài!');

      // Cập nhật trực tiếp vào state cục bộ submissions
      const updatedList = submissions.map((s) =>
        s.id === selectedSubmission.id
          ? {
              ...s,
              status: targetStatus,
              teacherFeedback: finalFeedback,
              reviewedAt: new Date().toISOString(),
            }
          : s
      );
      setSubmissions(updatedList);
      setReloadKey((k) => k + 1);

      // Nếu chọn chuyển sang bé tiếp theo
      if (moveToNext) {
        const remainingSubmitted = updatedList.filter((s) => s.status === 'Submitted' && s.id !== selectedSubmission.id);
        if (remainingSubmitted.length > 0) {
          handleSelectSubmission(remainingSubmitted[0]);
        }
      }
    } catch (err) {
      setGradingError(err.response?.data?.message || 'Có lỗi xảy ra khi chấm bài.');
    } finally {
      setGradingSubmitting(false);
    }
  };

  // Hỗ trợ phím tắt Cmd/Ctrl + Enter để Lưu & Sang bé tiếp theo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (detailHomeworkId && canManage && selectedSubmission && !gradingSubmitting) {
          e.preventDefault();
          handleReviewSubmission('Reviewed', true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Mẫu nhận xét nhanh cho giáo viên
  const quickFeedbackTemplates = [
    { label: '🌟 Khen ngợi xuất sắc', text: 'Bé làm bài rất xuất sắc, nét chữ nắn nót, đúng độ cao ô ly và sạch đẹp. Cô khen ngợi bé!' },
    { label: '✏️ Cần nắn nót hơn', text: 'Bé hoàn thành bài đủ số lượng, tuy nhiên cần chú ý viết chậm lại để nét chữ đều và đẹp hơn nhé.' },
    { label: '📐 Sai độ cao nét', text: 'Nét khuyết trên của con hơi cao vượt ô ly quy định. Buổi học tới cô sẽ hướng dẫn con căn góc chuẩn hơn nhé.' },
    { label: '👍 Hoàn thành tốt', text: 'Bài tập làm đúng yêu cầu, câu trả lời rõ ràng. Con tiếp tục phát huy ở các bài sau nhé!' },
  ];

  // ==========================================
  // THAO TÁC NỘP BÀI (STUDENT / PARENT)
  // ==========================================
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    if (!studentSubmissionUrl.trim()) {
      setStudentSubmitError('Vui lòng dán link bài làm hoặc đường dẫn ảnh bài viết.');
      return;
    }

    setStudentSubmitting(true);
    setStudentSubmitError('');
    setStudentSubmitSuccess('');

    try {
      await axiosClient.put(`/HomeworkSubmissions/${selectedSubmission.id}/submit`, {
        submissionUrl: studentSubmissionUrl.trim(),
        studentNote: studentNote.trim() || null,
      });

      setStudentSubmitSuccess('🎉 Nộp bài tập thành công! Cô giáo sẽ chấm điểm và phản hồi sớm cho con.');

      // Cập nhật lại danh sách bài nộp
      const updatedList = submissions.map((s) =>
        s.id === selectedSubmission.id
          ? {
              ...s,
              status: 'Submitted',
              submissionUrl: studentSubmissionUrl.trim(),
              studentNote: studentNote.trim() || null,
              submittedAt: new Date().toISOString(),
            }
          : s
      );
      setSubmissions(updatedList);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setStudentSubmitError(err.response?.data?.message || 'Có lỗi xảy ra khi nộp bài.');
    } finally {
      setStudentSubmitting(false);
    }
  };

  // Helper kiểm tra file là ảnh để hiển thị thumbnail
  const isImageFile = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(url);
  };

  // ==========================================
  // RENDER GIAO DIỆN CHÍNH
  // ==========================================
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Trang & Phân quyền Nút Thao tác */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Quản lý Bài tập về nhà
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              {homeworks.length} bài tập
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Giao bài rèn luyện, theo dõi tiến độ nộp bài và chấm điểm nhận xét sư phạm cho học viên
          </p>
        </div>

        {/* Nút + Giao bài tập: Chỉ hiển thị cho SuperAdmin, BranchManager, Teacher */}
        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer self-start sm:self-auto"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Giao bài tập</span>
          </button>
        )}
      </div>

      {/* 2. Thanh Công Cụ Tìm Kiếm & Lọc Nhanh */}
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
              placeholder="Tìm tiêu đề bài tập, tên lớp..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs md:text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          {/* Lọc theo Lớp học */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => {
                const val = e.target.value;
                setClassFilter(val);
                if (!val) {
                  setSchedules([]);
                  setScheduleFilter('');
                }
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">Tất cả lớp học</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} {c.branchName ? `(${c.branchName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Buổi học (Chỉ hiện khi đã chọn lớp) */}
          <div>
            <select
              value={scheduleFilter}
              disabled={!classFilter}
              onChange={(e) => {
                setScheduleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="">{classFilter ? 'Tất cả buổi học' : 'Chọn lớp trước'}</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.studyDate)} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Tình trạng Hạn nộp & Nút reset */}
          <div className="flex gap-2">
            <select
              value={dueStatusFilter}
              onChange={(e) => {
                setDueStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              <option value="all">Tất cả hạn nộp</option>
              <option value="active">Đang mở / Còn hạn</option>
              <option value="warning">Sắp hết hạn (&lt; 24h)</option>
              <option value="overdue">Đã quá hạn nộp</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setClassFilter('');
                setSchedules([]);
                setScheduleFilter('');
                setDueStatusFilter('all');
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

      {/* 3. Bảng Danh Sách Bài Tập (Desktop Grid) */}
      <div className="hidden md:block w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase font-semibold tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Bài tập &amp; Người giao</th>
                <th scope="col" className="px-4 py-3.5">Lớp &amp; Buổi học</th>
                <th scope="col" className="px-4 py-3.5">Hạn nộp bài</th>
                <th scope="col" className="px-4 py-3.5">Tài liệu đính kèm</th>
                <th scope="col" className="px-4 py-3.5">Tiến độ nộp &amp; Chấm</th>
                <th scope="col" className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách bài tập...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedHomeworks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">📝</span>
                      <p className="text-sm font-medium text-slate-600">Không tìm thấy bài tập nào</p>
                      <p className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc bấm "+ Giao bài tập" để tạo mới</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHomeworks.map((hw) => {
                  const dueInfo = getDueStatus(hw.dueDate);
                  const canEdit = canModifyHomework(hw);
                  const total = hw.totalSubmissions || 0;
                  const reviewed = hw.reviewedCount || 0;
                  const submitted = (hw.submittedCount || 0) - reviewed; // Bài đã nộp nhưng chưa chấm
                  const pending = Math.max(0, total - (hw.submittedCount || 0));

                  const reviewedPct = total > 0 ? (reviewed / total) * 100 : 0;
                  const submittedPct = total > 0 ? (submitted / total) * 100 : 0;

                  return (
                    <tr key={hw.id} className="hover:bg-slate-50/80 transition-colors duration-100">
                      {/* Cột 1: Bài tập & Người giao */}
                      <td className="px-4 py-3">
                        <div
                          onClick={() => handleOpenDetail(hw)}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors max-w-xs truncate"
                          title={hw.title}
                        >
                          {hw.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="font-mono">#HW-{hw.id}</span>
                          <span>•</span>
                          <span>👩‍🏫 {hw.createdByName || 'Giáo viên'}</span>
                          <span>•</span>
                          <span>{formatDate(hw.createdAt)}</span>
                        </div>
                      </td>

                      {/* Cột 2: Lớp học & Buổi học */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-blue-700">{hw.className || '—'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {hw.scheduleId ? `Buổi học #${hw.scheduleId}` : 'Toàn khóa học'}
                          {hw.branchName && ` • ${hw.branchName}`}
                        </div>
                      </td>

                      {/* Cột 3: Hạn nộp bài */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {hw.dueDate ? formatDateTime(hw.dueDate) : 'Không giới hạn'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full border ${dueInfo.badgeClass}`}>
                            {dueInfo.label}
                          </span>
                          {dueInfo.textNote && (
                            <span className="text-[11px] text-slate-500">{dueInfo.textNote}</span>
                          )}
                        </div>
                      </td>

                      {/* Cột 4: Tài liệu đính kèm */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hw.attachmentUrl ? (
                          <a
                            href={hw.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                            title={hw.attachmentUrl}
                          >
                            <span>📎</span>
                            <span className="max-w-[120px] truncate">Xem đề bài</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Cột 5: Tiến độ nộp & chấm */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-900 mb-1">
                          <span>{hw.submittedCount || 0} / {total} đã nộp</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({reviewed} đã chấm)
                          </span>
                        </div>
                        {/* Stacked mini progress bar */}
                        <div className="w-36 h-2 rounded-full bg-slate-100 overflow-hidden flex">
                          <div
                            style={{ width: `${reviewedPct}%` }}
                            className="bg-emerald-500 h-full"
                            title={`${reviewed} bài đã chấm`}
                          />
                          <div
                            style={{ width: `${submittedPct}%` }}
                            className="bg-blue-500 h-full"
                            title={`${submitted} bài chờ chấm`}
                          />
                          <div
                            style={{ width: `${Math.max(0, 100 - reviewedPct - submittedPct)}%` }}
                            className="bg-slate-200 h-full"
                            title={`${pending} bài chưa nộp`}
                          />
                        </div>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(hw)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all cursor-pointer"
                          >
                            <span>👁</span>
                            <span>{canManage ? 'Chấm bài' : 'Chi tiết'}</span>
                          </button>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(hw)}
                                className="p-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                                title="Sửa đề bài"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHomework(hw)}
                                className="p-1.5 text-xs rounded-lg text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                                title="Xóa bài tập"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Thanh Phân Trang Desktop */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 gap-3 text-xs text-slate-600">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-800">
              {filteredHomeworks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredHomeworks.length)}
            </span>{' '}
            trên tổng số <span className="font-semibold text-slate-800">{filteredHomeworks.length}</span> bài tập
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

      {/* 5. Giao diện Thẻ Bài Tập trên Mobile (< 768px) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            <svg className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Đang tải bài tập...</span>
          </div>
        ) : filteredHomeworks.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-semibold text-slate-700 mt-2">Chưa có bài tập nào</p>
          </div>
        ) : (
          filteredHomeworks.map((hw) => {
            const dueInfo = getDueStatus(hw.dueDate);
            const canEdit = canModifyHomework(hw);
            const total = hw.totalSubmissions || 0;
            const reviewed = hw.reviewedCount || 0;
            const submitted = (hw.submittedCount || 0) - reviewed;
            const reviewedPct = total > 0 ? (reviewed / total) * 100 : 0;
            const submittedPct = total > 0 ? (submitted / total) * 100 : 0;

            return (
              <div key={hw.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => handleOpenDetail(hw)}
                      className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer"
                    >
                      {hw.title}
                    </h3>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5">
                      {hw.className} {hw.branchName ? `• ${hw.branchName}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap ${dueInfo.badgeClass}`}>
                    {dueInfo.label}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Hạn nộp:</span>
                    <span className="font-medium text-slate-900">
                      {hw.dueDate ? formatDateTime(hw.dueDate) : 'Không giới hạn'}
                    </span>
                  </div>
                  {hw.attachmentUrl && (
                    <div className="flex justify-between items-center">
                      <span>Đề bài:</span>
                      <a
                        href={hw.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        📎 Xem tài liệu
                      </a>
                    </div>
                  )}
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span>Tiến độ: {hw.submittedCount || 0}/{total} đã nộp</span>
                      <span>({reviewed} đã chấm)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                      <div style={{ width: `${reviewedPct}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${submittedPct}%` }} className="bg-blue-500 h-full" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(hw)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>👁</span>
                    <span>{canManage ? 'Chấm bài tập' : 'Xem đề & Nộp bài'}</span>
                  </button>

                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(hw)}
                        className="min-h-[44px] px-3.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all"
                        title="Sửa"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHomework(hw)}
                        className="min-h-[44px] px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ==========================================
          6. MODAL GIAO / SỬA BÀI TẬP VỀ NHÀ
          ========================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !formSubmitting && setIsFormModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900">
                  {editingHomework ? 'Cập nhật bài tập về nhà' : '📝 Giao bài tập về nhà mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bài tập sẽ được tự động giao cho tất cả học viên đang học trong lớp
                </p>
              </div>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Lớp học áp dụng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lớp học áp dụng <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={!!editingHomework}
                  value={formData.classId}
                  onChange={handleFormClassChange}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 disabled:bg-slate-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} {c.branchName ? `(${c.branchName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buổi học liên kết */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buổi học liên kết <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <select
                  value={formData.scheduleId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduleId: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  <option value="">-- Toàn khóa học (Không gắn buổi riêng) --</option>
                  {classSchedulesForModal.map((s) => (
                    <option key={s.id} value={s.id}>
                      Buổi ngày {formatDate(s.studyDate)} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  ℹ️ Gắn bài tập vào buổi học cụ thể giúp phụ huynh theo dõi sát lộ trình từng ngày.
                </p>
              </div>

              {/* Tiêu đề bài tập */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề bài tập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Luyện nét khuyết trên & dưới - Vở thực hành Trang 12-14"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {/* Hạn nộp bài */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Hạn nộp bài <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickDueDate('plus2days')}
                      className="text-[11px] text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                    >
                      ⚡ +2 ngày (21:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDueDate('nextSunday')}
                      className="text-[11px] text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                    >
                      ⚡ Tối Chủ Nhật
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {/* Link tài liệu đính kèm */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn tài liệu / Đề bài đính kèm <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/... hoặc link tải ảnh/PDF bài mẫu"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hỗ trợ link Google Drive, OneDrive, Zalo hoặc tài liệu bài giảng trực tuyến.
                </p>
              </div>

              {/* Hướng dẫn chi tiết */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung hướng dẫn &amp; Đề bài chi tiết
                </label>
                <textarea
                  rows={4}
                  placeholder="Ghi chú yêu cầu làm bài, lưu ý tư thế ngồi, điểm dừng bút hoặc lời nhắn gửi phụ huynh..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              {!editingHomework && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
                  <span className="text-base">ℹ️</span>
                  <span>
                    <strong>Tự động khởi tạo:</strong> Khi bấm &quot;Giao bài tập&quot;, hệ thống sẽ tự động tạo danh sách nộp bài cho mọi học viên đang học trong lớp với trạng thái &quot;Chưa nộp&quot;.
                  </span>
                </div>
              )}

              {/* Nút hành động */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting ? 'Đang lưu...' : editingHomework ? 'Lưu thay đổi' : '✓ Giao bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          7. DRAWER / MODAL CHI TIẾT BÀI TẬP & CHẤM BÀI / NỘP BÀI
          ======================================================== */}
      {detailHomeworkId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
            onClick={() => setDetailHomeworkId(null)}
            aria-hidden="true"
          />

          <div className="relative w-full md:max-w-6xl h-full md:h-[92vh] rounded-none md:rounded-2xl bg-white shadow-2xl z-10 flex flex-col overflow-hidden">
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDetailHomeworkId(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                  title="Đóng"
                >
                  ← Quay lại
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #HW-{detailHomework?.id}
                    </span>
                    <h2 className="text-base md:text-lg font-bold text-slate-900">
                      {detailHomework?.title}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-blue-700">{detailHomework?.className}</span>
                    <span>•</span>
                    <span>
                      Hạn nộp: {detailHomework?.dueDate ? formatDateTime(detailHomework.dueDate) : 'Không giới hạn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => setDetailHomeworkId(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nội dung đề bài tóm tắt */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-[280px]">
                <p className="text-slate-700">
                  <strong>Hướng dẫn:</strong> {detailHomework?.description || 'Làm bài và chụp ảnh gửi lên hệ thống đúng hạn.'}
                </p>
              </div>
              {detailHomework?.attachmentUrl && (
                <a
                  href={detailHomework.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 border border-blue-200"
                >
                  <span>📎</span>
                  <span>Mở tài liệu đề bài</span>
                </a>
              )}
            </div>

            {/* Thống kê tiến độ nộp bài */}
            {canManage && (
              <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <span>Tổng: <strong>{submissionCounts.total}</strong> học viên</span>
                  <span className="text-amber-700">Chờ chấm: <strong>{submissionCounts.submitted}</strong></span>
                  <span className="text-emerald-700">Đã chấm: <strong>{submissionCounts.reviewed}</strong></span>
                  <span className="text-slate-500">Chưa nộp: <strong>{submissionCounts.pending}</strong></span>
                </div>

                {/* Filter tab */}
                <div className="inline-flex rounded-lg bg-slate-200 p-0.5 text-xs font-medium text-slate-600">
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('all')}
                    className={`px-2.5 py-1 rounded-md transition-all ${submissionTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                  >
                    Tất cả ({submissionCounts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('Submitted')}
                    className={`px-2.5 py-1 rounded-md transition-all ${submissionTab === 'Submitted' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                  >
                    Chờ chấm ({submissionCounts.submitted})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('Reviewed')}
                    className={`px-2.5 py-1 rounded-md transition-all ${submissionTab === 'Reviewed' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                  >
                    Đã chấm ({submissionCounts.reviewed})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('Pending')}
                    className={`px-2.5 py-1 rounded-md transition-all ${submissionTab === 'Pending' ? 'bg-white text-slate-700 shadow-xs font-semibold' : 'hover:text-slate-900'}`}
                  >
                    Chưa nộp ({submissionCounts.pending})
                  </button>
                </div>
              </div>
            )}

            {/* THÂN DRAWER: SPLIT-VIEW (CHO STAFF) HOẶC SINGLE-VIEW (CHO PARENT/STUDENT) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
              {loadingSubmissions ? (
                <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
                  <svg className="h-6 w-6 animate-spin text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Đang tải danh sách bài nộp...</span>
                </div>
              ) : submissionError ? (
                <div className="flex-1 p-6 text-center text-rose-600 text-sm">
                  ⚠️ {submissionError}
                </div>
              ) : canManage ? (
                /* ========================================================
                   SPLIT-VIEW CHO GIÁO VIÊN / QUẢN LÝ
                   ======================================================== */
                <>
                  {/* Cột trái: Danh sách học viên nộp bài */}
                  <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
                    {/* Ô tìm học viên */}
                    <div className="p-3 border-b border-slate-200 bg-white">
                      <input
                        type="text"
                        placeholder="Tìm học viên trong lớp..."
                        value={submissionSearch}
                        onChange={(e) => setSubmissionSearch(e.target.value)}
                        className="w-full h-8 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* Danh sách thẻ */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                      {filteredSubmissions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Không có bài nộp nào phù hợp
                        </div>
                      ) : (
                        filteredSubmissions.map((sub) => {
                          const isActive = sub.id === selectedSubmissionId;
                          let statusBadge = (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Chưa nộp
                            </span>
                          );
                          if (sub.status === 'Submitted') {
                            statusBadge = (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold animate-pulse">
                                📥 Chờ chấm
                              </span>
                            );
                          } else if (sub.status === 'Reviewed') {
                            statusBadge = (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                ✓ Đã chấm
                              </span>
                            );
                          }

                          return (
                            <div
                              key={sub.id}
                              onClick={() => handleSelectSubmission(sub)}
                              className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-2 ${
                                isActive
                                  ? 'bg-blue-50/80 border-l-4 border-blue-600 pl-2.5 shadow-2xs'
                                  : 'hover:bg-slate-100/70 bg-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs md:text-sm text-slate-900 truncate">
                                  {sub.studentName}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  #{sub.studentId}
                                  {sub.submittedAt && ` • ${formatDateTime(sub.submittedAt)}`}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                {statusBadge}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Khung Chấm Bài & Phản Hồi */}
                  <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 bg-white">
                    {selectedSubmission ? (
                      <div className="space-y-6 max-w-2xl">
                        {/* Thông tin học viên */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Chi tiết bài nộp của học viên
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                              {selectedSubmission.studentName} <span className="text-xs font-mono text-slate-400 font-normal">#STU-{selectedSubmission.studentId}</span>
                            </h3>
                          </div>
                          <div>
                            {selectedSubmission.status === 'Reviewed' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                                ✓ Đã chấm điểm
                              </span>
                            ) : selectedSubmission.status === 'Submitted' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                                📥 Đã nộp bài (Chờ cô chấm)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                                ⏳ Chưa nộp bài
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Lời nhắn của học sinh / phụ huynh nếu có */}
                        {selectedSubmission.studentNote && (
                          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs text-amber-900">
                            <strong>💬 Lời nhắn từ phụ huynh / học sinh:</strong>
                            <p className="mt-1 italic">&quot;{selectedSubmission.studentNote}&quot;</p>
                          </div>
                        )}

                        {/* Xem bài làm */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">
                            📎 Bài làm học viên nộp:
                          </label>

                          {selectedSubmission.submissionUrl ? (
                            <div className="space-y-2">
                              {isImageFile(selectedSubmission.submissionUrl) ? (
                                <div className="relative group max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                                  <img
                                    src={selectedSubmission.submissionUrl}
                                    alt="Bài làm học sinh"
                                    className="w-full max-h-64 object-contain"
                                  />
                                  <div
                                    onClick={() => setLightboxImage(selectedSubmission.submissionUrl)}
                                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity cursor-pointer"
                                  >
                                    🔍 Bấm để phóng to xem rõ nét
                                  </div>
                                </div>
                              ) : null}

                              <div className="flex items-center gap-2">
                                <a
                                  href={selectedSubmission.submissionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 border border-blue-200"
                                >
                                  <span>🔗</span>
                                  <span>Mở link bài làm trực tiếp</span>
                                </a>
                                <span className="text-xs text-slate-400 font-mono max-w-xs truncate">
                                  {selectedSubmission.submissionUrl}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                              Học viên này chưa nộp link hoặc ảnh bài làm.
                            </div>
                          )}
                        </div>

                        {/* Khung chấm điểm & nhận xét của giáo viên */}
                        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                              <span>👩‍🏫</span>
                              <span>Giáo viên chấm bài &amp; Nhận xét sư phạm</span>
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              Phím tắt: Ctrl + Enter để lưu
                            </span>
                          </div>

                          {gradingError && (
                            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                              {gradingError}
                            </div>
                          )}

                          {gradingSuccess && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                              {gradingSuccess}
                            </div>
                          )}

                          {/* Nhập điểm số */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-semibold text-slate-700">
                                Điểm số đánh giá (Thang điểm 10):
                              </label>
                              <div className="flex gap-1">
                                {[10, 9.5, 9, 8.5, 8].map((scoreVal) => (
                                  <button
                                    key={scoreVal}
                                    type="button"
                                    onClick={() => setGradingScore(String(scoreVal))}
                                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-blue-50 hover:text-blue-600 text-slate-700"
                                  >
                                    ⚡ {scoreVal}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              placeholder="Nhập điểm (0.0 - 10.0)"
                              value={gradingScore}
                              onChange={(e) => setGradingScore(e.target.value)}
                              className="w-32 h-10 rounded-lg border border-slate-300 bg-white px-3 font-mono font-bold text-center text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                            />
                          </div>

                          {/* Nhập nhận xét */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-semibold text-slate-700">
                                Lời nhận xét sư phạm của cô:
                              </label>
                              <span className="text-[11px] text-slate-400">
                                {gradingFeedback.length} / 1000 ký tự
                              </span>
                            </div>
                            <textarea
                              rows={4}
                              maxLength={1000}
                              placeholder="Nhận xét ưu điểm, điểm cần rèn thêm và lời động viên bé..."
                              value={gradingFeedback}
                              onChange={(e) => setGradingFeedback(e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs md:text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                            />
                            {/* Mẫu nhận xét nhanh */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {quickFeedbackTemplates.map((t, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setGradingFeedback(t.text)}
                                  className="text-[11px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Nút hành động chấm bài */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-100">
                            <button
                              type="button"
                              disabled={gradingSubmitting}
                              onClick={() => handleReviewSubmission('Pending', false)}
                              className="px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all"
                            >
                              Yêu cầu nộp lại bài
                            </button>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={gradingSubmitting}
                                onClick={() => handleReviewSubmission('Reviewed', false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                              >
                                Lưu điểm
                              </button>
                              <button
                                type="button"
                                disabled={gradingSubmitting}
                                onClick={() => handleReviewSubmission('Reviewed', true)}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer"
                              >
                                <span>✓ Lưu &amp; Sang bé tiếp theo</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                        Chọn một học viên từ danh sách bên trái để chấm bài
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ========================================================
                   SINGLE-VIEW CHO HỌC SINH / PHỤ HUYNH
                   (Bảo mật: Tuyệt đối không hiển thị học sinh khác)
                   ======================================================== */
                <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6 overflow-y-auto">
                  {submissions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Không tìm thấy thông tin bài tập của con trong lớp này.
                    </div>
                  ) : (
                    submissions.map((mySub) => {
                      const isReviewed = mySub.status === 'Reviewed';
                      const isSubmitted = mySub.status === 'Submitted';

                      return (
                        <div key={mySub.id} className="space-y-6">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Hồ sơ nộp bài</span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              Học viên: {mySub.studentName} <span className="font-mono text-xs text-slate-400">#STU-{mySub.studentId}</span>
                            </h3>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span>Trạng thái:</span>
                              {isReviewed ? (
                                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  ✓ Đã chấm điểm
                                </span>
                              ) : isSubmitted ? (
                                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                  📥 Đã nộp bài (Đang chờ cô chấm)
                                </span>
                              ) : (
                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  ⏳ Chưa nộp bài
                                </span>
                              )}
                            </div>
                          </div>

                          {/* KẾT QUẢ NẾU ĐÃ CHẤM */}
                          {isReviewed && (
                            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-5 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                                  <span>🌟</span>
                                  <span>KẾT QUẢ ĐÁNH GIÁ CỦA CÔ GIÁO</span>
                                </h4>
                                <span className="text-[11px] text-slate-500">
                                  {formatDateTime(mySub.reviewedAt)}
                                </span>
                              </div>

                              <div className="rounded-xl bg-white p-4 border border-emerald-200 text-xs md:text-sm text-slate-800 leading-relaxed">
                                {mySub.teacherFeedback || 'Cô đã xem bài làm của con và đánh giá tốt!'}
                              </div>
                            </div>
                          )}

                          {/* FORM NỘP BÀI TẬP */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>📤</span>
                              <span>{isSubmitted ? 'Cập nhật lại bài nộp' : 'Nộp bài tập cho cô'}</span>
                            </h4>

                            {studentSubmitError && (
                              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                                {studentSubmitError}
                              </div>
                            )}

                            {studentSubmitSuccess && (
                              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                                {studentSubmitSuccess}
                              </div>
                            )}

                            <form onSubmit={handleStudentSubmit} className="space-y-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Đường dẫn bài làm / Link ảnh chụp bài viết <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="url"
                                  required
                                  placeholder="https://drive.google.com/file/... hoặc link ảnh Zalo/Cloud"
                                  value={studentSubmissionUrl}
                                  onChange={(e) => setStudentSubmissionUrl(e.target.value)}
                                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs md:text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                  ℹ️ Ba mẹ tải ảnh bài làm của bé lên Google Drive / Zalo rồi dán đường dẫn vào đây nhé!
                                </p>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Lời nhắn gửi cô giáo (Tùy chọn)
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Bé hôm nay tự giác ngồi viết bài rất chăm chỉ, ba mẹ gửi cô chấm giúp bé ạ..."
                                  value={studentNote}
                                  onChange={(e) => setStudentNote(e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs md:text-sm text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={studentSubmitting}
                                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white text-xs md:text-sm font-bold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer"
                              >
                                {studentSubmitting ? 'Đang gửi bài...' : '📤 Gửi bài tập'}
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          8. LIGHTBOX PHÓNG TO ẢNH BÀI LÀM
          ========================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={lightboxImage}
              alt="Ảnh bài làm phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-xs mt-3 opacity-70">
              Nhấp bất kỳ đâu để đóng lại
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
