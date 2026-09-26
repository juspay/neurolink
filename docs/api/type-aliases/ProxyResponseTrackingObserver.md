[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResponseTrackingObserver

# Type Alias: ProxyResponseTrackingObserver

> **ProxyResponseTrackingObserver** = `object`

Non-blocking callbacks for response lifecycle metadata.

## Properties

### onFirstChunk?

> `optional` **onFirstChunk?**: (`details`) => `void`

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
