[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyProviderTransportPermit

# Type Alias: ProxyProviderTransportPermit

> **ProxyProviderTransportPermit** = \{ `allowed`: `true`; `probe`: `boolean`; `generation`: `number`; \} \| \{ `allowed`: `false`; `errorCode`: `string` \| `null`; `transportScope`: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md); `connectPhase`: `boolean`; \}

Defined in: [types/proxy.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L551)

## Union Members

### Type Literal

\{ `allowed`: `true`; `probe`: `boolean`; `generation`: `number`; \}

---

### Type Literal

\{ `allowed`: `false`; `errorCode`: `string` \| `null`; `transportScope`: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md); `connectPhase`: `boolean`; \}

#### allowed

> **allowed**: `false`

#### errorCode

> **errorCode**: `string` \| `null`

#### transportScope

> **transportScope**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

#### connectPhase

> **connectPhase**: `boolean`

The degrading failure happened before any request byte was sent.
