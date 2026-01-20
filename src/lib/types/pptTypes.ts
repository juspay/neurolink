import type { ImageWithAltText } from "./content.js";

type ThemeOption = "modern" | "corporate" | "creative" | "minimal" | "dark";

type AudienceOption = "business" | "students" | "technical" | "general";

type ToneOption = "professional" | "casual" | "educational" | "persuasive";

type OutputFormatOption = "pptx";

type AspectRatioOption = "16:9" | "4:3";

export type PPTOutputOptions = {
  /** Number of slides to generate (required, range: 5-50) */
  pages: number;
  /** Output format - only PPTX supported currently (default: "pptx") */
  format?: OutputFormatOption;
  /** Presentation theme/style (default: "modern") */
  theme?: ThemeOption;
  /** Target audience for content customization */
  audience?: AudienceOption;
  /** Presentation tone/style */
  tone?: ToneOption;
  /** Whether to generate AI images for slides (default: true) */
  includeImages?: boolean;
  /** Custom output file path (default: auto-generated in ./output/) */
  outputPath?: string;
  /** Aspect ratio for slides (default: "16:9") */
  aspectRatio?: AspectRatioOption;
  /** Path to logo image to include in slides */
  logoPath?: Buffer | string | ImageWithAltText;
};
/**
 * Result type for generated presentation content
 *
 * Returned in `GenerateResult.ppt` when presentation generation is successful.
 * Contains the file path and metadata about the generated presentation.
 *
 * @example
 * ```typescript
 * const result = await neurolink.generate({
 *   input: { text: "Introducing Our New Product" },
 *   provider: "vertex",
 *   output: { mode: "ppt", ppt: { pages: 10, theme: "modern" } }
 * });
 *
 * if (result.ppt) {
 *   console.log(`Presentation saved: ${result.ppt.filePath}`);
 *   console.log(`Total slides: ${result.ppt.totalSlides}`);
 *   console.log(`Theme: ${result.ppt.metadata?.theme}`);
 * }
 * ```
 */
export type PPTGenerationResult = {
  /** Path to the generated PPTX file */
  filePath: string;
  /** Total number of slides in the presentation */
  totalSlides: number;
  /** Output format (always "pptx" currently) */
  format: OutputFormatOption;
  /** Presentation metadata */
  metadata?: {
    /** Theme/style used */
    theme?: string;
    /** Target audience */
    audience?: string;
    /** Presentation tone */
    tone?: string;
    /** Model used for image generation */
    imageModel?: string;
    /** File size in bytes */
    fileSize?: number;
  };
};
