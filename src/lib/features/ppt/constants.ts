/**
 * PPT Generation Constants
 *
 * Contains theme definitions, layout configs, and AI prompt templates
 * for presentation generation.
 */

import type {
  PromptTier,
  PPTModelInfo,
  BuildContentPlanningPromptOptions,
  BulletStyle,
  SlideFormattingConfig,
  PresentationTheme,
  SlideType,
  SlideLayout,
} from "./types.js";

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

  // Composite/Dashboard Slides
  dashboard: ["title-content"],
  "mixed-content": ["two-column-equal", "two-column-wide-left"],
  "stats-grid": ["statistics-grid", "statistics-row"],
  "icon-grid": ["icon-grid"],
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
// Theme/Audience/Tone Guidelines for AI
// ============================================================================

/**
 * Theme-specific design guidelines for the AI
 */
export const THEME_GUIDELINES: Record<string, string> = {
  modern:
    "Use clean lines, geometric shapes, and a blue/purple color palette. Focus on technology and innovation themes. Keep design sleek and professional.",
  corporate:
    "Use formal layouts with dark blue and green accents. Emphasize professionalism and reliability. Include charts and data visualizations. Maintain a business-like tone.",
  creative:
    "Incorporate bold colors like orange, pink, and yellow. Use dynamic layouts with asymmetry and vibrant imagery. Focus on creativity and out-of-the-box thinking.",
  minimal:
    "Adopt a black-and-white color scheme with lots of white space. Use simple, uncluttered layouts. Focus on clarity and essential information only.",
  dark: "Utilize a dark background with cyan and purple highlights. Create a tech-savvy, futuristic feel. Use high-contrast text for readability.",
  AI: "Adapt design elements based on the presentation topic and audience. Choose colors, fonts, and layouts that best suit the content and purpose of the presentation.",
};

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
  AI: "Tailor content complexity and tone based on the specific audience type. Ensure clarity and relevance for the intended viewers.",
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
  AI: "Adapt tone based on the specified style. Ensure consistency throughout the presentation.",
};

// ============================================================================
// PROMPT TIER SYSTEM (Basic vs Advanced based on model capability)
// ============================================================================

/**
 * Prompt tier type - determines which slide types are available
 * - basic: 10 essential slide types for simpler/faster models
 * - advanced: All slide types for powerful models
 */

/**
 * Advanced model patterns - these get the full prompt with all slide types
 * Based on PPT-supported providers: anthropic, openai, vertex, google-ai, azure, bedrock
 *
 */
const ADVANCED_MODEL_PATTERNS = [
  // Anthropic - has advanced-reasoning OR highest/high quality (anthropic, bedrock providers)
  "claude-4.5-opus", // advanced-reasoning, highest quality
  "claude-4.5-sonnet", // advanced-reasoning, highest quality
  "claude-3.7-sonnet", // advanced-reasoning, highest quality
  "claude-3-5-sonnet", // code/analysis, high quality (proven capable)
  "claude-3.5-sonnet", // code/analysis, high quality
  "claude-3-opus", // analysis/research, highest quality
  "claude-opus-4", // alias pattern for claude-4.5-opus
  "claude-sonnet-4", // alias pattern for claude-4.5-sonnet
  // OpenAI - multimodal with json-mode (openai, azure providers)
  "gpt-4o", // multimodal, highest quality, json-mode capable
  // Google - has advanced-reasoning (vertex, google-ai providers)
  "gemini-3.1-pro-preview", // advanced-reasoning, highest quality
  "gemini-2.5-pro", // advanced-reasoning, highest quality
];

/**
 * Detect prompt tier based on model name
 */
