import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  blogId: text("blog_id").notNull(),
  postsPerDay: integer("posts_per_day").notNull().default(2),
  schedulerEnabled: boolean("scheduler_enabled").notNull().default(true),
  niches: json("niches").$type<string[]>().notNull().default(["motivation", "ai", "money", "facts", "tech"]),
  pexelsApiKey: text("pexels_api_key"),
  imagesPerPost: integer("images_per_post").notNull().default(2),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
