import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderName } from "../../src/lib/constants/enums.js";
import {
  AUDIENCE_GUIDELINES,
  buildContentPlanningPrompt,
  DIAGRAM_SLIDE_TYPES,
  enhanceImagePrompt,
  getLayoutForType,
  getTheme,
  IMAGE_SLIDE_TYPES,
  isDiagramSlideType,
  isImageSlideType,
  SLIDE_TYPE_CATEGORIES,
  SLIDE_TYPE_TO_LAYOUT,
  THEMES,
  TONE_GUIDELINES,
  VALID_AUDIENCES,
  VALID_THEMES,
  VALID_TONES,
} from "../../src/lib/features/ppt/constants.js";
import {
  createSlideGenerator,
  generateSlidesFromPlan,
  type LogoConfig,
  type LogoPosition,
  PptxGenJS,
  SlideGenerator,
  type SlideGeneratorConfig,
} from "../../src/lib/features/ppt/slideGenerator.js";
import type {
  CompleteSlide,
  PresentationTheme,
} from "../../src/lib/features/ppt/types.js";
import { extractPPTContext } from "../../src/lib/features/ppt/utils.js";
import type { GenerateOptions } from "../../src/lib/types/index.js";
import {
  type BulletPoint,
  type ChartOptions,
  type ChartSeries,
  type ComparisonColumn,
  type ContentPlan,
  type ImageProps,
  isValidHexColor,
  MAX_SLIDES,
  MIN_SLIDES,
  normalizeHexColor,
  type PositionProps,
  PPT_ERROR_CODES,
  PPTError,
  type PPTOutputOptions,
  type ProcessStep,
  type ShadowProps,
  type ShapeProps,
  SLIDE_DIMENSIONS,
  type SlideLayout,
  type SlideSchema,
  type SlideType,
  type Statistic,
  type TableCell,
  type TableOptions,
  type TimelineItem,
} from "../../src/lib/types/pptTypes.js";
import {
  validatePPTGenerationInput,
  validatePPTOutputOptions,
} from "../../src/lib/utils/parameterValidation.js";

// -----------------------------------------------------------------------
// PPT Validation Tests
// -----------------------------------------------------------------------

describe("PPT Validation", () => {
  describe("validatePPTOutputOptions", () => {
    it("should accept valid PPT options", () => {
      const validOptions: PPTOutputOptions = {
        pages: 10,
        theme: "modern",
        audience: "business",
        tone: "professional",
        generateAIImages: true,
      };
      expect(validatePPTOutputOptions(validOptions)).toBeNull();
    });

    it("should reject missing pages field", () => {
      const error = validatePPTOutputOptions({} as PPTOutputOptions);
      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_PAGES");
    });

    it("should accept minimal valid options (pages only)", () => {
      expect(validatePPTOutputOptions({ pages: 10 })).toBeNull();
    });

    it("should reject pages outside valid range", () => {
      expect(validatePPTOutputOptions({ pages: 4 })).not.toBeNull();
      expect(validatePPTOutputOptions({ pages: 51 })).not.toBeNull();
      expect(validatePPTOutputOptions({ pages: 5 })).toBeNull();
      expect(validatePPTOutputOptions({ pages: 50 })).toBeNull();
    });

    it("should reject invalid theme/audience/tone", () => {
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validatePPTOutputOptions({ pages: 10, theme: "invalid" as any }),
      ).not.toBeNull();
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validatePPTOutputOptions({ pages: 10, audience: "invalid" as any }),
      ).not.toBeNull();
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validatePPTOutputOptions({ pages: 10, tone: "invalid" as any }),
      ).not.toBeNull();
    });

    it("should accept all valid themes", () => {
      const themes = [
        "modern",
        "corporate",
        "creative",
        "minimal",
        "dark",
      ] as const;
      themes.forEach((theme) => {
        expect(validatePPTOutputOptions({ pages: 10, theme })).toBeNull();
      });
    });

    it("should accept all valid audiences", () => {
      const audiences = [
        "business",
        "students",
        "technical",
        "general",
      ] as const;
      audiences.forEach((audience) => {
        expect(validatePPTOutputOptions({ pages: 10, audience })).toBeNull();
      });
    });

    it("should accept all valid tones", () => {
      const tones = [
        "professional",
        "casual",
        "educational",
        "persuasive",
      ] as const;
      tones.forEach((tone) => {
        expect(validatePPTOutputOptions({ pages: 10, tone })).toBeNull();
      });
    });

    it("should accept both aspect ratios", () => {
      expect(
        validatePPTOutputOptions({ pages: 10, aspectRatio: "16:9" }),
      ).toBeNull();
      expect(
        validatePPTOutputOptions({ pages: 10, aspectRatio: "4:3" }),
      ).toBeNull();
    });
  });

  describe("validatePPTGenerationInput", () => {
    it("should accept valid PPT generation input", () => {
      const options: GenerateOptions = {
        input: { text: "AI in Healthcare" },
        provider: AIProviderName.VERTEX,
        output: { mode: "ppt", ppt: { pages: 10 } },
      };
      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(true);
    });

    it("should reject empty or too short prompt", () => {
      const shortPrompt: GenerateOptions = {
        input: { text: "short" },
        output: { mode: "ppt", ppt: { pages: 10 } },
      };
      expect(validatePPTGenerationInput(shortPrompt).isValid).toBe(false);
    });

    it("should reject invalid mode", () => {
      const options: GenerateOptions = {
        input: { text: "Valid presentation topic" },
        output: { mode: "video", ppt: { pages: 10 } },
      };
      expect(validatePPTGenerationInput(options).isValid).toBe(false);
    });

    it("should accept providers that support structured output", () => {
      const options: GenerateOptions = {
        input: { text: "Valid presentation topic" },
        provider: AIProviderName.VERTEX,
        output: { mode: "ppt", ppt: { pages: 10 } },
      };
      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(true);
    });

    it("should suggest AI selection when theme/audience/tone not specified", () => {
      const options: GenerateOptions = {
        input: { text: "Test presentation topic" },
        output: { mode: "ppt", ppt: { pages: 10 } },
      };
      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(true);
      const aiSelectionSuggestion = result.suggestions.find((s) =>
        s.includes("AI will decide"),
      );
      expect(aiSelectionSuggestion).toBeDefined();
    });
  });
});

