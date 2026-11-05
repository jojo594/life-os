import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Flame,
  Target,
  Trophy,
  ArrowRight,
  Plus,
  Check,
  Clock,
  Sparkles,
  Wallet,
  Dumbbell,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Empty,
  Progress,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import {
  cn,
  dayOf,
  dateOnly,
  daysUntil,
  deriveGoalProgress,
  fmtDate,
  fmtMoney,
  priorityColor,
  computeStreak,
} from "@/lib/utils";
import { StaleStrip } from "@/components/StaleStrip";
import { BriefCard } from "@/components/BriefCard";
import { useListControls, opts } from "@/lib/listControls";
import { ListToolbar } from "@/components/ListToolbar";
import { BulkBar, SelectCheckbox } from "@/components/BulkBar";
import { Pagination, usePagination } from "@/components/Pagination";

const TASK_MODULES = [
  "home", "university", "business", "career", "skills",
  "fitness", "languages", "finance", "brand", "reading", "journal", "roadmap",
] as const;
const TASK_PRIORITIES = ["p0", "p1", "p2", "p3"] as const;
const TASK_STATUSES = [
  "backlog", "planned", "in_progress", "blocked", "done", "archived",
] as const;

/* --- Helpers --- */
const last7 = () => Array.from({ length: 7 }, (_, i) => dateOnly(-6 + i));

