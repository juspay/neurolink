#!/usr/bin/env node
/**
 * Advanced Script Analyzer for NeuroLink Project
 *
 * Analyzes duplicate scripts, shell scripts, and provides intelligent cleanup recommendations.
 * Uses modern JavaScript with comprehensive file comparison and backup capabilities.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { diffLines } from "diff";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

class ScriptAnalyzer {
  constructor() {
    this.scriptsDir = path.resolve("./scripts");
    this.backupDir = path.resolve(`./scripts-backup-${Date.now()}`);
    this.analysisResults = {
      totalScripts: 0,
      duplicates: [],
      shellScripts: [],
      jsScripts: [],
      storageWaste: 0,
      removalPlan: {},
      conversionPlan: {},
    };
  }

  async analyzeProject() {
    console.log("🔍 Starting comprehensive script analysis...");
    console.log(`📁 Analyzing: ${this.scriptsDir}`);

    try {
      // Create backup directory
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`💾 Backup directory created: ${this.backupDir}`);

      // Get all scripts
      const allFiles = await fs.readdir(this.scriptsDir);
      this.analysisResults.totalScripts = allFiles.length;

      // Categorize scripts
      await this.categorizeScripts(allFiles);

      // Find exact duplicates
      await this.findDuplicates();

      // Calculate storage waste
      await this.calculateStorageWaste();

      // Generate removal and conversion plans
      await this.generatePlans();

      return this.analysisResults;
    } catch (error) {
      console.error("❌ Analysis failed:", error.message);
      throw error;
    }
  }

  async categorizeScripts(files) {
    console.log("📊 Categorizing scripts...");

    for (const file of files) {
      const filePath = path.join(this.scriptsDir, file);

      try {
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          if (file.endsWith(".sh")) {
            this.analysisResults.shellScripts.push(file);
          } else if (file.endsWith(".js")) {
            this.analysisResults.jsScripts.push(file);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze ${file}: ${error.message}`);
      }
    }

    console.log(
      `  📜 Found ${this.analysisResults.jsScripts.length} JavaScript files`,
    );
    console.log(
      `  🐚 Found ${this.analysisResults.shellScripts.length} shell scripts`,
    );
  }

  async findDuplicates() {
    console.log("🔍 Analyzing for duplicate scripts...");

    const jsFiles = this.analysisResults.jsScripts;
    const duplicatePairs = [];

    for (const file of jsFiles) {
      if (file.startsWith("scripts-")) {
        const originalName = file.replace("scripts-", "");
        const originalExists = jsFiles.includes(originalName);

        if (originalExists) {
          console.log(`  🔄 Comparing: ${file} vs ${originalName}`);
          const similarity = await this.compareFiles(file, originalName);

          duplicatePairs.push({
            duplicate: file,
            original: originalName,
            similarity: similarity.percentage,
            differences: similarity.differences,
            action: similarity.percentage > 95 ? "remove" : "review",
            size: await this.getFileSize(file),
          });

          console.log(
            `    📈 Similarity: ${similarity.percentage.toFixed(1)}%`,
          );
        }
      }
    }

    this.analysisResults.duplicates = duplicatePairs;
    console.log(`✅ Found ${duplicatePairs.length} duplicate pairs`);
  }

  async compareFiles(file1, file2) {
    try {
      const content1 = await fs.readFile(
        path.join(this.scriptsDir, file1),
        "utf-8",
      );
      const content2 = await fs.readFile(
        path.join(this.scriptsDir, file2),
        "utf-8",
      );

      // Generate hashes for exact comparison
      const hash1 = crypto.createHash("md5").update(content1).digest("hex");
      const hash2 = crypto.createHash("md5").update(content2).digest("hex");

      if (hash1 === hash2) {
        return { percentage: 100, differences: [] };
      }

      // Detailed diff analysis
      const differences = diffLines(content1, content2);
      const totalLines = Math.max(
        content1.split("\n").length,
        content2.split("\n").length,
      );
      const changedLines = differences.filter(
        (part) => part.added || part.removed,
      ).length;
      const similarity = Math.max(
        0,
        ((totalLines - changedLines) / totalLines) * 100,
      );

      return {
        percentage: similarity,
        differences: differences
          .filter((part) => part.added || part.removed)
          .slice(0, 5), // Limit for readability
      };
    } catch (error) {
      console.warn(
        `⚠️  Could not compare ${file1} and ${file2}: ${error.message}`,
      );
      return { percentage: 0, differences: [] };
    }
  }

  async getFileSize(filename) {
    try {
      const stats = await fs.stat(path.join(this.scriptsDir, filename));
      return stats.size;
    } catch {
      return 0;
    }
  }

  async calculateStorageWaste() {
    let totalWaste = 0;

    for (const duplicate of this.analysisResults.duplicates) {
      if (duplicate.action === "remove") {
        totalWaste += duplicate.size;
      }
    }

    this.analysisResults.storageWaste = totalWaste;
    console.log(`💾 Storage waste: ${this.formatBytes(totalWaste)}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async generatePlans() {
    console.log("📋 Generating cleanup and conversion plans...");

    // Removal plan for duplicates
    const removalPlan = {
      duplicatesToRemove: [],
      duplicatesToReview: [],
      totalFilesSaved: 0,
      storageSaved: 0,
      estimatedTimeSaved: "2-3 hours/week",
    };

    for (const duplicate of this.analysisResults.duplicates) {
      if (duplicate.action === "remove") {
        removalPlan.duplicatesToRemove.push({
          file: duplicate.duplicate,
          reason: `${duplicate.similarity.toFixed(1)}% identical to ${duplicate.original}`,
          confidence: "high",
          size: duplicate.size,
        });
        removalPlan.storageSaved += duplicate.size;
      } else {
        removalPlan.duplicatesToReview.push({
          file: duplicate.duplicate,
          reason: `${duplicate.similarity.toFixed(1)}% similar to ${duplicate.original}`,
          differences: duplicate.differences.length,
        });
      }
    }

    removalPlan.totalFilesSaved = removalPlan.duplicatesToRemove.length;

    // Conversion plan for shell scripts
    const conversionPlan = {
      shellScriptsToConvert: this.analysisResults.shellScripts.map(
        (script) => ({
          file: script,
          targetName: script.replace(".sh", ".js"),
          complexity: this.estimateConversionComplexity(script),
          priority: this.getConversionPriority(script),
        }),
      ),
      totalConversions: this.analysisResults.shellScripts.length,
      estimatedEffort: `${this.analysisResults.shellScripts.length * 2} hours`,
    };

    this.analysisResults.removalPlan = removalPlan;
    this.analysisResults.conversionPlan = conversionPlan;
  }

  estimateConversionComplexity(scriptName) {
    // Simple heuristic based on filename
    const complexPatterns = ["generate-all", "convert-all", "create-final"];
    const simplePatterns = ["cleanup", "simple"];

    if (complexPatterns.some((pattern) => scriptName.includes(pattern))) {
      return "high";
    } else if (simplePatterns.some((pattern) => scriptName.includes(pattern))) {
      return "low";
    }
    return "medium";
  }

  getConversionPriority(scriptName) {
    // Priority based on usage frequency and importance
    const highPriority = ["generate-all", "cleanup"];
    const mediumPriority = ["create-cli", "create-mcp"];

    if (highPriority.some((pattern) => scriptName.includes(pattern))) {
      return "high";
    } else if (mediumPriority.some((pattern) => scriptName.includes(pattern))) {
      return "medium";
    }
    return "low";
  }

  async executePlan() {
    console.log("\n🧹 Executing script cleanup plan...");

    const plan = this.analysisResults.removalPlan;

    // Remove high-confidence duplicates
    for (const item of plan.duplicatesToRemove) {
      await this.backupAndRemove(item.file);
      console.log(
        `✅ Removed duplicate: ${item.file} (${this.formatBytes(item.size)} saved)`,
      );
    }

    // Report items needing review
    if (plan.duplicatesToReview.length > 0) {
      console.log(
        `\n📋 ${plan.duplicatesToReview.length} files need manual review:`,
      );
      for (const item of plan.duplicatesToReview) {
        console.log(`  ⚠️  ${item.file} - ${item.reason}`);
      }
    }

    // Report shell script conversion plan
    console.log(`\n🔄 Shell script conversion plan:`);
    for (const item of this.analysisResults.conversionPlan
      .shellScriptsToConvert) {
      console.log(
        `  📝 ${item.file} → ${item.targetName} (${item.complexity} complexity, ${item.priority} priority)`,
      );
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Removed ${plan.totalFilesSaved} duplicate files`);
    console.log(`  - Saved ${this.formatBytes(plan.storageSaved)} storage`);
    console.log(
      `  - ${this.analysisResults.conversionPlan.totalConversions} shell scripts identified for conversion`,
    );
    console.log(`💾 Backups stored in: ${this.backupDir}`);
  }

  async backupAndRemove(filename) {
    const source = path.join(this.scriptsDir, filename);
    const backup = path.join(this.backupDir, filename);

    try {
      // Create backup
      await fs.copyFile(source, backup);

      // Remove original
      await fs.unlink(source);
    } catch (error) {
      console.error(`❌ Failed to backup/remove ${filename}: ${error.message}`);
      throw error;
    }
  }

  printResults() {
    const results = this.analysisResults;

    console.log("\n📊 ANALYSIS RESULTS SUMMARY");
    console.log("=".repeat(50));
    console.log(`📁 Total scripts analyzed: ${results.totalScripts}`);
    console.log(`📜 JavaScript files: ${results.jsScripts.length}`);
    console.log(`🐚 Shell scripts: ${results.shellScripts.length}`);
    console.log(`🔄 Duplicate pairs found: ${results.duplicates.length}`);
    console.log(`💾 Storage waste: ${this.formatBytes(results.storageWaste)}`);

    if (results.removalPlan.duplicatesToRemove) {
      console.log(`\n🧹 CLEANUP PLAN:`);
      console.log(
        `  - ${results.removalPlan.duplicatesToRemove.length} duplicates ready for removal`,
      );
      console.log(
        `  - ${results.removalPlan.duplicatesToReview.length} files need manual review`,
      );
      console.log(
        `  - ${this.formatBytes(results.removalPlan.storageSaved)} storage to be saved`,
      );
    }

    if (results.conversionPlan.shellScriptsToConvert) {
      console.log(`\n🔄 CONVERSION PLAN:`);
      console.log(
        `  - ${results.conversionPlan.totalConversions} shell scripts to convert`,
      );
      console.log(
        `  - Estimated effort: ${results.conversionPlan.estimatedEffort}`,
      );
    }

    console.log("\n💡 NEXT STEPS:");
    console.log("  1. Run with --execute to perform cleanup");
    console.log("  2. Manually review flagged files");
    console.log("  3. Convert shell scripts to JavaScript");
    console.log("  4. Run pnpm run project:organize");
  }
}

// Export for use as module
export { ScriptAnalyzer };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new ScriptAnalyzer();

  try {
    await analyzer.analyzeProject();
    analyzer.printResults();

    if (process.argv.includes("--execute")) {
      console.log("\n🚀 Executing cleanup plan...");
      await analyzer.executePlan();
    } else {
      console.log("\n💡 Add --execute flag to perform the cleanup");
    }
  } catch (error) {
    console.error("❌ Script analysis failed:", error.message);
    process.exit(1);
  }
}
