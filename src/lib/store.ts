import { create } from "zustand";
import { api, RESOURCE_URL } from "./api";
import { computeStreak } from "./utils";
import type {
  Application,
  Assignment,
  Book,
  CalendarEvent,
  BodyMetric,
  BusinessIdea,
  ContentIdea,
  Course,
  Exam,
  FitnessSession,
  Goal,
  Habit,
  Idea,
  JournalEntry,
  Language,
  LanguageSession,
  Lead,
  Outreach,
  PR,
  Revenue,
  Skill,
  Strategy,
  Task,
  Trade,
  WeeklyReview,
} from "./types";

const nowISO = () => new Date().toISOString();
const newId = () =>
  "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

type Updater<T> = Partial<Omit<T, "id" | "createdAt">>;

export type CollectionKey =
  | "goals"
  | "tasks"
  | "habits"
  | "courses"
  | "assignments"
  | "exams"
  | "leads"
  | "outreach"
  | "businessIdeas"
  | "revenue"
  | "applications"
  | "skills"
  | "sessions"
  | "prs"
  | "body"
  | "languages"
  | "langSessions"
  | "trades"
  | "strategies"
  | "content"
  | "books"
  | "journal"
  | "weekly"
  | "ideas"
  | "events";

interface Record_ {
  id: string;
  createdAt: string;
  updatedAt: string;
  [k: string]: unknown;
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
  action?: { label: string; run: () => void };
}

export interface FormRequest {
  collection: CollectionKey;
  mode: "add" | "edit";
  data?: Record<string, unknown> & { id: string };
}

/**
 * A pending write that failed to reach the server. Persisted to localStorage
 * so it survives page reload (the previous design lost failed writes silently
 * once the user refreshed). Replayed at the start of every loadAll().
 */
export type PendingOp =
  | { id: string; kind: "create"; collection: CollectionKey; item: Record_; attempts: number; lastError?: string }
  | { id: string; kind: "update"; collection: CollectionKey; recordId: string; patch: Record<string, unknown>; attempts: number; lastError?: string }
  | { id: string; kind: "delete"; collection: CollectionKey; recordId: string; attempts: number; lastError?: string };

const OUTBOX_KEY = "life-os::outbox";
const SIDEBAR_KEY = "life-os::sidebar";
const THEME_KEY = "life-os::theme";

export type Theme = "dark" | "light";

const readTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

/** Reflect the theme on <html> (class + color-scheme) and persist it. */
const applyTheme = (theme: Theme) => {
  try {
    const el = document.documentElement;
    el.classList.toggle("light", theme === "light");
    el.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
};

const readOutbox = (): PendingOp[] => {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as PendingOp[]) : [];
  } catch {
    return [];
  }
};
const writeOutbox = (outbox: PendingOp[]) => {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {
    /* quota / private mode */
  }
};

interface State {
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  leads: Lead[];
  outreach: Outreach[];
  businessIdeas: BusinessIdea[];
  revenue: Revenue[];
  applications: Application[];
  skills: Skill[];
  sessions: FitnessSession[];
  prs: PR[];
  body: BodyMetric[];
  languages: Language[];
  langSessions: LanguageSession[];
  trades: Trade[];
  strategies: Strategy[];
  content: ContentIdea[];
  books: Book[];
  journal: JournalEntry[];
  weekly: WeeklyReview[];
  ideas: Idea[];
  events: CalendarEvent[];
  theme: Theme;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  formRequest: FormRequest | null;
  status: LoadStatus;
  error: string | null;
  syncPending: number;
  lastSyncedAt: number | null;
  toasts: Toast[];
  outbox: PendingOp[];
}

interface Actions {
  loadAll: () => Promise<void>;
  flushOutbox: () => Promise<{ ok: number; failed: number }>;
  discardOutbox: () => void;
  discardOp: (opId: string) => void;

  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setMobileNav: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  openForm: (
    collection: CollectionKey,
    mode: "add" | "edit",
    data?: Record<string, unknown> & { id: string }
  ) => void;
  closeForm: () => void;

  pushToast: (t: Omit<Toast, "id">) => string;
  dismissToast: (id: string) => void;

  create: <T extends object>(collection: CollectionKey, data: T) => Record_;
  patch: (collection: CollectionKey, id: string, u: Record<string, unknown>) => void;
  destroy: (collection: CollectionKey, id: string) => void;