export function getPromptTier(modelInfo: PPTModelInfo): PromptTier {
  if (!modelInfo.name) {
    return "basic";
  }

  const modelLower = modelInfo.name.toLowerCase();
  const isAdvanced = ADVANCED_MODEL_PATTERNS.some((pattern) =>
    modelLower.includes(pattern.toLowerCase()),
  );

  return isAdvanced ? "advanced" : "basic";
}

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
6. First slide is always type "title", last slide is always type "closing"
7. Include an "agenda" slide as slide 2 for presentations with 8+ slides
8. Create visual variety: mix content, data, quote, and image slides
9. For data slides, provide realistic sample data that matches the topic
10. Use statistics slides for key metrics, chart slides for trends/comparisons
11. Include at least one quote slide for impact
12. Use section-header slides to break up long presentations (15+ slides)
13. Title and closing slides should be clean and simple`;

// ============================================================================
// CONTENT PLANNING PROMPT SECTIONS (modular for easy debugging/changes)
// ============================================================================

/** Valid options for AI to choose from */
const VALID_OPTIONS_SECTION = `VALID_THEMES = ["modern", "corporate", "creative", "minimal", "dark"]
VALID_AUDIENCES = ["business", "students", "technical", "general"]
VALID_TONES = ["professional", "casual", "educational", "persuasive"]`;

/** Slide types documentation for ADVANCED mode - all slide types available */
const SLIDE_TYPES_SECTION = `AVAILABLE SLIDE TYPES (use variety for engaging presentations):

Opening/Closing:
- "title": Opening slide with main title + subtitle (slide 1 only)
- "section-header": Section divider with large title
- "closing": Final slide with summary, next steps, and/or contact info

Content Slides:
- "content": Standard title + bullet points
- "agenda": Table of contents / overview list
- "bullets": Enhanced bullet points with icons
- "numbered-list": Step-by-step or ranked content

Visual Slides:
- "image-focus": Large centered image with caption
- "image-left": Image left, content right
- "image-right": Content left, image right
- "full-bleed-image": Full background image with text overlay
- "gallery": Multiple images (2-4) in grid layout

Data Slides:
- "table": Data table with headers and rows
- "chart-bar": Bar chart for comparisons
- "chart-line": Line chart for trends over time
- "chart-pie": Pie chart for proportions
- "chart-area": Area chart for cumulative data
- "statistics": Big numbers/metrics display

Layout Slides:
- "two-column": Two equal columns of content
- "three-column": Three columns for comparisons
- "split-content": Asymmetric 60/40 split layout
- "comparison": Side-by-side comparison

Diagram Slides:
- "timeline": Chronological events/milestones
- "process-flow": Step-by-step process diagram
- "icons": Icon grid with labels
- "features": Feature list with icons

Special Slides:
- "quote": Impactful quote with attribution
- "team": Team member profiles
- "conclusion": Summary with key takeaways
- "blank": Empty slide for custom content

Composite/Dashboard Slides (dynamic multi-zone layouts):
- "dashboard": Flexible grid with multiple content zones (charts + stats + bullets)
- "mixed-content": Left column bullets + right column chart/stats
- "stats-grid": Multiple stat boxes in auto-layout grid
- "icon-grid": Multiple icon boxes in auto-layout grid`;

/** Image prompt rules - SINGLE SOURCE OF TRUTH for image decisions */
const IMAGE_RULES_SECTION = `IMAGE RULES (when to use imagePrompt):

⚠️ CRITICAL: If "generateAIImages" is false, DO NOT use these slide types:
- image-focus, image-left, image-right, full-bleed-image, gallery
Instead use: content, bullets, statistics, chart-*, table, or other non-image types

REQUIRED - Must provide imagePrompt (only when generateAIImages is true):
- image-focus, image-left, image-right, full-bleed-image, gallery

OPTIONAL - Can provide imagePrompt for visual appeal:
- title (background), content, two-column, three-column, split-content, team, conclusion

NO IMAGE - Set imagePrompt to null:
- Data slides: table, chart-bar, chart-line, chart-pie, chart-area, statistics
- Diagram slides: timeline, process-flow, comparison, icons, features
- Text slides: bullets, agenda, numbered-list, quote, closing, section-header, blank

When providing imagePrompt: describe a VISUAL SCENE with NO TEXT in the image`;

/** Content structure examples by slide type */
const CONTENT_STRUCTURES_SECTION = `CONTENT STRUCTURE BY TYPE:

