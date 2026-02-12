/**
 * Filename and Display Name Sanitization Utilities
 * Prevents path traversal attacks and filesystem issues
 *
 * This module provides:
 * - Filename sanitization for safe filesystem storage
 * - Display name sanitization for user-facing content
 * - Path traversal prevention
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

/**
 * Characters that are invalid in filenames on various operating systems.
 * Windows is the most restrictive, so we use its rules as the baseline.
 * Matches: < > : " / \ | ? * and control characters (ASCII 0-31)
 */
const INVALID_FILENAME_PATTERN = '[<>:"/\\\\|?*]';

/**
 * Check if a character code is a control character (0-31)
 */
function isControlChar(charCode: number): boolean {
  return charCode >= 0 && charCode <= 31;
}

/**
 * Remove control characters from a string
 */
function removeControlChars(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (!isControlChar(charCode) && charCode !== 127) {
      result += str[i];
    }
  }
  return result;
}

/**
 * Reserved filenames on Windows that cannot be used.
 */
const WINDOWS_RESERVED_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/**
 * Dangerous file extensions that should be blocked.
 */
const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".ws",
  ".wsf",
  ".wsc",
  ".wsh",
  ".msc",
  ".scr",
  ".pif",
  ".com",
  ".hta",
  ".cpl",
  ".msi",
  ".msp",
  ".jar",
]);

/**
 * Options for filename sanitization.
 */
export type SanitizeFileNameOptions = {
  /** Maximum length for the filename (default: 255) */
  maxLength?: number;
  /** Replacement character for invalid chars (default: '_') */
  replacement?: string;
  /** Whether to block dangerous extensions (default: true) */
  blockDangerousExtensions?: boolean;
  /** Whether to allow hidden files starting with dot (default: false) */
  allowHiddenFiles?: boolean;
};

/**
 * Options for display name sanitization.
 */
export type SanitizeDisplayNameOptions = {
  /** Maximum length for the name (default: 100) */
  maxLength?: number;
  /** Whether to allow unicode characters (default: true) */
  allowUnicode?: boolean;
};

/**
 * Sanitize a filename for safe filesystem storage.
 * Removes characters that are invalid on various operating systems.
 *
 * @param filename - Raw filename to sanitize
 * @param options - Sanitization options
 * @returns Safe filename
 * @throws Error if filename is empty after sanitization
 *
 * @example
 * sanitizeFileName('my:file<name>.txt');
 * // Returns: 'my_file_name_.txt'
 *
 * @example
 * sanitizeFileName('../../../etc/passwd');
 * // Returns: '______etc_passwd'
 *
 * @example
 * sanitizeFileName('malware.exe', { blockDangerousExtensions: true });
 * // Throws: Error - dangerous extension
 */
export function sanitizeFileName(
  filename: string,
  options: SanitizeFileNameOptions = {},
): string {
  const {
    maxLength = 255,
    replacement = "_",
    blockDangerousExtensions = true,
    allowHiddenFiles = false,
  } = options;

  if (!filename || typeof filename !== "string") {
    throw new Error("Filename is required and must be a string");
  }

  let sanitized = filename.trim();

  // Block path traversal attempts
  if (sanitized.includes("..")) {
    sanitized = sanitized.replace(/\.\./g, replacement + replacement);
  }

  // Remove path separators
  sanitized = sanitized.replace(/[/\\]/g, replacement);

  // Replace invalid characters and remove control characters
  sanitized = sanitized.replace(
    new RegExp(INVALID_FILENAME_PATTERN, "g"),
    replacement,
  );
  sanitized = removeControlChars(sanitized);

  // Collapse multiple replacement characters
  const escapedReplacement = replacement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  sanitized = sanitized.replace(
    new RegExp(`${escapedReplacement}+`, "g"),
    replacement,
  );

  // Collapse multiple dots
  sanitized = sanitized.replace(/\.{2,}/g, ".");

  // Handle hidden files (files starting with dot)
  if (!allowHiddenFiles && sanitized.startsWith(".")) {
    sanitized = replacement + sanitized.substring(1);
  }

  // Don't end with a dot or space (Windows limitation)
  sanitized = sanitized.replace(/[. ]+$/, "");

  // Check for Windows reserved names
  const nameWithoutExt = sanitized.split(".")[0].toUpperCase();
  if (WINDOWS_RESERVED_NAMES.has(nameWithoutExt)) {
    sanitized = replacement + sanitized;
  }

  // Check for dangerous extensions
  if (blockDangerousExtensions) {
    const lowerFilename = sanitized.toLowerCase();
    const dangerousExtArray = Array.from(DANGEROUS_EXTENSIONS);
    for (let i = 0; i < dangerousExtArray.length; i++) {
      const ext = dangerousExtArray[i];
      if (lowerFilename.endsWith(ext)) {
        throw new Error(`Filename has dangerous extension: ${ext}`);
      }
    }
  }

  // Limit length
  if (sanitized.length > maxLength) {
    // Try to preserve extension
    const lastDot = sanitized.lastIndexOf(".");
    if (lastDot > 0 && lastDot > sanitized.length - 10) {
      const ext = sanitized.substring(lastDot);
      const name = sanitized.substring(0, maxLength - ext.length);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.substring(0, maxLength);
    }
  }

  // Ensure we have a valid filename
  if (!sanitized || sanitized === replacement) {
    throw new Error("Filename is empty after sanitization");
  }

  return sanitized;
}

