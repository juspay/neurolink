[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuota

# Type Alias: AccountQuota

> **AccountQuota** = `object`

Defined in: [types/proxy.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1644)

## Properties

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/proxy.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1647)

Top-level unified status. A rejected value can be authoritative even
while both 5h and 7d sub-window statuses still report allowed.

---

### sessionUsed

> **sessionUsed**: `number`

Defined in: [types/proxy.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1649)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### sessionStatus

> **sessionStatus**: `string`

Defined in: [types/proxy.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1651)

"allowed" | "throttled" | "rejected" | "unknown"

---

### sessionResetAt

> **sessionResetAt**: `number`

Defined in: [types/proxy.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1653)

Unix timestamp (seconds) when the 5h window resets

---

### weeklyUsed

> **weeklyUsed**: `number`

Defined in: [types/proxy.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1655)

0.0-1.0 utilization; ignore the numeric placeholder when status is unknown.

---

### weeklyStatus

> **weeklyStatus**: `string`

Defined in: [types/proxy.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1657)

"allowed" | "throttled" | "rejected" | "unknown"

---

### weeklyResetAt

> **weeklyResetAt**: `number`

Defined in: [types/proxy.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1659)

Unix timestamp (seconds) when the 7d window resets

---

### fallbackPercentage

> **fallbackPercentage**: `number`

Defined in: [types/proxy.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1661)

0.0-1.0 (from fallback-percentage)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string`

Defined in: [types/proxy.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1663)

Provider fallback availability, for example "available".

---

### upgradePaths?

> `optional` **upgradePaths?**: `string`

Defined in: [types/proxy.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1665)

Comma-separated provider upgrade paths, for example "overage".

---

### overageStatus

> **overageStatus**: `string`

Defined in: [types/proxy.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1667)

"allowed" | "rejected"

---

### overageInUse?

> `optional` **overageInUse?**: `boolean`

Defined in: [types/proxy.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1669)

Whether Anthropic reports that paid overage is actively serving traffic.

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1673)

Why overage is unavailable, verbatim from
anthropic-ratelimit-unified-overage-disabled-reason (e.g.
"org_level_disabled"). Present only when the provider states one.

---

### overageEnabled?

> `optional` **overageEnabled?**: `boolean`

Defined in: [types/proxy.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1677)

Authoritative extra-usage switch from the usage API's
`extra_usage.is_enabled`. Unlike the header trio this is reported even for
an account that has never served a request.

---

### representativeClaim?

> `optional` **representativeClaim?**: `string`

Defined in: [types/proxy.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1680)

Which window Anthropic considers binding right now, verbatim from
anthropic-ratelimit-unified-representative-claim (e.g. "five_hour").

---

### lastUpdated

> **lastUpdated**: `number`

Defined in: [types/proxy.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1682)

Epoch ms when we last captured this data

---

### windows?

> `optional` **windows?**: [`AccountQuotaWindow`](AccountQuotaWindow.md)[]

Defined in: [types/proxy.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1686)

Dynamic per-plan limit buckets from the usage API `limits[]` array
(session / weekly_all / model-scoped weeklies such as Fable / future
kinds). Absent on purely header-sourced snapshots.

---

### windowsUpdatedAt?

> `optional` **windowsUpdatedAt?**: `number`

Defined in: [types/proxy.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1688)

Epoch ms when `windows` was last refreshed from the usage API.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1690)

Provenance of this snapshot's numbers.
