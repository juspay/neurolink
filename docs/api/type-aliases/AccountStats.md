[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1503)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1509)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1510)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1511)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1512)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1514)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1516)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1518)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1520)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1521)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1522)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1523)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1524)