🎯 SLIDE TYPE → BULLET STYLE MAPPING (IMPORTANT!):
The slide TYPE determines the bullet style automatically:
- type="agenda" → numbered bullets (1. 2. 3.) - Use for: Agenda, Outline, Overview, What We'll Cover
- type="numbered-list" → numbered bullets (1. 2. 3.) - Use for: Steps, How-To, Process
- type="conclusion" → checkmark bullets (✓) - Use for: Summary, Key Takeaways, Recap, Highlights
- type="closing" → checkmark bullets (✓) - Use for: Thank You, Next Steps, Q&A, Contact
- type="comparison" → arrow bullets (→) - Use for: Pros vs Cons, Before/After, Old vs New
- type="content" or "bullets" → disc bullets (•) - Use for: Regular content, Features, Details

BULLET FORMATTING (OPTIONAL - defaults applied if not specified):
Each bullet can optionally include formatting overrides:
- "fontSize": 12-24 (default auto-calculated based on bullet count: 1-5→18, 6-7→16, 8-10→14, 10+→12)
- "bulletStyle": "disc" | "number" | "checkmark" | "arrow" | "dash" | "none" (overrides type default)
- "bold": true/false
- "color": "#RRGGBB"

EXAMPLES:

For "agenda" slides (numbered 1. 2. 3.):
{"bullets": [{"text": "Introduction to AI"}, {"text": "Key Benefits"}, {"text": "Implementation Guide"}]}

For "conclusion" slides (checkmarks ✓):
{"bullets": [{"text": "AI improves efficiency by 40%"}, {"text": "Easy to implement"}, {"text": "Scalable solution"}]}

For "content"/"bullets" slides (disc •):
{"bullets": [{"text": "First point", "emphasis": true}, {"text": "Second point", "subBullets": ["Detail 1", "Detail 2"]}, {"text": "Third point"}]}

Optional formatting override:
{"bullets": [{"text": "Important", "bulletStyle": "checkmark", "bold": true}, {"text": "Normal point"}]}`;

/** Additional content structures */
const CONTENT_STRUCTURES_SECTION_2 = `For "statistics" slides:
{"statistics": [{"value": "98%", "label": "Customer Satisfaction", "trend": "up"}, {"value": "2.5M", "label": "Users Worldwide", "change": "+40%"}, {"value": "50+", "label": "Countries", "trend": "neutral"}]}

For "chart-bar"/"chart-line"/"chart-pie"/"chart-area" slides:
{"chartData": {"type": "bar", "title": "Revenue by Quarter", "series": [{"name": "2024", "labels": ["Q1", "Q2", "Q3", "Q4"], "values": [100, 150, 200, 250]}], "showLabels": true, "legendPosition": "bottom"}}

For "table" slides:
{"tableData": {"headers": ["Feature", "Basic", "Pro", "Enterprise"], "rows": [[{"text": "Users"}, {"text": "10"}, {"text": "100"}, {"text": "Unlimited"}]], "hasHeader": true, "caption": "Pricing comparison"}}

For "timeline" slides:
{"timeline": {"orientation": "horizontal", "items": [{"date": "2020", "title": "Founded", "description": "Company started"}, {"date": "2022", "title": "Growth", "description": "Reached 100K users"}]}}

For "process-flow" slides:
{"processSteps": [{"step": 1, "title": "Research", "description": "Gather requirements"}, {"step": 2, "title": "Design", "description": "Create mockups"}, {"step": 3, "title": "Build", "description": "Develop solution"}]}

For "quote" slides:
{"quote": "The best way to predict the future is to create it.", "quoteAuthor": "Peter Drucker", "quoteAuthorTitle": "Management Consultant"}

For "comparison" slides:
{"comparison": {"comparisonTitle": "Before vs After", "columns": [{"title": "Before", "items": ["Manual", "Slow"]}, {"title": "After", "items": ["Automated", "Fast"], "highlight": true}]}}

