import { AIProvider } from "./base";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { AIProviderType, ErrorCode } from "../types";
import { AIError } from "../errors";

export interface ProviderOptions {
  model?: string;
  baseUrl?: string;
}

export function createProvider(
  type: AIProviderType,
  apiKey: string,
  options?: ProviderOptions
): AIProvider {
  switch (type) {
    case AIProviderType.GEMINI:
      return new GeminiProvider(apiKey);
    case AIProviderType.OPENAI:
      return new OpenAIProvider(apiKey, options);
    default:
      throw new AIError(`Unsupported AI Provider Type: ${type}`, ErrorCode.CONFIG_INVALID);
  }
}

export * from "./base";
export * from "./gemini";
export * from "./openai";
