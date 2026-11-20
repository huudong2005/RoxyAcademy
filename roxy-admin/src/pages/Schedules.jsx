import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import ConfirmModal from '../components/ConfirmModal';
import { getStoredUser } from '../utils/authStorage';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  CustomSelect,
  Badge,
} from '../components/ui';

export default function Schedules() {
  const navigate = useNavigate();

  // Thông tin user đăng nhập
  const [currentUser] = useState(() => getStoredUser());

  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
  const isTeacher = currentUser.role === 'Teacher';
  const canDelete = isSuperAdmin || isBranchManager;
  const canCreateEdit = canDelete || isTeacher;

  // Xử lý tuần (Thứ Hai -> Chủ Nhật)
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const formatDateISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = useMemo(() => formatDateISO(new Date()), []);

  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));

  // 7 ngày trong tuần
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentMonday]);

  const fromDate = useMemo(() => formatDateISO(weekDays[0]), [weekDays]);
  const toDate = useMemo(() => formatDateISO(weekDays[6]), [weekDays]);

  // Ngày được chọn trên mobile (mặc định hôm nay nếu trong tuần, ngược lại là Thứ Hai)
  const [selectedMobileDate, setSelectedMobileDate] = useState(() => todayISO);

  // Bộ lọc
  const [branchFilter, setBranchFilter] = useState(() => {
    if (isBranchManager && currentUser.branchId) {
      return String(currentUser.branchId);
    }
    return '';
  });
  const [classFilter, setClassFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  // Dữ liệu danh mục
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Dữ liệu lịch học
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Modal Tạo / Sửa buổi học
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null); // null = Tạo, object = Sửa
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    classId: '',
    studyDate: todayISO,
    startTime: '08:00',
    endTime: '09:30',
    room: '',
    substituteTeacherId: '',
    status: 'Scheduled',
    note: '',
  });

  // Tải danh mục bổ trợ
  useEffect(() => {
    let ignore = false;
    const fetchMetadata = async () => {
      try {
        const [branchRes, classRes, teacherRes] = await Promise.allSettled([
          axiosClient.get('/Branches'),
          axiosClient.get('/Classes'),
          axiosClient.get('/Users?role=Teacher&pageSize=100'),
        ]);

        if (!ignore) {
          if (branchRes.status === 'fulfilled') setBranches(branchRes.value.data || []);
          if (classRes.status === 'fulfilled') setClasses(classRes.value.data || []);
          if (teacherRes.status === 'fulfilled') {
            const tData = teacherRes.value.data;
            setTeachers(tData.items || tData || []);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục bổ trợ cho Schedules:', err);
      }
    };
    fetchMetadata();
    return () => {
      ignore = true;
    };
  }, []);

  // Tải danh sách Schedules
  useEffect(() => {
    let ignore = false;

    const loadSchedules = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          fromDate,
          toDate,
        };
        if (branchFilter) params.branchId = branchFilter;
        if (classFilter) params.classId = classFilter;
        if (teacherFilter) params.teacherId = teacherFilter;

        const res = await axiosClient.get('/Schedules', { params });
        if (!ignore) {
          setSchedules(res.data || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải lịch học:', err);
          if (err.response?.status === 403) {
            setError('Bạn không có quyền truy cập lịch học này.');
          } else {
            setError('Không thể tải dữ liệu lịch học. Vui lòng thử lại.');
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadSchedules();

    return () => {
      ignore = true;
    };
  }, [fromDate, toDate, branchFilter, classFilter, teacherFilter, reloadKey]);

  // Gom lịch học theo ngày: { "YYYY-MM-DD": [s1, s2] }
  const schedulesByDate = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      map[formatDateISO(d)] = [];
    });
    schedules.forEach((item) => {
      const dateKey = item.studyDate?.split('T')[0];
      if (map[dateKey]) {
        map[dateKey].push(item);
      } else {
        map[dateKey] = [item];
      }
    });

    // Sắp xếp các buổi học trong ngày theo giờ bắt đầu
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    });
    return map;
  }, [weekDays, schedules]);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const newMonday = new Date(currentMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
    setCurrentMonday(newMonday);
    setSelectedMobileDate(formatDateISO(newMonday));
  };
  const handleNextWeek = () => {
    const newMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
    setCurrentMonday(newMonday);
    setSelectedMobileDate(formatDateISO(newMonday));
  };
  const handleTodayWeek = () => {
    const newMonday = getMonday(new Date());
    setCurrentMonday(newMonday);
    setSelectedMobileDate(todayISO);
  };

  // Định dạng ngày hiển thị tiếng Việt
  const formatHeaderDate = (d) => {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    return `${day}/${month}`;
  };

  const getDayOfWeekName = (index) => {
    const names = [
      'Thứ Hai',
      'Thứ Ba',
      'Thứ Tư',
      'Thứ Năm',
      'Thứ Sáu',
      'Thứ Bảy',
      'Chủ Nhật',
    ];
    return names[index];
  };

  const getShortDayName = (index) => {
    const names = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return names[index];
  };

  // Format giờ từ "08:30:00" -> "08:30"
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  // Danh sách lớp khả dụng trong modal Tạo lịch (Teacher chỉ thấy lớp mình phụ trách)
  const availableModalClasses = useMemo(() => {
    if (isTeacher) {
      return classes.filter((c) => c.teacherId === currentUser.id);
    }
    return classes;
  }, [isTeacher, classes, currentUser.id]);

  // Mở modal Tạo mới
  const handleOpenCreateModal = (defaultDate) => {
    setEditingSchedule(null);
    setModalError('');

    let defaultClassId = '';
    if (isTeacher) {
      const teacherClasses = classes.filter((c) => c.teacherId === currentUser.id);
      if (teacherClasses.length === 1) {
        defaultClassId = teacherClasses[0].id;
      }
    } else {
      const validClass = classes.find((c) => c.teacherId);
      defaultClassId = validClass ? validClass.id : '';
    }

    setFormData({
      classId: defaultClassId,
      studyDate: defaultDate || selectedMobileDate || todayISO,
      startTime: '08:00',
      endTime: '09:30',
      room: '',
      substituteTeacherId: '',
      status: 'Scheduled',
      note: '',
    });
    setModalOpen(true);
  };

  // Mở modal Sửa
  const handleOpenEditModal = (schedule) => {
    setEditingSchedule(schedule);
    setModalError('');
    setFormData({
      classId: schedule.classId || '',
      studyDate: schedule.studyDate ? schedule.studyDate.split('T')[0] : todayISO,
      startTime: schedule.startTime ? schedule.startTime.slice(0, 5) : '08:00',
      endTime: schedule.endTime ? schedule.endTime.slice(0, 5) : '09:30',
      room: schedule.room || '',
      substituteTeacherId: schedule.substituteTeacherId || '',
      status: schedule.status || 'Scheduled',
      note: schedule.note || '',
    });
    setModalOpen(true);
  };

  const [confirmModal, setConfirmModal] = useState(null);
  const [detailSchedule, setDetailSchedule] = useState(null);

  // Xóa buổi học
  const handleDeleteSchedule = (id) => {
    setConfirmModal({
      mode: 'confirm',
      title: 'Xác nhận xóa buổi học',
      message: 'Bạn có chắc chắn muốn xóa buổi học này không?',
      onConfirm: async () => {
        try {
          await axiosClient.delete(`/Schedules/${id}`);
          setReloadKey((k) => k + 1);
        } catch (err) {
          console.error('Lỗi khi xóa buổi học:', err);
          const msg =
            err.response?.data?.message ||
            err.response?.data ||
            'Không thể xóa buổi học. Vui lòng kiểm tra lại.';
          setConfirmModal({
            mode: 'alert',
            title: 'Không thể xóa buổi học',
            message: typeof msg === 'string' ? msg : JSON.stringify(msg),
          });
        }
      },
    });
  };

  // Submit modal
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    // Kiểm tra lớp có hợp lệ không (chỉ khi tạo mới)
    if (!editingSchedule) {
      if (!formData.classId) {
        setModalError('Vui lòng chọn lớp học.');
        return;
      }
      const selectedClass = classes.find((c) => c.id === Number(formData.classId));
      if (!selectedClass || !selectedClass.teacherId) {
        setModalError(
          'Lớp học này chưa được phân công giáo viên phụ trách. Vui lòng vào trang "Lớp học" để phân công trước khi xếp lịch.'
        );
        return;
      }
    }

    if (!formData.studyDate) {
      setModalError('Vui lòng chọn ngày học.');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setModalError('Vui lòng nhập đầy đủ giờ bắt đầu và kết thúc.');
      return;
    }

    // Kiểm tra endTime > startTime
    if (formData.endTime <= formData.startTime) {
      setModalError('Giờ kết thúc phải diễn ra sau giờ bắt đầu.');
      return;
    }

    setModalSubmitting(true);

    try {
      // Chuẩn hóa giờ HH:mm -> HH:mm:ss nếu cần
      const normStart =
        formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime;
      const normEnd =
        formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime;

      if (editingSchedule) {
        // Cập nhật buổi học (PUT /api/Schedules/{id})
        const updatePayload = {
          studyDate: formData.studyDate,
          startTime: normStart,
          endTime: normEnd,
          room: formData.room?.trim() || null,
          substituteTeacherId: formData.substituteTeacherId
            ? Number(formData.substituteTeacherId)
            : null,
          status: formData.status,
          note: formData.note?.trim() || null,
        };
        await axiosClient.put(`/Schedules/${editingSchedule.id}`, updatePayload);
      } else {
        // Tạo buổi học mới (POST /api/Schedules)
        const createPayload = {
          classId: Number(formData.classId),
          studyDate: formData.studyDate,
          startTime: normStart,
          endTime: normEnd,
          room: formData.room?.trim() || null,
          substituteTeacherId: formData.substituteTeacherId
            ? Number(formData.substituteTeacherId)
            : null,
          note: formData.note?.trim() || null,
        };
        await axiosClient.post('/Schedules', createPayload);
      }

      setModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi khi lưu buổi học:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Không thể lưu buổi học. Vui lòng kiểm tra lại.';
      setModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setModalSubmitting(false);
    }
  };

  // Badge trạng thái buổi học
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <Badge variant="emerald">
            <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full" />
            Đã hoàn thành
          </Badge>
        );
      case 'Cancelled':
        return (
          <Badge variant="rose" className="line-through">
            <span className="bg-rose-500 w-1.5 h-1.5 rounded-full" />
            Đã hủy
          </Badge>
        );
      case 'Scheduled':
      default:
        return (
          <Badge variant="blue">
            <span className="bg-blue-500 w-1.5 h-1.5 rounded-full" />
            Đã lên lịch
          </Badge>
        );
    }
  };

  // Schedule Card Component
  const renderScheduleCard = (item) => (
    <div
      key={item.id}
      onClick={() => setDetailSchedule(item)}
      title="Nhấn để xem chi tiết buổi học"
      className="bg-surface rounded-card p-3 border border-line/80 shadow-card hover:border-teal/40 hover:shadow-card-hover transition-all duration-150 flex flex-col gap-1.5 text-left cursor-pointer"
    >
      {/* Hàng 1: Giờ học + Badge trạng thái */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-xs font-semibold text-ink flex items-center gap-1">
          🕒 {formatTime(item.startTime)} – {formatTime(item.endTime)}
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {renderStatusBadge(item.status)}
          {item.note && item.note.includes('CẦN GIÁO VIÊN DẠY THAY') && (
            <Badge variant="amber" className="text-[10px]">
              ⚠️ Cần GV dạy thay
            </Badge>
          )}
        </div>
      </div>

      {/* Hàng 2: Tên lớp */}
      <h4
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/attendance?scheduleId=${item.id}`);
        }}
        title="Nhấn để điểm danh"
        className="font-semibold text-teal text-sm leading-snug hover:text-gold-active hover:underline cursor-pointer"
      >
        {item.className}
      </h4>

      {/* Hàng 3: Phòng & Cơ sở */}
      <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>🚪 {item.room || 'Chưa xếp phòng'}</span>
        {item.branchName && (
          <>
            <span>•</span>
            <span className="break-words">🏢 {item.branchName}</span>
          </>
        )}
      </div>

      {/* Hàng 4: Giáo viên chính & Giáo viên dạy thay */}
      <div className="text-xs text-ink-secondary flex items-center gap-1">
        <span>👩‍🏫 GV: {item.mainTeacherName || 'Chưa phân công'}</span>
      </div>

      {item.substituteTeacherName && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2 py-0.5 text-[11px] font-medium flex items-center gap-1">
          <span>⚠️ Dạy thay: {item.substituteTeacherName}</span>
        </div>
      )}

      {/* Ghi chú nếu có (tối đa 2 dòng, nhấn vào thẻ để xem đủ) */}
      {item.note && (
        <p className="text-[11px] text-ink-secondary italic bg-surface-subtle rounded-lg px-2 py-1 border border-line/60 line-clamp-2">
          💬 {item.note}
        </p>
      )}

      {/* Hàng 5: Action Buttons (gọn dạng icon có tooltip) */}
      <div
        className="mt-1 pt-2 border-t border-line/60 flex items-center justify-end gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          variant="neutral"
          onClick={() => navigate(`/attendance?scheduleId=${item.id}`)}
          title="Điểm danh buổi học này"
          className="!h-8 !w-8 !bg-emerald-50 !border-emerald-200 !text-emerald-700 hover:!bg-emerald-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </IconButton>

        {canCreateEdit && (
          <>
            <IconButton
              variant="neutral"
              onClick={() => handleOpenEditModal(item)}
              title="Chỉnh sửa buổi học"
              className="!h-8 !w-8"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </IconButton>
            {canDelete && (
              <IconButton
                variant="danger"
                onClick={() => handleDeleteSchedule(item.id)}
                title="Xóa buổi học"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </IconButton>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* HEADER TRANG & THANH ĐIỀU HƯỚNG TUẦN */}
      <PageHeader
        eyebrow="Thời khóa biểu"
        title="Lịch học"
        description="Quản lý lịch giảng dạy theo tuần, theo chi nhánh và phân công giáo viên"
        actions={
          canCreateEdit && (
            <PrimaryButton type="button" onClick={() => handleOpenCreateModal()}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Tạo buổi học</span>
            </PrimaryButton>
          )
        }
      />

      {/* THANH CÔNG CỤ: CHUYỂN TUẦN + BỘ LỌC */}
      <Card className="p-4 space-y-3">
        {/* Hàng 1: Điều hướng tuần */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="px-3 py-1.5 rounded-full border border-line bg-surface hover:bg-mint-canvas text-teal text-xs font-medium active:scale-95 transition-all cursor-pointer"
              title="Tuần trước"
            >
              ← Tuần trước
            </button>
            <button
              type="button"
              onClick={handleTodayWeek}
              className="px-3.5 py-1.5 rounded-full bg-gold-soft border border-gold/40 text-teal hover:bg-gold-soft/80 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              title="Về tuần hôm nay"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="px-3 py-1.5 rounded-full border border-line bg-surface hover:bg-mint-canvas text-teal text-xs font-medium active:scale-95 transition-all cursor-pointer"
              title="Tuần sau"
            >
              Tuần sau →
            </button>
          </div>

          <div className="text-xs md:text-sm font-semibold text-teal flex items-center gap-1.5">
            <span>📅</span>
            <span>
              Tuần: {formatHeaderDate(weekDays[0])} – {formatHeaderDate(weekDays[6])} /{' '}
              {weekDays[6].getFullYear()}
            </span>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc (Chi nhánh, Lớp, Giáo viên) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-line/60 text-xs">
          {/* Lọc Chi nhánh */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Chi nhánh:
            </label>
            <CustomSelect
              disabled={isBranchManager}
              value={branchFilter}
              onChange={(v) => setBranchFilter(v)}
              aria-label="Lọc theo chi nhánh"
              options={[
                ...(isSuperAdmin ? [{ value: '', label: '-- Tất cả chi nhánh --' }] : []),
                ...branches.map((b) => ({ value: String(b.id), label: b.branchName })),
              ]}
            />
          </div>

          {/* Lọc Lớp học */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Lớp học:
            </label>
            <CustomSelect
              value={classFilter}
              onChange={(v) => setClassFilter(v)}
              aria-label="Lọc theo lớp học"
              options={[
                { value: '', label: '-- Tất cả lớp học --' },
                ...classes.map((c) => ({ value: String(c.id), label: c.className })),
              ]}
            />
          </div>

          {/* Lọc Giáo viên */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Giáo viên:
            </label>
            <CustomSelect
              value={teacherFilter}
              onChange={(v) => setTeacherFilter(v)}
              aria-label="Lọc theo giáo viên"
              options={[
                { value: '', label: '-- Tất cả giáo viên --' },
                ...teachers.map((t) => ({ value: String(t.id), label: t.fullName })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* THÔNG BÁO LỖI HOẶC LOADING */}
      {error && (
        <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-xs md:text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs font-semibold underline text-rose-800 hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <Card className="p-12 text-center text-ink-secondary flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-xs md:text-sm">Đang tải lịch học...</p>
        </Card>
      ) : (
        <>
          {/* 1. GIAO DIỆN DESKTOP (lg: >= 1024px) - LƯỚI 7 CỘT CUỘN NGANG KHI THIẾU CHỖ */}
          <div className="hidden lg:block overflow-x-auto pb-2">
            <div className="grid grid-cols-7 gap-3 items-start min-w-[1320px]">
              {weekDays.map((dayObj, index) => {
                const dateKey = formatDateISO(dayObj);
                const isToday = dateKey === todayISO;
                const daySchedules = schedulesByDate[dateKey] || [];

                return (
                  <div
                    key={dateKey}
                    className={`min-w-[180px] rounded-card border flex flex-col min-h-[480px] transition-colors ${
                    isToday
                      ? 'border-teal bg-mint-canvas/70 border-t-4 border-t-teal shadow-card'
                      : 'border-line/80 bg-surface-subtle/60'
                  }`}
                >
                  {/* Header cột ngày */}
                  <div className="p-2.5 text-center border-b border-line/60 bg-surface rounded-t-card">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      {getDayOfWeekName(index)}
                    </p>
                    <div className="mt-1 flex items-center justify-center">
                      {isToday ? (
                        <span className="bg-gold text-teal w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold">
                          {dayObj.getDate()}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-ink">
                          {dayObj.getDate()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Danh sách thẻ buổi học trong ngày */}
                  <div className="p-2 space-y-2.5 flex-1 flex flex-col">
                    {daySchedules.length === 0 ? (
                      <div className="flex-1 min-h-[140px] rounded-lg border border-dashed border-line bg-surface-subtle/50 flex flex-col items-center justify-center p-2 text-center text-xs text-ink-muted">
                        <span>Trống lịch</span>
                        {canCreateEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal(dateKey)}
                            className="mt-1 text-[11px] font-semibold text-teal hover:text-gold-active hover:underline cursor-pointer"
                          >
                            + Xếp lịch
                          </button>
                        )}
                      </div>
                    ) : (
                      daySchedules.map((s) => renderScheduleCard(s))
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* 2. GIAO DIỆN MOBILE & TABLET (< lg) - DAY PICKER PILL TABS + VERTICAL LIST */}
          <div className="lg:hidden space-y-3">
            {/* Thanh Day Picker Pill Tabs (cuộn ngang) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5 no-scrollbar">
              {weekDays.map((dayObj, index) => {
                const dateKey = formatDateISO(dayObj);
                const isSelected = dateKey === selectedMobileDate;
                const isToday = dateKey === todayISO;
                const hasSchedules = (schedulesByDate[dateKey] || []).length > 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedMobileDate(dateKey)}
                    className={`flex-1 min-w-[52px] py-2 px-1 rounded-xl text-center active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-teal text-gold font-semibold shadow-card'
                        : isToday
                        ? 'bg-gold-soft text-teal border border-gold/40'
                        : 'bg-surface text-ink-secondary border border-line'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-medium">
                      {getShortDayName(index)}
                    </span>
                    <span className="text-sm font-bold">{dayObj.getDate()}</span>

                    {/* Dot có lịch */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        hasSchedules
                          ? isSelected
                            ? 'bg-gold'
                            : 'bg-teal'
                          : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Tiêu đề ngày đang xem trên mobile */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs md:text-sm font-bold text-ink">
                Lịch học ngày:{' '}
                {weekDays.find((d) => formatDateISO(d) === selectedMobileDate)
                  ? `${getDayOfWeekName(
                      weekDays.findIndex((d) => formatDateISO(d) === selectedMobileDate)
                    )}, ${selectedMobileDate.split('-').reverse().join('/')}`
                  : selectedMobileDate}
              </h3>
              {canCreateEdit && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(selectedMobileDate)}
                  className="text-xs font-semibold text-teal hover:text-gold-active cursor-pointer"
                >
                  + Thêm buổi
                </button>
              )}
            </div>

            {/* Danh sách thẻ buổi học của ngày đang chọn */}
            <div className="space-y-2.5">
              {(schedulesByDate[selectedMobileDate] || []).length === 0 ? (
                <Card className="border-dashed p-8 text-center text-xs text-ink-muted space-y-2">
                  <p>Không có buổi học nào được lên lịch trong ngày này.</p>
                  {canCreateEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal(selectedMobileDate)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-gold-active hover:underline cursor-pointer"
                    >
                      + Tạo buổi học cho ngày này
                    </button>
                  )}
                </Card>
              ) : (
                schedulesByDate[selectedMobileDate].map((s) => renderScheduleCard(s))
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL TẠO / SỬA BUỔI HỌC (SCHEDULE MODAL) */}
      {modalOpen && (() => {
        const isAttendanceLocked = Boolean(editingSchedule?.hasAttendance);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => !modalSubmitting && setModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg rounded-card-lg bg-surface border border-line/60 p-5 md:p-6 shadow-modal modal-panel max-h-[92vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-line/60 pb-3 mb-4">
              <h3 className="text-base md:text-lg font-bold text-ink">
                {editingSchedule ? 'Chỉnh sửa buổi học' : 'Tạo buổi học mới'}
              </h3>
              <IconButton
                variant="neutral"
                disabled={modalSubmitting}
                onClick={() => setModalOpen(false)}
                title="Đóng"
                className="!h-8 !w-8"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            {/* Báo lỗi modal nếu có */}
            {modalError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-3.5 text-xs md:text-sm">
              {isAttendanceLocked && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold">⚠️ Buổi học đã có dữ liệu điểm danh:</span> Không thể thay đổi ngày học, giờ học hoặc trạng thái buổi học. Bạn chỉ có thể cập nhật phòng học, giáo viên dạy thay hoặc ghi chú.
                </div>
              )}

              {/* 1. Chọn Lớp học (BẮT BUỘC) */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Lớp học <span className="text-rose-500">*</span>
                </label>
                {editingSchedule ? (
                  <div className="w-full h-10 rounded-full border border-line bg-surface-subtle px-4 flex items-center text-ink-secondary font-medium">
                    {editingSchedule.className}
                  </div>
                ) : isTeacher && availableModalClasses.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
                    Bạn chưa được phân công lớp nào
                  </div>
                ) : (
                  <>
                    <CustomSelect
                      value={formData.classId}
                      onChange={(v) =>
                        setFormData((prev) => ({ ...prev, classId: v }))
                      }
                      options={[
                        { value: '', label: '-- Chọn lớp học --' },
                        ...availableModalClasses.map((cls) => {
                          const hasTeacher = Boolean(cls.teacherId);
                          return {
                            value: cls.id,
                            disabled: !hasTeacher,
                            label: hasTeacher
                              ? `${cls.className} (${cls.teacherName || 'Đã có GV'})`
                              : `[Chưa gán GV] ${cls.className} (Không thể chọn)`,
                          };
                        }),
                      ]}
                    />

                    {/* Cảnh báo nếu lớp chưa gán GV */}
                    {formData.classId &&
                      !availableModalClasses.find((c) => c.id === Number(formData.classId))?.teacherId && (
                        <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                          ⚠️ Lớp này chưa được phân công giáo viên phụ trách. Vui lòng vào trang
                          &quot;Quản lý Lớp học&quot; để phân công giáo viên trước khi xếp lịch.
                        </p>
                      )}
                  </>
                )}
              </div>

              {/* 2. Ngày học */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Ngày học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isAttendanceLocked}
                  value={formData.studyDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, studyDate: e.target.value }))
                  }
                  className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
                />
              </div>

              {/* 3. Giờ bắt đầu & Giờ kết thúc (BẮT BUỘC) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Giờ bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    disabled={isAttendanceLocked}
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Giờ kết thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    disabled={isAttendanceLocked}
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 4. Phòng học */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Phòng học
                </label>
                <input
                  type="text"
                  maxLength={50}
                  placeholder="VD: Phòng 101, Phòng Vẽ B..."
                  value={formData.room}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, room: e.target.value }))
                  }
                  className="w-full h-10 rounded-full border border-line bg-surface px-4 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {/* 5. Giáo viên dạy thay (Tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Giáo viên dạy thay (Tùy chọn)
                </label>
                <CustomSelect
                  value={formData.substituteTeacherId}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      substituteTeacherId: v,
                    }))
                  }
                  options={[
                    { value: '', label: '-- Không có (Giáo viên chính phụ trách) --' },
                    ...teachers.map((t) => ({
                      value: t.id,
                      label: `👩‍🏫 ${t.fullName} (${t.phoneNumber || 'Không có SĐT'})`,
                    })),
                  ]}
                />
                <p className="mt-1 text-[11px] text-ink-muted">
                  Chỉ chọn khi giáo viên chính bận việc hoặc nghỉ phép đột xuất.
                </p>
              </div>

              {/* 6. Trạng thái buổi học (Chỉ khi sửa) */}
              {editingSchedule && (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Trạng thái buổi học
                  </label>
                  <CustomSelect
                    disabled={isAttendanceLocked}
                    value={formData.status}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, status: v }))
                    }
                    options={[
                      { value: 'Scheduled', label: 'Đã lên lịch (Scheduled)' },
                      { value: 'Completed', label: 'Đã hoàn thành / Đã điểm danh (Completed)' },
                      { value: 'Cancelled', label: 'Đã hủy (Cancelled)' },
                    ]}
                  />
                </div>
              )}

              {/* 7. Ghi chú buổi học */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Ghi chú dặn dò
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Dặn dò chuẩn bị bài vở, dụng cụ học tập..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                />
              </div>

              {/* Footer modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line/60">
                <SecondaryButton
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </SecondaryButton>
                <PrimaryButton
                  type="submit"
                  disabled={
                    modalSubmitting ||
                    (!editingSchedule && isTeacher && availableModalClasses.length === 0)
                  }
                >
                  {modalSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{editingSchedule ? 'Cập nhật' : 'Tạo buổi học'}</span>
                  )}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* MODAL XEM CHI TIẾT BUỔI HỌC */}
      {detailSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-detail-title"
        >
          <div
            className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
            onClick={() => setDetailSchedule(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-card-lg bg-surface border border-line/60 p-6 shadow-modal modal-panel space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
              <div>
                <h3 id="schedule-detail-title" className="text-base font-bold text-ink">
                  {detailSchedule.className}
                </h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  📅 {detailSchedule.studyDate} • 🕒 {formatTime(detailSchedule.startTime)} –{' '}
                  {formatTime(detailSchedule.endTime)}
                </p>
              </div>
              <IconButton
                variant="neutral"
                onClick={() => setDetailSchedule(null)}
                title="Đóng"
                className="!h-8 !w-8 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </IconButton>
            </div>

            <div className="space-y-2.5 text-xs md:text-sm text-ink">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary">Trạng thái:</span>
                {renderStatusBadge(detailSchedule.status)}
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Cơ sở:</span>
                <span className="font-medium text-right break-words">
                  {detailSchedule.branchName || '—'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Phòng học:</span>
                <span className="font-medium text-right">
                  {detailSchedule.room || 'Chưa xếp phòng'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink-secondary shrink-0">Giáo viên chính:</span>
                <span className="font-medium text-right">
                  {detailSchedule.mainTeacherName || 'Chưa phân công'}
                </span>
              </div>
              {detailSchedule.substituteTeacherName && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-ink-secondary shrink-0">Giáo viên dạy thay:</span>
                  <span className="font-medium text-amber-700 text-right">
                    {detailSchedule.substituteTeacherName}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-line/60">
                <p className="text-xs font-semibold text-ink-secondary mb-1">Ghi chú buổi học</p>
                <p className="whitespace-pre-line rounded-xl border border-line bg-surface-subtle p-3 text-xs leading-relaxed text-ink">
                  {detailSchedule.note || 'Không có ghi chú.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3">
              <SecondaryButton
                type="button"
                onClick={() => setDetailSchedule(null)}
              >
                Đóng
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => {
                  const id = detailSchedule.id;
                  setDetailSchedule(null);
                  navigate(`/attendance?scheduleId=${id}`);
                }}
              >
                Điểm danh buổi này
              </PrimaryButton>
            </div>
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
