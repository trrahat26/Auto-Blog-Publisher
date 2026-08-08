# Auto-Blog-Publisher

Automatically posts unique, SEO-ready articles to your Blogger blog every day — **for free**, using GitHub Actions (so it runs 24/7 even when your computer is off).

## What it does

- Runs **every day automatically** through GitHub Actions (free, no paid servers).
- Writes **real, unique articles** using a free AI (Gemini or Groq), instead of boring "Automated Post" placeholders.
- Pulls **free images** (Pexels / Pixabay / Wikimedia) and builds a nice SEO post with headings, FAQ schema, meta description, and internal/external links.
- Keeps a **title history** so it never repeats a title.
- Your blog is: **https://dailyboostpro.blogspot.com**

## Your GitHub account

This project lives in your GitHub account **`trrahat26`**, repo **`Auto-Blog-Publisher`**:
`https://github.com/trrahat26/Auto-Blog-Publisher`

---

## One-time setup (do these in order)

### 1. Publish your Google OAuth app (critical)
Your token stopped working because the Google app is in **"Testing"** mode — testing tokens expire after **7 days**. To make it last forever:

1. Go to **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID (the one for this project).
3. Click **OAuth consent screen** → set the **Publishing status** to **In production** (click "Publish App").
4. This makes your refresh token not expire.

### 2. Re-create a fresh token (once, on your PC)
The old token is dead (expired April 2, 2026). Generate a new one:

```bash
pip install -r requirements.txt
python main.py
```

A browser window will open asking you to sign in with the Google account that owns the blog. Log in and allow access. This creates a new `token.json`.

### 3. Set up GitHub Actions (free 24/7 posting)
1. Open your repo on GitHub: `https://github.com/trrahat26/Auto-Blog-Publisher`.
2. Go to **Settings → Secrets and variables → Actions → New repository secret**. Add these:

   | Secret name | What to put |
   |---|---|
   | `BLOGGER_BLOG_ID` | `2337671613504683` (your blog ID) |
   | `BLOGGER_CLIENT_SECRET_B64` | The **base64** of your `client_secret.json` file |
   | `BLOGGER_TOKEN_B64` | The **base64** of your `token.json` file |
   | `GEMINI_API_KEY` (optional) | Free key from https://aistudio.google.com/apikey |
   | `GROQ_API_KEY` (optional) | Free key from https://console.groq.com/keys |

3. To get the base64 of a file on Windows PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("token.json"))
   ```

4. Push this code to GitHub. The workflow runs automatically every day at 12:00 UTC.

> **How to build a base64 secret that contains newlines:** GitHub Secrets can hold multiline text. When you paste, make sure the base64 string is a single line (base64 output already is a single line).

### 4. Verify it works
On GitHub, open the **Actions** tab. You'll see a workflow called **Blogger Daily Post**. Click **"Run workflow"** once to test it, then check your blog for a new post.

---

## Configuration (optional)

Edit `config.py` or use environment variables:

- **Edit the topics** the AI writes about → change the `CONTENT_TOPICS` list to match your blog's niche (AI, money, productivity, motivation, etc.).
- **Post more per day** → change `MAX_POSTS_PER_DAY` (default `3`).
- **Change posting time** → edit the `cron` in `.github/workflows/blogger_daily.yml` (UTC).
- **Disable AI** → set `FREE_AI_ENABLED=false` or `AI_ARTICLE_ENABLED=false`.

### Free AI keys (get them in 2 minutes)
- **Gemini (best quality):** https://aistudio.google.com/apikey → create a free API key. Free tier is generous.
- **Groq (fast fallback):** https://console.groq.com/keys → free API key using Llama models.
- The `auto` provider tries Gemini first, then Groq, then local Ollama.

---

## Why no traffic yet? (real talk)

New Blogger sites on the free `blogspot.com` subdomain get almost no visitors for **3–12 months**. It's normal, not a bug. To actually grow traffic (all free):

1. **Buy a cheap custom domain** (e.g. `dailyboostpro.com`) and set it in Blogger Settings — Google ranks real domains far better than `blogspot.com`.
2. **Google Search Console:** add your site, submit the sitemap, and request indexing.
3. **Share every post** on Pinterest, Reddit, X, Facebook, and Quora.
4. **Get backlinks:** post comments, guest posts, or answers on Quora/forums linking to your blog.
5. **Publish every day** (this tool now does that for you) — consistency is the #1 lever.

---

## Security warning

Your `token.json` and `client_secret.json` were **already committed to GitHub** at some point. Anyone who can see that repo has your private Google credentials. If you care about security, **rotate/revoke** that Google OAuth client and re-create a fresh one, then make the repo private (Settings → General → Danger Zone → Change visibility → Private).

## Running locally

```bash
python main.py          # post once now
python main.py --daily  # stay running and post daily at DAILY_TIME_HHMM
```

## Project layout

| File | Purpose |
|---|---|
| `main.py` | The whole publisher (content, AI, SEO, images, posting) |
| `config.py` | All settings / toggles |
| `blogger_api.py` | Talks to the Blogger API |
| `auth.py` | Google OAuth login |
| `theme.txt` | The Blogger blog theme (SEO-optimized) |
| `.github/workflows/blogger_daily.yml` | Free 24/7 scheduler |
