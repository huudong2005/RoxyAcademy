import { useEffect } from 'react';

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
  const confirmButtonClass =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-backdrop fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={() => onCancel?.()}
      />
      <div className="modal-panel relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">
            {resolvedTitle}
          </h3>
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          {!isAlert && (
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-transform duration-150 cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => (isAlert ? onCancel?.() : onConfirm?.())}
            className={`min-h-[40px] rounded-lg px-4 py-2 text-xs md:text-sm font-semibold shadow-xs active:scale-[0.98] transition-transform duration-150 cursor-pointer ${confirmButtonClass}`}
          >
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
