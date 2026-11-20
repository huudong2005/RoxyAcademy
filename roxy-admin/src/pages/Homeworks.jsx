import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  SelectPill,
  CustomSelect,
  Badge,
} from '../components/ui';

export default function Homeworks() {
  // 1. Phân quyền người dùng hiện tại
  const [currentUser] = useState(() => getStoredUser());

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
  const [deleteError, setDeleteError] = useState('');
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

  // Helper lấy điểm số của bài nộp (ưu tiên sub.score, fallback parse từ teacherFeedback)
  const getSubmissionScore = (sub) => {
    if (!sub) return null;
    if (sub.score !== undefined && sub.score !== null && sub.score !== '') {
      const num = Number(sub.score);
      return isNaN(num) ? null : num;
    }
    if (sub.teacherFeedback) {
      const match = sub.teacherFeedback.match(/^\[Điểm:\s*([0-9.]+)\/10\]/i);
      if (match) {
        const num = Number(match[1]);
        return isNaN(num) ? null : num;
      }
    }
    return null;
  };

  // Helper xóa tiền tố [Điểm: ...] để hiển thị lời nhận xét sạch đẹp
  const getCleanFeedback = (feedback) => {
    if (!feedback) return '';
    return feedback.replace(/^\[Điểm:\s*[0-9.]+\/10\]\s*/i, '').trim();
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

  const [confirmModal, setConfirmModal] = useState(null);

  const handleDeleteHomework = (hw) => {
    setConfirmModal({
      mode: 'confirm',
      title: 'Xác nhận xóa bài tập',
      message: `Bạn có chắc chắn muốn xóa bài tập "${hw.title}"?\nToàn bộ dữ liệu bài nộp của học sinh thuộc bài tập này cũng sẽ bị xóa vĩnh viễn.`,
      onConfirm: async () => {
        setDeleteError('');
        try {
          await axiosClient.delete(`/Homeworks/${hw.id}`);
          setReloadKey((k) => k + 1);
          if (detailHomeworkId === hw.id) {
            setDetailHomeworkId(null);
          }
        } catch (err) {
          const status = err.response?.status;
          const serverMsg = err.response?.data?.message;
          const msg =
            serverMsg ||
            (status === 409 || status === 400
              ? 'Không thể xóa bài tập vì đã có bài nộp được chấm điểm.'
              : 'Không thể xóa bài tập. Vui lòng thử lại.');
          setDeleteError(msg);
        }
      },
    });
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

    // Tách điểm từ feedback nếu đã có định dạng [Điểm: X/10] hoặc từ trường score
    let score = '';
    let feedback = sub.teacherFeedback || '';

    const scoreMatch = feedback.match(/^\[Điểm:\s*([0-9.]+)\/10\]\s*/i);
    if (scoreMatch) {
      score = scoreMatch[1];
      feedback = feedback.replace(/^\[Điểm:\s*[0-9.]+\/10\]\s*/i, '');
    }

    if (sub.score !== undefined && sub.score !== null && sub.score !== '') {
      score = String(sub.score);
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

    if (selectedSubmission.status !== 'Submitted') {
      setGradingError(
        selectedSubmission.status === 'Pending'
          ? 'Học viên chưa nộp bài nên chưa thể chấm điểm.'
          : 'Chỉ có thể chấm bài nộp đang ở trạng thái Chờ chấm (Đã nộp).'
      );
      return;
    }

    // Validate điểm số nếu có nhập (cho phép để trống: null = chỉ nhận xét)
    const rawScore = gradingScore !== null && gradingScore !== undefined ? String(gradingScore).trim() : '';
    let parsedScore = null;

    if (rawScore !== '') {
      const num = Number(rawScore);
      if (isNaN(num) || num < 0 || num > 10) {
        setGradingError('Điểm số phải là số từ 0 đến 10 hoặc để trống nếu chỉ nhận xét.');
        return;
      }
      const decimalParts = rawScore.split('.');
      if (decimalParts.length > 1 && decimalParts[1].length > 1) {
        setGradingError('Điểm số chỉ nhận tối đa 1 chữ số thập phân (bước nhảy 0.1).');
        return;
      }
      parsedScore = num;
    }

    setGradingSubmitting(true);
    setGradingError('');
    setGradingSuccess('');

    try {
      let finalFeedback = gradingFeedback.trim();
      if (parsedScore !== null) {
        finalFeedback = `[Điểm: ${parsedScore}/10] ${finalFeedback}`.trim();
      }

      const scorePayload = rawScore === '' ? null : Number(rawScore);

      await axiosClient.put(`/HomeworkSubmissions/${selectedSubmission.id}/review`, {
        status: targetStatus,
        score: scorePayload,
        teacherFeedback: finalFeedback || null,
      });

      setGradingSuccess(targetStatus === 'Reviewed' ? '✓ Đã lưu kết quả chấm điểm!' : '✓ Đã yêu cầu học sinh làm lại bài!');

      // Cập nhật trực tiếp vào state cục bộ submissions
      const updatedList = submissions.map((s) =>
        s.id === selectedSubmission.id
          ? {
              ...s,
              status: targetStatus,
              score: scorePayload,
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
        if (
          detailHomeworkId &&
          canManage &&
          selectedSubmission &&
          selectedSubmission.status === 'Submitted' &&
          !gradingSubmitting
        ) {
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
      const res = await axiosClient.put(`/HomeworkSubmissions/${selectedSubmission.id}/submit`, {
        submissionUrl: studentSubmissionUrl.trim(),
        studentNote: studentNote.trim() || null,
      });

      setStudentSubmitSuccess('🎉 Nộp bài tập thành công! Cô giáo sẽ chấm điểm và phản hồi sớm cho con.');

      // Cập nhật lại danh sách bài nộp (GIỮ NGUYÊN điểm cũ & lời phê cũ cho tới khi giáo viên chấm lại)
      const updatedList = submissions.map((s) =>
        s.id === selectedSubmission.id
          ? {
              ...s,
              status: 'Submitted',
              submissionUrl: studentSubmissionUrl.trim(),
              studentNote: studentNote.trim() || null,
              submittedAt: new Date().toISOString(),
              score: res.data?.score !== undefined ? res.data.score : s.score,
              teacherFeedback:
                res.data?.teacherFeedback !== undefined ? res.data.teacherFeedback : s.teacherFeedback,
              reviewedAt: res.data?.reviewedAt !== undefined ? res.data.reviewedAt : s.reviewedAt,
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
      <PageHeader
        eyebrow="Học tập & Rèn luyện"
        title={
          <span className="inline-flex flex-wrap items-center gap-2.5">
            <span>Quản lý Bài tập về nhà</span>
            <Badge variant="gold">{homeworks.length} bài tập</Badge>
          </span>
        }
        description="Giao bài rèn luyện, theo dõi tiến độ nộp bài và chấm điểm nhận xét sư phạm cho học viên"
        actions={
          canManage && (
            <PrimaryButton type="button" onClick={handleOpenCreateModal}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Giao bài tập</span>
            </PrimaryButton>
          )
        }
      />

      {deleteError && (
        <div
          role="alert"
          className="rounded-card border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError('')}
            aria-label="Đóng thông báo lỗi"
            className="shrink-0 text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Thanh Công Cụ Tìm Kiếm & Lọc Nhanh */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Ô Tìm kiếm */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <InputPill
              type="text"
              placeholder="Tìm tiêu đề bài tập, tên lớp..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="!h-10 !pl-9 !py-0"
            />
          </div>

          {/* Lọc theo Lớp học */}
          <div>
            <CustomSelect
              value={classFilter}
              aria-label="Lọc theo lớp học"
              onChange={(val) => {
                setClassFilter(val);
                if (!val) {
                  setSchedules([]);
                  setScheduleFilter('');
                }
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: 'Tất cả lớp học' },
                ...classes.map((c) => ({
                  value: String(c.id),
                  label: `${c.className}${c.branchName ? ` (${c.branchName})` : ''}`,
                })),
              ]}
            />
          </div>

          {/* Lọc theo Buổi học (Chỉ hiện khi đã chọn lớp) */}
          <div>
            <CustomSelect
              value={scheduleFilter}
              disabled={!classFilter}
              aria-label="Lọc theo buổi học"
              onChange={(v) => {
                setScheduleFilter(v);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: classFilter ? 'Tất cả buổi học' : 'Chọn lớp trước' },
                ...schedules.map((s) => ({
                  value: String(s.id),
                  label: `${formatDate(s.studyDate)} (${s.startTime?.slice(0, 5)} - ${s.endTime?.slice(0, 5)})`,
                })),
              ]}
            />
          </div>

          {/* Lọc theo Tình trạng Hạn nộp & Nút reset */}
          <div className="flex gap-2">
            <CustomSelect
              value={dueStatusFilter}
              aria-label="Lọc theo tình trạng hạn nộp"
              onChange={(v) => {
                setDueStatusFilter(v);
                setCurrentPage(1);
              }}
              wrapperClassName="flex-1 min-w-0"
              options={[
                { value: 'all', label: 'Tất cả hạn nộp' },
                { value: 'active', label: 'Đang mở / Còn hạn' },
                { value: 'warning', label: 'Sắp hết hạn (< 24h)' },
                { value: 'overdue', label: 'Đã quá hạn nộp' },
              ]}
            />

            <SecondaryButton
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
              className="!h-10 !px-4 !text-xs whitespace-nowrap"
            >
              Đặt lại
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="rounded-card bg-rose-50 border border-rose-200 p-4 text-xs md:text-sm text-rose-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. Bảng Danh Sách Bài Tập (Desktop Grid) */}
      <Card className="hidden md:block w-full overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full divide-y divide-line/60 text-left text-xs md:text-sm">
            <thead className="border-b border-line bg-surface-subtle text-[11px] uppercase font-semibold tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3.5">Bài tập &amp; Người giao</th>
                <th scope="col" className="px-4 py-3.5">Lớp &amp; Buổi học</th>
                <th scope="col" className="px-4 py-3.5">Hạn nộp bài</th>
                <th scope="col" className="px-4 py-3.5">Tài liệu đính kèm</th>
                <th scope="col" className="px-4 py-3.5">Tiến độ nộp &amp; Chấm</th>
                <th scope="col" className="px-4 py-3.5 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-ink-muted">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách bài tập...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedHomeworks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-ink-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">📝</span>
                      <p className="text-sm font-medium text-ink">Không tìm thấy bài tập nào</p>
                      <p className="text-xs text-ink-muted">Thử thay đổi bộ lọc hoặc bấm &quot;Giao bài tập&quot; để tạo mới</p>
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
                    <tr key={hw.id} className="hover:bg-mint-canvas/60 transition-colors duration-100">
                      {/* Cột 1: Bài tập & Người giao */}
                      <td className="px-4 py-3">
                        <div
                          onClick={() => handleOpenDetail(hw)}
                          className="font-bold text-ink hover:text-teal cursor-pointer transition-colors max-w-xs truncate"
                          title={hw.title}
                        >
                          {hw.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-muted">
                          <span className="font-mono">#HW-{hw.id}</span>
                          <span>•</span>
                          <span>👩‍🏫 {hw.createdByName || 'Giáo viên'}</span>
                          <span>•</span>
                          <span>{formatDate(hw.createdAt)}</span>
                        </div>
                      </td>

                      {/* Cột 2: Lớp học & Buổi học */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-teal">{hw.className || '—'}</div>
                        <div className="text-[11px] text-ink-secondary mt-0.5">
                          {hw.scheduleId ? `Buổi học #${hw.scheduleId}` : 'Toàn khóa học'}
                          {hw.branchName && ` • ${hw.branchName}`}
                        </div>
                      </td>

                      {/* Cột 3: Hạn nộp bài */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-ink">
                          {hw.dueDate ? formatDateTime(hw.dueDate) : 'Không giới hạn'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full border ${dueInfo.badgeClass}`}>
                            {dueInfo.label}
                          </span>
                          {dueInfo.textNote && (
                            <span className="text-[11px] text-ink-secondary">{dueInfo.textNote}</span>
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
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline bg-gold-soft/70 hover:bg-gold-soft px-3 py-1 rounded-full border border-gold/40"
                            title={hw.attachmentUrl}
                          >
                            <span>📎</span>
                            <span className="max-w-[120px] truncate">Xem đề bài</span>
                          </a>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>

                      {/* Cột 5: Tiến độ nộp & chấm */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-ink mb-1">
                          <span>{hw.submittedCount || 0} / {total} đã nộp</span>
                          <span className="text-[11px] text-ink-secondary font-normal">
                            ({reviewed} đã chấm)
                          </span>
                        </div>
                        {/* Stacked mini progress bar */}
                        <div className="w-36 h-2 rounded-full bg-surface-subtle overflow-hidden flex">
                          <div
                            style={{ width: `${reviewedPct}%` }}
                            className="bg-emerald-500 h-full"
                            title={`${reviewed} bài đã chấm`}
                          />
                          <div
                            style={{ width: `${submittedPct}%` }}
                            className="bg-gold h-full"
                            title={`${submitted} bài chờ chấm`}
                          />
                          <div
                            style={{ width: `${Math.max(0, 100 - reviewedPct - submittedPct)}%` }}
                            className="bg-line/60 h-full"
                            title={`${pending} bài chưa nộp`}
                          />
                        </div>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <IconButton
                            variant="neutral"
                            onClick={() => handleOpenDetail(hw)}
                            title={canManage ? 'Chấm bài' : 'Chi tiết'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </IconButton>

                          {canEdit && (
                            <>
                              <IconButton
                                variant="neutral"
                                onClick={() => handleOpenEditModal(hw)}
                                title="Sửa đề bài"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                              </IconButton>
                              <IconButton
                                variant="danger"
                                onClick={() => handleDeleteHomework(hw)}
                                title="Xóa bài tập"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </IconButton>
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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-line bg-surface-subtle px-4 py-3 gap-3 text-xs text-ink-secondary">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-ink">
              {filteredHomeworks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-ink">
              {Math.min(currentPage * pageSize, filteredHomeworks.length)}
            </span>{' '}
            trên tổng số <span className="font-semibold text-ink">{filteredHomeworks.length}</span> bài tập
          </div>

          <div className="flex items-center gap-1.5">
            <SecondaryButton
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="!px-3.5 !py-1.5 !text-xs"
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
              className="!px-3.5 !py-1.5 !text-xs"
            >
              Sau
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {/* 5. Giao diện Thẻ Bài Tập trên Mobile (< 768px) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <Card className="p-8 text-center text-ink-muted">
            <svg className="h-6 w-6 animate-spin mx-auto text-teal mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Đang tải bài tập...</span>
          </Card>
        ) : filteredHomeworks.length === 0 ? (
          <Card className="p-8 text-center text-ink-muted">
            <span className="text-3xl">📝</span>
            <p className="text-sm font-semibold text-ink mt-2">Chưa có bài tập nào</p>
          </Card>
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
              <Card key={hw.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => handleOpenDetail(hw)}
                      className="font-bold text-ink text-sm hover:text-teal cursor-pointer"
                    >
                      {hw.title}
                    </h3>
                    <p className="text-xs text-teal font-semibold mt-0.5">
                      {hw.className} {hw.branchName ? `• ${hw.branchName}` : ''}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap ${dueInfo.badgeClass}`}>
                    {dueInfo.label}
                  </span>
                </div>

                <div className="rounded-xl bg-surface-subtle p-2.5 text-xs space-y-1.5 text-ink-secondary">
                  <div className="flex justify-between">
                    <span>Hạn nộp:</span>
                    <span className="font-medium text-ink">
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
                        className="text-teal font-semibold hover:underline"
                      >
                        📎 Xem tài liệu
                      </a>
                    </div>
                  )}
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-ink mb-1">
                      <span>Tiến độ: {hw.submittedCount || 0}/{total} đã nộp</span>
                      <span>({reviewed} đã chấm)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-line/60 overflow-hidden flex">
                      <div style={{ width: `${reviewedPct}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${submittedPct}%` }} className="bg-gold h-full" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <PrimaryButton
                    type="button"
                    onClick={() => handleOpenDetail(hw)}
                    className="flex-1 min-h-[44px] !text-xs"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{canManage ? 'Chấm bài tập' : 'Xem đề & Nộp bài'}</span>
                  </PrimaryButton>

                  {canEdit && (
                    <>
                      <SecondaryButton
                        type="button"
                        onClick={() => handleOpenEditModal(hw)}
                        className="min-h-[44px] !px-3.5 !text-xs"
                        title="Sửa"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        <span>Sửa</span>
                      </SecondaryButton>
                      <button
                        type="button"
                        onClick={() => handleDeleteHomework(hw)}
                        className="min-h-[44px] px-3 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer"
                        title="Xóa"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </Card>
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
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !formSubmitting && setIsFormModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-xl rounded-card-lg bg-surface border border-line/60 p-6 shadow-modal modal-panel max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line/60 pb-3.5 mb-4">
              <div>
                <h3 className="text-base md:text-lg font-bold text-ink">
                  {editingHomework ? 'Cập nhật bài tập về nhà' : '📝 Giao bài tập về nhà mới'}
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Bài tập sẽ được tự động giao cho tất cả học viên đang học trong lớp
                </p>
              </div>
              <IconButton
                variant="neutral"
                disabled={formSubmitting}
                onClick={() => setIsFormModalOpen(false)}
                title="Đóng"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs md:text-sm">
              {/* Lớp học áp dụng */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Lớp học áp dụng <span className="text-rose-500">*</span>
                </label>
                <SelectPill
                  disabled={!!editingHomework}
                  value={formData.classId}
                  onChange={handleFormClassChange}
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className} {c.branchName ? `(${c.branchName})` : ''}
                    </option>
                  ))}
                </SelectPill>
              </div>

              {/* Buổi học liên kết */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Buổi học liên kết <span className="text-ink-muted font-normal">(Tùy chọn)</span>
                </label>
                <SelectPill
                  value={formData.scheduleId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduleId: e.target.value }))}
                >
                  <option value="">-- Toàn khóa học (Không gắn buổi riêng) --</option>
                  {classSchedulesForModal.map((s) => (
                    <option key={s.id} value={s.id}>
                      Buổi ngày {formatDate(s.studyDate)} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})
                    </option>
                  ))}
                </SelectPill>
                <p className="text-[11px] text-ink-muted mt-1">
                  ℹ️ Gắn bài tập vào buổi học cụ thể giúp phụ huynh theo dõi sát lộ trình từng ngày.
                </p>
              </div>

              {/* Tiêu đề bài tập */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Tiêu đề bài tập <span className="text-rose-500">*</span>
                </label>
                <InputPill
                  type="text"
                  required
                  placeholder="VD: Luyện nét khuyết trên & dưới - Vở thực hành Trang 12-14"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="!h-10 !py-0"
                />
              </div>

              {/* Hạn nộp bài */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-ink">
                    Hạn nộp bài <span className="text-ink-muted font-normal">(Tùy chọn)</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickDueDate('plus2days')}
                      className="text-[11px] font-medium text-teal bg-gold-soft/70 border border-gold/40 hover:bg-gold-soft px-2.5 py-0.5 rounded-full cursor-pointer transition-colors"
                    >
                      +2 ngày (21:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDueDate('nextSunday')}
                      className="text-[11px] font-medium text-teal bg-gold-soft/70 border border-gold/40 hover:bg-gold-soft px-2.5 py-0.5 rounded-full cursor-pointer transition-colors"
                    >
                      Tối Chủ Nhật
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
                />
              </div>

              {/* Link tài liệu đính kèm */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Đường dẫn tài liệu / Đề bài đính kèm <span className="text-ink-muted font-normal">(Tùy chọn)</span>
                </label>
                <InputPill
                  type="url"
                  placeholder="https://drive.google.com/file/... hoặc link tải ảnh/PDF bài mẫu"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
                  className="!h-10 !py-0"
                />
                <p className="text-[11px] text-ink-muted mt-1">
                  Hỗ trợ link Google Drive, OneDrive, Zalo hoặc tài liệu bài giảng trực tuyến.
                </p>
              </div>

              {/* Hướng dẫn chi tiết */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Nội dung hướng dẫn &amp; Đề bài chi tiết
                </label>
                <textarea
                  rows={4}
                  placeholder="Ghi chú yêu cầu làm bài, lưu ý tư thế ngồi, điểm dừng bút hoặc lời nhắn gửi phụ huynh..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {!editingHomework && (
                <div className="rounded-xl bg-mint-canvas/70 border border-line p-3 text-xs text-teal flex items-start gap-2">
                  <span className="text-base">ℹ️</span>
                  <span>
                    <strong>Tự động khởi tạo:</strong> Khi bấm &quot;Giao bài tập&quot;, hệ thống sẽ tự động tạo danh sách nộp bài cho mọi học viên đang học trong lớp với trạng thái &quot;Chưa nộp&quot;.
                  </span>
                </div>
              )}

              {/* Nút hành động */}
              <div className="mt-6 flex justify-end gap-2.5 border-t border-line/60 pt-4">
                <SecondaryButton
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Hủy bỏ
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Đang lưu...' : editingHomework ? 'Lưu thay đổi' : 'Giao bài tập'}
                </PrimaryButton>
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
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => setDetailHomeworkId(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full md:max-w-6xl h-full md:h-[92vh] rounded-none md:rounded-card-lg bg-surface border border-line/60 shadow-modal modal-panel flex flex-col overflow-hidden">
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-subtle">
              <div className="flex items-center gap-3">
                <SecondaryButton
                  type="button"
                  onClick={() => setDetailHomeworkId(null)}
                  className="!px-3.5 !py-1.5 !text-xs"
                  title="Đóng"
                >
                  ← Quay lại
                </SecondaryButton>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink-muted">
                      #HW-{detailHomework?.id}
                    </span>
                    <h2 className="text-base md:text-lg font-bold text-ink">
                      {detailHomework?.title}
                    </h2>
                  </div>
                  <div className="text-xs text-ink-secondary flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-teal">{detailHomework?.className}</span>
                    <span>•</span>
                    <span>
                      Hạn nộp: {detailHomework?.dueDate ? formatDateTime(detailHomework.dueDate) : 'Không giới hạn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút đóng */}
              <IconButton
                variant="neutral"
                onClick={() => setDetailHomeworkId(null)}
                title="Đóng"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            {/* Nội dung đề bài tóm tắt */}
            <div className="px-6 py-3 border-b border-line/60 bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-[280px]">
                <p className="text-ink">
                  <strong>Hướng dẫn:</strong> {detailHomework?.description || 'Làm bài và chụp ảnh gửi lên hệ thống đúng hạn.'}
                </p>
              </div>
              {detailHomework?.attachmentUrl && (
                <a
                  href={detailHomework.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-soft/70 text-teal rounded-full font-semibold hover:bg-gold-soft border border-gold/40"
                >
                  <span>📎</span>
                  <span>Mở tài liệu đề bài</span>
                </a>
              )}
            </div>

            {/* Thống kê tiến độ nộp bài */}
            {canManage && (
              <div className="px-6 py-2.5 bg-surface-subtle border-b border-line flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <span>Tổng: <strong>{submissionCounts.total}</strong> học viên</span>
                  <span className="text-amber-700">Chờ chấm: <strong>{submissionCounts.submitted}</strong></span>
                  <span className="text-emerald-700">Đã chấm: <strong>{submissionCounts.reviewed}</strong></span>
                  <span className="text-ink-muted">Chưa nộp: <strong>{submissionCounts.pending}</strong></span>
                </div>

                {/* Filter tab */}
                <div className="inline-flex rounded-full bg-surface border border-line p-0.5 text-xs font-medium text-ink-secondary">
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('all')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${submissionTab === 'all' ? 'bg-gold-soft text-teal shadow-xs font-semibold' : 'hover:text-ink'}`}
                  >
                    Tất cả ({submissionCounts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('Submitted')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${submissionTab === 'Submitted' ? 'bg-gold-soft text-teal shadow-xs font-semibold' : 'hover:text-ink'}`}
                  >
                    Chờ chấm ({submissionCounts.submitted})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('Reviewed')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${submissionTab === 'Reviewed' ? 'bg-emerald-50 text-emerald-700 shadow-xs font-semibold' : 'hover:text-ink'}`}
                  >
                    Đã chấm ({submissionCounts.reviewed})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionTab('Pending')}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${submissionTab === 'Pending' ? 'bg-surface-subtle text-ink shadow-xs font-semibold' : 'hover:text-ink'}`}
                  >
                    Chưa nộp ({submissionCounts.pending})
                  </button>
                </div>
              </div>
            )}

            {/* THÂN DRAWER: SPLIT-VIEW (CHO STAFF) HOẶC SINGLE-VIEW (CHO PARENT/STUDENT) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-surface">
              {loadingSubmissions ? (
                <div className="flex-1 flex items-center justify-center p-12 text-ink-muted">
                  <svg className="h-6 w-6 animate-spin text-teal mr-2" fill="none" viewBox="0 0 24 24">
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
                  <div className="w-full md:w-80 lg:w-96 border-r border-line flex flex-col bg-surface-subtle/50">
                    {/* Ô tìm học viên */}
                    <div className="p-3 border-b border-line bg-surface">
                      <InputPill
                        type="text"
                        placeholder="Tìm học viên trong lớp..."
                        value={submissionSearch}
                        onChange={(e) => setSubmissionSearch(e.target.value)}
                        className="!h-9 !py-0 !text-xs"
                      />
                    </div>

                    {/* Danh sách thẻ */}
                    <div className="flex-1 overflow-y-auto divide-y divide-line/60">
                      {filteredSubmissions.length === 0 ? (
                        <div className="p-6 text-center text-xs text-ink-muted">
                          Không có bài nộp nào phù hợp
                        </div>
                      ) : (
                        filteredSubmissions.map((sub) => {
                          const isActive = sub.id === selectedSubmissionId;
                          const subScore = getSubmissionScore(sub);
                          let statusBadge = (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-subtle text-ink-secondary font-medium">
                              Chưa nộp
                            </span>
                          );
                          if (sub.status === 'Submitted') {
                            statusBadge = (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold animate-pulse">
                                  📥 Chờ chấm
                                </span>
                                {(subScore !== null || Boolean(sub.teacherFeedback)) && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-subtle text-ink-secondary border border-line font-mono font-medium">
                                    {subScore !== null ? `Điểm cũ: ${subScore}/10` : 'Có nhận xét cũ'}
                                  </span>
                                )}
                              </div>
                            );
                          } else if (sub.status === 'Reviewed') {
                            if (subScore !== null) {
                              statusBadge = (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold font-mono">
                                  🎯 {subScore} / 10
                                </span>
                              );
                            } else {
                              statusBadge = (
                                <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  ✓ Chỉ nhận xét
                                </span>
                              );
                            }
                          }

                          return (
                            <div
                              key={sub.id}
                              onClick={() => handleSelectSubmission(sub)}
                              className={`p-3.5 cursor-pointer transition-all flex items-start justify-between gap-2 ${
                                isActive
                                  ? 'bg-mint-canvas/80 border-l-4 border-teal pl-2.5 shadow-2xs'
                                  : 'hover:bg-mint-canvas/40 bg-surface'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs md:text-sm text-ink truncate">
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                  ✓ Đã chấm
                                </span>
                                {getSubmissionScore(selectedSubmission) !== null ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-900 font-mono">
                                    🎯 {getSubmissionScore(selectedSubmission)} / 10
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    Chỉ nhận xét
                                  </span>
                                )}
                              </div>
                            ) : selectedSubmission.status === 'Submitted' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                                  📥 Đã nộp bài (Chờ cô chấm)
                                </span>
                                {(getSubmissionScore(selectedSubmission) !== null ||
                                  Boolean(selectedSubmission.teacherFeedback)) && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono">
                                    {getSubmissionScore(selectedSubmission) !== null
                                      ? `Điểm cũ: ${getSubmissionScore(selectedSubmission)}/10`
                                      : 'Đã có nhận xét lần trước'}
                                  </span>
                                )}
                              </div>
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

                        {/* Hộp đối chiếu Điểm & Nhận xét lần chấm trước (Khi học viên nộp lại bài chờ chấm) */}
                        {selectedSubmission.status === 'Submitted' &&
                          (getSubmissionScore(selectedSubmission) !== null ||
                            Boolean(getCleanFeedback(selectedSubmission.teacherFeedback))) && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-700">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>📋</span>
                                  <span>Điểm &amp; Nhận xét lần chấm trước</span>
                                </h4>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                  Chờ chấm lại bản nộp mới
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="text-slate-500">Điểm lần trước: </span>
                                  <strong className="font-mono text-slate-900">
                                    {getSubmissionScore(selectedSubmission) !== null
                                      ? `${getSubmissionScore(selectedSubmission)} / 10`
                                      : 'Chỉ nhận xét'}
                                  </strong>
                                </div>
                                {selectedSubmission.reviewedAt && (
                                  <div>
                                    <span className="text-slate-500">Chấm lúc: </span>
                                    <span className="font-medium text-slate-700">
                                      {formatDateTime(selectedSubmission.reviewedAt)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {getCleanFeedback(selectedSubmission.teacherFeedback) && (
                                <div className="pt-1.5 border-t border-slate-200/80">
                                  <span className="text-slate-500 block mb-0.5">Nhận xét lần trước:</span>
                                  <p className="italic text-slate-800 whitespace-pre-line">
                                    &ldquo;{getCleanFeedback(selectedSubmission.teacherFeedback)}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                        {/* Khung chấm điểm & nhận xét của giáo viên */}
                        <div className="rounded-card border border-line bg-mint-canvas/40 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-teal flex items-center gap-1.5">
                              <span>👩‍🏫</span>
                              <span>Giáo viên chấm bài &amp; Nhận xét sư phạm</span>
                            </h4>
                            <span className="text-[11px] text-ink-muted">
                              Phím tắt: Ctrl + Enter để lưu
                            </span>
                          </div>

                          {gradingError && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                              {gradingError}
                            </div>
                          )}

                          {gradingSuccess && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
                              {gradingSuccess}
                            </div>
                          )}

                          {/* Nhập điểm số */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                              <label className="text-xs font-semibold text-ink">
                                Điểm số đánh giá (Thang điểm 10):
                              </label>
                              <div className="flex items-center gap-1 flex-wrap">
                                {[10, 9.5, 9, 8.5, 8, 7.5].map((scoreVal) => (
                                  <button
                                    key={scoreVal}
                                    type="button"
                                    onClick={() => {
                                      setGradingScore(String(scoreVal));
                                      if (gradingError) setGradingError('');
                                    }}
                                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                      gradingScore === String(scoreVal)
                                        ? 'bg-teal text-white border-teal'
                                        : 'bg-surface border-line text-ink hover:bg-gold-soft/70 hover:text-teal'
                                    }`}
                                  >
                                    {scoreVal}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGradingScore('');
                                    if (gradingError) setGradingError('');
                                  }}
                                  className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                    gradingScore === ''
                                      ? 'bg-teal text-white border-teal'
                                      : 'bg-surface border-line text-ink-secondary hover:bg-surface-subtle'
                                  }`}
                                  title="Để trống = chỉ nhận xét, không chấm điểm"
                                >
                                  Chỉ nhận xét
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <InputPill
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                placeholder="Để trống nếu chỉ nhận xét"
                                value={gradingScore}
                                onChange={(e) => {
                                  setGradingScore(e.target.value);
                                  if (gradingError) setGradingError('');
                                }}
                                className="!w-56 !h-10 !py-0 font-mono font-bold text-center"
                              />
                              <span className="text-xs text-ink-secondary font-semibold">/ 10 điểm</span>
                              {gradingScore !== '' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGradingScore('');
                                    if (gradingError) setGradingError('');
                                  }}
                                  className="text-xs text-ink-muted hover:text-rose-600 px-1 py-0.5 cursor-pointer"
                                  title="Xóa điểm"
                                >
                                  ✕ Xóa điểm
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-muted mt-1">
                              Cho phép số từ 0 đến 10 (bước 0.1). <strong>Được phép để trống</strong> nếu chỉ gửi nhận xét sư phạm.
                            </p>
                          </div>

                          {/* Nhập nhận xét */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-semibold text-ink">
                                Lời nhận xét sư phạm của cô:
                              </label>
                              <span className="text-[11px] text-ink-muted">
                                {gradingFeedback.length} / 1000 ký tự
                              </span>
                            </div>
                            <textarea
                              rows={4}
                              maxLength={1000}
                              placeholder="Nhận xét ưu điểm, điểm cần rèn thêm và lời động viên bé..."
                              value={gradingFeedback}
                              onChange={(e) => setGradingFeedback(e.target.value)}
                              className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                            />
                            {/* Mẫu nhận xét nhanh */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {quickFeedbackTemplates.map((t, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setGradingFeedback(t.text)}
                                  className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-line text-ink-secondary hover:bg-gold-soft/70 hover:text-teal transition-colors cursor-pointer"
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedSubmission.status === 'Pending' && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                              <span className="font-semibold">⚠️ Học viên chưa nộp bài</span> — Chỉ có thể chấm điểm khi học viên đã nộp bài.
                            </div>
                          )}

                          {selectedSubmission.status === 'Reviewed' && (
                            <div className="rounded-xl border border-line bg-surface-subtle p-2.5 text-xs text-ink-secondary">
                              Bài nộp này đã được chấm điểm. Chỉ có thể chấm lại nếu học viên nộp bản mới.
                            </div>
                          )}

                          {/* Nút hành động chấm bài */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60">
                            <button
                              type="button"
                              disabled={gradingSubmitting || selectedSubmission.status !== 'Submitted'}
                              onClick={() => handleReviewSubmission('Pending', false)}
                              className="px-4 py-2 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Yêu cầu nộp lại bài
                            </button>

                            <div className="flex gap-2">
                              <SecondaryButton
                                type="button"
                                disabled={gradingSubmitting || selectedSubmission.status !== 'Submitted'}
                                onClick={() => handleReviewSubmission('Reviewed', false)}
                                className="!text-xs"
                              >
                                Lưu điểm
                              </SecondaryButton>
                              <PrimaryButton
                                type="button"
                                disabled={gradingSubmitting || selectedSubmission.status !== 'Submitted'}
                                onClick={() => handleReviewSubmission('Reviewed', true)}
                                className="!text-xs"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Lưu &amp; Sang bé tiếp theo</span>
                              </PrimaryButton>
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
                      const myScore = getSubmissionScore(mySub);

                      return (
                        <div key={mySub.id} className="space-y-6">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Hồ sơ nộp bài</span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              Học viên: {mySub.studentName} <span className="font-mono text-xs text-slate-400">#STU-{mySub.studentId}</span>
                            </h3>
                            <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                              <span>Trạng thái:</span>
                              {isReviewed ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    ✓ Đã chấm
                                  </span>
                                  {myScore !== null ? (
                                    <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                                      🎯 {myScore} / 10
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                                      Chỉ nhận xét
                                    </span>
                                  )}
                                </div>
                              ) : isSubmitted ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                                    {myScore !== null || Boolean(getCleanFeedback(mySub.teacherFeedback))
                                      ? '📥 Đã nộp lại (Chờ chấm lại)'
                                      : '📥 Đã nộp bài (Đang chờ cô chấm)'}
                                  </span>
                                  {myScore !== null && (
                                    <span className="font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full font-mono">
                                      Điểm hiện tại: {myScore} / 10
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  ⏳ Chưa nộp bài
                                </span>
                              )}
                            </div>
                          </div>

                          {/* KẾT QUẢ NẾU ĐÃ CHẤM HOẶC CÓ ĐIỂM / NHẬN XÉT LẦN TRƯỚC */}
                          {(isReviewed || myScore !== null || Boolean(getCleanFeedback(mySub.teacherFeedback))) && (
                            <div
                              className={`rounded-2xl border-2 p-5 space-y-4 ${
                                isReviewed
                                  ? 'border-emerald-300 bg-emerald-50/40'
                                  : 'border-slate-300 bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4
                                  className={`text-sm font-bold flex items-center gap-2 ${
                                    isReviewed ? 'text-emerald-900' : 'text-slate-800'
                                  }`}
                                >
                                  <span>{isReviewed ? '🌟' : '📋'}</span>
                                  <span>
                                    {isSubmitted
                                      ? 'KẾT QUẢ CHẤM LẦN TRƯỚC (Đang chờ cô chấm lại bài nộp mới)'
                                      : 'KẾT QUẢ ĐÁNH GIÁ CỦA CÔ GIÁO'}
                                  </span>
                                </h4>
                                <span className="text-[11px] text-slate-500">
                                  {formatDateTime(mySub.reviewedAt)}
                                </span>
                              </div>

                              {/* Hiển thị điểm số bài nộp nếu có */}
                              {myScore !== null ? (
                                <div className="flex items-center gap-3.5 bg-white rounded-xl p-4 border border-emerald-200 shadow-2xs">
                                  <div className="flex h-12 w-14 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xl font-mono shadow-xs">
                                    {myScore}
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                      Điểm số bài tập (Thang 10)
                                    </div>
                                    <div className="text-base font-bold text-emerald-900">
                                      {myScore} / 10 điểm
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700">
                                  <span className="font-semibold text-emerald-800">Hình thức đánh giá:</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">Chỉ nhận xét (không chấm điểm)</span>
                                </div>
                              )}

                              <div className="rounded-xl bg-white p-4 border border-emerald-200 text-xs md:text-sm text-slate-800 leading-relaxed">
                                <div className="text-xs font-semibold text-slate-500 mb-1">
                                  Nhận xét của cô giáo:
                                </div>
                                <p className="whitespace-pre-line text-slate-900">
                                  {getCleanFeedback(mySub.teacherFeedback) || 'Cô đã xem bài làm của con và đánh giá tốt!'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* FORM NỘP BÀI TẬP */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>📤</span>
                              <span>{isSubmitted || isReviewed ? 'Cập nhật / Nộp lại bài tập' : 'Nộp bài tập cho cô'}</span>
                            </h4>

                            {(isReviewed || myScore !== null || Boolean(mySub.teacherFeedback)) && (
                              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2 leading-relaxed">
                                <span className="shrink-0 text-sm">⚠️</span>
                                <span>
                                  <strong>Lưu ý:</strong> Nộp lại sẽ gửi lại cho giáo viên chấm, điểm cũ và nhận xét cũ vẫn được giữ nguyên cho tới khi giáo viên chấm lại.
                                </span>
                              </div>
                            )}

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
                                <label className="block text-xs font-semibold text-ink mb-1">
                                  Đường dẫn bài làm / Link ảnh chụp bài viết <span className="text-rose-500">*</span>
                                </label>
                                <InputPill
                                  type="url"
                                  required
                                  placeholder="https://drive.google.com/file/... hoặc link ảnh Zalo/Cloud"
                                  value={studentSubmissionUrl}
                                  onChange={(e) => setStudentSubmissionUrl(e.target.value)}
                                  className="!h-10 !py-0"
                                />
                                <p className="text-[11px] text-ink-muted mt-1">
                                  ℹ️ Ba mẹ tải ảnh bài làm của bé lên Google Drive / Zalo rồi dán đường dẫn vào đây nhé!
                                </p>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-ink mb-1">
                                  Lời nhắn gửi cô giáo (Tùy chọn)
                                </label>
                                <textarea
                                  rows={3}
                                  placeholder="Bé hôm nay tự giác ngồi viết bài rất chăm chỉ, ba mẹ gửi cô chấm giúp bé ạ..."
                                  value={studentNote}
                                  onChange={(e) => setStudentNote(e.target.value)}
                                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                                />
                              </div>

                              <PrimaryButton
                                type="submit"
                                disabled={studentSubmitting}
                                className="w-full min-h-[44px]"
                              >
                                {studentSubmitting ? 'Đang gửi bài...' : 'Gửi bài tập'}
                              </PrimaryButton>
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
