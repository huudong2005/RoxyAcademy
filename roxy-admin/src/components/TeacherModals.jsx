import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';
import { PrimaryButton, SecondaryButton, InputPill, Badge } from './ui';

/**
 * Helper trích xuất thông báo lỗi dễ hiểu từ response của ASP.NET Core API.
 */
function extractApiError(err, fallback) {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const msgs = Object.values(data.errors).flat().filter(Boolean);
    if (msgs.length > 0) return msgs.join(' ');
  }
  if (!err?.response) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.';
  }
  return fallback;
}

/**
 * Modal Thêm mới / Chỉnh sửa thông tin Giáo viên.
 * - Mobile: Bottom sheet; Desktop: Centered modal.
 * - Chỉ tạo tài khoản vai trò Teacher.
 * - BranchManager bị khóa cứng chi nhánh của mình.
 */
export function CreateEditTeacherModal({
  teacher,
  branches,
  isSuperAdmin,
  managerBranchId,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(teacher);

  const [fullName, setFullName] = useState(teacher?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(teacher?.phoneNumber || '');
  const [email, setEmail] = useState(teacher?.email || '');
  const [branchId, setBranchId] = useState(() => {
    if (isEdit) return teacher?.branchId ? String(teacher.branchId) : '';
    if (!isSuperAdmin && managerBranchId) return String(managerBranchId);
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(
    teacher?.preferredLanguage || 'vi'
  );
  const [isActive, setIsActive] = useState(teacher ? Boolean(teacher.isActive) : true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeBranches = branches.filter(
    (b) => b.isActive || String(b.id) === String(branchId)
  );

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
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errors.fullName = 'Vui lòng nhập họ và tên giáo viên.';
    } else if (trimmedName.length > 150) {
      errors.fullName = 'Họ tên tối đa 150 ký tự.';
    }

    if (!trimmedPhone) {
      errors.phoneNumber = 'Vui lòng nhập số điện thoại.';
    } else if (!/^0\d{9}$/.test(trimmedPhone)) {
      errors.phoneNumber = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.';
    }

    if (trimmedEmail) {
      if (trimmedEmail.length > 150) {
        errors.email = 'Email tối đa 150 ký tự.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errors.email = 'Định dạng email không hợp lệ.';
      }
    }

    const effectiveBranchId = isSuperAdmin ? branchId : managerBranchId;
    if (!effectiveBranchId) {
      errors.branchId = 'Vui lòng chọn chi nhánh công tác.';
    }

    if (!isEdit && password) {
      if (password.length < 8 || password.length > 100) {
        errors.password = 'Mật khẩu phải từ 8 đến 100 ký tự.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const effectiveBranchId = Number(isSuperAdmin ? branchId : managerBranchId);
      const trimmedPhone = phoneNumber.trim();
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();

      if (isEdit) {
        await axiosClient.put(`/Users/${teacher.id}`, {
          phoneNumber: trimmedPhone,
          fullName: trimmedName,
          email: trimmedEmail || null,
          branchId: effectiveBranchId,
          preferredLanguage,
          isActive,
        });
        onSuccess('Cập nhật thông tin giáo viên thành công.');
      } else {
        const payload = {
          phoneNumber: trimmedPhone,
          fullName: trimmedName,
          email: trimmedEmail || null,
          role: 'Teacher',
          branchId: effectiveBranchId,
          preferredLanguage,
        };
        if (password) {
          payload.password = password;
        }
        await axiosClient.post('/Users', payload);
        onSuccess('Thêm giáo viên mới thành công.');
      }
    } catch (err) {
      console.error('Lỗi lưu thông tin giáo viên:', err);
      setSubmitError(
        extractApiError(err, 'Không thể lưu thông tin giáo viên. Vui lòng thử lại.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-surface rounded-t-card-lg sm:rounded-card-lg border border-line/60 shadow-modal modal-panel max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="sm:hidden pt-2.5 pb-1">
          <div className="w-10 h-1 bg-line-strong rounded-full mx-auto" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-line/60 sticky top-0 bg-surface z-10">
          <h2 id="teacher-modal-title" className="text-lg font-bold text-ink">
            {isEdit ? 'Chỉnh sửa thông tin giáo viên' : 'Thêm giáo viên mới'}
          </h2>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {submitError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-card p-3.5 text-sm flex items-start gap-2.5">
              <span className="shrink-0">⚠️</span>
              <span className="leading-relaxed">{submitError}</span>
            </div>
          )}

          {/* Họ và tên */}
          <div>
            <label
              htmlFor="teacher-fullname"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Họ và tên <span className="text-rose-600">*</span>
            </label>
            <InputPill
              id="teacher-fullname"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: '' }));
              }}
              placeholder="VD: Nguyễn Thị Minh Anh"
              maxLength={150}
              disabled={isSubmitting}
              className={
                fieldErrors.fullName
                  ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/20'
                  : ''
              }
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Số điện thoại & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="teacher-phone"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Số điện thoại <span className="text-rose-600">*</span>
              </label>
              <InputPill
                id="teacher-phone"
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (fieldErrors.phoneNumber)
                    setFieldErrors((p) => ({ ...p, phoneNumber: '' }));
                }}
                placeholder="0901234567"
                maxLength={10}
                disabled={isSubmitting}
                className={`font-mono tabular-nums ${
                  fieldErrors.phoneNumber
                    ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/20'
                    : ''
                }`}
              />
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="teacher-email"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Email <span className="text-xs font-normal text-ink-muted">(tùy chọn)</span>
              </label>
              <InputPill
                id="teacher-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                placeholder="giaovien@roxy.edu.vn"
                maxLength={150}
                disabled={isSubmitting}
                className={
                  fieldErrors.email
                    ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/20'
                    : ''
                }
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          {/* Chi nhánh & Ngôn ngữ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="teacher-branch"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Chi nhánh <span className="text-rose-600">*</span>
              </label>
              <select
                id="teacher-branch"
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  if (fieldErrors.branchId) setFieldErrors((p) => ({ ...p, branchId: '' }));
                }}
                disabled={!isSuperAdmin || isSubmitting}
                className={`w-full rounded-full border px-4 py-2.5 text-sm transition-[border-color,box-shadow] duration-150 focus:outline-none ${
                  !isSuperAdmin
                    ? 'bg-surface-subtle text-ink-muted border-line cursor-not-allowed'
                    : fieldErrors.branchId
                      ? 'bg-surface text-ink border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'bg-surface text-ink border-line focus:border-gold focus:ring-2 focus:ring-gold/25'
                }`}
              >
                <option value="">-- Chọn chi nhánh --</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
              {!isSuperAdmin && (
                <p className="mt-1 text-[11px] text-ink-muted">
                  Cố định theo chi nhánh bạn đang quản lý.
                </p>
              )}
              {fieldErrors.branchId && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.branchId}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="teacher-lang"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Ngôn ngữ giao diện
              </label>
              <select
                id="teacher-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none"
              >
                <option value="vi">Tiếng Việt (vi)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
          </div>

          {/* Mật khẩu khi tạo mới */}
          {!isEdit && (
            <div>
              <label
                htmlFor="teacher-password"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Mật khẩu khởi tạo{' '}
                <span className="text-xs font-normal text-ink-muted">
                  (tùy chọn, tối thiểu 8 ký tự)
                </span>
              </label>
              <div className="relative">
                <InputPill
                  id="teacher-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  placeholder="Để trống nếu cấp mật khẩu sau"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  className={`pr-16 ${
                    fieldErrors.password
                      ? '!border-rose-400 focus:!border-rose-500 focus:!ring-rose-500/20'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 px-2 text-xs font-semibold text-ink-muted hover:text-teal cursor-pointer"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.password}</p>
              )}
            </div>
          )}

          {/* Trạng thái hoạt động khi chỉnh sửa */}
          {isEdit && (
            <div className="pt-1">
              <label className="flex items-center justify-between gap-3 p-3.5 rounded-card border border-line bg-surface-subtle cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Trạng thái tài khoản
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {isActive
                      ? 'Giáo viên đang hoạt động và có thể đăng nhập hệ thống.'
                      : 'Tài khoản đang bị khóa, không thể đăng nhập.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                  className="h-5 w-5 accent-teal rounded cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-line/60">
            <SecondaryButton
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản giáo viên'}</span>
              )}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal Đặt lại mật khẩu giáo viên (POST /api/Users/{id}/reset-password).
 */
export function ResetTeacherPasswordModal({ teacher, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (!newPassword || newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword.length > 100) {
      setError('Mật khẩu mới tối đa 100 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu chưa khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosClient.post(`/Users/${teacher.id}/reset-password`, {
        newPassword,
      });
      onSuccess(`Đã đặt lại mật khẩu cho giáo viên ${teacher.fullName}.`);
    } catch (err) {
      console.error('Lỗi đặt lại mật khẩu:', err);
      setError(
        extractApiError(err, 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-pwd-title"
        className="relative z-10 w-full sm:max-w-md bg-surface rounded-t-card-lg sm:rounded-card-lg border border-line/60 shadow-modal modal-panel p-5 sm:p-6 pb-[env(safe-area-inset-bottom,16px)] sm:pb-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="reset-pwd-title" className="text-lg font-bold text-ink">
            Đặt lại mật khẩu
          </h2>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-ink-secondary">
          Cấp mật khẩu đăng nhập mới cho giáo viên{' '}
          <span className="font-semibold text-ink">{teacher.fullName}</span> (
          <span className="font-mono text-ink">{teacher.phoneNumber}</span>).
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-card p-3 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="reset-new-pwd"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Mật khẩu mới <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <InputPill
                id="reset-new-pwd"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                disabled={isSubmitting}
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 px-2 text-xs font-semibold text-ink-muted hover:text-teal cursor-pointer"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-confirm-pwd"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Xác nhận mật khẩu mới <span className="text-rose-600">*</span>
            </label>
            <InputPill
              id="reset-confirm-pwd"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <SecondaryButton
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal Xác nhận Khóa / Mở khóa tài khoản giáo viên.
 * - Khóa: DELETE /api/Users/{id} (bắt lỗi 409 nếu đang dạy lớp chưa kết thúc)
 * - Mở khóa: PUT /api/Users/{id} với isActive: true
 */
export function ToggleTeacherStatusModal({ teacher, onClose, onSuccess }) {
  const isLocking = Boolean(teacher.isActive);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      if (isLocking) {
        await axiosClient.delete(`/Users/${teacher.id}`);
        onSuccess(`Đã khóa tài khoản giáo viên ${teacher.fullName}.`);
      } else {
        await axiosClient.put(`/Users/${teacher.id}`, {
          phoneNumber: teacher.phoneNumber,
          fullName: teacher.fullName,
          email: teacher.email || null,
          branchId: teacher.branchId,
          preferredLanguage: teacher.preferredLanguage || 'vi',
          isActive: true,
        });
        onSuccess(`Đã mở khóa tài khoản giáo viên ${teacher.fullName}.`);
      }
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái giáo viên:', err);
      setError(
        extractApiError(
          err,
          isLocking
            ? 'Không thể khóa tài khoản giáo viên này.'
            : 'Không thể mở khóa tài khoản giáo viên này.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full sm:max-w-md bg-surface rounded-t-card-lg sm:rounded-card-lg border border-line/60 shadow-modal modal-panel p-5 sm:p-6 pb-[env(safe-area-inset-bottom,16px)] sm:pb-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 ${
              isLocking ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {isLocking ? '🔒' : '🔓'}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink">
              {isLocking
                ? 'Khóa tài khoản giáo viên?'
                : 'Mở khóa tài khoản giáo viên?'}
            </h3>
            <p className="mt-1 text-sm text-ink-secondary leading-relaxed">
              {isLocking ? (
                <>
                  Giáo viên{' '}
                  <span className="font-semibold text-ink">{teacher.fullName}</span>{' '}
                  sẽ không thể đăng nhập vào hệ thống sau khi bị khóa.
                </>
              ) : (
                <>
                  Khôi phục quyền đăng nhập và hoạt động cho giáo viên{' '}
                  <span className="font-semibold text-ink">{teacher.fullName}</span>.
                </>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-card p-3.5 text-sm flex items-start gap-2">
            <span className="shrink-0">❌</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </SecondaryButton>
          {isLocking ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-full shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận khóa'}
            </button>
          ) : (
            <PrimaryButton
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận mở khóa'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Drawer / Modal Chi tiết Giáo viên:
 * - Thông tin cá nhân (GET /api/Users/{id})
 * - Lớp đang dạy (GET /api/Classes lọc teacherId === teacher.id)
 * - Lịch dạy (GET /api/Schedules?teacherId={teacher.id})
 */
export function TeacherDetailDrawer({
  teacher,
  onClose,
  onEdit,
  onResetPassword,
  onToggleStatus,
}) {
  const [detail, setDetail] = useState(teacher);
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let ignore = false;
    const loadDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const [userRes, classesRes, schedulesRes] = await Promise.allSettled([
          axiosClient.get(`/Users/${teacher.id}`),
          axiosClient.get('/Classes'),
          axiosClient.get('/Schedules', { params: { teacherId: teacher.id } }),
        ]);

        if (ignore) return;

        if (userRes.status === 'fulfilled' && userRes.value?.data) {
          setDetail(userRes.value.data);
        }

        if (classesRes.status === 'fulfilled') {
          const allClasses = Array.isArray(classesRes.value?.data)
            ? classesRes.value.data
            : [];
          setClasses(allClasses.filter((c) => c.teacherId === teacher.id));
        }

        if (schedulesRes.status === 'fulfilled') {
          const rawSchedules = Array.isArray(schedulesRes.value?.data)
            ? schedulesRes.value.data
            : [];
          const sorted = [...rawSchedules].sort((a, b) => {
            const d = (a.studyDate || '').localeCompare(b.studyDate || '');
            if (d !== 0) return d;
            return (a.startTime || '').localeCompare(b.startTime || '');
          });
          setSchedules(sorted);
        }

        if (
          userRes.status === 'rejected' &&
          classesRes.status === 'rejected' &&
          schedulesRes.status === 'rejected'
        ) {
          setError('Không thể tải chi tiết giáo viên. Vui lòng thử lại.');
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải chi tiết giáo viên:', err);
          setError('Không thể tải chi tiết giáo viên.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [teacher.id]);

  const classStatusBadge = (status) => {
    switch (status) {
      case 'Ongoing':
        return <Badge variant="emerald">Đang học</Badge>;
      case 'Upcoming':
        return <Badge variant="blue">Sắp khai giảng</Badge>;
      case 'Finished':
        return <Badge variant="neutral">Đã kết thúc</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const scheduleStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="emerald">Đã dạy</Badge>;
      case 'Cancelled':
        return <Badge variant="rose">Đã hủy</Badge>;
      default:
        return <Badge variant="blue">Sắp tới</Badge>;
    }
  };

  const formatTimeShort = (t) => {
    if (!t) return '—';
    return String(t).slice(0, 5);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-detail-title"
        className="relative z-10 w-full max-w-xl bg-surface border-l border-line/60 h-full shadow-modal flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-line/60 bg-surface shrink-0">
          <div className="min-w-0">
            <h2
              id="teacher-detail-title"
              className="text-lg font-bold text-ink truncate"
            >
              {detail.fullName}
            </h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Hồ sơ giáo viên • {detail.branchName || 'Chưa gán chi nhánh'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-card p-3.5 text-sm">
              {error}
            </div>
          )}

          {/* Thông tin cá nhân */}
          <section className="bg-surface-subtle border border-line/80 rounded-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Thông tin tài khoản
              </span>
              <div className="flex items-center gap-2">
                {detail.isActive ? (
                  <Badge variant="emerald">Đang hoạt động</Badge>
                ) : (
                  <Badge variant="rose">Đã khóa</Badge>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Số điện thoại</dt>
                <dd className="font-mono font-semibold text-ink tabular-nums mt-0.5">
                  {detail.phoneNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="text-ink mt-0.5 break-all">
                  {detail.email || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Chi nhánh</dt>
                <dd className="font-medium text-ink mt-0.5">
                  {detail.branchName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Mật khẩu &amp; Zalo</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1.5">
                  {detail.hasPassword ? (
                    <Badge variant="blue">Đã đặt mật khẩu</Badge>
                  ) : (
                    <Badge variant="amber">Chưa có mật khẩu</Badge>
                  )}
                  {detail.hasZalo && (
                    <Badge variant="gold">Đã liên kết Zalo</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Ngày tạo</dt>
                <dd className="text-ink-secondary mt-0.5 tabular-nums">
                  {formatDate(detail.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Đăng nhập gần nhất</dt>
                <dd className="text-ink-secondary mt-0.5 tabular-nums">
                  {detail.lastLoginAt ? formatDateTime(detail.lastLoginAt) : 'Chưa đăng nhập'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Lớp đang dạy */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                Lớp phụ trách ({classes.length})
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-14 bg-surface-subtle rounded-card" />
                <div className="h-14 bg-surface-subtle rounded-card" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-ink-secondary bg-surface-subtle border border-dashed border-line rounded-card p-4 text-center">
                Giáo viên chưa được phân công phụ trách lớp nào.
              </div>
            ) : (
              <div className="space-y-2.5">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="border border-line/80 rounded-card p-3.5 bg-surface flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {cls.className}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {cls.courseName || 'Khóa học'} • {cls.classType || 'Offline'}
                        </p>
                      </div>
                      {classStatusBadge(cls.status)}
                    </div>
                    {(cls.startDate || cls.endDate) && (
                      <p className="text-xs text-ink-muted tabular-nums">
                        Thời gian: {formatDate(cls.startDate)} → {formatDate(cls.endDate)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lịch dạy */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                Lịch dạy ({schedules.length})
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-14 bg-surface-subtle rounded-card" />
                <div className="h-14 bg-surface-subtle rounded-card" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-sm text-ink-secondary bg-surface-subtle border border-dashed border-line rounded-card p-4 text-center">
                Chưa có buổi dạy nào được lên lịch.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {schedules.map((sch) => {
                  const isSub = sch.substituteTeacherId === teacher.id;
                  return (
                    <div
                      key={sch.id}
                      className="border border-line/80 rounded-card p-3 bg-surface flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono text-ink tabular-nums">
                            {formatDate(sch.studyDate)}
                          </span>
                          <span className="text-xs font-mono font-semibold text-teal bg-gold-soft px-2 py-0.5 rounded-full tabular-nums">
                            {formatTimeShort(sch.startTime)} – {formatTimeShort(sch.endTime)}
                          </span>
                          {isSub && (
                            <Badge variant="amber">Dạy thay</Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-ink truncate">
                          {sch.className || `Lớp #${sch.classId}`}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {sch.room ? `Phòng: ${sch.room}` : 'Chưa xếp phòng'}
                          {sch.note ? ` • ${sch.note}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0">{scheduleStatusBadge(sch.status)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-line/60 px-5 sm:px-6 py-3.5 bg-surface-subtle flex flex-wrap items-center justify-end gap-2 shrink-0 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <SecondaryButton
            type="button"
            onClick={() => onEdit(detail)}
            className="px-4 py-2 text-xs"
          >
            Sửa thông tin
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={() => onResetPassword(detail)}
            className="px-4 py-2 text-xs"
          >
            Đặt lại mật khẩu
          </PrimaryButton>
          <button
            type="button"
            onClick={() => onToggleStatus(detail)}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-full border active:scale-[0.98] transition-all cursor-pointer ${
              detail.isActive
                ? 'text-white bg-rose-600 border-rose-600 hover:bg-rose-700'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {detail.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
          </button>
        </div>
      </aside>
    </div>
  );
}
