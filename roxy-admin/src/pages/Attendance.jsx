import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  SelectPill,
  Badge,
} from '../components/ui';

export default function Attendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Thông tin user đăng nhập
  const [currentUser] = useState(() => getStoredUser());

  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
  const isTeacher = currentUser.role === 'Teacher';

  // Format Date sang YYYY-MM-DD
  const formatDateISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = useMemo(() => formatDateISO(new Date()), []);

  // Ngày đang chọn (mặc định hôm nay)
  const [selectedDate, setSelectedDate] = useState(todayISO);

  // Buổi học trong ngày
  const [daySchedules, setDaySchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Buổi học đang chọn
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Danh sách học viên điểm danh
  const [records, setRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [reloadAttendanceKey, setReloadAttendanceKey] = useState(0);

  // Trạng thái lưu
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // 1. Khởi tạo: Nếu có ?scheduleId trên URL, lấy chi tiết buổi học để nhảy đúng ngày
  const urlScheduleId = searchParams.get('scheduleId');

  useEffect(() => {
    let ignore = false;
    if (urlScheduleId) {
      const fetchScheduleDetail = async () => {
        try {
          const res = await axiosClient.get(`/Schedules/${urlScheduleId}`);
          if (!ignore && res.data) {
            const studyDateStr = res.data.studyDate?.split('T')[0];
            if (studyDateStr) {
              setSelectedDate(studyDateStr);
            }
            setSelectedScheduleId(String(res.data.id));
            setSelectedSchedule(res.data);
          }
        } catch (err) {
          console.warn('Không tải được chi tiết buổi học từ URL scheduleId:', err);
        }
      };
      fetchScheduleDetail();
    }
    return () => {
      ignore = true;
    };
  }, [urlScheduleId]);

  // 2. Tải danh sách buổi học trong ngày selectedDate
  useEffect(() => {
    let ignore = false;

    const loadDaySchedules = async () => {
      setLoadingSchedules(true);
      setScheduleError('');
      try {
        const res = await axiosClient.get('/Schedules', {
          params: {
            fromDate: selectedDate,
            toDate: selectedDate,
          },
        });
        if (!ignore) {
          const items = res.data || [];
          setDaySchedules(items);

          if (items.length > 0) {
            // Nếu có selectedScheduleId và nằm trong danh sách ngày này thì giữ
            const found = items.find((s) => String(s.id) === String(selectedScheduleId));
            if (found) {
              setSelectedSchedule(found);
            } else {
              // Tự động chọn buổi học đầu tiên
              setSelectedScheduleId(String(items[0].id));
              setSelectedSchedule(items[0]);
              setSearchParams({ scheduleId: String(items[0].id) });
            }
          } else {
            setSelectedScheduleId('');
            setSelectedSchedule(null);
            setRecords([]);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi tải buổi học trong ngày:', err);
          setScheduleError('Không thể tải danh sách buổi học trong ngày này.');
        }
      } finally {
        if (!ignore) {
          setLoadingSchedules(false);
        }
      }
    };

    loadDaySchedules();

    return () => {
      ignore = true;
    };
  }, [selectedDate, selectedScheduleId, setSearchParams]);

  // Khi người dùng đổi buổi học từ dropdown
  const handleSelectSchedule = (e) => {
    const sId = e.target.value;
    setSelectedScheduleId(sId);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');

    if (sId) {
      setSearchParams({ scheduleId: sId });
      const found = daySchedules.find((s) => String(s.id) === String(sId));
      setSelectedSchedule(found || null);
    } else {
      setSelectedSchedule(null);
      setRecords([]);
      setSearchParams({});
    }
  };

  // 3. Tải danh sách điểm danh của buổi học selectedScheduleId
  useEffect(() => {
    let ignore = false;

    const loadAttendance = async () => {
      if (!selectedScheduleId) {
        setRecords([]);
        return;
      }
      setLoadingAttendance(true);
      setAttendanceError('');
      try {
        const res = await axiosClient.get('/Attendances', {
          params: { scheduleId: selectedScheduleId },
        });
        if (!ignore) {
          const data = res.data || [];
          setRecords(
            data.map((item) => ({
              ...item,
              status: item.status || null,
              note: item.note || '',
            }))
          );
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải danh sách điểm danh:', err);
          if (err.response?.status === 403) {
            setAttendanceError('Bạn không có quyền xem điểm danh của buổi học này.');
          } else {
            setAttendanceError('Không thể nạp danh sách học viên điểm danh.');
          }
          setRecords([]);
        }
      } finally {
        if (!ignore) {
          setLoadingAttendance(false);
        }
      }
    };

    loadAttendance();

    return () => {
      ignore = true;
    };
  }, [selectedScheduleId, reloadAttendanceKey]);

  // 4. Kiểm tra phân quyền sửa điểm danh (RBAC)
  // SuperAdmin: toàn quyền
  // BranchManager: đúng chi nhánh của mình
  // Teacher: đúng buổi học mà mình dạy chính hoặc dạy thay
  const canEditAttendance = useMemo(() => {
    if (!selectedSchedule) return false;
    if (isSuperAdmin) return true;
    if (isBranchManager && currentUser.branchId) {
      return Number(currentUser.branchId) === Number(selectedSchedule.branchId);
    }
    if (isTeacher) {
      return (
        Number(currentUser.id) === Number(selectedSchedule.mainTeacherId) ||
        (selectedSchedule.substituteTeacherId &&
          Number(currentUser.id) === Number(selectedSchedule.substituteTeacherId))
      );
    }
    return false;
  }, [selectedSchedule, isSuperAdmin, isBranchManager, isTeacher, currentUser]);

  // 5. Thống kê theo thời gian thực (Metric Pills)
  const metrics = useMemo(() => {
    const total = records.length;
    let present = 0;
    let late = 0;
    let excused = 0;
    let unexcused = 0;
    let unmarked = 0;

    records.forEach((r) => {
      if (r.status === 'Present') present++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'ExcusedAbsent') excused++;
      else if (r.status === 'UnexcusedAbsent') unexcused++;
      else unmarked++;
    });

    return { total, present, late, excused, unexcused, unmarked };
  }, [records]);

  // Thông tin audit trail (lần điểm danh gần nhất)
  const auditInfo = useMemo(() => {
    const markedItem = records.find((r) => r.markedByName && r.markedAt);
    if (!markedItem) return null;
    return {
      name: markedItem.markedByName,
      time: markedItem.markedAt,
    };
  }, [records]);

  // Chuyển trạng thái 1 chạm cho 1 học viên
  const handleSetStatus = (studentId, statusValue) => {
    if (!canEditAttendance) return;
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: statusValue } : r))
    );
  };

  // Cập nhật ghi chú ngắn
  const handleNoteChange = (studentId, noteValue) => {
    if (!canEditAttendance) return;
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, note: noteValue } : r))
    );
  };

  // Nút "Đánh dấu tất cả Có mặt"
  const handleMarkAllPresent = () => {
    if (!canEditAttendance) return;
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'Present',
      }))
    );
  };

  const [confirmModal, setConfirmModal] = useState(null);

  // Lưu điểm danh hàng loạt (POST /api/Attendances/bulk)
  const handleSaveAttendance = () => {
    if (!canEditAttendance || !selectedScheduleId) return;

    setSaveSuccessMessage('');
    setSaveErrorMessage('');

    // Kiểm tra xem có bao nhiêu học viên chưa chọn trạng thái
    if (metrics.unmarked > 0) {
      setConfirmModal({
        mode: 'confirm',
        title: 'Xác nhận lưu điểm danh',
        message: `Còn ${metrics.unmarked} học viên chưa được chọn trạng thái. Bạn có muốn lưu những học viên đã chọn không?`,
        onConfirm: executeSaveAttendance,
      });
      return;
    }

    executeSaveAttendance();
  };

  const executeSaveAttendance = async () => {
    const payloadRecords = records
      .filter((r) => r.status)
      .map((r) => ({
        studentId: r.studentId,
        status: r.status,
        note: r.note?.trim() || null,
      }));

    if (payloadRecords.length === 0) {
      setSaveErrorMessage('Chưa có học viên nào được đánh dấu trạng thái điểm danh.');
      return;
    }

    setSaving(true);
    try {
      await axiosClient.post('/Attendances/bulk', {
        scheduleId: Number(selectedScheduleId),
        records: payloadRecords,
      });

      setSaveSuccessMessage('✓ Đã lưu điểm danh thành công!');

      // Cập nhật trạng thái buổi học hiện tại sang Completed
      setSelectedSchedule((prev) => (prev ? { ...prev, status: 'Completed' } : prev));
      setDaySchedules((prev) =>
        prev.map((s) =>
          String(s.id) === String(selectedScheduleId) ? { ...s, status: 'Completed' } : s
        )
      );

      // Trigger tải lại danh sách điểm danh để nạp audit info mới nhất
      setReloadAttendanceKey((k) => k + 1);

      // Ẩn thông báo sau 4 giây
      setTimeout(() => {
        setSaveSuccessMessage('');
      }, 4000);
    } catch (err) {
      console.error('Lỗi khi lưu điểm danh:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Không thể lưu điểm danh. Vui lòng thử lại.';
      setSaveErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  // Format giờ
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  // Format ngày sinh & tính tuổi
  const formatDobAndAge = (dobStr) => {
    if (!dobStr) return '';
    const parts = dobStr.split('T')[0].split('-');
    const birthYear = Number(parts[0]);
    const age = new Date().getFullYear() - birthYear;
    return `${parts[2]}/${parts[1]}/${parts[0]} (${age > 0 ? `${age} tuổi` : ''})`;
  };

  // Format ngày giờ audit trail
  const formatDateTime = (dtStr) => {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Avatar chữ cái
  const getAvatarLetter = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-4 max-w-full pb-20 md:pb-6">
      {/* HEADER TRANG */}
      <PageHeader
        eyebrow="Điểm danh hằng ngày"
        title="Điểm danh lớp học"
        description="Ghi nhận hiện diện, đi trễ, nghỉ phép của học viên theo từng buổi học"
        actions={
          <SecondaryButton type="button" onClick={() => navigate('/schedules')}>
            ← Quay lại Lịch học
          </SecondaryButton>
        }
      />

      {/* THANH LỰA CHỌN BUỔI HỌC & THỐNG KÊ (ATTENDANCE SELECTOR BAR) */}
      <Card className="p-4 space-y-3.5">
        {/* Bộ chọn Ngày + Buổi học */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* 1. Chọn ngày học (md: 4 cột) */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Ngày học:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
              />
              <SecondaryButton
                type="button"
                onClick={() => setSelectedDate(todayISO)}
                className="!h-10 !px-4 !text-xs whitespace-nowrap"
                title="Nhảy về ngày hôm nay"
              >
                Hôm nay
              </SecondaryButton>
            </div>
          </div>

          {/* 2. Chọn buổi học trong ngày (md: 8 cột) */}
          <div className="md:col-span-8 space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Buổi học trong ngày:
            </label>
            <SelectPill
              value={selectedScheduleId}
              onChange={handleSelectSchedule}
              disabled={loadingSchedules || daySchedules.length === 0}
            >
              {daySchedules.length === 0 ? (
                <option value="">
                  {loadingSchedules
                    ? 'Đang tìm kiếm buổi học...'
                    : '-- Ngày này không có buổi học nào --'}
                </option>
              ) : (
                daySchedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatTime(s.startTime)} – {formatTime(s.endTime)} • {s.className} •{' '}
                    {s.room || 'Chưa xếp phòng'} • GV: {s.mainTeacherName || 'Chưa phân công'}{' '}
                    {s.status === 'Completed' ? '✓ [Đã điểm danh]' : '⏳ [Chưa điểm danh]'}
                  </option>
                ))
              )}
            </SelectPill>
          </div>
        </div>

        {/* Thông tin nhanh buổi học đang chọn */}
        {selectedSchedule && (
          <div className="pt-2.5 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-ink-secondary">
              <span className="font-semibold text-teal">
                🏫 {selectedSchedule.className}
              </span>
              <span>
                🕒 {formatTime(selectedSchedule.startTime)} –{' '}
                {formatTime(selectedSchedule.endTime)}
              </span>
              <span>🚪 {selectedSchedule.room || 'Chưa xếp phòng'}</span>
              <span>👩‍🏫 GV chính: {selectedSchedule.mainTeacherName || 'Chưa phân công'}</span>
              {selectedSchedule.substituteTeacherName && (
                <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  ⚠️ Dạy thay: {selectedSchedule.substituteTeacherName}
                </span>
              )}
            </div>

            <div>
              {selectedSchedule.status === 'Completed' ? (
                <Badge variant="emerald">● Đã hoàn thành</Badge>
              ) : selectedSchedule.status === 'Cancelled' ? (
                <Badge variant="rose">● Đã hủy buổi</Badge>
              ) : (
                <Badge variant="blue">● Đã lên lịch</Badge>
              )}
            </div>
          </div>
        )}

        {/* DẢI CHỈ SỐ THỐNG KÊ NHANH (METRIC PILLS) */}
        {selectedSchedule && (
          <div className="pt-2.5 border-t border-line/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-secondary mr-1">
              Sĩ số: {metrics.total} học viên
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span>✓ Có mặt:</span>
              <span>{metrics.present}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span>⏱ Đi trễ:</span>
              <span>{metrics.late}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span>✉ Nghỉ phép:</span>
              <span>{metrics.excused}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span>✕ K.phép:</span>
              <span>{metrics.unexcused}</span>
            </span>

            {metrics.unmarked > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-surface-subtle text-ink-secondary border border-line">
                <span>Chưa chấm:</span>
                <span>{metrics.unmarked}</span>
              </span>
            )}
          </div>
        )}
      </Card>

      {/* BANNER THÔNG BÁO QUYỀN READ-ONLY */}
      {selectedSchedule && !canEditAttendance && (
        <div className="rounded-card border border-line bg-mint-canvas/70 p-3.5 text-xs md:text-sm text-teal flex items-center gap-2">
          <span>ℹ️</span>
          <span>
            <strong>Chế độ chỉ xem:</strong> Bạn không có quyền chỉnh sửa điểm danh của buổi
            học này (chỉ giáo viên phụ trách buổi học, SuperAdmin hoặc Quản lý cơ sở mới có
            quyền chấm).
          </span>
        </div>
      )}

      {/* THÔNG BÁO LỖI HOẶC THÀNH CÔNG */}
      {saveSuccessMessage && (
        <div className="rounded-card border border-emerald-300 bg-emerald-50 p-3.5 text-xs md:text-sm text-emerald-800 font-semibold flex items-center gap-2 shadow-xs">
          <span>✓</span>
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {saveErrorMessage && (
        <div className="rounded-card border border-rose-200 bg-rose-50 p-3.5 text-xs md:text-sm text-rose-700 font-medium">
          {saveErrorMessage}
        </div>
      )}

      {scheduleError && (
        <div className="rounded-card border border-amber-200 bg-amber-50 p-3.5 text-xs md:text-sm text-amber-800">
          {scheduleError}
        </div>
      )}

      {attendanceError && (
        <div className="rounded-card border border-rose-200 bg-rose-50 p-3.5 text-xs md:text-sm text-rose-700">
          {attendanceError}
        </div>
      )}

      {/* THANH HÀNH ĐỘNG TRÊN DESKTOP: ĐÁNH DẤU TẤT CẢ CÓ MẶT + LƯU ĐIỂM DANH */}
      {canEditAttendance && selectedSchedule && records.length > 0 && (
        <Card className="hidden md:flex items-center justify-between gap-3 p-3.5">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-medium text-xs md:text-sm rounded-full active:scale-[0.98] transition-transform duration-100 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Đánh dấu tất cả Có mặt</span>
          </button>

          <PrimaryButton
            type="button"
            disabled={saving}
            onClick={handleSaveAttendance}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu điểm danh...</span>
              </>
            ) : (
              <span>Lưu điểm danh</span>
            )}
          </PrimaryButton>
        </Card>
      )}

      {/* NỘI DUNG DANH SÁCH ĐIỂM DANH */}
      {loadingAttendance ? (
        <Card className="p-12 text-center text-ink-secondary flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-xs md:text-sm">Đang tải danh sách học viên...</p>
        </Card>
      ) : !selectedSchedule ? (
        <Card className="p-12 text-center text-ink-muted space-y-1">
          <p className="text-sm font-medium text-ink">Chưa có buổi học nào được chọn</p>
          <p className="text-xs text-ink-secondary">
            Vui lòng chọn ngày và một buổi học ở thanh trên để thực hiện điểm danh.
          </p>
        </Card>
      ) : records.length === 0 ? (
        <Card className="p-12 text-center text-ink-muted space-y-2">
          <p className="text-sm font-semibold text-ink">
            Không có học viên nào trong lớp này
          </p>
          <p className="text-xs text-ink-secondary">
            Lớp học chưa có học viên nào đang theo học với trạng thái hoạt động (Active).
          </p>
        </Card>
      ) : (
        <>
          {/* 1. GIAO DIỆN BẢNG TRÊN DESKTOP (md: >= 768px) */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="border-b border-line bg-surface-subtle text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-4 min-w-[200px]">Học viên</th>
                    <th className="py-3 px-4 text-center min-w-[340px]">
                      Trạng thái điểm danh (1 chạm)
                    </th>
                    <th className="py-3 px-4 min-w-[220px]">Ghi chú ngắn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {records.map((student, idx) => (
                    <tr key={student.studentId} className="hover:bg-mint-canvas/60 transition-colors">
                      {/* STT */}
                      <td className="py-3 px-3 text-center text-ink-muted font-mono text-xs">
                        {String(idx + 1).padStart(2, '0')}
                      </td>

                      {/* Thông tin học viên */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gold-soft text-teal border border-gold/30 font-bold flex items-center justify-center text-xs shadow-xs">
                            {getAvatarLetter(student.studentName)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink leading-tight">
                              {student.studentName}
                            </p>
                            <p className="text-[11px] text-ink-muted mt-0.5">
                              <span className="font-mono text-ink-secondary">
                                #STU-{student.studentId}
                              </span>
                              {student.dob && <span> • {formatDobAndAge(student.dob)}</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Segmented Control 4 nút 1 chạm */}
                      <td className="py-3 px-4">
                        {canEditAttendance ? (
                          <div className="inline-flex p-1 bg-surface-subtle rounded-full border border-line gap-1 w-full justify-center">
                            {/* Nút 1: Có mặt */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.studentId, 'Present')}
                              className={`px-3 py-1.5 text-xs rounded-full transition-all duration-100 active:scale-95 cursor-pointer ${
                                student.status === 'Present'
                                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                  : 'text-ink-secondary hover:text-ink hover:bg-surface'
                              }`}
                            >
                              ✓ Có mặt
                            </button>

                            {/* Nút 2: Đi trễ */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.studentId, 'Late')}
                              className={`px-3 py-1.5 text-xs rounded-full transition-all duration-100 active:scale-95 cursor-pointer ${
                                student.status === 'Late'
                                  ? 'bg-amber-500 text-white font-semibold shadow-xs'
                                  : 'text-ink-secondary hover:text-ink hover:bg-surface'
                              }`}
                            >
                              ⏱ Đi trễ
                            </button>

                            {/* Nút 3: Nghỉ có phép */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.studentId, 'ExcusedAbsent')}
                              className={`px-3 py-1.5 text-xs rounded-full transition-all duration-100 active:scale-95 cursor-pointer ${
                                student.status === 'ExcusedAbsent'
                                  ? 'bg-teal text-white font-semibold shadow-xs'
                                  : 'text-ink-secondary hover:text-ink hover:bg-surface'
                              }`}
                            >
                              ✉ Có phép
                            </button>

                            {/* Nút 4: Nghỉ không phép */}
                            <button
                              type="button"
                              onClick={() => handleSetStatus(student.studentId, 'UnexcusedAbsent')}
                              className={`px-3 py-1.5 text-xs rounded-full transition-all duration-100 active:scale-95 cursor-pointer ${
                                student.status === 'UnexcusedAbsent'
                                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                                  : 'text-ink-secondary hover:text-ink hover:bg-surface'
                              }`}
                            >
                              ✕ K.phép
                            </button>
                          </div>
                        ) : (
                          /* Chế độ Read-Only: Badge tĩnh */
                          <div className="flex justify-center">
                            {student.status === 'Present' ? (
                              <Badge variant="emerald">✓ Có mặt</Badge>
                            ) : student.status === 'Late' ? (
                              <Badge variant="amber">⏱ Đi trễ</Badge>
                            ) : student.status === 'ExcusedAbsent' ? (
                              <Badge variant="blue">✉ Nghỉ có phép</Badge>
                            ) : student.status === 'UnexcusedAbsent' ? (
                              <Badge variant="rose">✕ Nghỉ không phép</Badge>
                            ) : (
                              <Badge variant="neutral">Chưa điểm danh</Badge>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Ghi chú ngắn */}
                      <td className="py-3 px-4">
                        {canEditAttendance ? (
                          <input
                            type="text"
                            maxLength={300}
                            placeholder="Lý do vắng / biểu hiện..."
                            value={student.note || ''}
                            onChange={(e) =>
                              handleNoteChange(student.studentId, e.target.value)
                            }
                            className="w-full h-9 px-3.5 text-xs bg-surface border border-line rounded-full focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-ink-muted italic">
                            {student.note || '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 2. GIAO DIỆN MOBILE (< md: 375px - 414px) - THẺ HỌC VIÊN DỌC */}
          <div className="md:hidden space-y-3">
            {records.map((student, idx) => (
              <Card
                key={student.studentId}
                className="p-3.5 space-y-2.5 text-left"
              >
                {/* Header Thẻ: Avatar + Tên + Mã ID */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-soft text-teal border border-gold/30 font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {getAvatarLetter(student.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-ink text-sm truncate">
                        {idx + 1}. {student.studentName}
                      </p>
                      <span className="font-mono text-[11px] text-ink-muted">
                        #STU-{student.studentId}
                      </span>
                    </div>
                    {student.dob && (
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        {formatDobAndAge(student.dob)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cụm 4 nút Segmented Control trên Mobile (min-h-[44px] Apple HIG) */}
                {canEditAttendance ? (
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-subtle rounded-2xl border border-line">
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.studentId, 'Present')}
                      className={`min-h-[44px] px-2 text-xs font-medium rounded-full transition-all duration-100 active:scale-95 flex items-center justify-center ${
                        student.status === 'Present'
                          ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                          : 'bg-surface text-ink-secondary'
                      }`}
                    >
                      ✓ Có mặt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.studentId, 'Late')}
                      className={`min-h-[44px] px-2 text-xs font-medium rounded-full transition-all duration-100 active:scale-95 flex items-center justify-center ${
                        student.status === 'Late'
                          ? 'bg-amber-500 text-white font-semibold shadow-xs'
                          : 'bg-surface text-ink-secondary'
                      }`}
                    >
                      ⏱ Đi trễ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.studentId, 'ExcusedAbsent')}
                      className={`min-h-[44px] px-2 text-xs font-medium rounded-full transition-all duration-100 active:scale-95 flex items-center justify-center ${
                        student.status === 'ExcusedAbsent'
                          ? 'bg-teal text-white font-semibold shadow-xs'
                          : 'bg-surface text-ink-secondary'
                      }`}
                    >
                      ✉ Có phép
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.studentId, 'UnexcusedAbsent')}
                      className={`min-h-[44px] px-2 text-xs font-medium rounded-full transition-all duration-100 active:scale-95 flex items-center justify-center ${
                        student.status === 'UnexcusedAbsent'
                          ? 'bg-rose-600 text-white font-semibold shadow-xs'
                          : 'bg-surface text-ink-secondary'
                      }`}
                    >
                      ✕ K.phép
                    </button>
                  </div>
                ) : (
                  <div className="py-1">
                    {student.status === 'Present' ? (
                      <Badge variant="emerald">✓ Có mặt</Badge>
                    ) : student.status === 'Late' ? (
                      <Badge variant="amber">⏱ Đi trễ</Badge>
                    ) : student.status === 'ExcusedAbsent' ? (
                      <Badge variant="blue">✉ Nghỉ có phép</Badge>
                    ) : student.status === 'UnexcusedAbsent' ? (
                      <Badge variant="rose">✕ Nghỉ không phép</Badge>
                    ) : (
                      <Badge variant="neutral">Chưa điểm danh</Badge>
                    )}
                  </div>
                )}

                {/* Ô ghi chú trên Mobile */}
                <div>
                  {canEditAttendance ? (
                    <input
                      type="text"
                      maxLength={300}
                      placeholder="Ghi chú: lý do vắng / biểu hiện..."
                      value={student.note || ''}
                      onChange={(e) =>
                        handleNoteChange(student.studentId, e.target.value)
                      }
                      className="w-full h-10 px-3.5 text-xs bg-surface border border-line rounded-full focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-ink-muted italic">
                      {student.note ? `Ghi chú: ${student.note}` : 'Không có ghi chú'}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* DẤU VẾT KIỂM TOÁN (AUDIT TRAIL) */}
          {auditInfo && (
            <div className="pt-2 text-right text-[11px] text-ink-muted italic">
              Điểm danh lần cuối bởi:{' '}
              <span className="font-medium text-ink">{auditInfo.name}</span> lúc{' '}
              <span className="font-medium text-ink">
                {formatDateTime(auditInfo.time)}
              </span>
            </div>
          )}

          {/* THANH TÁC VỤ ĐÁY DÍNH TRÊN MOBILE (STICKY BOTTOM BAR - Apple HIG) */}
          {canEditAttendance && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface/95 backdrop-blur-md border-t border-line shadow-modal flex gap-2 z-20">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="flex-1 min-h-[44px] px-3 bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold text-xs rounded-full active:scale-95 transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Tất cả có mặt</span>
              </button>

              <PrimaryButton
                type="button"
                disabled={saving}
                onClick={handleSaveAttendance}
                className="flex-1 min-h-[44px] !px-3 !text-xs"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </span>
                ) : (
                  <span>Lưu điểm danh</span>
                )}
              </PrimaryButton>
            </div>
          )}
        </>
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
