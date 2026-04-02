import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { blogPostsTable, activityLogsTable, settingsTable } from "@workspace/db";
import { desc, eq, count, gte, and, sql } from "drizzle-orm";
import { isAuthenticated, publishToBlogger } from "../lib/blogger";
import {
  pickRandomNiche,
  pickRandomTopic,
  buildSeoKeywords,
  generateArticle,
  fetchPexelsImages,
  injectImages,
} from "../lib/article-generator";

const router: IRouter = Router();

router.get("/posts", async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status as string;

  const conditions = status && status !== "all"
    ? [eq(blogPostsTable.status, status)]
    : [];

  const posts = await db.select().from(blogPostsTable)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(blogPostsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(blogPostsTable)
    .where(conditions.length > 0 ? conditions[0] : undefined);

  res.json({ posts, total });
});

router.get("/posts/stats", async (_req, res) => {
  const [published] = await db.select({ total: count() }).from(blogPostsTable).where(eq(blogPostsTable.status, "published"));
  const [failed] = await db.select({ total: count() }).from(blogPostsTable).where(eq(blogPostsTable.status, "failed"));
  const [draft] = await db.select({ total: count() }).from(blogPostsTable).where(eq(blogPostsTable.status, "draft"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount] = await db.select({ total: count() }).from(blogPostsTable)
    .where(gte(blogPostsTable.createdAt, today));

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [weekCount] = await db.select({ total: count() }).from(blogPostsTable)
    .where(gte(blogPostsTable.createdAt, weekAgo));

  const nicheStats = await db
    .select({ niche: blogPostsTable.niche, count: count() })
    .from(blogPostsTable)
    .groupBy(blogPostsTable.niche);

  const recent = await db.select({ title: blogPostsTable.title }).from(blogPostsTable)
    .orderBy(desc(blogPostsTable.createdAt))
    .limit(5);

  res.json({
    totalPublished: published.total,
    totalFailed: failed.total,
    totalDraft: draft.total,
    todayCount: todayCount.total,
    thisWeekCount: weekCount.total,
    byNiche: nicheStats.map((n) => ({ niche: n.niche, count: n.count })),
    recentTitles: recent.map((r) => r.title),
  });
});

router.post("/posts/generate", async (req, res) => {
  const { topic: requestedTopic, niche: requestedNiche } = req.body || {};

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    res.status(401).json({ success: false, message: "Not authenticated with Blogger. Please connect your account first." });
    return;
  }

  const settingsRows = await db.select().from(settingsTable).limit(1);
  const settings = settingsRows[0];
  const niches = settings?.niches as string[] || ["motivation", "ai", "money", "facts", "tech"];
  const imagesPerPost = settings?.imagesPerPost || 2;

  const niche = requestedNiche || pickRandomNiche(niches);
  const topic = requestedTopic || pickRandomTopic(niche as any);
  const keywords = buildSeoKeywords(niche, topic);

  await db.insert(activityLogsTable).values({
    level: "info",
    message: `Generating article: "${topic}" (${niche})`,
  });

  try {
    const article = await generateArticle(topic, niche, keywords);
    const imageUrls = await fetchPexelsImages(topic, imagesPerPost);
    const contentWithImages = injectImages(article.content, imageUrls, topic);
    const fullContent = `${contentWithImages}`;

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

    await db.insert(activityLogsTable).values({
      level: "info",
      message: `Published: "${article.title}"`,
      details: JSON.stringify({ bloggerUrl, wordCount: article.wordCount }),
    });

    res.json({ success: true, post: savedPost });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.insert(activityLogsTable).values({
      level: "error",
      message: `Failed to publish post: "${topic}"`,
      details: msg,
    });

    await db.insert(blogPostsTable).values({
      title: topic,
      topic,
      niche,
      status: "failed",
      labels: [],
      wordCount: 0,
    });

    res.status(500).json({ success: false, message: msg });
  }
});

router.get("/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(post);
});

export default router;
