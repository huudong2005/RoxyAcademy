import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  attachSubmissionsForHomeworks,
  fetchActiveClassIdsForStudent,
  fetchStudentGrades,
  fetchStudentHomeworks,
  fetchStudentSubmissions,
  submitHomework,
  uploadHomeworkImage,
} from '@/api/academicApi';
import {
  AlertTriangleOutlineIcon,
  AwardOutlineIcon,
  BookOutlineIcon,
  CheckOutlineIcon,
  ClockOutlineIcon,
  CloseOutlineIcon,
  ExternalLinkOutlineIcon,
  LinkOutlineIcon,
  RefreshOutlineIcon,
  UploadOutlineIcon,
  UserOutlineIcon,
} from '@/components/icons';
import {
  Badge,
  Card,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useAuth } from '@/context/authContext';
import {
  EXAM_TYPE_OPTIONS,
  formatDateDdMmYyyy,
  getExamTypeLabel,
  getHomeworkSubmissionStatusMeta,
  isHomeworkOverdue,
  toLocalYyyyMmDd,
  type GradeDto,
  type HomeworkWithSubmission,
} from '@/types/academic';

type SubTabType = 'homeworks' | 'grades';
type HomeworkFilterType =
  | 'all'
  | 'pending'
  | 'submitted'
  | 'reviewed'
  | 'overdue';

const HOMEWORK_FILTER_CHIPS: ReadonlyArray<{
  key: HomeworkFilterType;
  label: string;
}> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chưa nộp' },
  { key: 'submitted', label: 'Đã nộp' },
  { key: 'reviewed', label: 'Đã chấm' },
  { key: 'overdue', label: 'Quá hạn' },
];

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function formatScoreValue(score?: number | null): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '—';
  }
  const num = Number(score);
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, '');
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url.trim());
}

