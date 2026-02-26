/**
 * Docusaurus Plugin: New Docs Highlighter
 *
 * Automatically detects new/modified documentation based on Git history
 * and provides data to theme components for displaying "NEW" badges.
 *
 * Features:
 * - Detects docs added/modified since last release tag
 * - Supports custom time-based detection (e.g., last 30 days)
 * - Provides global data accessible via usePluginData hook
 * - Integrates with sidebar and doc pages
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const DEFAULT_OPTIONS = {
  // Detection mode: 'tag' | 'time' | 'both'
  mode: "both",

  // For tag-based detection: compare against this tag pattern
  // Use 'latest' to auto-detect the most recent tag
  releaseTagPattern: "v*",
  baseTag: "latest",

  // For time-based detection: docs modified within this many days
  daysThreshold: 30,

  // Docs directory relative to site root
  docsDir: "docs",

  // File extensions to track
  extensions: [".md", ".mdx"],

  // Exclude patterns (glob-like)
  exclude: ["**/node_modules/**", "**/_*.md"],

  // Include only specific paths (empty = include all)
  include: [],

  // Badge labels
  labels: {
    new: "NEW",
    updated: "UPDATED",
    recent: "RECENT",
  },

  // Enable debug logging
  debug: false,
};

function log(options, ...args) {
  if (options.debug) {
    console.log("[new-docs-plugin]", ...args);
  }
}

function execGitCommand(command, options) {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    log(options, `Git command failed: ${command}`, error.message);
    return "";
  }
}

function getLatestTag(options) {
  const { releaseTagPattern } = options;

  // Get all tags matching pattern, sorted by version
  const tagsCommand = `git tag -l "${releaseTagPattern}" --sort=-v:refname`;
  const tags = execGitCommand(tagsCommand, options);

  if (!tags) {
    log(options, "No tags found, using initial commit");
    return execGitCommand("git rev-list --max-parents=0 HEAD", options);
  }

  const latestTag = tags.split("\n")[0];
  log(options, `Latest tag: ${latestTag}`);
  return latestTag;
}

function getNewDocsSinceTag(baseRef, docsDir, options) {
  // Get files that were added since the tag
  const addedCommand = `git diff --name-only --diff-filter=A ${baseRef}..HEAD -- "${docsDir}"`;
  const addedFiles = execGitCommand(addedCommand, options);

  return addedFiles ? addedFiles.split("\n").filter(Boolean) : [];
}

function getModifiedDocsSinceTag(baseRef, docsDir, options) {
  // Get files that were modified (but not added) since the tag
  const modifiedCommand = `git diff --name-only --diff-filter=M ${baseRef}..HEAD -- "${docsDir}"`;
  const modifiedFiles = execGitCommand(modifiedCommand, options);

  return modifiedFiles ? modifiedFiles.split("\n").filter(Boolean) : [];
}

function getRecentDocs(docsDir, daysThreshold, options) {
  // Get files modified within the last N days
  const since = new Date();
  since.setDate(since.getDate() - daysThreshold);
  const sinceStr = since.toISOString().split("T")[0];

  const recentCommand = `git log --since="${sinceStr}" --name-only --pretty=format: -- "${docsDir}"`;
  const recentFiles = execGitCommand(recentCommand, options);

  if (!recentFiles) {
    return [];
  }

  // Deduplicate
  const uniqueFiles = [...new Set(recentFiles.split("\n").filter(Boolean))];
  return uniqueFiles;
}

function getFileCreationDate(filePath, options) {
  // Get the date when file was first added to git
  const command = `git log --follow --format=%aI --diff-filter=A -- "${filePath}"`;
  const result = execGitCommand(command, options);
  return result ? new Date(result.split("\n").pop()) : null;
}

function getFileLastModifiedDate(filePath, options) {
  // Get the date when file was last modified
  const command = `git log -1 --format=%aI -- "${filePath}"`;
  const result = execGitCommand(command, options);
  return result ? new Date(result) : null;
}

function getCommitInfo(filePath, options) {
  // Get commit hash and message for the last change
  const command = `git log -1 --format="%H|%s|%aI" -- "${filePath}"`;
  const result = execGitCommand(command, options);

  if (!result) {
    return null;
  }

  const [hash, message, date] = result.split("|");
  return { hash, message, date: new Date(date) };
}

function fileMatchesExtensions(filePath, extensions) {
  return extensions.some((ext) => filePath.endsWith(ext));
}

