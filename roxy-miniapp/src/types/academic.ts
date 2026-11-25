import type { BadgeVariant } from '@/components/ui';

export interface StudentClassDto {
  id: number;
  studentId: number;
  studentName?: string | null;
  classId: number;
  className?: string | null;
  status: string;
  registeredAt?: string | null;
}

export interface ScheduleDto {
  id: number;
  classId: number;
  className: string;
  branchId?: number | null;
  branchName?: string | null;
  mainTeacherId?: number | null;
  mainTeacherName?: string | null;
  studyDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm:ss'
  endTime: string;   // 'HH:mm:ss'
  room?: string | null;
  substituteTeacherId?: number | null;
  substituteTeacherName?: string | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | string;
  note?: string | null;
  hasAttendance: boolean;
}

export type AttendanceStatusType =
  | 'Present'
  | 'Late'
  | 'ExcusedAbsent'
  | 'UnexcusedAbsent'
  | null;

export interface AttendanceDto {
  id?: number | null;
  scheduleId: number;
  studentId: number;
  studentName?: string | null;
  gender?: string | null;
  dob?: string | null;
  status: AttendanceStatusType;
  note?: string | null;
  markedBy?: number | null;
  markedByName?: string | null;
  markedAt?: string | null;
}

export interface ScheduleWithAttendance extends ScheduleDto {
  studentAttendanceStatus: AttendanceStatusType;
  studentAttendanceNote?: string | null;
}

export interface HomeworkDto {
  id: number;
  classId: number;
  className: string;
  scheduleId?: number | null;
  title: string;
  description?: string | null;
  attachmentUrl?: string | null;
  dueDate?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
  branchId?: number | null;
  branchName?: string | null;
}

export type HomeworkSubmissionStatus =
  | 'Pending'
  | 'Submitted'
  | 'Reviewed'
  | string;

export interface HomeworkSubmissionDto {
  id: number;
  homeworkId: number;
  classId: number;
  studentId: number;
  studentName?: string | null;
  status: HomeworkSubmissionStatus;
  submissionUrl?: string | null;
  studentNote?: string | null;
  submittedAt?: string | null;
  teacherFeedback?: string | null;
  reviewedAt?: string | null;
  homeworkTitle?: string | null;
  dueDate?: string | null;
  score?: number | null;
}

export interface HomeworkWithSubmission extends HomeworkDto {
  submission: HomeworkSubmissionDto | null;
}

export interface SubmitHomeworkPayload {
  submissionUrl?: string | null;
  studentNote?: string | null;
}

export interface SubmitHomeworkResponse {
  message: string;
  score?: number | null;
  teacherFeedback?: string | null;
  reviewedAt?: string | null;
  status?: string;
}

export type ExamType = 'Quiz' | 'Midterm' | 'Final' | 'Daily' | 'Other' | string;

