[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1714)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1717)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1719)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1721)

"allowed" | "throttled" | "rejected" | "unknown"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1723)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1725)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1727)

"allowed" | "throttled" | "rejected" | "unknown"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1729)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1731)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1733)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1735)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1737)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1739)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1743)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1747)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1750)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1752)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1756)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1758)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1760)

Provenance of this snapshot's numbers.
