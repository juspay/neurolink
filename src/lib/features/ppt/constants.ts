/**
 * PPT Generation Constants
 *
 * Contains theme definitions, layout configs, and AI prompt templates
 * for presentation generation.
 */

import type { PresentationTheme, SlideType, SlideLayout } from "./types.js";

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

/**
 * Built-in theme registry
 * Each theme defines colors, fonts, and styling for the presentation
 */
export const THEMES: Record<string, PresentationTheme> = {
  modern: {
    name: "modern",
    displayName: "Modern",
    description: "Clean, tech-forward design with blue and purple accents",
    colors: {
      primary: "#2563EB", // Blue
      secondary: "#7C3AED", // Purple
      accent: "#06B6D4", // Cyan
      background: "#FFFFFF",
      text: "#1F2937",
      textOnPrimary: "#FFFFFF",
      muted: "#6B7280",
    },
    fonts: {
      heading: "Arial",
      body: "Arial",
      sizes: {
        title: 44,
        subtitle: 24,
        heading: 32,
        body: 18,
        caption: 14,
      },
    },
  },

  corporate: {
    name: "corporate",
    displayName: "Corporate",
    description: "Professional business style with dark blue and green",
    colors: {
      primary: "#1E3A5F", // Dark blue
      secondary: "#2E7D32", // Green
      accent: "#64748B", // Slate gray
      background: "#FFFFFF",
      text: "#1E293B",
      textOnPrimary: "#FFFFFF",
      muted: "#64748B",
    },
    fonts: {
      heading: "Arial",
      body: "Arial",
      sizes: {
        title: 44,
        subtitle: 22,
        heading: 30,
        body: 16,
        caption: 12,
      },
    },
  },

  creative: {
    name: "creative",
    displayName: "Creative",
    description: "Bold, vibrant design for creative presentations",
    colors: {
      primary: "#EA580C", // Orange
      secondary: "#DB2777", // Pink
      accent: "#FACC15", // Yellow
      background: "#FFFBEB",
      text: "#1C1917",
      textOnPrimary: "#FFFFFF",
      muted: "#78716C",
    },
    fonts: {
      heading: "Arial",
      body: "Arial",
      sizes: {
        title: 48,
        subtitle: 26,
        heading: 34,
        body: 18,
        caption: 14,
      },
    },
  },

  minimal: {
    name: "minimal",
    displayName: "Minimal",
    description: "Clean, minimalist black and white design",
    colors: {
      primary: "#18181B", // Almost black
      secondary: "#3F3F46", // Dark gray
      accent: "#71717A", // Gray
      background: "#FFFFFF",
      text: "#18181B",
      textOnPrimary: "#FFFFFF",
      muted: "#A1A1AA",
    },
    fonts: {
      heading: "Arial",
      body: "Arial",
      sizes: {
        title: 42,
        subtitle: 20,
        heading: 28,
        body: 16,
        caption: 12,
      },
    },
  },

  dark: {
    name: "dark",
    displayName: "Dark",
    description:
      "Dark theme with cyan and purple accents for tech presentations",
    colors: {
      primary: "#06B6D4", // Cyan
      secondary: "#A855F7", // Purple
      accent: "#22D3EE", // Light cyan
      background: "#0F172A", // Dark blue-gray
      text: "#F1F5F9",
      textOnPrimary: "#0F172A",
      muted: "#94A3B8",
    },
    fonts: {
      heading: "Arial",
      body: "Arial",
      sizes: {
        title: 44,
        subtitle: 24,
        heading: 32,
        body: 18,
        caption: 14,
      },
    },
  },
};

/**
 * Get theme by name with fallback to modern
 */
export function getTheme(themeName: string): PresentationTheme {
  return THEMES[themeName] || THEMES.modern;
}

// ============================================================================
// LAYOUT MAPPINGS
// Maps SlideTypes to recommended SlideLayouts based on pptxgenjs capabilities
// ============================================================================

/**
 * Map slide types to recommended layouts
 * First layout in array is the default
 */
