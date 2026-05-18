import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AIProvider, AIReviewRequest, AIReviewResponse } from "./base";
import { AIProviderType, ErrorCode } from "../types";
import { AIError } from "../errors";
import { DEFAULTS } from "../constants";

export class GeminiProvider implements AIProvider {
  readonly name = AIProviderType.GEMINI;
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new AIError("Gemini API key is required but missing.", ErrorCode.AI_API_ERROR);
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    try {
      const model = this.ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: request.systemPrompt,
      });

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              findings: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    file: { type: SchemaType.STRING },
                    line: { type: SchemaType.INTEGER },
                    severity: { type: SchemaType.STRING },
                    category: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    suggestion: { type: SchemaType.STRING },
                    confidence: { type: SchemaType.NUMBER },
                    usefulness: { type: SchemaType.INTEGER },
                  },
                  required: ["file", "line", "severity", "category", "title", "description", "confidence", "usefulness"],
                },
              },
              summary: { type: SchemaType.STRING },
              overallRisk: { type: SchemaType.STRING },
              rubricEvaluation: {
                type: SchemaType.OBJECT,
                properties: {
                  security: {
                    type: SchemaType.OBJECT,
                    properties: {
                      justification: { type: SchemaType.STRING },
                      score: { type: SchemaType.INTEGER },
                    },
                    required: ["justification", "score"],
                  },
                  performance: {
                    type: SchemaType.OBJECT,
                    properties: {
                      justification: { type: SchemaType.STRING },
                      score: { type: SchemaType.INTEGER },
                    },
                    required: ["justification", "score"],
                  },
                  typeSafety: {
                    type: SchemaType.OBJECT,
                    properties: {
                      justification: { type: SchemaType.STRING },
                      score: { type: SchemaType.INTEGER },
                    },
                    required: ["justification", "score"],
                  },
                  style: {
                    type: SchemaType.OBJECT,
                    properties: {
                      justification: { type: SchemaType.STRING },
                      score: { type: SchemaType.INTEGER },
                    },
                    required: ["justification", "score"],
                  },
                  complexity: {
                    type: SchemaType.OBJECT,
                    properties: {
                      justification: { type: SchemaType.STRING },
                      score: { type: SchemaType.INTEGER },
                    },
                    required: ["justification", "score"],
                  },
                },
                required: ["security", "performance", "typeSafety", "style", "complexity"],
              },
            },
            required: ["findings", "summary", "overallRisk", "rubricEvaluation"],
          },
        },
      });

      const textResponse = response.response.text();
      if (!textResponse) {
        throw new AIError("Empty response received from Gemini.", ErrorCode.AI_RESPONSE_INVALID);
      }

      const parsed = JSON.parse(textResponse);
      return {
        findings: parsed.findings || [],
        summary: parsed.summary || "",
        overallRisk: parsed.overallRisk || "low",
        rubricEvaluation: parsed.rubricEvaluation,
        usage: {
          inputTokens: response.response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.response.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("429") || message.toLowerCase().includes("quota")) {
        throw new AIError(`Gemini API rate limit exceeded: ${message}`, ErrorCode.AI_RATE_LIMITED, error instanceof Error ? error : undefined);
      }
      throw new AIError(`Gemini API call failed: ${message}`, ErrorCode.AI_API_ERROR, error instanceof Error ? error : undefined);
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / DEFAULTS.TOKEN_ESTIMATE_RATIO);
  }

  getRateLimits() {
    return {
      requestsPerMinute: DEFAULTS.GEMINI_FREE_RPM,
      tokensPerMinute: 1_000_000,
      requestsPerDay: DEFAULTS.GEMINI_FREE_RPD,
    };
  }
}

export function createProvider(type: AIProviderType, apiKey: string): AIProvider {
  switch (type) {
    case AIProviderType.GEMINI:
      return new GeminiProvider(apiKey);
    default:
      throw new AIError(`Unsupported AI Provider Type: ${type}`, ErrorCode.CONFIG_INVALID);
  }
}