export default function HomeworksPage() {
  const { activeStudent, studentsLoading } = useAuth();
  const [subTab, setSubTab] = useState<SubTabType>('homeworks');

  // ==================== STATE BÀI TẬP ====================
  const [hwLoading, setHwLoading] = useState(false);
  const [hwError, setHwError] = useState('');
  const [homeworks, setHomeworks] = useState<HomeworkWithSubmission[]>([]);
  const [hwFilter, setHwFilter] = useState<HomeworkFilterType>('all');

  // Modal chi tiết & nộp bài
  const [selectedHw, setSelectedHw] = useState<HomeworkWithSubmission | null>(
    null
  );
  const [submissionUrlInput, setSubmissionUrlInput] = useState('');
  const [studentNoteInput, setStudentNoteInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ==================== STATE ĐIỂM SỐ ====================
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');
  const [grades, setGrades] = useState<GradeDto[]>([]);
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const todayYyyyMmDd = toLocalYyyyMmDd(new Date());

  const loadHomeworks = useCallback(async () => {
    if (!activeStudent) {
      setHomeworks([]);
      return;
    }

    setHwLoading(true);
    setHwError('');
    try {
      const activeClassIds = await fetchActiveClassIdsForStudent(
        activeStudent.id
      );
      const hwList = await fetchStudentHomeworks(activeClassIds);
      const withSubs = await attachSubmissionsForHomeworks(
        hwList,
        activeStudent.id
      );
      setHomeworks(withSubs);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      setHwError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể tải danh sách bài tập. Vui lòng thử lại.'
      );
    } finally {
      setHwLoading(false);
    }
  }, [activeStudent]);

  const loadGrades = useCallback(async () => {
    if (!activeStudent) {
      setGrades([]);
      return;
    }

    setGradesLoading(true);
    setGradesError('');
    try {
      const list = await fetchStudentGrades(activeStudent.id);
      setGrades(list);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      setGradesError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể tải bảng điểm. Vui lòng thử lại.'
      );
    } finally {
      setGradesLoading(false);
    }
  }, [activeStudent]);

  // Tự động tải lại khi đổi con ở header hoặc đổi tab
  useEffect(() => {
    if (!studentsLoading && subTab === 'homeworks') {
      loadHomeworks();
    }
  }, [studentsLoading, subTab, loadHomeworks]);

  useEffect(() => {
    if (!studentsLoading && subTab === 'grades') {
      loadGrades();
    }
  }, [studentsLoading, subTab, loadGrades]);

  // Reset bộ lọc lớp và đóng modal khi đổi học viên
  useEffect(() => {
    setSelectedHw(null);
    setClassFilter('all');
  }, [activeStudent?.id]);

  // ==================== LOGIC LỌC BÀI TẬP ====================
  const hwCounts = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let reviewed = 0;
    let overdue = 0;

    homeworks.forEach((hw) => {
      const status = hw.submission?.status;
      if (status === 'Submitted') submitted += 1;
      else if (status === 'Reviewed') reviewed += 1;
      else pending += 1;

      if (isHomeworkOverdue(hw.dueDate, status, todayYyyyMmDd)) {
        overdue += 1;
      }
    });

    return {
      all: homeworks.length,
      pending,
      submitted,
      reviewed,
      overdue,
    };
  }, [homeworks, todayYyyyMmDd]);

  const filteredHomeworks = useMemo(() => {
    return homeworks.filter((hw) => {
      const status = hw.submission?.status;
      switch (hwFilter) {
        case 'pending':
          return status !== 'Submitted' && status !== 'Reviewed';
        case 'submitted':
          return status === 'Submitted';
        case 'reviewed':
          return status === 'Reviewed';
        case 'overdue':
          return isHomeworkOverdue(hw.dueDate, status, todayYyyyMmDd);
        default:
          return true;
      }
    });
  }, [homeworks, hwFilter, todayYyyyMmDd]);

  // ==================== LOGIC MODAL NỘP BÀI ====================
  const openHomeworkModal = (hw: HomeworkWithSubmission) => {
    setSelectedHw(hw);
    setSubmissionUrlInput(hw.submission?.submissionUrl || '');
    setStudentNoteInput(hw.submission?.studentNote || '');
    setUploadError('');
    setSubmitError('');
    setSubmitSuccessMsg('');
  };

  const closeHomeworkModal = () => {
    if (submitting || uploadingImage) return;
    setSelectedHw(null);
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError('');
    setSubmitError('');
    setSubmitSuccessMsg('');

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadHomeworkImage(file);
      setSubmissionUrlInput(uploadedUrl);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message || err?.message;
      setUploadError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể tải ảnh lên. Vui lòng thử lại.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHw || !selectedHw.submission?.id || !activeStudent) return;

    const cleanUrl = submissionUrlInput.trim();
    if (!cleanUrl) {
      setSubmitError('Vui lòng dán đường dẫn bài làm hoặc tải ảnh lên.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccessMsg('');

    try {
      const res = await submitHomework(selectedHw.submission.id, {
        submissionUrl: cleanUrl,
        studentNote: studentNoteInput.trim() || null,
      });

      setSubmitSuccessMsg(
        res?.message?.trim() || 'Nộp bài thành công!'
      );

      // Tải lại trạng thái bài nộp mới nhất cho bài tập này và đồng bộ danh sách
      try {
        const updatedSubs = await fetchStudentSubmissions(
          selectedHw.id,
          activeStudent.id
        );
        const updatedSub = updatedSubs[0] || {
          ...selectedHw.submission,
          status: res.status || 'Submitted',
          submissionUrl: cleanUrl,
          studentNote: studentNoteInput.trim() || null,
          score: res.score ?? selectedHw.submission.score,
          teacherFeedback:
            res.teacherFeedback ?? selectedHw.submission.teacherFeedback,
          reviewedAt: res.reviewedAt ?? selectedHw.submission.reviewedAt,
        };

        setSelectedHw((prev) =>
          prev && prev.id === selectedHw.id
            ? { ...prev, submission: updatedSub }
            : prev
        );
        setHomeworks((prev) =>
          prev.map((item) =>
            item.id === selectedHw.id
              ? { ...item, submission: updatedSub }
              : item
          )
        );
      } catch {
        await loadHomeworks();
      }
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      setSubmitError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể nộp bài lúc này. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== LOGIC LỌC ĐIỂM SỐ ====================
  const gradeClassOptions = useMemo(() => {
    const map = new Map<number, string>();
    grades.forEach((g) => {
      if (typeof g.classId === 'number' && !map.has(g.classId)) {
        map.set(g.classId, g.className || `Lớp #${g.classId}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({
      id: String(id),
      name,
    }));
  }, [grades]);

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      if (examTypeFilter !== 'all' && g.examType !== examTypeFilter) {
        return false;
      }
      if (classFilter !== 'all' && String(g.classId) !== classFilter) {
        return false;
      }
      return true;
    });
  }, [grades, examTypeFilter, classFilter]);

  // ==================== RENDER TRẠNG THÁI CHUNG ====================
  if (studentsLoading) {
    return (
      <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
        <Card large className="p-5 animate-pulse space-y-3">
          <div className="h-3 w-28 rounded bg-line" />
          <div className="h-6 w-48 rounded bg-line" />
          <div className="h-10 w-full rounded-pill bg-surface-subtle" />
        </Card>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
        <Card large className="p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-teal">
            <UserOutlineIcon className="h-6 w-6" />
          </div>
          <Badge variant="neutral">Chưa liên kết học viên</Badge>
          <h2 className="text-base font-bold text-ink">
            Tài khoản chưa liên kết hồ sơ học viên
          </h2>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-ink-secondary">
            Vui lòng liên hệ bộ phận giáo vụ Roxy Academy (Hotline: 0326 538 824) để liên kết số điện thoại Zalo với hồ sơ học tập của bé.
          </p>
        </Card>
      </div>
    );
  }

  const selectedStatusMeta = selectedHw
    ? getHomeworkSubmissionStatusMeta(selectedHw.submission?.status)
    : null;
  const selectedIsOverdue = selectedHw
    ? isHomeworkOverdue(
        selectedHw.dueDate,
        selectedHw.submission?.status,
        todayYyyyMmDd
      )
    : false;
  const selectedIsResubmit =
    selectedHw?.submission?.status === 'Submitted' ||
    selectedHw?.submission?.status === 'Reviewed';

  return (
    <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
      {/* Header trang Bài tập & Điểm số + Sub-tab */}
      <Card large className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              HỌC TẬP &amp; ĐÁNH GIÁ
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-ink">
              {subTab === 'homeworks'
                ? `Bài tập của ${activeStudent.fullName}`
                : `Điểm số của ${activeStudent.fullName}`}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              {subTab === 'homeworks'
                ? 'Theo dõi bài tập được giao, nộp bài trực tuyến và xem nhận xét của giáo viên.'
                : 'Tra cứu kết quả kiểm tra và nhận xét chi tiết từ giáo viên.'}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-teal">
            {subTab === 'homeworks' ? (
              <BookOutlineIcon className="h-5 w-5" />
            ) : (
              <AwardOutlineIcon className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Sub-tab Segmented Control: Bài tập | Điểm số */}
        <div
          role="tablist"
          aria-label="Chuyển mục Bài tập và Điểm số"
          className="grid grid-cols-2 gap-1.5 rounded-pill border border-line bg-surface-subtle p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'homeworks'}
            onClick={() => setSubTab('homeworks')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              subTab === 'homeworks'
                ? 'bg-teal text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <BookOutlineIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Bài tập</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'grades'}
            onClick={() => setSubTab('grades')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              subTab === 'grades'
                ? 'bg-teal text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <AwardOutlineIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Điểm số</span>
          </button>
        </div>
      </Card>

      {/* ==================== TAB 1: BÀI TẬP ==================== */}
      {subTab === 'homeworks' && (
        <>
          {/* Chip lọc trạng thái */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {HOMEWORK_FILTER_CHIPS.map((chip) => {
              const isActive = hwFilter === chip.key;
              const count = hwCounts[chip.key];
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setHwFilter(chip.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'border-teal bg-teal text-white shadow-xs'
                      : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`rounded-pill px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-subtle text-ink-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {hwError && (
            <Card className="border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangleOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-rose-900">
                    Lỗi tải danh sách bài tập
                  </p>
                  <p className="mt-0.5 leading-relaxed">{hwError}</p>
                </div>
              </div>
              <SecondaryButton
                onClick={loadHomeworks}
                disabled={hwLoading}
                className="w-full min-h-[38px] py-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </SecondaryButton>
            </Card>
          )}

          {hwLoading ? (
            <div className="space-y-3">
              <Card className="p-4 animate-pulse space-y-2.5">
                <div className="h-4 w-2/3 rounded bg-line" />
                <div className="h-3 w-1/2 rounded bg-surface-subtle" />
                <div className="h-8 w-full rounded bg-surface-subtle" />
              </Card>
              <Card className="p-4 animate-pulse space-y-2.5">
                <div className="h-4 w-3/4 rounded bg-line" />
                <div className="h-3 w-1/3 rounded bg-surface-subtle" />
                <div className="h-8 w-full rounded bg-surface-subtle" />
              </Card>
            </div>
          ) : filteredHomeworks.length === 0 ? (
            <Card className="p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
                <BookOutlineIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-ink">
                {homeworks.length === 0
                  ? 'Chưa có bài tập nào được giao'
                  : 'Không có bài tập phù hợp bộ lọc'}
              </p>
              <p className="text-xs text-ink-secondary">
                {homeworks.length === 0
                  ? 'Khi giáo viên giao bài tập mới, danh sách sẽ hiển thị tại đây.'
                  : 'Hãy thử chọn trạng thái khác để xem các bài tập còn lại.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredHomeworks.map((hw) => {
                const statusMeta = getHomeworkSubmissionStatusMeta(
                  hw.submission?.status
                );
                const overdue = isHomeworkOverdue(
                  hw.dueDate,
                  hw.submission?.status,
                  todayYyyyMmDd
                );
                const hasScore =
                  hw.submission?.score !== null &&
                  hw.submission?.score !== undefined;

                return (
                  <Card
                    key={hw.id}
                    interactive
                    className="p-4"
                  >
                    <button
                      type="button"
                      onClick={() => openHomeworkModal(hw)}
                      className="w-full text-left space-y-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-ink leading-snug">
                            {hw.title}
                          </p>
                          <p className="mt-1 text-xs font-medium text-teal truncate">
                            {hw.className}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={statusMeta.variant}>
                            {statusMeta.label}
                          </Badge>
                          {overdue && <Badge variant="rose">Quá hạn</Badge>}
                        </div>
                      </div>

                      {hw.description && (
                        <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                          {hw.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-ink-secondary tabular-nums">
                          <ClockOutlineIcon className="h-3.5 w-3.5 text-teal shrink-0" />
                          <span>
                            Hạn nộp:{' '}
                            <strong
                              className={
                                overdue ? 'text-rose-700' : 'text-ink'
                              }
                            >
                              {hw.dueDate
                                ? formatDateDdMmYyyy(hw.dueDate)
                                : 'Không giới hạn'}
                            </strong>
                          </span>
                        </span>

                        <div className="flex items-center gap-2">
                          {hasScore && (
                            <span className="rounded-pill bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700 tabular-nums">
                              Điểm: {formatScoreValue(hw.submission?.score)}/10
                            </span>
                          )}
                          <span className="font-semibold text-teal">
                            Chi tiết →
                          </span>
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== TAB 2: ĐIỂM SỐ ==================== */}
      {subTab === 'grades' && (
        <>
          {/* Bộ lọc Loại kiểm tra + Lớp học */}
          <Card className="p-4 space-y-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Loại kiểm tra
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setExamTypeFilter('all')}
                  className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    examTypeFilter === 'all'
                      ? 'border-teal bg-teal text-white'
                      : 'border-line bg-surface-subtle text-ink-secondary hover:text-ink'
                  }`}
                >
                  Tất cả
                </button>
                {EXAM_TYPE_OPTIONS.map((opt) => {
                  const isActive = examTypeFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExamTypeFilter(opt.value)}
                      className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'border-teal bg-teal text-white'
                          : 'border-line bg-surface-subtle text-ink-secondary hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {gradeClassOptions.length > 0 && (
              <div className="space-y-1.5 border-t border-line/70 pt-3">
                <label
                  htmlFor="grade-class-filter"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
                >
                  Lọc theo lớp học
                </label>
                <select
                  id="grade-class-filter"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full min-h-[40px] rounded-card border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                >
                  <option value="all">Tất cả các lớp</option>
                  {gradeClassOptions.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          {gradesError && (
            <Card className="border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangleOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-rose-900">
                    Lỗi tải bảng điểm
                  </p>
                  <p className="mt-0.5 leading-relaxed">{gradesError}</p>
                </div>
              </div>
              <SecondaryButton
                onClick={loadGrades}
                disabled={gradesLoading}
                className="w-full min-h-[38px] py-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </SecondaryButton>
            </Card>
          )}

          {gradesLoading ? (
            <div className="space-y-3">
              <Card className="p-4 animate-pulse space-y-2.5">
                <div className="h-4 w-2/3 rounded bg-line" />
                <div className="h-3 w-1/2 rounded bg-surface-subtle" />
                <div className="h-10 w-full rounded bg-surface-subtle" />
              </Card>
              <Card className="p-4 animate-pulse space-y-2.5">
                <div className="h-4 w-1/2 rounded bg-line" />
                <div className="h-10 w-full rounded bg-surface-subtle" />
              </Card>
            </div>
          ) : filteredGrades.length === 0 ? (
            <Card className="p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
                <AwardOutlineIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-ink">
                {grades.length === 0
                  ? 'Chưa có điểm số nào được ghi nhận'
                  : 'Không có điểm số phù hợp bộ lọc'}
              </p>
              <p className="text-xs text-ink-secondary">
                {grades.length === 0
                  ? 'Kết quả các bài kiểm tra của bé sẽ được cập nhật tại đây.'
                  : 'Hãy thử đổi loại kiểm tra hoặc lớp học để xem thêm.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredGrades.map((g) => {
                const hasScore =
                  g.score !== null && g.score !== undefined;
                return (
                  <Card key={g.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="gold">
                            {getExamTypeLabel(g.examType)}
                          </Badge>
                          <span className="text-[11px] font-medium text-ink-muted tabular-nums">
                            {g.examDate
                              ? formatDateDdMmYyyy(g.examDate)
                              : formatDateDdMmYyyy(g.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-ink leading-snug">
                          {g.examName}
                        </p>
                        <p className="text-xs font-medium text-teal truncate">
                          {g.className || `Lớp #${g.classId}`}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-card border border-gold/40 bg-gold-soft px-3 py-2 text-center min-w-[74px]">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          Điểm
                        </p>
                        {hasScore ? (
                          <p className="mt-0.5 text-base font-bold text-teal tabular-nums">
                            {formatScoreValue(g.score)}
                            <span className="text-xs font-medium text-ink-secondary">
                              /{formatScoreValue(g.maxScore)}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs font-semibold text-ink-secondary">
                            Chưa có
                          </p>
                        )}
                      </div>
                    </div>

                    {g.teacherComment && (
                      <div className="rounded-card border border-line/80 bg-surface-subtle p-3 text-xs text-ink-secondary">
                        <p className="text-[11px] font-semibold text-ink">
                          Nhận xét của giáo viên:
                        </p>
                        <p className="mt-0.5 leading-relaxed">
                          {g.teacherComment}
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== MODAL CHI TIẾT & NỘP BÀI TẬP ==================== */}
      {selectedHw && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="homework-detail-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-teal-deep/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={closeHomeworkModal}
        >
          <div
            className="modal-panel w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-card-lg sm:rounded-card-lg border border-line bg-surface p-5 shadow-modal space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-line/70 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  CHI TIẾT BÀI TẬP
                </p>
                <h3
                  id="homework-detail-title"
                  className="mt-0.5 text-base font-bold text-teal leading-snug"
                >
                  {selectedHw.title}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-ink-secondary">
                  {selectedHw.className}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHomeworkModal}
                disabled={submitting || uploadingImage}
                aria-label="Đóng chi tiết bài tập"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-secondary hover:bg-mint-canvas cursor-pointer disabled:opacity-50"
              >
                <CloseOutlineIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Thông tin bài tập */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Hạn nộp</span>
                <span
                  className={`font-semibold tabular-nums ${
                    selectedIsOverdue ? 'text-rose-700' : 'text-ink'
                  }`}
                >
                  {selectedHw.dueDate
                    ? formatDateDdMmYyyy(selectedHw.dueDate)
                    : 'Không giới hạn'}
                  {selectedIsOverdue ? ' (Quá hạn)' : ''}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Trạng thái</span>
                {selectedStatusMeta && (
                  <Badge variant={selectedStatusMeta.variant}>
                    {selectedStatusMeta.label}
                  </Badge>
                )}
              </div>

              {selectedHw.submission?.submittedAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-secondary">Thời gian nộp</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatDateDdMmYyyy(selectedHw.submission.submittedAt)}
                  </span>
                </div>
              )}

              {selectedHw.description && (
                <div className="rounded-card border border-line/80 bg-surface-subtle p-3 text-ink-secondary">
                  <p className="text-[11px] font-semibold text-ink">
                    Mô tả bài tập:
                  </p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">
                    {selectedHw.description}
                  </p>
                </div>
              )}

              {selectedHw.attachmentUrl && (
                <a
                  href={selectedHw.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-card border border-teal/30 bg-mint-canvas px-3.5 py-2.5 text-xs font-semibold text-teal hover:bg-gold-soft transition-colors"
                >
                  <span className="truncate">Mở tài liệu đính kèm</span>
                  <ExternalLinkOutlineIcon className="h-4 w-4 shrink-0" />
                </a>
              )}

              {/* Điểm & Nhận xét giáo viên (hiển thị nếu đã chấm hoặc có điểm/nhận xét cũ) */}
              {(selectedHw.submission?.status === 'Reviewed' ||
                (selectedHw.submission?.score !== null &&
                  selectedHw.submission?.score !== undefined) ||
                Boolean(selectedHw.submission?.teacherFeedback)) && (
                <div className="rounded-card border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Kết quả chấm bài
                    </span>
                    {selectedHw.submission?.score !== null &&
                      selectedHw.submission?.score !== undefined && (
                        <span className="text-sm font-bold text-emerald-700 tabular-nums">
                          {formatScoreValue(selectedHw.submission.score)} / 10
                        </span>
                      )}
                  </div>
                  {selectedHw.submission?.teacherFeedback && (
                    <p className="text-xs leading-relaxed text-emerald-900">
                      {selectedHw.submission.teacherFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Form nộp bài */}
            <form
              onSubmit={handleSubmitHomework}
              className="border-t border-line/80 pt-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink">
                  {selectedIsResubmit ? 'Nộp lại bài làm' : 'Nộp bài làm'}
                </p>
              </div>

              {selectedIsResubmit && (
                <p className="rounded-card border border-gold/40 bg-gold-soft px-3 py-2 text-[11px] leading-relaxed text-teal">
                  Nộp lại sẽ giữ nguyên điểm và nhận xét cũ cho đến khi giáo viên chấm lại.
                </p>
              )}

              {!selectedHw.submission?.id && (
                <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
                  Học viên chưa có phiếu nộp bài cho bài tập này (có thể do ghi danh vào lớp sau khi bài tập được giao). Vui lòng liên hệ giáo viên để được hỗ trợ.
                </div>
              )}

              {/* Ô dán link */}
              <div className="space-y-1.5">
                <label
                  htmlFor="submission-url-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-ink"
                >
                  <LinkOutlineIcon className="h-3.5 w-3.5 text-teal" />
                  <span>Đường dẫn bài làm (Drive / Zalo / Ảnh)</span>
                </label>
                <input
                  id="submission-url-input"
                  type="url"
                  value={submissionUrlInput}
                  onChange={(e) => setSubmissionUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc tải ảnh bên dưới"
                  disabled={!selectedHw.submission?.id || submitting}
                  className="w-full min-h-[42px] rounded-card border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:bg-surface-subtle disabled:opacity-70"
                />
              </div>

              {/* Nút chọn ảnh chụp bài làm */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <SecondaryButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    !selectedHw.submission?.id || uploadingImage || submitting
                  }
                  className="w-full min-h-[40px] py-2 text-xs"
                >
                  <UploadOutlineIcon className="h-4 w-4" />
                  <span>
                    {uploadingImage
                      ? 'Đang tải ảnh lên...'
                      : 'Chọn ảnh chụp bài làm'}
                  </span>
                </SecondaryButton>

                {uploadError && (
                  <p className="text-[11px] font-medium text-rose-700">
                    {uploadError}
                  </p>
                )}

                {submissionUrlInput.trim() &&
                  isLikelyImageUrl(submissionUrlInput) && (
                    <div className="overflow-hidden rounded-card border border-line bg-surface-subtle p-2">
                      <img
                        src={submissionUrlInput.trim()}
                        alt="Ảnh bài làm đã chọn"
                        className="max-h-40 w-full rounded object-contain"
                      />
                    </div>
                  )}
              </div>

              {/* Ghi chú tùy chọn */}
              <div className="space-y-1.5">
                <label
                  htmlFor="student-note-input"
                  className="block text-xs font-semibold text-ink"
                >
                  Ghi chú cho giáo viên (tùy chọn)
                </label>
                <textarea
                  id="student-note-input"
                  rows={2}
                  maxLength={500}
                  value={studentNoteInput}
                  onChange={(e) => setStudentNoteInput(e.target.value)}
                  placeholder="Ví dụ: Con đã hoàn thành phần bài tập trang 12..."
                  disabled={!selectedHw.submission?.id || submitting}
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:bg-surface-subtle disabled:opacity-70"
                />
              </div>

              {submitError && (
                <div className="rounded-card border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {submitError}
                </div>
              )}

              {submitSuccessMsg && (
                <div className="flex items-start gap-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700" />
                  <span className="leading-relaxed">{submitSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <SecondaryButton
                  type="button"
                  onClick={closeHomeworkModal}
                  disabled={submitting || uploadingImage}
                  className="flex-1 min-h-[42px] py-2 text-xs"
                >
                  Đóng
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={
                    submitting ||
                    uploadingImage ||
                    !selectedHw.submission?.id ||
                    !submissionUrlInput.trim()
                  }
                  className="flex-1 min-h-[42px] py-2 text-xs"
                >
                  {submitting
                    ? 'Đang nộp...'
                    : selectedIsResubmit
                    ? 'Nộp lại'
                    : 'Nộp bài'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
