[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3024)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3025)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3026)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3027)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3028)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3029)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3030)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3031)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3032)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3033)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3034)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3035)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3036)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3037)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3038)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3040)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3041)

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

Defined in: [types/proxy.ts:3065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3065)
