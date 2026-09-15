[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1334)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1340)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1341)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1342)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1343)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1345)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1347)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1349)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1351)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1352)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1353)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1354)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1355)
