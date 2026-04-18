/**
 * @file Report Generator
 * Generate evaluation reports in various formats
 */

import type {
  GeneratedReport,
  JsonObject,
  PipelineResult,
  ReportConfig,
  ReportData,
} from "../../types/index.js";

/**
 * Default report configuration
 */
const DEFAULT_REPORT_CONFIG: ReportConfig = {
  format: "text",
  includeReasoning: true,
  includeMetadata: true,
  includeTiming: true,
};

/**
 * Report generator class
 */
export class ReportGenerator {
  private _config: ReportConfig;

  constructor(config?: Partial<ReportConfig>) {
    this._config = { ...DEFAULT_REPORT_CONFIG, ...config };
  }

  /**
   * Generate a report
   */
  generate(data: ReportData): GeneratedReport {
    let content: string;

    switch (this._config.format) {
      case "json":
        content = this._generateJsonReport(data);
        break;
      case "markdown":
        content = this._generateMarkdownReport(data);
        break;
      case "html":
        content = this._generateHtmlReport(data);
        break;
      case "text":
      default:
        content = this._generateTextReport(data);
        break;
    }

    return {
      format: this._config.format,
      content,
      metadata: {
        generatedAt: Date.now(),
        format: this._config.format,
        config: this._config,
      },
    };
  }

  /**
   * Generate text report
   */
  private _generateTextReport(data: ReportData): string {
    const lines: string[] = [];
    const result = data.result;

    lines.push("=".repeat(60));
    lines.push(data.title);
    lines.push("=".repeat(60));
    lines.push(`Generated: ${new Date(data.timestamp).toISOString()}`);
    lines.push("");

    // Overall result
    lines.push("OVERALL RESULT");
    lines.push("-".repeat(40));
    lines.push(`Score: ${result.overallScore.toFixed(2)}/10`);
    lines.push(`Status: ${result.passed ? "PASSED" : "FAILED"}`);
    lines.push(`Aggregation: ${result.aggregationMethod}`);

    if (this._config.includeTiming && result.totalComputeTime) {
      lines.push(`Duration: ${result.totalComputeTime}ms`);
    }

    lines.push("");

    // Individual scores
    lines.push("INDIVIDUAL SCORES");
    lines.push("-".repeat(40));

    for (const score of result.scores) {
      const status = score.passed ? "[PASS]" : "[FAIL]";
      lines.push(`${status} ${score.scorerName}: ${score.score.toFixed(2)}/10`);

      if (this._config.includeReasoning) {
        lines.push(`       Reasoning: ${score.reasoning}`);
      }

      if (this._config.includeTiming) {
        lines.push(`       Duration: ${score.computeTime}ms`);
      }

      lines.push("");
    }

    // Errors if any
    const pipelineResult = result as PipelineResult;
    if (pipelineResult.errors && pipelineResult.errors.length > 0) {
      lines.push("ERRORS");
      lines.push("-".repeat(40));
      for (const error of pipelineResult.errors) {
        lines.push(`[${error.scorerId}] ${error.error}`);
      }
      lines.push("");
    }

    // Custom sections
    if (data.customSections) {
      for (const section of data.customSections) {
        lines.push(section.title.toUpperCase());
        lines.push("-".repeat(40));
        lines.push(
          typeof section.content === "string"
            ? section.content
            : JSON.stringify(section.content, null, 2),
        );
        lines.push("");
      }
    }

    lines.push("=".repeat(60));

    return lines.join("\n");
  }

