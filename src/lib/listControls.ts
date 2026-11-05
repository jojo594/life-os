/**
 * Generic list-controls engine: free-text search + multi-value filters +
 * pluggable sort + persisted "saved views" — all driven from a tiny config.
 *
 * One hook powers the ListToolbar, BulkBar, and the Pagination already in place.
 * Each list page declares what's searchable / filterable / sortable and gets
 * a fully wired toolbar for free.
 *
 *   const ctrl = useListControls(applications, {
 *     storageKey: "applications",
 *     text: (a) => `${a.company} ${a.role} ${(a.stack || []).join(" ")}`,
 *     filters: {
 *       stage: { label: "Stage", options: STAGE_OPTS, get: (a) => a.stage },
 *       type:  { label: "Type",  options: TYPE_OPTS,  get: (a) => a.type  },
 *     },
 *     sorts: {
 *       recent:  { label: "Recent",     compare: (a,b) => b.createdAt.localeCompare(a.createdAt) },
 *       applied: { label: "Applied",    compare: (a,b) => (b.applied || "").localeCompare(a.applied || "") },
 *       company: { label: "Company A→Z", compare: (a,b) => a.company.localeCompare(b.company) },
 *     },
 *     defaultSort: "recent",
 *   });
 *
 *   {ctrl.filtered.map(...)}
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export interface FilterDef<T> {
  label: string;
  /** Discrete options. If omitted the filter acts as multi-select chips at runtime. */
  options: { value: string; label: string }[];
  get: (item: T) => string | undefined | null;
}

export interface SortDef<T> {
  label: string;
  compare: (a: T, b: T) => number;
}

export interface ListConfig<T> {
  /** Stable key used to persist saved views in localStorage. */
  storageKey: string;
  /** Lowercased haystack for free-text search. */
  text: (item: T) => string;
  filters?: Record<string, FilterDef<T>>;
  sorts?: Record<string, SortDef<T>>;
  defaultSort?: string;
}

export interface SavedView {
  id: string;
  name: string;
  query: string;
  // Multi-select: { stage: ["applied","screening"], ... }
  filters: Record<string, string[]>;
  sort?: string;
}

const VIEWS_PREFIX = "life-os::views::";

const readViews = (key: string): SavedView[] => {
  try {
    const raw = localStorage.getItem(VIEWS_PREFIX + key);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
};
const writeViews = (key: string, v: SavedView[]) => {
  try {
    localStorage.setItem(VIEWS_PREFIX + key, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
};

export function useListControls<T extends { id: string }>(
  items: T[],
  config: ListConfig<T>
) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<string | undefined>(config.defaultSort);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [views, setViews] = useState<SavedView[]>(() => readViews(config.storageKey));

  // Filter values
  const toggleFilter = useCallback((key: string, value: string) => {
    setFilters((s) => {
      const cur = new Set(s[key] || []);
      cur.has(value) ? cur.delete(value) : cur.add(value);
      const next = { ...s, [key]: [...cur] };
      if (next[key].length === 0) delete next[key];
      return next;
    });
  }, []);
  const setFilter = useCallback((key: string, values: string[]) => {
    setFilters((s) => {
      const next = { ...s };
      if (!values.length) delete next[key];
      else next[key] = values;
      return next;
    });
  }, []);
  const clearFilters = useCallback(() => {
    setFilters({});
    setQuery("");
  }, []);

  // Apply pipeline: filter → search → sort
  const filtered = useMemo(() => {
    let arr = items;

    // multi-select filters (OR within key, AND across keys)
    for (const [key, values] of Object.entries(filters)) {
      const def = config.filters?.[key];
      if (!def || values.length === 0) continue;
      const set = new Set(values);
      arr = arr.filter((it) => {
        const v = def.get(it);
        return v != null && set.has(String(v));
      });
    }

    // free-text search
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((it) => config.text(it).toLowerCase().includes(q));
    }

    // sort
    if (sort && config.sorts?.[sort]) {
      arr = [...arr].sort(config.sorts[sort].compare);
    }

    return arr;
  }, [items, filters, query, sort, config]);

  // Drop selections that no longer match the visible set (after a filter/search)
  useEffect(() => {
    if (selected.size === 0) return;
    const visible = new Set(filtered.map((x) => x.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selected) {
      if (visible.has(id)) next.add(id);
      else changed = true;
    }
    if (changed) setSelected(next);
  }, [filtered, selected]);

  // Bulk selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const selectAllVisible = useCallback(() => {
    setSelected(new Set(filtered.map((x) => x.id)));
  }, [filtered]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  // Saved views
  const saveView = useCallback(
    (name: string) => {
      const view: SavedView = {
        id: Math.random().toString(36).slice(2, 10),
        name,
        query,
        filters,
        sort,
      };
      setViews((vs) => {
        const next = [...vs, view];
        writeViews(config.storageKey, next);
        return next;
      });
    },
    [config.storageKey, query, filters, sort]
  );
  const applyView = useCallback((view: SavedView) => {
    setQuery(view.query || "");
    setFilters(view.filters || {});
    setSort(view.sort);
  }, []);
  const deleteView = useCallback(
    (id: string) => {
      setViews((vs) => {
        const next = vs.filter((v) => v.id !== id);
        writeViews(config.storageKey, next);
        return next;
      });
    },
    [config.storageKey]
  );

  const activeFilterCount =
    Object.values(filters).reduce((n, arr) => n + arr.length, 0) +
    (query ? 1 : 0);

  return {
    // pipeline result
    filtered,
    total: items.length,
    // search
    query,
    setQuery,
    // filters
    filters,
    toggleFilter,
    setFilter,
    clearFilters,
    activeFilterCount,
    // sort
    sort,
    setSort,
    // selection
    selected,
    toggleSelect,
    selectAllVisible,
    clearSelection,
    isSelected,
    allVisibleSelected:
      filtered.length > 0 && filtered.every((x) => selected.has(x.id)),
    // saved views
    views,
    saveView,
    applyView,
    deleteView,
    // config passthrough (used by ListToolbar)
    config,
  };
}

export type ListController<T extends { id: string }> = ReturnType<
  typeof useListControls<T>
>;

/** Helper: build options from a string-enum-like array. */
export const opts = (vals: readonly string[]) =>
  vals.map((v) => ({
    value: v,
    label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

/** Stale detector: items older than `days` based on an ISO string getter. */
export const isStale = <T>(
  item: T,
  getLastTouch: (i: T) => string | undefined | null,
  days: number
) => {
  const iso = getLastTouch(item);
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > days * 24 * 60 * 60 * 1000;
};