function escapeRegex(str) {
  return str.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

function globToRegex(pattern) {
  // Escape regex chars except glob wildcards, then convert globs
  let escaped = pattern
    .split("**")
    .map((part) => part.split("*").map(escapeRegex).join("[^/]*"))
    .join(".*");
  // Handle ? wildcard (matches single character)
  escaped = escaped.replace(/\?/g, ".");
  return new RegExp(escaped);
}

function fileMatchesExclude(filePath, excludePatterns) {
  return excludePatterns.some((pattern) => {
    const regex = globToRegex(pattern);
    return regex.test(filePath);
  });
}

function fileMatchesInclude(filePath, includePatterns) {
  if (!includePatterns || includePatterns.length === 0) {
    return true;
  }
  return includePatterns.some((pattern) => {
    const regex = globToRegex(pattern);
    return regex.test(filePath);
  });
}

function normalizeDocPath(filePath, docsDir) {
  // Convert file path to doc ID format
  // e.g., "docs/guides/getting-started.md" -> "guides/getting-started"
  let docPath = filePath;

  if (docPath.startsWith(docsDir + "/")) {
    docPath = docPath.slice(docsDir.length + 1);
  }

  // Remove extension
  docPath = docPath.replace(/\.(md|mdx)$/, "");

  return docPath;
}

function buildDocMetadata(filePath, docsDir, status, options) {
  const docId = normalizeDocPath(filePath, docsDir);
  const createdAt = getFileCreationDate(filePath, options);
  const modifiedAt = getFileLastModifiedDate(filePath, options);
  const commitInfo = getCommitInfo(filePath, options);

  return {
    docId,
    filePath,
    status, // 'new' | 'updated' | 'recent'
    createdAt: createdAt?.toISOString() || null,
    modifiedAt: modifiedAt?.toISOString() || null,
    commit: commitInfo
      ? {
          hash: commitInfo.hash.slice(0, 7),
          message: commitInfo.message,
          date: commitInfo.date.toISOString(),
        }
      : null,
  };
}

module.exports = function pluginNewDocs(context, opts) {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // Debug context to understand what's available
  log(options, "Context keys:", Object.keys(context));

  return {
    name: "docusaurus-plugin-new-docs",

    async loadContent() {
      log(options, "Loading content...");

      // Check if we're in a git repository
      const isGitRepo = execGitCommand(
        "git rev-parse --is-inside-work-tree",
        options,
      );
      if (isGitRepo !== "true") {
        console.warn("[new-docs-plugin] Not a git repository, skipping...");
        return {
          newDocs: [],
          updatedDocs: [],
          recentDocs: [],
          config: options,
        };
      }

      const newDocs = [];
      const updatedDocs = [];
      const recentDocs = [];

      // Tag-based detection
      if (options.mode === "tag" || options.mode === "both") {
        const baseTag =
          options.baseTag === "latest"
            ? getLatestTag(options)
            : options.baseTag;

        if (baseTag) {
          log(options, `Comparing against: ${baseTag}`);

          // Get new files
          const addedFiles = getNewDocsSinceTag(
            baseTag,
            options.docsDir,
            options,
          );
          for (const file of addedFiles) {
            if (
              fileMatchesExtensions(file, options.extensions) &&
              !fileMatchesExclude(file, options.exclude) &&
              fileMatchesInclude(file, options.include)
            ) {
              newDocs.push(
                buildDocMetadata(file, options.docsDir, "new", options),
              );
            }
          }

          // Get modified files
          const modifiedFiles = getModifiedDocsSinceTag(
            baseTag,
            options.docsDir,
            options,
          );
          for (const file of modifiedFiles) {
            if (
              fileMatchesExtensions(file, options.extensions) &&
              !fileMatchesExclude(file, options.exclude) &&
              fileMatchesInclude(file, options.include)
            ) {
              updatedDocs.push(
                buildDocMetadata(file, options.docsDir, "updated", options),
              );
            }
          }
        }
      }

      // Time-based detection
      if (options.mode === "time" || options.mode === "both") {
        const recentFiles = getRecentDocs(
          options.docsDir,
          options.daysThreshold,
          options,
        );

        for (const file of recentFiles) {
          if (
            fileMatchesExtensions(file, options.extensions) &&
            !fileMatchesExclude(file, options.exclude) &&
            fileMatchesInclude(file, options.include)
          ) {
            // Check if already in newDocs or updatedDocs
            const docId = normalizeDocPath(file, options.docsDir);
            const alreadyTracked = [...newDocs, ...updatedDocs].some(
              (d) => d.docId === docId,
            );

            if (!alreadyTracked) {
              recentDocs.push(
                buildDocMetadata(file, options.docsDir, "recent", options),
              );
            }
          }
        }
      }

      log(
        options,
        `Found ${newDocs.length} new, ${updatedDocs.length} updated, ${recentDocs.length} recent docs`,
      );

      return {
        newDocs,
        updatedDocs,
        recentDocs,
        config: options,
        baseTag:
          options.baseTag === "latest"
            ? getLatestTag(options)
            : options.baseTag,
        generatedAt: new Date().toISOString(),
      };
    },

    async contentLoaded({ content, actions }) {
      const { setGlobalData } = actions;

      // Make data available globally via usePluginData hook
      setGlobalData(content);

      // Note: We intentionally skip createData() as it requires generatedFilesDir
      // which may not be available in all environments. The setGlobalData() call
      // is sufficient for accessing data via usePluginData hook.
    },

    // Note: We don't configure webpack aliases since we use setGlobalData instead
    // of createData. Data is accessed via usePluginData('docusaurus-plugin-new-docs').
  };
};

module.exports.validateOptions = ({ options, validate }) => {
  const validModes = ["tag", "time", "both"];
  if (options.mode && !validModes.includes(options.mode)) {
    throw new Error(
      `Invalid mode: ${options.mode}. Must be one of: ${validModes.join(", ")}`,
    );
  }
  // Docusaurus requires every plugin to have an 'id' option for generatedFilesDir
  return { ...options, id: options.id ?? "default" };
};
