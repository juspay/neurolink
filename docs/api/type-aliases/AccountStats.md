[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1135)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1141)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1142)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1143)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1144)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1146)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1148)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1150)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1152)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1153)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1154)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1155)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1156)