export interface GradeDto {
  id: number;
  studentId: number;
  studentName?: string | null;
  classId: number;
  className?: string | null;
  examName: string;
  examType: ExamType;
  examDate?: string | null;
  score?: number | null;
  maxScore: number;
  teacherComment?: string | null;
  gradedBy?: number | null;
  gradedByName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export type TuitionStatus =
  | 'Unpaid'
  | 'PartiallyPaid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | string;

export interface TuitionDto {
  id: number;
  studentId: number;
  studentName?: string | null;
  classId?: number | null;
  className?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  title: string;
  amount: number;
  totalAmount?: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: TuitionStatus;
  isOverdue: boolean;
  dueDate?: string | null;
  isCancelled: boolean;
  note?: string | null;
  createdAt?: string | null;
  pendingAmount?: number;
}

export type PaymentStatus =
  | 'PendingConfirm'
  | 'Confirmed'
  | 'Rejected'
  | string;

export interface PaymentDto {
  id: number;
  tuitionId: number;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  transactionCode?: string | null;
  proofImageUrl?: string | null;
  paidAt?: string | null;
  confirmedBy?: number | null;
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  note?: string | null;
  createdAt: string;
  tuitionTitle?: string | null;
  studentName?: string | null;
}

export interface SubmitPaymentPayload {
  tuitionId: number;
  amount: number;
  transactionCode?: string | null;
  proofImageUrl?: string | null;
  note?: string | null;
}

export interface SubmitPaymentResponse {
  message: string;
  id: number;
  status: string;
  amount: number;
}

export type LeaveRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | string;

export interface LeaveRequestDto {
  id: number;
  requesterType: string;
  studentId?: number | null;
  studentName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  classId?: number | null;
  className?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  scheduleId?: number | null;
  leaveDate: string; // 'YYYY-MM-DD'
  reason: string;
  status: LeaveRequestStatus;
  requestedBy: number;
  requestedByName?: string | null;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
}

export interface CreateLeaveRequestPayload {
  studentId: number;
  leaveDate: string; // 'YYYY-MM-DD'
  reason: string;
}

export interface LeaveActionResponse {
  message: string;
  id?: number;
}

export interface AttendanceBadgeMeta {
  label: string;
  variant: BadgeVariant;
}

export function getAttendanceBadgeMeta(
  status: AttendanceStatusType,
  hasAttendance = true
): AttendanceBadgeMeta {
  if (!hasAttendance || !status) {
    return { label: 'Chưa điểm danh', variant: 'neutral' };
  }
  switch (status) {
    case 'Present':
      return { label: 'Có mặt', variant: 'emerald' };
    case 'Late':
      return { label: 'Đi muộn', variant: 'amber' };
    case 'ExcusedAbsent':
      return { label: 'Nghỉ có phép', variant: 'blue' };
    case 'UnexcusedAbsent':
      return { label: 'Nghỉ không phép', variant: 'rose' };
    default:
      return { label: 'Chưa điểm danh', variant: 'neutral' };
  }
}

export function getScheduleStatusMeta(status: string): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'Scheduled':
      return { label: 'Đã lên lịch', variant: 'gold' };
    case 'Completed':
      return { label: 'Đã hoàn thành', variant: 'emerald' };
    case 'Cancelled':
      return { label: 'Đã hủy', variant: 'rose' };
    default:
      return { label: status || 'Đã lên lịch', variant: 'neutral' };
  }
}

/**
 * Cắt 'HH:mm' trực tiếp từ chuỗi giờ 'HH:mm:ss' hoặc 'HH:mm' API trả về.
 * Tuyệt đối không tự cộng/trừ múi giờ.
 */
export function formatTimeHHmm(timeStr?: string | null): string {
  if (!timeStr) return '—';
  const trimmed = timeStr.trim();
  if (trimmed.length >= 5) {
    return trimmed.slice(0, 5);
  }
  return trimmed;
}

export function formatTimeRange(
  startTime?: string | null,
  endTime?: string | null
): string {
  return `${formatTimeHHmm(startTime)} – ${formatTimeHHmm(endTime)}`;
}

/**
 * Định dạng chuỗi 'YYYY-MM-DD' (hoặc ISO string) sang 'dd/MM/yyyy' không lệch múi giờ.
 */
export function formatDateDdMmYyyy(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateShortDdMm(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

export function toLocalYyyyMmDd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalYearMonth(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function addDays(base: Date, days: number): Date {
  const copy = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    12,
    0,
    0,
    0
  );
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Lấy ngày Thứ 2 của tuần chứa ngày `d` (Tuần từ Thứ 2 -> Chủ nhật).
 */
export function getMondayOfWeek(d: Date): Date {
  const copy = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    12,
    0,
    0,
    0
  );
  const dayOfWeek = copy.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  copy.setDate(copy.getDate() + diffToMonday);
  return copy;
}

export function formatCurrency(amount?: number | null): string {
  const num = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return `${num.toLocaleString('vi-VN')} đ`;
}

export function formatVnd(amount?: number | null): string {
  return formatCurrency(amount);
}

/**
 * Định dạng ISO DateTime sang ngày giờ địa phương VN (dd/MM/yyyy HH:mm).
 * Nếu chuỗi từ server không có hậu tố múi giờ (UTC naive), gắn 'Z' để chuyển đúng sang local VN.
 */
export function formatDateTimeLocalVn(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const trimmed = dateStr.trim();
  if (!trimmed) return '—';
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized =
    !hasTimezone && trimmed.includes('T') ? `${trimmed}Z` : trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return formatDateDdMmYyyy(trimmed);
  }
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getHomeworkSubmissionStatusMeta(
  status?: HomeworkSubmissionStatus | null
): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'Submitted':
      return { label: 'Đã nộp', variant: 'blue' };
    case 'Reviewed':
      return { label: 'Đã chấm', variant: 'emerald' };
    default:
      return { label: 'Chưa nộp', variant: 'amber' };
  }
}

