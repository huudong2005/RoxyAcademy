import React from 'react';

const BADGE_VARIANTS = {
  gold: 'bg-gold-soft text-teal border-gold/40',
  teal: 'bg-teal text-white border-teal',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-surface-subtle text-ink-secondary border-line',
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANTS;

export function PrimaryButton({
  type = 'button',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-gold px-5 py-2.5 text-sm font-semibold text-teal shadow-xs hover:bg-gold-hover active:bg-gold-active active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  type = 'button',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill border border-line bg-surface px-5 py-2.5 text-sm font-medium text-teal shadow-xs hover:bg-mint-canvas hover:border-line-strong active:scale-[0.98] transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  variant = 'neutral',
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variantClass = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function Card({
  large = false,
  interactive = false,
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  large?: boolean;
  interactive?: boolean;
}) {
  const radiusClass = large ? 'rounded-card-lg' : 'rounded-card';
  const interactiveClass = interactive
    ? 'hover:shadow-card-hover hover:border-line-strong active:scale-[0.99] transition-[transform,box-shadow,border-color] duration-150 ease-out'
    : '';

  return (
    <div
      className={`bg-surface border border-line/80 shadow-card ${radiusClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
