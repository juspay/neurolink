/** Images-only pilot. Bounds apply before downloads, inference and paid scraping. */
export const ADS_IMAGE_AUDIT_LIMITS = {
  stores: 3,
  candidatesPerName: 3,
  adsPerTarget: 8,
  ads: 72,
  scrapeChargeUsd: 0.1,
  scrapeTimeoutSeconds: 180,
  apiTimeoutMs: 190000,
  storeResponseBytes: 256 * 1024,
  apiResponseBytes: 2 * 1024 * 1024,
  imageTimeoutMs: 10000,
  imageBytes: 6 * 1024 * 1024,
  imagePixels: 16 * 1024 * 1024,
  imageEdge: 1600,
  preparedImageBytes: 2 * 1024 * 1024,
  criteria: 6,
  actions: 6,
  textCharacters: 1200,
  inferenceTimeoutMs: 60000,
  generationTokens: 3000,
  minimumConfidence: 0.6,
  minimumGapPercent: 10,
  minimumRelevanceProbability: 0.75,
} as const;

export const ADS_IMAGE_AUDIT_ACTOR = "hyperbach~meta-ads-library-scraper";
export const ADS_IMAGE_AUDIT_SCHEMA_VERSION = "1";
export const ADS_IMAGE_AUDIT_DISCLAIMER =
  "Images-only sample: one ad per store. Scores measure the shared creative rubric, not ROAS, sales or verified ad performance. Destination-domain matching establishes store relevance, not Page ownership. JEV reviews action text and findings, not the original images.";
