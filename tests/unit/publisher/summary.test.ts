import { describe, it, expect } from "vitest";
import { generateSummaryBody } from "../../../src/publisher/summary";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { Severity, Category } from "../../../src/types";

describe("generateSummaryBody", () => {
  it("should compile a premium markdown scorecard report correctly", () => {
    const mockFindings = [
      {
        file: "src/index.ts",
        line: 42,
        severity: Severity.ERROR,
        category: Category.BUG,
        title: "Serious Bug",
        description: "description",
        suggestion: "suggest",
        confidence: 0.9,
        usefulness: 2,
      },
    ];

    const mockStats = {
      totalFindings: 1,
      bySeverity: { [Severity.ERROR]: 1, [Severity.WARNING]: 0, [Severity.INFO]: 0 },
      byCategory: { [Category.BUG]: 1 } as any,
      filesReviewed: 1,
      chunksProcessed: 1,
      tokensUsed: 1500,
      durationMs: 4500,
      estimatedCost: 0,
      mergabilityGrade: "B (Minor Concerns)",
      rubricScores: {
        security: { score: 4.5, justification: "Secure code." },
        performance: { score: 3.8, justification: "Minor performance tweaks possible." },
        typeSafety: { score: 5.0, justification: "Excellent typings." },
        style: { score: 4.2, justification: "Well styled." },
        complexity: { score: 3.5, justification: "Somewhat complex." }
      }
    };

    const summaries = ["src/index.ts: Completed review successfully"];

    const body = generateSummaryBody(mockFindings, summaries, mockStats, DEFAULT_CONFIG);
    expect(body).toContain("ReviewBot Code Quality Report");
    expect(body).toContain("Pull Request Grade**: **B (Minor Concerns)**");
    expect(body).toContain("Quality Scorecard");
    expect(body).toContain("🔒 Security");
    expect(body).toContain("██████████"); // 5.0 rounded is 10/10 -> 10 chars of █
    expect(body).toContain("<details>");
    expect(body).toContain("Secure code.");
  });
});
