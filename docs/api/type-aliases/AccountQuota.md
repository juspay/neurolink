[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1468)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1471)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1473)

0.0-1.0 (from unified-5h-utilization)

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1475)

"allowed" | "throttled" | "rejected"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1477)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1479)

0.0-1.0 (from unified-7d-utilization)

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1481)

"allowed" | "throttled" | "rejected"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1483)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1485)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1487)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1489)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1491)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1493)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1497)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1501)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1504)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1506)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1510)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1512)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1514)

Provenance of this snapshot's numbers.
