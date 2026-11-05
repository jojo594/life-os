/**
 * Schema-driven form modal. One <EntityForm> renders create/edit forms for any
 * entity from a list of FieldDefs (see lib/forms.ts). Handles type conversion
 * (numbers, dates, tags, booleans) on submit so the store/API get clean values.
 */
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Pencil, Trash2, Plus } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ---------------- Field config ---------------- */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "range"
  | "select"
  | "multiselect"
  | "date"
  | "dateonly"
  | "tags"
  | "checkbox";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  numeric?: boolean; // for select whose value is a number
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  full?: boolean; // span both columns
  help?: string;
}

export interface EntitySchema {
  title: string;
  fields: FieldDef[];
}

type Values = Record<string, unknown>;

/* ---------------- Dialog shell ---------------- */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Esc to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* scrim */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* sheet (mobile) / modal (desktop) */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full sm:max-w-lg bg-ink-900 border border-ink-600 shadow-2xl",
          "rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col animate-fade-in"
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-ink-600/70">
          <div>
            <div className="text-base font-semibold text-ink-50">{title}</div>
            {subtitle && (
              <div className="text-xs text-ink-300 mt-0.5">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-ink-800 hover:text-ink-50 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="p-4 border-t border-ink-600/70 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ---------------- value helpers ---------------- */
const toInputValue = (field: FieldDef, raw: unknown): unknown => {
  if (raw === undefined || raw === null) {
    if (field.type === "tags") return "";
    if (field.type === "multiselect") return [];
    if (field.type === "checkbox") return false;
    return "";
  }
  if (field.type === "date") return String(raw).slice(0, 10); // ISO → yyyy-mm-dd
  if (field.type === "tags") return Array.isArray(raw) ? raw.join(", ") : String(raw);
  if (field.type === "multiselect") return Array.isArray(raw) ? raw : [];
  return raw;
};

const fromInputValue = (field: FieldDef, v: unknown): unknown => {
  switch (field.type) {
    case "number":
    case "money":
    case "range":
      return v === "" || v === null ? undefined : Number(v);
    case "select":
      if (v === "") return undefined;
      return field.numeric ? Number(v) : v;
    case "multiselect":
      return Array.isArray(v) ? v : [];
    case "checkbox":
      return Boolean(v);
    case "tags":
      return String(v || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    case "date":
      return v ? new Date(String(v)).toISOString() : undefined;
    case "dateonly":
      return v || undefined;
    default:
      return v === "" ? undefined : v;
  }
};

/* ---------------- the form ---------------- */
export function EntityForm({
  schema,
  initial,
  mode,
  onSubmit,
  onCancel,
  dynamicOptions,
}: {
  schema: EntitySchema;
  initial?: Values;
  mode: "add" | "edit";
  onSubmit: (values: Values) => void;
  onCancel: () => void;
  /** Runtime-provided options for FK selects, e.g. { courseId: [...] }. */
  dynamicOptions?: Record<string, { value: string; label: string }[]>;
}) {
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {};
    schema.fields.forEach((f) => {
      v[f.key] = toInputValue(f, initial?.[f.key]);
    });
    return v;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, val: unknown) => {
    setValues((s) => ({ ...s, [key]: val }));
    // Clear the complaint as soon as the field is touched.
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  const submit = () => {
    const out: Values = {};
    const missing: Record<string, string> = {};
    schema.fields.forEach((f) => {
      const converted = fromInputValue(f, values[f.key]);
      // A required field must actually carry a value — otherwise the server
      // rejects the write and the row silently disappears.
      if (f.required && (converted === undefined || converted === "")) {
        missing[f.key] = "Required";
        return;
      }
      if (converted !== undefined) out[f.key] = converted;
    });
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }
    onSubmit(out);
  };

  return (
    <Dialog
      open
      onClose={onCancel}
      title={`${mode === "add" ? "New" : "Edit"} ${schema.title}`}
      subtitle={mode === "add" ? "Fill what matters — leave the rest blank." : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            {mode === "add" ? "Create" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {schema.fields.map((f) => (
          <div
            key={f.key}
            className={cn(
              (f.full ||
                f.type === "textarea" ||
                f.type === "tags") &&
                "sm:col-span-2"
            )}
          >
            <label className="block text-xs font-medium text-ink-200 mb-1.5">
              {f.label}
              {f.required && <span className="text-rose ml-1">*</span>}
            </label>
            <FieldInput
              field={
                dynamicOptions?.[f.key]
                  ? { ...f, options: dynamicOptions[f.key] }
                  : f
              }
              value={values[f.key]}
              onChange={(v) => set(f.key, v)}
            />
            {errors[f.key] ? (
              <div className="text-[10px] text-rose mt-1">{errors[f.key]}</div>
            ) : (
              f.help && (
                <div className="text-[10px] text-ink-400 mt-1">{f.help}</div>
              )
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = (value ?? "") as string | number;

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          value={String(str)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <Select value={String(str)} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "checkbox":
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={cn(
            "h-9 px-3 rounded-lg border text-sm font-medium transition-colors w-full text-left",
            value
              ? "bg-emerald/10 border-emerald/40 text-emerald"
              : "bg-ink-800 border-ink-600 text-ink-300"
          )}
        >
          {value ? "Yes" : "No"}
        </button>
      );
    case "range": {
      const min = field.min ?? 1;
      const max = field.max ?? 5;
      const v = Number(value || min);
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={field.step ?? 1}
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-cyan"
          />
          <span className="font-mono text-sm text-ink-100 w-8 text-right">{v}</span>
        </div>
      );
    }
    case "number":
    case "money":
      return (
        <Input
          type="number"
          inputMode="decimal"
          value={String(str)}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
    case "dateonly":
      return (
        <Input
          type="date"
          value={String(str)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "tags":
      return (
        <Input
          value={String(str)}
          placeholder={field.placeholder || "comma, separated, tags"}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const options = field.options ?? [];
      if (options.length === 0) {
        return (
          <div className="text-xs text-ink-400 italic">
            Nothing else to pick yet.
          </div>
        );
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                onClick={() =>
                  onChange(
                    on
                      ? selected.filter((x) => x !== o.value)
                      : [...selected, o.value]
                  )
                }
                className={cn(
                  "px-2 h-7 rounded-lg border text-xs font-medium transition-colors",
                  on
                    ? "bg-cyan/15 text-cyan border-cyan/40"
                    : "bg-ink-800 text-ink-300 border-ink-600 hover:border-ink-500"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    default:
      return (
        <Input
          value={String(str)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/* ---------------- shared item action buttons ---------------- */
export function CrudActions({
  onEdit,
  onDelete,
  className,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-cyan transition-colors"
          aria-label="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete this item?")) onDelete();
          }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-ink-300 hover:bg-rose/15 hover:text-rose transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---------------- "Add" button ---------------- */
export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="primary" size="md" onClick={onClick}>
      <Plus className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}
