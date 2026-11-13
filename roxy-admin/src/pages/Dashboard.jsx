import { useState } from 'react';
import { Link } from 'react-router-dom';

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

  const todayStr = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const metricCards = [
    {
      title: 'Tổng số học viên',
      value: '—',
      note: 'Đang cập nhật từ hệ thống',
      icon: '🎓',
      accent: 'border-l-blue-500',
    },
    {
      title: 'Lớp đang mở',
      value: '—',
      note: 'Chưa có lớp kích hoạt',
      icon: '🏫',
      accent: 'border-l-emerald-500',
    },
    {
      title: 'Điểm danh hôm nay',
      value: '—',
      note: 'Chưa có buổi học nào',
      icon: '📅',
      accent: 'border-l-amber-500',
    },
    {
      title: 'Học phí chờ thu',
      value: '—',
      note: 'Dữ liệu Giai đoạn 1C',
      icon: '💰',
      accent: 'border-l-purple-500',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner Chào Mừng */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Chào mừng trở lại, {user.fullName || 'Quý Thầy/Cô'}!
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500">
              {todayStr} • Hệ thống quản lý học tập Roxy Academy
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/students"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <span>+ Xem Học viên</span>
            </Link>
            <Link
              to="/classes"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              <span>Quản lý Lớp học</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid 4 Thẻ Số Liệu (Ready-to-fill metric cards - KHÔNG DÙNG DỮ LIỆU BỊA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-l-4 ${card.accent}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-slate-400">
                {card.value}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 italic">{card.note}</p>
          </div>
        ))}
      </div>

      {/* Khối Empty State / Trạng thái hệ thống */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 md:p-12 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl text-blue-600 mb-4">
          📊
        </div>
        <h3 className="text-base md:text-lg font-semibold text-slate-800">
          Trung tâm đang trong quá trình cập nhật dữ liệu khóa học
        </h3>
        <p className="mt-1.5 max-w-md mx-auto text-xs md:text-sm text-slate-500 leading-relaxed">
          Hệ thống thống kê tự động sẽ hiển thị biểu đồ và chỉ số phân tích trực quan
          ngay khi danh sách học viên và lớp học được tạo đầy đủ.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/students"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <span>🎓 Quản lý Hồ sơ Học viên</span>
          </Link>
          <Link
            to="/classes"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            <span>🏫 Xem Danh sách Lớp học</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
