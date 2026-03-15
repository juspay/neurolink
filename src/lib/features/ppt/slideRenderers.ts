/**
 * Slide Renderers
 *
 * Standalone render functions for each slide type.
 * Extracted from SlideGenerator to keep functions under 300 lines.
 *
 * @module presentation/slideRenderers
 */

import { logger } from "../../utils/logger.js";
import { getBulletOptions, getSlideTypeFormatting } from "./constants.js";
import type {
  BackgroundColors,
  BackgroundStyle,
  BulletPoint,
  BulletStyle,
  ChartSeries,
  ColumnData,
  ComparisonColumn,
  FeatureItem,
  GridPosition,
  PptxChartName,
  PptxRichTextProps,
  PptxSlide,
  PptxTableRow,
  PresentationTheme,
  ProcessStep,
  RenderContentSlideOptions,
  SlideContent,
  SlideLayout,
  SlideType,
  Statistic,
  TableRow,
  TimelineItem,
} from "./types.js";
import {
  bufferToDataUrl,
  calculateFontSize,
  createFormattedTextProps,
  hasMarkdownFormatting,
  parseMarkdownText,
  validateImageBuffer,
} from "./utils.js";

// ============================================================================
// LAYOUT POSITIONS
// ============================================================================

/**
 * Minimum gap between elements (in inches)
 */
const MIN_GAP = 0.1;

/**
 * Default text fit option for pptxgenjs
 * 'shrink' = Shrink text to fit within the container
 */
const DEFAULT_TEXT_FIT: "none" | "shrink" | "resize" = "shrink";

export const LAYOUT_POSITIONS = {
  margin: { x: 0.5, y: 0.4 },
  title: { x: 0.5, y: 0.4, w: 9, h: 0.8 },
  subtitle: { x: 0.5, y: 1.4, w: 9, h: 0.5 },
  content: { x: 0.5, y: 1.4, w: 9, h: 3.8 },
  contentFull: { x: 0.5, y: 1.4, w: 9, h: 3.8 },
  contentLeft: { x: 0.5, y: 1.4, w: 4.2, h: 3.8 },
  contentRight: { x: 5.3, y: 1.4, w: 4.2, h: 3.8 },
  imageRight: { x: 5.3, y: 1.4, w: 4.2, h: 3.8 },
  imageLeft: { x: 0.5, y: 1.4, w: 4.2, h: 3.8 },
  imageFull: { x: 0, y: 0, w: 10, h: 5.625 },
  imageCentered: { x: 2, y: 1.2, w: 6, h: 3.6 },
  columnLeft: { x: 0.5, y: 1.4, w: 4.2, h: 3.8 },
  columnRight: { x: 5.3, y: 1.4, w: 4.2, h: 3.8 },
  col1: { x: 0.5, y: 1.4, w: 2.8, h: 3.8 },
  col2: { x: 3.5, y: 1.4, w: 2.8, h: 3.8 },
  col3: { x: 6.5, y: 1.4, w: 2.8, h: 3.8 },
  chart: { x: 0.5, y: 1.4, w: 9, h: 3.8 },
  statRow: { y: 2.2, h: 2.5 },
  footer: { x: 0.5, y: 5.2, w: 9, h: 0.3 },
  logo: {
    "top-left": { x: 0.3, y: 0.2 },
    "top-right": { x: 8.5, y: 0.2 },
    "bottom-left": { x: 0.3, y: 5.0 },
    "bottom-right": { x: 8.5, y: 5.0 },
  },
  quote: { x: 1, y: 1.5, w: 8, h: 2.5 },
  quoteAuthor: { x: 1, y: 4.2, w: 8, h: 0.5 },
};

/**
 * Map legend position from SlideContent values to pptxgenjs values
 */
const LEGEND_POS_MAP: Record<string, "t" | "b" | "l" | "r"> = {
  top: "t",
  bottom: "b",
  left: "l",
  right: "r",
};

// ============================================================================
// HELPER FUNCTIONS - ENHANCED BACKGROUNDS
// ============================================================================

/** Extract theme colors for background (strips # prefix) */
function extractBackgroundColors(theme: PresentationTheme): BackgroundColors {
  return {
    primary: theme.colors.primary.replace("#", ""),
    secondary: theme.colors.secondary.replace("#", ""),
    accent: theme.colors.accent.replace("#", ""),
    background: theme.colors.background.replace("#", ""),
  };
}

/** Blue to purple diagonal gradient effect */
function addGradientBlueBackground(
  slide: PptxSlide,
  colors: BackgroundColors,
): void {
  const { primary, secondary } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: "E8F4FD" },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 6,
    h: 3,
    fill: { color: primary, transparency: 85 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    fill: { color: primary, transparency: 75 },
  });
  slide.addShape("rect", {
    x: 5,
    y: 3,
    w: 5,
    h: 2.625,
    fill: { color: secondary, transparency: 85 },
  });
  slide.addShape("rect", {
    x: 7,
    y: 4,
    w: 3,
    h: 1.625,
    fill: { color: secondary, transparency: 75 },
  });
}

/** Professional dark blue to teal gradient */
function addGradientCorporateBackground(
  slide: PptxSlide,
  colors: BackgroundColors,
): void {
  const { primary } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: "F0F9FF" },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 3,
    h: "100%",
    fill: { color: "1E3A5F", transparency: 92 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 1.5,
    h: "100%",
    fill: { color: "1E3A5F", transparency: 85 },
  });
  slide.addShape("rect", {
    x: 7,
    y: 0,
    w: 3,
    h: "100%",
    fill: { color: "2E7D32", transparency: 92 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.03,
    fill: { color: primary },
  });
}

/** Warm orange to pink gradient */
function addGradientWarmBackground(slide: PptxSlide): void {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: "FFF7ED" },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 2.5,
    fill: { color: "EA580C", transparency: 90 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 1,
    fill: { color: "EA580C", transparency: 80 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 4.5,
    w: "100%",
    h: 1.125,
    fill: { color: "DB2777", transparency: 88 },
  });
}

/** Dark theme with accent glow */
function addGradientDarkBackground(slide: PptxSlide): void {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: "0F172A" },
  });
  slide.addShape("ellipse", {
    x: -2,
    y: -1,
    w: 6,
    h: 4,
    fill: { color: "06B6D4", transparency: 85 },
  });
  slide.addShape("ellipse", {
    x: 7,
    y: 3,
    w: 5,
    h: 4,
    fill: { color: "A855F7", transparency: 85 },
  });
}

/** Very subtle professional gradient */
function addGradientSubtleBackground(
  slide: PptxSlide,
  colors: BackgroundColors,
): void {
  const { primary, secondary } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: "FAFBFC" },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 2,
    fill: { color: primary, transparency: 95 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 4,
    w: "100%",
    h: 1.625,
    fill: { color: secondary, transparency: 96 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.02,
    fill: { color: primary },
  });
}

/** Geometric shapes pattern */
function addGeometricBackground(
  slide: PptxSlide,
  colors: BackgroundColors,
): void {
  const { primary, secondary, accent, background } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: background },
  });
  slide.addShape("rtTriangle", {
    x: 6,
    y: 3,
    w: 4,
    h: 2.625,
    fill: { color: primary, transparency: 90 },
    rotate: 180,
  });
  slide.addShape("rtTriangle", {
    x: 0,
    y: 0,
    w: 2.5,
    h: 2,
    fill: { color: secondary, transparency: 92 },
  });
  slide.addShape("ellipse", {
    x: 8.5,
    y: 0.2,
    w: 1,
    h: 1,
    fill: { color: accent, transparency: 85 },
  });
  slide.addShape("ellipse", {
    x: 0.5,
    y: 4.5,
    w: 0.6,
    h: 0.6,
    fill: { color: primary, transparency: 80 },
  });
}

/** Large corner accent shapes */
function addCornerAccentBackground(
  slide: PptxSlide,
  colors: BackgroundColors,
): void {
  const { primary, secondary, background } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: background },
  });
  slide.addShape("rect", {
    x: 7,
    y: 0,
    w: 3,
    h: 1.8,
    fill: { color: primary, transparency: 88 },
  });
  slide.addShape("rect", {
    x: 8.5,
    y: 0,
    w: 1.5,
    h: 1,
    fill: { color: primary, transparency: 70 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 4,
    w: 2.5,
    h: 1.625,
    fill: { color: secondary, transparency: 88 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 4.8,
    w: 1.2,
    h: 0.825,
    fill: { color: secondary, transparency: 70 },
  });
}

/** Curved wave pattern effect */
function addWaveBackground(slide: PptxSlide, colors: BackgroundColors): void {
  const { primary, secondary, accent } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: "F8FAFC" },
  });
  slide.addShape("ellipse", {
    x: -3,
    y: 4,
    w: 8,
    h: 3,
    fill: { color: primary, transparency: 92 },
  });
  slide.addShape("ellipse", {
    x: 2,
    y: 4.5,
    w: 7,
    h: 2.5,
    fill: { color: secondary, transparency: 93 },
  });
  slide.addShape("ellipse", {
    x: 6,
    y: 4.2,
    w: 6,
    h: 3,
    fill: { color: accent, transparency: 94 },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.03,
    fill: { color: primary },
  });
}

