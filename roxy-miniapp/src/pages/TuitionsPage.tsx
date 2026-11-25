import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  fetchStudentLeaveRequests,
  fetchStudentTuitions,
  fetchTuitionPayments,
  submitPaymentReport,
  uploadPaymentProof,
} from '@/api/academicApi';
import {
  AlertTriangleOutlineIcon,
  CalendarOutlineIcon,
  CheckOutlineIcon,
  ClockOutlineIcon,
  CloseOutlineIcon,
  CopyOutlineIcon,
  ExternalLinkOutlineIcon,
  FileTextOutlineIcon,
  ImageOutlineIcon,
  RefreshOutlineIcon,
  UploadOutlineIcon,
  UserOutlineIcon,
  WalletOutlineIcon,
} from '@/components/icons';
import {
  Badge,
  Card,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useAuth } from '@/context/authContext';
import {
  formatCurrency,
  formatDateDdMmYyyy,
  formatDateTimeLocalVn,
  getLeaveRequestStatusMeta,
  getPaymentStatusMeta,
  getTuitionStatusMeta,
  toLocalYyyyMmDd,
  type LeaveRequestDto,
  type PaymentDto,
  type TuitionDto,
} from '@/types/academic';

type SubTabType = 'tuitions' | 'leave';
type TuitionFilterType =
  | 'all'
  | 'Unpaid'
  | 'PartiallyPaid'
  | 'Overdue'
  | 'Paid';
type LeaveFilterType =
  | 'all'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

const TUITION_FILTER_CHIPS: ReadonlyArray<{
  key: TuitionFilterType;
  label: string;
}> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Unpaid', label: 'Chưa đóng' },
  { key: 'PartiallyPaid', label: 'Đóng một phần' },
  { key: 'Overdue', label: 'Quá hạn' },
  { key: 'Paid', label: 'Đã đóng đủ' },
];

const LEAVE_FILTER_CHIPS: ReadonlyArray<{
  key: LeaveFilterType;
  label: string;
}> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Pending', label: 'Chờ duyệt' },
  { key: 'Approved', label: 'Đã duyệt' },
  { key: 'Rejected', label: 'Từ chối' },
  { key: 'Cancelled', label: 'Đã hủy' },
];

const LEAVE_REASON_SUGGESTIONS: ReadonlyArray<string> = [
  'Ốm',
  'Việc gia đình',
  'Đi du lịch',
];

const BANK_INFO = {
  bankName: 'Vietcombank',
  accountHolder: 'TRUNG TAM ROXY ACADEMY',
  accountNumber: '0326538824',
} as const;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROOF_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const ALLOWED_PROOF_EXT = /\.(jpg|jpeg|png|webp)$/i;

function extractApiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0];
    const firstVal = firstKey ? data.errors[firstKey] : null;
    if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') {
      return firstVal[0];
    }
  }
  if (typeof data?.title === 'string' && data.title.trim()) {
    return data.title.trim();
  }
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback bên dưới
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export default function TuitionsPage() {
  const { activeStudent, studentsLoading } = useAuth();
  const [subTab, setSubTab] = useState<SubTabType>('tuitions');

  // ==================== STATE HỌC PHÍ ====================
  const [tuitionsLoading, setTuitionsLoading] = useState(true);
  const [tuitionsError, setTuitionsError] = useState('');
  const [tuitions, setTuitions] = useState<TuitionDto[]>([]);
  const [tuitionFilter, setTuitionFilter] = useState<TuitionFilterType>('all');

  // Modal chi tiết khoản thu & báo chuyển khoản
  const [selectedTuition, setSelectedTuition] = useState<TuitionDto | null>(
    null
  );
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [payments, setPayments] = useState<PaymentDto[]>([]);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [transactionCodeInput, setTransactionCodeInput] = useState('');
  const [proofImageUrlInput, setProofImageUrlInput] = useState('');
  const [paymentNoteInput, setPaymentNoteInput] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadProofError, setUploadProofError] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSubmitError, setPaymentSubmitError] = useState('');
  const [paymentSubmitSuccess, setPaymentSubmitSuccess] = useState('');
  const [copiedField, setCopiedField] = useState<'stk' | 'content' | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  // ==================== STATE XIN NGHỈ ====================
  const todayLocal = toLocalYyyyMmDd(new Date());
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([]);
  const [leaveFilter, setLeaveFilter] = useState<LeaveFilterType>('all');

  // Form gửi đơn xin nghỉ
  const [leaveDateInput, setLeaveDateInput] = useState(todayLocal);
  const [leaveReasonInput, setLeaveReasonInput] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveSubmitError, setLeaveSubmitError] = useState('');
  const [leaveSubmitSuccess, setLeaveSubmitSuccess] = useState('');

  // Hủy đơn 2 bước trên thẻ
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelActionError, setCancelActionError] = useState('');
  const [cancelActionSuccess, setCancelActionSuccess] = useState('');

  // ==================== TẢI DỮ LIỆU ====================
  const loadTuitions = useCallback(async (): Promise<TuitionDto[]> => {
    if (!activeStudent) {
      setTuitions([]);
      setTuitionsLoading(false);
      return [];
    }
    setTuitionsLoading(true);
    setTuitionsError('');
    try {
      const list = await fetchStudentTuitions(activeStudent.id);
      setTuitions(list);
      return list;
    } catch (err: any) {
      setTuitionsError(
        extractApiErrorMessage(
          err,
          'Không thể tải danh sách học phí. Vui lòng thử lại.'
        )
      );
      return [];
    } finally {
      setTuitionsLoading(false);
    }
  }, [activeStudent]);

  const loadLeaveRequests = useCallback(async () => {
    if (!activeStudent) {
      setLeaveRequests([]);
      return;
    }
    setLeaveLoading(true);
    setLeaveError('');
    try {
      const list = await fetchStudentLeaveRequests(activeStudent.id);
      setLeaveRequests(list);
    } catch (err: any) {
      setLeaveError(
        extractApiErrorMessage(
          err,
          'Không thể tải danh sách đơn xin nghỉ. Vui lòng thử lại.'
        )
      );
    } finally {
      setLeaveLoading(false);
    }
  }, [activeStudent]);

  // Đổi học viên ở header -> tự động tải lại cả 2 tab và đóng modal cũ
  useEffect(() => {
    if (studentsLoading) return;
    setSelectedTuition(null);
    setShowPaymentForm(false);
    setConfirmCancelId(null);
    setLeaveSubmitSuccess('');
    setLeaveSubmitError('');
    setCancelActionError('');
    setCancelActionSuccess('');
    loadTuitions();
    loadLeaveRequests();
  }, [studentsLoading, activeStudent?.id, loadTuitions, loadLeaveRequests]);

  // ==================== LOGIC HỌC PHÍ & MODAL ====================
  const tuitionSummary = useMemo(() => {
    let remainingTotal = 0;
    let paidTotal = 0;
    tuitions.forEach((t) => {
      if (!t.isCancelled) {
        remainingTotal += Number(t.remainingAmount) || 0;
      }
      paidTotal += Number(t.paidAmount) || 0;
    });
    return { remainingTotal, paidTotal };
  }, [tuitions]);

  const filteredTuitions = useMemo(() => {
    if (tuitionFilter === 'all') return tuitions;
    return tuitions.filter((t) => t.status === tuitionFilter);
  }, [tuitions, tuitionFilter]);

  const loadPaymentsForTuition = useCallback(async (tuitionId: number) => {
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const list = await fetchTuitionPayments(tuitionId);
      setPayments(list);
    } catch (err: any) {
      setPaymentsError(
        extractApiErrorMessage(
          err,
          'Không thể tải lịch sử thanh toán. Vui lòng thử lại.'
        )
      );
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const openTuitionModal = (t: TuitionDto) => {
    const remaining = Number(t.remainingAmount) || 0;
    const pending = Number(t.pendingAmount) || 0;
    const availableToPay = Math.max(0, remaining - pending);

    setSelectedTuition(t);
    setShowPaymentForm(false);
    setAmountInput(availableToPay > 0 ? String(availableToPay) : '');
    setTransactionCodeInput('');
    setProofImageUrlInput('');
    setPaymentNoteInput('');
    setUploadProofError('');
    setPaymentSubmitError('');
    setPaymentSubmitSuccess('');
    setCopiedField(null);
    loadPaymentsForTuition(t.id);
  };

  const closeTuitionModal = () => {
    if (submittingPayment || uploadingProof) return;
    setSelectedTuition(null);
    setShowPaymentForm(false);
  };

  const handleCopy = async (field: 'stk' | 'content', text: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 1800);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const extOk = ALLOWED_PROOF_EXT.test(file.name);
    const mimeOk = ALLOWED_PROOF_MIME.has(file.type.toLowerCase());
    if (!extOk || !mimeOk) {
      setUploadProofError(
        'Chỉ chấp nhận ảnh định dạng JPG, JPEG, PNG hoặc WEBP.'
      );
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadProofError('Dung lượng ảnh chứng từ tối đa 5MB.');
      return;
    }

    setUploadingProof(true);
    setUploadProofError('');
    try {
      const url = await uploadPaymentProof(file);
      setProofImageUrlInput(url);
    } catch (err: any) {
      setUploadProofError(
        extractApiErrorMessage(
          err,
          'Không thể tải ảnh chứng từ lên. Vui lòng thử lại.'
        )
      );
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTuition) return;

    const parsedAmount = Number(amountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPaymentSubmitError('Vui lòng nhập số tiền thanh toán lớn hơn 0.');
      return;
    }

    setSubmittingPayment(true);
    setPaymentSubmitError('');
    setPaymentSubmitSuccess('');

    try {
      const res = await submitPaymentReport({
        tuitionId: selectedTuition.id,
        amount: parsedAmount,
        transactionCode: transactionCodeInput.trim() || null,
        proofImageUrl: proofImageUrlInput.trim() || null,
        note: paymentNoteInput.trim() || null,
      });

      setPaymentSubmitSuccess(
        res?.message?.trim() ||
          'Gửi yêu cầu thanh toán thành công, vui lòng chờ nhân viên xác nhận!'
      );
      setShowPaymentForm(false);
      setTransactionCodeInput('');
      setProofImageUrlInput('');
      setPaymentNoteInput('');

      const [updatedList] = await Promise.all([
        loadTuitions(),
        loadPaymentsForTuition(selectedTuition.id),
      ]);
      const refreshed = updatedList.find((item) => item.id === selectedTuition.id);
      if (refreshed) {
        setSelectedTuition(refreshed);
        const nextAvail = Math.max(
          0,
          (Number(refreshed.remainingAmount) || 0) -
            (Number(refreshed.pendingAmount) || 0)
        );
        setAmountInput(nextAvail > 0 ? String(nextAvail) : '');
      }
    } catch (err: any) {
      setPaymentSubmitError(
        extractApiErrorMessage(
          err,
          'Không thể gửi báo thanh toán. Vui lòng thử lại.'
        )
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  // ==================== LOGIC XIN NGHỈ ====================
  const filteredLeaveRequests = useMemo(() => {
    if (leaveFilter === 'all') return leaveRequests;
    return leaveRequests.filter((lr) => lr.status === leaveFilter);
  }, [leaveRequests, leaveFilter]);

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    const cleanDate = leaveDateInput.trim();
    const cleanReason = leaveReasonInput.trim();

    if (!cleanDate) {
      setLeaveSubmitError('Vui lòng chọn ngày xin nghỉ.');
      return;
    }
    if (cleanDate < todayLocal) {
      setLeaveSubmitError('Ngày xin nghỉ không được nhỏ hơn ngày hôm nay.');
      return;
    }
    if (!cleanReason) {
      setLeaveSubmitError('Vui lòng nhập lý do xin nghỉ.');
      return;
    }
    if (cleanReason.length > 500) {
      setLeaveSubmitError('Lý do xin nghỉ tối đa 500 ký tự.');
      return;
    }

    setSubmittingLeave(true);
    setLeaveSubmitError('');
    setLeaveSubmitSuccess('');

    try {
      const res = await createLeaveRequest({
        studentId: activeStudent.id,
        leaveDate: cleanDate,
        reason: cleanReason,
      });
      setLeaveSubmitSuccess(
        res?.message?.trim() || 'Gửi đơn xin nghỉ thành công!'
      );
      setLeaveReasonInput('');
      setLeaveDateInput(todayLocal);
      await loadLeaveRequests();
    } catch (err: any) {
      setLeaveSubmitError(
        extractApiErrorMessage(
          err,
          'Không thể gửi đơn xin nghỉ. Vui lòng thử lại.'
        )
      );
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleConfirmCancelLeave = async (leaveId: number) => {
    setCancellingId(leaveId);
    setCancelActionError('');
    setCancelActionSuccess('');
    try {
      const res = await cancelLeaveRequest(leaveId);
      setCancelActionSuccess(
        res?.message?.trim() || 'Đã hủy đơn xin nghỉ thành công.'
      );
      setConfirmCancelId(null);
      await loadLeaveRequests();
    } catch (err: any) {
      setCancelActionError(
        extractApiErrorMessage(
          err,
          'Không thể hủy đơn xin nghỉ. Vui lòng thử lại.'
        )
      );
    } finally {
      setCancellingId(null);
    }
  };

  // ==================== TRẠNG THÁI CHUNG ====================
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

  // Biến dẫn xuất cho modal chi tiết khoản thu
  const selectedRemaining = Number(selectedTuition?.remainingAmount) || 0;
  const selectedPending = Number(selectedTuition?.pendingAmount) || 0;
  const selectedAvailableToPay = Math.max(0, selectedRemaining - selectedPending);
  const canReportPayment =
    !!selectedTuition &&
    !selectedTuition.isCancelled &&
    selectedAvailableToPay > 0;
  const isWaitingConfirmFull =
    !!selectedTuition &&
    !selectedTuition.isCancelled &&
    selectedRemaining > 0 &&
    selectedAvailableToPay <= 0;
  const transferContent = selectedTuition
    ? `HP ${selectedTuition.id} ${activeStudent.fullName}`.trim()
    : '';

  return (
    <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
      {/* Sub-tab chuyển Học phí | Xin nghỉ */}
      <div
        role="tablist"
        aria-label="Học phí và Xin nghỉ"
        className="grid grid-cols-2 gap-1.5 rounded-pill border border-line bg-surface p-1 shadow-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'tuitions'}
          onClick={() => setSubTab('tuitions')}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            subTab === 'tuitions'
              ? 'bg-teal text-white shadow-xs'
              : 'text-ink-secondary hover:text-teal'
          }`}
        >
          <WalletOutlineIcon className="h-4 w-4" />
          <span>Học phí</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'leave'}
          onClick={() => setSubTab('leave')}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            subTab === 'leave'
              ? 'bg-teal text-white shadow-xs'
              : 'text-ink-secondary hover:text-teal'
          }`}
        >
          <CalendarOutlineIcon className="h-4 w-4" />
          <span>Xin nghỉ</span>
        </button>
      </div>

      {/* ==================== TAB HỌC PHÍ ==================== */}
      {subTab === 'tuitions' && (
        <>
          {/* Thẻ tổng hợp đầu trang */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border-gold/40 bg-gold-soft/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Còn phải đóng
              </p>
              {tuitionsLoading ? (
                <div className="mt-2 h-6 w-24 animate-pulse rounded bg-line" />
              ) : tuitionsError ? (
                <p className="mt-1 text-lg font-bold text-teal tabular-nums">
                  —
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold text-teal tabular-nums">
                  {formatCurrency(tuitionSummary.remainingTotal)}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Đã đóng
              </p>
              {tuitionsLoading ? (
                <div className="mt-2 h-6 w-24 animate-pulse rounded bg-line" />
              ) : tuitionsError ? (
                <p className="mt-1 text-lg font-bold text-emerald-700 tabular-nums">
                  —
                </p>
              ) : (
                <p className="mt-1 text-lg font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(tuitionSummary.paidTotal)}
                </p>
              )}
            </Card>
          </div>

          {/* Chip lọc trạng thái học phí */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {TUITION_FILTER_CHIPS.map((chip) => {
              const active = tuitionFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setTuitionFilter(chip.key)}
                  className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-teal bg-teal text-white shadow-xs'
                      : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-teal'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Trạng thái lỗi */}
          {tuitionsError && (
            <Card className="border-rose-200 bg-rose-50/70 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangleOutlineIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div className="flex-1 text-xs text-rose-800">
                  <p className="font-semibold">Không tải được học phí</p>
                  <p className="mt-0.5 leading-relaxed">{tuitionsError}</p>
                </div>
              </div>
              <SecondaryButton
                onClick={loadTuitions}
                className="w-full min-h-[38px] py-1.5 text-xs"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </SecondaryButton>
            </Card>
          )}

          {/* Danh sách khoản thu */}
          {tuitionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((idx) => (
                <Card key={idx} className="p-4 animate-pulse space-y-2.5">
                  <div className="h-4 w-2/3 rounded bg-line" />
                  <div className="h-3 w-1/2 rounded bg-surface-subtle" />
                  <div className="h-12 w-full rounded bg-surface-subtle" />
                </Card>
              ))}
            </div>
          ) : filteredTuitions.length === 0 ? (
            <Card className="p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
                <WalletOutlineIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-ink">
                {tuitions.length === 0
                  ? 'Chưa có khoản học phí nào'
                  : 'Không có khoản thu phù hợp bộ lọc'}
              </p>
              <p className="text-xs text-ink-secondary">
                {tuitions.length === 0
                  ? `Các khoản học phí của ${activeStudent.fullName} sẽ hiển thị tại đây.`
                  : 'Hãy thử chọn trạng thái khác để xem thêm.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTuitions.map((t) => {
                const statusMeta = getTuitionStatusMeta(t.status);
                const pendingAmt = Number(t.pendingAmount) || 0;
                return (
                  <Card
                    key={t.id}
                    interactive
                    role="button"
                    tabIndex={0}
                    onClick={() => openTuitionModal(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openTuitionModal(t);
                      }
                    }}
                    className="p-4 space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-bold text-ink leading-snug">
                          {t.title}
                        </p>
                        <p className="text-xs font-medium text-teal truncate">
                          {t.className || 'Khoản thu chung'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        <Badge variant={statusMeta.variant}>
                          {statusMeta.label}
                        </Badge>
                        {t.isOverdue && t.status !== 'Overdue' && (
                          <Badge variant="rose">Quá hạn</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-card border border-line/70 bg-surface-subtle p-2.5 text-xs">
                      <div>
                        <p className="text-[10px] font-medium text-ink-muted">
                          Phải thu
                        </p>
                        <p className="mt-0.5 font-semibold text-ink tabular-nums">
                          {formatCurrency(t.finalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-ink-muted">
                          Đã đóng
                        </p>
                        <p className="mt-0.5 font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(t.paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-ink-muted">
                          Còn lại
                        </p>
                        <p className="mt-0.5 font-bold text-teal tabular-nums">
                          {formatCurrency(t.remainingAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <ClockOutlineIcon className="h-3.5 w-3.5 text-ink-muted" />
                        Hạn: {formatDateDdMmYyyy(t.dueDate)}
                      </span>
                      <span className="text-[11px] font-semibold text-teal">
                        Xem chi tiết &rarr;
                      </span>
                    </div>

                    {pendingAmt > 0 && (
                      <div className="rounded-card border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-medium text-amber-800 tabular-nums">
                        Đang chờ xác nhận: {formatCurrency(pendingAmt)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== TAB XIN NGHỈ ==================== */}
      {subTab === 'leave' && (
        <>
          {/* Form gửi đơn xin nghỉ */}
          <Card large className="p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-2.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  TẠO ĐƠN XIN NGHỈ
                </p>
                <p className="mt-0.5 text-sm font-bold text-teal">
                  Học viên: {activeStudent.fullName}
                </p>
              </div>
              <Badge variant="gold">1 ngày / đơn</Badge>
            </div>

            {leaveSubmitSuccess && (
              <div className="flex items-start gap-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckOutlineIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="leading-relaxed">{leaveSubmitSuccess}</span>
              </div>
            )}

            {leaveSubmitError && (
              <div className="flex items-start gap-2 rounded-card border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangleOutlineIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span className="leading-relaxed">{leaveSubmitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeaveRequest} className="space-y-3">
              <div>
                <label
                  htmlFor="leave-date-input"
                  className="mb-1 block text-xs font-semibold text-ink"
                >
                  Ngày xin nghỉ <span className="text-rose-600">*</span>
                </label>
                <input
                  id="leave-date-input"
                  type="date"
                  min={todayLocal}
                  value={leaveDateInput}
                  onChange={(e) => setLeaveDateInput(e.target.value)}
                  required
                  className="w-full min-h-[42px] rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="leave-reason-input"
                    className="text-xs font-semibold text-ink"
                  >
                    Lý do xin nghỉ <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-ink-muted tabular-nums">
                    {leaveReasonInput.length}/500
                  </span>
                </div>

                {/* Chip gợi ý nhanh */}
                <div className="flex flex-wrap gap-1.5">
                  {LEAVE_REASON_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setLeaveReasonInput(suggestion)}
                      className={`rounded-pill border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        leaveReasonInput === suggestion
                          ? 'border-teal bg-teal text-white'
                          : 'border-line bg-surface-subtle text-ink-secondary hover:border-line-strong hover:text-teal'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <textarea
                  id="leave-reason-input"
                  rows={3}
                  maxLength={500}
                  value={leaveReasonInput}
                  onChange={(e) => setLeaveReasonInput(e.target.value)}
                  placeholder="Nhập lý do xin nghỉ học cho bé..."
                  required
                  className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                />
              </div>

              <PrimaryButton
                type="submit"
                disabled={submittingLeave}
                className="w-full"
              >
                {submittingLeave ? 'Đang gửi đơn...' : 'Gửi đơn xin nghỉ'}
              </PrimaryButton>
            </form>
          </Card>

          {/* Danh sách đơn xin nghỉ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Lịch sử đơn xin nghỉ
              </h3>
              <span className="text-xs text-ink-secondary tabular-nums">
                {filteredLeaveRequests.length} đơn
              </span>
            </div>

            {/* Chip lọc trạng thái đơn */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {LEAVE_FILTER_CHIPS.map((chip) => {
                const active = leaveFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setLeaveFilter(chip.key)}
                    className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-teal bg-teal text-white shadow-xs'
                        : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-teal'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {cancelActionSuccess && (
              <div className="flex items-start gap-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckOutlineIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{cancelActionSuccess}</span>
              </div>
            )}

            {cancelActionError && (
              <div className="flex items-start gap-2 rounded-card border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangleOutlineIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{cancelActionError}</span>
              </div>
            )}

            {leaveError && (
              <Card className="border-rose-200 bg-rose-50/70 p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangleOutlineIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div className="flex-1 text-xs text-rose-800">
                    <p className="font-semibold">
                      Không tải được danh sách đơn xin nghỉ
                    </p>
                    <p className="mt-0.5 leading-relaxed">{leaveError}</p>
                  </div>
                </div>
                <SecondaryButton
                  onClick={loadLeaveRequests}
                  className="w-full min-h-[38px] py-1.5 text-xs"
                >
                  <RefreshOutlineIcon className="h-3.5 w-3.5" />
                  <span>Thử lại</span>
                </SecondaryButton>
              </Card>
            )}

            {leaveLoading ? (
              <div className="space-y-3">
                {[1, 2].map((idx) => (
                  <Card key={idx} className="p-4 animate-pulse space-y-2.5">
                    <div className="h-4 w-1/2 rounded bg-line" />
                    <div className="h-3 w-1/3 rounded bg-surface-subtle" />
                    <div className="h-10 w-full rounded bg-surface-subtle" />
                  </Card>
                ))}
              </div>
            ) : filteredLeaveRequests.length === 0 ? (
              <Card className="p-6 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
                  <FileTextOutlineIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-ink">
                  {leaveRequests.length === 0
                    ? 'Chưa có đơn xin nghỉ nào'
                    : 'Không có đơn phù hợp bộ lọc'}
                </p>
                <p className="text-xs text-ink-secondary">
                  {leaveRequests.length === 0
                    ? 'Bạn có thể tạo đơn xin nghỉ ở biểu mẫu phía trên khi bé bận hoặc ốm.'
                    : 'Hãy thử đổi trạng thái lọc để xem thêm.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredLeaveRequests.map((lr) => {
                  const statusMeta = getLeaveRequestStatusMeta(lr.status);
                  const isPending = lr.status === 'Pending';
                  const isConfirming = confirmCancelId === lr.id;
                  const isCancelling = cancellingId === lr.id;

                  return (
                    <Card key={lr.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-bold text-ink tabular-nums">
                            Ngày nghỉ: {formatDateDdMmYyyy(lr.leaveDate)}
                          </p>
                          {lr.className && (
                            <p className="text-xs font-medium text-teal truncate">
                              Lớp: {lr.className}
                            </p>
                          )}
                        </div>
                        <Badge variant={statusMeta.variant} className="shrink-0">
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <div className="rounded-card border border-line/70 bg-surface-subtle p-3 text-xs text-ink-secondary">
                        <p className="font-semibold text-ink">Lý do:</p>
                        <p className="mt-0.5 leading-relaxed">{lr.reason}</p>
                      </div>

                      {(lr.reviewedByName || lr.reviewNote) && (
                        <div className="rounded-card border border-line/70 bg-mint-canvas p-3 text-xs text-ink-secondary space-y-1">
                          {lr.reviewedByName && (
                            <p>
                              <span className="font-semibold text-ink">
                                Người duyệt:
                              </span>{' '}
                              {lr.reviewedByName}
                              {lr.reviewedAt
                                ? ` (${formatDateTimeLocalVn(lr.reviewedAt)})`
                                : ''}
                            </p>
                          )}
                          {lr.reviewNote && (
                            <p>
                              <span className="font-semibold text-ink">
                                Ghi chú duyệt:
                              </span>{' '}
                              {lr.reviewNote}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] text-ink-muted tabular-nums">
                          Gửi lúc: {formatDateTimeLocalVn(lr.createdAt)}
                        </span>

                        {isPending && !isConfirming && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelActionError('');
                              setCancelActionSuccess('');
                              setConfirmCancelId(lr.id);
                            }}
                            className="rounded-pill border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>

                      {/* Bước 2 xác nhận hủy ngay trên thẻ */}
                      {isPending && isConfirming && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-rose-200 bg-rose-50/80 p-2.5">
                          <span className="text-xs font-semibold text-rose-800">
                            Xác nhận hủy đơn này?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => setConfirmCancelId(null)}
                              className="rounded-pill border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-secondary hover:text-ink cursor-pointer disabled:opacity-60"
                            >
                              Không
                            </button>
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => handleConfirmCancelLeave(lr.id)}
                              className="rounded-pill bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-60"
                            >
                              {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== MODAL CHI TIẾT HỌC PHÍ & BÁO CHUYỂN KHOẢN ==================== */}
      {selectedTuition && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tuition-detail-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-teal-deep/45 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={closeTuitionModal}
        >
          <div
            className="modal-panel w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-card-lg sm:rounded-card-lg border border-line bg-surface p-5 shadow-modal space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-line/70 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  CHI TIẾT KHOẢN THU
                </p>
                <h3
                  id="tuition-detail-title"
                  className="mt-0.5 text-base font-bold text-teal leading-snug"
                >
                  {selectedTuition.title}
                </h3>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {selectedTuition.className || 'Khoản thu chung'} &middot; Hạn:{' '}
                  {formatDateDdMmYyyy(selectedTuition.dueDate)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={closeTuitionModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-ink-secondary hover:text-teal cursor-pointer"
              >
                <CloseOutlineIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Tóm tắt số tiền */}
            <div className="grid grid-cols-3 gap-2 rounded-card border border-line bg-surface-subtle p-3 text-xs">
              <div>
                <p className="text-[10px] font-medium text-ink-muted">
                  Phải thu
                </p>
                <p className="mt-0.5 font-semibold text-ink tabular-nums">
                  {formatCurrency(selectedTuition.finalAmount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-ink-muted">
                  Đã đóng
                </p>
                <p className="mt-0.5 font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(selectedTuition.paidAmount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-ink-muted">
                  Còn lại
                </p>
                <p className="mt-0.5 font-bold text-teal tabular-nums">
                  {formatCurrency(selectedTuition.remainingAmount)}
                </p>
              </div>
            </div>

            {selectedTuition.note && (
              <div className="rounded-card border border-line/70 bg-mint-canvas p-3 text-xs text-ink-secondary">
                <span className="font-semibold text-ink">Ghi chú: </span>
                {selectedTuition.note}
              </div>
            )}

            {/* Thông báo kết quả gửi thanh toán */}
            {paymentSubmitSuccess && (
              <div className="flex items-start gap-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckOutlineIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="leading-relaxed">{paymentSubmitSuccess}</span>
              </div>
            )}

            {/* Thông báo khi đang chờ duyệt đủ số nợ */}
            {isWaitingConfirmFull && (
              <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 leading-relaxed">
                Đang chờ nhân viên xác nhận, vui lòng chờ duyệt.
              </div>
            )}

            {/* Nút mở form báo đã chuyển khoản */}
            {canReportPayment && !showPaymentForm && (
              <PrimaryButton
                onClick={() => {
                  setPaymentSubmitError('');
                  setPaymentSubmitSuccess('');
                  setAmountInput(String(selectedAvailableToPay));
                  setShowPaymentForm(true);
                }}
                className="w-full"
              >
                Báo đã chuyển khoản
              </PrimaryButton>
            )}

            {/* Form báo đã chuyển khoản */}
            {canReportPayment && showPaymentForm && (
              <form
                onSubmit={handleSubmitPayment}
                className="space-y-3 rounded-card border border-gold/50 bg-gold-soft/25 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal">
                    Thông tin chuyển khoản
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="text-xs font-medium text-ink-secondary hover:text-teal cursor-pointer"
                  >
                    Thu gọn
                  </button>
                </div>

                {/* Hộp thông tin ngân hàng */}
                <div className="space-y-2 rounded-card border border-line bg-surface p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted">Ngân hàng</span>
                    <span className="font-semibold text-ink">
                      {BANK_INFO.bankName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted">Chủ TK</span>
                    <span className="font-semibold text-ink text-right">
                      {BANK_INFO.accountHolder}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted">Số TK</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-teal tabular-nums">
                        {BANK_INFO.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('stk', BANK_INFO.accountNumber)
                        }
                        className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-teal hover:border-teal cursor-pointer"
                      >
                        <CopyOutlineIcon className="h-3 w-3" />
                        <span>
                          {copiedField === 'stk' ? 'Đã chép' : 'Sao chép'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-line/60">
                    <span className="shrink-0 text-ink-muted">Nội dung</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate font-semibold text-ink">
                        {transferContent}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('content', transferContent)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-line bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-teal hover:border-teal cursor-pointer"
                      >
                        <CopyOutlineIcon className="h-3 w-3" />
                        <span>
                          {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {paymentSubmitError && (
                  <div className="flex items-start gap-2 rounded-card border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                    <AlertTriangleOutlineIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <span className="leading-relaxed">
                      {paymentSubmitError}
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="payment-amount-input"
                      className="text-xs font-semibold text-ink"
                    >
                      Số tiền đã chuyển (đ){' '}
                      <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] text-ink-muted tabular-nums">
                      Tối đa: {formatCurrency(selectedAvailableToPay)}
                    </span>
                  </div>
                  <input
                    id="payment-amount-input"
                    type="number"
                    min={1}
                    step={1}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    required
                    className="w-full min-h-[42px] rounded-card border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink tabular-nums focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-tx-input"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    Mã giao dịch (tùy chọn)
                  </label>
                  <input
                    id="payment-tx-input"
                    type="text"
                    maxLength={100}
                    value={transactionCodeInput}
                    onChange={(e) => setTransactionCodeInput(e.target.value)}
                    placeholder="VD: FT261125..."
                    className="w-full min-h-[40px] rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                </div>

                {/* Upload ảnh chứng từ */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">
                    Ảnh chứng từ chuyển khoản (tùy chọn)
                  </label>
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleUploadProof}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <SecondaryButton
                      type="button"
                      disabled={uploadingProof}
                      onClick={() => proofInputRef.current?.click()}
                      className="min-h-[38px] px-3.5 py-1.5 text-xs"
                    >
                      <UploadOutlineIcon className="h-3.5 w-3.5" />
                      <span>
                        {uploadingProof ? 'Đang tải ảnh...' : 'Chọn ảnh chứng từ'}
                      </span>
                    </SecondaryButton>

                    {proofImageUrlInput && (
                      <button
                        type="button"
                        onClick={() => setProofImageUrlInput('')}
                        className="text-xs font-medium text-rose-600 hover:underline cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>

                  {uploadProofError && (
                    <p className="text-xs text-rose-600">{uploadProofError}</p>
                  )}

                  {proofImageUrlInput && (
                    <div className="overflow-hidden rounded-card border border-line bg-surface p-2 space-y-1.5">
                      <img
                        src={proofImageUrlInput}
                        alt="Ảnh chứng từ chuyển khoản"
                        className="max-h-40 w-full rounded object-contain bg-surface-subtle"
                      />
                      <a
                        href={proofImageUrlInput}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-teal hover:underline"
                      >
                        <ImageOutlineIcon className="h-3.5 w-3.5" />
                        <span>Xem ảnh gốc</span>
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="payment-note-input"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    id="payment-note-input"
                    rows={2}
                    maxLength={500}
                    value={paymentNoteInput}
                    onChange={(e) => setPaymentNoteInput(e.target.value)}
                    placeholder="Ghi chú thêm cho trung tâm..."
                    className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                  />
                </div>

                <PrimaryButton
                  type="submit"
                  disabled={submittingPayment || uploadingProof}
                  className="w-full"
                >
                  {submittingPayment
                    ? 'Đang gửi xác nhận...'
                    : 'Gửi xác nhận đã chuyển khoản'}
                </PrimaryButton>
              </form>
            )}

            {/* Lịch sử thanh toán */}
            <div className="space-y-2.5 border-t border-line/70 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Lịch sử thanh toán
                </h4>
                <button
                  type="button"
                  onClick={() => loadPaymentsForTuition(selectedTuition.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline cursor-pointer"
                >
                  <RefreshOutlineIcon className="h-3.5 w-3.5" />
                  <span>Làm mới</span>
                </button>
              </div>

              {paymentsError && (
                <div className="rounded-card border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {paymentsError}
                </div>
              )}

              {paymentsLoading ? (
                <div className="space-y-2">
                  <div className="h-14 w-full animate-pulse rounded-card bg-surface-subtle" />
                  <div className="h-14 w-full animate-pulse rounded-card bg-surface-subtle" />
                </div>
              ) : payments.length === 0 ? (
                <p className="rounded-card border border-line/70 bg-surface-subtle p-3 text-center text-xs text-ink-secondary">
                  Chưa có giao dịch thanh toán nào cho khoản thu này.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => {
                    const pMeta = getPaymentStatusMeta(p.status);
                    return (
                      <div
                        key={p.id}
                        className="rounded-card border border-line/80 bg-surface-subtle p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-teal tabular-nums">
                            {formatCurrency(p.amount)}
                          </span>
                          <Badge variant={pMeta.variant}>{pMeta.label}</Badge>
                        </div>

                        <div className="text-[11px] text-ink-secondary space-y-0.5">
                          <p className="tabular-nums">
                            Thời gian:{' '}
                            {formatDateTimeLocalVn(p.paidAt || p.createdAt)}
                          </p>
                          {p.transactionCode && (
                            <p>Mã GD: {p.transactionCode}</p>
                          )}
                          {p.confirmedByName && (
                            <p>
                              Xác nhận bởi: {p.confirmedByName}
                              {p.confirmedAt
                                ? ` (${formatDateTimeLocalVn(p.confirmedAt)})`
                                : ''}
                            </p>
                          )}
                          {p.note && <p>Ghi chú: {p.note}</p>}
                        </div>

                        {p.proofImageUrl && (
                          <a
                            href={p.proofImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal hover:underline"
                          >
                            <ExternalLinkOutlineIcon className="h-3.5 w-3.5" />
                            <span>Xem ảnh chứng từ</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
