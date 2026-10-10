/**
 * LaTeX-aware Chunker
 *
 * Splits LaTeX documents based on structure (sections, environments, math).
 * Best for academic papers, scientific documents, and mathematical content.
 */

import { randomUUID } from "crypto";
import type {
  BaseChunkerConfig,
  Chunk,
  Chunker,
  ChunkerValidationResult,
  LaTeXChunkerConfig,
} from "../../types/index.js";

const BEGIN_DOCUMENT = "\\begin{document}";
const END_DOCUMENT = "\\end{document}";

/**
 * Split a LaTeX source into the text before `\begin{document}` and the body up
 * to the first `\end{document}` after it, or null when there is no such pair.
 *
 * This is what `/^([\s\S]*?)\\begin\{document\}([\s\S]*?)\\end\{document\}/`
 * returned, without its cost: with no `\end{document}` in the text, that
 * pattern rescanned to the end of the input from every `\begin{document}`,
 * so N occurrences took O(N * length). If the first `\begin{document}` has no
 * closing marker after it, a later one cannot either, so two `indexOf` calls
 * decide the match and the work is linear.
 */
function splitDocumentBody(
  text: string,
): { preamble: string; body: string } | null {
  const begin = text.indexOf(BEGIN_DOCUMENT);
  if (begin === -1) {
    return null;
  }
  const bodyStart = begin + BEGIN_DOCUMENT.length;
  const end = text.indexOf(END_DOCUMENT, bodyStart);
  if (end === -1) {
    return null;
  }
  return { preamble: text.slice(0, begin), body: text.slice(bodyStart, end) };
}

/**
 * LaTeX-aware chunker implementation
 * Splits based on LaTeX structure (sections, environments)
 */
export class LaTeXChunker implements Chunker {
  readonly strategy = "latex" as const;

  private readonly defaultSplitEnvironments = [
    "section",
    "subsection",
    "subsubsection",
    "chapter",
    "part",
  ];

  private readonly mathEnvironments = [
    "equation",
    "equation*",
    "align",
    "align*",
    "gather",
    "gather*",
    "multline",
    "multline*",
    "displaymath",
  ];

