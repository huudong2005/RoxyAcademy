import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { PrimaryButton, SecondaryButton } from './ui';

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
        />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    }
    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu mới phải có tối thiểu 8 ký tự.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu mới không khớp.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMsg('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await axiosClient.post('/Auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccessMsg(res.data?.message || 'Đổi mật khẩu thành công.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (typeof data === 'string' && data) ||
        data?.message ||
        data?.title ||
        'Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="modal-backdrop fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={() => !submitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="modal-panel relative z-10 w-full max-w-md rounded-2xl bg-white p-5 md:p-6 shadow-xl border border-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 id="change-password-title" className="text-base md:text-lg font-bold text-slate-900">
              Đổi mật khẩu
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật mật khẩu đăng nhập cho tài khoản của bạn
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {apiError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
            ⚠️ {apiError}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm" noValidate>
          {/* Mật khẩu hiện tại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu hiện tại <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                disabled={submitting}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (fieldErrors.currentPassword) {
                    setFieldErrors((prev) => ({ ...prev, currentPassword: '' }));
                  }
                }}
                placeholder="Nhập mật khẩu hiện tại"
                autoComplete="current-password"
                className={`w-full h-10 rounded-lg border bg-white pl-3 pr-10 text-slate-800 focus:outline-none ${
                  fieldErrors.currentPassword
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25 transition-[border-color,box-shadow] duration-150 ease-out'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <EyeIcon visible={showCurrent} />
              </button>
            </div>
            {fieldErrors.currentPassword && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.currentPassword}</p>
            )}
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                disabled={submitting}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                  }
                }}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                className={`w-full h-10 rounded-lg border bg-white pl-3 pr-10 text-slate-800 focus:outline-none ${
                  fieldErrors.newPassword
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25 transition-[border-color,box-shadow] duration-150 ease-out'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <EyeIcon visible={showNew} />
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.newPassword}</p>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                disabled={submitting}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                className={`w-full h-10 rounded-lg border bg-white pl-3 pr-10 text-slate-800 focus:outline-none ${
                  fieldErrors.confirmPassword
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-line focus:border-gold focus:ring-2 focus:ring-gold/25 transition-[border-color,box-shadow] duration-150 ease-out'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <SecondaryButton
              type="button"
              disabled={submitting}
              onClick={onClose}
            >
              {successMsg ? 'Đóng' : 'Hủy'}
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Cập nhật mật khẩu</span>
              )}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
