# API Contracts

## 1. GitHub REST API Usage

### 1.1 Get PR Files

```
GET /repos/{owner}/{repo}/pulls/{pull_number}/files
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github.v3+json
```

**Response (200):** Array of `RawDiffFile`

**Pagination:** `per_page=100`, `page` param. Max 300 files.

| Status | Action |
|---|---|
| 200 | Parse response |
| 403 | Retry with backoff (rate limited) |
| 404 | Fail with `DIFF_FETCH_FAILED` |
| 422 | Fail with `DIFF_TOO_LARGE` |

### 1.2 Get File Content (Config)

```
GET /repos/{owner}/{repo}/contents/{path}?ref={branch}
```

Fetches `.reviewbot.yml`. Returns base64-encoded content.

### 1.3 Create Review

```
POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews
```

```json
{
  "commit_id": "abc123",
  "event": "COMMENT",
  "body": "## ReviewBot Summary\n\n...",
  "comments": [
    { "path": "src/utils.ts", "line": 42, "side": "RIGHT", "body": "🔴 **Bug** ..." }
  ]
}
```

**Constraints:** Max ~50 comments/review, max 65,536 chars/comment, 5,000 req/hr.

---

## 2. Google Gemini API (Default — $0)

### 2.1 Generate Content

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}
Content-Type: application/json
```

**Request:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Review the following code changes:\n\n```diff\n...\n```" }]
    }
  ],
  "systemInstruction": {
    "parts": [{ "text": "You are ReviewBot, an expert code reviewer..." }]
  },
  "generationConfig": {
    "temperature": 0.1,
    "maxOutputTokens": 4096,
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "object",
      "properties": {
        "findings": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "file": { "type": "string" },
              "line": { "type": "integer" },
              "severity": { "type": "string", "enum": ["error","warning","info"] },
              "category": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" },
              "suggestion": { "type": "string" },
              "confidence": { "type": "number" }
            },
            "required": ["file","line","severity","category","title","description","confidence"]
          }
        },
        "summary": { "type": "string" },
        "overallRisk": { "type": "string", "enum": ["low","medium","high","critical"] }
      },
      "required": ["findings","summary","overallRisk"]
    }
  }
}
```

**Why `responseMimeType: application/json`:**
- Gemini returns guaranteed valid JSON matching the schema
- No need to parse freeform text
- Zod validates the parsed JSON

### 2.2 Free Tier Limits

| Limit | Value |
|---|---|
| Requests/minute | 15 |
| Requests/day | 1,500 |
| Tokens/day | 1,000,000 |
| Context window | 1,048,576 tokens |
| Max output | 8,192 tokens |

> At 15 RPM and ~3 chunks per PR, you can review **~5 PRs per minute** or **~500 PRs per day** — more than enough for most teams.

### 2.3 Error Handling

| Status | Action |
|---|---|
| 200 | Parse JSON response |
| 400 | Fail with `AI_API_ERROR` |
| 403 | Fail with `AI_API_ERROR` (invalid key) |
| 429 | Retry with `Retry-After` |
| 500 | Retry with backoff |
| 503 | Retry with backoff |

---

## 3. Anthropic Claude API (Optional Paid Upgrade)

Uses `@anthropic-ai/sdk` with `tool_use` for structured output.

```typescript
// Only installed/used when provider === "anthropic"
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  tools: [{ name: "submit_review", input_schema: ReviewResponseSchema }],
  tool_choice: { type: "tool", name: "submit_review" },
  messages: [{ role: "user", content: userPrompt }],
});
```

---

## 4. OpenAI API (Optional Paid Upgrade)

Uses `openai` SDK with structured outputs.

```typescript
// Only installed/used when provider === "openai"
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  response_format: { type: "json_schema", json_schema: { ... } },
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
```

---

## 5. action.yml Contract (Updated for Provider-Agnostic)

```yaml
name: "ReviewBot AI Code Review"
description: "AI-powered code review on every PR — $0 with Gemini free tier"

inputs:
  ai-api-key:
    description: "API key for your AI provider (Gemini/Anthropic/OpenAI)"
    required: true
  github-token:
    description: "GitHub token with PR read/write permissions"
    required: true
    default: ${{ github.token }}
  provider:
    description: "AI provider: gemini (free) | anthropic | openai"
    required: false
    default: "gemini"
  model:
    description: "Model ID (provider-specific)"
    required: false
  severity-threshold:
    description: "Minimum severity (info|warning|error)"
    required: false
  max-findings:
    description: "Maximum findings per review"
    required: false
  config-path:
    description: "Path to .reviewbot.yml"
    required: false
    default: ".reviewbot.yml"

outputs:
  findings-count:
    description: "Total findings posted"
  risk-level:
    description: "Overall risk (low|medium|high|critical)"
  duration-ms:
    description: "Execution time in ms"
  tokens-used:
    description: "Total tokens consumed"
  estimated-cost:
    description: "Estimated API cost ($0.00 for Gemini free tier)"

runs:
  using: "node20"
  main: "dist/index.js"
```
