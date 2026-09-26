[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

## Properties

### key?

> `optional` **key?**: `string`

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

---

### type

> **type**: `string`

---

### attemptCount

> **attemptCount**: `number`

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

---

### lastAttemptAt

> **lastAttemptAt**: `number`

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`