export const SLIDE_TYPE_TO_LAYOUT: Record<SlideType, SlideLayout[]> = {
  // Opening/Closing Slides
  title: ["title-centered", "title-bottom", "title-left-aligned"],
  "section-header": ["title-centered", "title-left-aligned"],
  "thank-you": ["contact-info", "title-centered"],
  closing: ["summary-bullets", "title-content"],

  // Content Slides
  content: [
    "title-content",
    "image-right-content-left",
    "image-left-content-right",
  ],
  agenda: ["title-content", "two-column-equal"],
  bullets: ["title-content", "title-content-footer"],
  "numbered-list": ["title-content"],

  // Visual Slides
  "image-focus": ["image-centered", "image-full-overlay"],
  "image-left": ["image-left-content-right"],
  "image-right": ["image-right-content-left"],
  "full-bleed-image": ["image-full-overlay"],
  gallery: ["image-grid-2x2"],

  // Layout Slides
  "two-column": [
    "two-column-equal",
    "two-column-wide-left",
    "two-column-wide-right",
  ],
  "three-column": ["three-column-equal"],
  "split-content": ["two-column-wide-left", "two-column-wide-right"],

  // Data Slides
  table: ["table-full", "table-with-notes"],
  "chart-bar": ["chart-full", "chart-with-bullets"],
  "chart-line": ["chart-full", "chart-with-bullets"],
  "chart-pie": ["chart-full", "chart-with-bullets"],
  "chart-area": ["chart-full"],
  statistics: ["statistics-row", "statistics-grid"],

  // Special Slides
  quote: ["quote-centered", "quote-with-image"],
  timeline: ["timeline-horizontal", "timeline-vertical"],
  "process-flow": ["process-horizontal", "process-vertical"],
  comparison: ["comparison-side-by-side", "comparison-table"],
  features: ["icon-grid", "two-column-equal"],
  team: ["team-grid"],
  icons: ["icon-grid"],
  conclusion: ["summary-bullets", "title-content"],
  blank: ["blank-full"],
};

/**
 * Get recommended layout for slide type
 */
export function getLayoutForType(
  slideType: SlideType,
  hasImage: boolean = false,
  preferredLayout?: SlideLayout,
): SlideLayout {
  const layouts = SLIDE_TYPE_TO_LAYOUT[slideType];

  // If preferred layout is valid for this type, use it
  if (preferredLayout && layouts.includes(preferredLayout)) {
    return preferredLayout;
  }

  // For content slides with images, prefer image layouts
  if (slideType === "content" && hasImage) {
    return "image-right-content-left";
  }

  return layouts[0];
}

/**
 * Slide type categories for AI content planning
 */
export const SLIDE_TYPE_CATEGORIES = {
  opening: ["title", "section-header"] as SlideType[],
  closing: ["thank-you", "closing", "conclusion"] as SlideType[],
  content: ["content", "agenda", "bullets", "numbered-list"] as SlideType[],
  visual: [
    "image-focus",
    "image-left",
    "image-right",
    "full-bleed-image",
    "gallery",
  ] as SlideType[],
  data: [
    "table",
    "chart-bar",
    "chart-line",
    "chart-pie",
    "chart-area",
    "statistics",
  ] as SlideType[],
  layout: ["two-column", "three-column", "split-content"] as SlideType[],
  special: [
    "quote",
    "timeline",
    "process-flow",
    "comparison",
    "features",
    "team",
    "icons",
  ] as SlideType[],
};

/**
 * Slide types that use native pptxgenjs diagrams/shapes instead of AI-generated images.
 * These are rendered using addShape, addTable, addChart etc. - no image generation needed.
 *
 * The AI should set imagePrompt: null for these slide types.
 */
export const DIAGRAM_SLIDE_TYPES: Set<SlideType> = new Set([
  // Data visualization - use addChart
  "chart-bar",
  "chart-line",
  "chart-pie",
  "chart-area",
  "statistics",
  "table",

  // Diagrams - use addShape with arrows, boxes, lines
  "timeline",
  "process-flow",
  "comparison",

  // Icon/layout slides - use addShape or Unicode characters
  "icons",
  "features",

  // Text-only slides - no images needed
  "agenda",
  "bullets",
  "numbered-list",
  "quote",
  "conclusion",
  "thank-you",
  "closing",
  "section-header",
  "blank",
]);

