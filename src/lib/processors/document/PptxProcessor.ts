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

    // Collect slide entries with their slide numbers for sorting
    const slides: Array<{ slideNumber: number; xml: string }> = [];

    for (const entry of entries) {
      const match = entry.entryName.match(SLIDE_ENTRY_REGEX);
      if (match) {
        const slideNumber = parseInt(match[1], 10);
        const xmlContent = entry.getData().toString("utf-8");
        slides.push({ slideNumber, xml: xmlContent });
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
      if (texts.length > 0) {
        parts.push(`### Slide ${slide.slideNumber}`);
        parts.push(texts.join("\n"));
        parts.push(""); // blank line between slides
      }
    }

    const result = parts.join("\n").trim();
    return result || null;
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

    // Collect all slides
    const slides: Array<{ slideNumber: number; xml: string }> = [];
    for (const entry of entries) {
      const match = entry.entryName.match(SLIDE_ENTRY_REGEX);
      if (match) {
        const slideNumber = parseInt(match[1], 10);
        if (slideNumbers.includes(slideNumber)) {
          const xmlContent = entry.getData().toString("utf-8");
          slides.push({ slideNumber, xml: xmlContent });
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
