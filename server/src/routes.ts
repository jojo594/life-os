import { Router } from "express";
import { crudRouter } from "./crud.js";
import { prisma } from "./db.js";
import { wipeAll } from "./seedData.js";
import { briefRouter } from "./brief.js";
import { planRouter } from "./plan.js";

/**
 * Every entity is exposed under /api/<resource> with full CRUD.
 * The list maps URL resource → Prisma model.
 */
export const RESOURCES: { url: string; model: string }[] = [
  { url: "goals", model: "goal" },
  { url: "tasks", model: "task" },
  { url: "habits", model: "habit" },
  { url: "courses", model: "course" },
  { url: "assignments", model: "assignment" },
  { url: "exams", model: "exam" },
  { url: "leads", model: "lead" },
  { url: "outreach", model: "outreach" },
  { url: "business-ideas", model: "businessIdea" },
  { url: "revenue", model: "revenue" },
  { url: "applications", model: "application" },
  { url: "skills", model: "skill" },
  { url: "sessions", model: "session" },
  { url: "prs", model: "pR" },
  { url: "body", model: "bodyMetric" },
  { url: "languages", model: "language" },
  { url: "lang-sessions", model: "languageSession" },
  { url: "trades", model: "trade" },
  { url: "strategies", model: "strategy" },
  { url: "content", model: "contentIdea" },
  { url: "books", model: "book" },
  { url: "journal", model: "journalEntry" },
  { url: "weekly", model: "weeklyReview" },
  { url: "ideas", model: "idea" },
  { url: "events", model: "calendarEvent" },
];

export function mountRoutes() {
  const root = Router();

  // Health & meta
  root.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, db: "up", time: new Date().toISOString() });
    } catch (err) {
      res.status(503).json({ ok: false, db: "down", error: String(err) });
    }
  });

  root.get("/resources", (_req, res) => {
    res.json(RESOURCES.map((r) => r.url));
  });

  // Danger: wipe every row in every table ("Blank slate").
  root.post("/_wipe", async (_req, res) => {
    try {
      await wipeAll(prisma);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Restore from a previously exported backup. Body is keyed by resource URL
  // (the frontend maps store keys → URLs before sending). Replaces all data.
  root.post("/_import", async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    // Validate: must be an object containing at least one known resource array.
    const known = RESOURCES.some(
      (r) => Array.isArray(body[r.url]) && (body[r.url] as unknown[]).length >= 0
    );
    if (typeof body !== "object" || !known) {
      res
        .status(400)
        .json({ error: "Invalid backup: no recognizable Life-OS collections found." });
      return;
    }
    try {
      await wipeAll(prisma);
      let inserted = 0;
      for (const r of RESOURCES) {
        const rows = body[r.url];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // Strip server-managed timestamps; keep ids so references survive.
        const data = rows.map((row) => {
          const { createdAt: _c, updatedAt: _u, ...rest } = row as Record<string, unknown>;
          void _c; void _u;
          return rest;
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (prisma as any)[r.model].createMany({
          data,
          skipDuplicates: true,
        });
        inserted += result.count ?? data.length;
      }
      res.json({ ok: true, inserted });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Bulk export — every collection in one payload (frontend uses this on boot).
  root.get("/bootstrap", async (_req, res) => {
    try {
      const entries = await Promise.all(
        RESOURCES.map(async (r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = await (prisma as any)[r.model].findMany({
            orderBy: { createdAt: "desc" },
          });
          return [r.url, list] as const;
        })
      );
      res.json(Object.fromEntries(entries));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // AI daily brief
  root.use("/brief", briefRouter());

  // AI plan importer (turn roadmap → goals + scheduled tasks)
  root.use("/plan", planRouter());

  // Mount per-resource CRUD
  for (const r of RESOURCES) {
    root.use(`/${r.url}`, crudRouter(r.model));
  }

  return root;
}
