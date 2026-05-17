# Schemas & Type Definitions

> Every data shape in ReviewBot. Zod schemas provide runtime validation; TypeScript types are inferred.

## 1. Core Enums

```typescript
// src/types.ts

export enum Severity {
  ERROR   = "error",
  WARNING = "warning",
  INFO    = "info",
}

export enum Category {
  BUG            = "bug",
  SECURITY       = "security",
  PERFORMANCE    = "performance",
  STYLE          = "style",
  COMPLEXITY     = "complexity",
  BEST_PRACTICE  = "best_practice",
  TYPE_SAFETY    = "type_safety",
  ERROR_HANDLING = "error_handling",
}

export enum ReviewEvent {
  COMMENT         = "COMMENT",
  APPROVE         = "APPROVE",
  REQUEST_CHANGES = "REQUEST_CHANGES",
}

// Provider-agnostic — add new providers here
export enum AIProviderType {
  GEMINI    = "gemini",     // $0 free tier (default)
  ANTHROPIC = "anthropic",  // paid
  OPENAI    = "openai",     // paid
}

export enum ErrorCode {
  CONFIG_NOT_FOUND     = "CONFIG_NOT_FOUND",
  CONFIG_INVALID       = "CONFIG_INVALID",
  DIFF_FETCH_FAILED    = "DIFF_FETCH_FAILED",
  DIFF_PARSE_FAILED    = "DIFF_PARSE_FAILED",
  DIFF_TOO_LARGE       = "DIFF_TOO_LARGE",
  AI_API_ERROR         = "AI_API_ERROR",
  AI_RATE_LIMITED       = "AI_RATE_LIMITED",
  AI_RESPONSE_INVALID  = "AI_RESPONSE_INVALID",
  PUBLISH_FAILED       = "PUBLISH_FAILED",
  PUBLISH_RATE_LIMITED  = "PUBLISH_RATE_LIMITED",
}
```

## 2. AI Provider Interface

```typescript
// src/providers/base.ts

export interface AIProvider {
  readonly name: AIProviderType;

  /** Send a code review request, get structured findings back */
  review(request: AIReviewRequest): Promise<AIReviewResponse>;

  /** Estimate token count for a string */
  estimateTokens(text: string): number;

  /** Provider-specific rate limit info */
  getRateLimits(): ProviderRateLimits;
}

export interface AIReviewRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface AIReviewResponse {
  findings: ReviewFinding[];
  summary: string;
  overallRisk: "low" | "medium" | "high" | "critical";
  usage: { inputTokens: number; outputTokens: number };
}

export interface ProviderRateLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;   // Gemini free: 1,500/day
}
```

## 3. Configuration Schema

```typescript
// src/config/schema.ts
import { z } from "zod";

export const ConfigSchema = z.object({
  // AI Provider ($0 default)
  provider: z.nativeEnum(AIProviderType).default(AIProviderType.GEMINI),
  model: z.string().default("gemini-2.0-flash"),  // free tier model
  maxTokens: z.number().int().min(100).max(16000).default(4096),
  temperature: z.number().min(0).max(1).default(0.1),

  // Filtering
  include: z.array(z.string()).default(["**/*"]),
  exclude: z.array(z.string()).default([
    "**/node_modules/**", "**/dist/**", "**/build/**",
    "**/*.lock", "**/pnpm-lock.yaml", "**/package-lock.json",
    "**/*.min.js", "**/*.min.css", "**/*.generated.*",
  ]),
  maxFileSizeKb: z.number().int().min(1).max(1000).default(100),

  // Review Behavior
  reviewCategories: z.array(z.nativeEnum(Category)).default([
    Category.BUG, Category.SECURITY, Category.PERFORMANCE, Category.STYLE,
  ]),
  severityThreshold: z.nativeEnum(Severity).default(Severity.INFO),
  maxFindings: z.number().int().min(1).max(100).default(25),
  maxConcurrency: z.number().int().min(1).max(10).default(3),

  // Output
  summaryComment: z.boolean().default(true),
  inlineComments: z.boolean().default(true),
  reviewEvent: z.nativeEnum(ReviewEvent).default(ReviewEvent.COMMENT),

  // Custom Instructions
  customInstructions: z.string().optional(),
  languageHints: z.record(z.string(), z.string()).optional(),
});

export type ReviewBotConfig = z.infer<typeof ConfigSchema>;
```

