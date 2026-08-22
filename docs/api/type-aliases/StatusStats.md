[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3014)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3015)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3016)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3017)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3018)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3019)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3020)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3021)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3022)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3023)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3024)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3025)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3026)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3027)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3028)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3030)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3031)

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

Defined in: [types/proxy.ts:3055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3055)
