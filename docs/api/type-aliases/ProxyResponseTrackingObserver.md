[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResponseTrackingObserver

# Type Alias: ProxyResponseTrackingObserver

> **ProxyResponseTrackingObserver** = `object`

Defined in: [types/proxy.ts:2260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2260)

Non-blocking callbacks for response lifecycle metadata.

## Properties

### onFirstChunk?

> `optional` **onFirstChunk?**: (`details`) => `void`

Defined in: [types/proxy.ts:2261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2261)

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

> `optional` **onTerminal?**: (`details`) => `unknown`

Defined in: [types/proxy.ts:2266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2266)

#### Parameters

##### details

###### outcome

[`ProxyResponseTerminalOutcome`](ProxyResponseTerminalOutcome.md)

###### error?

`unknown`

Underlying read failure for structured transport diagnostics.

###### observedBodyBytes

`number`

Decoded response-body bytes observed by the adapter.

###### responseChunks

`number`

#### Returns

`unknown`
