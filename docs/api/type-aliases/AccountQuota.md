[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1276)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1279)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1281)

0.0-1.0 (from unified-5h-utilization)

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1283)

"allowed" | "throttled" | "rejected"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1285)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1287)

0.0-1.0 (from unified-7d-utilization)

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1289)

"allowed" | "throttled" | "rejected"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1291)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1293)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1295)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1297)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1299)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1301)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1305)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1309)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1312)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1314)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1318)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1320)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1322)

Provenance of this snapshot's numbers.
