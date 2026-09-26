[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StatusStats

# Type Alias: StatusStats

> **StatusStats** = `object`

Stats shape consumed by the proxy status printer.

## Properties

### startedAt?

> `optional` **startedAt?**: `number`

---

### totalAttempts?

> `optional` **totalAttempts?**: `number`

---

### totalAttemptErrors?

> `optional` **totalAttemptErrors?**: `number`

---

### totalRequests

> **totalRequests**: `number`

---

### totalSuccess

> **totalSuccess**: `number`

---

### totalErrors

> **totalErrors**: `number`

---

### totalRateLimits

> **totalRateLimits**: `number`

---

### totalTransientRateLimits?

> `optional` **totalTransientRateLimits?**: `number`

---

### totalQuotaRateLimits?

> `optional` **totalQuotaRateLimits?**: `number`

---

### terminalErrors?

> `optional` **terminalErrors?**: [`ProxyTerminalErrorJournal`](ProxyTerminalErrorJournal.md)

---

### lastTerminalError?

> `optional` **lastTerminalError?**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md) \| `null`

---

### terminalErrorDetailsComparable?

> `optional` **terminalErrorDetailsComparable?**: `boolean`

---

### terminalErrorDetailsMissing?

> `optional` **terminalErrorDetailsMissing?**: `number`

---

### terminalErrorDetailsExcess?

> `optional` **terminalErrorDetailsExcess?**: `number`

---

### snapshotSource?

> `optional` **snapshotSource?**: `"reconciled"` \| `"memory"`

Whether this status response reconciled shared state or used local memory.

---

### accounts?

> `optional` **accounts?**: `object`[]

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
