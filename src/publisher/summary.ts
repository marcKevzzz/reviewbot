import { ReviewFinding, ReviewStats, Severity, Category, RubricEvaluation } from "../types";
import { ReviewBotConfig } from "../config/schema";

export function generateSummaryBody(
  findings: ReviewFinding[],
  summaries: string[],
  stats: Omit<ReviewStats, "durationMs"> & { durationMs: number; rubricScores?: RubricEvaluation; mergabilityGrade?: string; errors?: string[] },
  config: ReviewBotConfig
): string {
  const severityEmoji: Record<Severity, string> = {
    [Severity.ERROR]: "🔴",
    [Severity.WARNING]: "🟡",
    [Severity.INFO]: "🔵",
  };

  const categoryLabels: Record<Category, string> = {
    [Category.BUG]: "🐛 Bug",
    [Category.SECURITY]: "🔒 Security",
    [Category.PERFORMANCE]: "⚡ Performance",
    [Category.STYLE]: "🎨 Style",
    [Category.COMPLEXITY]: "🧬 Complexity",
    [Category.BEST_PRACTICE]: "💡 Best Practice",
    [Category.TYPE_SAFETY]: "🛡️ Type Safety",
    [Category.ERROR_HANDLING]: "⚠️ Error Handling",
  };

  // Severity breakdown
  const errorCount = stats.bySeverity[Severity.ERROR] || 0;
  const warnCount = stats.bySeverity[Severity.WARNING] || 0;
  const infoCount = stats.bySeverity[Severity.INFO] || 0;

  // Visual Grade colors
  const grade = stats.mergabilityGrade || "A (Low Risk)";
  const gradeColor = grade.startsWith("A") ? "🟢" : grade.startsWith("B") ? "🟡" : "🔴";

  // Compute issue density per 10 files (Length bias normalization statistics)
  const filesCount = stats.filesReviewed || 1;
  const issueDensity = ((stats.totalFindings / filesCount) * 10).toFixed(1);

  const alertType = errorCount > 0 ? "CAUTION" : warnCount > 0 ? "WARNING" : "NOTE";
  const alertDescription = errorCount > 0
    ? "⚠️ **Action Required**: Critical bugs or security vulnerabilities were identified that require resolution before merging."
    : warnCount > 0
    ? "⚠️ **Minor Concerns**: Style nits or minor best-practice warnings were found. Review changes before merging."
    : "✅ **Mergability Safe**: Code meets or exceeds all quality, performance, and security thresholds.";

  let body = `## ${gradeColor} ReviewBot Code Quality Report\n\n`;

  if (stats.errors && stats.errors.length > 0) {
    const hasFailover = stats.errors.some(err => err.includes("failed over to fallback provider"));
    const fatalErrors = stats.errors.filter(err => !err.includes("failed over to fallback provider"));

    if (hasFailover && fatalErrors.length === 0) {
      body += `> [!NOTE]\n`;
      body += `> ℹ️ **Seamless Backup Failover Activated**\n`;
      body += `> Primary AI provider exhausted free tier quota. ReviewBot automatically and successfully hot-swapped to your configured backup provider to complete 100% of the code review.\n`;
      body += `> **Details:**\n`;
      for (const err of stats.errors) {
        body += `> *   \`${err.replace(/\n/g, " ")}\`\n`;
      }
      body += `\n`;
    } else {
      body += `> [!WARNING]\n`;
      body += `> ⚠️ **Incomplete Review: AI Service Limits Exceeded**\n`;
      body += `> Some code chunks were skipped because the AI API returned quota or rate limit errors. Please check your AI provider billing or daily free tier limits!\n`;
      body += `> **Error logs:**\n`;
      for (const err of stats.errors) {
        body += `> *   \`${err.replace(/\n/g, " ")}\`\n`;
      }
      body += `\n`;
    }
  }

  body += `> [!${alertType}]
> **Pull Request Grade**: **${grade}**
> ${alertDescription}

### 📊 Mergability Assessment
*   **Total Issues Identified**: **${stats.totalFindings}** (Density: \`${issueDensity}\` findings per 10 files reviewed)
*   **Severity Breakdown**: 🔴 **${errorCount}** Errors | 🟡 **${warnCount}** Warnings | 🔵 **${infoCount}** Infos
*   **Execution Time**: ⏱️ **${(stats.durationMs / 1000).toFixed(2)}s** | 🪙 **${stats.tokensUsed.toLocaleString()}** AI tokens ($0.00 cost)

---

`;

  // Insert Scorecard if rubric evaluations are available
  if (stats.rubricScores) {
    const scores = stats.rubricScores;
    const makeBar = (val: number): string => {
      const filled = Math.round(val * 2); // Map 1-5 to 1-10
      const empty = 10 - filled;
      return "█".repeat(filled) + "░".repeat(empty);
    };

    const makeBadge = (val: number): string => {
      if (val >= 4.5) return "🟢 Excellent";
      if (val >= 3.5) return "🟡 Adequate";
      return "🔴 Warning";
    };

    body += `### 🎯 Quality Scorecard\n\n`;
    body += `| Category | Score | Progress / Density Bar | Rating Badge |\n`;
    body += `| :--- | :---: | :--- | :--- |\n`;
    body += `| **🔒 Security** | \`${scores.security.score.toFixed(2)} / 5.0\` | \`${makeBar(scores.security.score)}\` | ${makeBadge(scores.security.score)} |\n`;
    body += `| **⚡ Performance** | \`${scores.performance.score.toFixed(2)} / 5.0\` | \`${makeBar(scores.performance.score)}\` | ${makeBadge(scores.performance.score)} |\n`;
    body += `| **🛡️ Type Safety** | \`${scores.typeSafety.score.toFixed(2)} / 5.0\` | \`${makeBar(scores.typeSafety.score)}\` | ${makeBadge(scores.typeSafety.score)} |\n`;
    body += `| **🎨 Style & Docs** | \`${scores.style.score.toFixed(2)} / 5.0\` | \`${makeBar(scores.style.score)}\` | ${makeBadge(scores.style.score)} |\n`;
    body += `| **🧬 Complexity** | \`${scores.complexity.score.toFixed(2)} / 5.0\` | \`${makeBar(scores.complexity.score)}\` | ${makeBadge(scores.complexity.score)} |\n\n`;

    body += `<details>\n<summary>🔍 <b>View Quality Justification Details</b></summary>\n\n`;
    body += `#### Rubric Criteria Analysis:\n`;
    body += `*   **🔒 Security**:\n${scores.security.justification.split("\n").map((line) => `    ${line}`).join("\n")}\n`;
    body += `*   **⚡ Performance**:\n${scores.performance.justification.split("\n").map((line) => `    ${line}`).join("\n")}\n`;
    body += `*   **🛡️ Type Safety**:\n${scores.typeSafety.justification.split("\n").map((line) => `    ${line}`).join("\n")}\n`;
    body += `*   **🎨 Style & Docs**:\n${scores.style.justification.split("\n").map((line) => `    ${line}`).join("\n")}\n`;
    body += `*   **🧬 Complexity**:\n${scores.complexity.justification.split("\n").map((line) => `    ${line}`).join("\n")}\n`;
    body += `\n</details>\n\n---\n\n`;
  }

  if (findings.length > 0) {
    body += `### 🔍 Critical Findings List\n\n`;
    body += `| File | Line | Severity | Category | Title |\n`;
    body += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const f of findings) {
      const emoji = severityEmoji[f.severity] || "⚪";
      const catLabel = categoryLabels[f.category] || String(f.category);
      body += `| [\`${f.file}\`](file://${f.file}#L${f.line}) | \`L${f.line}\` | ${emoji} ${f.severity.toUpperCase()} | ${catLabel} | **${f.title}** |\n`;
    }
    body += `\n*Note: Inline comments have been published directly onto the diff for the findings above.*\n\n---\n\n`;
  } else {
    body += `### 🎉 Zero Critical Issues Found!
Outstanding work! No critical bugs, security risks, or standard violations were identified in the changes.

---\n\n`;
  }

  if (config.summaryComment && summaries.length > 0) {
    body += `### 📄 File-by-File Summary\n`;
    for (const sum of summaries) {
      body += `*   ${sum}\n`;
    }
  }

  body += `\n*Analysis executed in isolated runner via **ReviewBot v0.2.0** utilizing **${config.model}**.*`;
  return body;
}
