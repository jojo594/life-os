import { Router, type Request, type Response } from "express";
import { prisma } from "./db.js";

/**
 * Build a REST router for any Prisma model.
 *   GET    /         list (newest first)
 *   GET    /:id      read one
 *   POST   /         create
 *   PATCH  /:id      update
 *   DELETE /:id      delete
 *
 * The `model` arg matches the Prisma client property name (e.g. "goal",
 * "task", "businessIdea"). Errors return JSON with a useful message.
 */
type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  create: (args: { data: unknown }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

const getDelegate = (model: string): PrismaDelegate => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (prisma as any)[model];
  if (!d || typeof d.findMany !== "function") {
    throw new Error(`Unknown Prisma model: ${model}`);
  }
  return d as PrismaDelegate;
};

const handle = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[crud] ${req.method} ${req.originalUrl} →`, message);
      res.status(400).json({ error: message });
    }
  };

export function crudRouter(model: string, orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" }) {
  const router = Router();
  const d = getDelegate(model);

  router.get(
    "/",
    handle(async () => d.findMany({ orderBy }))
  );

  router.get(
    "/:id",
    handle(async (req, res) => {
      const item = await d.findUnique({ where: { id: req.params.id } });
      if (!item) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      return item;
    })
  );

  router.post(
    "/",
    handle(async (req) => {
      // Keep a client-supplied id (so optimistic UI stays in sync); if absent
      // the schema's @default(cuid()) generates one. Strip server timestamps.
      const { createdAt: _c, updatedAt: _u, ...data } = req.body || {};
      void _c; void _u;
      return d.create({ data });
    })
  );

  router.patch(
    "/:id",
    handle(async (req) => {
      const { id: _id, createdAt: _c, updatedAt: _u, ...data } = req.body || {};
      void _id; void _c; void _u;
      return d.update({ where: { id: req.params.id }, data });
    })
  );

  router.delete(
    "/:id",
    handle(async (req) => {
      await d.delete({ where: { id: req.params.id } });
      return { ok: true };
    })
  );

  return router;
}
