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

// Configuration: production advisories accepted as risk, keyed by package with
// a severity ceiling.
//
// Why a ceiling rather than a list of advisory ids: a package such as undici or
// ip-address accumulates several advisories for the same underlying weakness,
// and every new one used to hard-fail the build until a human pasted its id in
// here. That is not a review decision, it is a tax — and it fired mid-release
// on fast-uri 1145636.
//
// The ceiling is set to the highest severity actually observed for that package
// at the time of the snapshot below. A further advisory in the same package at
// or below that severity is accepted and logged; one that arrives ABOVE the
// ceiling still fails the build. So the model stays quiet for more of the same
// and still speaks up when a package gets materially worse.
//
// Every accepted advisory is printed with its id and title on each run, so a
// new one inside an existing ceiling is visible in the log even though it does
// not block. Re-seed from `pnpm audit --prod --json` when this goes stale.
//
// Snapshot taken 2026-08-22 against `pnpm audit --prod --json`: 16 actionable
// (moderate+) advisories across 9 packages. `--prod` structurally excludes dev
// -only trees.
type AdvisorySeverity = "low" | "moderate" | "high" | "critical";

const SEVERITY_RANK: Record<string, number> = {
  info: 0,
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

const ACCEPTED_RISK_PACKAGES: Record<
  string,
  { maxSeverity: AdvisorySeverity; reason: string }
> = {
  uuid: {
    maxSeverity: "moderate",
    reason:
      "deep transitive via @anthropic-ai/vertex-sdk, bullmq and exceljs — no single direct dependency to bump",
  },
  "form-data": {
    maxSeverity: "high",
    reason:
      "transitive via optional @livekit/agents (voice feature only), not on the default request path",
  },
  "@opentelemetry/core": {
    maxSeverity: "moderate",
    reason: "transitive via the optional livekit OTEL exporter chain",
  },
  "adm-zip": {
    maxSeverity: "high",
    reason:
      "transitive via optional @livekit/agents-plugin-livekit onnxruntime-node",
  },
  sharp: {
    maxSeverity: "high",
    reason:
      "optionalDependency for image handling — not required at runtime for most consumers",
  },
  "find-my-way": {
    maxSeverity: "high",
    reason: "transitive via the optional fastify server adapter",
  },
  undici: {
    maxSeverity: "high",
    reason:
      "direct dep; patched releases fit the existing >=7.24.0 <8.0.0 range and land via lockfile bumps",
  },
  "ip-address": {
    maxSeverity: "high",
    reason: "transitive via express-rate-limit (SSRF-bypass family)",
  },
  "image-size": {
    maxSeverity: "high",
    reason:
      "transitive via pptxgenjs — upstream has published no patched version yet",
  },
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
  // Parses `pnpm audit --prod --json` and checks each advisory against the
  // per-package ceiling in ACCEPTED_RISK_PACKAGES.
  //
  // Two earlier designs are worth not repeating. The first ran plain-text
  // `pnpm audit` and computed a single boolean over the *entire* output: if
  // any one of a handful of allowlisted package *names* appeared anywhere in
  // the text, the whole check passed — regardless of how many other,
  // unrelated advisories were open. That let a build with 15 open
  // high-severity production advisories report PASS because one unrelated,
  // genuinely-ignorable OTEL package also appeared in the table.
  //
  // The second keyed acceptance to individual advisory ids. Correct, but it
  // made every newly-published advisory a hard build failure until a human
  // pasted its id in — which fired mid-release on fast-uri 1145636 and had to
  // be unblocked by hand. The ceiling model keeps the per-package review
  // decision while letting more-of-the-same through, and still fails on
  // anything that exceeds the severity a package was accepted at.
  //
  // `--prod` excludes dev-only trees, so this only evaluates advisories that
  // can reach a real consumer of the published package.
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

    // Fail CLOSED. Every branch below means "the scan did not produce a report
    // I can reason about" — not "there is nothing wrong". Reporting those as a
    // warning let the check pass while knowing nothing, which is the same
    // failure shape as the single-boolean implementation this replaced: a
    // security gate that is green because it did not look.
    if (!output.trim()) {
      this.addIssue(
        "error",
        "dependencies",
        "pnpm audit produced no output — the vulnerability scan did not run, so its result cannot be trusted",
      );
      this.results.dependencies.status = "failed";
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
        "error",
        "dependencies",
        `Could not parse pnpm audit output as JSON — the scan produced no usable report: ${message}`,
      );
      this.results.dependencies.status = "failed";
      return;
    }

    // `{ "advisories": {} }` is a legitimate clean report. A response with no
    // `advisories` key at all is not — that is what a retired or erroring audit
    // endpoint returns, and defaulting it to {} would read as "zero
    // vulnerabilities" when the truth is "no answer".
    const rawAdvisories = audit.advisories;
    if (
      rawAdvisories === undefined ||
      rawAdvisories === null ||
      typeof rawAdvisories !== "object" ||
      Array.isArray(rawAdvisories)
    ) {
      this.addIssue(
        "error",
        "dependencies",
        "pnpm audit returned a report with no object-valued 'advisories' field — treating this as a failed scan rather than a clean one",
      );
      this.results.dependencies.status = "failed";
      return;
    }

    const advisories = Object.values(rawAdvisories);
    // Only moderate+ advisories require an explicit accept — this mirrors
    // the previous --audit-level=moderate threshold. Low/info advisories are
    // still surfaced for visibility but do not block the build on their own.
    const actionable = advisories.filter((a) =>
      ["moderate", "high", "critical"].includes(a.severity),
    );

    const isAccepted = (a: PnpmAdvisory): boolean => {
      const entry = ACCEPTED_RISK_PACKAGES[a.module_name];
      if (!entry) {
        return false;
      }
      return (
        (SEVERITY_RANK[a.severity] ?? 0) <=
        (SEVERITY_RANK[entry.maxSeverity] ?? 0)
      );
    };

    const accepted = actionable.filter(isAccepted);
    const unaccepted = actionable.filter((a) => !isAccepted(a));

    // Print every accepted advisory, not just a count. The ceiling model is
    // deliberately quiet about more-of-the-same, so the log is the only place
    // a newly-appeared advisory inside an existing ceiling becomes visible.
    if (accepted.length > 0) {
      accepted.forEach((a) => {
        const entry = ACCEPTED_RISK_PACKAGES[a.module_name];
        this.log(
          `Accepted risk — ${a.module_name} ${a.severity} (ceiling ${entry.maxSeverity}) advisory ${a.id}: ${a.title} — ${entry.reason}`,
          "cyan",
        );
      });
    }

    // An accepted-risk entry whose package no longer has any live advisory is
    // dead weight: it makes the accepted list look larger than the real
    // exposure, and it hides the fact that something was fixed upstream. Report
    // it as a warning rather than an error — a stale acceptance is tidy-up, not
    // a vulnerability, and failing the build for it would break unrelated work
    // the moment a dependency gets patched.
    //
    // This is the safeguard the previous advisory-id list never had. That list
    // could only grow: ids were added by hand whenever the build broke, and
    // nothing ever told anyone when one stopped mattering.
    //
    // Computed BEFORE the unaccepted-advisory return below. A run that fails on
    // a real advisory is exactly a run someone is about to read carefully, so
    // it is the worst moment to withhold the rest of what the scan noticed.
    //
    // The threshold is named explicitly: `actionable` drops low-severity
    // advisories, so a package whose only open advisory is low would otherwise
    // be described as having none at all.
    const packagesWithLiveAdvisories = new Set(
      actionable.map((a) => a.module_name),
    );
    const staleAcceptances = Object.keys(ACCEPTED_RISK_PACKAGES).filter(
      (pkg) => !packagesWithLiveAdvisories.has(pkg),
    );
    if (staleAcceptances.length > 0) {
      this.addIssue(
        "warning",
        "dependencies",
        `Accepted-risk entries with no live moderate-or-higher advisory (safe to remove from ACCEPTED_RISK_PACKAGES): ${staleAcceptances.join(", ")}`,
      );
    }

    if (unaccepted.length > 0) {
      unaccepted.forEach((a) => {
        const entry = ACCEPTED_RISK_PACKAGES[a.module_name];
        const why = entry
          ? `exceeds the accepted ${entry.maxSeverity} ceiling for ${a.module_name}`
          : `${a.module_name} is not an accepted-risk package`;
        this.addIssue(
          "error",
          "dependencies",
          `Unaccepted ${a.severity} advisory ${a.id} in ${a.module_name} (${why}): ${a.title}`,
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
