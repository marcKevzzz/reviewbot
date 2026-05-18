import { z } from "zod";
import { AIProviderType, Category, ReviewEvent, Severity } from "../types";

export const ConfigSchema = z.object({
  provider: z.nativeEnum(AIProviderType).default(AIProviderType.GEMINI),
  model: z.string().default("gemini-2.0-flash"),
  maxTokens: z.number().int().min(100).max(16000).default(4096),
  temperature: z.number().min(0).max(1).default(0.1),

  include: z.array(z.string()).default(["**/*"]),
  exclude: z.array(z.string()).default([
    "**/node_modules/**", "**/dist/**", "**/build/**",
    "**/*.lock", "**/pnpm-lock.yaml", "**/package-lock.json",
    "**/*.min.js", "**/*.min.css", "**/*.generated.*",
  ]),
  maxFileSizeKb: z.number().int().min(1).max(1000).default(100),

  reviewCategories: z.array(z.nativeEnum(Category)).default([
    Category.BUG, Category.SECURITY, Category.PERFORMANCE, Category.STYLE,
  ]),
  severityThreshold: z.nativeEnum(Severity).default(Severity.INFO),
  maxFindings: z.number().int().min(1).max(100).default(25),
  maxConcurrency: z.number().int().min(1).max(10).default(3),

  summaryComment: z.boolean().default(true),
  inlineComments: z.boolean().default(true),
  reviewEvent: z.nativeEnum(ReviewEvent).default(ReviewEvent.COMMENT),

  enableNitpickFilter: z.boolean().default(true),
  rubricWeights: z.object({
    security: z.number().default(0.3),
    performance: z.number().default(0.2),
    typeSafety: z.number().default(0.2),
    style: z.number().default(0.1),
    complexity: z.number().default(0.2),
  }).default({
    security: 0.3,
    performance: 0.2,
    typeSafety: 0.2,
    style: 0.1,
    complexity: 0.2,
  }),

  customInstructions: z.string().optional(),
  languageHints: z.record(z.string(), z.string()).optional(),
});

export type ReviewBotConfig = z.infer<typeof ConfigSchema>;
