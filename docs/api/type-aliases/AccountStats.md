[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1351)

## Properties

### key?

> `optional` **key?**: `string`

Defined in: [types/proxy.ts:1357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1357)

Provider-qualified account identity for rows written by current builds.
Omitted only by legacy snapshots whose bare map keys are intentionally
treated as unattributed rather than guessed at during status rendering.

---

### label

> **label**: `string`

Defined in: [types/proxy.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1358)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1359)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1360)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1362)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1364)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1366)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1368)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1369)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1370)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1371)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1372)