For "two-column"/"three-column" slides:
{"leftColumn": {"title": "Benefits", "bullets": [{"text": "Point 1"}]}, "rightColumn": {"title": "Features", "bullets": [{"text": "Feature 1"}]}}

For "features" slides:
{"features": [{"title": "Fast Performance", "description": "Lightning-fast response times", "icon": "26A1"}, {"title": "Secure", "description": "Enterprise-grade security", "icon": "1F512"}]}

For "team" slides:
{"teamMembers": [{"name": "Jane Smith", "role": "CEO", "photoPrompt": "Professional headshot"}, {"name": "John Doe", "role": "CTO"}]}

For "icons" slides:
{"icons": [{"icon": "1F4A1", "label": "Innovation", "description": "Fresh ideas"}, {"icon": "1F465", "label": "Teamwork"}]}

For "gallery" slides:
{"galleryImages": [{"prompt": "Modern office workspace", "caption": "Our workspace"}, {"prompt": "Team meeting", "caption": "Culture"}]}

For "closing" slides:
{"nextSteps": ["Schedule a demo", "Visit website"], "cta": "Get started today!", "contactInfo": {"email": "hello@company.com", "website": "www.company.com"}}

For "dashboard" slides (COMPOSITE - mix multiple content types in one slide):
{"dashboard": {"layout": "left-right", "zones": [{"type": "bullets", "title": "Key Insights", "content": [{"text": "Revenue up 25%"}, {"text": "New markets opened"}]}, {"type": "chart", "title": "Q4 Results", "chartData": {"type": "bar", "series": [{"name": "Sales", "labels": ["Oct", "Nov", "Dec"], "values": [150, 180, 220]}]}}]}}
Available layouts: "left-right", "top-bottom", "three-cols", "quadrants", "five-boxes", "six-boxes", "main-sidebar", "top-three"
Zone types: "bullets", "chart", "stats", "icon-box", "text-box"

For "mixed-content" slides (left bullets + right chart/stats):
{"leftColumn": {"title": "Analysis", "bullets": [{"text": "Strong Q4 performance"}, {"text": "Market share grew"}]}, "statistics": [{"value": "42%", "label": "Growth Rate", "trend": "up"}]}

For "stats-grid" slides (multiple stat boxes):
{"statistics": [{"value": "99.9%", "label": "Uptime"}, {"value": "50ms", "label": "Response Time"}, {"value": "10M+", "label": "Users"}, {"value": "150+", "label": "Countries"}]}

For "icon-grid" slides (icon boxes with descriptions):
{"icons": [{"icon": "1F680", "label": "Fast", "description": "Lightning performance"}, {"icon": "1F512", "label": "Secure", "description": "Enterprise security"}, {"icon": "1F4CA", "label": "Analytics", "description": "Deep insights"}]}`;

/** Layout options by category */
const LAYOUT_OPTIONS_SECTION = `LAYOUT OPTIONS BY CATEGORY (match layout to slide type):

Title layouts: "title-centered", "title-bottom", "title-left-aligned"
Content layouts: "title-content", "title-content-footer", "content-only"
Image layouts: "image-left-content-right", "image-right-content-left", "image-top-content-bottom", "image-bottom-content-top", "image-full-overlay", "image-centered", "image-grid-2x2"
Column layouts: "two-column-equal", "two-column-wide-left", "two-column-wide-right", "three-column-equal"
Data layouts: "chart-full", "chart-with-bullets", "table-full", "table-with-notes", "statistics-row", "statistics-grid"
Special layouts: "quote-centered", "quote-with-image", "timeline-horizontal", "timeline-vertical", "process-horizontal", "process-vertical", "comparison-side-by-side", "comparison-table", "team-grid", "icon-grid", "summary-bullets", "contact-info", "blank-full"`;

/** Important rules for AI */
const IMPORTANT_RULES_SECTION = `IMPORTANT RULES:
1. Use the correct layout for each slide type (refer to mappings above)
2. Include ALL required content fields for each slide type
3. For data slides (charts, tables, statistics), always provide the data structure
4. Image prompts should describe visuals WITHOUT any text in the image
5. Ensure slide variety - don't use the same type consecutively
6. CRITICAL: Choose slide type based on title keywords:
   - Agenda/Outline/Overview → type="agenda" (numbered bullets)
   - Summary/Takeaways/Recap → type="conclusion" (checkmark bullets)
   - Thank You/Next Steps/Q&A → type="closing" (checkmark bullets)
   - Regular content → type="content" (disc bullets)

