[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3128)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3129)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3130)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3131)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3132)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3133)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3134)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3135)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3136)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3137)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3138)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3139)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3140)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3141)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3142)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3144)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3145)

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

Defined in: [types/proxy.ts:3172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3172)
