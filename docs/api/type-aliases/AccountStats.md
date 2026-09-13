[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1230)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1236)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1237)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1238)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1239)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1241)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1243)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1245)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1247)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1248)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1249)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1250)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1251)
