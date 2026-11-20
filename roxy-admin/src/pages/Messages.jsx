import { useState, useEffect, useMemo, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime } from '../utils/formatters';
import { ComposeMessageModal, MessageDetailModal } from '../components/MessageModals';
import {
  PageHeader,
  Card,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  InputPill,
  Badge,
} from '../components/ui';

const TABS = [
  { key: 'inbox', label: 'Hộp thư đến' },
  { key: 'outbox', label: 'Đã gửi' },
  { key: 'class', label: 'Tin lớp học' },
];

/**
 * Màn hình Tin nhắn (/messages) — hiển thị cho tất cả vai trò đã đăng nhập.
 * Backend tự lọc phạm vi dữ liệu theo vai trò & chi nhánh. Không có chức năng xóa tin nhắn.
 */
export default function Messages() {
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  });

  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'outbox' | 'class'
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Đếm số tin chưa đọc ở Hộp thư đến (giữ lại khi chuyển tab)
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  // Bộ lọc tìm kiếm client-side
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  // Danh sách người nhận hợp lệ
  const [recipients, setRecipients] = useState({ users: [], classes: [] });
  const [recipientsLoading, setRecipientsLoading] = useState(true);

  // Modal state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [markingReadId, setMarkingReadId] = useState(null);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Tải danh sách người nhận hợp lệ 1 lần
  useEffect(() => {
    let ignore = false;
    const fetchRecipients = async () => {
      setRecipientsLoading(true);
      try {
        const res = await axiosClient.get('/Messages/recipients');
        if (!ignore) {
          setRecipients({
            users: Array.isArray(res.data?.users) ? res.data.users : [],
            classes: Array.isArray(res.data?.classes) ? res.data.classes : [],
          });
        }
      } catch (err) {
        console.error('Lỗi tải danh sách người nhận:', err);
      } finally {
        if (!ignore) setRecipientsLoading(false);
      }
    };
    fetchRecipients();
    return () => {
      ignore = true;
    };
  }, []);

  // Tải danh sách tin nhắn theo tab
  useEffect(() => {
    let ignore = false;
    const fetchMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axiosClient.get('/Messages', {
          params: { type: activeTab },
        });
        if (!ignore) {
          const list = Array.isArray(res.data) ? res.data : [];
          setMessages(list);
          if (activeTab === 'inbox') {
            const unread = list.filter(
              (m) => !m.isRead && (!currentUserId || Number(m.receiverId) === currentUserId)
            ).length;
            setInboxUnreadCount(unread);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải tin nhắn:', err);
          setError(
            err.response?.data?.message ||
              'Không thể tải danh sách tin nhắn. Vui lòng thử lại sau.'
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMessages();
    return () => {
      ignore = true;
    };
  }, [activeTab, reloadKey, currentUserId]);

  const refreshMessages = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Đánh dấu đã đọc (chỉ người nhận đích danh)
  const handleMarkAsRead = useCallback(
    async (messageId) => {
      setMarkingReadId(messageId);
      try {
        const res = await axiosClient.put(`/Messages/${messageId}/read`);
        const updated = res.data;
        const nowIso = updated?.readAt || new Date().toISOString();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isRead: true, readAt: nowIso } : m
          )
        );
        setSelectedMessage((prev) =>
          prev && prev.id === messageId ? { ...prev, isRead: true, readAt: nowIso } : prev
        );
        setInboxUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Lỗi đánh dấu đã đọc:', err);
        showToast(
          err.response?.data?.message || 'Không thể đánh dấu tin nhắn đã đọc.',
          'error'
        );
      } finally {
        setMarkingReadId(null);
      }
    },
    [showToast]
  );

  // Mở chi tiết tin nhắn & tự động đánh dấu đã đọc nếu là tin cá nhân chưa đọc trong hộp thư đến
  const handleOpenDetail = (msg) => {
    setSelectedMessage(msg);
    const isPersonalUnreadInbox =
      activeTab === 'inbox' &&
      !msg.isRead &&
      msg.receiverId &&
      (!currentUserId || Number(msg.receiverId) === currentUserId);

    if (isPersonalUnreadInbox) {
      handleMarkAsRead(msg.id);
    }
  };

  // Kiểm tra tin nhắn có thể trả lời được không (người nhận/lớp nằm trong recipients)
  const canReplyToMessage = useCallback(
    (msg) => {
      if (!msg) return false;
      if (activeTab === 'inbox' && msg.senderId) {
        return recipients.users.some((u) => Number(u.id) === Number(msg.senderId));
      }
      if (activeTab === 'class' && msg.classId) {
        return recipients.classes.some((c) => Number(c.id) === Number(msg.classId));
      }
      return false;
    },
    [activeTab, recipients]
  );

  // Mở modal trả lời
  const handleReply = (msg) => {
    setSelectedMessage(null);
    if (activeTab === 'class' && msg.classId) {
      setComposeDraft({
        mode: 'class',
        classId: msg.classId,
        studentId: msg.studentId || null,
        replyContext: {
          targetLabel: `Lớp ${msg.className || `#${msg.classId}`}`,
          preview: msg.content,
        },
      });
    } else if (msg.senderId) {
      setComposeDraft({
        mode: 'user',
        receiverId: msg.senderId,
        studentId: msg.studentId || null,
        replyContext: {
          targetLabel: msg.senderName || `Người dùng #${msg.senderId}`,
          preview: msg.content,
        },
      });
    }
    setComposeOpen(true);
  };

  // Mở modal soạn mới
  const handleOpenCompose = () => {
    setComposeDraft(null);
    setComposeOpen(true);
  };

  // Lọc client-side
  const filteredMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return messages.filter((m) => {
      if (activeTab === 'inbox' && onlyUnread && m.isRead) return false;
      if (!q) return true;
      return (
        (m.content || '').toLowerCase().includes(q) ||
        (m.senderName || '').toLowerCase().includes(q) ||
        (m.receiverName || '').toLowerCase().includes(q) ||
        (m.className || '').toLowerCase().includes(q) ||
        (m.studentName || '').toLowerCase().includes(q)
      );
    });
  }, [messages, searchTerm, activeTab, onlyUnread]);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-modal transition-all duration-150 ease-out ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-teal text-white'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        eyebrow="Trao đổi & Liên lạc"
        title="Tin nhắn trao đổi"
        description="Trao đổi trực tiếp với phụ huynh, giáo viên, quản lý hoặc gửi thông báo theo lớp học"
        actions={
          <PrimaryButton onClick={handleOpenCompose}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Soạn tin nhắn</span>
          </PrimaryButton>
        }
      />

      {/* Tabs + Search Bar */}
      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-full bg-surface-subtle p-1 overflow-x-auto border border-line/70">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setOnlyUnread(false);
                  }}
                  className={`min-h-[36px] inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'bg-teal text-gold shadow-xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.key === 'inbox' && inboxUnreadCount > 0 && (
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[11px] font-bold text-teal">
                      {inboxUnreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-72">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <InputPill
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nội dung, người gửi/nhận, lớp..."
                className="!h-10 !pl-9 !pr-4 !py-0 text-sm"
              />
            </div>

            {activeTab === 'inbox' && (
              <button
                type="button"
                onClick={() => setOnlyUnread((v) => !v)}
                className={`min-h-[40px] rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                  onlyUnread
                    ? 'border-gold bg-gold-soft text-teal'
                    : 'border-line bg-surface text-ink-secondary hover:bg-mint-canvas'
                }`}
              >
                Chưa đọc
              </button>
            )}

            <IconButton
              onClick={refreshMessages}
              title="Làm mới danh sách"
              aria-label="Làm mới"
              className="h-10 w-10 shrink-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </IconButton>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <SecondaryButton
            onClick={refreshMessages}
            className="!px-3.5 !py-1.5 text-xs !border-rose-300 !text-rose-700 hover:!bg-rose-100"
          >
            Thử lại
          </SecondaryButton>
        </div>
      )}

      {/* Message List */}
      <Card large className="tab-content overflow-hidden">
        {loading ? (
          <div className="divide-y divide-line/60">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 sm:p-5 animate-pulse flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-full bg-surface-subtle shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-surface-subtle" />
                  <div className="h-3.5 w-full rounded bg-surface-subtle" />
                  <div className="h-3.5 w-2/3 rounded bg-surface-subtle" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle border border-line text-ink-muted">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink">
              {searchTerm.trim() || onlyUnread
                ? 'Không tìm thấy tin nhắn phù hợp'
                : activeTab === 'inbox'
                ? 'Hộp thư đến chưa có tin nhắn nào'
                : activeTab === 'outbox'
                ? 'Bạn chưa gửi tin nhắn nào'
                : 'Chưa có tin nhắn lớp học nào'}
            </p>
            <p className="text-xs text-ink-muted">
              {searchTerm.trim() || onlyUnread
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc chưa đọc.'
                : 'Nhấn "Soạn tin nhắn" để bắt đầu trao đổi.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {filteredMessages.map((msg) => {
              const isInboxUnread =
                activeTab === 'inbox' &&
                !msg.isRead &&
                msg.receiverId &&
                (!currentUserId || Number(msg.receiverId) === currentUserId);

              const primaryTitle =
                activeTab === 'inbox'
                  ? msg.senderName || 'Không rõ người gửi'
                  : activeTab === 'outbox'
                  ? msg.classId
                    ? `Lớp ${msg.className || `#${msg.classId}`}`
                    : `Tới: ${msg.receiverName || 'Không rõ người nhận'}`
                  : `Lớp ${msg.className || `#${msg.classId}`}`;

              const avatarName =
                activeTab === 'inbox'
                  ? msg.senderName
                  : activeTab === 'outbox'
                  ? msg.receiverName || msg.className
                  : msg.senderName;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleOpenDetail(msg)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenDetail(msg);
                    }
                  }}
                  className={`group flex items-start gap-3.5 p-4 sm:px-5 sm:py-4 transition-colors duration-150 cursor-pointer ${
                    isInboxUnread
                      ? 'bg-gold-soft/45 hover:bg-gold-soft/70'
                      : 'bg-surface hover:bg-mint-canvas/50'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isInboxUnread
                        ? 'bg-teal text-gold'
                        : 'bg-surface-subtle text-ink-secondary border border-line/70'
                    }`}
                  >
                    {getInitials(avatarName)}
                    {isInboxUnread && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-gold"
                        title="Chưa đọc"
                      />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className={`truncate text-sm ${
                            isInboxUnread ? 'font-bold text-ink' : 'font-semibold text-ink'
                          }`}
                        >
                          {primaryTitle}
                        </span>

                        {activeTab === 'class' && msg.senderName && (
                          <span className="text-xs text-ink-muted">
                            • Gửi bởi <span className="font-medium text-ink-secondary">{msg.senderName}</span>
                          </span>
                        )}

                        {msg.classId && activeTab !== 'class' && (
                          <Badge variant="teal" className="normal-case tracking-normal">
                            {msg.className || `Lớp #${msg.classId}`}
                          </Badge>
                        )}

                        {msg.studentName && (
                          <Badge variant="neutral" className="normal-case tracking-normal">
                            {msg.studentName}
                          </Badge>
                        )}
                      </div>

                      <span className="text-xs text-ink-muted whitespace-nowrap">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>

                    <p
                      className={`text-sm line-clamp-2 break-words ${
                        isInboxUnread ? 'font-medium text-ink' : 'text-ink-secondary'
                      }`}
                    >
                      {msg.content}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {activeTab === 'inbox' && msg.receiverId && (
                          <span
                            className={`text-[11px] font-medium ${
                              msg.isRead ? 'text-emerald-700' : 'text-teal font-semibold'
                            }`}
                          >
                            {msg.isRead ? 'Đã đọc' : 'Chưa đọc'}
                          </span>
                        )}
                        {activeTab === 'outbox' && msg.receiverId && (
                          <span className="text-[11px] text-ink-muted">
                            {msg.isRead ? 'Người nhận đã xem' : 'Đã gửi'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isInboxUnread && (
                          <SecondaryButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(msg.id);
                            }}
                            disabled={markingReadId === msg.id}
                            className="!px-3 !py-1 text-[11px]"
                          >
                            {markingReadId === msg.id ? 'Đang lưu...' : 'Đánh dấu đã đọc'}
                          </SecondaryButton>
                        )}
                        <span className="text-xs font-medium text-teal opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden sm:inline">
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modals */}
      {composeOpen && (
        <ComposeMessageModal
          recipients={recipients}
          recipientsLoading={recipientsLoading}
          initialDraft={composeDraft}
          onClose={() => {
            setComposeOpen(false);
            setComposeDraft(null);
          }}
          onSuccess={(_created, sentMode) => {
            setComposeOpen(false);
            setComposeDraft(null);
            showToast('Đã gửi tin nhắn thành công.');
            if (sentMode === 'class' && activeTab !== 'class') {
              setActiveTab('class');
            } else if (sentMode === 'user' && activeTab !== 'outbox') {
              setActiveTab('outbox');
            } else {
              refreshMessages();
            }
          }}
        />
      )}

      {selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          activeTab={activeTab}
          currentUserId={currentUserId}
          canReply={canReplyToMessage(selectedMessage)}
          onMarkAsRead={handleMarkAsRead}
          markingRead={markingReadId === selectedMessage.id}
          onReply={handleReply}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}
