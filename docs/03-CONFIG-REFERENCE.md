# `.reviewbot.yml` Configuration Reference

> Config file at repo root. Controls what gets reviewed, how, and where findings appear.

## Minimal Config (works out of the box, $0)

```yaml
# .reviewbot.yml — empty file uses Gemini free tier, all defaults
```

## Full Config

```yaml
# .reviewbot.yml — Full specification

# ─── AI Provider ($0 default) ────────────────────────────
provider: "gemini"                    # gemini (free) | anthropic | openai
model: "gemini-2.0-flash"            # Model ID (provider-specific)
maxTokens: 4096                       # Max response tokens per chunk
temperature: 0.1                      # Lower = more deterministic

# ─── File Filtering ──────────────────────────────────────
include:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"

exclude:
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/build/**"
  - "**/*.lock"
  - "**/pnpm-lock.yaml"
  - "**/package-lock.json"
  - "**/*.min.js"
  - "**/*.min.css"
  - "**/*.generated.*"
  - "**/migrations/**"
  - "**/__snapshots__/**"

maxFileSizeKb: 100

# ─── Review Behavior ─────────────────────────────────────
reviewCategories:
  - bug
  - security
  - performance
  - style
  - complexity
  - best_practice
  - type_safety
  - error_handling

severityThreshold: "info"
maxFindings: 25
maxConcurrency: 3

# ─── Output ──────────────────────────────────────────────
summaryComment: true
inlineComments: true
reviewEvent: "COMMENT"

# ─── Custom Instructions ─────────────────────────────────
customInstructions: |
  This is a financial services application.
  Pay extra attention to input validation and SQL injection.

languageHints:
  typescript: "We use strict null checks. Flag any use of 'any' type."
  python: "We follow PEP 8. Check for type hints on all public functions."
```

## Field Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `provider` | AIProviderType | `gemini` | AI provider (`gemini`=free, `anthropic`/`openai`=paid) |
| `model` | string | `gemini-2.0-flash` | Model ID |
| `maxTokens` | int (100–16000) | `4096` | Max response tokens |
| `temperature` | float (0–1) | `0.1` | Response randomness |
| `include` | string[] | `["**/*"]` | Glob patterns to include |
| `exclude` | string[] | *(see above)* | Glob patterns to exclude |
| `maxFileSizeKb` | int (1–1000) | `100` | Max file size in KB |
| `reviewCategories` | Category[] | `[bug,security,performance,style]` | Categories to check |
| `severityThreshold` | Severity | `info` | Min severity to report |
| `maxFindings` | int (1–100) | `25` | Max findings per PR |
| `maxConcurrency` | int (1–10) | `3` | Parallel API calls |
| `summaryComment` | boolean | `true` | Post summary comment |
| `inlineComments` | boolean | `true` | Post inline comments |
| `reviewEvent` | ReviewEvent | `COMMENT` | Review event type |
| `customInstructions` | string? | — | Extra prompt context |
| `languageHints` | Record? | — | Per-language hints |

## Provider-Specific Models

| Provider | Default Model | Free? | Notes |
|---|---|---|---|
| `gemini` | `gemini-2.0-flash` | ✅ $0 | 15 RPM, 1,500 req/day, 1M tokens/day |
| `anthropic` | `claude-sonnet-4-20250514` | ❌ | Best quality, ~$3–15/1M tokens |
| `openai` | `gpt-4o-mini` | ❌ | Good balance of cost/quality |

## action.yml Inputs

```yaml
# .github/workflows/review.yml
- uses: marcKevzzz/reviewbot@v0
  with:
    ai-api-key: ${{ secrets.GEMINI_API_KEY }}  # or ANTHROPIC/OPENAI key
    github-token: ${{ secrets.GITHUB_TOKEN }}
    provider: "gemini"                          # default, $0
    model: "gemini-2.0-flash"
    severity-threshold: "warning"
    max-findings: "10"
    config-path: ".reviewbot.yml"
```

| Input | Required | Default | Maps To |
|---|---|---|---|
| `ai-api-key` | **Yes** | — | AI provider API key |
| `github-token` | **Yes** | — | GitHub token |
| `provider` | No | `gemini` | `config.provider` |
| `model` | No | from config | `config.model` |
| `severity-threshold` | No | from config | `config.severityThreshold` |
| `max-findings` | No | from config | `config.maxFindings` |
| `config-path` | No | `.reviewbot.yml` | Path to config file |

## Merge Priority

```
action.yml inputs  →  .reviewbot.yml  →  DEFAULT_CONFIG
   (highest)            (medium)          (lowest)
```