// -----------------------------------------------------------------------
// PPT Types & Layouts Tests
// -----------------------------------------------------------------------

describe("PPT Types & Layouts", () => {
  it("should have all 31 slide types defined", () => {
    const allSlideTypes: SlideType[] = [
      "title",
      "section-header",
      "thank-you",
      "closing",
      "content",
      "agenda",
      "bullets",
      "numbered-list",
      "image-focus",
      "image-left",
      "image-right",
      "full-bleed-image",
      "gallery",
      "two-column",
      "three-column",
      "split-content",
      "table",
      "chart-bar",
      "chart-line",
      "chart-pie",
      "chart-area",
      "statistics",
      "quote",
      "timeline",
      "process-flow",
      "comparison",
      "features",
      "team",
      "icons",
      "conclusion",
      "blank",
    ];
    allSlideTypes.forEach((type) => {
      expect(SLIDE_TYPE_TO_LAYOUT[type]).toBeDefined();
      expect(SLIDE_TYPE_TO_LAYOUT[type].length).toBeGreaterThan(0);
    });
  });

  it("should categorize slide types correctly", () => {
    expect(SLIDE_TYPE_CATEGORIES.opening).toContain("title");
    expect(SLIDE_TYPE_CATEGORIES.closing).toContain("thank-you");
    expect(SLIDE_TYPE_CATEGORIES.data).toContain("chart-bar");
    expect(SLIDE_TYPE_CATEGORIES.visual).toContain("image-focus");
  });

  it("should return correct default layouts", () => {
    expect(getLayoutForType("title")).toBe("title-centered");
    expect(getLayoutForType("content")).toBe("title-content");
    expect(getLayoutForType("quote")).toBe("quote-centered");
  });

  it("should prefer image layout for content slide with image", () => {
    expect(getLayoutForType("content", true)).toBe("image-right-content-left");
  });

  it("should use preferred layout if valid", () => {
    expect(getLayoutForType("title", false, "title-bottom")).toBe(
      "title-bottom",
    );
  });
});

// -----------------------------------------------------------------------
// PPT Themes Tests
// -----------------------------------------------------------------------

describe("PPT Themes", () => {
  it("should have all required themes with complete structure", () => {
    const requiredThemes = [
      "modern",
      "corporate",
      "creative",
      "minimal",
      "dark",
    ];
    requiredThemes.forEach((themeName) => {
      const theme = THEMES[themeName];
      expect(theme).toBeDefined();
      expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.fonts.heading).toBeDefined();
      expect(theme.fonts.sizes.title).toBeGreaterThan(0);
    });
  });

  it("should return theme by name or fallback to modern", () => {
    expect(getTheme("corporate").name).toBe("corporate");
    expect(getTheme("unknown").name).toBe("modern");
  });

  it("should match VALID_THEMES constant", () => {
    expect(VALID_THEMES).toEqual(Object.keys(THEMES));
  });
});

// -----------------------------------------------------------------------
// PPT Prompt Building Tests
// -----------------------------------------------------------------------

describe("PPT Prompt Building", () => {
  it("should include topic and slide count in prompt", () => {
    const prompt = buildContentPlanningPrompt({
      topic: "AI in Healthcare",
      pages: 15,
      audience: "business",
      tone: "professional",
      theme: "modern",
      generateAIImages: true,
      modelInfo: { name: "gemini-2.5-flash", provider: "vertex" },
    });
    expect(prompt).toContain("AI in Healthcare");
    expect(prompt).toContain("15-slide");
  });

  it("should include audience and tone guidelines", () => {
    const prompt = buildContentPlanningPrompt({
      topic: "Test",
      pages: 10,
      audience: "technical",
      tone: "educational",
      theme: "modern",
      generateAIImages: true,
      modelInfo: { name: "gemini-2.5-flash", provider: "vertex" },
    });
    expect(prompt).toContain("technical");
    expect(prompt).toContain("educational");
  });

  it("should include all slide type documentation", () => {
    const prompt = buildContentPlanningPrompt({
      topic: "Test",
      pages: 10,
      audience: "general",
      tone: "professional",
      theme: "modern",
      generateAIImages: true,
      modelInfo: { name: "gemini-2.5-flash", provider: "vertex" },
    });
    // Basic tier includes these types
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"chart-bar"');
    expect(prompt).toContain('"statistics"');
    expect(prompt).toContain('"content"');
  });

  it("should enhance image prompts with theme style", () => {
    const modern = enhanceImagePrompt("sunset", "modern");
    const dark = enhanceImagePrompt("sunset", "dark");
    expect(modern).toContain("modern");
    expect(dark).toContain("dark");
    expect(modern).toContain("no text");
  });
});

