import { z } from "zod";
import { assertSafeUrlForProxy } from "../utils/ssrfGuard.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";
import type {
  AdsImageAuditInput,
  AdsImageAuditStoreInput,
  AdsImageAuditRubric,
  AdsImageAuditCriterion,
  AdsImageAuditActionDraft,
  AdsImageAuditActionDrafts,
  AdsImageAuditAd,
  AdsImageAuditStore,
} from "../types/index.js";

export const publicAuditUrl = (value: string): URL => {
  const url = new URL(
    /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`,
  );
  if (url.protocol !== "https:" || url.port || url.username || url.password) {
    throw new Error(
      "Only public HTTPS URLs without credentials or ports are allowed.",
    );
  }
  assertSafeUrlForProxy(url.toString());
  return url;
};

const publicUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      publicAuditUrl(value);
      return true;
    } catch {
      return false;
    }
  }, "A public HTTPS URL is required.");

export const adsImageAuditStoreSchema = z
  .object({
    storeUrl: publicUrlSchema,
    imageUrl: publicUrlSchema.optional(),
    context: z
      .object({
        name: z.string().trim().min(1).max(LIMITS.textCharacters),
        products: z
          .array(z.string().trim().min(1).max(LIMITS.textCharacters))
          .min(1)
          .max(10),
      })
      .strict()
      .optional(),
  })
  .strict() satisfies z.ZodType<AdsImageAuditStoreInput>;

export const adsImageAuditInputSchema = z
  .object({
    merchant: adsImageAuditStoreSchema,
    competitors: z
      .array(adsImageAuditStoreSchema)
      .min(1)
      .max(LIMITS.stores - 1),
  })
  .strict()
  .superRefine((input, context) => {
    // Zod may still run superRefine when a child URL refinement has failed.
    // Preserve its validation issue rather than throwing out of safeParse.
    let hosts: string[];
    try {
      hosts = [input.merchant, ...input.competitors].map((store) =>
        publicAuditUrl(store.storeUrl).hostname.replace(/^www\./, ""),
      );
    } catch {
      return;
    }
    if (new Set(hosts).size !== hosts.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stores must have distinct domains.",
      });
    }
  }) satisfies z.ZodType<AdsImageAuditInput>;

const boundedText = z.string().trim().min(1).max(LIMITS.textCharacters);
export const adsImageAuditCriterionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    label: boundedText,
    instructions: boundedText,
    levels: z.array(boundedText).length(4),
    weight: z.number().finite().positive().max(10),
  })
  .strict() satisfies z.ZodType<AdsImageAuditCriterion>;

export const adsImageAuditRubricSchema = z
  .object({
    criteria: z.array(adsImageAuditCriterionSchema).min(3).max(LIMITS.criteria),
  })
  .strict()
  .refine(
    (rubric) =>
      new Set(rubric.criteria.map((criterion) => criterion.id)).size ===
      rubric.criteria.length,
    "Criterion IDs must be unique.",
  ) satisfies z.ZodType<AdsImageAuditRubric>;

export const adsImageAuditActionDraftSchema = z
  .object({
    title: boundedText,
    change: boundedText,
    criterionId: boundedText,
    competitorStoreId: boundedText,
    rationale: boundedText,
  })
  .strict() satisfies z.ZodType<AdsImageAuditActionDraft>;

export const adsImageAuditActionDraftsSchema = z
  .object({
    actions: z.array(adsImageAuditActionDraftSchema).max(LIMITS.actions),
  })
  .strict() satisfies z.ZodType<AdsImageAuditActionDrafts>;

export const parseAuditJson = (text: string): unknown => {
  // Fence removal only; never salvage a partial, malformed model response.
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, ""),
  );
};

export const adsImageAuditStoreContextSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["merchant", "competitor"]),
    origin: publicUrlSchema,
    name: boundedText,
    products: z.array(boundedText).min(1).max(10),
  })
  .strict() satisfies z.ZodType<AdsImageAuditStore>;

export const adsImageAuditAdSchema = z
  .object({
    id: z.string().regex(/^\d{1,30}$/),
    pageId: z.string().regex(/^\d{1,30}$/),
    imageUrl: publicUrlSchema,
    destinationUrl: publicUrlSchema,
    firstShown: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (value) =>
          Number.isFinite(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value,
      ),
    headline: z.string().max(LIMITS.textCharacters),
    bodyText: z.string().max(LIMITS.textCharacters),
    cta: z.string().max(LIMITS.textCharacters),
    provenance: z.enum(["apify", "connector"]),
  })
  .strict() satisfies z.ZodType<AdsImageAuditAd>;
