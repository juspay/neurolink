/**
 * Path Resolution Utility for CLI
 *
 * Converts relative file paths to absolute paths while preserving URLs.
 * This ensures consistent file access regardless of the current working directory.
 */

import path from "path";

/**
 * Check if a string is an internet URL, file URL, or data URI
 */
function isURL(str: string): boolean {
  const lower = str.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("file://") ||
    lower.startsWith("data:")
  );
}

/**
 * Resolve a file path to an absolute path.
 *
 * - Relative paths (./images/chart.png, ../data/report.pdf) are resolved
 *   against the current working directory
 * - Absolute paths (/home/user/file.txt, C:\\Users\\file.txt) are returned unchanged
 * - URLs (http://..., https://...) are returned unchanged
 *
 * @param filePath - The file path to resolve
 * @returns Resolved absolute path, or original URL/string
 */
export function resolveFilePath(filePath: string): string {
  // Handle empty string input
  if (!filePath) {
    return filePath;
  }

  // Normalize whitespace-only strings to empty string for consistent handling
  if (!filePath.trim()) {
    return "";
  }

  // Don't resolve URLs
  if (isURL(filePath)) {
    return filePath;
  }

  // Resolve relative/absolute paths against current working directory
  // path.resolve handles both relative and absolute paths correctly:
  // - Absolute paths are returned unchanged
  // - Relative paths are resolved against process.cwd()
  return path.resolve(process.cwd(), filePath);
}

/**
 * Resolve multiple file paths to absolute paths.
 *
 * @param filePaths - Array of file paths to resolve
 * @returns Array of resolved absolute paths (or URLs unchanged)
 */
export function resolveFilePaths(filePaths: string[]): string[] {
  return filePaths.map(resolveFilePath);
}
