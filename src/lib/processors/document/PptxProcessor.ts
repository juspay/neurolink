/**
 * PowerPoint (PPTX) Processing Utility
 *
 * Extracts text content from PowerPoint (.pptx) files by treating them
 * as ZIP archives and parsing the slide XML files within.
 *
 * PPTX files are ZIP archives containing:
 * - ppt/slides/slide1.xml, slide2.xml, ... — slide content
 * - ppt/slideMasters/ — master slide templates
 * - ppt/slideLayouts/ — slide layout definitions
 *
 * Text is extracted from `<a:t>` elements in the slide XML files.
 * Slides are sorted by number and presented in reading order.
 *
 * Uses `adm-zip` (already a project dependency) for ZIP extraction.
 *
 * **XML-entity attacks are not applicable here.** Unlike `WordProcessor`
 * (mammoth/@xmldom/xmldom) and `ExcelProcessor` (exceljs/saxes), this
 * processor never hands slide XML to a DOM or SAX parser at all — extraction
 * is a single regex (`TEXT_ELEMENT_REGEX`, below) run over the raw decoded
 * bytes. There is no DOCTYPE/ENTITY resolution path for a payload to reach,
 * so there is nothing for a `.pptx`-specific XXE or billion-laughs test to
 * falsify; one is deliberately not written (see
 * `test/continuous-test-suite-office-security.ts`'s header).
 *
 * @module processors/document/PptxProcessor
 *
 * @example
 * ```typescript
 * import { PptxProcessor } from "./PptxProcessor.js";
 *
 * const text = await PptxProcessor.extractText(buffer);
 * if (text) {
 *   console.log("Extracted text:", text);
 * }
 * ```
 */

import AdmZip from "adm-zip";
import * as zlib from "node:zlib";

import { readZipEntryWithinLimit } from "../archive/zipEntryReader.js";
import { SIZE_LIMITS } from "../config/index.js";

/**
 * Total budget for everything read out of one presentation.
 *
 * This class is a static utility with no `BaseFileProcessor` behind it, so
 * there is no `maxSizeMB` to inherit and nothing else was bounding these
 * reads at all — not even a late check. A .pptx is a ZIP, so any entry in it
 * can declare whatever uncompressed size its author likes.
 */
const PPTX_MAX_TOTAL_BYTES = SIZE_LIMITS.DOCUMENT_MAX_MB * 1024 * 1024;

/**
 * Read entries out of one presentation, refusing once the total passes budget.
 *
 * The budget spans the call rather than each entry: a deck of two hundred
 * slides that each sit just under a per-entry limit is the obvious way around
 * one. Returns null for an absent or unreadable entry, which every call site
 * already treats as "no content here".
 */
function createBoundedEntryReader(): (
  entry: Parameters<typeof readZipEntryWithinLimit>[0] | null | undefined,
) => string | null {
  let spent = 0;
  return (entry) => {
    if (!entry) {
      return null;
    }
    const remaining = PPTX_MAX_TOTAL_BYTES - spent;
    if (remaining <= 0) {
      throw new Error(
        `PPTX content exceeds the ${SIZE_LIMITS.DOCUMENT_MAX_MB}MB limit`,
      );
    }
    const read = readZipEntryWithinLimit(entry, remaining, zlib);
    if (read.status === "too-large") {
      throw new Error(
        `PPTX content exceeds the ${SIZE_LIMITS.DOCUMENT_MAX_MB}MB limit`,
      );
    }
    if (read.status !== "ok") {
      return null;
    }
    spent += read.buffer.length;
    return read.buffer.toString("utf-8");
  };
}

/**
 * Regex to match text content within PowerPoint XML `<a:t>` elements.
 * These elements contain the actual visible text on slides.
 */
const TEXT_ELEMENT_REGEX = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;

/**
 * Regex to match slide filenames and extract slide number.
 * Matches entries like "ppt/slides/slide1.xml", "ppt/slides/slide12.xml".
 */
const SLIDE_ENTRY_REGEX = /^ppt\/slides\/slide(\d+)\.xml$/;

/**
 * A slide's per-slide relationships file, e.g.
 * "ppt/slides/_rels/slide1.xml.rels", which links the slide to its speaker
 * notes part (among other relationships).
 */
const SLIDE_RELS_NAME = (n: number) => `ppt/slides/_rels/slide${n}.xml.rels`;

/** Matches a single `<Relationship .../>` tag inside a .rels document. */
const RELATIONSHIP_TAG_REGEX = /<Relationship\b[^>]*\/?>/g;

/**
 * Static utility class for extracting text from PPTX files.
 *
 * Designed as a static class (not extending BaseFileProcessor) because
 * PPTX processing is straightforward ZIP+XML extraction and does not
 * need the full download/validate/process pipeline of BaseFileProcessor.
 */
