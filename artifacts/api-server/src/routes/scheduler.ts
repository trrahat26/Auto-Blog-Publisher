import { Router, type IRouter } from "express";
import { runPostingJob, startScheduler, stopScheduler, getSchedulerState } from "../lib/scheduler";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/scheduler", async (_req, res) => {
  const { isRunning, lastRunAt, nextRunAt } = getSchedulerState();
  const settingsRows = await db.select().from(settingsTable).limit(1);
  const settings = settingsRows[0];

  res.json({
    enabled: settings?.schedulerEnabled ?? true,
    postsPerDay: settings?.postsPerDay ?? 2,
    nextRunAt: nextRunAt?.toISOString() || null,
    lastRunAt: lastRunAt?.toISOString() || null,
    isRunning,
  });
});

router.post("/scheduler/run", async (_req, res) => {
  runPostingJob();
  res.json({ success: true, message: "Scheduler triggered — generating posts in background" });
});

export default router;
