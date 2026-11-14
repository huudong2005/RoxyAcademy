import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function Schedules() {
  const navigate = useNavigate();

  // Thông tin user đăng nhập
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const isSuperAdmin = currentUser.role === 'SuperAdmin';
  const isBranchManager = currentUser.role === 'BranchManager';
  const canManage = isSuperAdmin || isBranchManager;

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

  // Mở modal Tạo mới
  const handleOpenCreateModal = (defaultDate) => {
    setEditingSchedule(null);
    setModalError('');

    // Tìm lớp đầu tiên có giáo viên
    const validClass = classes.find((c) => c.teacherId);

    setFormData({
      classId: validClass ? validClass.id : '',
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

  // Xóa buổi học
  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa buổi học này không?')) {
      return;
    }
    try {
      await axiosClient.delete(`/Schedules/${id}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Lỗi khi xóa buổi học:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Không thể xóa buổi học. Vui lòng kiểm tra lại.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
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
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
            <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full" />
            Đã hoàn thành
          </span>
        );
      case 'Cancelled':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 line-through text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
            <span className="bg-rose-500 w-1.5 h-1.5 rounded-full" />
            Đã hủy
          </span>
        );
      case 'Scheduled':
      default:
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
            <span className="bg-blue-500 w-1.5 h-1.5 rounded-full" />
            Đã lên lịch
          </span>
        );
    }
  };

  // Schedule Card Component
  const renderScheduleCard = (item) => (
    <div
      key={item.id}
      className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all duration-150 flex flex-col gap-1.5 text-left"
    >
      {/* Hàng 1: Giờ học + Badge trạng thái */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          🕒 {formatTime(item.startTime)} – {formatTime(item.endTime)}
        </span>
        {renderStatusBadge(item.status)}
      </div>

      {/* Hàng 2: Tên lớp */}
      <h4
        onClick={() => navigate(`/attendance?scheduleId=${item.id}`)}
        title="Nhấn để điểm danh"
        className="font-semibold text-blue-700 text-sm leading-snug hover:underline cursor-pointer"
      >
        {item.className}
      </h4>

      {/* Hàng 3: Phòng & Cơ sở */}
      <div className="text-xs text-slate-500 flex items-center gap-2">
        <span>🚪 {item.room || 'Chưa xếp phòng'}</span>
        {item.branchName && (
          <>
            <span>•</span>
            <span className="truncate">🏢 {item.branchName}</span>
          </>
        )}
      </div>

      {/* Hàng 4: Giáo viên chính & Giáo viên dạy thay */}
      <div className="text-xs text-slate-600 flex items-center gap-1">
        <span>👩‍🏫 GV: {item.mainTeacherName || 'Chưa phân công'}</span>
      </div>

      {item.substituteTeacherName && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 text-[11px] font-medium flex items-center gap-1">
          <span>⚠️ Dạy thay: {item.substituteTeacherName}</span>
        </div>
      )}

      {/* Ghi chú nếu có */}
      {item.note && (
        <p className="text-[11px] text-slate-500 italic bg-slate-50 rounded px-1.5 py-0.5 border border-slate-100">
          💬 {item.note}
        </p>
      )}

      {/* Hàng 5: Action Buttons */}
      <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => navigate(`/attendance?scheduleId=${item.id}`)}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium rounded-md active:scale-95 transition-all min-h-[36px] lg:min-h-[30px]"
          title="Điểm danh buổi học này"
        >
          <span>✓</span>
          <span>Điểm danh</span>
        </button>

        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenEditModal(item)}
              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              title="Chỉnh sửa buổi học"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => handleDeleteSchedule(item.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Xóa buổi học"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* HEADER TRANG & THANH ĐIỀU HƯỚNG TUẦN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Lịch học
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Quản lý lịch giảng dạy theo tuần, theo chi nhánh và phân công giáo viên
          </p>
        </div>

        {/* Nút Tạo buổi học (Chỉ SuperAdmin và BranchManager) */}
        {canManage && (
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-xs min-h-[40px] px-4 text-xs md:text-sm transition-all"
          >
            <span>+</span>
            <span>Tạo buổi học</span>
          </button>
        )}
      </div>

      {/* THANH CÔNG CỤ: CHUYỂN TUẦN + BỘ LỌC */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3">
        {/* Hàng 1: Điều hướng tuần */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 active:scale-95 transition-all"
              title="Tuần trước"
            >
              ← Tuần trước
            </button>
            <button
              type="button"
              onClick={handleTodayWeek}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold active:scale-95 transition-all"
              title="Về tuần hôm nay"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 active:scale-95 transition-all"
              title="Tuần sau"
            >
              Tuần sau →
            </button>
          </div>

          <div className="text-xs md:text-sm font-semibold text-slate-800 flex items-center gap-1">
            <span>📅</span>
            <span>
              Tuần: {formatHeaderDate(weekDays[0])} – {formatHeaderDate(weekDays[6])} /{' '}
              {weekDays[6].getFullYear()}
            </span>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc (Chi nhánh, Lớp, Giáo viên) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Lọc Chi nhánh */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Chi nhánh:
            </label>
            <select
              disabled={isBranchManager}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              {isSuperAdmin && <option value="">-- Tất cả chi nhánh --</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Lớp học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Lớp học:
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="">-- Tất cả lớp học --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Giáo viên */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Giáo viên:
            </label>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="">-- Tất cả giáo viên --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO LỖI HOẶC LOADING */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs md:text-sm text-rose-700 flex items-center justify-between">
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
        <div className="rounded-xl bg-white border border-slate-200 p-12 text-center text-slate-500 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs md:text-sm">Đang tải lịch học...</p>
        </div>
      ) : (
        <>
          {/* 1. GIAO DIỆN DESKTOP (lg: >= 1024px) - LƯỚI 7 CỘT CỐ ĐỊNH */}
          <div className="hidden lg:grid lg:grid-cols-7 gap-3 items-start">
            {weekDays.map((dayObj, index) => {
              const dateKey = formatDateISO(dayObj);
              const isToday = dateKey === todayISO;
              const daySchedules = schedulesByDate[dateKey] || [];

              return (
                <div
                  key={dateKey}
                  className={`rounded-xl border flex flex-col min-h-[480px] transition-colors ${
                    isToday
                      ? 'border-blue-400 bg-blue-50/20 border-t-4 border-t-blue-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  {/* Header cột ngày */}
                  <div className="p-2.5 text-center border-b border-slate-100 bg-white rounded-t-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {getDayOfWeekName(index)}
                    </p>
                    <div className="mt-1 flex items-center justify-center">
                      {isToday ? (
                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold">
                          {dayObj.getDate()}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">
                          {dayObj.getDate()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Danh sách thẻ buổi học trong ngày */}
                  <div className="p-2 space-y-2.5 flex-1 flex flex-col">
                    {daySchedules.length === 0 ? (
                      <div className="flex-1 min-h-[140px] rounded-lg border border-dashed border-slate-200/80 bg-slate-50/50 flex flex-col items-center justify-center p-2 text-center text-xs text-slate-400">
                        <span>Trống lịch</span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleOpenCreateModal(dateKey)}
                            className="mt-1 text-[11px] text-blue-600 hover:underline"
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
                    className={`flex-1 min-w-[52px] py-2 px-1 rounded-xl text-center active:scale-95 transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : isToday
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-white text-slate-700 border border-slate-200'
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
                            ? 'bg-white'
                            : 'bg-blue-600'
                          : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Tiêu đề ngày đang xem trên mobile */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs md:text-sm font-bold text-slate-800">
                Lịch học ngày:{' '}
                {weekDays.find((d) => formatDateISO(d) === selectedMobileDate)
                  ? `${getDayOfWeekName(
                      weekDays.findIndex((d) => formatDateISO(d) === selectedMobileDate)
                    )}, ${selectedMobileDate.split('-').reverse().join('/')}`
                  : selectedMobileDate}
              </h3>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(selectedMobileDate)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  + Thêm buổi
                </button>
              )}
            </div>

            {/* Danh sách thẻ buổi học của ngày đang chọn */}
            <div className="space-y-2.5">
              {(schedulesByDate[selectedMobileDate] || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400 space-y-2">
                  <p>Không có buổi học nào được lên lịch trong ngày này.</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal(selectedMobileDate)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      + Tạo buổi học cho ngày này
                    </button>
                  )}
                </div>
              ) : (
                schedulesByDate[selectedMobileDate].map((s) => renderScheduleCard(s))
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL TẠO / SỬA BUỔI HỌC (SCHEDULE MODAL) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-180"
            onClick={() => !modalSubmitting && setModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 md:p-6 shadow-xl z-10 max-h-[92vh] overflow-y-auto transform-origin-center">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base md:text-lg font-bold text-slate-900">
                {editingSchedule ? 'Chỉnh sửa buổi học' : 'Tạo buổi học mới'}
              </h3>
              <button
                type="button"
                disabled={modalSubmitting}
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Báo lỗi modal nếu có */}
            {modalError && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-3.5 text-xs md:text-sm">
              {/* 1. Chọn Lớp học (BẮT BUỘC) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lớp học <span className="text-rose-500">*</span>
                </label>
                {editingSchedule ? (
                  <div className="w-full h-10 rounded-lg border border-slate-200 bg-slate-100 px-3 flex items-center text-slate-700 font-medium">
                    {editingSchedule.className}
                  </div>
                ) : (
                  <>
                    <select
                      required
                      value={formData.classId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, classId: e.target.value }))
                      }
                      className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map((cls) => {
                        const hasTeacher = Boolean(cls.teacherId);
                        return (
                          <option
                            key={cls.id}
                            value={cls.id}
                            disabled={!hasTeacher}
                            className={!hasTeacher ? 'text-slate-400' : ''}
                          >
                            {hasTeacher
                              ? `${cls.className} (${cls.teacherName || 'Đã có GV'})`
                              : `[Chưa gán GV] ${cls.className} (Không thể chọn)`}
                          </option>
                        );
                      })}
                    </select>

                    {/* Cảnh báo nếu lớp chưa gán GV */}
                    {formData.classId &&
                      !classes.find((c) => c.id === Number(formData.classId))?.teacherId && (
                        <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                          ⚠️ Lớp này chưa được phân công giáo viên phụ trách. Vui lòng vào trang
                          &quot;Quản lý Lớp học&quot; để phân công giáo viên trước khi xếp lịch.
                        </p>
                      )}
                  </>
                )}
              </div>

              {/* 2. Ngày học */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.studyDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, studyDate: e.target.value }))
                  }
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* 3. Giờ bắt đầu & Giờ kết thúc (BẮT BUỘC) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ bắt đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ kết thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Phòng học */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* 5. Giáo viên dạy thay (Tùy chọn) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giáo viên dạy thay (Tùy chọn)
                </label>
                <select
                  value={formData.substituteTeacherId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      substituteTeacherId: e.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="">-- Không có (Giáo viên chính phụ trách) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      👩‍🏫 {t.fullName} ({t.phoneNumber || 'Không có SĐT'})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Chỉ chọn khi giáo viên chính bận việc hoặc nghỉ phép đột xuất.
                </p>
              </div>

              {/* 6. Trạng thái buổi học (Chỉ khi sửa) */}
              {editingSchedule && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái buổi học
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Scheduled">Đã lên lịch (Scheduled)</option>
                    <option value="Completed">Đã hoàn thành / Đã điểm danh (Completed)</option>
                    <option value="Cancelled">Đã hủy (Cancelled)</option>
                  </select>
                </div>
              )}

              {/* 7. Ghi chú buổi học */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Footer modal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="h-9 px-5 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-xs disabled:opacity-70"
                >
                  {modalSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{editingSchedule ? 'Cập nhật' : 'Tạo buổi học'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
