import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import ImageUpload from './ImageUpload';
import { updateStoredUser } from '../utils/authStorage';

function getInitials(name) {
  if (!name) return 'R';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[parts.length - 2].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getRoleBadge(role) {
  switch (role) {
    case 'SuperAdmin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          👑 Quản trị cấp cao
        </span>
      );
    case 'BranchManager':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
          🏢 Quản lý cơ sở
        </span>
      );
    case 'Teacher':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
          👩‍🏫 Giáo viên
        </span>
      );
    case 'Parent':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
          👨‍👩‍👧 Phụ huynh
        </span>
      );
    case 'Student':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-900">
          🎒 Học viên
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
          {role || 'Nhân sự'}
        </span>
      );
  }
}

export default function ProfileModal({ isOpen, onClose, currentUser, onUserUpdated }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);

  const [profileMeta, setProfileMeta] = useState({
    fullName: currentUser?.fullName || '',
    role: currentUser?.role || '',
  });

  const [formData, setFormData] = useState({
    phoneNumber: currentUser?.phoneNumber || '',
    email: currentUser?.email || '',
    avatarUrl: currentUser?.avatarUrl || '',
  });

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;

    const fetchProfile = async () => {
      try {
        const res = await axiosClient.get('/Auth/me');
        if (ignore) return;
        const data = res.data || {};
        setProfileMeta({
          fullName: data.fullName || currentUser?.fullName || '',
          role: data.role || currentUser?.role || '',
        });
        setFormData({
          phoneNumber: data.phoneNumber || '',
          email: data.email || '',
          avatarUrl: data.avatarUrl || '',
        });
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              'Không thể tải thông tin hồ sơ cá nhân. Vui lòng thử lại.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      ignore = true;
    };
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const trimmedAvatar = formData.avatarUrl.trim();
  const showAvatarImg =
    trimmedAvatar && /^https?:\/\//i.test(trimmedAvatar) && failedAvatarUrl !== trimmedAvatar;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const phone = formData.phoneNumber.trim();
    if (!/^0\d{9}$/.test(phone)) {
      setError('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.');
      return;
    }

    const email = formData.email.trim();
    if (trimmedAvatar && !/^https?:\/\//i.test(trimmedAvatar)) {
      setError('Đường dẫn ảnh đại diện phải bắt đầu bằng http:// hoặc https://.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        phoneNumber: phone,
        email: email || null,
        avatarUrl: trimmedAvatar || null,
      };
      const res = await axiosClient.put('/Auth/me', payload);
      const updatedUser = res.data;

      updateStoredUser(updatedUser);
      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }
      setProfileMeta({
        fullName: updatedUser.fullName || profileMeta.fullName,
        role: updatedUser.role || profileMeta.role,
      });
      setFormData({
        phoneNumber: updatedUser.phoneNumber || '',
        email: updatedUser.email || '',
        avatarUrl: updatedUser.avatarUrl || '',
      });
      setSuccessMsg('Đã cập nhật hồ sơ cá nhân thành công.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể cập nhật hồ sơ cá nhân. Vui lòng kiểm tra lại.'
      );
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

      <div className="modal-panel relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Hồ sơ cá nhân</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Cập nhật thông tin liên hệ và ảnh đại diện của bạn
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="mt-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="h-16 w-16 shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="h-5 w-24 rounded-full bg-slate-200" />
                <div className="h-3 w-48 rounded bg-slate-200" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-10 w-full rounded-lg bg-slate-100" />
              <div className="h-10 w-full rounded-lg bg-slate-100" />
              <div className="h-10 w-full rounded-lg bg-slate-100" />
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Phần 1: Read-only card */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              {showAvatarImg ? (
                <img
                  src={trimmedAvatar}
                  alt={profileMeta.fullName || 'Ảnh đại diện'}
                  onError={() => setFailedAvatarUrl(trimmedAvatar)}
                  className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover bg-white shadow-xs"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 shadow-xs">
                  {getInitials(profileMeta.fullName)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-slate-900">
                  {profileMeta.fullName || 'Người dùng'}
                </h4>
                <div className="mt-1">{getRoleBadge(profileMeta.role)}</div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Họ tên và vai trò do trung tâm quản lý.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                ⚠️ {error}
              </div>
            )}

            {successMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                ✓ {successMsg}
              </div>
            )}

            {/* Phần 2: Form CHỈ 3 trường */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0901234567"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }));
                    if (error) setError('');
                    if (successMsg) setSuccessMsg('');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Định dạng gồm 10 chữ số, bắt đầu bằng số 0.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Email <span className="font-normal text-slate-400">(tùy chọn)</span>
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (error) setError('');
                    if (successMsg) setSuccessMsg('');
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>

              <div>
                <ImageUpload
                  label={
                    <>
                      Ảnh đại diện <span className="font-normal text-slate-400">(tùy chọn)</span>
                    </>
                  }
                  value={formData.avatarUrl}
                  onChange={(url) => {
                    setFailedAvatarUrl(null);
                    setFormData((prev) => ({ ...prev, avatarUrl: url }));
                    if (error) setError('');
                    if (successMsg) setSuccessMsg('');
                  }}
                  folder="general"
                  disabled={submitting}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Tải ảnh đại diện lên hoặc xóa ảnh để dùng chữ cái đầu.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-transform duration-150 ease-out disabled:opacity-50 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-transform duration-150 ease-out disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
