import { describe, it, expect } from "vitest";
import { parsePatch } from "../../../src/diff/parser";

describe("parsePatch", () => {
  it("should parse a simple patch with modifications", () => {
    const patch = `@@ -1,3 +1,4 @@
 line 1
-line 2
+line 2 modified
+line 3 added
 line 4`;

    const hunks = parsePatch(patch, "test.ts");
    expect(hunks).toHaveLength(1);
    const hunk = hunks[0];
    expect(hunk.file).toBe("test.ts");
    expect(hunk.startLine).toBe(1);
    expect(hunk.endLine).toBe(4);
    expect(hunk.lines).toHaveLength(5);

    expect(hunk.lines[0]).toEqual({ type: "context", content: "line 1", oldLineNumber: 1, newLineNumber: 1 });
    expect(hunk.lines[1]).toEqual({ type: "remove", content: "line 2", oldLineNumber: 2, newLineNumber: null });
    expect(hunk.lines[2]).toEqual({ type: "add", content: "line 2 modified", oldLineNumber: null, newLineNumber: 2 });
  });
});
