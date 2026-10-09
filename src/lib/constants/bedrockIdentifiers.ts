import { BedrockModels } from "./enums.js";
import { bedrockManifest } from "../models/manifests/bedrock.js";

// The existing closed geography set used by Bedrock's metadata tables.
// Recognition of a supplied prefix does not claim that a particular model or
// source region supports that profile (AWS publishes support per model card).
const BEDROCK_GEO_PREFIXES: ReadonlySet<string> = new Set([
  "us",
  "eu",
  "apac",
  "jp",
  "au",
  "in",
  "us-gov",
  "global",
]);

const BEDROCK_VENDORS: ReadonlySet<string> = new Set(
  Object.values(BedrockModels)
    .map((id) => id.split(".")[0])
    .filter((vendor) => !BEDROCK_GEO_PREFIXES.has(vendor)),
);

/** Recognize an already supplied profile; never prefix it a second time. */
export function hasBedrockProfilePrefix(model: string): boolean {
  return BEDROCK_GEO_PREFIXES.has(model.split(".")[0]) && model.includes(".");
}

/** Remove one known geography only when followed by a shipped model vendor. */
export function stripBedrockGeoPrefix(model: string): string | undefined {
  const [geo, vendor, ...rest] = model.split(".");
  if (
    rest.length === 0 ||
    !BEDROCK_GEO_PREFIXES.has(geo) ||
    !BEDROCK_VENDORS.has(vendor)
  ) {
    return undefined;
  }
  return model.slice(geo.length + 1);
}

/**
 * Metadata lookup identity, never the identity sent to AWS.
 *
 * Converse documents foundation-model and inference-profile ARNs:
 * https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html
 * A foundation-model ARN contains its model id. A system inference-profile ARN
 * contains the geography-prefixed model id (see CreateInferenceProfile's
 * cross-region example). Application profiles, provisioned/custom models and
 * opaque profile IDs do not reveal their model; keep their existing fallback.
 * Exact rows for the original identifier must be consulted before this helper.
 */
export function bedrockModelIdForLookup(model: string): string | undefined {
  if (!model.startsWith("arn:")) {
    // These are already executable aliases in ProviderFactory. Options retain
    // the caller's alias even after the factory constructs a canonical model,
    // so metadata must follow the same identity rather than take the default.
    const declaredAlias = Object.entries(bedrockManifest.models).find(
      ([, entry]) => entry.aliases.includes(model.toLowerCase()),
    );
    if (declaredAlias) {
      return declaredAlias[0];
    }
    return stripBedrockGeoPrefix(model);
  }
  if (model.length > 2048) {
    return undefined;
  }
  const match =
    /^arn:aws(?:-cn|-us-gov|-iso|-iso-b)?:bedrock:([a-z0-9-]{1,20}):([0-9]{12})?:(foundation-model|inference-profile)\/([a-zA-Z0-9:.-]+)$/.exec(
      model,
    );
  if (!match) {
    return undefined;
  }
  const [, , account, resourceType, id] = match;
  if (resourceType === "inference-profile") {
    // A system profile must carry a known geography, vendor and model. Opaque
    // IDs cannot be decoded, even when AWS accepts them for invocation.
    return account &&
      /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+(?:[.:][a-z0-9-]+)*$/.test(id) &&
      stripBedrockGeoPrefix(id)
      ? id
      : undefined;
  }
  const [vendor, ...rest] = id.split(".");
  return !account &&
    /^[a-z0-9-]{1,63}\.[a-z0-9-]{1,63}(?:[.:]?[a-z0-9-]{1,63})?$/.test(id) &&
    rest.length > 0 &&
    BEDROCK_VENDORS.has(vendor)
    ? id
    : undefined;
}
