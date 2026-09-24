[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1647)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1652)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1654)

"allowed" | "throttled" | "rejected" | "unknown"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1656)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1658)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1660)

"allowed" | "throttled" | "rejected" | "unknown"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1662)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1664)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1666)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1668)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1670)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1672)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1676)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1680)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1683)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1685)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1689)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1691)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1693)

Provenance of this snapshot's numbers.
