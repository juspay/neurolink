[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1281)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1284)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1286)

0.0-1.0 (from unified-5h-utilization)

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1288)

"allowed" | "throttled" | "rejected"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1290)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1292](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1292)

0.0-1.0 (from unified-7d-utilization)

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1294)

"allowed" | "throttled" | "rejected"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1296)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1298)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1300)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1302)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1304)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1306)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1310)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1314)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1317)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1319)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1323)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1325)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1327)

Provenance of this snapshot's numbers.
