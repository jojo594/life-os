/**
 * Sticky toolbar that consumes a controller from useListControls:
 *   - free-text search
 *   - multi-select filter chips (per filter key)
 *   - sort dropdown
 *   - saved-views menu (save / load / delete)
 *   - active-filter chips with single-click clear
 *
 * Render once per list section. The controller handles state + persistence.
 */
import { useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  ArrowDownUp,
  Bookmark,
  BookmarkPlus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Input, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ListController, SavedView } from "@/lib/listControls";

export function ListToolbar<T extends { id: string }>({
  ctrl,
  className,
}: {
  ctrl: ListController<T>;
  className?: string;
}) {
  const filterDefs = ctrl.config.filters || {};
  const sortDefs = ctrl.config.sorts || {};
  const filterKeys = Object.keys(filterDefs);
  const sortKeys = Object.keys(sortDefs);
  const hasViews = ctrl.views.length > 0 || ctrl.activeFilterCount > 0 || ctrl.sort;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 pb-3 mb-3 border-b border-ink-700/60",
        className
      )}
    >
      <div className="relative flex-1 min-w-[180px]">
        <Search className="w-3.5 h-3.5 text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          value={ctrl.query}
          onChange={(e) => ctrl.setQuery(e.target.value)}
          placeholder="Filter…"
          className="pl-8"
        />
        {ctrl.query && (
          <button
            onClick={() => ctrl.setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-100"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {filterKeys.map((key) => (
        <FilterMenu
          key={key}
          filterKey={key}
          label={filterDefs[key].label}
          options={filterDefs[key].options}
          values={ctrl.filters[key] || []}
          onToggle={(v) => ctrl.toggleFilter(key, v)}
          onClear={() => ctrl.setFilter(key, [])}
        />
      ))}

      {sortKeys.length > 0 && (
        <SortMenu
          options={Object.entries(sortDefs).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
          value={ctrl.sort}
          onChange={ctrl.setSort}
        />
      )}

      {hasViews && (
        <ViewsMenu
          views={ctrl.views}
          onApply={ctrl.applyView}
          onSave={(name) => ctrl.saveView(name)}
          onDelete={ctrl.deleteView}
          hasActiveState={ctrl.activeFilterCount > 0 || !!ctrl.sort}
        />
      )}

      {ctrl.activeFilterCount > 0 && (
        <button
          onClick={ctrl.clearFilters}
          className="text-[11px] font-mono text-ink-400 hover:text-rose px-2 h-8 rounded-md hover:bg-rose/10"
        >
          clear
        </button>
      )}
    </div>
  );
}

/* ============================== Filter menu ============================== */

function FilterMenu({
  filterKey,
  label,
  options,
  values,
  onToggle,
  onClear,
}: {
  filterKey: string;
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const active = values.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-8 px-2.5 text-xs rounded-md border flex items-center gap-1.5 transition-colors",
          active
            ? "border-cyan/40 bg-cyan/10 text-cyan"
            : "border-ink-600 text-ink-200 hover:border-ink-500"
        )}
      >
        <span>{label}</span>
        {active && (
          <span className="font-mono text-[10px] bg-cyan/20 px-1 rounded">
            {values.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-48 rounded-lg border border-ink-600 bg-ink-900 shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((o) => {
              const on = values.includes(o.value);
              return (
                <button
                  key={`${filterKey}-${o.value}`}
                  onClick={() => onToggle(o.value)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 hover:bg-ink-800",
                    on && "text-cyan"
                  )}
                >
                  <span
                    className={cn(
                      "w-3.5 h-3.5 rounded border flex items-center justify-center",
                      on ? "bg-cyan/20 border-cyan/60" : "border-ink-500"
                    )}
                  >
                    {on && <span className="w-1.5 h-1.5 bg-cyan rounded-sm" />}
                  </span>
                  <span className="capitalize truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
          {active && (
            <button
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="w-full text-[10px] font-mono uppercase tracking-wider text-ink-400 hover:text-rose hover:bg-rose/10 py-1.5 border-t border-ink-700"
            >
              clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* =============================== Sort menu =============================== */

function SortMenu({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-8 px-2.5 text-xs rounded-md border flex items-center gap-1.5 transition-colors",
          value
            ? "border-gold/40 bg-gold/10 text-gold"
            : "border-ink-600 text-ink-200 hover:border-ink-500"
        )}
      >
        <ArrowDownUp className="w-3 h-3" />
        <span>{current ? current.label : "Sort"}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-ink-600 bg-ink-900 shadow-xl overflow-hidden py-1">
          {options.map((o) => {
            const on = value === o.value;
            return (
              <button
                key={o.value}
                onClick={() => {
                  onChange(on ? undefined : o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 text-xs hover:bg-ink-800",
                  on && "text-gold"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================== Views menu =============================== */

function ViewsMenu({
  views,
  onApply,
  onSave,
  onDelete,
  hasActiveState,
}: {
  views: SavedView[];
  onApply: (v: SavedView) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  hasActiveState: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const save = () => {
    const name = prompt("Name this view (e.g. 'Overdue P0')");
    if (!name?.trim()) return;
    onSave(name.trim());
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 px-2.5 text-xs rounded-md border border-ink-600 text-ink-200 hover:border-ink-500 flex items-center gap-1.5 transition-colors"
      >
        <Bookmark className="w-3 h-3" />
        <span>Views</span>
        {views.length > 0 && (
          <span className="font-mono text-[10px] text-ink-400">{views.length}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-ink-600 bg-ink-900 shadow-xl overflow-hidden">
          {views.length > 0 && (
            <div className="max-h-56 overflow-y-auto py-1">
              {views.map((v) => (
                <div
                  key={v.id}
                  className="group flex items-center gap-1 px-2.5 py-1.5 text-xs hover:bg-ink-800"
                >
                  <button
                    onClick={() => {
                      onApply(v);
                      setOpen(false);
                    }}
                    className="text-left flex-1 min-w-0 truncate text-ink-100"
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => onDelete(v.id)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-ink-400 hover:text-rose hover:bg-rose/10 opacity-0 group-hover:opacity-100"
                    aria-label="Delete view"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-center !text-xs !h-8 border-t border-ink-700 rounded-none disabled:opacity-40"
            onClick={save}
            disabled={!hasActiveState}
            title={
              hasActiveState
                ? "Save current filters + sort as a view"
                : "Apply a filter or sort first"
            }
          >
            <BookmarkPlus className="w-3 h-3" /> Save current
          </Button>
        </div>
      )}
    </div>
  );
}

/* ============================ click-outside =========================== */

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onOutside, enabled]);
}
