[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1506)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1512)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1513)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1514)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1515)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1517)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1519)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1521)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1523)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1524)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1525)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1526)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1527)
