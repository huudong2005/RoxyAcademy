import React from 'react';
import { Badge, Card } from '@/components/ui';
import { useAuth } from '@/context/authContext';
import {
  BookOutlineIcon,
  CalendarOutlineIcon,
  HomeOutlineIcon,
  LogoutOutlineIcon,
  PhoneOutlineIcon,
  ShieldCheckOutlineIcon,
  UserOutlineIcon,
  WalletOutlineIcon,
} from '@/components/icons';
import type { TabKey } from '@/components/BottomNavBar';

interface TabScreenProps {
  tab: TabKey;
}

export default function TabPlaceholderPage({ tab }: TabScreenProps) {
  const { user, activeStudent, students, logout } = useAuth();

  const renderSectionMeta = () => {
    switch (tab) {
      case '/today':
        return {
          eyebrow: 'BẢNG TIN HÔM NAY',
          title: 'Hôm nay',
          description:
            'Theo dõi lịch học trong ngày, điểm danh và thông báo mới nhất từ trung tâm.',
          Icon: HomeOutlineIcon,
        };
      case '/schedules':
        return {
          eyebrow: 'THỜI KHÓA BIỂU',
          title: 'Lịch học',
          description:
            'Xem lịch học theo tuần, phòng học và giáo viên phụ trách lớp của bé.',
          Icon: CalendarOutlineIcon,
        };
      case '/homeworks':
        return {
          eyebrow: 'GÓC HỌC TẬP',
          title: 'Bài tập',
          description:
            'Danh sách bài tập về nhà, nhận xét của giáo viên và kết quả rèn luyện.',
          Icon: BookOutlineIcon,
        };
      case '/tuitions':
        return {
          eyebrow: 'HỌC PHÍ & THANH TOÁN',
          title: 'Học phí',
          description:
            'Tra cứu kỳ thu học phí, trạng thái biên lai và lịch sử thanh toán.',
          Icon: WalletOutlineIcon,
        };
      case '/account':
        return {
          eyebrow: 'HỒ SƠ PHỤ HUYNH & HỌC VIÊN',
          title: 'Tài khoản',
          description:
            'Quản lý thông tin liên hệ phụ huynh và danh sách hồ sơ học viên liên kết.',
          Icon: UserOutlineIcon,
        };
    }
  };

  const { eyebrow, title, description, Icon } = renderSectionMeta();

  return (
    <div className="tab-content mx-auto w-full max-w-lg space-y-4 px-4 pt-4 pb-28">
      {/* Header thẻ tiêu đề của Tab */}
      <Card large className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-ink">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
              {description}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-teal">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {/* Dải thông tin học viên đang xem */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-line/80 bg-surface-subtle px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] text-ink-muted">Học viên đang theo dõi</p>
            <p className="truncate text-xs font-semibold text-ink">
              {activeStudent
                ? activeStudent.fullName
                : 'Chưa liên kết học viên'}
            </p>
          </div>
          {activeStudent ? (
            <Badge variant="gold">
              Mã #{activeStudent.id}
            </Badge>
          ) : (
            <Badge variant="neutral">Chưa có hồ sơ</Badge>
          )}
        </div>
      </Card>

      {/* Thẻ trạng thái "Đang cập nhật" chuẩn Roxy */}
      <Card className="p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-teal">
          <Icon className="h-6 w-6" />
        </div>
        <Badge variant="gold" className="mb-2">
          Đang cập nhật
        </Badge>
        <h3 className="text-base font-bold text-ink">
          Nội dung mục {title} đang cập nhật
        </h3>
        <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-ink-secondary">
          Chức năng chi tiết của phân hệ này đang được đồng bộ cùng hệ thống quản lý học tập Roxy Academy.
        </p>
      </Card>

      {/* Riêng tab Tài khoản: hiển thị thông tin tài khoản hiện tại + nút Đăng xuất */}
      {tab === '/account' && user && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line/70 pb-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Thông tin tài khoản
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink">
                {user.fullName}
              </p>
            </div>
            <Badge variant="teal">{user.role}</Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                <PhoneOutlineIcon className="h-4 w-4 text-teal" />
                Số điện thoại
              </span>
              <span className="font-semibold text-ink tabular-nums">
                {user.phoneNumber || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                <ShieldCheckOutlineIcon className="h-4 w-4 text-teal" />
                Số học viên liên kết
              </span>
              <span className="font-semibold text-ink">
                {students.length > 0
                  ? `${students.length} học viên`
                  : 'Chưa liên kết học viên'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-line/70">
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition-[transform,background-color] duration-150 cursor-pointer"
            >
              <LogoutOutlineIcon className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
