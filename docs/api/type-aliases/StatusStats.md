[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3450)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3451)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3452)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3453)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3454)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3455)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3456)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3457)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3458)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3459)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3460)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3461)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3462)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3463)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3464)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3466)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3467)

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

Defined in: [types/proxy.ts:3494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3494)
