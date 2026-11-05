/**
 * Life OS — central type system.
 * Every entity has: id, createdAt, updatedAt. Status & priority use shared enums.
 */

export type ID = string;

export type Status =
  | "backlog"
  | "planned"
  | "in_progress"
  | "blocked"
  | "done"
  | "archived";

export type Priority = "p0" | "p1" | "p2" | "p3";

export type Confidence = 1 | 2 | 3 | 4 | 5;

export interface Base {
  id: ID;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/* =========================================================================
   PLANNING — Goals, Tasks, Habits
   ========================================================================= */

export type Module =
  | "home"
  | "university"
  | "business"
  | "career"
  | "skills"
  | "fitness"
  | "languages"
  | "finance"
  | "brand"
  | "reading"
  | "journal"
  | "roadmap";

export interface Goal extends Base {
  title: string;
  description?: string;
  module: Module;
  horizon: "year" | "quarter" | "month" | "week";
  status: Status;
  priority: Priority;
  progress: number; // 0–100 (manual)
  /** When true, the UI derives progress from tasks-done / tasks-total in this goal's module. */
  autoProgress?: boolean;
  deadline?: string; // ISO
  tags: string[];
  notes?: string;
}

export interface Task extends Base {
  title: string;
  description?: string;
  module: Module;
  status: Status;
  priority: Priority;
  due?: string; // ISO
  estimateMin?: number;
  tags: string[];
  linkedGoalId?: ID;
  linkedProjectId?: ID;
  done?: boolean;
}

export interface Habit extends Base {
  name: string;
  cue?: string;
  cadence: "daily" | "weekly";
  targetPerWeek?: number;
  module: Module;
  /** ISO dates the habit was completed */
  log: string[];
  streak: number;
  active: boolean;
}

/* =========================================================================
   UNIVERSITY
   ========================================================================= */

export interface Course extends Base {
  code: string;
  name: string;
  credits: number;
  instructor?: string;
  grade?: string;
  progress: number;
  examDate?: string;
  notes?: string;
  color?: string;
}

export interface Assignment extends Base {
  courseId: ID;
  title: string;
  type: "homework" | "lab" | "project" | "report" | "presentation";
  due: string;
  status: Status;
  weight?: number;
  grade?: number;
  notes?: string;
}

export interface Exam extends Base {
  courseId: ID;
  date: string;
  topics: string[];
  confidence: Confidence;
  studied: number; // hours
  target: number; // hours target
  notes?: string;
}

/* =========================================================================
   BUSINESS — CRM
   ========================================================================= */

export type LeadStage =
  | "prospect"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Lead extends Base {
  name: string;
  business: string;
  industry?: string;
  channel: "instagram" | "linkedin" | "email" | "cold_call" | "referral" | "other";
  stage: LeadStage;
  value: number; // expected deal value
  contact?: string;
  /** What kind of work this deal is for (website, automation, etc.). */
  serviceType?:
    | "website"
    | "automation"
    | "social_media"
    | "booking_system"
    | "branding"
    | "seo"
    | "ads"
    | "other";
  notes?: string;
  lastTouch?: string;
  city?: string;
}

export interface Outreach extends Base {
  leadId: ID;
  date: string;
  channel: string;
  message?: string;
  response?: "none" | "interested" | "not_interested" | "follow_up";
}

export interface BusinessIdea extends Base {
  title: string;
  category: "agency" | "saas" | "automation" | "content" | "local" | "other";
  excitement: 1 | 2 | 3 | 4 | 5;
  feasibility: 1 | 2 | 3 | 4 | 5;
  monthlyPotential?: number;
  status: Status;
  notes?: string;
}

export interface Revenue extends Base {
  source: string;
  amount: number; // EUR
  date: string;
  recurring: boolean;
  notes?: string;
}

/* =========================================================================
   CAREER
   ========================================================================= */

export interface Application extends Base {
  company: string;
  role: string;
  type: "internship" | "full_time" | "freelance";
  location?: string;
  stack?: string[];
  stage:
    | "researching"
    | "applied"
    | "screening"
    | "interview"
    | "offer"
    | "rejected"
    | "accepted";
  applied?: string;
  link?: string;
  notes?: string;
  salary?: number;
}

/* =========================================================================
   SKILL TREE
   ========================================================================= */

export type SkillDomain =
  | "languages"
  | "backend"
  | "frontend"
  | "data"
  | "devops"
  | "cloud"
  | "ai"
  | "security"
  | "quant"
  | "systems"
  | "physical";

export interface Skill extends Base {
  name: string;
  domain: SkillDomain;
  level: 0 | 1 | 2 | 3 | 4 | 5; // 0 unknown, 5 expert
  target: 1 | 2 | 3 | 4 | 5;
  confidence: Confidence;
  status: "locked" | "active" | "mastered";
  resources: string[];
  projectIdea?: string;
  deadline?: string;
  notes?: string;
  /** prerequisite skill ids for tree edges */
  prereqs: ID[];
}

/* =========================================================================
   FITNESS
   ========================================================================= */

export type FitnessKind = "gym" | "run" | "swim" | "mobility" | "cross";

export interface FitnessSession extends Base {
  date: string;
  kind: FitnessKind;
  duration: number; // minutes
  /** e.g. distance km for run/swim, total tonnage kg for gym */
  load?: number;
  rpe?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  notes?: string;
  exercises?: { name: string; sets: number; reps: number; weight: number }[];
}

export interface PR extends Base {
  lift: string;
  /** A record is either a lift (weight × reps) or a time ("28:00"). */
  weight?: number;
  reps?: number;
  time?: string;
  date: string;
  bodyweight?: number;
}

export interface BodyMetric extends Base {
  date: string;
  weight?: number; // kg (optional so a mood/energy check-in can stand alone)
  sleep?: number; // hours
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  focus?: 1 | 2 | 3 | 4 | 5; // daily operating signal
  notes?: string;
}

/* =========================================================================
   LANGUAGES
   ========================================================================= */

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface Language extends Base {
  name: string;
  level: CEFR;
  target: CEFR;
  priority: Priority;
  active: boolean;
  notes?: string;
}

export interface LanguageSession extends Base {
  languageId: ID;
  date: string;
  minutes: number;
  type: "vocab" | "grammar" | "speaking" | "listening" | "reading" | "writing";
  resource?: string;
  notes?: string;
}

/* =========================================================================
   FINANCE / TRADING
   ========================================================================= */

export interface Trade extends Base {
  symbol: string;
  side: "long" | "short";
  entry: number;
  exit?: number;
  size: number;
  date: string;
  closed?: string;
  pnl?: number;
  strategy: string;
  regime?: "trend" | "range" | "volatile" | "quiet";
  rr?: number;
  notes?: string;
  emotion?: 1 | 2 | 3 | 4 | 5;
}

export interface Strategy extends Base {
  name: string;
  market: "forex" | "crypto" | "stocks" | "indices";
  description?: string;
  rules: string[];
  winRate?: number;
  expectancy?: number;
  status: "research" | "backtest" | "paper" | "live" | "retired";
}

/* =========================================================================
   PERSONAL BRAND
   ========================================================================= */

export type Platform = "instagram" | "linkedin" | "youtube" | "github" | "x";

export interface ContentIdea extends Base {
  title: string;
  pillar: string; // e.g. "Expertise", "Process", "Story"
  platform: Platform;
  format: "reel" | "carousel" | "post" | "video" | "thread" | "short";
  status: "idea" | "scripting" | "filming" | "editing" | "scheduled" | "posted";
  hook?: string;
  cta?: string;
  scheduledFor?: string;
  performance?: { views?: number; likes?: number; saves?: number };
  notes?: string;
}

/* =========================================================================
   READING & JOURNAL
   ========================================================================= */

export interface Book extends Base {
  title: string;
  author: string;
  category: string;
  status: "to_read" | "reading" | "read" | "abandoned";
  progress: number; // pages or %
  rating?: 1 | 2 | 3 | 4 | 5;
  startedAt?: string;
  finishedAt?: string;
  takeaways?: string;
}

export interface JournalEntry extends Base {
  date: string; // YYYY-MM-DD
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  wins?: string;
  lessons?: string;
  tomorrow?: string;
  gratitude?: string;
  free?: string;
}

export interface WeeklyReview extends Base {
  weekStart: string;
  wins: string;
  losses: string;
  lessons: string;
  nextWeek: string;
  scores: {
    study: number;
    business: number;
    fitness: number;
    brand: number;
    discipline: number;
  };
}

/* =========================================================================
   IDEAS / NOTEBOOK — inspirational sparks
   ========================================================================= */

export type IdeaCategory =
  | "life"
  | "business"
  | "creative"
  | "tech"
  | "learning"
  | "other";

export interface Idea extends Base {
  title: string;
  body?: string; // the idea itself
  spark?: string; // what triggered it / source of inspiration
  category: IdeaCategory;
  excitement: 1 | 2 | 3 | 4 | 5;
  status: "spark" | "exploring" | "building" | "shelved";
  starred: boolean;
  tags: string[];
}


/* =========================================================================
   CALENDAR — dated things that matter (the month view)
   ========================================================================= */

export type EventKind =
  | "milestone"
  | "deadline"
  | "meeting"
  | "travel"
  | "personal"
  | "reminder";

export interface CalendarEvent extends Base {
  title: string;
  /** Day of the event (start day when it spans several days). ISO. */
  date: string;
  /** Optional last day for multi-day events. ISO. */
  endDate?: string;
  /** "HH:MM" — empty means all-day. */
  time?: string;
  kind: EventKind;
  module?: Module;
  location?: string;
  notes?: string;
  tags: string[];
}
