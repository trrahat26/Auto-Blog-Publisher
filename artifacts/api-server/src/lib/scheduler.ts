import cron from "node-cron";
import { db } from "@workspace/db";
import { settingsTable, blogPostsTable, activityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  pickRandomNiche,
  pickRandomTopic,
  buildSeoKeywords,
  generateArticle,
  fetchPexelsImages,
  injectImages,
} from "./article-generator";
import { publishToBlogger, isAuthenticated } from "./blogger";
import { logger } from "./logger";

let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;
let lastRunAt: Date | null = null;
let nextRunAt: Date | null = null;

async function logActivity(level: string, message: string, details?: string) {
  try {
    await db.insert(activityLogsTable).values({ level, message, details: details || null });
  } catch {
  }
}

export async function runPostingJob(): Promise<void> {
  if (isRunning) {
    logger.info("Scheduler already running, skipping");
    return;
  }

  isRunning = true;
  lastRunAt = new Date();

  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      await logActivity("warn", "Scheduler skipped: Not authenticated with Blogger");
      return;
    }

    const settingsRows = await db.select().from(settingsTable).limit(1);
    const settings = settingsRows[0];
    if (!settings) {
      await logActivity("warn", "Scheduler skipped: No settings configured");
      return;
    }

    if (!settings.schedulerEnabled) {
      await logActivity("info", "Scheduler disabled, skipping");
      return;
    }

    const postsPerDay = settings.postsPerDay || 2;
    await logActivity("info", `Starting scheduled run: generating ${postsPerDay} post(s)`);

    for (let i = 0; i < postsPerDay; i++) {
      try {
        const niche = pickRandomNiche(settings.niches as string[]);
        const topic = pickRandomTopic(niche);
        const keywords = buildSeoKeywords(niche, topic);

        await logActivity("info", `Generating article: "${topic}" (${niche})`);

        const article = await generateArticle(topic, niche, keywords);

        const imagesPerPost = settings.imagesPerPost || 2;
        const imageUrls = await fetchPexelsImages(topic, imagesPerPost);
        const contentWithImages = injectImages(article.content, imageUrls, topic);

        const fullContent = `${contentWithImages}<div style="margin-top:30px;padding:15px;background:#f5f5f5;border-left:4px solid #333"><p><strong>Meta:</strong> ${article.metaDescription}</p></div>`;

        const { id: bloggerPostId, url: bloggerUrl } = await publishToBlogger(
          article.title,
          fullContent,
          article.labels
        );

        const [savedPost] = await db.insert(blogPostsTable).values({
          title: article.title,
          topic,
          niche,
          status: "published",
          bloggerPostId,
          bloggerUrl,
          labels: article.labels,
          metaDescription: article.metaDescription,
          wordCount: article.wordCount,
          content: fullContent,
          publishedAt: new Date(),
        }).returning();

        await logActivity(
          "info",
          `Published: "${article.title}"`,
          JSON.stringify({ bloggerUrl, wordCount: article.wordCount, postId: savedPost.id })
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logActivity("error", `Failed to generate/publish post ${i + 1}`, msg);

        await db.insert(blogPostsTable).values({
          title: "Failed Post",
          topic: "unknown",
          niche: "unknown",
          status: "failed",
          labels: [],
          wordCount: 0,
        });
      }

      if (i < postsPerDay - 1) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    await logActivity("info", `Scheduled run complete: ${postsPerDay} post(s) processed`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logActivity("error", "Scheduler run failed", msg);
    logger.error({ err }, "Scheduler run failed");
  } finally {
    isRunning = false;
  }
}

export function startScheduler(postsPerDay: number = 2): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }

  const hours = postsPerDay >= 2 ? ["8", "16"] : ["10"];
  const schedule = `0 ${hours.join(",")} * * *`;

  schedulerTask = cron.schedule(schedule, async () => {
    await runPostingJob();
    nextRunAt = getNextRunAt(postsPerDay);
  });

  nextRunAt = getNextRunAt(postsPerDay);
  logger.info({ schedule }, "Scheduler started");
}

export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    nextRunAt = null;
    logger.info("Scheduler stopped");
  }
}

function getNextRunAt(postsPerDay: number): Date {
  const now = new Date();
  const hours = postsPerDay >= 2 ? [8, 16] : [10];
  const currentHour = now.getHours();
  const nextHour = hours.find((h) => h > currentHour);
  const next = new Date(now);

  if (nextHour !== undefined) {
    next.setHours(nextHour, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(hours[0], 0, 0, 0);
  }

  return next;
}

export function getSchedulerState() {
  return {
    isRunning,
    lastRunAt,
    nextRunAt,
    task: schedulerTask,
  };
}
