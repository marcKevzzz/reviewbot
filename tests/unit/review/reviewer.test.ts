import { describe, it, expect, vi } from "vitest";
import { reviewChunks } from "../../../src/review/reviewer";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { ReviewChunk, Severity, Category } from "../../../src/types";

describe("reviewChunks", () => {
  it("should process findings and filter out hallucinated line numbers", async () => {
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
              { type: "context", content: "const x = 1;", oldLineNumber: 10, newLineNumber: 10 },
              { type: "add", content: "const y = 2;", oldLineNumber: null, newLineNumber: 11 },
              { type: "context", content: "const z = 3;", oldLineNumber: 12, newLineNumber: 12 },
            ],
          },
        ],
        estimatedTokens: 50,
      },
    ];

    const mockProvider = {
      name: "gemini" as any,
      review: vi.fn().mockResolvedValue({
        findings: [
          {
            file: "src/index.ts",
            line: 11, // Valid added line
            severity: "error",
            category: "bug",
            title: "Bug 1",
            description: "Real bug",
            confidence: 0.9,
            usefulness: 2,
          },
          {
            file: "src/index.ts",
            line: 12, // Context line (NOT added)
            severity: "error",
            category: "bug",
            title: "Bug 2",
            description: "Hallucinated context bug",
            confidence: 0.8,
            usefulness: 3,
          },
        ],
        summary: "Review done",
        overallRisk: "medium",
        rubricEvaluation: {
          security: { score: 5, justification: "Security ok" },
          performance: { score: 4, justification: "Performance ok" },
          typeSafety: { score: 5, justification: "Types strict" },
          style: { score: 4, justification: "Style ok" },
          complexity: { score: 5, justification: "Complexity simple" },
        },
        usage: { inputTokens: 10, outputTokens: 20 },
      }),
      estimateTokens: () => 10,
      getRateLimits: () => ({} as any),
    };

    const res = await reviewChunks(mockChunks, DEFAULT_CONFIG, mockProvider);
    expect(res.findings).toHaveLength(1);
    expect(res.findings[0].line).toBe(11);
    expect(res.findings[0].title).toBe("Bug 1");
    expect(res.mergabilityGrade).toBe("A (Low Risk)");
  });

  it("should filter out nitpick findings if enableNitpickFilter is active", async () => {
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

    const mockProvider = {
      name: "gemini" as any,
      review: vi.fn().mockResolvedValue({
        findings: [
          {
            file: "src/index.ts",
            line: 11,
            severity: "info",
            category: "style",
            title: "Styling spacing Nit",
            description: "Please add a space",
            confidence: 0.9,
            usefulness: 1, // Nitpick
          },
        ],
        summary: "Review done",
        overallRisk: "low",
        rubricEvaluation: {
          security: { score: 5, justification: "Security ok" },
          performance: { score: 5, justification: "Performance ok" },
          typeSafety: { score: 5, justification: "Types strict" },
          style: { score: 3, justification: "Style needs work" },
          complexity: { score: 5, justification: "Complexity simple" },
        },
        usage: { inputTokens: 10, outputTokens: 20 },
      }),
      estimateTokens: () => 10,
      getRateLimits: () => ({} as any),
    };

    // With nitpick filter active (default)
    const resActive = await reviewChunks(mockChunks, { ...DEFAULT_CONFIG, enableNitpickFilter: true }, mockProvider);
    expect(resActive.findings).toHaveLength(0);

    // With nitpick filter inactive
    const resInactive = await reviewChunks(mockChunks, { ...DEFAULT_CONFIG, enableNitpickFilter: false }, mockProvider);
    expect(resInactive.findings).toHaveLength(1);
    expect(resInactive.findings[0].title).toBe("Styling spacing Nit");
  });

  it("should calculate correct weighted scorecard average and assign appropriate grade", async () => {
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

    const mockProvider = {
      name: "gemini" as any,
      review: vi.fn().mockResolvedValue({
        findings: [],
        summary: "Review done",
        overallRisk: "high",
        rubricEvaluation: {
          security: { score: 2, justification: "Security issues" },
          performance: { score: 3, justification: "Performance issues" },
          typeSafety: { score: 2, justification: "Loose types" },
          style: { score: 4, justification: "Style ok" },
          complexity: { score: 3, justification: "Complex nesting" },
        },
        usage: { inputTokens: 10, outputTokens: 20 },
      }),
      estimateTokens: () => 10,
      getRateLimits: () => ({} as any),
    };

    const config = {
      ...DEFAULT_CONFIG,
      rubricWeights: {
        security: 0.4,
        performance: 0.2,
        typeSafety: 0.2,
        style: 0.1,
        complexity: 0.1,
      },
    };

    const res = await reviewChunks(mockChunks, config, mockProvider);
    // Weighted Calculation:
    // security: 2 * 0.4 = 0.8
    // performance: 3 * 0.2 = 0.6
    // typeSafety: 2 * 0.2 = 0.4
    // style: 4 * 0.1 = 0.4
    // complexity: 3 * 0.1 = 0.3
    // Sum = 2.5. Total weights = 1.0. Final = 2.5 / 1.0 = 2.5 -> C (Action Required)
    expect(res.rubricScores?.security.score).toBe(2);
    expect(res.mergabilityGrade).toBe("C (Action Required)");
  });
});
