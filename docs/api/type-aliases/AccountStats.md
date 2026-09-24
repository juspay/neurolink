[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1585)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1591)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1592)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1593)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1594)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1596)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1598)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1600)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1602)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1603)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1604)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1605)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1606)
