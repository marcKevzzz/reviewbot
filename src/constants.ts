import { AIProviderType } from "./types";

export const DEFAULTS = {
  MAX_TOKENS_PER_CHUNK: 8_000,
  MAX_FILES_PER_PR: 100,
  MAX_DIFF_SIZE_BYTES: 500_000,
  TOKEN_ESTIMATE_RATIO: 4,         // 4 characters ≈ 1 token
  GITHUB_API_RATE_LIMIT: 5_000,
  GEMINI_FREE_RPM: 15,
  GEMINI_FREE_RPD: 1_500,
  GEMINI_FREE_TPD: 1_000_000,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1_000,
  RETRY_MAX_DELAY_MS: 30_000,
  COMMENT_MAX_LENGTH: 65_536,
} as const;

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  gemini: "gemini-2.0-flash",
  anthropic: "claude-3-5-sonnet-latest",
  openai: "gpt-4o-mini",
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
