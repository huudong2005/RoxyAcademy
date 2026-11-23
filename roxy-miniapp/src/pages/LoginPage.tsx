import React, { useState } from 'react';
import {
  getAccessToken,
  getPhoneNumber,
  openPermissionSetting,
} from 'zmp-sdk/apis';
import axiosClient from '@/api/axiosClient';
import logo from '@/assets/logo-roxy-v2.svg';
import {
  AlertTriangleOutlineIcon,
  PhoneOutlineIcon,
  RefreshOutlineIcon,
  SettingsOutlineIcon,
  ShieldCheckOutlineIcon,
} from '@/components/icons';
import { Card, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/authContext';
import type { LoginResponse } from '@/types/auth';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { completeLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string>('');
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [permissionMessage, setPermissionMessage] = useState<string>('');

  const [devPhone, setDevPhone] = useState<string>('');
  const [devPassword, setDevPassword] = useState<string>('');
  const [showDevPassword, setShowDevPassword] = useState<boolean>(false);
  const [devLoading, setDevLoading] = useState<boolean>(false);

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');
  const canShowDevLogin = import.meta.env.DEV && isLocalhost;

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!import.meta.env.DEV || !canShowDevLogin) return;

    setServerError('');
    setPermissionDenied(false);
    setPermissionMessage('');

    const cleanPhone = devPhone.trim();
    if (!cleanPhone || !devPassword) {
      setServerError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
      return;
    }

    setDevLoading(true);
    try {
      const response = await axiosClient.post<LoginResponse>('/Auth/login', {
        phoneNumber: cleanPhone,
        password: devPassword,
      });

      const { accessToken, expiresAt, user } = response.data;
      await completeLogin({
        accessToken,
        expiresAt,
        user,
      });
      onLoginSuccess();
    } catch (err: any) {
      const resData = err?.response?.data;
      const apiMsg = resData?.message;
      const validationErrors =
        resData?.errors && typeof resData.errors === 'object'
          ? ([] as unknown[])
              .concat(...Object.values(resData.errors))
              .filter(Boolean)
              .join(' ')
          : '';

      if (typeof apiMsg === 'string' && apiMsg.trim()) {
        setServerError(apiMsg.trim());
      } else if (validationErrors) {
        setServerError(validationErrors);
      } else if (err?.response?.status === 401) {
        setServerError('Số điện thoại hoặc mật khẩu không chính xác.');
      } else if (typeof resData?.title === 'string' && resData.title.trim()) {
        setServerError(resData.title.trim());
      } else if (typeof resData === 'string' && resData.trim()) {
        setServerError(resData.trim());
      } else if (err?.response) {
        setServerError(
          `Yêu cầu đăng nhập không hợp lệ (Mã lỗi ${err.response.status}).`
        );
      } else {
        setServerError(
          'Không thể kết nối đến máy chủ Roxy Academy. Vui lòng kiểm tra kết nối mạng và thử lại.'
        );
      }
    } finally {
      setDevLoading(false);
    }
  };

  const handleZaloLogin = async () => {
    setLoading(true);
    setServerError('');
    setPermissionDenied(false);
    setPermissionMessage('');

    let resolvedAccessToken = '';
    let resolvedPhoneCode = '';
    let userRejectedPermission = false;

    try {
      const tokenRes: unknown = await getAccessToken({});
      if (typeof tokenRes === 'string') {
        resolvedAccessToken = tokenRes.trim();
      } else if (
        tokenRes &&
        typeof tokenRes === 'object' &&
        'accessToken' in tokenRes &&
        typeof (tokenRes as { accessToken?: unknown }).accessToken === 'string'
      ) {
        resolvedAccessToken = (
          (tokenRes as { accessToken: string }).accessToken || ''
        ).trim();
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === -201 || code === -202 || code === -1401) {
        userRejectedPermission = true;
      }
    }

    if (!userRejectedPermission) {
      try {
        const phoneRes = await getPhoneNumber({});
        if (phoneRes && typeof phoneRes === 'object') {
          if (typeof phoneRes.token === 'string' && phoneRes.token.trim()) {
            resolvedPhoneCode = phoneRes.token.trim();
          } else if (
            typeof phoneRes.number === 'string' &&
            phoneRes.number.trim()
          ) {
            resolvedPhoneCode = phoneRes.number.trim();
          }
        }
      } catch (err: any) {
        const code = err?.code;
        const msg = String(err?.message || '').toLowerCase();
        if (
          code === -201 ||
          code === -202 ||
          code === -1401 ||
          msg.includes('deny') ||
          msg.includes('denied') ||
          msg.includes('reject') ||
          msg.includes('permission') ||
          msg.includes('từ chối')
        ) {
          userRejectedPermission = true;
        }
      }
    }

    if (userRejectedPermission) {
      setPermissionDenied(true);
      setPermissionMessage(
        'Bạn đã từ chối cấp quyền truy cập số điện thoại Zalo. Vui lòng bật lại quyền số điện thoại để hệ thống nhận diện tài khoản phụ huynh.'
      );
      setLoading(false);
      return;
    }

    try {
      const payloadAccessToken =
        resolvedAccessToken || 'browser-check-empty-access-token';
      const payloadPhoneCode =
        resolvedPhoneCode || 'browser-check-empty-phone-code';

      const response = await axiosClient.post<LoginResponse>(
        '/Auth/zalo-login',
        {
          accessToken: payloadAccessToken,
          phoneCode: payloadPhoneCode,
        }
      );

      const { accessToken, expiresAt, user } = response.data;
      await completeLogin({
        accessToken,
        expiresAt,
        user,
      });
      onLoginSuccess();
    } catch (err: any) {
      const resData = err?.response?.data;
      const apiMsg = resData?.message;
      const validationErrors =
        resData?.errors && typeof resData.errors === 'object'
          ? ([] as unknown[])
              .concat(...Object.values(resData.errors))
              .filter(Boolean)
              .join(' ')
          : '';

      if (typeof apiMsg === 'string' && apiMsg.trim()) {
        setServerError(apiMsg.trim());
      } else if (validationErrors) {
        setServerError(validationErrors);
      } else if (typeof resData?.title === 'string' && resData.title.trim()) {
        setServerError(resData.title.trim());
      } else if (typeof resData === 'string' && resData.trim()) {
        setServerError(resData.trim());
      } else if (err?.response) {
        setServerError(
          `Yêu cầu đăng nhập Zalo không hợp lệ (Mã lỗi ${err.response.status}).`
        );
      } else {
        setServerError(
          'Không thể kết nối đến máy chủ Roxy Academy. Vui lòng kiểm tra kết nối mạng và thử lại.'
        );
      }

      if (!resolvedAccessToken || !resolvedPhoneCode) {
        setPermissionDenied(true);
        setPermissionMessage(
          'Thiết bị chưa cấp mã số điện thoại Zalo (hoặc bạn đang mở trên trình duyệt ngoài ứng dụng Zalo).'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenZaloPermissionSetting = async () => {
    try {
      await openPermissionSetting({});
    } catch {
      // Ignore if running in browser outside Zalo mobile app
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-mint-canvas p-4">
      <Card large className="w-full max-w-md p-6 sm:p-8">
        {/* Header Thương hiệu Roxy Academy */}
        <div className="text-center">
          <img
            src={logo}
            alt="Roxy Academy"
            className="mx-auto mb-3.5 h-16 w-auto"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            CỔNG PHỤ HUYNH &amp; HỌC VIÊN
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-ink">
            Roxy Academy
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
            Theo dõi lịch học, điểm danh, bài tập và học phí của bé ngay trên Zalo.
          </p>
        </div>

        {/* Khung thông báo lỗi trả về từ Server */}
        {serverError && (
          <div
            role="alert"
            className="mt-5 rounded-card border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 space-y-2.5"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangleOutlineIcon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-rose-900">
                  Đăng nhập chưa thành công
                </p>
                <p className="mt-0.5 leading-relaxed">{serverError}</p>
              </div>
            </div>
            <div className="pt-1">
              <SecondaryButton
                onClick={handleZaloLogin}
                disabled={loading}
                className="w-full min-h-[38px] py-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
              >
                <RefreshOutlineIcon className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </SecondaryButton>
            </div>
          </div>
        )}

        {/* Hộp hướng dẫn bật lại quyền số điện thoại trên Zalo */}
        {permissionDenied && (
          <div
            role="region"
            aria-label="Hướng dẫn cấp quyền số điện thoại Zalo"
            className="mt-4 rounded-card border border-amber-300 bg-gold-soft/80 p-4 text-xs text-ink space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <ShieldCheckOutlineIcon className="h-5 w-5 shrink-0 text-teal mt-0.5" />
              <div>
                <p className="font-bold text-teal">
                  Hướng dẫn bật quyền số điện thoại trên Zalo
                </p>
                {permissionMessage && (
                  <p className="mt-1 text-ink-secondary leading-relaxed">
                    {permissionMessage}
                  </p>
                )}
              </div>
            </div>

            <ol className="list-decimal space-y-1.5 pl-5 text-ink-secondary leading-relaxed">
              <li>
                Chạm biểu tượng <strong>ba chấm (•••)</strong> ở góc phải phía trên màn hình Zalo Mini App.
              </li>
              <li>
                Chọn <strong>Quản lý quyền</strong> (hoặc bấm nút mở cài đặt quyền bên dưới).
              </li>
              <li>
                Bật cho phép quyền <strong>Số điện thoại</strong> rồi bấm <strong>Thử lại</strong>.
              </li>
            </ol>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <SecondaryButton
                onClick={handleOpenZaloPermissionSetting}
                disabled={loading}
                className="flex-1 min-h-[40px] py-2 text-xs"
              >
                <SettingsOutlineIcon className="h-4 w-4" />
                <span>Mở cài đặt quyền Zalo</span>
              </SecondaryButton>
              <PrimaryButton
                onClick={handleZaloLogin}
                disabled={loading}
                className="flex-1 min-h-[40px] py-2 text-xs"
              >
                <RefreshOutlineIcon className="h-4 w-4" />
                <span>Thử lại</span>
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Khu vực nút "Đăng nhập bằng Zalo" + câu giải thích bắt buộc */}
        <div className="mt-6 space-y-3">
          <PrimaryButton
            onClick={handleZaloLogin}
            disabled={loading || devLoading}
            className="w-full py-3 text-sm"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Đang xác thực với Zalo...</span>
              </>
            ) : (
              <>
                <PhoneOutlineIcon className="h-4 w-4 text-teal" />
                <span>Đăng nhập bằng Zalo</span>
              </>
            )}
          </PrimaryButton>

          <p className="text-center text-xs leading-relaxed text-ink-secondary px-2">
            Dùng số điện thoại Zalo để nhận diện tài khoản phụ huynh của trung tâm.
          </p>
        </div>

        {import.meta.env.DEV && canShowDevLogin && (
          <form
            onSubmit={handleDevLogin}
            className="mt-6 rounded-card border border-dashed border-line-strong bg-surface-subtle p-4 space-y-3"
          >
            <p className="text-xs font-bold text-teal">
              Đăng nhập thử — chỉ dùng để test trên máy tính
            </p>

            <div>
              <label
                htmlFor="dev-login-phone"
                className="block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary mb-1"
              >
                Số điện thoại
              </label>
              <input
                id="dev-login-phone"
                type="tel"
                autoComplete="username"
                disabled={loading || devLoading}
                placeholder="Nhập số điện thoại"
                value={devPhone}
                onChange={(e) => setDevPhone(e.target.value)}
                className="w-full rounded-pill border border-line bg-surface px-4 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="dev-login-password"
                className="block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary mb-1"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="dev-login-password"
                  type={showDevPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={loading || devLoading}
                  placeholder="Nhập mật khẩu"
                  value={devPassword}
                  onChange={(e) => setDevPassword(e.target.value)}
                  className="w-full rounded-pill border border-line bg-surface pl-4 pr-10 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowDevPassword((prev) => !prev)}
                  aria-label={showDevPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-muted hover:text-ink-secondary cursor-pointer"
                >
                  {showDevPassword ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <SecondaryButton
              type="submit"
              disabled={loading || devLoading}
              className="w-full min-h-[40px] py-2 text-xs font-semibold"
            >
              {devLoading ? 'Đang đăng nhập...' : 'Đăng nhập thử'}
            </SecondaryButton>
          </form>
        )}

        {/* Chân thẻ thông tin hỗ trợ */}
        <div className="mt-6 border-t border-line/70 pt-4 text-center text-[11px] text-ink-muted space-y-1">
          <p>Roxy Academy • P. Bình Trưng, TP.HCM</p>
          <p>Hotline hỗ trợ phụ huynh: 0326 538 824</p>
        </div>
      </Card>
    </div>
  );
}
