/**
 * Shared UI primitives. Hand-rolled in shadcn style so the project has zero
 * CLI dependencies. Each primitive is small, composable, and dark-mode native.
 */

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/* ---------- CARD ---------- */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "surface rounded-2xl animate-fade-in",
        "shadow-[0_8px_30px_-12px_rgb(0_0_0/var(--shadow-alpha))]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = ({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-start justify-between gap-4 p-6 pb-3",
      className
    )}
  >
    <div>
      <div className="text-[15px] font-medium text-ink-50 leading-tight tracking-tight">
        {title}
      </div>
      {subtitle && (
        <div className="font-serif italic text-[12px] text-ink-300 mt-1">
          {subtitle}
        </div>
      )}
    </div>
    {action}
  </div>
);

export const CardBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-2", className)} {...props} />
);

/* ---------- BUTTON ---------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan text-ink-950 border border-cyan hover:bg-cyan/90 shadow-[0_1px_0_0_rgb(255_255_255/0.2)_inset]",
  secondary:
    "bg-ink-800 text-ink-50 border border-ink-600 hover:bg-ink-700 hover:border-ink-500",
  ghost:
    "bg-transparent text-ink-200 hover:text-ink-50 hover:bg-ink-800/60",
  danger:
    "bg-rose/10 text-rose border border-rose/25 hover:bg-rose/20",
  gold: "bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3 text-sm gap-2",
  lg: "h-11 px-4 text-sm gap-2",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(({ className, variant = "secondary", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
      "disabled:opacity-50 disabled:pointer-events-none",
      buttonVariants[variant],
      buttonSizes[size],
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

/* ---------- BADGE ---------- */
export const Badge = ({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: "cyan" | "gold" | "emerald" | "rose" | "violet" | "neutral";
}) => {
  const tones = {
    cyan: "text-cyan bg-cyan/8 border-cyan/20",
    gold: "text-gold bg-gold/8 border-gold/20",
    emerald: "text-emerald bg-emerald/8 border-emerald/20",
    rose: "text-rose bg-rose/8 border-rose/20",
    violet: "text-violet bg-violet/8 border-violet/20",
    neutral: "text-ink-200 bg-ink-700/50 border-ink-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
        tone ? tones[tone] : tones.neutral,
        className
      )}
    >
      {children}
    </span>
  );
};

/* ---------- PROGRESS ---------- */
export const Progress = ({
  value,
  max = 100,
  tone = "cyan",
  className,
  showValue = false,
}: {
  value: number;
  max?: number;
  tone?: "cyan" | "gold" | "emerald" | "rose" | "violet";
  className?: string;
  showValue?: boolean;
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tones = {
    cyan: "bg-cyan",
    gold: "bg-gold",
    emerald: "bg-emerald",
    rose: "bg-rose",
    violet: "bg-violet",
  };
  return (
    <div className={cn("w-full", className)}>
      <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            tones[tone]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <div className="text-[10px] text-ink-300 mt-1 font-mono">
          {Math.round(pct)}%
        </div>
      )}
    </div>
  );
};

/* ---------- INPUT ---------- */
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg bg-ink-800 border border-ink-600 px-3 text-sm text-ink-50 placeholder:text-ink-400",
      "focus:outline-none focus:border-cyan/60 focus:ring-1 focus:ring-cyan/40 transition-colors",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-sm text-ink-50 placeholder:text-ink-400",
      "focus:outline-none focus:border-cyan/60 focus:ring-1 focus:ring-cyan/40 transition-colors",
      "min-h-[80px] resize-y",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg bg-ink-800 border border-ink-600 px-3 text-sm text-ink-50 appearance-none",
      "focus:outline-none focus:border-cyan/60 focus:ring-1 focus:ring-cyan/40 transition-colors",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/* ---------- STAT CARD ---------- */
export const StatCard = ({
  label,
  value,
  delta,
  hint,
  tone = "cyan",
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  tone?: "cyan" | "gold" | "emerald" | "rose" | "violet";
  icon?: ReactNode;
}) => {
  const accent = {
    cyan: "text-cyan",
    gold: "text-gold",
    emerald: "text-emerald",
    rose: "text-rose",
    violet: "text-violet",
  };
  return (
    <div className="surface rounded-2xl p-5 relative overflow-hidden shadow-[0_8px_30px_-12px_rgb(0_0_0/var(--shadow-alpha))] animate-fade-in">
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">{label}</span>
          {icon && (
            <span className={cn("opacity-70", accent[tone])}>
              {icon}
            </span>
          )}
        </div>
        <div className="text-[32px] font-extralight tabular-nums text-ink-50 leading-none tracking-[-0.03em]">
          {value}
        </div>
        <div className="flex items-center justify-between mt-3 gap-2">
          {hint && <span className="text-xs text-ink-300">{hint}</span>}
          {delta && (
            <span
              className={cn(
                "text-xs font-mono font-medium ml-auto",
                delta.positive ? "text-emerald" : "text-rose"
              )}
            >
              {delta.positive ? "▲" : "▼"} {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- SECTION HEADER ---------- */
export const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div>
      {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
      <h2 className="text-lg font-medium text-ink-50 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <div className="font-serif italic text-sm text-ink-300 mt-1">
          {subtitle}
        </div>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/* ---------- PAGE HEADER ---------- */
export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
      <h1 className="text-[28px] md:text-[34px] font-light text-ink-50 tracking-[-0.02em] leading-[1.1]">
        {title}
      </h1>
      {subtitle && (
        <p className="font-serif italic text-[15px] text-ink-300 mt-3 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);

/* ---------- EMPTY ---------- */
export const Empty = ({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) => (
  <div className="text-center py-10 px-6">
    {icon && (
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-ink-800 text-ink-300 mb-3">
        {icon}
      </div>
    )}
    <div className="text-sm text-ink-100 font-medium">{title}</div>
    {hint && <div className="text-xs text-ink-300 mt-1">{hint}</div>}
  </div>
);

/* ---------- DIVIDER ---------- */
export const Divider = ({ className }: { className?: string }) => (
  <div className={cn("hairline", className)} />
);

/* ---------- KBD ---------- */
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-ink-600 bg-ink-800 text-[10px] font-mono text-ink-200">
    {children}
  </kbd>
);
