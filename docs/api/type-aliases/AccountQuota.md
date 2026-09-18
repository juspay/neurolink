[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1492)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1495)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1497)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1499)

"allowed" | "throttled" | "rejected" | "unknown"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1501)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1503)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1505)

"allowed" | "throttled" | "rejected" | "unknown"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1507)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1509)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1511)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1513)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1515)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1517)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1521)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1525)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1528)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1530)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1534)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1536)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1538)

Provenance of this snapshot's numbers.
