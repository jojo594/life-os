/**
 * Floating action bar that appears when bulk-selection > 0.
 *
 *   <BulkBar
 *     ctrl={ctrl}
 *     actions={[
 *       { label: "Mark applied", run: (ids) => ids.forEach(id => patch("applications", id, { stage: "applied" })) },
 *       { label: "Delete", tone: "danger", run: (ids) => ids.forEach(id => destroy("applications", id)) },
 *     ]}
 *   />
 */
import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ListController } from "@/lib/listControls";

export interface BulkAction {
  label: string;
  /** Confirm prompt before running. Useful for destructive actions. */
  confirm?: string;
  tone?: "default" | "danger";
  run: (ids: string[]) => void;
}

export function BulkBar<T extends { id: string }>({
  ctrl,
  actions,
  className,
}: {
  ctrl: ListController<T>;
  actions: BulkAction[];
  className?: string;
}) {
  const count = ctrl.selected.size;
  if (count === 0) return null;

  const ids = [...ctrl.selected];

  return (
    <div
      className={cn(
        "sticky bottom-3 z-10 mx-auto max-w-2xl",
        "flex items-center gap-2 px-3 py-2 rounded-xl border border-cyan/30 bg-ink-900/95 backdrop-blur shadow-2xl",
        className
      )}
    >
      <CheckSquare className="w-4 h-4 text-cyan shrink-0" />
      <div className="text-xs text-ink-100 font-medium shrink-0">
        <span className="font-mono text-cyan">{count}</span> selected
      </div>
      <div className="flex-1 min-w-0" />
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {actions.map((a) => (
          <Button
            key={a.label}
            size="sm"
            variant={a.tone === "danger" ? "ghost" : "secondary"}
            onClick={() => {
              if (a.confirm && !confirm(a.confirm.replace("{n}", String(count)))) return;
              a.run(ids);
              ctrl.clearSelection();
            }}
            className={cn(
              "!text-xs",
              a.tone === "danger" && "!text-rose hover:!bg-rose/15"
            )}
          >
            {a.label}
          </Button>
        ))}
        <button
          onClick={ctrl.clearSelection}
          className="w-7 h-7 rounded-md flex items-center justify-center text-ink-300 hover:bg-ink-800 hover:text-ink-50"
          aria-label="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Tiny checkbox primitive matched to the design system. Pair with
 * `ctrl.isSelected(id)` / `ctrl.toggleSelect(id)`.
 */
export function SelectCheckbox({
  checked,
  onChange,
  ariaLabel = "Select row",
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      aria-label={ariaLabel}
      aria-pressed={checked}
      className={cn(
        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
        checked
          ? "bg-cyan/20 border-cyan/60"
          : "border-ink-500 hover:border-cyan/40"
      )}
    >
      {checked && <span className="w-2 h-2 bg-cyan rounded-sm" />}
    </button>
  );
}
