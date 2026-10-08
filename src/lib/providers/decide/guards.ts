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
