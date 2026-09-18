[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3489)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3490)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3491)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3492)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3493)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3494)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3495)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3496)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3497)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3498)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3499)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3500)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3501)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3502)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3503)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3505)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3506)

#### key?

> `optional` **key?**: `string` \| `null`

Provider-qualified key; null for explicitly unattributed legacy rows.

#### provider?

> `optional` **provider?**: `"anthropic"` \| `"codex"` \| `"other"` \| `"unknown"`

#### label

> **label**: `string`

#### type

> **type**: `string`

#### attempts?

> `optional` **attempts?**: `number`

#### requests?

> `optional` **requests?**: `number`

#### success?

> `optional` **success?**: `number`

#### errors?

> `optional` **errors?**: `number`

#### attemptErrors?

> `optional` **attemptErrors?**: `number`

#### rateLimits?

> `optional` **rateLimits?**: `number`

#### transientRateLimits?

> `optional` **transientRateLimits?**: `number`

#### quotaRateLimits?

> `optional` **quotaRateLimits?**: `number`

#### cooling

> **cooling**: `boolean`

#### allowed?

> `optional` **allowed?**: `boolean`

#### expired?

> `optional` **expired?**: `boolean`

#### status?

> `optional` **status?**: `"active"` \| `"cooling"` \| `"disabled"` \| `"expired"` \| `"excluded"` \| `"removed"` \| `"internal"` \| `"unattributed"`

---

### persistence?

> `optional` **persistence?**: [`ProxyStatsPersistenceStatus`](ProxyStatsPersistenceStatus.md)

Defined in: [types/proxy.ts:3533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3533)
