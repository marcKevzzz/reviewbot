# Roadmap

## Phase 1: MVP (v0.1.0) — Foundation

**Goal:** Working end-to-end pipeline that reviews a PR and posts comments — **$0 cost** using Gemini free tier.

- [ ] Project scaffold (package.json, tsconfig, action.yml) ✅
- [ ] `src/types.ts` — All interfaces, enums, error codes
- [ ] `src/constants.ts` — Default values and limits
- [ ] `src/errors.ts` — Custom error classes
- [ ] `src/utils/logger.ts` — Structured logging wrapper
- [ ] `src/utils/retry.ts` — Exponential backoff
- [ ] `src/config/schema.ts` — Zod config schema
- [ ] `src/config/defaults.ts` — Default config values
- [ ] `src/config/loader.ts` — Load + merge + validate config
- [ ] `src/diff/fetcher.ts` — Fetch PR files via GitHub API
- [ ] `src/diff/parser.ts` — Parse unified diff
- [ ] `src/diff/filter.ts` — Glob-based filtering
- [ ] `src/review/prompts.ts` — System + user prompt templates
- [ ] `src/review/schemas.ts` — AI response Zod schema
- [ ] `src/review/chunker.ts` — Split diff into chunks
- [ ] `src/review/reviewer.ts` — Provider-agnostic AI review orchestrator
- [ ] `src/providers/base.ts` — AIProvider interface
- [ ] `src/providers/gemini.ts` — Google Gemini provider ($0 free tier)
- [ ] `src/publisher/commenter.ts` — Post inline review comments
- [ ] `src/publisher/summary.ts` — Build summary comment
- [ ] `src/index.ts` — Orchestrator
- [ ] Unit tests for all modules
- [ ] CI workflow (lint + test + build)
- [ ] Dogfood workflow (ReviewBot reviews itself)
- [ ] README with usage instructions

**Deliverable:** Users can add ReviewBot to any repo with 5 lines of YAML.

---

## Phase 2: Polish (v0.2.0) — Production Ready

- [ ] `src/publisher/rate-limiter.ts` — Token bucket rate limiter
- [ ] `src/utils/crypto.ts` — Token estimation, content hashing
- [ ] `src/review/chunker.ts` — Context window optimization
- [ ] Configurable severity threshold filtering
- [ ] `maxFindings` cap with priority-based selection
- [ ] Large PR handling (>100 files, >500KB diff)
- [ ] Binary file detection and skip
- [ ] Custom instructions support
- [ ] Language-specific hints
- [ ] Integration tests (real Gemini + GitHub APIs)
- [ ] Coverage ≥80%
- [ ] `action.yml` outputs (findings-count, risk-level, etc.)
- [ ] Error recovery: partial review on chunk failure
- [ ] CHANGELOG.md + release workflow

**Deliverable:** Battle-tested on real-world repos.

---

## Phase 3: Growth (v1.0.0) — Public Release

- [ ] GitHub Marketplace listing
- [ ] Comprehensive README with badges, screenshots, examples
- [ ] `.reviewbot.yml` generator CLI tool
- [ ] Configurable review event (COMMENT/APPROVE/REQUEST_CHANGES)
- [ ] Support for draft PRs (skip or review)
- [ ] Comment deduplication (don't re-flag on re-push)
- [ ] Incremental review (only review new commits)
- [ ] Cost estimation output (tokens used, estimated cost)
- [ ] Performance benchmarks (time per file, tokens per finding)
- [ ] Security audit
- [ ] License compliance check

**Deliverable:** v1.0.0 stable release on GitHub Marketplace.

---

## Phase 4: Scale (v2.0.0) — Multi-Provider & Enterprise

- [ ] `src/providers/anthropic.ts` — Anthropic Claude provider (paid upgrade)
- [ ] `src/providers/openai.ts` — OpenAI provider (paid upgrade)
- [ ] Provider auto-selection based on PR size
- [ ] Monorepo support (workspace-aware config)
- [ ] PR size-based model selection (Flash for small, Pro for large)
- [ ] Caching layer (skip unchanged files across pushes)
- [ ] Webhook mode (standalone server, not just Action)
- [ ] Dashboard / analytics (review stats over time)
- [ ] Team config (org-wide `.reviewbot.yml`)
- [ ] Custom rule plugins (user-defined review rules)
- [ ] SARIF output (for GitHub Security tab integration)

**Deliverable:** Enterprise-grade multi-provider code review platform.

---

## Milestone Timeline

| Phase           | Target   | Status         |
| --------------- | -------- | -------------- |
| Phase 1: MVP    | Week 1–2 | 🟡 In Progress |
| Phase 2: Polish | Week 3–4 | ⬜ Not Started |
| Phase 3: Growth | Week 5–6 | ⬜ Not Started |
| Phase 4: Scale  | Month 3+ | ⬜ Future      |
