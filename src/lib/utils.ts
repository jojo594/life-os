import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const fmtDateLong = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const fmtNumber = (n: number, digits = 0) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtMoney = (n: number, currency = "EUR") =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

/**
 * Day part (YYYY-MM-DD) of an ISO string, tolerant of missing values —
 * a row with no date must never crash the page that renders it.
 */
export const dayOf = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : "");

export const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/**
 * YYYY-MM-DD for a Date in the *local* timezone. Never use toISOString() for
 * this: it converts to UTC, so east of Greenwich local midnight becomes the
 * previous day and every "today" is off by one.
 */
export const localDay = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const dateOnly = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return localDay(d);
};

export const priorityColor: Record<string, string> = {
  p0: "text-rose bg-rose/10 border-rose/30",
  p1: "text-gold bg-gold/10 border-gold/30",
  p2: "text-cyan bg-cyan/10 border-cyan/30",
  p3: "text-ink-200 bg-ink-700 border-ink-500",
};

export const statusColor: Record<string, string> = {
  backlog: "text-ink-200 bg-ink-700 border-ink-500",
  planned: "text-cyan bg-cyan/10 border-cyan/30",
  in_progress: "text-gold bg-gold/10 border-gold/30",
  blocked: "text-rose bg-rose/10 border-rose/30",
  done: "text-emerald bg-emerald/10 border-emerald/30",
  archived: "text-ink-300 bg-ink-800 border-ink-600",
};

export const statusLabel: Record<string, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

/** Pretty key for any enum-ish value. */
export const titleCase = (s: string) =>
  s
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Compute a habit's current streak from its log of completion dates.
 * Rule: walk backwards from today (or yesterday, so an unlogged-yet today
 * doesn't kill the streak) and count consecutive logged days. The streak is
 * broken the moment a day in that chain is missing — and treated as 0 if
 * neither today nor yesterday is in the log.
 */
export const computeStreak = (log: string[] | undefined | null): number => {
  if (!log || log.length === 0) return 0;
  const days = new Set(log.map((d) => d.slice(0, 10)));
  const today = dateOnly();
  const yesterday = dateOnly(-1);
  let cursor: string;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else return 0;
  let count = 0;
  while (days.has(cursor)) {
    count++;
    const prev = new Date(cursor + "T00:00:00");
    prev.setDate(prev.getDate() - 1);
    cursor = localDay(prev);
  }
  return count;
};

/**
 * Auto-derived progress for a goal.
 *
 * Returns the linked-task counts and the canonical percentage value:
 *   - If `goal.autoProgress` is on AND linked tasks exist: pct = round(done / total * 100).
 *   - Otherwise: pct = goal.progress (manual).
 *
 * `linked` are tasks explicitly attached to this goal via `linkedGoalId`. A task only
 * counts toward a goal when the user opts in from the task form — module match alone
 * no longer pulls a task in.
 */
export function deriveGoalProgress<
  G extends { id: string; progress: number; autoProgress?: boolean },
  T extends { linkedGoalId?: string | null; done?: boolean }
>(goal: G, tasks: T[]): {
  pct: number;
  isAuto: boolean;
  linkedTotal: number;
  linkedDone: number;
} {
  const linked = tasks.filter((t) => t.linkedGoalId === goal.id);
  const linkedTotal = linked.length;
  const linkedDone = linked.filter((t) => t.done).length;
  const canAuto = !!goal.autoProgress && linkedTotal > 0;
  const pct = canAuto
    ? Math.round((linkedDone / linkedTotal) * 100)
    : goal.progress;
  return { pct, isAuto: canAuto, linkedTotal, linkedDone };
}
