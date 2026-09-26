[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1573)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1579)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1580)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1581)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1582)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1584)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1586)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1588)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1590)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1591)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1592)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1593)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1594)
