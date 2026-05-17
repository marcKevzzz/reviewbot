# ReviewBot — Project Overview

> **One-line pitch:** An open-source GitHub Action that runs AI code review on every PR — flags bugs, style issues, and security holes as inline comments.

---

## 1. Mission & Scope

| Attribute | Value |
|---|---|
| **Product** | ReviewBot |
| **Type** | GitHub Action (Marketplace) |
| **License** | MIT |
| **Runtime** | Node 20 (GitHub-hosted runner) |
| **Language** | TypeScript 6 (strict mode) |
| **Package Mgr** | pnpm 10 |
| **AI Provider** | Google Gemini free tier (default), Anthropic Claude / OpenAI (optional paid) |
| **Cost** | **$0** — Gemini free tier: 15 RPM, 1M tokens/day, 1,500 req/day |
| **Frontend** | Tailwind CSS (if/when dashboard is added) |
| **Bundler** | `@vercel/ncc` (single-file `dist/index.js`) |
| **Test Runner** | Vitest 4 |
| **CI** | GitHub Actions (dogfooding) |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub PR Event                            │
│  (pull_request.opened / synchronize / reopened)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │  webhook payload
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ReviewBot Action Runner                       │
│                                                                 │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Config   │→│  Diff      │→│  AI       │→│  Comment       │  │
│  │  Loader   │  │  Parser   │  │  Reviewer │  │  Publisher    │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────┘  │
│       ↑                            ↑               │            │
│  .reviewbot.yml              Gemini API       GitHub API        │
│  action inputs               (free tier)     (review comments)  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Pipeline (5 stages)

| # | Stage | Module | Responsibility |
|---|---|---|---|
| 1 | **Bootstrap** | `src/index.ts` | Read action inputs, initialise clients |
| 2 | **Config** | `src/config/` | Load `.reviewbot.yml` from repo root, merge with action inputs, validate via Zod |
| 3 | **Diff** | `src/diff/` | Fetch PR diff via GitHub API, parse into structured hunks, filter by config globs |
| 4 | **Review** | `src/review/` | Chunk diff by file, build prompt, call AI provider (Gemini/Claude/OpenAI), parse structured response |
| 5 | **Publish** | `src/publisher/` | Map AI findings → GitHub review comments (inline + summary) |

---

## 3. Target File Tree (Final State)

```
reviewbot/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint + Test + Build on push/PR
│       ├── release.yml             # Tag-triggered npm publish + GitHub release
│       └── dogfood.yml             # ReviewBot reviews its own PRs
├── docs/
│   ├── 00-PROJECT-OVERVIEW.md      # ← you are here
│   ├── 01-ARCHITECTURE.md          # Deep-dive architecture & data flow
│   ├── 02-SCHEMAS.md               # All Zod schemas & TypeScript interfaces
│   ├── 03-CONFIG-REFERENCE.md      # .reviewbot.yml specification
│   ├── 04-API-CONTRACTS.md         # GitHub API & AI Provider API contracts
│   ├── 05-DEVELOPMENT-GUIDE.md     # Dev setup, build, test, debug
│   ├── 06-TESTING-STRATEGY.md      # Test matrix, fixtures, mocking
│   ├── 07-SECURITY.md              # Threat model, secret handling
│   ├── 08-RELEASE-WORKFLOW.md      # Versioning, changelog, publishing
│   ├── 09-CONTRIBUTING.md          # PR rules, code style, commit convention
│   └── 10-ROADMAP.md               # Phased milestones
├── src/
│   ├── index.ts                    # Action entry point
│   ├── types.ts                    # Shared TypeScript types & enums
│   ├── constants.ts                # Magic numbers, default values, limits
│   ├── errors.ts                   # Custom error classes
│   ├── config/
│   │   ├── loader.ts               # Read .reviewbot.yml + action inputs
│   │   ├── schema.ts               # Zod schema for ReviewBotConfig
│   │   └── defaults.ts             # Default config values
│   ├── diff/
│   │   ├── fetcher.ts              # GET /repos/:owner/:repo/pulls/:pr/files
│   │   ├── parser.ts               # Unified-diff → DiffHunk[]
│   │   └── filter.ts               # Glob-based include/exclude
│   ├── providers/
│   │   ├── base.ts                 # AIProvider interface (provider-agnostic)
│   │   ├── gemini.ts               # Google Gemini provider ($0 free tier)
│   │   ├── anthropic.ts            # Anthropic Claude provider (paid)
│   │   └── openai.ts               # OpenAI provider (paid)
│   ├── review/
│   │   ├── chunker.ts              # Split diff into AI-digestible chunks
│   │   ├── prompts.ts              # System & user prompt templates
│   │   ├── reviewer.ts             # Provider-agnostic AI review orchestrator
│   │   └── schemas.ts              # Zod schema for AI response
│   ├── publisher/
│   │   ├── commenter.ts            # Map findings → inline review comments
│   │   ├── summary.ts              # Build PR summary comment
│   │   └── rate-limiter.ts         # Respect GitHub API rate limits
│   └── utils/
│       ├── logger.ts               # Structured logging via @actions/core
│       ├── retry.ts                # Exponential backoff wrapper
│       └── crypto.ts               # Token counting, hash helpers
├── tests/
│   ├── unit/
│   │   ├── config/
│   │   │   └── loader.test.ts
│   │   ├── diff/
│   │   │   ├── parser.test.ts
│   │   │   └── filter.test.ts
│   │   ├── review/
│   │   │   ├── chunker.test.ts
│   │   │   ├── prompts.test.ts
│   │   │   └── reviewer.test.ts
│   │   └── publisher/
│   │       ├── commenter.test.ts
│   │       └── summary.test.ts
│   ├── integration/
│   │   ├── github-api.test.ts
│   │   └── gemini-api.test.ts
│   └── fixtures/
│       ├── diffs/
│       │   ├── simple-add.diff
│       │   ├── multi-file.diff
│       │   ├── binary-file.diff
│       │   └── large-pr.diff
│       ├── configs/
│       │   ├── minimal.yml
│       │   ├── full.yml
│       │   └── invalid.yml
│       └── responses/
│           ├── ai-single-finding.json
│           ├── ai-multi-findings.json
│           └── ai-no-issues.json
├── .env.example
├── .gitignore
├── .reviewbot.yml                  # Dogfood config for this repo
├── action.yml                      # GitHub Action manifest
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
├── LICENSE
├── README.md
└── CHANGELOG.md
```

