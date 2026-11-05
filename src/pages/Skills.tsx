import {
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from "react";
import {
  Network,
  Sparkles,
  Lock,
  X,
  Pencil,
  Trash2,
  Target,
  Calendar,
  Link2,
  Unlock,
  GitBranch,
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
import { cn, fmtDate, daysUntil } from "@/lib/utils";
import type { Skill, SkillDomain } from "@/lib/types";

const domainMeta: Record<SkillDomain, { label: string; tone: string }> = {
  languages: { label: "Languages", tone: "cyan" },
  backend: { label: "Backend", tone: "violet" },
  frontend: { label: "Frontend", tone: "emerald" },
  data: { label: "Data", tone: "cyan" },
  devops: { label: "DevOps", tone: "gold" },
  cloud: { label: "Cloud", tone: "violet" },
  ai: { label: "AI / LLM", tone: "rose" },
  security: { label: "Security", tone: "rose" },
  quant: { label: "Quant", tone: "gold" },
  systems: { label: "Systems", tone: "cyan" },
  physical: { label: "Physical", tone: "emerald" },
};

const levelLabel = ["Locked", "Aware", "Novice", "Practitioner", "Skilled", "Expert"];

const STATUS_ORDER: Skill["status"][] = ["locked", "active", "mastered"];
const statusMeta: Record<Skill["status"], { label: string; cls: string }> = {
  locked: { label: "Locked", cls: "text-ink-300 bg-ink-700/60 border-ink-500" },
  active: { label: "Active", cls: "text-gold bg-gold/10 border-gold/40" },
  mastered: { label: "Mastered", cls: "text-emerald bg-emerald/10 border-emerald/40" },
};

// Domain accent → text colour for the big level number + tints.
const toneText: Record<string, string> = {
  cyan: "text-cyan",
  gold: "text-gold",
  emerald: "text-emerald",
  rose: "text-rose",
  violet: "text-violet",
};

// A prerequisite is "met" once it's mastered or has reached its own target level.
const isMet = (s: Skill) => s.status === "mastered" || s.level >= s.target;

export default function Skills() {
  const { skills, updateSkill, destroy } = useStore();
  const [filter, setFilter] = useState<SkillDomain | "all">("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(skills.map((s) => [s.id, s])),
    [skills]
  );

  // Prereq options for the form's multiselect (all skills, alphabetical).
  const prereqOptions = useMemo(
    () =>
      [...skills]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name })),
    [skills]
  );
  const skillModal = useEntityModal("skills", { prereqs: prereqOptions });

  // Resolvable prereqs (exists, not self).
  const cleanPrereqs = (s: Skill) =>
    (s.prereqs || []).filter((id) => id !== s.id && byId.has(id));

  // Unmet prerequisites gate a skill (show it locked until they're met).
  const unmetPrereqs = (s: Skill) =>
    cleanPrereqs(s)
      .map((id) => byId.get(id)!)
      .filter((p) => !isMet(p));

  // Who depends on a given skill (its "unlocks" list).
  const dependents = useMemo(() => {
    const m = new Map<string, Skill[]>();
    skills.forEach((s) =>
      cleanPrereqs(s).forEach((pid) => {
        (m.get(pid) ?? m.set(pid, []).get(pid)!).push(s);
      })
    );
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, byId]);

  // Dependency depth (longest prereq chain) — drives the tier columns.
  const depth = useMemo(() => {
    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    const calc = (id: string): number => {
      if (memo.has(id)) return memo.get(id)!;
      if (visiting.has(id)) return 0; // cycle guard
      const s = byId.get(id);
      if (!s) return 0;
      visiting.add(id);
      const ps = cleanPrereqs(s);
      const d = ps.length ? 1 + Math.max(...ps.map(calc)) : 0;
      visiting.delete(id);
      memo.set(id, d);
      return d;
    };
    skills.forEach((s) => calc(s.id));
    return memo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, byId]);

  const filtered = useMemo(
    () => (filter === "all" ? skills : skills.filter((s) => s.domain === filter)),
    [skills, filter]
  );

  const maxDepth = filtered.reduce((m, s) => Math.max(m, depth.get(s.id) ?? 0), 0);
  const hasTree = maxDepth > 0;

  // Group filtered skills into tier columns by depth.
  const tiers = useMemo(() => {
    const t = new Map<number, Skill[]>();
    filtered.forEach((s) => {
      const d = depth.get(s.id) ?? 0;
      (t.get(d) ?? t.set(d, []).get(d)!).push(s);
    });
    return [...t.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered, depth]);

  // KPIs
  const mastered = skills.filter((s) => s.status === "mastered").length;
  const active = skills.filter((s) => s.status === "active").length;
  const avgLevel = (
    skills.reduce((s, k) => s + k.level, 0) / Math.max(1, skills.length)
  ).toFixed(1);

  // --- Connector edges (prereq → dependent), measured from the DOM ---
  const contentRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [edges, setEdges] = useState<
    { x1: number; y1: number; x2: number; y2: number; met: boolean }[]
  >([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!hasTree) {
      setEdges([]);
      return;
    }
    const measure = () => {
      const c = contentRef.current;
      if (!c) return;
      try {
        const cr = c.getBoundingClientRect();
        const pts = new Map<
          string,
          { left: number; top: number; w: number; h: number }
        >();
        nodeRefs.current.forEach((el, id) => {
          const r = el.getBoundingClientRect();
          pts.set(id, {
            left: r.left - cr.left,
            top: r.top - cr.top,
            w: r.width,
            h: r.height,
          });
        });
        const es: typeof edges = [];
        filtered.forEach((s) =>
          cleanPrereqs(s).forEach((pid) => {
            const a = pts.get(pid);
            const b = pts.get(s.id);
            if (a && b) {
              es.push({
                x1: a.left + a.w,
                y1: a.top + a.h / 2,
                x2: b.left,
                y2: b.top + b.h / 2,
                met: isMet(byId.get(pid)!),
              });
            }
          })
        );
        setEdges(es);
        setSvgSize({ w: c.scrollWidth, h: c.scrollHeight });
      } catch {
        setEdges([]);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, hasTree, skills]);

  const registerNode = (id: string) => (el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  };

  const detail = skills.find((s) => s.id === detailId) ?? null;

  const renderNode = (s: Skill) => (
    <SkillNode
      key={s.id}
      nodeRef={registerNode(s.id)}
      skill={s}
      gatedBy={unmetPrereqs(s)}
      onChange={updateSkill}
      onOpen={() => setDetailId(s.id)}
      onEdit={() => skillModal.openEdit(s)}
      onDelete={() => destroy("skills", s.id)}
    />
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Technical Skill Tree"
        title="Skill Tree"
        subtitle="Map prerequisites, unlock what you've earned, and prove each level with a project."
        action={<AddButton label="Skill" onClick={skillModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Skills"
          value={skills.length}
          tone="cyan"
          icon={<Network className="w-4 h-4" />}
        />
        <StatCard label="Active" value={active} hint="currently leveling" tone="gold" />
        <StatCard
          label="Mastered"
          value={mastered}
          hint="status: mastered"
          tone="emerald"
          icon={<Sparkles className="w-4 h-4" />}
        />
        <StatCard label="Avg Level" value={avgLevel} hint="across all" tone="violet" />
      </section>

      {/* Domain filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 h-8 rounded-lg text-xs font-medium border transition-all",
            filter === "all"
              ? "bg-cyan/15 text-cyan border-cyan/40"
              : "bg-ink-800 text-ink-200 border-ink-600 hover:border-ink-500"
          )}
        >
          All ({skills.length})
        </button>
        {(Object.keys(domainMeta) as SkillDomain[]).map((d) => {
          const count = skills.filter((s) => s.domain === d).length;
          if (count === 0) return null;
          return (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={cn(
                "px-3 h-8 rounded-lg text-xs font-medium border transition-all",
                filter === d
                  ? "bg-cyan/15 text-cyan border-cyan/40"
                  : "bg-ink-800 text-ink-200 border-ink-600 hover:border-ink-500"
              )}
            >
              {domainMeta[d].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tree (tiered) when prereqs exist; otherwise a clean grid */}
      {hasTree ? (
        <Card>
          <CardHeader
            title="Dependency tree"
            subtitle="Left → right follows prerequisites. A locked card is waiting on the skills feeding into it."
            action={<GitBranch className="w-4 h-4 text-ink-300" />}
          />
          <CardBody>
            <div className="overflow-x-auto pb-2">
              <div ref={contentRef} className="relative inline-flex gap-10 min-w-full">
                {/* Connector edges */}
                <svg
                  className="absolute top-0 left-0 pointer-events-none overflow-visible"
                  width={svgSize.w}
                  height={svgSize.h}
                >
                  {edges.map((e, i) => (
                    <path
                      key={i}
                      d={`M ${e.x1} ${e.y1} C ${e.x1 + 36} ${e.y1}, ${e.x2 - 36} ${e.y2}, ${e.x2} ${e.y2}`}
                      fill="none"
                      stroke={e.met ? "rgb(var(--accent-emerald))" : "rgb(var(--accent-rose))"}
                      strokeOpacity={e.met ? 0.5 : 0.4}
                      strokeWidth={1.5}
                      strokeDasharray={e.met ? undefined : "4 3"}
                    />
                  ))}
                </svg>

                {tiers.map(([d, list]) => (
                  <div
                    key={d}
                    className="relative z-10 w-[280px] shrink-0 space-y-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium font-mono pb-1">
                      {d === 0 ? "Foundations" : `Tier ${d + 1}`}
                    </div>
                    {list.map(renderNode)}
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(renderNode)}
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <SkillDetail
          skill={detail}
          requires={cleanPrereqs(detail).map((id) => byId.get(id)!)}
          unlocks={dependents.get(detail.id) ?? []}
          onClose={() => setDetailId(null)}
          onOpenSkill={(id) => setDetailId(id)}
          onEdit={() => {
            const s = detail;
            setDetailId(null);
            skillModal.openEdit(s);
          }}
          onDelete={() => {
            destroy("skills", detail.id);
            setDetailId(null);
          }}
        />
      )}

      {skillModal.node}
    </div>
  );
}

const SkillNode = ({
  nodeRef,
  skill,
  gatedBy,
  onChange,
  onOpen,
  onEdit,
  onDelete,
}: {
  nodeRef: (el: HTMLDivElement | null) => void;
  skill: Skill;
  gatedBy: Skill[];
  onChange: (id: string, u: Partial<Skill>) => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const targetPct = (skill.target / 5) * 100;
  const pct = (skill.level / 5) * 100;
  const meta = domainMeta[skill.domain];
  const tone = toneText[meta.tone] ?? "text-cyan";
  const gated = gatedBy.length > 0;

  return (
    <div
      ref={nodeRef}
      onClick={onOpen}
      className={cn(
        "surface rounded-xl p-4 relative overflow-hidden group transition-colors cursor-pointer hover:border-cyan/40",
        gated && "opacity-70"
      )}
    >
      <CrudActions
        onEdit={onEdit}
        onDelete={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-ink-900/80 rounded-md"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {gated && <Lock className="w-3 h-3 text-ink-400 shrink-0" />}
            <div className="text-sm font-semibold text-ink-50 truncate">
              {skill.name}
            </div>
          </div>
          <Badge tone={meta.tone as "cyan"} className="mt-1.5">
            {meta.label}
          </Badge>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("text-2xl font-mono font-semibold leading-none", tone)}>
            L{skill.level}
          </div>
          <div className="text-[10px] text-ink-400 mt-0.5 font-mono">
            target L{skill.target}
          </div>
        </div>
      </div>

      {/* Status chip — click to cycle locked → active → mastered */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const next =
            STATUS_ORDER[(STATUS_ORDER.indexOf(skill.status) + 1) % STATUS_ORDER.length];
          onChange(skill.id, { status: next });
        }}
        title="Click to change status"
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors hover:brightness-125",
          statusMeta[skill.status].cls
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            skill.status === "mastered"
              ? "bg-emerald"
              : skill.status === "active"
                ? "bg-gold"
                : "bg-ink-400"
          )}
        />
        {statusMeta[skill.status].label}
      </button>

      <div className="mt-4">
        <div className="relative h-1.5 rounded-full bg-ink-700 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-cyan rounded-full"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gold"
            style={{ left: `${targetPct}%` }}
            title={`target L${skill.target}`}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] text-ink-400 font-mono">
          <span>{levelLabel[skill.level]}</span>
          <span>conf {skill.confidence}/5</span>
        </div>
      </div>

      {/* Gating note */}
      {gated && (
        <div className="mt-2.5 text-[10px] text-ink-400 flex items-start gap-1">
          <Lock className="w-3 h-3 mt-px shrink-0" />
          <span>
            requires{" "}
            <span className="text-ink-200">
              {gatedBy.map((g) => g.name).join(", ")}
            </span>
          </span>
        </div>
      )}

      {/* Level dots interaction */}
      <div className="flex gap-1 mt-3">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={(e) => {
              e.stopPropagation();
              onChange(skill.id, {
                level: v as Skill["level"],
                status: v >= 4 ? "mastered" : "active",
              });
            }}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              v <= skill.level ? "bg-cyan hover:bg-cyan/80" : "bg-ink-700 hover:bg-ink-600"
            )}
            title={`Set level ${v}`}
          />
        ))}
      </div>
    </div>
  );
};

