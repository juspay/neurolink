[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3736)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3737)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3738)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3739)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3740)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3741)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3742)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3743)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3745)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3748)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3749)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3750)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3752)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3753)

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

Defined in: [types/proxy.ts:3780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3780)
