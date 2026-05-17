# ReviewBot — Development Rules

> **Read this before writing ANY code.** These rules enforce consistency across the entire codebase.

## 1. Golden Rules

1. **Every data shape has a Zod schema.** No raw `any` or unvalidated JSON.
2. **Every public function has an explicit return type.** TypeScript inference is for locals only.
3. **Every error is a `ReviewBotError` subclass.** Never throw raw `Error`.
4. **Every external call goes through `withRetry()`.** No naked `fetch` or API calls.
5. **Every secret is registered with `core.setSecret()`.** No exceptions.
6. **No default exports.** Named exports everywhere.
7. **No `console.log`.** Use `@actions/core` logging (`core.info`, `core.warning`, `core.error`, `core.debug`).
8. **No side effects at module level.** All initialization happens in `run()`.

## 2. File Naming

| Type | Convention | Example |
|---|---|---|
| Source modules | `kebab-case.ts` | `rate-limiter.ts` |
| Test files | `*.test.ts` | `parser.test.ts` |
| Schemas | `schema.ts` or `schemas.ts` | `src/config/schema.ts` |
| Types | `types.ts` | `src/types.ts` |
| Constants | `constants.ts` | `src/constants.ts` |
| Errors | `errors.ts` | `src/errors.ts` |

## 3. Import Order

```typescript
// 1. Node builtins
import * as path from "path";

// 2. External packages
import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { z } from "zod";

// 3. Internal modules
import { loadConfig } from "./config/loader";
import { fetchDiff } from "./diff/fetcher";

// 4. Types (type-only imports)
import type { ReviewBotConfig, ActionContext } from "./types";
```

## 4. Function Signatures

```typescript
// ✅ Pure function with explicit types
export function parseDiff(raw: string): DiffHunk[] { ... }

// ✅ Async with context injection
export async function fetchDiff(ctx: ActionContext): Promise<RawDiffFile[]> { ... }

// ✅ Options object for 3+ params
export async function reviewChunks(
  chunks: ReviewChunk[],
  config: ReviewBotConfig,
  ctx: ActionContext,
): Promise<ReviewFinding[]> { ... }

// ❌ Never: positional args > 3
export function review(a: string, b: number, c: boolean, d: Config, e: Client) { ... }
```

## 5. Error Handling Pattern

```typescript
// In pipeline stages:
try {
  const result = await withRetry(() => externalCall(), {
    maxAttempts: DEFAULTS.RETRY_MAX_ATTEMPTS,
    baseDelay: DEFAULTS.RETRY_BASE_DELAY_MS,
  });
  return result;
} catch (error) {
  if (error instanceof ReviewBotError && !error.retryable) {
    throw error; // Propagate known non-retryable errors
  }
  throw new DiffError(
    `Failed to fetch PR files: ${error instanceof Error ? error.message : String(error)}`,
    ErrorCode.DIFF_FETCH_FAILED,
    error instanceof Error ? error : undefined,
  );
}
```

## 6. Testing Rules

1. **Every module has a test file** in the mirror path under `tests/unit/`.
2. **No real API calls in unit tests.** Use mocks from `tests/setup.ts`.
3. **Use fixtures, not inline strings.** Diff content, configs, and responses live in `tests/fixtures/`.
4. **Test the contract, not the implementation.** Assert on outputs, not internal state.
5. **Name tests as sentences.** `it("should skip binary files without patch field")`.

## 7. Logging Convention

```typescript
// Info: Normal operation
core.info(`Reviewing ${files.length} files across ${chunks.length} chunks`);

// Warning: Non-fatal issue, operation continues
core.warning(`Skipping binary file: ${file.filename}`);

// Error: Fatal issue, action will fail
core.error(`AI provider returned invalid response: ${error.message}`);

// Debug: Verbose info, only shown with ACTIONS_STEP_DEBUG=true
core.debug(`Chunk ${chunk.id}: ${chunk.estimatedTokens} tokens`);
```

## 8. Config Merge Rules

```
Priority: action.yml inputs > .reviewbot.yml > DEFAULT_CONFIG

Rule: Only non-undefined action inputs override config file values.
Rule: Config file values override defaults only if present.
Rule: All values pass through ConfigSchema validation after merge.
```

## 9. Git Workflow

```
main ← feature branches (squash merge)
  │
  ├── feat/config-loader
  ├── fix/binary-crash
  └── docs/api-contracts

Tags: v0.1.0, v0.2.0, v1.0.0, ...
Major aliases: v1, v2, ...
```

- **Never force-push to main.**
- **Always squash merge PRs.**
- **Always rebuild `dist/` before tagging.**
- **Delete feature branches after merge.**

## 10. Dependency Rules

| Category | Policy |
|---|---|
| Production deps | Minimize. Every dep increases bundle size. |
| Dev deps | Reasonable. Test/build tooling is fine. |
| Adding a dep | Justify in PR description. Check bundle impact. |
| Removing a dep | Always welcome. Less is more. |
| Updating a dep | Via Dependabot PR. Test before merge. |

**Current production deps (keep minimal):**
- `@actions/core` — GitHub Action SDK
- `@actions/github` — GitHub context
- `@google/generative-ai` — Gemini API ($0 free tier)
- `@octokit/rest` — GitHub REST API
- `js-yaml` — YAML parser
- `zod` — Schema validation

**Optional paid provider deps (install only if needed):**
- `@anthropic-ai/sdk` — Claude API (paid)
- `openai` — OpenAI API (paid)
