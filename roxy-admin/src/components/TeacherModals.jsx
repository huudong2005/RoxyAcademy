import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { formatDate, formatDateTime } from '../utils/formatters';

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
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0 transition-transform duration-200 ease-out"
      >
        <div className="sm:hidden pt-2.5 pb-1">
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" />
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 id="teacher-modal-title" className="text-lg font-bold text-slate-900">
            {isEdit ? 'Chỉnh sửa thông tin giáo viên' : 'Thêm giáo viên mới'}
          </h2>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {submitError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-sm flex items-start gap-2.5">
              <span className="shrink-0">⚠️</span>
              <span className="leading-relaxed">{submitError}</span>
            </div>
          )}

          {/* Họ và tên */}
          <div>
            <label
              htmlFor="teacher-fullname"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Họ và tên <span className="text-rose-600">*</span>
            </label>
            <input
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
              className={`w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.fullName
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
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
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Số điện thoại <span className="text-rose-600">*</span>
              </label>
              <input
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
                className={`w-full min-h-[44px] px-3.5 py-2 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  fieldErrors.phoneNumber
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="teacher-email"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Email <span className="text-xs font-normal text-slate-400">(tùy chọn)</span>
              </label>
              <input
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
                className={`w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                  fieldErrors.email
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
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
                className="block text-sm font-semibold text-slate-700 mb-1.5"
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
                className={`w-full min-h-[44px] px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  !isSuperAdmin
                    ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'
                    : fieldErrors.branchId
                      ? 'bg-white text-slate-900 border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
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
                <p className="mt-1 text-[11px] text-slate-500">
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
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Ngôn ngữ giao diện
              </label>
              <select
                id="teacher-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={isSubmitting}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
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
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Mật khẩu khởi tạo{' '}
                <span className="text-xs font-normal text-slate-400">
                  (tùy chọn, tối thiểu 8 ký tự)
                </span>
              </label>
              <div className="relative">
                <input
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
                  className={`w-full min-h-[44px] pl-3.5 pr-16 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2.5 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
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
              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Trạng thái tài khoản
                  </p>
                  <p className="text-xs text-slate-500">
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
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản giáo viên'}</span>
              )}
            </button>
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
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-pwd-title"
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[env(safe-area-inset-bottom,16px)] sm:pb-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="reset-pwd-title" className="text-lg font-bold text-slate-900">
            Đặt lại mật khẩu
          </h2>
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Cấp mật khẩu đăng nhập mới cho giáo viên{' '}
          <span className="font-semibold text-slate-900">{teacher.fullName}</span> (
          <span className="font-mono text-slate-700">{teacher.phoneNumber}</span>).
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="reset-new-pwd"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Mật khẩu mới <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                id="reset-new-pwd"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                disabled={isSubmitting}
                className="w-full min-h-[44px] pl-3.5 pr-16 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2.5 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-confirm-pwd"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Xác nhận mật khẩu mới <span className="text-rose-600">*</span>
            </label>
            <input
              id="reset-confirm-pwd"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              disabled={isSubmitting}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
            </button>
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
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[env(safe-area-inset-bottom,16px)] sm:pb-6 space-y-4"
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
            <h3 className="text-base font-bold text-slate-900">
              {isLocking
                ? 'Khóa tài khoản giáo viên?'
                : 'Mở khóa tài khoản giáo viên?'}
            </h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              {isLocking ? (
                <>
                  Giáo viên{' '}
                  <span className="font-semibold text-slate-900">{teacher.fullName}</span>{' '}
                  sẽ không thể đăng nhập vào hệ thống sau khi bị khóa.
                </>
              ) : (
                <>
                  Khôi phục quyền đăng nhập và hoạt động cho giáo viên{' '}
                  <span className="font-semibold text-slate-900">{teacher.fullName}</span>.
                </>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-sm flex items-start gap-2">
            <span className="shrink-0">❌</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`min-h-[44px] px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 ${
              isLocking
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSubmitting
              ? 'Đang xử lý...'
              : isLocking
                ? 'Xác nhận khóa'
                : 'Xác nhận mở khóa'}
          </button>
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
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đang học
          </span>
        );
      case 'Upcoming':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Sắp khai giảng
          </span>
        );
      case 'Finished':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Đã kết thúc
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const scheduleStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã dạy
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Sắp tới
          </span>
        );
    }
  };

  const formatTimeShort = (t) => {
    if (!t) return '—';
    return String(t).slice(0, 5);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-detail-title"
        className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="min-w-0">
            <h2
              id="teacher-detail-title"
              className="text-lg font-bold text-slate-900 truncate"
            >
              {detail.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hồ sơ giáo viên • {detail.branchName || 'Chưa gán chi nhánh'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-sm">
              {error}
            </div>
          )}

          {/* Thông tin cá nhân */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Thông tin tài khoản
              </span>
              <div className="flex items-center gap-2">
                {detail.isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Đã khóa
                  </span>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Số điện thoại</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {detail.phoneNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="text-slate-800 mt-0.5 break-all">
                  {detail.email || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Chi nhánh</dt>
                <dd className="font-medium text-slate-800 mt-0.5">
                  {detail.branchName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Mật khẩu &amp; Zalo</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      detail.hasPassword
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {detail.hasPassword ? 'Đã đặt mật khẩu' : 'Chưa có mật khẩu'}
                  </span>
                  {detail.hasZalo && (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                      Đã liên kết Zalo
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Ngày tạo</dt>
                <dd className="text-slate-700 mt-0.5 tabular-nums">
                  {formatDate(detail.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Đăng nhập gần nhất</dt>
                <dd className="text-slate-700 mt-0.5 tabular-nums">
                  {detail.lastLoginAt ? formatDateTime(detail.lastLoginAt) : 'Chưa đăng nhập'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Lớp đang dạy */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Lớp phụ trách ({classes.length})
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                Giáo viên chưa được phân công phụ trách lớp nào.
              </div>
            ) : (
              <div className="space-y-2.5">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="border border-slate-200 rounded-xl p-3.5 bg-white flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {cls.className}
                        </p>
                        <p className="text-xs text-slate-500">
                          {cls.courseName || 'Khóa học'} • {cls.classType || 'Offline'}
                        </p>
                      </div>
                      {classStatusBadge(cls.status)}
                    </div>
                    {(cls.startDate || cls.endDate) && (
                      <p className="text-xs text-slate-500 tabular-nums">
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
              <h3 className="text-sm font-bold text-slate-900">
                Lịch dạy ({schedules.length})
              </h3>
            </div>

            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                Chưa có buổi dạy nào được lên lịch.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {schedules.map((sch) => {
                  const isSub = sch.substituteTeacherId === teacher.id;
                  return (
                    <div
                      key={sch.id}
                      className="border border-slate-200 rounded-xl p-3 bg-white flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono text-slate-800 tabular-nums">
                            {formatDate(sch.studyDate)}
                          </span>
                          <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded tabular-nums">
                            {formatTimeShort(sch.startTime)} – {formatTimeShort(sch.endTime)}
                          </span>
                          {isSub && (
                            <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              Dạy thay
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {sch.className || `Lớp #${sch.classId}`}
                        </p>
                        <p className="text-xs text-slate-500">
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
        <div className="border-t border-slate-200 px-5 sm:px-6 py-3.5 bg-slate-50 flex flex-wrap items-center justify-end gap-2 shrink-0 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={() => onEdit(detail)}
            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Sửa thông tin
          </button>
          <button
            type="button"
            onClick={() => onResetPassword(detail)}
            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            Đặt lại mật khẩu
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(detail)}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border active:scale-[0.98] transition-all cursor-pointer ${
              detail.isActive
                ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
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
