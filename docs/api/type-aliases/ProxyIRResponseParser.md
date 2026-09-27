[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRResponseParser

# Type Alias: ProxyIRResponseParser

> **ProxyIRResponseParser** = `object`

## Properties

### format

> **format**: [`ProxyIRWireFormat`](ProxyIRWireFormat.md)

## Methods

### parseBufferedResponse()

> **parseBufferedResponse**(`wireText`): [`ProxyIRResponse`](ProxyIRResponse.md)

#### Parameters

##### wireText

`string`

#### Returns

[`ProxyIRResponse`](ProxyIRResponse.md)

---

### parseResponseStream()

> **parseResponseStream**(`upstream`): `AsyncGenerator`\<[`ProxyIRResponseEvent`](ProxyIRResponseEvent.md), [`ProxyIRResponse`](ProxyIRResponse.md)\>

#### Parameters

##### upstream

`Response`

#### Returns

`AsyncGenerator`\<[`ProxyIRResponseEvent`](ProxyIRResponseEvent.md), [`ProxyIRResponse`](ProxyIRResponse.md)\>
