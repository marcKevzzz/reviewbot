# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-19

### Added
- **Multi-Provider Automatic Failover**: Seamless mid-flight backup failover from primary provider (e.g. Gemini free tier) to alternative backup providers (e.g. Groq/Llama-3.3-70B via OpenAI-compatible endpoints) when encountering rate limits or quota exhaustion.
- **Premium Quality Scorecards**: Added detailed multi-dimensional grading bar charts, status badges, and expandable evidence-based justifications on Security, Performance, Type Safety, Style, and Complexity.
- **Explicit Line-Targeting Accuracy**: Injected exact file line numbers as prefixes into diff chunks sent to the AI, and restricted brace/comment findings in prompt instructions to guarantee perfectly on-the-dot inline review placement.
- **Nitpick Filtering**: Implemented stylistic comments filtering using `enableNitpickFilter` config option to hide low-value reviews.
- **Interactive PR mergeability grading**: Real-time pull request quality classification (A, B, C risk grades) with automatic blocking warnings.

### Changed
- Display successful backup failovers as clean info blocks in reports rather than fatal failure alerts.
- Optimized mock Vitest runner time down to only 30 milliseconds using vitest-retries stubs.

### Fixed
- Fixed type checking compatibility errors in commenters test suite.

## [0.1.0] - 2026-05-17
### Added
- Initial project scaffold with TypeScript, pnpm, Vitest
- Documentation suite (architecture, schemas, config, API contracts, security, roadmap)
- CI/CD workflows (ci, release, dogfood)
- Development rules and contributing guide