⚠️ CRITICAL: Content MUST fit within slide box. Keep text SHORT and CONCISE to prevent overflow.`;

// ============================================================================
// BASIC MODE PROMPT SECTIONS (10 essential slide types for simpler models)
// ============================================================================

/** Slide types for BASIC mode - 10 essential types */
const SLIDE_TYPES_SECTION_BASIC = `AVAILABLE SLIDE TYPES:

Opening/Closing:
- "title": Opening slide with main title + subtitle (slide 1 only)
- "section-header": Section divider with large title
- "closing": Final slide with summary, next steps, and/or contact info

Content Slides:
- "content": Standard title + bullet points
- "agenda": Table of contents / overview list

Visual Slides:
- "image-focus": Large centered image with caption
- "two-column": Two columns of content

Data Slides:
- "chart-bar": Bar chart for comparisons
- "statistics": Big numbers/metrics display

Special Slides:
- "quote": Impactful quote with attribution`;

/** Image rules for BASIC mode */
const IMAGE_RULES_SECTION_BASIC = `IMAGE RULES:

REQUIRED - Must provide imagePrompt:
- image-focus

OPTIONAL - Can provide imagePrompt:
- title (background), content, two-column

NO IMAGE - Set imagePrompt to null:
- chart-bar, statistics, agenda, quote, closing, section-header

When providing imagePrompt: describe a VISUAL SCENE with NO TEXT in the image`;

/** Content structures for BASIC mode */
const CONTENT_STRUCTURES_SECTION_BASIC = `CONTENT STRUCTURE BY TYPE:

🎯 SLIDE TYPE → BULLET STYLE (AUTOMATIC):
- type="agenda" → numbered (1. 2. 3.) - For: Agenda, Outline, Overview
- type="content" → disc (•) - For: Regular content, Features
- type="closing" → checkmark (✓) - For: Summary, Next Steps, Thank You

For "agenda" slides (shows numbered 1. 2. 3.):
{"bullets": [{"text": "Introduction"}, {"text": "Key Features"}, {"text": "Next Steps"}]}

For "content" slides (shows disc •):
{"bullets": [{"text": "First point"}, {"text": "Second point", "subBullets": ["Detail 1", "Detail 2"]}, {"text": "Third point"}]}

For "two-column" slides:
{"leftColumn": {"title": "Benefits", "bullets": [{"text": "Point 1"}]}, "rightColumn": {"title": "Features", "bullets": [{"text": "Feature 1"}]}}

For "quote" slides:
{"quote": "The best way to predict the future is to create it.", "quoteAuthor": "Peter Drucker", "quoteAuthorTitle": "Management Consultant"}

For "statistics" slides:
{"statistics": [{"value": "98%", "label": "Customer Satisfaction", "trend": "up"}, {"value": "2.5M", "label": "Users Worldwide"}, {"value": "50+", "label": "Countries"}]}

For "chart-bar" slides:
{"chartData": {"type": "bar", "title": "Revenue by Quarter", "series": [{"name": "2024", "labels": ["Q1", "Q2", "Q3", "Q4"], "values": [100, 150, 200, 250]}]}}

For "closing" slides (shows checkmarks ✓):
{"bullets": [{"text": "Key insight learned"}, {"text": "Action item to take"}], "cta": "Get started today!", "contactInfo": {"email": "hello@company.com"}}`;

/** Layout options for BASIC mode */
const LAYOUT_OPTIONS_SECTION_BASIC = `LAYOUT OPTIONS:

