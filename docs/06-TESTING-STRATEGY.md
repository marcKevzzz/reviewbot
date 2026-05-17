# Testing Strategy

## 1. Test Pyramid

| Layer | Count | Speed | External APIs | Purpose |
|---|---|---|---|---|
| Unit | 30+ | <5s | None (mocked) | Logic correctness |
| Integration | ~5 | <30s | Real Gemini/GitHub | API contract validation |
| E2E | 1–2 | <60s | Real everything | Full pipeline smoke test |

## 2. Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
    setupFiles: ["tests/setup.ts"],
  },
});
```

## 3. Unit Test Matrix

| Module | Test File | What's Tested |
|---|---|---|
| `config/loader` | `config/loader.test.ts` | YAML parsing, merge, missing file, invalid schema |
| `diff/parser` | `diff/parser.test.ts` | Unified diff parsing, binary, empty, rename |
| `diff/filter` | `diff/filter.test.ts` | Glob matching, include/exclude |
| `review/chunker` | `review/chunker.test.ts` | Token splitting, chunk boundaries |
| `review/prompts` | `review/prompts.test.ts` | Template rendering, custom instructions |
| `review/reviewer` | `review/reviewer.test.ts` | Response parsing, Zod validation |
| `providers/gemini` | `providers/gemini.test.ts` | Gemini API request/response mapping |
| `providers/base` | `providers/base.test.ts` | Provider factory, selection logic |
| `publisher/commenter` | `publisher/commenter.test.ts` | Finding → comment mapping |
| `publisher/summary` | `publisher/summary.test.ts` | Stats aggregation, markdown |
| `utils/retry` | `utils/retry.test.ts` | Backoff timing, max attempts |

## 4. Mocking

```typescript
// tests/setup.ts
import { vi } from "vitest";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(), setOutput: vi.fn(), setFailed: vi.fn(),
  info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn(),
}));

// Mock AI Provider (provider-agnostic)
export function createMockProvider(): AIProvider {
  return {
    name: AIProviderType.GEMINI,
    review: vi.fn(),
    estimateTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
    getRateLimits: vi.fn(() => ({
      requestsPerMinute: 15,
      tokensPerMinute: 1_000_000,
      requestsPerDay: 1_500,
    })),
  };
}
```

## 5. Fixtures

```
tests/fixtures/
├── diffs/           # .diff files for parser tests
├── configs/         # .yml files for config tests
├── responses/       # .json files for AI response tests
└── events/          # GitHub webhook payloads
```

## 6. CI Workflow

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test -- --run --coverage
      - run: pnpm build
```

## 7. Coverage Targets

| Metric | Minimum | Target |
|---|---|---|
| Lines | 80% | 90% |
| Functions | 80% | 90% |
| Branches | 75% | 85% |
| Statements | 80% | 90% |
