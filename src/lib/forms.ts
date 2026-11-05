/**
 * Field configs that drive the EntityForm modal for every collection.
 * Add/Edit forms across the app are generated from these — change a field here
 * and it updates everywhere that entity is created or edited.
 */
import type { EntitySchema, FieldDef } from "@/components/form";
import type { CollectionKey } from "@/lib/store";

const opt = (...vals: string[]) =>
  vals.map((v) => ({
    value: v,
    label: v
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

const STATUS = opt("backlog", "planned", "in_progress", "blocked", "done", "archived");
const PRIORITY = [
  { value: "p0", label: "P0 · Critical" },
  { value: "p1", label: "P1 · High" },
  { value: "p2", label: "P2 · Medium" },
  { value: "p3", label: "P3 · Low" },
];
const MODULES = opt(
  "home", "university", "business", "career",
  "skills", "fitness", "languages", "finance", "brand", "reading", "journal", "roadmap"
);
const CEFR = opt("A1", "A2", "B1", "B2", "C1", "C2");

const f = (def: FieldDef): FieldDef => def;

export const formSchemas: Partial<Record<CollectionKey, EntitySchema>> = {
  goals: {
    title: "Goal",
    fields: [
      f({ key: "title", label: "Title", type: "text", required: true, full: true }),
      f({ key: "module", label: "Area", type: "select", options: MODULES }),
      f({ key: "horizon", label: "Horizon", type: "select", options: opt("year", "quarter", "month", "week") }),
      f({ key: "status", label: "Status", type: "select", options: STATUS }),
      f({ key: "priority", label: "Priority", type: "select", options: PRIORITY }),
      f({ key: "progress", label: "Progress %", type: "number", min: 0, max: 100, help: "Manual value — ignored when auto-progress is on." }),
      f({ key: "autoProgress", label: "Auto-progress from tasks", type: "checkbox", help: "When on, progress = tasks done / total in this area." }),
      f({ key: "deadline", label: "Deadline", type: "date" }),
      f({ key: "tags", label: "Tags", type: "tags" }),
      f({ key: "description", label: "Description", type: "textarea" }),
    ],
  },
  tasks: {
    title: "Task",
    fields: [
      f({ key: "title", label: "Title", type: "text", required: true, full: true }),
      f({ key: "module", label: "Area", type: "select", options: MODULES }),
      f({ key: "status", label: "Status", type: "select", options: STATUS }),
      f({ key: "priority", label: "Priority", type: "select", options: PRIORITY }),
      f({ key: "due", label: "Due", type: "date" }),
      f({ key: "estimateMin", label: "Estimate (min)", type: "number", min: 0 }),
      f({ key: "linkedGoalId", label: "Link to goal", type: "select", help: "Optional. Linked tasks contribute to that goal's progress." }),
      f({ key: "tags", label: "Tags", type: "tags" }),
      f({ key: "description", label: "Notes", type: "textarea" }),
    ],
  },
  habits: {
    title: "Habit",
    fields: [
      f({ key: "name", label: "Habit", type: "text", required: true, full: true }),
      f({ key: "cadence", label: "Cadence", type: "select", options: opt("daily", "weekly") }),
      f({ key: "module", label: "Area", type: "select", options: MODULES }),
      f({ key: "targetPerWeek", label: "Target / week", type: "number", min: 1, max: 7 }),
      f({ key: "cue", label: "Cue / trigger", type: "text", full: true }),
      f({ key: "active", label: "Active", type: "checkbox" }),
    ],
  },
  courses: {
    title: "Course",
    fields: [
      f({ key: "code", label: "Code", type: "text", required: true }),
      f({ key: "name", label: "Name", type: "text", required: true }),
      f({ key: "credits", label: "Credits (ECTS)", type: "number", min: 0 }),
      f({ key: "instructor", label: "Instructor", type: "text" }),
      f({ key: "progress", label: "Progress %", type: "number", min: 0, max: 100 }),
      f({ key: "grade", label: "Grade", type: "text" }),
      f({ key: "examDate", label: "Exam date", type: "date" }),
      f({ key: "color", label: "Accent", type: "select", options: opt("cyan", "gold", "emerald", "violet", "rose") }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  assignments: {
    title: "Assignment",
    fields: [
      f({ key: "title", label: "Title", type: "text", required: true, full: true }),
      f({ key: "courseId", label: "Course", type: "select" }), // dynamic
      f({ key: "type", label: "Type", type: "select", options: opt("homework", "lab", "project", "report", "presentation") }),
      f({ key: "due", label: "Due", type: "date" }),
      f({ key: "status", label: "Status", type: "select", options: STATUS }),
      f({ key: "weight", label: "Weight %", type: "number", min: 0, max: 100 }),
      f({ key: "grade", label: "Grade", type: "number" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  exams: {
    title: "Exam",
    fields: [
      f({ key: "courseId", label: "Course", type: "select" }), // dynamic
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "confidence", label: "Confidence", type: "range", min: 1, max: 5 }),
      f({ key: "studied", label: "Studied (h)", type: "number", min: 0 }),
      f({ key: "target", label: "Target (h)", type: "number", min: 0 }),
      f({ key: "topics", label: "Topics", type: "tags" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  leads: {
    title: "Lead",
    fields: [
      f({ key: "business", label: "Business", type: "text", required: true }),
      f({ key: "name", label: "Contact name", type: "text" }),
      f({ key: "industry", label: "Industry", type: "text" }),
      f({ key: "channel", label: "Channel", type: "select", options: opt("instagram", "linkedin", "email", "cold_call", "referral", "other") }),
      f({ key: "stage", label: "Stage", type: "select", options: opt("prospect", "contacted", "qualified", "proposal", "negotiation", "won", "lost") }),
      f({ key: "serviceType", label: "Service type", type: "select", options: opt("website", "automation", "social_media", "booking_system", "branding", "seo", "ads", "other") }),
      f({ key: "value", label: "Deal value (€)", type: "money", min: 0 }),
      f({ key: "contact", label: "Contact / phone", type: "text" }),
      f({ key: "city", label: "City", type: "text" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  businessIdeas: {
    title: "Business Idea",
    fields: [
      f({ key: "title", label: "Idea", type: "text", required: true, full: true }),
      f({ key: "category", label: "Category", type: "select", options: opt("agency", "saas", "automation", "content", "local", "other") }),
      f({ key: "excitement", label: "Excitement", type: "range", min: 1, max: 5 }),
      f({ key: "feasibility", label: "Feasibility", type: "range", min: 1, max: 5 }),
      f({ key: "monthlyPotential", label: "Monthly potential (€)", type: "money", min: 0 }),
      f({ key: "status", label: "Status", type: "select", options: STATUS }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  revenue: {
    title: "Revenue",
    fields: [
      f({ key: "source", label: "Source", type: "text", required: true, full: true }),
      f({ key: "amount", label: "Amount (€)", type: "money", required: true }),
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "recurring", label: "Recurring", type: "checkbox" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  applications: {
    title: "Application",
    fields: [
      f({ key: "company", label: "Company", type: "text", required: true }),
      f({ key: "role", label: "Role", type: "text", required: true }),
      f({ key: "type", label: "Type", type: "select", options: opt("internship", "full_time", "freelance") }),
      f({ key: "location", label: "Location", type: "text" }),
      f({ key: "stage", label: "Stage", type: "select", options: opt("researching", "applied", "screening", "interview", "offer", "rejected", "accepted") }),
      f({ key: "applied", label: "Applied on", type: "date" }),
      f({ key: "salary", label: "Salary", type: "money" }),
      f({ key: "stack", label: "Stack", type: "tags" }),
      f({ key: "link", label: "Link", type: "text", full: true }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  skills: {
    title: "Skill",
    fields: [
      f({ key: "name", label: "Skill", type: "text", required: true }),
      f({ key: "domain", label: "Domain", type: "select", options: opt("languages", "backend", "frontend", "data", "devops", "cloud", "ai", "security", "quant", "systems", "physical") }),
      f({ key: "level", label: "Current level", type: "range", min: 0, max: 5 }),
      f({ key: "target", label: "Target level", type: "range", min: 1, max: 5 }),
      f({ key: "confidence", label: "Confidence", type: "range", min: 1, max: 5 }),
      f({ key: "status", label: "Status", type: "select", options: opt("locked", "active", "mastered") }),
      f({ key: "prereqs", label: "Prerequisites", type: "multiselect", full: true, help: "Skills that should be mastered (or hit target) before this one unlocks." }),
      f({ key: "projectIdea", label: "Project idea", type: "text", full: true }),
      f({ key: "resources", label: "Resources", type: "tags", help: "Links or names — paste URLs to make them clickable." }),
      f({ key: "deadline", label: "Deadline", type: "date" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  sessions: {
    title: "Training Session",
    fields: [
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "kind", label: "Type", type: "select", options: opt("gym", "run", "swim", "mobility", "cross") }),
      f({ key: "duration", label: "Duration (min)", type: "number", min: 0, required: true }),
      f({ key: "load", label: "Load (km or kg tonnage)", type: "number", min: 0 }),
      f({ key: "rpe", label: "RPE", type: "range", min: 1, max: 10 }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  prs: {
    title: "Personal Record",
    fields: [
      f({ key: "lift", label: "Lift / event", type: "text", required: true, full: true, placeholder: "Bench Press, 5K run, 50m swim…" }),
      f({ key: "weight", label: "Weight (kg)", type: "number", min: 0, help: "For lifts. Leave empty for a time record." }),
      f({ key: "reps", label: "Reps", type: "number", min: 0 }),
      f({ key: "time", label: "Time", type: "text", placeholder: "28:00", help: "For runs, swims, rows — mm:ss." }),
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "bodyweight", label: "Bodyweight (kg)", type: "number", min: 0 }),
    ],
  },
  body: {
    title: "Daily Signal",
    fields: [
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "mood", label: "Mood", type: "range", min: 1, max: 5 }),
      f({ key: "energy", label: "Energy", type: "range", min: 1, max: 5 }),
      f({ key: "focus", label: "Focus", type: "range", min: 1, max: 5 }),
      f({ key: "sleep", label: "Sleep (h)", type: "number", min: 0, max: 14, step: 0.5 }),
      f({ key: "weight", label: "Weight (kg)", type: "number", min: 0 }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  languages: {
    title: "Language",
    fields: [
      f({ key: "name", label: "Language", type: "text", required: true }),
      f({ key: "level", label: "Current level", type: "select", options: CEFR }),
      f({ key: "target", label: "Target level", type: "select", options: CEFR }),
      f({ key: "priority", label: "Priority", type: "select", options: PRIORITY }),
      f({ key: "active", label: "Active", type: "checkbox" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  langSessions: {
    title: "Language Session",
    fields: [
      f({ key: "languageId", label: "Language", type: "select" }), // dynamic
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "minutes", label: "Minutes", type: "number", min: 0, required: true }),
      f({ key: "type", label: "Type", type: "select", options: opt("vocab", "grammar", "speaking", "listening", "reading", "writing") }),
      f({ key: "resource", label: "Resource", type: "text" }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  trades: {
    title: "Trade",
    fields: [
      f({ key: "symbol", label: "Symbol", type: "text", required: true }),
      f({ key: "side", label: "Side", type: "select", options: opt("long", "short") }),
      f({ key: "strategy", label: "Strategy", type: "text" }),
      f({ key: "regime", label: "Regime", type: "select", options: opt("trend", "range", "volatile", "quiet") }),
      f({ key: "entry", label: "Entry", type: "number" }),
      f({ key: "exit", label: "Exit", type: "number" }),
      f({ key: "size", label: "Size", type: "number" }),
      f({ key: "pnl", label: "P&L", type: "number" }),
      f({ key: "rr", label: "R:R", type: "number" }),
      f({ key: "date", label: "Opened", type: "date", required: true }),
      f({ key: "closed", label: "Closed", type: "date" }),
      f({ key: "emotion", label: "Emotion", type: "range", min: 1, max: 5 }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  strategies: {
    title: "Strategy",
    fields: [
      f({ key: "name", label: "Name", type: "text", required: true, full: true }),
      f({ key: "market", label: "Market", type: "select", options: opt("forex", "crypto", "stocks", "indices") }),
      f({ key: "status", label: "Status", type: "select", options: opt("research", "backtest", "paper", "live", "retired") }),
      f({ key: "winRate", label: "Win rate (0-1)", type: "number", min: 0, max: 1, step: 0.01 }),
      f({ key: "expectancy", label: "Expectancy (R)", type: "number", step: 0.01 }),
      f({ key: "rules", label: "Rules", type: "tags" }),
      f({ key: "description", label: "Description", type: "textarea" }),
    ],
  },
  content: {
    title: "Content Idea",
    fields: [
      f({ key: "title", label: "Title", type: "text", required: true, full: true }),
      f({ key: "pillar", label: "Pillar", type: "text" }),
      f({ key: "platform", label: "Platform", type: "select", options: opt("instagram", "linkedin", "youtube", "github", "x") }),
      f({ key: "format", label: "Format", type: "select", options: opt("reel", "carousel", "post", "video", "thread", "short") }),
      f({ key: "status", label: "Status", type: "select", options: opt("idea", "scripting", "filming", "editing", "scheduled", "posted") }),
      f({ key: "scheduledFor", label: "Scheduled for", type: "date" }),
      f({ key: "hook", label: "Hook", type: "textarea" }),
      f({ key: "cta", label: "CTA", type: "text", full: true }),
      f({ key: "notes", label: "Notes", type: "textarea" }),
    ],
  },
  books: {
    title: "Book",
    fields: [
      f({ key: "title", label: "Title", type: "text", required: true }),
      f({ key: "author", label: "Author", type: "text" }),
      f({ key: "category", label: "Category", type: "text" }),
      f({ key: "status", label: "Status", type: "select", options: opt("to_read", "reading", "read", "abandoned") }),
      f({ key: "progress", label: "Progress %", type: "number", min: 0, max: 100 }),
      f({ key: "rating", label: "Rating", type: "range", min: 1, max: 5 }),
      f({ key: "startedAt", label: "Started", type: "date" }),
      f({ key: "finishedAt", label: "Finished", type: "date" }),
      f({ key: "takeaways", label: "Takeaways", type: "textarea" }),
    ],
  },
  journal: {
    title: "Journal Entry",
    fields: [
      f({ key: "date", label: "Date", type: "dateonly", required: true }),
      f({ key: "mood", label: "Mood", type: "range", min: 1, max: 5 }),
      f({ key: "energy", label: "Energy", type: "range", min: 1, max: 5 }),
      f({ key: "wins", label: "Wins", type: "textarea" }),
      f({ key: "lessons", label: "Lessons", type: "textarea" }),
      f({ key: "tomorrow", label: "Tomorrow", type: "textarea" }),
      f({ key: "gratitude", label: "Gratitude", type: "textarea" }),
    ],
  },
  events: {
    title: "Event",
    fields: [
      f({ key: "title", label: "What is it?", type: "text", required: true, full: true }),
      f({ key: "date", label: "Date", type: "date", required: true }),
      f({ key: "time", label: "Time", type: "text", placeholder: "09:30 — leave empty for all day" }),
      f({ key: "kind", label: "Type", type: "select", options: opt("milestone", "deadline", "meeting", "travel", "personal", "reminder") }),
      f({ key: "module", label: "Area", type: "select", options: MODULES }),
      f({ key: "endDate", label: "Ends (multi-day)", type: "date", help: "Only for things that span several days — trips, exam weeks." }),
      f({ key: "location", label: "Where", type: "text" }),
      f({ key: "tags", label: "Tags", type: "tags" }),
      f({ key: "notes", label: "Notes", type: "textarea", full: true }),
    ],
  },
  ideas: {
    title: "Idea",
    fields: [
      f({ key: "title", label: "Idea", type: "text", required: true, full: true }),
      f({ key: "body", label: "The idea", type: "textarea", full: true, help: "Spell it out — what is it, why does it matter?" }),
      f({ key: "spark", label: "Spark", type: "text", full: true, help: "What inspired it? A book, a conversation, a shower thought…" }),
      f({ key: "category", label: "Category", type: "select", options: opt("life", "business", "creative", "tech", "learning", "other") }),
      f({ key: "status", label: "Status", type: "select", options: opt("spark", "exploring", "building", "shelved") }),
      f({ key: "excitement", label: "Excitement", type: "range", min: 1, max: 5 }),
      f({ key: "starred", label: "Star it", type: "checkbox" }),
      f({ key: "tags", label: "Tags", type: "tags" }),
    ],
  },
};

/** Sensible defaults pre-filled when opening an "Add" form per collection. */
export const addDefaults: Partial<Record<CollectionKey, Record<string, unknown>>> = {
  goals: { module: "university", horizon: "quarter", status: "in_progress", priority: "p1", progress: 0 },
  tasks: { module: "home", status: "planned", priority: "p2" },
  habits: { cadence: "daily", module: "home", active: true },
  courses: { credits: 5, progress: 0, color: "cyan" },
  assignments: { type: "homework", status: "planned", weight: 10 },
  exams: { confidence: 3, studied: 0, target: 15 },
  leads: { channel: "instagram", stage: "prospect", value: 500 },
  businessIdeas: { category: "automation", excitement: 4, feasibility: 4, status: "backlog" },
  revenue: { recurring: false },
  applications: { type: "internship", stage: "researching" },
  skills: { domain: "backend", level: 1, target: 4, confidence: 3, status: "active" },
  sessions: { kind: "gym", duration: 60, rpe: 7 },
  prs: { reps: 5 },
  body: { mood: 4, energy: 4, focus: 4 },
  languages: { level: "A1", target: "B1", priority: "p2", active: true },
  langSessions: { type: "vocab", minutes: 20 },
  trades: { side: "long", regime: "trend", size: 1 },
  strategies: { market: "forex", status: "research" },
  content: { platform: "instagram", format: "reel", status: "idea" },
  books: { status: "to_read", progress: 0 },
  journal: { mood: 4, energy: 4 },
  ideas: { category: "life", status: "spark", excitement: 4, starred: false },
  events: { kind: "milestone", module: "home" },
};
