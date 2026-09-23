import type {
  ProxyBodyCaptureEntry,
  ProxyBodyCapturePolicyOptions,
  ProxyBodyCapturePolicySnapshot,
  ProxyBodyCapturePublication,
  ProxyBodyDeduplicationEntry,
  ProxyBodyDeliveryResult,
  StoredBodyArtifact,
} from "../types/index.js";

const MAX_REFERENCES = 1024;
const REFERENCE_TTL_MS = 5 * 60_000;

/** Diagnostic-only policy. Never receives or changes an inference body. */
export function createProxyBodyCapturePolicy(
  options: ProxyBodyCapturePolicyOptions = {},
) {
  const now = options.now ?? (() => performance.now());
  const configured = options.bytesPerMinute?.trim();
  const budget = configured ? Number(configured) : null;
  const invalidBudget =
    budget !== null && (!Number.isSafeInteger(budget) || budget <= 0);
  const references = new Map<string, ProxyBodyDeduplicationEntry>();
  let availableBytes = budget ?? Infinity;
  let lastRefill = now();
  let submittedBytes = 0;
  let deduplicatedCaptures = 0;
  let deduplicatedBytes = 0;
  let policyExcludedCaptures = 0;
  let policyExcludedBytes = 0;

  const maintain = () => {
    const at = now();
    if (budget !== null && !invalidBudget) {
      availableBytes = Math.min(
        budget,
        availableBytes + (Math.max(0, at - lastRefill) * budget) / 60_000,
      );
    }
    lastRefill = at;
    for (const [key, value] of references) {
      if (value.expiresAt <= at) {
        references.delete(key);
      }
    }
  };

  return {
    snapshot(): ProxyBodyCapturePolicySnapshot {
      maintain();
      return {
        deduplicationEnabled: options.deduplicate !== false,
        maxReferences: MAX_REFERENCES,
        referenceTtlMs: REFERENCE_TTL_MS,
        references: references.size,
        byteBudgetPerMinute: invalidBudget ? null : budget,
        invalidByteBudget: invalidBudget,
        availableBytes:
          budget === null || invalidBudget ? null : Math.floor(availableBytes),
        submittedBytes,
        deduplicatedCaptures,
        deduplicatedBytes,
        policyExcludedCaptures,
        policyExcludedBytes,
      };
    },
    async publish(
      entry: ProxyBodyCaptureEntry,
      stored: StoredBodyArtifact,
      publish: () => Promise<ProxyBodyDeliveryResult | undefined>,
    ): Promise<ProxyBodyCapturePublication> {
      maintain();
      if (stored.redactedBody === undefined) {
        return {};
      }
      const bytes = Buffer.byteLength(stored.redactedBody, "utf8");
      const key =
        options.deduplicate !== false && stored.bodySha256 && entry.captureId
          ? JSON.stringify([entry.requestId, stored.bodySha256, bytes])
          : undefined;
      const prior = key ? references.get(key) : undefined;
      // Only detached diagnostic work waits. An uncertain export never becomes
      // a reference, and references always point directly to an exported body.
      if (
        prior &&
        prior.reference.captureId !== entry.captureId &&
        (await prior.acknowledged) &&
        prior.expiresAt > now()
      ) {
        deduplicatedCaptures++;
        deduplicatedBytes += bytes;
        return {
          delivery: {
            status: "reference",
            reason: "identical_redacted_payload",
          },
          reference: { ...prior.reference },
        };
      }
      maintain();
      if (invalidBudget || bytes > availableBytes) {
        policyExcludedCaptures++;
        policyExcludedBytes += bytes;
        return {
          delivery: {
            status: "policy_excluded",
            reason: invalidBudget
              ? "body_byte_budget_invalid"
              : "body_byte_budget_exhausted",
          },
        };
      }
      availableBytes -= bytes;
      submittedBytes += bytes;
      let acknowledge: (accepted: boolean) => void = () => {};
      const candidate: ProxyBodyDeduplicationEntry | undefined =
        key && entry.captureId && stored.bodySha256
          ? {
              reference: {
                captureId: entry.captureId,
                requestId: entry.requestId,
                bodySha256: stored.bodySha256,
                redactedBodyBytes: bytes,
                exportedAt: "",
              },
              expiresAt: now() + REFERENCE_TTL_MS,
              acknowledged: new Promise<boolean>((resolve) => {
                acknowledge = resolve;
              }),
            }
          : undefined;
      if (key && candidate) {
        // Eviction only loses an optimization. It cannot invalidate an emitted
        // reference, whose source remains an independently exported body.
        if (references.size >= MAX_REFERENCES) {
          const oldest = references.keys().next().value;
          if (oldest !== undefined) {
            references.delete(oldest);
          }
        }
        references.set(key, candidate);
      }
      let accepted = false;
      try {
        const delivery = await publish();
        accepted = delivery?.status === "transport_acknowledged";
        if (candidate && accepted) {
          candidate.reference.exportedAt = new Date().toISOString();
        }
        return { delivery };
      } finally {
        acknowledge(accepted);
        if (key && !accepted && references.get(key) === candidate) {
          references.delete(key);
        }
      }
    },
  };
}