## 4. Diff Types

```typescript
// src/types.ts

export interface RawDiffFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previousFilename?: string;
  sha: string;
}

export interface DiffHunk {
  file: string;
  startLine: number;
  endLine: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface FilteredDiff {
  files: DiffFile[];
  stats: {
    totalFiles: number;
    includedFiles: number;
    excludedFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

export interface DiffFile {
  filename: string;
  language: string;
  hunks: DiffHunk[];
  status: RawDiffFile["status"];
}
```

## 5. Review Chunk & Finding Types

```typescript
// src/types.ts

export interface ReviewChunk {
  id: string;
  file: string;
  language: string;
  hunks: DiffHunk[];
  estimatedTokens: number;
}

// src/review/schemas.ts
export const FindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  endLine: z.number().int().positive().optional(),
  severity: z.nativeEnum(Severity),
  category: z.nativeEnum(Category),
  title: z.string().max(120),
  description: z.string().max(2000),
  suggestion: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1),
});

export const ReviewResponseSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string().max(500),
  overallRisk: z.enum(["low", "medium", "high", "critical"]),
});

export type ReviewFinding = z.infer<typeof FindingSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
```

## 6. Action Context

```typescript
// src/types.ts

export interface ActionContext {
  octokit: InstanceType<typeof Octokit>;
  aiProvider: AIProvider;    // Gemini (free) | Claude | OpenAI
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  baseRef: string;
  headRef: string;
}
```

## 7. Publisher Types

```typescript
// src/types.ts

export interface InlineComment {
  path: string;
  line: number;
  side: "RIGHT";
  body: string;
}

export interface ReviewSubmission {
  owner: string;
  repo: string;
  pull_number: number;
  commit_id: string;
  event: ReviewEvent;
  body: string;
  comments: InlineComment[];
}

export interface ReviewStats {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<Category, number>;
  filesReviewed: number;
  chunksProcessed: number;
  tokensUsed: number;
  durationMs: number;
  estimatedCost: number;  // $0 for Gemini free tier
}
```

## 8. Error Types

```typescript
// src/errors.ts

export class ReviewBotError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly retryable: boolean,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "ReviewBotError";
  }
}

export class ConfigError extends ReviewBotError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCode.CONFIG_INVALID, false, cause);
  }
}

export class DiffError extends ReviewBotError {
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message, code, code === ErrorCode.DIFF_FETCH_FAILED, cause);
  }
}

export class AIError extends ReviewBotError {
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message, code, code === ErrorCode.AI_RATE_LIMITED, cause);
  }
}

export class PublishError extends ReviewBotError {
  constructor(message: string, code: ErrorCode, cause?: Error) {
    super(message, code, code === ErrorCode.PUBLISH_RATE_LIMITED, cause);
  }
}
```

## 9. Constants

```typescript
// src/constants.ts

export const DEFAULTS = {
  MAX_TOKENS_PER_CHUNK: 8_000,
  MAX_FILES_PER_PR: 100,
  MAX_DIFF_SIZE_BYTES: 500_000,
  TOKEN_ESTIMATE_RATIO: 4,         // 4 chars ≈ 1 token
  GITHUB_API_RATE_LIMIT: 5_000,    // req/hr
  GEMINI_FREE_RPM: 15,             // requests/minute (free tier)
  GEMINI_FREE_RPD: 1_500,          // requests/day (free tier)
  GEMINI_FREE_TPD: 1_000_000,      // tokens/day (free tier)
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1_000,
  RETRY_MAX_DELAY_MS: 30_000,
  COMMENT_MAX_LENGTH: 65_536,
} as const;

// Default models per provider (free → paid)
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  gemini: "gemini-2.0-flash",              // free
  anthropic: "claude-sonnet-4-20250514",   // paid
  openai: "gpt-4o-mini",                   // cheapest paid
} as const;

export const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript",
  ".py": "python",     ".rs": "rust",
  ".go": "go",         ".java": "java",
  ".rb": "ruby",       ".cs": "csharp",
  ".cpp": "cpp",       ".c": "c",
  ".swift": "swift",   ".kt": "kotlin",
  ".php": "php",       ".sql": "sql",
  ".sh": "bash",
  ".yml": "yaml",      ".yaml": "yaml",
  ".json": "json",     ".md": "markdown",
  ".css": "css",       ".html": "html",
} as const;
```