/** Split diagonal background */
function addSplitBackground(slide: PptxSlide, colors: BackgroundColors): void {
  const { primary, secondary, background } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: background },
  });
  slide.addShape("rect", {
    x: 5,
    y: -1,
    w: 6,
    h: 8,
    fill: { color: primary, transparency: 94 },
    rotate: 15,
  });
  slide.addShape("rect", {
    x: 7,
    y: -1,
    w: 5,
    h: 8,
    fill: { color: secondary, transparency: 92 },
    rotate: 15,
  });
}

/** Simple solid with subtle accent */
function addSolidBackground(slide: PptxSlide, colors: BackgroundColors): void {
  const { primary, background } = colors;
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: background },
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.02,
    fill: { color: primary },
  });
}

/**
 * Add enhanced background with gradient or multi-color designs
 * Creates visually appealing slides with sophisticated styling
 */
export function addEnhancedBackground(
  slide: PptxSlide,
  theme: PresentationTheme,
  style: BackgroundStyle = "gradient-subtle",
): void {
  const colors = extractBackgroundColors(theme);

  switch (style) {
    case "gradient-blue":
      addGradientBlueBackground(slide, colors);
      break;
    case "gradient-corporate":
      addGradientCorporateBackground(slide, colors);
      break;
    case "gradient-warm":
      addGradientWarmBackground(slide);
      break;
    case "gradient-dark":
      addGradientDarkBackground(slide);
      break;
    case "gradient-subtle":
      addGradientSubtleBackground(slide, colors);
      break;
    case "geometric":
      addGeometricBackground(slide, colors);
      break;
    case "corner-accent":
      addCornerAccentBackground(slide, colors);
      break;
    case "wave":
      addWaveBackground(slide, colors);
      break;
    case "split":
      addSplitBackground(slide, colors);
      break;
    case "solid":
    default:
      addSolidBackground(slide, colors);
      break;
  }
}

/**
 * Add subtle colored background to slides (legacy - use addEnhancedBackground for more options)
 */
export function addColoredBackground(
  slide: PptxSlide,
  theme: PresentationTheme,
  opacity: number = 0.05,
): void {
  const primaryColor = theme.colors.primary.replace("#", "");

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: {
      color: primaryColor,
      transparency: (1 - opacity) * 100, // pptx transparency is 0-100 where 100 is fully transparent
    },
  });
}

/**
 * Add modern card-style container with border
 */
export function addCardContainer(
  slide: PptxSlide,
  pos: { x: number; y: number; w: number; h: number },
  theme: PresentationTheme,
  borderWidth: number = 2,
): void {
  // Card background with subtle border
  slide.addShape("rect", {
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    fill: {
      color: theme.colors.background.replace("#", ""),
      transparency: 0, // Fully opaque
    },
    line: {
      color: theme.colors.muted.replace("#", ""),
      width: borderWidth,
    },
  });
}

/**
 * Add accent bar for visual hierarchy
 */
export function addAccentBar(
  slide: PptxSlide,
  pos: { x: number; y: number; w: number; h: number },
  theme: PresentationTheme,
  position: "left" | "top" | "bottom" = "left",
): void {
  const barConfig = {
    left: { x: pos.x, y: pos.y, w: 0.1, h: pos.h },
    top: { x: pos.x, y: pos.y, w: pos.w, h: 0.1 },
    bottom: { x: pos.x, y: pos.y + pos.h - 0.1, w: pos.w, h: 0.1 },
  };

  slide.addShape("rect", {
    ...barConfig[position],
    fill: { color: theme.colors.primary.replace("#", "") },
  });
}

/**
 * Calculate text width in inches based on font size and character count.
 * Uses typographic metrics for Arial font family.
 *
 * @param text - The text string to measure
 * @param fontSize - Font size in points
 * @param isBold - Whether the text is bold (adds ~10% width)
 * @returns Width in inches
 */
export function calculateTextWidth(
  text: string,
  fontSize: number,
  isBold = false,
): number {
  // For proportional fonts like Arial:
  // - Average character width is approximately 0.42 * em-height for normal text
  // - 1 point = 1/72 inch, so em-height = fontSize / 72 inches
  // - Bold text is approximately 10% wider

  const emHeight = fontSize / 72; // em-height in inches
  const avgCharWidthRatio = 0.42; // Average char width as ratio of em-height (reduced for tighter fit)
  const boldMultiplier = isBold ? 1.1 : 1.0;

  const charWidth = emHeight * avgCharWidthRatio * boldMultiplier;
  return text.length * charWidth;
}

export function addTitle(
  slide: PptxSlide,
  title: string,
  theme: PresentationTheme,
  showUnderline: boolean = true,
): void {
  slide.addText(title, {
    x: LAYOUT_POSITIONS.title.x,
    y: LAYOUT_POSITIONS.title.y,
    w: LAYOUT_POSITIONS.title.w,
    h: LAYOUT_POSITIONS.title.h,
    fontSize: theme.fonts.sizes.heading,
    fontFace: theme.fonts.heading,
    color: theme.colors.text.replace("#", ""),
    bold: true,
    fit: DEFAULT_TEXT_FIT,
  });

  if (showUnderline) {
    // Calculate dynamic underline width based on actual title text and font size
    const textWidth = calculateTextWidth(
      title,
      theme.fonts.sizes.heading,
      true,
    );

    // Constrain to reasonable bounds (min 1.5", max fits within slide margins)
    const maxWidth = LAYOUT_POSITIONS.title.w; // 9 inches - same as title container
    const minWidth = 1.0;
    const calculatedWidth = Math.min(maxWidth, Math.max(minWidth, textWidth));

    slide.addShape("rect", {
      x: LAYOUT_POSITIONS.title.x,
      y: LAYOUT_POSITIONS.title.y + LAYOUT_POSITIONS.title.h + 0.1,
      w: calculatedWidth,
      h: 0.03,
      fill: { color: theme.colors.primary.replace("#", "") },
    });
  }
}

/**
 * Add individual bullet items (each as separate text element)
 * This creates cleaner spacing and no bounding box around bullets
 * Useful for column layouts and when you want more control over spacing
 */
export function addIndividualBullets(options: {
  slide: PptxSlide;
  bullets: BulletPoint[];
  startX: number;
  startY: number;
  width: number;
  theme: PresentationTheme;
  itemSpacing?: number;
}): void {
  const {
    slide,
    bullets,
    startX,
    startY,
    width,
    theme,
    itemSpacing = 0.45,
  } = options;
  if (!bullets || bullets.length === 0) {
    return;
  }

  // Ensure minimum gap between bullets
  const effectiveSpacing = Math.max(itemSpacing, MIN_GAP * 2);

  bullets.forEach((bullet, index) => {
    // Skip invalid bullets
    if (!bullet || !bullet.text) {
      return;
    }

    const isBold = bullet.bold || bullet.emphasis || false;
    const color =
      bullet.color?.replace("#", "") || theme.colors.text.replace("#", "");

    // Check if bullet text contains markdown formatting
    if (hasMarkdownFormatting(bullet.text)) {
      // Parse markdown and create rich text runs with bullet prefix
      const segments = parseMarkdownText(bullet.text);
      const textRuns = [
        {
          text: "• ",
          options: {
            fontSize: theme.fonts.sizes.body,
            fontFace: theme.fonts.body,
            color,
          },
        },
        ...createFormattedTextProps(segments, {
          fontSize: theme.fonts.sizes.body,
          fontFace: theme.fonts.body,
          color,
          baseBold: isBold,
        }),
      ];

      slide.addText(textRuns, {
        x: startX,
        y: startY + index * effectiveSpacing,
        w: width,
        h: Math.max(0.4, effectiveSpacing - MIN_GAP),
        fit: DEFAULT_TEXT_FIT,
      });
    } else {
      // No markdown - use simple text
      const bulletText = `• ${bullet.text}`;
      slide.addText(bulletText, {
        x: startX,
        y: startY + index * effectiveSpacing,
        w: width,
        h: Math.max(0.4, effectiveSpacing - MIN_GAP),
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.body,
        color,
        bold: isBold,
        fit: DEFAULT_TEXT_FIT,
      });
    }
  });
}

/**
 * Add bullets to a slide with hybrid formatting
 *
 * Priority: bullet-level > slide-level > type-defaults > theme-defaults
 *
 * @param slide - The pptxgenjs slide
 * @param bullets - Array of bullet points (normalized)
 * @param pos - Position and dimensions
 * @param theme - Presentation theme
 * @param slideType - Slide type for default formatting (optional)
 */
