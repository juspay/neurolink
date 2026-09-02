[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResponseTrackingObserver

# Type Alias: ProxyResponseTrackingObserver

> **ProxyResponseTrackingObserver** = `object`

Defined in: [types/proxy.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1854)

Non-blocking callbacks for response lifecycle metadata.

## Properties

### onFirstChunk?

> `optional` **onFirstChunk?**: (`details`) => `void`

Defined in: [types/proxy.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1855)

#### Parameters

##### details

###### observedBodyBytes

`number`

Decoded response-body bytes observed by the adapter.

###### responseChunks

`1`

#### Returns

`void`

---

### onTerminal?

> `optional` **onTerminal?**: (`details`) => `void`

Defined in: [types/proxy.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1860)

#### Parameters

##### details

###### outcome

[`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

###### observedBodyBytes

`number`

Decoded response-body bytes observed by the adapter.

###### responseChunks

`number`

#### Returns

`void`
