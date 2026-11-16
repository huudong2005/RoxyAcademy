import { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime } from '../utils/formatters';

const ROLE_LABELS = {
  SuperAdmin: 'Quản trị cấp cao',
  BranchManager: 'Quản lý cơ sở',
  Teacher: 'Giáo viên',
  Parent: 'Phụ huynh',
  Student: 'Học viên',
};

/**
 * Modal Soạn / Trả lời tin nhắn.
 * Hỗ trợ 2 chế độ: Gửi cá nhân (receiverId) hoặc Gửi lớp học (classId).
 */
export function ComposeMessageModal({
  recipients,
  recipientsLoading,
  initialDraft,
  onClose,
  onSuccess,
}) {
  const isReply = Boolean(initialDraft?.replyContext);
  const [mode, setMode] = useState(initialDraft?.mode || 'user'); // 'user' | 'class'
  const [receiverId, setReceiverId] = useState(
    initialDraft?.receiverId ? String(initialDraft.receiverId) : ''
  );
  const [classId, setClassId] = useState(
    initialDraft?.classId ? String(initialDraft.classId) : ''
  );
  const [recipientSearch, setRecipientSearch] = useState('');
  const [content, setContent] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const users = useMemo(() => recipients?.users || [], [recipients]);
  const classes = useMemo(() => recipients?.classes || [], [recipients]);

  const filteredUsers = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.fullName || '').toLowerCase();
      const role = (ROLE_LABELS[u.role] || u.role || '').toLowerCase();
      const branch = (u.branchName || '').toLowerCase();
      return name.includes(q) || role.includes(q) || branch.includes(q);
    });
  }, [users, recipientSearch]);

  const filteredClasses = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => {
      const name = (c.className || '').toLowerCase();
      const branch = (c.branchName || '').toLowerCase();
      return name.includes(q) || branch.includes(q);
    });
  }, [classes, recipientSearch]);

  const handleModeChange = (nextMode) => {
    if (isReply) return;
    setMode(nextMode);
    setRecipientSearch('');
    setFieldError('');
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    setSubmitError('');

    if (mode === 'user' && !receiverId) {
      setFieldError('Vui lòng chọn người nhận tin nhắn.');
      return;
    }
    if (mode === 'class' && !classId) {
      setFieldError('Vui lòng chọn lớp học nhận tin nhắn.');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      setFieldError('Vui lòng nhập nội dung tin nhắn.');
      return;
    }
    if (trimmed.length > 2000) {
      setFieldError('Nội dung tin nhắn không được vượt quá 2000 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        receiverId: mode === 'user' ? Number(receiverId) : null,
        classId: mode === 'class' ? Number(classId) : null,
        studentId: initialDraft?.studentId ? Number(initialDraft.studentId) : null,
        content: trimmed,
      };
      const res = await axiosClient.post('/Messages', payload);
      onSuccess(res.data, mode);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message || err.response?.data?.title;
      if (status === 403) {
        setSubmitError(
          apiMsg || 'Bạn không có quyền gửi tin nhắn tới người nhận hoặc lớp học này.'
        );
      } else if (status === 400) {
        setSubmitError(apiMsg || 'Dữ liệu tin nhắn không hợp lệ. Vui lòng kiểm tra lại.');
      } else {
        setSubmitError(apiMsg || 'Không thể gửi tin nhắn. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={() => !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-message-title"
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 id="compose-message-title" className="text-base font-bold text-slate-900">
              {isReply ? 'Trả lời tin nhắn' : 'Soạn tin nhắn mới'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chỉ gửi được tới người nhận hoặc lớp học thuộc phạm vi phụ trách
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {submitError}
            </div>
          )}

          {isReply && initialDraft.replyContext && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-blue-900">
                Đang trả lời: {initialDraft.replyContext.targetLabel}
              </p>
              {initialDraft.replyContext.preview && (
                <p className="text-slate-600 line-clamp-2 italic">
                  “{initialDraft.replyContext.preview}”
                </p>
              )}
            </div>
          )}

          {/* Mode selector */}
          {!isReply && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hình thức gửi
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange('user')}
                  className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                    mode === 'user'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👤 Gửi cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('class')}
                  className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                    mode === 'class'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏫 Gửi lớp học
                </button>
              </div>
            </div>
          )}

          {/* Recipient select */}
          {!isReply && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  {mode === 'user' ? 'Người nhận' : 'Lớp học nhận tin'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {mode === 'user' ? `${filteredUsers.length} người` : `${filteredClasses.length} lớp`}
                </span>
              </div>

              {!recipientsLoading && ((mode === 'user' && users.length > 6) || (mode === 'class' && classes.length > 6)) && (
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder={
                    mode === 'user'
                      ? 'Tìm nhanh theo tên, vai trò, chi nhánh...'
                      : 'Tìm nhanh theo tên lớp, chi nhánh...'
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              )}

              {recipientsLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  Đang tải danh sách người nhận hợp lệ...
                </div>
              ) : mode === 'user' ? (
                <select
                  value={receiverId}
                  onChange={(e) => {
                    setReceiverId(e.target.value);
                    setFieldError('');
                  }}
                  className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Chọn người nhận --</option>
                  {filteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {ROLE_LABELS[u.role] || u.role}
                      {u.branchName ? ` (${u.branchName})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setFieldError('');
                  }}
                  className="w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.className}
                      {c.branchName ? ` (${c.branchName})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Nội dung tin nhắn <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-medium ${
                  content.length > 1900 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {content.length}/2000
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={2000}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setFieldError('');
              }}
              placeholder="Nhập nội dung trao đổi rõ ràng, lịch sự..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y"
            />
            {fieldError && (
              <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldError}</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[42px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || recipientsLoading}
              className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal xem chi tiết tin nhắn.
 * Không có nút xóa tin nhắn.
 */
export function MessageDetailModal({
  message,
  activeTab,
  currentUserId,
  canReply,
  onMarkAsRead,
  markingRead,
  onReply,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!message) return null;

  const isPersonalInbox =
    activeTab === 'inbox' &&
    message.receiverId &&
    Number(message.receiverId) === Number(currentUserId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-detail-title"
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="message-detail-title" className="text-base font-bold text-slate-900 truncate">
                Chi tiết tin nhắn
              </h3>
              {message.classId ? (
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">
                  🏫 Lớp {message.className || `#${message.classId}`}
                </span>
              ) : isPersonalInbox ? (
                message.isRead ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    ✓ Đã đọc
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                    ● Chưa đọc
                  </span>
                )
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-1">{formatDateTime(message.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata + Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Người gửi:</span>
              <span className="font-semibold text-slate-900">{message.senderName || '—'}</span>
            </div>
            {message.receiverId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Người nhận:</span>
                <span className="font-semibold text-slate-900">{message.receiverName || '—'}</span>
              </div>
            )}
            {message.classId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Lớp học:</span>
                <span className="font-semibold text-slate-900">{message.className || '—'}</span>
              </div>
            )}
            {message.studentName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Liên quan học viên:</span>
                <span className="font-semibold text-blue-700">{message.studentName}</span>
              </div>
            )}
            {message.readAt && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Thời gian đọc:</span>
                <span className="text-slate-700">{formatDateTime(message.readAt)}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 whitespace-pre-line break-words">
            {message.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div>
            {isPersonalInbox && !message.isRead && (
              <button
                type="button"
                onClick={() => onMarkAsRead(message.id)}
                disabled={markingRead}
                className="min-h-[40px] rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                {markingRead ? 'Đang cập nhật...' : '✓ Đánh dấu đã đọc'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
            >
              Đóng
            </button>
            {canReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer"
              >
                ↩ Trả lời
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
