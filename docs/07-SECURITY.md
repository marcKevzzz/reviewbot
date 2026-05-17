# Security

## 1. Threat Model

| Threat | Severity | Mitigation |
|---|---|---|
| API key leakage | Critical | `core.setSecret()`; never log secrets |
| Prompt injection via PR | High | Instruction hierarchy; structured JSON output |
| Token exhaustion (Gemini free tier) | Medium | `maxFileSizeKb`, `maxFindings`, daily limit check |
| GitHub token misuse | Medium | Minimal permissions in action.yml |
| Supply chain (npm) | Medium | pnpm lockfile; Dependabot |
| Rate limit abuse | Low | Per-run rate limiting; Gemini 15 RPM cap |

## 2. Secret Handling

### DO:
- Read secrets from `core.getInput()`
- Register with `core.setSecret(value)` to mask in logs
- Use env vars, never hardcoded
- Scope `GITHUB_TOKEN` to minimum permissions

### DON'T:
- Log any part of an API key
- Include secrets in error messages
- Commit `.env`
- Store secrets in config files

```typescript
const apiKey = core.getInput("ai-api-key", { required: true });
core.setSecret(apiKey); // Masks in ALL log output
```

## 3. GitHub Token Permissions

```yaml
permissions:
  contents: read        # Read .reviewbot.yml
  pull-requests: write  # Post review comments
  # Nothing else needed
```

## 4. Prompt Injection Defense

1. **System prompt hierarchy:** AI told diff content is untrusted input
2. **Structured JSON output:** `responseMimeType: "application/json"` (Gemini) / `tool_use` (Claude)
3. **Zod validation:** Response validated against strict schema
4. **No autonomous actions:** Only posts comments, never approves/merges

## 5. Data Privacy

| Data | Where It Goes | Retention |
|---|---|---|
| PR diff content | Sent to Gemini API | Not stored (API ToS) |
| API keys | Used for auth | Ephemeral (Action runtime) |
| Review findings | GitHub PR comments | Retained by GitHub |
| Logs | GitHub Action logs | 90 days |

**ReviewBot stores no data.** Fully stateless.

## 6. Cost Safety (Gemini Free Tier)

| Limit | Value | What Happens |
|---|---|---|
| 15 RPM | Requests/minute | ReviewBot auto-throttles via rate limiter |
| 1,500 RPD | Requests/day | Graceful skip if daily limit hit |
| 1M TPD | Tokens/day | Chunker keeps requests small |

No surprise bills. Gemini free tier has **hard caps**, not soft overages.
