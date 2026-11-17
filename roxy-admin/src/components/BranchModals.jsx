import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

/**
 * Khối cảnh báo lỗi 400/409 khi không thể ngừng hoạt động chi nhánh.
 */
function DeactivationBlockedAlert({ branchId, message, reasons = [], onNavigate }) {
  return (
    <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-900 space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0">❌</span>
        <div className="space-y-1.5 text-sm min-w-0 flex-1">
          <p className="font-bold text-rose-900">Không thể ngừng hoạt động chi nhánh này!</p>
          <p className="text-rose-800 leading-relaxed">{message}</p>
          {Array.isArray(reasons) && reasons.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-rose-800 bg-white/70 border border-rose-200 rounded-lg p-3">
              {reasons.map((reason, idx) => (
                <li key={idx} className="leading-relaxed">
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-rose-200 space-y-2">
        <p className="text-xs font-semibold text-rose-800">Hành động khắc phục nhanh:</p>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/classes?branchId=${branchId}`}
            onClick={onNavigate}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>🏫</span>
            <span>Mở danh sách Lớp học</span>
          </Link>
          <Link
            to={`/students?branchId=${branchId}`}
            onClick={onNavigate}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>🎓</span>
            <span>Mở danh sách Học viên</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal Thêm mới / Chỉnh sửa thông tin Chi nhánh.
 * Mobile: Bottom sheet; Desktop: Centered modal.
 */
export function CreateEditBranchModal({ branch, onClose, onSuccess }) {
  const isEdit = Boolean(branch);

  const [branchName, setBranchName] = useState(branch?.branchName || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [isActive, setIsActive] = useState(branch ? Boolean(branch.isActive) : true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isDeactivationBlocked, setIsDeactivationBlocked] = useState(false);
  const [blockedReasons, setBlockedReasons] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đóng modal bằng phím Escape
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
    const trimmedName = branchName.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      errors.branchName = 'Vui lòng nhập tên chi nhánh cơ sở.';
    } else if (trimmedName.length < 3 || trimmedName.length > 150) {
      errors.branchName = 'Tên chi nhánh phải từ 3 đến 150 ký tự.';
    }

    if (!trimmedAddress) {
      errors.address = 'Vui lòng nhập địa chỉ cụ thể của cơ sở.';
    } else if (trimmedAddress.length < 5 || trimmedAddress.length > 300) {
      errors.address = 'Địa chỉ chi nhánh phải từ 5 đến 300 ký tự.';
    }

    if (trimmedPhone) {
      const normalized = trimmedPhone.replace(/[\s.-]/g, '');
      if (trimmedPhone.length > 20 || !/^(0|\+84)[0-9]{8,10}$/.test(normalized)) {
        errors.phone = 'Số điện thoại không hợp lệ (VD: 0326 538 824).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    setIsDeactivationBlocked(false);
    setBlockedReasons([]);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const trimmedPhone = phone.trim();
      if (isEdit) {
        await axiosClient.put(`/Branches/${branch.id}`, {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
          isActive,
        });
        onSuccess('Cập nhật thông tin chi nhánh thành công.');
      } else {
        await axiosClient.post('/Branches', {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
        });
        onSuccess('Thêm chi nhánh mới thành công.');
      }
    } catch (err) {
      console.error('Lỗi lưu chi nhánh:', err);
      const status = err.response?.status;
      const serverMsg =
        err.response?.data?.message || 'Không thể lưu thông tin chi nhánh. Vui lòng thử lại.';
      const serverReasons = Array.isArray(err.response?.data?.reasons)
        ? err.response.data.reasons
        : [];
      setSubmitError(serverMsg);
      if (
        isEdit &&
        (status === 400 || status === 409) &&
        ((!isActive && branch?.isActive) || serverReasons.length > 0)
      ) {
        setIsDeactivationBlocked(true);
        setBlockedReasons(serverReasons);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Modal / Mobile Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0 transition-transform duration-200"
      >
        {/* Drag handle trên Mobile */}
        <div className="sm:hidden pt-2.5 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h3
              id="branch-modal-title"
              className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <span>🏢</span>
              <span>{isEdit ? 'Chỉnh sửa thông tin chi nhánh' : 'Thêm chi nhánh cơ sở mới'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Cập nhật tên cơ sở, địa chỉ liên hệ hoặc trạng thái hoạt động.'
                : 'Điền đầy đủ thông tin địa điểm đào tạo của Roxy Academy.'}
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {submitError &&
            (isDeactivationBlocked ? (
              <DeactivationBlockedAlert
                branchId={branch.id}
                message={submitError}
                reasons={blockedReasons}
                onNavigate={onClose}
              />
            ) : (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3 flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{submitError}</span>
              </div>
            ))}

          {/* Tên chi nhánh */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên chi nhánh cơ sở <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={150}
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                if (fieldErrors.branchName) {
                  setFieldErrors((prev) => ({ ...prev, branchName: '' }));
                }
              }}
              placeholder="VD: Cơ sở 1 - Bình Trưng Đông"
              className={`w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.branchName
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {fieldErrors.branchName && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.branchName}</p>
            )}
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Địa chỉ chi nhánh <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) {
                  setFieldErrors((prev) => ({ ...prev, address: '' }));
                }
              }}
              placeholder="VD: 123 Nguyễn Duy Trinh, P. Bình Trưng, TP.HCM"
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.address
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {fieldErrors.address && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.address}</p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại hotline <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            </label>
            <input
              type="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: '' }));
                }
              }}
              placeholder="VD: 0326 538 824"
              className={`w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                fieldErrors.phone
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500/20'
              }`}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Trạng thái hoạt động (CHỈ HIỂN THỊ KHI SỬA) */}
          {isEdit && (
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Trạng thái hoạt động
              </label>
              <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <span className="text-sm text-slate-700">
                  {isActive
                    ? 'Đang hoạt động (Tiếp nhận lớp học & học viên mới)'
                    : 'Ngừng hoạt động (Ẩn khỏi danh mục mở lớp mới)'}
                </span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked);
                    setIsDeactivationBlocked(false);
                    setBlockedReasons([]);
                    setSubmitError('');
                  }}
                  className="h-5 w-5 accent-blue-600 rounded cursor-pointer shrink-0"
                />
              </label>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu dữ liệu...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{isEdit ? 'Lưu thay đổi' : 'Lưu chi nhánh'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Hộp thoại xác nhận ngừng hoạt động chi nhánh (gọi DELETE /api/Branches/{id}).
 * Giữ nguyên hộp thoại và hiển thị lỗi 400 nếu chi nhánh còn lớp mở hoặc học viên active.
 */
export function DeactivateBranchModal({ branch, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error400, setError400] = useState('');
  const [blockedReasons, setBlockedReasons] = useState([]);
  const [otherError, setOtherError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirm = async () => {
    if (isSubmitting || error400) return;

    setIsSubmitting(true);
    setError400('');
    setBlockedReasons([]);
    setOtherError('');
    try {
      await axiosClient.delete(`/Branches/${branch.id}`);
      onSuccess();
    } catch (err) {
      console.error('Lỗi ngừng hoạt động chi nhánh:', err);
      const status = err.response?.status;
      const serverMsg =
        err.response?.data?.message ||
        'Không thể ngừng hoạt động chi nhánh. Vui lòng thử lại.';
      const serverReasons = Array.isArray(err.response?.data?.reasons)
        ? err.response.data.reasons
        : [];
      if (status === 400 || status === 409) {
        setError400(serverMsg);
        setBlockedReasons(serverReasons);
      } else {
        setOtherError(serverMsg);
      }
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
        aria-labelledby="deactivate-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3
            id="deactivate-modal-title"
            className="text-base font-bold text-slate-900 flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>Xác nhận ngừng hoạt động chi nhánh</span>
          </h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            Bạn có chắc chắn muốn ngừng hoạt động chi nhánh{' '}
            <strong className="text-slate-900">{branch.branchName}</strong>{' '}
            <span className="font-mono text-xs text-slate-500">(#BR-{branch.id})</span>?
          </p>

          <ul className="text-xs text-slate-600 space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3 list-disc list-inside">
            <li>Chi nhánh sẽ bị ẩn khỏi danh mục chọn cơ sở khi tạo Lớp học mới và ghi danh.</li>
            <li>Dữ liệu lịch sử, học phí và điểm danh trước đây vẫn được bảo toàn nguyên vẹn.</li>
          </ul>

          {error400 && (
            <DeactivationBlockedAlert
              branchId={branch.id}
              message={error400}
              reasons={blockedReasons}
              onNavigate={onClose}
            />
          )}

          {otherError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3">
              {otherError}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isSubmitting || Boolean(error400)}
              onClick={handleConfirm}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>🚫</span>
                  <span>Xác nhận ngừng hoạt động</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hộp thoại xác nhận kích hoạt lại chi nhánh (PUT /api/Branches/{id} với isActive: true).
 */
export function ReactivateBranchModal({ branch, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await axiosClient.put(`/Branches/${branch.id}`, {
        branchName: branch.branchName,
        address: branch.address,
        phone: branch.phone || null,
        isActive: true,
      });
      onSuccess();
    } catch (err) {
      console.error('Lỗi kích hoạt lại chi nhánh:', err);
      setErrorMsg(
        err.response?.data?.message || 'Không thể kích hoạt lại chi nhánh. Vui lòng thử lại.'
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
        aria-labelledby="reactivate-modal-title"
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3
            id="reactivate-modal-title"
            className="text-base font-bold text-slate-900 flex items-center gap-2"
          >
            <span>✓</span>
            <span>Kích hoạt lại chi nhánh</span>
          </h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Bạn có muốn kích hoạt lại cơ sở{' '}
            <strong className="text-slate-900">{branch.branchName}</strong>? Cơ sở này sẽ xuất hiện
            trở lại trong danh sách tuyển sinh và mở lớp mới.
          </p>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg p-3">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Đang kích hoạt...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Xác nhận kích hoạt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
