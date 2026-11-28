/**
 * Provider Image Adapter - Smart routing for multimodal content
 * Handles provider-specific image formatting and vision capability validation
 */

import type { Content, ImageWithAltText } from "../types/index.js";
import { ImageProcessor } from "../utils/imageProcessor.js";
import { logger } from "../utils/logger.js";
import { resolveManifestEntryStrict } from "../models/manifestRegistry.js";
import { getCatalogJsonEntries } from "../providers/catalog/loader.js";
import { getModelFamilyPatterns } from "../providers/rules/modelFamilies.js";
import { getProviderRules } from "../providers/rules/registry.js";

/**
 * Simplified logger for essential error reporting only
 */
export class MultimodalLogger {
  static logError(step: string, error: Error, context: unknown) {
    logger.error(`Multimodal ${step} failed: ${error.message}`);
    if (process.env.NODE_ENV === "development") {
      logger.error("Context:", JSON.stringify(context, null, 2));
      logger.error("Stack:", error.stack);
    }
  }
}

/**
 * Vision rules (vision.json): image limits per provider, proxy providers,
 * provider aliases, vision model ids and vision model families.
 */
const VISION_RULES = getProviderRules("vision");

/**
 * Image count limits per provider. These limits prevent API rejections when
 * too many images are sent. Vertex has one limit per model family.
 */
const IMAGE_LIMITS = VISION_RULES.imageLimits ?? {};
const VERTEX_IMAGE_LIMITS = IMAGE_LIMITS.vertex as Record<string, number>;
const DEFAULT_IMAGE_LIMIT = VISION_RULES.imageLimitDefault ?? 10;

/**
 * Proxy providers that route to arbitrary underlying models.
 * Vision capability cannot be statically determined for these — pass requests
 * through and let the underlying provider surface errors if needed.
 */
const PROXY_PROVIDERS = new Set(VISION_RULES.proxyProviders ?? []);

/**
 * Family-level vision rules, checked ONLY after a model id misses the exact
 * VISION_CAPABILITIES allowlist for its provider (vision.json
 * `visionFamilies`, patterns in model-families.json).
 */
const VISION_FAMILY_RULES: Partial<Record<string, RegExp[]>> =
  Object.fromEntries(
    Object.entries(VISION_RULES.visionFamilies ?? {}).map(
      ([provider, family]) => [provider, getModelFamilyPatterns(family)],
    ),
  );

/**
 * Normalize provider name/alias to its canonical form for vision checks.
 */
const VISION_ALIASES = VISION_RULES.providerAliases ?? {};

function normalizeVisionProvider(provider: string): string {
  const lower = provider.toLowerCase();
  // Strip non-alpha characters so alias forms (e.g. "lm-studio", "lm_studio",
  // "llama.cpp", "nvidia_nim") all collapse onto a canonical key. Mirrors
  // the alias-normalization pattern used in pricing.ts and contextWindows.ts.
  const stripped = lower.replace(/[^a-z]/g, "");
  return Object.hasOwn(VISION_ALIASES, stripped)
    ? VISION_ALIASES[stripped]
    : lower;
}

/**
 * Derived from 15 of the 16 JSON-catalog providers (every one except
 * Mistral — see below), by reading models.catalog[*].vision. Derivation
 * does not mean vision-capable: only a provider with ≥1 vision model gets a
 * key here, so of those 15 only 8 (api-route, baseten, cerebras, fireworks,
 * groq, io-intelligence, sambanova, xai) currently contribute a row. The
 * other 7 (cloudflare, gmicloud, inception-labs, mancer, perplexity,
 * together-ai, upstage) have no vision model in the current catalog and are
 * omitted — an absent key and a present-but-empty array are handled
 * identically by supportsVision()/getSupportedModels()/getVisionProviders()
 * below (all three treat "no entry" and "empty array" the same way), so
 * omitting them changes nothing at runtime. This list moves as the catalog
 * JSON does; re-derive rather than trust these names to stay current.
 * Fireworks previously had 3 hand-written vision entries
 * ("phi-3-vision-128k-instruct", "llama-v3p2-90b/11b-vision-instruct");
 * none of those model ids exist in the catalog's current (fully refreshed)
 * roster, but three different models (two Kimi variants, one Qwen) now carry
 * vision: true, so Fireworks is derived here rather than omitted.
 *
 * Mistral is the remaining catalog provider but is excluded here and stays
 * fully hand-written in VISION_CAPABILITIES.mistral below: its JSON vision list
 * (14 exact model ids) diverges from the hand list in both directions — the
 * hand list carries bare-name fallback entries ("mistral-small",
 * "mistral-medium", "magistral-small", "magistral-medium") that widen
 * supportsVision()'s substring match to any future dated variant, which the
 * JSON's exact-id list doesn't reproduce, and some hand ids
 * ("mistral-small-3.2", "mistral-medium-3.1") don't correspond to any
 * catalog entry at all. Deriving it would silently narrow vision matching
 * for a currently-shipping provider, so it is left alone — the same
 * treatment Mistral already got in providerDescriptors.ts and pricing.ts
 * for analogous real-value-mismatch reasons.
 */