/**
 * Slide types that benefit from AI-generated background/decorative images
 */
export const IMAGE_SLIDE_TYPES: Set<SlideType> = new Set([
  "title", // Background image for title slide
  "image-focus", // Main focus is the image
  "image-left", // Image on left side
  "image-right", // Image on right side
  "full-bleed-image", // Full background image
  "gallery", // Multiple images
  "content", // Optional decorative image
  "two-column", // Optional image in one column
  "three-column", // Optional images
  "split-content", // Optional image
  "team", // Team member photos (optional - can use placeholders)
]);

/**
 * Check if a slide type should use native diagram rendering (no AI image needed)
 */
export function isDiagramSlideType(type: SlideType): boolean {
  return DIAGRAM_SLIDE_TYPES.has(type);
}

/**
 * Check if a slide type benefits from AI image generation
 */
export function isImageSlideType(type: SlideType): boolean {
  return IMAGE_SLIDE_TYPES.has(type);
}

// ============================================================================
// AUDIENCE & TONE GUIDELINES
// ============================================================================

/**
 * Audience-specific content guidelines for the AI
 */
export const AUDIENCE_GUIDELINES: Record<string, string> = {
  business:
    "Use professional business language. Focus on ROI, efficiency, and strategic value. Include relevant metrics and KPIs. Keep content concise and action-oriented.",
  students:
    "Use clear, educational language. Break down complex concepts. Include examples and analogies. Make content engaging and easy to follow.",
  technical:
    "Use precise technical terminology. Include technical details and specifications. Focus on implementation and architecture. Assume strong technical background.",
  general:
    "Use clear, accessible language. Avoid jargon. Focus on key takeaways. Make content engaging for a broad audience.",
};

/**
 * Tone-specific writing guidelines for the AI
 */
export const TONE_GUIDELINES: Record<string, string> = {
  professional:
    "Maintain a formal, business-appropriate tone. Be concise and factual. Use third-person perspective where appropriate.",
  casual:
    "Use a friendly, conversational tone. It's okay to use contractions and informal language. Keep it engaging and relatable.",
  educational:
    "Focus on teaching and explaining. Use step-by-step approaches. Include definitions for key terms. Be patient and thorough.",
  persuasive:
    "Use compelling, action-oriented language. Emphasize benefits and outcomes. Include calls-to-action. Build urgency where appropriate.",
};

// ============================================================================
// AI PROMPT TEMPLATES
// ============================================================================

/**
 * System prompt for content planning AI
 */
export const CONTENT_PLANNING_SYSTEM_PROMPT = `You are an expert presentation designer and content strategist. Your task is to create a detailed, structured content plan for a presentation based on the given topic and requirements.

You must output ONLY valid JSON with no additional text, markdown formatting, or explanation.

CRITICAL RULES:
1. Each slide MUST have a clear, specific title (not generic like "Slide 2")
2. Content bullets should be concise (max 10 words each)
3. Maximum 5-6 bullets per slide for readability
4. Image prompts should describe VISUAL scenes without any text in the image
5. Speaker notes should provide detailed talking points for the presenter
6. First slide is always type "title", last slide is always type "thank-you" or "closing"
7. Include an "agenda" slide as slide 2 for presentations with 8+ slides
8. Create visual variety: mix content, data, quote, and image slides
9. For data slides, provide realistic sample data that matches the topic
10. Use statistics slides for key metrics, chart slides for trends/comparisons
11. Include at least one quote or highlight slide for impact
12. Use section-header slides to break up long presentations (15+ slides)`;

/**
 * Build the user prompt for content planning
 */
