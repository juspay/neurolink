[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyticsConfig

# Type Alias: AnalyticsConfig

> **AnalyticsConfig** = `object`

Defined in: [types/config.ts:362](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L362)

Analytics configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:363](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L363)

---

### trackTokens?

> `optional` **trackTokens?**: `boolean`

Defined in: [types/config.ts:364](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L364)

---

### trackCosts?

> `optional` **trackCosts?**: `boolean`

Defined in: [types/config.ts:365](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L365)

---

### trackPerformance?

> `optional` **trackPerformance?**: `boolean`

Defined in: [types/config.ts:366](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L366)

---

### trackErrors?

> `optional` **trackErrors?**: `boolean`

Defined in: [types/config.ts:367](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L367)

---

### exportFormat?

> `optional` **exportFormat?**: `"json"` \| `"csv"` \| `"prometheus"`

Defined in: [types/config.ts:368](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L368)

---

### exportPath?

> `optional` **exportPath?**: `string`

Defined in: [types/config.ts:369](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L369)

---

### retention?

> `optional` **retention?**: `object`

Defined in: [types/config.ts:370](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L370)

#### days?

> `optional` **days?**: `number`

#### maxEntries?

> `optional` **maxEntries?**: `number`
