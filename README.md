# 🤖 ReviewBot

> **The premium, developer-first, zero-operating-cost AI Code Reviewer for GitHub Actions.** Automatically audits Pull Requests, grades mergeability, filters stylistic nitpicks, and hot-swaps AI models mid-flight to guarantee stable, $0 reviews.

[![CI Status](https://github.com/marcKevzzz/reviewbot/actions/workflows/ci.yml/badge.svg)](https://github.com/marcKevzzz/reviewbot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cost: $0](https://img.shields.io/badge/cost-%240-brightgreen)](https://aistudio.google.com/apikey)
[![Release](https://img.shields.io/github/v/release/marcKevzzz/reviewbot)](https://github.com/marcKevzzz/reviewbot/releases)

---

## 📖 About

**ReviewBot** is a highly calibrated, autonomous AI code review assistant designed to live inside your GitHub Actions workflows. It automatically analyzes code diffs, flags logic flaws and security holes, generates real-time **interactive inline code fix suggestions**, and prints a gorgeous, comprehensive **Mergability Scorecard** directly inside pull requests. 

Unlike other code reviewers, ReviewBot is engineered for **uncompromised reliability at zero operating cost**:
*   **Stateful Failover Protection**: Primarily runs on the Google Gemini free-tier ($0 cost). If Gemini rate limits are exceeded, ReviewBot statefully hot-swaps to your backup provider (e.g. Groq running Llama-3.3-70B via OpenAI endpoints) **mid-flight**, completing the PR review seamlessly with zero interruptions.
*   **Precision Targeting**: Injects precise line numbers into diff prompts to guarantee comments are posted exactly on the correct statements, never on brackets or empty comments.
*   **Noise Minimization**: Filters stylistic nitpicks using an optional low-usefulness filter, allowing developers to focus purely on meaningful changes.

---

## ⚡ Quick Start ($0 Setup, 2 Minutes)

### 1. Retrieve a free Gemini API Key
Visit [Google AI Studio](https://aistudio.google.com/apikey) and click **Create API Key**. It takes 10 seconds, and no credit card is required.

### 2. Save Secrets in GitHub
Navigate to your repository's **Settings** → **Secrets and variables** → **Actions**, and add:
*   `GEMINI_API_KEY`: Your primary Gemini API key.
*   `AI_FALLBACK_KEY`: *(Optional, highly recommended)* A backup provider key (e.g., Groq, OpenAI, or a secondary Gemini key) to guarantee reviews never fail during high PR activity.

### 3. Create the workflow file
Create `.github/workflows/review.yml` inside your repository:

```yaml
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
      - uses: marcKevzzz/reviewbot@v0
        with:
          ai-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
          # Optional: Seamless backup fallback configuration (highly recommended!)
          ai-fallback-key: ${{ secrets.AI_FALLBACK_KEY }}
          fallback-provider: "openai"
          fallback-base-url: "https://api.groq.com/openai/v1"
          fallback-model: "llama-3.3-70b-versatile"
```

---

## 🛡️ Stateful Mid-Flight Failover

ReviewBot runs a stateful request queue. If the primary provider hits a 429 quota exhaustion or rate limit:
1.  ReviewBot instantly intercepts the rate-limit response.
2.  It hot-swaps its internal active provider to your fallback configurations.
3.  It retries the failed hunk immediately using the backup provider, and completes all remaining concurrent file chunks on the fallback.
4.  Renders a clean **`[!NOTE] ℹ️ Seamless Backup Failover Activated`** banner in the scorecard, keeping PR status positive while ensuring full code coverage!

---

## 💰 Zero-Cost Cost Model

| Provider Layer | Cost / Rate Limit | Recommended Endpoint | Setup Link |
|---|---|---|---|
| **Primary** | **$0** (15 RPM, 1,500 req/day) | `gemini` (`gemini-2.0-flash`) | [Free API Key](https://aistudio.google.com/apikey) |
| **Fallback** | **$0** (Groq free tier) | `openai` (`llama-3.3-70b-versatile`) | [Groq Console](https://console.groq.com) |
| **Premium** | Paid Pay-As-You-Go | `anthropic` (`claude-3-7-sonnet`) | [Anthropic Console](https://console.anthropic.com) |

---

## 🔧 Configuration (.reviewbot.yml)

Customize ReviewBot's behavior by placing a `.reviewbot.yml` configuration file in the root of your repository:

```yaml
# .reviewbot.yml
provider: "gemini"
model: "gemini-2.0-flash"

# File filtering rules
include:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "src/**/*.py"
exclude:
  - "**/node_modules/**"
  - "**/*.test.ts"

# Review logic & filters
severityThreshold: "info"      # info | warning | error
enableNitpickFilter: true      # Hides low-value stylistic linter comments
maxFindings: 15                 # Restrict maximum inline comments per review

# Custom contextual prompt additions
customInstructions: |
  We use strict secure coding principles.
  Never expose raw tokens, and prioritize explicit exception handling.
```

📖 [Full Config Reference →](./docs/03-CONFIG-REFERENCE.md)

---

## 📦 GitHub Action Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `ai-api-key` | Yes | — | Primary AI provider API key |
| `github-token` | Yes | `${{ github.token }}` | GitHub API authentication token |
| `provider` | No | `gemini` | Primary provider (`gemini` / `openai` / `anthropic`) |
| `model` | No | from config | Primary provider model identifier |
| `ai-fallback-key` | No | — | Fallback AI provider API key |
| `fallback-provider` | No | `openai` | Fallback provider (`gemini` / `openai` / `anthropic`) |
| `fallback-model` | No | from provider | Fallback provider model identifier |
| `fallback-base-url`| No | from provider | Custom fallback API endpoint (e.g. for Groq, OpenRouter) |
| `config-path` | No | `.reviewbot.yml` | Path to optional custom configuration file |

---

## 🏗️ Architecture Pipeline

```
PR Event ➔ Config Hydration ➔ Diff Fetching ➔ Glob Filtering ➔ Chunk Pool
                                                                  │
                                                        [Stateful Queue Pool]
                                                        ├─ Gemini Free ($0)
                                                        └─ (Failover) Groq Free ($0)
                                                                  │
PR Scorecard & Badges ➔ Inline Fix Suggestions ➔ Commenter ➔ AI Review Analysis
```

📖 [Architecture & Flow →](./docs/01-ARCHITECTURE.md) · [Schema Types →](./docs/02-SCHEMAS.md) · [API Contracts →](./docs/04-API-CONTRACTS.md)

---

## 🤝 Contributing & Local Setup

```bash
# Clone the repository
git clone https://github.com/marcKevzzz/reviewbot.git
cd reviewbot

# Install dependencies and run test suite
pnpm install
pnpm build
pnpm exec vitest run
```

📖 [Contributing Guidelines →](./docs/09-CONTRIBUTING.md) · [Development Environment Setup →](./docs/05-DEVELOPMENT-GUIDE.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
