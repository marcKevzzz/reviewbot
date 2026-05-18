import { AIProviderType } from "../types";

export interface AIProvider {
  readonly name: AIProviderType;
  review(request: AIReviewRequest): Promise<AIReviewResponse>;
  estimateTokens(text: string): number;
  getRateLimits(): ProviderRateLimits;
}

export interface AIReviewRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface AIReviewResponse {
  findings: any[];
  summary: string;
  overallRisk: "low" | "medium" | "high" | "critical";
  rubricEvaluation?: any;
  usage: { inputTokens: number; outputTokens: number };
}

export interface ProviderRateLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}