- title: "title-centered"
- section-header: "title-centered"
- content/agenda: "title-content"
- image-focus: "image-centered"
- two-column: "two-column-equal"
- chart-bar: "chart-full"
- statistics: "statistics-row"
- quote: "quote-centered"
- closing: "summary-bullets"`;

/** Important rules for BASIC mode */
const IMPORTANT_RULES_SECTION_BASIC = `IMPORTANT RULES:
1. First slide must be "title", last slide must be "closing"
2. Include ALL required content fields for each slide type
3. For data slides (charts, statistics), always provide the data structure
4. Image prompts should describe visuals WITHOUT any text in the image
5. Ensure slide variety - don't use the same type consecutively
6. Choose slide type based on content:
   - For agenda/outline → type="agenda" (numbered 1. 2. 3.)
   - For summary/thank you → type="closing" (checkmarks ✓)
   - For regular content → type="content" (disc bullets •)

⚠️ CRITICAL: Content MUST fit within slide box. Keep text SHORT.`;

/**
 * Build the user prompt for content planning
 * Modular design: each section is a separate constant for easy debugging/changes
 */
export function buildContentPlanningPrompt(
  options: BuildContentPlanningPromptOptions,
): string {
  const { topic, pages, audience, tone, theme, generateAIImages, modelInfo } =
    options;
  // Determine prompt tier based on model
  const tier = getPromptTier(modelInfo);
  const isAdvanced = tier === "advanced";

  // Get guidelines only for user-specified values (not "AI will decide")
  const audienceGuide =
    audience === "AI will decide"
      ? ""
      : AUDIENCE_GUIDELINES[audience] || AUDIENCE_GUIDELINES.AI;
  const toneGuide =
    tone === "AI will decide"
      ? ""
      : TONE_GUIDELINES[tone] || TONE_GUIDELINES.AI;
  const themeGuide =
    theme === "AI will decide"
      ? ""
      : THEME_GUIDELINES[theme] || THEME_GUIDELINES.AI;

  // Build configuration section
  const configSection = [
    `Create a ${pages}-slide presentation about: "${topic}"`,
    "",
    "CONFIGURATION:",
    `- Slides: ${pages}`,
    `- Target Audience: ${audience}`,
    `- Tone: ${tone}`,
    `- Theme: ${theme}`,
    `- Include AI-generated images: ${generateAIImages ? "Yes" : "No"}`,
    generateAIImages
      ? ""
      : "⚠️ IMPORTANT: Since AI images are DISABLED, do NOT use these slide types: image-focus, image-left, image-right, full-bleed-image, gallery. Use content, bullets, statistics, charts, or other text-based types instead.",
  ]
    .filter(Boolean)
    .join("\n");

  // AI auto-selection instruction
  const autoSelectSection = `
CRITICAL: If any value above says "AI will decide", YOU MUST choose the best option:
- theme options: "modern", "corporate", "creative", "minimal", "dark"
- audience options: "business", "students", "technical", "general"
- tone options: "professional", "casual", "educational", "persuasive"`;

  // Optional guidelines
  const guidelinesSection = [
    audienceGuide ? `\nAUDIENCE GUIDELINES:\n${audienceGuide}` : "",
    toneGuide ? `\nTONE GUIDELINES:\n${toneGuide}` : "",
    themeGuide ? `\nTHEME GUIDELINES:\n${themeGuide}` : "",
  ].join("");

  // Output format section
  const outputFormat = `
OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "title": "Main presentation title",
  "totalSlides": ${pages},
  "audience": "<chosen audience>",
  "tone": "<chosen tone>",
  "theme": "<chosen theme>",
  "keyMessages": ["Key message 1", "Key message 2", "Key message 3"],
  "slides": [...]
}

