# 🤖 ReviewBot

> AI-powered code review on every PR — flags bugs, style issues, and security holes as inline comments. **$0 to start** with Gemini free tier.

[![CI](https://github.com/your-org/reviewbot/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/reviewbot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cost: $0](https://img.shields.io/badge/cost-%240-brightgreen)](https://aistudio.google.com/apikey)

---

## ⚡ Quick Start ($0, 2 minutes)

1. **Get a free Gemini API key:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no credit card needed
2. **Add it as a repo secret:** Settings → Secrets → `GEMINI_API_KEY`
3. **Create the workflow:**

```yaml
# .github/workflows/review.yml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/reviewbot@v1
        with:
          ai-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

That's it. Every PR now gets AI code review comments — **for free**.

---

## 💰 Cost Model

| Provider | Cost | Setup |
|---|---|---|
| **Google Gemini** (default) | **$0** — 15 RPM, 1,500 req/day | [Free API key](https://aistudio.google.com/apikey) |
| Anthropic Claude | ~$3–15/1M tokens | Paid API key |
| OpenAI GPT | ~$2.50–10/1M tokens | Paid API key |

Switch providers by changing one line:
```yaml
provider: "anthropic"  # or "openai"
ai-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## 🔧 Configuration

Create `.reviewbot.yml` at your repo root:

```yaml
include:
  - "src/**/*.ts"
  - "src/**/*.tsx"

exclude:
  - "**/*.test.ts"

severityThreshold: "warning"
maxFindings: 20

customInstructions: |
  This is a financial services app.
  Pay extra attention to input validation.
```

📖 [Full config reference →](./docs/03-CONFIG-REFERENCE.md)

---

## 📦 Action Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `ai-api-key` | ✅ | — | AI provider API key |
| `github-token` | ✅ | `${{ github.token }}` | GitHub token |
| `provider` | — | `gemini` | `gemini` (free) / `anthropic` / `openai` |
| `model` | — | auto | Provider-specific model ID |
| `severity-threshold` | — | `info` | Minimum severity |
| `max-findings` | — | `25` | Max findings per review |

---

## 🏗️ Architecture

```
PR Event → Config → Diff Fetch → Parse → Filter → Chunk → AI Review → Publish
                                                            ↑
                                                  Gemini (free) | Claude | OpenAI
```

📖 [Architecture →](./docs/01-ARCHITECTURE.md) · [Schemas →](./docs/02-SCHEMAS.md) · [API Contracts →](./docs/04-API-CONTRACTS.md)

---

## 🤝 Contributing

```bash
git clone https://github.com/your-org/reviewbot.git && cd reviewbot
pnpm install && pnpm test
```

📖 [Contributing guide →](./docs/09-CONTRIBUTING.md)

---

## 📄 License

MIT — see [LICENSE](./LICENSE).