/* ---------------- Detail drawer ---------------- */
function SkillDetail({
  skill,
  requires,
  unlocks,
  onClose,
  onOpenSkill,
  onEdit,
  onDelete,
}: {
  skill: Skill;
  requires: Skill[];
  unlocks: Skill[];
  onClose: () => void;
  onOpenSkill: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = domainMeta[skill.domain];
  const d = daysUntil(skill.deadline);
  const resources = skill.resources ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full glass-strong border-l border-ink-600/70 overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 glass-strong px-5 py-4 border-b border-ink-600/70 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow">Skill</div>
            <h2 className="text-lg font-semibold text-ink-50 tracking-tight truncate mt-0.5">
              {skill.name}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge tone={meta.tone as "cyan"}>{meta.label}</Badge>
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium",
                  statusMeta[skill.status].cls
                )}
              >
                {statusMeta[skill.status].label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-cyan transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this skill?")) onDelete();
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-rose/15 hover:text-rose transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-ink-50 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Level / target / confidence */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "Level", v: `L${skill.level}`, tone: "text-cyan" },
              { k: "Target", v: `L${skill.target}`, tone: "text-gold" },
              { k: "Confidence", v: `${skill.confidence}/5`, tone: "text-violet" },
            ].map((b) => (
              <div key={b.k} className="rounded-xl bg-ink-800/60 border border-ink-700 p-3">
                <div className="eyebrow">{b.k}</div>
                <div className={cn("text-xl font-mono font-semibold mt-1", b.tone)}>
                  {b.v}
                </div>
              </div>
            ))}
          </div>

          <div>
            <Progress value={(skill.level / 5) * 100} tone="cyan" />
            <div className="text-[10px] text-ink-400 font-mono mt-1">
              {levelLabel[skill.level]}
            </div>
          </div>

          {skill.deadline && (
            <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Deadline">
              {fmtDate(skill.deadline)}
              {d !== null && (
                <span className={cn("ml-1.5 font-mono", d < 0 ? "text-rose" : d < 14 ? "text-gold" : "text-ink-300")}>
                  · {d}d
                </span>
              )}
            </DetailRow>
          )}

          {skill.projectIdea && (
            <DetailRow icon={<Target className="w-3.5 h-3.5" />} label="Project">
              {skill.projectIdea}
            </DetailRow>
          )}

          {/* Prerequisites */}
          <div>
            <div className="eyebrow mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Requires
            </div>
            {requires.length === 0 ? (
              <div className="text-sm text-ink-500 italic">No prerequisites.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {requires.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onOpenSkill(p.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 h-7 rounded-lg border text-xs transition-colors hover:border-cyan/40",
                      isMet(p)
                        ? "bg-emerald/10 text-emerald border-emerald/30"
                        : "bg-ink-800 text-ink-300 border-ink-600"
                    )}
                  >
                    {isMet(p) ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unlocks */}
          {unlocks.length > 0 && (
            <div>
              <div className="eyebrow mb-1.5 flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" /> Unlocks
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unlocks.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onOpenSkill(p.id)}
                    className="inline-flex items-center gap-1.5 px-2 h-7 rounded-lg border border-ink-600 bg-ink-800 text-ink-200 text-xs hover:border-cyan/40 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          <div>
            <div className="eyebrow mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Resources
            </div>
            {resources.length === 0 ? (
              <div className="text-sm text-ink-500 italic">None linked.</div>
            ) : (
              <div className="space-y-1.5">
                {resources.map((r, i) => {
                  const isUrl = /^https?:\/\//i.test(r);
                  return isUrl ? (
                    <a
                      key={i}
                      href={r}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-cyan hover:underline truncate"
                    >
                      {r}
                    </a>
                  ) : (
                    <div key={i} className="text-sm text-ink-200">
                      {r}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          {skill.notes && (
            <div>
              <div className="eyebrow mb-1.5">Notes</div>
              <div className="rounded-xl bg-ink-800/40 border border-ink-700 p-3 text-sm text-ink-200 whitespace-pre-wrap">
                {skill.notes}
              </div>
            </div>
          )}

          <Button variant="secondary" className="w-full" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit skill
          </Button>
        </div>
      </aside>
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
