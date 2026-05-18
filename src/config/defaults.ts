import { ReviewBotConfig } from "./schema";
import { AIProviderType, Category, ReviewEvent, Severity } from "../types";

export const DEFAULT_CONFIG: ReviewBotConfig = {
  provider: AIProviderType.GEMINI,
  model: "gemini-2.0-flash",
  maxTokens: 4096,
  temperature: 0.1,
  include: ["**/*"],
  exclude: [
    "**/node_modules/**", "**/dist/**", "**/build/**",
    "**/*.lock", "**/pnpm-lock.yaml", "**/package-lock.json",
    "**/*.min.js", "**/*.min.css", "**/*.generated.*",
  ],
  maxFileSizeKb: 100,
  reviewCategories: [Category.BUG, Category.SECURITY, Category.PERFORMANCE, Category.STYLE],
  severityThreshold: Severity.INFO,
  maxFindings: 25,
  maxConcurrency: 3,
  summaryComment: true,
  inlineComments: true,
  reviewEvent: ReviewEvent.COMMENT,
  enableNitpickFilter: true,
  rubricWeights: {
    security: 0.3,
    performance: 0.2,
    typeSafety: 0.2,
    style: 0.1,
    complexity: 0.2,
  },
};
