import { describe, it, expect } from "vitest";
import { chunkDiff } from "../../../src/review/chunker";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { DiffFile } from "../../../src/types";

describe("chunkDiff", () => {
  const mockFiles: DiffFile[] = [
    {
      filename: "src/index.ts",
      language: "typescript",
      status: "modified",
      hunks: [
        {
          file: "src/index.ts",
          startLine: 1,
          endLine: 2,
          header: "@@ -1,2 +1,2 @@",
          lines: [
            { type: "context", content: "const a = 1;", oldLineNumber: 1, newLineNumber: 1 },
            { type: "add", content: "const b = 2;", oldLineNumber: null, newLineNumber: 2 },
          ],
        },
      ],
    },
  ];

  it("should divide files into chunks successfully", () => {
    const mockProvider = {
      name: "gemini" as any,
      review: async () => ({} as any),
      estimateTokens: () => 100,
      getRateLimits: () => ({} as any),
    };

    const chunks = chunkDiff(mockFiles, DEFAULT_CONFIG, mockProvider);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].file).toBe("src/index.ts");
    expect(chunks[0].estimatedTokens).toBe(100);
  });
});
