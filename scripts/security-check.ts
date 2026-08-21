#!/usr/bin/env tsx

/**
 * NeuroLink Security Validation Script
 *
 * Comprehensive security checks for the NeuroLink codebase including:
 * - Professional secret detection with Gitleaks integration
 * - Dependency vulnerability scanning
 * - License compliance checks
 * - Security best practices validation
 * - File permission validation
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

// ANSI color codes for output formatting
const colors: Record<string, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Configuration: Critical security rule IDs that should trigger build failures
const CRITICAL_SECURITY_RULES = [
  "aws-access-token",
  "openai-api-key",
  "github-token",
  "neurolink-api-key",
  "private-key",
];

// Configuration: known-open production advisories that are explicitly accepted
// as risk, keyed by pnpm/GitHub advisory id (NOT package name — a package can
// have several advisories and accepting one must not silently accept the rest).
// Every entry needs its own honest one-line reason; a bare id is not a review
// decision, it is a rubber stamp. Re-seed this list from
// `pnpm audit --prod --json` whenever it goes stale — see checkDependencyVulnerabilities().
//
// Snapshot taken 2026-08-21 against `pnpm audit --prod --json`. `--prod`
// structurally excludes the @juspay/hippocampus dev-only shadow tree (a full
// audit shows 55 advisories; --prod shows 25 and drops all 3
// @opentelemetry/* entries that used to be filtered by package name below).
const ACCEPTED_RISK_ADVISORY_IDS: Record<string, string> = {
  // uuid — transitive via @anthropic-ai/vertex-sdk, bullmq, exceljs; no
  // single direct dependency to bump, upstreams need to move first.
  "1119441":
    "uuid buffer bounds check — deep transitive via vertex-sdk/bullmq/exceljs, no direct control",
  // form-data — transitive via optional @livekit/agents (voice feature only).
  "1120743":
    "form-data CRLF injection — transitive via optional @livekit/agents, not on the default request path",
  // @opentelemetry/core — transitive via optional livekit OTEL exporters.
  "1120821":
    "@opentelemetry/core baggage allocation — transitive via optional livekit OTEL exporter chain",
  // adm-zip — transitive via optional livekit onnxruntime-node.
  "1123686":
    "adm-zip 4GB allocation — transitive via optional @livekit/agents-plugin-livekit onnxruntime-node",
  // brace-expansion — three separate DoS advisories, same transitive chain.
  "1123898":
    "brace-expansion DoS — transitive via @google-cloud/text-to-speech>google-gax>rimraf>glob>minimatch, no direct control",
  "1130591":
    "brace-expansion DoS (unbounded expansion variant) — same google-gax>rimraf>glob>minimatch chain as 1123898",
  "1130734":
    "brace-expansion DoS (mitigation-bypass variant) — same google-gax>rimraf>glob>minimatch chain as 1123898",
  // protobufjs — transitive via @google/genai and optional livekit OTEL.
  "1123964":
    "protobufjs infinite loop — transitive via @google/genai and optional @livekit/agents OTEL exporter",
  // body-parser — transitive via express, low severity.
  "1123976":
    "body-parser size-limit bypass (low severity) — transitive via express",
  // fast-uri — three advisories, all through modelcontextprotocol/sdk's ajv.
  "1124064":
    "fast-uri host confusion — transitive via @modelcontextprotocol/sdk's ajv dependency",
  "1130720":
    "fast-uri host confusion (backslash variant) — same @modelcontextprotocol/sdk>ajv chain as 1124064",
  "1145555":
    "fast-uri host confusion (IDN variant) — same @modelcontextprotocol/sdk>ajv chain as 1124064",
  // sharp — optional dependency for the image-processing feature only.
  "1124066":
    "sharp libvips CVEs — optionalDependency for image handling, not required at runtime for most consumers",
  // find-my-way — transitive via optional fastify server adapter.
  "1124273":
    "find-my-way HTTP/2 DDoS — transitive via optional fastify server adapter",
  // undici — direct dependency (range ">=7.24.0 <8.0.0"). Patched 7.29.0
  // already satisfies that range; the lockfile is just pinned to 7.28.0.
  // This is a real lockfile bump, tracked separately from this audit fix.
  "1130715":
    "undici response desync — direct dep, patched 7.29.0 fits our existing >=7.24.0 <8.0.0 range, needs a lockfile bump (tracked separately)",
  "1130718":
    "undici cache-directive crash — same undici lockfile-bump fix as 1130715",
  "1130726":
    "undici CRLF injection via blob type — same undici lockfile-bump fix as 1130715",
  "1130729":
    "undici cache-control whitespace disclosure — same undici lockfile-bump fix as 1130715",
  "1130731":
    "undici cookie attribute injection — same undici lockfile-bump fix as 1130715",
  // ip-address — transitive via express-rate-limit, three related advisories.
  "1130722":
    "ip-address octal/decimal SSRF bypass — transitive via express-rate-limit",
  "1130723":
    "ip-address CIDR-suffix SSRF bypass — same express-rate-limit chain as 1130722",
  "1130724":
    "ip-address IPv4-mapped/NAT64 SSRF bypass — same express-rate-limit chain as 1130722",
  // image-size — transitive via pptxgenjs; upstream has NOT published a fix
  // (patched_versions reports none), so there is nothing to bump to yet.
  "1138808":
    "image-size ICNS parser DoS — transitive via pptxgenjs, no patched version published upstream yet",
  "1138809":
    "image-size JXL/HEIF parser DoS — same pptxgenjs chain as 1138808, no patched version published upstream yet",
  // nanoid — direct dependency (range "^5.1.5"). Patched 5.1.16 already
  // satisfies that range; the lockfile is just pinned to 5.1.7.
  "1138810":
    "nanoid negative-size infinite loop — direct dep, patched 5.1.16 fits our existing ^5.1.5 range, needs a lockfile bump (tracked separately)",
};

type SecurityIssue = {
  level: string;
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  timestamp: string;
};

type PnpmAdvisory = {
  id: number;
  severity: string;
  module_name: string;
  title: string;
};

type PnpmAuditJson = {
  advisories?: Record<string, PnpmAdvisory>;
};

type GitleaksFinding = {
  RuleID?: string;
  File?: string;
  StartLine?: number;
  Description?: string;
};

type SecurityResults = {
  secrets: { status: string; details: GitleaksFinding[] };
  dependencies: { status: string; details: unknown[] };
  licenses: { status: string; details: unknown[] };
  bestPractices: { status: string; details: unknown[] };
};

class SecurityValidator {
  errors: SecurityIssue[];
  warnings: SecurityIssue[];
  info: SecurityIssue[];
  startTime: number;
  projectRoot: string;
  results: SecurityResults;

  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
    this.results = {
      secrets: { status: "pending", details: [] },
      dependencies: { status: "pending", details: [] },
      licenses: { status: "pending", details: [] },
      bestPractices: { status: "pending", details: [] },
    };
  }

  log(message: string, color = "reset"): void {
    console.log(`${colors[color]}[SECURITY] ${message}${colors.reset}`);
  }

  addIssue(
    level: string,
    category: string,
    message: string,
    details: Record<string, unknown> | null = null,
  ): void {
    const issue: SecurityIssue = {
      level,
      category,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    switch (level) {
      case "error":
        this.errors.push(issue);
        break;
      case "warning":
        this.warnings.push(issue);
        break;
      case "info":
        this.info.push(issue);
        break;
    }
  }

  // 1. Dependency Vulnerability Scanning
  //
  // Parses `pnpm audit --prod --json` and checks each advisory individually
  // against ACCEPTED_RISK_ADVISORY_IDS. This deliberately replaced an older
  // implementation that ran plain-text `pnpm audit` and computed a single
  // boolean over the *entire* output: if any one of a handful of allowlisted
  // package *names* appeared anywhere in the text, the whole check passed —
  // regardless of how many other, unrelated advisories were open. That let a
  // build with 15 open high-severity production advisories report PASS
  // because one unrelated, genuinely-ignorable OTEL package happened to also
  // appear in the table. `--prod` additionally excludes the dev-only
  // @juspay/hippocampus shadow tree, so this only ever evaluates advisories
  // that can reach a real consumer of the published package.
  async checkDependencyVulnerabilities(): Promise<void> {
    this.log("Scanning dependencies for vulnerabilities...", "blue");

    let output: string;
    try {
      // pnpm audit exits non-zero whenever advisories are found — that is
      // expected and not itself a tool failure, so capture stdout on both
      // the success and the error path rather than treating a throw as
      // "the scan could not run".
      output = execSync("pnpm audit --prod --json", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (pnpmError: unknown) {
      const execErr = pnpmError as { stdout?: string };
      output = execErr.stdout || "";
    }

    if (!output.trim()) {
      this.addIssue(
        "warning",
        "dependencies",
        "pnpm audit produced no output — could not complete vulnerability scan",
      );
      this.results.dependencies.status = "warning";
      return;
    }

    let audit: PnpmAuditJson;
    try {
      audit = JSON.parse(output) as PnpmAuditJson;
    } catch (parseError: unknown) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : String(parseError);
      this.addIssue(
        "warning",
        "dependencies",
        `Could not parse pnpm audit output as JSON: ${message}`,
      );
      this.results.dependencies.status = "warning";
      return;
    }

    const advisories = Object.values(audit.advisories ?? {});
    // Only moderate+ advisories require an explicit accept — this mirrors
    // the previous --audit-level=moderate threshold. Low/info advisories are
    // still surfaced for visibility but do not block the build on their own.
    const actionable = advisories.filter((a) =>
      ["moderate", "high", "critical"].includes(a.severity),
    );

    const accepted = actionable.filter(
      (a) => ACCEPTED_RISK_ADVISORY_IDS[String(a.id)],
    );
    const unaccepted = actionable.filter(
      (a) => !ACCEPTED_RISK_ADVISORY_IDS[String(a.id)],
    );

    if (accepted.length > 0) {
      accepted.forEach((a) => {
        this.log(
          `Accepted risk — advisory ${a.id} (${a.severity} ${a.module_name}): ${ACCEPTED_RISK_ADVISORY_IDS[String(a.id)]}`,
          "cyan",
        );
      });
    }

    if (unaccepted.length > 0) {
      unaccepted.forEach((a) => {
        this.addIssue(
          "error",
          "dependencies",
          `Unaccepted ${a.severity} advisory ${a.id} in ${a.module_name}: ${a.title}`,
        );
      });
      this.results.dependencies.status = "failed";
      this.results.dependencies.details = unaccepted;
      return;
    }

    if (actionable.length === 0) {
      this.log("No known vulnerabilities found", "green");
    } else {
      this.log(
        `All ${actionable.length} open production advisories are explicitly accepted risk`,
        "green",
      );
    }
    this.results.dependencies.status = "passed";
  }

  // 2. Professional Secret Detection with Gitleaks Integration
  async checkSecretsWithGitleaks(): Promise<void> {
    this.log(
      "Running professional secret detection with Gitleaks...",
      "blue",
    );

    try {
      // Check if gitleaks is available
      const gitleaksCommand = "gitleaks";
      const configPath = path.join(this.projectRoot, ".gitleaksrc.json");

      const gitleaksArgs = [
        "detect",
        "--no-git",
        "--exit-code",
        "0",
        "--format",
        "json",
      ];
      if (fs.existsSync(configPath)) {
        gitleaksArgs.push("--config", configPath);
      }

      let gitleaksResult: string;
      try {
        // Use spawnSync for safer command execution without shell interpretation
        const result = spawnSync(gitleaksCommand, gitleaksArgs, {
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          cwd: this.projectRoot,
        });

        if (result.error) {
          throw result.error;
        }

        // If gitleaks exits with non-zero but has stdout, use it (findings detected)
        gitleaksResult = result.stdout || "[]";
      } catch (gitleaksError: unknown) {
        // If gitleaks fails, fallback to empty result
        const err = gitleaksError as {
          stderr?: string;
          message?: string;
        };
        if (err.stderr) {
          this.log(`Gitleaks stderr: ${err.stderr.toString()}`, "yellow");
        }
        this.log(`Gitleaks error: ${err.message}`, "yellow");
        gitleaksResult = "[]";
        // Do not throw, fallback to empty findings and continue with basic detection
      }

      let findings: GitleaksFinding[] = [];
      try {
        findings = JSON.parse(gitleaksResult.trim() || "[]");
      } catch (_parseError: unknown) {
        // If JSON parsing fails, try to extract findings manually
        if (gitleaksResult.includes("Finding:")) {
          this.addIssue(
            "warning",
            "secrets",
            "Gitleaks found potential secrets (parsing details failed)",
          );
          this.results.secrets.status = "warning";
          return;
        }
      }

      if (findings.length > 0) {
        // Process and filter findings
        const criticalFindings = findings.filter(
          (finding) =>
            finding.RuleID &&
            CRITICAL_SECURITY_RULES.includes(finding.RuleID),
        );

        const moderateFindings = findings.filter(
          (finding) => !criticalFindings.includes(finding),
        );

        if (criticalFindings.length > 0) {
          this.addIssue(
            "error",
            "secrets",
            `Found ${criticalFindings.length} critical secrets`,
          );
          criticalFindings.forEach((finding) => {
            this.addIssue(
              "error",
              "secrets",
              `Critical secret in ${finding.File}:${finding.StartLine}`,
              {
                rule: finding.RuleID as string,
                description: finding.Description as string,
              },
            );
          });
          this.results.secrets.status = "failed";
        }

        if (moderateFindings.length > 0) {
          this.addIssue(
            "warning",
            "secrets",
            `Found ${moderateFindings.length} potential secrets to review`,
          );
          // Show up to 5 moderate findings
          moderateFindings.slice(0, 5).forEach((finding) => {
            this.addIssue(
              "warning",
              "secrets",
              `Potential secret in ${finding.File}:${finding.StartLine}`,
              { rule: finding.RuleID as string },
            );
          });

          if (moderateFindings.length > 5) {
            this.addIssue(
              "info",
              "secrets",
              `... and ${moderateFindings.length - 5} more potential secrets`,
            );
          }

          if (this.results.secrets.status !== "failed") {
            this.results.secrets.status = "warning";
          }
        }

        this.results.secrets.details = findings;
      } else {
        this.log("No secrets detected by Gitleaks", "green");
        this.results.secrets.status = "passed";
      }
    } catch (_gitleaksError: unknown) {
      this.log(
        "Gitleaks not available, falling back to basic detection",
        "yellow",
      );
      this.addIssue(
        "warning",
        "secrets",
        "Gitleaks not installed - using basic pattern detection only",
      );

      // Fallback to basic detection for critical patterns
      await this.basicSecretDetection();
    }
  }

  async basicSecretDetection(): Promise<void> {
    const criticalPatterns: Array<{
      pattern: string;
      type: string;
      severity: string;
    }> = [
      {
        pattern: "sk-[a-zA-Z0-9]{48}",
        type: "OpenAI API Key",
        severity: "critical",
      },
      {
        pattern: "AKIA[0-9A-Z]{16}",
        type: "AWS Access Key",
        severity: "critical",
      },
      {
        pattern: "AIza[0-9A-Za-z\\-_]{35}",
        type: "Google API Key",
        severity: "high",
      },
      {
        pattern: "gh[pousr]_[A-Za-z0-9_]{36}",
        type: "GitHub Token",
        severity: "high",
      },
    ];

    let totalFindings = 0;

    for (const { pattern, type, severity } of criticalPatterns) {
      try {
        // Use spawnSync to prevent command injection vulnerabilities
        let output = "";
        try {
          const result = spawnSync(
            "rg",
            [
              "--no-heading",
              "--line-number",
              pattern,
              ".",
              "--type",
              "js",
              "--type",
              "ts",
              "--type",
              "json",
            ],
            {
              encoding: "utf8",
              maxBuffer: 5 * 1024 * 1024,
            },
          );
          output = result.stdout || "";
        } catch (_err: unknown) {
          // If rg returns non-zero (no matches), output remains empty
        }

        if (output.trim()) {
          const matches = output.trim().split("\n");
          const validMatches = matches.filter((match: string) => {
            const [, , content] = match.split(":", 3);
            if (!content) return false;

            // Enhanced placeholder detection
            const cleanContent = content.trim().toLowerCase();
            return !(
              cleanContent.includes("your-") ||
              cleanContent.includes("example") ||
              cleanContent.includes("placeholder") ||
              cleanContent.includes("dummy") ||
              cleanContent.includes("test") ||
              cleanContent.includes("sample") ||
              cleanContent.includes("xxx") ||
              cleanContent.includes("replace") ||
              cleanContent.includes("here") ||
              /^[x\-_=<>\[\]{}()]{10,}$/.test(cleanContent)
            );
          });

          if (validMatches.length > 0) {
            totalFindings += validMatches.length;

            if (severity === "critical") {
              this.addIssue(
                "error",
                "secrets",
                `Found ${validMatches.length} potential ${type}(s)`,
              );
            } else {
              this.addIssue(
                "warning",
                "secrets",
                `Found ${validMatches.length} potential ${type}(s)`,
              );
            }

            // Show first finding as example
            const [file, line] = validMatches[0].split(":", 2);
            this.addIssue(
              "info",
              "secrets",
              `Example: ${file}:${line}`,
            );
          }
        }
      } catch (_error: unknown) {
        // Continue with other patterns
      }
    }

    if (totalFindings > 0) {
      this.addIssue(
        "info",
        "secrets",
        "Install official gitleaks for enhanced detection: https://github.com/gitleaks/gitleaks",
      );
      this.results.secrets.status =
        totalFindings > 0 ? "warning" : "passed";
    } else {
      this.log("No critical secrets detected (basic scan)", "green");
      this.results.secrets.status = "passed";
    }
  }

  // 3. License Compliance Checking
  checkLicenseCompliance(): void {
    this.log("Checking license compliance...", "blue");

    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        this.addIssue("error", "licenses", "package.json not found");
        return;
      }

      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      );

      // Check project license
      if (!packageJson.license) {
        this.addIssue(
          "warning",
          "licenses",
          "Project license not specified in package.json",
        );
      } else {
        this.log(`Project license: ${packageJson.license}`, "green");
      }

      // Check for license-checker package availability
      try {
        execSync("pnpm exec license-checker --summary", { stdio: "pipe" });
        this.log("License compliance check available", "green");
        this.results.licenses.status = "passed";
      } catch (_error: unknown) {
        this.addIssue(
          "info",
          "licenses",
          "Install license-checker for detailed compliance: pnpm add -D license-checker",
        );
        this.results.licenses.status = "warning";
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.addIssue(
        "warning",
        "licenses",
        `License check failed: ${message}`,
      );
      this.results.licenses.status = "warning";
    }
  }

  // 4. Security Best Practices Validation
  checkSecurityBestPractices(): void {
    this.log("Validating security best practices...", "blue");

    const checks: Record<string, boolean> = {
      gitignore: this.checkGitIgnore(),
      envExample: this.checkEnvExample(),
      securityDeps: this.checkSecurityDependencies(),
      packageScripts: this.checkPackageScripts(),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    if (passedChecks === totalChecks) {
      this.log("All security best practices validated", "green");
      this.results.bestPractices.status = "passed";
    } else {
      this.addIssue(
        "warning",
        "bestPractices",
        `${passedChecks}/${totalChecks} security best practices implemented`,
      );
      this.results.bestPractices.status = "warning";
    }
  }

  checkGitIgnore(): boolean {
    const gitIgnorePath = path.join(this.projectRoot, ".gitignore");
    if (!fs.existsSync(gitIgnorePath)) {
      this.addIssue(
        "warning",
        "bestPractices",
        ".gitignore file missing",
      );
      return false;
    }

    const content = fs.readFileSync(gitIgnorePath, "utf8");
    const requiredPatterns = [".env", "*.key", "*.pem", "node_modules"];
    const missingPatterns = requiredPatterns.filter(
      (pattern) => !content.includes(pattern),
    );

    if (missingPatterns.length > 0) {
      this.addIssue(
        "warning",
        "bestPractices",
        `Add to .gitignore: ${missingPatterns.join(", ")}`,
      );
      return false;
    }

    return true;
  }

  checkEnvExample(): boolean {
    const envExamplePath = path.join(this.projectRoot, ".env.example");
    if (!fs.existsSync(envExamplePath)) {
      this.addIssue(
        "warning",
        "bestPractices",
        ".env.example file missing",
      );
      return false;
    }
    return true;
  }

  checkSecurityDependencies(): boolean {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      );

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const securityDeps = ["cors", "helmet", "express-rate-limit"].filter(
        (dep) => allDeps[dep],
      );

      if (securityDeps.length > 0) {
        this.log(
          `Security dependencies found: ${securityDeps.join(", ")}`,
          "green",
        );
        return true;
      }

      return false;
    } catch (_error: unknown) {
      return false;
    }
  }

  checkPackageScripts(): boolean {
    try {
      const packageJsonPath = path.join(this.projectRoot, "package.json");
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, "utf8"),
      );

      const securityScripts = ["validate:security", "audit"].filter(
        (script) => packageJson.scripts?.[script],
      );
      return securityScripts.length > 0;
    } catch (_error: unknown) {
      return false;
    }
  }

  // Main execution function
  async run(): Promise<void> {
    this.log("Starting NeuroLink Security Validation...", "cyan");
    console.log("\n" + "=".repeat(50) + "\n");

    // Run all security checks
    await this.checkSecretsWithGitleaks();
    await this.checkDependencyVulnerabilities();
    this.checkLicenseCompliance();
    this.checkSecurityBestPractices();

    // Generate summary report
    this.generateReport();
  }

  generateReport(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    this.log(
      "\n============================================================",
    );
    this.log(`Security validation completed in ${duration}s`, "blue");

    // Show summary by category
    const categories: Array<keyof SecurityResults> = [
      "secrets",
      "dependencies",
      "licenses",
      "bestPractices",
    ];
    categories.forEach((category) => {
      const result = this.results[category];
      const icon =
        result.status === "passed"
          ? "PASS"
          : result.status === "warning"
            ? "WARN"
            : "FAIL";
      this.log(`${icon} ${category}: ${result.status}`);
    });

    // Show detailed issues
    if (this.warnings.length > 0) {
      this.log(
        `\n${colors.yellow}SECURITY WARNINGS:${colors.reset}`,
      );
      this.log("==================================================");
      this.warnings.forEach((warning: SecurityIssue, index: number) => {
        this.log(
          `${index + 1}. ${colors.yellow}[WARNING]${colors.reset} ${warning.category}: ${warning.message}`,
        );
        if (warning.details) {
          this.log(`   ${JSON.stringify(warning.details)}`);
        }
      });
    }

    if (this.errors.length > 0) {
      this.log(`\n${colors.red}SECURITY ERRORS:${colors.reset}`);
      this.log("==================================================");
      this.errors.forEach((error: SecurityIssue, index: number) => {
        this.log(
          `${index + 1}. ${colors.red}[ERROR]${colors.reset} ${error.category}: ${error.message}`,
        );
        if (error.details) {
          this.log(`   ${JSON.stringify(error.details)}`);
        }
      });
    }

    // Recommendations
    if (this.info.length > 0) {
      this.log(
        `\n${colors.blue}RECOMMENDATIONS:${colors.reset}`,
      );
      this.log("==================================================");
      this.info.forEach((infoItem: SecurityIssue, index: number) => {
        this.log(`${index + 1}. ${infoItem.message}`);
      });
    }

    // Final status
    if (this.errors.length > 0) {
      this.log(
        `\n${colors.red}SECURITY VALIDATION FAILED!${colors.reset}`,
      );
      this.log(
        `${colors.red}Please address ${this.errors.length} critical security issues before proceeding.${colors.reset}`,
      );
      process.exit(1);
    } else if (this.warnings.length > 0) {
      this.log(
        `\n${colors.yellow}Security validation completed with ${this.warnings.length} warnings.${colors.reset}`,
      );
      this.log(
        `${colors.blue}Consider addressing these warnings for enhanced security.${colors.reset}`,
      );
    } else {
      this.log(
        `\n${colors.green}Security validation passed!${colors.reset}`,
      );
    }
  }
}

// Run the enhanced security validation
const validator = new SecurityValidator();
validator.run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `${colors.red}[ERROR] Security validation failed: ${message}${colors.reset}`,
  );
  process.exit(1);
});

export default SecurityValidator;
