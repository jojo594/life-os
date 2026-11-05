/**
 * Needs-attention strip surfaced on Home: anything that hasn't moved in N days.
 * Pulls from multiple collections and groups them into a single horizontal scrollable
 * strip — each card is one stale item, clicking opens it via the global form host.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDate, cn } from "@/lib/utils";

interface StaleItem {
  id: string;
  collection: string;
  label: string;
  sub: string;
  href: string;
  ageDays: number;
}

const daysSince = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
};

export function StaleStrip({
  thresholdDays = 14,
  max = 8,
}: {
  thresholdDays?: number;
  max?: number;
}) {
  const { tasks, leads, applications, openForm } = useStore();

  const stale: StaleItem[] = useMemo(() => {
    const out: StaleItem[] = [];

    // Open tasks not touched in N days
    for (const t of tasks) {
      if (t.done) continue;
      if (t.status === "done" || t.status === "archived") continue;
      const age = daysSince(t.updatedAt);
      if (age === null || age < thresholdDays) continue;
      out.push({
        id: t.id,
        collection: "tasks",
        label: t.title,
        sub: `${t.module} · ${t.priority.toUpperCase()}`,
        href: "/",
        ageDays: age,
      });
    }

    // Live leads with no touch
    for (const l of leads) {
      if (l.stage === "won" || l.stage === "lost") continue;
      const age = daysSince(l.lastTouch || l.updatedAt);
      if (age === null || age < thresholdDays) continue;
      out.push({
        id: l.id,
        collection: "leads",
        label: `${l.name} · ${l.business}`,
        sub: `${l.stage} · ${l.channel}`,
        href: "/business",
        ageDays: age,
      });
    }

    // Applications stuck mid-pipeline
    for (const a of applications) {
      if (["accepted", "rejected"].includes(a.stage)) continue;
      const age = daysSince(a.updatedAt);
      if (age === null || age < thresholdDays) continue;
      out.push({
        id: a.id,
        collection: "applications",
        label: `${a.company} · ${a.role}`,
        sub: a.stage,
        href: "/career",
        ageDays: age,
      });
    }

    return out
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, max);
  }, [tasks, leads, applications, thresholdDays, max]);

  if (stale.length === 0) return null;

  const open = (s: StaleItem) => {
    const coll = s.collection as Parameters<typeof openForm>[0];
    const src =
      coll === "tasks"
        ? tasks
        : coll === "leads"
          ? leads
          : applications;
    const record = (src as { id: string }[]).find((x) => x.id === s.id);
    if (record) openForm(coll, "edit", record as { id: string } & Record<string, unknown>);
  };

  return (
    <Card className="border-rose/30">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose" />
            Needs attention
          </span>
        }
        subtitle={`Nothing has moved on these in ${thresholdDays}+ days.`}
        action={
          <Badge tone="rose">
            <Clock className="w-3 h-3" />
            {stale.length}
          </Badge>
        }
      />
      <CardBody>
        <div className="flex gap-2 overflow-x-auto -mx-2 px-2 pb-1 snap-x">
          {stale.map((s) => (
            <button
              key={`${s.collection}-${s.id}`}
              onClick={() => open(s)}
              className={cn(
                "snap-start shrink-0 w-60 text-left p-3 rounded-lg border border-ink-700 bg-ink-800/40",
                "hover:border-rose/40 hover:bg-rose/5 transition-colors group"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-ink-400">
                    {s.collection}
                  </div>
                  <div className="text-sm text-ink-50 truncate mt-0.5">
                    {s.label}
                  </div>
                  <div className="text-[11px] text-ink-300 mt-0.5 capitalize truncate">
                    {s.sub.replace(/_/g, " ")}
                  </div>
                </div>
                <Link
                  to={s.href}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] font-mono text-ink-400 hover:text-cyan shrink-0"
                >
                  →
                </Link>
              </div>
              <div className="mt-2 text-[10px] font-mono text-rose">
                {s.ageDays}d cold · {fmtDate(touchOf(s))}
              </div>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );

  function touchOf(s: StaleItem): string | undefined {
    if (s.collection === "tasks") return tasks.find((t) => t.id === s.id)?.updatedAt;
    if (s.collection === "leads") {
      const l = leads.find((x) => x.id === s.id);
      return l?.lastTouch || l?.updatedAt;
    }
    return applications.find((a) => a.id === s.id)?.updatedAt;
  }
}