export default function Home() {
  const {
    tasks,
    habits,
    goals,
    sessions,
    revenue,
    leads,
    exams,
    toggleTaskDone,
    toggleHabit,
    destroy,
    patch,
  } = useStore();
  const goalOptions = useMemo(
    () =>
      goals
        .filter((g) => g.status !== "archived" && g.status !== "done")
        .map((g) => ({ value: g.id, label: g.title })),
    [goals]
  );
  const taskModal = useEntityModal("tasks", { linkedGoalId: goalOptions });
  const habitModal = useEntityModal("habits");
  const goalModal = useEntityModal("goals");

  // Auto-purge done tasks older than 30 days (uses updatedAt as completion proxy).
  useEffect(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    tasks
      .filter((t) => t.done && new Date(t.updatedAt).getTime() < cutoff)
      .forEach((t) => destroy("tasks", t.id));
  }, [tasks, destroy]);

  const today = dateOnly();

  // Base set for the "Today's priorities" card: open, on-deck (due ≤ today or no due).
  // The controller layers free-text + filters + sort + selection on top of this set.
  const todayBase = useMemo(
    () =>
      tasks.filter(
        (t) => !t.done && (!t.due || dayOf(t.due) <= today)
      ),
    [tasks, today]
  );
  const doneTasksBase = useMemo(() => tasks.filter((t) => t.done), [tasks]);

  const todayCtrl = useListControls(todayBase, {
    storageKey: "tasks-today",
    text: (t) => `${t.title} ${t.description ?? ""} ${(t.tags ?? []).join(" ")}`,
    filters: {
      module: { label: "Area", options: opts(TASK_MODULES), get: (t) => t.module },
      priority: { label: "Priority", options: opts(TASK_PRIORITIES), get: (t) => t.priority },
      status: { label: "Status", options: opts(TASK_STATUSES), get: (t) => t.status },
    },
    sorts: {
      priority: {
        label: "Priority",
        compare: (a, b) =>
          TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority),
      },
      due: {
        label: "Due (soonest)",
        compare: (a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"),
      },
      recent: {
        label: "Recently updated",
        compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      },
      estimate: {
        label: "Estimate (short→long)",
        compare: (a, b) => (a.estimateMin ?? 0) - (b.estimateMin ?? 0),
      },
    },
    defaultSort: "priority",
  });

  const doneCtrl = useListControls(doneTasksBase, {
    storageKey: "tasks-done",
    text: (t) => `${t.title} ${t.description ?? ""} ${(t.tags ?? []).join(" ")}`,
    filters: {
      module: { label: "Area", options: opts(TASK_MODULES), get: (t) => t.module },
      priority: { label: "Priority", options: opts(TASK_PRIORITIES), get: (t) => t.priority },
    },
    sorts: {
      finished: {
        label: "Finished (newest)",
        compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      },
      priority: {
        label: "Priority",
        compare: (a, b) =>
          TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority),
      },
      title: {
        label: "Title A→Z",
        compare: (a, b) => a.title.localeCompare(b.title),
      },
    },
    defaultSort: "finished",
  });

  const todayTasks = todayCtrl.filtered;
  const doneTasks = doneCtrl.filtered;
  const todayPage = usePagination(todayTasks, 5);
  const donePage = usePagination(doneTasks, 5);

  const overdue = tasks.filter(
    (t) => !t.done && t.due && dayOf(t.due) < today
  ).length;

  // Open goals = not done/archived (so a "planned" goal still surfaces here).
  const activeGoals = goals.filter(
    (g) => g.status !== "done" && g.status !== "archived"
  );
  const totalProgress =
    activeGoals.reduce((s, g) => s + g.progress, 0) /
    Math.max(1, activeGoals.length);

  const weekSessions = sessions.filter((s) =>
    last7().includes(dayOf(s.date))
  );
  const weekMinutes = weekSessions.reduce((s, x) => s + x.duration, 0);

  const monthRev = revenue
    .filter(
      (r) => new Date(r.date).getMonth() === new Date().getMonth()
    )
    .reduce((s, x) => s + x.amount, 0);

  const liveLeads = leads.filter(
    (l) => l.stage !== "won" && l.stage !== "lost"
  ).length;

  const nextExam = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];

  const habitDays = last7();

  return (
    <div className="space-y-8">
      {/* AI BRIEF ------------------------------------------------- */}
      <BriefCard />

      {/* HERO ---------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl border border-ink-600/70 surface">
        {/* One hairline of champagne along the top edge — the only ornament. */}
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent pointer-events-none" />

        <div className="relative p-6 md:p-8">
          <div className="max-w-3xl">
            <div className="eyebrow flex items-center gap-2">
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-cyan" />
              Command Center · Live
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Good {greeting()}.
              <br />
              <span className="text-ink-200 font-normal text-2xl md:text-3xl">
                Today is a vote for who you become.
              </span>
            </h1>
            <p className="mt-3 text-sm text-ink-300 max-w-xl">
              {activeGoals.length} active goals · {todayTasks.length} priorities
              on deck · {weekSessions.length} sessions logged this week.
              {nextExam && (
                <>
                  {" "}
                  Next exam in{" "}
                  <span className="text-gold font-mono">
                    {daysUntil(nextExam.date)}d
                  </span>
                  .
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/roadmap">
                <Button variant="primary" size="md">
                  Open Roadmap <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link to="/journal">
                <Button variant="secondary" size="md">
                  <Plus className="w-3.5 h-3.5" /> Daily check-in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* KPI STRIP ------------------------------------------------ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Goals"
          value={activeGoals.length}
          hint={`avg ${Math.round(totalProgress)}% progress`}
          tone="cyan"
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Tasks Today"
          value={todayTasks.length}
          delta={
            overdue
              ? { value: `${overdue} overdue`, positive: false }
              : undefined
          }
          hint="ready to execute"
          tone="gold"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Week Training"
          value={`${weekMinutes}m`}
          hint={`${weekSessions.length} sessions logged`}
          tone="emerald"
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label="MTD Revenue"
          value={fmtMoney(monthRev)}
          hint={`${liveLeads} live leads`}
          tone="violet"
          icon={<Wallet className="w-4 h-4" />}
        />
      </section>

      {/* STALE STRIP --------------------------------------------- */}
      <StaleStrip thresholdDays={14} />

      {/* MAIN GRID ----------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's priorities */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's priorities"
            subtitle="Top of mind. Strike them clean."
            action={
              <div className="flex items-center gap-2">
                {overdue > 0 && <Badge tone="rose">{overdue} overdue</Badge>}
                <AddButton label="Task" onClick={taskModal.openAdd} />
              </div>
            }
          />
          <CardBody className="space-y-1.5">
            <ListToolbar ctrl={todayCtrl} />
            {todayTasks.length === 0 && (
              <Empty title="All clear" hint="Plan tomorrow or rest with intent." />
            )}
            {todayPage.slice.map((t) => (
              <div
                key={t.id}
                className="w-full flex items-center gap-3 p-3 -mx-2 rounded-lg hover:bg-ink-800/60 transition-colors group"
              >
                <SelectCheckbox
                  checked={todayCtrl.isSelected(t.id)}
                  onChange={() => todayCtrl.toggleSelect(t.id)}
                />
                <button
                  onClick={() => toggleTaskDone(t.id)}
                  aria-label="Toggle done"
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                    t.done
                      ? "bg-emerald/20 border-emerald/40"
                      : "border-ink-500 group-hover:border-cyan/60"
                  )}
                >
                  {t.done && <Check className="w-3 h-3 text-emerald" />}
                </button>
                <button
                  onClick={() => taskModal.openEdit(t)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-ink-50 truncate">{t.title}</div>
                  <div className="text-xs text-ink-300 mt-0.5 flex items-center gap-2">
                    <Badge tone="neutral" className="capitalize">
                      {t.module}
                    </Badge>
                    {t.due && <span>· {fmtDate(t.due)}</span>}
                    {t.estimateMin && <span>· {t.estimateMin}m</span>}
                  </div>
                </button>
                <Badge className={cn("border", priorityColor[t.priority])}>
                  {t.priority.toUpperCase()}
                </Badge>
                <CrudActions
                  onEdit={() => taskModal.openEdit(t)}
                  onDelete={() => destroy("tasks", t.id)}
                  className="opacity-0 group-hover:opacity-100"
                />
              </div>
            ))}
            <Pagination
              page={todayPage.page}
              totalPages={todayPage.totalPages}
              setPage={todayPage.setPage}
              total={todayTasks.length}
            />
            <BulkBar
              ctrl={todayCtrl}
              actions={[
                {
                  label: "Mark done",
                  run: (ids) =>
                    ids.forEach((id) => patch("tasks", id, { done: true, status: "done" })),
                },
                {
                  label: "→ P0",
                  run: (ids) => ids.forEach((id) => patch("tasks", id, { priority: "p0" })),
                },
                {
                  label: "→ P1",
                  run: (ids) => ids.forEach((id) => patch("tasks", id, { priority: "p1" })),
                },
                {
                  label: "Archive",
                  run: (ids) => ids.forEach((id) => patch("tasks", id, { status: "archived" })),
                },
                {
                  label: "Delete",
                  tone: "danger",
                  confirm: "Delete {n} task(s)?",
                  run: (ids) => ids.forEach((id) => destroy("tasks", id)),
                },
              ]}
            />
          </CardBody>
        </Card>

        {/* Active goals */}
        <Card>
          <CardHeader
            title="Active goals"
            subtitle="Quarter / year horizon"
            action={
              <Link to="/roadmap">
                <Button size="sm" variant="ghost">
                  All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            }
          />
          <CardBody className="space-y-4">
            {activeGoals.slice(0, 5).map((g) => {
              const { pct, isAuto, linkedTotal, linkedDone } = deriveGoalProgress(g, tasks);
              return (
                <div key={g.id} className="group">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <button
                      onClick={() => goalModal.openEdit(g)}
                      className="min-w-0 text-left flex-1"
                    >
                      <div className="text-sm text-ink-50 truncate font-medium">
                        {g.title}
                      </div>
                      <div className="text-[11px] text-ink-300 mt-0.5">
                        {g.module} · {g.horizon} · {fmtDate(g.deadline)}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono text-ink-100">
                        {pct}%
                      </span>
                      {isAuto && (
                        <span
                          title="Progress is derived from linked tasks"
                          className="text-[9px] font-mono px-1 rounded bg-emerald/15 text-emerald border border-emerald/30"
                        >
                          AUTO
                        </span>
                      )}
                      <CrudActions
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
                  {linkedTotal > 0 && (
                    <div className="mt-1.5 text-[10px] font-mono text-ink-400 flex items-center justify-between">
                      <span>tasks {linkedDone}/{linkedTotal}</span>
                      {!isAuto && (
                        <span className="text-ink-500">
                          manual · auto would be {Math.round((linkedDone / linkedTotal) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>
      </section>

      {/* DONE TASKS ---------------------------------------------- */}
      <section>
        <Card>
          <CardHeader
            title="Done"
            subtitle={`${doneTasks.length} completed · auto-clears after 30 days`}
            action={
              <Badge tone="emerald">
                <Check className="w-3 h-3" />
                {doneTasks.length}
              </Badge>
            }
          />
          <CardBody className="space-y-1.5">
            <ListToolbar ctrl={doneCtrl} />
            {doneTasks.length === 0 && (
              <Empty title="Nothing finished yet" hint="Tick a priority above — it lands here." />
            )}
            {donePage.slice.map((t) => (
              <div
                key={t.id}
                className="w-full flex items-center gap-3 p-2.5 -mx-2 rounded-lg hover:bg-ink-800/60 transition-colors group"
              >
                <SelectCheckbox
                  checked={doneCtrl.isSelected(t.id)}
                  onChange={() => doneCtrl.toggleSelect(t.id)}
                />
                <button
                  onClick={() => toggleTaskDone(t.id)}
                  aria-label="Mark not done"
                  className="w-5 h-5 rounded-md bg-emerald/20 border border-emerald/40 flex items-center justify-center shrink-0"
                >
                  <Check className="w-3 h-3 text-emerald" />
                </button>
                <button
                  onClick={() => taskModal.openEdit(t)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-ink-300 line-through truncate">
                    {t.title}
                  </div>
                  <div className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-2">
                    <Badge tone="neutral" className="capitalize">
                      {t.module}
                    </Badge>
                    <span>· done {fmtDate(t.updatedAt)}</span>
                  </div>
                </button>
                <CrudActions
                  onDelete={() => destroy("tasks", t.id)}
                  className="opacity-0 group-hover:opacity-100"
                />
              </div>
            ))}
            <Pagination
              page={donePage.page}
              totalPages={donePage.totalPages}
              setPage={donePage.setPage}
              total={doneTasks.length}
            />
            <BulkBar
              ctrl={doneCtrl}
              actions={[
                {
                  label: "Reopen",
                  run: (ids) =>
                    ids.forEach((id) =>
                      patch("tasks", id, { done: false, status: "in_progress" })
                    ),
                },
                {
                  label: "Delete",
                  tone: "danger",
                  confirm: "Delete {n} task(s)?",
                  run: (ids) => ids.forEach((id) => destroy("tasks", id)),
                },
              ]}
            />
          </CardBody>
        </Card>
      </section>

      {/* HABITS + QUICK PANELS ----------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Habits this week"
            subtitle="Tap a cell to log it. Streak = identity."
            action={
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-gold" />
                <AddButton label="Habit" onClick={habitModal.openAdd} />
              </div>
            }
          />
          <CardBody>
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-ink-400">
                    <th className="text-left font-medium pb-2">Habit</th>
                    {habitDays.map((d) => (
                      <th
                        key={d}
                        className="text-center font-medium pb-2 w-9"
                      >
                        {new Date(d).toLocaleDateString(undefined, {
                          weekday: "narrow",
                        })}
                      </th>
                    ))}
                    <th className="text-right font-medium pb-2 pl-3">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.slice(0, 6).map((h) => (
                    <tr key={h.id} className="border-t border-ink-700/60 group">
                      <td className="py-2 pr-2 text-sm text-ink-100 max-w-[200px]">
                        <button
                          onClick={() => habitModal.openEdit(h)}
                          className="text-left truncate hover:text-cyan w-full"
                        >
                          {h.name}
                        </button>
                      </td>
                      {habitDays.map((d) => {
                        const has = h.log.some((l) => l.slice(0, 10) === d);
                        return (
                          <td key={d} className="py-2">
                            <button
                              onClick={() => toggleHabit(h.id, d)}
                              className={cn(
                                "w-7 h-7 rounded-md mx-auto flex items-center justify-center transition-all",
                                has
                                  ? "bg-emerald/20 border border-emerald/40 text-emerald"
                                  : "bg-ink-800 border border-ink-700 text-ink-500 hover:border-ink-500"
                              )}
                              title={d}
                            >
                              {has && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-sm text-gold">
                            {computeStreak(h.log)}d
                          </span>
                          <CrudActions
                            onDelete={() => destroy("habits", h.id)}
                            className="opacity-0 group-hover:opacity-100"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Daily reminders"
            subtitle="Small things that add up"
            action={<Sparkles className="w-4 h-4 text-gold" />}
          />
          <CardBody>
            <div className="space-y-2.5 text-sm">
              {[
                {
                  k: "Build",
                  v: "Make progress on one real thing.",
                  i: <GraduationCap className="w-3.5 h-3.5" />,
                  tone: "cyan" as const,
                },
                {
                  k: "Connect",
                  v: "Talk to one person about your work.",
                  i: <Briefcase className="w-3.5 h-3.5" />,
                  tone: "violet" as const,
                },
                {
                  k: "Move",
                  v: "Get some exercise.",
                  i: <Dumbbell className="w-3.5 h-3.5" />,
                  tone: "emerald" as const,
                },
                {
                  k: "Learn",
                  v: "Practice something new.",
                  i: <Trophy className="w-3.5 h-3.5" />,
                  tone: "gold" as const,
                },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-ink-800/50 border border-ink-700"
                >
                  <Badge tone={row.tone}>
                    {row.i}
                    {row.k}
                  </Badge>
                  <span className="text-ink-200 text-xs">{row.v}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>

      {/* QUICK NAV ----------------------------------------------- */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { to: "/university", label: "Study Block", icon: GraduationCap },
          { to: "/fitness", label: "Log Training", icon: Dumbbell },
          { to: "/business", label: "Outreach", icon: Briefcase },
          { to: "/languages", label: "Language Practice", icon: Target },
          { to: "/journal", label: "Reflect", icon: Activity },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex items-center gap-3 p-4 surface rounded-xl hover:border-ink-500 hover:bg-ink-850 transition-all"
          >
            <span className="w-9 h-9 rounded-lg bg-ink-800 group-hover:bg-cyan/10 group-hover:text-cyan flex items-center justify-center text-ink-200 transition-all">
              <q.icon className="w-4 h-4" />
            </span>
            <span className="text-sm text-ink-100 font-medium">{q.label}</span>
          </Link>
        ))}
      </section>

      {taskModal.node}
      {habitModal.node}
      {goalModal.node}
    </div>
  );

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "early start";
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
  }
}
