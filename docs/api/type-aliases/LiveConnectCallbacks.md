[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveConnectCallbacks

# Type Alias: LiveConnectCallbacks

> **LiveConnectCallbacks** = `object`

Defined in: [types/providers.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1123)

Live connection callbacks

## Properties

### onopen?

> `optional` **onopen?**: () => `void`

Defined in: [types/providers.ts:1124](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1124)

#### Returns

`void`

---

### onmessage?

> `optional` **onmessage?**: (`message`) => `void`

Defined in: [types/providers.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1125)

#### Parameters

##### message

[`LiveServerMessage`](LiveServerMessage.md)

#### Returns

`void`

---

### onerror?

> `optional` **onerror?**: (`e`) => `void`

Defined in: [types/providers.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1126)

#### Parameters

##### e

###### message?

`string`

#### Returns

`void`

---

### onclose?

> `optional` **onclose?**: (`e`) => `void`

Defined in: [types/providers.ts:1127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1127)

#### Parameters

##### e

###### code?

`number`

###### reason?

`string`

#### Returns

`void`
