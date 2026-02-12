/**
 * On-Demand File Access Tools
 *
 * Exposes file operations as LLM tools via the Vercel AI SDK `tool()` pattern.
 * These tools allow the LLM to access file content lazily — only reading
 * the specific sections, lines, or search results it needs.
 *
 * Tools:
 * - list_attached_files: List all registered files with metadata
 * - read_file_section: Read specific line range with token budget
 * - search_in_file: Search for patterns within a file
 * - get_file_preview: Get the preview/summary of a file
 * - extract_file_content: Targeted extraction for any file type (video frames,
 *     PDF pages, spreadsheet ranges, archive entries, PPTX slides)
 *
 * @module files/fileTools
 */

import { tool } from "ai";
import { z } from "zod";
import type { FileReferenceRegistry } from "./fileReferenceRegistry.js";

/**
 * Multi-part tool result content for the Vercel AI SDK.
 * Allows tool results to contain both text and images.
 */
type ToolResultContentPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType?: string };

/**
 * Create file access tools bound to a FileReferenceRegistry instance.
 *
 * These tools follow the same pattern as the existing directAgentTools
 * (getCurrentTime, readFile, etc.) in src/lib/agent/directTools.ts.
 * They use `tool()` from the Vercel AI SDK with zod parameter schemas.
 *
 * @param registry - The FileReferenceRegistry instance to bind to
 * @returns Record of tool name to tool definition
 *
 * @example
 * ```typescript
 * const registry = new FileReferenceRegistry();
 * const tools = createFileTools(registry);
 * // tools.list_attached_files, tools.read_file_section, etc.
 * ```
 */
export function createFileTools(registry: FileReferenceRegistry) {
  return {
    list_attached_files: createListAttachedFilesTool(registry),
    read_file_section: createReadFileSectionTool(registry),
    search_in_file: createSearchInFileTool(registry),
    get_file_preview: createGetFilePreviewTool(registry),
    extract_file_content: createExtractFileContentTool(registry),
  };
}

// ---------------------------------------------------------------------------
// Individual tool factory helpers
// ---------------------------------------------------------------------------

/**
 * List all files that have been attached/registered for this conversation.
 * Returns a formatted table with filename, type, size, and status.
 */
