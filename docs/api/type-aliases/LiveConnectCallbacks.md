[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1103)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1104)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1105)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1106)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1107)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
