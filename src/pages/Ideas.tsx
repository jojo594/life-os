import { useMemo, useState } from "react";
import { Lightbulb, Plus, Star, Sparkles, Hammer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Empty,
  Input,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui";
import { useStore } from "@/lib/store";
import { useEntityModal } from "@/components/useEntityModal";
import { AddButton, CrudActions } from "@/components/form";
import { Pagination, usePagination } from "@/components/Pagination";
import { fmtDate, titleCase, cn } from "@/lib/utils";
import type { Idea, IdeaCategory } from "@/lib/types";

const CATEGORIES: IdeaCategory[] = [
  "life",
  "business",
  "creative",
  "tech",
  "learning",
  "other",
];

const CATEGORY_TONE: Record<IdeaCategory, "cyan" | "gold" | "emerald" | "rose" | "violet" | "neutral"> = {
  life: "emerald",
  business: "gold",
  creative: "violet",
  tech: "cyan",
  learning: "rose",
  other: "neutral",
};

const STATUS_TONE: Record<Idea["status"], "cyan" | "gold" | "emerald" | "rose" | "violet" | "neutral"> = {
  spark: "gold",
  exploring: "cyan",
  building: "emerald",
  shelved: "neutral",
};

export default function Ideas() {
  const { ideas, addIdea, toggleIdeaStar, destroy } = useStore();
  const ideaModal = useEntityModal("ideas");

  // Quick-capture composer (fast jot — opens the full form for the rest).
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<IdeaCategory>("life");

  const capture = () => {
    if (!title.trim()) return;
    addIdea({
      title: title.trim(),
      body: body.trim() || undefined,
      category,
      excitement: 4,
      status: "spark",
      starred: false,
      tags: [],
    });
    setTitle("");
    setBody("");
  };

  // Filters
  const [filterCat, setFilterCat] = useState<IdeaCategory | "all">("all");
  const [starredOnly, setStarredOnly] = useState(false);

  const filtered = useMemo(() => {
    return ideas.filter(
      (i) =>
        (filterCat === "all" || i.category === filterCat) &&
        (!starredOnly || i.starred)
    );
  }, [ideas, filterCat, starredOnly]);

  const page = usePagination(filtered, 9);

  const starredCount = ideas.filter((i) => i.starred).length;
  const buildingCount = ideas.filter((i) => i.status === "building").length;
  const topCategory =
    CATEGORIES.map((c) => ({ c, n: ideas.filter((i) => i.category === c).length }))
      .sort((a, b) => b.n - a.n)
      .filter((x) => x.n > 0)[0]?.c ?? "—";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capture · Explore · Build"
        title="Idea Notebook"
        subtitle="Catch the sparks before they fade. Every great thing starts as a note."
        action={<AddButton label="Idea" onClick={ideaModal.openAdd} />}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ideas" value={ideas.length} tone="cyan" icon={<Lightbulb className="w-4 h-4" />} />
        <StatCard label="Starred" value={starredCount} tone="gold" icon={<Star className="w-4 h-4" />} />
        <StatCard label="In Build" value={buildingCount} tone="emerald" icon={<Hammer className="w-4 h-4" />} />
        <StatCard label="Top Area" value={titleCase(topCategory)} tone="violet" icon={<Sparkles className="w-4 h-4" />} />
      </section>

      {/* Quick capture */}
      <Card>
        <CardHeader
          title="Capture a spark"
          subtitle="Jot the gist — refine, tag, and rate it later from the card."
        />
        <CardBody>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Name the idea…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) capture();
                }}
                className="sm:flex-1"
              />
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as IdeaCategory)}
                className="sm:w-44"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {titleCase(c)}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              placeholder="The idea, in a sentence or three… (⌘/Ctrl + Enter to save)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button variant="primary" onClick={capture} disabled={!title.trim()}>
                <Plus className="w-3.5 h-3.5" /> Save idea
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCat("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
            filterCat === "all"
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500"
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
              filterCat === c
                ? "border-cyan/40 bg-cyan/10 text-cyan"
                : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500"
            )}
          >
            {titleCase(c)}
          </button>
        ))}
        <button
          onClick={() => setStarredOnly((v) => !v)}
          className={cn(
            "ml-auto px-3 py-1.5 rounded-lg text-[12px] border transition-colors inline-flex items-center gap-1.5",
            starredOnly
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", starredOnly && "fill-gold")} />
          Starred
        </button>
      </div>

      {/* Idea grid */}
      {filtered.length === 0 ? (
        <Empty
          icon={<Lightbulb className="w-6 h-6" />}
          title={ideas.length === 0 ? "No ideas yet" : "Nothing matches"}
          hint={
            ideas.length === 0
              ? "Capture your first spark above — it only takes a few words."
              : "Try a different filter."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {page.slice.map((idea) => (
              <Card key={idea.id} className="group flex flex-col">
                <CardBody className="flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => ideaModal.openEdit(idea)}
                      className="text-left text-[15px] font-medium text-ink-50 hover:text-cyan transition-colors leading-snug"
                    >
                      {idea.title}
                    </button>
                    <button
                      onClick={() => toggleIdeaStar(idea.id)}
                      className={cn(
                        "shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                        idea.starred
                          ? "text-gold"
                          : "text-ink-400 hover:text-gold"
                      )}
                      aria-label={idea.starred ? "Unstar" : "Star"}
                    >
                      <Star className={cn("w-4 h-4", idea.starred && "fill-gold")} />
                    </button>
                  </div>

                  {idea.body && (
                    <p className="text-[13px] text-ink-200 leading-relaxed line-clamp-4">
                      {idea.body}
                    </p>
                  )}

                  {idea.spark && (
                    <p className="text-[12px] italic text-ink-400 border-l-2 border-ink-600 pl-2.5">
                      {idea.spark}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                    <Badge tone={CATEGORY_TONE[idea.category]}>{titleCase(idea.category)}</Badge>
                    <Badge tone={STATUS_TONE[idea.status]}>{titleCase(idea.status)}</Badge>
                    <span className="text-gold text-[12px] tracking-tight" title={`Excitement ${idea.excitement}/5`}>
                      {"★".repeat(idea.excitement)}
                      <span className="text-ink-600">{"★".repeat(5 - idea.excitement)}</span>
                    </span>
                  </div>

                  {idea.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {idea.tags.map((t) => (
                        <span key={t} className="text-[11px] text-ink-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-ink-700">
                    <span className="text-[11px] font-mono text-ink-500">{fmtDate(idea.createdAt)}</span>
                    <CrudActions
                      onEdit={() => ideaModal.openEdit(idea)}
                      onDelete={() => destroy("ideas", idea.id)}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            setPage={page.setPage}
            total={filtered.length}
          />
        </>
      )}

      {ideaModal.node}
    </div>
  );
}