  clearAll: () => Promise<void>;
  importAll: (parsed: Record<string, unknown>) => Promise<{ inserted: number }>;
  exportJSON: () => string;

  addTask: (t: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, u: Updater<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;

  addGoal: (g: Omit<Goal, "id" | "createdAt" | "updatedAt">) => void;
  updateGoal: (id: string, u: Updater<Goal>) => void;
  deleteGoal: (id: string) => void;

  toggleHabit: (id: string, dateISO: string) => void;
  addHabit: (h: Omit<Habit, "id" | "createdAt" | "updatedAt">) => void;
  deleteHabit: (id: string) => void;

  addLead: (l: Omit<Lead, "id" | "createdAt" | "updatedAt">) => void;
  updateLead: (id: string, u: Updater<Lead>) => void;
  deleteLead: (id: string) => void;

  addApplication: (a: Omit<Application, "id" | "createdAt" | "updatedAt">) => void;
  updateApplication: (id: string, u: Updater<Application>) => void;
  deleteApplication: (id: string) => void;

  addSession: (s: Omit<FitnessSession, "id" | "createdAt" | "updatedAt">) => void;
  addPR: (p: Omit<PR, "id" | "createdAt" | "updatedAt">) => void;
  addBody: (b: Omit<BodyMetric, "id" | "createdAt" | "updatedAt">) => void;

  addLangSession: (s: Omit<LanguageSession, "id" | "createdAt" | "updatedAt">) => void;

  addTrade: (t: Omit<Trade, "id" | "createdAt" | "updatedAt">) => void;
  updateTrade: (id: string, u: Updater<Trade>) => void;
  deleteTrade: (id: string) => void;

  addJournal: (j: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => void;

  addContent: (c: Omit<ContentIdea, "id" | "createdAt" | "updatedAt">) => void;
  updateContent: (id: string, u: Updater<ContentIdea>) => void;

  addEvent: (e: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void;
  updateEvent: (id: string, u: Updater<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  addIdea: (i: Omit<Idea, "id" | "createdAt" | "updatedAt">) => void;
  updateIdea: (id: string, u: Updater<Idea>) => void;
  deleteIdea: (id: string) => void;
  toggleIdeaStar: (id: string) => void;

  updateSkill: (id: string, u: Updater<Skill>) => void;
}

type Store = State & Actions;

const emptyState: State = {
  goals: [],
  tasks: [],
  habits: [],
  courses: [],
  assignments: [],
  exams: [],
  leads: [],
  outreach: [],
  businessIdeas: [],
  revenue: [],
  applications: [],
  skills: [],
  sessions: [],
  prs: [],
  body: [],
  languages: [],
  langSessions: [],
  trades: [],
  strategies: [],
  content: [],
  books: [],
  journal: [],
  weekly: [],
  ideas: [],
  events: [],
  theme: readTheme(),
  sidebarCollapsed:
    typeof localStorage !== "undefined" &&
    localStorage.getItem(SIDEBAR_KEY) === "1",
  mobileNavOpen: false,
  commandOpen: false,
  formRequest: null,
  status: "idle",
  error: null,
  syncPending: 0,
  lastSyncedAt: null,
  toasts: [],
  outbox: readOutbox(),
};

const MAX_ATTEMPTS = 5;

/** Execute a single PendingOp against the API. */
/**
 * Mirrors the `@default(...)` values in schema.prisma for fields the add forms
 * don't submit. The optimistic row renders before the server replies, so
 * without these, pages crash on e.g. `habit.log.some()` until a reload.
 */
const recordDefaults: Partial<Record<CollectionKey, Record<string, unknown>>> = {
  goals: { tags: [] },
  tasks: { tags: [] },
  habits: { log: [], streak: 0 },
  exams: { topics: [] },
  applications: { stack: [] },
  skills: { resources: [], prereqs: [] },
  strategies: { rules: [] },
  ideas: { tags: [] },
  events: { tags: [] },
};

/**
 * Task completion lives in two fields: `done` (read by every page) and
 * `status` (what the edit form sets). Keep them in step so a task marked
 * "done" from the form really counts as done everywhere.
 */
const syncTaskDone = <T extends Record<string, unknown>>(
  collection: CollectionKey,
  data: T
): T =>
  collection === "tasks" && "status" in data && !("done" in data)
    ? { ...data, done: data.status === "done" }
    : data;

const runOp = (op: PendingOp) => {
  if (op.kind === "create") return api.create(op.collection, op.item);
  if (op.kind === "update") return api.update(op.collection, op.recordId, op.patch);
  return api.remove(op.collection, op.recordId);
};

/**
 * True if the error means the server permanently rejects this op — retrying
 * forever is pointless. Covers:
 *   - update/delete against a row that no longer exists (404 / "Record to … not found")
 *   - 4xx validation errors (Prisma "Argument …", "Unknown field …", "Invalid value …")
 * In those cases we drop the op from the outbox so the badge clears.
 * Network errors (TypeError: Failed to fetch) and 5xx are kept for retry.
 */
const isPermanentFailure = (op: PendingOp, errMsg: string): boolean => {
  // 404 on update/delete = row gone (e.g. after a reseed/wipe). Drop it.
  if ((op.kind === "update" || op.kind === "delete") && /\b404\b|Not found|Record to (update|delete) not found/i.test(errMsg)) {
    return true;
  }
  // 4xx validation: bad payload, will never succeed in current form.
  if (/^4\d\d\b/.test(errMsg) || /Argument .* (?:is missing|must be|expected)/i.test(errMsg) || /Unknown (?:arg|field)/i.test(errMsg)) {
    return true;
  }
  return false;
};

export const useStore = create<Store>()((set, get) => {
  /**
   * Enqueue + fire-and-forget a write. On failure, persist to the outbox so it
   * survives reload. Toast surfaces the failure with a Retry shortcut.
   */
  const track = (meta: PendingOp, isRetry = false) => {
    set((s) => ({ syncPending: s.syncPending + 1 }));
    runOp(meta)
      .then(() => {
        set((s) => {
          const outbox = s.outbox.filter((o) => o.id !== meta.id);
          writeOutbox(outbox);
          return {
            syncPending: Math.max(0, s.syncPending - 1),
            lastSyncedAt: Date.now(),
            outbox,
          };
        });
        if (isRetry) {
          get().pushToast({ kind: "success", message: `Saved ${meta.collection}.` });
        }
      })
      .catch((e) => {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error("[life-os sync]", meta.collection, errMsg);
        // Permanent failure: don't keep retrying forever — drop and surface the cause.
        if (isPermanentFailure(meta, errMsg)) {
          set((s) => {
            const outbox = s.outbox.filter((o) => o.id !== meta.id);
            writeOutbox(outbox);
            const next: Record<string, unknown> = {
              syncPending: Math.max(0, s.syncPending - 1),
              outbox,
            };
            // The row was only ever optimistic — the server never took it, so
            // drop it from the UI too instead of leaving a ghost behind.
            if (meta.kind === "create") {
              const rowId = (meta.item as Record_).id;
              next[meta.collection] = (
                s[meta.collection] as unknown as Record_[]
              ).filter((x) => x.id !== rowId);
            }
            return next as unknown as Partial<State>;
          });
          get().pushToast({
            kind: "error",
            message: `Dropped ${meta.kind} on ${meta.collection}: ${errMsg}`,
          });
          return;
        }
        set((s) => {
          // Replace or insert this op in the outbox (idempotent on retry).
          const existing = s.outbox.find((o) => o.id === meta.id);
          const outbox = existing
            ? s.outbox.map((o) =>
                o.id === meta.id
                  ? { ...o, attempts: o.attempts + 1, lastError: errMsg }
                  : o
              )
            : [...s.outbox, { ...meta, attempts: 1, lastError: errMsg } as PendingOp];
          writeOutbox(outbox);
          return {
            syncPending: Math.max(0, s.syncPending - 1),
            outbox,
          };
        });
        get().pushToast({
          kind: "error",
          message: `Couldn't save ${meta.collection} — kept locally, will auto-retry.`,
          action: { label: "Retry now", run: () => track(meta, true) },
        });
      });
  };

  return {
    ...emptyState,

    /**
     * Drain pending writes serially before fetching fresh state, so the
     * server-side bootstrap reflects any local-only changes from a previous
     * failed sync session.
     */
    flushOutbox: async () => {
      const pending = [...get().outbox];
      let ok = 0;
      let failed = 0;
      let dropped = 0;
      for (const op of pending) {
        if (op.attempts >= MAX_ATTEMPTS) {
          failed++;
          continue;
        }
        try {
          await runOp(op);
          set((s) => {
            const outbox = s.outbox.filter((o) => o.id !== op.id);
            writeOutbox(outbox);
            return { outbox, lastSyncedAt: Date.now() };
          });
          ok++;
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          // Drop hopeless ops (gone rows, validation errors) so the badge clears.
          if (isPermanentFailure(op, errMsg)) {
            set((s) => {
              const outbox = s.outbox.filter((o) => o.id !== op.id);
              writeOutbox(outbox);
              return { outbox };
            });
            dropped++;
            continue;
          }
          set((s) => {
            const outbox = s.outbox.map((o) =>
              o.id === op.id
                ? { ...o, attempts: o.attempts + 1, lastError: errMsg }
                : o
            );
            writeOutbox(outbox);
            return { outbox };
          });
          failed++;
        }
      }
      if (dropped > 0) {
        get().pushToast({
          kind: "info",
          message: `Cleared ${dropped} stale write${dropped > 1 ? "s" : ""} that no longer apply.`,
        });
      }
      return { ok, failed };
    },

    discardOutbox: () => {
      writeOutbox([]);
      set({ outbox: [] });
    },
    discardOp: (opId) => {
      set((s) => {
        const outbox = s.outbox.filter((o) => o.id !== opId);
        writeOutbox(outbox);
        return { outbox };
      });
    },

    loadAll: async () => {
      set({ status: "loading", error: null });
      // Flush queued writes FIRST so /bootstrap returns the merged truth.
      if (get().outbox.length > 0) {
        const { ok, failed } = await get().flushOutbox();
        if (ok > 0) {
          get().pushToast({
            kind: "success",
            message: `Synced ${ok} pending change${ok > 1 ? "s" : ""}.`,
          });
        }
        if (failed > 0) {
          get().pushToast({
            kind: "error",
            message: `${failed} change${failed > 1 ? "s" : ""} still can't sync — see Data menu.`,
          });
        }
      }
      try {
        const data = await api.bootstrap();
        const next: Record<string, unknown> = {};
        for (const [storeKey, url] of Object.entries(RESOURCE_URL)) {
          next[storeKey] = data[url] ?? [];
        }
        set({ ...(next as Partial<State>), status: "ready" });
      } catch (e) {
        set({
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    },

    toggleSidebar: () =>
      set((s) => {
        const v = !s.sidebarCollapsed;
        try {
          localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
        } catch {
          /* ignore */
        }
        return { sidebarCollapsed: v };
      }),

    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },
    toggleTheme: () => {
      const next: Theme = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      set({ theme: next });
    },

    setMobileNav: (open) => set({ mobileNavOpen: open }),
    setCommandOpen: (open) => set({ commandOpen: open }),
    openForm: (collection, mode, data) =>
      set({ formRequest: { collection, mode, data }, commandOpen: false }),
    closeForm: () => set({ formRequest: null }),

    pushToast: (t) => {
      const id = newId();
      set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
      if (t.kind !== "error") {
        setTimeout(() => get().dismissToast(id), 4000);
      }
      return id;
    },
    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

    create: (collection, data) => {
      const item = {
        ...recordDefaults[collection],
        ...syncTaskDone(collection, data as Record<string, unknown>),
        id: newId(),
        createdAt: nowISO(),
        updatedAt: nowISO(),
      } as Record_;
      set((s) => ({
        [collection]: [item, ...(s[collection] as unknown as Record_[])],
      }) as unknown as Partial<State>);
      track({
        id: newId(),
        kind: "create",
        collection,
        item,
        attempts: 0,
      });
      return item;
    },
    patch: (collection, id, patchIn) => {
      const u = syncTaskDone(collection, patchIn);
      set((s) => ({
        [collection]: (s[collection] as unknown as Record_[]).map((x) =>
          x.id === id ? { ...x, ...u, updatedAt: nowISO() } : x
        ),
      }) as unknown as Partial<State>);
      track({
        id: newId(),
        kind: "update",
        collection,
        recordId: id,
        patch: u,
        attempts: 0,
      });
    },
    destroy: (collection, id) => {
      set((s) => ({
        [collection]: (s[collection] as unknown as Record_[]).filter(
          (x) => x.id !== id
        ),
      }) as unknown as Partial<State>);
      track({
        id: newId(),
        kind: "delete",
        collection,
        recordId: id,
        attempts: 0,
      });
    },

    clearAll: async () => {
      // Drop any pending writes — they'd reinstate rows we're trying to delete.
      writeOutbox([]);
      set({ outbox: [] });
      await api.wipe();
      await get().loadAll();
      get().pushToast({ kind: "info", message: "Blank slate ready. Build it your way." });
    },
    importAll: async (parsed) => {
      writeOutbox([]);
      set({ outbox: [] });
      const payload: Record<string, unknown[]> = {};
      for (const [storeKey, url] of Object.entries(RESOURCE_URL)) {
        const v = (parsed as Record<string, unknown>)[storeKey];
        if (Array.isArray(v)) payload[url] = v as unknown[];
      }
      if (Object.keys(payload).length === 0) {
        throw new Error("No Life-OS collections found in this file.");
      }
      const res = await api.importAll(payload);
      await get().loadAll();
      get().pushToast({
        kind: "success",
        message: `Restored ${res.inserted} records from backup.`,
      });
      return res;
    },
    exportJSON: () => {
      const s = get();
      const keys = Object.keys(RESOURCE_URL) as (keyof State)[];
      const dump: Record<string, unknown> = {};
      keys.forEach((k) => (dump[k] = s[k]));
      return JSON.stringify(dump, null, 2);
    },

    /* ---- NAMED CONVENIENCE ACTIONS (delegate to generic CRUD) ---- */
    addTask: (t) => void get().create("tasks", t),
    updateTask: (id, u) => get().patch("tasks", id, u),
    deleteTask: (id) => get().destroy("tasks", id),
    toggleTaskDone: (id) => {
      const t = get().tasks.find((x) => x.id === id);
      if (!t) return;
      const done = !t.done;
      get().patch("tasks", id, { done, status: done ? "done" : "in_progress" });
    },

    addGoal: (g) => void get().create("goals", g),
    updateGoal: (id, u) => get().patch("goals", id, u),
    deleteGoal: (id) => get().destroy("goals", id),

    toggleHabit: (id, dateISO) => {
      const h = get().habits.find((x) => x.id === id);
      if (!h) return;
      const day = dateISO.slice(0, 10);
      const has = h.log.some((d) => d.slice(0, 10) === day);
      const log = has
        ? h.log.filter((d) => d.slice(0, 10) !== day)
        : [dateISO, ...h.log];
      // Persist the derived streak too, so the stored field stays truthful
      // (it was previously left stale and read by nothing).
      get().patch("habits", id, { log, streak: computeStreak(log) });
    },
    addHabit: (h) => void get().create("habits", h),
    deleteHabit: (id) => get().destroy("habits", id),

    addLead: (l) => void get().create("leads", l),
    updateLead: (id, u) => get().patch("leads", id, u),
    deleteLead: (id) => get().destroy("leads", id),

    addApplication: (a) => void get().create("applications", a),
    updateApplication: (id, u) => get().patch("applications", id, u),
    deleteApplication: (id) => get().destroy("applications", id),

    addSession: (s) => void get().create("sessions", s),
    addPR: (p) => void get().create("prs", p),
    addBody: (b) => void get().create("body", b),

    addLangSession: (ls) => void get().create("langSessions", ls),

    addTrade: (t) => void get().create("trades", t),
    updateTrade: (id, u) => get().patch("trades", id, u),
    deleteTrade: (id) => get().destroy("trades", id),

    addJournal: (j) => void get().create("journal", j),

    addContent: (c) => void get().create("content", c),
    updateContent: (id, u) => get().patch("content", id, u),

    addEvent: (e) => void get().create("events", e),
    updateEvent: (id, u) => get().patch("events", id, u),
    deleteEvent: (id) => get().destroy("events", id),

    addIdea: (i) => void get().create("ideas", i),
    updateIdea: (id, u) => get().patch("ideas", id, u),
    deleteIdea: (id) => get().destroy("ideas", id),
    toggleIdeaStar: (id) => {
      const idea = get().ideas.find((x) => x.id === id);
      if (!idea) return;
      get().patch("ideas", id, { starred: !idea.starred });
    },

    updateSkill: (id, u) => get().patch("skills", id, u),
  };
});
