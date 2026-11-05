import { useMemo, useState } from "react";
import { TrendingUp, Trophy, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useStore } from "@/lib/store";
import { cn, fmtMoney } from "@/lib/utils";
import { chart } from "@/lib/chartTheme";

export default function Finance() {
  const { trades, destroy } = useStore();
  const tradeModal = useEntityModal("trades");

  // Calendar state — month being shown + optional day for the inline detail strip.
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0–11
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Aggregate trade P&L + count per day across ALL trades so month navigation
  // is cheap and the heatmap is always accurate.
  const byDay = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    for (const t of trades) {
      const k = (t.date || "").slice(0, 10);
      if (!k) continue;
      const cur = map.get(k) || { pnl: 0, count: 0 };
      cur.pnl += typeof t.pnl === "number" ? t.pnl : 0;
      cur.count += 1;
      map.set(k, cur);
    }
    return map;
  }, [trades]);

  // Optional DB fields come back as null (not undefined). A trade is "closed"
  // only when pnl is an actual number; everything else (null/undefined) is live.
  const closed = trades.filter((t) => typeof t.pnl === "number");
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = closed.filter((t) => (t.pnl || 0) > 0).length;
  const winRate = closed.length ? ((wins / closed.length) * 100).toFixed(0) : "0";
  const live = trades.length - closed.length;

  const equity = useMemo(() => {
    const sorted = [...closed].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let acc = 0;
    return sorted.map((t) => {
      acc += t.pnl || 0;
      return {
        date: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        equity: acc,
        trade: t.symbol,
      };
    });
  }, [closed]);

  // When a day cell is clicked, expose that day's trades for inline edit/delete.
  const dayTrades = useMemo(
    () => (selectedDay ? trades.filter((t) => (t.date || "").slice(0, 10) === selectedDay) : []),
    [trades, selectedDay]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Trades · Journal · Performance"
        title="Finance / Trading"
        subtitle="Journal every trade, watch the equity curve. Risk is the only language the market understands."
        action={<AddButton label="Trade" onClick={tradeModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={fmtMoney(totalPnl, "USD")}
          tone={totalPnl >= 0 ? "emerald" : "rose"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard label="Win Rate" value={`${winRate}%`} tone="gold" icon={<Trophy className="w-4 h-4" />} />
        <StatCard label="Closed Trades" value={closed.length} tone="cyan" />
        <StatCard label="Live Positions" value={live} hint="open exposure" tone="violet" icon={<AlertTriangle className="w-4 h-4" />} />
      </section>

      <TradeCalendar
        year={calYear}
        month={calMonth}
        byDay={byDay}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onPrev={() => {
          const m = calMonth - 1;
          if (m < 0) { setCalMonth(11); setCalYear(calYear - 1); } else { setCalMonth(m); }
        }}
        onNext={() => {
          const m = calMonth + 1;
          if (m > 11) { setCalMonth(0); setCalYear(calYear + 1); } else { setCalMonth(m); }
        }}
        onToday={() => {
          setCalYear(today.getFullYear());
          setCalMonth(today.getMonth());
        }}
      />

      {/* Inline detail for the clicked day — appears only on selection. */}
      {selectedDay && dayTrades.length > 0 && (
        <Card>
          <CardHeader
            title={`Trades on ${selectedDay}`}
            subtitle={`${dayTrades.length} trade${dayTrades.length > 1 ? "s" : ""} · click a row to edit`}
            action={
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[11px] font-mono text-cyan hover:underline"
              >
                close
              </button>
            }
          />
          <CardBody>
            <div className="space-y-1.5">
              {dayTrades.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 px-3 py-2 rounded-md bg-ink-800/40 border border-ink-700 hover:bg-ink-800/70 transition-colors"
                >
                  <span className="font-mono text-ink-50 font-medium w-20 shrink-0">{t.symbol}</span>
                  <Badge tone={t.side === "long" ? "emerald" : "rose"}>{t.side}</Badge>
                  <span className="text-xs text-ink-300 truncate flex-1">{t.strategy}</span>
                  <span
                    className={cn(
                      "font-mono text-sm shrink-0",
                      (t.pnl || 0) > 0 ? "text-emerald" : (t.pnl || 0) < 0 ? "text-rose" : "text-ink-300"
                    )}
                  >
                    {typeof t.pnl === "number" ? (t.pnl > 0 ? "+" : "") + t.pnl.toFixed(0) : "live"}
                  </span>
                  <CrudActions
                    onEdit={() => tradeModal.openEdit(t)}
                    onDelete={() => destroy("trades", t.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100"
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Equity curve" subtitle="Cumulative P&L from closed trades" />
        <CardBody>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={equity}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="date" stroke={chart.axis} fontSize={11} tickLine={false} />
                <YAxis stroke={chart.axis} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={chart.tooltip}
                />
                <ReferenceLine y={0} stroke={chart.grid} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke={chart.positive}
                  strokeWidth={2.5}
                  dot={{ fill: chart.positive, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {tradeModal.node}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * TradeCalendar — month grid heatmap of daily P&L (TradeZella-style).
 * Each cell shows day number, total $ P&L, and trade count, tinted by sign.
 * Click a day to surface that day's trades inline above.
 * ------------------------------------------------------------------------ */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Compact money formatter: $1.41K, -$520, $98.3. */
const shortMoney = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2).replace(/\.?0+$/, "")}K`;
  if (abs >= 100) return `${sign}$${Math.round(abs)}`;
  return `${sign}$${abs.toFixed(1)}`;
};

interface TradeCalendarProps {
  year: number;
  month: number; // 0-11
  byDay: Map<string, { pnl: number; count: number }>;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const TradeCalendar = ({
  year, month, byDay, selectedDay, onSelectDay, onPrev, onNext, onToday,
}: TradeCalendarProps) => {
  // Build the grid: 6 rows × 7 cols, padded with leading blanks so day 1 sits
  // under its weekday. We deliberately stop at the last day of the month —
  // trailing cells stay blank, and fully-empty trailing rows get dropped.
  const firstDayWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ day: number; key: string } | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      key: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length > 7 && cells.slice(-7).every((c) => c === null)) cells.length -= 7;

  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onToday}
            className="text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-md border border-ink-600 text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink-300 hover:bg-ink-800 hover:text-ink-50 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink-300 hover:bg-ink-800 hover:text-ink-50 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-base font-semibold text-ink-50 ml-1">
            {MONTH_NAMES[month]} {year}
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-[11px] uppercase tracking-wider text-ink-300 font-medium text-center py-2 rounded-md border border-ink-700/60 bg-ink-900/40"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-2">
          {cells.map((c, i) => {
            if (!c) {
              return <div key={`blank-${i}`} className="aspect-[1.4/1] rounded-lg" />;
            }
            const agg = byDay.get(c.key);
            const hasTrades = !!agg && agg.count > 0;
            const positive = hasTrades && agg!.pnl > 0;
            const negative = hasTrades && agg!.pnl < 0;
            const isToday = c.key === todayKey;
            const isSelected = c.key === selectedDay;

            return (
              <button
                key={c.key}
                onClick={() => onSelectDay(isSelected ? null : c.key)}
                disabled={!hasTrades}
                className={cn(
                  "aspect-[1.4/1] rounded-lg border p-2 flex flex-col text-left transition-colors",
                  positive && "bg-emerald/10 border-emerald/40 hover:bg-emerald/15",
                  negative && "bg-rose/10 border-rose/40 hover:bg-rose/15",
                  !hasTrades && "bg-ink-900/30 border-ink-700/60 cursor-default",
                  isSelected && "ring-2 ring-cyan ring-offset-2 ring-offset-ink-950",
                  isToday && !isSelected && "ring-1 ring-ink-500"
                )}
              >
                <div className={cn(
                  "text-xs font-mono self-end",
                  hasTrades ? "text-ink-100" : "text-ink-400"
                )}>
                  {c.day}
                </div>
                {hasTrades && (
                  <div className="mt-auto">
                    <div className={cn(
                      "text-sm font-semibold font-mono",
                      positive && "text-emerald",
                      negative && "text-rose"
                    )}>
                      {shortMoney(agg!.pnl)}
                    </div>
                    <div className="text-[10px] text-ink-300 font-mono">
                      {agg!.count} trade{agg!.count > 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
};
