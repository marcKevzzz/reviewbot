import { z } from "zod";
import { Severity, Category } from "../types";

export const FindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  severity: z.nativeEnum(Severity),
  category: z.nativeEnum(Category),
  title: z.string().max(100),
  description: z.string().max(1000),
  suggestion: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1),
  usefulness: z.number().int().min(1).max(3),
});

export const RubricScoreSchema = z.object({
  justification: z.string().max(2000),
  score: z.number().int().min(1).max(5),
});

export const RubricEvaluationSchema = z.object({
  security: RubricScoreSchema,
  performance: RubricScoreSchema,
  typeSafety: RubricScoreSchema,
  style: RubricScoreSchema,
  complexity: RubricScoreSchema,
});

export const ReviewResponseSchema = z.object({
  findings: z.array(FindingSchema),
  summary: z.string().max(2000),
  overallRisk: z.enum(["low", "medium", "high", "critical"]),
  rubricEvaluation: RubricEvaluationSchema,
});

export type ReviewFinding = z.infer<typeof FindingSchema>;
export type AIReviewResponseData = z.infer<typeof ReviewResponseSchema>;
