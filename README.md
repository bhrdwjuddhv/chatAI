# ChaiGPT

A ChatGPT-style AI chat app built with Next.js. Streaming responses, web search, conversation branching, and per-user rate limiting.

## Features

- **Streaming chat** — real-time token streaming via the Vercel AI SDK (OpenAI `gpt-4o-mini` by default).
- **Web search tool** — the assistant can call [Tavily](https://tavily.com) to answer questions about recent/factual info.
- **Conversation branching** — fork any message into a new chat that copies the history up to that point and continues independently. Branches appear as separate conversations in the sidebar (rename / pin / delete like any chat).
- **Rate limiting** — 3 messages per user per rolling 24 hours.
- **Auth** — Clerk-based sign-in; all routes protected except `/sign-in`.
- **Persistence** — Postgres via Prisma; conversations, branches, and messages are stored server-side.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, React 19 |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| Web search | `@tavily/core` |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | PostgreSQL + Prisma (`@prisma/adapter-pg`) |
| UI | Tailwind CSS v4, shadcn/base-ui components, `streamdown` for markdown |
| Data fetching | TanStack Query |

## Prerequisites

- **Node.js 20+** (developed on Node 24)
- A **PostgreSQL** database
- **Clerk**, **OpenAI**, and **Tavily** accounts/API keys

## Environment variables

Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname"

OPENAI_API_KEY="sk-..."
TAVILY_API_KEY="tvly-..."

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

NEXT_PUBLIC_CLERK_SING_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SING_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SING_UP_FALLBACK_REDIRECT_URL="/"
```

## Run locally

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Apply database migrations
npx prisma migrate deploy   # or: npx prisma migrate dev

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to sign in, then to a new chat.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Browse the database |

## Project structure

```
app/
  (auth)/sign-in/        Clerk sign-in route
  (root)/                Authenticated shell, home, and /c/[id] chat pages
  api/chat/route.ts      Streaming chat endpoint (tools, rate limit, persistence)
features/
  ai/                    Model config, web-search tool, chat store (branch-aware load/save)
  auth/                  requireUser / onboarding
  branch/                Branch creation (fork a message into a new conversation)
  conversation/          Sidebar, chat view, composer, message list, hooks
  messages/              Message server actions
lib/
  db.ts                  Prisma client
  search.ts / tavily.ts  Tavily web search
  generated/prisma/      Generated Prisma client (gitignored)
prisma/
  schema.prisma          User / Conversation / Branch / Message models
  migrations/
```

## How branching works

Each conversation has a `Main` branch. Clicking the branch icon on any message copies every message up to and including that one into a **brand-new conversation** (with `parentBranchId` / `forkedFromMessageId` recorded on its main branch), then navigates you there. The original conversation is untouched; the branch continues independently and shows up in the sidebar.

## Deployment (Vercel)

- Build command: default `next build` — `prisma generate` runs automatically via the `postinstall` script.
- Add all environment variables above in the Vercel project settings (the `.env` file is gitignored).
- Run `npx prisma migrate deploy` against your production database (or use a Vercel build/release step).
