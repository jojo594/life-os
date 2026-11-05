import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
} from "lucide-react";
import {
  Badge,
  Button,
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
import { dayOf, cn, daysUntil, fmtDateLong, titleCase } from "@/lib/utils";
import type { CalendarEvent, EventKind } from "@/lib/types";

type Tone = "cyan" | "gold" | "emerald" | "rose" | "violet" | "neutral";

const KIND_TONE: Record<EventKind, Tone> = {
  milestone: "gold",
  deadline: "rose",
  meeting: "cyan",
  travel: "violet",
  personal: "emerald",
  reminder: "neutral",
};

/** Dot colour per source, so a day cell reads at a glance. */
const DOT: Record<string, string> = {
  milestone: "bg-gold",
  deadline: "bg-rose",
  meeting: "bg-cyan",
  travel: "bg-violet",
  personal: "bg-emerald",
  reminder: "bg-ink-200",
  task: "bg-cyan",
  goal: "bg-gold",
  exam: "bg-rose",
  assignment: "bg-violet",
};

/** Badge tone for items that come from other modules, matching DOT. */
const SOURCE_TONE: Record<Exclude<DayItem["source"], "event">, Tone> = {
  task: "cyan",
  goal: "gold",
  exam: "rose",
  assignment: "violet",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local YYYY-MM-DD — never use toISOString() here, it shifts by timezone. */
const dayKey = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const keyOf = (iso?: string) => (iso ? dayKey(new Date(iso)) : undefined);

/** Monday-first grid of 6 weeks covering the given month. */
const monthGrid = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Mon = 0
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

/** Anything dated in Life OS, normalised for one day cell. */
interface DayItem {
  id: string;
  kind: string;
  title: string;
  time?: string;
  location?: string;
  notes?: string;
  source: "event" | "task" | "goal" | "exam" | "assignment";
  raw?: CalendarEvent;
}

export default function Calendar() {
  const { events, tasks, goals, exams, assignments, courses, deleteEvent } =
    useStore();
  const eventModal = useEntityModal("events");

  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState<string>(dayKey(today));

  const cells = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  /** day key → everything happening that day, from every module. */
  const byDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (key: string | undefined, item: DayItem) => {
      if (!key) return;
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    };

    for (const e of events) {
      const start = keyOf(e.date);
      if (!start) continue;
      const item: DayItem = {
        id: e.id,
        kind: e.kind,
        title: e.title,
        time: e.time,
        location: e.location,
        notes: e.notes,
        source: "event",
        raw: e,
      };
      push(start, item);
      // Multi-day: repeat the entry on each day it spans.
      if (e.endDate) {
        const d = new Date(e.date);
        const end = new Date(e.endDate);
        d.setDate(d.getDate() + 1);
        while (d <= end) {
          push(dayKey(d), { ...item, id: `${e.id}:${dayKey(d)}` });
          d.setDate(d.getDate() + 1);
        }
      }
    }

    for (const t of tasks) {
      if (!t.due || t.done || t.status === "done") continue;
      push(keyOf(t.due), {
        id: t.id,
        kind: "task",
        title: t.title,
        source: "task",
      });
    }
    for (const g of goals) {
      if (!g.deadline || g.status === "done") continue;
      push(keyOf(g.deadline), {
        id: g.id,
        kind: "goal",
        title: `${g.title} — deadline`,
        source: "goal",
      });
    }
    for (const x of exams) {
      const course = courses.find((c) => c.id === x.courseId);
      push(keyOf(x.date), {
        id: x.id,
        kind: "exam",
        title: `Exam${course ? ` · ${course.name}` : ""}`,
        source: "exam",
      });
    }
    for (const a of assignments) {
      if (a.status === "done") continue;
      push(keyOf(a.due), {
        id: a.id,
        kind: "assignment",
        title: `${a.title} — due`,
        source: "assignment",
      });
    }

    for (const list of map.values()) {
      list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    }
    return map;
  }, [events, tasks, goals, exams, assignments, courses]);

  const todayKey = dayKey(today);

  /**
   * Everything dated from today on, from every module — not just events.
   * Multi-day events appear once, on the first day still ahead (so a trip
   * that's already under way shows as "Today").
   */
  const upcomingAll = useMemo(() => {
    const seen = new Set<string>();
    const out: (DayItem & { day: string })[] = [];
    for (const day of [...byDay.keys()].filter((k) => k >= todayKey).sort()) {
      for (const it of byDay.get(day)!) {
        const baseId = it.id.split(":")[0];
        if (seen.has(baseId)) continue;
        seen.add(baseId);
        out.push({ ...it, day });
      }
    }
    return out;
  }, [byDay, todayKey]);
  const upcoming = upcomingAll.slice(0, 6);

  const selectedItems = byDay.get(selected) ?? [];
  const monthLabel = cursor.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const monthPrefix = dayKey(cursor).slice(0, 7);
  const thisMonthCount = new Set(
    [...byDay.entries()]
      .filter(([k]) => k.startsWith(monthPrefix))
      .flatMap(([, list]) => list.map((it) => it.id.split(":")[0]))
  ).size;
  const next = upcoming[0];

  const shift = (months: number) =>
    setCursor(
      (c) => new Date(c.getFullYear(), c.getMonth() + months, 1)
    );
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(todayKey);
  };

  /** Open the add form with the clicked day pre-filled. */
  const addOn = (key: string) => eventModal.openAdd({ date: key });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plan · Remember · Show up"
        title="Calendar"
        subtitle="Every dated thing in one place — write it down, then see it coming."
        action={<AddButton label="Event" onClick={() => addOn(selected)} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="This month" value={thisMonthCount} tone="cyan" icon={<CalendarDays className="w-4 h-4" />} />
        <StatCard label="Upcoming" value={upcomingAll.length} tone="gold" icon={<Clock className="w-4 h-4" />} />
        <StatCard
          tone="violet"
          label="Next up"
          value={next ? next.title : "—"}
          hint={next ? fmtDateLong(next.day) : "Nothing scheduled"}
        />
        <StatCard
          tone="emerald"
          label="On this day"
          value={selectedItems.length}
          hint={fmtDateLong(selected)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ---------- Month grid ---------- */}
        <Card className="xl:col-span-2">
          <CardHeader
            title={monthLabel}
            action={
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Previous month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToday}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Next month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-[11px] uppercase tracking-wider text-ink-300 text-center py-1"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d) => {
                const key = dayKey(d);
                const items = byDay.get(key) ?? [];
                const otherMonth = d.getMonth() !== cursor.getMonth();
                const isToday = key === todayKey;
                const isSelected = key === selected;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    onDoubleClick={() => addOn(key)}
                    className={cn(
                      "relative aspect-square sm:aspect-[4/3] rounded-lg border p-1.5 text-left transition-colors",
                      "flex flex-col gap-1 overflow-hidden",
                      otherMonth
                        ? "border-transparent text-ink-400"
                        : "border-ink-600/60 hover:border-cyan/40",
                      isSelected && "border-cyan bg-cyan/10",
                      isToday && !isSelected && "border-gold/60"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isToday && "text-gold",
                        !otherMonth && !isToday && "text-ink-100"
                      )}
                    >
                      {d.getDate()}
                    </span>

                    {/* Titles on wide screens, dots on phones. */}
                    <span className="hidden sm:flex flex-col gap-0.5 min-w-0">
                      {items.slice(0, 2).map((it) => (
                        <span
                          key={it.id}
                          className="flex items-center gap-1 min-w-0"
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              DOT[it.kind] ?? "bg-ink-200"
                            )}
                          />
                          <span className="truncate text-[10px] text-ink-200">
                            {it.title}
                          </span>
                        </span>
                      ))}
                      {items.length > 2 && (
                        <span className="text-[10px] text-ink-300">
                          +{items.length - 2} more
                        </span>
                      )}
                    </span>
                    <span className="flex sm:hidden gap-0.5 flex-wrap">
                      {items.slice(0, 4).map((it) => (
                        <span
                          key={it.id}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            DOT[it.kind] ?? "bg-ink-200"
                          )}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-ink-300">
              Tap a day to see it. Double-click a day to add an event on it.
            </p>
          </CardBody>
        </Card>

        {/* ---------- Selected day + upcoming ---------- */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={fmtDateLong(selected)}
              subtitle={
                selected === todayKey ? "Today" : `${daysUntil(selected)} days from today`
              }
              action={
                <Button variant="ghost" size="sm" onClick={() => addOn(selected)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              }
            />
            <CardBody className="space-y-2">
              {selectedItems.length === 0 ? (
                <Empty
                  icon={<CalendarDays className="w-6 h-6" />}
                  title="Nothing on this day"
                  hint="Add the things you must not forget — exams, trips, deadlines."
                />
              ) : (
                selectedItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-start gap-2 rounded-lg border border-ink-600/60 p-2.5"
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        DOT[it.kind] ?? "bg-ink-200"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-100 break-words">{it.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          tone={
                            it.source === "event"
                              ? KIND_TONE[it.kind as EventKind] ?? "neutral"
                              : "neutral"
                          }
                        >
                          {titleCase(it.kind)}
                        </Badge>
                        {it.time && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-ink-300">
                            <Clock className="w-3 h-3" />
                            {it.time}
                          </span>
                        )}
                        {it.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-ink-300">
                            <MapPin className="w-3 h-3" />
                            {it.location}
                          </span>
                        )}
                      </div>
                      {it.notes && (
                        <p className="text-[11px] text-ink-300 mt-1 break-words">
                          {it.notes}
                        </p>
                      )}
                    </div>
                    {it.raw && (
                      <CrudActions
                        onEdit={() => eventModal.openEdit(it.raw!)}
                        onDelete={() => deleteEvent(it.raw!.id)}
                      />
                    )}
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Coming up" subtitle="Next six dated items — events, tasks, goals, exams" />
            <CardBody className="space-y-2">
              {upcoming.length === 0 ? (
                <Empty
                  icon={<Clock className="w-6 h-6" />}
                  title="Nothing scheduled"
                  hint="Add your next deadline or trip."
                />
              ) : (
                upcoming.map((e) => {
                  const left = daysUntil(e.day) ?? 0;
                  const tone =
                    e.source === "event"
                      ? KIND_TONE[e.kind as EventKind] ?? "neutral"
                      : SOURCE_TONE[e.source];
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        const [y, m] = e.day.split("-").map(Number);
                        setCursor(new Date(y, m - 1, 1));
                        setSelected(e.day);
                      }}
                      className="w-full flex items-center gap-3 rounded-lg border border-ink-600/60 p-2.5 text-left hover:border-cyan/40 transition-colors"
                    >
                      <Badge tone={tone}>
                        {left === 0 ? "Today" : `${left}d`}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-100 truncate">{e.title}</p>
                        <p className="text-[11px] text-ink-300">
                          {e.source !== "event" && `${titleCase(e.kind)} · `}
                          {fmtDateLong(e.day)}
                          {e.time ? ` · ${e.time}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {eventModal.node}
    </div>
  );
}
