[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1159](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1159)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1160)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1161)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1162)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1163)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
