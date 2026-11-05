import { PrismaClient } from "@prisma/client";

// Single Prisma instance for the whole server.
export const prisma = new PrismaClient({
  log: ["warn", "error"],
});
