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
}

export interface TuitionDto {
  id: number;
  studentId: number;
  studentName?: string | null;
  classId?: number | null;
  className?: string | null;
  title: string;
  amount: number;
  totalAmount?: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  isOverdue: boolean;
  dueDate?: string | null;
  isCancelled: boolean;
  note?: string | null;
  pendingAmount?: number;
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

export function formatVnd(amount?: number | null): string {
  const num = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return `${num.toLocaleString('vi-VN')} đ`;
}
