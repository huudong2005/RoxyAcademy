import React, { useCallback, useEffect, useState } from 'react';
import {
  attachAttendanceForSchedules,
  fetchActiveClassIdsForStudent,
  fetchCurrentMonthTuitionsForStudent,
  fetchStudentSchedules,
  fetchUpcomingHomeworksForStudent,
} from '@/api/academicApi';
import {
  AlertTriangleOutlineIcon,
  BookOutlineIcon,
  CalendarOutlineIcon,
  ClockOutlineIcon,
  HomeOutlineIcon,
  MapPinOutlineIcon,
  RefreshOutlineIcon,
  UserOutlineIcon,
  WalletOutlineIcon,
} from '@/components/icons';
import { Badge, Card, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/authContext';
import {
  addDays,
  formatDateDdMmYyyy,
  formatTimeRange,
  formatVnd,
  getAttendanceBadgeMeta,
  getScheduleStatusMeta,
  toLocalYearMonth,
  toLocalYyyyMmDd,
  type HomeworkDto,
  type ScheduleWithAttendance,
  type TuitionDto,
} from '@/types/academic';

export default function TodayPage() {
  const { activeStudent, studentsLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [todaySchedules, setTodaySchedules] = useState<ScheduleWithAttendance[]>([]);
  const [upcomingHomeworks, setUpcomingHomeworks] = useState<HomeworkDto[]>([]);
  const [monthTuitions, setMonthTuitions] = useState<TuitionDto[]>([]);

  const loadTodayOverview = useCallback(async () => {
    if (!activeStudent) {
      setTodaySchedules([]);
      setUpcomingHomeworks([]);
      setMonthTuitions([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const todayStr = toLocalYyyyMmDd(now);
      const next7DaysStr = toLocalYyyyMmDd(addDays(now, 7));
      const currentYearMonth = toLocalYearMonth(now);

      const activeClassIds = await fetchActiveClassIdsForStudent(activeStudent.id);

      const [rawSchedules, homeworks, tuitions] = await Promise.all([
        fetchStudentSchedules({
          fromDate: todayStr,
          toDate: todayStr,
          activeClassIds,
        }),
        fetchUpcomingHomeworksForStudent({
          dueDateFrom: `${todayStr}T00:00:00`,
          dueDateTo: `${next7DaysStr}T23:59:59`,
          activeClassIds,
        }),
        fetchCurrentMonthTuitionsForStudent(activeStudent.id, currentYearMonth),
      ]);

      const sortedSchedules = [...rawSchedules].sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
      );
      const schedulesWithAtt = await attachAttendanceForSchedules(
        sortedSchedules,
        activeStudent.id
      );

      setTodaySchedules(schedulesWithAtt);
      setUpcomingHomeworks(homeworks);
      setMonthTuitions(tuitions);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      setError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg.trim()
          : 'Không thể tải dữ liệu tổng quan hôm nay. Vui lòng kiểm tra kết nối và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeStudent]);

  useEffect(() => {
    if (!studentsLoading) {
      loadTodayOverview();
    }
  }, [studentsLoading, loadTodayOverview]);

  const now = new Date();
  const todayDisplay = formatDateDdMmYyyy(toLocalYyyyMmDd(now));
  const currentMonthLabel = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const totalMustPay = monthTuitions.reduce(
    (sum, t) => sum + (Number(t.finalAmount) || 0),
    0
  );
  const totalPaid = monthTuitions.reduce(
    (sum, t) => sum + (Number(t.paidAmount) || 0),
    0
  );
  const totalRemaining = monthTuitions.reduce(
    (sum, t) => sum + (Number(t.remainingAmount) || 0),
    0
  );

  if (studentsLoading) {
    return (
      <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
        <Card large className="p-5 animate-pulse space-y-3">
          <div className="h-3 w-28 rounded bg-line" />
          <div className="h-6 w-48 rounded bg-line" />
          <div className="h-12 w-full rounded-card bg-surface-subtle" />
        </Card>
        <Card className="p-5 animate-pulse space-y-3">
          <div className="h-4 w-36 rounded bg-line" />
          <div className="h-16 w-full rounded-card bg-surface-subtle" />
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
      {/* Khối Header tổng quan ngày hôm nay */}
      <Card large className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              BẢNG TIN HÔM NAY • {todayDisplay}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-ink">
              Hôm nay của {activeStudent.fullName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              Tổng hợp lịch học, điểm danh, bài tập sắp tới hạn và học phí trong tháng.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-teal">
            <HomeOutlineIcon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-line/80 bg-surface-subtle px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted">Học viên đang theo dõi</p>
            <p className="truncate text-xs font-semibold text-ink">
              {activeStudent.fullName}
              {activeStudent.branchName ? ` • ${activeStudent.branchName}` : ''}
            </p>
          </div>
          <Badge variant="gold">Mã #{activeStudent.id}</Badge>
        </div>
      </Card>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <Card className="border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangleOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-rose-900">
                Không thể đồng bộ dữ liệu
              </p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <SecondaryButton
            onClick={loadTodayOverview}
            disabled={loading}
            className="w-full min-h-[38px] py-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
          >
            <RefreshOutlineIcon className="h-3.5 w-3.5" />
            <span>Thử lại</span>
          </SecondaryButton>
        </Card>
      )}

      {/* Khối 1 & 2: Lịch học hôm nay + Trạng thái điểm danh của từng buổi */}
      <Card className="p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft border border-gold/30 text-teal">
              <CalendarOutlineIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                Lịch học &amp; Điểm danh hôm nay
              </h3>
              <p className="text-[11px] text-ink-muted">
                Ngày {todayDisplay}
              </p>
            </div>
          </div>
          <Badge variant="gold">{todaySchedules.length} buổi</Badge>
        </div>

        {loading ? (
          <div className="space-y-2.5 py-2">
            <div className="h-20 w-full animate-pulse rounded-card bg-surface-subtle" />
          </div>
        ) : todaySchedules.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface-subtle px-4 py-6 text-center">
            <p className="text-xs font-medium text-ink-secondary">
              Hôm nay con không có lịch học
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySchedules.map((sched) => {
              const attBadge = getAttendanceBadgeMeta(
                sched.studentAttendanceStatus,
                sched.hasAttendance
              );
              const schedStatus = getScheduleStatusMeta(sched.status);
              const teacherDisplay =
                sched.substituteTeacherName ||
                sched.mainTeacherName ||
                'Chưa phân công';

              return (
                <div
                  key={sched.id}
                  className="rounded-card border border-line/80 bg-surface-subtle p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-teal truncate">
                        {sched.className}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                        <span className="inline-flex items-center gap-1 font-semibold text-ink tabular-nums">
                          <ClockOutlineIcon className="h-3.5 w-3.5 text-teal" />
                          {formatTimeRange(sched.startTime, sched.endTime)}
                        </span>
                        {sched.room && (
                          <span className="inline-flex items-center gap-1">
                            <MapPinOutlineIcon className="h-3.5 w-3.5 text-teal" />
                            Phòng {sched.room}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={attBadge.variant} className="shrink-0">
                      {attBadge.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11px] text-ink-secondary">
                    <span className="inline-flex items-center gap-1 truncate">
                      <UserOutlineIcon className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                      <span>
                        GV: <strong className="text-ink">{teacherDisplay}</strong>
                        {sched.substituteTeacherName ? ' (Dạy thay)' : ''}
                      </span>
                    </span>
                    <Badge variant={schedStatus.variant}>
                      {schedStatus.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Khối 3: Bài tập tới hạn (7 ngày tới) */}
      <Card className="p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft border border-gold/30 text-teal">
              <BookOutlineIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                Bài tập tới hạn
              </h3>
              <p className="text-[11px] text-ink-muted">
                Trong 7 ngày tới
              </p>
            </div>
          </div>
          <Badge variant="neutral">{upcomingHomeworks.length} bài</Badge>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            <div className="h-14 w-full animate-pulse rounded-card bg-surface-subtle" />
          </div>
        ) : upcomingHomeworks.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface-subtle px-4 py-6 text-center">
            <p className="text-xs font-medium text-ink-secondary">
              Không có bài tập sắp đến hạn
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingHomeworks.map((hw) => (
              <div
                key={hw.id}
                className="flex items-start justify-between gap-3 rounded-card border border-line/80 bg-surface-subtle p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink truncate">
                    {hw.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-secondary truncate">
                    Lớp: {hw.className}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                    Hạn nộp
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-teal tabular-nums">
                    {formatDateDdMmYyyy(hw.dueDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Khối 4: Học phí tháng này */}
      <Card className="p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft border border-gold/30 text-teal">
              <WalletOutlineIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">
                Học phí tháng này
              </h3>
              <p className="text-[11px] text-ink-muted">
                Tháng {currentMonthLabel}
              </p>
            </div>
          </div>
          {monthTuitions.length > 0 && (
            <Badge variant={totalRemaining > 0 ? 'amber' : 'emerald'}>
              {totalRemaining > 0 ? 'Còn khoản cần đóng' : 'Đã hoàn tất'}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            <div className="h-20 w-full animate-pulse rounded-card bg-surface-subtle" />
          </div>
        ) : monthTuitions.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface-subtle px-4 py-6 text-center">
            <p className="text-xs font-medium text-ink-secondary">
              Chưa có khoản học phí tháng này
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-card border border-line/80 bg-surface-subtle p-3">
              <p className="text-[11px] font-medium text-ink-muted">
                Tổng phải đóng
              </p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-ink tabular-nums">
                {formatVnd(totalMustPay)}
              </p>
            </div>
            <div className="rounded-card border border-emerald-200/80 bg-emerald-50/50 p-3">
              <p className="text-[11px] font-medium text-emerald-800">
                Đã đóng
              </p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-emerald-700 tabular-nums">
                {formatVnd(totalPaid)}
              </p>
            </div>
            <div
              className={`rounded-card border p-3 ${
                totalRemaining > 0
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-line/80 bg-surface-subtle'
              }`}
            >
              <p
                className={`text-[11px] font-medium ${
                  totalRemaining > 0 ? 'text-amber-800' : 'text-ink-muted'
                }`}
              >
                Còn nợ
              </p>
              <p
                className={`mt-1 text-xs sm:text-sm font-bold tabular-nums ${
                  totalRemaining > 0 ? 'text-amber-800' : 'text-ink'
                }`}
              >
                {formatVnd(totalRemaining)}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
