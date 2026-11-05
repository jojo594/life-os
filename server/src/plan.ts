/**
 * AI plan importer — takes a free-form roadmap (pasted text or PDF) and
 * decomposes it into structured goals + day-by-day tasks via Claude.
 *
 * POST /api/plan/parse
 *   body: { text?: string, pdfBase64?: string, today?: string, notes?: string }
 *   → { goals: [...], tasks: [...] }
 *
 * The frontend then inserts the result through the existing store actions,
 * so writes go through the same optimistic/outbox/CRUD pipeline as anything
 * else. Nothing is persisted by this route — it's a pure preview generator.
 *
 * Local-only policy: the Anthropic call originates here, so the API key never
 * enters the browser context. Mirror the brief.ts pattern. Do not move to FE.
 */
import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const MODULES = [
  "home", "university", "business", "career",
  "skills", "fitness", "languages", "finance", "brand", "reading", "journal", "roadmap",
] as const;
const STATUSES = ["backlog", "planned", "in_progress", "blocked", "done", "archived"] as const;
const HORIZONS = ["year", "quarter", "month", "week"] as const;
const PRIORITIES = ["p0", "p1", "p2", "p3"] as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

const SYSTEM_PROMPT = `You are a strategic operations planner for a Life-OS dashboard. The owner uses it to manage several areas of their life at once.

Your job: read a user-supplied roadmap (pasted text, markdown, or PDF) and convert it into:
1. A small, sharp list of OUTCOME-LEVEL GOALS (3-7 ideal, up to 12 max). Each goal owns ONE outcome.
2. A larger list of DAY-BY-DAY EXECUTION TASKS scheduled across upcoming days. Each task is something the owner can do in one focused block.

RULES
- Use the supplied "today" as the anchor date. All due dates are ISO YYYY-MM-DD, today or later.
- Spread tasks intelligently: cluster related work on consecutive days, respect dependencies, leave breathing room, never stack >6 tasks on a single day.
- For each task, set "due" to the specific day it should be executed. Prefer mornings of weekdays unless context says otherwise.
- Link tasks to goals by sharing the same "module". Pick the closest module from this list: ${MODULES.join(", ")}.
- Set goal "horizon" based on its deadline (week ≤ 14d, month ≤ 35d, quarter ≤ 100d, otherwise year).
- Set goal "status" to "in_progress" if work starts today/tomorrow, otherwise "planned".
- Set task "status" to "planned" by default.
- Priorities: p0 = mission-critical / time-bombed, p1 = high, p2 = medium (default), p3 = nice-to-have.
- Estimate per task in minutes (15–180 typical, must be a number).
- Be concrete in titles. "Read chapter 3 of <book>" beats "Study". "Email Acme follow-up" beats "Outreach".
- ALWAYS respond by calling the submit_plan tool. Do not write any prose.`;

const TOOL: Anthropic.Tool = {
  name: "submit_plan",
  description: "Submit the parsed goals + day-by-day execution tasks.",
  input_schema: {
    type: "object",
    required: ["goals", "tasks"],
    properties: {
      goals: {
        type: "array",
        description: "Outcome-level goals derived from the roadmap.",
        items: {
          type: "object",
          required: ["title", "module", "horizon", "priority", "status", "progress"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            module: { type: "string", enum: [...MODULES] },
            horizon: { type: "string", enum: [...HORIZONS] },
            status: { type: "string", enum: [...STATUSES] },
            priority: { type: "string", enum: [...PRIORITIES] },
            progress: { type: "number", minimum: 0, maximum: 100 },
            deadline: { type: "string", description: "ISO YYYY-MM-DD" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
      tasks: {
        type: "array",
        description: "Day-by-day execution tasks.",
        items: {
          type: "object",
          required: ["title", "module", "priority", "status", "due"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            module: { type: "string", enum: [...MODULES] },
            status: { type: "string", enum: [...STATUSES] },
            priority: { type: "string", enum: [...PRIORITIES] },
            due: { type: "string", description: "ISO YYYY-MM-DD" },
            estimateMin: { type: "number", minimum: 1, maximum: 480 },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
};

interface ParsedPlan {
  goals: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
}

export function planRouter() {
  const r = Router();

  r.post("/parse", async (req, res) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      res.status(503).json({
        error:
          "ANTHROPIC_API_KEY is not set in server/.env — add the key and restart the API server.",
      });
      return;
    }

    const body = req.body || {};
    const text: string | undefined = typeof body.text === "string" ? body.text.trim() : undefined;
    const pdfBase64: string | undefined =
      typeof body.pdfBase64 === "string" ? body.pdfBase64.trim() : undefined;
    const notes: string | undefined =
      typeof body.notes === "string" ? body.notes.trim() : undefined;
    const today: string =
      typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
        ? body.today
        : todayISO();

    if (!text && !pdfBase64) {
      res.status(400).json({ error: "Provide `text` or `pdfBase64`." });
      return;
    }

    // Build the multimodal user content. PDF gets a `document` block,
    // plus a text preamble with the anchor date + any extra notes.
    const preamble = [
      `Today is ${today}. Schedule from today forward.`,
      notes ? `User notes:\n${notes}` : null,
      text ? `Roadmap (verbatim):\n${text}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const userContent: Anthropic.MessageParam["content"] = [];
    if (pdfBase64) {
      userContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBase64,
        },
      });
    }
    userContent.push({ type: "text", text: preamble });

    try {
      const client = new Anthropic({ apiKey: key });
      const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 8192,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_plan" },
        messages: [{ role: "user", content: userContent }],
        thinking: { type: "adaptive" },
      });

      const toolUse = message.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_plan"
      );
      if (!toolUse) {
        res.status(502).json({ error: "Model did not call submit_plan." });
        return;
      }

      const plan = toolUse.input as ParsedPlan;
      // Light defensive validation — drop any rows missing required fields so
      // the frontend insert pass can't fail mid-way.
      const goals = (plan.goals || []).filter(
        (g) => g && typeof g.title === "string" && g.module && g.horizon && g.priority && g.status
      );
      const tasks = (plan.tasks || []).filter(
        (t) => t && typeof t.title === "string" && t.module && t.priority && t.status && t.due
      );

      res.json({ goals, tasks, generatedAt: new Date().toISOString() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[plan] parse error:", msg);
      res.status(500).json({ error: msg });
    }
  });

  return r;
}
