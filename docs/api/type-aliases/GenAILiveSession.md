[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAILiveSession

# Type Alias: GenAILiveSession

> **GenAILiveSession** = `object`

Defined in: [types/providers.ts:1210](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1210)

Google AI Live session interface

## Properties

### sendRealtimeInput?

> `optional` **sendRealtimeInput?**: (`payload`) => `Promise`\<`void`\> \| `void`

Defined in: [types/providers.ts:1211](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1211)

#### Parameters

##### payload

###### media?

[`GenAILiveMedia`](GenAILiveMedia.md)

###### event?

`string`

#### Returns

`Promise`\<`void`\> \| `void`

---

### sendInput?

> `optional` **sendInput?**: (`payload`) => `Promise`\<`void`\> \| `void`

Defined in: [types/providers.ts:1215](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1215)

#### Parameters

##### payload

###### event?

`string`

###### media?

[`GenAILiveMedia`](GenAILiveMedia.md)

#### Returns

`Promise`\<`void`\> \| `void`

---

### close?

> `optional` **close?**: (`code?`, `reason?`) => `Promise`\<`void`\> \| `void`

Defined in: [types/providers.ts:1219](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1219)

#### Parameters

##### code?

`number`

##### reason?

`string`

#### Returns

`Promise`\<`void`\> \| `void`