// -----------------------------------------------------------------------
// PPT Error Handling Tests
// -----------------------------------------------------------------------

describe("PPT Error Handling", () => {
  it("should create PPTError with correct properties", () => {
    const error = new PPTError("Test error", PPT_ERROR_CODES.PLANNING_FAILED, {
      slideNumber: 5,
    });
    expect(error.message).toBe("Test error");
    expect(error.code).toBe(PPT_ERROR_CODES.PLANNING_FAILED);
    expect(error.name).toBe("PPTError");
  });

  it("should have all error codes defined", () => {
    expect(PPT_ERROR_CODES.PLANNING_FAILED).toBe("PPT_PLANNING_FAILED");
    expect(PPT_ERROR_CODES.INVALID_AI_RESPONSE).toBe("PPT_INVALID_AI_RESPONSE");
    expect(PPT_ERROR_CODES.IMAGE_GENERATION_FAILED).toBe(
      "PPT_IMAGE_GENERATION_FAILED",
    );
    expect(PPT_ERROR_CODES.ASSEMBLY_FAILED).toBe("PPT_ASSEMBLY_FAILED");
  });
});

// -----------------------------------------------------------------------
// PPT Context Extraction Tests
// -----------------------------------------------------------------------

describe("PPT Context Extraction", () => {
  it("should extract context from valid options", () => {
    const options: GenerateOptions = {
      input: { text: "AI Presentation" },
      provider: "vertex",
      output: {
        mode: "ppt",
        ppt: {
          pages: 12,
          theme: "corporate",
          audience: "business",
          tone: "professional",
        },
      },
    };
    const context = extractPPTContext(options);
    expect(context.topic).toBe("AI Presentation");
    expect(context.pages).toBe(12);
    expect(context.theme).toBe("corporate");
  });

  it("should use defaults for missing optional fields", () => {
    const options: GenerateOptions = {
      input: { text: "Minimal test" },
      output: { mode: "ppt", ppt: { pages: 8 } },
    };
    const context = extractPPTContext(options);
    expect(context.theme).toBe("AI will decide");
    expect(context.audience).toBe("AI will decide");
    expect(context.tone).toBe("AI will decide");
  });

  it("should throw PPTError when ppt options missing", () => {
    const options: GenerateOptions = {
      input: { text: "No PPT options" },
      output: { mode: "ppt" },
    };
    expect(() => extractPPTContext(options)).toThrow(PPTError);
  });
});

// -----------------------------------------------------------------------
// Content Structure Types Tests
// -----------------------------------------------------------------------

describe("Content Structure Types", () => {
  it("should define BulletPoint with optional sub-bullets", () => {
    const bullet: BulletPoint = {
      text: "Main",
      subBullets: ["Sub 1", "Sub 2"],
      emphasis: true,
    };
    expect(bullet.subBullets).toHaveLength(2);
  });

  it("should define TableCell with all properties", () => {
    const cell: TableCell = {
      text: "Cell",
      isHeader: true,
      colspan: 2,
      align: "center",
      fill: "#FF0000",
    };
    expect(cell.colspan).toBe(2);
  });

  it("should define ChartSeries with labels and values", () => {
    const series: ChartSeries = {
      name: "Revenue",
      labels: ["Q1", "Q2"],
      values: [100, 200],
      color: "#2563EB",
    };
    expect(series.labels.length).toBe(series.values.length);
  });

  it("should define Statistic with trend", () => {
    const stat: Statistic = {
      value: "98%",
      label: "Satisfaction",
      trend: "up",
      change: "+5%",
    };
    expect(stat.trend).toBe("up");
  });

  it("should define TimelineItem", () => {
    const item: TimelineItem = {
      date: "2024",
      title: "Launch",
      description: "Product launched",
    };
    expect(item.date).toBe("2024");
  });

  it("should define ProcessStep", () => {
    const step: ProcessStep = {
      step: 1,
      title: "Research",
      description: "Gather requirements",
    };
    expect(step.step).toBe(1);
  });

  it("should define ComparisonColumn", () => {
    const column: ComparisonColumn = {
      title: "Pro Plan",
      items: ["Feature 1", "Feature 2"],
      highlight: true,
    };
    expect(column.highlight).toBe(true);
  });
});

// -----------------------------------------------------------------------
// SlideSchema and ContentPlan Tests
// -----------------------------------------------------------------------

