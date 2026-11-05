/**
 * Thin REST client for the Life OS backend.
 * Base URL is overridable via VITE_API_URL; defaults to same-origin `/api`
 * (proxied to the local server by Vite) so it also works from a phone.
 */

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || "/api";

/** Maps a store collection key → backend resource URL segment. */
export const RESOURCE_URL: Record<string, string> = {
  goals: "goals",
  tasks: "tasks",
  habits: "habits",
  courses: "courses",
  assignments: "assignments",
  exams: "exams",
  leads: "leads",
  outreach: "outreach",
  businessIdeas: "business-ideas",
  revenue: "revenue",
  applications: "applications",
  skills: "skills",
  sessions: "sessions",
  prs: "prs",
  body: "body",
  languages: "languages",
  langSessions: "lang-sessions",
  trades: "trades",
  strategies: "strategies",
  content: "content",
  books: "books",
  journal: "journal",
  weekly: "weekly",
  ideas: "ideas",
  events: "events",
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  /** Fetch every collection in one round-trip; keys = backend resource URLs. */
  bootstrap: () => http<Record<string, unknown[]>>("/bootstrap"),
  health: () => http<{ ok: boolean }>("/health"),
  create: <T>(storeKey: string, body: unknown) =>
    http<T>(`/${RESOURCE_URL[storeKey]}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: <T>(storeKey: string, id: string, body: unknown) =>
    http<T>(`/${RESOURCE_URL[storeKey]}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (storeKey: string, id: string) =>
    http<{ ok: boolean }>(`/${RESOURCE_URL[storeKey]}/${id}`, {
      method: "DELETE",
    }),
  /** Wipe every collection on the server (blank slate). */
  wipe: () => http<{ ok: boolean }>("/_wipe", { method: "POST" }),
  /** Restore from a previously exported backup (payload keyed by resource URL). */
  importAll: (payload: Record<string, unknown[]>) =>
    http<{ ok: boolean; inserted: number }>("/_import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  /** AI daily brief — server-side generation via Anthropic API. */
  brief: () =>
    http<{ brief: string; generatedAt: string; cached: boolean }>("/brief"),
  briefRefresh: () =>
    http<{ brief: string; generatedAt: string; cached: boolean }>("/brief", {
      method: "POST",
    }),
  /** Parse a roadmap doc (text or PDF base64) into goals + day-by-day tasks. */
  planParse: (payload: {
    text?: string;
    pdfBase64?: string;
    notes?: string;
    today?: string;
  }) =>
    http<{
      goals: Array<Record<string, unknown>>;
      tasks: Array<Record<string, unknown>>;
      generatedAt: string;
    }>("/plan/parse", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
