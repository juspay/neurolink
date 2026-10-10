import { getProxyDispatcherForUrl } from "../proxy/proxyFetch.js";
import { normalizeImageAd } from "./selection.js";
import { adsImageAuditStoreContextSchema } from "./schemas.js";
import type {
  AdsImageAuditAdSource,
  AdsImageAuditApifyConfig,
} from "../types/index.js";
import { isPlainObject as isJSON } from "../utils/typeUtils.js";
import {
  ADS_IMAGE_AUDIT_ACTOR,
  ADS_IMAGE_AUDIT_LIMITS as LIMITS,
} from "../constants/adsImageAudit.js";
import type { AdsImageAuditStore } from "../types/index.js";

/** Fixed API origin, bearer authentication, no redirect/token-in-query, capped decoded JSON. */
export const apifyRequest = async (
  path: string,
  token: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<unknown> => {
  const { fetch: fetcher } = await import("undici");
  const dispatcher = await getProxyDispatcherForUrl("https://api.apify.com");
  const response = await fetcher(`https://api.apify.com/v2/${path}`, {
    method: body === undefined ? "GET" : "POST",
    redirect: "error",
    signal,
    ...(dispatcher === null ? {} : { dispatcher }),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Ad discovery returned HTTP ${response.status}.`);
  }
  if (response.body === null) {
    throw new Error("Ad discovery returned no data.");
  }
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > LIMITS.apiResponseBytes) {
      throw new Error("Ad discovery response exceeded its size limit.");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

export const runImageAdScrape = async (
  stores: AdsImageAuditStore[],
  token: string,
  options: Parameters<AdsImageAuditAdSource["fetchAds"]>[1],
): Promise<unknown[]> => {
  if (stores.length === 0) {
    return [];
  }
  if (!token.trim()) {
    throw new Error("APIFY_API_TOKEN must be configured for ad discovery.");
  }
  const timeout = AbortSignal.timeout(LIMITS.apiTimeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  signal.throwIfAborted();
  // One paid run, never a retry loop that starts more runs or guesses more advertisers.
  let payload = await apifyRequest(
    `acts/${ADS_IMAGE_AUDIT_ACTOR}/runs?waitForFinish=60&timeout=${LIMITS.scrapeTimeoutSeconds}` +
      `&maxItems=${LIMITS.ads}&maxTotalChargeUsd=${LIMITS.scrapeChargeUsd}&restartOnError=false`,
    token,
    signal,
    {
      advertiserNames: [...new Set(stores.map((store) => store.name))],
      resultType: "ads",
      region: options.market,
      activeStatus: "active",
      adType: "all",
      mediaType: "image",
      sortBy: "most_recent",
      maxAdvertisersPerName: LIMITS.candidatesPerName,
      maxAds: LIMITS.ads,
      maxAdsPerTarget: LIMITS.adsPerTarget,
      expandVariants: false,
      transcribeVideos: false,
      ocrImageAds: false,
      analyzeAds: false,
      enrichLandingPage: false,
      downloadMedia: "none",
      onlyNewAds: false,
    },
  );
  const run = () =>
    isJSON(payload) && isJSON(payload["data"]) ? payload["data"] : null;
  const id = run()?.["id"];
  if (typeof id !== "string" || !/^[a-zA-Z0-9]+$/.test(id)) {
    throw new Error("Ad discovery returned an invalid run.");
  }
  for (
    let attempt = 0;
    attempt < 2 && ["READY", "RUNNING"].includes(String(run()?.["status"]));
    attempt += 1
  ) {
    payload = await apifyRequest(
      `actor-runs/${id}?waitForFinish=60`,
      token,
      signal,
    );
  }
  const data = run();
  if (data?.["status"] !== "SUCCEEDED") {
    throw new Error(
      "Ad discovery did not finish successfully within its bounded run.",
    );
  }
  const datasetId = data["defaultDatasetId"];
  if (typeof datasetId !== "string" || !/^[a-zA-Z0-9]+$/.test(datasetId)) {
    throw new Error("Ad discovery returned an invalid dataset.");
  }
  const rows = await apifyRequest(
    `datasets/${datasetId}/items?clean=true&limit=${LIMITS.ads}`,
    token,
    signal,
  );
  if (!Array.isArray(rows) || rows.length > LIMITS.ads) {
    throw new Error("Ad discovery returned an invalid or oversized dataset.");
  }
  return rows;
};

/** Bounded one-run Apify connector. No tokens in URLs, prompts, logs or report data. */
export const createApifyImageAdsSource = (
  config: AdsImageAuditApifyConfig,
): AdsImageAuditAdSource => {
  if (!config.token.trim()) {
    throw new Error(
      "Configure an Apify token before creating the ad-source connector.",
    );
  }
  return {
    fetchAds: async (stores, options) => {
      if (stores.length > LIMITS.stores || !/^[A-Z]{2}$/.test(options.market)) {
        throw new Error("Invalid ad discovery market or store count.");
      }
      const validated = stores.map((store) =>
        adsImageAuditStoreContextSchema.parse(store),
      );
      return (await runImageAdScrape(validated, config.token, options))
        .map(normalizeImageAd)
        .filter((ad): ad is NonNullable<typeof ad> => ad !== null);
    },
  };
};
