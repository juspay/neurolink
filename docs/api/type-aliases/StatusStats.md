[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3113)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3114)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3115)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3116)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3117)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3118)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3119)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3120)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3121)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3122)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3123)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3124)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3125)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3126)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3127)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3129)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3130)

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

Defined in: [types/proxy.ts:3157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3157)
