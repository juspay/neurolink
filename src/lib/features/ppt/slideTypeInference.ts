/**
 * Slide Type Inference Utility
 *
 * Automatically infers the best slide type and bullet style based on:
 * 1. Title keywords (e.g., "Agenda", "Summary", "Key Takeaways")
 * 2. Content patterns (e.g., numbered items, checkmarks in text)
 * 3. AI response structure
 *
 * This helps ensure consistent slide rendering when AI doesn't explicitly
 * specify a slide type, or when we want to normalize AI responses.
 */

import type {
  SlideType,
  BulletStyle,
  BulletPoint,
  SlideContent,
} from "./types.js";

// ============================================================================
// KEYWORD-BASED SLIDE TYPE INFERENCE
// ============================================================================

/**
 * Keywords that suggest specific slide types
 * Ordered by specificity - more specific patterns first
 */
const TITLE_KEYWORD_PATTERNS: Array<{
  patterns: RegExp[];
  slideType: SlideType;
  bulletStyle: BulletStyle;
}> = [
  // Agenda / Table of Contents - numbered list
  {
    patterns: [
      /^agenda$/i,
      /^table\s+of\s+contents$/i,
      /^outline$/i,
      /^overview$/i,
      /^what\s+we('ll)?\s+cover$/i,
      /^today('s)?\s+topics?$/i,
      /^session\s+outline$/i,
    ],
    slideType: "agenda",
    bulletStyle: "number",
  },

  // Conclusion / Summary - checkmark
  {
    patterns: [
      /^conclusion$/i,
      /^summary$/i,
      /^key\s+takeaways?$/i,
      /^takeaways?$/i,
      /^recap$/i,
      /^in\s+summary$/i,
      /^what\s+we('ve)?\s+learned$/i,
      /^main\s+points?$/i,
      /^key\s+points?$/i,
      /^highlights?$/i,
      /^achievements?$/i,
      /^accomplishments?$/i,
    ],
    slideType: "conclusion",
    bulletStyle: "checkmark",
  },

  // Closing / Thank You - checkmark
  {
    patterns: [
      /^thank\s+you$/i,
      /^thanks?$/i,
      /^questions?\??$/i,
      /^q\s*&\s*a$/i,
      /^contact(\s+us)?$/i,
      /^next\s+steps?$/i,
      /^action\s+items?$/i,
      /^let('s)?\s+connect$/i,
      /^get\s+(in\s+)?touch$/i,
    ],
    slideType: "closing",
    bulletStyle: "checkmark",
  },

  // Comparison - arrow bullets
  {
    patterns: [
      /^comparison$/i,
      /^vs\.?$/i,
      /^versus$/i,
      /^before\s+(and|&|vs\.?)\s+after$/i,
      /^pros?\s+(and|&|vs\.?)\s+cons?$/i,
      /^advantages?\s+(and|&|vs\.?)\s+disadvantages?$/i,
      /^benefits?\s+(and|&|vs\.?)\s+risks?$/i,
      /^old\s+vs\.?\s+new$/i,
    ],
    slideType: "comparison",
    bulletStyle: "arrow",
  },

  // Process / Steps - numbered
  {
    patterns: [
      /^process$/i,
      /^steps?$/i,
      /^how\s+to\b/i,
      /^workflow$/i,
      /^procedure$/i,
      /^methodology$/i,
      /^\d+\s+steps?\s+to\b/i,
      /^implementation\s+steps?$/i,
      /^getting\s+started$/i,
    ],
    slideType: "numbered-list",
    bulletStyle: "number",
  },

  // Features / Benefits - disc (but could be checkmark for benefits)
  {
    patterns: [
      /^features?$/i,
      /^capabilities?$/i,
      /^what\s+(we|it)\s+offers?$/i,
      /^our\s+offerings?$/i,
    ],
    slideType: "features",
    bulletStyle: "disc",
  },

  {
    patterns: [
      /^benefits?$/i,
      /^advantages?$/i,
      /^why\s+choose\b/i,
      /^reasons?\s+to\b/i,
      /^value\s+proposition$/i,
    ],
    slideType: "content",
    bulletStyle: "checkmark",
  },

  // Goals / Objectives - checkmark
  {
    patterns: [
      /^goals?$/i,
      /^objectives?$/i,
      /^targets?$/i,
      /^aims?$/i,
      /^our\s+mission$/i,
      /^what\s+we\s+aim\s+for$/i,
    ],
    slideType: "content",
    bulletStyle: "checkmark",
  },

  // Challenges / Risks - arrow
  {
    patterns: [
      /^challenges?$/i,
      /^risks?$/i,
      /^obstacles?$/i,
      /^barriers?$/i,
      /^concerns?$/i,
      /^issues?$/i,
      /^problems?$/i,
    ],
    slideType: "content",
    bulletStyle: "arrow",
  },

  // Requirements / Checklist - checkmark
  {
    patterns: [
      /^requirements?$/i,
      /^checklist$/i,
      /^prerequisites?$/i,
      /^what\s+you\s+need$/i,
      /^must\s+haves?$/i,
      /^essentials?$/i,
    ],
    slideType: "content",
    bulletStyle: "checkmark",
  },
];

/**
 * Infer slide type and bullet style from title text
 */
export function inferFromTitle(title: string): {
  slideType: SlideType | null;
  bulletStyle: BulletStyle | null;
} {
  const cleanTitle = title.trim();

  for (const { patterns, slideType, bulletStyle } of TITLE_KEYWORD_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(cleanTitle)) {
        return { slideType, bulletStyle };
      }
    }
  }

  return { slideType: null, bulletStyle: null };
}

// ============================================================================
// CONTENT-BASED INFERENCE
// ============================================================================

/**
 * Content patterns that suggest specific bullet styles
 */
const CONTENT_PATTERNS: Array<{
  pattern: RegExp;
  bulletStyle: BulletStyle;
}> = [
  // Numbered content (1., 2., Step 1, etc.)
  { pattern: /^\d+[.)]\s+/m, bulletStyle: "number" },
  { pattern: /^step\s+\d+/im, bulletStyle: "number" },

  // Checkmark content (✓, ✔, [x], etc.)
  { pattern: /^[✓✔☑]\s*/m, bulletStyle: "checkmark" },
  { pattern: /^\[x\]\s*/im, bulletStyle: "checkmark" },
  { pattern: /^done:/im, bulletStyle: "checkmark" },
  { pattern: /^completed:/im, bulletStyle: "checkmark" },

  // Arrow content (→, ->, =>)
  { pattern: /^[→➜➡]\s*/m, bulletStyle: "arrow" },
  { pattern: /^->\s*/m, bulletStyle: "arrow" },
  { pattern: /^=>\s*/m, bulletStyle: "arrow" },
];

/**
 * Infer bullet style from content text patterns
 */
export function inferBulletStyleFromContent(
  bullets: BulletPoint[],
): BulletStyle | null {
  if (!bullets || bullets.length === 0) {
    return null;
  }

  // Check each bullet for patterns
  for (const bullet of bullets) {
    for (const { pattern, bulletStyle } of CONTENT_PATTERNS) {
      if (pattern.test(bullet.text)) {
        return bulletStyle;
      }
    }
  }

  return null;
}

// ============================================================================
// SLIDE TYPE NORMALIZATION
// ============================================================================

/**
 * Get the appropriate bullet style for a slide type
 * This is the single source of truth for type → style mapping
 */
export function getBulletStyleForSlideType(slideType: SlideType): BulletStyle {
  switch (slideType) {
    // Numbered slides
    case "agenda":
    case "numbered-list":
      return "number";

    // Checkmark slides
    case "conclusion":
    case "closing":
    case "thank-you":
      return "checkmark";

    // Arrow slides
    case "comparison":
      return "arrow";

    // No bullet slides
    case "features":
    case "icons":
    case "quote":
    case "statistics":
    case "title":
    case "section-header":
      return "none";

    // Default disc for content slides
    case "content":
    case "bullets":
    case "two-column":
    case "three-column":
    case "split-content":
    default:
      return "disc";
  }
}

/**
 * Normalize slide type and apply appropriate bullet style
 *
 * This function:
 * 1. Tries to infer slide type from title keywords
 * 2. Applies appropriate bullet style based on slide type
 * 3. Can be used to enhance AI responses
 */
export function normalizeSlideWithInference(
  title: string,
  currentType: SlideType,
  content: SlideContent,
): {
  type: SlideType;
  bulletStyle: BulletStyle;
  wasInferred: boolean;
} {
  // First, try to infer from title
  const { slideType: inferredType, bulletStyle: inferredStyle } =
    inferFromTitle(title);

  if (inferredType) {
    return {
      type: inferredType,
      bulletStyle: inferredStyle || getBulletStyleForSlideType(inferredType),
      wasInferred: true,
    };
  }

  // If content has patterns, use those for bullet style
  const contentStyle = content.bullets
    ? inferBulletStyleFromContent(content.bullets)
    : null;

  if (contentStyle) {
    return {
      type: currentType,
      bulletStyle: contentStyle,
      wasInferred: true,
    };
  }

  // Default: use the current type's default style
  return {
    type: currentType,
    bulletStyle: getBulletStyleForSlideType(currentType),
    wasInferred: false,
  };
}

/**
 * Apply inferred bullet style to all bullets in content
 * Returns a new content object with bullet styles applied
 */
export function applyBulletStyleToContent(
  content: SlideContent,
  bulletStyle: BulletStyle,
): SlideContent {
  // Check if any bullets exist (main content or columns)
  const hasAnyBullets =
    (content.bullets?.length ?? 0) > 0 ||
    (content.leftColumn?.bullets?.length ?? 0) > 0 ||
    (content.rightColumn?.bullets?.length ?? 0) > 0 ||
    (content.centerColumn?.bullets?.length ?? 0) > 0;

  if (!hasAnyBullets) {
    return content;
  }

  return {
    ...content,
    bullets: content.bullets?.map((bullet) => ({
      ...bullet,
      // Only set bulletStyle if not already specified by AI
      bulletStyle: bullet.bulletStyle || bulletStyle,
    })),
    // Also apply to column bullets if present
    leftColumn: content.leftColumn
      ? {
          ...content.leftColumn,
          bullets: content.leftColumn.bullets?.map((b) => ({
            ...b,
            bulletStyle: b.bulletStyle || bulletStyle,
          })),
        }
      : undefined,
    rightColumn: content.rightColumn
      ? {
          ...content.rightColumn,
          bullets: content.rightColumn.bullets?.map((b) => ({
            ...b,
            bulletStyle: b.bulletStyle || bulletStyle,
          })),
        }
      : undefined,
    centerColumn: content.centerColumn
      ? {
          ...content.centerColumn,
          bullets: content.centerColumn.bullets?.map((b) => ({
            ...b,
            bulletStyle: b.bulletStyle || bulletStyle,
          })),
        }
      : undefined,
  };
}

// ============================================================================
// SLIDE TYPE DESCRIPTIONS (for AI guidance)
// ============================================================================

/**
 * Human-readable descriptions for when to use each slide type
 * Can be used in AI prompts for better guidance
 */
export const SLIDE_TYPE_GUIDANCE = {
  // Content types with specific bullet styles
  agenda: {
    use: "For table of contents, outline, overview, or 'what we'll cover' slides",
    bulletStyle: "number",
    example: "Agenda, Outline, Today's Topics, What We'll Cover",
  },
  conclusion: {
    use: "For summary, key takeaways, recap, or main points slides",
    bulletStyle: "checkmark",
    example: "Conclusion, Summary, Key Takeaways, What We Learned",
  },
  closing: {
    use: "For thank you, Q&A, contact, or next steps slides",
    bulletStyle: "checkmark",
    example: "Thank You, Questions?, Contact Us, Next Steps",
  },
  "numbered-list": {
    use: "For step-by-step processes, how-to guides, or ranked lists",
    bulletStyle: "number",
    example: "5 Steps to Success, How To Get Started, Implementation Process",
  },
  comparison: {
    use: "For before/after, pros/cons, or side-by-side comparisons",
    bulletStyle: "arrow",
    example: "Before vs After, Pros and Cons, Old vs New",
  },
  content: {
    use: "For general content with standard bullet points",
    bulletStyle: "disc",
    example: "Features, Details, Information, Background",
  },
  bullets: {
    use: "For enhanced bullet points with optional icons",
    bulletStyle: "disc",
    example: "Key Points, Details, Highlights",
  },
} as const;

/**
 * Generate AI guidance text for slide types
 */
export function getSlideTypeGuidanceForAI(): string {
  const lines = [
    "SLIDE TYPE SELECTION GUIDE:",
    "",
    "Choose the slide type based on the title/content:",
    "",
  ];

  for (const [type, info] of Object.entries(SLIDE_TYPE_GUIDANCE)) {
    lines.push(`• "${type}": ${info.use}`);
    lines.push(`  → Uses: ${info.bulletStyle} bullets`);
    lines.push(`  → Examples: ${info.example}`);
    lines.push("");
  }

  lines.push(
    "If the AI specifies a bulletStyle in the content, that takes priority.",
  );
  lines.push(
    "Otherwise, the slide type determines the bullet style automatically.",
  );

  return lines.join("\n");
}