  /**
   * Generate JSON report
   */
  private _generateJsonReport(data: ReportData): string {
    const report: JsonObject = {
      title: data.title,
      timestamp: data.timestamp,
      generatedAt: new Date(data.timestamp).toISOString(),
      overall: {
        score: data.result.overallScore,
        passed: data.result.passed,
        aggregationMethod: data.result.aggregationMethod,
      },
      scores: data.result.scores.map((score) => {
        const scoreObj: JsonObject = {
          scorerId: score.scorerId,
          scorerName: score.scorerName,
          score: score.score,
          normalizedScore: score.normalizedScore,
          passed: score.passed,
          threshold: score.threshold,
        };

        if (this._config.includeReasoning) {
          scoreObj.reasoning = score.reasoning;
        }

        if (this._config.includeTiming) {
          scoreObj.computeTime = score.computeTime;
        }

        if (this._config.includeMetadata && score.metadata) {
          scoreObj.metadata = score.metadata;
        }

        return scoreObj;
      }),
    };

    if (this._config.includeTiming) {
      report.totalComputeTime = data.result.totalComputeTime;
    }

    const pipelineResult = data.result as PipelineResult;
    if (pipelineResult.errors && pipelineResult.errors.length > 0) {
      report.errors = pipelineResult.errors;
    }

    if (data.customSections) {
      report.customSections = data.customSections;
    }

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate Markdown report
   */
  private _generateMarkdownReport(data: ReportData): string {
    const lines: string[] = [];
    const result = data.result;

    lines.push(`# ${data.title}`);
    lines.push("");
    lines.push(`*Generated: ${new Date(data.timestamp).toISOString()}*`);
    lines.push("");

    // Overall result
    lines.push("## Overall Result");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`| ------ | ----- |`);
    lines.push(`| Score | ${result.overallScore.toFixed(2)}/10 |`);
    lines.push(`| Status | ${result.passed ? "**PASSED**" : "**FAILED**"} |`);
    lines.push(`| Aggregation | ${result.aggregationMethod} |`);

    if (this._config.includeTiming && result.totalComputeTime) {
      lines.push(`| Duration | ${result.totalComputeTime}ms |`);
    }

    lines.push("");

    // Individual scores
    lines.push("## Individual Scores");
    lines.push("");
    lines.push(
      `| Scorer | Score | Status | ${this._config.includeTiming ? "Duration |" : ""}`,
    );
    lines.push(
      `| ------ | ----- | ------ | ${this._config.includeTiming ? "-------- |" : ""}`,
    );

    for (const score of result.scores) {
      const status = score.passed ? "Pass" : "Fail";
      let row = `| ${score.scorerName} | ${score.score.toFixed(2)} | ${status} |`;
      if (this._config.includeTiming) {
        row += ` ${score.computeTime}ms |`;
      }
      lines.push(row);
    }

    lines.push("");

    // Reasoning
    if (this._config.includeReasoning) {
      lines.push("### Reasoning");
      lines.push("");

      for (const score of result.scores) {
        lines.push(`**${score.scorerName}**: ${score.reasoning}`);
        lines.push("");
      }
    }

    // Errors
    const pipelineResult = result as PipelineResult;
    if (pipelineResult.errors && pipelineResult.errors.length > 0) {
      lines.push("## Errors");
      lines.push("");
      for (const error of pipelineResult.errors) {
        lines.push(`- **${error.scorerId}**: ${error.error}`);
      }
      lines.push("");
    }

    // Custom sections
    if (data.customSections) {
      for (const section of data.customSections) {
        lines.push(`## ${section.title}`);
        lines.push("");
        lines.push(
          typeof section.content === "string"
            ? section.content
            : "```json\n" + JSON.stringify(section.content, null, 2) + "\n```",
        );
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate HTML report
   */
  private _generateHtmlReport(data: ReportData): string {
    const result = data.result;
    const statusClass = result.passed ? "passed" : "failed";

    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>${this._escapeHtml(data.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .meta { color: #888; font-size: 0.9em; }
    .overall { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .overall.passed { border-left: 4px solid #4caf50; }
    .overall.failed { border-left: 4px solid #f44336; }
    .score-value { font-size: 2em; font-weight: bold; }
    .passed .score-value { color: #4caf50; }
    .failed .score-value { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9f9f9; font-weight: 600; }
    .status-pass { color: #4caf50; }
    .status-fail { color: #f44336; }
    .reasoning { color: #666; font-size: 0.9em; font-style: italic; }
    .error { background: #ffebee; padding: 10px; border-radius: 4px; margin: 5px 0; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${this._escapeHtml(data.title)}</h1>
  <p class="meta">Generated: ${new Date(data.timestamp).toISOString()}</p>

  <div class="overall ${statusClass}">
    <div class="score-value">${result.overallScore.toFixed(2)}/10</div>
    <div>Status: <strong>${result.passed ? "PASSED" : "FAILED"}</strong></div>
    <div>Aggregation: ${result.aggregationMethod}</div>
    ${this._config.includeTiming ? `<div>Duration: ${result.totalComputeTime}ms</div>` : ""}
  </div>

  <h2>Individual Scores</h2>
  <table>
    <thead>
      <tr>
        <th>Scorer</th>
        <th>Score</th>
        <th>Status</th>
        ${this._config.includeTiming ? "<th>Duration</th>" : ""}
      </tr>
    </thead>
    <tbody>
`;

    for (const score of result.scores) {
      const statusClass = score.passed ? "status-pass" : "status-fail";
      html += `
      <tr>
        <td>${this._escapeHtml(score.scorerName)}</td>
        <td>${score.score.toFixed(2)}</td>
        <td class="${statusClass}">${score.passed ? "Pass" : "Fail"}</td>
        ${this._config.includeTiming ? `<td>${score.computeTime}ms</td>` : ""}
      </tr>
`;
      if (this._config.includeReasoning) {
        html += `
      <tr>
        <td colspan="${this._config.includeTiming ? 4 : 3}" class="reasoning">
          ${this._escapeHtml(score.reasoning)}
        </td>
      </tr>
`;
      }
    }

    html += `
    </tbody>
  </table>
`;

    // Errors
    const pipelineResult = result as PipelineResult;
    if (pipelineResult.errors && pipelineResult.errors.length > 0) {
      html += `
  <h2>Errors</h2>
`;
      for (const error of pipelineResult.errors) {
        html += `
  <div class="error">
    <strong>${this._escapeHtml(error.scorerId)}</strong>: ${this._escapeHtml(error.error)}
  </div>
`;
      }
    }

    // Custom sections
    if (data.customSections) {
      for (const section of data.customSections) {
        html += `
  <h2>${this._escapeHtml(section.title)}</h2>
`;
        if (typeof section.content === "string") {
          html += `<p>${this._escapeHtml(section.content)}</p>`;
        } else {
          html += `<pre>${this._escapeHtml(JSON.stringify(section.content, null, 2))}</pre>`;
        }
      }
    }

    html += `
</body>
</html>
`;

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ReportConfig>): void {
    this._config = { ...this._config, ...config };
  }
}

/**
 * Create a report generator
 */
export function createReportGenerator(
  config?: Partial<ReportConfig>,
): ReportGenerator {
  return new ReportGenerator(config);
}

/**
 * Quick report generation functions
 */
export const Reports = {
  /** Generate text report */
  text: (data: ReportData) =>
    new ReportGenerator({ format: "text" }).generate(data),

  /** Generate JSON report */
  json: (data: ReportData) =>
    new ReportGenerator({ format: "json" }).generate(data),

  /** Generate Markdown report */
  markdown: (data: ReportData) =>
    new ReportGenerator({ format: "markdown" }).generate(data),

  /** Generate HTML report */
  html: (data: ReportData) =>
    new ReportGenerator({ format: "html" }).generate(data),
};
