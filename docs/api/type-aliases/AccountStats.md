[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1140)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1146)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1147)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1148)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1149)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1151)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1153)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1155)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1157)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1158)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1159)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1160)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1161)