describe("SlideSchema and ContentPlan", () => {
  it("should define complete slide schema", () => {
    const slide: SlideSchema = {
      slideNumber: 1,
      type: "title",
      layout: "title-centered",
      title: "Welcome",
      content: { subtitle: "Subtitle" },
      imagePrompt: "Abstract background",
      speakerNotes: "Welcome everyone",
    };
    expect(slide.type).toBe("title");
    expect(slide.content.subtitle).toBe("Subtitle");
  });

  it("should define complete content plan", () => {
    const plan: ContentPlan = {
      title: "AI Overview",
      totalSlides: 3,
      audience: "technical",
      tone: "professional",
      theme: "modern",
      keyMessages: ["AI is transformative"],
      slides: [
        {
          slideNumber: 1,
          type: "title",
          layout: "title-centered",
          title: "AI",
          content: {},
          imagePrompt: null,
          speakerNotes: "",
        },
      ],
    };
    expect(plan.totalSlides).toBe(3);
    expect(plan.keyMessages).toHaveLength(1);
  });
});

// -----------------------------------------------------------------------
// Diagram vs Image Slide Types Tests
// -----------------------------------------------------------------------

describe("Diagram vs Image Slide Types", () => {
  it("should classify diagram slide types correctly", () => {
    expect(isDiagramSlideType("chart-bar")).toBe(true);
    expect(isDiagramSlideType("timeline")).toBe(true);
    expect(isDiagramSlideType("table")).toBe(true);
    expect(isDiagramSlideType("image-focus")).toBe(false);
  });

  it("should classify image slide types correctly", () => {
    expect(isImageSlideType("title")).toBe(true);
    expect(isImageSlideType("image-focus")).toBe(true);
    expect(isImageSlideType("gallery")).toBe(true);
    expect(isImageSlideType("chart-bar")).toBe(false);
  });

  it("should have correct sets defined", () => {
    expect(DIAGRAM_SLIDE_TYPES.has("statistics")).toBe(true);
    expect(IMAGE_SLIDE_TYPES.has("full-bleed-image")).toBe(true);
  });
});

// -----------------------------------------------------------------------
// Validation Constants & Helpers Tests
// -----------------------------------------------------------------------

