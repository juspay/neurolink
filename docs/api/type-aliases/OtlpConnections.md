[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtlpConnections

# Type Alias: OtlpConnections

> **OtlpConnections** = `object`

## Description

The connections NeuroLink's OTLP exporters open, which a flush that has run out of its budget can close.

## Properties

### agentFor

> **agentFor**: (`protocol`) => `HttpAgent` \| `HttpsAgent`

Hands an exporter the agent it opens its connections with.

#### Parameters

##### protocol

`string`

#### Returns

`HttpAgent` \| `HttpsAgent`

---

### cut

> **cut**: () => `void`

Closes every connection now, and again once a retry that was asleep at that moment has sent.

#### Returns

`void`
