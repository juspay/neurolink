export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export const asNumberMap = (v: unknown): Record<string, number> | undefined => {
  if (!isRecord(v)) {
    return undefined;
  }
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(v)) {
    const n = asNumber(raw);
    if (n === undefined) {
      return undefined;
    }
    out[k] = n;
  }
  return out;
};

export const asStringMap = (v: unknown): Record<string, string> | undefined => {
  if (!isRecord(v)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [k, raw] of Object.entries(v)) {
    if (typeof raw !== "string") {
      return undefined;
    }
    out[k] = raw;
  }
  return out;
};

/**
 * A map whose values are shown as text: a string as is, anything else a JSON
 * value can hold as its JSON text. A score legend echoes each level as the
 * caller gave it, and a level may be a number or an object.
 */
export const asTextMap = (v: unknown): Record<string, string> | undefined => {
  if (!isRecord(v)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [k, raw] of Object.entries(v)) {
    if (typeof raw === "string") {
      out[k] = raw;
      continue;
    }
    if (raw === undefined || typeof raw === "function") {
      return undefined;
    }
    out[k] = JSON.stringify(raw);
  }
  return out;
};