export function addBullets(
  slide: PptxSlide,
  bullets: BulletPoint[],
  pos: { x: number; y: number; w: number; h: number },
  theme: PresentationTheme,
  slideType: SlideType = "content",
  options?: {
    useIndividualBullets?: boolean; // Render each bullet as separate element
    itemSpacing?: number; // Spacing between individual bullets (default 0.45)
  },
): void {
  if (!bullets || bullets.length === 0) {
    return;
  }

  // Use individual bullets for cleaner spacing (no bounding box)
  if (options?.useIndividualBullets) {
    addIndividualBullets({
      slide,
      bullets,
      startX: pos.x,
      startY: pos.y,
      width: pos.w,
      theme,
      itemSpacing: options.itemSpacing ?? 0.45,
    });
    return;
  }

  // Get hardcoded defaults for this slide type
  const typeDefaults = getSlideTypeFormatting(slideType);

  // Calculate base font size based on bullet count (if not overridden)
  const calculatedFontSize = calculateFontSize(
    bullets.length,
    typeDefaults.baseFontSize || theme.fonts.sizes.body,
  );

  const textLines: PptxRichTextProps[] = [];

  bullets.forEach((bullet) => {
    // Skip invalid bullets
    if (!bullet || !bullet.text) {
      return;
    }

    // Priority: bullet-level > type-defaults
    const bulletStyle: BulletStyle =
      bullet.bulletStyle || typeDefaults.bulletStyle || "disc";
    const fontSize = bullet.fontSize || calculatedFontSize;
    const color =
      bullet.color?.replace("#", "") || theme.colors.text.replace("#", "");
    const isBold = bullet.bold ?? bullet.emphasis ?? false;

    // Get pptxgenjs bullet options based on style
    // If bullet has custom icon, use that instead of style
    let bulletOptions: { type?: "bullet" | "number"; code?: string } | boolean;
    if (bullet.icon) {
      bulletOptions = { code: bullet.icon };
    } else {
      bulletOptions = getBulletOptions(bulletStyle);
    }

    // Check if bullet text contains markdown formatting (**bold**, *italic*)
    if (hasMarkdownFormatting(bullet.text)) {
      // Parse markdown and create rich text runs
      const segments = parseMarkdownText(bullet.text);
      const textRuns = createFormattedTextProps(segments, {
        fontSize,
        fontFace: theme.fonts.body,
        color,
        baseBold: isBold,
      });

      textLines.push({
        text: textRuns,
        options: {
          bullet: bulletOptions,
          indentLevel: 0,
          paraSpaceBefore: 6,
          paraSpaceAfter: 6,
        },
      });
    } else {
      // No markdown - use simple text
      textLines.push({
        text: bullet.text,
        options: {
          bullet: bulletOptions,
          fontSize,
          fontFace: theme.fonts.body,
          color,
          bold: isBold,
          indentLevel: 0,
          paraSpaceBefore: 6, // Add space before each paragraph (in points)
          paraSpaceAfter: 6, // Add space after each paragraph (in points)
        },
      });
    }

    // Handle sub-bullets (2pt smaller than main bullet)
    if (bullet.subBullets && bullet.subBullets.length > 0) {
      bullet.subBullets.forEach((subBullet) => {
        // Check for markdown in sub-bullets too
        if (hasMarkdownFormatting(subBullet)) {
          const segments = parseMarkdownText(subBullet);
          const textRuns = createFormattedTextProps(segments, {
            fontSize: Math.max(10, fontSize - 2),
            fontFace: theme.fonts.body,
            color: theme.colors.muted.replace("#", ""),
          });

          textLines.push({
            text: textRuns,
            options: {
              bullet: true,
              indentLevel: 1,
              paraSpaceBefore: 3,
              paraSpaceAfter: 3,
            },
          });
        } else {
          textLines.push({
            text: subBullet,
            options: {
              bullet: true,
              fontSize: Math.max(10, fontSize - 2),
              fontFace: theme.fonts.body,
              color: theme.colors.muted.replace("#", ""),
              indentLevel: 1,
              paraSpaceBefore: 3,
              paraSpaceAfter: 3,
            },
          });
        }
      });
    }
  });

  slide.addText(textLines, {
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    valign: "top",
    fit: DEFAULT_TEXT_FIT,
  });
}

export function addImage(
  slide: PptxSlide,
  imageBuffer: Buffer,
  pos: { x: number; y: number; w: number; h: number },
): void {
  // Validate and get data URL
  const validation = validateImageBuffer(imageBuffer);

  if (!validation.isValid && validation.format === "") {
    logger.warn("[addImage] Invalid image buffer", { error: validation.error });
    return;
  }

  if (!validation.isValid) {
    logger.warn(
      "[addImage] Image validation warning, attempting to add anyway",
      {
        error: validation.error,
        mimeType: validation.mimeType,
      },
    );
  }

  const dataUrl = bufferToDataUrl(imageBuffer);
  if (!dataUrl) {
    logger.warn("[addImage] Failed to convert buffer to data URL");
    return;
  }

  try {
    slide.addImage({
      data: dataUrl,
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      sizing: { type: "cover", w: pos.w, h: pos.h },
    });
  } catch (error) {
    logger.error("[addImage] Failed to add image to slide", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function getPptxChartType(slideType: SlideType): PptxChartName {
  switch (slideType) {
    case "chart-bar":
      return "bar";
    case "chart-line":
      return "line";
    case "chart-pie":
      return "pie";
    case "chart-area":
      return "area";
    default:
      return "bar";
  }
}

// ============================================================================
// SLIDE RENDERERS - OPENING/CLOSING
// ============================================================================

export function renderTitleSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  const layout = content.layoutOptions || {};
  const titleOpts = layout.title || {};
  const subtitleOpts = layout.subtitle || {};
  const bgOpts = layout.background || {};

  // Background: image > custom color > theme default (white)
  const imageDataUrl = imageBuffer ? bufferToDataUrl(imageBuffer) : null;

  if (imageDataUrl) {
    slide.background = {
      data: imageDataUrl,
    };
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
      fill: { color: "000000", transparency: 40 },
    });
  } else if (
    bgOpts.color ||
    bgOpts.useThemePrimary ||
    bgOpts.useThemeSecondary
  ) {
    const bgColor = bgOpts.useThemePrimary
      ? theme.colors.primary
      : bgOpts.useThemeSecondary
        ? theme.colors.secondary
        : bgOpts.color || theme.colors.background;
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 10,
      h: 5.625,
      fill: { color: bgColor.replace("#", "") },
    });
  }

  // Determine text colors based on background
  const hasColoredBg =
    imageBuffer ||
    bgOpts.color ||
    bgOpts.useThemePrimary ||
    bgOpts.useThemeSecondary;
  const defaultTitleColor = hasColoredBg
    ? "FFFFFF"
    : theme.colors.text.replace("#", "");
  const defaultSubtitleColor = hasColoredBg
    ? "FFFFFF"
    : theme.colors.muted.replace("#", "");

  // Title
  slide.addText(title, {
    x: titleOpts.x ?? 0.5,
    y: titleOpts.y ?? 2,
    w: titleOpts.w ?? 9,
    h: titleOpts.h ?? 1.2,
    fontSize: titleOpts.fontSize ?? theme.fonts.sizes.title,
    fontFace: theme.fonts.heading,
    color: titleOpts.color?.replace("#", "") ?? defaultTitleColor,
    align: titleOpts.align ?? "center",
    bold: true,
    fit: DEFAULT_TEXT_FIT,
  });

  // Subtitle
  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: subtitleOpts.x ?? 0.5,
      y: subtitleOpts.y ?? 3.3,
      w: subtitleOpts.w ?? 9,
      h: subtitleOpts.h ?? 0.6,
      fontSize: subtitleOpts.fontSize ?? theme.fonts.sizes.subtitle,
      fontFace: theme.fonts.body,
      color: subtitleOpts.color?.replace("#", "") ?? defaultSubtitleColor,
      align: subtitleOpts.align ?? "center",
      fit: DEFAULT_TEXT_FIT,
    });
  }
}

export function renderSectionHeaderSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  const layout = content.layoutOptions || {};
  const sectionNumOpts = layout.sectionNumber || {};
  const titleOpts = layout.title || {};
  const subtitleOpts = layout.subtitle || {};
  const bgOpts = layout.background || {};

  // Apply background if specified
  if (bgOpts.color) {
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 10,
      h: 5.625,
      fill: { color: bgOpts.color.replace("#", "") },
    });
  }

  // Section number
  if (content.sectionNumber) {
    const isWatermark = sectionNumOpts.style === "watermark";
    const isSmall = sectionNumOpts.style === "small";

    slide.addText(String(content.sectionNumber).padStart(2, "0"), {
      x: sectionNumOpts.x ?? (isWatermark ? 5.5 : 0.5),
      y: sectionNumOpts.y ?? (isWatermark ? 0.5 : 1.5),
      w: isWatermark ? 5 : 2,
      h: isWatermark ? 4 : 1,
      fontSize:
        sectionNumOpts.fontSize ?? (isWatermark ? 200 : isSmall ? 32 : 72),
      fontFace: theme.fonts.heading,
      color: theme.colors.primary.replace("#", ""),
      bold: true,
      align: isWatermark ? "right" : "left",
      transparency: isWatermark ? 70 : 0,
    });
  }

  // Title
  slide.addText(title, {
    x: titleOpts.x ?? 0.5,
    y: titleOpts.y ?? 2.5,
    w: titleOpts.w ?? 9,
    h: titleOpts.h ?? 1,
    fontSize: titleOpts.fontSize ?? theme.fonts.sizes.title,
    fontFace: theme.fonts.heading,
    color: theme.colors.text.replace("#", ""),
    bold: true,
    align: titleOpts.align ?? "left",
  });

  // Subtitle (if provided)
  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: subtitleOpts.x ?? 0.5,
      y: subtitleOpts.y ?? 3.6,
      w: subtitleOpts.w ?? 8,
      h: subtitleOpts.h ?? 0.6,
      fontSize: subtitleOpts.fontSize ?? theme.fonts.sizes.subtitle,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: subtitleOpts.align ?? "left",
    });
  }
}

