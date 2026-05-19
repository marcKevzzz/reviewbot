import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIProvider } from "../../../src/providers/openai";
import { AIReviewRequest } from "../../../src/providers/base";

describe("OpenAIProvider", () => {
  const fetchSpy = vi.spyOn(global, "fetch");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it("should successfully parse OpenAI completions JSON response", async () => {
    const mockResponseData = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              findings: [
                {
                  file: "src/utils.ts",
                  line: 10,
                  severity: "warning",
                  category: "security",
                  title: "Insecure Random",
                  description: "Math.random is unsafe",
                  confidence: 0.85,
                },
              ],
              summary: "Secure check done.",
              overallRisk: "low",
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 45,
      },
    };

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponseData,
    } as Response);

    const provider = new OpenAIProvider("mock-key", {
      model: "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1",
    });

    const request: AIReviewRequest = {
      systemPrompt: "Sys",
      userPrompt: "User",
      maxTokens: 2000,
      temperature: 0.2,
    };

    const response = await provider.review(request);
    expect(response.findings).toHaveLength(1);
    expect(response.findings[0].title).toBe("Insecure Random");
    expect(response.overallRisk).toBe("low");
    expect(response.usage.inputTokens).toBe(120);
    expect(response.usage.outputTokens).toBe(45);

    // Verify fetch arguments
    expect(fetchSpy).toHaveBeenCalledWith("https://api.groq.com/openai/v1/chat/completions", expect.any(Object));
  });

  it("should handle rate limit errors correctly", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limit reached.",
    } as Response);

    const provider = new OpenAIProvider("mock-key");
    const request: AIReviewRequest = {
      systemPrompt: "Sys",
      userPrompt: "User",
      maxTokens: 2000,
      temperature: 0.2,
    };

    await expect(provider.review(request)).rejects.toThrow("rate limit exceeded");
  });
});
