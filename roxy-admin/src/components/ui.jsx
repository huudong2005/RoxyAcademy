import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const BADGE_VARIANTS = {
  gold: 'bg-gold-soft text-teal border-gold/40',
  teal: 'bg-teal text-white border-teal',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-surface-subtle text-ink-secondary border-line',
};

const STAT_ACCENTS = {
  teal: 'border-l-4 border-l-teal',
  gold: 'border-l-4 border-l-gold',
  emerald: 'border-l-4 border-l-emerald-600',
  amber: 'border-l-4 border-l-amber-500',
};

/** Nút hành động chính: nền vàng gold, chữ teal đậm (đạt chuẩn tương phản WCAG). */
export function PrimaryButton({
  as: Component = 'button',
  type,
  className = '',
  children,
  ...props
}) {
  const resolvedType = Component === 'button' ? (type ?? 'button') : type;
  return (
    <Component
      type={resolvedType}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-teal shadow-xs hover:bg-gold-hover active:bg-gold-active active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Nút hành động phụ: nền trắng, viền mảnh, chữ teal. */
export function SecondaryButton({
  as: Component = 'button',
  type,
  className = '',
  children,
  ...props
}) {
  const resolvedType = Component === 'button' ? (type ?? 'button') : type;
  return (
    <Component
      type={resolvedType}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-teal shadow-xs hover:bg-mint-canvas hover:border-line-strong active:scale-[0.98] transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

const ICON_BUTTON_VARIANTS = {
  neutral: 'bg-gold-soft/70 border-gold/30 text-teal hover:bg-gold-soft hover:border-gold/50',
  danger: 'bg-rose-50/60 border-rose-200/70 text-rose-600 hover:bg-rose-100 hover:border-rose-300',
};

/** Nút icon tròn gọn cho cột thao tác trong bảng. */
export function IconButton({
  variant = 'neutral',
  type = 'button',
  title,
  className = '',
  children,
  ...props
}) {
  const variantClass = ICON_BUTTON_VARIANTS[variant] || ICON_BUTTON_VARIANTS.neutral;
  const ariaLabel = props['aria-label'] || title;
  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border active:scale-95 transition-[transform,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Ô nhập dạng pill 1 dòng. */
export function InputPill({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

/** Ô chọn dạng pill đồng bộ với InputPill. */
export function SelectPill({
  className = '',
  wrapperClassName = 'w-full',
  children,
  ...props
}) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        className={`w-full h-10 appearance-none rounded-full border border-line bg-surface pl-4 pr-10 text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-muted"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
        </svg>
      </span>
    </div>
  );
}

/** Dropdown tự vẽ đồng bộ hoàn toàn hệ Teal & Gold, thay thế <select> hệ điều hành. */
export function CustomSelect({
  id,
  options = [],
  value,
  onChange,
  disabled = false,
  className = '',
  wrapperClassName = 'w-full',
  placeholder,
  ariaLabel,
  'aria-label': ariaLabelAttr,
  title,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const normalizedValue = String(value ?? '');
  const selectedIndex = options.findIndex((opt) => String(opt.value) === normalizedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const resolvedAriaLabel = ariaLabelAttr ?? ariaLabel;

  const findNextEnabledIndex = (startIndex, step) => {
    if (!options.length) return -1;
    let idx = startIndex;
    for (let i = 0; i < options.length; i += 1) {
      idx = (idx + step + options.length) % options.length;
      if (!options[idx]?.disabled) return idx;
    }
    return -1;
  };

  const openMenu = () => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 250 && rect.top > spaceBelow);
    }
    let initialIdx = selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : -1;
    if (initialIdx === -1) {
      initialIdx = options.findIndex((opt) => !opt.disabled);
    }
    setHighlightedIndex(initialIdx);
    setIsOpen(true);
  };

  const closeMenu = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const handleSelect = (opt) => {
    if (!opt || opt.disabled) return;
    onChange?.(opt.value);
    closeMenu(true);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

  const handleKeyDown = (event) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        if (!isOpen) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => findNextEnabledIndex(prev < 0 ? -1 : prev, 1));
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!isOpen) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => findNextEnabledIndex(prev < 0 ? 0 : prev, -1));
        }
        break;
      }
      case 'Enter': {
        if (isOpen) {
          event.preventDefault();
          const opt = options[highlightedIndex];
          if (opt && !opt.disabled) {
            handleSelect(opt);
          }
        }
        break;
      }
      case 'Escape': {
        if (isOpen) {
          event.preventDefault();
          closeMenu(true);
        }
        break;
      }
      case 'Tab': {
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={resolvedAriaLabel}
        title={title}
        onClick={() => (isOpen ? closeMenu(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`w-full h-10 rounded-full border border-line bg-surface pl-4 pr-10 text-left text-sm text-ink transition-[border-color,box-shadow] duration-150 focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none disabled:bg-surface-subtle disabled:text-ink-muted disabled:cursor-not-allowed cursor-pointer ${className}`}
      >
        <span className={`truncate block ${!selectedOption && placeholder ? 'text-ink-muted' : ''}`}>
          {selectedOption ? selectedOption.label : (placeholder ?? '')}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-muted"
        >
          <svg
            className={`h-4 w-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={resolvedAriaLabel}
          className={`absolute left-0 z-30 w-full max-h-60 overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-modal ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = String(opt.value) === normalizedValue;
            const isHighlighted = idx === highlightedIndex;
            const isDisabled = Boolean(opt.disabled);

            return (
              <li
                key={String(opt.value)}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled || undefined}
                onMouseEnter={() => {
                  if (!isDisabled) setHighlightedIndex(idx);
                }}
                onClick={() => handleSelect(opt)}
                className={`px-4 py-2.5 text-sm flex items-center justify-between gap-2 transition-colors duration-100 ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed text-ink-muted'
                    : isSelected
                      ? 'font-semibold text-teal bg-gold-soft/45 cursor-pointer hover:bg-gold-soft'
                      : isHighlighted
                        ? 'bg-gold-soft text-ink cursor-pointer'
                        : 'text-ink cursor-pointer hover:bg-gold-soft'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-gold-active"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3.5 3.5L15 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Nhãn trạng thái dạng pill. */
export function Badge({ variant = 'neutral', className = '', children, ...props }) {
  const variantClass = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

/** Thẻ bề mặt chuẩn hệ Teal & Gold. */
export function Card({
  as: Component = 'div',
  large = false,
  interactive = false,
  className = '',
  children,
  ...props
}) {
  const radiusClass = large ? 'rounded-card-lg' : 'rounded-card';
  const interactiveClass = interactive
    ? 'hover:shadow-card-hover hover:border-line-strong active:scale-[0.99] transition-[transform,box-shadow,border-color] duration-150 ease-out'
    : '';

  return (
    <Component
      className={`bg-surface border border-line/80 shadow-card ${radiusClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Thẻ số liệu tổng quan. */
export function StatCard({
  title,
  value,
  note,
  icon,
  accent = 'teal',
  to,
  ctaLabel = 'Chi tiết →',
  className = '',
}) {
  const accentClass = STAT_ACCENTS[accent] || STAT_ACCENTS.teal;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {title}
        </span>
        {icon && (
          <span className="text-lg leading-none" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-teal tabular-nums">
          {value}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-ink-secondary">{note}</p>
        {to && (
          <span className="text-[11px] font-semibold text-teal group-hover:text-gold-active group-hover:translate-x-0.5 transition-[transform,color] duration-150 ease-out shrink-0">
            {ctaLabel}
          </span>
        )}
      </div>
    </>
  );

  if (!to) {
    return (
      <div
        className={`rounded-card border border-line/80 bg-surface p-5 shadow-card ${accentClass} ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={`group block rounded-card border border-line/80 bg-surface p-5 shadow-card ${accentClass} hover:border-line-strong hover:shadow-card-hover active:scale-[0.99] transition-[transform,box-shadow,border-color] duration-150 ease-out ${className}`}
    >
      {content}
    </Link>
  );
}

/** Tiêu đề trang chuẩn gồm eyebrow, H1, mô tả và cụm nút hành động. */
export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div
      className={`rounded-card-lg border border-line/80 bg-surface p-5 md:p-6 shadow-card ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-xs md:text-sm text-ink-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