/**
 * Chuẩn hóa chuỗi ngày/DateTime từ API sang 'YYYY-MM-DD' theo giờ địa phương,
 * tránh lệch ngày khi backend trả về ISO có hoặc không có múi giờ.
 */
export function extractLocalYyyyMmDd(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasTimezone) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return toLocalYyyyMmDd(parsed);
    }
  }

  const datePart = trimmed.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  return null;
}

/**
 * Quá hạn = dueDate < hôm nay và chưa nộp (không phải Submitted / Reviewed).
 */
export function isHomeworkOverdue(
  dueDate?: string | null,
  status?: HomeworkSubmissionStatus | null,
  todayYyyyMmDd: string = toLocalYyyyMmDd(new Date())
): boolean {
  if (status === 'Submitted' || status === 'Reviewed') return false;
  const dueYyyyMmDd = extractLocalYyyyMmDd(dueDate);
  if (!dueYyyyMmDd) return false;
  return dueYyyyMmDd < todayYyyyMmDd;
}

export const EXAM_TYPE_OPTIONS: ReadonlyArray<{
  value: ExamType;
  label: string;
}> = [
  { value: 'Quiz', label: 'Kiểm tra ngắn' },
  { value: 'Midterm', label: 'Giữa kỳ' },
  { value: 'Final', label: 'Cuối kỳ' },
  { value: 'Daily', label: 'Thường xuyên' },
  { value: 'Other', label: 'Khác' },
];

export function getExamTypeLabel(examType?: string | null): string {
  switch (examType) {
    case 'Quiz':
      return 'Kiểm tra ngắn';
    case 'Midterm':
      return 'Giữa kỳ';
    case 'Final':
      return 'Cuối kỳ';
    case 'Daily':
      return 'Thường xuyên';
    case 'Other':
      return 'Khác';
    default:
      return examType || 'Khác';
  }
}

export function getTuitionStatusMeta(status?: string | null): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'Paid':
      return { label: 'Đã đóng đủ', variant: 'emerald' };
    case 'PartiallyPaid':
      return { label: 'Đóng một phần', variant: 'blue' };
    case 'Overdue':
      return { label: 'Quá hạn', variant: 'rose' };
    case 'Cancelled':
      return { label: 'Đã hủy', variant: 'neutral' };
    case 'Unpaid':
    default:
      return { label: 'Chưa đóng', variant: 'amber' };
  }
}

export function getPaymentStatusMeta(status?: string | null): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'Confirmed':
      return { label: 'Đã xác nhận', variant: 'emerald' };
    case 'Rejected':
      return { label: 'Bị từ chối', variant: 'rose' };
    case 'PendingConfirm':
    default:
      return { label: 'Chờ xác nhận', variant: 'amber' };
  }
}

export function getLeaveRequestStatusMeta(status?: string | null): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'Approved':
      return { label: 'Đã duyệt', variant: 'emerald' };
    case 'Rejected':
      return { label: 'Từ chối', variant: 'rose' };
    case 'Cancelled':
      return { label: 'Đã hủy', variant: 'neutral' };
    case 'Pending':
    default:
      return { label: 'Chờ duyệt', variant: 'amber' };
  }
}