const CATALOG_VISION_MODELS: Record<string, readonly string[]> =
  Object.fromEntries(
    getCatalogJsonEntries()
      .filter((entry) => entry.id !== "mistral")
      .flatMap((entry) => {
        const visionModels = Object.entries(entry.models.catalog)
          .filter(([, spec]) => spec.vision)
          .map(([modelId]) => modelId);
        return visionModels.length > 0
          ? [[entry.id, visionModels] as const]
          : [];
      }),
  );

/**
 * Vision-capable model ids per provider: the catalog's, then vision.json's
 * hand-kept lists (which win for a provider in both). An empty list means
 * the provider has no image input.
 */
const VISION_CAPABILITIES: Record<string, readonly string[]> = {
  ...CATALOG_VISION_MODELS,
  ...VISION_RULES.visionModels,
};

/**
 * Provider Image Adapter - Smart routing and formatting
 */
export class ProviderImageAdapter {
  // NOTE: The legacy `adaptForProvider` method and its private helpers
  // (formatForOpenAI, formatForGoogleAI, formatForAnthropic, formatForVertex,
  // validateVisionSupport) were removed as dead code. The production image
  // pipeline uses `convertSimpleImagesToProviderFormat` in messageBuilder.ts
  // with Vercel AI SDK's native ImagePart format. Image count limits are
  // enforced via the public `validateImageCount` method below.

  /**
   * Validate image count against provider limits.
   * Warns at 80% threshold, throws error if limit exceeded.
   */
  static validateImageCount(
    imageCount: number,
    provider: string,
    model?: string,
  ): void {
    const normalizedProvider = provider.toLowerCase();
    let limit: number;

    // Determine the limit based on provider
    if (normalizedProvider === "vertex" && model) {
      // Vertex has model-specific limits
      if (model.includes("claude")) {
        limit = VERTEX_IMAGE_LIMITS.claude;
      } else if (model.includes("gemini")) {
        limit = VERTEX_IMAGE_LIMITS.gemini;
      } else {
        limit = VERTEX_IMAGE_LIMITS.default;
      }
    } else {
      // Use provider-specific limit
      const providerLimit =
        normalizedProvider in IMAGE_LIMITS
          ? IMAGE_LIMITS[normalizedProvider]
          : undefined;

      // If provider not found in limits map, use a conservative default
      if (providerLimit === undefined) {
        // Conservative default for unknown providers
        limit = DEFAULT_IMAGE_LIMIT;
        logger.warn(
          `Image count limit not defined for provider ${provider}. Using conservative default of ${DEFAULT_IMAGE_LIMIT} images.`,
        );
      } else {
        // providerLimit is always a number when defined (except vertex which is handled separately)
        limit = providerLimit as number;
      }
    }

    // Warn only once at 80% threshold to avoid noise in batch processing
    const warningThreshold = Math.floor(limit * 0.8);
    if (imageCount === warningThreshold) {
      logger.warn(
        `Image count (${imageCount}) is approaching the limit for ${provider}. ` +
          `Maximum allowed: ${limit}. Please reduce the number of images.`,
      );
    }

    // Throw error if limit exceeded
    if (imageCount > limit) {
      throw new Error(
        `Image count (${imageCount}) exceeds the maximum limit for ${provider}. ` +
          `Maximum allowed: ${limit}. Please reduce the number of images.`,
      );
    }
  }

  /**
   * Convert simple images array to advanced content format
   * @param text - Text content to include
   * @param images - Array of images (Buffer, string, or ImageWithAltText)
   */
  static convertToContent(
    text: string,
    images?: Array<Buffer | string | ImageWithAltText>,
  ): Content[] {
    const content: Content[] = [{ type: "text", text }];

    if (images && images.length > 0) {
      images.forEach((image) => {
        // Handle both simple images and images with alt text
        const imageData =
          typeof image === "object" &&
          "data" in image &&
          !Buffer.isBuffer(image)
            ? image.data
            : (image as Buffer | string);
        const altText =
          typeof image === "object" &&
          "data" in image &&
          !Buffer.isBuffer(image)
            ? image.altText
            : undefined;

        content.push({
          type: "image",
          data: imageData,
          altText,
          mediaType: ImageProcessor.detectImageType(imageData) as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp"
            | "image/bmp"
            | "image/tiff",
        });
      });
    }

    return content;
  }

