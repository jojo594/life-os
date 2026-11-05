import { useState } from "react";
import { NotebookPen, Plus, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  StatCard,
  Textarea,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { dateOnly, fmtDate, cn } from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";

export default function Journal() {
  const { journal, weekly, addJournal, destroy } = useStore();
  const journalModal = useEntityModal("journal");
  const today = dateOnly();
  const hasToday = journal.some((j) => j.date === today);
  const journalPage = usePagination(journal, 5);

  const [wins, setWins] = useState("");
  const [lessons, setLessons] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(4);

  const save = () => {
    if (!wins && !lessons && !tomorrow) return;
    addJournal({ date: today, wins, lessons, tomorrow, mood });
    setWins("");
    setLessons("");
    setTomorrow("");
  };

  const lastWeekly = weekly[0];

  const avgMood = (
    journal.reduce((s, j) => s + (j.mood || 0), 0) / Math.max(1, journal.length)
  ).toFixed(1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Daily · Weekly · Monthly"
        title="Journal & Reflection"
        subtitle="The mirror. Compress today, sharpen tomorrow."
        action={<AddButton label="Entry" onClick={journalModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Entries" value={journal.length} tone="cyan" icon={<NotebookPen className="w-4 h-4" />} />
        <StatCard label="Today" value={hasToday ? "✓ Done" : "—"} tone={hasToday ? "emerald" : "rose"} />
        <StatCard label="Avg Mood" value={avgMood} tone="gold" />
        <StatCard label="Weekly Reviews" value={weekly.length} tone="violet" icon={<Sparkles className="w-4 h-4" />} />
      </section>

      <Card>
        <CardHeader
          title={hasToday ? "Today's entry — locked in" : "Today's entry"}
          subtitle={hasToday ? "You already journaled today. Edit through the reset/export flow if needed." : "Fast structured check-in. 60 seconds."}
        />
        <CardBody>
          {hasToday ? (
            <div className="text-sm text-ink-300 italic">
              "{journal.find((j) => j.date === today)?.wins}" — saved.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="eyebrow mb-1.5">Wins</div>
                <Textarea
                  placeholder="What I did well today…"
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                />
              </div>
              <div>
                <div className="eyebrow mb-1.5">Lessons</div>
                <Textarea
                  placeholder="What I learned, what I'd change…"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                />
              </div>
              <div>
                <div className="eyebrow mb-1.5">Tomorrow</div>
                <Textarea
                  placeholder="Top 3 moves…"
                  value={tomorrow}
                  onChange={(e) => setTomorrow(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="eyebrow">Mood</div>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setMood(v as 1 | 2 | 3 | 4 | 5)}
                    className={cn(
                      "w-8 h-8 rounded-md border",
                      mood === v ? "border-cyan bg-cyan/10 text-cyan" : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500"
                    )}
                  >
                    {v}
                  </button>
                ))}
                <Button variant="primary" onClick={save} className="ml-auto">
                  <Plus className="w-3.5 h-3.5" /> Save entry
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent entries" />
          <CardBody className="space-y-3">
            {journalPage.slice.map((j) => (
              <div key={j.id} className="group p-4 rounded-lg bg-ink-800/40 border border-ink-700">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => journalModal.openEdit(j)} className="text-xs font-mono text-ink-100 hover:text-cyan">{fmtDate(j.date)}</button>
                  <div className="flex items-center gap-2 text-[11px] text-ink-300">
                    <span>mood {j.mood}/5</span>
                    {j.energy && <span>energy {j.energy}/5</span>}
                    <CrudActions
                      onEdit={() => journalModal.openEdit(j)}
                      onDelete={() => destroy("journal", j.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <div className="space-y-2 text-sm text-ink-200">
                  {j.wins && (
                    <div>
                      <Badge tone="emerald" className="mr-2">Wins</Badge>
                      {j.wins}
                    </div>
                  )}
                  {j.lessons && (
                    <div>
                      <Badge tone="gold" className="mr-2">Lessons</Badge>
                      {j.lessons}
                    </div>
                  )}
                  {j.tomorrow && (
                    <div>
                      <Badge tone="cyan" className="mr-2">Tomorrow</Badge>
                      {j.tomorrow}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Pagination
              page={journalPage.page}
              totalPages={journalPage.totalPages}
              setPage={journalPage.setPage}
              total={journal.length}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Last weekly review" subtitle={lastWeekly ? fmtDate(lastWeekly.weekStart) : ""} />
          <CardBody>
            {lastWeekly ? (
              <div className="space-y-3 text-sm">
                <div>
                  <Badge tone="emerald" className="mb-1">Wins</Badge>
                  <div className="text-ink-200">{lastWeekly.wins}</div>
                </div>
                <div>
                  <Badge tone="rose" className="mb-1">Losses</Badge>
                  <div className="text-ink-200">{lastWeekly.losses}</div>
                </div>
                <div>
                  <Badge tone="gold" className="mb-1">Lessons</Badge>
                  <div className="text-ink-200">{lastWeekly.lessons}</div>
                </div>
                <div>
                  <Badge tone="cyan" className="mb-1">Next week</Badge>
                  <div className="text-ink-200">{lastWeekly.nextWeek}</div>
                </div>
                <div className="pt-3 border-t border-ink-700 grid grid-cols-5 gap-2">
                  {Object.entries(lastWeekly.scores).map(([k, v]) => (
                    <div key={k} className="text-center">
                      <div className="text-[9px] uppercase tracking-wider text-ink-400">{k}</div>
                      <div className="text-lg font-mono text-cyan">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-ink-300">No weekly review yet.</div>
            )}
          </CardBody>
        </Card>
      </div>

      {journalModal.node}
    </div>
  );
}
