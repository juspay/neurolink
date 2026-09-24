[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1179)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1180)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1181)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1182)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1183](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1183)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