export class PptxProcessor {
  /**
   * Extract all text content from a PPTX buffer.
   *
   * @param content - Raw PPTX file buffer
   * @returns Formatted text content with slide headers, or null if no text found
   * @throws Error if the buffer is not a valid ZIP/PPTX file
   */
  static async extractText(content: Buffer): Promise<string | null> {
    const zip = new AdmZip(content);
    const entries = zip.getEntries();
    const readEntry = createBoundedEntryReader();

    // Collect slide entries with their slide numbers for sorting
    const slides: Array<{ slideNumber: number; xml: string }> = [];

    for (const entry of entries) {
      const match = entry.entryName.match(SLIDE_ENTRY_REGEX);
      if (match) {
        const slideNumber = parseInt(match[1], 10);
        const xmlContent = readEntry(entry);
        if (xmlContent !== null) {
          slides.push({ slideNumber, xml: xmlContent });
        }
      }
    }

    // Sort slides by number (slide1, slide2, ...)
    slides.sort((a, b) => a.slideNumber - b.slideNumber);

    if (slides.length === 0) {
      return null;
    }

    const parts: string[] = [];
    parts.push(`Presentation: ${slides.length} slide(s)\n`);

    for (const slide of slides) {
      const texts = PptxProcessor.extractTextFromXml(slide.xml);
      const notes = PptxProcessor.extractNotesForSlide(
        zip,
        slide.slideNumber,
        readEntry,
      );
      // Emit a slide section when it has either body text or speaker notes.
      if (texts.length > 0 || notes) {
        parts.push(`### Slide ${slide.slideNumber}`);
        if (texts.length > 0) {
          parts.push(texts.join("\n"));
        }
        if (notes) {
          parts.push(`**Speaker notes:** ${notes}`);
        }
        parts.push(""); // blank line between slides
      }
    }

    const result = parts.join("\n").trim();
    return result || null;
  }

  /**
   * Extract the speaker notes for one slide.
   *
   * Speaker notes live in a separate `ppt/notesSlides/notesSlideN.xml` part
   * whose number is NOT tied to the slide number — the link is declared in the
   * slide's own relationships file (`ppt/slides/_rels/slideN.xml.rels`) via a
   * relationship of type `.../notesSlide`. We resolve that target, then pull the
   * `<a:t>` runs from the notes part. Returns null when the slide has no notes.
   *
   * @param zip - The opened PPTX archive
   * @param slideNumber - 1-indexed slide number
   * @returns The notes text (runs joined by a space), or null when absent
   */
  private static extractNotesForSlide(
    zip: AdmZip,
    slideNumber: number,
    readEntry: ReturnType<typeof createBoundedEntryReader>,
  ): string | null {
    const relsXml = readEntry(zip.getEntry(SLIDE_RELS_NAME(slideNumber)));
    if (relsXml === null) {
      return null;
    }

    let notesTarget: string | null = null;
    RELATIONSHIP_TAG_REGEX.lastIndex = 0;
    for (
      let match = RELATIONSHIP_TAG_REGEX.exec(relsXml);
      match !== null;
      match = RELATIONSHIP_TAG_REGEX.exec(relsXml)
    ) {
      const tag = match[0];
      if (/Type="[^"]*\/notesSlide"/.test(tag)) {
        notesTarget = tag.match(/Target="([^"]+)"/)?.[1] ?? null;
        break;
      }
    }
    if (!notesTarget) {
      return null;
    }

    // Targets are relative to the slide's folder (ppt/slides/), e.g.
    // "../notesSlides/notesSlide1.xml" → "ppt/notesSlides/notesSlide1.xml".
    const normalized = notesTarget
      .replace(/^\.\.\//, "ppt/")
      .replace(/^\/+/, "");
    const notesXml = readEntry(zip.getEntry(normalized));
    if (notesXml === null) {
      return null;
    }
    const notes = PptxProcessor.extractTextFromXml(notesXml).join(" ");
    return notes.trim() || null;
  }

  /**
   * Extract text strings from a slide XML document.
   * Finds all `<a:t>` elements and returns their text content.
   *
   * @param xml - Raw XML string from a slide file
   * @returns Array of text strings found in the slide
   */
  private static extractTextFromXml(xml: string): string[] {
    const texts: string[] = [];

    // Reset regex state for re-entrant usage
    TEXT_ELEMENT_REGEX.lastIndex = 0;

    for (
      let match = TEXT_ELEMENT_REGEX.exec(xml);
      match !== null;
      match = TEXT_ELEMENT_REGEX.exec(xml)
    ) {
      const text = match[1].trim();
      if (text) {
        texts.push(text);
      }
    }

    return texts;
  }

  // ===========================================================================
  // TARGETED EXTRACTION API
  // ===========================================================================

  /**
   * Extract text from specific slides in a PPTX file.
   *
   * Called by the `extract_file_content` tool for targeted slide access.
   *
   * @param content - Raw PPTX file buffer
   * @param slideNumbers - Array of 1-indexed slide numbers to extract
   * @returns Formatted text from the requested slides
   */
  static async extractSlides(
    content: Buffer,
    slideNumbers: number[],
  ): Promise<string> {
    const zip = new AdmZip(content);
    const entries = zip.getEntries();
    const readEntry = createBoundedEntryReader();

    // Collect all slides
    const slides: Array<{ slideNumber: number; xml: string }> = [];
    for (const entry of entries) {
      const match = entry.entryName.match(SLIDE_ENTRY_REGEX);
      if (match) {
        const slideNumber = parseInt(match[1], 10);
        if (slideNumbers.includes(slideNumber)) {
          const xmlContent = readEntry(entry);
          if (xmlContent !== null) {
            slides.push({ slideNumber, xml: xmlContent });
          }
        }
      }
    }

    slides.sort((a, b) => a.slideNumber - b.slideNumber);

    if (slides.length === 0) {
      // List total slides to help the LLM
      let totalSlides = 0;
      for (const entry of entries) {
        if (SLIDE_ENTRY_REGEX.test(entry.entryName)) {
          totalSlides++;
        }
      }
      return `Slides ${slideNumbers.join(", ")} not found. This presentation has ${totalSlides} slide(s).`;
    }

    const parts: string[] = [];
    for (const slide of slides) {
      const texts = PptxProcessor.extractTextFromXml(slide.xml);
      parts.push(`### Slide ${slide.slideNumber}`);
      if (texts.length > 0) {
        parts.push(texts.join("\n"));
      } else {
        parts.push("(No text content on this slide)");
      }
      parts.push("");
    }

    return parts.join("\n").trim();
  }
}
