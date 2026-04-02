import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db";
import { desc, eq, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/logs", async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const level = req.query.level as string;

  const condition = level && level !== "all" ? eq(activityLogsTable.level, level) : undefined;

  const logs = await db.select().from(activityLogsTable)
    .where(condition)
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  const [{ total }] = await db.select({ total: count() }).from(activityLogsTable)
    .where(condition);

  res.json({ logs, total });
});

export default router;
