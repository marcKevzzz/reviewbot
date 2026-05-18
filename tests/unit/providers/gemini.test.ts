import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiProvider } from "../../../src/providers/gemini";
import { AIReviewRequest } from "../../../src/providers/base";

const generateContentMock = vi.fn();

vi.mock("@google/generative-ai", () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: generateContentMock,
      };
    }
  }
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    SchemaType: {
      OBJECT: "object",
      ARRAY: "array",
      STRING: "string",
      INTEGER: "integer",
      NUMBER: "number",
    },
  };
});

describe("GeminiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully parse standard generateContent structured response", async () => {
    const mockResult = {
      response: {
        text: () => JSON.stringify({
          findings: [
            {
              file: "src/index.ts",
              line: 42,
              severity: "error",
              category: "bug",
              title: "Null Pointer",
              description: "Potential null reference",
              confidence: 0.9,
            },
          ],
          summary: "Reviewed files successfully.",
          overallRisk: "medium",
        }),
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 50,
        },
      },
    };

    generateContentMock.mockResolvedValue(mockResult);

    const provider = new GeminiProvider("mock-key");
    const request: AIReviewRequest = {
      systemPrompt: "Sys",
      userPrompt: "User",
      maxTokens: 1000,
      temperature: 0.1,
    };

    const response = await provider.review(request);
    expect(response.findings).toHaveLength(1);
    expect(response.findings[0].title).toBe("Null Pointer");
    expect(response.overallRisk).toBe("medium");
    expect(response.usage.inputTokens).toBe(150);
  });
});