  /**
   * Check if provider supports multimodal content
   */
  static supportsVision(provider: string, model?: string): boolean {
    try {
      const normalizedProvider = normalizeVisionProvider(provider);

      // Anthropic behind a proxy (ANTHROPIC_BASE_URL set) routes to whatever
      // the proxy exposes — capability gating is the upstream's job. Mirrors
      // the validateModelAccess tier-check bypass in providers/anthropic.ts.
      if (
        normalizedProvider === "anthropic" &&
        process.env.ANTHROPIC_BASE_URL
      ) {
        return true;
      }

      // Manifest is the source of truth when it has an entry for this exact
      // model or a declared alias ONLY — strict, no prefix fallback: a
      // manifest "gpt-4" prefix hit must never shadow the legacy table's
      // explicit "gpt-4-vision-preview" row, and a fabricated id must not
      // borrow a real family's capabilities. Everything without a real
      // manifest match falls through to the legacy tables below unchanged.
      const manifestEntry = resolveManifestEntryStrict(
        normalizedProvider,
        model ?? "",
      );
      if (manifestEntry) {
        if (!model) {
          return true;
        }
        if (manifestEntry.vision) {
          return true;
        }
        if (PROXY_PROVIDERS.has(normalizedProvider)) {
          return true;
        }
        return false;
      }

      const supportedModels =
        VISION_CAPABILITIES[
          normalizedProvider as keyof typeof VISION_CAPABILITIES
        ];

      if (!supportedModels) {
        return false;
      }

      // An empty list means the provider has NO vision support.
      // Without this guard, the no-model branch below would return `true` for
      // every provider that has an entry in VISION_CAPABILITIES — even an empty
      // one — letting vision requests through to a text-only API.
      if (supportedModels.length === 0) {
        return false;
      }

      if (!model) {
        return true; // Provider supports vision, but need to check specific model
      }

      const modelMatched = supportedModels.some((supportedModel) =>
        model.toLowerCase().includes(supportedModel.toLowerCase()),
      );

      if (
        !modelMatched &&
        VISION_FAMILY_RULES[normalizedProvider]?.some((rule) =>
          rule.test(model),
        )
      ) {
        return true;
      }

      // Proxy providers route to arbitrary underlying models — pass through if
      // the model isn't in the known allowlist.
      if (!modelMatched && PROXY_PROVIDERS.has(normalizedProvider)) {
        return true;
      }

      return modelMatched;
    } catch {
      return false;
    }
  }

  /**
   * Get supported models for a provider
   */
  static getSupportedModels(provider: string): string[] {
    const normalizedProvider = provider.toLowerCase();
    const models =
      VISION_CAPABILITIES[
        normalizedProvider as keyof typeof VISION_CAPABILITIES
      ];
    return models ? [...models] : [];
  }

  /**
   * Get all vision-capable providers
   */
  static getVisionProviders(): string[] {
    // Filter out providers whose allowlist is empty. They're
    // listed in VISION_CAPABILITIES so supportsVision can return false for
    // them, but they should not be advertised as vision-capable.
    return Object.entries(VISION_CAPABILITIES)
      .filter(([, models]) => models.length > 0)
      .map(([provider]) => provider);
  }

  /**
   * Count total "images" in a message (actual images + PDF pages)
   * PDF pages count toward image limits for providers
   */
  static countImagesInMessage(
    images: Array<Buffer | string>,
    pdfPages?: number | null,
  ): number {
    const imageCount = images?.length || 0;
    const pageCount = pdfPages ?? 0;
    return imageCount + pageCount;
  }

  /**
   * Extract page count from PDF metadata array
   * Returns total pages across all PDFs
   */
  static countImagesInPages(
    pdfMetadataArray: Array<{ pageCount?: number | null }> | undefined,
  ): number {
    if (!pdfMetadataArray || pdfMetadataArray.length === 0) {
      return 0;
    }
    return pdfMetadataArray.reduce((total, pdf) => {
      return total + (pdf.pageCount ?? 0);
    }, 0);
  }
}
