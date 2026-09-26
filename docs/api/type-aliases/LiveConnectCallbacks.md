[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1188](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1188)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1189)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1190)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1191)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1192)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
