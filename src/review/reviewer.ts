import { ActionContext, ReviewChunk, ReviewFinding, Severity, DiffHunk, RubricEvaluation, RubricScore } from "../types";
import { ReviewBotConfig } from "../config/schema";
import { SYSTEM_PROMPT, createUserPrompt } from "./prompts";
import { ReviewResponseSchema } from "./schemas";
import { logger } from "../utils/logger";
import { AIError } from "../errors";
import { ErrorCode } from "../types";
import { withRetry } from "../utils/retry";

export interface ReviewResult {
  findings: ReviewFinding[];
  summaries: string[];
  tokensUsed: number;
  rubricScores?: RubricEvaluation;
  mergabilityGrade?: string;
  errors?: string[];
}

// Helper to check if a line was actually added or modified in the hunks
function isLineAddedInHunks(lineNum: number, hunks: DiffHunk[]): boolean {
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === "add" && line.newLineNumber === lineNum) {
        return true;
      }
    }
  }
  return false;
}

export async function reviewChunks(
  chunks: ReviewChunk[],
  config: ReviewBotConfig,
  ctx: ActionContext | import("../providers/base").AIProvider
): Promise<ReviewResult> {
  const findings: ReviewFinding[] = [];
  const summaries: string[] = [];
  const errors: string[] = [];
  let totalTokens = 0;

  const currentProvider = (ctx as any).aiProvider || ctx;
  let activeProvider = currentProvider;
  let isFallbackActive = false;

  // Track rubric evaluations for aggregation
  const rubricCollections = {
    security: { scores: [] as number[], justifications: [] as string[] },
    performance: { scores: [] as number[], justifications: [] as string[] },
    typeSafety: { scores: [] as number[], justifications: [] as string[] },
    style: { scores: [] as number[], justifications: [] as string[] },
    complexity: { scores: [] as number[], justifications: [] as string[] },
  };

  // Implement simple concurrency pool
  // Gemini free tier is highly sensitive to concurrent requests, so serialize requests (concurrency=1) for gemini free provider
  const isGeminiFree = currentProvider.name === "gemini";
  const maxConcurrency = isGeminiFree ? 1 : config.maxConcurrency;
  const concurrency = Math.min(maxConcurrency, chunks.length);
  const queue = [...chunks];
  
  logger.info(`Starting AI review on ${chunks.length} chunks with concurrency=${concurrency}...`);

  const worker = async () => {
    while (queue.length > 0) {
      const chunk = queue.shift();
      if (!chunk) break;

      try {
        const hunksText = chunk.hunks
          .map((h) => h.header + "\n" + h.lines.map((l) => (l.type === "add" ? "+" : l.type === "remove" ? "-" : " ") + l.content).join("\n"))
          .join("\n\n");

        const userPrompt = createUserPrompt(chunk.file, chunk.language, hunksText, config.customInstructions);
        
        logger.info(`Sending chunk ${chunk.id} to AI provider (${activeProvider.name}, ${chunk.estimatedTokens} estimated tokens)...`);
        
        let response: import("../providers/base").AIReviewResponse;
        try {
          response = await withRetry(
            () =>
              activeProvider.review({
                systemPrompt: SYSTEM_PROMPT,
                userPrompt,
                maxTokens: config.maxTokens,
                temperature: config.temperature,
              }),
            {
              maxAttempts: 3,
              baseDelayMs: 4000,
              maxDelayMs: 30000,
            }
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const fallbackProvider = (ctx as any).aiFallbackProvider;
          if (
            (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.includes("rate_limit")) &&
            fallbackProvider &&
            !isFallbackActive
          ) {
            logger.warning(
              `⚠️ Primary provider (${activeProvider.name}) rate-limited or exhausted quota: ${errMsg}. ` +
              `Seamlessly failing over to backup provider: ${fallbackProvider.name}...`
            );
            isFallbackActive = true;
            activeProvider = fallbackProvider;
            
            errors.push(
              `Primary provider (${(ctx as any).aiProvider?.name || "Gemini"}) exhausted. Automatically failed over to fallback provider (${fallbackProvider.name}).`
            );

            logger.info(`Retrying chunk ${chunk.id} with backup provider (${activeProvider.name})...`);
            response = await withRetry(
              () =>
                activeProvider.review({
                  systemPrompt: SYSTEM_PROMPT,
                  userPrompt,
                  maxTokens: config.maxTokens,
                  temperature: config.temperature,
                }),
              {
                maxAttempts: 3,
                baseDelayMs: 3000,
                maxDelayMs: 20000,
              }
            );
          } else {
            throw err;
          }
        }

        totalTokens += response.usage.inputTokens + response.usage.outputTokens;

        // Validate structure via Zod
        const parsed = ReviewResponseSchema.safeParse(response);
        if (!parsed.success) {
          logger.error(`AI returned malformed JSON for chunk ${chunk.id}: ${parsed.error.message}`);
          continue;
        }

        const data = parsed.data;
        summaries.push(`**${chunk.file}**: ${data.summary}`);

        // Collect rubric scores
        if (data.rubricEvaluation) {
          const evalData = data.rubricEvaluation;
          if (evalData.security) {
            rubricCollections.security.scores.push(evalData.security.score);
            rubricCollections.security.justifications.push(`${chunk.file}: ${evalData.security.justification}`);
          }
          if (evalData.performance) {
            rubricCollections.performance.scores.push(evalData.performance.score);
            rubricCollections.performance.justifications.push(`${chunk.file}: ${evalData.performance.justification}`);
          }
          if (evalData.typeSafety) {
            rubricCollections.typeSafety.scores.push(evalData.typeSafety.score);
            rubricCollections.typeSafety.justifications.push(`${chunk.file}: ${evalData.typeSafety.justification}`);
          }
          if (evalData.style) {
            rubricCollections.style.scores.push(evalData.style.score);
            rubricCollections.style.justifications.push(`${chunk.file}: ${evalData.style.justification}`);
          }
          if (evalData.complexity) {
            rubricCollections.complexity.scores.push(evalData.complexity.score);
            rubricCollections.complexity.justifications.push(`${chunk.file}: ${evalData.complexity.justification}`);
          }
        }

        // Filter and post-process findings
        for (const f of data.findings) {
          // Check severity threshold
          const severityOrder = [Severity.INFO, Severity.WARNING, Severity.ERROR];
          const thresholdIdx = severityOrder.indexOf(config.severityThreshold);
          const findingIdx = severityOrder.indexOf(f.severity as Severity);
          if (findingIdx < thresholdIdx) {
            logger.debug(`Skipping finding: ${f.title} (severity ${f.severity} below threshold ${config.severityThreshold})`);
            continue;
          }

          // Check category inclusion
          if (!config.reviewCategories.includes(f.category as any)) {
            logger.debug(`Skipping finding: ${f.title} (category ${f.category} not in requested categories)`);
            continue;
          }

          // Nitpick filtering: drop usefulness level 1 (stylistic nits) if enabled
          if (config.enableNitpickFilter && f.usefulness === 1) {
            logger.info(`Nitpick Filter: Dropped stylistic comment "${f.title}" on line ${f.line} of ${chunk.file}`);
            continue;
          }

          // Strict line validation
          if (!isLineAddedInHunks(f.line, chunk.hunks)) {
            logger.warning(`AI hallucinated a comment on line ${f.line} of ${chunk.file} which was not added/modified in the PR. Filtering out.`);
            continue;
          }

          findings.push({
            file: chunk.file,
            line: f.line,
            severity: f.severity as Severity,
            category: f.category as any,
            title: f.title,
            description: f.description,
            suggestion: f.suggestion,
            confidence: f.confidence,
            usefulness: f.usefulness,
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to review chunk ${chunk.id}: ${errMsg}`);
        errors.push(errMsg);
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Aggregate rubric scores and concatenate justifications
  const aggregateRubric = (col: { scores: number[]; justifications: string[] }): RubricScore => {
    const avgScore = col.scores.length > 0
      ? parseFloat((col.scores.reduce((a, b) => a + b, 0) / col.scores.length).toFixed(2))
      : 5.0; // fallback to 5.0 if no scores available
    const combinedJust = col.justifications.length > 0
      ? col.justifications.map((j) => `* ${j}`).join("\n")
      : "No changes analyzed in this category.";
    return { score: avgScore, justification: combinedJust };
  };

  const rubricScores: RubricEvaluation = {
    security: aggregateRubric(rubricCollections.security),
    performance: aggregateRubric(rubricCollections.performance),
    typeSafety: aggregateRubric(rubricCollections.typeSafety),
    style: aggregateRubric(rubricCollections.style),
    complexity: aggregateRubric(rubricCollections.complexity),
  };

  // Calculate weighted overall score
  const weights = config.rubricWeights;
  const weightedSum =
    rubricScores.security.score * weights.security +
    rubricScores.performance.score * weights.performance +
    rubricScores.typeSafety.score * weights.typeSafety +
    rubricScores.style.score * weights.style +
    rubricScores.complexity.score * weights.complexity;

  const totalWeight =
    weights.security +
    weights.performance +
    weights.typeSafety +
    weights.style +
    weights.complexity;

  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 5.0;

  // Map final score to Mergability Grade
  let mergabilityGrade = "A (Low Risk)";
  if (finalScore >= 4.5) {
    mergabilityGrade = "A (Low Risk)";
  } else if (finalScore >= 3.5) {
    mergabilityGrade = "B (Minor Concerns)";
  } else {
    mergabilityGrade = "C (Action Required)";
  }

  // Sort and limit findings
  const sortedFindings = findings
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, config.maxFindings);

  return {
    findings: sortedFindings,
    summaries,
    tokensUsed: totalTokens,
    rubricScores,
    mergabilityGrade,
    errors,
  };
}
