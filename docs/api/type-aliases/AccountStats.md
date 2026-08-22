[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountStats

# Type Alias: AccountStats

> **AccountStats** = `object`

Defined in: [types/proxy.ts:1059](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1059)

## Properties

### label

> **label**: `string`

Defined in: [types/proxy.ts:1060](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1060)

---

### type

> **type**: `string`

Defined in: [types/proxy.ts:1061](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1061)

---

### attemptCount

> **attemptCount**: `number`

Defined in: [types/proxy.ts:1062](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1062)

---

### attemptErrorCount

> **attemptErrorCount**: `number`

Defined in: [types/proxy.ts:1064](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1064)

Failed upstream attempts, including retries that later recovered.

---

### successCount

> **successCount**: `number`

Defined in: [types/proxy.ts:1066](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1066)

Final requests successfully completed by this account.

---

### errorCount

> **errorCount**: `number`

Defined in: [types/proxy.ts:1068](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1068)

Final requests that terminated as errors on this account.

---

### rateLimitCount

> **rateLimitCount**: `number`

Defined in: [types/proxy.ts:1070](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1070)

All upstream attempts that returned 429.

---

### transientRateLimitCount

> **transientRateLimitCount**: `number`

Defined in: [types/proxy.ts:1071](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1071)

---

### quotaRateLimitCount

> **quotaRateLimitCount**: `number`

Defined in: [types/proxy.ts:1072](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1072)

---

### lastAttemptAt

> **lastAttemptAt**: `number`

Defined in: [types/proxy.ts:1073](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1073)

---

### lastErrorAt?

> `optional` **lastErrorAt?**: `number`

Defined in: [types/proxy.ts:1074](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1074)
