import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatCurrency } from '../utils/formatters';

const SCHEDULE_STATUS_MAP = {
  Scheduled: {
    label: 'Chưa diễn ra',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  Completed: {
    label: 'Đã hoàn thành',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Cancelled: {
    label: 'Đã hủy',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse" aria-busy="true" aria-label="Đang tải dữ liệu tổng quan">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-7 w-64 rounded-lg bg-slate-200" />
            <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-lg bg-slate-200" />
            <div className="h-9 w-32 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-slate-200" />
              <div className="h-6 w-6 rounded-md bg-slate-100" />
            </div>
            <div className="h-8 w-16 rounded-md bg-slate-200" />
            <div className="h-3 w-36 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="h-2.5 w-full rounded-full bg-slate-100" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-14 rounded-xl bg-slate-100" />
              <div className="h-14 rounded-xl bg-slate-100" />
              <div className="h-14 rounded-xl bg-slate-100" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
              <div className="h-16 rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : { fullName: '', role: '' };
    } catch (e) {
      console.warn('Lỗi đọc user tại Dashboard:', e);
      return { fullName: '', role: '' };
    }
  });

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const role = user.role || '';
  const isSuperAdmin = role === 'SuperAdmin';
  const isBranchManager = role === 'BranchManager';
  const isStaff = isSuperAdmin || isBranchManager;
  const isTeacher = role === 'Teacher';
  const isParent = role === 'Parent';
  const isStudent = role === 'Student';
  const isFamily = isParent || isStudent;

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const res = await axiosClient.get('/Dashboard/summary', {
          signal: controller.signal,
        });
        setSummary(res.data);
        setError('');
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          'Không thể tải dữ liệu tổng quan từ máy chủ. Vui lòng thử lại.';
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSummary();
    return () => controller.abort();
  }, [reloadKey]);

  const todayStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !summary) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-xl text-rose-600">
            ⚠️
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            Không tải được bảng tổng quan
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            {error || 'Dữ liệu tổng quan hiện không khả dụng.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.97] transition-transform duration-150 ease-out cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const overview = summary.overview || {};
  const tuition = !isTeacher ? summary.tuition : null;
  const todayAttendance = summary.todayAttendance || {
    totalExpected: 0,
    present: 0,
    late: 0,
    excusedAbsent: 0,
    unexcusedAbsent: 0,
  };
  const todaySchedules = Array.isArray(summary.todaySchedules) ? summary.todaySchedules : [];

  const showTeachersCard =
    isStaff && overview.activeTeachers !== null && overview.activeTeachers !== undefined;

  const overviewCards = [
    {
      key: 'students',
      title: isParent
        ? 'Con đang theo học'
        : isStudent
        ? 'Hồ sơ của tôi'
        : 'Học viên đang học',
      value: overview.activeStudents ?? 0,
      note: isParent
        ? 'Học viên đang theo học'
        : isStudent
        ? 'Hồ sơ đang kích hoạt'
        : 'Trạng thái Đang học',
      icon: '🎓',
      accent: 'border-l-blue-500',
      to: isFamily ? '/students' : '/students?status=Active',
    },
    {
      key: 'classes',
      title: isFamily
        ? 'Lớp đang học'
        : isTeacher
        ? 'Lớp đang phụ trách'
        : 'Lớp đang mở',
      value: overview.ongoingClasses ?? 0,
      note:
        (overview.upcomingClasses ?? 0) > 0
          ? `${overview.upcomingClasses} lớp sắp mở`
          : 'Đang diễn ra',
      icon: '🏫',
      accent: 'border-l-emerald-500',
      to: '/classes?status=Ongoing',
    },
    ...(showTeachersCard
      ? [
          {
            key: 'teachers',
            title: 'Giáo viên',
            value: overview.activeTeachers ?? 0,
            note: isBranchManager
              ? 'Đang công tác tại cơ sở'
              : 'Đang công tác toàn hệ thống',
            icon: '👩‍🏫',
            accent: 'border-l-indigo-500',
            to: null,
          },
        ]
      : []),
    {
      key: 'leaves',
      title: 'Đơn xin nghỉ chờ duyệt',
      value: overview.pendingLeaveRequests ?? 0,
      note:
        (overview.pendingLeaveRequests ?? 0) > 0
          ? 'Đang chờ xử lý'
          : 'Không có đơn chờ duyệt',
      icon: '📝',
      accent: 'border-l-amber-500',
      to: '/leave-requests?status=Pending',
    },
  ];

  const tuitionPercent =
    tuition && tuition.totalExpected > 0
      ? Math.min(100, Math.round((tuition.totalPaid / tuition.totalExpected) * 100))
      : 0;

  const defaultDisplayName = isParent
    ? 'Quý Phụ huynh'
    : isStudent
    ? 'Bạn'
    : 'Quý Thầy/Cô';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner Chào Mừng */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Chào mừng trở lại, {user.fullName || defaultDisplayName}!
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500">
              {todayStr} • Hệ thống quản lý học tập Roxy Academy
            </p>
          </div>

          {isStaff && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/students"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.97] transition-transform duration-150 ease-out"
              >
                <span>+ Xem Học viên</span>
              </Link>
              <Link
                to="/classes"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 active:scale-[0.97] transition-transform duration-150 ease-out"
              >
                <span>Quản lý Lớp học</span>
              </Link>
            </div>
          )}

          {isTeacher && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/attendance"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.97] transition-transform duration-150 ease-out"
              >
                <span>Điểm danh hôm nay</span>
              </Link>
              <Link
                to="/schedules"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 active:scale-[0.97] transition-transform duration-150 ease-out"
              >
                <span>Xem Lịch dạy</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Khối Tổng Quan */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          showTeachersCard ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-4`}
      >
        {overviewCards.map((card) => {
          const cardContent = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <span className="text-lg" aria-hidden="true">
                  {card.icon}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {card.value}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">{card.note}</p>
                {card.to && (
                  <span className="text-[11px] font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform duration-150 ease-out">
                    Chi tiết →
                  </span>
                )}
              </div>
            </>
          );

          if (!card.to) {
            return (
              <div
                key={card.key}
                className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-l-4 ${card.accent}`}
              >
                {cardContent}
              </div>
            );
          }

          return (
            <Link
              key={card.key}
              to={card.to}
              className={`group block rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-l-4 ${card.accent} hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-transform duration-150 ease-out`}
            >
              {cardContent}
            </Link>
          );
        })}
      </div>

      {/* Khối Chi Tiết: Học phí + Điểm danh + Lịch học hôm nay */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột Trái: Học phí tháng này & Điểm danh hôm nay */}
        <div className="lg:col-span-5 space-y-6">
          {tuition && (
            <Link
              to="/tuitions?status=Unpaid"
              className="group block rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-transform duration-150 ease-out"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    Học phí tháng {tuition.month}/{tuition.year}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isFamily ? 'Tổng hợp học phí trong tháng' : 'Tình hình thu học phí tháng này'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 tabular-nums">
                  {tuitionPercent}%
                </span>
              </div>

              {/* Thanh tiến độ thu học phí */}
              <div className="mt-4">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
                    style={{ width: `${tuitionPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3">
                  <p className="text-[11px] font-medium text-emerald-700">Đã thu</p>
                  <p className="mt-1 text-sm font-bold text-emerald-900 tabular-nums">
                    {formatCurrency(tuition.totalPaid)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3">
                  <p className="text-[11px] font-medium text-amber-700">Chưa thu</p>
                  <p className="mt-1 text-sm font-bold text-amber-900 tabular-nums">
                    {formatCurrency(tuition.totalRemaining)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                  <p className="text-[11px] font-medium text-slate-600">Tổng phải thu</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(tuition.totalExpected)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform duration-150 ease-out">
                  Xem khoản chưa thu →
                </span>
              </div>
            </Link>
          )}

          {tuition && (
            <Link
              to="/tuitions?status=Overdue"
              className="group block rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-transform duration-150 ease-out"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">
                    Học phí quá hạn (tất cả các tháng)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tổng hợp các khoản đã quá hạn thanh toán
                  </p>
                </div>
                {(tuition.overdueTuitionCount ?? 0) > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 tabular-nums shrink-0">
                    {tuition.overdueTuitionCount ?? 0} khoản
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 shrink-0">
                    Không có nợ quá hạn
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                  <p className="text-[11px] font-medium text-slate-600">Số khoản quá hạn</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {tuition.overdueTuitionCount ?? 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    (tuition.overdueTuitionCount ?? 0) > 0
                      ? 'bg-rose-50/70 border-rose-100'
                      : 'bg-emerald-50/70 border-emerald-100'
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium ${
                      (tuition.overdueTuitionCount ?? 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    Tổng tiền quá hạn
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold tabular-nums ${
                      (tuition.overdueTuitionCount ?? 0) > 0 ? 'text-rose-900' : 'text-emerald-900'
                    }`}
                  >
                    {formatCurrency(tuition.overdueTuitionAmount ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform duration-150 ease-out">
                  Xem khoản quá hạn →
                </span>
              </div>
            </Link>
          )}

          {/* Điểm danh hôm nay */}
          <Link
            to="/attendance"
            className="group block rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-transform duration-150 ease-out"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm md:text-base font-semibold text-slate-900">
                  Điểm danh hôm nay
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  Tổng lượt dự kiến: <strong className="text-slate-700">{todayAttendance.totalExpected}</strong>
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform duration-150 ease-out">
                Mở điểm danh →
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                <p className="text-xs font-medium text-emerald-700">Có mặt</p>
                <p className="mt-1 text-xl font-bold text-emerald-900 tabular-nums">
                  {todayAttendance.present}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                <p className="text-xs font-medium text-amber-700">Đi muộn</p>
                <p className="mt-1 text-xl font-bold text-amber-900 tabular-nums">
                  {todayAttendance.late}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
                <p className="text-xs font-medium text-blue-700">Vắng có phép</p>
                <p className="mt-1 text-xl font-bold text-blue-900 tabular-nums">
                  {todayAttendance.excusedAbsent}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
                <p className="text-xs font-medium text-rose-700">Vắng không phép</p>
                <p className="mt-1 text-xl font-bold text-rose-900 tabular-nums">
                  {todayAttendance.unexcusedAbsent}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Cột Phải: Lịch học hôm nay */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm md:text-base font-semibold text-slate-900">
                  Lịch học hôm nay
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {todaySchedules.length > 0
                    ? `${todaySchedules.length} buổi học trong ngày`
                    : 'Không có lịch học trong ngày'}
                </p>
              </div>
              <Link
                to="/schedules"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Xem tất cả lịch →
              </Link>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
                  📅
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Hôm nay chưa có buổi học nào
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Các buổi học được xếp lịch trong ngày sẽ hiển thị tại đây để bạn theo dõi và điểm danh nhanh.
                </p>
                <Link
                  to="/schedules"
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-[0.97] transition-transform duration-150 ease-out"
                >
                  Xem Thời khóa biểu
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {todaySchedules.map((s) => {
                  const statusMeta = SCHEDULE_STATUS_MAP[s.status] || {
                    label: s.status || 'Chưa rõ',
                    className: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const targetUrl = isFamily
                    ? '/schedules'
                    : `/attendance?scheduleId=${s.id}`;

                  return (
                    <Link
                      key={s.id}
                      to={targetUrl}
                      className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 hover:border-blue-300 hover:bg-blue-50/30 active:scale-[0.995] transition-transform duration-150 ease-out"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="shrink-0 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-center shadow-2xs">
                          <p className="text-xs font-bold text-slate-900 tabular-nums">
                            {s.startTime}
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {s.endTime}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900 truncate">
                              {s.className}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {s.room && <span>Phòng: {s.room}</span>}
                            {s.branchName && <span>{s.branchName}</span>}
                            {s.teacherName && (
                              <span>
                                GV: {s.teacherName}
                                {s.isSubstitute ? ' (Dạy thay)' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 inline-block transition-transform duration-150 ease-out">
                          {isFamily ? 'Xem lịch →' : 'Điểm danh →'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
