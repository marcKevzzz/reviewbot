import { describe, it, expect } from "vitest";
import { filterAndParseDiff } from "../../../src/diff/filter";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { RawDiffFile } from "../../../src/types";

describe("filterAndParseDiff", () => {
  const mockFiles: RawDiffFile[] = [
    { filename: "src/index.ts", status: "modified", additions: 10, deletions: 5, changes: 15, patch: "@@ -1 +1 @@\n-old\n+new", sha: "sha1" },
    { filename: "node_modules/dep/index.js", status: "modified", additions: 10, deletions: 5, changes: 15, patch: "@@ -1 +1 @@\n-old\n+new", sha: "sha2" },
    { filename: "package-lock.json", status: "modified", additions: 100, deletions: 5, changes: 105, patch: "patch", sha: "sha3" },
  ];

  it("should filter out excluded files based on default globs", () => {
    const res = filterAndParseDiff(mockFiles, DEFAULT_CONFIG);
    expect(res.files).toHaveLength(1);
    expect(res.files[0].filename).toBe("src/index.ts");
    expect(res.stats.includedFiles).toBe(1);
    expect(res.stats.excludedFiles).toBe(2);
  });
});