function createListAttachedFilesTool(registry: FileReferenceRegistry) {
  return tool({
    description:
      "List all files attached to this conversation with their metadata. " +
      "Shows filename, type, size, estimated tokens, and processing status. " +
      "Each file has a unique UUID 'id' field — use that ID (or the filename) " +
      "as the file_id parameter in read_file_section, search_in_file, and get_file_preview. " +
      "Always call this first to discover available files.",
    parameters: z.object({}),
    execute: async () => {
      try {
        const files = registry.list();
        if (files.length === 0) {
          return {
            success: true,
            message: "No files are attached to this conversation.",
            fileCount: 0,
          };
        }

        const fileList = files.map((f, i) => ({
          index: i + 1,
          id: f.id,
          filename: f.filename,
          type: f.detectedType,
          size: formatSize(f.sizeBytes),
          sizeBytes: f.sizeBytes,
          sizeTier: f.sizeTier,
          estimatedTokens: f.estimatedTokens,
          status: f.status,
          hasPreview: !!f.preview,
          hasSummary: !!f.summary,
          totalLines: f.totalLines ?? null,
        }));

        return {
          success: true,
          fileCount: files.length,
          files: fileList,
          formatted: registry.listFormatted(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}

/**
 * Read a specific section (line range) of an attached file.
 * Supports token budget to prevent reading too much content.
 */
function createReadFileSectionTool(registry: FileReferenceRegistry) {
  return tool({
    description:
      "Read specific lines from an attached file. Specify the file_id " +
      "(UUID from list_attached_files, or the exact filename), start line, and end line. " +
      "Uses a token budget to prevent reading too much content at once. " +
      "For large files, read in sections rather than all at once.",
    parameters: z.object({
      file_id: z
        .string()
        .describe(
          "The file ID (UUID from list_attached_files) or the exact filename",
        ),
      start_line: z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe("Starting line number (1-indexed, default: 1)"),
      end_line: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          "Ending line number (1-indexed, default: read until token budget is exhausted)",
        ),
      token_budget: z
        .number()
        .int()
        .min(100)
        .max(100_000)
        .default(10_000)
        .describe("Maximum tokens to return (default: 10000, max: 100000)"),
    }),
    execute: async ({ file_id, start_line, end_line, token_budget }) => {
      try {
        // Resolve file_id: supports both UUID and filename
        const ref = registry.getByIdOrFilename(file_id);
        if (!ref) {
          return {
            success: false,
            error: `File not found: "${file_id}". Use list_attached_files to see available file IDs.`,
          };
        }
        const resolvedId = ref.id;

        const result = await registry.readSection(
          resolvedId,
          start_line,
          end_line,
          token_budget,
        );

        return {
          success: true,
          content: result.content,
          startLine: result.startLine,
          endLine: result.endLine,
          totalLines: result.totalLines,
          truncated: result.truncated,
          estimatedTokens: result.estimatedTokens,
          guidance: result.truncated
            ? `Content was truncated at token budget (${token_budget}). ` +
              `Read from line ${result.endLine + 1} to continue.`
            : undefined,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}

/**
 * Search for a text pattern or regex within an attached file.
 * Returns matching lines with surrounding context.
 */
function createSearchInFileTool(registry: FileReferenceRegistry) {
  return tool({
    description:
      "Search for a text pattern within an attached file. " +
      "Specify file_id as the UUID from list_attached_files or the exact filename. " +
      "Supports plain text and regex patterns. Returns matching lines " +
      "with context lines before and after each match. " +
      "Use this to find specific content without reading the entire file.",
    parameters: z.object({
      file_id: z
        .string()
        .describe(
          "The file ID (UUID from list_attached_files) or the exact filename",
        ),
      pattern: z
        .string()
        .describe(
          "Text or regex pattern to search for (case-insensitive by default)",
        ),
      max_matches: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .describe("Maximum number of matches to return (default: 20)"),
    }),
    execute: async ({ file_id, pattern, max_matches }) => {
      try {
        // Resolve file_id: supports both UUID and filename
        const ref = registry.getByIdOrFilename(file_id);
        if (!ref) {
          return {
            success: false,
            error: `File not found: "${file_id}". Use list_attached_files to see available file IDs.`,
          };
        }
        const resolvedId = ref.id;

        const result = await registry.search(resolvedId, pattern, max_matches);

        const formattedMatches = result.matches.map((m) => ({
          lineNumber: m.lineNumber,
          line: m.line,
          context:
            m.contextBefore.length > 0 || m.contextAfter.length > 0
              ? {
                  before: m.contextBefore,
                  after: m.contextAfter,
                }
              : undefined,
        }));

        return {
          success: true,
          pattern,
          totalMatches: result.totalMatches,
          matchesReturned: result.matches.length,
          truncated: result.truncated,
          matches: formattedMatches,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}

/**
 * Get the preview or summary of an attached file.
 * For files that have been summarized, returns the summary.
 * Otherwise returns the initial preview.
 */
function createGetFilePreviewTool(registry: FileReferenceRegistry) {
  return tool({
    description:
      "Get the preview or summary of an attached file. " +
      "Specify file_id as the UUID from list_attached_files or the exact filename. " +
      "Returns the file's initial preview (first ~2000 chars) or its " +
      "LLM-generated summary if available. Includes file metadata.",
    parameters: z.object({
      file_id: z
        .string()
        .describe(
          "The file ID (UUID from list_attached_files) or the exact filename",
        ),
    }),
    execute: async ({ file_id }) => {
      try {
        // Resolve file_id: supports both UUID and filename
        const ref = registry.getByIdOrFilename(file_id);
        if (!ref) {
          return {
            success: false,
            error: `File not found: "${file_id}". Use list_attached_files to see available file IDs.`,
          };
        }

        // Ensure binary files are processed so preview contains real content
        // instead of placeholder metadata like "[PDF document: 4.39 MB]"
        await registry.ensureProcessed(ref.id);

        return {
          success: true,
          filename: ref.filename,
          type: ref.detectedType,
          size: formatSize(ref.sizeBytes),
          sizeBytes: ref.sizeBytes,
          sizeTier: ref.sizeTier,
          mimeType: ref.mimeType,
          estimatedTokens: ref.estimatedTokens,
          status: ref.status,
          totalLines: ref.totalLines ?? null,
          preview: ref.preview,
          summary: ref.summary ?? null,
          hasSummary: !!ref.summary,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}

/**
 * Extract targeted content from any attached file type.
 * Supports type-specific parameters for deep content access.
 */
function createExtractFileContentTool(registry: FileReferenceRegistry) {
  return tool({
    description:
      "Extract specific content from an attached file. This is the universal extraction tool " +
      "that handles all file types with type-specific parameters:\n" +
      "- VIDEO: Use start_time/end_time to get frames from a time range\n" +
      "- PDF: Use pages (e.g., [1,3,5]) or page_range to get specific pages\n" +
      "- SPREADSHEET (xlsx): Use sheet, row_range, and columns for targeted data\n" +
      "- PPTX: Use pages to get specific slides\n" +
      "- ARCHIVE (zip): Use entry_path to extract a specific file from the archive\n" +
      "- TEXT/CODE: Use page_range as line range for targeted reading\n\n" +
      "For video extraction, the result includes images (frames) that will be visible to you. " +
      "Always call list_attached_files first to discover file IDs.",
    parameters: z.object({
      file_id: z
        .string()
        .describe("File ID (UUID) or exact filename from list_attached_files"),
      // Video parameters
      start_time: z
        .number()
        .optional()
        .describe("Start timestamp in seconds (video only)"),
      end_time: z
        .number()
        .optional()
        .describe("End timestamp in seconds (video only)"),
      frame_count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe(
          "Number of frames to extract in time range (video only, default: 5, max: 20)",
        ),
      // PDF / PPTX parameters
      pages: z
        .array(z.number().int().min(1))
        .optional()
        .describe("Specific page/slide numbers to extract (1-indexed)"),
      page_range: z
        .object({
          start: z.number().int().min(1),
          end: z.number().int().min(1),
        })
        .optional()
        .describe("Page/slide range to extract (1-indexed, inclusive)"),
      // Spreadsheet parameters
      sheet: z
        .string()
        .optional()
        .describe(
          "Sheet name or 0-based index as string e.g. '0', '1' (spreadsheet only, default: first sheet)",
        ),
      row_range: z
        .object({
          start: z.number().int().min(1),
          end: z.number().int().min(1),
        })
        .optional()
        .describe("Row range (1-indexed, spreadsheet only)"),
      columns: z
        .array(z.string())
        .optional()
        .describe(
          "Specific column letters to include (e.g., ['A', 'B', 'D'], spreadsheet only)",
        ),
      // Archive parameters
      entry_path: z
        .string()
        .optional()
        .describe("File path within archive to extract (archive only)"),
      // General
      format: z
        .enum(["text", "detailed", "summary"])
        .optional()
        .describe("Output format hint (default: text)"),
    }),
    execute: async (params) => {
      try {
        // Convert sheet from string to number if it's a numeric index
        const extractParams = {
          ...params,
          sheet:
            params.sheet !== undefined
              ? /^\d+$/.test(params.sheet)
                ? parseInt(params.sheet, 10)
                : params.sheet
              : undefined,
        };
        const result = await registry.extractContent(extractParams);

        if (!result.success) {
          return {
            success: false as const,
            error: result.error,
            text: undefined as string | undefined,
            metadata: undefined as Record<string, unknown> | undefined,
            imageCount: 0,
            _images: undefined as Buffer[] | undefined,
          };
        }

        return {
          success: true as const,
          text: result.text,
          metadata: result.metadata,
          imageCount: result.images?.length ?? 0,
          // Store raw buffers for experimental_toToolResultContent to convert
          _images: result.images,
          error: undefined as string | undefined,
        };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error.message : String(error),
          text: undefined as string | undefined,
          metadata: undefined as Record<string, unknown> | undefined,
          imageCount: 0,
          _images: undefined as Buffer[] | undefined,
        };
      }
    },
    experimental_toToolResultContent: (result) => {
      const parts: ToolResultContentPart[] = [];

      // Add text content
      if (result.text) {
        parts.push({ type: "text", text: result.text });
      } else if (result.error) {
        parts.push({ type: "text", text: `Error: ${result.error}` });
      }

      // Add images as image content parts so the LLM can see them
      if (result._images && result._images.length > 0) {
        for (const img of result._images) {
          parts.push({
            type: "image",
            data: img.toString("base64"),
            mimeType: "image/jpeg",
          });
        }
      }

      // Fallback: always have at least one text part
      if (parts.length === 0) {
        parts.push({ type: "text", text: "(No content extracted)" });
      }

      return parts;
    },
  });
}

/**
 * Format byte size as human-readable string.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
