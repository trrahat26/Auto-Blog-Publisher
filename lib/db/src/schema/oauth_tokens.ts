import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const oauthTokensTable = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  tokenType: text("token_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OAuthToken = typeof oauthTokensTable.$inferSelect;
