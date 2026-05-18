import { Octokit } from "@octokit/rest";
import type { AIProvider } from "./providers/base";

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

export enum AIProviderType {
  GEMINI    = "gemini",
  ANTHROPIC = "anthropic",
  OPENAI    = "openai",
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

export interface DiffFile {
  filename: string;
  language: string;
  hunks: DiffHunk[];
  status: RawDiffFile["status"];
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

export interface ReviewChunk {
  id: string;
  file: string;
  language: string;
  hunks: DiffHunk[];
  estimatedTokens: number;
}

export interface ReviewFinding {
  file: string;
  line: number;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  suggestion?: string;
  confidence: number;
  usefulness: number; // Tier ranking: 1 (Nitpick), 2 (Normal), 3 (Critical)
}

export interface ActionContext {
  octokit: InstanceType<typeof Octokit>;
  aiProvider: AIProvider;
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  baseRef: string;
  headRef: string;
}

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

export interface RubricScore {
  score: number;        // 1-5 direct scale
  justification: string; // Chain of Thought reasoning
}

export interface RubricEvaluation {
  security: RubricScore;
  performance: RubricScore;
  typeSafety: RubricScore;
  style: RubricScore;
  complexity: RubricScore;
}

export interface ReviewStats {
  totalFindings: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<Category, number>;
  filesReviewed: number;
  chunksProcessed: number;
  tokensUsed: number;
  durationMs: number;
  estimatedCost: number;
  rubricScores?: RubricEvaluation;
  mergabilityGrade?: string;
}