export function renderThankYouSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  if (imageBuffer) {
    const dataUrl = bufferToDataUrl(imageBuffer);
    if (dataUrl) {
      slide.background = {
        data: dataUrl,
      };
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
        fill: { color: "000000", transparency: 40 },
      });
    }
  }

  const textColor = imageBuffer ? "FFFFFF" : theme.colors.text.replace("#", "");

  slide.addText(title || "Thank You!", {
    x: 0.5,
    y: 1.8,
    w: 9,
    h: 1,
    fontSize: theme.fonts.sizes.title,
    fontFace: theme.fonts.heading,
    color: textColor,
    align: "center",
    bold: true,
    fit: DEFAULT_TEXT_FIT,
  });

  if (content.cta) {
    slide.addText(content.cta, {
      x: 0.5,
      y: 2.9,
      w: 9,
      h: 0.5,
      fontSize: theme.fonts.sizes.subtitle,
      fontFace: theme.fonts.body,
      color: imageBuffer ? "FFFFFF" : theme.colors.muted.replace("#", ""),
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });
  }

  if (content.contactInfo) {
    const contactLines: string[] = [];
    if (content.contactInfo.email) {
      contactLines.push(`Email: ${content.contactInfo.email}`);
    }
    if (content.contactInfo.website) {
      contactLines.push(`Web: ${content.contactInfo.website}`);
    }
    if (content.contactInfo.phone) {
      contactLines.push(`Phone: ${content.contactInfo.phone}`);
    }

    if (contactLines.length > 0) {
      slide.addText(contactLines.join("   •   "), {
        x: 0.5,
        y: 4.2,
        w: 9,
        h: 0.4,
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.body,
        color: textColor,
        align: "center",
        fit: DEFAULT_TEXT_FIT,
      });
    }

    if (
      content.contactInfo.social &&
      Array.isArray(content.contactInfo.social) &&
      content.contactInfo.social.length > 0
    ) {
      const socialText = content.contactInfo.social
        .map(
          (s: { platform?: string; handle?: string }) =>
            `${s.platform || ""}: ${s.handle || ""}`,
        )
        .join("   •   ");
      slide.addText(socialText, {
        x: 0.5,
        y: 4.7,
        w: 9,
        h: 0.3,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: imageBuffer ? "CCCCCC" : theme.colors.muted.replace("#", ""),
        align: "center",
      });
    }
  }
}

// ============================================================================
// SLIDE RENDERERS - CONTENT
// ============================================================================

export function renderContentSlide(options: RenderContentSlideOptions): void {
  const {
    slide,
    title,
    content,
    layout,
    theme,
    imageBuffer,
    slideType = "content",
  } = options;

  addTitle(slide, title, theme);

  const hasImage = imageBuffer && layout.includes("image");
  const contentPos = hasImage
    ? layout.includes("left")
      ? LAYOUT_POSITIONS.contentRight
      : LAYOUT_POSITIONS.contentLeft
    : LAYOUT_POSITIONS.contentFull;

  if (content.bullets && content.bullets.length > 0) {
    addBullets(slide, content.bullets, contentPos, theme, slideType);
  } else if (content.body) {
    slide.addText(content.body, {
      x: contentPos.x,
      y: contentPos.y,
      w: contentPos.w,
      h: contentPos.h,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.body,
      color: theme.colors.text.replace("#", ""),
      valign: "top",
    });
  }

  if (imageBuffer && hasImage) {
    const imagePos = layout.includes("left")
      ? LAYOUT_POSITIONS.imageLeft
      : LAYOUT_POSITIONS.imageRight;
    addImage(slide, imageBuffer, imagePos);
  }
}

export function renderImageSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  layout: SlideLayout,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  if (layout === "image-full-overlay" && imageBuffer) {
    const dataUrl = bufferToDataUrl(imageBuffer);
    if (dataUrl) {
      slide.background = {
        data: dataUrl,
      };
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
        fill: { color: "000000", transparency: 50 },
      });
      slide.addText(title, {
        x: 0.5,
        y: 4.2,
        w: 9,
        h: 1,
        fontSize: theme.fonts.sizes.heading,
        fontFace: theme.fonts.heading,
        color: "FFFFFF",
        bold: true,
        fit: DEFAULT_TEXT_FIT,
      });
    } else {
      // Fallback to standard layout if image is invalid
      addTitle(slide, title, theme);
    }
  } else if (layout === "image-centered" || layout === "image-full-overlay") {
    addTitle(slide, title, theme);
    if (imageBuffer) {
      addImage(slide, imageBuffer, LAYOUT_POSITIONS.imageCentered);
    } else {
      // Fallback when no image is available - show placeholder with content
      slide.addShape("rect", {
        x: 1.5,
        y: 1.8,
        w: 7,
        h: 3.5,
        fill: { color: theme.colors.muted.replace("#", ""), transparency: 90 },
        line: {
          color: theme.colors.muted.replace("#", ""),
          width: 1,
          dashType: "dash",
        },
      });
      slide.addText("📷", {
        x: 1.5,
        y: 2.8,
        w: 7,
        h: 1,
        fontSize: 48,
        align: "center",
        valign: "middle",
        fit: DEFAULT_TEXT_FIT,
      });
      slide.addText("Image not available", {
        x: 1.5,
        y: 3.8,
        w: 7,
        h: 0.5,
        fontSize: 12,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
        align: "center",
        fit: DEFAULT_TEXT_FIT,
      });
    }
    if (content.caption) {
      slide.addText(content.caption, {
        x: 0.5,
        y: 5,
        w: 9,
        h: 0.4,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
        align: "center",
        fit: DEFAULT_TEXT_FIT,
      });
    }
  } else {
    renderContentSlide({ slide, title, content, layout, theme, imageBuffer });
  }
}

// ============================================================================
// SLIDE RENDERERS - COLUMNS
// ============================================================================

// ============================================================================
// SLIDE RENDERERS - COLUMNS (Generic)
// ============================================================================

/**
 * Generic column slide renderer
 * Handles 2, 3, or more columns dynamically
 * Renders each bullet as separate element (comparison-style)
 */
export function renderColumnSlide(
  slide: PptxSlide,
  title: string,
  columns: ColumnData[],
  theme: PresentationTheme,
  options?: {
    headerY?: number;
    headerHeight?: number;
    bulletsStartY?: number;
    columnGap?: number;
    highlightFirstColumn?: boolean;
  },
): void {
  addTitle(slide, title, theme, false);

  const opts = {
    headerY: options?.headerY ?? 1.3,
    headerHeight: options?.headerHeight ?? 0.5,
    bulletsStartY: options?.bulletsStartY ?? 2.0,
    columnGap: options?.columnGap ?? 0.3,
    highlightFirstColumn: options?.highlightFirstColumn ?? true,
  };

  const numColumns = columns.length;
  if (numColumns === 0) {
    return;
  }

  // Calculate dynamic column widths
  const totalWidth = 9; // Available width (10 - 0.5 margin on each side)
  const totalGaps = (numColumns - 1) * opts.columnGap;
  const columnWidth = (totalWidth - totalGaps) / numColumns;
  const startX = 0.5;

  columns.forEach((col, index) => {
    if (!col) {
      return;
    }

    const x = startX + index * (columnWidth + opts.columnGap);
    const isPrimary = opts.highlightFirstColumn && index === 0;

    // Render header box if title exists
    if (col.title) {
      slide.addShape("roundRect", {
        x,
        y: opts.headerY,
        w: columnWidth,
        h: opts.headerHeight,
        fill: {
          color: isPrimary
            ? theme.colors.primary.replace("#", "")
            : theme.colors.muted.replace("#", ""),
        },
        rectRadius: 0.05,
      });

      // Adjust font size based on column count
      const headerFontSize =
        numColumns <= 2 ? theme.fonts.sizes.body : theme.fonts.sizes.body - 2;

      slide.addText(col.title, {
        x,
        y: opts.headerY,
        w: columnWidth,
        h: opts.headerHeight,
        fontSize: headerFontSize,
        fontFace: theme.fonts.heading,
        color: isPrimary
          ? theme.colors.textOnPrimary.replace("#", "")
          : theme.colors.text.replace("#", ""),
        align: "center",
        bold: true,
        valign: "middle",
        fit: DEFAULT_TEXT_FIT,
      });
    }

    // Render bullets individually (like comparison slide)
    if (col.bullets && col.bullets.length > 0) {
      addIndividualBullets({
        slide,
        bullets: col.bullets,
        startX: x,
        startY: opts.bulletsStartY,
        width: columnWidth,
        theme,
      });
    }
  });
}

