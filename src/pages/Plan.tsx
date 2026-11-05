/**
 * AI Plan — upload a roadmap (PDF) or paste a plan, and Claude turns it into
 * a structured set of goals + day-by-day tasks. The user reviews the preview,
 * tweaks if needed, then commits — at which point inserts flow through the
 * normal store actions (optimistic + outbox-backed). Nothing is auto-saved.
 */
import { useMemo, useRef, useState } from "react";
import { Upload, FileText, Sparkles, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn, fmtDate, localDay } from "@/lib/utils";

type ParsedGoal = {
  title: string;
  description?: string;
  module: string;
  horizon: string;
  status: string;
  priority: string;
  progress: number;
  deadline?: string;
  tags?: string[];
};
type ParsedTask = {
  title: string;
  description?: string;
  module: string;
  status: string;
  priority: string;
  due: string;
  estimateMin?: number;
  tags?: string[];
};

export default function Plan() {
  const { create, pushToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<ParsedGoal[]>([]);
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const hasPreview = goals.length + tasks.length > 0;

  // Read a File into base64 (strip the data: URL prefix).
  const onPickFile = async (file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported. Paste plain text/markdown below for anything else.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      setPdfBase64(base64);
      setPdfName(file.name);
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setPdfBase64(null);
    setPdfName(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const parse = async () => {
    if (!text.trim() && !pdfBase64) {
      setError("Paste a plan or attach a PDF first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const today = localDay(new Date());
      const res = await api.planParse({
        text: text.trim() || undefined,
        pdfBase64: pdfBase64 || undefined,
        notes: notes.trim() || undefined,
        today,
      });
      setGoals((res.goals as ParsedGoal[]) || []);
      setTasks((res.tasks as ParsedTask[]) || []);
      setExcluded(new Set());
      if ((res.goals?.length || 0) + (res.tasks?.length || 0) === 0) {
        setError("Claude returned an empty plan. Try giving more context in the notes box.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // Tasks grouped by `due` date for the day-by-day preview.
  const tasksByDay = useMemo(() => {
    const map = new Map<string, ParsedTask[]>();
    for (const t of tasks) {
      const day = t.due || "unscheduled";
      const arr = map.get(day) || [];
      arr.push(t);
      map.set(day, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  const goalKey = (i: number) => `g${i}`;
  const taskKey = (i: number) => `t${i}`;
  const isExcluded = (k: string) => excluded.has(k);
  const toggle = (k: string) =>
    setExcluded((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const includedGoals = goals.filter((_, i) => !isExcluded(goalKey(i)));
  const includedTasks = tasks.filter((_, i) => !isExcluded(taskKey(i)));

  const commit = async () => {
    if (includedGoals.length + includedTasks.length === 0) {
      pushToast({ kind: "info", message: "Nothing selected — toggle items on to insert." });
      return;
    }
    setBusy(true);
    try {
      // Goals first so subsequent UI shows them up top in lists; tasks aren't
      // linked by FK so order doesn't actually matter for the DB.
      for (const g of includedGoals) {
        create("goals", {
          ...g,
          tags: g.tags || [],
          autoProgress: false,
        });
      }
      for (const t of includedTasks) {
        create("tasks", {
          ...t,
          tags: t.tags || [],
          done: false,
        });
      }
      pushToast({
        kind: "success",
        message: `Inserted ${includedGoals.length} goal(s) and ${includedTasks.length} task(s).`,
      });
      // Reset so the page is ready for the next import.
      setGoals([]);
      setTasks([]);
      setExcluded(new Set());
      setText("");
      setNotes("");
      clearFile();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI · Planning"
        title="Import a plan"
        subtitle="Upload a roadmap PDF or paste a plan — Claude converts it into goals and day-by-day tasks. Review, edit, commit."
      />

      <Card>
        <CardHeader title="Source" subtitle="Attach a PDF, paste markdown/text, or both — add context in the notes field." />
        <CardBody className="space-y-4">
          {/* PDF drop / pick */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])}
              className="hidden"
            />
            {pdfName ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald/40 bg-emerald/10">
                <FileText className="w-4 h-4 text-emerald shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-50 truncate">{pdfName}</div>
                  <div className="text-[11px] text-ink-300 font-mono">
                    {pdfBase64 ? `${Math.round((pdfBase64.length * 0.75) / 1024)} KB` : ""}
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-ink-300 hover:bg-ink-800 hover:text-ink-50"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full p-4 rounded-lg border border-dashed border-ink-600 hover:border-cyan hover:bg-ink-800/40 transition-colors flex items-center justify-center gap-2 text-sm text-ink-300"
              >
                <Upload className="w-4 h-4" />
                Attach PDF roadmap
              </button>
            )}
          </div>

          {/* Text paste */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-ink-300 font-medium block mb-1.5">
              Paste plan (markdown or plain text)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="# My next 30 days&#10;- Finish thesis chapter 3&#10;- Ship landing page MVP&#10;- Start a new language course&#10;..."
              className="w-full px-3 py-2 rounded-lg bg-ink-900 border border-ink-600 text-sm text-ink-50 font-mono placeholder:text-ink-400 focus:outline-none focus:border-cyan resize-y"
            />
          </div>

          {/* Optional steering notes */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-ink-300 font-medium block mb-1.5">
              Notes (optional) — extra context to steer the plan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. exams Jun 8, no work weekends, focus 2h/day on one priority"
              className="w-full px-3 py-2 rounded-lg bg-ink-900 border border-ink-600 text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-cyan resize-y"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose/10 border border-rose/30 text-rose text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={parse} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Generate plan
                </>
              )}
            </Button>
            {hasPreview && (
              <span className="text-[11px] text-ink-400 font-mono">
                {goals.length} goals · {tasks.length} tasks
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Preview */}
      {hasPreview && (
        <>
          <Card>
            <CardHeader
              title="Goals"
              subtitle="Outcome-level — un-check anything you don't want to insert."
            />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goals.map((g, i) => {
                  const k = goalKey(i);
                  const off = isExcluded(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(k)}
                      className={cn(
                        "text-left p-3 rounded-lg border transition-colors",
                        off
                          ? "border-ink-700 bg-ink-900/40 opacity-50"
                          : "border-cyan/40 bg-cyan/5 hover:bg-cyan/10"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          className={cn(
                            "w-4 h-4 shrink-0 mt-0.5",
                            off ? "text-ink-500" : "text-cyan"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-ink-50">{g.title}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <Badge tone="neutral" className="capitalize">{g.module}</Badge>
                            <Badge tone="neutral">{g.horizon}</Badge>
                            <Badge
                              tone={g.priority === "p0" ? "rose" : g.priority === "p1" ? "gold" : "neutral"}
                              className="uppercase"
                            >
                              {g.priority}
                            </Badge>
                            {g.deadline && (
                              <span className="text-[11px] text-ink-300 font-mono">
                                due {fmtDate(g.deadline)}
                              </span>
                            )}
                          </div>
                          {g.description && (
                            <div className="text-[11px] text-ink-300 mt-2 line-clamp-2">
                              {g.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Day-by-day tasks"
              subtitle="Click any row to toggle it off. Empty days are skipped."
            />
            <CardBody>
              <div className="space-y-5">
                {tasksByDay.map(([day, items]) => (
                  <div key={day}>
                    <div className="text-[11px] uppercase tracking-wider text-ink-300 font-mono mb-2">
                      {day === "unscheduled" ? "Unscheduled" : fmtDate(day)}
                      <span className="ml-2 text-ink-400">
                        · {items.length} task{items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((t) => {
                        const globalIdx = tasks.indexOf(t);
                        const k = taskKey(globalIdx);
                        const off = isExcluded(k);
                        return (
                          <button
                            key={k}
                            onClick={() => toggle(k)}
                            className={cn(
                              "w-full flex items-start gap-2.5 px-3 py-2 rounded-md border text-left transition-colors",
                              off
                                ? "border-ink-700 bg-ink-900/40 opacity-50"
                                : "border-ink-600 bg-ink-800/40 hover:bg-ink-800/70"
                            )}
                          >
                            <CheckCircle2
                              className={cn(
                                "w-4 h-4 shrink-0 mt-0.5",
                                off ? "text-ink-500" : "text-emerald"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-ink-50">{t.title}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <Badge tone="neutral" className="capitalize">{t.module}</Badge>
                                <Badge
                                  tone={t.priority === "p0" ? "rose" : t.priority === "p1" ? "gold" : "neutral"}
                                  className="uppercase"
                                >
                                  {t.priority}
                                </Badge>
                                {typeof t.estimateMin === "number" && (
                                  <span className="text-[11px] text-ink-300 font-mono">
                                    {t.estimateMin}m
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <div className="sticky bottom-4 z-10">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-ink-600 bg-ink-900/90 backdrop-blur shadow-2xl">
              <div className="text-xs text-ink-300">
                Inserting{" "}
                <span className="text-ink-50 font-mono">{includedGoals.length}</span> goals and{" "}
                <span className="text-ink-50 font-mono">{includedTasks.length}</span> tasks.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setGoals([]);
                    setTasks([]);
                    setExcluded(new Set());
                  }}
                >
                  Discard
                </Button>
                <Button variant="primary" onClick={commit} disabled={busy}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Insert into Life-OS
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
