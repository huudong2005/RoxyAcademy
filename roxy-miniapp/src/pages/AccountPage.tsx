import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  changePassword,
  fetchBranches,
  fetchMyNotifications,
  fetchNewsfeeds,
  markAllNotificationsRead,
  markNotificationRead,
  updateMe,
  uploadHomeworkFile,
} from '@/api/academicApi';
import {
  AlertTriangleOutlineIcon,
  BellOutlineIcon,
  BuildingOutlineIcon,
  CameraOutlineIcon,
  CheckOutlineIcon,
  ClockOutlineIcon,
  EyeOffOutlineIcon,
  EyeOutlineIcon,
  LockOutlineIcon,
  LogoutOutlineIcon,
  MailOutlineIcon,
  MapPinOutlineIcon,
  NewspaperOutlineIcon,
  PhoneOutlineIcon,
  PinOutlineIcon,
  RefreshOutlineIcon,
  UserOutlineIcon,
} from '@/components/icons';
import {
  Badge,
  Card,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useAuth } from '@/context/authContext';
import {
  formatRelativeTimeVi,
  getNotificationTypeMeta,
  type BranchDto,
  type NewsfeedDto,
  type NotificationDto,
} from '@/types/academic';

type SubTabType = 'account' | 'newsfeed' | 'notifications';
type NotificationFilterType = 'all' | 'unread';

const HOTLINE_DISPLAY = '0326 538 824';
const HOTLINE_TEL = '0326538824';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const ALLOWED_AVATAR_EXT = /\.(jpg|jpeg|png|webp)$/i;
const PHONE_REGEX = /^0\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractApiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0];
    const firstVal = firstKey ? data.errors[firstKey] : null;
    if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') {
      return firstVal[0];
    }
  }
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}

