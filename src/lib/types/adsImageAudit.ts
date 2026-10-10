/** Public image creative-audit contracts. No application/session dependencies. */
import type { GenerateOptions, GenerateResult } from "./generate.js";
import type { DecisionOptions, DecisionResult } from "./decision.js";

export type AdsImageAuditStoreRole = "merchant" | "competitor";

export type AdsImageAuditAssessmentStatus = "assessed" | "unavailable";

export type AdsImageAuditActionStatus = "recommended" | "review";

export type AdsImageAuditAdProvenance = "apify" | "connector" | "supplied";

export type AdsImageAuditStoreInput = {
  storeUrl: string;
  imageUrl?: string;
  /** Supplied context bypasses storefront research. */
  context?: AdsImageAuditContext;
};

export type AdsImageAuditInput = {
  merchant: AdsImageAuditStoreInput;
  competitors: AdsImageAuditStoreInput[];
};

export type AdsImageAuditStore = {
  id: string;
  role: AdsImageAuditStoreRole;
  origin: string;
  name: string;
  products: string[];
};

export type AdsImageAuditAd = {
  id: string;
  pageId: string;
  imageUrl: string;
  destinationUrl: string;
  firstShown: string;
  headline: string;
  bodyText: string;
  cta: string;
  provenance: AdsImageAuditAdProvenance;
};

export type AdsImageAuditCriterion = {
  id: string;
  label: string;
  instructions: string;
  levels: string[];
  weight: number;
};

export type AdsImageAuditRubric = {
  criteria: AdsImageAuditCriterion[];
};

export type AdsImageAuditRating = {
  criterionId: string;
  percent: number;
  confidence: number;
  probabilities: number[];
};

export type AdsImageAuditAssessment = {
  store: AdsImageAuditStore;
  status: AdsImageAuditAssessmentStatus;
  ad?: AdsImageAuditAd;
  ratings: AdsImageAuditRating[];
  percent?: number;
  reason?: string;
};

export type AdsImageAuditActionDraft = {
  title: string;
  change: string;
  criterionId: string;
  competitorStoreId: string;
  rationale: string;
};

export type AdsImageAuditActionDrafts = {
  actions: AdsImageAuditActionDraft[];
};

export type AdsImageAuditAction = {
  draft: AdsImageAuditActionDraft;
  relevanceProbability: number;
  priority: number;
  priorityConfidence: number;
  status: AdsImageAuditActionStatus;
};

export type AdsImageAuditReport = {
  schemaVersion: string;
  rubric: AdsImageAuditRubric;
  assessments: AdsImageAuditAssessment[];
  actions: AdsImageAuditAction[];
  warnings: string[];
  disclaimer: string;
};
export type AdsImageAuditContext = { name: string; products: string[] };
/** Configure once; each invocation supplies only merchant/competitor input. */
export type AdsImageAuditClient = {
  generate: (options: GenerateOptions) => Promise<GenerateResult>;
  decide: (options: DecisionOptions) => Promise<DecisionResult>;
};
export type AdsImageAuditAdSource = {
  /** Return normalized active single-image candidates; the SDK validates shape and exact destination-domain matches. */
  fetchAds: (
    stores: AdsImageAuditStore[],
    options: { market: string; signal?: AbortSignal },
  ) => Promise<AdsImageAuditAd[]>;
};
export type AdsImageAuditProgress = {
  stage:
    | "context"
    | "rubric"
    | "discovery"
    | "assessment"
    | "actions"
    | "review"
    | "report";
  status: "started" | "completed" | "failed";
  storeId?: string;
};
export type AdsImageAuditConfig = {
  generation: Pick<GenerateOptions, "provider" | "model" | "region">;
  /** ISO country code. Defaults to IN for this initial pilot. */
  market?: string;
  /** Explicit deployed model IDs, for example xor-1.2 on its released serving bundle. */
  decisionModels?: { xor?: string; typesafe?: string };
  adSource?: AdsImageAuditAdSource;
  /** Trusted custom image transport. Returned bytes are still decoded and bounded by the SDK. */
  imageLoader?: (url: string, signal?: AbortSignal) => Promise<Buffer>;
  /** Trusted custom storefront researcher; supplied context takes precedence. */
  storeReader?: (
    input: AdsImageAuditStoreInput,
    index: number,
    signal?: AbortSignal,
  ) => Promise<AdsImageAuditStore>;
  onProgress?: (event: AdsImageAuditProgress) => void;
  signal?: AbortSignal;
};
export type AdsImageAuditApifyConfig = { token: string };

/** @internal Shared action-review dependencies, not report data. */
export type AdsImageAuditActionContext = {
  client: AdsImageAuditClient;
  options: AdsImageAuditConfig;
  stores: AdsImageAuditStore[];
  rubric: AdsImageAuditRubric;
  assessments: AdsImageAuditAssessment[];
  warnings: string[];
  generateJson: (instructions: string, state: unknown) => Promise<unknown>;
  progress: (event: AdsImageAuditProgress) => void;
};
