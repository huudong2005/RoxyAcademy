import React, { useEffect, useRef, useState } from 'react';
import logo from '@/assets/logo-roxy-v2.svg';
import { useAuth } from '@/context/authContext';
import {
  CheckOutlineIcon,
  ChevronDownOutlineIcon,
  UserOutlineIcon,
} from '@/components/icons';

export default function AppHeader() {
  const { user, students, studentsLoading, activeStudent, selectStudent } =
    useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [dropdownOpen]);

  const hasMultipleStudents = students.length > 1;

  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur px-4 pb-3"
      style={{
        paddingTop: 'max(0.75rem, var(--zaui-safe-area-inset-top, 0px))',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Cụm Logo + Tên phụ huynh / người dùng */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={logo}
            alt="Roxy Academy"
            className="h-9 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink-muted truncate">
              {user?.role === 'Student' ? 'Học viên' : 'Phụ huynh'}
            </p>
            <h1 className="text-sm font-bold text-ink truncate">
              {user?.fullName || 'Đang đồng bộ...'}
            </h1>
          </div>
        </div>

        {/* Cụm hiển thị / chọn con đang xem */}
        <div className="relative shrink-0" ref={dropdownRef}>
          {studentsLoading ? (
            <div className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-muted">
              <span>Đang tải hồ sơ...</span>
            </div>
          ) : activeStudent ? (
            <button
              type="button"
              onClick={() => {
                if (hasMultipleStudents) {
                  setDropdownOpen((prev) => !prev);
                }
              }}
              aria-haspopup={hasMultipleStudents ? 'listbox' : undefined}
              aria-expanded={hasMultipleStudents ? dropdownOpen : undefined}
              className={`inline-flex items-center gap-1.5 rounded-pill border border-gold/40 bg-gold-soft px-3 py-1.5 text-xs font-semibold text-teal shadow-xs transition-transform duration-150 ${
                hasMultipleStudents
                  ? 'active:scale-[0.98] cursor-pointer hover:border-gold'
                  : 'cursor-default'
              }`}
            >
              <UserOutlineIcon className="h-3.5 w-3.5 text-teal shrink-0" />
              <span className="max-w-[125px] truncate">
                {activeStudent.fullName}
              </span>
              {hasMultipleStudents && (
                <ChevronDownOutlineIcon
                  className={`h-3.5 w-3.5 text-teal transition-transform duration-150 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-muted">
              <UserOutlineIcon className="h-3.5 w-3.5 text-ink-muted shrink-0" />
              <span>Chưa liên kết học viên</span>
            </div>
          )}

          {dropdownOpen && hasMultipleStudents && (
            <div
              role="listbox"
              aria-label="Chọn học viên đang xem"
              className="popover-panel absolute right-0 mt-2 w-56 rounded-card border border-line bg-surface py-1.5 shadow-modal z-50"
            >
              <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted border-b border-line/60">
                Chọn học viên đang xem
              </div>
              {students.map((stu) => {
                const isSelected = activeStudent?.id === stu.id;
                return (
                  <button
                    key={stu.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      selectStudent(stu.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-gold-soft/60 font-semibold text-teal'
                        : 'text-ink hover:bg-mint-canvas'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{stu.fullName}</p>
                      {stu.branchName && (
                        <p className="text-[11px] font-normal text-ink-muted truncate">
                          {stu.branchName}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckOutlineIcon className="h-4 w-4 shrink-0 text-gold-active" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
