[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1261)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1264)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1266)

0.0-1.0 (from unified-5h-utilization)

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1268)

"allowed" | "throttled" | "rejected"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1270)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1272)

0.0-1.0 (from unified-7d-utilization)

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1274)

"allowed" | "throttled" | "rejected"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1276)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1278)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1280)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1282)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1284)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1286)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1290)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1294)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1297)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1299)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1303)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1305)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1307)

Provenance of this snapshot's numbers.
