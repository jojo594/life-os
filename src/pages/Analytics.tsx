import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  StatCard,
} from "@/components/ui";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { useStore } from "@/lib/store";
import { dayOf, localDay, dateOnly } from "@/lib/utils";
import { chart } from "@/lib/chartTheme";

export default function Analytics() {
  const {
    tasks,
    habits,
    sessions,
    langSessions,
    trades,
    skills,
    courses,
    applications,
    content,
    leads,
    revenue,
  } = useStore();

  // 30-day execution heatmap data
  const heat = useMemo(() => {
    const days: { date: string; intensity: number; label: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const iso = localDay(d);
      let count = 0;
      habits.forEach((h) => {
        if (h.log.some((l) => l.slice(0, 10) === iso)) count++;
      });
      sessions
        .filter((s) => dayOf(s.date) === iso)
        .forEach(() => count++);
      langSessions
        .filter((s) => dayOf(s.date) === iso)
        .forEach(() => count++);
      tasks
        .filter((t) => t.done && t.updatedAt.slice(0, 10) === iso)
        .forEach(() => count++);
      days.push({
        date: iso,
        intensity: Math.min(count, 8),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
    return days;
  }, [habits, sessions, langSessions, tasks]);

  const totalActions = heat.reduce((s, d) => s + d.intensity, 0);

  // Life-balance radar — every score is DERIVED from live data (0–100).
  const radar = useMemo(() => {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    const last7 = Array.from({ length: 7 }, (_, i) => dateOnly(-i));
    const inWeek = (iso: string) => last7.includes(iso.slice(0, 10));

    const study = courses.length
      ? courses.reduce((s, c) => s + c.progress, 0) / courses.length
      : 0;
    const weekSessions = sessions.filter((s) => inWeek(s.date)).length;
    const fitness = (weekSessions / 5) * 100; // target 5 sessions / week
    const langMins = langSessions
      .filter((s) => inWeek(s.date))
      .reduce((a, s) => a + s.minutes, 0);
    const languages = (langMins / 140) * 100; // target ~20 min/day
    const liveLeads = leads.filter(
      (l) => l.stage !== "won" && l.stage !== "lost"
    ).length;
    const mtd = revenue
      .filter((r) => new Date(r.date).getMonth() === new Date().getMonth())
      .reduce((a, r) => a + r.amount, 0);
    const business = liveLeads * 10 + Math.min(60, mtd / 50);
    const posted = content.filter((c) => c.status === "posted").length;
    const pipeline = content.length - posted;
    const brand = posted * 18 + pipeline * 5;
    const interviews = applications.filter((a) =>
      ["interview", "offer", "accepted"].includes(a.stage)
    ).length;
    const liveApps = applications.filter(
      (a) => !["rejected", "accepted"].includes(a.stage)
    ).length;
    const career = interviews * 28 + liveApps * 8;
    const closed = trades.filter((t) => typeof t.pnl === "number");
    const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
    const winRate = closed.length ? wins / closed.length : 0;
    const finance = closed.length * 10 + winRate * 50;

    return [
      { area: "Study", score: clamp(study) },
      { area: "Business", score: clamp(business) },
      { area: "Career", score: clamp(career) },
      { area: "Fitness", score: clamp(fitness) },
      { area: "Languages", score: clamp(languages) },
      { area: "Finance", score: clamp(finance) },
      { area: "Brand", score: clamp(brand) },
    ];
  }, [courses, sessions, langSessions, leads, revenue, content, applications, trades]);

  const balanceAvg = Math.round(
    radar.reduce((s, r) => s + r.score, 0) / radar.length
  );

  // Weekly trend bars
  const weeklyTrend = useMemo(() => {
    const out: { week: string; mins: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const mins = sessions
        .filter((s) => {
          const d = new Date(s.date);
          return d >= start && d <= end;
        })
        .reduce((acc, s) => acc + s.duration, 0);
      out.push({
        week: `W${w === 0 ? "now" : `-${w}`}`,
        mins,
      });
    }
    return out;
  }, [sessions]);

  const heatColor = (n: number) => {
    if (n === 0) return "bg-ink-800";
    if (n <= 1) return "bg-cyan/20";
    if (n <= 3) return "bg-cyan/40";
    if (n <= 5) return "bg-cyan/60";
    return "bg-cyan";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cross-module · Truth"
        title="Analytics"
        subtitle="The whole machine in one view. Numbers don't lie."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="30d Actions" value={totalActions} tone="cyan" icon={<Sparkles className="w-4 h-4" />} />
        <StatCard label="Tasks Done" value={tasks.filter((t) => t.done).length} tone="emerald" />
        <StatCard label="Trades Closed" value={trades.filter((t) => typeof t.pnl === "number").length} tone="gold" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Skills Active" value={skills.filter((s) => s.status === "active").length} tone="violet" icon={<BarChart3 className="w-4 h-4" />} />
      </section>

      <Card>
        <CardHeader title="Execution heatmap · last 30 days" subtitle="Every dot is a habit, session, or completed task" />
        <CardBody>
          <div className="grid grid-cols-15 lg:grid-cols-30 gap-1">
            {heat.map((d) => (
              <div
                key={d.date}
                title={`${d.label} · ${d.intensity} actions`}
                className={`aspect-square rounded-sm ${heatColor(d.intensity)}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-ink-400">
            <span>less</span>
            <div className="w-3 h-3 bg-ink-800 rounded-sm" />
            <div className="w-3 h-3 bg-cyan/20 rounded-sm" />
            <div className="w-3 h-3 bg-cyan/40 rounded-sm" />
            <div className="w-3 h-3 bg-cyan/60 rounded-sm" />
            <div className="w-3 h-3 bg-cyan rounded-sm" />
            <span>more</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Life balance · radar"
            subtitle="Derived from your live data — not hardcoded"
            action={
              <div className="text-right">
                <div className="text-2xl font-mono font-semibold text-cyan leading-none">
                  {balanceAvg}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-ink-400">
                  balance
                </div>
              </div>
            }
          />
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={radar}>
                  <PolarGrid stroke={chart.grid} />
                  <PolarAngleAxis dataKey="area" stroke={chart.axisStrong} fontSize={11} />
                  <PolarRadiusAxis stroke={chart.grid} tick={false} angle={90} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    formatter={(v) => [`${v}/100`, "score"]}
                  />
                  <Radar
                    name="score"
                    dataKey="score"
                    stroke={chart.action}
                    fill={chart.action}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-ink-400 leading-relaxed mt-1">
              Study = avg course progress · Fitness = sessions this week ÷ 5 ·
              Languages = weekly minutes ÷ 140 · Business = live leads + MTD revenue ·
              Career = interviews + live apps · Finance = closed trades + win-rate ·
              Brand = posted + pipeline.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Training volume · last 8 weeks" subtitle="Minutes trained per week" />
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={weeklyTrend}>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="week" stroke={chart.axis} fontSize={11} tickLine={false} />
                  <YAxis stroke={chart.axis} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={chart.tooltip}
                  />
                  <Bar dataKey="mins" radius={[4, 4, 0, 0]}>
                    {weeklyTrend.map((_, i) => (
                      <Cell key={i} fill={i === weeklyTrend.length - 1 ? chart.positive : chart.action} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
