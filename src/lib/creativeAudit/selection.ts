import { isPlainObject as isJSON } from "../utils/typeUtils.js";
import { adsImageAuditAdSchema, publicAuditUrl } from "./schemas.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";
import type { AdsImageAuditAd, AdsImageAuditStore } from "../types/index.js";

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";
const boundedText = (value: unknown): string =>
  text(value).slice(0, LIMITS.textCharacters);

/** Actor-specific normalization. Unknown formats and video poster frames fail closed. */
export const normalizeImageAd = (row: unknown): AdsImageAuditAd | null => {
  if (
    !isJSON(row) ||
    row["row_type"] !== "ad" ||
    row["is_active"] !== true ||
    row["ad_format"] !== "image" ||
    !Array.isArray(row["cards"]) ||
    row["cards"].length > 0 ||
    text(row["video_url"]) !== "" ||
    text(row["video_preview_url"]) !== "" ||
    (Array.isArray(row["video_urls"]) && row["video_urls"].length > 0)
  ) {
    return null;
  }
  const id = text(row["creative_id"]);
  const pageId = text(row["advertiser_id"]);
  const firstShown = text(row["first_shown"]);
  if (
    !/^\d{1,30}$/.test(id) ||
    !/^\d{1,30}$/.test(pageId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(firstShown) ||
    !Number.isFinite(Date.parse(firstShown)) ||
    new Date(firstShown).toISOString().slice(0, 10) !== firstShown
  ) {
    return null;
  }
  try {
    const imageUrl = publicAuditUrl(text(row["image_url"])).toString();
    if (
      Array.isArray(row["image_urls"]) &&
      row["image_urls"].some((url) => url !== imageUrl)
    ) {
      return null;
    }
    return {
      id,
      pageId,
      firstShown,
      imageUrl,
      destinationUrl: publicAuditUrl(text(row["destination_url"])).toString(),
      headline: boundedText(row["headline"]),
      bodyText: boundedText(row["body_text"]),
      cta: boundedText(row["cta"]),
      provenance: "apify",
    };
  } catch {
    return null;
  }
};

/** Only exact hostname equality (www normalized), never substring or inferred ownership. */
export const selectStoreImageAd = (
  rows: unknown[],
  store: AdsImageAuditStore,
): AdsImageAuditAd | null => {
  const host = publicAuditUrl(store.origin).hostname.replace(/^www\./, "");
  const ads = rows
    .map((row) => {
      const result = adsImageAuditAdSchema.safeParse(row);
      return result.success ? result.data : null;
    })
    .filter(
      (ad): ad is NonNullable<typeof ad> =>
        ad !== null &&
        publicAuditUrl(ad.destinationUrl).hostname.replace(/^www\./, "") ===
          host,
    );
  // Duplicate rows with conflicting evidence cannot silently win by row order.
  const unique = ads.filter((ad) =>
    ads.every(
      (other) =>
        other.id !== ad.id || JSON.stringify(other) === JSON.stringify(ad),
    ),
  );
  return (
    unique.sort(
      (left, right) =>
        right.firstShown.localeCompare(left.firstShown) ||
        left.id.localeCompare(right.id),
    )[0] ?? null
  );
};
