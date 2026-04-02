# Workspace

## Overview

AI-powered automated blogging system that generates SEO articles and publishes them to Blogger daily. Includes a full dashboard to monitor, manage, and control the automation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2) — no API key needed
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui

## Features

1. **Blogger OAuth** — Google OAuth 2.0 integration to authenticate with Blogger API
2. **AI Article Generation** — GPT-5.2 generates 900-1100 word SEO articles with clickbait titles
3. **Trend Topics** — Curated topic pools across 5 niches: motivation, AI, money, facts, tech
4. **SEO Optimization** — Keywords, meta descriptions, labels, structured HTML output
5. **Pexels Images** — Optional image fetching and injection into articles (requires PEXELS_API_KEY)
6. **Auto Publishing** — Posts directly to Blogger API with labels, immediately published (not draft)
7. **Scheduler** — node-cron posts 1-2 articles daily at 8am/4pm UTC automatically
8. **Activity Logs** — All events logged to database with level (info/warn/error)
9. **Dashboard** — Dark terminal-style React dashboard to monitor everything

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all backend logic)
│   └── blogger-dashboard/  # React Vite frontend dashboard
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/ # OpenAI AI integration
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- `blog_posts` — all generated/published posts with status tracking
- `activity_logs` — system events log (info/warn/error)
- `settings` — user configuration (scheduler, niches, posts per day)
- `oauth_tokens` — Google OAuth tokens for Blogger API

## API Routes

- `GET /api/auth/url` — get Google OAuth URL
- `GET /api/auth/status` — check if authenticated
- `GET /api/auth/callback` — OAuth callback (redirects back to dashboard)
- `POST /api/auth/logout` — clear stored tokens
- `GET /api/posts` — list posts (filter by status)
- `GET /api/posts/stats` — stats overview
- `POST /api/posts/generate` — generate + publish a post now
- `GET /api/posts/:id` — get single post
- `GET /api/scheduler` — scheduler status
- `POST /api/scheduler/run` — trigger scheduler immediately
- `GET /api/logs` — activity logs
- `GET /api/settings` — get settings
- `PUT /api/settings` — update settings

## Environment Variables (Secrets)

- `GOOGLE_CLIENT_ID` — Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth Client Secret
- `BLOGGER_BLOG_ID` — Blogger Blog ID (set as env var: 2337671613504683)
- `GOOGLE_REDIRECT_URI` — OAuth redirect URI
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI integration
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI integration
- `PEXELS_API_KEY` — Optional: for fetching article images
- `DATABASE_URL` — Auto-set by Replit PostgreSQL

## Setup

1. Click "Connect Blogger" in the dashboard to authenticate with Google
2. Configure settings (posts per day, niches, optional Pexels API key)
3. The scheduler runs automatically at 8am and 4pm daily
4. Or click "Generate Post Now" or "Run Scheduler Now" to post immediately

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/db run push` — push DB schema changes
