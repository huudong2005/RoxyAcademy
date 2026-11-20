import { useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from './ui';

export default function ConfirmModal({
  open,
  mode = 'confirm',
  title,
  message,
  confirmText,
  cancelText = 'Hủy',
  tone = 'primary',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const isAlert = mode === 'alert';
  const resolvedTitle = title || (isAlert ? 'Thông báo' : 'Xác nhận');
  const resolvedConfirmText = confirmText || (isAlert ? 'Đã hiểu' : 'Đồng ý');
  const handleConfirm = () => (isAlert ? onCancel?.() : onConfirm?.());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-teal-deep/40 backdrop-blur-[2px]"
        onClick={() => onCancel?.()}
      />
      <div className="modal-panel relative z-10 w-full max-w-md rounded-card-lg border border-line/80 bg-surface p-6 shadow-modal">
        <div className="flex items-start justify-between gap-3">
          <h3 id="confirm-modal-title" className="text-base font-bold text-ink">
            {resolvedTitle}
          </h3>
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-mint-canvas hover:text-ink transition-colors duration-150 ease-out cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-secondary">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-line/60 pt-4">
          {!isAlert && (
            <SecondaryButton onClick={() => onCancel?.()}>
              {cancelText}
            </SecondaryButton>
          )}
          {tone === 'danger' ? (
            <button
              type="button"
              autoFocus
              onClick={handleConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-1 cursor-pointer"
            >
              {resolvedConfirmText}
            </button>
          ) : (
            <PrimaryButton autoFocus onClick={handleConfirm}>
              {resolvedConfirmText}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
