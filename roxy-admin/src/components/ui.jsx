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
