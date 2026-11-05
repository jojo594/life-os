/**
 * Daily DB snapshot — dumps every collection to a single JSON file in
 * ~/Backups/lifeos/YYYY-MM-DD.json and prunes anything older than 7 days.
 *
 * Run manually:
 *   cd server && npm run snapshot
 *
 * Can be scheduled with launchd (macOS) or cron.
 *
 * Output format is **compatible with /api/_import** — i.e. the dump can be
 * fed straight back to `api.importAll()` if you ever need to restore from
 * one of these files. That makes this script the "you can sleep at night"
 * companion to the Docker volume that currently holds the DB.
 *
 * Local-only policy: writes to the local filesystem
 * only — never uploaded anywhere, no remote sync. Rotate / encrypt yourself
 * if the host disk isn't already encrypted.
 */
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

/** Mirrors `RESOURCES` in src/routes.ts — keep in sync if you add a model. */
const RESOURCES: { url: string; model: string }[] = [
  { url: "goals", model: "goal" },
  { url: "tasks", model: "task" },
  { url: "habits", model: "habit" },
  { url: "courses", model: "course" },
  { url: "assignments", model: "assignment" },
  { url: "exams", model: "exam" },
  { url: "papers", model: "paper" },
  { url: "experiments", model: "experiment" },
  { url: "milestones", model: "milestone" },
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
  { url: "checklist", model: "checklistItem" },
  { url: "prep-topics", model: "prepTopic" },
];

const RETENTION_DAYS = 7;
const BACKUP_DIR = path.join(os.homedir(), "Backups", "lifeos");

async function dump(): Promise<{ path: string; rows: number; bytes: number }> {
  const prisma = new PrismaClient();
  try {
    const out: Record<string, unknown[]> = {};
    let totalRows = 0;

    for (const r of RESOURCES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = await (prisma as any)[r.model].findMany({
        orderBy: { createdAt: "desc" },
      });
      out[r.url] = list;
      totalRows += list.length;
    }

    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const file = path.join(BACKUP_DIR, `${stamp}.json`);
    const json = JSON.stringify(out, null, 2);
    await fs.writeFile(file, json, "utf8");

    return { path: file, rows: totalRows, bytes: Buffer.byteLength(json) };
  } finally {
    await prisma.$disconnect();
  }
}

async function prune(): Promise<{ removed: string[] }> {
  // 7-day rolling retention. Anything older than RETENTION_DAYS gets deleted.
  const removed: string[] = [];
  try {
    const entries = await fs.readdir(BACKUP_DIR);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const fp = path.join(BACKUP_DIR, name);
      const stat = await fs.stat(fp);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(fp);
        removed.push(name);
      }
    }
  } catch (err) {
    // Directory may not exist on first run — non-fatal.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return { removed };
}

async function main() {
  const start = Date.now();
  console.log(`[snapshot] starting → ${BACKUP_DIR}`);
  const result = await dump();
  const pruned = await prune();
  const ms = Date.now() - start;
  const kb = (result.bytes / 1024).toFixed(1);
  console.log(
    `[snapshot] ok · ${result.rows} rows · ${kb} KB · ${ms}ms → ${result.path}`
  );
  if (pruned.removed.length) {
    console.log(`[snapshot] pruned ${pruned.removed.length}: ${pruned.removed.join(", ")}`);
  }
}

main().catch((err) => {
  console.error("[snapshot] FAILED:", err);
  process.exit(1);
});
