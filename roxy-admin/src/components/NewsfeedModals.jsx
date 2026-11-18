import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDateTime, NEWSFEED_AUDIENCE_META } from '../utils/formatters';
import ImageUpload from './ImageUpload';

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsfeed-detail-title"
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                  📌 Ghim
                </span>
              )}
              {!post.isPublished && (
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  Nháp
                </span>
              )}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${audience.badgeClass}`}
              >
                {audience.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                {post.branchId ? post.branchName || `Chi nhánh #${post.branchId}` : 'Toàn hệ thống'}
              </span>
            </div>

            <h3
              id="newsfeed-detail-title"
              className="text-lg font-bold leading-snug text-slate-900 break-words"
            >
              {post.title}
            </h3>

            <p className="text-xs text-slate-500">
              Đăng bởi <span className="font-semibold text-slate-700">{post.createdByName || 'Ban quản trị'}</span>
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {post.imageUrl && !imgError && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={post.imageUrl}
                alt={post.title}
                onError={() => setImgError(true)}
                className="max-h-80 w-full object-cover"
              />
            </div>
          )}

          <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-line break-words">
            {post.content}
          </div>

          {(post.titleEn || post.contentEn) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                English Version
              </p>
              {post.titleEn && (
                <p className="text-sm font-bold text-slate-800">{post.titleEn}</p>
              )}
              {post.contentEn && (
                <p className="text-sm text-slate-700 whitespace-pre-line break-words">
                  {post.contentEn}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(post)}
                  className="min-h-[40px] rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all cursor-pointer"
                >
                  ✏️ Sửa bài
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(post)}
                  className="min-h-[40px] rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition-all cursor-pointer"
                >
                  🗑️ Xóa bài
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Đóng
          </button>
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={() => !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsfeed-form-title"
    >
      <div
        className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 id="newsfeed-form-title" className="text-base font-bold text-slate-900">
              {isEdit ? 'Chỉnh sửa bài đăng' : 'Đăng bài mới lên Bảng tin'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông báo sẽ hiển thị tới đúng đối tượng và chi nhánh được chọn
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {submitError}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Ví dụ: Thông báo lịch nghỉ lễ 30/4 - 1/5..."
              className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.title}</p>
            )}
          </div>

          {/* Đối tượng & Chi nhánh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đối tượng nhận tin <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="All">Tất cả (Phụ huynh &amp; Giáo viên)</option>
                <option value="Parents">Chỉ Phụ huynh</option>
                <option value="Teachers">Chỉ Giáo viên</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phạm vi chi nhánh
              </label>
              {isBranchManager ? (
                <div className="min-h-[42px] flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                  🏢 {managerBranchName}
                </div>
              ) : (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-y"
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
          <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>📌 Ghim bài lên đầu</span>
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Xuất bản ngay</span>
            </label>
          </div>

          {/* Optional English */}
          <div>
            <button
              type="button"
              onClick={() => setShowEnglish((v) => !v)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {showEnglish ? '− Ẩn nội dung tiếng Anh' : '+ Thêm nội dung tiếng Anh (tùy chọn)'}
            </button>

            {showEnglish && (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề tiếng Anh (Title EN)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="English title..."
                    className="w-full min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nội dung tiếng Anh (Content EN)
                  </label>
                  <textarea
                    rows={3}
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    placeholder="English content..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none resize-y"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
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
              disabled={isSubmitting}
              className="min-h-[42px] rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSubmitting
                ? 'Đang lưu...'
                : isEdit
                ? 'Lưu thay đổi'
                : 'Đăng bài'}
            </button>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      onClick={() => !isDeleting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-newsfeed-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg">
              🗑️
            </div>
            <div>
              <h3 id="delete-newsfeed-title" className="text-base font-bold text-slate-900">
                Xác nhận xóa bài đăng
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Bạn có chắc chắn muốn xóa bài viết{' '}
                <span className="font-semibold text-slate-900">“{post.title}”</span>? Hành động
                này không thể hoàn tác.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa bài viết'}
          </button>
        </div>
      </div>
    </div>
  );
}
