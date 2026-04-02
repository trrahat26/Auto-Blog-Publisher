import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { db } from "@workspace/db";
import { oauthTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost/api/auth/callback";

export function createOAuthClient() {
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/blogger",
    ],
    prompt: "consent",
  });
}

export async function exchangeCode(code: string): Promise<void> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  await saveTokens(tokens);
}

export async function saveTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
  token_type?: string | null;
}): Promise<void> {
  const existing = await db.select().from(oauthTokensTable).limit(1);
  const tokenData = {
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope || null,
    tokenType: tokens.token_type || null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(oauthTokensTable)
      .set(tokenData)
      .where(eq(oauthTokensTable.id, existing[0].id));
  } else {
    await db.insert(oauthTokensTable).values(tokenData);
  }
}

export async function getStoredTokens() {
  const tokens = await db.select().from(oauthTokensTable).limit(1);
  return tokens[0] || null;
}

export async function getAuthenticatedClient(): Promise<OAuth2Client | null> {
  const stored = await getStoredTokens();
  if (!stored || !stored.accessToken) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken || undefined,
    expiry_date: stored.expiryDate?.getTime() || undefined,
    token_type: stored.tokenType || undefined,
  });

  client.on("tokens", async (tokens) => {
    await saveTokens(tokens);
  });

  return client;
}

export async function isAuthenticated(): Promise<boolean> {
  const client = await getAuthenticatedClient();
  return client !== null;
}

export async function getBlogInfo(): Promise<{ title: string; url: string } | null> {
  const client = await getAuthenticatedClient();
  if (!client) return null;

  const blogId = process.env.BLOGGER_BLOG_ID!;
  const accessToken = (await client.getAccessToken()).token;

  try {
    const res = await axios.get(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return { title: res.data.name, url: res.data.url };
  } catch {
    return null;
  }
}

export async function publishToBlogger(
  title: string,
  content: string,
  labels: string[]
): Promise<{ id: string; url: string }> {
  const client = await getAuthenticatedClient();
  if (!client) throw new Error("Not authenticated with Blogger");

  const blogId = process.env.BLOGGER_BLOG_ID!;
  const accessToken = (await client.getAccessToken()).token;

  const res = await axios.post(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`,
    { title, content, labels },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      params: { isDraft: false },
    }
  );

  return { id: res.data.id, url: res.data.url };
}
