/**
 * Bottom-anchored toast stack for sync feedback. aria-live so screen readers
 * announce saves/failures. Error toasts persist (with a Retry action); success
 * and info auto-dismiss (handled in the store).
 */
import { createPortal } from "react-dom";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const meta = {
  success: { icon: CheckCircle2, tone: "text-emerald border-emerald/40" },
  error: { icon: AlertTriangle, tone: "text-rose border-rose/40" },
  info: { icon: Info, tone: "text-cyan border-cyan/40" },
} as const;

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  return createPortal(
    <div
      aria-live="polite"
      className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] ml-auto flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const m = meta[t.kind];
        const Icon = m.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto surface rounded-xl border shadow-glow p-3 flex items-start gap-3 animate-fade-in",
              m.tone
            )}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink-50 leading-snug">{t.message}</div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.run();
                    dismissToast(t.id);
                  }}
                  className="mt-1.5 text-xs font-medium text-cyan hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="w-6 h-6 -mr-1 -mt-1 rounded-md flex items-center justify-center text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
