import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  attachAttendanceForSchedules,
  fetchActiveClassIdsForStudent,
  fetchStudentAttendanceForSchedule,
  fetchStudentSchedules,
} from '@/api/academicApi';
import {
  AlertTriangleOutlineIcon,
  CalendarOutlineIcon,
  ChevronLeftOutlineIcon,
  ChevronRightOutlineIcon,
  ClipboardCheckOutlineIcon,
  ClockOutlineIcon,
  CloseOutlineIcon,
  MapPinOutlineIcon,
  RefreshOutlineIcon,
  UserOutlineIcon,
} from '@/components/icons';
import { Badge, Card, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/authContext';
import {
  addDays,
  formatDateDdMmYyyy,
  formatDateShortDdMm,
  formatTimeRange,
  getAttendanceBadgeMeta,
  getMondayOfWeek,
  getScheduleStatusMeta,
  toLocalYyyyMmDd,
  type AttendanceStatusType,
  type ScheduleDto,
  type ScheduleWithAttendance,
} from '@/types/academic';

type SubViewType = 'week' | 'history30';

const WEEKDAY_LABELS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
];

export default function SchedulesPage() {
  const { activeStudent, studentsLoading } = useAuth();
  const [subView, setSubView] = useState<SubViewType>('week');

  // State cho Lịch theo tuần (Thứ 2 -> Chủ nhật)
  const [weekMonday, setWeekMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState('');
  const [weekSchedules, setWeekSchedules] = useState<ScheduleDto[]>([]);

  // Modal chi tiết buổi học
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDto | null>(
    null
  );
  const [modalAttLoading, setModalAttLoading] = useState(false);
  const [modalAttStatus, setModalAttStatus] =
    useState<AttendanceStatusType>(null);
  const [modalAttNote, setModalAttNote] = useState<string | null>(null);

  // State cho Lịch sử điểm danh 30 ngày qua
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyItems, setHistoryItems] = useState<ScheduleWithAttendance[]>(
    []
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const dateObj = addDays(weekMonday, idx);
      const dateStr = toLocalYyyyMmDd(dateObj);
      return {
        label: WEEKDAY_LABELS[idx],
        dateObj,
        dateStr,
        shortDate: formatDateShortDdMm(dateStr),
        fullDate: formatDateDdMmYyyy(dateStr),
      };
    });
  }, [weekMonday]);

  const weekRangeLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.shortDate} – ${last.fullDate}`;
  }, [weekDays]);

  const todayStr = toLocalYyyyMmDd(new Date());

  const loadWeeklySchedules = useCallback(async () => {
    if (!activeStudent) {
      setWeekSchedules([]);
      return;
    }

    setWeekLoading(true);
    setWeekError('');
    try {
      const mondayStr = toLocalYyyyMmDd(weekMonday);
      const sundayStr = toLocalYyyyMmDd(addDays(weekMonday, 6));
      const activeClassIds = await fetchActiveClassIdsForStudent(
        activeStudent.id
      );
      const list = await fetchStudentSchedules({
        fromDate: mondayStr,
        toDate: sundayStr,
        activeClassIds,
      });
      setWeekSchedules(list);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      setWeekError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể tải lịch học theo tuần. Vui lòng thử lại.'
      );
    } finally {
      setWeekLoading(false);
    }
  }, [activeStudent, weekMonday]);

  const loadAttendanceHistory30Days = useCallback(async () => {
    if (!activeStudent) {
      setHistoryItems([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');
    try {
      const now = new Date();
      const from30Str = toLocalYyyyMmDd(addDays(now, -30));
      const yesterdayStr = toLocalYyyyMmDd(addDays(now, -1));

      const activeClassIds = await fetchActiveClassIdsForStudent(
        activeStudent.id
      );
      const rawSchedules = await fetchStudentSchedules({
        fromDate: from30Str,
        toDate: yesterdayStr,
        activeClassIds,
      });

      // Sắp xếp mới nhất lên đầu (studyDate giảm dần, startTime giảm dần)
      const sortedDesc = [...rawSchedules].sort((a, b) => {
        const dateCmp = (b.studyDate || '').localeCompare(a.studyDate || '');
        if (dateCmp !== 0) return dateCmp;
        return (b.startTime || '').localeCompare(a.startTime || '');
      });

      const withAtt = await attachAttendanceForSchedules(
        sortedDesc,
        activeStudent.id
      );
      setHistoryItems(withAtt);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      setHistoryError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể tải lịch sử điểm danh 30 ngày qua. Vui lòng thử lại.'
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [activeStudent]);

  useEffect(() => {
    if (!studentsLoading && subView === 'week') {
      loadWeeklySchedules();
    }
  }, [studentsLoading, subView, loadWeeklySchedules]);

  useEffect(() => {
    if (!studentsLoading && subView === 'history30') {
      loadAttendanceHistory30Days();
    }
  }, [studentsLoading, subView, loadAttendanceHistory30Days]);

  const handleOpenScheduleDetail = async (sched: ScheduleDto) => {
    setSelectedSchedule(sched);
    setModalAttStatus(null);
    setModalAttNote(null);

    if (sched.hasAttendance && activeStudent) {
      setModalAttLoading(true);
      try {
        const att = await fetchStudentAttendanceForSchedule(
          sched.id,
          activeStudent.id
        );
        if (att) {
          setModalAttStatus(att.status ?? null);
          setModalAttNote(att.note ?? null);
        }
      } catch {
        setModalAttStatus(null);
      } finally {
        setModalAttLoading(false);
      }
    } else {
      setModalAttLoading(false);
    }
  };

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

  return (
    <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
      {/* Header trang Lịch học & Điểm danh + Sub-tab chuyển chế độ */}
      <Card large className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              THỜI KHÓA BIỂU &amp; CHUYÊN CẦN
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-ink">
              Lịch học của {activeStudent.fullName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              Xem lịch học theo tuần và tra cứu lịch sử điểm danh 30 ngày qua.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-teal">
            <CalendarOutlineIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Sub-tab Segmented Control: Lịch theo tuần vs Lịch sử điểm danh (30 ngày) */}
        <div
          role="tablist"
          aria-label="Chế độ xem lịch học và điểm danh"
          className="grid grid-cols-2 gap-1.5 rounded-pill border border-line bg-surface-subtle p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'week'}
            onClick={() => setSubView('week')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              subView === 'week'
                ? 'bg-teal text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <CalendarOutlineIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Lịch theo tuần</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'history30'}
            onClick={() => setSubView('history30')}
            className={`flex min-h-[38px] items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              subView === 'history30'
                ? 'bg-teal text-white shadow-xs'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <ClipboardCheckOutlineIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Điểm danh (30 ngày)</span>
          </button>
        </div>
      </Card>

      {/* ==================== CHẾ ĐỘ 1: LỊCH THEO TUẦN ==================== */}
      {subView === 'week' && (
        <>
          {/* Thanh điều hướng tuần: Tuần trước - Tuần này - Tuần sau */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-ink-muted">
                  Khoảng thời gian (Thứ 2 – Chủ nhật)
                </p>
                <p className="mt-0.5 text-sm font-bold text-ink tabular-nums">
                  {weekRangeLabel}
                </p>
              </div>
              <Badge variant="gold">{weekSchedules.length} buổi</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWeekMonday((prev) => addDays(prev, -7))}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-teal hover:bg-mint-canvas active:scale-[0.98] transition-all cursor-pointer"
              >
                <ChevronLeftOutlineIcon className="h-3.5 w-3.5" />
                <span>Tuần trước</span>
              </button>
              <button
                type="button"
                onClick={() => setWeekMonday(getMondayOfWeek(new Date()))}
                className="inline-flex min-h-[38px] items-center justify-center rounded-pill border border-gold/50 bg-gold-soft px-3 py-1.5 text-xs font-bold text-teal hover:bg-gold/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => setWeekMonday((prev) => addDays(prev, 7))}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-teal hover:bg-mint-canvas active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Tuần sau</span>
                <ChevronRightOutlineIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>

          {weekError && (
            <Card className="border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangleOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-rose-900">
                    Lỗi tải lịch học tuần
                  </p>
                  <p className="mt-0.5 leading-relaxed">{weekError}</p>
                </div>
              </div>
              <SecondaryButton
                onClick={loadWeeklySchedules}
                disabled={weekLoading}
                className="w-full min-h-[38px] py-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </SecondaryButton>
            </Card>
          )}

          {weekLoading ? (
            <div className="space-y-3">
              <Card className="p-4 animate-pulse space-y-2">
                <div className="h-4 w-32 rounded bg-line" />
                <div className="h-16 w-full rounded-card bg-surface-subtle" />
              </Card>
              <Card className="p-4 animate-pulse space-y-2">
                <div className="h-4 w-32 rounded bg-line" />
                <div className="h-16 w-full rounded-card bg-surface-subtle" />
              </Card>
            </div>
          ) : (
            <div className="space-y-3">
              {weekDays.map((day) => {
                const isToday = day.dateStr === todayStr;
                const daySchedules = weekSchedules
                  .filter(
                    (s) => (s.studyDate || '').split('T')[0] === day.dateStr
                  )
                  .sort((a, b) =>
                    (a.startTime || '').localeCompare(b.startTime || '')
                  );

                return (
                  <Card
                    key={day.dateStr}
                    className={`p-4 space-y-3 ${
                      isToday ? 'border-gold ring-1 ring-gold/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">
                          {day.label}
                        </span>
                        <span className="text-xs text-ink-secondary tabular-nums">
                          ({day.fullDate})
                        </span>
                        {isToday && (
                          <Badge variant="gold" className="px-2 py-0">
                            Hôm nay
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-ink-muted">
                        {daySchedules.length > 0
                          ? `${daySchedules.length} buổi`
                          : 'Trống'}
                      </span>
                    </div>

                    {daySchedules.length === 0 ? (
                      <p className="py-1 text-xs text-ink-muted">
                        Không có buổi học
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {daySchedules.map((sched) => {
                          const statusMeta = getScheduleStatusMeta(
                            sched.status
                          );
                          const teacherName =
                            sched.substituteTeacherName ||
                            sched.mainTeacherName ||
                            'Chưa phân công';

                          return (
                            <button
                              key={sched.id}
                              type="button"
                              onClick={() => handleOpenScheduleDetail(sched)}
                              className="w-full rounded-card border border-line/90 bg-surface-subtle p-3.5 text-left hover:border-gold active:scale-[0.99] transition-all cursor-pointer space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-teal truncate">
                                  {sched.className}
                                </p>
                                <Badge
                                  variant={statusMeta.variant}
                                  className="shrink-0"
                                >
                                  {statusMeta.label}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                                <span className="inline-flex items-center gap-1 font-semibold text-ink tabular-nums">
                                  <ClockOutlineIcon className="h-3.5 w-3.5 text-teal" />
                                  {formatTimeRange(
                                    sched.startTime,
                                    sched.endTime
                                  )}
                                </span>
                                {sched.room && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPinOutlineIcon className="h-3.5 w-3.5 text-teal" />
                                    Phòng {sched.room}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px] text-ink-secondary">
                                <span className="truncate">
                                  GV: <strong className="text-ink">{teacherName}</strong>
                                  {sched.substituteTeacherName
                                    ? ' (Dạy thay)'
                                    : ''}
                                </span>
                                <span className="font-semibold text-teal shrink-0">
                                  Chi tiết →
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== CHẾ ĐỘ 2: LỊCH SỬ ĐIỂM DANH 30 NGÀY QUA ==================== */}
      {subView === 'history30' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink">
                Lịch sử điểm danh 30 ngày qua
              </h3>
              <p className="text-[11px] text-ink-muted">
                {formatDateDdMmYyyy(toLocalYyyyMmDd(addDays(new Date(), -30)))} –{' '}
                {formatDateDdMmYyyy(toLocalYyyyMmDd(addDays(new Date(), -1)))} (Mới nhất lên đầu)
              </p>
            </div>
            <Badge variant="gold">{historyItems.length} buổi</Badge>
          </div>

          {historyError && (
            <div className="rounded-card border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangleOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="flex-1">{historyError}</span>
              </div>
              <SecondaryButton
                onClick={loadAttendanceHistory30Days}
                disabled={historyLoading}
                className="w-full min-h-[36px] py-1.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </SecondaryButton>
            </div>
          )}

          {historyLoading ? (
            <div className="space-y-2.5 py-2">
              <div className="h-16 w-full animate-pulse rounded-card bg-surface-subtle" />
              <div className="h-16 w-full animate-pulse rounded-card bg-surface-subtle" />
              <div className="h-16 w-full animate-pulse rounded-card bg-surface-subtle" />
            </div>
          ) : historyItems.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-surface-subtle px-4 py-8 text-center">
              <p className="text-xs font-medium text-ink-secondary">
                Chưa có buổi học nào trong 30 ngày qua
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {historyItems.map((item) => {
                const attBadge = getAttendanceBadgeMeta(
                  item.studentAttendanceStatus,
                  item.hasAttendance
                );
                return (
                  <div
                    key={item.id}
                    className="rounded-card border border-line/80 bg-surface-subtle p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-teal truncate">
                          {item.className}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-secondary tabular-nums">
                          <span className="font-semibold text-ink">
                            {formatDateDdMmYyyy(item.studyDate)}
                          </span>
                          <span>•</span>
                          <span>
                            {formatTimeRange(item.startTime, item.endTime)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={attBadge.variant} className="shrink-0">
                        {attBadge.label}
                      </Badge>
                    </div>

                    {item.studentAttendanceNote && (
                      <p className="border-t border-line/60 pt-2 text-[11px] text-ink-secondary">
                        Nhận xét điểm danh: {item.studentAttendanceNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ==================== MODAL CHI TIẾT BUỔI HỌC ==================== */}
      {selectedSchedule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-deep/45 backdrop-blur-[2px] p-4"
          onClick={() => setSelectedSchedule(null)}
        >
          <div
            className="modal-panel w-full max-w-md rounded-card-lg border border-line bg-surface p-5 shadow-modal space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 pb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  CHI TIẾT BUỔI HỌC
                </p>
                <h3
                  id="schedule-detail-title"
                  className="mt-0.5 text-base font-bold text-teal"
                >
                  {selectedSchedule.className}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                aria-label="Đóng chi tiết buổi học"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-secondary hover:bg-mint-canvas cursor-pointer"
              >
                <CloseOutlineIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Ngày học</span>
                <span className="font-semibold text-ink tabular-nums">
                  {formatDateDdMmYyyy(selectedSchedule.studyDate)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Khung giờ</span>
                <span className="font-semibold text-ink tabular-nums">
                  {formatTimeRange(
                    selectedSchedule.startTime,
                    selectedSchedule.endTime
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Phòng học</span>
                <span className="font-semibold text-ink">
                  {selectedSchedule.room || 'Chưa xếp phòng'}
                </span>
              </div>

              {selectedSchedule.branchName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-secondary">Cơ sở</span>
                  <span className="font-semibold text-ink">
                    {selectedSchedule.branchName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Giáo viên chính</span>
                <span className="font-semibold text-ink">
                  {selectedSchedule.mainTeacherName || '—'}
                </span>
              </div>

              {selectedSchedule.substituteTeacherName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-secondary">Giáo viên dạy thay</span>
                  <span className="font-semibold text-teal">
                    {selectedSchedule.substituteTeacherName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Trạng thái buổi học</span>
                <Badge
                  variant={
                    getScheduleStatusMeta(selectedSchedule.status).variant
                  }
                >
                  {getScheduleStatusMeta(selectedSchedule.status).label}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-2.5">
                <span className="text-ink-secondary">
                  Điểm danh ({activeStudent.fullName})
                </span>
                {modalAttLoading ? (
                  <span className="text-ink-muted">Đang kiểm tra...</span>
                ) : (
                  <Badge
                    variant={
                      getAttendanceBadgeMeta(
                        modalAttStatus,
                        selectedSchedule.hasAttendance
                      ).variant
                    }
                  >
                    {
                      getAttendanceBadgeMeta(
                        modalAttStatus,
                        selectedSchedule.hasAttendance
                      ).label
                    }
                  </Badge>
                )}
              </div>

              {modalAttNote && (
                <div className="rounded-card border border-line bg-surface-subtle p-3 text-ink-secondary">
                  <p className="text-[11px] font-semibold text-ink">
                    Nhận xét điểm danh:
                  </p>
                  <p className="mt-0.5 leading-relaxed">{modalAttNote}</p>
                </div>
              )}

              {selectedSchedule.note && (
                <div className="rounded-card border border-line bg-surface-subtle p-3 text-ink-secondary">
                  <p className="text-[11px] font-semibold text-ink">
                    Ghi chú buổi học:
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {selectedSchedule.note}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-line/70">
              <SecondaryButton
                onClick={() => setSelectedSchedule(null)}
                className="w-full min-h-[40px] py-2 text-xs"
              >
                Đóng
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
