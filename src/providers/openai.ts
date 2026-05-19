import { AIProvider, AIReviewRequest, AIReviewResponse } from "./base";
import { AIProviderType, ErrorCode } from "../types";
import { AIError } from "../errors";
import { DEFAULTS } from "../constants";

export class OpenAIProvider implements AIProvider {
  readonly name = AIProviderType.OPENAI;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, options: { model?: string; baseUrl?: string } = {}) {
    this.apiKey = apiKey;
    this.model = options.model || "gpt-4o-mini";
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        if (status === 429 || errorText.toLowerCase().includes("quota") || errorText.includes("rate_limit")) {
          throw new AIError(
            `OpenAI-compatible API rate limit exceeded (${status}): ${errorText}`,
            ErrorCode.AI_RATE_LIMITED
          );
        }
        throw new AIError(
          `OpenAI-compatible API call failed (${status}): ${errorText}`,
          ErrorCode.AI_API_ERROR
        );
      }

      const data = await response.json() as any;
      const textResponse = data.choices?.[0]?.message?.content;
      if (!textResponse) {
        throw new AIError("Empty response received from OpenAI-compatible API.", ErrorCode.AI_RESPONSE_INVALID);
      }

      const parsed = JSON.parse(textResponse);
      return {
        findings: parsed.findings || [],
        summary: parsed.summary || "",
        overallRisk: parsed.overallRisk || "low",
        rubricEvaluation: parsed.rubricEvaluation,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429") || message.toLowerCase().includes("quota")) {
        throw new AIError(
          `OpenAI-compatible API rate limit exceeded: ${message}`,
          ErrorCode.AI_RATE_LIMITED,
          error instanceof Error ? error : undefined
        );
      }
      throw new AIError(
        `OpenAI-compatible API call failed: ${message}`,
        ErrorCode.AI_API_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / DEFAULTS.TOKEN_ESTIMATE_RATIO);
  }

  getRateLimits() {
    return {
      requestsPerMinute: 60,
      tokensPerMinute: 1_000_000,
      requestsPerDay: 5000,
    };
  }
}
