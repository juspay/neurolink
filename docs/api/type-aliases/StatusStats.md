[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3811)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3812)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3813)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3814)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3815)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3816)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3817)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3818)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3819)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3820)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3821)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3822)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3823)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3824)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3825)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3827)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3828)

#### key?

> `optional` **key?**: `string` \| `null`

Provider-qualified key; null for explicitly unattributed legacy rows.

#### provider?

> `optional` **provider?**: `"anthropic"` \| `"codex"` \| `"vertex"` \| `"other"` \| `"unknown"`

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

Defined in: [types/proxy.ts:3855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3855)