export function buildContentPlanningPrompt(
  topic: string,
  pages: number,
  audience: string,
  tone: string,
  theme: string,
  includeImages: boolean,
): string {
  const audienceGuide =
    AUDIENCE_GUIDELINES[audience] || AUDIENCE_GUIDELINES.general;
  const toneGuide = TONE_GUIDELINES[tone] || TONE_GUIDELINES.professional;

  return `Create a ${pages}-slide presentation about: "${topic}"

CONFIGURATION:
- Target Audience: ${audience}
- Tone: ${tone}
- Theme: ${theme}
- Include AI-generated images: ${includeImages ? "Yes" : "No"}

AUDIENCE GUIDELINES:
${audienceGuide}

TONE GUIDELINES:
${toneGuide}

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "title": "Main presentation title",
  "totalSlides": ${pages},
  "audience": "${audience}",
  "tone": "${tone}",
  "theme": "${theme}",
  "keyMessages": ["Key message 1", "Key message 2", "Key message 3"],
  "slides": [...]
}

CRITICAL: The "audience", "tone", and "theme" values above are USER-DEFINED SETTINGS.
if these properties are not mention , then chose from the things , else use the user-defined values.

SLIDE STRUCTURE - Each slide follows this format:
{
  "slideNumber": 1,
  "type": "title",
  "layout": "title-centered",
  "title": "Presentation Title",
  "content": {
    "subtitle": "Subtitle or tagline"
  },
  "imagePrompt": ${includeImages ? '"Professional abstract background with blue gradient and geometric shapes, no text"' : "null"},
  "speakerNotes": "Welcome the audience and introduce the topic..."
}
  
VALID_THEMES = ["modern", "corporate", "creative", "minimal", "dark"]
VALID_AUDIENCES = ["business", "students", "technical", "general"]
VALID_TONES = ["professional", "casual", "educational", "persuasive"]
AVAILABLE SLIDE TYPES (use variety for engaging presentations):

Opening/Closing:
- "title": Opening slide with main title + subtitle (slide 1 only) - CAN use background image
- "section-header": Section divider with large title - NO image needed (native shapes)
- "thank-you": Closing with thanks + contact info - CAN use decorative image
- "closing": Alternative closing with summary + next steps - CAN use decorative image

Content Slides:
- "content": Standard title + bullet points - CAN use decorative image
- "agenda": Table of contents / overview list - NO image needed
- "bullets": Enhanced bullet points with icons - NO image needed (native icons)
- "numbered-list": Step-by-step or ranked content - NO image needed

Visual Slides (REQUIRE images):
- "image-focus": Large centered image with caption - REQUIRES image
- "image-left": Image left, content right - REQUIRES image
- "image-right": Content left, image right - REQUIRES image
- "full-bleed-image": Full background image with text overlay - REQUIRES image
- "gallery": Multiple images (2-4) in grid layout - REQUIRES images

Data Slides (NO images - use native pptxgenjs charts/tables):
- "table": Data table with headers and rows - NO image (native table)
- "chart-bar": Bar chart for comparisons - NO image (native chart)
- "chart-line": Line chart for trends over time - NO image (native chart)
- "chart-pie": Pie chart for proportions - NO image (native chart)
- "chart-area": Area chart for cumulative data - NO image (native chart)
- "statistics": Big numbers/metrics display - NO image (native shapes)

Layout Slides:
- "two-column": Two equal columns of content - CAN use image in column
- "three-column": Three columns for comparisons - CAN use images
- "split-content": Asymmetric 60/40 split layout - CAN use image
- "comparison": Side-by-side comparison - NO image (native shapes/table)

Diagram Slides (NO images - rendered using native pptxgenjs shapes):
- "timeline": Chronological events/milestones - NO image (native shapes + lines)
- "process-flow": Step-by-step process diagram - NO image (native shapes + arrows)
- "icons": Icon grid with labels - NO image (native Unicode icons)
- "features": Feature list with icons - NO image (native icons)

Special Slides:
- "quote": Impactful quote with attribution - NO image (styled text)
- "team": Team member profiles - CAN use placeholder avatars
- "conclusion": Summary with key takeaways - CAN use decorative image
- "blank": Empty slide for custom content - NO image

IMAGE PROMPT RULES:
- Set imagePrompt: null for diagram/chart/table/data slides (they use native pptxgenjs rendering)
- Set imagePrompt: null for text-only slides (bullets, agenda, quote, conclusion, closing, thank-you)
- Only provide imagePrompt for: title, image-focus, image-left, image-right, full-bleed-image, gallery, content (optional), two-column (optional)
- When providing imagePrompt, describe a VISUAL SCENE with NO TEXT in the image

CONTENT STRUCTURE BY TYPE:

For "content"/"bullets"/"agenda" slides:
{
  "bullets": [
    {"text": "First point", "emphasis": true},
    {"text": "Second point", "subBullets": ["Detail 1", "Detail 2"]},
    {"text": "Third point", "icon": "2713"}
  ]
}

For "statistics" slides:
{
  "statistics": [
    {"value": "98%", "label": "Customer Satisfaction", "trend": "up"},
    {"value": "2.5M", "label": "Users Worldwide", "change": "+40%"},
    {"value": "50+", "label": "Countries", "trend": "neutral"}
  ]
}

For "chart-bar"/"chart-line"/"chart-pie"/"chart-area" slides:
{
  "chartData": {
    "type": "bar",
    "title": "Revenue by Quarter",
    "series": [
      {"name": "2024", "labels": ["Q1", "Q2", "Q3", "Q4"], "values": [100, 150, 200, 250]}
    ],
    "showLabels": true,
    "legendPosition": "bottom"
  }
}

For "table" slides:
{
  "tableData": {
    "headers": ["Feature", "Basic", "Pro", "Enterprise"],
    "rows": [
      [{"text": "Users"}, {"text": "10"}, {"text": "100"}, {"text": "Unlimited"}],
      [{"text": "Storage"}, {"text": "5GB"}, {"text": "50GB"}, {"text": "500GB"}]
    ],
    "hasHeader": true,
    "caption": "Pricing comparison"
  }
}

For "timeline" slides:
{
  "timeline": {
    "orientation": "horizontal",
    "items": [
      {"date": "2020", "title": "Founded", "description": "Company started"},
      {"date": "2022", "title": "Growth", "description": "Reached 100K users"},
      {"date": "2024", "title": "Milestone", "description": "Reached 1M users"}
    ]
  }
}

For "process-flow" slides:
{
  "processSteps": [
    {"step": 1, "title": "Research", "description": "Gather requirements"},
    {"step": 2, "title": "Design", "description": "Create mockups"},
    {"step": 3, "title": "Build", "description": "Develop solution"},
    {"step": 4, "title": "Launch", "description": "Deploy to production"}
  ]
}

For "quote" slides:
{
  "quote": "The best way to predict the future is to create it.",
  "quoteAuthor": "Peter Drucker",
  "quoteAuthorTitle": "Management Consultant"
}

For "comparison" slides:
{
  "comparison": {
    "comparisonTitle": "Before vs After",
    "columns": [
      {"title": "Before", "items": ["Manual process", "Slow", "Error-prone"]},
      {"title": "After", "items": ["Automated", "Fast", "Accurate"], "highlight": true}
    ]
  }
}

For "two-column"/"three-column" slides:
{
  "leftColumn": {"title": "Benefits", "bullets": [{"text": "Point 1"}, {"text": "Point 2"}]},
  "rightColumn": {"title": "Features", "bullets": [{"text": "Feature 1"}, {"text": "Feature 2"}]},
  "centerColumn": {"title": "Middle", "bullets": [{"text": "Center point"}]}
}

For "features" slides:
{
  "features": [
    {"title": "Fast Performance", "description": "Lightning-fast response times", "icon": "26A1"},
    {"title": "Secure", "description": "Enterprise-grade security", "icon": "1F512"},
    {"title": "Scalable", "description": "Grows with your business", "icon": "1F4C8"}
  ]
}

For "team" slides:
{
  "teamMembers": [
    {"name": "Jane Smith", "role": "CEO", "photoPrompt": "Professional headshot of a business executive"},
    {"name": "John Doe", "role": "CTO", "photoPrompt": "Professional headshot of a tech leader"}
  ]
}

For "icons" slides:
{
  "icons": [
    {"icon": "1F4A1", "label": "Innovation", "description": "Fresh ideas"},
    {"icon": "1F465", "label": "Teamwork", "description": "Collaboration"},
    {"icon": "1F3AF", "label": "Focus", "description": "Goal-oriented"}
  ]
}

For "gallery" slides:
{
  "galleryImages": [
    {"prompt": "Modern office workspace", "caption": "Our workspace"},
    {"prompt": "Team collaboration meeting", "caption": "Team culture"},
    {"prompt": "Product on display", "caption": "Our product"}
  ]
}

For "closing" slides:
{
  "nextSteps": ["Schedule a demo", "Visit our website", "Contact sales"],
  "cta": "Get started today!",
  "ctaButton": "Sign Up Free"
}

For "thank-you" slides:
{
  "cta": "Questions?",
  "contactInfo": {
    "email": "hello@company.com",
    "website": "www.company.com",
    "social": [{"platform": "LinkedIn", "handle": "@company"}]
  }
}

LAYOUT OPTIONS BY CATEGORY (match layout to slide type):

Title layouts: "title-centered", "title-bottom", "title-left-aligned"
Content layouts: "title-content", "title-content-footer", "content-only"
Image layouts: "image-left-content-right", "image-right-content-left", "image-top-content-bottom", "image-bottom-content-top", "image-full-overlay", "image-centered", "image-grid-2x2"
Column layouts: "two-column-equal", "two-column-wide-left", "two-column-wide-right", "three-column-equal"
Data layouts: "chart-full", "chart-with-bullets", "table-full", "table-with-notes", "statistics-row", "statistics-grid"
Special layouts: "quote-centered", "quote-with-image", "timeline-horizontal", "timeline-vertical", "process-horizontal", "process-vertical", "comparison-side-by-side", "comparison-table", "team-grid", "icon-grid", "summary-bullets", "contact-info", "blank-full"

IMPORTANT RULES:
1. Use the correct layout for each slide type (refer to mappings above)
2. Include ALL required content fields for each slide type
3. For data slides (charts, tables, statistics), always provide the data structure
4. Image prompts should describe visuals WITHOUT any text in the image
5. Ensure slide variety - don't use the same type consecutively

Generate the complete presentation plan now:`;
}