  async chunk(text: string, config?: LaTeXChunkerConfig): Promise<Chunk[]> {
    const {
      maxSize = 1000,
      overlap = 0,
      splitEnvironments = this.defaultSplitEnvironments,
      preserveMath = true,
      includePreamble = true,
      trimWhitespace = true,
      metadata = {},
    } = config || {};

    const documentId = randomUUID();
    const chunks: Chunk[] = [];

    if (!text || text.length === 0) {
      return chunks;
    }

    // Extract preamble if present
    const documentParts = splitDocumentBody(text);

    let preamble = "";
    let documentContent = text;

    if (documentParts) {
      preamble = documentParts.preamble.trim();
      documentContent = documentParts.body;

      // Add preamble as first chunk if requested
      if (includePreamble && preamble.length > 0) {
        chunks.push({
          id: randomUUID(),
          text: preamble,
          metadata: {
            documentId,
            chunkIndex: 0,
            startPosition: 0,
            endPosition: preamble.length,
            documentType: "latex",
            latexEnvironment: "preamble",
            custom: metadata,
          },
        });
      }
    }

    // Protect math environments
    let processedContent = documentContent;
    const mathBlocks: { placeholder: string; content: string }[] = [];

    if (preserveMath) {
      // Protect display math environments
      for (const env of this.mathEnvironments) {
        const envPattern = new RegExp(
          `\\\\begin\\{${env}\\}[\\s\\S]*?\\\\end\\{${env}\\}`,
          "g",
        );
        processedContent = processedContent.replace(envPattern, (match) => {
          const placeholder = `__MATH_${mathBlocks.length}__`;
          mathBlocks.push({ placeholder, content: match });
          return placeholder;
        });
      }

      // Protect inline math
      processedContent = processedContent.replace(
        /\$\$[\s\S]*?\$\$/g,
        (match) => {
          const placeholder = `__MATH_${mathBlocks.length}__`;
          mathBlocks.push({ placeholder, content: match });
          return placeholder;
        },
      );

      processedContent = processedContent.replace(/\$[^$]+\$/g, (match) => {
        const placeholder = `__MATH_${mathBlocks.length}__`;
        mathBlocks.push({ placeholder, content: match });
        return placeholder;
      });

      // Protect \[ \] math
      processedContent = processedContent.replace(
        /\\\[[\s\S]*?\\\]/g,
        (match) => {
          const placeholder = `__MATH_${mathBlocks.length}__`;
          mathBlocks.push({ placeholder, content: match });
          return placeholder;
        },
      );
    }

    // Split by sectioning commands
    const sections = this.splitBySections(processedContent, splitEnvironments);

    let chunkIndex = chunks.length;
    let currentPosition =
      includePreamble && preamble.length > 0 ? preamble.length : 0;

    for (const section of sections) {
      const { title, content, environment } = section;

      // Restore math blocks
      let restoredContent = content;
      for (const { placeholder, content: mathContent } of mathBlocks) {
        restoredContent = restoredContent.replace(placeholder, mathContent);
      }

      // Split if content is too large
      const contentChunks = this.splitContent(
        restoredContent,
        maxSize,
        overlap,
      );

      for (let i = 0; i < contentChunks.length; i++) {
        let chunkText = contentChunks[i];

        // Include section command in first chunk
        if (i === 0 && title && environment) {
          chunkText = `\\${environment}{${title}}\n${chunkText}`;
        }

        const finalText = trimWhitespace ? chunkText.trim() : chunkText;

        if (finalText.length > 0) {
          chunks.push({
            id: randomUUID(),
            text: finalText,
            metadata: {
              documentId,
              chunkIndex,
              startPosition: currentPosition,
              endPosition: currentPosition + chunkText.length,
              documentType: "latex",
              latexEnvironment: environment ?? undefined,
              header: title ?? undefined,
              custom: metadata,
            },
          });
          chunkIndex++;
        }

        currentPosition += chunkText.length;
      }
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Split LaTeX by sectioning commands
   */
  private splitBySections(
    content: string,
    splitEnvironments: string[],
  ): Array<{
    title: string | null;
    content: string;
    environment: string | null;
  }> {
    const sections: Array<{
      title: string | null;
      content: string;
      environment: string | null;
    }> = [];

    // Build pattern for sectioning commands
    const envPattern = splitEnvironments.join("|");
    const sectionPattern = new RegExp(
      `\\\\(${envPattern})\\*?\\{([^}]*)\\}`,
      "g",
    );

    let lastIndex = 0;
    let lastTitle: string | null = null;
    let lastEnvironment: string | null = null;
    let match: RegExpExecArray | null;

    // Reset regex
    sectionPattern.lastIndex = 0;

    while ((match = sectionPattern.exec(content)) !== null) {
      // Content before this section
      if (match.index > lastIndex) {
        const sectionContent = content.slice(lastIndex, match.index);
        if (sectionContent.trim()) {
          sections.push({
            title: lastTitle,
            content: sectionContent.trim(),
            environment: lastEnvironment,
          });
        }
      }

      lastEnvironment = match[1];
      lastTitle = match[2];
      lastIndex = match.index + match[0].length;
    }

    // Don't forget content after the last section
    if (lastIndex < content.length) {
      const remaining = content.slice(lastIndex);
      if (remaining.trim()) {
        sections.push({
          title: lastTitle,
          content: remaining.trim(),
          environment: lastEnvironment,
        });
      }
    }

    // If no sections found, return entire content
    if (sections.length === 0 && content.trim()) {
      sections.push({
        title: null,
        content: content.trim(),
        environment: null,
      });
    }

    return sections;
  }

  /**
   * Split content that exceeds max size
   */
  private splitContent(
    content: string,
    maxSize: number,
    overlap: number,
  ): string[] {
    const effectiveMaxSize = Math.max(maxSize, 1);
    const effectiveOverlap = Math.min(
      Math.max(overlap, 0),
      effectiveMaxSize - 1,
    );

    if (content.length <= effectiveMaxSize) {
      return [content];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + effectiveMaxSize, content.length);

      // Try to break at paragraph boundary
      if (end < content.length) {
        const searchStart = Math.max(start, end - 200);
        const searchText = content.slice(searchStart, end);

        // Look for paragraph break
        const paragraphBreak = searchText.lastIndexOf("\n\n");
        if (paragraphBreak > 0) {
          end = searchStart + paragraphBreak;
        } else {
          // Look for sentence break
          const sentenceBreak = searchText.search(/[.!?]\s+[A-Z\\]/);
          if (sentenceBreak > 0) {
            end = searchStart + sentenceBreak + 1;
          }
        }
      }

      chunks.push(content.slice(start, end));
      start = Math.max(start + 1, end - effectiveOverlap);
    }

    return chunks;
  }

  validateConfig(config: BaseChunkerConfig): ChunkerValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const latexConfig = config as LaTeXChunkerConfig;

    if (latexConfig.maxSize !== undefined && latexConfig.maxSize <= 0) {
      errors.push("maxSize must be greater than 0");
    }

    if (latexConfig.overlap !== undefined && latexConfig.overlap < 0) {
      errors.push("overlap must be non-negative");
    }

    if (
      latexConfig.overlap !== undefined &&
      latexConfig.maxSize !== undefined &&
      latexConfig.overlap >= latexConfig.maxSize
    ) {
      errors.push("overlap must be less than maxSize");
    }

    if (
      latexConfig.splitEnvironments !== undefined &&
      latexConfig.splitEnvironments.length === 0
    ) {
      warnings.push("No split environments specified, using defaults");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
