import * as path from "path";
import { RawDiffFile, DiffFile, FilteredDiff } from "../types";
import { parsePatch } from "./parser";
import { LANGUAGE_MAP } from "../constants";
import { logger } from "../utils/logger";
import { ReviewBotConfig } from "../config/schema";

// Simple glob helper since we want to avoid extra dependencies
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

function matchesGlobs(filename: string, globs: string[]): boolean {
  return globs.some((glob) => globToRegex(glob).test(filename));
}

export function filterAndParseDiff(
  files: RawDiffFile[],
  config: ReviewBotConfig
): FilteredDiff {
  const parsedFiles: DiffFile[] = [];
  let includedCount = 0;
  let excludedCount = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const file of files) {
    const isIncluded = matchesGlobs(file.filename, config.include);
    const isExcluded = matchesGlobs(file.filename, config.exclude);

    if (!isIncluded || isExcluded) {
      logger.debug(`Filtered out file: ${file.filename}`);
      excludedCount++;
      continue;
    }

    // Check size constraint
    const additions = file.additions;
    const deletions = file.deletions;
    totalAdditions += additions;
    totalDeletions += deletions;

    if (!file.patch) {
      logger.debug(`Skipping file with no patch (empty or binary): ${file.filename}`);
      excludedCount++;
      continue;
    }

    const sizeEstimateKb = (file.patch.length * 4) / 1024; // 4 bytes per char approximation
    if (sizeEstimateKb > config.maxFileSizeKb) {
      logger.warning(`Skipping large file: ${file.filename} (${Math.round(sizeEstimateKb)}KB > ${config.maxFileSizeKb}KB)`);
      excludedCount++;
      continue;
    }

    const ext = path.extname(file.filename);
    const language = LANGUAGE_MAP[ext] || "plaintext";
    const hunks = parsePatch(file.patch, file.filename);

    parsedFiles.push({
      filename: file.filename,
      language,
      hunks,
      status: file.status,
    });
    includedCount++;
  }

  return {
    files: parsedFiles,
    stats: {
      totalFiles: files.length,
      includedFiles: includedCount,
      excludedFiles: excludedCount,
      totalAdditions,
      totalDeletions,
    },
  };
}
