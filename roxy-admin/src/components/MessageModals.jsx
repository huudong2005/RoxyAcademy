import { useState, useEffect, useMemo } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime } from '../utils/formatters';
import { PrimaryButton, SecondaryButton, InputPill, Badge } from './ui';

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-message-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div
        className="modal-panel relative z-10 w-full sm:max-w-lg rounded-t-card-lg sm:rounded-card-lg bg-surface shadow-modal border border-line/80 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/60 bg-surface-subtle px-5 py-4">
          <div>
            <h3 id="compose-message-title" className="text-base font-bold text-ink">
              {isReply ? 'Trả lời tin nhắn' : 'Soạn tin nhắn mới'}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Chỉ gửi được tới người nhận hoặc lớp học thuộc phạm vi phụ trách
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {submitError && (
            <div className="rounded-card border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {submitError}
            </div>
          )}

          {isReply && initialDraft.replyContext && (
            <div className="rounded-card border border-gold/40 bg-gold-soft/60 p-3 text-xs text-ink-secondary space-y-1">
              <p className="font-semibold text-teal">
                Đang trả lời: {initialDraft.replyContext.targetLabel}
              </p>
              {initialDraft.replyContext.preview && (
                <p className="text-ink-secondary line-clamp-2 italic">
                  “{initialDraft.replyContext.preview}”
                </p>
              )}
            </div>
          )}

          {/* Mode selector */}
          {!isReply && (
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Hình thức gửi
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-full bg-surface-subtle p-1 border border-line/70">
                <button
                  type="button"
                  onClick={() => handleModeChange('user')}
                  className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                    mode === 'user'
                      ? 'bg-teal text-gold shadow-xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span>Gửi cá nhân</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('class')}
                  className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                    mode === 'class'
                      ? 'bg-teal text-gold shadow-xs'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <span>Gửi lớp học</span>
                </button>
              </div>
            </div>
          )}

          {/* Recipient select */}
          {!isReply && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-ink-secondary">
                  {mode === 'user' ? 'Người nhận' : 'Lớp học nhận tin'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-ink-muted">
                  {mode === 'user' ? `${filteredUsers.length} người` : `${filteredClasses.length} lớp`}
                </span>
              </div>

              {!recipientsLoading && ((mode === 'user' && users.length > 6) || (mode === 'class' && classes.length > 6)) && (
                <InputPill
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder={
                    mode === 'user'
                      ? 'Tìm nhanh theo tên, vai trò, chi nhánh...'
                      : 'Tìm nhanh theo tên lớp, chi nhánh...'
                  }
                  className="!h-9 !py-0 text-xs"
                />
              )}

              {recipientsLoading ? (
                <div className="rounded-card border border-line bg-surface-subtle px-3 py-2.5 text-xs text-ink-muted">
                  Đang tải danh sách người nhận hợp lệ...
                </div>
              ) : mode === 'user' ? (
                <select
                  value={receiverId}
                  onChange={(e) => {
                    setReceiverId(e.target.value);
                    setFieldError('');
                  }}
                  className="w-full min-h-[42px] rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
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
                  className="w-full min-h-[42px] rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
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
              <label className="block text-xs font-semibold text-ink-secondary">
                Nội dung tin nhắn <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  content.length > 1900 ? 'text-amber-600' : 'text-ink-muted'
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
              className="w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none resize-y"
            />
            {fieldError && (
              <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldError}</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line/60">
            <SecondaryButton onClick={onClose} disabled={isSubmitting}>
              Hủy
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting || recipientsLoading}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
            </PrimaryButton>
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-detail-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="modal-panel relative z-10 w-full sm:max-w-lg rounded-t-card-lg sm:rounded-card-lg bg-surface shadow-modal border border-line/80 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line/60 bg-surface-subtle px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="message-detail-title" className="text-base font-bold text-ink truncate">
                Chi tiết tin nhắn
              </h3>
              {message.classId ? (
                <Badge variant="teal" className="normal-case tracking-normal">
                  Lớp {message.className || `#${message.classId}`}
                </Badge>
              ) : isPersonalInbox ? (
                message.isRead ? (
                  <Badge variant="emerald" className="normal-case tracking-normal">
                    Đã đọc
                  </Badge>
                ) : (
                  <Badge variant="gold" className="normal-case tracking-normal">
                    Chưa đọc
                  </Badge>
                )
              ) : null}
            </div>
            <p className="text-xs text-ink-muted mt-1">{formatDateTime(message.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata + Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-card border border-line bg-surface-subtle p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Người gửi:</span>
              <span className="font-semibold text-ink">{message.senderName || '—'}</span>
            </div>
            {message.receiverId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Người nhận:</span>
                <span className="font-semibold text-ink">{message.receiverName || '—'}</span>
              </div>
            )}
            {message.classId && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Lớp học:</span>
                <span className="font-semibold text-ink">{message.className || '—'}</span>
              </div>
            )}
            {message.studentName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Liên quan học viên:</span>
                <span className="font-semibold text-teal">{message.studentName}</span>
              </div>
            )}
            {message.readAt && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">Thời gian đọc:</span>
                <span className="text-ink-secondary">{formatDateTime(message.readAt)}</span>
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-surface p-4 text-sm leading-relaxed text-ink whitespace-pre-line break-words">
            {message.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-surface-subtle px-5 py-3.5">
          <div>
            {isPersonalInbox && !message.isRead && (
              <SecondaryButton
                onClick={() => onMarkAsRead(message.id)}
                disabled={markingRead}
                className="!px-4 !py-2 text-xs"
              >
                {markingRead ? 'Đang cập nhật...' : 'Đánh dấu đã đọc'}
              </SecondaryButton>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SecondaryButton onClick={onClose} className="!px-4 !py-2 text-xs">
              Đóng
            </SecondaryButton>
            {canReply && (
              <PrimaryButton onClick={() => onReply(message)} className="!px-4 !py-2 text-xs">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
                <span>Trả lời</span>
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
