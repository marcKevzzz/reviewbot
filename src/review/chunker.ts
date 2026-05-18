import { DiffFile, ReviewChunk } from "../types";
import { ReviewBotConfig } from "../config/schema";
import { AIProvider } from "../providers/base";
import { DEFAULTS } from "../constants";
import { logger } from "../utils/logger";

export function chunkDiff(
  files: DiffFile[],
  config: ReviewBotConfig,
  provider: AIProvider
): ReviewChunk[] {
  const chunks: ReviewChunk[] = [];
  const maxTokens = DEFAULTS.MAX_TOKENS_PER_CHUNK; // 8,000 as defined in constants

  let chunkCounter = 0;

  for (const file of files) {
    let currentHunks: typeof file.hunks = [];
    let currentTokens = 0;

    for (const hunk of file.hunks) {
      const hunkText = hunk.header + "\n" + hunk.lines.map((l) => l.content).join("\n");
      const hunkTokens = provider.estimateTokens(hunkText);

      // If a single hunk itself is larger than the limit, put it in its own chunk
      if (hunkTokens > maxTokens) {
        if (currentHunks.length > 0) {
          chunkCounter++;
          chunks.push({
            id: `${file.filename}-${chunkCounter}`,
            file: file.filename,
            language: file.language,
            hunks: currentHunks,
            estimatedTokens: currentTokens,
          });
          currentHunks = [];
          currentTokens = 0;
        }

        chunkCounter++;
        logger.warning(`Single hunk in ${file.filename} is very large (${hunkTokens} tokens). Allocating a dedicated chunk.`);
        chunks.push({
          id: `${file.filename}-${chunkCounter}`,
          file: file.filename,
          language: file.language,
          hunks: [hunk],
          estimatedTokens: hunkTokens,
        });
        continue;
      }

      // Check if adding this hunk would exceed the limit
      if (currentTokens + hunkTokens > maxTokens) {
        chunkCounter++;
        chunks.push({
          id: `${file.filename}-${chunkCounter}`,
          file: file.filename,
          language: file.language,
          hunks: currentHunks,
          estimatedTokens: currentTokens,
        });
        currentHunks = [hunk];
        currentTokens = hunkTokens;
      } else {
        currentHunks.push(hunk);
        currentTokens += hunkTokens;
      }
    }

    if (currentHunks.length > 0) {
      chunkCounter++;
      chunks.push({
        id: `${file.filename}-${chunkCounter}`,
        file: file.filename,
        language: file.language,
        hunks: currentHunks,
        estimatedTokens: currentTokens,
      });
    }
  }

  logger.info(`Split ${files.length} files into ${chunks.length} review chunks.`);
  return chunks;
}
