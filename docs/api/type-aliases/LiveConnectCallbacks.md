[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1106)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1107)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1108)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1109)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1110)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
