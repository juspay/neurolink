[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextChannel

# Type Alias: TextChannel

> **TextChannel** = `object`

Defined in: [types/providers.ts:1756](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1756)

Push-based text channel for incremental streaming.

## Properties

### push

> **push**: (`text`) => `void`

Defined in: [types/providers.ts:1758](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1758)

Push a text chunk to the consumer.

#### Parameters

##### text

`string`

#### Returns

`void`

---

### close

> **close**: () => `void`

Defined in: [types/providers.ts:1760](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1760)

Signal that no more chunks will arrive.

#### Returns

`void`

---

### error

> **error**: (`err`) => `void`

Defined in: [types/providers.ts:1762](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1762)

Signal that the producer encountered a fatal error.

#### Parameters

##### err

`unknown`

#### Returns

`void`

---

### iterable

> **iterable**: `AsyncIterable`\<\{ `content`: `string`; \}\>

Defined in: [types/providers.ts:1764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1764)

Async iterable consumed by the StreamResult.