export function renderTwoColumnSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  layout: SlideLayout,
  theme: PresentationTheme,
  imageBuffer?: Buffer,
): void {
  const columns: ColumnData[] = [];

  if (content.leftColumn) {
    columns.push(content.leftColumn);
  }
  if (content.rightColumn) {
    columns.push(content.rightColumn);
  }

  if (columns.length > 0) {
    renderColumnSlide(slide, title, columns, theme, {
      highlightFirstColumn: true,
    });
  }

  // Handle image if right column has no bullets
  if (imageBuffer && !content.rightColumn?.bullets) {
    addImage(slide, imageBuffer, LAYOUT_POSITIONS.columnRight);
  }
}

export function renderThreeColumnSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  const columns: ColumnData[] = [];

  if (content.leftColumn) {
    columns.push(content.leftColumn);
  }
  if (content.centerColumn) {
    columns.push(content.centerColumn);
  }
  if (content.rightColumn) {
    columns.push(content.rightColumn);
  }

  if (columns.length > 0) {
    renderColumnSlide(slide, title, columns, theme, {
      highlightFirstColumn: true,
    });
  }
}

// ============================================================================
// SLIDE RENDERERS - DATA VISUALIZATION
// ============================================================================

export function renderQuoteSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  slide.addText("\u201C", {
    x: 0.5,
    y: 1,
    w: 1,
    h: 1,
    fontSize: 120,
    fontFace: "Georgia",
    color: theme.colors.primary.replace("#", ""),
    fit: DEFAULT_TEXT_FIT,
  });

  if (content.quote) {
    slide.addText(content.quote, {
      x: LAYOUT_POSITIONS.quote.x,
      y: LAYOUT_POSITIONS.quote.y,
      w: LAYOUT_POSITIONS.quote.w,
      h: LAYOUT_POSITIONS.quote.h,
      fontSize: theme.fonts.sizes.heading,
      fontFace: "Georgia",
      color: theme.colors.text.replace("#", ""),
      italic: true,
      valign: "middle",
      fit: DEFAULT_TEXT_FIT,
    });
  }

  if (content.quoteAuthor) {
    let authorText = `— ${content.quoteAuthor}`;
    if (content.quoteAuthorTitle) {
      authorText += `, ${content.quoteAuthorTitle}`;
    }
    slide.addText(authorText, {
      x: LAYOUT_POSITIONS.quoteAuthor.x,
      y: LAYOUT_POSITIONS.quoteAuthor.y,
      w: LAYOUT_POSITIONS.quoteAuthor.w,
      h: LAYOUT_POSITIONS.quoteAuthor.h,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "right",
      fit: DEFAULT_TEXT_FIT,
    });
  }
}

export function renderStatisticsSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.statistics || content.statistics.length === 0) {
    return;
  }

  const stats = content.statistics.slice(0, 4);
  const statWidth = 9 / stats.length;

  stats.forEach((stat: Statistic, index: number) => {
    const x = 0.5 + index * statWidth;

    slide.addText(stat.value, {
      x,
      y: LAYOUT_POSITIONS.statRow.y,
      w: statWidth - 0.2,
      h: 1.2,
      fontSize: 48,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary.replace("#", ""),
      bold: true,
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });

    slide.addText(stat.label, {
      x,
      y: LAYOUT_POSITIONS.statRow.y + 1.3,
      w: statWidth - 0.2,
      h: 0.5,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.body,
      color: theme.colors.text.replace("#", ""),
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });

    if (stat.change || stat.trend) {
      const trendColor =
        stat.trend === "up"
          ? "22C55E"
          : stat.trend === "down"
            ? "EF4444"
            : theme.colors.muted.replace("#", "");
      // Use simple text indicators instead of Unicode arrows for better compatibility
      const trendSymbol =
        stat.trend === "up" ? "(+)" : stat.trend === "down" ? "(-)" : "";
      slide.addText(`${trendSymbol} ${stat.change || ""}`, {
        x,
        y: LAYOUT_POSITIONS.statRow.y + 1.8,
        w: statWidth - 0.2,
        h: 0.4,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: trendColor,
        align: "center",
        fit: DEFAULT_TEXT_FIT,
      });
    }
  });
}

export function renderChartSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  chartType: SlideType,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  // Validate chartData exists with valid series
  if (
    !content.chartData ||
    !content.chartData.series ||
    content.chartData.series.length === 0
  ) {
    // Add placeholder text for empty chart
    slide.addText("No chart data available", {
      x: LAYOUT_POSITIONS.chart.x,
      y: LAYOUT_POSITIONS.chart.y + 1,
      w: LAYOUT_POSITIONS.chart.w,
      h: 1,
      fontSize: 18,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });
    return;
  }

  // Filter out invalid series (must have name, labels array, and values array)
  const validSeries = content.chartData.series.filter(
    (series: ChartSeries) =>
      series.name &&
      Array.isArray(series.labels) &&
      series.labels.length > 0 &&
      Array.isArray(series.values) &&
      series.values.length > 0,
  );

  if (validSeries.length === 0) {
    slide.addText("Invalid chart data format", {
      x: LAYOUT_POSITIONS.chart.x,
      y: LAYOUT_POSITIONS.chart.y + 1,
      w: LAYOUT_POSITIONS.chart.w,
      h: 1,
      fontSize: 18,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });
    return;
  }

  const pptxChartType = getPptxChartType(chartType);
  const chartData = validSeries.map((series: ChartSeries) => ({
    name: series.name,
    labels: series.labels,
    values: series.values,
  }));

  slide.addChart(pptxChartType, chartData, {
    x: LAYOUT_POSITIONS.chart.x,
    y: LAYOUT_POSITIONS.chart.y,
    w: LAYOUT_POSITIONS.chart.w,
    h: LAYOUT_POSITIONS.chart.h,
    showTitle: !!content.chartData.title,
    title: content.chartData.title,
    showLegend: content.chartData.legendPosition !== "none",
    legendPos:
      LEGEND_POS_MAP[content.chartData.legendPosition || "bottom"] || "b",
    showValue: content.chartData.showLabels,
    chartColors: [
      theme.colors.primary.replace("#", ""),
      theme.colors.secondary.replace("#", ""),
      theme.colors.accent.replace("#", ""),
    ],
  });
}

export function renderTableSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.tableData) {
    return;
  }

  const { headers, rows, hasHeader } = content.tableData;
  const tableRows: PptxTableRow[] = [];

  if (hasHeader && headers) {
    tableRows.push(
      headers.map((header) => ({
        text: header,
        options: {
          bold: true,
          fill: { color: theme.colors.primary.replace("#", "") },
          color: theme.colors.textOnPrimary.replace("#", ""),
          align: "center" as const,
        },
      })),
    );
  }

  rows.forEach((row: TableRow, rowIndex: number) => {
    tableRows.push(
      row.map((cell) => ({
        text: cell.text,
        options: {
          fill: { color: rowIndex % 2 === 0 ? "F8FAFC" : "FFFFFF" },
          color: theme.colors.text.replace("#", ""),
          align: (cell.align || "left") as "left" | "center" | "right",
        },
      })),
    );
  });

  slide.addTable(tableRows, {
    x: LAYOUT_POSITIONS.chart.x,
    y: LAYOUT_POSITIONS.chart.y,
    w: LAYOUT_POSITIONS.chart.w,
    colW: Array(headers?.length || rows[0]?.length || 1).fill(
      LAYOUT_POSITIONS.chart.w / (headers?.length || rows[0]?.length || 1),
    ),
    fontSize: theme.fonts.sizes.body - 2,
    fontFace: theme.fonts.body,
    border: { pt: 0.5, color: "E2E8F0" },
    autoPage: true,
  });

  if (content.tableData.caption) {
    slide.addText(content.tableData.caption, {
      x: 0.5,
      y: 5.1,
      w: 9,
      h: 0.3,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
    });
  }
}

// ============================================================================
// SLIDE RENDERERS - PROCESS & TIMELINE
// ============================================================================

export function renderTimelineSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.timeline?.items) {
    return;
  }

  const items = content.timeline.items.slice(0, 5);
  const isHorizontal = content.timeline.orientation !== "vertical";

  if (isHorizontal) {
    renderHorizontalTimeline(slide, items, theme);
  } else {
    renderVerticalTimeline(slide, items, theme);
  }
}

