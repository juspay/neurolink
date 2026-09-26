[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1167)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1168)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1169)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1170)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1171)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