---

## 4. Key Design Decisions

| Decision | Rationale |
|---|---|
| **$0 default (Gemini free)** | 15 RPM, 1M tokens/day free — no credit card needed to start |
| **Provider-agnostic** | `AIProvider` interface lets users swap Gemini→Claude→OpenAI via config |
| **Single-file bundle via ncc** | GitHub Actions require `dist/index.js`; ncc inlines all deps |
| **Zod for all schemas** | Runtime validation + TypeScript inference in one pass |
| **No database** | Stateless per-run; config lives in repo `.reviewbot.yml` |
| **No server/port** | Runs as ephemeral Action — no HTTP listener needed |
| **pnpm workspace** | Fastest install, strictest dependency resolution |
| **Vitest** | Native ESM, fast HMR, Vite ecosystem alignment |
| **Tailwind CSS** | Preferred styling framework for any future frontend/dashboard |

---

## 5. Project State Machine

```
BOOTSTRAP → CONFIG_LOAD → DIFF_FETCH → DIFF_PARSE → DIFF_FILTER
    │            │             │            │             │
    ▼            ▼             ▼            ▼             ▼
 (fail:exit)  (fail:exit)  (fail:exit)  (warn:skip)  (info:skip)
                                                         │
                                              CHUNK → AI_REVIEW → PUBLISH → DONE
                                                │         │          │
                                                ▼         ▼          ▼
                                          (warn:skip) (retry/fail) (retry/fail)
```

Each stage emits structured logs via `@actions/core` and sets the Action output/exit code accordingly.

---

## 6. Quick Links

| Document | Purpose |
|---|---|
| [Architecture](./01-ARCHITECTURE.md) | Component deep-dive, data flow diagrams |
| [Schemas](./02-SCHEMAS.md) | Every Zod schema, TypeScript type, and enum |
| [Config Reference](./03-CONFIG-REFERENCE.md) | `.reviewbot.yml` full specification |
| [API Contracts](./04-API-CONTRACTS.md) | GitHub & AI Provider API usage details |
| [Dev Guide](./05-DEVELOPMENT-GUIDE.md) | Setup, build, test, debug |
| [Testing](./06-TESTING-STRATEGY.md) | Test matrix and fixture guide |
| [Security](./07-SECURITY.md) | Threat model, secret handling |
| [Release](./08-RELEASE-WORKFLOW.md) | Versioning, publishing, changelog |
| [Contributing](./09-CONTRIBUTING.md) | Code style, PR process, commit convention |
| [Roadmap](./10-ROADMAP.md) | Phased delivery milestones |
