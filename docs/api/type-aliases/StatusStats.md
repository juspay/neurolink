[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Defined in: [types/proxy.ts:3716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3716)

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

Defined in: [types/proxy.ts:3717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3717)

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

Defined in: [types/proxy.ts:3718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3718)

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

Defined in: [types/proxy.ts:3719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3719)

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/proxy.ts:3720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3720)

---

### totalSuccess

> **totalSuccess**: `number`

Defined in: [types/proxy.ts:3721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3721)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:3722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3722)

---

### totalRateLimits

> **totalRateLimits**: `number`

Defined in: [types/proxy.ts:3723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3723)

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

Defined in: [types/proxy.ts:3724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3724)

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

Defined in: [types/proxy.ts:3725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3725)

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

Defined in: [types/proxy.ts:3726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3726)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

Defined in: [types/proxy.ts:3727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3727)

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

Defined in: [types/proxy.ts:3728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3728)

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

Defined in: [types/proxy.ts:3729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3729)

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

Defined in: [types/proxy.ts:3730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3730)

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Defined in: [types/proxy.ts:3732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3732)

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

Defined in: [types/proxy.ts:3733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3733)

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

Defined in: [types/proxy.ts:3760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3760)
