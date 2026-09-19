[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1129)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1130](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1130)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1131)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1132)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1133)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
