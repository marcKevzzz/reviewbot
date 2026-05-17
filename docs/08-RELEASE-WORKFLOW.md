# Release Workflow

## 1. Versioning

**Scheme:** [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`

| Change Type | Version Bump | Example |
|---|---|---|
| Breaking config change | MAJOR | `v1.0.0` → `v2.0.0` |
| New feature (backward compatible) | MINOR | `v1.0.0` → `v1.1.0` |
| Bug fix | PATCH | `v1.0.0` → `v1.0.1` |

**Tag format:** `v1.2.3`
**Major alias:** `v1` (auto-updated to latest `v1.x.x`)

## 2. Release Process

```
1. Feature branch → PR → Review → Merge to main
2. Update CHANGELOG.md
3. Bump version in package.json
4. pnpm build (regenerate dist/)
5. Commit dist/ changes
6. git tag v1.x.x
7. git push --tags
8. GitHub Release (auto via workflow)
```

## 3. Release Workflow

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test -- --run
      - run: pnpm build

      # Verify dist/ is up to date
      - name: Check dist
        run: |
          git diff --exit-code dist/ || \
            (echo "dist/ is outdated. Run pnpm build first." && exit 1)

      # Create GitHub Release
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true

      # Update major version tag (v1 → latest v1.x.x)
      - name: Update major tag
        run: |
          TAG=${GITHUB_REF#refs/tags/}
          MAJOR=$(echo $TAG | cut -d. -f1)
          git tag -f $MAJOR
          git push -f origin $MAJOR
```

## 4. Changelog Convention

```markdown
# Changelog

## [1.1.0] - 2026-06-01
### Added
- Custom instructions support via `customInstructions` config
- Per-language hints via `languageHints` config

### Changed
- Default model updated to claude-sonnet-4-20250514

### Fixed
- Binary files no longer cause parser crash

## [1.0.0] - 2026-05-20
### Added
- Initial release
- AI-powered code review via Claude
- Inline PR comments
- Summary comment with stats
- Configurable via `.reviewbot.yml`
```

## 5. Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/)

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no feature change |
| `test` | Adding/fixing tests |
| `chore` | Build, CI, tooling |
| `perf` | Performance improvement |
| `security` | Security fix |

**Examples:**
```
feat(review): add custom instructions support
fix(diff): handle binary files without patch field
docs(config): add languageHints documentation
test(chunker): add edge case for oversized files
chore(ci): add dependabot config
```

## 6. dist/ Commit Strategy

The `dist/index.js` bundle **must be committed** because GitHub Actions loads it directly from the repo.

```
# After any src/ change:
pnpm build
git add dist/
git commit -m "chore: rebuild dist"
```

In CI, we verify dist/ is fresh to prevent stale bundles.
