[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRRequestParser

# Type Alias: ProxyIRRequestParser\<TWireRequest\>

> **ProxyIRRequestParser**\<`TWireRequest`\> = `object`

Codec capabilities, kept separate rather than bundled into one interface.

No dialect needs all four in every direction: for outbound Codex fallback, the
Codex side is only ever parsed from and rendered to, never dispatched to, so a
single monolithic codec type would force stub implementations whose only
possible body is a throw.

## Type Parameters

### TWireRequest

`TWireRequest`

## Properties

### format

> **format**: [`ProxyIRWireFormat`](ProxyIRWireFormat.md)

## Methods

### parseRequest()

> **parseRequest**(`wire`): [`ProxyIRRequest`](ProxyIRRequest.md)

#### Parameters

##### wire

`TWireRequest`

#### Returns

[`ProxyIRRequest`](ProxyIRRequest.md)
