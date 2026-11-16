import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 0) return 'Vừa xong';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    const d = past.getDate().toString().padStart(2, '0');
    const m = (past.getMonth() + 1).toString().padStart(2, '0');
    const y = past.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return '';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'Tuition':
      return '💰';
    case 'Payment':
      return '💳';
    case 'Schedule':
      return '📅';
    case 'Attendance':
      return '📋';
    case 'Homework':
      return '📚';
    case 'Grade':
      return '💯';
    case 'LeaveRequest':
      return '📝';
    case 'Class':
    case 'StudentClass':
      return '🏫';
    case 'Newsfeed':
      return '📰';
    default:
      return '🔔';
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef(null);

  // Tải danh sách thông báo khi mount và định kỳ mỗi 60 giây
  useEffect(() => {
    let ignore = false;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get('/Notifications');
        if (!ignore) {
          setNotifications(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.warn('Lỗi tải thông báo:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadNotifications();
      }
    }, 60000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  // Làm mới khi bấm mở dropdown
  const refreshNotifications = async () => {
    try {
      const res = await axiosClient.get('/Notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Lỗi làm mới thông báo:', err);
    }
  };

  // Click outside và Escape key để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      refreshNotifications();
    }
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await axiosClient.put('/Notifications/read-all');
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Lỗi khi đánh dấu đọc tất cả:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Đánh dấu 1 thông báo và chuyển hướng
  const handleClickNotification = async (notif) => {
    // Nếu chưa đọc thì đánh dấu đọc
    if (!notif.isRead) {
      try {
        await axiosClient.put(`/Notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notif.id
              ? { ...item, isRead: true, readAt: new Date().toISOString() }
              : item
          )
        );
      } catch (err) {
        console.warn('Lỗi đánh dấu đã đọc thông báo:', err);
      }
    }

    setIsOpen(false);

    // Chuyển hướng theo type
    switch (notif.type) {
      case 'Tuition':
        navigate('/tuitions');
        break;
      case 'Payment':
        navigate('/payments');
        break;
      case 'Schedule':
        navigate('/schedules');
        break;
      case 'Attendance':
        navigate('/attendance');
        break;
      case 'Homework':
        navigate('/homeworks');
        break;
      case 'Grade':
        navigate('/grades');
        break;
      case 'LeaveRequest':
        navigate('/leave-requests');
        break;
      case 'Class':
      case 'StudentClass':
        navigate('/classes');
        break;
      case 'Newsfeed':
        navigate('/newsfeed');
        break;
      default:
        // Không xác định thì không chuyển trang
        break;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Thông báo hệ thống"
        title="Thông báo"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge số chưa đọc */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75 duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[360px] sm:w-[380px] max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Danh sách thông báo"
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Thông báo</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer hover:underline"
              >
                {markingAll ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs">Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-2 text-slate-400">
                  🔕
                </div>
                <p className="text-sm font-semibold text-slate-700">Không có thông báo mới</p>
                <p className="text-xs text-slate-400 mt-1">
                  Khi có lịch học, học phí hoặc tin tức mới, thông báo sẽ hiển thị ở đây.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.isRead;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleClickNotification(item)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                      isUnread ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Icon loại thông báo */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${
                        isUnread
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Nội dung */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? 'font-bold text-slate-900'
                              : 'font-semibold text-slate-700'
                          }`}
                        >
                          {item.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Popover */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-center">
            <span className="text-[11px] text-slate-400">
              Roxy Academy — Hệ thống thông báo tức thì
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