describe("Validation Constants & Helpers", () => {
  it("should have correct slide range constants", () => {
    expect(MIN_SLIDES).toBe(5);
    expect(MAX_SLIDES).toBe(50);
  });

  it("should have correct slide dimensions", () => {
    expect(SLIDE_DIMENSIONS["16:9"]).toEqual({ width: 10, height: 5.625 });
    expect(SLIDE_DIMENSIONS["4:3"]).toEqual({ width: 10, height: 7.5 });
  });

  it("should validate hex colors correctly", () => {
    expect(isValidHexColor("000000")).toBe(true);
    expect(isValidHexColor("FFFFFF")).toBe(true);
    expect(isValidHexColor("0088CC")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(false);
    expect(isValidHexColor("GGG")).toBe(false);
  });

  it("should normalize hex colors", () => {
    expect(normalizeHexColor("#FF0000")).toBe("FF0000");
    expect(normalizeHexColor("FF0000")).toBe("FF0000");
  });
});

// -----------------------------------------------------------------------
// pptxgenjs Compatible Types Tests
// -----------------------------------------------------------------------

describe("pptxgenjs Compatible Types", () => {
  it("should support PositionProps with numbers and percentages", () => {
    const pos: PositionProps = { x: 1.5, y: "50%", w: 8.0, h: 4.5 };
    expect(pos.x).toBe(1.5);
  });

  it("should support ShadowProps", () => {
    const shadow: ShadowProps = {
      type: "outer",
      angle: 45,
      blur: 5,
      color: "000000",
      opacity: 0.5,
    };
    expect(shadow.type).toBe("outer");
  });

  it("should support ImageProps", () => {
    const img: ImageProps = {
      path: "https://example.com/img.png",
      x: 1,
      y: 1,
      w: 4,
      h: 3,
      rotate: 45,
    };
    expect(img.rotate).toBe(45);
  });

  it("should support ChartOptions", () => {
    const opts: ChartOptions = {
      title: "Sales",
      showLegend: true,
      legendPos: "b",
      chartColors: ["0088CC", "FF6600"],
    };
    expect(opts.chartColors?.length).toBe(2);
  });

  it("should support TableOptions", () => {
    const opts: TableOptions = {
      colW: [1.5, 2.0, 3.0],
      autoPage: true,
      autoPageRepeatHeader: true,
    };
    expect((opts.colW as number[]).length).toBe(3);
  });

  it("should support ShapeProps", () => {
    const shape: ShapeProps = {
      x: 1,
      y: 1,
      w: 3,
      h: 2,
      fill: { color: "0088CC" },
      rotate: 45,
    };
    expect(shape.fill?.color).toBe("0088CC");
  });
});

// -----------------------------------------------------------------------
// Edge Cases Tests
// -----------------------------------------------------------------------

describe("Edge Cases", () => {
  it("should handle chart data edge cases", () => {
    const emptySeries: ChartSeries = { name: "Empty", labels: [], values: [] };
    const negativeSeries: ChartSeries = {
      name: "PL",
      labels: ["Q1", "Q2"],
      values: [-50, 100],
    };
    expect(emptySeries.labels.length).toBe(0);
    expect(negativeSeries.values[0]).toBeLessThan(0);
  });

  it("should handle table edge cases", () => {
    const cell: TableCell = { text: "", colspan: 3, rowspan: 2 };
    expect(cell.text).toBe("");
    expect(cell.colspan).toBe(3);
  });

  it("should handle position boundary values", () => {
    const pos: PositionProps = { x: 0, y: 0, w: 100, h: 100 };
    expect(pos.x).toBe(0);
  });

  it("should handle SlideSchema edge cases", () => {
    const slide: SlideSchema = {
      slideNumber: 50,
      type: "closing",
      layout: "contact-info",
      title: "Last",
      content: {},
      imagePrompt: null,
      speakerNotes: "A".repeat(10000),
    };
    expect(slide.slideNumber).toBe(50);
    expect(slide.speakerNotes.length).toBe(10000);
  });

  it("should handle ContentPlan min/max slides", () => {
    const minPlan: ContentPlan = {
      title: "Short",
      totalSlides: 5,
      audience: "general",
      tone: "professional",
      theme: "modern",
      slides: Array.from({ length: 5 }, (_, i) => ({
        slideNumber: i + 1,
        type: "content" as SlideType,
        layout: "title-content" as SlideLayout,
        title: `Slide ${i + 1}`,
        content: {},
        imagePrompt: null,
        speakerNotes: "",
      })),
    };
    expect(minPlan.totalSlides).toBe(5);
  });
});

// -----------------------------------------------------------------------
// Guidelines Tests
// -----------------------------------------------------------------------

describe("Guidelines", () => {
  it("should have guidelines for all audiences", () => {
    expect(AUDIENCE_GUIDELINES.business).toBeDefined();
    expect(AUDIENCE_GUIDELINES.students).toBeDefined();
    expect(AUDIENCE_GUIDELINES.technical).toBeDefined();
    expect(AUDIENCE_GUIDELINES.general).toBeDefined();
  });

  it("should have guidelines for all tones", () => {
    expect(TONE_GUIDELINES.professional).toBeDefined();
    expect(TONE_GUIDELINES.casual).toBeDefined();
    expect(TONE_GUIDELINES.educational).toBeDefined();
    expect(TONE_GUIDELINES.persuasive).toBeDefined();
  });

  it("should have VALID_AUDIENCES and VALID_TONES constants", () => {
    expect(VALID_AUDIENCES).toContain("business");
    expect(VALID_TONES).toContain("professional");
  });
});

// -----------------------------------------------------------------------
// SlideGenerator Tests
// -----------------------------------------------------------------------

// Mock NeuroLink
const mockNeuroLink = { generate: vi.fn() };

// Test fixtures
const createMockConfig = (
  overrides: Partial<SlideGeneratorConfig> = {},
): SlideGeneratorConfig => ({
  theme: "modern",
  generateAIImages: false,
  aspectRatio: "16:9",
  ...overrides,
});

const createMockSlideSchema = (
  overrides: Partial<SlideSchema> = {},
): SlideSchema => ({
  slideNumber: 1,
  type: "content",
  layout: "title-content",
  title: "Test Slide",
  content: {
    bullets: [
      { text: "Point 1", emphasis: false },
      { text: "Point 2", emphasis: true },
    ],
  },
  imagePrompt: null,
  speakerNotes: "Notes",
  ...overrides,
});

const createTitleSlide = (): SlideSchema => ({
  slideNumber: 1,
  type: "title",
  layout: "title-centered",
  title: "Title",
  content: { subtitle: "Subtitle" },
  imagePrompt: null,
  speakerNotes: "",
});

const createThankYouSlide = (n: number): SlideSchema => ({
  slideNumber: n,
  type: "thank-you",
  layout: "contact-info",
  title: "Thank You!",
  content: { cta: "Questions?" },
  imagePrompt: null,
  speakerNotes: "",
});

describe("SlideGenerator", () => {
  describe("constructor", () => {
    it("should create instance with string/custom themes", () => {
      expect(
        new SlideGenerator(createMockConfig({ theme: "modern" })),
      ).toBeInstanceOf(SlideGenerator);
      expect(
        new SlideGenerator(createMockConfig({ theme: "corporate" })),
      ).toBeInstanceOf(SlideGenerator);
      const customTheme: PresentationTheme = {
        name: "custom",
        displayName: "Custom Theme",
        description: "A custom test theme",
        colors: {
          primary: "#FF0000",
          secondary: "#00FF00",
          accent: "#0000FF",
          background: "#FFF",
          text: "#000",
          textOnPrimary: "#FFF",
          muted: "#666",
        },
        fonts: {
          heading: "Arial",
          body: "Helvetica",
          sizes: {
            title: 44,
            subtitle: 24,
            heading: 28,
            body: 18,
            caption: 12,
          },
        },
      };
      expect(
        new SlideGenerator(createMockConfig({ theme: customTheme })),
      ).toBeInstanceOf(SlideGenerator);
    });

    it("should create via factory", () => {
      expect(createSlideGenerator(createMockConfig())).toBeInstanceOf(
        SlideGenerator,
      );
    });
  });

  describe("generateSlide", () => {
    it("should generate slide and handle all types", async () => {
      const gen = createSlideGenerator(createMockConfig());
      const result = await gen.generateSlide(createMockSlideSchema());
      expect(result.slideNumber).toBe(1);
      expect(result.schema).toBeDefined();

      const types: SlideType[] = [
        "title",
        "content",
        "bullets",
        "quote",
        "statistics",
        "timeline",
        "chart-bar",
        "table",
        "thank-you",
      ];
      for (const type of types) {
        const r = await gen.generateSlide(createMockSlideSchema({ type }));
        expect(r.slideNumber).toBe(1);
      }
    });

    it("should skip images when generateAIImages=false", async () => {
      const gen = createSlideGenerator(
        createMockConfig({ generateAIImages: false }),
      );
      const result = await gen.generateSlide(
        createMockSlideSchema({ imagePrompt: "test" }),
      );
      expect(result.imageBuffer).toBeUndefined();
    });
  });

  describe("generateSlides (batch)", () => {
    it("should generate multiple slides", async () => {
      const gen = createSlideGenerator(createMockConfig());
      const schemas = [
        createTitleSlide(),
        createMockSlideSchema({ slideNumber: 2 }),
        createThankYouSlide(3),
      ];
      const result = await gen.generateSlides(schemas);
      expect(result.slides).toHaveLength(3);
      expect(result.generationTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty array", async () => {
      const result = await createSlideGenerator(
        createMockConfig(),
      ).generateSlides([]);
      expect(result.slides).toHaveLength(0);
    });
  });

  describe("renderSlide", () => {
    it("should render slides to pptxgenjs", () => {
      const gen = createSlideGenerator(createMockConfig());
      const ppt = new PptxGenJS();
      ppt.layout = "LAYOUT_16x9";

      const types: SlideType[] = [
        "title",
        "content",
        "bullets",
        "quote",
        "statistics",
        "timeline",
        "two-column",
        "blank",
      ];
      types.forEach((type) => {
        const slide: CompleteSlide = {
          slideNumber: 1,
          schema: createMockSlideSchema({ type }),
          generationTime: 10,
        };
        expect(() => gen.renderSlide(ppt, slide, 1, 5)).not.toThrow();
      });
    });
  });
});

describe("Logo Configuration", () => {
  it("should support all logo options", () => {
    const ppt = new PptxGenJS();
    ppt.layout = "LAYOUT_16x9";
    const slide: CompleteSlide = {
      slideNumber: 1,
      schema: createMockSlideSchema(),
      generationTime: 10,
    };

    // No logo
    expect(() =>
      createSlideGenerator(createMockConfig()).renderSlide(ppt, slide, 1, 5),
    ).not.toThrow();

    // Base64 string
    expect(() =>
      createSlideGenerator(
        createMockConfig({ logo: "data:image/png;base64,test" }),
      ).renderSlide(ppt, slide, 1, 5),
    ).not.toThrow();

    // Buffer
    expect(() =>
      createSlideGenerator(
        createMockConfig({ logo: Buffer.from("test") }),
      ).renderSlide(ppt, slide, 1, 5),
    ).not.toThrow();

    // Full config with positions
    const positions: LogoPosition[] = [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ];
    positions.forEach((pos) => {
      const cfg: LogoConfig = {
        data: "data:image/png;base64,test",
        position: pos,
        width: 1,
        height: 0.5,
        showOn: "all-slides",
      };
      expect(() =>
        createSlideGenerator(createMockConfig({ logo: cfg })).renderSlide(
          ppt,
          slide,
          1,
          5,
        ),
      ).not.toThrow();
    });
  });
});

describe("Slide Content Rendering", () => {
  const gen = createSlideGenerator(createMockConfig());
  const ppt = () => {
    const p = new PptxGenJS();
    p.layout = "LAYOUT_16x9";
    return p;
  };
  const render = (schema: SlideSchema) =>
    gen.renderSlide(
      ppt(),
      { slideNumber: 1, schema, generationTime: 10 },
      1,
      5,
    );

  it("should render statistics", () => {
    expect(() =>
      render(
        createMockSlideSchema({
          type: "statistics",
          content: {
            statistics: [
              { value: "95%", label: "Growth", trend: "up", change: "+5%" },
            ],
          },
        }),
      ),
    ).not.toThrow();
  });

  it("should render quote", () => {
    expect(() =>
      render(
        createMockSlideSchema({
          type: "quote",
          content: {
            quote: "Test quote",
            quoteAuthor: "Author",
            quoteAuthorTitle: "Title",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("should render timeline", () => {
    expect(() =>
      render(
        createMockSlideSchema({
          type: "timeline",
          content: {
            timeline: {
              orientation: "horizontal",
              items: [{ date: "2020", title: "Event", description: "Desc" }],
            },
          },
        }),
      ),
    ).not.toThrow();
  });

  it("should render charts", () => {
    expect(() =>
      render(
        createMockSlideSchema({
          type: "chart-bar",
          content: {
            chartData: {
              type: "bar",
              title: "Chart",
              series: [{ name: "S1", labels: ["A"], values: [10] }],
            },
          },
        }),
      ),
    ).not.toThrow();
  });

  it("should render table", () => {
    expect(() =>
      render(
        createMockSlideSchema({
          type: "table",
          content: {
            tableData: {
              hasHeader: true,
              headers: ["Col1"],
              rows: [[{ text: "Val" }]],
            },
          },
        }),
      ),
    ).not.toThrow();
  });

  it("should render columns", () => {
    expect(() =>
      render(
        createMockSlideSchema({
          type: "two-column",
          content: {
            leftColumn: { title: "L", bullets: [] },
            rightColumn: { title: "R", bullets: [] },
          },
        }),
      ),
    ).not.toThrow();
  });
});

describe("Image Generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should skip when no neurolink or generateAIImages=false", async () => {
    const gen = createSlideGenerator(
      createMockConfig({ generateAIImages: true }),
    );
    const r = await gen.generateSlide(
      createMockSlideSchema({ type: "image-focus", imagePrompt: "test" }),
    );
    expect(r.imageBuffer).toBeUndefined();
  });

  it("should generate images with neurolink", async () => {
    // Create a minimal valid PNG buffer (PNG magic bytes + enough data)
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    const padding = Buffer.alloc(100); // Ensure minimum size
    const validPngBuffer = Buffer.concat([pngHeader, padding]);
    const validBase64 = validPngBuffer.toString("base64");

    mockNeuroLink.generate.mockResolvedValue({
      imageOutput: { base64: validBase64 },
      model: "gemini",
    });
    const gen = createSlideGenerator(
      createMockConfig({
        generateAIImages: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        neurolink: mockNeuroLink as any,
      }),
    );
    const r = await gen.generateSlide(
      createMockSlideSchema({ type: "image-focus", imagePrompt: "test" }),
    );
    expect(mockNeuroLink.generate).toHaveBeenCalled();
    expect(r.imageBuffer).toBeInstanceOf(Buffer);
  });

  it("should handle errors gracefully", async () => {
    // Suppress error logs during this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockNeuroLink.generate.mockRejectedValue(new Error("Failed"));
    const gen = createSlideGenerator(
      createMockConfig({
        generateAIImages: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        neurolink: mockNeuroLink as any,
      }),
    );
    const r = await gen.generateSlide(
      createMockSlideSchema({ type: "image-focus", imagePrompt: "test" }),
    );
    expect(r.imageBuffer).toBeUndefined();
    consoleSpy.mockRestore();
  });
});

describe("PptxGenJS Export", () => {
  it("should export and work correctly", () => {
    expect(PptxGenJS).toBeDefined();
    const ppt = new PptxGenJS();
    expect(ppt.addSlide).toBeDefined();
    ppt.layout = "LAYOUT_16x9";
    expect(ppt.layout).toBe("LAYOUT_16x9");
  });
});

describe("Theme Application", () => {
  it("should apply all themes", () => {
    const ppt = new PptxGenJS();
    ppt.layout = "LAYOUT_16x9";
    const slide: CompleteSlide = {
      slideNumber: 1,
      schema: createMockSlideSchema(),
      generationTime: 10,
    };

    ["modern", "corporate", "creative", "minimal", "dark"].forEach((theme) => {
      expect(() =>
        createSlideGenerator(createMockConfig({ theme })).renderSlide(
          ppt,
          slide,
          1,
          5,
        ),
      ).not.toThrow();
    });
  });
});

describe("E2E Integration", () => {
  it("should generate and render complete presentation", async () => {
    const schemas = [
      createTitleSlide(),
      createMockSlideSchema({ slideNumber: 2 }),
      createThankYouSlide(3),
    ];
    const result = await generateSlidesFromPlan(schemas, createMockConfig());
    expect(result.slides).toHaveLength(3);

    const ppt = new PptxGenJS();
    ppt.layout = "LAYOUT_16x9";
    const gen = createSlideGenerator(createMockConfig());
    result.slides.forEach((s, i) =>
      expect(() => gen.renderSlide(ppt, s, i + 1, 3)).not.toThrow(),
    );
  });
});

// -----------------------------------------------------------------------
// Presentation Orchestrator Tests (Stage 4)
// -----------------------------------------------------------------------

import {
  validatePPTGenerationInput as orchestratorValidateInput,
  type PPTValidationResult,
} from "../../src/lib/features/ppt/index.js";

describe("Presentation Orchestrator", () => {
  describe("validatePPTGenerationInput", () => {
    it("should validate valid PPT generation options", () => {
      const options = {
        input: { text: "Introduction to Machine Learning" },
        output: {
          mode: "ppt",
          ppt: { pages: 10, theme: "modern" },
        },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing input.text", () => {
      const options = {
        input: {},
        output: { mode: "ppt", ppt: { pages: 10 } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) => e.field === "input.text",
        ),
      ).toBe(true);
    });

    it("should reject topic too short", () => {
      const options = {
        input: { text: "Hi" },
        output: { mode: "ppt", ppt: { pages: 10 } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e: { field: string; message: string }) =>
          e.message.includes("minimum 10 required"),
        ),
      ).toBe(true);
    });

    it("should reject topic too long", () => {
      const options = {
        input: { text: "x".repeat(1001) },
        output: { mode: "ppt", ppt: { pages: 10 } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e: { field: string; message: string }) =>
          e.message.includes("1000"),
        ),
      ).toBe(true);
    });

    it("should reject missing output.ppt", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt" },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) => e.field === "output.ppt",
        ),
      ).toBe(true);
    });

    it("should reject pages less than 5", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 4 } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) =>
            e.field === "output.ppt.pages",
        ),
      ).toBe(true);
    });

    it("should reject pages greater than 50", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 51 } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e: { field: string; message: string }) =>
          e.message.includes("50"),
        ),
      ).toBe(true);
    });

    it("should reject invalid theme", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 10, theme: "invalid-theme" } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) =>
            e.field === "output.ppt.theme",
        ),
      ).toBe(true);
    });

    it("should accept all valid themes", () => {
      const validThemes = [
        "modern",
        "corporate",
        "creative",
        "minimal",
        "dark",
      ];

      for (const theme of validThemes) {
        const options = {
          input: { text: "Valid topic for presentation" },
          output: { mode: "ppt", ppt: { pages: 10, theme } },
        };
        expect(orchestratorValidateInput(options).isValid).toBe(true);
      }
    });

    it("should reject invalid aspect ratio", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 10, aspectRatio: "21:9" } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) =>
            e.field === "output.ppt.aspectRatio",
        ),
      ).toBe(true);
    });

    it("should accept all valid aspect ratios", () => {
      const validRatios = ["16:9", "4:3"];

      for (const aspectRatio of validRatios) {
        const options = {
          input: { text: "Valid topic for presentation" },
          output: { mode: "ppt", ppt: { pages: 10, aspectRatio } },
        };
        expect(orchestratorValidateInput(options).isValid).toBe(true);
      }
    });

    it("should reject invalid format", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 10, format: "pdf" } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) =>
            e.field === "output.ppt.format",
        ),
      ).toBe(true);
    });

    it("should reject invalid audience", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 10, audience: "aliens" } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) =>
            e.field === "output.ppt.audience",
        ),
      ).toBe(true);
    });

    it("should reject invalid tone", () => {
      const options = {
        input: { text: "Valid topic for presentation" },
        output: { mode: "ppt", ppt: { pages: 10, tone: "mysterious" } },
      };

      const result = orchestratorValidateInput(options);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: { field: string; message: string }) =>
            e.field === "output.ppt.tone",
        ),
      ).toBe(true);
    });

    it("should accept valid audiences without warnings", () => {
      const validAudiences = ["general", "business", "technical", "students"];

      for (const audience of validAudiences) {
        const options = {
          input: { text: "Valid topic for presentation" },
          output: { mode: "ppt", ppt: { pages: 10, audience } },
        };
        const result = orchestratorValidateInput(options);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });

    it("should accept valid tones without warnings", () => {
      const validTones = [
        "professional",
        "casual",
        "educational",
        "persuasive",
      ];

      for (const tone of validTones) {
        const options = {
          input: { text: "Valid topic for presentation" },
          output: { mode: "ppt", ppt: { pages: 10, tone } },
        };
        const result = orchestratorValidateInput(options);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      }
    });
  });

  describe("PPTGenerationContext extraction", () => {
    it("should extract context with all defaults", () => {
      const options: GenerateOptions = {
        input: { text: "Machine Learning Basics" },
        output: { mode: "ppt", ppt: { pages: 10 } },
      };

      const context = extractPPTContext(options);
      expect(context.topic).toBe("Machine Learning Basics");
      expect(context.pages).toBe(10);
      expect(context.theme).toBe("AI will decide");
      expect(context.audience).toBe("AI will decide");
      expect(context.tone).toBe("AI will decide");
      expect(context.generateAIImages).toBe(false);
      expect(context.aspectRatio).toBe("16:9");
    });

    it("should extract context with custom options", () => {
      const options: GenerateOptions = {
        input: { text: "Business Analytics" },
        output: {
          mode: "ppt",
          ppt: {
            pages: 15,
            theme: "corporate",
            audience: "business",
            tone: "professional",
            generateAIImages: false,
            aspectRatio: "4:3",
            outputPath: "/custom/path/pres.pptx",
          },
        },
        provider: "vertex",
        model: "gemini-2.0-flash",
      };

      const context = extractPPTContext(options);
      expect(context.topic).toBe("Business Analytics");
      expect(context.pages).toBe(15);
      expect(context.theme).toBe("corporate");
      expect(context.audience).toBe("business");
      expect(context.tone).toBe("professional");
      expect(context.generateAIImages).toBe(false);
      expect(context.aspectRatio).toBe("4:3");
      expect(context.outputPath).toBe("/custom/path/pres.pptx");
      expect(context.provider).toBe("vertex");
      expect(context.model).toBe("gemini-2.0-flash");
    });

    it("should throw PPTError when ppt options are missing", () => {
      const options: GenerateOptions = {
        input: { text: "No PPT options" },
        output: { mode: "text" },
      };

      expect(() => extractPPTContext(options)).toThrow(PPTError);
    });
  });
});
