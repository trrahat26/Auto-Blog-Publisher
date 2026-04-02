import { Router, type IRouter } from "express";
import { getAuthUrl, exchangeCode, isAuthenticated, getBlogInfo, getStoredTokens } from "../lib/blogger";
import { db } from "@workspace/db";
import { oauthTokensTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/auth/url", async (_req, res) => {
  const url = getAuthUrl();
  res.json({ url });
});

router.get("/auth/status", async (_req, res) => {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    res.json({ authenticated: false });
    return;
  }

  const blogInfo = await getBlogInfo();
  res.json({
    authenticated: true,
    blogTitle: blogInfo?.title || null,
    blogUrl: blogInfo?.url || null,
  });
});

router.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query as { code?: string; error?: string };

  if (error) {
    res.redirect(`/?auth=error&message=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    res.redirect(`/?auth=error&message=No+code+received`);
    return;
  }

  try {
    await exchangeCode(code);
    res.redirect(`/?auth=success`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth failed";
    res.redirect(`/?auth=error&message=${encodeURIComponent(msg)}`);
  }
});

router.post("/auth/logout", async (_req, res) => {
  await db.delete(oauthTokensTable);
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
