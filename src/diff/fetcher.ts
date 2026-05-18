import { ActionContext, RawDiffFile } from "../types";
import { DiffError } from "../errors";
import { ErrorCode } from "../types";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/logger";

export async function fetchDiff(ctx: ActionContext): Promise<RawDiffFile[]> {
  try {
    logger.info(`Fetching files for PR #${ctx.pullNumber}...`);
    return await withRetry(async () => {
      const response = await ctx.octokit.pulls.listFiles({
        owner: ctx.owner,
        repo: ctx.repo,
        pull_number: ctx.pullNumber,
        per_page: 100,
      });

      // Map and validate response structure
      return response.data.map((file: any) => ({
        filename: file.filename,
        status: file.status as any,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
        previousFilename: file.previous_filename,
        sha: file.sha,
      }));
    });
  } catch (error) {
    throw new DiffError(
      `Failed to fetch PR file diff from GitHub: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.DIFF_FETCH_FAILED,
      error instanceof Error ? error : undefined
    );
  }
}
