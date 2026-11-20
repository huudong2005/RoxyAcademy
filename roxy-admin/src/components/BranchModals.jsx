import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { PrimaryButton, SecondaryButton, InputPill } from './ui';

/**
 * Khối cảnh báo lỗi 400/409 khi không thể ngừng hoạt động chi nhánh.
 */
function DeactivationBlockedAlert({ branchId, message, reasons = [], onNavigate }) {
  return (
    <div className="bg-rose-50 border-2 border-rose-300 rounded-card p-4 text-rose-900 space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0">❌</span>
        <div className="space-y-1.5 text-sm min-w-0 flex-1">
          <p className="font-bold text-rose-900">Không thể ngừng hoạt động chi nhánh này!</p>
          <p className="text-rose-800 leading-relaxed">{message}</p>
          {Array.isArray(reasons) && reasons.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-rose-800 bg-white/70 border border-rose-200 rounded-card p-3">
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
          <SecondaryButton
            as={Link}
            to={`/classes?branchId=${branchId}`}
            onClick={onNavigate}
            className="px-3.5 py-2 text-xs"
          >
            <span>🏫</span>
            <span>Mở danh sách Lớp học</span>
          </SecondaryButton>
          <SecondaryButton
            as={Link}
            to={`/students?branchId=${branchId}`}
            onClick={onNavigate}
            className="px-3.5 py-2 text-xs"
          >
            <span>🎓</span>
            <span>Mở danh sách Học viên</span>
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal Thêm mới / Chỉnh sửa thông tin Chi nhánh.
 * Mobile: Bottom sheet; Desktop: Centered modal.
 */
export function CreateEditBranchModal({ branch, onClose, onBranchSaved, onSuccess }) {
  const isEdit = Boolean(branch);

  const [branchName, setBranchName] = useState(branch?.branchName || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [isActive, setIsActive] = useState(branch ? Boolean(branch.isActive) : true);

  // Giữ ID chi nhánh vừa tạo nếu bước tạo tài khoản quản lý bị lỗi để tránh tạo trùng khi thử lại
  const [createdBranchId, setCreatedBranchId] = useState(null);

  // Thông tin quản lý hiện tại (khi sửa) & form tạo tài khoản quản lý (tùy chọn)
  const [loadingManager, setLoadingManager] = useState(isEdit);
  const [managerLoadError, setManagerLoadError] = useState('');
  const [existingManagers, setExistingManagers] = useState([]);
  const [managerFullName, setManagerFullName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isDeactivationBlocked, setIsDeactivationBlocked] = useState(false);
  const [blockedReasons, setBlockedReasons] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasExistingManager = isEdit && existingManagers.length > 0;

  // Tải danh sách quản lý hiện tại của chi nhánh khi mở modal sửa
  useEffect(() => {
    if (!isEdit || !branch?.id) return;

    let ignore = false;
    const fetchBranchManager = async () => {
      setLoadingManager(true);
      setManagerLoadError('');
      try {
        const res = await axiosClient.get('/Users', {
          params: {
            Role: 'BranchManager',
            BranchId: branch.id,
          },
        });
        if (!ignore) {
          const items = Array.isArray(res.data?.items) ? res.data.items : [];
          setExistingManagers(items);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi tải thông tin quản lý chi nhánh:', err);
          setManagerLoadError(
            err.response?.data?.message || 'Không thể tải thông tin quản lý hiện tại của chi nhánh.'
          );
        }
      } finally {
        if (!ignore) setLoadingManager(false);
      }
    };

    fetchBranchManager();
    return () => {
      ignore = true;
    };
  }, [isEdit, branch?.id]);

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

    const trimmedManagerName = managerFullName.trim();
    const trimmedManagerPhone = managerPhone.trim();
    const hasAnyManagerField =
      !hasExistingManager &&
      !loadingManager &&
      !managerLoadError &&
      (trimmedManagerName.length > 0 ||
        trimmedManagerPhone.length > 0 ||
        managerPassword.length > 0);

    if (hasAnyManagerField) {
      if (!trimmedManagerName) {
        errors.managerFullName = 'Vui lòng nhập họ tên quản lý.';
      }
      if (!trimmedManagerPhone) {
        errors.managerPhone = 'Vui lòng nhập số điện thoại quản lý.';
      } else if (!/^0\d{9}$/.test(trimmedManagerPhone)) {
        errors.managerPhone = 'Số điện thoại quản lý phải gồm 10 chữ số và bắt đầu bằng 0.';
      }
      if (!managerPassword) {
        errors.managerPassword = 'Vui lòng nhập mật khẩu cho tài khoản quản lý.';
      } else if (managerPassword.length < 8) {
        errors.managerPassword = 'Mật khẩu phải có tối thiểu 8 ký tự.';
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

    const trimmedPhone = phone.trim();
    const trimmedManagerName = managerFullName.trim();
    const trimmedManagerPhone = managerPhone.trim();
    const shouldCreateManager =
      !hasExistingManager &&
      !loadingManager &&
      !managerLoadError &&
      (trimmedManagerName.length > 0 ||
        trimmedManagerPhone.length > 0 ||
        managerPassword.length > 0);

    setIsSubmitting(true);
    try {
      let targetBranchId = isEdit ? branch.id : createdBranchId;

      if (isEdit) {
        await axiosClient.put(`/Branches/${branch.id}`, {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
          isActive,
        });
      } else if (targetBranchId) {
        await axiosClient.put(`/Branches/${targetBranchId}`, {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
          isActive: true,
        });
      } else {
        const branchRes = await axiosClient.post('/Branches', {
          branchName: branchName.trim(),
          address: address.trim(),
          phone: trimmedPhone || null,
        });
        targetBranchId = branchRes.data?.id;
        if (!targetBranchId) {
          throw new Error('Không nhận được mã chi nhánh mới từ máy chủ.');
        }
        setCreatedBranchId(targetBranchId);
      }

      onBranchSaved?.();

      if (shouldCreateManager) {
        try {
          await axiosClient.post('/Users', {
            phoneNumber: trimmedManagerPhone,
            fullName: trimmedManagerName,
            role: 'BranchManager',
            branchId: targetBranchId,
            password: managerPassword,
          });
          onSuccess(
            isEdit
              ? 'Cập nhật chi nhánh và tạo tài khoản quản lý thành công.'
              : 'Thêm chi nhánh mới và tạo tài khoản quản lý thành công.'
          );
        } catch (userErr) {
          console.error('Lỗi tạo tài khoản quản lý chi nhánh:', userErr);
          const userErrMsg =
            userErr.response?.data?.message ||
            'Không thể tạo tài khoản quản lý. Vui lòng thử lại.';
          setSubmitError(
            isEdit
              ? `Đã cập nhật thông tin chi nhánh, nhưng chưa tạo được tài khoản quản lý: ${userErrMsg} Bạn có thể sửa lại thông tin để thử lại.`
              : `Chi nhánh đã được tạo thành công (#BR-${targetBranchId}), nhưng chưa tạo được tài khoản quản lý: ${userErrMsg} Bạn có thể sửa lại số điện thoại để thử lại hoặc thêm sau ở mục Chỉnh sửa chi nhánh.`
          );
        }
        return;
      }

      onSuccess(
        isEdit
          ? 'Cập nhật thông tin chi nhánh thành công.'
          : createdBranchId
            ? 'Đã lưu thông tin chi nhánh.'
            : 'Thêm chi nhánh mới thành công.'
      );
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
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Modal / Mobile Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-surface rounded-t-card-lg sm:rounded-card-lg border border-line/60 shadow-modal modal-panel max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        {/* Drag handle trên Mobile */}
        <div className="sm:hidden pt-2.5 pb-1">
          <div className="w-12 h-1.5 bg-line-strong rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line/60">
          <div>
            <h3
              id="branch-modal-title"
              className="text-base md:text-lg font-bold text-ink flex items-center gap-2"
            >
              <span>🏢</span>
              <span>{isEdit ? 'Chỉnh sửa thông tin chi nhánh' : 'Thêm chi nhánh cơ sở mới'}</span>
            </h3>
            <p className="text-xs text-ink-secondary mt-0.5">
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
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer disabled:opacity-50"
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
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-card p-3 flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{submitError}</span>
              </div>
            ))}

          {/* Tên chi nhánh */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Tên chi nhánh cơ sở <span className="text-rose-500">*</span>
            </label>
            <InputPill
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
              className={
                fieldErrors.branchName
                  ? '!border-rose-400 bg-rose-50/40 focus:!border-rose-500 focus:!ring-rose-500/20'
                  : ''
              }
            />
            {fieldErrors.branchName && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.branchName}</p>
            )}
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
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
              className={`w-full px-4 py-2.5 text-sm rounded-2xl border text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 ${
                fieldErrors.address
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-line bg-surface focus:border-gold focus:ring-gold/25'
              }`}
            />
            {fieldErrors.address && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.address}</p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Số điện thoại hotline <span className="text-ink-muted font-normal">(Tùy chọn)</span>
            </label>
            <InputPill
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
              className={
                fieldErrors.phone
                  ? '!border-rose-400 bg-rose-50/40 focus:!border-rose-500 focus:!ring-rose-500/20'
                  : ''
              }
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Trạng thái hoạt động (CHỈ HIỂN THỊ KHI SỬA) */}
          {isEdit && (
            <div className="pt-1">
              <label className="block text-xs font-semibold text-ink mb-2">
                Trạng thái hoạt động
              </label>
              <label className="flex items-center justify-between gap-3 p-3 rounded-card border border-line bg-surface-subtle cursor-pointer">
                <span className="text-sm text-ink-secondary">
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
                  className="h-5 w-5 accent-teal rounded cursor-pointer shrink-0"
                />
              </label>
            </div>
          )}

          {/* Tài khoản quản lý (BranchManager) */}
          {isEdit && loadingManager ? (
            <div className="pt-2 border-t border-line/60">
              <div className="flex items-center gap-2 text-xs text-ink-muted py-2">
                <span className="w-3.5 h-3.5 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                <span>Đang tải thông tin tài khoản quản lý...</span>
              </div>
            </div>
          ) : isEdit && managerLoadError ? (
            <div className="pt-2 border-t border-line/60">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-card p-3">
                {managerLoadError}
              </div>
            </div>
          ) : hasExistingManager ? (
            <div className="pt-2 border-t border-line/60">
              <div className="bg-surface-subtle border border-line rounded-card p-3 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Tài khoản quản lý
                </p>
                {existingManagers.map((m) => (
                  <p key={m.id} className="text-sm text-ink">
                    Quản lý hiện tại:{' '}
                    <span className="font-semibold text-teal">{m.fullName}</span> —{' '}
                    <span className="font-mono">{m.phoneNumber}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-line/60 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal">
                  Tài khoản quản lý (tùy chọn)
                </h4>
                <p className="text-xs text-ink-muted mt-0.5">
                  Để trống cả 3 ô nếu chưa cần tạo tài khoản quản lý cho chi nhánh này.
                </p>
              </div>

              {/* Họ tên quản lý */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Họ tên quản lý
                </label>
                <InputPill
                  type="text"
                  maxLength={100}
                  value={managerFullName}
                  onChange={(e) => {
                    setManagerFullName(e.target.value);
                    if (fieldErrors.managerFullName) {
                      setFieldErrors((prev) => ({ ...prev, managerFullName: '' }));
                    }
                  }}
                  placeholder="VD: Nguyễn Văn A"
                  className={
                    fieldErrors.managerFullName
                      ? '!border-rose-400 bg-rose-50/40 focus:!border-rose-500 focus:!ring-rose-500/20'
                      : ''
                  }
                />
                {fieldErrors.managerFullName && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.managerFullName}</p>
                )}
              </div>

              {/* Số điện thoại quản lý */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Số điện thoại quản lý
                </label>
                <InputPill
                  type="tel"
                  maxLength={10}
                  value={managerPhone}
                  onChange={(e) => {
                    setManagerPhone(e.target.value);
                    if (fieldErrors.managerPhone) {
                      setFieldErrors((prev) => ({ ...prev, managerPhone: '' }));
                    }
                  }}
                  placeholder="VD: 0912345678"
                  className={
                    fieldErrors.managerPhone
                      ? '!border-rose-400 bg-rose-50/40 focus:!border-rose-500 focus:!ring-rose-500/20'
                      : ''
                  }
                />
                {fieldErrors.managerPhone && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.managerPhone}</p>
                )}
              </div>

              {/* Mật khẩu quản lý */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Mật khẩu
                </label>
                <InputPill
                  type="password"
                  autoComplete="new-password"
                  value={managerPassword}
                  onChange={(e) => {
                    setManagerPassword(e.target.value);
                    if (fieldErrors.managerPassword) {
                      setFieldErrors((prev) => ({ ...prev, managerPassword: '' }));
                    }
                  }}
                  placeholder="Tối thiểu 8 ký tự"
                  className={
                    fieldErrors.managerPassword
                      ? '!border-rose-400 bg-rose-50/40 focus:!border-rose-500 focus:!ring-rose-500/20'
                      : ''
                  }
                />
                {fieldErrors.managerPassword && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.managerPassword}</p>
                )}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-line/60 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <SecondaryButton
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Hủy bỏ
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                  <span>Đang lưu dữ liệu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Lưu thay đổi' : 'Lưu chi nhánh'}</span>
              )}
            </PrimaryButton>
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
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-modal-title"
        className="relative z-10 w-full sm:max-w-lg bg-surface rounded-t-card-lg sm:rounded-card-lg border border-line/60 shadow-modal modal-panel max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line/60">
          <h3
            id="deactivate-modal-title"
            className="text-base font-bold text-ink flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>Xác nhận ngừng hoạt động chi nhánh</span>
          </h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary">
            Bạn có chắc chắn muốn ngừng hoạt động chi nhánh{' '}
            <strong className="text-ink">{branch.branchName}</strong>{' '}
            <span className="font-mono text-xs text-ink-muted">(#BR-{branch.id})</span>?
          </p>

          <ul className="text-xs text-ink-secondary space-y-1.5 bg-surface-subtle border border-line rounded-card p-3 list-disc list-inside">
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
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-card p-3">
              {otherError}
            </div>
          )}

          <div className="pt-2 border-t border-line/60 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <SecondaryButton
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Đóng
            </SecondaryButton>
            <button
              type="button"
              disabled={isSubmitting || Boolean(error400)}
              onClick={handleConfirm}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        className="fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px] modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reactivate-modal-title"
        className="relative z-10 w-full sm:max-w-md bg-surface rounded-t-card-lg sm:rounded-card-lg border border-line/60 shadow-modal modal-panel overflow-hidden pb-[env(safe-area-inset-bottom,16px)] sm:pb-0"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line/60">
          <h3
            id="reactivate-modal-title"
            className="text-base font-bold text-ink flex items-center gap-2"
          >
            <span>✓</span>
            <span>Kích hoạt lại chi nhánh</span>
          </h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-subtle hover:text-ink cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary leading-relaxed">
            Bạn có muốn kích hoạt lại cơ sở{' '}
            <strong className="text-ink">{branch.branchName}</strong>? Cơ sở này sẽ xuất hiện
            trở lại trong danh sách tuyển sinh và mở lớp mới.
          </p>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-card p-3">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 border-t border-line/60 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <SecondaryButton
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Hủy
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                  <span>Đang kích hoạt...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Xác nhận kích hoạt</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
