[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1327)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1333)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1334)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1335)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1336)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1338)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1340)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1342)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1344)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1345)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1346)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1347)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1348)
