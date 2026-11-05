import { useMemo } from "react";
import {
  Dumbbell,
  Activity,
  Flame,
  Trophy,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Empty,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { dayOf, localDay, cn, fmtDate } from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";
import type { FitnessKind } from "@/lib/types";
import { chart } from "@/lib/chartTheme";

const kindMeta: Record<FitnessKind, { label: string; tone: string }> = {
  gym: { label: "Gym", tone: "cyan" },
  run: { label: "Run", tone: "emerald" },
  swim: { label: "Swim", tone: "violet" },
  mobility: { label: "Mobility", tone: "gold" },
  cross: { label: "Cross", tone: "rose" },
};

export default function Fitness() {
  const { sessions, prs, body, destroy } = useStore();
  const sessionModal = useEntityModal("sessions");
  const prModal = useEntityModal("prs");
  const bodyModal = useEntityModal("body");
  const sessionsPage = usePagination(sessions, 5);

  const last14 = useMemo(() => {
    const days: { date: string; load: number; mins: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const iso = localDay(d);
      const todays = sessions.filter((s) => dayOf(s.date) === iso);
      days.push({
        date: d.toLocaleDateString(undefined, { weekday: "short" }),
        load: todays.reduce((s, x) => s + (x.load || 0), 0),
        mins: todays.reduce((s, x) => s + x.duration, 0),
      });
    }
    return days;
  }, [sessions]);

  const bodyChart = useMemo(
    () =>
      [...body]
        // mood/energy-only check-ins have no weight — keep the line clean
        .filter((b) => typeof b.weight === "number")
        .sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)))
        .map((b) => ({
          date: new Date(b.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          weight: Math.round((b.weight as number) * 10) / 10,
          sleep: b.sleep,
        })),
    [body]
  );

  const weekSessions = sessions.slice(0, 7);
  const weekMins = weekSessions.reduce((s, x) => s + x.duration, 0);
  const weekLoad = weekSessions.reduce((s, x) => s + (x.load || 0), 0);

  /** Consecutive days up to today with at least one logged session. */
  const trainingStreak = useMemo(() => {
    const days = new Set(sessions.map((s) => dayOf(s.date)).filter(Boolean));
    let streak = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Today not being logged yet shouldn't break yesterday's streak.
    if (!days.has(dayOf(d.toISOString()))) d.setDate(d.getDate() - 1);
    while (days.has(dayOf(d.toISOString()))) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [sessions]);

  /** Every PR, newest first — weight records and time records alike. */
  const allPRs = useMemo(
    () => [...prs].sort((a, b) => dayOf(b.date).localeCompare(dayOf(a.date))),
    [prs]
  );
  const topLift = useMemo(
    () =>
      prs
        .filter((p) => typeof p.weight === "number" && p.weight > 0)
        .sort((a, b) => (b.weight || 0) - (a.weight || 0))[0],
    [prs]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Training · Recovery"
        title="Fitness Dashboard"
        subtitle="Run. Swim. Lift. Recover. The body is your operating substrate."
        action={
          <div className="flex items-center gap-2">
            <AddButton label="Session" onClick={sessionModal.openAdd} />
            <AddButton label="Metric" onClick={bodyModal.openAdd} />
          </div>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Week Volume"
          value={`${weekMins}m`}
          hint={`${weekSessions.length} sessions`}
          tone="cyan"
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label="Tonnage"
          value={`${Math.round(weekLoad / 1000)}t`}
          hint="this week"
          tone="gold"
          icon={<Dumbbell className="w-4 h-4" />}
        />
        <StatCard
          label="Top Lift"
          value={topLift ? `${topLift.weight}kg` : "—"}
          hint={topLift ? `${topLift.lift} × ${topLift.reps}` : "No PR yet"}
          tone="emerald"
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatCard
          label="Current Streak"
          value={`${trainingStreak}d`}
          hint={trainingStreak > 0 ? "keep it alive" : "train today"}
          tone="rose"
          icon={<Flame className="w-4 h-4" />}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Last 14 days · volume"
            subtitle="Minutes trained per day"
          />
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={last14}>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={chart.axis}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke={chart.axis} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    labelStyle={chart.tooltipLabel}
                  />
                  <Bar dataKey="mins" radius={[4, 4, 0, 0]}>
                    {last14.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.mins > 0 ? chart.action : chart.muted}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Strength PRs"
            subtitle="Your current bests"
            action={<AddButton label="PR" onClick={prModal.openAdd} />}
          />
          <CardBody className="space-y-3">
            {allPRs.length === 0 && (
              <Empty
                icon={<Trophy className="w-6 h-6" />}
                title="No records yet"
                hint="Add a lift (100kg × 5) or a time (5K run — 28:00)."
              />
            )}
            {allPRs.map((p) => (
              <div
                key={p.id}
                className="group flex items-center justify-between p-3 rounded-lg bg-ink-800/50 border border-ink-700"
              >
                <button onClick={() => prModal.openEdit(p)} className="text-left">
                  <div className="text-xs uppercase tracking-wider text-ink-300 font-medium">
                    {p.lift}
                  </div>
                  <div className="font-mono text-2xl text-ink-50 mt-1">
                    {p.time ? (
                      p.time
                    ) : (
                      <>
                        {p.weight}
                        <span className="text-sm text-ink-300"> kg × {p.reps}</span>
                      </>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono text-ink-400">
                    {fmtDate(p.date)}
                  </div>
                  <CrudActions
                    onEdit={() => prModal.openEdit(p)}
                    onDelete={() => destroy("prs", p.id)}
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Bodyweight trend"
            subtitle="Daily kg · last 14 days"
          />
          <CardBody>
            <div className="h-44">
              <ResponsiveContainer>
                <AreaChart data={bodyChart}>
                  <defs>
                    <linearGradient id="bw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chart.action} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={chart.action} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke={chart.axis}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={chart.axis}
                    fontSize={11}
                    tickLine={false}
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
                  />
                  <Tooltip
                    contentStyle={chart.tooltip}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke={chart.action}
                    strokeWidth={2}
                    fill="url(#bw)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent sessions"
            subtitle="Last training entries"
            action={<AddButton label="Session" onClick={sessionModal.openAdd} />}
          />
          <CardBody>
            <div className="space-y-2">
              {sessionsPage.slice.map((s) => {
                const meta = kindMeta[s.kind];
                return (
                  <div
                    key={s.id}
                    className="group flex items-center gap-3 p-3 rounded-lg bg-ink-800/40 border border-ink-700"
                  >
                    <Badge tone={meta.tone as "cyan"}>{meta.label}</Badge>
                    <button
                      onClick={() => sessionModal.openEdit(s)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm text-ink-50 truncate">
                        {s.notes || `${meta.label} session`}
                      </div>
                      <div className="text-[11px] text-ink-300 mt-0.5">
                        {fmtDate(s.date)} · {s.duration}m · RPE {s.rpe ?? "—"}
                      </div>
                    </button>
                    <div className="text-xs font-mono text-ink-200">
                      {s.load
                        ? s.kind === "run" || s.kind === "swim"
                          ? `${s.load} km`
                          : `${(s.load / 1000).toFixed(1)} t`
                        : ""}
                    </div>
                    <CrudActions
                      onDelete={() => destroy("sessions", s.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                );
              })}
            </div>
            <Pagination
              page={sessionsPage.page}
              totalPages={sessionsPage.totalPages}
              setPage={sessionsPage.setPage}
              total={sessions.length}
            />
          </CardBody>
        </Card>
      </div>

      {sessionModal.node}
      {prModal.node}
      {bodyModal.node}
    </div>
  );
}
