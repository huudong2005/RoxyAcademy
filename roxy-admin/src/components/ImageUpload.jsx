import { useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Component chọn ảnh, kiểm tra định dạng/dung lượng phía client và upload lên /Uploads/image.
 */
export default function ImageUpload({
  value = '',
  onChange,
  folder = 'general',
  label,
  disabled = false,
  error = '',
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [failedUrl, setFailedUrl] = useState('');

  const isDisabled = disabled || uploading;
  const previewError = Boolean(value && failedUrl === value);
  const displayError = uploadError || error;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset để chọn lại cùng file vẫn kích hoạt onChange
    e.target.value = '';

    if (!file) return;

    setUploadError('');

    const fileName = (file.name || '').toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    const hasValidMime = !file.type || ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());

    if (!hasValidExtension || !hasValidMime) {
      setUploadError('Chỉ chấp nhận ảnh định dạng JPG, JPEG, PNG hoặc WEBP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    setUploading(true);
    try {
      const res = await axiosClient.post('/Uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data?.url;
      if (uploadedUrl) {
        setFailedUrl('');
        onChange?.(uploadedUrl);
      } else {
        setUploadError('Không nhận được đường dẫn ảnh từ máy chủ. Vui lòng thử lại.');
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Tải ảnh lên thất bại. Vui lòng kiểm tra kết nối và thử lại.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (isDisabled) return;
    setUploadError('');
    setFailedUrl('');
    onChange?.('');
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isDisabled}
        className="hidden"
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              isDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]'
            }`}
          >
            {uploading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span>Đang tải lên...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{value ? 'Chọn ảnh khác' : 'Chọn ảnh từ thiết bị'}</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-slate-400">
            JPG, JPEG, PNG, WEBP • Tối đa 5MB
          </span>
        </div>

        {value && (
          <div className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            {previewError ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-[11px] text-slate-400 text-center px-1">
                Lỗi ảnh
              </div>
            ) : (
              <img
                src={value}
                alt="Ảnh xem trước"
                onError={() => setFailedUrl(value)}
                className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover bg-white"
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700">Ảnh đã tải lên</p>
              <p className="truncate text-[11px] text-slate-500" title={value}>
                {value}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              disabled={isDisabled}
              aria-label="Xóa ảnh"
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                isDisabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'cursor-pointer border-rose-200 bg-white text-rose-600 hover:bg-rose-50 active:scale-95'
              }`}
            >
              <span>✕</span>
              <span>Xóa ảnh</span>
            </button>
          </div>
        )}
      </div>

      {displayError && (
        <p className="mt-1 text-xs font-medium text-rose-600">{displayError}</p>
      )}
    </div>
  );
}
