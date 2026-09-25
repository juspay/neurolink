[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1571)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1577)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1578)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1579)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1580)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1582)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1584)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1586)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1588)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1589)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1590)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1591)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1592)
