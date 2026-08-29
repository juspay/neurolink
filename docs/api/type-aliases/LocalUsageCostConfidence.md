[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCostConfidence

# Type Alias: LocalUsageCostConfidence

> **LocalUsageCostConfidence** = `"modeled"` \| `"unavailable"` \| `"heuristic"`

Defined in: [types/localUsage.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L52)

How much to trust a computed cost figure.

Not decoration: some CLIs are flat-rate subscriptions where a per-request
cost is meaningless, and at least one publishes a byte heuristic rather than
a real number. A caller must never render "heuristic" with the same
confidence as "modeled", so the distinction travels with the number.
