import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime, NEWSFEED_AUDIENCE_META } from '../utils/formatters';
import ImageUpload from './ImageUpload';
import { PrimaryButton, SecondaryButton, InputPill, Badge } from './ui';

/**
 * Modal xem chi tiết bài đăng Bảng tin.
 */
export function NewsfeedDetailModal({
  post,
  canManage,
  onEdit,
  onDelete,
  onClose,
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!post) return null;

  const audience = NEWSFEED_AUDIENCE_META[post.targetAudience] || NEWSFEED_AUDIENCE_META.All;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsfeed-detail-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="modal-panel relative z-10 w-full sm:max-w-2xl rounded-t-card-lg sm:rounded-card-lg bg-surface shadow-modal border border-line/80 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line/60 bg-surface-subtle px-5 py-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {post.isPinned && (
                <Badge variant="gold" className="normal-case tracking-normal">
                  Ghim
                </Badge>
              )}
              {!post.isPublished && (
                <Badge variant="neutral" className="normal-case tracking-normal">
                  Nháp
                </Badge>
              )}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${audience.badgeClass}`}
              >
                {audience.label}
              </span>
              <Badge
                variant={post.branchId ? 'teal' : 'neutral'}
                className="normal-case tracking-normal"
              >
                {post.branchId ? post.branchName || `Chi nhánh #${post.branchId}` : 'Toàn hệ thống'}
              </Badge>
            </div>

            <h3
              id="newsfeed-detail-title"
              className="text-lg font-bold leading-snug text-ink break-words"
            >
              {post.title}
            </h3>

            <p className="text-xs text-ink-muted">
              Đăng bởi <span className="font-semibold text-ink-secondary">{post.createdByName || 'Ban quản trị'}</span>
              {' • '}
              {formatDateTime(post.createdAt)}
              {post.updatedAt && post.updatedAt !== post.createdAt && (
                <span> (Cập nhật: {formatDateTime(post.updatedAt)})</span>
              )}
            </p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {post.imageUrl && !imgError && (
            <div className="overflow-hidden rounded-card border border-line bg-surface-subtle">
              <img
                src={post.imageUrl}
                alt={post.title}
                onError={() => setImgError(true)}
                className="max-h-80 w-full object-cover"
              />
            </div>
          )}

          <div className="text-sm leading-relaxed text-ink whitespace-pre-line break-words">
            {post.content}
          </div>

          {(post.titleEn || post.contentEn) && (
            <div className="rounded-card border border-line bg-surface-subtle p-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                English Version
              </p>
              {post.titleEn && (
                <p className="text-sm font-bold text-ink">{post.titleEn}</p>
              )}
              {post.contentEn && (
                <p className="text-sm text-ink-secondary whitespace-pre-line break-words">
                  {post.contentEn}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-surface-subtle px-5 py-3.5">
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <SecondaryButton
                  onClick={() => onEdit(post)}
                  className="!px-4 !py-2 text-xs"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  <span>Sửa bài</span>
                </SecondaryButton>
                <button
                  type="button"
                  onClick={() => onDelete(post)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition-all duration-150 ease-out cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  <span>Xóa bài</span>
                </button>
              </>
            )}
          </div>

          <SecondaryButton onClick={onClose} className="!px-4 !py-2 text-xs">
            Đóng
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal Đăng bài mới / Chỉnh sửa bài đăng Bảng tin.
 * Chỉ dành cho SuperAdmin và BranchManager.
 */
export function CreateEditNewsfeedModal({
  post,
  currentUser,
  branches,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(post);
  const isBranchManager = currentUser?.role === 'BranchManager';
  const managerBranchId = currentUser?.branchId ? String(currentUser.branchId) : '';

  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [targetAudience, setTargetAudience] = useState(post?.targetAudience || 'All');
  const [branchId, setBranchId] = useState(() => {
    if (isBranchManager) return managerBranchId;
    return post?.branchId ? String(post.branchId) : '';
  });
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [isPinned, setIsPinned] = useState(Boolean(post?.isPinned));
  const [isPublished, setIsPublished] = useState(
    post ? Boolean(post.isPublished) : true
  );
  const [showEnglish, setShowEnglish] = useState(
    Boolean(post?.titleEn || post?.contentEn)
  );
  const [titleEn, setTitleEn] = useState(post?.titleEn || '');
  const [contentEn, setContentEn] = useState(post?.contentEn || '');

  const [fieldErrors, setFieldErrors] = useState({});
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

  const validate = () => {
    const errors = {};
    const t = title.trim();
    const c = content.trim();
    const img = imageUrl.trim();

    if (!t) {
      errors.title = 'Vui lòng nhập tiêu đề bài viết.';
    } else if (t.length > 200) {
      errors.title = 'Tiêu đề không được vượt quá 200 ký tự.';
    }

    if (!c) {
      errors.content = 'Vui lòng nhập nội dung bài viết.';
    }

    if (img && !/^https?:\/\/.+/i.test(img) && !img.startsWith('/')) {
      errors.imageUrl = 'URL ảnh phải bắt đầu bằng http://, https:// hoặc /';
    }

    if (isBranchManager && !managerBranchId) {
      errors.branchId = 'Tài khoản quản lý chưa được gán chi nhánh.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        titleEn: titleEn.trim() || null,
        contentEn: contentEn.trim() || null,
        imageUrl: imageUrl.trim() || null,
        targetAudience,
        branchId: isBranchManager
          ? Number(managerBranchId)
          : branchId
          ? Number(branchId)
          : null,
        isPinned,
        isPublished,
      };

      const res = isEdit
        ? await axiosClient.put(`/Newsfeeds/${post.id}`, payload)
        : await axiosClient.post('/Newsfeeds', payload);

      onSuccess(res.data, isEdit);
    } catch (err) {
      console.error('Lỗi lưu bài đăng:', err);
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message || err.response?.data?.title;
      if (status === 403) {
        setSubmitError(
          apiMsg || 'Bạn không có quyền thực hiện thao tác này trên chi nhánh đã chọn.'
        );
      } else if (status === 400) {
        setSubmitError(apiMsg || 'Dữ liệu bài đăng không hợp lệ. Vui lòng kiểm tra lại.');
      } else {
        setSubmitError(apiMsg || 'Không thể lưu bài đăng. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const managerBranchName =
    branches.find((b) => String(b.id) === managerBranchId)?.branchName ||
    currentUser?.branchName ||
    (managerBranchId ? `Chi nhánh #${managerBranchId}` : 'Chưa gán chi nhánh');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsfeed-form-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div
        className="modal-panel relative z-10 w-full sm:max-w-xl rounded-t-card-lg sm:rounded-card-lg bg-surface shadow-modal border border-line/80 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/60 bg-surface-subtle px-5 py-4">
          <div>
            <h3 id="newsfeed-form-title" className="text-base font-bold text-ink">
              {isEdit ? 'Chỉnh sửa bài đăng' : 'Đăng bài mới lên Bảng tin'}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Thông báo sẽ hiển thị tới đúng đối tượng và chi nhánh được chọn
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {submitError && (
            <div className="rounded-card border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {submitError}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <InputPill
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Ví dụ: Thông báo lịch nghỉ lễ 30/4 - 1/5..."
              className="!h-10 !py-0 text-sm"
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.title}</p>
            )}
          </div>

          {/* Đối tượng & Chi nhánh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Đối tượng nhận tin <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full h-10 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
              >
                <option value="All">Tất cả (Phụ huynh &amp; Giáo viên)</option>
                <option value="Parents">Chỉ Phụ huynh</option>
                <option value="Teachers">Chỉ Giáo viên</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Phạm vi chi nhánh
              </label>
              {isBranchManager ? (
                <div className="h-10 flex items-center rounded-full border border-line bg-surface-subtle px-3.5 py-2 text-sm font-medium text-ink-secondary">
                  {managerBranchName}
                </div>
              ) : (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-10 rounded-full border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
                >
                  <option value="">Toàn hệ thống</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.branchId && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.branchId}</p>
              )}
            </div>
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
              Nội dung <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setFieldErrors((prev) => ({ ...prev, content: '' }));
              }}
              placeholder="Nhập nội dung chi tiết thông báo..."
              className="w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none resize-y"
            />
            {fieldErrors.content && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.content}</p>
            )}
          </div>

          {/* Hình ảnh */}
          <ImageUpload
            label="Hình ảnh (tùy chọn)"
            value={imageUrl}
            onChange={(url) => {
              setImageUrl(url);
              setFieldErrors((prev) => ({ ...prev, imageUrl: '' }));
            }}
            folder="newsfeed"
            disabled={isSubmitting}
            error={fieldErrors.imageUrl}
          />

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-4 rounded-card border border-line bg-surface-subtle px-4 py-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-line text-teal focus:ring-gold/40"
              />
              <span>Ghim bài lên đầu</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-line text-teal focus:ring-gold/40"
              />
              <span>Xuất bản ngay</span>
            </label>
          </div>

          {/* Optional English */}
          <div>
            <button
              type="button"
              onClick={() => setShowEnglish((v) => !v)}
              className="text-xs font-semibold text-teal hover:text-teal-hover cursor-pointer"
            >
              {showEnglish ? '− Ẩn nội dung tiếng Anh' : '+ Thêm nội dung tiếng Anh (tùy chọn)'}
            </button>

            {showEnglish && (
              <div className="mt-3 space-y-3 rounded-card border border-line bg-surface-subtle p-3.5">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Tiêu đề tiếng Anh (Title EN)
                  </label>
                  <InputPill
                    type="text"
                    maxLength={200}
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="English title..."
                    className="!h-10 !py-0 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1">
                    Nội dung tiếng Anh (Content EN)
                  </label>
                  <textarea
                    rows={3}
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="English content..."
                    className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none resize-y"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line/60">
            <SecondaryButton onClick={onClose} disabled={isSubmitting}>
              Hủy
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Đang lưu...'
                : isEdit
                ? 'Lưu thay đổi'
                : 'Đăng bài'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal xác nhận xóa bài đăng Bảng tin.
 */
export function DeleteNewsfeedModal({ post, onClose, onSuccess }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onClose]);

  if (!post) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await axiosClient.delete(`/Newsfeeds/${post.id}`);
      onSuccess(post.id);
    } catch (err) {
      console.error('Lỗi xóa bài đăng:', err);
      const apiMsg = err.response?.data?.message || err.response?.data?.title;
      setError(apiMsg || 'Không thể xóa bài đăng. Vui lòng thử lại sau.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-newsfeed-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={() => !isDeleting && onClose()}
        aria-hidden="true"
      />
      <div
        className="modal-panel relative z-10 w-full max-w-md rounded-card-lg bg-surface shadow-modal border border-line/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <div>
              <h3 id="delete-newsfeed-title" className="text-base font-bold text-ink">
                Xác nhận xóa bài đăng
              </h3>
              <p className="mt-1 text-sm text-ink-secondary">
                Bạn có chắc chắn muốn xóa bài viết{' '}
                <span className="font-semibold text-ink">“{post.title}”</span>? Hành động
                này không thể hoàn tác.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-card border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line/60 bg-surface-subtle px-5 py-3.5">
          <SecondaryButton
            onClick={onClose}
            disabled={isDeleting}
            className="!px-4 !py-2 text-xs"
          >
            Hủy
          </SecondaryButton>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out cursor-pointer"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}
          </button>
        </div>
      </div>
    </div>
  );
}
