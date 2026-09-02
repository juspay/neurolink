[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1129)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1135)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1136)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1137)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1138)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1140)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1142)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1144)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1146)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1147)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1148)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1149)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1150)
