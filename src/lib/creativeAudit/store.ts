import { isPlainObject as isJSON } from "../utils/typeUtils.js";
import { downloadAuditBytes } from "./network.js";
import { publicAuditUrl } from "./schemas.js";
import { ADS_IMAGE_AUDIT_LIMITS as LIMITS } from "../constants/adsImageAudit.js";
import type {
  AdsImageAuditStore,
  AdsImageAuditStoreInput,
} from "../types/index.js";

/** Lightweight subset of GEO storefront research: no expensive GEO visibility/policy audit. */
export const readAuditStore = async (
  input: AdsImageAuditStoreInput,
  index: number,
  signal?: AbortSignal,
): Promise<AdsImageAuditStore> => {
  const origin = publicAuditUrl(input.storeUrl).origin;
  if (input.context) {
    return {
      id: index === 0 ? "merchant" : `competitor_${index}`,
      role: index === 0 ? "merchant" : "competitor",
      origin,
      ...input.context,
    };
  }
  const [meta, catalogue] = await Promise.all([
    downloadAuditBytes(
      `${origin}/meta.json`,
      LIMITS.storeResponseBytes,
      signal,
    ),
    downloadAuditBytes(
      `${origin}/products.json?limit=10`,
      LIMITS.storeResponseBytes,
      signal,
    ),
  ]);
  const identity: unknown = JSON.parse(meta.toString("utf8"));
  const products: unknown = JSON.parse(catalogue.toString("utf8"));
  if (
    !isJSON(identity) ||
    typeof identity["name"] !== "string" ||
    !identity["name"].trim() ||
    !isJSON(products) ||
    !Array.isArray(products["products"])
  ) {
    throw new Error("Store is not a readable public Shopify storefront.");
  }
  // A meta.json redirect or claimed domain must not silently swap the audited storefront.
  const expectedHost = new URL(origin).hostname.replace(/^www\./, "");
  if (
    typeof identity["domain"] === "string" &&
    publicAuditUrl(identity["domain"]).hostname.replace(/^www\./, "") !==
      expectedHost
  ) {
    throw new Error(
      "Shopify metadata domain does not match the requested store.",
    );
  }
  const descriptions = products["products"]
    .slice(0, 10)
    .flatMap((product: unknown) => {
      if (!isJSON(product) || typeof product["title"] !== "string") {
        return [];
      }
      return [
        `${product["title"]} (${typeof product["product_type"] === "string" ? product["product_type"] : ""})`.slice(
          0,
          LIMITS.textCharacters,
        ),
      ];
    });
  if (descriptions.length === 0) {
    throw new Error("Store has no readable product context.");
  }
  return {
    id: index === 0 ? "merchant" : `competitor_${index}`,
    role: index === 0 ? "merchant" : "competitor",
    origin,
    name: identity["name"].trim().slice(0, LIMITS.textCharacters),
    products: descriptions,
  };
};
