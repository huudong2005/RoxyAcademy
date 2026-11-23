import React from 'react';
import {
  BookOutlineIcon,
  CalendarOutlineIcon,
  HomeOutlineIcon,
  UserOutlineIcon,
  WalletOutlineIcon,
} from '@/components/icons';

export type TabKey = '/today' | '/schedules' | '/homeworks' | '/tuitions' | '/account';

interface BottomNavBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

const NAV_TABS: Array<{
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: '/today', label: 'Hôm nay', Icon: HomeOutlineIcon },
  { key: '/schedules', label: 'Lịch học', Icon: CalendarOutlineIcon },
  { key: '/homeworks', label: 'Bài tập', Icon: BookOutlineIcon },
  { key: '/tuitions', label: 'Học phí', Icon: WalletOutlineIcon },
  { key: '/account', label: 'Tài khoản', Icon: UserOutlineIcon },
];

export default function BottomNavBar({
  activeTab,
  onSelectTab,
}: BottomNavBarProps) {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-surface/95 backdrop-blur px-2 pt-1.5"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {NAV_TABS.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTab(key)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.96] cursor-pointer ${
                isActive
                  ? 'bg-gold-soft/75 font-bold text-teal'
                  : 'font-medium text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-colors duration-150 ${
                  isActive ? 'text-teal' : 'text-ink-muted'
                }`}
              />
              <span className="truncate leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
