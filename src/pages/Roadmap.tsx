import { useMemo, useState } from "react";
import { Target, Trophy, AlertTriangle, Calendar, Check, Plus } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Progress,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions, Dialog } from "@/components/form";
import {
  daysUntil,
  deriveGoalProgress,
  fmtDate,
  cn,
  priorityColor,
  statusColor,
  statusLabel,
} from "@/lib/utils";
import type { Goal } from "@/lib/types";
import { Pagination, usePagination } from "@/components/Pagination";
import { useListControls, opts } from "@/lib/listControls";
import { ListToolbar } from "@/components/ListToolbar";
import { BulkBar, SelectCheckbox } from "@/components/BulkBar";

const GOAL_HORIZONS = ["year", "quarter", "month", "week"] as const;
const GOAL_PRIORITIES = ["p0", "p1", "p2", "p3"] as const;
// "Open" = everything except done/archived. These all show in the Active goals list.
const GOAL_STATUSES = ["backlog", "planned", "in_progress", "blocked"] as const;
const GOAL_MODULES = [
  "home", "university", "business", "career", "skills",
  "fitness", "languages", "finance", "brand", "reading", "journal", "roadmap",
] as const;

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function Roadmap() {
  const { goals, tasks, toggleTaskDone, destroy, patch } = useStore();
  const goalModal = useEntityModal("goals");
  const goalOptions = useMemo(
    () =>
      goals
        .filter((g) => g.status !== "archived" && g.status !== "done")
        .map((g) => ({ value: g.id, label: g.title })),
    [goals]
  );
  const taskModal = useEntityModal("tasks", { linkedGoalId: goalOptions });
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const tasksByGoal = useMemo(() => {
    const m: Record<string, typeof tasks> = {};
    tasks.forEach((t) => {
      if (!t.linkedGoalId) return;
      (m[t.linkedGoalId] = m[t.linkedGoalId] || []).push(t);
    });
    return m;
  }, [tasks]);
  // Show every open goal — not just in_progress. A "planned" goal with a deadline
  // should still appear here (otherwise it silently hides until you flip it).
  const active = goals.filter(
    (g) => g.status !== "done" && g.status !== "archived"
  );

  const activeCtrl = useListControls(active, {
    storageKey: "goals-active",
    text: (g) => `${g.title} ${g.description ?? ""} ${g.tags.join(" ")}`,
    filters: {
      status: { label: "Status", options: opts(GOAL_STATUSES), get: (g) => g.status },
      priority: { label: "Priority", options: opts(GOAL_PRIORITIES), get: (g) => g.priority },
      horizon: { label: "Horizon", options: opts(GOAL_HORIZONS), get: (g) => g.horizon },
      module: { label: "Area", options: opts(GOAL_MODULES), get: (g) => g.module },
    },
    sorts: {
      priority: {
        label: "Priority",
        compare: (a, b) =>
          GOAL_PRIORITIES.indexOf(a.priority) - GOAL_PRIORITIES.indexOf(b.priority),
      },
      deadline: {
        label: "Deadline (soonest)",
        compare: (a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"),
      },
      progress: {
        label: "Progress (high→low)",
        compare: (a, b) => b.progress - a.progress,
      },
      recent: {
        label: "Recently updated",
        compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      },
    },
    defaultSort: "priority",
  });

  const activePage = usePagination(activeCtrl.filtered, 5);
  const done = goals.filter((g) => g.status === "done");
  const overdue = goals.filter(
    (g) =>
      g.status !== "done" &&
      g.deadline &&
      new Date(g.deadline) < new Date()
  ).length;
  // Use the derived value so auto-progress goals are reflected in the strip's "Avg Progress".
  const avg =
    active.reduce((s, g) => s + deriveGoalProgress(g, tasks).pct, 0) /
    Math.max(1, active.length);

  // Group goals by month (deadline month)
  const byMonth = useMemo(() => {
    const m: Record<string, Goal[]> = {};
    goals.forEach((g) => {
      if (!g.deadline) return;
      const key = months[new Date(g.deadline).getMonth()];
      m[key] = m[key] || [];
      m[key].push(g);
    });
    return m;
  }, [goals]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Year · Quarter · Month · Week"
        title="Master Roadmap"
        subtitle="One view from today to your future self. Year goals → quarter pushes → weekly execution."
        action={<AddButton label="Goal" onClick={goalModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Goals"
          value={active.length}
          tone="cyan"
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Progress"
          value={`${Math.round(avg)}%`}
          tone="gold"
        />
        <StatCard
          label="Completed"
          value={done.length}
          tone="emerald"
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatCard
          label="Overdue"
          value={overdue}
          tone="rose"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </section>

      {/* Goals list */}
      <Card>
        <CardHeader
          title="Active goals"
          subtitle="Every open goal — sorted by priority and deadline"
        />
        <CardBody className="space-y-4">
          <ListToolbar ctrl={activeCtrl} />
          {activePage.slice.map((g) => {
            const d = daysUntil(g.deadline);
            const { pct, isAuto } = deriveGoalProgress(g, tasks);
            return (
              <div
                key={g.id}
                className="group p-4 rounded-lg bg-ink-800/40 border border-ink-700"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <SelectCheckbox
                    checked={activeCtrl.isSelected(g.id)}
                    onChange={() => activeCtrl.toggleSelect(g.id)}
                  />
                  <button
                    onClick={() => goalModal.openEdit(g)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-base font-medium text-ink-50">
                      {g.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                      <Badge className={priorityColor[g.priority]}>
                        {g.priority.toUpperCase()}
                      </Badge>
                      <Badge tone="neutral" className="capitalize">
                        {g.module}
                      </Badge>
                      <Badge tone="neutral" className="capitalize">
                        {g.horizon}
                      </Badge>
                      {g.deadline && (
                        <span className="text-ink-300">
                          {fmtDate(g.deadline)} ·{" "}
                          <span
                            className={cn(
                              "font-mono",
                              d !== null && d < 14 ? "text-rose" : "text-ink-200"
                            )}
                          >
                            {d}d
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn(
                      "text-2xl font-mono font-semibold",
                      isAuto ? "text-emerald" : "text-cyan"
                    )}>
                      {pct}%
                    </div>
                    {isAuto && (
                      <span
                        title="Auto-derived from tasks done in this area"
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald/15 text-emerald border border-emerald/30"
                      >
                        AUTO
                      </span>
                    )}
                    <CrudActions
                      onEdit={() => goalModal.openEdit(g)}
                      onDelete={() => destroy("goals", g.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <Progress
                  value={pct}
                  tone={
                    isAuto
                      ? "emerald"
                      : g.priority === "p0"
                        ? "rose"
                        : g.priority === "p1"
                          ? "gold"
                          : "cyan"
                  }
                />
                {(() => {
                  const linked = tasksByGoal[g.id] ?? [];
                  const linkedDone = linked.filter((t) => t.done).length;
                  return (
                    <div className="mt-3 rounded-md border border-ink-700/60 bg-ink-900/40 p-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-300 mb-1.5">
                        <span className="uppercase tracking-wider">Linked tasks</span>
                        <div className="flex items-center gap-2">
                          {linked.length > 0 && (
                            <span>
                              {linkedDone}/{linked.length} ·{" "}
                              <span className="text-emerald">
                                {Math.round((linkedDone / linked.length) * 100)}%
                              </span>
                            </span>
                          )}
                          <button
                            onClick={() => taskModal.openAdd({ linkedGoalId: g.id, module: g.module })}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-ink-700 hover:border-cyan/40 hover:text-cyan text-[10px]"
                            title="Add a task linked to this goal"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Task
                          </button>
                        </div>
                      </div>
                      {linked.length === 0 ? (
                        <div className="text-[11px] text-ink-500 italic">
                          No tasks linked yet. Add one — ticking it will move this goal's progress.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {linked.slice(0, 6).map((t) => (
                            <div
                              key={t.id}
                              className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-ink-800/60 group/task"
                            >
                              <button
                                onClick={() => toggleTaskDone(t.id)}
                                aria-label={t.done ? "Mark not done" : "Mark done"}
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                  t.done
                                    ? "bg-emerald/20 border-emerald/40"
                                    : "border-ink-500 group-hover/task:border-cyan/60"
                                )}
                              >
                                {t.done && <Check className="w-2.5 h-2.5 text-emerald" />}
                              </button>
                              <button
                                onClick={() => taskModal.openEdit(t)}
                                className={cn(
                                  "text-xs truncate flex-1 text-left hover:text-cyan transition-colors",
                                  t.done ? "text-ink-400 line-through" : "text-ink-100"
                                )}
                                title="Edit task"
                              >
                                {t.title}
                              </button>
                              <CrudActions
                                onEdit={() => taskModal.openEdit(t)}
                                onDelete={() => destroy("tasks", t.id)}
                                className="opacity-0 group-hover/task:opacity-100 transition-opacity"
                              />
                            </div>
                          ))}
                          {linked.length > 6 && (
                            <div className="text-[10px] text-ink-400 pl-6">
                              +{linked.length - 6} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {g.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-ink-300 font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Pagination
            page={activePage.page}
            totalPages={activePage.totalPages}
            setPage={activePage.setPage}
            total={activeCtrl.filtered.length}
          />
          <BulkBar
            ctrl={activeCtrl}
            actions={[
              {
                label: "Mark done",
                run: (ids) => ids.forEach((id) => patch("goals", id, { status: "done", progress: 100 })),
              },
              {
                label: "Archive",
                run: (ids) => ids.forEach((id) => patch("goals", id, { status: "archived" })),
              },
              {
                label: "Delete",
                tone: "danger",
                confirm: "Delete {n} goal(s)?",
                run: (ids) => ids.forEach((id) => destroy("goals", id)),
              },
            ]}
          />
        </CardBody>
      </Card>

      {/* Timeline by month */}
      <Card>
        <CardHeader
          title="Year timeline"
          subtitle="Deadlines mapped across the year"
          action={<Calendar className="w-4 h-4 text-ink-300" />}
        />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {months.map((m) => {
              const list = byMonth[m] || [];
              const isCurrent =
                new Date().getMonth() === months.indexOf(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setOpenMonth(m)}
                  className={cn(
                    "text-left rounded-lg border bg-ink-850/60 p-3 min-h-[120px] transition-all",
                    "hover:bg-ink-800 hover:border-cyan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
                    isCurrent
                      ? "border-cyan/40 shadow-glow-cyan"
                      : "border-ink-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-mono font-semibold tracking-widest uppercase text-ink-100">
                      {m}
                    </div>
                    {isCurrent ? (
                      <Badge tone="cyan" className="text-[9px]">
                        NOW
                      </Badge>
                    ) : list.length > 0 ? (
                      <span className="text-[10px] font-mono text-ink-400">
                        {list.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    {list.slice(0, 4).map((g) => (
                      <div
                        key={g.id}
                        className="text-[11px] text-ink-200 truncate"
                        title={g.title}
                      >
                        <span
                          className={cn(
                            "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                            g.priority === "p0"
                              ? "bg-rose"
                              : g.priority === "p1"
                                ? "bg-gold"
                                : "bg-cyan"
                          )}
                        />
                        {g.title}
                      </div>
                    ))}
                    {list.length > 4 && (
                      <div className="text-[10px] text-ink-400 font-mono">
                        +{list.length - 4} more
                      </div>
                    )}
                    {list.length === 0 && (
                      <div className="text-[10px] text-ink-500">—</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {goalModal.node}
      {taskModal.node}

      <Dialog
        open={openMonth !== null}
        onClose={() => setOpenMonth(null)}
        title={openMonth ? `${openMonth} — deadlines` : ""}
        subtitle={
          openMonth
            ? `${(byMonth[openMonth] || []).length} goal(s) due this month`
            : undefined
        }
      >
        <div className="space-y-2">
          {openMonth && (byMonth[openMonth] || []).length === 0 && (
            <div className="text-xs text-ink-400 py-6 text-center">
              No goals scheduled for {openMonth}.
            </div>
          )}
          {openMonth &&
            (byMonth[openMonth] || [])
              .slice()
              .sort((a, b) =>
                (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")
              )
              .map((g) => {
                const { pct, isAuto } = deriveGoalProgress(g, tasks);
                const d = daysUntil(g.deadline);
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setOpenMonth(null);
                      goalModal.openEdit(g);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-ink-800/50 border border-ink-700 hover:border-cyan/40 hover:bg-ink-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink-50 truncate">
                          {g.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                          <Badge className={priorityColor[g.priority]}>
                            {g.priority.toUpperCase()}
                          </Badge>
                          <Badge tone="neutral" className="capitalize">
                            {g.module}
                          </Badge>
                          <Badge tone="neutral" className="capitalize">
                            {g.horizon}
                          </Badge>
                          <Badge tone="neutral" className={statusColor[g.status]}>
                            {statusLabel[g.status]}
                          </Badge>
                          {g.deadline && (
                            <span className="text-ink-300">
                              {fmtDate(g.deadline)}
                              {d !== null && (
                                <span
                                  className={cn(
                                    "ml-1 font-mono",
                                    d < 0
                                      ? "text-rose"
                                      : d < 14
                                        ? "text-gold"
                                        : "text-ink-300"
                                  )}
                                >
                                  · {d}d
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "text-sm font-mono font-semibold",
                            isAuto ? "text-emerald" : "text-cyan"
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    {g.description && (
                      <div className="mt-2 text-[11px] text-ink-300 line-clamp-2">
                        {g.description}
                      </div>
                    )}
                    <div className="mt-2">
                      <Progress
                        value={pct}
                        tone={
                          isAuto
                            ? "emerald"
                            : g.priority === "p0"
                              ? "rose"
                              : g.priority === "p1"
                                ? "gold"
                                : "cyan"
                        }
                      />
                    </div>
                  </button>
                );
              })}
        </div>
      </Dialog>
    </div>
  );
}
