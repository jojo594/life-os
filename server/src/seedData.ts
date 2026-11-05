import type { PrismaClient } from "@prisma/client";

/** Delete every row in every table (no FK constraints — ids are loose refs). */
export async function wipeAll(prisma: PrismaClient) {
  await Promise.all([
    prisma.goal.deleteMany(),
    prisma.task.deleteMany(),
    prisma.habit.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.course.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.outreach.deleteMany(),
    prisma.businessIdea.deleteMany(),
    prisma.revenue.deleteMany(),
    prisma.application.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.session.deleteMany(),
    prisma.pR.deleteMany(),
    prisma.bodyMetric.deleteMany(),
    prisma.language.deleteMany(),
    prisma.languageSession.deleteMany(),
    prisma.trade.deleteMany(),
    prisma.strategy.deleteMany(),
    prisma.contentIdea.deleteMany(),
    prisma.book.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.weeklyReview.deleteMany(),
    prisma.idea.deleteMany(),
    prisma.calendarEvent.deleteMany(),
  ]);
}
