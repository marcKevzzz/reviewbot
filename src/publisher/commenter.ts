import { ActionContext, InlineComment, ReviewEvent, ReviewFinding } from "../types";
import { ReviewBotConfig } from "../config/schema";
import { PublishError } from "../errors";
import { ErrorCode } from "../types";
import { withRetry } from "../utils/retry";
import { logger } from "../utils/logger";

export async function publishComments(
  ctx: ActionContext,
  findings: ReviewFinding[],
  config: ReviewBotConfig,
  summaryBody: string
): Promise<void> {
  try {
    const comments: InlineComment[] = [];

    if (config.inlineComments && findings.length > 0) {
      for (const f of findings) {
        const severityLabel = f.severity === "error" ? "🔴 ERROR" : f.severity === "warning" ? "🟡 WARNING" : "🔵 INFO";
        const categoryLabel = f.category.toUpperCase().replace("_", " ");
        
        let body = `### 🤖 ReviewBot: ${f.title}\n`;
        body += `> **Category**: \`${categoryLabel}\` | **Severity**: **${severityLabel}** | **Confidence**: \`${Math.round(f.confidence * 100)}%\`\n\n`;
        body += `🔍 **Problem**: ${f.description}\n\n`;

        if (f.suggestion) {
          body += `🛠️ **Suggested Code Fix**:\n\`\`\`suggestion\n${f.suggestion.trim()}\n\`\`\``;
        }

        comments.push({
          path: f.file,
          line: f.line,
          side: "RIGHT",
          body,
        });
      }
    }

    logger.info(`Submitting review with ${comments.length} inline comments...`);
    await withRetry(async () => {
      await ctx.octokit.pulls.createReview({
        owner: ctx.owner,
        repo: ctx.repo,
        pull_number: ctx.pullNumber,
        commit_id: ctx.commitSha,
        event: config.reviewEvent as any,
        body: summaryBody,
        comments: comments.length > 0 ? (comments as any) : undefined,
      });
    });

    logger.info("PR review submitted successfully!");
  } catch (error) {
    throw new PublishError(
      `Failed to submit PR review on GitHub: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.PUBLISH_FAILED,
      error instanceof Error ? error : undefined
    );
  }
}
