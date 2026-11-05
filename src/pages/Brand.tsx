import { Megaphone, TrendingUp, Sparkles } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { cn } from "@/lib/utils";
import type { ContentIdea } from "@/lib/types";

const cols: { key: ContentIdea["status"]; label: string; tone: string }[] = [
  { key: "idea", label: "Idea", tone: "neutral" },
  { key: "scripting", label: "Scripting", tone: "cyan" },
  { key: "filming", label: "Filming", tone: "violet" },
  { key: "editing", label: "Editing", tone: "gold" },
  { key: "scheduled", label: "Scheduled", tone: "emerald" },
  { key: "posted", label: "Posted", tone: "emerald" },
];

const platformIcon: Record<string, string> = {
  instagram: "📷",
  linkedin: "💼",
  youtube: "▶",
  github: "⌨",
  x: "✕",
};

export default function Brand() {
  const { content, updateContent, destroy } = useStore();
  const contentModal = useEntityModal("content");

  const posted = content.filter((c) => c.status === "posted");
  const live = content.filter((c) => c.status !== "posted").length;
  const totalViews = posted.reduce((s, c) => s + (c.performance?.views || 0), 0);

  const advance = (c: ContentIdea) => {
    const order: ContentIdea["status"][] = ["idea", "scripting", "filming", "editing", "scheduled", "posted"];
    const i = order.indexOf(c.status);
    if (i < order.length - 1) updateContent(c.id, { status: order[i + 1] });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Build in public · Document the climb"
        title="Personal Brand"
        subtitle="Plan, produce and publish content around your brand pillars."
        action={<AddButton label="Content" onClick={contentModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In Pipeline" value={live} tone="cyan" icon={<Megaphone className="w-4 h-4" />} />
        <StatCard label="Posted" value={posted.length} tone="emerald" />
        <StatCard label="Total Views" value={totalViews.toLocaleString()} tone="gold" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Content Pillars" value={4} hint="Expertise · Process · Story · Community" tone="violet" icon={<Sparkles className="w-4 h-4" />} />
      </section>

      <Card>
        <CardHeader title="Content kanban" subtitle="Idea → Scripting → Filming → Editing → Scheduled → Posted" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {cols.map((c) => {
              const list = content.filter((x) => x.status === c.key);
              return (
                <div key={c.key} className="rounded-lg bg-ink-850/60 border border-ink-700 p-2.5 min-h-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={c.tone as "cyan"}>{c.label}</Badge>
                    <span className="text-[10px] font-mono text-ink-400">{list.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {list.map((item) => (
                      <div key={item.id} className="group p-2 rounded-md bg-ink-800 border border-ink-700 hover:border-ink-500 transition-colors">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[12px]">{platformIcon[item.platform]}</span>
                          <span className="text-[10px] text-ink-300 font-mono uppercase tracking-wider">{item.pillar}</span>
                          <CrudActions
                            onDelete={() => destroy("content", item.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100"
                          />
                        </div>
                        <button onClick={() => contentModal.openEdit(item)} className="text-xs text-ink-50 mt-1 line-clamp-2 text-left w-full">{item.title}</button>
                        {item.hook && <div className="text-[10px] text-ink-300 mt-1 italic line-clamp-2">"{item.hook}"</div>}
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-ink-400 capitalize">{item.format}</span>
                          {c.key !== "posted" && (
                            <button
                              onClick={() => advance(item)}
                              className="text-[10px] text-cyan opacity-0 group-hover:opacity-100 hover:underline"
                            >
                              advance →
                            </button>
                          )}
                        </div>
                        {item.performance && (
                          <div className="mt-1.5 flex gap-2 text-[10px] font-mono text-emerald">
                            <span>{item.performance.views}v</span>
                            <span>{item.performance.likes}♥</span>
                            <span>{item.performance.saves}⇣</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Brand pillars" subtitle="What every piece of content reinforces" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: "Expertise", desc: "What you know and can teach.", tone: "cyan" },
              { name: "Process", desc: "How the work actually gets done.", tone: "emerald" },
              { name: "Story", desc: "Where you started and where you are going.", tone: "gold" },
              { name: "Community", desc: "The people you learn from and help.", tone: "violet" },
            ].map((p) => (
              <div
                key={p.name}
                className={cn(
                  "p-4 rounded-xl border bg-gradient-to-br",
                  `from-${p.tone}/15 to-transparent border-${p.tone}/30`
                )}
              >
                <div className="text-sm font-semibold text-ink-50">{p.name}</div>
                <div className="text-xs text-ink-300 mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {contentModal.node}
    </div>
  );
}