function getInitials(name?: string | null): string {
  if (!name) return 'RX';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'RX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AccountPage() {
  const {
    user,
    students,
    studentsLoading,
    refreshProfileAndStudents,
    updateUser,
    logout,
  } = useAuth();

  const [subTab, setSubTab] = useState<SubTabType>('account');

  // ==================== HỒ SƠ & CHI NHÁNH ====================
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState<string | null>(null);

  // ==================== FORM CẬP NHẬT LIÊN HỆ ====================
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // ==================== FORM ĐỔI MẬT KHẨU ====================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // ==================== ĐĂNG XUẤT 2 BƯỚC ====================
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ==================== BẢN TIN ====================
  const [newsfeeds, setNewsfeeds] = useState<NewsfeedDto[]>([]);
  const [newsfeedsLoading, setNewsfeedsLoading] = useState(false);
  const [newsfeedsError, setNewsfeedsError] = useState<string | null>(null);
  const [newsfeedsLoaded, setNewsfeedsLoaded] = useState(false);
  const [expandedNewsIds, setExpandedNewsIds] = useState<Set<number>>(
    () => new Set()
  );

  // ==================== THÔNG BÁO ====================
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notifFilter, setNotifFilter] = useState<NotificationFilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // Đồng bộ form liên hệ khi user từ context cập nhật
  useEffect(() => {
    if (user) {
      setPhoneInput(user.phoneNumber || '');
      setEmailInput(user.email || '');
      setAvatarUrlInput(user.avatarUrl || null);
    }
  }, [user]);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      await refreshProfileAndStudents();
    } catch (err: any) {
      setProfileError(
        extractApiErrorMessage(err, 'Không tải được thông tin hồ sơ.')
      );
    } finally {
      setProfileLoading(false);
    }
  }, [refreshProfileAndStudents]);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const list = await fetchBranches();
      setBranches(list);
    } catch (err: any) {
      setBranchesError(
        extractApiErrorMessage(err, 'Không tải được danh sách cơ sở.')
      );
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const unread = await fetchMyNotifications(true);
      setUnreadCount(unread.length);
    } catch {
      // Bỏ qua lỗi nền khi lấy số badge chưa đọc
    }
  }, []);

  const loadNewsfeeds = useCallback(async () => {
    setNewsfeedsLoading(true);
    setNewsfeedsError(null);
    try {
      const list = await fetchNewsfeeds();
      setNewsfeeds(list);
      setNewsfeedsLoaded(true);
    } catch (err: any) {
      setNewsfeedsError(
        extractApiErrorMessage(err, 'Không tải được bảng tin.')
      );
    } finally {
      setNewsfeedsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const list = await fetchMyNotifications(false);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
      setNotificationsLoaded(true);
    } catch (err: any) {
      setNotificationsError(
        extractApiErrorMessage(err, 'Không tải được danh sách thông báo.')
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Tải hồ sơ, cơ sở và số thông báo chưa đọc khi vào trang
  useEffect(() => {
    loadProfile();
    loadBranches();
    loadUnreadCount();
  }, [loadProfile, loadBranches, loadUnreadCount]);

  // Tải dữ liệu theo sub-tab khi mở lần đầu
  useEffect(() => {
    if (subTab === 'newsfeed' && !newsfeedsLoaded && !newsfeedsLoading) {
      loadNewsfeeds();
    }
    if (
      subTab === 'notifications' &&
      !notificationsLoaded &&
      !notificationsLoading
    ) {
      loadNotifications();
    }
  }, [
    subTab,
    newsfeedsLoaded,
    newsfeedsLoading,
    loadNewsfeeds,
    notificationsLoaded,
    notificationsLoading,
    loadNotifications,
  ]);

  // ==================== HANDLERS: CẬP NHẬT LIÊN HỆ ====================
  const handleAvatarSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    setContactSuccess(null);

    const mimeOk = file.type ? ALLOWED_AVATAR_MIME.has(file.type) : false;
    const extOk = ALLOWED_AVATAR_EXT.test(file.name || '');
    if (!mimeOk && !extOk) {
      setAvatarError('Chỉ hỗ trợ ảnh định dạng jpg, jpeg, png hoặc webp.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Dung lượng ảnh tối đa 5MB.');
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadedUrl = await uploadHomeworkFile(file);
      setAvatarUrlInput(uploadedUrl);
    } catch (err: any) {
      setAvatarError(
        extractApiErrorMessage(err, 'Tải ảnh đại diện thất bại.')
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);

    const trimmedPhone = phoneInput.trim();
    if (!PHONE_REGEX.test(trimmedPhone)) {
      setContactError(
        'Số điện thoại bắt buộc gồm đúng 10 chữ số và bắt đầu bằng 0.'
      );
      return;
    }

    const trimmedEmail = emailInput.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setContactError('Email không hợp lệ.');
      return;
    }

    setContactSaving(true);
    try {
      const updated = await updateMe({
        phoneNumber: trimmedPhone,
        email: trimmedEmail || null,
        avatarUrl: avatarUrlInput || null,
      });
      await updateUser(updated);
      setContactSuccess('Đã cập nhật thông tin liên hệ.');
    } catch (err: any) {
      setContactError(
        extractApiErrorMessage(err, 'Không thể cập nhật thông tin liên hệ.')
      );
    } finally {
      setContactSaving(false);
    }
  };

  // ==================== HANDLERS: ĐỔI MẬT KHẨU ====================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword) {
      setPwError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('Nhập lại mật khẩu mới không khớp.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
      });
      setPwSuccess(res?.message || 'Đổi mật khẩu thành công.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwError(
        extractApiErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng thử lại.')
      );
    } finally {
      setPwSaving(false);
    }
  };

  // ==================== HANDLER: ĐĂNG XUẤT ====================
  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirmLogoutOpen(false);
    }
  };

  // ==================== HANDLERS: BẢN TIN ====================
  const toggleNewsExpand = (id: number) => {
    setExpandedNewsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ==================== HANDLERS: THÔNG BÁO ====================
  const handleMarkOneRead = async (notif: NotificationDto) => {
    if (notif.isRead || markingId === notif.id) return;
    setMarkingId(notif.id);
    try {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notif.id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Giữ nguyên trạng thái chưa đọc nếu lỗi mạng
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) =>
          item.isRead ? item : { ...item, isRead: true, readAt: nowIso }
        )
      );
      setUnreadCount(0);
    } catch (err: any) {
      setNotificationsError(
        extractApiErrorMessage(err, 'Không thể đánh dấu đã đọc tất cả.')
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const visibleNotifications = useMemo(() => {
    if (notifFilter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, notifFilter]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-4">
      {/* Sub-tabs: Tài khoản | Bản tin | Thông báo */}
      <div
        role="tablist"
        aria-label="Mục tài khoản"
        className="grid grid-cols-3 gap-1 rounded-pill border border-line bg-surface p-1 shadow-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'account'}
          onClick={() => setSubTab('account')}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-pill px-2 text-xs font-semibold transition-colors cursor-pointer ${
            subTab === 'account'
              ? 'bg-teal text-white shadow-xs'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <UserOutlineIcon className="h-4 w-4 shrink-0" />
          <span>Tài khoản</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'newsfeed'}
          onClick={() => setSubTab('newsfeed')}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-pill px-2 text-xs font-semibold transition-colors cursor-pointer ${
            subTab === 'newsfeed'
              ? 'bg-teal text-white shadow-xs'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <NewspaperOutlineIcon className="h-4 w-4 shrink-0" />
          <span>Bản tin</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'notifications'}
          onClick={() => setSubTab('notifications')}
          className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-pill px-2 text-xs font-semibold transition-colors cursor-pointer ${
            subTab === 'notifications'
              ? 'bg-teal text-white shadow-xs'
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <BellOutlineIcon className="h-4 w-4 shrink-0" />
          <span>Thông báo</span>
          {unreadCount > 0 && (
            <span
              className={`inline-flex min-w-[18px] items-center justify-center rounded-pill px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                subTab === 'notifications'
                  ? 'bg-gold text-teal'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ==================== SUB-TAB 1: TÀI KHOẢN ==================== */}
      {subTab === 'account' && (
        <div className="flex flex-col gap-4">
          {/* 1. Thẻ hồ sơ */}
          {profileLoading ? (
            <Card className="p-4" aria-busy="true" aria-label="Đang tải hồ sơ">
              <div className="flex items-center gap-3.5 animate-pulse">
                <div className="h-14 w-14 shrink-0 rounded-full bg-surface-subtle" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-surface-subtle" />
                  <div className="h-3 w-28 rounded bg-surface-subtle" />
                  <div className="h-3 w-44 rounded bg-surface-subtle" />
                </div>
              </div>
            </Card>
          ) : profileError && !user ? (
            <Card className="p-4">
              <div className="flex items-start gap-2.5 text-rose-700">
                <AlertTriangleOutlineIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    Không tải được thông tin hồ sơ
                  </p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {profileError}
                  </p>
                  <SecondaryButton
                    onClick={loadProfile}
                    className="mt-3 min-h-[38px] px-4 py-1.5 text-xs"
                  >
                    <RefreshOutlineIcon className="h-3.5 w-3.5" />
                    Thử lại
                  </SecondaryButton>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-center gap-3.5">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-base font-bold text-teal">
                    {getInitials(user?.fullName)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-bold text-ink">
                      {user?.fullName}
                    </h2>
                    <Badge variant="gold">
                      {user?.role === 'Student' ? 'Học viên' : 'Phụ huynh'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-secondary">
                    <PhoneOutlineIcon className="h-3.5 w-3.5 shrink-0 text-teal" />
                    <span>{user?.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-secondary">
                    <MailOutlineIcon className="h-3.5 w-3.5 shrink-0 text-teal" />
                    <span className="truncate">
                      {user?.email || 'Chưa cập nhật email'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 2. Danh sách con */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Học viên liên kết</h3>
              <span className="text-xs font-medium text-ink-muted">
                {studentsLoading || profileLoading
                  ? '...'
                  : `${students.length} học viên`}
              </span>
            </div>

            {studentsLoading || profileLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-12 rounded-xl bg-surface-subtle" />
                <div className="h-12 rounded-xl bg-surface-subtle" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Chưa có học viên nào được liên kết với tài khoản này.
              </p>
            ) : (
              <ul className="space-y-2">
                {students.map((stu) => (
                  <li
                    key={stu.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-mint-canvas/60 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                        {getInitials(stu.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {stu.fullName}
                        </p>
                        <p className="truncate text-xs text-ink-secondary">
                          {stu.branchName || 'Chưa gán cơ sở'}
                          {stu.grade ? ` • ${stu.grade}` : ''}
                        </p>
                      </div>
                    </div>
                    {stu.status === 'Active' && (
                      <Badge variant="emerald">Đang học</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 3. Form sửa thông tin liên hệ */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-ink">
              Cập nhật thông tin liên hệ
            </h3>

            <form onSubmit={handleSaveContact} className="space-y-3">
              {/* Đổi ảnh đại diện */}
              <div className="flex items-center gap-3">
                {avatarUrlInput ? (
                  <img
                    src={avatarUrlInput}
                    alt="Ảnh đại diện"
                    className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-xs font-bold text-ink-muted">
                    {getInitials(user?.fullName)}
                  </div>
                )}

                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleAvatarSelected}
                    className="hidden"
                  />
                  <SecondaryButton
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading || profileLoading}
                    className="min-h-[38px] px-3.5 py-1.5 text-xs"
                  >
                    <CameraOutlineIcon className="h-4 w-4" />
                    {avatarUploading ? 'Đang tải ảnh...' : 'Đổi ảnh đại diện'}
                  </SecondaryButton>
                  {avatarUrlInput && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrlInput(null)}
                      className="text-xs font-medium text-ink-muted underline hover:text-rose-600 cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-ink-muted">
                Hỗ trợ jpg, jpeg, png, webp, tối đa 5MB.
              </p>

              {avatarError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {avatarError}
                </p>
              )}

              {/* Số điện thoại */}
              <div>
                <label
                  htmlFor="account-phone"
                  className="mb-1 block text-xs font-semibold text-ink-secondary"
                >
                  Số điện thoại <span className="text-rose-600">*</span>
                </label>
                <input
                  id="account-phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setContactError(null);
                    setContactSuccess(null);
                  }}
                  placeholder="Ví dụ: 0901234567"
                  disabled={profileLoading || contactSaving}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-surface-subtle"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="account-email"
                  className="mb-1 block text-xs font-semibold text-ink-secondary"
                >
                  Email
                </label>
                <input
                  id="account-email"
                  type="email"
                  maxLength={150}
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setContactError(null);
                    setContactSuccess(null);
                  }}
                  placeholder="name@example.com"
                  disabled={profileLoading || contactSaving}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-surface-subtle"
                />
              </div>

              {contactError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {contactError}
                </p>
              )}
              {contactSuccess && (
                <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  <CheckOutlineIcon className="h-4 w-4 shrink-0" />
                  {contactSuccess}
                </p>
              )}

              <PrimaryButton
                type="submit"
                disabled={profileLoading || contactSaving || avatarUploading}
                className="w-full"
              >
                {contactSaving ? 'Đang lưu...' : 'Lưu thông tin liên hệ'}
              </PrimaryButton>
            </form>
          </Card>

          {/* 4. Form đổi mật khẩu */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <LockOutlineIcon className="h-4 w-4 text-teal" />
              <h3 className="text-sm font-bold text-ink">Đổi mật khẩu</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              {/* Mật khẩu hiện tại */}
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1 block text-xs font-semibold text-ink-secondary"
                >
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPwError(null);
                      setPwSuccess(null);
                    }}
                    placeholder="Nhập mật khẩu hiện tại"
                    disabled={pwSaving}
                    className="w-full rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-10 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-surface-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    aria-label={
                      showCurrentPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink cursor-pointer"
                  >
                    {showCurrentPw ? (
                      <EyeOffOutlineIcon className="h-4 w-4" />
                    ) : (
                      <EyeOutlineIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1 block text-xs font-semibold text-ink-secondary"
                >
                  Mật khẩu mới (tối thiểu 8 ký tự)
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPwError(null);
                      setPwSuccess(null);
                    }}
                    placeholder="Ít nhất 8 ký tự"
                    disabled={pwSaving}
                    className="w-full rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-10 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-surface-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((v) => !v)}
                    aria-label={showNewPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink cursor-pointer"
                  >
                    {showNewPw ? (
                      <EyeOffOutlineIcon className="h-4 w-4" />
                    ) : (
                      <EyeOutlineIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Nhập lại mật khẩu mới */}
              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="mb-1 block text-xs font-semibold text-ink-secondary"
                >
                  Nhập lại mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      setPwError(null);
                      setPwSuccess(null);
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    disabled={pwSaving}
                    className="w-full rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-10 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-surface-subtle"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw((v) => !v)}
                    aria-label={
                      showConfirmPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink cursor-pointer"
                  >
                    {showConfirmPw ? (
                      <EyeOffOutlineIcon className="h-4 w-4" />
                    ) : (
                      <EyeOutlineIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {pwError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {pwError}
                </p>
              )}
              {pwSuccess && (
                <p className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  <CheckOutlineIcon className="h-4 w-4 shrink-0" />
                  {pwSuccess}
                </p>
              )}

              <PrimaryButton
                type="submit"
                disabled={pwSaving}
                className="w-full"
              >
                {pwSaving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </PrimaryButton>
            </form>
          </Card>

          {/* 5. Thông tin trung tâm & danh sách cơ sở */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BuildingOutlineIcon className="h-4 w-4 text-teal" />
                <h3 className="text-sm font-bold text-ink">
                  Thông tin trung tâm Roxy Academy
                </h3>
              </div>
              <a
                href={`tel:${HOTLINE_TEL}`}
                className="inline-flex items-center gap-1 rounded-pill border border-gold/50 bg-gold-soft px-3 py-1 text-xs font-semibold text-teal hover:border-gold"
              >
                <PhoneOutlineIcon className="h-3.5 w-3.5" />
                {HOTLINE_DISPLAY}
              </a>
            </div>

            {branchesLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-16 rounded-xl bg-surface-subtle" />
                <div className="h-16 rounded-xl bg-surface-subtle" />
              </div>
            ) : branchesError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <p>{branchesError}</p>
                <button
                  type="button"
                  onClick={loadBranches}
                  className="mt-2 inline-flex items-center gap-1 font-semibold underline cursor-pointer"
                >
                  <RefreshOutlineIcon className="h-3.5 w-3.5" />
                  Thử lại
                </button>
              </div>
            ) : branches.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Chưa có thông tin cơ sở đang hoạt động.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {branches.map((branch) => (
                  <li
                    key={branch.id}
                    className="rounded-xl border border-line/70 bg-mint-canvas/50 p-3"
                  >
                    <p className="text-sm font-semibold text-ink">
                      {branch.branchName}
                    </p>
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-secondary">
                      <MapPinOutlineIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                      <span>{branch.address}</span>
                    </p>
                    {branch.phone && (
                      <a
                        href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-teal hover:underline"
                      >
                        <PhoneOutlineIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{branch.phone}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 6. Đăng xuất (2 bước inline, không dùng window.confirm) */}
          <Card className="p-4">
            {!confirmLogoutOpen ? (
              <SecondaryButton
                type="button"
                onClick={() => setConfirmLogoutOpen(true)}
                className="w-full border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
              >
                <LogoutOutlineIcon className="h-4 w-4" />
                Đăng xuất
              </SecondaryButton>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-xs font-medium text-ink-secondary">
                  Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <SecondaryButton
                    type="button"
                    disabled={loggingOut}
                    onClick={() => setConfirmLogoutOpen(false)}
                    className="w-full"
                  >
                    Hủy
                  </SecondaryButton>
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogoutConfirm}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-pill bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
                  >
                    <LogoutOutlineIcon className="h-4 w-4" />
                    {loggingOut ? 'Đang thoát...' : 'Xác nhận'}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== SUB-TAB 2: BẢN TIN ==================== */}
      {subTab === 'newsfeed' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Bảng tin trung tâm</h2>
            <button
              type="button"
              onClick={loadNewsfeeds}
              disabled={newsfeedsLoading}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline disabled:opacity-60 cursor-pointer"
            >
              <RefreshOutlineIcon
                className={`h-3.5 w-3.5 ${
                  newsfeedsLoading ? 'animate-spin' : ''
                }`}
              />
              Làm mới
            </button>
          </div>

          {newsfeedsLoading ? (
            <div className="space-y-3 animate-pulse">
              <Card className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 rounded bg-surface-subtle" />
                <div className="h-3 w-1/2 rounded bg-surface-subtle" />
                <div className="h-36 rounded-xl bg-surface-subtle" />
                <div className="h-3 w-full rounded bg-surface-subtle" />
                <div className="h-3 w-5/6 rounded bg-surface-subtle" />
              </Card>
              <Card className="p-4 space-y-2.5">
                <div className="h-4 w-2/3 rounded bg-surface-subtle" />
                <div className="h-3 w-1/3 rounded bg-surface-subtle" />
                <div className="h-3 w-full rounded bg-surface-subtle" />
              </Card>
            </div>
          ) : newsfeedsError ? (
            <Card className="p-5 text-center">
              <AlertTriangleOutlineIcon className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-ink">
                Không tải được bảng tin
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                {newsfeedsError}
              </p>
              <SecondaryButton
                onClick={loadNewsfeeds}
                className="mt-4 min-h-[38px] px-4 py-1.5 text-xs"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                Thử lại
              </SecondaryButton>
            </Card>
          ) : newsfeeds.length === 0 ? (
            <Card className="p-8 text-center">
              <NewspaperOutlineIcon className="mx-auto h-9 w-9 text-ink-muted" />
              <p className="mt-2 text-sm font-semibold text-ink">
                Chưa có bản tin nào
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Các thông báo và tin tức mới từ Roxy Academy sẽ hiển thị tại đây.
              </p>
            </Card>
          ) : (
            newsfeeds.map((item) => {
              const isExpanded = expandedNewsIds.has(item.id);
              const isLong = item.content.length > 140;
              return (
                <Card
                  key={item.id}
                  interactive
                  onClick={() => toggleNewsExpand(item.id)}
                  className="overflow-hidden p-4 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.isPinned && (
                      <Badge variant="gold">
                        <PinOutlineIcon className="h-3 w-3" />
                        Đã ghim
                      </Badge>
                    )}
                    {item.branchName && (
                      <Badge variant="neutral">{item.branchName}</Badge>
                    )}
                  </div>

                  <h3 className="mt-2 text-base font-bold text-ink leading-snug">
                    {item.title}
                  </h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                    {item.createdByName && <span>{item.createdByName}</span>}
                    {item.createdByName && <span>•</span>}
                    <span className="inline-flex items-center gap-1">
                      <ClockOutlineIcon className="h-3.5 w-3.5" />
                      {formatRelativeTimeVi(item.createdAt)}
                    </span>
                  </div>

                  {item.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-line/70 bg-surface-subtle">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="max-h-60 w-full object-cover"
                      />
                    </div>
                  )}

                  <p
                    className={`mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-secondary ${
                      isExpanded ? '' : 'line-clamp-3'
                    }`}
                  >
                    {item.content}
                  </p>

                  {isLong && (
                    <span className="mt-2 inline-block text-xs font-semibold text-teal">
                      {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </span>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 3: THÔNG BÁO ==================== */}
      {subTab === 'notifications' && (
        <div className="flex flex-col gap-3">
          {/* Thanh lọc + Đánh dấu đã đọc tất cả */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNotifFilter('all')}
                className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  notifFilter === 'all'
                    ? 'border-teal bg-teal text-white'
                    : 'border-line bg-surface text-ink-secondary hover:border-line-strong'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('unread')}
                className={`rounded-pill border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  notifFilter === 'unread'
                    ? 'border-teal bg-teal text-white'
                    : 'border-line bg-surface text-ink-secondary hover:border-line-strong'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAll || notificationsLoading}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              <CheckOutlineIcon className="h-3.5 w-3.5" />
              {markingAll ? 'Đang xử lý...' : 'Đánh dấu đã đọc tất cả'}
            </button>
          </div>

          {notificationsLoading ? (
            <div className="space-y-2.5 animate-pulse">
              <Card className="p-4 space-y-2">
                <div className="h-4 w-24 rounded bg-surface-subtle" />
                <div className="h-4 w-3/4 rounded bg-surface-subtle" />
                <div className="h-3 w-full rounded bg-surface-subtle" />
              </Card>
              <Card className="p-4 space-y-2">
                <div className="h-4 w-20 rounded bg-surface-subtle" />
                <div className="h-4 w-2/3 rounded bg-surface-subtle" />
                <div className="h-3 w-5/6 rounded bg-surface-subtle" />
              </Card>
            </div>
          ) : notificationsError ? (
            <Card className="p-5 text-center">
              <AlertTriangleOutlineIcon className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-2 text-sm font-semibold text-ink">
                Không tải được thông báo
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                {notificationsError}
              </p>
              <SecondaryButton
                onClick={loadNotifications}
                className="mt-4 min-h-[38px] px-4 py-1.5 text-xs"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                Thử lại
              </SecondaryButton>
            </Card>
          ) : visibleNotifications.length === 0 ? (
            <Card className="p-8 text-center">
              <BellOutlineIcon className="mx-auto h-9 w-9 text-ink-muted" />
              <p className="mt-2 text-sm font-semibold text-ink">
                {notifFilter === 'unread'
                  ? 'Không có thông báo chưa đọc'
                  : 'Chưa có thông báo nào'}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {notifFilter === 'unread'
                  ? 'Bạn đã xem hết tất cả thông báo.'
                  : 'Các cập nhật về điểm danh, bài tập, học phí sẽ hiển thị tại đây.'}
              </p>
            </Card>
          ) : (
            visibleNotifications.map((notif) => {
              const typeMeta = getNotificationTypeMeta(notif.type);
              return (
                <Card
                  key={notif.id}
                  interactive={!notif.isRead}
                  onClick={() => handleMarkOneRead(notif)}
                  className={`p-4 ${
                    !notif.isRead
                      ? 'border-teal/40 bg-mint-canvas/70 cursor-pointer'
                      : 'opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                      {!notif.isRead && (
                        <span
                          aria-label="Chưa đọc"
                          className="h-2.5 w-2.5 rounded-full bg-teal"
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-ink-muted">
                      {formatRelativeTimeVi(notif.createdAt)}
                    </span>
                  </div>

                  <h3
                    className={`mt-2 text-sm leading-snug ${
                      !notif.isRead
                        ? 'font-bold text-ink'
                        : 'font-semibold text-ink-secondary'
                    }`}
                  >
                    {notif.title}
                  </h3>

                  {notif.body && (
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink-secondary">
                      {notif.body}
                    </p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
