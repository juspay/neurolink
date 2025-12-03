#!/usr/bin/env node
/**
 * Video Cleanup Tool - JavaScript Conversion Example
 *
 * Converts the cleanupHashNamedVideos.sh shell script to modern JavaScript.
 * Demonstrates cross-platform video file management with enhanced features.
 */

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

class VideoCleanup {
  constructor() {
    this.videoDir = "./docs/visual-content/videos";
    this.backupDir = "./video-backups";
    this.supportedFormats = [".mp4", ".webm", ".gif", ".mov", ".avi"];
    this.hashPatterns = [
      /^[a-f0-9]{8,}\.(mp4|webm|gif|mov|avi)$/i, // Pure hash files
      /^[a-f0-9]{8,}-.*\.(mp4|webm|gif|mov|avi)$/i, // Hash prefix files
      /^.*-[a-f0-9]{8,}\.(mp4|webm|gif|mov|avi)$/i, // Hash suffix files
    ];
  }

  async cleanupHashNamedVideos() {
    console.log("🧹 Starting intelligent video cleanup...");
    console.log(`📁 Target directory: ${this.videoDir}`);

    try {
      // Ensure directories exist
      await this.ensureDirectories();

      // Scan for video files
      const videoFiles = await this.scanVideoFiles();

      if (videoFiles.length === 0) {
        console.log("✅ No video files found - directory is clean");
        return { cleaned: 0, backed: 0, kept: 0 };
      }

      // Analyze files
      const analysis = await this.analyzeVideoFiles(videoFiles);

      // Show analysis results
      this.printAnalysis(analysis);

      // Perform cleanup with backup
      const results = await this.performCleanup(analysis);

      // Generate cleanup report
      this.printCleanupReport(results);

      return results;
    } catch (error) {
      console.error("❌ Video cleanup failed:", error.message);
      throw error;
    }
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.videoDir, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error("❌ Failed to create directories:", error.message);
      throw error;
    }
  }

  async scanVideoFiles() {
    console.log("🔍 Scanning for video files...");

    try {
      // Use glob to find all video files recursively
      const patterns = this.supportedFormats.map(
        (ext) => `${this.videoDir}/**/*${ext}`,
      );

      const allFiles = [];
      for (const pattern of patterns) {
        const files = await glob(pattern, { nocase: true });
        allFiles.push(...files);
      }

      // Remove duplicates and get relative paths
      const uniqueFiles = [...new Set(allFiles)].map((file) =>
        path.relative(this.videoDir, file),
      );

      console.log(`📊 Found ${uniqueFiles.length} video files`);
      return uniqueFiles;
    } catch (error) {
      console.error("❌ Failed to scan video files:", error.message);
      return [];
    }
  }

  async analyzeVideoFiles(files) {
    console.log("📊 Analyzing video files...");

    const analysis = {
      hashNamed: [],
      meaningful: [],
      suspicious: [],
      totalSize: 0,
    };

    for (const file of files) {
      const filePath = path.join(this.videoDir, file);
      const fileName = path.basename(file);

      try {
        const stats = await fs.stat(filePath);
        const fileInfo = {
          name: fileName,
          path: file,
          size: stats.size,
          modified: stats.mtime,
          age: Date.now() - stats.mtime.getTime(),
        };

        analysis.totalSize += stats.size;

        // Check if file matches hash patterns
        const isHashNamed = this.hashPatterns.some((pattern) =>
          pattern.test(fileName),
        );

        if (isHashNamed) {
          analysis.hashNamed.push(fileInfo);
        } else if (this.isSuspicious(fileName, fileInfo)) {
          analysis.suspicious.push(fileInfo);
        } else {
          analysis.meaningful.push(fileInfo);
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze ${file}: ${error.message}`);
      }
    }

    return analysis;
  }

  isSuspicious(fileName, fileInfo) {
    // Additional heuristics for suspicious files
    const suspiciousPatterns = [
      /^temp[_-]/i,
      /^tmp[_-]/i,
      /^test[_-]/i,
      /^debug[_-]/i,
      /^untitled/i,
      /^recording/i,
      /^\d{8,}/, // Files starting with long numbers
    ];

    // Check patterns
    const matchesPattern = suspiciousPatterns.some((pattern) =>
      pattern.test(fileName),
    );

    // Check if file is very old (older than 30 days)
    const isOld = fileInfo.age > 30 * 24 * 60 * 60 * 1000;

    // Check if file is very large (>100MB) with generic name
    const isLargeGeneric =
      fileInfo.size > 100 * 1024 * 1024 && fileName.split(".")[0].length < 5;

    return matchesPattern || (isOld && isLargeGeneric);
  }

  printAnalysis(analysis) {
    console.log("\n📊 VIDEO FILE ANALYSIS");
    console.log("=".repeat(50));
    console.log(
      `📹 Total files: ${analysis.hashNamed.length + analysis.meaningful.length + analysis.suspicious.length}`,
    );
    console.log(`📦 Total size: ${this.formatBytes(analysis.totalSize)}`);
    console.log(`🔢 Hash-named files: ${analysis.hashNamed.length}`);
    console.log(`📝 Meaningful files: ${analysis.meaningful.length}`);
    console.log(`⚠️  Suspicious files: ${analysis.suspicious.length}`);

    if (analysis.hashNamed.length > 0) {
      console.log("\n🔢 Hash-named files to clean:");
      analysis.hashNamed.forEach((file) => {
        console.log(`  🗑️  ${file.name} (${this.formatBytes(file.size)})`);
      });
    }

    if (analysis.suspicious.length > 0) {
      console.log("\n⚠️  Suspicious files (manual review recommended):");
      analysis.suspicious.forEach((file) => {
        console.log(
          `  ❓ ${file.name} (${this.formatBytes(file.size)}, ${this.formatAge(file.age)})`,
        );
      });
    }

    if (analysis.meaningful.length > 0) {
      console.log("\n📝 Meaningful files (will be kept):");
      analysis.meaningful.forEach((file) => {
        console.log(`  ✅ ${file.name} (${this.formatBytes(file.size)})`);
      });
    }
  }

  async performCleanup(analysis) {
    console.log("\n🧹 Performing video cleanup...");

    const results = {
      cleaned: 0,
      backed: 0,
      kept: 0,
      sizeSaved: 0,
      errors: [],
    };

    // Backup and remove hash-named files
    for (const file of analysis.hashNamed) {
      try {
        await this.backupAndRemove(file);
        results.cleaned++;
        results.backed++;
        results.sizeSaved += file.size;
        console.log(`  ✅ Cleaned: ${file.name}`);
      } catch (error) {
        results.errors.push({ file: file.name, error: error.message });
        console.error(`  ❌ Failed to clean ${file.name}: ${error.message}`);
      }
    }

    // Keep meaningful files
    results.kept = analysis.meaningful.length;

    // Report suspicious files (don't auto-delete)
    if (analysis.suspicious.length > 0) {
      console.log(
        `\n⚠️  ${analysis.suspicious.length} suspicious files require manual review`,
      );
    }

    return results;
  }

  async backupAndRemove(fileInfo) {
    const sourcePath = path.join(this.videoDir, fileInfo.path);
    const backupPath = path.join(this.backupDir, fileInfo.name);

    // Create backup
    await fs.copyFile(sourcePath, backupPath);

    // Create metadata
    const metadata = {
      originalPath: sourcePath,
      backupDate: new Date().toISOString(),
      size: fileInfo.size,
      lastModified: fileInfo.modified.toISOString(),
      reason: "Hash-named file cleanup",
    };

    await fs.writeFile(
      `${backupPath}.metadata.json`,
      JSON.stringify(metadata, null, 2),
    );

    // Remove original
    await fs.unlink(sourcePath);
  }

  printCleanupReport(results) {
    console.log("\n🎉 VIDEO CLEANUP COMPLETE");
    console.log("=".repeat(50));
    console.log(`🗑️  Files cleaned: ${results.cleaned}`);
    console.log(`💾 Files backed up: ${results.backed}`);
    console.log(`✅ Files kept: ${results.kept}`);
    console.log(`💾 Space saved: ${this.formatBytes(results.sizeSaved)}`);

    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`);
      results.errors.forEach((error) => {
        console.log(`  ❌ ${error.file}: ${error.error}`);
      });
    }

    if (results.backed > 0) {
      console.log(`\n💾 Backups stored in: ${this.backupDir}`);
      console.log("💡 Backups can be restored if needed");
    }
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

  formatAge(milliseconds) {
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    if (days === 0) {
      return "today";
    } else if (days === 1) {
      return "1 day old";
    } else if (days < 30) {
      return `${days} days old`;
    } else {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? "s" : ""} old`;
    }
  }

  async listBackups() {
    console.log("💾 Available video backups:");

    try {
      const files = await fs.readdir(this.backupDir);
      const videoBackups = files.filter((file) =>
        this.supportedFormats.some((ext) => file.endsWith(ext)),
      );

      if (videoBackups.length === 0) {
        console.log("  No video backups found");
        return;
      }

      for (const backup of videoBackups) {
        const metadataFile = `${backup}.metadata.json`;
        const backupPath = path.join(this.backupDir, backup);

        try {
          const stats = await fs.stat(backupPath);
          console.log(`  📹 ${backup}`);
          console.log(`     Size: ${this.formatBytes(stats.size)}`);
          console.log(`     Backed up: ${stats.ctime.toLocaleString()}`);

          // Show metadata if available
          if (files.includes(metadataFile)) {
            const metadata = JSON.parse(
              await fs.readFile(
                path.join(this.backupDir, metadataFile),
                "utf-8",
              ),
            );
            console.log(`     Original: ${metadata.originalPath}`);
            console.log(`     Reason: ${metadata.reason}`);
          }
        } catch {
          console.log(`  📹 ${backup} (metadata unavailable)`);
        }
      }
    } catch (error) {
      console.error("❌ Failed to list backups:", error.message);
    }
  }

  async restoreBackup(backupFileName) {
    console.log(`🔄 Restoring backup: ${backupFileName}`);

    const backupPath = path.join(this.backupDir, backupFileName);
    const metadataPath = `${backupPath}.metadata.json`;

    try {
      // Read metadata to get original path
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
      const originalPath = metadata.originalPath;

      // Ensure target directory exists
      await fs.mkdir(path.dirname(originalPath), { recursive: true });

      // Copy backup to original location
      await fs.copyFile(backupPath, originalPath);

      console.log(`✅ Restored: ${backupFileName} → ${originalPath}`);
      console.log("💡 Original backup file preserved");
    } catch (error) {
      console.error(`❌ Failed to restore ${backupFileName}:`, error.message);
      throw error;
    }
  }
}

// Export for use as module
export { VideoCleanup };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const cleanup = new VideoCleanup();

  try {
    if (process.argv.includes("--list-backups")) {
      await cleanup.listBackups();
    } else if (process.argv.includes("--restore")) {
      const backupFile = process.argv[process.argv.indexOf("--restore") + 1];
      if (!backupFile) {
        console.error("❌ Please specify backup file name");
        process.exit(1);
      }
      await cleanup.restoreBackup(backupFile);
    } else {
      await cleanup.cleanupHashNamedVideos();
    }
  } catch (error) {
    console.error("❌ Video cleanup failed:", error.message);
    process.exit(1);
  }
}
