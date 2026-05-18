import { DiffHunk } from "../types";

export function parsePatch(patch: string, file: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = patch.split(/\r?\n/);
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -oldStart,oldLength +newStart,newLength @@
      const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
        currentHunk = {
          file,
          startLine: newLineNum,
          endLine: newLineNum, // will be updated
          header: line,
          lines: [],
        };
      }
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "add",
        content: line.substring(1),
        oldLineNumber: null,
        newLineNumber: newLineNum,
      });
      currentHunk.endLine = newLineNum;
      newLineNum++;
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "remove",
        content: line.substring(1),
        oldLineNumber: oldLineNum,
        newLineNumber: null,
      });
      oldLineNum++;
    } else {
      currentHunk.lines.push({
        type: "context",
        content: line.substring(1),
        oldLineNumber: oldLineNum,
        newLineNumber: newLineNum,
      });
      currentHunk.endLine = newLineNum;
      oldLineNum++;
      newLineNum++;
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}