function renderHorizontalTimeline(
  slide: PptxSlide,
  items: TimelineItem[],
  theme: PresentationTheme,
): void {
  const itemWidth = 8 / items.length;
  const lineY = 2.8;

  slide.addShape("rect", {
    x: 1,
    y: lineY,
    w: 8,
    h: 0.02,
    fill: { color: theme.colors.primary.replace("#", "") },
  });

  items.forEach((item: TimelineItem, index: number) => {
    const x = 1 + index * itemWidth + itemWidth / 2 - 0.15;

    slide.addShape("ellipse", {
      x,
      y: lineY - 0.15,
      w: 0.3,
      h: 0.3,
      fill: { color: theme.colors.primary.replace("#", "") },
    });

    slide.addText(item.date, {
      x: x - itemWidth / 2 + 0.15,
      y: lineY - 0.8,
      w: itemWidth,
      h: 0.4,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.primary.replace("#", ""),
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    slide.addText(item.title, {
      x: x - itemWidth / 2 + 0.15,
      y: lineY + 0.4,
      w: itemWidth,
      h: 0.4,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.text.replace("#", ""),
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    if (item.description) {
      slide.addText(item.description, {
        x: x - itemWidth / 2 + 0.15,
        y: lineY + 0.85,
        w: itemWidth,
        h: 0.8,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
        align: "center",
        fit: DEFAULT_TEXT_FIT,
      });
    }
  });
}

function renderVerticalTimeline(
  slide: PptxSlide,
  items: TimelineItem[],
  theme: PresentationTheme,
): void {
  const itemHeight = 3 / items.length;
  const lineX = 1.5;

  slide.addShape("rect", {
    x: lineX,
    y: 1.5,
    w: 0.04,
    h: 3.5,
    fill: { color: theme.colors.primary.replace("#", "") },
  });

  items.forEach((item: TimelineItem, index: number) => {
    const y = 1.7 + index * itemHeight;

    slide.addShape("ellipse", {
      x: lineX - 0.12,
      y,
      w: 0.28,
      h: 0.28,
      fill: { color: theme.colors.primary.replace("#", "") },
    });

    slide.addText(item.date, {
      x: 0.3,
      y: y - 0.1,
      w: 1,
      h: 0.3,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.primary.replace("#", ""),
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    slide.addText(item.title, {
      x: 2,
      y: y - 0.1,
      w: 7,
      h: 0.4,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.text.replace("#", ""),
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    if (item.description) {
      slide.addText(item.description, {
        x: 2,
        y: y + 0.3,
        w: 7,
        h: 0.4,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.muted.replace("#", ""),
        fit: DEFAULT_TEXT_FIT,
      });
    }
  });
}

export function renderProcessFlowSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.processSteps) {
    return;
  }

  const steps = content.processSteps.slice(0, 5);
  const stepWidth = 8 / steps.length;

  steps.forEach((step: ProcessStep, index: number) => {
    const x = 1 + index * stepWidth;
    const boxWidth = stepWidth - 0.4;

    slide.addShape("roundRect", {
      x,
      y: 2,
      w: boxWidth,
      h: 2,
      fill: { color: theme.colors.primary.replace("#", "") },
      rectRadius: 0.1,
    });

    slide.addText(String(step.step), {
      x,
      y: 2.1,
      w: boxWidth,
      h: 0.5,
      fontSize: 24,
      fontFace: theme.fonts.heading,
      color: theme.colors.textOnPrimary.replace("#", ""),
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    slide.addText(step.title, {
      x,
      y: 2.6,
      w: boxWidth,
      h: 0.5,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.textOnPrimary.replace("#", ""),
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    if (step.description) {
      slide.addText(step.description, {
        x,
        y: 3.2,
        w: boxWidth,
        h: 0.7,
        fontSize: theme.fonts.sizes.caption,
        fontFace: theme.fonts.body,
        color: theme.colors.textOnPrimary.replace("#", ""),
        align: "center",
        fit: DEFAULT_TEXT_FIT,
      });
    }

    if (index < steps.length - 1) {
      // Use rightArrow shape for better visibility
      slide.addShape("rightArrow", {
        x: x + boxWidth + 0.02,
        y: 2.85,
        w: 0.35,
        h: 0.3,
        fill: { color: theme.colors.primary.replace("#", "") },
      });
    }
  });
}

// ============================================================================
// SLIDE RENDERERS - COMPARISON & FEATURES
// ============================================================================

export function renderComparisonSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme, false);

  if (!content.comparison?.columns) {
    return;
  }

  const columns = content.comparison.columns.slice(0, 2);
  const columnWidth = 4.2;

  // Calculate available height for bullet items (from y=2.0 to y=5.0 = 3.0 inches)
  const contentStartY = 2.0;
  const contentEndY = 5.0;
  const availableHeight = contentEndY - contentStartY;

  // Find max items across columns to calculate consistent spacing
  const maxItems = Math.max(
    ...columns.map((col) => Math.min(col.items?.length || 0, 6)),
  );

  // Calculate item height with minimum gap (at least 0.1 inch gap between items)
  const itemHeight =
    maxItems > 0
      ? Math.min(0.7, (availableHeight - MIN_GAP * maxItems) / maxItems)
      : 0.5;
  const effectiveSpacing = itemHeight + MIN_GAP;

  columns.forEach((col: ComparisonColumn, index: number) => {
    const x = 0.5 + index * 4.8;

    slide.addShape("roundRect", {
      x,
      y: 1.4,
      w: columnWidth,
      h: 0.5,
      fill: {
        color: col.highlight
          ? theme.colors.primary.replace("#", "")
          : theme.colors.muted.replace("#", ""),
      },
      rectRadius: 0.05,
    });

    slide.addText(col.title, {
      x,
      y: 1.4,
      w: columnWidth,
      h: 0.5,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: col.highlight
        ? theme.colors.textOnPrimary.replace("#", "")
        : theme.colors.text.replace("#", ""),
      align: "center",
      bold: true,
      valign: "middle",
      fit: DEFAULT_TEXT_FIT,
    });

    // Limit items to prevent overflow (max 6 items)
    const items = (col.items || []).slice(0, 6);

    // Calculate font size based on item count (smaller font for more items)
    const fontSize =
      items.length > 4
        ? Math.max(12, theme.fonts.sizes.body - 2)
        : theme.fonts.sizes.body;

    items.forEach((item, itemIndex) => {
      // Check for markdown formatting
      if (hasMarkdownFormatting(item)) {
        const segments = parseMarkdownText(item);
        const textRuns = [
          {
            text: "• ",
            options: {
              fontSize,
              fontFace: theme.fonts.body,
              color: theme.colors.text.replace("#", ""),
            },
          },
          ...createFormattedTextProps(segments, {
            fontSize,
            fontFace: theme.fonts.body,
            color: theme.colors.text.replace("#", ""),
          }),
        ];

        slide.addText(textRuns, {
          x: x + 0.2,
          y: contentStartY + itemIndex * effectiveSpacing,
          w: columnWidth - 0.4,
          h: itemHeight,
          valign: "top",
          fit: DEFAULT_TEXT_FIT,
        });
      } else {
        slide.addText(`• ${item}`, {
          x: x + 0.2,
          y: contentStartY + itemIndex * effectiveSpacing,
          w: columnWidth - 0.4,
          h: itemHeight,
          fontSize,
          fontFace: theme.fonts.body,
          color: theme.colors.text.replace("#", ""),
          valign: "top",
          fit: DEFAULT_TEXT_FIT,
        });
      }
    });
  });
}

export function renderFeaturesSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  const rawFeatures = content.features || [];
  const rawIcons = content.icons || [];

  const normalizedFeatures: FeatureItem[] =
    rawFeatures.length > 0
      ? rawFeatures
      : rawIcons.map((icon) => ({
          title: icon.label,
          description: icon.description || "",
          icon: icon.icon,
        }));

  if (normalizedFeatures.length === 0) {
    return;
  }

  const itemsPerRow = Math.min(normalizedFeatures.length, 3);
  const itemWidth = 9 / itemsPerRow;

  normalizedFeatures
    .slice(0, 6)
    .forEach((feature: FeatureItem, index: number) => {
      const row = Math.floor(index / itemsPerRow);
      const col = index % itemsPerRow;
      const x = 0.5 + col * itemWidth;
      const y = 1.6 + row * 1.8;

      if (feature.icon) {
        const codePoint = parseInt(feature.icon, 16);
        if (
          !Number.isNaN(codePoint) &&
          codePoint >= 0 &&
          codePoint <= 0x10ffff
        ) {
          const iconChar = String.fromCodePoint(codePoint);
          slide.addText(iconChar, {
            x,
            y,
            w: itemWidth - 0.2,
            h: 0.6,
            fontSize: 36,
            fontFace: "Segoe UI Emoji",
            color: theme.colors.primary.replace("#", ""),
            align: "center",
            fit: DEFAULT_TEXT_FIT,
          });
        }
      }

      slide.addText(feature.title, {
        x,
        y: y + 0.6,
        w: itemWidth - 0.2,
        h: 0.4,
        fontSize: theme.fonts.sizes.body,
        fontFace: theme.fonts.heading,
        color: theme.colors.text.replace("#", ""),
        align: "center",
        bold: true,
        fit: DEFAULT_TEXT_FIT,
      });

      if (feature.description) {
        slide.addText(feature.description, {
          x,
          y: y + 1,
          w: itemWidth - 0.2,
          h: 0.6,
          fontSize: theme.fonts.sizes.caption,
          fontFace: theme.fonts.body,
          color: theme.colors.muted.replace("#", ""),
          align: "center",
          fit: DEFAULT_TEXT_FIT,
        });
      }
    });
}

export function renderTeamSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (!content.teamMembers) {
    return;
  }

  const members = content.teamMembers.slice(0, 4);
  const memberWidth = 9 / members.length;

  members.forEach((member, index) => {
    const x = 0.5 + index * memberWidth;

    slide.addShape("ellipse", {
      x: x + (memberWidth - 1.5) / 2,
      y: 1.6,
      w: 1.5,
      h: 1.5,
      fill: { color: theme.colors.muted.replace("#", "") },
    });

    const initials = member.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
    slide.addText(initials, {
      x: x + (memberWidth - 1.5) / 2,
      y: 2,
      w: 1.5,
      h: 0.7,
      fontSize: 28,
      fontFace: theme.fonts.heading,
      color: "FFFFFF",
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    slide.addText(member.name, {
      x,
      y: 3.3,
      w: memberWidth - 0.2,
      h: 0.4,
      fontSize: theme.fonts.sizes.body,
      fontFace: theme.fonts.heading,
      color: theme.colors.text.replace("#", ""),
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });

    slide.addText(member.role, {
      x,
      y: 3.7,
      w: memberWidth - 0.2,
      h: 0.3,
      fontSize: theme.fonts.sizes.caption,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });
  });
}

export function renderConclusionSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme);

  if (content.bullets) {
    const checkmarkBullets = content.bullets.map((bullet) => ({
      ...bullet,
      icon: bullet.icon || "2713",
    }));
    addBullets(
      slide,
      checkmarkBullets,
      LAYOUT_POSITIONS.contentFull,
      theme,
      "conclusion",
    );
  }

  if (content.cta) {
    slide.addText(content.cta, {
      x: 0.5,
      y: 4.6,
      w: 9,
      h: 0.5,
      fontSize: theme.fonts.sizes.heading - 4,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary.replace("#", ""),
      align: "center",
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });
  }
}

// ============================================================================
// COMPOSITE/DASHBOARD SLIDE RENDERERS
// Mixed content types on a single slide
// ============================================================================

/**
 * Predefined grid layouts for composite slides
 */
export const COMPOSITE_LAYOUTS = {
  // Two halves side by side
  "left-right": [
    { x: 0.5, y: 1.4, w: 4.3, h: 3.6 },
    { x: 5.2, y: 1.4, w: 4.3, h: 3.6 },
  ],
  // Top and bottom
  "top-bottom": [
    { x: 0.5, y: 1.2, w: 9, h: 1.8 },
    { x: 0.5, y: 3.2, w: 9, h: 2.0 },
  ],
  // Three columns
  "three-cols": [
    { x: 0.5, y: 1.4, w: 2.8, h: 3.6 },
    { x: 3.5, y: 1.4, w: 2.8, h: 3.6 },
    { x: 6.5, y: 1.4, w: 2.8, h: 3.6 },
  ],
  // Four quadrants
  quadrants: [
    { x: 0.5, y: 1.2, w: 4.3, h: 1.8 },
    { x: 5.2, y: 1.2, w: 4.3, h: 1.8 },
    { x: 0.5, y: 3.2, w: 4.3, h: 1.8 },
    { x: 5.2, y: 3.2, w: 4.3, h: 1.8 },
  ],
  // Five boxes (2 on top, 3 on bottom)
  "five-boxes": [
    { x: 0.5, y: 1.2, w: 4.3, h: 1.6 },
    { x: 5.2, y: 1.2, w: 4.3, h: 1.6 },
    { x: 0.5, y: 3.0, w: 2.8, h: 2.0 },
    { x: 3.5, y: 3.0, w: 2.8, h: 2.0 },
    { x: 6.5, y: 3.0, w: 2.8, h: 2.0 },
  ],
  // Six boxes (2x3 grid)
  "six-boxes": [
    { x: 0.5, y: 1.2, w: 2.8, h: 1.6 },
    { x: 3.5, y: 1.2, w: 2.8, h: 1.6 },
    { x: 6.5, y: 1.2, w: 2.8, h: 1.6 },
    { x: 0.5, y: 3.0, w: 2.8, h: 1.8 },
    { x: 3.5, y: 3.0, w: 2.8, h: 1.8 },
    { x: 6.5, y: 3.0, w: 2.8, h: 1.8 },
  ],
  // Main content left, sidebar right
  "main-sidebar": [
    { x: 0.5, y: 1.4, w: 5.8, h: 3.6 },
    { x: 6.5, y: 1.4, w: 3.0, h: 3.6 },
  ],
  // Wide top, three boxes bottom
  "top-three": [
    { x: 0.5, y: 1.2, w: 9, h: 1.6 },
    { x: 0.5, y: 3.0, w: 2.8, h: 2.0 },
    { x: 3.5, y: 3.0, w: 2.8, h: 2.0 },
    { x: 6.5, y: 3.0, w: 2.8, h: 2.0 },
  ],
};

/**
 * Render a content box with background
 */
function renderContentBox(
  slide: PptxSlide,
  pos: GridPosition,
  title: string | undefined,
  theme: PresentationTheme,
  isPrimary: boolean = false,
): { contentY: number; contentH: number } {
  // Add background box
  slide.addShape("roundRect", {
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    fill: {
      color: isPrimary
        ? theme.colors.primary.replace("#", "") + "15"
        : "F8F9FA",
    },
    line: {
      color: isPrimary ? theme.colors.primary.replace("#", "") : "E5E7EB",
      width: 1,
    },
    rectRadius: 0.1,
  });

  let contentY = pos.y + 0.15;
  let contentH = pos.h - 0.3;

  // Add title if provided
  if (title) {
    slide.addText(title, {
      x: pos.x + 0.15,
      y: pos.y + 0.1,
      w: pos.w - 0.3,
      h: 0.35,
      fontSize: 14,
      fontFace: theme.fonts.heading,
      color: isPrimary
        ? theme.colors.primary.replace("#", "")
        : theme.colors.text.replace("#", ""),
      bold: true,
      fit: DEFAULT_TEXT_FIT,
    });
    contentY = pos.y + 0.45;
    contentH = pos.h - 0.55;
  }

  return { contentY, contentH };
}

/**
 * Render bullets in a zone
 */
function renderBulletsInZone(
  slide: PptxSlide,
  bullets: BulletPoint[],
  pos: GridPosition,
  theme: PresentationTheme,
  contentY: number,
  contentH: number,
): void {
  if (!bullets || bullets.length === 0) {
    return;
  }

  const fontSize = Math.max(11, Math.min(14, 16 - bullets.length));
  const color = theme.colors.text.replace("#", "");

  bullets.forEach((bullet, idx) => {
    // Skip invalid bullets
    if (!bullet || !bullet.text) {
      return;
    }

    const bulletY = contentY + idx * (contentH / bullets.length);

    // Check if bullet text contains markdown formatting
    if (hasMarkdownFormatting(bullet.text)) {
      const segments = parseMarkdownText(bullet.text);
      const textRuns = [
        {
          text: "• ",
          options: { fontSize, fontFace: theme.fonts.body, color },
        },
        ...createFormattedTextProps(segments, {
          fontSize,
          fontFace: theme.fonts.body,
          color,
        }),
      ];

      slide.addText(textRuns, {
        x: pos.x + 0.15,
        y: bulletY,
        w: pos.w - 0.3,
        h: contentH / bullets.length,
        valign: "top",
        fit: DEFAULT_TEXT_FIT,
      });
    } else {
      slide.addText(`• ${bullet.text}`, {
        x: pos.x + 0.15,
        y: bulletY,
        w: pos.w - 0.3,
        h: contentH / bullets.length,
        fontSize,
        fontFace: theme.fonts.body,
        color,
        valign: "top",
        fit: DEFAULT_TEXT_FIT,
      });
    }
  });
}

/**
 * Render mini stat in a zone
 */
function renderStatInZone(
  slide: PptxSlide,
  stat: Statistic,
  pos: GridPosition,
  theme: PresentationTheme,
  contentY: number,
  contentH: number,
): void {
  // Value
  slide.addText(stat.value, {
    x: pos.x,
    y: contentY,
    w: pos.w,
    h: contentH * 0.6,
    fontSize: Math.min(32, pos.w * 8),
    fontFace: theme.fonts.heading,
    color: theme.colors.primary.replace("#", ""),
    bold: true,
    align: "center",
    valign: "bottom",
    fit: DEFAULT_TEXT_FIT,
  });

  // Label
  slide.addText(stat.label, {
    x: pos.x,
    y: contentY + contentH * 0.6,
    w: pos.w,
    h: contentH * 0.4,
    fontSize: 11,
    fontFace: theme.fonts.body,
    color: theme.colors.muted.replace("#", ""),
    align: "center",
    valign: "top",
    fit: DEFAULT_TEXT_FIT,
  });
}

/**
 * Render icon box in a zone
 */
function renderIconBoxInZone(options: {
  slide: PptxSlide;
  icon: string;
  label: string;
  description: string | undefined;
  pos: GridPosition;
  theme: PresentationTheme;
  contentY: number;
  contentH: number;
}): void {
  const { slide, icon, label, description, pos, theme, contentY, contentH } =
    options;
  // Icon circle
  const iconSize = Math.min(0.6, pos.w * 0.2);
  slide.addShape("ellipse", {
    x: pos.x + (pos.w - iconSize) / 2,
    y: contentY,
    w: iconSize,
    h: iconSize,
    fill: { color: theme.colors.primary.replace("#", "") },
  });

  // Icon text (Unicode)
  const codePoint = parseInt(icon, 16);
  if (Number.isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    logger.warn("[renderIconBoxInZone] Invalid icon code", { icon });
    return;
  }
  const iconChar = String.fromCodePoint(codePoint);
  slide.addText(iconChar, {
    x: pos.x + (pos.w - iconSize) / 2,
    y: contentY,
    w: iconSize,
    h: iconSize,
    fontSize: 16,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    fit: DEFAULT_TEXT_FIT,
  });

  // Label
  slide.addText(label, {
    x: pos.x,
    y: contentY + iconSize + 0.1,
    w: pos.w,
    h: 0.3,
    fontSize: 12,
    fontFace: theme.fonts.heading,
    color: theme.colors.text.replace("#", ""),
    bold: true,
    align: "center",
    fit: DEFAULT_TEXT_FIT,
  });

  // Description
  if (description) {
    slide.addText(description, {
      x: pos.x + 0.1,
      y: contentY + iconSize + 0.4,
      w: pos.w - 0.2,
      h: contentH - iconSize - 0.5,
      fontSize: 10,
      fontFace: theme.fonts.body,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
      fit: DEFAULT_TEXT_FIT,
    });
  }
}

/**
 * Render a mini chart in a zone
 */
function renderMiniChartInZone(
  slide: PptxSlide,
  chartData: { type: string; series: ChartSeries[] },
  pos: GridPosition,
  theme: PresentationTheme,
  contentY: number,
  contentH: number,
): void {
  const chartType =
    chartData.type === "pie"
      ? "pie"
      : chartData.type === "line"
        ? "line"
        : "bar";

  const series = chartData.series || [];
  if (series.length === 0) {
    return;
  }

  const chartDataForPptx = series.map((s) => ({
    name: s.name || "Data",
    labels: s.labels || [],
    values: s.values || [],
  }));

  try {
    slide.addChart(chartType as PptxChartName, chartDataForPptx, {
      x: pos.x + 0.1,
      y: contentY,
      w: pos.w - 0.2,
      h: contentH,
      showLegend: false,
      showTitle: false,
      chartColors: [
        theme.colors.primary.replace("#", ""),
        theme.colors.secondary.replace("#", ""),
        theme.colors.accent.replace("#", ""),
        theme.colors.muted.replace("#", ""),
      ],
    });
  } catch {
    // Fallback: show placeholder
    slide.addText("Chart", {
      x: pos.x,
      y: contentY,
      w: pos.w,
      h: contentH,
      fontSize: 14,
      color: theme.colors.muted.replace("#", ""),
      align: "center",
      valign: "middle",
      fit: DEFAULT_TEXT_FIT,
    });
  }
}

/**
 * Render a composite/dashboard slide with multiple content zones
 *
 * @example
 * // Left: bullets, Right: chart
 * renderDashboardSlide(slide, "Overview", {
 *   layout: "left-right",
 *   zones: [
 *     { type: "bullets", title: "Key Points", data: bullets },
 *     { type: "chart", title: "Trend", data: chartData }
 *   ]
 * }, theme);
 */
export function renderDashboardSlide(
  slide: PptxSlide,
  title: string,
  content: {
    layout: keyof typeof COMPOSITE_LAYOUTS;
    zones: Array<{
      type: "bullets" | "chart" | "stats" | "icon-box" | "text-box";
      title?: string;
      data?: unknown;
      isPrimary?: boolean;
    }>;
  },
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme, false);

  const layoutPositions =
    COMPOSITE_LAYOUTS[content.layout] || COMPOSITE_LAYOUTS["left-right"];
  const zones = content.zones || [];

  zones.forEach((zone, idx) => {
    if (idx >= layoutPositions.length) {
      return;
    }

    const pos = layoutPositions[idx];
    const { contentY, contentH } = renderContentBox(
      slide,
      pos,
      zone.title,
      theme,
      zone.isPrimary,
    );

    switch (zone.type) {
      case "bullets":
        if (Array.isArray(zone.data)) {
          renderBulletsInZone(
            slide,
            zone.data as BulletPoint[],
            pos,
            theme,
            contentY,
            contentH,
          );
        }
        break;

      case "stats":
        if (zone.data && typeof zone.data === "object") {
          renderStatInZone(
            slide,
            zone.data as Statistic,
            pos,
            theme,
            contentY,
            contentH,
          );
        }
        break;

      case "icon-box":
        if (zone.data && typeof zone.data === "object") {
          const iconData = zone.data as {
            icon: string;
            label: string;
            description?: string;
          };
          renderIconBoxInZone({
            slide,
            icon: iconData.icon,
            label: iconData.label,
            description: iconData.description,
            pos,
            theme,
            contentY,
            contentH,
          });
        }
        break;

      case "chart":
        if (zone.data && typeof zone.data === "object") {
          renderMiniChartInZone(
            slide,
            zone.data as { type: string; series: ChartSeries[] },
            pos,
            theme,
            contentY,
            contentH,
          );
        }
        break;

      case "text-box":
        if (typeof zone.data === "string") {
          slide.addText(zone.data, {
            x: pos.x + 0.15,
            y: contentY,
            w: pos.w - 0.3,
            h: contentH,
            fontSize: 12,
            fontFace: theme.fonts.body,
            color: theme.colors.text.replace("#", ""),
            valign: "top",
          });
        }
        break;
    }
  });
}

/**
 * Render a mixed content slide with left bullets and right chart
 * Common pattern: explanation on left, visualization on right
 */
export function renderMixedContentSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme, false);

  // Left side: bullets or text
  if (content.bullets && content.bullets.length > 0) {
    const leftPos = COMPOSITE_LAYOUTS["left-right"][0];
    const { contentY, contentH } = renderContentBox(
      slide,
      leftPos,
      content.leftColumn?.title,
      theme,
      true,
    );
    renderBulletsInZone(
      slide,
      content.bullets,
      leftPos,
      theme,
      contentY,
      contentH,
    );
  }

  // Right side: chart if available
  if (content.chartData) {
    const rightPos = COMPOSITE_LAYOUTS["left-right"][1];
    const { contentY, contentH } = renderContentBox(
      slide,
      rightPos,
      "Data",
      theme,
      false,
    );
    renderMiniChartInZone(
      slide,
      content.chartData as { type: string; series: ChartSeries[] },
      rightPos,
      theme,
      contentY,
      contentH,
    );
  }
  // Or statistics
  else if (content.statistics && content.statistics.length > 0) {
    const rightPos = COMPOSITE_LAYOUTS["left-right"][1];
    renderContentBox(slide, rightPos, "Metrics", theme, false);

    // Show up to 3 stats stacked
    const stats = content.statistics.slice(0, 3);
    const statHeight = rightPos.h / stats.length;

    stats.forEach((stat, idx) => {
      renderStatInZone(
        slide,
        stat,
        { ...rightPos, y: rightPos.y + idx * statHeight, h: statHeight },
        theme,
        rightPos.y + idx * statHeight + 0.1,
        statHeight - 0.2,
      );
    });
  }
}

/**
 * Render a stats grid slide with multiple stat boxes
 */
export function renderStatsGridSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme, false);

  const stats = content.statistics || [];
  if (stats.length === 0) {
    return;
  }

  // Choose layout based on stat count
  let layout: GridPosition[];
  if (stats.length <= 2) {
    layout = COMPOSITE_LAYOUTS["left-right"];
  } else if (stats.length <= 3) {
    layout = COMPOSITE_LAYOUTS["three-cols"];
  } else if (stats.length <= 4) {
    layout = COMPOSITE_LAYOUTS["quadrants"];
  } else if (stats.length <= 5) {
    layout = COMPOSITE_LAYOUTS["five-boxes"];
  } else {
    layout = COMPOSITE_LAYOUTS["six-boxes"];
  }

  stats.slice(0, layout.length).forEach((stat, idx) => {
    const pos = layout[idx];
    const isPrimary = idx === 0;
    const { contentY, contentH } = renderContentBox(
      slide,
      pos,
      undefined,
      theme,
      isPrimary,
    );
    renderStatInZone(slide, stat, pos, theme, contentY, contentH);
  });
}

/**
 * Render an icon grid slide with multiple icon boxes
 */
export function renderIconGridSlide(
  slide: PptxSlide,
  title: string,
  content: SlideContent,
  theme: PresentationTheme,
): void {
  addTitle(slide, title, theme, false);

  const icons = content.icons || content.features || [];
  if (icons.length === 0) {
    return;
  }

  // Choose layout based on icon count
  let layout: GridPosition[];
  if (icons.length <= 2) {
    layout = COMPOSITE_LAYOUTS["left-right"];
  } else if (icons.length <= 3) {
    layout = COMPOSITE_LAYOUTS["three-cols"];
  } else if (icons.length <= 4) {
    layout = COMPOSITE_LAYOUTS["quadrants"];
  } else if (icons.length <= 5) {
    layout = COMPOSITE_LAYOUTS["five-boxes"];
  } else {
    layout = COMPOSITE_LAYOUTS["six-boxes"];
  }

  icons.slice(0, layout.length).forEach((item, idx) => {
    const pos = layout[idx];
    const isPrimary = idx === 0;
    const { contentY, contentH } = renderContentBox(
      slide,
      pos,
      undefined,
      theme,
      isPrimary,
    );

    const icon = (item as FeatureItem).icon || "1F4A1";
    const label =
      (item as FeatureItem).title || (item as { label?: string }).label || "";
    const description = (item as FeatureItem).description;

    renderIconBoxInZone({
      slide,
      icon,
      label,
      description,
      pos,
      theme,
      contentY,
      contentH,
    });
  });
}
