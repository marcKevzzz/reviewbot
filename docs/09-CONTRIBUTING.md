# Contributing Guide

## 1. Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USER/reviewbot.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feat/my-feature`
5. Make changes, test, commit
6. Push and open a PR

## 2. Branch Naming

```
feat/description      # New feature
fix/description       # Bug fix
docs/description      # Documentation
refactor/description  # Code restructure
test/description      # Test additions
chore/description     # Tooling, CI
```

**Examples:**
```
feat/custom-instructions
fix/binary-file-crash
docs/config-reference
refactor/reviewer-di
```

## 3. PR Checklist

Before opening a PR, verify:

- [ ] `pnpm lint` passes (no type errors)
- [ ] `pnpm test -- --run` passes (all tests green)
- [ ] `pnpm build` succeeds
- [ ] New code has unit tests
- [ ] `dist/` is rebuilt if `src/` changed
- [ ] CHANGELOG.md is updated (for features/fixes)
- [ ] Commit messages follow Conventional Commits

## 4. Code Review Process

1. **Automated:** CI runs lint + test + build
2. **Automated:** ReviewBot reviews its own PRs (dogfooding!)
3. **Human:** At least one maintainer approval required
4. **Merge:** Squash merge to `main`

## 5. Code Style

### TypeScript Rules

```typescript
// ✅ DO: Named exports
export function parseDiff(raw: string): DiffHunk[] { ... }

// ❌ DON'T: Default exports
export default function parseDiff(...) { ... }

// ✅ DO: Explicit return types on public functions
export function loadConfig(ctx: ActionContext): Promise<ReviewBotConfig> { ... }

// ❌ DON'T: Implicit return types
export function loadConfig(ctx: ActionContext) { ... }

// ✅ DO: Use custom error classes
throw new ConfigError("Invalid severity value");

// ❌ DON'T: Throw raw errors
throw new Error("Invalid severity value");

// ✅ DO: Group imports
import * as core from "@actions/core";      // Node/external
import { Octokit } from "@octokit/rest";    // External
import { ConfigSchema } from "./schema";     // Internal
import type { ReviewBotConfig } from "../types"; // Types
```

### File Organization

- One primary export per file
- Files named after their primary export: `chunker.ts` exports `chunkDiff()`
- Test files mirror source: `src/diff/parser.ts` → `tests/unit/diff/parser.test.ts`
- Keep files under 200 lines; split if larger

## 6. Adding a New Feature

1. **Design:** Open an issue describing the feature
2. **Schema:** Define any new Zod schemas in the appropriate `schema.ts`
3. **Types:** Add TypeScript interfaces to `types.ts`
4. **Implement:** Write the feature module
5. **Test:** Add unit tests with fixtures
6. **Config:** Update `ConfigSchema` if user-facing
7. **Docs:** Update relevant docs in `docs/`
8. **Build:** `pnpm build` and commit `dist/`

## 7. Directory Ownership

| Directory | Owner | Review Required From |
|---|---|---|
| `src/config/` | Config team | Any maintainer |
| `src/diff/` | Core team | Any maintainer |
| `src/review/` | AI team | AI lead + any maintainer |
| `src/publisher/` | Integration team | Any maintainer |
| `docs/` | Any contributor | Any maintainer |
| `.github/` | DevOps | DevOps lead |
