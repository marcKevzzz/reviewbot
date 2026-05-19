import * as fs from "fs";
import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { loadConfig } from "./config/loader";
import { createProvider } from "./providers";
import { fetchDiff } from "./diff/fetcher";
import { filterAndParseDiff } from "./diff/filter";
import { chunkDiff } from "./review/chunker";
import { reviewChunks } from "./review/reviewer";
import { publishComments } from "./publisher/commenter";
import { generateSummaryBody } from "./publisher/summary";
import { logger } from "./utils/logger";
import { ActionContext, Category, Severity } from "./types";

export async function run(): Promise<void> {
  const startTime = Date.now();
  try {
    logger.info("Initializing ReviewBot action...");

    const githubToken = core.getInput("github-token", { required: true });
    const aiApiKey = core.getInput("ai-api-key", { required: false });
    const aiFallbackKey = core.getInput("ai-fallback-key", { required: false }) ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY;

    if (!aiApiKey) {
      core.warning(
        "⚠️ 'ai-api-key' input is missing or empty. Skipping AI code review. " +
        "This is common on PRs from automated systems like Dependabot or forks where repository secrets are not exposed for security."
      );
      core.setOutput("findings-count", 0);
      core.setOutput("risk-level", "low");
      core.setOutput("duration-ms", Date.now() - startTime);
      return;
    }

    // Parse repository coordinates
    const repository = process.env.GITHUB_REPOSITORY;
    if (!repository) {
      throw new Error("GITHUB_REPOSITORY environment variable is not defined.");
    }
    const [owner, repo] = repository.split("/");

    // Parse GITHUB_EVENT_PATH for pull request information
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs.existsSync(eventPath)) {
      throw new Error("GITHUB_EVENT_PATH is not defined or the file does not exist.");
    }

    const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    const pullNumber = eventData.pull_request?.number;
    const commitSha = eventData.pull_request?.head?.sha;
    const baseRef = eventData.pull_request?.base?.sha;
    const headRef = eventData.pull_request?.head?.sha;

    if (!pullNumber || !commitSha) {
      throw new Error("This action only supports pull_request events with valid head commits.");
    }

    logger.info(`PR Context: #${pullNumber} | Repo: ${owner}/${repo} | Commit: ${commitSha}`);

    // Load Configurations & Engine dependencies
    const config = loadConfig();
    const provider = createProvider(config.provider, aiApiKey, {
      model: config.model,
      baseUrl: config.openaiBaseUrl,
    });

    let fallbackProvider;
    if (aiFallbackKey) {
      const fallbackProviderType = (core.getInput("fallback-provider", { required: false }) || "openai") as any;
      const fallbackModel = core.getInput("fallback-model", { required: false }) || "llama-3.3-70b-versatile";
      const fallbackBaseUrl = core.getInput("fallback-base-url", { required: false }) || "https://api.groq.com/openai/v1";

      fallbackProvider = createProvider(fallbackProviderType, aiFallbackKey, {
        model: fallbackModel,
        baseUrl: fallbackBaseUrl,
      });
      logger.info(`Fallback AI Provider configured: ${fallbackProviderType} using model ${fallbackModel}`);
    }

    const octokit = new Octokit({ auth: githubToken });

    const ctx: ActionContext = {
      octokit,
      aiProvider: provider,
      aiFallbackProvider: fallbackProvider,
      owner,
      repo,
      pullNumber,
      commitSha,
      baseRef,
      headRef,
    };

    // 1. Diff Acquisition & Parsing
    const rawFiles = await fetchDiff(ctx);
    const filtered = filterAndParseDiff(rawFiles, config);
    logger.info(`Diff Stats: ${filtered.stats.includedFiles} included, ${filtered.stats.excludedFiles} excluded, +${filtered.stats.totalAdditions} additions, -${filtered.stats.totalDeletions} deletions.`);

    if (filtered.files.length === 0) {
      logger.info("No matching or modified files were found for review. Skipping AI stage.");
      return;
    }

    // 2. Chunker
    const chunks = chunkDiff(filtered.files, config, provider);
    if (chunks.length === 0) {
      logger.info("Zero review chunks generated. Skipping AI stage.");
      return;
    }

    // 3. AI Execution
    const review = await reviewChunks(chunks, config, ctx);

    // 4. Report Metric Compilation
    const bySeverity: Record<Severity, number> = {
      [Severity.ERROR]: 0,
      [Severity.WARNING]: 0,
      [Severity.INFO]: 0,
    };
    const byCategory: Record<Category, number> = {
      [Category.BUG]: 0,
      [Category.SECURITY]: 0,
      [Category.PERFORMANCE]: 0,
      [Category.STYLE]: 0,
      [Category.COMPLEXITY]: 0,
      [Category.BEST_PRACTICE]: 0,
      [Category.TYPE_SAFETY]: 0,
      [Category.ERROR_HANDLING]: 0,
    };

    for (const f of review.findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }

    const durationMs = Date.now() - startTime;

    const stats = {
      totalFindings: review.findings.length,
      bySeverity,
      byCategory,
      filesReviewed: filtered.files.length,
      chunksProcessed: chunks.length,
      tokensUsed: review.tokensUsed,
      durationMs,
      estimatedCost: 0,
      errors: review.errors || [],
    };

    // 5. Publisher Summary Formatting
    const summaryBody = generateSummaryBody(review.findings, review.summaries, stats, config);

    // 6. Review Publication
    await publishComments(ctx, review.findings, config, summaryBody);

    logger.info(`ReviewBot analysis finished successfully in ${(durationMs / 1000).toFixed(2)}s!`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("ReviewBot pipeline failed with critical error:", err);
    core.setFailed(err.message);
  }
}

// Bootstrap Execution
run();
