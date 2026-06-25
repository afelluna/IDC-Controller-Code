import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowDownToLine, Shield, Hand, LogOut, X } from 'lucide-react';
import { getIntensityMessage } from '../../constants';

interface AlertPopupProps {
  open: boolean;
  /** Peak PEIS level reached during this event (shown in the headline). */
  level: number;
  /** Manual dismiss; the hook ignores it before MIN_VISIBLE_MS has elapsed. */
  onDismiss: () => void;
}

/**
 * Compact, distance-legible earthquake alert for the public kiosk monitor.
 * Delivers PHIVOLCS protective-action instructions ("Duck, Cover, and Hold")
 * the moment shaking crosses the configured alert level, then clears itself.
 *
 * Visibility/lifecycle is owned by useThresholdAlert — this component is purely
 * presentational and only fires onDismiss for the manual button / Esc key.
 */

const ACTIONS: { icon: typeof ArrowDownToLine; title: string; text: string }[] = [
  {
    icon: ArrowDownToLine,
    title: 'Drop',
    text: 'Get onto your hands and knees before the shaking knocks you down.',
  },
  {
    icon: Shield,
    title: 'Cover',
    text: 'Shield your head and neck under a sturdy table — or against an interior wall, away from windows and glass.',
  },
  {
    icon: Hand,
    title: 'Hold on',
    text: 'Hold your shelter until the shaking stops, ready to move with it.',
  },
];

export function AlertPopup({ open, level, onDismiss }: AlertPopupProps) {
  // Esc dismisses (the hook enforces the minimum-visible guard).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  const msg = getIntensityMessage(level);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="eq-alert-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-live="assertive"
          aria-label="Earthquake protective action alert"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className="relative w-full max-w-sm max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}
            initial={{ scale: 0.9, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="shrink-0"
              >
                <AlertTriangle size={30} strokeWidth={2.5} />
              </motion.div>
              <div className="flex-1 min-w-0 leading-tight">
                <h1 className="text-lg font-extrabold uppercase">
                  Earthquake — Take Cover
                </h1>
                <p className="text-[11px] font-medium opacity-90">
                  PEIS {level} · {msg.title}
                </p>
              </div>
            </div>

            {/* Three protective actions — compact rows */}
            <div className="px-4 pt-3 pb-1 flex flex-col gap-2.5">
              {ACTIONS.map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="flex items-start gap-2.5">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-[12.5px] leading-snug" style={{ color: '#334155' }}>
                    <span className="inline-flex items-center gap-1 font-extrabold uppercase tracking-wide" style={{ color: '#0f172a' }}>
                      <Icon size={14} strokeWidth={2.5} style={{ color: '#dc2626' }} />
                      {title}
                    </span>{' '}
                    — {text}
                  </p>
                </div>
              ))}
            </div>

            {/* After-shaking guidance */}
            <div className="px-4 pt-2 pb-3">
              <div
                className="rounded-lg px-3 py-2 flex items-start gap-2"
                style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
              >
                <LogOut size={15} style={{ color: '#ea580c' }} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                <p className="text-[11.5px] leading-snug" style={{ color: '#7c2d12' }}>
                  <span className="font-bold uppercase">After shaking: </span>
                  evacuate calmly via the <span className="font-bold">stairs (never elevators)</span> to the open assembly area. Watch for aftershocks.
                </p>
              </div>
            </div>

            {/* Footer — auto-clear note + manual dismiss */}
            <div
              className="px-4 py-2.5 flex items-center justify-between gap-3"
              style={{ borderTop: '1px solid #f1f5f9' }}
            >
              <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                Clears automatically when shaking subsides
              </span>
              <button
                onClick={onDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
              >
                <X size={14} /> Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AlertPopup;
