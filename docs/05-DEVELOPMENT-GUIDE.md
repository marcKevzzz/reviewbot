# Development Guide

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 10+ | `npm install -g pnpm@latest` |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

## 2. Quick Start

```bash
git clone https://github.com/your-org/reviewbot.git
cd reviewbot
pnpm install
cp .env.example .env
# Get free Gemini API key: https://aistudio.google.com/apikey
# Edit .env with your key
pnpm build
pnpm test
```

## 3. Getting Your Free API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key" — **no credit card required**
3. Copy the key to your `.env` file
4. Free tier: 15 RPM, 1,500 req/day, 1M tokens/day

## 4. Environment Variables

| Variable | Required | Source | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes (default) | [AI Studio](https://aistudio.google.com/apikey) | Gemini API key (**free**) |
| `ANTHROPIC_API_KEY` | If provider=anthropic | Anthropic console | Claude API key (paid) |
| `OPENAI_API_KEY` | If provider=openai | OpenAI platform | OpenAI key (paid) |
| `GITHUB_TOKEN` | Yes | GitHub (auto in Actions) | PAT or `${{ github.token }}` |

> **Never commit `.env`**. The `.gitignore` already excludes it.

## 5. Project Scripts

| Script | Command | Description |
|---|---|---|
| `build` | `pnpm build` | Bundle with ncc → `dist/index.js` |
| `test` | `pnpm test` | Run Vitest in watch mode |
| `test:ci` | `pnpm test -- --run` | Run once (CI mode) |
| `test:cov` | `pnpm test -- --coverage` | With coverage report |
| `lint` | `pnpm lint` | TypeScript type-check |

## 6. Local Testing

### Method 1: Unit Tests (recommended)
```bash
pnpm test
```
All external APIs mocked. See `tests/fixtures/`.

### Method 2: Act (GitHub Actions local runner)
```bash
act pull_request \
  -e tests/fixtures/events/pr-opened.json \
  -s GEMINI_API_KEY=$GEMINI_API_KEY \
  -s GITHUB_TOKEN=$GITHUB_TOKEN
```

### Method 3: Direct Execution
```bash
pnpm build
export GITHUB_TOKEN="ghp_xxx"
export GEMINI_API_KEY="AIza..."
export GITHUB_REPOSITORY="owner/repo"
export GITHUB_EVENT_NAME="pull_request"
export GITHUB_EVENT_PATH="./tests/fixtures/events/pr-opened.json"
export INPUT_AI-API-KEY="$GEMINI_API_KEY"
export INPUT_GITHUB-TOKEN="$GITHUB_TOKEN"
node dist/index.js
```

## 7. Build Pipeline

```
src/**/*.ts  →  tsc (type-check only)  →  ncc bundle  →  dist/index.js
```

ncc inlines all deps into a single file. The `dist/` folder is committed.

## 8. Code Style

| Rule | Standard |
|---|---|
| Formatting | Prettier (2-space, single quotes, trailing commas) |
| Naming | camelCase (vars), PascalCase (types), UPPER_SNAKE (constants) |
| Imports | Group: builtins → external → internal → types |
| Exports | Named only (no default) |
| Errors | Always `ReviewBotError` subclasses |
| Logging | `@actions/core` only, never `console.log` |

## 9. VS Code Debug Config

```json
{
  "version": "0.2.0",
  "configurations": [{
    "name": "Debug ReviewBot",
    "type": "node",
    "request": "launch",
    "program": "${workspaceFolder}/dist/index.js",
    "envFile": "${workspaceFolder}/.env",
    "env": {
      "GITHUB_EVENT_PATH": "${workspaceFolder}/tests/fixtures/events/pr-opened.json",
      "GITHUB_REPOSITORY": "test-org/test-repo",
      "GITHUB_EVENT_NAME": "pull_request"
    }
  }]
}
```
