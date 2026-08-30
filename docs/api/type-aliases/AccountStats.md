[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1120)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1126)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1127)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1128)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1129)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1131)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1133)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1135)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1137)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1138)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1139)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1140)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1141)
