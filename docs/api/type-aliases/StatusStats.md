[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3142)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3143)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3144)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3145)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3146)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3147)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3148)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3149)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3150)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3151)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3152)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3153)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3154)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3155)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3156)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3158)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3159)

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

Defined in: [types/proxy.ts:3186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3186)
