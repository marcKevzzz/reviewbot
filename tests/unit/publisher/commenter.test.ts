import { describe, it, expect, vi } from "vitest";
import { publishComments } from "../../../src/publisher/commenter";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { ReviewFinding, Severity, Category } from "../../../src/types";

describe("publishComments", () => {
  it("should trigger octokit.pulls.createReview with mapped findings", async () => {
    const mockOctokit = {
      pulls: {
        createReview: vi.fn().mockResolvedValue({}),
      },
    };

    const mockCtx = {
      octokit: mockOctokit as any,
      aiProvider: {} as any,
      owner: "owner",
      repo: "repo",
      pullNumber: 1,
      commitSha: "sha123",
      baseRef: "base",
      headRef: "head",
    };

    const mockFindings: ReviewFinding[] = [
      {
        file: "src/index.ts",
        line: 10,
        severity: Severity.ERROR,
        category: Category.BUG,
        title: "Bug Title",
        description: "Bug description",
        suggestion: "Use const instead",
        confidence: 0.95,
        usefulness: 3,
      },
    ];

    await publishComments(mockCtx, mockFindings, DEFAULT_CONFIG, "Summary text");

    expect(mockOctokit.pulls.createReview).toHaveBeenCalledTimes(1);
    const callArgs = mockOctokit.pulls.createReview.mock.calls[0][0];
    expect(callArgs.owner).toBe("owner");
    expect(callArgs.commit_id).toBe("sha123");
    expect(callArgs.comments).toHaveLength(1);
    expect(callArgs.comments[0].path).toBe("src/index.ts");
    expect(callArgs.comments[0].body).toContain("Bug Title");
  });
});
