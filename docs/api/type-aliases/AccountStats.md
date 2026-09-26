[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1595)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1601)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1602)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1603)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1604)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1606)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1608)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1610)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1612)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1613)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1614)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1615)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1616)
