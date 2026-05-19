import { describe, it, expect, vi } from "vitest";
import { reviewChunks } from "../../../src/review/reviewer";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { ReviewChunk, Severity, Category, ActionContext } from "../../../src/types";
import { AIError } from "../../../src/errors";
import { ErrorCode } from "../../../src/types";

vi.mock("../../../src/utils/retry", () => ({
  withRetry: vi.fn((fn) => fn()),
}));

describe("reviewChunks - Automatic Provider Fallback", () => {
  it("should failover to fallback provider if primary provider hits 429 rate limit", async () => {
    const mockChunks: ReviewChunk[] = [
      {
        id: "chunk-1",
        file: "src/index.ts",
        language: "typescript",
        hunks: [
          {
            file: "src/index.ts",
            startLine: 10,
            endLine: 12,
            header: "@@ -10,3 +10,3 @@",
            lines: [
              { type: "add", content: "const y = 2;", oldLineNumber: null, newLineNumber: 11 },
            ],
          },
        ],
        estimatedTokens: 50,
      },
    ];

    const mockPrimaryProvider = {
      name: "gemini",
      review: vi.fn().mockRejectedValue(
        new AIError("Gemini API rate limit exceeded: 429 Too Many Requests", ErrorCode.AI_RATE_LIMITED)
      ),
      estimateTokens: () => 10,
      getRateLimits: () => ({ requestsPerMinute: 15 } as any),
    };

    const mockFallbackProvider = {
      name: "openai",
      review: vi.fn().mockResolvedValue({
        findings: [
          {
            file: "src/index.ts",
            line: 11,
            severity: "error",
            category: "bug",
            title: "Fallback Issue",
            description: "Caught by fallback provider",
            confidence: 0.9,
            usefulness: 3,
          },
        ],
        summary: "Analyzed via backup",
        overallRisk: "medium",
        rubricEvaluation: {
          security: { score: 4, justification: "Good" },
          performance: { score: 4, justification: "Fast" },
          typeSafety: { score: 4, justification: "Safe" },
          style: { score: 4, justification: "Consistent" },
          complexity: { score: 4, justification: "Modular" },
        },
        usage: { inputTokens: 5, outputTokens: 10 },
      }),
      estimateTokens: () => 10,
      getRateLimits: () => ({} as any),
    };

    const mockCtx: ActionContext = {
      octokit: {} as any,
      aiProvider: mockPrimaryProvider as any,
      aiFallbackProvider: mockFallbackProvider as any,
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
      commitSha: "sha",
      baseRef: "base",
      headRef: "head",
    };

    // Execute with high-speed delay configurations to run tests instantly
    const res = await reviewChunks(
      mockChunks,
      { ...DEFAULT_CONFIG, maxConcurrency: 1 },
      mockCtx
    );

    // Assertions
    expect(mockPrimaryProvider.review).toHaveBeenCalled();
    expect(mockFallbackProvider.review).toHaveBeenCalled();
    expect(res.findings).toHaveLength(1);
    expect(res.findings[0].title).toBe("Fallback Issue");
    expect(res.errors).toContain(
      "Primary provider (gemini) exhausted. Automatically failed over to fallback provider (openai)."
    );
  });
});
