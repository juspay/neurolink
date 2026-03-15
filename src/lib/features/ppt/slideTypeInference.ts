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
  BulletPoint,
  BulletStyle,
  SlideContent,
  SlideType,
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
      /\bagenda\b/i,
      /\btable\s+of\s+contents\b/i,
      /\boutline\b/i,
      /\boverview\b/i,
      /\bwhat\s+we('ll)?\s+cover\b/i,
      /\btoday('s)?\s+topics?\b/i,
      /\bsession\s+outline\b/i,
    ],
    slideType: "agenda",
    bulletStyle: "number",
  },

  // Conclusion / Summary - checkmark
  {
    patterns: [
      /\bconclusion\b/i,
      /\bsummary\b/i,
      /\bkey\s+takeaways?\b/i,
      /\btakeaways?\b/i,
      /\brecap\b/i,
      /\bin\s+summary\b/i,
      /\bwhat\s+we('ve)?\s+learned\b/i,
      /\bmain\s+points?\b/i,
      /\bkey\s+points?\b/i,
      /\bhighlights?\b/i,
      /\bachievements?\b/i,
      /\baccomplishments?\b/i,
    ],
    slideType: "conclusion",
    bulletStyle: "checkmark",
  },

  // Closing / Thank You - checkmark
  {
    patterns: [
      /\bthank\s+you\b/i,
      /\bthanks?\b/i,
      /\bquestions?\b\??/i,
      /\bq\s*&\s*a\b/i,
      /\bcontact(\s+us)?\b/i,
      /\bnext\s+steps?\b/i,
      /\baction\s+items?\b/i,
      /\blet('s)?\s+connect\b/i,
      /\bget\s+(in\s+)?touch\b/i,
    ],
    slideType: "closing",
    bulletStyle: "checkmark",
  },

  // Comparison - arrow bullets
  {
    patterns: [
      /\bcomparison\b/i,
      /\bcompare\b/i,
      /\bvs\.?\b/i,
      /\bversus\b/i,
      /\bbefore\s+(and|&|vs\.?)\s+after\b/i,
      /\bpros?\s+(and|&|vs\.?)\s+cons?\b/i,
      /\badvantages?\s+(and|&|vs\.?)\s+disadvantages?\b/i,
      /\bbenefits?\s+(and|&|vs\.?)\s+risks?\b/i,
      /\bold\s+vs\.?\s+new\b/i,
    ],
    slideType: "comparison",
    bulletStyle: "arrow",
  },

  // Process / Steps - numbered
  {
    patterns: [
      /\bprocess\b/i,
      /\bsteps?\b/i,
      /\bstep[\s-]+by[\s-]+step\b/i,
      /\bhow\s+to\b/i,
      /\bworkflow\b/i,
      /\bprocedure\b/i,
      /\bmethodology\b/i,
      /\d+\s+steps?\s+to\b/i,
      /\bimplementation\s+steps?\b/i,
      /\bgetting\s+started\b/i,
    ],
    slideType: "numbered-list",
    bulletStyle: "number",
  },

  // Features / Benefits - disc (but could be checkmark for benefits)
  {
    patterns: [
      /\bfeatures?\b/i,
      /\bcapabilities?\b/i,
      /\bwhat\s+(we|it)\s+offers?\b/i,
      /\bour\s+offerings?\b/i,
    ],
    slideType: "features",
    bulletStyle: "disc",
  },

  {
    patterns: [
      /\bbenefits?\b/i,
      /\badvantages?\b/i,
      /\bwhy\s+choose\b/i,
      /\breasons?\s+to\b/i,
      /\bvalue\s+proposition\b/i,
    ],
    slideType: "content",
    bulletStyle: "checkmark",
  },

  // Goals / Objectives - checkmark
  {
    patterns: [
      /\bgoals?\b/i,
      /\bobjectives?\b/i,
      /\btargets?\b/i,
      /\baims?\b/i,
      /\bour\s+mission\b/i,
      /\bwhat\s+we\s+aim\s+for\b/i,
    ],
    slideType: "content",
    bulletStyle: "checkmark",
  },

  // Challenges / Risks - arrow
  {
    patterns: [
      /\bchallenges?\b/i,
      /\brisks?\b/i,
      /\bobstacles?\b/i,
      /\bbarriers?\b/i,
      /\bconcerns?\b/i,
      /\bissues?\b/i,
      /\bproblems?\b/i,
    ],
    slideType: "content",
    bulletStyle: "arrow",
  },

  // Requirements / Checklist - checkmark
  {
    patterns: [
      /\brequirements?\b/i,
      /\bchecklist\b/i,
      /\bprerequisites?\b/i,
      /\bwhat\s+you\s+need\b/i,
      /\bmust\s+haves?\b/i,
      /\bessentials?\b/i,
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