SLIDE STRUCTURE - Each slide follows this format:
{
  "slideNumber": 1,
  "type": "title",
  "layout": "title-centered",
  "title": "Presentation Title",
  "content": {"subtitle": "Subtitle or tagline"},
  "imagePrompt": ${generateAIImages ? '"Professional abstract background with blue gradient and geometric shapes, no text"' : "null"},
  "speakerNotes": "Welcome the audience and introduce the topic..."
}`;

  // Select sections based on tier (basic = 10 types, advanced = all types)
  const slideTypesSection = isAdvanced
    ? SLIDE_TYPES_SECTION
    : SLIDE_TYPES_SECTION_BASIC;
  const imageRulesSection = isAdvanced
    ? IMAGE_RULES_SECTION
    : IMAGE_RULES_SECTION_BASIC;
  const contentStructuresSection = isAdvanced
    ? `${CONTENT_STRUCTURES_SECTION}\n\n${CONTENT_STRUCTURES_SECTION_2}`
    : CONTENT_STRUCTURES_SECTION_BASIC;
  const layoutSection = isAdvanced
    ? LAYOUT_OPTIONS_SECTION
    : LAYOUT_OPTIONS_SECTION_BASIC;
  const rulesSection = isAdvanced
    ? IMPORTANT_RULES_SECTION
    : IMPORTANT_RULES_SECTION_BASIC;

  // Combine all sections
  return [
    configSection,
    autoSelectSection,
    guidelinesSection,
    outputFormat,
    "",
    VALID_OPTIONS_SECTION,
    "",
    slideTypesSection,
    "",
    imageRulesSection,
    "",
    contentStructuresSection,
    "",
    layoutSection,
    "",
    rulesSection,
    "",
    "Generate the complete presentation plan now:",
  ].join("\n");
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
// BULLET FORMATTING DEFAULTS (Hybrid System)
// Hardcoded defaults per slide type - AI can override if specified
// ============================================================================
/**
 * Default formatting config per slide type
 * AI can override these by specifying formatting in content
 */
export const SLIDE_TYPE_FORMATTING: Record<
  string,
  SlideFormattingConfig & { bulletStyle: BulletStyle }
> = {
  // Content slides - standard disc bullets
  content: { bulletStyle: "disc", baseFontSize: 18 },
  bullets: { bulletStyle: "disc", baseFontSize: 18 },

  // Agenda/numbered slides - numbered list
  agenda: { bulletStyle: "number", baseFontSize: 18 },
  "numbered-list": { bulletStyle: "number", baseFontSize: 18 },

  // Conclusion/closing - checkmark for key takeaways
  conclusion: { bulletStyle: "checkmark", baseFontSize: 18 },
  closing: { bulletStyle: "checkmark", baseFontSize: 18 },

  // Column layouts - disc bullets
  "two-column": { bulletStyle: "disc", baseFontSize: 16 },
  "three-column": { bulletStyle: "disc", baseFontSize: 14 },
  "split-content": { bulletStyle: "disc", baseFontSize: 16 },

  // Comparison - arrow bullets
  comparison: { bulletStyle: "arrow", baseFontSize: 16 },

  // Features/icons - no bullet (icon prefix instead)
  features: { bulletStyle: "none", baseFontSize: 16 },
  icons: { bulletStyle: "none", baseFontSize: 16 },

  // Default fallback
  default: { bulletStyle: "disc", baseFontSize: 18 },
};

/**
 * Get formatting config for a slide type
 */
export function getSlideTypeFormatting(
  slideType: string,
): SlideFormattingConfig & { bulletStyle: BulletStyle } {
  return SLIDE_TYPE_FORMATTING[slideType] || SLIDE_TYPE_FORMATTING.default;
}

/**
 * Map BulletStyle to pptxgenjs bullet options
 */
export function getBulletOptions(
  style: BulletStyle,
): { type?: "bullet" | "number"; code?: string } | boolean {
  switch (style) {
    case "number":
      return { type: "number" };
    case "checkmark":
      return { code: "2713" }; // ✓
    case "arrow":
      return { code: "2192" }; // →
    case "dash":
      return { code: "2013" }; // –
    case "none":
      return false;
    default:
      return true; // Use default bullet (•)
  }
}

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
