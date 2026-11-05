/**
 * AI daily brief — generates a 3-line ops summary from today's life-state
 * via the Anthropic API. All credentials stay in server/.env; the route
 * never leaks the key to the frontend.
 *
 * GET /api/brief        — returns the cached brief if fresh, otherwise generates.
 * POST /api/brief       — forces regeneration (used by the "Refresh" button).
 *
 * Cache: 4-hour in-memory TTL, keyed by ISO date. Survives until process restart.
 * No persistence to disk — by design, briefs are ephemeral.
 *
 * Local-only policy: the Anthropic call originates from
 * this server process, so the API key never enters the browser context. Do not
 * move this logic to the frontend.
 */
import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db.js";

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const STALE_DAYS = 14;

interface CacheEntry {
  brief: string;
  generatedAt: string; // ISO
  inputSnapshot: string; // hash-ish of inputs so we can detect drift
}

const cache = new Map<string, CacheEntry>();

const todayISO = () => new Date().toISOString().slice(0, 10);

const daysSince = (iso?: string | null) => {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
};

/**
 * Pull only the slices the brief actually uses, then compact each entry to
 * the few fields the model needs. Keeps the prompt small + fast.
 */
async function snapshot() {
  const today = todayISO();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tasks, exams, courses, leads, applications, sessions, body, journal] =
    await Promise.all([
      prisma.task.findMany({ where: { done: false }, orderBy: { priority: "asc" } }),
      prisma.exam.findMany({ orderBy: { date: "asc" }, take: 3 }),
      prisma.course.findMany(),
      prisma.lead.findMany({ where: { stage: { notIn: ["won", "lost"] } } }),
      prisma.application.findMany({
        where: { stage: { notIn: ["accepted", "rejected"] } },
      }),
      prisma.session.findMany({
        where: { date: { gte: weekAgo } },
        orderBy: { date: "desc" },
      }),
      prisma.bodyMetric.findMany({
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.journalEntry.findMany({
        orderBy: { date: "desc" },
        take: 2,
      }),
    ]);

  const todayTasks = tasks.filter(
    (t) => !t.due || t.due.toISOString().slice(0, 10) <= today
  );
  const overdue = tasks.filter(
    (t) => t.due && t.due.toISOString().slice(0, 10) < today
  );
  const nextExam = exams[0];
  const examCourse = nextExam
    ? courses.find((c) => c.id === nextExam.courseId)
    : undefined;
  const staleLeads = leads.filter(
    (l) => daysSince(l.lastTouch?.toISOString() ?? l.updatedAt.toISOString()) >= STALE_DAYS
  );
  const staleApps = applications.filter(
    (a) => daysSince(a.updatedAt.toISOString()) >= STALE_DAYS
  );
  const weekMinutes = sessions.reduce((s, x) => s + x.duration, 0);
  const todaySignal = body.find((b) => b.date.toISOString().slice(0, 10) === today);
  const lastJournal = journal[0];

  return {
    today,
    counts: {
      todayTasks: todayTasks.length,
      overdue: overdue.length,
      liveLeads: leads.length,
      staleLeads: staleLeads.length,
      liveApplications: applications.length,
      staleApplications: staleApps.length,
    },
    priorities: todayTasks.slice(0, 8).map((t) => ({
      title: t.title,
      module: t.module,
      priority: t.priority,
      due: t.due?.toISOString().slice(0, 10),
    })),
    nextExam: nextExam
      ? {
          course: examCourse ? `${examCourse.code} · ${examCourse.name}` : "exam",
          date: nextExam.date.toISOString().slice(0, 10),
          confidence: nextExam.confidence,
          studied: nextExam.studied,
          target: nextExam.target,
        }
      : null,
    week: {
      sessions: sessions.length,
      minutes: weekMinutes,
    },
    daily: todaySignal
      ? {
          mood: todaySignal.mood ?? null,
          energy: todaySignal.energy ?? null,
          focus: todaySignal.focus ?? null,
        }
      : null,
    moodTrend: body
      .slice(0, 5)
      .map((b) => b.mood)
      .filter((x): x is number => typeof x === "number"),
    lastJournal: lastJournal
      ? {
          date: lastJournal.date,
          wins: lastJournal.wins ?? null,
          lessons: lastJournal.lessons ?? null,
          tomorrow: lastJournal.tomorrow ?? null,
        }
      : null,
  };
}

const SYSTEM_PROMPT = `You are the daily ops officer for a user running a Life-OS dashboard.

Your job: deliver a sharp 3-line "ops brief" given today's life-state.

RULES:
- Exactly 3 lines, separated by single newlines. No more, no less.
- Line 1: The single biggest thing on deck today (the action that compounds most).
- Line 2: The risk or stale item that needs attention before EOD.
- Line 3: One signal-based observation — energy, momentum, or trajectory.
- Tone: direct, operator voice, no fluff, no emoji. 
- Reference concrete items by name when present (course code, exam date, lead/company name).
- If there is nothing in a slot, still write the line — substitute the next most relevant signal.
- Never start with "Today" or "Here is". Open with the verb or the noun.
- Each line stands alone. No "and also". Total response < 60 words.`;

/** Build the user-message data block. Compact JSON keeps the token count tight. */
function userBlock(snap: Awaited<ReturnType<typeof snapshot>>): string {
  return `Date: ${snap.today}\n\nLife-state snapshot (JSON):\n${JSON.stringify(snap, null, 2)}`;
}

async function generate(): Promise<CacheEntry> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set in server/.env — add the key and restart the API server."
    );
  }
  const client = new Anthropic({ apiKey: key });
  const snap = await snapshot();
  const userText = userBlock(snap);

  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Even though our prefix is below the 4096-token minimum on Opus 4.8
        // and won't actually cache, the marker is harmless and future-proofs
        // if we extend the system prompt later.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
    thinking: { type: "adaptive" },
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned an empty brief.");
  }

  return {
    brief: text,
    generatedAt: new Date().toISOString(),
    inputSnapshot: JSON.stringify(snap.counts),
  };
}

export function briefRouter() {
  const r = Router();

  // GET — serve cached if fresh, else generate.
  r.get("/", async (_req, res) => {
    const key = todayISO();
    const hit = cache.get(key);
    if (hit && Date.now() - new Date(hit.generatedAt).getTime() < TTL_MS) {
      res.json({
        brief: hit.brief,
        generatedAt: hit.generatedAt,
        cached: true,
      });
      return;
    }
    try {
      const entry = await generate();
      cache.set(key, entry);
      res.json({
        brief: entry.brief,
        generatedAt: entry.generatedAt,
        cached: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 503 lets the frontend distinguish "not configured" from other errors
      const code = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
      res.status(code).json({ error: msg });
    }
  });

  // POST — force regeneration (used by the Refresh button).
  r.post("/", async (_req, res) => {
    const key = todayISO();
    cache.delete(key);
    try {
      const entry = await generate();
      cache.set(key, entry);
      res.json({
        brief: entry.brief,
        generatedAt: entry.generatedAt,
        cached: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
      res.status(code).json({ error: msg });
    }
  });

  return r;
}
