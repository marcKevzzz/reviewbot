# Project State Changes Log

This file tracks all modifications made to ReviewBot, ordered chronologically with dates.

---

### May 18, 2026
*   **Feature: Phase 2 Quality Scorecard & Anti-Spam (v0.2.0)**:
    *   Updated `types.ts` to add rating tier `usefulness` (1 to 3) for findings, `RubricScore`, and `RubricEvaluation` types.
    *   Upgraded `schema.ts` and `defaults.ts` to include `.reviewbot.yml` settings for `enableNitpickFilter` and weight configurations `rubricWeights`.
    *   Instructed AI model in `prompts.ts` using strict G-Eval guidelines, requiring evidence justifications before numerical scores to limit drift.
    *   Expanded `schemas.ts` Zod schema to enforce model formatting of rubric justifications and scores.
    *   Wrote concurrency worker collection in `reviewer.ts` to gather chunk-level rubrics, drop level-1 styling nitpicks if filter is enabled, and compute weighted arithmetic scores for dynamic Pull Request Mergability Grades.
    *   Coded a premium dashboard report generator in `summary.ts` rendering colored progress bars, ratings badges, Collapsible details, and findings-per-file density stats.
    *   Expanded the Vitest test suites in `reviewer.test.ts` and `summary.test.ts` to cover the new schemas, filters, and dashboard items.
*   **Readability & Comprehensibility Enhancements**:
    *   Refactored `commenter.ts` to format inline comments with clear visual sections and native interactive \`\`\`suggestion\`\`\` blocks for immediate one-click committing on GitHub.
    *   Upgraded `summary.ts` to insert dynamic, color-coded callout alert boxes (\`[!NOTE]\`, \`[!WARNING]\`, \`[!CAUTION]\`) right below the header to present an instantaneous, easy-to-read "tl;dr" PR evaluation grade and description.
*   **Infrastructure & Caching Fixes**:
    *   Migrated compiler settings in `tsconfig.json` to `"moduleResolution": "bundler"` and `"module": "ESNext"` to handle standard library conditional exports.
    *   Optimized `.github/workflows/ci.yml` using setup-node's native `cache: "pnpm"` by restructuring the PNPM installation order.
*   **Harness & Bundler verification**:
    *   Created local execution harness `run_local.js` to dry-run the packaged engine.
    *   Modified `src/index.ts` to execute `run()` unconditionally, bypassing NCC bundled main module evaluation hazards.
    *   Compiled codebase into a single production bundle `dist/index.js` (1587kB) successfully.
*   **Initial Deployment & Metadata Configurations**:
    *   Updated `action.yml` metadata with `enable-nitpick-filter` input configurations.
    *   Updated `loader.ts` to cleanly extract and parse `enable-nitpick-filter` from GitHub Actions runtime inputs.
    *   Created a PR self-review "Dogfooding" pipeline in `.github/workflows/dogfood.yml` to trigger ReviewBot on its own pull requests for ultimate quality assurance.

---

### May 17, 2026
*   **Feature: Phase 1 MVP Core Pipeline Setup (v0.1.0)**:
    *   Bootstrapped TypeScript repository, configuration loading, and dependency setup.
    *   Developed exponential backoff retry wrapper `withRetry` for resilience against network and provider rate limits.
    *   Built diff fetcher and parser separating raw PR unified patches into structured hunks and lines.
    *   Created baseline structured AI reviewer using Gemini-2.0-flash with strict JSON schemas.
    *   Implemented inline GitHub commenter publishing findings directly on specific diff lines.
    *   Programmed baseline test suites achieving 100% coverage across core components under Vitest.
