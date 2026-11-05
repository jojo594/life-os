/**
 * Global command palette (⌘K / Ctrl+K, or click the top-bar search).
 * - Quick actions: create any core entity (opens the global form modal)
 * - Navigation: jump to any module
 * - Results: live search across core entities → opens the editor for that item
 * Keyboard-first: ↑/↓ to move, Enter to run, Esc to close.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CornerDownLeft,
  Plus,
  ArrowRight,
  LayoutDashboard,
  Map,
  BarChart3,
  GraduationCap,
  Network,
  Briefcase,
  Building2,
  Dumbbell,
  Languages as LangIcon,
  TrendingUp,
  Megaphone,
  BookOpen,
  NotebookPen,
  Lightbulb,
  Activity,
  CalendarDays,
} from "lucide-react";
import { useStore, type CollectionKey } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CmdItem {
  id: string;
  group: "Quick actions" | "Navigation" | "Results";
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords: string;
  run: () => void;
}

const NAV: { label: string; path: string; icon: ReactNode }[] = [
  { label: "Command Center", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Master Roadmap", path: "/roadmap", icon: <Map className="w-4 h-4" /> },
  { label: "Calendar", path: "/calendar", icon: <CalendarDays className="w-4 h-4" /> },
  { label: "Analytics", path: "/analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { label: "University", path: "/university", icon: <GraduationCap className="w-4 h-4" /> },
  { label: "Skill Tree", path: "/skills", icon: <Network className="w-4 h-4" /> },
  { label: "Business", path: "/business", icon: <Briefcase className="w-4 h-4" /> },
  { label: "Career", path: "/career", icon: <Building2 className="w-4 h-4" /> },
  { label: "Fitness", path: "/fitness", icon: <Dumbbell className="w-4 h-4" /> },
  { label: "Languages", path: "/languages", icon: <LangIcon className="w-4 h-4" /> },
  { label: "Finance", path: "/finance", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "Personal Brand", path: "/brand", icon: <Megaphone className="w-4 h-4" /> },
  { label: "Reading", path: "/reading", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Journal", path: "/journal", icon: <NotebookPen className="w-4 h-4" /> },
  { label: "Idea Notebook", path: "/ideas", icon: <Lightbulb className="w-4 h-4" /> },
];

// Quick-create actions: label + collection to open in the global form.
const ACTIONS: { label: string; collection: CollectionKey; hint?: string }[] = [
  { label: "New task", collection: "tasks" },
  { label: "New goal", collection: "goals" },
  { label: "New habit", collection: "habits" },
  { label: "New journal entry", collection: "journal" },
  { label: "Capture an idea", collection: "ideas" },
  { label: "Log daily signal (mood / energy)", collection: "body", hint: "check-in" },
  { label: "Log training session", collection: "sessions" },
  { label: "New lead", collection: "leads" },
  { label: "Log trade", collection: "trades" },
  { label: "New application", collection: "applications" },
];

// Entity search sources: which collections are searchable + how to render them.
type AnyRow = Record<string, unknown> & { id: string };
const SOURCES: {
  collection: CollectionKey;
  route: string;
  noun: string;
  label: (x: AnyRow) => string;
  search: (x: AnyRow) => string;
}[] = [
  { collection: "tasks", route: "/", noun: "Task", label: (x) => String(x.title), search: (x) => `${x.title} ${(x.tags as string[] | undefined)?.join(" ") ?? ""}` },
  { collection: "goals", route: "/roadmap", noun: "Goal", label: (x) => String(x.title), search: (x) => String(x.title) },
  { collection: "habits", route: "/", noun: "Habit", label: (x) => String(x.name), search: (x) => String(x.name) },
  { collection: "applications", route: "/career", noun: "Application", label: (x) => `${x.company} — ${x.role}`, search: (x) => `${x.company} ${x.role}` },
  { collection: "trades", route: "/finance", noun: "Trade", label: (x) => `${x.symbol} · ${x.strategy}`, search: (x) => `${x.symbol} ${x.strategy} ${x.regime ?? ""}` },
  { collection: "books", route: "/reading", noun: "Book", label: (x) => String(x.title), search: (x) => `${x.title} ${x.author}` },
  { collection: "leads", route: "/business", noun: "Lead", label: (x) => String(x.business), search: (x) => `${x.business} ${x.name}` },
  { collection: "skills", route: "/skills", noun: "Skill", label: (x) => String(x.name), search: (x) => String(x.name) },
  { collection: "courses", route: "/university", noun: "Course", label: (x) => `${x.code} · ${x.name}`, search: (x) => `${x.code} ${x.name}` },
  { collection: "content", route: "/brand", noun: "Content", label: (x) => String(x.title), search: (x) => String(x.title) },
  { collection: "languages", route: "/languages", noun: "Language", label: (x) => String(x.name), search: (x) => String(x.name) },
  { collection: "ideas", route: "/ideas", noun: "Idea", label: (x) => String(x.title), search: (x) => `${x.title} ${(x.tags as string[] | undefined)?.join(" ") ?? ""}` },
];

export function CommandPalette() {
  const open = useStore((s) => s.commandOpen);
  const setOpen = useStore((s) => s.setCommandOpen);
  const openForm = useStore((s) => s.openForm);
  const store = useStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Reset on open.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<CmdItem[]>(() => {
    const q = query.trim().toLowerCase();
    const out: CmdItem[] = [];

    // Quick actions
    ACTIONS.forEach((a) =>
      out.push({
        id: `act:${a.collection}:${a.label}`,
        group: "Quick actions",
        label: a.label,
        hint: a.hint,
        icon: <Plus className="w-4 h-4 text-cyan" />,
        keywords: `new create ${a.label} ${a.collection}`,
        run: () => openForm(a.collection, "add"),
      })
    );

    // Navigation
    NAV.forEach((n) =>
      out.push({
        id: `nav:${n.path}`,
        group: "Navigation",
        label: n.label,
        hint: "go to",
        icon: n.icon,
        keywords: `go open ${n.label} ${n.path}`,
        run: () => {
          navigate(n.path);
          setOpen(false);
        },
      })
    );

    // Entity results (only when searching)
    if (q.length >= 1) {
      let count = 0;
      for (const src of SOURCES) {
        const rows = (store[src.collection] as unknown as AnyRow[]) || [];
        for (const row of rows) {
          if (count >= 16) break;
          if (!src.search(row).toLowerCase().includes(q)) continue;
          count++;
          out.push({
            id: `res:${src.collection}:${row.id}`,
            group: "Results",
            label: src.label(row),
            hint: src.noun,
            icon: <ArrowRight className="w-4 h-4 text-ink-400" />,
            keywords: src.search(row),
            run: () => {
              navigate(src.route);
              openForm(src.collection, "edit", row);
            },
          });
        }
      }
    }

    if (!q) return out;
    // Filter actions + nav by query; keep results (already matched).
    const matches = (it: CmdItem) =>
      it.group === "Results" ||
      it.label.toLowerCase().includes(q) ||
      it.keywords.toLowerCase().includes(q);
    const filtered = out.filter(matches);
    // Rank: startsWith first within the filtered set.
    return filtered.sort((a, b) => {
      const aS = a.label.toLowerCase().startsWith(q) ? 0 : 1;
      const bS = b.label.toLowerCase().startsWith(q) ? 0 : 1;
      return aS - bS;
    });
  }, [query, store, navigate, openForm, setOpen]);

  // Clamp active index.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Group rendering with a continuous index for keyboard selection.
  const groups = ["Quick actions", "Navigation", "Results"] as const;
  let runningIndex = -1;

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl bg-ink-900 border border-ink-600 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-ink-600/70">
          <Search className="w-4 h-4 text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search, jump to a module, or create anything…"
            className="flex-1 bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-ink-400 border border-ink-600 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink-300">
              No matches for “{query}”.
            </div>
          )}
          {groups.map((group) => {
            const groupItems = items.filter((i) => i.group === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group} className="px-2 pb-1">
                <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-400 font-medium">
                  {group}
                </div>
                {groupItems.map((it) => {
                  runningIndex++;
                  const idx = runningIndex;
                  const isActive = idx === active;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => it.run()}
                      className={cn(
                        "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                        isActive ? "bg-ink-800" : "hover:bg-ink-800/60"
                      )}
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="flex-1 min-w-0 text-sm text-ink-50 truncate">
                        {it.label}
                      </span>
                      {it.hint && (
                        <span className="text-[10px] uppercase tracking-wider text-ink-400 shrink-0">
                          {it.hint}
                        </span>
                      )}
                      {isActive && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-4 h-9 border-t border-ink-600/70 text-[10px] text-ink-400 font-mono">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