// ============================================================================
// IMAGE PROMPT ENHANCEMENT
// ============================================================================

/**
 * Enhance an image prompt for better AI image generation
 */
export function enhanceImagePrompt(prompt: string, theme: string): string {
  const themeStyle: Record<string, string> = {
    modern: "clean, modern, minimalist style with soft gradients",
    corporate: "professional, corporate, high-quality stock photo style",
    creative: "vibrant, colorful, creative artistic style",
    minimal: "simple, black and white, minimalist photography style",
    dark: "dark, moody, tech-forward with neon accents",
  };

  const style = themeStyle[theme] || themeStyle.modern;

  return `${prompt}, ${style}, professional quality, no text or words in the image, suitable for business presentation, high resolution`;
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const MIN_PAGES = 5;
export const MAX_PAGES = 50;
export const MIN_TOPIC_LENGTH = 10;
export const MAX_TOPIC_LENGTH = 5000;
export const VALID_THEMES = Object.keys(THEMES);
export const VALID_AUDIENCES = ["business", "students", "technical", "general"];
export const VALID_TONES = [
  "professional",
  "casual",
  "educational",
  "persuasive",
];
export const VALID_ASPECT_RATIOS = ["16:9", "4:3"];

// ============================================================================
// TIMEOUTS & LIMITS
// ============================================================================

/** Timeout for content planning AI call (60 seconds) */
export const CONTENT_PLANNING_TIMEOUT_MS = 60000;

/** Timeout for image generation per slide (30 seconds) */
export const IMAGE_GENERATION_TIMEOUT_MS = 30000;

/** Maximum concurrent image generations */
export const MAX_CONCURRENT_IMAGE_GENERATIONS = 5;

/** Total timeout for entire PPT generation (5 minutes) */
export const PPT_GENERATION_TIMEOUT_MS = 300000;
