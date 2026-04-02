import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  niche: text("niche").notNull(),
  status: text("status").notNull().default("draft"),
  bloggerPostId: text("blogger_post_id"),
  bloggerUrl: text("blogger_url"),
  labels: json("labels").$type<string[]>().notNull().default([]),
  metaDescription: text("meta_description"),
  wordCount: integer("word_count").notNull().default(0),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  publishedAt: timestamp("published_at"),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({ id: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
