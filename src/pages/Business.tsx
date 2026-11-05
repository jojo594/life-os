import { useMemo, useState, type ReactNode } from "react";
import {
  Briefcase,
  TrendingUp,
  Wallet,
  X,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  Tag,
  Layers,
  GripVertical,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Progress,
  StatCard,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { fmtMoney, fmtDate, cn } from "@/lib/utils";
import { Pagination, usePagination } from "@/components/Pagination";
import type { Lead, LeadStage } from "@/lib/types";

const stages: { key: LeadStage; label: string; tone: string }[] = [
  { key: "prospect", label: "Prospect", tone: "neutral" },
  { key: "contacted", label: "Contacted", tone: "cyan" },
  { key: "qualified", label: "Qualified", tone: "violet" },
  { key: "proposal", label: "Proposal", tone: "gold" },
  { key: "negotiation", label: "Negotiation", tone: "rose" },
  { key: "won", label: "Won", tone: "emerald" },
];

// Short labels + accent classes for the kind of work a lead is for.
const SERVICE_META: Record<string, { label: string; cls: string }> = {
  website: { label: "Website", cls: "text-cyan bg-cyan/10 border-cyan/30" },
  automation: { label: "Automation", cls: "text-violet bg-violet/10 border-violet/30" },
  social_media: { label: "Social", cls: "text-rose bg-rose/10 border-rose/30" },
  booking_system: { label: "Booking", cls: "text-emerald bg-emerald/10 border-emerald/30" },
  branding: { label: "Branding", cls: "text-gold bg-gold/10 border-gold/30" },
  seo: { label: "SEO", cls: "text-cyan bg-cyan/10 border-cyan/30" },
  ads: { label: "Ads", cls: "text-gold bg-gold/10 border-gold/30" },
  other: { label: "Other", cls: "text-ink-200 bg-ink-700/60 border-ink-500" },
};

export default function Business() {
  const { leads, businessIdeas, revenue, updateLead, destroy } = useStore();
  const leadModal = useEntityModal("leads");
  const ideaModal = useEntityModal("businessIdeas");
  const revenueModal = useEntityModal("revenue");
  const ideasPage = usePagination(businessIdeas, 5);
  const revenuePage = usePagination(revenue, 5);

  // Drag-and-drop: which lead is being dragged, and which column is hovered.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  // Notion-style detail drawer: the lead currently being inspected.
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailLead = leads.find((l) => l.id === detailId) ?? null;

  const dropOnStage = (stage: LeadStage) => {
    if (dragId) {
      const lead = leads.find((l) => l.id === dragId);
      if (lead && lead.stage !== stage) updateLead(dragId, { stage });
    }
    setDragId(null);
    setDragOverStage(null);
  };

  const liveLeads = leads.filter((l) => l.stage !== "lost");
  const pipelineValue = liveLeads
    .filter((l) => l.stage !== "won")
    .reduce((s, l) => s + l.value, 0);
  const wonValue = leads
    .filter((l) => l.stage === "won")
    .reduce((s, l) => s + l.value, 0);
  const mtdRev = revenue
    .filter((r) => new Date(r.date).getMonth() === new Date().getMonth())
    .reduce((s, r) => s + r.amount, 0);
  const recurring = revenue.filter((r) => r.recurring).reduce((s, r) => s + r.amount, 0);

  const grouped = useMemo(() => {
    const g: Record<LeadStage, Lead[]> = {
      prospect: [],
      contacted: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    leads.forEach((l) => g[l.stage].push(l));
    return g;
  }, [leads]);

  const advance = (lead: Lead) => {
    const order: LeadStage[] = [
      "prospect",
      "contacted",
      "qualified",
      "proposal",
      "negotiation",
      "won",
    ];
    const idx = order.indexOf(lead.stage);
    if (idx >= 0 && idx < order.length - 1) {
      updateLead(lead.id, { stage: order[idx + 1] });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pipeline · Revenue · Ideas"
        title="Business Dashboard"
        subtitle="Pipeline, leads, revenue, and idea bench. Build what people pay for."
        action={<AddButton label="Lead" onClick={leadModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Live Pipeline"
          value={fmtMoney(pipelineValue)}
          hint={`${liveLeads.filter((l) => l.stage !== "won").length} leads`}
          tone="cyan"
          icon={<Briefcase className="w-4 h-4" />}
        />
        <StatCard
          label="Won (lifetime)"
          value={fmtMoney(wonValue)}
          hint={`${leads.filter((l) => l.stage === "won").length} deals`}
          tone="emerald"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="MTD Revenue"
          value={fmtMoney(mtdRev)}
          tone="gold"
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          label="MRR Locked"
          value={fmtMoney(recurring)}
          hint="recurring retainers"
          tone="violet"
        />
      </section>

      {/* Pipeline kanban */}
      <Card>
        <CardHeader
          title="Sales pipeline"
          subtitle="Drag a lead between columns to change its stage · click to view details"
        />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stages.map((s) => {
              const list = grouped[s.key];
              const sum = list.reduce((a, b) => a + b.value, 0);
              const isOver = dragOverStage === s.key;
              return (
                <div
                  key={s.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStage !== s.key) setDragOverStage(s.key);
                  }}
                  onDragLeave={(e) => {
                    // Only clear when leaving the column entirely.
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStage((cur) => (cur === s.key ? null : cur));
                    }
                  }}
                  onDrop={() => dropOnStage(s.key)}
                  className={cn(
                    "rounded-lg border p-2.5 min-h-[200px] transition-colors",
                    isOver
                      ? "bg-cyan/5 border-cyan/40 ring-1 ring-cyan/30"
                      : "bg-ink-850/60 border-ink-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={s.tone as "cyan"}>{s.label}</Badge>
                    <span className="text-[10px] font-mono text-ink-400">
                      {list.length}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-ink-300 mb-2">
                    {fmtMoney(sum)}
                  </div>
                  <div className="space-y-1.5">
                    {list.map((l) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(l.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", l.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => setDetailId(l.id)}
                        className={cn(
                          "group p-2 rounded-md bg-ink-800 border border-ink-700 hover:border-cyan/40 transition-colors cursor-pointer",
                          dragId === l.id && "opacity-40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1 min-w-0 flex-1">
                            <GripVertical className="w-3 h-3 text-ink-500 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab" />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-ink-50 truncate">
                                {l.business}
                              </div>
                              <div className="text-[10px] text-ink-300 mt-0.5 truncate">
                                {l.name}
                              </div>
                            </div>
                          </div>
                          <CrudActions
                            onDelete={() => destroy("leads", l.id)}
                            className="opacity-0 group-hover:opacity-100"
                          />
                        </div>
                        {l.serviceType && SERVICE_META[l.serviceType] && (
                          <div className="mt-1.5 pl-4">
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-medium",
                                SERVICE_META[l.serviceType].cls
                              )}
                            >
                              {SERVICE_META[l.serviceType].label}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1.5 pl-4">
                          <span className="font-mono text-[10px] text-emerald">
                            {fmtMoney(l.value)}
                          </span>
                          {s.key !== "won" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                advance(l);
                              }}
                              className="text-[10px] text-cyan opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                              title="Advance stage"
                            >
                              advance →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Idea bench"
            subtitle="Score by excitement × feasibility"
            action={<AddButton label="Idea" onClick={ideaModal.openAdd} />}
          />
          <CardBody className="space-y-3">
            {ideasPage.slice.map((b) => (
              <div
                key={b.id}
                className="group p-3 rounded-lg bg-ink-800/60 border border-ink-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => ideaModal.openEdit(b)}
                    className="min-w-0 text-left flex-1"
                  >
                    <div className="text-sm font-medium text-ink-50">
                      {b.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge tone="neutral" className="capitalize">
                        {b.category}
                      </Badge>
                      <span className="text-[11px] text-ink-300">
                        excitement {b.excitement}/5 · feasibility{" "}
                        {b.feasibility}/5
                      </span>
                    </div>
                  </button>
                  <div className="flex items-start gap-1 shrink-0">
                    {b.monthlyPotential && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-ink-400">
                          Mo. potential
                        </div>
                        <div className="font-mono text-emerald text-sm">
                          {fmtMoney(b.monthlyPotential)}
                        </div>
                      </div>
                    )}
                    <CrudActions
                      onDelete={() => destroy("businessIdeas", b.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <div className="flex-1">
                    <Progress
                      value={(b.excitement / 5) * 100}
                      tone="gold"
                    />
                  </div>
                  <div className="flex-1">
                    <Progress
                      value={(b.feasibility / 5) * 100}
                      tone="emerald"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Pagination
              page={ideasPage.page}
              totalPages={ideasPage.totalPages}
              setPage={ideasPage.setPage}
              total={businessIdeas.length}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent revenue"
            action={<AddButton label="Revenue" onClick={revenueModal.openAdd} />}
          />
          <CardBody className="space-y-2">
            {revenuePage.slice.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "group flex items-center justify-between p-2.5 rounded-md bg-ink-800/40 border",
                  r.recurring ? "border-emerald/30" : "border-ink-700"
                )}
              >
                <button
                  onClick={() => revenueModal.openEdit(r)}
                  className="min-w-0 text-left flex-1"
                >
                  <div className="text-sm text-ink-50 truncate">{r.source}</div>
                  <div className="text-[10px] text-ink-400 mt-0.5">
                    {fmtDate(r.date)} {r.recurring && "· recurring"}
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-emerald text-sm">
                    {fmtMoney(r.amount)}
                  </span>
                  <CrudActions
                    onDelete={() => destroy("revenue", r.id)}
                    className="opacity-0 group-hover:opacity-100"
                  />
                </div>
              </div>
            ))}
            <Pagination
              page={revenuePage.page}
              totalPages={revenuePage.totalPages}
              setPage={revenuePage.setPage}
              total={revenue.length}
            />
          </CardBody>
        </Card>
      </div>

      {/* Notion-style lead detail drawer */}
      {detailLead && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDetailId(null)}
          />
          <aside className="relative w-full max-w-md h-full glass-strong border-l border-ink-600/70 overflow-y-auto animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 glass-strong px-5 py-4 border-b border-ink-600/70 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="eyebrow">Lead</div>
                <h2 className="text-lg font-semibold text-ink-50 tracking-tight truncate mt-0.5">
                  {detailLead.business}
                </h2>
                <div className="text-sm text-ink-300 mt-0.5 truncate">
                  {detailLead.name}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    const l = detailLead;
                    setDetailId(null);
                    leadModal.openEdit(l);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-cyan transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this lead?")) {
                      destroy("leads", detailLead.id);
                      setDetailId(null);
                    }
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-rose/15 hover:text-rose transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDetailId(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-ink-50 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Value + service type highlight */}
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-xl bg-ink-800/60 border border-ink-700 p-3">
                  <div className="eyebrow">Deal value</div>
                  <div className="text-2xl font-mono font-semibold text-emerald mt-1">
                    {fmtMoney(detailLead.value)}
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-ink-800/60 border border-ink-700 p-3">
                  <div className="eyebrow">Service</div>
                  <div className="mt-1.5">
                    {detailLead.serviceType && SERVICE_META[detailLead.serviceType] ? (
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium",
                          SERVICE_META[detailLead.serviceType].cls
                        )}
                      >
                        {SERVICE_META[detailLead.serviceType].label}
                      </span>
                    ) : (
                      <span className="text-sm text-ink-400">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Inline stage changer */}
              <div>
                <div className="eyebrow mb-2 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Stage
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => updateLead(detailLead.id, { stage: s.key })}
                      className={cn(
                        "px-2.5 h-7 rounded-lg text-xs font-medium border transition-colors",
                        detailLead.stage === s.key
                          ? "bg-cyan/15 text-cyan border-cyan/40"
                          : "bg-ink-800 text-ink-300 border-ink-600 hover:border-ink-500"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-1">
                <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Contact">
                  {detailLead.contact ? (
                    <a
                      href={`tel:${detailLead.contact.replace(/\s/g, "")}`}
                      className="text-cyan hover:underline font-mono"
                    >
                      {detailLead.contact}
                    </a>
                  ) : (
                    "—"
                  )}
                </DetailRow>
                <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Industry">
                  {detailLead.industry || "—"}
                </DetailRow>
                <DetailRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Channel">
                  <span className="capitalize">
                    {detailLead.channel?.replace("_", " ") || "—"}
                  </span>
                </DetailRow>
                <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="City">
                  {detailLead.city || "—"}
                </DetailRow>
              </div>

              {/* Notes */}
              <div>
                <div className="eyebrow mb-1.5">Notes</div>
                <div className="rounded-xl bg-ink-800/40 border border-ink-700 p-3 text-sm text-ink-200 whitespace-pre-wrap min-h-[60px]">
                  {detailLead.notes || (
                    <span className="text-ink-500 italic">No notes yet.</span>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-ink-500 font-mono pt-1">
                added {fmtDate(detailLead.createdAt)} · updated{" "}
                {fmtDate(detailLead.updatedAt)}
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const l = detailLead;
                  setDetailId(null);
                  leadModal.openEdit(l);
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit lead
              </Button>
            </div>
          </aside>
        </div>
      )}

      {leadModal.node}
      {ideaModal.node}
      {revenueModal.node}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-700/50 last:border-0">
      <span className="flex items-center gap-1.5 text-ink-400 text-xs w-24 shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-sm text-ink-100 min-w-0 flex-1">{children}</span>
    </div>
  );
}
