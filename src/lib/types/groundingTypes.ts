/**
 * Enhanced grounding metadata types for web search and source attribution.
 *
 * This module provides type definitions for grounding AI responses with
 * web search results and source attribution. Grounding helps ensure AI
 * responses are backed by verifiable sources and provides transparency
 * about where information originates.
 *
 * @module groundingTypes
 */

/**
 * Represents a grounding source with enhanced metadata for search results.
 * Used when grounding responses with web search or retrieval results to
 * provide detailed information about each source that supports the AI response.
 *
 * @example
 * const source: EnhancedGroundingSource = {
 *   uri: "https://docs.example.com/api-reference",
 *   title: "API Reference Documentation",
 *   domain: "docs.example.com",
 *   confidenceScore: 0.95,
 *   isPrimary: true,
 *   chunkIndex: 0
 * };
 */
export type EnhancedGroundingSource = {
  /** The full URI/URL of the source document */
  uri: string;
  /** The title of the source document or web page */
  title: string;
  /** The domain name extracted from the URI (e.g., "example.com") */
  domain: string;
  /** Confidence score (0-1) indicating how well this source supports the response */
  confidenceScore?: number;
  /** Whether this is a primary source for the grounded response */
  isPrimary?: boolean;
  /** Index of the chunk within the source document that was used */
  chunkIndex?: number;
};

/**
 * Represents the support relationship between a text segment and a source.
 * Links a specific source (by index) to the segment it supports with a
 * confidence score indicating the strength of the attribution.
 *
 * @example
 * const support: SegmentSupport = {
 *   sourceIndex: 0,  // References first source in the sources array
 *   confidence: 0.92
 * };
 */
export type SegmentSupport = {
  /** Index into the sources array identifying which source supports this segment */
  sourceIndex: number;
  /** Confidence score (0-1) for how strongly this source supports the segment */
  confidence: number;
};

/**
 * Represents attribution information for a specific segment of the AI response.
 * Maps portions of the generated text to their supporting sources, enabling
 * fine-grained source attribution throughout the response.
 *
 * @example
 * const attribution: SegmentAttribution = {
 *   text: "The API supports RESTful operations",
 *   startIndex: 0,
 *   endIndex: 35,
 *   partIndex: 0,
 *   supportingSources: [
 *     { sourceIndex: 0, confidence: 0.95 },
 *     { sourceIndex: 2, confidence: 0.78 }
 *   ]
 * };
 */
export type SegmentAttribution = {
  /** The actual text content of this segment from the response */
  text: string;
  /** Starting character index of this segment in the full response text */
  startIndex: number;
  /** Ending character index of this segment in the full response text */
  endIndex: number;
  /** Index of the response part this segment belongs to (for multi-part responses) */
  partIndex: number;
  /** Array of sources that support this segment with their confidence scores */
  supportingSources: SegmentSupport[];
};

/**
 * Represents a search result returned from web search grounding.
 * Contains the essential information from a web search result that
 * can be used to ground and verify AI responses.
 *
 * @example
 * const result: EnhancedSearchResult = {
 *   uri: "https://blog.example.com/best-practices",
 *   title: "Best Practices Guide",
 *   snippet: "This guide covers the essential best practices for..."
 * };
 */
export type EnhancedSearchResult = {
  /** The full URI/URL of the search result */
  uri: string;
  /** The title of the search result page */
  title: string;
  /** Optional text snippet from the search result showing relevant content */
  snippet?: string;
};

/**
 * Comprehensive grounding metadata containing all information about how
 * an AI response is grounded in external sources. This is the primary
 * type used to represent the complete grounding context for a response.
 *
 * @example
 * const metadata: EnhancedGroundingMetadata = {
 *   query: "What are the system requirements?",
 *   webSearchQueries: ["system requirements documentation"],
 *   searchResults: [
 *     { uri: "https://docs.example.com/requirements", title: "Requirements" }
 *   ],
 *   sources: [
 *     { uri: "https://docs.example.com/requirements", title: "Requirements", domain: "docs.example.com" }
 *   ],
 *   averageConfidence: 0.89,
 *   grounded: true
 * };
 */
export type EnhancedGroundingMetadata = {
  /** The original user query that triggered the grounded response */
  query: string;
  /** Array of search queries used to find grounding sources */
  webSearchQueries?: string[];
  /** Array of search results returned from web search */
  searchResults: EnhancedSearchResult[];
  /** Fine-grained attributions mapping response segments to sources */
  segmentAttributions?: SegmentAttribution[];
  /** Array of all sources used to ground the response */
  sources: EnhancedGroundingSource[];
  /** Average confidence score across all grounding attributions (0-1) */
  averageConfidence?: number;
  /** Whether the response is successfully grounded in sources */
  grounded: boolean;
};

/**
 * Represents a grounding chunk from raw provider responses.
 * This is the low-level representation of a grounding source chunk
 * as returned directly from AI providers like Google Vertex AI.
 *
 * @example
 * const chunk: GroundingChunk = {
 *   web: {
 *     uri: "https://example.com/article",
 *     title: "Relevant Article"
 *   },
 *   confidenceScore: 0.87
 * };
 */
export type GroundingChunk = {
  /** Web source information for this grounding chunk */
  web?: {
    /** The URI of the web source */
    uri?: string;
    /** The title of the web source */
    title?: string;
  };
  /** Confidence score for this grounding chunk (0-1) */
  confidenceScore?: number;
};

/**
 * Represents grounding support information from raw provider responses.
 * Contains segment information and links to the grounding chunks that
 * support that segment, as returned directly from AI providers.
 *
 * @example
 * const support: GroundingSupport = {
 *   segment: {
 *     text: "The feature was released in 2024",
 *     startIndex: 0,
 *     endIndex: 32,
 *     partIndex: 0
 *   },
 *   groundingChunkIndices: [0, 1],
 *   confidenceScores: [0.92, 0.85]
 * };
 */
export type GroundingSupport = {
  /** The text segment that is being grounded */
  segment?: {
    /** The text content of the segment */
    text?: string;
    /** Starting character index in the response */
    startIndex?: number;
    /** Ending character index in the response */
    endIndex?: number;
    /** Index of the response part this segment belongs to */
    partIndex?: number;
  };
  /** Indices into the groundingChunks array that support this segment */
  groundingChunkIndices?: number[];
  /** Confidence scores corresponding to each grounding chunk index */
  confidenceScores?: number[];
};

/**
 * Raw grounding metadata as returned directly from AI providers.
 * This is the unprocessed format that gets transformed into
 * EnhancedGroundingMetadata for consistent consumption across the SDK.
 *
 * @example
 * const rawMetadata: RawGroundingMetadata = {
 *   webSearchQueries: ["neurolink documentation"],
 *   searchEntryPoint: {
 *     renderedContent: "<div>Search results widget HTML</div>"
 *   },
 *   groundingChunks: [
 *     { web: { uri: "https://docs.neurolink.dev", title: "NeuroLink Docs" } }
 *   ],
 *   groundingSupports: [
 *     { segment: { text: "NeuroLink is..." }, groundingChunkIndices: [0] }
 *   ]
 * };
 */
export type RawGroundingMetadata = {
  /** Array of search queries used by the provider for web grounding */
  webSearchQueries?: string[];
  /** Search entry point with rendered HTML content for display */
  searchEntryPoint?: {
    /** HTML content that can be rendered to show search results */
    renderedContent?: string;
  };
  /** Array of grounding chunks from the provider */
  groundingChunks?: GroundingChunk[];
  /** Array of grounding support information linking segments to chunks */
  groundingSupports?: GroundingSupport[];
};
