import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { startScheduler, stopScheduler } from "../lib/scheduler";

const router: IRouter = Router();

router.get("/settings", async (_req, res) => {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length === 0) {
    const [created] = await db.insert(settingsTable).values({
      blogId: process.env.BLOGGER_BLOG_ID || "",
      postsPerDay: 2,
      schedulerEnabled: true,
      niches: ["motivation", "ai", "money", "facts", "tech"],
      imagesPerPost: 2,
    }).returning();
    res.json(created);
    return;
  }
  res.json(rows[0]);
});

router.put("/settings", async (req, res) => {
  const { postsPerDay, schedulerEnabled, niches, pexelsApiKey, imagesPerPost } = req.body;

  const rows = await db.select().from(settingsTable).limit(1);

  let updated;
  if (rows.length === 0) {
    [updated] = await db.insert(settingsTable).values({
      blogId: process.env.BLOGGER_BLOG_ID || "",
      postsPerDay: postsPerDay ?? 2,
      schedulerEnabled: schedulerEnabled ?? true,
      niches: niches ?? ["motivation", "ai", "money", "facts", "tech"],
      pexelsApiKey: pexelsApiKey || null,
      imagesPerPost: imagesPerPost ?? 2,
    }).returning();
  } else {
    [updated] = await db.update(settingsTable)
      .set({
        postsPerDay: postsPerDay ?? rows[0].postsPerDay,
        schedulerEnabled: schedulerEnabled ?? rows[0].schedulerEnabled,
        niches: niches ?? rows[0].niches,
        pexelsApiKey: pexelsApiKey !== undefined ? pexelsApiKey : rows[0].pexelsApiKey,
        imagesPerPost: imagesPerPost ?? rows[0].imagesPerPost,
        updatedAt: new Date(),
      })
      .where(eq(settingsTable.id, rows[0].id))
      .returning();
  }

  if (updated.schedulerEnabled) {
    startScheduler(updated.postsPerDay);
  } else {
    stopScheduler();
  }

  res.json(updated);
});

export default router;