/**
 * Sanitize a display name for safe user-facing display.
 * Removes control characters and limits length.
 *
 * @param name - Raw display name to sanitize
 * @param options - Sanitization options
 * @returns Safe display name
 *
 * @example
 * sanitizeDisplayName('  John\x00Doe  ');
 * // Returns: 'John Doe'
 *
 * @example
 * sanitizeDisplayName('User<script>alert(1)</script>');
 * // Returns: 'User'
 */
export function sanitizeDisplayName(
  name: string,
  options: SanitizeDisplayNameOptions = {},
): string {
  const { maxLength = 100, allowUnicode = true } = options;

  if (!name || typeof name !== "string") {
    return "";
  }

  let sanitized = name;

  // Remove control characters (ASCII 0-31 and 127)
  sanitized = removeControlChars(sanitized);

  // Remove HTML tags iteratively to prevent nested tag bypass
  // e.g., "<scr<script>ipt>" after one pass becomes "<script>"
  let previousSanitized;
  do {
    previousSanitized = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  } while (sanitized !== previousSanitized);

  // If not allowing unicode, remove non-ASCII characters
  if (!allowUnicode) {
    // Keep only printable ASCII (space through tilde)
    sanitized = sanitized
      .split("")
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code >= 32 && code <= 126;
      })
      .join("");
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  return sanitized;
}

/**
 * Validate a display name strictly.
 * Only allows alphanumeric, spaces, and basic punctuation.
 *
 * @param name - Display name to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidDisplayName('John Doe'); // true
 * isValidDisplayName('John<Doe'); // false
 */
export function isValidDisplayName(name: string): boolean {
  if (!name || typeof name !== "string") {
    return false;
  }

  const trimmed = name.trim();

  // Allow: letters, numbers, spaces, periods, hyphens, underscores, apostrophes
  return /^[a-zA-Z0-9 ._'-]{1,100}$/.test(trimmed);
}

/**
 * Validate a filename strictly.
 * Only allows alphanumeric, dash, underscore, and period.
 *
 * @param filename - Filename to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidFileName('my-file.txt'); // true
 * isValidFileName('../passwd'); // false
 */
export function isValidFileName(filename: string): boolean {
  if (!filename || typeof filename !== "string") {
    return false;
  }

  const trimmed = filename.trim();

  // Block path traversal
  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\")
  ) {
    return false;
  }

  // Allow only safe characters
  if (!/^[a-zA-Z0-9._-]{1,255}$/.test(trimmed)) {
    return false;
  }

  // Block dangerous extensions
  const lowerFilename = trimmed.toLowerCase();
  const dangerousExtArray = Array.from(DANGEROUS_EXTENSIONS);
  for (let i = 0; i < dangerousExtArray.length; i++) {
    if (lowerFilename.endsWith(dangerousExtArray[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Extract and sanitize the extension from a filename.
 *
 * @param filename - Filename to extract extension from
 * @returns Lowercase extension including the dot, or empty string
 *
 * @example
 * getFileExtension('document.PDF'); // '.pdf'
 * getFileExtension('noextension'); // ''
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  const lastDot = filename.lastIndexOf(".");
  if (lastDot < 1 || lastDot === filename.length - 1) {
    return "";
  }

  const ext = filename.substring(lastDot).toLowerCase();

  // Validate extension contains only alphanumeric
  if (!/^\.[a-z0-9]+$/.test(ext)) {
    return "";
  }

  return ext;
}

/**
 * Check if a file extension is considered dangerous.
 *
 * @param extension - File extension to check (with or without leading dot)
 * @returns true if extension is dangerous
 *
 * @example
 * isDangerousExtension('.exe'); // true
 * isDangerousExtension('pdf'); // false
 */
export function isDangerousExtension(extension: string): boolean {
  if (!extension || typeof extension !== "string") {
    return false;
  }

  const normalized = extension.startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  return DANGEROUS_EXTENSIONS.has(normalized);
}

/**
 * Generate a safe filename from arbitrary input.
 * Creates a valid filename even from completely invalid input.
 *
 * @param input - Any string input
 * @param defaultName - Default name if input sanitizes to empty (default: 'file')
 * @param extension - Optional extension to append
 * @returns Safe filename
 *
 * @example
 * generateSafeFileName('My Document!@#$'); // 'My_Document_'
 * generateSafeFileName('', 'untitled', '.txt'); // 'untitled.txt'
 */
export function generateSafeFileName(
  input: string,
  defaultName = "file",
  extension?: string,
): string {
  let sanitized: string;

  try {
    sanitized = sanitizeFileName(input || defaultName, {
      blockDangerousExtensions: false,
    });
  } catch {
    sanitized = defaultName;
  }

  if (extension) {
    const normalizedExt = extension.startsWith(".")
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`;

    // Remove existing extension if present
    const lastDot = sanitized.lastIndexOf(".");
    if (lastDot > 0) {
      sanitized = sanitized.substring(0, lastDot);
    }

    sanitized += normalizedExt;
  }

  return sanitized;
}

/**
 * Get the list of dangerous file extensions.
 * Useful for validation UI or documentation.
 */
export function getDangerousExtensions(): string[] {
  return Array.from(DANGEROUS_EXTENSIONS);
}
