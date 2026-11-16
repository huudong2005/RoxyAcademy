import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';

// 5 giá trị Enum ExamType khớp chính xác 100% với DB CK_Grades_Type & Backend DTO
const EXAM_TYPES = [
  {
    value: 'Quiz',
    label: 'Kiểm tra 15p',
    icon: '⚡',
    badgeClass: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    value: 'Midterm',
    label: 'Giữa kỳ',
    icon: '📝',
    badgeClass: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  {
    value: 'Final',
    label: 'Cuối khóa',
    icon: '🏆',
    badgeClass: 'bg-rose-50 border-rose-200 text-rose-700',
  },
  {
    value: 'Daily',
    label: 'Đánh giá ngày',
    icon: '📅',
    badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    value: 'Other',
    label: 'Đánh giá khác',
    icon: '📌',
    badgeClass: 'bg-slate-100 border-slate-200 text-slate-700',
  },
];

const EXAM_TYPE_MAP = Object.fromEntries(EXAM_TYPES.map((t) => [t.value, t]));

const QUICK_FEEDBACK_CHIPS = [
  {
    label: '🌟 Khen ngợi xuất sắc',
    text: 'Bé hoàn thành bài rất xuất sắc, hiểu bài sâu sắc và trình bày sạch đẹp. Cô khen ngợi con!',
  },
  {
    label: '👍 Hoàn thành tốt',
    text: 'Con làm bài tốt, đạt yêu cầu bài học. Tiếp tục rèn luyện và phát huy ở các bài sau nhé!',
  },
  {
    label: '✏️ Cần nắn nót hơn',
    text: 'Con nắm được kiến thức bài học nhưng cần chú ý viết chậm lại để nét chữ đều và đẹp hơn.',
  },
  {
    label: '🌈 Tiến bộ vượt bậc',
    text: 'Bé có sự tự tin và tiến bộ rõ rệt so với giai đoạn trước. Cô rất tự hào về con!',
  },
];

function getInitials(name) {
  if (!name) return 'HV';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getTodayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDateInputValue(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  return '';
}

function getScoreTier(score, maxScore) {
  if (score === null || score === undefined) return null;
  const max = Number(maxScore) > 0 ? Number(maxScore) : 10;
  const normalized = (Number(score) / max) * 10;
  if (normalized >= 8.5) {
    return { textClass: 'text-emerald-700', dotClass: 'bg-emerald-500' };
  }
  if (normalized >= 5.0) {
    return { textClass: 'text-blue-700', dotClass: 'bg-blue-500' };
  }
  return { textClass: 'text-rose-600', dotClass: 'bg-rose-500' };
}

function extractApiError(err, fallback) {
  if (!err?.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  const data = err.response.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0];
    const msgs = firstKey ? data.errors[firstKey] : null;
    if (Array.isArray(msgs) && msgs.length > 0) return msgs[0];
  }
  if (err.response.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  return fallback;
}

function deduplicateStudentsFromEnrollments(list) {
  const map = new Map();
  for (const item of list || []) {
    if (!item?.studentId) continue;
    if (!map.has(item.studentId)) {
      map.set(item.studentId, {
        id: item.studentId,
        fullName: item.studentName || `Học viên #${item.studentId}`,
        status: item.status,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'vi')
  );
}

function ExamTypeBadge({ examType }) {
  const meta = EXAM_TYPE_MAP[examType] || EXAM_TYPE_MAP.Other;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.badgeClass}`}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}

function ScoreDisplay({ score, maxScore, compact = false }) {
  const hasScore = score !== null && score !== undefined;
  if (!hasScore) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200 whitespace-nowrap">
        <span>💬</span>
        <span>{compact ? 'Chỉ nhận xét' : 'Đánh giá định tính'}</span>
      </span>
    );
  }
  const tier = getScoreTier(score, maxScore);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-2 w-2 rounded-full ${tier.dotClass}`} aria-hidden="true" />
      <span className={`text-base font-bold tabular-nums ${tier.textClass}`}>{score}</span>
      <span className="text-xs text-slate-400 font-normal tabular-nums">/ {maxScore}</span>
    </span>
  );
}

export default function Grades() {
  // 1. Phân quyền UI từ localStorage
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const role = currentUser.role || '';
  const canEdit = role === 'SuperAdmin' || role === 'BranchManager' || role === 'Teacher';

  // 2. State danh sách điểm & bộ lọc
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [classes, setClasses] = useState([]);
  const [filterStudents, setFilterStudents] = useState([]);
  const [loadingFilterStudents, setLoadingFilterStudents] = useState(false);

  const [classFilter, setClassFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [examDateFilter, setExamDateFilter] = useState('');

  // Phân trang Client-side
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Toast notification
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((type, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 3. State Drawer Xem chi tiết
  const [detailGrade, setDetailGrade] = useState(null);

  // 4. State Modal Nhập điểm mới / Sửa điểm
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [modalStudents, setModalStudents] = useState([]);
  const [loadingModalStudents, setLoadingModalStudents] = useState(false);
  const [modalStudentsError, setModalStudentsError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    classId: '',
    studentId: '',
    examName: '',
    examType: 'Other',
    examDate: '',
    score: '',
    maxScore: '10',
    teacherComment: '',
  });

  // Map classId -> class object (dùng để lấy tên chi nhánh trong Drawer)
  const classMap = useMemo(() => {
    const map = new Map();
    for (const c of classes) {
      map.set(c.id, c);
    }
    return map;
  }, [classes]);

  // Đóng Drawer / Modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (isModalOpen && !formSubmitting) {
        setIsModalOpen(false);
      } else if (detailGrade) {
        setDetailGrade(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, formSubmitting, detailGrade]);

  // Tải danh sách lớp học (Backend đã tự lọc theo vai trò)
  useEffect(() => {
    let ignore = false;
    const fetchClasses = async () => {
      try {
        const res = await axiosClient.get('/Classes');
        if (!ignore) {
          setClasses(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách lớp học:', err);
      }
    };
    fetchClasses();
    return () => {
      ignore = true;
    };
  }, []);

  // Cascading Dropdown Học viên ở thanh lọc
  useEffect(() => {
    let ignore = false;
    const fetchStudentsForFilter = async () => {
      setLoadingFilterStudents(true);
      try {
        if (classFilter) {
          const res = await axiosClient.get('/StudentClasses', {
            params: { classId: classFilter },
          });
          if (!ignore) {
            setFilterStudents(deduplicateStudentsFromEnrollments(res.data));
          }
        } else {
          try {
            const res = await axiosClient.get('/Students', { params: { pageSize: 200 } });
            if (!ignore) {
              const raw = res.data;
              const list = Array.isArray(raw?.items)
                ? raw.items
                : Array.isArray(raw)
                ? raw
                : [];
              setFilterStudents(
                list
                  .map((s) => ({
                    id: s.id,
                    fullName: s.fullName || `Học viên #${s.id}`,
                  }))
                  .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
              );
            }
          } catch {
            const fallbackRes = await axiosClient.get('/StudentClasses');
            if (!ignore) {
              setFilterStudents(deduplicateStudentsFromEnrollments(fallbackRes.data));
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách học viên cho bộ lọc:', err);
        if (!ignore) setFilterStudents([]);
      } finally {
        if (!ignore) setLoadingFilterStudents(false);
      }
    };

    fetchStudentsForFilter();
    return () => {
      ignore = true;
    };
  }, [classFilter]);

  // Tải danh sách điểm kiểm tra từ GET /api/Grades
  useEffect(() => {
    let ignore = false;
    const fetchGrades = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (classFilter) params.classId = classFilter;
        if (studentFilter) params.studentId = studentFilter;
        if (examTypeFilter) params.examType = examTypeFilter;
        if (examDateFilter) params.examDate = examDateFilter;

        const res = await axiosClient.get('/Grades', { params });
        if (!ignore) {
          setGrades(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(extractApiError(err, 'Không thể tải danh sách điểm kiểm tra. Vui lòng thử lại.'));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchGrades();
    return () => {
      ignore = true;
    };
  }, [reloadKey, classFilter, studentFilter, examTypeFilter, examDateFilter]);

  const hasActiveFilters = Boolean(
    classFilter || studentFilter || examTypeFilter || examDateFilter
  );

  const handleResetFilters = () => {
    setClassFilter('');
    setStudentFilter('');
    setExamTypeFilter('');
    setExamDateFilter('');
    setCurrentPage(1);
  };

  // Phân trang
  const totalItems = grades.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGrades = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return grades.slice(start, start + pageSize);
  }, [grades, safePage]);

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  // Nạp học viên đã ghi danh khi chọn lớp trong Modal tạo mới
  const loadEnrolledStudentsForModal = useCallback(async (selectedClassId) => {
    if (!selectedClassId) {
      setModalStudents([]);
      setModalStudentsError('');
      return;
    }
    setLoadingModalStudents(true);
    setModalStudentsError('');
    try {
      const res = await axiosClient.get('/StudentClasses', {
        params: { classId: selectedClassId },
      });
      const list = deduplicateStudentsFromEnrollments(res.data);
      setModalStudents(list);
    } catch (err) {
      setModalStudents([]);
      setModalStudentsError(extractApiError(err, 'Không thể tải danh sách học viên của lớp này.'));
    } finally {
      setLoadingModalStudents(false);
    }
  }, []);

  const openCreateModal = () => {
    if (!canEdit) return;
    setEditingGrade(null);
    setFormError('');
    setFieldErrors({});
    setModalStudents([]);
    setModalStudentsError('');
    const initialClassId = classFilter || '';
    setFormData({
      classId: initialClassId,
      studentId: '',
      examName: '',
      examType: 'Other',
      examDate: getTodayIsoDate(),
      score: '',
      maxScore: '10',
      teacherComment: '',
    });
    setIsModalOpen(true);
    if (initialClassId) {
      loadEnrolledStudentsForModal(initialClassId);
    }
  };

  const openEditModal = (grade) => {
    if (!canEdit || !grade) return;
    setEditingGrade(grade);
    setFormError('');
    setFieldErrors({});
    setModalStudents([]);
    setModalStudentsError('');
    setFormData({
      classId: String(grade.classId),
      studentId: String(grade.studentId),
      examName: grade.examName || '',
      examType: EXAM_TYPE_MAP[grade.examType] ? grade.examType : 'Other',
      examDate: toDateInputValue(grade.examDate),
      score: grade.score !== null && grade.score !== undefined ? String(grade.score) : '',
      maxScore: grade.maxScore !== null && grade.maxScore !== undefined ? String(grade.maxScore) : '10',
      teacherComment: grade.teacherComment || '',
    });
    setIsModalOpen(true);
  };

  const handleModalClassChange = (newClassId) => {
    setFormData((prev) => ({
      ...prev,
      classId: newClassId,
      studentId: '',
    }));
    setFieldErrors((prev) => ({ ...prev, classId: '', studentId: '' }));
    loadEnrolledStudentsForModal(newClassId);
  };

  const handleAppendQuickChip = (chipText) => {
    setFormData((prev) => {
      const current = prev.teacherComment.trim();
      const updated = current ? `${current}\n${chipText}` : chipText;
      return { ...prev, teacherComment: updated.slice(0, 1000) };
    });
    setFieldErrors((prev) => ({ ...prev, hasContent: '' }));
  };

  const validateForm = () => {
    const errs = {};

    if (!editingGrade) {
      if (!formData.classId) {
        errs.classId = 'Vui lòng chọn lớp học.';
      }
      if (!formData.studentId) {
        errs.studentId = 'Vui lòng chọn học viên ghi danh.';
      }
    }

    const trimmedName = formData.examName.trim();
    if (!trimmedName) {
      errs.examName = 'Tên bài kiểm tra là bắt buộc.';
    } else if (trimmedName.length > 150) {
      errs.examName = 'Tên bài kiểm tra tối đa 150 ký tự.';
    }

    const maxScoreNum = Number(formData.maxScore);
    if (formData.maxScore === '' || isNaN(maxScoreNum) || maxScoreNum <= 0) {
      errs.maxScore = 'Thang điểm tối đa phải lớn hơn 0.';
    }

    const hasScoreText = String(formData.score).trim() !== '';
    if (hasScoreText) {
      const parsedScore = Number(formData.score);
      if (isNaN(parsedScore)) {
        errs.score = 'Điểm số không hợp lệ.';
      } else if (!errs.maxScore && (parsedScore < 0 || parsedScore > maxScoreNum)) {
        errs.score = `Điểm số phải nằm trong khoảng từ 0 đến ${maxScoreNum}.`;
      } else if (parsedScore < 0) {
        errs.score = 'Điểm số không được nhỏ hơn 0.';
      }
    }

    const hasComment = formData.teacherComment.trim().length > 0;
    if (!hasScoreText && !hasComment) {
      errs.hasContent = 'Vui lòng nhập điểm số hoặc nhận xét sư phạm của giáo viên.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;

    const maxScoreNum = Number(formData.maxScore);
    const hasScoreText = String(formData.score).trim() !== '';
    const scoreNum = hasScoreText ? Number(formData.score) : null;

    setFormSubmitting(true);
    try {
      if (editingGrade) {
        await axiosClient.put(`/Grades/${editingGrade.id}`, {
          examName: formData.examName.trim(),
          examType: formData.examType,
          examDate: formData.examDate || null,
          score: scoreNum,
          maxScore: maxScoreNum,
          teacherComment: formData.teacherComment.trim() || null,
        });
        showToast('success', '✓ Đã cập nhật điểm số và nhận xét thành công!');
      } else {
        await axiosClient.post('/Grades', {
          studentId: Number(formData.studentId),
          classId: Number(formData.classId),
          examName: formData.examName.trim(),
          examType: formData.examType,
          examDate: formData.examDate || null,
          score: scoreNum,
          maxScore: maxScoreNum,
          teacherComment: formData.teacherComment.trim() || null,
        });
        showToast('success', '✓ Đã lưu kết quả bài kiểm tra của học viên!');
      }

      setIsModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(
        extractApiError(
          err,
          editingGrade
            ? 'Không thể cập nhật điểm kiểm tra. Vui lòng thử lại.'
            : 'Không thể lưu điểm kiểm tra. Vui lòng thử lại.'
        )
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification (góc phải trên, 4 giây) */}
      {toast && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header Page */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Quản lý Điểm kiểm tra
            </h1>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 shadow-xs">
              {totalItems} bản ghi
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-slate-500">
            Theo dõi kết quả học tập, bài thi định kỳ và nhận xét sư phạm của giáo viên
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
          >
            <span>+</span>
            <span>Nhập điểm mới</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 md:p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Lọc theo Lớp học */}
          <div className="lg:col-span-3">
            <label htmlFor="filter-class" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Lớp học
            </label>
            <select
              id="filter-class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setStudentFilter('');
                setCurrentPage(1);
              }}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tất cả lớp học</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Học viên (Cascading) */}
          <div className="lg:col-span-3">
            <label htmlFor="filter-student" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Học viên {loadingFilterStudents && <span className="text-blue-600 font-normal normal-case">(Đang tải...)</span>}
            </label>
            <select
              id="filter-student"
              value={studentFilter}
              onChange={(e) => {
                setStudentFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loadingFilterStudents}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {loadingFilterStudents ? 'Đang tải danh sách học viên...' : 'Tất cả học viên'}
              </option>
              {filterStudents.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.fullName} (#STU-{s.id})
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Loại bài */}
          <div className="lg:col-span-2">
            <label htmlFor="filter-exam-type" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Loại bài
            </label>
            <select
              id="filter-exam-type"
              value={examTypeFilter}
              onChange={(e) => {
                setExamTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tất cả loại bài</option>
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Ngày thi */}
          <div className="lg:col-span-2">
            <label htmlFor="filter-exam-date" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Ngày thi
            </label>
            <input
              id="filter-exam-date"
              type="date"
              value={examDateFilter}
              onChange={(e) => {
                setExamDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Nút Đặt lại bộ lọc */}
          <div className="lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>🔄</span>
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse bg-slate-200/60 rounded-lg h-12 w-full"
            />
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && grades.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
            {hasActiveFilters ? '🔍' : '💯'}
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {hasActiveFilters
              ? 'Không tìm thấy kết quả phù hợp'
              : 'Chưa có bài kiểm tra nào được ghi nhận'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            {hasActiveFilters
              ? 'Thử thay đổi lớp học, học viên, ngày thi hoặc loại bài kiểm tra đang chọn.'
              : 'Các bài kiểm tra 15 phút, giữa kỳ, cuối khóa và nhận xét sư phạm của lớp học sẽ xuất hiện tại đây.'}
          </p>
          <div className="mt-5 flex justify-center">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition cursor-pointer"
              >
                <span>🔄</span>
                <span>Đặt lại bộ lọc</span>
              </button>
            ) : (
              canEdit && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>+</span>
                  <span>Nhập điểm mới</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Danh sách dữ liệu */}
      {!loading && !error && grades.length > 0 && (
        <>
          {/* Bảng Desktop (>= 1024px) */}
          <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Học viên</th>
                    <th className="py-3.5 px-4">Lớp học</th>
                    <th className="py-3.5 px-4">Tên bài kiểm tra</th>
                    <th className="py-3.5 px-4">Loại bài</th>
                    <th className="py-3.5 px-4">Ngày thi</th>
                    <th className="py-3.5 px-4">Điểm số</th>
                    <th className="py-3.5 px-4">Người chấm</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedGrades.map((g) => (
                    <tr
                      key={g.id}
                      onClick={() => setDetailGrade(g)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {getInitials(g.studentName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition truncate">
                              {g.studentName || `Học viên #${g.studentId}`}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              #STU-{g.studentId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-medium text-xs md:text-sm">
                          {g.className || `Lớp #${g.classId}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-900 font-medium text-sm truncate">
                          {g.examName}
                        </p>
                        {g.teacherComment && (
                          <p className="mt-0.5 truncate max-w-xs text-xs text-slate-500 italic">
                            💬 {g.teacherComment}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <ExamTypeBadge examType={g.examType} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(g.examDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <ScoreDisplay score={g.score} maxScore={g.maxScore} compact />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {g.gradedByName || '—'}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailGrade(g)}
                            title="Xem chi tiết"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition cursor-pointer"
                          >
                            <span>👁️</span>
                            <span>Xem</span>
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(g)}
                              title="Sửa điểm"
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition cursor-pointer"
                            >
                              <span>✏️</span>
                              <span>Sửa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card Stack Mobile (< 1024px) */}
          <div className="lg:hidden space-y-3">
            {paginatedGrades.map((g) => (
              <article
                key={g.id}
                onClick={() => setDetailGrade(g)}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 cursor-pointer"
              >
                {/* Dòng 1: Học viên + Lớp | Điểm số */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {g.studentName || `Học viên #${g.studentId}`}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {g.className || `Lớp #${g.classId}`} •{' '}
                      <span className="font-mono">#STU-{g.studentId}</span>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ScoreDisplay score={g.score} maxScore={g.maxScore} />
                  </div>
                </div>

                {/* Dòng 2: Tên bài kiểm tra + Badge loại bài */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{g.examName}</p>
                  <ExamTypeBadge examType={g.examType} />
                </div>

                {/* Dòng 3: Ngày thi + Người chấm */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>📅 {formatDate(g.examDate)}</span>
                  <span>👩‍🏫 {g.gradedByName || '—'}</span>
                </div>

                {/* Dòng 4: Nhận xét giáo viên nếu có */}
                {g.teacherComment && (
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 italic line-clamp-2">
                    💬 {g.teacherComment}
                  </div>
                )}

                {/* Dòng hành động (Footer card) — chạm chuẩn >= 44px */}
                <div
                  className="flex items-center gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setDetailGrade(g)}
                    className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition cursor-pointer"
                  >
                    <span>👁️</span>
                    <span>Xem chi tiết</span>
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(g)}
                      className="min-h-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 active:scale-[0.98] transition cursor-pointer"
                    >
                      <span>✏️</span>
                      <span>Sửa điểm</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs md:text-sm text-slate-600 shadow-xs">
            <p>
              Hiển thị <span className="font-semibold text-slate-900">{startIndex}</span> –{' '}
              <span className="font-semibold text-slate-900">{endIndex}</span> trên tổng số{' '}
              <span className="font-semibold text-slate-900">{totalItems}</span> bản ghi điểm số
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition cursor-pointer"
              >
                &lt; Trước
              </button>
              <span className="px-2.5 font-semibold text-slate-700">
                Trang {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="min-h-[44px] sm:min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition cursor-pointer"
              >
                Sau &gt;
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==========================================
          DRAWER XEM CHI TIẾT BÀI KIỂM TRA
         ========================================== */}
      {detailGrade && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setDetailGrade(null)}
            aria-hidden="true"
          />

          {/* Slide-over Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết kết quả kiểm tra"
            className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Chi tiết kết quả kiểm tra
              </h2>
              <button
                type="button"
                onClick={() => setDetailGrade(null)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-[0.98] transition cursor-pointer"
                aria-label="Đóng chi tiết"
              >
                ✕
              </button>
            </div>

            {/* Body Drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Khối Hero Thống kê Điểm số */}
              <div
                className={`rounded-2xl border p-5 ${
                  detailGrade.score !== null && detailGrade.score !== undefined
                    ? 'border-blue-100 bg-blue-50/60'
                    : 'border-amber-200 bg-amber-50/60'
                }`}
              >
                {detailGrade.score !== null && detailGrade.score !== undefined ? (
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-extrabold tabular-nums ${
                        getScoreTier(detailGrade.score, detailGrade.maxScore)?.textClass ||
                        'text-slate-900'
                      }`}
                    >
                      {detailGrade.score}
                    </span>
                    <span className="text-base font-medium text-slate-500">
                      / {detailGrade.maxScore} điểm
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800">
                    <span>💬</span>
                    <span>Đánh giá định tính sư phạm — Không áp điểm số</span>
                  </div>
                )}

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {detailGrade.examName}
                </h3>

                <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
                  <ExamTypeBadge examType={detailGrade.examType} />
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 border border-slate-200">
                    📅 Ngày thi: {formatDate(detailGrade.examDate)}
                  </span>
                </div>
              </div>

              {/* Khối Thông tin Học viên & Lớp học (2 Cột) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Học viên
                  </p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {getInitials(detailGrade.studentName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {detailGrade.studentName || `Học viên #${detailGrade.studentId}`}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        #STU-{detailGrade.studentId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Lớp học
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {detailGrade.className || `Lớp #${detailGrade.classId}`}
                  </p>
                  {classMap.get(detailGrade.classId)?.branchName && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      🏢 {classMap.get(detailGrade.classId).branchName}
                    </p>
                  )}
                </div>
              </div>

              {/* Khối Nhận xét Sư phạm của Giáo viên */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  📝 Lời nhận xét &amp; Đánh giá năng lực của Giáo viên
                </h4>
                {detailGrade.teacherComment ? (
                  <blockquote className="bg-amber-50/60 border-l-4 border-amber-400 p-4 rounded-r-xl text-sm leading-relaxed text-slate-800 whitespace-pre-line">
                    {detailGrade.teacherComment}
                  </blockquote>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-400 italic">
                    Chưa có nhận xét bổ sung từ giáo viên.
                  </div>
                )}
              </div>

              {/* Khối Lịch sử & Kiểm toán */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Người chấm điểm:</span>
                  <span className="font-semibold text-slate-800">
                    {detailGrade.gradedByName || 'Cán bộ quản lý'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Ngày ghi nhận:</span>
                  <span className="font-medium text-slate-700">
                    {formatDateTime(detailGrade.createdAt)}
                  </span>
                </div>
                {detailGrade.updatedAt && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Cập nhật lần cuối:</span>
                    <span className="font-medium text-slate-700">
                      {formatDateTime(detailGrade.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Drawer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-4 bg-slate-50/60">
              <button
                type="button"
                onClick={() => setDetailGrade(null)}
                className="min-h-[44px] rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition cursor-pointer"
              >
                Đóng
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailGrade;
                    setDetailGrade(null);
                    openEditModal(target);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Chỉnh sửa điểm số</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ==========================================
          MODAL NHẬP ĐIỂM MỚI / SỬA ĐIỂM (STAFF ONLY)
         ========================================== */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !formSubmitting && setIsModalOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingGrade ? 'Chỉnh sửa điểm kiểm tra' : 'Nhập điểm kiểm tra mới'}
            className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                {editingGrade ? '✏️ Chỉnh sửa điểm kiểm tra' : '✏️ Nhập điểm kiểm tra mới'}
              </h2>
              <button
                type="button"
                onClick={() => !formSubmitting && setIsModalOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-[0.98] transition cursor-pointer"
                aria-label="Đóng biểu mẫu"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                  ⚠️ {formError}
                </div>
              )}

              {/* Row 1: Lớp học & Học viên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-class" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Lớp học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="modal-class"
                    value={formData.classId}
                    disabled={Boolean(editingGrade)}
                    onChange={(e) => handleModalClassChange(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.className}
                        {c.branchName ? ` - ${c.branchName}` : ''}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.classId && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.classId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="modal-student" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Học viên ghi danh <span className="text-rose-500">*</span>
                  </label>
                  {editingGrade ? (
                    <input
                      id="modal-student"
                      type="text"
                      disabled
                      value={`${editingGrade.studentName || `Học viên #${editingGrade.studentId}`} (#STU-${editingGrade.studentId})`}
                      className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 cursor-not-allowed"
                    />
                  ) : (
                    <>
                      <select
                        id="modal-student"
                        value={formData.studentId}
                        disabled={!formData.classId || loadingModalStudents}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, studentId: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, studentId: '' }));
                        }}
                        className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!formData.classId
                            ? 'Vui lòng chọn lớp học trước'
                            : loadingModalStudents
                            ? 'Đang tải danh sách học viên...'
                            : modalStudents.length === 0
                            ? 'Lớp chưa có học viên ghi danh'
                            : '-- Chọn học viên --'}
                        </option>
                        {modalStudents.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.fullName} (#STU-{s.id})
                          </option>
                        ))}
                      </select>
                      {modalStudentsError && (
                        <p className="mt-1 text-xs text-rose-600">{modalStudentsError}</p>
                      )}
                      {fieldErrors.studentId && (
                        <p className="mt-1 text-xs text-rose-600">{fieldErrors.studentId}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Tên bài kiểm tra & Loại bài thi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-exam-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên bài kiểm tra <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="modal-exam-name"
                    type="text"
                    maxLength={150}
                    placeholder="VD: Kiểm tra nét chữ cơ bản bài 4"
                    value={formData.examName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, examName: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, examName: '' }));
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {fieldErrors.examName && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.examName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="modal-exam-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Loại bài thi
                  </label>
                  <select
                    id="modal-exam-type"
                    value={formData.examType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, examType: e.target.value }))
                    }
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Ngày thi & Thang điểm tối đa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-exam-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Ngày thi
                  </label>
                  <input
                    id="modal-exam-date"
                    type="date"
                    value={formData.examDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, examDate: e.target.value }))
                    }
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label htmlFor="modal-max-score" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Thang điểm tối đa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="modal-max-score"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.maxScore}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, maxScore: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, maxScore: '', score: '' }));
                    }}
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {fieldErrors.maxScore && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.maxScore}</p>
                  )}
                </div>
              </div>

              {/* Row 4: Điểm số đạt được */}
              <div>
                <label htmlFor="modal-score" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Điểm số đạt được (Có thể để trống)
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    id="modal-score"
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="VD: 9.5"
                    value={formData.score}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, score: e.target.value }));
                      setFieldErrors((prev) => ({ ...prev, score: '', hasContent: '' }));
                    }}
                    className="w-full sm:w-48 min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm font-medium text-slate-500">
                    / {formData.maxScore || 10}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  💡 Có thể để trống điểm nếu bài kiểm tra có nhận xét định tính của giáo viên
                </p>
                {fieldErrors.score && (
                  <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.score}</p>
                )}
              </div>

              {/* Row 5: Nhận xét của giáo viên + Quick Feedback Chips */}
              <div>
                <label htmlFor="modal-comment" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nhận xét của giáo viên
                </label>
                <textarea
                  id="modal-comment"
                  rows={3}
                  maxLength={1000}
                  placeholder="Nhập nhận xét chi tiết về bài làm, thái độ học tập và điểm cần rèn luyện của bé..."
                  value={formData.teacherComment}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, teacherComment: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, hasContent: '' }));
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {fieldErrors.hasContent && (
                  <p className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    ⚠️ {fieldErrors.hasContent}
                  </p>
                )}

                <div className="mt-2.5">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Mẫu nhận xét nhanh:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_FEEDBACK_CHIPS.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleAppendQuickChip(chip.text)}
                        className="min-h-[36px] rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 active:scale-[0.98] transition cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting ? 'Đang lưu...' : '✓ Lưu điểm số'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
